/* ============================================================================
   LESSON 2.9 — Nested Data and Real-World Shapes
   ========================================================================= */
EC.receiveLesson({
  id: "2.9",

  lede: "Every API you call returns nested JSON, and almost none of it matches its documentation exactly. Fields go missing, arrays arrive empty, and a value that was an object last week is `null` today. This lesson is about working with that data **without** writing `data[\"a\"][\"b\"][0][\"c\"]` and without wrapping everything in `try/except`.",

  objectives: [
    "Navigate nested structures safely without chained subscripts",
    "Choose between `get` chains, a helper, and validation at the boundary",
    "Flatten and reshape nested data into something your code can use",
    "Explain why parsing at the boundary beats defensive access everywhere",
    "Recognise when nested dicts should become objects"
  ],

  prerequisites: ["2.3", "2.5"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The shape of real data", id: "shapes" },


    { t: "viz",
      title: "A nested shape, and where it breaks",
      caption: "Every level is a place a key can be absent or a type can differ. Walking such a structure with plain indexing works until one record is shaped differently — which is what real data always contains.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A nested dictionary and list structure with the levels where lookups can fail marked">
  <text x="30" y="34" class="s-label" style="fill:var(--accent)">response</text>
  <g style="stroke:var(--line);stroke-width:1.5">
    <line x1="46" y1="44" x2="46" y2="200"/>
    <line x1="46" y1="66"  x2="70" y2="66"/>
    <line x1="46" y1="100" x2="70" y2="100"/>
    <line x1="46" y1="166" x2="70" y2="166"/>
    <line x1="46" y1="200" x2="70" y2="200"/>
  </g>
  <text x="80" y="71"  class="s-sub" style="fill:var(--ink-2)">"status": "ok"</text>
  <text x="80" y="105" class="s-sub" style="fill:var(--ink-2)">"items": [ ... ]</text>
  <text x="80" y="171" class="s-sub" style="fill:var(--ink-2)">"meta": { "page": 1 }</text>
  <text x="80" y="205" class="s-sub" style="fill:var(--crit)">"cursor": absent on the last page</text>

  <g style="stroke:var(--line);stroke-width:1.5">
    <line x1="230" y1="110" x2="230" y2="152"/>
    <line x1="230" y1="126" x2="254" y2="126"/>
    <line x1="230" y1="152" x2="254" y2="152"/>
  </g>
  <text x="264" y="131" class="s-sub" style="fill:var(--ink-2)">{ "id": 1, "tags": ["a"] }</text>
  <text x="264" y="157" class="s-sub" style="fill:var(--crit)">{ "id": 2 }  — no "tags" key</text>

  <rect x="560" y="46" width="290" height="120" rx="8" style="fill:var(--crit);fill-opacity:.08;stroke:var(--crit)" stroke-width="2"/>
  <text x="578" y="72"  class="s-label" style="fill:var(--crit)">Four failure points</text>
  <text x="578" y="98"  class="s-sub" style="fill:var(--ink-2)">a missing key at any level</text>
  <text x="578" y="120" class="s-sub" style="fill:var(--ink-2)">a null where an object was expected</text>
  <text x="578" y="142" class="s-sub" style="fill:var(--ink-2)">an empty list, so [0] raises</text>
  <text x="578" y="160" class="s-sub" style="fill:var(--ink-2)">a scalar where a list was expected</text>

  <text x="30" y="236" class="s-sub" style="fill:var(--ink-3)">.get() with a default handles one level; nested access needs a helper, a schema, or a dataclass</text>
</svg>`
    },
    { t: "code", lang: "json", title: "a typical API response", code: `{
  "order_id": "ord_8812",
  "customer": {
    "id": "cus_44",
    "name": "Ada Lovelace",
    "address": { "city": "London", "postcode": null }
  },
  "items": [
    { "sku": "W-1", "qty": 2, "price": {"amount": "19.99", "currency": "GBP"} },
    { "sku": "G-7", "qty": 1, "price": {"amount": "5.00", "currency": "GBP"} }
  ],
  "discount": null,
  "metadata": {}
}`},

    { t: "p", text: "Four distinct hazards are already visible: a `null` inside a nested object, a `null` where an object is expected, an empty object, and a list whose elements each need traversing. The naive access pattern breaks on all four." },

    { t: "code", lang: "python", title: "why chained subscripts fail", code: `
# Works when everything is present
city = data["customer"]["address"]["city"]

# Breaks in three different ways on real data:
postcode = data["customer"]["address"]["postcode"].upper()
#  AttributeError: 'NoneType' object has no attribute 'upper'

rate = data["discount"]["rate"]
#  TypeError: 'NoneType' object is not subscriptable

source = data["metadata"]["source"]
#  KeyError: 'source'
`,
      caption: "Three different exception types for the same underlying cause — the data was not the shape the code assumed. Note that none of the messages tells you *which* path failed, which is what makes these slow to debug."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Three ways to access safely", id: "safe-access" },

    { t: "tabs", items: [
      { label: "get chains", blocks: [
        { t: "code", lang: "python", title: "for one or two levels", code: `
# Each get supplies an empty dict so the next get has something to call
city = data.get("customer", {}).get("address", {}).get("city")

# Watch the null case -- get returns the stored None, not the default
address = data.get("customer", {}).get("address")   # could be None
city = (address or {}).get("city")
`,
          caption: "`get(key, {})` returns the default only when the key is **absent**. A key present with the value `null` returns `None`, which is why the `or {}` is needed."},
        { t: "p", text: "Readable at two levels, unreadable at four. Use for shallow access where a missing value is genuinely acceptable." }
      ]},
      { label: "A path helper", blocks: [
        { t: "code", lang: "python", title: "for deep or repeated access", code: `
from typing import Any


def dig(data: Any, *path: str | int, default: Any = None) -> Any:
    """Walk a nested structure, returning default if any step fails.

    Handles dicts, lists and None uniformly, so one call replaces a
    chain of gets and an index guard.
    """
    current = data
    for step in path:
        if current is None:
            return default
        try:
            current = current[step]
        except (KeyError, IndexError, TypeError):
            return default
    return current if current is not None else default


print(dig(data, "customer", "address", "city"))
print(dig(data, "items", 0, "price", "amount"))
print(dig(data, "discount", "rate", default="0"))
print(dig(data, "items", 99, "sku", default="missing"))
`,
          out: `London
19.99
0
missing`},
        { t: "p", text: "One helper replaces every chain in the codebase, handles lists and dicts alike, and gives a single place to add logging or metrics for missing fields." }
      ]},
      { label: "Parse at the boundary", blocks: [
        { t: "code", lang: "python", title: "the answer for anything long-lived", code: `
from decimal import Decimal
from pydantic import BaseModel


class Money(BaseModel):
    amount: Decimal
    currency: str


class Address(BaseModel):
    city: str
    postcode: str | None = None


class Item(BaseModel):
    sku: str
    qty: int
    price: Money


class Order(BaseModel):
    order_id: str
    customer_name: str
    address: Address
    items: list[Item]


order = Order.model_validate(payload)   # raises here, once, with a path
print(order.address.city)               # plain attribute access from now on
`},
        { t: "p", text: "Validation happens once, at the edge. Everything downstream works with typed objects, so no defensive access is needed anywhere else — and a malformed payload fails immediately with a message naming the exact field. Lesson 12.3 covers this properly." }
      ]}
    ]},

    { t: "callout", kind: "insight", title: "The rule that decides which to use", body: [
      { t: "p", text: "**How far does this data travel?**" },
      { t: "ul", items: [
        "**A few lines, one function** — a `get` chain is fine. Adding a model would be ceremony.",
        "**Across several functions in one module** — use the `dig` helper, so the missing-field handling is stated once.",
        "**Across module or service boundaries, or persisted** — parse into typed objects at the edge."
      ]},
      { t: "p", text: "The failure mode of skipping this decision is *defensive access everywhere*: every function that touches the data re-checks the same fields, no function can state what it requires, and a missing field produces `None` twelve frames away from where it went missing." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Reshaping", id: "reshaping" },

    { t: "code", lang: "python", title: "flattening for tabular use", code: `
def flatten_order(order: dict) -> list[dict]:
    """One row per line item -- the shape a CSV or DataFrame wants."""
    customer = order.get("customer") or {}
    address = customer.get("address") or {}

    return [
        {
            "order_id": order["order_id"],
            "customer_id": customer.get("id"),
            "city": address.get("city"),
            "sku": item["sku"],
            "qty": item["qty"],
            "amount": item["price"]["amount"],
        }
        for item in order.get("items", [])
    ]


for row in flatten_order(data):
    print(row)
`,
      out: `{'order_id': 'ord_8812', 'customer_id': 'cus_44', 'city': 'London', 'sku': 'W-1', 'qty': 2, 'amount': '19.99'}
{'order_id': 'ord_8812', 'customer_id': 'cus_44', 'city': 'London', 'sku': 'G-7', 'qty': 1, 'amount': '5.00'}`,
      caption: "The nested-to-tabular transform is the most common reshape in data work. Note `or {}` rather than `get(k, {})` — it handles both a missing key and an explicit `null`."
    },

    { t: "code", lang: "python", title: "generic flattening with dotted keys", code: `
from collections.abc import Iterator


def flatten(data: dict, prefix: str = "", sep: str = ".") -> Iterator[tuple[str, object]]:
    """Yield (dotted_key, value) for every leaf in a nested dict."""
    for key, value in data.items():
        path = f"{prefix}{sep}{key}" if prefix else key
        if isinstance(value, dict) and value:
            yield from flatten(value, path, sep)
        else:
            yield path, value


print(dict(flatten({"a": {"b": {"c": 1}}, "d": 2, "e": {}})))
`,
      out: `{'a.b.c': 1, 'd': 2, 'e': {}}`,
      caption: "Useful for logging structured payloads, building metric labels and diffing two configurations. Note that empty dicts are yielded as leaves rather than disappearing — a decision worth making deliberately rather than by accident."
    },

    { t: "callout", kind: "trap", title: "Lists inside nested data need a decision", body: [
      { t: "p", text: "Flattening a dict is unambiguous. Flattening a list is not — you must decide what a list *means* in your output:" },
      { t: "table",
        head: ["If a list means", "Flatten to"],
        rows: [
          ["Several rows of the same kind", "One output row per element (the `flatten_order` shape)"],
          ["A fixed-length record", "Indexed keys: `items.0.sku`, `items.1.sku`"],
          ["A set of tags", "A single joined string, or keep the list as a leaf"]
        ]
      },
      { t: "p", text: "Choosing silently is how a report ends up with one row per order when it should have one per line item — a bug that produces plausible totals and wrong ones." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Merging nested configuration", id: "merging" },

    { t: "p", text: "Layered configuration — defaults, then environment, then overrides — is nested-data work, and `{**a, **b}` gets it wrong (Lesson 2.4: merging is shallow)." },

    { t: "ladder",
      title: "Merging a nested config",
      rungs: [
        { level: "bad", label: "Shallow merge", why: "whole subtrees are replaced",
          code: `defaults = {"db": {"host": "localhost", "port": 5432, "pool": 5}}
override = {"db": {"host": "prod-db"}}

merged = {**defaults, **override}
# {"db": {"host": "prod-db"}}  -- port and pool are GONE`,
          note: "The override replaced the entire `db` subtree rather than merging into it. The service starts with no port and no pool size, and the failure appears at connection time rather than at config load." },

        { level: "ok", label: "Recursive merge", why: "correct, and now you own it",
          code: `def deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base, returning a new dict."""
    result = dict(base)
    for key, value in override.items():
        if (
            key in result
            and isinstance(result[key], dict)
            and isinstance(value, dict)
        ):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result`,
          note: "Correct for the common case. Note it still shares any nested *list* between base and result, and it has no answer for \"should a list override or extend?\" — a question every config system eventually has to settle explicitly." },

        { level: "best", label: "Typed settings", why: "merging and validation together",
          code: `from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseModel):
    host: str = "localhost"
    port: int = 5432
    pool: int = 5


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_nested_delimiter="__",   # DB__HOST=prod-db
        env_file=".env",
    )
    db: DatabaseSettings = DatabaseSettings()


settings = Settings()      # env overrides field by field, types validated
print(settings.db.host, settings.db.port)`,
          note: "Layering is handled per field rather than per subtree, so an override of `host` cannot silently remove `port`. Types are validated at startup, so `DB__PORT=abc` fails at boot with a message naming the field — rather than at the first query. Lesson 14.2 covers this in full." }
      ]
    },

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Survive a hostile payload",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Write a function that turns a list of API order payloads into flat line-item rows suitable for a CSV — where the payloads are realistically inconsistent." },
        { t: "p", text: "The requirement is not to make it work on the happy path. It is to make **every** failure attributable: a caller must be able to tell which order failed and why." }
      ],
      requirements: [
        "Accept a list of order dicts and return `(rows, problems)`.",
        "Handle: missing keys, `null` where an object is expected, an empty or missing `items` list, and a price that is not parseable.",
        "An order with no items produces no rows and is **not** an error.",
        "Each problem must name the order id (or its index if the id is missing) and the specific field.",
        "One bad order must not stop the others from being processed.",
        "Amounts must be `Decimal`, parsed from strings.",
        "Do not use `try/except` around the whole per-order body — failures should be attributable to a field."
      ],
      hint: "Write the `dig` helper first, then use it for every optional path. Keep the per-order function small enough that a single `try` around the parts that genuinely can raise is still precise.",
      solution: {
        lang: "python",
        title: "flatten_orders.py",
        code: `"""Flatten order payloads into line-item rows, attributing every failure."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, NamedTuple


class Problem(NamedTuple):
    order: str
    field: str
    detail: str


def dig(data: Any, *path: str | int, default: Any = None) -> Any:
    """Walk a nested structure; return default if any step fails.

    Treats a present-but-null value the same as a missing one, because
    for traversal purposes they are the same thing.
    """
    current = data
    for step in path:
        if current is None:
            return default
        try:
            current = current[step]
        except (KeyError, IndexError, TypeError):
            return default
    return default if current is None else current


def flatten_orders(
    orders: list[dict],
) -> tuple[list[dict], list[Problem]]:
    rows: list[dict] = []
    problems: list[Problem] = []

    for index, order in enumerate(orders):
        # Identify the order before anything else can fail, so every
        # problem below can be attributed even if the payload is junk.
        order_id = dig(order, "order_id", default=f"<index {index}>")

        if not isinstance(order, dict):
            problems.append(
                Problem(order_id, "<root>", f"expected an object, got {type(order).__name__}")
            )
            continue

        items = dig(order, "items", default=[])
        if not isinstance(items, list):
            problems.append(Problem(order_id, "items", "expected a list"))
            continue

        # No items is a legitimate order, not a failure. Producing zero
        # rows is the correct outcome and must not be reported.
        for position, item in enumerate(items):
            sku = dig(item, "sku")
            if sku is None:
                problems.append(
                    Problem(order_id, f"items[{position}].sku", "missing")
                )
                continue

            raw_amount = dig(item, "price", "amount")
            if raw_amount is None:
                problems.append(
                    Problem(order_id, f"items[{position}].price.amount", "missing")
                )
                continue

            try:
                # str() first: the field may arrive as a JSON number, and
                # Decimal(float) would inherit binary error (Lesson 1.5).
                amount = Decimal(str(raw_amount))
            except (InvalidOperation, ValueError):
                problems.append(
                    Problem(
                        order_id,
                        f"items[{position}].price.amount",
                        f"not a number: {raw_amount!r}",
                    )
                )
                continue

            qty = dig(item, "qty", default=1)
            if not isinstance(qty, int) or isinstance(qty, bool) or qty < 0:
                problems.append(
                    Problem(order_id, f"items[{position}].qty", f"invalid: {qty!r}")
                )
                continue

            rows.append(
                {
                    "order_id": order_id,
                    "customer_id": dig(order, "customer", "id"),
                    "city": dig(order, "customer", "address", "city"),
                    "sku": sku,
                    "qty": qty,
                    "amount": amount,
                    "line_total": amount * qty,
                }
            )

    return rows, problems


if __name__ == "__main__":
    payloads = [
        {   # complete
            "order_id": "ord_1",
            "customer": {"id": "c1", "address": {"city": "London"}},
            "items": [{"sku": "W-1", "qty": 2, "price": {"amount": "19.99"}}],
        },
        {   # customer is null -- city and customer_id become None, not errors
            "order_id": "ord_2",
            "customer": None,
            "items": [{"sku": "G-7", "qty": 1, "price": {"amount": "5.00"}}],
        },
        {"order_id": "ord_3", "items": []},          # legitimately empty
        {"order_id": "ord_4"},                       # no items key at all
        {   # two bad items, one good -- the good one must survive
            "order_id": "ord_5",
            "items": [
                {"sku": "B-1", "price": {"amount": "N/A"}},
                {"qty": 1, "price": {"amount": "1.00"}},
                {"sku": "OK-1", "qty": 3, "price": {"amount": "2.50"}},
            ],
        },
    ]

    rows, problems = flatten_orders(payloads)

    assert len(rows) == 3, len(rows)
    assert rows[-1]["line_total"] == Decimal("7.50")
    assert rows[1]["city"] is None          # null customer, not an error
    assert len(problems) == 2

    for row in rows:
        print(row)
    for p in problems:
        print(f"  ! {p.order}  {p.field}: {p.detail}")`,
        notes: [
          { t: "p", text: "**Establishing `order_id` first** is the detail that makes every later problem attributable. If you look it up only when reporting a failure, a payload broken enough to fail early produces a problem report that cannot be traced to a source record." },
          { t: "p", text: "**\"No items\" is not an error.** It is a common and legitimate state — a cancelled order, a draft — and reporting it as a problem trains operators to ignore the problem list. Deciding which absences are failures and which are normal is the actual design work in this kind of function." },
          { t: "p", text: "**`isinstance(qty, bool)` is checked explicitly** because `bool` subclasses `int` (Lesson 1.8), so `True` would otherwise pass an `isinstance(qty, int)` check and become a quantity of 1. JSON distinguishes `true` from `1`; an unguarded check does not." },
          { t: "callout", kind: "tradeoff", title: "When to stop doing this by hand", body: [
            { t: "p", text: "This function is about eighty lines and roughly half of it is validation. Pydantic expresses the same contract in twenty declarative lines, produces error messages with full field paths, and gives typed objects downstream." },
            { t: "p", text: "The manual version is still worth writing once. It shows exactly what a validation library does, so when Pydantic rejects a payload or coerces a value unexpectedly you can reason about it instead of guessing. And for a one-off script, eighty lines with no dependency is a defensible trade." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A partner API adds a field and changes `address` from an object to `null` for customers who have not supplied one. Your service does not crash. Three weeks later, finance reports that 4% of orders have a blank shipping city and were never dispatched." },
      { t: "p", text: "**Why nothing broke loudly:** the code used `data.get(\"customer\", {}).get(\"address\", {}).get(\"city\")`. When `address` is `null`, `get` returns `None` rather than the `{}` default — the key was present, just null. The chain produced `None`, which flowed into a database column that accepts nulls." },
      { t: "p", text: "**Defensive access made the failure silent.** Every `get` with a default is a decision that absence is acceptable, and forty of them across a codebase means no layer ever asserts what it requires. The data was wrong from the first request and nothing said so." },
      { t: "p", text: "**The fix is a boundary, not more defensiveness.** Parse the payload into a model where `city` is required; a malformed response then fails at ingestion with the field named, on the first bad record rather than the four-thousandth. Where a field genuinely is optional, the model says `str | None` — and that declaration is itself the documentation the `get` chain never provided." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "Chained subscripts fail three different ways on real data — `KeyError`, `TypeError` and `AttributeError` — and none of the messages says which path broke.",
    "**`get(key, {})` returns the default only when the key is absent.** A key present with `null` returns `None`, which is why `(value or {})` is needed for nullable fields.",
    "Choose by how far the data travels: a `get` chain for a few lines, a `dig` helper for a module, **typed models at any boundary the data crosses**.",
    "Defensive access everywhere makes failures silent — every default is a decision that absence is acceptable, and no layer ever states what it requires.",
    "Flattening a dict is unambiguous; **flattening a list requires a decision** about whether it means multiple rows, indexed fields, or a joined value.",
    "**Shallow merge replaces whole subtrees.** `{**defaults, **override}` on nested config silently drops every sibling key of the one you overrode.",
    "Recursive merge fixes that but leaves you owning the list-override question; typed settings layer per field and validate at startup.",
    "Parse once at the edge, then use typed objects. A malformed payload should fail at ingestion with the field named, not twelve frames later as a `None`."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`data = {\"customer\": {\"address\": None}}`. What does `data.get(\"customer\", {}).get(\"address\", {}).get(\"city\")` do?",
        options: [
          "Returns `None` — the chain handles the null correctly",
          "Raises `AttributeError`, because `address` is present with the value `None`, so `get` returns `None` rather than the `{}` default",
          "Returns `{}` — the default is used whenever the value is falsy",
          "Raises `KeyError` on `\"city\"`"
        ],
        answer: 1,
        why: "`get(key, default)` returns the default only when the key is **absent**. Here `address` is present, so `get` returns its actual value, `None` — and `None.get(\"city\")` raises `AttributeError: 'NoneType' object has no attribute 'get'`. The fix is `(chain or {}).get(\"city\")`, which handles both missing and null. This distinction is the single most common bug in defensive JSON traversal."
      },
      {
        stem: "`{**{\"db\": {\"host\": \"localhost\", \"port\": 5432}}, **{\"db\": {\"host\": \"prod\"}}}` produces what?",
        options: [
          "`{\"db\": {\"host\": \"prod\", \"port\": 5432}}` — nested dicts are merged key by key",
          "`{\"db\": {\"host\": \"prod\"}}` — the merge is shallow, so the whole `db` subtree is replaced and `port` is lost",
          "A `TypeError`, because nested dicts cannot be unpacked",
          "`{\"db\": {\"host\": \"localhost\", \"port\": 5432}}` — the first value wins"
        ],
        answer: 1,
        why: "Unpacking operates on the top level only. Both dicts have a `db` key, so the right-hand value replaces the left-hand one entirely — `port` disappears. In a real configuration this means overriding one field silently removes every sibling, and the failure surfaces at connection time rather than at config load. A recursive merge or per-field typed settings is required for layered configuration."
      },
      {
        stem: "When should nested API data be parsed into typed objects rather than accessed with `get` chains?",
        options: [
          "Always — `get` chains are never acceptable",
          "When the data crosses a module or service boundary, or is persisted — anywhere defensive access would otherwise be repeated in many places",
          "Only when the payload exceeds a certain size",
          "Only when the API provides an OpenAPI schema"
        ],
        answer: 1,
        why: "The deciding factor is how far the data travels. Inside a few lines of one function a `get` chain is fine and a model is ceremony. Once several functions touch the same payload, defensive access gets duplicated, no function can state what it requires, and a missing field produces a `None` far from where it went missing. Parsing at the boundary moves that failure to ingestion, with the field named."
      },
      {
        stem: "Why does a JSON `qty` field need an explicit `isinstance(qty, bool)` check before `isinstance(qty, int)`?",
        options: [
          "JSON booleans are decoded as strings, not integers",
          "`bool` subclasses `int`, so `True` passes an `int` check and would silently become a quantity of 1",
          "`isinstance` cannot distinguish numeric types without it",
          "It is only needed when the value comes from a database"
        ],
        answer: 1,
        why: "Python's `bool` is a subclass of `int`, so `isinstance(True, int)` is `True`. JSON distinguishes `true` from `1`, but an unguarded `isinstance` check does not — a payload sending `\"qty\": true` would be accepted as a quantity of 1. Validating deserialised JSON is the situation where this trap most often has real consequences."
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
        q: "How do you safely access a deeply nested value from an API response?",
        strong: "It depends how far the data travels. For a couple of levels in one function, a `get` chain — remembering that `get` returns a stored `None` rather than the default. For repeated deep access, a small `dig` helper. For anything crossing a boundary, parse into a typed model at the edge so nothing downstream needs defensive access.",
        answer: [
          { t: "p", text: "The `get(key, {})` subtlety is the detail that shows real experience: the default fires only on a missing key, so a field explicitly set to `null` slips through and the next `.get` raises `AttributeError`. Almost everyone writes this bug once." },
          { t: "p", text: "The more valuable point is the argument against defensive access as a default strategy: every `get` with a fallback is a decision that absence is acceptable, and forty of them across a codebase means nothing ever asserts what it requires. Errors become `None`s that surface far from their cause." }
        ]
      },
      {
        level: "core",
        q: "Why doesn't `{**defaults, **overrides}` work for nested configuration?",
        strong: "It merges at the top level only. If both dicts have a `db` key, the override's value replaces the whole subtree, so overriding `host` silently removes `port` and every other sibling. You need a recursive merge, or a settings system that layers field by field.",
        answer: [
          { t: "p", text: "This is the same shallow-copy property from earlier in the course, surfacing as a configuration bug rather than an aliasing one." },
          { t: "p", text: "The operational detail worth adding: the failure shows up at connection time rather than at config load, so the stack trace points at the database client and not at the merge. That distance is what makes it expensive to diagnose." },
          { t: "p", text: "A strong close is naming the question a hand-rolled recursive merge leaves open — should a list in the override replace the base list or extend it? Every configuration system has to answer that explicitly, and hand-rolled merges usually answer it by accident." }
        ]
      },
      {
        level: "advanced",
        q: "A partner API changed a field from an object to null and your service silently produced bad data for weeks. What went wrong?",
        strong: "Defensive access converted a contract violation into a `None`. The code used `get` chains with defaults everywhere, so nothing asserted that the field was required — the bad data flowed through into a nullable column and nothing failed. The fix is validation at the boundary, not more defensiveness.",
        answer: [
          { t: "p", text: "The interviewer is testing whether you see that error-tolerance has a cost. Being lenient about input is only safe when you have decided, per field, that absence is acceptable." },
          { t: "p", text: "The framing that lands: parsing at the boundary moves the failure from *the four-thousandth record, three weeks later, in a finance report* to *the first bad record, at ingestion, with the field named*. Same bug, radically different cost." },
          { t: "p", text: "Worth adding that the model is also the documentation. `city: str` versus `city: str | None` states which fields are genuinely optional — something a scattered set of `get` calls with defaults can never express, because each one is a local decision made in isolation." }
        ],
        weak: "Proposing more `try/except` blocks or more defaults. Both make the service even more tolerant of malformed data, which is the direction that caused the incident."
      }
    ]
  }
});
