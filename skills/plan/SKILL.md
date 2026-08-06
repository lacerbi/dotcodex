---
name: plan
description: Explore a project and create a detailed, approval-gated implementation plan before making changes. Use when the user asks for a plan, invokes $plan, or wants investigation and planning without execution.
---
Plan the requested work without implementing it. Explore and analyze before making task changes.

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

Before proposing a new document:
- Name its durable audience or question and the information it will own.
- Check whether that information already belongs in an existing plan, source comment, reference document, test, TODO, issue, or orientation artifact.
- Prefer updating the existing authoritative artifact when it can serve the same purpose.
- Do not create a journal, completion report, devlog, changelog, or summary merely to restate the plan or record work performed. An archived plan may itself be the durable design record.

## Phase 4: Plan Creation

Create a plan file named `PLAN-<task-slug>.md` (e.g., `PLAN-add-user-auth.md`) in the
project root, unless the user or project instructions (especially `AGENTS.md`) specify a different
location. The task slug should be lowercase, hyphen-separated, and concise (3-5 words max).

**Scale the plan to complexity**:

### For simple tasks:
```markdown
# Plan: [Task Title]

## Goal
[What we're accomplishing]

## Approach
1. [Step]
2. [Step]
3. [Step]

## Documentation
- [ ] [Docs to update or create — remove section if genuinely none]

## Verification
- [ ] [How to confirm success]
```

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
**Goal**: [What this achieves]

**Work**:
- [Item] - [Details]
- [Item] - [Details]

**Steps**:
1. [Step]
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

## Open Questions
- [Unresolved questions for the user]

---
**Please review. Edit directly if needed, then confirm to proceed.**
```

Add sections as needed: Prerequisites, Risks, Rollback, Testing Strategy, etc.

## Phase 5: Plan Review

Use the `doublecheck` skill against the plan file to verify completeness, correctness, feasibility,
and internal consistency before presenting it to the user. Fix any issues found. If the skill is
unavailable, perform the equivalent review directly and disclose the fallback.

Do not skip this step. Do not decide it's "not worth it" because the plan looks complete or the task seems simple — past instances have skipped it and shipped flawed plans. This step is non-negotiable.

## Phase 6: User Confirmation

1. Tell the user where the plan file is
2. Share the doublecheck findings (and any fixes applied)
3. Ask them to review and edit if needed
4. Wait for explicit confirmation
5. Do NOT begin work until confirmed

## Phase 7: Execute

Once confirmed:
1. Re-read the plan file (user or double-check may have edited it)
2. Note any changes
3. Proceed following the plan

## Rules

- Don't skip exploration
- Don't start work during planning
- Always apply the `doublecheck` workflow in Phase 5 — use the skill when available
- Verify, don't assume
- If materially unclear, ask the user using the interaction mechanism available in the current mode
- Get user confirmation before executing
- Re-read the plan after confirmation
- The plan should be clear enough for someone else to follow
