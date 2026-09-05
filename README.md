# Tutorial Hub

A UI-first learning platform. Lessons are **authored as structured interactive
components** — typed blocks in JavaScript — not as Markdown that gets rendered.
There is no build step, no framework, and no Markdown in the delivery path.

Open `index.html` in a browser. It works from `file://` and from any static host.

---

## What is here

| Course | Modules | Lessons | Questions / problems |
|---|---:|---:|---:|
| **Python** | 24 | 177 | 1,074 interview questions |
| **Coding Practice** | 10 | 114 | 3,079 programming problems |

Python runs from execution model to production services, in five phases —
Fundamentals, Craft, Depth, Building systems, Applied — followed by an
algorithms appendix and eight interview modules.

Coding Practice is a separate course of programming problems, each with its
answer hidden until you ask for it.

## Why it is built this way

**Lessons are data, not documents.** Every lesson is an array of typed blocks —
`ladder`, `viz`, `callout`, `drill`, `exercise`, `quiz` — so the same idea
always looks the same, and the renderer decides how a thing is presented rather
than the author re-inventing it each time.

**Attempt before you read.** Every exercise solution and every answer is folded
away until you choose to reveal it.

**Bad → better → production.** The `ladder` block shows one problem solved three
times with the reasoning between the rungs made explicit, because the gap
between working and right is where the teaching is.

## Structure

```
index.html              home
assets/css              tokens, layout, the Aurora Glass theme
assets/js               renderer, syntax highlighter, page behaviour
courses/<id>/           one folder per course
  curriculum.js         modules and lesson metadata
  index.html            the course landing page
  lesson.html           the lesson shell
  lessons/<module>/     one file per lesson
.build/                 checks, importers, the ship gate
```

## Working on it

```bash
bash .build/check.sh    # syntax, published lists, render tests, both courses
bash .build/ship.sh "…" # runs the gate, commits only if green
```

`AUTHORING.md` is the binding contract for what a lesson may contain.
