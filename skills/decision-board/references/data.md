# Board data and helper inputs

Create with `board_id`, a `meta` object and an `items` array:

```json
{
  "board_id": "scenario-decisions",
  "meta": {"title": "Scenario decisions", "eyebrow": "Example project", "intro": "Decisions for this review."},
  "items": [{
    "id": "keep-names", "kind": "call", "section": "Setting",
    "title": "Keep the character names?", "context": "Explain the relevant choice here.",
    "recommendation": "Keep the names for consistency with the history.",
    "options": [
      {"key": "keep", "label": "Keep names", "note": "History needs no edits.", "recommended": true},
      {"key": "change", "label": "Change names", "note": "Update each reference in the history."}
    ]
  }]
}
```

New points start open, with no decision, settlement or thread history. `general`
is reserved. `order` controls sequence; defaults are increments of ten. Optional
`group` is a small label; `detail` holds expandable supporting material. The page
supports paragraphs, bullets, code fences (including diff), inline code and bold.

A round file for `board.py round`:

```json
{
  "round": 1,
  "settle": {"keep-names": "The character names remain unchanged."},
  "reply": {"other-point": "Explain the answer and remaining choice."},
  "update": {"other-point": {"context": "Revised context.", "changed": "Describe the revision."}},
  "add": [{"id": "new-point", "kind": "proposal", "title": "New decision", "context": "Explain it.", "recommendation": "State the proposed choice."}],
  "general_reply": "Reply to the user's general comment.",
  "round_note": "Names settled; the other point needs another look."
}
```

Only `round` is required; omit unused fields. A settlement must reflect the user's
submitted acceptance. The helper requires a reply for a material recommendation,
kind or option change after an answer; it adds before-and-after text to the thread.
Explain material scope changes in the reply as well.

Snapshots contain `docs` keyed by `collection/document`, `versions` with integer
document versions, a board `id`, and a storage `revision`. The bridge extracts
`board/`, `items/`, `responses/` and `rounds/` for the unchanged helper. Its generated
batches contain `collection`, `doc_id`, `file_path`, and existing-document
`if_version`. The bridge inlines `file_path` as `data` for the hosted update tool.

The helper's historical thread author value `claude` is retained for compatibility;
the hosted page, and the export with `--assistant Codex`, display it as Codex. Do
not rewrite saved history merely to rename this field. User messages have
`who: "you"`.

For exporting, `board.py export SNAP --out FILE.md --url URL --assistant Codex`
also accepts `--omit ID` and `--redact FILE.json`. Redactions are `[text, replacement]` pairs; keep the
redaction input somewhere authorized for the original content.
