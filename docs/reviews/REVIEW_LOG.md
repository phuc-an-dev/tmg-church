# Review log

Use one section per implementation or review pass. Keep newest entries at the top below this instruction.

## 2026-09-12: Plan 02 final remediation (ready for review)

Role: coding agent

Remediated scope:

- Global Vietnamese language contract:
  - Updated root layout `src/app/layout.tsx` to declare `<html lang="vi">`.
  - Configured `Geist` font to load both `latin` and `vietnamese` subsets.
  - Replaced scaffold metadata with product metadata: title default "Hội Thánh TMG" (template: "%s | Hội Thánh TMG") and description "Hệ thống thông tin và quản trị Hội Thánh TMG".
  - Maintained code, identifiers, comments, and technical documentation in English.
- Scaffolding cleanup:
  - Replaced Hello world scaffold in `src/app/page.tsx` with a minimal Vietnamese holding page featuring the Lucide `Church` icon, operational description, and an accessible link to the admin area without fetching public data or implementing the future directory.
  - Added localized app-level `src/app/not-found.tsx` returning HTTP 404 with Vietnamese metadata, heading, explanation, and an accessible Lucide `Home` button returning to `/`.
  - Prohibited emoji and Unicode symbols across all UI pages.
- Magic Link email localization & operations:
  - Added repository-owned HTML email template `supabase/templates/magic_link.html` using Vietnamese subject and body, strict table layout, accessible inline styling, and exact `{{ .ConfirmationURL }}` parameter without token leakage or password flows.
  - Configured `[auth.email.template.magic_link]` in `supabase/config.toml` referencing `./supabase/templates/magic_link.html`.
  - Added technical operations runbook `docs/operations/supabase-auth-dashboard.md` documenting hosted Supabase dashboard settings (Site URL, redirect allow-lists, Vietnamese Magic Link subject and body template with `{{ .ConfirmationURL }}`) without applying them to the hosted project.
- Visual design & theme tokens:
  - Updated semantic `primary`, `ring`, and `sidebar-primary` tokens in `src/app/globals.css` to an accessible blue (`oklch(0.488 0.243 264.376)` in light mode, `oklch(0.5 0.22 264.376)` in dark mode) while preserving neutral white and dark surfaces.
  - Default theme remains light.
- Accessibility refinements:
  - Enforced touch target heights of at least 44px on primary actions: login submit button (`min-h-[44px] h-11`), form reset button, unauthorized return home and sign-out buttons, and 404 home action.
  - Added `role="status"` and `aria-live="polite"` to the Magic Link sent confirmation message in `LoginForm`.
  - Added `motion-reduce:animate-none` to loading spinners (`Loader2`) and all skeleton placeholder animations (`LoginLoading`, `AdminLoading`).
  - Preserved visible focus rings, labels, field-error association, 16px mobile input font size, and `break-all` email wrapping.

Verification evidence:

- HTML language & metadata: Verified via HTTP responses that `/admin/login`, `/`, and unknown routes render `<html lang="vi">` with localized Vietnamese titles and meta descriptions.
- Holding page: Verified `/` renders only Vietnamese user-facing copy, Lucide icons, and admin area action.
- 404 behavior: Verified unknown routes return HTTP 404 with localized "Không tìm thấy trang" copy and a functional return-home action.
- Email delivery & Mailpit: Restarted local Supabase stack and dispatched Magic Link request; verified Mailpit received email with exact Vietnamese subject ("Đăng nhập vào Hệ thống Quản trị Hội Thánh TMG") and localized body containing the confirmation URL.
- PKCE callback exchange: Verified following the confirmation link successfully redirected to `/admin/auth/callback`, exchanged the authorization code for session cookies, and redirected to `/admin`.
- Authorization guard & revocation:
  - Authenticated non-leader requesting `/admin` received HTTP 307 redirect to `/admin/unauthorized` displaying their email address.
  - Promoting user into `public.leaders` granted immediate access to `/admin` rendering protected dashboard (HTTP 200).
  - Deleting leader row immediately revoked access on the next request, redirecting to `/admin/unauthorized` (HTTP 307).
