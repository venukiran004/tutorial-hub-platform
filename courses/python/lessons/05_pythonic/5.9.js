/* ============================================================================
   LESSON 5.9 — The collections Module
   ========================================================================= */
EC.receiveLesson({
  id: "5.9",

  lede: "Five types, each replacing a chunk of code you would otherwise write by hand — and each written in C, so they are faster than the loop they replace as well as shorter. The value is not the keystrokes saved. It is that `Counter(words).most_common(10)` **says what it does**, where the eight-line equivalent says only how.",

  objectives: [
    "Replace existence-checking loops with `defaultdict` and know its one hazard",
    "Use `Counter` for tallying, ranking and multiset arithmetic",
    "Reach for `deque` when a list's ends are the problem",
    "Choose between `namedtuple`, `NamedTuple` and a dataclass",
    "Recognise where `ChainMap` beats merging dictionaries"
  ],

  prerequisites: ["2.3", "2.8"],

  blocks: [

    { t: "h2", n: "01", text: "defaultdict", id: "defaultdict" },


    { t: "viz",
      title: "Which collections type replaces which loop",
      caption: "Each one exists because a particular hand-written pattern was common enough to be worth a C implementation. Recognising the pattern is how you know which to reach for.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="collections types paired with the manual pattern each replaces">
  <text x="30"  y="34" class="s-label" style="fill:var(--crit)">what you were writing</text>
  <text x="500" y="34" class="s-label" style="fill:var(--good)">what to use</text>
  <line x1="30" y1="44" x2="850" y2="44" style="stroke:var(--line)" stroke-width="1.5"/>

  <g class="s-sub" style="fill:var(--ink-2)">
    <text x="30" y="74">d[k] = d.get(k, 0) + 1</text>
    <text x="30" y="104">if k not in d: d[k] = []</text>
    <text x="30" y="134">lst.pop(0)  — O(n) every time</text>
    <text x="30" y="164">a class with three fields and __eq__</text>
    <text x="30" y="194">merging two config dicts by copying</text>
  </g>
  <g class="s-sub" style="fill:var(--good)">
    <text x="500" y="74">Counter</text>
    <text x="500" y="104">defaultdict(list)</text>
    <text x="500" y="134">deque — popleft is O(1)</text>
    <text x="500" y="164">NamedTuple, or a dataclass</text>
    <text x="500" y="194">ChainMap — no copying at all</text>
  </g>

  <g style="stroke:var(--line);stroke-width:1.5;stroke-dasharray:4 3">
    <line x1="430" y1="68" x2="490" y2="68"/><line x1="430" y1="98" x2="490" y2="98"/>
    <line x1="430" y1="128" x2="490" y2="128"/><line x1="430" y1="158" x2="490" y2="158"/>
    <line x1="430" y1="188" x2="490" y2="188"/>
  </g>

  <text x="30" y="232" class="s-sub" style="fill:var(--crit)">defaultdict inserts on read: a plain lookup of a missing key creates it, which quietly grows the dict.</text>
</svg>`
    },
    { t: "code", lang: "python", title: "the factory runs only on a genuine miss", code: `
from collections import defaultdict

orders = [
    {"customer": "ada", "total": 100},
    {"customer": "grace", "total": 50},
    {"customer": "ada", "total": 25},
]

# By hand
groups = {}
for order in orders:
    if order["customer"] not in groups:
        groups[order["customer"]] = []
    groups[order["customer"]].append(order)

# With defaultdict -- the key expression appears once
groups = defaultdict(list)
for order in orders:
    groups[order["customer"]].append(order)

print(dict(groups))
`,
      out: `{'ada': [{'customer': 'ada', 'total': 100}, {'customer': 'ada', 'total': 25}], 'grace': [{'customer': 'grace', 'total': 50}]}`,
      caption: "The default is a **zero-argument callable**, so `list`, `set`, `int`, `Decimal` and any factory work. Unlike `setdefault`, it is called only when a key is genuinely absent (Lesson 2.3)."
    },

    { t: "callout", kind: "trap", title: "A missing-key *read* creates the entry", body: [
      { t: "code", lang: "python", title: "the hazard", numbered: false, code: `
counts = defaultdict(int)
counts["a"] += 1

if counts["typo"] > 0:        # a READ -- and it inserts "typo": 0
    ...

print(dict(counts))
print(len(counts))            # 2, not 1`,
        out: `{'a': 1, 'typo': 0}
2`},
      { t: "p", text: "`__missing__` fires on any access, not only assignment. So a typo, a membership test written as a subscript, or a caller probing a key silently grows the dict — and a later `len()` or iteration reports data that was never really there." },
      { t: "p", text: "**Two defences.** Use `counts.get(key, 0)` when you only want to read. And **convert to a plain `dict` before returning one from a function** — a `defaultdict` escaping into a caller's hands turns their typo into phantom data (Lesson 2.3)." }
    ]},

    { t: "code", lang: "python", title: "nested structures", code: `
from collections import defaultdict

# Two levels: the outer factory produces the inner defaultdict
sales = defaultdict(lambda: defaultdict(int))
sales["eu"]["widget"] += 5
sales["us"]["gadget"] += 2

# defaultdict(list) is the grouping workhorse; defaultdict(set) dedupes
tags = defaultdict(set)
tags["order-1"].add("urgent")
tags["order-1"].add("urgent")        # no duplicate

print(len(tags["order-1"]))
`,
      out: `1`,
      caption: "`defaultdict(defaultdict)` does **not** work — the outer factory is called with no arguments, and `defaultdict()` with no factory has none. The `lambda` is required for nesting."
    },

    { t: "h2", n: "02", text: "Counter", id: "counter" },

    { t: "code", lang: "python", title: "counting, ranking, and arithmetic", code: `
from collections import Counter

statuses = ["paid", "pending", "paid", "failed", "paid"]

counts = Counter(statuses)
print(counts)
print(counts["refunded"])            # 0, not KeyError
print(counts.most_common(2))
print(sum(counts.values()))          # total

# Counters support arithmetic -- merging tallies without a loop
today = Counter({"paid": 5, "failed": 1})
yesterday = Counter({"paid": 3, "pending": 2})
print(today + yesterday)
print(today - yesterday)             # subtraction DROPS non-positive
print(today & yesterday)             # minimum of each
print(today | yesterday)             # maximum of each
`,
      out: `Counter({'paid': 3, 'pending': 1, 'failed': 1})
0
[('paid', 3), ('pending', 1)]
5
Counter({'paid': 8, 'pending': 2, 'failed': 1})
Counter({'paid': 2, 'failed': 1})
Counter({'paid': 3})
Counter({'paid': 5, 'pending': 2, 'failed': 1})`
    },

    { t: "callout", kind: "warn", title: "Two Counter behaviours that surprise people", body: [
      { t: "ul", items: [
        "**`-` discards zero and negative counts.** `Counter({\"a\": 1}) - Counter({\"a\": 3})` is an empty Counter, not `{\"a\": -2}`. Use `.subtract()` if you need negatives kept.",
        "**`most_common()` breaks ties by insertion order.** Two items with the same count come back in whichever order they were first seen — so the same data arriving differently produces a different \"top\" result."
      ]},
      { t: "code", lang: "python", title: "deterministic ranking", numbered: false, code: `
# Non-deterministic on ties
counts.most_common(1)

# Deterministic: break ties on the key itself
top = min(counts.items(), key=lambda kv: (-kv[1], kv[0]))`},
      { t: "p", text: "The tie-break matters whenever the result feeds a report, a test assertion or a cache key. A \"top product\" that changes depending on row order is a flaky test waiting to happen (Lesson 2.3)." }
    ]},

    { t: "h2", n: "03", text: "deque", id: "deque" },

    {"kind": "cells", "title": "deque: O(1) at both ends", "caption": "A deque is a doubly linked block list. appendleft and popleft are O(1) where a list's insert(0) and pop(0) are O(n); maxlen turns it into a rolling window that drops the oldest item automatically.", "items": ["appendleft →", "a", "b", "c", "d", "← append"], "highlight": [0, 5], "negative": false, "label": "deque(maxlen=4): a fifth append drops 'a' from the left", "t": "diagram", "id": "dg-5_9-03-0"},


    { t: "code", lang: "python", title: "O(1) at both ends, and bounded", code: `
from collections import deque

queue = deque([1, 2, 3])
queue.appendleft(0)             # O(1) -- list.insert(0, x) is O(n)
print(queue.popleft())          # O(1) -- list.pop(0) is O(n)

# maxlen makes a self-trimming buffer: the last N, automatically
recent = deque(maxlen=3)
for event in range(6):
    recent.append(event)
print(list(recent))

# rotate for round-robin
d = deque(["a", "b", "c"])
d.rotate(1)
print(list(d))
`,
      out: `1
[3, 4, 5]
['c', 'a', 'b']`,
      caption: "The `maxlen` buffer is the underused one: a rolling window of the last N log lines, requests or measurements, with no manual trimming and no unbounded growth."
    },

    { t: "callout", kind: "insight", title: "The performance difference is not marginal", body: [
      { t: "code", lang: "python", title: "measured", numbered: false, code: `
import timeit

n = 100_000
lst = timeit.timeit("d.pop(0)", setup=f"d=list(range({n}))", number=n)
dq  = timeit.timeit("d.popleft()",
                    setup=f"from collections import deque; d=deque(range({n}))",
                    number=n)
print(f"list.pop(0):     {lst:.3f}s")
print(f"deque.popleft(): {dq:.4f}s")`,
        out: `list.pop(0):     1.842s
deque.popleft(): 0.0043s`},
      { t: "p", text: "Four hundred times, and the gap widens with size — because `list.pop(0)` shifts every remaining pointer while `deque.popleft()` is constant. This is the worker-backlog feedback loop from Lesson 2.1: the slower it gets, the more the queue grows." },
      { t: "p", text: "The trade-off: **indexing into the middle of a deque is O(n)**. It is a queue, not a random-access sequence." }
    ]},

    { t: "h2", n: "04", text: "namedtuple and NamedTuple", id: "namedtuple" },

    { t: "code", lang: "python", title: "prefer the typed form", code: `
from typing import NamedTuple
from decimal import Decimal


class OrderLine(NamedTuple):
    sku: str
    quantity: int
    unit_price: Decimal

    @property
    def total(self) -> Decimal:
        return self.unit_price * self.quantity


line = OrderLine("W-1", 2, Decimal("19.99"))

print(line.total)                    # named access, and methods
sku, qty, price = line               # and still a tuple
print(line[0], len(line))
print(line._replace(quantity=3))     # returns a NEW instance
print(line._asdict())
`,
      out: `39.98
W-1 3
OrderLine(sku='W-1', quantity=3, unit_price=Decimal('19.99'))
{'sku': 'W-1', 'quantity': 2, 'unit_price': Decimal('19.99')}`,
      caption: "`typing.NamedTuple` gives annotations, methods, properties and defaults. The older `collections.namedtuple(\"OrderLine\", \"sku quantity\")` still works and gives none of them — there is no reason to write it in new code."
    },

    { t: "table",
      head: ["Use", "When"],
      rows: [
        ["`NamedTuple`", "An immutable record that should also **unpack like a tuple** — multi-value returns, coordinates, database rows"],
        ["`@dataclass(frozen=True)`", "An immutable record with no tuple behaviour needed — usually clearer, and supports `slots`"],
        ["`@dataclass`", "A mutable record"],
        ["`dict`", "The keys are data, not a fixed schema"]
      ],
      caption: "The deciding question is whether tuple behaviour is wanted. `a, b = f()` working is a real benefit for multi-value returns and the reason `NamedTuple` still has a place alongside dataclasses (Lesson 4.10)."
    },

    { t: "h2", n: "05", text: "ChainMap", id: "chainmap" },

    { t: "code", lang: "python", title: "layered lookup without merging", code: `
from collections import ChainMap

defaults = {"timeout": 30, "retries": 3, "debug": False}
from_file = {"timeout": 10}
from_env = {"debug": True}

# First mapping wins. Nothing is copied.
config = ChainMap(from_env, from_file, defaults)

print(config["debug"], config["timeout"], config["retries"])

# The layers stay live -- a later change is visible immediately
from_env["timeout"] = 5
print(config["timeout"])

# And you can see where a value came from
print(config.maps)
`,
      out: `True 10 3
5
[{'debug': True, 'timeout': 5}, {'timeout': 10}, {'timeout': 30, 'retries': 3, 'debug': False}]`
    },

    { t: "callout", kind: "tradeoff", title: "ChainMap versus merging", body: [
      { t: "table",
        head: ["", "`ChainMap`", "`{**a, **b}`"],
        rows: [
          ["Copies data", "No — a view over the layers", "Yes, a new dict"],
          ["Layers stay live", "Yes", "No — a snapshot"],
          ["Provenance", "`.maps` shows the layers", "Lost"],
          ["Lookup cost", "O(layers) worst case", "O(1)"],
          ["Writes go to", "The **first** map only", "The merged copy"]
        ]
      },
      { t: "p", text: "**Use `ChainMap`** when layers change independently, when you need to know which layer supplied a value, or when adding a temporary scope — `config.new_child(overrides)` pushes a layer and leaves the rest untouched." },
      { t: "p", text: "**Use a merge** when you want a stable snapshot to hand onward. And remember that neither handles **nested** dicts: both are shallow, so an override of `{\"db\": {...}}` shadows the whole subtree (Lesson 2.9)." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Rewrite a report with the right types",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The function below hand-rolls four things `collections` already provides, and carries two bugs that the right type would have made impossible. Rewrite it, then answer why one of the four replacements is *not* an improvement." }
      ],
      requirements: [
        "Replace the existence-checking grouping loop with `defaultdict`.",
        "Replace the manual tallying with `Counter`.",
        "Replace the rolling-window list with `deque(maxlen=...)`.",
        "Replace the positional result tuple with a `NamedTuple`.",
        "Fix the non-deterministic \"most common\" result.",
        "Fix the `defaultdict` leaking into the caller's hands.",
        "**Identify the replacement that would be a mistake**, and say why."
      ],
      hint: "For the last requirement, look at what the function returns and ask what a caller does with each piece. One of the four types is wrong for a value that crosses a boundary.",
      solution: {
        lang: "python",
        title: "report.py",
        code: `# ---- the original -------------------------------------------------------

def build_report(events, window=100):
    by_service = {}
    level_counts = {}
    recent = []

    for event in events:
        # 1. existence-checking grouping
        if event["service"] not in by_service:
            by_service[event["service"]] = []
        by_service[event["service"]].append(event)

        # 2. manual tallying
        if event["level"] in level_counts:
            level_counts[event["level"]] += 1
        else:
            level_counts[event["level"]] = 1

        # 3. manual window trimming
        recent.append(event)
        if len(recent) > window:
            recent.pop(0)              # O(n) EVERY event past the window

    # 4. a positional tuple nobody can read at the call site
    top = max(level_counts.items(), key=lambda kv: kv[1])[0]
    return by_service, level_counts, recent, top


# ---- the rewrite --------------------------------------------------------

from __future__ import annotations

from collections import Counter, defaultdict, deque
from collections.abc import Iterable
from typing import NamedTuple


class Report(NamedTuple):
    """A NamedTuple so existing "a, b, c, d = build_report(...)" call
    sites keep working, while new ones can use names (Lesson 4.10)."""
    by_service: dict[str, list[dict]]
    level_counts: Counter[str]
    recent: tuple[dict, ...]
    most_common_level: str | None


def build_report(events: Iterable[dict], window: int = 100) -> Report:
    by_service: defaultdict[str, list[dict]] = defaultdict(list)
    level_counts: Counter[str] = Counter()
    recent: deque[dict] = deque(maxlen=window)   # self-trimming, O(1)

    for event in events:
        by_service[event["service"]].append(event)
        level_counts[event["level"]] += 1
        recent.append(event)          # no manual pop(0), no O(n) shift

    # FIX: most_common() breaks ties by insertion order, so the same
    # data arriving in a different order gives a different answer.
    # Sorting on (-count, name) makes it deterministic.
    top = (
        min(level_counts.items(), key=lambda kv: (-kv[1], kv[0]))[0]
        if level_counts else None
    )

    return Report(
        # FIX: dict(), not the defaultdict. A defaultdict escaping to a
        # caller turns their typo into phantom data -- reading a missing
        # service would silently insert an empty list.
        by_service=dict(by_service),
        level_counts=level_counts,
        recent=tuple(recent),
        most_common_level=top,
    )


# ---- THE REPLACEMENT THAT WOULD BE A MISTAKE ----------------------------
#
# Returning the Counter itself is fine -- Counter IS a dict subclass and
# a missing key returns 0 rather than inserting anything, so it is safe
# to hand out.
#
# But returning the DEQUE would be the mistake, which is why "recent" is
# converted to a tuple:
#
#   - a deque is mutable, so a caller can append to it and silently
#     evict the oldest entry from the report they were given
#   - it carries a maxlen the caller cannot see, so their append
#     drops data with no error
#   - indexing into it is O(n), so a caller writing recent[50] gets
#     surprising performance from something that looks like a list
#
# deque is an excellent ACCUMULATOR and a poor RETURN VALUE -- the same
# argument as defaultdict, for different reasons.


# ---- tests --------------------------------------------------------------

EVENTS = [
    {"service": "api", "level": "ERROR"},
    {"service": "web", "level": "INFO"},
    {"service": "api", "level": "INFO"},
    {"service": "api", "level": "ERROR"},
]


def test_grouping_and_counting() -> None:
    report = build_report(EVENTS)

    assert list(report.by_service) == ["api", "web"]
    assert len(report.by_service["api"]) == 3
    assert report.level_counts == Counter({"ERROR": 2, "INFO": 2})


def test_most_common_is_deterministic_on_ties() -> None:
    """ERROR and INFO both appear twice.

    Counter.most_common() would return whichever was seen first, so
    reversing the input would change the answer.
    """
    forward = build_report(EVENTS).most_common_level
    reversed_ = build_report(list(reversed(EVENTS))).most_common_level

    assert forward == reversed_ == "ERROR"      # alphabetical tie-break


def test_result_does_not_leak_a_defaultdict() -> None:
    report = build_report(EVENTS)

    # A caller's typo must raise, not silently create an entry
    try:
        report.by_service["ap"]
    except KeyError:
        pass
    else:
        raise AssertionError("a defaultdict escaped to the caller")

    assert len(report.by_service) == 2           # unchanged


def test_window_is_bounded_and_immutable() -> None:
    many = [{"service": "api", "level": "INFO"} for _ in range(250)]
    report = build_report(many, window=100)

    assert len(report.recent) == 100
    assert isinstance(report.recent, tuple)      # caller cannot mutate it


def test_namedtuple_keeps_positional_call_sites_working() -> None:
    by_service, counts, recent, top = build_report(EVENTS)
    assert top == "ERROR"
    assert isinstance(counts, Counter)


def test_empty_input() -> None:
    report = build_report([])
    assert report.by_service == {}
    assert report.most_common_level is None      # not a ValueError


if __name__ == "__main__":
    for t in (
        test_grouping_and_counting,
        test_most_common_is_deterministic_on_ties,
        test_result_does_not_leak_a_defaultdict,
        test_window_is_bounded_and_immutable,
        test_namedtuple_keeps_positional_call_sites_working,
        test_empty_input,
    ):
        t()
    print("four types applied, two bugs closed, one replacement rejected")`,
        notes: [
          { t: "p", text: "**The rejected replacement is the point of the exercise.** `deque` is the right accumulator — `maxlen` removes the manual trimming and turns an O(n) `pop(0)` per event into O(1). It is the wrong *return value*, because it is mutable, its `maxlen` is invisible to a caller, and middle indexing is O(n). Converting to a tuple on the way out costs one call." },
          { t: "p", text: "**`Counter` is safe to return where `defaultdict` is not.** Both are dict subclasses, but a `Counter` returns 0 for a missing key without inserting anything, so a caller's typo cannot grow it. That asymmetry is worth knowing rather than applying one rule to both." },
          { t: "p", text: "**The tie-break test is the one that would have caught a real flaky failure.** With `ERROR` and `INFO` both at two, `most_common()` returns whichever appeared first — so reversing the input changes the report. The test asserts both orders give the same answer, which is the only way to catch it." },
          { t: "callout", kind: "insight", title: "The O(n) hidden in the original", body: [
            { t: "p", text: "`recent.pop(0)` looks like a one-line window trim and is a linear shift of every remaining element. Over 250 events with a 100-item window that is 150 shifts of 100 pointers — invisible at this scale and a genuine problem in a service processing millions." },
            { t: "p", text: "`deque(maxlen=window)` does the same job in constant time and removes the `if len(...) > window` branch entirely. It is the clearest case in `collections` where the idiomatic version is faster *and* shorter *and* less likely to be wrong." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A monitoring endpoint returns per-service error counts built with a `defaultdict(int)`. A dashboard polls it and queries a service name that no longer exists. Over weeks, the response grows to thousands of services with zero errors, and the endpoint slows from milliseconds to seconds." },
      { t: "p", text: "**Every missing-key read inserted an entry.** `__missing__` fires on access, not only assignment, so the dashboard's queries for retired services silently added them with a count of zero — and the dict, held in a module-level cache, grew for the life of the process." },
      { t: "p", text: "**Two things went wrong together.** The `defaultdict` escaped into code that reads arbitrary keys, and it was stored in long-lived state (Lesson 4.2). Either alone would have been survivable; combined, they are an unbounded memory leak that also inflates every response." },
      { t: "p", text: "**The rule:** a `defaultdict` is an accumulator, not a return value or a cache. Convert with `dict()` at the boundary of the function that built it. A `Counter` is safe to hand out — a missing key returns 0 without inserting — which is why knowing the difference between the two matters more than knowing either one." }
    ]}
  ],

  takeaways: [
    "**`defaultdict`'s factory runs only on a genuine miss**, unlike `setdefault`, whose default argument is evaluated on every call.",
    "**A missing-key *read* on a `defaultdict` creates the entry.** `__missing__` fires on access, so a typo or a probe silently grows the dict.",
    "**Convert a `defaultdict` to `dict()` before returning it.** A `Counter` is safe to return — a missing key gives 0 without inserting.",
    "Nested defaults need `defaultdict(lambda: defaultdict(int))`; `defaultdict(defaultdict)` fails because the outer factory is called with no arguments.",
    "**`Counter` supports arithmetic** — `+`, `-`, `&`, `|` — which replaces manual tally merging. Note `-` discards non-positive counts; `.subtract()` keeps them.",
    "**`most_common()` breaks ties by insertion order**, so the same data in a different order gives a different answer. Sort on `(-count, key)` when the result feeds a report or a test.",
    "**`deque` is O(1) at both ends where a list is O(n) at the front** — measurably hundreds of times faster on a queue, and the gap widens with size.",
    "`deque(maxlen=n)` is a self-trimming rolling window: no manual trimming, no unbounded growth. It is a poor return value — mutable, with an invisible `maxlen` and O(n) middle indexing.",
    "**Use `typing.NamedTuple`, not `collections.namedtuple`** — it adds annotations, methods, properties and defaults. Choose it over a dataclass when tuple unpacking is genuinely wanted.",
    "**`ChainMap` is a live view over layers**, not a copy: it preserves provenance via `.maps`, supports `new_child()` for temporary scopes, and — like a merge — is shallow."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`counts = defaultdict(int)`. What does `if counts[\"typo\"] > 0:` do?",
        options: [
          "Returns 0 and leaves the dict unchanged",
          "Returns 0 **and inserts** `\"typo\": 0` — `__missing__` fires on any access, not only assignment",
          "Raises `KeyError` because the key was never assigned",
          "Returns `None`, since `int` needs an argument"
        ],
        answer: 1,
        why: "`__missing__` is called on read as well as write, so probing a key adds it. A later `len()` or iteration then reports data that never really existed, and in a long-lived object the dict grows without bound. Use `counts.get(key, 0)` when you only want to read, and convert to a plain `dict` before returning one from a function."
      },
      {
        stem: "Two levels have equal counts. Why is `Counter.most_common(1)` unsuitable for a report?",
        options: [
          "It is O(n log n) and too slow for large counters",
          "Ties are broken by insertion order, so the same data arriving in a different order produces a different answer",
          "It returns counts rather than keys",
          "It excludes items with a count below the mean"
        ],
        answer: 1,
        why: "`most_common` sorts by count and leaves equal counts in first-seen order. That makes the \"top\" item depend on row ordering, which produces reports that change between runs and tests that fail intermittently. `min(counts.items(), key=lambda kv: (-kv[1], kv[0]))` breaks ties on the key itself and is deterministic."
      },
      {
        stem: "A worker dequeues with `jobs.pop(0)` and slows as the backlog grows. What does `deque` change?",
        options: [
          "Nothing — both are O(n) at the front",
          "`popleft()` is O(1) where `list.pop(0)` shifts every remaining element, so dequeue cost stops growing with queue depth",
          "`deque` batches removals to amortise the cost",
          "`deque` uses less memory, which is what causes the speedup"
        ],
        answer: 1,
        why: "A list stores pointers contiguously, so removing the first one moves all the rest — O(n) in the current length. As the backlog grows each dequeue costs more, which slows the worker and grows the backlog further. A deque is a doubly-linked structure of blocks with O(1) at both ends; measured on 100,000 items the difference is roughly 400×."
      },
      {
        stem: "When is `ChainMap` preferable to `{**defaults, **overrides}`?",
        options: [
          "When the dictionaries contain nested values",
          "When the layers change independently, you need to know which layer supplied a value, or you want to push a temporary scope",
          "When lookup performance is critical",
          "When the result must be JSON-serialisable"
        ],
        answer: 1,
        why: "`ChainMap` is a live view rather than a snapshot, so later changes to a layer are visible, `.maps` shows provenance, and `new_child()` adds a temporary scope without copying. Merging is better when you want a stable snapshot, and it is faster — `ChainMap` lookup is O(layers) worst case. Neither handles nesting: both are shallow, so an override shadows an entire subtree."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use `defaultdict` over a plain dict?",
        strong: "When accumulating — grouping into lists, tallying, building sets — so the key expression appears once instead of three times. The factory runs only on a genuine miss, unlike `setdefault`, whose default argument is evaluated on every call.",
        answer: [
          { t: "p", text: "The hazard is what distinguishes a real answer: a missing-key *read* inserts the entry, because `__missing__` fires on access rather than assignment. A typo or a probe silently grows the dict." },
          { t: "p", text: "Which leads to the rule worth stating: convert to `dict()` before returning one from a function. A `defaultdict` in a caller's hands turns their mistake into phantom data." },
          { t: "p", text: "The contrast with `Counter` shows precision — `Counter` is also a dict subclass but returns 0 for a missing key *without* inserting, so it is safe to hand out." }
        ]
      },
      {
        level: "core",
        q: "What does `deque` give you that a list does not?",
        strong: "O(1) insertion and removal at both ends. A list stores pointers contiguously, so `pop(0)` or `insert(0, x)` shifts every remaining element — O(n) in the current length. `maxlen` also gives a self-trimming rolling buffer.",
        answer: [
          { t: "p", text: "The production symptom is the memorable part: a worker using `jobs.pop(0)` slows as its backlog grows, because each dequeue costs more as the queue lengthens — a feedback loop built into the data structure, and invisible in staging where the backlog is short." },
          { t: "p", text: "`maxlen` is worth mentioning specifically because it is underused — a rolling window of the last N events with no manual trimming and no unbounded growth." },
          { t: "p", text: "The trade-off keeps it balanced: indexing into the middle is O(n), so a deque is a queue rather than a random-access sequence — and for the same reason it is a poor return value from a function." }
        ]
      },
      {
        level: "advanced",
        q: "A monitoring endpoint's response grows to thousands of zero-count entries over weeks. What happened?",
        strong: "A `defaultdict` escaped into code that reads arbitrary keys, and it was held in long-lived state. Every query for a key that does not exist inserted it, so a polling dashboard asking about retired services grew the dict for the life of the process.",
        answer: [
          { t: "p", text: "Naming both contributing factors is what makes the diagnosis complete — the `defaultdict` leaking past the function that built it, *and* it being stored somewhere long-lived. Either alone is survivable." },
          { t: "p", text: "It connects to the module-level mutable state problem: the growth is unbounded precisely because nothing owns the dict's lifetime, and it resets only on restart — which makes the pattern look gradual and mysterious." },
          { t: "p", text: "The fix generalises usefully: a `defaultdict` is an accumulator, not a return value or a cache. Convert at the boundary of the function that built it, and know that `Counter` does not share the hazard." }
        ]
      }
    ]
  }
});
