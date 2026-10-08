-- Verified self-registration requests, reviewed by church system administrators.
create table public.member_access_request (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.church(id) on delete restrict,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 150),
  email text not null,
  phone text check (phone is null or char_length(phone) <= 30),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  member_profile_id uuid references public.member_profile(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint access_request_review_check check (
    (status = 'pending' and reviewed_at is null and member_profile_id is null)
    or (status = 'approved' and reviewed_at is not null and member_profile_id is not null)
    or (status = 'rejected' and reviewed_at is not null and member_profile_id is null and char_length(trim(rejection_reason)) between 1 and 500)
  )
);
create index member_access_request_pending_idx on public.member_access_request(church_id, status, created_at);
alter table public.member_access_request enable row level security;
revoke all on public.member_access_request from public, anon, authenticated;
grant select on public.member_access_request to authenticated;
create policy "Users read own access request and admins read church requests"
  on public.member_access_request for select to authenticated
  using (user_id = auth.uid() or public.is_system_admin_for_church(church_id));

create function public.capture_member_access_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_church_id uuid;
  v_name text := trim(new.raw_user_meta_data ->> 'full_name');
begin
  if new.email_confirmed_at is null or new.raw_user_meta_data ->> 'request_access' is distinct from 'true' then return new; end if;
  if v_name is null or char_length(v_name) not between 1 and 150 then return new; end if;
  if (select count(*) from public.church) <> 1 then return new; end if;
  if exists (select 1 from public.member_profile where user_id = new.id) then return new; end if;
  select id into v_church_id from public.church limit 1;
  insert into public.member_access_request(church_id, user_id, full_name, email, phone)
  values (v_church_id, new.id, v_name, lower(trim(new.email)), nullif(left(trim(new.raw_user_meta_data ->> 'phone'), 30), ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.capture_member_access_request() from public, anon, authenticated;
create trigger capture_verified_access_request after insert or update of email_confirmed_at on auth.users
  for each row execute function public.capture_member_access_request();

create function public.review_member_access_request(
  p_request_id uuid, p_decision text, p_member_id uuid default null,
  p_new_member_slug text default null, p_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_request public.member_access_request%rowtype;
  v_member public.member_profile%rowtype;
  v_member_id uuid;
begin
  select * into v_request from public.member_access_request where id = p_request_id for update;
  if not found or not public.is_system_admin_for_church(v_request.church_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if v_request.status <> 'pending' then raise exception 'Request already reviewed' using errcode = 'P0001'; end if;
  if p_decision = 'rejected' then
    if p_reason is null or char_length(trim(p_reason)) not between 1 and 500 then raise exception 'Rejection reason required' using errcode = '22023'; end if;
    update public.member_access_request set status = 'rejected', rejection_reason = trim(p_reason), reviewed_by = auth.uid(), reviewed_at = now() where id = v_request.id;
  elsif p_decision = 'approved' then
    if not exists (select 1 from auth.users where id = v_request.user_id and email_confirmed_at is not null and lower(trim(email)) = v_request.email) then
      raise exception 'Verified account required' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.member_profile where user_id = v_request.user_id) then raise exception 'Account already linked' using errcode = 'P0001'; end if;
    if p_member_id is not null then
      select * into v_member from public.member_profile where id = p_member_id and church_id = v_request.church_id and archived_at is null for update;
      if not found or v_member.user_id is not null then raise exception 'Member unavailable' using errcode = 'P0001'; end if;
      update public.member_profile set user_id = v_request.user_id where id = v_member.id;
      v_member_id := v_member.id;
      update public.member_access_invitation set revoked_at = now() where member_profile_id = v_member.id and consumed_at is null and revoked_at is null;
    else
      if p_new_member_slug is null or p_new_member_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid member slug' using errcode = '22023'; end if;
      insert into public.member_profile(church_id, full_name, email, phone, user_id, slug)
      values(v_request.church_id, v_request.full_name, v_request.email, v_request.phone, v_request.user_id, p_new_member_slug)
      returning id into v_member_id;
    end if;
    update public.member_access_request set status = 'approved', member_profile_id = v_member_id, reviewed_by = auth.uid(), reviewed_at = now() where id = v_request.id;
  else
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  insert into public.application_audit_log(church_id, actor_id, action, scope_type, scope_id, target_type, target_id, payload)
  values(v_request.church_id, auth.uid(), 'authorization.access_request.' || p_decision, 'church', v_request.church_id, 'member_access_request', v_request.id,
    jsonb_build_object('member_profile_id', v_member_id));
  return v_member_id;
end;
$$;
revoke all on function public.review_member_access_request(uuid,text,uuid,text,text) from public, anon;
grant execute on function public.review_member_access_request(uuid,text,uuid,text,text) to authenticated;
notify pgrst, 'reload schema';
