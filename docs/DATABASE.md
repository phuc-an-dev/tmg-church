# Database design

## Design goals

- Represent one current church cleanly while retaining explicit church ownership.
- Avoid hard-coding the youth ministry or its current membership count.
- Preserve historical terms, assignments, attendance, service, and care records.
- Keep private data out of public queries by construction.
- Use soft archive for member records.
- Enforce relationship consistency and uniqueness in Postgres.

## Hierarchy

```text
church
  `-- ministry
        `-- ministry_term
              |-- term_group
              |-- term_department
              |-- ministry_membership -- member_profile
              |     |-- term_group_membership
              |     `-- ministry_assignment
              `-- ministry_session
                    |-- session_participant
                    |     `-- attendance_record
                    |-- session_assignment
                    `-- service_assignment
```

`member_segment` classifies members at church scope and is independent of a ministry term. Care records point to a member and term. Service roles and rosters belong to a term department.

## Required tables

The first migration creates the complete agreed schema:

- `church`
- `ministry`
- `ministry_term`
- `term_group`
- `term_department`
- `member_profile`
- `member_segment`
- `member_segment_membership`
- `ministry_membership`
- `term_group_membership`
- `ministry_assignment`
- `session_recurrence_rule`
- `ministry_session`
- `session_participant`
- `attendance_record`
- `session_assignment`
- `department_service_role`
- `service_roster`
- `service_assignment`
- `care_flag`
- `care_note`
- `leaders`

## Foundation refinements

The migration should preserve the supplied domain model and include these refinements before production data exists:

- Add `slug` to `church`, `ministry`, and `ministry_term`.
- Add `created_at` and `updated_at` to mutable entity tables.
- Add `archived_at timestamptz` to `member_profile`.
- Keep `member_profile.user_id` nullable and unique when present.
- Keep `birth_year` for the MVP; do not collect full birth dates without a product need.
- Keep `phone` private and nullable.
- Make `ministry_assignment.term_department_id` required; an assignment without a department has no defined meaning.
- Model attendance from `session_participant` to avoid duplicating session and member references in `attendance_record`.
- Add `created_at` to relationship and history records. Add `updated_at` to mutable entity, attendance, and note records.
- Store status-like values as text with check constraints in the first migration. Promote them to enums only if their lifecycle becomes stable.

## Required constraints

- `church.slug` is globally unique.
- `ministry` is unique by `(church_id, slug)`.
- `ministry_term` is unique by `(ministry_id, slug)`.
- `ministry_term.end_date` is not earlier than `start_date` when both exist.
- `member_profile.birth_year` falls within a reasonable database range when present.
- `member_profile.user_id` is unique when present.
- `ministry_membership` is unique by `(ministry_term_id, member_profile_id)`.
- `member_segment_membership` is unique by `(member_segment_id, member_profile_id)`.
- `term_group_membership` is unique by `ministry_membership_id`, enforcing zero or one group per membership within its term.
- `ministry_assignment` is unique by `(ministry_membership_id, term_department_id)`.
- `session_participant` is unique by `(ministry_session_id, member_profile_id)`.
- `attendance_record` is unique by `session_participant_id` and has status `present`, `absent`, or `excused`.
- `session_assignment` is unique by `(ministry_session_id, ministry_membership_id)`.
- `department_service_role` is unique by `(term_department_id, name)`.
- `service_assignment` prevents the same roster, session, role, and membership combination from appearing twice.

Cross-parent consistency cannot be fully protected by independent foreign keys. The migration or transaction functions must prevent a group, department, membership, session, roster, or role from being combined across different ministry terms.

## Delete behavior

- Member removal in the product is an update to `archived_at`, not a SQL delete.
- Historical records use restrictive deletion by default.
- Pure join records may use cascade deletion only when their parent deletion is itself safe and intentional.
- Church, ministry, term, session, attendance, roster, and care history must not cascade away accidentally.

## Public view

Create the purpose-built public directory view as `member_profile_public`, preserving the required public API name while enriching it with ministry-term context.

Approved output fields:

- Member ID
- Full name
- Birth year
- Church name and slug
- Ministry name and slug
- Term name and slug
- Group name when present
- Department names when present

The view must exclude phone, user ID, archive timestamp, leader data, attendance, care flags, and care notes. It must include only active members and only the membership rows for the requested ministry term.

Grant `SELECT` on the public view to `anon` and `authenticated`. Public application code must not query `member_profile` directly.

Because Postgres views and RLS execution behavior can differ by view security mode, the migration review must verify actual anonymous results against the intended safe column list and row filters. The public grant is acceptable only for this deliberately reduced view.

## Leader bootstrap

The initial leader email is configured outside committed source. After that user completes the first Magic Link sign-in, an authorized database operator inserts the matching `auth.users.id` into `leaders`.

The application must not automatically promote a user based only on an email supplied by the browser. The `leaders` table is a global allow-list for the current single-church UI. A later multi-church release should add a `church_leader` membership table before exposing multiple churches in the same admin interface.

## Indexes

Index every foreign key used for joins or policy checks. Add focused indexes for:

- Lowercase or normalized member name search
- `member_profile(church_id, archived_at)`
- Ministry and term slug lookup
- Membership lookup by term and member
- Session lookup by term and date
- Leader lookup by `user_id`

Choose the name-search strategy during implementation. For approximately 90 members, normalized indexed text is sufficient; trigram search can be added when scale or fuzzy matching justifies it.

The canonical implementation decisions and verification matrix are defined in `docs/plans/01-database-and-rls.md`.
