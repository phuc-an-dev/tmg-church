# Product roadmap

This file records sequence only. It never authorizes implementation; use `docs/NEXT_AGENT_TASK.md`.

## Complete

- Foundation and repository rules
- Database schema, integrity constraints, RLS, public view, and generated types
- Supabase SSR authentication, Magic Link, leader authorization, and sign-out
- Mobile-first administration shell and single-Church management
- Ministry, term, group, and department management with URL state, pagination, responsive actions, and visual identity
- Member management: create, edit, archive, restore, private phone access, memberships, groups, departments, and segments
- Member segments: church-scoped slugs, visual identity, CRUD, per-member assignments, condition-based bulk adds
- Operational context resolver: centralized Church/Ministry/Term resolution for all protected queries and mutations

## Next

1. Public directory: approved public fields, friendly Ministry and Term routes, search, filters, pagination, and metadata.

## Later

- Sessions, recurrence, participation, and attendance
- Service roles, rosters, and assignments
- Care flags and notes
- Multi-Church leadership and switching
- Live announcements and schedules
