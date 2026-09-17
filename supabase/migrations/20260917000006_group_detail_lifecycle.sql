-- Migration: Group detail lifecycle, constraints, atomic membership RPCs, and group-scoped attendance

-- 1. Evolve term_group_membership table
alter table public.term_group_membership
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'active',
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz null;

alter table public.term_group_membership
  drop constraint if exists term_group_membership_role_check,
  add constraint term_group_membership_role_check
    check (role in ('member', 'group_leader', 'deputy_leader', 'bible_study_leader'));

alter table public.term_group_membership
  drop constraint if exists term_group_membership_status_check,
  add constraint term_group_membership_status_check
    check (status in ('active', 'inactive', 'transferred', 'left'));

alter table public.term_group_membership
  drop constraint if exists term_group_membership_lifecycle_check,
  add constraint term_group_membership_lifecycle_check
    check (
      (ended_at is null and status in ('active', 'inactive')) or
      (ended_at is not null and status in ('transferred', 'left'))
    );

-- 2. Drop historical global unique constraint on ministry_membership_id
alter table public.term_group_membership
  drop constraint if exists term_group_membership_ministry_membership_id_key;

-- 3. Partial unique index: at most one open membership per ministry membership
create unique index if not exists term_group_membership_open_idx
  on public.term_group_membership (ministry_membership_id)
  where (ended_at is null);

-- 4. Partial unique indexes: at most one active member per leadership role per group
create unique index if not exists term_group_active_group_leader_idx
  on public.term_group_membership (term_group_id)
  where (role = 'group_leader' and status = 'active' and ended_at is null);

create unique index if not exists term_group_active_deputy_leader_idx
  on public.term_group_membership (term_group_id)
  where (role = 'deputy_leader' and status = 'active' and ended_at is null);

create unique index if not exists term_group_active_bible_study_leader_idx
  on public.term_group_membership (term_group_id)
  where (role = 'bible_study_leader' and status = 'active' and ended_at is null);

-- 5. Performance and history indexes
create index if not exists term_group_membership_group_active_idx
  on public.term_group_membership (term_group_id, status)
  where (ended_at is null);

create index if not exists term_group_membership_group_history_idx
  on public.term_group_membership (term_group_id, ended_at desc);

