/* ============================================================================
   LESSON 2.11 — Comprehensions
   ========================================================================= */
EC.receiveLesson({
  id: "2.11",

  lede: "A comprehension is a **declaration of what you want**, where a loop is a set of instructions for building it. That difference is why `[x.name for x in users if x.active]` reads faster than the five-line equivalent — and why a comprehension with three clauses and a nested conditional reads slower than the loop it replaced. This lesson covers both directions.",

  objectives: [
    "Write list, dict and set comprehensions fluently, including conditions",
    "Recognise the line past which a comprehension should go back to being a loop",
    "Use generator expressions to avoid building intermediate collections",
    "Explain the scoping rules that make comprehensions safe",
    "Avoid the nesting and side-effect misuses"
  ],

  prerequisites: ["2.7", "2.10"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The four forms", id: "forms" },

    {"kind": "compare", "title": "The four comprehension forms", "caption": "Same clause order in all four: expression, then for, then if. Brackets choose the result type; parentheses build a lazy generator that yields one item at a time.", "columns": [{"title": "[x*2 for x in xs]", "tone": "accent", "items": ["list — eager", "most common"]}, {"title": "{x for x in xs}", "tone": "good", "items": ["set — dedupes", "unordered"]}, {"title": "{k: v for k, v in ps}", "tone": "violet", "items": ["dict", "last key wins"]}, {"title": "(x for x in xs)", "tone": "warn", "items": ["generator — lazy", "one pass only"]}], "t": "diagram", "id": "dg-2_11-01-0"},





    { t: "viz",
      title: "Reading a comprehension in the order it executes",
      caption: "Written output-first, executed loop-first. Reading it in execution order — for, then if, then the expression — is what makes a nested one tractable.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="A list comprehension annotated with its reading order versus its execution order">
  <text x="40" y="64" class="s-label" style="fill:var(--ink-2)">[  f(x)</text>
  <text x="190" y="64" class="s-label" style="fill:var(--ink-2)">for x in items</text>
  <text x="400" y="64" class="s-label" style="fill:var(--ink-2)">if keep(x)  ]</text>

  <g style="stroke:var(--good);stroke-width:2">
    <path d="M250 78 L250 108 L110 108 L110 82" fill="none" marker-end="url(#cp-a)"/>
  </g>
  <circle cx="250" cy="92" r="12" style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2"/>
  <text x="245" y="97" class="s-sub" style="fill:var(--good)">1</text>
  <circle cx="455" cy="92" r="12" style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2"/>
  <text x="450" y="97" class="s-sub" style="fill:var(--good)">2</text>
  <circle cx="110" cy="92" r="12" style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2"/>
  <text x="105" y="97" class="s-sub" style="fill:var(--good)">3</text>

  <text x="40" y="146" class="s-sub" style="fill:var(--ink-3)">execution order: iterate, filter, then build</text>

  <rect x="40" y="162" width="800" height="50" rx="7" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)" stroke-width="2"/>
  <text x="58" y="184" class="s-sub" style="fill:var(--ink-2)">nested: [c for row in grid for c in row]  — the loops read left to right, exactly as nested for statements would</text>
  <text x="58" y="204" class="s-sub" style="fill:var(--crit)">swap them and you get a NameError, because row must exist before c can use it</text>
</svg>`
    },
    { t: "code", lang: "python", title: "same syntax, four results", code: `
users = [
    {"name": "ada", "role": "admin", "active": True},
    {"name": "grace", "role": "editor", "active": True},
    {"name": "alan", "role": "editor", "active": False},
]

# list -- an ordered collection
names = [u["name"] for u in users if u["active"]]

# set -- deduplicated, unordered
roles = {u["role"] for u in users}

# dict -- key: value
by_name = {u["name"]: u["role"] for u in users}

# generator -- lazy, produces on demand, nothing materialised
lengths = (len(u["name"]) for u in users)

print(names)
print(roles)
print(by_name)
print(lengths, sum(lengths))
`,
      out: `['ada', 'grace']
{'admin', 'editor'}
{'ada': 'admin', 'grace': 'editor', 'alan': 'editor'}
<generator object <genexpr> at 0x...> 12`
    },

    { t: "p", text: "The structure is always the same: **output expression**, then `for`, then optional `if`. Reading it aloud in that order — *\"the name of each user, for each user, if the user is active\"* — is how the syntax stops feeling backwards." },

    { t: "callout", kind: "trap", title: "The generator is consumed once", body: [
      { t: "code", lang: "python", title: "the surprise", numbered: false, code: `
lengths = (len(u["name"]) for u in users)

print(sum(lengths))    # 12
print(sum(lengths))    # 0  -- already exhausted
print(list(lengths))   # []`},
      { t: "p", text: "A generator is an iterator, not a collection. Once consumed it is empty, and it does not raise — it quietly yields nothing. This is the most common generator bug, and it appears when a value is passed to two functions that each iterate it. If you need it twice, materialise it with `list()` — deliberately." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Conditions, and where they go", id: "conditions" },

    { t: "code", lang: "python", title: "filtering versus transforming", code: `
values = [1, -2, 3, -4]

# if at the END filters: which elements to include
positives = [v for v in values if v > 0]

# if/else BEFORE the for transforms: every element, two ways
signs = ["+" if v > 0 else "-" for v in values]

# both together -- filter, then transform what survives
labels = ["big" if v > 2 else "small" for v in values if v > 0]

print(positives)
print(signs)
print(labels)
`,
      out: `[1, 3]
['+', '-', '+', '-']
['small', 'big']`,
      caption: "The position is the meaning. A trailing `if` decides **whether** an element appears; a leading `if/else` decides **what** it becomes. Mixing them up is the most common comprehension error — and a filtering `if` with an `else` is a syntax error, which is a helpful accident."
    },

    /* ================================================================== */
    { t: "h2", n: "03", text: "Where a comprehension stops helping", id: "limits" },

    {"kind": "compare", "title": "When a comprehension stops helping", "caption": "A comprehension is for building one collection from one iterable with at most one condition. Side effects, nested logic and three-level nesting belong in a loop, where a reader can breathe.", "columns": [{"title": "keep the comprehension", "tone": "good", "items": ["[f(x) for x in xs if ok(x)]", "one input, one output", "fits on a line or two"]}, {"title": "write the loop", "tone": "warn", "items": ["calls with side effects", "try/except per item", "two nested fors with conditions", "when you needed a comment"]}], "t": "diagram", "id": "dg-2_11-03-1"},

    { t: "ladder",
      title: "Building a report from nested order data",
      rungs: [
        { level: "bad", label: "One comprehension doing everything", why: "unreadable in either direction",
          code: `report = {
    o["customer"]["id"]: [
        (i["sku"], Decimal(i["price"]) * i["qty"])
        for i in o.get("items", [])
        if i.get("sku") and i.get("price")
    ]
    for o in orders
    if o.get("customer") and o.get("status") == "paid"
}`,
          note: "Technically one expression. To understand it you must read outside-in for the dict, then inside-out for the list, holding two loop variables and four conditions at once. Debugging it means rewriting it as a loop first — which is the tell that it should have been one." },

        { level: "ok", label: "Split into named steps", why: "each step is checkable",
          code: `paid = [
    o for o in orders
    if o.get("customer") and o.get("status") == "paid"
]

def line_items(order: dict) -> list[tuple[str, Decimal]]:
    return [
        (i["sku"], Decimal(i["price"]) * i["qty"])
        for i in order.get("items", [])
        if i.get("sku") and i.get("price")
    ]

report = {o["customer"]["id"]: line_items(o) for o in paid}`,
          note: "Three named things, each readable alone and testable alone. `line_items` can be unit-tested against one order; the filter can be inspected. Same result, and a failure now points at a specific step." },

        { level: "best", label: "A loop where the logic is genuinely branchy", why: "honest about complexity",
          code: `def build_report(orders: Iterable[dict]) -> dict[str, list[LineItem]]:
    report: dict[str, list[LineItem]] = defaultdict(list)

    for order in orders:
        customer = order.get("customer")
        if not customer or order.get("status") != "paid":
            continue

        for item in order.get("items", []):
            sku, price = item.get("sku"), item.get("price")
            if not sku or price is None:
                logger.warning("skipping item without sku/price in %s", order["id"])
                continue
            report[customer["id"]].append(
                LineItem(sku, Decimal(price) * item["qty"])
            )

    return dict(report)`,
          note: "Once you need logging on the skip path, error attribution, or any branch that is not a simple filter, a comprehension cannot express it — and forcing it to produces the first version. The loop is not a failure to be clever; it is the correct construct for logic with more than one outcome per element." }
      ]
    },

    { t: "callout", kind: "good", title: "A usable rule", body: [
      { t: "p", text: "Keep a comprehension when it has **one `for`, at most one `if`, and fits on one or two lines**. Beyond that, ask what it is doing:" },
      { t: "ul", items: [
        "**Two `for` clauses** — acceptable when flattening a nested list, unclear for anything else.",
        "**Two or more `if` clauses** — extract a named predicate function. `if is_eligible(u)` reads better than three chained conditions.",
        "**A nested comprehension inside the output expression** — extract it to a named function, as in the middle rung above.",
        "**Any branch that logs, raises or does more than filter** — use a loop."
      ]},
      { t: "p", text: "The question is never \"can this be a comprehension\". It is **\"does a reader understand this faster than the loop?\"**" }
    ]},

    { t: "code", lang: "python", title: "nested loops, read left to right", code: `
matrix = [[1, 2], [3, 4], [5, 6]]

# Flattening: the for clauses read in the SAME order as nested loops
flat = [value for row in matrix for value in row]
print(flat)

# Equivalent to:
#   for row in matrix:
#       for value in row:
#           flat.append(value)

# But a nested comprehension in the OUTPUT position reads inside-out:
transposed = [[row[i] for row in matrix] for i in range(2)]
print(transposed)
`,
      out: `[1, 2, 3, 4, 5, 6]
[[1, 3, 5], [2, 4, 6]]`,
      caption: "Two `for` clauses read top-to-bottom like nested loops. A comprehension nested in the output expression reads inside-out — which is why the transpose version is harder, and why `list(zip(*matrix))` is the better way to write it."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "Generator expressions", id: "generators" },

    { t: "code", lang: "python", title: "drop the brackets, drop the memory", code: `
import sys

# A list comprehension builds everything, now
squares_list = [x * x for x in range(1_000_000)]
print(sys.getsizeof(squares_list))

# A generator expression builds nothing until asked
squares_gen = (x * x for x in range(1_000_000))
print(sys.getsizeof(squares_gen))

# When a generator is the only argument, the brackets are optional
print(sum(x * x for x in range(1_000_000)))
`,
      out: `8448728
200
333332833333500000`
    },

    { t: "callout", kind: "insight", title: "When each is right", body: [
      { t: "table",
        head: ["Use a list comprehension", "Use a generator expression"],
        rows: [
          ["You need the result more than once", "You consume it once"],
          ["You need `len()`, indexing or slicing", "You only iterate"],
          ["The collection is small", "The source is large or unbounded"],
          ["You are returning it from a function", "You are feeding `sum`, `any`, `max`, a `for` loop"]
        ]
      },
      { t: "p", text: "The most consequential case is feeding another function. `sum([...])` builds the entire list and then adds it up; `sum(...)` adds as it goes, in constant memory. For a million rows that is the difference between 8 MB and 200 bytes — and for a file or a cursor it is the difference between streaming and an OOM kill." }
    ]},

    { t: "callout", kind: "warn", title: "Never use a comprehension for side effects", body: [
      { t: "code", lang: "python", title: "shorter and worse", numbered: false, code: `
[send_email(u) for u in users]      # builds a list of None nobody wants
{log(u) for u in users}             # same, plus deduplication of None

for u in users:                     # correct
    send_email(u)`},
      { t: "p", text: "Two problems. It allocates a collection that is immediately discarded — irrelevant for ten users, real for a million. And it misstates the intent: a comprehension announces *\"I am building a collection\"*, so a reader has to work out that the result is meaningless. When the body does work rather than producing a value, use a `for` statement." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Scope", id: "scope" },

    { t: "code", lang: "python", title: "the loop variable does not leak", code: `
x = "unchanged"
squares = [x * x for x in range(3)]
print(x)                      # the comprehension had its own scope

# Contrast with a plain loop, which does leak:
for y in range(3):
    pass
print(y)
`,
      out: `unchanged
2`,
      caption: "Comprehensions run in their own scope (a Python 3 change), so the loop variable cannot clobber a name you were using. A regular `for` loop shares the enclosing scope, which is why its variable survives — and occasionally causes a bug."
    },

    { t: "callout", kind: "trap", title: "The one place the walrus operator leaks deliberately", body: [
      { t: "code", lang: "python", title: "assignment expressions escape the comprehension", numbered: false, code: `
# := binds in the ENCLOSING scope, which is how you keep the last value
values = [y := f(x) for x in data]
print(y)        # the final computed value -- deliberately visible

# The genuinely useful pattern: compute once, filter and use
results = [r for x in data if (r := expensive(x)) is not None]`,
        caption: "Without the walrus, filtering on a computed value means computing it twice — once in the `if` and once in the output. Lesson 5.4 covers assignment expressions properly."}
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Convert, then convert back",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Two-part exercise, and the second part is the one that teaches judgement." },
        { t: "p", text: "First convert four loops into comprehensions. Then take a comprehension that has grown too clever and convert it back into readable code — deciding for yourself where the line sits." }
      ],
      requirements: [
        "**Part A** — convert four loops to comprehensions: a filtered list, a lookup dict, a set of distinct values, and a `sum` over a transformation.",
        "For the `sum`, use a generator expression and explain what that saves.",
        "**Part B** — refactor the over-complex comprehension supplied below into something a reviewer would approve.",
        "Justify your Part B structure: which parts stayed comprehensions, which became functions, which became a loop, and why.",
        "Assert that each rewrite produces output identical to the original."
      ],
      hint: "For Part B, ask what each clause is doing. Filtering belongs in a comprehension; anything that needs to log, report or branch does not.",
      solution: {
        lang: "python",
        title: "comprehensions.py",
        code: `from collections import defaultdict
from decimal import Decimal

events = [
    {"id": 1, "type": "click", "user": "ada", "value": 3, "valid": True},
    {"id": 2, "type": "view", "user": "grace", "value": 1, "valid": True},
    {"id": 3, "type": "click", "user": "ada", "value": 5, "valid": False},
    {"id": 4, "type": "view", "user": "alan", "value": 2, "valid": True},
]

# ---- PART A ------------------------------------------------------------

# 1. filtered list
def a1_loop():
    out = []
    for e in events:
        if e["valid"]:
            out.append(e["id"])
    return out

def a1(): return [e["id"] for e in events if e["valid"]]


# 2. lookup dict
def a2_loop():
    out = {}
    for e in events:
        out[e["id"]] = e["user"]
    return out

def a2(): return {e["id"]: e["user"] for e in events}


# 3. distinct values
def a3_loop():
    out = set()
    for e in events:
        out.add(e["type"])
    return out

def a3(): return {e["type"] for e in events}


# 4. sum over a transformation -- generator, not list
def a4_loop():
    total = 0
    for e in events:
        if e["valid"]:
            total += e["value"] * 2
    return total

def a4(): return sum(e["value"] * 2 for e in events if e["valid"])
# No brackets: sum() consumes the values one at a time instead of
# building an intermediate list. Irrelevant for four events; the
# difference between streaming and an OOM kill for four million.


# ---- PART B ------------------------------------------------------------
#
# The original -- one expression, four responsibilities, unreviewable:
#
# report = {
#     u: sorted({e["type"] for e in events
#                if e["user"] == u and e["valid"] and e["value"] > 0})
#     for u in {e["user"] for e in events}
#     if any(e["user"] == u and e["valid"] for e in events)
# }
#
# It is also quadratic: the inner comprehension rescans every event for
# every user, and the "if any(...)" clause rescans again.

def b_original():
    return {
        u: sorted({e["type"] for e in events
                   if e["user"] == u and e["valid"] and e["value"] > 0})
        for u in {e["user"] for e in events}
        if any(e["user"] == u and e["valid"] for e in events)
    }


def is_countable(event: dict) -> bool:
    """A named predicate beats three chained conditions inline."""
    return event["valid"] and event["value"] > 0


def b_refactored() -> dict[str, list[str]]:
    """Group event types by user, keeping only countable events.

    One pass instead of three nested scans, and each step is nameable.
    """
    by_user: defaultdict[str, set[str]] = defaultdict(set)

    # A loop, because we are ACCUMULATING into a structure -- and because
    # this is where a "skipped event" log line would go if we needed one.
    for event in events:
        if is_countable(event):
            by_user[event["user"]].add(event["type"])

    # A comprehension, because this step IS a pure transformation.
    return {user: sorted(types) for user, types in by_user.items()}


# ---- WHY THIS SPLIT ----------------------------------------------------
#
# LOOP for the grouping. It accumulates into a mutable structure, it is
#   the natural place for a log line on the skip path, and it visits each
#   event exactly once -- where the original rescanned per user.
#
# NAMED FUNCTION for the predicate. "is_countable" states the rule once;
#   three inline conditions state it in two places and can drift apart.
#
# COMPREHENSION for the final map. It is a pure one-to-one transformation
#   with no branching -- exactly what comprehensions are for.


if __name__ == "__main__":
    assert a1_loop() == a1()
    assert a2_loop() == a2()
    assert a3_loop() == a3()
    assert a4_loop() == a4()
    assert b_original() == b_refactored()
    print(b_refactored())`,
        notes: [
          { t: "p", text: "**Part B's original is not just unreadable — it is quadratic.** The inner comprehension rescans every event for every user, and the `if any(...)` scans again. The refactored version visits each event once. That is a common property of over-nested comprehensions: forcing everything into one expression usually means recomputing the same scan." },
          { t: "p", text: "**The split is the answer, not \"use a loop\" or \"use a comprehension\".** Grouping accumulates into a mutable structure, so it is loop work. The final map is a pure transformation with no branching, so it is comprehension work. Using each construct for what it is good at produces code that is both shorter and clearer than committing to either one." },
          { t: "p", text: "**`is_countable` is worth extracting even though it is one line.** It gives the rule a name, puts it in one place, and makes it independently testable. Three inline conditions repeated across the codebase drift apart — one place adds a check the others do not." },
          { t: "callout", kind: "insight", title: "The reviewer's question", body: [
            { t: "p", text: "When you find yourself mentally rewriting a comprehension as a loop in order to understand it, that is the signal. The construct exists to make intent visible; if a reader has to translate it back into instructions, it has failed at the only job it had." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A log-processing job runs out of memory on a 6 GB file. The code reads the file line by line — correctly — and the failing line is `matches = [parse(line) for line in log_file if is_error(line)]`." },
      { t: "p", text: "**The file was being streamed; the comprehension undid it.** Reading lazily is pointless if the first thing you do is materialise every match into a list. Only 0.1% of lines are errors, but 6 GB of parsing still produced enough objects to exhaust memory before the count was ever taken." },
      { t: "p", text: "**Removing two brackets fixes it** — `matches = (parse(line) for line in log_file if is_error(line))` — provided the consumer only iterates once. If the code needs both a count and the matches themselves, that requires a decision: either two passes over the file, or accumulate only what is actually needed (a `Counter` of error types rather than every parsed object)." },
      { t: "p", text: "The habit: **a comprehension is a materialisation point.** In a pipeline meant to stream, every `[...]` is a place where the whole dataset lands in memory, and it is worth asking at each one whether the collection is genuinely needed. Lesson 5.7 covers keeping a pipeline lazy end to end." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "The structure is always **output expression → `for` → optional `if`**. Read it in that order and the syntax stops feeling backwards.",
    "**Position determines meaning:** a trailing `if` filters which elements appear; a leading `if/else` transforms every element.",
    "Keep it to **one `for`, at most one `if`, one or two lines**. Beyond that, extract a named predicate or an inner function.",
    "Two `for` clauses read top-to-bottom like nested loops; a comprehension nested in the *output* position reads inside-out and is much harder.",
    "**Use a loop when the body does more than filter and transform** — logging a skipped record, attributing an error, or branching to more than one outcome.",
    "**Generator expressions build nothing until consumed.** `sum(x for x in ...)` streams; `sum([x for x in ...])` materialises everything first.",
    "A generator is consumed once and then silently yields nothing. Materialise with `list()` if you need it twice.",
    "**Never use a comprehension for side effects.** It allocates a collection nobody wants and tells the reader you are building one.",
    "Comprehensions have their own scope, so the loop variable cannot clobber an outer name — unlike a plain `for` loop.",
    "Over-nested comprehensions are frequently **quadratic**, because forcing one expression usually means rescanning the same data.",
    "In a streaming pipeline, **every `[...]` is a materialisation point** where the whole dataset lands in memory."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the difference between `[x for x in xs if p(x)]` and `[x if p(x) else None for x in xs]`?",
        options: [
          "They are equivalent; the second is more explicit",
          "The first filters — only matching elements appear. The second transforms — every element appears, as itself or as `None`",
          "The second raises a `SyntaxError`",
          "The first is lazy, the second is eager"
        ],
        answer: 1,
        why: "Position is meaning. A trailing `if` decides *whether* an element is included, so the output can be shorter than the input. A leading `if/else` decides *what* each element becomes, so the output is always the same length. Confusing them is the most common comprehension error — usefully, a filtering `if` cannot take an `else`, so that direction is a `SyntaxError` rather than a silent bug."
      },
      {
        stem: "A job streams a 6 GB log file line by line but is OOM-killed on `matches = [parse(line) for line in f if is_error(line)]`. Why?",
        options: [
          "The file object buffers the entire file when iterated in a comprehension",
          "The list comprehension materialises every match into memory, undoing the streaming",
          "`parse` leaks memory on each call",
          "Comprehensions cannot be used with file objects"
        ],
        answer: 1,
        why: "The file was being read lazily and the comprehension immediately collected every result into a list. Reading lazily achieves nothing if the first thing you do is materialise. Dropping the brackets makes it a generator expression that streams — provided the consumer iterates once. If both a count and the matches are needed, that requires a deliberate choice between two passes and accumulating only what is required."
      },
      {
        stem: "Why is `[send_email(u) for u in users]` worse than the equivalent `for` loop?",
        options: [
          "It is slower because comprehensions have interpreter overhead",
          "It allocates a list of `None` values that is immediately discarded, and it tells the reader a collection is being built when none is wanted",
          "`send_email` cannot be called from inside a comprehension",
          "The list will keep the user objects alive and prevent garbage collection"
        ],
        answer: 1,
        why: "A comprehension exists to build a collection, so using one for side effects both wastes an allocation and misstates the intent — a reader has to work out that the result is meaningless. Comprehensions are in fact marginally *faster* than equivalent loops, which is exactly why the misuse is tempting. When the body performs an action rather than producing a value, a `for` statement is the honest construct."
      },
      {
        stem: "After `squares = [x * x for x in range(3)]`, what is the value of `x` in the enclosing scope?",
        options: [
          "`2` — the last value of the loop variable",
          "Whatever it was before; comprehensions run in their own scope and do not leak the loop variable",
          "`None`, because the variable is deleted after the comprehension",
          "It raises `NameError` unless `x` was defined earlier"
        ],
        answer: 1,
        why: "Comprehensions have their own scope in Python 3, so the loop variable cannot clobber an outer name of the same name — a deliberate change from Python 2. A plain `for` loop *does* share the enclosing scope, so its variable survives with the last value. The exception is the walrus operator, which binds in the enclosing scope on purpose."
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
        q: "When would you use a comprehension instead of a loop?",
        strong: "When the operation is a pure filter-and-transform — one `for`, at most one `if`, fitting on a line or two. Beyond that, or when the body needs to log, raise or branch to more than one outcome, a loop expresses it better.",
        answer: [
          { t: "p", text: "The framing that distinguishes a considered answer: a comprehension declares *what* you want, a loop describes *how* to build it. That is why the simple case reads faster and the complex case reads slower." },
          { t: "p", text: "Naming the boundary concretely helps — two or more `if` clauses means extracting a named predicate, and a comprehension nested in the output expression means extracting an inner function." },
          { t: "p", text: "The observation that lands best: if you find yourself mentally rewriting a comprehension as a loop in order to understand it, it has failed at the only job it had." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between a list comprehension and a generator expression?",
        strong: "Brackets versus parentheses. The list builds every element immediately and holds them all in memory; the generator produces values on demand and holds only the current one. The generator is consumed once and then yields nothing.",
        answer: [
          { t: "p", text: "The practical consequence matters more than the definition: `sum([x for x in huge])` materialises the whole collection before adding anything, while `sum(x for x in huge)` adds as it goes in constant memory." },
          { t: "p", text: "The single-consumption property is the bug worth naming — passing a generator to two functions that each iterate it means the second silently sees nothing. It does not raise, which is what makes it hard to spot." },
          { t: "p", text: "A good close is the streaming point: in a pipeline meant to stream, every `[...]` is a materialisation point where the whole dataset lands in memory. Reading a file lazily achieves nothing if the next line collects every result into a list." }
        ]
      },
      {
        level: "advanced",
        q: "You find a deeply nested comprehension in review. How do you respond?",
        strong: "Ask whether it is doing more than one thing, and split it. Filtering and mapping are comprehension work; grouping and accumulation are loop work; a complex condition should be a named predicate. Very often the nested version is also quadratic, because forcing one expression means rescanning the same data.",
        answer: [
          { t: "p", text: "The performance observation is the one that turns a style comment into a substantive review, and it is genuinely common — a nested comprehension that filters an inner collection per outer element rescans it every time." },
          { t: "p", text: "The constructive framing is to propose the split rather than just objecting: which part stays a comprehension, which becomes a named function, which becomes a loop. \"This is hard to read\" is an opinion; \"this is three responsibilities and it rescans the events per user\" is actionable." },
          { t: "p", text: "It is worth acknowledging that the author was usually optimising for something real — they wanted one expression rather than scattered mutable state. The answer is not to abandon that instinct but to place the boundary where each construct is strongest." }
        ],
        weak: "Rejecting it purely on line length or on a personal preference for loops. Comprehensions are idiomatic and faster; the objection has to be about readability or complexity, with a concrete alternative attached."
      }
    ]
  }
});
