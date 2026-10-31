#!/usr/bin/env python3
"""Bookkeeping for a decision board: seed it, build a round's writes, export it as Markdown.

    board.py seed   BOARD.json --out DIR
    board.py round  SNAPSHOT ROUND.json --out DIR [--versions VERSIONS.json]
    board.py export SNAPSHOT --out FILE.md [--url URL] [--omit ID]... [--redact REDACT.json] [--assistant NAME]

SNAPSHOT is a directory holding the board's data as ArtifactData saves it with out_dir:
board/meta.json, board/general.json, items/<id>.json, responses/<id>.json and rounds/r<N>.json.

seed and round write each document as a JSON file under DIR/docs/ and the ArtifactData batch
writes as DIR/points-1.json, points-2.json and so on, then DIR/open-next.json, at most 50
writes each. Each file holds the `writes` list for one ArtifactData batch call, printed too.
round also writes DIR/after/, the snapshot as it stands once the points are written, for export.
The input formats are described in SKILL.md.
"""
import argparse
import datetime
import difflib
import json
import pathlib
import re
import shutil
import sys

BATCH = 50                     # writes per ArtifactData batch
BATCH_BYTES = 900_000          # serialized documents per batch, under the batch's 1 MiB
DOC_BYTES = 256 * 1024 - 4096  # one document, under the database's 256 KiB
ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
# Fields a new point can't bring: it starts open, with no history.
FRESH_ONLY = {"status", "decision", "settledRound", "thread", "changedRound", "changed"}


def fail(msg):
    sys.exit(f"board.py: {msg}")


def read_json(path):
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"{path} does not exist")
    except json.JSONDecodeError as e:
        fail(f"{path} is not valid JSON: {e}")


def load_dir(path):
    if not path.is_dir():
        return {}
    return {p.stem: read_json(p) for p in sorted(path.glob("*.json"))}


def load_snapshot(src):
    if not (src / "board" / "meta.json").is_file() or not (src / "items").is_dir():
        fail(f"{src} has no board/meta.json and items/: save the board's data there first")
    board = load_dir(src / "board")
    return {
        "meta": board.get("meta", {}),
        "general": board.get("general"),
        "items": load_dir(src / "items"),
        "responses": load_dir(src / "responses"),
        "rounds": load_dir(src / "rounds"),
    }


# ---------- checking points ----------

def check_point(pid, doc, taken):
    if not ID.match(pid):
        fail(f"point id {pid!r} is not a short kebab-case name")
    if pid == "general":
        fail("the point id 'general' is taken by the general comments box")
    if pid in taken:
        fail(f"point id {pid!r} is used twice")
    if not (doc.get("title") or "").strip():
        fail(f"point {pid!r} has no title")
    if doc.get("kind", "proposal") not in ("proposal", "call"):
        fail(f"point {pid!r} has kind {doc.get('kind')!r}; use 'proposal' or 'call'")
    opts = doc.get("options") or []
    keys = [o.get("key") for o in opts]
    if any(not k for k in keys) or len(set(keys)) != len(keys):
        fail(f"point {pid!r}: every option needs its own key")
    if sum(1 for o in opts if o.get("recommended")) > 1:
        fail(f"point {pid!r}: at most one option is recommended")
    if doc.get("kind") == "call" and not opts:
        print(f"note: call {pid!r} has no options, so it gets an Accept button", file=sys.stderr)


def new_point(doc, order):
    doc = dict(doc)
    pid = doc.pop("id")
    bad = FRESH_ONLY & set(doc)
    if bad:
        fail(f"new point {pid!r} sets {', '.join(sorted(bad))}; a new point starts open, with no history")
    doc.setdefault("kind", "proposal")
    doc.setdefault("status", "open")
    doc.setdefault("group", "")
    doc.setdefault("order", order)
    return pid, doc


# ---------- writing the batches ----------

