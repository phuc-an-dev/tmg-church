# Next agent task

Status: authorized

## Service Roster Administration

### Goal

Implement the first usable Service Roster Administration slice using existing database relationships:
Term Department → department_service_role / service_roster → ministry_session → enrolled ministry_membership → service_assignment.

Do not change accepted Session/Attendance behavior, do not begin recurrence, care workflows, public pages, notifications, new dependencies, or automated tests. Do not commit and do not mark accepted; return the work for review.

### Deliverables

1. **Term Structure Administration**
   - In the existing Ministry Term / Department management area, let leaders list, create, edit, and guarded-delete Service Roles and Service Rosters for each Department.
   - Use immutable slug routes already established; UUIDs remain internal mutation payloads only.
   - Show meaningful empty, loading, pending, success, and safe error states.
   - Deletion must be blocked with consistent dependency feedback when a role or roster is referenced by service_assignment.

2. **Per-Session Roster Assignment**
   - Add a clearly separate "Service assignments" administration flow from `/admin/sessions/[sessionSlug]`; do not mix it into attendance controls.
   - Leaders can browse assignments grouped by Department and Roster, then assign or remove enrolled members from the Session's Ministry Term to a Department Role and Roster.
   - Validate every selected session, roster, role, and membership against the active Church and the same Ministry Term.
   - Prevent duplicates and preserve existing assignments unless explicitly removed.
   - Use a transactional Postgres RPC/function for any multi-row replace or bulk write. Revoke PUBLIC and anon execution; grant authenticated only.
   - Respect existing `service_assignment` invariants rather than weakening or bypassing them.

### UI Requirements

- Server Components for reads; Server Actions with Zod and structured safe errors for mutations.
- Use the existing operational-context resolver, Supabase RLS, shared ResponsiveEditor, ConfirmationSheet, StatusToast, DatePicker where applicable, and current nuqs conventions.
- Mobile-first: cards, 44px targets, bottom drawers for create/edit/filter/confirmation; do not use native selects or browser confirm dialogs.
- Desktop may use tables and menus, but mount only one responsive collection at a time.
- Use searchable roster/member selection where option sets are large.
- Keep attendance control room focused; the roster flow must be visually separate and reachable through an explicit action/tab/drawer.

### Database and Safety

- Do not redesign existing tables unless a small migration is required for atomic writes or missing durable invariants.
- Use active-Church scope for all reads and mutations.
- Guard deletion at both UI and database levels where appropriate.
- Never expose raw database failures.

### Exclusions

- Do not change accepted Session/Attendance behavior.
- Do not begin recurrence, care workflows, public pages, notifications, new dependencies, or automated tests.
- Do not commit and do not mark accepted; return the work for review.

### Verification

- Run authenticated mobile and desktop checks for role/roster CRUD, cross-Term rejection, cross-Church rejection, assignment create/remove, duplicate handling, guarded deletion, empty states, and session attendance regression.
- Run:
  pnpm test
  pnpm lint
  pnpm typecheck
  pnpm format:check
  pnpm build
- Report changed files, migration status, manual-check evidence, and any blocker. Do not mark the task accepted.
