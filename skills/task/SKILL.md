---
name: task
description: Create and maintain a live task checklist while executing work. Use when the user invokes $task, explicitly asks for a persistent checklist, or wants progress tracked in an existing PLAN or TASK file.
---

# Task tracking

Derive the task from the current user request and conversation.

## 1. Use an existing plan or create a task file

If the user provides or mentions a suitable `PLAN-*.md` file with structured phases:

- Use that file as the working document; do not create a separate task file.
- Preserve all existing content. Edit in place to add tracking rather than rewriting from scratch.
- Convert implementation bullets to checkboxes only where the conversion preserves their full text
  and structure.
- Add checklist items when gaps become apparent, and update status markers as work progresses.

Never replace a plan with a condensed checklist. Goals, rationale, file references, verification
details, context, and user edits are part of the user's work product. Checkboxes supplement that
material; they do not replace it.

If no suitable plan exists, create `TASK_<descriptor>_<YYYYMMDD>.md` in the location prescribed by
the repository. Include:

- Task description
- Concise checklist of steps
- Success criteria
- Dependencies or prerequisites

Keep task files brief. Link to authoritative files instead of copying their contents.

Use these markers:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked or needs attention

When `update_plan` is available, mirror the high-level active steps there so progress is visible in
the conversation. Keep the file as the durable source of detail, and keep at most one tool-plan
step in progress.

## 2. Execute while updating

Update the checklist after every significant action:

1. Mark the next item `[~]` before starting it.
2. Perform the work.
3. Mark it `[x]`, or `[!]` with a concise blocker.
4. Add newly discovered work before starting it.

Use commentary updates for material progress during long-running work; the checklist does not
replace communication with the user.

## 3. Complete the task

Continue until every in-scope item is complete or genuinely blocked. Do not silently skip or defer
items. Handle ordinary deviations and discoveries by updating the checklist and continuing. Stop
when progress requires new authority, a material user decision, or an unavailable dependency.

At completion, ensure the tracker shows:

- Final status of every item
- Any unresolved blocker or follow-up
- A brief outcome summary

## 4. Coordinate subagents

Use `spawn_agent` only for concrete, bounded work that can proceed independently and when current
collaboration constraints allow it. Follow the repository's `AGENTS.md` for delegation and model
choice.

The primary agent owns the checklist because Codex agents share the workspace. Mark the item `[~]`
before delegation, ask the subagent to report results without editing the tracker, then update the
tracker after reviewing its work. Avoid concurrent edits to the same file.

## 5. Verify

After completing the checklist, use the `doublecheck` skill to verify the work before marking the
task fully complete. If that skill is unavailable, perform the equivalent review directly and
disclose the fallback. Run the verification required by the repository and the changed-file scope;
do not treat a passing test as proof of checks that were not run.

## 6. Dispose of transient task files

Apply this section only to `TASK_*.md` files created by this skill, never to an existing plan.

After verification:

- If the file contains only transient execution tracking, propose removing it and obtain approval
  unless the user already requested cleanup or repository instructions require it.
- If it records durable findings, decisions, constraints, or follow-ups, propose the appropriate
  destination under repository conventions. Preserve that information there before removing the
  task file.
- Keep the task file while work is incomplete or blocked.

Report the outcome, verification performed, remaining issues, and disposition of the tracker.
