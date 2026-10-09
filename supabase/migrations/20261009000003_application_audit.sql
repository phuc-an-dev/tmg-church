begin;
-- Cascades run after a parent row disappears. Its delete event retains the context.
create function public.audit_parent_context(p_table text,p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if p_id is null then return null; end if;
  if p_table not in ('ministry_session','term_group','term_department','ministry_term','ministry','member_profile','member_segment','ministry_membership','session_participant','department_service_role','care_flag') then
    raise exception 'Unsupported audit relationship';
  end if;
  execute format('select to_jsonb(r) from public.%I r where id = $1',p_table) into r using p_id;
  if r is not null then return r; end if;
  select coalesce(l.payload->'before','{}'::jsonb) || l.payload || jsonb_build_object(
    'church_id',l.church_id,'ministry_term_id',l.payload->'term_id','term_group_id',l.payload->'group_id',
    'term_department_id',l.payload->'department_id','name',l.payload->'target_name') into r
  from public.application_audit_log l where l.target_type = p_table and l.target_id = p_id and l.action like '%.removed'
  order by l.created_at desc,l.id desc limit 1;
  return r;
end;
$$;
revoke all on function public.audit_parent_context(text,uuid) from public, anon, authenticated;

-- Record approved fields only; never serialize entire business rows.
create function public.audit_business_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  b jsonb := '{}'::jsonb; a jsonb := '{}'::jsonb; k text;
  v_church uuid; v_ministry uuid; v_term uuid; v_group uuid; v_department uuid;
  v_session uuid; v_member uuid; v_scope uuid; v_scope_type text;
  v_actor_name text; v_target_name text; v_scope_name text; v_ministry_name text; v_group_name text;
  v_context jsonb; v_action text; v_id uuid; v_references jsonb := '{}'::jsonb; v_ref record; v_term_name text;
begin
  foreach k in array string_to_array(tg_argv[0], ',') loop
    if tg_op = 'UPDATE' and to_jsonb(old)->k is not distinct from to_jsonb(new)->k then continue; end if;
    if tg_op <> 'INSERT' then b := b || jsonb_build_object(k, to_jsonb(old)->k); end if;
    if tg_op <> 'DELETE' then a := a || jsonb_build_object(k, to_jsonb(new)->k); end if;
  end loop;
  if tg_op = 'UPDATE' and a = '{}'::jsonb then return new; end if;

  v_church := (r->>'church_id')::uuid;
  v_ministry := (r->>'ministry_id')::uuid;
  v_term := (r->>'ministry_term_id')::uuid;
  v_group := (r->>'term_group_id')::uuid;
  v_department := (r->>'term_department_id')::uuid;
  v_session := (r->>'ministry_session_id')::uuid;
  v_member := (r->>'member_profile_id')::uuid;
  v_id := (r->>'id')::uuid;
  if tg_table_name = 'church' then v_church := v_id; end if;
  if tg_table_name = 'ministry' then v_ministry := v_id; end if;
  if tg_table_name = 'ministry_term' then v_term := v_id; end if;
  if tg_table_name = 'term_group' then v_group := v_id; end if;
  if tg_table_name = 'term_department' then v_department := v_id; end if;
  if tg_table_name = 'ministry_session' then v_session := v_id; end if;
  if tg_table_name = 'member_profile' then v_member := v_id; end if;
  if r->>'session_participant_id' is not null then
    v_context := public.audit_parent_context('session_participant',(r->>'session_participant_id')::uuid);
    v_session := coalesce((v_context->>'ministry_session_id')::uuid,v_session);
    v_member := coalesce((v_context->>'member_profile_id')::uuid,v_member);
  end if;
  if r->>'department_service_role_id' is not null then
    v_context := public.audit_parent_context('department_service_role',(r->>'department_service_role_id')::uuid);
    v_department := coalesce((v_context->>'term_department_id')::uuid,v_department);
  end if;
  if r->>'care_flag_id' is not null then
    v_context := public.audit_parent_context('care_flag',(r->>'care_flag_id')::uuid);
    v_term := coalesce((v_context->>'ministry_term_id')::uuid,v_term);
    v_group := coalesce((v_context->>'term_group_id')::uuid,v_group);
    v_member := coalesce((v_context->>'member_profile_id')::uuid,v_member);
  end if;
  if r->>'ministry_membership_id' is not null then
    v_context := public.audit_parent_context('ministry_membership',(r->>'ministry_membership_id')::uuid);
    v_term := coalesce((v_context->>'ministry_term_id')::uuid,v_term);
    v_member := coalesce((v_context->>'member_profile_id')::uuid,v_member);
  end if;
  if v_session is not null then
    v_context := public.audit_parent_context('ministry_session',v_session);
    v_term := coalesce((v_context->>'ministry_term_id')::uuid,v_term);
    v_group := coalesce(v_group,(v_context->>'term_group_id')::uuid);
    v_department := coalesce(v_department,(v_context->>'term_department_id')::uuid);
    v_church := coalesce((v_context->>'church_id')::uuid,v_church);
  end if;
  if v_group is not null then
    v_context := public.audit_parent_context('term_group',v_group);
    v_term := coalesce((v_context->>'ministry_term_id')::uuid,v_term);
    v_group_name := v_context->>'name';
  end if;
  if v_department is not null then
    v_context := public.audit_parent_context('term_department',v_department);
    v_term := coalesce((v_context->>'ministry_term_id')::uuid,v_term);
    v_scope_name := v_context->>'name';
  end if;
  if v_term is not null then
    v_context := public.audit_parent_context('ministry_term',v_term);
    v_ministry := coalesce((v_context->>'ministry_id')::uuid,v_ministry);
    v_term_name := v_context->>'name';
    v_scope_name := coalesce(v_group_name,v_scope_name,v_term_name);
  end if;
  if v_ministry is not null then
    v_context := public.audit_parent_context('ministry',v_ministry);
    v_church := coalesce((v_context->>'church_id')::uuid,v_church);
    v_ministry_name := v_context->>'name';
  end if;
  if v_member is not null then
    v_context := public.audit_parent_context('member_profile',v_member);
    v_church := coalesce(v_church,(v_context->>'church_id')::uuid);
    v_target_name := coalesce(v_context->>'full_name',v_context->>'target_name');
  end if;
  if v_church is null and r->>'member_segment_id' is not null then
    v_context := public.audit_parent_context('member_segment',(r->>'member_segment_id')::uuid);
    v_church := (v_context->>'church_id')::uuid;
  end if;
  -- Global icon preferences and cascades belong to the single configured church.
  if v_church is null then
    select id into v_church from public.church where (select count(*) from public.church) = 1;
  end if;
  if v_church is null then raise exception 'Unable to resolve audit scope'; end if;

  v_scope_type := case when v_group is not null then 'group' when v_department is not null then 'department' when v_term is not null then 'ministry_term' else 'church' end;
  v_scope := coalesce(v_group,v_department,v_term,v_church);
  select coalesce(v_scope_name,c.name) into v_scope_name from public.church c where c.id = v_church;
  select p.full_name into v_actor_name from public.member_profile p where p.user_id = auth.uid() and p.church_id = v_church;
  v_actor_name := coalesce(v_actor_name,case when auth.uid() is null then 'System' else 'Account ' || left(auth.uid()::text,8) end);
  v_target_name := coalesce(r->>'full_name',r->>'name',r->>'title',v_target_name);
  if v_target_name is null and v_member is not null then
    select p.full_name into v_target_name from public.member_profile p where p.id = v_member;
  end if;
  v_target_name := coalesce(v_target_name,replace(tg_table_name,'_',' '));
  v_action := tg_table_name || '.' || case tg_op when 'INSERT' then 'created' when 'DELETE' then 'removed' else 'updated' end;
  if tg_table_name = 'care_flag' then
    v_action := 'care.' || case when tg_op = 'INSERT' then 'created' when tg_op = 'DELETE' then 'removed'
      when b ? 'status' and r->>'status' = 'resolved' then 'resolved'
      when b ? 'assignee_member_profile_id' then 'assigned' else 'updated' end;
  elsif tg_table_name = 'care_note' then v_action := 'care.note_added';
  elsif tg_table_name = 'member_access_invitation' then
    v_action := 'authorization.invitation.' || case when tg_op = 'INSERT' then 'created' when tg_op = 'DELETE' then 'removed'
      when a ? 'consumed_at' and r->>'consumed_at' is not null then 'consumed'
      when a ? 'revoked_at' and r->>'revoked_at' is not null then 'revoked' else 'updated' end;
  elsif tg_table_name = 'member_access_request' and a ? 'status' then v_action := 'authorization.access_request.' || (r->>'status');
  elsif tg_table_name = 'system_role_assignment' then v_action := 'system_role.' || case tg_op when 'INSERT' then 'assigned' when 'DELETE' then 'removed' else 'updated' end;
  elsif tg_table_name = 'term_role_assignment' then v_action := 'term_role.' || case tg_op when 'INSERT' then 'assigned' when 'DELETE' then 'removed' else 'updated' end;
  elsif tg_table_name = 'ministry_term' and tg_op = 'UPDATE' and b ? 'lifecycle' then v_action := 'ministry_term.lifecycle_transition';
  elsif tg_table_name = 'member_profile' and tg_op = 'UPDATE' and a ? 'archived_at' then v_action := 'member_profile.' || case when r->>'archived_at' is null then 'restored' else 'archived' end;
  end if;
  -- Snapshot human-readable values for changed references before records can disappear.
  for v_ref in
    with ids as (select value #>> '{}' as id from jsonb_each(b) union select value #>> '{}' from jsonb_each(a))
    select p.id::text as id,p.full_name as name from public.member_profile p join ids on ids.id = p.id::text
    union select p.user_id::text,p.full_name from public.member_profile p join ids on ids.id = p.user_id::text
    union select m.id::text,m.name from public.ministry m join ids on ids.id = m.id::text
    union select t.id::text,t.name from public.ministry_term t join ids on ids.id = t.id::text
    union select g.id::text,g.name from public.term_group g join ids on ids.id = g.id::text
    union select d.id::text,d.name from public.term_department d join ids on ids.id = d.id::text
    union select s.id::text,s.title from public.ministry_session s join ids on ids.id = s.id::text
    union select m.id::text,p.full_name from public.ministry_membership m join ids on ids.id = m.id::text join public.member_profile p on p.id = m.member_profile_id
    union select s.id::text,s.name from public.member_segment s join ids on ids.id = s.id::text
    union select d.id::text,d.name from public.department_service_role d join ids on ids.id = d.id::text
  loop
    v_references := v_references || jsonb_build_object(v_ref.id,v_ref.name);
  end loop;
  insert into public.application_audit_log(church_id,actor_id,action,scope_type,scope_id,target_type,target_id,payload)
  values(v_church,auth.uid(),v_action,v_scope_type,v_scope,tg_table_name,coalesce(v_id,v_term),
    jsonb_build_object('before',case when tg_op = 'INSERT' then null else b end,'after',case when tg_op = 'DELETE' then null else a end,
      'actor_name',v_actor_name,'target_name',v_target_name,'scope_name',v_scope_name,
      'ministry_id',v_ministry,'ministry_name',v_ministry_name,'term_id',v_term,'term_name',v_term_name,'group_id',v_group,'group_name',v_group_name,'department_id',v_department,'references',v_references));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.audit_business_change() from public, anon, authenticated;

-- Protect retention against table-wide deletion as well as row mutations.
revoke truncate on public.application_audit_log from public, anon, authenticated;
create trigger trg_protect_application_audit_log_truncate before truncate on public.application_audit_log
for each statement execute function public.prevent_audit_log_mutation();

-- Replace the original partial row triggers; retain existing immutable audit history.
drop trigger trg_audit_system_role_assignment on public.system_role_assignment;
drop trigger trg_audit_term_role_assignment on public.term_role_assignment;
drop trigger trg_audit_ministry_term_lifecycle on public.ministry_term;
create trigger trg_audit_church_after
after insert or update on public.church for each row execute function public.audit_business_change('name,slug');
create trigger trg_audit_church_before
before delete on public.church for each row execute function public.audit_business_change('name,slug');
create trigger trg_audit_ministry_after
after insert or update on public.ministry for each row execute function public.audit_business_change('church_id,name,slug,accent_color,icon_key');
create trigger trg_audit_ministry_before
before delete on public.ministry for each row execute function public.audit_business_change('church_id,name,slug,accent_color,icon_key');
create trigger trg_audit_ministry_term_after
after insert or update on public.ministry_term for each row execute function public.audit_business_change('ministry_id,name,slug,start_date,end_date,lifecycle,executive_board_roles');
create trigger trg_audit_ministry_term_before
before delete on public.ministry_term for each row execute function public.audit_business_change('ministry_id,name,slug,start_date,end_date,lifecycle,executive_board_roles');
create trigger trg_audit_member_profile_after
after insert or update on public.member_profile for each row execute function public.audit_business_change('church_id,full_name,phone,date_of_birth,gender,email,user_id,archived_at,slug');
create trigger trg_audit_member_profile_before
before delete on public.member_profile for each row execute function public.audit_business_change('church_id,full_name,phone,date_of_birth,gender,email,user_id,archived_at,slug');
create trigger trg_audit_member_segment_after
after insert or update on public.member_segment for each row execute function public.audit_business_change('church_id,name,slug,accent_color,icon_key,condition_rules');
create trigger trg_audit_member_segment_before
before delete on public.member_segment for each row execute function public.audit_business_change('church_id,name,slug,accent_color,icon_key,condition_rules');
create trigger trg_audit_member_segment_membership_after
after insert or update on public.member_segment_membership for each row execute function public.audit_business_change('member_segment_id,member_profile_id');
create trigger trg_audit_member_segment_membership_before
before delete on public.member_segment_membership for each row execute function public.audit_business_change('member_segment_id,member_profile_id');
create trigger trg_audit_ministry_membership_after
after insert or update on public.ministry_membership for each row execute function public.audit_business_change('ministry_term_id,member_profile_id');
create trigger trg_audit_ministry_membership_before
before delete on public.ministry_membership for each row execute function public.audit_business_change('ministry_term_id,member_profile_id');
create trigger trg_audit_ministry_assignment_after
after insert or update on public.ministry_assignment for each row execute function public.audit_business_change('ministry_membership_id,term_department_id');
create trigger trg_audit_ministry_assignment_before
before delete on public.ministry_assignment for each row execute function public.audit_business_change('ministry_membership_id,term_department_id');
create trigger trg_audit_ministry_operation_delegation_after
after insert or update on public.ministry_operation_delegation for each row execute function public.audit_business_change('ministry_term_id,member_profile_id,capability');
create trigger trg_audit_ministry_operation_delegation_before
before delete on public.ministry_operation_delegation for each row execute function public.audit_business_change('ministry_term_id,member_profile_id,capability');
create trigger trg_audit_system_role_assignment_after
after insert or update on public.system_role_assignment for each row execute function public.audit_business_change('church_id,user_id,role');
create trigger trg_audit_system_role_assignment_before
before delete on public.system_role_assignment for each row execute function public.audit_business_change('church_id,user_id,role');
create trigger trg_audit_term_role_assignment_after
after insert or update on public.term_role_assignment for each row execute function public.audit_business_change('ministry_term_id,member_profile_id,role');
create trigger trg_audit_term_role_assignment_before
before delete on public.term_role_assignment for each row execute function public.audit_business_change('ministry_term_id,member_profile_id,role');
create trigger trg_audit_term_group_after
after insert or update on public.term_group for each row execute function public.audit_business_change('ministry_term_id,name,slug,accent_color,icon_key');
create trigger trg_audit_term_group_before
before delete on public.term_group for each row execute function public.audit_business_change('ministry_term_id,name,slug,accent_color,icon_key');
create trigger trg_audit_term_department_after
after insert or update on public.term_department for each row execute function public.audit_business_change('ministry_term_id,name,slug,accent_color,icon_key,leader_member_profile_id');
create trigger trg_audit_term_department_before
before delete on public.term_department for each row execute function public.audit_business_change('ministry_term_id,name,slug,accent_color,icon_key,leader_member_profile_id');
create trigger trg_audit_term_group_membership_after
after insert or update on public.term_group_membership for each row execute function public.audit_business_change('term_group_id,ministry_membership_id,role,status,joined_at,ended_at');
create trigger trg_audit_term_group_membership_before
before delete on public.term_group_membership for each row execute function public.audit_business_change('term_group_id,ministry_membership_id,role,status,joined_at,ended_at');
create trigger trg_audit_ministry_session_after
after insert or update on public.ministry_session for each row execute function public.audit_business_change('ministry_term_id,session_recurrence_rule_id,term_group_id,term_department_id,title,session_date,slug');
create trigger trg_audit_ministry_session_before
before delete on public.ministry_session for each row execute function public.audit_business_change('ministry_term_id,session_recurrence_rule_id,term_group_id,term_department_id,title,session_date,slug');
create trigger trg_audit_session_recurrence_rule_after
after insert or update on public.session_recurrence_rule for each row execute function public.audit_business_change('ministry_term_id,term_group_id,term_department_id,rule');
create trigger trg_audit_session_recurrence_rule_before
before delete on public.session_recurrence_rule for each row execute function public.audit_business_change('ministry_term_id,term_group_id,term_department_id,rule');
create trigger trg_audit_session_participant_after
after insert or update on public.session_participant for each row execute function public.audit_business_change('ministry_session_id,member_profile_id');
create trigger trg_audit_session_participant_before
before delete on public.session_participant for each row execute function public.audit_business_change('ministry_session_id,member_profile_id');
create trigger trg_audit_attendance_record_after
after insert or update on public.attendance_record for each row execute function public.audit_business_change('session_participant_id,status,recorded_at');
create trigger trg_audit_attendance_record_before
before delete on public.attendance_record for each row execute function public.audit_business_change('session_participant_id,status,recorded_at');
create trigger trg_audit_session_assignment_after
after insert or update on public.session_assignment for each row execute function public.audit_business_change('ministry_session_id,ministry_membership_id');
create trigger trg_audit_session_assignment_before
before delete on public.session_assignment for each row execute function public.audit_business_change('ministry_session_id,ministry_membership_id');
create trigger trg_audit_group_session_assignment_after
after insert or update on public.group_session_assignment for each row execute function public.audit_business_change('ministry_session_id,ministry_membership_id,role');
create trigger trg_audit_group_session_assignment_before
before delete on public.group_session_assignment for each row execute function public.audit_business_change('ministry_session_id,ministry_membership_id,role');
create trigger trg_audit_department_service_role_after
after insert or update on public.department_service_role for each row execute function public.audit_business_change('term_department_id,name');
create trigger trg_audit_department_service_role_before
before delete on public.department_service_role for each row execute function public.audit_business_change('term_department_id,name');
create trigger trg_audit_session_service_department_after
after insert or update on public.session_service_department for each row execute function public.audit_business_change('ministry_session_id,term_department_id');
create trigger trg_audit_session_service_department_before
before delete on public.session_service_department for each row execute function public.audit_business_change('ministry_session_id,term_department_id');
create trigger trg_audit_session_service_role_after
after insert or update on public.session_service_role for each row execute function public.audit_business_change('ministry_session_id,department_service_role_id');
create trigger trg_audit_session_service_role_before
before delete on public.session_service_role for each row execute function public.audit_business_change('ministry_session_id,department_service_role_id');
create trigger trg_audit_service_assignment_after
after insert or update on public.service_assignment for each row execute function public.audit_business_change('department_service_role_id,ministry_session_id,ministry_membership_id');
create trigger trg_audit_service_assignment_before
before delete on public.service_assignment for each row execute function public.audit_business_change('department_service_role_id,ministry_session_id,ministry_membership_id');
create trigger trg_audit_ministry_session_exemption_after
after insert or update on public.ministry_session_exemption for each row execute function public.audit_business_change('ministry_term_id,session_date,created_by');
create trigger trg_audit_ministry_session_exemption_before
before delete on public.ministry_session_exemption for each row execute function public.audit_business_change('ministry_term_id,session_date,created_by');
create trigger trg_audit_department_join_request_after
after insert or update on public.department_join_request for each row execute function public.audit_business_change('term_department_id,ministry_membership_id,status,decided_at,decided_by');
create trigger trg_audit_department_join_request_before
before delete on public.department_join_request for each row execute function public.audit_business_change('term_department_id,ministry_membership_id,status,decided_at,decided_by');
create trigger trg_audit_member_access_invitation_after
after insert or update on public.member_access_invitation for each row execute function public.audit_business_change('church_id,member_profile_id,expires_at,consumed_at,revoked_at,created_by');
create trigger trg_audit_member_access_invitation_before
before delete on public.member_access_invitation for each row execute function public.audit_business_change('church_id,member_profile_id,expires_at,consumed_at,revoked_at,created_by');
create trigger trg_audit_member_access_request_after
after insert or update on public.member_access_request for each row execute function public.audit_business_change('church_id,user_id,status,member_profile_id,reviewed_by,reviewed_at');
create trigger trg_audit_member_access_request_before
before delete on public.member_access_request for each row execute function public.audit_business_change('church_id,user_id,status,member_profile_id,reviewed_by,reviewed_at');
create trigger trg_audit_care_flag_after
after insert or update on public.care_flag for each row execute function public.audit_business_change('member_profile_id,ministry_term_id,term_group_id,assignee_member_profile_id,created_by_member_profile_id,resolved_by_member_profile_id,flag_type,status,next_contact_date,resolved_at,source');
create trigger trg_audit_care_flag_before
before delete on public.care_flag for each row execute function public.audit_business_change('member_profile_id,ministry_term_id,term_group_id,assignee_member_profile_id,created_by_member_profile_id,resolved_by_member_profile_id,flag_type,status,next_contact_date,resolved_at,source');
create trigger trg_audit_care_note_after
after insert or update on public.care_note for each row execute function public.audit_business_change('care_flag_id,author_member_profile_id');
create trigger trg_audit_care_note_before
before delete on public.care_note for each row execute function public.audit_business_change('care_flag_id,author_member_profile_id');
create trigger trg_audit_frequent_icon_after
after insert or update on public.frequent_icon for each row execute function public.audit_business_change('name,display_order');
create trigger trg_audit_frequent_icon_before
before delete on public.frequent_icon for each row execute function public.audit_business_change('name,display_order');

-- The row triggers now own these events, preventing duplicate RPC logs.
CREATE OR REPLACE FUNCTION public.create_member_access_invitation(p_church_id uuid, p_member_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_email text;
  v_token text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  if not public.is_system_admin_for_church(p_church_id) then
    raise exception 'Unauthorized invitation request' using errcode = '42501';
  end if;

  select lower(trim(mp.email)) into v_email
  from public.member_profile mp
  where mp.id = p_member_profile_id
    and mp.church_id = p_church_id
    and mp.archived_at is null;
  if v_email is null or v_email = '' then
    raise exception 'An active member email is required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_member_profile_id::text, 0));
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '15 minutes';

  update public.member_access_invitation
  set revoked_at = now()
  where member_profile_id = p_member_profile_id
    and consumed_at is null
    and revoked_at is null;

  insert into public.member_access_invitation (
    church_id, member_profile_id, email, token_hash, expires_at, created_by
  ) values (
    p_church_id, p_member_profile_id, v_email,
    encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires_at, auth.uid()
  ) returning id into v_invitation_id;


  return jsonb_build_object(
    'id', v_invitation_id,
    'email', v_email,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.consume_member_access_invitation(p_token text, p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invitation public.member_access_invitation%rowtype;
  v_profile public.member_profile%rowtype;
  v_email text := lower(trim(p_email));
  v_auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select lower(trim(u.email)) into v_auth_email
  from auth.users u
  where u.id = auth.uid();
  if v_auth_email is null or v_auth_email <> v_email then
    raise exception 'Authenticated email does not match invitation' using errcode = 'P0001';
  end if;

  select i.* into v_invitation
  from public.member_access_invitation i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and i.consumed_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired' using errcode = 'P0001';
  end if;

  select mp.* into v_profile
  from public.member_profile mp
  where mp.id = v_invitation.member_profile_id
    and mp.church_id = v_invitation.church_id
    and mp.archived_at is null
  for update;

  if not found or v_invitation.email <> v_email or coalesce(lower(trim(v_profile.email)), '') <> v_email then
    raise exception 'Invitation email does not match' using errcode = 'P0001';
  end if;

  if v_profile.user_id is not null and v_profile.user_id <> auth.uid() then
    raise exception 'Member profile is already linked' using errcode = 'P0001';
  end if;

  update public.member_profile
  set user_id = auth.uid()
  where id = v_profile.id
    and user_id is null;

  update public.member_access_invitation
  set consumed_at = now()
  where id = v_invitation.id
    and consumed_at is null;


  return v_profile.id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.review_member_access_request(p_request_id uuid, p_decision text, p_member_id uuid DEFAULT NULL::uuid, p_new_member_slug text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_registration_fields text[] DEFAULT '{}'::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_request public.member_access_request%rowtype;
  v_member public.member_profile%rowtype;
  v_member_id uuid;
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
      update public.member_profile set user_id = v_request.user_id,
        full_name = case when 'full_name' = any(p_registration_fields) then v_request.full_name else full_name end,
        email = case when 'email' = any(p_registration_fields) then v_request.email else email end,
        phone = case when 'phone' = any(p_registration_fields) then v_request.phone else phone end,
        date_of_birth = case when 'date_of_birth' = any(p_registration_fields) then v_request.date_of_birth else date_of_birth end,
        gender = case when 'gender' = any(p_registration_fields) then v_request.gender else gender end
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
  return v_member_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.care_write_audit(p_case_id uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not public.care_can_read_case(p_case_id)
    or p_action not in ('care.created','care.assigned','care.updated','care.resolved','care.note_added') then
    raise exception using message = 'forbidden', errcode = 'P0001';
  end if;
end;
$function$;

-- Invoker view: the base table's admin-only RLS remains the authorization boundary.
create view public.audit_log_directory with (security_invoker = true) as
select l.id,l.church_id,l.actor_id,l.action,l.scope_type,l.scope_id,l.target_type,l.target_id,l.payload,l.created_at,
  coalesce(l.payload->>'actor_name',p.full_name,case when l.actor_id is null then 'System' else 'Account ' || left(l.actor_id::text,8) end) as actor_name,
  coalesce(l.payload->>'target_name',l.payload->>'term_name',replace(l.target_type,'_',' ')) as target_name,
  coalesce(l.payload->>'scope_name',g.name,d.name,t.name,c.name) as scope_name,
  coalesce(l.payload->>'ministry_id',m.id::text) as ministry_id,
  coalesce(l.payload->>'ministry_name',m.name) as ministry_name,
  coalesce(l.payload->>'group_id',g.id::text) as group_id,
  coalesce(l.payload->>'group_name',g.name) as group_name,
  case
    when l.target_type in ('member_profile','member_segment_membership') then 'members'
    when l.target_type in ('system_role_assignment','term_role_assignment','ministry_operation_delegation','member_access_invitation','member_access_request') then 'access'
    when l.target_type in ('care_flag','care_note') then 'care'
    when l.target_type = 'attendance_record' then 'attendance'
    when l.target_type in ('ministry_session','session_recurrence_rule','session_participant','session_assignment','group_session_assignment','session_service_department','session_service_role','service_assignment','ministry_session_exemption') then 'sessions'
    when l.target_type = 'member_segment' then 'segments'
    when l.target_type = 'frequent_icon' then 'icons'
    when l.target_type = 'church' then 'church'
    else 'ministries' end as module
from public.application_audit_log l
left join public.member_profile p on p.user_id = l.actor_id and p.church_id = l.church_id
left join public.term_group g on g.id::text = coalesce(l.payload->>'group_id',case when l.scope_type = 'group' then l.scope_id::text end)
left join public.term_department d on l.scope_type = 'department' and d.id = l.scope_id
left join public.ministry_term t on t.id::text = coalesce(l.payload->>'term_id',l.payload->>'ministry_term_id',g.ministry_term_id::text,d.ministry_term_id::text,case when l.scope_type = 'ministry_term' then l.scope_id::text end)
left join public.ministry m on m.id::text = coalesce(l.payload->>'ministry_id',t.ministry_id::text)
left join public.church c on c.id = l.church_id;
revoke all on public.audit_log_directory from public, anon;
grant select on public.audit_log_directory to authenticated;

create function public.get_audit_filter_options(p_church_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_system_admin_for_church(p_church_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'actors',coalesce((select jsonb_agg(jsonb_build_object('value',actor_id,'label',actor_name) order by actor_name)
      from (select distinct on (actor_id) actor_id,actor_name from public.audit_log_directory where church_id = p_church_id and actor_id is not null order by actor_id,created_at desc,id desc) a),'[]'::jsonb),
    'actions',coalesce((select jsonb_agg(jsonb_build_object('value',action,'label',action) order by action)
      from (select distinct action from public.application_audit_log where church_id = p_church_id) a),'[]'::jsonb),
    'ministries',coalesce((select jsonb_agg(jsonb_build_object('value',ministry_id,'label',coalesce(ministry_name,ministry_id)) order by ministry_name)
      from (select distinct on (ministry_id) ministry_id,ministry_name from public.audit_log_directory where church_id = p_church_id and ministry_id is not null order by ministry_id,created_at desc,id desc) a),'[]'::jsonb),
    'groups',coalesce((select jsonb_agg(jsonb_build_object('value',group_id,'label',concat_ws(' · ',ministry_name,term_name,coalesce(group_name,group_id))) order by group_name)
      from (select distinct on (group_id) group_id,group_name,ministry_name,payload->>'term_name' as term_name from public.audit_log_directory where church_id = p_church_id and group_id is not null order by group_id,created_at desc,id desc) a),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_audit_filter_options(uuid) from public, anon;
grant execute on function public.get_audit_filter_options(uuid) to authenticated;
create index application_audit_log_actor_date_idx on public.application_audit_log(church_id,actor_id,created_at desc,id desc);
create index application_audit_log_action_date_idx on public.application_audit_log(church_id,action,created_at desc,id desc);
create index application_audit_log_ministry_idx on public.application_audit_log(church_id,(payload->>'ministry_id'));
create index application_audit_log_target_idx on public.application_audit_log(target_type,target_id,created_at desc,id desc);
create index application_audit_log_group_idx on public.application_audit_log(church_id,(payload->>'group_id'));
notify pgrst, 'reload schema';

commit;
