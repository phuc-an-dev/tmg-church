-- Allow department_code to be optional/nullable for flexible ministry structures
alter table public.term_department
  alter column department_code drop not null;

alter table public.term_department
  drop constraint if exists term_department_department_code_check;

alter table public.term_department
  add constraint term_department_department_code_check
  check (
    department_code is null
    or department_code in (
      'social_support',
      'small_groups',
      'pastoral',
      'music',
      'worship',
      'visitation_care',
      'evangelism'
    )
  );

drop index if exists public.term_department_term_code_idx;

create unique index term_department_term_code_idx
  on public.term_department (ministry_term_id, department_code)
  where department_code is not null;
