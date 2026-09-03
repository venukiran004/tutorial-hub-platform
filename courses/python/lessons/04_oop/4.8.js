/* ============================================================================
   LESSON 4.8 — Abstraction and Abstract Base Classes
   ========================================================================= */
EC.receiveLesson({
  id: "4.8",

  lede: "An ABC does two things a `Protocol` cannot: it **refuses to instantiate an incomplete subclass**, and it can **carry shared implementation**. Everything else people reach for ABCs to do — declaring an interface, enabling substitution, satisfying a type checker — a `Protocol` does with less coupling. Knowing which of the two you actually need is the whole lesson.",

  objectives: [
    "Explain what `abstractmethod` enforces and exactly when it fires",
    "Choose between an ABC, a `Protocol` and plain duck typing on the real criteria",
    "Use the template method pattern where shared implementation genuinely exists",
    "Register virtual subclasses, and know why that is usually a mistake",
    "Recognise the abstract base class that should have been a function"
  ],

  prerequisites: ["4.5", "4.6"],

  blocks: [

    { t: "h2", n: "01", text: "What an ABC enforces", id: "enforcement" },

    { t: "code", lang: "python", title: "instantiation fails, not definition", code: `
from abc import ABC, abstractmethod


class Exporter(ABC):
    @abstractmethod
    def export(self, rows: list[dict]) -> bytes:
        """Serialise rows. Subclasses must implement this."""


class CsvExporter(Exporter):
    def export(self, rows: list[dict]) -> bytes:
        return b"csv"


class BrokenExporter(Exporter):
    pass                              # defining this is FINE


print(CsvExporter().export([]))
BrokenExporter()
`,
      out: `b'csv'
TypeError: Can't instantiate abstract class BrokenExporter
without an implementation for abstract method 'export'`,
      caption: "The class definition succeeds; only instantiation fails. That is later than a compiler would catch it and much earlier than the first call — and the message names the missing method, which is what makes it useful."
    },

    { t: "callout", kind: "insight", title: "How it works, and what that implies", body: [
      { t: "p", text: "`abstractmethod` sets `__isabstractmethod__ = True` on the function. `ABCMeta` collects those names into `__abstractmethods__`, and `object.__new__` refuses to allocate an instance while that set is non-empty." },
      { t: "code", lang: "python", title: "the machinery is visible", numbered: false, code: `
print(BrokenExporter.__abstractmethods__)
print(CsvExporter.__abstractmethods__)
print(Exporter.export.__isabstractmethod__)`,
        out: `frozenset({'export'})
frozenset()
True`},
      { t: "p", text: "Two consequences follow. It is **runtime enforcement**, so an unused abstract subclass sitting in a module is never caught. And it only checks that the name **exists** — a subclass defining `export` with a completely different signature satisfies the ABC and fails at the call site. Only a type checker catches that." }
    ]},

    { t: "h2", n: "02", text: "ABC or Protocol", id: "abc-or-protocol" },

    { t: "table",
      head: ["", "ABC", "Protocol"],
      rows: [
        ["Providers must inherit", "**Yes** — real coupling, and impossible for third-party classes", "No — satisfied structurally"],
        ["Refuses to instantiate if incomplete", "**Yes**, at runtime", "No"],
        ["Can carry shared implementation", "**Yes** — concrete methods and state", "Only trivially (default method bodies, no state)"],
        ["Declared by", "The **provider** hierarchy", "The **consumer** that needs it"],
        ["Works on classes you cannot modify", "Only via `register()` — see below", "Yes"],
        ["Checked by mypy", "Yes", "Yes"],
        ["`isinstance` works", "Yes", "Only with `@runtime_checkable`, and it checks names only"]
      ],
      caption: "Only the two bold rows are things a `Protocol` cannot do. If you need neither, a `Protocol` is the better default — it gives you the type checking without the inheritance requirement."
    },

    { t: "callout", kind: "good", title: "The decision, in one question", body: [
      { t: "p", text: "**Do I have shared implementation to hand down, or do I need instantiation to fail on an incomplete subclass?**" },
      { t: "ul", items: [
        "**Neither** → `Protocol`. This is most interfaces. Providers stay independent, test fakes conform by shape, and third-party classes work unmodified.",
        "**Shared implementation** → ABC. A template method with concrete steps genuinely wants inheritance (below).",
        "**Instantiation-time enforcement** → ABC. Worth it when subclasses are written by other teams and a missing method should fail loudly at construction rather than in production.",
        "**Both** → ABC, obviously."
      ]},
      { t: "p", text: "A common middle ground in libraries: define a `Protocol` for consumers to type against, **and** an ABC providing a convenient base with shared implementation. Users may inherit the base or satisfy the protocol independently." }
    ]},

    { t: "h2", n: "03", text: "Template method: where an ABC earns it", id: "template-method" },

    { t: "p", text: "The one pattern that genuinely needs an ABC is a fixed algorithm with variable steps. The base class owns the sequence — including the parts that must always happen — and subclasses fill in the pieces." },

    { t: "code", lang: "python", title: "the skeleton owns the invariants", code: `
from abc import ABC, abstractmethod
from collections.abc import Iterator
import logging

logger = logging.getLogger(__name__)


class BatchJob(ABC):
    """Runs a batch in a fixed sequence with guaranteed cleanup.

    Subclasses supply the three variable steps. They cannot skip
    validation, forget to close resources, or omit the metrics --
    because those live here, in the sequence, not in the subclass.
    """

    def run(self) -> int:
        """The template. Deliberately NOT abstract and not overridden."""
        logger.info("%s starting", type(self).__name__)
        processed = 0
        try:
            for record in self.fetch():
                if not self.validate(record):
                    logger.warning("%s skipped %r", type(self).__name__, record)
                    continue
                self.process(record)
                processed += 1
            return processed
        finally:
            # Runs even if a step raises -- the invariant subclasses
            # cannot break because they never see this line.
            self.cleanup()
            logger.info("%s finished, %d processed", type(self).__name__, processed)

    @abstractmethod
    def fetch(self) -> Iterator[dict]:
        """Yield records to process."""

    @abstractmethod
    def process(self, record: dict) -> None:
        """Handle one record."""

    # Not abstract: a sensible default subclasses may override.
    def validate(self, record: dict) -> bool:
        return bool(record)

    def cleanup(self) -> None:
        """Release resources. Default is a no-op."""


class InvoiceJob(BatchJob):
    def __init__(self, db: Database) -> None:
        self._db = db
        self._cursor = None

    def fetch(self) -> Iterator[dict]:
        self._cursor = self._db.cursor()
        yield from self._cursor.execute("SELECT * FROM invoices WHERE unpaid")

    def process(self, record: dict) -> None:
        send_reminder(record["email"])

    def cleanup(self) -> None:
        if self._cursor is not None:
            self._cursor.close()
`,
      caption: "`run` is the reason this is an ABC rather than a protocol. It holds real shared code — the try/finally, the logging, the skip handling — and it guarantees cleanup runs even when `process` raises. A protocol could declare the three methods and could not enforce the sequence."
    },

    { t: "callout", kind: "tradeoff", title: "The template method's cost", body: [
      { t: "p", text: "It inverts control: the base calls the subclass, not the other way round. That is powerful and it makes the flow harder to follow — reading `InvoiceJob` alone does not tell you when `cleanup` runs or that skipped records are logged." },
      { t: "p", text: "**The composition alternative** passes the variable steps as callables instead:" },
      { t: "code", lang: "python", title: "same guarantees, no inheritance", numbered: false, code: `
def run_batch(
    fetch: Callable[[], Iterator[dict]],
    process: Callable[[dict], None],
    *,
    validate: Callable[[dict], bool] = bool,
    cleanup: Callable[[], None] = lambda: None,
) -> int:
    ...`},
      { t: "p", text: "This keeps the guaranteed sequence and removes the hierarchy — and it is better when there are two or three steps. The ABC wins when there are **many** steps with sensible defaults, because a function with eight callable parameters is worse than a class with eight overridable methods (Lesson 3.4)." }
    ]},

    { t: "h2", n: "04", text: "The standard library's ABCs", id: "stdlib-abcs" },

    { t: "code", lang: "python", title: "inherit and get the rest for free", code: `
from collections.abc import Mapping, Sequence


class ReadOnlyConfig(Mapping):
    """Implement three methods, receive a full Mapping interface."""

    def __init__(self, data: dict) -> None:
        self._data = dict(data)

    def __getitem__(self, key: str):
        return self._data[key]

    def __iter__(self):
        return iter(self._data)

    def __len__(self) -> int:
        return len(self._data)


config = ReadOnlyConfig({"host": "localhost", "port": 8080})

# All of these come from Mapping, implemented in terms of the three above
print(config["host"], "port" in config, config.get("missing", "-"))
print(list(config.keys()), list(config.items()))
print(config == {"host": "localhost", "port": 8080})
`,
      out: `localhost True -
['host', 'port'] [('host', 'localhost'), ('port', 8080)]
True`,
      caption: "This is the ABC case at its strongest: three abstract methods, and `keys`, `values`, `items`, `get`, `__contains__` and `__eq__` arrive as concrete mixin methods. `collections.abc` is worth knowing precisely because it saves this much."
    },

    { t: "callout", kind: "insight", title: "`collections.abc` also gives you correct `isinstance`", body: [
      { t: "code", lang: "python", title: "test capability, not concrete type", numbered: false, code: `
from collections.abc import Iterable, Sequence, Mapping

isinstance([1, 2], Sequence)        # True
isinstance("abc", Sequence)         # True -- str really is one
isinstance({"a": 1}, Mapping)       # True
isinstance((x for x in []), Iterable)   # True, and not a Sequence

# The useful distinction Lesson 4.6 needed:
def needs_rows(rows):
    if isinstance(rows, (str, bytes)):        # right shape, wrong meaning
        raise TypeError("expected rows, got a single string")
    if not isinstance(rows, Sequence):
        raise TypeError(f"expected a sequence, got {type(rows).__name__}")`},
      { t: "p", text: "Checking against `Sequence` or `Mapping` rather than `list` or `dict` accepts anything with the right capability — including your own classes and third-party ones — which is the point Lesson 4.6 made about avoiding concrete-type checks." }
    ]},

    { t: "h2", n: "05", text: "register(), and why to avoid it", id: "register" },

    { t: "code", lang: "python", title: "virtual subclassing", code: `
from abc import ABC, abstractmethod


class Serialiser(ABC):
    @abstractmethod
    def dumps(self, obj: object) -> str: ...


import json

Serialiser.register(json)          # a MODULE, registered as a subclass

print(issubclass(json, Serialiser))
print(isinstance(json, Serialiser))
`,
      out: `True
True`,
      caption: "`register` makes `isinstance` and `issubclass` return `True` without any inheritance — and without any check that the required methods exist. It is how `list` is recognised as a `Sequence` despite not inheriting from it."
    },

    { t: "callout", kind: "trap", title: "register() checks nothing", body: [
      { t: "code", lang: "python", title: "a lie the type system will repeat", numbered: false, code: `
class NotASerialiser:
    pass                          # no dumps method at all


Serialiser.register(NotASerialiser)

print(issubclass(NotASerialiser, Serialiser))    # True. It is not.
NotASerialiser().dumps({})                        # AttributeError`,
        out: `True
AttributeError: 'NotASerialiser' object has no attribute 'dumps'`},
      { t: "p", text: "Registration is an unchecked assertion. It gives up the one thing an ABC provides over a protocol — enforcement — while keeping the ceremony. It also does not inherit any concrete mixin methods, so a registered class gets none of the `Mapping` conveniences from the previous section." },
      { t: "p", text: "**If you are reaching for `register`, you wanted a `Protocol`.** A protocol checks the shape statically, requires no registration call, and works on classes you do not control. The legitimate uses of `register` are in the standard library and in libraries retrofitting ABCs onto types that predate them." }
    ]},

    { t: "h2", n: "06", text: "The ABC that should be a function", id: "over-abstraction" },

    { t: "code", lang: "python", title: "abstraction with nothing to abstract", code: `
# Three classes, one method each, one implementation each.
class TaxCalculator(ABC):
    @abstractmethod
    def calculate(self, amount: Decimal) -> Decimal: ...


class UkTaxCalculator(TaxCalculator):
    def calculate(self, amount: Decimal) -> Decimal:
        return amount * Decimal("0.20")


class UsTaxCalculator(TaxCalculator):
    def calculate(self, amount: Decimal) -> Decimal:
        return amount * Decimal("0.07")


# What it actually is: data.
TAX_RATES: dict[str, Decimal] = {
    "uk": Decimal("0.20"),
    "us": Decimal("0.07"),
}


def calculate_tax(amount: Decimal, region: str) -> Decimal:
    return amount * TAX_RATES[region]
`,
      caption: "Twelve lines and a hierarchy replaced by a dict and a function. The hierarchy carried no shared implementation and no invariant — each subclass was one expression, and the varying part was a *number*. This is the Lesson 3.4 point: a single-method interface is a function, and single-method interfaces whose implementations differ only by a constant are data."
    },

    { t: "callout", kind: "warn", title: "Three signals of over-abstraction", body: [
      { t: "ul", items: [
        "**One abstract method, and every implementation is one expression.** That is a function, or a lookup table.",
        "**Exactly one concrete subclass, and no second one planned.** The abstraction has no variation to absorb; delete it and inline.",
        "**The base class has no concrete methods.** An ABC with only abstract methods and no shared implementation is a `Protocol` that also demands inheritance."
      ]},
      { t: "p", text: "The cost is not the lines — it is that every reader must open two files to understand one behaviour, and every new implementation must inherit from something. Abstraction is worth paying for when it absorbs real variation; when it absorbs none, it is indirection." }
    ]},

    { t: "h2", n: "07", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Decide the mechanism three times",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Three interfaces from one codebase. Each currently uses an ABC. For each, decide whether it should stay an ABC, become a `Protocol`, or be deleted entirely — and implement your decision." },
        { t: "p", text: "Getting all three right requires applying the same question — shared implementation, or instantiation-time enforcement? — and being willing to reach a different answer each time." }
      ],
      requirements: [
        "**A.** `Repository` — abstract `get`, `save`, `delete`. Two implementations: Postgres and an in-memory test double. No shared code.",
        "**B.** `ImportPipeline` — abstract `read`, `transform`, `write`, plus a concrete `run()` that wraps them in a transaction with guaranteed rollback and metrics.",
        "**C.** `IdGenerator` — one abstract `generate() -> str`, two implementations that each return one expression.",
        "For each: state the decision, the reason, and implement it.",
        "For the one that stays an ABC, prove that instantiating an incomplete subclass fails.",
        "For the one that becomes a Protocol, write a fake that conforms without importing it.",
        "Explain what the ABC was buying in each case and what you gave up."
      ],
      hint: "Ask only two things of each: is there shared implementation the base hands down, and does an incomplete subclass need to fail at construction? A no to both means a Protocol or nothing.",
      solution: {
        lang: "python",
        title: "three_decisions.py",
        code: `"""Three interfaces, three different right answers."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Protocol


# =========================================================================
# A. Repository  ->  PROTOCOL
# =========================================================================
#
# Shared implementation?  No -- Postgres and in-memory share nothing.
# Instantiation enforcement?  No -- both implementations are ours and
#   are exercised by tests on the first run.
#
# So the ABC was buying only "declares an interface", which a Protocol
# does without forcing the test double to inherit anything. The gain is
# that the fake needs no import of the interface, and a third-party
# repository could satisfy it unmodified.

class Repository(Protocol):
    """What the service layer requires of a repository.

    Raises:
        NotFound: get() was called with an id that does not exist.
    """

    def get(self, entity_id: str) -> dict: ...
    def save(self, entity: dict) -> None: ...
    def delete(self, entity_id: str) -> None: ...


class InMemoryRepository:
    """Conforms structurally. No import of Repository, no inheritance."""

    def __init__(self) -> None:
        self._items: dict[str, dict] = {}

    def get(self, entity_id: str) -> dict:
        try:
            return dict(self._items[entity_id])       # copy on the way out
        except KeyError:
            raise NotFound(entity_id) from None

    def save(self, entity: dict) -> None:
        self._items[entity["id"]] = dict(entity)      # copy on the way in

    def delete(self, entity_id: str) -> None:
        self._items.pop(entity_id, None)


def load_profile(repo: Repository, user_id: str) -> dict:
    """mypy checks that whatever is passed has the three methods."""
    return repo.get(user_id)


# =========================================================================
# B. ImportPipeline  ->  STAYS AN ABC
# =========================================================================
#
# Shared implementation?  YES -- run() owns the transaction, the
#   rollback guarantee and the metrics. That is real code the base
#   hands down, and it is the whole reason the class exists.
# Instantiation enforcement?  YES -- pipelines are written by other
#   teams, and a missing transform should fail at construction rather
#   than halfway through a production import.
#
# Both boxes ticked. This is the template method pattern and an ABC is
# exactly right.

class ImportPipeline(ABC):
    """Runs an import in a transaction, with guaranteed rollback.

    Subclasses supply read, transform and write. They cannot skip the
    transaction or forget to roll back, because run() is not theirs to
    override.
    """

    def run(self, connection) -> int:
        written = 0
        with self._transaction(connection):
            for raw in self.read():
                record = self.transform(raw)
                if record is None:
                    continue
                self.write(connection, record)
                written += 1
        self.on_complete(written)
        return written

    @contextmanager
    def _transaction(self, connection) -> Iterator[None]:
        try:
            yield
        except Exception:
            connection.rollback()      # the invariant subclasses cannot break
            raise
        else:
            connection.commit()

    @abstractmethod
    def read(self) -> Iterator[dict]:
        """Yield raw records."""

    @abstractmethod
    def transform(self, raw: dict) -> dict | None:
        """Convert one record, or return None to skip it."""

    @abstractmethod
    def write(self, connection, record: dict) -> None:
        """Persist one record."""

    def on_complete(self, written: int) -> None:
        """Hook with a default. Not abstract."""


# =========================================================================
# C. IdGenerator  ->  DELETED
# =========================================================================
#
# Shared implementation?  No.
# Instantiation enforcement?  No.
# And every implementation was a single expression -- so the hierarchy
# was absorbing no variation at all.
#
# A single-method interface is a function (Lesson 3.4). Two of them are
# two functions, and the choice between them is a parameter.

def uuid4_id() -> str:
    return str(uuid.uuid4())


def prefixed_id(prefix: str) -> Callable[[], str]:
    """A factory, since the prefix is the only thing that varies."""
    def generate() -> str:
        return f"{prefix}_{uuid.uuid4().hex[:12]}"
    return generate


# Callers take a callable, not a class:
def create_order(items: list, *, make_id: Callable[[], str] = uuid4_id) -> dict:
    return {"id": make_id(), "items": items}


# =========================================================================
# proofs
# =========================================================================

class NotFound(LookupError):
    """No entity with that id."""


def test_incomplete_abc_subclass_cannot_be_instantiated() -> None:
    """B's enforcement, demonstrated."""

    class HalfDone(ImportPipeline):
        def read(self):
            yield {}
        # transform and write missing

    try:
        HalfDone()
    except TypeError as exc:
        assert "transform" in str(exc) and "write" in str(exc), exc
    else:
        raise AssertionError("expected TypeError at instantiation")


def test_fake_conforms_to_protocol_without_importing_it() -> None:
    """A's decoupling, demonstrated."""
    repo = InMemoryRepository()
    repo.save({"id": "u1", "name": "Ada"})

    assert load_profile(repo, "u1")["name"] == "Ada"

    # It satisfies the protocol by shape -- there is no inheritance to check
    assert not issubclass(InMemoryRepository, type(Repository))

    try:
        load_profile(repo, "nope")
    except NotFound:
        pass
    else:
        raise AssertionError("expected NotFound")


def test_id_generation_needs_no_class() -> None:
    """C's simplification, demonstrated."""
    order = create_order(["widget"], make_id=prefixed_id("ord"))
    assert order["id"].startswith("ord_")

    # A deterministic id for a test: a lambda, not a subclass
    fixed = create_order([], make_id=lambda: "fixed-1")
    assert fixed["id"] == "fixed-1"


if __name__ == "__main__":
    test_incomplete_abc_subclass_cannot_be_instantiated()
    test_fake_conforms_to_protocol_without_importing_it()
    test_id_generation_needs_no_class()
    print("A: Protocol   B: ABC   C: deleted")`,
        notes: [
          { t: "p", text: "**The three answers come from the same two questions**, which is the point of the exercise. Nothing about \"it is an interface\" or \"it has subclasses\" decides it — only whether there is shared implementation to hand down and whether an incomplete subclass must fail at construction." },
          { t: "p", text: "**B is the one that genuinely needs the ABC**, and the reason is in `run()`. It owns the transaction boundary and the rollback, and subclasses never see that code — so they cannot forget it, skip it, or get the ordering wrong. A protocol could declare `read`, `transform` and `write` and could not guarantee the sequence around them." },
          { t: "p", text: "**C's `prefixed_id` is a closure, not a class**, which is the Lesson 3.6 pattern doing the job an entire hierarchy was doing. The test's `make_id=lambda: \"fixed-1\"` is the payoff: a deterministic id needs one lambda where the ABC version needed a subclass." },
          { t: "callout", kind: "insight", title: "What each decision gave up", body: [
            { t: "p", text: "**A** gave up runtime `isinstance` checks and instantiation enforcement, and bought decoupling — the fake imports nothing, and a third-party repository could satisfy it. That trade is right when both implementations are yours and tested." },
            { t: "p", text: "**C** gave up the ability to attach more methods later without restructuring. If `IdGenerator` grows a `parse()` or a `validate()`, it becomes a real interface and should be one. Deleting an abstraction is reversible; that is why it is safe to delete one that is absorbing no variation today." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team defines an ABC for a plugin interface, and a plugin author registers their class with `PluginBase.register(MyPlugin)` after hitting an inheritance conflict. Everything type-checks. At runtime, the plugin loader crashes with `AttributeError: 'MyPlugin' object has no attribute 'teardown'`." },
      { t: "p", text: "**`register()` is an unchecked assertion.** It makes `isinstance` and `issubclass` return `True` without verifying a single method exists, so the plugin passed every guard the loader had — the guards were asking about ancestry, and ancestry had been asserted rather than earned." },
      { t: "p", text: "**The fix is a `Protocol`.** It checks the shape statically, needs no registration call, and — crucially — works for a plugin author who cannot inherit from your base because of a conflict with their own hierarchy. That conflict is exactly the situation `register` gets reached for, and exactly the situation a protocol handles properly." },
      { t: "p", text: "The general rule: **if you are reaching for `register()`, you wanted structural typing.** It gives up an ABC's only real advantage while keeping all of its coupling and ceremony." }
    ]}
  ],

  takeaways: [
    "An ABC does exactly two things a `Protocol` cannot: **refuse to instantiate an incomplete subclass**, and **carry shared implementation**. If you need neither, use a `Protocol`.",
    "`abstractmethod` is **runtime enforcement at instantiation**, not at class definition — and it checks only that the name exists, never the signature.",
    "**The decision question:** do I have shared implementation to hand down, or must an incomplete subclass fail at construction?",
    "**Template method is where an ABC earns it:** the base owns the sequence and its invariants — the try/finally, the transaction, the cleanup — and subclasses cannot skip them because they never see that code.",
    "The composition alternative passes steps as callables. It wins for two or three steps; the ABC wins for many steps with sensible defaults.",
    "**`collections.abc` gives you a full interface from three methods** — implement `__getitem__`, `__iter__` and `__len__` and receive the whole `Mapping` surface.",
    "Prefer `isinstance(x, Sequence)` to `isinstance(x, list)` — it tests capability rather than concrete type.",
    "**`register()` checks nothing.** It makes `isinstance` lie, provides no mixin methods, and gives up enforcement while keeping the ceremony. Reaching for it means you wanted a `Protocol`.",
    "**Signals of over-abstraction:** one abstract method whose implementations are one expression each, exactly one concrete subclass, or a base with no concrete methods at all.",
    "An ABC with only abstract methods and no shared implementation is a `Protocol` that also demands inheritance."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "When does `abstractmethod` actually prevent something?",
        options: [
          "At class definition — defining a subclass without the method raises immediately",
          "At instantiation — the class can be defined, but creating an instance raises `TypeError` naming the missing methods",
          "At import time, when `ABCMeta` scans the module",
          "At the first call to the missing method"
        ],
        answer: 1,
        why: "`ABCMeta` collects abstract names into `__abstractmethods__`, and `object.__new__` refuses to allocate while that set is non-empty. So defining `class Broken(Base): pass` succeeds and `Broken()` raises. That is later than a compiler would catch it and far earlier than the first call — and the message names the missing methods. Note it only checks that the *name* exists; a wrong signature satisfies the ABC and fails at the call site."
      },
      {
        stem: "A base class has three abstract methods, no concrete methods, and all implementations are yours and well tested. What should it be?",
        options: [
          "An ABC — it defines an interface, which is what ABCs are for",
          "A `Protocol` — with no shared implementation and no need for instantiation-time enforcement, the ABC only adds an inheritance requirement",
          "A regular base class with methods raising `NotImplementedError`",
          "A module of free functions"
        ],
        answer: 1,
        why: "An ABC with only abstract methods is a `Protocol` that also demands inheritance. Since there is nothing to hand down and the implementations are already exercised by tests, the runtime enforcement buys little — while the inheritance requirement couples every provider to the interface and makes third-party or test classes conform only by subclassing. A protocol gives the same mypy checking with none of that."
      },
      {
        stem: "`Base.register(MyClass)` makes `issubclass(MyClass, Base)` return `True`. What has been verified?",
        options: [
          "That `MyClass` implements every abstract method",
          "Nothing — `register` is an unchecked assertion, and the class may lack every required method",
          "That `MyClass` has a compatible constructor signature",
          "That `MyClass` does not conflict with the base's MRO"
        ],
        answer: 1,
        why: "`register` records a virtual-subclass relationship for `isinstance`/`issubclass` and performs no verification at all — a class with no methods can be registered and will pass every guard until something calls a missing method. It also inherits no concrete mixin methods. It gives up an ABC's only real advantage over a protocol while keeping the coupling, which is why reaching for it usually means structural typing was the right tool."
      },
      {
        stem: "Which situation genuinely justifies an ABC over a `Protocol`?",
        options: [
          "You want mypy to check that implementations have the right methods",
          "A base `run()` method owns a transaction and guaranteed rollback that subclasses must not be able to skip",
          "You want `isinstance` checks to work at runtime",
          "The interface has more than three methods"
        ],
        answer: 1,
        why: "That is the template method pattern: real shared implementation the base hands down, plus an invariant subclasses cannot break because they never see the code. Protocols check types just as well, `@runtime_checkable` provides `isinstance` (loosely), and method count is irrelevant. Shared implementation and instantiation-time enforcement are the only two things an ABC uniquely provides."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is an abstract base class and when would you use one?",
        strong: "A class using `ABCMeta` and `abstractmethod` so that instantiating a subclass missing any abstract method raises `TypeError`. It is worth using when you have shared implementation to hand down, or when a subclass written by another team must fail at construction rather than in production. For a pure interface, a `Protocol` is better.",
        answer: [
          { t: "p", text: "Naming the enforcement point precisely — instantiation, not class definition — separates a real understanding from a recited one. The class defines fine; only `Broken()` raises." },
          { t: "p", text: "The comparison to `Protocol` is what the question is really probing. An ABC does exactly two things a protocol cannot, and if you need neither, the protocol wins by not requiring providers to inherit." },
          { t: "p", text: "A good detail to add: the enforcement checks only that the *name* exists. A subclass with a completely different signature satisfies the ABC and fails at the call site — only a type checker catches that." }
        ]
      },
      {
        level: "core",
        q: "Protocol or ABC — how do you choose?",
        strong: "Two questions. Is there shared implementation the base hands down? Does an incomplete subclass need to fail at construction? A yes to either means ABC; no to both means `Protocol`, because then the ABC is only adding an inheritance requirement.",
        answer: [
          { t: "p", text: "The decoupling argument is what makes protocols the default: the provider never imports the interface, so third-party classes and ten-line test fakes conform by shape alone." },
          { t: "p", text: "The template method is the concrete ABC case worth describing — a base `run()` owning a transaction and guaranteed rollback that subclasses cannot skip, because they never see that code." },
          { t: "p", text: "Mentioning the library pattern of shipping both shows range: a `Protocol` for consumers to type against, plus an optional ABC providing a convenient base with shared implementation." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague uses `ABC.register()` to make a third-party class satisfy an interface. What do you say?",
        strong: "That `register` verifies nothing — it makes `isinstance` and `issubclass` return `True` without checking that any method exists, so the class passes every guard until something calls a missing method. And it inherits no concrete mixin methods. Reaching for it means a `Protocol` was the right tool.",
        answer: [
          { t: "p", text: "The situation that drives people to `register` is exactly the one protocols are for: a class you cannot modify, or one whose own hierarchy conflicts with yours. Structural typing handles both without an assertion." },
          { t: "p", text: "Framing the loss precisely helps: `register` gives up the ABC's only real advantage — enforcement — while keeping all of its coupling and ceremony. You end up with the worst of both." },
          { t: "p", text: "Being fair about where it belongs keeps it constructive: the standard library uses it to make `list` an instance of `Sequence`, and libraries retrofitting ABCs onto pre-existing types need it. In application code it is nearly always the wrong reach." }
        ]
      }
    ]
  }
});
