-- Keep membership enrollment and removal consistent across related tables.
create or replace function public.enroll_member_with_assignments(
  enrollment_member_id uuid,
  enrollment_term_id uuid,
  enrollment_group_id uuid,
  enrollment_department_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  enrollment_membership_id uuid;
  valid_department_count integer;
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if enrollment_group_id is not null and not exists (
    select 1 from public.term_group
    where id = enrollment_group_id and ministry_term_id = enrollment_term_id
  ) then
    raise exception 'Selected group does not belong to this ministry term' using errcode = '22023';
  end if;

  if cardinality(enrollment_department_ids) is distinct from (
    select count(distinct department_id)
    from unnest(coalesce(enrollment_department_ids, '{}'::uuid[])) as department_id
  ) then
    raise exception 'Duplicate department IDs are not allowed' using errcode = '22023';
  end if;

  select count(*) into valid_department_count
  from public.term_department
  where id = any(coalesce(enrollment_department_ids, '{}'::uuid[]))
    and ministry_term_id = enrollment_term_id;

  if valid_department_count <> cardinality(coalesce(enrollment_department_ids, '{}'::uuid[])) then
    raise exception 'A selected department does not belong to this ministry term' using errcode = '22023';
  end if;

  insert into public.ministry_membership (member_profile_id, ministry_term_id)
  values (enrollment_member_id, enrollment_term_id)
  returning id into enrollment_membership_id;

  if enrollment_group_id is not null then
    insert into public.term_group_membership (ministry_membership_id, term_group_id)
    values (enrollment_membership_id, enrollment_group_id);
  end if;

  insert into public.ministry_assignment (ministry_membership_id, term_department_id)
  select enrollment_membership_id, department_id
  from unnest(coalesce(enrollment_department_ids, '{}'::uuid[])) as department_id;

  return enrollment_membership_id;
end;
$$;

create or replace function public.remove_ministry_membership_with_assignments(
  removal_membership_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  delete from public.term_group_membership
  where ministry_membership_id = removal_membership_id;

  delete from public.ministry_assignment
  where ministry_membership_id = removal_membership_id;

  delete from public.ministry_membership
  where id = removal_membership_id;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.enroll_member_with_assignments(uuid, uuid, uuid, uuid[]) from public;
revoke all on function public.enroll_member_with_assignments(uuid, uuid, uuid, uuid[]) from anon;
grant execute on function public.enroll_member_with_assignments(uuid, uuid, uuid, uuid[]) to authenticated;
revoke all on function public.remove_ministry_membership_with_assignments(uuid) from public;
revoke all on function public.remove_ministry_membership_with_assignments(uuid) from anon;
grant execute on function public.remove_ministry_membership_with_assignments(uuid) to authenticated;
