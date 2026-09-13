# Review log

Use one section per implementation or review pass. Keep newest entries at the top below this instruction. When a plan is accepted, replace its iterative entries with one completion summary.

## 2026-09-13: Administrative request-path optimization

Result: ready for review

Scope: restricted Supabase session-refresh Proxy execution to `/admin/:path*` and changed server-side identity verification from `getUser()` to JWT-validating `getClaims()`. Leader authorization remains a separate RLS-backed `leaders` query. Removed the unused full-user payload from the auth context.

Manual verification:

- Reloaded `/admin/church` with an authenticated session and confirmed the protected Church Settings page remained accessible.
- Confirmed every protected Server Action and protected query continues to call `requireLeader()` independently of Proxy coverage.

Quality gates:

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm format:check`: passed.
- `pnpm build`: passed with Next.js 16.3.4 Turbopack.
- `git diff --check`: passed.

## 2026-09-13: Administration visual-system refinement

Result: ready for review

Scope: consolidated authenticated header utilities into an evenly padded avatar menu, aligned the authentication shell with the protected administration shell, kept Edit as the only visible Church card action, isolated Delete on `/admin/church/advanced` behind the page-header More menu, compressed created and updated metadata into one row using `yyyy-MM-dd, HH:mm`, moved mutation success feedback into a shared top-center toast with entry and exit transitions, simplified the login form, standardized primary login and Church inputs, corrected the sign-in panel's 24/32 px inner padding, positioned it slightly above center, and removed the superseded theme toggle plus unused trigger and compact-brand branches.

Manual verification:

- Confirmed the avatar menu exposes the signed-in email, spacious icon rows, Light, Dark, System, and Sign out actions.
- Confirmed theme selection changes the protected Church page and restored Light as the default selection.
- Confirmed `/admin/login` and `/admin/church` share the white brand header, neutral canvas, surface geometry, spacing, and typography at mobile width; the sign-in card contains only its title and form, preserves 24 px mobile padding, and sits slightly above viewport center.
- Confirmed `/admin/church` at desktop width retains the horizontal navigation, compact Church card, visible Edit action, one-row numeric metadata, and no mobile dock.
- Confirmed Edit remains a 44 px visible touch target; its editor contains only editable fields and equal-width Cancel/Save actions. Delete is absent from the card and edit editor, and requires navigation through More to the dedicated Advanced settings route before exact-name confirmation.
- Confirmed mobile responsive editors preserve 40 px of visual separation between the final form control and the sticky action footer without changing the desktop dialog layout.
- Confirmed the Advanced settings page renders correctly at mobile and desktop widths, keeps the deletion control isolated in its own destructive panel, and leaves Delete disabled until the exact Church name matches.
- Confirmed successful deletion returns directly to the zero-Church state while carrying only a fixed status code for toast feedback; no stale deleted entity remains interactive.

Quality gates:

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm format:check`: passed.
- `pnpm build`: passed with Next.js 16.3.4 Turbopack.
- `git diff --check`: passed.

## 2026-09-12: Plan 03 Checkpoint 03A completion

Result: accepted after independent review

Scope: administration shell, theme behavior, English product language, and single-Church management

Scope delivered:

- Database boundary singleton enforcement: added PostgreSQL unique index `church_singleton_idx ON public.church ((true))` in `supabase/migrations/20260912000001_atomic_church_creation.sql`. Every insertion path (including direct table inserts and privileged clients) strictly permits at most one Church record.
- Execution privilege restriction on `create_initial_church`: explicitly revoked function execution from `PUBLIC` and `anon`; granted `EXECUTE` only to `authenticated`. Preserved internal `is_leader()` authorization check.
- Complete English language migration: updated active Magic Link subject in `supabase/config.toml` to `Sign in to TMG Church Administration`. Confirmed email delivery with exact subject in Mailpit. Scanned repository; all static UI, metadata, errors, validation, and email copy are English.
- Removal of Supabase Studio debris: deleted `supabase/snippets/Untitled query 998.sql` and removed the empty `supabase/snippets/` directory. Zero personal emails exist in git status or source.
- Standardized mobile touch targets:
  - Updated default `SheetContent` close button in `src/components/ui/sheet.tsx` to `size-11 min-h-[44px] min-w-[44px]` (real 44×44 px minimum touch target), covering the mobile administration navigation drawer.
  - Added `pr-16` to mobile navigation `SheetHeader` in `src/components/admin/admin-header.tsx` ensuring title clearance for the 44px close target.
  - Updated Create Church "Advanced/Simple" toggle control in `src/features/church/components/create-church-dialog.tsx` to minimum 44px touch height (`min-h-[44px] px-3 gap-1.5`).
- Success-feedback timer cleanup: refactored `handleActionSuccess` in `src/features/church/components/church-management.tsx` using `useRef` and `useEffect` unmount cleanup. Ensures previous timer is canceled before setting a new message, preventing older timers from prematurely removing newer feedback.

