/* ============================================================================
   LESSON 2.7 — Loops: for, while, break, continue, else
   ========================================================================= */
EC.receiveLesson({
  id: "2.7",

  lede: "Python's `for` loop is not a counter. It is a **protocol** — it asks an object for an iterator and pulls values until there are none. That is why `for` works identically over a list, a file, a database cursor and a 10 GB stream, and why writing `for i in range(len(items))` is almost always a sign you have reached for the wrong construct.",

  objectives: [
    "Explain what `for` does mechanically, and why indexing is rarely needed",
    "Choose between `for` and `while` on the right criterion",
    "Use `break`, `continue`, and know what `else` on a loop actually means",
    "Iterate over multiple sequences, with indices, and in reverse — idiomatically",
    "Recognise the loop patterns that a built-in already implements"
  ],

  prerequisites: ["2.1", "2.3", "2.6"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "What `for` actually does", id: "the-protocol" },

    {"kind": "cycle", "title": "What `for` actually does", "caption": "for calls iter() once, then next() until StopIteration. Any object with __iter__ can be looped over; the loop never uses indices unless you ask for them with enumerate.", "nodes": [{"label": "iter(obj)", "sub": "once, at the start", "tone": "accent"}, {"label": "next(it)", "sub": "each pass", "tone": "good"}, {"label": "body runs", "sub": "with the yielded value"}, {"label": "StopIteration", "sub": "loop ends; else: runs", "tone": "warn"}], "t": "diagram", "id": "dg-2_7-01-0"},



    { t: "p", text: "A `for` loop is shorthand for a short conversation between two objects. Python calls `iter()` on whatever you gave it to obtain an **iterator**, then calls `next()` on that iterator repeatedly until it signals exhaustion by raising `StopIteration`." },

    { t: "code", lang: "python", title: "the loop, written out longhand", code: `
items = ["a", "b", "c"]

# What you write:
for item in items:
    print(item)

# What Python does:
iterator = iter(items)
while True:
    try:
        item = next(iterator)
    except StopIteration:
        break
    print(item)
`,
      caption: "Nothing in this conversation involves indices or a length. That is why the same loop works over a file, a generator, a socket or a database cursor — none of which have a length, and some of which are infinite."
    },

    { t: "viz",
      title: "One protocol, every source",
      caption: "Anything implementing __iter__ can be looped over. The loop does not know or care whether values come from memory, a disk, a network or a computation — which is what makes streaming a 10 GB file syntactically identical to iterating a three-item list.",
      svg: `<svg viewBox="0 0 900 240" role="img" aria-label="Diagram: many data sources feeding one iteration protocol consumed by a for loop">
  <defs>
    <marker id="a10" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">SOURCES</text>
  <g>
    <rect x="20" y="38" width="150" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="95" y="58" text-anchor="middle" class="s-mono" style="font-size:10px">list / tuple / set</text>
    <rect x="20" y="74" width="150" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="95" y="94" text-anchor="middle" class="s-mono" style="font-size:10px">dict (yields keys)</text>
    <rect x="20" y="110" width="150" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="95" y="130" text-anchor="middle" class="s-mono" style="font-size:10px">open file</text>
    <rect x="20" y="146" width="150" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="95" y="166" text-anchor="middle" class="s-mono" style="font-size:10px">generator</text>
    <rect x="20" y="182" width="150" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="95" y="202" text-anchor="middle" class="s-mono" style="font-size:10px">db cursor / socket</text>
  </g>

  <g style="stroke:var(--border-strong)" stroke-width="1.2">
    <line x1="170" y1="53" x2="292" y2="112" marker-end="url(#a10)"/>
    <line x1="170" y1="89" x2="292" y2="118" marker-end="url(#a10)"/>
    <line x1="170" y1="125" x2="292" y2="125" marker-end="url(#a10)"/>
    <line x1="170" y1="161" x2="292" y2="132" marker-end="url(#a10)"/>
    <line x1="170" y1="197" x2="292" y2="138" marker-end="url(#a10)"/>
  </g>

  <rect x="298" y="96" width="188" height="58" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="392" y="120" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">iter(obj)</text>
  <text x="392" y="140" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">next() ... StopIteration</text>

  <line x1="486" y1="125" x2="556" y2="125" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#a10)"/>

  <rect x="562" y="96" width="180" height="58" rx="9" class="s-fill s-stroke" stroke-width="1.5"/>
  <text x="652" y="120" text-anchor="middle" class="s-label">for x in obj:</text>
  <text x="652" y="140" text-anchor="middle" class="s-sub">identical code, any source</text>

  <text x="760" y="118" class="s-sub" style="fill:var(--good)">3 items or</text>
  <text x="760" y="134" class="s-sub" style="fill:var(--good)">3 billion — same</text>
  <text x="760" y="150" class="s-sub" style="fill:var(--good)">memory footprint</text>
</svg>`
    },

    { t: "callout", kind: "trap", title: "`for i in range(len(items))` is the wrong tool", body: [
      { t: "code", lang: "python", title: "four rewrites", numbered: false, code: `
# You need the value:
for i in range(len(items)):    # no
    print(items[i])
for item in items:             # yes
    print(item)

# You need the index too:
for i, item in enumerate(items):
    print(i, item)

# You need two sequences together:
for name, score in zip(names, scores):
    print(name, score)

# You need to modify in place -- the one case where the index is real:
for i, item in enumerate(items):
    items[i] = item.strip()`},
      { t: "p", text: "`range(len(...))` is not merely unidiomatic. It requires the object to have a length, which excludes generators, files and cursors, and it costs an extra index lookup per iteration. Reserve it for the genuine case: writing back into a sequence by position." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "for versus while", id: "for-vs-while" },

    { t: "dl", items: [
      ["Use `for`", "When you are consuming a **sequence of items** — known in advance or produced by something. This is the overwhelming majority of loops."],
      ["Use `while`", "When you are repeating until a **condition changes** and there is no natural sequence: polling, retrying, a REPL, consuming a queue that refills."]
    ]},

    { t: "code", lang: "python", title: "a while loop that is genuinely right", code: `
import time

def wait_for_ready(client, timeout: float = 30.0, interval: float = 0.5) -> None:
    """Poll until the service reports ready, or the deadline passes."""
    deadline = time.monotonic() + timeout

    while time.monotonic() < deadline:
        if client.is_ready():
            return
        time.sleep(interval)

    raise TimeoutError(f"not ready after {timeout}s")
`,
      caption: "There is no sequence here — the loop repeats until a condition flips. Note the two things every `while` needs: a **bounded exit** (the deadline, not just the success condition) and a **wait** so it does not spin the CPU."
    },

    { t: "callout", kind: "warn", title: "Every while loop needs a way to fail", body: [
      { t: "p", text: "`while True:` with a single `break` on success is a loop that hangs forever when the success condition never arrives. In a request handler that means a thread pinned until timeout; in a worker it means the job never finishes and never errors." },
      { t: "code", lang: "python", title: "add a bound", numbered: false, code: `
# Fragile: no exit if the queue never drains
while queue:
    process(queue.pop())

# Bounded: fails loudly rather than running forever
for _ in range(MAX_ITEMS):
    if not queue:
        break
    process(queue.pop())
else:
    raise RuntimeError(f"queue still non-empty after {MAX_ITEMS} items")`},
      { t: "p", text: "The bound can be attempts, a deadline, or a maximum count. Which one matters less than having one — an unbounded wait is a hang, and a hang is harder to diagnose than a crash." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "break, continue, pass", id: "break-continue" },

    {"kind": "flow", "title": "break, continue and the loop else", "caption": "else runs only when the loop finished without break — the 'search failed' branch. continue jumps to the next iteration; pass does nothing at all.", "cols": 4, "nodes": [{"id": "body", "label": "loop body"}, {"id": "cont", "label": "continue", "sub": "next iteration", "tone": "accent"}, {"id": "brk", "label": "break", "sub": "leave the loop, skip else", "tone": "crit"}, {"id": "els", "label": "else:", "sub": "ran to the end without break", "tone": "good"}], "edges": [["body", "cont"], ["body", "brk"], ["body", "els", "exhausted"]], "t": "diagram", "id": "dg-2_7-03-1"},



    { t: "code", lang: "python", title: "the three, and what each is for", code: `
for order in orders:
    if order.is_cancelled:
        continue                 # skip this item, keep looping

    if order.total > LIMIT:
        flagged = order
        break                    # stop entirely

# pass is a placeholder that does nothing -- it exists because Python
# needs a statement where a block is syntactically required.
class NotImplementedYet:
    pass

try:
    risky()
except TimeoutError:
    pass                         # deliberately ignoring -- see the note below
`,
      caption: "`continue` early is the loop equivalent of a guard clause: it removes a level of indentation from the rest of the body."
    },

    { t: "callout", kind: "warn", title: "A bare `pass` in an except block hides failures", body: [
      { t: "code", lang: "python", title: "say why", numbered: false, code: `
# Unreviewable: is this deliberate or forgotten?
except TimeoutError:
    pass

# Deliberate, and a reader can judge it:
except TimeoutError:
    # The cache is an optimisation; a slow backend should not fail the
    # request. The miss is recorded so the metric still moves.
    metrics.increment("cache.timeout")`},
      { t: "p", text: "Silencing an exception is sometimes correct. Silencing it *without a comment* is indistinguishable from having forgotten to handle it, and it is the most common way a real failure becomes invisible. Lesson 6.2 covers this in depth." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "The loop `else`", id: "loop-else" },

    { t: "p", text: "Loops can have an `else` clause. It runs **when the loop finishes without hitting `break`** — which is a genuinely useful thing to express, and a genuinely confusing keyword for it. Read it as `no_break:` and it becomes obvious." },

    { t: "code", lang: "python", title: "search, with a not-found branch", code: `
def find_admin(users):
    for user in users:
        if user.role == "admin":
            print(f"found {user.name}")
            break
    else:
        # Runs only if the loop completed without breaking
        raise LookupError("no admin in this group")
`,
      caption: "The alternative is a `found = False` flag set inside the loop and checked after it. The `else` removes the flag, and the flag was only ever there to record whether the loop broke."
    },

    { t: "code", lang: "python", title: "the retry pattern, which uses it well", code: `
import time

for attempt in range(1, 4):
    try:
        response = call_api()
        break
    except TimeoutError:
        wait = 2 ** attempt
        print(f"attempt {attempt} timed out, retrying in {wait}s")
        time.sleep(wait)
else:
    raise RuntimeError("all 3 attempts failed")

print(response)
`,
      hl: [11, 12],
      caption: "This is the clearest use of loop-`else` in practice: the `else` is *\"we exhausted every attempt\"*, which is exactly what \"finished without breaking\" means here."
    },

    { t: "callout", kind: "tradeoff", title: "Should you use it?", body: [
      { t: "p", text: "It is genuinely useful and genuinely obscure. Many experienced Python developers have to stop and think about what it means, which is a real cost in a shared codebase." },
      { t: "p", text: "**Reasonable positions:** use it for the retry and search patterns above, where it is idiomatic and a comment makes it clear; avoid it in code read by people new to Python. What you should not do is fail to *recognise* it — it appears in the standard library and in widely-used packages, and misreading it as \"runs at the end of the loop\" produces a serious misunderstanding of the code." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Loops a built-in already wrote", id: "builtins" },

    { t: "table",
      head: ["If your loop is doing this", "Use", "Lesson"],
      rows: [
        ["Accumulating a filtered/transformed list", "A comprehension", "2.11"],
        ["Counting occurrences", "`collections.Counter`", "2.3"],
        ["Grouping into lists by key", "`collections.defaultdict(list)`", "2.3"],
        ["Testing whether any/all items match", "`any()` / `all()`", "2.10"],
        ["Finding a max or min by a computed key", "`max(items, key=...)`", "2.10"],
        ["Summing", "`sum()`", "2.10"],
        ["Pairing two sequences", "`zip()`", "2.10"],
        ["Tracking an index", "`enumerate()`", "2.10"],
        ["Producing values lazily from a big source", "A generator", "5.7"],
        ["Processing in fixed-size chunks", "`itertools.batched`", "5.10"]
      ],
      caption: "Every row replaces a loop with something shorter that a reader recognises instantly. The value is not brevity — it is that a named operation says *what* is happening, where a loop only says *how*."
    },

    { t: "ladder",
      title: "\"Does any order exceed the limit?\"",
      rungs: [
        { level: "bad", label: "Flag variable", why: "five lines, and the flag can be misread",
          code: `has_large = False
for order in orders:
    if order.total > LIMIT:
        has_large = True
        break`,
          note: "Correct, and the reader has to execute it mentally to work out what `has_large` will be. Forgetting the `break` makes it slower but still correct, so the bug is silent." },

        { level: "ok", label: "Loop with early return", why: "clearer inside a function",
          code: `def has_large_order(orders) -> bool:
    for order in orders:
        if order.total > LIMIT:
            return True
    return False`,
          note: "Better — the function name states the intent, and there is no flag to track. Still four lines to express one idea." },

        { level: "best", label: "any() with a generator expression", why: "one line, short-circuits",
          code: `has_large = any(order.total > LIMIT for order in orders)`,
          note: "`any()` stops at the first true value exactly like the `break` did, and the generator expression means nothing is materialised. The line reads as its own specification. Use `all()` for the universal case, and note that `any([...])` with a list comprehension would evaluate everything first — the generator form is what preserves the short-circuit." }
      ]
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Rewrite five loops",
      difficulty: "foundation",
      minutes: 25,
      body: [
        { t: "p", text: "Each loop below works. Each is also a hand-written version of something Python already provides. Rewrite all five, then answer the harder question: which rewrite would you reject in review, and why?" },
        { t: "p", text: "Not every shortening is an improvement — that judgement is the point of the exercise." }
      ],
      requirements: [
        "Rewrite each of the five loops using the most appropriate built-in or idiom.",
        "Preserve behaviour exactly, including short-circuiting where the original had it.",
        "For each rewrite, name the property that makes it better than the original.",
        "Identify at least one case where the concise version is **worse**, and say why.",
        "Verify each pair produces identical output on the sample data."
      ],
      hint: "Look for: an index that is never used, a flag that only records whether a break happened, an accumulator that a built-in already implements, and a manual pairing of two sequences.",
      solution: {
        lang: "python",
        title: "rewrites.py",
        code: `from collections import Counter, defaultdict

orders = [
    {"id": 1, "customer": "ada", "total": 120, "status": "paid"},
    {"id": 2, "customer": "grace", "total": 45, "status": "pending"},
    {"id": 3, "customer": "ada", "total": 210, "status": "paid"},
]
names = ["ada", "grace", "alan"]
scores = [91, 88, 76]


# ---- 1 -----------------------------------------------------------------
def before_1():
    result = []
    for i in range(len(orders)):
        if orders[i]["status"] == "paid":
            result.append(orders[i]["total"])
    return result


def after_1():
    return [o["total"] for o in orders if o["status"] == "paid"]

# BETTER: no index, so it works on any iterable -- generators, files,
# cursors. The comprehension also states "build a list from these",
# where the loop only showed how.


# ---- 2 -----------------------------------------------------------------
def before_2():
    found = False
    for o in orders:
        if o["total"] > 200:
            found = True
            break
    return found


def after_2():
    return any(o["total"] > 200 for o in orders)

# BETTER: the flag existed only to record whether the loop broke.
# any() short-circuits identically. Note the generator expression --
# any([...]) would build the whole list before checking anything.


# ---- 3 -----------------------------------------------------------------
def before_3():
    counts = {}
    for o in orders:
        if o["customer"] in counts:
            counts[o["customer"]] += 1
        else:
            counts[o["customer"]] = 1
    return counts


def after_3():
    return Counter(o["customer"] for o in orders)

# BETTER: four lines of existence-checking become a named operation.
# Counter also brings most_common() and arithmetic for free.


# ---- 4 -----------------------------------------------------------------
def before_4():
    pairs = []
    for i in range(len(names)):
        pairs.append((names[i], scores[i]))
    return pairs


def after_4():
    return list(zip(names, scores, strict=True))

# BETTER: no index arithmetic, and strict=True (3.10+) RAISES if the
# sequences differ in length. The original silently truncates or raises
# IndexError depending on which list is shorter -- a real bug the
# rewrite converts into an explicit contract.


# ---- 5 -----------------------------------------------------------------
def before_5():
    best = None
    for o in orders:
        if best is None or o["total"] > best["total"]:
            best = o
    return best


def after_5():
    return max(orders, key=lambda o: o["total"])

# BETTER on readability. WORSE in one respect -- see the note below.


# ---- the case to reject in review --------------------------------------
#
# after_5 raises ValueError on an empty sequence, where before_5 returns
# None. If callers rely on the None, the "improvement" changes behaviour
# and the bug appears only when the input happens to be empty.
#
# Honest fix -- state the empty case explicitly rather than inheriting it:

def after_5_safe():
    return max(orders, key=lambda o: o["total"], default=None)


# A second candidate for rejection: rewriting a loop that does several
# things into a comprehension with side effects.
#
#   [send_email(u) for u in users]        # NO -- a list nobody wants
#   for u in users: send_email(u)         # yes -- a loop, doing loop work
#
# A comprehension exists to BUILD a collection. Using one for its side
# effects allocates a list of Nones and misleads every future reader.


if __name__ == "__main__":
    assert before_1() == after_1()
    assert before_2() == after_2()
    assert before_3() == after_3()
    assert before_4() == after_4()
    assert before_5() == after_5()
    print("all five equivalent")`,
        notes: [
          { t: "p", text: "**Rewrite 4 is the one that fixes a real bug.** `zip(names, scores)` silently stops at the shorter sequence — so a data-loading error that produced 3 names and 2 scores would quietly drop a record. `strict=True` turns that into a `ValueError`, converting silent data loss into a loud failure. Adding it should be reflexive." },
          { t: "p", text: "**Rewrite 5 is the one to challenge.** `max()` raises `ValueError` on an empty sequence where the original returned `None`. That is a behaviour change disguised as a cleanup, and it will surface the first time the input is empty — usually in production, usually at a quiet hour. `default=None` restores the contract explicitly, which is better than either version because the empty case is now stated rather than implied." },
          { t: "callout", kind: "insight", title: "The rule the exercise is really teaching", body: [
            { t: "p", text: "Concision is not the goal — **making the intent visible** is. `any(...)` is better than a flag because it names the question being asked, not because it is shorter." },
            { t: "p", text: "The counter-example matters just as much: a comprehension used for side effects is shorter *and* worse. It allocates a list of `None`s that nobody wants, and it tells the reader \"I am building a collection\" when the code is doing no such thing. When the loop body is doing work rather than producing a value, a `for` statement is the correct construct." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A data-import job reads a CSV with `rows = list(reader)` and then loops over it. It has worked for two years. A partner sends a 4 GB export and the job is killed by the OOM reaper before processing a single row." },
      { t: "p", text: "**The mechanism:** `list(reader)` materialises every row in memory before the loop begins. The loop itself was never the problem — the eager conversion was, and it was invisible because it is one word." },
      { t: "p", text: "**The fix is to delete the `list()`.** A `csv.reader` is already an iterator, and `for row in reader:` streams one row at a time in constant memory. This is the practical payoff of the protocol at the top of this lesson: the loop body does not change at all, because the loop never cared where values came from." },
      { t: "p", text: "The general habit worth forming: **be suspicious of `list()`, `.read()` and `.fetchall()` around anything whose size you do not control.** Each converts a stream into a memory footprint, and each is a single word that a reviewer's eye slides over. Lesson 5.7 covers building pipelines that stay lazy end to end." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**`for` is a protocol, not a counter.** It calls `iter()` then `next()` until `StopIteration` — which is why one loop body works over a list, a file, a generator or a cursor.",
    "`for i in range(len(items))` is the wrong tool. Use `enumerate` for an index, `zip` for parallel sequences, and plain `for item in items` otherwise — reserving the index form for writing back by position.",
    "Use `for` for a sequence of items; use `while` when repeating until a condition flips and there is no sequence.",
    "**Every `while` needs a bounded exit** — a deadline, an attempt count, a maximum. An unbounded wait is a hang, which is harder to diagnose than a crash.",
    "`continue` early is the loop's guard clause: it removes indentation from the rest of the body.",
    "**A bare `pass` in an `except` block is indistinguishable from a forgotten handler.** Say why you are silencing it.",
    "Loop `else` runs when the loop finished **without** `break`. Read it as `no_break:`. Its clearest use is the retry pattern, where it means \"all attempts exhausted\".",
    "**`any()` and `all()` with a generator expression short-circuit** exactly like a `break`, and they name the question being asked. `any([...])` with a list comprehension does not short-circuit.",
    "Always pass `strict=True` to `zip` unless truncation is intended — silent truncation on mismatched lengths is quiet data loss.",
    "`max()`/`min()` raise on an empty sequence where a hand-written loop often returned `None`. Pass `default=` to state the empty case explicitly.",
    "A comprehension used for side effects is shorter and worse. When the body does work rather than producing a value, use a `for` statement."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "When does the `else` clause of a `for` loop execute?",
        options: [
          "After every iteration completes, like a finally block",
          "When the loop finishes without executing a `break`",
          "Only when the iterable was empty",
          "When an exception is raised inside the loop body"
        ],
        answer: 1,
        why: "Read it as `no_break:`. It runs when the loop ran to exhaustion without breaking, which makes it the natural place for \"not found\" or \"all attempts failed\". It does run on an empty iterable — vacuously, since no `break` occurred — but that is not what it is for. Misreading it as \"runs at the end\" produces a serious misunderstanding of retry and search code in the standard library."
      },
      {
        stem: "Why is `any(x > 10 for x in items)` preferable to `any([x > 10 for x in items])`?",
        options: [
          "They are identical; the brackets are a style preference",
          "The generator expression short-circuits at the first true value, while the list comprehension evaluates every element before `any` sees anything",
          "The list comprehension raises on an empty sequence",
          "`any()` cannot accept a list argument"
        ],
        answer: 1,
        why: "A list comprehension is evaluated fully and then passed in, so every element is tested even though `any` will stop at the first true one. The generator is consumed lazily, so `any` stops as soon as it has an answer. On a large or expensive sequence the difference is substantial, and on an infinite one the list version never returns at all."
      },
      {
        stem: "A job does `rows = list(csv_reader)` then loops over `rows`. It is OOM-killed on a 4 GB file. What is the fix?",
        options: [
          "Process the list in chunks using slicing",
          "Remove the `list()` — a csv reader is already an iterator, so `for row in csv_reader:` streams in constant memory",
          "Increase the container's memory limit to accommodate the file",
          "Use `readlines()` instead, which is more memory-efficient"
        ],
        answer: 1,
        why: "`list()` materialises the entire file before the loop starts; the loop was never the problem. Because `for` works on the iterator protocol rather than on a length, deleting one word makes the job stream and the loop body needs no change at all. Slicing would require the list to exist first, and `readlines()` is also eager. The habit is to be suspicious of `list()`, `.read()` and `.fetchall()` around anything whose size you do not control."
      },
      {
        stem: "Replacing a manual loop with `max(orders, key=lambda o: o.total)` is proposed in review. What should you check?",
        options: [
          "Whether `max` is slower than the explicit loop for large inputs",
          "What happens on an empty sequence — `max` raises `ValueError` where the loop may have returned `None`",
          "Whether `key` functions are allowed by the style guide",
          "Nothing — it is a strictly equivalent simplification"
        ],
        answer: 1,
        why: "This is a behaviour change dressed as a cleanup. A hand-written \"track the best so far\" loop typically returns `None` for an empty input, while `max()` raises `ValueError`. If any caller relies on the `None`, the bug appears the first time the input happens to be empty. `max(..., default=None)` restores the contract and, better than either version, makes the empty case explicit."
      }
    ]
  },

  /* ==================================================================== */
  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What actually happens when Python executes a for loop?",
        strong: "It calls `iter()` on the object to get an iterator, then calls `next()` repeatedly until `StopIteration` is raised, binding each value to the loop variable. No indices and no length are involved, which is why the same loop works over a list, a file, a generator or a database cursor.",
        answer: [
          { t: "p", text: "Describing the protocol rather than the syntax is what the question is for, and it sets up everything else about iteration in Python." },
          { t: "p", text: "The practical consequence worth volunteering: because the loop never asks for a length, iterating a three-item list and streaming a 10 GB file are syntactically identical and have the same memory profile. That is also why `for i in range(len(x))` is a step backwards — it reintroduces a requirement the protocol had removed." },
          { t: "p", text: "If pressed further, this is the on-ramp to generators: any object implementing `__iter__` and `__next__` can be looped over, which is exactly what a generator function produces." }
        ]
      },
      {
        level: "core",
        q: "What does else do on a for loop?",
        strong: "It runs when the loop completes without hitting `break`. The clearest reading is `no_break:`. It is used for search-and-not-found and for retry loops, where the `else` means \"every attempt was exhausted\".",
        answer: [
          { t: "p", text: "This is a knowledge check with a judgement follow-up: *would you use it?*" },
          { t: "p", text: "A balanced answer earns more than an enthusiastic one. It removes a `found = False` flag that only ever recorded whether the loop broke — a genuine simplification. It is also obscure enough that many experienced developers pause over it, which is a real cost in a shared codebase." },
          { t: "p", text: "The position worth stating: whether or not you write it, you must be able to *read* it, because it appears in the standard library. Misreading it as \"runs at the end of the loop\" inverts the meaning of the code." }
        ]
      },
      {
        level: "advanced",
        q: "An import job is OOM-killed on a large file. The loop looks fine. Where do you look?",
        strong: "At what happens before the loop. `list(reader)`, `.read()`, `.readlines()` or `.fetchall()` materialise the whole source into memory first. The loop was never the problem — the eager conversion was, and removing it lets the same loop stream in constant memory.",
        answer: [
          { t: "p", text: "The interviewer wants to see that you distinguish the iteration from the materialisation, since they sit on adjacent lines and only one of them allocates." },
          { t: "p", text: "The generalisation is worth stating: any call that turns a stream into a container is a memory decision, and it is usually a single word that a reviewer's eye passes over. `list()`, `.read()`, `.fetchall()`, `pd.read_csv` without `chunksize` — same shape, same risk." },
          { t: "p", text: "A strong close is that the fix scales in both directions: once the pipeline is lazy end to end, the code no longer has a size limit at all, and there is no threshold to revisit when the next partner sends a bigger file." }
        ],
        weak: "Proposing more memory or manual chunking first. Both work around a constraint that one deleted word removes, and both leave the ceiling in place for the next larger input."
      }
    ]
  }
});
