-- Phase 1: Authorization Foundation
-- Reference: docs/decisions/0003-authorization-architecture.md
-- Roadmap: docs/AUTHORIZATION_ROADMAP.md
--
-- Scope:
-- 1. member_profile: normalized email column, format check constraint, partial unique index.
-- 2. term_department: scoped cleanup of legacy test departments, department_code check constraint, backfill & seed standard 7 departments when term exists, unique index (ministry_term_id, department_code).
-- 3. ministry_term: lifecycle transition validation trigger enforcing draft -> active -> closed and closed immutability.
-- 4. system_role_assignment: master_admin & admin storage, one master_admin per church constraint, anti-lockout trigger.
-- 5. term_role_assignment: officer seats, single seat per term constraint, enrollment check trigger, closed-term immutability trigger.
-- 6. application_audit_log: append-only audit log table with mandatory scope_type and scope_id, mutation prevention trigger, revoked update/delete, direct client inserts revoked, trusted security definer logging function.
-- 7. Bootstrap: master_admin assignment for Chi Hội TMG, linked member profile, initial audit log entry. Preserves public.leaders and public.is_leader(). Rejects missing/mismatched identity data if church exists.

-- ============================================================================
-- 1. Member Profile Email Storage & Normalized Uniqueness
-- ============================================================================

alter table public.member_profile
  add column if not exists email text;

alter table public.member_profile
  drop constraint if exists member_profile_email_check;

