begin;

create function public.care_can_coordinate(p_term_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.term_role_assignment r
    join public.ministry_term t on t.id = r.ministry_term_id and t.lifecycle in ('active', 'closed')
    join public.ministry m on m.id = t.ministry_id
    join public.member_profile p on p.id = r.member_profile_id and p.church_id = m.church_id
    where r.ministry_term_id = p_term_id and r.role = 'visitation_care_commissioner'
      and p.user_id = auth.uid() and p.archived_at is null
  );
$$;
create function public.care_can_manage_group(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.term_group g
    join public.ministry_term t on t.id = g.ministry_term_id and t.lifecycle in ('active', 'closed')
    where g.id = p_group_id and (public.care_can_coordinate(t.id) or exists (
      select 1 from public.term_group_membership gm
      join public.ministry_membership mm on mm.id = gm.ministry_membership_id and mm.ministry_term_id = t.id
      join public.member_profile p on p.id = mm.member_profile_id
      join public.ministry m on m.id = t.ministry_id and m.church_id = p.church_id
      where gm.term_group_id = g.id and gm.role = 'group_leader' and gm.status = 'active'
        and gm.ended_at is null and p.user_id = auth.uid() and p.archived_at is null
    ))
  );
$$;
create function public.care_can_read_case(p_case_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.care_flag c where c.id = p_case_id
      and (public.care_can_coordinate(c.ministry_term_id) or public.care_can_manage_group(c.term_group_id))
  );
$$;
create function public.care_can_read_notes(p_case_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.care_flag c where c.id = p_case_id and (
      public.care_can_coordinate(c.ministry_term_id) or (
        c.assignee_member_profile_id = public.authorization_current_member_profile_id()
        and public.care_can_manage_group(c.term_group_id)
      )
    )
  );
$$;

-- Remove every legacy policy, including permissive administrator access.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('care_flag', 'care_note') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
create policy "Care scoped metadata" on public.care_flag for select to authenticated using (public.care_can_read_case(id));
create policy "Care private notes" on public.care_note for select to authenticated using (public.care_can_read_notes(care_flag_id));
revoke all on public.care_flag, public.care_note from public, anon, authenticated;
grant select on public.care_flag, public.care_note to authenticated;

