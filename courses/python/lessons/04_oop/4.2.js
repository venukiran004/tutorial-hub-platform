/* ============================================================================
   LESSON 4.2 — Instance vs Class Attributes
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "Every attribute lookup on an instance searches **the instance first, then its class, then the class's ancestors**. That one rule explains why a class attribute acts as a default, why assigning to it through an instance does not change it for anyone else, and why a mutable class attribute is the single most damaging OOP bug in Python — the same shared-state failure from Lesson 1.4, now shared across every instance ever created.",

  objectives: [
    "Trace an attribute lookup through the instance, the class and the MRO",
    "Predict whether an assignment creates an instance attribute or modifies the class",
    "Recognise the mutable class attribute bug on sight",
    "Choose deliberately between a class attribute, an instance attribute and a constant",
    "Explain why `__slots__` changes this model"
  ],

  prerequisites: ["1.4", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The lookup order", id: "lookup" },

    { t: "viz",
      title: "Where an attribute comes from",
      caption: "Reading obj.x searches the instance __dict__, then the class, then each ancestor in MRO order, stopping at the first match. Writing obj.x = 1 always targets the instance __dict__ and never the class — which is why a class attribute behaves like a default that any instance can shadow.",
      svg: `<svg viewBox="0 0 900 290" role="img" aria-label="Diagram: attribute lookup searching instance dict then class then ancestors, while assignment targets only the instance dict">
  <defs>
    <marker id="b2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent)"/>
    </marker>
    <marker id="b2r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--crit)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--accent-ink)">READING  order.status</text>

  <rect x="20" y="38" width="200" height="52" rx="8" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.5"/>
  <text x="120" y="58" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink);font-weight:600">1 · instance __dict__</text>
  <text x="120" y="78" text-anchor="middle" class="s-mono" style="font-size:10px">{"order_id": "o-1"}</text>

  <line x1="220" y1="64" x2="278" y2="64" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#b2)"/>
  <text x="249" y="56" text-anchor="middle" class="s-sub">miss</text>

  <rect x="284" y="38" width="200" height="52" rx="8" style="fill:var(--good-soft);stroke:var(--good)" stroke-width="1.5"/>
  <text x="384" y="58" text-anchor="middle" class="s-sub" style="fill:var(--good);font-weight:600">2 · class __dict__</text>
  <text x="384" y="78" text-anchor="middle" class="s-mono" style="font-size:10px">{"status": "pending"}  HIT</text>

  <line x1="484" y1="64" x2="542" y2="64" style="stroke:var(--border-strong)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <rect x="548" y="38" width="200" height="52" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="648" y="58" text-anchor="middle" class="s-sub">3 · each ancestor, in MRO</text>
  <text x="648" y="78" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">not reached — 2 matched</text>

  <text x="762" y="68" class="s-sub" style="fill:var(--crit)">then AttributeError</text>

  <line x1="20" y1="118" x2="880" y2="118" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="144" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--crit)">WRITING  order.status = "paid"</text>

  <rect x="20" y="158" width="200" height="52" rx="8" style="fill:var(--crit-soft);stroke:var(--crit)" stroke-width="1.5"/>
  <text x="120" y="178" text-anchor="middle" class="s-sub" style="fill:var(--crit);font-weight:600">instance __dict__</text>
  <text x="120" y="198" text-anchor="middle" class="s-mono" style="font-size:10px">{"status": "paid"}</text>

  <line x1="240" y1="184" x2="298" y2="184" style="stroke:var(--crit)" stroke-width="1.6" stroke-dasharray="4 3"/>
  <text x="310" y="180" class="s-sub" style="fill:var(--crit)">STOPS HERE. The class is never touched.</text>
  <text x="310" y="198" class="s-sub">The class attribute still says "pending" for every other instance.</text>

  <rect x="20" y="228" width="860" height="52" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="250" class="s-sub" style="fill:var(--ink-2);font-weight:600">The asymmetry is the whole lesson</text>
  <text x="36" y="270" class="s-sub">Reads fall through to the class. Writes never do — unless you MUTATE the object the class attribute points at.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "seeing both dicts", code: `
class Order:
    status = "pending"          # class attribute -- one object, shared

    def __init__(self, order_id: str) -> None:
        self.order_id = order_id     # instance attribute -- one per object


a = Order("o-1")
b = Order("o-2")

print(a.__dict__)               # only what __init__ set
print(Order.__dict__["status"])
print(a.status, b.status)       # both read through to the class

a.status = "paid"               # creates an INSTANCE attribute on a
print(a.__dict__)
print(a.status, b.status, Order.status)
`,
      out: `{'order_id': 'o-1'}
pending
pending pending
{'order_id': 'o-1', 'status': 'paid'}
paid pending pending`,
      caption: "`a.status = \"paid\"` did not change the class. It added a key to `a.__dict__` that now shadows the class attribute for `a` only. `b` and the class itself are untouched."
    },

    { t: "callout", kind: "trap", title: "The mutable class attribute", body: [
      { t: "p", text: "The asymmetry above is safe for immutable values. It is catastrophic for mutable ones, because **mutating is not assigning** (Lesson 1.4) — so the write goes straight to the shared object." },
      { t: "code", lang: "python", title: "the bug", numbered: false, code: `
class ShoppingCart:
    items = []                  # ONE list, shared by every cart ever made

    def add(self, sku: str) -> None:
        self.items.append(sku)  # mutates the CLASS attribute


a = ShoppingCart()
b = ShoppingCart()
a.add("widget")

print(b.items)
print(ShoppingCart.items)`,
        out: `['widget']
['widget']`},
      { t: "p", text: "`self.items.append(...)` reads `items` — which falls through to the class — and then mutates that object. No assignment ever happens, so no instance attribute is created, and every cart in the process shares one list for the lifetime of the program." },
      { t: "p", text: "**The fix is a per-instance attribute:**" },
      { t: "code", lang: "python", title: "correct", numbered: false, code: `
class ShoppingCart:
    def __init__(self) -> None:
        self.items: list[str] = []      # a new list per instance

    def add(self, sku: str) -> None:
        self.items.append(sku)`,
        hl: [3]},
      { t: "p", text: "This is the same failure as the mutable default argument, one level up: the object is created **once**, when the class body executes at import, and shared by everything afterwards. In a long-running server it accumulates across requests and leaks one user's data into another's — exactly the scenario from Lesson 1.4." }
    ]},

    { t: "h2", n: "02", text: "When a class attribute is right", id: "when-right" },

    { t: "code", lang: "python", title: "the legitimate uses", code: `
from typing import ClassVar, Final


class Order:
    # 1. A constant that belongs to the type, not to an instance.
    #    ClassVar tells mypy this is never set on an instance.
    VALID_STATUSES: ClassVar[frozenset[str]] = frozenset(
        {"pending", "paid", "refunded"}
    )

    # 2. An immutable default that instances may shadow.
    currency: ClassVar[str] = "GBP"

    # 3. Counters and registries -- deliberately shared, and the
    #    sharing is the point.
    _created: ClassVar[int] = 0

    def __init__(self, order_id: str) -> None:
        self.order_id = order_id
        Order._created += 1        # explicit: Order, not self

    @classmethod
    def created_count(cls) -> int:
        return cls._created
`,
      caption: "Note `Order._created += 1` rather than `self._created += 1`. The `self` form would *read* the class value and then *assign* an instance attribute — silently giving every instance its own counter stuck at 1."
    },

    { t: "callout", kind: "insight", title: "`self.counter += 1` is a bug on a class attribute", body: [
      { t: "code", lang: "python", title: "why it silently fails", numbered: false, code: `
class Counter:
    count = 0

    def bump(self) -> None:
        self.count += 1          # read from class, WRITE to instance


a, b = Counter(), Counter()
a.bump(); a.bump()
b.bump()

print(a.count, b.count, Counter.count)`,
        out: `2 1 0`},
      { t: "p", text: "`self.count += 1` expands to `self.count = self.count + 1`. The read falls through to the class (0), and the write creates an instance attribute. So each instance gets its own counter, and the class attribute stays 0 forever." },
      { t: "p", text: "It is a genuinely tricky bug because the behaviour looks almost right — the numbers increment, just per-instance. **Use `ClassName.count += 1` when you mean the class, and `ClassVar` so mypy flags the mistake.**" }
    ]},

    { t: "table",
      head: ["Put it on the class when", "Put it on the instance when"],
      rows: [
        ["It is a **constant** for the type — valid statuses, a version, a table name", "The value differs per object"],
        ["It is an **immutable** default instances may override", "The value is mutable — a list, dict or set"],
        ["The sharing is the **intent** — a registry, a counter, a cache with an owner", "The value comes from constructor arguments"],
        ["It is a method (methods are class attributes)", "It is state that changes over the object's life"]
      ],
      caption: "The decisive question is **mutability**. An immutable class attribute is a safe default; a mutable one is shared state with no owner (Lesson 2.5)."
    },

    { t: "h2", n: "03", text: "Methods are class attributes too", id: "methods" },

    { t: "code", lang: "python", title: "the same lookup, applied to functions", code: `
class Order:
    def total(self) -> int:
        return 100


order = Order()

print(Order.__dict__["total"])       # a plain function on the class
print(order.total)                   # a bound method -- self pre-attached
print(order.total.__func__ is Order.__dict__["total"])

# Because methods live in the class dict, an instance can shadow one:
order.total = lambda: 999            # instance attribute wins the lookup
print(order.total())
print(Order().total())               # other instances unaffected
`,
      out: `<function Order.total at 0x...>
<bound method Order.total of <__main__.Order object at 0x...>>
True
999
100`,
      caption: "Attribute lookup does not distinguish data from functions. `order.total` finds the function on the class and wraps it in a bound method that supplies `self` — which is exactly the `Order.total(order)` equivalence from Lesson 4.1. Shadowing a method on an instance works and is almost always a mistake, though it is occasionally how a test injects a stub."
    },

    { t: "h2", n: "04", text: "__slots__ changes the model", id: "slots" },

    { t: "code", lang: "python", title: "no instance dict at all", code: `
import sys


class Plain:
    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y


class Slotted:
    __slots__ = ("x", "y")

    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y


p, s = Plain(1, 2), Slotted(1, 2)

print(sys.getsizeof(p.__dict__) + sys.getsizeof(p))
print(sys.getsizeof(s))
print(hasattr(s, "__dict__"))

s.z = 3
`,
      out: `152
56
False
AttributeError: 'Slotted' object has no attribute 'z'`
    },

    { t: "callout", kind: "tradeoff", title: "What `__slots__` buys and costs", body: [
      { t: "ul", items: [
        "**Buys:** substantially less memory per instance — the per-instance dict disappears — and slightly faster attribute access. Worth it when you create millions of small objects.",
        "**Costs:** no new attributes at runtime, so no monkey-patching and no attributes created outside `__init__`. Multiple inheritance from two slotted classes with overlapping slots fails. Some libraries expecting `__dict__` break.",
        "**Note:** `@dataclass(slots=True)` gives you this with none of the boilerplate, and is the usual way to reach for it (Lesson 4.10)."
      ]},
      { t: "p", text: "The point for this lesson is that `__slots__` **removes the instance `__dict__`**, so the lookup diagram changes: there is no instance dict to search or write to, and slots are implemented as descriptors on the class (Lesson 8.5). It also enforces the discipline from Lesson 4.1 — declaring every attribute in `__init__` stops being advice and becomes a requirement." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find four attribute bugs",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The class below has four distinct attribute bugs. Two produce visibly wrong data, one is silent and produces almost-right numbers, and one only shows up in a long-running process." },
        { t: "p", text: "Find all four, explain the mechanism for each, and fix them. Then write the test that would have caught the silent one." }
      ],
      requirements: [
        "Identify all four bugs and name the mechanism behind each.",
        "Fix them, preferring immutability and per-instance state over defensive copying.",
        "Use `ClassVar` to mark the attributes that genuinely belong to the class.",
        "Write a test that creates two instances and proves no state leaks between them.",
        "Write a test that proves the counter counts instances, not per-instance calls.",
        "Explain which bug would not appear in a short-lived script and why."
      ],
      hint: "Look at each class-body assignment and ask: is this value mutable? Then look at each `self.X += 1` and ask whether the read and the write target the same place.",
      solution: {
        lang: "python",
        title: "session.py",
        code: `# ---- the original ------------------------------------------------------

class Session:
    active_users = []            # BUG 1: mutable class attribute
    default_prefs = {"theme": "light"}   # BUG 2: mutable class attribute
    login_count = 0              # (fine as a value, but see BUG 3)

    def __init__(self, username):
        self.username = username
        self.prefs = self.default_prefs      # BUG 4: shares the class dict
        self.active_users.append(username)   # mutates the shared list
        self.login_count += 1                # BUG 3: read class, write self

    def set_theme(self, theme):
        self.prefs["theme"] = theme          # mutates the SHARED dict


# ---- the mechanisms ----------------------------------------------------
#
# BUG 1  active_users is one list created when the class body ran at
#        import. Every Session appends to it. It grows for the life of
#        the process and every instance sees every other user.
#
# BUG 2  default_prefs is one dict, shared the same way.
#
# BUG 3  self.login_count += 1 expands to
#            self.login_count = self.login_count + 1
#        The READ falls through to the class (0); the WRITE creates an
#        instance attribute. So every session's count is 1 and the class
#        attribute stays 0 forever. Silent, and almost-right.
#
# BUG 4  self.prefs = self.default_prefs binds the instance attribute to
#        the SAME dict object -- not a copy. So set_theme on one session
#        changes the theme for every session created afterwards, because
#        they all point at the same dict.
#
# WHICH ONE HIDES IN A SHORT SCRIPT: bugs 1 and 4 need repeated
# construction over time to be visible. A script creating one Session
# behaves perfectly. A server creating one per request accumulates for
# as long as the process lives -- which is why this class of bug reaches
# production and passes every unit test.


# ---- the fix -----------------------------------------------------------

from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar, Final


@dataclass(frozen=True, slots=True)
class Preferences:
    """Frozen, so a shared default cannot be mutated by anyone.

    Immutability removes the failure mode rather than defending against
    it -- there is nothing to copy and nothing a future change can undo
    (Lesson 2.5).
    """
    theme: str = "light"
    density: str = "comfortable"

    def with_theme(self, theme: str) -> "Preferences":
        """Return a new Preferences. The original is untouched."""
        from dataclasses import replace
        return replace(self, theme=theme)


class Session:
    # ClassVar marks these as belonging to the TYPE. mypy will now
    # reject self.DEFAULT_PREFS = ... as an error.
    DEFAULT_PREFS: ClassVar[Preferences] = Preferences()

    # A counter is legitimate shared state -- the sharing IS the point.
    _sessions_created: ClassVar[int] = 0

    def __init__(self, username: str) -> None:
        self.username = username
        # Safe to share: Preferences is frozen, so no instance can
        # mutate it for the others.
        self.prefs = self.DEFAULT_PREFS

        # Session, not self: assigning through self would create an
        # instance attribute and leave the class counter at 0.
        Session._sessions_created += 1

    def set_theme(self, theme: str) -> None:
        # Rebinds this instance's attribute to a NEW Preferences.
        # No mutation, so nothing is shared.
        self.prefs = self.prefs.with_theme(theme)

    @classmethod
    def sessions_created(cls) -> int:
        return cls._sessions_created


# ---- the tests ---------------------------------------------------------

def test_preferences_do_not_leak_between_sessions() -> None:
    """Act on A, assert about B -- the shape of every shared-state test."""
    a = Session("ada")
    a.set_theme("dark")

    b = Session("grace")
    assert b.prefs.theme == "light", b.prefs
    assert Session.DEFAULT_PREFS.theme == "light"


def test_counter_counts_instances_not_calls() -> None:
    """The test that catches the silent bug.

    Against the original this reads 1 rather than 2, because each
    instance got its own attribute instead of updating the class.
    """
    before = Session.sessions_created()
    Session("a")
    Session("b")
    assert Session.sessions_created() == before + 2


def test_frozen_preferences_cannot_be_mutated() -> None:
    from dataclasses import FrozenInstanceError

    try:
        Session.DEFAULT_PREFS.theme = "dark"
    except FrozenInstanceError:
        pass
    else:
        raise AssertionError("expected FrozenInstanceError")


if __name__ == "__main__":
    test_preferences_do_not_leak_between_sessions()
    test_counter_counts_instances_not_calls()
    test_frozen_preferences_cannot_be_mutated()
    print("all four bugs closed")`,
        notes: [
          { t: "p", text: "**Bug 3 is the instructive one** because the output looks nearly correct. Every session reports a `login_count` of 1, which is plausible enough to pass casual review — the numbers increment, they are just per-instance. The test that catches it asserts on the *class* value after two constructions, which is the only place the discrepancy shows." },
          { t: "p", text: "**`active_users` was dropped rather than fixed**, deliberately. A list of active users belongs to a session *store*, not to the `Session` class — a class attribute was doing the job of a registry with no owner and no way to remove entries. Lesson 3.3's argument applies: give the state an object whose lifetime you control." },
          { t: "p", text: "**Freezing `Preferences` means the shared default is safe**, so no copying is needed anywhere. `set_theme` rebinds to a new object rather than mutating, which is the same rebind-versus-mutate distinction that caused bug 4 — used deliberately this time." },
          { t: "callout", kind: "insight", title: "Why ClassVar matters here", body: [
            { t: "p", text: "`ClassVar` is not decoration. It tells mypy that the attribute belongs to the class, so writing `self.DEFAULT_PREFS = ...` becomes a type error — catching exactly the mistake bug 3 made, at edit time rather than in production." },
            { t: "p", text: "Without it, a type checker cannot tell an intentional class-level constant from an instance attribute someone forgot to initialise in `__init__`, so it flags neither." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A Django model defines `tags = []` as a class-level default. In development every object behaves correctly. In production, a few hours after each deploy, new records start appearing with tags belonging to unrelated records — and the pattern resets on every restart." },
      { t: "p", text: "**One list, created when the module was imported, shared by every instance in the worker process.** `self.tags.append(...)` reads the class attribute and mutates it, so tags accumulate across requests. The restart clears it, which is why it looked intermittent and why nobody could reproduce it locally." },
      { t: "p", text: "**Why the deploy cycle masked it:** the corruption grows over hours and is wiped by every restart, so it never reaches a size that breaks anything obviously. Frequent deploys made the symptom look random rather than progressive." },
      { t: "p", text: "**The fix is per-instance state** — set it in `__init__`, or use `field(default_factory=list)` on a dataclass. The broader habit worth forming: **any mutable value in a class body is shared state with no owner**, and it should be either immutable or moved into `__init__`. Lesson 2.5 covers the four defences." }
    ]}
  ],

  takeaways: [
    "Reading `obj.x` searches the **instance dict, then the class, then each ancestor in MRO order**. Writing `obj.x = v` always targets the instance dict and never the class.",
    "That asymmetry makes an immutable class attribute a safe default that any instance can shadow.",
    "**A mutable class attribute is shared by every instance ever created**, for the life of the process — because `self.items.append(...)` reads through to the class and then mutates, with no assignment involved.",
    "**`self.count += 1` on a class attribute is a silent bug.** The read falls through to the class; the write creates an instance attribute. Use `ClassName.count += 1`.",
    "`ClassVar` tells mypy an attribute belongs to the type, so assigning through `self` becomes an edit-time error.",
    "Legitimate class attributes: **constants**, **immutable defaults**, and deliberately shared registries or counters. Never a `list`, `dict` or `set`.",
    "**Methods are class attributes.** `obj.method` finds the function on the class and binds `self` — which is why an instance can shadow a method, and why the lookup rules are the same for data and behaviour.",
    "`__slots__` removes the instance `__dict__` entirely: less memory, faster access, no new attributes at runtime. `@dataclass(slots=True)` is the ergonomic form.",
    "Shared-class-state bugs need **repeated construction over time** to become visible, so they pass every unit test and only surface in long-lived processes."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does this print?",
        lang: "python",
        code: `class Cart:
    items = []

a, b = Cart(), Cart()
a.items.append("x")
print(b.items)`,
        options: [
          "`[]` — each instance gets its own list",
          "`['x']` — `append` mutates the single shared class attribute, with no assignment to create an instance attribute",
          "`AttributeError`, because `items` was never set on the instance",
          "`['x']`, but only because `a` and `b` were created in the same statement"
        ],
        answer: 1,
        why: "`a.items` reads through to the class and returns the one list created when the class body executed. `.append()` mutates that object — no assignment happens, so no instance attribute is created to shadow it. Every instance in the process shares one list for the program's lifetime. This is the mutable-default trap from Lesson 1.4, one level up."
      },
      {
        stem: "A class has `count = 0` and a method doing `self.count += 1`. After two instances each call it once, what is `Cls.count`?",
        options: [
          "`2` — both increments applied to the class attribute",
          "`0` — the read fell through to the class but the write created an instance attribute on each object",
          "`1` — only the first increment reached the class",
          "`AttributeError` on the second instance"
        ],
        answer: 1,
        why: "`self.count += 1` expands to `self.count = self.count + 1`. The read finds 0 on the class; the write creates an instance attribute holding 1. So each instance has its own `count` of 1 and the class attribute never changes. The output looks nearly right — the numbers do increment — which is what makes it a silent bug. Use `Cls.count += 1`, and mark it `ClassVar` so mypy rejects the `self` form."
      },
      {
        stem: "What does `ClassVar[frozenset[str]]` actually accomplish?",
        options: [
          "It makes the attribute read-only at runtime",
          "It tells a type checker the attribute belongs to the class, so assigning it through `self` becomes a type error",
          "It creates a separate copy for each subclass",
          "It is required for any attribute defined in a class body"
        ],
        answer: 1,
        why: "`ClassVar` is a hint, not runtime enforcement — nothing stops `obj.X = ...` when the code runs. Its value is that mypy will reject it, catching the exact mistake of assigning through `self` to something meant to be class-level. Without the annotation a type checker cannot distinguish an intentional class constant from an instance attribute someone forgot to set in `__init__`. The `frozenset` is what provides the runtime immutability."
      },
      {
        stem: "Why do mutable-class-attribute bugs pass unit tests but fail in production?",
        options: [
          "Test runners reset class attributes between tests automatically",
          "The corruption accumulates across constructions in one long-lived process — a test creates one or two objects and asserts immediately",
          "Production uses a different import mechanism",
          "They only occur under concurrent access"
        ],
        answer: 1,
        why: "The shared object is created once, when the class body executes at import, and lives as long as the process. A test creates a couple of instances in a fresh process and asserts straight away, so nothing has accumulated. A server creating one per request accumulates all day. Concurrency makes it *more visible* but is not required — the same corruption happens single-threaded, as Lesson 2.5 showed."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between a class attribute and an instance attribute?",
        strong: "A class attribute lives on the class and is shared by every instance; an instance attribute lives in that object's `__dict__`. Reading falls through instance → class → ancestors; writing always targets the instance, so a class attribute behaves like a default that any instance can shadow.",
        answer: [
          { t: "p", text: "Stating the read/write asymmetry explicitly is what makes the answer complete, because every consequence follows from it." },
          { t: "p", text: "The follow-up is nearly always the mutable case, so volunteer it: `self.items.append(x)` reads through to the class and mutates the shared object with no assignment involved, so one list serves every instance for the life of the process." },
          { t: "p", text: "Being able to name the legitimate uses — constants, immutable defaults, deliberate registries or counters — shows this is a judgement you make rather than a rule you avoid." }
        ]
      },
      {
        level: "core",
        q: "Why is a mutable class attribute dangerous?",
        strong: "It is created once, when the class body executes at import, and shared by every instance for the process lifetime. Mutating it needs no assignment, so no instance attribute is created to shadow it — one list or dict serves everyone, accumulating across requests.",
        answer: [
          { t: "p", text: "The operational detail is what lands: in a long-running server this leaks one user's data into another's response, and it resets on restart — so frequent deploys make the symptom look random rather than progressive." },
          { t: "p", text: "It is worth connecting it to the mutable default argument. Both are the same failure: an object created once at definition time and shared by every later use. Recognising them as one pattern is more useful than memorising two rules." },
          { t: "p", text: "On fixes, lead with immutability and per-instance construction rather than defensive copying — a `frozenset` constant or `field(default_factory=list)` removes the failure mode instead of guarding against it." }
        ]
      },
      {
        level: "advanced",
        q: "Explain what `__slots__` does and when you would use it.",
        strong: "It replaces the per-instance `__dict__` with a fixed set of descriptor slots on the class. That cuts memory per instance substantially and speeds up attribute access, at the cost of not being able to add attributes at runtime.",
        answer: [
          { t: "p", text: "Naming the threshold matters: it is worth reaching for when you create millions of small objects — a simulation, a parser, a large in-memory dataset — and irrelevant for a handful of service objects." },
          { t: "p", text: "The costs are worth being honest about: no monkey-patching, no attributes created outside `__init__`, multiple inheritance from two slotted classes with overlapping slots fails, and some libraries expect `__dict__` to exist." },
          { t: "p", text: "The current-practice note is `@dataclass(slots=True)`, which gives you the benefit with none of the boilerplate. And connecting it back to design: slots turn \"declare every attribute in `__init__`\" from advice into an enforced requirement." }
        ]
      }
    ]
  }
});
