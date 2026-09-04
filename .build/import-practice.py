#!/usr/bin/env python
"""Import the Coding Practice content from the tutorial-hub-site repo into
Tutorial Hub's lesson format.

The source pages are one enormous HTML file per track, each holding hundreds
of <article class="q"> blocks: a question in an <h3> and an answer in a
<div class="q-a"> that a "Reveal answer" button unhides.

That maps exactly onto the `drill` block type, so the conversion is
structural rather than a rewrite: the content is the author's, the
presentation becomes ours.

Two decisions worth knowing about:

  1. Lessons are emitted as JSON, not as JS template literals. Every other
     lesson file in this repo is hand-written with backtick-delimited code,
     which means a backtick inside a Python string breaks the file. Machine
     output cannot police that, so JSON removes the class of failure.

  2. Tracks are split into lessons of at most MAX_DRILLS, cutting on a part
     boundary wherever one exists. A 537-question page is not a lesson.

Run: python .build/import-practice.py [source-dir]
"""
import html
import io
import json
import os
import re
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/thsite/13_Coding_Practice"
OUT = "courses/practice/lessons"
MAX_DRILLS = 30

# file -> (module id, short, title, blurb, outcome)
TRACKS = [
    ("basics.html", "cp_basics", "C1", "Basics and Data Types",
     "Data types, strings, control flow, tuples, sets and dictionaries.",
     "You can write any small Python program without looking up syntax."),
    ("lists.html", "cp_lists", "C2", "Lists and Arrays",
     "Every list and array program: classic problems, array algorithms, matrices and grids.",
     "You reach for the right traversal instead of nesting two loops by reflex."),
    ("functions.html", "cp_functions", "C3", "Functions and Functional",
     "Functions, arguments, lambdas, comprehensions and the functional toolkit.",
     "You can decompose a problem into functions that are worth testing."),
    ("advanced.html", "cp_advanced", "C4", "Decorators, Generators and Internals",
     "Decorators, generators, iterators, memory and the performance edge cases.",
     "The advanced features stop being trivia and become tools you choose."),
    ("oop.html", "cp_oop", "C5", "OOP and Design Patterns",
     "Classes, inheritance, dunder methods and the design patterns built on them.",
     "You can turn a paragraph of requirements into classes that survive the next one."),
    ("errors-io.html", "cp_errors", "C6", "Errors, I/O and Concurrency",
     "Exceptions, file input and output, serialisation, threading and async.",
     "You can make code fail correctly, and keep it fast without making it wrong."),
    ("tooling.html", "cp_tooling", "C7", "Modules, Regex, Testing and Tooling",
     "Modules, regular expressions, testing, command-line tools, sockets, HTTP and APIs.",
     "You can build and ship a Python project, not just write one."),
    ("algorithms.html", "cp_algorithms", "C8", "Algorithms and Data Structures",
     "Sorting, searching, recursion, maths and cryptography problems.",
     "You can name the pattern a problem belongs to before you write a line."),
    ("question-sets.html", "cp_banks", "C9", "Topic-Wise and Scenario Sets",
     "The cross-topic coding sets: topic-by-topic problems and scenario-based "
     "questions that arrive as a situation rather than a specification.",
     "You can start a problem stated as a situation rather than a task."),
    ("backend.html", "cp_backend", "C10", "Backend, Databases and Production",
     "Databases and ORMs, caching, scaling, containers, observability, security "
     "and system design.",
     "You can answer the questions that come after 'and how would you deploy it?'"),
]

PHASES = {
    "cp_basics": "Practice · Core Python",
    "cp_lists": "Practice · Core Python",
    "cp_functions": "Practice · Core Python",
    "cp_advanced": "Practice · Depth",
    "cp_oop": "Practice · Depth",
    "cp_errors": "Practice · Depth",
    "cp_tooling": "Practice · Applied",
    "cp_algorithms": "Practice · Applied",
    "cp_banks": "Practice · Interview",
    "cp_backend": "Practice · Interview",
}

DIFFICULTY = {
    "cp_basics": "foundation", "cp_lists": "foundation", "cp_functions": "core",
    "cp_advanced": "advanced", "cp_oop": "core", "cp_errors": "advanced",
    "cp_tooling": "core", "cp_algorithms": "advanced",
    "cp_banks": "advanced", "cp_backend": "expert",
}


