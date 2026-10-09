begin;

create function public.care_case_json(p_case_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'slug', c.slug, 'memberId', c.member_profile_id, 'memberName', p.full_name,
    'termId', t.id, 'termName', t.name, 'termSlug', t.slug,
    'ministryId', m.id, 'ministryName', m.name, 'ministrySlug', m.slug,
    'groupId', g.id, 'groupName', g.name, 'groupSlug', g.slug,
    'assigneeId', c.assignee_member_profile_id, 'assigneeName', a.full_name,
    'createdById', c.created_by_member_profile_id, 'resolvedById', c.resolved_by_member_profile_id,
    'status', c.status, 'nextContactDate', c.next_contact_date, 'createdAt', c.created_at,
    'resolvedAt', c.resolved_at, 'source', c.source, 'sourceEvidence', c.source_evidence,
    'flagType', c.flag_type, 'readOnly', t.lifecycle = 'closed',
    'canCoordinate', public.care_can_coordinate(t.id)
  )
  from public.care_flag c join public.member_profile p on p.id = c.member_profile_id
  join public.ministry_term t on t.id = c.ministry_term_id join public.ministry m on m.id = t.ministry_id
  left join public.term_group g on g.id = c.term_group_id
  left join public.member_profile a on a.id = c.assignee_member_profile_id where c.id = p_case_id;
$$;
create function public.get_my_care_scopes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  return coalesce((select jsonb_agg(scope order by term_name) from (
    select t.name term_name, jsonb_build_object('termId', t.id, 'termName', t.name, 'termSlug', t.slug,
      'ministryId', m.id, 'ministryName', m.name, 'ministrySlug', m.slug, 'lifecycle', t.lifecycle,
      'readOnly', t.lifecycle = 'closed', 'canCoordinate', public.care_can_coordinate(t.id),
      'groups', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'slug', g.slug) order by g.name)
        from public.term_group g where g.ministry_term_id = t.id and public.care_can_manage_group(g.id)), '[]'::jsonb)) scope
    from public.ministry_term t join public.ministry m on m.id = t.ministry_id
    where t.lifecycle in ('active','closed') and (public.care_can_coordinate(t.id)
      or exists(select 1 from public.term_group g where g.ministry_term_id = t.id and public.care_can_manage_group(g.id)))
  ) s), '[]'::jsonb);
end;
$$;
create function public.get_care_group_options(p_group_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_term uuid; v_actor uuid := public.authorization_current_member_profile_id();
begin
  if auth.uid() is null or not public.care_can_manage_group(p_group_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select ministry_term_id into v_term from public.term_group where id = p_group_id;
  return jsonb_build_object('defaultAssigneeId', v_actor,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name) order by p.full_name)
      from public.term_group_membership gm join public.ministry_membership mm on mm.id = gm.ministry_membership_id
      join public.member_profile p on p.id = mm.member_profile_id
      where gm.term_group_id = p_group_id and mm.ministry_term_id = v_term and gm.status = 'active' and gm.ended_at is null and p.archived_at is null), '[]'::jsonb),
    'assignees', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name) order by p.full_name)
      from public.member_profile p where p.archived_at is null and (
        p.id = v_actor or (public.care_can_coordinate(v_term) and exists (
          select 1 from public.term_group_membership gm join public.ministry_membership mm on mm.id = gm.ministry_membership_id
          where gm.term_group_id = p_group_id and mm.ministry_term_id = v_term and mm.member_profile_id = p.id
            and gm.role = 'group_leader' and gm.status = 'active' and gm.ended_at is null
        ))
      )), '[]'::jsonb));
end;
$$;
create function public.get_care_list(p_term_id uuid, p_group_id uuid, p_tab text, p_page integer, p_query text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_page integer := greatest(coalesce(p_page,1),1); v_result jsonb;
begin
  if auth.uid() is null or not (public.care_can_coordinate(p_term_id) or exists (
    select 1 from public.term_group g where g.ministry_term_id = p_term_id and public.care_can_manage_group(g.id)
  )) or (p_group_id is not null and not exists(select 1 from public.term_group g
    where g.id = p_group_id and g.ministry_term_id = p_term_id and public.care_can_manage_group(g.id))) then
    raise exception using message = 'forbidden', errcode = 'P0001';
  end if;
  if p_tab is null or p_tab not in ('open','history') then raise exception using message = 'invalid', errcode = 'P0001'; end if;
  with scoped as (
    select c.* from public.care_flag c join public.member_profile p on p.id = c.member_profile_id
    where c.ministry_term_id = p_term_id and (p_group_id is null or c.term_group_id = p_group_id)
      and public.care_can_read_case(c.id) and ((p_tab = 'history' and c.status = 'resolved') or (p_tab = 'open' and c.status in ('open','in_progress')))
      and (nullif(trim(p_query),'') is null or p.full_name ilike '%' || p_query || '%')
  ), page_rows as (
    select * from scoped order by
      (next_contact_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date) desc nulls last,
      next_contact_date asc nulls last, created_at desc, id
    limit 20 offset (v_page - 1) * 20
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(public.care_case_json(id)
    order by (next_contact_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date) desc nulls last,
      next_contact_date asc nulls last, created_at desc, id) from page_rows), '[]'::jsonb),
    'totalCount', (select count(*) from scoped), 'page', v_page, 'pageSize', 20) into v_result;
  return v_result;
