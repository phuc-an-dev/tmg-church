# Plan 02: Supabase clients and authentication

Status: planned, blocked until Plan 01 passes review

Depends on: Plan 01 database and RLS

Review gate: required before protected administration features start

## Objective

Implement the anonymous and authenticated Supabase client boundaries, Magic Link authentication, cookie session refresh, safe callback exchange, leader authorization, access-denied handling, and sign-out. This plan ends with a protected empty administration page; it does not implement church or ministry CRUD.

## Scope

Included:

- Runtime environment validation
- Anonymous public Supabase client
- Authenticated browser and server Supabase clients
- Next.js 16 `proxy.ts` session refresh
- Magic Link request and confirmation state
- PKCE callback exchange
- Server-side leader guard
- Protected admin layout and placeholder landing page
- Non-leader denial and sign-out

Excluded:

- Password authentication
- OAuth providers
- Leader-management UI
- Church, ministry, term, group, department, or member CRUD
- Service-role credentials
- Application-level role claims stored in user-editable metadata

## Final architecture decisions

1. There are two trust contexts: anonymous public and authenticated session-aware. The authenticated context has separate browser and server factories because the runtime APIs differ.
2. Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Add `NEXT_PUBLIC_SITE_URL` for deterministic production Magic Link redirects.
3. Production site URL is `https://tmgchurch.website`; local development is `http://localhost:3000`.
4. Use Magic Link only through `signInWithOtp`. Do not show a password field.
5. Use the current `@supabase/ssr` cookie API and PKCE flow.
6. Use Next.js 16 `src/proxy.ts`; do not create `middleware.ts`.
7. Proxy refreshes/validates the session and may perform only an optimistic signed-in redirect. It must not query `leaders`.
8. The protected admin layout calls a server-only `requireLeader` guard. Every private query and mutation later also relies on RLS.
9. The leader check reads the current user's own allow-list row. It does not trust email text from the browser or user metadata.
10. Login submission always returns the same Vietnamese confirmation message for syntactically valid email, regardless of leader membership or account existence.
11. Callback `next` accepts only `/admin` or a path beginning `/admin/`. Reject protocol-relative, absolute, encoded-origin, and non-admin destinations.
12. Unauthenticated users return to `/admin/login`; authenticated non-leaders go to `/admin/unauthorized`; leaders go to the validated admin destination.

## Route topology

Use route groups so public auth pages are not wrapped by the protected admin layout:

```text
src/app/
  (auth)/
    admin/
      login/
        page.tsx
        loading.tsx
      auth/callback/
        route.ts
      unauthorized/
        page.tsx
  (protected)/
    admin/
      layout.tsx
      page.tsx
      loading.tsx
```

The URL remains `/admin/...`; route-group names do not appear in URLs.

## Expected modules

Environment:

- `src/lib/env.ts`: parse required public environment variables once, produce clear server-side configuration errors, and never log values
- `.env.local.example`: add `NEXT_PUBLIC_SITE_URL=https://tmgchurch.website`

Supabase:

- `src/lib/supabase/public.ts`: no-session client restricted by module purpose to public views
- `src/lib/supabase/client.ts`: memoized browser client using `createBrowserClient`
- `src/lib/supabase/server.ts`: per-request server client using `createServerClient` and Next.js cookies
- `src/lib/supabase/proxy.ts`: request/response cookie synchronization helper
- `src/proxy.ts`: matcher and session refresh entry point

Auth feature:

- `src/features/auth/actions.ts`: Magic Link and sign-out Server Actions
- `src/features/auth/queries.ts`: `getAuthContext` and `requireLeader`, marked server-only and deduplicated per request
- `src/features/auth/schemas.ts`: email validation and typed action-state schema
- `src/features/auth/types.ts`: small public action/result types only when inference is insufficient
- `src/components/auth/login-form.tsx`: interactive form boundary
- `src/components/auth/sign-out-button.tsx`: pending-safe sign-out control

Names may be adjusted to match an established feature convention, but responsibilities must remain separated.

## Supabase client behavior

Public client:

- Uses the publishable key.
- Does not persist or refresh auth sessions.
- Is used only for approved public views.
- Never imports Next.js cookies.

Browser client:

- Uses `createBrowserClient`.
- Reuses one instance in the browser.
- Is not imported into Server Components.

Server client:

- Uses `createServerClient` with `cookies().getAll()` and `setAll()` behavior compatible with the installed Next.js version.
- Creates an instance per request context.
- Handles contexts where Server Components cannot write cookies without hiding unexpected errors.
- Is the only client used by protected server reads and Server Actions.

Proxy:

- Copies the incoming request cookies into the Supabase client.
- Copies refreshed cookies to both request and response exactly as required by the installed Supabase SSR documentation.
- Excludes static assets, image optimization, favicon, and common asset extensions through a documented matcher.
- Does not perform a database leader lookup.

## Magic Link flow

Request:

1. Validate and normalize the email with Zod.
2. Build `emailRedirectTo` from the configured site URL, using localhost only in development.
3. Request the Magic Link with callback destination `/admin/auth/callback?next=/admin`.
4. Return a generic Vietnamese confirmation state.
5. Preserve the submitted email only as needed for the form; do not place it in a URL.