-- 6. Atomic RPC: assign or move a member to a group
create or replace function public.assign_group_member(
  target_group_id uuid,
  target_membership_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_membership_term_id uuid;
  v_group_term_id uuid;
  v_open_record_id uuid;
  v_open_group_id uuid;
  v_new_record_id uuid;
begin
  if not public.is_leader() then
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

-- 7. Atomic RPC: update group member role
create or replace function public.update_group_member_role(
  target_record_id uuid,
  target_role text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group_id uuid;
  v_status text;
  v_ended_at timestamptz;
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if target_role not in ('member', 'group_leader', 'deputy_leader', 'bible_study_leader') then
    raise exception 'Invalid group role' using errcode = '22023';
  end if;

  select tgm.term_group_id, tgm.status, tgm.ended_at
  into v_group_id, v_status, v_ended_at
  from public.term_group_membership tgm
  where tgm.id = target_record_id
  for update;

  if not found then
    raise exception 'Group membership record not found' using errcode = 'P0002';
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

-- 8. Atomic RPC: update group member status
create or replace function public.update_group_member_status(
  target_record_id uuid,
  target_status text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group_id uuid;
  v_role text;
  v_ended_at timestamptz;
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if target_status not in ('active', 'inactive', 'left') then
    raise exception 'Invalid group status' using errcode = '22023';
  end if;

  select tgm.term_group_id, tgm.role, tgm.ended_at
  into v_group_id, v_role, v_ended_at
  from public.term_group_membership tgm
  where tgm.id = target_record_id
  for update;

  if not found then
    raise exception 'Group membership record not found' using errcode = 'P0002';
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

-- 9. Atomic RPC: remove group member (mark as left)
create or replace function public.remove_group_member(
  target_record_id uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.update_group_member_status(target_record_id, 'left');
end;
$$;

-- 10. Update session attendance functions with group-scoped attendance enforcement
create or replace function public.save_session_attendance(
  target_session_id uuid,
  target_member_id uuid,
  target_status text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  participant_id uuid;
  v_term_group_id uuid;
begin
  if target_status not in ('present', 'absent', 'excused') then
    raise exception 'Invalid attendance status';
  end if;

  select s.term_group_id into v_term_group_id
  from public.ministry_session s
  where s.id = target_session_id;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_term_group_id is not null then
    -- Group-scoped session: member MUST be an active open member of this group
    if not exists (
      select 1 from public.ministry_session s
      join public.ministry_membership m on m.ministry_term_id = s.ministry_term_id
      join public.term_group_membership tgm on tgm.ministry_membership_id = m.id
      where s.id = target_session_id
        and m.member_profile_id = target_member_id
        and tgm.term_group_id = v_term_group_id
        and tgm.status = 'active'
        and tgm.ended_at is null
      for key share of m
    ) then
      raise exception 'Member is not an active member of this session group';
    end if;
  else
    -- Term-wide or department session: standard term enrollment check
    if not exists (
      select 1 from public.ministry_session s
      join public.ministry_membership m on m.ministry_term_id = s.ministry_term_id
      where s.id = target_session_id
        and m.member_profile_id = target_member_id
      for key share of m
    ) then
      raise exception 'Member is not enrolled in this session term';
    end if;
  end if;

  insert into public.session_participant (ministry_session_id, member_profile_id)
  values (target_session_id, target_member_id)
  on conflict (ministry_session_id, member_profile_id)
  do update set ministry_session_id = excluded.ministry_session_id
  returning id into participant_id;

  insert into public.attendance_record (session_participant_id, status)
  values (participant_id, target_status)
  on conflict (session_participant_id)
  do update set status = excluded.status, updated_at = now();
end;
$$;

create or replace function public.save_bulk_session_attendance(
  target_session_id uuid,
  target_member_ids uuid[],
  target_status text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  valid_member_ids uuid[];
  v_term_group_id uuid;
begin
  if target_status not in ('present', 'absent', 'excused') then
    raise exception 'Invalid attendance status';
  end if;

  if target_member_ids is null or array_length(target_member_ids, 1) is null or array_length(target_member_ids, 1) = 0 then
    return;
  end if;

  select s.term_group_id into v_term_group_id
  from public.ministry_session s
  where s.id = target_session_id;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_term_group_id is not null then
    -- Group-scoped session: only aggregate active open members of this group
    select array_agg(m.member_profile_id) into valid_member_ids
    from public.ministry_session s
    join public.ministry_membership m on m.ministry_term_id = s.ministry_term_id
    join public.term_group_membership tgm on tgm.ministry_membership_id = m.id
    where s.id = target_session_id
      and m.member_profile_id = any(target_member_ids)
      and tgm.term_group_id = v_term_group_id
      and tgm.status = 'active'
      and tgm.ended_at is null;
  else
    select array_agg(m.member_profile_id) into valid_member_ids
    from public.ministry_session s
    join public.ministry_membership m on m.ministry_term_id = s.ministry_term_id
    where s.id = target_session_id
      and m.member_profile_id = any(target_member_ids);
  end if;

  if valid_member_ids is null or array_length(valid_member_ids, 1) = 0 then
    return;
  end if;

  with inserted_participants as (
    insert into public.session_participant (ministry_session_id, member_profile_id)
    select target_session_id, unnest(valid_member_ids)
    on conflict (ministry_session_id, member_profile_id)
    do update set ministry_session_id = excluded.ministry_session_id
    returning id, member_profile_id
  )
  insert into public.attendance_record (session_participant_id, status)
  select id, target_status
  from inserted_participants
  on conflict (session_participant_id)
  do update set status = excluded.status, updated_at = now();
end;
$$;

-- 11. Security grants and revokes
revoke all on function public.assign_group_member(uuid, uuid) from public, anon;
grant execute on function public.assign_group_member(uuid, uuid) to authenticated;

revoke all on function public.update_group_member_role(uuid, text) from public, anon;
grant execute on function public.update_group_member_role(uuid, text) to authenticated;

revoke all on function public.update_group_member_status(uuid, text) from public, anon;
grant execute on function public.update_group_member_status(uuid, text) to authenticated;

revoke all on function public.remove_group_member(uuid) from public, anon;
grant execute on function public.remove_group_member(uuid) to authenticated;

revoke all on function public.save_session_attendance(uuid, uuid, text) from public, anon;
grant execute on function public.save_session_attendance(uuid, uuid, text) to authenticated;

revoke all on function public.save_bulk_session_attendance(uuid, uuid[], text) from public, anon;
grant execute on function public.save_bulk_session_attendance(uuid, uuid[], text) to authenticated;