end;
$$;
create function public.get_care_detail(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_notes jsonb := '[]'::jsonb; v_read boolean; v_closed boolean; v_resolved boolean; v_term uuid;
begin
  if auth.uid() is null or not public.care_can_read_case(p_case_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select t.lifecycle = 'closed', c.status = 'resolved', t.id into v_closed, v_resolved, v_term
    from public.care_flag c join public.ministry_term t on t.id = c.ministry_term_id where c.id = p_case_id;
  v_read := public.care_can_read_notes(p_case_id);
  if v_read then
    select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'note', n.note, 'authorId', n.author_member_profile_id,
      'authorName', coalesce(p.full_name, 'Unknown author'), 'createdAt', n.created_at) order by n.created_at, n.id), '[]'::jsonb)
      into v_notes from public.care_note n left join public.member_profile p on p.id = n.author_member_profile_id where n.care_flag_id = p_case_id;
  end if;
  return jsonb_build_object('case', public.care_case_json(p_case_id), 'notes', v_notes, 'canReadNotes', v_read,
    'canUpdate', v_read and not v_closed and not v_resolved,
    'canAssign', public.care_can_coordinate(v_term) and not v_closed and not v_resolved,
    'canCoordinate', public.care_can_coordinate(v_term), 'readOnly', v_closed);
