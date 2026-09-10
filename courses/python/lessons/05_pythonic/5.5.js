/* ============================================================================
   LESSON 5.5 — Structural Pattern Matching
   ========================================================================= */
EC.receiveLesson({
  id: "5.5",

  lede: "`match` is not a switch statement. Reading it as one produces worse code than the `if/elif` chain it replaced, because a switch compares values and `match` **destructures shapes** — it tests the structure of the data and binds the pieces out of it in the same step. That is a different tool, and it earns its place on nested data, not on comparing a string to four constants.",

  objectives: [
    "Distinguish destructuring from value comparison, and use `match` for the former",
    "Write every pattern kind: literal, capture, sequence, mapping, class and OR",
    "Use guards, and know where a guard belongs versus a pattern",
    "Avoid the capture-pattern trap that silently matches everything",
    "Choose between `match`, a dispatch dict and `if/elif` deliberately"
  ],

  prerequisites: ["2.6", "2.9", "5.4"],

  blocks: [

    { t: "h2", n: "01", text: "Why it is not a switch", id: "not-a-switch" },


    { t: "viz",
      title: "match is structural, not a switch",
      caption: "Each case is a shape to match against, and matching binds names from the structure. That is what separates it from a chain of equality tests, and why it suits parsing rather than dispatch.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="A match statement whose cases destructure different data shapes">
  <text x="30" y="56" class="s-sub" style="fill:var(--ink-2)">match event:</text>

  <g style="stroke-width:2">
    <rect x="48" y="70" width="390" height="38" rx="6" style="fill:var(--accent);fill-opacity:.13;stroke:var(--accent)"/>
    <rect x="48" y="116" width="390" height="38" rx="6" style="fill:var(--warn);fill-opacity:.13;stroke:var(--warn)"/>
    <rect x="48" y="162" width="390" height="38" rx="6" style="fill:var(--good);fill-opacity:.13;stroke:var(--good)"/>
  </g>
  <text x="66" y="94"  class="s-sub" style="fill:var(--ink-2)">case {"type": "click", "pos": (x, y)}:</text>
  <text x="66" y="140" class="s-sub" style="fill:var(--ink-2)">case [first, *others] if others:</text>
  <text x="66" y="186" class="s-sub" style="fill:var(--ink-2)">case Point(x=0, y=0):</text>

  <text x="470" y="94"  class="s-sub" style="fill:var(--good)">binds x and y from the tuple</text>
  <text x="470" y="140" class="s-sub" style="fill:var(--good)">a guard runs after the shape matches</text>
  <text x="470" y="186" class="s-sub" style="fill:var(--good)">matches a class by its attributes</text>

  <text x="30" y="226" class="s-sub" style="fill:var(--crit)">A bare name always matches and binds — case x: is a catch-all, not a comparison with a variable called x.</text>
</svg>`
    },
    { t: "code", lang: "python", title: "the wrong use, and the right one", code: `
# WRONG USE: comparing one value against constants.
# This is a dict (Lesson 2.6) written as control flow.
match status:
    case "pending": return handle_pending()
    case "paid":    return handle_paid()
    case "shipped": return handle_shipped()


# RIGHT USE: the shape of the data varies, and you need the pieces out.
match event:
    case {"type": "order.created", "data": {"id": order_id, "total": total}}:
        create_order(order_id, total)

    case {"type": "order.refunded", "data": {"id": order_id, "reason": reason}}:
        refund_order(order_id, reason)

    case {"type": str(unknown)}:
        logger.warning("unhandled event type %r", unknown)

    case _:
        raise ValueError(f"malformed event: {event!r}")
`,
      caption: "The second version tests the structure *and* binds `order_id`, `total` and `reason` in one step. The `if/elif` equivalent needs a condition and then two or three lines of defensive extraction per branch (Lesson 2.9)."
    },

    { t: "callout", kind: "mental", title: "The question that decides it", body: [
      { t: "p", text: "**Am I comparing a value, or taking apart a shape?**" },
      { t: "ul", items: [
        "Comparing one value to constants → a **dict**. It is a lookup, and `match` adds nothing but syntax.",
        "Testing the *structure* of nested data and extracting fields → **`match`**. This is what it was built for.",
        "A handful of unrelated boolean conditions → **`if/elif`**. `match` cannot express them any better."
      ]},
      { t: "p", text: "The tell is whether your `case` clauses contain bindings. If every case is `case \"literal\":` with no variables extracted, you have written a switch and a dict would be shorter, faster and configurable." }
    ]},

    { t: "h2", n: "02", text: "The pattern kinds", id: "kinds" },

    { t: "tabs", items: [
      { label: "Literal & capture", blocks: [
        { t: "code", lang: "python", title: "the two simplest, and the trap between them", code: `
match command:
    case "quit":            # LITERAL: compares by ==
        stop()

    case 0 | 1 | 2:         # OR pattern: any of these literals
        handle_small()

    case None:              # None, True, False compare by IDENTITY
        handle_missing()

    case other:             # CAPTURE: binds anything, matches ALWAYS
        handle(other)       # -- so it must come last

    case "never reached":   # unreachable: the capture above took it
        ...
`},
        { t: "callout", kind: "trap", title: "A bare name is a capture, not a comparison", body: [
          { t: "code", lang: "python", title: "the single most common match bug", numbered: false, code: `
PENDING = "pending"
PAID = "paid"

match status:
    case PENDING:        # does NOT compare to the constant --
        ...              # it BINDS status to a new local named PENDING
    case PAID:           # unreachable: the case above always matched
        ...`},
          { t: "p", text: "`case PENDING:` treats `PENDING` as a **capture pattern**: it matches anything and rebinds the name. Every case after it is dead, and nothing warns you — the code runs and always takes the first branch." },
          { t: "p", text: "**The fix is a dotted name**, which Python reads as a value pattern:" },
          { t: "code", lang: "python", title: "use an enum or a namespace", numbered: false, code: `
class Status(StrEnum):
    PENDING = "pending"
    PAID = "paid"

match status:
    case Status.PENDING:      # dotted -> a VALUE pattern, compares by ==
        ...
    case Status.PAID:
        ...`,
            hl: [6]},
          { t: "p", text: "This is a strong practical argument for enums over bare string constants: **only a dotted name can be a value pattern**, so an enum makes the correct thing the natural thing." }
        ]}
      ]},
      { label: "Sequence", blocks: [
        { t: "code", lang: "python", title: "matching on length and position", code: `
match command.split():
    case ["quit"]:
        stop()

    case ["move", direction]:                 # exactly 2 elements
        move(direction)

    case ["move", direction, int(distance)]:  # and the 3rd must be an int
        move(direction, distance)

    case ["deploy", *services]:               # 1 or more, rest captured
        deploy(services)

    case []:
        show_help()

    case _:
        raise ValueError(f"unknown command: {command!r}")
`},
          { t: "p", text: "Sequence patterns match `list` and `tuple` but deliberately **not `str` or `bytes`** — otherwise `case [x, y]:` would match the two-character string `\"ab\"`, which is the Lesson 1.8 trap. The language special-cases it for you here." }
      ]},
      { label: "Mapping", blocks: [
        { t: "code", lang: "python", title: "matching JSON-shaped data", code: `
match payload:
    # A mapping pattern matches a SUBSET -- extra keys are fine.
    case {"action": "create", "user": {"email": email}}:
        create_user(email)

    # Nested, with a type check on the extracted value
    case {"action": "update", "id": int(user_id), "fields": dict(fields)}:
        update_user(user_id, fields)

    # **rest captures the keys not named above
    case {"action": action, **rest}:
        logger.info("action=%s extra=%s", action, sorted(rest))
`},
        { t: "callout", kind: "insight", title: "Mapping patterns match subsets", body: [
          { t: "p", text: "`case {\"action\": \"create\"}` matches any dict *containing* that key and value, regardless of what else is present. That is the opposite of a sequence pattern, which requires an exact length unless you use `*rest`." },
          { t: "p", text: "It is the right default for API payloads — a partner adding a field should not break your matching (Lesson 2.9). When you genuinely need exactness, check `len()` in a guard." }
        ]}
      ]},
      { label: "Class", blocks: [
        { t: "code", lang: "python", title: "matching types and their attributes", code: `
from dataclasses import dataclass


@dataclass
class Click:
    x: int
    y: int


@dataclass
class KeyPress:
    key: str
    modifiers: frozenset[str] = frozenset()


match event:
    # isinstance check plus attribute binding, in one pattern
    case Click(x=0, y=0):
        reset_view()

    case Click(x=x, y=y) if x < 0 or y < 0:
        raise ValueError(f"negative coordinates: {x}, {y}")

    case Click(x=x, y=y):
        handle_click(x, y)

    # Positional patterns work because dataclasses define __match_args__
    case KeyPress("q", modifiers) if "ctrl" in modifiers:
        quit_app()

    case KeyPress(key):
        type_character(key)
`},
        { t: "p", text: "`Click(x=x, y=y)` is an `isinstance` check *and* two attribute extractions. Positional form — `KeyPress(\"q\", modifiers)` — relies on `__match_args__`, which `@dataclass` and `NamedTuple` generate automatically; a hand-written class must set it explicitly." }
      ]}
    ]},

    { t: "h2", n: "03", text: "Guards", id: "guards" },

    { t: "code", lang: "python", title: "a condition the pattern cannot express", code: `
match order:
    case {"total": total} if total > 10_000:
        require_approval(order)

    case {"total": total} if total <= 0:
        raise ValueError(f"non-positive total: {total}")

    case {"total": total}:
        process(order)
`,
      caption: "A guard runs **after** the pattern matches and its bindings are made, so it can use them. If the guard is false, matching continues to the next case — the pattern is not re-tested."
    },

    { t: "callout", kind: "good", title: "Put structure in the pattern, values in the guard", body: [
      { t: "code", lang: "python", title: "the division of labour", numbered: false, code: `
# Structure belongs in the pattern
case {"type": "order", "items": [first, *rest]}:

# Comparisons belong in the guard
case {"total": total} if total > LIMIT:

# NOT this -- a guard doing structural work the pattern could do
case dict() as d if "items" in d and isinstance(d["items"], list):`},
      { t: "p", text: "The last form works and throws away the point of `match`: the pattern language exists to express exactly that, more clearly and with the bindings for free." }
    ]},

    { t: "h2", n: "04", text: "Order matters, and there is no fall-through", id: "order" },

    { t: "code", lang: "python", title: "first match wins", code: `
match point:
    case (0, 0):        print("origin")
    case (0, y):        print(f"on the y-axis at {y}")
    case (x, 0):        print(f"on the x-axis at {x}")
    case (x, y):        print(f"at {x}, {y}")
`,
      caption: "Like `if/elif`, the first matching case wins and nothing falls through — no `break` needed. So specific patterns must come before general ones, and a bare `case _:` or a capture pattern must be last."
    },

    { t: "callout", kind: "warn", title: "There is no exhaustiveness check at runtime", body: [
      { t: "p", text: "If no case matches, the `match` statement does **nothing** — silently. There is no error and no default." },
      { t: "code", lang: "python", title: "the silent fall-through", numbered: false, code: `
status = "cancelled"

match status:
    case "pending": print("waiting")
    case "paid":    print("done")

print("nothing happened, and nothing said so")`,
        out: `nothing happened, and nothing said so`},
      { t: "p", text: "**Always end with `case _:`** that raises or logs, unless doing nothing is genuinely correct and you say so in a comment. mypy can check exhaustiveness for enums and `Literal` types via an `assert_never` in the final case — which is the only static safety net available:" },
      { t: "code", lang: "python", title: "static exhaustiveness", numbered: false, code: `
from typing import assert_never

match status:
    case Status.PENDING: ...
    case Status.PAID:    ...
    case _ as unreachable:
        assert_never(unreachable)   # mypy errors if a member is unhandled`}
    ]},

    { t: "h2", n: "05", text: "When to use which", id: "choosing" },

    { t: "ladder",
      title: "Handling incoming webhook events",
      rungs: [
        { level: "bad", label: "if/elif with defensive extraction", why: "the shape check and the extraction are separate",
          code: `if event.get("type") == "order.created":
    data = event.get("data") or {}
    order_id = data.get("id")
    total = data.get("total")
    if order_id is None or total is None:
        raise ValueError("malformed order.created")
    create_order(order_id, total)
elif event.get("type") == "order.refunded":
    data = event.get("data") or {}
    ...`,
          note: "Six lines per branch, most of them re-checking a shape the condition already implied. The defensive `get` chains are the Lesson 2.9 problem, and each branch repeats them." },

        { level: "ok", label: "Dispatch dict plus a model", why: "clean, and two mechanisms",
          code: `HANDLERS = {
    "order.created": handle_created,
    "order.refunded": handle_refunded,
}

handler = HANDLERS.get(event["type"])
if handler is None:
    raise UnknownEvent(event["type"])
handler(OrderEvent.model_validate(event["data"]))`,
          note: "Good, and often the right answer — each handler is separately testable and adding a type needs no edit (Lesson 3.4). It uses two mechanisms though: a dict for dispatch and a model for shape, so the shape lives away from the branch that needs it." },

        { level: "best", label: "match, when the shapes differ per type", why: "one construct, structure and binding together",
          code: `match event:
    case {"type": "order.created",
          "data": {"id": str(order_id), "total": total}}:
        create_order(order_id, Decimal(str(total)))

    case {"type": "order.refunded",
          "data": {"id": str(order_id), "reason": str(reason)}}:
        refund_order(order_id, reason)

    case {"type": "user.deleted", "data": {"id": str(user_id)}}:
        anonymise(user_id)

    case {"type": str(unknown)}:
        raise UnknownEvent(unknown)

    case _:
        raise ValueError(f"malformed event: {event!r}")`,
          note: "Each case states the exact shape it handles and binds only what it needs — a payload missing `total` simply does not match `order.created` and falls through to the malformed case, with no defensive checks anywhere. **This wins over the dispatch dict when the payload shapes differ per type**; when they are uniform and each handler is substantial, the dict plus a model is better because the handlers become independently testable." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Parse a query language",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Interpret a small filter language expressed as nested JSON — the shape most search APIs use. Every branch differs in structure, which is exactly the case `match` was designed for." },
        { t: "p", text: "One of the requirements contains the capture-pattern trap. Write it wrong first, observe the silent failure, then fix it." }
      ],
      requirements: [
        "Interpret nested filter dicts into SQL fragments with bound parameters — never string interpolation (Lesson 1.6).",
        "Support: a field comparison, `and`/`or` with a list of sub-filters, `not` with one sub-filter, and an `in` with a list of values.",
        "Use class patterns for at least one case, and a guard for at least one.",
        "**Deliberately write a case using a bare constant name**, observe that every later case becomes unreachable, then fix it with an enum.",
        "End with a `case _:` that raises, naming the malformed fragment.",
        "Write a test for each operator and one proving a malformed filter raises rather than being silently ignored.",
        "Explain in one sentence why `match` beats `if/elif` here."
      ],
      hint: "For the trap: put `case AND:` where `AND = \"and\"` is a module constant, run the tests, and note which ones fail and how.",
      solution: {
        lang: "python",
        title: "query_filter.py",
        code: `"""Interpret a nested filter language into parameterised SQL."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any, NamedTuple


class Op(StrEnum):
    """An enum, not module constants -- see THE TRAP below.

    Only a DOTTED name is a value pattern in a match statement, so an
    enum makes the correct form the natural one.
    """
    AND = "and"
    OR = "or"
    NOT = "not"
    IN = "in"
    EQ = "eq"
    GT = "gt"


class Fragment(NamedTuple):
    """SQL text plus its bound parameters. Never interpolated."""
    sql: str
    params: tuple[Any, ...]


class MalformedFilter(ValueError):
    """A filter fragment did not match any known shape."""


@dataclass(frozen=True)
class Field:
    """A field reference. Used to show a class pattern."""
    name: str

    def __post_init__(self) -> None:
        # Field names cannot be parameterised in SQL, so they are the
        # one thing that must be validated rather than bound.
        if not self.name.replace("_", "").isalnum():
            raise MalformedFilter(f"unsafe field name: {self.name!r}")


# =========================================================================
# THE TRAP, written out
# =========================================================================
#
# AND = "and"
# OR = "or"
#
# match node:
#     case {"op": AND, "filters": filters}:    # AND is a CAPTURE pattern
#         ...                                  # it matches ANY op value
#     case {"op": OR, "filters": filters}:     # unreachable, always
#         ...
#
# Every filter is treated as an AND, and nothing warns you: the code
# runs, the tests for OR fail with a confusing SQL string, and the
# cause is invisible because "case AND:" reads like a comparison.
#
# A bare name in a case is a capture: it binds and always matches.
# Op.AND is dotted, so Python reads it as a VALUE pattern and compares.


def to_sql(node: Any) -> Fragment:
    match node:
        # ---- boolean combinators: recursive, shape differs per op ----

        case {"op": Op.AND, "filters": [_, *_] as filters}:
            # [_, *_] requires at least one element -- an empty AND is
            # ambiguous, so it falls through to the malformed case.
            parts = [to_sql(f) for f in filters]
            return Fragment(
                "(" + " AND ".join(p.sql for p in parts) + ")",
                tuple(p for part in parts for p in part.params),
            )

        case {"op": Op.OR, "filters": [_, *_] as filters}:
            parts = [to_sql(f) for f in filters]
            return Fragment(
                "(" + " OR ".join(p.sql for p in parts) + ")",
                tuple(p for part in parts for p in part.params),
            )

        case {"op": Op.NOT, "filter": inner}:
            part = to_sql(inner)
            return Fragment(f"NOT ({part.sql})", part.params)

        # ---- comparisons ----

        case {"op": Op.IN, "field": str(name), "values": [_, *_] as values}:
            placeholders = ", ".join("%s" for _ in values)
            return Fragment(
                f"{Field(name).name} IN ({placeholders})", tuple(values)
            )

        # A GUARD: the structure is fine, the VALUE is not. Structure in
        # the pattern, comparisons in the guard.
        case {"op": Op.GT, "field": str(name), "value": value} if value is not None:
            return Fragment(f"{Field(name).name} > %s", (value,))

        case {"op": Op.EQ, "field": str(name), "value": None}:
            # IS NULL, not "= NULL" -- a real SQL trap worth encoding
            return Fragment(f"{Field(name).name} IS NULL", ())

        case {"op": Op.EQ, "field": str(name), "value": value}:
            return Fragment(f"{Field(name).name} = %s", (value,))

        # ---- a CLASS pattern ----

        case Field(name=name):
            return Fragment(f"{name} IS NOT NULL", ())

        # ---- the mandatory catch-all ----
        #
        # Without this, an unrecognised filter would match nothing and
        # the function would fall off the end returning None -- silently
        # producing a query with a missing clause.

        case _:
            raise MalformedFilter(f"unrecognised filter: {node!r}")


# =========================================================================
# tests
# =========================================================================

def test_equality_and_null() -> None:
    assert to_sql({"op": "eq", "field": "status", "value": "paid"}) == Fragment(
        "status = %s", ("paid",)
    )
    # None must become IS NULL: "= %s" with None never matches in SQL
    assert to_sql({"op": "eq", "field": "deleted_at", "value": None}) == Fragment(
        "deleted_at IS NULL", ()
    )


def test_in_and_guard() -> None:
    assert to_sql(
        {"op": "in", "field": "region", "values": ["eu", "us"]}
    ) == Fragment("region IN (%s, %s)", ("eu", "us"))

    assert to_sql({"op": "gt", "field": "total", "value": 100}) == Fragment(
        "total > %s", (100,)
    )

    # The guard rejects gt with a null value -- structurally valid,
    # semantically meaningless
    try:
        to_sql({"op": "gt", "field": "total", "value": None})
    except MalformedFilter:
        pass
    else:
        raise AssertionError("gt with a null value must not match")


def test_nested_combinators() -> None:
    """The case that makes match worth it: recursive, varying shapes."""
    result = to_sql({
        "op": "and",
        "filters": [
            {"op": "eq", "field": "status", "value": "paid"},
            {"op": "not", "filter": {"op": "in", "field": "region",
                                     "values": ["eu"]}},
        ],
    })
    assert result.sql == "(status = %s AND NOT (region IN (%s)))"
    assert result.params == ("paid", "eu")


def test_malformed_raises_rather_than_returning_none() -> None:
    for bad in (
        {"op": "and", "filters": []},          # empty -- [_, *_] rejects it
        {"op": "eq", "field": "x"},            # no value key
        {"op": "unknown", "field": "x", "value": 1},
        "not a dict at all",
    ):
        try:
            to_sql(bad)
        except MalformedFilter:
            pass
        else:
            raise AssertionError(f"expected MalformedFilter for {bad!r}")


def test_field_names_are_validated_not_bound() -> None:
    """Values are parameterised; field names cannot be, so they are
    validated instead (Lesson 1.6)."""
    try:
        to_sql({"op": "eq", "field": "x; DROP TABLE users", "value": 1})
    except MalformedFilter as exc:
        assert "unsafe field name" in str(exc)
    else:
        raise AssertionError("expected the injection attempt to be rejected")


if __name__ == "__main__":
    for t in (
        test_equality_and_null,
        test_in_and_guard,
        test_nested_combinators,
        test_malformed_raises_rather_than_returning_none,
        test_field_names_are_validated_not_bound,
    ):
        t()
    print(to_sql({"op": "and", "filters": [
        {"op": "eq", "field": "status", "value": "paid"},
        {"op": "gt", "field": "total", "value": 100},
    ]}))`,
        out: `Fragment(sql='(status = %s AND total > %s)', params=('paid', 100))`,
        notes: [
          { t: "p", text: "**Why `match` beats `if/elif` here, in one sentence:** each branch tests a different nested shape and needs different fields out of it, so the pattern does the check and the extraction together — the `if/elif` version needs a condition plus three or four lines of defensive `get` per branch, repeated seven times." },
          { t: "p", text: "**`[_, *_] as filters` is doing real work.** It requires at least one element, so `{\"op\": \"and\", \"filters\": []}` does not match and falls through to the catch-all rather than producing the SQL fragment `()`, which is a syntax error the database would report from a query nobody can trace back." },
          { t: "p", text: "**The `value: None` case must come before the general `value` case.** `case {\"value\": None}` is a literal pattern matching by identity; putting it after the capture case would make it unreachable, and the query would emit `deleted_at = %s` with a `None` parameter — which in SQL never matches anything, silently returning zero rows." },
          { t: "callout", kind: "insight", title: "The two safety mechanisms, and why they differ", body: [
            { t: "p", text: "Values go through parameters — `%s` and a params tuple — so no value can alter the query's structure. Field names **cannot** be parameterised by any SQL driver, so they are validated instead, in `Field.__post_init__`." },
            { t: "p", text: "That asymmetry is worth internalising: parameterisation protects the places it can reach, and everywhere else — table names, column names, `ORDER BY` direction — needs an allow-list or a validated identifier. Lesson 13.3 covers it in full." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team migrates an event router from `if/elif` to `match`, using module-level constants for the event types: `case ORDER_CREATED:`. Tests for the first event type pass; every other type is silently routed to the first handler. Nobody spots it in review because the code reads exactly like a comparison." },
      { t: "p", text: "**A bare name in a `case` is a capture pattern.** `case ORDER_CREATED:` matches anything and rebinds the local name `ORDER_CREATED` to the event type — so the first case always wins and every subsequent one is unreachable. There is no warning, no error, and the syntax is indistinguishable from a value comparison." },
      { t: "p", text: "**Only a dotted name is a value pattern.** `case EventType.ORDER_CREATED:` compares; `case ORDER_CREATED:` captures. That single rule is the strongest practical argument for enums over bare string constants — it makes the correct form the natural one rather than something you must remember." },
      { t: "p", text: "**What catches it:** a test per branch, which would have failed immediately, and `ruff`'s `match` rules. It is worth knowing that `case _ as x: assert_never(x)` gives mypy an exhaustiveness check for enum and `Literal` subjects — the only static protection available, and it does not help with the capture trap itself." }
    ]}
  ],

  takeaways: [
    "**`match` destructures shapes; it does not compare values.** If every case is a bare literal with no bindings, you have written a switch and a dict is better.",
    "The tell is whether your cases **bind anything**. Structure plus extraction in one step is what `match` is for.",
    "**A bare name in a `case` is a capture pattern** — it matches everything and rebinds the name, making every later case unreachable, silently.",
    "**Only a dotted name is a value pattern.** This is the strongest practical argument for enums over bare string constants.",
    "Sequence patterns require an exact length unless starred, and deliberately do **not** match `str` or `bytes`.",
    "**Mapping patterns match subsets** — extra keys are fine, which is the right default for API payloads.",
    "Class patterns do an `isinstance` check and attribute extraction together; positional form needs `__match_args__`, which dataclasses and `NamedTuple` generate.",
    "**Structure belongs in the pattern, comparisons in the guard.** A guard doing structural work throws away the point of the construct.",
    "**A `match` with no matching case does nothing, silently.** Always end with `case _:` that raises, and use `assert_never` for static exhaustiveness on enums.",
    "`match` beats a dispatch dict when the payload shapes **differ per branch**; the dict wins when shapes are uniform and each handler is substantial."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`ORDER_CREATED = \"order.created\"` is a module constant. What does `case ORDER_CREATED:` do?",
        options: [
          "Compares the subject to the constant's value",
          "Captures — it matches anything and rebinds the local name `ORDER_CREATED`, making every later case unreachable",
          "Raises `SyntaxError`, because constants cannot be used in patterns",
          "Compares by identity rather than equality"
        ],
        answer: 1,
        why: "A bare name in a `case` is always a capture pattern: it matches any subject and binds it to that name. So the first such case wins every time and every subsequent case is dead code — with no warning, since the syntax is indistinguishable from a comparison. Only a *dotted* name is a value pattern, which is why `case Status.PENDING:` works and is the practical argument for enums over bare string constants."
      },
      {
        stem: "What happens when a `match` statement has no matching case and no `case _`?",
        options: [
          "`MatchError` is raised",
          "Nothing — the statement completes silently, doing no work",
          "The last case runs as a default",
          "A `RuntimeWarning` is emitted"
        ],
        answer: 1,
        why: "Unlike some languages' match expressions, Python's `match` has no runtime exhaustiveness requirement — falling through every case is a no-op. In a function that should return a value, this means silently returning `None`, which then fails somewhere unrelated. Always end with `case _:` that raises or logs; for enum and `Literal` subjects, `case _ as x: assert_never(x)` gives mypy a static exhaustiveness check."
      },
      {
        stem: "Does `case {\"type\": \"order\"}` match `{\"type\": \"order\", \"id\": 5, \"total\": 20}`?",
        options: [
          "No — mapping patterns require an exact key set",
          "Yes — mapping patterns match a subset, so extra keys are permitted",
          "Only if `**rest` is added to the pattern",
          "Only if the extra keys have no values"
        ],
        answer: 1,
        why: "Mapping patterns are deliberately subset matches: the named keys must be present and match, and anything else is ignored. That is the right default for API payloads, where a partner adding a field should not break your handling. It contrasts with sequence patterns, which require an exact length unless you use a starred element. Add `**rest` only when you want to capture the unnamed keys."
      },
      {
        stem: "When is a dispatch dict a better choice than `match`?",
        options: [
          "Whenever there are more than three branches",
          "When the branches compare one value to constants and the payload shapes are uniform — the dict is a lookup, is configurable, and keeps each handler separately testable",
          "Never — `match` supersedes dispatch dicts",
          "Only when the keys are strings"
        ],
        answer: 1,
        why: "If every case is `case \"literal\":` with no bindings, `match` is a switch and a dict expresses it better — it is O(1), inspectable, loadable from configuration, and adding a case needs no edit to shared control flow. `match` earns its place when the branches test *different structures* and need different fields extracted, because then the pattern does the check and the binding in one step."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is `match` for, and how is it different from a switch statement?",
        strong: "It is structural pattern matching, not value comparison. A switch compares one value to constants; `match` tests the *shape* of data and binds the pieces out of it in the same step. So it earns its place on nested payloads where each branch has a different structure — not on comparing a status string to four literals, which is a dict.",
        answer: [
          { t: "p", text: "The diagnostic to offer is concrete: look at whether your cases bind anything. If every case is a bare literal with no variables extracted, you have written a switch and a dict is shorter, faster and configurable." },
          { t: "p", text: "The strongest example is an event router where each event type carries a different payload shape — the pattern does the shape check and the field extraction together, replacing a condition plus several lines of defensive `get` per branch." },
          { t: "p", text: "Mentioning that mapping patterns match subsets while sequence patterns require exact length shows you have used it rather than read about it." }
        ]
      },
      {
        level: "advanced",
        q: "What is the most common bug people hit with `match`?",
        strong: "Using a bare constant name in a case. `case PENDING:` is a capture pattern — it matches anything and rebinds the name — so the first such case always wins and every later one is unreachable. Nothing warns you, and the syntax reads exactly like a comparison.",
        answer: [
          { t: "p", text: "The fix is the memorable part: only a *dotted* name is a value pattern. `Status.PENDING` compares, `PENDING` captures." },
          { t: "p", text: "That makes it a genuine argument for enums over module-level string constants — not on style grounds, but because the enum form is the only one that behaves correctly in a pattern." },
          { t: "p", text: "Worth pairing with the second silent failure: a `match` where nothing matches does nothing at all, so a function can fall off the end returning `None`. Always end with a raising `case _:`." }
        ]
      },
      {
        level: "expert",
        q: "How would you get exhaustiveness checking for a `match` over an enum?",
        strong: "End with `case _ as unreachable: assert_never(unreachable)`. mypy narrows the subject through the preceding cases, so if any enum member is unhandled the final case is reachable with that type and `assert_never` produces a type error at check time.",
        answer: [
          { t: "p", text: "The key point is that this is *static* only — at runtime `assert_never` just raises, so it doubles as the mandatory catch-all. There is no runtime exhaustiveness check in Python's `match`." },
          { t: "p", text: "It works for enums and `Literal` types because those have a finite, known set of values that mypy can narrow. It does nothing for a `str` subject, where the value space is unbounded." },
          { t: "p", text: "The operational value is what makes it worth adopting: adding a member to the enum turns every non-exhaustive `match` into a CI failure, which is exactly the safety net a compiler would give you in a language that has one." }
        ]
      }
    ]
  }
});
