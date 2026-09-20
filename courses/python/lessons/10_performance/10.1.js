/* ============================================================================
   LESSON 10.1 — Complexity, Practically
   ========================================================================= */
EC.receiveLesson({
  id: "10.1",

  lede: "Big-O is not a maths exam. It answers exactly one engineering question: **when the data gets ten times bigger, what happens to the time?** A linear job takes ten times longer. A quadratic job takes a hundred times longer — and on your test fixture the two were indistinguishable. This lesson teaches you to read growth off a page, prove it with a stopwatch, and then decide whether growth is even the thing that is hurting you.",

  objectives: [
    "Read the growth class of a function off the page using two rules",
    "Prove a growth class empirically by doubling the input, instead of arguing about it",
    "Name the five everyday operations that turn ordinary Python into an accidental O(n²)",
    "Explain why `list.append` is O(1) *amortised*, and when that promise stops helping",
    "Judge when complexity is the wrong thing to look at, because a constant factor or an I/O wait dominates"
  ],

  prerequisites: ["2.7", "2.8"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The only question big-O answers", id: "the-question" },

    { t: "p", text: "Complexity notation is often taught as though it measured speed. It does not. It says nothing about whether a function takes a microsecond or a minute. It describes **how the cost changes as the input grows**, and it deliberately discards everything else — the constant factors, the hardware, the language." },

    { t: "p", text: "That makes it a narrow tool. It is also the single most valuable thing you can know about a piece of code you are about to run on data ten times larger than you have ever tested it on." },

    { t: "callout", kind: "mental", title: "The one-sentence model", body: [
      { t: "p", text: "**Big-O is a growth rate, not a speed.** `O(n)` means *ten times the data, ten times the work*. `O(n²)` means *ten times the data, one hundred times the work*. Everything else in this lesson is a consequence of that sentence." },
      { t: "p", text: "The practical corollary: a growth-rate problem cannot be fixed by a constant-factor solution. Faster hardware, more workers and a rewrite in a faster language all multiply the cost by a fraction. Only changing the algorithm changes the exponent." }
    ]},

    { t: "table",
      head: ["Class", "Ten times the data means", "Where you meet it", "n = 1,000,000 at 100ns per step"],
      rows: [
        ["`O(1)`", "no change", "dict lookup, set membership, `list[i]`, `len()`", "0.0001 ms"],
        ["`O(log n)`", "one extra step per tenfold", "`bisect`, B-tree index lookup, binary search", "0.002 ms"],
        ["`O(n)`", "ten times the work", "one pass: `sum`, `max`, a `for` loop, `x in list`", "100 ms"],
        ["`O(n log n)`", "a little over ten times", "`sorted()`, `list.sort()`, most merge/join work", "2 seconds"],
        ["`O(n²)`", "**one hundred** times the work", "a scan inside a loop, nested loops over the same data", "**3 hours**"],
        ["`O(2ⁿ)`", "unusable past about n = 40", "naive recursion over subsets, unmemoised branching", "heat death"]
      ],
      caption: "Only two boundaries matter in practice. The first is between `O(n)` and `O(n²)` — that is the line most production incidents sit on. The second is between `O(n²)` and anything exponential, which is a design error rather than a performance bug."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Why the fixture never catches it", id: "fixture-blindness",
      sub: "The same bug, at four input sizes, on a logarithmic axis." },

    { t: "viz",
      title: "A linear and a quadratic job, measured at four scales",
      caption: "Every gridline is a factor of ten. At fixture scale the two algorithms are the same code as far as any test can tell — both finish in a tenth of a millisecond. The quadratic version is not slower at 100 records because it is not yet doing much squaring; the defect is fully present and simply not yet expensive.",
      svg: `<svg viewBox="0 0 900 340" role="img" aria-label="Bar chart comparing a linear and a quadratic algorithm at input sizes 100, 1000, 10000 and 100000 on a logarithmic time axis">
  <text x="20" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">WALL TIME TO PROCESS n RECORDS — EACH GRIDLINE IS 10×</text>

  <rect x="20" y="34" width="13" height="11" rx="2" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="40" y="44" class="s-sub">O(n) — one pass over the data</text>
  <rect x="250" y="34" width="13" height="11" rx="2" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="270" y="44" class="s-sub">O(n²) — a linear scan inside the loop</text>

  <g style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 4">
    <line x1="90" y1="223" x2="880" y2="223"/>
    <line x1="90" y1="196" x2="880" y2="196"/>
    <line x1="90" y1="169" x2="880" y2="169"/>
    <line x1="90" y1="142" x2="880" y2="142"/>
    <line x1="90" y1="115" x2="880" y2="115"/>
    <line x1="90" y1="88" x2="880" y2="88"/>
    <line x1="90" y1="61" x2="880" y2="61"/>
  </g>
  <line x1="90" y1="250" x2="880" y2="250" style="stroke:var(--border-strong)" stroke-width="1.4"/>

  <rect x="148" y="237" width="48" height="13" rx="2" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <rect x="204" y="237" width="48" height="13" rx="2" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="172" y="231" text-anchor="middle" class="s-sub">0.1 ms</text>
  <text x="228" y="231" text-anchor="middle" class="s-sub">0.1 ms</text>

  <rect x="333" y="210" width="48" height="40" rx="2" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <rect x="389" y="182" width="48" height="68" rx="2" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="357" y="204" text-anchor="middle" class="s-sub">1 ms</text>
  <text x="413" y="176" text-anchor="middle" class="s-sub">10 ms</text>

  <rect x="518" y="182" width="48" height="68" rx="2" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <rect x="574" y="128" width="48" height="122" rx="2" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="542" y="176" text-anchor="middle" class="s-sub">10 ms</text>
  <text x="598" y="122" text-anchor="middle" class="s-sub">1 s</text>

  <rect x="703" y="156" width="48" height="94" rx="2" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <rect x="759" y="74" width="48" height="176" rx="2" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="727" y="150" text-anchor="middle" class="s-sub">100 ms</text>
  <text x="783" y="68" text-anchor="middle" class="s-sub" style="fill:var(--crit);font-weight:700">100 s</text>

  <rect x="140" y="226" width="120" height="34" rx="6" style="fill:none;stroke:var(--accent-line)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="200" y="216" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink);font-weight:700">no measurable difference</text>

  <text x="200" y="270" text-anchor="middle" class="s-label">n = 100</text>
  <text x="385" y="270" text-anchor="middle" class="s-label">n = 1,000</text>
  <text x="570" y="270" text-anchor="middle" class="s-label">n = 10,000</text>
  <text x="755" y="270" text-anchor="middle" class="s-label">n = 100,000</text>

  <text x="200" y="292" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">your test fixture</text>
  <text x="385" y="292" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">staging</text>
  <text x="570" y="292" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">launch week</text>
  <text x="755" y="292" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">eighteen months later</text>

  <text x="20" y="324" class="s-sub" style="fill:var(--ink-2)">The defect exists in all four columns. It is only expensive in the last one — which is why complexity is a design-time concern, not a debugging one.</text>
</svg>`
    },

    { t: "p", text: "This is the shape of every complexity incident, and it is why the bug survives review, unit tests, integration tests and a staging soak. Nothing was wrong with the process. The process cannot see a growth rate — it can only see a duration, and durations agree until they violently do not." },

    /* ================================================================== */
    { t: "h2", n: "03", text: "Reading growth off the page", id: "reading-growth",
      sub: "Two rules and a habit. You do not need the algebra." },

    {"kind": "matrix", "title": "Growth classes at n = 1,000 and n = 1,000,000", "caption": "The constant does not matter; the column does. Quadratic at a million is a trillion steps — hours — which is why the accidental quadratic is the performance bug that reaches production.", "rows": ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)"], "cols": ["n = 10³", "n = 10⁶"], "cells": [[{"text": "1", "tone": "good"}, {"text": "1", "tone": "good"}], [{"text": "10", "tone": "good"}, {"text": "20", "tone": "good"}], [{"text": "10³", "tone": "accent"}, {"text": "10⁶", "tone": "accent"}], [{"text": "10⁴", "tone": "warn"}, {"text": "2 × 10⁷", "tone": "warn"}], [{"text": "10⁶", "tone": "crit"}, {"text": "10¹² — hours", "tone": "crit"}]], "t": "diagram", "id": "dg-10_1-03-0"},


    { t: "dl", items: [
      ["Nesting multiplies", "A loop of n containing a loop of m costs n × m. If both loops walk the same data, that is n² — and the inner loop does not have to look like a loop. `x in some_list`, `some_list.index(x)`, `del some_list[0]`, `sorted(...)` and a slice are all loops in disguise."],
      ["Sequence adds, and the biggest term wins", "Three passes over the data one after another is 3n, which is `O(n)`. A sort followed by a single pass is `O(n log n) + O(n)`, which is `O(n log n)`. You keep the dominant term and drop the constant — but see section 07 for when dropping the constant misleads you."],
      ["The habit", "For every loop, ask *what does one iteration cost?* If the answer mentions the size of anything, you have found a multiplication."]
    ]},

    { t: "code", lang: "python", title: "duplicate_orders.py", hl: [5, 6, 7], code: `
def find_duplicate_hashes(orders: list[dict]) -> list[tuple[str, str]]:
    """Find pairs of orders whose payload hash collides."""
    pairs = []
    for a in orders:                                    # n iterations
        for b in orders:                                # x n iterations
            if a["id"] < b["id"] and a["hash"] == b["hash"]:
                pairs.append((a["id"], b["id"]))
    return pairs
`,
      caption: "Two nested loops over the same list: `O(n²)`. At 2,000 orders that is 4 million comparisons and finishes in under a second, so it ships. At 200,000 orders it is 40 **billion** comparisons."
    },

    { t: "p", text: "The fix is not a faster comparison. It is noticing that the question — *which orders share a hash?* — is a grouping question, and grouping is what a `dict` does in one pass." },

    { t: "code", lang: "python", title: "duplicate_orders.py — grouped", code: `
from collections import defaultdict
from itertools import combinations


def find_duplicate_hashes(orders: list[dict]) -> list[tuple[str, str]]:
    """Same result, one pass to group plus one pass over the collisions."""
    by_hash: dict[str, list[str]] = defaultdict(list)
    for order in orders:                                # n iterations, O(1) each
        by_hash[order["hash"]].append(order["id"])

    return [
        pair
        for ids in by_hash.values()                     # only the collisions
        if len(ids) > 1
        for pair in combinations(sorted(ids), 2)
    ]
`,
      caption: "`O(n)` to group, then work proportional to the number of *actual* collisions rather than to every possible pair. On real data — where collisions are rare — the second phase is nearly free."
    },

    { t: "callout", kind: "trap", title: "The complexity of the operation, not of the syntax", body: [
      { t: "p", text: "Python hides loops behind short expressions. These five are the ones that catch people, and every one of them reads as a single cheap step:" },
      { t: "table",
        head: ["Looks like one step", "Actually costs", "Because"],
        rows: [
          ["`x in my_list`", "`O(n)`", "a linear scan; `x in my_set` and `x in my_dict` are `O(1)`"],
          ["`value in my_dict.values()`", "`O(n)`", "a values view has no index — only `key in my_dict` is hashed"],
          ["`my_list.insert(0, x)` / `.pop(0)`", "`O(n)`", "every remaining element shifts one slot; `deque` is `O(1)`"],
          ["`data[1:]` inside recursion", "`O(n)` per call", "a slice copies; recursing on tails is `O(n²)` total (Lesson 3.8)"],
          ["`s += chunk` in a loop", "`O(n²)` total", "strings are immutable, so each `+=` copies everything so far"]
        ]
      },
      { t: "p", text: "None of these is a Python flaw. Each is the honest cost of the data structure you chose, surfacing at the moment you put it inside something that repeats (Lesson 2.8)." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Prove it with a stopwatch, not an argument", id: "doubling-test",
      sub: "The single most useful measurement in this module." },

    { t: "p", text: "You do not have to derive complexity from source. You can measure it. Run the code at n, then at 2n, and look at the ratio of the times. The ratio *is* the exponent, and it takes thirty seconds to obtain." },

    { t: "table",
      head: ["Time ratio when you double n", "Growth class", "What to do next"],
      rows: [
        ["about 1.0", "`O(1)` or dominated by fixed overhead", "stop — the input size is not your problem"],
        ["about 1.1", "`O(log n)`", "already excellent; look elsewhere"],
        ["about 2.0", "`O(n)`", "linear. Reduce the constant factor, or do less work per item"],
        ["about 2.2", "`O(n log n)`", "usually a sort. Normal and hard to beat"],
        ["about 4.0", "**`O(n²)`**", "find the scan inside the loop. This is the fix worth making"],
        ["about 8.0", "`O(n³)`", "three nested passes. Look for a triple loop or a nested join"]
      ],
      caption: "Ratios below 2.0 on small inputs are usually fixed startup cost swamping the measurement. Use sizes large enough that the run takes at least a tenth of a second."
    },

    { t: "code", lang: "python", title: "growth.py", code: `
"""Establish the growth class of a function empirically."""

import time
from collections.abc import Callable


def growth(build: Callable[[int], object],
           run: Callable[[object], object],
           sizes: tuple[int, ...]) -> None:
    """Time run() at each size and report the ratio against the previous size.

    build() is timed separately and excluded, so generating the input does
    not contaminate the measurement of the thing under test.
    """
    prev_n: int | None = None
    prev_t: float | None = None

    for n in sizes:
        data = build(n)
        start = time.perf_counter()
        run(data)
        elapsed = time.perf_counter() - start

        if prev_t is None:
            print(f"n={n:>8,}  {elapsed:8.4f}s   (baseline)")
        else:
            print(f"n={n:>8,}  {elapsed:8.4f}s   "
                  f"x{elapsed / prev_t:5.2f} time for x{n / prev_n:.0f} data")
        prev_n, prev_t = n, elapsed


def dedupe_with_list(rows: list[int]) -> list[int]:
    seen: list[int] = []
    for r in rows:
        if r not in seen:
            seen.append(r)
    return seen


growth(lambda n: list(range(n)), dedupe_with_list, (2_000, 4_000, 8_000, 16_000))
`,
      out: `n=   2,000    0.0231s   (baseline)
n=   4,000    0.0912s   x 3.95 time for x2 data
n=   8,000    0.3648s   x 4.00 time for x2 data
n=  16,000    1.4703s   x 4.03 time for x2 data`,
      caption: "A ratio pinned at 4.0 across three doublings is not an opinion about the code. It is a measurement, and it tells you the fix must change the exponent — not the constant."
    },

    { t: "callout", kind: "insight", title: "Why this beats reading the code", body: [
      { t: "ul", items: [
        "**It works on code you did not write.** You do not need to understand an unfamiliar 400-line function to learn that it is quadratic.",
        "**It catches complexity you cannot see.** The expensive scan may be three call levels down, inside a library, or inside an ORM that issues one query per row.",
        "**It settles the argument about whether the fix worked.** After the change, the ratio should drop to 2.0. If it is still 4.0, you fixed a different problem — possibly a real one, but not this one.",
        "**It exposes the cases where growth is not the issue at all.** A ratio of 1.0 means the runtime is fixed overhead: a connection setup, an import, a model load. No algorithmic work will help."
      ]},
      { t: "p", text: "Keep `growth()` in your own tooling. It is twenty lines and it will save you from more wrong optimisations than any profiler." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "The accidental quadratic, ranked", id: "accidental-quadratic" },

    { t: "p", text: "Almost every quadratic in production Python is one of five shapes. Learn to see the shape rather than the specific code." },

    { t: "ol", items: [
      "**A membership test inside a loop.** `if row.id in already_seen:` where `already_seen` is a list. Convert once to a `set`.",
      "**Accumulating with `+` instead of appending.** `results = results + [row]` or `s = s + chunk` builds a whole new object every iteration. Use `.append` and `str.join`.",
      "**A nested loop that is really a join.** `for order in orders: for customer in customers: if ...` — build a `dict` index of one side, then walk the other side once.",
      "**Removing from the front.** `while queue: item = queue.pop(0)` shifts every remaining element each time. Use `collections.deque`.",
      "**Re-deriving something inside the loop.** `sorted(...)`, `set(...)`, `re.compile(...)` or a database query placed inside the loop, when the value never changes. Hoist it out."
    ]},

    { t: "ladder",
      title: "The nested-loop join, fixed properly",
      rungs: [
        { level: "bad", label: "Nested scan over both collections", why: "O(orders × customers)",
          code: `def enrich(orders: list[dict], customers: list[dict]) -> list[dict]:
    out = []
    for order in orders:
        for customer in customers:
            if customer["id"] == order["customer_id"]:
                out.append(order | {"customer_name": customer["name"]})
                break
    return out`,
          note: "With 50,000 orders and 20,000 customers this is up to a billion comparisons. The `break` helps on average and changes nothing about the growth rate. Worse: an order whose customer is missing scans the **entire** customer list before giving up, and silently drops the row." },

        { level: "ok", label: "Index one side first", why: "O(orders + customers)",
          code: `def enrich(orders: list[dict], customers: list[dict]) -> list[dict]:
    by_id = {c["id"]: c for c in customers}          # one pass, O(m)
    out = []
    for order in orders:                             # one pass, O(n)
        customer = by_id.get(order["customer_id"])
        if customer is not None:
            out.append(order | {"customer_name": customer["name"]})
    return out`,
          note: "The nested loop is gone: the inner scan became a hashed lookup. Growth drops from n × m to n + m. This is the whole fix, and it costs one dict comprehension and O(m) extra memory — a deliberate trade of space for an order of complexity." },

        { level: "best", label: "Index, and make the missing case explicit", why: "same complexity, no silent data loss",
          code: `def enrich(orders: list[dict],
           customers: list[dict]) -> tuple[list[dict], list[str]]:
    """Attach customer names. Returns enriched rows and the orphaned ids.

    Orphans are returned rather than dropped: a reconciliation job that
    quietly loses rows is a data incident, not a performance win.
    """
    names = {c["id"]: c["name"] for c in customers}

    enriched: list[dict] = []
    orphans: list[str] = []
    for order in orders:
        name = names.get(order["customer_id"])
        if name is None:
            orphans.append(order["id"])
            continue
        enriched.append(order | {"customer_name": name})

    return enriched, orphans`,
          note: "The index holds only the field actually needed, which matters when `customers` carries fifty columns and there are millions of them. And the orphan list turns an invisible correctness bug into a number someone can act on. **Faster was the easy part; not losing rows is the part that survives review.**" }
      ]
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Amortised, and the promise it does not make", id: "amortised" },

    { t: "p", text: "`list.append` is documented as `O(1)` amortised. That word is load-bearing. A list owns a block of slots; when it fills, CPython allocates a larger block and copies every element across. That individual append is `O(n)`. Averaged over the whole sequence of appends, the copying works out to a constant per item — hence *amortised*." },

    { t: "code", lang: "python", title: "watch the reallocations", code: `
import sys

data: list[int] = []
last = sys.getsizeof(data)
print(f"len=0      bytes={last}")

for i in range(1_000):
    data.append(i)
    size = sys.getsizeof(data)
    if size != last:
        print(f"len={len(data):<6} bytes={size}   (+{size - last})")
        last = size
`,
      out: `len=0      bytes=56
len=1      bytes=88    (+32)
len=5      bytes=120   (+32)
len=9      bytes=184   (+64)
len=17     bytes=248   (+64)
len=25     bytes=312   (+64)
len=33     bytes=376   (+64)
len=41     bytes=472   (+96)
...
len=761    bytes=6360  (+800)`,
      caption: "The capacity grows by roughly an eighth each time, so the number of copies is proportional to n overall. Growth is geometric, which is exactly what makes the average constant."
    },

    { t: "callout", kind: "tradeoff", title: "Where amortised stops being good enough", body: [
      { t: "ul", items: [
        "**Latency, not throughput.** If you are serving a request with a p99 budget, an occasional `O(n)` reallocation inside the request is a tail-latency spike, not an average. Amortised analysis explicitly averages that spike away.",
        "**Memory headroom.** Growing a list by reallocation means holding the old and new blocks briefly. For a list of ten million objects that spike can be what triggers the OOM kill (Lesson 10.3).",
        "**`dict` and `set` share the mechanism**, and their resize also rehashes every key — a heavier operation than a memcpy.",
        "**The promise is per operation, not per program.** `append` being amortised `O(1)` says nothing about whether your loop is quadratic for some other reason."
      ]},
      { t: "p", text: "When you genuinely know the final size, `list` cannot be preallocated meaningfully — but `array.array`, a NumPy array, or writing straight to a file or socket can. Reach for those only after a measurement says the reallocation matters, which is rare." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "07", text: "When complexity is the wrong lens", id: "when-wrong",
      sub: "Four situations where the growth class is correct and irrelevant." },

    { t: "p", text: "This is the part of the topic that separates people who quote big-O from people who use it. Complexity is one input to a performance decision, and frequently not the deciding one." },

    { t: "table",
      head: ["Situation", "Why growth misleads", "What decides instead"],
      rows: [
        ["**n is small and bounded**", "A quadratic loop over the 12 columns of a report runs 144 times. Forever. It will never matter.", "Readability. Do not index a list of ten items."],
        ["**The constant factor is enormous**", "An `O(n)` loop making one HTTP call per item is 100× slower than an `O(n²)` loop doing arithmetic, at every realistic n.", "Where the wall-clock goes — profile it (Lesson 10.2)."],
        ["**Memory locality dominates**", "Two `O(n)` passes over a contiguous array can beat one `O(n)` pass over a linked structure, because cache misses cost hundreds of cycles.", "Measurement on real data. This is why NumPy wins (Lesson 15.1)."],
        ["**The work is I/O**", "Complexity counts operations. Waiting on a socket is not an operation — it is 200 ms of nothing.", "Round-trip count and concurrency (Lessons 11.5, 13.6)."]
      ],
      caption: "Note the pattern: three of the four are answered by measuring, not by reasoning. Complexity is how you avoid *writing* the disaster; profiling is how you find out what is actually costing you today."
    },

    { t: "callout", kind: "good", title: "The order that works", body: [
      { t: "ol", items: [
        "**At design time**, reason about growth. Choosing a `dict` over a list costs nothing and removes a whole class of future incident (Lesson 2.8).",
        "**When something is slow**, measure before touching anything. Your intuition about which line is hot is unreliable, and the doubling test costs thirty seconds.",
        "**If the ratio is ~4.0**, you have a growth problem: change the algorithm or the data structure. Nothing else will help.",
        "**If the ratio is ~2.0 or ~1.0**, you have a constant-factor or fixed-cost problem: profile it, and expect to find I/O, serialisation or repeated work rather than the loop you suspected."
      ]},
      { t: "p", text: "The reason to learn complexity first, before profiling, is that a profiler will happily point you at the hottest function in a quadratic algorithm and you will optimise it beautifully for a 4% gain." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "08", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Measure the exponent, then fix the exponent",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Below is a report builder that works correctly and has become the slowest step of a nightly pipeline. It contains three separate growth problems and one thing that looks slow but is not." },
        { t: "code", lang: "python", title: "report.py — the code under test", code: `
def build_report(events: list[dict], users: list[dict]) -> str:
    lines = ""
    seen_users = []

    for event in sorted(events, key=lambda e: e["at"]):
        if event["user_id"] not in seen_users:
            seen_users.append(event["user_id"])

        name = "unknown"
        for user in users:
            if user["id"] == event["user_id"]:
                name = user["name"]
                break

        lines = lines + f"{event['at']}  {name}  {event['kind']}\\n"

    return f"{len(seen_users)} users\\n" + lines
`},
        { t: "p", text: "Do not start by rewriting it. Start by establishing what its growth class actually is, so you can prove afterwards that you changed it." }
      ],
      requirements: [
        "Write a generator that builds `events` and `users` for a given n, so you can run the function at several sizes.",
        "Use a doubling harness to report the time ratio at n = 2,000 / 4,000 / 8,000. State the growth class from the ratio, not from reading the code.",
        "Identify the **three** operations responsible for super-linear growth, and name the growth class each one contributes.",
        "Identify the one operation that looks expensive but contributes no growth, and say why leaving it alone is correct.",
        "Rewrite the function. Assert the new version returns a string identical to the old one on a fixed input before you trust any timing.",
        "Re-run the doubling harness on the new version and show that the ratio has dropped to roughly 2.0."
      ],
      hint: "Two of the three problems are in Lesson 2.8's list of signals that a list is the wrong container. The third accumulates a result. The red herring is the thing wrapped around the loop header — ask yourself how many times it runs.",
      solution: {
        lang: "python",
        title: "report_fixed.py",
        code: `"""Establish the growth class, fix the exponent, prove the fix."""

import time
from collections.abc import Callable


# ---- the harness ------------------------------------------------------

def build_input(n: int) -> tuple[list[dict], list[dict]]:
    users = [{"id": i, "name": f"user-{i}", "tier": "std"} for i in range(n // 4)]
    events = [
        {"at": f"2026-01-01T00:{i % 60:02d}:00",
         "user_id": i % (n // 4),
         "kind": "click"}
        for i in range(n)
    ]
    return events, users


def growth(fn: Callable[[list[dict], list[dict]], str],
           sizes: tuple[int, ...]) -> None:
    prev_t = None
    for n in sizes:
        events, users = build_input(n)
        start = time.perf_counter()
        fn(events, users)
        elapsed = time.perf_counter() - start
        ratio = "" if prev_t is None else f"   x{elapsed / prev_t:5.2f}"
        print(f"n={n:>7,}  {elapsed:8.4f}s{ratio}")
        prev_t = elapsed


# ---- the diagnosis ----------------------------------------------------
#
# Measured ratios for build_report: 3.9, 4.0  ->  O(n^2).
#
# Three contributors:
#   1. "event['user_id'] not in seen_users"  -- linear scan of a list that
#      grows with the data.                             O(n^2)
#   2. "for user in users: if user['id'] == ..."  -- a join written as a
#      nested scan. users grows with n here, so         O(n^2)
#   3. "lines = lines + f'...'"  -- str is immutable, so every iteration
#      allocates a new string and copies everything.    O(n^2)
#
# The red herring: sorted(events, ...) inside the for header. It looks
# expensive and it IS the most expensive single call -- but it runs ONCE,
# not once per iteration, because the for statement evaluates its iterable
# a single time. It contributes O(n log n), which is strictly better than
# the quadratic terms and is not worth touching.


def build_report_fast(events: list[dict], users: list[dict]) -> str:
    names = {u["id"]: u["name"] for u in users}      # O(m) index, once
    seen: set[int] = set()                           # O(1) membership
    parts: list[str] = []                            # O(1) amortised append

    for event in sorted(events, key=lambda e: e["at"]):
        seen.add(event["user_id"])
        name = names.get(event["user_id"], "unknown")
        parts.append(f"{event['at']}  {name}  {event['kind']}")

    return f"{len(seen)} users\\n" + "\\n".join(parts) + "\\n"


if __name__ == "__main__":
    # Equivalence first. A faster function that returns different bytes is
    # not an optimisation, it is a regression with a good benchmark.
    ev, us = build_input(400)
    assert build_report(ev, us) == build_report_fast(ev, us)

    print("--- original ---")
    growth(build_report, (2_000, 4_000, 8_000))
    print("--- rewritten ---")
    growth(build_report_fast, (2_000, 4_000, 8_000, 64_000))`,
        out: `--- original ---
n=  2,000    0.1043s
n=  4,000    0.4071s   x 3.90
n=  8,000    1.6284s   x 4.00
--- rewritten ---
n=  2,000    0.0034s
n=  4,000    0.0071s   x 2.09
n=  8,000    0.0147s   x 2.07
n= 64,000    0.1329s   x 2.13`,
        notes: [
          { t: "p", text: "**The ratio is the deliverable, not the speedup.** A 110× improvement at n = 8,000 is a nice number, but it is the drop from 4.0 to 2.0 that tells you the class of bug is gone. The old version would have been 110× worse again at the next data doubling; the new one will be 2×." },
          { t: "p", text: "**The three fixes are all one-liners, and all three are container choices**, not clever code: a `set` for membership, a `dict` for the join, a `list` plus `join` for accumulation. That is the general shape — quadratics in Python are usually a data-structure decision, which is why Lesson 2.8 belongs before this one." },
          { t: "callout", kind: "trap", title: "The red herring is the most important part of the exercise", body: [
            { t: "p", text: "`sorted(events, ...)` is genuinely the single most expensive *call* in the function, and a function-level profiler will put it near the top of the list. It is still the wrong thing to fix: it runs once, contributes `O(n log n)`, and removing it would change the output." },
            { t: "p", text: "This is the failure mode the whole module is built around. A profiler ranks by time spent, and at any given input size the biggest line is not necessarily the one whose cost is growing. **Rank by growth first, then by measured time.**" }
          ]},
          { t: "p", text: "Note the `assert` before the timings. It is not ceremony: the original emits a trailing newline per line and the rewrite emits separators, and getting that wrong is the most likely bug in this refactor. Equality on a fixed input catches it in milliseconds." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly deduplicate-and-geocode pipeline took 12 minutes when it was built. Eighteen months later it takes 5 hours and overruns into the working day. Nothing in the code has changed; the input has grown from 40,000 rows to 400,000." },
      { t: "p", text: "An engineer profiles it with `cProfile`. The report is unambiguous: 61% of cumulative time is in `parse_row`, called 400,000 times. They spend four days optimising `parse_row` — precompiling its regexes, replacing `datetime.strptime` with manual slicing, hoisting attribute lookups. The pipeline drops from 5 hours to 4 hours 47 minutes." },
      { t: "p", text: "**The mechanism they missed.** A doubling test would have taken thirty seconds and shown a ratio of 3.9 — quadratic. The cause was a single line in the accumulation loop: `rows = rows + [parsed]`. Because that is an operator rather than a function call, it **never appears as a named entry in a function-level profile**; its cost is charged to the enclosing function's own time, spread thinly and looking like ordinary loop overhead. Meanwhile `parse_row` was genuinely 61% of the time — of a total that was 200× larger than it needed to be." },
      { t: "p", text: "**The fix is `rows.append(parsed)`.** The pipeline returned to 14 minutes, and the four days of `parse_row` micro-optimisation contributed about 4% of that. The lesson is the ordering: **establish the growth class before you rank the hot spots**, because a profiler measures where time goes today and cannot tell you which term is the one exploding." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Big-O is a growth rate, not a speed.** It answers one question: ten times the data means ten times the work (`O(n)`) or one hundred times (`O(n²)`).",
    "A growth-rate problem cannot be fixed by a constant-factor solution. More workers, faster hardware and a language rewrite all multiply; only the algorithm changes the exponent.",
    "**Nesting multiplies, sequence adds, the dominant term wins.** The inner loop does not have to look like a loop — `x in list`, `.pop(0)`, a slice and `sorted()` are all loops in disguise.",
    "**Measure the exponent by doubling n.** A time ratio near 2.0 is linear, near 4.0 is quadratic. It takes thirty seconds and works on code you have never read.",
    "Almost every production quadratic is one of five shapes: membership test in a loop, accumulating with `+`, a nested loop that is really a join, removing from the front, or re-deriving a constant inside the loop.",
    "**A nested-loop join becomes linear by indexing one side into a `dict`** — spending `O(m)` memory to remove an order of complexity.",
    "`list.append` is `O(1)` *amortised*: capacity grows geometrically, so the copying averages to a constant. That average says nothing about tail latency or peak memory.",
    "Complexity is the wrong lens when n is small and bounded, when the constant factor is I/O, or when memory locality dominates. Three of those four are settled by measuring, not reasoning.",
    "**Reason about growth at design time; profile when something is slow.** A profiler will rank the hottest function inside a quadratic algorithm and let you optimise it perfectly for a 4% gain.",
    "Operators do not appear as entries in a function-level profile. A quadratic built from `+` or `+=` is invisible to `cProfile` and visible immediately to a doubling test."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You time a function at n = 5,000 (0.4 s), n = 10,000 (1.6 s) and n = 20,000 (6.5 s). What do you do next?",
        options: [
          "Profile the function and optimise whichever line has the highest self time",
          "Find the operation whose cost grows with the data inside a loop — the ratio of about 4.0 per doubling means the growth class must change",
          "Run it across four processes, since the work is clearly CPU-bound",
          "Add a cache, because repeated work is the usual cause of super-linear timing"
        ],
        answer: 1,
        why: "Four times the time for twice the data is the signature of `O(n²)`, so the fix has to change the exponent: a `set` instead of a list membership test, a `dict` index instead of a nested scan, `append` instead of `+`. Profiling first will faithfully report the hottest line *inside* the quadratic algorithm and lead you to optimise a constant factor for a few percent. Parallelism buys a fixed divisor against growth that squares, so the next data increase erases it. A cache only helps if the same work repeats with the same inputs, which a quadratic scan over distinct rows does not."
      },
      {
        stem: "Which of these is `O(1)`?",
        options: [
          "`value in my_dict.values()`",
          "`my_list.insert(0, item)`",
          "`key in my_dict`",
          "`sorted(rows)[0]`"
        ],
        answer: 2,
        why: "`key in my_dict` hashes the key and probes one slot, independent of size. A values view has no index, so scanning it for a value is `O(n)`. `insert(0, item)` shifts every existing element one slot, which is `O(n)`. And `sorted(rows)[0]` sorts the entire sequence to read one element — `O(n log n)` where `min(rows)` would be `O(n)`."
      },
      {
        stem: "A report function loops over 14 report columns with a nested loop over the same 14 columns. A reviewer asks you to make it linear. What is the right response?",
        options: [
          "Agree — quadratic code should never be merged, regardless of input size",
          "Rewrite it with a dict index, since the fix is cheap and removes a future risk",
          "Point out that n is bounded at 14, so this runs 196 times and will never matter; keep whichever version reads better",
          "Add a comment recording the complexity and merge the quadratic version"
        ],
        answer: 2,
        why: "Growth only matters when the input can grow. Fourteen columns is a fixed, small bound, so 196 iterations of cheap work is irrelevant at every scale the code will ever see, and the readable version wins. Options A and B treat a growth rate as a rule rather than as a property of the data — that is how you end up with a dict index over a list of ten items, which is slower in practice as well as harder to read. A comment alone (option D) documents a non-problem and does not answer the reviewer."
      },
      {
        stem: "Why is `list.append` described as `O(1)` *amortised* rather than simply `O(1)`?",
        options: [
          "Because appending to a list is only constant time when the list holds fewer than 1,000 elements",
          "Because a full list reallocates a larger block and copies every element, an `O(n)` operation whose cost averages to a constant because capacity grows geometrically",
          "Because CPython defers the append until the list is next read, so the cost is charged later",
          "Because the cost depends on the type of the elements being appended"
        ],
        answer: 1,
        why: "A list owns a block of slots; when it fills, CPython allocates a bigger block — roughly an eighth larger — and copies the contents. That single append is linear, but because capacity grows by a proportion rather than a fixed amount, the total copying over n appends is proportional to n, giving a constant average. This matters in two real ways the word 'amortised' hides: the occasional copy is a tail-latency spike, and it briefly holds two blocks, which is a peak-memory event. Nothing is deferred, and element type is irrelevant since a list stores pointers."
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
        q: "Explain big-O to someone who has never seen it, in two sentences.",
        strong: "It describes how the cost of an operation changes as the input grows, not how fast it is. `O(n)` means ten times the data costs ten times the work; `O(n²)` means ten times the data costs a hundred times the work.",
        answer: [
          { t: "p", text: "Interviewers ask this to find out whether you have a working definition or a memorised one. Leading with *growth rate, not speed* is what distinguishes them, because it immediately explains why an `O(n²)` function can be faster than an `O(n)` one at small n." },
          { t: "p", text: "The strongest thing to add is the consequence for engineering decisions: a growth-rate problem cannot be solved by a constant-factor fix. That is why adding workers to a quadratic job buys you one data doubling and then you are back where you started." },
          { t: "p", text: "If you want a concrete anchor, the four-scale picture works well: 100 records where linear and quadratic both finish instantly, and 100,000 records where one takes 100 ms and the other 100 seconds. Same code in both columns." }
        ],
        weak: "Reciting the formal definition with limits and constants. It is correct and it answers a different question than the one being asked, which is whether you can use this at work."
      },
      {
        level: "core",
        q: "A job that used to take minutes now takes hours. Nothing in the code changed. What is your first move?",
        strong: "Establish the growth class before touching anything: run it at n and 2n and look at the time ratio. Around 4.0 means quadratic and I go looking for a scan inside a loop. Around 2.0 or 1.0 means the growth is fine and the cost is a constant factor or fixed overhead, which is a profiling question instead.",
        answer: [
          { t: "p", text: "The framing that earns credit: the bug did not appear when the data grew, it was always there. At fixture scale a quadratic algorithm is indistinguishable from a linear one, which is why it passed review and every test." },
          { t: "p", text: "Naming the doubling test specifically is what makes this an answer rather than a sentiment. It is thirty seconds of work, it needs no knowledge of the code, and it partitions the problem in two: growth problem or constant-factor problem. Those two get completely different fixes." },
          { t: "p", text: "Close on why profiling is the *second* move, not the first. A profiler tells you where time goes right now; it cannot tell you which term is the one exploding. It will happily point at the hottest function inside a quadratic algorithm — and micro-optimising that is how a team spends four days for 4%." }
        ],
        weak: "Reaching first for more memory, more workers or a bigger instance. All three are constant-factor answers to a growth-rate question, and all three defer the same failure to slightly more data."
      },
      {
        level: "advanced",
        q: "When is complexity analysis the wrong tool for a performance problem?",
        strong: "When n is small and bounded, when the constant factor is I/O, and when memory locality dominates. Complexity counts operations, and waiting 200 ms on a socket is not an operation — so an `O(n)` loop making one HTTP call per item is far worse than an `O(n²)` loop doing arithmetic, at every realistic size.",
        answer: [
          { t: "p", text: "This question separates people who apply complexity as a rule from people who use it as one input. Interviewers ask it because most real production slowness is *not* a growth problem — it is round trips, serialisation, logging, or repeated work." },
          { t: "p", text: "The most persuasive example is the N+1 query: perfectly linear in the number of rows, and completely dominated by 340 sequential network round trips. No amount of algorithmic reasoning about the Python finds it; a profile or a query log finds it in seconds." },
          { t: "p", text: "Give the resolution rather than leaving it as a paradox: **reason about growth at design time, measure when something is slow.** Choosing a `dict` over a list when you write the code costs nothing and prevents a class of incident. Deciding what to optimise in a running system requires data, because intuition about hot paths is reliably wrong." }
        ]
      },
      {
        level: "advanced",
        q: "You profile a slow pipeline and one function accounts for 61% of the time. Is that where you should optimise?",
        strong: "Not necessarily. 61% caps the possible gain at about 2.5× even if I make that function free, so first I would check whether the total is the right total — if the pipeline is quadratic, the whole 100% is inflated and the growth fix is worth 200×, not 2.5×.",
        answer: [
          { t: "p", text: "The arithmetic is the answer here and it is worth being able to do out loud: making a component that is 61% of runtime **ten times** faster removes 55% of the time, so you gain about 2.2×. Making it infinitely fast gains 2.5×. That is your ceiling, and it is worth knowing before you commit a week." },
          { t: "p", text: "The deeper point is that a function-level profile has a blind spot: operators. A quadratic built from `rows = rows + [x]` or `s += chunk` never appears as a named entry — its cost is charged to the enclosing function's own time and looks like ordinary loop overhead. So the profile can be entirely accurate and still direct you to the wrong fix." },
          { t: "p", text: "The move that resolves it is cheap: run the doubling test alongside the profile. If the ratio is about 4.0, fix the growth first and re-profile afterwards — the ranking will have changed completely." }
        ],
        weak: "Treating the top line of a profile as an instruction. It is evidence about where time goes at one input size, not a statement about which cost is growing."
      }
    ]
  }
});
