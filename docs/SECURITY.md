# Security model

## Trust boundaries

- The browser and publishable Supabase key are untrusted.
- Next.js server code improves control flow but does not replace RLS.
- Supabase RLS and database constraints are the final authorization and integrity boundaries.
- The public view is an explicit declassification boundary containing only approved fields.

## RLS requirements

Enable RLS on every base table in the public schema.

Authenticated users may select, insert, update, or delete protected domain rows only when their `auth.uid()` exists in `leaders`. The leader check should be centralized in a safe SQL helper or policy pattern that avoids recursive RLS and fixes `search_path` where a security-definer function is used.

The `leaders` table must not allow a user to insert or promote themselves. A user may be allowed to read only their own allow-list status if the application needs it. Leader creation is an explicit operator action until a dedicated secure leader-management workflow is designed.

No anonymous policy grants access to base tables.

## Public data

Anonymous and authenticated roles receive `SELECT` only on the approved public directory view. The view filters archived members and exposes only fields listed in `docs/DATABASE.md`.

Review public access with an actual anonymous Supabase client. A successful query is not enough; assert that private columns and unrelated rows cannot be selected through the Data API.

## Authentication

- Use Magic Link with PKCE through `@supabase/ssr`.
- Validate the callback `next` parameter as a relative internal path.
- Refresh and persist auth cookies through the current Next.js and Supabase SSR pattern.
- Redirect authenticated non-leaders to a localized access-denied page or state.
- Do not reveal whether an arbitrary email is a leader on the login form.
- Rate limiting and abuse controls remain Supabase configuration concerns for the MVP.

## Secrets

- Commit `.env.local.example` with placeholders only.
- Keep `.env.local` ignored.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser-visible by design.
- Do not add `SUPABASE_SERVICE_ROLE_KEY` to the app or Vercel project.

## Private fields

Phone numbers, auth IDs, archive metadata, care records, attendance data, and private notes are leader-only. UI logs, analytics, toast messages, URLs, and error reporting must not include those values unnecessarily.

## Security review cases

Test at minimum:

1. Anonymous public-view read succeeds.
2. Anonymous base-table reads and writes fail.
3. Authenticated non-leader base-table reads and writes fail.
4. Leader reads and mutations for implemented modules succeed.
5. A user cannot add themselves to `leaders`.
6. Archived members are absent from public results.
7. Phone and care fields are absent from the public view schema and responses.
8. Callback redirection rejects external origins and protocol-relative paths.
