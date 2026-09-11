# Review log

Use one section per implementation or review pass. Keep newest entries at the top below this instruction.

## 2026-09-11: Plan 01 independent acceptance review

Role: planning and review agent

Result: accepted; Plan 02 unblocked

Evidence:

- The initial migration applied successfully after a clean local Supabase reset.
- All 11 immutable ownership and scope triggers were present. Same-value scope updates and ordinary mutable-field updates succeeded, while actual scope reassignment failed with the expected English exception.
- The previously failing concurrent member-church reassignment and membership insertion case produced zero invalid relationships; the ownership reassignment was rejected.
- Generated TypeScript types matched a fresh local generation after applying repository formatting.
- All 22 base tables retained RLS. Anonymous base-table reads, authenticated `TRUNCATE`, and authenticated execution of internal trigger functions remained unavailable; authenticated execution of `is_leader()` remained available.
- The leader allow-list policy and its comments now consistently describe self-read-only access.
- Supabase database lint, ESLint, TypeScript checking, Prettier verification, the production build, and `git diff --check` passed.
- Disposable review rows were removed, and the hosted Supabase project was not modified.

Blocking or high findings: none.

## 2026-09-11: Plan 01 immutable scope remediation

Role: coding agent

Status: ready for independent review

The deferred graph validator, its 19 triggers, `check_parent_relationship_integrity()`, its five triggers, and ineffective `FOR KEY SHARE` locking were removed. `prevent_scope_reassignment()` rejects actual changes to immutable ownership/scope keys with `IS DISTINCT FROM`; it runs only when the relevant column is updated. Child relationship triggers retain the following audit coverage:

| Invariant                      | Child write validated                   | Immutable parent scope                      | Verification               |
| ------------------------------ | --------------------------------------- | ------------------------------------------- | -------------------------- |
| Segment/member church          | `member_segment_membership`             | member and segment church                   | mismatched insert rejected |
| Membership/member church       | `ministry_membership.member_profile_id` | member church, term ministry                | mismatched insert rejected |
| Group/membership term          | `term_group_membership`                 | group and membership term                   | mismatched insert rejected |
| Department/membership term     | `ministry_assignment`                   | department and membership term              | mismatched insert rejected |
| Recurrence scope               | recurrence group/department             | recurrence term, group/department term      | mismatched insert rejected |
| Session scope                  | session recurrence/group/department     | session term and referenced scope term      | mismatched insert rejected |
| Participant church             | `session_participant`                   | member church, session term hierarchy       | mismatched insert rejected |
| Session assignment term        | `session_assignment`                    | session and membership term                 | mismatched insert rejected |
| Service role/roster department | `service_assignment`                    | role and roster department                  | mismatched insert rejected |
| Service assignment term        | `service_assignment`                    | roster department, session, membership term | mismatched insert rejected |
| Care flag church               | `care_flag`                             | member church, term ministry                | mismatched insert rejected |

Reproducible checks: `PATH=<Node 22.13.1 bin> pnpm dlx supabase@latest db reset`; `PATH=<Node 22.13.1 bin> pnpm dlx supabase@latest gen types typescript --local > src/types/database.ts`. Run the following as `postgres` in the local database to prepare and clean up the concurrency case:

```sql
insert into public.church (id, name, slug)
values
  ('50000000-0000-0000-0000-000000000001', 'Concurrency Church A', 'concurrency-a'),
  ('50000000-0000-0000-0000-000000000002', 'Concurrency Church B', 'concurrency-b');
insert into public.ministry (id, church_id, name, slug)
values ('50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Concurrency Ministry', 'concurrency-ministry');
insert into public.ministry_term (id, ministry_id, name, slug)
values ('50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'Concurrency Term', 'concurrency-term');
insert into public.member_profile (id, church_id, full_name)
values ('50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', 'Concurrency Member');
```

In terminal A, run `begin isolation level repeatable read; update public.member_profile set church_id = '50000000-0000-0000-0000-000000000002' where id = '50000000-0000-0000-0000-000000000005'; commit;`. It must fail with `Member profile church relationship is immutable`. Concurrently or afterwards, terminal B may run `begin isolation level repeatable read; insert into public.ministry_membership (ministry_term_id, member_profile_id) values ('50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000005'); commit;`; it succeeds because it remains same-church. Prove no invalid graph with:

