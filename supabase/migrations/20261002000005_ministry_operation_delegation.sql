-- Delegated ministry operations: lets an admin grant a specific member (in
-- practice a department leader) the ministry-level session management
-- capability for one term, without touching the Executive Board model.
create table if not exists public.ministry_operation_delegation (
  id uuid primary key default gen_random_uuid(),
  ministry_term_id uuid not null references public.ministry_term(id) on delete cascade,
  member_profile_id uuid not null references public.member_profile(id) on delete cascade,
  capability text not null,
  constraint ministry_operation_delegation_capability_check
    check (capability = 'ministry.operational.manage'),
  constraint ministry_operation_delegation_unique
    unique (ministry_term_id, member_profile_id, capability),
  created_at timestamptz not null default now()
);

alter table public.ministry_operation_delegation enable row level security;

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

-- Extend capability resolution: a delegated member gains read access to the
-- term and ministry-level operational management while the term is active.
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

  -- Delegated ministry operations (see ministry_operation_delegation).
  if v_term_id is not null and p_capability in ('ministry.operational.manage', 'term.read_history') and exists (
    select 1 from public.ministry_operation_delegation d
    where d.ministry_term_id = v_term_id
      and d.member_profile_id = v_member_id
      and d.capability = 'ministry.operational.manage'
  ) then
    if p_capability = 'ministry.operational.manage' then return v_lifecycle = 'active'; end if;
    return true;
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

revoke all on public.ministry_operation_delegation from public, anon;
grant select, insert, update, delete on public.ministry_operation_delegation to authenticated;
