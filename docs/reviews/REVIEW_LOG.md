# Accepted implementation history

Keep one compact entry per accepted slice. Detailed investigation remains in Git history and must not be copied into active context.

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
