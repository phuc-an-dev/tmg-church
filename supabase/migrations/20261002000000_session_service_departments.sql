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

create or replace function public.set_session_service_departments(
  target_session_id uuid,
  target_department_ids uuid[]
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
    raise exception 'Session service departments access denied' using errcode = '42501';
  end if;

  if exists (
    select 1
    from unnest(target_department_ids) as target_department_id
    left join public.term_department td on td.id = target_department_id and td.ministry_term_id = v_term_id
    where td.id is null
  ) then
    raise exception 'Department does not belong to this session term' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.session_service_department ssd
    join public.department_service_role dsr on dsr.term_department_id = ssd.term_department_id
    join public.service_assignment sa on sa.department_service_role_id = dsr.id and sa.ministry_session_id = ssd.ministry_session_id
    where ssd.ministry_session_id = target_session_id
      and ssd.term_department_id <> all(target_department_ids)
  ) then
    raise exception 'Remove service assignments before removing a department' using errcode = '23503';
  end if;

  delete from public.session_service_department
  where ministry_session_id = target_session_id
    and term_department_id <> all(target_department_ids);

  insert into public.session_service_department (ministry_session_id, term_department_id)
  select target_session_id, target_department_id
  from unnest(target_department_ids) as target_department_id
  on conflict (ministry_session_id, term_department_id) do nothing;
end;
$$;

revoke all on function public.set_session_service_departments(uuid, uuid[]) from public, anon;
grant execute on function public.set_session_service_departments(uuid, uuid[]) to authenticated;

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
      select 1 from public.session_service_department
      where ministry_session_id = new.ministry_session_id
        and term_department_id = v_department_id
    )
    or not exists (
      select 1 from public.ministry_assignment
      where ministry_membership_id = new.ministry_membership_id
        and term_department_id = v_department_id
    ) then
    raise exception 'Service assignment must use an assigned session department';
  end if;

  return new;
end;
$$;
