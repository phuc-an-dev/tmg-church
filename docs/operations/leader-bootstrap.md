# First-Leader Bootstrap Runbook

This document describes the manual procedure for an authorized database operator to bootstrap the initial church leader.

## Security principles

1. **No self-promotion**: The `public.leaders` table has Row Level Security enabled with no insert or update policies for application roles. Users cannot add themselves or promote others through the web application or API.
2. **No committed credentials**: Never commit a personal, real, or production leader email into git repositories or committed configuration files. Use environment variables or manual operational input.
3. **Identity separation**: Authentication is managed in `auth.users` via Magic Link sign-in. Authorization is managed in `public.leaders` via foreign key linkage on `user_id`.

## Prerequisites

- Access to the target Supabase project via the Supabase Dashboard SQL Editor, or `psql` connection string, or Supabase CLI linked to the project.
- The initial leader's registered email address (e.g. `leader@example.com` placeholder below).

## Step-by-step procedure

### Step 1: Initial user sign-in

After Plan 02 has been implemented and reviewed, have the designated leader perform the initial Magic Link sign-in flow through the application. Plan 01 creates only the database authorization boundary; it does not include an application login flow.

1. Navigate to `/admin/login`.
2. Enter the leader's email (e.g., `leader@example.com`).
3. Click the Magic Link sent to their inbox to create their `auth.users` record.
4. On arrival, because they are not yet in `public.leaders`, they will see an access-denied state. This is expected.

### Step 2: Query auth.users for user ID

Execute the following SQL query in the Supabase SQL Editor or `psql` to find the user's UUID:

```sql
select id, email, created_at
from auth.users
where email = 'leader@example.com';
```

Verify that the email matches exactly and record the returned `id` (UUID).

### Step 3: Insert user into public.leaders

Execute the insert statement using the UUID found in Step 2:

```sql
insert into public.leaders (user_id, email)
values (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual UUID from Step 2
  'leader@example.com'                           -- Replace with matching email
)
on conflict (user_id) do nothing;
```

Alternatively, you can run a single atomic SQL command if operating directly on the database:

```sql
insert into public.leaders (user_id, email)
select id, email
from auth.users
where email = 'leader@example.com'
on conflict (user_id) do nothing;
```

### Step 4: Verification

Confirm that the row exists in `public.leaders`:

```sql
select l.user_id, l.email, l.created_at
from public.leaders l
join auth.users u on u.id = l.user_id
where u.email = 'leader@example.com';
```

The user can now refresh the application or log in again; they will have full leader privileges to manage domain tables.

## Revoking leader access

To revoke leader access, delete the row from `public.leaders`:

```sql
delete from public.leaders
where user_id = (
  select id from auth.users where email = 'leader@example.com'
);
```

Note: If an auth user is deleted from `auth.users`, the foreign key constraint `on delete cascade` on `public.leaders.user_id` will automatically clean up their leader record.