def emit(out, docs, versions, final=None):
    """docs: list of (collection, doc_id, data, existed). final: the same, written in its own last batch."""
    out = pathlib.Path(out)
    (out / "docs").mkdir(parents=True, exist_ok=True)
    missing = [f"{c}/{d}" for c, d, _, existed in docs + ([final] if final else [])
               if existed and f"{c}/{d}" not in versions]
    if missing:
        fail("these documents already exist, so their writes need the version last read; put it in a versions "
             "file ({\"items/<id>\": N, \"board/meta\": N}) from the listing and pass --versions:\n  "
             + "\n  ".join(missing))

    def size(data):
        return len(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    for c, d, data, _ in docs + ([final] if final else []):
        if size(data) > DOC_BYTES:
            fail(f"{c}/{d} would be {size(data)} bytes, over the database's 256 KiB for one document")

    def write(c, d, data, existed):
        path = out / "docs" / f"{c.replace('/', '_')}__{d}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
        w = {"op": "set", "collection": c, "doc_id": d, "file_path": str(path.resolve())}
        if existed:
            w["if_version"] = versions[f"{c}/{d}"]
        return w

    # Batches of at most BATCH writes and BATCH_BYTES of documents.
    batches, current, used = [], [], 0
    for c, d, data, existed in docs:
        n = size(data)
        if current and (len(current) == BATCH or used + n > BATCH_BYTES):
            batches.append(current)
            current, used = [], 0
        current.append(write(c, d, data, existed))
        used += n
    if current:
        batches.append(current)
    files = [(out / f"points-{i + 1}.json", b) for i, b in enumerate(batches)]
    if final:
        files.append((out / "open-next.json", [write(*final)]))
    for path, writes in files:
        path.write_text(json.dumps(writes, indent=1), encoding="utf-8", newline="\n")
        print(f"== {path.name}: {len(writes)} write{'s' if len(writes) != 1 else ''}")
        print(json.dumps(writes))
    return files


# ---------- seed ----------

def cmd_seed(args):
    board = read_json(args.board)
    meta = dict(board.get("meta") or {})
    if not (meta.get("title") or "").strip():
        fail("the board's meta needs a title")
    meta.setdefault("round", 1)
    docs, taken = [], set()
    for i, raw in enumerate(board.get("items") or []):
        if "id" not in raw:
            fail(f"point {i + 1} has no id")
        check_point(raw["id"], raw, taken)
        taken.add(raw["id"])
        pid, doc = new_point(raw, (i + 1) * 10)
        docs.append(("items", pid, doc, False))
    if not docs:
        fail("the board has no points")
    emit(args.out, docs, {}, ("board", "meta", meta, False))


# ---------- round ----------

def verdict_label(item, resp):
    v = resp.get("verdict")
    if v == "accept":
        return "Accepted"
    if v == "option":
        label = next((o.get("label") for o in item.get("options") or [] if o.get("key") == resp.get("option")), None)
        return f"Option: {label or resp.get('option')}"
    return "Discuss"


def answered(resp, n):
    return (resp and resp.get("round") == n
            and (resp.get("verdict") in ("accept", "option") or (resp.get("text") or "").strip()))


def has_entry(thread, who, n, text=None):
    """Whether the thread has this round's entry by `who`; with `text`, one that is that text, or that text
    followed by the before-and-after excerpts this script adds."""
    def same(m):
        t = m.get("text") or ""
        return text is None or t == text or t.startswith(text.rstrip() + "\n\n")
    return any(m.get("who") == who and m.get("round") == n and same(m) for m in thread)


def field_lines(doc, key):
    if key == "options":
        return [f"{o.get('label', o.get('key'))}{' (recommended)' if o.get('recommended') else ''}"
                f"{': ' + o['note'] if o.get('note') else ''}" for o in doc.get("options") or []]
    if key == "kind":
        return [doc.get("kind") or "proposal"]
    return (doc.get(key) or "").splitlines()


def change_excerpt(old, new):
    """Before-and-after diffs of the fields an earlier answer agreed to."""
    parts = []
    for key in ("recommendation", "options", "kind"):
        a, b = field_lines(old, key), field_lines(new, key)
        if a != b:
            # The changed lines with one line of context, without the file header.
            lines = list(difflib.unified_diff(a, b, lineterm="", n=1))[2:]
            verb = "they" if key == "options" else "it"
            parts.append(f"The {key}, as {verb} changed:\n\n```diff\n" + "\n".join(lines) + "\n```")
    return "\n\n".join(parts)


def cmd_round(args):
    src, out = args.snapshot.resolve(), args.out.resolve()
    if src == out or out in src.parents or src in out.parents:
        fail("the snapshot and --out must be separate directories, neither inside the other")
    snap = load_snapshot(args.snapshot)
    spec = read_json(args.spec)
    versions = read_json(args.versions) if args.versions else {}
    meta, items, responses = snap["meta"], snap["items"], snap["responses"]
    n = spec.get("round")
    if n is None or meta.get("round") != n:
        fail(f"the board's open round is {meta.get('round')}, but the round file says {n}")

    # The snapshot must hold every answer the round's submission counted.
    submitted = snap["rounds"].get(f"r{n}")
    if submitted is None:
        if not args.unsubmitted:
            fail(f"the snapshot has no rounds/r{n}: save rounds/ again, or pass --unsubmitted for a round the "
                 "user answered without submitting")
        print(f"note: round {n} was not submitted on the page; processing it anyway", file=sys.stderr)
    else:
        got = sum(1 for pid, r in responses.items() if pid != "general" and answered(r, n))
        want = submitted.get("answered") or 0
        if got < want:
            fail(f"round {n} was submitted with {want} answers, but the snapshot holds {got}: save responses/ again, "
                 "every page of it")
        if submitted.get("general") and not answered(responses.get("general"), n):
            fail(f"round {n} was submitted with a general comment, but the snapshot has none: save responses/ again")
    # Every answer belongs to a point in the snapshot; one that doesn't means the items listing is short.
    orphans = sorted(pid for pid, r in responses.items() if pid != "general" and pid not in items and answered(r, n))
    if orphans:
        fail(f"the snapshot has answers for points it doesn't hold ({', '.join(orphans)}): save items/ again, "
             "every page of it")
    known = set(spec) - {"round", "settle", "reply", "update", "add", "general_reply", "round_note"}
    if known:
        fail(f"unknown keys in the round file: {', '.join(sorted(known))}")

    changed = {}  # pid -> new doc
    def doc_of(pid):
        if pid not in changed:
            if pid not in items:
                fail(f"no point {pid!r} on the board")
            changed[pid] = json.loads(json.dumps(items[pid]))
            changed[pid].setdefault("thread", [])
        return changed[pid]

    # The user's answers go into each point's thread.
    for pid, resp in responses.items():
        if pid == "general" or not answered(resp, n):
            continue
        doc = doc_of(pid)
        if not has_entry(doc["thread"], "you", n):
            doc["thread"].append({"who": "you", "round": n, "verdict": verdict_label(items[pid], resp),
                                  "text": resp.get("text") or ""})

    # Card rewrites, with an excerpt of what changed when the point already has an answer.
    replies = dict(spec.get("reply") or {})
    for pid, fields in (spec.get("update") or {}).items():
        bad = set(fields) & {"id", "thread", "status", "settledRound", "decision"}
        if bad:
            fail(f"update of {pid!r} sets {', '.join(sorted(bad))}; settle points with 'settle'")
        doc = doc_of(pid)
        before = dict(doc)
        doc.update(fields)
        check_point(pid, doc, set())
        doc["changedRound"] = n + 1
        if not (fields.get("changed") or "").strip():
            print(f"note: the update of {pid!r} has no 'changed' line for the card", file=sys.stderr)
        excerpt = change_excerpt(before, doc)
        if excerpt and any(m.get("who") == "you" for m in doc["thread"]):
            if pid not in replies:
                fail(f"the update of {pid!r} changes what an earlier answer agreed to; give it a reply that says why")
            replies[pid] = replies[pid].rstrip() + "\n\n" + excerpt

    # Claude's replies, each written once: a rerun recognizes it by its own text, excerpts or not.
    base = spec.get("reply") or {}
    for pid, text in replies.items():
        doc = doc_of(pid)
        if not has_entry(doc["thread"], "claude", n, base.get(pid, text)):
            doc["thread"].append({"who": "claude", "round": n, "text": text})
        doc["changedRound"] = n + 1

    # Settled points: only on the user's Accept or chosen option this round.
    for pid, decision in (spec.get("settle") or {}).items():
        resp = responses.get(pid)
        if not resp or resp.get("round") != n or resp.get("verdict") not in ("accept", "option"):
            fail(f"settling {pid!r} needs your Accept or a chosen option in round {n}")
        doc = doc_of(pid)
        doc.update(status="settled", settledRound=n, decision=decision)

    # Every answer this round gets a settle or a reply, from this round file or an earlier run of the round.
    def covered(pid):
        doc = changed.get(pid) or items[pid]
        return (pid in (spec.get("settle") or {}) or pid in replies
                or (doc.get("status") == "settled" and doc.get("settledRound") == n)
                or has_entry(doc.get("thread") or [], "claude", n))
    left = sorted(pid for pid, r in responses.items()
                  if pid != "general" and answered(r, n) and not covered(pid))
    if left:
        fail("these answers have neither a settle nor a reply in the round file: " + ", ".join(left))
    gresp = responses.get("general")
    if (answered(gresp, n) and not spec.get("general_reply")
            and not has_entry((snap["general"] or {}).get("thread") or [], "claude", n)):
        fail("the general comment has no general_reply in the round file")

    # New points. One on the board exactly as this add would write it, still open and with no history, was
    # added by an earlier run; any other point with its id is a different point.
    added = []
    taken = set()
    top = max([d.get("order", 0) for d in items.values()] + [0])
    for raw in spec.get("add") or []:
        pid = raw.get("id")
        if pid is None:
            fail("a new point has no id")
        if pid in items:
            if new_point(raw, items[pid].get("order"))[1] == items[pid]:
                print(f"note: {pid!r} is already on the board, from an earlier run of this round", file=sys.stderr)
                continue
            fail(f"point id {pid!r} is already on the board as a different point; give the new point another id")
        check_point(pid, raw, taken)
        taken.add(pid)
        top += 10
        added.append(new_point(raw, top))

    # The general comments box.
    general = None
    if answered(gresp, n) or spec.get("general_reply"):
        general = json.loads(json.dumps(snap["general"] or {}))
        general.setdefault("thread", [])
        if answered(gresp, n) and not has_entry(general["thread"], "you", n):
            general["thread"].append({"who": "you", "round": n, "text": gresp.get("text") or ""})
        reply = spec.get("general_reply")
        if reply and not has_entry(general["thread"], "claude", n, reply):
            general["thread"].append({"who": "claude", "round": n, "text": reply})
            general["changedRound"] = n + 1
        if snap["general"] is not None and general == snap["general"]:
            general = None

    # Only points that changed are written, so running the same round again writes nothing twice.
    changed = {pid: doc for pid, doc in changed.items() if doc != items[pid]}
    docs = [("items", pid, doc, True) for pid, doc in changed.items()]
    docs += [("items", pid, doc, False) for pid, doc in added]
    if general is not None:
        docs.append(("board", "general", general, snap["general"] is not None))
    new_meta = dict(meta, round=n + 1, roundNoteRound=n + 1, roundNote=spec.get("round_note") or "")
    emit(args.out, docs, versions, ("board", "meta", new_meta, True))
    # The data as it stands once the points are written, for the export of the round.
    after = pathlib.Path(args.out) / "after"
    if after.exists():
        shutil.rmtree(after)
    shutil.copytree(args.snapshot, after)
    for c, d, data, _ in docs:
        path = after / c / f"{d}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    settled = sum(1 for pid, doc in changed.items()
                  if doc.get("status") == "settled" and items[pid].get("status") != "settled")
    print(f"round {n}: {len(changed)} points updated ({settled} settled), {len(added)} added; "
          f"write the points-* batches, then the project's records, then open-next.json")


