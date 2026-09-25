# Ministry Term Executive Board

## Goal and decisions

An Executive Board is optional for each ministry term. A Master Admin enables it manually and selects only the roles used in that term. A selected role remains visible when its seat is vacant. One member may hold multiple roles, while each role has at most one holder. The initial release uses the existing administrative authorization; delegated role management is outside this design.

The fixed roles are `ministry_head`, `secretary`, `treasurer`, `social_support_commissioner`, `small_groups_commissioner`, `pastoral_commissioner`, `music_commissioner`, `worship_commissioner`, `visitation_care_commissioner`, and `evangelism_commissioner`. UI labels remain in English, following repository guidance.

## Approach

Add a nullable `executive_board_roles text[]` column to `ministry_term`. `NULL` means the board is disabled; a nonempty array means it is enabled and contains exactly the selected seats. Existing terms without assignments remain `NULL`. Terms with existing assignments are backfilled with their assigned roles, including closed terms, so current occupants remain visible; the migration must handle the closed-term update trigger explicitly and leave that trigger enabled afterward. Keep assignments in the existing `term_role_assignment` table. Do not infer enabled seats from assignments at runtime, because that cannot represent vacant seats.

A separate seat table would support future custom roles but would duplicate the existing assignment model. A global board flag on `ministry` would not support terms with different structures. The nullable term column is the smallest model that supports the agreed behavior.

Validate the selected role set in Zod and the database: only the ten fixed role codes, no duplicates, and at least one selected role while enabled. Database rules prevent assigning a role that is not selected, disabling the board or deselecting an occupied role, and modifying a closed term. A member holding a term role must be unassigned before their term membership can be removed, so assignment eligibility remains true after the initial write.

## Admin flow

Provide an Enable Executive Board action on the term detail page. Its drawer lists the ten roles as selectable option cards. Saving the selection shows the `Executive Board` tab; disabling the board hides the tab. An enabled board's tab has an Edit roles action. Deselecting an occupied role and disabling a board with occupants show an actionable error instructing the admin to unassign those seats first. No role assignments are deleted implicitly.

The tab renders selected roles in a stable order: Head, Secretary, Treasurer, then Commissioners. Each role card shows its label and either the assigned member using the existing shared `ExpandableActionItem` and `MemberAvatar` pattern or a vacant state using `EmptyState`. Assign and Replace open a searchable bottom drawer containing only members enrolled in that term. Remove uses `DestructiveActionButton` and confirmation. The desktop layout may use the existing responsive list pattern; the mobile layout uses cards, 44 px touch targets, and a sticky safe-area-aware drawer footer.

Closed terms retain the tab and assignments for history, with all board controls read-only. A disabled board never exposes a `?section=board` panel; direct navigation falls back to the normal term section.

## Data and server flow

The term detail query returns selected roles, current assignments, and enrolled members only when needed for the board panel. The search-param parser accepts `board`, while the page rejects that section for disabled terms and falls back to `members`. A dedicated server action validates and saves board configuration. Existing assign/remove actions remain the entry points for seat changes and return structured errors.

Change `assign_term_role` to atomically insert a vacant seat or update its occupant. The database continues to enforce one occupant per role, term enrollment, and closed-term immutability. The update path preserves the existing audit trigger. Mutations revalidate the term detail route. Role selection and assignment are checked against the same term on the server and in the database, rather than relying on UI filtering.

## Acceptance checks

- A term without a board has no board tab; enabling it with chosen roles reveals only those seats.
- Existing assigned roles appear as selected seats after migration, including on closed terms; unassigned legacy terms stay disabled.
- A selected vacant seat is visible and assignable; an unselected role cannot be assigned through the server action or RPC.
- A member may occupy two selected seats; a seat cannot have two occupants.
- Replacing an occupant succeeds atomically and preserves audit history; removing one seat does not alter the member's other seats.
- A role with an occupant cannot be deselected, and a board with occupants cannot be disabled.
- Only enrolled members can be assigned; a member with an assigned seat cannot be removed from the term before unassignment.
- A closed term remains readable and rejects configuration and assignment changes.
- Mobile controls follow the repository's card and bottom-drawer rules; existing term tabs and unrelated dirty work remain intact.

The implementation plan should verify the database invariants and affected UI behavior. Full repository quality commands run only when the user requests a commit, per `AGENTS.md`.
