# Task workflow

1. A planning agent writes one self-contained brief in `docs/NEXT_AGENT_TASK.md`. Link extra context only when essential.
2. A coding agent implements only that brief and runs the required technical and manual checks.
3. A review agent reports reproducible findings without editing code.
4. Repeat until no blocking or high findings remain and every medium finding is resolved or explicitly scheduled.
5. Record one compact accepted outcome in `docs/reviews/REVIEW_LOG.md`.
6. Move durable decisions into canonical documentation, delete the completed detailed plan, and reset the next-task brief to waiting.

Git history is the archive. Never keep completed, old, final, backup, or versioned plan copies in the working tree.

Severity:

- Blocking: exposure, authorization bypass, destructive data risk, broken build, or missing core workflow.
- High: incorrect primary behavior, integrity failure, privacy risk, or unusable mobile interaction.
- Medium: recoverable defect, accessibility issue, inconsistent state, performance issue, or incomplete error handling.
- Low: maintainability, copy, or visual polish.
