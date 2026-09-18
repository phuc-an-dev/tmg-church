-- Phase 2 fast cutover: current administration remains Master/Admin-only.
-- Scoped operational roles are intentionally deferred to later phases.

create or replace function public.authorization_scope_church_id(
  p_scope_type text,
  p_scope_id uuid
) returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare v_church_id uuid;
begin
  if p_scope_type = 'church' then
    select id into v_church_id from public.church where id = p_scope_id;
  elsif p_scope_type = 'ministry' then
    select church_id into v_church_id from public.ministry where id = p_scope_id;
  elsif p_scope_type = 'ministry_term' then
    select m.church_id into v_church_id
    from public.ministry_term mt join public.ministry m on m.id = mt.ministry_id
    where mt.id = p_scope_id;
  elsif p_scope_type = 'department' then
    select m.church_id into v_church_id
    from public.term_department td
    join public.ministry_term mt on mt.id = td.ministry_term_id
    join public.ministry m on m.id = mt.ministry_id
    where td.id = p_scope_id;
  elsif p_scope_type = 'group' then
    select m.church_id into v_church_id
    from public.term_group tg
    join public.ministry_term mt on mt.id = tg.ministry_term_id
    join public.ministry m on m.id = mt.ministry_id
    where tg.id = p_scope_id;
  end if;
  return v_church_id;
end;
$$;

create or replace function public.authorization_term_lifecycle(p_term_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$ select lifecycle from public.ministry_term where id = p_term_id $$;

create or replace function public.is_system_admin_for_church(p_church_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_church_id is not null and exists (
    select 1 from public.system_role_assignment s
    where s.church_id = p_church_id
      and s.user_id = auth.uid()
      and s.role in ('master_admin', 'admin')
  )
$$;

create or replace function public.is_system_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.system_role_assignment s
    where s.user_id = auth.uid() and s.role in ('master_admin', 'admin')
  )
$$;

create or replace function public.has_capability(
  p_capability text,
  p_scope_type text,
  p_scope_id uuid
) returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_church_id uuid;
  v_lifecycle text;
begin
  v_church_id := public.authorization_scope_church_id(p_scope_type, p_scope_id);
  if not public.is_system_admin_for_church(v_church_id) then return false; end if;
  if p_scope_type in ('ministry_term', 'department', 'group') then
    v_lifecycle := case when p_scope_type = 'ministry_term' then
      public.authorization_term_lifecycle(p_scope_id)
    when p_scope_type = 'department' then
      public.authorization_term_lifecycle((select ministry_term_id from public.term_department where id = p_scope_id))
    else
      public.authorization_term_lifecycle((select ministry_term_id from public.term_group where id = p_scope_id)) end;
  end if;
  if p_capability in ('church.read', 'church.manage', 'term.read_history') then return true; end if;
  if p_capability = 'term.structure.prepare' then return v_lifecycle in ('draft', 'active'); end if;
  if p_capability = 'term.operational.manage' then return v_lifecycle = 'active'; end if;
  return false;
end;
$$;

-- Compatibility for already-deployed security-invoker RPC bodies. It no longer
-- reads leaders; it only returns the current system-admin boolean while those
-- RPC bodies are migrated in a later cleanup.
create or replace function public.is_leader()
returns boolean
language sql
security definer
stable
set search_path = public
as $$ select public.is_system_admin() $$;

revoke all on function public.authorization_scope_church_id(text, uuid) from public, anon, authenticated;
revoke all on function public.authorization_term_lifecycle(uuid) from public, anon, authenticated;
revoke all on function public.is_system_admin_for_church(uuid) from public, anon;
revoke all on function public.is_system_admin() from public, anon;
revoke all on function public.has_capability(text, text, uuid) from public, anon;
revoke all on function public.is_leader() from public, anon;
grant execute on function public.is_system_admin_for_church(uuid) to authenticated;
grant execute on function public.is_system_admin() to authenticated;
grant execute on function public.has_capability(text, text, uuid) to authenticated;
grant execute on function public.is_leader() to authenticated;

-- Base row policies. System admins may administer only their own Church.
drop policy if exists "Leader full access on church" on public.church;
create policy "System admins access church" on public.church for all to authenticated
using (public.is_system_admin_for_church(id)) with check (public.is_system_admin_for_church(id));

drop policy if exists "Leader full access on ministry" on public.ministry;
create policy "System admins access ministry" on public.ministry for all to authenticated
using (public.is_system_admin_for_church(church_id)) with check (public.is_system_admin_for_church(church_id));

drop policy if exists "Leader full access on ministry_term" on public.ministry_term;
create policy "System admins access terms" on public.ministry_term for all to authenticated
using (public.is_system_admin_for_church((select m.church_id from public.ministry m where m.id = ministry_id)))
with check (public.is_system_admin_for_church((select m.church_id from public.ministry m where m.id = ministry_id)));

drop policy if exists "Leader full access on term_group" on public.term_group;
create policy "System admins access groups" on public.term_group for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', ministry_term_id))
with check (public.has_capability('term.structure.prepare', 'ministry_term', ministry_term_id));

drop policy if exists "Leader full access on term_department" on public.term_department;
create policy "System admins access departments" on public.term_department for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', ministry_term_id))
with check (public.has_capability('term.structure.prepare', 'ministry_term', ministry_term_id));

drop policy if exists "Leader full access on member_profile" on public.member_profile;
create policy "System admins access member profiles" on public.member_profile for all to authenticated
using (public.is_system_admin_for_church(church_id)) with check (public.is_system_admin_for_church(church_id));

drop policy if exists "Leader full access on member_segment" on public.member_segment;
create policy "System admins access segments" on public.member_segment for all to authenticated
using (public.is_system_admin_for_church(church_id)) with check (public.is_system_admin_for_church(church_id));

drop policy if exists "Leader full access on member_segment_membership" on public.member_segment_membership;
create policy "System admins access segment membership" on public.member_segment_membership for all to authenticated
using (public.is_system_admin_for_church((select church_id from public.member_segment where id = member_segment_id)))
with check (public.is_system_admin_for_church((select church_id from public.member_segment where id = member_segment_id)));

drop policy if exists "Leader full access on ministry_membership" on public.ministry_membership;
create policy "System admins access ministry membership" on public.ministry_membership for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', ministry_term_id))
with check (public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id));

