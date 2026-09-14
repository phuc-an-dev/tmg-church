-- Ministry terms have an explicit operational lifecycle. Existing terms are
-- retained as drafts so no historical date range is implicitly activated.
alter table public.ministry_term
  add column lifecycle text not null default 'draft'
  check (lifecycle in ('draft', 'active', 'closed'));

create unique index ministry_term_one_active_per_ministry_idx
  on public.ministry_term (ministry_id)
  where lifecycle = 'active';
