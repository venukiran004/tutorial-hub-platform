/* ============================================================================
   LESSON 8.3 — Type Hints in Depth
   ========================================================================= */
EC.receiveLesson({
  id: "8.3",

  lede: "Annotations do nothing at runtime — Python stores them and moves on. Their value is entirely in what a checker can prove before the code runs, which means **the only hints worth writing are the ones that could fail**. `def process(data: Any) -> Any` is documentation pretending to be verification, and it actively disables checking everywhere it spreads.",

  objectives: [
    "Use precise container types, and know why `Sequence` beats `list` in a parameter",
    "Apply `Literal`, `Final`, `NewType` and type aliases where they prevent real mistakes",
    "Explain how `Any` propagates and why `object` is usually what you meant",
    "Narrow types with `isinstance`, `assert` and `TypeIs`",
    "Adopt typing gradually, boundaries first, with a `mypy` configuration that ratchets"
  ],

  prerequisites: ["3.7", "4.10"],

  blocks: [

    { t: "h2", n: "01", text: "Annotations are inert", id: "runtime" },

    { t: "code", lang: "python", title: "nothing is enforced", code: `
def charge(amount: int) -> str:
    return amount * 2                    # returns an int. No error.


print(charge("nope"))                    # runs fine
print(charge.__annotations__)
`,
      out: `nopenope
{'amount': <class 'int'>, 'return': <class 'str'>}`,
      caption: "Both of those are bugs a checker catches instantly and the interpreter does not care about at all. **Hints are a static contract**; without `mypy`, `pyright` or an IDE checking them, they are comments with syntax."
    },

    { t: "callout", kind: "note", title: "`from __future__ import annotations`", body: [
      { t: "code", lang: "python", title: "what it changes", numbered: false, code: `
from __future__ import annotations

def f(x: SomeClassDefinedLater) -> list[int]:   # no NameError
    ...

# Annotations become strings, evaluated only on demand:
print(f.__annotations__)      # {'x': 'SomeClassDefinedLater', ...}`},
      { t: "ul", items: [
        "**Forward references work without quotes** — useful for a method returning its own class, or a `TYPE_CHECKING` import (Lesson 7.4).",
        "**Import time drops slightly**, since annotation expressions are never evaluated.",
        "**Anything reading annotations at runtime must resolve them** — `typing.get_type_hints(obj)`, not `obj.__annotations__`. Pydantic and dataclasses handle this; hand-written introspection often does not."
      ]},
      { t: "p", text: "Python 3.14 makes lazy annotations the default via PEP 649, with a different mechanism that avoids the string problem. Until then, the `__future__` import is the standard choice for new code." }
    ]},

    { t: "h2", n: "02", text: "Precision that pays", id: "precision" },

    { t: "table",
      head: ["Instead of", "Write", "Because"],
      rows: [
        ["`list` (bare)", "`list[str]`", "A bare container is `list[Any]`, which checks nothing about its contents"],
        ["`def f(items: list[str])`", "`def f(items: Sequence[str])`", "**Accepts tuples and other sequences**, and documents that you will not mutate it"],
        ["`def f(config: dict[str, int])`", "`def f(config: Mapping[str, int])`", "Same reason — `Mapping` is read-only, so the signature is a promise"],
        ["`-> Sequence[str]`", "`-> list[str]`", "**Returns should be specific**: give callers everything you actually have"],
        ["`Optional[str]`", "`str | None`", "Same meaning, less import, reads better in a union of three"],
        ["`Union[int, str]`", "`int | str`", "3.10+ syntax; `Union` is only needed for older versions"],
        ["`Callable`", "`Callable[[int, str], bool]`", "A bare `Callable` says only \"something callable\""],
        ["`dict` for a fixed shape", "A dataclass, or `TypedDict`", "Named fields the checker can verify (Lesson 8.4)"]
      ],
      caption: "**The parameter/return asymmetry is the rule people miss.** Accept the most general type you can handle; return the most specific type you have. It maximises what callers can pass in and what they can do with the result."
    },

    { t: "code", lang: "python", title: "the mutation the general type prevents", code: `
from collections.abc import Sequence


def total(prices: list[int]) -> int:
    prices.append(0)                     # legal -- the type permits it
    return sum(prices)


def total_safe(prices: Sequence[int]) -> int:
    prices.append(0)                     # mypy: "Sequence[int]" has no
    return sum(prices)                   #       attribute "append"


total_safe((1, 2, 3))                    # a tuple works
total((1, 2, 3))                         # mypy: expected list[int]
`,
      caption: "`Sequence` is not a weaker type — it is a **more honest** one. It stops you mutating a caller's list by accident, and it lets a caller pass the tuple they already have (Lesson 3.3)."
    },

    { t: "h2", n: "03", text: "Types that encode a rule", id: "rules" },

    { t: "code", lang: "python", title: "Literal, Final, NewType, and aliases", code: `
from typing import Final, Literal, NewType

# Literal: a closed set, checked at every call site
def render(fmt: Literal["json", "csv", "text"]) -> str: ...

render("json")
render("xml")            # mypy: Argument 1 has incompatible type "xml"

# Final: reassignment is an error
MAX_RETRIES: Final = 3
MAX_RETRIES = 5          # mypy: cannot assign to final name

# NewType: a distinct type at check time, an int at runtime
UserId = NewType("UserId", int)
OrderId = NewType("OrderId", int)

def fetch_user(uid: UserId) -> User: ...

fetch_user(OrderId(42))  # mypy: expected "UserId", got "OrderId"
fetch_user(42)           # mypy: expected "UserId", got "int"

# Type aliases -- 3.12 syntax
type Handler = Callable[[Request], Response]
type JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
`,
      hl: [8, 19, 20],
      caption: "**`NewType` is the highest-value item here.** Every system with several kinds of integer identifier eventually passes the wrong one, and the runtime cost is zero — `UserId(42)` compiles to `42`."
    },

    { t: "callout", kind: "trap", title: "`Any` is contagious", body: [
      { t: "code", lang: "python", title: "one Any disables checking downstream", numbered: false, code: `
def load(path: str) -> Any:              # json.load's return type
    return json.load(open(path))


config = load("config.json")
config.database.hostname                 # no error -- Any allows anything
config.databse.hostname                  # STILL no error. Typo, unchecked.
timeout: int = config.timeout            # no error, even if it is a string`},
      { t: "table",
        head: ["", "`Any`", "`object`"],
        rows: [
          ["Attribute access", "Anything allowed", "Only `object`'s own"],
          ["Assign to a typed variable", "Allowed silently", "Error until narrowed"],
          ["Means", "\"Stop checking\"", "\"Could be anything — narrow it first\""],
          ["Use for", "A genuinely dynamic boundary you will validate", "**Almost every case where people write `Any`**"]
        ]
      },
      { t: "p", text: "**`Any` is a request to stop checking, and it propagates through every expression it touches.** When you mean \"I do not know what this is\", `object` says so and forces a narrowing step — which is where the validation belongs anyway (Lesson 6.5)." },
      { t: "p", text: "Turn on `mypy --disallow-any-expr` on a new module to see how far `Any` reaches from a single `json.load`." }
    ]},

    { t: "h2", n: "04", text: "Narrowing", id: "narrowing" },

    { t: "viz",
      title: "A checker follows control flow",
      caption: "Inside a branch that has established something about a value, the type is narrower. This is what makes `str | None` workable rather than annoying — after the guard, the checker knows it is a `str`.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram showing a value typed as str or None narrowing to None in one branch and str in the other">
  <defs>
    <marker id="nr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="330" y="24" width="240" height="56" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="450" y="48" text-anchor="middle" class="s-mono" style="font-size:11px">name: str | None</text>
  <text x="450" y="68" text-anchor="middle" class="s-sub">two possibilities</text>

  <line x1="400" y1="84" x2="230" y2="122" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#nr)"/>
  <line x1="500" y1="84" x2="670" y2="122" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#nr)"/>

  <text x="250" y="104" class="s-mono" style="font-size:10px">if name is None:</text>
  <text x="560" y="104" class="s-mono" style="font-size:10px">else:</text>

  <rect x="60" y="126" width="300" height="72" rx="8" style="fill:none;stroke:var(--crit)" stroke-width="1.3"/>
  <text x="210" y="152" text-anchor="middle" class="s-mono" style="font-size:11px">name: None</text>
  <text x="210" y="176" text-anchor="middle" class="s-sub">name.upper() is an error here</text>

  <rect x="540" y="126" width="300" height="72" rx="8" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="690" y="152" text-anchor="middle" class="s-mono" style="font-size:11px">name: str</text>
  <text x="690" y="176" text-anchor="middle" class="s-sub">name.upper() is fine</text>

  <line x1="14" y1="222" x2="886" y2="222" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="14" y="248" class="s-sub">Narrowing also comes from: isinstance, assert, "is not None", a truthiness check,</text>
  <text x="14" y="270" class="s-sub">an early return, match/case patterns, and a user-defined TypeIs function.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "narrowing in practice", code: `
from typing import TypeIs


def greet(name: str | None) -> str:
    if name is None:
        return "Hello, stranger"
    return name.upper()                  # narrowed to str


def process(value: object) -> int:
    assert isinstance(value, list)       # narrows -- but see the warning
    return len(value)


# A custom narrowing function, so a helper propagates type information
def is_str_list(value: list[object]) -> TypeIs[list[str]]:
    return all(isinstance(x, str) for x in value)


def handle(items: list[object]) -> None:
    if is_str_list(items):
        print(", ".join(items))          # checker knows: list[str]
`,
      caption: "**`TypeIs` (3.13) narrows in both branches**; the older `TypeGuard` only narrows the positive one. Both let a helper function carry type information the checker would otherwise lose at the call boundary."
    },

    { t: "callout", kind: "warn", title: "`assert` for narrowing disappears under `-O`", body: [
      { t: "p", text: "`assert isinstance(x, Foo)` narrows for the checker and vanishes at runtime under `python -O` (Lesson 6.5). That is fine when the assertion is about your own invariants, and dangerous when it is the only thing validating external input." },
      { t: "code", lang: "python", title: "the rule", numbered: false, code: `
# Fine -- an internal invariant the checker cannot see
def _apply(self, node: Node) -> None:
    assert self._root is not None, "call build() first"
    ...

# Wrong -- this is validation, and -O removes it
def handle(payload: object) -> None:
    assert isinstance(payload, dict)     # gone under -O
    ...

# Right
def handle(payload: object) -> None:
    if not isinstance(payload, dict):
        raise TypeError(f"expected an object, got {type(payload).__name__}")`},
      { t: "p", text: "The checker narrows on the `if ... raise` form exactly as well, so there is no cost to being correct here." }
    ]},

    { t: "h2", n: "05", text: "Adopting typing on an existing codebase", id: "adoption" },

    { t: "ladder",
      title: "Getting value from a type checker",
      rungs: [
        { level: "bad", label: "Annotate everything at once, then silence the failures",
          why: "Ten thousand errors is indistinguishable from zero — nobody reads the list, and the `# type: ignore` comments added to make it green permanently disable checking on the lines most likely to be wrong.",
          code: `# 8,412 errors
def process(data):  # type: ignore
    ...` },
        { level: "ok", label: "Run in non-strict mode across everything",
          why: "Catches real bugs immediately and stays quiet on unannotated code. But `disallow_untyped_defs` is off, so an unannotated function is silently `Any` in and `Any` out — and new untyped code keeps arriving.",
          code: `# pyproject.toml
[tool.mypy]
python_version = "3.12"
warn_unused_ignores = true
warn_return_any = true` },
        { level: "best", label: "Strict by default, with a shrinking exception list",
          why: "New code is fully checked from the first commit, legacy modules are explicitly listed as exceptions, and the list only gets shorter. The exceptions are visible in one file, so the debt is measurable rather than diffuse.",
          code: `[tool.mypy]
python_version = "3.12"
strict = true
warn_unreachable = true
enable_error_code = ["ignore-without-code", "redundant-expr"]

# Legacy modules, being migrated. Delete entries; never add them.
[[tool.mypy.overrides]]
module = ["myapp.legacy.*", "myapp.reports.old_export"]
disallow_untyped_defs = false
check_untyped_defs = false

# Third-party packages with no stubs
[[tool.mypy.overrides]]
module = ["vendor_sdk.*"]
ignore_missing_imports = true`,
          note: "`ignore-without-code` forces every suppression to name the error it silences — `# type: ignore[arg-type]` rather than a blanket ignore that also hides the next three bugs on that line." }
      ]
    },

    { t: "callout", kind: "insight", title: "Type the boundaries first", body: [
      { t: "p", text: "The highest return comes from annotating where data enters and leaves: request handlers, database rows, queue messages, public functions. Those are the places where a wrong assumption travels furthest before failing, and where the checker turns an ambiguous `dict` into a named shape (Lesson 6.5)." },
      { t: "p", text: "The lowest return is a five-line private helper whose types are obvious from two lines above. Annotate it because strict mode asks, not because it will catch anything." },
      { t: "p", text: "**A useful sequencing:** public function signatures, then dataclasses and models, then module internals, then the legacy exception list — with each step producing findings that justify the next." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Type a module and find the bugs it was hiding",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "This module has been working \"fine\" for a year. Annotate it under `mypy --strict` and the checker finds four genuine bugs — not style issues, but code paths that produce wrong answers or crash." },
        { t: "code", lang: "python", title: "pricing.py — as found", numbered: false, code: `
DISCOUNTS = {"gold": 0.2, "silver": 0.1}

def get_discount(tier):
    return DISCOUNTS.get(tier)

def apply_discount(price, tier):
    discount = get_discount(tier)
    return price * (1 - discount)

def format_receipt(items, customer=None):
    lines = []
    for item in items:
        lines.append(item["name"] + ": " + item["price"])
    if customer:
        lines.append("Customer: " + customer["name"])
    return "\\n".join(lines)

def total(items, tier="bronze"):
    subtotal = sum(i["price"] for i in items)
    return apply_discount(subtotal, tier)`},
        { t: "p", text: "Find all four, then produce a typed version where each is impossible rather than merely fixed." }
      ],
      requirements: [
        "Annotate every function so `mypy --strict` passes.",
        "Identify the four bugs and say which annotation exposes each.",
        "Replace the untyped `dict` item shape with something the checker verifies.",
        "Use `Literal` or an enum so an unknown tier is a check-time error.",
        "Handle money correctly — the types should make the current approach obviously wrong.",
        "Write tests for each bug that fail on the original.",
        "**Name one place where you deliberately used a looser type, and why.**"
      ],
      hint: "Start with `get_discount`: what does `.get` return when the key is missing, and what does the next line do with it? Three of the four bugs are variations on the same theme.",
      solution: {
        lang: "python",
        title: "pricing.py",
        code: `# =========================================================================
# THE FOUR BUGS, AND THE ANNOTATION THAT EXPOSES EACH
# =========================================================================
#
# BUG 1 -- get_discount returns None for an unknown tier
#
#   def get_discount(tier) -> float | None:
#       return DISCOUNTS.get(tier)          # None when missing
#
#   apply_discount then computes  price * (1 - None)  -> TypeError.
#   Every "bronze" customer -- the DEFAULT tier in total() -- crashes.
#   That it survived a year means bronze customers never reached this
#   path, which is its own worrying finding.
#
#   Exposed by: annotating the return as "float | None". mypy then
#   rejects "1 - discount" as unsupported for None.
#
#
# BUG 2 -- item["price"] is concatenated as a string in format_receipt
#          and summed as a number in total
#
#   lines.append(item["name"] + ": " + item["price"])     # needs str
#   subtotal = sum(i["price"] for i in items)             # needs a number
#
#   Both cannot be right. With an untyped dict, mypy sees Any and allows
#   both; with a typed item shape, exactly one of them fails.
#
#   Exposed by: a TypedDict or dataclass for the item.
#
#
# BUG 3 -- "if customer:" is a truthiness test, not a None test
#
#   An empty dict is falsy, so a customer record that exists but is
#   empty is silently skipped -- indistinguishable from no customer.
#
#   Exposed by: "customer: Customer | None". mypy accepts both forms,
#   but the explicit "is not None" is what the type is telling you to
#   write, and strict-equality settings flag the difference.
#
#
# BUG 4 -- floats for money
#
#   0.1 + 0.2 != 0.3. A discount of 0.2 applied to 19.99 produces
#   15.992000000000001, and a year of accumulated rounding is why the
#   ledger never reconciles (Lesson 2.6).
#
#   Not a type ERROR, but annotating "price: float" makes the decision
#   visible and reviewable instead of implicit.


from __future__ import annotations

from decimal import Decimal
from enum import StrEnum
from typing import Final, NewType, Sequence, TypedDict


# A distinct type at check time, a str at runtime. Passing a product id
# where a customer id is expected becomes a check-time error.
CustomerId = NewType("CustomerId", str)


class Tier(StrEnum):
    """An enum rather than Literal: it gives a runtime membership check
    for data arriving from outside, AND check-time exhaustiveness.

    Literal["gold", "silver", "bronze"] would type this equally well and
    is the right choice when the values never cross a boundary. Here they
    arrive from a database, so a runtime type is worth having."""

    GOLD = "gold"
    SILVER = "silver"
    BRONZE = "bronze"


# Final: the mapping is a constant, and mypy rejects reassignment.
# Total over Tier, so BUG 1 is impossible -- there is no missing key.
DISCOUNTS: Final[dict[Tier, Decimal]] = {
    Tier.GOLD: Decimal("0.20"),
    Tier.SILVER: Decimal("0.10"),
    Tier.BRONZE: Decimal("0.00"),
}


class Item(TypedDict):
    """The item shape, verified by the checker.

    A TypedDict rather than a dataclass because these arrive as parsed
    JSON and are never constructed by us -- so there is nothing to gain
    from a class, and a TypedDict keeps them plain dicts at runtime
    (Lesson 8.4)."""

    name: str
    price: Decimal


class Customer(TypedDict):
    id: CustomerId
    name: str


def get_discount(tier: Tier) -> Decimal:
    """Total over Tier, so no None. BUG 1 cannot happen."""
    return DISCOUNTS[tier]


def apply_discount(price: Decimal, tier: Tier) -> Decimal:
    return price * (Decimal(1) - get_discount(tier))


def format_receipt(items: Sequence[Item], customer: Customer | None = None) -> str:
    """Sequence, not list: this function does not mutate, and a caller
    with a tuple should not have to convert.

    THE DELIBERATELY LOOSER TYPE -- see the note at the end.
    """
    lines = [f"{item['name']}: {item['price']:.2f}" for item in items]

    # BUG 3: "is not None", not truthiness. An empty Customer is still a
    # customer; only None means "there isn't one".
    if customer is not None:
        lines.append(f"Customer: {customer['name']}")

    return "\\n".join(lines)


def total(items: Sequence[Item], tier: Tier = Tier.BRONZE) -> Decimal:
    subtotal = sum((item["price"] for item in items), start=Decimal(0))
    return apply_discount(subtotal, tier)


# =========================================================================
# THE DELIBERATELY LOOSER TYPE
# =========================================================================
#
# Sequence[Item] rather than list[Item] in both public functions.
#
# It is looser in what it ACCEPTS -- tuples, lists, any sequence -- and
# stricter in what it PERMITS: Sequence has no append, so mypy rejects
# any accidental mutation of the caller's collection.
#
# That is the parameter/return asymmetry: accept the most general type
# you can handle, return the most specific type you have. The return
# types here stay concrete (Decimal, str) because callers should get
# everything we actually have.


# =========================================================================
# TESTS -- each fails on the original
# =========================================================================

import pytest

ITEMS: list[Item] = [
    {"name": "Widget", "price": Decimal("19.99")},
    {"name": "Gadget", "price": Decimal("5.01")},
]


def test_unknown_tier_cannot_reach_the_arithmetic() -> None:
    """BUG 1. The original returned None from get_discount and then
    computed 1 - None. The default tier was 'bronze', which was not in
    DISCOUNTS -- so the DEFAULT path crashed."""
    assert get_discount(Tier.BRONZE) == Decimal("0.00")
    assert total(ITEMS) == Decimal("25.00")          # default tier works

    with pytest.raises((KeyError, ValueError)):
        get_discount(Tier("platinum"))               # rejected at the edge


def test_price_is_a_number_everywhere() -> None:
    """BUG 2. The original concatenated item['price'] as a string in
    format_receipt and summed it as a number in total. With Item typed,
    only one of those can compile."""
    assert "Widget: 19.99" in format_receipt(ITEMS)
    assert total(ITEMS, Tier.GOLD) == Decimal("20.00")


def test_empty_customer_is_still_a_customer() -> None:
    """BUG 3. An empty dict is falsy, so 'if customer:' skipped a
    customer that existed with no data -- silently producing a receipt
    with no customer line."""
    empty: Customer = {"id": CustomerId(""), "name": ""}

    assert "Customer: " in format_receipt(ITEMS, empty)
    assert "Customer" not in format_receipt(ITEMS, None)


def test_money_is_exact() -> None:
    """BUG 4. With floats, 19.99 * 0.8 is 15.992000000000001 and a
    year of accumulation is why the ledger never balances."""
    assert total(ITEMS, Tier.GOLD) == Decimal("20.00")
    assert str(total(ITEMS, Tier.GOLD)) == "20.0000"   # exact, not 19.999...


def test_receipt_accepts_a_tuple() -> None:
    """Sequence, not list: a caller with a tuple should not convert."""
    assert format_receipt(tuple(ITEMS)).count("\\n") == 1


def test_functions_do_not_mutate_their_arguments() -> None:
    """Sequence has no append, so mypy rejects the mutation that a
    list[Item] annotation would have allowed."""
    items = list(ITEMS)
    format_receipt(items)
    total(items)

    assert items == ITEMS`,
        notes: [
          { t: "p", text: "**Three of the four bugs are the same bug: an untyped `dict` and an untyped `.get` both produce `Any`, and `Any` allows everything.** The checker did not find them by being clever — it found them the moment there was a type to contradict." },
          { t: "p", text: "**Bug 1 crashed on the default path**, which is the detail worth sitting with. `total(items)` with no tier used `\"bronze\"`, which was not in `DISCOUNTS`, so `.get` returned `None` and the arithmetic raised. That it survived a year means every caller passed a tier explicitly — so the default was untested, undocumented and wrong." },
          { t: "p", text: "**Making `DISCOUNTS` total over `Tier` removes the bug rather than fixing it.** `DISCOUNTS[tier]` cannot return `None` when the key type is an enum and every member has an entry, so there is no `None` to guard against and no guard to forget. That is the difference between a fix and a design change." },
          { t: "callout", kind: "insight", title: "`Sequence` is looser and stricter at once", body: [
            { t: "p", text: "It accepts more — any sequence, not just a list — while permitting less, because `Sequence` has no `append`. So the same annotation widens the callers you serve and rules out mutating their data." },
            { t: "p", text: "That is the parameter/return asymmetry in one line: general in, specific out. Returning `Sequence[str]` would be the mistake in the other direction — the caller has a list and you have hidden it." }
          ]},
          { t: "p", text: "**The enum-versus-`Literal` choice is a real judgement, not a default.** `Literal[\"gold\", \"silver\"]` types this identically and is lighter. The enum wins here only because tiers arrive from a database, and `Tier(value)` gives a runtime rejection at the boundary that a `Literal` cannot (Lesson 6.5)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team adopts `mypy` and gets 8,000 errors on the first run. They add `# type: ignore` until it passes, agree to \"fix them gradually\", and move on." },
      { t: "p", text: "**Eighteen months later there are 11,000 ignores and the checker has never caught a bug.** Every ignore is a blanket one, so each also hides any future error on that line — and the lines with ignores are precisely the ones the checker found suspicious." },
      { t: "p", text: "**The restart that worked was strict-by-default with an explicit exception list.** New and touched modules are fully checked; legacy modules are named in `[[tool.mypy.overrides]]`, so the debt is a list someone can count and shrink. `enable_error_code = [\"ignore-without-code\"]` forces every remaining suppression to name the specific error it silences." },
      { t: "p", text: "**The lesson generalises past typing.** A quality gate that is failing everywhere gets bypassed; one that is passing everywhere except a named, shrinking list gets defended. Make the exceptions visible and finite, and the ratchet does the work." }
    ]}
  ],

  takeaways: [
    "**Annotations do nothing at runtime.** Their value is entirely what a checker proves, so a hint that cannot fail is a comment.",
    "**`from __future__ import annotations` makes them lazy strings** — forward references work unquoted, but runtime readers must use `typing.get_type_hints`.",
    "**Accept the most general type, return the most specific**: `Sequence[str]` in a parameter, `list[str]` in a return.",
    "**`Sequence` and `Mapping` in parameters are promises not to mutate**, and the checker enforces them — while also accepting tuples and other implementations.",
    "**A bare container is `list[Any]`**, which checks nothing about its contents.",
    "**`Any` is contagious**: it propagates through every expression and disables checking downstream. `object` means \"unknown, narrow it first\" and is usually what was meant.",
    "**`NewType` gives distinct identifier types at zero runtime cost**, which stops a system with several kinds of id from passing the wrong one.",
    "**`Literal` and enums turn a stringly-typed argument into a closed set** the checker verifies at every call site.",
    "**Checkers narrow on control flow** — `isinstance`, `is not None`, early returns, `match` — which is what makes optional types workable rather than annoying.",
    "**`assert isinstance(...)` narrows but disappears under `-O`.** Use it for internal invariants, never for validating external input.",
    "**Type the boundaries first.** Request handlers, models and public functions are where a wrong assumption travels furthest.",
    "**Adopt with strict-by-default and a shrinking exception list**, not a codebase-wide sweep of `# type: ignore` — and require `ignore-without-code` so every suppression names its error."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why annotate a parameter as `Sequence[str]` rather than `list[str]`?",
        options: [
          "`Sequence` is faster to check",
          "It accepts tuples and other sequences, and has no `append` — so the checker rejects any accidental mutation of the caller's data",
          "`list` is deprecated in annotations",
          "It allows the function to return a different type"
        ],
        answer: 1,
        why: "The annotation is simultaneously looser in what it accepts and stricter in what the body may do. That is the parameter/return asymmetry: accept the most general type you can handle, return the most specific type you have. Returning `Sequence[str]` would be the mistake in the other direction — you have a list, and hiding that only limits the caller."
      },
      {
        stem: "What is wrong with annotating a JSON loader's return as `Any`?",
        options: [
          "Nothing — JSON is genuinely dynamic",
          "`Any` propagates: every attribute access, typo and assignment downstream is unchecked, so the type checker goes quiet exactly where data is least trustworthy",
          "`Any` causes a runtime performance cost",
          "It prevents the function from being called with keyword arguments"
        ],
        answer: 1,
        why: "`Any` is a request to stop checking, and it spreads through every expression it touches — `config.databse.hostname` raises no error, and assigning it to an `int` variable is silently allowed. `object` says \"unknown\" without disabling checking: it forces a narrowing step, which is exactly where validation of external data belongs."
      },
      {
        stem: "`assert isinstance(payload, dict)` narrows the type for mypy. When is it the wrong tool?",
        options: [
          "Whenever `isinstance` is involved",
          "When it is validating external input — `python -O` removes assertions, so the check silently disappears in an optimised run",
          "When the type has more than one possible value",
          "In any function that returns a value"
        ],
        answer: 1,
        why: "Assertions compile to nothing under `-O`, and some base images enable it. For an internal invariant the checker cannot see — \"build() has been called\" — that is fine. For validating a payload it means the guard vanishes in production. `if not isinstance(...): raise TypeError(...)` narrows exactly as well and always runs."
      },
      {
        stem: "A codebase has 11,000 `# type: ignore` comments and the checker has never caught a bug. What is the fix?",
        options: [
          "Remove the type checker",
          "Strict by default with legacy modules named in an explicit, shrinking override list, plus `ignore-without-code` so every suppression names its error",
          "Annotate every function in one large pull request",
          "Switch to a different type checker"
        ],
        answer: 1,
        why: "A blanket ignore also hides every future error on that line — and those lines are the ones the checker found suspicious. Strict-by-default means new and touched code is fully checked from the first commit, while the exceptions live in one file where they can be counted and reduced. A gate failing everywhere gets bypassed; one passing everywhere except a named list gets defended."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What do type hints actually do at runtime?",
        strong: "Nothing. They are stored in `__annotations__` and otherwise ignored — `def f(x: int) -> str` happily takes a string and returns an int. The value comes entirely from a checker running before the code does.",
        answer: [
          { t: "p", text: "The conclusion is what matters: the only hints worth writing are ones that could fail, so `data: Any` is documentation pretending to be verification." },
          { t: "p", text: "Knowing that runtime consumers exist — Pydantic, dataclasses, FastAPI — and that they must resolve string annotations with `get_type_hints` shows the distinction is understood rather than absolute." },
          { t: "p", text: "Mentioning that PEP 649 changes the mechanism in 3.14 signals the knowledge is current." }
        ]
      },
      {
        level: "advanced",
        q: "How would you introduce type checking to a large untyped codebase?",
        strong: "Strict by default, with legacy modules listed as explicit overrides that only ever shrink. Type the boundaries first — handlers, models, public functions — because that is where a wrong assumption travels furthest.",
        answer: [
          { t: "p", text: "The anti-pattern is worth naming: annotating everything at once produces thousands of errors, blanket ignores, and a checker that has never caught anything — while each ignore also hides the next real bug on that line." },
          { t: "p", text: "`ignore-without-code` is the small configuration detail that shows first-hand experience, because it converts a blanket suppression into a specific one." },
          { t: "p", text: "The general principle lands well beyond typing: a gate failing everywhere gets bypassed, and one passing everywhere except a named, finite list gets defended." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use `NewType`, `Literal` or a `TypedDict`?",
        strong: "`NewType` for distinct identifiers that are the same runtime type — `UserId` versus `OrderId`. `Literal` or an enum for a closed set of string options. `TypedDict` for a fixed-shape dict you do not construct, typically parsed JSON.",
        answer: [
          { t: "p", text: "The `NewType` case is the most persuasive because the bug is so common and the cost is zero: `UserId(42)` is `42` at runtime, and passing an order id becomes a check-time error." },
          { t: "p", text: "The `Literal`-versus-enum judgement shows range — `Literal` is lighter, an enum adds a runtime membership check that is worth having when the values cross a boundary." },
          { t: "p", text: "Knowing when a dataclass beats a `TypedDict` completes it: construct your own objects as dataclasses, describe data you merely receive as a `TypedDict`." }
        ]
      }
    ]
  }
});
