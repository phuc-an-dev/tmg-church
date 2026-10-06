create or replace function public.portal_ministry_session_service_assignment_data(
  p_session_id uuid
) returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_session public.ministry_session%rowtype;
  v_term_name text;
  v_term_slug text;
  v_ministry_name text;
  v_ministry_slug text;
begin
  select * into v_session
  from public.ministry_session ms
  where ms.id = p_session_id
    and ms.term_department_id is null
    and ms.term_group_id is null;

  if not found or not public.has_capability(
    'ministry.operational.manage', 'ministry_term', v_session.ministry_term_id
  ) then
    return null;
  end if;

  select mt.name, mt.slug, m.name, m.slug
  into v_term_name, v_term_slug, v_ministry_name, v_ministry_slug
  from public.ministry_term mt
  join public.ministry m on m.id = mt.ministry_id
  where mt.id = v_session.ministry_term_id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'slug', v_session.slug,
      'title', v_session.title,
      'sessionDate', v_session.session_date,
      'termId', v_session.ministry_term_id,
      'termName', v_term_name,
      'ministryName', v_ministry_name,
      'scopeLabel', 'Ministry term',
      'participantCount', (select count(*) from public.session_participant where ministry_session_id = p_session_id),
      'canDelete', false
    ),
    'ministrySlug', v_ministry_slug,
    'termSlug', v_term_slug,
    'scope', 'ministry',
    'departments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', td.id,
        'name', td.name,
        'slug', td.slug,
        'accentColor', coalesce(td.accent_color, '#2563eb'),
        'iconKey', coalesce(td.icon_key, 'users'),
        'roles', coalesce((
          select jsonb_agg(jsonb_build_object('id', dsr.id, 'name', dsr.name) order by dsr.name)
          from public.department_service_role dsr
          where dsr.term_department_id = td.id
        ), '[]'::jsonb)
      ) order by td.name)
      from public.term_department td
      where td.ministry_term_id = v_session.ministry_term_id
        and public.has_capability('department.service_role.manage', 'department', td.id)
    ), '[]'::jsonb),
    'selectedRoleIds', coalesce((
      select jsonb_agg(ssr.department_service_role_id)
      from public.session_service_role ssr
      join public.department_service_role dsr on dsr.id = ssr.department_service_role_id
      join public.term_department td on td.id = dsr.term_department_id
      where ssr.ministry_session_id = p_session_id
        and public.has_capability('department.service_role.manage', 'department', td.id)
    ), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sa.id,
        'departmentServiceRoleId', dsr.id,
        'departmentServiceRoleName', dsr.name,
        'termDepartmentId', td.id,
        'termDepartmentName', td.name,
        'ministryMembershipId', mm.id,
        'memberId', mp.id,
        'memberName', mp.full_name,
        'memberSlug', mp.slug
      ) order by sa.created_at)
      from public.service_assignment sa
      join public.department_service_role dsr on dsr.id = sa.department_service_role_id
      join public.term_department td on td.id = dsr.term_department_id
      join public.ministry_membership mm on mm.id = sa.ministry_membership_id
      join public.member_profile mp on mp.id = mm.member_profile_id
      where sa.ministry_session_id = p_session_id
        and td.ministry_term_id = v_session.ministry_term_id
        and public.has_capability('department.service_role.manage', 'department', td.id)
        and mp.archived_at is null
    ), '[]'::jsonb),
    'enrolledMembers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membershipId', mm.id,
        'memberId', mp.id,
        'memberName', mp.full_name,
        'memberSlug', mp.slug,
        'gender', mp.gender,
        'departmentIds', coalesce((
          select jsonb_agg(ma.term_department_id)
          from public.ministry_assignment ma
          join public.term_department td on td.id = ma.term_department_id
          where ma.ministry_membership_id = mm.id
            and td.ministry_term_id = v_session.ministry_term_id
            and public.has_capability('department.service_role.manage', 'department', td.id)
        ), '[]'::jsonb),
        'departmentNames', coalesce((
          select jsonb_agg(td.name order by td.name)
          from public.ministry_assignment ma
          join public.term_department td on td.id = ma.term_department_id
          where ma.ministry_membership_id = mm.id
            and td.ministry_term_id = v_session.ministry_term_id
            and public.has_capability('department.service_role.manage', 'department', td.id)
        ), '[]'::jsonb)
      ) order by mp.full_name)
      from public.ministry_membership mm
      join public.member_profile mp on mp.id = mm.member_profile_id
      where mm.ministry_term_id = v_session.ministry_term_id
        and mp.archived_at is null
        and exists (
          select 1
          from public.ministry_assignment ma
          join public.term_department td on td.id = ma.term_department_id
          where ma.ministry_membership_id = mm.id
            and td.ministry_term_id = v_session.ministry_term_id
            and public.has_capability('department.service_role.manage', 'department', td.id)
        )
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.portal_ministry_session_attendance_data(
  p_session_id uuid
) returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_session public.ministry_session%rowtype;
  v_term_name text;
  v_ministry_name text;
