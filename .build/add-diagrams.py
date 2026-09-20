#!/usr/bin/env python
"""Insert data-driven `diagram` blocks into lesson files from spec files.

Each .build/<course>-diagrams-*.json maps a lesson id to a list of
{"after": "<h2 n>", "d": {...diagram spec...}}. The diagram block is placed
directly after the h2 block with that number, so the figure opens the
section. A marker id makes the insertion idempotent: re-running replaces
the earlier copy rather than adding a second one.

Run: python .build/add-diagrams.py python
"""
import glob
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
course = sys.argv[1] if len(sys.argv) > 1 else "python"

specs = {}
for f in sorted(glob.glob(os.path.join(HERE, "%s-diagrams-*.json" % course))):
    for lid, items in json.load(io.open(f, encoding="utf-8")).items():
        specs.setdefault(lid, []).extend(items)

files = {os.path.basename(p)[:-3]: p for p in glob.glob(os.path.join(ROOT, "courses", course, "lessons", "*", "*.js"))}
added = replaced = 0
missing = []
for lid, items in specs.items():
    path = files.get(lid)
    if not path:
        missing.append(lid); continue
    src = io.open(path, encoding="utf-8").read()
    lines = src.split("\n")
    for k, it in enumerate(items):
        marker = "dg-%s-%s-%d" % (lid.replace(".", "_"), it["after"], k)
        d = dict(it["d"]); d["t"] = "diagram"; d["id"] = marker
        block = "    " + json.dumps(d, ensure_ascii=False) + ","
        # drop an earlier copy
        before = len(lines)
        lines = [l for l in lines if ('"id": "%s"' % marker) not in l]
        if len(lines) < before: replaced += 1
        else: added += 1
        if it["after"] == "top":
            # a bank lesson has no h2: place the figure first, right after "blocks": [
            idx = next((i for i, l in enumerate(lines) if re.match(r'^\s*"?blocks"?: \[', l)), None)
            if idx is None:
                print("no blocks in %s" % lid); continue
            end = idx
        else:
            pat = re.compile(r'^\s*\{ t: "h2", n: "%s"' % re.escape(it["after"]))
            idx = next((i for i, l in enumerate(lines) if pat.match(l)), None)
            if idx is None:
                print("no h2 %s in %s" % (it["after"], lid)); continue
            # the h2 block may continue onto following lines (a sub: line); insert after its closing "},"
            end = idx
            while not lines[end].rstrip().endswith("},"):
                end += 1
        lines.insert(end + 1, "")
        lines.insert(end + 2, block)
    io.open(path, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("added %d, replaced %d, lessons %d%s" % (added, replaced, len(specs), (", missing files: " + ", ".join(missing)) if missing else ""))
