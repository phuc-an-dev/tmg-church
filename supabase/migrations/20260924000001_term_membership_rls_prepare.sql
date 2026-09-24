-- Allow system admins and authorized ministry leaders to enroll/manage ministry memberships in draft and active terms.

drop policy if exists "System admins access ministry membership" on public.ministry_membership;

create policy "System admins access ministry membership" on public.ministry_membership for all to authenticated
using (public.has_capability('term.read_history', 'ministry_term', ministry_term_id))
with check (public.has_capability('term.structure.prepare', 'ministry_term', ministry_term_id));
