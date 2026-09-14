create or replace function public.set_member_segments(
  target_member_id uuid,
  target_segment_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.member_profile where id = target_member_id
  ) then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  if cardinality(coalesce(target_segment_ids, '{}'::uuid[])) is distinct from (
    select count(distinct segment_id)
    from unnest(coalesce(target_segment_ids, '{}'::uuid[])) as segment_id
    join public.member_segment on member_segment.id = segment_id
    join public.member_profile on member_profile.id = target_member_id
      and member_profile.church_id = member_segment.church_id
  ) then
    raise exception 'A selected segment is unavailable for this member' using errcode = '22023';
  end if;

  delete from public.member_segment_membership
  where member_profile_id = target_member_id;

  insert into public.member_segment_membership (member_segment_id, member_profile_id)
  select distinct segment_id, target_member_id
  from unnest(coalesce(target_segment_ids, '{}'::uuid[])) as segment_id;
end;
$$;

revoke all on function public.set_member_segments(uuid, uuid[]) from public;
revoke all on function public.set_member_segments(uuid, uuid[]) from anon;
grant execute on function public.set_member_segments(uuid, uuid[]) to authenticated;
