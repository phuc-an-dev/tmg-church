-- Groups and departments use the same visual identity model as ministries.
-- Slugs are backfilled from normalized Vietnamese names and disambiguated per term.
alter table public.term_group
  add column slug text,
  add column accent_color text not null default '#3b82f6',
  add column icon_key text not null default 'layers-3';

alter table public.term_department
  add column slug text,
  add column accent_color text not null default '#3b82f6',
  add column icon_key text not null default 'layers-3';

with normalized as (
  select
    id,
    ministry_term_id,
    created_at,
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(
          translate(
            normalize(replace(lower(name), 'đ', 'd'), NFD),
            U&'\0300\0301\0303\0309\0323\0302\0306\031B',
            ''
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        ''
      ),
      'group'
    ) as base_slug
  from public.term_group
), ranked as (
  select
    id,
    base_slug,
    row_number() over (
      partition by ministry_term_id, base_slug
      order by created_at, id
    ) as slug_number
  from normalized
)
update public.term_group as target
set slug = ranked.base_slug || case
  when ranked.slug_number = 1 then ''
  else '-' || ranked.slug_number::text
end
from ranked
where target.id = ranked.id;

with normalized as (
  select
    id,
    ministry_term_id,
    created_at,
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(
          translate(
            normalize(replace(lower(name), 'đ', 'd'), NFD),
            U&'\0300\0301\0303\0309\0323\0302\0306\031B',
            ''
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        ''
      ),
      'department'
    ) as base_slug
  from public.term_department
), ranked as (
  select
    id,
    base_slug,
    row_number() over (
      partition by ministry_term_id, base_slug
      order by created_at, id
    ) as slug_number
  from normalized
)
update public.term_department as target
set slug = ranked.base_slug || case
  when ranked.slug_number = 1 then ''
  else '-' || ranked.slug_number::text
end
from ranked
where target.id = ranked.id;

alter table public.term_group
  alter column slug set not null,
  add constraint term_group_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint term_group_ministry_term_id_slug_key
    unique (ministry_term_id, slug),
  add constraint term_group_accent_color_check
    check (accent_color ~ '^#[0-9a-f]{6}$'),
  add constraint term_group_icon_key_check
    check (icon_key in (
      'layers-3', 'church', 'cross', 'users', 'user-round',
      'user-round-check', 'user-round-plus', 'handshake', 'heart',
      'sparkles', 'smile', 'party-popper', 'gamepad-2', 'dice-5',
      'briefcase-business', 'trending-up',
      'chart-no-axes-column-increasing', 'target', 'award', 'trophy',
      'lightbulb', 'book-open', 'graduation-cap', 'compass', 'globe-2',
      'flame', 'leaf', 'sun', 'moon', 'cloud', 'zap', 'music-2',
      'microphone-2', 'baby'
    ));

alter table public.term_department
  alter column slug set not null,
  add constraint term_department_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint term_department_ministry_term_id_slug_key
    unique (ministry_term_id, slug),
  add constraint term_department_accent_color_check
    check (accent_color ~ '^#[0-9a-f]{6}$'),
  add constraint term_department_icon_key_check
    check (icon_key in (
      'layers-3', 'church', 'cross', 'users', 'user-round',
      'user-round-check', 'user-round-plus', 'handshake', 'heart',
      'sparkles', 'smile', 'party-popper', 'gamepad-2', 'dice-5',
      'briefcase-business', 'trending-up',
      'chart-no-axes-column-increasing', 'target', 'award', 'trophy',
      'lightbulb', 'book-open', 'graduation-cap', 'compass', 'globe-2',
      'flame', 'leaf', 'sun', 'moon', 'cloud', 'zap', 'music-2',
      'microphone-2', 'baby'
    ));
