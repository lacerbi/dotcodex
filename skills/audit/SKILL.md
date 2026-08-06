---
name: audit
description: Audit files, directories, or a change set for correctness, quality, consistency, integration, and risk. Use when the user asks Codex to audit or assess code, documentation, configuration, or repository changes without implementing fixes.
---

# Audit

## Establish the scope

Derive the audit target from the current user request and conversation. Resolve named files and
directories before reviewing them. If the request names no target, use the current conversation's
changes; when in a Git repository, inspect `git status --short` and the relevant diff to identify
them.

Treat the audit as read-only. Do not fix findings, edit files, create issues, or write an audit
artifact unless the user explicitly asks for one.

## Explore the surrounding context

Read the target files and enough adjacent material to understand their purpose and dependencies.
Prefer `rg` and `rg --files` for repository searches. Check applicable project instructions,
related tests, documentation, callers, imports, configuration, and established local patterns.

For a broad or complex audit, use `spawn_agent` only when independent, bounded review tracks can
run in parallel and materially improve coverage. Follow the repository's `AGENTS.md` and current
collaboration constraints. Give each subagent a distinct scope, request evidence with file paths
and line numbers, and keep final judgment with the primary agent.

## Review areas

### Correctness and quality

- Identify bugs, logical flaws, inaccurate claims, and incomplete behavior.
- Verify that each file serves its intended purpose.
- Check boundary conditions and failure behavior where relevant.

### Codebase integration

- Check consistency with related files, imports, dependencies, and repository conventions.
- Identify conflicting patterns, duplicated functionality, and missing companion tests, docs, or
  configuration.
- Verify references and downstream assumptions.

### Standards and maintainability

- Check security, performance, complexity, naming, and maintainability concerns in proportion to
  the target.
- Apply project-specific standards before general preferences.
- Avoid reporting stylistic preferences unless they create a concrete maintenance or correctness
  risk.

### Impact and risk

- Identify affected consumers and potential breaking changes.
- Distinguish immediate defects from follow-up improvements and residual uncertainty.

## Report

Lead with actionable findings ordered by severity. For each finding, include:

- Severity and a concise title
- Evidence with clickable file and line references when available
- Why it matters
- A specific recommended correction

Then include open questions or assumptions, followed by a brief overall assessment. If no findings
remain, say so explicitly and identify any tests or areas not examined.

Keep the report in the conversation by default. If the user requests a file, write it at the
repository's prescribed location or use `AUDIT_<descriptor>_<YYYYMMDD>.md` when no convention
exists, then also provide a concise conversational summary.