# ---------- export ----------

def quote(text):
    lines = text.rstrip().splitlines()
    return "\n".join("> " + line if line.strip() else ">" for line in lines)


def thread_lines(thread, assistant):
    out = []
    for m in thread or []:
        # Replies are stored with who "claude" whichever assistant wrote them.
        who = assistant if m.get("who") == "claude" else "You"
        verdict = f" ({m['verdict']})" if m.get("verdict") else ""
        out += [f"**{who}, round {m.get('round', '?')}{verdict}:**", ""]
        if (m.get("text") or "").strip():
            out += [quote(m["text"]), ""]
    return out


def point_lines(pid, it, assistant):
    settled = it.get("status") == "settled"
    kind = "Your call" if it.get("kind") == "call" else "Proposal"
    state = f"settled in round {it['settledRound']}" if settled and it.get("settledRound") else (
        "settled" if settled else "open")
    meta = " · ".join(x for x in [f"`{pid}`", kind, it.get("group") or "", state] if x)
    out = [f"### {it.get('title') or pid}", "", meta, ""]
    if settled and it.get("decision"):
        out += ["**Decision.**", "", it["decision"].strip(), ""]
    for label, key in [("Context.", "context"), ("Detail.", "detail")]:
        if (it.get(key) or "").strip():
            out += [f"**{label}**", "", it[key].strip(), ""]
    if it.get("options"):
        out += ["**Options.**", ""]
        for o in it["options"]:
            rec = " (recommended)" if o.get("recommended") else ""
            note = f": {o['note']}" if o.get("note") else ""
            out.append(f"- **{o.get('label', o.get('key', ''))}**{rec}{note}")
        out.append("")
    if (it.get("recommendation") or "").strip():
        out += ["**Recommendation.**", "", it["recommendation"].strip(), ""]
    if not settled and (it.get("changed") or "").strip():
        out += [f"**Updated in round {it.get('changedRound', '?')}.**", "", it["changed"].strip(), ""]
    if it.get("thread"):
        out += ["**Discussion.**", ""] + thread_lines(it["thread"], assistant)
    return out


