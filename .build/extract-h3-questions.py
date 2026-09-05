"""Questions written as a bare <h3> inside a q-a block.

interview.html carries two markup forms. The importer only ever knew the
first -- <article class="q"> -- so 294 questions written in the second form
were parsed as page furniture and never imported. This reads that second
form: an <h3> question heading, and everything up to the next <h3> as its
answer.
"""
import re, sys, json, importlib.util, pathlib

_spec = importlib.util.spec_from_file_location(
    "imp", str(pathlib.Path(__file__).with_name("import-practice.py")))
_imp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_imp)

PARTHEAD = re.compile(r'<div class="parthead"[^>]*>(?P<t>.*?)</div>', re.S)
ARTICLE = re.compile(r'<article class="q"[^>]*>.*?</article>', re.S)
QA = re.compile(r'<div class="q-a"[^>]*>(?P<body>.*?)</div>\s*(?=<div class="q-a"|<div class="parthead"|<section|</section|$)', re.S)
H3 = re.compile(r'<h3[^>]*>(?P<q>.*?)</h3>', re.S)


def extract(path):
    """-> [(part_title, question, blocks), ...] for the bare-h3 form only."""
    src = pathlib.Path(path).read_text(encoding="utf-8", errors="replace")

    # Mark part boundaries, then drop the article-form questions so only the
    # second form is left to walk.
    marks = [(m.start(), _imp.inline_text(m.group("t"))) for m in PARTHEAD.finditer(src)]

    def part_at(pos):
        cur = None
        for start, title in marks:
            if start <= pos:
                cur = title
            else:
                break
        return cur

    out = []
    for art in ARTICLE.finditer(src):
        pass                                   # kept for clarity; see below
    blanked = ARTICLE.sub(lambda m: " " * (m.end() - m.start()), src)

    for qa in QA.finditer(blanked):
        body, base = qa.group("body"), qa.start("body")
        heads = list(H3.finditer(body))
        if not heads:
            continue
        for i, h in enumerate(heads):
            q = _imp.inline_text(h.group("q"))
            if not q:
                continue
            end = heads[i + 1].start() if i + 1 < len(heads) else len(body)
            frag = body[h.end():end]
            frag = re.sub(r"<hr\s*/?>\s*$", "", frag.strip())
            blocks = _imp.to_blocks(frag)
            if not blocks:
                continue
            out.append((part_at(base + h.start()), q, blocks))
    return out


if __name__ == "__main__":
    rows = extract(sys.argv[1])
    print(json.dumps([{"part": p, "q": q, "body": b} for p, q, b in rows],
                     ensure_ascii=False))