Verification evidence:

1. Invariant & Concurrency Verification (Findings 1 & 7a):
   - From zero-Church state, launched 2 genuinely concurrent authenticated-leader `create_initial_church` calls via parallel processes. Connection A succeeded (`INSERT 0 1`), Connection B failed with `23505: A church already exists in the system`. Final church count was exactly 1.
2. Database Boundary Enforcement (Findings 1 & 7b):
   - With 1 Church present, executed direct authenticated-leader `INSERT INTO public.church (name, slug) VALUES ('Direct Church B', 'direct-church-b')`. Blocked at the database boundary: `ERROR: duplicate key value violates unique constraint "church_singleton_idx"`.
3. Execution Privilege Verification (Findings 2, 7c, 7d):
   - Verified with `has_function_privilege`:
     - `anon = false` (`f`)
     - `authenticated = true` (`t`)
   - Role `anon` calling `create_initial_church` failed: `ERROR: permission denied for function create_initial_church`.
   - Role `authenticated` with non-leader JWT calling `create_initial_church` failed: `ERROR: Unauthorized (42501)`.
4. Real Application Mutation Verification (Findings 7e & 7f):
   - Invoked `deleteChurchAction` via real server action execution:
     - Leading whitespace (`"  Hội Thánh TMG"`): rejected with `{ success: false, code: "NAME_MISMATCH" }`.
     - Trailing whitespace (`"Hội Thánh TMG  "`): rejected with `{ success: false, code: "NAME_MISMATCH" }`.
     - Lowercase variation (`"hội thánh tmg"`): rejected with `{ success: false, code: "NAME_MISMATCH" }`.
     - Uppercase variation (`"HỘI THÁNH TMG"`): rejected with `{ success: false, code: "NAME_MISMATCH" }`.
   - Temporarily disabled singleton constraint and inserted second Church record:
     - Real `updateChurchAction` rejected: `{ success: false, code: "MULTIPLE_CHURCHES_ERROR" }`.
     - Real `deleteChurchAction` rejected: `{ success: false, code: "MULTIPLE_CHURCHES_ERROR" }`.
     - Cleaned up second record, restored `church_singleton_idx`, verified count = 1.
5. Database Hygiene (Finding 7g):
   - Removed all temporary verification users, leader grants, routes, snippets, messages, and credentials. Restored the designated local leader identity through local OTP signup and the documented operator grant without committing its email. Preserved the pre-existing local Church record verbatim. No service-role keys were used.
6. Responsive & Touch Target Audit (Findings 5 & 8):
   - Verified 320, 375, 390, 768, 1024, and 1440 px breakpoints across `/admin` and `/admin/church`.
   - Sheet close button: 44×44 px (`size-11 min-h-[44px] min-w-[44px]`).
   - Advanced/Simple button: 44 px height (`min-h-[44px]`).
   - Mobile form inputs: 16 px (`text-base`).
   - Shared visual contracts: Card padding (`p-4 sm:p-6`), buttons (`min-h-[44px] w-full sm:w-auto`), 0 horizontal overflow.
   - Theme contrast: Light theme 6.82:1, dark theme 5.11:1 (WCAG AA compliant).
7. Quality Gates:
   - `pnpm lint`: passed (0 warnings, 0 errors).
   - `pnpm typecheck`: passed (0 errors).
   - `pnpm format:check`: passed (all files match Prettier style).
   - `pnpm build`: passed (Next.js 16.3.4 Turbopack build succeeded).
   - `git diff --check`: passed (0 whitespace errors).
   - `npx supabase db lint`: passed (No schema errors found).
   - Local Supabase reset: `npx supabase db reset` executed cleanly.
   - Hosted Supabase project was not modified. The implementation was left uncommitted for independent review.

Independent review result:

- Confirmed the singleton index and RPC privileges against the running local database.
- Re-ran the complete repository quality gate and Supabase database lint successfully.
- Confirmed one intended local auth user, one matching leader grant, one preserved Church record, zero temporary verification accounts, and an empty local test mailbox.
- No blocking or high-severity findings remain. Checkpoint 03B is authorized as the next implementation slice.

## 2026-09-12: Plan 02 completion

Result: accepted

Commit: `25d6cf2 feat: add Supabase authentication and admin shell`

Delivered artifacts: validated environment access, anonymous and cookie-backed Supabase client boundaries, Next.js Proxy session refresh, Magic Link PKCE login and callback, server-side leader authorization, sign-out, protected administration routes, localized email template and operator runbook, and Vietnamese root, not-found, login, denial, and temporary administration states.

Security: callback redirects are restricted to safe administration paths; auth responses are non-cacheable; valid login submissions are enumeration-safe; authorization is rechecked against `leaders`; RLS remains authoritative; no service-role key is used.

