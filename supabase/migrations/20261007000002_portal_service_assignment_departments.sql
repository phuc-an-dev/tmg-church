create or replace function public.portal_set_ministry_session_service_roles(
  p_session_id uuid,
  p_role_ids uuid[]
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_term_id uuid;
begin
  select ministry_term_id into v_term_id
  from public.ministry_session
  where id = p_session_id
    and term_department_id is null
    and term_group_id is null;

  if v_term_id is null or not public.has_capability(
    'ministry.operational.manage', 'ministry_term', v_term_id
  ) then
    raise exception 'Ministry session access denied' using errcode = '42501';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_role_ids, '{}'::uuid[])) as ids(role_id)
    left join public.department_service_role dsr on dsr.id = role_id
    left join public.term_department td
      on td.id = dsr.term_department_id and td.ministry_term_id = v_term_id
    where td.id is null
      or not public.has_capability('department.service_role.manage', 'department', td.id)
  ) then
    raise exception 'Service role does not belong to this ministry term' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.service_assignment sa
    join public.department_service_role dsr on dsr.id = sa.department_service_role_id
    join public.term_department td on td.id = dsr.term_department_id
    where sa.ministry_session_id = p_session_id
      and public.has_capability('department.service_role.manage', 'department', td.id)
      and sa.department_service_role_id <> all(coalesce(p_role_ids, '{}'::uuid[]))
  ) then
    raise exception 'Remove service assignments before removing a service role' using errcode = '23503';
  end if;

  delete from public.session_service_role
  where ministry_session_id = p_session_id
    and department_service_role_id <> all(coalesce(p_role_ids, '{}'::uuid[]))
    and exists (
      select 1
      from public.department_service_role dsr
      join public.term_department td on td.id = dsr.term_department_id
      where dsr.id = session_service_role.department_service_role_id
        and public.has_capability('department.service_role.manage', 'department', td.id)
    );

  insert into public.session_service_department (ministry_session_id, term_department_id)
  select distinct p_session_id, dsr.term_department_id
  from public.department_service_role dsr
  where dsr.id = any(coalesce(p_role_ids, '{}'::uuid[]))
  on conflict (ministry_session_id, term_department_id) do nothing;

  insert into public.session_service_role (ministry_session_id, department_service_role_id)
  select p_session_id, role_id
  from unnest(coalesce(p_role_ids, '{}'::uuid[])) as ids(role_id)
  on conflict (ministry_session_id, department_service_role_id) do nothing;
end;
$$;

create or replace function public.portal_batch_save_ministry_service_assignments(
  p_session_id uuid,
  p_role_id uuid,
  p_membership_ids uuid[]
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_term_id uuid;
  v_role_term_id uuid;
  v_department_id uuid;
begin
  select ministry_term_id into v_term_id
  from public.ministry_session
  where id = p_session_id
    and term_department_id is null
    and term_group_id is null;
  select td.ministry_term_id, td.id into v_role_term_id, v_department_id
  from public.department_service_role dsr
  join public.term_department td on td.id = dsr.term_department_id
  where dsr.id = p_role_id;

  if v_term_id is null or not public.has_capability(
    'ministry.operational.manage', 'ministry_term', v_term_id
  ) then
    raise exception 'Ministry session access denied' using errcode = '42501';
  end if;
  if v_role_term_id is null or v_role_term_id <> v_term_id
    or not public.has_capability('department.service_role.manage', 'department', v_department_id)
    or not exists (
      select 1 from public.session_service_role
      where ministry_session_id = p_session_id
        and department_service_role_id = p_role_id
    ) then
    raise exception 'Service role is not enabled for this session' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_membership_ids, '{}'::uuid[])) as ids(membership_id)
    left join public.ministry_membership mm
      on mm.id = membership_id and mm.ministry_term_id = v_term_id
    where mm.id is null or not exists (
      select 1 from public.ministry_assignment ma
      where ma.ministry_membership_id = mm.id
        and ma.term_department_id = v_department_id
    )
  ) then
    raise exception 'Member is not assigned to the service role department' using errcode = '22023';
  end if;

  insert into public.session_service_department (ministry_session_id, term_department_id)
  values (p_session_id, v_department_id)
  on conflict (ministry_session_id, term_department_id) do nothing;

  insert into public.service_assignment (
    ministry_session_id, department_service_role_id, ministry_membership_id
  )
  select p_session_id, p_role_id, membership_id
  from unnest(coalesce(p_membership_ids, '{}'::uuid[])) as ids(membership_id)
  on conflict (ministry_session_id, department_service_role_id, ministry_membership_id)
  do nothing;
end;
$$;

notify pgrst, 'reload schema';
