-- Milestone C: scoped Department member management for authorized Department Heads.

drop policy if exists "System admins access department assignments" on public.ministry_assignment;
create policy "Scoped department assignment reads" on public.ministry_assignment for select to authenticated
using (public.has_capability('term.read_history', 'department', term_department_id));
create policy "Scoped department assignment inserts" on public.ministry_assignment for insert to authenticated
with check (public.has_capability('department.members.manage', 'department', term_department_id));
create policy "Scoped department assignment updates" on public.ministry_assignment for update to authenticated
using (public.has_capability('department.members.manage', 'department', term_department_id))
with check (public.has_capability('department.members.manage', 'department', term_department_id));
create policy "Scoped department assignment deletes" on public.ministry_assignment for delete to authenticated
using (public.has_capability('department.members.manage', 'department', term_department_id));

create or replace function public.portal_assign_department_member(
  p_department_id uuid,
  p_membership_id uuid
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_department_term uuid;
  v_member_term uuid;
  v_record uuid;
begin
  if not public.has_capability('department.members.manage', 'department', p_department_id) then
    raise exception 'Department membership access denied' using errcode = '42501';
  end if;
  select ministry_term_id into v_department_term from public.term_department where id = p_department_id;
  select ministry_term_id into v_member_term from public.ministry_membership where id = p_membership_id;
  if v_department_term is null or v_member_term is null or v_department_term <> v_member_term then
    raise exception 'Member and department must belong to the same term' using errcode = '22023';
  end if;
  insert into public.ministry_assignment (ministry_membership_id, term_department_id)
  values (p_membership_id, p_department_id)
  returning id into v_record;
  return v_record;
exception
  when unique_violation then
    raise exception 'Member is already assigned to this department' using errcode = '23505';
end;
$$;

create or replace function public.portal_remove_department_member(p_assignment_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_department_id uuid;
begin
  select term_department_id into v_department_id from public.ministry_assignment where id = p_assignment_id;
  if v_department_id is null or not public.has_capability('department.members.manage', 'department', v_department_id) then
    raise exception 'Department membership access denied' using errcode = '42501';
  end if;
  delete from public.ministry_assignment where id = p_assignment_id;
end;
$$;

revoke all on function public.portal_assign_department_member(uuid, uuid) from public, anon;
grant execute on function public.portal_assign_department_member(uuid, uuid) to authenticated;
revoke all on function public.portal_remove_department_member(uuid) from public, anon;
grant execute on function public.portal_remove_department_member(uuid) to authenticated;

create or replace view public.portal_department_directory with (security_barrier = true) as
select td.id,
  td.name,
  td.slug,
  td.ministry_term_id,
  mt.slug as term_slug,
  m.slug as ministry_slug
from public.term_department td
join public.ministry_term mt on mt.id = td.ministry_term_id
join public.ministry m on m.id = mt.ministry_id
where public.has_capability('department.members.manage', 'department', td.id);

create or replace view public.portal_department_member_directory with (security_barrier = true) as
select td.id as department_id,
  td.name as department_name,
  mm.id as membership_id,
  mp.id as member_id,
  mp.full_name,
  ma.id as assignment_id
from public.term_department td
join public.ministry_membership mm on mm.ministry_term_id = td.ministry_term_id
join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
left join public.ministry_assignment ma
  on ma.ministry_membership_id = mm.id and ma.term_department_id = td.id
where public.has_capability('department.members.manage', 'department', td.id);

revoke all on public.portal_department_directory from public, anon;
grant select on public.portal_department_directory to authenticated;
revoke all on public.portal_department_member_directory from public, anon;
grant select on public.portal_department_member_directory to authenticated;
