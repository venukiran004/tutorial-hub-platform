/* ============================================================================
   LESSON 4.4 — Encapsulation and Properties
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "Python has **no private attributes**. It has a convention — a leading underscore — that every tool and every reader respects, and that the language does not enforce. That sounds weaker than `private` in Java, and in practice it produces better designs: because you cannot hide a field, you start with a plain attribute and add a property only when there is something real to enforce.",

  objectives: [
    "Explain what `_name` and `__name` actually do, and what neither does",
    "Start with plain attributes and add a property only when behaviour is needed",
    "Write properties that validate, compute, or protect an invariant",
    "Recognise the getter-and-setter-for-everything anti-pattern",
    "Choose between a property, a method, and a frozen dataclass"
  ],

  prerequisites: ["4.1", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "What the underscores do", id: "underscores" },

    { t: "code", lang: "python", title: "one convention, one mechanism", code: `
class Account:
    def __init__(self, balance: int) -> None:
        self.balance = balance        # public
        self._pending = 0             # convention: not part of the API
        self.__internal = "secret"    # name mangling, not privacy


a = Account(100)

print(a.balance)
print(a._pending)                     # works. Nothing stops you.
# print(a.__internal)                 # AttributeError -- but see below
print(a._Account__internal)           # the mangled name. Still reachable.
print([n for n in vars(a)])
`,
      out: `100
0
secret
['balance', '_pending', '_Account__internal']`
    },

    { t: "dl", items: [
      ["`_name` — one underscore", "**A convention only.** It says *this is not part of the public API and may change without notice*. Python does nothing to enforce it; `from module import *` skips such names, and that is the extent of the mechanism."],
      ["`__name` — two underscores", "**Name mangling**, not privacy. Inside class `C`, `__x` is rewritten to `_C__x`. That is all. It is still reachable, and it exists to prevent *accidental collisions* in subclasses — not to prevent access."],
      ["`__name__` — dunder", "Reserved for the language. Never invent your own; new dunders are added in new Python versions and yours may collide."]
    ]},

    { t: "callout", kind: "trap", title: "Double underscore is not `private`", body: [
      { t: "p", text: "People reach for `__x` believing it hides the attribute. It does not — it renames it, and the mangled name is trivially guessable. What it does do is break things you probably wanted:" },
      { t: "code", lang: "python", title: "what mangling actually costs you", numbered: false, code: `
class Base:
    def __init__(self) -> None:
        self.__value = 1              # becomes _Base__value

    def get(self) -> int:
        return self.__value


class Child(Base):
    def __init__(self) -> None:
        super().__init__()
        self.__value = 2              # becomes _Child__value -- a DIFFERENT
                                      # attribute, not an override


c = Child()
print(c.get(), c._Base__value, c._Child__value)
print(sorted(vars(c)))`,
        out: `1 1 2
['_Base__value', '_Child__value']`},
      { t: "p", text: "That isolation is exactly what mangling is *for* — a base class using `__x` cannot have it clobbered by a subclass that happens to pick the same name. It is genuinely useful when writing a base class in a library that strangers will subclass." },
      { t: "p", text: "**For ordinary application code, use a single underscore.** Mangling makes debugging harder, confuses `getattr` and serialisation, and buys protection against a problem you do not have." }
    ]},

    { t: "callout", kind: "insight", title: "Why \"we are all consenting adults\" produces better designs", body: [
      { t: "p", text: "Because you cannot hide a field, there is no incentive to wrap every attribute in a getter and setter *just in case*. You start with `self.balance = balance` — the simplest thing — and the option to add behaviour later is always open, because **a property is a drop-in replacement for an attribute**." },
      { t: "p", text: "In a language with enforced privacy, changing a public field to a method is a breaking change, so defensive accessors are written up front for everything. In Python that pressure does not exist: `account.balance` reads identically whether it is a plain attribute or a property with validation behind it. That single fact is why idiomatic Python has far fewer accessors than idiomatic Java." }
    ]},

    { t: "h2", n: "02", text: "Start plain, add a property when needed", id: "start-plain" },

    { t: "ladder",
      title: "A temperature reading",
      rungs: [
        { level: "bad", label: "Accessors for everything", why: "Java in Python",
          code: `class Reading:
    def __init__(self, celsius):
        self._celsius = celsius

    def get_celsius(self):
        return self._celsius

    def set_celsius(self, value):
        self._celsius = value


r = Reading(20)
r.set_celsius(r.get_celsius() + 5)`,
          note: "Eight lines to do what `self.celsius = celsius` does in one, and the call site is worse: `r.set_celsius(r.get_celsius() + 5)` instead of `r.celsius += 5`. The accessors add no behaviour — they are pure ceremony, written against a change that Python does not require." },

        { level: "ok", label: "A plain attribute", why: "the correct starting point",
          code: `class Reading:
    def __init__(self, celsius: float) -> None:
        self.celsius = celsius


r = Reading(20)
r.celsius += 5`,
          note: "This is the right default. If validation or a computed value is needed later, a property replaces the attribute with no change to any call site — which is precisely why writing accessors defensively is unnecessary." },

        { level: "best", label: "A property, once there is something to enforce", why: "behaviour, not ceremony",
          code: `class Reading:
    """A temperature reading. Below absolute zero is not a value."""

    ABSOLUTE_ZERO_C: ClassVar[float] = -273.15

    def __init__(self, celsius: float) -> None:
        self.celsius = celsius        # goes through the setter, so the
                                      # invariant holds from construction

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < self.ABSOLUTE_ZERO_C:
            raise ValueError(
                f"{value} C is below absolute zero"
            )
        self._celsius = value

    @property
    def fahrenheit(self) -> float:
        """Derived, so it cannot disagree with celsius."""
        return self._celsius * 9 / 5 + 32`,
          note: "Now the property earns its place three times over. The setter enforces an invariant that cannot be violated even from `__init__`, because the assignment there goes through it. `fahrenheit` is computed rather than stored, so the two values can never drift apart. And the call site is unchanged: `r.celsius += 5` still works, and now raises if it would go below absolute zero." }
      ]
    },

    { t: "callout", kind: "good", title: "The three things a property is for", body: [
      { t: "ol", items: [
        "**Validation on assignment** — an invariant the object must always satisfy, enforced at the one place values enter.",
        "**A computed value** — derived from other attributes, so it cannot become stale or contradict them.",
        "**A compatibility shim** — a name that used to be a plain attribute and now needs behaviour, with no call site changed."
      ]},
      { t: "p", text: "If none of those apply, a plain attribute is correct. **A property that only stores and returns is a plain attribute with three extra lines and a slower lookup.**" }
    ]},

    { t: "h2", n: "03", text: "Read-only and computed properties", id: "read-only" },

    { t: "code", lang: "python", title: "a getter with no setter is read-only", code: `
from decimal import Decimal
from functools import cached_property


class Order:
    def __init__(self, lines: list[Line]) -> None:
        self._lines = tuple(lines)          # frozen at construction

    @property
    def lines(self) -> tuple[Line, ...]:
        """Read-only view. Callers cannot append (Lesson 2.5)."""
        return self._lines

    @property
    def subtotal(self) -> Decimal:
        """Cheap and always current -- recomputed on every access."""
        return sum((l.amount for l in self._lines), start=Decimal("0"))

    @cached_property
    def risk_score(self) -> float:
        """Expensive. Computed once, then stored on the instance."""
        return run_expensive_model(self._lines)


order = Order([...])
order.subtotal              # fine to call in a loop
order.risk_score            # first access computes
order.risk_score            # subsequent accesses are free
order.lines = []            # AttributeError: property has no setter
`,
      caption: "No setter means assignment raises `AttributeError` — which is the closest Python gets to a read-only field, and it is enough. `cached_property` replaces itself with the value in the instance dict on first access, so later reads are plain attribute lookups."
    },

    { t: "callout", kind: "trap", title: "`cached_property` on mutable state goes stale", body: [
      { t: "code", lang: "python", title: "the failure", numbered: false, code: `
class Cart:
    def __init__(self) -> None:
        self.items: list[Item] = []

    @cached_property
    def total(self) -> Decimal:
        return sum(i.price for i in self.items)


cart = Cart()
cart.items.append(Item(price=Decimal("10")))
print(cart.total)                 # 10 -- computed and cached

cart.items.append(Item(price=Decimal("5")))
print(cart.total)                 # 10 -- STALE. The cache never invalidates.`},
      { t: "p", text: "`cached_property` computes once and never again. It is correct only for values derived from state that **cannot change after construction** — which in practice means a frozen object, or an attribute you are disciplined about." },
      { t: "p", text: "**Two safe patterns:** use a plain `property` when the underlying state is mutable and the computation is cheap, or freeze the object (`@dataclass(frozen=True)`) so staleness is impossible by construction. If you must cache on mutable state, invalidate explicitly with `del self.__dict__[\"total\"]` — and treat that as a sign the design wants rethinking." }
    ]},

    { t: "h2", n: "04", text: "Properties that lie", id: "properties-that-lie" },

    { t: "callout", kind: "warn", title: "A property should behave like an attribute", body: [
      { t: "p", text: "Callers read `order.total` and assume attribute semantics: cheap, no side effects, no exceptions beyond the obvious. A property that violates that is worse than a method, because the syntax hides the cost." },
      { t: "code", lang: "python", title: "three properties that should be methods", numbered: false, code: `
class Order:
    @property
    def customer(self) -> Customer:
        return db.fetch_customer(self.customer_id)     # NETWORK I/O

    @property
    def is_valid(self) -> bool:
        self._normalise()                              # SIDE EFFECT
        return not self._errors

    @property
    def receipt(self) -> bytes:
        return render_pdf(self)                        # 400ms of work`},
      { t: "p", text: "The first is the worst. `order.customer` looks free, so someone writes `for o in orders: print(o.customer.name)` and produces an N+1 query pattern (Lesson 13.6) that no code review would catch, because the line looks like attribute access." },
      { t: "p", text: "**Make it a method whenever it does I/O, has a side effect, or is expensive.** `order.fetch_customer()` and `order.render_receipt()` cost nothing extra to write and tell the reader what they are paying for. The parentheses are the signal." }
    ]},

    { t: "table",
      head: ["Use a property when", "Use a method when"],
      rows: [
        ["It is conceptually an **attribute** — a value the object has", "It is an **action** the object performs"],
        ["It is cheap — no I/O, no significant computation", "It does I/O, or takes measurable time"],
        ["It has no side effects", "It changes state, writes, or sends something"],
        ["It takes no arguments", "It needs arguments"],
        ["Repeated access is safe and idempotent", "Calling it twice is meaningfully different from once"]
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Add encapsulation only where it earns its place",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The class below has been written in a Java style: every field has a getter and a setter, none of which do anything. It also has three real problems that the accessors do nothing to prevent." },
        { t: "p", text: "Strip the ceremony, then add properties only where there is genuine behaviour — and identify the property that should be a method." }
      ],
      requirements: [
        "Remove every accessor that only stores and returns; use plain attributes instead.",
        "Add a property where there is a real invariant to enforce, and make it hold from construction too.",
        "Convert the value that can drift out of sync into a computed property.",
        "Identify the property that does I/O and convert it to a method; explain the bug the property form invites.",
        "Expose the internal collection so callers cannot mutate it.",
        "Write a test proving the invariant cannot be violated, including via `__init__`.",
        "Write a test proving the computed value cannot go stale."
      ],
      hint: "The invariant test should try three routes: the constructor, direct assignment, and augmented assignment. If any of them gets past the check, the property is not doing its job.",
      solution: {
        lang: "python",
        title: "subscription.py",
        code: `# ---- the original ------------------------------------------------------

class Subscription:
    def __init__(self, seats, price_per_seat):
        self._seats = seats
        self._price_per_seat = price_per_seat
        self._total = seats * price_per_seat      # PROBLEM: can drift
        self._addons = []

    def get_seats(self):
        return self._seats

    def set_seats(self, value):
        self._seats = value                       # PROBLEM: no validation,
                                                  # and _total is now wrong

    def get_price_per_seat(self):
        return self._price_per_seat

    def set_price_per_seat(self, value):
        self._price_per_seat = value

    def get_total(self):
        return self._total

    def get_addons(self):
        return self._addons                       # PROBLEM: hands out the
                                                  # real list (Lesson 2.5)

    @property
    def account(self):
        return db.fetch_account(self._account_id)  # PROBLEM: I/O behind
                                                   # attribute syntax


# ---- the redesign ------------------------------------------------------

from __future__ import annotations

from collections.abc import Iterator
from decimal import Decimal
from typing import ClassVar


class Subscription:
    """A seat-based subscription.

    seats is the only field with a real invariant, so it is the only one
    with a property. total is derived, so it cannot drift. Everything
    else is a plain attribute -- accessors that only store and return
    are ceremony, and a property can replace an attribute later with no
    call site changed.
    """

    MAX_SEATS: ClassVar[int] = 10_000

    def __init__(
        self,
        seats: int,
        price_per_seat: Decimal,
        account_id: str,
    ) -> None:
        # Assigning through the property means the invariant holds from
        # construction -- setting self._seats directly would bypass it.
        self.seats = seats

        # No invariant, no behaviour: a plain attribute.
        self.price_per_seat = price_per_seat
        self.account_id = account_id

        self._addons: list[str] = []

    # ---- the one property with a real invariant ----

    @property
    def seats(self) -> int:
        return self._seats

    @seats.setter
    def seats(self, value: int) -> None:
        # bool is an int subclass, so True would otherwise pass (Lesson 1.8)
        if isinstance(value, bool) or not isinstance(value, int):
            raise TypeError(f"seats must be an int, got {type(value).__name__}")
        if not 1 <= value <= self.MAX_SEATS:
            raise ValueError(
                f"seats must be 1-{self.MAX_SEATS}, got {value}"
            )
        self._seats = value

    # ---- derived, so it cannot drift ----

    @property
    def total(self) -> Decimal:
        """Computed on every access.

        The original stored this at construction, so changing seats left
        it wrong with nothing to notice. Deriving it makes the two
        values incapable of disagreeing.
        """
        return self.price_per_seat * self.seats

    # ---- a read-only view of the collection ----

    @property
    def addons(self) -> tuple[str, ...]:
        """A snapshot. Callers cannot append through this."""
        return tuple(self._addons)

    def add_addon(self, name: str) -> None:
        """The only way in, so any future rule has one place to live."""
        if name in self._addons:
            raise ValueError(f"{name!r} is already added")
        self._addons.append(name)

    # Iteration and length work without exposing the list at all, so
    # most callers never need .addons (Lesson 4.9).
    def __iter__(self) -> Iterator[str]:
        return iter(self._addons)

    def __len__(self) -> int:
        return len(self._addons)

    # ---- I/O: a METHOD, not a property ----

    def fetch_account(self) -> Account:
        """Load the owning account. Hits the database.

        A property here would invite the N+1 pattern: because
        sub.account looks like attribute access, someone writes
        "for s in subs: print(s.account.name)" and issues one query per
        subscription. Nothing in the line reveals the cost, so review
        does not catch it. The parentheses are the warning.
        """
        return db.fetch_account(self.account_id)


# ---- tests -------------------------------------------------------------

def test_invariant_holds_by_every_route() -> None:
    """Three routes in. All three must be blocked."""
    # 1. the constructor
    for bad in (0, -5, 10_001, True, "3"):
        try:
            Subscription(bad, Decimal("10"), "acct-1")
        except (ValueError, TypeError):
            pass
        else:
            raise AssertionError(f"constructor accepted {bad!r}")

    sub = Subscription(5, Decimal("10"), "acct-1")

    # 2. direct assignment
    try:
        sub.seats = 0
    except ValueError:
        pass
    else:
        raise AssertionError("assignment bypassed the check")

    # 3. augmented assignment -- expands to a read then a write, so it
    #    goes through the setter too
    try:
        sub.seats -= 99
    except ValueError:
        pass
    else:
        raise AssertionError("augmented assignment bypassed the check")

    assert sub.seats == 5      # unchanged by the failed attempts


def test_total_cannot_go_stale() -> None:
    """The bug the original had: total stored at construction."""
    sub = Subscription(2, Decimal("10.00"), "acct-1")
    assert sub.total == Decimal("20.00")

    sub.seats = 5
    assert sub.total == Decimal("50.00")       # would still be 20 before

    sub.price_per_seat = Decimal("12.00")
    assert sub.total == Decimal("60.00")


def test_addons_cannot_be_mutated_from_outside() -> None:
    sub = Subscription(1, Decimal("10"), "acct-1")
    sub.add_addon("sso")

    snapshot = sub.addons
    assert isinstance(snapshot, tuple)

    # The only route in is add_addon, so its rules always apply
    try:
        sub.add_addon("sso")
    except ValueError:
        pass
    else:
        raise AssertionError("duplicate addon was accepted")

    assert len(sub) == 1
    assert list(sub) == ["sso"]


if __name__ == "__main__":
    test_invariant_holds_by_every_route()
    test_total_cannot_go_stale()
    test_addons_cannot_be_mutated_from_outside()
    print("encapsulation where it earns its place")`,
        notes: [
          { t: "p", text: "**`self.seats = seats` in `__init__` is the detail that matters most.** Assigning to `self._seats` directly would bypass the setter, so an invalid value could enter at construction and every later assignment would be validated — protecting the object from everything except its own creation. Going through the property means the invariant holds from the first moment." },
          { t: "p", text: "**The augmented-assignment test exists because `-=` is easy to overlook.** `sub.seats -= 99` expands to a read followed by a write, so it passes through the setter — but only if the setter is actually the write path. It is a cheap test that catches a real hole." },
          { t: "p", text: "**`total` went from stored to derived**, which is the fix for a whole family of bugs. The original computed it once in `__init__`, so `set_seats` left it silently wrong. A derived value cannot disagree with its inputs, and that is worth more than the saved multiplication." },
          { t: "callout", kind: "insight", title: "Why `fetch_account` is the most valuable change", body: [
            { t: "p", text: "The other fixes prevent bad data. This one prevents a performance bug that is invisible in review: `sub.account` looks free, so it gets used inside loops and produces one query per iteration — the N+1 problem (Lesson 13.6)." },
            { t: "p", text: "The general rule is that **a property is a promise about cost**. Callers assume attribute semantics — cheap, no side effects, safe to repeat — and a property that does I/O breaks that promise while hiding the evidence. The parentheses on a method are what let a reviewer see the cost." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A dashboard endpoint that renders 50 orders takes eight seconds. Profiling shows 51 database queries. The template contains `{{ order.customer.name }}` and the code review that added it saw one line of attribute access." },
      { t: "p", text: "**`Order.customer` is a property that queries the database.** The syntax says \"read a field\", so nobody looked for a query — and in a loop over 50 orders it issues 50 of them, plus the original. This is the classic N+1, and the property form is what made it invisible." },
      { t: "p", text: "**The immediate fix is to rename it `fetch_customer()`** so the cost is visible at every call site, then batch the loads — one query for all 50 customers, or an eager join. Lesson 13.6 covers the loading strategies." },
      { t: "p", text: "**The durable fix is a rule:** a property must be cheap, side-effect-free and safe to call repeatedly. Anything that does I/O is a method, and the parentheses are what let a reviewer see what a line costs. This is the one place where Python's syntactic elegance actively works against you, and the discipline has to come from the team." }
    ]}
  ],

  takeaways: [
    "**Python has no private attributes.** `_name` is a convention meaning *not part of the public API*; the language enforces nothing beyond excluding it from `import *`.",
    "`__name` is **name mangling**, not privacy — rewritten to `_Class__name`, still reachable. Its purpose is preventing accidental collisions in subclasses, which matters for library base classes and almost never in application code.",
    "**A property is a drop-in replacement for an attribute**, so there is no reason to write accessors defensively. Start with a plain attribute; add a property when there is real behaviour.",
    "The three legitimate reasons for a property: **validation on assignment**, **a computed value that cannot go stale**, and **a compatibility shim** for a name that used to be plain.",
    "A property that only stores and returns is a plain attribute with three extra lines and a slower lookup.",
    "**Assign through the property in `__init__`** — writing to the private name directly means the invariant does not hold at construction.",
    "A getter with no setter is read-only, and assignment raises `AttributeError`. That is as close to a read-only field as Python gets, and it is enough.",
    "**`cached_property` never invalidates.** It is correct only for values derived from state that cannot change — otherwise it goes silently stale.",
    "**A property is a promise about cost.** Anything doing I/O, having side effects, or taking measurable time must be a method — the parentheses are what make the cost visible in review.",
    "The property-doing-I/O mistake is how N+1 query patterns get past code review: the line looks like attribute access."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does a double leading underscore, as in `self.__value`, actually do?",
        options: [
          "Makes the attribute private and inaccessible from outside the class",
          "Renames it to `_ClassName__value` so a subclass using the same name cannot clobber it — it remains fully reachable",
          "Marks it read-only after first assignment",
          "Excludes it from `vars()` and `__dict__`"
        ],
        answer: 1,
        why: "It is name mangling, not privacy. Inside class `C`, `__value` becomes `_C__value`, which is trivially reachable and appears in `vars()`. The purpose is preventing accidental collisions when strangers subclass your class — genuinely useful for library base classes. For application code a single underscore is better: mangling complicates debugging, `getattr` and serialisation while protecting against a problem you rarely have."
      },
      {
        stem: "A class validates `seats` in a property setter but `__init__` assigns `self._seats = seats` directly. What is the consequence?",
        options: [
          "Nothing — the setter still runs because the property intercepts all writes",
          "The invariant does not hold at construction: an invalid value can enter, and only later assignments are validated",
          "A `RecursionError`, because the setter calls itself",
          "The property becomes read-only"
        ],
        answer: 1,
        why: "Assigning to the underlying `_seats` bypasses the setter entirely, so `Subscription(-5, ...)` succeeds and the object exists in an invalid state. Every subsequent assignment *is* checked, which makes it worse — the object protects itself from everything except its own creation. Writing `self.seats = seats` in `__init__` routes the initial value through the same validation as every later one."
      },
      {
        stem: "Why is `@cached_property` unsafe for a value derived from a mutable list?",
        options: [
          "It raises an error when the underlying collection changes",
          "It computes once and stores the result on the instance, never invalidating — so it goes silently stale when the list changes",
          "It recomputes on every access, defeating the cache",
          "It holds a strong reference to the list and leaks memory"
        ],
        answer: 1,
        why: "`cached_property` replaces itself with the computed value in the instance `__dict__` on first access, so later reads are plain attribute lookups and the function never runs again. Appending to the underlying list produces no invalidation and no error — just a wrong answer. It is correct only for values derived from immutable state; for mutable state use a plain `property` if the computation is cheap, or freeze the object."
      },
      {
        stem: "A dashboard rendering 50 orders issues 51 queries. The template reads `order.customer.name`. What went wrong?",
        options: [
          "The ORM is not configured with a connection pool",
          "`customer` is a property that queries the database, so attribute syntax hid one query per iteration from reviewers",
          "The template engine evaluates properties twice",
          "The orders were fetched lazily and the loop forced evaluation"
        ],
        answer: 1,
        why: "A property that does I/O breaks the promise attribute syntax makes — cheap, side-effect-free, safe to repeat. Because `order.customer` reads like a field access, nobody looked for a query, and in a loop it becomes the classic N+1. Renaming it `fetch_customer()` makes the cost visible at every call site; the parentheses are what let a reviewer see what a line costs."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How does encapsulation work in Python?",
        strong: "By convention rather than enforcement. A single leading underscore means *not part of the public API*; a double underscore triggers name mangling, which prevents subclass collisions rather than providing privacy. Nothing is actually inaccessible.",
        answer: [
          { t: "p", text: "The interesting half is why this produces better designs, and it is worth volunteering. Because a property is a drop-in replacement for an attribute, changing a plain field into one with validation breaks no call site — so there is no reason to write defensive getters and setters up front." },
          { t: "p", text: "That is the difference from Java, where making a public field private later is a breaking change, which is why accessors get written for everything as insurance. Python removes the incentive, and idiomatic Python has far fewer accessors as a result." },
          { t: "p", text: "Being precise about name mangling — that it renames rather than hides, and exists for subclass collision safety — separates a real understanding from the common belief that `__x` is `private`." }
        ]
      },
      {
        level: "core",
        q: "When would you use a property instead of a plain attribute?",
        strong: "For three things: validating on assignment to protect an invariant, exposing a computed value so it cannot drift out of sync with its inputs, or shimming a name that used to be a plain attribute and now needs behaviour. If none of those apply, a plain attribute is correct.",
        answer: [
          { t: "p", text: "Naming the negative case matters as much: a property that only stores and returns is a plain attribute with three extra lines and a slower lookup. Interviewers see a lot of candidates who wrap everything." },
          { t: "p", text: "The computed-value case is worth developing, because it prevents a whole family of bugs. A stored `total` alongside `seats` and `price` can drift; a derived `total` cannot disagree with its inputs, and that is worth more than the saved multiplication." },
          { t: "p", text: "The implementation detail that shows you have written these: assign through the property inside `__init__`, or the invariant holds for every assignment except the first." }
        ]
      },
      {
        level: "advanced",
        q: "What is wrong with a property that fetches from the database?",
        strong: "It breaks the promise attribute syntax makes. Callers assume a property is cheap, side-effect-free and safe to repeat, so `order.customer` gets used inside loops and produces one query per iteration — the N+1 pattern, invisible in review because the line looks like a field access.",
        answer: [
          { t: "p", text: "The framing that lands: **a property is a promise about cost.** Breaking it is worse than having no property at all, because the syntax actively conceals the evidence a reviewer would need." },
          { t: "p", text: "The concrete rule is easy to state and act on — anything that does I/O, has a side effect, or takes measurable time is a method, and the parentheses are the signal. `order.fetch_customer()` costs nothing extra to write." },
          { t: "p", text: "It is worth noting that this is one of the few places Python's syntactic elegance works against you: there is no language mechanism that prevents it, so the discipline has to come from the team's conventions and review habits." }
        ],
        weak: "Answering only that it is \"slow\". The performance cost is a symptom; the design problem is that the syntax hides it, which is what turns a slow call into an N+1 that ships."
      }
    ]
  }
});
