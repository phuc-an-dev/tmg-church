-- Lucide's icon catalog evolves independently of the database. The application
-- validates that keys exist; Postgres keeps only the durable slug format.
alter table public.member_segment
  drop constraint member_segment_icon_key_check,
  add constraint member_segment_icon_key_check
    check (icon_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
