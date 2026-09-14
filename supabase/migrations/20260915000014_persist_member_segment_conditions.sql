alter table public.member_segment
  add column condition_rules jsonb not null default '[]'::jsonb;

create or replace function public.valid_member_segment_conditions(rules jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  condition jsonb;
  position integer := 0;
  field_name text;
  operator_name text;
  target_value text;
  connector_name text;
begin
  if jsonb_typeof(rules) <> 'array' or jsonb_array_length(rules) > 10 then
    return false;
  end if;
  for condition in select value from jsonb_array_elements(rules)
  loop
    position := position + 1;
    field_name := condition->>'field';
    operator_name := condition->>'operator';
    target_value := btrim(condition->>'value');
    connector_name := condition->>'connector';
    if field_name is null or operator_name is null or target_value is null
      or char_length(target_value) = 0 or char_length(target_value) > 120 then
      return false;
    end if;
    if (position = 1 and connector_name is not null)
      or (position > 1 and connector_name not in ('and', 'or')) then
      return false;
    end if;
    if field_name = 'gender' and (
      operator_name not in ('equals', 'not_equals')
      or target_value not in ('female', 'male')
    ) then return false; end if;
    if field_name = 'birth_year' and (
      operator_name not in (
        'equals', 'not_equals', 'greater_than', 'greater_than_or_equal',
        'less_than', 'less_than_or_equal'
      ) or target_value !~ '^[0-9]{4}$'
      or target_value::integer not between 1900 and 2100
    ) then return false; end if;
    if field_name in ('full_name', 'phone') and operator_name not in (
      'equals', 'not_equals', 'starts_with', 'ends_with', 'contains'
    ) then return false; end if;
    if field_name not in ('gender', 'birth_year', 'full_name', 'phone') then
      return false;
    end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

alter table public.member_segment
  add constraint member_segment_condition_rules_check
    check (public.valid_member_segment_conditions(condition_rules));

create or replace function public.member_matches_segment_rules(
  candidate public.member_profile,
  rules jsonb
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  condition jsonb;
  position integer := 0;
  field_name text;
  operator_name text;
  target_value text;
  connector_name text;
  matches boolean;
  result boolean;
  text_value text;
begin
  if jsonb_array_length(rules) = 0 or not public.valid_member_segment_conditions(rules) then
    raise exception 'Invalid segment conditions' using errcode = '22023';
  end if;
  for condition in select value from jsonb_array_elements(rules)
  loop
    position := position + 1;
    field_name := condition->>'field';
    operator_name := condition->>'operator';
    target_value := btrim(condition->>'value');
    connector_name := condition->>'connector';
    text_value := case field_name
      when 'full_name' then candidate.full_name
      when 'phone' then candidate.phone
      else null
    end;
    matches := case field_name
      when 'gender' then case operator_name
        when 'equals' then candidate.gender = target_value
        else candidate.gender is not null and candidate.gender <> target_value
      end
      when 'birth_year' then case operator_name
        when 'equals' then candidate.birth_year = target_value::smallint
        when 'not_equals' then candidate.birth_year is not null and candidate.birth_year <> target_value::smallint
        when 'greater_than' then candidate.birth_year > target_value::smallint
        when 'greater_than_or_equal' then candidate.birth_year >= target_value::smallint
        when 'less_than' then candidate.birth_year < target_value::smallint
        else candidate.birth_year <= target_value::smallint
      end
      else case operator_name
        when 'equals' then lower(coalesce(text_value, '')) = lower(target_value)
        when 'not_equals' then coalesce(text_value, '') <> '' and lower(text_value) <> lower(target_value)
        when 'starts_with' then lower(coalesce(text_value, '')) like lower(target_value) || '%'
        when 'ends_with' then lower(coalesce(text_value, '')) like '%' || lower(target_value)
        else lower(coalesce(text_value, '')) like '%' || lower(target_value) || '%'
      end
    end;
    matches := coalesce(matches, false);
    if position = 1 then
      result := matches;
    elsif connector_name = 'and' then
      result := result and matches;
    else
      result := result or matches;
    end if;
  end loop;
  return result;
end;
$$;

create or replace function public.preview_segment_members_by_rules(
  target_segment_id uuid,
  target_conditions jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare matching_count integer;
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
    and public.member_matches_segment_rules(profile, target_conditions);
  return matching_count;
end;
$$;

create or replace function public.save_segment_rules_and_add_members(
  target_segment_id uuid,
  target_conditions jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare inserted_count integer;
begin
  if not public.is_leader() then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if jsonb_array_length(target_conditions) = 0
    or not public.valid_member_segment_conditions(target_conditions) then
    raise exception 'Invalid segment conditions' using errcode = '22023';
  end if;
  update public.member_segment
  set condition_rules = target_conditions
  where id = target_segment_id;
  if not found then raise exception 'Segment not found' using errcode = 'P0002'; end if;
  insert into public.member_segment_membership (member_segment_id, member_profile_id)
  select target_segment_id, profile.id
  from public.member_profile profile
  join public.member_segment segment on segment.id = target_segment_id
    and segment.church_id = profile.church_id
  where profile.archived_at is null
    and public.member_matches_segment_rules(profile, target_conditions)
  on conflict (member_segment_id, member_profile_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

drop function public.preview_segment_members_by_conditions(uuid, text, jsonb);
drop function public.bulk_add_segment_members_by_conditions(uuid, text, jsonb);
drop function public.member_matches_segment_conditions(public.member_profile, text, jsonb);
drop function public.bulk_add_segment_members_by_birth_year(uuid, smallint);

revoke all on function public.valid_member_segment_conditions(jsonb) from public, anon;
revoke all on function public.member_matches_segment_rules(public.member_profile, jsonb) from public, anon;
revoke all on function public.preview_segment_members_by_rules(uuid, jsonb) from public, anon;
revoke all on function public.save_segment_rules_and_add_members(uuid, jsonb) from public, anon;
grant execute on function public.valid_member_segment_conditions(jsonb) to authenticated;
grant execute on function public.member_matches_segment_rules(public.member_profile, jsonb) to authenticated;
grant execute on function public.preview_segment_members_by_rules(uuid, jsonb) to authenticated;
grant execute on function public.save_segment_rules_and_add_members(uuid, jsonb) to authenticated;