-- Internal helpers are inaccessible as RPCs; their callers check current authentication/scope.
create function public.care_assert_assignee(p_group_id uuid, p_assignee_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_term uuid; v_actor uuid := public.authorization_current_member_profile_id();
begin
  select ministry_term_id into v_term from public.term_group where id = p_group_id;
  if auth.uid() is null or not public.care_can_manage_group(p_group_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  if (not public.care_can_coordinate(v_term) and p_assignee_id is distinct from v_actor)
    or not exists (
      select 1 from public.member_profile p join public.ministry_term t on t.id = v_term
      join public.ministry m on m.id = t.ministry_id and m.church_id = p.church_id
      where p.id = p_assignee_id and p.archived_at is null and (
        exists (select 1 from public.term_role_assignment r where r.ministry_term_id = v_term
          and r.member_profile_id = p.id and r.role = 'visitation_care_commissioner')
        or exists (select 1 from public.term_group_membership gm
          join public.ministry_membership mm on mm.id = gm.ministry_membership_id and mm.ministry_term_id = v_term
          where gm.term_group_id = p_group_id and mm.member_profile_id = p.id and gm.role = 'group_leader'
            and gm.status = 'active' and gm.ended_at is null)
      )
    ) then raise exception using message = 'invalid', errcode = 'P0001'; end if;
end;
$$;
create function public.care_write_audit(p_case_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.care_can_read_case(p_case_id)
    or p_action not in ('care.created','care.assigned','care.updated','care.resolved','care.note_added') then
    raise exception using message = 'forbidden', errcode = 'P0001';
  end if;
  insert into public.application_audit_log(church_id, actor_id, action, scope_type, scope_id, target_type, target_id, payload)
  select m.church_id, auth.uid(), p_action, 'ministry_term', c.ministry_term_id, 'care_flag', c.id,
    jsonb_build_object('member_id', c.member_profile_id, 'group_id', c.term_group_id, 'assignee_id', c.assignee_member_profile_id, 'status', c.status)
  from public.care_flag c join public.ministry_term t on t.id = c.ministry_term_id join public.ministry m on m.id = t.ministry_id where c.id = p_case_id;
end;
$$;
create function public.create_care_follow_up(p_group_id uuid, p_member_id uuid, p_assignee_id uuid, p_next_contact_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_term uuid; v_lifecycle text; v_id uuid;
begin
  if auth.uid() is null or not public.care_can_manage_group(p_group_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select t.id, t.lifecycle into v_term, v_lifecycle from public.term_group g join public.ministry_term t on t.id = g.ministry_term_id where g.id = p_group_id for share of t, g;
  if v_lifecycle <> 'active' then raise exception using message = 'closed', errcode = 'P0001'; end if;
  perform 1 from public.term_group_membership gm join public.ministry_membership mm on mm.id = gm.ministry_membership_id
    join public.member_profile p on p.id = mm.member_profile_id
    where gm.term_group_id = p_group_id and mm.ministry_term_id = v_term and p.id = p_member_id
      and p.archived_at is null and gm.status = 'active' and gm.ended_at is null for update of gm, mm, p;
  if not found then raise exception using message = 'invalid', errcode = 'P0001'; end if;
  perform public.care_assert_assignee(p_group_id, p_assignee_id);
  insert into public.care_flag(member_profile_id, ministry_term_id, term_group_id, assignee_member_profile_id, created_by_member_profile_id, flag_type, next_contact_date)
    values(p_member_id, v_term, p_group_id, p_assignee_id, public.authorization_current_member_profile_id(), 'group_absence', p_next_contact_date) returning id into v_id;
  perform public.care_write_audit(v_id, 'care.created');
  return v_id;
exception when unique_violation then raise exception using message = 'duplicate', errcode = 'P0001';
end;
$$;
create function public.update_care_follow_up(p_case_id uuid, p_status text, p_next_contact_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_case public.care_flag; v_lifecycle text;
begin
  if auth.uid() is null or not public.care_can_read_notes(p_case_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select * into v_case from public.care_flag where id = p_case_id for update;
  if not public.care_can_read_notes(p_case_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select lifecycle into v_lifecycle from public.ministry_term where id = v_case.ministry_term_id for share;
  if v_lifecycle <> 'active' then raise exception using message = 'closed', errcode = 'P0001'; end if;
  if v_case.status = 'resolved' then raise exception using message = 'resolved', errcode = 'P0001'; end if;
  if p_status is null or p_status not in ('open', 'in_progress', 'resolved') or (v_case.status = 'in_progress' and p_status = 'open') then raise exception using message = 'invalid', errcode = 'P0001'; end if;
  update public.care_flag set status = p_status, next_contact_date = p_next_contact_date,
    resolved_at = case when p_status = 'resolved' then now() end,
    resolved_by_member_profile_id = case when p_status = 'resolved' then public.authorization_current_member_profile_id() end where id = p_case_id;
  perform public.care_write_audit(p_case_id, case when p_status = 'resolved' then 'care.resolved' else 'care.updated' end);
end;
$$;
create function public.assign_care_follow_up(p_case_id uuid, p_assignee_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_case public.care_flag; v_lifecycle text;
begin
  if auth.uid() is null or not public.care_can_read_case(p_case_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select * into v_case from public.care_flag where id = p_case_id for update;
  if not public.care_can_coordinate(v_case.ministry_term_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select lifecycle into v_lifecycle from public.ministry_term where id = v_case.ministry_term_id for share;
  if v_lifecycle <> 'active' then raise exception using message = 'closed', errcode = 'P0001'; end if;
  if v_case.status = 'resolved' then raise exception using message = 'resolved', errcode = 'P0001'; end if;
  perform public.care_assert_assignee(v_case.term_group_id, p_assignee_id);
  update public.care_flag set assignee_member_profile_id = p_assignee_id where id = p_case_id;
  perform public.care_write_audit(p_case_id, 'care.assigned');
end;
$$;
create function public.add_care_note(p_case_id uuid, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_case public.care_flag; v_lifecycle text; v_id uuid;
begin
  if auth.uid() is null or not public.care_can_read_notes(p_case_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select * into v_case from public.care_flag where id = p_case_id for update;
  if not public.care_can_read_notes(p_case_id) then raise exception using message = 'forbidden', errcode = 'P0001'; end if;
  select lifecycle into v_lifecycle from public.ministry_term where id = v_case.ministry_term_id for share;
  if v_lifecycle <> 'active' then raise exception using message = 'closed', errcode = 'P0001'; end if;
  if v_case.status = 'resolved' then raise exception using message = 'resolved', errcode = 'P0001'; end if;
  if p_note is null or char_length(trim(p_note)) not between 1 and 4000 then raise exception using message = 'invalid', errcode = 'P0001'; end if;
  insert into public.care_note(care_flag_id, note, author_member_profile_id) values(p_case_id, trim(p_note), public.authorization_current_member_profile_id()) returning id into v_id;
  perform public.care_write_audit(p_case_id, 'care.note_added');
  return v_id;
end;
$$;
revoke all on function public.care_assert_assignee(uuid,uuid), public.care_write_audit(uuid,text) from public, anon, authenticated;
revoke all on function public.care_can_coordinate(uuid), public.care_can_manage_group(uuid), public.care_can_read_case(uuid), public.care_can_read_notes(uuid), public.create_care_follow_up(uuid,uuid,uuid,date), public.update_care_follow_up(uuid,text,date), public.assign_care_follow_up(uuid,uuid), public.add_care_note(uuid,text) from public, anon, authenticated;
grant execute on function public.care_can_coordinate(uuid), public.care_can_manage_group(uuid), public.care_can_read_case(uuid), public.care_can_read_notes(uuid), public.create_care_follow_up(uuid,uuid,uuid,date), public.update_care_follow_up(uuid,text,date), public.assign_care_follow_up(uuid,uuid), public.add_care_note(uuid,text) to authenticated;
commit;
