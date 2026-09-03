# Enterprise Engineering Academy

A premium, UI-first learning platform. Lessons are **authored as structured interactive
components**, not as Markdown documents that get rendered. There is no build step, no
framework, and no Markdown in the delivery path.

Open `index.html` in a browser. It works from `file://` and from any static host.

---

## Why it is built this way

Markdown-driven documentation sites can only produce one thing: prose with code blocks.
A course needs components that carry *pedagogical meaning* — a "common trap" is not the
same object as an "engineering trade-off", an exercise must hide its solution until the
learner chooses to reveal it, and a knowledge check has to respond to an answer.

So a lesson is an array of typed blocks:

```js
EC.receiveLesson({
  id: "1.1",
  lede: "…",
  objectives: [ … ],
  blocks: [
    { t: "h2", n: "01", text: "The pipeline" },
    { t: "p",  text: "Ordinary prose with `inline code` and **emphasis**." },
    { t: "code", lang: "python", title: "example.py", code: `…`, out: `…` },
    { t: "viz", title: "…", caption: "…", svg: `<svg …>` },
    { t: "callout", kind: "trap", title: "…", body: [ … ] },
    { t: "ladder", rungs: [ {level:"bad"…}, {level:"ok"…}, {level:"best"…} ] },
    { t: "tabs", items: [ { label: "…", blocks: [ … ] } ] },
    { t: "exercise", title: "…", requirements: [ … ], solution: { … } }
  ],
  takeaways: [ … ],
  quiz:      { questions: [ … ] },
  interview: { questions: [ … ] }
});
```

Each block type renders to a component designed for that job. Because content is
structured rather than prose, the design stays consistent across every lesson and
every future course without anyone re-deciding what a callout looks like.

---

## Layout

```
enterprise-course/
├── index.html                     Academy home — all tracks
├── assets/
│   ├── css/
│   │   ├── system.css             Tokens, base, chrome, rail, command palette
│   │   ├── course.css             Course landing + curriculum components
│   │   └── lesson.css             Lesson block components
│   └── js/
│       ├── highlight.js           Syntax highlighter (python, bash, sql, toml, json)
│       ├── render.js              Block renderer + inline formatter + icon set
│       └── app.js                 Progress, rail, command palette, TOC, interactions
├── courses/
│   └── python/
│       ├── index.html             Course landing + full curriculum
│       ├── lesson.html            Lesson shell (reads ?id=)
│       ├── curriculum.js          The spine: modules, lessons, ordering
│       └── lessons/
│           ├── 01_foundations/    One folder per module, numbered so the
│           │   ├── 1.1.js         listing stays in curriculum order
│           │   └── ...
│           └── 02_core/
│               └── ...
└── .build/
    └── rendertest.js              Headless smoke test — run before pushing
```

A second course is a copy of `courses/python/` with its own `curriculum.js` and
`lessons/`. Nothing in `assets/` needs to change.

---

## Adding a lesson

1. Create `courses/<course>/lessons/<NN>_<module-id>/<id>.js` calling
   `EC.receiveLesson({ … })`. The folder name comes from `EC.lessonDir()` —
   the module's index (zero-padded) and its `id` from `curriculum.js`.
2. Run `node .build/sync-published.js`, which rewrites the `published: []`
   array from the files actually on disk.

That is the whole process. Until an id is in `published`, it renders as **soon** in the
rail and curriculum — so the full roadmap is visible from day one without ever promising
content that does not exist.

```bash
bash .build/check.sh              # syntax-check every file, then render every lesson
bash .build/ship.sh "message"     # the same gate, then commit only if it passes
```

`check.sh` runs `node --check` on every lesson before the render suite, which
catches the one failure mode that is invisible in review: a backtick inside a
lesson's Python code silently terminates the JavaScript template literal
holding it. CI runs the same gate before deploying.

---

## Design system

| | |
|---|---|
| **Colour** | One accent. Colour encodes meaning — difficulty, callout kind, diff polarity — never decoration. |
| **Depth** | Borders and three shadow levels. No gradient washes, no animated glow. |
| **Type** | Inter + JetBrains Mono. Hierarchy comes from size, weight and measure. |
| **Themes** | Dark default, light toggle, persisted. Code panels stay dark in both — one syntax palette, and code reads as a distinct medium. |
| **Difficulty** | `foundation` → `core` → `advanced` → `expert`, a deliberate cool-to-warm ramp readable without labels. |
| **A11y** | Visible focus rings, ARIA tablists with arrow-key navigation, `prefers-reduced-motion` honoured, body text at or above 4.5:1. |

