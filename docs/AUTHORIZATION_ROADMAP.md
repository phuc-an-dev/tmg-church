# Authentication and Authorization Roadmap

## Status

- Initiative status: In progress
- Active implementation phase: None
- Implementation authorization: `docs/NEXT_AGENT_TASK.md` remains the sole active brief
- Next gate: Brainstorm Phase 2 capability engine and RLS cutover, then approve its active brief

## Objective

Replace the global `leaders` authorization model with a secure, scoped system that supports one `master_admin`, Church-wide `admin` accounts, Ministry Term roles, Department and Group capabilities, invitation-only email/password accounts, and deny-by-default Row Level Security.

This file tracks sequence, dependencies, phase boundaries, and acceptance gates. It intentionally does not lock implementation details before the dedicated brainstorm for each phase.

## Planning and Delivery Protocol

1. Select the phase's execution mode from this roadmap.
2. Brainstorm only when the phase is marked design-first, a fixed decision changes, or implementation discovery exposes a new product decision.
3. Approve any required phase design and acceptance criteria.
4. Put only that phase's implementation brief in `docs/NEXT_AGENT_TASK.md`.
5. Implement, test, and independently review the phase.
6. Perform any required user-owned external action or manual acceptance.
7. Record the compact accepted outcome in `docs/reviews/REVIEW_LOG.md`.
8. Update this roadmap, reset `docs/NEXT_AGENT_TASK.md` to waiting, and stop.

A bounded phase may proceed without a new brainstorm when its fixed decisions, interfaces, and acceptance criteria are already complete. It still requires explicit authorization through `docs/NEXT_AGENT_TASK.md`.

The planning agent does not implement application code, database migrations, Supabase configuration, or deployment changes. Implementation is handed off to another agent after approval.

## Execution Model

### Standard step catalog

Each phase selects from the following steps. The catalog makes user involvement and agent autonomy explicit.

| Code | Step                                                                                       | Owner                                                      |
| ---- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| A    | Inspect current repository, database, migration, and environment state                     | Agent                                                      |
| B    | Brainstorm unresolved product, security, data, or UX decisions                             | User + planning agent                                      |
| C    | Approve the phase design and acceptance criteria                                           | User                                                       |
| D    | Write the single active brief and explicitly authorize it                                  | Planning agent + user                                      |
| E    | Prepare preflight checks, rollback/recovery procedure, and exact external-action checklist | Implementation agent                                       |
| F    | Implement the authorized scope only                                                        | Implementation agent                                       |
| G    | Run automated, database, manual, and negative-path verification required by the brief      | Implementation agent                                       |
| H    | Perform independent review; return findings to the implementer until accepted              | Review agent + implementation agent                        |
| I    | Perform user-owned setup, secret handling, real-account testing, or business acceptance    | User                                                       |
| J    | Apply an explicitly authorized linked-production or hosted-service change                  | User or explicitly authorized implementation agent         |
| K    | Verify production state, access, audit evidence, and rollback readiness                    | Implementation/review agent + user where login is required |
| L    | Record acceptance, update this roadmap, reset the active brief to waiting, and stop        | Planning/review agent                                      |

### Execution modes

- **Design-first:** Steps B and C are mandatory before an active brief. Use when schema, security boundaries, lifecycle, privacy, or user workflow is being defined.
- **Bounded delivery:** After D, agents may complete F-H and L without another brainstorm when all fixed decisions already cover the change.
- **Operational:** Steps I and/or J require the user because they involve secrets, hosted dashboards, real accounts, production data, or an explicit go/no-go decision.
- **Validation:** The primary work is verification. Any discovered fix must be placed into a bounded active brief before code changes.

### Minimum versus maximum planned path

- **Minimum safe path** is the smallest allowed sequence when no ambiguity, defect, or external rollout is encountered.
- **Maximum planned path** adds every design, rollback, user acceptance, production rollout, and post-production verification step expected for the phase.
- The maximum planned path is not a hard safety cap. A failed gate adds a documented fix-and-review loop rather than skipping the gate to preserve a step count.

## Fixed Decisions

### Authentication boundary

- Supabase Auth owns identities, password hashing, sessions, token refresh, sign-out, password recovery, and verified email changes.
- TMG Church owns invitations, account-to-member linking, roles, capabilities, scope resolution, business audit events, and RLS policies.
- Authentication never implies authorization.
- Magic Link login will be removed. The supported sign-in method will be email and password.
- Accounts are invitation-only during the leadership pilot. Public signup is not allowed.

