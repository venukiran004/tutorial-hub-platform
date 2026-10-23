# -*- coding: utf-8 -*-
"""Append a JS fragment as the last entry of a lesson's `blocks` array.

argv: <fragment file> <lesson file>

Finds the close of `blocks: [` by bracket matching (ignoring brackets inside
strings and template literals), adds a comma to the previous entry if it
needs one, and inserts the fragment before the close. Refuses to write if
the structure is not what it expects, so a surprise leaves the file alone.
"""
import io, os, sys

frag_path, lesson_path = sys.argv[1], sys.argv[2]
frag = io.open(frag_path, encoding='utf-8').read().strip('\n')
src = io.open(lesson_path, encoding='utf-8').read()

key = 'blocks: ['
start = src.index(key)
i = start + len(key) - 1          # at the '['
depth = 0
quote = None
while i < len(src):
    c = src[i]
    if quote:
        if c == '\\':
            i += 2
            continue
        if c == quote:
            quote = None
    elif c in '"\'`':
        quote = c
    elif c in '[{':
        depth += 1
    elif c in ']}':
        depth -= 1
        if depth == 0:
            break
    i += 1
assert depth == 0 and src[i] == ']', 'could not find the close of blocks'

head, tail = src[:i], src[i:]
stripped = head.rstrip()
if not stripped.endswith(','):
    head = stripped + ',\n'
else:
    head = stripped + '\n'

out = head + '\n' + frag + '\n\n  ' + tail.lstrip()
io.open(lesson_path, 'w', encoding='utf-8', newline='\n').write(out)
print('appended to blocks in', os.path.basename(lesson_path))
