/* ============================================================================
   LESSON 3.4 — Functions as Values
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "A function in Python is an ordinary object. You can store one in a dict, pass it as an argument, return it from another function and attach attributes to it. That is not a curiosity — it is the mechanism behind decorators, callbacks, dispatch tables, `key=` arguments and every plugin system you will meet, and it replaces whole categories of class hierarchy that other languages need.",

  objectives: [
    "Pass and return functions, and read a `Callable` type hint",
    "Replace a branching structure with a dispatch table of functions",
    "Use `functools.partial` to specialise a function without a lambda",
    "Explain why the Strategy pattern is usually just a function in Python",
    "Recognise where a callback makes code harder to follow"
  ],

  prerequisites: ["3.1", "3.2"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "First-class means first-class", id: "first-class" },

    { t: "code", lang: "python", title: "everything you can do with a value, you can do with a function", code: `
def shout(text: str) -> str:
    return text.upper() + "!"


# 1. Bind another name to it -- no call, no parentheses
loud = shout
print(loud("hello"))

# 2. Store it in a container
transforms = {"shout": shout, "quiet": str.lower}
print(transforms["shout"]("hey"))

# 3. Pass it as an argument
print(sorted(["bb", "a", "ccc"], key=len))

# 4. Return it from a function, and attach attributes to it
def tag(name: str):
    def render(text: str) -> str:
        return f"<{name}>{text}</{name}>"
    render.tag_name = name          # functions accept attributes
    return render

bold = tag("b")
print(bold("hi"), bold.tag_name)
`,
      out: `HELLO!
HEY!
['a', 'bb', 'ccc']
<b>hi</b> b`
    },

    { t: "callout", kind: "trap", title: "The parentheses are the whole difference", body: [
      { t: "code", lang: "python", title: "reference versus call", numbered: false, code: `
handler = process          # the function object itself
handler = process()        # the RESULT of calling it -- probably None

# The bug this causes, in a framework registration:
app.add_handler(on_message())      # calls it now, registers the result
app.add_handler(on_message)        # correct -- registers the function`},
      { t: "p", text: "Because a function with no explicit return gives `None`, the mistaken version often registers `None` and fails much later with `'NoneType' object is not callable` — far from the line that caused it. Whenever a callback \"never fires\", check for stray parentheses at the registration site first." }
    ]},

    { t: "code", lang: "python", title: "typing a callable", code: `
from collections.abc import Callable

# Callable[[argument types], return type]
Formatter = Callable[[str], str]
Reducer = Callable[[int, int], int]
Handler = Callable[..., None]        # ... = any arguments


def apply_all(text: str, steps: list[Formatter]) -> str:
    for step in steps:
        text = step(text)
    return text


print(apply_all("  hello  ", [str.strip, str.title]))
`,
      out: `Hello`,
      caption: "A type alias gives the callable a name, so the signature reads as a contract rather than as punctuation. Note that `str.strip` is a perfectly ordinary function — unbound methods are values too."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Dispatch tables", id: "dispatch" },

    { t: "p", text: "Lesson 2.6 replaced a chain of `elif` with a dict mapping keys to *values*. The same move with functions as the values replaces a chain where each branch does work." },

    { t: "ladder",
      title: "Handling incoming webhook events",
      rungs: [
        { level: "bad", label: "Growing elif chain", why: "adding a branch touches shared code",
          code: `def handle(event):
    if event["type"] == "order.created":
        order = Order(**event["data"])
        db.save(order)
        email.send_confirmation(order)
    elif event["type"] == "order.refunded":
        order = db.find(event["data"]["id"])
        order.refund()
        email.send_refund_notice(order)
    elif event["type"] == "user.deleted":
        ...
    else:
        log.warning("unknown event")`,
          note: "Every new event type edits the same function, so two people adding handlers conflict. Nothing is individually testable — testing the refund path means constructing an event and calling the whole dispatcher. And the function grows without bound." },

        { level: "ok", label: "Dict of functions", why: "each branch is a named, testable unit",
          code: `def handle_order_created(data: dict) -> None:
    order = Order(**data)
    db.save(order)
    email.send_confirmation(order)


def handle_order_refunded(data: dict) -> None:
    order = db.find(data["id"])
    order.refund()
    email.send_refund_notice(order)


HANDLERS: dict[str, Callable[[dict], None]] = {
    "order.created": handle_order_created,
    "order.refunded": handle_order_refunded,
}


def handle(event: dict) -> None:
    handler = HANDLERS.get(event["type"])
    if handler is None:
        raise UnknownEvent(event["type"])
    handler(event["data"])`,
          note: "Each handler is a plain function you can call directly in a test with a literal dict. The dispatcher is four lines and never changes. Adding an event type is a new function plus one line in the table — no edit to shared logic." },

        { level: "best", label: "Registered by decorator", why: "the handler declares its own key",
          code: `HANDLERS: dict[str, Callable[[dict], None]] = {}


def handles(event_type: str):
    """Register a function as the handler for one event type."""
    def register(fn: Callable[[dict], None]):
        if event_type in HANDLERS:
            raise ValueError(f"duplicate handler for {event_type}")
        HANDLERS[event_type] = fn
        return fn            # return unchanged -- this only registers
    return register


@handles("order.created")
def handle_order_created(data: dict) -> None:
    ...


@handles("order.refunded")
def handle_order_refunded(data: dict) -> None:
    ...`,
          note: "The key now lives next to the handler instead of in a separate table that can drift out of sync — you cannot add a function and forget to register it. The duplicate check catches two handlers claiming the same event, which the plain dict would silently resolve in favour of whichever was written last. This is exactly how Flask routes and pytest fixtures work, and Lesson 3.7 covers the decorator mechanics." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "The cost of decorator registration", body: [
      { t: "p", text: "Registration happens as a **side effect of import**. If the module defining a handler is never imported, the handler silently does not exist — and the failure is \"nothing happened\", not an error." },
      { t: "p", text: "Every framework using this pattern has the same footgun, which is why Flask has blueprints and pytest has `conftest.py` conventions: they exist to guarantee the modules get imported. In your own code, import handler modules explicitly in one place rather than relying on them being pulled in incidentally." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "functools.partial", id: "partial" },

    { t: "code", lang: "python", title: "fixing some arguments now, the rest later", code: `
from functools import partial


def send(message: str, *, channel: str, urgent: bool = False) -> None:
    print(f"[{channel}]{' URGENT' if urgent else ''} {message}")


alert_ops = partial(send, channel="ops", urgent=True)
notify_team = partial(send, channel="team")

alert_ops("disk at 95%")
notify_team("deploy finished")

# partial keeps the original visible, which a lambda does not
print(alert_ops.func.__name__, alert_ops.keywords)
`,
      out: `[ops] URGENT disk at 95%
[team] deploy finished
send {'channel': 'ops', 'urgent': True}`
    },

    { t: "callout", kind: "good", title: "partial versus lambda", body: [
      { t: "table",
        head: ["", "`partial(send, channel=\"ops\")`", "`lambda m: send(m, channel=\"ops\")`"],
        rows: [
          ["Introspectable", "`.func`, `.args`, `.keywords` are readable", "An opaque `<lambda>`"],
          ["`repr` in a traceback", "Names the wrapped function", "Says `<lambda>` and nothing else"],
          ["Late binding", "Arguments bound **now**", "Looked up **when called** — the classic loop bug"],
          ["Pickleable", "Yes, if the target is importable", "No — breaks `multiprocessing`"]
        ]
      },
      { t: "code", lang: "python", title: "the late-binding difference is not academic", numbered: false, code: `
# Lambdas capture the VARIABLE, not its value at creation time
handlers = [lambda: print(i) for i in range(3)]
for h in handlers:
    h()                      # 2 2 2 -- all see the final i

# partial binds the value immediately
handlers = [partial(print, i) for i in range(3)]
for h in handlers:
    h()                      # 0 1 2`,
        out: `2
2
2
0
1
2`},
      { t: "p", text: "The lambda version is the late-binding closure trap, covered fully in Lesson 3.6. `partial` avoids it because the argument is evaluated and stored at the moment `partial` is called." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Strategy is a function", id: "strategy" },

    { t: "p", text: "In languages without first-class functions, varying one behaviour means defining an interface and a class per implementation. In Python the interface is the call signature and each implementation is a function." },

    { t: "code", lang: "python", title: "the same design, two ways", code: `
from collections.abc import Callable
from decimal import Decimal

# --- what a class-based Strategy looks like ---------------------------
class DiscountStrategy:
    def apply(self, total: Decimal) -> Decimal:
        raise NotImplementedError


class PercentOff(DiscountStrategy):
    def __init__(self, pct: Decimal) -> None:
        self.pct = pct

    def apply(self, total: Decimal) -> Decimal:
        return total * (1 - self.pct)


# --- the Python version ------------------------------------------------
Discount = Callable[[Decimal], Decimal]


def percent_off(pct: Decimal) -> Discount:
    def apply(total: Decimal) -> Decimal:
        return total * (1 - pct)
    return apply


def checkout(total: Decimal, discount: Discount = lambda t: t) -> Decimal:
    return discount(total)


print(checkout(Decimal("100"), percent_off(Decimal("0.2"))))
`,
      out: `80.00`
    },

    { t: "callout", kind: "tradeoff", title: "When the class is still the right answer", body: [
      { t: "ul", items: [
        "**The strategy has more than one method.** A discount that also needs `describe()` and `is_applicable()` is an object, not a function.",
        "**It carries substantial state.** A rate limiter tracking windows and counters wants attributes, not a closure over five variables.",
        "**It needs to be introspected or serialised.** A class has a name, a `repr`, and can be pickled or persisted by type."
      ]},
      { t: "p", text: "**The heuristic:** a single-method interface is a function. Two or more related methods, or real state, is a class. Writing a class with one method called `execute` or `apply` and nothing else is a sign the language already had what you needed." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Where callbacks hurt", id: "callbacks" },

    { t: "callout", kind: "warn", title: "Two failure modes worth knowing", body: [
      { t: "p", text: "**Control flow becomes invisible.** A function taking three callbacks has three branches whose bodies live somewhere else, so reading it top to bottom no longer tells you what happens. This is why deeply callback-driven code is hard to follow even when each piece is small." },
      { t: "code", lang: "python", title: "too many hooks", numbered: false, code: `
# Nobody can predict what this does without finding four other functions
process(
    data,
    on_start=setup,
    validator=check,
    transformer=convert,
    on_error=recover,
    on_complete=finish,
)`},
      { t: "p", text: "**Exceptions cross a boundary the caller did not write.** When a callback raises, the traceback runs through the framework's frames, and the framework must decide whether to swallow, log or propagate. Document that decision — a callback whose exceptions are silently swallowed will hide real bugs indefinitely." },
      { t: "p", text: "The practical limit: **one or two callbacks with obvious names is a clean design; five is a class with methods**, where the reader can see the whole protocol in one place." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Build a validation pipeline",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Build a small validation system where each rule is a function. The point is to see how far first-class functions get you before a class becomes necessary — and to notice exactly where that line falls." }
      ],
      requirements: [
        "A rule is a callable taking a value and returning an error message string, or `None` if the value is valid.",
        "Provide rule *factories* — `min_length(n)`, `matches(pattern)`, `in_range(lo, hi)` — that return rules.",
        "Write a `validate(value, rules)` that collects **all** failures, not just the first.",
        "Build a registry mapping field names to their rule lists, and validate a whole record against it.",
        "Use `functools.partial` at least once, and explain why it beats a lambda there.",
        "Then extend rules to carry a machine-readable error **code** as well as a message — and note what that forces you to change."
      ],
      hint: "The last requirement is the interesting one. A plain function can only return one thing; carrying a code alongside the message means either returning a small object, or attaching an attribute to the function.",
      solution: {
        lang: "python",
        title: "validation.py",
        code: `"""Validation rules as first-class functions."""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable, Mapping
from functools import partial
from typing import Any, NamedTuple

# A rule takes a value and returns an error message, or None if valid.
Rule = Callable[[Any], str | None]


# ---- rule factories: functions that BUILD rules ------------------------

def min_length(n: int) -> Rule:
    def rule(value: Any) -> str | None:
        if len(value) < n:
            return f"must be at least {n} characters, got {len(value)}"
        return None
    return rule


def matches(pattern: str, description: str) -> Rule:
    compiled = re.compile(pattern)      # compile once, at factory time

    def rule(value: Any) -> str | None:
        if not compiled.fullmatch(str(value)):
            return f"must be {description}"
        return None
    return rule


def in_range(lo: float, hi: float) -> Rule:
    def rule(value: Any) -> str | None:
        if not lo <= value <= hi:
            return f"must be between {lo} and {hi}, got {value}"
        return None
    return rule


def not_in(forbidden: frozenset[str]) -> Rule:
    def rule(value: Any) -> str | None:
        if value in forbidden:
            return f"{value!r} is not allowed"
        return None
    return rule


# ---- partial, where it beats a lambda ----------------------------------

def one_of(value: Any, *, allowed: frozenset) -> str | None:
    if value not in allowed:
        return f"must be one of {sorted(allowed)}"
    return None


# partial over lambda here for three reasons:
#   1. .func and .keywords are introspectable -- a debugger and a
#      traceback both show "one_of" and the allowed set
#   2. the allowed set is bound NOW, so a later rebinding of the
#      variable cannot change the rule (the late-binding trap)
#   3. it is pickleable, so rules survive multiprocessing
valid_role = partial(one_of, allowed=frozenset({"admin", "editor", "viewer"}))


# ---- the validator -----------------------------------------------------

def validate(value: Any, rules: Iterable[Rule]) -> list[str]:
    """Return every failure message. Empty list means valid."""
    return [msg for rule in rules if (msg := rule(value)) is not None]


SCHEMA: dict[str, list[Rule]] = {
    "username": [
        min_length(3),
        matches(r"[a-z0-9_]+", "lowercase letters, digits and underscores"),
        not_in(frozenset({"admin", "root"})),
    ],
    "age": [in_range(13, 120)],
    "role": [valid_role],
}


def validate_record(record: Mapping[str, Any]) -> dict[str, list[str]]:
    """Validate every known field. Returns {field: [errors]} for failures."""
    problems = {}
    for field, rules in SCHEMA.items():
        if field not in record:
            problems[field] = ["is required"]
            continue
        failures = validate(record[field], rules)
        if failures:
            problems[field] = failures
    return problems


# ---- the extension: rules that carry a code ----------------------------
#
# A plain function returns ONE thing. To carry a code alongside the
# message we need either a richer return value or an attribute on the
# function. The return value is better: attributes on functions are
# invisible to type checkers and easy to forget on a new rule.

class Failure(NamedTuple):
    code: str
    message: str


CodedRule = Callable[[Any], Failure | None]


def coded_min_length(n: int) -> CodedRule:
    def rule(value: Any) -> Failure | None:
        if len(value) < n:
            return Failure("too_short", f"must be at least {n} characters")
        return None
    return rule


def validate_coded(value: Any, rules: Iterable[CodedRule]) -> list[Failure]:
    return [f for rule in rules if (f := rule(value)) is not None]


if __name__ == "__main__":
    print(validate_record({"username": "ab", "age": 200, "role": "wizard"}))
    print(validate_record({"username": "ada_l", "age": 36, "role": "admin"}))

    failures = validate_coded("ab", [coded_min_length(3)])
    print(failures[0].code, "|", failures[0].message)`,
        out: `{'username': ['must be at least 3 characters, got 2'], 'age': ['must be between 13 and 120, got 200'], 'role': ["must be one of ['admin', 'editor', 'viewer']"]}
{}
too_short | must be at least 3 characters`,
        notes: [
          { t: "p", text: "**The factories are closures**, which is Lesson 3.6's subject arriving early. `min_length(3)` returns a function that remembers `3` — and `matches` uses that to compile the regex once at factory time rather than on every validation, which matters when the rule runs against thousands of records." },
          { t: "p", text: "**The walrus in the comprehension** (`if (msg := rule(value)) is not None`) is the case Lesson 2.11 flagged: without it you would call each rule twice, once to test and once to collect. Lesson 5.4 covers assignment expressions properly." },
          { t: "p", text: "**The final requirement is where the design shifts.** A function returns one value, so adding a code means enriching the return type. Attaching `rule.code = \"too_short\"` also works and is worse: type checkers cannot see it, every new rule can forget it, and the code is attached to the *rule* rather than to the specific failure — so a rule that can fail two ways cannot express that." },
          { t: "callout", kind: "insight", title: "Where a class would finally earn its place", body: [
            { t: "p", text: "Keep going and the pressure builds. If rules also need a human-readable `describe()` for documentation, a `severity`, and the ability to be serialised into a JSON schema, you now have three or four related behaviours per rule — and that is an object." },
            { t: "p", text: "The line is the one from earlier in this lesson: **a single-method interface is a function; two or more related behaviours, or real state, is a class.** Starting with functions and moving to classes when that pressure appears is the right direction — the reverse, starting with a class hierarchy for one method, is the mistake Python makes easy to avoid." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service registers webhook handlers with a decorator. A new event type is added, the handler is written, tests for it pass — and in production the event is silently ignored. No error, no log line, nothing in the traceback because there is no traceback." },
      { t: "p", text: "**The module defining the handler is never imported.** Decorator registration is a side effect of import, so a handler in a module nobody imports does not exist. The tests passed because the test file imported the module directly in order to test it." },
      { t: "p", text: "**Two defences, and you want both.** Import handler modules explicitly in one place — a package `__init__` that names them, or an explicit loader — rather than relying on incidental imports. And make the dispatcher fail loudly on an unknown event type instead of logging a warning, so a missing handler surfaces as an error rather than as silence." },
      { t: "p", text: "The general lesson: **anything that works by import side effect fails silently when the import does not happen.** Every framework built on this pattern — Flask blueprints, pytest `conftest.py`, Django app registries — has explicit machinery to guarantee the imports occur, and that machinery exists because this failure is common enough to design around." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "Functions are ordinary objects: bind them to names, store them in containers, pass and return them, attach attributes to them.",
    "**The parentheses are the whole difference.** `handler = process` registers the function; `handler = process()` registers its return value — usually `None`, failing much later.",
    "`Callable[[ArgTypes], Return]` types a function parameter; a named type alias makes the signature read as a contract.",
    "**A dict of functions replaces a chain of `elif` where each branch does work** — each handler becomes independently testable and the dispatcher stops changing.",
    "Decorator registration puts the key next to the handler, but works **by import side effect** — a module nobody imports contributes nothing, silently.",
    "`functools.partial` beats a lambda for introspection, tracebacks, pickling, and because it **binds argument values immediately** rather than looking them up at call time.",
    "**Strategy is a function in Python.** A single-method interface does not need a class; two or more related behaviours, or real state, does.",
    "Callbacks make control flow invisible and move exception handling to a boundary the caller did not write. One or two is clean design; five should be a class."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A callback registered with `app.on_event(handler())` never fires. Why?",
        options: [
          "The handler must be registered before the app starts",
          "`handler()` calls the function immediately and registers its return value — usually `None` — rather than the function itself",
          "Callbacks must be registered as strings, not objects",
          "The function needs a decorator to be recognised"
        ],
        answer: 1,
        why: "The parentheses call the function at registration time. Since a function with no explicit return gives `None`, the framework stores `None` as the handler — and typically fails much later with `'NoneType' object is not callable`, or simply never fires. Whenever a callback \"does nothing\", check for stray parentheses at the registration site before anything else."
      },
      {
        stem: "Why is `partial(send, channel=\"ops\")` often preferable to `lambda m: send(m, channel=\"ops\")`?",
        options: [
          "`partial` executes faster because it avoids creating a new scope",
          "`partial` is introspectable, appears by name in tracebacks, is pickleable, and binds argument values immediately rather than looking them up at call time",
          "`lambda` cannot accept keyword arguments",
          "`partial` allows the wrapped function to be modified later"
        ],
        answer: 1,
        why: "Four practical advantages. `.func` and `.keywords` are readable, so a debugger shows what it wraps rather than `<lambda>`. It survives pickling, so it works with `multiprocessing`. And it binds values at creation, avoiding the late-binding closure trap where lambdas built in a loop all capture the final value of the loop variable."
      },
      {
        stem: "A webhook handler registered by decorator is silently ignored in production but works in tests. What is the cause?",
        options: [
          "Decorators are stripped when Python runs with optimisations enabled",
          "The module defining the handler is never imported in production — registration is a side effect of import, and the test file imported it directly",
          "The decorator must be applied at class level to persist",
          "Production runs a cached bytecode version without the decorator"
        ],
        answer: 1,
        why: "Decorator registration runs when the module is imported. A handler in a module that production never imports simply does not exist, and the failure is silence rather than an error. Tests passed because importing the module to test it also registered it. This is why every framework using the pattern — Flask, pytest, Django — has explicit machinery to guarantee the imports happen."
      },
      {
        stem: "When should a strategy be a class rather than a function?",
        options: [
          "Whenever the behaviour might change in future",
          "When it has more than one related method, carries substantial state, or must be introspected or serialised by type",
          "Always — classes are more maintainable than functions",
          "Only when it needs to inherit from a base class"
        ],
        answer: 1,
        why: "A single-method interface is exactly what a function is, so wrapping one in a class named `execute` or `apply` adds ceremony without capability. The pressure to use a class comes from real needs: several related behaviours per strategy, meaningful state to hold, or a requirement to name, serialise or introspect the type. Starting with functions and moving to a class when that pressure appears is the right direction."
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
        q: "What does it mean that functions are first-class objects in Python?",
        strong: "A function is an ordinary value: you can bind it to a name, put it in a list or dict, pass it as an argument, return it from another function, and attach attributes to it. That is what makes decorators, callbacks, `key=` arguments and dispatch tables possible without any special language machinery.",
        answer: [
          { t: "p", text: "The definition alone is weak; connect it to something you have built. Dispatch tables are the most concrete: a dict mapping event types to handler functions replaces an ever-growing `elif` chain and makes each branch independently testable." },
          { t: "p", text: "A good second point is that this collapses design patterns. Strategy, Command and most of Template Method are single-method interfaces, and in Python a single-method interface is a function — no class hierarchy required." },
          { t: "p", text: "The practical trap worth mentioning: `handler = process` versus `handler = process()`. Registering the call result instead of the function is a bug that surfaces far from its cause." }
        ]
      },
      {
        level: "core",
        q: "How would you replace a long if/elif chain where each branch does real work?",
        strong: "A dict mapping the key to a handler function. Each branch becomes a named function you can test with a literal input, the dispatcher shrinks to a lookup plus an unknown-key error, and adding a case is a new function rather than an edit to shared code.",
        answer: [
          { t: "p", text: "Naming the benefits in terms of change rather than aesthetics is what makes this persuasive: no merge conflicts between people adding different handlers, and no re-reading the whole chain to add one branch." },
          { t: "p", text: "Decorator-based registration is the natural next step — the key sits next to the handler so the two cannot drift apart. Volunteering its cost shows balance: registration is an import side effect, so a module nobody imports contributes nothing, silently." },
          { t: "p", text: "Worth mentioning that a duplicate-key check in the registration decorator catches two handlers claiming the same event, which a plain dict literal resolves silently in favour of whichever was written last." }
        ]
      },
      {
        level: "advanced",
        q: "When does a callback-based design become hard to maintain?",
        strong: "When control flow stops being readable in one place. A function taking five callbacks has five branches whose bodies live elsewhere, so you cannot tell what it does without opening five files. At that point the protocol should be a class with named methods, where a reader sees the whole thing at once.",
        answer: [
          { t: "p", text: "The second failure mode is the one people forget: exceptions cross a boundary the caller did not write. When a callback raises, the framework decides whether to swallow, log or propagate — and a swallowed callback exception hides real bugs indefinitely." },
          { t: "p", text: "That makes it a documentation obligation. Any API accepting a callback should say what happens when it raises, and any framework you use should be checked for it before you rely on the behaviour." },
          { t: "p", text: "A useful line to offer: one or two callbacks with obvious names is a clean, flexible design; five is a class with methods. The threshold is where a reader can no longer hold the flow in their head." }
        ]
      }
    ]
  }
});
