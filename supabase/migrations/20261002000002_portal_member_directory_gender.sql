-- Expose member gender through the portal member directories so leadership
-- views can render gender-tinted avatars. Column order changes force a
-- full view replacement.
drop view if exists public.portal_department_member_directory;
create view public.portal_department_member_directory with (security_barrier = true) as
select td.id as department_id,
  td.name as department_name,
  mm.id as membership_id,
  mp.id as member_id,
  mp.full_name,
  mp.gender,
  ma.id as assignment_id
from public.term_department td
join public.ministry_membership mm on mm.ministry_term_id = td.ministry_term_id
join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
left join public.ministry_assignment ma
  on ma.ministry_membership_id = mm.id and ma.term_department_id = td.id
where public.has_capability('department.members.manage', 'department', td.id);

revoke all on public.portal_department_member_directory from public, anon;
grant select on public.portal_department_member_directory to authenticated;

drop view if exists public.portal_group_member_directory;
create view public.portal_group_member_directory with (security_barrier = true) as
select tg.id as group_id, tg.name as group_name, mm.id as membership_id, mp.id as member_id, mp.full_name,
  mp.gender,
  tgm.id as group_membership_id, tgm.role, tgm.status, tgm.ended_at, current_group.term_group_id as current_group_id
from public.term_group tg
join public.ministry_membership mm on mm.ministry_term_id = tg.ministry_term_id
join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
left join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id and tgm.term_group_id = tg.id
left join lateral (select term_group_id from public.term_group_membership open_tgm where open_tgm.ministry_membership_id = mm.id and open_tgm.ended_at is null limit 1) current_group on true
where public.has_capability('group.members.manage', 'group', tg.id);

revoke all on public.portal_group_member_directory from public, anon;
grant select on public.portal_group_member_directory to authenticated;
