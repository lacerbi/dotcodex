## Agent Selection

Pick each executor by what the assignment demands: its role, how uncertain it is and how much
judgment it needs.

- **Sol** (latest available version) is the normal choice for ordinary coding and well-bounded
  technical implementation, exploration and verification. Sol is literal: give it the purpose,
  constraints and acceptance checks as well as concrete steps.
- **Astra** (latest available version) is preferred for scenario design, scientific or creative
  reasoning, ambiguous cross-cutting decisions and judgment-heavy review.
- Choose independent reviewers for the perspectives the work needs. A review may combine one
  Astra on judgment-heavy questions with one or two Sol reviewers on bounded technical concerns.
- Use **Terra** (latest available version) or another lighter model only for narrow, fully
  specified mechanical work that needs no substantial judgment. Do not substitute them for
  substantive reviewers.

**Defaults.** Start Astra at `high` and Sol at `high` or `xhigh`, and raise effort when the work
needs it. Never use `ultra` unless it is asked for specifically, by the user or by name in project
instructions or a workflow. Use one Astra agent per task, or several in parallel when the task
requires it.

**Project instructions and approved workflows take precedence.** Explicit project instructions
and approved workflows (a plan, skill or workflow the user approved or invoked) can set their own
models, efforts and agent counts, such as a final consistency review by three Astra agents at
`max`. Invoking or continuing such a workflow authorizes the agents it prescribes: run them as
named (Claude models as in Claude agents, below), without asking again. Keep any model or effort
choice the user made explicitly. The Parallel compute limit (below) still applies.

Give every executor the goal, context, constraints, the files it owns and acceptance checks, and
leave routine details to its judgment. Add exact steps and commands where uncertainty,
reproducibility or operational risk warrants them.

Follow the active tool contract and collaboration constraints. Select explicit supported model
identifiers and efforts; do not rely on inheritance when assigning a different model. If the
intended model is unavailable, disclose the fallback and preserve the judgment level the work
needs.

## Parallel compute

At most one agent may run heavy compute at a time (GPU/CPU-intensive processes such as training,
test suites, or builds). Normally keep that work in the main thread and make parallel reviewers
read-only: explicitly tell them to use static analysis and not run heavy processes. Reading files,
searching, and reasoning may proceed in parallel.

## Claude agents (Fable, Opus, Sonnet)

Plans, skills and project instructions written for the companion Claude Code setup can name Claude
models. Normally translate them: Fable's work goes to Astra, Opus's to Sol for ordinary coding and
to Astra for complex work, and Sonnet's to Terra. Keep the Claude model only when there is a
reason to, such as the user asking for it or a plan that needs that model's independent
perspective. Then run it through the Claude Code CLI from the repository, using Bash (Git Bash on
Windows) so that the report is written as UTF-8:

`claude -p "Read <brief.md> and follow it." --model opus --effort xhigh --strict-mcp-config --tools "Read,Grep,Glob" --permission-mode dontAsk --allowedTools "Read,Grep,Glob" > <report.md>`

- Write a self-contained brief to a file, as for any subagent. Claude reads the repository's
  `CLAUDE.md` and the user's global one, but not this conversation.
- `--model` takes `opus`, `fable` or `sonnet`, and `--effort` takes `high`, `xhigh` or `max`. Use
  the effort the user, plan or workflow names, and `xhigh` when none is named.
- Claude's own tools can only read and search: `--tools` limits its built-in tools to these,
  `--strict-mcp-config` loads no MCP servers, and `dontAsk` refuses anything not pre-approved.
  Hooks from Claude settings (user, project and local) and from installed plugins still run. When
  the user asks for edits, or an approved plan or workflow gives the agent editing work, add
  `Edit,Write` to `--tools` and use `--permission-mode acceptEdits` instead.
- The CLI needs network access, so request that the command run outside the sandbox. Its final
  message goes to stdout.

## Documents have one reader: the person holding the final text

When writing or editing anything meant to stand alone (specs, docs, READMEs, docstrings,
comments), write for a reader who has only the final text. They did not see the conversation or
the previous version. The common failure is a sentence that is true and locally plausible but
exists only because of the session: a reassurance about a concern the document never raised, a
qualifier pointing at context the document never gave ("at this scale"), a "X, not Y" where no
reader would have thought of Y, a "now" describing a change rather than a state. A fresh reader
experiences each as a mild non-sequitur. Test every clause you add or change: would it exist, in
this shape, if you were writing the document from scratch knowing only the final facts? If its
shape comes from a correction or a debate in the session rather than from the subject, rewrite it
from the subject. Mentioning a rejected alternative or an earlier behavior is fine when deliberate
and given enough context to stand alone.

When asking the user to decide something, in the chat or on a decision board, give them what they
need to answer it: what the thing is, why it needs a decision, and whose idea it is, in the
project's own terms. Assume they have not read the files, reviews or notes behind the question.
