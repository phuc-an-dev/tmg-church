-- Capture registration demographics for member matching and profile creation.
alter table public.member_access_request
  add column date_of_birth date check (date_of_birth is null or date_of_birth >= date '1900-01-01'),
  add column gender text check (gender is null or gender in ('male', 'female'));

create or replace function public.capture_member_access_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_church_id uuid;
  v_name text := trim(new.raw_user_meta_data ->> 'full_name');
  v_birth_date date;
  v_gender text := new.raw_user_meta_data ->> 'gender';
begin
  if new.email_confirmed_at is null or new.raw_user_meta_data ->> 'request_access' is distinct from 'true' then return new; end if;
  if v_name is null or char_length(v_name) not between 1 and 150 then return new; end if;
  if (select count(*) from public.church) <> 1 then return new; end if;
  if exists (select 1 from public.member_profile where user_id = new.id) then return new; end if;
  begin
    if new.raw_user_meta_data ->> 'date_of_birth' ~ '^\d{4}-\d{2}-\d{2}$' then
      v_birth_date := (new.raw_user_meta_data ->> 'date_of_birth')::date;
      if v_birth_date < date '1900-01-01' or v_birth_date > current_date then v_birth_date := null; end if;
    end if;
  exception when invalid_datetime_format or datetime_field_overflow then v_birth_date := null;
  end;
  if v_gender not in ('male', 'female') then v_gender := null; end if;
  select id into v_church_id from public.church limit 1;
  insert into public.member_access_request(church_id, user_id, full_name, email, phone, date_of_birth, gender)
  values (v_church_id, new.id, v_name, lower(trim(new.email)), nullif(left(trim(new.raw_user_meta_data ->> 'phone'), 30), ''), v_birth_date, v_gender)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.review_member_access_request(
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
      update public.member_profile set user_id = v_request.user_id,
        email = coalesce(nullif(trim(email), ''), v_request.email),
        date_of_birth = coalesce(date_of_birth, v_request.date_of_birth),
        gender = coalesce(gender, v_request.gender)
      where id = v_member.id;
      v_member_id := v_member.id;
      update public.member_access_invitation set revoked_at = now() where member_profile_id = v_member.id and consumed_at is null and revoked_at is null;
    else
      if p_new_member_slug is null or p_new_member_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid member slug' using errcode = '22023'; end if;
      insert into public.member_profile(church_id, full_name, email, phone, user_id, slug, date_of_birth, gender)
      values(v_request.church_id, v_request.full_name, v_request.email, v_request.phone, v_request.user_id, p_new_member_slug, v_request.date_of_birth, v_request.gender)
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

notify pgrst, 'reload schema';