```sql
select count(*) as cross_church_memberships
from public.ministry_membership mm
join public.member_profile mp on mp.id = mm.member_profile_id
join public.ministry_term mt on mt.id = mm.ministry_term_id
join public.ministry m on m.id = mt.ministry_id
where mp.church_id <> m.church_id;
-- Expected: 0

delete from public.ministry_membership where member_profile_id = '50000000-0000-0000-0000-000000000005';
delete from public.member_profile where id = '50000000-0000-0000-0000-000000000005';
delete from public.ministry_term where id = '50000000-0000-0000-0000-000000000004';
delete from public.ministry where id = '50000000-0000-0000-0000-000000000003';
delete from public.church where id in ('50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002');
```

The same pattern was executed for every immutable scope trigger listed above; each actual ownership change raised its named immutable-relationship exception. Verify function and leaders access with `select has_function_privilege('authenticated', 'public.prevent_scope_reassignment()', 'execute');` (expected `false`) and, as two authenticated users, `select user_id from public.leaders;` (each receives only its own row).

## 2026-09-11: Plan 01 concurrency remediation

Role: coding agent

Status: ready for independent review

Changes:

- Removed `validate_relationship_integrity()` and its 19 deferred full-graph triggers.
- Child integrity triggers now run only on relationship-key changes. `ministry_membership` locks its member and term hierarchy with `FOR KEY SHARE`, preventing a concurrent church-owner update from committing across a membership write.
- Added targeted parent-update checks for member church, membership term, group term, department term, and session term changes; ordinary fields do not run relationship validation.
- Restricted `leaders` direct reads to the authenticated caller's own row. `is_leader()` remains the security-definer authorization boundary.

Reproducible verification:

- Reset: `PATH=<Node 22.13.1 bin> pnpm dlx supabase@latest db reset`.
- Types: `PATH=<Node 22.13.1 bin> pnpm dlx supabase@latest gen types typescript --local > src/types/database.ts`.
- Privileges/RLS: run `select relname, relrowsecurity from pg_class join pg_namespace on pg_namespace.oid = relnamespace where nspname = 'public' and relkind = 'r';` and `select has_table_privilege('anon', 'public.member_profile', 'select'), has_table_privilege('authenticated', 'public.member_profile', 'truncate'), has_function_privilege('authenticated', 'public.check_parent_relationship_integrity()', 'execute');` as `postgres`.
- Parent rejection: create a valid membership/group/department/session graph, then update its `member_profile.church_id`, `ministry_membership.ministry_term_id`, `term_group.ministry_term_id`, `term_department.ministry_term_id`, or `ministry_session.ministry_term_id`; each affected relationship must raise its English integrity exception.
- Concurrency: in transaction A run `begin isolation level repeatable read; update public.member_profile set church_id = <church_b> where id = <member>; select pg_sleep(2); commit;`. During the sleep, in transaction B run `begin isolation level repeatable read; insert into public.ministry_membership (ministry_term_id, member_profile_id) values (<church_a_term>, <member>); commit;`. One transaction must fail or the child must observe the changed parent and fail. Verify `select count(*) from public.ministry_membership mm join public.member_profile mp on mp.id = mm.member_profile_id join public.ministry_term mt on mt.id = mm.ministry_term_id join public.ministry m on m.id = mt.ministry_id where mp.church_id <> m.church_id;` returns `0`.
- Quality: `PATH=<Node 22.13.1 bin> pnpm lint && pnpm typecheck && pnpm format:check && pnpm build && git diff --check` passed.

## 2026-09-11: Plan 01 remediation

Role: coding agent

Status: ready for independent review

Corrected issues:

- Replaced the child-only integrity coverage with a deferred, security-definer relationship-graph validator attached to both relationship children and their relevant parents. It rejects cross-church and cross-term states introduced by parent updates as well as invalid child writes.
- Replaced unapproved `ministry_session.recurrence_rule_id` and `start_time` with `session_recurrence_rule_id` only.
- Restored `care_note.care_flag_id` as the required restrictive relationship and removed the replacement member and term fields.
- Changed ambiguous and historical foreign-key cascades or nulling actions to restrictive deletes. The two remaining auth-user actions are intentional: deleting an auth identity removes its allow-list entry and clears its optional member link.
- Added explicit grants and revocations: `anon` has no base-table privileges and only public-view `SELECT`; `authenticated` has the RLS-controlled DML needed on domain tables, leader-status `SELECT`, no `TRUNCATE`, `REFERENCES`, or `TRIGGER`, and no direct execution of internal trigger functions.
- Updated all leader policy helper calls, including the leaders read policy, to use `(select public.is_leader())`.
- Updated the bootstrap runbook to `/admin/login` and clarified that the login flow arrives only after Plan 02.
- Regenerated `src/types/database.ts` from the reset local schema.

