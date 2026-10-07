create function public.portal_save_department_attendance(
  p_session_id uuid,
  p_member_ids uuid[],
  p_status text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department_id uuid;
  v_term_id uuid;
begin
  select ms.term_department_id, ms.ministry_term_id
    into v_department_id, v_term_id
  from public.ministry_session ms
  where ms.id = p_session_id and ms.term_group_id is null;

  if v_department_id is null
    or not public.has_capability('department.session.manage', 'department', v_department_id) then
    raise exception 'Department attendance access denied' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('present', 'absent', 'excused')
    or p_member_ids is null or cardinality(p_member_ids) = 0 then
    raise exception 'Invalid attendance request' using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_member_ids) as requested(member_id)
    where not exists (
      select 1 from public.ministry_membership mm
      join public.ministry_assignment ma on ma.ministry_membership_id = mm.id
      join public.member_profile mp on mp.id = mm.member_profile_id
      where mm.ministry_term_id = v_term_id
        and mm.member_profile_id = requested.member_id
        and ma.term_department_id = v_department_id
        and mp.archived_at is null
    )
  ) then
    raise exception 'Member is not assigned to this department' using errcode = '42501';
  end if;

  perform public.save_bulk_session_attendance(p_session_id, p_member_ids, p_status);
end;
$$;

revoke all on function public.portal_save_department_attendance(uuid, uuid[], text) from public, anon;
grant execute on function public.portal_save_department_attendance(uuid, uuid[], text) to authenticated;

notify pgrst, 'reload schema';
