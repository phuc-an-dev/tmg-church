# Phase 1: Authorization Foundation Design

Status: approved design; implementation not authorized

Date: 2026-09-18

Roadmap: `docs/AUTHORIZATION_ROADMAP.md`

Architecture decision: `docs/decisions/0003-authorization-architecture.md`

Implementation authorization: `docs/NEXT_AGENT_TASK.md` remains `waiting`

## Purpose

Add the durable identity, system-role, Ministry Term role, lifecycle, Department-code, and business-audit foundation without changing the application's current authorization source or opening new login flows.

## Scope boundaries

### Included

- Add normalized unique email storage to `member_profile`.
- Add fixed Department codes to `term_department`.
- Add the Ministry Term lifecycle foundation.
- Add Church-scoped `master_admin` and `admin` storage.
- Add Ministry Term officer assignments and their durable invariants.
- Add append-only business audit storage for Phase 1 security events.
- Bootstrap the confirmed Master Admin and backup Admin while preserving legacy leader access.
- Synchronize generated database types and verify database invariants.

### Excluded

- No RLS or application cutover from `leaders` and `is_leader()`; that belongs to Phase 2.
- No role-management UI; that belongs to Phase 3.
- No invitation storage, email/password flow, Auth Hook, SMTP, or Magic Link removal; those belong to Phase 4.
- No Group, Department, request, or session workflow authorization changes.
- No linked migration, hosted configuration, deployment, or push without separate explicit authorization.

## Data design

### Member email

- Add a nullable `email` to `member_profile` and store it in normalized lowercase form.
- Enforce uniqueness across all member profiles with a non-null email, including archived profiles, because an account identity must not be reusable accidentally.
- For profiles already linked to Auth users, backfill only from the matching normalized `auth.users.email` after duplicate and mismatch preflight checks pass.
- Leave unlinked profiles without a verified source as null; do not infer addresses from names or silently resolve conflicts.
- Phase 1 provides storage and integrity only. Verified email-change behavior remains Phase 4 work.

### Ministry Term lifecycle

- Add the fixed states `draft`, `active`, and `closed`; lifecycle state, not dates, becomes the future authorization source.
- Classify existing terms through an explicit reviewed backfill. The migration must fail if a Ministry has an ambiguous active-term candidate.
- New terms default to `draft` after existing data is classified.
- Enforce at most one `active` term per Ministry.
- Permit only `draft -> active -> closed`; `closed` is terminal.
- Phase 1 protects lifecycle transitions and term-role writes. Phase 2 applies lifecycle-aware capability and RLS gates to all operational tables before any lifecycle UI is exposed.

### Fixed Department codes

- Add the codes fixed in the architecture decision: `social_support`, `small_groups`, `pastoral`, `music`, `worship`, `visitation_care`, and `evangelism`.
- Build an explicit reviewed mapping for every existing Department. Abort migration when a row is unmapped or two Departments in one term map to the same code.
- After backfill, require a code and enforce one Department per code per Ministry Term.
- New codes require a reviewed migration and corresponding capability changes; no UI creates arbitrary codes.

### System roles

- Store Church-scoped assignments for `master_admin` and `admin` in a dedicated system-role relation.
- Allow at most one system role per user in a Church and at most one `master_admin` row per Church.
- Reference the Master Admin Auth user restrictively so deleting the Auth user cannot silently remove the sole master assignment.
- After bootstrap, prevent deletion, Church reassignment, or demotion of the master row.
- Transfer or emergency recovery changes the user on the existing master row through one controlled, audited transaction; it does not delete the row or temporarily create a second master.
- New system-role rows do not grant current application access in Phase 1. Existing application authorization continues to use `leaders`.

### Ministry Term roles

- Store one of the fixed Ministry role codes against a `member_profile` and `ministry_term`.
- Enforce one holder per role seat per term while allowing a member to hold multiple distinct compatible roles.
- Require the assigned member to be enrolled in the same Ministry Term.
- Use restrictive relationships so deleting a parent cannot silently erase role history.
- Permit assignments in `draft`, but treat them as dormant when capability checks arrive in Phase 2.
- Reject assignment creation, replacement, or removal after the term is `closed`.
- Derive Department-head authority from the matching commissioner assignment; do not persist a duplicate Department-head role.

### Business audit

- Store append-only events with actor or system source, action, target, scope, timestamp, and minimal safe context.
- Initial events cover bootstrap, system-role changes, term-role changes, and term lifecycle transitions.
- Never store passwords, raw invitation tokens, token hashes, secrets, or unnecessary PII in audit payloads.
- Revoke direct update and delete access. Direct client inserts are not allowed; trusted transactional routines create audit rows with the protected mutation.
- During Phase 1, legacy leaders may receive the minimum read access needed for verification, but the audit table does not become a new authorization source.

## Bootstrap and recovery

Before authoring the active brief, confirm:

- the existing Auth user and Church that will become `master_admin`;
- the existing Auth user that will become the backup `admin`;
- both users' `member_profile` links and normalized Auth emails;
- the initial lifecycle classification for every existing Ministry Term;
- the Department-code mapping for every existing Department.

The bootstrap is idempotent, audited, and applied without removing either account from `leaders`. It must reject missing, duplicate, cross-Church, or mismatched identity data rather than guessing.

The recovery runbook uses a direct trusted database connection to transfer the existing master row to a verified recovery Auth user. It records the operator, reason, old user, new user, and verification result without storing credentials. The exact command is written and tested locally in the implementation brief; no placeholder production command is committed.

## Migration sequence

1. Run read-only preflight for identity, email, term-lifecycle, and Department-code conflicts.
2. Add nullable columns and new relations without changing current authorization behavior.
3. Apply the explicitly approved email, lifecycle, and Department-code backfills.
4. Add final uniqueness, lifecycle, relationship, and append-only protections.
5. Bootstrap the confirmed Master Admin and backup Admin in the same controlled rollout.
6. Regenerate database types and run invariant verification.
7. Prove `leaders` and `is_leader()` still authorize existing application paths.

Rollback remains additive while legacy authorization is active. The implementation brief must provide migration-specific recovery steps and must not use broad destructive teardown against data-bearing production objects.

## Acceptance evidence

- Local database reset and migration apply succeed from an empty database.
- Preflight rejects duplicate normalized emails, ambiguous active-term classification, and invalid Department mappings.
- Stable state contains exactly one Master Admin for the Church and the confirmed backup Admin.
- A second master, deletion/demotion of the master row, invalid recovery target, duplicate term seat, non-enrolled officer, and closed-term role mutation are rejected.
- Compatible multi-role assignments succeed and commissioner authority remains derived rather than duplicated.
- Audit rows are created atomically for Phase 1 security events; update/delete attempts and unsafe payloads are rejected.
- Existing leader login and administration behavior remain unchanged.
- Generated database types match the local schema.
- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, and `git diff --check` pass.
- Linked migration status is inspected read-only before any separate production proposal.

## Gate to implementation

This design does not activate Phase 1. The next planning task must resolve the five bootstrap/backfill inputs above, write one self-contained implementation brief in `docs/NEXT_AGENT_TASK.md`, and stop for explicit user authorization.
