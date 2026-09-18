-- Milestone C: capability-driven portal foundation.

create or replace function public.authorization_current_member_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.member_profile
  where user_id = auth.uid() and archived_at is null
  limit 1
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
  v_term_id uuid;
  v_lifecycle text;
  v_member_id uuid;
  v_system_admin boolean;
begin
  v_church_id := public.authorization_scope_church_id(p_scope_type, p_scope_id);
  if v_church_id is null then return false; end if;
  v_member_id := public.authorization_current_member_profile_id();
  v_system_admin := public.is_system_admin_for_church(v_church_id);

  if p_scope_type = 'ministry_term' then
    v_term_id := p_scope_id;
  elsif p_scope_type = 'department' then
    select ministry_term_id into v_term_id from public.term_department where id = p_scope_id;
  elsif p_scope_type = 'group' then
    select ministry_term_id into v_term_id from public.term_group where id = p_scope_id;
  end if;
  if v_term_id is not null then
    v_lifecycle := public.authorization_term_lifecycle(v_term_id);
  end if;

  if v_system_admin then
    if p_capability in ('church.read', 'church.manage', 'term.read_history') then return true; end if;
    if p_capability = 'term.structure.prepare' then return v_lifecycle in ('draft', 'active'); end if;
    if p_capability in ('term.operational.manage', 'ministry.operational.manage') then return v_lifecycle = 'active'; end if;
    if p_capability = 'group.session.manage' then return p_scope_type = 'group' and v_lifecycle = 'active'; end if;
    if p_capability in ('department.members.manage', 'department.service_role.manage') then return p_scope_type = 'department' and v_lifecycle in ('draft', 'active'); end if;
    return false;
  end if;

  if v_member_id is null then return false; end if;

  if p_scope_type = 'ministry_term' and exists (
    select 1 from public.term_role_assignment tra
    where tra.ministry_term_id = p_scope_id and tra.member_profile_id = v_member_id
      and tra.role = 'ministry_head'
  ) then
    if p_capability = 'term.read_history' then return true; end if;
    if p_capability in ('term.structure.prepare', 'ministry.structure.manage') then return v_lifecycle in ('draft', 'active'); end if;
    if p_capability in ('term.operational.manage', 'ministry.operational.manage') then return v_lifecycle = 'active'; end if;
  end if;

  if p_scope_type = 'department' and exists (
    select 1
    from public.term_department td
    join public.term_role_assignment tra on tra.ministry_term_id = td.ministry_term_id
    where td.id = p_scope_id and tra.member_profile_id = v_member_id
      and (tra.role = 'ministry_head' or tra.role = td.department_code || '_commissioner')
  ) then
    if p_capability = 'term.read_history' or p_capability = 'department.read' then return true; end if;
    if p_capability = 'department.members.manage' then return v_lifecycle = 'active'; end if;
  end if;

  if p_scope_type = 'group' and exists (
    select 1
    from public.term_group_membership tgm
    join public.ministry_membership mm on mm.id = tgm.ministry_membership_id
    where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id
  ) then
    if p_capability in ('term.read_history', 'group.read') then return v_lifecycle in ('draft', 'active', 'closed'); end if;
    if p_capability = 'group.session.manage' then
      return v_lifecycle = 'active' and exists (
        select 1 from public.term_group_membership tgm
        join public.ministry_membership mm on mm.id = tgm.ministry_membership_id
        where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id
          and tgm.role = 'group_leader' and tgm.status = 'active' and tgm.ended_at is null
      );
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.get_my_portal_context()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'member_profile_id', public.authorization_current_member_profile_id(),
    'is_system_admin', public.is_system_admin(),
    'term_roles', coalesce((
      select jsonb_agg(jsonb_build_object('term_id', tra.ministry_term_id, 'role', tra.role) order by tra.created_at)
      from public.term_role_assignment tra
      where tra.member_profile_id = public.authorization_current_member_profile_id()
    ), '[]'::jsonb),
    'group_roles', coalesce((
      select jsonb_agg(jsonb_build_object('group_id', tgm.term_group_id, 'role', tgm.role) order by tgm.joined_at)
      from public.term_group_membership tgm
      join public.ministry_membership mm on mm.id = tgm.ministry_membership_id
      where mm.member_profile_id = public.authorization_current_member_profile_id()
        and tgm.status = 'active' and tgm.ended_at is null
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.authorization_current_member_profile_id() from public, anon, authenticated;
revoke all on function public.has_capability(text, text, uuid) from public, anon;
revoke all on function public.get_my_portal_context() from public, anon;
grant execute on function public.has_capability(text, text, uuid) to authenticated;
grant execute on function public.get_my_portal_context() to authenticated;
grant execute on function public.authorization_current_member_profile_id() to authenticated;

-- Scoped readers can inspect their own group membership and group structure;
-- writes remain guarded by the existing system-admin policies.
drop policy if exists "System admins access groups" on public.term_group;
create policy "Scoped members read groups"
  on public.term_group for select to authenticated
  using (
    public.is_system_admin_for_church((select m.church_id from public.ministry_term mt join public.ministry m on m.id = mt.ministry_id where mt.id = ministry_term_id))
    or public.has_capability('group.read', 'group', id)
  );
create policy "System admins manage groups"
  on public.term_group for insert to authenticated
  with check (public.is_system_admin_for_church((select m.church_id from public.ministry_term mt join public.ministry m on m.id = mt.ministry_id where mt.id = ministry_term_id)));
create policy "System admins update groups"
  on public.term_group for update to authenticated
  using (public.is_system_admin_for_church((select m.church_id from public.ministry_term mt join public.ministry m on m.id = mt.ministry_id where mt.id = ministry_term_id)))
  with check (public.is_system_admin_for_church((select m.church_id from public.ministry_term mt join public.ministry m on m.id = mt.ministry_id where mt.id = ministry_term_id)));
create policy "System admins delete groups"
  on public.term_group for delete to authenticated
  using (public.is_system_admin_for_church((select m.church_id from public.ministry_term mt join public.ministry m on m.id = mt.ministry_id where mt.id = ministry_term_id)));

drop policy if exists "System admins read term roles" on public.term_role_assignment;
create policy "Members read own term roles"
  on public.term_role_assignment for select to authenticated
  using (
    public.is_system_admin_for_church((select m.church_id from public.ministry_term mt join public.ministry m on m.id = mt.ministry_id where mt.id = ministry_term_id))
    or member_profile_id = public.authorization_current_member_profile_id()
  );
