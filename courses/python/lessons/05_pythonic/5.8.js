/* ============================================================================
   LESSON 5.8 — Context Managers
   ========================================================================= */
EC.receiveLesson({
  id: "5.8",

  lede: "`with` exists to make a guarantee: **the cleanup runs, whatever happens inside the block.** Not just on the happy path, not just when you remember — on an exception, an early `return`, a `break`, or a `SystemExit`. That guarantee is what makes it the right tool for anything paired: open and close, acquire and release, begin and commit, patch and restore.",

  objectives: [
    "Explain exactly what `with` guarantees and when `__exit__` runs",
    "Write context managers as classes and with `@contextmanager`",
    "Handle exceptions in `__exit__`, and know why suppressing is almost always wrong",
    "Use `ExitStack` for a variable number of resources",
    "Recognise the paired operations that should be context managers"
  ],

  prerequisites: ["4.9", "5.7"],

  blocks: [

    { t: "h2", n: "01", text: "The guarantee", id: "guarantee" },

    {"kind": "steps", "title": "What `with` guarantees", "caption": "__enter__ runs, the block runs, and __exit__ runs no matter how the block ends — normally, by return, by break, or by an exception. That is the whole contract, and it is why files close and locks release.", "items": [{"label": "cm = expr; value = cm.__enter__()", "desc": "the 'as' name is bound to __enter__'s return", "tone": "accent"}, {"label": "the block runs", "desc": "return, break, continue, or an exception can all leave it"}, {"label": "cm.__exit__(type, value, tb)", "desc": "always runs; receives the exception if there was one", "tone": "good"}, {"label": "exception re-raised unless __exit__ returned True", "desc": "suppressing is a decision, and usually the wrong one", "tone": "warn"}], "t": "diagram", "id": "dg-5_8-01-0"},



    { t: "viz",
      title: "What `with` guarantees",
      caption: "The exit runs whether the block finishes, returns, or raises. That guarantee is the entire point — it is the difference between a file that is always closed and one that usually is.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="A with block showing __enter__, the body, and __exit__ running on every path out">
  <rect x="40" y="44" width="360" height="150" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)" stroke-width="2"/>
  <text x="62" y="72"  class="s-label" style="fill:var(--accent)">__enter__</text>
  <text x="62" y="94"  class="s-sub" style="fill:var(--ink-3)">acquire, return the resource</text>

  <rect x="62" y="108" width="316" height="44" rx="6" style="fill:var(--ink-3);fill-opacity:.07;stroke:var(--line)" stroke-width="1.5"/>
  <text x="82" y="136" class="s-sub" style="fill:var(--ink-2)">the body — may return or raise</text>

  <text x="62" y="180" class="s-label" style="fill:var(--good)">__exit__</text>

  <g style="stroke:var(--good);stroke-width:2">
    <line x1="400" y1="120" x2="470" y2="84"  marker-end="url(#cm-a)"/>
    <line x1="400" y1="130" x2="470" y2="130" marker-end="url(#cm-a)"/>
    <line x1="400" y1="140" x2="470" y2="176" marker-end="url(#cm-a)"/>
  </g>
  <text x="482" y="88"  class="s-sub" style="fill:var(--ink-2)">normal completion</text>
  <text x="482" y="134" class="s-sub" style="fill:var(--ink-2)">return from inside</text>
  <text x="482" y="180" class="s-sub" style="fill:var(--ink-2)">exception raised</text>
  <text x="700" y="134" class="s-label" style="fill:var(--good)">exit runs</text>
  <text x="700" y="156" class="s-sub" style="fill:var(--ink-3)">on all three</text>

  <text x="40" y="226" class="s-sub" style="fill:var(--ink-3)">Returning True from __exit__ swallows the exception — rarely what you want, and a silent bug when it is accidental.</text>

  <defs><marker id="cm-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker></defs>
</svg>`
    },
    { t: "code", lang: "python", title: "what `with` expands to", code: `
with open("data.txt") as f:
    process(f)

# is approximately:

manager = open("data.txt")
f = manager.__enter__()          # the value bound by "as"
try:
    process(f)
finally:
    manager.__exit__(*sys.exc_info())    # ALWAYS runs
`,
      caption: "The `finally` is the whole point. Every exit path from the block — normal completion, an exception, a `return`, a `break`, a `continue` — goes through `__exit__`."
    },

    { t: "code", lang: "python", title: "including the paths people forget", code: `
class Trace:
    def __enter__(self):
        print("  enter")
        return self

    def __exit__(self, exc_type, exc, tb):
        print(f"  exit (exception: {exc_type.__name__ if exc_type else None})")
        return False


def early_return():
    with Trace():
        return "returned"        # __exit__ still runs


def raises():
    with Trace():
        raise ValueError("boom")


print(early_return())
try:
    raises()
except ValueError:
    print("caught outside")
`,
      out: `  enter
  exit (exception: None)
returned
  enter
  exit (exception: ValueError)
caught outside`
    },

    { t: "callout", kind: "insight", title: "The two return values that matter", body: [
      { t: "ul", items: [
        "**`__enter__` returns the value bound by `as`.** Often `self`, but not necessarily — `open()` returns a file object, and a database manager might return a cursor rather than the connection.",
        "**`__exit__` returns a flag deciding whether to suppress the exception.** `True` swallows it; `False` or `None` lets it propagate."
      ]},
      { t: "p", text: "A missing `return` gives `None`, which is falsy — so **the default is correct**, and suppressing is something you must do deliberately. That asymmetry is well designed: silently swallowing exceptions should require typing something." }
    ]},

    { t: "h2", n: "02", text: "Two ways to write one", id: "writing" },

    { t: "tabs", items: [
      { label: "@contextmanager", blocks: [
        { t: "code", lang: "python", title: "the form to reach for first", code: `
from contextlib import contextmanager
from collections.abc import Iterator
import time


@contextmanager
def timed(label: str) -> Iterator[None]:
    start = time.perf_counter()
    try:
        yield                       # the with-block runs HERE
    finally:
        # finally, not just after the yield -- otherwise an exception
        # in the block would skip this entirely
        logger.info("%s took %.3fs", label, time.perf_counter() - start)


with timed("query"):
    run_query()
`},
        { t: "p", text: "A generator with exactly one `yield`. Everything before it is `__enter__`, everything after is `__exit__`, and the yielded value is what `as` binds. It is shorter than the class form and it is what you should write unless you need state across several uses." },
        { t: "callout", kind: "trap", title: "The `try/finally` is not optional", body: [
          { t: "code", lang: "python", title: "without it, cleanup is skipped on error", numbered: false, code: `
@contextmanager
def broken(label):
    start = time.perf_counter()
    yield
    logger.info("took %.3fs", time.perf_counter() - start)   # SKIPPED
                                                             # if the block
                                                             # raises`},
          { t: "p", text: "An exception in the `with` body is re-raised **at the `yield`** inside your generator. Without a `try/finally` around it, the lines after the `yield` never run — so the manager silently stops guaranteeing anything, which is the only reason it existed." }
        ]}
      ]},
      { label: "A class", blocks: [
        { t: "code", lang: "python", title: "when the manager needs state or reuse", code: `
from types import TracebackType


class Transaction:
    """Reusable and re-entrant-aware. A generator-based manager is
    single-use, so a class is right when the object outlives one block."""

    def __init__(self, connection: Connection) -> None:
        self._conn = connection
        self._depth = 0

    def __enter__(self) -> Connection:
        # Nested with-blocks use a savepoint rather than a new
        # transaction -- state the generator form cannot hold.
        if self._depth == 0:
            self._conn.execute("BEGIN")
        else:
            self._conn.execute(f"SAVEPOINT sp_{self._depth}")
        self._depth += 1
        return self._conn                   # bound by "as"

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> bool:
        self._depth -= 1
        if exc_type is None:
            self._conn.execute("COMMIT" if self._depth == 0
                               else f"RELEASE SAVEPOINT sp_{self._depth}")
        else:
            self._conn.execute("ROLLBACK" if self._depth == 0
                               else f"ROLLBACK TO sp_{self._depth}")
        return False                        # never suppress
`},
        { t: "p", text: "Use a class when the manager holds state across uses, needs to be re-entered, or is part of a larger object's API. Otherwise `@contextmanager` says the same thing in a third of the lines." }
      ]}
    ]},

    { t: "h2", n: "03", text: "Suppressing, and why not to", id: "suppressing" },

    { t: "code", lang: "python", title: "returning True swallows the exception", code: `
class Swallow:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return True                  # swallows EVERYTHING


with Swallow():
    raise ValueError("this vanishes")

print("execution continues, and nothing was logged")
`,
      out: `execution continues, and nothing was logged`
    },

    { t: "callout", kind: "warn", title: "Suppress narrowly or not at all", body: [
      { t: "p", text: "Returning a bare `True` swallows every exception, including `KeyboardInterrupt` and bugs in your own code. If suppression is genuinely wanted, name the type:" },
      { t: "code", lang: "python", title: "the standard-library form", numbered: false, code: `
from contextlib import suppress

# Deliberate, narrow, and readable
with suppress(FileNotFoundError):
    path.unlink()

# Equivalent to, and clearer than:
try:
    path.unlink()
except FileNotFoundError:
    pass`},
      { t: "p", text: "`contextlib.suppress` is the only form of suppression worth writing. It names exactly what is being ignored, and a reader can see the decision — unlike a custom `__exit__` returning `True`, where the suppression is invisible at the call site." }
    ]},

    { t: "code", lang: "python", title: "the correct shape for a manager that logs", code: `
@contextmanager
def logged(operation: str) -> Iterator[None]:
    try:
        yield
    except Exception:
        # Log, then RE-RAISE. Swallowing here would make every failure
        # inside the block invisible to the caller.
        logger.exception("%s failed", operation)
        raise
    else:
        logger.info("%s ok", operation)
`,
      caption: "A bare `raise` preserves the original traceback — `raise exc` would truncate it at this frame (Lesson 3.7). Logging and re-raising is almost always what a manager should do; deciding whether to continue is the caller's job, not the manager's."
    },

    { t: "h2", n: "04", text: "ExitStack", id: "exitstack" },

    { t: "p", text: "`with a, b, c:` works when you know the resources at write time. When the number varies at runtime, `ExitStack` manages them and unwinds in reverse order." },

    { t: "code", lang: "python", title: "a variable number of resources", code: `
from contextlib import ExitStack


def merge_files(paths: list[Path], out: Path) -> None:
    with ExitStack() as stack:
        handles = [
            stack.enter_context(p.open(encoding="utf-8")) for p in paths
        ]
        target = stack.enter_context(out.open("w", encoding="utf-8"))

        for rows in zip(*handles, strict=True):
            target.write("".join(rows))
    # every handle closes here, in reverse order, even on an exception
`,
      caption: "Without `ExitStack` this needs recursion or a `try/finally` that closes whatever was opened so far — and gets the partial-failure case wrong. If the fourth `open()` raises, the first three are still closed."
    },

    { t: "code", lang: "python", title: "two more things it does well", code: `
# 1. Conditional resources -- no nested ifs
with ExitStack() as stack:
    conn = stack.enter_context(db.connect())
    if dry_run:
        stack.enter_context(conn.transaction())    # only sometimes
    run(conn)


# 2. Registering plain cleanup callbacks
with ExitStack() as stack:
    temp = create_temp_dir()
    stack.callback(shutil.rmtree, temp)            # runs on the way out
    build(temp)


# 3. Deferring cleanup by transferring the stack out
def make_client() -> tuple[Client, ExitStack]:
    with ExitStack() as stack:
        conn = stack.enter_context(db.connect())
        client = Client(conn)
        return client, stack.pop_all()   # caller now owns the cleanup
`
    },

    { t: "h2", n: "05", text: "What should be a context manager", id: "candidates" },

    { t: "table",
      head: ["Paired operation", "Manager"],
      rows: [
        ["open / close", "`open()`, `socket`, `Path.open`"],
        ["acquire / release", "`threading.Lock`, `Semaphore` (Lesson 11.3)"],
        ["begin / commit-or-rollback", "A database transaction"],
        ["change / restore", "`os.chdir`, `decimal.localcontext`, a temporary setting"],
        ["patch / unpatch", "`unittest.mock.patch` (Lesson 9.5)"],
        ["start / stop", "A timer, a span, a profiler"],
        ["create / delete", "`tempfile.TemporaryDirectory`"],
        ["suppress output / restore", "`contextlib.redirect_stdout`"]
      ],
      caption: "The signal is a pair of operations where the second **must** happen. If you find yourself writing `try/finally` twice with the same cleanup, that cleanup wants to be a context manager."
    },

    { t: "ladder",
      title: "Temporarily changing a setting",
      rungs: [
        { level: "bad", label: "Manual save and restore", why: "leaks on any early exit",
          code: `old = settings.timeout
settings.timeout = 5
result = fetch()             # if this raises, timeout stays 5 FOREVER
settings.timeout = old`,
          note: "An exception, a `return`, or a `break` leaves the global permanently modified. In a long-running server that means every subsequent request uses the wrong timeout, and nothing indicates why." },

        { level: "ok", label: "try/finally", why: "correct, and repeated everywhere",
          code: `old = settings.timeout
settings.timeout = 5
try:
    result = fetch()
finally:
    settings.timeout = old`,
          note: "Correct. The problem is duplication — every call site repeats five lines, and the one that forgets the `finally` is invisible in review because it looks almost identical." },

        { level: "best", label: "A context manager", why: "the guarantee, written once",
          code: `from contextlib import contextmanager


@contextmanager
def timeout(seconds: float) -> Iterator[None]:
    """Temporarily override the request timeout."""
    old = settings.timeout
    settings.timeout = seconds
    try:
        yield
    finally:
        settings.timeout = old


with timeout(5):
    result = fetch()`,
          note: "The restore logic exists in one place and cannot be forgotten. The call site is now two lines that state the intent, and adding a second setting to save means editing one function rather than every caller. **Note this manager is not thread-safe** — it mutates a global, so concurrent requests would interfere; `contextvars` is the answer there (Lesson 11.6)." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A transaction manager that behaves under failure",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Write a transaction context manager. The straightforward version is ten lines; the requirements are the failure modes that separate a toy from something you would deploy." }
      ],
      requirements: [
        "Commit on success, roll back on any exception, and **never suppress**.",
        "Support nesting: an inner block must use a savepoint, not a second `BEGIN`.",
        "If the rollback itself fails, the original exception must still reach the caller — not be replaced by the rollback error.",
        "Handle `BaseException` so a `KeyboardInterrupt` mid-transaction still rolls back.",
        "Bind the connection with `as`, not the manager.",
        "Write tests for: commit, rollback, nesting, a failing rollback, and that the original traceback survives."
      ],
      hint: "For the failing-rollback requirement, an exception raised inside `__exit__` replaces the original. Catching it and chaining with `raise ... from` is not enough — you must not raise at all if you want the original to propagate untouched.",
      solution: {
        lang: "python",
        title: "transaction.py",
        code: `"""A transaction context manager that survives its failure modes."""

from __future__ import annotations

import logging
from types import TracebackType
from typing import Protocol

logger = logging.getLogger(__name__)


class Connection(Protocol):
    def execute(self, sql: str) -> None: ...


class Transaction:
    """Commit on success, roll back on failure, never suppress.

    A class rather than @contextmanager because the depth counter must
    persist across nested with-blocks -- a generator-based manager is
    single-use and cannot hold that state.
    """

    def __init__(self, connection: Connection) -> None:
        self._conn = connection
        self._depth = 0

    def __enter__(self) -> Connection:
        if self._depth == 0:
            self._conn.execute("BEGIN")
        else:
            # A nested BEGIN is an error in most databases; a savepoint
            # is what lets an inner block roll back independently.
            self._conn.execute(f"SAVEPOINT sp_{self._depth}")
        self._depth += 1
        return self._conn                 # bind the CONNECTION, not self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> bool:
        # Decrement first, so the depth is correct even if the SQL below
        # raises -- otherwise a failed rollback would leave the counter
        # wrong and corrupt every subsequent transaction.
        self._depth -= 1
        outermost = self._depth == 0

        if exc_type is None:
            self._conn.execute(
                "COMMIT" if outermost else f"RELEASE SAVEPOINT sp_{self._depth}"
            )
            return False

        # BaseException, not Exception: a KeyboardInterrupt mid-write
        # must still roll back rather than leaving the transaction open.
        try:
            self._conn.execute(
                "ROLLBACK" if outermost
                else f"ROLLBACK TO SAVEPOINT sp_{self._depth}"
            )
        except Exception:
            # CRITICAL: raising here would REPLACE the original
            # exception, and the caller would see a rollback error
            # instead of the bug that caused it. Log and stay silent.
            logger.exception(
                "rollback failed while handling %s", exc_type.__name__
            )

        # False -- the original exception propagates with its traceback
        return False


# =========================================================================
# tests
# =========================================================================

class FakeConnection:
    def __init__(self, fail_on: str | None = None) -> None:
        self.statements: list[str] = []
        self._fail_on = fail_on

    def execute(self, sql: str) -> None:
        self.statements.append(sql)
        if self._fail_on and sql.startswith(self._fail_on):
            raise ConnectionError(f"cannot execute {sql!r}")


def test_commits_on_success() -> None:
    conn = FakeConnection()
    with Transaction(conn) as c:
        c.execute("INSERT 1")
    assert conn.statements == ["BEGIN", "INSERT 1", "COMMIT"]


def test_rolls_back_and_reraises() -> None:
    conn = FakeConnection()
    try:
        with Transaction(conn):
            raise ValueError("business rule violated")
    except ValueError as exc:
        assert str(exc) == "business rule violated"
    else:
        raise AssertionError("the exception must not be suppressed")

    assert conn.statements == ["BEGIN", "ROLLBACK"]


def test_nesting_uses_savepoints() -> None:
    conn = FakeConnection()
    tx = Transaction(conn)

    with tx as c:
        c.execute("INSERT outer")
        with tx as c2:                      # same manager, nested block
            c2.execute("INSERT inner")

    assert conn.statements == [
        "BEGIN", "INSERT outer",
        "SAVEPOINT sp_1", "INSERT inner", "RELEASE SAVEPOINT sp_1",
        "COMMIT",
    ]


def test_inner_failure_rolls_back_only_the_savepoint() -> None:
    conn = FakeConnection()
    tx = Transaction(conn)

    with tx as c:
        c.execute("INSERT outer")
        try:
            with tx:
                raise ValueError("inner failed")
        except ValueError:
            pass                            # outer transaction continues
        c.execute("INSERT after")

    assert conn.statements == [
        "BEGIN", "INSERT outer",
        "SAVEPOINT sp_1", "ROLLBACK TO SAVEPOINT sp_1",
        "INSERT after", "COMMIT",
    ]


def test_failing_rollback_does_not_mask_the_original_error() -> None:
    """The requirement that separates this from a toy.

    If __exit__ raises, that exception REPLACES the original -- so the
    caller sees "cannot execute ROLLBACK" instead of the bug that
    caused the failure, and the real cause is lost.
    """
    conn = FakeConnection(fail_on="ROLLBACK")

    try:
        with Transaction(conn):
            raise ValueError("the actual bug")
    except ValueError as exc:
        assert str(exc) == "the actual bug"       # NOT ConnectionError
    except ConnectionError:
        raise AssertionError("the rollback error masked the real one")

    assert conn.statements == ["BEGIN", "ROLLBACK"]


def test_original_traceback_survives() -> None:
    import traceback

    def failing_operation() -> None:
        raise ValueError("deep failure")

    conn = FakeConnection()
    try:
        with Transaction(conn):
            failing_operation()
    except ValueError as exc:
        frames = [f.name for f in traceback.extract_tb(exc.__traceback__)]
        # The frame that raised must still be in the traceback -- it
        # would not be if __exit__ re-raised rather than returning False.
        assert "failing_operation" in frames, frames


def test_keyboard_interrupt_still_rolls_back() -> None:
    conn = FakeConnection()
    try:
        with Transaction(conn):
            raise KeyboardInterrupt
    except KeyboardInterrupt:
        pass
    assert conn.statements == ["BEGIN", "ROLLBACK"]


if __name__ == "__main__":
    for t in (
        test_commits_on_success,
        test_rolls_back_and_reraises,
        test_nesting_uses_savepoints,
        test_inner_failure_rolls_back_only_the_savepoint,
        test_failing_rollback_does_not_mask_the_original_error,
        test_original_traceback_survives,
        test_keyboard_interrupt_still_rolls_back,
    ):
        t()
    print("commit, rollback, savepoints, and failure modes covered")`,
        notes: [
          { t: "p", text: "**The failing-rollback case is the one that separates this from a toy.** An exception raised inside `__exit__` replaces the one being handled, so a caller debugging a business-logic bug would see `ConnectionError: cannot execute 'ROLLBACK'` and never learn what actually went wrong. Catching and logging — rather than chaining — is the only way the original reaches them untouched." },
          { t: "p", text: "**Decrementing `_depth` before the SQL** matters for the same reason. If the rollback raises and the counter has not been updated, every subsequent transaction on that connection uses the wrong depth and issues savepoint statements against a transaction that no longer exists." },
          { t: "p", text: "**`__enter__` returns the connection, not `self`.** `with Transaction(conn) as c:` gives the caller the thing they want to use. Returning `self` would force `with Transaction(conn) as tx: tx.connection.execute(...)`, which leaks the manager into every call site." },
          { t: "callout", kind: "insight", title: "Why `return False` rather than re-raising", body: [
            { t: "p", text: "`__exit__` returning a falsy value tells Python to continue propagating the exception it is already handling — with its original traceback fully intact. Explicitly re-raising inside `__exit__` would attach this frame and truncate the history, exactly like `raise exc` in a decorator (Lesson 3.7)." },
            { t: "p", text: "That is what `test_original_traceback_survives` asserts: the frame where the error actually happened is still in the traceback. Without it, every failure inside any transaction would appear to originate in `__exit__`." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service acquires a distributed lock, does work, and releases it. Under normal operation it is fine. After a deploy that added a validation error, locks start accumulating — held by processes that exited minutes ago, blocking every subsequent worker." },
      { t: "p", text: "**The release was after the work, not in a `finally`.** The new validation raises before the release line, so the exception propagates out and the lock is never released. Every failed request leaks one, and the lock's TTL is the only thing eventually clearing them." },
      { t: "p", text: "**A context manager makes the leak impossible**, because `__exit__` runs on every exit path. The rule generalises: **any acquire that has a matching release should be a context manager, not two statements with code between them.** If the release can be skipped by an exception, it will eventually be skipped by an exception." },
      { t: "p", text: "One caveat worth carrying: a distributed lock's release can itself fail, and the same rule as the exercise applies — log it and let the original exception through, rather than replacing a business error with an infrastructure one. The TTL exists precisely because release is not guaranteed to succeed." }
    ]}
  ],

  takeaways: [
    "**`with` guarantees `__exit__` runs on every exit path** — normal completion, exception, `return`, `break`, `continue`. That guarantee is the entire point.",
    "`__enter__` returns the value bound by `as`; `__exit__` returns a flag deciding whether to **suppress** the exception. A missing return is `None`, which is falsy — so the safe default is automatic.",
    "**`@contextmanager` is the form to reach for first**: a generator with one `yield`, where everything before is enter and everything after is exit.",
    "**The `try/finally` around that `yield` is not optional.** An exception in the block is re-raised at the `yield`, so without it the cleanup never runs.",
    "Use a **class** when the manager holds state across uses, needs re-entrancy, or is part of a larger object's API.",
    "**Suppress narrowly or not at all.** `contextlib.suppress(SpecificError)` names the decision; `return True` from `__exit__` swallows everything invisibly.",
    "**An exception raised inside `__exit__` replaces the original** — so a failing cleanup can hide the bug that caused it. Log and return `False` instead.",
    "**`return False` rather than re-raising** preserves the original traceback; re-raising attaches the `__exit__` frame and truncates the history.",
    "`ExitStack` handles a variable number of resources, conditional acquisition, plain cleanup callbacks, and transferring ownership with `pop_all()`.",
    "**Any acquire with a matching release should be a context manager.** If the release can be skipped by an exception, eventually it will be."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A `with` block contains a `return` statement. When does `__exit__` run?",
        options: [
          "It does not — `return` exits before cleanup",
          "Before the function returns — `with` compiles to a `try/finally`, so every exit path goes through `__exit__`",
          "Only if the function is inside another `with`",
          "After the caller receives the return value"
        ],
        answer: 1,
        why: "`with` expands to a `try/finally` around the block, so `__exit__` runs on completion, on an exception, and on `return`, `break` or `continue`. The return value is computed, then cleanup runs, then the function returns. That unconditional guarantee is exactly why paired operations belong in a context manager rather than in two statements with code between them."
      },
      {
        stem: "A `@contextmanager` function has no `try/finally` around its `yield`. What breaks?",
        options: [
          "Nothing — the code after `yield` always runs",
          "An exception in the `with` block is re-raised at the `yield`, so the cleanup lines after it never execute",
          "The manager can only be used once",
          "`as` binds `None` instead of the yielded value"
        ],
        answer: 1,
        why: "When the block raises, the exception is thrown into the generator at the `yield`. Without a `try/finally` it propagates straight out and everything after the `yield` is skipped — so the manager silently stops guaranteeing cleanup, which was the only reason it existed. The failure is invisible on the happy path, which is what makes it dangerous."
      },
      {
        stem: "A transaction manager's rollback fails inside `__exit__` while handling a `ValueError`. What does the caller see if `__exit__` lets that error propagate?",
        options: [
          "Both exceptions, chained automatically",
          "Only the rollback error — it replaces the original `ValueError`, hiding the bug that caused the failure",
          "Only the original `ValueError`",
          "A `RuntimeError` about an exception during cleanup"
        ],
        answer: 1,
        why: "An exception raised inside `__exit__` supersedes the one being handled. A caller debugging a business-logic failure would see `ConnectionError: cannot execute 'ROLLBACK'` and never learn the real cause. The correct handling is to catch the cleanup failure, log it, and return `False` so the original propagates with its traceback intact. Python does set `__context__`, but the visible exception is still the wrong one."
      },
      {
        stem: "When is `contextlib.ExitStack` the right tool?",
        options: [
          "Whenever more than one resource is used",
          "When the number of resources varies at runtime, acquisition is conditional, or ownership of the cleanup must be transferred out",
          "Only for file handles",
          "When context managers need to be entered in a specific order"
        ],
        answer: 1,
        why: "`with a, b, c:` handles a known set perfectly well. `ExitStack` earns its place when the count is dynamic — opening one handle per path in a list — because it also gets partial failure right: if the fourth `open()` raises, the first three still close. It additionally supports conditional `enter_context`, plain `callback` cleanups, and `pop_all()` to hand ownership to a caller."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does a context manager guarantee?",
        strong: "That `__exit__` runs on every exit path from the block — normal completion, an exception, a `return`, a `break`. `with` compiles to a `try/finally`, so cleanup cannot be skipped by any control flow inside the block.",
        answer: [
          { t: "p", text: "The two return values are worth stating precisely: `__enter__` supplies what `as` binds, and `__exit__`'s return value decides whether the exception is suppressed — with a missing return meaning `None`, so the safe behaviour is the default." },
          { t: "p", text: "The practical framing is the rule it implies: any acquire with a matching release should be a context manager rather than two statements with code between them. If the release can be skipped by an exception, eventually it will be." },
          { t: "p", text: "Naming `@contextmanager` as the shorter form, and the `try/finally` around its `yield` as mandatory, shows you have written them rather than only used them." }
        ]
      },
      {
        level: "core",
        q: "How do you write one, and when would you use a class over `@contextmanager`?",
        strong: "`@contextmanager` on a generator with one `yield` — everything before it is enter, everything after is exit, wrapped in `try/finally` so cleanup survives an exception in the block. A class is right when the manager holds state across uses, needs to handle nesting, or is part of a larger object's API.",
        answer: [
          { t: "p", text: "The nesting example makes the class case concrete: a transaction manager tracking depth so an inner block issues a savepoint rather than a second `BEGIN` needs state that a single-use generator cannot hold." },
          { t: "p", text: "A detail that shows care: `__enter__` should return the thing the caller wants to use — the connection, not the manager — so the call site is not forced to reach through a wrapper." },
          { t: "p", text: "Mentioning `ExitStack` for a variable number of resources rounds it out, particularly that it handles partial failure correctly when the fourth acquisition raises." }
        ]
      },
      {
        level: "advanced",
        q: "What happens if cleanup itself fails inside `__exit__`?",
        strong: "The cleanup exception replaces the one being handled, so the caller sees an infrastructure error instead of the bug that caused the failure. The fix is to catch it, log it, and return `False` — letting the original propagate with its traceback intact.",
        answer: [
          { t: "p", text: "This is the failure mode that distinguishes a manager you would deploy from a ten-line example, and it is exactly the case that shows up during an incident: a rollback fails because the connection is already gone, and the real error disappears." },
          { t: "p", text: "The related detail is why you return `False` rather than re-raising the original explicitly. Returning falsy continues the existing propagation with the full traceback; re-raising attaches the `__exit__` frame and truncates the history, the same problem as `raise exc` in a decorator." },
          { t: "p", text: "A good close is that this is why distributed locks have TTLs — release is not guaranteed to succeed, so the system needs a recovery mechanism that does not depend on cleanup working." }
        ]
      }
    ]
  }
});
