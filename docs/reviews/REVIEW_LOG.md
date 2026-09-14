# Accepted implementation history

Keep one compact entry per accepted slice. Detailed investigation remains in Git history and must not be copied into active context.

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
