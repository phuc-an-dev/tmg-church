-- Assignment screens read enabled service roles through existing scoped RLS policies.
-- Writes remain handled by the existing authorized RPC functions.
grant select on public.session_service_role, public.session_service_department to authenticated;

notify pgrst, 'reload schema';
