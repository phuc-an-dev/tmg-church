-- Limit ministry-wide session delegation to the current Department Leader.
-- The capability check keeps Admin and Master Admin access church-scoped.
drop policy if exists "System admins manage department delegations"
  on public.ministry_operation_delegation;

create policy "System admins manage department leader delegations"
  on public.ministry_operation_delegation
  for all to authenticated
  using (
    public.has_capability('church.manage', 'ministry_term', ministry_term_id)
    and exists (
      select 1 from public.term_department td
      where td.ministry_term_id = ministry_operation_delegation.ministry_term_id
        and td.leader_member_profile_id = ministry_operation_delegation.member_profile_id
    )
  )
  with check (
    public.has_capability('church.manage', 'ministry_term', ministry_term_id)
    and exists (
      select 1 from public.term_department td
      where td.ministry_term_id = ministry_operation_delegation.ministry_term_id
        and td.leader_member_profile_id = ministry_operation_delegation.member_profile_id
    )
  );

-- Remove grants created under the previous broader department-member rule.
delete from public.ministry_operation_delegation d
where not exists (
  select 1 from public.term_department td
  where td.ministry_term_id = d.ministry_term_id
    and td.leader_member_profile_id = d.member_profile_id
);

create or replace function public.assert_ministry_operation_delegation_leader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.term_department td
    where td.ministry_term_id = new.ministry_term_id
      and td.leader_member_profile_id = new.member_profile_id
  ) then
    raise exception 'Only a current Department Leader can receive this permission'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.assert_ministry_operation_delegation_leader()
  from public, anon, authenticated;

create trigger ministry_operation_delegation_current_leader
before insert or update of ministry_term_id, member_profile_id
on public.ministry_operation_delegation
for each row execute function public.assert_ministry_operation_delegation_leader();

create or replace function public.revoke_previous_department_leader_delegation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.leader_member_profile_id is not null
    and old.leader_member_profile_id is distinct from new.leader_member_profile_id
    and not exists (
      select 1 from public.term_department td
      where td.ministry_term_id = new.ministry_term_id
        and td.leader_member_profile_id = old.leader_member_profile_id
    ) then
    delete from public.ministry_operation_delegation
    where ministry_term_id = new.ministry_term_id
      and member_profile_id = old.leader_member_profile_id
      and capability = 'ministry.operational.manage';
  end if;
  return new;
end;
$$;

revoke all on function public.revoke_previous_department_leader_delegation()
  from public, anon, authenticated;

create trigger revoke_previous_department_leader_delegation
after update of leader_member_profile_id on public.term_department
for each row execute function public.revoke_previous_department_leader_delegation();
