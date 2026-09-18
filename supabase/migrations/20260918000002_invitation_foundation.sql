-- Milestone B: invitation-only account foundation.
-- Raw tokens are returned once to the Server Action for delivery and are never
-- stored in the database or written to the application audit payload.

create table if not exists public.member_access_invitation (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.church(id) on delete restrict,
  member_profile_id uuid not null references public.member_profile(id) on delete restrict,
  email text not null check (email = lower(trim(email))),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists member_access_invitation_member_idx
  on public.member_access_invitation (member_profile_id, created_at desc);
create index if not exists member_access_invitation_church_idx
  on public.member_access_invitation (church_id, created_at desc);
create unique index if not exists member_access_invitation_pending_member_idx
  on public.member_access_invitation (member_profile_id)
  where consumed_at is null and revoked_at is null;

alter table public.member_access_invitation enable row level security;
revoke all on table public.member_access_invitation from public, anon, authenticated;
drop policy if exists "System admins read invitations" on public.member_access_invitation;
create policy "System admins read invitations"
  on public.member_access_invitation for select to authenticated
  using (public.is_system_admin_for_church(church_id));

create or replace view public.member_access_invitation_status as
select id, church_id, member_profile_id, email, expires_at, consumed_at,
  revoked_at, created_by, created_at
from public.member_access_invitation
where public.is_system_admin_for_church(church_id);
revoke all on public.member_access_invitation_status from public, anon, authenticated;
grant select on public.member_access_invitation_status to authenticated;

create or replace function public.create_member_access_invitation(
  p_church_id uuid,
  p_member_profile_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_token text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
  v_action text;
begin
  if not public.is_system_admin_for_church(p_church_id) then
    raise exception 'Unauthorized invitation request' using errcode = '42501';
  end if;

  select lower(trim(mp.email)) into v_email
  from public.member_profile mp
  where mp.id = p_member_profile_id
    and mp.church_id = p_church_id
    and mp.archived_at is null;
  if v_email is null or v_email = '' then
    raise exception 'An active member email is required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_member_profile_id::text, 0));
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '15 minutes';

  update public.member_access_invitation
  set revoked_at = now()
  where member_profile_id = p_member_profile_id
    and consumed_at is null
    and revoked_at is null;

  v_action := case when exists (
    select 1 from public.member_access_invitation
    where member_profile_id = p_member_profile_id
  ) then 'authorization.invitation.resent' else 'authorization.invitation.created' end;

  insert into public.member_access_invitation (
    church_id, member_profile_id, email, token_hash, expires_at, created_by
  ) values (
    p_church_id, p_member_profile_id, v_email,
    encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires_at, auth.uid()
  ) returning id into v_invitation_id;

  insert into public.application_audit_log (
    church_id, actor_id, action, scope_type, scope_id, target_type, target_id, payload
  ) values (
    p_church_id, auth.uid(), v_action, 'church', p_church_id,
    'member_access_invitation', v_invitation_id,
    jsonb_build_object('member_profile_id', p_member_profile_id, 'expires_at', v_expires_at)
  );

  return jsonb_build_object(
    'id', v_invitation_id,
    'email', v_email,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.revoke_member_access_invitation(
  p_church_id uuid,
  p_invitation_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_system_admin_for_church(p_church_id) then
    raise exception 'Unauthorized invitation request' using errcode = '42501';
  end if;

  update public.member_access_invitation
  set revoked_at = now()
  where id = p_invitation_id
    and church_id = p_church_id
    and consumed_at is null
    and revoked_at is null;
  return found;
end;
$$;

create or replace function public.preview_member_access_invitation(
  p_token text
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('email', i.email, 'expires_at', i.expires_at)
  from public.member_access_invitation i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and i.consumed_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  limit 1;
$$;

create or replace function public.consume_member_access_invitation(
  p_token text,
  p_email text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.member_access_invitation%rowtype;
  v_profile public.member_profile%rowtype;
  v_email text := lower(trim(p_email));
  v_auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select lower(trim(u.email)) into v_auth_email
  from auth.users u
  where u.id = auth.uid();
  if v_auth_email is null or v_auth_email <> v_email then
    raise exception 'Authenticated email does not match invitation' using errcode = 'P0001';
  end if;

  select i.* into v_invitation
  from public.member_access_invitation i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and i.consumed_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired' using errcode = 'P0001';
  end if;

  select mp.* into v_profile
  from public.member_profile mp
  where mp.id = v_invitation.member_profile_id
    and mp.church_id = v_invitation.church_id
    and mp.archived_at is null
  for update;

  if not found or v_invitation.email <> v_email or coalesce(lower(trim(v_profile.email)), '') <> v_email then
    raise exception 'Invitation email does not match' using errcode = 'P0001';
  end if;

  if v_profile.user_id is not null and v_profile.user_id <> auth.uid() then
    raise exception 'Member profile is already linked' using errcode = 'P0001';
  end if;

  update public.member_profile
  set user_id = auth.uid()
  where id = v_profile.id
    and user_id is null;

  update public.member_access_invitation
  set consumed_at = now()
  where id = v_invitation.id
    and consumed_at is null;

  insert into public.application_audit_log (
    church_id, actor_id, action, scope_type, scope_id, target_type, target_id, payload
  ) values (
    v_invitation.church_id, auth.uid(), 'authorization.invitation.consumed',
    'church', v_invitation.church_id, 'member_profile', v_profile.id,
    jsonb_build_object('invitation_id', v_invitation.id)
  );

  return v_profile.id;
end;
$$;

revoke all on function public.create_member_access_invitation(uuid, uuid) from public, anon;
revoke all on function public.revoke_member_access_invitation(uuid, uuid) from public, anon;
revoke all on function public.preview_member_access_invitation(text) from public, anon, authenticated;
revoke all on function public.consume_member_access_invitation(text, text) from public, anon;
grant execute on function public.create_member_access_invitation(uuid, uuid) to authenticated;
grant execute on function public.revoke_member_access_invitation(uuid, uuid) to authenticated;
grant execute on function public.preview_member_access_invitation(text) to anon, authenticated;
grant execute on function public.consume_member_access_invitation(text, text) to authenticated;