drop policy if exists "Leader full access on term_group_membership" on public.term_group_membership;
create policy "System admins access group membership" on public.term_group_membership for all to authenticated
using (public.has_capability('term.read_history', 'group', term_group_id))
with check (public.has_capability('term.operational.manage', 'group', term_group_id));

drop policy if exists "Leader full access on ministry_assignment" on public.ministry_assignment;
create policy "System admins access department assignments" on public.ministry_assignment for all to authenticated
using (public.has_capability('term.read_history', 'department', term_department_id))
with check (public.has_capability('term.operational.manage', 'department', term_department_id));

drop policy if exists "Leader full access on session_recurrence_rule" on public.session_recurrence_rule;
create policy "System admins access recurrence" on public.session_recurrence_rule for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', ministry_term_id))
with check (public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id));

drop policy if exists "Leader full access on ministry_session" on public.ministry_session;
create policy "System admins access sessions" on public.ministry_session for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', ministry_term_id))
with check (public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id));

drop policy if exists "Leader full access on session_participant" on public.session_participant;
create policy "System admins access participants" on public.session_participant for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)))
with check (public.has_capability('term.operational.manage', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

drop policy if exists "Leader full access on attendance_record" on public.attendance_record;
create policy "System admins access attendance" on public.attendance_record for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', (select s.ministry_term_id from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id)))
with check (public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id)));

