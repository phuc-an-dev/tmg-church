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
