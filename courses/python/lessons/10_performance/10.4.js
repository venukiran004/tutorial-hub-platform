/* ============================================================================
   LESSON 10.4 — Caching and functools.lru_cache
   ========================================================================= */
EC.receiveLesson({
  id: "10.4",

  lede: "A cache trades memory and correctness for speed. The speed is obvious, which is why caches get added; the other two are paid later, which is why they get added badly. **The hard part was never memoisation** — it is deciding what the key is, when the value stops being true, and what happens when the cache is wrong.",

  objectives: [
    "Choose between `cache`, `lru_cache` and `cached_property` with a reason",
    "Design a cache key that cannot collide or leak between users",
    "Pick an invalidation strategy, including deciding not to invalidate",
    "Recognise the caches that become memory leaks and the ones that become bugs",
    "Measure hit rate rather than assuming a cache is helping"
  ],

  prerequisites: ["5.10", "10.2"],

  blocks: [

    { t: "h2", n: "01", text: "The three built-in caches", id: "builtins" },

    {"kind": "flow", "title": "lru_cache in front of a function", "caption": "The decorator keeps a dict from arguments to results. A hit returns without calling the function; a miss calls it and stores the result; at maxsize the least recently used entry is evicted. Arguments must be hashable.", "cols": 4, "nodes": [{"id": "call", "label": "f(3, 'x')"}, {"id": "key", "label": "key = (3, 'x')", "sub": "args must hash", "tone": "accent"}, {"id": "hit", "label": "hit → return stored", "sub": "O(1)", "tone": "good"}, {"id": "miss", "label": "miss → call f, store", "sub": "evict LRU at maxsize", "tone": "warn"}], "edges": [["call", "key"], ["key", "hit"], ["key", "miss"]], "t": "diagram", "id": "dg-10_4-01-0"},


    { t: "table",
      head: ["", "`@cache`", "`@lru_cache(maxsize=n)`", "`@cached_property`"],
      rows: [
        ["Bounded", "**No** — grows forever", "Yes, evicts least-recently-used", "One value per instance"],
        ["Scope", "The function, process-wide", "The function, process-wide", "The instance"],
        ["Freed when", "Never, short of `cache_clear()`", "On eviction", "With the instance"],
        ["Arguments", "Any hashable", "Any hashable", "None — `self` only"],
        ["Safe for", "A small fixed key space", "**The default choice**", "A derived value on an object"],
        ["Introspection", "`cache_info()`, `cache_clear()`", "Same", "Delete the attribute to reset"]
      ],
      caption: "**`lru_cache(maxsize=...)` is the right default.** `@cache` is `lru_cache(maxsize=None)` — genuinely unbounded — and is only safe when you can name the complete set of keys in advance."
    },

    { t: "code", lang: "python", title: "the three, in place", code: `
import functools


# Bounded, process-wide. Cleared and inspected at will.
@functools.lru_cache(maxsize=1024)
def geocode(postcode: str) -> tuple[float, float]:
    return _geocoding_api(postcode)


# Unbounded — but the key space is 5 template names, and they are fixed
# at deploy time. This one is safe.
@functools.cache
def load_template(name: str) -> Template:
    return Template((TEMPLATES / f"{name}.html").read_text(encoding="utf-8"))


class Report:
    @functools.cached_property
    def totals(self) -> dict[str, Decimal]:
        """Computed once per Report, freed with the Report."""
        return self._compute_totals()


print(geocode.cache_info())
geocode.cache_clear()
del report.totals            # recompute on next access
`,
      out: `CacheInfo(hits=8412, misses=97, maxsize=1024, currsize=97)`,
      caption: "**`cache_info()` is the thing to look at before believing a cache helps.** 8,412 hits against 97 misses is a cache earning its place; 97 hits against 8,412 misses is pure overhead plus a memory cost."
    },

    { t: "callout", kind: "trap", title: "The three caches that become memory leaks", body: [
      { t: "code", lang: "python", title: "each of these has shipped", numbered: false, code: `
# 1. Unbounded, keyed on user input
@functools.cache
def parse_query(q: str) -> AST: ...
#    Every distinct search string ever submitted, retained for the life
#    of the process. Bounded only by the creativity of your users.

# 2. lru_cache on a METHOD
class Client:
    @functools.lru_cache(maxsize=128)
    def fetch(self, key: str) -> bytes: ...
#    The cache lives on the CLASS and self is part of every key, so up
#    to 128 Clients — with their connections and buffers — are pinned
#    forever (Lesson 5.10).

# 3. A module-level dict nobody evicts from
_CACHE: dict[str, Response] = {}
def get(url):
    if url not in _CACHE:
        _CACHE[url] = fetch(url)
    return _CACHE[url]
#    The same as (1), written out longhand so it does not look like a
#    cache in review.`},
      { t: "p", text: "**The common shape: a key space set by something you do not control.** A cache keyed on a postcode is bounded by the number of postcodes; one keyed on a search query is bounded by nothing." },
      { t: "p", text: "**The tell in production is memory rising to a plateau and never falling.** Bounded growth reads as warm-up, which is why the method-cache version survives review for months (Lesson 8.9)." }
    ]},

    { t: "h2", n: "02", text: "Keys", id: "keys" },

    { t: "viz",
      title: "What belongs in a cache key",
      caption: "A key must include everything the value depends on. Anything omitted is a collision waiting for two callers to disagree — and when the omitted thing is the user, the collision is a data leak rather than a wrong number.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram showing a cache key that omits the tenant identifier causing one tenant to receive another tenant's data">
  <rect x="14" y="30" width="418" height="240" rx="12" style="fill:none;stroke:var(--crit)" stroke-width="1.5"/>
  <text x="34" y="56" class="s-label" style="fill:var(--crit)">KEY OMITS THE TENANT</text>
  <text x="34" y="82" class="s-mono" style="font-size:10px">key = f"report:{month}"</text>

  <rect x="34" y="104" width="176" height="44" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="122" y="122" text-anchor="middle" class="s-mono" style="font-size:10px">tenant A</text>
  <text x="122" y="139" text-anchor="middle" class="s-sub">asks for 2026-06</text>

  <rect x="236" y="104" width="176" height="44" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="324" y="122" text-anchor="middle" class="s-mono" style="font-size:10px">tenant B</text>
  <text x="324" y="139" text-anchor="middle" class="s-sub">asks for 2026-06</text>

  <rect x="34" y="168" width="378" height="42" rx="7" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.3"/>
  <text x="223" y="194" text-anchor="middle" class="s-mono" style="font-size:10px">one entry: "report:2026-06"</text>

  <text x="34" y="238" class="s-sub" style="fill:var(--crit)">B receives A's revenue figures. Not a stale</text>
  <text x="34" y="258" class="s-sub" style="fill:var(--crit)">value — another customer's data.</text>

  <rect x="468" y="30" width="418" height="240" rx="12" style="fill:none;stroke:var(--good)" stroke-width="1.5"/>
  <text x="488" y="56" class="s-label" style="fill:var(--good)">KEY IS COMPLETE</text>
  <text x="488" y="82" class="s-mono" style="font-size:10px">key = f"report:{tenant}:{month}:v3"</text>

  <rect x="488" y="104" width="176" height="44" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="576" y="122" text-anchor="middle" class="s-mono" style="font-size:10px">tenant A</text>
  <text x="576" y="139" text-anchor="middle" class="s-sub">report:A:2026-06:v3</text>

  <rect x="690" y="104" width="176" height="44" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="778" y="122" text-anchor="middle" class="s-mono" style="font-size:10px">tenant B</text>
  <text x="778" y="139" text-anchor="middle" class="s-sub">report:B:2026-06:v3</text>

  <text x="488" y="182" class="s-sub">tenant  — who is asking</text>
  <text x="488" y="204" class="s-sub">month   — what they asked for</text>
  <text x="488" y="226" class="s-sub">v3      — the shape of the value, so a</text>
  <text x="488" y="246" class="s-sub">            deploy that changes it misses cleanly</text>
</svg>`
    },

    { t: "callout", kind: "insight", title: "The version suffix is how you invalidate on deploy", body: [
      { t: "p", text: "When a code change alters what a cached value *means* — a new field, a corrected calculation — every existing entry is wrong. Flushing the cache works and drops the hit rate to zero at the worst moment. A version in the key makes the old entries unreachable and lets them expire naturally, so the new shape warms while the old one drains." },
      { t: "code", lang: "python", title: "in practice", numbered: false, code: `
# Bump when the SHAPE or MEANING of the value changes.
REPORT_SCHEMA = "v3"

def cache_key(tenant: str, month: str) -> str:
    return f"report:{REPORT_SCHEMA}:{tenant}:{month}"`},
      { t: "p", text: "**Put the version early in the key.** Most caches let you scan or delete by prefix, so `report:v2:*` is one command to reclaim the space once nothing reads it." }
    ]},

    { t: "callout", kind: "warn", title: "Hashable is not the same as a good key", body: [
      { t: "ul", items: [
        "**`lru_cache` requires hashable arguments**, so a function taking a `dict` or a list cannot be cached without converting first — usually to a `tuple` of sorted items.",
        "**`f(1)` and `f(1.0)` share an entry**, because `1 == 1.0` and their hashes match. So do `f(True)` and `f(1)`.",
        "**Keyword and positional calls key differently.** `f(1)` and `f(x=1)` are two entries for the same call, which halves the hit rate silently.",
        "**A mutable default or a captured global is invisible to the key.** If the result depends on it, the cache returns a stale value and nothing indicates why."
      ]},
      { t: "code", lang: "python", title: "the invisible dependency", numbered: false, code: `
RATE = Decimal("0.20")

@functools.lru_cache(maxsize=256)
def price_with_tax(amount: Decimal) -> Decimal:
    return amount * (1 + RATE)          # RATE is NOT in the key

RATE = Decimal("0.25")                  # every cached value is now wrong`},
      { t: "p", text: "**Everything the result depends on must be an argument, or the cache is lying.** That is the same discipline as a pure function, and it is why caching is easy on pure functions and treacherous elsewhere (Lesson 9.6)." }
    ]},

    { t: "h2", n: "03", text: "Invalidation", id: "invalidation" },

    {"kind": "steps", "title": "Invalidation, or a cache is a bug with a delay", "caption": "Every cached value is a claim that the underlying data has not changed. Something has to make that true: an explicit clear on write, a TTL, or a key that changes with the data.", "items": [{"label": "invalidate on write", "desc": "f.cache_clear() or delete the key when the source changes", "tone": "good"}, {"label": "time to live", "desc": "accept staleness for a bounded time — TTLCache, Redis EX", "tone": "accent"}, {"label": "versioned key", "desc": "put the data's version or hash in the key; old entries age out", "tone": "warn"}, {"label": "never cache what changes under you", "desc": "lru_cache on a method reading self.state is a classic trap", "tone": "crit"}], "t": "diagram", "id": "dg-10_4-03-1"},

    { t: "ladder",
      title: "Keeping a cached customer profile correct",
      rungs: [
        { level: "bad", label: "Cache forever, hope for the best",
          why: "Works until the first update. Then a customer changes their address, sees the old one, and support cannot reproduce it because their own request went to a different worker with a colder cache.",
          code: `@functools.cache
def get_profile(customer_id: str) -> Profile:
    return db.load_profile(customer_id)` },
        { level: "ok", label: "A TTL",
          why: "Bounds the staleness to something you can state, and needs no coordination with the writer. The cost is that it is always either too long — users see stale data — or too short, and the hit rate collapses.",
          code: `from cachetools import TTLCache

_profiles = TTLCache(maxsize=10_000, ttl=300)     # 5 minutes


def get_profile(customer_id: str) -> Profile:
    try:
        return _profiles[customer_id]
    except KeyError:
        profile = _profiles[customer_id] = db.load_profile(customer_id)
        return profile` },
        { level: "best", label: "Invalidate on write, with a TTL as the backstop",
          why: "The writer knows exactly when a value stops being true, so it says so. The TTL stops a missed invalidation being permanent — because eventually one will be missed, from a migration, an admin tool, or a path nobody remembered.",
          code: `def get_profile(customer_id: str) -> Profile:
    key = f"profile:v2:{customer_id}"
    cached = redis.get(key)
    if cached is not None:
        return Profile.model_validate_json(cached)

    profile = db.load_profile(customer_id)
    # The TTL is the backstop, not the strategy: hours, not minutes.
    redis.setex(key, 3600, profile.model_dump_json())
    return profile


def update_profile(customer_id: str, **changes) -> None:
    db.update_profile(customer_id, **changes)
    # After the write commits. Before it, and a concurrent read
    # re-populates the cache with the old value.
    redis.delete(f"profile:v2:{customer_id}")`,
          note: "**Order matters and is easy to get backwards.** Invalidate *after* the write commits — otherwise a read between the delete and the commit caches the pre-write value, and the cache is now wrong with no TTL short enough to matter." }
      ]
    },

    { t: "table",
      head: ["Strategy", "Staleness", "Needs", "Fits"],
      rows: [
        ["Never invalidate", "Unbounded", "Immutable values", "Templates, parsed schemas, reference data at a version"],
        ["TTL", "At most the TTL", "Nothing", "Data where slightly old is acceptable"],
        ["Invalidate on write", "None, if nothing is missed", "The writer knows the key", "Data with a single owner"],
        ["Write-through", "None", "Every write goes via the cache", "A cache you fully control"],
        ["Version in the key", "None across a deploy", "A constant to bump", "A change in the value's shape"],
        ["Event-driven", "Bounded by the queue", "A message bus", "Several services owning one entity"]
      ],
      caption: "**Most systems want the third with the second underneath.** Invalidation on write is precise, and the TTL is the admission that one day it will be missed."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix four caches, one of which should not exist",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A service has four caches. One leaks memory, one returns another tenant's data, one is stale after every deploy, and one makes things slower. Diagnose each, then decide what it should be." },
        { t: "code", lang: "python", title: "caches.py — as found", numbered: false, code: `
import functools

TAX_RATE = Decimal("0.20")

class ReportService:
    def __init__(self, db, tenant_id):
        self.db = db
        self.tenant_id = tenant_id

    @functools.lru_cache(maxsize=256)
    def monthly_report(self, month: str) -> Report:
        return self.db.build_report(self.tenant_id, month)

_SEARCH_CACHE = {}

def search(query: str) -> list[Result]:
    if query not in _SEARCH_CACHE:
        _SEARCH_CACHE[query] = _run_search(query)
    return _SEARCH_CACHE[query]

@functools.cache
def price_with_tax(amount: Decimal) -> Decimal:
    return (amount * (1 + TAX_RATE)).quantize(Decimal("0.01"))

@functools.lru_cache(maxsize=512)
def format_currency(amount: Decimal, code: str) -> str:
    return f"{SYMBOLS[code]}{amount:,.2f}"`},
        { t: "p", text: "For each: what breaks, why it survived review, and what replaces it." }
      ],
      requirements: [
        "Identify each cache's specific failure.",
        "Say which one is a security issue rather than a performance one.",
        "Say which one should be deleted rather than fixed, and prove it.",
        "Give a correct replacement for each that stays.",
        "Add a way to observe hit rate in production.",
        "**Explain why `price_with_tax` is stale after a deploy even though nothing about it changed.**"
      ],
      hint: "For `monthly_report`, write out what the cache key actually contains and where the cache lives. For `format_currency`, ask what the function costs compared with a dict lookup and a hash.",
      solution: {
        lang: "python",
        title: "caches.py",
        code: `# =========================================================================
# 1. monthly_report — A SECURITY ISSUE, not a performance one
# =========================================================================
#
#   @functools.lru_cache(maxsize=256)
#   def monthly_report(self, month: str) -> Report:
#       return self.db.build_report(self.tenant_id, month)
#
# TWO faults, and the second is the serious one:
#
#   a) The cache is created when the CLASS BODY executes, so it is shared
#      by every instance. self is part of the key, which means up to 256
#      ReportService objects -- each holding a db connection -- are pinned
#      for the life of the process (Lesson 5.10).
#
#   b) tenant_id is read from self, and self is in the key by IDENTITY.
#      Two ReportService objects for the SAME tenant are different keys
#      (a wasted cache), and -- if any code path reuses or pools service
#      objects across tenants -- one tenant's report is served to another.
#
# (b) is why this is a security issue: the failure is not a stale number,
# it is another customer's revenue figures. It survived review because
# the key LOOKS complete -- month is right there -- and the tenant is
# hidden inside self.


from __future__ import annotations

import functools
import logging
from decimal import Decimal

log = logging.getLogger(__name__)


class ReportService:
    def __init__(self, db, tenant_id: str) -> None:
        self.db = db
        self.tenant_id = tenant_id
        # Per-INSTANCE cache, created in __init__. It dies with the
        # service object rather than living on the class, so nothing is
        # pinned and no cross-instance sharing is possible.
        self._report = functools.lru_cache(maxsize=64)(self._build_report)

    def _build_report(self, tenant_id: str, month: str) -> Report:
        return self.db.build_report(tenant_id, month)

    def monthly_report(self, month: str) -> Report:
        # tenant_id passed EXPLICITLY, so it is part of the key rather
        # than smuggled in on self.
        return self._report(self.tenant_id, month)

    def cache_stats(self) -> dict:
        info = self._report.cache_info()
        return {"hits": info.hits, "misses": info.misses, "size": info.currsize}


# =========================================================================
# 2. _SEARCH_CACHE — an unbounded leak
# =========================================================================
#
#   _SEARCH_CACHE = {}
#   if query not in _SEARCH_CACHE: ...
#
# A module-level dict keyed on user input, with no eviction. Every
# distinct search string ever typed is retained for the life of the
# process -- bounded only by how many different things people search for,
# which is to say not bounded.
#
# It survived review because it is written longhand and does not look
# like a cache. Nobody greps for "dict that is never deleted from".

from cachetools import TTLCache, cached
from threading import Lock

# Bounded on BOTH axes: size, so it cannot grow without limit, and time,
# because search results go stale as the index changes.
_search_cache: TTLCache[str, list] = TTLCache(maxsize=5_000, ttl=300)
_search_lock = Lock()          # TTLCache is not thread-safe


@cached(_search_cache, lock=_search_lock)
def search(query: str) -> list[Result]:
    return _run_search(query)


# =========================================================================
# 3. price_with_tax — STALE AFTER EVERY DEPLOY, and nothing changed
# =========================================================================
#
#   TAX_RATE = Decimal("0.20")
#
#   @functools.cache
#   def price_with_tax(amount: Decimal) -> Decimal:
#       return (amount * (1 + TAX_RATE)).quantize(Decimal("0.01"))
#
# The result depends on TAX_RATE, and TAX_RATE is not an argument, so it
# is not in the key. Change the rate and every cached value is silently
# wrong -- with no error, no log line, and no way for a reader of the
# call site to see it.
#
# WHY "STALE AFTER A DEPLOY EVEN THOUGH NOTHING CHANGED":
# each process has its own cache. A rolling deploy leaves old and new
# workers running side by side, so the same request can get 0.20 from one
# worker and 0.25 from the next -- non-deterministic pricing, and it
# resolves itself once the rollout finishes, which is exactly the shape
# of bug nobody can reproduce.
#
# @cache is also unbounded, and amount is a Decimal from user input.

def price_with_tax(amount: Decimal, rate: Decimal) -> Decimal:
    """Everything the result depends on is an argument.

    Deliberately NOT cached: it is two arithmetic operations. Caching it
    costs a hash of a Decimal plus a dict lookup, which is the same order
    as just doing the multiplication -- see (4).
    """
    return (amount * (1 + rate)).quantize(Decimal("0.01"))


# =========================================================================
# 4. format_currency — DELETE IT. The cache is slower than the function.
# =========================================================================
#
#   @functools.lru_cache(maxsize=512)
#   def format_currency(amount: Decimal, code: str) -> str:
#       return f"{SYMBOLS[code]}{amount:,.2f}"
#
# The body is a dict lookup and an f-string. The cache adds: hashing a
# Decimal and a str, building a key tuple, a dict lookup, and LRU
# bookkeeping on every call.
#
# It is also almost pure miss. amount is a Decimal that varies per row,
# so a report of 10,000 lines produces ~10,000 distinct keys against a
# maxsize of 512 -- constant eviction, and a hit rate near zero.
#
#   MEASURED, 100k calls:
#     uncached     0.081 s
#     lru_cache    0.214 s      2.6x SLOWER
#     cache_info() hits=41 misses=99959
#
# This is the cache that makes things slower, and it is the most common
# one: added by reflex to a function that looked expensive.

def format_currency(amount: Decimal, code: str) -> str:
    return f"{SYMBOLS[code]}{amount:,.2f}"


# =========================================================================
# OBSERVING HIT RATE IN PRODUCTION
# =========================================================================

def report_cache_stats() -> None:
    """Log hit rate periodically. A cache nobody measures is a cache
    nobody knows is broken -- (4) had a 0.04% hit rate for a year
    (Lesson 6.4)."""
    for name, info in (
        ("search", _search_cache_info()),
        ("geocode", geocode.cache_info()),
    ):
        total = info.hits + info.misses
        if not total:
            continue
        log.info("cache stats", extra={
            "cache": name,
            "hit_rate": round(info.hits / total, 4),
            "size": info.currsize,
            "maxsize": info.maxsize,
        })


# =========================================================================
# TESTS
# =========================================================================

import gc
import weakref

import pytest


def test_report_service_is_collectable():
    """Fault 1(a). With lru_cache on the method, self is in the key and
    the cache is on the class, so a used service can never be freed."""
    service = ReportService(FakeDB(), "tenant-a")
    service.monthly_report("2026-06")

    ref = weakref.ref(service)
    del service
    gc.collect()

    assert ref() is None, "the service was pinned by its own cache"


def test_two_tenants_never_share_an_entry():
    """Fault 1(b) — the security one. Same month, same code path,
    different tenant: the answers must differ."""
    a = ReportService(FakeDB(), "tenant-a")
    b = ReportService(FakeDB(), "tenant-b")

    assert a.monthly_report("2026-06").tenant_id == "tenant-a"
    assert b.monthly_report("2026-06").tenant_id == "tenant-b"


def test_search_cache_is_bounded():
    """Fault 2. Ten thousand distinct queries against a maxsize of
    5,000 must not produce ten thousand entries."""
    for i in range(10_000):
        search(f"query-{i}")

    assert len(_search_cache) <= 5_000


def test_tax_rate_is_an_argument_not_a_global():
    """Fault 3. Two rates, two answers, from the same amount -- which
    the cached version could not do."""
    assert price_with_tax(Decimal("100"), Decimal("0.20")) == Decimal("120.00")
    assert price_with_tax(Decimal("100"), Decimal("0.25")) == Decimal("125.00")


def test_format_currency_is_not_cached():
    """Fault 4. Asserting the ABSENCE of a cache, so nobody helpfully
    adds it back."""
    assert not hasattr(format_currency, "cache_info")


@pytest.mark.benchmark
def test_caching_format_currency_would_be_slower():
    """The measurement that justifies the deletion. Distinct Decimals,
    which is what a real report produces."""
    import timeit

    cached_version = functools.lru_cache(maxsize=512)(format_currency)
    amounts = [Decimal(i) / 100 for i in range(20_000)]

    plain = timeit.timeit(lambda: [format_currency(a, "GBP") for a in amounts], number=3)
    cached_ = timeit.timeit(lambda: [cached_version(a, "GBP") for a in amounts], number=3)

    assert cached_ > plain
    assert cached_version.cache_info().hits < cached_version.cache_info().misses`,
        notes: [
          { t: "p", text: "**`monthly_report` is a security issue wearing a performance costume.** The key looks complete — `month` is right there — while `tenant_id` rides in on `self`, which is keyed by identity. Any code path that pools or reuses service objects serves one tenant's revenue to another, and no test of the caching behaviour would notice." },
          { t: "p", text: "**The `TAX_RATE` global is the general rule in miniature: everything the result depends on must be an argument.** A cache is a promise that the same inputs give the same output, and a captured global breaks that promise invisibly — worse, per-process caches make it non-deterministic during a rolling deploy, which is the hardest failure to reproduce." },
          { t: "p", text: "**`format_currency` is the most common cache of all: added by reflex to a function that looked expensive.** The body is a dict lookup and an f-string; the cache adds hashing a `Decimal`, building a key and LRU bookkeeping. With a per-row `Decimal` the hit rate is near zero, so it pays the cost 100% of the time and collects the benefit almost never (Lesson 10.2)." },
          { t: "callout", kind: "insight", title: "Asserting the absence of a cache", body: [
            { t: "p", text: "`assert not hasattr(format_currency, \"cache_info\")` looks odd and earns its place. The deletion was justified by a measurement nobody will repeat, so without the test the next person to read the function adds `@lru_cache` back for the same reason it was there originally." },
            { t: "p", text: "A comment saying \"do not cache this\" gets deleted with the code it annotates. A failing test does not." }
          ]},
          { t: "p", text: "**Logging hit rate is what turns a cache from an assumption into a measurement.** `format_currency` ran at a 0.04% hit rate for a year, costing latency on every call — and nothing anywhere would have told the team, because a cache that is not helping looks exactly like a cache that is." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team adds Redis caching to their product API. Latency drops from 180 ms to 12 ms and everyone is pleased. Three weeks later, support reports that customers occasionally see prices from a promotion that ended." },
      { t: "p", text: "**The invalidation was in the wrong place.** The update path deleted the cache key *before* committing the price change. A concurrent read landing in that window loaded the old price from the database and re-cached it — after the delete, before the commit — so the stale value was written back and stayed for the full TTL." },
      { t: "p", text: "**It was rare and load-dependent**, so it never reproduced in staging and every attempt to trace it found a correct cache entry, because by then the TTL had expired and the next read was right." },
      { t: "p", text: "**Moving one line — the `delete` to after the `commit` — fixed it.** The general rule: **invalidate after the write is durable, never before.** And a TTL is not a strategy but a backstop, because a race like this one is invisible until it costs you a refund, and the TTL is what bounds the damage when it happens." }
    ]}
  ],

  takeaways: [
    "**`lru_cache(maxsize=n)` is the default.** `@cache` is unbounded and only safe when you can name the full set of keys in advance.",
    "**`cached_property` scopes to the instance**, so the value is freed with the object — the right tool for a derived value that depends only on `self`.",
    "**`lru_cache` on a method pins instances**: the cache lives on the class and `self` is part of every key. Build a per-instance cache in `__init__` instead.",
    "**A key must contain everything the value depends on.** A captured global or a value read from `self` is invisible to the key, and the cache then lies.",
    "**An incomplete key that omits the tenant is a data leak, not a stale value** — the cache serves one customer's data to another.",
    "**Put a version in the key** so a deploy that changes the value's shape misses cleanly and the old entries drain instead of being flushed.",
    "**`f(1)` and `f(1.0)` share an entry**; `f(1)` and `f(x=1)` do not. The first is a correctness risk, the second silently halves the hit rate.",
    "**Invalidate after the write commits, never before** — a read landing between the delete and the commit re-caches the pre-write value.",
    "**Use a TTL as a backstop under explicit invalidation**, because one day an invalidation will be missed by a migration or an admin tool.",
    "**An unbounded cache keyed on user input is a leak**, whether it is `@cache` or a module-level dict written out longhand.",
    "**Measure hit rate.** A cache that is not helping looks exactly like one that is, and `cache_info()` settles it in one line.",
    "**Caching a cheap function makes it slower.** Hashing the arguments and the LRU bookkeeping can cost more than the body, and a per-row key means near-zero hits."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`@lru_cache` on a method whose result depends on `self.tenant_id`. What is the most serious problem?",
        options: [
          "The cache is too small",
          "`tenant_id` is not in the key — it rides in on `self`, keyed by identity — so a reused or pooled service object can serve one tenant's data to another",
          "`self` is not hashable",
          "The cache is never cleared"
        ],
        answer: 1,
        why: "The key looks complete because `month` is an explicit argument, which is why it survives review. The tenant is hidden inside `self`, and `self` is keyed by identity — so two objects for the same tenant waste the cache, and any pooling across tenants leaks data. There is a second fault too: the cache lives on the class, so every cached instance is pinned for the life of the process."
      },
      {
        stem: "A cached function reads a module-level `TAX_RATE`. Why is that dangerous?",
        options: [
          "Globals are slower to access than arguments",
          "The rate is not part of the key, so changing it leaves every cached value silently wrong — and per-process caches make it non-deterministic during a rolling deploy",
          "`Decimal` cannot be hashed",
          "The cache will never be populated"
        ],
        answer: 1,
        why: "A cache promises that the same inputs give the same output. Anything the result depends on that is not an argument breaks that promise with no error and no log line. During a rolling deploy each worker has its own cache, so the same request gets different answers from different workers and the problem resolves itself when the rollout finishes — the hardest shape of bug to reproduce."
      },
      {
        stem: "An update path deletes the cache key, then commits the write. What can go wrong?",
        options: [
          "Nothing — deleting first is the safe order",
          "A concurrent read between the delete and the commit loads the old value and re-caches it, so the stale value persists for the full TTL",
          "The delete fails if the key does not exist",
          "The commit invalidates the connection"
        ],
        answer: 1,
        why: "The window is small and load-dependent, so it never reproduces in staging and has usually expired by the time anyone investigates. Invalidating after the write is durable closes it. This is also the argument for keeping a TTL underneath explicit invalidation — it bounds the damage when a race or a missed invalidation happens anyway."
      },
      {
        stem: "`format_currency(amount: Decimal, code: str)` does a dict lookup and an f-string, and is decorated with `@lru_cache(maxsize=512)`. What does the cache achieve?",
        options: [
          "A modest speed-up on repeated values",
          "It makes the function slower — hashing the arguments and LRU bookkeeping cost more than the body, and a per-row `Decimal` gives a hit rate near zero",
          "It prevents formatting errors",
          "It reduces memory by sharing strings"
        ],
        answer: 1,
        why: "Measured over 100,000 calls it was about 2.6× slower, with 41 hits against 99,959 misses. The amount varies per row, so a report of 10,000 lines produces 10,000 distinct keys against a maxsize of 512 — constant eviction, cost paid on every call, benefit almost never. This is the most common cache mistake: added by reflex to a function that looked expensive."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use `lru_cache`?",
        strong: "On a pure function with a bounded, hashable key space where the computation genuinely costs more than a hash and a dict lookup — and with `maxsize` set, because `@cache` is unbounded.",
        answer: [
          { t: "p", text: "\"Pure\" is doing the work in that sentence: anything the result depends on must be an argument, or the key is incomplete and the cache lies." },
          { t: "p", text: "The method trap is the detail worth volunteering — the cache lives on the class and `self` is in the key, so instances are pinned forever." },
          { t: "p", text: "Naming the inverse shows judgement: caching a cheap function with a high-cardinality argument is slower than not caching it, and `cache_info()` settles which case you are in." }
        ]
      },
      {
        level: "advanced",
        q: "How do you invalidate a cache?",
        strong: "Invalidate on write, with a TTL underneath as a backstop. The writer knows exactly when a value stops being true; the TTL is the admission that one day an invalidation will be missed.",
        answer: [
          { t: "p", text: "The ordering point is the one that separates a real answer: invalidate *after* the write commits, or a concurrent read re-caches the pre-write value and the stale entry survives for the whole TTL." },
          { t: "p", text: "A version in the key covers the deploy case, where the value's shape changes and every existing entry is wrong — and it lets the old entries drain instead of flushing to a zero hit rate." },
          { t: "p", text: "Being explicit that a TTL alone is always either too long or too short frames it as a backstop rather than a strategy." }
        ]
      },
      {
        level: "advanced",
        q: "What goes into a cache key?",
        strong: "Everything the value depends on: who is asking, what they asked for, and a version for the value's shape. Anything omitted is a collision, and when the omitted thing is the tenant it is a data leak rather than a wrong number.",
        answer: [
          { t: "p", text: "Framing an incomplete key as a security issue rather than a correctness one is what makes the point land, and the multi-tenant example is concrete." },
          { t: "p", text: "The subtleties show depth: `1` and `1.0` share an entry, positional and keyword calls do not, and a captured global is invisible to the key entirely." },
          { t: "p", text: "Putting the version early in the key is a small operational detail with a real payoff — prefix deletion reclaims the space in one command." }
        ]
      }
    ]
  }
});
