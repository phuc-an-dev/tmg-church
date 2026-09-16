# Next agent task

Status: authorized

## Sessions and Attendance administration

### Goal

Deliver the first usable protected administration slice for one-off Ministry Term sessions and attendance.

### Scope

- Add `/admin/sessions` for URL-backed listing, filtering, pagination, creation, editing, and guarded deletion of one-off `ministry_session` records.
- Add `/admin/sessions/[sessionSlug]` for a session's enrolled-member participants and present, absent, or excused attendance.
- Use Server Components for reads, Server Actions with Zod for mutations, the operational-context resolver, RLS, and narrowly scoped transactional Postgres functions for participant and attendance writes.
- Preserve attendance history: deletion is available only for sessions with no participants, attendance, assignments, or service data.
- Follow mobile-first requirements: collections render as cards and every create, edit, detail, filter, and confirmation flow uses a bottom drawer on mobile. Desktop may use tables and dialogs.
- Provide loading, empty, error, pending, and success states.

### Exclusions

- No recurrence, service rosters, care workflows, public pages, dependencies, or automated tests.

### Verification

Run authenticated mobile and desktop checks for sessions, participants, attendance, and guarded deletion, then run `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm build`.

Do not mark this task accepted; return it for review.
