"""Convert hosted board snapshots and the shared board helper's write batches."""
import argparse
import json
from pathlib import Path
import re


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["snapshot", "batch"])
    parser.add_argument("input", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    value = read(args.input)
    if args.operation == "snapshot":
        docs, versions = value["docs"], value["versions"]
        if "board/meta" not in docs or not isinstance(versions, dict):
            parser.error("A complete board snapshot is required.")
        if args.out.exists() and any(args.out.iterdir()):
            parser.error("Use a fresh empty snapshot directory.")
        selected = []
        for key, data in docs.items():
            if re.fullmatch(r"(board|items|responses|rounds)/[a-zA-Z0-9-]+", key):
                selected.append((key, data))
            elif key.split("/", 1)[0] in {"board", "items", "responses", "rounds"}:
                parser.error("Invalid document path.")
        for collection in ("board", "items", "responses", "rounds"):
            (args.out / collection).mkdir(parents=True, exist_ok=True)
        for key, data in selected:
            write(args.out / (key + ".json"), data)
        write(args.out / "versions.json", versions)
    else:
        if not isinstance(value, list):
            parser.error("Expected a board.py batch list.")
        writes = []
        for entry in value:
            if entry.get("op") != "set":
                parser.error("Only helper set operations are supported.")
            item = {k: entry[k] for k in ("collection", "doc_id", "if_version") if k in entry}
            item["data"] = read(entry["file_path"])
            writes.append(item)
        write(args.out, writes)


if __name__ == "__main__":
    main()
