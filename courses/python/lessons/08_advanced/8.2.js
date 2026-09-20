/* ============================================================================
   LESSON 8.2 — Advanced Decorators
   ========================================================================= */
EC.receiveLesson({
  id: "8.2",

  lede: "`@decorator` is syntax for `f = decorator(f)`. Everything else follows from that one substitution — including why a decorator with arguments needs three levels of nesting, why a class-based decorator breaks on methods, and why a wrapper without `functools.wraps` quietly destroys your documentation, your debugger and your type checker.",

  objectives: [
    "Write decorators with arguments, and ones that work with or without them",
    "Explain what `functools.wraps` copies and what breaks without it",
    "Decorate methods correctly, including alongside `classmethod` and `property`",
    "Preserve a signature for type checkers using `ParamSpec`",
    "Choose between a closure, a class and a class decorator"
  ],

  prerequisites: ["3.6", "5.10"],

  blocks: [

    { t: "h2", n: "01", text: "The three shapes", id: "shapes" },

    { t: "viz",
      title: "Each level of nesting exists for a reason",
      caption: "A decorator receives the function. A decorator factory receives the arguments and returns a decorator, which then receives the function. The extra level is not ceremony — it is the only place the arguments can be captured.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram comparing a plain decorator with two levels against a parametrised decorator with three levels of nesting">
  <rect x="14" y="26" width="418" height="248" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="34" y="52" class="s-label">@log — no arguments</text>

  <g class="s-mono" style="font-size:11px">
    <text x="34" y="84">def log(fn):</text>
    <text x="34" y="106">    def wrapper(*a, **k):</text>
    <text x="34" y="128">        ...</text>
    <text x="34" y="150">        return fn(*a, **k)</text>
    <text x="34" y="172">    return wrapper</text>
  </g>

  <text x="34" y="212" class="s-sub">@log            means</text>
  <text x="34" y="234" class="s-mono" style="font-size:11px">f = log(f)</text>
  <text x="34" y="262" class="s-sub">TWO levels: takes fn, returns a callable</text>

  <rect x="468" y="26" width="418" height="248" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="488" y="52" class="s-label" style="fill:var(--accent-ink)">@log(level="INFO") — with arguments</text>

  <g class="s-mono" style="font-size:11px">
    <text x="488" y="84">def log(level):</text>
    <text x="488" y="106">    def decorator(fn):</text>
    <text x="488" y="128">        def wrapper(*a, **k):</text>
    <text x="488" y="150">            ...</text>
    <text x="488" y="172">        return wrapper</text>
    <text x="488" y="194">    return decorator</text>
  </g>

  <text x="488" y="234" class="s-sub">@log(level="INFO")   means</text>
  <text x="488" y="256" class="s-mono" style="font-size:11px">f = log(level="INFO")(f)</text>
  <text x="488" y="278" class="s-sub">THREE levels — the call happens first</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the two basic forms", code: `
import functools
import time


def timed(fn):
    """No arguments: takes the function directly."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            log.info("call complete", extra={
                "function": fn.__qualname__,
                "seconds": round(time.perf_counter() - start, 4),
            })
    return wrapper


def retry(attempts: int = 3, exceptions: tuple = (Exception,)):
    """With arguments: an extra level to capture them."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(attempts):
                try:
                    return fn(*args, **kwargs)
                except exceptions:
                    if attempt == attempts - 1:
                        raise
            raise AssertionError("unreachable")
        return wrapper
    return decorator


@timed
@retry(attempts=5)
def fetch(url: str) -> dict: ...
`,
      caption: "**Stacking applies bottom-up.** `fetch = timed(retry(attempts=5)(fetch))`, so `retry` is the inner wrapper and `timed` measures the whole retrying operation including its sleeps."
    },

    { t: "callout", kind: "trap", title: "Without `functools.wraps`, the function disappears", body: [
      { t: "code", lang: "python", title: "what is lost", numbered: false, code: `
def bare(fn):
    def wrapper(*a, **k):
        return fn(*a, **k)
    return wrapper                    # no @wraps


@bare
def charge(amount: int) -> str:
    """Charge a customer."""
    ...

print(charge.__name__)                # 'wrapper'
print(charge.__doc__)                 # None
print(charge.__module__)              # the DECORATOR's module
print(inspect.signature(charge))      # (*a, **k)`,
        out: `wrapper
None
mydecorators
(*a, **k)`},
      { t: "ul", items: [
        "**Logs and tracebacks say `wrapper`**, so every decorated function in the system looks identical in an error tracker.",
        "**`help()` and generated documentation show nothing.**",
        "**`pickle` fails**, because the object cannot be found under the name it reports (Lesson 7.3).",
        "**pytest fixtures, Flask routes and Click commands break**, because they read `__name__` to register things."
      ]},
      { t: "p", text: "`@functools.wraps(fn)` copies `__name__`, `__qualname__`, `__doc__`, `__module__`, `__dict__`, and — critically — sets **`__wrapped__`**, which is how `inspect.signature` finds its way back to the real function." }
    ]},

    { t: "h2", n: "02", text: "With or without arguments", id: "optional" },

    {"kind": "layers", "title": "A decorator with arguments is three functions deep", "caption": "@retry(times=3) calls retry(3) first, which returns the actual decorator, which receives the function and returns the wrapper. Each layer closes over the one outside it.", "taper": true, "items": [{"label": "retry(times=3)", "sub": "the factory: runs at decoration, returns decorator", "tone": "warn"}, {"label": "decorator(func)", "sub": "receives the function, returns wrapper", "tone": "accent"}, {"label": "wrapper(*args, **kwargs)", "sub": "runs on every call; sees times and func", "tone": "good"}], "t": "diagram", "id": "dg-8_2-02-0"},



    { t: "code", lang: "python", title: "supporting both @deco and @deco(...)", code: `
import functools


def retry(fn=None, *, attempts=3, delay=0.2):
    """Usable three ways:

        @retry                      -> fn is the function
        @retry()                    -> fn is None
        @retry(attempts=5)          -> fn is None
    """
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception:
                    if attempt == attempts - 1:
                        raise
                    time.sleep(delay * 2 ** attempt)
        return wrapper

    if fn is None:                   # called WITH arguments
        return decorator
    return decorator(fn)             # used bare, as @retry
`,
      hl: [6, 21, 22, 23],
      caption: "**The keyword-only `*` is what makes this unambiguous.** Without it, `@retry(5)` would bind `5` to `fn` and try to decorate an integer. Forcing options to be keywords means the only positional argument is ever a function."
    },

    { t: "h2", n: "03", text: "Decorating methods", id: "methods" },

    { t: "code", lang: "python", title: "a function decorator works unchanged", code: `
class Client:
    @timed
    def fetch(self, path: str) -> dict:
        ...

# Why this works: the decorator is applied to the plain FUNCTION during
# class body execution, before it ever becomes a method. self simply
# arrives as args[0] in the wrapper.
`,
      caption: "Nothing special is needed for methods — `*args` absorbs `self`. What does need care is **ordering** when another descriptor is involved."
    },

    { t: "callout", kind: "warn", title: "Order matters with `classmethod`, `staticmethod` and `property`", body: [
      { t: "code", lang: "python", title: "the outermost must be the descriptor", numbered: false, code: `
class Report:
    # RIGHT -- classmethod outermost
    @classmethod
    @timed
    def load(cls, path): ...

    # WRONG -- timed receives a classmethod object, not a function
    @timed
    @classmethod
    def broken(cls, path): ...
    # TypeError: 'classmethod' object is not callable   (before 3.10)

    # RIGHT -- property outermost
    @property
    @timed
    def total(self): ...

    # WRONG -- the property object is replaced by a plain function
    @timed
    @property
    def also_broken(self): ...`},
      { t: "p", text: "`classmethod`, `staticmethod` and `property` produce **descriptor objects**, not functions (Lesson 8.5). A function decorator applied on top of one receives that object and either fails or silently produces something that is no longer a descriptor." },
      { t: "p", text: "**The rule: descriptor decorators go outermost.** Read a stack bottom-up as function application and the reason is obvious — the descriptor must be the last thing wrapped, because it is what the class attribute needs to be." }
    ]},

    { t: "callout", kind: "trap", title: "A class-based decorator breaks on methods", body: [
      { t: "code", lang: "python", title: "the descriptor protocol is the missing piece", numbered: false, code: `
class CountCalls:
    def __init__(self, fn):
        self.fn = fn
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        return self.fn(*args, **kwargs)


@CountCalls                     # fine on a plain function
def ping(): ...


class Service:
    @CountCalls                 # BROKEN on a method
    def fetch(self, path): ...

Service().fetch("/x")
# TypeError: fetch() missing 1 required positional argument: 'path'`,
        out: `TypeError: fetch() missing 1 required positional argument: 'path'`},
      { t: "p", text: "A plain function is a descriptor: `instance.method` triggers `__get__`, which binds `self`. A `CountCalls` **instance** is not, so `Service().fetch` returns the object itself with no binding — and `self` is never passed." },
      { t: "code", lang: "python", title: "two fixes", numbered: false, code: `
# 1. Add __get__ -- make the class a descriptor
def __get__(self, obj, objtype=None):
    if obj is None:
        return self
    return functools.partial(self.__call__, obj)

# 2. Or use a closure, which sidesteps the problem entirely
def count_calls(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        wrapper.count += 1
        return fn(*args, **kwargs)
    wrapper.count = 0            # state on the function object
    return wrapper`},
      { t: "p", text: "**Prefer the closure.** It works on functions and methods identically, `functools.wraps` handles the metadata, and attaching state to the wrapper object covers most of what people reach for a class to do. The same reasoning explains why `lru_cache` on a method leaks instances (Lesson 5.10) — one shared object where per-instance behaviour was wanted." }
    ]},

    { t: "h2", n: "04", text: "Keeping the type checker", id: "typing" },

    { t: "ladder",
      title: "A decorator's effect on types",
      rungs: [
        { level: "bad", label: "No annotations",
          why: "The checker infers `Callable[..., Any]` for anything decorated, so every call site loses argument checking and the return type. One untyped decorator can erase types across a whole codebase.",
          code: `def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

@timed
def charge(amount: int) -> str: ...

charge("not an int")        # mypy: no error. It should be one.` },
        { level: "ok", label: "A TypeVar bound to Callable",
          why: "The decorated function keeps its exact type, so calls are checked again. But the wrapper's own body is untyped, and the decorator cannot add or remove parameters — which is fine here and limiting in general.",
          code: `from typing import Callable, TypeVar

F = TypeVar("F", bound=Callable[..., object])

def timed(fn: F) -> F:
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper          # type: ignore[return-value]` },
        { level: "best", label: "ParamSpec",
          why: "`P` captures the parameter list and `R` the return type, so the checker knows the wrapper takes exactly what the wrapped function takes. No `type: ignore`, the wrapper body is checked, and a decorator that *adds* a parameter can be expressed with `Concatenate`.",
          code: `from collections.abc import Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def timed(fn: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            log.info("timed", extra={"fn": fn.__qualname__,
                                     "s": time.perf_counter() - start})
    return wrapper


@timed
def charge(amount: int) -> str: ...

charge("nope")      # mypy: Argument 1 has incompatible type "str"`,
          note: "`ParamSpec` needs Python 3.10, or `typing_extensions` on older versions. `Concatenate[Connection, P]` types a decorator that injects a first argument — the shape used by database and request decorators." }
      ]
    },

    { t: "h2", n: "05", text: "Class decorators", id: "classdeco" },

    { t: "code", lang: "python", title: "same substitution, applied to a class", code: `
def register(cls):
    """@register means: cls = register(cls)"""
    HANDLERS[cls.event_type] = cls
    return cls                          # MUST return it


@register
class OrderCreated:
    event_type = "order.created"


# A parametrised one -- the same three-level shape
def retryable(*, attempts: int):
    def decorator(cls):
        cls._retry_attempts = attempts
        return cls
    return decorator
`,
      caption: "`@dataclass`, `@functools.total_ordering` and `@runtime_checkable` are all class decorators. **They must return a class** — forgetting the `return` replaces your class with `None`, and the error appears wherever it is next used."
    },

    { t: "callout", kind: "tradeoff", title: "Class decorator or `__init_subclass__`?", body: [
      { t: "table",
        head: ["", "Class decorator", "`__init_subclass__`"],
        rows: [
          ["Applies to", "Only the class you decorate", "Every subclass, automatically"],
          ["Opt-in", "Yes — explicit at each class", "No — inherited whether wanted or not"],
          ["Visible at the class", "**Yes**, one line at the top", "No — the behaviour lives in the base"],
          ["Can replace the class", "Yes", "No"],
          ["Best for", "Registration, adding attributes, `dataclass`-style rewriting", "Enforcing an invariant across a hierarchy"]
        ]
      },
      { t: "p", text: "**Prefer the class decorator when the behaviour is a choice**, because it is visible where it applies. Prefer `__init_subclass__` when it is a rule the base class enforces on everyone (Lesson 8.6)." },
      { t: "p", text: "Both are far simpler than a metaclass, and between them they cover almost everything metaclasses were once used for." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A decorator fit for production",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Write `@instrumented` — the decorator a service applies to its handlers. It must time the call, log structured success and failure, count invocations, and be configurable — while being invisible to everything that inspects the function." },
        { t: "p", text: "The hard requirements are the ones about transparency: after decoration, `inspect.signature`, `mypy`, `pickle` and a `pytest` fixture must all still see the original function." }
      ],
      requirements: [
        "Usable as `@instrumented`, `@instrumented()` and `@instrumented(name=\"x\", level=logging.DEBUG)`.",
        "Preserves `__name__`, `__doc__`, signature and type information — verified by tests.",
        "Works identically on functions, methods, classmethods and static methods.",
        "Logs success at the configured level and failure with the traceback, both with structured fields.",
        "Exposes a live call count and lets a test reset it.",
        "Adds no measurable overhead when instrumentation is disabled.",
        "**Explain why a class-based implementation would fail one of these requirements.**"
      ],
      hint: "For the disabled case, remember that a decorator runs once at import time — so the cheapest possible implementation returns the original function untouched rather than wrapping it in a conditional.",
      solution: {
        lang: "python",
        title: "instrumentation.py",
        code: `from __future__ import annotations

import functools
import logging
import os
import time
from collections.abc import Callable
from typing import Any, ParamSpec, TypeVar, overload

log = logging.getLogger(__name__)

P = ParamSpec("P")
R = TypeVar("R")

INSTRUMENTATION_ENABLED = os.environ.get("INSTRUMENTATION", "1") != "0"


@overload
def instrumented(fn: Callable[P, R]) -> Callable[P, R]: ...
@overload
def instrumented(
    *, name: str | None = ..., level: int = ..., threshold_ms: float = ...
) -> Callable[[Callable[P, R]], Callable[P, R]]: ...


def instrumented(
    fn: Callable[P, R] | None = None,
    *,
    name: str | None = None,
    level: int = logging.INFO,
    threshold_ms: float = 0.0,
) -> Any:
    """Time, log and count calls.

    Usable as @instrumented, @instrumented() or @instrumented(level=...).
    The keyword-only star is what makes that unambiguous: the only
    positional argument can ever be a function, so "fn is None" reliably
    means "called with options".
    """

    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        # Disabled: return the ORIGINAL function. Not a wrapper with an
        # "if" in it -- there is then genuinely zero runtime cost, not a
        # small one. The decorator runs once at import; the function runs
        # a billion times.
        if not INSTRUMENTATION_ENABLED:
            return fn

        label = name or fn.__qualname__

        # ParamSpec: the wrapper takes exactly what fn takes and returns
        # exactly what fn returns, so mypy still checks every call site.
        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            wrapper.calls += 1                       # type: ignore[attr-defined]
            start = time.perf_counter()
            try:
                result = fn(*args, **kwargs)
            except Exception:
                elapsed = (time.perf_counter() - start) * 1000
                # exception() attaches the traceback; the message is a
                # CONSTANT so an aggregator groups it (Lesson 6.4).
                log.exception("call failed", extra={
                    "function": label,
                    "duration_ms": round(elapsed, 3),
                    "outcome": "error",
                })
                raise
            elapsed = (time.perf_counter() - start) * 1000
            if elapsed >= threshold_ms:
                log.log(level, "call complete", extra={
                    "function": label,
                    "duration_ms": round(elapsed, 3),
                    "outcome": "ok",
                })
            return result

        # State on the wrapper object -- the closure equivalent of an
        # instance attribute, and it survives functools.wraps because
        # wraps copies fn.__dict__ INTO wrapper before this runs.
        wrapper.calls = 0                            # type: ignore[attr-defined]
        wrapper.reset = lambda: setattr(wrapper, "calls", 0)  # type: ignore[attr-defined]
        return wrapper

    if fn is None:
        return decorator
    return decorator(fn)


# =========================================================================
# WHY NOT A CLASS
# =========================================================================
#
#   class Instrumented:
#       def __init__(self, fn): self.fn, self.calls = fn, 0
#       def __call__(self, *a, **k): ...
#
# It fails the "works on methods" requirement. A plain function is a
# DESCRIPTOR: accessing it through an instance triggers __get__, which
# binds self. An Instrumented INSTANCE is not a descriptor, so
#
#     Service().fetch("/x")
#
# returns the Instrumented object itself, unbound, and self is never
# passed -- "missing 1 required positional argument".
#
# It can be fixed by implementing __get__ and returning a
# functools.partial, but then you have reimplemented what a closure
# gives you for free. It also complicates functools.wraps, pickling and
# ParamSpec typing. The closure is simply the better tool here.


# =========================================================================
# TESTS
# =========================================================================

import inspect
import pickle

import pytest


@instrumented
def add(a: int, b: int = 0) -> int:
    """Add two numbers."""
    return a + b


@instrumented(name="custom", level=logging.DEBUG)
def multiply(a: int, b: int) -> int:
    return a * b


class Service:
    @instrumented
    def fetch(self, path: str) -> str:
        return f"got {path}"

    @classmethod
    @instrumented                    # classmethod OUTERMOST
    def create(cls, name: str) -> "Service":
        return cls()

    @staticmethod
    @instrumented
    def helper(x: int) -> int:
        return x * 2


def test_all_three_call_forms_work() -> None:
    @instrumented
    def bare() -> int:
        return 1

    @instrumented()
    def empty() -> int:
        return 2

    @instrumented(level=logging.DEBUG)
    def configured() -> int:
        return 3

    assert (bare(), empty(), configured()) == (1, 2, 3)


def test_metadata_survives() -> None:
    """Without functools.wraps every one of these fails, and every
    decorated function in the service logs as 'wrapper'."""
    assert add.__name__ == "add"
    assert add.__doc__ == "Add two numbers."
    assert add.__module__ == __name__
    assert add.__wrapped__ is not None        # how inspect finds its way back


def test_signature_is_preserved_exactly() -> None:
    """inspect.signature follows __wrapped__, which @wraps sets. Without
    it the signature reads (*args, **kwargs) and every framework that
    introspects -- pytest, FastAPI, click -- misbehaves."""
    sig = inspect.signature(add)

    assert list(sig.parameters) == ["a", "b"]
    assert sig.parameters["b"].default == 0
    assert sig.return_annotation is int


def test_it_works_on_methods_and_descriptors() -> None:
    """The requirement a class-based decorator fails."""
    service = Service()

    assert service.fetch("/x") == "got /x"    # self bound correctly
    assert isinstance(Service.create("a"), Service)
    assert Service.helper(3) == 6


def test_call_count_is_live_and_resettable() -> None:
    add.reset()
    add(1, 2)
    add(3)

    assert add.calls == 2
    add.reset()
    assert add.calls == 0


def test_failure_is_logged_with_a_traceback_and_reraised(caplog) -> None:
    @instrumented
    def explode() -> None:
        raise ValueError("boom")

    with caplog.at_level(logging.ERROR):
        with pytest.raises(ValueError):
            explode()

    record = caplog.records[-1]
    assert record.message == "call failed"     # a CONSTANT, groupable
    assert record.outcome == "error"
    assert record.exc_info is not None
    assert isinstance(record.duration_ms, float)


def test_disabled_returns_the_original_function(monkeypatch) -> None:
    """Zero overhead means IDENTITY, not a cheap wrapper."""
    monkeypatch.setattr(
        "instrumentation.INSTRUMENTATION_ENABLED", False
    )

    def original() -> int:
        return 1

    assert instrumented(original) is original


def test_decorated_function_is_picklable() -> None:
    """Fails without @wraps: pickle looks the object up by __qualname__
    and finds a 'wrapper' that does not exist at module level."""
    assert pickle.loads(pickle.dumps(add))(1, 2) == 3


def test_threshold_suppresses_fast_calls(caplog) -> None:
    @instrumented(threshold_ms=10_000)
    def quick() -> int:
        return 1

    with caplog.at_level(logging.INFO):
        quick()

    assert not [r for r in caplog.records if r.message == "call complete"]`,
        notes: [
          { t: "p", text: "**Returning `fn` unchanged when disabled is the difference between zero cost and small cost.** A wrapper containing `if enabled:` still costs a call frame and a branch on every invocation, forever. The decorator runs once at import; the function runs a billion times, so the check belongs at decoration." },
          { t: "p", text: "**The `@overload` pair is what makes the three call forms type correctly.** Without them, a checker sees one function returning `Any` and every decorated function loses its type. With them, `@instrumented` and `@instrumented(level=...)` each resolve to the right signature." },
          { t: "p", text: "**A class-based version fails specifically on methods**, because an instance of your class is not a descriptor and so never binds `self`. It can be repaired with a `__get__` returning a `functools.partial`, at which point you have reimplemented what functions already do — which is the same reasoning behind `lru_cache` on a method being wrong (Lesson 5.10)." },
          { t: "callout", kind: "insight", title: "`__wrapped__` is the load-bearing attribute", body: [
            { t: "p", text: "`functools.wraps` copies the obvious metadata, but the attribute that matters most is `__wrapped__`. `inspect.signature` follows it, which is how pytest discovers fixture parameters, FastAPI builds a request model, and Click derives options — all from a function you have wrapped." },
            { t: "p", text: "It is also why the signature test is more valuable than the `__name__` test: `__name__` failing is cosmetic, while a lost signature silently breaks every framework that introspects." }
          ]},
          { t: "p", text: "**The `classmethod` ordering in the test class is not incidental.** `@classmethod` must be outermost, because it produces a descriptor object that a function decorator cannot wrap. Reading a decorator stack bottom-up as function application makes the rule obvious rather than something to memorise." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team adds an `@audit` decorator to every service handler for compliance logging. It works. Six weeks later, the API's generated documentation shows every endpoint as accepting `*args, **kwargs`, and request validation stops rejecting malformed bodies." },
      { t: "p", text: "**The decorator had no `functools.wraps`.** The web framework builds its schema from `inspect.signature`, which without `__wrapped__` reports the wrapper's own parameters — so every endpoint declared that it accepted anything, and the validation layer had nothing to validate against." },
      { t: "p", text: "**Nothing failed loudly.** The handlers worked, the tests passed, and the only symptom was documentation nobody read closely and validation that silently stopped happening — which is the worst possible failure for a change made for compliance reasons." },
      { t: "p", text: "**One line fixed it, and one test prevents it.** `@functools.wraps(fn)` on the wrapper, and an assertion that `inspect.signature(decorated) == inspect.signature(original)`. Any decorator applied across a codebase deserves that test, because the frameworks that read function metadata fail quietly rather than loudly." }
    ]}
  ],

  takeaways: [
    "**`@decorator` is exactly `f = decorator(f)`.** Every other rule follows from reading a stack bottom-up as function application.",
    "**A decorator with arguments needs three levels** — the extra one exists to capture the arguments and return the actual decorator.",
    "**Stacked decorators apply bottom-up**, so the one nearest the `def` is the innermost wrapper.",
    "**Always use `functools.wraps`.** Without it you lose `__name__`, `__doc__`, `__module__`, picklability, and — most damagingly — the signature.",
    "**`__wrapped__` is the attribute that matters most**: `inspect.signature` follows it, which is how pytest, FastAPI and Click introspect a decorated function.",
    "**Make options keyword-only** so `fn is None` reliably distinguishes `@deco` from `@deco(...)`; otherwise `@deco(5)` tries to decorate an integer.",
    "**Function decorators work on methods unchanged** — `self` arrives through `*args` because decoration happens before the function becomes a method.",
    "**`classmethod`, `staticmethod` and `property` must be outermost.** They produce descriptor objects, not functions, so a wrapper applied on top of one breaks.",
    "**A class-based decorator breaks on methods** because an instance is not a descriptor and never binds `self`. Prefer a closure with state attached to the wrapper.",
    "**Type a decorator with `ParamSpec` and `TypeVar`**, not `Callable[..., Any]` — one untyped decorator erases argument checking at every call site.",
    "**A class decorator must return the class.** Forgetting the `return` replaces it with `None`, and the error surfaces somewhere else entirely.",
    "**When a feature is disabled, return the original function** rather than a wrapper containing a condition — that is genuinely zero overhead."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An `@audit` decorator is added everywhere, and the API's generated schema starts showing every endpoint as `(*args, **kwargs)`. Why?",
        options: [
          "The decorator changed the functions' actual parameters",
          "It lacks `functools.wraps`, so `__wrapped__` is not set and `inspect.signature` reports the wrapper's own parameters",
          "The framework caches schemas and the cache is stale",
          "Decorators are not supported on route handlers"
        ],
        answer: 1,
        why: "Frameworks that introspect — FastAPI, pytest, Click — read `inspect.signature`, which follows `__wrapped__` back to the original function. `functools.wraps` sets it. Without it the wrapper's `(*args, **kwargs)` is what the framework sees, so request validation has nothing to validate against and fails silently rather than loudly."
      },
      {
        stem: "Why does `@instrumented` (a closure) work on a method while a class-based `@Instrumented` does not?",
        options: [
          "Classes cannot be used as decorators",
          "A function is a descriptor, so attribute access binds `self`; an instance of a decorator class is not, so `self` is never passed",
          "The class version runs at the wrong time",
          "`functools.wraps` only works on functions"
        ],
        answer: 1,
        why: "`instance.method` triggers the function's `__get__`, which produces a bound method. Replacing the class attribute with an ordinary object skips that entirely, so calling it passes only the explicit arguments — hence \"missing 1 required positional argument\". Adding `__get__` returning a `functools.partial` fixes it, at which point the closure would have been simpler."
      },
      {
        stem: "Why must options in an optional-argument decorator be keyword-only?",
        options: [
          "Positional arguments are slower to bind",
          "So the only positional argument can ever be the function, making `fn is None` a reliable test for \"called with options\"",
          "Because `functools.wraps` requires it",
          "To allow the decorator to be pickled"
        ],
        answer: 1,
        why: "The whole pattern rests on distinguishing `@retry` (the function arrives positionally) from `@retry(attempts=5)` (nothing arrives, so `fn` is `None`). If `attempts` could be passed positionally, `@retry(5)` would bind `5` to `fn` and the decorator would try to wrap an integer — with a confusing error somewhere later."
      },
      {
        stem: "What does typing a decorator as `Callable[P, R] -> Callable[P, R]` with `ParamSpec` achieve?",
        options: [
          "It makes the wrapper faster",
          "The checker knows the wrapper takes exactly the wrapped function's parameters, so call sites are still type-checked after decoration",
          "It removes the need for `functools.wraps`",
          "It allows the decorator to change the return type"
        ],
        answer: 1,
        why: "An untyped decorator makes everything it touches `Callable[..., Any]`, so argument checking and the return type are lost at every call site — one decorator can erase types across a codebase. `ParamSpec` captures the parameter list so `charge(\"nope\")` is still an error after decoration. `Concatenate[Connection, P]` extends this to decorators that inject an argument."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why do you need `functools.wraps`?",
        strong: "A wrapper replaces the function, so without it the decorated object reports the wrapper's name, has no docstring, and — most importantly — no `__wrapped__`, which is what `inspect.signature` follows.",
        answer: [
          { t: "p", text: "Leading with the signature rather than the name is the stronger answer: a wrong `__name__` is cosmetic, while a lost signature silently breaks pytest fixtures, request validation and generated documentation." },
          { t: "p", text: "Naming what it copies — `__name__`, `__qualname__`, `__doc__`, `__module__`, `__dict__`, plus setting `__wrapped__` — shows it has been read rather than cargo-culted." },
          { t: "p", text: "Picklability is a good extra: `pickle` looks an object up by qualified name and finds a `wrapper` that does not exist at module level." }
        ]
      },
      {
        level: "advanced",
        q: "Write a decorator that works both as `@retry` and `@retry(attempts=5)`.",
        strong: "One function with `fn=None` as the first parameter and every option keyword-only. If `fn` is `None` it was called with arguments, so return the inner decorator; otherwise apply it immediately.",
        answer: [
          { t: "p", text: "Explaining *why* the keyword-only star is required is the discriminating detail — without it, `@retry(5)` binds `5` to `fn` and tries to decorate an integer." },
          { t: "p", text: "Mentioning `@overload` for the type checker rounds it out: the two call forms have different signatures, and without overloads everything decorated degrades to `Any`." },
          { t: "p", text: "The honest caveat is worth adding — supporting both forms is a convenience, and requiring `@retry()` consistently is a legitimate simpler choice." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use a class decorator instead of a metaclass?",
        strong: "Almost always. A class decorator is `cls = decorator(cls)` — visible at the class, opt-in, and able to register, add attributes or rewrite the class. A metaclass changes class creation for an entire hierarchy and is far harder to reason about.",
        answer: [
          { t: "p", text: "Citing `@dataclass` and `@total_ordering` as class decorators makes the point that this covers most of what people once used metaclasses for." },
          { t: "p", text: "The `__init_subclass__` comparison shows range: a decorator is right when the behaviour is a per-class choice, and `__init_subclass__` when it is a rule the base enforces on every subclass." },
          { t: "p", text: "The practical trap deserves a mention — a class decorator must return the class, and forgetting the `return` silently binds `None`." }
        ]
      }
    ]
  }
});
