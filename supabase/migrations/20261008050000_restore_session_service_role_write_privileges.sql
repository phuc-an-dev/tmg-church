-- The security-invoker service role RPC needs writes allowed by the existing scoped RLS policies.
grant insert, delete on public.session_service_role to authenticated;

notify pgrst, 'reload schema';
