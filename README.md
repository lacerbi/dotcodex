# Codex Skills

Personal skills for common [Codex](https://github.com/openai/codex) workflows. Each published
skill lives in `skills/<name>/SKILL.md` and can be invoked with `$<name>` or a matching request,
subject to the skill's trigger rules.

See also the companion [Claude Code skills repository](https://github.com/lacerbi/dotclaude).

[AGENTS.md](AGENTS.md) owns model selection, reasoning effort, mixed-review guidance, translating or
running Claude models, the limit on concurrent heavy compute, and the writing rules for documents
and for questions to the user.

## Skills

| Skill | Description |
|-------|-------------|
| [`$audit`](skills/audit/SKILL.md) | Audit files or changes for correctness, quality, integration, and risk without modifying them |
| [`$decision-board`](skills/decision-board/SKILL.md) | Put decisions on a private hosted board the user answers from desktop or phone; includes the board's Site files |
| [`$doublecheck`](skills/doublecheck/SKILL.md) | Deeply verify completed or proposed work for completeness, consistency, and regressions |
| [`$handoff`](skills/handoff/SKILL.md) | Make work resumable from a clean checkout by preserving context, committing, and pushing |
| [`$hpc`](skills/hpc/SKILL.md) | Launch and manage jobs through the HPC launcher |
| [`$plan`](skills/plan/SKILL.md) | Explore a project and create an approval-gated implementation plan |
| [`$task`](skills/task/SKILL.md) | Maintain a durable checklist while executing work |
| [`$triage`](skills/triage/SKILL.md) | Validate reported issues or review feedback and fix confirmed problems when requested |

## Usage

```text
$plan implement user authentication
$task refactor the payment module
$audit src/components/
$doublecheck authentication logic
$triage the login button does not work on mobile
$handoff
```

## Adding a skill

Skills are published one at a time. A new `skills/<name>/` is ignored by default; add an explicit
`!skills/<name>/**` rule to `.gitignore` to publish it. Review every opted-in directory for secrets,
machine paths, hostnames, and private-project details before committing.

## License

[MIT](LICENSE)
