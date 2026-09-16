# Superpowers Workflow Integration

This workspace has the **Superpowers** development framework enabled locally in `.agents/skills/`.

## Core Directives

1. **Skill First**: Before taking action or writing code, check `.agents/skills/` and invoke relevant skills (`superpowers:using-superpowers`, `superpowers:brainstorming`, `superpowers:systematic-debugging`, `superpowers:test-driven-development`).
2. **Brainstorming & Spec**:
   - For new features or non-trivial modifications, start with `superpowers:brainstorming`.
   - Document specifications and plans cleanly, keeping `docs/NEXT_AGENT_TASK.md` in sync.
3. **Approval Gates (Balanced)**:
   - Present the Design Spec and Implementation/Test Plan to the user.
   - Wait for explicit user confirmation before generating production code.
4. **Test-Driven Development (TDD)**:
   - Use Vitest (`pnpm test`) as the test runner.
   - Enforce the Red -> Green -> Refactor cycle:
     1. Write a failing test for the expected requirement.
     2. Verify that it fails (Red).
     3. Implement minimum required code to make test pass (Green).
     4. Refactor while keeping tests green.
5. **Git Discipline**:
   - Maintain clean atomic commits on the working branch as TDD phases pass.
6. **Task & Review Log**:
   - Keep `docs/NEXT_AGENT_TASK.md` updated with the active brief and record review completions in `docs/reviews/REVIEW_LOG.md`.
