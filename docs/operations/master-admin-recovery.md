# Master Admin Emergency Recovery Runbook

This document describes the operational procedure for an authorized database administrator to execute a break-glass recovery or transfer of the `master_admin` role seat in TMG Church.

## Principles & Invariants

1. **Strict Singleton Invariant**: Each Church (`Chi Hội`) has exactly one `master_admin` seat enforced by the partial unique index `system_role_one_master_admin_idx`.
2. **Anti-Lockout Protection**: The `trg_protect_master_admin` trigger strictly prevents:
   - Deleting the `master_admin` row.
   - Demoting the `master_admin` role to `admin` or any other role.
   - Reassigning the `master_admin` record to another Church.
3. **Atomic Transfer**: Break-glass recovery does NOT delete the existing record or temporarily create a second master. Instead, it reassigns the `user_id` on the existing `master_admin` row in a single audited transaction.
4. **Append-Only Auditing**: Every break-glass recovery action must atomically write an audit record to `public.application_audit_log` detailing the operator, reason, old user ID, and new user ID without storing credentials.
5. **No Blind Recovery**: The recovery target must be an existing verified `auth.users` account before executing the procedure.

## Prerequisites

- Direct administrative database connection (e.g. Supabase Dashboard SQL Editor or direct PostgreSQL connection with elevated privileges).
- Target Church UUID (e.g. `c0000000-0000-4000-8000-000000000001` for `Chi Hội TMG`).
- Target recovery Auth User UUID (verified in `auth.users`).
- Documented operational reason and incident ticket reference.

## Step-by-Step Procedure

### Step 1: Preflight Verification

Verify that the target Church, current Master Admin, and target recovery user exist:

```sql
-- 1. Check existing master_admin in the target Church
select s.id, s.church_id, s.user_id, s.role, u.email as current_master_email
from public.system_role_assignment s
join auth.users u on u.id = s.user_id
where s.church_id = 'c0000000-0000-4000-8000-000000000001'
  and s.role = 'master_admin';

-- 2. Verify target recovery user exists in auth.users
select id, email, created_at
from auth.users
where id = '<TARGET_RECOVERY_AUTH_USER_UUID>';
```

Verify that:

- Exactly 1 row is returned for Step 1.1.
- Exactly 1 row is returned for Step 1.2.
- The target recovery user does not already hold a conflicting system role assignment in the Church.

### Step 2: Execute Atomic Transfer Transaction

Run the following atomic transaction block. Replace `<CHURCH_UUID>`, `<NEW_AUTH_USER_UUID>`, `<OPERATOR_AUTH_USER_UUID_OR_NULL>`, and `<RECOVERY_REASON>` with actual operational parameters:

```sql
begin;

do $$
declare
  v_church_id uuid := 'c0000000-0000-4000-8000-000000000001'; -- Replace with target church_id
  v_new_user_id uuid := '<TARGET_RECOVERY_AUTH_USER_UUID>'::uuid;
  v_operator_id uuid := null; -- Set to operator's auth.users ID if available, or null for system console
  v_old_user_id uuid;
  v_master_assignment_id uuid;
  v_reason text := 'Break-glass recovery: incident ref #<INCIDENT_ID>';
begin
  -- 1. Resolve current master_admin
  select id, user_id into v_master_assignment_id, v_old_user_id
  from public.system_role_assignment
  where church_id = v_church_id and role = 'master_admin';

  if not found then
    raise exception 'Recovery aborted: No master_admin found for church %', v_church_id;
  end if;

  -- 2. Ensure new user exists
  if not exists (select 1 from auth.users where id = v_new_user_id) then
    raise exception 'Recovery aborted: Target user % does not exist in auth.users', v_new_user_id;
  end if;

  -- 3. If target user holds a regular admin role, remove it first to respect unique(church_id, user_id)
  delete from public.system_role_assignment
  where church_id = v_church_id
    and user_id = v_new_user_id
    and role = 'admin';

  -- 4. Transfer the single master_admin seat
  update public.system_role_assignment
  set user_id = v_new_user_id
  where id = v_master_assignment_id;

  -- 5. Record mandatory append-only audit event with scope
  insert into public.application_audit_log (
    church_id,
    actor_id,
    action,
    scope_type,
    scope_id,
    target_type,
    target_id,
    payload
  ) values (
    v_church_id,
    v_operator_id,
    'authorization.break_glass_master_admin_transfer',
    'church',
    v_church_id,
    'system_role_assignment',
    v_master_assignment_id,
    jsonb_build_object(
      'reason', v_reason,
      'old_user_id', v_old_user_id,
      'new_user_id', v_new_user_id,
      'executed_at', now()
    )
  );
end $$;

commit;
```

### Step 3: Post-Recovery Verification

Confirm that the transfer succeeded and the audit record was logged:

```sql
-- 1. Confirm the master_admin seat now points to the new user
select s.id, s.church_id, s.user_id, s.role, u.email as new_master_email
from public.system_role_assignment s
join auth.users u on u.id = s.user_id
where s.church_id = 'c0000000-0000-4000-8000-000000000001'
  and s.role = 'master_admin';

-- 2. Confirm the append-only audit log entry exists
select id, action, target_type, target_id, payload, created_at
from public.application_audit_log
where action = 'authorization.break_glass_master_admin_transfer'
order by created_at desc
limit 1;
```

### Step 4: Member Profile Synchronization (Optional)

If the new Master Admin has a corresponding `member_profile`, ensure the member profile is linked to the new Auth user and has their email populated:

```sql
update public.member_profile
set user_id = '<TARGET_RECOVERY_AUTH_USER_UUID>',
    email = (select lower(trim(email)) from auth.users where id = '<TARGET_RECOVERY_AUTH_USER_UUID>')
where id = '<TARGET_MEMBER_PROFILE_UUID>'
  and church_id = 'c0000000-0000-4000-8000-000000000001';
```

## Rollback & Safety Guarantees

- Because the update and audit insert execute within a single transaction (`BEGIN ... COMMIT`), any constraint violation or error will automatically roll back the entire operation.
- The `trg_protect_master_admin` trigger prevents any operation from deleting the master seat or creating an orphaned state without a master admin.
- `application_audit_log` has table-level triggers and revoked permissions preventing tampering or deletion of the recovery audit trail.
