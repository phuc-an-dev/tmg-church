# Milestone C — Portal Group Session operations

Status: authorized for local implementation and review.

## Scope

- Keep `/admin` restricted to `master_admin` and `admin`.
- Add capability resolution for Ministry Head, commissioner-derived Department roles, Group Leader, Deputy Leader, and Bible Study Leader.
- Add `requirePortalContext()` and a capability-driven `/portal` shell.
- Do not grant Group roles Department service-role assignment capability.
- Implement the minimal `/portal` Group Session list and attendance screens.
- Group Leader may create, edit, delete empty sessions, and record attendance.
- Deputy Leader and Bible Study Leader may read group session history only.
- Do not grant Group roles Department service-role assignment capability.

## Acceptance

- Capability resolution is server-side and available through a protected RPC.
- Draft roles have no operational capability; closed terms expose history only.
- Group Leader receives Group Session manage capability; Deputy/Bible Study receive read capability only.
- No-role and anonymous users cannot access `/portal`.
- `/admin` behavior remains unchanged for Master/Admin.
- Direct Data API deletes and writes are denied for read-only Group roles.
- Local migration, authorization tests, lint, typecheck, format, build, and independent review pass.

## Constraints

- RLS and RPC checks remain authoritative.
- No hosted migration, push, deploy, or secrets.
- Preserve the existing invitation/authentication work from Milestone B.
