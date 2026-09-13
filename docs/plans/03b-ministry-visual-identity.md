# Plan 03B Extension: Ministry Visual Identity

Status: implemented; awaiting independent review

Parent checkpoint: `03B — Ministry structure`

## Objective

Add a controlled accent color and Lucide icon to each Ministry so leaders can visually distinguish ministries in the administration collection and nested context. Preserve the accepted Ministry hierarchy, slug behavior, authorization model, responsive editor contract, and collection behavior.

This document is a plan only. It does not authorize implementation and does not advance `docs/NEXT_AGENT_TASK.md`.

## Scope

Included:

- One accent color per Ministry
- One icon per Ministry
- Defaults for existing and newly created Ministries
- Color and icon controls in the shared Ministry create/edit form
- Ministry identity treatment in mobile cards, the desktop table, and nested Ministry/Term context
- Database constraints, generated types, server validation, mutation support, and verification

Excluded:

- Colors or icons for Church, Terms, Groups, or Departments
- User-uploaded SVG, image, or icon files
- Arbitrary CSS values, gradients, or remote icon URLs
- Changes to Ministry slugs, parent relationships, deletion rules, or term behavior
- Public directory changes unless a later authorized plan explicitly exposes Ministry visual identity

## Product decisions

1. Store `accent_color` as a normalized lowercase six-digit hex value, including the leading `#`.
2. Store `icon_key` as a stable application key from an explicit Lucide registry. Never store JSX, an import path, or arbitrary component source.
3. Existing Ministries receive `#3b82f6` and `layers-3` during migration. New Ministries use the same defaults until the leader selects another value.
4. Names remain the primary identity. Color and icon are supplementary and must never be the only way a Ministry is identified.
5. The editor exposes a curated color palette plus an explicit custom-color control. Custom values are accepted only after normalization and hex validation.
6. The icon picker uses a searchable, keyboard-operable grid because it contains five or more choices. It follows the visual reference while satisfying the searchable-selection contract.
7. All icons come from `lucide-react`. No emoji or additional icon library is allowed.
8. The selected color may tint only the icon tile, quiet border, and small identity accents. Primary actions remain the product blue and destructive actions remain semantic red.
9. A live preview appears in the editor so the leader can confirm the name, color, and icon combination before saving.
10. Only the currently open editor and icon picker are mounted.

## Data model and migration

Add one migration after the accepted schema migrations:

```sql
alter table public.ministry
  add column accent_color text not null default '#3b82f6',
  add column icon_key text not null default 'layers-3';

alter table public.ministry
  add constraint ministry_accent_color_check
    check (accent_color ~ '^#[0-9a-f]{6}$'),
  add constraint ministry_icon_key_check
    check (icon_key in (
      'layers-3',
      'church',
      'cross',
      'users',
      'user-round',
      'user-round-check',
      'user-round-plus',
      'handshake',
      'heart',
      'sparkles',
      'smile',
      'party-popper',
      'gamepad-2',
      'dice-5',
      'briefcase-business',
      'trending-up',
      'chart-no-axes-column-increasing',
      'target',
      'award',
      'trophy',
      'lightbulb',
      'book-open',
      'graduation-cap',
      'compass',
      'globe-2',
      'flame',
      'leaf',
      'sun',
      'moon',
      'cloud',
      'zap',
      'music-2',
      'microphone-2',
      'baby'
    ));
```

Migration requirements:

- Apply through a clean local Supabase workflow only.
- Preserve and restore the current local Church, leader, and Ministry state required for review.
- Verify defaults are applied to existing rows.
- Do not modify RLS policies; the new fields remain protected by the existing Ministry policies.
- Regenerate `src/types/database.ts` from the local schema.
- Run `npx supabase db lint` after applying the migration.

## Application contracts

Create `src/features/ministry/visual-identity.ts` as the single shared registry.

It contains:

- `DEFAULT_MINISTRY_COLOR`
- `DEFAULT_MINISTRY_ICON_KEY`
- `MINISTRY_COLOR_OPTIONS`
- `MINISTRY_ICON_OPTIONS`
- `MinistryIconKey`
- A static `Record<MinistryIconKey, LucideIcon>` mapping with explicit imports
- Human-readable English labels and search keywords for every icon

Do not dynamically import icons from a user-provided key and do not import the complete Lucide namespace. The registry must keep the client bundle bounded and make an invalid stored key fall back to `layers-3`.

Recommended curated color palette:

| Label   | Value     |
| ------- | --------- |
| Blue    | `#3b82f6` |
| Cyan    | `#06b6d4` |
| Emerald | `#10b981` |
| Lime    | `#84cc16` |
| Amber   | `#f59e0b` |
| Orange  | `#f97316` |
| Red     | `#ef4444` |
| Rose    | `#f43f5e` |
| Pink    | `#ec4899` |
| Violet  | `#8b5cf6` |
| Indigo  | `#6366f1` |
| Teal    | `#14b8a6` |
| Slate   | `#64748b` |
| Stone   | `#78716c` |

Zod behavior:

- `accentColor` is required after defaults are applied.
- Trim and lowercase before validation.
- Accept only `/^#[0-9a-f]{6}$/`.
- `iconKey` must be one of the registry keys.
- Create and update use the same visual-identity schema fragment.
- Return field errors for invalid color and icon values; never return raw database constraint messages.

Query and view-model behavior:

