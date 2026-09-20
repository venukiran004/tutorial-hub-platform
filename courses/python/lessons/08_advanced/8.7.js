/* ============================================================================
   LESSON 8.7 — Introspection with inspect
   ========================================================================= */
EC.receiveLesson({
  id: "8.7",

  lede: "Every Python object carries its own description: parameter names, defaults, annotations, source, the module it came from. `inspect` reads that, and it is how pytest knows what your fixtures need, how FastAPI builds a request model from a function signature, and how a dependency injector decides what to pass. **It is also easy to overuse** — introspection couples you to details that were never meant to be a contract.",

  objectives: [
    "Read and manipulate a signature, including parameter kinds and defaults",
    "Resolve annotations correctly with `get_type_hints`",
    "Explain how signature-based frameworks decide what to inject",
    "Use stack inspection where appropriate, and know why it is usually not",
    "Recognise where introspection is the wrong answer"
  ],

  prerequisites: ["8.2", "8.3"],

  blocks: [

    { t: "h2", n: "01", text: "Signatures", id: "signature" },

    { t: "code", lang: "python", title: "the object behind every function", code: `
import inspect


def transfer(source: str, target: str, amount: int = 0, *tags, dry_run: bool = False, **extra):
    ...


sig = inspect.signature(transfer)
print(sig)

for name, param in sig.parameters.items():
    print(f"{name:10} {param.kind.name:20} default={param.default!r}")
`,
      out: `(source: str, target: str, amount: int = 0, *tags, dry_run: bool = False, **extra)

source     POSITIONAL_OR_KEYWORD  default=<class 'inspect._empty'>
target     POSITIONAL_OR_KEYWORD  default=<class 'inspect._empty'>
amount     POSITIONAL_OR_KEYWORD  default=0
tags       VAR_POSITIONAL         default=<class 'inspect._empty'>
dry_run    KEYWORD_ONLY           default=False
extra      VAR_KEYWORD            default=<class 'inspect._empty'>`,
      caption: "**`inspect.Parameter.empty` is the sentinel for \"no default\"** — you cannot use `None`, because `None` is a perfectly good default. Comparing against `param.default is inspect.Parameter.empty` is the correct test (Lesson 3.2)."
    },

    { t: "code", lang: "python", title: "bind: what a call would actually produce", code: `
sig = inspect.signature(transfer)

bound = sig.bind("acct-1", "acct-2", 500, dry_run=True)
bound.apply_defaults()

print(bound.arguments)
print(bound.args, bound.kwargs)

# Validation for free -- bind raises exactly as a call would
try:
    sig.bind("acct-1")
except TypeError as err:
    print(err)
`,
      out: `{'source': 'acct-1', 'target': 'acct-2', 'amount': 500, 'tags': (), 'dry_run': True, 'extra': {}}
('acct-1', 'acct-2', 500) {'dry_run': True}
missing a required argument: 'target'`,
      caption: "**`bind` is the underused half of the module.** It normalises positional and keyword arguments into one dictionary — which is what a decorator needs to log \"the `amount` argument was 500\" regardless of how the caller passed it."
    },

    { t: "callout", kind: "insight", title: "This is how a logging decorator gets argument names", body: [
      { t: "code", lang: "python", title: "from *args to named values", numbered: false, code: `
import functools
import inspect


def audited(fn):
    sig = inspect.signature(fn)          # computed ONCE, at decoration

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        bound = sig.bind(*args, **kwargs)
        bound.apply_defaults()
        log.info("call", extra={
            "function": fn.__qualname__,
            "amount": bound.arguments.get("amount"),
            "dry_run": bound.arguments.get("dry_run"),
        })
        return fn(*args, **kwargs)
    return wrapper`},
      { t: "p", text: "Without `bind`, the decorator sees `args[2]` and has no idea it is the amount — and it breaks the moment a caller passes it by keyword." },
      { t: "p", text: "**Compute the signature at decoration time, not per call.** `inspect.signature` is not cheap: caching it in the closure turns a per-call cost into a per-import one (Lesson 8.2)." }
    ]},

    { t: "h2", n: "02", text: "Seeing through decorators", id: "wrapped" },

    { t: "viz",
      title: "`__wrapped__` is what makes introspection survive decoration",
      caption: "`functools.wraps` sets `__wrapped__` on the wrapper. `inspect.signature` follows that chain by default, so a decorated function still reports the parameters a framework needs. Without it, every decorated function looks like `(*args, **kwargs)`.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Diagram showing inspect.signature following the __wrapped__ chain from a wrapper back to the original function">
  <defs>
    <marker id="wr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent-line)"/>
    </marker>
  </defs>

  <rect x="34" y="40" width="220" height="76" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="144" y="66" text-anchor="middle" class="s-mono" style="font-size:11px">wrapper</text>
  <text x="144" y="88" text-anchor="middle" class="s-sub">(*args, **kwargs)</text>
  <text x="144" y="106" text-anchor="middle" class="s-sub">what you actually call</text>

  <line x1="258" y1="78" x2="330" y2="78" style="stroke:var(--accent-line)" stroke-width="1.6" marker-end="url(#wr)"/>
  <text x="294" y="66" text-anchor="middle" class="s-mono" style="font-size:9px">__wrapped__</text>

  <rect x="334" y="40" width="220" height="76" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="444" y="66" text-anchor="middle" class="s-mono" style="font-size:11px">inner wrapper</text>
  <text x="444" y="88" text-anchor="middle" class="s-sub">from a second decorator</text>

  <line x1="558" y1="78" x2="630" y2="78" style="stroke:var(--accent-line)" stroke-width="1.6" marker-end="url(#wr)"/>
  <text x="594" y="66" text-anchor="middle" class="s-mono" style="font-size:9px">__wrapped__</text>

  <rect x="634" y="40" width="234" height="76" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="751" y="66" text-anchor="middle" class="s-mono" style="font-size:11px">transfer</text>
  <text x="751" y="88" text-anchor="middle" class="s-sub">(source, target, amount=0)</text>
  <text x="751" y="106" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink)">what signature() reports</text>

  <text x="34" y="164" class="s-sub" style="fill:var(--good)">signature(f)                       → follows the chain to the real function</text>
  <text x="34" y="192" class="s-sub" style="fill:var(--crit)">signature(f, follow_wrapped=False)  → (*args, **kwargs), the wrapper's own</text>
  <text x="34" y="226" class="s-sub">A decorator without functools.wraps breaks pytest fixtures, FastAPI models and generated docs — silently.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "Annotations, resolved", id: "annotations" },

    { t: "code", lang: "python", title: "`__annotations__` is not enough", code: `
from __future__ import annotations       # makes annotations STRINGS

import inspect
import typing


def handler(user: User, limit: int = 10) -> Response: ...


print(handler.__annotations__)
print(typing.get_type_hints(handler))
`,
      out: `{'user': 'User', 'limit': 'int', 'return': 'Response'}
{'user': <class 'User'>, 'limit': <class 'int'>, 'return': <class 'Response'>}`,
      caption: "**Anything reading annotations at runtime must call `get_type_hints`**, which resolves the strings against the function's own globals. Reading `__annotations__` directly gives you strings under `from __future__ import annotations` and objects without it — so the same code works in one module and not another (Lesson 8.3)."
    },

    { t: "callout", kind: "warn", title: "`get_type_hints` needs the names to be importable at runtime", body: [
      { t: "code", lang: "python", title: "the TYPE_CHECKING interaction", numbered: false, code: `
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from myapp.models import User        # NOT imported at runtime


def handler(user: User) -> None: ...

typing.get_type_hints(handler)
# NameError: name 'User' is not defined`},
      { t: "p", text: "A `TYPE_CHECKING` import breaks a cycle for the checker (Lesson 7.4) and leaves nothing for `get_type_hints` to resolve. Anything doing runtime introspection — a dependency injector, a serialiser, a validation layer — needs the type genuinely importable." },
      { t: "p", text: "**Options:** import it normally in modules whose annotations are read at runtime; pass an explicit `localns` to `get_type_hints`; or catch `NameError` and treat the parameter as untyped. Pydantic hits this constantly, which is why its error message mentions rebuilding the model." }
    ]},

    { t: "h2", n: "04", text: "Stack frames", id: "frames" },

    {"kind": "layers", "title": "Stack frames, as inspect sees them", "caption": "inspect.stack() returns the frames from the current one outward; each carries its code object, locals, line number and the caller. Reading frames is how debuggers, loggers with caller info and tracebacks work.", "items": [{"label": "frame 0 — where inspect.stack() was called", "sub": "f_locals, f_lineno, f_code", "tone": "good"}, {"label": "frame 1 — the caller", "tone": "accent"}, {"label": "frame 2 — its caller", "tone": "accent"}, {"label": "… up to <module>", "sub": "the outermost frame", "tone": "warn"}], "t": "diagram", "id": "dg-8_7-04-0"},



    { t: "code", lang: "python", title: "possible, and rarely right", code: `
import inspect


def caller_module() -> str:
    """Who called the function that called me?"""
    frame = inspect.currentframe().f_back.f_back
    return frame.f_globals["__name__"]


# The legitimate use: a library that must attribute something to its user
class Logger:
    def __init__(self, name: str | None = None) -> None:
        # exactly what logging.getLogger(__name__) asks you to do by hand
        self.name = name or inspect.currentframe().f_back.f_globals["__name__"]
`,
      caption: "Frame inspection powers `logging`'s `%(filename)s`, pytest's assertion rewriting, and several debuggers. **It is also the most fragile thing in this lesson.**"
    },

    { t: "callout", kind: "trap", title: "Why stack inspection breaks", body: [
      { t: "ul", items: [
        "**A decorator adds a frame**, so `f_back` now points at the wrapper instead of the caller. Every decorator applied anywhere above you changes the answer.",
        "**A comprehension or a generator adds a frame** on some versions and not others.",
        "**`inspect.stack()` is slow** — it reads source files to populate context lines. Use `sys._getframe()` if you must, and never in a hot path.",
        "**Frames keep everything alive.** Holding a frame object holds every local in it, which is why a stored traceback can pin a large object graph (Lesson 8.8).",
        "**Other implementations differ.** `sys._getframe` is CPython-specific and not guaranteed elsewhere."
      ]},
      { t: "p", text: "**The alternative is almost always a parameter.** `logging.getLogger(__name__)` asks the caller to pass the name rather than guessing it — more typing, and it never gets the wrong answer." }
    ]},

    { t: "h2", n: "05", text: "The rest of the module", id: "rest" },

    { t: "table",
      head: ["Function", "Gives", "Note"],
      rows: [
        ["`inspect.getsource(obj)`", "The source text", "Needs the file to exist — fails in a zipapp or a REPL"],
        ["`inspect.getdoc(obj)`", "The docstring, dedented **and inherited**", "Better than `obj.__doc__`, which does neither"],
        ["`inspect.getmembers(obj, predicate)`", "Name/value pairs", "The predicate matters: `isfunction` on a class, `ismethod` on an instance"],
        ["`inspect.isclass` / `isfunction` / `iscoroutinefunction`", "Type checks", "`iscoroutinefunction` is how a framework decides whether to `await`"],
        ["`inspect.getfile(obj)`", "The defining file", "For error messages that point somewhere useful"],
        ["`inspect.unwrap(fn)`", "The innermost function", "Follows `__wrapped__` all the way down"],
        ["`inspect.cleandoc(text)`", "Dedented text", "For any indented string, not only docstrings"]
      ],
      caption: "**`isfunction` versus `ismethod` catches people out.** A function accessed on the *class* is a function; the same thing accessed on an *instance* is a bound method — because of the descriptor protocol (Lesson 8.5)."
    },

    { t: "callout", kind: "tradeoff", title: "When introspection is the wrong tool", body: [
      { t: "table",
        head: ["Instead of", "Prefer", "Because"],
        rows: [
          ["`getmembers` to find plugins", "An explicit registry or entry points", "Discovery by scanning finds test doubles and half-written classes"],
          ["Frame inspection for the caller's module", "A parameter", "A decorator anywhere above changes the answer"],
          ["`getsource` to parse behaviour", "Reading data the object exposes", "Source is not a contract, and may not exist"],
          ["Signature inspection to branch on argument count", "Separate functions, or keyword-only arguments", "Cheaper to read and impossible to get wrong"],
          ["`hasattr` probing to choose a code path", "A `Protocol`", "Static, checkable, and documents the requirement (Lesson 8.4)"]
        ]
      },
      { t: "p", text: "**Introspection makes internal details into a contract.** Once a framework reads parameter names, renaming a parameter is a breaking change for its users — which is exactly what happens with pytest fixtures and FastAPI dependencies, and is a cost worth accepting deliberately rather than by accident." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A signature-based dependency injector",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "Build the mechanism behind pytest fixtures and FastAPI dependencies: a container that inspects a function's parameters, resolves each by annotation, and calls it. Around eighty lines — the interesting part is everything it has to get right." },
        { t: "p", text: "It must work on decorated functions, resolve string annotations, respect defaults, and produce an error message that names the parameter when it cannot resolve something." }
      ],
      requirements: [
        "Register providers by type; resolve a function's parameters from them.",
        "Recursively resolve a provider's own dependencies.",
        "Respect defaults — an unresolvable parameter with a default uses it rather than failing.",
        "Work on a function that has been decorated with `functools.wraps`.",
        "Resolve annotations under `from __future__ import annotations`.",
        "Detect a dependency cycle and report the path, rather than blowing the stack.",
        "Support singleton providers, and reject `*args`/`**kwargs` parameters with a clear message."
      ],
      hint: "`inspect.signature` follows `__wrapped__` by default, which handles the decorator case for free — but the annotations still need `get_type_hints`, and that reads the *original* function's globals.",
      solution: {
        lang: "python",
        title: "container.py",
        code: `from __future__ import annotations

import functools
import inspect
import typing
from collections.abc import Callable
from typing import Any, TypeVar

T = TypeVar("T")


class ResolutionError(Exception):
    """Raised when a parameter cannot be resolved.

    Carries the path so a failure five levels down says how it got
    there -- otherwise the message names a type nobody recognises.
    """

    def __init__(self, message: str, path: list[str]) -> None:
        super().__init__(f"{message}\\n  path: {' -> '.join(path)}")
        self.path = path


class Container:
    def __init__(self) -> None:
        self._providers: dict[type, Callable[..., Any]] = {}
        self._singletons: dict[type, Any] = {}
        self._is_singleton: dict[type, bool] = {}

    def provide(
        self,
        type_: type[T],
        provider: Callable[..., T],
        *,
        singleton: bool = False,
    ) -> None:
        self._providers[type_] = provider
        self._is_singleton[type_] = singleton

    # ---- the core ------------------------------------------------------

    def call(self, fn: Callable[..., T], **overrides: Any) -> T:
        """Resolve fn's parameters and call it."""
        kwargs = self._resolve_parameters(fn, overrides, path=[_name(fn)])
        return fn(**kwargs)

    def _resolve_parameters(
        self,
        fn: Callable[..., Any],
        overrides: dict[str, Any],
        path: list[str],
    ) -> dict[str, Any]:
        # signature() follows __wrapped__ by default, so a function
        # decorated with functools.wraps reports its REAL parameters.
        # Without that, every decorated handler would look like
        # (*args, **kwargs) and resolve to nothing (Lesson 8.2).
        signature = inspect.signature(fn)

        # get_type_hints, not __annotations__: under
        # "from __future__ import annotations" the raw values are
        # STRINGS, so the dict lookup would silently never match.
        try:
            hints = typing.get_type_hints(_unwrapped(fn))
        except NameError as err:
            # A TYPE_CHECKING-only import leaves nothing to resolve
            # against (Lesson 7.4). Say so precisely.
            raise ResolutionError(
                f"cannot resolve annotations of {_name(fn)}: {err}. "
                "Types used for injection must be importable at runtime.",
                path,
            ) from err

        resolved: dict[str, Any] = {}

        for name, param in signature.parameters.items():
            if name in overrides:
                resolved[name] = overrides[name]
                continue

            if param.kind in (param.VAR_POSITIONAL, param.VAR_KEYWORD):
                raise ResolutionError(
                    f"{_name(fn)} takes *{name} or **{name}; injection "
                    "requires named parameters with annotations",
                    path,
                )

            annotation = hints.get(name)

            if annotation is None:
                if param.default is not inspect.Parameter.empty:
                    continue                 # unannotated but defaulted: fine
                raise ResolutionError(
                    f"parameter {name!r} of {_name(fn)} has no annotation "
                    "and no default",
                    path,
                )

            if annotation in self._providers:
                resolved[name] = self._resolve_type(annotation, path)
            elif param.default is not inspect.Parameter.empty:
                # Default beats failure -- an optional dependency.
                continue
            else:
                raise ResolutionError(
                    f"no provider for {_type_name(annotation)}, needed by "
                    f"parameter {name!r} of {_name(fn)}",
                    path,
                )

        return resolved

    def _resolve_type(self, type_: type, path: list[str]) -> Any:
        if type_ in self._singletons:
            return self._singletons[type_]

        name = _type_name(type_)
        if name in path:
            # An explicit check, because recursion would otherwise end
            # in a RecursionError 1000 frames deep with no useful path.
            raise ResolutionError(
                f"dependency cycle involving {name}", path + [name]
            )

        provider = self._providers[type_]
        kwargs = self._resolve_parameters(provider, {}, path + [name])
        instance = provider(**kwargs)

        if self._is_singleton.get(type_):
            self._singletons[type_] = instance
        return instance

    def inject(self, fn: Callable[..., T]) -> Callable[..., T]:
        """Decorator form: fill in whatever the caller does not pass."""
        @functools.wraps(fn)                 # so signature() still works
        def wrapper(**kwargs: Any) -> T:
            return self.call(fn, **kwargs)
        return wrapper


def _unwrapped(fn: Callable[..., Any]) -> Callable[..., Any]:
    """get_type_hints resolves against a function's OWN globals, so it
    must see the original, not the wrapper -- whose module may not
    import the annotated types at all."""
    return inspect.unwrap(fn)


def _name(fn: Callable[..., Any]) -> str:
    return getattr(fn, "__qualname__", repr(fn))


def _type_name(type_: Any) -> str:
    return getattr(type_, "__name__", str(type_))


# =========================================================================
# TESTS
# =========================================================================

import pytest


class Config:
    def __init__(self, dsn: str = "postgres://localhost") -> None:
        self.dsn = dsn


class Database:
    def __init__(self, config: Config) -> None:
        self.config = config


class Cache:
    def __init__(self) -> None:
        self.hits = 0


def build_container() -> Container:
    c = Container()
    c.provide(Config, Config, singleton=True)
    c.provide(Database, Database)
    c.provide(Cache, Cache, singleton=True)
    return c


def test_resolves_a_nested_graph() -> None:
    """Database needs Config, which the container resolves recursively."""
    def handler(db: Database) -> str:
        return db.config.dsn

    assert build_container().call(handler) == "postgres://localhost"


def test_singletons_are_shared_and_others_are_not() -> None:
    container = build_container()

    def handler(a: Cache, b: Cache, c: Database, d: Database) -> tuple:
        return a, b, c, d

    a, b, c, d = container.call(handler)
    assert a is b                    # singleton
    assert c is not d                # a fresh Database each time


def test_it_sees_through_a_decorator() -> None:
    """THE reason functools.wraps matters. Without __wrapped__,
    signature() reports (*args, **kwargs) and nothing resolves."""
    def logged(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper

    @logged
    def handler(db: Database) -> str:
        return db.config.dsn

    assert build_container().call(handler) == "postgres://localhost"


def test_a_decorator_without_wraps_fails_loudly() -> None:
    def bare(fn):
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper                          # no @wraps

    @bare
    def handler(db: Database) -> str: ...

    with pytest.raises(ResolutionError, match=r"\\*args or \\*\\*args"):
        build_container().call(handler)


def test_string_annotations_are_resolved() -> None:
    """This module has "from __future__ import annotations", so every
    annotation above is a STRING. Reading __annotations__ directly, the
    dict lookup would never match a type and nothing would resolve."""
    def handler(db: "Database") -> str:
        return db.config.dsn

    assert build_container().call(handler) == "postgres://localhost"


def test_defaults_win_over_failure() -> None:
    class NotRegistered: ...

    def handler(thing: NotRegistered = None, db: Database = None) -> tuple:
        return thing, db

    thing, db = build_container().call(handler)
    assert thing is None                        # unresolvable, defaulted
    assert isinstance(db, Database)             # resolvable, injected


def test_missing_provider_names_the_parameter() -> None:
    class NotRegistered: ...

    def handler(thing: NotRegistered) -> None: ...

    with pytest.raises(ResolutionError) as err:
        build_container().call(handler)

    assert "no provider for NotRegistered" in str(err.value)
    assert "parameter 'thing'" in str(err.value)


def test_cycles_are_reported_with_a_path() -> None:
    """Without the explicit check this is a RecursionError a thousand
    frames deep, with nothing indicating which types are involved."""
    class A: ...
    class B: ...

    container = Container()
    container.provide(A, lambda b: A(), singleton=False)
    container.provide(B, lambda a: B(), singleton=False)

    # annotate the lambdas' parameters
    def make_a(b: B) -> A: return A()
    def make_b(a: A) -> B: return B()
    container.provide(A, make_a)
    container.provide(B, make_b)

    def handler(a: A) -> None: ...

    with pytest.raises(ResolutionError, match="dependency cycle"):
        container.call(handler)


def test_overrides_take_precedence() -> None:
    """The seam that makes injected code testable: pass a fake and the
    container does not resolve that parameter at all."""
    fake = Database(Config("sqlite://:memory:"))

    def handler(db: Database) -> str:
        return db.config.dsn

    assert build_container().call(handler, db=fake) == "sqlite://:memory:"`,
        notes: [
          { t: "p", text: "**`inspect.signature` follows `__wrapped__` by default**, which is the entire reason a decorated handler still resolves. It is also why the test for a decorator *without* `functools.wraps` fails with a message about `*args` — the container sees the wrapper's own signature and correctly refuses, rather than silently injecting nothing." },
          { t: "p", text: "**`get_type_hints(inspect.unwrap(fn))`, not `fn.__annotations__`.** Two separate reasons: under `from __future__ import annotations` the raw values are strings, so a dict lookup by type never matches; and hints resolve against the function's *own* globals, which for a wrapper is the decorator's module, where the annotated types are probably not imported." },
          { t: "p", text: "**The explicit cycle check turns a `RecursionError` into a diagnosis.** A thousand frames deep with no indication of which types are involved is among the least useful errors a framework can produce; carrying the path means the message names the loop." },
          { t: "callout", kind: "insight", title: "Why the `NameError` branch exists", body: [
            { t: "p", text: "A `TYPE_CHECKING`-only import satisfies the type checker and leaves nothing importable at runtime, so `get_type_hints` raises `NameError` naming a type the developer believes they imported." },
            { t: "p", text: "Catching it and saying \"types used for injection must be importable at runtime\" converts a genuinely baffling error into an instruction. This is the same problem Pydantic surfaces when it asks you to rebuild a model." }
          ]},
          { t: "p", text: "**Overrides are what make injected code testable**, and they are three lines. A parameter passed explicitly is never resolved, so a test hands in a fake without registering anything — the same seam pytest gives you when you pass a fixture value directly." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team builds an internal framework that discovers handlers by scanning modules with `inspect.getmembers` and registering every function whose name starts with `handle_`. It is convenient and works well for a year." },
      { t: "p", text: "**Then a developer adds `handle_timeout` as a local helper inside a test module.** The scanner imports the module, finds the function, and registers it as a production route — with no authentication, because it was never meant to be one." },
      { t: "p", text: "**Discovery by scanning cannot distinguish intent.** A naming convention is not a declaration: helpers, test doubles, partially written functions and re-exported names all match, and a scanner that runs at import time in production has no way to tell." },
      { t: "p", text: "**An explicit registration decorator fixed it in an afternoon** — `@route(\"/orders\")` on the twelve real handlers. Introspection is right for reading the shape of something you were *given*, like a signature you are about to call. It is the wrong tool for deciding what exists, because that is a decision someone should make in writing (Lesson 8.2)." }
    ]}
  ],

  takeaways: [
    "**`inspect.signature` gives parameter names, kinds, defaults and annotations** — the basis of every framework that decides what to pass a function.",
    "**`inspect.Parameter.empty` is the no-default sentinel**, because `None` is a legitimate default.",
    "**`sig.bind(*args, **kwargs)` normalises a call into a named dictionary**, which is how a decorator can log an argument regardless of how it was passed — and it validates for free.",
    "**Compute the signature once, at decoration time.** `inspect.signature` is not cheap enough for a per-call path.",
    "**`signature` follows `__wrapped__` by default**, so `functools.wraps` is what keeps a decorated function introspectable.",
    "**Use `typing.get_type_hints`, not `__annotations__`** — under `from __future__ import annotations` the raw values are strings, so the same code behaves differently per module.",
    "**`get_type_hints` resolves against the function's own globals**, so pass the unwrapped function; a wrapper's module may not import the annotated types.",
    "**A `TYPE_CHECKING`-only import makes `get_type_hints` raise `NameError`** — anything introspected at runtime needs its types genuinely importable.",
    "**Frame inspection is fragile**: a decorator anywhere above changes `f_back`, `inspect.stack()` reads source files, and frames keep every local alive.",
    "**A parameter beats a frame.** `logging.getLogger(__name__)` asks the caller rather than guessing, and never gets the wrong answer.",
    "**`isfunction` on a class and `ismethod` on an instance** differ because of the descriptor protocol — the same object, accessed two ways.",
    "**Do not discover behaviour by scanning.** A naming convention matches helpers and test doubles too; an explicit registration decorator states intent."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A framework reads handler parameters with `inspect.signature`. After a team adds a decorator, every handler resolves to nothing. Why?",
        options: [
          "`inspect.signature` cannot be used on decorated functions",
          "The decorator lacks `functools.wraps`, so there is no `__wrapped__` for `signature` to follow and it reports the wrapper's `(*args, **kwargs)`",
          "Decorators strip annotations from the wrapped function",
          "The framework must call `inspect.unwrap` first"
        ],
        answer: 1,
        why: "`inspect.signature` follows the `__wrapped__` chain by default, and `functools.wraps` is what sets it. Without that, the framework sees the wrapper's own parameters — which is why an undecorated-looking `(*args, **kwargs)` breaks pytest fixtures, FastAPI models and generated documentation all at once, and always silently."
      },
      {
        stem: "Why call `typing.get_type_hints(fn)` rather than reading `fn.__annotations__`?",
        options: [
          "`__annotations__` is private",
          "Under `from __future__ import annotations` the values are strings, so a lookup by type never matches — `get_type_hints` resolves them against the function's globals",
          "`__annotations__` omits the return type",
          "`get_type_hints` is faster"
        ],
        answer: 1,
        why: "The same code then behaves differently depending on whether a module has the `__future__` import, which is a maddening bug to track down. `get_type_hints` always returns objects. Pass the *unwrapped* function, since resolution uses that function's own globals and a wrapper's module may not import the annotated types."
      },
      {
        stem: "What is the main risk of `inspect.currentframe().f_back` to find the caller's module?",
        options: [
          "It is not available in CPython",
          "Any decorator applied above you adds a frame, so `f_back` points at the wrapper rather than the caller",
          "It raises when called from a coroutine",
          "It returns the module where the function was defined"
        ],
        answer: 1,
        why: "The frame count is not a stable contract: decorators, comprehensions and generators all shift it, and the answer changes when someone adds one anywhere above. `inspect.stack()` is worse still because it reads source files for context lines. The robust alternative is asking the caller — which is exactly what `logging.getLogger(__name__)` does."
      },
      {
        stem: "A framework registers every function named `handle_*` found by `inspect.getmembers`. What goes wrong?",
        options: [
          "`getmembers` is too slow at import time",
          "A naming convention cannot express intent — a local helper or a test double matching the pattern gets registered as a production route",
          "`getmembers` cannot see functions defined inside classes",
          "It fails for decorated functions"
        ],
        answer: 1,
        why: "Discovery by scanning matches everything that fits the pattern: helpers, half-written functions, re-exported names, test doubles. An explicit `@route(\"/orders\")` decorator states intent in writing and is impossible to trigger by accident. Introspection is for reading the shape of something you were given, not for deciding what exists."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How does a framework like pytest know what to pass your test function?",
        strong: "`inspect.signature` — it reads the parameter names, matches them against registered fixtures, and calls the function with what it resolved. FastAPI does the same with annotations rather than names.",
        answer: [
          { t: "p", text: "The consequence worth drawing out: introspection turns parameter names into a public contract, so renaming a fixture argument is a breaking change for users." },
          { t: "p", text: "`__wrapped__` is the mechanism that keeps it working through decorators, which is the strongest practical reason `functools.wraps` is non-negotiable." },
          { t: "p", text: "Mentioning `sig.bind` shows range — it normalises a call into named arguments, which is what a decorator needs to log a value regardless of how it was passed." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use frame inspection?",
        strong: "Rarely. It is legitimate where a library must attribute something to its caller — a logger's default name, a debugger, pytest's assertion rewriting — and fragile everywhere else, because any decorator above you changes the frame count.",
        answer: [
          { t: "p", text: "The fragility is the substance: `f_back` is not a stable contract, and the answer changes when someone adds a decorator in unrelated code." },
          { t: "p", text: "Performance and lifetime are the other two costs — `inspect.stack()` reads source files, and holding a frame holds every local in it." },
          { t: "p", text: "The alternative is what makes the answer decisive: `logging.getLogger(__name__)` asks the caller to pass the name, which is one extra argument and never wrong." }
        ]
      },
      {
        level: "advanced",
        q: "What is the difference between `__annotations__` and `get_type_hints`?",
        strong: "`__annotations__` is the raw mapping — strings under `from __future__ import annotations`, objects without it. `get_type_hints` resolves them against the function's globals and always gives objects.",
        answer: [
          { t: "p", text: "The reason it matters is that the same introspection code works in one module and silently fails in another, which is a nasty way to learn the distinction." },
          { t: "p", text: "The `TYPE_CHECKING` interaction is the detail that shows first-hand use: an import that exists only for the checker leaves `get_type_hints` raising `NameError` on a type the developer believes they imported." },
          { t: "p", text: "Passing the unwrapped function is the last piece — resolution uses the function's own globals, and a decorator's module rarely imports the types being annotated." }
        ]
      }
    ]
  }
});