Callback:

1. Read `code` and `next` from the request URL.
2. Validate `next` against the admin-only rule.
3. Exchange the code for a session.
4. On exchange failure, redirect to `/admin/login?status=link-invalid`.
5. On success, redirect to the validated admin destination.
6. Let the protected admin layout decide leader versus non-leader access.

Product copy is Vietnamese. Error query values are stable English codes translated at the page boundary; raw Supabase messages never appear in the URL or UI.

## Leader guard

`getAuthContext` returns a typed union rather than nullable unrelated values:

- signed out
- signed in but unauthorized
- authorized leader with stable user ID and email when available

`requireLeader` redirects signed-out and unauthorized states appropriately and returns the authorized context otherwise.

Use token verification supported by the installed Supabase SDK, then query only the current user's own `leaders` row. Do not use `getSession()` alone as authorization evidence on the server. Cache the guard result only for the current React server render/request, never across users.

## Interface behavior

Login page:

- Vietnamese heading, explanation, email label, submit label, sent state, invalid-link state, and retry action
- Single email field at 16 px or larger on mobile
- Pending state prevents duplicate requests
- Light and dark theme compatibility
- No statement revealing whether the submitted address is registered or authorized
- No emoji; Lucide icons only

Unauthorized page:

- Explains in Vietnamese that the signed-in account lacks leader access
- Shows the current email when safely available
- Provides sign out and return-home actions
- Does not expose the leader allow-list

Protected landing page:

- Minimal Vietnamese placeholder identifying that authentication succeeded
- Sign-out control
- No Church or Ministry feature UI yet

## Supabase dashboard configuration checklist

Document, but do not silently mutate, these external settings:

- Site URL: `https://tmgchurch.website`
- Redirect allow-list: `https://tmgchurch.website/admin/auth/callback`
- Local redirect: `http://localhost:3000/admin/auth/callback`
- Email provider enabled
- Magic Link email template uses the confirmation URL supplied by Supabase
- First leader has signed in once and was bootstrapped using Plan 01 instructions

Preview deployment redirects remain disabled until an explicit safe allow-list strategy is approved.

## Implementation sequence

1. Confirm Plan 01 review is accepted and generated database types exist.
2. Read installed Next.js auth, cookies, Route Handler, Server Action, and Proxy documentation.
3. Read current Supabase SSR client and Magic Link documentation.
4. Add and validate `NEXT_PUBLIC_SITE_URL` without exposing secrets.
5. Implement the three client factories and proxy helper.
6. Implement `src/proxy.ts` and verify cookie refresh behavior.
7. Implement auth schemas, typed action results, Magic Link action, and login UI.
8. Implement safe callback exchange.
9. Implement auth context, leader guard, protected layout, unauthorized state, and sign out.
10. Verify all auth states and record evidence.
11. Stop and request independent review.

## Verification matrix

Environment and client separation:

- Missing variables fail with a clear developer error and no credential value.
- Public modules do not import authenticated server helpers.
- Client Components do not import server-only modules.
- No service-role key exists.

Magic Link:

- Valid email produces the generic sent state.
- Invalid email produces localized field validation.
- Repeated submit is disabled while pending.
- Callback stores a cookie-backed session.
- Expired, reused, or malformed links return the localized invalid-link state.
- External and protocol-relative `next` values cannot redirect away from the admin area.

Authorization:

- Signed-out `/admin` access redirects to login.
- Authenticated non-leader access reaches unauthorized.
- Bootstrapped leader access reaches the protected page.
- Removing the leader row blocks the next protected request.
- Proxy never becomes the sole authorization layer.
- Base-table RLS still denies direct non-leader access.

Session lifecycle:

- Refresh cookies survive a full reload.
- Opening a protected URL directly works for a valid leader session.
- Signing out clears access and prevents cached admin content from reappearing.
- Multiple tabs converge after reload without exposing private data.

Responsive and accessible UI:

- Verify 320, 375, 390, 768, 1024, and 1440 px widths.
- Email input renders at least 16 px on mobile and does not trigger focus zoom on an actual iPhone or iOS simulator when available.
- Keyboard focus, labels, error association, pending feedback, and dark theme are correct.

Repository:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`
- `pnpm build`

## Completion and handoff

Record route behavior, cookie evidence without token values, leader/non-leader results, dashboard configuration still required, and quality-gate output in `docs/reviews/REVIEW_LOG.md`. Do not start admin CRUD. Plan 03 remains blocked until review closes all blocking and high findings.

## Implementation references

- Supabase SSR client creation: `https://supabase.com/docs/guides/auth/server-side/creating-a-client`
- Supabase Magic Link API: `https://supabase.com/docs/reference/javascript/auth-signinwithotp`
- Next.js authentication guidance: `https://nextjs.org/docs/app/guides/authentication`
- Next.js Proxy convention: `https://nextjs.org/docs/app/getting-started/proxy`

The installed Next.js documentation in `node_modules/next/dist/docs/` is authoritative for framework APIs used by this exact dependency version.
