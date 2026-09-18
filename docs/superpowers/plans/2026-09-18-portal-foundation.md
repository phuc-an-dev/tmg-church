# Portal Foundation Implementation Plan

**Goal:** Provide one capability-driven `/portal` entry point for Ministry, Department, and Group roles while keeping `/admin` system-admin-only.

**Architecture:** PostgreSQL owns capability resolution and returns a compact portal context through a security-definer RPC. Next.js adds `requirePortalContext()` and a small portal shell; future scoped pages consume the same context and capability names instead of role-specific route guards.

**Tech Stack:** Supabase PostgreSQL/RLS, Next.js App Router, Server Components, TypeScript.

## Global Constraints

- Master/Admin remains the only `/admin` authority.
- Capability checks, not UI visibility, authorize operations.
- No Department service-role write capability is granted to Group roles.
- No hosted migration, push, deploy, or secrets.

### Task 1: Database capability resolver

- Add `has_capability` support for Ministry Head, commissioner-derived Department roles, and Group roles.
- Add `get_my_portal_context()` for server-side portal navigation.
- Keep explicit authenticated grants and anonymous denial.

### Task 2: Portal guard and shell

- Add `requirePortalContext()`.
- Add `/portal` layout/dashboard with role and scope summaries.
- Keep the existing `/admin` layout unchanged.

### Task 3: Tests and verification

- Verify system-admin, Ministry Head, commissioner, Group Leader, Deputy, Bible Study, no-role, cross-scope, and lifecycle behavior.
- Run authorization/full tests plus lint, typecheck, format, build, and diff checks.
