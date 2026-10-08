-- Apply only administrator-selected registration details when linking a member.
drop function public.review_member_access_request(uuid,text,uuid,text,text);

create or replace function public.review_member_access_request(
  p_request_id uuid, p_decision text, p_member_id uuid default null,
  p_new_member_slug text default null, p_reason text default null,
  p_registration_fields text[] default '{}'::text[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_request public.member_access_request%rowtype;
  v_member public.member_profile%rowtype;
  v_member_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  select * into v_request from public.member_access_request where id = p_request_id for update;
  if not found or not public.is_system_admin_for_church(v_request.church_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if p_registration_fields is null or not p_registration_fields <@ array['full_name','date_of_birth','gender','email','phone']::text[] then
    raise exception 'Invalid profile fields' using errcode = '22023';
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
      v_before := jsonb_build_object('full_name', v_member.full_name, 'date_of_birth', v_member.date_of_birth, 'gender', v_member.gender, 'email', v_member.email, 'phone', v_member.phone);
      update public.member_profile set user_id = v_request.user_id,
        full_name = case when 'full_name' = any(p_registration_fields) then v_request.full_name else full_name end,
        email = case when 'email' = any(p_registration_fields) then v_request.email else email end,
        phone = case when 'phone' = any(p_registration_fields) then v_request.phone else phone end,
        date_of_birth = case when 'date_of_birth' = any(p_registration_fields) then v_request.date_of_birth else date_of_birth end,
        gender = case when 'gender' = any(p_registration_fields) then v_request.gender else gender end
      where id = v_member.id
      returning jsonb_build_object('full_name', full_name, 'date_of_birth', date_of_birth, 'gender', gender, 'email', email, 'phone', phone) into v_after;
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
    jsonb_build_object('member_profile_id', v_member_id, 'registration_fields', p_registration_fields, 'profile_before', v_before, 'profile_after', v_after));
  return v_member_id;
end;
$$;

revoke all on function public.review_member_access_request(uuid,text,uuid,text,text,text[]) from public, anon;
grant execute on function public.review_member_access_request(uuid,text,uuid,text,text,text[]) to authenticated;
notify pgrst, 'reload schema';
