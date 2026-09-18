-- Milestone C: scoped Group Session operations for the member portal.

drop policy if exists "System admins access sessions" on public.ministry_session;
drop policy if exists "Scoped access sessions" on public.ministry_session;
create policy "Scoped session reads" on public.ministry_session for select to authenticated
using (
  public.has_capability('term.read_history', 'ministry_term', ministry_term_id)
  or (
    term_group_id is not null
    and public.has_capability('term.read_history', 'group', term_group_id)
  )
);
create policy "Scoped session inserts" on public.ministry_session for insert to authenticated
with check (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (
    term_group_id is not null
    and public.has_capability('group.session.manage', 'group', term_group_id)
  )
);
create policy "Scoped session updates" on public.ministry_session for update to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (term_group_id is not null and public.has_capability('group.session.manage', 'group', term_group_id))
)
with check (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (term_group_id is not null and public.has_capability('group.session.manage', 'group', term_group_id))
);
create policy "Scoped session deletes" on public.ministry_session for delete to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', ministry_term_id)
  or (term_group_id is not null and public.has_capability('group.session.manage', 'group', term_group_id))
);

drop policy if exists "System admins access participants" on public.session_participant;
drop policy if exists "Scoped access participants" on public.session_participant;
create policy "Scoped participant reads" on public.session_participant for select to authenticated
using (
  public.has_capability(
    'term.read_history', 'ministry_term',
    (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id)
  )
  or (
    exists (
      select 1 from public.ministry_session s
      where s.id = ministry_session_id
        and s.term_group_id is not null
        and public.has_capability('term.read_history', 'group', s.term_group_id)
    )
  )
);
create policy "Scoped participant inserts" on public.session_participant for insert to authenticated
with check (
  public.has_capability(
    'term.operational.manage', 'ministry_term',
    (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id)
  )
  or (
    exists (
      select 1 from public.ministry_session s
      where s.id = ministry_session_id
        and s.term_group_id is not null
        and public.has_capability('group.session.manage', 'group', s.term_group_id)
    )
  )
);
create policy "Scoped participant updates" on public.session_participant for update to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (select 1 from public.ministry_session s where s.id = ministry_session_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
)
with check (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (select 1 from public.ministry_session s where s.id = ministry_session_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);
create policy "Scoped participant deletes" on public.session_participant for delete to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.ministry_session s where s.id = ministry_session_id))
  or exists (select 1 from public.ministry_session s where s.id = ministry_session_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

drop policy if exists "System admins access attendance" on public.attendance_record;
drop policy if exists "Scoped access attendance" on public.attendance_record;
create policy "Scoped attendance reads" on public.attendance_record for select to authenticated
using (
  public.has_capability('term.read_history', 'ministry_term', (
    select s.ministry_term_id from public.session_participant p
    join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id
  ))
  or exists (
    select 1 from public.session_participant p
    join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id
      and s.term_group_id is not null
      and public.has_capability('term.read_history', 'group', s.term_group_id)
  )
);
create policy "Scoped attendance inserts" on public.attendance_record for insert to authenticated
with check (
  public.has_capability('term.operational.manage', 'ministry_term', (
    select s.ministry_term_id from public.session_participant p
    join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id
  ))
  or exists (
    select 1 from public.session_participant p
    join public.ministry_session s on s.id = p.ministry_session_id
    where p.id = session_participant_id
      and s.term_group_id is not null
      and public.has_capability('group.session.manage', 'group', s.term_group_id)
  )
);
create policy "Scoped attendance updates" on public.attendance_record for update to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
)
with check (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);
create policy "Scoped attendance deletes" on public.attendance_record for delete to authenticated
using (
  public.has_capability('term.operational.manage', 'ministry_term', (select s.ministry_term_id from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id))
  or exists (select 1 from public.session_participant p join public.ministry_session s on s.id = p.ministry_session_id where p.id = session_participant_id and s.term_group_id is not null and public.has_capability('group.session.manage', 'group', s.term_group_id))
);

create or replace function public.create_group_session(
  p_group_id uuid,
  p_slug text,
  p_title text,
  p_session_date date
) returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_id uuid;
  v_church_id uuid;
begin
  select tg.ministry_term_id, m.church_id
    into v_term_id, v_church_id
  from public.term_group tg
  join public.ministry_term mt on mt.id = tg.ministry_term_id
  join public.ministry m on m.id = mt.ministry_id
  where tg.id = p_group_id;
  if v_term_id is null or not public.has_capability('group.session.manage', 'group', p_group_id) then
    raise exception 'Group session access denied' using errcode = '42501';
  end if;
  return query
    insert into public.ministry_session (
      church_id, ministry_term_id, term_group_id, slug, title, session_date
    ) values (
      v_church_id, v_term_id, p_group_id, p_slug, p_title, p_session_date
    ) returning ministry_session.id, ministry_session.slug;
end;
$$;

revoke all on function public.create_group_session(uuid, text, text, date) from public, anon;
grant execute on function public.create_group_session(uuid, text, text, date) to authenticated;

create or replace view public.portal_group_directory
with (security_barrier = true)
as
select tg.id,
  tg.name,
  tg.slug,
  tg.ministry_term_id,
  mt.slug as term_slug,
  m.slug as ministry_slug
from public.term_group tg
join public.ministry_term mt on mt.id = tg.ministry_term_id
join public.ministry m on m.id = mt.ministry_id
where public.has_capability('group.read', 'group', tg.id);

revoke all on public.portal_group_directory from public, anon;
grant select on public.portal_group_directory to authenticated;
