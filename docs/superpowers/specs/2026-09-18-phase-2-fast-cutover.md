# Phase 2 Fast Cutover Design

## Goal

Replace `leaders`/`is_leader()` with Church-wide live authorization for `master_admin` and `admin`, while keeping scoped Ministry/Department/Group capabilities dormant until later phases.

## Scope

- Master Admin and Admin are the only operational administrators in this phase.
- RLS and RPCs deny anonymous, no-role, and cross-Church access.
- Draft terms deny membership, session, attendance, and other operational writes; structure preparation remains available to system administrators.
- Closed terms are readable only by Master Admin/Admin and deny all writes.
- `member_profile_public` is authenticated-member-only and contains no phone, Auth ID, archived member, care, or private-note data.
- Group/Department scoped roles are stored and future-ready but do not gain current UI or operational access.
- Group roles never manage Department service assignments; service assignments remain Master/Admin-only.
- Keep `leaders` out of application authorization and revoke table access. `is_leader()` remains only as a temporary boolean compatibility shim for already-deployed RPC bodies; it reads system roles, not `leaders`, and physical removal follows the RPC cleanup.

## Minimal interfaces

`public.is_system_admin_for_church(uuid) returns boolean` is the live database authority. `public.has_capability(text, text, uuid) returns boolean` is a narrow compatibility resolver for `church.read`, `church.manage`, `term.read_history`, `term.structure.prepare`, and `term.operational.manage`; it grants only to Master/Admin and applies lifecycle rules. No scoped role is granted through this interface yet.

RLS policies use canonical Church/term scope helper expressions and `is_system_admin_for_church`; child rows must resolve their parent Church. Mutating RPCs keep their existing atomic/integrity checks and add system-admin/lifecycle checks before writes. Server guards query the system-role assignment and no longer read `leaders`.

## Acceptance

Master Admin and Admin can use all current admin screens/actions in Church A; an Admin in Church B cannot access Church A; no-role and anonymous clients cannot read or write protected data; draft operational writes and closed writes fail; closed history reads succeed only for Master/Admin; direct RPC/Data API access matches Server Action behavior; removing a Master Admin `leaders` row does not remove access.

## Deferred

Generic scoped capability catalog, derived commissioner permissions, Group/Department private phone access, role-management UI, invitations/login, join requests, scoped session UX, and physical legacy-table deletion.
