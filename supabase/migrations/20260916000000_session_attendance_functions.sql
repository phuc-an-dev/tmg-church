create or replace function public.save_session_attendance(
  target_session_id uuid,
  target_member_id uuid,
  target_status text
) returns void language plpgsql security invoker set search_path = '' as $$
declare participant_id uuid;
begin
  if target_status not in ('present', 'absent', 'excused') then raise exception 'Invalid attendance status'; end if;
  if not exists (
    select 1 from public.ministry_session s join public.ministry_membership m on m.ministry_term_id=s.ministry_term_id
    where s.id=target_session_id and m.member_profile_id=target_member_id for key share of m
  ) then raise exception 'Member is not enrolled in this session term'; end if;
  insert into public.session_participant (ministry_session_id, member_profile_id)
  values (target_session_id, target_member_id)
  on conflict (ministry_session_id, member_profile_id) do update set ministry_session_id=excluded.ministry_session_id
  returning id into participant_id;
  insert into public.attendance_record (session_participant_id, status)
  values (participant_id, target_status)
  on conflict (session_participant_id) do update set status=excluded.status;
end;
$$;
revoke execute on function public.save_session_attendance(uuid, uuid, text) from public, anon;
grant execute on function public.save_session_attendance(uuid, uuid, text) to authenticated;
