#!/usr/bin/env python
"""Import the THEORY interview questions into the Python course.

The split this script enforces:

    a question with code to write   ->  Coding Practice   (import-practice.py)
    a question you answer out loud  ->  Python, module 17 (here)

Both sets live in the source repo, mixed together across two files. The
Coding Practice importer drops anything with no code; this one keeps
exactly what that dropped, plus the topic-organised interview page.

Reuses the HTML parsing from import-practice.py rather than duplicating it.

Run: python .build/import-interview.py [source-root]
"""
import importlib.util
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Load the sibling importer as a module so the parsing is defined once.
_spec = importlib.util.spec_from_file_location(
    "import_practice", os.path.join(HERE, "import-practice.py"))
IP = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(IP)

ROOT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/thsite"
OUT = "courses/python/lessons/17_interview"
MAX_DRILLS = 28

# Source files, in the order the module should read.
SOURCES = [
    ("01_Python/interview.html", None),          # 582, already topic-grouped
    ("13_Coding_Practice/question-sets.html",    # the theory half of the banks
     ("100 python interview questions", "glassdoor python",
      "senior-level python interview")),
]

# A question with code is a Coding Practice problem, not an interview answer.
# One exception: a short snippet inside an otherwise prose answer is normal
# and stays, so the rule is about whether the question ASKS for code.
CODE_HEAVY = 0.6      # if code is most of the answer, it belongs in Practice


def wants_code(question: str, blocks: list) -> bool:
    """True if this reads as 'write a program', not 'explain a concept'."""
    q = question.lower()
    if re.match(r"^(program|write|implement|code)\b", q):
        return True
    if not blocks:
        return False
    code = sum(1 for b in blocks if b.get("t") == "code")
    return code / len(blocks) >= CODE_HEAVY and code > 1


def collect(path: str, only_parts):
    """-> [(part title, [(question, terms, blocks), ...]), ...]"""
    items = IP.extract_all(path)
    groups, current, title = [], [], None

    for item in items:
        if item[0] == "part":
            if current:
                groups.append((title, current))
            title, current = item[1], []
            continue
        if title is None:
            title = "General"
        current.append(item[1:])

    if current:
        groups.append((title, current))

    if only_parts:
        groups = [(t, qs) for t, qs in groups
                  if any(k in (t or "").lower() for k in only_parts)]
    return groups


def clean(title: str) -> str:
    title = re.sub(r"\s*\(Programs[^)]*\)", "", title or "General").strip()
    return title.replace("&amp;", "and")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for stale in os.listdir(OUT):
        if stale.endswith(".js"):
            os.remove(os.path.join(OUT, stale))

    groups: list[tuple[str, list]] = []
    for rel, only in SOURCES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            print("skip (missing):", path)
            continue
        for title, qs in collect(path, only):
            theory = [q for q in qs if not wants_code(q[0], q[2])]
            moved = len(qs) - len(theory)
            if theory:
                groups.append((clean(title), theory))
            if moved:
                print("  %-46s %3d theory, %3d -> Coding Practice"
                      % (clean(title)[:46], len(theory), moved))

    # Split oversized topics; merge runts into the previous lesson.
    lessons: list[tuple[str, list]] = []
    for title, qs in groups:
        if len(qs) <= MAX_DRILLS:
            if lessons and len(qs) < 6:
                lessons[-1][1].extend(qs)
            else:
                lessons.append((title, list(qs)))
            continue
        parts = [qs[i:i + MAX_DRILLS] for i in range(0, len(qs), MAX_DRILLS)]
        if len(parts) > 1 and len(parts[-1]) < 6:
            parts[-2].extend(parts.pop())
        for i, part in enumerate(parts, 1):
            lessons.append(("%s · %d" % (title, i) if len(parts) > 1 else title,
                            part))

    entries = []
    for i, (title, qs) in enumerate(lessons, 1):
        lid = "17.%d" % i
        blocks = [
            {"t": "callout", "kind": "note", "title": "How to use this set", "body": [
                {"t": "ul", "items": [
                    "**Answer out loud before revealing.** An answer you can only recognise is one you cannot give under pressure.",
                    "**Say the trade-off, not just the definition.** Interviewers are listening for judgement, and the follow-up question is where it shows.",
                    "Coding questions live in the **Coding Practice** course — these are the ones you answer in conversation.",
                ]},
            ]},
        ]
        for n, (question, terms, body) in enumerate(qs, 1):
            # A one-word "question" with a large body is a section heading
            # the source marked up as an item. Give it a usable title
            # rather than rendering a bare "OOP" that opens onto 37 blocks.
            if len(question) < 8 and len(body) > 6:
                question = "%s — %s" % (question, title.split(" · ")[0])
            drill = {"t": "drill", "n": str(n), "q": question, "body": body}
            if terms:
                drill["terms"] = terms
            blocks.append(drill)

        lesson = {
            "id": lid,
            "lede": "**%d interview questions on %s**, with the answers folded "
                    "away. Say your answer out loud first — recognising an "
                    "answer and being able to give one are different skills, "
                    "and only the second survives a follow-up question."
                    % (len(qs), title.split(" · ")[0].lower()),
            "objectives": [
                "Answer %d questions on %s without prompting" % (len(qs), title.split(" · ")[0].lower()),
                "State the trade-off behind each answer, not only the definition",
                "Recognise the follow-up each question is setting up",
                "Notice which answers you can recognise but not produce",
            ],
            "prerequisites": [],
            "blocks": blocks,
            "takeaways": [],
        }

        payload = json.dumps(lesson, ensure_ascii=False, indent=1)
        io.open(os.path.join(OUT, lid + ".js"), "w",
                encoding="utf-8", newline="\n").write(
            "/* ============================================================================\n"
            "   INTERVIEW %s — %s\n"
            "   ----------------------------------------------------------------------------\n"
            "   Theory interview questions: the ones you answer out loud. Anything that\n"
            "   asks for a program lives in the Coding Practice course instead.\n"
            "   Generated by .build/import-interview.py — edit the importer, not this file.\n"
            "   ========================================================================= */\n"
            "EC.receiveLesson(%s);\n" % (lid, title, payload))

        entries.append({
            "id": lid, "title": title,
            "difficulty": "advanced" if len(qs) > 20 else "core",
            "minutes": max(14, min(60, len(qs) * 2)),
            "tier": "should",
            "summary": "%d interview questions on %s, answers hidden."
                       % (len(qs), title.split(" · ")[0].lower()),
            "keywords": [w.lower() for w in
                         re.findall(r"[A-Za-z]{4,}", title)][:6] or ["interview"],
        })

    io.open(".build/interview-lessons.json", "w",
            encoding="utf-8", newline="\n").write(
        json.dumps(entries, ensure_ascii=False, indent=2))
    print("\n%d lessons, %d questions -> %s"
          % (len(entries), sum(len(q) for _, q in lessons), OUT))


if __name__ == "__main__":
    main()
