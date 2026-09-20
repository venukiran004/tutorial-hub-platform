/* ============================================================================
   LESSON 2.1 — Lists
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "A Python list is a **dynamic array of pointers**. Knowing that one sentence explains everything else about it: why `append` is effectively free and `insert(0, x)` is not, why `in` on a large list is slow, why a list can hold mixed types, and why `[[]] * 3` produces three references to one list rather than three lists.",

  objectives: [
    "Describe what a list is in memory, and derive its performance characteristics from that",
    "Choose the right method for adding, removing and searching, and state the cost of each",
    "Sort with keys, and explain the difference between `sort()` and `sorted()`",
    "Avoid the mutation-during-iteration and shared-inner-list traps",
    "Recognise when a list is the wrong structure and what to reach for instead"
  ],

  prerequisites: ["1.4"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "What a list actually is", id: "what-it-is" },

    {"kind": "cells", "title": "A list is an array of references", "caption": "The list object holds a contiguous block of pointers to its elements plus a little spare capacity. Indexing is one pointer read — O(1); inserting at the front shifts every pointer — O(n).", "items": ["→'a'", "→'b'", "→'c'", "→'d'", "·", "·"], "highlight": [4, 5], "negative": true, "label": "len == 4, allocated 6: append is amortised O(1) because of the spare slots", "t": "diagram", "id": "dg-2_1-01-0"},




    { t: "p", text: "A list is a contiguous block of memory holding **pointers to objects**, plus a count of how many slots are used and how many exist. The objects themselves live elsewhere on the heap — which is why a list can hold an int, a string and another list at once. Every slot is the same size, because every slot is a pointer." },

    { t: "viz",
      title: "A list is an array of pointers, with room to grow",
      caption: "The list owns a contiguous array of pointer slots. Extra capacity is allocated ahead of need, so most appends write into an existing slot and cost nothing beyond the write. When capacity runs out, a larger block is allocated and every pointer is copied across.",
      svg: `<svg viewBox="0 0 900 290" role="img" aria-label="Diagram: a Python list as a contiguous pointer array with spare capacity, pointing at heap objects">
  <defs>
    <marker id="a6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">THE LIST OBJECT</text>
  <rect x="20" y="34" width="150" height="76" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="34" y="55" class="s-mono" style="font-size:10.5px">ob_size  = 3</text>
  <text x="34" y="73" class="s-mono" style="font-size:10.5px">allocated = 4</text>
  <text x="34" y="95" class="s-mono" style="font-size:10.5px;fill:var(--ink-3)">ob_item  --&gt;</text>

  <text x="210" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">POINTER ARRAY (contiguous)</text>
  <g>
    <rect x="210" y="34" width="66" height="40" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="243" y="59" text-anchor="middle" class="s-mono" style="font-size:10px">ptr 0</text>
    <rect x="280" y="34" width="66" height="40" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="313" y="59" text-anchor="middle" class="s-mono" style="font-size:10px">ptr 1</text>
    <rect x="350" y="34" width="66" height="40" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="383" y="59" text-anchor="middle" class="s-mono" style="font-size:10px">ptr 2</text>
    <rect x="420" y="34" width="66" height="40" rx="5" style="fill:none;stroke:var(--border-strong);stroke-dasharray:4 3" stroke-width="1"/>
    <text x="453" y="59" text-anchor="middle" class="s-sub">spare</text>
  </g>
  <text x="500" y="52" class="s-sub" style="fill:var(--good)">append() writes here:</text>
  <text x="500" y="66" class="s-sub" style="fill:var(--good)">no reallocation, no copy</text>

  <text x="210" y="128" class="s-sub" style="font-weight:700;letter-spacing:.08em">OBJECTS, ANYWHERE ON THE HEAP</text>
  <line x1="243" y1="74" x2="243" y2="146" style="stroke:var(--border-strong)" stroke-width="1.2" marker-end="url(#a6)"/>
  <line x1="313" y1="74" x2="360" y2="146" style="stroke:var(--border-strong)" stroke-width="1.2" marker-end="url(#a6)"/>
  <line x1="383" y1="74" x2="480" y2="146" style="stroke:var(--border-strong)" stroke-width="1.2" marker-end="url(#a6)"/>
  <rect x="200" y="150" width="86" height="32" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="243" y="171" text-anchor="middle" class="s-mono" style="font-size:10.5px">42</text>
  <rect x="318" y="150" width="86" height="32" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="361" y="171" text-anchor="middle" class="s-mono" style="font-size:10.5px">"abc"</text>
  <rect x="437" y="150" width="86" height="32" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="480" y="171" text-anchor="middle" class="s-mono" style="font-size:10.5px">[1, 2]</text>
  <text x="545" y="171" class="s-sub">mixed types are free — every slot is just a pointer</text>

  <rect x="20" y="212" width="860" height="60" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="233" class="s-sub" style="fill:var(--ink-2);font-weight:600">Everything else follows from this shape</text>
  <text x="36" y="252" class="s-sub">index by position: one pointer arithmetic step, O(1)  ·  append into spare capacity: O(1) amortised</text>
  <text x="36" y="266" class="s-sub" style="fill:var(--crit)">insert(0, x) or pop(0): every later pointer shifts one slot, O(n)  ·  x in list: scans until found, O(n)</text>
</svg>`
    },

    { t: "callout", kind: "insight", title: "Why append is \"amortised\" O(1)", body: [
      { t: "p", text: "When the spare capacity runs out, CPython allocates a bigger block — growing by roughly an eighth of the current size plus a constant, not by one slot — and copies every pointer across. That individual append is O(n)." },
      { t: "p", text: "Because the growth is *proportional*, those expensive appends get rarer as the list gets larger. Averaged over many appends the cost per operation is constant, which is what \"amortised O(1)\" means. You can watch the capacity jumps directly:" },
      { t: "code", lang: "python", title: "observing reallocation", numbered: false, code: `
import sys

items = []
last = -1
for i in range(20):
    size = sys.getsizeof(items)
    if size != last:
        print(f"len={len(items):>3}  bytes={size}")
        last = size
    items.append(i)`,
        out: `len=  0  bytes=56
len=  1  bytes=88
len=  5  bytes=120
len=  9  bytes=184
len= 17  bytes=248`},
      { t: "p", text: "**The practical consequence:** if you know the final size and it is large, building the list in one go — a comprehension or `list(iterable)` — lets CPython size the allocation once instead of growing repeatedly." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Operations and their cost", id: "operations" },

    {"kind": "matrix", "title": "Cost of the common list operations", "caption": "Green is O(1), amber O(n). The two that surprise people are 'in' and insert(0, x): both walk the whole list.", "rows": ["index / assign lst[i]", "append / pop()", "insert(0, x) / pop(0)", "x in lst", "len(lst)", "sort"], "cols": ["cost"], "cells": [[{"text": "O(1)", "tone": "good"}], [{"text": "O(1) amortised", "tone": "good"}], [{"text": "O(n)", "tone": "warn"}], [{"text": "O(n)", "tone": "warn"}], [{"text": "O(1)", "tone": "good"}], [{"text": "O(n log n)", "tone": "accent"}]], "t": "diagram", "id": "dg-2_1-02-1"},




    { t: "table",
      head: ["Operation", "Cost", "Notes"],
      rows: [
        ["`lst[i]`", "<span class='big-o fast'>O(1)</span>", "Direct offset into the pointer array"],
        ["`lst[i] = x`", "<span class='big-o fast'>O(1)</span>", "Overwrites one pointer"],
        ["`lst.append(x)`", "<span class='big-o fast'>O(1)*</span>", "Amortised; occasionally reallocates"],
        ["`lst.pop()`", "<span class='big-o fast'>O(1)</span>", "From the end only"],
        ["`len(lst)`", "<span class='big-o fast'>O(1)</span>", "Stored, not counted"],
        ["`lst.insert(0, x)`", "<span class='big-o slow'>O(n)</span>", "Shifts every element right"],
        ["`lst.pop(0)`", "<span class='big-o slow'>O(n)</span>", "Shifts every element left"],
        ["`del lst[i]`", "<span class='big-o slow'>O(n)</span>", "Same shifting cost"],
        ["`x in lst`", "<span class='big-o slow'>O(n)</span>", "Linear scan — a `set` is <span class='big-o fast'>O(1)</span>"],
        ["`lst.remove(x)`", "<span class='big-o slow'>O(n)</span>", "Finds, then shifts"],
        ["`lst.sort()`", "<span class='big-o mid'>O(n log n)</span>", "Timsort; near-linear on partly-sorted data"],
        ["`lst + other`", "<span class='big-o mid'>O(n+m)</span>", "Builds a new list — see the trap below"],
        ["`lst[a:b]`", "<span class='big-o mid'>O(k)</span>", "Copies k pointers into a new list"]
      ],
      caption: "Two rows drive most real performance problems: `pop(0)` in a loop, and `in` on a large list. Both have a one-line fix — `collections.deque` and `set` respectively."
    },

    { t: "code", lang: "python", title: "the methods worth knowing precisely", code: `
items = [3, 1, 2]

items.append(4)          # add one element at the end
items.extend([5, 6])     # add every element of an iterable
items.append([7, 8])     # adds the LIST as a single element -- often a bug
print(items)

items = [3, 1, 2]
print(items.pop())       # 2  -- removes and returns the last
print(items.index(3))    # 0  -- position, raises ValueError if absent
print(items.count(1))    # 1
items.reverse()          # in place, returns None
print(items)
`,
      out: `[3, 1, 2, 4, 5, 6, [7, 8]]
2
0
1
[1, 3]`
    },

    { t: "callout", kind: "trap", title: "Methods that mutate return None", body: [
      { t: "code", lang: "python", title: "the mistake", numbered: false, code: `
items = [3, 1, 2]

items = items.sort()      # sort() returns None
print(items)              # None -- the list is gone`,
        out: `None`},
      { t: "p", text: "`sort`, `reverse`, `append`, `extend`, `insert`, `remove` and `clear` all mutate in place and return `None`. Assigning their result discards your data. The convention is deliberate: it signals *this changed the object* rather than *this produced a new one*." },
      { t: "p", text: "When you want a new list, use the non-mutating counterparts: `sorted(items)` and `reversed(items)`." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Sorting", id: "sorting" },

    { t: "code", lang: "python", title: "sort() versus sorted()", code: `
orders = [
    {"id": 3, "total": 50.0, "customer": "beth"},
    {"id": 1, "total": 120.0, "customer": "alice"},
    {"id": 2, "total": 50.0, "customer": "carol"},
]

# sorted() returns a new list and accepts any iterable
by_total = sorted(orders, key=lambda o: o["total"], reverse=True)

# .sort() mutates in place, lists only, and is slightly cheaper
orders.sort(key=lambda o: o["id"])

# Sort by several fields: return a tuple. Compared left to right.
by_total_then_name = sorted(orders, key=lambda o: (-o["total"], o["customer"]))
for o in by_total_then_name:
    print(o["total"], o["customer"])
`,
      out: `120.0 alice
50.0 beth
50.0 carol`
    },

    { t: "dl", items: [
      ["`key=`", "A function called **once per element** to produce the value to compare. Much faster than the old `cmp` approach, and clearer."],
      ["Tuple keys", "`key=lambda o: (a, b)` sorts by `a`, then breaks ties with `b`. Negate a numeric field to reverse just that one."],
      ["Stability", "Timsort is **stable**: elements comparing equal keep their original relative order. This is a guarantee, and it lets you sort by several keys in separate passes, least significant first."],
      ["`operator.itemgetter`", "`key=itemgetter(\"total\")` is faster than an equivalent lambda and reads well for simple field access."]
    ]},

    { t: "callout", kind: "insight", title: "Stability is a tool, not a detail", body: [
      { t: "code", lang: "python", title: "two passes, least significant first", numbered: false, code: `
from operator import itemgetter

# Sort by department, and within each department by salary descending.
staff.sort(key=itemgetter("salary"), reverse=True)   # secondary first
staff.sort(key=itemgetter("department"))             # primary second`},
      { t: "p", text: "Because the second sort is stable, it preserves the salary ordering within each department. This is genuinely useful when the sort keys come from user input — a table with clickable column headers — and you cannot build one composite key ahead of time." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Two traps that reach production", id: "traps" },

    { t: "callout", kind: "trap", title: "Mutating a list while iterating it", body: [
      { t: "code", lang: "python", title: "elements get skipped, silently", numbered: false, code: `
numbers = [1, 2, 3, 4, 5, 6]

for n in numbers:
    if n % 2 == 0:
        numbers.remove(n)      # mutating during iteration

print(numbers)`,
        out: `[1, 3, 5]`},
      { t: "p", text: "That output looks correct, which is what makes this dangerous — try `[1, 2, 2, 3]` and you get `[1, 2, 3]`, with one `2` surviving. The iterator holds an index; removing an element shifts everything left, so the next element slides into the position already visited and is skipped." },
      { t: "p", text: "**Build a new list instead.** It is clearer, faster, and correct:" },
      { t: "code", lang: "python", title: "the fix", numbered: false, code: `
numbers = [n for n in numbers if n % 2 != 0]

# If the original object must be kept (other names refer to it),
# assign back into the same list with a slice:
numbers[:] = [n for n in numbers if n % 2 != 0]`,
        caption: "`numbers[:] = ...` replaces the contents in place, so every name bound to that list sees the change — the aliasing distinction from Lesson 1.4."}
    ]},

    { t: "callout", kind: "trap", title: "`[[]] * 3` gives you one list, three times", body: [
      { t: "code", lang: "python", title: "the surprise", numbered: false, code: `
grid = [[0] * 3] * 3       # looks like a 3x3 grid
grid[0][0] = 9
print(grid)`,
        out: `[[9, 0, 0], [9, 0, 0], [9, 0, 0]]`},
      { t: "p", text: "`*` on a list copies **references**, not objects — Lesson 1.4 again. The outer multiplication produced three pointers to the same inner list, so writing through any of them is visible through all three." },
      { t: "code", lang: "python", title: "the fix", numbered: false, code: `
grid = [[0] * 3 for _ in range(3)]   # a new inner list per iteration
grid[0][0] = 9
print(grid)`,
        out: `[[9, 0, 0], [0, 0, 0], [0, 0, 0]]`},
      { t: "p", text: "Note that the *inner* `[0] * 3` is fine: integers are immutable, so sharing them is harmless. The rule is that `*` is safe for immutable elements and wrong for mutable ones." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "When a list is the wrong choice", id: "wrong-choice" },

    { t: "ladder",
      title: "Deduplicating and checking membership over 100,000 records",
      rungs: [
        { level: "bad", label: "Membership test against a list", why: "O(n) per check, O(n squared) overall",
          code: `seen = []
unique = []
for record in records:
    if record["id"] not in seen:      # linear scan, every time
        seen.append(record["id"])
        unique.append(record)`,
          note: "Each `not in` scans the whole `seen` list. Over n records that is roughly n squared / 2 comparisons — about five billion for 100,000 records. This code is correct and effectively never finishes." },

        { level: "ok", label: "Membership test against a set", why: "O(1) per check",
          code: `seen = set()
unique = []
for record in records:
    if record["id"] not in seen:      # hash lookup, constant time
        seen.add(record["id"])
        unique.append(record)`,
          note: "One character of difference in the declaration, and the algorithm goes from quadratic to linear. This is the single highest-value performance fix in everyday Python, and it is why Lesson 2.2 covers sets before you need them." },

        { level: "best", label: "A dict keyed by id", why: "dedup and lookup in one structure",
          code: `# dicts preserve insertion order (guaranteed since 3.7), so this
# deduplicates AND keeps the first occurrence of each id.
by_id = {}
for record in records:
    by_id.setdefault(record["id"], record)

unique = list(by_id.values())`,
          note: "The auxiliary `seen` set disappears — the dict is doing both jobs. You also end the loop with an index you almost certainly need next, so a later lookup by id is O(1) instead of another scan. `setdefault` keeps the first occurrence; a plain assignment would keep the last." }
      ]
    },

    { t: "table",
      head: ["If you need", "Use", "Rather than a list because"],
      rows: [
        ["Fast membership tests", "`set`", "O(1) hash lookup instead of an O(n) scan"],
        ["Adding and removing at **both** ends", "`collections.deque`", "`popleft()` is O(1); `pop(0)` on a list is O(n)"],
        ["Lookup by key", "`dict`", "O(1) instead of scanning for a matching field"],
        ["A fixed record with named fields", "`NamedTuple` or `dataclass`", "`order.total` beats `order[3]` for every future reader"],
        ["Repeated smallest-item extraction", "`heapq` on a list", "O(log n) per pop instead of re-sorting"],
        ["Large numeric arrays", "`numpy.ndarray`", "Contiguous values rather than pointers; vectorised operations"]
      ],
      caption: "A list is the right default for an ordered, growable sequence you mostly append to and iterate. Every row here is a case where a different structure removes a loop or an order of magnitude."
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a slow report",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "The function below works correctly on the 200-row test fixture and takes over a minute on the 80,000-row production export. Nothing about it is obviously wrong — it is four ordinary-looking loops." },
        { t: "p", text: "Find every reason it is slow, fix them, and prove the output is unchanged." }
      ],
      requirements: [
        "Identify each operation whose cost grows with the size of the data, and name its complexity.",
        "Rewrite the function so it runs in roughly linear time.",
        "The output must be **identical** — assert equality between old and new on the fixture rather than eyeballing it.",
        "Measure both with `timeit` at a size where the difference is unambiguous.",
        "Do not change the function's signature or its return shape.",
        "Write one sentence per fix explaining which structural property made it faster."
      ],
      hint: "There are four distinct problems. Two are membership tests, one is a list operation at the wrong end, and one is work repeated inside a loop that could happen once outside it.",
      solution: {
        lang: "python",
        title: "report.py",
        code: `"""Before and after, with the reasoning for each change."""

from collections import deque


# ---- the original -----------------------------------------------------

def build_report_slow(orders, blocked_customers, priority_ids):
    result = []
    processed = []

    for order in orders:
        # PROBLEM 1: O(n) scan of a list, per order  ->  O(n*m) overall
        if order["customer"] in blocked_customers:
            continue

        # PROBLEM 2: another O(n) scan, per order
        if order["id"] in processed:
            continue
        processed.append(order["id"])

        # PROBLEM 3: recomputed every iteration though it never changes
        total_orders = len([o for o in orders if o["status"] == "paid"])

        # PROBLEM 4: insert(0) shifts every existing element  ->  O(n^2)
        if order["id"] in priority_ids:
            result.insert(0, {**order, "of_total": total_orders})
        else:
            result.append({**order, "of_total": total_orders})

    return result


# ---- the rewrite ------------------------------------------------------

def build_report(orders, blocked_customers, priority_ids):
    # FIX 1 + 2: hash-based membership. Converting once costs O(n); every
    # subsequent lookup is O(1) instead of an O(n) scan.
    blocked = set(blocked_customers)
    priority = set(priority_ids)
    seen: set = set()

    # FIX 3: loop-invariant work moved out. It never depended on the
    # current order, so computing it n times was n-1 wasted passes.
    total_orders = sum(1 for o in orders if o["status"] == "paid")

    # FIX 4: appendleft on a deque is O(1); insert(0) on a list is O(n)
    # because every later pointer must shift one slot.
    result: deque = deque()

    for order in orders:
        if order["customer"] in blocked:
            continue
        if order["id"] in seen:
            continue
        seen.add(order["id"])

        entry = {**order, "of_total": total_orders}
        if order["id"] in priority:
            result.appendleft(entry)
        else:
            result.append(entry)

    # The signature promised a list, so convert once at the end -- O(n).
    return list(result)


# ---- proof ------------------------------------------------------------

if __name__ == "__main__":
    import random
    import timeit

    random.seed(0)
    orders = [
        {
            "id": i % 4000,
            "customer": f"cust{i % 500}",
            "status": random.choice(["paid", "pending"]),
        }
        for i in range(8_000)
    ]
    blocked = [f"cust{i}" for i in range(0, 500, 7)]
    priority = list(range(0, 4000, 50))

    # Identical output is the precondition for any performance claim.
    assert build_report_slow(orders, blocked, priority) == build_report(
        orders, blocked, priority
    )

    slow = timeit.timeit(
        lambda: build_report_slow(orders, blocked, priority), number=1
    )
    fast = timeit.timeit(
        lambda: build_report(orders, blocked, priority), number=1
    )
    print(f"slow: {slow:.3f}s")
    print(f"fast: {fast:.4f}s")
    print(f"speedup: {slow / fast:.0f}x")`,
        notes: [
          { t: "p", text: "**The four fixes, and the structural property behind each:**" },
          { t: "ol", items: [
            "**`blocked_customers` list → set.** A list membership test scans until it finds a match; a set hashes the value and jumps straight to the bucket. O(n) becomes O(1), and the whole loop drops from O(n·m) to O(n).",
            "**`processed` list → set.** Identical reasoning, and this one is worse in the original because `processed` grows as the loop runs, so late iterations scan the longest list.",
            "**`total_orders` hoisted out.** It never referenced `order`, so it produced the same answer n times. This is the `LOAD_GLOBAL` lesson from 1.1 applied to a whole computation rather than a name lookup.",
            "**`result.insert(0, ...)` → `deque.appendleft`.** A list stores pointers contiguously, so inserting at the front shifts every one of them. A deque is a linked structure of blocks with O(1) at both ends."
          ]},
          { t: "callout", kind: "insight", title: "Why this shape is so common", body: [
            { t: "p", text: "Every one of these four is correct code. None would be flagged in review, and all four pass the test suite. The bug is invisible at fixture scale and dominant at production scale — which is exactly why complexity is worth reasoning about before profiling rather than after." },
            { t: "p", text: "The order to apply the reasoning: **is this operation inside a loop, and does its cost grow with the data?** If yes to both, that is where the time is. Lesson 10.2 covers confirming it with a profiler rather than by inspection." }
          ]},
          { t: "p", text: "One judgement call worth naming: `deque` is only warranted because items are added at the front. If priority ordering could be applied afterwards, `sorted(result, key=...)` on a plain list would be simpler and fast enough — a simpler structure that needs one extra pass often beats a cleverer one." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A queue worker pulls jobs from an in-memory list with `jobs.pop(0)` and pushes new ones with `jobs.append(job)`. It performs well in staging and degrades badly under production load, with CPU climbing as the backlog grows." },
      { t: "p", text: "**The mechanism:** `pop(0)` removes the first pointer and shifts every remaining one left — O(n) in the current queue depth. When the backlog is short, n is small and nobody notices. As the backlog grows, each dequeue gets more expensive, which slows the worker, which grows the backlog further. The system has a positive feedback loop built into its data structure." },
      { t: "p", text: "**The fix is `collections.deque`**, which is O(1) at both ends, and it is a two-line change. The broader lesson is that this class of bug is invisible in staging by construction: the failure mode only appears once the structure is large, and staging is never large." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "A list is a **contiguous array of pointers** with spare capacity. Every performance property follows from that shape.",
    "`append` is amortised O(1) because growth is proportional, not by one slot. Building a large list in one pass lets CPython size the allocation once.",
    "**`insert(0, x)` and `pop(0)` are O(n)** — they shift every later pointer. Use `collections.deque` when you need both ends.",
    "**`x in lst` is a linear scan.** Converting to a `set` first turns a quadratic loop into a linear one, and is the highest-value performance fix in everyday Python.",
    "Mutating methods return `None`. `items = items.sort()` destroys your data; use `sorted()` when you want a new list.",
    "Sort with `key=`, use a tuple for multiple fields, and rely on **stability** — equal elements keep their relative order, which lets you sort in passes.",
    "**Never mutate a list while iterating it.** Elements are silently skipped. Build a new list, or assign back with `lst[:] = ...` to keep the same object.",
    "`[[0] * 3] * 3` creates three references to one inner list. Use a comprehension when the repeated element is mutable.",
    "A list is the right default for an ordered, growable sequence you append to and iterate. Reach for `set`, `dict`, `deque`, `heapq` or a dataclass when the access pattern says otherwise."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A worker dequeues with `jobs.pop(0)` and slows down as its backlog grows. Why?",
        options: [
          "`pop(0)` triggers a reallocation of the underlying array on every call",
          "`pop(0)` shifts every remaining pointer one slot left, so its cost grows with queue depth",
          "Python re-hashes the list after each removal from the front",
          "The garbage collector runs more often as the list grows"
        ],
        answer: 1,
        why: "A list stores its pointers contiguously, so removing the first one requires moving all the rest — O(n) in the current length. As the backlog grows, each dequeue gets more expensive, which slows the worker and grows the backlog further. `collections.deque` is O(1) at both ends and is a two-line change. Lists do reallocate on growth, but that is amortised and not what is happening here."
      },
      {
        stem: "What does this print?",
        lang: "python",
        code: `grid = [[0] * 2] * 2
grid[0][0] = 9
print(grid)`,
        options: [
          "`[[9, 0], [0, 0]]` — only the first inner list is modified",
          "`[[9, 0], [9, 0]]` — `*` copied the reference, so both rows are the same list",
          "`[[9, 9], [9, 9]]` — the assignment propagates to every element",
          "A `TypeError`, because nested lists cannot be multiplied"
        ],
        answer: 1,
        why: "`*` on a list copies references, not objects. The outer multiplication produced two pointers to one inner list, so writing through either is visible through both. The inner `[0] * 2` is harmless because integers are immutable and sharing them cannot be observed. Use `[[0] * 2 for _ in range(2)]`, where the comprehension evaluates the inner expression separately each iteration."
      },
      {
        stem: "`items = items.sort()` leaves `items` as `None`. Why does `sort()` behave this way?",
        options: [
          "It is a historical inconsistency that `sorted()` was added to correct",
          "Methods that mutate in place return `None` by convention, to signal that they changed the object rather than produced a new one",
          "`sort()` returns `None` only when the list is already sorted",
          "Sorting happens lazily, and `None` is a placeholder until the result is needed"
        ],
        answer: 1,
        why: "It is a deliberate and consistent convention across `sort`, `reverse`, `append`, `extend`, `insert`, `remove` and `clear`. Returning `None` makes it impossible to write `new = old.sort()` believing you left `old` untouched — the immediate `None` is a much louder failure than silently sharing a mutated list. When you want a new list, `sorted()` and `reversed()` are the non-mutating counterparts."
      },
      {
        stem: "A loop does `if record_id not in seen:` where `seen` is a list that grows to 50,000 entries. What is the total complexity, and the fix?",
        options: [
          "O(n) — membership testing is constant time; no fix needed",
          "O(n²) — each test scans the whole list; making `seen` a set makes each test O(1)",
          "O(n log n) — Python keeps lists sorted internally for faster searching",
          "O(n²), and the fix is to sort `seen` and use `bisect` for binary search"
        ],
        answer: 1,
        why: "Each `not in` scans until it finds a match or reaches the end, so n tests against a list growing to n gives roughly n²/2 comparisons. A `set` hashes the value and goes straight to a bucket, making each test O(1) and the loop linear. Option D would work — O(n log n) — but requires keeping the list sorted on every insert and is strictly worse than a set for pure membership."
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
        q: "How is a Python list implemented, and what does that mean for performance?",
        strong: "It is a dynamic array of pointers to objects, with spare capacity allocated ahead of need. Indexing and appending are O(1) — appending amortised, since growth is proportional. Inserting or removing at the front is O(n) because every later pointer shifts, and membership testing is a linear scan.",
        answer: [
          { t: "p", text: "The question is really asking whether you can derive behaviour from structure rather than recite a table. Leading with \"array of pointers\" and letting the costs follow demonstrates that." },
          { t: "p", text: "Two details mark real familiarity: explaining *why* append is amortised — proportional growth makes reallocations rarer as the list grows — and noting that storing pointers rather than values is what allows mixed types and what makes lists memory-heavy compared with a NumPy array." },
          { t: "p", text: "A good close is the practical pair: `deque` when you need both ends, `set` when you need membership. Interviewers want to know you would reach for those without being prompted." }
        ]
      },
      {
        level: "core",
        q: "Why should you not modify a list while iterating over it?",
        strong: "The iterator tracks a position. Removing an element shifts everything left, so the next element slides into the index already visited and is skipped. The result is silently wrong rather than an error.",
        answer: [
          { t: "p", text: "The strongest version of this answer includes the reason it is dangerous rather than merely wrong: on many inputs the output *looks* correct. Filtering evens from `[1,2,3,4,5,6]` gives the right answer; `[1,2,2,3]` leaves a `2` behind. A bug that passes casual testing is worse than one that raises." },
          { t: "p", text: "Mention both fixes and the difference between them: a comprehension bound to the same name creates a new list, while `lst[:] = [...]` replaces the contents of the existing object — which matters when other names refer to it. That distinction is the aliasing model from earlier in the course." },
          { t: "p", text: "Worth noting that dictionaries and sets are stricter here: mutating one during iteration raises `RuntimeError: dictionary changed size during iteration`. Lists give you silence, which is why this specific trap is worth calling out." }
        ]
      },
      {
        level: "advanced",
        q: "A function is correct on test data and unusably slow in production. How do you approach it?",
        strong: "Look for operations inside loops whose cost grows with the data — list membership tests, front insertions, repeated work that does not depend on the loop variable. Confirm with a profiler rather than by inspection, and assert that the rewrite produces identical output before claiming a speedup.",
        answer: [
          { t: "p", text: "The interviewer wants a method, not a list of tricks. The useful framing is a single question applied to every line in the loop: *does this cost grow with n?* If yes, it is multiplying with the loop and that is where the time is." },
          { t: "p", text: "The point that separates a strong answer: **this class of bug is invisible in staging by construction.** Quadratic behaviour is imperceptible at fixture scale and dominant at production scale, so the code passed review and passed tests and was still wrong. That is an argument for reasoning about complexity during review, not only when something is already on fire." },
          { t: "p", text: "Closing on the discipline earns credit too — assert old and new produce identical output, then measure. A performance fix that quietly changes behaviour is a worse outcome than the slow version." }
        ],
        weak: "Jumping to multiprocessing or caching first. Both add complexity while leaving an O(n²) algorithm in place; parallelising quadratic work buys you a constant factor against a problem that grows with the square."
      }
    ]
  }
});
