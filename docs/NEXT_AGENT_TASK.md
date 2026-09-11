# Next coding-agent task

Status: ready

Owner: coding agent

Plan slice: Slice 1, database migration and generated types

## Objective

Create the complete initial Supabase database migration and generated TypeScript database types. Do not implement application pages, authentication UI, or CRUD interfaces in this slice.

## Required preparation

Read `AGENTS.md`, every document listed in its required-reading section, and the current Supabase documentation relevant to RLS, Postgres views, and generated types.

Before writing the migration, resolve the two documented model refinements explicitly in the implementation log:

1. Normalize `attendance_record` to reference `session_participant` without duplicated session/member foreign keys, unless verified use cases require ad hoc attendance.
2. Decide whether one ministry membership may belong to multiple term groups. Default to one group per membership for the current product unless the supplied domain meaning proves otherwise.

## Deliverables

- One timestamped SQL migration in `supabase/migrations/`
- All tables listed in `docs/DATABASE.md`
- `member_profile_public` with the approved public fields and term context
- UUID defaults, timestamps, archive field, slugs, constraints, foreign keys, indexes, and update trigger
- RLS enabled on every base table
- Leader-only base-table policies
- A safe leader check that cannot recurse or self-promote
- Explicit public-view grants for `anon` and `authenticated`
- Generated database types at `src/types/database.ts`
- A documented first-leader bootstrap SQL snippet using a placeholder email, not a committed personal email
- An implementation entry in `docs/reviews/REVIEW_LOG.md`

## Required verification

- Apply the migration to a clean local or disposable Supabase database.
- Prove anonymous base-table reads and writes fail.
- Prove authenticated non-leader base-table reads and writes fail.
- Prove leader operations succeed.
- Prove an authenticated user cannot insert themselves into `leaders`.
- Prove anonymous `member_profile_public` reads succeed and expose no private fields.
- Prove archived members are absent from the public view.
- Prove duplicate and cross-term-invalid relationships are rejected.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm build`.

## Handoff

Do not mark Slice 1 complete. Record implementation evidence and request an independent review. The planning/review agent will either issue a bounded revision plan or mark the slice complete.
