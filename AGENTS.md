<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TMG Church agent instructions

These instructions apply to the entire repository. User instructions take precedence. When requirements are unclear but do not change data safety or product scope, use the documented decision and continue.

## Context routing

- Start with `docs/NEXT_AGENT_TASK.md` and read only the files listed in its `Required reading` section.
- Do not scan the complete `docs/` directory, queued plans, archived history, or unrelated review entries.
- Read an additional repository document only when the active task directly references it or missing information blocks implementation.
- Read relevant bundled Next.js documentation in `node_modules/next/dist/docs/` before using a framework API. Do not rely on remembered conventions when local documentation differs.
- `docs/NEXT_AGENT_TASK.md` is the only source of implementation authorization. A queued plan is not authorized work.

## Product language

- Write all source code, identifiers, filenames, comments, commit messages, technical documentation, validation keys, and developer-facing logs in English.
- Write all user-facing interface copy, empty states, validation messages, email instructions, metadata, and SEO content in Vietnamese.
- Do not use emoji anywhere in the product or repository documentation.
- Use Lucide icons through `lucide-react`. Do not use Unicode symbols as interface icons.

## Scope discipline

- Work only on the plan named by `docs/NEXT_AGENT_TASK.md`.
- Do not implement later-phase workflows while completing an earlier slice.
- Do not create a separate backend, Express server, Spring Boot service, or privileged API service.
- Do not add automated tests during the initial MVP unless a task explicitly asks for them. Verification commands are still mandatory.
- Do not add dependencies when the existing stack can solve the requirement cleanly.

## Architecture rules

- Prefer Server Components for initial reads and page composition.
- Add Client Components only for interaction, browser APIs, form state, URL state, dialogs, drawers, and theme state.
- Use Server Actions for authenticated mutations unless a documented requirement needs a Route Handler.
- Keep Supabase access in server-side query or mutation modules. Components must not contain repeated inline database queries.
- Maintain two trust contexts: anonymous public access and cookie-backed authenticated access. The authenticated context may require separate browser and server factories because `@supabase/ssr` has different runtime adapters.
- Never use a service-role key in application code.
- Treat RLS as the authorization boundary. Hiding a control in the UI is not authorization.
- Validate every mutation with Zod before calling Supabase.
- Return structured mutation results. Do not expose raw database errors to users.

## Data and privacy rules

- Public pages may query only approved public views, never `member_profile` or another private base table.
- Public member data is limited to approved fields and excludes phone numbers, auth user IDs, archived members, care data, and private notes.
- Archive members with `archived_at`; do not hard-delete them from the UI.
- Keep all relationship writes transactionally consistent. If Supabase client calls cannot guarantee a multi-table invariant, use a narrowly scoped Postgres function protected by RLS and explicit grants.
- Add database constraints for uniqueness, valid date ranges, allowed status values, and relationship consistency.

## Quality gate

Before marking an implementation slice ready for review, run:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

Then perform the active plan's verification matrix and append evidence to `docs/reviews/REVIEW_LOG.md`. A passing build does not replace the plan's manual review requirements.

## Planning and review separation

- A planning or review agent must not silently implement fixes. It documents findings, severity, evidence, and the next coding slice.
- A coding agent implements the approved slice and records what changed and how it was verified.
- After review, the coding agent receives only actionable findings. Repeat implementation and review until there are no blocking or high-severity findings.
