-- Add date_of_birth column to member_profile
alter table public.member_profile
  add column if not exists date_of_birth date
  check (date_of_birth is null or (date_of_birth >= '1900-01-01' and date_of_birth <= '2100-12-31'));

-- Backfill existing members who only have birth_year to YYYY-01-01
update public.member_profile
set date_of_birth = make_date(birth_year, 1, 1)
where birth_year is not null and date_of_birth is null;

-- Trigger function to automatically keep birth_year synchronized from date_of_birth
create or replace function public.member_profile_sync_birth_year()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.date_of_birth is not null then
    new.birth_year := extract(year from new.date_of_birth)::smallint;
  else
    new.birth_year := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_member_profile_sync_birth_year on public.member_profile;
create trigger trg_member_profile_sync_birth_year
before insert or update of date_of_birth on public.member_profile
for each row
execute function public.member_profile_sync_birth_year();

-- Drop and recreate member_profile_public view to include date_of_birth
drop view if exists public.member_profile_public;
create view public.member_profile_public
with (security_barrier = true)
as
select mp.id, mp.full_name, mp.date_of_birth, mp.birth_year, c.id as church_id, c.name as church_name,
  c.slug as church_slug, m.id as ministry_id, m.name as ministry_name, m.slug as ministry_slug,
  mt.id as ministry_term_id, mt.name as ministry_term_name, mt.slug as ministry_term_slug,
  tg.id as term_group_id, tg.name as term_group_name,
  coalesce(dept.department_ids, array[]::uuid[]) as department_ids,
  coalesce(dept.department_names, array[]::text[]) as department_names
from public.member_profile mp
join public.church c on c.id = mp.church_id
join public.ministry_membership mm on mm.member_profile_id = mp.id
join public.ministry_term mt on mt.id = mm.ministry_term_id
join public.ministry m on m.id = mt.ministry_id and m.church_id = c.id
left join public.term_group_membership tgm on tgm.ministry_membership_id = mm.id
left join public.term_group tg on tg.id = tgm.term_group_id
left join lateral (
  select array_agg(td.id order by td.name, td.id) department_ids,
    array_agg(td.name order by td.name, td.id) department_names
  from public.ministry_assignment ma join public.term_department td on td.id = ma.term_department_id
  where ma.ministry_membership_id = mm.id
) dept on true
where mp.archived_at is null
  and exists (
    select 1
    from public.member_profile viewer
    where viewer.user_id = auth.uid()
      and viewer.church_id = mp.church_id
      and viewer.archived_at is null
  );

revoke all on public.member_profile_public from public, anon, authenticated;
grant select on public.member_profile_public to authenticated;

-- Convert legacy birth-year segment rules without changing the flat rule sequence.
alter table public.member_segment
  drop constraint if exists member_segment_condition_rules_check;

update public.member_segment
set condition_rules = (
  select jsonb_agg(
    case when source.condition->>'field' = 'birth_year' then
      source.condition || jsonb_build_object(
        'field', 'date_of_birth',
        'operator', case source.condition->>'operator'
          when 'equals' then 'year_equals'
          when 'not_equals' then 'year_not_equals'
          else source.condition->>'operator'
        end,
        'value', case source.condition->>'operator'
          when 'greater_than' then source.condition->>'value' || '-12-31'
          when 'greater_than_or_equal' then source.condition->>'value' || '-01-01'
          when 'less_than' then source.condition->>'value' || '-01-01'
          when 'less_than_or_equal' then source.condition->>'value' || '-12-31'
          else source.condition->>'value'
        end
      )
    else source.condition
    end
    order by source.ordinality
  )
  from jsonb_array_elements(member_segment.condition_rules) with ordinality as source(condition, ordinality)
)
where member_segment.condition_rules @> '[{"field":"birth_year"}]'::jsonb;

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
  target_date date;
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
    if field_name = 'date_of_birth' then
      if operator_name in ('year_equals', 'year_not_equals') then
        if target_value !~ '^[0-9]{4}$'
          or target_value::integer not between 1900 and 2100 then
          return false;
        end if;
      else
        if operator_name not in (
          'equals', 'not_equals', 'greater_than', 'greater_than_or_equal',
          'less_than', 'less_than_or_equal'
        ) or target_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
          return false;
        end if;
        begin
          target_date := target_value::date;
          if target_date::text <> target_value
            or target_date not between date '1900-01-01' and date '2100-12-31' then
            return false;
          end if;
        exception when others then
          return false;
        end;
      end if;
    end if;
    if field_name in ('full_name', 'phone') and operator_name not in (
      'equals', 'not_equals', 'starts_with', 'ends_with', 'contains'
    ) then return false; end if;
    if field_name not in ('gender', 'date_of_birth', 'full_name', 'phone') then
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
      when 'date_of_birth' then case operator_name
        when 'equals' then candidate.date_of_birth = target_value::date
        when 'not_equals' then candidate.date_of_birth is not null and candidate.date_of_birth <> target_value::date
        when 'greater_than' then candidate.date_of_birth > target_value::date
        when 'greater_than_or_equal' then candidate.date_of_birth >= target_value::date
        when 'less_than' then candidate.date_of_birth < target_value::date
        when 'less_than_or_equal' then candidate.date_of_birth <= target_value::date
        when 'year_equals' then extract(year from candidate.date_of_birth)::integer = target_value::integer
        else candidate.date_of_birth is not null
          and extract(year from candidate.date_of_birth)::integer <> target_value::integer
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

revoke all on function public.valid_member_segment_conditions(jsonb) from public, anon;
revoke all on function public.member_matches_segment_rules(public.member_profile, jsonb) from public, anon;
grant execute on function public.valid_member_segment_conditions(jsonb) to authenticated;
grant execute on function public.member_matches_segment_rules(public.member_profile, jsonb) to authenticated;
