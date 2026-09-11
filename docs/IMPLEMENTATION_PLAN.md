# Implementation plan

## Working method

Each slice is implemented by a coding agent, reviewed independently, and revised until the review has no blocking or high-severity findings. Do not begin a later slice while an earlier slice has unresolved data, authorization, or build findings.

## Slice 0: Foundation

Status: complete after foundation review.

Deliverables:

- Next.js TypeScript App Router scaffold with Tailwind CSS
- pnpm lockfile
- shadcn/ui configuration using Radix and Lucide
- Core dependencies for Supabase SSR, URL state, forms, validation, theme, and desktop tables
- Environment templates
- Engineering, architecture, database, security, design, workflow, and review documentation
- Strict project scripts for lint, typecheck, formatting, and build

Exit criteria:

- Dependencies install successfully.
- Scaffold passes all quality-gate commands.
- No product feature is represented as complete.
- Documentation has no unresolved contradiction about language, scope, auth, privacy, or routing.

## Slice 1: Database migration and generated types

Status: complete. Commit: `42cd479 feat: establish database schema and RLS`.

Deliverables:

- One ordered initial migration under `supabase/migrations/`
- Initial Supabase migration with schema, immutable-scope integrity, and RLS
- Public member directory view and generated database types
- First-leader bootstrap runbook

## Slice 2: Supabase clients and authentication

Detailed plan: `docs/plans/02-authentication.md`

Status: planned; blocked until Slice 1 passes independent review.

Deliverables:

- Validated environment module
- Public client
- Authenticated browser and server client factories
- Current session refresh pattern required by the installed Next.js and `@supabase/ssr` versions
- `/admin/login` Magic Link form
- `/admin/auth/callback` PKCE exchange
- Admin layout authorization and non-leader denial
- Sign-out action

Review focus:

- Safe callback redirect
- Cookie persistence
- No service role
- No email enumeration
- Local and production redirect configuration

## Slice 3: Administration shell and active church

Detailed plan: `docs/plans/03-admin-church-and-ministry.md`, checkpoint 03A.

Status: planned; blocked until Slice 2 passes independent review.

Deliverables:

- Mobile-first admin navigation
- Light default theme and dark theme
- Active single-church context
- Church create/edit interface
- Vietnamese loading, empty, error, and success states
- Responsive shell without horizontal overflow

Review focus:

- Mobile viewport behavior
- Theme persistence and contrast
- Leader-only access
- 16 px mobile form controls
- Lucide-only icons and no emoji

## Slice 4: Ministry structure management

Detailed plan: `docs/plans/03-admin-church-and-ministry.md`, checkpoint 03B.

Status: planned; blocked until checkpoint 03A passes independent review.

Deliverables:

- Ministry CRUD
- Ministry term CRUD
- Term group CRUD
- Term department CRUD
- Friendly slug generation and collision handling
- Server pagination, search, filters, and `nuqs` URL state
- Cards and bottom drawers on mobile; table and appropriate editor surface on desktop

Review focus:

- Parent-child consistency
- Date validation
- Search debounce of 300 ms
- Dropdown search threshold
- Bounded DOM and correct pagination

## Slice 5: Member management

Deliverables:

- Member create, read, update, archive, and restore
- Private phone field in admin only
- Ministry term membership
- Group, department, and member-segment assignments
- Active and archived views
- Name search, filters, sort, pagination, and skeletons

Review focus:

- No hard-delete UI
- Archived state behavior
- Assignment transaction integrity
- Phone privacy
- Mobile card and drawer usability

## Slice 6: Public member directory

Deliverables:

- Public home page
- `/ministries/[ministrySlug]/terms/[termSlug]`
- Public reduced member data only
- Ministry and term navigation
- Name search, department/group filters, pagination, and skeletons
- Vietnamese metadata, canonical URLs, and empty/error states
- Clearly labeled announcement and schedule placeholders only if those modules are not live

Review focus:

- Anonymous access
- Public view only
- No phone, auth, archive, attendance, or care data
- Friendly slug behavior and canonical metadata
- Search and pagination on small screens

## Later product phases

Implement in separate approved plans:

- Recurrence rules and ministry sessions
- Session participants and attendance
- Session assignments
- Department service roles and rosters
- Service assignments
- Care flags and notes
- Multi-church leader membership and church switching
- Live announcements and schedules if their final data model is approved

The first migration may contain the agreed tables for these phases, but their UI and mutation workflows are outside the initial implementation sequence.
