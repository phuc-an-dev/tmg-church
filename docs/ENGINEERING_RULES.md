# Engineering rules

## Mobile-first UI

Apply these rules to every UI change before other presentation choices. Design and verify from the smallest viewport upward.

- Form controls are 16 px or larger on mobile.
- Touch targets are at least 44 by 44 px.
- Do not use native `select`.
- Do not use `alert()`, `confirm()`, or `prompt()`.
- On mobile, render collections as cards. Open create, edit, detail, filters, and confirmations in a bottom drawer only. Do not use a centered modal or dialog on mobile.

## Naming and language

- Use English for code, database identifiers, types, comments, technical documentation, and logs.
- Use English for all user-visible copy and SEO metadata.
- Use `kebab-case` for route segments and document filenames, `camelCase` for variables and functions, `PascalCase` for React components and types, and `snake_case` for Postgres objects.
- Use domain names rather than generic names such as `data`, `item`, or `handler` when a more precise name is available.

## TypeScript

- Keep TypeScript strict.
- Do not use `any`. Use `unknown` and narrow it.
- Prefer inferred local types and explicit public function boundaries.
- Generate Supabase database types after migrations and use them for all queries.
- Keep Zod schemas close to the domain operation and infer form input types from them.

## React and Next.js

- Default to Server Components.
- Keep client boundaries small and explicit.
- Do not fetch initial page data in `useEffect`.
- Use route `loading.tsx` files and `Suspense` boundaries for meaningful skeletons.
- Use `error.tsx` for recoverable route errors and `not-found.tsx` for missing friendly slugs.
- Revalidate only the paths or tags affected by a mutation.
- Do not make an entire page dynamic when a smaller boundary can own request-specific work.

## Supabase

- Use the publishable key only. Do not introduce a service-role key.
- Use an anonymous public client only for public views.
- Use cookie-backed `@supabase/ssr` clients for authenticated browser and server work.
- Verify the authenticated identity on the server before private reads or mutations.
- Let RLS enforce leader permissions for every base table.
- Select named columns. Avoid `select('*')` in application queries.
- Convert database failures into typed domain errors and English user messages.

## Forms and mutations

- Use React Hook Form with Zod.
- Normalize whitespace and empty optional values before persistence.
- Validate dates, birth years, phone length, and foreign-key selections on both client and server.
- Disable repeat submission while a mutation is pending.
- Confirm archive actions and communicate restore availability.
- Preserve entered values when the server rejects a mutation.

## Query state and pagination

- Use `nuqs` parsers shared by client controls and Server Components.
- Use one-based page numbers in URLs and UI.
- Use a default page size of 20 and supported sizes of 20, 50, and 100.
- Use stable ordering with a unique final tie-breaker, normally `full_name`, then `id`.
- Debounce server-backed text search by 300 ms.
- Clear default query values from the URL when practical.

## Styling and components

- Use shadcn/ui components as repository-owned source, not as a visual constraint.
- Use CSS variables for semantic colors.
- Use Lucide icons only and include accessible text or `aria-label` where meaning is not already visible.
- Do not use emoji or icon-only destructive actions without an accessible name.
- Native `select`, browser dialogs, mobile form size, touch targets, and mobile overlay rules are defined in Mobile-first UI.

## Performance

- Paginate queries at the database.
- Mount only the active drawer, dialog, or menu content. On mobile that overlay is a bottom drawer, not a centered dialog.
- Avoid rendering hidden copies of complete mobile and desktop collections simultaneously when the row count is material.
- Prefer aggregate public views or focused queries over client-side joins.
- Avoid N+1 database requests.

## Verification

The minimum technical gate is lint, typecheck, formatting check, and production build. Manual review must also cover RLS, public-field privacy, mobile behavior, keyboard access, dark mode, loading, empty, error, archive, and restore states.
