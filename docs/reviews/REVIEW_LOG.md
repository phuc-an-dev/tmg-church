# Accepted implementation history

Keep one compact entry per accepted slice. Detailed investigation remains in Git history and must not be copied into active context.

## 2026-09-16: Admin Icon Management

Result: accepted after implementation review. Added admin Icon Management area at `/admin/icons` with a persistent shared `frequent_icon` list, on-demand catalog search (no icons loaded until search query is explicitly submitted), keyboard-accessible drag-and-drop ordering through a dedicated 44px grip, raised drag overlay, optimistic persistence on drop, selection detail panel, and mobile bottom drawers for details and deletion confirmation. Applied local migration `20260916000004_frequent_icon.sql` with RLS and initial icon seed. Lint, typecheck, format check, smoke tests, production build, and live keyboard reorder/restore passed.

## 2026-09-16: Department Detail Administration

Result: accepted after implementation review. Added slug-routed Department Detail administration at `/admin/ministries/[ministrySlug]/terms/[termSlug]/departments/[departmentSlug]?section=members|roles` with hierarchy and single-church validation. Supported direct member assignment and unassignment scoped to term-enrolled members, clean card presentation, and batch assignment drawer. Supported department service role CRUD with session assignment deletion protection. Reused shared ResponsiveEditor, ConfirmationSheet, FloatingCreateButton, and NavigationTabs without technical debt. Lint, typecheck, format check, smoke tests, and production build passed.

## 2026-09-16: Operations Phase 2 — Operational Context Resolver

Result: accepted. Centralized cached server-only Church, Ministry, and Term resolution for protected reads and mutations. Authenticated routes and member mutations passed, including ministry-term enrollment; unauthenticated `/admin` redirected to `/admin/login`. Zero- and multiple-Church branches were accepted by source review because the available database was not disposable. Lint, typecheck, format check, and production build passed.

## 2026-09-15: Single-church navigation and active ministry term resolver

Result: accepted after implementation review. Church setup now appears only before the singleton church is configured; operational navigation automatically uses that one church. Ministry cards link directly to the date-current term with ministry/term slugs in the URL; dated terms in one ministry cannot overlap. Lint, typecheck, format check, production build, and authenticated local route checks passed.

## 2026-09-15: Member Segments

Result: accepted after implementation review. Added church-scoped Vietnamese-compatible slugs; protected slug routes; leader-validated CRUD, per-member assignments, and persisted AND/OR condition-based bulk adds; shared responsive editor/confirmation contracts; and segment filtering with visual identity on Members. Source review confirmed URLs expose no database IDs and mutations scope records to the active church. Lint, typecheck, format check, and production build passed.

## 2026-09-14: Member Management slice (Detail, Ministry Memberships, Segments)

Result: accepted after independent review.

Removed out-of-scope spreadsheet functionality (Excel import/export UI, `/api/admin/members/export`, actions, and `xlsx` dependency). Implemented Member Detail route at `/admin/members/[memberId]` with leader authorization, profile summary, created/updated timestamps with project-standard Asia/Ho_Chi_Minh formatting, and the shared expandable member action control. Implemented cascading enrollment and management (Ministry -> Term -> optional single Group and multiple Departments) with duplicate prevention, atomic relationship writes, and non-destructive historical error handling. Linked member directory identities to detail pages. Lint, typecheck, formatting, and production build passed.

## 2026-09-14: Group and department visual identity

Result: accepted after independent review.

Added per-term slugs plus configurable colors and icons to groups and departments, including Vietnamese-safe backfill, durable database constraints, validated leader mutations, shared identity controls, and balanced list rows with slug metadata. Review caught and corrected uppercase Vietnamese `Đ` normalization; duplicate normalized names are deterministically suffixed within each term. Local migration, rollback constraint checks, authenticated group/department UI checks, lint, typecheck, formatting, and production build passed.

## 2026-09-14: Operations Phase 1 — ministry-term lifecycle

Result: accepted after independent review.

Added the `draft`, `active`, and `closed` lifecycle with a database check and per-ministry partial unique index for the active term. The term action validates lifecycle input, and lifecycle filter, list badge, and editor now agree. Lint, typecheck, formatting, production build, and local browser reload passed. A rolled-back local Postgres verification confirmed the active-term uniqueness, independent ministry active terms, draft/closed allowance, and invalid-lifecycle rejection; no fixture data remained.

## 2026-09-14: Shadcn calendar and date picker integration

Result: accepted after independent review.

Integrated the shadcn Calendar and Popover components for date picking. Replaced native browser `<input type="date">` in the Term editor with an accessible DatePicker featuring custom styled dropdowns for month and year selection with configurable maximum height (`dropdownMaxHeight`, default `max-h-56`), smooth scrolling, calendar popover selection, display formatting, single-click clearing, and end-date min constraints. Repository quality gates passed.

## 2026-09-14: Member management URL state

Result: accepted after independent review.

Established the project-wide nuqs convention and migrated `/admin` member management to one shared query-state schema for debounced search, sorting, pagination, and deep-linked editing. Server-side member reads use the protected `member_profile` table with active-only filtering, RLS, ordering, range pagination, and safe invalid-URL canonicalization; lint, typecheck, targeted formatting, production build, and authenticated browser checks passed.

## 2026-09-14: Mobile filter sheet and ministry header cleanup

Result: accepted after independent review.

Removed the standalone ministry identity icon tile and eyebrow from page headers; added a mobile filter button and bottom sheet drawer with draft states, apply/cancel actions, and properly rounded option item backgrounds (`overflow-hidden` and `rounded-[11px]`); aligned toolbar and page skeletons to prevent layout shift.

## 2026-09-14: Mobile administration navigation

Result: accepted after independent review.

Replaced the mobile bottom dock with a hamburger-triggered left Sheet; preserved desktop navigation; added accessible focus return and Radix theme radios; removed duplicate mobile account controls, obsolete dock code, global dock padding, and backdrop blur; and kept FAB clearance safe-area aware and local to Ministry screens. Keyboard interaction and the complete repository quality gate passed.

## 2026-09-13: Church and Ministry administration

Result: accepted in `7a4bddd`.

Delivered the administration shell, single-Church management, Ministry/Term/Group/Department CRUD, friendly slugs, Ministry visual identity, URL-backed search and sorting, pagination, responsive editors, accessible item actions, and guarded deletion. Database authorization and integrity checks, mobile/desktop review, and the repository quality gate passed.

## 2026-09-12: Authentication

Result: accepted in `25d6cf2`.

Delivered Supabase SSR clients, Magic Link PKCE authentication, leader authorization, safe callback redirects, sign-out, protected routes, and operator documentation. No service-role key is used.

## 2026-09-11: Database and RLS

Result: accepted in `42cd479`.

Delivered the schema, integrity constraints, RLS policies, generated types, reduced public member view, and first-leader bootstrap runbook. Local reset, database lint, concurrency checks, and the repository quality gate passed.
