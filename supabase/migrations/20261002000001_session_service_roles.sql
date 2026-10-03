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

drop function public.set_session_service_departments(uuid, uuid[]);
drop table public.session_service_department;
