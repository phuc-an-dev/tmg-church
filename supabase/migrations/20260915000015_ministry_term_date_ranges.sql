-- A dated ministry term represents one operational period. Periods within a
-- ministry must not overlap, making the term that covers the current date
-- deterministic for direct Ministry navigation.
create extension if not exists btree_gist;

alter table public.ministry_term
  add constraint ministry_term_non_overlapping_dates
  exclude using gist (
    ministry_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (start_date is not null and end_date is not null);
