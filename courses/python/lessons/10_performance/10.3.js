/* ============================================================================
   LESSON 10.3 — Measuring and Reducing Memory
   ========================================================================= */
EC.receiveLesson({
  id: "10.3",

  lede: "Memory is the resource people optimise last and get killed by first. A slow endpoint degrades; a process that exceeds its limit is **terminated mid-request with no traceback**. The good news is that the decisions that matter are few, and the biggest one — stream it or hold it — usually costs nothing to make correctly.",

  objectives: [
    "Measure allocation honestly, and know what each tool actually reports",
    "Explain where a Python object's bytes go",
    "Choose between a list, a generator and an array with numbers behind it",
    "Apply `__slots__` and know when it does not help",
    "Size a container limit from peak rather than average usage"
  ],

  prerequisites: ["8.8", "10.2"],

  blocks: [

    { t: "h2", n: "01", text: "Measuring", id: "measuring" },

    { t: "table",
      head: ["Tool", "Reports", "Use it for"],
      rows: [
        ["`sys.getsizeof(obj)`", "One object, **shallowly**", "Almost nothing — see below"],
        ["`tracemalloc`", "Python-side allocations, attributed to lines", "**The default.** Which code allocated what"],
        ["`psutil ... .rss`", "The whole process, as the OS sees it", "The number your container limit compares against"],
        ["`memray`", "Every allocation including C extensions, as a flame graph", "When `tracemalloc` shows nothing"],
        ["`pympler.asizeof`", "One object, **deeply**", "Sizing a data structure you are choosing between"],
        ["`gc.get_objects()`", "Every tracked object", "Counting by type when something is multiplying"]
      ],
      caption: "**These measure different things and disagree by design.** `tracemalloc` will not equal RSS: the interpreter, loaded extensions, thread stacks and the allocator's own fragmentation are all real memory that Python never allocated (Lesson 8.8)."
    },

    { t: "code", lang: "python", title: "why getsizeof misleads", code: `
import sys


class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y


p = Point(1, 2)
print(sys.getsizeof(p))                  # the instance header only
print(sys.getsizeof(p.__dict__))         # the dict hanging off it

rows = [{"id": i, "name": "x" * 20} for i in range(1000)]
print(sys.getsizeof(rows))               # the LIST OF POINTERS. Not the dicts.
`,
      out: `48
104
8856`,
      caption: "**8,856 bytes for a thousand dicts each holding a 20-character string.** `getsizeof` on a container reports the container: eight bytes per pointer plus overhead, and nothing about what the pointers lead to."
    },

    { t: "code", lang: "python", title: "measure allocation instead", code: `
import gc
import tracemalloc


def peak_bytes(build) -> int:
    """What building this actually costs. Collect first so the baseline
    is not carrying the previous measurement's garbage."""
    gc.collect()
    tracemalloc.start()
    obj = build()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    del obj
    return peak


print(peak_bytes(lambda: [{"id": i, "name": "x" * 20} for i in range(1000)]))
`,
      out: `184320`,
      caption: "**184 KB, not 8.9 KB** — a factor of twenty between the shallow number and the real one. Any decision made on `getsizeof` for a container is made on the wrong figure."
    },

    { t: "h2", n: "02", text: "Where the bytes go", id: "where" },

    {"kind": "compare", "title": "Where the bytes go", "caption": "An int is 28 bytes; a list of a million ints is 8 MB of pointers plus 28 MB of ints. The same numbers in a NumPy array are 8 MB total, and __slots__ removes the per-instance dict from objects.", "columns": [{"title": "list of 1M ints", "tone": "crit", "items": ["8 MB of pointers", "+ 28 MB of int objects", "≈ 36 MB"]}, {"title": "array / numpy int64", "tone": "good", "items": ["8 bytes each, contiguous", "≈ 8 MB"]}, {"title": "1M small objects", "tone": "warn", "items": ["~56 bytes + __dict__ each", "__slots__: ~48 bytes, no dict"]}], "t": "diagram", "id": "dg-10_3-02-0"},


    { t: "viz",
      title: "The cost of one record, four ways",
      caption: "Every Python object carries a header — a reference count and a type pointer — before any of its data. That fixed cost is what makes a million small objects expensive, and it is the cost an array eliminates rather than reduces.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Bar chart comparing the per-record memory cost of a dict, a plain class, a slotted class and a columnar array">
  <text x="14" y="26" class="s-label">BYTES PER RECORD — three fields: an id, a name, a score</text>

  <text x="14" y="66" class="s-mono" style="font-size:11px">dict</text>
  <rect x="120" y="52" width="620" height="22" rx="4" style="fill:var(--crit)" opacity=".85"/>
  <text x="752" y="68" class="s-mono" style="font-size:11px;fill:var(--crit)">~248 B</text>

  <text x="14" y="112" class="s-mono" style="font-size:11px">class</text>
  <rect x="120" y="98" width="600" height="22" rx="4" style="fill:var(--warn)" opacity=".85"/>
  <text x="732" y="114" class="s-mono" style="font-size:11px;fill:var(--warn)">~240 B</text>

  <text x="14" y="158" class="s-mono" style="font-size:11px">__slots__</text>
  <rect x="120" y="144" width="185" height="22" rx="4" style="fill:var(--accent)" opacity=".85"/>
  <text x="317" y="160" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">~72 B</text>

  <text x="14" y="204" class="s-mono" style="font-size:11px">arrays</text>
  <rect x="120" y="190" width="62" height="22" rx="4" style="fill:var(--good)" opacity=".9"/>
  <text x="194" y="206" class="s-mono" style="font-size:11px;fill:var(--good)">~24 B</text>

  <line x1="14" y1="234" x2="886" y2="234" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="262" class="s-sub">The class and the dict are nearly identical: an instance IS a dict, plus a header.</text>
  <text x="14" y="286" class="s-sub" style="fill:var(--good)">Columns remove the per-object header entirely — that is the tenfold step, not a tweak.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the same data, four representations", code: `
from array import array
from dataclasses import dataclass

N = 1_000_000

# 1. dicts — what parsed JSON gives you
dicts = [{"id": i, "score": i * 1.5} for i in range(N)]          # ~248 MB

# 2. a plain class — an instance is a dict with a header
@dataclass
class Row:
    id: int
    score: float
rows = [Row(i, i * 1.5) for i in range(N)]                        # ~240 MB

# 3. __slots__ — a fixed array of pointers, names stored once on the class
@dataclass(slots=True)
class SlottedRow:
    id: int
    score: float
slotted = [SlottedRow(i, i * 1.5) for i in range(N)]              # ~72 MB

# 4. columns — no per-row object at all
ids = array("q", range(N))                                         # 8 B each
scores = array("d", (i * 1.5 for i in range(N)))                   # 8 B each
                                                                   # ~16 MB
`,
      hl: [16, 22, 23],
      caption: "**A Python `int` is 28 bytes on its own**; an `array(\"q\")` element is 8. Small integers are interned and shared, which is why the arrays win by less than the arithmetic suggests — and still by a factor of ten."
    },

    { t: "callout", kind: "trap", title: "`__slots__` does not always help", body: [
      { t: "ul", items: [
        "**It saves nothing if you have a handful of instances.** The gain is per instance; a hundred objects is a few kilobytes.",
        "**It removes `__dict__`**, so `cached_property` raises, arbitrary attributes cannot be set, and anything that patches an attribute in a test fails (Lesson 8.5).",
        "**It removes `__weakref__`** unless you list it, which breaks weak-reference caches.",
        "**Multiple inheritance from two slotted classes with non-empty slots is an error.**",
        "**It does not shrink the values.** A slotted class holding a 4 KB string still holds a 4 KB string."
      ]},
      { t: "code", lang: "python", title: "the interaction people hit", numbered: false, code: `
@dataclass(slots=True)
class Report:
    rows: list

    @functools.cached_property           # TypeError at first access:
    def total(self):                     # no __dict__ to cache into
        return sum(self.rows)`},
      { t: "p", text: "**Reach for it when you have hundreds of thousands of instances of a small, fixed shape.** Below that it is a constraint bought for nothing." }
    ]},

    { t: "h2", n: "03", text: "The decision that matters most", id: "streaming" },

    { t: "ladder",
      title: "Summarising a 4 GB export",
      rungs: [
        { level: "bad", label: "Read it all",
          why: "Peak memory is the whole file plus the parsed objects — several times the file size once every line is a dict. The container limit has to accommodate the largest file anyone will ever send, and it is exceeded by the first one that grows.",
          code: `rows = [json.loads(line) for line in open(path)]
total = sum(r["amount"] for r in rows)` },
        { level: "ok", label: "Stream the source, materialise the result",
          why: "The file is no longer resident, which is the bulk of the win. But the intermediate list still holds every parsed row, so memory still scales with the input.",
          code: `rows = [json.loads(line) for line in open(path)]   # still a list
# ...or, better:
with open(path) as f:
    rows = [json.loads(line) for line in f]` },
        { level: "best", label: "Stream end to end",
          why: "One line resident at a time, whatever the file size. Peak memory becomes a property of the code rather than of the input — which is what lets you set a container limit and keep it.",
          code: `from collections.abc import Iterator


def parse(path: str) -> Iterator[dict]:
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


total = sum(row["amount"] for row in parse(path))

# And when the result is genuinely per-group rather than a scalar,
# aggregate into something bounded rather than collecting the rows:
totals: dict[str, Decimal] = defaultdict(Decimal)
for row in parse(path):
    totals[row["customer"]] += Decimal(row["amount"])`,
          note: "**The bound is now the number of customers, not the number of rows** — which is the general move: aggregate into a structure sized by the answer rather than by the input (Lesson 8.1)." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "When a list is the right answer", body: [
      { t: "table",
        head: ["", "Generator", "List"],
        rows: [
          ["Memory", "One item", "All of them"],
          ["Iterating twice", "**Impossible** — re-create it", "Free"],
          ["`len()`, indexing, slicing", "**No**", "Yes"],
          ["Sorting, joining, random access", "Must materialise anyway", "Already there"],
          ["A traceback through it", "Runs through every stage", "One frame"],
          ["Debugging", "Harder — nothing to inspect", "Print it"]
        ]
      },
      { t: "p", text: "**Use a list when the data is small and bounded, or when you need it twice.** A generator over 200 configuration entries buys nothing and costs readability." },
      { t: "p", text: "**Use a generator when the size is set by input you do not control.** That is the case where a list turns a working service into an out-of-memory kill, and the one where the choice is not a matter of taste." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Bring a report job inside a 512 MB limit",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "This job is OOM-killed on the largest customers. The container has 512 MB, the input is a 900 MB JSONL export, and the output is a per-customer summary — a few thousand rows." },
        { t: "code", lang: "python", title: "report.py — as found", numbered: false, code: `
def build_report(path):
    rows = [json.loads(line) for line in open(path)]

    customers = {}
    for row in rows:
        cid = row["customer_id"]
        if cid not in customers:
            customers[cid] = []
        customers[cid].append(row)

    summaries = []
    for cid, crows in customers.items():
        summaries.append({
            "customer_id": cid,
            "total": sum(float(r["amount"]) for r in crows),
            "count": len(crows),
            "first_seen": min(r["timestamp"] for r in crows),
        })

    return sorted(summaries, key=lambda s: -s["total"])`},
        { t: "p", text: "Fix it, and be able to say what the new peak is as a formula rather than a measurement." }
      ],
      requirements: [
        "Peak memory must be a function of the number of customers, not the number of rows.",
        "Every output field must be computable in one pass.",
        "Money must survive as `Decimal`.",
        "Prove the fix with a measurement, not an assertion of intent.",
        "State what still scales with input, and why that is acceptable.",
        "Explain why the `sorted()` at the end is not the problem."
      ],
      hint: "Three things hold the whole input: the list, the grouping dict, and the fact that `min()` needs every timestamp. Two of the three go away entirely; the third becomes one value per customer.",
      solution: {
        lang: "python",
        title: "report.py",
        code: `# =========================================================================
# WHERE THE 900 MB BECAME 4 GB
# =========================================================================
#
# 1. rows = [json.loads(line) for line in open(path)]
#    Every line becomes a dict. A 900 MB file of small JSON objects is
#    roughly 3-4 GB once parsed: each dict has a header, a hash table and
#    a str object per key and value.
#
# 2. customers[cid].append(row)
#    A second reference to every row. It does not copy them -- the dicts
#    are shared -- but it means nothing can be freed while the grouping
#    exists, so the peak is the whole input regardless.
#
# 3. min(r["timestamp"] for r in crows)
#    Needs every row of a customer at once, which is WHY the grouping
#    exists. Remove the need and the grouping goes with it.
#
# 4. open(path) with no with
#    The handle is only closed when the generator is collected, which on
#    a failure path may be much later (Lesson 5.8).
#
# Also: float for money (Lesson 2.6), and no error handling, so one
# malformed line loses the whole run.


from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation


@dataclass(slots=True)
class Summary:
    """One per CUSTOMER, not per row. slots because there may be tens of
    thousands of these and the shape is fixed."""

    customer_id: str
    total: Decimal = Decimal("0")
    count: int = 0
    first_seen: str | None = None

    def add(self, amount: Decimal, timestamp: str) -> None:
        """Everything the report needs, accumulated incrementally.

        first_seen is the interesting one: min() over a list needs the
        list, but min() over a stream is just "keep the smaller". That
        single change is what removes the grouping dict, and with it the
        reason the whole input was held.
        """
        self.total += amount
        self.count += 1
        if self.first_seen is None or timestamp < self.first_seen:
            self.first_seen = timestamp


def parse(path: str) -> Iterator[dict]:
    """One line resident at a time. The with block closes the handle on
    every exit path, including an exception midway."""
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def build_report(path: str) -> tuple[list[Summary], int]:
    """Peak memory is O(customers), not O(rows).

    Returns the summaries and the count of unparseable rows -- skipping
    is right for a batch job, but skipping silently is not (Lesson 5.12).
    """
    summaries: dict[str, Summary] = {}
    skipped = 0

    for row in parse(path):
        try:
            cid = row["customer_id"]
            amount = Decimal(str(row["amount"]))
            timestamp = row["timestamp"]
        except (KeyError, TypeError, InvalidOperation):
            skipped += 1
            continue

        summary = summaries.get(cid)
        if summary is None:
            summary = summaries[cid] = Summary(cid)
        summary.add(amount, timestamp)

    return sorted(summaries.values(), key=lambda s: -s.total), skipped


# =========================================================================
# WHY sorted() AT THE END IS NOT THE PROBLEM
# =========================================================================
#
# sorted() does materialise a list -- but of SUMMARIES, one per customer.
# A few thousand slotted objects is a few hundred kilobytes, and it is
# the answer rather than the input.
#
# The rule that generalises: materialising is fine when the thing being
# materialised is sized by the ANSWER. It is fatal when it is sized by
# the INPUT. The original did the second twice.


# =========================================================================
# THE NEW PEAK, AS A FORMULA
# =========================================================================
#
#   one line of text                        ~200 B
# + one parsed dict, freed each iteration   ~500 B
# + one Summary per customer                ~72 B + Decimal + str
# + the summaries dict itself               ~100 B per entry
#
#   peak  ~=  customers x ~400 B  +  a few KB of working set
#
#   5,000 customers    ->  ~2 MB
#   500,000 customers  ->  ~200 MB      still inside 512 MB
#
# WHAT STILL SCALES WITH INPUT: nothing. What scales with CUSTOMERS is
# the summaries dict, and that is acceptable because it is the output --
# if it did not fit, neither would the report.
#
# If customer count ever became the problem, the fix is the same shape
# one level up: sort the export by customer and emit each summary as its
# group ends, which makes the peak O(1) (Lesson 5.10).


# =========================================================================
# PROVING IT
# =========================================================================

import gc
import tracemalloc
from pathlib import Path


def write_export(path: Path, rows: int, customers: int) -> None:
    with path.open("w", encoding="utf-8") as f:
        for i in range(rows):
            f.write(json.dumps({
                "customer_id": f"c-{i % customers}",
                "amount": "19.99",
                "timestamp": f"2026-01-{(i % 28) + 1:02d}T00:00:00Z",
            }) + "\\n")


def peak_mb(fn) -> float:
    gc.collect()
    tracemalloc.start()
    fn()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak / 1024 / 1024


def test_peak_is_flat_in_the_number_of_rows(tmp_path):
    """THE test. Ten times the rows, the same customers, and the peak
    must not move -- which an assertion about intent cannot show and a
    measurement can."""
    small, large = tmp_path / "s.jsonl", tmp_path / "l.jsonl"
    write_export(small, rows=20_000, customers=500)
    write_export(large, rows=200_000, customers=500)

    small_peak = peak_mb(lambda: build_report(str(small)))
    large_peak = peak_mb(lambda: build_report(str(large)))

    assert large_peak < small_peak * 1.5, (
        f"peak grew with rows: {small_peak:.1f} MB -> {large_peak:.1f} MB"
    )


def test_peak_scales_with_customers_as_expected(tmp_path):
    """The honest half: it DOES grow with customers, and that is the
    design. Asserting the shape stops a future change hiding a leak."""
    few, many = tmp_path / "few.jsonl", tmp_path / "many.jsonl"
    write_export(few, rows=50_000, customers=100)
    write_export(many, rows=50_000, customers=10_000)

    assert peak_mb(lambda: build_report(str(many))) > \\
           peak_mb(lambda: build_report(str(few)))


def test_totals_are_exact(tmp_path):
    path = tmp_path / "x.jsonl"
    write_export(path, rows=300, customers=3)

    summaries, skipped = build_report(str(path))

    assert skipped == 0
    assert sum(s.count for s in summaries) == 300
    # 100 x 19.99 exactly -- with floats this is 1998.9999999999998
    assert summaries[0].total == Decimal("1999.00")


def test_a_malformed_line_is_counted_not_fatal(tmp_path):
    path = tmp_path / "bad.jsonl"
    path.write_text(
        '{"customer_id": "c-1", "amount": "1.00", "timestamp": "2026-01-01"}\\n'
        '{"customer_id": "c-2"}\\n'
        '{"customer_id": "c-1", "amount": "2.00", "timestamp": "2026-01-02"}\\n',
        encoding="utf-8",
    )

    summaries, skipped = build_report(str(path))

    assert skipped == 1
    assert summaries[0].total == Decimal("3.00")


def test_first_seen_is_the_earliest(tmp_path):
    """min() over a stream, not over a retained list -- the change that
    removed the grouping dict."""
    path = tmp_path / "t.jsonl"
    path.write_text("".join(
        json.dumps({"customer_id": "c-1", "amount": "1.00", "timestamp": t}) + "\\n"
        for t in ("2026-03-01", "2026-01-01", "2026-02-01")
    ), encoding="utf-8")

    summaries, _ = build_report(str(path))
    assert summaries[0].first_seen == "2026-01-01"`,
        notes: [
          { t: "p", text: "**`min()` over a list is what forced the grouping to exist.** Every other field was already an accumulation; the earliest timestamp looked like it needed all the rows, so the code kept all the rows. Rewriting it as \"keep the smaller so far\" removes the requirement, and the grouping dict — and the 4 GB — goes with it." },
          { t: "p", text: "**The list and the grouping dict were not two copies of the data.** The dicts are shared, so the second structure costs eight bytes per row in pointers. What it cost was *liveness*: while the grouping existed nothing could be freed, so the peak was the whole input regardless of the streaming." },
          { t: "p", text: "**Materialising is fine when the thing materialised is sized by the answer.** `sorted()` at the end builds a list of a few thousand summaries and is not worth optimising. The original materialised twice, both times sized by the input, which is the distinction that matters." },
          { t: "callout", kind: "insight", title: "The test asserts a shape, not a number", body: [
            { t: "p", text: "Ten times the rows with the same customer count must not move the peak. That is a claim about the algorithm, and it stays true across platforms, Python versions and allocator behaviour — where an assertion like `peak < 200 MB` would be brittle and would pass on the broken version given a small enough fixture." },
            { t: "p", text: "The second test asserts the peak *does* grow with customers. Pinning the intended shape in both directions is what stops a later change quietly reintroducing input-sized retention (Lesson 8.9)." }
          ]},
          { t: "p", text: "**If customers ever became the bound, the fix is the same move one level up**: sort the export by customer, emit each summary as its group ends, and the peak becomes constant. Worth knowing before you need it, because it changes the export rather than the job." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A data pipeline runs comfortably in a 2 GB container for a year. One customer onboards with ten times the volume of any existing account, and the job is OOM-killed every night." },
      { t: "p", text: "**The code had no memory bug.** It read a customer's records into a list, transformed them and wrote them out — correct, readable, and with peak memory proportional to the largest customer. It had simply never met a large one." },
      { t: "p", text: "**The first attempt was to raise the limit to 8 GB.** That worked for two months, cost four times as much across every replica, and failed again on the next large account — because the limit was chasing a number the code did not bound." },
      { t: "p", text: "**Rewriting the transform as a generator took an afternoon and fixed it permanently**, because peak memory became a property of the code rather than of the input. The rule worth taking: **when memory scales with something you do not control, no limit is the right limit.** Raising it buys time; bounding the algorithm ends the problem." }
    ]}
  ],

  takeaways: [
    "**`sys.getsizeof` is shallow.** On a container it reports the pointers, so a thousand dicts measure as 8 KB when they cost 184 KB.",
    "**Use `tracemalloc` to attribute allocation to lines**, and `psutil`'s RSS for the figure your container limit compares against — they disagree by design.",
    "**`tracemalloc` showing nothing is information**: the allocation is outside Python's allocator, which points at `memray` and a C extension (Lesson 8.9).",
    "**Every Python object carries a header** — a refcount and a type pointer — before any data, which is what makes a million small objects expensive.",
    "**A class instance is a dict plus a header**, so a plain class saves almost nothing over the dict it replaced.",
    "**`__slots__` removes the per-instance dict** and cuts a small record from roughly 240 bytes to 70 — worth it at hundreds of thousands of instances, not at hundreds.",
    "**`__slots__` also removes `__dict__` and `__weakref__`**, which breaks `cached_property`, ad-hoc attributes and weak-reference caches.",
    "**Columns remove the per-object header entirely.** A Python `int` is 28 bytes; an `array(\"q\")` element is 8 — a tenfold step, not a tweak.",
    "**Streaming is the decision that matters most**, because it makes peak memory a property of the code rather than of the input.",
    "**Aggregate into a structure sized by the answer, not the input.** A dict keyed by customer is bounded by customers however many rows arrive.",
    "**Rewrite `min()`/`max()` over a retained list as a running comparison** — that single change often removes the reason the data was held at all.",
    "**Size limits from peak, not average.** When memory scales with input you do not control, no limit is the right limit — bound the algorithm instead."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`sys.getsizeof(rows)` on a list of 1,000 dicts returns about 8,900 bytes. What does that number mean?",
        options: [
          "The list and its dicts occupy 8.9 KB",
          "Only the list itself — eight bytes per pointer plus overhead — and nothing about the dicts the pointers lead to",
          "The list is compressed in memory",
          "The dicts are interned and shared"
        ],
        answer: 1,
        why: "`getsizeof` is shallow: for a container it reports the container's own storage. The real cost here is about 184 KB, a factor of twenty higher, because each dict carries a header, a hash table and a `str` object per key and value. Measure with `tracemalloc`, which reports what was actually allocated."
      },
      {
        stem: "A job groups rows by customer so it can call `min(r[\"timestamp\"] for r in group)`. Why does that force the whole input to stay resident?",
        options: [
          "Because dictionaries copy their values",
          "`min()` over a list needs the list, so the grouping must retain every row — rewriting it as a running comparison removes the need and the retention",
          "Because `min()` is O(n log n)",
          "Because timestamps are strings rather than datetimes"
        ],
        answer: 1,
        why: "Every other field was already an accumulation; the earliest timestamp looked like it needed all the rows, so the code kept them. \"Keep the smaller so far\" computes the same answer in one pass, which lets the grouping dict hold one summary per customer instead of every row — turning peak memory from O(rows) into O(customers)."
      },
      {
        stem: "When does `__slots__` genuinely pay for itself?",
        options: [
          "On any class, since it is always smaller",
          "When there are hundreds of thousands of instances of a small, fixed-shape record — the saving is per instance",
          "When the class has more than ten attributes",
          "When instances are stored in a database"
        ],
        answer: 1,
        why: "It cuts a small record from roughly 240 bytes to 70 by removing the per-instance `__dict__`, which matters at scale and is invisible at a few hundred objects. It also costs real things: no `cached_property`, no ad-hoc attributes, and no weak references unless `__weakref__` is listed — constraints not worth buying for a saving you cannot measure."
      },
      {
        stem: "A nightly job is OOM-killed after a large customer onboards. The team raises the container from 2 GB to 8 GB. What is wrong with that?",
        options: [
          "Nothing — sizing to the workload is correct",
          "Peak memory scales with an input they do not control, so the limit is chasing a number the code never bounds — it buys time and fails on the next large account",
          "8 GB exceeds what Python can address",
          "The garbage collector performs worse with more memory"
        ],
        answer: 1,
        why: "The code had no bug: it read a customer's records into a list, which is correct and proportional to the largest customer. Raising the limit costs four times as much across every replica and postpones the failure. Streaming the transform makes peak memory a property of the code, which ends the problem instead of deferring it."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you find out where a Python process's memory is going?",
        strong: "`tracemalloc` snapshots compared across time, which attributes allocation to source lines. RSS from `psutil` for the process figure, and `memray` when `tracemalloc` shows nothing — that means the allocation is not Python-side.",
        answer: [
          { t: "p", text: "Explaining why the tools disagree is what shows the model is understood: `tracemalloc` sees only Python's allocator, so the interpreter, extensions and fragmentation are all real RSS it never reports." },
          { t: "p", text: "Warning against `sys.getsizeof` unprompted is a good signal, since it is the tool most people reach for and it is shallow." },
          { t: "p", text: "Separating a leak from unbounded growth of reachable objects keeps the diagnosis honest — the second is far more common and no tool flags it (Lesson 8.9)." }
        ]
      },
      {
        level: "core",
        q: "When would you use a generator instead of a list?",
        strong: "When the size is set by input I do not control. That makes peak memory a property of the code rather than of the data, which is the difference between a service that degrades and one that gets OOM-killed.",
        answer: [
          { t: "p", text: "The inverse matters as much: for small bounded data, or anything you need to iterate twice, sort or index, a list is correct and a generator costs readability for nothing." },
          { t: "p", text: "\"Aggregate into a structure sized by the answer, not the input\" is the sharper version of the rule and covers the case where you do need a result." },
          { t: "p", text: "Mentioning that a traceback runs through every stage of a generator pipeline is an honest cost, and shows the trade-off is understood rather than assumed." }
        ]
      },
      {
        level: "advanced",
        q: "A million records will not fit in memory. What are your options, in order?",
        strong: "Stream first — it is usually free and bounds the problem. If the result must be resident, drop the per-object header: `__slots__` for a tenth of the cost, columns or `array` for a further tenfold. Then chunk, then move it out of process.",
        answer: [
          { t: "p", text: "Ordering by cost-to-benefit rather than listing techniques is the substance: streaming changes the complexity class, while `__slots__` is a constant factor." },
          { t: "p", text: "Concrete numbers make it credible — roughly 250 bytes per dict, 70 with slots, 24 for three columnar fields — and show the tenfold step is the representation, not the tuning." },
          { t: "p", text: "Asking whether the data needs to be resident at all is the move that most often makes the rest unnecessary, and it is worth putting first." }
        ]
      }
    ]
  }
});
