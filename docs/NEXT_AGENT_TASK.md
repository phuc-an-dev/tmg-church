# Next agent task

Status: authorized

## Session Detail Attendance Control Room

### Goal

Deliver the first usable protected administration slice for the Session Detail “attendance control room” at `/admin/sessions/[sessionSlug]`.

### Scope

- Add `/admin/sessions` for URL-backed listing, filtering, pagination, creation, editing, and guarded deletion of one-off `ministry_session` records.
- Add `/admin/sessions/[sessionSlug]` for the attendance control room:
  - Record Present, Absent, or Excused for active members enrolled in the Session's Ministry Term.
  - Summary counts: Enrolled, Recorded, Present, Absent, Excused, Pending.
  - Search members, filter by attendance status (default Pending, allow All), and support bounded pagination.
  - Show each member's Group and Department(s) with accessible labels.
  - Selection mode for multi-select and bulk actions (Mark present, absent, excused; include “Mark all present” across current filtered results).
  - Preserve historical attendance: update only `updated_at`, never overwrite original `recorded_at`.
  - Guarded Session deletion in More options: available only with no participant, attendance, assignment, or service dependencies; displays explanatory text otherwise.
- Use Server Components for reads, Server Actions with Zod for mutations, the operational-context resolver, RLS, `nuqs` (shallow: false), and transactional Postgres RPC for bulk attendance writes.
- Mobile-first UI: cards on mobile, bottom drawers for filters/options/confirmations, 44px touch targets; desktop table view.
- Provide loading, empty, error, pending, and success states with toast actions.

### Exclusions

- No recurrence, service rosters, care workflows, public pages, dependencies, or automated tests.

### Verification

Run authenticated mobile and desktop checks for sessions, participants, attendance, and guarded deletion, then run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm build`.

Do not mark this task accepted; return it for review.
