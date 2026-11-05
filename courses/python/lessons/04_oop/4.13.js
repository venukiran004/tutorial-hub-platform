/* ============================================================================
   LESSON 4.13 — Enums: Named Constants That Carry Behaviour
   ========================================================================= */
EC.receiveLesson({
  id: "4.13",

  lede: "Every codebase has a field that can hold one of a handful of values — an order status, a region, a priority — and most store it as a bare string, which means every comparison is a chance to misspell it. **An `Enum` turns that open set of strings into a closed set of objects the interpreter can check**, and once it is a class it can also own the rules about those values. The two things that bite are the boundary — a plain `Enum` is not equal to its own value — and the day another service sends a value your enum has never seen.",

  objectives: [
    "Replace a set of string constants with an `Enum` and explain which bugs that removes",
    "Predict how `Enum`, `StrEnum` and `IntEnum` members compare with, format as and serialise to plain values",
    "Put behaviour on an enum — properties, methods and a transition table — and check it is total",
    "Choose between `Enum`, `StrEnum`, `Flag` and `Literal` for a given field",
    "Design an enum that survives a value it has never seen, using `_missing_`"
  ],

  prerequisites: ["4.1", "4.10"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The bug a string cannot prevent", id: "strings" },

    { t: "p", text: "Here is the code an enum exists to replace. Nothing about it is wrong on the day it is written. It goes wrong when a second service writes `\"Paid\"` and a third developer types `\"payed\"` — and neither produces an error, only an order that silently never ships." },

    { t: "code", lang: "python", title: "status as a string", code: `
def ship(order: dict) -> str:
    if order["status"] == "paid":
        return f"shipping {order['id']}"
    return f"holding {order['id']} ({order['status']})"


print(ship({"id": "o-1", "status": "paid"}))
print(ship({"id": "o-2", "status": "Paid"}))     # from a different service
print(ship({"id": "o-3", "status": "payed"}))    # a typo, three files away
`,
      out: `shipping o-1
holding o-2 (Paid)
holding o-3 (payed)` },

    { t: "p", text: "The underlying problem is that the set of legal statuses exists only in people's heads. **A string can hold any value, so the language cannot tell a valid status from a typo** — and neither can your editor, your type checker or your tests, unless someone thought to write that exact case." },

    { t: "ladder", title: "Representing an order's status", rungs: [
      { level: "bad", label: "Bare strings", why: "any value accepted", code: `if order.status == "paid":
    ...
order.status = "payed"          # accepted; the order never ships`, note: "Every comparison is a fresh chance to misspell the value, and nothing lists what the legal values are." },
      { level: "ok", label: "Module-level constants", why: "one spelling, still open", code: `PENDING = "pending"
PAID = "paid"

if order.status == PAID:
    ...
order.status = "payed"          # still accepted`, note: "Typos in comparisons now fail loudly as a `NameError`, but the field still accepts any string, and there is no way to iterate over the legal values." },
      { level: "best", label: "An enum", why: "a closed set", code: `class Status(StrEnum):
    PENDING = "pending"
    PAID = "paid"

if order.status is Status.PAID:
    ...
Status("payed")                 # ValueError at the boundary`, note: "The set is closed and iterable, the type checker knows the field's type, and a bad value fails where it enters the system rather than where it is compared." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "What an enum member is", id: "members" },

    { t: "p", text: "Each member is created once, when the class body runs, and is a **singleton**: there is exactly one `Status.PAID` object in the process. That is why `is` is the right comparison between members, and why looking a member up by value or by name returns that same object rather than a copy." },

    { t: "code", lang: "python", title: "members, values and lookup", code: `
from enum import Enum, auto


class Status(Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"


print(Status.PAID, repr(Status.PAID))
print(Status.PAID.name, Status.PAID.value)
print(Status("paid") is Status.PAID)        # lookup by value: the same object
print(Status["PAID"] is Status.PAID)        # lookup by name
print([s.value for s in Status])            # iteration is definition order
print(len(Status), Status.PAID in Status)

try:
    Status("payed")
except ValueError as exc:
    print(f"ValueError: {exc}")


class Priority(Enum):
    LOW = auto()
    HIGH = auto()


print(list(Priority))
`,
      out: `Status.PAID <Status.PAID: 'paid'>
PAID paid
True
True
['pending', 'paid', 'shipped', 'cancelled']
4 True
ValueError: 'payed' is not a valid Status
[<Priority.LOW: 1>, <Priority.HIGH: 2>]`,
      caption: "`Status(value)` is the conversion you run at every boundary — a request body, a database row, a message. It is where a bad value should fail, and it fails with a message that names the type." },

    { t: "dl", items: [
      ["`.name`", "The identifier in the class body — `\"PAID\"`. Stable only as long as nobody renames it, so it belongs in code, not in storage."],
      ["`.value`", "The data — `\"paid\"`. This is what you store, send and log, because it is the part you promise not to change."],
      ["`auto()`", "Generates values for you. Use it when the value is never stored or sent; never when it is, because inserting a member renumbers everything after it."],
      ["Aliases", "Two names with the same value make the second an alias of the first, not a new member. `@enum.unique` turns that into an error when it is a mistake."]
    ]},

    { t: "code", lang: "python", title: "aliases, and refusing them", code: `
from enum import Enum, unique


class Region(Enum):
    EU = "eu-west-1"
    US = "us-east-1"
    EUROPE = "eu-west-1"          # an alias, not a new member


print(list(Region), Region.EUROPE is Region.EU)

try:
    @unique
    class StrictRegion(Enum):
        EU = "eu-west-1"
        EUROPE = "eu-west-1"
except ValueError as exc:
    print(f"ValueError: {exc}")
`,
      out: `[<Region.EU: 'eu-west-1'>, <Region.US: 'us-east-1'>] True
ValueError: duplicate values found in <enum 'StrictRegion'>: EUROPE -> EU` },

    /* ================================================================== */
    { t: "h2", n: "03", text: "The boundary: Enum, StrEnum and plain values", id: "boundary" },

    { t: "p", text: "Inside your code you compare members with members. At the edges — the database, JSON, a URL, a log line — the world has plain strings and integers, and this is where the choice of base class decides whether the code is quietly wrong." },

    { t: "code", lang: "python", title: "a plain Enum is not its value", code: `
from enum import Enum, StrEnum


class Status(Enum):
    PAID = "paid"


class StatusStr(StrEnum):
    PAID = "paid"


print(Status.PAID == "paid")         # a plain Enum is not equal to its value
print(StatusStr.PAID == "paid")      # a StrEnum IS a str
print(f"{StatusStr.PAID}", f"{Status.PAID}")
row = {"status": "paid"}             # what the database hands back
print(row["status"] == Status.PAID, Status(row["status"]) is Status.PAID)
`,
      out: `False
True
paid Status.PAID
False True` },

    { t: "callout", kind: "trap", title: "`row[\"status\"] == Status.PAID` is always False", body: [
      { t: "p", text: "A plain `Enum` member never compares equal to its value, so code that checks a raw database value against a member is a condition that can never be true. **It does not raise; the branch simply never runs.** The same applies to `in`: `\"paid\" in {Status.PAID}` is `False`." },
      { t: "p", text: "**Convert once, at the boundary, and compare members everywhere else:** `Status(row[\"status\"])`. Or use `StrEnum` (3.11+), whose members *are* strings — equal to their value, formatted as their value, and accepted anywhere a `str` is." }
    ]},

    { t: "code", lang: "python", title: "serialising", code: `
import json
from enum import Enum, StrEnum


class Status(Enum):
    PAID = "paid"


class StatusStr(StrEnum):
    PAID = "paid"


print(json.dumps({"status": StatusStr.PAID}))
try:
    json.dumps({"status": Status.PAID})
except TypeError as exc:
    print(f"TypeError: {exc}")
print(json.dumps({"status": Status.PAID.value}))
`,
      out: `{"status": "paid"}
TypeError: Object of type Status is not JSON serializable
{"status": "paid"}`,
      caption: "`StrEnum` serialises as its value with no help; a plain `Enum` needs `.value` at every boundary. Pydantic (Lesson 12.3) handles both, validating the incoming string into a member. JSON itself is Lesson 7.2." },

    {"t": "diagram", "kind": "compare", "title": "Four ways to name a closed set", "caption": "**`StrEnum` is the default for anything stored or sent as text**, because it removes the boundary trap entirely. A plain `Enum` is right when members must *not* be mistaken for strings. `Literal` is for type checking only — it creates no runtime object to iterate or validate against.", "columns": [
      {"title": "bare str", "tone": "crit", "items": ["accepts any value", "no list of legal values", "typos fail silently"]},
      {"title": "Enum", "tone": "accent", "items": ["closed, iterable set", "!= its value", "needs .value to serialise"]},
      {"title": "StrEnum / IntEnum", "tone": "good", "items": ["closed, iterable set", "== its value", "serialises as-is"]},
      {"title": "Literal[...]", "tone": "warn", "items": ["type checker only", "nothing at runtime", "good for parameters"]}
    ]},

    { t: "callout", kind: "good", title: "Store the value, never the name", body: [
      { t: "p", text: "Write `.value` to the database and the wire. The name is an identifier, and renaming `PAID` to `SETTLED` in a refactor is a reasonable change to code — it must not also be a data migration. Choose values you are willing to keep for the life of the data." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Behaviour belongs on the enum", id: "behaviour" },

    { t: "p", text: "An enum is a class, so the rules about its values can live on it instead of being scattered across the codebase as `if status in (...)` checks. The most valuable rule is usually **which transitions are legal** — and keeping it in one table means you can test that the table covers every member." },

    { t: "code", lang: "python", title: "properties, methods and a transition table", code: `
from enum import StrEnum


class Status(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"

    @property
    def is_final(self) -> bool:
        return self in {Status.SHIPPED, Status.CANCELLED}

    def can_become(self, new: "Status") -> bool:
        return new in _ALLOWED[self]


_ALLOWED: dict[Status, frozenset[Status]] = {
    Status.PENDING: frozenset({Status.PAID, Status.CANCELLED}),
    Status.PAID: frozenset({Status.SHIPPED, Status.CANCELLED}),
    Status.SHIPPED: frozenset(),
    Status.CANCELLED: frozenset(),
}

print(Status.PAID.can_become(Status.SHIPPED))
print(Status.SHIPPED.can_become(Status.PENDING))
print([s.value for s in Status if s.is_final])
missing = set(Status) - set(_ALLOWED)
print("every member has transitions:", not missing)
`,
      out: `True
False
['shipped', 'cancelled']
every member has transitions: True`,
      caption: "The table lives outside the class body because members do not exist until the body has finished running. The last line is the check worth putting in a test: **add a member and forget its row, and it fails.**" },

    {"t": "diagram", "kind": "flow", "title": "The transition table, drawn", "caption": "**The table is the state machine, and the diagram is the table.** Every arrow is one entry in a frozenset; a member with no outgoing arrows is final. When product asks \"can a shipped order be cancelled?\", the answer is a line of data you can point at, not a search through every handler.", "cols": 2, "nodes": [
      {"id": "p", "label": "PENDING", "sub": "created", "tone": "accent"},
      {"id": "a", "label": "PAID", "sub": "money taken", "tone": "accent"},
      {"id": "x", "label": "CANCELLED", "sub": "final: no arrows out", "tone": "crit"},
      {"id": "s", "label": "SHIPPED", "sub": "final: no arrows out", "tone": "good"}
    ], "edges": [["p", "a", "pay"], ["p", "x"], ["a", "x"], ["a", "s"]]},

    { t: "p", text: "Notice the arrow that is *not* there: `SHIPPED` has an empty set, so `SHIPPED.can_become(CANCELLED)` is `False`. A cancellation after shipping is really a refund — a different state with its own rules — which is exactly the conversation a transition table forces early." },

    { t: "callout", kind: "insight", title: "Matching on an enum", body: [
      { t: "p", text: "Structural pattern matching (Lesson 5.5) and enums fit together precisely because of the rule that trips people up there: a bare name in a `case` *captures*, while a dotted name *compares*. `case Status.PAID:` is a comparison against the member, so enums are the safe way to match against constants." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Flags, and values from the future", id: "flags-missing" },

    { t: "p", text: "`Flag` is the enum for combinations — permissions, feature switches, days of the week — where a value can be several members at once. Members combine with `|` and test with `in`, and the combination is still a member of the type." },

    { t: "code", lang: "python", title: "a set of permissions in one value", code: `
from enum import Flag, auto


class Perm(Flag):
    READ = auto()
    WRITE = auto()
    DELETE = auto()
    ADMIN = READ | WRITE | DELETE


editor = Perm.READ | Perm.WRITE
print(editor)
print(Perm.WRITE in editor, Perm.DELETE in editor)
print(Perm.ADMIN.value, list(Perm.ADMIN))
`,
      out: `Perm.READ|WRITE
True False
7 [<Perm.READ: 1>, <Perm.WRITE: 2>, <Perm.DELETE: 4>]`,
      caption: "Here `auto()` is safe even if the value is stored, as long as members are only ever appended: each gets the next power of two. Inserting one in the middle reassigns the bits of everything after it." },

    { t: "p", text: "The harder problem is time. **Your enum is a snapshot of the legal values on the day you deployed.** When another service adds `\"refunded\"` and starts sending it, `Status(\"refunded\")` raises `ValueError` in every reader that has not been redeployed. `_missing_` is the hook that decides what happens instead." },

    { t: "code", lang: "python", title: "a reader that tolerates the unknown", code: `
from enum import StrEnum


class Status(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    UNKNOWN = "unknown"

    @classmethod
    def _missing_(cls, value: object) -> "Status":
        return cls.UNKNOWN          # a reader that tolerates values it has not seen


print(Status("paid"), Status("refunded"))   # "refunded" was added by another service
`,
      out: `paid unknown` },

    { t: "callout", kind: "tradeoff", title: "Strict or tolerant", body: [
      { t: "p", text: "**Be strict where you write and tolerant where you read.** An API accepting a status from a client should reject an unknown value — that is validation doing its job. A consumer reading events produced by other teams should map unknowns to `UNKNOWN`, log them, and keep going, because crashing on a value it could have ignored turns one team's deploy into everyone's incident." },
      { t: "p", text: "The cost of tolerance is that `UNKNOWN` must be handled everywhere a status is used — usually as \"hold and alert\". Make it a real state in the transition table, with no outgoing transitions, so it cannot drift into a shipping branch by accident." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make the order lifecycle checkable",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Orders move through `pending`, `paid`, `shipped`, `delivered`, `cancelled` and `refunded`. Today the status is a string and the rules live in four handlers that disagree. Replace both with one enum and one table." }
      ],
      requirements: [
        "A `StrEnum` with the six statuses plus an `UNKNOWN` member that `_missing_` returns for unseen values",
        "A transition table, with an assertion that it has an entry for every member",
        "An `is_final` property derived from the table, not written out by hand",
        "An `Order` with a `move_to(new)` method that raises a custom `InvalidTransition` for an illegal move",
        "Show that the status serialises to JSON with no `.value` and that `Status(\"chargeback\")` is final"
      ],
      hint: "Derive `is_final` as \"has no outgoing transitions\". Then adding a member forces exactly one decision — its row in the table — and everything else follows from it.",
      solution: {
        lang: "python",
        title: "order_status.py",
        code: `"""An order lifecycle the type system can check."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import StrEnum


class Status(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    UNKNOWN = "unknown"            # what a reader maps an unseen value to

    @classmethod
    def _missing_(cls, value: object) -> Status:
        return cls.UNKNOWN

    @property
    def is_final(self) -> bool:
        return not TRANSITIONS[self]


TRANSITIONS: dict[Status, frozenset[Status]] = {
    Status.PENDING: frozenset({Status.PAID, Status.CANCELLED}),
    Status.PAID: frozenset({Status.SHIPPED, Status.REFUNDED}),
    Status.SHIPPED: frozenset({Status.DELIVERED}),
    Status.DELIVERED: frozenset({Status.REFUNDED}),
    Status.CANCELLED: frozenset(),
    Status.REFUNDED: frozenset(),
    Status.UNKNOWN: frozenset(),
}
assert set(TRANSITIONS) == set(Status), "every member needs an entry"


class InvalidTransition(Exception):
    pass


@dataclass
class Order:
    id: str
    status: Status = Status.PENDING
    history: list[Status] = field(default_factory=list)

    def move_to(self, new: Status) -> None:
        if new not in TRANSITIONS[self.status]:
            raise InvalidTransition(f"{self.id}: {self.status} -> {new}")
        self.history.append(self.status)
        self.status = new


order = Order("o-17")
for step in (Status.PAID, Status.SHIPPED, Status.DELIVERED):
    order.move_to(step)
print(order.status, [s.value for s in order.history])

try:
    order.move_to(Status.PENDING)
except InvalidTransition as exc:
    print(f"InvalidTransition: {exc}")

print(json.dumps({"id": order.id, "status": order.status}))
print(Status("chargeback"), Status("chargeback").is_final)
print([s.value for s in Status if s.is_final])`,
        out: `delivered ['pending', 'paid', 'shipped']
InvalidTransition: o-17: delivered -> pending
{"id": "o-17", "status": "delivered"}
unknown True
['cancelled', 'refunded', 'unknown']`,
        notes: [
          { t: "p", text: "**`is_final` is derived, not declared.** A hand-written set of final states is a second source of truth that drifts from the table the first time someone adds a transition. Deriving it means the table is the only thing that can be wrong." },
          { t: "p", text: "**The module-level assertion runs on import**, so a member added without a row fails the moment any test imports the module — long before an order reaches the missing state in production." },
          { t: "p", text: "**`UNKNOWN` has no outgoing transitions on purpose.** An order in a state this code does not understand should stop, not guess. It is final here, which every caller already handles, so tolerating unknown values costs no new branches." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "The payments team added `PARTIALLY_REFUNDED` to their order-status enum and deployed on a Tuesday afternoon. Within minutes the fulfilment service's event consumer was crash-looping: every event carrying the new value raised `ValueError: 'partially_refunded' is not a valid Status` in `Status(event[\"status\"])`, the message was retried, and the queue backed up behind it. Orders that had nothing to do with refunds stopped shipping." },
      { t: "p", text: "**The enum was correct, and that was the problem.** Strict conversion is right at an API boundary and wrong in a consumer of another team's events, because it makes every reader's uptime depend on every writer's deploy order." },
      { t: "p", text: "**The fix had two parts.** In the consumer, `_missing_` mapped unseen values to `UNKNOWN`, which the transition table treats as final and which raises an alert, so the poison message became a held order. In process, new enum values became a two-step change: readers deploy first with the value known, writers start emitting it after. Neither part needed the other team to change anything." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**A bare string field accepts any value**, so a typo or a capitalisation difference fails silently as a branch that never runs.",
    "**Enum members are singletons** created when the class body runs: compare members with `is`, and `Status(value)` returns the existing member.",
    "**`Status(value)` is the boundary conversion** — run it where data enters, so a bad value fails there with a message that names the type.",
    "**A plain `Enum` member is never equal to its value**: `row[\"status\"] == Status.PAID` is always `False`, and it does not raise.",
    "**`StrEnum` and `IntEnum` members *are* their values** — equal to them, formatted as them and serialised as them — which removes the boundary trap.",
    "**Store `.value`, never `.name`**: a rename is a code change, and it must not also be a data migration.",
    "**Put the rules on the enum** — properties, methods and a transition table — and assert the table has a row for every member.",
    "**`Flag` is for combinations**; members combine with `|` and test with `in`.",
    "**An enum is a snapshot of the legal values on the day you deployed**; `_missing_` decides what a reader does with a value it has never seen.",
    "**Be strict where you write and tolerant where you read**, and roll out a new value readers first."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`class Status(Enum): PAID = \"paid\"`. A row from the database is `{\"status\": \"paid\"}`. What does `row[\"status\"] == Status.PAID` evaluate to?",
        options: [
          "`False` — a plain `Enum` member is not equal to its value, and no error is raised",
          "`True` — Python compares an enum member with a string by looking at the member's value",
          "It raises `TypeError`, because an enum member and a string cannot be compared",
          "`True`, but only if the enum is decorated with `@unique`, which enables value comparison"
        ],
        answer: 0,
        why: "A plain `Enum` defines equality by identity with other members, so comparing with any non-member — including its own value — is `False`. It does not raise, which is why the bug hides as a branch that never runs. `@unique` only forbids duplicate values and has nothing to do with equality. Converting with `Status(row[\"status\"])`, or using `StrEnum`, makes the comparison work."
      },
      {
        stem: "Why should you store `Status.PAID.value` in the database rather than `Status.PAID.name`?",
        options: [
          "The value is shorter, which keeps the column and its index small",
          "An enum member's name is not accessible at runtime once the class is created",
          "A refactor may rename the member; the value is what you promised to keep",
          "Databases cannot store uppercase strings without a case-sensitive collation"
        ],
        answer: 2,
        why: "Renaming `PAID` to `SETTLED` is an ordinary code change, but if names were stored it would silently break every existing row. Values are the part you choose to keep stable. Length is irrelevant, `.name` is perfectly available at runtime, and databases store uppercase text without difficulty — none of those is the reason."
      },
      {
        stem: "A consumer reads events produced by another team's service and converts each with `Status(event[\"status\"])`. What is the best defence against that team adding a new status?",
        options: [
          "Wrap every conversion in `try/except ValueError: pass`, so an unknown status never crashes the consumer",
          "Ask the other team never to add values without first coordinating a release with every consumer",
          "Define `_missing_` to return an `UNKNOWN` member that the rest of the code treats as a final, alerting state",
          "Use `auto()` for the values, so new statuses are generated automatically instead of being hand-written"
        ],
        answer: 2,
        why: "`_missing_` centralises the decision: every conversion tolerates unseen values in the same way, and `UNKNOWN` is a real state the transition table handles. Swallowing `ValueError` at each call site loses the event and repeats the decision everywhere. Asking another team to freeze their enum is not a technical control. `auto()` changes how values are generated, not what happens to an unknown one."
      },
      {
        stem: "You need to represent a user's permissions, where a user can hold read, write and delete at the same time. Which is the right tool?",
        options: [
          "`StrEnum`, storing a list of members for each user",
          "`Flag`, so permissions combine with `|` and test with `in`",
          "`IntEnum`, adding the members' integer values together",
          "`Literal[\"read\", \"write\", \"delete\"]`, with a set per user"
        ],
        answer: 1,
        why: "`Flag` is designed for combinations: `READ | WRITE` is itself a member, and `WRITE in perms` is a clear membership test. A list of `StrEnum` members works but loses the single-value representation and set semantics. Adding `IntEnum` values reinvents `Flag` without its checks. `Literal` exists only for the type checker and creates nothing at runtime to combine or test."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use an Enum instead of string constants?",
        strong: "Whenever a field has a closed set of legal values. An enum makes the set explicit and iterable, lets a type checker verify the field, and moves a bad value's failure to the boundary where it enters — instead of a typo silently failing a comparison deep in the code.",
        answer: [
          { t: "p", text: "The interviewer is listening for the *failure mode* you are removing, not for the syntax. Lead with the silent branch: `status == \"payed\"` is valid Python that is never true." },
          { t: "p", text: "Then name the boundary rule: convert with `Status(value)` where data enters and compare members everywhere else. Mentioning `StrEnum` for anything stored or sent as text shows you have used enums in a real service." }
        ],
        weak: "\"Enums are more readable.\" True, but it describes a preference rather than the class of bug the enum makes impossible."
      },
      {
        level: "advanced",
        q: "What is the difference between Enum and StrEnum, and which would you choose for an API field?",
        strong: "A `StrEnum` member is a `str`: it compares equal to its value, formats as its value and serialises to JSON unchanged. A plain `Enum` member equals only itself, so it needs `.value` at every boundary and a raw-string comparison is silently false. For an API or database field, `StrEnum` — the boundary is where plain `Enum` bites.",
        answer: [
          { t: "p", text: "A strong answer gives the concrete trap — `row[\"status\"] == Status.PAID` is always `False` with a plain `Enum` — because it proves the distinction matters rather than being trivia." },
          { t: "p", text: "Then offer the case for plain `Enum`: when you specifically do not want members to be interchangeable with strings, so that passing a raw string where a member is expected is a type error. Knowing both directions is what makes this a senior answer." }
        ]
      },
      {
        level: "expert",
        q: "Another team added a value to a shared enum and your consumer started crashing. How do you prevent that class of incident?",
        strong: "Strict where you write, tolerant where you read. The consumer maps unseen values to an `UNKNOWN` member via `_missing_`, treats it as a final state that alerts, and keeps processing. And new values roll out readers first: deploy code that knows the value, then let writers emit it.",
        answer: [
          { t: "p", text: "This is a schema-evolution question wearing an enum costume. The interviewer wants to hear that you see the deploy-ordering problem, not just the `ValueError`." },
          { t: "p", text: "Two layers make the answer complete: the code change (`_missing_`, with `UNKNOWN` handled in the state machine so it cannot drift into a happy path) and the process change (readers first). Mentioning that the API boundary should stay strict shows you know where tolerance does not belong." }
        ]
      }
    ]
  }
});
