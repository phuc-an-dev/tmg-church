-- Restore prerequisites missing from production despite recorded migration history.
-- Reuse the original definitions only when their schema objects are absent.

do $repair$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'term_department' and column_name = 'leader_member_profile_id') then
    execute $definition$
alter table public.term_department
  add column leader_member_profile_id uuid references public.member_profile(id) on delete restrict;

create function public.assert_department_leader()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.leader_member_profile_id is not null and not exists (
    select 1 from public.term_role_assignment tra
    where tra.ministry_term_id = new.ministry_term_id
      and tra.member_profile_id = new.leader_member_profile_id
  ) then
    raise exception 'Department Leaders must currently serve on the Executive Board' using errcode = '23514';
  end if;
  return new;
end;
$$;

create policy "Department leaders read their department" on public.term_department
for select to authenticated
using (public.has_capability('department.read', 'department', id));

create function public.department_session_access(p_session_id uuid, p_capability text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select public.has_capability(p_capability, 'department', s.term_department_id)
    from public.ministry_session s
    where s.id = p_session_id and s.term_department_id is not null
  ), false);
$$;

create function public.department_participant_access(p_participant_id uuid, p_capability text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select public.department_session_access(p.ministry_session_id, p_capability)
    from public.session_participant p where p.id = p_participant_id
  ), false);
$$;

revoke all on function public.department_session_access(uuid, text) from public, anon;
revoke all on function public.department_participant_access(uuid, text) from public, anon;
grant execute on function public.department_session_access(uuid, text) to authenticated;
grant execute on function public.department_participant_access(uuid, text) to authenticated;

create policy "Department leaders read sessions" on public.ministry_session
for select to authenticated
using (term_department_id is not null and public.has_capability('department.read', 'department', term_department_id));
create policy "Department leaders create sessions" on public.ministry_session
for insert to authenticated
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders update sessions" on public.ministry_session
for update to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id))
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders delete sessions" on public.ministry_session
for delete to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));

create policy "Department leaders read recurrences" on public.session_recurrence_rule
for select to authenticated
using (term_department_id is not null and public.has_capability('department.read', 'department', term_department_id));
create policy "Department leaders create recurrences" on public.session_recurrence_rule
for insert to authenticated
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders update recurrences" on public.session_recurrence_rule
for update to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id))
with check (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));
create policy "Department leaders delete recurrences" on public.session_recurrence_rule
for delete to authenticated
using (term_department_id is not null and public.has_capability('department.session.manage', 'department', term_department_id));

create policy "Department leaders read participants" on public.session_participant
for select to authenticated
using (public.department_session_access(ministry_session_id, 'department.read'));
create policy "Department leaders create participants" on public.session_participant
for insert to authenticated
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders update participants" on public.session_participant
for update to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'))
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders delete participants" on public.session_participant
for delete to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'));

create policy "Department leaders read attendance" on public.attendance_record
for select to authenticated
using (public.department_participant_access(session_participant_id, 'department.read'));
create policy "Department leaders create attendance" on public.attendance_record
for insert to authenticated
with check (public.department_participant_access(session_participant_id, 'department.session.manage'));
create policy "Department leaders update attendance" on public.attendance_record
for update to authenticated
using (public.department_participant_access(session_participant_id, 'department.session.manage'))
with check (public.department_participant_access(session_participant_id, 'department.session.manage'));
create policy "Department leaders delete attendance" on public.attendance_record
for delete to authenticated
using (public.department_participant_access(session_participant_id, 'department.session.manage'));

create policy "Department leaders read session assignments" on public.session_assignment
for select to authenticated
using (public.department_session_access(ministry_session_id, 'department.read'));
create policy "Department leaders create session assignments" on public.session_assignment
for insert to authenticated
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders update session assignments" on public.session_assignment
for update to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'))
with check (public.department_session_access(ministry_session_id, 'department.session.manage'));
create policy "Department leaders delete session assignments" on public.session_assignment
for delete to authenticated
using (public.department_session_access(ministry_session_id, 'department.session.manage'));

create trigger trg_assert_department_leader
before insert or update of leader_member_profile_id, ministry_term_id on public.term_department
for each row execute function public.assert_department_leader();