# ---------------------------------------------------------------- helpers --

def unescape(s):
    """The source was written on a machine with a cp1252 console, so a few
    characters arrive mojibake'd. Repair the ones that actually appear."""
    s = html.unescape(s)
    for bad, good in (
        ("�", "—"),   # the replacement char stands in for em dashes
        ("", "'"), ("", '"'), ("", '"'),
        ("", "–"), ("", "—"),
    ):
        s = s.replace(bad, good)
    return s


def inline_text(frag):
    """HTML fragment -> the light markdown our inline() renderer speaks."""
    s = frag
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<code[^>]*>(.*?)</code>", lambda m: "`" + strip_tags(m.group(1)) + "`", s, flags=re.S)
    s = re.sub(r"<(?:strong|b)[^>]*>(.*?)</(?:strong|b)>", r"**\1**", s, flags=re.S)
    s = re.sub(r"<(?:em|i)[^>]*>(.*?)</(?:em|i)>", r"*\1*", s, flags=re.S)
    s = re.sub(r"<abbr[^>]*>(.*?)</abbr>", r"\1", s, flags=re.S)
    s = strip_tags(s)
    s = unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s)


def code_text(frag):
    """<code> with syntax spans -> plain source. Our own highlighter runs on
    the result, so the source's colouring is discarded rather than trusted."""
    s = re.sub(r"<br\s*/?>", "\n", frag)
    s = strip_tags(s)
    s = unescape(s)
    return s.strip("\n").rstrip()


def parse_table(frag):
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", frag, re.S):
        cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)
        if cells:
            rows.append([inline_text(c) for c in cells])
    if not rows:
        return None
    head = rows[0] if "<th" in frag else []
    body = rows[1:] if head else rows
    return {"t": "table", "head": head, "rows": body}


def to_blocks(frag):
    """The answer body -> our block array. Walks top-level elements in order
    so code, prose and lists keep their sequence."""
    blocks = []
    pattern = re.compile(
        r"<pre class=\"code\"[^>]*data-lang=\"([^\"]*)\"[^>]*>(.*?)</pre>"
        r"|<pre[^>]*>(.*?)</pre>"
        r"|<(ul|ol)[^>]*>(.*?)</\4>"
        r"|<table[^>]*>(.*?)</table>"
        r"|<details[^>]*>(.*?)</details>"
        r"|<h4[^>]*>(.*?)</h4>"
        r"|<p[^>]*>(.*?)</p>"
        r"|<hr\s*/?>",
        re.S,
    )
    pos = 0
    for m in pattern.finditer(frag):
        loose = frag[pos:m.start()]
        pos = m.end()
        txt = inline_text(loose)
        if txt:
            blocks.append({"t": "p", "text": txt})

        if m.group(1) is not None:                       # fenced code
            lang = m.group(1) if m.group(1) in ("python", "bash", "sql", "toml", "json") else "text"
            body = re.sub(r"^\s*<code[^>]*>|</code>\s*$", "", m.group(2), flags=re.S)
            src = code_text(body)
            if src:
                blocks.append({"t": "code", "lang": lang, "code": src, "numbered": False})
        elif m.group(3) is not None:                     # bare pre
            src = code_text(m.group(3))
            if src:
                blocks.append({"t": "code", "lang": "text", "code": src, "numbered": False})
        elif m.group(4) is not None:                     # list
            items = [inline_text(li) for li in
                     re.findall(r"<li[^>]*>(.*?)</li>", m.group(5), re.S)]
            items = [i for i in items if i]
            if items:
                blocks.append({"t": m.group(4), "items": items})
        elif m.group(6) is not None:                     # table
            tbl = parse_table(m.group(6))
            if tbl:
                blocks.append(tbl)
        elif m.group(7) is not None:                     # nested disclosure
            inner = m.group(7)
            sm = re.search(r"<summary[^>]*>(.*?)</summary>", inner, re.S)
            summary = inline_text(sm.group(1)) if sm else "More"
            rest = inner[sm.end():] if sm else inner
            sub = to_blocks(rest)
            if sub:
                blocks.append({"t": "disclose", "summary": summary, "body": sub})
        elif m.group(8) is not None:                     # h4
            t = inline_text(m.group(8))
            if t:
                blocks.append({"t": "h4", "text": t})
        elif m.group(9) is not None:                     # paragraph
            t = inline_text(m.group(9))
            if t:
                blocks.append({"t": "p", "text": t})
        else:                                            # hr
            blocks.append({"t": "hr"})

    tail = inline_text(frag[pos:])
    if tail:
        blocks.append({"t": "p", "text": tail})
    return blocks


