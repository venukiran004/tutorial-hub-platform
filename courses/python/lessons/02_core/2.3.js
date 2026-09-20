/* ============================================================================
   LESSON 2.3 — Dictionaries
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "The dictionary is not just one of Python's containers — it is the structure Python is **built out of**. Module namespaces, object attributes, function keyword arguments and class bodies are all dicts. Understanding how one works therefore explains a surprising amount of the language, and the methods most people never learn replace whole loops with a single call.",

  objectives: [
    "Describe how a dict finds a key, and derive its performance and constraints from that",
    "Explain why insertion order is now guaranteed and what changed to make it so",
    "Choose correctly between `[]`, `get`, `setdefault` and `defaultdict`",
    "Use key, value and item views, including their set operations",
    "Avoid the mutable-key, mutation-during-iteration and shallow-copy traps"
  ],

  prerequisites: ["1.4", "2.2"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "How a dict finds a key", id: "how-it-works" },

    {"kind": "flow", "title": "How a dict finds a key", "caption": "Since 3.6 a dict is two arrays: a sparse index table and a dense array of entries in insertion order. Lookup hashes the key, finds the slot, and compares; iteration walks the dense array — which is why order is preserved.", "cols": 4, "nodes": [{"id": "k", "label": "key"}, {"id": "h", "label": "hash(key)", "tone": "accent"}, {"id": "idx", "label": "sparse index table", "sub": "slot → entry number", "tone": "good"}, {"id": "ent", "label": "dense entries", "sub": "(hash, key, value) in insertion order", "tone": "warn"}], "edges": [["k", "h"], ["h", "idx"], ["idx", "ent"]], "t": "diagram", "id": "dg-2_3-01-0"},




    { t: "p", text: "A dict computes `hash(key)`, uses part of that hash to pick a slot in an index array, and looks there. If the slot holds a different key — a **collision** — it probes further until it finds the right one or an empty slot. Because the number of probes does not grow with the size of the dict, lookup is O(1)." },

    { t: "viz",
      title: "The split-table layout, and why order survives",
      caption: "Since Python 3.6 a dict keeps a compact array of entries in insertion order, plus a sparse index array of positions into it. Iteration walks the compact array, so it yields keys in the order they were added. The design was adopted to save memory; ordered iteration was a side effect that became a guarantee in 3.7.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram: a Python dict as a sparse index array pointing into a compact insertion-ordered entries array">
  <defs>
    <marker id="a8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-mono" style="font-size:11px">d = {"name": "Ada", "role": "admin", "id": 7}</text>

  <text x="20" y="60" class="s-sub" style="font-weight:700;letter-spacing:.08em">1 · HASH THE KEY</text>
  <rect x="20" y="72" width="150" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="95" y="94" text-anchor="middle" class="s-mono" style="font-size:10px">hash("role")</text>
  <line x1="170" y1="89" x2="216" y2="89" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a8)"/>
  <text x="193" y="81" text-anchor="middle" class="s-sub">mod 8</text>

  <text x="240" y="60" class="s-sub" style="font-weight:700;letter-spacing:.08em">2 · SPARSE INDEX (mostly empty — this is the memory saving)</text>
  <g>
    <rect x="240" y="72" width="42" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/><text x="261" y="94" text-anchor="middle" class="s-sub">—</text>
    <rect x="286" y="72" width="42" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/><text x="307" y="94" text-anchor="middle" class="s-mono" style="font-size:10px">2</text>
    <rect x="332" y="72" width="42" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/><text x="353" y="94" text-anchor="middle" class="s-sub">—</text>
    <rect x="378" y="72" width="42" height="34" rx="5" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.5"/><text x="399" y="94" text-anchor="middle" class="s-mono" style="font-size:10px">1</text>
    <rect x="424" y="72" width="42" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/><text x="445" y="94" text-anchor="middle" class="s-sub">—</text>
    <rect x="470" y="72" width="42" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/><text x="491" y="94" text-anchor="middle" class="s-mono" style="font-size:10px">0</text>
    <rect x="516" y="72" width="42" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/><text x="537" y="94" text-anchor="middle" class="s-sub">—</text>
    <rect x="562" y="72" width="42" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/><text x="583" y="94" text-anchor="middle" class="s-sub">—</text>
  </g>
  <text x="620" y="94" class="s-sub">slot 3 holds entry #1</text>

  <line x1="399" y1="106" x2="399" y2="158" style="stroke:var(--accent)" stroke-width="1.5" marker-end="url(#a8)"/>

  <text x="240" y="146" class="s-sub" style="font-weight:700;letter-spacing:.08em">3 · COMPACT ENTRIES, IN INSERTION ORDER</text>
  <g>
    <rect x="240" y="160" width="200" height="34" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="252" y="182" class="s-mono" style="font-size:10px">0  "name"  -&gt;  "Ada"</text>
    <rect x="240" y="198" width="200" height="34" rx="5" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.5"/>
    <text x="252" y="220" class="s-mono" style="font-size:10px">1  "role"  -&gt;  "admin"</text>
    <rect x="240" y="236" width="200" height="34" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="252" y="258" class="s-mono" style="font-size:10px">2  "id"    -&gt;  7</text>
  </g>

  <text x="464" y="182" class="s-sub">Iteration walks this array top to</text>
  <text x="464" y="198" class="s-sub">bottom, so keys come out in the</text>
  <text x="464" y="214" class="s-sub">order they were inserted.</text>
  <text x="464" y="242" class="s-sub" style="fill:var(--warn)">A deleted entry leaves a hole;</text>
  <text x="464" y="258" class="s-sub" style="fill:var(--warn)">the array is compacted on resize.</text>
</svg>`
    },

    { t: "table",
      head: ["Operation", "Cost", "Note"],
      rows: [
        ["`d[key]`", "<span class='big-o fast'>O(1)</span>", "Average; degrades only under pathological collisions"],
        ["`d[key] = v`", "<span class='big-o fast'>O(1)</span>", "Amortised — occasionally triggers a resize"],
        ["`key in d`", "<span class='big-o fast'>O(1)</span>", "Checks **keys**, never values"],
        ["`del d[key]`", "<span class='big-o fast'>O(1)</span>", "Leaves a tombstone until the next resize"],
        ["`len(d)`", "<span class='big-o fast'>O(1)</span>", "Stored, not counted"],
        ["`for k in d`", "<span class='big-o mid'>O(n)</span>", "Walks the compact entries array in insertion order"],
        ["`value in d.values()`", "<span class='big-o slow'>O(n)</span>", "A linear scan — values are not indexed"]
      ]
    },

    { t: "callout", kind: "insight", title: "Dicts are how Python itself works", body: [
      { t: "code", lang: "python", title: "look underneath", numbered: false, code: `
class User:
    def __init__(self, name):
        self.name = name


u = User("Ada")
print(u.__dict__)              # instance attributes are a dict
print(type(User.__dict__))     # so is the class body

import math
print(type(math.__dict__))     # so is a module namespace

def f(**kwargs):
    return kwargs
print(f(a=1, b=2))             # **kwargs is a dict`,
        out: `{'name': 'Ada'}
<class 'mappingproxy'>
<class 'dict'>
{'a': 1, 'b': 2}`},
      { t: "p", text: "This is why attribute access is fast, why you can add attributes to most objects at runtime, and why `__slots__` (Lesson 8.8) saves memory — it replaces the per-instance dict with a fixed array." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Insertion order is a guarantee", id: "ordering" },

    { t: "p", text: "Dicts preserve insertion order. This became an implementation detail in CPython 3.6 and a **language guarantee** in 3.7 — so it is safe to rely on across implementations, not merely in CPython." },

    { t: "code", lang: "python", title: "what the guarantee does and does not cover", code: `
d = {"b": 1, "a": 2, "c": 3}
print(list(d))                  # insertion order, NOT sorted

d["a"] = 99                     # updating a value keeps the original position
print(list(d))

del d["b"]
d["b"] = 5                      # deleting and re-adding moves it to the end
print(list(d))
`,
      out: `['b', 'a', 'c']
['b', 'a', 'c']
['a', 'c', 'b']`,
      caption: "Order means *insertion* order, not sorted order. Assigning to an existing key keeps its place; deleting and reinserting moves it to the end."
    },

    { t: "callout", kind: "good", title: "Three things the guarantee makes possible", body: [
      { t: "code", lang: "python", title: "practical uses", numbered: false, code: `
# 1. Order-preserving deduplication -- a set cannot do this
items = ["b", "a", "b", "c"]
print(list(dict.fromkeys(items)))

# 2. Deterministic JSON output, which makes diffs readable
import json
print(json.dumps({"z": 1, "a": 2}))     # key order is preserved

# 3. A small ordered cache, first-inserted first out
cache = {}
def remember(key, value, limit=100):
    cache[key] = value
    if len(cache) > limit:
        oldest = next(iter(cache))       # first key = oldest insertion
        del cache[oldest]`,
        out: `['b', 'a', 'c']
{"z": 1, "a": 2}`},
      { t: "p", text: "`collections.OrderedDict` still exists and is still occasionally right — it has `move_to_end()` and `popitem(last=False)`, and its `==` comparison is order-sensitive where a plain dict's is not. For simply preserving order, a plain dict is now enough." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Reading a key: four options", id: "access" },

    {"kind": "compare", "title": "Four ways to read a key", "caption": "Pick by what a missing key means: a bug (d[k]), a default (get), a default to store (setdefault), or something the structure should handle for you (defaultdict).", "columns": [{"title": "d[k]", "tone": "crit", "items": ["KeyError if absent", "use when absence is a bug"]}, {"title": "d.get(k, default)", "tone": "accent", "items": ["returns default", "does not store it"]}, {"title": "d.setdefault(k, v)", "tone": "good", "items": ["stores v if absent", "returns the value"]}, {"title": "defaultdict", "tone": "violet", "items": ["factory called on miss", "for grouping and counting"]}], "t": "diagram", "id": "dg-2_3-03-1"},




    { t: "code", lang: "python", title: "each says something different", code: `
config = {"host": "localhost", "port": 8080}

config["host"]                       # 1. required -- KeyError if missing
config.get("timeout")                # 2. optional -- None if missing
config.get("timeout", 30)            # 3. optional with a fallback
config.setdefault("retries", 3)      # 4. read, INSERTING the default if absent

print(config)
`,
      out: `{'host': 'localhost', 'port': 8080, 'retries': 3}`
    },

    { t: "dl", items: [
      ["`d[key]`", "Use when the key is **required**. The `KeyError` is a feature: it fails at the line where the assumption broke, with the missing key named."],
      ["`d.get(key)`", "Use when absence is **normal**. Returns `None`, which then flows onward — so pair it with an `is None` check rather than letting it reach code expecting a value."],
      ["`d.get(key, default)`", "Use when there is a sensible fallback. Does **not** modify the dict."],
      ["`d.setdefault(key, default)`", "Use when you want the default **stored**. Note the default is evaluated on every call, even when the key exists."]
    ]},

    { t: "callout", kind: "trap", title: "`get` with a default hides missing configuration", body: [
      { t: "code", lang: "python", title: "the silent failure", numbered: false, code: `
# A typo in the config file: "databse_url"
db_url = config.get("database_url", "sqlite:///dev.db")`},
      { t: "p", text: "The service starts, connects to a local SQLite file, and appears healthy. Requests succeed. Nobody notices until the data is missing from the real database — often days later." },
      { t: "p", text: "**Defaults are for values that are genuinely optional.** For anything the program cannot function without, use `config[\"database_url\"]` and let it fail at startup. A crash at boot is a far better outcome than a service that runs against the wrong backend. Lesson 14.2 covers this as a settings-validation problem." }
    ]},

    { t: "callout", kind: "trap", title: "`setdefault` evaluates its default every time", body: [
      { t: "code", lang: "python", title: "the cost", numbered: false, code: `
# expensive_default() is called on EVERY iteration, even when the key
# already exists and the result is thrown away.
for item in items:
    groups.setdefault(item.key, expensive_default()).append(item)`},
      { t: "p", text: "`setdefault` is a normal method call, so its argument is evaluated before the call happens. When the default is expensive — or has side effects — this is wasteful at best and wrong at worst. `defaultdict` calls its factory only when a key is actually missing." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Grouping and counting", id: "grouping" },

    { t: "ladder",
      title: "Grouping orders by customer",
      rungs: [
        { level: "bad", label: "Check then insert", why: "three lines of bookkeeping per item",
          code: `groups = {}
for order in orders:
    if order["customer"] not in groups:
        groups[order["customer"]] = []
    groups[order["customer"]].append(order)`,
          note: "Correct, and it works. But the key expression is written three times, which is three chances for a typo and three places to change if the grouping key changes. The bookkeeping is louder than the intent." },

        { level: "ok", label: "setdefault", why: "one expression, still explicit",
          code: `groups = {}
for order in orders:
    groups.setdefault(order["customer"], []).append(order)`,
          note: "One line, and the key appears once. The empty list is constructed on every iteration and discarded when the key exists — negligible for a literal, but a real cost if the default were expensive." },

        { level: "best", label: "defaultdict", why: "factory called only when needed",
          code: `from collections import defaultdict

groups: defaultdict[str, list] = defaultdict(list)
for order in orders:
    groups[order["customer"]].append(order)

# Convert back if callers should not get auto-created keys:
groups = dict(groups)`,
          note: "The factory runs only when a key is genuinely absent. The final conversion matters more than it looks: a `defaultdict` silently creates an entry on *any* missing-key read, so `groups[\"nobody\"]` returns `[]` and adds it. Returning a plain dict restores the `KeyError` that callers expect." }
      ]
    },

    { t: "code", lang: "python", title: "Counter, for the counting case", code: `
from collections import Counter

statuses = ["paid", "pending", "paid", "failed", "paid"]

counts = Counter(statuses)
print(counts)
print(counts.most_common(2))
print(counts["refunded"])          # 0, not KeyError

# Counters support arithmetic, which replaces a lot of manual merging:
today = Counter({"paid": 5, "failed": 1})
yesterday = Counter({"paid": 3, "pending": 2})
print(today + yesterday)
`,
      out: `Counter({'paid': 3, 'pending': 1, 'failed': 1})
[('paid', 3), ('pending', 1)]
0
Counter({'paid': 8, 'pending': 2, 'failed': 1})`
    },

    /* ================================================================== */
    { t: "h2", n: "05", text: "Views", id: "views" },

    { t: "p", text: "`d.keys()`, `d.values()` and `d.items()` return **views** — live windows onto the dict, not copies. They reflect later changes, cost nothing to create, and the key and item views support set operations." },

    { t: "code", lang: "python", title: "views are live and set-like", code: `
a = {"x": 1, "y": 2}
keys = a.keys()

a["z"] = 3
print(keys)                       # the view already includes z

b = {"y": 20, "z": 30, "w": 40}
print(a.keys() - b.keys())        # keys only in a
print(a.keys() & b.keys())        # keys in both

# items() is set-like too, when the values are hashable:
print(a.items() & b.items())      # entries identical in both
`,
      out: `dict_keys(['x', 'y', 'z'])
{'x'}
{'y', 'z'}
set()`,
      caption: "This is what made the reconciliation in Lesson 2.2 so short — no conversion to `set` was needed. Note `values()` is *not* set-like, because values need not be hashable or unique."
    },

    { t: "code", lang: "python", title: "iterating correctly", code: `
d = {"a": 1, "b": 2}

for key in d:                    # iterating a dict yields KEYS
    print(key, d[key])

for key, value in d.items():     # idiomatic when you need both
    print(key, value)

# Anti-pattern: extra lookup per iteration
# for key in d:
#     value = d[key]             # items() already gave you this
`,
      out: `a 1
b 2
a 1
b 2`
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Merging, copying and the traps", id: "traps" },

    { t: "code", lang: "python", title: "merging", code: `
defaults = {"host": "localhost", "port": 8080, "debug": False}
overrides = {"port": 9000}

merged = {**defaults, **overrides}      # new dict; right side wins
print(merged)

merged = defaults | overrides           # same thing, Python 3.9+
defaults |= overrides                   # in-place update
`,
      out: `{'host': 'localhost', 'port': 9000, 'debug': False}`
    },

    { t: "callout", kind: "trap", title: "Merging is shallow", body: [
      { t: "code", lang: "python", title: "nested values are shared", numbered: false, code: `
defaults = {"db": {"host": "localhost", "port": 5432}}
config = {**defaults}                 # a new outer dict...

config["db"]["host"] = "prod-db"      # ...but the SAME inner dict
print(defaults["db"]["host"])`,
        out: `prod-db`},
      { t: "p", text: "`{**d}`, `dict(d)` and `d.copy()` all produce a new outer dict whose values are the **same objects** — the aliasing model from Lesson 1.4. For nested structures, `copy.deepcopy()` recurses, at the cost of copying everything. Lesson 2.4 covers the choice properly." }
    ]},

    { t: "callout", kind: "trap", title: "Mutating a dict while iterating raises", body: [
      { t: "code", lang: "python", title: "stricter than a list", numbered: false, code: `
d = {"a": 1, "b": 2, "c": 3}

for key in d:
    if d[key] < 2:
        del d[key]`,
        out: `RuntimeError: dictionary changed size during iteration`},
      { t: "p", text: "Unlike a list, which silently skips elements, a dict raises. That is a better failure — but you still need the fix, which is to iterate over a snapshot or build a new dict:" },
      { t: "code", lang: "python", title: "both fixes", numbered: false, code: `
d = {k: v for k, v in d.items() if v >= 2}       # preferred

for key in list(d):                              # snapshot of the keys
    if d[key] < 2:
        del d[key]`}
    ]},

    { t: "callout", kind: "trap", title: "Keys must be hashable — and stable", body: [
      { t: "code", lang: "python", title: "the subtle version", numbered: false, code: `
class Point:
    def __init__(self, x):
        self.x = x
    def __hash__(self):
        return hash(self.x)         # hash depends on a MUTABLE attribute
    def __eq__(self, other):
        return self.x == other.x


p = Point(1)
d = {p: "found me"}
p.x = 2                             # the hash has now changed
print(p in d)                       # False -- the key is lost`,
        out: `False`},
      { t: "p", text: "The object is still in the dict, occupying its original slot, but lookups now hash to a different slot and never find it. This is why the built-in mutable types refuse to be keys, and why any custom `__hash__` must be built from immutable state. Lesson 4.9 covers implementing `__hash__` and `__eq__` as a pair." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "07", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Aggregate a sales feed in one pass",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "You are given a flat list of transaction records and asked for a summary: totals per region, the top product in each region, and a count of records that had to be skipped." },
        { t: "p", text: "The naive version iterates the data once per question. Do it in **one pass**, using the right dict tool for each accumulation." }
      ],
      requirements: [
        "Compute, in a single iteration: revenue per region, unit count per product per region, and the number of malformed records.",
        "A record is malformed if `region`, `product` or `amount` is missing, or `amount` is not parseable as a `Decimal`.",
        "Use `defaultdict` or `Counter` where each fits, rather than checking for key existence.",
        "Report the top product per region by units, breaking ties alphabetically so the output is deterministic.",
        "Return a plain `dict`, not a `defaultdict` — callers should get a `KeyError` for an unknown region.",
        "Do not iterate the input more than once."
      ],
      hint: "Nested `defaultdict` is spelled `defaultdict(lambda: defaultdict(int))` — but a `defaultdict(Counter)` reads better here and gives you `most_common` for free. For deterministic ties, sort by `(-units, product)`.",
      solution: {
        lang: "python",
        title: "aggregate.py",
        code: `"""Aggregate a transaction feed in a single pass."""

from __future__ import annotations

from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from typing import Any, NamedTuple

REQUIRED_FIELDS = frozenset({"region", "product", "amount"})


class RegionSummary(NamedTuple):
    revenue: Decimal
    units_by_product: dict[str, int]
    top_product: str | None


class Report(NamedTuple):
    regions: dict[str, RegionSummary]
    skipped: int


def _parse_amount(raw: Any) -> Decimal:
    # Decimal(str) is exact; Decimal(float) inherits binary error (Lesson 1.5).
    return Decimal(str(raw))


def aggregate(records: list[dict]) -> Report:
    revenue: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    units: defaultdict[str, Counter] = defaultdict(Counter)
    skipped = 0

    for record in records:
        # One membership test against a frozenset beats three 'in' checks.
        if not REQUIRED_FIELDS <= record.keys():
            skipped += 1
            continue

        try:
            amount = _parse_amount(record["amount"])
        except (InvalidOperation, TypeError, ValueError):
            skipped += 1
            continue

        region = record["region"]
        revenue[region] += amount
        units[region][record["product"]] += 1

    regions = {}
    for region, total in revenue.items():
        counts = units[region]
        # Sort by units descending, then product name, so ties are stable
        # and the output does not shift between runs.
        top = min(counts.items(), key=lambda kv: (-kv[1], kv[0]))[0]
        regions[region] = RegionSummary(
            revenue=total,
            units_by_product=dict(counts),
            top_product=top,
        )

    # A plain dict: callers asking for an unknown region should get a
    # KeyError, not a silently created empty summary.
    return Report(regions=regions, skipped=skipped)


if __name__ == "__main__":
    data = [
        {"region": "emea", "product": "widget", "amount": "19.99"},
        {"region": "emea", "product": "widget", "amount": "19.99"},
        {"region": "emea", "product": "gadget", "amount": "5.00"},
        {"region": "apac", "product": "gadget", "amount": "7.50"},
        {"region": "apac", "product": "widget", "amount": "7.50"},
        {"region": "apac", "amount": "1.00"},          # missing product
        {"region": "emea", "product": "widget", "amount": "N/A"},
    ]

    report = aggregate(data)

    assert report.skipped == 2
    assert report.regions["emea"].revenue == Decimal("44.98")
    assert report.regions["emea"].top_product == "widget"
    # apac: gadget and widget both have 1 unit -> alphabetical tiebreak
    assert report.regions["apac"].top_product == "gadget"

    for region, summary in sorted(report.regions.items()):
        print(f"{region:6} {summary.revenue:>8}  top={summary.top_product}")
    print(f"skipped: {report.skipped}")`,
        notes: [
          { t: "p", text: "**`REQUIRED_FIELDS <= record.keys()`** is the subset test from Lesson 2.2 applied to a dict view. It replaces three separate `in` checks with one expression that reads as its own specification, and adding a required field means editing one frozenset." },
          { t: "p", text: "**`defaultdict(Counter)`** gives a two-level structure where both levels auto-create. `units[region][product] += 1` works on the very first record for a region without any existence checking, because the outer default produces a `Counter` and the `Counter` defaults missing keys to zero." },
          { t: "p", text: "**`min(counts.items(), key=lambda kv: (-kv[1], kv[0]))`** rather than `Counter.most_common(1)`. `most_common` breaks ties by insertion order, which depends on the order records happened to arrive — so the same data in a different order produces a different \"top product\". The explicit key makes ties deterministic." },
          { t: "callout", kind: "insight", title: "Why convert back to a plain dict", body: [
            { t: "p", text: "A `defaultdict` creates an entry on *any* missing-key read, not just on write. If this function returned one, a caller writing `report.regions[\"unknown\"]` would silently receive an empty summary and add a phantom region to the report — a bug with no exception and no log line." },
            { t: "p", text: "`defaultdict` is an excellent accumulator and a poor return value. Build with it, hand back a `dict`." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service reads its database URL with `config.get(\"database_url\", \"sqlite:///local.db\")`. A deployment renames the environment variable, the new name is not picked up, and the service starts cleanly. Health checks pass. Writes succeed. Two days later, someone notices the production database has no new rows." },
      { t: "p", text: "**Every individual decision was reasonable** — a default for local development, a `get` to avoid a crash, a health check that verifies the process responds. Together they produced a service that was confidently wrong, and the fallback is what converted a startup failure into two days of silent data loss." },
      { t: "p", text: "**The rule this scenario justifies:** a default is a statement that the value is optional. For anything the program cannot function correctly without, index with `[]` and let it raise at startup — or validate the whole configuration up front and refuse to boot. Fail fast, loudly, at the earliest possible moment." },
      { t: "p", text: "A secondary lesson: the health check verified liveness, not correctness. A check that confirmed connectivity to the *expected* database would have caught this in seconds. Lesson 14.3 covers health checks that mean something." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "A dict hashes the key, indexes into a sparse table and reads a compact entries array — which is why lookup is O(1) and why keys must be hashable.",
    "**Dicts are how Python works internally**: instance attributes, class bodies, module namespaces and `**kwargs` are all dicts.",
    "**Insertion order is a language guarantee since 3.7.** It enables order-preserving deduplication with `dict.fromkeys`, deterministic JSON, and simple ordered caches.",
    "`d[key]` for required values, `get` for genuinely optional ones, `get(key, default)` for a fallback, `setdefault` when the default should be stored.",
    "**A default on required configuration converts a startup crash into silent wrongness.** Index required settings with `[]`.",
    "`setdefault` evaluates its default on every call; `defaultdict` calls its factory only on a genuine miss. Use `defaultdict`/`Counter` for accumulation.",
    "**Convert a `defaultdict` back to `dict` before returning it** — otherwise a caller's missing-key read silently creates an entry.",
    "`keys()` and `items()` are live, set-like views. `a.keys() - b.keys()` needs no conversion. `values()` is not set-like.",
    "Merging with `{**a, **b}` or `a | b` is **shallow** — nested values are shared with the original.",
    "Mutating a dict during iteration raises `RuntimeError` (unlike a list, which silently skips). Iterate `list(d)` or build a new dict.",
    "A key's hash must never change while it is in the dict, or the entry becomes unreachable. Any custom `__hash__` must be built from immutable state."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does this print?",
        lang: "python",
        code: `d = {"b": 1, "a": 2}
d["b"] = 99
del d["a"]
d["a"] = 3
print(list(d))`,
        options: [
          "`['a', 'b']` — dicts iterate in sorted key order",
          "`['b', 'a']` — updating `b` kept its position; deleting and re-adding `a` moved it to the end",
          "`['b', 'a']` — but only in CPython; other implementations may differ",
          "The order is unspecified and should not be relied on"
        ],
        answer: 1,
        why: "Insertion order has been a language guarantee since 3.7, so it holds across implementations — option C is out of date. Assigning to an existing key updates the value in place and keeps the original position, so `b` stays first. Deleting `a` removes its entry, and re-adding it appends at the end. Order means insertion order, never sorted order."
      },
      {
        stem: "A service reads `db = config.get(\"database_url\", \"sqlite:///local.db\")`. The environment variable is renamed and no longer matches. What happens?",
        options: [
          "The service fails to start, because the default is only used in development",
          "The service starts and runs against a local SQLite file, appearing healthy while writing to the wrong database",
          "A `KeyError` is raised on the first database query",
          "`get` logs a warning when it falls back to a default"
        ],
        answer: 1,
        why: "`get` with a default cannot distinguish \"not configured\" from \"deliberately absent\", so the service starts happily against the fallback. Health checks pass, writes succeed, and the failure is discovered days later when data is missing. This is the argument for indexing required configuration with `[]`: a crash at startup is a far better outcome than a service that is confidently wrong."
      },
      {
        stem: "Why should a function that builds a `defaultdict` convert it to a plain `dict` before returning it?",
        options: [
          "`defaultdict` cannot be serialised to JSON",
          "A missing-key *read* on a `defaultdict` silently creates an entry, so a caller's typo adds phantom data instead of raising",
          "`defaultdict` uses significantly more memory",
          "Plain dicts have faster lookup"
        ],
        answer: 1,
        why: "`defaultdict.__missing__` fires on any missing-key access, including reads. A caller writing `report[\"unkown_region\"]` gets an empty value back *and* mutates the report by adding that key — a bug with no exception and no log line. `defaultdict` is an excellent accumulator and a poor return value: build with it, hand back a `dict`. It does serialise fine, being a dict subclass."
      },
      {
        stem: "`config = {**defaults}` then `config[\"db\"][\"host\"] = \"prod\"`. What happens to `defaults[\"db\"][\"host\"]`?",
        options: [
          "It stays unchanged — `{**d}` creates an independent copy",
          "It becomes `\"prod\"` — the copy is shallow, so both dicts reference the same inner dict",
          "A `TypeError` is raised, because nested dicts cannot be unpacked",
          "It stays unchanged, but only until `config` is garbage collected"
        ],
        answer: 1,
        why: "`{**d}`, `dict(d)` and `d.copy()` all build a new outer dict whose values are the *same objects*. The inner dict has two names now, and mutating through either is visible through both — the aliasing model from Lesson 1.4. `copy.deepcopy()` recurses and gives full independence, at the cost of copying the entire structure."
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
        q: "How does a Python dictionary work internally?",
        strong: "It hashes the key, uses part of the hash to index a sparse table of positions, and reads the entry from a compact array stored in insertion order. Collisions are resolved by probing. Lookup is O(1) on average because the number of probes does not grow with the size of the dict.",
        answer: [
          { t: "p", text: "The split-table detail is what marks a current answer. Before 3.6 a dict was a single sparse array of entries; the compact-entries redesign was adopted to save memory, and ordered iteration fell out of it as a side effect that was later promoted to a guarantee." },
          { t: "p", text: "Two consequences worth volunteering: keys must be hashable and their hash must not change while they are in the dict, or the entry becomes unreachable. And dicts underpin instance attributes, class bodies and module namespaces — which is why attribute lookup is fast and why `__slots__` saves memory by removing the per-instance dict." }
        ]
      },
      {
        level: "core",
        q: "When would you use `get`, `setdefault` and `defaultdict`?",
        strong: "`get` for reading an optional value without modifying the dict. `setdefault` when a missing key should be inserted with a default as you read it. `defaultdict` when you are accumulating and every missing key needs a fresh container — it calls its factory only on a genuine miss, whereas `setdefault` evaluates its default argument every call.",
        answer: [
          { t: "p", text: "The evaluation difference is the detail that separates a working knowledge from a memorised one, and it matters when the default is expensive or has side effects." },
          { t: "p", text: "The judgement point worth adding, unprompted: `defaultdict` should not escape the function that built it. A missing-key *read* creates an entry, so returning one converts a caller's typo into silent phantom data. Build with it, convert to `dict` on the way out." },
          { t: "p", text: "And on `get` specifically: a default is a claim that the value is optional. Using one for required configuration turns a startup crash into a service that runs against the wrong backend." }
        ]
      },
      {
        level: "advanced",
        q: "Can a dictionary key change after insertion? What happens if it does?",
        strong: "It should not. The dict stored the entry in a slot derived from the hash at insertion time. If the key mutates so its hash changes, lookups compute the new hash, probe a different slot, and never find it — the entry is present but unreachable, and the same key can be inserted again.",
        answer: [
          { t: "p", text: "This is why the built-in mutable types are unhashable: it is not a limitation, it is protection from exactly this failure." },
          { t: "p", text: "The interesting case is a custom class, where nothing stops you from defining `__hash__` over a mutable attribute. The rule is that `__hash__` must be computed only from state that never changes for the object's lifetime — and that `__hash__` and `__eq__` must agree, since objects comparing equal must hash equally." },
          { t: "p", text: "A practical close: this is one reason frozen dataclasses are a good default for objects used as keys. `@dataclass(frozen=True)` generates a `__hash__` from the fields and blocks assignment, so the invariant is enforced by the type rather than by discipline." }
        ]
      }
    ]
  }
});