create function public.prevent_board_leader_removal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.member_profile_id is not distinct from old.member_profile_id then
    return new;
  end if;

  perform 1 from public.term_department td
  where td.ministry_term_id = old.ministry_term_id
    and td.leader_member_profile_id = old.member_profile_id
  for update;
  if found and not exists (
      select 1 from public.term_role_assignment tra
      where tra.ministry_term_id = old.ministry_term_id
        and tra.member_profile_id = old.member_profile_id
        and tra.id <> old.id
  ) then
    raise exception 'Reassign Department Leader before removing the last Executive Board role' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger trg_prevent_board_leader_removal
before update of member_profile_id or delete on public.term_role_assignment
for each row execute function public.prevent_board_leader_removal();

create function public.set_department_leader(p_department_id uuid, p_member_profile_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_church_id uuid; v_lifecycle text;
begin
  select m.church_id, mt.lifecycle into v_church_id, v_lifecycle
  from public.term_department td
  join public.ministry_term mt on mt.id = td.ministry_term_id
  join public.ministry m on m.id = mt.ministry_id
  where td.id = p_department_id
  for update of td;

  if v_church_id is null then
    raise exception 'Department not found' using errcode = 'P0002';
  end if;
  if not public.is_system_admin_for_church(v_church_id) then
    raise exception 'Unauthorized Department Leader assignment' using errcode = '42501';
  end if;
  if v_lifecycle = 'closed' then
    raise exception 'Cannot change Department Leader for closed term' using errcode = '23514';
  end if;

  update public.term_department
  set leader_member_profile_id = p_member_profile_id
  where id = p_department_id;
  return true;
end;
$$;

revoke all on function public.set_department_leader(uuid, uuid) from public, anon;
grant execute on function public.set_department_leader(uuid, uuid) to authenticated;
$definition$;
  end if;
end;
$repair$;

do $repair$
begin
  if to_regclass('public.group_session_assignment') is null then
    execute $definition$
-- Group session assignments: fixed one-person worship/lesson guide slots for group-scoped sessions
create table public.group_session_assignment (
  id uuid primary key default gen_random_uuid(),
  ministry_session_id uuid not null references public.ministry_session(id) on delete restrict,
  ministry_membership_id uuid not null references public.ministry_membership(id) on delete restrict,
  role text not null check (role in ('worship_guide', 'lesson_guide')),
  created_at timestamptz not null default now(),
  constraint group_session_assignment_unique unique (ministry_session_id, role)
);

create index group_session_assignment_membership_idx on public.group_session_assignment (ministry_membership_id);

-- Invariant: assignment must target a group-scoped session, and the assigned
-- membership must belong to that session's group within the same term
create or replace function public.check_group_session_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_term_id uuid;
  v_session_group_id uuid;
  v_membership_term_id uuid;
begin
  select ministry_term_id, term_group_id into v_session_term_id, v_session_group_id
  from public.ministry_session
  where id = new.ministry_session_id;

  if v_session_group_id is null then
    raise exception 'Group session assignments require a group-scoped session';
  end if;

  select ministry_term_id into v_membership_term_id
  from public.ministry_membership
  where id = new.ministry_membership_id;

  if v_membership_term_id is null or v_membership_term_id <> v_session_term_id then
    raise exception 'Ministry membership and session must belong to the same ministry term';
  end if;

  if not exists (
    select 1 from public.term_group_membership
    where term_group_id = v_session_group_id
      and ministry_membership_id = new.ministry_membership_id
      and status = 'active'
      and ended_at is null
  ) then
    raise exception 'Assigned member must belong to the session group';
  end if;

  return new;
end;
$$;

create trigger trg_group_session_assignment_integrity
before insert or update of ministry_session_id, ministry_membership_id, role on public.group_session_assignment
for each row
execute function public.check_group_session_assignment_integrity();

alter table public.group_session_assignment enable row level security;

create policy "Scoped group assignment reads" on public.group_session_assignment for select to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (
    select 1 from public.ministry_session s
    where s.id = ministry_session_id
      and s.term_group_id is not null
      and public.has_capability('group.session.manage', 'group', s.term_group_id)
  )
);
create policy "Scoped group assignment inserts" on public.group_session_assignment for insert to authenticated
with check (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (
    select 1 from public.ministry_session s
    where s.id = ministry_session_id
      and s.term_group_id is not null
      and public.has_capability('group.session.manage', 'group', s.term_group_id)
  )
);
create policy "Scoped group assignment updates" on public.group_session_assignment for update to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (
    select 1 from public.ministry_session s
    where s.id = ministry_session_id
      and s.term_group_id is not null
      and public.has_capability('group.session.manage', 'group', s.term_group_id)
  )
)
with check (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (
    select 1 from public.ministry_session s
    where s.id = ministry_session_id
      and s.term_group_id is not null
      and public.has_capability('group.session.manage', 'group', s.term_group_id)
  )
);
create policy "Scoped group assignment deletes" on public.group_session_assignment for delete to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (
    select 1 from public.ministry_session s
    where s.id = ministry_session_id
      and s.term_group_id is not null
      and public.has_capability('group.session.manage', 'group', s.term_group_id)
  )
);
$definition$;
  end if;
