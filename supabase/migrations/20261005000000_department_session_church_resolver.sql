create or replace function public.portal_department_church_id(
  p_department_id uuid,
  p_ministry_term_id uuid
)
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_church_id uuid;
begin
  if not public.has_capability(
    'department.session.manage', 'department', p_department_id
  ) then
    return null;
  end if;

  select m.church_id into v_church_id
  from public.term_department td
  join public.ministry_term mt on mt.id = td.ministry_term_id
  join public.ministry m on m.id = mt.ministry_id
  where td.id = p_department_id
    and mt.id = p_ministry_term_id;

  return v_church_id;
end;
$$;

revoke all on function public.portal_department_church_id(uuid, uuid)
  from public, anon;
grant execute on function public.portal_department_church_id(uuid, uuid)
  to authenticated;