def export_text(snap, url, omit, date, assistant="Claude"):
    meta, general, items, rounds = snap["meta"], snap["general"] or {}, snap["items"], snap["rounds"]
    left_out = [pid for pid in items if pid in omit]
    shown = sorted(((pid, it) for pid, it in items.items() if pid not in omit),
                   key=lambda kv: (kv[1].get("order", 10**9), kv[0]))
    settled = sum(1 for _, it in shown if it.get("status") == "settled")

    out = [f"# {meta.get('title') or 'Decision board'}", ""]
    where = f" ({url})" if url else ""
    out += [f"Copy of the decision board{where}, made {date} at round {meta.get('round', '?')}: every point with "
            f"its discussion. {settled} of {len(shown)} points settled.", ""]
    if left_out:
        k = len(left_out)
        out += [f"{k} point{' is' if k == 1 else 's are'} left out of this copy.", ""]
    if meta.get("eyebrow"):
        out += [f"*{meta['eyebrow']}*", ""]
    if (meta.get("intro") or "").strip():
        out += [meta["intro"].strip(), ""]

    section = None
    for pid, it in shown:
        sec = it.get("section") or "Points"
        if sec != section:
            out += [f"## {sec}", ""]
            section = sec
        out += point_lines(pid, it, assistant)

    if general.get("thread"):
        out += ["## General comments", ""] + thread_lines(general["thread"], assistant)

    if rounds:
        out += ["## Rounds", "", "| Round | Submitted | Answered | Left open | General comment |",
                "|---|---|---|---|---|"]
        for r in sorted(rounds.values(), key=lambda r: r.get("round", 0)):
            when = (r.get("submittedAt") or "")[:16].replace("T", " ")
            out.append(f"| {r.get('round', '?')} | {when} | {r.get('answered', '')} | {r.get('open', '')} | "
                       f"{'yes' if r.get('general') else ''} |")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def redact(value, pairs, hits):
    if isinstance(value, str):
        for i, (old, new) in enumerate(pairs):
            if old in value:
                hits.add(i)
                value = value.replace(old, new)
        return value
    if isinstance(value, list):
        return [redact(v, pairs, hits) for v in value]
    if isinstance(value, dict):
        return {k: redact(v, pairs, hits) for k, v in value.items()}
    return value


