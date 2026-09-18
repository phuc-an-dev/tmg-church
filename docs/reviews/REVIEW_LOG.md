# Accepted implementation history

Keep one compact entry per accepted slice. Detailed investigation remains in Git history and must not be copied into active context.

## 2026-09-18: Authorization Foundation

Result: accepted after independent review with two explicitly accepted follow-ups: expanded automated bootstrap fail-closed coverage and enforced verified-email checking in the Master Admin recovery procedure. Added normalized account email storage, fixed Department codes, Church-scoped system roles, Ministry Term officer assignments, lifecycle and closed-term invariants, append-only scoped business auditing with sensitive-payload rejection, the initial Master Admin bootstrap, generated database types, an isolated local authorization integration suite, and the recovery runbook. Legacy `leaders` authorization remains active for the Phase 2 cutover. Local empty reset, unit and authorization tests, lint, typecheck, formatting, production build, generated-type parity, and diff checks passed.

## 2026-09-17: Contextual Session creation and Term Detail

Result: accepted. Implemented contextual Session creation for Group, Department, and Ministry Term, with Term Detail as the canonical ministry-detail surface. Reused existing Session editor as a responsive bottom drawer. Enforced scope mutual exclusivity and term integrity in Postgres migration `20260917000008_contextual_session_attendance_and_term_member_integrity.sql` and RLS-aware Server Actions. Scoped session attendance eligibility to active scoped members while preserving historical attendees. Provided mobile-first Term Detail with Members, Groups, Departments, and Sessions tabs. Tests, lint, typecheck, format check, and production build passed.

## 2026-09-17: Destructive action Button standardization

Result: accepted. Added `DestructiveActionButton` with the canonical subtle-red treatment and action-specific Lucide icons, migrated feature-level destructive Buttons, and added an automated policy guard against hand-composed destructive Button styling. Tests, lint, typecheck, format check, and production build passed.

## 2026-09-17: Group Detail: membership lifecycle and group-scoped attendance

Result: accepted. Implemented slug-routed Group Detail administration at `/admin/ministries/[ministrySlug]/terms/[termSlug]/groups/[groupSlug]` with section tabs (members, history), mobile card presentation, table layout on desktop, bottom drawers for member selection and confirmations, and fixed group roles (`member`, `group_leader`, `deputy_leader`, `bible_study_leader`). Added migration `20260917000006_group_detail_lifecycle.sql` enforcing partial unique indexes for single open group membership per term and single active leadership role per group, with atomic RPC mutations (`assign_group_member`, `update_group_member_role`, `update_group_member_status`, `remove_group_member`). Updated session attendance to strictly enforce active group membership when `ministry_session.term_group_id` is set. Lint, typecheck, format check, smoke tests, and production build passed.

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

## 2026-09-18: Milestone B — invitation activation

Result: accepted locally after independent security review. Added hashed one-time invitations, Resend delivery, protected admin invitation/status controls, private invitation status projection, password activation with email binding, atomic invitation consumption, callback completion, and password sign-in. Local authorization migration applied successfully; invitation/RLS checks passed 20/20. Full test, lint, typecheck, format, build, and diff checks passed. Hosted SMTP/Auth Hook rollout remains an operator step.

## 2026-09-18: Milestone C — Portal foundation

Result: accepted locally after independent review. Added a capability-driven `/portal`, fail-closed `requirePortalContext()`, Ministry/Department/Group capability resolution, and scoped role context. `/admin` remains system-admin-only; Group roles receive no Department service-role capability. Authorization checks passed 21/21, with full test, lint, typecheck, format, build, and diff checks passing.

## 2026-09-18: Milestone C — Group Session portal slice

Result: accepted locally after independent security review. Added group-scoped session listing, attendance read/write UI, Group Leader-only session mutations, a private group directory projection, and split RLS policies so Deputy/Bible Study can read history but cannot mutate or delete sessions, participants, or attendance through the Data API. Authorization checks passed 21/21; full test, lint, typecheck, format, build, and diff checks passed. No hosted migration or deployment was performed.

## 2026-09-18: Milestone C — Group roster portal slice

Result: accepted locally after independent security review. Added a scoped Group member directory and regular-member assign/unassign actions for Group Leaders and Deputies. Cross-term assignment, moving a member out of another open Group, leadership removal, and Department service-role access remain denied. Authorization checks passed 21/21; full test, lint, typecheck, format, build, and diff checks passed. No hosted migration or deployment was performed.

## 2026-09-18: Milestone C — Department member management

Result: accepted locally after independent security review. Added commissioner-derived Department member assignment/removal through a private term-member projection and scoped RPC/RLS policies. Same-term and exact-Department checks are enforced; no service-role assignment or Department request workflow was opened. Authorization checks passed 21/21; full test, lint, typecheck, format, build, and diff checks passed. No hosted migration or deployment was performed.
