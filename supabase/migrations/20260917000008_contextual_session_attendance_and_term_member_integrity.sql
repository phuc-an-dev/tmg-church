-- Department-scoped Sessions admit only members currently assigned to that
-- Department. Existing session participants are intentionally not removed when
-- an assignment later changes, preserving attendance history.
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
  v_term_department_id uuid;
begin
  if target_status not in ('present', 'absent', 'excused') then
    raise exception 'Invalid attendance status';
  end if;

  select s.term_group_id, s.term_department_id
    into v_term_group_id, v_term_department_id
  from public.ministry_session s
  where s.id = target_session_id;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_term_group_id is not null then
    if not exists (
      select 1
      from public.ministry_session s
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
  elsif v_term_department_id is not null then
    if not exists (
      select 1
      from public.ministry_session s
      join public.ministry_membership m on m.ministry_term_id = s.ministry_term_id
      join public.ministry_assignment ma on ma.ministry_membership_id = m.id
      where s.id = target_session_id
        and m.member_profile_id = target_member_id
        and ma.term_department_id = v_term_department_id
      for key share of m
    ) then
      raise exception 'Member is not currently assigned to this session department';
    end if;
  elsif not exists (
    select 1
    from public.ministry_session s
    join public.ministry_membership m on m.ministry_term_id = s.ministry_term_id
    where s.id = target_session_id
      and m.member_profile_id = target_member_id
    for key share of m
  ) then
    raise exception 'Member is not enrolled in this session term';
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
  v_term_department_id uuid;
begin
  if target_status not in ('present', 'absent', 'excused') then
    raise exception 'Invalid attendance status';
  end if;
  if target_member_ids is null or coalesce(array_length(target_member_ids, 1), 0) = 0 then
    return;
  end if;

  select s.term_group_id, s.term_department_id
    into v_term_group_id, v_term_department_id
  from public.ministry_session s
  where s.id = target_session_id;
  if not found then
    raise exception 'Session not found';
  end if;

  select array_agg(m.member_profile_id) into valid_member_ids
  from public.ministry_session s
  join public.ministry_membership m on m.ministry_term_id = s.ministry_term_id
  where s.id = target_session_id
    and m.member_profile_id = any(target_member_ids)
    and (
      (v_term_group_id is null and v_term_department_id is null)
      or (v_term_group_id is not null and exists (
        select 1 from public.term_group_membership tgm
        where tgm.ministry_membership_id = m.id
          and tgm.term_group_id = v_term_group_id
          and tgm.status = 'active'
          and tgm.ended_at is null
      ))
      or (v_term_department_id is not null and exists (
        select 1 from public.ministry_assignment ma
        where ma.ministry_membership_id = m.id
          and ma.term_department_id = v_term_department_id
      ))
    );

  if coalesce(array_length(valid_member_ids, 1), 0) = 0 then
    return;
  end if;

  with inserted_participants as (
    insert into public.session_participant (ministry_session_id, member_profile_id)
    select target_session_id, unnest(valid_member_ids)
    on conflict (ministry_session_id, member_profile_id)
    do update set ministry_session_id = excluded.ministry_session_id
    returning id
  )
  insert into public.attendance_record (session_participant_id, status)
  select id, target_status from inserted_participants
  on conflict (session_participant_id)
  do update set status = excluded.status, updated_at = now();
end;
$$;

revoke all on function public.save_session_attendance(uuid, uuid, text) from public, anon;
grant execute on function public.save_session_attendance(uuid, uuid, text) to authenticated;
revoke all on function public.save_bulk_session_attendance(uuid, uuid[], text) from public, anon;
grant execute on function public.save_bulk_session_attendance(uuid, uuid[], text) to authenticated;

-- Term membership removal is deliberately conservative. A Group, Department,
-- or Session participant record is historical evidence and must not be removed
-- as a side effect of removing the term membership.
create or replace function public.remove_ministry_membership_with_assignments(
  removal_membership_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_term_id uuid;
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select member_profile_id, ministry_term_id
    into v_member_id, v_term_id
  from public.ministry_membership
  where id = removal_membership_id;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.term_group_membership
    where ministry_membership_id = removal_membership_id
  ) or exists (
    select 1 from public.ministry_assignment
    where ministry_membership_id = removal_membership_id
  ) or exists (
    select 1
    from public.session_participant participant
    join public.ministry_session session
      on session.id = participant.ministry_session_id
    where participant.member_profile_id = v_member_id
      and session.ministry_term_id = v_term_id
  ) then
    raise exception 'Membership has Group, Department, or Session history'
      using errcode = '23503';
  end if;

  delete from public.ministry_membership
  where id = removal_membership_id;
end;
$$;

revoke all on function public.remove_ministry_membership_with_assignments(uuid) from public, anon;
grant execute on function public.remove_ministry_membership_with_assignments(uuid) to authenticated;
