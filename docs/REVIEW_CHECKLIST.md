# Review checklist

## Scope and repository

- The change implements only the approved plan slice.
- Source code and developer-facing text are English.
- User-facing text and metadata are Vietnamese.
- No emoji or non-Lucide interface icons were introduced.
- No unrelated dependency or architecture was added.
- Environment secrets are not committed.

## Framework and code quality

- The implementation follows the installed Next.js documentation.
- Server Components remain the default.
- Client boundaries are limited to interaction needs.
- Initial data is not fetched in `useEffect`.
- Supabase queries select explicit fields.
- TypeScript contains no `any` escape hatch.
- Zod validates every mutation on the server.
- Lint, typecheck, formatting check, and build pass.

## Authorization and privacy

- RLS is enabled on every base table.
- Anonymous base-table access fails.
- Authenticated non-leader base-table access fails.
- Leader access succeeds only where intended.
- Users cannot add themselves to `leaders`.
- Public code queries only the approved public view.
- Public responses exclude phone, user ID, archive metadata, attendance, and care data.
- Archived members do not appear publicly.
- No service-role key exists in app code or browser configuration.

## Database integrity

- Foreign keys and supporting indexes exist.
- Unique constraints prevent duplicate memberships and assignments.
- Date and status checks reject invalid values.
- Cross-term relationships cannot be mixed.
- Archive and restore preserve historical relationships.
- Migrations apply cleanly to an empty database.

## Authentication

- Magic Link uses the cookie-backed SSR flow.
- Callback codes are exchanged safely.
- External and protocol-relative callback targets are rejected.
- Non-leaders receive a Vietnamese access-denied state.
- Login responses do not reveal whether an email is authorized.
- Sign-out clears the session and protects cached admin content.

## Responsive interface

- The flow works at 320, 375, 390, 768, 1024, and 1440 px widths.
- Mobile collections use cards.
- Mobile create, edit, detail, filter, and confirmation flows use a bottom drawer only. Centered modals and dialogs are not used on mobile.
- Desktop administration uses a readable table where appropriate.
- Form text is at least 16 px on mobile.
- Primary touch targets are at least 44 by 44 px.
- No horizontal overflow or keyboard-obscured primary action appears.
- Light is the default theme; dark theme is complete and readable.

## Interaction and state

- Native `select` is not used.
- Browser `alert()`, `confirm()`, and `prompt()` are not used.
- Dropdowns with five or more items support search.
- Server-backed search debounces by 300 ms.
- Filters and pagination are represented by `nuqs` URL state.
- Filter changes reset the page.
- Loading uses skeletons rather than blocking full-page spinners.
- Empty, filtered-empty, error, pending, success, archive, and restore states exist.
- Only active drawers, dialogs, and menus are mounted.
- Pagination limits collection DOM size.

## Accessibility and SEO

- Heading order is semantic.
- Controls have visible labels or accessible names.
- Keyboard focus is visible and logical.
- Icon-only controls have Vietnamese accessible names.
- State is not communicated by color alone.
- Reduced motion is respected.
- Public pages have Vietnamese title, description, canonical URL, and useful social metadata.
- Friendly slug routes return a localized 404 when invalid.
