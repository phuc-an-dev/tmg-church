create function public.portal_ministry_session_roster(p_term_id uuid)
returns table (session_id uuid, role_id uuid, role_name text, member_names text[])
language sql stable security definer set search_path = ''
as $$
  select ms.id, dsr.id, dsr.name,
    coalesce(array_agg(distinct mp.full_name order by mp.full_name)
      filter (where mp.full_name is not null), '{}'::text[])
  from public.ministry_session ms
  join public.session_service_role ssr on ssr.ministry_session_id = ms.id
  join public.department_service_role dsr on dsr.id = ssr.department_service_role_id
  join public.term_department td on td.id = dsr.term_department_id
    and td.ministry_term_id = ms.ministry_term_id
  left join public.service_assignment sa on sa.ministry_session_id = ms.id
    and sa.department_service_role_id = dsr.id
  left join public.ministry_membership mm on mm.id = sa.ministry_membership_id
    and mm.ministry_term_id = ms.ministry_term_id
  left join public.member_profile mp on mp.id = mm.member_profile_id
    and mp.archived_at is null
  where ms.ministry_term_id = p_term_id
    and ms.term_department_id is null and ms.term_group_id is null
    and public.has_capability('ministry.operational.manage', 'ministry_term', p_term_id)
    and public.has_capability('department.service_role.manage', 'department', td.id)
  group by ms.id, dsr.id, dsr.name
  order by dsr.name;
$$;

revoke all on function public.portal_ministry_session_roster(uuid) from public, anon;
grant execute on function public.portal_ministry_session_roster(uuid) to authenticated;
notify pgrst, 'reload schema';
