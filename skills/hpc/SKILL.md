---
name: hpc
description: >-
  Launch and manage jobs on the HPC cluster. Use only when the user explicitly invokes $hpc or asks to use this skill.
---

# HPC — launch work on the cluster

You run the `hpc` launcher yourself to put the user's work on the cluster. That is
the point of the tool — do not hand commands to the user to run, unless asked.

## 1. Find the launcher

1. Read [the recorded launcher location](references/launcher-location.md).
2. If that path is absent or stale, discover it with `Get-Command hpc` in PowerShell or
   `bash -lc 'command -v hpc'` through `shell_command`, then take the directory of that path. If
   discovery fails, ask the user where the `hpc-launcher` folder is.
3. Ask before persisting a newly discovered location, then update the skill reference with the
   path written relative to the home directory (`~`), since this skill is published. Do not
   modify global `AGENTS.md` merely to cache launcher discovery.

## 2. Read the launcher's own docs

- `<path>/README.md` — what it does, setup, every command. **Always.**
- `<path>/clusters/<HPC_CLUSTER>.md` — facts for the cluster this repo targets
  (`HPC_CLUSTER` in `.hpc.env`; `hpc clusters` lists them). Read it when running or
  configuring a job — partitions, filesystem, gotchas (e.g. Roihu's split login
  hosts + 24 h SSH cert).
- `<path>/AGENTS.md`, `DESIGN.md`, `TODO.md` — only when you need rationale,
  limitations, or current status.

Read the live files. Do not rely on remembered defaults (partitions, modules,
torch module/wheel, walltimes) — they live in the cluster's `clusters/<name>.env`
profile and `hpc-env.example`, not in your memory.

## 3. Run it yourself

- `hpc` is bash; run it with Git Bash/MSYS through `shell_command` (for example,
  `bash -lc 'hpc status'`), not as PowerShell syntax.
- Execute the commands directly — `hpc run`, `hpc test`, `hpc status`, `hpc logs`,
  `hpc collect`, `hpc upload`, `hpc wait`, `hpc init`, etc. Don't delegate them to
  the user. (For unattended/scripted use, `hpc wait` blocks until a job is done and
  exits its rc, and `hpc status --json` / `hpc logs --once` are non-interactive —
  see the README.)
- Auth: the user's ssh-agent holds the cluster key. If an `hpc` call fails on SSH
  auth, ask the user to load it once (`ssh-add` their key), then keep running the
  commands yourself.
- A project needs a `.hpc.env` (run `hpc init`) before `hpc run` / `hpc test`.
- `hpc cancel` refuses to kill a RUNNING job unless you pass `--force`. If you were
  only cancelling because the job was stuck in the queue, the refusal means it has now
  started — so the reason to cancel is gone; let it run. Only `--force` if you'd kill
  it regardless of queue state (bugged code, wrong config, superseded run).

## 4. Carry out the user's request, following the docs you just read.
