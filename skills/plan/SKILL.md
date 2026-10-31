---
name: plan
description: Explore a project and create a detailed, approval-gated implementation plan before making changes. Use when the user asks for a plan, invokes $plan, or wants investigation and planning without execution.
---
Plan the requested work before implementing it. Exploration includes diagnostic scripts, tests,
and bounded experiments that resolve real uncertainty; keep probes separate from implementation
and respect the current mode's write constraints. Begin implementation once the user approves the
plan, recognizing any approval or execution instructions already given in the conversation.

## Phase 1: Task Understanding

State your understanding of the task from the current user request and conversation.

If a material ambiguity cannot be resolved from local context, ask the user. In Codex Plan mode,
use `request_user_input` when available; otherwise ask a concise question directly.

**Assess complexity** to calibrate planning depth:
- **Simple**: Single-focus task, few components → lighter exploration, concise plan
- **Moderate**: Multiple components or unknowns → targeted exploration, structured plan
- **Complex**: Cross-cutting concerns, many dependencies → thorough exploration, detailed plan

## Phase 2: Exploration

Explore the project to understand what exists and what the task involves. Scale exploration to task complexity.

**For simple tasks**: You may explore directly without subagents.

**For moderate/complex tasks**: When subagents are available and parallel exploration will
materially improve the plan, use `spawn_agent` for concrete, bounded, independent investigations.
Choose only the relevant perspectives, such as:

- **Structure Explorer**: Project organization, key components, how things connect
- **Prior Work Explorer**: Existing similar work, patterns, or approaches to build on
- **Context Explorer**: Related materials, dependencies, constraints
- **Domain Explorer**: Subject matter, conventions, standards relevant to the task
- **Docs Explorer**: Documentation (READMEs, guides, API docs, comments) — what exists in or adjacent to the task area, what will need updating, and what doesn't exist yet but should

(For code-heavy tasks, architecture, feature, dependency, and test investigations may be more
appropriate.) Do not create a generic set of agents when direct exploration is sufficient. Follow
the repository's `AGENTS.md` and current collaboration constraints for delegation and model choice.

Instruct subagents to:
- Return hypotheses, not conclusions
- Provide full file paths for relevant files
- Identify locations, not deep analysis
- Be thorough but efficient — scouts, not implementers

## Phase 3: Synthesis

After exploration:
1. Read/verify key files and materials identified
2. Confirm or refute hypotheses
3. Build a mental model of the current state and what the task requires
4. Identify documentation that must be updated as part of the work, and whether any new document has a distinct durable purpose
5. Decide what the orchestrator will execute and what to delegate, following the global
   `AGENTS.md` model policy, and record that split in the plan

Before proposing a new document:
- Name its durable audience or question and the information it will own.
- Check whether that information already belongs in an existing plan, source comment, reference document, test, TODO, issue, or orientation artifact.
- Prefer updating the existing authoritative artifact when it can serve the same purpose.
- Do not create a journal, completion report, devlog, changelog, or summary merely to restate the plan or record work performed. An archived plan may itself be the durable design record.

## Phase 4: Plan Creation

Create a plan file named `PLAN-<task-slug>.md` (e.g., `PLAN-add-user-auth.md`) in the
project root, unless the user or project instructions (especially `AGENTS.md`) specify a different
location. The task slug should be lowercase, hyphen-separated, and concise (3-5 words max).

Name each phase's executor, its model and role, chosen by Agent Selection in the global
`AGENTS.md`. Keep for Astra the parts that benefit most from its judgment; once the design and
acceptance checks are clear, Sol can execute them.

Every phase states its goal, context, constraints, ownership, governing decisions and acceptance
checks. Include concrete steps, file paths, commands and expected results where uncertainty,
reproducibility or operational risk warrants them; Sol is literal, so a phase it executes always
gets concrete steps. Leave routine details to the executor's judgment and explain how to
investigate evidence that contradicts a plan assumption. Seek input when that investigation
requires a material change beyond the authorized scope.

The phase text is the durable core of a delegated brief; add current tree state, relevant
conventions and return format at dispatch. Precision that matters belongs in the plan, not in a
spawn-time brief: the plan is what gets reviewed in Phase 5 and what survives a crashed session.

**Scale the plan to complexity**:

### For simple tasks:
```markdown
# Plan: [Task Title]

Status: [PENDING APPROVAL | APPROVED, according to the user's authorization]
Executor: [Model and role, e.g. Sol orchestrator]

## Goal
[What we're accomplishing]

## Approach
1. [Concrete step: file, command where relevant, expected result]
2. [Step]
3. [Step]

## Documentation
- [ ] [Docs to update; a new doc only if it uniquely owns something — remove section if genuinely none]

## Verification
- [ ] [How to confirm success]
```

