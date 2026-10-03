drop index if exists public.term_department_term_code_idx;

alter table public.term_department
  drop constraint if exists term_department_department_code_check,
  drop column if exists department_code;
