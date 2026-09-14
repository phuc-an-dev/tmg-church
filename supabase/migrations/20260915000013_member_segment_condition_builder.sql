-- Member attributes that can be used in segment conditions.
alter table public.member_profile
  add column gender text,
  add constraint member_profile_gender_check
    check (gender is null or gender in ('female', 'male'));

create index member_profile_active_church_gender_idx
  on public.member_profile (church_id, gender)
  where archived_at is null;

-- A single durable evaluator keeps preview and bulk insertion in sync.
create or replace function public.member_matches_segment_conditions(
  candidate public.member_profile,
  target_logic text,
  target_conditions jsonb
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  condition jsonb;
  field_name text;
  operator_name text;
  target_value text;
  matches boolean;
begin
  if target_logic not in ('and', 'or') then
    raise exception 'Invalid condition logic' using errcode = '22023';
  end if;
  if jsonb_typeof(target_conditions) <> 'array'
    or jsonb_array_length(target_conditions) = 0
    or jsonb_array_length(target_conditions) > 10 then
    raise exception 'Provide between one and ten conditions' using errcode = '22023';
  end if;

  for condition in select value from jsonb_array_elements(target_conditions)
  loop
    field_name := condition->>'field';
    operator_name := condition->>'operator';
    target_value := btrim(condition->>'value');
    if field_name is null or operator_name is null or target_value is null
      or char_length(target_value) = 0 or char_length(target_value) > 120 then
      raise exception 'Invalid condition' using errcode = '22023';
    end if;

    case field_name
      when 'gender' then
        if operator_name not in ('equals', 'not_equals')
          or target_value not in ('female', 'male') then
          raise exception 'Invalid gender condition' using errcode = '22023';
        end if;
        matches := case operator_name
          when 'equals' then candidate.gender = target_value
          else candidate.gender is not null and candidate.gender <> target_value
        end;
      when 'birth_year' then
        if operator_name not in (
          'equals', 'not_equals', 'greater_than', 'greater_than_or_equal',
          'less_than', 'less_than_or_equal'
        ) or target_value !~ '^[0-9]{4}$'
          or target_value::integer not between 1900 and 2100 then
          raise exception 'Invalid birth year condition' using errcode = '22023';
        end if;
        matches := case operator_name
          when 'equals' then candidate.birth_year = target_value::smallint
          when 'not_equals' then candidate.birth_year is not null and candidate.birth_year <> target_value::smallint
          when 'greater_than' then candidate.birth_year > target_value::smallint
          when 'greater_than_or_equal' then candidate.birth_year >= target_value::smallint
          when 'less_than' then candidate.birth_year < target_value::smallint
          else candidate.birth_year <= target_value::smallint
        end;
      when 'full_name', 'phone' then
        if operator_name not in ('equals', 'not_equals', 'starts_with', 'ends_with', 'contains') then
          raise exception 'Invalid text condition' using errcode = '22023';
        end if;
        matches := case operator_name
          when 'equals' then lower(coalesce(case field_name when 'full_name' then candidate.full_name else candidate.phone end, '')) = lower(target_value)
          when 'not_equals' then coalesce(case field_name when 'full_name' then candidate.full_name else candidate.phone end, '') <> '' and lower(case field_name when 'full_name' then candidate.full_name else candidate.phone end) <> lower(target_value)
          when 'starts_with' then lower(coalesce(case field_name when 'full_name' then candidate.full_name else candidate.phone end, '')) like lower(target_value) || '%'
          when 'ends_with' then lower(coalesce(case field_name when 'full_name' then candidate.full_name else candidate.phone end, '')) like '%' || lower(target_value)
          else lower(coalesce(case field_name when 'full_name' then candidate.full_name else candidate.phone end, '')) like '%' || lower(target_value) || '%'
        end;
      else
        raise exception 'Unsupported condition field' using errcode = '22023';
    end case;

    if target_logic = 'and' and not matches then return false; end if;
    if target_logic = 'or' and matches then return true; end if;
  end loop;

  return target_logic = 'and';
end;
$$;

create or replace function public.preview_segment_members_by_conditions(
  target_segment_id uuid,
  target_logic text,
  target_conditions jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  matching_count integer;
begin
  if not public.is_leader() then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.member_segment where id = target_segment_id) then
    raise exception 'Segment not found' using errcode = 'P0002';
  end if;
  select count(*) into matching_count
  from public.member_profile profile
  join public.member_segment segment on segment.id = target_segment_id
    and segment.church_id = profile.church_id
  where profile.archived_at is null
    and public.member_matches_segment_conditions(profile, target_logic, target_conditions);
  return matching_count;
end;
$$;

create or replace function public.bulk_add_segment_members_by_conditions(
  target_segment_id uuid,
  target_logic text,
  target_conditions jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if not public.is_leader() then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.member_segment where id = target_segment_id) then
    raise exception 'Segment not found' using errcode = 'P0002';
  end if;
  insert into public.member_segment_membership (member_segment_id, member_profile_id)
  select target_segment_id, profile.id
  from public.member_profile profile
  join public.member_segment segment on segment.id = target_segment_id
    and segment.church_id = profile.church_id
  where profile.archived_at is null
    and public.member_matches_segment_conditions(profile, target_logic, target_conditions)
  on conflict (member_segment_id, member_profile_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.member_matches_segment_conditions(public.member_profile, text, jsonb) from public, anon;
revoke all on function public.preview_segment_members_by_conditions(uuid, text, jsonb) from public, anon;
revoke all on function public.bulk_add_segment_members_by_conditions(uuid, text, jsonb) from public, anon;
grant execute on function public.preview_segment_members_by_conditions(uuid, text, jsonb) to authenticated;
grant execute on function public.bulk_add_segment_members_by_conditions(uuid, text, jsonb) to authenticated;
grant execute on function public.member_matches_segment_conditions(public.member_profile, text, jsonb) to authenticated;
