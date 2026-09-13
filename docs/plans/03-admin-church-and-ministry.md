# Plan 03: Administration, Church, and Ministry

Status: in progress; checkpoint 03A accepted, checkpoint 03B implementation in progress with the canonical swipe-action standard approved for completion

Depends on: Plans 01 and 02

Internal checkpoints: 03A administration shell and Church, then 03B Ministry structure

## Objective

Build the mobile-first administration shell and complete management for the single active Church, Ministries, Ministry Terms, Term Groups, and Term Departments. Deliver responsive collection patterns, forms, URL state, pagination, loading states, themes, and guarded deletion behavior without starting Member management.

## Scope

Included:

- Protected administration shell and navigation
- Light default theme, black dark theme, and blue primary tokens
- One active Church create/read/update/delete behavior
- Ministry CRUD
- Ministry Term CRUD
- Term Group CRUD
- Term Department CRUD
- Search, filters, sort, and server pagination where applicable
- `nuqs` URL state
- Mobile cards and bottom drawers
- Desktop tables and editor dialogs or side surfaces
- English product copy and full state coverage

Excluded:

- Member profiles and assignments
- Public member directory
- Sessions, attendance, service roster, and care interfaces
- Multiple-church switching
- Announcements and schedules beyond later public placeholders
- Import from files

## Final product decisions

1. The UI supports zero or one Church. Zero shows an onboarding create state. More than one is treated as a configuration error; the app never silently chooses one.
2. Church deletion is offered only when no dependent ministry or member exists. It requires explicit typed-name confirmation.
3. Ministry, Term, Group, and Department deletion is offered only when the database reports no protected dependent history. Foreign-key restrictions remain authoritative.
4. Deletes are permanent for empty structural records. Member archival is a separate later workflow.
5. Slugs are generated on create, remain stable when names change, and may be changed only through an explicit advanced field with collision validation and a warning that public links change.
6. Vietnamese slug generation removes diacritics, converts `đ` to `d`, uses lowercase ASCII and single hyphens, trims hyphens, and appends `-2`, `-3`, and so on for collisions within the documented parent scope.
7. Default collection page size is 20; options are 20, 50, and 100.
8. Search is case-insensitive, whitespace-normalized, URL-backed, and debounced by 300 ms when it triggers a Server Component refresh.
9. Collection ordering is stable: normalized name ascending, then UUID ascending. Terms additionally support start-date descending.
10. Mobile cards and desktop tables use the same server result. Do not render two full collection copies simultaneously.
11. Fewer than five choices use a custom non-searchable shadcn dropdown. Five or more choices use a searchable combobox.
12. Only the active drawer, dialog, menu, and term-detail section are mounted.
13. Mobile list items reveal `Edit` and `Delete` by swiping from right to left. Swiping right only closes an exposed action rail; it never reveals another action set.
14. A full swipe never executes an action. Deletion always requires an explicit action selection followed by the existing confirmation surface.
15. Swipe is progressive enhancement rather than the only action path. Mobile retains one accessible Lucide `More` menu trigger, and desktop tables use the same `More` action menu instead of inline Edit and Delete buttons.
16. At most one list item may expose actions. The open item closes when another item begins interaction, the user taps outside, scrolls, presses Escape, changes collection state, navigates, or opens an editor or confirmation surface.
17. Swipe state is transient local UI state. It is not persisted in `nuqs`, navigation history, storage, or the database.
18. The shared swipe primitive is established and verified on Ministry cards first, then reused without page-local gesture implementations by every Term, Group, and Department collection in checkpoint 03B. Future list-based administration plans must reuse this contract.

## Route map

```text
/admin
/admin/church
/admin/ministries
/admin/ministries/[ministryId]
/admin/ministries/[ministryId]/terms/[termId]
```

Responsibilities:

