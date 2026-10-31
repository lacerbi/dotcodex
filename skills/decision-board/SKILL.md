---
name: decision-board
description: Put decisions and discussion on a private hosted page usable from desktop and phone. Use when the user requests a decision board, when four or more points need their decision, or when a point needs several rounds of discussion.
---

# Decision board

Use one hosted board per discussion. The user answers on a full page opened from
a link; Codex replies on the cards, records decisions in the project, and opens
the next round. Answers are stored online and shared across devices.

For four or more points, or a discussion likely to take several rounds, offer
the board in one sentence unless the user or active workflow already chose it.
One or two quick questions can stay in chat. Reuse the same board for later
questions on the same work.

## Access and starting a board

Read the private Site configuration at `$CODEX_HOME/decision-board/site.json`
(by default `~/.codex/decision-board/site.json`). It stays outside this skill so
that publishing the skill never publishes it. It is a JSON object:

    {"url": "https://<name>.chatgpt.site", "project_id": "<Sites project ID>",
     "plugin_id": "<Site plugin ID>", "checkout": "<local Site project path>"}

The Sites skill reports `url` and `project_id` (`get_site`); the helper accepts
only an https `.chatgpt.site` URL. Publishing the Site creates its private
plugin, whose ID is `plugin_id`. `checkout` is the local Site project where page
and backend changes are made. If the file is missing, no board Site is set up on
this machine: see "Setting up and maintaining the Site" below, and ask the user
before creating one.

Find the connected tools by their operation names: `list_decision_boards`,
`read_decision_board`, `create_decision_board`, `update_decision_board`.
Use them when available. See [connection.md](references/connection.md) for the
supported private service fallback when this chat does not expose the tools.
Keep the Site owner-private. Never put credentials in board content or files.

Call `create_decision_board` with `board_id` (unique kebab case), `meta`, and
`items`, following [data.md](references/data.md). Existing IDs are refused; list
boards to resolve an uncertain creation before retrying. Give the user the full
page link: `<site URL>/board.html?board=<board_id>`.

The page autosaves answers. Submit freezes the round; the user then tells Codex
in chat to review it. Do not promise an automatic notification or require the
user's computer to stay on. Read the actual saved round before acting on it.

## Writing points

- Give each point a title naming the decision, self-contained context, and one
  recommendation. Explain the problem, proposal and consequences in plain words.
  State whose proposal it is. Define project labels when the label alone would
  not explain the choice.
- Use a `proposal` for a reasoned default the user can accept; use a `call` when
  their preference or missing information determines the answer. Give real
  alternatives clear consequences and mark at most one as recommended.
- Quote the exact small passage a text decision concerns. Prefer a short diff
  for edits. Put supporting evidence in `detail`, behind its toggle.
- Put governing decisions before dependent ones. Check existing project records
  before reopening a settled choice; identify what a reopening would replace.
- Read every new or rewritten card as someone with no source files open. Include
  only material appropriate for the private board and its eventual export.

## Two project records

The board is a working interface; keep its discussion and outcomes in the project.

- Export the whole board with `board.py export` to a Markdown process record
  beside its plan or task, using the project's conventions. Archive them together.
- Write accepted decisions into the project's authoritative decision records,
  specs or other designated documents. Name the board and round and link its
  process record. A reply or an agent's recommendation is not a user decision.

The plan or task names the board link, process record, outcome documents and last
fully recorded round. Follow project rules about what constitutes author approval.

## Processing a submitted round

1. Read a fresh complete snapshot with `read_decision_board`. Save the JSON to
   scratch, then run `python scripts/bridge.py snapshot snapshot.json --out SNAP`.
   Use a new empty directory; it contains the documents and `versions.json`.
2. Write a round instruction file as in [data.md](references/data.md). Accept or a
   chosen option can settle a point, including a comment that simply refines it.
   Discuss or a comment raising a new choice gets a reply and stays open.
   Unanswered or cleared answers carry forward. Reply to a general comment; a
   new issue it raises becomes a new point.
3. Run `python scripts/board.py round SNAP ROUND.json --out WRITES --versions
   SNAP/versions.json`, with WRITES outside SNAP. It validates dispositions,
   copies answers into threads, and preserves repeat-safe recovery. The hosted
   board requires submission before settling or advancing; do not use
   `--unsubmitted` for hosted rounds.
4. Convert each generated `points-*.json` using `python scripts/bridge.py batch
   FILE --out INLINE.json`. Call `update_decision_board` with those `writes`,
   the `board_id`, and a unique `operation_id`. Reuse that ID only for an exact
   retry. On a version conflict, read again and rebuild; never overwrite it.
5. Export `WRITES/after` using `python scripts/board.py export WRITES/after --out
   PROCESS.md --url BOARD_URL --assistant Codex`. Write the accepted outcomes into
   their project documents and update the last recorded round in the plan/task.
6. Convert `open-next.json` with the same bridge, then call
   `update_decision_board`, including `records: {process_path, outcome_paths}`.
   The backend requires these references and a disposition for every submitted
   answer before advancing. Actually write and verify the records first; paths
   alone do not prove their content. An outcome list can be empty for a round
   consisting entirely of discussion.
7. Read back the board to confirm the new round. Tell the user what was settled
   and what remains open, with its link.

If a session stops after point updates, read again and run the helper with just
`round` and `round_note`. It recognizes prior replies and settlements, so recovery
does not duplicate them. Complete the project records before opening the next
round. Preserve replies explaining a changed recommendation or option set.

## Resuming and closing

Start with the project plan/task's board link and last recorded round. Otherwise
list boards and match the subject, asking only if several fit. Resume an already
submitted round from the saved data; do not ask the user to submit again.

Keep the board while its work remains active. When the associated work is finished,
verify all submitted rounds have project records and archive the process record
with the plan/task. Do not delete the shared Site to close one board. Deletion of
a hosted board or Site needs an explicit user request and a supported operation.

## Setting up and maintaining the Site

The page is adapted from `board.html` in the decision-board skill of the companion
Claude Code repository (lacerbi/dotclaude), and `scripts/board.py` is an identical
copy of that skill's `board.py`. `site/` holds the board's own files, laid out as
in a Site project: the page and its storage client (`public/`), the board rules
and storage (`lib/`), the page, agent and service routes (`app/`), the database
table and its migration (`db/`, `drizzle/`), and their tests. Everything else the
Site needs comes from the Sites skill's starter project.

To set up a Site, create an owner-private Site with the Sites skill, copy `site/`
over its starter, and set `"d1": "DB"` and `"capabilities": ["mcp"]` in its
`.openai/hosting.json`. Run `node --test tests/board-state.test.mjs
tests/board-connection.test.mjs` (Node 22.18 or later), publish, and write the
Site configuration file described above.

For page or backend changes, use the Sites skill on the configured `project_id`,
preserving identity, data and audience. Copy each changed board file back into
`site/` so that `site/` matches the deployed Site.