alter table public.member_profile
  add constraint member_profile_email_check
  check (email is null or (email = lower(trim(email)) and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'));

drop index if exists public.member_profile_church_email_unique_idx;

create unique index if not exists member_profile_email_unique_idx
  on public.member_profile (email)
  where email is not null;

-- ============================================================================
-- 2. Term Department & Fixed Department Codes
-- ============================================================================

alter table public.term_department
  add column if not exists department_code text;

alter table public.term_department
  drop constraint if exists term_department_department_code_check;

alter table public.term_department
  add constraint term_department_department_code_check
  check (department_code in ('social_support', 'small_groups', 'pastoral', 'music', 'worship', 'visitation_care', 'evangelism'));

-- Scoped cleanup and backfill only if Term 2025-2026 exists
do $$
begin
  if exists (select 1 from public.ministry_term where id = '51de3dbb-929f-473a-ac34-014f33c79938') then
    -- Scoped delete of legacy test assignments in term 51de3dbb-929f-473a-ac34-014f33c79938
    delete from public.ministry_assignment
    where term_department_id in (
      select id from public.term_department
      where ministry_term_id = '51de3dbb-929f-473a-ac34-014f33c79938'
        and id in ('9df2b680-c721-412c-8fbd-10f08265a6b4', '39fbe079-ffea-4484-aea1-805fefff179d')
    );

    -- Scoped delete of legacy test departments in term 51de3dbb-929f-473a-ac34-014f33c79938
    delete from public.term_department
    where ministry_term_id = '51de3dbb-929f-473a-ac34-014f33c79938'
      and id in ('9df2b680-c721-412c-8fbd-10f08265a6b4', '39fbe079-ffea-4484-aea1-805fefff179d');

    -- Update existing departments for this specific term
    update public.term_department
    set department_code = 'music'
    where ministry_term_id = '51de3dbb-929f-473a-ac34-014f33c79938'
      and id = '29d6fdc3-a173-40d4-a8cc-e848e791ed58';

    update public.term_department
    set department_code = 'social_support'
    where ministry_term_id = '51de3dbb-929f-473a-ac34-014f33c79938'
      and id = '2545c56e-58c1-404c-b0da-9ddd87a95896';

    update public.term_department
    set department_code = 'visitation_care'
    where ministry_term_id = '51de3dbb-929f-473a-ac34-014f33c79938'
      and id = '72fbf959-7160-490a-b9fc-b0536b48fdba';

    -- Seed missing standard departments for this specific term
    insert into public.term_department (ministry_term_id, name, slug, department_code, icon_key, accent_color)
    values
      ('51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Linh Vụ', 'ban-linh-vu', 'pastoral', 'cross', '#3b82f6'),
      ('51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Thờ Phượng', 'ban-tho-phuong', 'worship', 'flame', '#3b82f6'),
      ('51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Truyền Giảng', 'ban-truyen-giang', 'evangelism', 'globe', '#3b82f6'),
      ('51de3dbb-929f-473a-ac34-014f33c79938', 'Ban Khối Nhóm Nhỏ', 'ban-khoi-nhom-nho', 'small_groups', 'users', '#3b82f6')
    on conflict do nothing;
  end if;

  -- Preflight assertion: any existing term_department in the database must have department_code populated
  if exists (select 1 from public.term_department where department_code is null) then
    raise exception 'Preflight validation failed: Existing term_department records have unmapped department_code';
  end if;
end $$;

alter table public.term_department
  alter column department_code set not null;

create unique index if not exists term_department_term_code_idx
  on public.term_department (ministry_term_id, department_code);

-- ============================================================================
-- 3. Ministry Term Lifecycle Invariants (Blocker 6)
-- ============================================================================

create or replace function public.assert_ministry_term_lifecycle_invariants()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.lifecycle <> 'draft' then
      raise exception 'New ministry terms must start in draft lifecycle';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.lifecycle = 'closed' then
      raise exception 'Closed ministry term is immutable and cannot be deleted';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    -- 1. If old lifecycle is closed, all modifications to any column are strictly forbidden
    if old.lifecycle = 'closed' then
      raise exception 'Closed ministry term is immutable and cannot be modified';
    end if;

    -- 2. Validate lifecycle transitions: draft -> active -> closed only
    if old.lifecycle = 'draft' and new.lifecycle not in ('draft', 'active') then
      raise exception 'Invalid lifecycle transition: draft term can only transition to active';
    end if;

    if old.lifecycle = 'active' and new.lifecycle not in ('active', 'closed') then
      raise exception 'Invalid lifecycle transition: active term can only transition to closed';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assert_ministry_term_lifecycle on public.ministry_term;
drop trigger if exists trg_assert_ministry_term_lifecycle_transition on public.ministry_term;

create trigger trg_assert_ministry_term_lifecycle
before insert or update or delete on public.ministry_term
for each row
execute function public.assert_ministry_term_lifecycle_invariants();

-- ============================================================================
-- 4. System Role Assignment & Master Admin Anti-Lockout
-- ============================================================================

create table if not exists public.system_role_assignment (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.church(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('master_admin', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_role_church_user_unique unique (church_id, user_id)
);

create unique index if not exists system_role_one_master_admin_idx
  on public.system_role_assignment (church_id)
  where role = 'master_admin';

create index if not exists system_role_assignment_church_idx
  on public.system_role_assignment (church_id);

create index if not exists system_role_assignment_user_idx
  on public.system_role_assignment (user_id);

create or replace trigger trg_system_role_set_updated_at
before update on public.system_role_assignment
for each row
execute function public.set_updated_at();

create or replace function public.protect_master_admin()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'master_admin' then
      raise exception 'Anti-lockout: cannot delete the sole master_admin';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if old.role = 'master_admin' and new.role <> 'master_admin' then
      raise exception 'Anti-lockout: cannot demote master_admin';
    end if;
    if old.role = 'master_admin' and new.church_id <> old.church_id then
      raise exception 'Anti-lockout: cannot change church of master_admin';
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_master_admin on public.system_role_assignment;

create trigger trg_protect_master_admin
before update or delete on public.system_role_assignment
for each row
execute function public.protect_master_admin();

alter table public.system_role_assignment enable row level security;

drop policy if exists "Leaders can view system role assignments" on public.system_role_assignment;

create policy "Leaders can view system role assignments"
  on public.system_role_assignment
  for select
  to authenticated
  using (public.is_leader());

-- ============================================================================
-- 5. Term Role Assignment & Invariants
-- ============================================================================

create table if not exists public.term_role_assignment (
  id uuid primary key default gen_random_uuid(),
  ministry_term_id uuid not null references public.ministry_term(id) on delete restrict,
  member_profile_id uuid not null references public.member_profile(id) on delete restrict,
  role text not null check (role in (
    'ministry_head',
    'secretary',
    'treasurer',
    'social_support_commissioner',
    'small_groups_commissioner',
    'pastoral_commissioner',
    'music_commissioner',
    'worship_commissioner',
    'visitation_care_commissioner',
    'evangelism_commissioner'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint term_role_single_seat_idx unique (ministry_term_id, role)
);

create index if not exists term_role_assignment_member_idx
  on public.term_role_assignment (member_profile_id);

create or replace trigger trg_term_role_set_updated_at
before update on public.term_role_assignment
for each row
execute function public.set_updated_at();

-- Closed term immutability & term enrollment check
create or replace function public.assert_term_role_assignment_invariants()
returns trigger
language plpgsql
as $$
declare
  v_term_id uuid;
  v_lifecycle text;
  v_enrolled boolean;
begin
  if tg_op = 'UPDATE' and new.ministry_term_id <> old.ministry_term_id then
    raise exception 'Term role assignment ministry term is immutable';
  end if;

  if tg_op in ('DELETE', 'UPDATE') then
    v_term_id := old.ministry_term_id;
  else
    v_term_id := new.ministry_term_id;
  end if;

  -- 1. Check term lifecycle: closed terms are strictly immutable
  select lifecycle into v_lifecycle
  from public.ministry_term
  where id = v_term_id;

  if v_lifecycle = 'closed' then
    raise exception 'Cannot modify role assignments for closed term (immutable)';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- 2. Check enrollment in ministry_membership
  select exists(
    select 1
    from public.ministry_membership
    where ministry_term_id = new.ministry_term_id
      and member_profile_id = new.member_profile_id
  ) into v_enrolled;

  if not v_enrolled then
    raise exception 'Member profile % is not enrolled in ministry term % membership', new.member_profile_id, new.ministry_term_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assert_term_role_invariants on public.term_role_assignment;

create trigger trg_assert_term_role_invariants
before insert or update or delete on public.term_role_assignment
for each row
execute function public.assert_term_role_assignment_invariants();

alter table public.term_role_assignment enable row level security;

drop policy if exists "Leaders can view and manage term role assignments" on public.term_role_assignment;

create policy "Leaders can view and manage term role assignments"
  on public.term_role_assignment
  for all
  to authenticated
  using (public.is_leader())
  with check (public.is_leader());

-- ============================================================================
-- 6. Application Business Audit Log (Append-Only with Scope) (Blocker 4)
-- ============================================================================

create or replace function public.audit_payload_is_safe(p_payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_key text;
  v_value jsonb;
begin
  if p_payload is null then
    return true;
  end if;

  case jsonb_typeof(p_payload)
    when 'object' then
      for v_key, v_value in select key, value from jsonb_each(p_payload)
      loop
        if lower(v_key) ~ '(password|token|secret|authorization)'
          or not public.audit_payload_is_safe(v_value) then
          return false;
        end if;
      end loop;
    when 'array' then
      for v_value in select value from jsonb_array_elements(p_payload)
      loop
        if not public.audit_payload_is_safe(v_value) then
          return false;
        end if;
      end loop;
    else
      null;
  end case;

  return true;
end;
$$;

create table if not exists public.application_audit_log (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.church(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  action text not null,
  scope_type text not null check (scope_type in ('church', 'ministry_term', 'department', 'group')),
  scope_id uuid not null,
  target_type text not null,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint application_audit_log_payload_safe check (public.audit_payload_is_safe(payload))
);

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'application_audit_log' and column_name = 'scope_type') then
    alter table public.application_audit_log add column scope_type text not null default 'church' check (scope_type in ('church', 'ministry_term', 'department', 'group'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'application_audit_log' and column_name = 'scope_id') then
    alter table public.application_audit_log add column scope_id uuid not null default 'c0000000-0000-4000-8000-000000000001';
  end if;
end $$;

alter table public.application_audit_log
  drop constraint if exists application_audit_log_payload_safe;

alter table public.application_audit_log
  add constraint application_audit_log_payload_safe
  check (public.audit_payload_is_safe(payload));

create index if not exists application_audit_log_church_id_idx
  on public.application_audit_log (church_id);

create index if not exists application_audit_log_scope_idx
  on public.application_audit_log (scope_type, scope_id);

create index if not exists application_audit_log_created_at_idx
  on public.application_audit_log (created_at desc);

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Application audit log is append-only and cannot be modified or deleted';
end;
$$;

drop trigger if exists trg_protect_application_audit_log on public.application_audit_log;

create trigger trg_protect_application_audit_log
before update or delete on public.application_audit_log
for each row
execute function public.prevent_audit_log_mutation();

-- Strictly revoke direct INSERT, UPDATE, DELETE from all client roles
revoke insert, update, delete on public.application_audit_log from authenticated, anon, public;

alter table public.application_audit_log enable row level security;

drop policy if exists "Leaders can read audit logs" on public.application_audit_log;
drop policy if exists "Internal append audit logs" on public.application_audit_log;

create policy "Leaders can read audit logs"
  on public.application_audit_log
  for select
  to authenticated
  using (public.is_leader());

-- Trusted audit logging function with security definer and fixed search_path
create or replace function public.log_application_audit_event(
  p_church_id uuid,
  p_actor_id uuid,
  p_action text,
  p_scope_type text,
  p_scope_id uuid,
  p_target_type text,
  p_target_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  insert into public.application_audit_log (
    church_id,
    actor_id,
    action,
    scope_type,
    scope_id,
    target_type,
    target_id,
    payload
  ) values (
    p_church_id,
    coalesce(auth.uid(), p_actor_id),
    p_action,
    p_scope_type,
    p_scope_id,
    p_target_type,
    p_target_id,
    coalesce(p_payload, '{}'::jsonb)
  ) returning id into v_log_id;
  return v_log_id;
end;
$$;

revoke all on function public.log_application_audit_event from public, anon, authenticated;
grant execute on function public.log_application_audit_event to service_role;

-- 6.1 Audit trigger for system role assignments
create or replace function public.audit_system_role_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_church_id uuid;
  v_target_id uuid;
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'system_role.assigned';
    v_church_id := new.church_id;
    v_target_id := new.id;
    v_payload := jsonb_build_object(
      'user_id', new.user_id,
      'role', new.role,
      'church_id', new.church_id
    );
  elsif tg_op = 'UPDATE' then
    v_action := 'system_role.updated';
    v_church_id := new.church_id;
    v_target_id := new.id;
    v_payload := jsonb_build_object(
      'user_id', new.user_id,
      'old_role', old.role,
      'new_role', new.role,
      'church_id', new.church_id
    );
  elsif tg_op = 'DELETE' then
    v_action := 'system_role.removed';
    v_church_id := old.church_id;
    v_target_id := old.id;
    v_payload := jsonb_build_object(
      'user_id', old.user_id,
      'role', old.role,
      'church_id', old.church_id
    );
  end if;

  insert into public.application_audit_log (
    church_id,
    actor_id,
    action,
    scope_type,
    scope_id,
    target_type,
    target_id,
    payload
  ) values (
    v_church_id,
    auth.uid(),
    v_action,
    'church',
    v_church_id,
    'system_role_assignment',
    v_target_id,
    v_payload
  );

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists trg_audit_system_role_assignment on public.system_role_assignment;

create trigger trg_audit_system_role_assignment
after insert or update or delete on public.system_role_assignment
for each row
execute function public.audit_system_role_assignment_change();

-- 6.2 Audit trigger for term role assignments
create or replace function public.audit_term_role_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_church_id uuid;
  v_term_id uuid;
  v_target_id uuid;
  v_payload jsonb;
begin
  if tg_op in ('DELETE', 'UPDATE') then
    v_term_id := old.ministry_term_id;
    v_target_id := old.id;
  else
    v_term_id := new.ministry_term_id;
    v_target_id := new.id;
  end if;

  select m.church_id into v_church_id
  from public.ministry_term mt
  join public.ministry m on m.id = mt.ministry_id
  where mt.id = v_term_id;

  if tg_op = 'INSERT' then
    v_action := 'term_role.assigned';
    v_payload := jsonb_build_object(
      'member_profile_id', new.member_profile_id,
      'role', new.role,
      'ministry_term_id', new.ministry_term_id
    );
  elsif tg_op = 'UPDATE' then
    v_action := 'term_role.updated';
    v_payload := jsonb_build_object(
      'member_profile_id', new.member_profile_id,
      'old_role', old.role,
      'new_role', new.role,
      'ministry_term_id', new.ministry_term_id
    );
  elsif tg_op = 'DELETE' then
    v_action := 'term_role.removed';
    v_payload := jsonb_build_object(
      'member_profile_id', old.member_profile_id,
      'role', old.role,
      'ministry_term_id', old.ministry_term_id
    );
  end if;

  insert into public.application_audit_log (
    church_id,
    actor_id,
    action,
    scope_type,
    scope_id,
    target_type,
    target_id,
    payload
  ) values (
    v_church_id,
    auth.uid(),
    v_action,
    'ministry_term',
    v_term_id,
    'term_role_assignment',
    v_target_id,
    v_payload
  );

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists trg_audit_term_role_assignment on public.term_role_assignment;

create trigger trg_audit_term_role_assignment
after insert or update or delete on public.term_role_assignment
for each row
execute function public.audit_term_role_assignment_change();

-- 6.3 Audit trigger for ministry term lifecycle transitions
create or replace function public.audit_ministry_term_lifecycle_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_id uuid;
begin
  select m.church_id into v_church_id
  from public.ministry m
  where m.id = new.ministry_id;

  insert into public.application_audit_log (
    church_id,
    actor_id,
    action,
    scope_type,
    scope_id,
    target_type,
    target_id,
    payload
  ) values (
    v_church_id,
    auth.uid(),
    'ministry_term.lifecycle_transition',
    'ministry_term',
    new.id,
    'ministry_term',
    new.id,
    jsonb_build_object(
      'term_id', new.id,
      'term_name', new.name,
      'ministry_id', new.ministry_id,
      'old_lifecycle', old.lifecycle,
      'new_lifecycle', new.lifecycle
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_audit_ministry_term_lifecycle on public.ministry_term;

create trigger trg_audit_ministry_term_lifecycle
after update on public.ministry_term
for each row
when (old.lifecycle is distinct from new.lifecycle)
execute function public.audit_ministry_term_lifecycle_change();

-- ============================================================================
-- 7. Bootstrap Master Admin & Audit Entry (Blocker 3, Fail-Closed)
-- ============================================================================

do $$
declare
  v_church_count int;
  v_church_id uuid := 'c0000000-0000-4000-8000-000000000001';
  v_master_user_id uuid := 'a841f275-afc9-46cf-9b23-a6268ab2fb4b';
  v_master_profile_id uuid := 'e1a52f99-6f89-425a-aaca-676369dd6991';
  v_master_email text := 'anphucphamtrinh@gmail.com';
  v_master_assignment_id uuid;
begin
  select count(*) into v_church_count from public.church;

  if v_church_count > 0 then
    -- Preflight 1: target church must exist
    if not exists (select 1 from public.church where id = v_church_id) then
      raise exception 'Bootstrap preflight failed: Target church % not found', v_church_id;
    end if;

    -- Preflight 2: target auth user must exist AND normalized email must match v_master_email exactly
    if not exists (
      select 1 from auth.users
      where id = v_master_user_id
        and lower(trim(email)) = lower(trim(v_master_email))
    ) then
      raise exception 'Bootstrap preflight failed: Auth user % with email % not found in auth.users', v_master_user_id, v_master_email;
    end if;

    -- Preflight 3: target member profile must exist in target church
    if not exists (select 1 from public.member_profile where id = v_master_profile_id and church_id = v_church_id) then
      raise exception 'Bootstrap preflight failed: Member profile % not found in church %', v_master_profile_id, v_church_id;
    end if;

    -- Preflight 4: fail-closed if target profile is already linked to another user
    if exists (
      select 1 from public.member_profile
      where id = v_master_profile_id
        and user_id is not null
        and user_id <> v_master_user_id
    ) then
      raise exception 'Bootstrap preflight failed: Member profile % is already linked to another user', v_master_profile_id;
    end if;

    -- Preflight 5: fail-closed if target profile already has a conflicting email
    if exists (
      select 1 from public.member_profile
      where id = v_master_profile_id
        and email is not null
        and lower(trim(email)) <> lower(trim(v_master_email))
    ) then
      raise exception 'Bootstrap preflight failed: Member profile % has conflicting email', v_master_profile_id;
    end if;

    -- Preflight 6: fail-closed if another member profile is already linked to target auth user
    if exists (
      select 1 from public.member_profile
      where user_id = v_master_user_id
        and id <> v_master_profile_id
    ) then
      raise exception 'Bootstrap preflight failed: Auth user % is already linked to another member profile', v_master_user_id;
    end if;

    -- Preflight 7: fail-closed if another member profile already has target email
    if exists (
      select 1 from public.member_profile
      where lower(trim(email)) = lower(trim(v_master_email))
        and id <> v_master_profile_id
    ) then
      raise exception 'Bootstrap preflight failed: Email % is already associated with another member profile', v_master_email;
    end if;

    -- Preflight 8: fail-closed if church already has a different master_admin
    if exists (
      select 1 from public.system_role_assignment
      where church_id = v_church_id
        and role = 'master_admin'
        and user_id <> v_master_user_id
    ) then
      raise exception 'Bootstrap preflight failed: Church % already has a different master_admin', v_church_id;
    end if;

    -- Link Master Admin profile
    update public.member_profile
    set user_id = v_master_user_id,
        email = v_master_email
    where id = v_master_profile_id;

    -- Insert or update master_admin system role assignment
    insert into public.system_role_assignment (church_id, user_id, role)
    values (v_church_id, v_master_user_id, 'master_admin')
    on conflict (church_id, user_id) do update
    set role = 'master_admin'
    returning id into v_master_assignment_id;

    if v_master_assignment_id is null then
      select id into v_master_assignment_id
      from public.system_role_assignment
      where church_id = v_church_id and user_id = v_master_user_id and role = 'master_admin';
    end if;

    -- Enforce single master_admin postcondition
    if (select count(*) from public.system_role_assignment where church_id = v_church_id and role = 'master_admin') <> 1 then
      raise exception 'Bootstrap validation failed: Church % does not have exactly one master_admin', v_church_id;
    end if;

    -- Initial audit log entry for bootstrap
    insert into public.application_audit_log (
      church_id,
      actor_id,
      action,
      scope_type,
      scope_id,
      target_type,
      target_id,
      payload
    ) values (
      v_church_id,
      v_master_user_id,
      'authorization.bootstrap_master_admin',
      'church',
      v_church_id,
      'system_role_assignment',
      v_master_assignment_id,
      jsonb_build_object(
        'user_id', v_master_user_id,
        'role', 'master_admin',
        'member_profile_id', v_master_profile_id,
        'church_id', v_church_id
      )
    );
  end if;
end $$;