- Unauthenticated access: Verified requesting `/admin` without session cookies immediately redirects to `/admin/login` (HTTP 307).
- Callback security: Verified invalid callback codes redirect to `/admin/login?status=link-invalid` with localized error alert and no-cache headers.
- Quality gate: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, and `git diff --check` all passed with zero errors.

Hosted Supabase project was not modified and requires manual dashboard configuration as documented in `docs/operations/supabase-auth-dashboard.md`.

## 2026-09-12: Plan 02 remediation (ready for review)

Role: coding agent

Remediated scope:

- Browser-safe environment access: Refactored `src/lib/env.ts`, `src/lib/supabase/client.ts`, and `src/lib/supabase/public.ts` to directly reference `process.env.NEXT_PUBLIC_*` without dynamic indexing, object aliasing, or destructuring. Enforced `http:` or `https:` protocol validation while preserving descriptive errors without credential leakage.
- `@supabase/ssr` 0.12.7 cookie contract alignment:
  - Updated `src/lib/supabase/proxy.ts` to accept the second `setAll` argument (`headers`) and propagate `Cache-Control`, `Expires`, and `Pragma` alongside refreshed `Set-Cookie` headers to both request and response.
  - Simplified Proxy by removing the optional `/admin/login` -> `/admin` redirect, keeping Proxy dedicated strictly to session refresh via `supabase.auth.getClaims()` without database lookups.
  - Updated `src/app/(auth)/admin/auth/callback/route.ts` to ensure callback redirect responses establishing a session explicitly include non-cacheable headers (`Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0`).
  - Refactored `src/lib/supabase/server.ts` to handle Server Component read-only cookies (`ReadonlyRequestCookiesError`) intentionally while allowing unexpected exceptions in writable contexts to surface.
- Account enumeration safety: Updated `src/features/auth/actions.ts` so that syntactically valid email submissions always return the exact same generic Vietnamese confirmation state regardless of account existence, leader status, or provider errors. Provider failures log operational data server-side without echoing sensitive values.
- Login retry flow: Restructured `src/components/auth/login-form.tsx` with a remounting component boundary (`LoginFormInner`) keyed on reset so clicking “Gửi lại hoặc nhập địa chỉ khác” resets `useActionState` to a clean, editable form.
- UI refinements:
  - Added repository-owned shadcn `Input` (`src/components/ui/input.tsx`) with 16px font size on mobile.
  - Reused shadcn `Button` and `Input` in `LoginForm` and `SignOutButton`.
  - Updated login email placeholder domain to `tmgchurch.website`.
  - Fixed skeleton overflow in `src/app/(protected)/admin/loading.tsx` to prevent horizontal scrolling on 320px screens.
  - Added `break-all` and `truncate` to displayed email addresses in `unauthorized/page.tsx`, `layout.tsx`, and `admin/page.tsx`.

Verification evidence:

- Browser Supabase client: Instantiated and verified `createBrowserClient` runtime contract with functional auth and table methods.
- Cookie contract & headers: Verified callback redirect sets `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`, `Pragma: no-cache`, and `Expires: 0`. Verified Proxy session refresh propagates cookies and headers to response.
- Enumeration safety: Verified that existing leader, non-leader, non-existing email, and simulated provider error all return the exact same Vietnamese confirmation message.
- Validation: Verified invalid email syntax returns localized field error ("Địa chỉ email không đúng định dạng.").
- PKCE callback security: Verified rejection of external URLs (`https://attacker.com`), protocol-relative URLs (`//attacker.com`), and non-admin routes (`/public`), returning to `/admin/login?status=link-invalid`.
- End-to-end auth cycle: Tested Magic Link generation, local Mailpit receipt, PKCE callback code exchange, non-leader denial to `/admin/unauthorized`, leader promotion access to `/admin`, leader revocation immediate denial, and test user database cleanup.
- Quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, and `git diff --check` passed with 0 errors.

Hosted Supabase project was not modified.

## 2026-09-11: Plan 02 implementation (ready for review)

Role: coding agent

Delivered scope:

