/* ============================================================================
   LESSON 8.8 — Memory, Reference Counting and the GC
   ========================================================================= */
EC.receiveLesson({
  id: "8.8",

  lede: "CPython frees an object the instant its last reference disappears — which is why Python usually feels like it has no garbage collector. The collector exists for one job: **reference cycles**, which refcounting alone can never free. Understanding the two mechanisms explains prompt cleanup, delayed cleanup, and why a process's memory usage often refuses to fall back down.",

  objectives: [
    "Explain reference counting and predict when an object is freed",
    "Identify a reference cycle and describe what the generational collector does with it",
    "Use `weakref` to hold a reference that does not keep an object alive",
    "Measure the real memory cost of an object, and reduce it with `__slots__`",
    "Explain why RSS stays high after objects are freed"
  ],

  prerequisites: ["4.10", "8.5"],

  blocks: [

    { t: "h2", n: "01", text: "Reference counting", id: "refcount" },

    {"kind": "memory", "title": "Reference counting", "caption": "Every object carries a count of the names and containers that refer to it. When the count reaches zero the object is freed immediately — no collector involved. sys.getrefcount reports one extra for its own argument.", "names": [{"name": "a", "to": "o1"}, {"name": "b = a", "to": "o1"}, {"name": "lst = [a]", "to": "o2"}], "objects": [{"id": "o1", "type": "list", "value": "[1, 2, 3]", "note": "refcount 3: a, b, and lst[0]", "tone": "accent"}, {"id": "o2", "type": "list", "value": "[ →o1 ]", "note": "holds one of those references", "tone": "good"}], "t": "diagram", "id": "dg-8_8-01-0"},



    { t: "code", lang: "python", title: "the count is observable", code: `
import sys


class Thing:
    def __del__(self):
        print("freed")


t = Thing()
print(sys.getrefcount(t))      # 2: "t", plus getrefcount's own argument

others = [t, t]
print(sys.getrefcount(t))      # 4

del others
del t                          # last reference gone -> freed immediately
print("after del")
`,
      out: `2
4
freed
after del`,
      caption: "**`sys.getrefcount` always reports one more than you expect**, because passing the object to it creates a reference. Deallocation is synchronous: the `print` after `del t` runs *after* `__del__`, with no collector involved."
    },

    { t: "callout", kind: "insight", title: "What this buys and what it costs", body: [
      { t: "table",
        head: ["", "Consequence"],
        rows: [
          ["**Deterministic cleanup**", "A file's `__del__` closes it as soon as the last reference goes — which is why sloppy resource handling often works in CPython and breaks on PyPy"],
          ["**No pause**", "Freeing is spread through execution rather than concentrated in a stop-the-world sweep"],
          ["**Cost per operation**", "Every assignment, argument pass and scope exit adjusts counts — a large part of why Python is slower than compiled languages"],
          ["**Not thread-free**", "Counts must be protected, which is one of the reasons the GIL existed (Lesson 11.2)"],
          ["**Cannot free cycles**", "Two objects referring to each other never reach zero"]
        ]
      },
      { t: "p", text: "**Refcounting is an implementation detail, not a language guarantee.** PyPy, Jython and GraalPy use tracing collectors, so an object may be freed much later — which is exactly why `with` exists rather than relying on `__del__` (Lesson 5.8)." }
    ]},

    { t: "h2", n: "02", text: "Cycles and the collector", id: "cycles" },

    {"kind": "cycle", "title": "A reference cycle that counting cannot free", "caption": "a.partner = b and b.partner = a: each keeps the other's count at one even after every outside name is gone. The generational collector finds such cycles and frees them; weakref breaks them at the source.", "nodes": [{"label": "object a", "sub": "a.partner → b", "tone": "accent"}, {"label": "object b", "sub": "b.partner → a", "tone": "accent"}], "centre": "both refcounts stay ≥ 1", "t": "diagram", "id": "dg-8_8-02-1"},



    { t: "viz",
      title: "Why the collector exists",
      caption: "Two objects referring to each other each have a refcount of one, even with nothing outside pointing at them. Refcounting can never free that. The cyclic collector finds such groups by checking whether an object's references are all internal to the group.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram contrasting an unreachable object with refcount zero against two objects in a cycle whose refcounts remain at one">
  <defs>
    <marker id="rc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="26" width="418" height="222" rx="9" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="34" y="52" class="s-label" style="fill:var(--good)">NO CYCLE — refcounting handles it</text>

  <rect x="150" y="72" width="130" height="40" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="215" y="97" text-anchor="middle" class="s-mono" style="font-size:10px">x = Node()</text>

  <line x1="215" y1="116" x2="215" y2="146" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#rc)"/>
  <text x="235" y="138" class="s-mono" style="font-size:9px">del x</text>

  <rect x="150" y="150" width="130" height="40" rx="7" style="fill:none;stroke:var(--good)" stroke-width="1.3"/>
  <text x="215" y="175" text-anchor="middle" class="s-mono" style="font-size:10px">refcount 0</text>

  <text x="215" y="220" text-anchor="middle" class="s-sub" style="fill:var(--good)">freed immediately, no collector</text>

  <rect x="468" y="26" width="418" height="222" rx="9" style="fill:none;stroke:var(--crit)" stroke-width="1.4"/>
  <text x="488" y="52" class="s-label" style="fill:var(--crit)">CYCLE — refcounting cannot</text>

  <rect x="520" y="80" width="120" height="44" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="580" y="100" text-anchor="middle" class="s-mono" style="font-size:10px">parent</text>
  <text x="580" y="117" text-anchor="middle" class="s-sub">refcount 1</text>

  <rect x="716" y="80" width="120" height="44" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="776" y="100" text-anchor="middle" class="s-mono" style="font-size:10px">child</text>
  <text x="776" y="117" text-anchor="middle" class="s-sub">refcount 1</text>

  <line x1="642" y1="94" x2="712" y2="94" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#rc)"/>
  <text x="677" y="86" text-anchor="middle" class="s-mono" style="font-size:8px">.child</text>

  <line x1="714" y1="112" x2="644" y2="112" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#rc)"/>
  <text x="679" y="132" text-anchor="middle" class="s-mono" style="font-size:8px">.parent</text>

  <text x="678" y="168" text-anchor="middle" class="s-sub" style="fill:var(--crit)">nothing outside points at either,</text>
  <text x="678" y="188" text-anchor="middle" class="s-sub" style="fill:var(--crit)">yet neither count reaches 0</text>

  <text x="678" y="222" text-anchor="middle" class="s-sub">the cyclic collector finds and frees these</text>
</svg>`
    },

    { t: "code", lang: "python", title: "a cycle, and what collects it", code: `
import gc


class Node:
    def __init__(self):
        self.parent = None
        self.children = []


parent = Node()
child = Node()
parent.children.append(child)
child.parent = parent            # the cycle

del parent, child                # nothing outside refers to them now

print(gc.collect())              # returns the number of objects collected
`,
      out: `4`,
      caption: "**Cycles are ordinary**, not exotic: a parent/child tree, a doubly-linked list, an object holding a callback that closes over it, and any exception whose traceback references the frame that holds it."
    },

    { t: "table",
      head: ["Generation", "Contains", "Collected"],
      rows: [
        ["**0**", "Newly allocated container objects", "Often — after roughly 700 net allocations"],
        ["**1**", "Survivors of a gen-0 pass", "After ~10 gen-0 collections"],
        ["**2**", "Long-lived objects", "After ~10 gen-1 collections — and this is the expensive one"]
      ],
      caption: "**The generational hypothesis:** most objects die young, so scanning the young generation frequently and the old one rarely finds most garbage for a fraction of the work. Only *container* types are tracked — an `int` or a `str` cannot participate in a cycle, so the collector ignores them entirely."
    },

    { t: "callout", kind: "tradeoff", title: "Tuning the collector, honestly", body: [
      { t: "code", lang: "python", title: "the two adjustments worth knowing", numbered: false, code: `
import gc

# 1. gc.freeze() -- move everything currently alive out of GC scrutiny.
#    Called after imports and before forking workers, it stops the
#    collector touching (and copy-on-write dirtying) shared pages.
gc.freeze()

# 2. Raising the gen-0 threshold, for a process allocating heavily
gc.set_threshold(50_000, 20, 20)      # default: (700, 10, 10)

# The nuclear option, and rarely correct:
gc.disable()      # cycles now leak for the life of the process`},
      { t: "p", text: "**`gc.freeze()` before forking is the one with a clear, measurable win.** A pre-fork server's workers share memory copy-on-write until something writes — and the collector writing GC header bits to every object is exactly such a write, so each worker ends up with a private copy of pages it never modified." },
      { t: "p", text: "**`gc.disable()` is almost always wrong.** Cycles are common enough that a long-running process will accumulate them, and \"we disabled the GC\" is a memory leak with extra steps. Measure before touching any of this (Lesson 10.1)." }
    ]},

    { t: "h2", n: "03", text: "weakref", id: "weakref" },

    {"kind": "memory", "title": "A weak reference does not keep its target alive", "caption": "cache holds a weakref to the object; when the last strong reference (obj) is dropped the object is freed and the weakref returns None. Caches and observer lists use this to avoid pinning objects in memory.", "names": [{"name": "obj (strong)", "to": "o1"}, {"name": "cache[k] = weakref.ref(obj)", "to": "o1", "dashed": true, "label": "weak"}], "objects": [{"id": "o1", "type": "Session", "value": "<Session 0x7f…>", "note": "refcount 1: only obj counts", "tone": "accent"}], "t": "diagram", "id": "dg-8_8-03-2"},

    { t: "code", lang: "python", title: "a reference that does not keep an object alive", code: `
import weakref


class Session:
    def __init__(self, user: str) -> None:
        self.user = user


session = Session("ada")
ref = weakref.ref(session)

print(ref())                       # the object
del session
print(ref())                       # None -- it was collected


# The container forms, for caches and registries
cache: weakref.WeakValueDictionary[str, Session] = weakref.WeakValueDictionary()
s = Session("grace")
cache["s1"] = s
print(len(cache))
del s
print(len(cache))                  # the entry vanished with the object


# Cleanup without __del__
weakref.finalize(obj, lambda: print("cleaning up"))
`,
      out: `<Session object at 0x...>
None
1
0`,
      caption: "**`WeakValueDictionary` is the right structure for a cache that must not extend lifetimes.** The entry disappears when the value does — which is exactly what an identity map or an object registry needs (Lesson 8.5)."
    },

    { t: "callout", kind: "trap", title: "What cannot be weakly referenced", body: [
      { t: "code", lang: "python", title: "the common surprises", numbered: false, code: `
import weakref

weakref.ref([1, 2, 3])            # TypeError: cannot create weak reference
weakref.ref({"a": 1})             # TypeError
weakref.ref(42)                   # TypeError
weakref.ref("text")               # TypeError


class Slotted:
    __slots__ = ("x",)            # no __weakref__ slot -> cannot be weakref'd

weakref.ref(Slotted())            # TypeError

class Fixed:
    __slots__ = ("x", "__weakref__")     # add it explicitly

weakref.ref(Fixed())              # works`},
      { t: "p", text: "Built-in types like `list`, `dict`, `int` and `str` have no space for the weak-reference machinery. Subclass them if you genuinely need it — `class MyList(list): pass` is weakref-able." },
      { t: "p", text: "**`__slots__` removes `__weakref__` unless you list it**, which is the interaction that catches people combining a memory optimisation with a weak-reference cache." }
    ]},

    { t: "h2", n: "04", text: "Measuring, and reducing", id: "measuring" },

    { t: "code", lang: "python", title: "what an object actually costs", code: `
import sys


class Regular:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z


class Slotted:
    __slots__ = ("x", "y", "z")
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z


r, s = Regular(1, 2, 3), Slotted(1, 2, 3)

print(sys.getsizeof(r), sys.getsizeof(r.__dict__))
print(sys.getsizeof(s))
`,
      out: `48 184
64`,
      caption: "**`sys.getsizeof` is shallow** — it reports 48 bytes for the `Regular` instance and says nothing about the 184-byte dictionary hanging off it. For a million objects that is 232 MB versus 64 MB, and the shallow number would have told you 48 MB either way."
    },

    { t: "ladder",
      title: "Shrinking a million-record structure",
      rungs: [
        { level: "bad", label: "A list of dicts",
          why: "Every record carries a full hash table, and every key string is stored per record unless interning happens to help. It is the default shape data arrives in and the most expensive one to keep.",
          code: `records = [
    {"id": 1, "name": "ada", "score": 9.5}
    for _ in range(1_000_000)
]
# roughly 200+ bytes per record` },
        { level: "ok", label: "A class with `__slots__`",
          why: "No per-instance dictionary: attributes live in a fixed array with the names stored once on the class. Attribute access is also slightly faster, since it is an index rather than a hash lookup.",
          code: `class Record:
    __slots__ = ("id", "name", "score")

    def __init__(self, id, name, score):
        self.id, self.name, self.score = id, name, score

# roughly 64 bytes per record, plus the values` },
        { level: "best", label: "The right container for the shape",
          why: "For homogeneous numeric data, a columnar or array representation removes the per-object overhead entirely — a Python `float` is 24 bytes on its own, where an `array` element is 8. The tenfold difference is not a micro-optimisation.",
          code: `# Homogeneous numbers: array, or numpy
from array import array
scores = array("d", (9.5 for _ in range(1_000_000)))    # 8 bytes each

# Mixed columns: keep each column separate
class Records:
    __slots__ = ("ids", "names", "scores")

    def __init__(self):
        self.ids = array("q")
        self.names: list[str] = []
        self.scores = array("d")

# Or: do not hold it in memory at all -- stream it (Lesson 8.1)`,
          note: "**Check whether you need the data resident at all** before optimising its representation. A generator pipeline holding one record at a time beats every layout on this list." }
      ]
    },

    { t: "callout", kind: "warn", title: "Why RSS does not fall after you free objects", body: [
      { t: "p", text: "CPython allocates small objects from 256 KB **arenas** managed by its own allocator. An arena returns to the operating system only when *every* object in it is freed — so one surviving object keeps 256 KB resident." },
      { t: "ul", items: [
        "**Fragmentation is normal.** After a large batch job, freed objects leave gaps that Python happily reuses but cannot return.",
        "**A memory spike is permanent for the process.** Peak RSS is what your container limit must accommodate, even if average usage is far lower.",
        "**\"Memory not released\" is usually not a leak.** The distinction that matters: does RSS *grow without bound* across cycles (a leak), or rise to a plateau and stay (fragmentation)?",
        "**The practical response is to avoid the spike** — stream instead of materialising, or process in batches — not to try to force a release that the allocator will not perform."
      ]},
      { t: "p", text: "In a worker model, a process that has spiked can be recycled after N requests. That is a legitimate operational answer, and it is what `--max-requests` in gunicorn is for (Lesson 8.9)." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Cut a structure's memory by an order of magnitude",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "This cache holds ten million price points in a service with a 4 GB limit, and it is being OOM-killed. Measure it properly, then reduce it — and identify the reference cycle it also contains." },
        { t: "code", lang: "python", title: "prices.py — as found", numbered: false, code: `
class PricePoint:
    def __init__(self, symbol, timestamp, price, volume, source):
        self.symbol = symbol
        self.timestamp = timestamp
        self.price = price
        self.volume = volume
        self.source = source
        self.cache = None          # set by PriceCache.add

class PriceCache:
    def __init__(self):
        self.points = []
        self.by_symbol = {}

    def add(self, point):
        point.cache = self          # every point references the cache
        self.points.append(point)
        self.by_symbol.setdefault(point.symbol, []).append(point)`},
        { t: "p", text: "Symbols repeat heavily — ten million points across about 500 symbols — and `source` takes one of four values." }
      ],
      requirements: [
        "Measure the true per-object cost, not the shallow `sys.getsizeof`.",
        "Identify the reference cycle and explain why it is worse than it looks.",
        "Apply `__slots__` and quantify the saving.",
        "Eliminate the duplicated string storage for `symbol` and `source`.",
        "Show the columnar alternative and when it wins.",
        "Explain why RSS may not fall even after the fix.",
        "Tests that assert on measured memory, not on hopes."
      ],
      hint: "For the cycle, note that `by_symbol` also holds every point — so the container's own bookkeeping doubles the reference count without doubling the data. For the strings, ask what `sys.intern` does and where else the same effect comes for free.",
      solution: {
        lang: "python",
        title: "prices.py",
        code: `from __future__ import annotations

# =========================================================================
# 1. MEASURING PROPERLY
# =========================================================================
#
# sys.getsizeof is SHALLOW. For the original PricePoint it reports 48
# bytes and ignores the __dict__ hanging off it:
#
#   sys.getsizeof(point)              48
#   sys.getsizeof(point.__dict__)    296
#   + 5 string keys, shared           --
#   + the value objects               --
#
# Real cost per point: roughly 350 bytes before the values, and each
# distinct "symbol" string is 50+ bytes stored ONCE PER POINT unless
# something interns it.
#
#   10_000_000 x ~400 bytes = ~4 GB.  Hence the OOM kill.
#
# The right tool is tracemalloc, which measures allocation rather than
# guessing from object headers (Lesson 8.9):
#
#   import tracemalloc
#   tracemalloc.start()
#   before = tracemalloc.take_snapshot()
#   cache = build(10_000)
#   after = tracemalloc.take_snapshot()
#   for stat in after.compare_to(before, "lineno")[:5]:
#       print(stat)


# =========================================================================
# 2. THE CYCLE
# =========================================================================
#
#   point.cache = self          -> every point references the cache
#   self.points.append(point)   -> the cache references every point
#
# A ten-million-element cycle. Why it is worse than it looks:
#
#   a) Refcounting cannot free ANY of it. Dropping the cache leaves ten
#      million points each still referenced by the cache object, which
#      is itself still referenced by every point.
#
#   b) It is only reclaimable by the cyclic collector, and a structure
#      this large lands in generation 2 -- the generation collected
#      least often and most expensively. Every gen-2 pass walks all ten
#      million objects to prove they are still reachable.
#
#   c) point.cache buys nothing. It exists so a point can find its
#      cache, which no code actually needs.
#
# The fix is to delete the back-reference. Where a back-reference is
# genuinely required, weakref.ref breaks the cycle without removing
# the capability.


import sys
from array import array
from dataclasses import dataclass


# =========================================================================
# 3 + 4. __slots__ and shared strings
# =========================================================================

@dataclass(slots=True, frozen=True)
class PricePoint:
    """slots=True: no per-instance __dict__.

      before:  48 (object) + 296 (dict) = ~344 bytes of overhead
      after:   ~88 bytes total for six slots
      saving:  roughly 4x, before the values

    frozen=True: these are records, not mutable state, and immutability
    means they can be shared freely between the two indexes without any
    aliasing risk (Lesson 4.10).

    NOTE: slots removes __weakref__. If any of these ever needs to be
    weakly referenced, list it explicitly -- it is not implied.
    """

    symbol: str
    timestamp: int          # epoch seconds, not a datetime (~50 bytes each)
    price: int              # PENCE as an int, not a float and not a Decimal
    volume: int
    source: str
    # no "cache" attribute -- the back-reference is gone


class PriceCache:
    __slots__ = ("_points", "_by_symbol", "_symbols", "_sources")

    def __init__(self) -> None:
        self._points: list[PricePoint] = []
        # Holds the SAME objects, not copies. A list of references costs
        # 8 bytes per entry; the points themselves are stored once.
        self._by_symbol: dict[str, list[PricePoint]] = {}

        # Interning pools. Ten million points across 500 symbols means
        # the naive version stores 10M copies of ~500 distinct strings.
        # sys.intern guarantees one object per distinct value.
        self._symbols: dict[str, str] = {}
        self._sources: dict[str, str] = {}

    def add(self, symbol: str, timestamp: int, price: int,
            volume: int, source: str) -> PricePoint:
        point = PricePoint(
            symbol=self._intern(self._symbols, symbol),
            timestamp=timestamp,
            price=price,
            volume=volume,
            source=self._intern(self._sources, source),
        )
        self._points.append(point)
        self._by_symbol.setdefault(point.symbol, []).append(point)
        return point

    @staticmethod
    def _intern(pool: dict[str, str], value: str) -> str:
        """sys.intern would also work and is faster, but it holds the
        string for the life of the process. An explicit pool is
        collected with the cache -- which matters when the values come
        from user data rather than from a fixed vocabulary."""
        return pool.setdefault(value, value)


# =========================================================================
# 5. THE COLUMNAR ALTERNATIVE
# =========================================================================

class ColumnarPriceCache:
    """When the data is homogeneous and accessed in bulk, per-object
    overhead disappears entirely.

      PricePoint with slots:  ~88 bytes + 5 value objects
      one columnar row:        8 + 8 + 8 + 2 + 2 = 28 bytes

    A Python int is 28 bytes on its own; an array("q") element is 8.
    That is the tenfold difference, and it is not a micro-optimisation.

    The cost: no per-row object. Scanning is fast, mutating a single
    row is awkward, and code that wants a "point" must reconstruct one.
    Right for analytics, wrong for a domain model.
    """

    __slots__ = ("timestamps", "prices", "volumes", "symbol_ids", "source_ids",
                 "_symbols", "_sources")

    def __init__(self) -> None:
        self.timestamps = array("q")            # int64
        self.prices = array("q")                # pence
        self.volumes = array("q")
        self.symbol_ids = array("H")            # uint16: 500 symbols fit
        self.source_ids = array("B")            # uint8: 4 sources fit
        self._symbols: list[str] = []
        self._sources: list[str] = []

    def add(self, symbol: str, timestamp: int, price: int,
            volume: int, source: str) -> None:
        self.timestamps.append(timestamp)
        self.prices.append(price)
        self.volumes.append(volume)
        self.symbol_ids.append(self._id(self._symbols, symbol))
        self.source_ids.append(self._id(self._sources, source))

    @staticmethod
    def _id(pool: list[str], value: str) -> int:
        try:
            return pool.index(value)
        except ValueError:
            pool.append(value)
            return len(pool) - 1

    def __len__(self) -> int:
        return len(self.timestamps)


# =========================================================================
# 6. WHY RSS MAY NOT FALL
# =========================================================================
#
# Even after freeing everything, the process's RSS may stay near its
# peak. CPython allocates small objects from 256 KB arenas, and an
# arena returns to the OS only when EVERY object in it is freed. One
# surviving object keeps 256 KB resident, and after a large batch the
# survivors are scattered across many arenas.
#
# So the useful distinction is:
#
#   RSS grows without bound across cycles      -> a leak, find it
#   RSS rises to a plateau and stays           -> fragmentation, normal
#
# The response is to avoid the spike, not to chase the release:
#
#   - stream instead of materialising (Lesson 8.1)
#   - process in batches
#   - recycle workers after N requests (gunicorn --max-requests)
#
# And gc.freeze() after startup, before forking workers: it stops the
# collector writing GC header bits to objects shared copy-on-write,
# which otherwise gives each worker a private copy of pages it never
# touched.


# =========================================================================
# TESTS -- assertions on MEASURED memory
# =========================================================================

import gc
import tracemalloc


def measure(build, n: int) -> int:
    """Peak allocation while building, in bytes. tracemalloc measures
    what was actually allocated, where sys.getsizeof only guesses from
    an object header."""
    gc.collect()
    tracemalloc.start()
    obj = build(n)
    current, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert obj is not None
    return current


def build_original(n: int):
    class OldPoint:
        def __init__(self, symbol, timestamp, price, volume, source):
            self.symbol, self.timestamp = symbol, timestamp
            self.price, self.volume, self.source = price, volume, source
            self.cache = None

    points = []
    for i in range(n):
        points.append(OldPoint(f"SYM{i % 500}", i, 100 + i, 10, "feed-a"))
    return points


def build_slotted(n: int) -> PriceCache:
    cache = PriceCache()
    for i in range(n):
        cache.add(f"SYM{i % 500}", i, 100 + i, 10, "feed-a")
    return cache


def build_columnar(n: int) -> ColumnarPriceCache:
    cache = ColumnarPriceCache()
    for i in range(n):
        cache.add(f"SYM{i % 500}", i, 100 + i, 10, "feed-a")
    return cache


def test_slots_and_interning_cut_memory_substantially() -> None:
    n = 50_000
    original = measure(build_original, n)
    slotted = measure(build_slotted, n)

    assert slotted < original * 0.5, (
        f"expected at least a 2x saving, got {original / slotted:.1f}x"
    )


def test_columnar_is_another_order_of_magnitude() -> None:
    n = 50_000
    slotted = measure(build_slotted, n)
    columnar = measure(build_columnar, n)

    assert columnar < slotted * 0.2


def test_slotted_instances_have_no_dict() -> None:
    point = PricePoint("A", 1, 100, 10, "feed-a")

    assert not hasattr(point, "__dict__")
    with pytest.raises(AttributeError):
        point.extra = 1                     # slots stop attribute sprawl too


def test_symbols_are_shared_not_copied() -> None:
    """500 distinct strings, not 10 million. Identity, not equality --
    equality would pass even with a copy per point."""
    cache = build_slotted(5_000)

    symbols = {id(p.symbol) for p in cache._points}
    assert len(symbols) == 500


def test_the_cycle_is_gone() -> None:
    """The original made every point reference the cache and the cache
    reference every point -- unreclaimable by refcounting, and a gen-2
    burden for the life of the process."""
    cache = build_slotted(100)
    point = cache._points[0]

    assert not hasattr(point, "cache")

    # Dropping the cache frees everything by refcount alone: gc.collect()
    # finds nothing to do.
    import weakref
    ref = weakref.ref(cache)
    del cache, point
    assert gc.collect() == 0                # no cyclic garbage
    assert ref() is None


def test_by_symbol_shares_objects_rather_than_copying() -> None:
    cache = build_slotted(1_000)
    first = cache._points[0]

    assert cache._by_symbol[first.symbol][0] is first    # identity`,
        notes: [
          { t: "p", text: "**`sys.getsizeof` would have hidden the whole problem.** It reports 48 bytes for the original point and says nothing about the 296-byte instance dictionary attached to it — so the naive measurement suggests 480 MB where the reality is roughly 4 GB. `tracemalloc` measures allocation and is the only number worth asserting on." },
          { t: "p", text: "**The cycle's real cost is the collector, not the leak.** It is eventually reclaimable, so it is not a leak in the strict sense — but ten million objects in generation 2 means every gen-2 pass walks all of them to prove they are still reachable, which shows up as periodic latency spikes with no obvious cause." },
          { t: "p", text: "**Interning the repeated strings is the largest single win after `__slots__`**, because ten million points across 500 symbols were storing ten million copies of about 500 distinct strings. An explicit pool is preferable to `sys.intern` here: interned strings live for the life of the process, which is wrong for values derived from user data." },
          { t: "callout", kind: "insight", title: "The identity assertion is the one that matters", body: [
            { t: "p", text: "`{id(p.symbol) for p in points}` having 500 entries proves the strings are shared. An equality-based test — `p.symbol == \"SYM1\"` — passes just as happily when every point holds its own copy, which is exactly the bug." },
            { t: "p", text: "The same reasoning applies to `_by_symbol`: asserting `is` rather than `==` proves the second index holds references rather than duplicating ten million records." }
          ]},
          { t: "p", text: "**Storing pence as an `int` removes both a memory cost and a correctness problem.** A `float` is 24 bytes and cannot represent decimal money exactly; a `Decimal` is correct and considerably larger. Integer minor units are the standard answer for both (Lesson 2.6)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service's memory climbs steadily over a day, from 400 MB to 3 GB, and is then OOM-killed. Restarting fixes it for another day. The team assumes a leak and spends a week looking for one." },
      { t: "p", text: "**There was no leak.** Every object was reachable and would have been freed on demand. The service held a `dict` mapping request ids to response objects for a \"recent requests\" debugging endpoint, with no bound — so it grew for as long as the process ran." },
      { t: "p", text: "**Unbounded growth of reachable objects is not a leak, and no memory tool will call it one.** `gc.collect()` frees nothing, `tracemalloc` shows the allocations are legitimate, and the objects have every right to be there. The bug is a missing limit, not a missing free." },
      { t: "p", text: "**`deque(maxlen=1000)` fixed it in one line** (Lesson 5.9). The transferable question is not \"where is the leak\" but **\"what holds this, and what bounds it\"** — a cache with no eviction, a list that only appends, a registry keyed by something unbounded. Ask that first; it is right far more often than a genuine cycle or a C-extension leak." }
    ]}
  ],

  takeaways: [
    "**CPython frees an object the moment its refcount hits zero**, so cleanup is deterministic — and that is an implementation detail, not a language guarantee.",
    "**`sys.getrefcount` reports one more than you expect**, because passing the object creates a reference.",
    "**The cyclic collector exists only for reference cycles**, which refcounting can never free — parent/child links, doubly-linked structures, an object holding a callback that closes over it.",
    "**Collection is generational**: gen 0 often, gen 2 rarely and expensively. Only container types are tracked, since an `int` cannot participate in a cycle.",
    "**A large long-lived structure is a gen-2 burden**: every gen-2 pass walks it to prove it is still reachable, which appears as periodic latency spikes.",
    "**`gc.freeze()` after imports and before forking** stops the collector dirtying copy-on-write pages shared with workers — the one tuning with a clear win.",
    "**`gc.disable()` is a leak with extra steps** in any long-running process.",
    "**`weakref` holds a reference without extending a lifetime** — `WeakValueDictionary` is the correct structure for a cache that must not keep its values alive.",
    "**`__slots__` removes `__weakref__` unless you list it**, and removes `__dict__`, which is what breaks `cached_property`.",
    "**`sys.getsizeof` is shallow** — it ignores the instance dictionary and the referenced values. Use `tracemalloc` to measure what was actually allocated.",
    "**RSS often does not fall after freeing** because CPython returns a 256 KB arena only when every object in it is freed. A plateau is fragmentation; unbounded growth is the real signal.",
    "**Most \"leaks\" are unbounded growth of reachable objects** — an unevicted cache, a list that only appends. Ask what holds it and what bounds it before hunting for cycles."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does CPython need a cyclic garbage collector at all?",
        options: [
          "To free objects faster than reference counting can",
          "Because two objects referring to each other each keep a count of one, so refcounting can never free them even when nothing else points at either",
          "To compact memory and reduce fragmentation",
          "To handle objects allocated by C extensions"
        ],
        answer: 1,
        why: "Reference counting frees an object the instant its count reaches zero, which covers nearly everything and gives deterministic cleanup. It cannot handle a cycle: a parent referencing a child that references the parent keeps both counts at one forever. The collector finds such groups by checking whether an object's references are all internal to the group. It does not compact memory."
      },
      {
        stem: "A service's RSS rises to 2 GB during a batch job and stays there afterwards, though the objects were freed. Is this a leak?",
        options: [
          "Yes — freed objects must return memory to the OS",
          "No — CPython returns a 256 KB arena only when every object in it is freed, so scattered survivors keep arenas resident",
          "Yes — it indicates a reference cycle the collector missed",
          "No — RSS always includes shared library pages"
        ],
        answer: 1,
        why: "Small objects come from arenas managed by CPython's own allocator, and fragmentation after a large batch leaves survivors scattered across many of them. The memory is reusable by Python and not returnable to the OS. The distinction that matters is whether RSS grows *without bound* across cycles — that is a leak — or rises to a plateau, which is normal. Avoid the spike by streaming or batching rather than chasing a release."
      },
      {
        stem: "Why does `weakref.ref(instance)` fail on a class with `__slots__ = (\"x\",)`?",
        options: [
          "Slotted classes cannot be referenced at all",
          "`__slots__` removes the `__weakref__` slot unless it is listed explicitly",
          "Weak references require a `__dict__`",
          "The class must inherit from `object` explicitly"
        ],
        answer: 1,
        why: "Weak-reference support needs a slot in the object's layout, which a normal class gets automatically and a slotted one does not. Adding `\"__weakref__\"` to `__slots__` restores it. This bites people combining a memory optimisation with a weakref-based cache — and it is the same category of surprise as `cached_property` failing because `__slots__` removed the instance dictionary."
      },
      {
        stem: "Memory grows steadily all day, `gc.collect()` frees nothing, and `tracemalloc` shows only legitimate allocations. What is the most likely cause?",
        options: [
          "A reference cycle involving `__del__`",
          "Unbounded growth of reachable objects — a cache with no eviction, or a list that only appends",
          "Arena fragmentation",
          "A leak inside a C extension"
        ],
        answer: 1,
        why: "If everything is reachable, no tool will call it a leak, because it is not one — the objects have every right to be there. The bug is a missing limit rather than a missing free: a debugging endpoint keeping recent responses, a registry keyed by request id, a memo dict that never evicts. Ask what holds the objects and what bounds it; `deque(maxlen=n)` or an LRU is usually the one-line fix."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How does memory management work in CPython?",
        strong: "Primarily reference counting — an object is freed the instant its count hits zero, so cleanup is deterministic. A generational cyclic collector handles the one case refcounting cannot: reference cycles.",
        answer: [
          { t: "p", text: "The trade-offs make it more than a recitation: deterministic cleanup and no long pauses, paid for with per-operation counting cost and, historically, the GIL." },
          { t: "p", text: "Being clear that this is an implementation detail rather than a language guarantee is what justifies using `with` instead of relying on `__del__` — PyPy will free that file much later." },
          { t: "p", text: "The generational point that only container types are tracked shows the model is understood: an `int` cannot participate in a cycle, so the collector ignores it." }
        ]
      },
      {
        level: "advanced",
        q: "A Python service's memory grows all day and never comes down. How do you investigate?",
        strong: "First distinguish a leak from a plateau: does RSS grow without bound across cycles, or rise once and stay? Then `tracemalloc` snapshots compared across time, which attributes allocations to lines.",
        answer: [
          { t: "p", text: "Leading with \"unbounded growth of reachable objects\" rather than \"a leak\" is the experienced answer — an unevicted cache is far more common than a cycle or a C-extension bug, and no memory tool flags it." },
          { t: "p", text: "The arena explanation covers the plateau case and stops a week being spent on something that is not a defect." },
          { t: "p", text: "Naming the practical fixes — bounded structures, streaming instead of materialising, worker recycling after N requests — turns the diagnosis into a plan." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use `weakref`?",
        strong: "When you need to reference an object without keeping it alive — a cache that must not extend lifetimes, an observer registry, or a back-reference that would otherwise create a cycle.",
        answer: [
          { t: "p", text: "`WeakValueDictionary` for a cache and `WeakKeyDictionary` for per-object metadata are the two concrete forms worth naming, and both come up in real designs." },
          { t: "p", text: "The limitations show first-hand use: `list`, `dict`, `int` and `str` cannot be weakly referenced, and `__slots__` removes `__weakref__` unless it is listed." },
          { t: "p", text: "The stronger position, where it applies, is that storing per-instance data on the instance beats any weak-keyed dictionary — no bookkeeping, and it dies with the object (Lesson 8.5)." }
        ]
      }
    ]
  }
});
