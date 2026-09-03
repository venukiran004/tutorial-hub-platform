/* ============================================================================
   LESSON 4.3 — Instance, Class and Static Methods
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "Three decorators, and the difference between them is entirely **what gets passed as the first argument**. An instance method receives the object, a `classmethod` receives the class, a `staticmethod` receives nothing. That mechanical fact decides which you need — and it also explains why most `staticmethod`s are module functions wearing a costume.",

  objectives: [
    "State what each of the three receives and choose between them mechanically",
    "Write alternative constructors with `classmethod`, and explain why `cls` matters for subclasses",
    "Recognise a `staticmethod` that should be a module-level function",
    "Explain why a bound method holds a reference to its instance",
    "Use `classmethod` for registries and factories without reaching for a metaclass"
  ],

  prerequisites: ["4.1", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "The only difference is the first argument", id: "the-difference" },

    { t: "code", lang: "python", title: "all three, side by side", code: `
class Order:
    TAX_RATE = 0.2

    def __init__(self, amount: float) -> None:
        self.amount = amount

    def with_tax(self) -> float:
        """Instance method: receives the object as self."""
        return self.amount * (1 + self.TAX_RATE)

    @classmethod
    def from_cents(cls, cents: int) -> "Order":
        """Class method: receives the class as cls."""
        return cls(cents / 100)

    @staticmethod
    def is_valid_amount(amount: float) -> bool:
        """Static method: receives nothing at all."""
        return amount > 0


order = Order(100)
print(order.with_tax())
print(Order.from_cents(2500).amount)
print(Order.is_valid_amount(-1))
`,
      out: `120.0
25.0
False`
    },

    { t: "viz",
      title: "What the dot passes",
      caption: "Attribute access on a class or instance goes through the descriptor protocol, and each decorator implements it differently. That single hook is the whole mechanism — there is no special-casing in the interpreter for methods.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram: instance method receives self, classmethod receives cls, staticmethod receives nothing">
  <defs>
    <marker id="b3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="20" y="40" width="180" height="46" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="110" y="60" text-anchor="middle" class="s-mono" style="font-size:10.5px;fill:var(--accent-ink)">order.with_tax()</text>
  <text x="110" y="78" text-anchor="middle" class="s-sub">instance method</text>
  <line x1="200" y1="63" x2="266" y2="63" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#b3)"/>
  <rect x="272" y="40" width="240" height="46" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="392" y="63" text-anchor="middle" class="s-mono" style="font-size:10.5px">with_tax(order)</text>
  <text x="530" y="60" class="s-sub" style="fill:var(--accent-ink);font-weight:600">gets the INSTANCE</text>
  <text x="530" y="76" class="s-sub">reads and writes per-object state</text>

  <rect x="20" y="104" width="180" height="46" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="110" y="124" text-anchor="middle" class="s-mono" style="font-size:10.5px;fill:var(--good)">Order.from_cents(x)</text>
  <text x="110" y="142" text-anchor="middle" class="s-sub">classmethod</text>
  <line x1="200" y1="127" x2="266" y2="127" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#b3)"/>
  <rect x="272" y="104" width="240" height="46" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="392" y="127" text-anchor="middle" class="s-mono" style="font-size:10.5px">from_cents(Order, x)</text>
  <text x="530" y="124" class="s-sub" style="fill:var(--good);font-weight:600">gets the CLASS</text>
  <text x="530" y="140" class="s-sub">can construct, and respects subclasses</text>

  <rect x="20" y="168" width="180" height="46" rx="8" class="s-fill-2 s-stroke" stroke-width="1.5"/>
  <text x="110" y="188" text-anchor="middle" class="s-mono" style="font-size:10.5px">Order.is_valid(x)</text>
  <text x="110" y="206" text-anchor="middle" class="s-sub">staticmethod</text>
  <line x1="200" y1="191" x2="266" y2="191" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#b3)"/>
  <rect x="272" y="168" width="240" height="46" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="392" y="191" text-anchor="middle" class="s-mono" style="font-size:10.5px">is_valid(x)</text>
  <text x="530" y="188" class="s-sub" style="fill:var(--warn);font-weight:600">gets NOTHING</text>
  <text x="530" y="204" class="s-sub">so ask: why is it in the class at all?</text>

  <rect x="20" y="234" width="860" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="256" class="s-sub">Both classmethod and staticmethod can also be called on an instance — order.from_cents(x) works and still receives the class.</text>
</svg>`
    },

    { t: "h2", n: "02", text: "classmethod: the alternative constructor", id: "alternative-constructors" },

    { t: "p", text: "This is the single most valuable use of `classmethod`, and it is the answer to the Lesson 4.1 problem of `__init__` wanting to do work. Python has one `__init__` per class, so **every other way of building the object is a named classmethod.**" },

    { t: "code", lang: "python", title: "several named ways in", code: `
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


class Report:
    def __init__(self, rows: list[dict], generated_at: datetime) -> None:
        """The one true initialiser: cheap, total, takes ready-made parts."""
        self.rows = rows
        self.generated_at = generated_at

    @classmethod
    def from_json(cls, text: str) -> Report:
        payload = json.loads(text)
        return cls(payload["rows"], datetime.fromisoformat(payload["at"]))

    @classmethod
    def from_file(cls, path: Path) -> Report:
        return cls.from_json(path.read_text(encoding="utf-8"))

    @classmethod
    def empty(cls) -> Report:
        return cls([], datetime.now())


print(Report.from_json('{"rows": [], "at": "2024-01-01T00:00:00"}').rows)
print(len(Report.empty().rows))
`,
      out: `[]
0`,
      caption: "Each entry point has a name that says what it does, and each ends in `cls(...)` — so `__init__` stays the single place that establishes a valid object. `from_file` delegating to `from_json` means the parsing logic exists once."
    },

    { t: "callout", kind: "insight", title: "Why `cls` and not the class name", body: [
      { t: "code", lang: "python", title: "the difference appears with a subclass", numbered: false, code: `
class Report:
    @classmethod
    def empty(cls):
        return cls()            # correct: builds whatever class was called

class Report:
    @classmethod
    def empty(cls):
        return Report()         # WRONG: always builds a Report


class AuditReport(Report):
    pass


print(type(AuditReport.empty()))`,
        out: `<class '__main__.AuditReport'>`},
      { t: "p", text: "With `cls()`, `AuditReport.empty()` returns an `AuditReport`. With the hard-coded name it returns a plain `Report`, silently — every subclass's alternative constructors give back the wrong type, and the failure surfaces later as a missing method or a failed `isinstance` check." },
      { t: "p", text: "**Always use `cls` inside a classmethod.** It costs nothing and it is what makes the method inheritable." }
    ]},

    { t: "ladder",
      title: "Parsing a config from several sources",
      rungs: [
        { level: "bad", label: "One __init__ doing everything", why: "the signature lies",
          code: `class Config:
    def __init__(self, source):
        if isinstance(source, dict):
            self._data = source
        elif isinstance(source, str) and source.startswith("{"):
            self._data = json.loads(source)
        elif isinstance(source, (str, Path)):
            self._data = json.loads(Path(source).read_text())
        else:
            raise TypeError(f"cannot build Config from {type(source)}")`,
          note: "The signature says `source` and means four different things. A caller cannot tell from the outside what is accepted, mypy cannot help, and adding a fifth source means another branch in a growing `isinstance` chain — the exact shape Lesson 2.6 warned about." },

        { level: "ok", label: "Named classmethods", why: "each entry point is typed",
          code: `class Config:
    def __init__(self, data: dict) -> None:
        self._data = data

    @classmethod
    def from_json(cls, text: str) -> "Config":
        return cls(json.loads(text))

    @classmethod
    def from_file(cls, path: Path) -> "Config":
        return cls.from_json(path.read_text(encoding="utf-8"))`,
          note: "Every entry point now has one parameter of one type, and its name says which source it reads. `mypy` checks each call site, and adding a source is a new method rather than a new branch." },

        { level: "best", label: "Layered, with the merge as its own step", why: "composable",
          code: `class Config:
    def __init__(self, data: Mapping[str, Any]) -> None:
        self._data = dict(data)      # copy: do not adopt the caller's dict

    @classmethod
    def from_json(cls, text: str) -> "Config":
        return cls(json.loads(text))

    @classmethod
    def from_file(cls, path: Path) -> "Config":
        return cls.from_json(path.read_text(encoding="utf-8"))

    @classmethod
    def from_env(cls, prefix: str = "APP_") -> "Config":
        return cls({
            k.removeprefix(prefix).lower(): v
            for k, v in os.environ.items()
            if k.startswith(prefix)
        })

    def merged_with(self, other: "Config") -> "Config":
        """Return a new Config; other wins. Neither input is mutated."""
        return type(self)({**self._data, **other._data})`,
          note: "Four typed ways in, plus layering as a separate operation that returns a new object. `type(self)(...)` rather than `Config(...)` keeps it subclass-correct, exactly as `cls` does in a classmethod. Note the copy in `__init__` — without it the Config adopts the caller's dict and shares mutations (Lesson 2.4)." }
      ]
    },

    { t: "h2", n: "03", text: "staticmethod: usually the wrong answer", id: "staticmethod" },

    { t: "p", text: "A `staticmethod` receives neither the instance nor the class. It is a plain function that happens to live inside a class body — so the honest question is always: **why is it in the class?**" },

    { t: "table",
      head: ["Reason given", "Verdict"],
      rows: [
        ["\"It is related to this class\"", "Weak. Namespacing by module is cheaper and more discoverable."],
        ["\"It is a helper only this class uses\"", "Weak. A module-level `_helper` says the same thing without coupling."],
        ["\"It belongs on the class for organisation\"", "Weak, and it makes the class harder to test in isolation."],
        ["\"Subclasses need to override it\"", "**Legitimate** — but then it should probably be a `classmethod`."],
        ["\"It is called through the instance by existing code\"", "**Legitimate** — an interface constraint you did not choose."],
        ["\"It is a validator the class exposes as part of its API\"", "**Legitimate** — `Order.is_valid_amount(x)` reads well as a public check."]
      ]
    },

    { t: "code", lang: "python", title: "the usual case, and its honest form", code: `
# A staticmethod that has no reason to be one
class OrderProcessor:
    @staticmethod
    def _normalise_sku(sku: str) -> str:
        return sku.strip().upper()

    def process(self, order: Order) -> None:
        sku = self._normalise_sku(order.sku)
        ...


# The same thing as a module function: testable without the class,
# reusable by anything else in the module, one less thing in the class.
def _normalise_sku(sku: str) -> str:
    return sku.strip().upper()


class OrderProcessor:
    def process(self, order: Order) -> None:
        sku = _normalise_sku(order.sku)
        ...
`,
      caption: "The module function can be imported and tested on its own, has no implicit relationship to `OrderProcessor`, and is available to the next class that needs it. Nothing was lost by moving it out."
    },

    { t: "callout", kind: "tradeoff", title: "The case for keeping it", body: [
      { t: "p", text: "There is a real argument on the other side: a `staticmethod` keeps a helper **next to the only code that uses it**, which is a readability win in a large module. That is a legitimate preference, and teams differ." },
      { t: "p", text: "The test that resolves it: **would this function make sense to anything other than this class?** If yes, move it to module level. If it is genuinely specific — a private detail of one class's algorithm — leaving it as a `staticmethod` is defensible, and marking it with a leading underscore signals it is not part of the API." },
      { t: "p", text: "What is *not* defensible is a class made entirely of `staticmethod`s. That is a module with extra syntax, and it usually appears when someone is applying a language without namespacing to a language that has one." }
    ]},

    { t: "h2", n: "04", text: "Bound methods hold their instance", id: "bound-methods" },

    { t: "code", lang: "python", title: "a bound method is an object", code: `
class Uploader:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload          # imagine 200 MB

    def send(self) -> None:
        print(f"sending {len(self.payload)} bytes")


uploader = Uploader(b"x" * 1000)
callback = uploader.send                # a bound method

print(callback.__self__ is uploader)    # it holds the instance
print(callback.__func__)                # and the underlying function

del uploader                            # the name is gone...
callback()                              # ...but the object is not
`,
      out: `True
<function Uploader.send at 0x...>
sending 1000 bytes`
    },

    { t: "callout", kind: "trap", title: "Bound methods as callbacks keep objects alive", body: [
      { t: "p", text: "`callback.__self__` is a strong reference. Registering `obj.method` as a long-lived callback — an event handler, a signal listener, a scheduled job — keeps `obj` and everything it references alive for as long as the registry holds the callback." },
      { t: "code", lang: "python", title: "the leak", numbered: false, code: `
class Session:
    def __init__(self, user_data: dict) -> None:
        self.user_data = user_data      # large

    def on_event(self, event) -> None:
        ...


# Each session registers a bound method. The registry now holds every
# session -- and every session's user_data -- forever.
for session in sessions:
    event_bus.subscribe("update", session.on_event)`},
      { t: "p", text: "**Two fixes.** Unsubscribe explicitly when the object's life ends, which is the honest answer for anything with a clear lifecycle. Or store `weakref.WeakMethod(obj.method)` in the registry, so the callback disappears when the object is collected — the pattern most GUI and event frameworks use internally." },
      { t: "p", text: "This is the same shape as the closure-lifetime problem in Lesson 3.6: a callable that captures something keeps it alive, and a long-lived registry of callables is a long-lived registry of whatever they captured." }
    ]},

    { t: "h2", n: "05", text: "classmethod for registries", id: "registries" },

    { t: "code", lang: "python", title: "a self-registering hierarchy without a metaclass", code: `
from __future__ import annotations

from typing import ClassVar


class Exporter:
    """Base class. Subclasses register themselves by format name."""

    _registry: ClassVar[dict[str, type[Exporter]]] = {}
    format_name: ClassVar[str] = ""

    def __init_subclass__(cls, **kwargs) -> None:
        """Runs once per subclass definition -- no metaclass needed."""
        super().__init_subclass__(**kwargs)
        if not cls.format_name:
            raise TypeError(f"{cls.__name__} must set format_name")
        if cls.format_name in Exporter._registry:
            raise TypeError(f"duplicate exporter for {cls.format_name!r}")
        Exporter._registry[cls.format_name] = cls

    @classmethod
    def for_format(cls, name: str) -> Exporter:
        """Factory: build the right subclass by name."""
        try:
            return cls._registry[name]()
        except KeyError:
            raise ValueError(
                f"no exporter for {name!r}; have {sorted(cls._registry)}"
            ) from None

    def export(self, rows: list[dict]) -> bytes:
        raise NotImplementedError


class CsvExporter(Exporter):
    format_name = "csv"

    def export(self, rows: list[dict]) -> bytes:
        return b"csv bytes"


class JsonExporter(Exporter):
    format_name = "json"

    def export(self, rows: list[dict]) -> bytes:
        return b"json bytes"


print(sorted(Exporter._registry))
print(type(Exporter.for_format("csv")).__name__)
Exporter.for_format("xml")
`,
      out: `['csv', 'json']
CsvExporter
ValueError: no exporter for 'xml'; have ['csv', 'json']`
    },

    { t: "callout", kind: "insight", title: "`__init_subclass__` replaced most metaclasses", body: [
      { t: "p", text: "Before Python 3.6 this pattern needed a metaclass. `__init_subclass__` is called on the parent whenever a subclass is defined, which covers registration, validation of required attributes, and enforcing conventions — the overwhelming majority of what metaclasses were used for. Lesson 8.6 covers the remainder." },
      { t: "p", text: "Two details in the example are worth copying. The **duplicate check** turns two subclasses claiming the same format into an error at import rather than a silent last-one-wins. And the **required-attribute check** fails at class-definition time, so a subclass that forgets `format_name` cannot be defined at all — much better than discovering it when someone calls `for_format`." },
      { t: "p", text: "The caveat is the one from Lesson 3.4: **registration is a side effect of import.** A subclass in a module nobody imports does not exist, and the failure is silence. Import your exporter modules explicitly in one place." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Replace an isinstance constructor",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The class below accepts five different kinds of input in one `__init__` and dispatches on type. Convert it to typed alternative constructors, then make it work correctly under subclassing — which the original silently does not." }
      ],
      requirements: [
        "Replace the `isinstance` chain with one `__init__` taking a single well-typed argument, plus named classmethods for each source.",
        "Every classmethod must use `cls`, not the class name, and you must demonstrate why with a subclass.",
        "Identify the one `staticmethod` that should stay and the one that should become a module function; justify both.",
        "Fix the constructor so it does not adopt the caller's mutable object.",
        "Add a `merged_with` that returns a new instance and mutates neither input.",
        "Write a test proving `Subclass.from_json(...)` returns a `Subclass`."
      ],
      hint: "For the subclass test, `type(obj)` is the assertion you want, not `isinstance` — `isinstance` passes for the base class too and would not catch the bug.",
      solution: {
        lang: "python",
        title: "credentials.py",
        code: `# ---- the original ------------------------------------------------------

class Credentials:
    def __init__(self, source):
        if isinstance(source, dict):
            self._data = source                       # adopts caller's dict
        elif isinstance(source, str) and source.startswith("{"):
            self._data = json.loads(source)
        elif isinstance(source, (str, Path)):
            self._data = json.loads(Path(source).read_text())
        elif hasattr(source, "read"):
            self._data = json.load(source)
        elif source is None:
            self._data = {}
        else:
            raise TypeError(f"cannot build from {type(source)}")

    @staticmethod
    def _strip(value):
        return value.strip()

    @staticmethod
    def is_expired(expiry: str) -> bool:
        return datetime.fromisoformat(expiry) < datetime.now(UTC)


# ---- the redesign ------------------------------------------------------

from __future__ import annotations

import json
import os
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import IO, Any


def _strip(value: str) -> str:
    """Module function, not a staticmethod.

    It has nothing to do with Credentials -- any string needs stripping.
    At module level it is importable, testable on its own, and available
    to the next class in this module that needs it.
    """
    return value.strip()


class Credentials:
    def __init__(self, data: Mapping[str, Any]) -> None:
        """One initialiser, one type, cheap and total.

        dict(data) COPIES rather than adopting the caller's mapping --
        without it, a caller mutating their dict afterwards would
        silently change these credentials (Lesson 2.4).
        """
        self._data = dict(data)

    # ---- named entry points, one type each ----

    @classmethod
    def from_json(cls, text: str) -> Credentials:
        return cls(json.loads(text))

    @classmethod
    def from_file(cls, path: Path) -> Credentials:
        return cls.from_json(path.read_text(encoding="utf-8"))

    @classmethod
    def from_stream(cls, stream: IO[str]) -> Credentials:
        return cls(json.load(stream))

    @classmethod
    def from_env(cls, prefix: str = "CRED_") -> Credentials:
        return cls({
            key.removeprefix(prefix).lower(): value
            for key, value in os.environ.items()
            if key.startswith(prefix)
        })

    @classmethod
    def empty(cls) -> Credentials:
        return cls({})

    # ---- the staticmethod that earns its place ----

    @staticmethod
    def is_expired(expiry: str) -> bool:
        """Kept as a staticmethod deliberately.

        It is part of the public API of this concept -- callers write
        Credentials.is_expired(value) as a readable check without needing
        an instance. It also takes no self and no cls, so classmethod
        would be misleading.
        """
        return datetime.fromisoformat(expiry) < datetime.now(UTC)

    def merged_with(self, other: Credentials) -> Credentials:
        """Return a new instance; other wins. Neither input is mutated.

        type(self) rather than Credentials, for the same reason
        classmethods use cls -- a subclass merging two of itself should
        get itself back.
        """
        return type(self)({**self._data, **other._data})

    def __repr__(self) -> str:
        return f"{type(self).__name__}(keys={sorted(self._data)})"


# ---- the subclass that proves cls matters ------------------------------

class RotatingCredentials(Credentials):
    """Adds rotation. Inherits every constructor -- correctly."""

    def rotate(self) -> RotatingCredentials:
        return type(self)({**self._data, "rotated_at": str(datetime.now(UTC))})


# ---- tests -------------------------------------------------------------

def test_classmethods_respect_subclasses() -> None:
    """The bug the original had: hard-coding the class name.

    type() rather than isinstance() -- isinstance would pass for the
    base class too and would not catch a constructor returning the
    wrong type.
    """
    obj = RotatingCredentials.from_json('{"token": "abc"}')
    assert type(obj) is RotatingCredentials, type(obj)

    # And the inherited methods keep the subclass type
    assert type(obj.rotate()) is RotatingCredentials
    assert type(obj.merged_with(RotatingCredentials.empty())) is RotatingCredentials


def test_constructor_copies_input() -> None:
    source = {"token": "abc"}
    creds = Credentials(source)
    source["token"] = "tampered"
    assert creds._data["token"] == "abc"


def test_merge_mutates_neither_input() -> None:
    a = Credentials({"token": "a", "region": "eu"})
    b = Credentials({"token": "b"})
    merged = a.merged_with(b)

    assert merged._data == {"token": "b", "region": "eu"}
    assert a._data == {"token": "a", "region": "eu"}
    assert b._data == {"token": "b"}


if __name__ == "__main__":
    test_classmethods_respect_subclasses()
    test_constructor_copies_input()
    test_merge_mutates_neither_input()
    print(RotatingCredentials.from_json('{"token": "x"}'))`,
        out: `RotatingCredentials(keys=['token'])`,
        notes: [
          { t: "p", text: "**`type(obj) is RotatingCredentials` rather than `isinstance`** is the assertion that catches the bug. `isinstance` passes for the base class as well, so a constructor hard-coding `Credentials(...)` would sail through an `isinstance` check while returning the wrong type — and the failure would surface much later as a missing `rotate` method." },
          { t: "p", text: "**`type(self)(...)` in `merged_with`** is the instance-method equivalent of using `cls`. Writing `Credentials(...)` there would mean a `RotatingCredentials` merged with another loses its type, which is exactly the class of bug the subclass test exists to prevent." },
          { t: "p", text: "**The two staticmethod decisions went opposite ways, for a reason you can state.** `_strip` has nothing to do with credentials — any string needs stripping — so it becomes a module function that is importable and testable alone. `is_expired` is part of how a caller reasons about this concept, so `Credentials.is_expired(value)` reads well as a public check and stays." },
          { t: "callout", kind: "insight", title: "Why the isinstance version was worse than it looked", body: [
            { t: "p", text: "Beyond the readability problem, it had a genuine ambiguity: `Credentials(\"config.json\")` and `Credentials('{\"a\": 1}')` are both `str`, distinguished only by a `startswith(\"{\")` heuristic. A JSON file whose content begins with whitespace, or a filename that starts with a brace, silently takes the wrong branch." },
            { t: "p", text: "Named constructors remove the guessing entirely. `from_file` and `from_json` cannot be confused, mypy checks each call site, and adding a fifth source is a new method rather than another guess in a growing chain." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service subclasses a vendor SDK's `Client` to add retry behaviour. Everything works until a call to the inherited `Client.from_config(path)` — which returns a base `Client`, silently dropping the retry behaviour. The failure appears weeks later as unretried timeouts in a subsystem nobody had changed." },
      { t: "p", text: "**The SDK's classmethod hard-codes its own class name** — `return Client(...)` rather than `return cls(...)`. Every subclass inherits a constructor that refuses to build the subclass, and nothing raises: the returned object satisfies `isinstance(obj, Client)`, has all the base methods, and only differs in what it does not do." },
      { t: "p", text: "**The workaround is to override the classmethod** in your subclass, or avoid the inherited constructors entirely and build through `__init__`. It is worth filing upstream — this is a genuine bug in the SDK, not a limitation of Python." },
      { t: "p", text: "The habit: **`cls` in a classmethod and `type(self)` in an instance method** cost nothing and make a class correctly inheritable. Hard-coding the class name produces a subclass that is silently only half a subclass, and `isinstance` checks will not tell you." }
    ]}
  ],

  takeaways: [
    "The only difference between the three is **what arrives as the first argument**: the instance, the class, or nothing.",
    "**`classmethod` is Python's alternative constructor.** One `__init__` per class means every other way of building the object is a named classmethod ending in `cls(...)`.",
    "**Always use `cls`, never the hard-coded class name.** Otherwise every subclass inherits constructors that return the wrong type, silently — and `isinstance` will not catch it.",
    "In an instance method, `type(self)(...)` is the equivalent discipline.",
    "Named constructors beat an `isinstance` chain in `__init__`: one type per entry point, checkable by mypy, and no heuristics guessing between a filename and a JSON string.",
    "**Most `staticmethod`s should be module functions** — importable, testable alone, and reusable. The legitimate cases are a public validator on the type, an override point for subclasses, or an interface you did not choose.",
    "A class made entirely of `staticmethod`s is a module with extra syntax.",
    "**A bound method holds a strong reference to its instance** via `__self__`. A long-lived callback registry keeps every registered object alive — unsubscribe, or use `weakref.WeakMethod`.",
    "`__init_subclass__` handles registration and subclass validation without a metaclass, and can fail at class-definition time when a required attribute is missing.",
    "Registration by class definition is an **import side effect** — a subclass in a module nobody imports does not exist, and the failure is silence."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A base class has `@classmethod def from_json(cls, text): return Client(json.loads(text))`. What happens when a subclass calls it?",
        options: [
          "It returns an instance of the subclass, because `classmethod` binds to the calling class",
          "It returns a base `Client`, silently — the hard-coded name ignores which class was called",
          "It raises `TypeError` because `cls` is unused",
          "It returns the subclass only if the subclass overrides `__init__`"
        ],
        answer: 1,
        why: "`cls` is bound to the calling class, but the body ignores it and constructs `Client` explicitly. So `Subclass.from_json(...)` returns a base instance with none of the subclass behaviour — and nothing raises, because the result still satisfies `isinstance(obj, Client)`. Using `cls(...)` makes the method correctly inheritable. Test it with `type(obj) is Subclass`, since `isinstance` would pass either way."
      },
      {
        stem: "When is a `staticmethod` genuinely the right choice over a module-level function?",
        options: [
          "Whenever the function is only used by one class",
          "When it is part of the type's public API as a check callers make without an instance, or an override point for subclasses",
          "Whenever the function does not need `self`",
          "Never — `staticmethod` exists only for backwards compatibility"
        ],
        answer: 1,
        why: "\"Does not need self\" describes every module function too, and \"only used by one class\" is satisfied by a module-level `_helper` with less coupling. The real cases are narrower: a validator callers invoke as `Order.is_valid_amount(x)` because it reads as part of that concept, an override point for subclasses, or an interface constraint you inherited. A class made entirely of staticmethods is a module with extra syntax."
      },
      {
        stem: "An event bus holds `session.on_event` for a thousand sessions. Memory grows and never falls. Why?",
        options: [
          "The event bus copies each session when subscribing",
          "A bound method holds a strong reference to its instance via `__self__`, so the registry keeps every session and everything it references alive",
          "Bound methods create a reference cycle that the garbage collector cannot break",
          "Each subscription creates a new closure over the whole module namespace"
        ],
        answer: 1,
        why: "`session.on_event` is a bound method object whose `__self__` is a strong reference to the session. As long as the bus holds the callback, the session and its data cannot be collected — even after every other name for it is gone. The fixes are unsubscribing when the object's life ends, or storing `weakref.WeakMethod`, which is what most event frameworks do internally. It is the same lifetime property as a closure capturing a large object."
      },
      {
        stem: "What does `__init_subclass__` let you do that previously needed a metaclass?",
        options: [
          "Change what a class call returns",
          "Run validation or registration code once per subclass definition — enforcing required attributes, or adding the subclass to a registry",
          "Add methods to a class after it is defined",
          "Control attribute lookup order"
        ],
        answer: 1,
        why: "`__init_subclass__` is called on the parent whenever a subclass is defined, which covers registration and convention enforcement — the great majority of what metaclasses were used for. Crucially it can raise, so a subclass missing a required attribute fails at class-definition time rather than at first use. Changing what a class call returns is `__new__` or a metaclass `__call__`; controlling attribute lookup is `__getattr__` and descriptors."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between a classmethod and a staticmethod?",
        strong: "A `classmethod` receives the class as its first argument, so it can construct instances and behaves correctly under subclassing. A `staticmethod` receives nothing — it is a plain function living in a class body. The practical consequence is that `classmethod` is how you write alternative constructors, and `staticmethod` usually means the function should be at module level.",
        answer: [
          { t: "p", text: "Leading with \"what arrives as the first argument\" makes all three mechanically distinguishable and avoids the vague \"one is for the class, one is for the instance\" answer." },
          { t: "p", text: "The alternative-constructor use is the one to develop: Python allows one `__init__` per class, so `from_json`, `from_file` and `from_env` are classmethods that each end in `cls(...)`. That connects to the real design problem of `__init__` wanting to do I/O." },
          { t: "p", text: "Being willing to say most `staticmethod`s should be module functions shows judgement rather than a reluctance to have an opinion — and naming the legitimate exceptions keeps it from sounding dogmatic." }
        ]
      },
      {
        level: "core",
        q: "Why use `cls` inside a classmethod rather than the class name?",
        strong: "Because `cls` is bound to whichever class was called, so subclasses inherit the constructor and get instances of themselves. Hard-coding the name means every subclass's alternative constructors silently return base instances — with no error, since the result still passes `isinstance`.",
        answer: [
          { t: "p", text: "The silence is what makes this worth explaining carefully. The returned object has all the base methods and satisfies `isinstance`, so nothing fails until someone calls a subclass-only method or relies on subclass behaviour that is quietly absent." },
          { t: "p", text: "A useful detail is the corresponding discipline in instance methods: `type(self)(...)` rather than the class name, for exactly the same reason. Many codebases get `cls` right in classmethods and then hard-code the name in a `copy` or `merge` method." },
          { t: "p", text: "On testing, `type(obj) is Subclass` rather than `isinstance` is the assertion that actually catches it — worth saying, because it is a case where the weaker check gives a false pass." }
        ]
      },
      {
        level: "advanced",
        q: "You register `obj.method` as a long-lived event callback. What should you be careful about?",
        strong: "A bound method holds a strong reference to its instance through `__self__`, so the registry keeps the object and everything it references alive. With one callback per session or per request, that is an unbounded leak. Unsubscribe when the object's lifecycle ends, or store a `weakref.WeakMethod`.",
        answer: [
          { t: "p", text: "The framing that shows depth is recognising this as the same property as a closure capturing a large object — a callable that holds something keeps it alive, and a long-lived registry of callables is a long-lived registry of whatever they captured." },
          { t: "p", text: "Mentioning that GUI and event frameworks use weak references internally, precisely because of this, signals you have met the problem rather than reasoned about it abstractly." },
          { t: "p", text: "Being honest about the trade-off completes it: weak references mean a callback can silently disappear if nothing else holds the object, which produces a different confusing bug. Explicit unsubscription is usually the better answer when the object has a clear lifecycle." }
        ]
      }
    ]
  }
});