begin
  select * into v_session
  from public.ministry_session ms
  where ms.id = p_session_id
    and ms.term_department_id is null
    and ms.term_group_id is null;

  if not found or not public.has_capability(
    'ministry.operational.manage', 'ministry_term', v_session.ministry_term_id
  ) then
    return null;
  end if;

  select mt.name, m.name
  into v_term_name, v_ministry_name
  from public.ministry_term mt
  join public.ministry m on m.id = mt.ministry_id
  where mt.id = v_session.ministry_term_id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'slug', v_session.slug,
      'title', v_session.title,
      'sessionDate', v_session.session_date,
      'termId', v_session.ministry_term_id,
      'termName', v_term_name,
      'ministryName', v_ministry_name,
      'scopeLabel', 'Ministry term',
      'participantCount', (select count(*) from public.session_participant where ministry_session_id = p_session_id),
      'canDelete', false
    ),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'memberId', mp.id,
        'fullName', mp.full_name,
        'gender', mp.gender,
        'status', ar.status,
        'group', null,
        'departments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', td.id,
            'name', td.name,
            'accentColor', coalesce(td.accent_color, '#2563eb'),
            'iconKey', coalesce(td.icon_key, 'users')
          ) order by td.name)
          from public.ministry_assignment ma
          join public.term_department td on td.id = ma.term_department_id
          where ma.ministry_membership_id = mm.id
            and td.ministry_term_id = v_session.ministry_term_id
        ), '[]'::jsonb)
      ) order by mp.full_name)
      from public.ministry_membership mm
      join public.member_profile mp on mp.id = mm.member_profile_id
      left join public.session_participant sp
        on sp.ministry_session_id = p_session_id and sp.member_profile_id = mp.id
      left join public.attendance_record ar on ar.session_participant_id = sp.id
      where mm.ministry_term_id = v_session.ministry_term_id
        and mp.archived_at is null
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.portal_save_ministry_session_attendance(
  p_session_id uuid,
  p_member_id uuid,
  p_status text
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
  perform public.save_session_attendance(p_session_id, p_member_id, p_status);
end;
$$;

create or replace function public.portal_save_bulk_ministry_session_attendance(
  p_session_id uuid,
  p_member_ids uuid[],
  p_status text
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
  perform public.save_bulk_session_attendance(p_session_id, p_member_ids, p_status);
end;
$$;

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

  insert into public.service_assignment (
    ministry_session_id, department_service_role_id, ministry_membership_id
  )
  select p_session_id, p_role_id, membership_id
  from unnest(coalesce(p_membership_ids, '{}'::uuid[])) as ids(membership_id)
  on conflict (ministry_session_id, department_service_role_id, ministry_membership_id)
  do nothing;
end;
$$;

create or replace function public.portal_remove_ministry_service_assignment(
  p_session_id uuid,
  p_assignment_id uuid
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_term_id uuid;
  v_department_id uuid;
begin
  select ms.ministry_term_id, td.id into v_term_id, v_department_id
  from public.ministry_session ms
  join public.service_assignment sa on sa.ministry_session_id = ms.id
  join public.department_service_role dsr on dsr.id = sa.department_service_role_id
  join public.term_department td on td.id = dsr.term_department_id
  where ms.id = p_session_id
    and sa.id = p_assignment_id
    and ms.term_department_id is null
    and ms.term_group_id is null;

  if v_term_id is null or not public.has_capability(
    'ministry.operational.manage', 'ministry_term', v_term_id
  ) or not public.has_capability(
    'department.service_role.manage', 'department', v_department_id
  ) then
    raise exception 'Ministry session access denied' using errcode = '42501';
  end if;

  delete from public.service_assignment where id = p_assignment_id;
end;
$$;

revoke all on function public.portal_ministry_session_service_assignment_data(uuid) from public, anon;
revoke all on function public.portal_ministry_session_attendance_data(uuid) from public, anon;
revoke all on function public.portal_save_ministry_session_attendance(uuid, uuid, text) from public, anon;
revoke all on function public.portal_save_bulk_ministry_session_attendance(uuid, uuid[], text) from public, anon;
revoke all on function public.portal_set_ministry_session_service_roles(uuid, uuid[]) from public, anon;
revoke all on function public.portal_batch_save_ministry_service_assignments(uuid, uuid, uuid[]) from public, anon;
revoke all on function public.portal_remove_ministry_service_assignment(uuid, uuid) from public, anon;
grant execute on function public.portal_ministry_session_service_assignment_data(uuid) to authenticated;
grant execute on function public.portal_ministry_session_attendance_data(uuid) to authenticated;
grant execute on function public.portal_save_ministry_session_attendance(uuid, uuid, text) to authenticated;
grant execute on function public.portal_save_bulk_ministry_session_attendance(uuid, uuid[], text) to authenticated;
grant execute on function public.portal_set_ministry_session_service_roles(uuid, uuid[]) to authenticated;
grant execute on function public.portal_batch_save_ministry_service_assignments(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.portal_remove_ministry_service_assignment(uuid, uuid) to authenticated;