Simple plans should contain enough context and acceptance checks for their executor to execute or resume.

### For moderate/complex tasks:
```markdown
# Plan: [Task Title]

Created: [Date]
Status: PENDING APPROVAL

## Summary
[2-3 sentences on what will be accomplished]

## Scope
- **In scope**: [What will be done]
- **Out of scope**: [What won't be done]

## Phases

### Phase 1: [Name]
**Executor**: [Model and role, e.g. Astra orchestrator or Sol subagent]
**Goal**: [What this achieves]

**Work**:
- [Item] - [Details]
- [Item] - [Details]

**Steps** (where task-critical detail is needed):
1. [Concrete step: file, command where relevant, expected result]
2. [Step]

**Verification**:
- [ ] [How to verify]

### Phase 2: [Name]
[Same structure]

## Documentation
What existing docs need to be updated and, only when it has a distinct durable role, what new doc
must be created. For each new artifact, state what information it uniquely owns and why an existing
artifact cannot own it. Include documentation as steps in the relevant phase above, or as a dedicated
phase if substantial. Remove this section only if the task genuinely has zero documentation impact.

## Decisions
Choices made while drafting that a reasonable person could have made differently and that would be
costly to reverse once executed. Write each one down as you make it — do not reconstruct this
section afterwards. Everything below that bar stays a plain statement in the plan.
- **[What was chosen]** — [why]. Rejected: [alternative] ([its appeal, and why it lost]).

## Open Questions
- [Unresolved questions for the user]

---
**Please review. Edit directly if needed, then confirm to proceed.**
```

Add sections as needed: Prerequisites, Risks, Rollback, Testing Strategy, etc. A simple plan that
turns on one material choice should carry a Decisions section too. Set the status to reflect the
user's actual authorization and omit the approval request when approval is already settled.

## Phase 5: Plan Review

Use the `doublecheck` skill with the explicit plan file path, including when the file is untracked
and absent from Git diffs. Verify completeness, correctness, feasibility, internal consistency,
and whether each phase is precise enough for its stated executor before presenting it to the user.
Fix any issues found. If the skill is unavailable, perform the equivalent review directly and
disclose the fallback.

Do not skip this step. Do not decide it's "not worth it" because the plan looks complete or the task seems simple — past instances have skipped it and shipped flawed plans. This step is non-negotiable.

## Phase 6: User Confirmation

Present the plan in the conversation — do not make the user reconstruct it from the file. A plan
reads as a series of settled statements, which hides the fact that choices were made at all; your
job here is to expose the choices so approval means something. Scale this to complexity: a simple
plan needs the summary plus anything genuinely open, and nothing more.

1. **Summarize the plan in plain language.** Assume a technical reader who knows the project
   broadly but may not recall the details, or was never in them. Say what will change and why —
   not a phase-by-phase recital. Be direct; skip jargon unless a term genuinely carries meaning
   no plain phrasing does. Include the execution split so the user can override it.
2. **Present the decisions** from the plan's Decisions section: what was chosen, why, and what was
   rejected along with its tradeoffs. Present the calls **you** made; skip the ones the user
   already made or settled with you in conversation — don't re-litigate their own choices back
   at them.
3. **Present the open questions.** Give each enough context to be understood cold, the viable
   options with their tradeoffs, and **your recommended default** — so the user can accept the set
   as a whole or override just the ones they care about, rather than adjudicating every fork. For
   any that genuinely block, ask using the interaction mechanism available in the current mode
   (`request_user_input` in Codex Plan mode when available).
   For four or more decision points, or a discussion needing several rounds, offer the
   `decision-board` skill once, unless the user or workflow already chose it. On a board,
   present the choices on its hosted page and keep the plan linked to the board records.
4. Share the doublecheck findings (and any fixes applied)
5. Tell the user where the plan file is
6. Ask for approval when it is still needed; recognize approval or execution instructions already
   given by the user. Do not begin implementation while a required approval remains pending.

## Phase 7: Execute

Execution is tracked with `$task` against the approved plan file:

1. Re-read the plan file and note changes from the user or review.
2. Continue in this session when its context remains useful. If substantial exploration makes a
   fresh session preferable, first preserve any execution-critical rationale in the plan and fill
   any gaps in context or task-critical detail the next executor would need, telling the user
   about any substantial change; then recommend the switch and let the user decide.
3. Use `$task` on the plan file here. If the user chooses a fresh session, provide a fenced text
   block they can paste as its first message: the `$task` invocation with the plan path, its
   approval status, and the orientation files to read first. Skip files known to be loaded
   automatically in the destination session. If `$task` is unavailable, track execution in the
   plan directly and disclose the fallback.
