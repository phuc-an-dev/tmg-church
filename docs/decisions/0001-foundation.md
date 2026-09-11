# Decision 0001: Foundation choices

Status: accepted

Date: 2026-09-11

## Decisions

- Use pnpm as the package manager.
- Use Next.js App Router, TypeScript, Tailwind CSS, and ESLint.
- Use shadcn/ui with Radix primitives and Lucide icons.
- Use the Nova shadcn preset as the starting component style.
- Use `nuqs` for shareable query state.
- Use React Hook Form and Zod for administration forms.
- Use TanStack Table for desktop administration tables while rendering purpose-built cards on mobile.
- Use `next-themes` for a white default theme and black dark theme.
- Use blue semantic primary tokens.
- Use `/ministries/[ministrySlug]/terms/[termSlug]` for the public directory.
- Use `archived_at` for member archive and restore.
- Create the full agreed schema in the first migration, then implement workflows in bounded slices.
- Keep a single active church in the first UI while retaining church ownership in the data model.
- Use a temporary Lucide `Church` icon and text wordmark until official brand assets are provided.

## Rationale

These choices keep public URLs readable, administration state shareable, mobile flows explicit, and data history recoverable. The database can represent later modules without forcing their interfaces into the MVP.

The authenticated Supabase context uses separate browser and server factories because cookie handling differs by runtime. This is still one authenticated trust context, paired with a separate anonymous public context.

## Revisit conditions

- Add church-scoped leader membership before exposing multiple churches in one admin UI.
- Replace the temporary wordmark when official branding is available.
- Add fuzzy name search only when measured usage shows normalized search is insufficient.
- Reassess TanStack Table if its bundle or abstraction cost exceeds the desktop table's needs.
