# Task workflow

Use this lightweight workflow for the next milestones:

1. Put one short, self-contained brief in `docs/NEXT_AGENT_TASK.md` and get explicit authorization.
2. Implement only that brief and run the relevant automated checks.
3. Ask one independent review agent to report reproducible findings; fix blocking/high findings.
4. Commit the accepted result and record one compact outcome in `docs/reviews/REVIEW_LOG.md`.

Create a separate design document only for a new schema, security boundary, external integration, or unresolved product decision. Do not repeat a full brainstorm, exhaustive authorization inventory, or production-like matrix for a bounded feature.

Hosted changes, secrets, real invitations, push, and deployment always require explicit user authorization. Git history is the archive; delete completed temporary plans and reset `docs/NEXT_AGENT_TASK.md` before starting the next milestone.

Git history is the archive. Never keep completed, old, final, backup, or versioned plan copies in the working tree.

Severity:

- Blocking: exposure, authorization bypass, destructive data risk, broken build, or missing core workflow.
- High: incorrect primary behavior, integrity failure, privacy risk, or unusable mobile interaction.
- Medium: recoverable defect, accessibility issue, inconsistent state, performance issue, or incomplete error handling.
- Low: maintainability, copy, or visual polish.
