/* ============================================================================
   LESSON 3.3 — Scope and the LEGB Rule
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "Python resolves a name by searching four namespaces in a fixed order, and the surprising part is **when** it decides. Assignment anywhere in a function makes that name local for the *entire* function — including lines above the assignment. That single rule explains `UnboundLocalError`, why `global` is rarely the answer, and what `nonlocal` is actually for.",

  objectives: [
    "Apply the LEGB order to predict how any name resolves",
    "Explain why assignment makes a name local for the whole function body",
    "Diagnose `UnboundLocalError` from its cause rather than by trial and error",
    "Use `global` and `nonlocal` correctly — and know why you rarely should",
    "Recognise the mutable-versus-rebind distinction as it applies to scope"
  ],

  prerequisites: ["1.4", "3.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Four namespaces, one order", id: "legb" },

    {"kind": "layers", "title": "LEGB: the four namespaces, searched inside out", "caption": "A name is looked up in the local scope, then any enclosing function scopes, then the module's globals, then the builtins. The first hit wins — which is how a local can shadow print().", "taper": true, "items": [{"label": "Builtins", "sub": "print, len, range …", "tone": "warn"}, {"label": "Global", "sub": "the module's namespace", "tone": "violet"}, {"label": "Enclosing", "sub": "outer functions' locals (closures)", "tone": "accent"}, {"label": "Local", "sub": "this function's names — searched first", "tone": "good"}], "t": "diagram", "id": "dg-3_3-01-0"},




    { t: "viz",
      title: "LEGB — the search order for reading a name",
      caption: "Python looks outward until it finds the name, and stops at the first match. It never searches inward, and it never searches the caller's scope — which is why a function cannot see its caller's local variables.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram of the LEGB name resolution order: local, enclosing, global, builtins">
  <defs>
    <marker id="a12" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent)"/>
    </marker>
  </defs>

  <rect x="20" y="30" width="560" height="240" rx="10" style="fill:none;stroke:var(--border-strong);stroke-dasharray:4 3" stroke-width="1"/>
  <text x="36" y="52" class="s-sub" style="font-weight:700;letter-spacing:.08em">B · BUILTINS</text>
  <text x="36" y="68" class="s-sub">len, print, dict, Exception ... always last</text>

  <rect x="52" y="80" width="496" height="176" rx="10" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="68" y="102" class="s-sub" style="font-weight:700;letter-spacing:.08em">G · GLOBAL (module)</text>
  <text x="68" y="118" class="s-sub">names defined at the top level of this file</text>

  <rect x="84" y="130" width="432" height="112" rx="10" class="s-fill s-stroke" stroke-width="1"/>
  <text x="100" y="152" class="s-sub" style="font-weight:700;letter-spacing:.08em">E · ENCLOSING</text>
  <text x="100" y="168" class="s-sub">locals of any function this one is nested inside</text>

  <rect x="116" y="180" width="368" height="48" rx="9" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.5"/>
  <text x="132" y="200" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--accent-ink)">L · LOCAL</text>
  <text x="132" y="218" class="s-sub" style="fill:var(--accent-ink)">names assigned in this function — searched first</text>

  <path d="M620 210 L620 150" style="stroke:var(--accent);fill:none" stroke-width="2" marker-end="url(#a12)"/>
  <text x="636" y="216" class="s-sub" style="fill:var(--accent-ink);font-weight:600">search outward</text>
  <text x="636" y="196" class="s-sub">L then E</text>
  <text x="636" y="178" class="s-sub">then G</text>
  <text x="636" y="160" class="s-sub">then B</text>
  <text x="636" y="140" class="s-sub" style="fill:var(--crit)">then NameError</text>

  <rect x="620" y="242" width="260" height="46" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="634" y="262" class="s-sub" style="fill:var(--ink-2);font-weight:600">Never searched:</text>
  <text x="634" y="279" class="s-sub">the caller's scope, or any nested function</text>

  <rect x="620" y="42" width="260" height="80" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="634" y="62" class="s-sub" style="fill:var(--ink-2);font-weight:600">Reading vs writing</text>
  <text x="634" y="80" class="s-sub">Reading follows LEGB.</text>
  <text x="634" y="96" class="s-sub" style="fill:var(--warn)">Writing always targets LOCAL,</text>
  <text x="634" y="112" class="s-sub" style="fill:var(--warn)">unless global/nonlocal says otherwise.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "all four, visible at once", code: `
x = "global"


def outer():
    x = "enclosing"

    def inner():
        x = "local"
        print(x)          # L

    inner()
    print(x)              # E, from outer's own perspective


outer()
print(x)                  # G
print(len)                # B -- found in builtins
`,
      out: `local
enclosing
global
<built-in function len>`
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Assignment decides at compile time", id: "assignment-decides" },

    {"kind": "trace", "title": "UnboundLocalError: assignment decides at compile time", "caption": "Because count is assigned somewhere in f, the compiler makes it local for the whole function; the read on the first line then finds an unassigned local. global (or nonlocal for an enclosing scope) changes the decision.", "vars": ["count (global)", "count (local in f)"], "steps": [{"code": "count = 0", "state": ["0", ""], "changed": [0]}, {"code": "def f(): print(count); count += 1", "state": ["0", "local, unbound"], "changed": [1], "note": "compile-time decision"}, {"code": "f()", "state": ["0", "UnboundLocalError"], "changed": [1], "tone": "crit", "note": "read before assignment"}, {"code": "def g(): global count; count += 1; g()", "state": ["1", "—"], "changed": [0], "tone": "good"}], "t": "diagram", "id": "dg-3_3-02-1"},

    { t: "p", text: "This is the rule that produces every scope surprise: **if a name is assigned anywhere in a function, it is local throughout that function** — decided when the function is compiled, not when the line runs." },

    { t: "code", lang: "python", title: "the classic UnboundLocalError", code: `
count = 0


def increment():
    print(count)          # UnboundLocalError, on this line
    count = count + 1


increment()
`,
      out: `UnboundLocalError: cannot access local variable 'count'
where it is not associated with a value`,
      hl: [5, 6]
    },

    { t: "callout", kind: "insight", title: "Why the error is on the line *before* the assignment", body: [
      { t: "p", text: "The compiler saw `count = ...` on line 6 and marked `count` as a local for the whole function. So the `print` on line 5 compiles to `LOAD_FAST count` — the slot lookup from Lesson 1.1 — and that slot is still empty when it runs." },
      { t: "code", lang: "python", title: "the bytecode says it plainly", numbered: false, code: `
import dis
dis.dis(increment)

#   LOAD_GLOBAL   print
#   LOAD_FAST     count      <- local slot, not the module global
#   CALL          1`},
      { t: "p", text: "Compare a function that only *reads* `count`: it compiles to `LOAD_GLOBAL` and works fine. **One assignment anywhere flips every reference in the function**, and that is what makes the error feel like it comes from the wrong line." }
    ]},

    { t: "code", lang: "python", title: "mutating is not assigning", code: `
items = []
config = {"debug": False}


def add_item(x):
    items.append(x)          # fine -- mutation, no assignment to 'items'


def set_debug():
    config["debug"] = True   # fine -- mutation of the object, not rebinding


def replace_items():
    items = [1, 2]           # NOT the global; creates a new local, silently
    return items


add_item(1)
set_debug()
replace_items()
print(items, config)
`,
      out: `[1] {'debug': True}`,
      caption: "`items.append(x)` and `config[\"debug\"] = True` mutate the object the global name points at — no assignment to the *name* occurs, so no local is created. `items = [1, 2]` rebinds, creating a local that vanishes when the function returns. This is Lesson 1.4's rebind-versus-mutate distinction, now with scope consequences."
    },

    /* ================================================================== */
    { t: "h2", n: "03", text: "global and nonlocal", id: "global-nonlocal" },

    { t: "code", lang: "python", title: "the two declarations", code: `
counter = 0


def bump():
    global counter           # assignments here target the module global
    counter += 1


def make_accumulator():
    total = 0

    def add(n):
        nonlocal total       # assignments target outer's 'total'
        total += n
        return total

    return add


bump()
acc = make_accumulator()
acc(10)
print(counter, acc(5))
`,
      out: `1 15`
    },

    { t: "dl", items: [
      ["`global name`", "Assignments to `name` in this function write to the **module** namespace. Skips enclosing scopes entirely."],
      ["`nonlocal name`", "Assignments write to the nearest **enclosing function's** local. The name must already exist there — `nonlocal` cannot create one."],
      ["Neither is needed to read", "Reading follows LEGB automatically. You only need these to *assign*."]
    ]},

    { t: "callout", kind: "trap", title: "Why `global` is almost always the wrong answer", body: [
      { t: "p", text: "A function that writes to a module global is a function whose behaviour depends on invisible history and whose effects are invisible in its signature." },
      { t: "ladder",
        rungs: [
          { level: "bad", label: "Module global", why: "untestable, unsafe under concurrency",
            code: `_cache = {}

def get_user(uid):
    global _cache
    if uid not in _cache:
        _cache[uid] = db.find(uid)
    return _cache[uid]`,
            note: "Tests interfere with each other because the cache persists between them. Two threads can race on the same key. Nothing in the signature says state is involved, and there is no way to clear it without reaching into the module." },
          { level: "ok", label: "Pass state in", why: "explicit and testable",
            code: `def get_user(uid: str, cache: dict) -> User:
    if uid not in cache:
        cache[uid] = db.find(uid)
    return cache[uid]`,
            note: "The dependency is now in the signature, so a test supplies a fresh dict and the function has no memory between calls. The caller carries the cache, which is sometimes awkward." },
          { level: "best", label: "Own the state in an object", why: "scoped lifetime, clear ownership",
            code: `class UserRepository:
    def __init__(self, db: Database) -> None:
        self._db = db
        self._cache: dict[str, User] = {}

    def get(self, uid: str) -> User:
        if uid not in self._cache:
            self._cache[uid] = self._db.find(uid)
        return self._cache[uid]

    def clear(self) -> None:
        self._cache.clear()`,
            note: "The state has an owner with a lifetime you control: one instance per request, per worker, or per process — your choice, made at construction rather than fixed by module import. Tests build a fresh instance. Lesson 9.6 covers this as testable design." }
        ]
      },
      { t: "p", text: "**The legitimate uses of `global` are narrow:** module-level constants set once at import, a deliberate singleton behind a factory function, and interactive REPL work. In application code, reach for a parameter or an object first." }
    ]},

    { t: "callout", kind: "good", title: "`nonlocal` has a real purpose", body: [
      { t: "p", text: "`nonlocal` is genuinely useful in closures and decorators, where a small piece of state belongs to one function and nothing else should see it:" },
      { t: "code", lang: "python", title: "a decorator counting calls", numbered: false, code: `
import functools


def count_calls(fn):
    calls = 0

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        nonlocal calls
        calls += 1
        return fn(*args, **kwargs)

    wrapper.call_count = lambda: calls
    return wrapper`,
        caption: "The counter is invisible outside the decorator, has the lifetime of the decorated function, and needs no class. Lesson 3.6 covers closures and 3.7 decorators."}
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Scopes that are not what you expect", id: "surprises" },

    { t: "code", lang: "python", title: "loops and conditionals do not create scope", code: `
for i in range(3):
    pass
print(i)                   # 2 -- the loop variable survives

if True:
    y = "defined in a block"
print(y)                   # works -- blocks are not scopes

with open(__file__) as f:
    pass
print(f.closed)            # the name survives the with block

# But comprehensions DO have their own scope (Lesson 2.11):
z = "unchanged"
_ = [z for z in range(3)]
print(z)
`,
      out: `2
defined in a block
True
unchanged`,
      caption: "Only functions, classes, modules and comprehensions create scope. `for`, `if`, `while`, `with` and `try` do not — a name bound inside them leaks into the surrounding function."
    },

    { t: "callout", kind: "trap", title: "Class bodies are a scope that nested functions cannot see", body: [
      { t: "code", lang: "python", title: "the surprise", numbered: false, code: `
class Config:
    DEFAULTS = {"a": 1, "b": 2}

    # A comprehension in a class body cannot see other class attributes,
    # because its own scope skips the class scope entirely.
    KEYS = [k for k in DEFAULTS]          # NameError: name 'DEFAULTS'
                                          # is not defined`},
      { t: "p", text: "The first iterable of a comprehension is evaluated in the enclosing scope, so `[k for k in DEFAULTS]` at class level actually works — but any *later* reference does not: `[k for k in range(3) if k in DEFAULTS]` raises. Class scope is skipped by nested function scopes, and a comprehension is a nested function." },
      { t: "p", text: "**The fix is to not compute class attributes from each other in a comprehension.** Use a module-level constant, or compute it in `__init_subclass__` or after the class body. This is obscure, and it is worth recognising because the error message gives no hint about class scope." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Predict, then remove the globals",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Part one: predict the output of each snippet, then run them. Part two: take a module that uses globals for state and redesign it so the state has an owner." }
      ],
      requirements: [
        "Predict the output or error of the five snippets below before running them.",
        "For each, name the rule that produced it — LEGB order, assignment-makes-local, or mutate-versus-rebind.",
        "Then redesign the stats module so it holds no module-level mutable state.",
        "The redesign must let two independent collectors run in the same process without interfering.",
        "Write a test that fails against the original because state leaks between tests."
      ],
      hint: "For the snippets, the question is always the same: does this function *assign* to the name anywhere? If yes, the name is local everywhere in that function.",
      solution: {
        lang: "python",
        title: "scope_exercises.py",
        code: `# ---- PART ONE: predict ------------------------------------------------

# (1)
x = 10
def a():
    print(x)
a()
# -> 10. No assignment to x in a(), so LEGB finds the global.


# (2)
x = 10
def b():
    print(x)
    x = 20
b()
# -> UnboundLocalError. The compiler saw "x = 20" and marked x local for
#    the WHOLE function, so the print compiles to a local slot lookup and
#    that slot is empty. The error is on the print, not the assignment.


# (3)
items = []
def c():
    items.append(1)
c()
print(items)
# -> [1]. append MUTATES the object; there is no assignment to the NAME
#    items, so no local is created.


# (4)
items = []
def d():
    items = [99]
d()
print(items)
# -> []. This assigns, creating a local that is discarded on return.
#    The global is untouched -- and nothing warns you.


# (5)
def e():
    total = 0
    def add(n):
        total = total + n      # assignment -> total is local to add()
        return total
    add(5)
    return total
print(e())
# -> UnboundLocalError inside add(). It needs "nonlocal total" to reach
#    e()'s local. Without it, "total = total + n" reads a local that has
#    not been assigned yet.


# ---- PART TWO: the original -------------------------------------------

_request_count = 0
_errors = []
_latencies = []


def record(latency, error=None):
    global _request_count
    _request_count += 1
    _latencies.append(latency)
    if error:
        _errors.append(error)


def summary():
    return {
        "count": _request_count,
        "errors": len(_errors),
        "p50": sorted(_latencies)[len(_latencies) // 2] if _latencies else 0,
    }


def reset():
    global _request_count
    _request_count = 0
    _errors.clear()
    _latencies.clear()
#
# Problems:
#   - one set of counters for the whole process; two collectors impossible
#   - tests must call reset() or they contaminate each other
#   - reset() existing at all is the tell: it is a workaround for state
#     with no owner and no lifetime
#   - not safe under concurrency


# ---- PART TWO: the redesign -------------------------------------------

from __future__ import annotations

from dataclasses import dataclass, field
from statistics import median


@dataclass
class Stats:
    """A collector with an owner and a lifetime.

    Construct one per request batch, per worker, or per test. Two
    instances cannot interfere, and there is nothing to reset because
    a fresh instance is already empty.
    """

    # default_factory, not a bare list: a mutable default would recreate
    # the exact shared-state problem this class removes (Lesson 1.4).
    latencies: list[float] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def record(self, latency: float, error: str | None = None) -> None:
        self.latencies.append(latency)
        if error is not None:
            self.errors.append(error)

    @property
    def count(self) -> int:
        return len(self.latencies)

    def summary(self) -> dict[str, float | int]:
        return {
            "count": self.count,
            "errors": len(self.errors),
            "p50": median(self.latencies) if self.latencies else 0,
        }


# ---- the test that fails against the original -------------------------

def test_collectors_are_independent() -> None:
    """Two collectors in one process must not see each other's data.

    Against the module-global version this is impossible to even express:
    there is only one set of counters.
    """
    a, b = Stats(), Stats()

    a.record(10.0)
    a.record(30.0, error="timeout")

    assert b.count == 0
    assert b.errors == []
    assert a.summary()["errors"] == 1


def test_no_reset_needed_between_tests() -> None:
    """A fresh instance is already empty -- no teardown, no ordering rules."""
    assert Stats().summary() == {"count": 0, "errors": 0, "p50": 0}


if __name__ == "__main__":
    test_collectors_are_independent()
    test_no_reset_needed_between_tests()
    print("independent collectors verified")`,
        notes: [
          { t: "p", text: "**Snippet 2 is the one worth internalising.** The `UnboundLocalError` points at the `print`, which is not where the mistake is — the mistake is the assignment *below* it. Once you know that assignment marks a name local for the whole function, the error location stops being confusing and becomes a clue about where to look." },
          { t: "p", text: "**Snippet 4 is the dangerous one**, because it raises nothing. `items = [99]` inside a function silently creates and discards a local while the caller sees no change. There is no error, no warning, and the symptom is \"my function did not do anything\"." },
          { t: "p", text: "**The existence of `reset()` was the design smell.** A reset function is almost always a workaround for state that has no owner: because the state lives for the whole process, something has to manually undo it between uses. Give the state an object and the lifetime problem disappears — a fresh instance is already reset." },
          { t: "callout", kind: "insight", title: "Why the test could not be written before", body: [
            { t: "p", text: "`test_collectors_are_independent` is not a test the original module could fail — it is a test it could not *express*. With one set of module globals there is no second collector to compare against." },
            { t: "p", text: "That is the strongest argument against module-level mutable state. It does not merely make testing harder; it removes designs from the space of things you can build, and you usually discover the limitation the day someone asks for per-tenant or per-request metrics." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A test suite passes locally and fails in CI. Run individually, every test passes. Run in a different order — as `pytest -p randomly` does — different tests fail each time." },
      { t: "p", text: "**Order-dependent tests almost always mean module-level mutable state.** A cache, a registry, a configuration dict or a counter defined at import time persists across every test in the process. One test populates it, another sees the leftovers, and which one fails depends on execution order." },
      { t: "p", text: "**The diagnosis is quick:** find module-level names bound to a `list`, `dict`, `set` or a mutable object, and check whether any test path writes to them. `global` statements are the loudest signal, but mutation without `global` — `_cache[key] = value` — is far more common and does not need the keyword at all." },
      { t: "p", text: "**The fix is ownership, not a fixture that resets things.** A reset fixture works and leaves the design flaw in place, so the next piece of module state reintroduces the problem. Moving the state into an object constructed per test removes the category." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "Names resolve **L → E → G → B**, outward, stopping at the first match. Python never searches inward, and never searches the caller's scope.",
    "**Assignment anywhere in a function makes that name local for the entire function**, decided at compile time — which is why `UnboundLocalError` points at a line *above* the assignment.",
    "Reading follows LEGB automatically; `global` and `nonlocal` are only needed to **assign**.",
    "**Mutating is not assigning.** `items.append(x)` reaches the global; `items = [...]` silently creates a local and discards it — with no error at all.",
    "`global` is almost always the wrong answer in application code: untestable, unsafe under concurrency, and invisible in the signature. Pass state in, or give it an object.",
    "**The existence of a `reset()` function is a design smell** — it is a manual workaround for state that has no owner or lifetime.",
    "`nonlocal` is genuinely useful for small private state in closures and decorators, where nothing outside should see it.",
    "`for`, `if`, `while`, `with` and `try` do **not** create scope — names bound inside them leak into the enclosing function. Comprehensions do.",
    "Class bodies are skipped by nested function scopes, so a comprehension in a class body cannot see other class attributes.",
    "**Order-dependent test failures almost always mean module-level mutable state.** Fix the ownership, not with a reset fixture."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does this print?",
        lang: "python",
        code: `x = 10

def f():
    print(x)
    x = 20

f()`,
        options: [
          "`10` — the global is read, then a local is created",
          "`UnboundLocalError` on the `print` line — the assignment below makes `x` local for the whole function",
          "`20` — the assignment is hoisted",
          "`None` — `x` is undefined at that point"
        ],
        answer: 1,
        why: "The compiler sees `x = 20` and marks `x` as a local for the entire function body, so the `print` compiles to a local-slot lookup rather than a global one. That slot has no value yet, hence `UnboundLocalError`. The error points at the `print`, but the cause is the assignment underneath it — knowing that turns a confusing message into a clue."
      },
      {
        stem: "Why does `items.append(1)` inside a function reach the module-level `items`, while `items = [1]` does not?",
        options: [
          "`append` is a special method that bypasses scoping rules",
          "`append` mutates the object the global name points at; `items = [1]` is an assignment, which creates a local",
          "Lists are passed by reference and other types are not",
          "The difference only applies when `global` is declared"
        ],
        answer: 1,
        why: "This is the rebind-versus-mutate distinction with scope consequences. `append` never assigns to the *name* `items`, so no local is created and LEGB finds the global. `items = [1]` is an assignment, which makes `items` local throughout the function — the new list is discarded on return and the global is untouched, silently, with no error."
      },
      {
        stem: "A test suite passes when tests run individually but fails in random order. What is the most likely cause?",
        options: [
          "Tests are running in parallel and competing for CPU",
          "Module-level mutable state persisting between tests — a cache, registry or counter defined at import time",
          "The test framework is caching results between runs",
          "Some tests depend on the current time"
        ],
        answer: 1,
        why: "Module-level state is created once at import and lives for the whole process, so one test's writes are visible to every test that follows. Which test fails then depends on order. `global` statements are the loudest signal, but plain mutation — `_cache[key] = value` — is far more common and needs no keyword. The durable fix is giving the state an owner, not adding a reset fixture."
      },
      {
        stem: "When is `nonlocal` the right tool?",
        options: [
          "Whenever a function needs to modify a variable from an outer scope",
          "For small private state owned by a closure or decorator, where nothing outside should see it",
          "As a safer replacement for `global` in all cases",
          "Only inside class methods"
        ],
        answer: 1,
        why: "`nonlocal` shines where a decorator or closure needs a counter, a cache or an accumulator that has the lifetime of the wrapped function and is invisible to everyone else — no class needed. It is not a general-purpose replacement for `global`: reaching up into an enclosing function's variables from deeply nested code has the same readability problems as a global, just in a smaller radius."
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
        q: "Explain the LEGB rule.",
        strong: "Python resolves a name by searching Local, then Enclosing function scopes, then Global (module), then Builtins, stopping at the first match. It searches outward only — never into nested functions, and never into the caller's scope.",
        answer: [
          { t: "p", text: "The acronym is recall; the follow-up is the real question, and it is usually about `UnboundLocalError`." },
          { t: "p", text: "The rule that explains it: **assignment anywhere in a function makes that name local for the whole function**, decided at compile time. So a `print(x)` above an `x = 20` compiles to a local lookup and fails, even though a global `x` exists. Being able to state that, rather than describing the symptom, is what distinguishes the answer." },
          { t: "p", text: "Worth adding that reading follows LEGB automatically — `global` and `nonlocal` exist only to redirect *assignment*." }
        ]
      },
      {
        level: "core",
        q: "Why avoid module-level global state?",
        strong: "It lives for the whole process, so it makes tests order-dependent, is unsafe under concurrency, and is invisible in the function's signature. The alternative is passing the state in, or giving it to an object whose lifetime you control.",
        answer: [
          { t: "p", text: "The observation that carries the most weight: the presence of a `reset()` function is the tell. It exists because the state has no owner, so something has to manually undo it between uses." },
          { t: "p", text: "The stronger version of the argument is about what globals prevent rather than what they make awkward. With one module-level counter you cannot have two collectors, so per-tenant or per-request metrics are not merely harder — they are outside the design space, and you discover that the day someone asks for them." },
          { t: "p", text: "Be fair about the legitimate uses: module constants set once at import, and a deliberate singleton behind a factory. The objection is to mutable state, not to module-level names." }
        ]
      },
      {
        level: "advanced",
        q: "A test suite passes individually but fails in random order. How do you find the cause?",
        strong: "Look for shared state that outlives a test — module-level dicts, lists, caches, registries, class attributes, or anything configured once at import. One test writes, a later test reads the leftovers, and which one fails depends on ordering.",
        answer: [
          { t: "p", text: "Interviewers like this because it rewards a systematic search rather than a guess. Narrate it as narrowing: it is not the test framework, because tests pass alone; it is not timing, because the failures follow order rather than the clock; so it is state surviving between tests." },
          { t: "p", text: "A useful practical note: `global` statements are easy to grep for, but plain mutation of a module-level container needs no keyword and is far more common. Searching for module-level names bound to `{}`, `[]` or `set()` finds more than searching for `global` does." },
          { t: "p", text: "The judgement point to close on: a reset fixture makes the symptom go away and leaves the design intact, so the next piece of module state brings the problem back. Moving state into per-test objects removes the category rather than the instance." }
        ],
        weak: "Adding `pytest` fixtures that reset globals and stopping there. It works, and it institutionalises the flaw — the suite now depends on every future global being remembered in the fixture."
      }
    ]
  }
});