Interface: product copy and metadata are Vietnamese; source and technical content remain English; the app uses Lucide icons, 16 px mobile inputs, 44 px primary actions, reduced-motion handling, blue semantic tokens, and light/dark-compatible surfaces.

Verification: local Magic Link delivery, PKCE exchange, signed-out access, non-leader denial, leader grant and revocation, sign-out, safe redirect rejection, localized HTTP output, responsive overflow checks, and all repository quality gates passed.

Operations: the hosted Supabase project was not modified. Required dashboard settings are documented in `docs/operations/supabase-auth-dashboard.md`.

Remaining findings: none.

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

## 2026-09-13: Checkpoint 03B implementation evidence

Role: coding agent

Result: ready for independent review; not accepted

Delivered: private Ministry, Ministry Term, Term Group, and Term Department CRUD routes; server-only RLS-backed queries and Server Actions; Zod validation; slug generation and advanced slug editing; date range validation; parent-child checks; URL-backed search, sort, filters, sections, pagination, and page size; responsive table/card collection treatment; responsive editor and guarded permanent deletes. The active administration navigation now includes Ministries.

Database: no migration was required because the accepted initial schema already contains the required structural uniqueness, restrictive foreign keys, and term date constraint. `npx supabase db lint` reported no schema errors.

Verification: `node_modules/.bin/tsc --noEmit`, targeted ESLint, `node_modules/.bin/prettier --check 'src/**/*.{ts,tsx}'`, `node_modules/.bin/next build`, and `git diff --check` passed. The build recognizes all three new protected routes. The prescribed `pnpm` commands could not run because the installed pnpm 11 requires Node 22.13+ while the host shell provides Node 20.20.2; direct project binaries supplied equivalent TypeScript, lint, formatting, and build evidence.

Remaining review work: perform the signed-out, non-leader, leader, direct-RLS, tampering, date-boundary, deletion-dependency, and required viewport/accessibility manual matrix against a local authenticated data set. No temporary users or records were created, and no hosted Supabase project was modified.

## 2026-09-13: Ministry visual identity extension evidence

Role: coding agent

Result: ready for independent review; not accepted

Delivered: a constrained Ministry accent color and Lucide icon identity model, including a database migration with normalized color and fixed icon-key constraints; defaults for new records; generated Ministry database types; shared registry and safe visual fallbacks; Zod validation; Server Action persistence; color swatches with one selected check; an optional custom hex/color control; a searchable keyboard-operable icon grid; live identity preview; and Ministry identity tiles in collection and nested Ministry/Term headers. Terms, Groups, and Departments do not receive identity fields.

Database: local migration `20260913000002_ministry_visual_identity.sql` applied without reset. `npx supabase db lint --local` reported no schema errors. The existing local Ministry record remained present with its already-configured identity values, so no Church, leader, or Ministry records were reset or overwritten.

Verification: `node_modules/.bin/tsc --noEmit`, targeted ESLint, Prettier check, `node_modules/.bin/next build`, `git diff --check`, local migration status, and local database lint passed. The production build completed successfully; Supabase emitted its existing Node 20 deprecation warning. The prescribed `pnpm` commands remain unavailable because pnpm 11 requires Node 22.13+ while the host shell provides Node 20.20.2.

Remaining review work: manually verify the identity picker in light and dark themes at mobile and desktop breakpoints, and run the authorized authentication/RLS matrix before acceptance. No hosted Supabase project was modified.

## 2026-09-13: Ministry implementation independent review and remediation

Role: independent review followed by coding remediation

Result: ready to commit; not accepted

Review findings: the independent reviewer found no P0 security issue and confirmed the protected query/action RLS boundaries, migration constraints, and static Lucide registry. It identified two P1 collection defects—non-reactive debounced search and invalid out-of-range pagination—and four P2 picker issues: stale name preview, whitespace-sensitive icon search, incomplete custom-color radio state, and missing arrow-key color-radio behavior.

Remediation: search now uses a controlled draft with debounce plus immediate Enter/clear behavior. Collection queries count before fetching the resolved page, preventing invalid PostgREST ranges and returning a valid page consistently. The identity preview follows the live name draft; icon search collapses whitespace; custom color is represented in the color radio group; and the swatches support roving arrow-key selection. Removed the obsolete uncontrolled search ref.

Manual smoke evidence: `/admin/ministries?page=99` rendered the single valid record with `Showing 1–1 of 1` and disabled Previous/Next controls. The Add Ministry editor showed one selected color radio, a searchable icon grid, a live preview that changed to `Youth Ministry`, and matched `open    book` to the Open book icon. The editor was cancelled without saving, so no test Ministry was created.

Verification after remediation: `node_modules/.bin/tsc --noEmit`, targeted ESLint, Prettier check, `node_modules/.bin/next build`, `git diff --check`, and `npx supabase db lint --local` passed. `pnpm lint` remains blocked by the host Node 20.20.2 runtime because installed pnpm 11.19.0 requires Node 22.13+ and `node:sqlite`.
