/* ============================================================================
   LESSON 8.9 — Diagnosing a Memory Leak
   ========================================================================= */
EC.receiveLesson({
  id: "8.9",

  lede: "A worked investigation, in the order you would actually run it. The most important step is the first one, and it is the one people skip: **decide whether this is a leak at all.** Most \"memory leaks\" in Python are unbounded growth of perfectly reachable objects, and every tool will report them as legitimate allocations because that is exactly what they are.",

  objectives: [
    "Distinguish a leak from fragmentation and from unbounded growth",
    "Attribute allocations to source lines with `tracemalloc` snapshots",
    "Find what is holding an object alive using referrer chains",
    "Recognise the six causes that account for most Python leaks",
    "Verify a fix in a way that would catch a regression"
  ],

  prerequisites: ["8.8", "6.6"],

  blocks: [

    { t: "h2", n: "01", text: "The symptom", id: "symptom" },

    { t: "code", lang: "python", title: "what the graph looks like", code: `
# Container RSS, one pod, over 36 hours
#
#  3.5G |                                        ,-x  OOMKilled
#       |                                    ,--'
#  2.5G |                              ,----'
#       |                        ,----'
#  1.5G |                  ,----'
#       |            ,----'
#  0.5G |x----------'
#       +--------------------------------------------
#        deploy    6h      12h      18h      24h    30h
#
# Restarts reset it. Traffic is flat. No deploy in between.
`,
      caption: "**Linear growth under flat traffic is the shape that means \"something is accumulating per request\".** A step change points at a deploy; a sawtooth that plateaus is fragmentation; growth that tracks traffic may simply be a cache doing its job."
    },

    { t: "table",
      head: ["Shape", "Usually", "First check"],
      rows: [
        ["Linear growth, flat traffic", "Accumulation per request or per loop iteration", "Module-level containers, caches, registries"],
        ["Rises then plateaus", "**Fragmentation, not a leak** — arenas held by scattered survivors", "Was there a large batch or a traffic spike?"],
        ["Steps up at a deploy", "A change introduced it", "The diff, and `git bisect` (Lesson 6.6)"],
        ["Grows with traffic, falls when quiet", "A cache or a queue behaving normally", "Is it bounded? What is the eviction policy?"],
        ["Sudden jump, then stable", "One large allocation retained", "A file read whole, a query with no `LIMIT`"]
      ],
      caption: "**Half the investigations end here.** Reading the shape correctly saves days, and the plateau case is not a defect at all (Lesson 8.8)."
    },

    { t: "h2", n: "02", text: "Confirm it is unbounded", id: "confirm" },

    { t: "code", lang: "python", title: "the cheapest possible test", code: `
import gc
import os

import psutil


def rss_mb() -> float:
    return psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024


def probe(work, cycles: int = 5, per_cycle: int = 1000) -> list[float]:
    """Run the same work repeatedly and record RSS after each cycle.

    A leak keeps climbing. Fragmentation climbs once and flattens.
    Running gc.collect() first removes cyclic garbage from the picture,
    so what remains is genuinely held.
    """
    readings = []
    for _ in range(cycles):
        for _ in range(per_cycle):
            work()
        gc.collect()
        readings.append(rss_mb())
    return readings


print(probe(handle_one_request))
`,
      out: `[142.3, 198.7, 254.9, 311.2, 367.5]      # +56 MB per cycle -> a leak
[142.3, 198.7, 201.1, 201.4, 201.6]      # flattens -> fragmentation`,
      caption: "**Five cycles and a `gc.collect()` between them settles the question in a minute.** Do this before reaching for any specialised tool — it also gives you the reproduction that every later step depends on."
    },

    { t: "h2", n: "03", text: "Attribute the allocations", id: "tracemalloc" },

    { t: "code", lang: "python", title: "tracemalloc: which lines are growing", code: `
import tracemalloc

tracemalloc.start(25)                 # 25 frames of traceback per allocation

# Warm up, so one-off startup allocations are not in the diff
for _ in range(100):
    handle_one_request()

before = tracemalloc.take_snapshot()

for _ in range(5000):
    handle_one_request()

gc.collect()
after = tracemalloc.take_snapshot()

for stat in after.compare_to(before, "lineno")[:10]:
    print(stat)
`,
      out: `app/cache.py:47: size=241 MiB (+241 MiB), count=1250000 (+1250000), average=202 B
app/models.py:88: size=38.1 MiB (+38.1 MiB), count=250000 (+250000), average=160 B
app/handlers.py:23: size=4.2 MiB (+4.2 MiB), count=5000 (+5000), average=880 B
...`,
      hl: [2, 6, 7, 18],
      caption: "**The warm-up matters.** Without it, the diff is dominated by imports, connection pools and lazily-initialised singletons — all legitimate one-off allocations that will never appear again."
    },

    { t: "callout", kind: "insight", title: "Reading the output correctly", body: [
      { t: "ul", items: [
        "**`count` is often more informative than `size`.** 1.25 million objects from one line is a smoking gun; 241 MB might be one legitimate buffer.",
        "**The line is where the object was *allocated*, not where it is *retained*.** `cache.py:47` might be a constructor called from everywhere — that is the next step's job to resolve.",
        "**Use `\"traceback\"` instead of `\"lineno\"`** to group by the full call path when a constructor is shared: `after.compare_to(before, \"traceback\")`.",
        "**`tracemalloc` roughly doubles allocation cost**, so measure in a canary or a load test rather than under production traffic."
      ]},
      { t: "code", lang: "python", title: "seeing the full path to an allocation", numbered: false, code: `
top = after.compare_to(before, "traceback")[0]
print("\\n".join(top.traceback.format()))`}
    ]},

    { t: "h2", n: "04", text: "Find what holds it", id: "referrers" },

    { t: "viz",
      title: "Allocation site versus retention path",
      caption: "`tracemalloc` tells you where an object was created. The bug is almost always in what still points at it. Walking referrers backwards from a sample object to a module-level root is what turns a suspicion into a diagnosis.",
      svg: `<svg viewBox="0 0 900 270" role="img" aria-label="Diagram showing a leaked object traced backwards through referrers to a module-level dictionary">
  <defs>
    <marker id="rf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--crit)"/>
    </marker>
  </defs>

  <rect x="640" y="40" width="240" height="66" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="760" y="66" text-anchor="middle" class="s-mono" style="font-size:10px">Response object</text>
  <text x="760" y="88" text-anchor="middle" class="s-sub">allocated at cache.py:47</text>

  <line x1="636" y1="73" x2="556" y2="73" style="stroke:var(--crit)" stroke-width="1.5" marker-end="url(#rf)"/>
  <text x="596" y="62" text-anchor="middle" class="s-mono" style="font-size:9px">referrer</text>

  <rect x="316" y="40" width="240" height="66" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="436" y="66" text-anchor="middle" class="s-mono" style="font-size:10px">list</text>
  <text x="436" y="88" text-anchor="middle" class="s-sub">a value inside a dict</text>

  <line x1="312" y1="73" x2="232" y2="73" style="stroke:var(--crit)" stroke-width="1.5" marker-end="url(#rf)"/>
  <text x="272" y="62" text-anchor="middle" class="s-mono" style="font-size:9px">referrer</text>

  <rect x="14" y="40" width="200" height="66" rx="9" style="fill:none;stroke:var(--crit)" stroke-width="1.5"/>
  <text x="114" y="66" text-anchor="middle" class="s-mono" style="font-size:10px">_RECENT = {}</text>
  <text x="114" y="88" text-anchor="middle" class="s-sub" style="fill:var(--crit)">module level — THE ROOT</text>

  <line x1="14" y1="140" x2="886" y2="140" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="170" class="s-sub">tracemalloc answers: WHERE was it allocated  →  cache.py:47</text>
  <text x="14" y="198" class="s-sub" style="fill:var(--crit)">referrers answer: WHY is it still alive  →  a module-level dict with no bound</text>
  <text x="14" y="234" class="s-sub">The second question is the one that names the bug. The first only narrows the search.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "walking backwards", code: `
import gc


def count_by_type(top: int = 10) -> list[tuple[str, int]]:
    """A poor person's objgraph -- no dependency required."""
    from collections import Counter
    counts = Counter(type(o).__name__ for o in gc.get_objects())
    return counts.most_common(top)


def find_root(obj, depth: int = 5) -> None:
    """Walk referrers up to a module namespace."""
    seen = {id(obj)}
    frontier = [(obj, [])]

    for _ in range(depth):
        next_frontier = []
        for current, path in frontier:
            for referrer in gc.get_referrers(current):
                if id(referrer) in seen:
                    continue
                seen.add(id(referrer))

                # A module's namespace: this is a root
                if isinstance(referrer, dict) and "__name__" in referrer:
                    print(f"MODULE {referrer['__name__']} <- {' <- '.join(path)}")
                    continue

                next_frontier.append(
                    (referrer, path + [type(referrer).__name__])
                )
        frontier = next_frontier
`,
      out: `>>> count_by_type()
[('dict', 1250043), ('Response', 1250000), ('list', 500), ('function', 8231), ...]

>>> find_root(sample_response)
MODULE app.cache <- dict <- list`,
      caption: "**`gc.get_referrers` is deliberately awkward** — it returns your own frame among the results, and holding the objects it returns can itself keep things alive. Use it interactively or in a diagnostic endpoint, not in a hot path."
    },

    { t: "callout", kind: "note", title: "The tools worth installing before you need them", body: [
      { t: "table",
        head: ["Tool", "Gives", "When"],
        rows: [
          ["`tracemalloc`", "Allocations attributed to lines. **Standard library**", "Always the first specialised step"],
          ["`objgraph`", "Type counts over time, and a rendered backref graph", "When the referrer chain is more than two hops"],
          ["`memray`", "A full allocation profile including C extensions, with a flame graph", "When `tracemalloc` shows nothing — the allocation is not in Python"],
          ["`py-spy dump --pid`", "Live stacks without stopping the process", "The process is stuck, not leaking (Lesson 6.6)"],
          ["`pympler`", "Deep object sizes and summaries", "Quantifying a structure's true cost"]
        ]
      },
      { t: "p", text: "**`objgraph.show_backrefs([obj], max_depth=5)` renders the retention path as a picture**, which is worth the dependency when the chain runs through several containers. `objgraph.growth()` between two points is the fastest \"what type is multiplying\" check there is." }
    ]},

    { t: "h2", n: "05", text: "The six usual suspects", id: "suspects" },

    { t: "table",
      head: ["Cause", "Signature", "Fix"],
      rows: [
        ["**An unbounded cache or registry**", "One dict or list grows with request count", "A bound — `lru_cache(maxsize=...)`, `deque(maxlen=...)`, an eviction policy"],
        ["**`lru_cache` on a method**", "Instances pinned; memory plateaus at `maxsize` instances", "`cached_property`, or a per-instance cache (Lesson 5.10)"],
        ["**A module-level mutable default**", "Growth across calls with no obvious owner", "`None` default, build inside the function (Lesson 3.2)"],
        ["**A `defaultdict` read with arbitrary keys**", "Entries appear for keys nobody set", "`.get()` for reads; convert to `dict` at the boundary (Lesson 5.9)"],
        ["**Retained exceptions or tracebacks**", "Frames and locals held long after the failure", "Do not store exception objects; log and discard"],
        ["**A closure or a descriptor keyed by instance**", "Objects never collected despite going out of scope", "`WeakKeyDictionary`, or store on the instance (Lesson 8.5)"]
      ],
      caption: "**Five of the six are \"something holds a reference that should not\", not a cycle.** Check these before considering a C-extension leak, which is genuinely rare and needs `memray` to see at all."
    },

    { t: "callout", kind: "trap", title: "Storing an exception keeps its whole stack alive", body: [
      { t: "code", lang: "python", title: "an expensive convenience", numbered: false, code: `
class Job:
    def run(self):
        try:
            self.result = do_work()
        except Exception as err:
            self.error = err          # keeps the TRACEBACK, hence every
                                      # frame, hence every local in them


# A failed job now retains the request body, the database rows it had
# loaded, and anything else that was on the stack at the moment of
# failure -- for as long as the Job object lives.`},
      { t: "p", text: "An exception references its traceback, which references every frame, which references every local variable in those frames. Storing one on a long-lived object retains an arbitrary slice of the heap." },
      { t: "p", text: "**Store what you need, not the exception**: the message, the type name, and a formatted traceback string. Python already does this for you inside an `except` block — the `as err` name is deleted at the end of the block precisely to avoid this (Lesson 6.2)." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Run the investigation",
      difficulty: "expert",
      minutes: 32,
      body: [
        { t: "p", text: "This service leaks. There are three separate causes, and one of the three is not a leak at all — it is a legitimate allocation that will mislead you if you skip the confirmation step." },
        { t: "code", lang: "python", title: "service.py", numbered: false, code: `
import functools
from datetime import datetime

_AUDIT = []

class ReportService:
    def __init__(self, db):
        self.db = db
        self.failures = []

    @functools.lru_cache(maxsize=512)
    def render(self, template: str, rows: int) -> str:
        return build_report(self.db, template, rows)

    def handle(self, request, cache={}):
        _AUDIT.append({"at": datetime.now(), "req": request})
        key = request.customer_id
        if key not in cache:
            cache[key] = self.db.load_profile(key)
        try:
            return self.render(request.template, request.rows)
        except Exception as err:
            self.failures.append(err)
            raise

def warm_up():
    global _TEMPLATES
    _TEMPLATES = load_all_templates()      # 180 MB, once, at startup`},
        { t: "p", text: "Write the diagnosis as you would present it: what you measured, what you concluded, and what you changed." }
      ],
      requirements: [
        "Identify the three memory issues and classify each as a leak or not.",
        "Show the measurement that distinguishes them, not just the reading of the code.",
        "Explain precisely why `lru_cache` on `render` retains more than 512 strings.",
        "Fix each genuine issue, preserving the caching behaviour that was intended.",
        "Explain what `self.failures.append(err)` actually retains.",
        "Write a regression test that fails on the original and passes on the fix."
      ],
      hint: "For the `lru_cache`, write out what the cache key actually contains. For `warm_up`, apply the plateau-versus-growth test rather than judging by size.",
      solution: {
        lang: "python",
        title: "diagnosis.md + service.py",
        code: `# =========================================================================
# THE DIAGNOSIS
# =========================================================================
#
# MEASURED FIRST, before reading the code carefully:
#
#   >>> probe(handle_one_request, cycles=5, per_cycle=1000)
#   [201.4, 262.8, 324.1, 385.6, 447.0]        +61 MB per cycle
#
# Linear, with gc.collect() between cycles, under identical work.
# That is accumulation, not fragmentation.
#
#   >>> tracemalloc, 5000 requests, warmed up first
#   service.py:6   size=  38 MiB (+38 MiB)  count=5000    _AUDIT.append
#   service.py:22  size= 210 MiB (+210 MiB) count=512     lru_cache
#   service.py:18  size=  12 MiB (+12 MiB)  count=850     cache[key]
#   (warm_up's 180 MB does NOT appear -- it happened before the snapshot)
#
#
# ISSUE 1 -- _AUDIT: an unbounded module-level list.  A LEAK.
#
#   _AUDIT.append({"at": ..., "req": request})
#
#   One entry per request, forever, each holding the whole request
#   object. Nothing ever reads it. This is the single most common
#   Python "leak" and it is not a leak in the GC sense at all --
#   every object is reachable and legitimately retained. No tool will
#   flag it, because there is nothing wrong except the missing bound.
#
#
# ISSUE 2 -- lru_cache on a METHOD.  A LEAK, and worse than it looks.
#
#   @functools.lru_cache(maxsize=512)
#   def render(self, template, rows):
#
#   The cache is created ONCE, when the class body executes, and is
#   shared by every instance. The key is (self, template, rows), so
#   each of the 512 entries holds a strong reference to a
#   ReportService -- which holds a db connection, a failures list, and
#   through that list a traceback per failure.
#
#   So "512 cached strings" is actually up to 512 pinned service
#   objects and everything they transitively reach. Memory climbs to a
#   plateau and never falls, which reads as normal warm-up (Lesson 5.10).
#
#
# ISSUE 3 -- cache={} : a mutable default argument.  A LEAK.
#
#   def handle(self, request, cache={}):
#
#   Evaluated once, at def time, and shared by every call on every
#   instance for the life of the process. It grows by one profile per
#   distinct customer, unbounded, and it is invisible -- there is no
#   attribute or module global to find (Lesson 3.2).
#
#
# ISSUE 4 -- self.failures.append(err).  A LEAK, and the expensive one.
#
#   An exception references its traceback, which references every frame,
#   which references every local in those frames. Appending one retains
#   the request body, any rows loaded, and whatever else was on the
#   stack -- for the life of the service object. Combined with issue 2,
#   which pins up to 512 service objects, this retains an arbitrary
#   slice of the heap indefinitely.
#
#
# NOT A LEAK -- warm_up's 180 MB
#
#   _TEMPLATES = load_all_templates()
#
#   Large, module-level, and allocated ONCE at startup. The probe
#   settles it: RSS after cycle 1 and cycle 5 differ by the leak rate,
#   not by 180 MB per cycle. It is a fixed cost to size the container
#   for, not a defect.
#
#   This is why the confirmation step comes first. Reading the code,
#   180 MB in a global looks like the obvious culprit and is the one
#   thing here that is working as intended.


# =========================================================================
# THE FIX
# =========================================================================

from __future__ import annotations

import functools
import logging
import traceback
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class FailureRecord:
    """What we actually need from a failure, with nothing that holds a
    traceback object -- so no frames, no locals, no retained heap."""

    at: datetime
    kind: str
    message: str
    formatted: str


class ReportService:
    def __init__(self, db) -> None:
        self.db = db

        # FIX 4: bounded, and holding strings rather than exceptions.
        self.failures: deque[FailureRecord] = deque(maxlen=100)

        # FIX 2: a PER-INSTANCE cache built in __init__. The closure
        # holds self, but the cache dies with the instance rather than
        # living on the class and pinning 512 of them.
        self._render = functools.lru_cache(maxsize=512)(self._render_uncached)

        # FIX 3: per-instance, and bounded. The mutable default is gone.
        self._profiles: functools.lru_cache = functools.lru_cache(maxsize=1024)(
            self.db.load_profile
        )

    def _render_uncached(self, template: str, rows: int) -> str:
        return build_report(self.db, template, rows)

    def render(self, template: str, rows: int) -> str:
        return self._render(template, rows)

    def handle(self, request) -> str:
        # FIX 1: bounded, and the audit trail goes somewhere that is
        # designed to hold it. An in-process list that nothing reads is
        # not an audit trail, it is a leak with good intentions.
        log.info("request handled", extra={
            "customer_id": request.customer_id,
            "template": request.template,
        })

        self._profiles(request.customer_id)

        try:
            return self.render(request.template, request.rows)
        except Exception as err:
            self.failures.append(FailureRecord(
                at=datetime.now(timezone.utc),
                kind=type(err).__name__,
                message=str(err)[:500],
                formatted="".join(
                    traceback.format_exception_only(type(err), err)
                ),
            ))
            raise


# =========================================================================
# REGRESSION TESTS
# =========================================================================

import gc
import weakref

import pytest


class FakeDB:
    def load_profile(self, key): return {"id": key}


def test_service_instances_are_collectable() -> None:
    """THE test for issue 2.

    With lru_cache on the method, the class-level cache holds self in
    every key, so a service that has rendered anything can never be
    collected. This fails on the original and passes on the fix.
    """
    service = ReportService(FakeDB())
    service.render("invoice", 10)

    ref = weakref.ref(service)
    del service
    gc.collect()

    assert ref() is None, "the service was pinned by a cache"


def test_two_services_do_not_share_a_cache() -> None:
    """The other half of issue 2: a class-level cache is shared, so one
    service could serve another's cached output."""
    a, b = ReportService(FakeDB()), ReportService(FakeDB())

    assert a._render is not b._render
    assert a._render.cache_info().currsize == 0


def test_handle_has_no_mutable_default() -> None:
    """Issue 3. A shared default is invisible -- there is no attribute
    to inspect -- so the test looks at the function object itself."""
    import inspect

    for param in inspect.signature(ReportService.handle).parameters.values():
        assert not isinstance(param.default, (dict, list, set)), (
            f"{param.name} has a mutable default shared across all calls"
        )


def test_failures_are_bounded_and_hold_no_traceback() -> None:
    """Issue 4. Storing exceptions retains their frames and every local
    in them -- an arbitrary slice of the heap per failure."""
    service = ReportService(FakeDB())

    class Big:
        pass

    for i in range(500):
        big = Big()                      # a local in the failing frame
        try:
            raise ValueError(f"failure {i}")
        except ValueError as err:
            service.failures.append(FailureRecord(
                at=datetime.now(timezone.utc),
                kind=type(err).__name__,
                message=str(err),
                formatted="",
            ))

    assert len(service.failures) == 100                   # bounded
    assert all(isinstance(f, FailureRecord) for f in service.failures)
    assert not any(hasattr(f, "__traceback__") for f in service.failures)


def test_memory_does_not_grow_across_cycles() -> None:
    """The end-to-end check, and the only one that would catch a NEW
    leak added later. Asserts on the trend, not on an absolute number,
    because absolute RSS varies with platform and allocator."""
    import tracemalloc

    service = ReportService(FakeDB())
    request = type("R", (), {"customer_id": "c-1", "template": "t", "rows": 1})()

    for _ in range(200):                 # warm up: fill caches
        service.handle(request)

    gc.collect()
    tracemalloc.start()
    baseline, _ = tracemalloc.get_traced_memory()

    for _ in range(2000):
        service.handle(request)

    gc.collect()
    current, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    growth_per_request = (current - baseline) / 2000
    assert growth_per_request < 100, (
        f"{growth_per_request:.0f} bytes retained per request"
    )`,
        notes: [
          { t: "p", text: "**The 180 MB global is the trap, and the measurement is what avoids it.** Reading the code, `load_all_templates()` in a module global is the biggest number on the page and looks obviously wrong. The probe shows RSS growing by 61 MB per *cycle* regardless — a one-off allocation cannot do that. Confirming the shape before reading the code is what stops a day being spent on the wrong thing." },
          { t: "p", text: "**`lru_cache` on a method retains far more than its cache size suggests.** The key includes `self`, so 512 entries pin up to 512 service objects, each holding a database connection and — because of issue 4 — a list of exceptions with their full tracebacks. One decorator line retains an arbitrary slice of the heap." },
          { t: "p", text: "**The weakref test is the only one that could have caught issue 2.** Asserting on `cache_info()` or on memory would pass on the broken version; asserting that a deleted service is actually collected is a direct statement of the property that was violated." },
          { t: "callout", kind: "insight", title: "An audit list nothing reads is not an audit trail", body: [
            { t: "p", text: "`_AUDIT` was added with good intentions and never wired to anything. In-process accumulation cannot survive a restart, cannot be queried, and cannot be searched — so it fails at the job it was created for while consuming memory for the life of the process." },
            { t: "p", text: "A log line with structured fields does the job properly: durable, queryable, aggregatable, and bounded by the log shipper rather than by RAM (Lesson 6.4)." }
          ]},
          { t: "p", text: "**The per-request growth assertion is the regression test worth keeping.** It asserts on a trend rather than an absolute figure — absolute RSS varies with platform, allocator and Python version — and it would catch a *new* leak introduced next year, which none of the targeted tests would." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An ML inference service leaks about 200 MB per hour. `tracemalloc` shows nothing — the Python-side allocations are flat and account for a small fraction of RSS. The team concludes the tooling is broken." },
      { t: "p", text: "**`tracemalloc` only sees allocations made through Python's allocator.** A C extension calling `malloc` directly is invisible to it, and the leak was in a native library: model handles created per request and released only when a Python wrapper was garbage collected, which was itself delayed by a reference cycle." },
      { t: "p", text: "**`memray` found it in twenty minutes**, because it hooks the allocator underneath and attributes native allocations to the Python stack that triggered them. The fix was an explicit `with` block around the model handle rather than relying on `__del__` (Lesson 5.8)." },
      { t: "p", text: "**The transferable rule: `tracemalloc` showing nothing is information, not a dead end.** It means the allocation is not Python-side — a C extension, a memory-mapped file, a thread stack, or the allocator's own fragmentation. Each has a different tool, and knowing which question the last tool answered is what points at the next one." }
    ]}
  ],

  takeaways: [
    "**Decide what kind of growth it is first.** Linear under flat traffic is accumulation; rises-then-plateaus is fragmentation and not a defect; a step at a deploy points at a diff.",
    "**Confirm with a cheap loop**: run the same work five times with `gc.collect()` between cycles and record RSS. A leak keeps climbing, fragmentation flattens.",
    "**Most Python \"leaks\" are unbounded growth of reachable objects** — an unevicted cache, a list that only appends. No tool flags them, because nothing is wrong except the missing bound.",
    "**Warm up before taking a `tracemalloc` baseline**, or the diff is dominated by imports and lazily-initialised singletons.",
    "**`count` is often more diagnostic than `size`** in `tracemalloc` output: a million objects from one line is a smoking gun.",
    "**`tracemalloc` tells you where an object was allocated, not what retains it.** The referrer chain is what names the bug.",
    "**`lru_cache` on a method pins instances**: the cache lives on the class and `self` is part of every key, so `maxsize` instances plus everything they reach are retained.",
    "**Storing an exception retains its traceback**, hence every frame and every local in them — an arbitrary slice of the heap per failure.",
    "**A mutable default argument is an invisible leak** — there is no attribute or global to inspect, only the function object's `__defaults__`.",
    "**Test for collectability with `weakref`**, not for memory size: asserting that a deleted object is actually collected states the property directly.",
    "**Keep a per-request growth assertion**, phrased as a trend rather than an absolute figure — it is the only test that catches a leak added later.",
    "**`tracemalloc` showing nothing is information**: the allocation is outside Python's allocator, which points at `memray`, a C extension, or fragmentation."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "RSS rises during a batch job and stays at the new level afterwards, across many jobs, without climbing further. What is this?",
        options: [
          "A slow leak that will eventually exhaust memory",
          "Fragmentation — arenas held by scattered surviving objects, which Python reuses but cannot return to the OS",
          "A reference cycle the collector cannot break",
          "A C-extension leak"
        ],
        answer: 1,
        why: "The distinguishing feature is that it plateaus rather than climbing across cycles. CPython returns a 256 KB arena only when every object in it is freed, so survivors scattered after a large batch keep arenas resident. The memory is reusable by Python. The response is to avoid the spike — stream or batch — not to hunt for a defect that is not there."
      },
      {
        stem: "Why does `@lru_cache(maxsize=512)` on a method retain far more than 512 cached values?",
        options: [
          "`maxsize` is only a hint and the cache can exceed it",
          "The cache lives on the class and `self` is part of every key, so up to 512 instances — and everything they reference — are pinned",
          "Method caches store both arguments and return values twice",
          "The decorator disables garbage collection for the class"
        ],
        answer: 1,
        why: "The decorator runs once when the class body executes, so all instances share one cache, and each entry holds a strong reference to the instance in its key. Those instances hold connections, buffers and anything else they reference. Memory climbs to a plateau and never falls, which reads as ordinary warm-up — use `cached_property`, or build a per-instance cache in `__init__`."
      },
      {
        stem: "You take a `tracemalloc` snapshot immediately at startup and another after 5,000 requests. Why is the diff misleading?",
        options: [
          "`tracemalloc` cannot compare snapshots from different times",
          "Without a warm-up, the diff includes imports, connection pools and lazily-initialised singletons — legitimate one-off allocations",
          "Snapshots must be taken with `gc` disabled",
          "The first snapshot is always empty"
        ],
        answer: 1,
        why: "One-off startup allocations dominate the comparison and hide the per-request accumulation you are looking for. Run a few hundred requests first so everything lazy has initialised, then take the baseline. Grouping by `\"traceback\"` rather than `\"lineno\"` also helps when a shared constructor is called from many places."
      },
      {
        stem: "`self.failures.append(err)` on a long-lived object. What does it actually retain?",
        options: [
          "Only the exception's message string",
          "The exception, its traceback, every frame in that traceback, and every local variable in those frames",
          "A weak reference, so nothing extra",
          "The exception class only"
        ],
        answer: 1,
        why: "An exception references `__traceback__`, which references each frame, which references its locals — so a failure retains the request body, any rows loaded, and whatever else was on the stack. Python deletes the `as err` name at the end of an `except` block for exactly this reason. Store the type name, the message and a formatted string instead."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "Walk me through diagnosing a memory leak in a Python service.",
        strong: "First establish it is a leak: run the same work in cycles with `gc.collect()` between and see whether RSS climbs or plateaus. Then `tracemalloc` snapshots — warmed up first — to attribute allocations to lines. Then referrers, to find what retains them.",
        answer: [
          { t: "p", text: "Leading with the confirmation step is the mark of someone who has done this: the plateau case is not a defect, and reading the growth shape correctly saves days." },
          { t: "p", text: "The distinction between where an object was allocated and what retains it is the conceptual core — `tracemalloc` answers the first question and the bug is nearly always the answer to the second." },
          { t: "p", text: "Naming the usual suspects — unbounded caches, `lru_cache` on methods, mutable defaults, stored exceptions — shows pattern recognition rather than a purely tool-driven approach." }
        ]
      },
      {
        level: "advanced",
        q: "What is the most common cause of memory growth in Python services?",
        strong: "Unbounded growth of perfectly reachable objects — a cache with no eviction, a list that only appends, a registry keyed by something unbounded. It is not a leak in the GC sense, which is why no tool reports it.",
        answer: [
          { t: "p", text: "The point that tools cannot help is what makes this worth saying: `gc.collect()` frees nothing and `tracemalloc` shows legitimate allocations, because they are legitimate." },
          { t: "p", text: "Reframing the question as \"what holds this, and what bounds it\" rather than \"where is the leak\" is the practical shift that finds it fastest." },
          { t: "p", text: "The one-line fixes — `deque(maxlen=n)`, `lru_cache(maxsize=n)`, an eviction policy — make the point that the bug is a missing limit, not a missing free." }
        ]
      },
      {
        level: "expert",
        q: "`tracemalloc` shows flat Python memory but RSS keeps growing. What now?",
        strong: "That is information: the allocation is outside Python's allocator. A C extension calling `malloc` directly, a memory-mapped file, thread stacks, or allocator fragmentation. `memray` hooks underneath and attributes native allocations to the Python stack.",
        answer: [
          { t: "p", text: "Treating a negative result as a signal rather than a dead end is the reasoning being tested — each tool answers one question, and knowing which question was answered points at the next tool." },
          { t: "p", text: "The concrete mechanism helps: native handles released only when a Python wrapper is collected, with collection delayed by a cycle, is a common shape in ML and database extensions." },
          { t: "p", text: "The fix generalises usefully — an explicit `with` block rather than relying on `__del__`, since deterministic cleanup should never depend on when the collector runs." }
        ]
      }
    ]
  }
});