Verification commands and outcomes:

- `PATH=<temporary Node v22.13.1 bin> pnpm dlx supabase@latest db reset`: passed; initial migration applied to a clean local database.
- `PATH=<temporary Node v22.13.1 bin> pnpm dlx supabase@latest gen types typescript --local > src/types/database.ts`: passed.
- Catalog checks with `pg_class`, `has_table_privilege`, and `has_function_privilege`: all 22 base tables have RLS; `anon` has no base-table privileges; `authenticated` has no `TRUNCATE`, `REFERENCES`, or `TRIGGER`; only the required `is_leader()` execution grant remains.
- SQL behavior checks: valid same-church/same-term graph passed; invalidating parent updates to a member, membership, or department were rejected; deleting a membership with group or assignment history and a participant with attendance history was rejected.
- RLS behavior checks: authenticated non-leader church read returned zero rows and insert was rejected; authenticated leader church insert, select, update, and delete succeeded; a non-leader insert into `leaders` was denied because no insert privilege exists.
- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, and `git diff --check`: passed using Node v22.13.1. The host default Node remains v20.20.2, so Node 22 was downloaded into a temporary directory solely for validation.

Remaining limitation / design decision:

- The deferred graph validator deliberately checks the full relationship graph at transaction end. This ensures parent updates cannot create an invalid state while allowing a valid multi-row transaction to be assembled in any order. It should be independently reviewed for expected scale before a large-data release.

## 2026-09-11: Plan 01 implementation

Role: coding agent

Status: ready for independent review

Scope implemented:

- Full initial Supabase migration in `supabase/migrations/20260911000000_initial_schema.sql` implementing all 22 required tables, constraints, indexes, integrity triggers, soft archive behavior, Row Level Security policies, grants, and public view.
- Centralized `public.is_leader()` authorization helper function (`SECURITY DEFINER`, fixed `search_path = ''`, limited grants to `authenticated`).
- Safe public directory view `public.member_profile_public` (`security_barrier = true`, owner rights, excluding private fields and archived members).
- Generated TypeScript definitions in `src/types/database.ts` via Supabase CLI.
- First-leader bootstrap runbook in `docs/operations/leader-bootstrap.md` using placeholder email `leader@example.com`.

Changed / created files:

- `supabase/migrations/20260911000000_initial_schema.sql`
- `src/types/database.ts`
- `docs/operations/leader-bootstrap.md`
- `supabase/config.toml`
- `supabase/.gitignore`
- `docs/reviews/REVIEW_LOG.md`

Migration and verification commands:

- Migration applied cleanly via `supabase start` and verified deterministically with `supabase db reset`.
- SQL verification executed via test matrices in local container:
  - Base table RLS: Anonymous and authenticated non-leader `SELECT`, `INSERT`, `UPDATE`, `DELETE` denied.
  - Leader access: Authenticated leader operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) succeeded on domain tables.
  - Leader protection: Non-leaders cannot insert, update, or delete `leaders`; non-leaders cannot inspect other leader records.
  - Cascades and cleanup: Deleting `auth.users` row cascades to `leaders` and sets `member_profile.user_id` to null.
  - Public view: Anonymous and authenticated `SELECT` on `member_profile_public` succeeds and returns contracted columns. Private fields (`phone`, `user_id`, `archived_at`, care records, notes) are absent and rejected by PostgREST Data API. Archived members are filtered out.
  - Integrity & constraints: Tested slug syntax regex, church slug uniqueness, case-insensitive names, date ranges (`end_date >= start_date`), birth year limits (1900-2100), non-empty string checks, attendance status enum checks (`present`, `absent`, `excused`), and single-group per membership constraint.
  - Cross-parent triggers: Verified rejection of cross-church segment membership, cross-church ministry membership, cross-term group membership, cross-term department assignment, cross-term session groups/departments, cross-church session participant, cross-term session assignment, cross-department/term service assignment, and cross-church care flags/notes.
  - Restrictive deletes: Verified that parent entities (church, member with session participation) cannot be deleted when children exist.

