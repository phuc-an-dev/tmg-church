-- Lucide icon keys are versioned by the application, so do not freeze the
-- catalog in a database constraint. The application only exposes known Lucide
-- names; this check retains a safe, canonical storage format for direct writes.
alter table public.ministry
  drop constraint ministry_icon_key_check,
  add constraint ministry_icon_key_check
    check (icon_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.term_group
  drop constraint term_group_icon_key_check,
  add constraint term_group_icon_key_check
    check (icon_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.term_department
  drop constraint term_department_icon_key_check,
  add constraint term_department_icon_key_check
    check (icon_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
