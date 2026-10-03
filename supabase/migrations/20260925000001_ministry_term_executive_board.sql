alter table public.ministry_term
  add column executive_board_roles text[];

create function public.valid_executive_board_roles(p_roles text[])
returns boolean
language sql
immutable
as $$
  select p_roles is null or (
    cardinality(p_roles) between 1 and 10
    and p_roles <@ array[
      'ministry_head', 'secretary', 'treasurer',
      'social_support_commissioner', 'small_groups_commissioner',
      'pastoral_commissioner', 'music_commissioner',
      'worship_commissioner', 'visitation_care_commissioner',
      'evangelism_commissioner'
    ]::text[]
    and cardinality(p_roles) = (
      select count(distinct selected.role) from unnest(p_roles) as selected(role)
    )
  );
$$;

alter table public.ministry_term
  add constraint ministry_term_executive_board_roles_check
  check (public.valid_executive_board_roles(executive_board_roles));

-- Preserve existing assignments, including those on immutable closed terms.
alter table public.ministry_term disable trigger trg_assert_ministry_term_lifecycle;
alter table public.ministry_term disable trigger trg_ministry_term_set_updated_at;
update public.ministry_term mt
set executive_board_roles = assigned.roles
from (
  select ministry_term_id, array_agg(role order by role) as roles
  from public.term_role_assignment
  group by ministry_term_id
) assigned
where mt.id = assigned.ministry_term_id;
alter table public.ministry_term enable trigger trg_ministry_term_set_updated_at;
alter table public.ministry_term enable trigger trg_assert_ministry_term_lifecycle;

create function public.assert_executive_board_configuration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.term_role_assignment tra
    where tra.ministry_term_id = new.id
      and (new.executive_board_roles is null or not tra.role = any(new.executive_board_roles))
  ) then
    raise exception 'Unassign occupied executive board roles before removing them' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_assert_executive_board_configuration
before update of executive_board_roles on public.ministry_term
for each row execute function public.assert_executive_board_configuration();

create or replace function public.assert_term_role_assignment_invariants()
returns trigger
language plpgsql
as $$
declare
  v_term_id uuid;
  v_lifecycle text;
  v_roles text[];
begin
  if tg_op = 'UPDATE' and new.ministry_term_id <> old.ministry_term_id then
    raise exception 'Term role assignment ministry term is immutable';
  end if;

  v_term_id := case when tg_op = 'DELETE' then old.ministry_term_id else new.ministry_term_id end;
  select lifecycle, executive_board_roles into v_lifecycle, v_roles
  from public.ministry_term where id = v_term_id;

  if v_lifecycle = 'closed' then
    raise exception 'Cannot modify role assignments for closed term' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;

  if v_roles is null or not new.role = any(v_roles) then
    raise exception 'This executive board role is not enabled for the term' using errcode = 'P0001';
  end if;
  perform 1 from public.ministry_membership
    where ministry_term_id = new.ministry_term_id
      and member_profile_id = new.member_profile_id
    for key share;
  if not found then
    raise exception 'Member is not enrolled in this ministry term' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function public.prevent_occupied_board_member_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.term_role_assignment
      where ministry_term_id = old.ministry_term_id
        and member_profile_id = old.member_profile_id
    ) then
      raise exception 'Unassign executive board roles before removing this term member' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if new.member_profile_id is distinct from old.member_profile_id then
    if exists (
      select 1 from public.term_role_assignment
      where ministry_term_id = old.ministry_term_id
        and member_profile_id = old.member_profile_id
    ) then
      raise exception 'Unassign executive board roles before removing this term member' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_occupied_board_member_removal
before delete or update of member_profile_id on public.ministry_membership
for each row execute function public.prevent_occupied_board_member_removal();

create or replace function public.assign_term_role(
  p_term_id uuid,
  p_member_profile_id uuid,
  p_role text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_church_id uuid; v_lifecycle text;
begin
  select m.church_id, mt.lifecycle into v_church_id, v_lifecycle
  from public.ministry_term mt
  join public.ministry m on m.id = mt.ministry_id
  where mt.id = p_term_id
  for update of mt;

  if not public.is_system_admin_for_church(v_church_id) then
    raise exception 'Unauthorized term role assignment' using errcode = '42501';
  end if;
  if v_lifecycle = 'closed' then
    raise exception 'Cannot modify role assignments for closed term' using errcode = 'P0001';
  end if;

  insert into public.term_role_assignment (ministry_term_id, member_profile_id, role)
  values (p_term_id, p_member_profile_id, p_role)
  on conflict (ministry_term_id, role) do update
    set member_profile_id = excluded.member_profile_id
    where public.term_role_assignment.member_profile_id is distinct from excluded.member_profile_id;
  return true;
end;
$$;
