# Milestone A — System role governance (backend slice)

Status: authorized for local implementation and review; no hosted rollout.

## Scope

Implement the smallest useful backend governance slice on top of the Phase 2 cutover:

- allow only `master_admin` to assign/revoke Church-wide `admin` roles;
- keep the sole `master_admin` anti-lockout invariant intact;
- allow `master_admin` and `admin` to manage Ministry Term role assignments only where the existing schema and lifecycle rules already support it;
- leave UI wiring for the next bounded slice; do not start invitation/login, member portal, Group/Department scoped-role UX, or session workflow work;
- enforce every write through a protected Server Action/RPC and RLS, with direct Data API/RPC negative tests.

## Constraints

- Local migration and tests only; no linked migration, hosted Supabase change, push, or deploy.
- Reuse existing member/profile and admin UI patterns.
- Do not add a new auth provider, invitation flow, or broad capability catalog.
- Use the lightweight workflow in `docs/WORKFLOW.md`.

## Acceptance

- Master Admin can safely assign/revoke an existing Auth user as Church Admin through the protected RPC.
- Admin cannot assign/revoke Master/Admin roles.
- Master Admin cannot be deleted, demoted, or orphaned.
- Term-role writes obey term lifecycle and existing assignment invariants.
- No-role, anonymous, cross-Church, and direct RPC/Data API access are denied.
- Relevant authorization tests and type checks pass; UI wiring is a separate follow-up brief.