# ------------------------------------------------------------- extraction --

# Coding Practice is programming questions only. The source pages also carry
# pure theory Q&A -- "what is the GIL", "explain decorators" -- which is Python
# course material, not a problem set, and it is dropped here rather than
# diluting a practice page with things that have no code to write.
THEORY_PARTS = (
    "100 python interview questions",
    "glassdoor python",
    "senior-level python interview",
)


def is_theory_part(title):
    t = title.lower()
    return any(k in t for k in THEORY_PARTS)


ITEM = re.compile(
    r"<div class=\"parthead\"[^>]*>(?P<part>.*?)</div>"
    r"|<article class=\"q\"[^>]*>(?P<q>.*?)</article>",
    re.S,
)


def extract(path):
    """-> ordered list of ('part', title) and ('q', question, terms, blocks)."""
    src = io.open(path, encoding="utf-8", errors="replace").read()
    items = []
    skipping = False
    for m in ITEM.finditer(src):
        if m.group("part") is not None:
            title = inline_text(re.sub(r"<i>\s*</i>", "", m.group("part")))
            skipping = is_theory_part(title)
            if title and not skipping:
                items.append(("part", title))
            continue

        if skipping:
            continue

        art = m.group("q")
        hm = re.search(r"<h3[^>]*>(.*?)</h3>", art, re.S)
        if not hm:
            continue
        question = inline_text(hm.group(1))

        am = re.search(r"<div class=\"q-a\">(.*)$", art, re.S)
        answer = am.group(1) if am else ""
        answer = re.sub(r"</div>\s*(<button class=\"reveal\">.*)?$", "", answer, flags=re.S)

        terms = [inline_text(t) for t in
                 re.findall(r"<span class=\"kt\">(.*?)</span>", answer, re.S)]
        answer = re.sub(r"<div class=\"keyterms\">.*?</div>", "", answer, flags=re.S)

        blocks = to_blocks(answer)
        if not question:
            continue
        # A programming question has code to write. One without any is a
        # definition being recited, which belongs in the Python course.
        if not any(b.get("t") == "code" for b in blocks):
            continue
        items.append(("q", question, terms, blocks))
    return items


def chunk(items, size):
    """Split into lessons, preferring to cut on a part boundary. A part is
    never split unless it alone exceeds the limit."""
    lessons, cur, cur_part = [], [], None
    for it in items:
        if it[0] == "part":
            if cur and len(cur) >= size * 0.6:
                lessons.append((cur_part, cur))
                cur, cur_part = [], it[1]
            else:
                cur_part = cur_part or it[1]
                if cur:
                    cur.append(it)
            if not cur:
                cur_part = it[1]
            continue
        cur.append(it)
        if len(cur) >= size:
            lessons.append((cur_part, cur))
            cur = []
    if cur:
        lessons.append((cur_part, cur))

    # A trailing chunk of two or three problems is not a lesson. Fold anything
    # under MIN_DRILLS back into the set before it.
    MIN_DRILLS = 6
    merged = []
    for part, items_ in lessons:
        if merged and len(items_) < MIN_DRILLS:
            merged[-1][1].extend(items_)
        else:
            merged.append((part, list(items_)))
    return merged


def title_for(part, n, total):
    part = re.sub(r"\s*\(Programs[^)]*\)", "", part or "Problems").strip()
    part = part.replace("&amp;", "and")
    return part if total == 1 else "%s · %d" % (part, n)


# ------------------------------------------------------------------- main --

