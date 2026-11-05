# Tutorial Hub

A UI-first learning platform. Lessons are **authored as structured interactive
components** — typed blocks in JavaScript — not as Markdown that gets rendered.
There is no build step, no framework, and no Markdown in the delivery path.

Open `index.html` in a browser. It works from `file://` and from any static host.

---

## What is here

Sixteen courses and 1,329 published lessons. The counts include each course's
practice and interview tracks, which is why the home page, counting the taught
track alone, can show a smaller number for the same course.

| Course | Modules | Published | Taught track |
|---|---:|---:|---:|
| **Python** | 24 | 183 | 145 |
| **Coding Practice** | 23 | 114 | problem sets |
| **Mathematics & Statistics** | 9 | 55 | 43 |
| **Data Handling** | 14 | 127 | 57 |
| **SQL** | 8 | 46 | 39 |
| **Data Structures & Algorithms** | 4 | 8 | 7 |
| **Machine Learning** | 23 | 133 | 67 |
| **Deep Learning** | 20 | 124 | 68 |
| **NLP & Transformers** | 10 | 75 | 68 |
| **GenAI & LLMs** | 13 | 176 | 176 |
| **LangChain & LangGraph** | 14 | 118 | 118 |
| **Model Context Protocol** | 5 | 16 | 16 |
| **MLOps & Deployment** | 19 | 37 of 79 | 37 |
| **System Design** | 15 | 63 of 78 | 63 |
| **Google ADK** | 12 | 52 | 52 |
| **Interview Experience** | 1 | 2 | 2 |

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
bash .build/check.sh    # syntax, published lists, render tests, every course
bash .build/ship.sh "…" # runs the gate, commits only if green
```

`AUTHORING.md` is the binding contract for what a lesson may contain.
