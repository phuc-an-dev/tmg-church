create or replace function public.portal_member_sessions(p_session_slug text default null)
returns jsonb
language sql stable security definer set search_path = ''
as $$
with memberships as (
  select mm.id, mm.ministry_term_id, mt.slug term_slug, mt.name term_name,
    m.slug ministry_slug, m.name ministry_name, m.accent_color, m.icon_key
  from public.ministry_membership mm
  join public.member_profile mp on mp.id = mm.member_profile_id and mp.user_id = auth.uid() and mp.archived_at is null
  join public.ministry_term mt on mt.id = mm.ministry_term_id and mt.lifecycle = 'active'
  join public.ministry m on m.id = mt.ministry_id
), groups as (
  select tg.id, tg.slug, tg.name, mm.id membership_id, mm.ministry_term_id
  from memberships mm
  join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id
    and tgm.status = 'active' and tgm.ended_at is null
  join public.term_group tg on tg.id = tgm.term_group_id
), sessions as (
  select ms.*, mm.id membership_id, mm.ministry_slug, mm.term_slug, mm.ministry_name,
    coalesce(td.name, g.name, mm.ministry_name) scope_name
  from memberships mm
  join public.ministry_session ms on ms.ministry_term_id = mm.ministry_term_id
  left join groups g on g.id = ms.term_group_id and g.membership_id = mm.id
  left join public.term_department td on td.id = ms.term_department_id and td.ministry_term_id = mm.ministry_term_id
  where (ms.term_department_id is null or exists (
    select 1 from public.ministry_assignment ma
    where ma.ministry_membership_id = mm.id and ma.term_department_id = ms.term_department_id
  ))
    and (ms.term_group_id is null or g.id is not null)
    and ((p_session_slug is null and ms.session_date >= current_date) or ms.slug = p_session_slug)
), roles as (
  select ss.id session_id, dsr.id::text role_id, dsr.name role_name, td.name department_name,
    sa.ministry_membership_id membership_id, mp.full_name member_name
  from sessions ss
  join public.session_service_role sr on sr.ministry_session_id = ss.id
  join public.department_service_role dsr on dsr.id = sr.department_service_role_id
  join public.term_department td on td.id = dsr.term_department_id and td.ministry_term_id = ss.ministry_term_id
  left join public.service_assignment sa on sa.ministry_session_id = ss.id and sa.department_service_role_id = dsr.id
  left join public.ministry_membership mm on mm.id = sa.ministry_membership_id and mm.ministry_term_id = ss.ministry_term_id
  left join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
  where ss.term_group_id is null
  union all
  select ss.id, ga.role, case ga.role when 'worship_guide' then 'Worship guide' else 'Lesson guide' end,
    null, ga.ministry_membership_id, mp.full_name
  from sessions ss
  join public.group_session_assignment ga on ga.ministry_session_id = ss.id
  join public.ministry_membership mm on mm.id = ga.ministry_membership_id and mm.ministry_term_id = ss.ministry_term_id
  join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id and tgm.term_group_id = ss.term_group_id and tgm.status = 'active' and tgm.ended_at is null
  join public.member_profile mp on mp.id = mm.member_profile_id and mp.archived_at is null
), roster as (
  select session_id, role_id, role_name, department_name,
    coalesce(jsonb_agg(distinct member_name) filter (where member_name is not null), '[]'::jsonb) member_names
  from roles group by session_id, role_id, role_name, department_name
)
select jsonb_build_object(
  'sessions', coalesce((select jsonb_agg(jsonb_build_object(
    'id', ss.id, 'slug', ss.slug, 'title', ss.title, 'date', ss.session_date,
    'ministrySlug', ss.ministry_slug, 'termSlug', ss.term_slug,
    'scope', ss.scope_name, 'scopeType', case when ss.term_department_id is not null then 'department' when ss.term_group_id is null then 'ministry' else 'group' end,
    'myRoles', coalesce((select jsonb_agg(distinct r.role_name) from roles r where r.session_id = ss.id and r.membership_id = ss.membership_id), '[]'::jsonb),
    'roster', coalesce((select jsonb_agg(jsonb_build_object('roleId',r.role_id,'roleName',r.role_name,'departmentName',r.department_name,'memberNames',r.member_names) order by r.department_name,r.role_name) from roster r where r.session_id = ss.id), '[]'::jsonb)
  ) order by ss.session_date,ss.id) from sessions ss), '[]'::jsonb),
  'workspaces', coalesce((select jsonb_agg(w.data) from (
    select jsonb_build_object('id',mm.ministry_term_id,'kind','Ministry','name',mm.ministry_name,'context',mm.term_name,'accentColor',mm.accent_color,'iconKey',mm.icon_key,'href','/portal?section=upcoming&scope=ministry&q=' || mm.ministry_slug) data from memberships mm
    union all
    select jsonb_build_object('id',g.id,'kind','Group','name',g.name,'context',mm.ministry_name,'href','/portal?section=upcoming&scope=group') from groups g join memberships mm on mm.id = g.membership_id
    union all
    select jsonb_build_object('id',td.id,'kind','Department','name',td.name,'context',mm.ministry_name,'accentColor',td.accent_color,'iconKey',td.icon_key,'href','/portal?section=assignments')
    from memberships mm join public.ministry_assignment ma on ma.ministry_membership_id = mm.id join public.term_department td on td.id = ma.term_department_id and td.ministry_term_id = mm.ministry_term_id
  ) w), '[]'::jsonb)
);
$$;
revoke all on function public.portal_member_sessions(text) from public, anon;
grant execute on function public.portal_member_sessions(text) to authenticated;
notify pgrst, 'reload schema';
