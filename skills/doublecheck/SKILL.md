---
name: doublecheck
description: Independently verify completed or proposed work for correctness, completeness, consistency, and regressions using strong external review by default. Use when the user invokes $doublecheck, asks for a final verification pass, or when another workflow requires independent review before completion.
---

# Double-check

## Establish the verification scope

Derive the scope and any focus area from the current user request and conversation. Re-read the
original requirements and the files that govern the work; do not rely only on conversation
summaries or prior claims.

When the work is in Git:

- Inspect `git status --short`, the unstaged diff, and the staged diff.
- If relevant work was committed, identify the appropriate base and inspect the commit or branch
  diff as well, even when the working tree also has changes.
- Read targeted untracked files directly; they are absent from ordinary Git diffs. If output is
  truncated, retrieve the omitted content in bounded chunks or inspect the affected files directly.
- Distinguish changes made in the current task from unrelated user or agent changes. Do not modify,
  revert, stage, or claim ownership of unrelated work.

For non-Git work, inspect the relevant artifacts and available before/after evidence directly.

Treat verification as read-only unless the user or calling workflow explicitly authorizes fixes.
Normal read-only diagnostics and in-scope test commands are allowed.

## Require independent strong review

Use separate, fresh-context reviewers by default, choosing models and efforts by Agent Selection
in the global `AGENTS.md` and matching them to the work's judgment and technical demands. Select
their count from the risk, breadth and separable concerns: one may cover a tightly scoped
substantive change, while two or three may cover broader work. When project instructions, or the
plan or workflow that invoked this review, name the reviewers, run those.

Invoking this skill, or a workflow requiring it, authorizes delegation subject to higher-priority
collaboration constraints: do not ask separately to start reviewers. Inspect the current
`spawn_agent` contract and explicitly select supported model identifiers and efforts. If the
intended reviewer is unavailable, use an available judgment-capable fallback under the global
policy and disclose it; do not substitute a lightweight model for substantive review.

Self-review is allowed only when at least one of these conditions clearly applies:

1. The change or proposed work is so small that a separate reviewer would add no useful scrutiny.
2. Most of the evidence is already in the current conversation, and the review chiefly checks
   whether a small artifact faithfully records that discussion, such as confirming that a log or
   summary entry matches decisions made with the user.

If the classification is uncertain, use an external reviewer. When using a self-review exception,
state which exception applies in the final report. Do not present a self-review as an independent
review.

If a strong external agent is unavailable or prohibited by higher-priority instructions, perform
useful local checks but report that the independent double-check is incomplete. Do not silently
downgrade to a weaker agent or treat the primary agent's rereading as equivalent.

Keep external review independent:

- Start with `fork_turns="none"` when available. Brief the reviewer explicitly; it should not
  inherit the implementer's conversation or conclusions.
- Give it the original requirements and raw evidence: relevant files, diffs, test output, logs, or
  traces. Include its exact scope, the finding criteria below, and the report format. Do not lead
  with the implementer's conclusions, suspected defects, or intended verdict.
- Make the review read-only unless fixes are separately authorized.
- Give multiple reviewers distinct verification tracks or perspectives instead of duplicating one
  generic prompt. Follow the global one-heavy-compute-agent rule: normally the primary agent runs
  tests or builds, and reviewers are explicitly instructed to use static analysis without heavy
  processes.
- Have the primary agent inspect the evidence behind reported findings and reconcile disagreements.
  This validation does not replace the independent pass.

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
where relevant, verification, documentation impact, and whether each phase has enough detail for
its executor, including acceptance checks and the concrete steps its uncertainty or risk warrants
(always concrete steps for a Sol phase).

## What counts as a finding

Report evidence-backed issues affecting correctness, stated requirements, coherence, or future
maintainability, including minor but real issues. Style counts when it is part of the requirements,
a project convention, or the requested focus; otherwise omit personal preferences. Exclude
speculative or unverifiable claims. Reviewers should apply this standard before reporting, with a
location and confidence (high, medium, or low) for each finding.

## Report

Lead with findings grouped by severity: **must fix** for correctness, requirement, or integrity
failures; **should fix** for real non-blocking gaps or risks; **optional** for worthwhile improvements.
For each finding, give concrete evidence with clickable file and line references where available,
confidence, the impact, and a recommended correction. Separate confirmed defects from questions
and assumptions.

Then report:

- Requirements or areas checked
- Commands run and their outcomes
- Any checks not run and why
- Residual risks

If no findings remain, say so explicitly. Do not manufacture minor issues to fill the report.
Remain thorough but concise and avoid stylistic preferences without a concrete consequence.
