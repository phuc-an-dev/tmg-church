-- Atomically replace a membership's department assignments from the shared picker.
create or replace function public.set_ministry_assignments(
  assignment_membership_id uuid,
  assignment_department_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  membership_term_id uuid;
  selected_department_count integer;
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select ministry_term_id into membership_term_id
  from public.ministry_membership
  where id = assignment_membership_id;

  if membership_term_id is null then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;

  if cardinality(assignment_department_ids) is distinct from (
    select count(distinct department_id)
    from unnest(coalesce(assignment_department_ids, '{}'::uuid[])) as department_id
  ) then
    raise exception 'Duplicate department IDs are not allowed' using errcode = '22023';
  end if;

  select count(*) into selected_department_count
  from public.term_department
  where id = any(coalesce(assignment_department_ids, '{}'::uuid[]))
    and ministry_term_id = membership_term_id;

  if selected_department_count <> cardinality(coalesce(assignment_department_ids, '{}'::uuid[])) then
    raise exception 'A selected department does not belong to this ministry term' using errcode = '22023';
  end if;

  delete from public.ministry_assignment
  where ministry_membership_id = assignment_membership_id
    and not (term_department_id = any(coalesce(assignment_department_ids, '{}'::uuid[])));

  insert into public.ministry_assignment (ministry_membership_id, term_department_id)
  select assignment_membership_id, department_id
  from unnest(coalesce(assignment_department_ids, '{}'::uuid[])) as department_id
  on conflict (ministry_membership_id, term_department_id) do nothing;
end;
$$;

revoke all on function public.set_ministry_assignments(uuid, uuid[]) from public;
revoke all on function public.set_ministry_assignments(uuid, uuid[]) from anon;
grant execute on function public.set_ministry_assignments(uuid, uuid[]) to authenticated;
