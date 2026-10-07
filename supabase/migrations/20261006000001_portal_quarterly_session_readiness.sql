create table public.ministry_session_exemption (
  ministry_term_id uuid not null references public.ministry_term(id) on delete cascade,
  session_date date not null,
  reason text check (reason is null or char_length(trim(reason)) <= 240),
  created_by uuid not null default public.authorization_current_member_profile_id()
    references public.member_profile(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (ministry_term_id, session_date),
  constraint ministry_session_exemption_sunday check (extract(dow from session_date) = 0)
);

alter table public.ministry_session_exemption enable row level security;
revoke all on public.ministry_session_exemption from public, anon, authenticated;

create or replace function public.portal_ministry_quarter_readiness(
  p_term_id uuid,
  p_department_id uuid,
  p_start_date date,
  p_end_date date
) returns table (
  session_id uuid,
  session_slug text,
  session_title text,
  session_date date,
  selected_role_count integer,
  assigned_role_count integer,
  unassigned_role_names text[]
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date
    or p_end_date - p_start_date > 100 then
    raise exception 'Invalid readiness date range' using errcode = '22023';
  end if;

  if not public.has_capability('ministry.operational.manage', 'ministry_term', p_term_id)
    or not public.has_capability('department.service_role.manage', 'department', p_department_id)
    or not exists (
      select 1 from public.term_department td
      where td.id = p_department_id and td.ministry_term_id = p_term_id
    ) then
    raise exception 'Ministry session readiness access denied' using errcode = '42501';
  end if;

  return query
  select
    ms.id,
    ms.slug,
    ms.title,
    ms.session_date,
    count(distinct dsr.id)::integer,
    count(distinct dsr.id) filter (where exists (
      select 1 from public.service_assignment sa
      where sa.ministry_session_id = ms.id
        and sa.department_service_role_id = dsr.id
    ))::integer,
    coalesce(
      array_agg(distinct dsr.name order by dsr.name) filter (where dsr.id is not null and not exists (
        select 1 from public.service_assignment sa
        where sa.ministry_session_id = ms.id
          and sa.department_service_role_id = dsr.id
      )),
      array[]::text[]
    )
  from public.ministry_session ms
  left join public.session_service_role ssr on ssr.ministry_session_id = ms.id
  left join public.department_service_role dsr
    on dsr.id = ssr.department_service_role_id
    and dsr.term_department_id = p_department_id
  where ms.ministry_term_id = p_term_id
    and ms.term_department_id is null
    and ms.term_group_id is null
    and ms.session_date between p_start_date and p_end_date
  group by ms.id, ms.slug, ms.title, ms.session_date
  order by ms.session_date, ms.title;
end;
$$;

create or replace function public.portal_ministry_session_exemptions(
  p_term_id uuid,
  p_start_date date,
  p_end_date date
) returns table (session_date date, reason text)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date
    or p_end_date - p_start_date > 100 then
    raise exception 'Invalid exemption date range' using errcode = '22023';
  end if;
  if not public.has_capability('ministry.operational.manage', 'ministry_term', p_term_id) then
    raise exception 'Ministry session exemption access denied' using errcode = '42501';
  end if;

  return query
  select e.session_date, e.reason
  from public.ministry_session_exemption e
  where e.ministry_term_id = p_term_id
    and e.session_date between p_start_date and p_end_date
  order by e.session_date;
end;
$$;

create or replace function public.portal_save_ministry_session_exemption(
  p_term_id uuid,
  p_session_date date,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_session_date is null or extract(dow from p_session_date) <> 0
    or p_session_date < current_date
    or (p_reason is not null and char_length(trim(p_reason)) > 240) then
    raise exception 'Invalid session exemption' using errcode = '22023';
  end if;
  if not public.has_capability('ministry.operational.manage', 'ministry_term', p_term_id) then
    raise exception 'Ministry session exemption access denied' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.ministry_session ms
    where ms.ministry_term_id = p_term_id
      and ms.term_department_id is null
      and ms.term_group_id is null
      and ms.session_date = p_session_date
  ) then
    raise exception 'A ministry session already exists for this date' using errcode = '23505';
  end if;

  insert into public.ministry_session_exemption (ministry_term_id, session_date, reason)
  values (p_term_id, p_session_date, nullif(trim(p_reason), ''))
  on conflict (ministry_term_id, session_date) do update
    set reason = excluded.reason,
        created_by = public.authorization_current_member_profile_id(),
        created_at = now();
end;
$$;

create or replace function public.portal_delete_ministry_session_exemption(
  p_term_id uuid,
  p_session_date date
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('ministry.operational.manage', 'ministry_term', p_term_id) then
    raise exception 'Ministry session exemption access denied' using errcode = '42501';
  end if;
  delete from public.ministry_session_exemption
  where ministry_term_id = p_term_id and session_date = p_session_date;
end;
$$;

create or replace function public.clear_ministry_session_exemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.term_department_id is null and new.term_group_id is null then
    delete from public.ministry_session_exemption
    where ministry_term_id = new.ministry_term_id and session_date = new.session_date;
  end if;
  return new;
end;
$$;

create trigger trg_clear_ministry_session_exemption
after insert or update of ministry_term_id, session_date, term_department_id, term_group_id
on public.ministry_session
for each row execute function public.clear_ministry_session_exemption();

revoke all on function public.portal_ministry_quarter_readiness(uuid, uuid, date, date) from public, anon;
revoke all on function public.portal_ministry_session_exemptions(uuid, date, date) from public, anon;
revoke all on function public.portal_save_ministry_session_exemption(uuid, date, text) from public, anon;
revoke all on function public.portal_delete_ministry_session_exemption(uuid, date) from public, anon;
revoke all on function public.clear_ministry_session_exemption() from public, anon, authenticated;
grant execute on function public.portal_ministry_quarter_readiness(uuid, uuid, date, date) to authenticated;
grant execute on function public.portal_ministry_session_exemptions(uuid, date, date) to authenticated;
grant execute on function public.portal_save_ministry_session_exemption(uuid, date, text) to authenticated;
grant execute on function public.portal_delete_ministry_session_exemption(uuid, date) to authenticated;
