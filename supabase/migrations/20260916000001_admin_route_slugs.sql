-- Protected browser routes use immutable, Church-scoped slugs. UUIDs remain
-- internal relation keys and Server Action inputs.
alter table public.member_profile add column slug text;
alter table public.ministry_session
  add column church_id uuid references public.church(id) on delete restrict,
  add column slug text;

-- Existing records are normalized with the same Vietnamese-safe rules as the
-- application utility, then deterministically suffixed within each scope.
with normalized as (
  select
    id,
    church_id,
    created_at,
    case
      when base_slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then base_slug || '-member'
      else base_slug
    end as base_slug
  from (
    select
      id,
      church_id,
      created_at,
      coalesce(
        nullif(
          trim(both '-' from regexp_replace(
            translate(
              normalize(replace(lower(full_name), 'đ', 'd'), NFD),
              U&'\0300\0301\0303\0309\0323\0302\0306\031B',
              ''
            ),
            '[^a-z0-9]+',
            '-',
            'g'
          )),
          ''
        ),
        'member'
      ) as base_slug
    from public.member_profile
  ) source
), ranked as (
  select
    id,
    base_slug,
    row_number() over (
      partition by church_id, base_slug
      order by created_at, id
    ) as slug_number
  from normalized
)
update public.member_profile target
set slug = ranked.base_slug || case
  when ranked.slug_number = 1 then ''
  else '-' || ranked.slug_number::text
end
from ranked
where target.id = ranked.id;

update public.ministry_session session
set church_id = ministry.church_id
from public.ministry_term term
join public.ministry ministry on ministry.id = term.ministry_id
where term.id = session.ministry_term_id
  and session.church_id is null;

with normalized as (
  select
    id,
    church_id,
    created_at,
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(
          translate(
            normalize(replace(lower(title), 'đ', 'd'), NFD),
            U&'\0300\0301\0303\0309\0323\0302\0306\031B',
            ''
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        ''
      ),
      'session'
    ) || '-' || to_char(session_date, 'YYYY-MM-DD') as base_slug
  from public.ministry_session
), ranked as (
  select
    id,
    base_slug,
    row_number() over (
      partition by church_id, base_slug
      order by created_at, id
    ) as slug_number
  from normalized
)
update public.ministry_session target
set slug = ranked.base_slug || case
  when ranked.slug_number = 1 then ''
  else '-' || ranked.slug_number::text
end
from ranked
where target.id = ranked.id;

alter table public.member_profile
  alter column slug set not null,
  add constraint member_profile_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint member_profile_church_id_slug_key unique (church_id, slug);

alter table public.ministry_session
  alter column church_id set not null,
  alter column slug set not null,
  add constraint ministry_session_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint ministry_session_church_id_slug_key unique (church_id, slug);

-- UUID URLs are deliberately rejected. Preserve access to any legacy routed
-- record whose pre-existing slug happens to look like a UUID by deterministically
-- rewriting it before slugs become immutable.
update public.ministry
set slug = concat(slug, '-ministry-', replace(id::text, '-', ''))
where slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

update public.ministry_term
set slug = concat(slug, '-term-', replace(id::text, '-', ''))
where slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

update public.member_segment
set slug = concat(slug, '-segment-', replace(id::text, '-', ''))
where slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- The Church scope is a projection of the immutable ministry term. Maintain it
-- in the database so the unique constraint cannot be bypassed by a client.
create or replace function public.set_ministry_session_church_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select ministry.church_id
  into new.church_id
  from public.ministry_term term
  join public.ministry ministry on ministry.id = term.ministry_id
  where term.id = new.ministry_term_id;

  if new.church_id is null then
    raise exception 'Session ministry term was not found';
  end if;

  return new;
end;
$$;

create trigger trg_ministry_session_set_church_id
before insert or update of ministry_term_id on public.ministry_session
for each row execute function public.set_ministry_session_church_id();

create trigger trg_member_profile_slug_immutable
before update of slug on public.member_profile
for each row execute function public.prevent_scope_reassignment('slug', 'Member profile slug');

create trigger trg_ministry_slug_immutable
before update of slug on public.ministry
for each row execute function public.prevent_scope_reassignment('slug', 'Ministry slug');

create trigger trg_ministry_term_slug_immutable
before update of slug on public.ministry_term
for each row execute function public.prevent_scope_reassignment('slug', 'Ministry term slug');

create trigger trg_member_segment_slug_immutable
before update of slug on public.member_segment
for each row execute function public.prevent_scope_reassignment('slug', 'Member segment slug');

create trigger trg_ministry_session_slug_immutable
before update of slug on public.ministry_session
for each row execute function public.prevent_scope_reassignment('slug', 'Session slug');

create trigger trg_ministry_session_church_immutable
before update of church_id on public.ministry_session
for each row execute function public.prevent_scope_reassignment('church_id', 'Session church relationship');

revoke all on function public.set_ministry_session_church_id() from public, anon, authenticated;
