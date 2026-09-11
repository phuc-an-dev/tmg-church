# Review log

Use one section per implementation or review pass. Keep newest entries at the top below this instruction.

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