drop policy if exists "Leader full access on session_assignment" on public.session_assignment;
create policy "System admins access session assignments" on public.session_assignment for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)))
with check (public.has_capability('term.operational.manage', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

drop policy if exists "Leader full access on department_service_role" on public.department_service_role;
create policy "System admins access service roles" on public.department_service_role for all to authenticated
using (public.has_capability('term.read_history', 'department', term_department_id))
with check (public.has_capability('term.structure.prepare', 'department', term_department_id));

drop policy if exists "Leader full access on service_assignment" on public.service_assignment;
create policy "System admins access service assignments" on public.service_assignment for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)))
with check (public.has_capability('term.operational.manage', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

drop policy if exists "Leader full access on care_flag" on public.care_flag;
create policy "System admins access care flags" on public.care_flag for all to authenticated
using (public.is_system_admin_for_church((select church_id from public.member_profile where id = member_profile_id)))
with check (public.is_system_admin_for_church((select church_id from public.member_profile where id = member_profile_id)));

drop policy if exists "Leader full access on care_note" on public.care_note;
create policy "System admins access care notes" on public.care_note for all to authenticated
using (public.is_system_admin_for_church((select mp.church_id from public.care_flag cf join public.member_profile mp on mp.id = cf.member_profile_id where cf.id = care_flag_id)))
with check (public.is_system_admin_for_church((select mp.church_id from public.care_flag cf join public.member_profile mp on mp.id = cf.member_profile_id where cf.id = care_flag_id)));

drop policy if exists "Leader full access on frequent_icon" on public.frequent_icon;
create policy "System admins access frequent icons" on public.frequent_icon for all to authenticated
using (public.is_system_admin()) with check (public.is_system_admin());

drop policy if exists "Leaders can view system role assignments" on public.system_role_assignment;
create policy "System admins read system roles" on public.system_role_assignment for select to authenticated
using (public.is_system_admin_for_church(church_id));

drop policy if exists "Leaders can view and manage term role assignments" on public.term_role_assignment;
create policy "System admins read term roles" on public.term_role_assignment for select to authenticated
using (public.has_capability('term.read_history', 'ministry_term', ministry_term_id));

drop policy if exists "Leaders can read audit logs" on public.application_audit_log;
create policy "System admins read audit logs" on public.application_audit_log for select to authenticated
using (public.is_system_admin_for_church(church_id));

-- Public directory is member-only, safe fields only. Anonymous access is removed.
create or replace view public.member_profile_public
with (security_barrier = true)
as
select mp.id, mp.full_name, mp.birth_year, c.id as church_id, c.name as church_name,
  c.slug as church_slug, m.id as ministry_id, m.name as ministry_name, m.slug as ministry_slug,
  mt.id as ministry_term_id, mt.name as ministry_term_name, mt.slug as ministry_term_slug,
  tg.id as term_group_id, tg.name as term_group_name,
  coalesce(dept.department_ids, array[]::uuid[]) as department_ids,
  coalesce(dept.department_names, array[]::text[]) as department_names
from public.member_profile mp
join public.church c on c.id = mp.church_id
join public.ministry_membership mm on mm.member_profile_id = mp.id
join public.ministry_term mt on mt.id = mm.ministry_term_id
join public.ministry m on m.id = mt.ministry_id and m.church_id = c.id
left join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id
left join public.term_group tg on tg.id = tgm.term_group_id
left join lateral (
  select array_agg(td.id order by td.name, td.id) department_ids,
    array_agg(td.name order by td.name, td.id) department_names
  from public.ministry_assignment ma join public.term_department td on td.id = ma.term_department_id
  where ma.ministry_membership_id = mm.id
) dept on true
where mp.archived_at is null
  and exists (
    select 1
    from public.member_profile viewer
    where viewer.user_id = auth.uid()
      and viewer.church_id = mp.church_id
      and viewer.archived_at is null
  );

revoke all on public.member_profile_public from public, anon, authenticated;
grant select on public.member_profile_public to authenticated;

-- Keep existing table grants, and explicitly grant Phase 1 tables created later.
revoke all on public.leaders from public, anon, authenticated;
revoke all on function public.create_initial_church(text, text) from public, anon, authenticated;
grant select, insert, update, delete on public.frequent_icon to authenticated;
grant select on public.system_role_assignment, public.term_role_assignment,
  public.application_audit_log to authenticated;
