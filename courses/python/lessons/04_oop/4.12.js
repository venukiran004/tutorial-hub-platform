/* ============================================================================
   LESSON 4.12 — Design Patterns That Survive in Python
   ========================================================================= */
EC.receiveLesson({
  id: "4.12",

  lede: "The Gang of Four patterns were written for C++ in 1994, and a striking number of them are **workarounds for missing language features**. Python has first-class functions, closures, modules-as-singletons, duck typing and decorators — so several patterns collapse to a few lines, one becomes a language keyword, and a handful remain genuinely useful. This lesson sorts them.",

  objectives: [
    "Identify which patterns Python's features make unnecessary",
    "Implement the surviving patterns idiomatically rather than by transliteration",
    "Recognise a pattern applied as ceremony rather than to absorb variation",
    "Explain what problem each surviving pattern actually solves",
    "Choose a pattern because of a force in your design, not because it has a name"
  ],

  prerequisites: ["4.7", "4.11"],

  blocks: [

    { t: "h2", n: "01", text: "The sorting", id: "sorting" },


    { t: "viz",
      title: "Patterns that shrink to nothing in Python",
      caption: "Several Gang-of-Four patterns exist to work around limitations Python does not have. Recognising which collapse into a language feature is more useful than memorising all twenty-three.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Classic design patterns paired with the Python feature that replaces each">
  <text x="30"  y="34" class="s-label" style="fill:var(--crit)">the pattern</text>
  <text x="470" y="34" class="s-label" style="fill:var(--good)">what it becomes</text>
  <line x1="30" y1="44" x2="850" y2="44" style="stroke:var(--line)" stroke-width="1.5"/>

  <g class="s-sub" style="fill:var(--ink-2)">
    <text x="30" y="72">Strategy</text>
    <text x="30" y="100">Command</text>
    <text x="30" y="128">Singleton</text>
    <text x="30" y="156">Decorator</text>
    <text x="30" y="184">Iterator</text>
  </g>
  <g class="s-sub" style="fill:var(--good)">
    <text x="470" y="72">a function passed as an argument</text>
    <text x="470" y="100">a callable, or functools.partial</text>
    <text x="470" y="128">a module — imported once by design</text>
    <text x="470" y="156">the @ syntax, built into the language</text>
    <text x="470" y="184">__iter__ and a generator</text>
  </g>

  <g style="stroke:var(--line);stroke-width:1.5;stroke-dasharray:4 3">
    <line x1="300" y1="66" x2="460" y2="66"/><line x1="300" y1="94" x2="460" y2="94"/>
    <line x1="300" y1="122" x2="460" y2="122"/><line x1="300" y1="150" x2="460" y2="150"/>
    <line x1="300" y1="178" x2="460" y2="178"/>
  </g>

  <text x="30" y="222" class="s-sub" style="fill:var(--ink-3)">The ones that survive intact — Adapter, Observer, State — solve problems the language does not address.</text>
</svg>`
    },
    { t: "table",
      head: ["Pattern", "In Python", "Because"],
      rows: [
        ["**Strategy**", "A function or a dict of functions", "Functions are first-class (Lesson 3.4)"],
        ["**Command**", "A function, or `functools.partial`", "Same — a callable with bound arguments"],
        ["**Template Method**", "Survives, as an ABC", "It needs real shared implementation (Lesson 4.8)"],
        ["**Singleton**", "A module, or `@lru_cache` on a factory", "Modules are imported once and cached in `sys.modules`"],
        ["**Factory Method**", "A `classmethod`", "Alternative constructors are built in (Lesson 4.3)"],
        ["**Abstract Factory**", "A function returning objects", "No need for a class to hold one method"],
        ["**Adapter**", "**Survives**, and shrinks", "Still needed to reshape a third-party interface"],
        ["**Decorator (GoF)**", "`@decorator`, or a wrapper class", "Partly a language feature (Lesson 3.7)"],
        ["**Observer**", "**Survives** — a list of callbacks", "Simplifies to callables, but the pattern is real"],
        ["**Iterator**", "A language protocol", "`__iter__` and generators (Lesson 5.6)"],
        ["**State**", "**Survives**, often as an enum plus a dispatch table", "The transitions are the design; the classes are optional"],
        ["**Builder**", "Keyword arguments and defaults", "Python has named parameters (Lesson 3.2)"],
        ["**Proxy**", "**Survives** — `__getattr__` forwarding", "Genuinely useful for lazy loading and instrumentation"],
        ["**Visitor**", "`singledispatch` or `match`", "Double dispatch has a library answer"]
      ],
      caption: "Roughly half dissolve into a language feature. The survivors — Adapter, Observer, State, Proxy, Template Method — solve problems that are about *design forces*, not about missing syntax."
    },

    { t: "h2", n: "02", text: "The ones that dissolve", id: "dissolve" },

    { t: "tabs", items: [
      { label: "Strategy", blocks: [
        { t: "code", lang: "python", title: "a class hierarchy, or a parameter", code: `
# GoF: an interface plus a class per algorithm
class SortStrategy(ABC):
    @abstractmethod
    def sort(self, items: list) -> list: ...

class ByPriceStrategy(SortStrategy):
    def sort(self, items): return sorted(items, key=lambda i: i.price)


# Python: the strategy IS the function
def checkout(items: list, sort_by: Callable[[Item], Any] = attrgetter("price")):
    return sorted(items, key=sort_by)


checkout(items)                                  # default
checkout(items, sort_by=attrgetter("name"))      # a different strategy
checkout(items, sort_by=lambda i: (-i.priority, i.name))   # composite
`},
        { t: "p", text: "The GoF version needs a class per algorithm and an interface to unite them. Python passes the algorithm directly — which also means a strategy nobody anticipated works without defining anything. `sorted(key=...)` is the standard library making exactly this choice." }
      ]},
      { label: "Singleton", blocks: [
        { t: "code", lang: "python", title: "three Python answers, all better than __new__", code: `
# 1. A module. Imported once, cached in sys.modules -- already a singleton.
#    settings.py
DATABASE_URL = os.environ["DATABASE_URL"]
TIMEOUT = 30

#    anywhere else
from myapp import settings
settings.TIMEOUT


# 2. A cached factory -- lazy, and clearable in tests
@functools.lru_cache(maxsize=1)
def get_connection_pool() -> Pool:
    return Pool(settings.DATABASE_URL)

get_connection_pool.cache_clear()      # tests can reset it


# 3. A module-level instance, built once at import
_registry = Registry()
`},
        { t: "callout", kind: "trap", title: "The `__new__` singleton is worse than all three", body: [
          { t: "p", text: "It re-runs `__init__` on every call, silently resetting state (Lesson 4.1). It cannot be reset in tests without reaching into the class. And it is global mutable state with all the problems from Lesson 3.3 — order-dependent tests, no ownership, unsafe under concurrency." },
          { t: "p", text: "**Before reaching for any of the three, ask whether you need a singleton at all.** Usually the honest answer is one instance created at the composition root and passed as a parameter — which is testable, has a clear lifetime, and does not constrain future callers to a single instance." }
        ]}
      ]},
      { label: "Builder", blocks: [
        { t: "code", lang: "python", title: "the fluent chain that Python does not need", code: `
# GoF, transliterated: a builder class with a method per field
query = (QueryBuilder()
         .select("id", "name")
         .from_table("users")
         .where("active = true")
         .limit(10)
         .build())


# Python: keyword arguments already do this
@dataclass(frozen=True, kw_only=True)
class Query:
    select: tuple[str, ...]
    table: str
    where: str | None = None
    limit: int | None = None


query = Query(select=("id", "name"), table="users", limit=10)
`},
        { t: "p", text: "Builders exist because Java has no keyword or default arguments, so a constructor with eight optional fields is unusable. Python has both, plus `dataclasses.replace` for incremental construction. **The one case a builder still earns its place** is a genuinely stepwise construction where intermediate states are invalid — a SQL query assembled across several functions, for instance — and even then it is usually a frozen dataclass with `replace`." }
      ]},
      { label: "Visitor", blocks: [
        { t: "code", lang: "python", title: "singledispatch replaces double dispatch", code: `
from functools import singledispatch


# GoF Visitor exists because C++ and Java dispatch on ONE type. Adding
# an operation means a visit_X method per node type, and every node
# class needs an accept() method.

@singledispatch
def to_sql(node: object) -> str:
    raise TypeError(f"no SQL for {type(node).__name__}")


@to_sql.register
def _(node: Column) -> str:
    return node.name


@to_sql.register
def _(node: And) -> str:
    return f"({to_sql(node.left)} AND {to_sql(node.right)})"


# Adding an operation is a new @singledispatch function -- no node class
# is touched, and no accept() method is needed anywhere.
`},
        { t: "p", text: "`match` with class patterns (Lesson 5.5) is the other answer, and reads better when all the cases live in one place. `singledispatch` wins when the cases should be extensible from other modules." }
      ]}
    ]},

    { t: "h2", n: "03", text: "Observer, simplified", id: "observer" },

    {"kind": "flow", "title": "Observer, in Python", "caption": "Subscribers are just callables in a list. Publishing is a loop; no Observer interface, no abstract update method.", "cols": 3, "nodes": [{"id": "pub", "label": "subject", "sub": "handlers: list[Callable]", "tone": "accent"}, {"id": "ev", "label": "notify(event)", "sub": "for h in handlers: h(event)", "tone": "good"}, {"id": "subs", "label": "subscribers", "sub": "any function or bound method", "tone": "warn"}], "edges": [["pub", "ev"], ["ev", "subs"]], "t": "diagram", "id": "dg-4_12-03-0"},



    { t: "p", text: "Observer survives because the problem is real: something needs to notify an unknown set of listeners. What dissolves is the machinery — no `Observer` interface, no `attach`/`detach` ceremony, just callables." },

    { t: "code", lang: "python", title: "the whole pattern", code: `
from __future__ import annotations

import logging
from collections.abc import Callable
from typing import TypeVar

logger = logging.getLogger(__name__)
EventT = TypeVar("EventT")


class Signal[EventT]:
    """A list of callbacks. That is the entire pattern."""

    def __init__(self, name: str) -> None:
        self._name = name
        self._handlers: list[Callable[[EventT], None]] = []

    def connect(self, handler: Callable[[EventT], None]) -> Callable[[EventT], None]:
        self._handlers.append(handler)
        return handler                  # so it works as a decorator

    def disconnect(self, handler: Callable[[EventT], None]) -> None:
        self._handlers.remove(handler)

    def emit(self, event: EventT) -> None:
        for handler in self._handlers:
            try:
                handler(event)
            except Exception:
                # One bad listener must not stop the others, and must
                # not fail the thing that emitted the event.
                logger.exception("%s handler %r failed", self._name, handler)


order_paid: Signal[Order] = Signal("order_paid")


@order_paid.connect                     # connect returns the function
def send_receipt(order: Order) -> None:
    mailer.send(order.email, "Receipt")


@order_paid.connect
def update_analytics(order: Order) -> None:
    analytics.track("order_paid", order.id)


order_paid.emit(order)
`,
      caption: "Handlers are plain functions — no interface to implement, no base class, and a test handler is a `lambda` appending to a list. Returning the function from `connect` is what lets it double as a decorator, the same trick as the registry in Lesson 3.4."
    },

    { t: "callout", kind: "warn", title: "The three decisions an observer implementation must make", body: [
      { t: "ul", items: [
        "**What happens when a handler raises?** Swallowing hides bugs; propagating means one bad listener breaks the publisher. Logging and continuing is usually right — but it must be a decision, not an accident.",
        "**Does emitting keep listeners alive?** A bound method holds its instance (Lesson 4.3), so a signal holding `obj.method` keeps `obj` alive forever. Either require explicit `disconnect`, or store `weakref.WeakMethod`.",
        "**Is emission synchronous?** These handlers run inline, so a slow one blocks the caller. If handlers do I/O, emitting should enqueue rather than call."
      ]},
      { t: "p", text: "Every mature signal library — blinker, Django signals, Qt — makes these three choices explicitly and documents them. A hand-rolled one that does not is where \"why did the order not save?\" bugs come from." }
    ]},

    { t: "h2", n: "04", text: "Adapter and Proxy, which stay", id: "adapter-proxy" },

    { t: "code", lang: "python", title: "Adapter: reshape an interface you do not control", code: `
class StripeGateway:                    # what your code wants (Lesson 4.6)
    def charge(self, amount: Decimal) -> str: ...


class LegacyPaymentAdapter:
    """Adapts a vendor SDK to the PaymentGateway protocol.

    The adapter exists because the vendor's shape is not ours and we
    cannot change theirs. It is thin on purpose: reshaping only, no
    business logic -- otherwise it becomes a place rules hide.
    """

    def __init__(self, client: LegacyClient) -> None:
        self._client = client

    def charge(self, amount: Decimal) -> str:
        # Their API: cents as int, a dict response, errors as codes
        response = self._client.do_payment(int(amount * 100))
        if response["status"] != "OK":
            raise PaymentDeclined(response.get("reason", "unknown"))
        return response["txn_id"]
`,
      caption: "Adapter survives because third-party interfaces are a permanent fact. What shrinks is the ceremony: no `Target` interface to declare, because a `Protocol` describes what your code needs and the adapter satisfies it structurally."
    },

    { t: "code", lang: "python", title: "Proxy: same interface, added behaviour", code: `
class LazyDataset:
    """Loads on first access. The caller cannot tell the difference."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._data: DataFrame | None = None

    def _load(self) -> DataFrame:
        if self._data is None:
            logger.info("loading %s", self._path)
            self._data = read_parquet(self._path)
        return self._data

    # Explicit forwarding for the surface that matters
    def __len__(self) -> int:
        return len(self._load())

    def __iter__(self):
        return iter(self._load())

    def __getattr__(self, name: str):
        # Everything else -- but NOT dunders (Lesson 4.7)
        return getattr(self._load(), name)
`,
      caption: "Proxy survives for lazy loading, access control and instrumentation. `__getattr__` makes it cheap — with the caveat that special methods are looked up on the type, so `__len__` and `__iter__` must be forwarded explicitly."
    },

    { t: "h2", n: "05", text: "State: the transitions are the design", id: "state" },

    {"kind": "cycle", "title": "State: the transitions are the design", "caption": "An order moves through states along allowed edges only; the state machine is a dict of transitions and a check, not a class per state.", "nodes": [{"label": "pending", "tone": "accent"}, {"label": "paid", "tone": "good"}, {"label": "shipped", "tone": "good"}, {"label": "delivered", "tone": "violet"}, {"label": "cancelled", "tone": "crit", "sub": "from pending or paid only"}], "t": "diagram", "id": "dg-4_12-05-1"},



    { t: "ladder",
      title: "An order moving through its lifecycle",
      rungs: [
        { level: "bad", label: "Booleans and conditionals", why: "invalid states are representable",
          code: `class Order:
    def __init__(self):
        self.is_paid = False
        self.is_shipped = False
        self.is_cancelled = False

    def ship(self):
        if self.is_paid and not self.is_cancelled:
            self.is_shipped = True`,
          note: "Three booleans describe eight states and only four are valid — `is_shipped and is_cancelled` is representable and meaningless (Lesson 3.2). Every method re-derives the rules, and they drift apart." },

        { level: "ok", label: "An enum plus a transition table", why: "invalid states unrepresentable",
          code: `class Status(Enum):
    PENDING = auto()
    PAID = auto()
    SHIPPED = auto()
    CANCELLED = auto()


# The design, as data. Readable, testable, and impossible to
# contradict from a method body.
TRANSITIONS: dict[Status, frozenset[Status]] = {
    Status.PENDING:   frozenset({Status.PAID, Status.CANCELLED}),
    Status.PAID:      frozenset({Status.SHIPPED, Status.CANCELLED}),
    Status.SHIPPED:   frozenset(),
    Status.CANCELLED: frozenset(),
}


class Order:
    def __init__(self) -> None:
        self.status = Status.PENDING

    def transition_to(self, new: Status) -> None:
        if new not in TRANSITIONS[self.status]:
            raise InvalidTransition(
                f"cannot go from {self.status.name} to {new.name}; "
                f"allowed: {sorted(s.name for s in TRANSITIONS[self.status])}"
            )
        self.status = new`,
          note: "One place defines the machine. Adding a state is a table entry, the rules can be tested without constructing an order, and `SHIPPED` mapping to an empty frozenset states that it is terminal — which the boolean version could only imply." },

        { level: "best", label: "A class per state, when states carry behaviour", why: "the GoF version, earned",
          code: `class OrderState(Protocol):
    name: str
    def ship(self, order: Order) -> OrderState: ...
    def cancel(self, order: Order) -> OrderState: ...


class Paid:
    name = "paid"

    def ship(self, order: Order) -> OrderState:
        order.reserve_stock()
        order.notify("shipped")
        return Shipped()

    def cancel(self, order: Order) -> OrderState:
        order.refund()              # only Paid knows a refund is needed
        return Cancelled()`,
          note: "This is the full State pattern, and it earns its place only when **each state does different work** — cancelling from `PENDING` releases a hold, from `PAID` issues a refund. If states differ only in which transitions are allowed, the table is better: less code, and the machine is visible in one place rather than scattered across classes." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Dissolve three patterns, keep one",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A codebase written by a Java team contains four patterns. Three are ceremony that Python features replace; one is doing real work and should stay, in a Python form." },
        { t: "p", text: "Convert all four and justify the one you keep." }
      ],
      requirements: [
        "**A.** `PricingStrategy` ABC with three one-method subclasses.",
        "**B.** `ConfigSingleton` using `__new__` to cache an instance.",
        "**C.** `NotificationFactory` — a class whose only method returns a notifier by name.",
        "**D.** `PaymentAdapter` wrapping a vendor SDK whose interface differs from yours.",
        "For each: state the pattern, whether it survives, and what Python feature replaces it if not.",
        "Identify the bug in the singleton that its own design causes.",
        "Write a test proving the pricing rules are testable without constructing anything.",
        "Write a test showing the adapter translates the vendor's error shape."
      ],
      hint: "For B, trace what happens on the second call to `ConfigSingleton(...)`. The answer is in Lesson 4.1.",
      solution: {
        lang: "python",
        title: "patterns.py",
        code: `# =========================================================================
# A. STRATEGY  ->  DISSOLVES into functions and a dict
# =========================================================================
#
# Original: an ABC plus StandardPricing, PremiumPricing, BulkPricing --
# three classes, one method each, differing by a multiplier and a
# threshold. A single-method interface is a function (Lesson 3.4).

from __future__ import annotations

from collections.abc import Callable
from decimal import Decimal
from enum import Enum, auto
from functools import lru_cache
from typing import Protocol

PricingRule = Callable[[Decimal, int], Decimal]


def standard(unit_price: Decimal, quantity: int) -> Decimal:
    return unit_price * quantity


def premium(unit_price: Decimal, quantity: int) -> Decimal:
    return unit_price * quantity * Decimal("0.9")


def bulk(unit_price: Decimal, quantity: int) -> Decimal:
    discount = Decimal("0.8") if quantity >= 100 else Decimal("1")
    return unit_price * quantity * discount


PRICING: dict[str, PricingRule] = {
    "standard": standard,
    "premium": premium,
    "bulk": bulk,
}


def price(unit_price: Decimal, quantity: int, tier: str = "standard") -> Decimal:
    try:
        return PRICING[tier](unit_price, quantity)
    except KeyError:
        raise ValueError(f"unknown tier {tier!r}; have {sorted(PRICING)}") from None


# =========================================================================
# B. SINGLETON  ->  DISSOLVES into a cached factory
# =========================================================================
#
# THE BUG IN THE ORIGINAL:
#
#   class ConfigSingleton:
#       _instance = None
#       def __new__(cls, **kwargs):
#           if cls._instance is None:
#               cls._instance = super().__new__(cls)
#           return cls._instance
#       def __init__(self, **kwargs):
#           self.settings = kwargs        # RE-RUNS every call
#
#   a = ConfigSingleton(debug=True)
#   b = ConfigSingleton()                 # __init__ runs again
#   a.settings                            # {} -- wiped
#
# Python calls __init__ on whatever __new__ returns, so every
# ConfigSingleton(...) re-initialises the shared instance (Lesson 4.1).
# It is also untestable: no way to reset it between tests.


class Settings:
    """A plain class. Nothing about it is a singleton."""

    def __init__(self, *, database_url: str, timeout: int = 30) -> None:
        self.database_url = database_url
        self.timeout = timeout


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """One instance per process, created lazily.

    lru_cache gives the singleton behaviour AND a way out:
    get_settings.cache_clear() resets it, so tests are independent.
    """
    import os
    return Settings(database_url=os.environ["DATABASE_URL"])


# =========================================================================
# C. FACTORY  ->  DISSOLVES into a function
# =========================================================================
#
# Original: class NotificationFactory with one method, create(kind).
# A class whose only purpose is to hold one method is a function
# (Lesson 4.1), and the registry is a dict.

NOTIFIERS: dict[str, Callable[[], Notifier]] = {}


def notifier(kind: str):
    """Register a constructor for one notifier kind."""
    def register(factory: Callable[[], Notifier]) -> Callable[[], Notifier]:
        if kind in NOTIFIERS:
            raise ValueError(f"duplicate notifier for {kind!r}")
        NOTIFIERS[kind] = factory
        return factory
    return register


@notifier("email")
def _email() -> Notifier:
    return EmailNotifier(get_settings().smtp_host)


@notifier("slack")
def _slack() -> Notifier:
    return SlackNotifier(get_settings().slack_token)


def make_notifier(kind: str) -> Notifier:
    try:
        return NOTIFIERS[kind]()
    except KeyError:
        raise ValueError(f"unknown notifier {kind!r}; have {sorted(NOTIFIERS)}") from None


# =========================================================================
# D. ADAPTER  ->  SURVIVES
# =========================================================================
#
# It survives because the problem is not a missing language feature:
# a third-party interface has a shape we do not control and cannot
# change. No amount of first-class functions makes the vendor's
# do_payment(cents: int) -> dict into our charge(Decimal) -> str.
#
# What DOES shrink is the ceremony. GoF needs a Target interface for
# the adapter to implement; a Protocol describes what our code requires
# and the adapter satisfies it structurally (Lesson 4.6).


class PaymentDeclined(Exception):
    """The gateway refused the charge."""


class PaymentGateway(Protocol):
    """What our code requires. Nothing inherits from this.

    Raises:
        PaymentDeclined: the charge was refused.
    """
    def charge(self, amount: Decimal) -> str: ...


class VendorAdapter:
    """Adapts the vendor SDK to PaymentGateway.

    Deliberately thin: it translates shapes and error conventions and
    contains no business logic. An adapter that grows rules becomes a
    place they hide, invisible to anyone reading either side.
    """

    def __init__(self, client: VendorClient) -> None:
        self._client = client

    def charge(self, amount: Decimal) -> str:
        # Three translations: units, response shape, error convention.
        response = self._client.do_payment(cents=int(amount * 100))

        if response["status"] != "OK":
            # Their errors are codes in a dict; ours are exceptions.
            raise PaymentDeclined(response.get("reason", "unknown"))

        return response["txn_id"]


# =========================================================================
# tests
# =========================================================================

def test_pricing_rules_need_no_objects() -> None:
    """The payoff of dissolving Strategy: the rules are functions."""
    assert standard(Decimal("10"), 3) == Decimal("30")
    assert premium(Decimal("10"), 3) == Decimal("27.0")
    assert bulk(Decimal("10"), 100) == Decimal("800.0")
    assert bulk(Decimal("10"), 99) == Decimal("990")      # under threshold

    assert price(Decimal("10"), 3, tier="premium") == Decimal("27.0")

    try:
        price(Decimal("10"), 1, tier="platinum")
    except ValueError as exc:
        assert "platinum" in str(exc) and "bulk" in str(exc)
    else:
        raise AssertionError("expected ValueError")


def test_settings_singleton_is_resettable() -> None:
    """What the __new__ version could not do."""
    import os

    os.environ["DATABASE_URL"] = "postgres://one"
    get_settings.cache_clear()
    assert get_settings().database_url == "postgres://one"
    assert get_settings() is get_settings()        # same instance

    os.environ["DATABASE_URL"] = "postgres://two"
    get_settings.cache_clear()                     # tests stay independent
    assert get_settings().database_url == "postgres://two"


def test_adapter_translates_the_vendor_error_shape() -> None:
    class FakeVendor:
        def __init__(self, status: str, reason: str = "") -> None:
            self.status, self.reason = status, reason
            self.cents_received: int | None = None

        def do_payment(self, cents: int) -> dict:
            self.cents_received = cents
            if self.status == "OK":
                return {"status": "OK", "txn_id": "txn_1"}
            return {"status": self.status, "reason": self.reason}

    # Success: units converted, id extracted
    vendor = FakeVendor("OK")
    assert VendorAdapter(vendor).charge(Decimal("19.99")) == "txn_1"
    assert vendor.cents_received == 1999          # Decimal -> int cents

    # Failure: a status code becomes an exception
    declined = FakeVendor("DECLINED", "insufficient funds")
    try:
        VendorAdapter(declined).charge(Decimal("5"))
    except PaymentDeclined as exc:
        assert "insufficient funds" in str(exc)
    else:
        raise AssertionError("expected PaymentDeclined")


if __name__ == "__main__":
    test_pricing_rules_need_no_objects()
    test_settings_singleton_is_resettable()
    test_adapter_translates_the_vendor_error_shape()
    print("A, B, C dissolved; D kept")`,
        notes: [
          { t: "p", text: "**The singleton bug is the one worth internalising.** Python calls `__init__` on whatever `__new__` returns, so `ConfigSingleton()` after `ConfigSingleton(debug=True)` re-runs the initialiser and wipes the settings. It fails silently — the object exists and its state is simply gone — and there is no way to reset it between tests." },
          { t: "p", text: "**`lru_cache(maxsize=1)` gives you the singleton behaviour plus an exit.** `cache_clear()` is what makes the tests independent, which the `__new__` version made impossible. That is the general shape: prefer a mechanism that lets you opt out over one that enforces global state." },
          { t: "p", text: "**The adapter test asserts `cents_received == 1999`**, not just the return value. The unit conversion is the most likely place an adapter is wrong, and it is invisible in the success path — a bug there charges the wrong amount while returning a perfectly valid transaction id." },
          { t: "callout", kind: "insight", title: "Why the adapter survives and the factory does not", body: [
            { t: "p", text: "Both wrap something. The difference is what problem they solve. `NotificationFactory` existed because Java needs a class to hold a method — Python does not, so it dissolves into a function and a dict." },
            { t: "p", text: "`VendorAdapter` exists because a third-party interface has a shape you cannot change. No language feature removes that, which is why Adapter, Proxy, Observer, State and Template Method survive while Strategy, Command, Factory, Builder and Singleton dissolve: **the survivors solve design forces, the rest solved missing syntax.**" }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A senior hire introduces a patterns-based architecture. Six months later the service has an abstract factory per entity, strategy classes with one implementation each, and a `Builder` for a dataclass with four fields. A one-line change touches five files, and new engineers take a month to find where anything happens." },
      { t: "p", text: "**The patterns were transliterated, not translated.** Every one of them exists in the GoF catalogue because C++ and Java lack something Python has: first-class functions, keyword arguments, module-level singletons, structural typing. Applying the C++ solution in a language that does not have the C++ problem adds indirection and removes nothing." },
      { t: "p", text: "**The diagnostic question for any abstraction is what variation it absorbs.** A strategy interface with one implementation absorbs none. A builder for a dataclass with keyword arguments absorbs none. A factory that only calls a constructor absorbs none. Delete them and inline — extracting the abstraction later, with the real second requirement in hand, takes minutes and produces a better fit." },
      { t: "p", text: "The patterns are not wrong; they are **answers to questions**, and the questions were about C++. Read the *force* each pattern resolves — \"an algorithm must vary\", \"a third-party interface has the wrong shape\" — and ask whether Python already resolves it. Half the time it does." }
    ]}
  ],

  takeaways: [
    "**Roughly half the GoF patterns are workarounds for missing language features.** Strategy, Command, Factory Method, Abstract Factory, Builder, Iterator and Singleton all dissolve into Python features.",
    "**Strategy is a function**; a family of strategies is a dict of functions. `sorted(key=...)` is the standard library making this choice.",
    "**A module is already a singleton** — imported once, cached in `sys.modules`. For lazy construction, `@lru_cache(maxsize=1)` on a factory gives the same behaviour *plus* `cache_clear()` for tests.",
    "**The `__new__` singleton is the worst option:** `__init__` re-runs on every call and silently resets state, and there is no way to reset it in tests.",
    "**Builder exists because Java lacks keyword and default arguments.** A frozen dataclass with `kw_only=True` and `replace()` covers it.",
    "**Visitor's double dispatch has a library answer:** `functools.singledispatch` for extensibility across modules, `match` with class patterns when the cases belong together.",
    "**Observer survives, minus the machinery** — a list of callables. Three decisions must be explicit: what happens when a handler raises, whether listeners are kept alive, and whether emission is synchronous.",
    "**Adapter and Proxy survive** because a third-party interface with the wrong shape is not a missing language feature. An adapter must stay thin — one that grows business logic becomes a place rules hide.",
    "**State survives as a transition table** when states differ only in allowed moves, and as classes when each state does different work.",
    "**Template Method survives as an ABC** because it needs real shared implementation — the base owns the sequence and its invariants.",
    "The test for any pattern: **what variation does this absorb?** One implementation and no second one planned means it absorbs none. Delete and inline."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does the Strategy pattern largely dissolve in Python?",
        options: [
          "Python is too dynamic for strategies to be type-safe",
          "Functions are first-class, so the strategy is a parameter — a class per algorithm plus a uniting interface is machinery for something the language does directly",
          "Strategies are better expressed as inheritance in Python",
          "It does not dissolve; it is still the recommended approach"
        ],
        answer: 1,
        why: "GoF Strategy needs an interface and a class per algorithm because C++ and Java cannot pass a function as a value. Python can, so `sorted(items, key=...)` and `checkout(items, sort_by=...)` express it directly — and a strategy nobody anticipated works without defining anything. It becomes a class again only when a strategy carries real state or several related methods."
      },
      {
        stem: "What is the bug in a singleton implemented by caching an instance in `__new__`?",
        options: [
          "The cached instance is garbage-collected between calls",
          "`__init__` runs on every call, re-initialising the shared instance and silently wiping its state",
          "Subclasses cannot inherit the singleton behaviour",
          "`__new__` cannot access class attributes"
        ],
        answer: 1,
        why: "Python calls `__init__` on whatever `__new__` returns, whether freshly allocated or cached. So `Config(debug=True)` followed by `Config()` re-runs the initialiser and resets the settings — silently, since the object exists and only its state is gone. It is also untestable, with no way to reset between tests. `@lru_cache(maxsize=1)` on a factory gives the same behaviour plus `cache_clear()`."
      },
      {
        stem: "Which pattern survives in Python essentially unchanged, and why?",
        options: [
          "Builder — Python's keyword arguments make fluent construction natural",
          "Adapter — a third-party interface with the wrong shape is a design force, not a missing language feature",
          "Abstract Factory — Python needs classes to group related constructors",
          "Command — Python has no way to bind arguments to a callable"
        ],
        answer: 1,
        why: "Adapter solves a problem no language feature removes: a vendor's `do_payment(cents: int) -> dict` cannot become your `charge(Decimal) -> str` by any amount of first-class-function support. What shrinks is the ceremony — a `Protocol` replaces the declared Target interface. Builder dissolves into keyword arguments, Abstract Factory into a function, and Command into `functools.partial`."
      },
      {
        stem: "An order lifecycle is modelled with three boolean flags. What is the strongest objection?",
        options: [
          "Booleans are slower to compare than enum members",
          "Three booleans describe eight states of which only four are valid, so invalid combinations are representable and every method re-derives the rules",
          "Flags cannot be serialised to a database column",
          "The State pattern requires a class per state"
        ],
        answer: 1,
        why: "`is_shipped and is_cancelled` is expressible and meaningless — the type permits states the domain does not. Worse, the transition rules live inside each method that checks them, so they drift apart as the class grows. An enum plus a transition table makes invalid states unrepresentable and puts the machine in one testable place. A class per state is warranted only when each state performs different work."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Which design patterns are still useful in Python?",
        strong: "Adapter, Proxy, Observer, State and Template Method — because they solve design forces rather than missing syntax. Strategy, Command, Factory Method, Builder, Iterator and Singleton dissolve, because Python has first-class functions, keyword arguments, a language iteration protocol and modules that are already singletons.",
        answer: [
          { t: "p", text: "The organising insight is worth leading with: the GoF catalogue was written for C++ in 1994, and a large share of it is workarounds for features Python has. Sorting the patterns by *what force they resolve* is more useful than reciting the list." },
          { t: "p", text: "One concrete example each way makes it land. Strategy becomes a `key=` parameter; Adapter stays because a vendor's interface shape is not something a language feature can change." },
          { t: "p", text: "The practical test to offer: **what variation does this abstraction absorb?** One implementation with no second one planned means none, and the pattern is ceremony." }
        ]
      },
      {
        level: "core",
        q: "How would you implement a singleton in Python?",
        strong: "Usually by not needing one — construct one instance at the composition root and pass it as a parameter. Where a process-wide instance is genuinely right, a module is already a singleton, and `@lru_cache(maxsize=1)` on a factory gives lazy construction plus `cache_clear()` for tests.",
        answer: [
          { t: "p", text: "Questioning the premise first is the strongest move: most singletons are global mutable state with all the problems from earlier in the course — order-dependent tests, no ownership, unsafe under concurrency." },
          { t: "p", text: "The `__new__` version is worth knowing specifically so you can explain why it is wrong: `__init__` re-runs on every call and silently resets state, and it cannot be reset between tests." },
          { t: "p", text: "`cache_clear()` is the detail that shows practical experience — the ability to opt out is what makes the cached-factory version usable in a test suite." }
        ]
      },
      {
        level: "expert",
        q: "A team has applied SOLID and design patterns thoroughly, and the codebase is now harder to work in. What happened?",
        strong: "They transliterated the patterns rather than translating them. Abstract factories, builders and strategy hierarchies exist because C++ and Java lack first-class functions and keyword arguments — applying the C++ solution in a language without the C++ problem adds indirection and removes nothing.",
        answer: [
          { t: "p", text: "The distinction to draw explicitly is between the principle and the implementation. \"An algorithm should be substitutable\" is sound; \"therefore define an interface and a class per algorithm\" is a Java mechanism for achieving it." },
          { t: "p", text: "The remedy is concrete and reassuring: delete the abstractions that absorb no variation and inline them. Extracting an abstraction later, with the real second requirement in hand, takes minutes and produces a better fit than one guessed at in advance." },
          { t: "p", text: "Closing on how to read a pattern rather than apply it shows seniority — every pattern description names a force it resolves, and the useful question is whether Python already resolves that force. Roughly half the time it does." }
        ],
        weak: "Concluding that patterns are useless or that the team was wrong to care about design. The instinct was right; the translation step was skipped."
      }
    ]
  }
});
