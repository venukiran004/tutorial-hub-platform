/* ============================================================================
   LESSON 8.4 — Generics, Protocols and TypedDict
   ========================================================================= */
EC.receiveLesson({
  id: "8.4",

  lede: "Python code has always been duck-typed: anything with a `read` method is a file as far as your function cares. Nominal typing — \"must inherit from `Reader`\" — fights that, which is why `Protocol` exists. **Structural typing describes how Python is actually written**, and generics let a container's element type travel with it instead of dissolving into `Any`.",

  objectives: [
    "Define a `Protocol` and explain why it beats an ABC for most interfaces",
    "Write generic functions and classes in the post-3.12 syntax",
    "Explain variance, and why `list[Dog]` is not a `list[Animal]`",
    "Model fixed-shape dictionaries with `TypedDict`, including optional keys",
    "Choose between a Protocol, an ABC, a dataclass and a TypedDict"
  ],

  prerequisites: ["8.3", "4.9"],

  blocks: [

    { t: "h2", n: "01", text: "Structural versus nominal", id: "structural" },

    { t: "viz",
      title: "Two ways to answer \"does this fit?\"",
      caption: "Nominal typing checks ancestry: the class must inherit from the interface. Structural typing checks shape: the class must have the right methods. Only the second can accept a type you do not control — a third-party class, a test double, a stdlib object.",
      svg: `<svg viewBox="0 0 900 290" role="img" aria-label="Diagram comparing nominal typing which requires inheritance with structural typing which requires only matching methods">
  <defs>
    <marker id="st" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="26" width="418" height="240" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="34" y="52" class="s-label">NOMINAL — ABC</text>

  <rect x="140" y="66" width="166" height="38" rx="7" style="fill:none;stroke:var(--border-strong)" stroke-width="1.2"/>
  <text x="223" y="90" text-anchor="middle" class="s-mono" style="font-size:10px">class Reader(ABC)</text>

  <line x1="223" y1="108" x2="223" y2="134" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#st)"/>
  <text x="240" y="126" class="s-sub">inherits</text>

  <rect x="140" y="138" width="166" height="38" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="223" y="162" text-anchor="middle" class="s-mono" style="font-size:10px">class FileReader</text>

  <rect x="34" y="196" width="380" height="52" rx="7" style="fill:none;stroke:var(--crit)" stroke-width="1.3" stroke-dasharray="4 3"/>
  <text x="224" y="218" text-anchor="middle" class="s-mono" style="font-size:10px">io.BytesIO — has read(), does NOT inherit</text>
  <text x="224" y="238" text-anchor="middle" class="s-sub" style="fill:var(--crit)">rejected, and you cannot change io</text>

  <rect x="468" y="26" width="418" height="240" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="488" y="52" class="s-label" style="fill:var(--accent-ink)">STRUCTURAL — Protocol</text>

  <rect x="594" y="66" width="166" height="38" rx="7" style="fill:none;stroke:var(--accent-line)" stroke-width="1.3"/>
  <text x="677" y="90" text-anchor="middle" class="s-mono" style="font-size:10px">class Reader(Protocol)</text>

  <text x="677" y="126" text-anchor="middle" class="s-sub">no inheritance needed</text>

  <rect x="500" y="138" width="166" height="38" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="583" y="162" text-anchor="middle" class="s-mono" style="font-size:10px">class FileReader</text>

  <rect x="688" y="138" width="166" height="38" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="771" y="162" text-anchor="middle" class="s-mono" style="font-size:10px">io.BytesIO</text>

  <rect x="488" y="196" width="380" height="52" rx="7" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="678" y="218" text-anchor="middle" class="s-sub" style="fill:var(--good)">both accepted — they have read()</text>
  <text x="678" y="238" text-anchor="middle" class="s-sub">and so does your two-line test double</text>
</svg>`
    },

    { t: "code", lang: "python", title: "a Protocol is a shape", code: `
from typing import Protocol, runtime_checkable


class SupportsRead(Protocol):
    def read(self, size: int = -1) -> bytes: ...


def load(source: SupportsRead) -> dict:
    return json.loads(source.read())


# All of these type-check. None of them import SupportsRead.
load(open("data.json", "rb"))
load(io.BytesIO(b'{"a": 1}'))
load(gzip.open("data.json.gz"))
load(FakeSource(b'{"a": 1}'))          # a two-line test double


@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...


isinstance(some_object, Closeable)     # only with @runtime_checkable
`,
      caption: "**The protocol lives with the consumer, not the implementations.** That inverts the dependency: your function declares what it needs, and anything meeting it qualifies — including classes written before your protocol existed (Lesson 4.9)."
    },

    { t: "callout", kind: "warn", title: "`runtime_checkable` checks names, not signatures", body: [
      { t: "code", lang: "python", title: "what isinstance actually verifies", numbered: false, code: `
@runtime_checkable
class Reader(Protocol):
    def read(self, size: int = -1) -> bytes: ...


class Wrong:
    def read(self, a, b, c, d):        # completely different signature
        ...

isinstance(Wrong(), Reader)            # True. Only the NAME is checked.`,
        out: `True`},
      { t: "p", text: "`isinstance` against a runtime-checkable protocol verifies that the attributes exist — nothing about their signatures, and for non-method members nothing at all until 3.12. It is a weaker check than it looks." },
      { t: "p", text: "**Use it sparingly.** The static check is the real one; a runtime `isinstance` on a protocol is appropriate for a plugin loader validating something it just imported, and misleading almost everywhere else." }
    ]},

    { t: "callout", kind: "tradeoff", title: "Protocol or ABC?", body: [
      { t: "table",
        head: ["", "`Protocol`", "`ABC`"],
        rows: [
          ["Implementations must inherit", "No", "**Yes**"],
          ["Works with types you do not own", "**Yes**", "Only via `register()`"],
          ["Can provide shared implementation", "Only defaults, awkwardly", "**Yes** — concrete methods, `__init__`"],
          ["Missing method caught", "At the call site, statically", "**At instantiation**, at runtime"],
          ["Discoverability", "Weaker — no link from class to protocol", "Strong — the base class names it"],
          ["Best for", "Describing what a **consumer** needs", "A **family** of classes sharing behaviour"]
        ]
      },
      { t: "p", text: "**Default to `Protocol` for interfaces and `ABC` for hierarchies.** \"Anything I can read from\" is a protocol; \"every payment provider, sharing this retry logic and this validation\" is an abstract base class." },
      { t: "p", text: "You can have both: an ABC that also satisfies a protocol, letting your own classes inherit shared behaviour while third-party ones still qualify structurally." }
    ]},

    { t: "h2", n: "02", text: "Generics", id: "generics" },

    { t: "code", lang: "python", title: "the 3.12 syntax, and what it replaced", code: `
# Python 3.12+
def first[T](items: Sequence[T]) -> T | None:
    return items[0] if items else None


class Repository[T]:
    def __init__(self) -> None:
        self._items: dict[str, T] = {}

    def add(self, key: str, item: T) -> None:
        self._items[key] = item

    def get(self, key: str) -> T | None:
        return self._items.get(key)


# Before 3.12 -- still valid, and what you will see in older code
from typing import Generic, TypeVar

T = TypeVar("T")

def first_old(items: Sequence[T]) -> T | None: ...

class RepositoryOld(Generic[T]): ...


users: Repository[User] = Repository()
users.add("u1", User("ada"))
user = users.get("u1")                 # inferred as User | None
users.add("u2", Order(...))            # mypy: expected User
`,
      hl: [2, 6, 22],
      caption: "**The type variable is what makes this different from `Any`.** `first(list[int])` returns `int | None`, not `Any` — the relationship between the argument and the return survives the call."
    },

    { t: "code", lang: "python", title: "bounded and constrained", code: `
from decimal import Decimal


# BOUND: T is anything that is a Comparable (or a subclass)
def largest[T: Comparable](items: Sequence[T]) -> T:
    return max(items)


# CONSTRAINED: T is exactly one of these, not a common base
def add[T: (int, Decimal)](a: T, b: T) -> T:
    return a + b

add(1, 2)                    # T = int
add(Decimal(1), Decimal(2))  # T = Decimal
add(1, Decimal(2))           # mypy: cannot infer -- and correctly so,
                             # since mixing them is exactly the bug


# The old spellings, for reference:
#   T = TypeVar("T", bound=Comparable)      -- bound
#   T = TypeVar("T", int, Decimal)          -- constrained
`,
      caption: "**A bound accepts subclasses; constraints do not.** `T: (int, Decimal)` means T is `int` *or* `Decimal` and never a union of them — which is exactly what you want for money arithmetic (Lesson 2.6)."
    },

    { t: "h2", n: "03", text: "Variance", id: "variance" },

    {"kind": "compare", "title": "Variance, on list and Sequence", "caption": "list is invariant: a list[Dog] is not a list[Animal], because the callee could append a Cat. Sequence is covariant: read-only, so the substitution is safe. Callable is contravariant in its arguments.", "columns": [{"title": "invariant · list[T]", "tone": "crit", "items": ["list[Dog] ≠ list[Animal]", "mutable — writes could break it"]}, {"title": "covariant · Sequence[T]", "tone": "good", "items": ["Sequence[Dog] ≤ Sequence[Animal]", "read-only, so safe"]}, {"title": "contravariant · Callable[[T], R]", "tone": "accent", "items": ["a handler of Animal accepts Dog", "arguments flip the direction"]}], "t": "diagram", "id": "dg-8_4-03-0"},



    { t: "p", text: "If `Dog` is an `Animal`, is `list[Dog]` a `list[Animal]`? **No** — and the reason is worth understanding, because it explains half the confusing errors people hit with generics." },

    { t: "code", lang: "python", title: "why mutability forbids it", code: `
def feed_all(animals: list[Animal]) -> None:
    animals.append(Cat())            # legal: a Cat IS an Animal


dogs: list[Dog] = [Dog()]
feed_all(dogs)                       # if this were allowed...
dogs[1].bark()                       # ...there is now a Cat in dogs
`,
      out: `error: Argument 1 has incompatible type "list[Dog]"; expected "list[Animal]"`,
      caption: "The checker rejects the call, not the `append`. **A mutable container must be invariant** because it is both a producer and a consumer of its element type."
    },

    { t: "table",
      head: ["Variance", "Means", "Applies to", "Example"],
      rows: [
        ["**Invariant**", "Exactly this type", "Anything mutable", "`list[T]`, `dict[K, V]`, `set[T]`"],
        ["**Covariant**", "This type or a subtype", "Read-only producers", "`Sequence[T]`, `Iterable[T]`, `frozenset[T]`, a return type"],
        ["**Contravariant**", "This type or a supertype", "Consumers", "A `Callable` parameter — `Callable[[Animal], None]` is usable where `Callable[[Dog], None]` is wanted"]
      ],
      caption: "**This is the deep reason to annotate parameters as `Sequence`**: `Sequence` is covariant, so `Sequence[Dog]` *is* a `Sequence[Animal]` and your function accepts far more callers than `list[Animal]` would (Lesson 8.3)."
    },

    { t: "callout", kind: "insight", title: "In 3.12 the checker infers variance for you", body: [
      { t: "code", lang: "python", title: "no more covariant=True", numbered: false, code: `
# 3.12+: variance is inferred from how the parameter is used
class Box[T]:
    def get(self) -> T: ...          # T only produced -> covariant

# Pre-3.12: declared by hand, and getting it wrong was easy
T_co = TypeVar("T_co", covariant=True)
class BoxOld(Generic[T_co]):
    def get(self) -> T_co: ...`},
      { t: "p", text: "You still need to understand variance to read the errors — but the days of `T_co` and `T_contra` suffixes and manually reasoning about which to use are over for new code." }
    ]},

    { t: "h2", n: "04", text: "TypedDict", id: "typeddict" },

    { t: "code", lang: "python", title: "a shape for data you did not construct", code: `
from typing import NotRequired, ReadOnly, TypedDict


class Order(TypedDict):
    id: str
    total: int
    note: NotRequired[str]           # may be absent
    created_at: ReadOnly[str]        # 3.13: present, never reassigned


def describe(order: Order) -> str:
    print(order["id"])               # checked: exists, is a str
    print(order["totl"])             # mypy: TypedDict has no key "totl"
    print(order["note"])             # mypy: key "note" may be absent
    return order.get("note", "")     # fine


o: Order = {"id": "1", "total": 100, "created_at": "2026-01-01"}
o["total"] = "free"                  # mypy: expected int
`,
      hl: [8, 15, 16],
      caption: "**A `TypedDict` is a plain `dict` at runtime** — no class, no validation, no cost. It exists purely so the checker can verify keys and value types on data that arrives as JSON."
    },

    { t: "callout", kind: "tradeoff", title: "TypedDict, dataclass, or Pydantic model?", body: [
      { t: "table",
        head: ["", "`TypedDict`", "`@dataclass`", "Pydantic model"],
        rows: [
          ["Runtime type", "`dict`", "A class instance", "A class instance"],
          ["Validates at runtime", "**No**", "No", "**Yes**"],
          ["Attribute access", "`d[\"key\"]`", "`obj.key`", "`obj.key`"],
          ["Methods and properties", "No", "Yes", "Yes"],
          ["Cost", "Zero", "Small", "Real, but usually worth it"],
          ["Best for", "JSON you receive and pass on", "Your own domain objects", "**Untrusted input at a boundary**"]
        ]
      },
      { t: "p", text: "**The deciding question is whether you construct it.** Data you merely receive and forward — an API response, a queue message in transit — is a `TypedDict`. Data you build and reason about is a dataclass. Data crossing a trust boundary needs runtime validation, which only the third gives you (Lesson 6.5)." },
      { t: "p", text: "A `TypedDict` also has no `__init__` to enforce anything: a value that arrives as `{\"total\": \"free\"}` type-checks in your annotations and is still a string at runtime." }
    ]},

    { t: "h2", n: "05", text: "Self and generic self", id: "self" },

    { t: "code", lang: "python", title: "the type that follows subclasses", code: `
from typing import Self


class QueryBuilder:
    def where(self, **conditions) -> Self:      # not "QueryBuilder"
        self._conditions.update(conditions)
        return self

    def limit(self, n: int) -> Self:
        self._limit = n
        return self


class OrderQuery(QueryBuilder):
    def paid(self) -> Self:
        return self.where(status="paid")


# With Self, this chain type-checks. Annotated "-> QueryBuilder", the
# checker loses the subclass after the first call and .paid() is an error.
OrderQuery().where(region="eu").limit(10).paid()
`,
      caption: "`Self` is what a fluent interface, a `from_row` classmethod, or a `copy()` method needs. Before 3.11 this required a bound `TypeVar` on the method — `Self` says it directly."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A typed plugin system",
      difficulty: "expert",
      minutes: 34,
      body: [
        { t: "p", text: "Design the typing for an export system: several exporters, each producing a different output type, discovered by name and driven by a shared runner. The interesting constraint is that **exporters live in third-party packages you do not control**, so they cannot inherit from anything of yours." },
        { t: "p", text: "The typing must be strong enough that the runner cannot silently hand a CSV exporter a Parquet destination." }
      ],
      requirements: [
        "An exporter interface that a class in another package satisfies without importing yours.",
        "A generic result type, so `run(csv_exporter)` is known to produce `CsvResult`.",
        "The registry keyed by name, with a runtime check when a plugin is loaded.",
        "A `TypedDict` for the configuration each exporter receives, with optional keys.",
        "A `Self`-returning builder for constructing a run configuration.",
        "Explain your variance choice for the collection of records passed to an exporter.",
        "Tests that fail type checking on the wrong combination, using `assert_type` or `reveal_type`."
      ],
      hint: "For the generic result, the protocol itself needs a type parameter. For the runtime check, remember what `runtime_checkable` does and does not verify.",
      solution: {
        lang: "python",
        title: "plugins.py",
        code: `from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import (
    NotRequired,
    Protocol,
    Self,
    TypedDict,
    assert_type,
    runtime_checkable,
)


# =========================================================================
# THE RECORD AND THE CONFIG
# =========================================================================

class Record(TypedDict):
    """Data we RECEIVE and forward, never construct -- so a TypedDict.

    It is a plain dict at runtime: no class, no validation, no cost.
    That is the right trade for something that arrives as parsed JSON
    and is handed straight to an exporter.
    """
    id: str
    fields: Mapping[str, object]
    tags: NotRequired[Sequence[str]]        # may be absent


class ExportConfig(TypedDict):
    destination: str
    compress: NotRequired[bool]
    partition_by: NotRequired[str]


# =========================================================================
# THE PROTOCOL -- generic in its result type
# =========================================================================

@dataclass(frozen=True, slots=True)
class ExportResult:
    location: str
    rows: int


@dataclass(frozen=True, slots=True)
class CsvResult(ExportResult):
    delimiter: str


@dataclass(frozen=True, slots=True)
class ParquetResult(ExportResult):
    compression: str


class Exporter[R: ExportResult](Protocol):
    """A structural interface: a third-party class satisfies this
    WITHOUT importing us, which is the entire requirement.

    Generic in R, so run() can promise the concrete result type rather
    than the base -- run(csv) is known to give a CsvResult.

    VARIANCE: records is Sequence[Record], not list[Record].
    Sequence is covariant and read-only, which means
      - a caller may pass a tuple, a list, or any sequence
      - an exporter CANNOT append to our collection
    list would be invariant AND mutable: fewer accepted callers, and a
    plugin could mutate data belonging to the runner.
    """

    name: str

    def export(self, records: Sequence[Record], config: ExportConfig) -> R: ...


# ---- an implementation that never imports Exporter ----------------------

class CsvExporter:
    """Deliberately imports nothing from this module. It qualifies
    because its shape matches -- that is structural typing."""

    name = "csv"

    def export(self, records: Sequence[Record], config: ExportConfig) -> CsvResult:
        return CsvResult(
            location=config["destination"],
            rows=len(records),
            delimiter=",",
        )


class ParquetExporter:
    name = "parquet"

    def export(self, records: Sequence[Record], config: ExportConfig) -> ParquetResult:
        return ParquetResult(
            location=config["destination"],
            rows=len(records),
            compression="snappy" if config.get("compress", True) else "none",
        )


# =========================================================================
# THE RUNNER -- generic, so the result type survives the call
# =========================================================================

def run[R: ExportResult](
    exporter: Exporter[R],
    records: Sequence[Record],
    config: ExportConfig,
) -> R:
    """R is bound by the exporter argument and reappears in the return,
    so the relationship between input and output is preserved.

    Annotated "-> ExportResult" instead, every caller would have to
    cast to reach delimiter or compression -- which is the Any-shaped
    hole this design exists to close (Lesson 8.3).
    """
    return exporter.export(records, config)


# =========================================================================
# THE REGISTRY -- names are runtime data, so a runtime check is needed
# =========================================================================

@runtime_checkable
class ExporterLike(Protocol):
    """A non-generic, runtime-checkable twin used ONLY at load time.

    Two caveats that matter:
      - isinstance against a protocol checks that the ATTRIBUTES EXIST,
        not their signatures. A class with export(self, a, b, c, d)
        passes. It is a smoke test, not verification.
      - a generic protocol cannot be runtime_checkable, which is why
        this is separate from Exporter[R].
    """

    name: str

    def export(self, records, config): ...


_REGISTRY: dict[str, Exporter[ExportResult]] = {}


def register(exporter: object) -> None:
    """Called with something just imported by name -- hence object, and
    hence the explicit check. The static type system cannot help with a
    value that did not exist at check time (Lesson 7.4)."""
    if not isinstance(exporter, ExporterLike):
        raise TypeError(
            f"{type(exporter).__name__} does not look like an exporter: "
            "it needs a 'name' attribute and an 'export' method"
        )
    if not isinstance(exporter.name, str) or not exporter.name:
        raise ValueError("exporter.name must be a non-empty string")

    _REGISTRY[exporter.name] = exporter          # type: ignore[assignment]


def get(name: str) -> Exporter[ExportResult]:
    try:
        return _REGISTRY[name]
    except KeyError:
        raise LookupError(
            f"no exporter named {name!r}; known: {sorted(_REGISTRY)}"
        ) from None


# =========================================================================
# THE BUILDER -- Self, so subclasses keep their type through a chain
# =========================================================================

@dataclass
class RunSpec:
    records: Sequence[Record] = ()
    config: ExportConfig = field(
        default_factory=lambda: ExportConfig(destination="")
    )

    def with_records(self, records: Sequence[Record]) -> Self:
        self.records = records
        return self

    def to(self, destination: str) -> Self:
        self.config = {**self.config, "destination": destination}
        return self

    def compressed(self, enabled: bool = True) -> Self:
        self.config = {**self.config, "compress": enabled}
        return self


class NightlyRunSpec(RunSpec):
    def partitioned_by(self, column: str) -> Self:
        self.config = {**self.config, "partition_by": column}
        return self


# =========================================================================
# TESTS -- static assertions plus runtime behaviour
# =========================================================================

RECORDS: list[Record] = [{"id": "1", "fields": {"a": 1}}]
CONFIG: ExportConfig = {"destination": "s3://bucket/out"}


def test_result_type_survives_the_call() -> None:
    """THE generic requirement. Without R, both of these would be
    ExportResult and reaching .delimiter would need a cast."""
    csv_result = run(CsvExporter(), RECORDS, CONFIG)
    parquet_result = run(ParquetExporter(), RECORDS, CONFIG)

    assert_type(csv_result, CsvResult)
    assert_type(parquet_result, ParquetResult)

    assert csv_result.delimiter == ","          # no cast needed
    assert parquet_result.compression == "snappy"


def test_third_party_class_satisfies_the_protocol() -> None:
    """CsvExporter imports nothing from this module. Structural typing
    is the only thing that makes that possible."""
    import inspect

    source = inspect.getsource(CsvExporter)
    assert "Exporter" not in source             # no inheritance, no import
    assert isinstance(CsvExporter(), ExporterLike)


def test_sequence_means_a_tuple_works_and_mutation_does_not() -> None:
    """The variance choice, as a test.

    Sequence is covariant and read-only:
      - a tuple is accepted where list[Record] would be rejected
      - the exporter has no .append, so mypy stops a plugin mutating
        data the runner owns
    """
    result = run(CsvExporter(), tuple(RECORDS), CONFIG)
    assert result.rows == 1


def test_typed_dict_catches_key_and_value_mistakes() -> None:
    good: ExportConfig = {"destination": "s3://x", "compress": True}
    assert good["destination"] == "s3://x"

    # Each of these is a mypy error, verified by the type-check job:
    #   bad: ExportConfig = {"destintaion": "s3://x"}     typo
    #   bad: ExportConfig = {"destination": 42}           wrong type
    #   bad: ExportConfig = {"compress": True}            missing required
    #
    # None of them raise at runtime -- a TypedDict is a plain dict, with
    # no __init__ to enforce anything. That is the trade.
    assert isinstance(good, dict)


def test_optional_keys_need_get_not_subscript() -> None:
    config: ExportConfig = {"destination": "s3://x"}

    #   config["compress"]      mypy: key may be absent
    assert config.get("compress", True) is True


def test_registry_rejects_something_that_is_not_an_exporter() -> None:
    class NotAnExporter:
        name = "nope"

    import pytest

    with pytest.raises(TypeError, match="does not look like an exporter"):
        register(NotAnExporter())


def test_runtime_check_is_weaker_than_it_looks() -> None:
    """Documents the limitation honestly: isinstance against a protocol
    checks attribute EXISTENCE, not signatures."""
    class WrongSignature:
        name = "wrong"

        def export(self, a, b, c, d):        # nothing like the protocol
            ...

    assert isinstance(WrongSignature(), ExporterLike)     # passes!
    # Which is why the static protocol is the real contract, and this
    # check is only a smoke test for dynamically loaded code.


def test_builder_keeps_the_subclass_through_a_chain() -> None:
    """Self, not RunSpec: annotated as the base class, the checker
    would lose NightlyRunSpec after the first call and .partitioned_by
    would be an error."""
    spec = (
        NightlyRunSpec()
        .with_records(RECORDS)
        .to("s3://bucket/nightly")
        .compressed()
        .partitioned_by("region")           # only reachable thanks to Self
    )

    assert_type(spec, NightlyRunSpec)
    assert spec.config["partition_by"] == "region"`,
        notes: [
          { t: "p", text: "**The protocol living with the consumer is what makes third-party exporters possible.** `CsvExporter` imports nothing from this module and still satisfies the interface — the test asserts that literally, by checking the source. An ABC would require every plugin author to depend on your package." },
          { t: "p", text: "**Making the protocol generic is what preserves the result type.** Annotated `-> ExportResult`, every caller reaching `.delimiter` would need a cast, and casts are where type safety quietly ends. `Exporter[R]` plus `run[R]` keeps the relationship between the argument and the return." },
          { t: "p", text: "**`Sequence[Record]` is the load-bearing variance decision.** It is covariant, so callers may pass a tuple or a narrower sequence, and it is read-only, so a plugin cannot append to data the runner owns. `list[Record]` would be invariant *and* mutable — worse on both axes." },
          { t: "callout", kind: "trap", title: "The registry needs a runtime check the type system cannot give", body: [
            { t: "p", text: "A plugin loaded by name did not exist when the checker ran, so its type is `object` and no annotation helps. `runtime_checkable` gives a smoke test — and only a smoke test, since `isinstance` against a protocol verifies that attributes exist and nothing about their signatures." },
            { t: "p", text: "Documenting that honestly in a test is better than pretending the check is verification. The real contract is the static protocol; the runtime check exists to turn a confusing `AttributeError` deep in the run into a clear error at load time." }
          ]},
          { t: "p", text: "**`Self` on the builder is what lets a subclass method appear after inherited ones in a chain.** Annotated `-> RunSpec`, the checker forgets it is a `NightlyRunSpec` after the first call and `.partitioned_by` becomes an error — for a fluent API that is the difference between usable and not." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A platform team publishes an ABC, `BaseStorageBackend`, that every storage plugin must subclass. Two years later they have eleven backends and a persistent complaint: teams cannot use the SDK objects their cloud provider ships, because those classes cannot inherit from an internal base." },
      { t: "p", text: "**Every team writes an adapter class** that subclasses the ABC and forwards each method to the SDK object. Eleven adapters, all identical in shape, all needing updating whenever the ABC gains a method." },
      { t: "p", text: "**Replacing the ABC with a `Protocol` deleted all eleven.** The SDK objects already had `upload`, `download` and `delete` with compatible signatures — they simply were not allowed to say so. The protocol describes what the platform *needs*, and anything with that shape now qualifies." },
      { t: "p", text: "**The ABC was not wrong, it was misplaced.** It stayed, as an optional base providing shared retry and logging behaviour for teams who wanted it — but the *interface* the platform depends on became structural. Depend on shape at boundaries you do not control; use inheritance for behaviour you are choosing to share (Lesson 4.9)." }
    ]}
  ],

  takeaways: [
    "**A `Protocol` checks shape, not ancestry**, so a class you do not own — a stdlib object, an SDK type, a two-line test double — can satisfy it without importing anything of yours.",
    "**The protocol belongs with the consumer.** Your function declares what it needs, which inverts the dependency and removes the adapter classes an ABC forces.",
    "**`runtime_checkable` verifies attribute existence, not signatures.** A class with a completely different `export` signature passes `isinstance`.",
    "**Protocol for interfaces, ABC for hierarchies.** \"Anything I can read from\" is structural; \"every provider sharing this retry logic\" is a base class.",
    "**A `TypeVar` preserves the relationship between arguments and returns**, which is what distinguishes a generic from `Any`.",
    "**A bound accepts subclasses; constraints do not.** `T: (int, Decimal)` means one or the other and never a mix — which is exactly right for money.",
    "**Mutable containers are invariant**: `list[Dog]` is not a `list[Animal]`, because a function taking the latter could append a `Cat`.",
    "**`Sequence` and `Iterable` are covariant**, so `Sequence[Dog]` *is* a `Sequence[Animal]` — the deep reason to prefer them in parameters.",
    "**Python 3.12 infers variance** from how a parameter is used, so `T_co` and `covariant=True` are no longer needed in new code.",
    "**A `TypedDict` is a plain dict at runtime** — zero cost, zero validation. It types data you receive; a dataclass models data you construct.",
    "**Use a validating model at a trust boundary.** A `TypedDict` annotation does not stop `{\"total\": \"free\"}` arriving as a string.",
    "**`Self` keeps a subclass's type through a method chain**, which is what makes fluent interfaces and `from_row` classmethods type correctly."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does a `Protocol` remove the adapter classes an ABC requires for third-party objects?",
        options: [
          "Protocols are checked at runtime and ABCs are not",
          "A Protocol matches on structure, so an SDK class that already has the right methods qualifies without importing or inheriting anything",
          "Protocols allow multiple inheritance",
          "ABCs cannot declare abstract methods with arguments"
        ],
        answer: 1,
        why: "An ABC demands ancestry, and you cannot make a cloud provider's SDK class inherit from your internal base — so every team writes a forwarding adapter. A Protocol describes what the consumer needs, so anything with matching methods satisfies it. The ABC is still right for sharing behaviour among classes you own; it is the wrong tool for an interface at a boundary you do not control."
      },
      {
        stem: "Why is `list[Dog]` not acceptable where `list[Animal]` is expected?",
        options: [
          "Because Python containers are untyped at runtime",
          "A function taking `list[Animal]` may append a `Cat`, which would corrupt the caller's `list[Dog]` — mutable containers must be invariant",
          "Because `Dog` and `Animal` have different memory layouts",
          "It is accepted; only the reverse is rejected"
        ],
        answer: 1,
        why: "A mutable container both produces and consumes its element type, so allowing subtype substitution would let a legal `append` insert the wrong type into the caller's list. `Sequence[T]` is covariant precisely because it is read-only: `Sequence[Dog]` *is* a `Sequence[Animal]`, which is the deep reason to prefer `Sequence` in parameters."
      },
      {
        stem: "A class has `def export(self, a, b, c, d)`. Does `isinstance(obj, MyRuntimeCheckableProtocol)` pass?",
        options: [
          "No — the signature does not match",
          "Yes — `isinstance` against a protocol checks only that the named attributes exist, not their signatures",
          "No — protocols cannot be used with `isinstance` at all",
          "Only if the protocol declares `__slots__`"
        ],
        answer: 1,
        why: "`runtime_checkable` enables a name-based check and nothing more. It is useful as a smoke test for a plugin you just imported by name — turning a confusing `AttributeError` deep in a run into a clear error at load time — and it is not verification. The static protocol is the real contract."
      },
      {
        stem: "When is a `TypedDict` the right choice over a dataclass?",
        options: [
          "Whenever the object has more than five fields",
          "For data you receive and forward rather than construct — parsed JSON, a message in transit — where a plain dict at runtime is what you actually want",
          "When the data must be validated at runtime",
          "When the fields are all strings"
        ],
        answer: 1,
        why: "A `TypedDict` is a plain dict with no class, no cost and no validation, so it types data that arrives already in dict form and gets passed on. Construct your own domain objects as dataclasses, where you get attribute access, methods and `__post_init__`. At a trust boundary you need something that validates at runtime — an annotation does not stop `{\"total\": \"free\"}` from being a string."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "When would you use a `Protocol` instead of an abstract base class?",
        strong: "When describing what a consumer needs, especially at a boundary involving types you do not own. A Protocol matches on structure, so a stdlib object or a vendor SDK class qualifies without importing anything of yours.",
        answer: [
          { t: "p", text: "The adapter-class story makes it concrete: an ABC forces every team to write a forwarding wrapper around objects that already had the right methods." },
          { t: "p", text: "Keeping the ABC's role clear is what makes the answer balanced — inheritance is still right for a family of classes sharing real behaviour, and the two can coexist." },
          { t: "p", text: "Knowing that `runtime_checkable` only checks attribute existence, not signatures, prevents over-claiming what the runtime check buys." }
        ]
      },
      {
        level: "expert",
        q: "Explain variance, and why it matters in practice.",
        strong: "It is whether a generic type follows its parameter's subtyping. Mutable containers are invariant — `list[Dog]` is not a `list[Animal]`, because a function taking the latter could append a `Cat`. Read-only ones like `Sequence` are covariant.",
        answer: [
          { t: "p", text: "The practical payoff is the part to lead into: it is the real reason to annotate parameters as `Sequence` rather than `list`, since covariance means far more callers are accepted." },
          { t: "p", text: "Contravariance for callable parameters completes the picture — a handler taking `Animal` is usable where one taking `Dog` is required." },
          { t: "p", text: "Mentioning that 3.12 infers variance shows currency: the `T_co` and `covariant=True` era is over for new code, though you still need the concept to read the errors." }
        ]
      },
      {
        level: "advanced",
        q: "`TypedDict`, dataclass, or a validating model?",
        strong: "`TypedDict` for data you receive and forward — it is a plain dict at runtime with zero cost. A dataclass for objects you construct and reason about. A validating model wherever untrusted data enters, because only that checks at runtime.",
        answer: [
          { t: "p", text: "\"Do you construct it?\" is the clean deciding question, and stating it that way shows the distinction is understood rather than memorised." },
          { t: "p", text: "The limitation worth naming: a `TypedDict` has no `__init__`, so `{\"total\": \"free\"}` type-checks in annotations and is still a string at runtime." },
          { t: "p", text: "Connecting it back to validating at the boundary ties the answer to a real design principle rather than leaving it as a feature comparison." }
        ]
      }
    ]
  }
});
