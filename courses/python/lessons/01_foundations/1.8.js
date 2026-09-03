/* ============================================================================
   LESSON 1.8 — Type Conversion and the Dynamic Type System
   ========================================================================= */
EC.receiveLesson({
  id: "1.8",

  lede: "Python is **dynamically typed** — names have no declared type — and **strongly typed** — objects refuse operations that make no sense. Those two properties are often confused, and the confusion produces two opposite mistakes: expecting Python to convert things it will not, and expecting it to reject things it happily accepts. This lesson draws the line precisely, then introduces the idea that replaces type checking in idiomatic Python.",

  objectives: [
    "Distinguish dynamic from strong typing, and predict which operations raise `TypeError`",
    "Convert between types explicitly, and anticipate where conversion silently loses information",
    "Choose between `type()` and `isinstance()`, and justify the choice",
    "Explain duck typing and why it usually beats an explicit type check",
    "Read a basic type hint and say what it does and does not do at runtime"
  ],

  prerequisites: ["1.4", "1.5", "1.6"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Dynamic and strong are different axes", id: "dynamic-vs-strong" },

    { t: "code", lang: "python", title: "dynamic: a name can hold anything", code: `
value = 42
value = "forty-two"      # fine -- the name was never typed
value = [4, 2]           # also fine

# The OBJECT has a type; the NAME does not. Lesson 1.4's model again:
# assignment rebinds a label, and labels carry no type information.
`},

    { t: "code", lang: "python", title: "strong: objects refuse nonsense", code: `
"3" + 4
`,
      out: `TypeError: can only concatenate str (not "int") to str`
    },

    { t: "p", text: "JavaScript would produce `\"34\"`. PHP would produce `7`. Both guess, and both guesses are sometimes wrong in ways that surface far from the cause. Python refuses and makes you say which you meant — `\"3\" + str(4)` or `int(\"3\") + 4`." },

    { t: "table",
      head: ["", "Static", "Dynamic"],
      rows: [
        ["**Strong**", "Rust, Java, Go — types declared, no silent coercion", "**Python**, Ruby — types discovered at runtime, no silent coercion"],
        ["**Weak**", "C — types declared, but casts reinterpret bytes", "JavaScript, PHP — types discovered, and coerced on demand"]
      ],
      caption: "Python sits in the dynamic-and-strong quadrant. \"Dynamic\" is about *when* types are known; \"strong\" is about *whether the language guesses*. Python never guesses."
    },

    { t: "callout", kind: "insight", title: "The one place Python does convert automatically", body: [
      { t: "p", text: "Numeric types are the exception, and the rule is narrow: Python widens along `int → float → complex` when an operation mixes them, because every value in the narrower type has an exact equivalent in the wider one." },
      { t: "code", lang: "python", title: "the numeric tower", numbered: false, code: `
print(1 + 2.5)              # 3.5   -- int widened to float
print(type(2 + 3j))         # complex
print(True + 1)             # 2     -- bool IS an int (Lesson 1.5)
print(3 / 2)                # 1.5   -- / always produces a float

from decimal import Decimal
Decimal("1.5") + 0.1        # TypeError -- Decimal refuses to mix with float`,
        out: `3.5
<class 'complex'>
2
1.5`},
      { t: "p", text: "`Decimal` deliberately opts out. Mixing it with `float` would reintroduce exactly the binary imprecision you chose `Decimal` to avoid, so it raises instead — a good example of a type asserting its own invariants rather than accepting a lossy conversion." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Explicit conversion, and where it loses data", id: "conversion" },

    { t: "table",
      head: ["Call", "Does", "Watch for"],
      rows: [
        ["`int(x)`", "Parses a string, or **truncates** a float toward zero", "`int(\"3.5\")` raises; `int(3.9)` is `3`, not `4`"],
        ["`float(x)`", "Parses a string or widens an int", "Accepts `\"inf\"`, `\"nan\"` and `\"1e5\"` — often unwanted from user input"],
        ["`str(x)`", "Human-readable text via `__str__`", "Never fails, which is why a bug can travel far as `\"None\"`"],
        ["`bool(x)`", "Applies truthiness (Lesson 1.7)", "`bool(\"False\")` is `True` — it only tests emptiness"],
        ["`list(x)`", "Consumes any iterable", "`list(\"abc\")` gives `['a','b','c']`, not `['abc']`"],
        ["`dict(x)`", "From pairs or keyword arguments", "Later duplicate keys silently overwrite earlier ones"],
        ["`set(x)`", "Deduplicates and discards order", "Silently drops elements — the deduplication *is* the point, but it is easy to forget"]
      ]
    },

    { t: "code", lang: "python", title: "int() is stricter than people expect", code: `
print(int("42"))
print(int("  42  "))        # surrounding whitespace is tolerated
print(int("1_000"))         # underscores are allowed, as in literals
print(int("ff", 16))        # explicit base
print(int(3.99))            # truncation toward zero, not rounding
print(int(-3.99))           # -3, not -4

int("3.5")                  # ValueError -- int() does not parse decimals
`,
      out: `42
42
1000
255
3
-3
ValueError: invalid literal for int() with base 10: '3.5'`
    },

    { t: "callout", kind: "trap", title: "Truncation is not rounding", body: [
      { t: "p", text: "`int()` truncates toward zero. That is a different operation from `round()`, and from `math.floor()` for negatives — three functions, three answers." },
      { t: "code", lang: "python", title: "compare", numbered: false, code: `
import math

for x in (2.7, -2.7):
    print(x, int(x), round(x), math.floor(x), math.ceil(x))`,
        out: `2.7 2 3 2 3
-2.7 -2 -3 -3 -2`},
      { t: "p", text: "Converting a duration, a byte count or a price with `int()` when you meant `round()` produces results that are consistently low by up to one unit — small enough to pass casual review, large enough to matter over a million rows." }
    ]},

    { t: "code", lang: "python", title: "parsing user input safely", code: `
def parse_quantity(raw: str) -> int:
    """Convert user input to a quantity, with an error a human can act on."""
    try:
        value = int(raw.strip())
    except ValueError:
        raise ValueError(f"quantity must be a whole number, got {raw!r}") from None

    if value < 0:
        raise ValueError(f"quantity cannot be negative, got {value}")
    return value


print(parse_quantity(" 12 "))
parse_quantity("12.5")
`,
      out: `12
ValueError: quantity must be a whole number, got '12.5'`,
      caption: "Two habits worth copying: catch the conversion error and re-raise with context (Lesson 6.3 covers `from None` and `from exc`), and include the offending value with `!r` so whitespace is visible."
    },

    /* ================================================================== */
    { t: "h2", n: "03", text: "type() versus isinstance()", id: "type-vs-isinstance" },

    { t: "code", lang: "python", title: "the difference is inheritance", code: `
class Animal: pass
class Dog(Animal): pass

d = Dog()

print(type(d) is Dog)              # True
print(type(d) is Animal)           # False -- exact type only
print(isinstance(d, Animal))       # True  -- respects the hierarchy

print(isinstance(d, (Dog, str)))   # True -- a tuple means "any of these"
`,
      out: `True
False
True
True`
    },

    { t: "dl", items: [
      ["`isinstance(x, T)`", "Almost always what you want. Respects inheritance, accepts a tuple of types, and works with abstract base classes and protocols."],
      ["`type(x) is T`", "Exact type only. Legitimate when a subclass genuinely must be rejected — but that is rare, and usually a design smell."],
      ["`type(x) == T`", "Avoid. Use `is`, because types are singletons and identity is the honest comparison (Lesson 1.4)."]
    ]},

    { t: "callout", kind: "trap", title: "The bool/int trap in isinstance", body: [
      { t: "code", lang: "python", title: "bool passes an int check", numbered: false, code: `
print(isinstance(True, int))       # True -- bool subclasses int

def set_limit(n):
    if not isinstance(n, int):
        raise TypeError("limit must be an integer")
    return n

print(set_limit(True))             # 1 -- accepted, almost certainly a bug`,
        out: `True
True`},
      { t: "p", text: "If a boolean is not acceptable, exclude it explicitly: `if isinstance(n, bool) or not isinstance(n, int):`. This matters most when validating deserialised JSON, where `true` and `1` are distinct in the payload and identical after an `isinstance` check." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Duck typing", id: "duck-typing",
      sub: "The idea that makes most type checks unnecessary." },

    { t: "p", text: "The name comes from the saying: *if it walks like a duck and quacks like a duck, treat it as a duck.* In Python, what matters is not what an object **is** but what it **can do**. A function that needs something it can iterate should accept anything iterable, not just a list." },

    { t: "ladder",
      title: "A function that totals order lines",
      rungs: [
        { level: "bad", label: "Checks concrete types", why: "rejects valid inputs",
          code: `def total(lines):
    if not isinstance(lines, list):
        raise TypeError("lines must be a list")
    return sum(line["amount"] for line in lines)`,
          note: "This rejects a tuple, a generator, a set, a `dict.values()` view and every custom collection — all of which would have worked perfectly. The check adds no safety and removes usefulness. It also fails to catch the error it was aiming at: a list of the wrong thing still passes." },

        { level: "ok", label: "Checks capability", why: "honest, but usually redundant",
          code: `from collections.abc import Iterable

def total(lines):
    if not isinstance(lines, Iterable):
        raise TypeError("lines must be iterable")
    return sum(line["amount"] for line in lines)`,
          note: "Better — it asks about capability rather than identity, and abstract base classes make that expressible. But the `for` loop was already going to raise `TypeError: 'int' object is not iterable` on the next line, with a message that is just as clear." },

        { level: "best", label: "Declares intent, checks nothing", why: "EAFP",
          code: `from collections.abc import Iterable


def total(lines: Iterable[dict]) -> Decimal:
    """Sum the amount of every order line."""
    return sum(line["amount"] for line in lines)`,
          note: "The type hint documents the contract for readers and for mypy, which checks it without running the code. At runtime, Python's own error is raised at the point of failure and names the actual problem. This is EAFP — *easier to ask forgiveness than permission* — and it is the idiomatic default. Lesson 5.3 covers when to break it." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "When an explicit check does earn its place", body: [
      { t: "ul", items: [
        "**At a trust boundary.** Data from an HTTP request, a queue or a file is untrusted, and failing early with a precise message beats failing deep inside with a confusing one. This is validation, not type checking — and Pydantic (Lesson 12.3) does it better than hand-written `isinstance` calls.",
        "**When behaviour differs by type.** A function accepting either a path or an open file object must ask which it received. `singledispatch` (Lesson 5.10) expresses this more cleanly than a chain of `isinstance`.",
        "**When the error would otherwise be silent.** Passing a `str` where an iterable of strings is expected does not raise — it iterates characters. That is a real bug that a check catches and duck typing does not."
      ]},
      { t: "code", lang: "python", title: "the string-is-iterable trap", numbered: false, code: `
def send_all(recipients):
    for r in recipients:
        print("sending to", r)

send_all(["a@x.com", "b@x.com"])    # 2 emails
send_all("a@x.com")                 # 9 "emails", one per character`,
        out: `sending to a@x.com
sending to b@x.com
sending to a
sending to @
sending to x`},
      { t: "p", text: "This is the classic case where duck typing is too permissive: `str` quacks like an iterable but means something entirely different. An explicit `isinstance(recipients, str)` guard is justified here — and a type hint of `list[str]` lets mypy catch it before it runs." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Type hints, briefly", id: "type-hints" },

    { t: "p", text: "Type hints let you write down what a function expects. They are covered fully in Lesson 8.3; the essential point now is what they do and do not do." },

    { t: "code", lang: "python", title: "hints are not enforced at runtime", code: `
def repeat(text: str, times: int) -> str:
    return text * times


print(repeat("ab", 3))
print(repeat(5, 3))        # hints say str -- Python does not check, and this "works"
`,
      out: `ababab
15`
    },

    { t: "dl", items: [
      ["What they do", "Document the contract for readers, drive editor autocomplete and refactoring, and let a static checker such as **mypy** find mismatches without running the code."],
      ["What they do not do", "Validate anything at runtime. Python ignores them during execution — `repeat(5, 3)` runs and returns `15`."],
      ["What closes the gap", "mypy in CI (Lesson 14.4) for your own code, and Pydantic (Lesson 12.3) for data arriving from outside, where runtime validation genuinely is required."]
    ]},

    { t: "callout", kind: "insight", title: "Why hints matter more in Python than in typed languages", body: [
      { t: "p", text: "Lesson 1.1 established that Python defers almost everything to runtime: an undefined name in an untaken branch reaches production, and a type mismatch is discovered when the line executes." },
      { t: "p", text: "Type hints plus a static checker buy back a large part of what a compiler would have given you — and unlike a compiler you can adopt them incrementally, one module at a time, on a codebase that already exists. That incremental path is the reason they are worth starting on day one rather than treating as an advanced topic." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Coerce a messy CSV row into real types",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Everything read from a CSV is a string. Turning those strings into the types your program actually needs is a task you will do hundreds of times, and it is where conversion mistakes concentrate." },
        { t: "p", text: "Write a converter for order rows that is strict where it matters and forgiving where the source is merely untidy." }
      ],
      requirements: [
        "Convert `order_id` to `int`, `amount` to `Decimal`, `quantity` to `int`, `is_gift` to `bool`, and `notes` to `str | None`.",
        "Tolerate surrounding whitespace on every field.",
        "`is_gift` arrives as `\"true\"`, `\"1\"`, `\"yes\"`, `\"false\"`, `\"0\"`, `\"no\"` or empty — parse it, do not coerce it.",
        "An empty `notes` field must become `None`, not `\"\"` — the distinction from Lesson 1.5.",
        "Reject `\"12.5\"` for `quantity` with an error naming the field and the value, rather than silently truncating.",
        "Collect **all** errors in a row before raising, so a user fixing a spreadsheet sees every problem at once rather than one per run."
      ],
      hint: "Build a small table mapping field name to a converter function, then loop over it accumulating errors. That structure keeps the per-field rules readable and makes the all-errors-at-once requirement fall out naturally.",
      solution: {
        lang: "python",
        title: "coerce_row.py",
        code: `"""Convert raw CSV strings into typed values, reporting every problem at once."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Callable

TRUE = {"1", "true", "yes", "y", "on"}
FALSE = {"0", "false", "no", "n", "off", ""}


class RowError(ValueError):
    """One or more fields in a row could not be converted."""

    def __init__(self, problems: list[str]) -> None:
        self.problems = problems
        super().__init__("; ".join(problems))


def to_int(value: str) -> int:
    # int() rejects "12.5" on its own, which is the behaviour we want --
    # silently truncating a quantity would corrupt an order.
    return int(value)


def to_decimal(value: str) -> Decimal:
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("not a valid decimal") from exc


def to_bool(value: str) -> bool:
    lowered = value.lower()
    if lowered in TRUE:
        return True
    if lowered in FALSE:
        return False
    raise ValueError(f"expected a boolean, accepted: {sorted(TRUE | FALSE - {''})}")


def to_optional_str(value: str) -> str | None:
    # "" means the cell was blank, which is absence -- not an empty note.
    return value or None


CONVERTERS: dict[str, Callable[[str], Any]] = {
    "order_id": to_int,
    "amount": to_decimal,
    "quantity": to_int,
    "is_gift": to_bool,
    "notes": to_optional_str,
}


def coerce_row(row: dict[str, str]) -> dict[str, Any]:
    """Convert one CSV row, accumulating every field error before raising."""
    result: dict[str, Any] = {}
    problems: list[str] = []

    for field, convert in CONVERTERS.items():
        raw = row.get(field)
        if raw is None:
            problems.append(f"{field}: missing")
            continue

        cleaned = raw.strip()
        try:
            result[field] = convert(cleaned)
        except ValueError as exc:
            # !r so a stray space or a letter O among the digits is visible.
            problems.append(f"{field}: {exc} (got {cleaned!r})")

    if problems:
        raise RowError(problems)
    return result


if __name__ == "__main__":
    good = coerce_row({
        "order_id": " 1001 ",
        "amount": "19.99",
        "quantity": "3",
        "is_gift": "YES",
        "notes": "   ",
    })
    print(good)
    assert good["notes"] is None
    assert good["is_gift"] is True
    assert good["amount"] == Decimal("19.99")

    try:
        coerce_row({
            "order_id": "abc",
            "amount": "N/A",
            "quantity": "12.5",
            "is_gift": "maybe",
            "notes": "fine",
        })
    except RowError as exc:
        for problem in exc.problems:
            print(" -", problem)`,
        notes: [
          { t: "p", text: "**Accumulating errors instead of raising on the first one** is the requirement that changes the design. A converter that stops at the first bad field forces a user to fix a spreadsheet one cell per run; this one tells them everything at once. The cost is a slightly longer function, and it is worth it every time." },
          { t: "p", text: "**`int(\"12.5\")` raising is a feature, not an obstacle.** Silently truncating a quantity from 12.5 to 12 would produce an order that is quietly wrong. Where truncation *is* intended, `int(float(value))` says so explicitly and a reader can see the decision." },
          { t: "p", text: "**`value or None` is correct here** even though Lesson 1.7 warned about `or`. The warning applies when a falsy value is meaningful; for an optional free-text note, a blank cell and an empty string genuinely mean the same thing. Knowing which situation you are in is the skill — not avoiding the operator." },
          { t: "callout", kind: "tradeoff", title: "You would not hand-write this in production", body: [
            { t: "p", text: "This is exactly what Pydantic does, with better error messages, nested models, and hints doubling as the schema:" },
            { t: "code", lang: "python", title: "the library version", numbered: false, code: `
from decimal import Decimal
from pydantic import BaseModel


class OrderRow(BaseModel):
    order_id: int
    amount: Decimal
    quantity: int
    is_gift: bool = False
    notes: str | None = None`},
            { t: "p", text: "Writing the manual version once is still worth it: it shows you what the library is doing, so when Pydantic rejects a value or coerces one you did not expect, you can reason about it rather than guess. Lesson 12.3 covers Pydantic in full." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An analytics job reports that 3% of users have the account tier `\"None\"` — the four-character string, not the value. The database column is nullable and the writes come from a Python service." },
      { t: "p", text: "**What happened:** somewhere in the write path, `str(tier)` was called on a value that was `None`. `str()` never fails — that is its defining property — so `None` became `\"None\"` and travelled onward as a perfectly valid string. No error, no log line, no exception." },
      { t: "p", text: "**Why this class of bug is nasty:** `str()` is a total function. Every other conversion in this lesson can reject bad input; `str()` accepts everything, so it converts a bug into data. The same shape produces `\"[]\"`, `\"{}\"` and the reliably confusing `\"<object at 0x7f8b...>\"` in production tables." },
      { t: "p", text: "**The defence:** handle `None` before formatting rather than after — `\"\" if tier is None else str(tier)`, or let the column stay `NULL`. And when a string column starts accumulating suspicious literal values, search the write path for an unguarded `str()` or f-string interpolation of a possibly-`None` value." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "Python is **dynamically typed** (names carry no type) and **strongly typed** (objects refuse nonsensical operations). Those are different axes, and Python never guesses a conversion.",
    "The one automatic conversion is the numeric tower, `int → float → complex`. `Decimal` deliberately opts out to protect its own exactness.",
    "**`int()` truncates toward zero; it does not round.** `int(-3.9)` is `-3`, `round(-3.9)` is `-4`, `math.floor(-3.9)` is `-4`. Three functions, three answers.",
    "`int(\"3.5\")` raises — and that is desirable. Where truncation is intended, `int(float(x))` states it.",
    "**`str()` never fails**, so it turns a `None` bug into the literal string `\"None\"` and lets it reach your database. Guard before formatting.",
    "Prefer `isinstance()` to `type()`: it respects inheritance and accepts a tuple. Remember that `isinstance(True, int)` is `True`.",
    "**Duck typing is the default.** Accept anything that can do what you need; let the operation raise naturally rather than pre-checking a concrete type.",
    "The justified exceptions are trust boundaries, type-dependent behaviour, and the `str`-is-iterable trap — where duck typing silently does the wrong thing instead of failing.",
    "Type hints are **not enforced at runtime**. They document intent and let mypy check statically; Pydantic is what validates data arriving from outside."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the result of `int(-3.7)`, `round(-3.7)` and `math.floor(-3.7)`?",
        options: [
          "`-4`, `-4`, `-4` — all three round to the nearest integer",
          "`-3`, `-4`, `-4` — `int` truncates toward zero; the other two go to negative infinity",
          "`-3`, `-3`, `-4` — only `floor` rounds down",
          "`-4`, `-4`, `-3` — `floor` truncates toward zero"
        ],
        answer: 1,
        why: "`int()` truncates toward zero, so `-3.7` becomes `-3`. `round()` goes to the nearest integer, `-4`. `math.floor()` always goes toward negative infinity, also `-4` here — but note that `int()` and `floor()` agree on positives and disagree on negatives, which is why substituting one for the other produces a bug that only appears with negative values."
      },
      {
        stem: "A column in your database contains the literal string `\"None\"` for some rows. What most likely happened?",
        options: [
          "The database driver serialises Python `None` as the string `\"None\"`",
          "`str()` was applied to a value that was `None`, and `str()` never fails — so the bug became data",
          "A failed JSON parse fell back to a string representation",
          "The column has a default value of `\"None\"` in its schema"
        ],
        answer: 1,
        why: "`str()` is a total function: it accepts every object and always succeeds, which is exactly what makes it dangerous. `str(None)` is `\"None\"`, and the same happens with f-string interpolation of a possibly-`None` value. Every other conversion in this lesson can reject bad input; `str()` silently converts a bug into a valid-looking string that then travels through the whole system. Drivers map `None` to SQL `NULL` correctly, so the conversion happened in application code."
      },
      {
        stem: "A function validates `if not isinstance(limit, int): raise TypeError(...)`. A caller passes `True`. What happens?",
        options: [
          "A `TypeError` is raised, since `bool` is not `int`",
            "It is accepted, because `bool` subclasses `int` — and `True` then behaves as `1`",
          "It is accepted but converted to `0`",
          "A `DeprecationWarning` is emitted and the value is coerced"
        ],
        answer: 1,
        why: "`bool` is a subclass of `int`, so `isinstance(True, int)` is `True` and the check passes. The value then behaves as `1` throughout the function — plausible enough to go unnoticed. It matters most when validating deserialised JSON, where `true` and `1` are distinct in the payload but indistinguishable after this check. Exclude it explicitly with `isinstance(n, bool) or not isinstance(n, int)`."
      },
      {
        stem: "Why is `def send_all(recipients)` followed by `for r in recipients:` a case where duck typing is not enough?",
        options: [
          "Strings are not iterable, so passing one raises a confusing `TypeError`",
          "A string *is* iterable, so passing one silently iterates characters instead of failing",
          "The loop cannot detect an empty list and will hang",
          "Duck typing always requires an explicit `isinstance` guard"
        ],
        answer: 1,
        why: "This is the classic exception to duck typing. `str` quacks like an iterable — it has `__iter__` — but iterating it yields characters, which is almost never what a function expecting a collection of items intends. Because nothing raises, the bug is silent: one call sends nine notifications instead of one. An explicit `isinstance(recipients, str)` guard is justified here, and a `list[str]` hint lets mypy catch it before it runs."
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
        q: "Is Python strongly typed or weakly typed?",
        strong: "Strongly typed, and dynamically typed — they are different axes. Dynamic means names have no declared type and types are known at runtime. Strong means Python refuses operations that do not make sense rather than guessing: `\"3\" + 4` raises `TypeError` instead of producing `\"34\"` or `7`.",
        answer: [
          { t: "p", text: "The question is designed to find out whether you can separate the two axes. Many candidates conflate \"dynamic\" with \"weak\" and answer that Python is weakly typed, which is the opposite of true." },
          { t: "p", text: "The `\"3\" + 4` example does the work in one line, especially contrasted with JavaScript producing `\"34\"`. Mentioning the numeric tower as the one deliberate exception — and that `Decimal` opts out of it to protect exactness — shows you know the rule has a boundary and why it sits where it does." }
        ]
      },
      {
        level: "core",
        q: "When would you use isinstance() rather than duck typing?",
        strong: "Rarely. The default is duck typing: accept anything that can do what you need, and let the operation raise naturally. The justified exceptions are trust boundaries where you want a precise early error, functions whose behaviour genuinely differs by type, and the `str`-is-iterable case where duck typing silently does the wrong thing.",
        answer: [
          { t: "p", text: "Interviewers use this to check whether you write Python or write another language in Python. Defensive `isinstance` checks at the top of every function are a Java habit that makes Python code less useful without making it safer." },
          { t: "p", text: "The strongest single example is the string case: `send_all(\"a@x.com\")` iterates characters and sends nine notifications, with no error anywhere. That is the situation where a check earns its place, and naming it shows you have a principle rather than a preference." },
          { t: "p", text: "Worth adding: at a genuine trust boundary the answer is usually not `isinstance` at all — it is Pydantic or an equivalent, which validates, coerces and produces error messages you can return to a caller." }
        ],
        weak: "Answering \"always check types for safety\". It rejects valid inputs, adds no protection against the errors that actually occur, and signals unfamiliarity with how Python code is normally written."
      },
      {
        level: "advanced",
        q: "Do type hints make Python statically typed?",
        strong: "No. They are annotations that Python ignores at runtime — a function hinted `def f(x: int)` runs happily when passed a string. They become useful through external tooling: mypy checks them without executing the code, and editors use them for completion and refactoring.",
        answer: [
          { t: "p", text: "The follow-up is usually *so what is the point?* — and the strong answer connects back to how Python executes code." },
          { t: "p", text: "Because Python defers almost everything to runtime, an undefined name or a type mismatch in a rarely-taken branch reaches production. A static checker buys back much of what a compiler would have caught, and unlike a compiler it can be adopted incrementally, module by module, on an existing codebase." },
          { t: "p", text: "The distinction worth drawing explicitly is between static checking and runtime validation. mypy protects you from your own code; it does nothing about a malformed JSON payload. That is Pydantic's job, and confusing the two leads teams to believe hints are validating data when they are not." }
        ]
      }
    ]
  }
});
