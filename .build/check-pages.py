# -*- coding: utf-8 -*-
"""Integrity check for the root index and every course's own two pages.

The lesson files are covered by check.sh; this covers the things around them,
which is where cloned-page mistakes hide. It found DSA's page carrying ADK's
five milestone cards and ADK's curriculum summary, and two badge collisions.

Per course:
  - index.html and lesson.html exist and name the right course
  - the "Course NN" badge exists and is unique across courses
  - every id in `published` has a lesson file, and every file is published
  - a lesson declared in `modules` but absent from `published` is reported as
    "coming soon" rather than as a problem, which is how the UI treats it
  - a hardcoded lesson count in the index prose matches `published`

Root index:
  - every live card's href resolves
  - every course directory has a card
  - a card's lesson count matches the course's LEARN track, since the cards
    count that and mention the practice and interview tracks separately

Usage: python -I .build/check-pages.py      (exit 1 on any problem)
"""
import html
import io
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSES_DIR = os.path.join(REPO, 'courses')

WORDS = {
    'seven': 7, 'eight': 8, 'fifteen': 15, 'forty-three': 43, 'forty-six': 46,
    'fifty-two': 52, 'fifty-five': 55, 'sixty-three': 63, 'sixty-eight': 68,
    'seventy-four': 74, 'seventy-five': 75, 'one hundred': 100,
}

problems = []
notes = []


def read(p):
    return io.open(p, encoding='utf-8', errors='replace').read()


def facts(course):
    t = read(os.path.join(COURSES_DIR, course, 'curriculum.js'))
    title = re.search(r'\n    title: "([^"]+)"', t)
    pub = re.search(r'published:\s*\[(.*?)\]', t, re.S)
    ids = re.findall(r'"([^"]+)"', pub.group(1)) if pub else []
    return {
        'title': title.group(1) if title else None,
        'published': ids,
        'learn': [i for i in ids if re.match(r'^\d', i)],
        'declared': re.findall(r'\{ id: "([^"]+)", title:', t),
    }


courses = sorted(d for d in os.listdir(COURSES_DIR)
                 if os.path.isdir(os.path.join(COURSES_DIR, d)))
F = {}
badges = {}

for c in courses:
    cdir = os.path.join(COURSES_DIR, c)
    F[c] = f = facts(c)

    for page in ('index.html', 'lesson.html'):
        if not os.path.exists(os.path.join(cdir, page)):
            problems.append('%-11s MISSING %s' % (c, page))
    if not os.path.exists(os.path.join(cdir, 'index.html')):
        continue

    idx = read(os.path.join(cdir, 'index.html'))
    les = read(os.path.join(cdir, 'lesson.html'))

    # Pages carry the title HTML-escaped, so compare unescaped.
    name = f['title']
    if name:
        for page, text in (('index.html', idx), ('lesson.html', les)):
            if name not in html.unescape(text):
                problems.append('%-11s %s does not name the course %r'
                                % (c, page, name))

    # The badge is either a `badge:` option or set on #hero-badge in JS.
    b = re.search(r'Course (\d+)\s*·', idx)
    if not b:
        problems.append('%-11s no "Course NN" badge' % c)
    else:
        badges.setdefault(b.group(1), []).append(c)

    on_disk = set()
    for root, _d, files in os.walk(os.path.join(cdir, 'lessons')):
        on_disk |= {fn[:-3] for fn in files if fn.endswith('.js')}
    pub = set(f['published'])
    for m in sorted(pub - on_disk):
        problems.append('%-11s published but no file: %s' % (c, m))
    for e in sorted(on_disk - pub):
        problems.append('%-11s file exists but not published: %s' % (c, e))

    soon = [i for i in f['declared'] if i not in pub]
    if soon:
        notes.append('%-11s %d lesson(s) declared and not yet published: %s'
                     % (c, len(soon), ', '.join(soon[:4]) +
                        (' ...' if len(soon) > 4 else '')))

    for m in re.finditer(r'All ([a-z]+(?:-[a-z]+)?) lessons are written', idx):
        claimed = WORDS.get(m.group(1))
        if claimed is None:
            problems.append('%-11s prose says "%s lessons" - unknown number'
                            % (c, m.group(1)))
        elif claimed != len(pub):
            problems.append('%-11s prose says %s (%d) lessons, published has %d'
                            % (c, m.group(1), claimed, len(pub)))

for n, cs in sorted(badges.items(), key=lambda kv: int(kv[0])):
    if len(cs) > 1:
        problems.append('%-11s Course %s claimed by: %s' % ('badges', n, ', '.join(cs)))

# ------------------------------------------------------------------ root index
root = read(os.path.join(REPO, 'index.html'))
live = re.findall(r'\{ t: "([^"]+)", ic: [^,]+, live: true, href: "([^"]+)"', root)
linked = set()
for title, href in live:
    if not os.path.exists(os.path.join(REPO, href.replace('/', os.sep))):
        problems.append('%-11s card %r -> %s does not exist' % ('root', title, href))
    m = re.match(r'courses/([^/]+)/', href)
    if m:
        linked.add(m.group(1))
for c in courses:
    if c not in linked:
        problems.append('%-11s course %r has no live card' % ('root', c))

for m in re.finditer(r'\{ t: "([^"]+)", ic: [^,]+, live: true, '
                     r'href: "courses/([^/]+)/index\.html",.*?meta: "([^"]*)"',
                     root, re.S):
    title, course, meta = m.groups()
    if course not in F:
        continue
    lm = re.search(r'(\d+)(?:\s+of\s+\d+)?\s+lessons', meta)
    if lm and int(lm.group(1)) != len(F[course]['learn']):
        problems.append('%-11s card %r says %s lessons, %s has %d in its learn track'
                        % ('root', title, lm.group(1), course, len(F[course]['learn'])))

# ---------------------------------------------------------------------- report
print('%d courses, %d live cards on the root index' % (len(courses), len(live)))
print()
for c in courses:
    print('  %-11s %-34s %3d published  %3d learn'
          % (c, (F[c]['title'] or '?')[:34], len(F[c]['published']), len(F[c]['learn'])))
if notes:
    print()
    for n in notes:
        print('  note: ' + n)
print()
if problems:
    print('PROBLEMS (%d):' % len(problems))
    for p in problems:
        print('  ' + p)
    sys.exit(1)
print('pages: ok')