- `/admin`: compact operational overview and links to implemented modules
- `/admin/church`: create or edit the single Church; guarded delete for an empty Church
- `/admin/ministries`: paginated Ministry collection and create/edit/delete flows
- `/admin/ministries/[ministryId]`: Ministry summary and paginated Term collection
- `/admin/ministries/[ministryId]/terms/[termId]`: Term summary with one active section for Groups or Departments

Invalid UUIDs or inaccessible records return an English not-found state without revealing whether a record exists in another authorization scope.

## Suggested feature structure

```text
src/
  app/(protected)/admin/
    layout.tsx
    page.tsx
    loading.tsx
    church/
    ministries/
      [ministryId]/
        terms/[termId]/
  components/admin/
    admin-header.tsx
    admin-navigation.tsx
    mobile-navigation.tsx
  components/shared/
    collection-toolbar.tsx
    empty-state.tsx
    pagination.tsx
    responsive-editor.tsx
    searchable-combobox.tsx
  features/church/
    actions.ts
    queries.ts
    schemas.ts
    components/
  features/ministry/
    actions.ts
    queries.ts
    search-params.ts
    schemas.ts
    components/
```

Split Ministry subdomains further only when file size or responsibility justifies it. Avoid generic repositories that hide selected fields, authorization, or error handling.

## Shared implementation contracts

Queries:

- Live in server-only feature modules.
- Call `requireLeader` before private work even though RLS remains active.
- Select explicit fields typed by `src/types/database.ts`.
- Return small view models rather than passing raw Supabase responses to components.
- Use range queries and exact counts for server pagination.
- Use a unique ordering tie-breaker.

Mutations:

- Use Server Actions with server-side Zod validation.
- Return a discriminated result containing field errors, a safe form error code, and success data when needed.
- Translate stable error codes into English at the UI boundary.
- Recheck leader authorization within each action.
- Revalidate only affected paths or tags.
- Never expose raw Postgres or Supabase error text.

Responsive editor:

- Uses a bottom Drawer below the desktop breakpoint.
- Uses a Dialog or appropriate side surface on larger screens.
- Owns one shared form implementation.
- Is conditionally mounted only when open.
- Supports create and edit without duplicating business logic.

Canonical swipe-action item:

- Implement one reusable shared primitive, suggested as `src/components/shared/swipe-action-item.tsx`, plus a list-level coordinator only if needed. Page components provide item identity, accessible name, actions, disabled state, and visible content; the primitive owns gesture mechanics and exposure state but contains no entity mutation logic.
- Do not add a gesture or animation dependency. Use React state, Pointer Events, pointer capture, semantic buttons, and CSS transforms. Keep vertical page scrolling native with `touch-action: pan-y`.
- Enable drag gestures only below the desktop breakpoint and for coarse touch or pen input. Small-screen mouse and keyboard users use the `More` menu. Desktop never requires dragging.
- Use an 8 px movement slop before deciding intent. Lock horizontally only when absolute horizontal movement is at least 1.25 times vertical movement. If vertical intent wins, cancel the drag without preventing page scroll.
- Clamp leftward translation to the action-rail width. The standard rail is 144 px wide with two equal 72 px actions. Rightward movement cannot pass the closed position.
- Snap open when leftward displacement reaches at least 40 percent of the rail, or when leftward velocity reaches 0.5 px/ms after at least 24 px of intentional horizontal travel. Otherwise snap closed.
- Pointer cancellation, lost capture, resize across the desktop breakpoint, and component unmount must leave the surface in a stable closed state.
- Suppress the click that follows a recognized drag so a link or row action does not fire accidentally. Pointer starts originating from a link, button, input, menu, or other interactive descendant must preserve that control rather than initiate dragging.
- Animate only the opaque foreground item surface with `transform`. Use a 180 ms ease-out settle transition, disable the transition under reduced motion, and avoid layout-affecting animation, backdrop blur, gradients, or page-level reflow.
- The action rail sits beneath the card at its trailing edge. `Edit` uses the normal action treatment; `Delete` uses the destructive treatment. Both show a Lucide icon and English label, meet a 44 by 44 px minimum target, support light and dark themes, and remain visually subordinate to the item content until revealed.
- Only the active or currently dragged item's action rail is mounted and interactive. Closed rails must not leave hidden focusable actions in the accessibility tree. Keep one server result and one item collection in the DOM; do not render parallel mobile and desktop lists.
- The list owns a single `openItemId`. Opening or dragging another item closes the previous item before exposing the new rail. Collection query, sort, filter, page, and section changes reset it.
- Tapping outside or beginning vertical scrolling closes an open rail without blocking the intended tap or scroll. Pressing Escape closes it and returns focus to the originating item action trigger when applicable.
- Every item always exposes one 44 by 44 px Lucide `More` button with an accessible name such as `Actions for {item name}`. Use the existing accessible Dropdown Menu for Edit and Delete on mobile fallback and desktop. Add a tooltip where the icon meaning is not otherwise visible.
- The swipe buttons and `More` menu call the same entity-level handlers. Edit closes the rail before opening the shared responsive editor. Delete closes the rail before opening the confirmation surface. No gesture directly calls a Server Action.
- Disabled or dependency-blocked actions preserve the existing business rule, communicate the reason accessibly, and cannot be bypassed through swipe, menu, keyboard, or direct client state.
- Add one concise screen-reader instruction for the collection rather than repeating gesture instructions inside every item. Never make swipe discovery a prerequisite for completing the task.

