## Agent Selection

Working equivalences across the companion Codex and Claude workflows: **Astra ≈ Fable** and
**Sol ≈ Opus**. These describe execution roles, not identical capabilities or interchangeable tool
parameters. The user's experience is that Sol is more reliable than Opus but more literal; give it
the purpose, constraints, and acceptance checks as well as concrete steps.

- **Sol** (`gpt-5.6-sol`) is the default subagent for implementation, exploration, investigation,
  and independent review, including challenging work. Use `high` or `xhigh` as needed.
- **Astra** (`gpt-6-astra`) normally orchestrates and handles the work that benefits most from its
  judgment: difficult design, creative or scientific reasoning, and cross-cutting integration.
  Use `high` by default. Never select `xhigh` for Astra unless the user explicitly directs it.
  Do not select higher effort tiers on your own.
- A review may mix **one Astra** on the most critical or difficult questions with **one or two Sol**
  reviewers on other substantive concerns. Use at most one Astra subagent or reviewer per task by
  default; additional Astra agents should be rare and justified by exceptional needs or an explicit
  user request. Difficulty alone does not make a task unsuitable for Sol.
- Use lighter models only for narrow, fully specified mechanical work that needs no substantial
  judgment. Do not substitute them for substantive reviewers.

Follow the active tool contract and collaboration constraints. Select explicit model identifiers
from the available options; do not rely on inheritance when assigning a different model. If the
intended model is unavailable, disclose the fallback and preserve the judgment level the work needs.
In another model ecosystem, apply the role equivalences above using that runtime's supported tools
and settings.

## Parallel compute

At most one agent may run heavy compute at a time (GPU/CPU-intensive processes such as training,
test suites, or builds). Normally keep that work in the main thread and make parallel reviewers
read-only: explicitly tell them to use static analysis and not run heavy processes. Reading files,
searching, and reasoning may proceed in parallel.
