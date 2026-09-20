/* ============================================================================
   LESSON 4.1 — Classes, Instances and __init__
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "A class is a factory for objects that share behaviour. Python's version has two properties that surprise people from other languages: **`self` is an ordinary explicit parameter**, and **`__init__` does not construct anything** — the object already exists by the time it runs. Both make sense once you see what actually happens on instantiation.",

  objectives: [
    "Describe the two steps Python performs when you call a class",
    "Explain why `self` is explicit and what it actually receives",
    "Write `__init__` methods that establish a valid object and nothing more",
    "Distinguish `__new__` from `__init__` and know when you need the former",
    "Decide when a class is the right tool rather than a function or a dataclass"
  ],

  prerequisites: ["1.4", "3.1"],

  blocks: [

    { t: "h2", n: "01", text: "What happens when you call a class", id: "instantiation" },

    {"kind": "steps", "title": "What happens when you call a class", "caption": "Point(1, 2) is type.__call__: allocate with __new__, initialise with __init__, return the instance. __init__ never returns the object — it configures one that already exists.", "items": [{"label": "Point(1, 2)", "desc": "the class is callable because its metaclass defines __call__"}, {"label": "obj = Point.__new__(Point, 1, 2)", "desc": "allocate a bare instance — rarely overridden", "tone": "accent"}, {"label": "obj.__init__(1, 2)", "desc": "set attributes on the new instance; returns None", "tone": "good"}, {"label": "return obj", "desc": "the caller gets the initialised instance", "tone": "warn"}], "t": "diagram", "id": "dg-4_1-01-0"},



    { t: "p", text: "`Order(\"o-1\", 100)` looks like a function call, and it is — calling a class runs its metaclass's `__call__`, which does two things in sequence." },

    { t: "viz",
      title: "Two steps, not one",
      caption: "__new__ allocates and returns the object; __init__ receives that object as self and populates it. This is why __init__ returns None — it is handed something that already exists, and its job is to make it valid.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Diagram: calling a class runs __new__ to allocate then __init__ to initialise">
  <defs>
    <marker id="b1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="20" y="46" width="150" height="40" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="95" y="71" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">Order("o-1", 100)</text>

  <line x1="170" y1="66" x2="232" y2="66" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#b1)"/>

  <rect x="238" y="36" width="190" height="60" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="333" y="58" text-anchor="middle" class="s-label">1 · __new__(cls, ...)</text>
  <text x="333" y="76" text-anchor="middle" class="s-sub">allocates an empty object</text>
  <text x="333" y="90" text-anchor="middle" class="s-sub">and RETURNS it</text>

  <line x1="428" y1="66" x2="490" y2="66" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#b1)"/>
  <text x="459" y="58" text-anchor="middle" class="s-sub">the object</text>

  <rect x="496" y="36" width="190" height="60" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="591" y="58" text-anchor="middle" class="s-label">2 · __init__(self, ...)</text>
  <text x="591" y="76" text-anchor="middle" class="s-sub">populates it, returns None</text>
  <text x="591" y="90" text-anchor="middle" class="s-sub">self IS that object</text>

  <line x1="686" y1="66" x2="748" y2="66" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#b1)"/>
  <rect x="754" y="46" width="126" height="40" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="817" y="71" text-anchor="middle" class="s-sub" style="fill:var(--good)">a valid Order</text>

  <rect x="20" y="132" width="860" height="98" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="154" class="s-sub" style="fill:var(--ink-2);font-weight:600">Two consequences that explain a lot of Python</text>
  <text x="36" y="176" class="s-sub">1.  __init__ must return None. Returning anything else raises TypeError — it is not a constructor,</text>
  <text x="52" y="192" class="s-sub">    it is an initialiser handed an object that already exists.</text>
  <text x="36" y="214" class="s-sub">2.  self is just the first positional parameter. Nothing is implicit: Order.total(order) and</text>
  <text x="52" y="230" class="s-sub">    order.total() are the same call, which is why every method must declare it.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the two steps, made visible", code: `
class Order:
    def __new__(cls, *args, **kwargs):
        print(f"__new__  creating a {cls.__name__}")
        return super().__new__(cls)          # must RETURN the object

    def __init__(self, order_id: str, total: int) -> None:
        print(f"__init__ populating {id(self)}")
        self.order_id = order_id
        self.total = total


order = Order("o-1", 100)
print(order.order_id)
`,
      out: `__new__  creating a Order
__init__ populating 140234567891200
o-1`
    },

    { t: "callout", kind: "insight", title: "`self` is not a keyword", body: [
      { t: "code", lang: "python", title: "proof", numbered: false, code: `
class Order:
    def __init__(self, total):
        self.total = total

    def doubled(self):
        return self.total * 2


order = Order(50)

# These are the same call. The dot lookup finds the function on the class
# and passes the instance as the first argument.
print(order.doubled())
print(Order.doubled(order))`,
        out: `100
100`},
      { t: "p", text: "`self` is a naming convention, not syntax — `def doubled(this)` works identically. But **always call it `self`**: every linter, every reader and every piece of tooling assumes it, and deviating buys nothing." },
      { t: "p", text: "The explicitness is deliberate. Python's design principle is that a name's origin should be visible, so `self.total` says *this is instance state* where a bare `total` in C++ or Java could be a local, a member or a global." }
    ]},

    { t: "h2", n: "02", text: "What belongs in __init__", id: "init-scope" },

    { t: "p", text: "`__init__` has one job: **leave the object in a valid state.** Every attribute the class will ever use should be set there, and nothing that can fail slowly should happen." },

    { t: "ladder",
      title: "An API client",
      rungs: [
        { level: "bad", label: "Does work in __init__", why: "construction can fail or block",
          code: `class ApiClient:
    def __init__(self, base_url):
        self.base_url = base_url
        # Network I/O during construction:
        self.session = requests.Session()
        self.token = requests.post(f"{base_url}/auth").json()["token"]
        self.config = requests.get(f"{base_url}/config").json()`,
          note: "Constructing this object makes two network calls. It cannot be created in a test without mocking HTTP, it fails at import time if the module builds one at module level, and a slow auth endpoint blocks startup. Objects that cannot be cheaply created are objects that are hard to test." },

        { level: "ok", label: "Store inputs, defer work", why: "cheap construction, lazy I/O",
          code: `class ApiClient:
    def __init__(self, base_url: str, session: Session | None = None) -> None:
        self.base_url = base_url
        self.session = session or Session()
        self._token: str | None = None      # declared, not fetched

    @property
    def token(self) -> str:
        if self._token is None:
            self._token = self._authenticate()
        return self._token`,
          note: "Construction is now free and testable, and the session is injectable so a test can pass a fake. Every attribute is declared in `__init__` even when its value comes later — that is what keeps the object's shape obvious. Lesson 4.4 covers properties." },

        { level: "best", label: "A classmethod for the expensive path", why: "two named ways in",
          code: `class ApiClient:
    def __init__(
        self,
        base_url: str,
        *,
        session: Session,
        token: str,
    ) -> None:
        """Build a client from ready-made parts. Cheap and total."""
        self.base_url = base_url
        self.session = session
        self.token = token

    @classmethod
    def connect(cls, base_url: str) -> "ApiClient":
        """Authenticate and return a ready client. Does network I/O."""
        session = Session()
        token = session.post(f"{base_url}/auth").json()["token"]
        return cls(base_url, session=session, token=token)`,
          note: "The signature now tells the truth in both directions. `ApiClient(...)` is cheap, total and takes everything it needs — perfect for tests. `ApiClient.connect(url)` is the one that touches the network, and its name says so. **A `classmethod` is how Python expresses an alternative constructor**, and it is the answer whenever `__init__` wants to do something that can fail. Lesson 4.3 covers them." }
      ]
    },

    { t: "callout", kind: "good", title: "Declare every attribute in __init__", body: [
      { t: "code", lang: "python", title: "why it matters", numbered: false, code: `
# BAD: _cache appears out of nowhere, halfway down the class
class Report:
    def __init__(self, rows):
        self.rows = rows

    def summary(self):
        if not hasattr(self, "_cache"):     # hasattr as flow control
            self._cache = compute(self.rows)
        return self._cache


# GOOD: the object's full shape is visible in one place
class Report:
    def __init__(self, rows: list[Row]) -> None:
        self.rows = rows
        self._cache: Summary | None = None

    def summary(self) -> Summary:
        if self._cache is None:
            self._cache = compute(self.rows)
        return self._cache`},
      { t: "p", text: "An attribute created outside `__init__` means a reader cannot learn the object's shape from one place, and `hasattr` becomes flow control. It also breaks `__slots__` (Lesson 8.8) and confuses type checkers." }
    ]},

    { t: "h2", n: "03", text: "__new__, and when you need it", id: "new" },

    { t: "p", text: "You will write `__init__` constantly and `__new__` perhaps twice in a career. It exists for the cases where you must control **which object is returned**, not merely how it is populated." },

    { t: "table",
      head: ["Case", "Why `__init__` cannot do it"],
      rows: [
        ["Subclassing an immutable type — `int`, `str`, `tuple`", "The value is fixed at allocation; by `__init__` it is too late to change"],
        ["Returning a cached or interned instance", "`__init__` cannot choose to return a different object"],
        ["A singleton", "Same reason — `__new__` can return an existing instance"],
        ["Controlling metaclass-level allocation", "Framework and library internals only"]
      ]
    },

    { t: "code", lang: "python", title: "the legitimate case: subclassing an immutable", code: `
class Percentage(float):
    """A float that must be between 0 and 100."""

    def __new__(cls, value: float) -> "Percentage":
        if not 0 <= value <= 100:
            raise ValueError(f"percentage must be 0-100, got {value}")
        # The value must be passed at ALLOCATION -- a float's value
        # cannot be assigned afterwards, so __init__ is too late.
        return super().__new__(cls, value)


p = Percentage(42.5)
print(p, p + 10, isinstance(p, float))
Percentage(150)
`,
      out: `42.5 52.5 True
ValueError: percentage must be 0-100, got 150`
    },

    { t: "callout", kind: "trap", title: "The __new__ mistakes", body: [
      { t: "ul", items: [
        "**Forgetting to return.** `__new__` that returns `None` means `__init__` is never called and the class-call evaluates to `None` — a baffling failure with no error.",
        "**Assuming `__init__` is skipped.** If `__new__` returns an instance of `cls`, Python calls `__init__` on it afterwards. A singleton implemented in `__new__` therefore re-runs `__init__` on every call, resetting state.",
        "**Reaching for it when a `classmethod` would do.** If you only need a different *way to build* an object, that is an alternative constructor, not `__new__`."
      ]},
      { t: "code", lang: "python", title: "the singleton trap, concretely", numbered: false, code: `
class Config:
    _instance = None

    def __new__(cls, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, **kwargs):
        self.settings = kwargs      # RE-RUNS on every Config(...) call


a = Config(debug=True)
b = Config()                        # __init__ runs again, wiping settings
print(a.settings)`,
        out: `{}`},
      { t: "p", text: "In Python a module is already a singleton — imported once, cached in `sys.modules`. **A module-level object or a factory function with `lru_cache` is almost always the better answer** than a `__new__`-based singleton, which has this trap plus the testability problems of global state (Lesson 3.3)." }
    ]},

    { t: "h2", n: "04", text: "Do you need a class at all?", id: "need-a-class" },

    { t: "table",
      head: ["Use", "When"],
      rows: [
        ["A **function**", "One behaviour, no state between calls. Most code."],
        ["A **dataclass**", "Data with a few fields and little behaviour — the modern default for records (Lesson 4.10)"],
        ["A **NamedTuple**", "An immutable record that should behave like a tuple"],
        ["A **class**", "State plus several methods that operate on it, or a type you will subclass or substitute"],
        ["A **module**", "A namespace of related functions with no per-instance state"]
      ],
      caption: "The signal for a class is **state plus behaviour, together**. A class with one method is a function; a class with only data is a dataclass; a class with only classmethods is a module."
    },

    { t: "callout", kind: "tradeoff", title: "The one-method class", body: [
      { t: "code", lang: "python", title: "ceremony without capability", numbered: false, code: `
# A class that is really a function
class PriceCalculator:
    def __init__(self, tax_rate):
        self.tax_rate = tax_rate

    def calculate(self, amount):
        return amount * (1 + self.tax_rate)


calc = PriceCalculator(Decimal("0.2"))
calc.calculate(Decimal("100"))


# The same thing, as Python does it (Lesson 3.6)
def price_with_tax(tax_rate: Decimal) -> Callable[[Decimal], Decimal]:
    def calculate(amount: Decimal) -> Decimal:
        return amount * (1 + tax_rate)
    return calculate


# Or simply, since the rate is one argument:
def price_with_tax(amount: Decimal, tax_rate: Decimal) -> Decimal:
    return amount * (1 + tax_rate)`},
      { t: "p", text: "The last version is the honest one. A class whose only purpose is to hold arguments between construction and one method call is a function with extra steps — and `functools.partial` handles the pre-binding case (Lesson 3.4)." },
      { t: "p", text: "The class becomes right the moment there is a second method that shares the state, or a second implementation to substitute." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a class cheap to construct",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The class below cannot be created in a unit test without a live database and a live cache server. Restructure it so construction is free and total, without losing the convenience of the current call site." }
      ],
      requirements: [
        "Identify everything in `__init__` that can fail, block, or requires infrastructure.",
        "Make the primary `__init__` cheap, total, and dependency-injectable.",
        "Provide a `classmethod` for the convenient path that does the real connecting.",
        "Declare every attribute in `__init__`, including ones populated later.",
        "Replace the `hasattr` flow control.",
        "Write two tests that construct the object with no infrastructure at all."
      ],
      hint: "Everything the object needs but does not own should be a parameter. The pattern is: `__init__` takes ready-made collaborators; a classmethod builds them.",
      solution: {
        lang: "python",
        title: "user_service.py",
        code: `# ---- the original ------------------------------------------------------

class UserService:
    def __init__(self, db_url, cache_url, config_path):
        self.db = psycopg.connect(db_url)              # network I/O
        self.cache = redis.from_url(cache_url)         # network I/O
        self.config = json.loads(open(config_path).read())   # disk I/O
        self.cache.ping()                              # can raise

    def get_user(self, user_id):
        if not hasattr(self, "_stats"):                # hasattr as control flow
            self._stats = {"hits": 0, "misses": 0}
        cached = self.cache.get(user_id)
        if cached:
            self._stats["hits"] += 1
            return json.loads(cached)
        self._stats["misses"] += 1
        ...
#
# Cannot be constructed without a database, a Redis server and a file on
# disk. Every test of get_user therefore needs all three, even though the
# interesting logic is the cache-hit branch.


# ---- the redesign ------------------------------------------------------

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol


class Cache(Protocol):
    """The narrow surface UserService actually uses (Lesson 8.4)."""
    def get(self, key: str) -> bytes | None: ...
    def set(self, key: str, value: bytes) -> None: ...


class Database(Protocol):
    def fetch_user(self, user_id: str) -> dict | None: ...


@dataclass
class CacheStats:
    hits: int = 0
    misses: int = 0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total else 0.0


class UserService:
    def __init__(
        self,
        *,
        db: Database,
        cache: Cache,
        config: Mapping[str, str],
    ) -> None:
        """Build from ready-made collaborators.

        Cheap and total: no I/O, nothing that can raise. Everything the
        service needs but does not own arrives as a parameter, so a test
        can pass fakes and never touch infrastructure.
        """
        self._db = db
        self._cache = cache
        self._config = config
        # Declared here even though it starts empty -- the object's full
        # shape is visible in one place, and hasattr is never needed.
        self.stats = CacheStats()

    @classmethod
    def connect(
        cls,
        db_url: str,
        cache_url: str,
        config_path: Path,
    ) -> "UserService":
        """Open real connections and return a ready service.

        The name says this does I/O. Failures happen here, once, at a
        point the caller chose -- not as a side effect of construction.
        """
        import psycopg
        import redis

        config = json.loads(config_path.read_text(encoding="utf-8"))
        cache = redis.from_url(cache_url)
        cache.ping()                      # fail fast, explicitly
        return cls(
            db=psycopg.connect(db_url),
            cache=cache,
            config=config,
        )

    def get_user(self, user_id: str) -> dict | None:
        raw = self._cache.get(user_id)
        if raw is not None:
            self.stats.hits += 1
            return json.loads(raw)

        self.stats.misses += 1
        user = self._db.fetch_user(user_id)
        if user is not None:
            self._cache.set(user_id, json.dumps(user).encode())
        return user


# ---- tests with no infrastructure --------------------------------------

class FakeCache:
    def __init__(self, initial: dict[str, bytes] | None = None) -> None:
        self.data = dict(initial or {})

    def get(self, key: str) -> bytes | None:
        return self.data.get(key)

    def set(self, key: str, value: bytes) -> None:
        self.data[key] = value


class FakeDatabase:
    def __init__(self, users: dict[str, dict]) -> None:
        self.users = users
        self.calls = 0

    def fetch_user(self, user_id: str) -> dict | None:
        self.calls += 1
        return self.users.get(user_id)


def test_cache_hit_does_not_touch_the_database() -> None:
    db = FakeDatabase({})
    cache = FakeCache({"u1": b'{"id": "u1", "name": "Ada"}'})
    service = UserService(db=db, cache=cache, config={})

    user = service.get_user("u1")

    assert user == {"id": "u1", "name": "Ada"}
    assert db.calls == 0                       # the point of the cache
    assert service.stats.hits == 1


def test_cache_miss_populates_the_cache() -> None:
    db = FakeDatabase({"u2": {"id": "u2", "name": "Grace"}})
    cache = FakeCache()
    service = UserService(db=db, cache=cache, config={})

    assert service.get_user("u2")["name"] == "Grace"
    assert db.calls == 1
    assert "u2" in cache.data                  # written through
    assert service.stats.misses == 1
    assert service.stats.hit_rate == 0.0


if __name__ == "__main__":
    test_cache_hit_does_not_touch_the_database()
    test_cache_miss_populates_the_cache()
    print("both branches tested without a database or a cache server")`,
        notes: [
          { t: "p", text: "**The test that matters is `db.calls == 0`.** That assertion is the entire purpose of a cache, and against the original class it could not be written at all — you would need a real Redis with a pre-seeded key and a real Postgres to prove it was not queried. Now it is four lines of fakes." },
          { t: "p", text: "**`Protocol` rather than a base class** means the fakes do not inherit from anything. They just have the right methods, which is duck typing made checkable — mypy verifies that `FakeCache` satisfies `Cache` without any declared relationship. Lesson 8.4 covers protocols." },
          { t: "p", text: "**Declaring `self.stats` in `__init__`** removes the `hasattr` check and makes the object's shape visible in one place. Wrapping it in a small dataclass rather than a bare dict also gives it a `hit_rate` property, which is where that calculation belongs." },
          { t: "callout", kind: "insight", title: "Why the classmethod is not just moved code", body: [
            { t: "p", text: "`connect` does exactly what the old `__init__` did — so it looks like the failure modes were relocated rather than removed. The difference is *who decides when they happen*." },
            { t: "p", text: "With the work in `__init__`, merely creating the object does I/O, so a module-level instance fails at import and a test cannot avoid it. With a classmethod, the caller chooses: production calls `connect()` at startup where a failure is a clear boot error, and tests call `UserService(...)` and never connect to anything." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service defines `client = ApiClient(settings.URL)` at module level. It works in production. Then CI starts failing on every test file that imports anything from that module — with a connection error, before a single test runs." },
      { t: "p", text: "**`__init__` did network I/O, and module-level code runs at import.** Importing the module constructs the client, which authenticates, which fails in CI where the upstream is unreachable. The tests never had a chance to run, and the traceback points at an import line rather than at any test." },
      { t: "p", text: "**Two things went wrong and both are worth fixing.** Construction should be cheap — move the I/O into a `connect()` classmethod so creating the object cannot fail. And a shared client should be built by a factory the app calls at startup, not by import side effect, so its lifetime is something you control (Lesson 3.3)." },
      { t: "p", text: "The general rule: **anything at module level runs at import time**, in every process that imports it — including test collectors, linters and documentation builders. Keep import-time work to definitions." }
    ]}
  ],

  takeaways: [
    "Calling a class runs **`__new__` to allocate, then `__init__` to populate**. `__init__` is not a constructor; it receives an object that already exists, which is why it must return `None`.",
    "**`self` is an ordinary first parameter**, not a keyword — `order.doubled()` and `Order.doubled(order)` are the same call. Always name it `self` anyway.",
    "`__init__` has one job: **leave the object in a valid state.** Nothing that can fail, block, or require infrastructure belongs there.",
    "**Declare every attribute in `__init__`**, even those populated later. Attributes created elsewhere hide the object's shape and turn `hasattr` into flow control.",
    "**A `classmethod` is Python's alternative constructor.** When construction wants to do I/O, put the cheap total form in `__init__` and the connecting form in a named classmethod.",
    "Anything the object needs but does not own should be a **parameter** — that is what makes it testable with fakes.",
    "`__new__` is for controlling *which object is returned*: subclassing immutables, interning, caching. Forgetting to return from it yields `None` with no error.",
    "A `__new__`-based singleton **re-runs `__init__` on every call**. A module is already a singleton; prefer a module-level object or a cached factory.",
    "The signal for a class is **state plus several methods that share it**. One method is a function; only data is a dataclass; only classmethods is a module.",
    "**Module-level code runs at import**, in every process — including CI collectors. Keep import-time work to definitions."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why must `__init__` return `None`?",
        options: [
          "Because Python discards its return value, so returning anything is pointless",
          "Because it is an initialiser, not a constructor — `__new__` already created and returned the object, and returning anything else raises `TypeError`",
          "Because returning a value would create a second instance",
          "It does not have to; returning `self` is a common idiom"
        ],
        answer: 1,
        why: "Calling a class runs `__new__` to allocate the object and then `__init__` to populate it. By the time `__init__` runs, the object exists and has been chosen — its job is to make it valid, not to decide what to return. Returning anything other than `None` raises `TypeError: __init__() should return None`. To control which object comes back, you need `__new__`."
      },
      {
        stem: "A module contains `client = ApiClient(URL)` at module level, and `ApiClient.__init__` authenticates over the network. What breaks in CI?",
        options: [
          "Nothing — module-level code is lazy and runs on first attribute access",
          "Every test file importing that module fails at import time, before any test runs, because construction performs I/O",
          "Only tests that use the client directly fail",
          "The client is created but its methods raise on first use"
        ],
        answer: 1,
        why: "Module-level statements execute when the module is imported, in every process that imports it — including the test collector. Since `__init__` does network I/O, the import itself fails and the traceback points at an import line rather than at a test. Two fixes apply: make construction cheap by moving I/O into a `connect()` classmethod, and build shared clients in a startup factory rather than by import side effect."
      },
      {
        stem: "A singleton is implemented by caching an instance in `__new__`. What is the subtle bug?",
        options: [
          "`__new__` cannot access class attributes, so the cache never persists",
          "`__init__` still runs on every call, re-initialising the cached instance and wiping its state",
          "The instance is garbage-collected between calls",
          "Subclasses share the parent's instance, which is always correct"
        ],
        answer: 1,
        why: "When `__new__` returns an instance of `cls`, Python calls `__init__` on it afterwards — regardless of whether it was freshly allocated. So `Config(debug=True)` then `Config()` runs `__init__` twice and the second call resets the settings. In Python a module is already a singleton, cached in `sys.modules`, so a module-level object or an `lru_cache`-wrapped factory avoids both this trap and the testability problems of global state."
      },
      {
        stem: "Which is the clearest signal that something should be a class rather than a function?",
        options: [
          "It takes more than three arguments",
          "It has state plus several methods that operate on that state",
          "It belongs to a domain concept with a noun name",
          "It needs to be mocked in tests"
        ],
        answer: 1,
        why: "State and behaviour together is what a class is for. A class with a single method is a function — often with `functools.partial` for the pre-bound arguments. A class with only data is a dataclass. A class with only classmethods is a module. Argument count suggests grouping parameters into an object, not that the caller should be one, and anything can be substituted in tests via a protocol."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `__new__` and `__init__`?",
        strong: "`__new__` allocates and returns the object; `__init__` receives that object as `self` and populates it. `__init__` is an initialiser rather than a constructor, which is why it must return `None`. You need `__new__` only when you must control *which* object comes back — subclassing an immutable, interning, or caching instances.",
        answer: [
          { t: "p", text: "The distinction that matters is *allocate versus populate*, and stating it that way answers the follow-up before it is asked." },
          { t: "p", text: "The immutable-subclass case is the best concrete example: a `float` subclass with validation must check in `__new__`, because a float's value is fixed at allocation and `__init__` is too late to change it." },
          { t: "p", text: "The trap worth volunteering: if `__new__` returns an instance of the class, `__init__` runs on it anyway — so a singleton built in `__new__` re-initialises its cached instance on every call." }
        ]
      },
      {
        level: "core",
        q: "Why is `self` explicit in Python?",
        strong: "Because a method is just a function whose first parameter receives the instance — `obj.method()` and `Class.method(obj)` are the same call. Making it explicit means the origin of every name is visible: `self.total` is unambiguously instance state, where a bare name in C++ or Java could be a local, a member or a global.",
        answer: [
          { t: "p", text: "Demonstrating the equivalence is stronger than describing it: showing that `Order.doubled(order)` works proves `self` is a parameter rather than magic." },
          { t: "p", text: "The design argument is the substance — Python consistently prefers explicit over implicit, and this is one of the clearest instances. It is also what makes decorators, `classmethod` and `staticmethod` describable in terms of what happens to that first argument." },
          { t: "p", text: "Worth noting that `self` is a convention, not a keyword, and that you should follow it anyway because every linter and reader assumes it." }
        ]
      },
      {
        level: "advanced",
        q: "A class cannot be constructed in a test without a database. How do you fix it?",
        strong: "Move everything that does I/O out of `__init__`. The primary constructor takes ready-made collaborators as parameters and does nothing that can fail; a named classmethod like `connect()` builds those collaborators and is the only thing that touches the network.",
        answer: [
          { t: "p", text: "The objection to anticipate is that the classmethod just relocates the I/O. The answer is that it changes *who decides when it happens*: with the work in `__init__`, merely creating the object does I/O — so a module-level instance fails at import and a test cannot opt out." },
          { t: "p", text: "Naming `Protocol` rather than an abstract base class shows current practice: the fakes need only the right methods, with no inheritance, and mypy still verifies they satisfy the interface." },
          { t: "p", text: "The framing that lands: objects that are expensive to construct are objects that are hard to test, and the interesting logic is usually the branch that avoids the infrastructure — the cache hit that must *not* query the database. That is exactly the assertion the original design made impossible to write." }
        ],
        weak: "Reaching first for `unittest.mock.patch` on the database module. It works, and it couples every test to the import path of the thing being patched, so a refactor that moves a module breaks tests that never mentioned it."
      }
    ]
  }
});
