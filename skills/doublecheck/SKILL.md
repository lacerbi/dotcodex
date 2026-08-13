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
- If the working tree is clean and the target is committed work, identify the appropriate base and
  inspect the commit or branch diff.
- Distinguish changes made in the current task from unrelated user or agent changes. Do not modify,
  revert, stage, or claim ownership of unrelated work.

For non-Git work, inspect the relevant artifacts and available before/after evidence directly.

Treat verification as read-only unless the user or calling workflow explicitly authorizes fixes.
Normal read-only diagnostics and in-scope test commands are allowed.

## Require independent strong review

Use one or more separate, strong, judgment-capable agents by default. Select the reviewer count
from the work's risk, breadth, and separable concerns: one strong reviewer can cover a tightly
scoped substantive change, while two or three are normal for broader or cross-cutting work.
Invoking this skill, or a workflow requiring it, authorizes that delegation; do not ask for
separate permission merely to start the reviewers. Inspect the current `spawn_agent` tool contract
and select its strongest judgment-oriented model option (currently Sol). Treat model names as
discoverable capabilities, not permanent identifiers. When the contract exposes these effort
levels, use `high` for ordinary double-checks and `xhigh` for particularly hard reviews. Never use
`max`, `ultra`, or another effort tier above `xhigh`; those tiers exceed this workflow's token
budget. If the strongest model option is unavailable, use the strongest judgment-capable fallback
exposed by the tool and disclose the fallback in the final report.

Self-review is allowed only when at least one of these conditions clearly applies:

1. The change or proposed work is minor or trivial.
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

- Start a fresh or minimally forked reviewer when possible.
- Give it the original requirements and raw evidence: relevant files, diffs, test output, logs, or
  traces. Do not lead with the implementer's conclusions, suspected defects, or intended verdict.
- Make the review read-only unless fixes are separately authorized.
- Give multiple reviewers distinct verification tracks or perspectives instead of duplicating one
  generic prompt. Keep heavyweight commands centralized when duplicate runs would be costly or
  interfere with one another.
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
where relevant, verification, and documentation impact.

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