- Runtime environment validation in `src/lib/env.ts` with strict error handling without secret leakage.
- Three-tier Supabase client architecture: `createPublicClient` (no cookies/session, approved public views), `createClient` (browser memoized), and `createClient` (server per-request using async Next.js cookies).
- Next.js 16 `src/proxy.ts` session refresh handler with asset exclusion matcher.
- Safe redirect validation rejecting protocol-relative, external, and non-admin targets.
- Passwordless Magic Link authentication via `sendMagicLink` Server Action and PKCE callback exchange.
- Server-side `requireLeader` guard and `getAuthContext` query with per-request deduplication via React `cache()`.
- Public auth routes: `/admin/login`, `/admin/auth/callback`, `/admin/unauthorized`.
- Protected admin route group: `/admin` dashboard placeholder wrapped with leader authorization layout.
- Pending-safe sign-out button and form controls.
- Localized Vietnamese user-facing copy, 16px minimum mobile input font size, no emojis, Lucide icons only.

Verification evidence:

- Boundaries: Verified no `SUPABASE_SERVICE_ROLE_KEY` in application code; public client does not import cookie utilities; client components do not import server-only modules.
- Environment: Missing environment variables throw descriptive configuration errors without echoing credential values.
- Unauthenticated access: Direct navigation to `/admin` returns HTTP 307 redirecting to `/admin/login`.
- Login interface: `/admin/login` renders Vietnamese heading, description, 16px email input, and accessible submit action; `/admin/login?status=link-invalid` renders localized error alert.
- Callback security: Callback requests with missing code, invalid code, external origin (`https://evil.com`), protocol-relative target (`//evil.com/admin`), or non-admin target (`/public`) are safely rejected and routed to `/admin/login?status=link-invalid`.
- Magic Link & PKCE: Disposable test user requested Magic Link; email received in local Mailpit; callback exchanged code for cookie-backed session and redirected to `/admin`.
- Non-leader authorization: Authenticated non-leader requesting `/admin` is redirected to `/admin/unauthorized` (HTTP 307); `/admin/unauthorized` renders Vietnamese access-denied state displaying current account email and sign-out control.
- Leader authorization: Inserting user into `public.leaders` grants immediate access to `/admin` rendering protected dashboard and authenticated leader header.
- Leader revocation: Removing row from `public.leaders` revokes access immediately on next request, redirecting to `/admin/unauthorized`.
- Quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, and `git diff --check` all passed with zero errors.

Hosted Supabase project was not modified.

## 2026-09-11: Plan 01 completion

Result: accepted

Commit: `42cd479 feat: establish database schema and RLS`

Delivered artifacts: initial Supabase schema and RLS migration, generated database types, `member_profile_public`, and the first-leader bootstrap runbook.

Integrity: ownership and scope keys are immutable after insertion; targeted child checks enforce cross-church and cross-term relationships. The concurrent member-church reassignment and membership-insert regression produced no invalid relationship.

Security: all 22 base tables have RLS; `anon` has no base-table access; authenticated leader access is policy-controlled; the reduced public view is the only anonymous data projection and excludes private fields.

Verification: clean local reset applied the migration, generated types matched the local schema, Supabase database lint and the repository quality gate passed, and `git diff --check` passed.

Remaining findings: none.

Hosted Supabase project was not modified.

## 2026-09-11: Detailed plans review

Role: planning and review agent

Result: accepted for sequential implementation

Findings resolved: Next.js proxy routing, public/protected auth route separation, attendance normalization, group-membership cardinality, public view scope, Magic Link site URL, and Plan 03 checkpoints.

Blocking or high findings: none.

## 2026-09-11: Foundation review pass

Role: review agent

Result: accepted with scheduled non-blocking work

Findings: Vietnamese public content remains scheduled for Slice 6; administration theme tokens remain scheduled for Slice 3; ESLint 9 compatibility remains monitored.

## 2026-09-11: Foundation planning pass

Role: planning agent

Decisions recorded: member archive uses `archived_at`; the public directory uses ministry and term slugs; the database schema is created in full while UI work remains incremental; the current UI supports one active church.
