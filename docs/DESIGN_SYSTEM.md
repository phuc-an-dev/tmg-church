# Design system

## Direction

The interface is professional, modern, and operational. It uses a neutral off-white canvas, white surfaces, restrained depth, and sky blue only as the primary action color. The default theme is light. Dark mode uses near-black neutral surfaces with equivalent contrast.

The approved brand mark is the cross-and-flame image in `public/images/tmg-church-mark-concept-v1.png`. It is used with the `BrandLockup` component; interface controls still use Lucide icons.

## Visual foundation

Use the following shared primitives. Do not recreate their visual treatment with page-local colors, shadows, blur values, or gradients.

- `admin-canvas`: page-level neutral off-white canvas. It must not appear blue.
- `admin-panel`: white content surface with a subtle border, medium radius, and low-depth shadow.
- `admin-panel-strong`: higher-emphasis white surface for onboarding, forms, and primary summaries.
- `admin-surface`: compact inner metric, account, or filter surface with minimal depth.
- `admin-nav-chip`: desktop horizontal navigation item with a solid-blue active state, controlled by `data-active`.
- `mobile-admin-dock`: elevated mobile safe-area navigation dock. It is mounted once by the protected admin layout.

The visual treatment uses opaque surfaces, a subtle one-pixel border, no backdrop blur, no decorative gradients, and carefully limited shadows. Primary panels use 16px corners; controls and inner surfaces use 10–12px corners. Avoid nested elevated cards: use spacing, dividers, or one quiet inner surface instead.

## Navigation

The header surface is white in light mode. Desktop uses a compact brand row followed by pill navigation with a solid-blue active item. Mobile uses only the shared elevated bottom dock for primary destinations; do not duplicate those links in a sidebar or sheet. The header exposes one avatar menu containing the signed-in account, light/dark/system theme selection, and sign-out action. Protected page content reserves bottom space for the dock.

Keep the routine entity edit action visible as a labeled primary control in the entity card header. Do not expose deletion on the read-only card surface or inside the routine edit surface. Church deletion lives on the dedicated `/admin/church/advanced` route, reached through the page-header More menu, and retains the explicit confirmation step. Keep dependency or deletion eligibility explanations in the card footer.

When a new primary admin route is implemented, add it once to both the desktop header and mobile dock navigation definitions. Do not add placeholder destinations.

## Accent color policy

Sky blue is the only brand primary. Cyan, amber, and rose are semantic accents for contextual data or status; they must not replace primary actions or encode a state without text and icon support.

## Content

Product copy is English. Keep labels direct, natural, and operational. Developer identifiers, documentation, and code stay English.

Example terms:

- `Church Settings`
- `Ministries`
- `Terms`
- `Member groups`
- `Departments`
- `Members`
- `Archived`
- `Restore`

## Responsive collection pattern

Mobile:

- Render one compact card per entity.
- Keep the primary action reachable near the bottom edge or header.
- Open create, edit, detail, and filters in a bottom drawer.
- Mount only the active drawer content.
- Use the shared expandable action item for routine list actions. Opening an item on mobile reveals labeled Edit and Delete actions below the unchanged identity content; it never executes them automatically.
- Every mobile item exposes an explicit 44 by 44 px Lucide `Ellipsis` action button with `aria-expanded` and `aria-controls` as the primary action path.
- Permit only one open action section. Close it on another interaction, outside tap, scrolling, Escape, collection-state changes, navigation, or editor/confirmation opening.

Desktop:

- Render a data table with explicit columns and row actions.
- Use a dialog or side panel for focused editing when it improves context.
- Do not render a second complete collection merely to hide it by CSS at another breakpoint.
- Use one `More` action menu per row instead of persistent inline Edit and Delete buttons. Desktop does not require double tap or drag interaction.

Shared expandable action behavior:

- Implement expandable mechanics once in the shared component `src/components/shared/expandable-action-item.tsx`. Entity pages provide actions but do not copy pointer handlers, thresholds, animation state, or open-item coordination.
- The item identity content never moves horizontally. The expanded card increases in height to reveal a divider and a two-column grid with equal-width Edit (`Pencil` icon, neutral outline) and Delete (`Trash2` icon, soft destructive) buttons with minimum 44×44 px touch targets.
- Actions are toggled exclusively through the explicit 44×44 px action button. No double-tap shortcut or gesture recognition is used, keeping native card tap and scroll behavior completely unmodified.
- Do not disable text selection or show a pointer cursor on the entire card.
- Respect reduced motion, avoiding layout-heavy animation or backdrop blur.
- Only the active item's action section is mounted. Closed items leave no hidden focusable controls in the tab order or accessibility tree.
- Desktop tables keep semantic table presentation with one accessible `More` action menu per row instead of persistent inline Edit and Delete buttons.
- Both mobile expanded actions and desktop menu use the same handlers, authorization rules, dependency restrictions, editor, and deletion confirmation.

## Forms

- Use `input`, `textarea`, and combobox text at 16 px or larger on mobile.
- Primary entity fields use a 48px control height and 18px text when the surrounding form typography is large.
- Keep native browser pinch zoom enabled.
- Labels remain visible; placeholders do not replace labels.
- Use field-level English validation messages.
- Use a custom dropdown for fewer than five options.
- Use a searchable shadcn combobox for five or more options.
- A search box that causes server work debounces by 300 ms.
- Pending state must prevent duplicate submission and preserve the form.
- Responsive editor footers use an equal two-column Cancel/Submit layout on mobile and desktop.
- Mobile responsive editors preserve at least 40 px of visual separation between the final form control and the sticky action footer.
- Authentication forms stay minimal because the shared header already communicates the administration context. Avoid repeating access labels, explanatory copy, or authorization disclaimers around a simple sign-in form.
- Authentication field labels and controls use an explicit 12 px flex gap; do not rely on vertical margins applied to inline labels.
- Authentication form panels use a dedicated inner content wrapper with 24 px mobile padding and 32 px desktop padding. Do not apply padding directly to `admin-panel-strong`, whose shared panel geometry intentionally controls block padding.
- Position the sign-in panel slightly above the exact viewport center while keeping short viewports scrollable.

## Dates and metadata

- Show paired created and updated metadata on one compact row when there are exactly two values.
- Use the numeric `yyyy-MM-dd, HH:mm` format in the `Asia/Ho_Chi_Minh` time zone, for example `2026-09-12, 13:32`.
- Render machine-readable timestamps with the semantic `time` element.

## Feedback

- Show successful mutations in the shared compact status toast centered at the top of the viewport.
- Success toasts dismiss automatically, animate both entry and exit, and must use a polite live region without changing page layout.
- Keep field validation and recoverable form errors next to the action that needs correction.

The 16 px rule addresses the widely reproduced iOS WebKit behavior where focusing smaller form text can trigger automatic page zoom. It also improves legibility. Do not work around the behavior with restrictive viewport settings.

## Icons

- Import icons from `lucide-react`.
- Use a consistent default size of 16 or 18 px inside controls.
- Decorative icons use `aria-hidden="true"`.
- Icon-only buttons require an English accessible name and tooltip when the action is not obvious.
- Destructive actions use clear text in confirmation surfaces.

## Theme tokens

Use semantic variables rather than direct colors in components:

- `background`, `foreground`
- `card`, `card-foreground`
- `primary`, `primary-foreground`
- `secondary`, `secondary-foreground`
- `muted`, `muted-foreground`
- `destructive`
- `border`, `input`, `ring`

Set `primary`, focus ring, active navigation, and interactive emphasis to an accessible blue in both themes. Keep data/status colors separate from the brand primary.

## States

Every collection and form flow needs:

- Loading skeleton
- Empty state
- Filtered empty state
- Permission denied state where applicable
- Recoverable error state with retry
- Mutation pending state
- Success feedback
- Archive confirmation and restore feedback

## Accessibility

- Use semantic headings in order.
- Ensure all interaction works by keyboard.
- Preserve visible focus indication.
- Target at least 44 by 44 px for primary touch controls.
- Do not communicate state using color alone.
- Respect reduced motion.
- Verify light and dark contrast.