- Select `accent_color` and `icon_key` explicitly in Ministry collection and context queries.
- Expose them as `accentColor` and `iconKey` in `MinistryItem` and `MinistryContext`.
- Do not add secondary queries or create an N+1 pattern.
- Treat an impossible invalid stored key as the default icon at the presentation boundary.

Mutation behavior:

- `saveMinistryAction` validates both fields with Zod.
- Create writes the selected values or documented defaults.
- Update verifies the Ministry belongs to the active Church before writing the selected values.
- Name-only edits preserve the stored visual identity.
- Slug stability, collision handling, revalidation paths, structured action results, and safe error messages remain unchanged.

## Editor design

Place visual identity between `Name` and `Advanced link settings` in the existing shared Ministry form.

### Color control

- Visible label: `Ministry color`
- Render the curated palette as an accessible radio group of circular swatches.
- Selected swatch has a high-contrast outer ring and one Lucide `Check` icon.
- Each swatch has an accessible English color label and at least a 44 by 44 px touch target.
- A final `Custom color` button opens a compact inline hex field and native color input; it does not open another full-screen editor.
- The custom field is 16 px on mobile and displays validation next to the field.
- Never inject the value into a class name. Pass the validated value through a CSS custom property.

### Icon control

- Visible label: `Ministry icon`
- Add a 16 px search input above the icon grid with placeholder `Search icons`.
- Render filtered results in a responsive grid: five columns at 320 px, six columns when space permits.
- Each icon button is at least 44 by 44 px and includes an accessible English name.
- Selected icon uses the Ministry accent color, a visible border, and `aria-pressed="true"`.
- Keep the grid in a bounded scroll region so the sticky editor footer remains visible.
- Show the chosen icon name below the grid.
- If search has no results, show `No icons match this search.` and keep the prior selection.
- Support arrow-key navigation within the grid, Enter/Space selection, Escape from the search field, and visible focus.

### Live preview

- Show one compact preview using the current form name, color, and icon.
- The preview is not a second editable form and has no actions.
- User-entered Ministry names are displayed verbatim.
- In dark mode, derive only quiet tint surfaces with `color-mix`; keep text on semantic foreground tokens.

## Collection and context design

Mobile Ministry card:

- Replace the fixed `Layers3` tile with the selected registry icon.
- Use the Ministry accent color for the icon stroke, a subtle tile tint, and a restrained border accent.
- Keep name, slug, term count, Edit, and Delete behavior unchanged.
- Do not tint the entire card or action buttons.

Desktop Ministry table:

- Add the icon tile inside the existing Name cell instead of adding another column.
- Keep the table compact and preserve stable server pagination.

Nested pages:

- Include the Ministry icon and accent in the compact Ministry context header on the Terms page and Term detail page.
- Terms, Groups, and Departments do not receive independent visual identity fields.

Use a validated CSS custom property such as `--ministry-accent` for visual treatment. Derived tint and border colors should use `color-mix` with existing semantic surfaces. Verify light and dark themes; never assume a hex color is readable as text on white or black.

## Expected file changes

- `supabase/migrations/<timestamp>_ministry_visual_identity.sql`
- `src/types/database.ts`
- `src/features/ministry/visual-identity.ts`
- `src/features/ministry/schemas.ts`
- `src/features/ministry/types.ts`
- `src/features/ministry/queries.ts`
- `src/features/ministry/actions.ts`
- `src/features/ministry/components/ministry-management.tsx`
- Optional focused components under `src/features/ministry/components/` when needed to keep the management component readable
- Ministry and Term context page components only where the new visual identity is rendered
- `docs/reviews/REVIEW_LOG.md` after implementation verification

Do not update `docs/NEXT_AGENT_TASK.md` or mark the extension accepted during implementation.

## Verification matrix

Database and security:

- Clean local migration succeeds and existing Ministries receive both defaults.
- Direct inserts and updates reject malformed colors and unsupported icon keys.
- Anonymous and authenticated non-leader writes remain blocked by RLS.
- Leader create and update succeed.
- No hosted Supabase project is modified.

Server behavior:

- Every private query and mutation still calls `requireLeader()`.
- Create persists the selected color and icon.
- Edit persists changes to either field.
- Name-only edits preserve color, icon, and slug.
- Cross-Church Ministry tampering still returns a safe not-found result.
- Invalid application payloads return stable validation errors.
- Collection query still uses one paginated request and no N+1 reads.

Interface behavior:

- Default values appear for existing Ministries.
- Color palette, custom color, icon search, selection, live preview, Cancel, and Save work in the mobile bottom sheet and desktop dialog.
- Exactly one selected color and one selected icon are announced.
- A single visible check appears on the selected color swatch.
- Icon search is case-insensitive and whitespace-normalized.
- Card and nested context update after save without a manual reload.
- No arbitrary color changes primary or destructive action semantics.

Responsive and accessibility:

- Verify 320, 375, 390, 768, 1024, and 1440 px widths.
- No horizontal overflow occurs in the palette, icon grid, editor, card, or table.
- Mobile inputs remain at least 16 px.
- Swatches and icon choices have at least 44 by 44 px touch targets.
- Keyboard-only selection, visible focus, screen-reader names, and reduced motion pass.
- Light and dark themes preserve foreground, selected-ring, and icon contrast.

Quality gate:

```bash
npx supabase db lint
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
git diff --check
```

Append concise, reproducible evidence to `docs/reviews/REVIEW_LOG.md` after implementation, leave changes uncommitted for independent review, and do not mark the plan accepted.
