alter table public.term_department
  add column leader_member_profile_id uuid references public.member_profile(id) on delete restrict;

create function public.assert_department_leader()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.leader_member_profile_id is not null and not exists (
    select 1 from public.term_role_assignment tra
    where tra.ministry_term_id = new.ministry_term_id
      and tra.member_profile_id = new.leader_member_profile_id
  ) then
    raise exception 'Department Leaders must currently serve on the Executive Board' using errcode = '23514';
  end if;
  return new;
end;
$$;

create policy "Department leaders read their department" on public.term_department
for select to authenticated
using (public.has_capability('department.read', 'department', id));

create function public.department_session_access(p_session_id uuid, p_capability text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select public.has_capability(p_capability, 'department', s.term_department_id)
    from public.ministry_session s
    where s.id = p_session_id and s.term_department_id is not null
  ), false);
$$;

create function public.department_participant_access(p_participant_id uuid, p_capability text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select public.department_session_access(p.ministry_session_id, p_capability)
    from public.session_participant p where p.id = p_participant_id
  ), false);
$$;

revoke all on function public.department_session_access(uuid, text) from public, anon;
revoke all on function public.department_participant_access(uuid, text) from public, anon;
grant execute on function public.department_session_access(uuid, text) to authenticated;
grant execute on function public.department_participant_access(uuid, text) to authenticated;

create policy "Department leaders read sessions" on public.ministry_session
for select to authenticated
using (term_department_id is not null and public.has_capability('department.read', 'department', term_department_id));
create policy "Department leaders create sessions" on public.ministry_session
for insert to authenticated
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders update sessions" on public.ministry_session
for update to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id))
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders delete sessions" on public.ministry_session
for delete to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));

create policy "Department leaders read recurrences" on public.session_recurrence_rule
for select to authenticated
using (term_department_id is not null and public.has_capability('department.read', 'department', term_department_id));
create policy "Department leaders create recurrences" on public.session_recurrence_rule
for insert to authenticated
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders update recurrences" on public.session_recurrence_rule
for update to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id))
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders delete recurrences" on public.session_recurrence_rule
for delete to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));

create policy "Department leaders read participants" on public.session_participant
for select to authenticated
using (public.department_session_access(ministry_session_id, 'department.read'));
create policy "Department leaders create participants" on public.session_participant
for insert to authenticated
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders update participants" on public.session_participant
for update to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'))
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders delete participants" on public.session_participant
for delete to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'));

create policy "Department leaders read attendance" on public.attendance_record
for select to authenticated
using (public.department_participant_access(session_participant_id, 'department.read'));
create policy "Department leaders create attendance" on public.attendance_record
for insert to authenticated
with check (public.department_participant_access(session_participant_id, 'department.session.manage'));
create policy "Department leaders update attendance" on public.attendance_record
for update to authenticated
using (public.department_participant_access(session_participant_id, 'department.session.manage'))
with check (public.department_participant_access(session_participant_id, 'department.session.manage'));
create policy "Department leaders delete attendance" on public.attendance_record
for delete to authenticated
using (public.department_participant_access(session_participant_id, 'department.session.manage'));

create policy "Department leaders read session assignments" on public.session_assignment
for select to authenticated
using (public.department_session_access(ministry_session_id, 'department.read'));
create policy "Department leaders create session assignments" on public.session_assignment
for insert to authenticated
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders update session assignments" on public.session_assignment
for update to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'))
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders delete session assignments" on public.session_assignment
for delete to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'));

create trigger trg_assert_department_leader
before insert or update of leader_member_profile_id, ministry_term_id on public.term_department
for each row execute function public.assert_department_leader();

create function public.prevent_board_leader_removal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.member_profile_id is not distinct from old.member_profile_id then
    return new;
  end if;

  perform 1 from public.term_department td
  where td.ministry_term_id = old.ministry_term_id
    and td.leader_member_profile_id = old.member_profile_id
  for update;
  if found and not exists (
      select 1 from public.term_role_assignment tra
      where tra.ministry_term_id = old.ministry_term_id
        and tra.member_profile_id = old.member_profile_id
        and tra.id <> old.id
  ) then
    raise exception 'Reassign Department Leader before removing the last Executive Board role' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger trg_prevent_board_leader_removal
before update of member_profile_id or delete on public.term_role_assignment
for each row execute function public.prevent_board_leader_removal();

