-- Migration: Atomic church creation function & database-level singleton enforcement
-- Purpose: Ensures zero-to-one church creation is concurrency-safe and enforces the single-Church invariant at the database boundary

-- 1. Database-level singleton constraint/index on public.church
-- Enforces that every insert path (direct table inserts, privileged clients, RPCs) permits at most one Church.
create unique index if not exists church_singleton_idx on public.church ((true));

-- 2. Function: create_initial_church
create or replace function public.create_initial_church(
  church_name text,
  church_slug text
) returns setof public.church
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Require caller to be an authorized leader
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  -- Exclusively lock the church table to serialize concurrent creation requests
  lock table public.church in exclusive mode;

  -- Ensure no existing church record exists
  if (select count(*) from public.church) > 0 then
    raise exception 'A church already exists in the system' using errcode = '23505';
  end if;

  return query
  insert into public.church (name, slug)
  values (church_name, church_slug)
  returning *;
end;
$$;

-- 3. Execution privileges
-- Explicitly revoke execution from PUBLIC and anon, grant only to authenticated
revoke all on function public.create_initial_church(text, text) from public;
revoke all on function public.create_initial_church(text, text) from anon;
grant execute on function public.create_initial_church(text, text) to authenticated;
