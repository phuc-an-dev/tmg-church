# Design system

## Direction

The interface is calm, clear, and operational. It uses neutral white and black surfaces with blue as the primary action and focus color. The default theme is light. Dark mode uses true dark neutral surfaces without reducing contrast.

Until an official logo is supplied, use the Lucide `Church` icon with a text wordmark. Do not invent a permanent logo or use emoji.

## Content

Product copy is Vietnamese. Keep labels direct and familiar to church members. Developer identifiers and code stay English.

Example terms:

- `Hội Thánh`
- `Ban ngành`
- `Nhiệm kỳ`
- `Tổ`
- `Ban phụ trách`
- `Thành viên`
- `Đã lưu trữ`
- `Khôi phục`

## Responsive collection pattern

Mobile:

- Render one compact card per entity.
- Keep the primary action reachable near the bottom edge or header.
- Open create, edit, detail, and filters in a bottom drawer.
- Mount only the active drawer content.

Desktop:

- Render a data table with explicit columns and row actions.
- Use a dialog or side panel for focused editing when it improves context.
- Do not render a second complete collection merely to hide it by CSS at another breakpoint.

## Forms

- Use `input`, `textarea`, and combobox text at 16 px or larger on mobile.
- Keep native browser pinch zoom enabled.
- Labels remain visible; placeholders do not replace labels.
- Use field-level Vietnamese validation messages.
- Use a custom dropdown for fewer than five options.
- Use a searchable shadcn combobox for five or more options.
- A search box that causes server work debounces by 300 ms.
- Pending state must prevent duplicate submission and preserve the form.

The 16 px rule addresses the widely reproduced iOS WebKit behavior where focusing smaller form text can trigger automatic page zoom. It also improves legibility. Do not work around the behavior with restrictive viewport settings.

## Icons

- Import icons from `lucide-react`.
- Use a consistent default size of 16 or 18 px inside controls.
- Decorative icons use `aria-hidden="true"`.
- Icon-only buttons require a Vietnamese accessible name and tooltip when the action is not obvious.
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