### System roles

- Remove `leaders` as an authorization source after a verified cutover.
- Exactly one account holds `master_admin`.
- `master_admin` manages `admin` accounts.
- `admin` has full Church-wide business administration, including invitations, operational role assignment, and role revocation.
- `admin` cannot grant or revoke `master_admin` or `admin`.
- A user who loses all operational roles keeps the Auth account but receives no administration capabilities.

### Ministry Term roles

- All Ministry roles belong to one `ministry_term` and do not carry into another term.
- Initial role codes:
  - `ministry_head`
  - `secretary`
  - `treasurer`
  - `social_support_commissioner`
  - `small_groups_commissioner`
  - `pastoral_commissioner`
  - `music_commissioner`
  - `worship_commissioner`
  - `visitation_care_commissioner`
  - `evangelism_commissioner`
- Secretary and Treasurer have no feature capabilities in this initiative beyond being assignable and visible.
- Ministry Head has full operational control inside the active term but cannot change Ministry officer assignments or the Ministry Head assignment.
- Only `master_admin` and `admin` appoint or remove Ministry officers.
- One commissioner assignment derives the matching Department-head capabilities; no duplicate Department-head assignment is stored.
- A person may hold multiple compatible roles across Ministry, Department, and Group scopes.

### Department codes

- Department codes are a fixed enum and are not user-configurable.
- Initial codes:
  - `social_support`
  - `small_groups`
  - `pastoral`
  - `music`
  - `worship`
  - `visitation_care`
  - `evangelism`
- New codes require a migration, application changes, capability mapping, tests, and code review.
- Admin users cannot create arbitrary Department types through the UI.
- The commissioner-derived Department Head may assign and unassign members, review join requests, and manage sessions only in the matching Department.

### Group roles

- Group role codes remain:
  - `group_leader`
  - `deputy_leader`
  - `bible_study_leader`
- Group Leader and Deputy Leader may assign and unassign members in their Group.
- Group Leader, Deputy Leader, and Bible Study Leader may manage sessions in their Group.
- Small Groups Commissioner may assign and unassign members across all Groups in the active term but cannot change Group leadership assignments.

### Term lifecycle

- `draft`: `master_admin` and `admin` may prepare structure and future role assignments only.
- Term assignments created in `draft` are dormant and produce no capability.
- Operational membership, request, session, and attendance mutations are unavailable in `draft`, including to system administrators.
- `active`: scoped role capabilities are effective.
- `closed`: term data is read-only to every application role, including `master_admin` and `admin`.
- Lifecycle, not dates, is the authorization source of truth.
- Activation and closure are explicit, audited operations.
- Each Ministry has at most one active term.
- Closed terms are not reopened through the application.

### Member visibility

- Group Leader and Deputy Leader may view member phone numbers inside their Group.
- Department Head may view member phone numbers inside the matching Department.
- Ministry Head may view member phone numbers throughout the active term.
- Small Groups Commissioner may view member phone numbers across all Groups in the active term.
- All other private-member reads remain denied unless a later approved capability explicitly allows them.

### Department requests

- A requester must already be enrolled in the Ministry Term.
- Requests apply only to Departments.
- States are `pending`, `approved`, `rejected`, and `withdrawn`.
- A member may withdraw a pending request and may submit a new request after rejection.
- Rejection reason is stored.
- The matching Department Head reviews requests; approved requests atomically create the Department assignment.

### Session ownership

- Session permissions belong to an authorized role in the resource scope, not to the individual creator.
- An authorized role in the same scope may create, edit, delete, and record attendance according to the approved capability matrix.
- Draft and closed lifecycle rules override role permissions.

### Invitations and email

- An invitation targets only the unique normalized email attached to an existing `member_profile`.
- Changing that email requires verification before the account-to-member link is updated.
- Invitation token lifetime is 15 minutes.
- Tokens are high entropy, one-time-use, and stored only as a secure hash in the invitation table.
- Resending an invitation revokes every previous unconsumed token for that member/email.
- Invitation consumption must be atomic and safe under concurrent requests.
- A Before User Created Auth Hook provides the final signup gate.
- Raw activation tokens must not be persisted in logs, tables, analytics, or Auth user metadata.
- Supabase custom SMTP and Auth templates handle Auth-generated confirmation, recovery, and email-change messages.
- A separate application mail path sends the custom invitation message, even if it uses the same production email provider.

### Audit

