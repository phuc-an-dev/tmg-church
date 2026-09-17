# 0002: Contextual Session scopes

## Decision

A Session always belongs to one Ministry Term. A contextual Session optionally
targets exactly one child scope: a Group or a Department. A term-wide Session
has no child scope.

For a Group Session, clients provide only the Group identifier. The Server
Action resolves its Ministry Term and Church under the authenticated operational
context before writing the Session. Postgres validates that an optional Group or
Department belongs to the stored Ministry Term and rejects simultaneous child
scopes.

## Consequences

- Group, Department, and Ministry launchers can reuse one Session scope
  contract without trusting a route or form-supplied term.
- Attendance creates new records only for currently eligible scoped members.
  Existing participant and attendance records remain available when membership
  later changes.
- A term membership with Group, Department, or Session history cannot be
  removed; Postgres rejects the removal rather than deleting related history.
- `/admin/sessions` and `/admin/sessions/[sessionSlug]` remain the sole Session
  management and Attendance routes.
- Term Detail is the Ministry-level operational surface: Members, Groups,
  Departments, and term-wide Sessions each use their established mobile-first
  cards, bottom drawers, and action patterns.