end;
$repair$;

do $repair$
begin
  if to_regclass('public.session_service_department') is null then
    execute $definition$
create table public.session_service_department (
  id uuid primary key default gen_random_uuid(),
  ministry_session_id uuid not null references public.ministry_session(id) on delete cascade,
  term_department_id uuid not null references public.term_department(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (ministry_session_id, term_department_id)
);

create index session_service_department_session_idx
  on public.session_service_department(ministry_session_id);

insert into public.session_service_department (ministry_session_id, term_department_id)
select distinct sa.ministry_session_id, dsr.term_department_id
from public.service_assignment sa
join public.department_service_role dsr on dsr.id = sa.department_service_role_id
on conflict (ministry_session_id, term_department_id) do nothing;

alter table public.session_service_department enable row level security;

create policy "Session service department reads" on public.session_service_department
  for select to authenticated
  using (public.has_capability('term.read_history', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

create policy "Session service department inserts" on public.session_service_department
  for insert to authenticated
  with check (public.has_capability('term.operational.manage', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

create policy "Session service department deletes" on public.session_service_department
  for delete to authenticated
  using (public.has_capability('term.operational.manage', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));
$definition$;
  end if;
end;
$repair$;

do $repair$
begin
  if to_regclass('public.session_service_role') is null then
    execute $definition$
create table public.session_service_role (
  id uuid primary key default gen_random_uuid(),
  ministry_session_id uuid not null references public.ministry_session(id) on delete cascade,
  department_service_role_id uuid not null references public.department_service_role(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (ministry_session_id, department_service_role_id)
);

create index session_service_role_session_idx
  on public.session_service_role(ministry_session_id);

insert into public.session_service_role (ministry_session_id, department_service_role_id)
select ssd.ministry_session_id, dsr.id
from public.session_service_department ssd
join public.department_service_role dsr on dsr.term_department_id = ssd.term_department_id
on conflict (ministry_session_id, department_service_role_id) do nothing;

insert into public.session_service_role (ministry_session_id, department_service_role_id)
select sa.ministry_session_id, sa.department_service_role_id
from public.service_assignment sa
on conflict (ministry_session_id, department_service_role_id) do nothing;

alter table public.session_service_role enable row level security;

create policy "Session service role reads" on public.session_service_role
  for select to authenticated
  using (public.has_capability('term.read_history', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

create policy "Session service role inserts" on public.session_service_role
  for insert to authenticated
  with check (public.has_capability('term.operational.manage', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

create policy "Session service role deletes" on public.session_service_role
  for delete to authenticated
  using (public.has_capability('term.operational.manage', 'ministry_term', (select ministry_term_id from public.ministry_session where id = ministry_session_id)));

create or replace function public.set_session_service_roles(
  target_session_id uuid,
  target_role_ids uuid[]
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_term_id uuid;
  v_is_scoped boolean;
begin
  select ministry_term_id, term_group_id is not null or term_department_id is not null
  into v_term_id, v_is_scoped
  from public.ministry_session
  where id = target_session_id;

  if v_term_id is null
    or v_is_scoped
    or not public.has_capability('term.operational.manage', 'ministry_term', v_term_id) then
    raise exception 'Session service roles access denied' using errcode = '42501';
  end if;

  if exists (
    select 1
    from unnest(target_role_ids) as target_role_id
    left join public.department_service_role dsr on dsr.id = target_role_id
    left join public.term_department td on td.id = dsr.term_department_id and td.ministry_term_id = v_term_id
    where td.id is null
  ) then
    raise exception 'Service role does not belong to this session term' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.session_service_role ssr
    join public.service_assignment sa
      on sa.ministry_session_id = ssr.ministry_session_id
      and sa.department_service_role_id = ssr.department_service_role_id
    where ssr.ministry_session_id = target_session_id
      and ssr.department_service_role_id <> all(target_role_ids)
  ) then
    raise exception 'Remove service assignments before removing a service role' using errcode = '23503';
  end if;

  delete from public.session_service_role
  where ministry_session_id = target_session_id
    and department_service_role_id <> all(target_role_ids);

  insert into public.session_service_role (ministry_session_id, department_service_role_id)
  select target_session_id, target_role_id
  from unnest(target_role_ids) as target_role_id
  on conflict (ministry_session_id, department_service_role_id) do nothing;
end;
$$;

revoke all on function public.set_session_service_roles(uuid, uuid[]) from public, anon;
grant execute on function public.set_session_service_roles(uuid, uuid[]) to authenticated;

create or replace function public.check_service_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_term_id uuid;
  v_session_term_id uuid;
  v_membership_term_id uuid;
  v_department_id uuid;
begin
  select td.ministry_term_id, td.id into v_role_term_id, v_department_id
  from public.department_service_role dsr
  join public.term_department td on td.id = dsr.term_department_id
  where dsr.id = new.department_service_role_id;

  select ministry_term_id into v_session_term_id
  from public.ministry_session where id = new.ministry_session_id;

  select ministry_term_id into v_membership_term_id
  from public.ministry_membership where id = new.ministry_membership_id;

  if v_role_term_id is null
    or v_session_term_id is null
    or v_membership_term_id is null
    or v_role_term_id <> v_session_term_id
    or v_membership_term_id <> v_session_term_id
    or not exists (
      select 1 from public.session_service_role
      where ministry_session_id = new.ministry_session_id
        and department_service_role_id = new.department_service_role_id
    )
    or not exists (
      select 1 from public.ministry_assignment
      where ministry_membership_id = new.ministry_membership_id
        and term_department_id = v_department_id
    ) then
    raise exception 'Service assignment must use a selected session service role';
  end if;

  return new;
end;
$$;
$definition$;
  end if;
end;
$repair$;

do $repair$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'portal_department_member_directory' and column_name = 'gender') then
    execute $definition$
-- Expose member gender through the portal member directories so leadership
-- views can render gender-tinted avatars. Column order changes force a
-- full view replacement.
drop view if exists public.portal_department_member_directory;
create view public.portal_department_member_directory with (security_barrier = true) as
select td.id as department_id,
  td.name as department_name,
  mm.id as membership_id,
  mp.id as member_id,
  mp.full_name,
  mp.gender,
  ma.id as assignment_id
from public.term_department td
join public.ministry_membership mm on mm.ministry_term_id = td.ministry_term_id
join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
left join public.ministry_assignment ma
  on ma.ministry_membership_id = mm.id and ma.term_department_id = td.id
where public.has_capability('department.members.manage', 'department', td.id);

revoke all on public.portal_department_member_directory from public, anon;
grant select on public.portal_department_member_directory to authenticated;

drop view if exists public.portal_group_member_directory;
create view public.portal_group_member_directory with (security_barrier = true) as
select tg.id as group_id, tg.name as group_name, mm.id as membership_id, mp.id as member_id, mp.full_name,
  mp.gender,
  tgm.id as group_membership_id, tgm.role, tgm.status, tgm.ended_at, current_group.term_group_id as current_group_id
from public.term_group tg
join public.ministry_membership mm on mm.ministry_term_id = tg.ministry_term_id
join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
left join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id and tgm.term_group_id = tg.id
left join lateral (select term_group_id from public.term_group_membership open_tgm where open_tgm.ministry_membership_id = mm.id and open_tgm.ended_at is null limit 1) current_group on true
where public.has_capability('group.members.manage', 'group', tg.id);

revoke all on public.portal_group_member_directory from public, anon;
grant select on public.portal_group_member_directory to authenticated;
$definition$;
  end if;
end;
$repair$;

notify pgrst, 'reload schema';
