# Milestone C — Portal foundation and capability resolver

Status: authorized for local implementation and review.

## Scope

- Keep `/admin` restricted to `master_admin` and `admin`.
- Add capability resolution for Ministry Head, commissioner-derived Department roles, Group Leader, Deputy Leader, and Bible Study Leader.
- Add `requirePortalContext()` and a capability-driven `/portal` shell.
- Do not grant Group roles Department service-role assignment capability.
- Do not implement full Group/Department/Ministry operational screens in this slice.

## Acceptance

- Capability resolution is server-side and available through a protected RPC.
- Draft roles have no operational capability; closed terms expose history only.
- Group Leader receives Group Session manage capability; Deputy/Bible Study receive read capability only.
- No-role and anonymous users cannot access `/portal`.
- `/admin` behavior remains unchanged for Master/Admin.
- Local migration, authorization tests, lint, typecheck, format, build, and independent review pass.

## Constraints

- RLS and RPC checks remain authoritative.
- No hosted migration, push, deploy, or secrets.
- Preserve the existing invitation/authentication work from Milestone B.
