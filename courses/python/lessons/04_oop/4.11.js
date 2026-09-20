/* ============================================================================
   LESSON 4.11 — SOLID Principles, Read Pythonically
   ========================================================================= */
EC.receiveLesson({
  id: "4.11",

  lede: "SOLID was formulated for statically typed, nominally typed languages where an interface is a declaration and substitution is checked by a compiler. Python has neither. Two of the five principles survive intact, two change shape substantially, and one **largely dissolves** — because the language already gives you what it was working around. Knowing which is which stops you importing ceremony that solves a problem you do not have.",

  objectives: [
    "State each principle in terms of the problem it solves, not its acronym",
    "Identify which principles change shape in a duck-typed language and why",
    "Apply the interface segregation principle using `Protocol`",
    "Recognise where dependency inversion is a function parameter rather than a container",
    "Reject the versions of these principles that are Java ceremony in Python"
  ],

  prerequisites: ["4.6", "4.7", "4.8"],

  blocks: [

    { t: "h2", n: "01", text: "What survives and what changes", id: "overview" },

    {"kind": "compare", "title": "SOLID in Python", "caption": "Two principles survive intact, one matters most, and two mostly dissolve because Python has first-class functions and duck typing.", "columns": [{"title": "Survives", "tone": "good", "items": ["S — one reason to change", "L — substitutability"]}, {"title": "Weakens", "tone": "accent", "items": ["O — extension via composition, not subclassing"]}, {"title": "Dissolves", "tone": "warn", "items": ["I — duck typing segregates for free", "D — pass a function or an object"]}], "t": "diagram", "id": "dg-4_11-01-0"},





    { t: "viz",
      title: "SOLID, with the Python translation",
      caption: "Three of the five are largely automatic in Python. The two that still take deliberate effort are single responsibility and dependency inversion — and those are the two worth arguing about in review.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="The five SOLID principles marked by how much work each requires in Python">
  <g style="stroke-width:2">
    <rect x="24" y="40" width="420" height="44" rx="6" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="24" y="92" width="420" height="44" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
    <rect x="24" y="144" width="420" height="44" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
    <rect x="24" y="196" width="420" height="44" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
  </g>
  <text x="44" y="68"  class="s-label" style="fill:var(--crit)">S — single responsibility</text>
  <text x="44" y="120" class="s-sub" style="fill:var(--ink-2)">O — open/closed</text>
  <text x="44" y="172" class="s-sub" style="fill:var(--ink-2)">L — Liskov substitution</text>
  <text x="44" y="224" class="s-sub" style="fill:var(--ink-2)">I — interface segregation</text>

  <rect x="470" y="40" width="386" height="44" rx="6" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)" stroke-width="2"/>
  <text x="490" y="68" class="s-label" style="fill:var(--crit)">D — dependency inversion</text>

  <text x="470" y="120" class="s-sub" style="fill:var(--ink-3)">O, L and I are close to free in Python:</text>
  <text x="470" y="144" class="s-sub" style="fill:var(--ink-3)">duck typing gives substitutability, and</text>
  <text x="470" y="166" class="s-sub" style="fill:var(--ink-3)">Protocols keep interfaces narrow.</text>

  <text x="470" y="200" class="s-sub" style="fill:var(--crit)">S and D are the ones that need work —</text>
  <text x="470" y="222" class="s-sub" style="fill:var(--crit)">and pass a dependency in, do not import it.</text>
</svg>`
    },
    { t: "table",
      head: ["Principle", "In Python", "Why"],
      rows: [
        ["**S** — Single responsibility", "**Unchanged**", "A language-independent argument about coupling and reasons to change"],
        ["**O** — Open/closed", "**Changed shape**", "Extension rarely needs subclassing — a dispatch table or a parameter usually does it"],
        ["**L** — Liskov substitution", "**Unchanged, and more important**", "No compiler checks it, so violations are silent until production"],
        ["**I** — Interface segregation", "**Changed shape**", "Consumers declare `Protocol`s, so segregation happens naturally"],
        ["**D** — Dependency inversion", "**Largely dissolves**", "Duck typing means there is no concrete type to depend on in the first place"]
      ],
      caption: "The two that change shape and the one that dissolves are where imported Java habits do the most damage — abstract base classes with one implementation, DI containers, and interfaces nobody needed."
    },

    { t: "h2", n: "02", text: "S — one reason to change", id: "srp" },

    { t: "p", text: "The usual phrasing is *a class should do one thing*, which is unfalsifiable — \"one thing\" can be any size. The useful phrasing is **a module should have one reason to change**, where a reason is a person or a team who might ask for something different." },

    { t: "code", lang: "python", title: "counting the reasons", code: `
class Invoice:
    def calculate_total(self) -> Decimal: ...   # finance changes this
    def render_pdf(self) -> bytes: ...          # design changes this
    def save(self) -> None: ...                 # the DBA changes this
    def email_to_customer(self) -> None: ...    # marketing changes this
`,
      caption: "Four teams, four reasons to change one file. Every change risks the other three, every merge conflicts, and the class cannot be tested without a database, a PDF renderer and an SMTP server."
    },

    { t: "callout", kind: "good", title: "The Python-specific version", body: [
      { t: "p", text: "In Python the split is usually along the **I/O seam** rather than into a class hierarchy (Lesson 3.1). `calculate_total` becomes a pure function taking line items; the rest become collaborators or module functions." },
      { t: "code", lang: "python", title: "the split", numbered: false, code: `
# Pure -- the reason finance changes. Testable with a literal list.
def invoice_total(lines: Sequence[Line]) -> Decimal: ...

# I/O -- each with one owner, each substitutable
class InvoiceRepository:  def save(self, invoice: Invoice) -> None: ...
class PdfRenderer:        def render(self, invoice: Invoice) -> bytes: ...
class InvoiceMailer:      def send(self, to: str, pdf: bytes) -> None: ...`},
      { t: "p", text: "Note that three of the four became small classes and one became a function. **SRP does not say \"make everything a class\"** — it says separate the reasons to change, and a function is a perfectly good unit of separation." }
    ]},

    { t: "h2", n: "03", text: "O — open for extension without subclassing", id: "ocp" },

    { t: "p", text: "*Open for extension, closed for modification*: adding a case should not mean editing existing code. In Java that implies an interface plus a class per case. In Python it usually means **data, not a hierarchy**." },

    { t: "ladder",
      title: "Adding a new export format",
      rungs: [
        { level: "bad", label: "Edit the conditional", why: "closed to extension",
          code: `def export(rows, fmt):
    if fmt == "csv":
        return to_csv(rows)
    elif fmt == "json":
        return to_json(rows)
    # every new format edits this function`,
          note: "Adding Parquet means touching shared code that every existing format flows through — so a mistake in the new branch can break the old ones, and two people adding formats conflict (Lesson 2.6)." },

        { level: "ok", label: "Abstract base and a class per format", why: "the Java answer, and heavier than needed",
          code: `class Exporter(ABC):
    @abstractmethod
    def export(self, rows) -> bytes: ...


class CsvExporter(Exporter):
    def export(self, rows) -> bytes: ...


EXPORTERS = {"csv": CsvExporter(), "json": JsonExporter()}`,
          note: "Correctly open — a new format is a new class and a registry line. But the ABC is carrying no shared implementation and enforcing nothing useful, so it is a `Protocol` demanding inheritance (Lesson 4.8). Each 'class' is one method." },

        { level: "best", label: "A registry of functions", why: "open, and no hierarchy",
          code: `from collections.abc import Callable, Sequence

Exporter = Callable[[Sequence[Row]], bytes]

EXPORTERS: dict[str, Exporter] = {}


def exports(fmt: str):
    """Register a function as the exporter for one format."""
    def register(fn: Exporter) -> Exporter:
        if fmt in EXPORTERS:
            raise ValueError(f"duplicate exporter for {fmt!r}")
        EXPORTERS[fmt] = fn
        return fn
    return register


@exports("csv")
def to_csv(rows: Sequence[Row]) -> bytes: ...

@exports("parquet")                 # a new format: one function, no edits
def to_parquet(rows: Sequence[Row]) -> bytes: ...


def export(rows: Sequence[Row], fmt: str) -> bytes:
    try:
        return EXPORTERS[fmt](rows)
    except KeyError:
        raise ValueError(f"no exporter for {fmt!r}; have {sorted(EXPORTERS)}") from None`,
          note: "Open for extension, and no class hierarchy at all. A single-method interface is a function (Lesson 3.4), so the 'class per format' was ceremony. The duplicate check catches two exporters claiming one format at import rather than silently last-wins. The caveat from Lesson 3.4 applies: registration is an import side effect, so import your exporter modules explicitly." }
      ]
    },

    { t: "h2", n: "04", text: "L — the one that matters most here", id: "lsp" },

    { t: "p", text: "Liskov substitution says a subclass must be usable anywhere its base is, without callers knowing. This is the principle Python needs **most**, because nothing checks it — no compiler, no interface declaration, and duck typing means a wrong substitution often runs successfully and produces wrong behaviour." },

    { t: "code", lang: "python", title: "the classic violation, and a Python-specific one", code: `
# 1. The textbook case: strengthening a precondition
class Rectangle:
    def set_size(self, w: int, h: int) -> None:
        self.w, self.h = w, h


class Square(Rectangle):
    def set_size(self, w: int, h: int) -> None:
        if w != h:
            raise ValueError("a square must be square")   # base did not raise
        self.w = self.h = w


def resize_all(shapes: list[Rectangle]) -> None:
    for s in shapes:
        s.set_size(4, 5)          # fine for Rectangle, raises for Square


# 2. The Python case: same signature, different SEMANTICS
class Cache:
    def get(self, key: str) -> str | None:
        """Returns None on a miss."""


class StrictCache(Cache):
    def get(self, key: str) -> str:
        """Raises KeyError on a miss."""      # callers checking for None
                                              # now get an exception
`,
      caption: "The second is the one that bites in Python. Both signatures satisfy any structural check and any `Protocol`; the difference is in what happens on a miss, which no type expresses. Every caller written against `Cache` handles `None` and none of them handles `KeyError`."
    },

    { t: "callout", kind: "insight", title: "The four rules a subclass must not break", body: [
      { t: "ul", items: [
        "**Do not strengthen preconditions.** If the base accepts any two integers, the subclass must too.",
        "**Do not weaken postconditions.** If the base guarantees a sorted result, the subclass must guarantee it.",
        "**Do not raise new exception types** callers were not told about, or stop raising ones they handle.",
        "**Do not change side effects, timing or idempotency.** This is the `RetryingHttpClient` case from Lesson 4.7 — the signature is identical and the contract is not."
      ]},
      { t: "p", text: "Only the first two are about types, and only they are partially checkable by mypy. The last two are behavioural, invisible to every tool, and are where Python's violations concentrate — which is why the **docstring is part of the contract**, not documentation of it." }
    ]},

    { t: "h2", n: "05", text: "I — segregation happens naturally", id: "isp" },

    { t: "p", text: "*No client should depend on methods it does not use.* In Java this means splitting a fat interface into several. In Python, because a `Protocol` is declared by the **consumer**, segregation is the default rather than an effort." },

    { t: "code", lang: "python", title: "each consumer declares only what it needs", code: `
from typing import Protocol


# A fat ABC forces every implementer to provide all six methods,
# even a read-only view that can implement none of the writes:
#
#   class Storage(ABC):
#       read / write / delete / list / lock / unlock


# Protocols invert it -- each consumer states its own requirement.
class Readable(Protocol):
    def read(self, key: str) -> bytes: ...


class Writable(Protocol):
    def write(self, key: str, data: bytes) -> None: ...


def render_report(source: Readable) -> str:
    """Needs read. Cannot accidentally write, and a read-only
    implementation satisfies it completely."""
    return source.read("report").decode()


def archive(source: Readable, sink: Writable) -> None:
    """Needs both -- but from two objects, which is only expressible
    because the requirements are separate."""
    sink.write("archive", source.read("current"))
`,
      caption: "`archive` taking two different objects is the payoff. With one fat `Storage` interface you would pass the same object twice, or thread a single dependency through code that only reads. Separate protocols let the signature state exactly what each argument is for."
    },

    { t: "h2", n: "06", text: "D — mostly dissolves", id: "dip" },

    { t: "p", text: "*Depend on abstractions, not concretions.* This principle exists because in Java, `new PostgresRepository()` inside a class hard-codes a type that cannot be substituted — you need an interface and a way to inject an implementation. **Python has neither problem.**" },

    { t: "ladder",
      title: "A service that needs a repository",
      rungs: [
        { level: "bad", label: "Constructs its dependency", why: "untestable, unconfigurable",
          code: `class OrderService:
    def __init__(self) -> None:
        self.repo = PostgresRepository(DATABASE_URL)   # hard-coded
        self.mailer = SmtpMailer(SMTP_HOST)`,
          note: "This is the real problem DIP addresses, and it is real in Python too: the service cannot be constructed without a database and an SMTP server, so it cannot be tested (Lesson 4.1)." },

        { level: "ok", label: "Java-style: an ABC plus injection", why: "solves it, with imported ceremony",
          code: `class AbstractRepository(ABC):
    @abstractmethod
    def get(self, order_id: str) -> Order: ...


class OrderService:
    def __init__(self, repo: AbstractRepository) -> None:
        self.repo = repo`,
          note: "Injection is right. The ABC is not: it forces every implementation — including a ten-line test fake — to inherit from it, which is coupling bought for nothing since Python never needed a declared interface to substitute." },

        { level: "best", label: "Inject, and type with a Protocol", why: "substitution with no coupling",
          code: `class OrderRepository(Protocol):
    """What OrderService requires. Nothing inherits from this."""
    def get(self, order_id: str) -> Order: ...
    def save(self, order: Order) -> None: ...


class OrderService:
    def __init__(self, *, repo: OrderRepository, mailer: Mailer) -> None:
        self._repo = repo
        self._mailer = mailer

    @classmethod
    def from_settings(cls, settings: Settings) -> "OrderService":
        """Where the concrete choices are made -- once, at the edge."""
        return cls(
            repo=PostgresRepository(settings.database_url),
            mailer=SmtpMailer(settings.smtp_host),
        )`,
          note: "The dependency is a parameter, which is all injection ever needed to be — no container, no framework, no registration. The `Protocol` documents the requirement and lets mypy check it, while a test fake conforms by shape alone. `from_settings` is where concrete types are chosen: once, at the composition root, rather than scattered through the code." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "You almost never need a DI container", body: [
      { t: "p", text: "DI frameworks exist to solve a Java problem: wiring is verbose, reflection is awkward, and constructor injection across a large object graph needs machinery. In Python a constructor parameter and a factory function do the same job in fewer lines and with no runtime magic." },
      { t: "p", text: "**The Python composition root is usually one function** — `create_app()`, `build_container()`, or a FastAPI `lifespan` — that reads settings, constructs the concrete objects once, and hands them to whatever needs them. Everything else takes parameters." },
      { t: "p", text: "The case for a container is genuinely narrow: very large graphs with deep nesting, or a framework that provides one anyway (FastAPI's `Depends`, covered in Lesson 12.5). Reaching for one in a service with a dozen collaborators adds indirection and a failure mode — wiring errors at startup — for no benefit." }
    ]},

    { t: "h2", n: "07", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Apply four, and reject one",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "The class below violates four of the five principles. Refactor it — but one of the \"obvious\" SOLID fixes would be Java ceremony in Python. Identify which, and do not apply it." }
      ],
      requirements: [
        "Name each violated principle and the specific line or design decision that violates it.",
        "Split by reason-to-change, separating pure computation from I/O.",
        "Make new notification channels addable without editing existing code — without a class hierarchy.",
        "Fix the Liskov violation in the subclass and explain why no tool caught it.",
        "Inject dependencies and type them with `Protocol`s that are segregated per consumer.",
        "**Identify the SOLID fix you deliberately did not apply**, and justify the omission.",
        "Write a test that constructs the service with no infrastructure at all."
      ],
      hint: "The one to reject involves creating an abstract base class for something with a single method. Ask what the ABC would enforce and what it would carry (Lesson 4.8).",
      solution: {
        lang: "python",
        title: "order_service.py",
        code: `# ---- the original -------------------------------------------------------

class OrderProcessor:
    def __init__(self):
        self.db = PostgresConnection(DATABASE_URL)      # D: constructs deps
        self.smtp = SmtpClient(SMTP_HOST)

    def process(self, order_id):                        # S: four reasons
        order = self.db.query("SELECT ...", order_id)   #    to change
        total = sum(l["qty"] * l["price"] for l in order["lines"])
        if order["country"] == "UK":                    # O: new country
            total *= Decimal("1.20")                    #    edits this
        elif order["country"] == "US":
            total *= Decimal("1.07")
        self.db.execute("UPDATE ...", total, order_id)
        self.smtp.send(order["email"], f"Total: {total}")


class UrgentOrderProcessor(OrderProcessor):
    def process(self, order_id):
        order = self.db.query("SELECT ...", order_id)
        if order["total"] < 100:                        # L: strengthened
            raise ValueError("urgent orders must exceed 100")   # precondition
        return super().process(order_id)


# VIOLATIONS
#
# S  process() does four things owned by four teams: fetching, tax
#    calculation, persistence, notification. Any change risks the rest,
#    and it cannot be tested without a database and an SMTP server.
#
# O  Adding a country edits the tax conditional -- shared code every
#    existing country flows through.
#
# L  UrgentOrderProcessor raises where the base does not. Code written
#    against OrderProcessor breaks when handed the subclass, and NOTHING
#    catches it: the signature is identical, mypy is satisfied, and any
#    structural check passes. The contract lived in the docstring.
#
# D  __init__ constructs its own dependencies, so the class cannot be
#    built without infrastructure.
#
# I  is NOT violated here -- there is no fat interface to segregate. The
#    principle applies once the protocols are introduced.


# ---- the redesign -------------------------------------------------------

from __future__ import annotations

from collections.abc import Callable, Sequence
from decimal import Decimal
from typing import Protocol


# ---- S: pure computation, separated from I/O ----

def line_total(line: Line) -> Decimal:
    return Decimal(str(line.price)) * line.qty


def subtotal(lines: Sequence[Line]) -> Decimal:
    """Pure. No database, no clock. Testable with a literal list."""
    return sum((line_total(l) for l in lines), start=Decimal("0"))


# ---- O: tax rates as DATA, not a hierarchy ----
#
# The Java answer is an abstract TaxStrategy with a subclass per country.
# Each subclass would be one multiplication -- a single-method interface
# whose implementations differ only by a constant. That is data
# (Lesson 4.8), so a dict is the honest representation.

TAX_RATES: dict[str, Decimal] = {
    "UK": Decimal("0.20"),
    "US": Decimal("0.07"),
    "DE": Decimal("0.19"),          # a new country: one line, no edits
}


def with_tax(amount: Decimal, country: str) -> Decimal:
    try:
        return amount * (1 + TAX_RATES[country])
    except KeyError:
        raise ValueError(
            f"no tax rate for {country!r}; have {sorted(TAX_RATES)}"
        ) from None


# ---- I + D: segregated protocols, injected ----

class OrderReader(Protocol):
    """What processing requires. Note: read only."""
    def get(self, order_id: str) -> Order: ...


class OrderWriter(Protocol):
    def update_total(self, order_id: str, total: Decimal) -> None: ...


class Notifier(Protocol):
    def notify(self, recipient: str, message: str) -> None: ...


class OrderService:
    def __init__(
        self,
        *,
        reader: OrderReader,
        writer: OrderWriter,
        notifier: Notifier,
    ) -> None:
        """Cheap and total. Every dependency is a parameter, so a test
        supplies fakes and never touches infrastructure (Lesson 4.1)."""
        self._reader = reader
        self._writer = writer
        self._notifier = notifier

    @classmethod
    def from_settings(cls, settings: Settings) -> OrderService:
        """The composition root: where concrete types are chosen, once."""
        db = PostgresConnection(settings.database_url)
        return cls(
            reader=db, writer=db,
            notifier=SmtpNotifier(settings.smtp_host),
        )

    def process(self, order_id: str) -> Decimal:
        order = self._reader.get(order_id)
        total = with_tax(subtotal(order.lines), order.country)
        self._writer.update_total(order_id, total)
        self._notifier.notify(order.email, f"Total: {total}")
        return total


# ---- L: the precondition moves OUT of the subclass ----
#
# UrgentOrderProcessor could not strengthen a precondition without
# breaking substitution, so the rule becomes a separate step that a
# caller applies deliberately -- visible at the call site rather than
# hidden behind a type (Lesson 4.7).

def require_minimum(order: Order, minimum: Decimal) -> None:
    """Raise if the order is below the threshold. Explicit, and optional."""
    if subtotal(order.lines) < minimum:
        raise ValueError(
            f"order {order.id} is below the {minimum} minimum"
        )


# ---- THE FIX DELIBERATELY NOT APPLIED -----------------------------------
#
# Textbook SOLID says the tax calculation should be an abstract
# TaxStrategy with UkTaxStrategy, UsTaxStrategy and DeTaxStrategy
# subclasses, injected into OrderService.
#
# REJECTED, because:
#
#   1. Every "strategy" would be one multiplication by a constant. A
#      single-method interface is a function; one whose implementations
#      differ only by a number is DATA (Lesson 3.4, 4.8).
#
#   2. The ABC would carry no shared implementation and enforce nothing
#      useful -- it would be a Protocol that also demands inheritance.
#
#   3. Adding a country would mean a new class, a new file and a
#      registry entry, instead of one dict line. That is MORE friction
#      for extension, which inverts the open/closed principle it was
#      meant to serve.
#
# The principle -- adding a country must not edit existing logic -- is
# satisfied by the dict. The Java IMPLEMENTATION of the principle is
# what we reject, not the principle.
#
# It would become right the moment a country needed real behaviour:
# threshold-based rates, exemptions, or a lookup against a service. At
# that point each strategy carries logic, and a Protocol plus a registry
# of callables is the Python form.


# ---- tests: no infrastructure -------------------------------------------

class FakeStore:
    """One object satisfying both OrderReader and OrderWriter, by shape."""

    def __init__(self, orders: dict[str, Order]) -> None:
        self.orders = orders
        self.updates: list[tuple[str, Decimal]] = []

    def get(self, order_id: str) -> Order:
        return self.orders[order_id]

    def update_total(self, order_id: str, total: Decimal) -> None:
        self.updates.append((order_id, total))


class RecordingNotifier:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []

    def notify(self, recipient: str, message: str) -> None:
        self.sent.append((recipient, message))


def test_service_needs_no_infrastructure() -> None:
    order = Order(id="o-1", email="ada@example.com", country="UK",
                  lines=[Line(qty=2, price="10.00")])
    store = FakeStore({"o-1": order})
    notifier = RecordingNotifier()

    service = OrderService(reader=store, writer=store, notifier=notifier)
    total = service.process("o-1")

    assert total == Decimal("24.00")            # 20.00 + 20% VAT
    assert store.updates == [("o-1", Decimal("24.00"))]
    assert notifier.sent[0][0] == "ada@example.com"


def test_pure_functions_need_no_service() -> None:
    """The payoff of splitting by reason-to-change."""
    lines = [Line(qty=2, price="10.00"), Line(qty=1, price="5.50")]
    assert subtotal(lines) == Decimal("25.50")
    assert with_tax(Decimal("100"), "DE") == Decimal("119.00")

    try:
        with_tax(Decimal("100"), "ZZ")
    except ValueError as exc:
        assert "no tax rate for 'ZZ'" in str(exc)
    else:
        raise AssertionError("expected ValueError")


if __name__ == "__main__":
    test_service_needs_no_infrastructure()
    test_pure_functions_need_no_service()
    print("S O L D applied; the ABC-per-country fix rejected")`,
        notes: [
          { t: "p", text: "**The rejected fix is the whole exercise.** Textbook SOLID prescribes a strategy hierarchy for the tax calculation, and applying it here would add three classes, three files and a registry to express three numbers — making extension *harder*, which inverts the very principle it was meant to serve." },
          { t: "p", text: "**The distinction to hold onto: the principle survives, the implementation does not.** \"Adding a country must not edit existing logic\" is satisfied by the dict. What is rejected is the Java mechanism for achieving it, which exists because Java has no first-class functions and no dict-of-callables idiom." },
          { t: "p", text: "**The Liskov fix moves the rule out of the type.** `UrgentOrderProcessor` could not strengthen a precondition without breaking substitution, so `require_minimum` becomes a function a caller applies deliberately. The rule is now visible at the call site rather than hidden behind a subclass — the same argument as `RetryPolicy` versus `RetryingHttpClient` in Lesson 4.7." },
          { t: "callout", kind: "insight", title: "Why FakeStore satisfies two protocols at once", body: [
            { t: "p", text: "`FakeStore` has `get` and `update_total`, so it satisfies `OrderReader` and `OrderWriter` simultaneously — and the real `PostgresConnection` does too, which is why `from_settings` passes `db` for both." },
            { t: "p", text: "That is interface segregation doing its job. The protocols are separate because *consumers* have different needs, not because implementations must be split. A single object can satisfy several narrow protocols, and `render_report(source: Readable)` still cannot accidentally write." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team adopts SOLID after a code-quality review. Six months later the codebase has an `AbstractXFactory` for every concept, a DI container wiring 200 objects, and interfaces with exactly one implementation each. Onboarding takes twice as long, and a one-line change touches four files." },
      { t: "p", text: "**They applied the Java implementations rather than the principles.** Abstract factories exist because Java cannot pass a constructor as a value; DI containers exist because Java wiring is verbose; single-implementation interfaces exist because Java has no structural typing. Python has first-class functions, keyword arguments and `Protocol` — so all three translate to less code, not more." },
      { t: "p", text: "**The test for any abstraction is what variation it absorbs.** An interface with one implementation and no second one planned absorbs none. A factory that only calls a constructor absorbs none. Delete them and inline; if a second implementation appears later, extracting the abstraction is a five-minute refactor with the real requirement in hand." },
      { t: "p", text: "The principles are sound — they are statements about coupling and change. **The patterns are not the principles**, and importing patterns from a language with different capabilities is how a codebase acquires ceremony that solves problems it does not have." }
    ]}
  ],

  takeaways: [
    "**Single responsibility** is unchanged: one reason to change, where a reason is a person who might ask for something different. In Python the split is usually along the **I/O seam**, and a function is a perfectly good unit of separation.",
    "**Open/closed** changes shape: a dispatch table or a registry of functions usually beats a class hierarchy, because a single-method interface is a function.",
    "**Liskov substitution matters most in Python** and is checked least — no compiler, and duck typing means a wrong substitution runs successfully.",
    "The four rules a subclass must not break: no stronger preconditions, no weaker postconditions, **no new exception types**, and **no changed side effects, timing or idempotency**. Only the first two are partly checkable.",
    "Because behavioural contracts are invisible to every tool, **the docstring is part of the contract**, not documentation of it.",
    "**Interface segregation happens naturally** with `Protocol`, because the consumer declares what it needs. One object can satisfy several narrow protocols.",
    "**Dependency inversion largely dissolves.** Injection is a constructor parameter; substitution needs no declared interface. Type the parameter with a `Protocol` for checking, not with an ABC for coupling.",
    "The Python composition root is **one function** — `from_settings`, `create_app` — where concrete types are chosen once. A DI container is rarely warranted.",
    "**An abstraction that absorbs no variation is indirection.** One implementation with no second one planned, or a factory that only calls a constructor, should be deleted and inlined.",
    "**The patterns are not the principles.** Abstract factories, DI containers and single-implementation interfaces are Java workarounds for capabilities Python already has."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which SOLID principle is hardest to enforce in Python, and why?",
        options: [
          "Single responsibility — Python encourages large modules",
          "Liskov substitution — nothing checks it, and duck typing means a wrong substitution often runs successfully and produces wrong behaviour",
          "Open/closed — Python classes are always open to modification",
          "Interface segregation — Python has no interface keyword"
        ],
        answer: 1,
        why: "In a statically typed language a compiler catches signature-level violations. Python has none, and the violations that matter most are behavioural — a subclass raising a new exception type, or changing idempotency — which no tool can detect. The signature is identical, mypy is satisfied, and callers break at runtime. Interface segregation is actually *easier* in Python, because a `Protocol` is declared by the consumer."
      },
      {
        stem: "A tax calculation branches on country, and each branch is one multiplication by a constant. What is the right open/closed fix?",
        options: [
          "An abstract `TaxStrategy` with a subclass per country, injected into the service",
          "A dict mapping country to rate — the 'strategies' differ only by a number, so they are data, not classes",
          "A `Protocol` with a registry of strategy classes",
          "Leave the `if/elif` chain; open/closed does not apply to simple values"
        ],
        answer: 1,
        why: "The principle — adding a country must not edit existing logic — is satisfied by the dict, and a class per country would make extension *harder*: a new class, a new file and a registry entry instead of one line. That inverts the principle it was meant to serve. A strategy hierarchy becomes correct once each country carries real behaviour — thresholds, exemptions, a service lookup — because then it absorbs genuine variation."
      },
      {
        stem: "A `StrictCache` subclass raises `KeyError` on a miss where the base returns `None`. What is wrong, and what catches it?",
        options: [
          "Nothing — raising is more explicit than returning `None`",
          "It violates Liskov substitution by introducing an exception callers were not told about, and no tool catches it: the signature satisfies mypy and every structural check",
          "It breaks the interface segregation principle",
          "mypy catches it because the return types differ"
        ],
        answer: 1,
        why: "Every caller written against the base handles `None` and none handles `KeyError`, so substituting the subclass breaks them at runtime. mypy would flag the narrowed return type in this specific case, but the general class of violation — a new exception type, changed idempotency, different timing — is invisible to every tool. That is why behavioural contracts belong in the docstring and why substitutability must be checked by reasoning."
      },
      {
        stem: "How is dependency inversion normally implemented in Python?",
        options: [
          "A DI container that wires the object graph at startup",
          "Constructor parameters typed with a `Protocol`, with concrete types chosen in one composition root such as a `from_settings` classmethod",
          "An abstract base class per dependency, with implementations registered by name",
          "Module-level singletons imported where needed"
        ],
        answer: 1,
        why: "Injection is just a parameter — no container or framework is needed. Typing it with a `Protocol` gives mypy checking without forcing implementations to inherit anything, which an ABC would. Concrete types are chosen once, at a composition root. A container is warranted only for very large graphs or where a framework supplies one; module-level singletons reintroduce the global-state problems from Lesson 3.3."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do the SOLID principles apply in Python?",
        strong: "Single responsibility and Liskov substitution are unchanged. Open/closed and interface segregation change shape — extension is usually a dispatch table rather than a hierarchy, and segregation is automatic because a `Protocol` is declared by the consumer. Dependency inversion largely dissolves: duck typing means there is no concrete type to depend on, so injection is just a constructor parameter.",
        answer: [
          { t: "p", text: "The framing that distinguishes a senior answer is separating the principles from their Java implementations. The principles are language-independent statements about coupling and change; abstract factories, DI containers and single-implementation interfaces are workarounds for capabilities Python already has." },
          { t: "p", text: "Liskov is worth singling out as *more* important here, not less: nothing checks it, and the violations that matter — a new exception type, changed idempotency — are invisible to mypy because the signature is identical." },
          { t: "p", text: "A concrete example lands well: a strategy hierarchy for tax rates that differ only by a constant makes extension harder than a dict, which inverts the open/closed principle it was meant to serve." }
        ]
      },
      {
        level: "advanced",
        q: "A codebase has an interface for every class and a DI container. What would you say?",
        strong: "Ask what variation each abstraction absorbs. An interface with one implementation and no second one planned absorbs none — it is indirection that makes every change touch two files. The same test applies to the container: if wiring is a dozen objects, a factory function does it with less machinery and no startup failure mode.",
        answer: [
          { t: "p", text: "The diagnosis worth naming is that they imported the patterns rather than the principles. Those patterns exist because Java cannot pass a constructor as a value and has no structural typing — Python has both, so the translations should produce less code, not more." },
          { t: "p", text: "Being constructive matters here: propose deleting the single-implementation interfaces and inlining, and note that extracting an abstraction later is a five-minute refactor done with the real second requirement in hand — far better than guessing at it in advance." },
          { t: "p", text: "Acknowledge where a container genuinely earns its place — very large graphs, or a framework that supplies one like FastAPI's `Depends` — so it reads as judgement rather than reflexive minimalism." }
        ],
        weak: "Dismissing SOLID altogether. The principles are sound; the objection is to importing implementations from a language with different capabilities."
      },
      {
        level: "expert",
        q: "How would you catch a Liskov violation in a Python codebase?",
        strong: "Run the base class's test suite against every subclass. If a subclass is genuinely substitutable, tests written against the base must pass unchanged — and a violation shows up as a failure rather than as a code review opinion.",
        answer: [
          { t: "p", text: "This is the technique that turns an abstract principle into something executable, and it is worth describing concretely: a parametrised test module taking the class under test as a fixture, run once per implementation." },
          { t: "p", text: "It is the standard-library idea behind `collections.abc` conformance tests, and the same shape as the compliance suites database drivers ship — so it is an established practice rather than an invention." },
          { t: "p", text: "The honest limit is worth stating: this catches what the tests cover. Behavioural contracts the base's tests do not exercise — timing, idempotency, side-effect ordering — stay invisible, which is why they belong in the docstring and why substitutability is ultimately a reasoning obligation, not a tooling one." }
        ]
      }
    ]
  }
});
