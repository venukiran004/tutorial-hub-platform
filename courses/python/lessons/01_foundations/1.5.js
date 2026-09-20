/* ============================================================================
   LESSON 1.5 — Numbers, Booleans and None
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "Python's integers are unbounded, which removes an entire class of bug that C and Java programmers spend careers avoiding. Its floats are ordinary IEEE-754 doubles, which introduces a different class of bug — one that quietly produces **wrong money**. This lesson covers both, plus the two values that are not really numbers but behave like them: `bool`, which is secretly an `int`, and `None`, which is not zero.",

  objectives: [
    "Explain why Python integers never overflow, and what that costs",
    "Predict where float arithmetic will be inexact, and choose the right type for money",
    "Use `//`, `%`, `divmod` and `round` correctly, including their behaviour on negatives",
    "Explain why `True + True == 2` and when that is useful rather than a curiosity",
    "Distinguish `None`, `False`, `0` and `\"\"` and use `None` to mean *absent* rather than *empty*"
  ],

  prerequisites: ["1.4"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Integers that do not overflow", id: "int" },

    { t: "p", text: "In most languages an integer is a fixed number of bits, and exceeding it wraps around silently. Python has no such limit — an `int` grows to whatever size your memory allows." },

    { t: "code", lang: "python", title: "arbitrary precision", code: `
big = 2 ** 1000
print(len(str(big)), "digits")

# Factorial of 100, exactly. No approximation, no overflow.
import math
print(math.factorial(100))
`,
      out: `302 digits
93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000`
    },

    { t: "callout", kind: "insight", title: "What this buys, and what it costs", body: [
      { t: "p", text: "**What it buys:** integer overflow — a leading cause of security vulnerabilities and silent corruption in C — simply does not exist in Python. Financial identifiers, cryptographic values, hash values and counters cannot wrap." },
      { t: "p", text: "**What it costs:** a Python `int` is a heap object with a header, not a machine word. Arithmetic on it is a function call, not a CPU instruction, and memory use is several times higher. This is one of the concrete reasons for the performance model in Lesson 1.1 — and exactly why NumPy uses fixed-width types instead." },
      { t: "code", lang: "python", title: "the price, measured", numbered: false, code: `
import sys

print(sys.getsizeof(0))          # even zero is an object
print(sys.getsizeof(2 ** 64))    # grows with magnitude
print(sys.getsizeof(2 ** 1000))`,
        out: `28
40
160`},
      { t: "p", text: "**The trap that follows:** NumPy arrays use fixed-width C integers, so they *can* overflow — silently, and with no exception. Lesson 15.1 covers this; for now, note that leaving pure Python means re-acquiring a problem Python had solved for you." }
    ]},

    { t: "table",
      head: ["Operator", "Meaning", "Note"],
      rows: [
        ["`/`", "True division — **always returns a float**", "`6 / 3` is `2.0`, not `2`"],
        ["`//`", "Floor division — rounds toward negative infinity", "`-7 // 2` is `-4`, not `-3`"],
        ["`%`", "Modulo — result carries the sign of the *divisor*", "`-7 % 3` is `2` in Python, `-1` in C and Java"],
        ["`divmod(a, b)`", "Both at once, as a tuple", "One operation instead of two; use when you need both"],
        ["`**`", "Exponentiation", "`2 ** 0.5` returns a float; `pow(a, b, m)` does modular exponentiation efficiently"]
      ],
      caption: "The `//` and `%` behaviour on negatives is a genuine difference from C-family languages, and it is deliberate: Python guarantees `a == (a // b) * b + (a % b)` for all values, which the C convention does not."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Floats, and the money bug", id: "float" },

    {"kind": "cells", "title": "0.1 + 0.2 in binary", "caption": "A float is 53 significant bits; 0.1 is a repeating fraction in binary and is stored as 0.1000000000000000055511151231257827…, which is why 0.1 + 0.2 == 0.3 is False and money belongs in Decimal or integer cents.", "items": ["0.1", "+", "0.2", "=", "0.30000000000000004"], "highlight": [4], "negative": false, "tone": "crit", "t": "diagram", "id": "dg-1_5-02-0"},




    { t: "p", text: "A Python `float` is a 64-bit IEEE-754 double. That is a binary format, and it cannot represent most decimal fractions exactly — for the same reason base-10 cannot represent one third exactly." },

    { t: "code", lang: "python", title: "the canonical demonstration", code: `
print(0.1 + 0.2)
print(0.1 + 0.2 == 0.3)

from decimal import Decimal
print(Decimal(0.1))     # what 0.1 actually is, in full
`,
      out: `0.30000000000000004
False
0.1000000000000000055511151231257827021181583404541015625`
    },

    { t: "p", text: "This is not a Python defect. Every language using IEEE-754 behaves this way — JavaScript, Java, C, Go. Python is simply honest about it in `repr`." },

    { t: "viz",
      title: "Why 0.1 cannot be stored exactly",
      caption: "Binary floating point stores a sign, an exponent and a 53-bit significand. Only fractions whose denominator is a power of two land exactly on a representable point; 0.1 falls between two of them, and the nearest is stored instead. Errors from many such roundings accumulate.",
      svg: `<svg viewBox="0 0 900 210" role="img" aria-label="Diagram: representable binary floating point values on a number line, with 0.1 falling between two of them">
  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">EXACTLY REPRESENTABLE (denominator is a power of 2)</text>
  <line x1="20" y1="62" x2="620" y2="62" style="stroke:var(--border-strong)" stroke-width="1.5"/>
  <g style="stroke:var(--good)" stroke-width="2">
    <line x1="20" y1="54" x2="20" y2="70"/>
    <line x1="170" y1="54" x2="170" y2="70"/>
    <line x1="320" y1="54" x2="320" y2="70"/>
    <line x1="470" y1="54" x2="470" y2="70"/>
    <line x1="620" y1="54" x2="620" y2="70"/>
  </g>
  <text x="20"  y="88" text-anchor="middle" class="s-mono" style="fill:var(--good)">0.0</text>
  <text x="170" y="88" text-anchor="middle" class="s-mono" style="fill:var(--good)">0.125</text>
  <text x="320" y="88" text-anchor="middle" class="s-mono" style="fill:var(--good)">0.25</text>
  <text x="470" y="88" text-anchor="middle" class="s-mono" style="fill:var(--good)">0.375</text>
  <text x="620" y="88" text-anchor="middle" class="s-mono" style="fill:var(--good)">0.5</text>

  <line x1="140" y1="40" x2="140" y2="62" style="stroke:var(--crit)" stroke-width="1.5" stroke-dasharray="3 2"/>
  <circle cx="140" cy="62" r="4" style="fill:var(--crit)"/>
  <text x="140" y="34" text-anchor="middle" class="s-mono" style="fill:var(--crit)">0.1</text>
  <text x="672" y="62" class="s-sub" style="fill:var(--crit)">falls between two</text>
  <text x="672" y="76" class="s-sub" style="fill:var(--crit)">representable values</text>

  <rect x="20" y="120" width="600" height="72" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="142" class="s-sub" style="fill:var(--ink-2);font-weight:600">The consequence for money</text>
  <text x="36" y="162" class="s-mono" style="font-size:10.5px">0.1 + 0.2        -&gt;  0.30000000000000004</text>
  <text x="36" y="178" class="s-mono" style="font-size:10.5px">sum of 1000 prices -&gt;  error compounds, invoices disagree by cents</text>
  <text x="672" y="152" class="s-sub" style="fill:var(--good);font-weight:600">Use Decimal</text>
  <text x="672" y="168" class="s-sub">or integer cents</text>
</svg>`
    },

    { t: "ladder",
      title: "Representing money",
      rungs: [
        { level: "bad", label: "Float", why: "silently wrong at scale",
          code: `total = 0.0
for price in [19.99, 5.01, 0.10]:
    total += price

print(total)              # 25.099999999999998
print(total == 25.10)     # False`,
          note: "It looks fine on three items. Sum a hundred thousand transactions and the accumulated error becomes a reconciliation failure that finance will find before you do." },

        { level: "ok", label: "Integer minor units", why: "exact, but you own the scaling",
          code: `# Store cents as int. Exact arithmetic, no float anywhere.
total_cents = 0
for price_cents in [1999, 501, 10]:
    total_cents += price_cents

print(total_cents)                     # 2510
print(f"\${total_cents / 100:.2f}")     # format only at the edge`,
          note: "This is what many payment systems do, Stripe included — amounts travel as integer minor units. It is exact and fast. The cost is that every input and output needs conversion, and currencies with other exponents (JPY has none, some have three) become your problem." },

        { level: "best", label: "Decimal with an explicit context", why: "exact, and states the rounding rule",
          code: `from decimal import Decimal, ROUND_HALF_UP

# Construct from str, never from float -- Decimal(0.1) inherits the error.
prices = [Decimal("19.99"), Decimal("5.01"), Decimal("0.10")]
total = sum(prices)

print(total)                                   # 25.10
print(total == Decimal("25.10"))               # True

tax = (total * Decimal("0.0825")).quantize(
    Decimal("0.01"), rounding=ROUND_HALF_UP
)
print(tax)                                     # 2.07`,
          note: "Decimal is base-10, so it represents what you typed. The important discipline is in the details: **construct from strings**, and **state the rounding mode** rather than inheriting a default. Financial regulations often mandate a specific rounding rule, and `quantize` is where you declare it." }
      ]
    },

    { t: "callout", kind: "trap", title: "Never compare floats with ==", body: [
      { t: "p", text: "If you must work in floats — scientific and ML code legitimately does — compare with a tolerance instead of exact equality." },
      { t: "code", lang: "python", title: "the right way", numbered: false, code: `
import math

a = 0.1 + 0.2
print(a == 0.3)                          # False
print(math.isclose(a, 0.3))              # True

# Near zero, relative tolerance is useless -- supply an absolute one.
print(math.isclose(1e-18, 0.0))                    # False
print(math.isclose(1e-18, 0.0, abs_tol=1e-9))      # True`},
      { t: "p", text: "`math.isclose` uses a relative tolerance by default, which is the right choice for most magnitudes and the wrong one near zero — where every value is relatively far from every other. Passing `abs_tol` is not optional when zero is in range. NumPy's equivalent is `np.isclose` / `np.allclose`." }
    ]},

    { t: "callout", kind: "trap", title: "round() does not round the way you were taught", body: [
      { t: "code", lang: "python", title: "banker's rounding", numbered: false, code: `
print(round(0.5))    # 0   -- not 1
print(round(1.5))    # 2
print(round(2.5))    # 2   -- not 3
print(round(2.675, 2))  # 2.67 -- not 2.68`,
        out: `0
2
2
2.67`},
      { t: "p", text: "Two separate things are happening. Python uses **round-half-to-even** (banker's rounding), which is the IEEE-754 default and exists because always rounding halves up introduces a statistical bias that accumulates over large datasets. And `round(2.675, 2)` gives `2.67` because 2.675 is not exactly 2.675 in binary — it is very slightly below." },
      { t: "p", text: "For money, do not fight this with a float. Use `Decimal.quantize` with the rounding mode your domain requires, and make the choice explicit in the code where an auditor can see it." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "bool is an int", id: "bool" },

    {"kind": "tree", "title": "bool is a subclass of int", "caption": "True and False are the integers 1 and 0 with a different __repr__. That is why True + True == 2, why sum(flags) counts, and why isinstance(True, int) is True.", "root": {"label": "object", "children": [{"label": "int", "tone": "accent", "children": [{"label": "bool", "sub": "True = 1, False = 0", "tone": "good"}]}, {"label": "float"}, {"label": "NoneType", "sub": "one instance: None"}]}, "t": "diagram", "id": "dg-1_5-03-1"},




    { t: "p", text: "`bool` is a subclass of `int`. `True` is 1 and `False` is 0, not merely convertible to them." },

    { t: "code", lang: "python", title: "and this is genuinely useful", code: `
print(isinstance(True, int))     # True
print(True + True)               # 2

# Counting matches without an if-statement or a filter:
responses = [200, 404, 200, 500, 200, 301]
ok_count = sum(code == 200 for code in responses)
print(ok_count)

# Reads naturally with any()/all() too:
print(any(code >= 500 for code in responses))
`,
      out: `True
2
3
True`
    },

    { t: "callout", kind: "warn", title: "Truthiness is not equality", body: [
      { t: "p", text: "Python treats many values as false in a boolean context: `False`, `None`, `0`, `0.0`, `\"\"`, `[]`, `{}`, `()`, `set()`, and any object whose `__bool__` or `__len__` says so. That is convenient — and it is why the following bug is so common." },
      { t: "code", lang: "python", title: "the bug", numbered: false, code: `
def apply_limit(limit=None):
    if not limit:               # WRONG: 0 is falsy
        limit = 100
    return limit

print(apply_limit(0))           # 100 -- the caller explicitly asked for 0`,
        out: `100`},
      { t: "p", text: "The caller said \"limit of zero\" and got a hundred. **When zero, empty string or empty list are legitimate values, test against `None` explicitly:**" },
      { t: "code", lang: "python", title: "the fix", numbered: false, code: `
def apply_limit(limit: int | None = None) -> int:
    if limit is None:           # only the absent case gets the default
        limit = 100
    return limit`,
        hl: [2]},
      { t: "p", text: "`if not x:` is correct and idiomatic when you genuinely mean \"empty or missing\". It is a bug when zero is meaningful — which in real systems is often: quantities, offsets, timeouts, retry counts, prices, scores." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "None means absent", id: "none" },

    { t: "p", text: "`None` is a singleton — there is exactly one instance in the process, which is why `is None` is the correct test (Lesson 1.4). Its job is to represent **the absence of a value**, which is a different statement from zero or empty." },

    { t: "table",
      head: ["Value", "Means", "Example"],
      rows: [
        ["`None`", "No value exists / not applicable / not yet known", "A user who has never logged in has `last_login = None`"],
        ["`0`", "A quantity, which happens to be zero", "A user with no items has `item_count = 0`"],
        ["`\"\"`", "A string, which happens to be empty", "A user who cleared their bio has `bio = \"\"`"],
        ["`[]`", "A collection, which happens to be empty", "A user with no roles has `roles = []`"]
      ],
      caption: "These distinctions carry real information. Collapsing them — usually via `or` or a truthiness test — destroys it, and the destroyed information is exactly what you need when debugging."
    },

    { t: "code", lang: "python", title: "why the distinction matters in an API", code: `
# A PATCH request. The client sent: {"bio": ""}
# Meaning: "clear my bio". Not: "leave my bio alone".

def update_profile(user: dict, bio: str | None = None) -> dict:
    # WRONG -- an empty string is discarded, so the user cannot clear it
    # if bio:
    #     user["bio"] = bio

    # RIGHT -- None means "field absent from the request"
    if bio is not None:
        user["bio"] = bio
    return user
`,
      hl: [10, 11],
      caption: "This is the single most common PATCH-endpoint bug. The distinction between *field not sent* and *field sent as empty* is the entire semantics of a partial update, and truthiness erases it. Lesson 12.3 covers how Pydantic models this explicitly."
    },

    { t: "callout", kind: "insight", title: "A function that returns None", body: [
      { t: "p", text: "Every Python function returns something. A function with no `return` statement returns `None` — which means a function that returns a value on some paths and falls off the end on others returns `None` on those paths, silently." },
      { t: "code", lang: "python", title: "the silent path", numbered: false, code: `
def find_user(users, user_id):
    for user in users:
        if user["id"] == user_id:
            return user
    # no return here -> returns None when not found


user = find_user([], 42)
print(user["name"])          # TypeError: 'NoneType' object is not subscriptable`},
      { t: "p", text: "`'NoneType' object is not subscriptable` and `'NoneType' object has no attribute ...` are among the most frequent Python errors, and they nearly always trace back to a function like this. Returning `None` for \"not found\" is a legitimate design — but then the type hint must say `-> dict | None`, and every caller must handle it. Lesson 6.5 covers the alternative: raising instead." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "An invoice that adds up",
      difficulty: "foundation",
      minutes: 25,
      body: [
        { t: "p", text: "Build a small invoice calculator. The requirement is not that it works on your three test values — it is that it is **exact**, and that its rounding behaviour is a stated decision rather than an accident." },
        { t: "p", text: "This is the shape of a real task: the maths is trivial, and every difficulty is in choosing the right representation." }
      ],
      requirements: [
        "Accept line items as `(description, unit_price, quantity)` where the price arrives as a string, the way it would from JSON or a database.",
        "Compute each line total, the subtotal, tax at 8.25%, and the grand total.",
        "The result must be **exact** — verify with an equality assertion against a known correct value, not a tolerance.",
        "Round the tax to two decimal places using a rounding mode you have named explicitly in the code.",
        "Handle a quantity of `0` correctly, and a `None` discount distinctly from a `0` discount.",
        "Print a formatted invoice with aligned columns."
      ],
      hint: "Construct every `Decimal` from a string, never from a float — `Decimal(0.1)` inherits the binary error rather than removing it. For the discount, remember the distinction between *absent* and *zero* from this lesson.",
      solution: {
        lang: "python",
        title: "invoice.py",
        code: `"""Exact invoice arithmetic using Decimal."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import NamedTuple

TAX_RATE = Decimal("0.0825")
CENTS = Decimal("0.01")


class LineItem(NamedTuple):
    description: str
    unit_price: Decimal
    quantity: int

    @property
    def total(self) -> Decimal:
        return self.unit_price * self.quantity


def to_money(value: str) -> Decimal:
    """Parse a money string exactly.

    Decimal(str) is exact. Decimal(float) is not -- it faithfully reproduces
    whatever binary approximation the float already contained.
    """
    return Decimal(value)


def build_invoice(
    rows: list[tuple[str, str, int]],
    discount: Decimal | None = None,
) -> dict[str, Decimal | list[LineItem]]:
    items = [
        LineItem(desc, to_money(price), qty) for desc, price, qty in rows
    ]

    subtotal = sum((item.total for item in items), start=Decimal("0"))

    # None means "no discount was supplied". Decimal("0") means "a discount
    # of zero was explicitly applied" -- worth distinguishing on a receipt.
    if discount is None:
        discount_amount = Decimal("0")
    else:
        discount_amount = (subtotal * discount).quantize(
            CENTS, rounding=ROUND_HALF_UP
        )

    taxable = subtotal - discount_amount
    tax = (taxable * TAX_RATE).quantize(CENTS, rounding=ROUND_HALF_UP)

    return {
        "items": items,
        "subtotal": subtotal,
        "discount": discount_amount,
        "tax": tax,
        "total": taxable + tax,
    }


def render(invoice: dict) -> str:
    lines = [f"{'Item':<28}{'Qty':>5}{'Unit':>12}{'Total':>12}", "-" * 57]
    for item in invoice["items"]:
        lines.append(
            f"{item.description:<28}{item.quantity:>5}"
            f"{item.unit_price:>12}{item.total:>12}"
        )
    lines.append("-" * 57)
    for label in ("subtotal", "discount", "tax", "total"):
        lines.append(f"{label.title():<45}{invoice[label]:>12}")
    return "\\n".join(lines)


if __name__ == "__main__":
    invoice = build_invoice(
        [
            ("Widget", "19.99", 3),
            ("Gadget", "5.01", 1),
            ("Sticker", "0.10", 0),     # zero quantity is valid
        ],
        discount=None,
    )

    # Exact equality -- no tolerance needed, and none accepted.
    assert invoice["subtotal"] == Decimal("65.00"), invoice["subtotal"]
    assert invoice["tax"] == Decimal("5.36"), invoice["tax"]
    assert invoice["total"] == Decimal("70.36"), invoice["total"]

    print(render(invoice))`,
        notes: [
          { t: "p", text: "**The three decisions that make this correct**, none of which are about the arithmetic:" },
          { t: "ul", items: [
            "**`Decimal(str)`, never `Decimal(float)`.** Converting a float to Decimal preserves the binary error with perfect fidelity — it does not remove it. The string is the source of truth, and it arrives as a string from JSON and from most database drivers anyway.",
            "**`quantize` with a named rounding mode.** `ROUND_HALF_UP` is written in the code, so a reviewer or auditor can see which rule was applied. Relying on the default is how a system ends up rounding one way in one place and another way elsewhere.",
            "**`None` and `Decimal(\"0\")` are different discounts.** One means no discount was offered; the other means one was applied and came to nothing. On a receipt, and in a dispute, that distinction matters."
          ]},
          { t: "callout", kind: "tradeoff", title: "Decimal is not free", body: [
            { t: "p", text: "Decimal arithmetic runs roughly an order of magnitude slower than float, and each value is a heavier object. For money that is irrelevant — you are processing thousands of values, not billions, and correctness is not negotiable." },
            { t: "p", text: "For scientific computing, ML and simulation, floats are the right choice: the inputs are measurements with their own uncertainty, the algorithms are designed for approximate arithmetic, and NumPy's speed depends on fixed-width types. **The rule is about the domain, not about precision in the abstract** — use Decimal when a human will reconcile the number, and float when a model will consume it." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A reporting job sums order totals and writes a daily figure. Finance reports that the dashboard disagrees with the accounting system by a few cents each day — never the same amount, always small, never zero." },
      { t: "p", text: "**The diagnosis:** order totals are stored as `NUMERIC` in Postgres (exact) but the driver or the ORM is converting them to Python floats before summing. Each conversion is exact-ish; the accumulated sum is not. The accounting system sums in the database, where the type is exact." },
      { t: "p", text: "**The fix has two halves.** Configure the driver to return `Decimal` for numeric columns — `psycopg` does this by default, but some ORMs and pandas readers do not. And where the aggregate is large, do the sum in SQL, which is both exact and faster than pulling a million rows into Python. Lesson 13.3 covers type mapping across that boundary." },
      { t: "p", text: "The generalisable lesson: **the type boundary between your database and your language is where precision is silently lost.** It is worth checking explicitly rather than assuming." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "Python integers are unbounded — overflow does not exist. The cost is that each one is a heap object, several times larger and slower than a machine word.",
    "**Floats are binary and cannot represent most decimal fractions.** `0.1 + 0.2 != 0.3` in every IEEE-754 language; Python is just honest about it.",
    "For money use `Decimal` (constructed from strings) or integer minor units. Never float, and never compare monetary floats with `==`.",
    "Compare floats with `math.isclose`, and pass `abs_tol` whenever zero is in range — relative tolerance is meaningless near zero.",
    "`round()` uses banker's rounding (half-to-even) by design. For money, use `Decimal.quantize` with an explicitly named rounding mode.",
    "`bool` subclasses `int`, so `sum(x == target for x in items)` is a clean, idiomatic count.",
    "**Truthiness is not equality.** `if not limit:` treats a legitimate `0` as missing — use `is None` whenever zero or empty is a valid value.",
    "`None` means *absent*, which is distinct from `0`, `\"\"` and `[]`. Collapsing them destroys the exact information PATCH endpoints and debugging depend on.",
    "A function with no `return` returns `None`. If that is a real outcome, say so in the type hint and handle it at every call site."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function is written as `def paginate(size=None):` with a body starting `if not size: size = 50`. A caller passes `size=0`. What happens, and is it correct?",
        options: [
          "`size` stays `0` — only `None` triggers the default",
          "`size` becomes `50`, because `0` is falsy — the caller's explicit request is silently discarded",
          "A `TypeError` is raised because `0` is not a valid page size",
          "`size` becomes `50`, which is correct behaviour since a page size of zero is meaningless"
        ],
        answer: 1,
        why: "`0` is falsy, so `not size` is `True` and the default overrides the caller. Whether zero is *meaningful* is a separate design question — the bug is that the code cannot tell the difference between \"caller said zero\" and \"caller said nothing\". If zero should be rejected, reject it explicitly with a clear error. If it is valid, test `if size is None:`. Either way, truthiness has erased the information needed to decide."
      },
      {
        stem: "Which expression is guaranteed to be exactly `Decimal(\"0.30\")`?",
        options: [
          "`Decimal(0.1) + Decimal(0.2)`",
          "`Decimal(\"0.1\") + Decimal(\"0.2\")`",
          "`Decimal(0.1 + 0.2)`",
          "`Decimal(round(0.1 + 0.2, 2))`"
        ],
        answer: 1,
        why: "Only B never touches a float. `Decimal(0.1)` converts a float that is already slightly wrong, and reproduces that error exactly — Decimal does not repair binary approximation, it faithfully represents whatever it was given. C is worse, converting the already-incorrect sum. D looks plausible but `round` operates on a float first, so the error exists before Decimal sees it. Construct from strings, and the arithmetic that follows is exact. (Strictly, B yields `Decimal(\"0.3\")`, which compares equal to `Decimal(\"0.30\")`.)"
      },
      {
        stem: "What does `print(round(2.5), round(3.5), round(-0.5))` output?",
        options: [
          "`3 4 -1` — standard rounding, halves away from zero",
          "`2 4 0` — banker's rounding, halves to the nearest even number",
          "`2 3 0` — halves always round down",
          "`3 4 0` — halves round up, except negatives which round toward zero"
        ],
        answer: 1,
        why: "Python implements round-half-to-even, the IEEE-754 default. 2.5 goes to 2, 3.5 goes to 4, and -0.5 goes to -0 (which prints as 0) — in each case the even neighbour. It exists because always rounding halves away from zero introduces an upward statistical bias that accumulates across large datasets. It is the right default and the wrong behaviour for many financial rules, which is why money uses `Decimal.quantize` with an explicit mode."
      },
      {
        stem: "A PATCH endpoint receives `{\"nickname\": \"\"}`, meaning the user wants to clear their nickname. The handler contains `if nickname: user.nickname = nickname`. What is the result?",
        options: [
          "The nickname is cleared correctly, since an empty string is assigned",
          "The nickname is left unchanged, because `\"\"` is falsy — the user cannot clear the field",
          "A validation error is raised for the empty string",
          "The nickname is set to `None`"
        ],
        answer: 1,
        why: "`\"\"` is falsy, so the branch never runs and the update is silently dropped. This is the archetypal partial-update bug: the entire semantics of PATCH rest on distinguishing *field not sent* from *field sent as empty*, and a truthiness test collapses them. The correct test is `if nickname is not None:`. Pydantic models this explicitly with `model_fields_set` or a sentinel type, covered in Lesson 12.3."
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
        q: "Why does 0.1 + 0.2 not equal 0.3?",
        strong: "Floats are binary IEEE-754 doubles. Only fractions with a power-of-two denominator are exactly representable, and 0.1 is not one — so the stored value is the nearest representable neighbour, and the sum of two approximations is not the approximation of the sum. Every IEEE-754 language does this; Python just displays it honestly.",
        answer: [
          { t: "p", text: "The follow-up is always the practical one: *so what do you use for money?*" },
          { t: "p", text: "Answer with both options and the trade-off between them. `Decimal` is base-10 and exact, constructed from strings, with an explicit rounding mode — the right default. Integer minor units are what many payment APIs use, exact and fast, at the cost of manual scaling and currency-exponent handling." },
          { t: "p", text: "Mentioning `math.isclose` for the legitimate float cases — scientific and ML code — shows you are not applying a blanket rule. Floats are correct there; the domain decides." }
        ],
        weak: "Saying it is \"a Python bug\" or \"a rounding error in Python\". It is neither, and the phrasing suggests you have not met the underlying representation."
      },
      {
        level: "core",
        q: "When should you write `if x is None` rather than `if not x`?",
        strong: "Whenever zero, empty string or empty collection is a legitimate value. `not x` is true for all of them, so it cannot distinguish *absent* from *empty*, and that distinction is often the whole point — page sizes, quantities, timeouts, and every PATCH request field.",
        answer: [
          { t: "p", text: "The best answers reach for a concrete failure rather than restating the rule. The partial-update case is the strongest: a client sends `{\"bio\": \"\"}` to clear a field, and `if bio:` silently discards it. The user reports that clearing their bio does not work, and nothing in the logs shows an error." },
          { t: "p", text: "It is worth saying explicitly when `if not x:` *is* correct — checking whether a list has items before iterating, or whether a string has content to display. It is idiomatic and preferred there. The skill is knowing which situation you are in, not preferring one form globally." }
        ]
      },
      {
        level: "advanced",
        q: "A dashboard total disagrees with the accounting system by a few cents daily. Where do you look?",
        strong: "At every boundary where an exact type could become a float: the database driver's type mapping, an ORM column definition, a pandas read that infers float64, or a JSON round-trip. The database stores NUMERIC exactly; something between there and the dashboard is converting and accumulating error.",
        answer: [
          { t: "p", text: "This question rewards knowing that precision is lost at *boundaries*, not inside arithmetic. Narrate the path the number takes — column type, driver, ORM, serialisation, aggregation — and check the type at each hop." },
          { t: "p", text: "Two specific culprits worth naming: pandas will happily read a `NUMERIC` column into `float64` unless told otherwise, and JSON has no decimal type, so a naive serialise/deserialise round-trip turns exact values into floats." },
          { t: "p", text: "The senior close is architectural: aggregate in the database where the type is exact and the engine is faster, and treat the boundary type mapping as something to assert on in tests rather than assume. \"Sum a million rows in SQL, not in Python\" is both the correctness fix and the performance fix." }
        ]
      }
    ]
  }
});