## Query parameter contracts

Ministries:

- `q`: normalized search text, omitted when empty
- `page`: one-based positive integer, default 1
- `pageSize`: 20, 50, or 100; default 20
- `sort`: `name-asc` or `name-desc`; default `name-asc`

Terms:

- `q`: normalized search text
- `status`: `all`, `current`, `upcoming`, or `ended`; default `all`
- `page`: one-based positive integer
- `pageSize`: 20, 50, or 100
- `sort`: `start-desc`, `start-asc`, or `name-asc`; default `start-desc`

Term detail:

- `section`: `groups` or `departments`; default `groups`
- `q`, `page`, and `pageSize` apply only to the active section

Use shared `nuqs` parser declarations on client and server. Filter, search, sort, and page-size changes reset `page` to 1. Invalid values fall back to documented defaults and are normalized on the next interaction.

## Checkpoint 03A: Administration shell and Church

Status: accepted after independent review on 2026-09-12

### Shell

- Replace the temporary protected page with an English admin overview.
- Desktop navigation uses a compact sidebar or header appropriate to the final information hierarchy.
- Mobile navigation uses a bottom-safe navigation or Drawer opened by a Lucide menu icon.
- Navigation includes only implemented destinations.
- Header includes Church identity, theme toggle, and account/sign-out access.
- Add route-level skeletons and localized route error boundaries.

### Theme

- Wrap theme state once at the root provider boundary.
- Default to light when there is no stored choice.
- Support system preference only as an explicit user-selectable third mode if added; do not make it the default.
- Replace generated neutral primary tokens with accessible blue tokens in both themes.
- Use black or near-black neutral dark surfaces and verify contrast.
- Avoid hydration warnings through the supported `next-themes` pattern.

### Church behavior

Fields:

- Name, required
- Slug, required and advanced/editable under the slug rules

States:

- No Church: onboarding card and create action
- One Church: summary and edit action
- More than one Church: configuration error with no arbitrary active selection
- Loading skeleton
- Mutation pending, success, validation error, conflict, and database error
- Delete blocked by dependencies
- Empty-Church delete confirmation requiring the exact Church name

Checkpoint review must pass before 03B begins. Record screenshots or descriptions at required viewport widths, theme evidence, and all Church state results.

## Checkpoint 03B: Ministry structure

### Ministry

Fields:

- Church fixed to the active Church
- Name, required
- Slug, required under the stable-slug rules

Collection:

- Search, sort, pagination, count, skeleton, empty, and filtered-empty states
- Mobile card with the canonical swipe-action item and accessible `More` fallback
- Desktop table with name, slug, term count when available without N+1 queries, and one accessible `More` action menu instead of inline action buttons

### Ministry Term

Fields:

- Ministry fixed from the route
- Name, required
- Slug, required
- Start date, optional
- End date, optional and not before start date

Computed display status:

- Current when today is within the inclusive date range, accounting for missing boundaries
- Upcoming when start date is after today
- Ended when end date is before today
- Unscheduled when both dates are absent; it appears under `all`, not a misleading dated status

Dates are date-only business values. Do not convert them through UTC timestamps in a way that changes the displayed day in `Asia/Ho_Chi_Minh`.

### Term Group

Fields:

- Term fixed from the route
- Name, required

Behavior:

- Paginated active-section collection
- Create, edit, and dependency-restricted delete
- Uniqueness within the Term
- Reuses the canonical swipe-action item and action menu; it must not implement independent gesture logic

### Term Department

Fields and behavior mirror Term Group, including reuse of the canonical swipe-action item and action menu, with uniqueness within the Term. Do not implement service roles or rosters in this plan.

### Parent context

Every nested page displays a compact breadcrumb or context header with the Church, Ministry, and Term names. Links use protected UUID routes. Mutations derive parent IDs from validated server input and verify the relationship; they do not trust a hidden form field alone.

## Required shadcn components

Add only components used by this plan, likely:

- Button
- Card
- Input
- Label
- Form
- Skeleton
- Drawer
- Dialog or Sheet for desktop editing
- Dropdown Menu
- Alert Dialog
- Command and Popover for searchable comboboxes
- Table
- Tabs only if it preserves URL-backed active section and mounts active content only
- Tooltip for non-obvious icon-only controls

Use Lucide icons. Do not add another icon library. The coding agent must verify generated component defaults against the 16 px mobile form rule and blue theme tokens.

## Loading and error strategy

- Route `loading.tsx` renders a skeleton matching the final mobile card and desktop table geometry.
- Pagination and search transitions keep the prior collection visible with a clear pending treatment when possible.
- Empty and filtered-empty states are different and provide appropriate actions.
- A stale edit detects missing rows and returns a localized not-found/conflict result.
- Database uniqueness and foreign-key failures map to stable application error codes.
- Failed destructive actions keep the confirmation open and explain the safe next step.

## Performance and DOM limits

- Database pagination is mandatory even for the initial small data set.
- Fetch counts and aggregates without N+1 queries.
- Do not preload all nested Terms, Groups, and Departments on the Ministry collection.
- Load only the active term-detail section.
- Do not mount one editor per card or row.
- Avoid duplicate hidden mobile and desktop collections; use one semantic collection pattern or breakpoint-aware rendering that does not double material DOM.
- Keep URL updates debounced only where server work is triggered; UI state should remain responsive immediately.

## Implementation sequence

Checkpoint 03A:

1. Add only required shared shadcn components.
2. Implement theme provider and final semantic tokens.
3. Implement protected admin shell, responsive navigation, loading, and error states.
4. Implement active-Church query contract and zero/one/multiple handling.
5. Implement Church validation, create, edit, and guarded delete.
6. Verify 03A and request checkpoint review.

Checkpoint 03B after acceptance:

1. Preserve existing 03B work and establish the shared swipe-action primitive and list coordinator without adding dependencies.
2. Prove the complete gesture, fallback, accessibility, destructive-safety, and performance contract on Ministry cards.
3. Replace inline actions with the shared primitive and shared `More` menu across the existing Term, Group, and Department collections; do not copy gesture code.
4. Complete any remaining shared URL parsers, pagination, collection toolbar, queries, forms, actions, and responsive editor integration required by checkpoint 03B.
5. Verify responsive, authorization, integrity, state, swipe, accessibility, and performance requirements.
6. Stop and request independent review.

## Verification matrix

Authorization:

- Signed-out and non-leader users cannot render or mutate any route.
- Each Server Action performs its own leader check.
- Direct Supabase calls remain constrained by RLS.

Church:

- Zero, one, and invalid-multiple Church states behave as specified.
- Create and edit validate names and slug collisions.
- Delete succeeds only for an empty Church with exact confirmation.
- Dependency-blocked delete preserves all data.

Ministry hierarchy:

- CRUD succeeds for valid records.
- Cross-parent route or form tampering fails.
- Duplicate names/slugs in the protected scope return localized conflict feedback.
- Invalid date ranges fail on client, server, and database boundaries.
- Structural delete cannot erase dependent historical data.
- Date status is correct at boundary days in `Asia/Ho_Chi_Minh`.

URL state and collections:

- Search waits 300 ms before server refresh.
- Enter and clear can apply immediately.
- Filters, sort, page size, and page survive reload and sharing.
- Filter changes reset the page.
- Out-of-range pages resolve to a valid state without an empty navigation trap.
- Server result size never exceeds page size.
- Stable ordering prevents duplicate or skipped rows across pages.

Responsive UI:

- Verify 320, 375, 390, 768, 1024, and 1440 px widths.
- Mobile uses cards and bottom drawers.
- Desktop uses readable tables and appropriate edit surfaces.
- Inputs and combobox text are at least 16 px on mobile.
- Dropdown search appears at five items and is absent below five.
- Keyboard, focus, labels, errors, dark theme, reduced motion, and 44 px touch targets pass review.
- No horizontal overflow or excessive hidden DOM appears.

Swipe actions:

- A deliberate left swipe below 40 percent of the rail snaps closed; a qualifying displacement or velocity snaps fully open.
- Rightward swiping closes the rail and never reveals actions on the leading edge.
- Full swipe never edits, deletes, navigates, or submits a mutation.
- Vertical scrolling wins over diagonal movement and remains smooth at 320, 375, and 390 px widths.
- Links, inputs, buttons, and menus inside an item remain usable and do not begin a drag.
- A completed drag suppresses the accidental click that would otherwise follow pointer release.
- Only one item can remain open, and it closes on outside tap, scroll, Escape, query/sort/filter/page/section change, editor opening, delete confirmation, navigation, and desktop breakpoint transition.
- Edit from both swipe rail and `More` opens the same editor. Delete from both paths opens the same confirmation and never directly mutates.
- Keyboard and screen-reader users can reach every enabled action through the `More` menu without performing a swipe. Focus is visible, closed rails have no focusable descendants, and focus returns predictably when a menu or rail closes.
- Reduced-motion mode settles immediately without transform animation. Light and dark action colors meet contrast requirements and do not communicate meaning through color alone.
- At page size 100, the collection mounts one item surface per record, only one active action rail, and no duplicate hidden mobile/desktop collection. Dragging does not cause full-list React rerenders on every pointer-move frame.
- Verify touch behavior on iOS Safari and Android Chrome when available. At minimum, verify Chromium touch emulation and document any physical-device coverage that was not performed rather than claiming it passed.

States:

- Loading skeleton, empty, filtered empty, error, pending, success, conflict, not found, delete blocked, and delete confirmed are covered.
- Raw database errors and private details never reach product copy.

Repository:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`
- `pnpm build`

## Completion and handoff

The coding agent records separate evidence for 03A and 03B. It must not begin Member management. This plan is complete only after both checkpoints pass independent review with no blocking or high findings and the master implementation plan is updated by the planning/review agent.

## Implementation references

- shadcn/ui components: `https://ui.shadcn.com/docs/components`
- shadcn/ui Drawer: `https://ui.shadcn.com/docs/components/radix/drawer`
- nuqs Next.js adapter: `https://nuqs.dev/docs/adapters`
- nuqs URL update and debounce options: `https://nuqs.dev/docs/options`

The coding agent must verify APIs against the installed package versions before implementation.
