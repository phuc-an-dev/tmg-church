-- Milestone C: scoped Group roster management for Group Leaders and Deputies.

create or replace function public.has_capability(
  p_capability text, p_scope_type text, p_scope_id uuid
) returns boolean
language plpgsql security definer stable set search_path = public
as $$
declare
  v_church_id uuid; v_term_id uuid; v_lifecycle text; v_member_id uuid; v_system_admin boolean;
begin
  v_church_id := public.authorization_scope_church_id(p_scope_type, p_scope_id);
  if v_church_id is null then return false; end if;
  v_member_id := public.authorization_current_member_profile_id();
  v_system_admin := public.is_system_admin_for_church(v_church_id);
  if p_scope_type = 'ministry_term' then v_term_id := p_scope_id;
  elsif p_scope_type = 'department' then select ministry_term_id into v_term_id from public.term_department where id = p_scope_id;
  elsif p_scope_type = 'group' then select ministry_term_id into v_term_id from public.term_group where id = p_scope_id;
  end if;
  if v_term_id is not null then v_lifecycle := public.authorization_term_lifecycle(v_term_id); end if;
  if v_system_admin then
    if p_capability in ('church.read', 'church.manage', 'term.read_history', 'group.read', 'department.read') then return true; end if;
    if p_capability = 'term.structure.prepare' then return v_lifecycle in ('draft', 'active'); end if;
    if p_capability in ('term.operational.manage', 'ministry.operational.manage') then return v_lifecycle = 'active'; end if;
    if p_capability in ('group.session.manage', 'group.members.manage') then return p_scope_type = 'group' and v_lifecycle = 'active'; end if;
    if p_capability in ('department.members.manage', 'department.service_role.manage') then return p_scope_type = 'department' and v_lifecycle in ('draft', 'active'); end if;
    return false;
  end if;
  if v_member_id is null then return false; end if;
  if p_scope_type = 'ministry_term' and exists (select 1 from public.term_role_assignment tra where tra.ministry_term_id = p_scope_id and tra.member_profile_id = v_member_id and tra.role = 'ministry_head') then
    if p_capability = 'term.read_history' then return true; end if;
    if p_capability in ('term.structure.prepare', 'ministry.structure.manage') then return v_lifecycle in ('draft', 'active'); end if;
    if p_capability in ('term.operational.manage', 'ministry.operational.manage') then return v_lifecycle = 'active'; end if;
  end if;
  if p_scope_type = 'department' and exists (select 1 from public.term_department td join public.term_role_assignment tra on tra.ministry_term_id = td.ministry_term_id where td.id = p_scope_id and tra.member_profile_id = v_member_id and (tra.role = 'ministry_head' or tra.role = td.department_code || '_commissioner')) then
    if p_capability in ('term.read_history', 'department.read') then return true; end if;
    if p_capability in ('department.members.manage', 'department.service_role.manage') then return v_lifecycle = 'active'; end if;
  end if;
  if p_scope_type = 'group' and exists (select 1 from public.term_group_membership tgm join public.ministry_membership mm on mm.id = tgm.ministry_membership_id where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id) then
    if p_capability in ('term.read_history', 'group.read') then return v_lifecycle in ('draft', 'active', 'closed'); end if;
    if p_capability = 'group.session.manage' then return v_lifecycle = 'active' and exists (select 1 from public.term_group_membership tgm join public.ministry_membership mm on mm.id = tgm.ministry_membership_id where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id and tgm.role = 'group_leader' and tgm.status = 'active' and tgm.ended_at is null); end if;
    if p_capability = 'group.members.manage' then return v_lifecycle = 'active' and exists (select 1 from public.term_group_membership tgm join public.ministry_membership mm on mm.id = tgm.ministry_membership_id where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id and tgm.role in ('group_leader', 'deputy_leader') and tgm.status = 'active' and tgm.ended_at is null); end if;
  end if;
  return false;
end;
$$;

drop policy if exists "System admins access group membership" on public.term_group_membership;
create policy "Scoped group membership reads" on public.term_group_membership for select to authenticated using (public.has_capability('term.read_history', 'group', term_group_id));
create policy "Scoped group membership inserts" on public.term_group_membership for insert to authenticated with check (public.has_capability('group.members.manage', 'group', term_group_id));
create policy "Scoped group membership updates" on public.term_group_membership for update to authenticated using (public.has_capability('group.members.manage', 'group', term_group_id)) with check (public.has_capability('group.members.manage', 'group', term_group_id));
create policy "Scoped group membership deletes" on public.term_group_membership for delete to authenticated using (public.has_capability('group.members.manage', 'group', term_group_id));

create or replace function public.portal_assign_group_member(p_group_id uuid, p_membership_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_group_term uuid; v_member_term uuid; v_existing_group uuid; v_record uuid;
begin
  if not public.has_capability('group.members.manage', 'group', p_group_id) then raise exception 'Group membership access denied' using errcode = '42501'; end if;
  select ministry_term_id into v_group_term from public.term_group where id = p_group_id;
  select ministry_term_id into v_member_term from public.ministry_membership where id = p_membership_id;
  if v_group_term is null or v_member_term is null or v_group_term <> v_member_term then raise exception 'Member and group must belong to the same term' using errcode = '22023'; end if;
  select term_group_id into v_existing_group from public.term_group_membership where ministry_membership_id = p_membership_id and ended_at is null limit 1;
  if v_existing_group is not null then raise exception 'Member already belongs to a group' using errcode = '23505'; end if;
  insert into public.term_group_membership (ministry_membership_id, term_group_id, role, status, joined_at) values (p_membership_id, p_group_id, 'member', 'active', now()) returning id into v_record;
  return v_record;
end;
$$;

create or replace function public.portal_remove_group_member(p_record_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_group_id uuid; v_role text;
begin
  select term_group_id, role into v_group_id, v_role from public.term_group_membership where id = p_record_id and ended_at is null;
  if v_group_id is null or not public.has_capability('group.members.manage', 'group', v_group_id) then raise exception 'Group membership access denied' using errcode = '42501'; end if;
  if v_role <> 'member' then raise exception 'Leadership assignments can only be changed by an administrator' using errcode = '42501'; end if;
  update public.term_group_membership set status = 'left', ended_at = now() where id = p_record_id;
end;
$$;

revoke all on function public.portal_assign_group_member(uuid, uuid) from public, anon;
grant execute on function public.portal_assign_group_member(uuid, uuid) to authenticated;
revoke all on function public.portal_remove_group_member(uuid) from public, anon;
grant execute on function public.portal_remove_group_member(uuid) to authenticated;

create or replace view public.portal_group_member_directory with (security_barrier = true) as
select tg.id as group_id, tg.name as group_name, mm.id as membership_id, mp.id as member_id, mp.full_name,
  tgm.id as group_membership_id, tgm.role, tgm.status, tgm.ended_at, current_group.term_group_id as current_group_id
from public.term_group tg
join public.ministry_membership mm on mm.ministry_term_id = tg.ministry_term_id
join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
left join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id and tgm.term_group_id = tg.id
left join lateral (select term_group_id from public.term_group_membership open_tgm where open_tgm.ministry_membership_id = mm.id and open_tgm.ended_at is null limit 1) current_group on true
where public.has_capability('group.members.manage', 'group', tg.id);

revoke all on public.portal_group_member_directory from public, anon;
grant select on public.portal_group_member_directory to authenticated;
