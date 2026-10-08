-- Allow authenticated session queries and assignments through existing scoped RLS policies.
grant select, insert, update, delete on public.group_session_assignment to authenticated;

notify pgrst, 'reload schema';
