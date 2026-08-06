---
name: doublecheck
description: Deeply verify completed or proposed work for correctness, completeness, consistency, and regressions. Use when the user invokes $doublecheck, asks for a final verification pass, or when another workflow requires independent review before completion.
---

# Double-check

## Establish the verification scope

Derive the scope and any focus area from the current user request and conversation. Re-read the
original requirements and the files that govern the work; do not rely only on conversation
summaries or prior claims.

When the work is in Git:

- Inspect `git status --short`, the unstaged diff, and the staged diff.
- If the working tree is clean and the target is committed work, identify the appropriate base and
  inspect the commit or branch diff.
- Distinguish changes made in the current task from unrelated user or agent changes. Do not modify,
  revert, stage, or claim ownership of unrelated work.

For non-Git work, inspect the relevant artifacts and available before/after evidence directly.

Treat verification as read-only unless the user or calling workflow explicitly authorizes fixes.
Normal read-only diagnostics and in-scope test commands are allowed.

## Verify the work

Check that:

- Every stated requirement is addressed.
- The implementation or document is correct and internally coherent.
- Necessary companion changes, tests, documentation, and configuration are present.
- The changes preserve existing behavior outside the intended scope.
- Verification matches the risk and the project's instructions.

Do not infer that a command passed. Run the relevant checks when feasible, record exactly what ran,
and distinguish failures caused by the change from environment or dependency failures.

## Review deeply

Evaluate:

- **Completeness**: Missing scenarios, implicit requirements, unhandled states, or unfinished work.
- **Correctness**: Logic errors, flawed assumptions, inaccurate prose, and boundary conditions.
- **Consistency**: Alignment with the request, design decisions, APIs, and repository conventions.
- **Structural integrity**: Unclear boundaries, unnecessary coupling, and organization that will be
  difficult to maintain.
- **Consolidation**: Duplicated logic or prose, parallel structures, and abstractions that should be
  shared. Report these; do not refactor during a read-only review.
- **Hazard avoidance**: Brittle assumptions, ambiguous naming, hidden dependencies, concurrency
  risks, and information likely to drift.

Explore enough surrounding code and documentation to identify downstream consequences. For code,
check error handling, security, performance, API impact, test coverage, and documentation as
applicable. For plans and design documents, check feasibility, sequencing, prerequisites, rollback
where relevant, verification, and documentation impact.

## Coordinate optional independent review

For large or cross-cutting work, use `spawn_agent` only when distinct, bounded verification tracks
can run independently and current collaboration constraints allow it. Follow the repository's
`AGENTS.md`. Give subagents raw artifacts and requirements rather than your conclusions, keep
heavyweight commands in one place, and verify their findings yourself before reporting them.

## Report

Lead with findings ordered by severity. For each finding, give concrete evidence with clickable
file and line references where available, explain the impact, and recommend a correction. Separate
confirmed defects from questions, assumptions, and optional improvements.

Then report:

- Requirements or areas checked
- Commands run and their outcomes
- Any checks not run and why
- Residual risks

If no findings remain, say so explicitly. Do not manufacture minor issues to fill the report.
Remain thorough but concise and avoid stylistic preferences without a concrete consequence.