def cmd_export(args):
    snap = load_snapshot(args.snapshot)
    unknown = set(args.omit) - set(snap["items"])
    if unknown:
        fail(f"--omit names points not on the board: {', '.join(sorted(unknown))}")
    pairs = [tuple(p) for p in read_json(args.redact)] if args.redact else []
    hits = set()
    # The board's own text is redacted before it is laid out, so quoting can't hide a match; the
    # sentences this script writes are redacted after.
    snap = redact(snap, pairs, hits)
    text = redact(export_text(snap, args.url, set(args.omit), args.date, args.assistant), pairs, hits)
    missed = [old for i, (old, _) in enumerate(pairs) if i not in hits]
    if missed:
        fail("redactions not found anywhere on the board: " + "; ".join(repr(o[:60]) for o in missed))
    left = [old for old, _ in pairs if old in text]
    if left:
        fail("redacted text is still in the copy: " + "; ".join(repr(o[:60]) for o in left))
    args.out.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {args.out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("seed", help="build the writes that start a board")
    s.add_argument("board", type=pathlib.Path, help="the board's meta and points (see SKILL.md)")
    s.add_argument("--out", type=pathlib.Path, required=True)
    r = sub.add_parser("round", help="build the writes that close a round and open the next")
    r.add_argument("snapshot", type=pathlib.Path)
    r.add_argument("spec", type=pathlib.Path, help="the round's decisions and replies (see SKILL.md)")
    r.add_argument("--out", type=pathlib.Path, required=True)
    r.add_argument("--versions", type=pathlib.Path, help="versions of the documents to be written")
    r.add_argument("--unsubmitted", action="store_true",
                   help="process a round the user answered without submitting it on the page")
    e = sub.add_parser("export", help="write the board as one Markdown file")
    e.add_argument("snapshot", type=pathlib.Path)
    e.add_argument("--out", type=pathlib.Path, required=True)
    e.add_argument("--url", default="", help="the board's link, named at the top of the file")
    e.add_argument("--omit", action="append", default=[], metavar="ID", help="leave this point out (repeatable)")
    e.add_argument("--redact", type=pathlib.Path,
                   help="JSON list of [text, replacement] pairs applied to the copy; each must match")
    e.add_argument("--date", default=datetime.date.today().isoformat(), help="date of the copy (default: today)")
    e.add_argument("--assistant", default="Claude", metavar="NAME",
                   help="name shown on the assistant's replies (default: Claude)")
    args = ap.parse_args()
    {"seed": cmd_seed, "round": cmd_round, "export": cmd_export}[args.cmd](args)


if __name__ == "__main__":
    main()