Quality gate results:

- `pnpm lint`: passed with 0 errors.
- `pnpm typecheck`: passed with 0 errors.
- `pnpm format:check`: passed (all matched files use Prettier code style).
- `pnpm build`: passed (production build created, root page statically generated).

Environmental limitations / notes:

- Local Supabase CLI requires Node.js v22+ to run `pnpm@11.19.0` and Supabase CLI tools locally with Docker Desktop.
- Hosted Supabase project was not touched, preserving the requirement not to apply unreviewed migrations to remote environments without authorization.

## 2026-09-11: Detailed plans review

Role: planning and review agent

Result: accepted for sequential implementation

Scope reviewed:

- Plan 01: complete schema, integrity, RLS, public view, generated types, and leader bootstrap
- Plan 02: Supabase client boundaries, Magic Link, PKCE callback, cookie refresh, leader guard, denial state, and sign out
- Plan 03: administration shell, theme, Church management, Ministry hierarchy, responsive collections, forms, URL state, and review checkpoints

Findings resolved during review:

- Replaced the obsolete `middleware.ts` architecture reference with the Next.js 16 `src/proxy.ts` convention.
- Separated public auth routes and protected admin routes with route groups to prevent a login redirect loop.
- Finalized attendance normalization around `session_participant`.
- Finalized term-group cardinality as zero or one group per ministry membership.
- Defined the exact `member_profile_public` projection and documented its intentional owner-rights security boundary.
- Added `NEXT_PUBLIC_SITE_URL` to the Auth plan for deterministic production Magic Link redirects.
- Split administration delivery into checkpoint 03A for shell and Church, followed by checkpoint 03B for Ministry structure.
- Added explicit file maps, URL parameter contracts, edge states, verification matrices, and stop conditions.

Evidence:

- Plans were compared against `AGENTS.md`, architecture, database, security, design, and workflow documents.
- Current official Supabase guidance was checked for RLS, view security, security-definer helpers, SSR clients, and Magic Links.
- Current Next.js guidance and installed documentation were checked for Proxy, Data Access Layer authorization, Route Handlers, and Server Action authorization.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm format:check` passed.
- `pnpm build` passed.

Blocking or high findings: none.

Implementation authorization:

- Plan 01 is ready.
- Plans 02 and 03 are complete as plans but remain intentionally blocked by their preceding review gates.

## 2026-09-11: Foundation review pass

Role: review agent

Result: accepted with scheduled non-blocking work

Evidence:

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm format:check` passed.
- `pnpm build` passed with the root route statically generated.
- `.env.local` is ignored and `.env.local.example` is visible to Git.
- The installed shadcn configuration uses Radix and Lucide.
- The package name is `tmgchurch`.

Findings:

- Medium, scheduled for Slice 6: the generated root page and metadata still contain English scaffold placeholders. They are not production content and must be replaced with Vietnamese public content before the public-directory slice is complete.
- Low, scheduled for Slice 3: the generated shadcn tokens still use a neutral primary color. Apply the approved blue semantic primary tokens when the administration shell and themes are implemented.
- Low, monitored: the current Next.js scaffold selects ESLint 9 because installed Next.js lint plugins have not declared ESLint 10 compatibility. The quality gate passes; upgrade only after peer compatibility is available and verified.

Blocking or high findings: none.

## 2026-09-11: Foundation planning pass

Role: planning agent

Scope:

- Initialized the repository scaffold and dependency baseline.
- Documented the product, architecture, complete database scope, security boundary, design system, implementation slices, workflow, and review criteria.
- Left feature code and migrations for a coding agent.

Decisions recorded:

- Member archive uses `archived_at`.
- Public directory uses ministry and term slugs.
- Database schema is created in full, while UI implementation is incremental.
- Current UI supports one active church.
- Mobile uses cards and bottom drawers; desktop administration uses tables.

Open verification for the next agent:

- Confirm the generated scaffold passes all repository quality commands after foundation configuration.
- Review the proposed attendance normalization and cross-term integrity constraints before writing the migration.
- Confirm the official Vietnamese church name and SEO description before production metadata is finalized.

Findings:

- No implementation findings yet. Feature code has not started.