- Supabase Auth Audit Logs remain the source for authentication events such as signup, login, password reset, email verification, token refresh, and logout.
- An append-only application audit log records invitations, system-role changes, operational-role changes, member assignments, Department-request decisions, lifecycle transitions, and session mutations.
- Business audit records identify actor, action, target, scope, timestamp, and the minimal safe before/after context needed for review.

## Phase Overview

| Phase | Name                                     | Status      | Depends on       |
| ----- | ---------------------------------------- | ----------- | ---------------- |
| 0     | Architecture and planning baseline       | Complete    | None             |
| 1     | Authorization foundation                 | Complete    | Phase 0          |
| 2     | Capability engine and RLS cutover        | Not started | Phase 1          |
| 3     | System governance and role-management UI | Not started | Phase 2          |
| 4     | Invitation-only email/password accounts  | Not started | Phase 2, Phase 3 |
| 5     | Scoped Group and Department operations   | Not started | Phase 2, Phase 3 |
| 6     | Department join requests                 | Not started | Phase 4, Phase 5 |
| 7     | Session authorization                    | Not started | Phase 4, Phase 5 |
| 8     | Leadership pilot and security hardening  | Not started | Phases 4-7       |
| 9     | Broader member access                    | Not started | Phase 8          |

## Per-Phase Execution Requirements

The step codes refer to the standard catalog above. “Agent-only after authorization” means the user must still approve the active brief at Step D, but no further user operation is required unless a gate fails or scope changes.

| Phase | Mode                               | Minimum safe path            | Min steps | Maximum planned path         | Max steps | Mandatory user involvement                                                      |
| ----- | ---------------------------------- | ---------------------------- | --------: | ---------------------------- | --------: | ------------------------------------------------------------------------------- |
| 0     | Design-first                       | A, B, C, L                   |         4 | A, B, C, H, L                |         5 | Approve the architecture baseline                                               |
| 1     | Design-first + Operational         | A, B, C, D, E, F, G, H, I, L |        10 | A-L                          |        12 | Confirm the bootstrap `master_admin`; explicitly authorize any linked migration |
| 2     | Design-first + Operational         | A, B, C, D, E, F, G, H, I, L |        10 | A-L                          |        12 | Verify Master Admin access and approve the authorization cutover                |
| 3     | Bounded delivery                   | A, D, F, G, H, L             |         6 | A, B, C, D, E, F, G, H, I, L |        10 | No external setup; UI/business acceptance only if the maximum path is used      |
| 4     | Design-first + Operational         | A, B, C, D, E, F, G, H, I, L |        10 | A-L                          |        12 | Configure or authorize SMTP/provider secrets and test a real invitation inbox   |
| 5     | Bounded delivery                   | A, D, F, G, H, L             |         6 | A, B, C, D, E, F, G, H, I, L |        10 | Agent-only after authorization unless the capability matrix changes             |
| 6     | Bounded delivery                   | A, D, F, G, H, L             |         6 | A, B, C, D, E, F, G, H, I, L |        10 | Agent-only after authorization unless the request workflow changes              |
| 7     | Bounded delivery + security review | A, D, E, F, G, H, L          |         7 | A, B, C, D, E, F, G, H, I, L |        10 | Agent-only after authorization unless session authority changes                 |
| 8     | Validation + Operational           | A, D, G, H, I, L             |         6 | A, D, E, F, G, H, I, J, K, L |        10 | Use or supervise real pilot accounts and make the pilot go/no-go decision       |
| 9     | Design-first + Operational         | A, B, C, D, E, F, G, H, I, L |        10 | A-L                          |        12 | Select the member cohort and approve staged production rollout                  |

The minimum path applies only while the phase's fixed decisions and acceptance gate remain unchanged. New product decisions, material UI changes, failed checks, or production actions add the relevant catalog steps. Phase 2 never uses an agent-only cutover path. Phase 8 findings require a new bounded brief before any fix.

## Phase 0 — Architecture and Planning Baseline

### Purpose

Create a shared vocabulary and controlled delivery process before any implementation begins.

### Required outputs

- [x] Master roadmap with phase order and fixed decisions
- [x] Approved domain model for accounts, roles, invitations, capabilities, and audit records
- [x] Approved Role x Capability x Scope matrix
- [x] Approved lifecycle state machines
- [x] Approved authorization and RLS enforcement model
- [x] Approved invitation activation sequence
- [x] Approved migration and rollback strategy
- [x] Approved cross-phase test-persona matrix

