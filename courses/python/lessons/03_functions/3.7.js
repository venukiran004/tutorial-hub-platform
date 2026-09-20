/* ============================================================================
   LESSON 3.7 — Decorators
   ========================================================================= */
EC.receiveLesson({
  id: "3.7",

  lede: "A decorator is a function that takes a function and returns a replacement. That is the entire concept — everything else is syntax. Built up one step at a time from closures, the `@` symbol stops looking like magic and starts looking like what it is: **a way to wrap behaviour around a function without editing the function**, which is why every framework you use is full of them.",

  objectives: [
    "Derive the `@` syntax from first principles, with no magic left over",
    "Write decorators with and without arguments, and know why the shapes differ",
    "Explain what `functools.wraps` preserves and what breaks without it",
    "Build the decorators you will actually write at work: timing, retry, caching, validation",
    "Recognise where a decorator is the wrong tool"
  ],

  prerequisites: ["3.4", "3.6"],

  blocks: [

    { t: "h2", n: "01", text: "Deriving the syntax", id: "deriving" },

    {"kind": "flow", "title": "@decorator is name rebinding", "caption": "@timed above def f is exactly f = timed(f). The decorator receives the function object, returns a wrapper, and the name f now points at the wrapper — the original survives only inside the wrapper's closure.", "cols": 4, "nodes": [{"id": "def", "label": "def f(...)", "sub": "the original function"}, {"id": "dec", "label": "timed(f)", "sub": "the decorator runs once", "tone": "accent"}, {"id": "wrap", "label": "wrapper", "sub": "closes over f", "tone": "good"}, {"id": "name", "label": "f  ← wrapper", "sub": "the name is rebound", "tone": "warn"}], "edges": [["def", "dec"], ["dec", "wrap", "returns"], ["wrap", "name"]], "t": "diagram", "id": "dg-3_7-01-0"},




    { t: "p", text: "Start with the two facts from earlier lessons: functions are values (3.4), and a nested function remembers its enclosing scope (3.6). A decorator is those two facts combined." },

    { t: "code", lang: "python", title: "step 1 — a function that wraps a function", code: `
def with_logging(fn):
    def wrapper(*args, **kwargs):
        print(f"calling {fn.__name__}")
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} returned {result!r}")
        return result
    return wrapper


def add(a, b):
    return a + b


add = with_logging(add)      # replace the name with the wrapped version
print(add(2, 3))
`,
      out: `calling add
add returned 5
5`
    },

    { t: "p", text: "`wrapper` is a closure over `fn`. Rebinding the name `add` to it means every existing call site now goes through the wrapper without a single one being edited. That last line is the whole idea." },

    { t: "code", lang: "python", title: "step 2 — the @ syntax is that line, moved", code: `
@with_logging
def add(a, b):
    return a + b

# is EXACTLY equivalent to:
def add(a, b):
    return a + b
add = with_logging(add)
`,
      caption: "`@` is pure syntactic sugar. It runs at `def` time — decoration happens when the module is imported, not when the function is called."
    },

    { t: "viz",
      title: "What decoration actually does to a name",
      caption: "The original function object still exists — the wrapper holds it in a closure cell. What changed is only which object the module-level name points at. Every caller reaches the wrapper, and the wrapper decides whether and how to call the original.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Diagram: a module name rebound from the original function to a wrapper that holds the original in a closure">
  <defs>
    <marker id="a14" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">BEFORE DECORATION</text>
  <rect x="20" y="36" width="110" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="58" text-anchor="middle" class="s-mono">add</text>
  <line x1="130" y1="53" x2="196" y2="53" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a14)"/>
  <rect x="202" y="36" width="160" height="34" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="282" y="58" text-anchor="middle" class="s-mono" style="font-size:10.5px">def add(a, b)</text>

  <line x1="20" y1="92" x2="880" y2="92" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="118" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--accent-ink)">AFTER @with_logging</text>
  <rect x="20" y="130" width="110" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="75" y="152" text-anchor="middle" class="s-mono">add</text>
  <line x1="130" y1="147" x2="196" y2="147" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#a14)"/>

  <rect x="202" y="118" width="200" height="112" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="302" y="140" text-anchor="middle" class="s-mono" style="font-size:10.5px;fill:var(--accent-ink)">wrapper</text>
  <text x="302" y="160" text-anchor="middle" class="s-sub">before: log the call</text>
  <text x="302" y="192" text-anchor="middle" class="s-sub">after: log the result</text>
  <rect x="218" y="166" width="168" height="20" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="302" y="181" text-anchor="middle" class="s-mono" style="font-size:9.5px">fn(*args, **kwargs)</text>
  <text x="302" y="218" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">__closure__ holds fn</text>

  <line x1="402" y1="176" x2="466" y2="176" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a14)"/>
  <rect x="472" y="159" width="160" height="34" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="552" y="181" text-anchor="middle" class="s-mono" style="font-size:10.5px">def add(a, b)</text>
  <text x="648" y="177" class="s-sub">the original, still alive</text>

  <rect x="648" y="118" width="232" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="664" y="139" class="s-sub">No call site changed. Not one.</text>
</svg>`
    },

    { t: "h2", n: "02", text: "functools.wraps", id: "wraps" },

    { t: "code", lang: "python", title: "what the naive version destroys", code: `
import inspect


def add(a, b):
    """Return the sum of a and b."""
    return a + b


decorated = with_logging(add)

print(decorated.__name__)
print(decorated.__doc__)
print(inspect.signature(decorated))
`,
      out: `wrapper
None
(*args, **kwargs)`,
      caption: "The name is wrong, the docstring is gone, and the signature is `(*args, **kwargs)` — because those are the wrapper's, and the wrapper is what the name now points at."
    },

    { t: "callout", kind: "trap", title: "This breaks more than introspection", body: [
      { t: "ul", items: [
        "**`help()` and IDE tooltips** show the wrapper's empty signature instead of the real one.",
        "**Tracebacks** name `wrapper`, so every decorated function looks the same in an error report.",
        "**pytest** identifies tests by name — undecorated wrappers can collide or be skipped.",
        "**Frameworks that read signatures break outright.** FastAPI builds its request parsing from the signature; a wrapper reading `(*args, **kwargs)` produces an endpoint that accepts nothing."
      ]},
      { t: "code", lang: "python", title: "the one-line fix", numbered: false, code: `
import functools


def with_logging(fn):
    @functools.wraps(fn)          # copies __name__, __doc__, __wrapped__, ...
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper`,
        hl: [5]},
      { t: "p", text: "`wraps` copies `__name__`, `__doc__`, `__module__`, `__qualname__`, `__dict__` and `__annotations__`, and sets `__wrapped__` to the original — which is how `inspect.signature` recovers the true signature. **Put it on every decorator you write**; there is no case where omitting it is correct." }
    ]},

    { t: "h2", n: "03", text: "Decorators with arguments", id: "with-arguments" },

    { t: "p", text: "`@retry(times=3)` needs one more layer, and the reason is mechanical: `@expr` calls `expr` with the function. If `expr` is itself a call, its **result** must be the thing that takes the function." },

    { t: "code", lang: "python", title: "three levels, and why", code: `
import functools


def retry(times: int = 3):                 # 1. takes the ARGUMENTS
    def decorator(fn):                     # 2. takes the FUNCTION
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):      # 3. takes the CALL's arguments
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except TimeoutError:
                    if attempt == times:
                        raise
            raise AssertionError("unreachable")
        return wrapper
    return decorator


