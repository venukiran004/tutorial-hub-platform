/* ============================================================================
   LESSON 5.10 — itertools and functools in Practice
   ========================================================================= */
EC.receiveLesson({
  id: "5.10",

  lede: "Two standard-library modules that mostly replace loops you already know how to write. The reason to learn them is not brevity — it is that **each name states an intent** a loop can only imply, and that the lazy ones let you process data larger than memory without changing the shape of your code.",

  objectives: [
    "Combine, slice and window iterators with `chain`, `islice`, `batched` and `pairwise`",
    "Use `groupby` correctly, and explain why it needs sorted input",
    "Apply `partial`, `reduce` and `singledispatch` where each genuinely beats a loop or an `if` chain",
    "Choose between `cache`, `lru_cache` and `cached_property`, and name the leak each can cause",
    "Diagnose a pipeline that silently produced nothing because an iterator was already consumed"
  ],

  prerequisites: ["5.6", "5.7"],

  blocks: [

    { t: "h2", n: "01", text: "Everything here is lazy", id: "lazy",
      sub: "Which is the feature and the trap in equal measure" },

    { t: "p", text: "Every `itertools` callable returns an **iterator**, not a list. Nothing is computed until you iterate, and once you have iterated, it is spent (Lesson 5.6). That is what lets you chain ten transformations over a 40 GB file with constant memory — and what makes a pipeline that works in the REPL return nothing on the second use." },

    { t: "code", lang: "python", title: "lazy means one pass", code: `
from itertools import chain, islice

nums = chain([1, 2, 3], [4, 5, 6])

print(sum(nums))        # consumes it
print(sum(nums))        # 0 -- there is nothing left
print(list(nums))

# islice takes a slice WITHOUT materialising what it skips
first_two = islice(chain(range(10 ** 9), [1]), 2)
print(list(first_two))
`,
      out: `21
0
[]
[0, 1]`,
      caption: "The second `sum` is not an error and produces no warning. **Silent zero is the failure mode**, which is why an exhausted iterator is harder to debug than an exception."
    },

    { t: "callout", kind: "trap", title: "`tee` does not make a cheap copy", body: [
      { t: "code", lang: "python", title: "the memory cost is invisible", numbered: false, code: `
from itertools import tee

a, b = tee(range(1_000_000))

# Consume ALL of a before touching b
total = sum(a)

# tee had to buffer every item a consumed, so b could still yield them.
# Peak memory: the whole sequence, from a call that looks free.
print(sum(b) == total)`,
        out: `True`},
      { t: "p", text: "`tee` buffers whatever one branch has consumed and the other has not. Used as intended — two consumers advancing roughly together — the buffer stays small. Used to \"copy\" an iterator so you can loop twice, it holds the entire sequence in memory and you would have been better off calling `list()`, which at least says so." },
      { t: "p", text: "**If you need the data twice, materialise it deliberately.** `tee` is for interleaved consumption, not for undoing laziness." }
    ]},

    { t: "h2", n: "02", text: "Combining and reshaping", id: "combining" },

    { t: "code", lang: "python", title: "the six that earn their place", code: `
from itertools import chain, islice, batched, pairwise, takewhile, dropwhile

rows = [["a", "b"], ["c"], ["d", "e", "f"]]

# chain.from_iterable flattens one level, lazily
print(list(chain.from_iterable(rows)))

# islice: skip a header, take a page -- works on any iterator, incl. a file
print(list(islice(range(100), 10, 15)))

# batched (3.12+): fixed-size chunks for bulk inserts and API calls
print(list(batched(range(7), 3)))

# pairwise (3.10+): consecutive pairs -- deltas, gap detection
readings = [10, 12, 19, 20]
print([b - a for a, b in pairwise(readings)])

# takewhile / dropwhile: stop or start at the first failure of a predicate
lines = ["# header", "# notes", "data-1", "# not-a-header", "data-2"]
print(list(dropwhile(lambda l: l.startswith("#"), lines)))
`,
      out: `['a', 'b', 'c', 'd', 'e', 'f']
[10, 11, 12, 13, 14]
[(0, 1, 2), (3, 4, 5), (6,)]
[2, 7, 1]
['data-1', '# not-a-header', 'data-2']`,
      caption: "Note the last line. `dropwhile` stops dropping at the **first** item that fails the predicate and yields everything after it — including later comment lines. It is not a filter."
    },

    { t: "callout", kind: "insight", title: "`batched` replaces the chunking loop everyone writes", body: [
      { t: "code", lang: "python", title: "before and after", numbered: false, code: `
# The hand-written version, with its two off-by-one opportunities
chunk = []
for row in rows:
    chunk.append(row)
    if len(chunk) == 500:
        db.insert_many(chunk)
        chunk = []
if chunk:                       # the line people forget
    db.insert_many(chunk)

# Python 3.12+
for chunk in batched(rows, 500):
    db.insert_many(chunk)`},
      { t: "p", text: "The forgotten `if chunk:` at the end is a real production bug: it drops the final partial batch, so a job importing 1,000,500 rows quietly imports 1,000,000. `batched` yields the short final tuple automatically." },
      { t: "p", text: "On Python 3.11 and earlier: `iter(lambda: tuple(islice(it, n)), ())` gives the same behaviour, where `it = iter(rows)`." }
    ]},

    { t: "h2", n: "03", text: "groupby, and why it surprises people", id: "groupby" },

    {"kind": "cells", "title": "groupby groups consecutive equal keys only", "caption": "groupby does not sort. Adjacent runs of the same key become one group; a key that reappears later starts a new group. Sort by the key first if you want one group per key.", "items": ["a", "a", "b", "a", "a", "c"], "highlight": [2], "negative": false, "label": "groupby('aabaac') → ('a', 2), ('b', 1), ('a', 2), ('c', 1) — four groups, not three", "t": "diagram", "id": "dg-5_10-03-0"},


    { t: "viz",
      title: "groupby groups *runs*, not values",
      caption: "It walks the input once, starting a new group every time the key changes. On unsorted input the same key appears in several groups — which looks like data loss because later groups overwrite earlier ones in whatever dict you build.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram comparing groupby over unsorted input, which produces four fragmented groups, with sorted input, which produces two correct groups">
  <text x="20" y="26" class="s-label">UNSORTED INPUT</text>

  <rect x="20" y="40" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="50" y="62" text-anchor="middle" class="s-mono" style="font-size:11px">eu</text>
  <rect x="86" y="40" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="116" y="62" text-anchor="middle" class="s-mono" style="font-size:11px">eu</text>
  <rect x="152" y="40" width="60" height="34" rx="6" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="182" y="62" text-anchor="middle" class="s-mono" style="font-size:11px">us</text>
  <rect x="218" y="40" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="248" y="62" text-anchor="middle" class="s-mono" style="font-size:11px">eu</text>
  <rect x="284" y="40" width="60" height="34" rx="6" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="314" y="62" text-anchor="middle" class="s-mono" style="font-size:11px">us</text>

  <text x="20" y="106" class="s-sub">groupby yields FOUR groups — one per run</text>

  <rect x="20" y="118" width="126" height="30" rx="6" style="fill:none;stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="83" y="138" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">eu (2)</text>
  <rect x="152" y="118" width="60" height="30" rx="6" style="fill:none;stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="182" y="138" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">us (1)</text>
  <rect x="218" y="118" width="60" height="30" rx="6" style="fill:none;stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="248" y="138" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">eu (1)</text>
  <rect x="284" y="118" width="60" height="30" rx="6" style="fill:none;stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="314" y="138" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">us (1)</text>

  <text x="360" y="138" class="s-sub" style="fill:var(--crit)">dict(...) keeps only the LAST of each — eu shows 1, not 3</text>

  <line x1="20" y1="172" x2="880" y2="172" class="s-stroke" stroke-width="1"/>

  <text x="20" y="204" class="s-label">SORTED ON THE SAME KEY FIRST</text>

  <rect x="20" y="218" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="50" y="240" text-anchor="middle" class="s-mono" style="font-size:11px">eu</text>
  <rect x="86" y="218" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="116" y="240" text-anchor="middle" class="s-mono" style="font-size:11px">eu</text>
  <rect x="152" y="218" width="60" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="182" y="240" text-anchor="middle" class="s-mono" style="font-size:11px">eu</text>
  <rect x="218" y="218" width="60" height="34" rx="6" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="248" y="240" text-anchor="middle" class="s-mono" style="font-size:11px">us</text>
  <rect x="284" y="218" width="60" height="34" rx="6" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="314" y="240" text-anchor="middle" class="s-mono" style="font-size:11px">us</text>

  <rect x="20" y="262" width="192" height="28" rx="6" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="116" y="281" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">eu (3)</text>
  <rect x="218" y="262" width="126" height="28" rx="6" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="281" y="281" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">us (2)</text>

  <text x="360" y="281" class="s-sub" style="fill:var(--good)">two groups, complete — the same key function used for both</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the sorting requirement is not a suggestion", code: `
from itertools import groupby
from operator import itemgetter

rows = [
    {"region": "eu", "amount": 10},
    {"region": "eu", "amount": 20},
    {"region": "us", "amount": 5},
    {"region": "eu", "amount": 30},
]

key = itemgetter("region")

# WRONG -- unsorted
print({k: sum(r["amount"] for r in g) for k, g in groupby(rows, key=key)})

# RIGHT -- same key function for sort and group
print({k: sum(r["amount"] for r in g)
       for k, g in groupby(sorted(rows, key=key), key=key)})
`,
      out: `{'eu': 30, 'us': 5}
{'eu': 60, 'us': 5}`,
      hl: [14, 17],
      caption: "The wrong version reports 30 for the EU rather than 60, with no error. It is a **wrong number, not a crash** — which is the worst class of bug to ship."
    },

    { t: "callout", kind: "tradeoff", title: "groupby versus defaultdict", body: [
      { t: "table",
        head: ["", "`groupby`", "`defaultdict(list)`"],
        rows: [
          ["Input must be sorted", "Yes", "No"],
          ["Memory", "One group at a time — streams", "All groups at once"],
          ["Cost", "O(n log n) for the sort", "O(n)"],
          ["Groups are", "Sub-iterators, consumed in order", "Real lists, reusable"]
        ]
      },
      { t: "p", text: "**Default to `defaultdict(list)`.** It is cheaper, has no ordering precondition, and gives you lists you can revisit (Lesson 5.9)." },
      { t: "p", text: "**Reach for `groupby`** when the data is already sorted — a database result with an `ORDER BY`, a sorted log file, a sorted export — because then you get grouping for free in constant memory, over input that does not fit in RAM." },
      { t: "p", text: "One more `groupby` sharp edge: **each group is a sub-iterator sharing the underlying cursor**. Advancing to the next group invalidates the previous one, so `list(groupby(...))` gives you groups that are already empty. Consume each group before moving on, or wrap it in `list()` as you go." }
    ]},

    { t: "h2", n: "04", text: "functools", id: "functools" },

    { t: "tabs", items: [
      { label: "partial", blocks: [
        { t: "code", lang: "python", title: "freeze arguments, keep a real function", numbered: false, code: `
from functools import partial

def send(url, payload, *, timeout, retries):
    ...

# A configured callable -- named, inspectable, picklable
send_to_billing = partial(send, "https://billing/api", timeout=5, retries=3)
send_to_billing({"id": 1})

# Where it beats a lambda: late binding
handlers = [partial(handle, n) for n in range(3)]     # each holds its own n
handlers = [lambda: handle(n) for n in range(3)]      # all see n == 2`},
        { t: "p", text: "`partial` binds the value **now**; a `lambda` closes over the variable and reads it **later** (Lesson 3.5). In a loop that difference is the classic bug where every callback uses the final value." },
        { t: "p", text: "It also survives `pickle`, which a `lambda` does not — so a `partial` can cross a `multiprocessing` boundary and a `lambda` cannot (Lesson 11.4)." }
      ]},
      { label: "reduce", blocks: [
        { t: "code", lang: "python", title: "rarely the clearest option", numbered: false, code: `
from functools import reduce
import operator

# Fine -- there is no builtin for product
product = reduce(operator.mul, [2, 3, 4], 1)

# NOT fine -- sum() exists and says more
total = reduce(operator.add, values)

# NOT fine -- quadratic, and unreadable
merged = reduce(lambda a, b: {**a, **b}, dicts, {})`,
          out: `24`},
        { t: "p", text: "Guido wanted `reduce` out of builtins for a reason: for 90% of uses there is a clearer name — `sum`, `max`, `any`, `all`, `math.prod`, `set.union`, `ChainMap`." },
        { t: "p", text: "**The initial value is not optional in practice.** `reduce(op, [])` raises `TypeError`; `reduce(op, [], 0)` returns 0. Empty input is normal in production, so always pass the third argument." }
      ]},
      { label: "caching", blocks: [
        { t: "code", lang: "python", title: "three tools, three lifetimes", numbered: false, code: `
from functools import cache, lru_cache, cached_property

@cache                       # unbounded -- only for a fixed, small key space
def parse_schema(name: str) -> dict: ...

@lru_cache(maxsize=1024)     # bounded -- the safe default
def geocode(postcode: str) -> tuple[float, float]: ...

class Report:
    @cached_property         # per instance, computed once, no eviction
    def totals(self) -> dict: ...

geocode.cache_clear()
print(geocode.cache_info())`},
        { t: "p", text: "All three require **hashable arguments**, so a function taking a `dict` or a list cannot be cached without converting the argument first." },
        { t: "p", text: "`cached_property` needs a writable `__dict__`, so it does **not** work on a class with `__slots__` or a frozen dataclass (Lesson 4.10)." }
      ]}
    ]},

    { t: "callout", kind: "trap", title: "`lru_cache` on a method keeps every instance alive", body: [
      { t: "code", lang: "python", title: "the leak", numbered: false, code: `
class Client:
    @lru_cache(maxsize=128)          # WRONG
    def fetch(self, key: str) -> bytes:
        ...

# The cache lives on the CLASS, and every entry's key includes self.
# So 128 Clients -- with their connections and buffers -- are pinned
# forever, whatever the rest of the program does with them.`},
      { t: "p", text: "The cache is created once, when the class body executes, and it is shared by every instance. Because `self` is part of the cache key, each entry holds a strong reference to an instance that can never be collected." },
      { t: "p", text: "**The fixes, in order of preference:** use `cached_property` when the value depends only on `self`; create a per-instance cache in `__init__` (`self._fetch = lru_cache(128)(self._fetch_uncached)`); or make the function a module-level one taking only the values it needs." },
      { t: "p", text: "The symptom in production is memory that grows to a plateau and never falls — easy to mistake for normal warm-up, because it does eventually stop." }
    ]},

    { t: "ladder",
      title: "Dispatching on type",
      rungs: [
        { level: "bad", label: "An isinstance chain",
          why: "Every new type means editing this function. It also has to know about types it should not depend on, and the ordering matters silently — `bool` before `int`, or the `bool` branch is unreachable.",
          code: `def serialise(value):
    if isinstance(value, datetime):
        return value.isoformat()
    elif isinstance(value, Decimal):
        return str(value)
    elif isinstance(value, set):
        return sorted(value)
    else:
        raise TypeError(f"cannot serialise {type(value)}")` },
        { level: "ok", label: "A dispatch dict",
          why: "Extensible without editing the function, and the ordering problem is gone. But it keys on the exact type, so a subclass of `Decimal` misses entirely and falls through to the error.",
          code: `HANDLERS = {
    datetime: lambda v: v.isoformat(),
    Decimal: str,
    set: sorted,
}

def serialise(value):
    handler = HANDLERS.get(type(value))
    if handler is None:
        raise TypeError(f"cannot serialise {type(value)}")
    return handler(value)` },
        { level: "best", label: "singledispatch",
          why: "Registration is by annotation, subclasses resolve through the MRO, and a new type is added from the module that defines it — the function never changes. The base implementation stays as the honest error.",
          code: `from functools import singledispatch

@singledispatch
def serialise(value):
    raise TypeError(f"cannot serialise {type(value).__name__}")

@serialise.register
def _(value: datetime) -> str:
    return value.isoformat()

@serialise.register
def _(value: Decimal) -> str:
    return str(value)

@serialise.register
def _(value: set) -> list:
    return sorted(value)`,
          note: "Dispatch is on the **first argument only**, and on its runtime type. For a method, use `singledispatchmethod`, which dispatches on the first argument after `self`." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A streaming log report",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Build a report over a log file too large to load. The file is already **sorted by service**, which is what makes a streaming solution possible — and what makes `groupby` the right tool here rather than the usual `defaultdict`." },
        { t: "p", text: "The interesting part is not writing the pipeline. It is that three of the requirements are places where the obvious `itertools` solution is wrong." }
      ],
      requirements: [
        "Read lazily — the function must never hold more than one group in memory.",
        "Skip a variable-length comment header at the top of the file.",
        "Group by service using `groupby`, given the file is pre-sorted.",
        "Per service report: event count, error count, and the largest gap in seconds between consecutive events.",
        "Insert into the database in batches of 500, including the final partial batch.",
        "Handle an empty file and a file that is nothing but header.",
        "**Explain why `dropwhile` is wrong for the header and `tee` is wrong for the two passes each group appears to need.**"
      ],
      hint: "For the gap calculation you need every event in a group, but you also need its count and error count. That looks like two passes over a one-pass iterator. Solve it with a single loop rather than with `tee`.",
      solution: {
        lang: "python",
        title: "report.py",
        code: `from __future__ import annotations

from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from itertools import groupby, islice
from operator import attrgetter
from typing import Protocol


@dataclass(frozen=True, slots=True)
class Event:
    service: str
    timestamp: float
    level: str


@dataclass(frozen=True, slots=True)
class ServiceReport:
    service: str
    events: int
    errors: int
    max_gap: float | None        # None when there is only one event


class Database(Protocol):
    def insert_many(self, rows: list[ServiceReport]) -> None: ...


# ---- 1. lazy reading, with the header skipped correctly -----------------

def parse(lines: Iterable[str]) -> Iterator[Event]:
    """Yield Events, skipping comment and blank lines ANYWHERE in the file.

    Why not dropwhile: dropwhile stops dropping at the first line that
    fails the predicate and then yields EVERYTHING, including comment
    lines that appear later in the file. Real logs have those -- a
    rotation marker, an operator note. A generator with a continue is
    both correct and clearer about the intent, which is "ignore comments"
    rather than "skip a prefix".
    """
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        service, timestamp, level = line.split(",")
        yield Event(service, float(timestamp), level)


# ---- 2. one pass per group, no tee -------------------------------------

def summarise(service: str, events: Iterator[Event]) -> ServiceReport:
    """Count, tally errors and find the largest gap in a SINGLE pass.

    Why not tee: tee would let us write three separate comprehensions,
    but it buffers everything one branch has consumed and the others
    have not -- so a service with ten million events holds all ten
    million in memory. That defeats the entire point of streaming.

    Why not pairwise: pairwise is the right tool for gaps, but combining
    it with the count and error tally would still need two passes.
    Tracking the previous timestamp by hand costs one variable.
    """
    count = 0
    errors = 0
    max_gap: float | None = None
    previous: float | None = None

    for event in events:
        count += 1
        if event.level == "ERROR":
            errors += 1
        if previous is not None:
            gap = event.timestamp - previous
            if max_gap is None or gap > max_gap:
                max_gap = gap
        previous = event.timestamp

    return ServiceReport(service, count, errors, max_gap)


# ---- 3. grouping and batching ------------------------------------------

def batches(it: Iterable[ServiceReport], size: int) -> Iterator[list[ServiceReport]]:
    """Python 3.12 has itertools.batched; this is the portable form.

    The walrus loop stops on the first empty list, and yields the final
    SHORT batch before it -- which is exactly the "if chunk:" line that
    hand-written chunking loops forget.
    """
    iterator = iter(it)
    while chunk := list(islice(iterator, size)):
        yield chunk


def build_report(lines: Iterable[str], db: Database, batch_size: int = 500) -> int:
    """Stream the file into the database. Returns the number of services.

    Memory is bounded by one batch of reports plus one event, whatever
    the size of the file.
    """
    events = parse(lines)
    key = attrgetter("service")

    # The file is pre-sorted by service, so groupby is correct WITHOUT
    # sorted() -- which is the whole reason this can stream. Sorting here
    # would load the entire file into memory and undo the design.
    summaries = (
        summarise(service, group)
        for service, group in groupby(events, key=key)
    )

    written = 0
    for batch in batches(summaries, batch_size):
        db.insert_many(batch)
        written += len(batch)
    return written


# ---- tests --------------------------------------------------------------

class FakeDB:
    def __init__(self) -> None:
        self.batches: list[list[ServiceReport]] = []

    def insert_many(self, rows: list[ServiceReport]) -> None:
        self.batches.append(list(rows))

    @property
    def rows(self) -> list[ServiceReport]:
        return [row for batch in self.batches for row in batch]


LINES = [
    "# generated 2026-01-01",
    "# columns: service,timestamp,level",
    "",
    "api,100.0,INFO",
    "api,105.0,ERROR",
    "api,125.0,INFO",
    "# --- log rotated ---",          # a comment AFTER the header
    "web,200.0,INFO",
    "web,201.0,INFO",
]


def test_groups_and_metrics() -> None:
    db = FakeDB()
    assert build_report(LINES, db) == 2

    api, web = db.rows
    assert (api.service, api.events, api.errors) == ("api", 3, 1)
    assert api.max_gap == 20.0                  # 125 - 105, not 105 - 100
    assert (web.events, web.errors, web.max_gap) == (2, 0, 1.0)


def test_mid_file_comment_is_skipped() -> None:
    """dropwhile would have yielded the rotation marker as data and
    crashed in split(), or worse, parsed it as a service name."""
    events = list(parse(LINES))
    assert len(events) == 5
    assert {e.service for e in events} == {"api", "web"}


def test_single_event_service_has_no_gap() -> None:
    db = FakeDB()
    build_report(["solo,1.0,INFO"], db)
    assert db.rows[0].max_gap is None           # not 0.0, which would be a lie


def test_final_partial_batch_is_written() -> None:
    lines = [f"svc-{i:03d},{i}.0,INFO" for i in range(7)]
    db = FakeDB()

    assert build_report(lines, db, batch_size=3) == 7
    assert [len(b) for b in db.batches] == [3, 3, 1]


def test_empty_and_header_only_files() -> None:
    for lines in ([], ["# nothing but a header", ""]):
        db = FakeDB()
        assert build_report(lines, db) == 0
        assert db.batches == []                 # no empty insert issued


def test_reading_is_lazy() -> None:
    """Proves nothing is materialised: an infinite source is consumed
    only as far as the first two groups, which islice then stops."""
    def forever() -> Iterator[str]:
        yield "a,1.0,INFO"
        yield "b,2.0,INFO"
        while True:
            yield "c,3.0,INFO"

    events = parse(forever())
    first_two = islice(groupby(events, key=attrgetter("service")), 2)
    assert [service for service, _ in first_two] == ["a", "b"]


if __name__ == "__main__":
    for t in (
        test_groups_and_metrics,
        test_mid_file_comment_is_skipped,
        test_single_event_service_has_no_gap,
        test_final_partial_batch_is_written,
        test_empty_and_header_only_files,
        test_reading_is_lazy,
    ):
        t()
    print("streaming report: constant memory, no tee, no dropwhile")`,
        notes: [
          { t: "p", text: "**`dropwhile` is wrong because it drops a prefix, not a category.** It stops at the first non-comment line and then yields everything, so the mid-file rotation marker reaches `split(\",\")` and either crashes or — worse — parses into a service named after the comment. A generator with `continue` says \"ignore comments\" instead of \"skip a prefix\", and is correct for both positions." },
          { t: "p", text: "**`tee` is wrong because it buffers.** Writing the count, the error tally and the gap as three separate comprehensions over three teed branches reads beautifully and holds every event of the largest service in memory. The single loop with a `previous` variable costs three lines and keeps the memory bound that the whole design exists to provide." },
          { t: "p", text: "**No `sorted()` around `groupby`.** Lesson 5.9's usual advice is to sort first — but here the precondition is already met by the file, and sorting would load it entirely. When you rely on pre-sorted input, say so in a comment: the next reader will otherwise \"fix\" it by adding `sorted()` and turn a streaming job into an out-of-memory one." },
          { t: "callout", kind: "insight", title: "The `max_gap is None` assertion", body: [
            { t: "p", text: "A service with one event has no gap. Returning `0.0` would be a plausible-looking lie that shows up in a dashboard as \"perfectly regular\" — indistinguishable from a service emitting events every zero seconds." },
            { t: "p", text: "`None` forces the consumer to decide what to display. That is the difference between a value that is absent and a value that is zero, and it is the same distinction as `dict.get(k)` returning `None` versus `0` (Lesson 2.3)." }
          ]},
          { t: "p", text: "**The laziness test is the one worth copying.** Asserting over an infinite generator is the only way to *prove* a pipeline streams — a test on finite input passes just as happily when the function secretly calls `list()`." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly aggregation job that had run for a year starts reporting revenue roughly a third of the true figure. Nothing changed in the job. What changed was upstream: the export query lost its `ORDER BY customer_id` during an unrelated optimisation." },
      { t: "p", text: "**The job used `groupby` on input it assumed was sorted.** With the ordering gone, each customer's rows arrived in several runs, `groupby` produced several groups per customer, and the dict comprehension building the result kept only the last one. No exception, no log line — just smaller numbers." },
      { t: "p", text: "**Nobody noticed for four days** because the figures were plausible. It was found when a customer queried their invoice, and the diagnosis took a further day because the job's code was unchanged and correct-looking in isolation." },
      { t: "p", text: "**Two lessons.** A precondition that lives in another team's SQL is not a precondition you control — either sort defensively or assert the invariant (`assert keys == sorted(keys)`) so a violation fails loudly. And a job whose output can silently halve deserves a reconciliation check: totalling the input and the output independently would have caught this on night one (Lesson 14.4)." }
    ]}
  ],

  takeaways: [
    "**Every `itertools` callable returns a one-pass iterator.** Reusing an exhausted one yields nothing — silently — which is harder to debug than an exception.",
    "**`tee` buffers, it does not copy.** It is for two consumers advancing together; using it to iterate twice can hold the entire sequence in memory.",
    "`batched` (3.12+) yields the final short chunk automatically, removing the forgotten `if chunk:` that silently drops the last partial batch.",
    "**`dropwhile` drops a prefix, not a category** — it stops at the first item failing the predicate and yields everything after, later matches included.",
    "**`groupby` groups consecutive runs**, so unsorted input produces fragmented groups and a wrong number rather than an error. Use the same key function for the sort and the group.",
    "Prefer `defaultdict(list)` for grouping; use `groupby` when the input is already sorted and you need constant memory over data larger than RAM.",
    "**A `groupby` group is a sub-iterator over a shared cursor.** Advancing to the next group invalidates the previous one, so `list(groupby(...))` gives empty groups.",
    "**`partial` binds values now; a `lambda` reads variables later** — which is why `partial` is correct in a loop building callbacks, and why it survives pickling for `multiprocessing`.",
    "`reduce` is rarely the clearest option — `sum`, `max`, `any`, `math.prod` say more. When you do use it, always pass an initial value, because empty input otherwise raises.",
    "**`lru_cache` on a method leaks instances.** The cache lives on the class and keys include `self`, pinning every cached instance forever. Use `cached_property` or a per-instance cache.",
    "**`singledispatch` beats an `isinstance` chain** because registration lives with the type, subclasses resolve through the MRO, and the dispatching function never changes."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An aggregation using `groupby` reports a third of the true total after an upstream query lost its `ORDER BY`. Why?",
        options: [
          "`groupby` raises on unsorted input, and the error was swallowed",
          "`groupby` starts a new group whenever the key changes, so each customer produced several groups and the dict kept only the last",
          "The sort order affects hashing, so keys collided",
          "`groupby` samples large inputs for performance"
        ],
        answer: 1,
        why: "`groupby` groups **consecutive runs**, not values — it walks the input once and never looks back. Unsorted input therefore yields the same key in several groups, and building a dict from those keeps only the final one. There is no error and the numbers stay plausible, which is why this class of bug survives for days. Either sort with the same key function, or assert the ordering invariant so a violation fails loudly."
      },
      {
        stem: "Why is `a, b = tee(source)` a poor way to iterate over data twice?",
        options: [
          "`tee` re-reads the source, so side effects run twice",
          "It buffers everything one branch has consumed and the other has not — consuming `a` fully holds the entire sequence in memory",
          "The two branches yield items in different orders",
          "`tee` only works on sequences, not on generators"
        ],
        answer: 1,
        why: "`tee` maintains a shared buffer so the lagging branch can still see items the leading one has passed. Used as intended — branches advancing together — the buffer stays small. Used to \"copy\" an iterator for two full passes, peak memory is the whole sequence, from a call that looks free. If you genuinely need the data twice, call `list()`, which at least makes the cost visible."
      },
      {
        stem: "A `Client` class caches with `@lru_cache(maxsize=128)` on a method. Memory grows to a plateau and never falls. Why?",
        options: [
          "`lru_cache` never evicts when `maxsize` is set",
          "The cache lives on the class and its keys include `self`, so up to 128 instances are pinned forever",
          "Each instance creates its own 128-entry cache",
          "The decorator prevents `__del__` from running"
        ],
        answer: 1,
        why: "The decorator runs once, when the class body executes, so all instances share one cache. Because `self` is part of the key, every entry holds a strong reference to an instance — along with its connections and buffers — that can never be collected. The plateau is the cache filling to `maxsize`, which is exactly why it looks like normal warm-up. Use `cached_property` when the value depends only on `self`, or build a per-instance cache in `__init__`."
      },
      {
        stem: "You need to skip comment lines in a log file that also contains comments partway through. Why is `dropwhile` wrong?",
        options: [
          "`dropwhile` is eager and would read the whole file",
          "It stops dropping at the first non-comment line and yields everything after it, including later comments",
          "It cannot take a lambda predicate",
          "It drops the first matching item only"
        ],
        answer: 1,
        why: "`dropwhile` removes a **prefix**, not a category: once the predicate fails it stops testing and passes everything through. A mid-file rotation marker then reaches your parser, which either crashes on `split` or, worse, parses the comment as data. A generator with `continue` expresses \"ignore comments\" rather than \"skip a prefix\", and handles both positions."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use `itertools.groupby`?",
        strong: "When the input is already sorted on the grouping key — a query with `ORDER BY`, a sorted export — because then it groups in constant memory over data larger than RAM. Otherwise `defaultdict(list)` is cheaper and has no precondition.",
        answer: [
          { t: "p", text: "Stating the precondition unprompted is what separates a real answer from a recited one: `groupby` groups consecutive runs, so unsorted input fragments each key across several groups and produces a wrong number rather than an error." },
          { t: "p", text: "The second sharp edge is worth adding: each group is a sub-iterator over a shared cursor, so advancing to the next group invalidates the previous one. `list(groupby(...))` returning empty groups surprises almost everyone once." },
          { t: "p", text: "And the honest default — reach for `defaultdict(list)` unless you specifically need streaming — shows judgement rather than enthusiasm for the module." }
        ]
      },
      {
        level: "core",
        q: "`partial` or a `lambda`?",
        strong: "`partial` binds argument values at creation time; a `lambda` closes over variables and reads them when called. In a loop building callbacks, the `lambda` version has every callback see the final value — `partial` gives each its own.",
        answer: [
          { t: "p", text: "The late-binding distinction is the substantive part, and it is the same mechanism behind the mutable-default and closure surprises from Lessons 3.2 and 3.5 — worth connecting rather than treating as trivia." },
          { t: "p", text: "The picklability point is the one that lands with anyone who has run `multiprocessing`: a `partial` can cross a process boundary and a `lambda` raises." },
          { t: "p", text: "Balance it by conceding where `lambda` wins — a short expression used once, especially as a `key=` argument, where `partial` would be heavier for no gain." }
        ]
      },
      {
        level: "advanced",
        q: "A service's memory rises to a plateau after deploy and never falls. Where do you look?",
        strong: "Caches keyed on objects. The specific pattern is `lru_cache` on a method: the cache lives on the class, `self` is part of the key, so up to `maxsize` instances are pinned with everything they hold. The plateau is the cache filling, which is why it looks benign.",
        answer: [
          { t: "p", text: "Naming *why the plateau is misleading* is what makes this a diagnosis rather than a guess — bounded growth reads as warm-up, so this survives review far longer than an unbounded leak would." },
          { t: "p", text: "Widening slightly shows range: unbounded `@cache` on a function taking user-supplied strings, module-level dicts used as caches, and `defaultdict` reads inserting keys (Lesson 5.9) are the same failure with different spelling." },
          { t: "p", text: "The remedies rank naturally — `cached_property` when the value depends only on `self`, a per-instance cache built in `__init__`, or a module-level function taking only the values it needs — and each removes the reference rather than merely bounding it." }
        ]
      },
      {
        level: "advanced",
        q: "How would you prove a data pipeline actually streams?",
        strong: "Feed it an infinite generator and assert it terminates when you take a bounded slice. A test over finite input passes just as happily when the function secretly calls `list()` internally.",
        answer: [
          { t: "p", text: "This is a genuinely useful technique and few candidates reach for it — laziness is a property no assertion over finite data can distinguish." },
          { t: "p", text: "The complementary check is memory: `tracemalloc` around the pipeline over a large input, asserting peak stays bounded, catches the `tee`-style buffering that an infinite-generator test still passes." },
          { t: "p", text: "Mentioning what breaks streaming — `sorted()`, `len()`, a list comprehension in the middle, `tee` — shows you know the failure is usually one careless line rather than a design error." }
        ]
      }
    ]
  }
});