### Acceptance gate

- No unresolved architectural decision blocks Phase 1.
- Phase 1 receives a dedicated brainstorm and an independently reviewable active brief.
- `docs/NEXT_AGENT_TASK.md` names Phase 1 only when the user explicitly authorizes implementation.

## Phase 1 — Authorization Foundation

### Purpose

Introduce the durable role, scope, lifecycle, and audit data model without opening new login flows or changing existing business UI.

### Candidate scope for the Phase 1 brainstorm

- System-role storage and the exactly-one-`master_admin` invariant
- Ministry Term role assignments and one-seat constraints
- Fixed Department-code representation and commissioner mapping
- Compatibility rules for users holding multiple roles
- Dormant draft assignments and closed-term immutability
- Application business-audit schema
- Safe bootstrap of the initial `master_admin`
- Database types and generated TypeScript types

### Explicit exclusions

- No email/password invitation UI
- No RLS cutover from `is_leader()`
- No business-screen permission visibility changes
- No Department-request workflow
- No session authorization changes

### Acceptance gate

- Database invariants reject invalid role combinations, duplicate seats, invalid scopes, and a second `master_admin`.
- Existing application behavior remains available to the bootstrap account.
- No production authorization source is removed yet.
- Migration rollback and lockout recovery are documented and tested locally.

## Phase 2 — Capability Engine and RLS Cutover

### Purpose

Replace global authorization with centralized, deny-by-default capability checks enforced at the database and server boundaries.

### Candidate scope for the Phase 2 brainstorm

- Capability catalog and resource-scope types
- Capability resolver and live database lookup strategy
- Term-lifecycle gates
- RLS policies for every affected table and public/private projection
- RPC authorization and Server Action guards
- Immediate role-revocation behavior
- Safe migration from `leaders` to system roles
- Removal of `is_leader()` only after proven call-site and policy replacement

### Acceptance gate

- Every affected read and mutation has an identified authorization boundary.
- Direct table/API/RPC access cannot bypass the same capability rules.
- Negative tests prove unauthorized personas are denied.
- The initial `master_admin` retains required access after `leaders` is retired.

## Phase 3 — System Governance and Role-Management UI

### Purpose

Provide audited interfaces for managing `admin` accounts and scoped operational roles.

### Planned scope

- Master Admin management of Admin accounts
- Admin management of operational roles
- Ministry officer assignment UI
- Derived Department-head capability presentation
- Group leadership assignment UI under the approved authority rules
- Role revocation, dormant draft display, and closed history
- Audit-history visibility

### Acceptance gate

- Only `master_admin` can add or remove `admin`.
- Admin users can manage operational roles but cannot elevate system roles.
- Ministry Heads cannot change their own head assignment, and Admin users cannot bypass the system-role hierarchy.
- Every role change is atomic, scoped, and audited.

## Phase 4 — Invitation-Only Email/Password Accounts

### Purpose

Replace Magic Link login with an invitation-only password flow linked to existing member profiles.

### Candidate scope for the Phase 4 brainstorm

- Unique normalized member email and verified email-change behavior
- Invitation schema, token hashing, 15-minute TTL, resend, revoke, and rate limits
- Admin invitation create, resend, and revoke flows for existing member profiles
- Application invitation mail delivery and production SMTP provider
- Short-lived activation proof design that never persists the raw token
- Before User Created Auth Hook
- Atomic Auth-user-to-member linking
- Password sign-in, recovery, update, and security notifications
- Unauthorized-but-authenticated landing state
- Removal of Magic Link UI and callback paths

### Acceptance gate

- Only a valid, unexpired, unconsumed invitation can create the intended account.
- Token replay, concurrent consumption, email mismatch, and resend invalidation are tested.
- Password and session handling remain entirely within Supabase Auth.
- Losing all operational roles does not delete or disable the Auth account.

## Phase 5 — Scoped Group and Department Operations

### Purpose

Apply the capability model to existing Group and Department member-management workflows and private-member visibility.

### Planned scope

- Group-scoped assignment and unassignment
- Cross-Group Small Groups Commissioner operations
- Department-scoped assignment and unassignment
- Derived Department-head permissions
- Member phone visibility by scope
- UI action visibility without relying on UI hiding for security
- Audit events for assignment changes

### Acceptance gate