def main():
    modules = []
    for mi, (fname, mid, short, mtitle, blurb, outcome) in enumerate(TRACKS):
        path = os.path.join(SRC, fname)
        if not os.path.exists(path):
            print("skip (missing):", path)
            continue

        items = extract(path)
        groups = chunk(items, MAX_DRILLS)

        # a lesson may be titled after the part it came from; count repeats
        # so "Programs" becomes "Programs · 1", "Programs · 2", ...
        counts = {}
        for part, _ in groups:
            key = re.sub(r"\s*\(Programs[^)]*\)", "", part or "Problems").strip()
            counts[key] = counts.get(key, 0) + 1
        seen = {}

        folder = os.path.join(OUT, "%02d_%s" % (mi + 1, mid))
        os.makedirs(folder, exist_ok=True)

        lessons = []
        for li, (part, chunk_items) in enumerate(groups):
            key = re.sub(r"\s*\(Programs[^)]*\)", "", part or "Problems").strip()
            seen[key] = seen.get(key, 0) + 1
            ltitle = title_for(part, seen[key], counts[key])
            lid = "c%d.%d" % (mi + 1, li + 1)

            drills, blocks, dn = [], [], 0
            predict = "predict" in (part or "").lower()
            for it in chunk_items:
                if it[0] == "part":
                    blocks.append({"t": "h2", "n": "", "text":
                                   re.sub(r"\s*\(Programs[^)]*\)", "", it[1]).strip()})
                    predict = "predict" in it[1].lower()
                    continue
                dn += 1
                d = {"t": "drill", "n": str(dn), "q": it[1], "body": it[3]}
                if it[2]:
                    d["terms"] = it[2]
                if predict:
                    d["kind"] = "predict"
                drills.append(d)
                blocks.append(d)

            code_n = sum(1 for d in drills for b in d["body"] if b.get("t") == "code")
            lesson = {
                "id": lid,
                "lede": "**%d problems** from the %s set. Each answer is hidden until you "
                        "ask for it — attempt it first, because reading a solution feels "
                        "like learning and is not." % (len(drills), mtitle.lower()),
                "objectives": [
                    "Work through %d problems on %s without looking anything up" % (len(drills), key.lower()),
                    "Predict each answer before revealing it",
                    "Recognise the pattern each problem belongs to",
                    "Explain your solution out loud, including its complexity",
                ],
                "prerequisites": [],
                "blocks": [
                    {"t": "callout", "kind": "note", "title": "How to use this set", "body": [
                        {"t": "ul", "items": [
                            "**Answer before you reveal.** Even a wrong attempt makes the answer stick; reading first does not.",
                            "**Say the complexity out loud** where the problem has one. Getting it wrong is the useful part.",
                            "Use the bar above to open or close everything at once, and **Ctrl K** to jump to another set.",
                        ]},
                    ]},
                ] + blocks,
                "takeaways": [],
                "_drills": len(drills),
                "_code": code_n,
            }

            out_path = os.path.join(folder, lid + ".js")
            payload = json.dumps(lesson, ensure_ascii=False, indent=1)
            io.open(out_path, "w", encoding="utf-8", newline="\n").write(
                "/* ============================================================================\n"
                "   PRACTICE %s — %s\n"
                "   ----------------------------------------------------------------------------\n"
                "   Imported from the Coding Practice source set and rendered through the\n"
                "   Tutorial Hub design system. Generated by .build/import-practice.py —\n"
                "   edit the importer, not this file.\n"
                "   ========================================================================= */\n"
                "EC.receiveLesson(%s);\n" % (lid.upper(), ltitle, payload)
            )

            lessons.append({
                "id": lid, "title": ltitle,
                "difficulty": DIFFICULTY[mid],
                "minutes": max(12, min(60, len(drills) * 2)),
                "tier": "should",
                "summary": "%d problems with hidden answers, from the %s set."
                           % (len(drills), key.lower()),
                "keywords": [w.lower() for w in re.findall(r"[A-Za-z]{4,}", key)][:6] or ["practice"],
            })

        modules.append({
            "id": mid, "short": short, "track": "practice", "numPrefix": "C",
            "phase": PHASES[mid], "title": mtitle, "blurb": blurb, "outcome": outcome,
            "lessons": lessons,
        })
        print("%-14s %3d lessons  %4d problems" % (mid, len(lessons), sum(l["id"] and 1 for l in lessons) and sum(
            int(re.match(r"(\d+) problems", l["summary"]).group(1)) for l in lessons)))

    io.open(".build/practice-modules.json", "w", encoding="utf-8", newline="\n").write(
        json.dumps(modules, ensure_ascii=False, indent=2))
    total_l = sum(len(m["lessons"]) for m in modules)
    print("\n%d modules, %d lessons -> .build/practice-modules.json" % (len(modules), total_l))


if __name__ == "__main__":
    main()
