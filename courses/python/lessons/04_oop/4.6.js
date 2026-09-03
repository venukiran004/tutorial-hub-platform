/* ============================================================================
   LESSON 4.6 — Polymorphism and Duck Typing
   ========================================================================= */
EC.receiveLesson({
  id: "4.6",

  lede: "In most object-oriented languages polymorphism requires a shared base class or interface. In Python it requires **nothing** — an object works wherever its behaviour fits, regardless of what it inherits from. That is enormously freeing, and it removes the compiler's safety net, so the discipline moves from the type system to your protocols and your tests.",

  objectives: [
    "Explain polymorphism without reference to inheritance",
    "Write functions that accept anything with the right behaviour",
    "Use `Protocol` to make duck typing checkable by a type checker",
    "Recognise where duck typing silently does the wrong thing",
    "Choose between duck typing, `Protocol` and an ABC deliberately"
  ],

  prerequisites: ["1.8", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "Behaviour, not ancestry", id: "behaviour" },

    { t: "code", lang: "python", title: "three unrelated classes, one function", code: `
class EmailNotifier:
    def send(self, message: str) -> None:
        print(f"[email] {message}")


class SlackNotifier:                       # no shared base class
    def send(self, message: str) -> None:
        print(f"[slack] {message}")


class RecordingNotifier:                   # a test double, also unrelated
    def __init__(self) -> None:
        self.sent: list[str] = []

    def send(self, message: str) -> None:
        self.sent.append(message)


def alert_all(notifiers, message: str) -> None:
    for notifier in notifiers:
        notifier.send(message)             # only 'send' is required


recorder = RecordingNotifier()
alert_all([EmailNotifier(), SlackNotifier(), recorder], "disk at 95%")
print(recorder.sent)
`,
      out: `[email] disk at 95%
[slack] disk at 95%
['disk at 95%']`,
      caption: "No base class, no interface declaration, no registration. `alert_all` requires one thing — a `send` method — and anything providing it works. The test double is not a subclass of anything; it simply has the right shape."
    },

    { t: "callout", kind: "mental", title: "The substitution question", body: [
      { t: "p", text: "In a nominally-typed language you ask *what does this object inherit from?* In Python you ask **what does this function actually require of its argument?**" },
      { t: "p", text: "That second question is answerable by reading the function body: every attribute accessed and every method called is a requirement. The set of those requirements is the real interface — and it is usually much smaller than a base class would have imposed. `alert_all` needs `send`. Not `connect`, not `close`, not `__init__` — just `send`." },
      { t: "p", text: "This is why Python codebases have shallow hierarchies. The interface is implicit and minimal, so there is rarely pressure to formalise it." }
    ]},

    { t: "h2", n: "02", text: "The dunder protocols are duck typing", id: "protocols" },

    { t: "p", text: "Python's own syntax is built on this. `len(x)`, `for i in x`, `x[k]`, `with x:` and `x + y` do not check types — they call a dunder method, and anything defining it participates." },

    { t: "table",
      head: ["Syntax", "Calls", "Anything defining it works with"],
      rows: [
        ["`len(x)`", "`__len__`", "`len()`, and truthiness when `__bool__` is absent"],
        ["`for i in x`", "`__iter__`", "`for`, comprehensions, `sum`, `zip`, unpacking"],
        ["`x[k]`", "`__getitem__`", "Subscripting, and slicing"],
        ["`k in x`", "`__contains__`", "`in`, `not in`"],
        ["`with x:`", "`__enter__` / `__exit__`", "`with` statements (Lesson 5.8)"],
        ["`x + y`", "`__add__`", "`+`, and `sum()` with a start value"],
        ["`x()`", "`__call__`", "Anywhere a function is expected"]
      ],
      caption: "This is the deepest form of polymorphism in Python: your class can participate in the language's own syntax by implementing the right method. Lesson 4.9 covers writing them."
    },

    { t: "code", lang: "python", title: "a class that behaves like a built-in", code: `
from collections.abc import Iterator


class OrderBatch:
    def __init__(self, orders: list[Order]) -> None:
        self._orders = orders

    def __len__(self) -> int:
        return len(self._orders)

    def __iter__(self) -> Iterator[Order]:
        return iter(self._orders)

    def __contains__(self, order_id: str) -> bool:
        return any(o.id == order_id for o in self._orders)


batch = OrderBatch([...])

len(batch)                      # works
for order in batch: ...         # works
"o-1" in batch                  # works
if batch: ...                   # works -- falls back to __len__
list(batch), sum(o.total for o in batch)
`,
      caption: "Three methods, and the object now works with every built-in and every function that accepts a collection. Nothing was inherited and nothing was registered."
    },

    { t: "h2", n: "03", text: "Making it checkable with Protocol", id: "protocol" },

    { t: "p", text: "Duck typing's weakness is that the contract is invisible: `alert_all(notifiers, ...)` does not say what a notifier is, so a wrong object fails at the call, at runtime, possibly in production. `Protocol` fixes that without giving up the freedom." },

    { t: "code", lang: "python", title: "structural typing", code: `
from typing import Protocol, runtime_checkable


class Notifier(Protocol):
    """The contract. Nothing needs to inherit from this."""

    def send(self, message: str) -> None: ...


def alert_all(notifiers: list[Notifier], message: str) -> None:
    for notifier in notifiers:
        notifier.send(message)


# EmailNotifier, SlackNotifier and RecordingNotifier all satisfy this
# WITHOUT inheriting from it. mypy checks the shape, not the ancestry.
alert_all([EmailNotifier(), RecordingNotifier()], "ok")

# A wrong object is now an error at edit time, not at runtime:
class Broken:
    def notify(self, msg: str) -> None: ...      # wrong method name

# alert_all([Broken()], "x")
#   error: Argument 1 has incompatible type "list[Broken]";
#          expected "list[Notifier]"
`,
      caption: "This is **structural typing**: mypy verifies the shape matches. The classes stay independent — no import of `Notifier`, no inheritance, no coupling — and a test double satisfies the protocol simply by having the right method."
    },

    { t: "callout", kind: "good", title: "Why Protocol beats a base class here", body: [
      { t: "ul", items: [
        "**No coupling.** `EmailNotifier` does not import or know about `Notifier`. You can write a protocol for a third-party class you cannot modify.",
        "**Retrofittable.** Define the protocol after the classes exist, describing what your code already requires.",
        "**Minimal.** A protocol declares only what the consumer needs, so different consumers can require different subsets of the same object.",
        "**Test doubles are free.** A fake satisfies the protocol by shape; no inheritance and no `Mock` needed (Lesson 4.1's exercise)."
      ]},
      { t: "p", text: "`@runtime_checkable` allows `isinstance(x, Notifier)`, but it only checks that the *methods exist* — not their signatures. Treat it as a coarse guard, not verification." }
    ]},

    { t: "h2", n: "04", text: "Where duck typing silently misfires", id: "misfires" },

    { t: "callout", kind: "trap", title: "The string case, again", body: [
      { t: "code", lang: "python", title: "quacks like an iterable, means something else", numbered: false, code: `
def notify_all(recipients) -> None:
    for r in recipients:
        send(r)


notify_all(["a@x.com", "b@x.com"])     # 2 messages
notify_all("a@x.com")                  # 9 messages, one per character`},
      { t: "p", text: "No error, because `str` genuinely is iterable — it just iterates the wrong granularity. This is the canonical failure of duck typing: **the object has the right shape and the wrong meaning.** It appeared in Lesson 1.8 and it is worth meeting twice, because it is the single most common instance." },
      { t: "p", text: "**The defences, in order:** a `list[str]` type hint so mypy catches it; an explicit `isinstance(recipients, str)` guard at any public boundary; and a signature that takes `*recipients` so a single string cannot be mistaken for a collection." }
    ]},

    { t: "code", lang: "python", title: "three more shapes that lie", code: `
# 1. A Mock satisfies EVERY protocol -- it grows any attribute you touch
from unittest.mock import Mock
m = Mock()
m.send("hi")           # works. So does m.anything_at_all()
                       # A test using a bare Mock verifies nothing about shape.

# 2. dict and list both support x[k], with different meanings
def first(container):
    return container[0]

first([10, 20])        # 10  -- the first element
first({0: "a"})        # "a" -- the value at key 0. Not the same idea.

# 3. Numeric protocols overlap across incompatible domains
from datetime import timedelta
def double(x):
    return x + x

double(3)              # 6
double("ab")           # "abab" -- concatenation, not arithmetic
double(timedelta(1))   # 2 days -- fine, but a different meaning again
`,
      caption: "Each of these has the required method and the wrong semantics. Duck typing checks that a call will succeed, never that it will mean what you intended — which is exactly what a `Protocol` hint plus mypy restores."
    },

    { t: "h2", n: "05", text: "Choosing your mechanism", id: "choosing" },

    { t: "table",
      head: ["Use", "When", "Cost"],
      rows: [
        ["**Bare duck typing**", "Internal code, small blast radius, the requirement is obvious from the body", "Contract is invisible; wrong object fails at runtime"],
        ["**`Protocol`**", "The default for a real interface. Consumer declares what it needs; providers stay independent", "Needs a type checker in CI to be worth anything"],
        ["**ABC**", "You want to *share implementation* as well as require methods, or need runtime enforcement at instantiation", "Providers must inherit — real coupling (Lesson 4.8)"],
        ["**`isinstance` guard**", "A trust boundary, or the `str` case where the shape is right and the meaning is wrong", "Rejects valid inputs if written against a concrete type"]
      ],
      caption: "The progression is: start with duck typing, add a `Protocol` when the interface crosses a module boundary, reach for an ABC only when shared implementation or instantiation-time enforcement is genuinely needed."
    },

    { t: "ladder",
      title: "A payment processor accepting several gateways",
      rungs: [
        { level: "bad", label: "isinstance on concrete types", why: "closed to extension",
          code: `def charge(gateway, amount: Decimal) -> str:
    if isinstance(gateway, StripeGateway):
        return gateway.create_charge(amount)
    elif isinstance(gateway, PayPalGateway):
        return gateway.do_payment(amount)
    raise TypeError(f"unsupported gateway: {type(gateway)}")`,
          note: "Every new gateway edits this function, and a test double must subclass a real gateway to get past the check. The differing method names are the real problem: there is no shared interface, so the caller is compensating with a type switch." },

        { level: "ok", label: "Duck typing on a common method", why: "open, but the contract is invisible",
          code: `def charge(gateway, amount: Decimal) -> str:
    return gateway.charge(amount)`,
          note: "Any object with `charge` now works, including a two-line fake. The weakness is that the signature says nothing — a reader cannot tell what `gateway` must provide without reading the body, and passing the wrong object fails at runtime." },

        { level: "best", label: "Protocol", why: "open, checked, and uncoupled",
          code: `from typing import Protocol


class PaymentGateway(Protocol):
    """What this module requires of a gateway. Nothing inherits from it."""

    def charge(self, amount: Decimal) -> str:
        """Charge the amount. Returns a transaction id.

        Raises:
            PaymentDeclined: the gateway refused the charge.
        """
        ...


def charge(gateway: PaymentGateway, amount: Decimal) -> str:
    return gateway.charge(amount)


class FakeGateway:
    """Satisfies PaymentGateway by shape. No import, no inheritance."""

    def __init__(self) -> None:
        self.charges: list[Decimal] = []

    def charge(self, amount: Decimal) -> str:
        self.charges.append(amount)
        return f"fake-{len(self.charges)}"`,
          note: "The signature now documents the contract, mypy rejects a wrong object before the code runs, and the vendor SDK classes satisfy it without knowing this module exists. The protocol's docstring carries what a type cannot — that `charge` may raise `PaymentDeclined` — which is the part callers most need." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Replace a type switch with a protocol",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The exporter below dispatches on concrete types, so adding a format means editing shared code and every test needs a real exporter subclass. Convert it to a protocol — and handle the one input where duck typing would silently do the wrong thing." }
      ],
      requirements: [
        "Define a `Protocol` describing exactly what the function requires — no more.",
        "Remove the `isinstance` chain entirely; new formats must need no edit to the dispatcher.",
        "Write a fake that satisfies the protocol without importing or inheriting from it.",
        "Handle the case where a single string is passed where a collection of rows is expected — explain why duck typing does not catch it.",
        "Document in the protocol what the type cannot express.",
        "Write a test proving the fake works and one proving the string case is rejected."
      ],
      hint: "For the string case, the shape is correct — `str` is iterable — so no type check on iterability will help. You need an explicit guard, plus a hint precise enough for mypy.",
      solution: {
        lang: "python",
        title: "export.py",
        code: `# ---- the original ------------------------------------------------------

def export(writer, rows):
    if isinstance(writer, CsvWriter):
        return writer.write_csv(rows)
    elif isinstance(writer, JsonWriter):
        return writer.dump(rows)
    elif isinstance(writer, ParquetWriter):
        return writer.save(rows)
    raise TypeError(f"unsupported writer: {type(writer)}")
#
# Adding a format edits this function. Tests must subclass a real
# writer. And the three method names differ, which is the tell: there
# is no shared interface, so the caller compensates with a type switch.


# ---- the redesign ------------------------------------------------------

from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Protocol


class RowWriter(Protocol):
    """What export() requires of a writer. Nothing inherits from this.

    The docstring carries what the signature cannot: the contract for
    partial failure. A writer that raises after writing some rows must
    leave the destination in a state the caller can recover from --
    either fully written or untouched.
    """

    def write(self, rows: Sequence[Sequence[object]]) -> int:
        """Write the rows. Returns the number written.

        Raises:
            OSError: the destination could not be written.
        """
        ...


def export(
    writer: RowWriter,
    rows: Sequence[Sequence[object]],
) -> int:
    """Write rows through the writer and return the count.

    rows is a Sequence of Sequences -- Sequence rather than Iterable
    because we check its length, and because Iterable would accept a
    generator that the writer could only consume once.
    """
    # str is iterable and IS a Sequence, so no structural check catches
    # this. The shape is right and the meaning is wrong: iterating a
    # string yields characters, so a caller passing one row as a string
    # would silently export one column per character.
    if isinstance(rows, (str, bytes)):
        raise TypeError(
            f"rows must be a sequence of rows, got a single {type(rows).__name__}. "
            f"Did you mean [{rows!r}]?"
        )

    return writer.write(rows)


# ---- real writers: independent, no import of RowWriter -----------------

class CsvWriter:
    def __init__(self, path: Path, sep: str = ",") -> None:
        self.path, self.sep = path, sep

    def write(self, rows: Sequence[Sequence[object]]) -> int:
        text = "\\n".join(self.sep.join(str(c) for c in r) for r in rows)
        self.path.write_text(text, encoding="utf-8")
        return len(rows)


class JsonWriter:
    def __init__(self, path: Path) -> None:
        self.path = path

    def write(self, rows: Sequence[Sequence[object]]) -> int:
        self.path.write_text(json.dumps([list(r) for r in rows]),
                             encoding="utf-8")
        return len(rows)


# ---- the fake: satisfies the protocol by shape alone -------------------

class RecordingWriter:
    """No import of RowWriter, no inheritance. Just the right method."""

    def __init__(self) -> None:
        self.written: list[Sequence[object]] = []

    def write(self, rows: Sequence[Sequence[object]]) -> int:
        self.written.extend(rows)
        return len(rows)


# ---- tests -------------------------------------------------------------

def test_fake_satisfies_the_protocol() -> None:
    writer = RecordingWriter()
    count = export(writer, [("a", 1), ("b", 2)])

    assert count == 2
    assert writer.written == [("a", 1), ("b", 2)]


def test_single_string_is_rejected() -> None:
    """The case duck typing cannot catch.

    "hello" is a Sequence of Sequences as far as structure goes -- each
    character is itself a one-character string. Every structural check
    passes, and the export would silently produce five single-character
    rows.
    """
    writer = RecordingWriter()
    try:
        export(writer, "hello")
    except TypeError as exc:
        assert "single str" in str(exc)
        assert writer.written == []          # nothing was written
    else:
        raise AssertionError("expected TypeError for a bare string")


def test_adding_a_format_needs_no_dispatcher_change() -> None:
    class XmlWriter:                          # brand new, defined here
        def __init__(self) -> None:
            self.out = ""

        def write(self, rows: Sequence[Sequence[object]]) -> int:
            self.out = "".join(f"<row>{r}</row>" for r in rows)
            return len(rows)

    assert export(XmlWriter(), [("a",)]) == 1


if __name__ == "__main__":
    test_fake_satisfies_the_protocol()
    test_single_string_is_rejected()
    test_adding_a_format_needs_no_dispatcher_change()
    print("protocol satisfied structurally; string case guarded")`,
        notes: [
          { t: "p", text: "**Renaming the three methods to one `write` was the real fix.** The `isinstance` chain existed because `write_csv`, `dump` and `save` had nothing in common — the type switch was compensating for the absence of an interface. Once they share a name, the dispatcher becomes one line." },
          { t: "p", text: "**The string guard cannot be replaced by a better type hint alone.** `\"hello\"` genuinely is a `Sequence[Sequence[object]]` — each character is a one-character string — so it satisfies the structure perfectly. mypy will reject a literal `str` at a call site, but a `str` arriving from JSON at runtime passes every structural check. This is the one place an explicit `isinstance` earns its keep." },
          { t: "p", text: "**The error message suggests the fix.** `Did you mean ['hello']?` turns a confusing rejection into a one-second correction, and costs one f-string. Error messages that name the likely mistake are worth the extra line." },
          { t: "callout", kind: "insight", title: "What the protocol's docstring carries", body: [
            { t: "p", text: "`def write(...) -> int` says the shape. It cannot say that a writer failing partway must leave the destination recoverable, or that `OSError` is the expected failure. Those are the parts a caller most needs and no type expresses." },
            { t: "p", text: "That is the general rule for protocols: **the signature is the checkable half of the contract, and the docstring is the half that matters when things go wrong.** A protocol with no docstring is only half an interface." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team replaces a real cache with `Mock()` in a test suite. Every test passes. In production the cache integration fails immediately — the code calls `cache.get_many(keys)` and the real client has no such method." },
      { t: "p", text: "**A `Mock` satisfies every protocol.** It grows any attribute you touch and returns another `Mock`, so `cache.get_many(...)`, `cache.anything()` and `cache.typo_here()` all succeed. The test verified that the code runs, not that it runs against a real interface." },
      { t: "p", text: "**Two fixes, and you want the first.** Write a small hand-rolled fake that implements only the real methods — it is usually ten lines, it fails when the code calls something that does not exist, and it satisfies your `Protocol` structurally so mypy checks it too. Where a `Mock` is genuinely convenient, use `autospec=True` or `create_autospec`, which builds the mock from the real class's signature and rejects unknown attributes." },
      { t: "p", text: "The general point: **duck typing means your tests define what \"correct shape\" means.** A test double that accepts everything tests nothing about shape, and the type checker cannot help you because a `Mock` is typed as `Any`." }
    ]}
  ],

  takeaways: [
    "**Polymorphism in Python requires no shared ancestry** — an object works wherever its behaviour fits. The real interface is whatever the function body actually uses, and that is usually far smaller than a base class would impose.",
    "Python's own syntax is duck typing: `len`, `for`, `in`, `with`, `+` and `()` dispatch to dunder methods, so any class implementing them participates in the language.",
    "**`Protocol` makes duck typing checkable** without coupling: the consumer declares what it needs, providers satisfy it structurally, and mypy verifies the shape.",
    "A protocol can be written **after** the classes exist, and for third-party classes you cannot modify.",
    "`@runtime_checkable` only checks that methods *exist*, not their signatures — a coarse guard, not verification.",
    "**Duck typing checks that a call will succeed, never that it will mean what you intended.** `str` is the canonical failure: right shape, wrong granularity, no error.",
    "An explicit `isinstance` guard earns its place at trust boundaries and for the `str` case, where no structural check can help.",
    "Progression: **bare duck typing internally → `Protocol` at module boundaries → ABC only when sharing implementation or enforcing at instantiation.**",
    "**A `Mock` satisfies every protocol**, so a test using one verifies nothing about shape. Prefer a small hand-written fake, or `create_autospec`.",
    "A protocol's signature is the checkable half of the contract; its docstring carries the half that matters when things fail."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function iterates `recipients` and calls `send(r)` on each. A caller passes a single email string. What happens?",
        options: [
          "`TypeError`, because a string is not a list of recipients",
          "It sends one message per character, silently — `str` is iterable, so the shape is right and the meaning is wrong",
          "It sends one message, treating the string as a single recipient",
          "It raises `ValueError` on the first character"
        ],
        answer: 1,
        why: "This is the canonical duck-typing failure. `str` genuinely satisfies the iterable protocol, so nothing raises — iteration just yields characters instead of recipients. No structural check helps, because the structure is correct. The defences are a `list[str]` hint so mypy catches literal cases, an explicit `isinstance(x, str)` guard at public boundaries, and a `*recipients` signature that makes a bare string impossible to pass."
      },
      {
        stem: "What is the main advantage of `Protocol` over an abstract base class for defining an interface?",
        options: [
          "Protocols are checked at runtime, ABCs only at type-check time",
          "Providers satisfy a protocol structurally — no inheritance, no import — so third-party and existing classes conform without modification",
          "Protocols can define concrete method implementations that ABCs cannot",
          "Protocols are faster because they skip the MRO"
        ],
        answer: 1,
        why: "The decoupling is the point. An ABC requires providers to inherit from it, which means importing it and accepting real coupling — impossible for a vendor SDK class. A protocol is declared by the *consumer* describing what it needs, can be written after the classes exist, and lets a ten-line test fake conform by shape alone. ABCs, by contrast, can share implementation and enforce at instantiation, which protocols cannot."
      },
      {
        stem: "A test suite passes using `Mock()` for a cache, but production fails on a method the real client lacks. Why did the test not catch it?",
        options: [
          "The mock was not configured with the right return values",
          "A `Mock` grows any attribute you access, so every method call succeeds — the test verified the code runs, not that it runs against a real interface",
          "Mocks only work with classes that inherit from a common base",
          "The test ran against a cached bytecode version of the mock"
        ],
        answer: 1,
        why: "`Mock` satisfies every protocol by construction: touching any attribute creates it and returns another `Mock`. So a typo or a method that does not exist on the real class passes silently. It is also typed as `Any`, so the type checker cannot help either. A small hand-written fake fails loudly on an unknown method, and `create_autospec` builds the mock from the real class's signature."
      },
      {
        stem: "When does an explicit `isinstance` check belong in otherwise duck-typed code?",
        options: [
          "At the top of every public function, for safety",
          "At trust boundaries, and where an object has the right shape but the wrong meaning — the `str`-as-iterable case",
          "Whenever the function has more than one caller",
          "Never — `isinstance` defeats the purpose of duck typing"
        ],
        answer: 1,
        why: "Blanket checks reject valid inputs and add no protection against the errors that actually occur. The two justified cases are narrow: untrusted data arriving from outside, where failing early with a precise message beats failing deep inside; and the situation where the structure is genuinely correct but means something else, which no structural check can detect. `str` is the archetype of the second."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is duck typing?",
        strong: "An object is usable wherever its behaviour fits, regardless of what it inherits from. Python does not check ancestry — it calls the method and succeeds if the object has it. The real interface a function requires is whatever its body actually uses, which is usually far smaller than a base class would impose.",
        answer: [
          { t: "p", text: "Connecting it to the language itself makes the answer concrete: `len`, `for`, `in` and `with` are all duck typing — they dispatch to dunder methods, so any class implementing `__len__` or `__iter__` participates in the syntax with no inheritance." },
          { t: "p", text: "The trade-off is what the interviewer is really probing: the contract is invisible, so a wrong object fails at runtime rather than at compile time. `Protocol` is the modern answer — it makes the shape checkable without coupling providers to a base class." },
          { t: "p", text: "Volunteering the failure mode shows balance. `str` satisfies the iterable protocol and means something entirely different, so a function expecting a list of recipients silently iterates characters. Right shape, wrong meaning, no error." }
        ]
      },
      {
        level: "core",
        q: "When would you use Protocol instead of an abstract base class?",
        strong: "Almost always, for a consumer-facing interface. A protocol is declared by the code that needs it, and providers satisfy it structurally — no inheritance, no import, so third-party classes and small test fakes conform without modification. An ABC is for when you want to share implementation or enforce at instantiation.",
        answer: [
          { t: "p", text: "The decoupling argument is the strongest one: you can write a protocol for a vendor SDK class you cannot modify, and retrofit one onto code that already exists by describing what it already requires." },
          { t: "p", text: "A detail worth adding: because the protocol belongs to the consumer, different consumers can require different subsets of the same object. A base class forces one interface on everyone." },
          { t: "p", text: "Being fair about ABCs keeps it credible — they genuinely earn their place when there is shared implementation to inherit, or when you want instantiation of an incomplete subclass to fail immediately." }
        ]
      },
      {
        level: "advanced",
        q: "Your tests pass with mocks but the integration fails. What went wrong?",
        strong: "A `Mock` satisfies every protocol — it grows any attribute you touch — so the tests verified that the code runs, not that it runs against a real interface. A typo or a method the real class lacks passes silently, and the type checker cannot help because `Mock` is typed as `Any`.",
        answer: [
          { t: "p", text: "The framing that lands: in a duck-typed language, your test doubles are what define \"correct shape\". A double that accepts everything defines nothing." },
          { t: "p", text: "The fix worth leading with is a small hand-written fake — usually ten lines, fails loudly on an unknown method, and satisfies your `Protocol` structurally so mypy checks it too. `create_autospec` is the answer when a real mock is genuinely more convenient." },
          { t: "p", text: "The deeper point, if there is room: this is the cost Python trades for its flexibility. Without a compiler enforcing interfaces, the enforcement has to live in your protocols and your test doubles — and a suite full of bare `Mock`s has quietly opted out of both." }
        ],
        weak: "Concluding that mocks should never be used. They are the right tool for isolating slow or non-deterministic collaborators; the problem is a mock with no specification, not mocking as such."
      }
    ]
  }
});
