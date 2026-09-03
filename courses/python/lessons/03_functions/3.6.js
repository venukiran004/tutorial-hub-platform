/* ============================================================================
   LESSON 3.6 — Closures
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "A closure is a function that **remembers the scope it was created in**, even after that scope has returned. It is the mechanism behind decorators, callbacks that carry configuration, and rule factories — and it has one famous trap that catches people in every language that has closures, because the function remembers *the variable*, not its value.",

  objectives: [
    "Explain what a closure captures and how long it lives",
    "Inspect a closure's captured values with `__closure__`",
    "Diagnose and fix the late-binding trap",
    "Use `nonlocal` to maintain state inside a closure",
    "Choose between a closure and a class deliberately"
  ],

  prerequisites: ["3.3", "3.4"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "A function that outlives its scope", id: "what-is-a-closure" },

    { t: "code", lang: "python", title: "the definition, in six lines", code: `
def make_multiplier(factor: int):
    def multiply(x: int) -> int:
        return x * factor          # factor comes from the enclosing scope
    return multiply


double = make_multiplier(2)
triple = make_multiplier(3)

print(double(10), triple(10))
`,
      out: `20 30`
    },

    { t: "p", text: "`make_multiplier` has returned and its local `factor` is gone from any normal point of view. Yet `double` still knows its factor is 2 and `triple` knows its is 3. Each returned function carries its own private copy of the enclosing scope." },

    { t: "viz",
      title: "What a closure holds",
      caption: "When a nested function references a name from an enclosing scope, Python stores that name in a cell rather than a normal local slot, and attaches the cell to the inner function. The cell keeps the value alive after the outer function returns, and each call to the factory creates a fresh one.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram: two closures each holding their own cell containing a captured value">
  <defs>
    <marker id="a13" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-mono" style="font-size:11px">double = make_multiplier(2)</text>
  <text x="20" y="150" class="s-mono" style="font-size:11px">triple = make_multiplier(3)</text>

  <g>
    <rect x="20" y="36" width="150" height="70" rx="8" class="s-fill s-stroke" stroke-width="1"/>
    <text x="95" y="60" text-anchor="middle" class="s-label">double</text>
    <text x="95" y="78" text-anchor="middle" class="s-sub">function object</text>
    <text x="95" y="94" text-anchor="middle" class="s-mono" style="font-size:9.5px">__closure__</text>

    <line x1="170" y1="80" x2="228" y2="80" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a13)"/>

    <rect x="234" y="52" width="120" height="42" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
    <text x="294" y="70" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink)">cell</text>
    <text x="294" y="86" text-anchor="middle" class="s-mono" style="fill:var(--accent-ink)">factor = 2</text>
  </g>

  <g>
    <rect x="20" y="162" width="150" height="70" rx="8" class="s-fill s-stroke" stroke-width="1"/>
    <text x="95" y="186" text-anchor="middle" class="s-label">triple</text>
    <text x="95" y="204" text-anchor="middle" class="s-sub">function object</text>
    <text x="95" y="220" text-anchor="middle" class="s-mono" style="font-size:9.5px">__closure__</text>

    <line x1="170" y1="206" x2="228" y2="206" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a13)"/>

    <rect x="234" y="178" width="120" height="42" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
    <text x="294" y="196" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink)">cell</text>
    <text x="294" y="212" text-anchor="middle" class="s-mono" style="fill:var(--accent-ink)">factor = 3</text>
  </g>

  <rect x="400" y="52" width="480" height="80" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="416" y="74" class="s-sub" style="fill:var(--good);font-weight:600">Each factory call makes a NEW cell</text>
  <text x="416" y="94" class="s-sub">so double and triple cannot interfere, and both</text>
  <text x="416" y="110" class="s-sub">outlive the make_multiplier frame that created them.</text>

  <rect x="400" y="152" width="480" height="94" rx="9" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="416" y="174" class="s-sub" style="fill:var(--crit);font-weight:600">But a cell holds the VARIABLE, not a snapshot</text>
  <text x="416" y="194" class="s-sub">If several closures are made in ONE call — inside a loop —</text>
  <text x="416" y="210" class="s-sub">they share one cell, and all see whatever it ends up holding.</text>
  <text x="416" y="232" class="s-mono" style="font-size:10px;fill:var(--crit)">that is the late-binding trap, below</text>
</svg>`
    },

    { t: "code", lang: "python", title: "you can inspect the cells", code: `
print(double.__closure__)
print(double.__closure__[0].cell_contents)
print(double.__code__.co_freevars)      # which names were captured

def plain(x): return x * 2
print(plain.__closure__)                # None -- captures nothing
`,
      out: `(<cell at 0x...: int object at 0x...>,)
2
('factor',)
None`,
      caption: "`__closure__` is `None` for an ordinary function. Its presence is precisely what makes a function a closure — and `co_freevars` names exactly what was captured, which is useful when a closure holds more than you intended."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "The late-binding trap", id: "late-binding" },

    { t: "code", lang: "python", title: "the surprise, in every language with closures", code: `
handlers = []
for i in range(3):
    handlers.append(lambda: print(i))

for h in handlers:
    h()
`,
      out: `2
2
2`
    },

    { t: "p", text: "All three print `2`. The closures captured **the variable `i`**, not the value it held at creation time — and since `for` does not create a scope (Lesson 3.3), all three share one `i`, which is `2` when the loop ends." },

    { t: "ladder",
      title: "Fixing it",
      rungs: [
        { level: "bad", label: "Capture the variable", why: "all closures see the final value",
          code: `handlers = [lambda: print(i) for i in range(3)]
# prints 2, 2, 2`,
          note: "Note that even a comprehension does not save you here. The comprehension has its own scope, so `i` does not leak — but all three lambdas are created in that one scope and still share one cell." },

        { level: "ok", label: "Default argument", why: "binds the value at creation",
          code: `handlers = [lambda i=i: print(i) for i in range(3)]
# prints 0, 1, 2`,
          note: "Default arguments are evaluated when the function is defined (Lesson 3.1), so each lambda gets its own snapshot. It works and it is the traditional fix — but it changes the signature, so a caller can now pass `handler(99)` and override it. That is a real leak of an implementation detail." },

        { level: "best", label: "A factory, or partial", why: "a real new scope per iteration",
          code: `def make_handler(value: int):
    def handler() -> None:
        print(value)
    return handler


handlers = [make_handler(i) for i in range(3)]

# Or, when you are simply pre-binding arguments:
from functools import partial
handlers = [partial(print, i) for i in range(3)]`,
          note: "Each call to `make_handler` creates a genuinely separate scope with its own cell, which is what was wanted all along. The signature stays honest — `handler()` takes nothing — and the intent is visible. `partial` is the shorter form when you are only fixing arguments to an existing function." }
      ]
    },

    { t: "callout", kind: "insight", title: "Why late binding is the right default", body: [
      { t: "p", text: "It looks like a bug, and it is the behaviour you want everywhere else. A closure that snapshotted values could never see updates — the counter in the next section would be frozen at zero, and a decorator could not maintain state." },
      { t: "p", text: "The trap only appears when you create **several closures in one scope** and expect each to have captured something different. That is exactly the loop case, and it is why the fix is always \"give each one its own scope\" rather than \"make closures snapshot\"." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Closures with state", id: "state" },

    { t: "code", lang: "python", title: "nonlocal makes the cell writable", code: `
def make_counter(start: int = 0):
    count = start

    def increment(by: int = 1) -> int:
        nonlocal count           # without this, count would be local to increment
        count += by
        return count

    def value() -> int:
        return count             # reading needs no declaration

    return increment, value


bump, current = make_counter()
bump(); bump(5)
print(current())
`,
      out: `6`,
      caption: "Both inner functions close over the *same* cell, so `value()` sees what `increment()` wrote. That shared-cell behaviour is what makes a closure a genuine alternative to an object with attributes."
    },

    { t: "code", lang: "python", title: "a rate limiter with no class", code: `
import time
from collections.abc import Callable


def rate_limited(calls: int, per_seconds: float) -> Callable:
    """Allow at most this many invocations per window."""
    window_start = 0.0
    used = 0

    def allow() -> bool:
        nonlocal window_start, used
        now = time.monotonic()
        if now - window_start >= per_seconds:
            window_start, used = now, 0
        if used >= calls:
            return False
        used += 1
        return True

    return allow


allow = rate_limited(calls=2, per_seconds=60)
print(allow(), allow(), allow())
`,
      out: `True True False`
    },

    { t: "callout", kind: "tradeoff", title: "Closure or class?", body: [
      { t: "table",
        head: ["Closure", "Class"],
        rows: [
          ["One behaviour", "Several related methods"],
          ["State is genuinely private — no attribute to reach", "State should be inspectable or settable"],
          ["Short and self-contained", "Needs a `repr`, equality, or serialisation"],
          ["Created by a factory with configuration", "Subclassing or overriding is expected"],
          ["Debugging: state is hidden in cells", "Debugging: attributes are visible in a debugger"]
        ]
      },
      { t: "p", text: "The rate limiter above is a reasonable closure — one behaviour, private state, small. Add a `reset()`, a `remaining()` and a `__repr__` and it becomes a class, because the last row starts to matter: **closure state is genuinely hard to inspect**, and that is a real cost when something misbehaves in production." },
      { t: "p", text: "The heuristic from Lesson 3.4 holds: **one behaviour is a function; several related behaviours or inspectable state is a class.**" }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Closures keep things alive", id: "lifetime" },

    { t: "callout", kind: "warn", title: "A captured variable cannot be garbage collected", body: [
      { t: "code", lang: "python", title: "an accidental memory leak", numbered: false, code: `
def make_handler(request):
    large_response = fetch_everything(request)   # 200 MB

    def on_complete():
        # only needs the id, but the closure captures the whole frame's
        # referenced names -- large_response stays alive for the
        # handler's entire lifetime
        log.info("done: %s", request.id)

    return on_complete`},
      { t: "p", text: "Python captures only the names the inner function actually references, so `large_response` is *not* captured here — the free variables are just `request`. But `request` itself may hold a reference to the response, and then the whole graph stays alive as long as the handler is registered." },
      { t: "code", lang: "python", title: "capture the minimum", numbered: false, code: `
def make_handler(request):
    request_id = request.id          # extract just what is needed

    def on_complete():
        log.info("done: %s", request_id)

    return on_complete`},
      { t: "p", text: "**Check `fn.__code__.co_freevars` when a long-lived callback is suspected in a memory issue** — it names exactly what the closure is holding. Capturing a small scalar instead of an object graph is usually the entire fix." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Build a memoiser, then break it",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Write a caching wrapper using a closure — the same shape `functools.lru_cache` uses internally. Then find the three ways it can go wrong, which are the reasons the real implementation is more complicated than it looks." }
      ],
      requirements: [
        "Write `memoize(fn)` returning a wrapper that caches results by arguments, using a closure for the cache.",
        "Expose `cache_info()` and `cache_clear()` on the wrapper without using a class.",
        "Handle keyword arguments so `f(1, b=2)` and `f(1, 2)` are treated correctly.",
        "**Then identify three failure modes** — one about which arguments can be cached, one about memory, and one about correctness over time.",
        "Demonstrate the late-binding trap by creating several memoised functions in a loop, both wrongly and correctly.",
        "Say what `lru_cache` does about each failure mode."
      ],
      hint: "For the cache key, remember that arguments must be hashable (Lesson 2.2). For the memory question, ask what happens to a cache that never evicts. For correctness, ask what happens when the underlying data changes.",
      solution: {
        lang: "python",
        title: "memoize.py",
        code: `"""A memoiser built from a closure, and the three ways it fails."""

from __future__ import annotations

import functools
import time
from collections.abc import Callable
from typing import Any, NamedTuple


class CacheInfo(NamedTuple):
    hits: int
    misses: int
    size: int


def memoize(fn: Callable) -> Callable:
    """Cache results by arguments. The cache lives in a closure cell."""
    cache: dict[tuple, Any] = {}
    hits = misses = 0

    @functools.wraps(fn)          # keeps __name__, __doc__ (Lesson 3.7)
    def wrapper(*args, **kwargs):
        nonlocal hits, misses
        # Keyword order must not change the key, so sort the items. The
        # sentinel separates positional from keyword parts, so f(1, 2)
        # and f(1, b=2) cannot collide into the same key.
        key = (args, _KWD_MARK, tuple(sorted(kwargs.items())))
        if key in cache:
            hits += 1
            return cache[key]
        misses += 1
        result = cache[key] = fn(*args, **kwargs)
        return result

    def cache_info() -> CacheInfo:
        return CacheInfo(hits, misses, len(cache))

    def cache_clear() -> None:
        nonlocal hits, misses
        cache.clear()
        hits = misses = 0

    # Functions accept attributes (Lesson 3.4) -- no class needed.
    wrapper.cache_info = cache_info
    wrapper.cache_clear = cache_clear
    return wrapper


_KWD_MARK = object()


@memoize
def slow_square(n: int) -> int:
    time.sleep(0.01)
    return n * n


# ---- THE THREE FAILURE MODES ------------------------------------------
#
# 1. UNHASHABLE ARGUMENTS
#    The key is a tuple of the arguments, so any list, dict or set
#    argument raises TypeError: unhashable type. A memoised function
#    silently gains a constraint its signature does not mention.
#
#      @memoize
#      def process(items: list): ...
#      process([1, 2])        -> TypeError
#
#    lru_cache has the same limitation and documents it. The workaround
#    is to convert at the boundary -- accept a tuple, or freeze inside.
#
# 2. UNBOUNDED MEMORY
#    This cache never evicts. Memoising a function called with many
#    distinct arguments -- a user id, a timestamp -- grows without limit
#    for the life of the process. It is a memory leak that looks like an
#    optimisation, and it is the most common cache bug in production.
#
#    lru_cache takes maxsize (default 128) and evicts least-recently-used.
#    maxsize=None means unbounded, and is the setting to be careful with.
#
# 3. STALENESS
#    A cached result is correct only while the inputs are. Memoising a
#    function that reads a database, a file or the clock returns the
#    first answer forever.
#
#      @memoize
#      def get_config(): return load_from_disk()   # never reloads
#
#    lru_cache does nothing about this -- there is no TTL. Caching a
#    function that touches mutable external state is the caller's
#    responsibility to get right.
#
#    RULE: memoise pure functions. If it does I/O or reads the clock,
#    it needs an explicit TTL and invalidation, not a memoiser.


# ---- the late-binding demonstration ------------------------------------

def broken_factories():
    """All three memoised functions compute the SAME thing."""
    funcs = []
    for power in range(1, 4):
        @memoize
        def raise_to(n):
            return n ** power        # captures the VARIABLE power
        funcs.append(raise_to)
    return funcs


def fixed_factories():
    """Each gets its own scope, and therefore its own cell."""
    def make(power: int):
        @memoize
        def raise_to(n: int) -> int:
            return n ** power        # power is this call's parameter
        return raise_to

    return [make(power) for power in range(1, 4)]


if __name__ == "__main__":
    slow_square(4); slow_square(4); slow_square(5)
    print(slow_square.cache_info())

    print([f(2) for f in broken_factories()])   # all use power == 3
    print([f(2) for f in fixed_factories()])    # 2, 4, 8

    # Failure mode 1, demonstrated
    @memoize
    def total(items):
        return sum(items)

    try:
        total([1, 2, 3])
    except TypeError as exc:
        print(f"unhashable argument: {exc}")`,
        out: `CacheInfo(hits=1, misses=2, size=2)
[8, 8, 8]
[2, 4, 8]
unhashable argument: unhashable type: 'list'`,
        notes: [
          { t: "p", text: "**The three failure modes are why `lru_cache` looks the way it does.** `maxsize` exists because of the memory problem, the hashability constraint is documented rather than solved, and there is deliberately no TTL — because a time-based cache is a different tool with different correctness properties, and conflating them produces caches nobody can reason about." },
          { t: "p", text: "**Failure mode 3 is the one that causes incidents.** An unbounded cache eventually shows up in a memory graph; a stale cache returns confidently wrong data with no signal at all. The rule is worth stating plainly: **memoise pure functions**. Anything reading a database, a file or the clock needs explicit invalidation." },
          { t: "p", text: "**Attaching `cache_info` and `cache_clear` as function attributes** is the Lesson 3.4 property doing real work — it gives the closure a small public surface without a class. This is exactly how `lru_cache` exposes its own introspection." },
          { t: "callout", kind: "insight", title: "Why the key needs a sentinel", body: [
            { t: "p", text: "Without `_KWD_MARK`, the key for `f(1, 2)` would be `((1, 2),)` and for `f(1, b=2)` would be `((1,), ((\"b\", 2),))` — different, which is correct here. But flattening the parts, as a naive implementation does, can make `f(1, 2)` and `f(1, b=2)` collide, returning one call's result for the other." },
            { t: "p", text: "`functools` uses the same trick for the same reason. It is a good example of a cache bug that produces *wrong answers* rather than a crash, which makes it far more expensive to find." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service registers one retry callback per configured endpoint, built in a loop. Under failure conditions every retry hits the same endpoint — the last one in the configuration — regardless of which call failed." },
      { t: "p", text: "**Classic late binding.** The callbacks were created with `lambda: retry(endpoint)` inside `for endpoint in endpoints`, so all of them share one cell holding whatever `endpoint` finished as. The bug is invisible with a single endpoint configured, which is how it passed testing." },
      { t: "p", text: "**The fix is a factory**, giving each callback a genuinely separate scope — or `partial(retry, endpoint)`, which binds the value at creation. The default-argument trick works too, and leaks an overridable parameter into a callback signature that should take nothing." },
      { t: "p", text: "The recognition pattern worth keeping: **whenever several closures are created inside a loop and each is meant to remember something different, check what they actually captured.** `fn.__closure__[0].cell_contents` answers it in one line, and a test with two configured endpoints catches it before production does." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "A closure is a function that keeps its enclosing scope alive. Python stores captured names in **cells** attached to the function, visible via `__closure__` and `co_freevars`.",
    "**A closure captures the variable, not a snapshot of its value.** That is the correct default — it is what lets closures hold mutable state.",
    "The late-binding trap appears when **several closures are created in one scope**, typically a loop, and each is expected to remember something different. All three see the final value.",
    "Fix it with a **factory function** or `functools.partial`, not the default-argument trick — which works but leaks an overridable parameter into the signature.",
    "`nonlocal` makes a captured cell writable, and multiple inner functions share the same cell — which is what makes a closure a real alternative to an object.",
    "**One behaviour with private state is a closure; several related behaviours or inspectable state is a class.** Closure state is genuinely hard to see in a debugger.",
    "A closure keeps its captured objects alive for its entire lifetime. **Capture the smallest thing you need** — an id rather than a whole request object.",
    "Functions accept attributes, so a closure can expose a small public surface (`cache_info`, `cache_clear`) without becoming a class.",
    "**Memoise pure functions only.** An unbounded cache is a memory leak; a stale cache returns confidently wrong data with no signal at all."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does this print?",
        lang: "python",
        code: `funcs = []
for i in range(3):
    funcs.append(lambda: i)

print([f() for f in funcs])`,
        options: [
          "`[0, 1, 2]` — each lambda captured its own value of `i`",
          "`[2, 2, 2]` — all three closures share one cell holding `i`, which is 2 after the loop",
          "`[None, None, None]` — `i` is out of scope after the loop",
          "A `NameError`, because `i` does not exist when the lambdas are called"
        ],
        answer: 1,
        why: "A closure captures the variable, not its value at creation. Since `for` does not create a scope, all three lambdas reference the same `i`, which holds 2 when the loop finishes. Note that using a comprehension does not help — it has its own scope, but all three lambdas are still created inside that one scope and share one cell. The fix is a factory function or `partial`, which gives each closure a genuinely separate scope."
      },
      {
        stem: "Why is `nonlocal` needed in a closure that increments a captured counter?",
        options: [
          "To make the counter visible to other functions in the module",
          "Because assigning to a name makes it local to the inner function; `nonlocal` redirects the assignment to the enclosing scope's cell",
          "To prevent the counter from being garbage collected",
          "It is not needed — closures can always modify captured variables"
        ],
        answer: 1,
        why: "This is Lesson 3.3's rule applied inside a closure: assignment anywhere in a function makes that name local for the whole function, so `count += 1` would create a local and immediately fail with `UnboundLocalError` because it reads before assigning. `nonlocal` points the assignment at the enclosing function's cell. Reading a captured value needs no declaration — only writing does."
      },
      {
        stem: "A long-lived callback appears in a memory investigation. How do you find what it is holding?",
        options: [
          "Call `gc.collect()` and see whether memory is released",
          "Inspect `fn.__code__.co_freevars` and `fn.__closure__` — they name exactly which variables the closure captured and hold their values",
          "Check `sys.getsizeof(fn)`, which reports the closure's total memory",
          "Closures do not retain references, so it must be something else"
        ],
        answer: 1,
        why: "`co_freevars` lists the captured names and `__closure__` holds the corresponding cells, whose `cell_contents` are the live objects. A closure keeps everything it captured alive for its own lifetime, so a callback capturing a whole request object retains that object's entire graph. The usual fix is to extract a small scalar — the id rather than the object — before defining the inner function."
      },
      {
        stem: "Which is the strongest reason to prefer a class over a closure for stateful behaviour?",
        options: [
          "Classes are faster than closures at runtime",
          "Closure state is hidden in cells and hard to inspect in a debugger, which matters when something misbehaves in production",
          "Closures cannot hold mutable state at all",
          "Closures cannot be pickled, so they never work with multiprocessing"
        ],
        answer: 1,
        why: "Both can hold state and the performance difference is negligible. The practical distinction is visibility: attributes on an object show up in a debugger, a `repr` and a log line, while values in closure cells require `__closure__[0].cell_contents` to see. That cost is small during development and significant during an incident. The general rule: one behaviour with private state is a closure; several related behaviours or inspectable state is a class."
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
        q: "What is a closure?",
        strong: "A function that retains access to variables from the scope it was defined in, even after that scope has returned. Python stores those variables in cells attached to the function object — you can see them in `__closure__` and `co_freevars`. Each call to the enclosing function creates fresh cells, so two closures from the same factory are independent.",
        answer: [
          { t: "p", text: "A concrete example lands better than a definition — a `make_multiplier(factor)` factory returning a function that remembers its factor takes ten seconds to describe and demonstrates everything." },
          { t: "p", text: "Mentioning where they actually show up shows this is knowledge you use: decorators are closures, callbacks carrying configuration are closures, and rule or validator factories are closures." },
          { t: "p", text: "The follow-up is almost always late binding, so having that answer ready — the closure captures the variable, not a snapshot — makes the transition smooth." }
        ]
      },
      {
        level: "core",
        q: "Why do closures created in a loop all see the same value?",
        strong: "Because a closure captures the variable rather than its value, and a `for` loop does not create a new scope — so every closure shares one cell holding whatever the loop variable ended as. The fix is to give each closure its own scope, with a factory function or `functools.partial`.",
        answer: [
          { t: "p", text: "Volunteering that this is not a bug is what distinguishes a real understanding. Snapshotting would break every stateful closure — a counter would be frozen at zero and decorators could not maintain state. Late binding is the behaviour you want everywhere except this one shape." },
          { t: "p", text: "It is worth noting that a comprehension does not save you: it has its own scope, but all the closures are still created inside that one scope and share one cell." },
          { t: "p", text: "On fixes, prefer the factory to the `lambda x=x:` default-argument trick. The default works and leaks an overridable parameter into a signature that should take nothing — a caller can pass a value and silently change the behaviour." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use a closure rather than a class?",
        strong: "One behaviour with genuinely private state, created by a factory with configuration — a rate limiter, a memoiser, a configured validator. Once there are several related methods, or the state needs to be inspected, set or serialised, it should be a class.",
        answer: [
          { t: "p", text: "The debugging point is the one that carries most weight in a production context: closure state is hidden in cells, so a misbehaving closure requires `__closure__[0].cell_contents` to inspect, while an object's attributes show up in a debugger, a `repr` and a log line." },
          { t: "p", text: "It is worth adding that a closure can still expose a small public surface — attaching `cache_info` and `cache_clear` as function attributes is exactly what `lru_cache` does — so the choice is not binary in the way it first appears." },
          { t: "p", text: "The memory consideration completes the answer: a closure keeps everything it captured alive for its lifetime, so a long-lived callback should capture a small scalar rather than an object graph." }
        ]
      }
    ]
  }
});
