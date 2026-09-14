-- Segments are addressed by a stable, church-scoped public slug.  The
-- application generates Vietnamese names as ASCII slugs before insertion.
alter table public.member_segment add column slug text;

-- A deterministic fallback makes the migration safe for existing records;
-- new records use the Vietnamese-aware application slug generator.
update public.member_segment
set slug = concat('segment-', replace(id::text, '-', ''))
where slug is null;

alter table public.member_segment
  alter column slug set not null,
  add constraint member_segment_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint member_segment_church_id_slug_key unique (church_id, slug);
