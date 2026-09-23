---
name: ponytail-review
description: Code review focused exclusively on hunting over-engineering and bloat. Finds what to delete, simplify, or replace with existing utilities or stdlib.
---

# Ponytail Review

Review diffs exclusively for unnecessary complexity and bloat. The diff's best outcome is getting shorter.

## Format
`L<line>: <tag> <what>. <replacement>.`, or `<file>:L<line>: ...` for multi-file diffs.

### Tags:
- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled logic that standard JS/TS or Web APIs provide.
- `reuse:` reimplemented logic that already exists in the project utils/components.
- `yagni:` premature abstraction, single-use helper, unnecessary wrapper.
- `shrink:` same logic in fewer, clearer lines.

## Scoring
End with: `net: -<N> lines possible.`
If nothing to cut: `Lean already. Ship.`

## Precedence Note
Do not flag established TMG Church patterns as bloat (e.g. `DestructiveActionButton`, Zod schemas, drawer mobile wrappers, and required security checks are intentional and mandatory).
