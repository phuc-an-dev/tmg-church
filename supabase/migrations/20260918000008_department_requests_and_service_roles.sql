-- Milestone C: Department join requests and service-role assignment.

create table if not exists public.department_join_request (
  id uuid primary key default gen_random_uuid(),
  term_department_id uuid not null references public.term_department(id) on delete cascade,
  ministry_membership_id uuid not null references public.ministry_membership(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.member_profile(id) on delete set null
);
create unique index if not exists department_join_request_pending_idx
  on public.department_join_request (term_department_id, ministry_membership_id)
  where status = 'pending';
create index if not exists department_join_request_department_idx
  on public.department_join_request (term_department_id, created_at desc);
alter table public.department_join_request enable row level security;
revoke all on public.department_join_request from public, anon;
grant select on public.department_join_request to authenticated;

create policy "Scoped department request reads" on public.department_join_request for select to authenticated
using (
  exists (
    select 1 from public.ministry_membership mm
    where mm.id = ministry_membership_id
      and mm.member_profile_id = public.authorization_current_member_profile_id()
  )
  or public.has_capability('department.read', 'department', term_department_id)
);
create policy "Enrolled members submit department requests" on public.department_join_request for insert to authenticated
with check (
  status = 'pending'
  and exists (
    select 1 from public.ministry_membership mm
    join public.term_department td on td.ministry_term_id = mm.ministry_term_id
    where mm.id = ministry_membership_id
      and td.id = term_department_id
      and mm.member_profile_id = public.authorization_current_member_profile_id()
      and public.authorization_term_lifecycle(mm.ministry_term_id) = 'active'
  )
);

create or replace function public.portal_submit_department_request(p_department_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_membership_id uuid; v_term_id uuid; v_request_id uuid;
begin
  select mm.id, mm.ministry_term_id into v_membership_id, v_term_id
  from public.ministry_membership mm
  where mm.member_profile_id = public.authorization_current_member_profile_id()
    and exists (select 1 from public.term_department td where td.id = p_department_id and td.ministry_term_id = mm.ministry_term_id)
  order by mm.created_at desc limit 1;
  if v_membership_id is null or public.authorization_term_lifecycle(v_term_id) <> 'active' then raise exception 'Department requests require active term enrollment' using errcode = '42501'; end if;
  if exists (select 1 from public.ministry_assignment where ministry_membership_id = v_membership_id and term_department_id = p_department_id) then raise exception 'Member is already assigned to this department' using errcode = '23505'; end if;
  insert into public.department_join_request (term_department_id, ministry_membership_id)
  values (p_department_id, v_membership_id) returning id into v_request_id;
  return v_request_id;
exception when unique_violation then
  raise exception 'A pending request already exists' using errcode = '23505';
end;
$$;

create or replace function public.portal_withdraw_department_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.department_join_request r
  set status = 'withdrawn', updated_at = now()
  where r.id = p_request_id and r.status = 'pending'
    and exists (select 1 from public.ministry_membership mm where mm.id = r.ministry_membership_id and mm.member_profile_id = public.authorization_current_member_profile_id());
  if not found then raise exception 'Request not found or cannot be withdrawn' using errcode = '42501'; end if;
end;
$$;

create or replace function public.portal_decide_department_request(
  p_request_id uuid, p_decision text, p_rejection_reason text default null
) returns void language plpgsql security definer set search_path = public
as $$
declare v_department_id uuid; v_membership_id uuid; v_status text;
begin
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid request decision' using errcode = '22023'; end if;
  select term_department_id, ministry_membership_id, status into v_department_id, v_membership_id, v_status from public.department_join_request where id = p_request_id for update;
  if v_department_id is null or v_status <> 'pending' or not public.has_capability('department.members.manage', 'department', v_department_id) then raise exception 'Department request access denied' using errcode = '42501'; end if;
  if p_decision = 'approved' then
    insert into public.ministry_assignment (ministry_membership_id, term_department_id) values (v_membership_id, v_department_id) on conflict do nothing;
  end if;
  update public.department_join_request set status = p_decision, rejection_reason = case when p_decision = 'rejected' then coalesce(nullif(trim(p_rejection_reason), ''), 'Rejected by Department Head') else null end, updated_at = now(), decided_at = now(), decided_by = public.authorization_current_member_profile_id() where id = p_request_id;
end;
$$;

revoke all on function public.portal_submit_department_request(uuid) from public, anon;
grant execute on function public.portal_submit_department_request(uuid) to authenticated;
revoke all on function public.portal_withdraw_department_request(uuid) from public, anon;
grant execute on function public.portal_withdraw_department_request(uuid) to authenticated;
revoke all on function public.portal_decide_department_request(uuid, text, text) from public, anon;
grant execute on function public.portal_decide_department_request(uuid, text, text) to authenticated;

drop policy if exists "System admins access service roles" on public.department_service_role;
create policy "Scoped service role reads" on public.department_service_role for select to authenticated
using (public.has_capability('department.read', 'department', term_department_id));
create policy "Scoped service role inserts" on public.department_service_role for insert to authenticated
with check (public.has_capability('department.service_role.manage', 'department', term_department_id));
create policy "Scoped service role updates" on public.department_service_role for update to authenticated
using (public.has_capability('department.service_role.manage', 'department', term_department_id))
with check (public.has_capability('department.service_role.manage', 'department', term_department_id));
create policy "Scoped service role deletes" on public.department_service_role for delete to authenticated
using (public.has_capability('department.service_role.manage', 'department', term_department_id));

drop policy if exists "System admins access service assignments" on public.service_assignment;
create policy "Scoped service assignment reads" on public.service_assignment for select to authenticated
using (exists (select 1 from public.department_service_role dsr where dsr.id = department_service_role_id and public.has_capability('department.read', 'department', dsr.term_department_id)));
create policy "Scoped service assignment inserts" on public.service_assignment for insert to authenticated
with check (exists (select 1 from public.department_service_role dsr where dsr.id = department_service_role_id and public.has_capability('department.service_role.manage', 'department', dsr.term_department_id)));
create policy "Scoped service assignment deletes" on public.service_assignment for delete to authenticated
using (exists (select 1 from public.department_service_role dsr where dsr.id = department_service_role_id and public.has_capability('department.service_role.manage', 'department', dsr.term_department_id)));

create or replace function public.portal_save_department_service_role(p_department_id uuid, p_role_id uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not public.has_capability('department.service_role.manage', 'department', p_department_id) then raise exception 'Service role access denied' using errcode = '42501'; end if;
  if p_role_id is null then
    insert into public.department_service_role (term_department_id, name) values (p_department_id, trim(p_name)) returning id into v_id;
  else
    update public.department_service_role set name = trim(p_name) where id = p_role_id and term_department_id = p_department_id returning id into v_id;
  end if;
  if v_id is null then raise exception 'Service role not found' using errcode = 'P0002'; end if;
  return v_id;
end;
$$;

create or replace function public.portal_delete_department_service_role(p_role_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_department_id uuid;
begin
  select term_department_id into v_department_id from public.department_service_role where id = p_role_id;
  if v_department_id is null or not public.has_capability('department.service_role.manage', 'department', v_department_id) then raise exception 'Service role access denied' using errcode = '42501'; end if;
  if exists (select 1 from public.service_assignment where department_service_role_id = p_role_id) then raise exception 'Service role has session assignments' using errcode = '23503'; end if;
  delete from public.department_service_role where id = p_role_id;
end;
$$;

create or replace function public.portal_save_service_assignment(p_session_id uuid, p_role_id uuid, p_membership_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_department_id uuid; v_session_department uuid; v_session_term uuid; v_role_term uuid; v_membership_term uuid; v_id uuid;
begin
  select term_department_id, td.ministry_term_id into v_department_id, v_role_term from public.department_service_role dsr join public.term_department td on td.id = dsr.term_department_id where dsr.id = p_role_id;
  select ministry_term_id into v_session_term from public.ministry_session where id = p_session_id;
  select term_department_id into v_session_department from public.ministry_session where id = p_session_id;
  select ministry_term_id into v_membership_term from public.ministry_membership where id = p_membership_id;
  if v_department_id is null or v_session_department is null or not public.has_capability('department.service_role.manage', 'department', v_department_id) or v_role_term <> v_session_term or v_role_term <> v_membership_term or v_session_department <> v_department_id then raise exception 'Service assignment access denied' using errcode = '42501'; end if;
  if not exists (select 1 from public.ministry_assignment where ministry_membership_id = p_membership_id and term_department_id = v_department_id) then raise exception 'Member is not assigned to this department' using errcode = '22023'; end if;
  insert into public.service_assignment (department_service_role_id, ministry_session_id, ministry_membership_id) values (p_role_id, p_session_id, p_membership_id) on conflict (ministry_session_id, department_service_role_id, ministry_membership_id) do update set created_at = public.service_assignment.created_at returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.portal_remove_service_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_department_id uuid;
begin
  select dsr.term_department_id into v_department_id from public.service_assignment sa join public.department_service_role dsr on dsr.id = sa.department_service_role_id where sa.id = p_assignment_id;
  if v_department_id is null or not public.has_capability('department.service_role.manage', 'department', v_department_id) then raise exception 'Service assignment access denied' using errcode = '42501'; end if;
  delete from public.service_assignment where id = p_assignment_id;
end;
$$;

revoke all on function public.portal_save_department_service_role(uuid, uuid, text) from public, anon;
grant execute on function public.portal_save_department_service_role(uuid, uuid, text) to authenticated;
revoke all on function public.portal_delete_department_service_role(uuid) from public, anon;
grant execute on function public.portal_delete_department_service_role(uuid) to authenticated;
revoke all on function public.portal_save_service_assignment(uuid, uuid, uuid) from public, anon;
grant execute on function public.portal_save_service_assignment(uuid, uuid, uuid) to authenticated;
revoke all on function public.portal_remove_service_assignment(uuid) from public, anon;
grant execute on function public.portal_remove_service_assignment(uuid) to authenticated;

create or replace view public.portal_department_service_directory with (security_barrier = true) as
select td.id as department_id, td.name as department_name, td.slug as department_slug, td.ministry_term_id,
  mt.slug as term_slug, m.slug as ministry_slug, dsr.id as role_id, dsr.name as role_name
from public.term_department td
join public.ministry_term mt on mt.id = td.ministry_term_id
join public.ministry m on m.id = mt.ministry_id
left join public.department_service_role dsr on dsr.term_department_id = td.id
where public.has_capability('department.service_role.manage', 'department', td.id);

create or replace view public.portal_department_service_assignment_directory with (security_barrier = true) as
select td.id as department_id, ms.id as session_id, ms.slug as session_slug, ms.title as session_title, ms.session_date,
  dsr.id as role_id, dsr.name as role_name, sa.id as assignment_id, mm.id as membership_id, mp.full_name
from public.term_department td
join public.ministry_session ms on ms.term_department_id = td.id
join public.department_service_role dsr on dsr.term_department_id = td.id
left join public.service_assignment sa on sa.ministry_session_id = ms.id and sa.department_service_role_id = dsr.id
left join public.ministry_membership mm on mm.id = sa.ministry_membership_id
left join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
where public.has_capability('department.service_role.manage', 'department', td.id);

revoke all on public.portal_department_service_directory from public, anon;
grant select on public.portal_department_service_directory to authenticated;
revoke all on public.portal_department_service_assignment_directory from public, anon;
grant select on public.portal_department_service_assignment_directory to authenticated;

create or replace view public.portal_department_request_directory with (security_barrier = true) as
select td.id as department_id, td.name as department_name, td.slug as department_slug,
  td.ministry_term_id, mt.slug as term_slug, m.slug as ministry_slug,
  r.id as request_id, r.status, r.rejection_reason, r.created_at,
  mm.member_profile_id as requester_member_id, mp.full_name as requester_name
from public.term_department td
join public.ministry_term mt on mt.id = td.ministry_term_id
join public.ministry m on m.id = mt.ministry_id
left join public.department_join_request r on r.term_department_id = td.id
left join public.ministry_membership mm on mm.id = r.ministry_membership_id
left join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
where mm.member_profile_id = public.authorization_current_member_profile_id()
or public.has_capability('department.read', 'department', td.id);

create or replace view public.portal_department_session_directory with (security_barrier = true) as
select td.id as department_id, ms.id as session_id, ms.slug as session_slug,
  ms.title as session_title, ms.session_date
from public.term_department td
join public.ministry_session ms on ms.term_department_id = td.id
where public.has_capability('department.service_role.manage', 'department', td.id);

revoke all on public.portal_department_request_directory from public, anon;
grant select on public.portal_department_request_directory to authenticated;
revoke all on public.portal_department_session_directory from public, anon;
grant select on public.portal_department_session_directory to authenticated;

create or replace view public.portal_department_request_targets with (security_barrier = true) as
select td.id as department_id, td.name as department_name, td.slug as department_slug,
  td.ministry_term_id, mt.slug as term_slug, m.slug as ministry_slug
from public.term_department td
join public.ministry_term mt on mt.id = td.ministry_term_id
join public.ministry m on m.id = mt.ministry_id
where exists (
  select 1 from public.ministry_membership mm
  where mm.ministry_term_id = td.ministry_term_id
    and mm.member_profile_id = public.authorization_current_member_profile_id()
);

revoke all on public.portal_department_request_targets from public, anon;
grant select on public.portal_department_request_targets to authenticated;
