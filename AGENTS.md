<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TMG Church agent instructions

User instructions take precedence. Keep context and changes bounded.

## Start here

- Read `docs/NEXT_AGENT_TASK.md` only. It is the sole implementation authorization and names any extra context required by the active task.
- Do not scan `docs/`, completed plans, Git history, or review history unless the active brief explicitly requires it.
- Before changing a Next.js API, read only its relevant local guide in `node_modules/next/dist/docs/`.

## Non-negotiable rules

- Use English for code, filenames, comments, documentation, logs, UI copy, metadata, accessible labels, and authentication email content.
- Display user-entered values verbatim and keep Vietnamese slug input supported.
- Use the brand `TMG Church`, Lucide icons through `lucide-react`, and no emoji or Unicode interface icons.
- Use Next.js App Router, Supabase, and `@supabase/ssr`; do not add a separate backend or service-role key.
- Prefer Server Components for reads and Server Actions for authenticated mutations. Keep Supabase access in server query or mutation modules.
- Treat RLS as authorization. Validate mutations with Zod and return structured errors without exposing raw database failures.
- Public pages query approved public views only. Never expose phone, auth IDs, archived members, care data, or private notes.
- Archive members with `archived_at`; do not hard-delete them from the UI.
- Keep relationship writes transactionally consistent and enforce durable invariants in Postgres.
- Do not add dependencies or automated tests unless the active brief requires them.

## Delivery

- A coding agent implements only the active brief. A review agent reports findings without silently editing code.
- Before handoff, run:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

- Run the active brief's manual checks and record only a compact accepted outcome in `docs/reviews/REVIEW_LOG.md`.
- After acceptance, move durable decisions into canonical docs, delete the completed task plan, and reset `docs/NEXT_AGENT_TASK.md` to waiting. Git history is the archive.
