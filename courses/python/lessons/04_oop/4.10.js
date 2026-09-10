/* ============================================================================
   LESSON 4.10 — Dataclasses
   ========================================================================= */
EC.receiveLesson({
  id: "4.10",

  lede: "Most classes are data with a little behaviour, and writing `__init__`, `__repr__` and `__eq__` by hand for them is boilerplate that hides the interesting parts. `@dataclass` generates all three from your annotations — and more importantly, **`frozen=True` gets the `__eq__`/`__hash__` pairing right by construction**, which Lesson 4.9 showed is the thing people get wrong when they write it themselves.",

  objectives: [
    "Generate `__init__`, `__repr__`, `__eq__` and ordering from field declarations",
    "Use `field()` correctly for mutable defaults, exclusions and metadata",
    "Choose between `frozen`, `slots`, `order` and `kw_only` on real criteria",
    "Validate and derive values in `__post_init__`",
    "Choose between a dataclass, a `NamedTuple` and a Pydantic model"
  ],

  prerequisites: ["4.1", "4.9"],

  blocks: [

    { t: "h2", n: "01", text: "What it generates", id: "generates" },


    { t: "viz",
      title: "What @dataclass writes for you",
      caption: "Six methods from one decorator. The value is not the typing saved — it is that every one is generated consistently, so equality and repr cannot drift from the field list.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="A dataclass declaration expanding into the methods the decorator generates">
  <rect x="24" y="46" width="300" height="120" rx="8" style="fill:var(--accent);fill-opacity:.13;stroke:var(--accent)" stroke-width="2"/>
  <text x="44" y="74"  class="s-sub" style="fill:var(--ink-3)">@dataclass(frozen=True)</text>
  <text x="44" y="98"  class="s-label" style="fill:var(--accent)">class Point:</text>
  <text x="60" y="122" class="s-sub" style="fill:var(--ink-2)">x: float</text>
  <text x="60" y="144" class="s-sub" style="fill:var(--ink-2)">y: float</text>

  <line x1="330" y1="106" x2="420" y2="106" style="stroke:var(--good);stroke-width:2" marker-end="url(#dc-a)"/>
  <text x="336" y="96" class="s-sub" style="fill:var(--good)">generates</text>

  <g class="s-sub" style="fill:var(--ink-2)">
    <text x="440" y="66">__init__</text>
    <text x="440" y="90">__repr__</text>
    <text x="440" y="114">__eq__</text>
    <text x="640" y="66">__hash__   (frozen only)</text>
    <text x="640" y="90">__setattr__ blocked</text>
    <text x="640" y="114">fields() metadata</text>
  </g>

  <text x="440" y="150" class="s-sub" style="fill:var(--crit)">order=True adds the four comparison methods too</text>

  <text x="24" y="200" class="s-sub" style="fill:var(--ink-3)">A mutable default is the one trap: use field(default_factory=list), never = [], or every instance shares one list.</text>
</svg>`
    },
    { t: "code", lang: "python", title: "twenty lines become five", code: `
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class Order:
    order_id: str
    total: Decimal
    status: str = "pending"          # defaults come after non-defaults


o = Order("o-1", Decimal("19.99"))
print(o)
print(o == Order("o-1", Decimal("19.99")))
print(o.status)
`,
      out: `Order(order_id='o-1', total=Decimal('19.99'), status='pending')
True
pending`,
      caption: "`__init__`, `__repr__` and `__eq__` are generated from the annotations. The `__repr__` follows the Lesson 4.9 convention — it looks like the call that would recreate the object."
    },

    { t: "callout", kind: "insight", title: "Annotations are the declaration", body: [
      { t: "p", text: "A dataclass reads the class body's **annotations**, not its assignments. That has one consequence worth knowing:" },
      { t: "code", lang: "python", title: "an unannotated name is not a field", numbered: false, code: `
@dataclass
class Config:
    host: str = "localhost"      # a FIELD -- goes in __init__
    port = 8080                  # a plain CLASS ATTRIBUTE -- does not


print(Config().port)             # 8080, shared by every instance
print(Config.__dataclass_fields__.keys())`,
        out: `8080
dict_keys(['host'])`},
      { t: "p", text: "Forgetting the annotation is a common and quiet bug: the value becomes a mutable-class-attribute (Lesson 4.2) shared across instances, and it silently disappears from `__init__`, `__repr__` and `__eq__`. If a field is missing from the generated `repr`, check its annotation first." }
    ]},

    { t: "h2", n: "02", text: "field(), and the mutable default", id: "field" },

    { t: "code", lang: "python", title: "the error dataclasses raise for you", code: `
from dataclasses import dataclass, field


@dataclass
class Cart:
    items: list[str] = []            # dataclasses REFUSE this
`,
      out: `ValueError: mutable default <class 'list'> for field items is not
allowed: use default_factory`,
      caption: "This is the mutable-default trap from Lesson 1.4, and dataclasses are one of the few places Python catches it for you — at class-definition time, with a message naming the fix."
    },

    { t: "code", lang: "python", title: "the field() options you will use", code: `
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4


@dataclass
class Job:
    name: str

    # A NEW object per instance -- the factory is called each time
    tags: list[str] = field(default_factory=list)

    # Any zero-argument callable works
    job_id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    # Excluded from __repr__ -- for secrets and large blobs
    api_key: str = field(default="", repr=False)

    # Excluded from __eq__ -- two jobs are equal regardless of timing
    duration_ms: float = field(default=0.0, compare=False)

    # Not a constructor parameter; set in __post_init__
    slug: str = field(init=False, default="")

    def __post_init__(self) -> None:
        self.slug = self.name.lower().replace(" ", "-")


j = Job("Nightly Import", api_key="secret-abc")
print(j)
print(j.slug)
`,
      out: `Job(name='Nightly Import', tags=[], job_id='...', created_at=datetime.datetime(...), duration_ms=0.0, slug='nightly-import')
nightly-import`,
      caption: "`repr=False` keeps the API key out of every log line and traceback — a genuine security measure, since `repr` is what appears when an exception carries the object. `compare=False` excludes timing from equality, so two runs of the same job compare equal."
    },

    { t: "h2", n: "03", text: "The four decorator options", id: "options" },

    { t: "table",
      head: ["Option", "Generates / does", "Use when"],
      rows: [
        ["`frozen=True`", "Blocks assignment, and adds `__hash__`", "**Value objects.** Anything used as a dict key, a set member, or shared as a default"],
        ["`slots=True`", "Removes the per-instance `__dict__`", "Millions of instances, or you want attributes fixed at definition"],
        ["`order=True`", "`__lt__`, `__le__`, `__gt__`, `__ge__` from field order", "The natural sort really is field order — otherwise write `__lt__` by hand"],
        ["`kw_only=True`", "Every field becomes keyword-only", "More than two or three fields (Lesson 3.2), or you need a default before a non-default"]
      ]
    },

    { t: "code", lang: "python", title: "frozen: the pairing, correct by construction", code: `
@dataclass(frozen=True, slots=True)
class Point:
    x: int
    y: int


p = Point(1, 2)
print({p, Point(1, 2)})          # one element -- __eq__ and __hash__ agree
print(p == Point(1, 2))

p.x = 5
`,
      out: `{Point(x=1, y=2)}
True
FrozenInstanceError: cannot assign to field 'x'`,
      caption: "This is the Lesson 4.9 discipline, generated. `frozen=True` produces `__hash__` from exactly the fields `__eq__` uses, and blocks the mutation that would make the hash stale. Without `frozen`, a dataclass gets `__eq__` and `__hash__ = None` — also correct, and the right default for a mutable type."
    },

    { t: "callout", kind: "trap", title: "`frozen` is shallow", body: [
      { t: "code", lang: "python", title: "the contents can still change", numbered: false, code: `
@dataclass(frozen=True)
class Config:
    hosts: list[str] = field(default_factory=list)


c = Config(["a", "b"])
c.hosts = []           # FrozenInstanceError, as expected
c.hosts.append("c")    # works -- the LIST is not frozen
print(c)
hash(c)`,
        out: `Config(hosts=['a', 'b', 'c'])
TypeError: unhashable type: 'list'`},
      { t: "p", text: "`frozen` blocks assignment to the *field*, not mutation of what the field points at — the same shallow-immutability limit as a tuple (Lesson 1.4). And because `__hash__` hashes the fields, a mutable field makes the whole object unhashable, defeating the main reason to freeze it." },
      { t: "p", text: "**Use immutable field types in a frozen dataclass:** `tuple[str, ...]` rather than `list[str]`, `frozenset` rather than `set`, and a nested frozen dataclass rather than a dict." }
    ]},

    { t: "code", lang: "python", title: "kw_only solves the default-ordering problem", code: `
# Without kw_only, this is a TypeError: a non-default field cannot
# follow a defaulted one.
#
#   @dataclass
#   class Event:
#       timestamp: datetime = field(default_factory=now)
#       name: str                    # TypeError at class definition


@dataclass(kw_only=True)             # 3.10+
class Event:
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    name: str                        # fine -- everything is keyword-only
    payload: dict = field(default_factory=dict)


Event(name="deploy.finished")
`,
      caption: "`kw_only=True` also delivers the Lesson 3.2 benefit: call sites document themselves, and you can add or reorder fields without breaking anyone. For a dataclass with more than three fields it should be close to the default choice."
    },

    { t: "h2", n: "04", text: "__post_init__ and derived values", id: "post-init" },

    { t: "code", lang: "python", title: "validation and computed fields", code: `
from dataclasses import dataclass, field


@dataclass(frozen=True)
class DateRange:
    start: date
    end: date
    days: int = field(init=False)        # derived, not a parameter

    def __post_init__(self) -> None:
        if self.end < self.start:
            raise ValueError(f"end {self.end} is before start {self.start}")

        # frozen blocks normal assignment, so derived fields need this:
        object.__setattr__(self, "days", (self.end - self.start).days)


r = DateRange(date(2024, 1, 1), date(2024, 1, 31))
print(r.days)
DateRange(date(2024, 2, 1), date(2024, 1, 1))
`,
      out: `30
ValueError: end 2024-01-01 is before start 2024-01-01`,
      caption: "`__post_init__` runs after the generated `__init__` has set every field, which is what makes cross-field validation possible. On a frozen instance, `object.__setattr__` is the escape hatch for setting a derived field — deliberately awkward, because it is bypassing the guarantee."
    },

    { t: "callout", kind: "good", title: "`replace()` is how you \"change\" a frozen instance", body: [
      { t: "code", lang: "python", title: "a new object, not a mutation", numbered: false, code: `
from dataclasses import replace, asdict, astuple

base = DateRange(date(2024, 1, 1), date(2024, 1, 31))
extended = replace(base, end=date(2024, 2, 29))

print(base.days, extended.days)     # 30 61 -- base untouched
print(asdict(base))                 # recursive dict, for JSON`,
        out: `30 61
{'start': datetime.date(2024, 1, 1), 'end': datetime.date(2024, 1, 31), 'days': 30}`},
      { t: "p", text: "`replace` calls `__init__` with the changed fields, so `__post_init__` runs again and the derived `days` is recomputed. That is the mechanism that keeps derived values honest — and it is why validation belongs in `__post_init__` rather than in a factory." },
      { t: "p", text: "`asdict()` recurses into nested dataclasses, lists and dicts, which makes it a convenient JSON step. It is genuinely deep-copying, so on a large object graph it is not free — `astuple()` has the same property." }
    ]},

    { t: "h2", n: "05", text: "Dataclass, NamedTuple or Pydantic", id: "choosing" },

    { t: "ladder",
      title: "Representing an API response",
      rungs: [
        { level: "bad", label: "A dict", why: "no shape, no checking",
          code: `def get_order(order_id: str) -> dict:
    return {"id": order_id, "total": "19.99", "status": "paid"}


order = get_order("o-1")
print(order["totl"])            # KeyError, at runtime, on a typo`,
          note: "Nothing describes the shape, so every access is a guess. A typo is a `KeyError` at runtime, mypy cannot help, and a reader has to find a producer to learn what keys exist. Fine inside three lines of one function; wrong the moment it crosses a boundary (Lesson 2.9)." },

        { level: "ok", label: "A dataclass", why: "shape, checking, no validation",
          code: `@dataclass(frozen=True, slots=True)
class Order:
    id: str
    total: Decimal
    status: str = "pending"


order = Order("o-1", Decimal("19.99"))
order.totl                       # mypy error, before the code runs`,
          note: "The shape is now declared and checked statically. What it does *not* do is validate at runtime: `Order(\"o-1\", \"not a number\")` constructs happily, because annotations are not enforced (Lesson 1.8). That is correct for internal data you construct yourself." },

        { level: "best", label: "Pydantic at the boundary", why: "runtime validation for untrusted data",
          code: `from pydantic import BaseModel, Field


class Order(BaseModel):
    id: str
    total: Decimal = Field(gt=0)
    status: Literal["pending", "paid", "refunded"] = "pending"


# Parses AND validates. A bad payload fails here, naming the field.
order = Order.model_validate(response.json())`,
          note: "At a trust boundary — an HTTP response, a queue message, a config file — you need the types checked at runtime, and Pydantic does that plus coercion, nested models and error messages carrying the field path. **The rule: dataclass for data you construct, Pydantic for data that arrives.** Lesson 12.3 covers it properly." }
      ]
    },

    { t: "table",
      head: ["", "`@dataclass`", "`NamedTuple`", "Pydantic `BaseModel`"],
      rows: [
        ["Mutable", "Yes (or `frozen=True`)", "**No**, ever", "Yes (or `frozen=True`)"],
        ["Runtime validation", "**No** — only `__post_init__` if you write it", "**No**", "**Yes**, and coercion"],
        ["Tuple behaviour — unpacking, indexing", "No", "**Yes**", "No"],
        ["Speed / memory", "Fast; `slots=True` is faster", "**Fastest**, lowest memory", "Slower — validation costs"],
        ["Dependency", "Standard library", "Standard library", "Third-party"],
        ["Best for", "Internal domain objects", "Small immutable records, function returns", "Trust boundaries: APIs, config, queues"]
      ],
      caption: "`NamedTuple` is underused for multi-value returns — `return Result(rows, skipped)` gives named access and still unpacks as `rows, skipped`, which a dataclass does not."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Replace 80 lines of boilerplate",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The hand-written class below is 80 lines of generated-code equivalents plus three real bugs. Convert it to a dataclass, keep the behaviour that genuinely needs code, and fix the bugs — two of which the dataclass fixes for you." }
      ],
      requirements: [
        "Identify the three bugs before converting, and say which the dataclass fixes automatically.",
        "Convert to a dataclass, choosing `frozen`, `slots`, `order` and `kw_only` deliberately and justifying each.",
        "Keep the secret out of `__repr__`.",
        "Exclude the timing field from equality.",
        "Move validation and the derived field into `__post_init__`.",
        "Write a test proving instances work as dict keys, and one proving the secret never appears in `repr` or in a traceback."
      ],
      hint: "The three bugs: a mutable default, an `__eq__`/`__hash__` mismatch, and a field that leaks into logs. Two are impossible in a dataclass.",
      solution: {
        lang: "python",
        title: "deployment.py",
        code: `# ---- the original: 80 lines, 3 bugs -------------------------------------

class Deployment:
    def __init__(self, service, version, regions=[], api_token="",
                 duration_ms=0.0):
        self.service = service
        self.version = version
        self.regions = regions            # BUG 1: mutable default, shared
        self.api_token = api_token
        self.duration_ms = duration_ms
        self.slug = f"{service}-{version}"

    def __repr__(self):
        return (f"Deployment(service={self.service!r}, "
                f"version={self.version!r}, regions={self.regions!r}, "
                f"api_token={self.api_token!r}, "     # BUG 3: leaks the token
                f"duration_ms={self.duration_ms!r})")

    def __eq__(self, other):
        if not isinstance(other, Deployment):
            return False                  # (should be NotImplemented)
        return (self.service == other.service
                and self.version == other.version
                and self.duration_ms == other.duration_ms)   # timing in ==

    def __hash__(self):
        return hash(self.service)         # BUG 2: fewer fields than __eq__

    def __lt__(self, other): ...          # and five more comparisons
    # ... 40 more lines


# THE THREE BUGS
#
# 1. regions=[] -- one list shared by every Deployment created without
#    an explicit value. Appending to one appends to all (Lesson 1.4).
#    THE DATACLASS FIXES THIS: it raises ValueError at class definition
#    and tells you to use default_factory.
#
# 2. __eq__ uses three fields, __hash__ uses one. Unequal deployments
#    collide constantly, degrading any dict keyed by them, and the two
#    definitions can drift further apart with every edit (Lesson 4.9).
#    THE DATACLASS FIXES THIS: frozen=True derives both from the same
#    field set, so they cannot disagree.
#
# 3. api_token appears in __repr__, so it reaches every log line and
#    every traceback that carries the object. NOT fixed automatically --
#    it needs field(repr=False).


# ---- the redesign -------------------------------------------------------

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import UTC, datetime


@dataclass(frozen=True, slots=True, kw_only=True, order=True)
class Deployment:
    """A completed deployment.

    frozen   -- it is a historical record: once a deployment has
                happened, its facts do not change. It also makes the
                eq/hash pairing correct by construction.
    slots    -- a deployment history holds many of these, and none of
                them need dynamic attributes.
    kw_only  -- five fields is past the point where positional order is
                readable (Lesson 3.2), and it lets deployed_at carry a
                default while service and version do not.
    order    -- sorting by (service, version) IS the natural order for
                a deployment history, so field order is the sort order.
    """

    service: str
    version: str

    # A NEW tuple per instance. tuple, not list: frozen is shallow, and
    # a list field would make the whole object unhashable.
    regions: tuple[str, ...] = ()

    # repr=False keeps it out of logs and tracebacks. compare=False
    # because two deployments are not different because of their token.
    api_token: str = field(default="", repr=False, compare=False)

    # Timing is a measurement, not part of what a deployment IS.
    duration_ms: float = field(default=0.0, compare=False)

    deployed_at: datetime = field(
        default_factory=lambda: datetime.now(UTC), compare=False
    )

    # Derived, so it cannot drift from its inputs (Lesson 4.4).
    slug: str = field(init=False, compare=False)

    def __post_init__(self) -> None:
        if not self.version:
            raise ValueError("version must not be empty")
        if not self.regions:
            raise ValueError(f"{self.service} must deploy to at least one region")

        # frozen blocks normal assignment, so a derived field needs this.
        object.__setattr__(self, "slug", f"{self.service}-{self.version}")

    def rolled_back_to(self, version: str) -> Deployment:
        """Return a new Deployment. replace() re-runs __post_init__,
        so validation and slug are recomputed rather than copied."""
        return replace(self, version=version)


# ---- tests --------------------------------------------------------------

def test_instances_work_as_dict_keys() -> None:
    """Proves the eq/hash pairing -- bug 2, fixed by frozen=True."""
    a = Deployment(service="api", version="1.2.0", regions=("eu",))
    b = Deployment(service="api", version="1.2.0", regions=("eu",),
                   duration_ms=999.0)          # compare=False, so equal

    assert a == b
    assert hash(a) == hash(b)
    assert len({a, b}) == 1

    history = {a: "green"}
    assert history[b] == "green"


def test_secret_never_appears_in_repr_or_traceback() -> None:
    """Bug 3. repr is what a traceback and a log line carry."""
    d = Deployment(service="api", version="1.0.0", regions=("eu",),
                   api_token="super-secret-token")

    assert "super-secret" not in repr(d)
    assert d.api_token == "super-secret-token"   # still readable in code

    # The realistic leak path: an exception carrying the object
    try:
        raise RuntimeError(f"deploy failed: {d!r}")
    except RuntimeError as exc:
        assert "super-secret" not in str(exc)


def test_regions_are_not_shared_between_instances() -> None:
    """Bug 1 -- the dataclass makes it impossible to write."""
    a = Deployment(service="api", version="1.0.0", regions=("eu",))
    b = Deployment(service="web", version="1.0.0", regions=("us",))

    assert a.regions == ("eu",)
    assert b.regions == ("us",)
    # And a tuple cannot be appended to at all


def test_replace_revalidates_and_recomputes() -> None:
    a = Deployment(service="api", version="1.2.0", regions=("eu",))
    b = a.rolled_back_to("1.1.0")

    assert b.slug == "api-1.1.0"          # recomputed, not copied
    assert a.slug == "api-1.2.0"          # original untouched

    try:
        a.rolled_back_to("")               # __post_init__ runs again
    except ValueError:
        pass
    else:
        raise AssertionError("expected validation on replace")


def test_ordering_follows_field_order() -> None:
    deployments = [
        Deployment(service="web", version="1.0.0", regions=("eu",)),
        Deployment(service="api", version="2.0.0", regions=("eu",)),
        Deployment(service="api", version="1.0.0", regions=("eu",)),
    ]
    assert [(d.service, d.version) for d in sorted(deployments)] == [
        ("api", "1.0.0"), ("api", "2.0.0"), ("web", "1.0.0")
    ]


if __name__ == "__main__":
    for t in (
        test_instances_work_as_dict_keys,
        test_secret_never_appears_in_repr_or_traceback,
        test_regions_are_not_shared_between_instances,
        test_replace_revalidates_and_recomputes,
        test_ordering_follows_field_order,
    ):
        t()
    print("80 lines -> 30, three bugs closed")`,
        notes: [
          { t: "p", text: "**Two of the three bugs became unwritable rather than fixed.** The mutable default raises at class-definition time with a message naming `default_factory`, and `frozen=True` derives `__eq__` and `__hash__` from one field set so they cannot disagree. That is the strongest argument for dataclasses: not the lines saved, but the mistakes made impossible." },
          { t: "p", text: "**`repr=False` on the token is a real security control.** `repr` is what an exception message carries, what a debugger shows, and what most structured loggers serialise — so a secret in `__repr__` reaches your log aggregator. The test raises an exception carrying the object precisely because that is the realistic leak path, not a bare `print`." },
          { t: "p", text: "**`regions` is a tuple, not a list.** `frozen` is shallow, so a list field would remain mutable *and* would make the whole object unhashable — defeating the main reason to freeze it. Immutable field types are what make `frozen=True` mean anything." },
          { t: "callout", kind: "insight", title: "Why compare=False on three fields", body: [
            { t: "p", text: "`duration_ms`, `deployed_at` and `slug` are excluded from equality because none of them is part of *what a deployment is*. Two records of the same service at the same version are the same deployment whether one took 200ms and the other 900ms." },
            { t: "p", text: "That decision is what makes the dict-key test meaningful: `a` and `b` differ in duration and still collapse to one entry. Getting it wrong the other way — including timing in equality — means a lookup misses a record that is present, which is the same failure as a mismatched hash, arrived at from the opposite direction." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A security review finds API tokens in the log aggregator. The application never logs tokens — but it logs exceptions, and the exception messages contain `repr()` of a config object whose `__repr__` includes every field." },
      { t: "p", text: "**`repr` is a leak surface nobody audits.** It reaches tracebacks, structured log serialisation, debugger output, error-tracking services and test failure messages. A field that is safe to hold in memory is not automatically safe to render, and the rendering happens in code you did not write." },
      { t: "p", text: "**`field(repr=False)` on every secret** is the fix, and it costs nothing. For a hand-written class the equivalent is excluding it from `__repr__` deliberately — and remembering to do so on every future field, which is exactly the kind of discipline that decays." },
      { t: "p", text: "The stronger version: **wrap secrets in a type that cannot render itself.** Pydantic's `SecretStr` reprs as `**********` and requires an explicit `.get_secret_value()` to read — so the safe behaviour is the default and reading it is the thing that stands out in review." }
    ]}
  ],

  takeaways: [
    "`@dataclass` generates `__init__`, `__repr__` and `__eq__` from **annotations** — an unannotated assignment is a plain class attribute, silently excluded from all three.",
    "**Mutable defaults raise at class-definition time**, naming `default_factory` as the fix. One of the few places Python catches this trap for you.",
    "**`frozen=True` gets the `__eq__`/`__hash__` pairing right by construction**, which is the thing hand-written classes most often get wrong.",
    "**`frozen` is shallow.** A `list` field is still mutable *and* makes the object unhashable — use `tuple`, `frozenset` and nested frozen dataclasses.",
    "`field(repr=False)` for secrets, `compare=False` for measurements that are not part of identity, `init=False` for derived values.",
    "**`repr` is a leak surface** — it reaches tracebacks, structured logs and error trackers. Excluding secrets from it is a real security control.",
    "`kw_only=True` should be close to the default past three fields: self-documenting call sites, and it removes the default-ordering restriction.",
    "`__post_init__` runs after every field is set, which is what makes cross-field validation possible. On a frozen instance, derived fields need `object.__setattr__`.",
    "**`replace()` re-runs `__init__` and `__post_init__`**, so validation and derived values are recomputed rather than copied.",
    "**Dataclass for data you construct; Pydantic for data that arrives.** Annotations are not enforced at runtime, so a trust boundary needs real validation.",
    "`NamedTuple` is underused for multi-value returns — named access *and* tuple unpacking, which a dataclass does not give you."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "In a dataclass body, `host: str = \"localhost\"` and `port = 8080`. What is the difference?",
        options: [
          "None — both become fields with defaults",
          "`host` is a field (in `__init__`, `__repr__`, `__eq__`); `port` has no annotation so it is a plain class attribute, excluded from all three",
          "`port` becomes a field but cannot be overridden per instance",
          "`port` raises a `ValueError` for missing type information"
        ],
        answer: 1,
        why: "Dataclasses read annotations, not assignments. Without one, `port` is an ordinary class attribute shared by every instance — absent from `__init__`, `__repr__` and `__eq__`. It is a quiet bug: the value works when read, but it cannot be set per instance and silently disappears from equality. If a field is missing from the generated `repr`, check its annotation first."
      },
      {
        stem: "Why does `@dataclass(frozen=True)` with a `list` field defeat its own purpose?",
        options: [
          "Frozen dataclasses cannot have collection fields at all",
          "`frozen` blocks assignment to the field but not mutation of the list, and a list field makes the object unhashable — removing the main reason to freeze it",
          "The list is shared between instances",
          "`__post_init__` cannot validate list contents"
        ],
        answer: 1,
        why: "`frozen` is shallow, exactly like a tuple containing a list (Lesson 1.4): `c.hosts = []` raises, but `c.hosts.append(\"x\")` succeeds. Worse, `__hash__` hashes the fields, so an unhashable list makes the whole object unhashable — losing dict-key and set-member use, which is usually why you froze it. Use `tuple[str, ...]`, `frozenset` or a nested frozen dataclass."
      },
      {
        stem: "What does `field(repr=False)` accomplish for an API token, beyond tidier output?",
        options: [
          "It encrypts the value in memory",
          "It keeps the value out of tracebacks, structured log serialisation and error-tracking payloads — `repr` is rendered by code you did not write",
          "It prevents the field from being read by other modules",
          "It excludes the field from `asdict()` and JSON output"
        ],
        answer: 1,
        why: "`repr` reaches far more places than a `print`: exception messages, debugger output, most structured loggers, and error-tracking services that serialise local variables. An application that never logs tokens can still leak them through an exception carrying a config object. It does not encrypt anything or restrict access, and `asdict()` still includes the field — for that, a `SecretStr`-style wrapper is stronger."
      },
      {
        stem: "You are parsing an external API response. Dataclass or Pydantic model?",
        options: [
          "Dataclass — it is standard library and faster",
          "Pydantic — annotations are not enforced at runtime, so untrusted data needs real validation with field-level error messages",
          "Either; both validate types at construction",
          "Dataclass with `__post_init__` doing manual `isinstance` checks"
        ],
        answer: 1,
        why: "A dataclass constructs happily from `Order(\"o-1\", \"not a number\")` because annotations are never checked at runtime (Lesson 1.8). At a trust boundary you need parsing plus validation plus coercion plus errors naming the field path — which is Pydantic's job. Option D works and reimplements a library badly. The rule: dataclass for data you construct, Pydantic for data that arrives."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does `@dataclass` generate, and when would you use `frozen=True`?",
        strong: "It generates `__init__`, `__repr__` and `__eq__` from the annotated fields. `frozen=True` blocks assignment and adds `__hash__` derived from the same fields — so it is right for value objects, anything used as a dict key or set member, and anything shared as a default.",
        answer: [
          { t: "p", text: "The point worth leading with is not the saved typing but the correctness: `frozen=True` gets the `__eq__`/`__hash__` pairing right by construction, which is precisely what hand-written classes get wrong." },
          { t: "p", text: "The shallow-immutability caveat shows real usage: `frozen` blocks assignment to the field, not mutation of a list it points at — and a list field makes the whole object unhashable, defeating the purpose. Immutable field types are what make it mean anything." },
          { t: "p", text: "Mentioning that mutable defaults raise at class-definition time, with a message naming `default_factory`, is a nice detail — it is one of the few places Python catches that trap for you." }
        ]
      },
      {
        level: "core",
        q: "Dataclass or Pydantic model?",
        strong: "Dataclass for data you construct yourself; Pydantic for data that arrives from outside. Annotations are not enforced at runtime, so a dataclass will happily hold a string where you declared a `Decimal` — fine internally, unacceptable at a trust boundary.",
        answer: [
          { t: "p", text: "That one-line rule — construct versus arrive — is more useful than a feature comparison, and it maps onto the boundary framing from earlier in the course." },
          { t: "p", text: "It is worth naming what Pydantic adds beyond type checking: coercion, nested models, and error messages carrying the full field path, which is what turns a malformed payload into an actionable 400 rather than a stack trace." },
          { t: "p", text: "The cost side keeps it balanced: validation is not free, so a hot internal path with millions of objects wants a `slots=True` dataclass, and a `NamedTuple` is faster still for small immutable records." }
        ]
      },
      {
        level: "advanced",
        q: "How would you keep a secret out of your logs?",
        strong: "`field(repr=False)` on the dataclass field, because `repr` is what tracebacks, structured loggers and error trackers serialise. Stronger still is a wrapper type that reprs as asterisks and requires an explicit call to read — so safe is the default and reading it is what stands out in review.",
        answer: [
          { t: "p", text: "The observation that lands is that `repr` is rendered by code you did not write. An application that never logs a token still leaks it through an exception message carrying a config object, or through an error tracker serialising local variables." },
          { t: "p", text: "Naming `SecretStr` and the pattern behind it shows range: the value is that the unsafe operation becomes visible at the call site, rather than depending on every future field being excluded correctly." },
          { t: "p", text: "The realistic test is worth describing — raise an exception carrying the object and assert the secret is absent from the message. Asserting on `repr()` alone misses the path that actually leaks." }
        ]
      }
    ]
  }
});
