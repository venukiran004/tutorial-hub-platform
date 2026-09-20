/* ============================================================================
   LESSON 2.8 — Choosing the Right Data Structure
   ========================================================================= */
EC.receiveLesson({
  id: "2.8",

  lede: "Most Python performance problems are not slow code — they are the **wrong container**, chosen by habit rather than by access pattern. A list where a set belongs turns a linear loop quadratic. This lesson replaces habit with a decision procedure you can apply in seconds and defend in review.",

  objectives: [
    "Pick a container from the access pattern rather than from familiarity",
    "Compare the built-in structures on the operations that actually matter",
    "Recognise the three access patterns that make a list the wrong choice",
    "Know the specialised structures that solve problems the built-ins solve badly",
    "Justify a choice with complexity rather than intuition"
  ],

  prerequisites: ["2.1", "2.2", "2.3"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The decision", id: "decision" },

    { t: "p", text: "Almost every choice is settled by answering one question: **how will this data be accessed?** Not what it contains, not where it came from — how it will be read." },

    { t: "viz",
      title: "Choosing by access pattern",
      caption: "Follow the question that matches your dominant operation. Where two apply, the one inside the innermost loop wins — that is the one whose cost gets multiplied.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Decision tree for choosing a Python container based on access pattern">
  <defs>
    <marker id="a11" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="330" y="16" width="240" height="34" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="450" y="38" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">How is it accessed?</text>

  <g style="stroke:var(--border-strong)" stroke-width="1.2" fill="none">
    <path d="M400 50 L160 78" marker-end="url(#a11)"/>
    <path d="M430 50 L360 78" marker-end="url(#a11)"/>
    <path d="M470 50 L560 78" marker-end="url(#a11)"/>
    <path d="M500 50 L760 78" marker-end="url(#a11)"/>
  </g>

  <rect x="20" y="82" width="230" height="40" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="135" y="100" text-anchor="middle" class="s-sub" style="fill:var(--ink-2);font-weight:600">Look up by key</text>
  <text x="135" y="115" text-anchor="middle" class="s-sub">"give me the user with id 7"</text>
  <rect x="60" y="134" width="150" height="30" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="135" y="154" text-anchor="middle" class="s-mono" style="fill:var(--good)">dict</text>

  <rect x="266" y="82" width="200" height="40" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="366" y="100" text-anchor="middle" class="s-sub" style="fill:var(--ink-2);font-weight:600">Test membership</text>
  <text x="366" y="115" text-anchor="middle" class="s-sub">"have I seen this id?"</text>
  <rect x="291" y="134" width="150" height="30" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="366" y="154" text-anchor="middle" class="s-mono" style="fill:var(--good)">set</text>

  <rect x="482" y="82" width="200" height="40" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="582" y="100" text-anchor="middle" class="s-sub" style="fill:var(--ink-2);font-weight:600">Iterate in order</text>
  <text x="582" y="115" text-anchor="middle" class="s-sub">"process each in turn"</text>
  <rect x="507" y="134" width="150" height="30" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="582" y="154" text-anchor="middle" class="s-mono" style="fill:var(--good)">list</text>

  <rect x="698" y="82" width="182" height="40" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="789" y="100" text-anchor="middle" class="s-sub" style="fill:var(--ink-2);font-weight:600">Fixed named fields</text>
  <text x="789" y="115" text-anchor="middle" class="s-sub">"a point, a row, a config"</text>
  <rect x="714" y="134" width="150" height="30" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="789" y="154" text-anchor="middle" class="s-mono" style="fill:var(--good)">NamedTuple / dataclass</text>

  <line x1="20" y1="188" x2="880" y2="188" style="stroke:var(--border)" stroke-width="1"/>
  <text x="20" y="212" class="s-sub" style="font-weight:700;letter-spacing:.08em">THEN CHECK FOR A SPECIALISED NEED</text>

  <rect x="20" y="226" width="205" height="44" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="122" y="245" text-anchor="middle" class="s-sub">add/remove at BOTH ends</text>
  <text x="122" y="261" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">collections.deque</text>

  <rect x="237" y="226" width="205" height="44" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="339" y="245" text-anchor="middle" class="s-sub">repeatedly take the smallest</text>
  <text x="339" y="261" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">heapq</text>

  <rect x="454" y="226" width="205" height="44" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="556" y="245" text-anchor="middle" class="s-sub">keep sorted while inserting</text>
  <text x="556" y="261" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">bisect.insort</text>

  <rect x="671" y="226" width="209" height="44" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="775" y="245" text-anchor="middle" class="s-sub">millions of numbers</text>
  <text x="775" y="261" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">array / numpy.ndarray</text>

  <text x="20" y="300" class="s-sub" style="fill:var(--ink-2)">Where two patterns apply, optimise the one inside the innermost loop — its cost is the one that gets multiplied.</text>
  <text x="20" y="318" class="s-sub" style="fill:var(--ink-3)">Holding the same data in two structures (a list for order, a set for membership) is a normal and correct trade.</text>
</svg>`
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "The comparison that matters", id: "comparison" },

    {"kind": "matrix", "title": "Which structure, by the operation you need", "caption": "Choose by the operation that will run most often. Membership tests and key lookups want a hash table; ordered positional access wants a list; a fixed record wants a tuple.", "rows": ["x in c", "c[i] by position", "c[key] by key", "append at end", "insert at front", "keeps order", "hashable"], "cols": ["list", "tuple", "set", "dict"], "cells": [[{"text": "O(n)", "tone": "warn"}, {"text": "O(n)", "tone": "warn"}, {"text": "O(1)", "tone": "good"}, {"text": "O(1) on keys", "tone": "good"}], [true, true, false, false], [false, false, false, true], [{"text": "O(1)", "tone": "good"}, false, {"text": "add O(1)", "tone": "good"}, {"text": "O(1)", "tone": "good"}], [{"text": "O(n)", "tone": "warn"}, false, "n/a", "n/a"], [true, true, false, true], [false, true, false, false]], "t": "diagram", "id": "dg-2_8-02-0"},



    { t: "table",
      head: ["Operation", "list", "tuple", "set", "dict", "deque"],
      rows: [
        ["Index by position", "<span class='big-o fast'>O(1)</span>", "<span class='big-o fast'>O(1)</span>", "—", "—", "<span class='big-o slow'>O(n)</span>"],
        ["Look up by key", "—", "—", "—", "<span class='big-o fast'>O(1)</span>", "—"],
        ["`x in c`", "<span class='big-o slow'>O(n)</span>", "<span class='big-o slow'>O(n)</span>", "<span class='big-o fast'>O(1)</span>", "<span class='big-o fast'>O(1)</span>", "<span class='big-o slow'>O(n)</span>"],
        ["Append at end", "<span class='big-o fast'>O(1)</span>", "—", "<span class='big-o fast'>O(1)</span>", "<span class='big-o fast'>O(1)</span>", "<span class='big-o fast'>O(1)</span>"],
        ["Insert/remove at front", "<span class='big-o slow'>O(n)</span>", "—", "—", "—", "<span class='big-o fast'>O(1)</span>"],
        ["Remove by value", "<span class='big-o slow'>O(n)</span>", "—", "<span class='big-o fast'>O(1)</span>", "<span class='big-o fast'>O(1)</span>", "<span class='big-o slow'>O(n)</span>"],
        ["Preserves order", "yes", "yes", "**no**", "yes", "yes"],
        ["Duplicates", "yes", "yes", "**no**", "keys: no", "yes"],
        ["Mutable", "yes", "**no**", "yes", "yes", "yes"],
        ["Hashable", "**no**", "if contents are", "**no**", "**no**", "**no**"]
      ],
      caption: "The `x in c` row decides more real performance outcomes than every other row combined. It is the difference between a linear loop and a quadratic one, and it costs one word to change."
    },

    { t: "callout", kind: "insight", title: "The three signals that a list is wrong", body: [
      { t: "ol", items: [
        "**`if x in some_list:` inside a loop.** Each test is a linear scan, so the loop is quadratic. Convert to a `set` once, before the loop.",
        "**`.pop(0)` or `.insert(0, x)`.** Every element shifts. Use a `deque`, which is O(1) at both ends.",
        "**A loop searching for a matching field** — `for u in users: if u.id == target`. That is a lookup written as a scan. Build a `dict` keyed by that field once and the search disappears."
      ]},
      { t: "p", text: "All three share a shape: an operation whose cost grows with the data, placed inside something that repeats. Spotting that shape is more valuable than memorising the table." }
    ]},

    { t: "code", lang: "python", title: "the cost, measured", code: `
import timeit

setup = "data = list(range(100_000)); target = 99_999"

as_list = timeit.timeit("target in data", setup=setup, number=1000)
as_set = timeit.timeit(
    "target in data", setup=setup + "; data = set(data)", number=1000
)

print(f"list: {as_list:.4f}s")
print(f"set:  {as_set:.6f}s")
print(f"ratio: {as_list / as_set:,.0f}x")
`,
      out: `list: 0.4821s
set:  0.000038s
ratio: 12,687x`,
      caption: "Four orders of magnitude, for one word. The conversion itself costs O(n) once, so it pays for itself after roughly two lookups."
    },

    /* ================================================================== */
    { t: "h2", n: "03", text: "Two structures, one dataset", id: "two-structures" },

    { t: "p", text: "Choosing a container is not always exclusive. When two access patterns both matter, holding the data twice is a normal engineering trade — you are spending memory to remove an order of complexity." },

    { t: "code", lang: "python", title: "order and membership together", code: `
class RecentIds:
    """Keeps insertion order for display AND O(1) membership for checks."""

    def __init__(self, limit: int = 1000) -> None:
        self._order: deque[str] = deque(maxlen=limit)   # order + bounded
        self._seen: set[str] = set()                    # fast membership
        self._limit = limit

    def add(self, item_id: str) -> bool:
        """Returns True if newly seen."""
        if item_id in self._seen:            # O(1), not a scan of _order
            return False

        if len(self._order) == self._limit:
            # deque discarded the oldest; drop it from the set too, or the
            # set grows without bound and the two views drift apart.
            self._seen.discard(self._order[0])

        self._order.append(item_id)
        self._seen.add(item_id)
        return True

    def __contains__(self, item_id: str) -> bool:
        return item_id in self._seen

    def __iter__(self):
        return iter(self._order)
`,
      caption: "The cost is roughly double the memory and the discipline of keeping the two views consistent. That discipline is the real risk — which is why the synchronisation is confined to one small class rather than scattered across callers."
    },

    { t: "callout", kind: "tradeoff", title: "When duplication is not worth it", body: [
      { t: "ul", items: [
        "**Small data.** Below a few hundred elements, a linear scan is faster than hashing in practice. Do not add a set to a list of ten items.",
        "**The membership test is rare.** If you scan once per run, the O(n) is paid once. The problem is scanning inside a loop.",
        "**A dict already does both.** If items have a natural key, a single dict gives lookup *and* insertion order — no second structure needed. That is usually the better answer than list-plus-set.",
        "**The synchronisation would be spread out.** Two structures updated in five places will drift. If you cannot confine the invariant to one class, prefer the slower single structure."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "The specialised structures", id: "specialised" },

    { t: "tabs", items: [
      { label: "deque", blocks: [
        { t: "code", lang: "python", title: "O(1) at both ends, and bounded", code: `
from collections import deque

queue = deque([1, 2, 3])
queue.appendleft(0)          # O(1) -- list.insert(0, x) is O(n)
queue.popleft()              # O(1) -- list.pop(0) is O(n)

# maxlen makes a self-trimming buffer: perfect for "last N events"
recent = deque(maxlen=3)
for i in range(6):
    recent.append(i)
print(list(recent))

# Rotation is O(k), useful for round-robin scheduling
d = deque([1, 2, 3, 4])
d.rotate(1)
print(list(d))
`,
          out: `[3, 4, 5]
[4, 1, 2, 3]`},
        { t: "p", text: "Use for queues, sliding windows, and \"keep the last N\" buffers. The trade-off: indexing into the middle is O(n), so a deque is a poor random-access structure." }
      ]},
      { label: "heapq", blocks: [
        { t: "code", lang: "python", title: "always know the smallest", code: `
import heapq

tasks = []
heapq.heappush(tasks, (2, "write report"))
heapq.heappush(tasks, (1, "fix outage"))
heapq.heappush(tasks, (3, "review PR"))

print(heapq.heappop(tasks))       # lowest priority number first

# Top-k without sorting the whole collection: O(n log k), not O(n log n)
scores = [88, 12, 95, 41, 77, 99]
print(heapq.nlargest(2, scores))
`,
          out: `(1, 'fix outage')
[99, 95]`},
        { t: "p", text: "A heap is a list maintained in heap order — it is not fully sorted, and printing it looks wrong. Use it for priority queues, schedulers, and top-k over a stream too large to sort. For a max-heap, negate the key." }
      ]},
      { label: "bisect", blocks: [
        { t: "code", lang: "python", title: "keep a list sorted as it grows", code: `
import bisect

scores = [50, 60, 75, 90]

# Insert while maintaining order -- O(n) for the shift, O(log n) to find
bisect.insort(scores, 68)
print(scores)

# The threshold-lookup pattern from Lesson 2.6
GRADES = ["f", "d", "c", "b", "a"]
print(GRADES[bisect.bisect_right([50, 60, 75, 90], 82)])
`,
          out: `[50, 60, 68, 75, 90]
b`},
        { t: "p", text: "Use for sorted lists that are read far more often than written, and for mapping a value into a band of thresholds. The insert is still O(n) because of the shift — if writes dominate, a heap or a sorted-container library is better." }
      ]},
      { label: "array / numpy", blocks: [
        { t: "code", lang: "python", title: "when a list of pointers is too heavy", code: `
import array
import sys

py_list = list(range(100_000))
compact = array.array("i", range(100_000))

print(sys.getsizeof(py_list))       # pointers + the int objects themselves
print(sys.getsizeof(compact))       # 4 bytes per value, contiguous
`,
          out: `800984
400064`},
        { t: "p", text: "A list stores pointers to heap objects (Lesson 2.1); `array` and `numpy.ndarray` store raw values contiguously. For millions of numbers this is several times less memory and enables vectorised operations. Use NumPy over `array` in practice — Lesson 15.1." }
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Choose, justify, measure",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Five scenarios. For each, name the structure you would use, state the access pattern that decides it, and give the complexity of the dominant operation." },
        { t: "p", text: "Then implement the third one and measure it against the obvious wrong choice, so the reasoning is backed by a number rather than an assertion." }
      ],
      requirements: [
        "**A.** A web server tracks the last 500 request IDs to detect duplicate submissions. Thousands of checks per second.",
        "**B.** A scheduler must always process the highest-priority pending job next; jobs arrive continuously.",
        "**C.** An import job reads 200,000 rows and must skip any whose ID was already imported in this run.",
        "**D.** A configuration object with fixed fields, passed through many functions, that must never be modified.",
        "**E.** A rolling 60-second window of latency measurements, appended at one end and expired from the other.",
        "For each: structure, deciding access pattern, and complexity of the dominant operation.",
        "Implement C both ways and measure the difference at 200,000 rows."
      ],
      hint: "For A, note that two patterns apply — bounded size and fast membership — which is the two-structures case. For E, the phrase \"appended at one end, expired from the other\" is the definition of one specific structure.",
      solution: {
        lang: "python",
        title: "choices.py",
        code: `# ---- the five answers -------------------------------------------------
#
# A. deque(maxlen=500) + set        -- two patterns both matter
#    pattern: bounded ordered history AND O(1) membership
#    dominant: membership test, O(1)
#    A deque alone would make each check O(n) over 500 items, thousands
#    of times a second. A set alone cannot expire the oldest entry.
#
# B. heapq                          -- priority queue
#    pattern: repeatedly extract the minimum while new items arrive
#    dominant: push/pop, O(log n)
#    Re-sorting a list on each insert is O(n log n) per job.
#
# C. set                            -- membership only
#    pattern: "have I seen this id?"
#    dominant: membership test, O(1)
#    A list makes the whole import O(n^2). Measured below.
#
# D. @dataclass(frozen=True) or NamedTuple
#    pattern: fixed named fields, read many times, never mutated
#    dominant: attribute access, O(1)
#    Frozen means the "must never be modified" rule is enforced by the
#    type rather than by convention (Lesson 2.5).
#
# E. deque                          -- append one end, expire the other
#    pattern: FIFO with time-based eviction
#    dominant: append and popleft, both O(1)
#    maxlen bounds by COUNT; for a time window, popleft while the oldest
#    timestamp is outside the window.


# ---- C, implemented both ways -----------------------------------------

import random
import timeit


def build_rows(n: int) -> list[dict]:
    random.seed(0)
    # ~10% duplicates, which is what makes the check worth doing at all
    return [{"id": random.randrange(n // 10 * 9)} for _ in range(n)]


def import_with_list(rows: list[dict]) -> list[dict]:
    seen: list[int] = []
    kept: list[dict] = []
    for row in rows:
        if row["id"] not in seen:      # O(len(seen)) EVERY row
            seen.append(row["id"])
            kept.append(row)
    return kept


def import_with_set(rows: list[dict]) -> list[dict]:
    seen: set[int] = set()
    kept: list[dict] = []
    for row in rows:
        if row["id"] not in seen:      # O(1) every row
            seen.add(row["id"])
            kept.append(row)
    return kept


def import_with_dict(rows: list[dict]) -> list[dict]:
    """Often the best answer: dedup AND keep an index, in one structure."""
    by_id: dict[int, dict] = {}
    for row in rows:
        by_id.setdefault(row["id"], row)   # keeps the FIRST occurrence
    return list(by_id.values())            # insertion order is guaranteed


if __name__ == "__main__":
    # Correctness first -- a speedup that changes results is not a speedup.
    small = build_rows(2_000)
    assert import_with_list(small) == import_with_set(small)
    assert import_with_set(small) == import_with_dict(small)

    # 20k, not 200k: the list version is quadratic and 200k would take
    # minutes. That is itself the finding.
    rows = build_rows(20_000)
    slow = timeit.timeit(lambda: import_with_list(rows), number=1)
    fast = timeit.timeit(lambda: import_with_set(rows), number=1)
    idx = timeit.timeit(lambda: import_with_dict(rows), number=1)

    print(f"list : {slow:.3f}s")
    print(f"set  : {fast:.4f}s   ({slow / fast:,.0f}x faster)")
    print(f"dict : {idx:.4f}s")
    print()
    print("At 20k rows the list version does ~90M comparisons.")
    print("At 200k it does ~9 BILLION -- 100x the data, 100x the cost")
    print("per row, so 10,000x the work. That is what O(n^2) means.")`,
        notes: [
          { t: "p", text: "**The scaling note at the end is the real lesson.** Ten times the data does not cost ten times as much in a quadratic algorithm — it costs a hundred times. That is why this class of bug passes testing on a fixture and takes down a production import: the fixture is small enough that quadratic and linear are indistinguishable." },
          { t: "p", text: "**Scenario A is the two-structures case**, and it is the only one of the five where duplication is justified. Both patterns are in the hot path — thousands of membership checks per second, plus bounded eviction — and neither structure provides both. The synchronisation is confined to one small class, which is what makes it safe." },
          { t: "p", text: "**`import_with_dict` is frequently the best answer to C**, and it is worth noticing why: the auxiliary `seen` set disappears because the dict is doing both jobs, and you end the loop holding an index you almost certainly need next. Using two structures where one suffices is the mirror-image mistake to using one where two are needed." },
          { t: "callout", kind: "insight", title: "The question to ask in review", body: [
            { t: "p", text: "When you see a container declared, ask **what is the dominant operation, and is it inside a loop?** Those two facts determine the right choice more reliably than any amount of intuition about which structure \"feels\" right." },
            { t: "p", text: "And when both a list and a set appear over the same data, check whether a dict would replace both — that is the most common over-engineering in this area." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly reconciliation job compares 500,000 records against a reference set. It ran in four minutes last year and now takes six hours. Nothing in the code changed; the reference data grew from 20,000 rows to 300,000." },
      { t: "p", text: "**The mechanism:** the reference data is loaded into a list and checked with `if record_id in reference`. That was 20,000 comparisons per record before, and is 300,000 now — fifteen times more work per record, on top of more records. Quadratic growth in both dimensions." },
      { t: "p", text: "**The fix is `reference = set(reference)` after loading.** One line, and the job returns to minutes. No algorithm changed; only the structure the membership test runs against." },
      { t: "p", text: "**Why it was not caught earlier:** at 20,000 reference rows the linear scan was fast enough to be invisible, so the code looked fine in review and passed every test. The bug was always present — it was latent, waiting for the data to grow. That is the defining property of a complexity bug, and the reason to reason about access patterns when the code is written rather than when it is slow." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Choose by access pattern, not by familiarity.** Lookup by key → `dict`. Membership → `set`. Ordered iteration → `list`. Fixed named fields → `NamedTuple`/`dataclass`.",
    "The `x in c` row of the comparison table decides more real performance outcomes than all the others combined: O(n) for a list, O(1) for a set or dict.",
    "**Three signals a list is wrong:** membership tests inside a loop, `.pop(0)`/`.insert(0, x)`, and a loop searching for a matching field.",
    "Where two patterns apply, optimise the one **inside the innermost loop** — that is the cost that gets multiplied.",
    "Holding data in two structures is a legitimate trade, but check first whether one `dict` gives you both lookup and order.",
    "Duplication is not worth it for small data, for rare membership tests, or when the synchronisation would be spread across many call sites.",
    "**`deque`** for both-ends access and bounded buffers; **`heapq`** for repeatedly taking the smallest; **`bisect`** for sorted-on-insert and threshold bands; **`array`/NumPy** for millions of numbers.",
    "Converting a list to a set costs O(n) once and pays for itself after about two lookups.",
    "**A complexity bug is latent, not absent.** It passes review and tests at fixture scale and surfaces when the data grows — which is why the reasoning belongs at write time."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A nightly job compares 500,000 records against a reference collection using `if rid in reference`. The reference grew from 20,000 to 300,000 rows and the job went from minutes to hours. What is the fix?",
        options: [
          "Sort `reference` and use `bisect` for binary search",
          "Convert `reference` to a `set` after loading — membership becomes O(1) instead of a linear scan",
          "Process the records in parallel across multiple processes",
          "Load the reference data in chunks to reduce memory pressure"
        ],
        answer: 1,
        why: "Each membership test scans the whole list, so the work is records × reference size. Growing the reference fifteen times multiplied the cost fifteen times. A set hashes and looks in one slot, making each test O(1) and the job linear in the number of records. Bisect would work at O(log n) but needs the list kept sorted and is strictly worse than a set for pure membership. Parallelism buys a constant factor against quadratic growth."
      },
      {
        stem: "Which access pattern makes `collections.deque` the right choice over a list?",
        options: [
          "Random access to elements in the middle by index",
          "Adding and removing at both ends, or keeping a bounded \"last N\" buffer",
          "Testing whether a value is present",
          "Sorting the contents frequently"
        ],
        answer: 1,
        why: "A deque is O(1) at both ends where a list is O(n) at the front, which makes it right for queues and sliding windows — and `maxlen` gives a self-trimming buffer. Its trade-off is that indexing into the middle is O(n), so it is a poor random-access structure. Membership is O(n) on both, so a set is the answer for option C."
      },
      {
        stem: "When is holding the same data in both a list and a set justified?",
        options: [
          "Whenever the collection exceeds 100 elements",
          "When both ordered access and fast membership are needed in the hot path, and the synchronisation can be confined to one class",
          "Never — duplicated state is always a design flaw",
          "Only when the data is immutable"
        ],
        answer: 1,
        why: "It is a real trade: memory and a consistency invariant, in exchange for removing an order of complexity. It is justified when both patterns are genuinely in the hot path and the two views can be kept in step inside a single small class. It is not justified when the data is small, when membership is tested rarely, when the synchronisation would be spread across many call sites — or, most commonly, when a single `dict` would provide both lookup and insertion order."
      },
      {
        stem: "Why do complexity bugs like this survive code review and a full test suite?",
        options: [
          "Reviewers rarely read loop bodies carefully",
          "At fixture scale a quadratic algorithm is indistinguishable from a linear one — the bug is latent and only surfaces as the data grows",
          "Test suites do not execute the same code paths as production",
          "Python's timing behaviour differs between development and production interpreters"
        ],
        answer: 1,
        why: "The code is correct, so it passes every functional test, and on a few hundred fixture rows the difference between O(n) and O(n²) is microseconds. The bug is present from the day it is written and only becomes visible when the data crosses a threshold — often in production, often long after the author has moved on. That is the argument for reasoning about access patterns when the container is chosen rather than when the job is already slow."
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
        q: "How do you decide between a list, a set and a dict?",
        strong: "By the dominant access pattern. Lookup by key is a dict, membership testing is a set, ordered iteration is a list. If two apply, optimise the one inside the innermost loop, because that is the cost that gets multiplied by the iteration count.",
        answer: [
          { t: "p", text: "The interviewer wants a procedure, not a description of the three types. Leading with \"access pattern\" and then applying it is what demonstrates one." },
          { t: "p", text: "The single most valuable thing to add is the membership contrast: `x in list` is O(n), `x in set` is O(1), and a membership test inside a loop is the difference between a linear and a quadratic algorithm. It is the highest-frequency performance bug in Python and it costs one word to fix." },
          { t: "p", text: "Mentioning that a dict often replaces a list-plus-set pair shows judgement in the other direction — knowing when *not* to add a second structure." }
        ]
      },
      {
        level: "core",
        q: "When would you use collections.deque instead of a list?",
        strong: "When you add or remove at the front. A list stores pointers contiguously, so `pop(0)` shifts every remaining element — O(n). A deque is O(1) at both ends. `maxlen` also gives a self-trimming buffer, which is ideal for \"keep the last N\".",
        answer: [
          { t: "p", text: "The mechanism matters more than the name: contiguous storage is what makes front operations expensive, and knowing that means you can derive the answer rather than recall it." },
          { t: "p", text: "The classic production symptom is worth describing: a worker using `jobs.pop(0)` slows down as its backlog grows, because each dequeue costs more as the queue lengthens — a feedback loop built into the data structure. It performs fine in staging, where the backlog is short." },
          { t: "p", text: "Balance it by naming the trade-off: indexing into the middle of a deque is O(n), so it is a poor choice when random access matters." }
        ]
      },
      {
        level: "advanced",
        q: "A job that took minutes now takes hours after the data grew. Nothing in the code changed. How do you approach it?",
        strong: "Look for operations whose cost grows with the data inside a loop — list membership tests, front insertions, linear searches for a matching field. Confirm with a profiler, then fix the structure rather than parallelising around it.",
        answer: [
          { t: "p", text: "The framing that earns credit: the bug did not appear when the data grew — it was always there, latent. At small scale a quadratic algorithm is indistinguishable from a linear one, so it passed review and every test." },
          { t: "p", text: "Making the scaling concrete lands well: ten times the data in a quadratic algorithm is a hundred times the work, not ten. That is why the degradation looks sudden and disproportionate rather than gradual." },
          { t: "p", text: "Close on why parallelism is the wrong first move. Throwing four processes at quadratic work buys a constant factor against a problem that grows with the square — the next data increase erases the gain. Fixing the structure changes the growth rate itself." }
        ],
        weak: "Reaching first for more memory, more workers, or a faster machine. All three are constant-factor responses to a growth-rate problem, and all three defer the same failure to a slightly larger dataset."
      }
    ]
  }
});
