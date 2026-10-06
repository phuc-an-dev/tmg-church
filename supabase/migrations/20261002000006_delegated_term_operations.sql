-- Delegated members also gain term-level operational management so the
-- scoped participant/attendance policies accept their writes, plus a
-- definer-side helper to resolve the church for session creation.
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

  -- Delegation is limited to ministry-wide sessions; it does not grant access
  -- to department or group session data through term-wide capabilities.
  if v_term_id is not null and p_capability = 'ministry.operational.manage' and exists (
    select 1 from public.ministry_operation_delegation d
    where d.ministry_term_id = v_term_id
      and d.member_profile_id = v_member_id
      and d.capability = 'ministry.operational.manage'
  ) then
    return v_lifecycle = 'active';
  end if;

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

drop policy if exists "Scoped session reads" on public.ministry_session;
create policy "Scoped session reads" on public.ministry_session for select to authenticated
using (
  public.has_capability('term.read_history', 'ministry_term', ministry_term_id)
  or (term_department_id is null and term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', ministry_term_id))
  or (term_group_id is not null and public.has_capability('term.read_history', 'group', term_group_id))
);

drop policy if exists "Scoped session inserts" on public.ministry_session;
create policy "Scoped session inserts" on public.ministry_session for insert to authenticated
with check (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (term_department_id is null and term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', ministry_term_id))
  or (term_group_id is not null and public.has_capability('group.session.manage', 'group', term_group_id))
);

drop policy if exists "Scoped session updates" on public.ministry_session;
create policy "Scoped session updates" on public.ministry_session for update to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (term_department_id is null and term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', ministry_term_id))
  or (term_group_id is not null and public.has_capability('group.session.manage', 'group', term_group_id))
)
with check (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (term_department_id is null and term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', ministry_term_id))
  or (term_group_id is not null and public.has_capability('group.session.manage', 'group', term_group_id))
);

drop policy if exists "Scoped session deletes" on public.ministry_session;
create policy "Scoped session deletes" on public.ministry_session for delete to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (term_department_id is null and term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', ministry_term_id))
  or (term_group_id is not null and public.has_capability('group.session.manage', 'group', term_group_id))
);

drop policy if exists "Scoped participant reads" on public.session_participant;
create policy "Scoped participant reads" on public.session_participant for select to authenticated
using (
  exists (
    select 1 from public.ministry_session s
    where s.id = ministry_session_id
      and ((s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
        or public.has_capability('term.read_history', 'ministry_term', s.ministry_term_id))
  )
  or exists (
    select 1 from public.ministry_session s
    where s.id = ministry_session_id and s.term_group_id is not null
      and public.has_capability('term.read_history', 'group', s.term_group_id)
  )
);

drop policy if exists "Scoped participant inserts" on public.session_participant;
create policy "Scoped participant inserts" on public.session_participant for insert to authenticated
with check (
  exists (
    select 1 from public.ministry_session s where s.id = ministry_session_id
      and ((s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
        or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id))
  )
  or exists (select 1 from public.ministry_session s where s.id = ministry_session_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

drop policy if exists "Scoped participant updates" on public.session_participant;
create policy "Scoped participant updates" on public.session_participant for update to authenticated
using (
  exists (select 1 from public.ministry_session s where s.id = ministry_session_id
    and ((s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.ministry_session s where s.id = ministry_session_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
)
with check (
  exists (select 1 from public.ministry_session s where s.id = ministry_session_id
    and ((s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.ministry_session s where s.id = ministry_session_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

drop policy if exists "Scoped participant deletes" on public.session_participant;
create policy "Scoped participant deletes" on public.session_participant for delete to authenticated
using (
  exists (select 1 from public.ministry_session s where s.id = ministry_session_id
    and ((s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.ministry_session s where s.id = ministry_session_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

drop policy if exists "Scoped attendance reads" on public.attendance_record;
create policy "Scoped attendance reads" on public.attendance_record for select to authenticated
using (
  exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and (
      (s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.read_history', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('term.read_history', 'group', s.term_group_id))
);

drop policy if exists "Scoped attendance inserts" on public.attendance_record;
create policy "Scoped attendance inserts" on public.attendance_record for insert to authenticated
with check (
  exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and (
      (s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

drop policy if exists "Scoped attendance updates" on public.attendance_record;
create policy "Scoped attendance updates" on public.attendance_record for update to authenticated
using (
  exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and (
      (s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
)
with check (
  exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and (
      (s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

drop policy if exists "Scoped attendance deletes" on public.attendance_record;
create policy "Scoped attendance deletes" on public.attendance_record for delete to authenticated
using (
  exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and (
      (s.term_department_id is null and s.term_group_id is null and public.has_capability('ministry.operational.manage', 'ministry_term', s.ministry_term_id))
      or public.has_capability('term.operational.manage', 'ministry_term', s.ministry_term_id)))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

-- Definer-side church resolver for delegated ministry session management;
-- returns NULL unless the caller holds the delegated capability.
create or replace function public.portal_term_church_id(p_term_id uuid)
returns uuid
language plpgsql security definer stable set search_path = public
as $$
declare
  v_church_id uuid;
begin
  if not public.has_capability('ministry.operational.manage', 'ministry_term', p_term_id) then
    return null;
  end if;
  select m.church_id into v_church_id
  from public.ministry_term mt
  join public.ministry m on m.id = mt.ministry_id
  where mt.id = p_term_id;
  return v_church_id;
end;
$$;

revoke all on function public.portal_term_church_id(uuid) from public, anon;
grant execute on function public.portal_term_church_id(uuid) to authenticated;

drop policy if exists "System admins manage delegations" on public.ministry_operation_delegation;
drop policy if exists "System admins manage department delegations" on public.ministry_operation_delegation;
drop policy if exists "Members read delegations" on public.ministry_operation_delegation;
create policy "System admins manage department delegations" on public.ministry_operation_delegation
  for all to authenticated
  using (
    (public.is_system_admin() or public.is_system_admin_for_church(public.authorization_scope_church_id('ministry_term', ministry_operation_delegation.ministry_term_id)))
    and exists (
      select 1 from public.ministry_assignment ma
      join public.ministry_membership mm on mm.id = ma.ministry_membership_id
      join public.term_department td on td.id = ma.term_department_id
      where td.ministry_term_id = ministry_operation_delegation.ministry_term_id
        and mm.member_profile_id = ministry_operation_delegation.member_profile_id
    )
  )
  with check (
    (public.is_system_admin() or public.is_system_admin_for_church(public.authorization_scope_church_id('ministry_term', ministry_operation_delegation.ministry_term_id)))
    and exists (
      select 1 from public.ministry_assignment ma
      join public.ministry_membership mm on mm.id = ma.ministry_membership_id
      join public.term_department td on td.id = ma.term_department_id
      where td.ministry_term_id = ministry_operation_delegation.ministry_term_id
        and mm.member_profile_id = ministry_operation_delegation.member_profile_id
    )
  );
create policy "Members read delegations" on public.ministry_operation_delegation
  for select to authenticated
  using (member_profile_id = public.authorization_current_member_profile_id());

create or replace function public.portal_delegated_terms()
returns table (ministry_term_id uuid, ministry_slug text, ministry_name text, term_slug text, term_name text)
language sql security definer stable set search_path = public
as $$
  select mt.id, m.slug, m.name, mt.slug, mt.name
  from public.ministry_operation_delegation d
  join public.ministry_term mt on mt.id = d.ministry_term_id
  join public.ministry m on m.id = mt.ministry_id
  where d.member_profile_id = public.authorization_current_member_profile_id()
    and d.capability = 'ministry.operational.manage'
    and public.has_capability('ministry.operational.manage', 'ministry_term', mt.id)
  order by m.name, mt.name;
$$;

revoke all on function public.portal_delegated_terms() from public, anon;
grant execute on function public.portal_delegated_terms() to authenticated;
revoke all on function public.portal_term_church_id(uuid) from public, anon;
grant execute on function public.portal_term_church_id(uuid) to authenticated;
