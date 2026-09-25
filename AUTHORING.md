# Authoring contract

Read this **and** `courses/python/lessons/01_foundations/1.4.js` before writing anything.
1.4 is the reference lesson — match its depth, tone and structure.

---

## Hard rules — violating any of these breaks the build

### 1. Never put a backtick inside a template literal

Lesson files are JavaScript. Every `code:`, `out:`, `svg:` and `note:` value is a
template literal delimited by backticks. **A backtick inside Python code or a
Python docstring terminates the literal** and the file will not parse.

```
code: `
    """Allow at most `calls` per window."""     <-- BREAKS THE FILE
    """Allow at most this many per window."""   <-- correct
`
```

Use `'single quotes'` or `"double quotes"` inside Python code. Backticks are fine
in prose fields (`text:`, `caption:`, `note:`, `why:`) because those are ordinary
double-quoted JS strings — there they render as inline code, which is desirable.

### 2. Verify before you finish

```bash
bash .build/check.sh
```

This runs `node --check` on every file then renders every published lesson.
It must print `PASS - all checks green`. **Do not report success until it does.**

Do NOT edit `courses/python/curriculum.js` — the `published` array is regenerated
from disk by `.build/sync-published.js`, which `check.sh` calls.

### 3. One file per lesson, in the module's folder

`courses/python/lessons/<NN>_<module-id>/<lesson-id>.js`

The id must match the filename and the id in `curriculum.js` exactly.

---

## File shape

```js
/* ============================================================================
   LESSON 4.2 — Instance vs Class Attributes
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "...",              // 2-3 sentences. Say what is surprising or
                            // load-bearing, not what the topic is called.
                            // Use **bold** for the one key claim.

  objectives: [ ... ],      // 5 items, each starting with a verb the learner
                            // can perform: "Explain", "Predict", "Choose",
                            // "Diagnose". Never "Understand" or "Learn about".

  prerequisites: ["4.1"],   // lesson ids only, must exist in curriculum.js

  blocks: [ ... ],          // the lesson body — see block types below

  takeaways: [ ... ],       // 6-11 items. Each must be a claim that stands
                            // alone, with the mechanism, not a topic name.

  quiz: { title: "Knowledge check", questions: [ ... ] },   // 4 questions

  interview: { title: "Interview lens", sub: "Answer out loud before opening",
               questions: [ ... ] }                          // 3-4 questions
});
```

---

## Block types

```js
{ t: "h2", n: "01", text: "Section title", id: "slug", sub: "optional subtitle" }
{ t: "h3", text: "..." }
{ t: "p",  text: "Prose. `inline code`, **bold**, *italic*, [link](x.html)." }
//         Italic nests inside bold. An asterisk meant literally -- *args,
//         COUNT(*), 2 ** 3 -- goes in backticks, or it is read as markup.
{ t: "ul", items: ["...", "..."] }          // also "ol"
{ t: "dl", items: [["term", "definition"], ...] }
{ t: "table", head: ["A","B"], rows: [["1","2"]], caption: "..." }

{ t: "code", lang: "python", title: "filename.py", code: `...`,
  out: `...`,                // optional: rendered as an OUTPUT panel below
  hl: [3, 4],                // optional: highlight these 1-based lines
  numbered: false,           // optional: suppress line numbers
  caption: "..." }           // optional: prose below the block

{ t: "callout", kind: "insight" | "trap" | "tradeoff" | "warn" | "good"
              | "note" | "mental" | "scenario",
  title: "...", body: [ ...blocks... ] }

{ t: "ladder", title: "...", rungs: [
    { level: "bad",  label: "...", why: "short", code: `...`, note: "..." },
    { level: "ok",   label: "...", why: "...",   code: `...`, note: "..." },
    { level: "best", label: "...", why: "...",   code: `...`, note: "..." } ] }

{ t: "tabs", items: [ { label: "...", blocks: [ ...blocks... ] } ] }

{ t: "viz", title: "...", caption: "...", svg: `<svg viewBox="0 0 900 260" ...>` }

{ t: "disclose", summary: "...", tag: "hint", body: [ ...blocks... ] }

{ t: "exercise", kind: "Challenge", title: "...", difficulty: "core",
  minutes: 25, body: [ ...blocks... ], requirements: [ ... ], hint: "...",
  solution: { lang: "python", title: "x.py", code: `...`, out: `...`,
              notes: [ ...blocks... ] } }
```

Callout kinds carry meaning — use the right one:
`trap` a mistake people actually make · `tradeoff` no single right answer ·
`insight` how this appears in real systems · `mental` a model to hold ·
`warn` a hazard · `good` a practice to adopt · `scenario` a worked incident

---

## Required content per lesson

Every lesson must have **all** of:

- **1 diagram (`viz`) or 1 `ladder`** — preferably both. A diagram must show a
  real mechanism, never decoration. SVG must use the theme classes
  (`s-fill`, `s-fill-2`, `s-stroke`, `s-label`, `s-sub`, `s-mono`) and
  `var(--accent)`, `var(--crit)`, `var(--good)`, `var(--warn)` — never raw hex.
- **At least 2 callouts**, one of which is a `trap`.
- **1 `exercise`** with `requirements`, a `hint`, and a `solution` whose `notes`
  explain *why* the solution is shaped that way — not what it does.
- **1 `scenario` callout** as the final block: a realistic production incident,
  its mechanism, and the fix.
- **6-11 takeaways**, **4 quiz questions**, **3-4 interview questions**.

Quiz questions: 4 options, `answer` is the 0-based index, `why` is 60+ chars and
must explain why the *wrong* answers are wrong, not just why the right one is right.

Interview questions: `q`, `level` ("core" | "advanced" | "expert"), `strong` (what
a strong answer sounds like), `answer` (array of blocks — the coaching), and
optionally `weak` (what weak answers do).

---

## House style

- **British spelling** (behaviour, initialise, serialise, optimise).
- **Second person.** "You choose", not "the developer chooses" or "we choose".
- **No hedging.** State the mechanism. "This raises `TypeError`", not "this may
  cause issues".
- **Every claim earns its place.** No filler, no "as we saw earlier" padding,
  no restating the objectives as prose.
- **Cross-reference by lesson number** — "(Lesson 1.4)" — when building on
  earlier material. Check `curriculum.js` for the right number.
- **Code must be runnable and modern**: Python 3.11+, type hints where they add
  information, `pathlib` not `os.path`, `Decimal` for money, f-strings.
- **Realistic examples.** Orders, users, requests, deploys, log lines. `foo`
  and `bar` only where the point is genuinely abstract.
- **Prefer showing a failure** to describing one. Show the traceback.

Length: 350-500 lines per lesson file. Depth over breadth — a lesson that
explains four things properly beats one that lists twelve.
