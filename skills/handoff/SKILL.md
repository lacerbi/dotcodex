---
name: handoff
description: Make the current work resumable from a clean checkout by recording durable context, preserving in-flight work, and committing and pushing tracked changes. Use only when the user explicitly invokes $handoff or asks for a handoff.
---

# Handoff — make the work resumable from a clean checkout

Goal: a fresh `git clone` plus a read of the project's durable docs is enough for the next session to
resume — **except artifacts a project keeps local by design** (gitignored checkpoints, pools, weights,
venvs; `.gitignore` is the source of truth). Nothing meant to be tracked may live only in this
conversation, the working tree, or a session-bound process. Close every gap you find — don't just report it.

## 1. Capture the session's substance (if any emerged)

Decisions and their rationale, findings/results, approaches tried and rejected, open questions — anything
from the discussion worth keeping that isn't already in the code — into the project's durable docs (DEVLOG
/ TODO / notes, whatever the project uses). The conversation is not durable: a decision or finding that
lives only in chat is lost. Skip if nothing substantive emerged or if it has already been recorded.

## 2. Record in-flight / async work

For anything still running or pending — cluster jobs, background processes, scheduled tasks, open PRs —
record in a durable doc its **ID**, the **exact command/config**, **where outputs land**, **how to
retrieve them**, and its **status**, so a reader can resume it without this conversation.

## 3. Surface what is NOT durable

- remote/scratch artifacts not yet collected; local-only artifacts the next session must regenerate or
  fetch (say how);
- session-bound watchers / background tasks that die with this session (the underlying job keeps running —
  say how to re-attach by ID);
- auth / secrets / local state that won't carry over.

## 4. State the pickup point

In a durable doc (e.g. the top DEVLOG entry or a TODO file), not only your reply: where to resume, the
next decision, and what unblocks it.

## 5. Commit and push — the final gate

Do this last, so the docs you wrote in 1–4 land too. Commit and push everything from the handoff
scope that is meant to be tracked:

- Follow repository Git instructions. Inspect the diff, distinguish task-owned changes from
  unrelated user or agent work, stage intended files explicitly, and verify the staged diff before
  committing.
- Leave unrelated work untouched and unstaged. It may keep the repository dirty; report it rather
  than treating repository-wide cleanliness as a handoff requirement.
- Ensure every task-owned tracked change is committed. Fetch and compare `HEAD` with the branch's
  configured upstream, not a remote name such as `origin`. Push the task commits so the upstream
  contains them. If the branch has no configured upstream, set it to `origin/<branch>` when that
  matches the repository's existing convention (sibling branches pushed the same way, a single
  remote); ask only when the target is ambiguous — multiple remotes or a fork setup, no comparable
  branches, or a name that looks private/scratch.
- **Respect `.gitignore`** — don't commit the local-by-design artifacts above. If a file is a mid-edit, or
  you're unsure it should be tracked, surface it and confirm before committing.

## Report

What's durable (committed/pushed), what's in flight (with the retrieve command), where you recorded the
session's findings/decisions (if any), what isn't durable yet, and the one-line pickup point.
