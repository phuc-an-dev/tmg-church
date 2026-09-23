---
name: ponytail-audit
description: Whole-repo audit for over-engineering and bloat. Scans the codebase for unused abstractions, reimplemented helpers, or unnecessary dependencies.
---

# Ponytail Audit

Repo-wide audit for over-engineering and bloat. Scan codebase, rank findings by biggest lines cut first.

## Hunt
- Unused abstractions, single-caller wrappers, premature factories/interfaces.
- Reimplemented logic that existing npm dependencies or standard APIs provide.
- Dead files, unused utility functions, speculative code.
- Dependencies in `package.json` that are barely used or replaceable by native features.

## Output
One line per finding, ranked: `<tag> <what to cut>. <replacement>. [path]`
End with: `net: -<N> lines, -<M> deps possible.`
If lean: `Lean already. Ship.`

## Precedence Note
Always respect TMG Church non-negotiable rules: required mobile UX patterns, Server Actions structure, and Supabase RLS are not bloat.