end;
$$;
create function public.get_care_detail_by_slug(p_care_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select id into v_id from public.care_flag where slug = p_care_slug;
  if v_id is null or not public.care_can_read_case(v_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  return public.get_care_detail(v_id);
end;
$$;

-- Membership window and the last resolved date are applied before selecting the last three sessions.
create function public.care_absence_evidence(p_group_id uuid, p_member_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  with latest as (
    select s.id, s.session_date, ar.status
    from public.term_group_membership gm
    join public.ministry_membership mm on mm.id = gm.ministry_membership_id
    join public.member_profile p on p.id = mm.member_profile_id and p.archived_at is null
    join public.ministry_session s on s.term_group_id = gm.term_group_id and s.ministry_term_id = mm.ministry_term_id
    left join public.session_participant sp on sp.ministry_session_id = s.id and sp.member_profile_id = p.id
    left join public.attendance_record ar on ar.session_participant_id = sp.id
    where gm.term_group_id = p_group_id and p.id = p_member_id and gm.status = 'active' and gm.ended_at is null
      and s.session_date >= (gm.joined_at at time zone 'Asia/Ho_Chi_Minh')::date
      and s.session_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date
      and s.session_date > coalesce((select max((c.resolved_at at time zone 'Asia/Ho_Chi_Minh')::date)
        from public.care_flag c where c.term_group_id = p_group_id and c.member_profile_id = p_member_id
          and c.ministry_term_id = mm.ministry_term_id and c.flag_type = 'group_absence' and c.status = 'resolved'), '-infinity'::date)
      and not exists(select 1 from public.care_flag c where c.term_group_id = p_group_id and c.member_profile_id = p_member_id
        and c.ministry_term_id = mm.ministry_term_id and c.flag_type = 'group_absence' and c.status in ('open','in_progress'))
    order by s.session_date desc, s.id desc limit 3
  ) select case when count(*) = 3 and count(*) filter(where status = 'absent') = 3
    then jsonb_build_object('sessions', jsonb_agg(jsonb_build_object('id', id, 'date', session_date, 'status', status) order by session_date desc, id desc), 'latestSessionDate', max(session_date)) end from latest;
$$;
create function public.get_care_absence_suggestions(p_term_id uuid, p_group_id uuid, p_page integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_page integer := greatest(coalesce(p_page,1),1); v_result jsonb;
begin
  if auth.uid() is null or not (public.care_can_coordinate(p_term_id) or exists (
    select 1 from public.term_group g where g.ministry_term_id = p_term_id and public.care_can_manage_group(g.id)
  )) or (p_group_id is not null and not exists(select 1 from public.term_group g
    where g.id = p_group_id and g.ministry_term_id = p_term_id and public.care_can_manage_group(g.id))) then
    raise exception using message = 'forbidden', errcode = 'P0001';
  end if;
  if not exists(select 1 from public.ministry_term where id = p_term_id and lifecycle = 'active') then raise exception using message = 'closed', errcode = 'P0001'; end if;
  with candidates as (
    select p.id member_id, p.full_name, g.id group_id, g.name group_name, g.slug group_slug,
      public.care_absence_evidence(g.id, p.id) evidence
    from public.term_group_membership gm join public.ministry_membership mm on mm.id = gm.ministry_membership_id
    join public.term_group g on g.id = gm.term_group_id and g.ministry_term_id = mm.ministry_term_id
    join public.member_profile p on p.id = mm.member_profile_id
    where mm.ministry_term_id = p_term_id and (p_group_id is null or g.id = p_group_id)
      and public.care_can_manage_group(g.id) and gm.status = 'active' and gm.ended_at is null and p.archived_at is null
  ), eligible as (select * from candidates where evidence is not null), page_rows as (
    select * from eligible order by full_name, member_id limit 20 offset (v_page - 1) * 20
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('memberId', member_id,
    'memberName', full_name, 'groupId', group_id, 'groupName', group_name, 'groupSlug', group_slug,
    'termId', p_term_id, 'sourceEvidence', evidence) order by full_name, member_id) from page_rows), '[]'::jsonb),
    'totalCount', (select count(*) from eligible), 'page', v_page, 'pageSize',20) into v_result;
  return v_result;
end;
$$;
create function public.create_care_follow_up_from_absence(p_group_id uuid, p_member_id uuid, p_assignee_id uuid, p_next_contact_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_term uuid; v_lifecycle text; v_id uuid; v_evidence jsonb;
begin
  if auth.uid() is null or not public.care_can_manage_group(p_group_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select t.id, t.lifecycle into v_term, v_lifecycle from public.term_group g join public.ministry_term t on t.id = g.ministry_term_id where g.id = p_group_id for share of t, g;
  if v_lifecycle <> 'active' then raise exception using message = 'closed', errcode = 'P0001'; end if;
  perform 1 from public.term_group_membership gm join public.ministry_membership mm on mm.id = gm.ministry_membership_id
    join public.member_profile p on p.id = mm.member_profile_id
    where gm.term_group_id = p_group_id and mm.ministry_term_id = v_term and p.id = p_member_id
      and p.archived_at is null and gm.status = 'active' and gm.ended_at is null for update of gm, mm, p;
  if not found then raise exception using message = 'stale', errcode = 'P0001'; end if;
  perform public.care_assert_assignee(p_group_id, p_assignee_id);
  if exists(select 1 from public.care_flag where term_group_id = p_group_id and member_profile_id = p_member_id
    and ministry_term_id = v_term and flag_type = 'group_absence' and status in ('open','in_progress')) then raise exception using message = 'duplicate', errcode = 'P0001'; end if;
  -- Lock existing sessions/attendance so a concurrent correction completes before revalidation or waits until commit.
  perform 1 from public.ministry_session where term_group_id = p_group_id and ministry_term_id = v_term for share;
  perform 1 from public.attendance_record ar join public.session_participant sp on sp.id = ar.session_participant_id
    join public.ministry_session s on s.id = sp.ministry_session_id
    where s.term_group_id = p_group_id and s.ministry_term_id = v_term and sp.member_profile_id = p_member_id for share of ar, sp;
  v_evidence := public.care_absence_evidence(p_group_id, p_member_id);
  if v_evidence is null then raise exception using message = 'stale', errcode = 'P0001'; end if;
  insert into public.care_flag(member_profile_id, ministry_term_id, term_group_id, assignee_member_profile_id,
    created_by_member_profile_id, flag_type, next_contact_date, source, source_evidence)
    values(p_member_id, v_term, p_group_id, p_assignee_id, public.authorization_current_member_profile_id(),
      'group_absence', p_next_contact_date, 'attendance', v_evidence) returning id into v_id;
  perform public.care_write_audit(v_id, 'care.created');
  return v_id;
exception when unique_violation then raise exception using message = 'duplicate', errcode = 'P0001';
end;
$$;
revoke all on function public.care_case_json(uuid), public.care_absence_evidence(uuid,uuid) from public, anon, authenticated;
revoke all on function public.get_my_care_scopes(), public.get_care_group_options(uuid), public.get_care_list(uuid,uuid,text,integer,text), public.get_care_detail(uuid), public.get_care_detail_by_slug(text), public.get_care_absence_suggestions(uuid,uuid,integer), public.create_care_follow_up_from_absence(uuid,uuid,uuid,date) from public, anon, authenticated;
grant execute on function public.get_my_care_scopes(), public.get_care_group_options(uuid), public.get_care_list(uuid,uuid,text,integer,text), public.get_care_detail(uuid), public.get_care_detail_by_slug(text), public.get_care_absence_suggestions(uuid,uuid,integer), public.create_care_follow_up_from_absence(uuid,uuid,uuid,date) to authenticated;
commit;
