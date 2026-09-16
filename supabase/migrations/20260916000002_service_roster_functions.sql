-- Transactional Postgres functions for service assignments.
-- Enforces Church and Ministry Term scoping and respects table invariants.

create or replace function public.save_service_assignment(
  target_session_id uuid,
  target_roster_id uuid,
  target_role_id uuid,
  target_membership_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_term_id uuid;
  v_roster_dept_id uuid;
  v_roster_term_id uuid;
  v_role_dept_id uuid;
  v_membership_term_id uuid;
  v_inserted_id uuid;
begin
  -- 1. Validate session
  select ministry_term_id into v_session_term_id
  from public.ministry_session
  where id = target_session_id;

  if v_session_term_id is null then
    raise exception 'Session was not found';
  end if;

  -- 2. Validate roster
  select sr.term_department_id, td.ministry_term_id
  into v_roster_dept_id, v_roster_term_id
  from public.service_roster sr
  join public.term_department td on td.id = sr.term_department_id
  where sr.id = target_roster_id;

  if v_roster_dept_id is null or v_roster_term_id <> v_session_term_id then
    raise exception 'Service roster does not belong to the session ministry term';
  end if;

  -- 3. Validate role belongs to the same department
  select term_department_id into v_role_dept_id
  from public.department_service_role
  where id = target_role_id;

  if v_role_dept_id is null or v_role_dept_id <> v_roster_dept_id then
    raise exception 'Service role must belong to the same department as the roster';
  end if;

  -- 4. Validate membership belongs to the session term
  select ministry_term_id into v_membership_term_id
  from public.ministry_membership
  where id = target_membership_id;

  if v_membership_term_id is null or v_membership_term_id <> v_session_term_id then
    raise exception 'Member is not enrolled in this session ministry term';
  end if;

  -- 5. Insert with duplicate preservation
  insert into public.service_assignment (
    service_roster_id,
    department_service_role_id,
    ministry_session_id,
    ministry_membership_id
  ) values (
    target_roster_id,
    target_role_id,
    target_session_id,
    target_membership_id
  )
  on conflict (
    service_roster_id,
    department_service_role_id,
    ministry_session_id,
    ministry_membership_id
  ) do update set ministry_session_id = excluded.ministry_session_id
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

revoke execute on function public.save_service_assignment(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.save_service_assignment(uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.batch_save_service_assignments(
  target_session_id uuid,
  target_roster_id uuid,
  target_role_id uuid,
  target_membership_ids uuid[]
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_term_id uuid;
  v_roster_dept_id uuid;
  v_roster_term_id uuid;
  v_role_dept_id uuid;
  v_valid_membership_ids uuid[];
  v_inserted_count integer := 0;
begin
  if target_membership_ids is null or array_length(target_membership_ids, 1) is null or array_length(target_membership_ids, 1) = 0 then
    return 0;
  end if;

  -- 1. Validate session
  select ministry_term_id into v_session_term_id
  from public.ministry_session
  where id = target_session_id;

  if v_session_term_id is null then
    raise exception 'Session was not found';
  end if;

  -- 2. Validate roster
  select sr.term_department_id, td.ministry_term_id
  into v_roster_dept_id, v_roster_term_id
  from public.service_roster sr
  join public.term_department td on td.id = sr.term_department_id
  where sr.id = target_roster_id;

  if v_roster_dept_id is null or v_roster_term_id <> v_session_term_id then
    raise exception 'Service roster does not belong to the session ministry term';
  end if;

  -- 3. Validate role
  select term_department_id into v_role_dept_id
  from public.department_service_role
  where id = target_role_id;

  if v_role_dept_id is null or v_role_dept_id <> v_roster_dept_id then
    raise exception 'Service role must belong to the same department as the roster';
  end if;

  -- 4. Filter valid enrolled memberships
  select array_agg(m.id) into v_valid_membership_ids
  from public.ministry_membership m
  where m.ministry_term_id = v_session_term_id
    and m.id = any(target_membership_ids);

  if v_valid_membership_ids is null or array_length(v_valid_membership_ids, 1) = 0 then
    return 0;
  end if;

  -- 5. Batch insert
  with inserted as (
    insert into public.service_assignment (
      service_roster_id,
      department_service_role_id,
      ministry_session_id,
      ministry_membership_id
    )
    select
      target_roster_id,
      target_role_id,
      target_session_id,
      unnest(v_valid_membership_ids)
    on conflict (
      service_roster_id,
      department_service_role_id,
      ministry_session_id,
      ministry_membership_id
    ) do nothing
    returning id
  )
  select count(*) into v_inserted_count from inserted;

  return v_inserted_count;
end;
$$;

revoke execute on function public.batch_save_service_assignments(uuid, uuid, uuid, uuid[]) from public, anon;
grant execute on function public.batch_save_service_assignments(uuid, uuid, uuid, uuid[]) to authenticated;

create or replace function public.remove_service_assignment(
  target_assignment_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.service_assignment
  where id = target_assignment_id;
end;
$$;

revoke execute on function public.remove_service_assignment(uuid) from public, anon;
grant execute on function public.remove_service_assignment(uuid) to authenticated;