@retry(times=5)
def fetch(url): ...

# equivalent to:
#   fetch = retry(times=5)(fetch)
#   the call returns 'decorator', which is then applied to fetch
`,
      hl: [4, 5, 7],
      caption: "Read the equivalence line: `retry(times=5)` runs first and returns `decorator`; that result is then applied to `fetch`. The three nested definitions correspond exactly to the three sets of parentheses."
    },

    { t: "callout", kind: "trap", title: "The parentheses are not optional", body: [
      { t: "code", lang: "python", title: "a decorator that takes arguments always needs them", numbered: false, code: `
@retry(times=3)      # correct
def fetch(): ...

@retry               # WRONG -- passes the function as 'times'
def fetch(): ...
#
# 'times' is now the function object, and the decorator returns
# 'decorator' rather than a wrapper. Calling fetch() then fails with
# something confusing like:
#   TypeError: decorator() missing 1 required positional argument: 'fn'`},
      { t: "p", text: "The error appears at the *call site*, not at the decoration, which makes it puzzling. Supporting both forms is possible but adds a branch; the standard-library convention — `@lru_cache` works bare or with arguments — is worth copying only for widely-used utilities." }
    ]},

    { t: "h2", n: "04", text: "The four you will actually write", id: "practical" },

    { t: "tabs", items: [
      { label: "Timing", blocks: [
        { t: "code", lang: "python", title: "measure without touching the function", code: `
import functools
import logging
import time

logger = logging.getLogger(__name__)


def timed(fn):
    """Log how long each call took, at DEBUG level."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()      # monotonic, high resolution
        try:
            return fn(*args, **kwargs)
        finally:
            # finally: so a failing call is still measured -- often the
            # slow ones are the ones that time out
            elapsed = time.perf_counter() - start
            logger.debug("%s took %.3fs", fn.__qualname__, elapsed)
    return wrapper
`},
        { t: "p", text: "`perf_counter` rather than `time.time`, because the wall clock can jump backwards. `finally` rather than measuring after the call, so failures are timed too. `__qualname__` rather than `__name__`, so methods show as `Class.method`." }
      ]},
      { label: "Retry", blocks: [
        { t: "code", lang: "python", title: "with backoff and jitter", code: `
import functools
import random
import time


def retry(
    times: int = 3,
    *,
    exceptions: tuple[type[Exception], ...] = (TimeoutError, ConnectionError),
    base_delay: float = 1.0,
):
    """Retry on transient failures with exponential backoff and jitter."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as exc:
                    if attempt == times:
                        raise
                    # Jitter matters: without it, every client that
                    # failed together retries together and re-creates
                    # the load spike that caused the failure.
                    delay = base_delay * 2 ** (attempt - 1)
                    delay *= 0.5 + random.random()
                    logger.warning(
                        "%s failed (%s), retry %d/%d in %.1fs",
                        fn.__qualname__, exc, attempt, times, delay,
                    )
                    time.sleep(delay)
        return wrapper
    return decorator
`},
        { t: "callout", kind: "warn", title: "Only retry idempotent operations", body: [
          { t: "p", text: "A retry after a request that *actually succeeded* but whose response was lost will run the operation twice. For a payment or an order creation that is a duplicate charge. Retry reads freely; retry writes only when they carry an idempotency key. Lesson 6.5 covers this." }
        ]}
      ]},
      { label: "Caching", blocks: [
        { t: "code", lang: "python", title: "use the standard library", code: `
import functools


@functools.lru_cache(maxsize=256)
def expensive_lookup(key: str) -> dict:
    return db.fetch(key)


expensive_lookup.cache_info()      # hits, misses, maxsize, currsize
expensive_lookup.cache_clear()


# For a property computed once per instance:
class Report:
    @functools.cached_property
    def summary(self) -> dict:
        return build_summary(self.rows)     # computed on first access only
`},
        { t: "p", text: "Do not write your own — Lesson 3.6's exercise showed the three failure modes, and `lru_cache` handles two of them. The one it cannot help with is staleness: **cache pure functions only.** A cached function reading a database returns its first answer forever." },
        { t: "p", text: "One trap specific to methods: `@lru_cache` on a method keys on `self`, so the cache holds a reference to every instance ever passed — a memory leak that looks like an optimisation. `cached_property` stores the value on the instance instead, and is the right tool there." }
      ]},
      { label: "Validation", blocks: [
        { t: "code", lang: "python", title: "enforce a precondition at the boundary", code: `
import functools
from collections.abc import Callable


def requires_permission(permission: str):
    """Refuse the call unless the current user holds the permission."""
    def decorator(fn: Callable):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if permission not in user.permissions:
                raise PermissionError(
                    f"{user.id} lacks {permission!r} for {fn.__qualname__}"
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@requires_permission("orders.refund")
def refund_order(order_id: str) -> Receipt:
    ...
`},
        { t: "p", text: "This is the shape behind framework auth decorators. The declaration sits next to the function it protects, so a reader sees the requirement without hunting for it — and a new endpoint that forgets the decorator is visibly missing something, which a check buried in the body is not." }
      ]}
    ]},

    { t: "h2", n: "05", text: "Stacking, and order", id: "stacking" },

    {"kind": "layers", "title": "Stacked decorators apply bottom-up, run top-down", "caption": "@a above @b above def f is a(b(f)). b wraps f first, then a wraps that; on a call the outermost wrapper, a's, runs first.", "items": [{"label": "@a  — applied last, runs first on a call", "tone": "warn"}, {"label": "@b  — applied first, runs second", "tone": "accent"}, {"label": "def f  — the original, runs last", "tone": "good"}], "t": "diagram", "id": "dg-3_7-05-1"},




    { t: "code", lang: "python", title: "bottom-up application, top-down execution", code: `
@timed          # applied second, so it runs OUTERMOST
@retry(times=3) # applied first,  so it runs INNERMOST
def fetch(url): ...

# Equivalent to: fetch = timed(retry(times=3)(fetch))
`,
      caption: "Decorators are applied bottom-up and therefore execute top-down. Here `timed` measures the total time including all retries. Swap them and each attempt is timed separately — a different measurement, and which one you want is a real decision."
    },

    { t: "callout", kind: "insight", title: "Order matters more than it looks", body: [
      { t: "table",
        head: ["Order", "Behaviour"],
        rows: [
          ["`@timed` above `@retry`", "Measures total elapsed time including all retries and backoff sleeps"],
          ["`@retry` above `@timed`", "Measures each attempt separately; retries produce several log lines"],
          ["`@lru_cache` above `@timed`", "Cache hits skip the timing entirely — timings only reflect misses"],
          ["`@timed` above `@lru_cache`", "Measures every call including hits, so you can see the cache working"],
          ["`@requires_permission` above everything", "The check runs first, so an unauthorised call is not retried, cached or timed"]
        ]
      },
      { t: "p", text: "The general rule: **put the cheapest and most restrictive decorator outermost.** An authorisation check should reject before any work happens, and a cache should usually sit inside authorisation but outside expensive work." }
    ]},

    { t: "h2", n: "06", text: "When not to use a decorator", id: "when-not" },

    { t: "callout", kind: "tradeoff", title: "Three cases where it is the wrong tool", body: [
      { t: "ul", items: [
        "**The behaviour needs the function's arguments by name.** A wrapper receives `*args, **kwargs`, so reaching for a specific parameter means index guessing or `inspect.signature` — fragile, and it breaks when a caller switches between positional and keyword.",
        "**It applies to one function.** A decorator used once is indirection with no reuse. Put the code in the function.",
        "**It changes the return type or swallows exceptions.** A decorator that returns `None` on failure makes the function's contract depend on a line above the `def`, where nobody reads it."
      ]},
      { t: "code", lang: "python", title: "the argument problem, concretely", numbered: false, code: `
def audit(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        # Which one is the user? args[0]? kwargs["user"]? Depends on how
        # the caller wrote it -- and both are valid.
        user = kwargs.get("user") or args[0]
        ...`},
      { t: "p", text: "The robust fix is `inspect.signature(fn).bind(*args, **kwargs)`, which normalises both forms — covered in Lesson 8.2. But the fragility is a signal: if a decorator needs to understand the arguments deeply, the behaviour probably belongs inside the function or in an explicit call." }
    ]},

    { t: "h2", n: "07", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A decorator you would actually deploy",
      difficulty: "core",
      minutes: 35,
      body: [
        { t: "p", text: "Write an `@instrumented` decorator for service endpoints: it times the call, logs failures with context, counts outcomes, and never changes what the function returns or which exceptions it raises." },
        { t: "p", text: "The hard requirement is the last one. A decorator that alters behaviour under failure is worse than no decorator, because the alteration is invisible at the call site." }
      ],
      requirements: [
        "Time every call, including ones that raise, and record the duration.",
        "Count outcomes by result — success or the exception class name.",
        "Log failures at ERROR with the function name and duration; log successes at DEBUG.",
        "**Re-raise every exception unchanged**, preserving the original traceback.",
        "Preserve the function's name, docstring and signature so `inspect.signature` reports the real one.",
        "Accept an optional `name` argument to override the metric label, and work both bare and called.",
        "Expose collected stats on the wrapper without a class.",
        "Write a test proving the exception type, message and traceback survive."
      ],
      hint: "For the dual bare/called form, check whether the first argument is None. For the traceback, a bare `raise` inside `except` re-raises with the original traceback intact — `raise exc` does not.",
      solution: {
        lang: "python",
        title: "instrumented.py",
        code: `"""An instrumentation decorator that is transparent under failure."""

from __future__ import annotations

import functools
import logging
import time
from collections import Counter
from collections.abc import Callable
from typing import NamedTuple

logger = logging.getLogger(__name__)


class Stats(NamedTuple):
    calls: int
    outcomes: dict[str, int]
    total_seconds: float

    @property
    def mean_seconds(self) -> float:
        return self.total_seconds / self.calls if self.calls else 0.0


def instrumented(fn: Callable | None = None, *, name: str | None = None):
    """Time, log and count calls without changing observable behaviour.

    Works bare or with arguments:
        @instrumented
        @instrumented(name="checkout")
    """
    def decorate(func: Callable) -> Callable:
        label = name or func.__qualname__
        outcomes: Counter[str] = Counter()
        total = 0.0

        @functools.wraps(func)          # keeps __name__, __doc__, signature
        def wrapper(*args, **kwargs):
            nonlocal total
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
            except BaseException as exc:
                # BaseException, not Exception: KeyboardInterrupt and
                # SystemExit should still be counted and re-raised, not
                # silently uncounted.
                elapsed = time.perf_counter() - start
                total += elapsed
                outcomes[type(exc).__name__] += 1
                logger.error(
                    "%s failed after %.3fs: %s: %s",
                    label, elapsed, type(exc).__name__, exc,
                )
                # A BARE raise: re-raises the current exception with its
                # original traceback. "raise exc" would truncate the
                # traceback at this frame, hiding where it really came from.
                raise
            else:
                elapsed = time.perf_counter() - start
                total += elapsed
                outcomes["success"] += 1
                logger.debug("%s ok in %.3fs", label, elapsed)
                return result

        def stats() -> Stats:
            return Stats(
                calls=sum(outcomes.values()),
                outcomes=dict(outcomes),
                total_seconds=total,
            )

        wrapper.stats = stats
        wrapper.metric_name = label
        return wrapper

    # Bare form: instrumented was called with the function itself.
    # Called form: fn is None, so return the decorator for later use.
    if fn is None:
        return decorate
    return decorate(fn)


# ---- usage -------------------------------------------------------------

@instrumented
def add(a: int, b: int) -> int:
    """Return the sum."""
    return a + b


@instrumented(name="checkout.charge")
def charge(order_id: str, *, amount: float) -> str:
    if amount <= 0:
        raise ValueError(f"amount must be positive, got {amount}")
    return f"txn_{order_id}"


# ---- the tests that matter ---------------------------------------------

def test_metadata_is_preserved() -> None:
    import inspect

    assert add.__name__ == "add"
    assert add.__doc__ == "Return the sum."
    # The real signature, not (*args, **kwargs) -- this is what wraps buys
    assert str(inspect.signature(add)) == "(a: int, b: int) -> int"


def test_return_value_is_unchanged() -> None:
    assert add(2, 3) == 5
    assert charge("o1", amount=10.0) == "txn_o1"


def test_exception_type_message_and_traceback_survive() -> None:
    import traceback

    try:
        charge("o2", amount=-1)
    except ValueError as exc:
        assert "amount must be positive" in str(exc)
        frames = traceback.extract_tb(exc.__traceback__)
        # The frame where the exception was RAISED must still be present.
        # With "raise exc" instead of a bare "raise", it would not be.
        assert any(f.name == "charge" for f in frames), [f.name for f in frames]
    else:
        raise AssertionError("expected ValueError")


def test_outcomes_are_counted() -> None:
    fresh = instrumented(lambda ok: 1 / (1 if ok else 0))
    fresh(True)
    for _ in range(2):
        try:
            fresh(False)
        except ZeroDivisionError:
            pass

    s = fresh.stats()
    assert s.calls == 3
    assert s.outcomes == {"success": 1, "ZeroDivisionError": 2}


if __name__ == "__main__":
    for test in (
        test_metadata_is_preserved,
        test_return_value_is_unchanged,
        test_exception_type_message_and_traceback_survive,
        test_outcomes_are_counted,
    ):
        test()
    print("transparent under failure")`,
        notes: [
          { t: "p", text: "**The bare `raise` is the single most important line.** `raise exc` re-raises the same exception object but attaches the *current* frame, truncating the traceback so it appears to originate inside the decorator. Every decorated function's failures would then look identical, which is precisely the debugging information you were instrumenting to get." },
          { t: "p", text: "**`except BaseException` rather than `Exception`** so `KeyboardInterrupt` and `SystemExit` are counted and re-raised rather than passing through uncounted. This is one of the rare correct uses of `BaseException` — legitimate because the handler does not swallow anything." },
          { t: "p", text: "**The dual bare/called form** works by checking whether `fn` is `None`. Called as `@instrumented`, Python passes the function directly; called as `@instrumented(name=\"x\")`, `fn` is `None` and the inner `decorate` is returned for Python to apply next. Making `name` keyword-only removes any ambiguity about which form is intended." },
          { t: "callout", kind: "insight", title: "Why the signature test is the real deliverable", body: [
            { t: "p", text: "Asserting that `inspect.signature(add)` reads `(a: int, b: int) -> int` is what proves `functools.wraps` did its job. Without it the assertion reads `(*args, **kwargs)` — and that is exactly the failure that breaks FastAPI endpoints, pytest fixtures and every tool that inspects signatures." },
            { t: "p", text: "It is worth adding this assertion to any decorator you write. It catches a forgotten `@wraps` immediately, at the point of definition, rather than as a mystifying framework error later." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team adds `@retry(times=3)` to a payment endpoint after seeing intermittent gateway timeouts. Timeouts drop. Two weeks later, reconciliation finds a small number of customers charged two or three times." },
      { t: "p", text: "**The gateway succeeded and the response was lost.** A timeout means the client did not hear back, not that nothing happened. Retrying a non-idempotent write repeats the side effect, and the decorator's placement above the `def` makes that consequence invisible to anyone reading the call site." },
      { t: "p", text: "**The fix is not to remove the retry.** It is to make the operation idempotent — the gateway accepts an idempotency key, so a repeated request with the same key returns the original result instead of charging again. The retry then becomes safe, and the timeouts stay handled." },
      { t: "p", text: "The general point: **a decorator changes behaviour at a distance.** `@retry` on a read is obviously fine; on a write it is a correctness decision that the syntax makes look like a configuration detail. Anything that can repeat an effect deserves a comment saying why it is safe." }
    ]}
  ],

  takeaways: [
    "**A decorator is a function that takes a function and returns a replacement.** `@d` above a `def` is exactly `f = d(f)` — pure syntax, applied at import time.",
    "The wrapper is a closure over the original function, which stays alive; only the *name* is rebound, so no call site changes.",
    "**Always use `functools.wraps`.** Without it you lose `__name__`, `__doc__` and the real signature — which breaks `help()`, tracebacks, pytest collection and any framework that reads signatures, FastAPI included.",
    "A decorator taking arguments needs **three levels**: arguments → function → call. `@retry(times=3)` calls `retry` first, and its *result* decorates the function.",
    "Forgetting the parentheses on an argument-taking decorator passes the function as the first argument, and fails confusingly at the **call site** rather than at decoration.",
    "**Decorators apply bottom-up and execute top-down.** `@timed` above `@retry` measures total time including retries; swapping them measures each attempt.",
    "Put the cheapest and most restrictive decorator outermost — authorisation should reject before anything is retried, cached or timed.",
    "**Use a bare `raise` to re-raise**, never `raise exc` — the latter truncates the traceback at the decorator's frame and hides where the error came from.",
    "`@lru_cache` on a method keys on `self` and retains every instance. Use `cached_property` for per-instance computation.",
    "Wrong tool when the decorator needs specific arguments by name, when it is used once, or when it changes the return type or swallows exceptions.",
    "**Only retry idempotent operations.** A timeout means the response was lost, not that nothing happened."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is `@decorator` above `def f(): ...` exactly equivalent to?",
        options: [
          "`f = decorator(f)`, executed at definition time",
          "`decorator(f())`, executed each time `f` is called",
          "A registration that Python applies lazily on first call",
          "`f.__decorator__ = decorator`"
        ],
        answer: 0,
        why: "The `@` symbol is pure syntactic sugar for calling the decorator with the function and rebinding the name to the result. It runs when the `def` statement executes — at import time, not at call time. Understanding this removes all the apparent magic: a decorator with arguments needs an extra layer precisely because `@expr` calls `expr`, so if `expr` is itself a call, its result must be what takes the function."
      },
      {
        stem: "A decorated FastAPI endpoint stops parsing request parameters and accepts nothing. What is the likely cause?",
        options: [
          "The decorator is applied in the wrong order relative to the route decorator",
          "The decorator omits `functools.wraps`, so `inspect.signature` reports the wrapper's `(*args, **kwargs)` instead of the real signature",
          "FastAPI does not support decorated endpoints",
          "The wrapper needs to be declared `async`"
        ],
        answer: 1,
        why: "FastAPI builds its request parsing, validation and OpenAPI schema by inspecting the endpoint's signature. Without `functools.wraps`, the name refers to a wrapper whose signature is `(*args, **kwargs)`, so FastAPI concludes the endpoint takes no parameters. `wraps` sets `__wrapped__`, which is how `inspect.signature` recovers the original. This is the most common concrete symptom of a forgotten `@wraps`."
      },
      {
        stem: "Why must a decorator use a bare `raise` rather than `raise exc` when re-raising?",
        options: [
          "`raise exc` creates a new exception object, losing the original message",
          "A bare `raise` preserves the original traceback; `raise exc` attaches the decorator's frame and truncates where the error actually came from",
          "`raise exc` is a syntax error inside an `except` block",
          "They are equivalent; the bare form is only shorter"
        ],
        answer: 1,
        why: "Both re-raise the same exception object with the same message, but `raise exc` re-raises it from the current frame, so the traceback appears to start inside the decorator. Every decorated function's failures then look identical and the actual origin is lost — destroying exactly the debugging information an instrumentation decorator exists to provide. The bare `raise` re-raises the exception being handled with its traceback intact."
      },
      {
        stem: "Adding `@retry(times=3)` to a payment endpoint reduces timeouts but produces duplicate charges. Why?",
        options: [
          "The retry decorator has a race condition when called concurrently",
          "A timeout means the response was lost, not that nothing happened — retrying a non-idempotent write repeats the side effect",
          "Three retries is too many; one would be safe",
          "The exception type being caught is too broad"
        ],
        answer: 1,
        why: "The gateway may have processed the charge successfully and had its response lost in transit. The client sees a timeout and retries, charging again. The fix is not removing the retry but making the operation idempotent — an idempotency key lets the gateway recognise the repeat and return the original result. The broader point is that a decorator changes behaviour at a distance: on a read `@retry` is obviously safe, on a write it is a correctness decision the syntax makes look like configuration."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a decorator and how does it work?",
        strong: "A function that takes a function and returns a replacement. `@d` above a `def` is exactly `f = d(f)`, executed at definition time. The replacement is usually a closure holding the original, so it can run code before and after and decide whether to call it — and no existing call site changes.",
        answer: [
          { t: "p", text: "Deriving it rather than describing it is what shows understanding. Start from \"functions are values\", add \"a nested function remembers its scope\", and the `@` syntax falls out as sugar for one line of rebinding." },
          { t: "p", text: "The follow-up is nearly always `functools.wraps`, so mention it unprompted: without it the wrapper's `__name__`, `__doc__` and signature replace the original's, which breaks `help()`, tracebacks, pytest collection and anything that inspects signatures." },
          { t: "p", text: "Naming a concrete framework consequence lands well — FastAPI builds request parsing from the signature, so a missing `@wraps` produces an endpoint that accepts no parameters." }
        ]
      },
      {
        level: "core",
        q: "Why does a decorator with arguments need an extra level of nesting?",
        strong: "Because `@expr` calls `expr` with the function. If `expr` is itself a call, like `retry(times=3)`, then that call must return something which then takes the function. So you need arguments → function → call: three nested definitions matching the three sets of parentheses.",
        answer: [
          { t: "p", text: "Writing out the equivalence is the clearest way to say it: `fetch = retry(times=3)(fetch)`. Two calls, so two layers above the wrapper." },
          { t: "p", text: "The practical trap is worth adding: forgetting the parentheses on an argument-taking decorator passes the function as the first argument, and the failure appears at the *call site* with a confusing message rather than at the decoration." },
          { t: "p", text: "If you want to show range, mention that supporting both bare and called forms is done by checking whether the first argument is `None` or callable — which is how `lru_cache` works — and that it is worth the branch only for widely-used utilities." }
        ]
      },
      {
        level: "advanced",
        q: "You are asked to add `@retry` to an endpoint. What do you check first?",
        strong: "Whether the operation is idempotent. A timeout means the response was lost, not that nothing happened, so retrying a write can repeat the side effect — a duplicate charge or a duplicate order. If it is not idempotent, the fix is an idempotency key, not removing the retry.",
        answer: [
          { t: "p", text: "This separates people who have run retries in production from people who have read about them. The failure is not theoretical and it does not show up in testing, because it needs a real network partition." },
          { t: "p", text: "The second thing to check is which exceptions are retried. Catching broadly means retrying a `ValueError` from bad input three times before failing, which wastes time and multiplies log noise for something that will never succeed." },
          { t: "p", text: "Jitter is the detail that shows operational experience: without it, every client that failed together retries together and recreates the load spike that caused the failure. Randomising the backoff spreads them out." },
          { t: "p", text: "The framing to close on: a decorator changes behaviour at a distance, and the syntax makes a correctness decision look like a configuration detail. Anything that can repeat an effect deserves a comment explaining why it is safe." }
        ],
        weak: "Discussing only the backoff schedule. The interesting question is not how long to wait but whether repeating the call is safe at all."
      }
    ]
  }
});
