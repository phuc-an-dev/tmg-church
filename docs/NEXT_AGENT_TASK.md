# Phase 2 Fast Cutover: Master/Admin Authorization and RLS

Status: authorized for local implementation and review; no hosted rollout authorization.

## Read first

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-09-18-phase-2-fast-cutover.md`
3. `docs/superpowers/plans/2026-09-18-phase-2-fast-cutover.md`
4. `docs/decisions/0003-authorization-architecture.md`
5. `docs/operations/master-admin-recovery.md`

## Authorization

Implement only the approved fast-cutover plan locally: Master/Admin system authorization, minimum draft/active/closed lifecycle enforcement, safe authenticated member projection, RLS/RPC hardening, local fixtures, and verification. Scoped role permissions/UI are deferred. Preserve unrelated changes. Do not start Phase 3-7 UI/workflows, invitation/login work, hosted Supabase changes, linked migrations, push, or deployment.

Do not record Phase 2 as accepted or reset this brief until independent review and the user-owned real Master Admin cutover verification have succeeded.
