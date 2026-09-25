-- Comprehensive fix for term_group_membership RLS and authorization capabilities

-- 1. Ensure is_system_admin_for_church handles global system admins and single-church setups
create or replace function public.is_system_admin_for_church(p_church_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.system_role_assignment s
    where (s.church_id is null or p_church_id is null or s.church_id = p_church_id)
      and s.user_id = auth.uid()
      and s.role in ('master_admin', 'admin')
  )
$$;

-- 2. Authorization scope church resolution with single-church fallback
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
  if v_church_id is null then
    select id into v_church_id from public.church order by created_at asc limit 1;
  end if;
  return v_church_id;
end;
$$;

-- 3. Robust has_capability function
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
    if p_capability in ('term.structure.prepare', 'group.members.manage', 'department.members.manage', 'department.service_role.manage', 'term.operational.manage', 'group.session.manage') then
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
    join public.term_role_assignment tra on tra.ministry_term_id = td.ministry_term_id
    where td.id = p_scope_id and tra.member_profile_id = v_member_id and (tra.role = 'ministry_head' or tra.role = td.department_code || '_commissioner')
  ) then
    if p_capability in ('term.read_history', 'department.read') then return true; end if;
    if p_capability in ('department.members.manage', 'department.service_role.manage') then return v_lifecycle in ('draft', 'active'); end if;
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

-- 4. Atomic RPC: assign_group_member
create or replace function public.assign_group_member(
  target_group_id uuid,
  target_membership_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership_term_id uuid;
  v_group_term_id uuid;
  v_open_record_id uuid;
  v_open_group_id uuid;
  v_new_record_id uuid;
begin
  if not public.is_system_admin()
     and not public.is_leader()
     and not public.has_capability('group.members.manage', 'group', target_group_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  -- Lock ministry_membership row to serialize concurrent assignments
  select mm.ministry_term_id
  into v_membership_term_id
  from public.ministry_membership mm
  where mm.id = target_membership_id
  for update;

  if not found then
    raise exception 'Ministry membership not found' using errcode = 'P0002';
  end if;

  -- Validate target group and check term boundary
  select tg.ministry_term_id
  into v_group_term_id
  from public.term_group tg
  where tg.id = target_group_id;

  if not found then
    raise exception 'Target group not found' using errcode = 'P0002';
  end if;

  if v_membership_term_id <> v_group_term_id then
    raise exception 'Selected group does not belong to the same ministry term' using errcode = '22023';
  end if;

  -- Check current open group membership
  select tgm.id, tgm.term_group_id
  into v_open_record_id, v_open_group_id
  from public.term_group_membership tgm
  where tgm.ministry_membership_id = target_membership_id
    and tgm.ended_at is null
  for update;

  if v_open_record_id is not null then
    if v_open_group_id = target_group_id then
      raise exception 'Member is already in this group' using errcode = '22023';
    else
      -- Move from old group: close previous membership as transferred
      update public.term_group_membership
      set status = 'transferred', ended_at = now()
      where id = v_open_record_id;
    end if;
  end if;

  -- Insert new active membership with role 'member'
  insert into public.term_group_membership (
    ministry_membership_id,
    term_group_id,
    role,
    status,
    joined_at,
    ended_at
  ) values (
    target_membership_id,
    target_group_id,
    'member',
    'active',
    now(),
    null
  )
  returning id into v_new_record_id;

  return v_new_record_id;
end;
$$;

-- 5. Drop ALL old policies on term_group_membership to avoid conflicts
drop policy if exists "Leader full access on term_group_membership" on public.term_group_membership;
drop policy if exists "System admins access group membership" on public.term_group_membership;
drop policy if exists "Scoped group membership reads" on public.term_group_membership;
drop policy if exists "Scoped group membership inserts" on public.term_group_membership;
drop policy if exists "Scoped group membership updates" on public.term_group_membership;
drop policy if exists "Scoped group membership deletes" on public.term_group_membership;

-- 6. Set unified, clean RLS policies on term_group_membership
create policy "System admins access group membership" on public.term_group_membership for all to authenticated
using (
  public.is_system_admin()
  or public.has_capability('term.read_history', 'group', term_group_id)
)
with check (
  public.is_system_admin()
  or public.has_capability('group.members.manage', 'group', term_group_id)
);
