create or replace view public.portal_department_directory with (security_barrier = true) as
select td.id,
  td.name,
  td.slug,
  td.ministry_term_id,
  mt.slug as term_slug,
  m.slug as ministry_slug,
  td.accent_color,
  td.icon_key
from public.term_department td
join public.ministry_term mt on mt.id = td.ministry_term_id
join public.ministry m on m.id = mt.ministry_id
where public.has_capability('department.members.manage', 'department', td.id);

drop function public.portal_delegated_terms();

create function public.portal_delegated_terms()
returns table (
  ministry_term_id uuid,
  ministry_slug text,
  ministry_name text,
  term_slug text,
  term_name text,
  accent_color text,
  icon_key text
)
language sql security definer stable set search_path = public
as $$
  select mt.id, m.slug, m.name, mt.slug, mt.name, m.accent_color, m.icon_key
  from public.ministry_operation_delegation d
  join public.ministry_term mt on mt.id = d.ministry_term_id
  join public.ministry m on m.id = mt.ministry_id
  where d.member_profile_id = public.authorization_current_member_profile_id()
    and d.capability = 'ministry.operational.manage'
    and public.has_capability('ministry.operational.manage', 'ministry_term', mt.id)
  order by m.name, mt.name;
$$;

revoke all on function public.portal_delegated_terms() from public, anon;
grant execute on function public.portal_delegated_terms() to authenticated;

notify pgrst, 'reload schema';
