# Plan and review workflow

## Roles

Planning agent:

- Maintains scope, decisions, dependencies, acceptance criteria, and the next implementation slice.
- Does not implement feature code.
- Updates the plan when reviewed evidence changes a requirement.

Coding agent:

- Implements only the approved slice.
- Records changed files, migrations, assumptions, and verification evidence.
- Does not expand product scope without a plan update.

Review agent:

- Reviews the diff, runtime behavior, database behavior, authorization, privacy, mobile UX, accessibility, and verification evidence.
- Reports findings without silently changing code.
- Assigns severity and gives a reproducible path or exact evidence.

## Loop

1. Planning agent marks one slice ready and confirms its acceptance criteria.
2. Coding agent implements the slice and runs the required quality gate.
3. Coding agent appends an implementation entry to `docs/reviews/REVIEW_LOG.md`.
4. Review agent inspects the implementation and appends findings to the same log.
5. Planning agent converts accepted findings into a bounded revision plan.
6. Coding agent resolves the revision plan.
7. Review repeats until no blocking or high-severity findings remain.
8. Planning agent marks the slice complete and opens the next slice.

## Finding severity

- Blocking: data exposure, authorization bypass, destructive migration risk, broken build, or missing core acceptance criterion.
- High: incorrect primary workflow, cross-tenant or cross-term integrity failure, private data exposure risk, or unusable mobile interaction.
- Medium: recoverable functional defect, accessibility failure, inconsistent state, performance issue, or incomplete error handling.
- Low: maintainability, copy, visual polish, or non-blocking consistency issue.

## Review evidence

A useful finding contains:

- Severity
- File and line or database object
- Observed behavior
- Expected behavior
- Reproduction or query evidence
- Recommended outcome, without prescribing unnecessary implementation details

## Completion rule

A slice is complete only when:

- Acceptance criteria are met.
- Required commands pass.
- Blocking and high findings are closed.
- Medium findings are closed or explicitly scheduled with a reason.
- Documentation and generated types match the implementation.
- The review log contains current evidence.

## Plan retirement

After a slice passes review:

1. Move durable decisions into the canonical architecture, database, security, design, or ADR document.
2. Add one compact completion entry containing the result, commit, verification, and remaining findings to the implementation history.
3. Remove detailed closed findings from the active review surface after their outcome is summarized.
4. Delete the completed detailed plan from the working tree. Git history is the archive; do not create `old`, `final`, `v2`, backup, or permanent plan-archive copies.
5. Update `docs/NEXT_AGENT_TASK.md` to list the next plan and its minimal required-reading set.
6. Remove stale links and confirm no active document references the retired file.

A file is ready for removal only when its durable value has been transferred, no active task depends on it, no code imports it, no live document links to it, and Git history can recover it.

Before committing plan retirement, use `rg` to check stale references, inspect Git status for temporary files, and run the repository quality gate.
