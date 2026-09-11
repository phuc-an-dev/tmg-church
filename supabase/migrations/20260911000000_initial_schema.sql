-- Plan 01: Initial Supabase schema migration
-- Complete data model, integrity rules, Row Level Security, and public directory view

-- 1. Extensions
create extension if not exists "pgcrypto";

-- 2. Timestamp update helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- 3. Leaders table (Authorization allow-list)
-- Created early so authorization helper can reference it
create table public.leaders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- 4. Authorization helper
-- Checks whether the active auth user is registered in public.leaders.
-- Uses SECURITY DEFINER with fixed search_path to avoid recursive RLS on leaders.
create or replace function public.is_leader()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.leaders
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_leader() from public;
grant execute on function public.is_leader() to authenticated;

-- 5. Domain tables in dependency order

-- Church
create table public.church (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index church_lower_name_idx on public.church (lower(name));

create trigger trg_church_set_updated_at
before update on public.church
for each row
execute function public.set_updated_at();

-- Ministry
create table public.ministry (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.church(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_church_id_slug_key unique (church_id, slug)
);

create unique index ministry_church_lower_name_idx on public.ministry (church_id, lower(name));
create index ministry_church_id_idx on public.ministry (church_id);

create trigger trg_ministry_set_updated_at
before update on public.ministry
for each row
execute function public.set_updated_at();

-- Ministry Term
create table public.ministry_term (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministry(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_term_ministry_id_slug_key unique (ministry_id, slug),
  constraint ministry_term_dates_check check (end_date is null or start_date is null or end_date >= start_date)
);

create unique index ministry_term_lower_name_idx on public.ministry_term (ministry_id, lower(name));
create index ministry_term_ministry_id_idx on public.ministry_term (ministry_id);

create trigger trg_ministry_term_set_updated_at
before update on public.ministry_term
for each row
execute function public.set_updated_at();

-- Term Group
create table public.term_group (
  id uuid primary key default gen_random_uuid(),
  ministry_term_id uuid not null references public.ministry_term(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index term_group_lower_name_idx on public.term_group (ministry_term_id, lower(name));
create index term_group_ministry_term_id_idx on public.term_group (ministry_term_id);

create trigger trg_term_group_set_updated_at
before update on public.term_group
for each row
execute function public.set_updated_at();

-- Term Department
create table public.term_department (
  id uuid primary key default gen_random_uuid(),
  ministry_term_id uuid not null references public.ministry_term(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index term_department_lower_name_idx on public.term_department (ministry_term_id, lower(name));
create index term_department_ministry_term_id_idx on public.term_department (ministry_term_id);

create trigger trg_term_department_set_updated_at
before update on public.term_department
for each row
execute function public.set_updated_at();

-- Member Profile
create table public.member_profile (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.church(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) > 0),
  phone text check (phone is null or char_length(trim(phone)) > 0),
  birth_year smallint check (birth_year is null or (birth_year >= 1900 and birth_year <= 2100)),
  user_id uuid references auth.users(id) on delete set null unique,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index member_profile_church_archived_idx on public.member_profile (church_id, archived_at);
create index member_profile_lower_full_name_idx on public.member_profile (lower(full_name));
create index member_profile_church_id_idx on public.member_profile (church_id);

create trigger trg_member_profile_set_updated_at
before update on public.member_profile
for each row
execute function public.set_updated_at();

-- Member Segment
create table public.member_segment (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.church(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index member_segment_church_lower_name_idx on public.member_segment (church_id, lower(name));
create index member_segment_church_id_idx on public.member_segment (church_id);

create trigger trg_member_segment_set_updated_at
before update on public.member_segment
for each row
execute function public.set_updated_at();

-- Member Segment Membership
create table public.member_segment_membership (
  id uuid primary key default gen_random_uuid(),
  member_segment_id uuid not null references public.member_segment(id) on delete restrict,
  member_profile_id uuid not null references public.member_profile(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint member_segment_membership_unique unique (member_segment_id, member_profile_id)
);

create index member_segment_membership_member_profile_idx on public.member_segment_membership (member_profile_id);

-- Ministry Membership
create table public.ministry_membership (
  id uuid primary key default gen_random_uuid(),
  ministry_term_id uuid not null references public.ministry_term(id) on delete restrict,
  member_profile_id uuid not null references public.member_profile(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint ministry_membership_unique unique (ministry_term_id, member_profile_id)
);

create index ministry_membership_member_profile_idx on public.ministry_membership (member_profile_id);
create index ministry_membership_ministry_term_idx on public.ministry_membership (ministry_term_id);

-- Term Group Membership (0 or 1 group per ministry membership within its term)
create table public.term_group_membership (
  id uuid primary key default gen_random_uuid(),
  term_group_id uuid not null references public.term_group(id) on delete restrict,
  ministry_membership_id uuid not null references public.ministry_membership(id) on delete restrict unique,
  created_at timestamptz not null default now()
);

create index term_group_membership_term_group_idx on public.term_group_membership (term_group_id);

-- Ministry Assignment (at most one assignment per department for a membership)
create table public.ministry_assignment (
  id uuid primary key default gen_random_uuid(),
  ministry_membership_id uuid not null references public.ministry_membership(id) on delete restrict,
  term_department_id uuid not null references public.term_department(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint ministry_assignment_unique unique (ministry_membership_id, term_department_id)
);

create index ministry_assignment_term_department_idx on public.ministry_assignment (term_department_id);

-- Session Recurrence Rule
create table public.session_recurrence_rule (
  id uuid primary key default gen_random_uuid(),
  ministry_term_id uuid not null references public.ministry_term(id) on delete restrict,
  term_group_id uuid references public.term_group(id) on delete restrict,
  term_department_id uuid references public.term_department(id) on delete restrict,
  rule text not null check (char_length(trim(rule)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurrence_scope_check check (not (term_group_id is not null and term_department_id is not null))
);

create index session_recurrence_rule_ministry_term_idx on public.session_recurrence_rule (ministry_term_id);
create index session_recurrence_rule_term_group_idx on public.session_recurrence_rule (term_group_id);
create index session_recurrence_rule_term_department_idx on public.session_recurrence_rule (term_department_id);

create trigger trg_session_recurrence_rule_set_updated_at
before update on public.session_recurrence_rule
for each row
execute function public.set_updated_at();

-- Ministry Session
create table public.ministry_session (
  id uuid primary key default gen_random_uuid(),
  ministry_term_id uuid not null references public.ministry_term(id) on delete restrict,
  session_recurrence_rule_id uuid references public.session_recurrence_rule(id) on delete restrict,
  term_group_id uuid references public.term_group(id) on delete restrict,
  term_department_id uuid references public.term_department(id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  session_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_scope_check check (not (term_group_id is not null and term_department_id is not null))
);

create index ministry_session_term_date_idx on public.ministry_session (ministry_term_id, session_date);
create index ministry_session_recurrence_rule_idx on public.ministry_session (session_recurrence_rule_id);
create index ministry_session_term_group_idx on public.ministry_session (term_group_id);
create index ministry_session_term_department_idx on public.ministry_session (term_department_id);

create trigger trg_ministry_session_set_updated_at
before update on public.ministry_session
for each row
execute function public.set_updated_at();

-- Session Participant
create table public.session_participant (
  id uuid primary key default gen_random_uuid(),
  ministry_session_id uuid not null references public.ministry_session(id) on delete restrict,
  member_profile_id uuid not null references public.member_profile(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint session_participant_unique unique (ministry_session_id, member_profile_id)
);

create index session_participant_member_profile_idx on public.session_participant (member_profile_id);

-- Attendance Record
create table public.attendance_record (
  id uuid primary key default gen_random_uuid(),
  session_participant_id uuid not null references public.session_participant(id) on delete restrict unique,
  status text not null check (status in ('present', 'absent', 'excused')),
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_attendance_record_set_updated_at
before update on public.attendance_record
for each row
execute function public.set_updated_at();

-- Session Assignment
create table public.session_assignment (
  id uuid primary key default gen_random_uuid(),
  ministry_session_id uuid not null references public.ministry_session(id) on delete restrict,
  ministry_membership_id uuid not null references public.ministry_membership(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint session_assignment_unique unique (ministry_session_id, ministry_membership_id)
);

create index session_assignment_ministry_membership_idx on public.session_assignment (ministry_membership_id);

-- Department Service Role
create table public.department_service_role (
  id uuid primary key default gen_random_uuid(),
  term_department_id uuid not null references public.term_department(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index department_service_role_lower_name_idx on public.department_service_role (term_department_id, lower(name));
create index department_service_role_term_department_idx on public.department_service_role (term_department_id);

create trigger trg_department_service_role_set_updated_at
before update on public.department_service_role
for each row
execute function public.set_updated_at();

-- Service Roster
create table public.service_roster (
  id uuid primary key default gen_random_uuid(),
  term_department_id uuid not null references public.term_department(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index service_roster_lower_name_idx on public.service_roster (term_department_id, lower(name));
create index service_roster_term_department_idx on public.service_roster (term_department_id);

create trigger trg_service_roster_set_updated_at
before update on public.service_roster
for each row
execute function public.set_updated_at();

-- Service Assignment
create table public.service_assignment (
  id uuid primary key default gen_random_uuid(),
  service_roster_id uuid not null references public.service_roster(id) on delete restrict,
  department_service_role_id uuid not null references public.department_service_role(id) on delete restrict,
  ministry_session_id uuid not null references public.ministry_session(id) on delete restrict,
  ministry_membership_id uuid not null references public.ministry_membership(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint service_assignment_unique unique (
    service_roster_id,
    department_service_role_id,
    ministry_session_id,
    ministry_membership_id
  )
);

create index service_assignment_roster_idx on public.service_assignment (service_roster_id);
create index service_assignment_role_idx on public.service_assignment (department_service_role_id);
create index service_assignment_session_idx on public.service_assignment (ministry_session_id);
create index service_assignment_membership_idx on public.service_assignment (ministry_membership_id);

-- Care Flag
create table public.care_flag (
  id uuid primary key default gen_random_uuid(),
  member_profile_id uuid not null references public.member_profile(id) on delete restrict,
  ministry_term_id uuid not null references public.ministry_term(id) on delete restrict,
  flag_type text not null check (char_length(trim(flag_type)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index care_flag_member_profile_idx on public.care_flag (member_profile_id);
create index care_flag_ministry_term_idx on public.care_flag (ministry_term_id);

create trigger trg_care_flag_set_updated_at
before update on public.care_flag
for each row
execute function public.set_updated_at();

-- Care Note
create table public.care_note (
  id uuid primary key default gen_random_uuid(),
  care_flag_id uuid not null references public.care_flag(id) on delete restrict,
  note text not null check (char_length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index care_note_care_flag_idx on public.care_note (care_flag_id);

create trigger trg_care_note_set_updated_at
before update on public.care_note
for each row
execute function public.set_updated_at();

-- 6. Cross-parent integrity triggers

-- Invariant: A member profile and member segment must belong to the same church
create or replace function public.check_member_segment_membership_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segment_church_id uuid;
  v_member_church_id uuid;
begin
  select church_id into v_segment_church_id
  from public.member_segment
  where id = new.member_segment_id;

  select church_id into v_member_church_id
  from public.member_profile
  where id = new.member_profile_id;

  if v_segment_church_id is null or v_member_church_id is null or v_segment_church_id <> v_member_church_id then
    raise exception 'Member profile and segment must belong to the same church';
  end if;

  return new;
end;
$$;

create trigger trg_member_segment_membership_integrity
before insert or update of member_segment_id, member_profile_id on public.member_segment_membership
for each row
execute function public.check_member_segment_membership_integrity();

-- Invariant: A ministry membership combines a member and ministry term from the same church
create or replace function public.check_ministry_membership_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_term_church_id uuid;
  v_member_church_id uuid;
begin
  select m.church_id into v_term_church_id
  from public.ministry_term mt
  join public.ministry m on m.id = mt.ministry_id
  where mt.id = new.ministry_term_id;

  select church_id into v_member_church_id
  from public.member_profile
  where id = new.member_profile_id;

  if v_term_church_id is null or v_member_church_id is null or v_term_church_id <> v_member_church_id then
    raise exception 'Member profile and ministry term must belong to the same church';
  end if;

  return new;
end;
$$;

create trigger trg_ministry_membership_integrity
before insert or update of ministry_term_id, member_profile_id on public.ministry_membership
for each row
execute function public.check_ministry_membership_integrity();

-- Invariant: A group membership combines a group and ministry membership from the same term
create or replace function public.check_term_group_membership_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_term_id uuid;
  v_membership_term_id uuid;
begin
  select ministry_term_id into v_group_term_id
  from public.term_group
  where id = new.term_group_id;

  select ministry_term_id into v_membership_term_id
  from public.ministry_membership
  where id = new.ministry_membership_id;

  if v_group_term_id is null or v_membership_term_id is null or v_group_term_id <> v_membership_term_id then
    raise exception 'Term group and ministry membership must belong to the same ministry term';
  end if;

  return new;
end;
$$;

create trigger trg_term_group_membership_integrity
before insert or update of term_group_id, ministry_membership_id on public.term_group_membership
for each row
execute function public.check_term_group_membership_integrity();

-- Invariant: A department assignment combines a department and ministry membership from the same term
create or replace function public.check_ministry_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dept_term_id uuid;
  v_membership_term_id uuid;
begin
  select ministry_term_id into v_dept_term_id
  from public.term_department
  where id = new.term_department_id;

  select ministry_term_id into v_membership_term_id
  from public.ministry_membership
  where id = new.ministry_membership_id;

  if v_dept_term_id is null or v_membership_term_id is null or v_dept_term_id <> v_membership_term_id then
    raise exception 'Term department and ministry membership must belong to the same ministry term';
  end if;

  return new;
end;
$$;

create trigger trg_ministry_assignment_integrity
before insert or update of ministry_membership_id, term_department_id on public.ministry_assignment
for each row
execute function public.check_ministry_assignment_integrity();

-- Invariant: A recurrence rule group/department belongs to the row's ministry term
create or replace function public.check_session_recurrence_rule_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel_term_id uuid;
begin
  if new.term_group_id is not null then
    select ministry_term_id into v_rel_term_id
    from public.term_group
    where id = new.term_group_id;

    if v_rel_term_id is null or v_rel_term_id <> new.ministry_term_id then
      raise exception 'Term group must belong to the recurrence rule ministry term';
    end if;
  end if;

  if new.term_department_id is not null then
    select ministry_term_id into v_rel_term_id
    from public.term_department
    where id = new.term_department_id;

    if v_rel_term_id is null or v_rel_term_id <> new.ministry_term_id then
      raise exception 'Term department must belong to the recurrence rule ministry term';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_session_recurrence_rule_integrity
before insert or update of ministry_term_id, term_group_id, term_department_id on public.session_recurrence_rule
for each row
execute function public.check_session_recurrence_rule_integrity();

-- Invariant: A session recurrence rule, group, or department belongs to the session ministry term
create or replace function public.check_ministry_session_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel_term_id uuid;
begin
  if new.term_group_id is not null then
    select ministry_term_id into v_rel_term_id
    from public.term_group
    where id = new.term_group_id;

    if v_rel_term_id is null or v_rel_term_id <> new.ministry_term_id then
      raise exception 'Term group must belong to the session ministry term';
    end if;
  end if;

  if new.term_department_id is not null then
    select ministry_term_id into v_rel_term_id
    from public.term_department
    where id = new.term_department_id;

    if v_rel_term_id is null or v_rel_term_id <> new.ministry_term_id then
      raise exception 'Term department must belong to the session ministry term';
    end if;
  end if;

  if new.session_recurrence_rule_id is not null then
    select ministry_term_id into v_rel_term_id
    from public.session_recurrence_rule
    where id = new.session_recurrence_rule_id;

    if v_rel_term_id is null or v_rel_term_id <> new.ministry_term_id then
      raise exception 'Recurrence rule must belong to the session ministry term';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_ministry_session_integrity
before insert or update of ministry_term_id, session_recurrence_rule_id, term_group_id, term_department_id on public.ministry_session
for each row
execute function public.check_ministry_session_integrity();

-- Invariant: A session participant's member belongs to the same church as the session's ministry term
create or replace function public.check_session_participant_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_church_id uuid;
  v_member_church_id uuid;
begin
  select m.church_id into v_session_church_id
  from public.ministry_session ms
  join public.ministry_term mt on mt.id = ms.ministry_term_id
  join public.ministry m on m.id = mt.ministry_id
  where ms.id = new.ministry_session_id;

  select church_id into v_member_church_id
  from public.member_profile
  where id = new.member_profile_id;

  if v_session_church_id is null or v_member_church_id is null or v_session_church_id <> v_member_church_id then
    raise exception 'Member profile and session must belong to the same church';
  end if;

  return new;
end;
$$;

create trigger trg_session_participant_integrity
before insert or update of ministry_session_id, member_profile_id on public.session_participant
for each row
execute function public.check_session_participant_integrity();

-- Invariant: A session assignment combines a session and ministry membership from the same term
create or replace function public.check_session_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_term_id uuid;
  v_membership_term_id uuid;
begin
  select ministry_term_id into v_session_term_id
  from public.ministry_session
  where id = new.ministry_session_id;

  select ministry_term_id into v_membership_term_id
  from public.ministry_membership
  where id = new.ministry_membership_id;

  if v_session_term_id is null or v_membership_term_id is null or v_session_term_id <> v_membership_term_id then
    raise exception 'Session and ministry membership must belong to the same ministry term';
  end if;

  return new;
end;
$$;

create trigger trg_session_assignment_integrity
before insert or update of ministry_session_id, ministry_membership_id on public.session_assignment
for each row
execute function public.check_session_assignment_integrity();

-- Invariant: A service assignment's department, role, roster, session, and membership resolve to the same ministry term
create or replace function public.check_service_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_roster_dept_id uuid;
  v_roster_term_id uuid;
  v_role_dept_id uuid;
  v_session_term_id uuid;
  v_membership_term_id uuid;
begin
  select sr.term_department_id, td.ministry_term_id
  into v_roster_dept_id, v_roster_term_id
  from public.service_roster sr
  join public.term_department td on td.id = sr.term_department_id
  where sr.id = new.service_roster_id;

  select term_department_id into v_role_dept_id
  from public.department_service_role
  where id = new.department_service_role_id;

  if v_roster_dept_id is null or v_role_dept_id is null or v_roster_dept_id <> v_role_dept_id then
    raise exception 'Service roster and service role must belong to the same term department';
  end if;

  select ministry_term_id into v_session_term_id
  from public.ministry_session
  where id = new.ministry_session_id;

  if v_roster_term_id is null or v_session_term_id is null or v_roster_term_id <> v_session_term_id then
    raise exception 'Service roster department and session must belong to the same ministry term';
  end if;

  select ministry_term_id into v_membership_term_id
  from public.ministry_membership
  where id = new.ministry_membership_id;

  if v_membership_term_id is null or v_membership_term_id <> v_session_term_id then
    raise exception 'Ministry membership and session must belong to the same ministry term';
  end if;

  return new;
end;
$$;

create trigger trg_service_assignment_integrity
before insert or update of service_roster_id, department_service_role_id, ministry_session_id, ministry_membership_id on public.service_assignment
for each row
execute function public.check_service_assignment_integrity();

-- Invariant: A care flag's member belongs to the same church as the ministry term
create or replace function public.check_care_flag_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_term_church_id uuid;
  v_member_church_id uuid;
begin
  select m.church_id into v_term_church_id
  from public.ministry_term mt
  join public.ministry m on m.id = mt.ministry_id
  where mt.id = new.ministry_term_id;

  select church_id into v_member_church_id
  from public.member_profile
  where id = new.member_profile_id;

  if v_term_church_id is null or v_member_church_id is null or v_term_church_id <> v_member_church_id then
    raise exception 'Member profile and ministry term must belong to the same church';
  end if;

  return new;
end;
$$;

create trigger trg_care_flag_integrity
before insert or update of member_profile_id, ministry_term_id on public.care_flag
for each row
execute function public.check_care_flag_integrity();

-- Scope identity is immutable after creation. This makes the parent values
-- compared by child triggers stable under concurrent transactions.
create or replace function public.prevent_scope_reassignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (to_jsonb(new) -> tg_argv[0]) is distinct from (to_jsonb(old) -> tg_argv[0]) then
    raise exception '% is immutable', tg_argv[1];
  end if;
  return new;
end;
$$;

create trigger trg_ministry_church_immutable before update of church_id on public.ministry for each row execute function public.prevent_scope_reassignment('church_id', 'Ministry church relationship');
create trigger trg_ministry_term_ministry_immutable before update of ministry_id on public.ministry_term for each row execute function public.prevent_scope_reassignment('ministry_id', 'Ministry term ministry relationship');
create trigger trg_term_group_scope_immutable before update of ministry_term_id on public.term_group for each row execute function public.prevent_scope_reassignment('ministry_term_id', 'Term group ministry term relationship');
create trigger trg_term_department_scope_immutable before update of ministry_term_id on public.term_department for each row execute function public.prevent_scope_reassignment('ministry_term_id', 'Term department ministry term relationship');
create trigger trg_member_profile_church_immutable before update of church_id on public.member_profile for each row execute function public.prevent_scope_reassignment('church_id', 'Member profile church relationship');
create trigger trg_member_segment_church_immutable before update of church_id on public.member_segment for each row execute function public.prevent_scope_reassignment('church_id', 'Member segment church relationship');
create trigger trg_membership_term_immutable before update of ministry_term_id on public.ministry_membership for each row execute function public.prevent_scope_reassignment('ministry_term_id', 'Ministry membership ministry term relationship');
create trigger trg_recurrence_term_immutable before update of ministry_term_id on public.session_recurrence_rule for each row execute function public.prevent_scope_reassignment('ministry_term_id', 'Recurrence rule ministry term relationship');
create trigger trg_session_term_immutable before update of ministry_term_id on public.ministry_session for each row execute function public.prevent_scope_reassignment('ministry_term_id', 'Session ministry term relationship');
create trigger trg_service_role_department_immutable before update of term_department_id on public.department_service_role for each row execute function public.prevent_scope_reassignment('term_department_id', 'Service role department relationship');
create trigger trg_service_roster_department_immutable before update of term_department_id on public.service_roster for each row execute function public.prevent_scope_reassignment('term_department_id', 'Service roster department relationship');

-- 7. Row Level Security configuration

-- Trigger functions are implementation details and must not be executable by
-- Data API roles. The only application-callable helper is is_leader().
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_leader() to authenticated;

-- Enable RLS on all domain tables
alter table public.church enable row level security;
alter table public.ministry enable row level security;
alter table public.ministry_term enable row level security;
alter table public.term_group enable row level security;
alter table public.term_department enable row level security;
alter table public.member_profile enable row level security;
alter table public.member_segment enable row level security;
alter table public.member_segment_membership enable row level security;
alter table public.ministry_membership enable row level security;
alter table public.term_group_membership enable row level security;
alter table public.ministry_assignment enable row level security;
alter table public.session_recurrence_rule enable row level security;
alter table public.ministry_session enable row level security;
alter table public.session_participant enable row level security;
alter table public.attendance_record enable row level security;
alter table public.session_assignment enable row level security;
alter table public.department_service_role enable row level security;
alter table public.service_roster enable row level security;
alter table public.service_assignment enable row level security;
alter table public.care_flag enable row level security;
alter table public.care_note enable row level security;

-- Enable RLS on leaders table
alter table public.leaders enable row level security;

-- Do not rely on RLS alone: TRUNCATE bypasses RLS. Start from no direct table
-- privileges, then grant only DML required by authenticated leader policies.
revoke all on all tables in schema public from public, anon, authenticated;
grant select, insert, update, delete on table
  public.church,
  public.ministry,
  public.ministry_term,
  public.term_group,
  public.term_department,
  public.member_profile,
  public.member_segment,
  public.member_segment_membership,
  public.ministry_membership,
  public.term_group_membership,
  public.ministry_assignment,
  public.session_recurrence_rule,
  public.ministry_session,
  public.session_participant,
  public.attendance_record,
  public.session_assignment,
  public.department_service_role,
  public.service_roster,
  public.service_assignment,
  public.care_flag,
  public.care_note
to authenticated;
grant select on table public.leaders to authenticated;

-- Domain policies: Leader full access on all domain base tables
create policy "Leader full access on church"
  on public.church for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on ministry"
  on public.ministry for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on ministry_term"
  on public.ministry_term for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on term_group"
  on public.term_group for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on term_department"
  on public.term_department for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on member_profile"
  on public.member_profile for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on member_segment"
  on public.member_segment for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on member_segment_membership"
  on public.member_segment_membership for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on ministry_membership"
  on public.ministry_membership for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on term_group_membership"
  on public.term_group_membership for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on ministry_assignment"
  on public.ministry_assignment for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on session_recurrence_rule"
  on public.session_recurrence_rule for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on ministry_session"
  on public.ministry_session for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on session_participant"
  on public.session_participant for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on attendance_record"
  on public.attendance_record for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on session_assignment"
  on public.session_assignment for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on department_service_role"
  on public.department_service_role for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on service_roster"
  on public.service_roster for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on service_assignment"
  on public.service_assignment for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on care_flag"
  on public.care_flag for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy "Leader full access on care_note"
  on public.care_note for all to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

-- Leaders table policies:
-- Authenticated users may only read their own user_id allow-list status.
-- No user may insert, update, or delete leaders rows through the API (only direct operator commands).
create policy "Leaders and self read allowlist"
  on public.leaders for select to authenticated
  using (user_id = (select auth.uid()));

-- 8. Public Directory View
-- Intentionally exposes safe projection for active members and their ministry-term memberships.
-- Uses security_barrier = true to avoid leaky optimizer functions.
-- Uses owner-rights (default, without security_invoker) to allow anonymous read of safe fields.
create or replace view public.member_profile_public
with (security_barrier = true)
as
select
  mp.id,
  mp.full_name,
  mp.birth_year,
  c.id as church_id,
  c.name as church_name,
  c.slug as church_slug,
  m.id as ministry_id,
  m.name as ministry_name,
  m.slug as ministry_slug,
  mt.id as ministry_term_id,
  mt.name as ministry_term_name,
  mt.slug as ministry_term_slug,
  tg.id as term_group_id,
  tg.name as term_group_name,
  coalesce(dept.department_ids, array[]::uuid[]) as department_ids,
  coalesce(dept.department_names, array[]::text[]) as department_names
from public.member_profile mp
inner join public.church c on c.id = mp.church_id
inner join public.ministry_membership mm on mm.member_profile_id = mp.id
inner join public.ministry_term mt on mt.id = mm.ministry_term_id
inner join public.ministry m on m.id = mt.ministry_id and m.church_id = c.id
left join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id
left join public.term_group tg on tg.id = tgm.term_group_id
left join lateral (
  select
    array_agg(td.id order by td.name, td.id) as department_ids,
    array_agg(td.name order by td.name, td.id) as department_names
  from public.ministry_assignment ma
  inner join public.term_department td on td.id = ma.term_department_id
  where ma.ministry_membership_id = mm.id
) dept on true
where mp.archived_at is null;

-- Restrict public view grants: only SELECT for anon and authenticated
revoke all on public.member_profile_public from public, anon, authenticated;
grant select on public.member_profile_public to anon, authenticated;
