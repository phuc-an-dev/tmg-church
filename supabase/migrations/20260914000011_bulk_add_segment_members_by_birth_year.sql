create or replace function public.bulk_add_segment_members_by_birth_year(
  target_segment_id uuid,
  target_birth_year smallint
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if not public.is_leader() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.member_segment where id = target_segment_id) then
    raise exception 'Segment not found' using errcode = 'P0002';
  end if;

  insert into public.member_segment_membership (member_segment_id, member_profile_id)
  select target_segment_id, member_profile.id
  from public.member_profile
  join public.member_segment on member_segment.id = target_segment_id
    and member_segment.church_id = member_profile.church_id
  where member_profile.archived_at is null
    and member_profile.birth_year = target_birth_year
  on conflict (member_segment_id, member_profile_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.bulk_add_segment_members_by_birth_year(uuid, smallint) from public;
revoke all on function public.bulk_add_segment_members_by_birth_year(uuid, smallint) from anon;
grant execute on function public.bulk_add_segment_members_by_birth_year(uuid, smallint) to authenticated;
