begin;

alter table public.care_flag
  add column term_group_id uuid references public.term_group(id) on delete restrict,
  add column assignee_member_profile_id uuid references public.member_profile(id) on delete restrict,
  add column created_by_member_profile_id uuid references public.member_profile(id) on delete restrict,
  add column resolved_by_member_profile_id uuid references public.member_profile(id) on delete restrict,
  add column slug text not null default ('care-' || replace(gen_random_uuid()::text, '-', '')),
  add column status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  add column next_contact_date date,
  add column resolved_at timestamptz,
  add column source text not null default 'manual' check (source in ('manual', 'attendance')),
  add column source_evidence jsonb not null default '{}'::jsonb,
  add constraint care_flag_resolved_state check (
    (status = 'resolved' and resolved_at is not null and resolved_by_member_profile_id is not null)
    or (status <> 'resolved' and resolved_at is null and resolved_by_member_profile_id is null)
  );

alter table public.care_note
  add column author_member_profile_id uuid references public.member_profile(id) on delete restrict;

create unique index care_flag_slug_unique on public.care_flag(slug);
create unique index care_flag_open_group_member_unique
  on public.care_flag(member_profile_id, ministry_term_id, term_group_id, flag_type)
  where term_group_id is not null and status in ('open', 'in_progress');

create function public.assert_care_follow_up_integrity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception using message = 'immutable', errcode = 'P0001'; end if;
  if tg_op = 'UPDATE' then
    if (new.member_profile_id, new.ministry_term_id, new.term_group_id, new.flag_type, new.slug,
        new.source, new.source_evidence, new.created_by_member_profile_id, new.created_at)
      is distinct from
       (old.member_profile_id, old.ministry_term_id, old.term_group_id, old.flag_type, old.slug,
        old.source, old.source_evidence, old.created_by_member_profile_id, old.created_at)
      or old.status = 'resolved' then
      raise exception using message = 'immutable', errcode = 'P0001';
    end if;
  end if;
  if new.term_group_id is not null and not exists (
    select 1 from public.term_group g where g.id = new.term_group_id and g.ministry_term_id = new.ministry_term_id
  ) then raise exception using message = 'invalid', errcode = 'P0001'; end if;
  if exists (
    select 1 from public.member_profile p
    where p.id in (new.assignee_member_profile_id, new.created_by_member_profile_id, new.resolved_by_member_profile_id)
      and p.church_id <> (select church_id from public.member_profile where id = new.member_profile_id)
  ) then raise exception using message = 'invalid', errcode = 'P0001'; end if;
  return new;
end;
$$;
create trigger trg_care_follow_up_integrity before insert or update or delete on public.care_flag
for each row execute function public.assert_care_follow_up_integrity();

create function public.assert_care_note_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then raise exception using message = 'immutable', errcode = 'P0001'; end if;
  if new.author_member_profile_id is null or char_length(trim(new.note)) not between 1 and 4000 then
    raise exception using message = 'invalid', errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_care_note_append_only before insert or update or delete on public.care_note
for each row execute function public.assert_care_note_append_only();
revoke all on function public.assert_care_follow_up_integrity(), public.assert_care_note_append_only() from public, anon, authenticated;
commit;
