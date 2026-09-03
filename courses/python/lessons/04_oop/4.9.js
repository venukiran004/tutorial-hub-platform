/* ============================================================================
   LESSON 4.9 — Dunder Methods
   ========================================================================= */
EC.receiveLesson({
  id: "4.9",

  lede: "Dunder methods are how your class participates in Python's own syntax. `len(x)`, `x[k]`, `for i in x`, `x == y` and `with x:` are not special-cased in the interpreter — each one calls a method, and any class defining it joins in. Two of them matter more than all the rest: **`__repr__`, which decides how much you suffer when debugging**, and **`__eq__`, which silently breaks your object unless you handle `__hash__` with it.**",

  objectives: [
    "Write `__repr__` and `__str__` for their genuinely different audiences",
    "Implement `__eq__` and `__hash__` as a pair, and explain why one without the other is a bug",
    "Add comparison and ordering without writing six methods",
    "Implement the container and context-manager protocols correctly",
    "Recognise when operator overloading helps and when it obscures"
  ],

  prerequisites: ["4.1", "4.6"],

  blocks: [

    { t: "h2", n: "01", text: "__repr__ before anything else", id: "repr" },

    { t: "p", text: "If you write one dunder method on a class, write this one. It is what appears in the debugger, in a failed test's assertion output, in a log line and in every `print` of a list of your objects." },

    { t: "code", lang: "python", title: "the difference it makes", code: `
class Order:
    def __init__(self, order_id: str, total: Decimal) -> None:
        self.order_id, self.total = order_id, total


orders = [Order("o-1", Decimal("19.99")), Order("o-2", Decimal("5.00"))]
print(orders)
`,
      out: `[<__main__.Order object at 0x7f8b1c0d4130>, <__main__.Order object at 0x7f8b1c0d41f0>]`
    },

    { t: "code", lang: "python", title: "one method, and the object becomes debuggable", code: `
class Order:
    def __init__(self, order_id: str, total: Decimal) -> None:
        self.order_id, self.total = order_id, total

    def __repr__(self) -> str:
        # The convention: look like the call that would recreate it.
        return f"Order(order_id={self.order_id!r}, total={self.total!r})"


print([Order("o-1", Decimal("19.99")), Order("o-2", Decimal("5.00"))])
`,
      out: `[Order(order_id='o-1', total=Decimal('19.99')), Order(order_id='o-2', total=Decimal('5.00'))]`,
      caption: "The `!r` on each field is what keeps the output unambiguous — it shows `'o-1'` with quotes, so an id that is accidentally `\" o-1\"` or `1` is visible rather than indistinguishable."
    },

    { t: "callout", kind: "insight", title: "`__repr__` and `__str__` have different audiences", body: [
      { t: "table",
        head: ["", "`__repr__`", "`__str__`"],
        rows: [
          ["Audience", "**You**, debugging", "Your **user**, reading output"],
          ["Goal", "Unambiguous — ideally recreatable", "Readable"],
          ["Used by", "The REPL, containers, `repr()`, `!r`, tracebacks, debuggers", "`print()`, `str()`, f-strings, `format()`"],
          ["Fallback", "`<Class object at 0x...>`", "Falls back to `__repr__`"]
        ]
      },
      { t: "p", text: "**Define `__repr__` always; define `__str__` only when a user-facing form differs meaningfully.** Because `__str__` falls back to `__repr__`, one good `__repr__` covers both cases — whereas defining only `__str__` leaves your object unreadable in every container, log and traceback." },
      { t: "code", lang: "python", title: "when both earn their place", numbered: false, code: `
class Money:
    def __repr__(self) -> str:
        return f"Money({self.amount!r}, {self.currency!r})"   # for you

    def __str__(self) -> str:
        return f"{self.currency} {self.amount:,.2f}"          # for users


m = Money(Decimal("1234.5"), "GBP")
print(m)              # GBP 1,234.50
print([m])            # [Money(Decimal('1234.5'), 'GBP')] -- containers use repr
print(f"{m} / {m!r}") # both, explicitly`}
    ]},

    { t: "h2", n: "02", text: "__eq__ and __hash__ are one decision", id: "eq-hash" },

    { t: "code", lang: "python", title: "defining __eq__ alone breaks your class", code: `
class Point:
    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)


print(Point(1, 2) == Point(1, 2))
{Point(1, 2)}
`,
      out: `True
TypeError: unhashable type: 'Point'`
    },

    { t: "callout", kind: "trap", title: "Why Python does that to you", body: [
      { t: "p", text: "Defining `__eq__` sets `__hash__ = None` on the class. That is deliberate, and it protects an invariant: **objects that compare equal must hash equal**, or they break every dict and set that holds them (Lesson 2.3)." },
      { t: "p", text: "The default `__hash__` is based on identity, so two `Point(1, 2)` objects would hash differently while comparing equal — one could be inserted twice into a set, and a lookup could miss an entry that is present. Rather than let you ship that, Python removes hashability until you make the decision explicitly." },
      { t: "viz",
        title: "The invariant, and what breaks without it",
        caption: "A set places an element by its hash and confirms with equality. If equal objects hash differently they land in different slots, so the set holds duplicates and lookups miss. Python removes __hash__ when you define __eq__ precisely so this cannot happen silently.",
        svg: `<svg viewBox="0 0 900 240" role="img" aria-label="Diagram showing equal objects hashing to different slots, producing duplicate set entries and failed lookups">
  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--crit)">__eq__ WITHOUT __hash__ (if Python allowed it)</text>

  <rect x="20" y="40" width="150" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="95" y="60" text-anchor="middle" class="s-mono" style="font-size:10px">Point(1, 2)  #A</text>
  <rect x="20" y="78" width="150" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="95" y="98" text-anchor="middle" class="s-mono" style="font-size:10px">Point(1, 2)  #B</text>
  <text x="20" y="128" class="s-sub" style="fill:var(--good)">A == B  ->  True</text>
  <text x="20" y="146" class="s-sub" style="fill:var(--crit)">hash(A) != hash(B)  (identity-based)</text>

  <line x1="176" y1="55" x2="240" y2="55" style="stroke:var(--crit)" stroke-width="1.4"/>
  <line x1="176" y1="93" x2="240" y2="120" style="stroke:var(--crit)" stroke-width="1.4"/>

  <g>
    <rect x="246" y="40" width="70" height="30" rx="5" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="281" y="60" text-anchor="middle" class="s-mono" style="font-size:9.5px">A</text>
    <rect x="246" y="76" width="70" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="281" y="96" text-anchor="middle" class="s-sub">—</text>
    <rect x="246" y="112" width="70" height="30" rx="5" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="281" y="132" text-anchor="middle" class="s-mono" style="font-size:9.5px">B</text>
  </g>
  <text x="330" y="60" class="s-sub" style="fill:var(--crit)">the set now holds TWO elements</text>
  <text x="330" y="78" class="s-sub" style="fill:var(--crit)">that compare equal to each other</text>
  <text x="330" y="132" class="s-sub" style="fill:var(--crit)">and a lookup for one may miss the other</text>

  <line x1="20" y1="166" x2="880" y2="166" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="192" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--good)">THE RULE</text>
  <rect x="20" y="202" width="860" height="30" rx="7" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="36" y="222" class="s-sub" style="fill:var(--good)">a == b  MUST imply  hash(a) == hash(b).  Build both from the same fields, and use only fields that never change.</text>
</svg>`
      }
    ]},

    { t: "code", lang: "python", title: "the three correct choices", code: `
class Point:
    """1. Immutable value object -- define both, from the same fields."""

    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Point):
            return NotImplemented          # let Python try the reflected op
        return (self.x, self.y) == (other.x, other.y)

    def __hash__(self) -> int:
        return hash((self.x, self.y))      # SAME fields as __eq__


class Cart:
    """2. Mutable -- equality by value, deliberately unhashable."""

    def __eq__(self, other: object) -> bool:
        ...
    __hash__ = None        # explicit: cannot be a dict key, and that is right


class Connection:
    """3. Identity semantics -- define neither. Two connections are never
    'the same' just because their fields match."""
`,
      caption: "Option 2 is the one people forget. A mutable object with value equality **should** be unhashable: if it were a dict key and someone mutated it, the entry would become unreachable (Lesson 2.3). `__hash__ = None` states that decision rather than leaving it implicit."
    },

    { t: "callout", kind: "good", title: "Let a dataclass do it", body: [
      { t: "code", lang: "python", title: "the same three choices, declaratively", numbered: false, code: `
from dataclasses import dataclass

@dataclass(frozen=True)          # __eq__ AND __hash__, both from the fields
class Point:
    x: int
    y: int

@dataclass                       # __eq__ only; __hash__ is set to None
class Cart:
    items: list[str]

@dataclass(eq=False)             # neither -- identity semantics
class Connection:
    host: str`},
      { t: "p", text: "`@dataclass` generates `__init__`, `__repr__` and `__eq__` from the fields, and `frozen=True` adds `__hash__`. It gets the pairing right by construction, which is why hand-writing these is worth doing once for understanding and rarely afterwards. Lesson 4.10 covers dataclasses." }
    ]},

    { t: "callout", kind: "insight", title: "Return `NotImplemented`, not `False`", body: [
      { t: "code", lang: "python", title: "the difference", numbered: false, code: `
def __eq__(self, other):
    if not isinstance(other, Point):
        return False                # WRONG: forecloses the comparison
    ...

def __eq__(self, other):
    if not isinstance(other, Point):
        return NotImplemented       # RIGHT: "I don't know, you try"
    ...`},
      { t: "p", text: "`NotImplemented` tells Python to try the **reflected** operation — `other.__eq__(self)`. That is what lets a third-party class that knows about `Point` compare successfully. Returning `False` claims authoritatively that they are unequal and stops the negotiation." },
      { t: "p", text: "Python falls back to identity comparison if both sides return `NotImplemented`, so you never lose the sensible default. The same applies to every binary operator: `__add__`, `__lt__`, and the rest." }
    ]},

    { t: "h2", n: "03", text: "Ordering without six methods", id: "ordering" },

    { t: "code", lang: "python", title: "total_ordering fills in the rest", code: `
from functools import total_ordering


@total_ordering
class Version:
    def __init__(self, major: int, minor: int, patch: int) -> None:
        self.major, self.minor, self.patch = major, minor, patch

    def _key(self) -> tuple[int, int, int]:
        """One place defining the ordering. Both methods use it."""
        return (self.major, self.minor, self.patch)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() == other._key()

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() < other._key()

    def __hash__(self) -> int:
        return hash(self._key())

    def __repr__(self) -> str:
        return f"Version({self.major}, {self.minor}, {self.patch})"


v = [Version(1, 2, 0), Version(1, 10, 0), Version(1, 2, 5)]
print(sorted(v))
print(Version(1, 2, 0) <= Version(1, 2, 5), max(v))
`,
      out: `[Version(1, 2, 0), Version(1, 2, 5), Version(1, 10, 0)]
True Version(1, 10, 0)`,
      caption: "`@total_ordering` derives `<=`, `>`, `>=` and `!=` from `__eq__` and `__lt__`. Note the sort is correct — `1.10` after `1.2` — because the key is a tuple of ints, not a string. `@dataclass(order=True)` generates all of this from the field order."
    },

    { t: "h2", n: "04", text: "The container protocol", id: "containers" },

    { t: "code", lang: "python", title: "making a class behave like a collection", code: `
from collections.abc import Iterator


class OrderBook:
    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}

    def __len__(self) -> int:
        return len(self._orders)

    def __iter__(self) -> Iterator[Order]:
        return iter(self._orders.values())

    def __contains__(self, order_id: str) -> bool:
        # Without this, "in" falls back to iterating and comparing --
        # O(n) instead of O(1), and it would compare against Order
        # objects rather than ids.
        return order_id in self._orders

    def __getitem__(self, order_id: str) -> Order:
        return self._orders[order_id]

    def __bool__(self) -> bool:
        # Without this, truthiness falls back to __len__, which is
        # usually right -- define it only when they differ.
        return bool(self._orders)


book = OrderBook()
len(book), "o-1" in book, book["o-1"], list(book), bool(book)
`,
      caption: "Five methods and the object works with `len`, `in`, subscripting, `for`, comprehensions, `sorted`, `sum`, unpacking and truthiness. Inheriting from `collections.abc.Mapping` would supply `keys`, `values`, `items` and `get` on top (Lesson 4.8)."
    },

    { t: "callout", kind: "trap", title: "`__getitem__` alone makes an object iterable", body: [
      { t: "code", lang: "python", title: "the legacy fallback", numbered: false, code: `
class Weird:
    def __getitem__(self, i):
        if i > 2:
            raise IndexError
        return i * 10


print(list(Weird()))          # [0, 10, 20] -- no __iter__ anywhere`,
        out: `[0, 10, 20]`},
      { t: "p", text: "If a class has `__getitem__` but no `__iter__`, Python falls back to calling it with 0, 1, 2… until `IndexError`. That is a Python 2 compatibility path, and it produces surprising behaviour on mapping-like classes: `for x in my_dict_like` would try integer keys and either fail confusingly or silently yield nothing." },
      { t: "p", text: "**Define `__iter__` explicitly on anything iterable.** The fallback exists; relying on it is how a class ends up iterating in a way its author never intended." }
    ]},

    { t: "h2", n: "05", text: "Context managers and callables", id: "context-callable" },

    { t: "code", lang: "python", title: "__enter__ / __exit__ and __call__", code: `
from types import TracebackType


class Timer:
    """A context manager that is also callable as a decorator."""

    def __init__(self, label: str) -> None:
        self.label, self.elapsed = label, 0.0

    def __enter__(self) -> "Timer":
        self._start = time.perf_counter()
        return self                    # this is what "as t" binds

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> bool:
        self.elapsed = time.perf_counter() - self._start
        logger.info("%s took %.3fs", self.label, self.elapsed)
        return False                   # False (or None) = do NOT suppress


with Timer("query") as t:
    run_query()
print(t.elapsed)
`,
      caption: "`__exit__` receives the exception if one occurred, and its **return value decides whether to suppress it**. Returning `True` swallows the exception — almost never what you want, and returning a truthy value by accident is a real bug. `return False` or no return at all is correct. Lesson 5.8 covers context managers fully."
    },

    { t: "callout", kind: "tradeoff", title: "When operator overloading helps", body: [
      { t: "p", text: "`__add__`, `__sub__` and friends let your class use arithmetic syntax. They are excellent for genuine mathematical or quantity types and actively harmful elsewhere." },
      { t: "code", lang: "python", title: "the line", numbered: false, code: `
# GOOD -- the operator means what it always means
total = Money(10, "GBP") + Money(5, "GBP")
duration = end_time - start_time
combined = PermissionSet({"read"}) | PermissionSet({"write"})

# BAD -- the operator means something invented
pipeline = LoadStep() >> TransformStep() >> SaveStep()   # >> is not a pipe
user = User("ada") + Role("admin")                        # + is not "assign"`},
      { t: "p", text: "**The test: would a reader who has never seen your class predict what the operator does?** For `Money + Money` and `datetime - datetime`, yes. For `>>` as a pipeline operator, no — they have to learn a private notation, and every error message and traceback speaks it too." },
      { t: "p", text: "`Money(10, \"GBP\") + Money(5, \"USD\")` should raise, not silently pick a currency. Overloading an operator means inheriting the expectation that it is total and obvious; where it is neither, a named method is clearer." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a value object behave correctly",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Implement a `Money` class properly. It looks trivial and has four traps: the equality/hash pairing, comparison across currencies, `NotImplemented` versus `False`, and the difference between the two string methods." }
      ],
      requirements: [
        "`__repr__` that is unambiguous, and `__str__` formatted for a user — show why both are needed.",
        "`__eq__` and `__hash__` from the same fields, so instances work as dict keys.",
        "Ordering that **raises** when comparing different currencies rather than returning a wrong answer.",
        "`__add__` and `__sub__` that reject mismatched currencies, plus `__mul__` by a number only.",
        "Return `NotImplemented` for unsupported operand types, and demonstrate what that enables.",
        "Make it immutable so the hash can never go stale.",
        "Write a test proving equal instances collapse in a set, and one proving cross-currency comparison raises."
      ],
      hint: "For immutability, `@dataclass(frozen=True)` is the shortest route and generates most of this — but write at least the arithmetic and ordering by hand so the trade-offs are visible.",
      solution: {
        lang: "python",
        title: "money.py",
        code: `"""A value object with correct dunder semantics."""

from __future__ import annotations

from decimal import Decimal
from functools import total_ordering
from typing import Any


class CurrencyMismatch(TypeError):
    """Two Money values of different currencies were combined."""


@total_ordering
class Money:
    """An immutable amount in one currency.

    Immutable because __hash__ is derived from the fields: a mutable
    value object used as a dict key becomes unreachable the moment it
    changes (Lesson 2.3).
    """

    __slots__ = ("_amount", "_currency")

    def __init__(self, amount: Decimal | str | int, currency: str) -> None:
        # str() first -- Decimal(float) inherits binary error (Lesson 1.5)
        object.__setattr__(self, "_amount", Decimal(str(amount)))
        object.__setattr__(self, "_currency", currency.upper())

    # ---- immutability ----

    def __setattr__(self, name: str, value: Any) -> None:
        raise AttributeError(f"{type(self).__name__} is immutable")

    @property
    def amount(self) -> Decimal:
        return self._amount

    @property
    def currency(self) -> str:
        return self._currency

    # ---- the two string methods, for two audiences ----

    def __repr__(self) -> str:
        """For you. Unambiguous, and looks like the constructor call."""
        return f"Money({str(self._amount)!r}, {self._currency!r})"

    def __str__(self) -> str:
        """For a user. Readable, and NOT round-trippable."""
        return f"{self._currency} {self._amount:,.2f}"

    # ---- equality and hash: one decision, same fields ----

    def _key(self) -> tuple[Decimal, str]:
        """One definition of identity, used by __eq__, __hash__ and __lt__."""
        return (self._amount, self._currency)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            # NotImplemented, not False: lets Python try other.__eq__(self),
            # so a third-party type that knows about Money can still match.
            return NotImplemented
        return self._key() == other._key()

    def __hash__(self) -> int:
        # Same fields as __eq__, so equal values always hash equal.
        return hash(self._key())

    # ---- ordering: refuses across currencies ----

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        self._require_same_currency(other, "compare")
        return self._amount < other._amount

    def _require_same_currency(self, other: Money, verb: str) -> None:
        if self._currency != other._currency:
            raise CurrencyMismatch(
                f"cannot {verb} {self._currency} and {other._currency}"
            )

    # ---- arithmetic ----

    def __add__(self, other: object) -> Money:
        if not isinstance(other, Money):
            return NotImplemented
        self._require_same_currency(other, "add")
        return Money(self._amount + other._amount, self._currency)

    def __sub__(self, other: object) -> Money:
        if not isinstance(other, Money):
            return NotImplemented
        self._require_same_currency(other, "subtract")
        return Money(self._amount - other._amount, self._currency)

    def __mul__(self, factor: object) -> Money:
        # Money * Money is meaningless -- only scaling by a number.
        if not isinstance(factor, (int, Decimal)) or isinstance(factor, bool):
            return NotImplemented
        return Money(self._amount * Decimal(str(factor)), self._currency)

    __rmul__ = __mul__            # so 3 * money works as well as money * 3

    def __neg__(self) -> Money:
        return Money(-self._amount, self._currency)

    def __bool__(self) -> bool:
        # Explicit: zero money is falsy, which is what callers expect
        return self._amount != 0


# ---- tests --------------------------------------------------------------

def test_repr_and_str_serve_different_audiences() -> None:
    m = Money("1234.5", "gbp")

    assert repr(m) == "Money('1234.5', 'GBP')"
    assert str(m) == "GBP 1,234.50"
    # Containers use repr, which is why repr is the one you cannot skip
    assert repr([m]) == "[Money('1234.5', 'GBP')]"


def test_equal_values_collapse_in_a_set() -> None:
    """The pairing, demonstrated. Fails if __hash__ uses different fields."""
    a, b = Money("10.00", "GBP"), Money("10.00", "GBP")

    assert a == b
    assert hash(a) == hash(b)
    assert len({a, b}) == 1                    # one element, not two

    prices = {a: "standard"}
    assert prices[b] == "standard"             # b finds a's entry


def test_cross_currency_comparison_raises() -> None:
    gbp, usd = Money("10", "GBP"), Money("10", "USD")

    assert gbp != usd                          # equality is fine: not equal
    for op in (lambda: gbp < usd, lambda: gbp + usd, lambda: gbp - usd):
        try:
            op()
        except CurrencyMismatch:
            pass
        else:
            raise AssertionError("expected CurrencyMismatch")


def test_notimplemented_enables_the_reflected_operation() -> None:
    """Returning NotImplemented lets the OTHER operand try."""

    class Discount:
        def __radd__(self, other: Money) -> Money:
            return other * Decimal("0.9")

    # Money.__add__ returns NotImplemented, so Python tries
    # Discount.__radd__ -- which a "return False" would have prevented.
    assert Money("100", "GBP") + Discount() == Money("90.00", "GBP")

    # And an unsupported type still fails properly
    try:
        Money("1", "GBP") + 5
    except TypeError:
        pass
    else:
        raise AssertionError("expected TypeError")


def test_immutable_so_the_hash_cannot_go_stale() -> None:
    m = Money("10", "GBP")
    try:
        m._amount = Decimal("999")
    except AttributeError:
        pass
    else:
        raise AssertionError("Money must be immutable")


if __name__ == "__main__":
    for t in (
        test_repr_and_str_serve_different_audiences,
        test_equal_values_collapse_in_a_set,
        test_cross_currency_comparison_raises,
        test_notimplemented_enables_the_reflected_operation,
        test_immutable_so_the_hash_cannot_go_stale,
    ):
        t()
    print(Money("1234.5", "gbp"), "|", repr(Money("1234.5", "gbp")))`,
        out: `GBP 1,234.50 | Money('1234.5', 'GBP')`,
        notes: [
          { t: "p", text: "**`_key()` is the single definition of identity**, used by `__eq__`, `__hash__` and `__lt__`. That is what guarantees the invariant holds: it is impossible for the hash to use different fields from equality, because there is only one place the fields are named." },
          { t: "p", text: "**`test_notimplemented_enables_the_reflected_operation` is the one worth studying.** Returning `False` or raising `TypeError` directly would make `Money + Discount` fail, because Python never gets the chance to try `Discount.__radd__`. `NotImplemented` says *I don't know how* rather than *this is impossible*, and that distinction is what makes types composable across library boundaries." },
          { t: "p", text: "**Equality across currencies returns `False`; ordering raises.** That asymmetry is deliberate. `gbp != usd` is a meaningful and correct answer, so `__eq__` should never raise — it would break `in`, `count` and any dict holding mixed currencies. But `gbp < usd` has no correct answer, so refusing beats inventing one." },
          { t: "callout", kind: "insight", title: "What `@dataclass(frozen=True, order=True)` would give you", body: [
            { t: "p", text: "It would generate `__init__`, `__repr__`, `__eq__`, `__hash__` and all six comparisons — replacing roughly forty lines here. What it cannot generate is the currency check: its comparisons would happily order GBP against USD by amount, silently." },
            { t: "p", text: "That is the general shape of the trade. **Use the dataclass for the mechanical parts and hand-write the methods that carry a domain rule.** `@dataclass(frozen=True)` for `__eq__`/`__hash__`/`__repr__`, with `__lt__` and the arithmetic written by hand, is the version most codebases should ship." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A caching layer keyed by a `Query` object starts returning results for the wrong query. The `Query` class defines `__eq__` comparing its SQL string and parameters, and `__hash__` returning `hash(self.sql)` — dropping the parameters." },
      { t: "p", text: "**The invariant is inverted rather than broken.** Equal objects do hash equally, so nothing crashes. But *unequal* objects also hash equally — two queries with the same SQL and different parameters collide, and the dict resolves the collision by calling `__eq__`, which correctly reports them unequal, so it stores both. The bug is subtler: a partially-matching hash means the cache degenerates, and any code that reasons about hash equality as a proxy for equality is now wrong." },
      { t: "p", text: "**The fix is the discipline from the exercise:** derive both from one `_key()` tuple, so they cannot use different fields. Here that means `hash((self.sql, self.params))`, with `params` as a tuple rather than a list so it is hashable at all." },
      { t: "p", text: "**Two habits prevent the whole family:** define `__eq__` and `__hash__` from a single key method, and reach for `@dataclass(frozen=True)` for value objects so the pairing is generated rather than remembered. Hand-writing these is worth doing once for understanding — and rarely worth doing twice." }
    ]}
  ],

  takeaways: [
    "**Write `__repr__` on every class you will debug.** It appears in the REPL, containers, logs, tracebacks and failed assertions; `__str__` falls back to it, so one good `__repr__` covers both.",
    "`__repr__` is for **you** — unambiguous, ideally recreatable, with `!r` on each field. `__str__` is for your **user** — readable, and only worth defining when it genuinely differs.",
    "**Defining `__eq__` sets `__hash__` to `None`.** That is deliberate: equal objects must hash equally, or every dict and set holding them breaks.",
    "Three correct choices: **immutable value object** (define both), **mutable with value equality** (`__hash__ = None`, explicitly), **identity semantics** (define neither).",
    "**Derive `__eq__` and `__hash__` from one `_key()` method**, so it is impossible for them to use different fields.",
    "**Return `NotImplemented`, not `False`**, for unsupported operand types — it lets Python try the reflected operation, which is what makes types composable across libraries.",
    "`@total_ordering` derives four comparisons from `__eq__` and `__lt__`; `@dataclass(order=True)` generates all of them from field order.",
    "Five methods — `__len__`, `__iter__`, `__contains__`, `__getitem__`, `__bool__` — make a class work with every built-in that takes a collection.",
    "**`__getitem__` without `__iter__` still makes an object iterable** via a legacy integer-index fallback, which produces surprising behaviour on mapping-like classes. Always define `__iter__` explicitly.",
    "`__exit__` returning a truthy value **suppresses the exception**. Return `False` or nothing.",
    "Overload an operator only when a reader who has never seen your class would predict what it does. `Money + Money`, yes; `>>` as a pipeline, no."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A class defines `__eq__` but not `__hash__`. What happens when you put an instance in a set?",
        options: [
          "It works — Python falls back to identity-based hashing",
          "`TypeError: unhashable type` — defining `__eq__` sets `__hash__` to `None`",
          "It works, but two equal instances are stored separately",
          "A `DeprecationWarning`, then it uses `id()`"
        ],
        answer: 1,
        why: "Python sets `__hash__ = None` when you define `__eq__`, making the class unhashable. That is protection, not an oversight: the inherited identity-based hash would give two equal objects different hashes, so a set could hold both and a dict lookup could miss an entry that is present. Rather than let that ship, Python forces you to decide — define `__hash__` from the same fields, or state `__hash__ = None` deliberately for a mutable type."
      },
      {
        stem: "Why should `__eq__` return `NotImplemented` rather than `False` for an unsupported type?",
        options: [
          "`False` raises a `DeprecationWarning` in recent Python versions",
          "`NotImplemented` lets Python try the reflected operation on the other operand, so a type that knows about yours can still compare successfully",
          "`NotImplemented` is faster because it skips the comparison",
          "They are equivalent; `NotImplemented` is only a convention"
        ],
        answer: 1,
        why: "`False` claims authoritatively that the objects are unequal and ends the negotiation. `NotImplemented` says \"I don't know how\", so Python tries `other.__eq__(self)` — which is what allows a third-party class that understands yours to make the comparison work. If both sides return `NotImplemented`, Python falls back to identity comparison, so you never lose the sensible default. The same applies to every binary operator."
      },
      {
        stem: "A class defines `__getitem__` but no `__iter__`. What does `for x in obj` do?",
        options: [
          "Raises `TypeError: object is not iterable`",
          "Calls `__getitem__` with 0, 1, 2… until `IndexError` — a legacy fallback that can produce surprising behaviour",
          "Iterates the object's `__dict__`",
          "Yields nothing silently"
        ],
        answer: 1,
        why: "Python 2 compatibility left a fallback: an object with `__getitem__` and no `__iter__` is iterated by integer index until `IndexError`. On a sequence-like class that is usually harmless; on a mapping-like class it tries integer keys and either raises confusingly or silently yields nothing. Define `__iter__` explicitly on anything meant to be iterable rather than relying on the fallback."
      },
      {
        stem: "A cache keyed by `Query` objects behaves oddly. `__eq__` compares SQL and parameters; `__hash__` returns `hash(self.sql)` only. What is wrong?",
        options: [
          "Nothing — the hash may use a subset of the equality fields",
          "The hash ignores a field equality depends on, so unequal queries collide and the cache degenerates; both should derive from one key tuple",
          "`hash()` cannot be called on a string attribute",
          "The class needs `__ne__` defined as well"
        ],
        answer: 1,
        why: "Strictly, using a subset does not violate the invariant — equal objects still hash equally, so nothing crashes. But unequal queries now collide constantly, the dict falls back to `__eq__` on every collision, and the cache's performance degrades toward a linear scan. Any code reasoning about hash equality as a proxy for equality is also wrong. Deriving both from one `_key()` tuple makes the mismatch impossible."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `__repr__` and `__str__`?",
        strong: "Different audiences. `__repr__` is for a developer — unambiguous, ideally looking like the call that would recreate the object — and it is what the REPL, containers, logs and tracebacks use. `__str__` is for a user and only needs to be readable. `__str__` falls back to `__repr__`, so `__repr__` is the one you cannot skip.",
        answer: [
          { t: "p", text: "The practical framing is what makes this more than trivia: without `__repr__`, printing a list of your objects gives you memory addresses, and a failed assertion tells you nothing about which object was wrong." },
          { t: "p", text: "The `!r` detail shows attention — using `{self.name!r}` inside `__repr__` keeps strings quoted, so an id that is accidentally `\" o-1\"` or `1` is visible rather than indistinguishable from the correct value." },
          { t: "p", text: "Worth saying that most classes need only `__repr__`, and `__str__` earns its place when there is a genuinely different user-facing form — formatted money, a human-readable duration." }
        ]
      },
      {
        level: "core",
        q: "Why does defining `__eq__` break hashing?",
        strong: "Python sets `__hash__` to `None` when you define `__eq__`, because the inherited hash is identity-based and would give equal objects different hashes. That breaks the invariant every dict and set relies on, so Python removes hashability until you decide explicitly.",
        answer: [
          { t: "p", text: "Explaining the mechanism is what distinguishes the answer: a set places an element by hash and confirms with equality, so equal objects hashing differently land in different buckets — the set holds duplicates and a lookup can miss an entry that is present." },
          { t: "p", text: "Naming all three correct outcomes shows you have thought it through: immutable value object defines both, mutable with value equality sets `__hash__ = None` deliberately, and an identity-semantics object defines neither." },
          { t: "p", text: "The practical tip to close on is deriving both from a single `_key()` tuple, so they cannot drift apart — or letting `@dataclass(frozen=True)` generate the pair." }
        ]
      },
      {
        level: "advanced",
        q: "When is operator overloading a good idea?",
        strong: "When the operator means what a reader already expects it to mean. `Money + Money` and `datetime - datetime` are obvious to someone who has never seen the class. Inventing a meaning — `>>` for a pipeline, `+` for assigning a role — forces every reader to learn a private notation.",
        answer: [
          { t: "p", text: "The test is worth stating explicitly: would someone who has never seen your class predict what the operator does? That is checkable, where \"is it Pythonic\" is not." },
          { t: "p", text: "A detail that shows care: an overloaded operator inherits the expectation of being total and obvious, so `Money(\"10\", \"GBP\") + Money(\"5\", \"USD\")` should raise rather than silently pick a currency. Partial operators surprise people precisely because the syntax promises they will not." },
          { t: "p", text: "It is also worth mentioning the asymmetry between equality and ordering: `__eq__` should never raise, because \"not equal\" is a meaningful answer across currencies, while `__lt__` has no correct answer and should refuse." }
        ],
        weak: "Answering that overloading is always bad, or always fine. Both skip the judgement the question is testing — the whole point is knowing where the line falls."
      }
    ]
  }
});
