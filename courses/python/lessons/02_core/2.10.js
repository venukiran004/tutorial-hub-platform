/* ============================================================================
   LESSON 2.10 — The Built-ins That Replace Loops
   ========================================================================= */
EC.receiveLesson({
  id: "2.10",

  lede: "There are about ten built-in functions that turn a five-line loop into one line — and the reason to learn them is not brevity. A loop tells a reader *how*; `any(...)`, `max(..., key=...)` and `zip(..., strict=True)` tell them **what**, and one of them fixes a data-loss bug most people do not know they have.",

  objectives: [
    "Replace common loop shapes with the built-in that names the operation",
    "Use `sorted` and `max`/`min` with `key` and `default` correctly",
    "Explain why `zip` needs `strict=True` and what it prevents",
    "Know which built-ins short-circuit and how to preserve that",
    "Recognise where a built-in is the wrong choice"
  ],

  prerequisites: ["2.7"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "enumerate and zip", id: "enumerate-zip" },

    {"kind": "cells", "title": "zip stops at the shortest", "caption": "zip pairs items by position and stops when the shortest input is exhausted; the leftover 'd' is silently dropped. Pass strict=True (3.10+) to make a length mismatch an error.", "items": ["(a, 1)", "(b, 2)", "(c, 3)", "d — dropped"], "highlight": [3], "negative": false, "tone": "crit", "label": "zip(['a','b','c','d'], [1, 2, 3])", "t": "diagram", "id": "dg-2_10-01-0"},





    { t: "viz",
      title: "The loop you were about to write, and the built-in that replaces it",
      caption: "Each built-in is a loop someone already wrote, in C, correctly. Reaching for one is faster to read and usually faster to run.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Common manual loops paired with the built-in that replaces each">
  <text x="30"  y="32" class="s-label" style="fill:var(--crit)">the loop</text>
  <text x="470" y="32" class="s-label" style="fill:var(--good)">the built-in</text>
  <line x1="30" y1="42" x2="850" y2="42" style="stroke:var(--line)" stroke-width="1.5"/>

  <g class="s-sub" style="fill:var(--ink-2)">
    <text x="30" y="70">total = 0; for x in xs: total += x</text>
    <text x="30" y="100">for i in range(len(xs)): xs[i], i</text>
    <text x="30" y="130">out = []; for a, b in ...: pair them</text>
    <text x="30" y="160">found = False; for x in xs: if p(x)</text>
    <text x="30" y="190">best = xs[0]; for x in xs: compare</text>
  </g>

  <g class="s-sub" style="fill:var(--good)">
    <text x="470" y="70">sum(xs)</text>
    <text x="470" y="100">enumerate(xs)</text>
    <text x="470" y="130">zip(a, b)</text>
    <text x="470" y="160">any(p(x) for x in xs)</text>
    <text x="470" y="190">max(xs, key=...)</text>
  </g>

  <g style="stroke:var(--line);stroke-width:1.5;stroke-dasharray:4 3">
    <line x1="400" y1="64"  x2="460" y2="64"/>
    <line x1="400" y1="94"  x2="460" y2="94"/>
    <line x1="400" y1="124" x2="460" y2="124"/>
    <line x1="400" y1="154" x2="460" y2="154"/>
    <line x1="400" y1="184" x2="460" y2="184"/>
  </g>

  <text x="30" y="226" class="s-sub" style="fill:var(--ink-3)">any and all short-circuit, so they stop at the first decisive element — a manual loop with an early break, written for you</text>
</svg>`
    },
    { t: "code", lang: "python", title: "index and parallel iteration", code: `
items = ["alpha", "beta", "gamma"]

for i, item in enumerate(items):
    print(i, item)

for line_no, item in enumerate(items, start=1):    # start where you like
    print(line_no, item)

names = ["ada", "grace"]
scores = [91, 88]
for name, score in zip(names, scores):
    print(name, score)
`,
      out: `0 alpha
1 beta
2 gamma
1 alpha
2 beta
3 gamma
ada 91
grace 88`
    },

    { t: "callout", kind: "trap", title: "`zip` truncates silently — always pass `strict=True`", body: [
      { t: "code", lang: "python", title: "the data-loss bug", numbered: false, code: `
names = ["ada", "grace", "alan"]
scores = [91, 88]                      # one short -- a load error upstream

print(list(zip(names, scores)))        # alan vanishes, no warning

print(list(zip(names, scores, strict=True)))`,
        out: `[('ada', 91), ('grace', 88)]
ValueError: zip() argument 2 is shorter than argument 1`},
      { t: "p", text: "Default `zip` stops at the shortest input. When the sequences are supposed to correspond — a column and its values, IDs and their results — a length mismatch is a bug, and silent truncation turns it into quiet data loss that reconciles to plausible-looking totals." },
      { t: "p", text: "**Make `strict=True` your default** (Python 3.10+). Omit it only where truncation is genuinely intended, and when it is, `itertools.zip_longest` usually states the intent better." }
    ]},

    { t: "code", lang: "python", title: "the useful shapes", code: `
# Transpose rows to columns
rows = [(1, "a"), (2, "b"), (3, "c")]
numbers, letters = zip(*rows)
print(numbers, letters)

# Pair each element with the next -- windowing without indices
values = [10, 13, 9, 14]
deltas = [b - a for a, b in zip(values, values[1:])]
print(deltas)

# Build a dict from two sequences
print(dict(zip(["host", "port"], ["localhost", 8080])))
`,
      out: `(1, 2, 3) ('a', 'b', 'c')
[3, -4, 5]
{'host': 'localhost', 'port': 8080}`,
      caption: "`zip(values, values[1:])` is the idiomatic adjacent-pairs window. `itertools.pairwise(values)` (3.10+) does the same without the slice copy."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "sorted, max and min", id: "sorted-max-min" },

    { t: "code", lang: "python", title: "key does the work", code: `
from operator import itemgetter

orders = [
    {"id": 3, "total": 50, "customer": "beth"},
    {"id": 1, "total": 120, "customer": "alice"},
    {"id": 2, "total": 50, "customer": "carol"},
]

print(sorted(orders, key=itemgetter("total"), reverse=True)[0])
print(max(orders, key=itemgetter("total"))["id"])
print(min(orders, key=lambda o: (o["total"], o["customer"]))["customer"])

# Sort by several fields; negate a number to reverse just that one
by_total_then_name = sorted(orders, key=lambda o: (-o["total"], o["customer"]))
print([o["customer"] for o in by_total_then_name])
`,
      out: `{'id': 1, 'total': 120, 'customer': 'alice'}
1
beth
['alice', 'beth', 'carol']`
    },

    { t: "callout", kind: "trap", title: "`max` and `min` raise on empty; `sum` does not", body: [
      { t: "code", lang: "python", title: "the asymmetry", numbered: false, code: `
print(sum([]))                    # 0 -- has a natural identity
max([])                           # ValueError: max() arg is an empty sequence

print(max([], default=None))      # state the empty case explicitly
print(max([], default=0))`,
        out: `0
None
0`},
      { t: "p", text: "This is the behaviour change that turns a loop-to-built-in refactor into a bug (Lesson 2.7). A hand-written \"track the best so far\" loop returns `None` for empty input; `max()` raises. **Always pass `default=` when the input can be empty** — it makes the empty case a stated decision rather than an inherited accident." },
      { t: "p", text: "`sum` needs no default because zero is the identity for addition. To sum non-numbers, pass a start value of the right type: `sum(decimals, start=Decimal(\"0\"))`." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "any and all", id: "any-all" },

    { t: "code", lang: "python", title: "asking a question instead of computing an answer", code: `
statuses = ["paid", "pending", "paid"]

print(any(s == "failed" for s in statuses))
print(all(s in {"paid", "pending"} for s in statuses))

# Both short-circuit: any stops at the first True, all at the first False
def expensive(x):
    print("checking", x)
    return x > 1

print(any(expensive(x) for x in [0, 1, 2, 3]))
`,
      out: `False
True
checking 0
checking 1
checking 2
True`
    },

    { t: "callout", kind: "warn", title: "The brackets that destroy short-circuiting", body: [
      { t: "code", lang: "python", title: "generator versus list", numbered: false, code: `
any(expensive(x) for x in items)      # stops at the first True
any([expensive(x) for x in items])    # evaluates EVERY item first`},
      { t: "p", text: "The list comprehension is fully evaluated before `any` is called, so the short-circuit is gone. On an expensive predicate that is wasted work; on an infinite generator it never returns at all. Drop the brackets." },
      { t: "p", text: "The empty-sequence behaviour is also worth knowing and is a common quiz question: `any([])` is `False`, `all([])` is `True`. \"All zero elements satisfy the condition\" is vacuously true, and it means an empty input passes every `all()` validation you write." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "The rest of the set", id: "the-rest" },

    { t: "table",
      head: ["Built-in", "Replaces", "Note"],
      rows: [
        ["`sum(xs)`", "An accumulator loop", "`start=` for non-numeric types"],
        ["`len(xs)`", "A counter", "O(1) on built-in containers"],
        ["`sorted(xs, key=)`", "Manual sorting", "Returns a new list; stable"],
        ["`reversed(xs)`", "Backwards indexing", "A lazy view, not a copy"],
        ["`min` / `max(xs, key=, default=)`", "Best-so-far tracking", "Raises on empty without `default`"],
        ["`any` / `all(gen)`", "Flag variables", "Short-circuits — keep it a generator"],
        ["`zip(a, b, strict=True)`", "Parallel index loops", "**Always pass `strict`**"],
        ["`enumerate(xs, start=)`", "A manual counter", "Works on any iterable, not just sequences"],
        ["`filter` / `map`", "Conditional accumulation", "A comprehension is usually clearer — Lesson 3.5"],
        ["`round(x, n)`", "Manual rounding", "Banker's rounding — Lesson 1.5"],
        ["`abs`, `divmod`, `pow`", "Manual arithmetic", "`pow(a, b, mod)` is the fast modular form"]
      ]
    },

    { t: "ladder",
      title: "Report on a batch of orders",
      rungs: [
        { level: "bad", label: "One loop, four accumulators", why: "intent is buried in bookkeeping",
          code: `total = 0
count = 0
biggest = None
all_paid = True

for order in orders:
    total += order["amount"]
    count += 1
    if biggest is None or order["amount"] > biggest["amount"]:
        biggest = order
    if order["status"] != "paid":
        all_paid = False`,
          note: "Fourteen lines, four mutable variables, and a reader must simulate the loop to know what any of them ends up as. Each accumulator is a place a future edit can go wrong — and the `all_paid` flag keeps scanning after the answer is already known." },

        { level: "ok", label: "Four built-ins", why: "each line names its question",
          code: `total = sum(o["amount"] for o in orders)
count = len(orders)
biggest = max(orders, key=lambda o: o["amount"], default=None)
all_paid = all(o["status"] == "paid" for o in orders)`,
          note: "Each line is independently readable and testable, and `all` short-circuits on the first unpaid order. The cost is four passes over the data instead of one — irrelevant for thousands of rows, worth measuring for millions." },

        { level: "best", label: "One pass, when the data is large", why: "readable and single-pass",
          code: `from decimal import Decimal
from typing import NamedTuple


class Summary(NamedTuple):
    total: Decimal
    count: int
    biggest: dict | None
    all_paid: bool


def summarise(orders: Iterable[dict]) -> Summary:
    total, count, biggest, all_paid = Decimal("0"), 0, None, True

    for order in orders:
        amount = order["amount"]
        total += amount
        count += 1
        if biggest is None or amount > biggest["amount"]:
            biggest = order
        all_paid = all_paid and order["status"] == "paid"

    return Summary(total, count, biggest, all_paid)`,
          note: "The same accumulators, but confined inside a named function returning a named result — so callers see `summary.all_paid`, not four loose variables. Use this only when a single pass genuinely matters: the input is a generator that can be consumed once, or the data is large enough to measure. **For most code the four-built-ins version is the right answer**, and reaching for this one first is premature optimisation." }
      ]
    },

    /* ================================================================== */
    { t: "h2", n: "05", text: "When not to reach for a built-in", id: "when-not" },

    { t: "callout", kind: "tradeoff", title: "Three cases where the loop wins", body: [
      { t: "ol", items: [
        "**The body does work rather than producing a value.** `[send_email(u) for u in users]` builds a list of `None`s nobody wants and tells the reader you are constructing a collection. A `for` statement is the honest construct.",
        "**You need several results from one pass.** Four separate built-ins mean four traversals, which is fine for thousands of rows and wrong for a generator that can only be consumed once.",
        "**The condition needs more than one line.** A `key=` function that spans three lines with a nested conditional is harder to read than the loop it replaced. Extract a named function, or keep the loop."
      ]},
      { t: "p", text: "The test is not \"can this be one line\" but **\"does the one-line version make the intent more visible?\"** Usually it does; when it does not, the loop is correct." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A report with no accumulator variables",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Build a summary of a deployment log using built-ins rather than accumulator loops. Two of the requirements contain traps this lesson warned about — an empty input and a pair of sequences that may not match in length." }
      ],
      requirements: [
        "Given a list of deploy records, report: total duration, count, the slowest deploy, whether all succeeded, and the first failure if there is one.",
        "The function must behave correctly on an **empty** list — no exceptions, and every field must have a sensible value.",
        "Pair the deploy list with a separate list of commit SHAs, failing loudly if the lengths differ.",
        "Rank services by total deploy time, descending, breaking ties by service name so output is deterministic.",
        "Use no accumulator variables except inside `Counter`/`defaultdict`.",
        "Add a test asserting the empty-input behaviour explicitly."
      ],
      hint: "`max` and `min` need `default=`. For the first failure, `next()` with a generator and a default gives you a short-circuiting search. For ranking, build totals with a `Counter` or `defaultdict` and then `sorted` with a tuple key.",
      solution: {
        lang: "python",
        title: "deploy_report.py",
        code: `"""Summarise a deployment log without accumulator loops."""

from __future__ import annotations

from collections import defaultdict
from typing import Iterable, NamedTuple


class Deploy(NamedTuple):
    service: str
    seconds: float
    succeeded: bool


class Report(NamedTuple):
    count: int
    total_seconds: float
    slowest: Deploy | None
    all_succeeded: bool
    first_failure: Deploy | None
    by_service: list[tuple[str, float]]


def summarise(deploys: list[Deploy]) -> Report:
    # sum() has a natural identity (0), so no default is needed.
    total = sum(d.seconds for d in deploys)

    # max() RAISES on empty -- default=None states the empty case.
    slowest = max(deploys, key=lambda d: d.seconds, default=None)

    # all([]) is True: zero deploys all succeeded, vacuously. That is the
    # correct answer here, but it is worth asserting deliberately rather
    # than inheriting it by accident.
    all_ok = all(d.succeeded for d in deploys)

    # next() with a generator is a short-circuiting search: it stops at
    # the first match instead of building a list of every failure.
    first_failure = next((d for d in deploys if not d.succeeded), None)

    totals: defaultdict[str, float] = defaultdict(float)
    for d in deploys:
        totals[d.service] += d.seconds

    # Tie-break on the name so equal totals produce a stable order.
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))

    return Report(
        count=len(deploys),
        total_seconds=total,
        slowest=slowest,
        all_succeeded=all_ok,
        first_failure=first_failure,
        by_service=ranked,
    )


def with_commits(
    deploys: list[Deploy], shas: list[str]
) -> list[tuple[Deploy, str]]:
    """Pair deploys with their commits, refusing to truncate silently."""
    # strict=True turns a length mismatch -- always an upstream bug --
    # into a loud error instead of quietly dropping records.
    return list(zip(deploys, shas, strict=True))


# ---- tests -------------------------------------------------------------

def test_empty_input() -> None:
    report = summarise([])
    assert report.count == 0
    assert report.total_seconds == 0
    assert report.slowest is None
    assert report.all_succeeded is True        # vacuous truth, on purpose
    assert report.first_failure is None
    assert report.by_service == []


def test_mismatched_lengths_raise() -> None:
    deploys = [Deploy("api", 1.0, True)]
    try:
        with_commits(deploys, ["sha1", "sha2"])
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError on length mismatch")


if __name__ == "__main__":
    test_empty_input()
    test_mismatched_lengths_raise()

    deploys = [
        Deploy("api", 42.0, True),
        Deploy("web", 18.5, True),
        Deploy("api", 61.0, False),
        Deploy("worker", 61.0, True),
    ]
    r = summarise(deploys)

    assert r.slowest.service == "api" and r.slowest.seconds == 61.0
    assert r.first_failure.service == "api"
    assert r.all_succeeded is False
    # api 103.0, worker 61.0, web 18.5
    assert [s for s, _ in r.by_service] == ["api", "worker", "web"]

    print(f"{r.count} deploys, {r.total_seconds:.1f}s total")
    print(f"slowest: {r.slowest.service} ({r.slowest.seconds}s)")
    for service, secs in r.by_service:
        print(f"  {service:8} {secs:>7.1f}s")`,
        notes: [
          { t: "p", text: "**`all([])` is `True`, and the test asserts it deliberately.** \"All zero deploys succeeded\" is vacuously true and is the right answer here — but it is also how an empty batch silently passes a validation gate. Whenever `all()` guards something important, the empty case deserves an explicit assertion or an explicit length check." },
          { t: "p", text: "**`next((x for x in xs if cond), None)`** is the built-in that most people never learn. It is a short-circuiting search: it stops at the first match instead of building a list of every match and taking `[0]`. The `None` default is what keeps it from raising `StopIteration` when nothing matches." },
          { t: "p", text: "**The tie-break in `sorted(..., key=lambda kv: (-kv[1], kv[0]))`** matters more than it looks. `worker` and one `api` deploy both take 61 seconds; without the name in the key, their relative order depends on dict insertion order, so the same data in a different order produces a different report and a flaky assertion." },
          { t: "callout", kind: "insight", title: "Why this version is four passes and that is fine", body: [
            { t: "p", text: "`sum`, `max`, `all` and `next` each traverse the list — four passes where the accumulator loop made one. At any realistic deploy-log size that is microseconds, and the four independent, individually testable lines are worth far more than the saved traversal." },
            { t: "p", text: "The single-pass version becomes correct when the input is a **generator** that can only be consumed once, or when the data is large enough that you have measured a difference. Reaching for it before either is true optimises the wrong thing." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A pipeline pairs model predictions with their input IDs using `zip(ids, predictions)` and writes the result to a database. A batching change causes the final partial batch to return fewer predictions than inputs. Nothing errors. The job reports success." },
      { t: "p", text: "**What happened:** `zip` stopped at the shorter sequence, so the trailing IDs were silently dropped. Every row written was correctly paired — the data is not corrupted, it is *incomplete*, which is far harder to detect. Row counts look plausible, spot checks pass, and totals are merely slightly low." },
      { t: "p", text: "**`strict=True` converts this into a `ValueError` on the first mismatched batch**, at the point of the bug, naming which argument was shorter. One keyword argument is the difference between a loud failure at 09:05 and a quarter of quietly missing predictions." },
      { t: "p", text: "The habit worth forming: **when two sequences are supposed to correspond, a length mismatch is always a bug.** Truncation is only correct when you deliberately want the shortest — and in that case `itertools.zip_longest` or an explicit slice states the intent better than relying on `zip`'s default." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Always pass `strict=True` to `zip`.** Default truncation on mismatched lengths is silent data loss that reconciles to plausible totals.",
    "`enumerate(xs, start=1)` for an index; `zip(a, b[1:])` or `itertools.pairwise` for adjacent windows; `zip(*rows)` to transpose.",
    "`sorted`, `max` and `min` do their real work through `key=`. Use a tuple key for multiple fields, and negate a number to reverse just that one.",
    "**`max` and `min` raise on empty input; `sum` returns 0.** Pass `default=` whenever the input can be empty — it makes the empty case a decision rather than an inherited accident.",
    "`any` and `all` short-circuit — but only with a **generator expression**. `any([...])` evaluates everything first and loses it.",
    "`any([])` is `False`; `all([])` is `True`. An empty input passes every `all()` validation, which is worth asserting deliberately where it guards something important.",
    "**`next((x for x in xs if cond), None)`** is a short-circuiting search — better than building a list of matches and taking the first.",
    "When a sort feeds a report or a test, include a tie-break in the key. Ties broken by insertion order produce unstable output.",
    "The loop still wins when the body does work rather than producing a value, when you need several results from a single pass over a generator, or when the `key` function is too complex to read inline."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`ids` has 100 elements, `predictions` has 98. What does `list(zip(ids, predictions))` produce?",
        options: [
          "A `ValueError`, because the lengths differ",
          "98 pairs — `zip` stops at the shorter input and the last two IDs are silently dropped",
          "100 pairs, with `None` for the two missing predictions",
          "100 pairs, with the last two predictions repeated"
        ],
        answer: 1,
        why: "Default `zip` stops at the shortest input with no warning. The output is correctly paired but incomplete, which is far harder to detect than corruption — row counts look plausible and spot checks pass. `strict=True` (3.10+) raises instead, at the point of the bug. Use `itertools.zip_longest` when you actually want padding, which is option C's behaviour."
      },
      {
        stem: "Why does `any(check(x) for x in items)` differ from `any([check(x) for x in items])`?",
        options: [
          "They are identical — the brackets are stylistic",
          "The generator short-circuits at the first `True`; the list comprehension evaluates every element before `any` is called",
          "The list version is faster because it avoids generator overhead",
          "The bracketed version raises on an empty list"
        ],
        answer: 1,
        why: "A list comprehension is fully evaluated and then passed as an argument, so `any` never gets the chance to stop early. The generator is consumed lazily, so `any` stops as soon as it finds a truthy value — matching the `break` in the loop it replaced. On an expensive predicate this is wasted work; on an infinite generator the list version never returns."
      },
      {
        stem: "A refactor replaces a best-so-far loop with `max(orders, key=lambda o: o.total)`. What breaks?",
        options: [
          "Nothing — it is an exact equivalent",
          "Empty input: `max` raises `ValueError` where the loop returned `None`",
          "The `key` function cannot access attributes, only dict keys",
          "`max` returns the value rather than the object"
        ],
        answer: 1,
        why: "A hand-written loop that starts with `best = None` returns `None` for an empty sequence; `max()` raises. If any caller relies on the `None`, the failure appears the first time the input happens to be empty — often in production. `max(..., default=None)` restores the contract, and is better than either original because it makes the empty case explicit rather than implied."
      },
      {
        stem: "In which case is a plain `for` loop the better choice over a comprehension or built-in?",
        options: [
          "When the collection has more than 1,000 elements",
          "When the body performs an action rather than producing a value — `[send(u) for u in users]` builds a list of `None`s and misstates the intent",
          "When the elements are dictionaries rather than scalars",
          "When you need to know the index of each element"
        ],
        answer: 1,
        why: "A comprehension exists to build a collection. Using one for side effects allocates a list nobody wants and tells every future reader that a collection is being constructed when it is not. Two other legitimate cases: needing several results from one pass over a generator that can only be consumed once, and a `key`/condition too complex to read inline. Size is irrelevant, and `enumerate` covers indices."
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
        q: "What does zip do when its arguments have different lengths?",
        strong: "By default it stops at the shortest and drops the rest silently. Since 3.10 you can pass `strict=True` to raise a `ValueError` instead, and `itertools.zip_longest` pads with a fill value if you want the longest.",
        answer: [
          { t: "p", text: "The knowledge is easy; what the question is testing is whether you treat silent truncation as a hazard." },
          { t: "p", text: "The framing worth offering: when two sequences are supposed to correspond — IDs and predictions, a column and its values — a length mismatch is always an upstream bug. Truncating produces output that is correctly paired but incomplete, which is harder to detect than corruption because counts look plausible and spot checks pass." },
          { t: "p", text: "Saying that `strict=True` is your default, and that you only omit it where truncation is deliberate, signals a habit rather than a fact." }
        ]
      },
      {
        level: "core",
        q: "Why prefer `any(...)` to a loop with a flag variable?",
        strong: "It names the question rather than describing the search, and it short-circuits at the first match exactly as a `break` would. The flag existed only to record whether the loop broke, and removing it removes a variable that a future edit can get wrong.",
        answer: [
          { t: "p", text: "The follow-up is usually the generator-versus-list distinction, and it is worth volunteering: `any([...])` evaluates every element before `any` is called, so the short-circuit is lost. On an expensive predicate that is real waste." },
          { t: "p", text: "A detail that shows depth: `all([])` is `True`. An empty input passes every `all()` validation vacuously, which is correct logic and a common source of \"the empty batch was approved\" bugs. Where `all()` guards something important, the empty case deserves an explicit check." }
        ]
      },
      {
        level: "advanced",
        q: "When is a hand-written loop better than a chain of built-ins?",
        strong: "When the body performs actions rather than producing a value, when you need several results from a single pass over something that can only be consumed once, or when the key function is complex enough that inlining it hurts readability.",
        answer: [
          { t: "p", text: "This is a judgement question, and answering it well means resisting the pull toward concision as an end in itself." },
          { t: "p", text: "The strongest single point is the generator case: `sum`, `max` and `all` each traverse the input, so four built-ins over a generator consume it on the first call and silently return zero, `None` and `True` for the rest. Over a list it is four cheap passes; over a stream it is a bug." },
          { t: "p", text: "The principle to close on: the test is not whether it fits on one line but whether the one-line version makes the intent more visible. `any(...)` wins because it names the question being asked, not because it is shorter — and a comprehension used for side effects is shorter and worse by exactly that measure." }
        ]
      }
    ]
  }
});
