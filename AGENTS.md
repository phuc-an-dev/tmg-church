<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TMG Church agent instructions

User instructions take precedence. Keep context and changes bounded.

## Mobile-first UI

Apply these rules to every UI change before other presentation choices. Design and verify from the smallest viewport upward.

- Form controls are 16 px or larger on mobile.
- Touch targets are at least 44 by 44 px.
- Do not use native `select`.
- Do not use `alert()`, `confirm()`, or `prompt()`.
- On mobile, render collections as cards. Open create, edit, detail, filters, and confirmations in a bottom drawer only. Do not use a centered modal or dialog on mobile.

## Destructive actions

- Use `DestructiveActionButton` from `@/components/shared/item-action-buttons` for every destructive **Button** trigger: Delete, Archive, Leave, Remove, Unassign, and Deactivate.
- The canonical destructive treatment is `destructive-subtle`: light-red background, subtle red border, and destructive foreground. Do not hand-compose dangerous action colors with `Button variant="outline"` and `border-destructive`, `text-destructive`, or `bg-destructive` utilities.
- Do not use `Button variant="destructive"` directly in feature UI. Pass the action-specific English label and Lucide icon to the shared semantic component instead. Extend that component first if a legitimate destructive action needs a new presentation.
- This Button rule does not apply to `DropdownMenuItem` or `ConfirmationSheet`; retain their established destructive menu and confirmation semantics instead of styling them like an inline Button.
- The automated `destructive-action-policy.test.ts` guard enforces this rule; keep it passing when adding or changing action controls.

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

## Ponytail (Lazy senior dev mode)

Apply the Ponytail mindset to logic, mutations, queries, and refactoring:
- **Default mode**: `full` (strict minimal code); supports `ultra` (radical YAGNI) when requested.
- **The Ladder**: Stop at the first rung that holds: 1. Does it need to exist (YAGNI)? $\to$ 2. Reuse existing project utils/components $\to$ 3. Native Web/JS/TS stdlib $\to$ 4. Existing installed dependencies $\to$ 5. One line $\to$ 6. Minimal working diff.
- **Precedence**: TMG Church rules (Mobile-first drawer/touch targets, no native select, `DestructiveActionButton`, Zod validation, Supabase RLS) strictly override generic Ponytail shortcuts.
- **Testing**: Keep existing test suites and guards passing; avoid writing bloated test mocks or speculative test suites.

## Delivery

- A coding agent implements only the active brief. A review agent reports findings without silently editing code.
- Before handoff, run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

- Run the active brief's manual checks and record only a compact accepted outcome in `docs/reviews/REVIEW_LOG.md`.
- After acceptance, move durable decisions into canonical docs, delete the completed task plan, and reset `docs/NEXT_AGENT_TASK.md` to waiting. Git history is the archive.