- Each persona can read and mutate only its approved scope.
- Small Groups Commissioner cannot change Group leadership.
- Group leaders cannot operate on another Group.
- Department heads cannot operate on another Department.
- Database enforcement remains effective when UI and Server Actions are bypassed.

## Phase 6 — Department Join Requests

### Purpose

Allow enrolled members to request Department membership through an auditable, concurrency-safe approval workflow.

### Planned scope

- Request schema and state-transition rules
- Member submit and withdraw flows
- Department Head approve and reject flows
- Required rejection reason
- Reapplication after rejection
- Atomic approval and Department assignment
- Duplicate and concurrent decision prevention
- Request history and audit events

### Acceptance gate

- Non-enrolled members cannot submit requests.
- Only the matching Department authority can decide a pending request.
- Approval creates exactly one valid Department assignment.
- Repeated or concurrent decisions cannot corrupt state.

## Phase 7 — Session Authorization

### Purpose

Apply term, Department, and Group capabilities consistently to session creation, editing, deletion, attendance, and assignments.

### Planned scope

- Term-, Department-, and Group-scoped session capability mapping
- Scope-based shared management rather than creator ownership
- Attendance eligibility and private-member reads
- Edit/delete constraints and historical integrity
- Draft/closed lifecycle enforcement
- Revocation during an active session-management workflow
- Session audit events

### Acceptance gate

- Authorized roles in the same scope can manage the same session.
- Roles cannot operate on sessions outside their scope.
- Draft and closed terms reject operational session mutations.
- Direct RPC/table calls cannot bypass session authorization.

## Phase 8 — Leadership Pilot and Security Hardening

### Purpose

Validate the full system with real invited leadership accounts before broader access is enabled.

### Required personas

- `master_admin`
- `admin`
- Ministry Head
- Each commissioner type
- Group Leader
- Deputy Leader
- Bible Study Leader
- Authenticated user with no active operational role

### Required verification classes

- Route and navigation visibility
- Direct URL access
- Server Component reads
- Server Action mutations
- RPC execution
- Direct Data API access under RLS
- Draft, activation, closure, and role revocation
- Invitation expiry, replay, resend, recovery, and email change
- Private-member field exposure
- Audit completeness and sensitive-data redaction

### Acceptance gate

- The approved persona matrix passes all allow and deny cases.
- No critical or high-severity authorization finding remains.
- Pilot feedback is accepted and recorded before member access expands.

## Phase 9 — Broader Member Access

### Purpose

Open account access beyond leadership without expanding administration privileges.

### Candidate scope for the Phase 9 brainstorm

- Member landing area and self-only profile access
- Self-visible Ministry, Group, and Department memberships
- Department-request submission and withdrawal
- Account security and verified email maintenance
- Controlled rollout by cohort

### Acceptance gate

- Members cannot read private data belonging to other members.
- Members receive no administration capability without an active assignment.
- Rollout can be paused or restricted without disabling existing leadership access.

## Cross-Phase Quality Gates

Every implementation phase must run the repository-required checks:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
git diff --check
```

Database phases additionally require:

- Local migration reset/apply verification
- Database lint where available
- Explicit positive and negative RLS checks
- Concurrency checks for atomic workflows
- Generated database type synchronization
- Read-only linked migration status inspection before any production proposal

Applying linked migrations, changing hosted Supabase Auth settings, configuring production SMTP, sending real invitations, pushing, or deploying always requires explicit authorization in the active phase.

## Progress Checklist

- [x] Record agreed initiative boundaries and fixed decisions
- [x] Establish phase order and dependencies
- [x] Complete and approve Phase 0 architecture artifacts
- [x] Brainstorm Phase 1
- [x] Authorize Phase 1 in `docs/NEXT_AGENT_TASK.md`
- [x] Implement and independently accept Phase 1
- [ ] Repeat the brainstorm, brief, implementation, and acceptance cycle for Phases 2-9
- [ ] Retire this roadmap after the final accepted rollout and move durable decisions into canonical documentation

## Deferred Decisions

These are intentionally decided during the named phase rather than globally:

- Phase 1: exact table, enum, index, trigger, and function names
- Phase 2: exact capability function interfaces and per-table RLS expressions
- Phase 3: exact administration navigation and editor composition
- Phase 4: production SMTP provider, invitation-mail implementation, password policy, retry interval, and activation-proof protocol
- Phases 5-7: exact UI affordances and capability names for each existing action
- Phase 8: pilot account roster and test data
- Phase 9: first broader-member rollout cohort

No deferred decision authorizes implementation by itself.
