# Phase 2 Fast Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cut over current admin behavior from `leaders` to live Church-wide Master/Admin authorization with minimal safe lifecycle/RLS enforcement.

**Architecture:** PostgreSQL remains authoritative through small system-admin and lifecycle helpers used by RLS and RPCs. Server-only auth/context code checks the same system-role source. Scoped role capability resolution is intentionally deferred.

**Tech Stack:** Next.js 16, TypeScript, Supabase SSR/Data API, PostgreSQL RLS/PLpgSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-18-phase-2-fast-cutover.md`

## Constraints

- Local migration only: `supabase/migrations/20260918000001_phase_2_fast_cutover.sql`.
- No linked migration, hosted Supabase change, push, deploy, login/invitation, or Phase 3-7 UI.
- Preserve unrelated changes and use `apply_patch` for edits.
- Update Phase 1 tests that call `is_leader()`; do not leave a green suite dependent on the retired authority.
- `create_initial_church` is an unreachable post-bootstrap path; remove its Server Action/RPC execution grant or explicitly make it operator-only, with no fallback to `leaders`.

### Task 1: Red tests for the fast boundary

**Files:** `tests/authorization/phase-1-global-setup.ts`, `tests/authorization/phase-2-fast-cutover.test.ts`, `tests/authorization/phase-1-invariants.test.ts`

- [ ] Keep only the fixtures needed for Master Admin, Church-A Admin, Church-B Admin, no-role, and anonymous clients plus draft/active/closed terms.
- [ ] Add failing tests for `is_system_admin_for_church`/`has_capability`, Church isolation, draft/closed lifecycle, safe public projection, direct RPC denial, and Master Admin access after deleting its `leaders` row.
- [ ] Replace the Phase 1 direct `is_leader()` assertion with the new helper boundary.
- [ ] Run `pnpm test:authorization`; verify failure is caused by missing fast-cutover objects/policies.

### Task 2: Add the local SQL cutover

**File:** `supabase/migrations/20260918000001_phase_2_fast_cutover.sql`

- [ ] Add fixed-search-path security-definer helpers and explicit `authenticated` grants for the boolean checks; revoke helper access from `anon`/`public`.
- [ ] Replace all current leader policies on domain tables, Phase 1 tables, and `frequent_icon` with system-admin policies resolving each row to its Church.
- [ ] Apply lifecycle write rules: structure rows may be prepared in draft; operational membership/session/attendance/service rows require active term; closed rows are read-only.
- [ ] Revoke anonymous `member_profile_public` select and replace its safe projection predicate with authenticated linked non-archived member access.
- [ ] Add exact RPC guards to current mutating functions; retain RLS and existing integrity checks. Revoke `PUBLIC`/`anon`/unintended overload execution and verify `authenticated` signatures explicitly.
- [ ] Remove `is_leader()` from active policies. Keep the helper only as a temporary boolean shim for existing RPC bodies; it reads system roles and has no table access or data exposure.
- [ ] Regenerate database types and run the focused authorization suite.

### Task 3: Replace application guards

**Files:** `src/features/auth/queries.ts`, `src/features/context/queries.ts`, protected admin layout/pages, all current feature query/action modules.

- [ ] Resolve session + linked member + system role from live database state.
- [ ] Replace `requireLeader` imports/calls with `requireSystemAdmin` while preserving login/unauthorized redirects.
- [ ] Ensure every current Server Action resolves Church/term scope before mutation and relies on RLS/RPC for direct-access defense.
- [ ] Remove all application `leaders` queries and run `rg` verification.

### Task 4: Verify and hand off

- [ ] Run `supabase db reset`, `pnpm test`, `pnpm test:authorization`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, and `git diff --check`.
- [ ] Verify Master Admin browser access locally and direct Data API/RPC parity.
- [ ] Update the recovery runbook with the fast-cutover check and forward recovery procedure.
- [ ] Obtain independent review. Do not apply linked migration or mark Phase 2 accepted until user-owned real Master Admin verification.

## Handoff prompt

Implement this plan only after confirming `docs/NEXT_AGENT_TASK.md`. Keep the scope fast-cutover: Master/Admin only, lifecycle minimum, deny-by-default RLS/RPC, no scoped-role UI or permissions. Work locally in an isolated workspace, follow TDD, preserve unrelated changes, run every listed gate, and stop before any linked/hosted operation. Report changed files, test evidence, security findings, and remaining user-owned rollout steps.
