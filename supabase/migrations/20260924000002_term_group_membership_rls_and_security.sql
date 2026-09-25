-- Fix term group membership RLS and convert group lifecycle RPCs to security definer

-- 1. Update has_capability to allow group management in draft & active terms and support ministry heads
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
    if p_capability in ('group.session.manage', 'group.members.manage') then return p_scope_type = 'group' and v_lifecycle in ('draft', 'active'); end if;
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
    if p_capability in ('department.members.manage', 'department.service_role.manage') then return v_lifecycle in ('draft', 'active'); end if;
  end if;
  if p_scope_type = 'group' and exists (select 1 from public.term_group tg join public.term_role_assignment tra on tra.ministry_term_id = tg.ministry_term_id where tg.id = p_scope_id and tra.member_profile_id = v_member_id and tra.role = 'ministry_head') then
    if p_capability in ('term.read_history', 'group.read') then return true; end if;
    if p_capability in ('group.members.manage', 'group.session.manage') then return v_lifecycle in ('draft', 'active'); end if;
  end if;
  if p_scope_type = 'group' and exists (select 1 from public.term_group_membership tgm join public.ministry_membership mm on mm.id = tgm.ministry_membership_id where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id) then
    if p_capability in ('term.read_history', 'group.read') then return v_lifecycle in ('draft', 'active', 'closed'); end if;
    if p_capability = 'group.session.manage' then return v_lifecycle = 'active' and exists (select 1 from public.term_group_membership tgm join public.ministry_membership mm on mm.id = tgm.ministry_membership_id where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id and tgm.role = 'group_leader' and tgm.status = 'active' and tgm.ended_at is null); end if;
    if p_capability = 'group.members.manage' then return v_lifecycle = 'active' and exists (select 1 from public.term_group_membership tgm join public.ministry_membership mm on mm.id = tgm.ministry_membership_id where tgm.term_group_id = p_scope_id and mm.member_profile_id = v_member_id and tgm.role in ('group_leader', 'deputy_leader') and tgm.status = 'active' and tgm.ended_at is null); end if;
  end if;
  return false;
end;
$$;

-- 2. Define group lifecycle RPCs as security definer
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
  if not public.is_leader() and not public.has_capability('group.members.manage', 'group', target_group_id) then
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

create or replace function public.update_group_member_role(
  target_record_id uuid,
  target_role text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_status text;
  v_ended_at timestamptz;
begin
  select tgm.term_group_id, tgm.status, tgm.ended_at
  into v_group_id, v_status, v_ended_at
  from public.term_group_membership tgm
  where tgm.id = target_record_id
  for update;

  if not found then
    raise exception 'Group membership record not found' using errcode = 'P0002';
  end if;

  if not public.is_leader() and not public.has_capability('group.members.manage', 'group', v_group_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if target_role not in ('member', 'group_leader', 'deputy_leader', 'bible_study_leader') then
    raise exception 'Invalid group role' using errcode = '22023';
  end if;

  if v_ended_at is not null then
    raise exception 'Cannot change role on an ended group membership' using errcode = '22023';
  end if;

  -- If member is active and role is a leadership role, demote any existing active member holding that role to 'member'
  if v_status = 'active' and target_role in ('group_leader', 'deputy_leader', 'bible_study_leader') then
    update public.term_group_membership
    set role = 'member'
    where term_group_id = v_group_id
      and role = target_role
      and status = 'active'
      and ended_at is null
      and id <> target_record_id;
  end if;

  update public.term_group_membership
  set role = target_role
  where id = target_record_id;
end;
$$;

create or replace function public.update_group_member_status(
  target_record_id uuid,
  target_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_role text;
  v_ended_at timestamptz;
begin
  select tgm.term_group_id, tgm.role, tgm.ended_at
  into v_group_id, v_role, v_ended_at
  from public.term_group_membership tgm
  where tgm.id = target_record_id
  for update;

  if not found then
    raise exception 'Group membership record not found' using errcode = 'P0002';
  end if;

  if not public.is_leader() and not public.has_capability('group.members.manage', 'group', v_group_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if target_status not in ('active', 'inactive', 'left') then
    raise exception 'Invalid group status' using errcode = '22023';
  end if;

  if v_ended_at is not null then
    raise exception 'Cannot modify an ended group membership' using errcode = '22023';
  end if;

  if target_status = 'left' then
    update public.term_group_membership
    set status = 'left', ended_at = now()
    where id = target_record_id;
  elsif target_status = 'inactive' then
    update public.term_group_membership
    set status = 'inactive', ended_at = null
    where id = target_record_id;
  elsif target_status = 'active' then
    -- When activating, if the role is a leadership role, ensure no other active member holds it
    if v_role in ('group_leader', 'deputy_leader', 'bible_study_leader') then
      if exists (
        select 1 from public.term_group_membership
        where term_group_id = v_group_id
          and role = v_role
          and status = 'active'
          and ended_at is null
          and id <> target_record_id
      ) then
        raise exception 'Cannot activate: this leadership role is already held by another active member' using errcode = '23505';
      end if;
    end if;

    update public.term_group_membership
    set status = 'active', ended_at = null
    where id = target_record_id;
  end if;
end;
$$;

create or replace function public.remove_group_member(
  target_record_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.update_group_member_status(target_record_id, 'left');
end;
$$;

-- 3. Grants and Revokes
revoke all on function public.assign_group_member(uuid, uuid) from public, anon;
grant execute on function public.assign_group_member(uuid, uuid) to authenticated;

revoke all on function public.update_group_member_role(uuid, text) from public, anon;
grant execute on function public.update_group_member_role(uuid, text) to authenticated;

revoke all on function public.update_group_member_status(uuid, text) from public, anon;
grant execute on function public.update_group_member_status(uuid, text) to authenticated;

revoke all on function public.remove_group_member(uuid) from public, anon;
grant execute on function public.remove_group_member(uuid) to authenticated;

-- 4. RLS policies on term_group_membership
drop policy if exists "Scoped group membership reads" on public.term_group_membership;
drop policy if exists "Scoped group membership inserts" on public.term_group_membership;
drop policy if exists "Scoped group membership updates" on public.term_group_membership;
drop policy if exists "Scoped group membership deletes" on public.term_group_membership;

create policy "Scoped group membership reads" on public.term_group_membership for select to authenticated
using (public.has_capability('term.read_history', 'group', term_group_id));

create policy "Scoped group membership inserts" on public.term_group_membership for insert to authenticated
with check (public.has_capability('group.members.manage', 'group', term_group_id));

create policy "Scoped group membership updates" on public.term_group_membership for update to authenticated
using (public.has_capability('group.members.manage', 'group', term_group_id))
with check (public.has_capability('group.members.manage', 'group', term_group_id));

create policy "Scoped group membership deletes" on public.term_group_membership for delete to authenticated
using (public.has_capability('group.members.manage', 'group', term_group_id));