create function public.set_department_leader(p_department_id uuid, p_member_profile_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_church_id uuid; v_lifecycle text;
begin
  select m.church_id, mt.lifecycle into v_church_id, v_lifecycle
  from public.term_department td
  join public.ministry_term mt on mt.id = td.ministry_term_id
  join public.ministry m on m.id = mt.ministry_id
  where td.id = p_department_id
  for update of td;

  if v_church_id is null then
    raise exception 'Department not found' using errcode = 'P0002';
  end if;
  if not public.is_system_admin_for_church(v_church_id) then
    raise exception 'Unauthorized Department Leader assignment' using errcode = '42501';
  end if;
  if v_lifecycle = 'closed' then
    raise exception 'Cannot change Department Leader for closed term' using errcode = '23514';
  end if;

  update public.term_department
  set leader_member_profile_id = p_member_profile_id
  where id = p_department_id;
  return true;
end;
$$;

revoke all on function public.set_department_leader(uuid, uuid) from public, anon;
grant execute on function public.set_department_leader(uuid, uuid) to authenticated;

create or replace function public.has_capability(
  p_capability text, p_scope_type text, p_scope_id uuid
) returns boolean
language plpgsql security definer stable set search_path = public
as $$
declare
  v_church_id uuid; v_term_id uuid; v_lifecycle text; v_member_id uuid; v_system_admin boolean;
begin
  v_church_id := public.authorization_scope_church_id(p_scope_type, p_scope_id);
  v_member_id := public.authorization_current_member_profile_id();
  v_system_admin := public.is_system_admin() or (v_church_id is not null and public.is_system_admin_for_church(v_church_id));

  if p_scope_type = 'ministry_term' then v_term_id := p_scope_id;
  elsif p_scope_type = 'department' then select ministry_term_id into v_term_id from public.term_department where id = p_scope_id;
  elsif p_scope_type = 'group' then select ministry_term_id into v_term_id from public.term_group where id = p_scope_id;
  end if;
  if v_term_id is not null then v_lifecycle := public.authorization_term_lifecycle(v_term_id); end if;

  if v_system_admin then
    if p_capability in ('church.read', 'church.manage', 'term.read_history', 'group.read', 'department.read') then return true; end if;
    if p_capability in ('term.structure.prepare', 'group.members.manage', 'department.members.manage', 'department.service_role.manage', 'department.session.manage', 'term.operational.manage', 'group.session.manage') then
      return v_lifecycle in ('draft', 'active');
    end if;
    if p_capability = 'ministry.operational.manage' then return v_lifecycle = 'active'; end if;
    return false;
  end if;

  if v_member_id is null then return false; end if;

  if p_scope_type = 'ministry_term' and exists (
    select 1 from public.term_role_assignment tra
    where tra.ministry_term_id = p_scope_id and tra.member_profile_id = v_member_id and tra.role = 'ministry_head'
  ) then
    if p_capability = 'term.read_history' then return true; end if;
    if p_capability in ('term.structure.prepare', 'ministry.structure.manage', 'group.members.manage', 'department.members.manage') then
      return v_lifecycle in ('draft', 'active');
    end if;
    if p_capability in ('term.operational.manage', 'ministry.operational.manage') then return v_lifecycle = 'active'; end if;
  end if;

  if p_scope_type = 'department' and exists (
    select 1 from public.term_department td
    where td.id = p_scope_id and (
      td.leader_member_profile_id = v_member_id
      or exists (
        select 1 from public.term_role_assignment tra
        where tra.ministry_term_id = td.ministry_term_id
          and tra.member_profile_id = v_member_id
          and tra.role = 'ministry_head'
      )
    )
  ) then
    if p_capability in ('term.read_history', 'department.read') then return true; end if;
    if p_capability in ('department.members.manage', 'department.service_role.manage', 'department.session.manage') then
      return v_lifecycle = 'active';
    end if;
  end if;

  if p_scope_type = 'group' and exists (
    select 1 from public.term_group tg
    join public.term_role_assignment tra on tra.ministry_term_id = tg.ministry_term_id
    where tg.id = p_scope_id and tra.member_profile_id = v_member_id and tra.role = 'ministry_head'
  ) then
    if p_capability in ('term.read_history', 'group.read') then return true; end if;
    if p_capability in ('group.members.manage', 'group.session.manage') then return v_lifecycle in ('draft', 'active'); end if;
  end if;

  if p_scope_type = 'group' and exists (
    select 1 from public.term_group_membership tgm
    join public.ministry_membership mm on mm.id = tgm.ministry_membership_id
    where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id
  ) then
    if p_capability in ('term.read_history', 'group.read') then return v_lifecycle in ('draft', 'active', 'closed'); end if;
    if p_capability = 'group.session.manage' then
      return v_lifecycle = 'active' and exists (
        select 1 from public.term_group_membership tgm
        join public.ministry_membership mm on mm.id = tgm.ministry_membership_id
        where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id and tgm.role = 'group_leader' and tgm.status = 'active' and tgm.ended_at is null
      );
    end if;
    if p_capability = 'group.members.manage' then
      return v_lifecycle = 'active' and exists (
        select 1 from public.term_group_membership tgm
        join public.ministry_membership mm on mm.id = tgm.ministry_membership_id
        where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id and tgm.role in ('group_leader', 'deputy_leader') and tgm.status = 'active' and tgm.ended_at is null
      );
    end if;
  end if;

  return false;
end;
$$;
