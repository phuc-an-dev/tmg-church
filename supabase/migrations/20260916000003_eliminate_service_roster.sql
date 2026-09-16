-- Migration: Eliminate service_roster and simplify service_assignment
-- 1. Drop existing functions that depend on service_roster
drop function if exists public.save_service_assignment(uuid, uuid, uuid, uuid);
drop function if exists public.batch_save_service_assignments(uuid, uuid, uuid, uuid[]);

-- 2. Drop integrity trigger on service_assignment
drop trigger if exists trg_service_assignment_integrity on public.service_assignment;
drop function if exists public.check_service_assignment_integrity();

-- 3. Update service_assignment table
alter table public.service_assignment drop constraint if exists service_assignment_unique;
drop index if exists public.service_assignment_roster_idx;
alter table public.service_assignment drop column if exists service_roster_id;

alter table public.service_assignment
  add constraint service_assignment_unique
  unique (ministry_session_id, department_service_role_id, ministry_membership_id);

-- 4. Drop table service_roster
drop table if exists public.service_roster cascade;

-- 5. Recreate check_service_assignment_integrity trigger
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
begin
  select td.ministry_term_id into v_role_term_id
  from public.department_service_role dsr
  join public.term_department td on td.id = dsr.term_department_id
  where dsr.id = new.department_service_role_id;

  select ministry_term_id into v_session_term_id
  from public.ministry_session
  where id = new.ministry_session_id;

  if v_role_term_id is null or v_session_term_id is null or v_role_term_id <> v_session_term_id then
    raise exception 'Service role department and session must belong to the same ministry term';
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
before insert or update of department_service_role_id, ministry_session_id, ministry_membership_id on public.service_assignment
for each row
execute function public.check_service_assignment_integrity();

-- 6. Recreate simplified RPC functions
create or replace function public.save_service_assignment(
  target_session_id uuid,
  target_role_id uuid,
  target_membership_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_term_id uuid;
  v_role_term_id uuid;
  v_membership_term_id uuid;
  v_inserted_id uuid;
begin
  select ministry_term_id into v_session_term_id
  from public.ministry_session
  where id = target_session_id;

  if v_session_term_id is null then
    raise exception 'Session was not found';
  end if;

  select td.ministry_term_id into v_role_term_id
  from public.department_service_role dsr
  join public.term_department td on td.id = dsr.term_department_id
  where dsr.id = target_role_id;

  if v_role_term_id is null or v_role_term_id <> v_session_term_id then
    raise exception 'Service role does not belong to the session ministry term';
  end if;

  select ministry_term_id into v_membership_term_id
  from public.ministry_membership
  where id = target_membership_id;

  if v_membership_term_id is null or v_membership_term_id <> v_session_term_id then
    raise exception 'Member is not enrolled in this session ministry term';
  end if;

  insert into public.service_assignment (
    department_service_role_id,
    ministry_session_id,
    ministry_membership_id
  ) values (
    target_role_id,
    target_session_id,
    target_membership_id
  )
  on conflict (
    ministry_session_id,
    department_service_role_id,
    ministry_membership_id
  ) do update set created_at = public.service_assignment.created_at
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

revoke execute on function public.save_service_assignment(uuid, uuid, uuid) from public, anon;
grant execute on function public.save_service_assignment(uuid, uuid, uuid) to authenticated;

create or replace function public.batch_save_service_assignments(
  target_session_id uuid,
  target_role_id uuid,
  target_membership_ids uuid[]
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_term_id uuid;
  v_role_term_id uuid;
  v_mid uuid;
  v_count integer := 0;
begin
  select ministry_term_id into v_session_term_id
  from public.ministry_session
  where id = target_session_id;

  if v_session_term_id is null then
    raise exception 'Session was not found';
  end if;

  select td.ministry_term_id into v_role_term_id
  from public.department_service_role dsr
  join public.term_department td on td.id = dsr.term_department_id
  where dsr.id = target_role_id;

  if v_role_term_id is null or v_role_term_id <> v_session_term_id then
    raise exception 'Service role does not belong to the session ministry term';
  end if;

  foreach v_mid in array target_membership_ids loop
    if exists (
      select 1 from public.ministry_membership
      where id = v_mid and ministry_term_id = v_session_term_id
    ) then
      insert into public.service_assignment (
        department_service_role_id,
        ministry_session_id,
        ministry_membership_id
      ) values (
        target_role_id,
        target_session_id,
        v_mid
      )
      on conflict (
        ministry_session_id,
        department_service_role_id,
        ministry_membership_id
      ) do nothing;

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.batch_save_service_assignments(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.batch_save_service_assignments(uuid, uuid, uuid[]) to authenticated;