Keyboard: <kbd>Ctrl/⌘ K</kbd> or <kbd>/</kbd> search · <kbd>j</kbd>/<kbd>k</kbd> next/previous lesson.

---

## Python curriculum

142 lessons across 17 modules, ~80 hours, in five phases. Ordered so that nothing is
used before it is taught — comprehensions come after loops *and* after functions-as-values;
testing comes before performance and concurrency, because you cannot safely optimise code
you cannot verify.

| Phase | Modules |
|---|---|
| **1 · Fundamentals** | L1 Foundations · L2 Core Data Structures · L3 Functions · L4 OOP |
| **2 · Craft** | L5 Pythonic Programming · L6 Errors & Logging · L7 Files, Modules & Packaging |
| **3 · Depth** | L8 Advanced Python · L9 Testing · L10 Performance · L11 Concurrency |
| **4 · Building systems** | L12 APIs & Backend · L13 Databases · L14 Production Python |
| **5 · Applied** | L15 Data, ML & AI Engineering |
| **Appendix** | A1 DSA · A2 Interview Preparation |

### Topic coverage

Content here is written from scratch. The previous `tutorial-hub` material was used only
as a **coverage checklist** — every topic it contained has a destination, and a large
amount that it lacked has been added.

| Previous module | Destination |
|---|---|
| Data Types & Variables | 1.4 · 1.5 · 1.7 · 1.8 |
| Strings | 1.6 · 5.11 |
| Lists / Tuples, Sets / Dictionaries | 2.1 · 2.2 · 2.3 · 2.4 · 2.8 |
| Control Flow | 2.6 · 2.7 · 2.11 · 5.5 |
| Functions & Scope | 3.1 · 3.2 · 3.3 · 3.9 |
| Lambda, Map, Filter, Reduce | 3.4 · 3.5 · 5.10 |
| Decorators & Closures | 3.6 · 3.7 · 8.2 |
| Generators & Iterators | 5.6 · 5.7 · 8.1 |
| OOP | 4.1 – 4.10 |
| Exception Handling | 6.1 – 6.3 · 6.5 |
| File I/O & Context Managers | 5.8 · 7.1 · 7.2 · 7.3 |
| Modules & Packages | 7.4 · 7.5 · 7.6 · 7.7 |
| Regular Expressions | 5.11 |
| Collections Module | 5.9 |
| Concurrency | 11.1 – 11.8 |
| Memory & PVM · Memory Leaks | 1.1 · 8.8 · 8.9 · 10.3 |
| Best Practices · PEP 8 | 5.1 · 5.2 · 5.3 · 5.12 · 10.5 |
| Modern Features | 5.4 · 5.5 · 8.3 · 8.4 |
| Design Patterns · SOLID | 4.11 · 4.12 |
| Testing & Debugging | 6.6 · 9.1 – 9.8 · 14.9 |
| NumPy · Pandas | 15.1 · 15.2 · 15.3 |
| FastAPI · Pydantic | 12.3 – 12.7 · 15.7 |
| DSA | 16.1 – 16.6 · 10.1 |
| Backend Web Concepts | 12.1 · 12.2 · 12.6 |
| Database & ORM | 13.1 – 13.7 |
| Standard Library | 7.7 · 5.9 · 5.10 · 8.7 |
| Python Tooling | 1.3 · 7.6 · 14.4 · 14.6 |
| API Consumption & Webhooks | 12.2 · 12.7 |
| Auth & Security | 12.8 · 14.7 · 7.3 |
| Production Scenarios | 14.1 – 14.10 |
| Interview Bank | 17.1 – 17.4, plus an interview lens inside every lesson |

**Added, with no equivalent before:** the execution model as lesson one; observability;
configuration and secrets; Docker and CI/CD; deployment and runtime; supply-chain
security; testability and design-for-test; profiling methodology; API design and
versioning; transactions and isolation; migrations and pooling; reproducibility; model
serving; GenAI application engineering; and the *Bad → Better → Production* refactoring
ladder that runs through the course.

---

## Deploying

Push to `main`. The GitHub Actions workflow runs the smoke test, then publishes to
GitHub Pages. Set **Settings → Pages → Source** to *GitHub Actions*.
