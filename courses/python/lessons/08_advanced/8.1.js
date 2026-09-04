/* ============================================================================
   LESSON 8.1 — Generator Pipelines and Coroutine Mechanics
   ========================================================================= */
EC.receiveLesson({
  id: "8.1",

  lede: "A generator is a function that can pause. That single capability gives you streaming pipelines over data larger than memory, lazy evaluation without a framework, and — historically — the machinery that `async` was built on top of. **The pipeline pattern is the payoff**: each stage does one thing, stages compose by nesting, and nothing is materialised.",

  objectives: [
    "Compose generators into a streaming pipeline and explain where memory goes",
    "Use `yield from` for delegation and know what it forwards",
    "Explain `send`, `throw` and `close`, and the two-way protocol they form",
    "Guarantee cleanup in a generator that may never be exhausted",
    "Recognise when a pipeline is the wrong shape for the problem"
  ],

  prerequisites: ["5.6", "5.7"],

  blocks: [

    { t: "h2", n: "01", text: "The pipeline shape", id: "pipeline" },

    { t: "viz",
      title: "Data is pulled through, one item at a time",
      caption: "Nothing runs until the consumer asks. Then a single item is drawn through every stage before the next one starts — so peak memory is one item per stage, whatever the size of the source.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Diagram of a generator pipeline where the consumer pulls one item at a time back through parse, filter and enrich stages">
  <defs>
    <marker id="pl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent-line)"/>
    </marker>
    <marker id="pr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="46" width="150" height="60" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="89" y="70" text-anchor="middle" class="s-label">SOURCE</text>
  <text x="89" y="90" text-anchor="middle" class="s-sub">40 GB file</text>

  <rect x="196" y="46" width="150" height="60" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="271" y="70" text-anchor="middle" class="s-label">parse</text>
  <text x="271" y="90" text-anchor="middle" class="s-sub">str → Record</text>

  <rect x="378" y="46" width="150" height="60" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="453" y="70" text-anchor="middle" class="s-label">filter</text>
  <text x="453" y="90" text-anchor="middle" class="s-sub">drop non-errors</text>

  <rect x="560" y="46" width="150" height="60" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="635" y="70" text-anchor="middle" class="s-label">enrich</text>
  <text x="635" y="90" text-anchor="middle" class="s-sub">add customer</text>

  <rect x="742" y="46" width="144" height="60" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="814" y="70" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">CONSUMER</text>
  <text x="814" y="90" text-anchor="middle" class="s-sub">for r in ...</text>

  <line x1="742" y1="132" x2="168" y2="132" style="stroke:var(--accent-line)" stroke-width="1.6" marker-end="url(#pl)"/>
  <text x="400" y="152" class="s-sub" style="fill:var(--accent-ink)">1. each next() travels BACKWARD — demand pulls</text>

  <line x1="168" y1="180" x2="738" y2="180" style="stroke:var(--border-strong)" stroke-width="1.6" marker-end="url(#pr)"/>
  <text x="400" y="200" class="s-sub">2. one item travels forward through every stage</text>

  <text x="14" y="238" class="s-sub" style="fill:var(--good)">Peak memory: one item per stage. Not one item per stage per row — one item, total, in flight.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "each stage is a function that takes and returns an iterator", code: `
from collections.abc import Iterable, Iterator


def read_lines(path: str) -> Iterator[str]:
    with open(path, encoding="utf-8") as f:
        yield from f                       # the file is closed on exhaustion


def parse(lines: Iterable[str]) -> Iterator[dict]:
    for line in lines:
        if line.strip():
            yield json.loads(line)


def errors_only(records: Iterable[dict]) -> Iterator[dict]:
    for record in records:
        if record.get("level") == "ERROR":
            yield record


def enrich(records: Iterable[dict], lookup: dict[str, str]) -> Iterator[dict]:
    for record in records:
        yield record | {"customer": lookup.get(record["account"], "unknown")}


# Composition is nesting. Nothing has run yet.
pipeline = enrich(errors_only(parse(read_lines("events.jsonl"))), customers)

for record in pipeline:                    # NOW it runs, one item at a time
    publish(record)
`,
      caption: "**Each stage takes an `Iterable` and returns an `Iterator`.** That uniform signature is what makes stages composable in any order — and testable individually, by passing a list."
    },

    { t: "callout", kind: "insight", title: "Why this beats the equivalent loop", body: [
      { t: "table",
        head: ["", "One big loop", "Pipeline"],
        rows: [
          ["Memory", "Depends — usually a list per stage", "One item per stage"],
          ["Testing a stage", "Not possible in isolation", "`list(errors_only([...]))`"],
          ["Reordering stages", "Rewrite the loop body", "Change the nesting"],
          ["Early termination", "`break` plus flags", "`islice(pipeline, 10)` — upstream just stops"],
          ["Reading it", "One function doing four things", "Four functions doing one thing"]
        ]
      },
      { t: "p", text: "**Early termination is the underrated one.** `next(pipeline)` reads exactly enough of the 40 GB file to produce one result and then stops — no flag, no `break` propagated through four levels, no wasted work." },
      { t: "p", text: "The cost is real: a stack trace runs through every stage, and stepping through a pipeline in a debugger jumps between generators in a way that takes practice to read (Lesson 6.6)." }
    ]},

    { t: "h2", n: "02", text: "yield from", id: "yieldfrom" },

    { t: "code", lang: "python", title: "delegation, not just a shorter loop", code: `
def flatten(nested):
    for group in nested:
        yield from group                   # instead of: for x in group: yield x


# The real difference: yield from forwards the FULL protocol
def middle(source):
    yield from source                      # send(), throw() and close()
                                           # all reach source directly

# It also captures the sub-generator's return value
def counter(items):
    count = 0
    for item in items:
        yield item
        count += 1
    return count                           # a generator CAN return a value


def wrapper(items):
    total = yield from counter(items)      # the return value lands here
    print(f"produced {total} items")
`,
      out: `produced 3 items`,
      caption: "For a plain loop, `yield from` is a nicety. For anything using `send` or `throw`, it is the only correct way to delegate — a manual `for` loop swallows the two-way protocol."
    },

    { t: "h2", n: "03", text: "The two-way protocol", id: "send" },

    { t: "p", text: "`yield` is an expression, not a statement. Its value is whatever the caller passes to `send()` — which turns a generator from a producer into something you can also push data into. This is the mechanism `async def` was built on before it got its own syntax." },

    { t: "code", lang: "python", title: "send, throw and close", code: `
def averager():
    """A coroutine: it CONSUMES values and yields a running average."""
    total = 0.0
    count = 0
    average = None
    while True:
        try:
            value = yield average          # yields out, receives in
        except ValueError:
            print("ignoring a bad value")  # throw() lands here
            continue
        except GeneratorExit:              # close() lands here
            print(f"closing after {count} values")
            raise                          # MUST re-raise or propagate
        total += value
        count += 1
        average = total / count


avg = averager()
next(avg)                                  # prime it -- run to the first yield
print(avg.send(10))
print(avg.send(20))
avg.throw(ValueError)                      # raised AT the yield expression
print(avg.send(30))
avg.close()
`,
      out: `10.0
15.0
ignoring a bad value
20.0
closing after 3 values`,
      hl: [11, 15, 16, 17],
      caption: "**Priming is mandatory.** A fresh generator has not reached its first `yield`, so `send(10)` on it raises `TypeError: can't send non-None value to a just-started generator`."
    },

    { t: "callout", kind: "tradeoff", title: "Should you write coroutines like this?", body: [
      { t: "p", text: "**Almost never, in new code.** `send`-based coroutines were how Python did cooperative concurrency before `async`/`await` existed, and `async def` now expresses the same thing with clearer syntax and a real scheduler (Lesson 11.5)." },
      { t: "ul", items: [
        "**Worth knowing** because `@contextmanager` is exactly this: a generator whose `yield` receives control back, and whose `throw` is how an exception inside the `with` block reaches your `finally` (Lesson 5.8).",
        "**Worth knowing** because you will meet it in older libraries, and in `yield`-based test fixtures.",
        "**Not worth writing** as a concurrency mechanism — a class with a method is clearer for a stateful accumulator, and `async` is clearer for concurrency."
      ]},
      { t: "p", text: "The part that stays useful is `close()` and `GeneratorExit`, which govern cleanup in *ordinary* pipeline generators — and that is the next section." }
    ]},

    { t: "h2", n: "04", text: "Cleanup in an abandoned generator", id: "cleanup" },

    { t: "code", lang: "python", title: "what happens when nobody finishes the pipeline", code: `
def read_lines(path):
    print("opening")
    f = open(path)
    try:
        yield from f
    finally:
        print("closing")                   # runs on close() AND on GC
        f.close()


lines = read_lines("big.txt")
print(next(lines))                         # one line, then we walk away
del lines                                  # or it just goes out of scope
`,
      out: `opening
first line

closing`,
      caption: "When a suspended generator is collected, Python calls `close()`, which raises `GeneratorExit` **at the paused `yield`** — so `finally` blocks and `with` statements inside the generator do run. The `with` form is better still, because it does not depend on you writing the `try`."
    },

    { t: "callout", kind: "trap", title: "Three ways generator cleanup goes wrong", body: [
      { t: "code", lang: "python", title: "each of these breaks the guarantee", numbered: false, code: `
# 1. Catching GeneratorExit and continuing -- RuntimeError
def bad():
    try:
        yield 1
    except GeneratorExit:
        yield 2                    # RuntimeError: generator ignored GeneratorExit

# 2. Yielding inside a finally during close -- same problem
def also_bad():
    try:
        yield 1
    finally:
        yield 2                    # cannot yield while closing

# 3. Relying on refcounting for timely cleanup
def leaky(path):
    f = open(path)                 # no try/finally, no with
    yield from f                   # abandoned generator -> file stays open
                                   # until the GC gets to it, which on PyPy
                                   # or in a reference cycle may be never`},
      { t: "p", text: "**Timing is the practical issue.** CPython's refcounting usually closes an abandoned generator promptly, so a leak hides in development and appears under a different runtime or inside a reference cycle." },
      { t: "p", text: "**The fix is always the same: `with` inside the generator.** It survives exhaustion, `close()`, `GeneratorExit` and an exception raised into the generator, with no `try` you can forget to write." }
    ]},

    { t: "ladder",
      title: "A stage that needs a resource",
      rungs: [
        { level: "bad", label: "Open outside, hope for the best",
          why: "The caller opens the file and passes the handle. Now the lifetime of the resource is the caller's problem, and if the pipeline is abandoned partway the caller has no idea whether to close.",
          code: `f = open(path)
for record in parse(f):
    ...
# who closes f? on which path? what if parse raised?` },
        { level: "ok", label: "try/finally inside the generator",
          why: "The generator owns the resource and cleans up on exhaustion, on `close()`, and on garbage collection. Correct — but it is four extra lines you must remember, in every stage that owns anything.",
          code: `def read_lines(path):
    f = open(path, encoding="utf-8")
    try:
        yield from f
    finally:
        f.close()` },
        { level: "best", label: "with inside the generator",
          why: "Identical guarantees, expressed once, and it composes: nested `with` statements, an `ExitStack`, or a database transaction all behave correctly when `GeneratorExit` arrives at the `yield`.",
          code: `def read_lines(path: str) -> Iterator[str]:
    with open(path, encoding="utf-8") as f:
        yield from f


def read_rows(dsn: str, query: str) -> Iterator[tuple]:
    with connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(query)
        while batch := cur.fetchmany(1000):
            yield from batch`,
          note: "`fetchmany` rather than `fetchall` is the same idea one level down: the database driver streams in batches, so a hundred-million-row query has bounded memory on both sides." }
      ]
    },

    { t: "h2", n: "05", text: "When a pipeline is the wrong shape", id: "limits" },

    { t: "table",
      head: ["Problem", "Pipelines are", "Because"],
      rows: [
        ["Transform and filter a stream", "**Right**", "That is the shape exactly"],
        ["Aggregate the whole stream", "Fine, at the end", "The final consumer collects; the stages stay lazy"],
        ["Need the data twice", "**Wrong**", "One pass only — `tee` buffers everything (Lesson 5.10)"],
        ["Need random access or a length", "**Wrong**", "`len()` and indexing force materialisation"],
        ["Sort, or group unsorted data", "**Wrong**", "Both need the whole input in memory anyway"],
        ["Parallelise across cores", "**Wrong**", "A generator is single-threaded by construction (Lesson 11.4)"],
        ["Fan out to several consumers", "**Wrong**", "The first consumer drains it; the second gets nothing"]
      ],
      caption: "**A pipeline is a sequence of single-pass transformations on a stream.** Anything needing the whole dataset at once — sorting, joining, random access — is a different tool, and forcing it into a pipeline just hides the materialisation."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A pipeline that must not leak",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Build a pipeline that reads a compressed log file, parses it, filters errors, enriches from a database and writes batches to an API. The requirements are all about what happens when it does **not** run to completion — which is the case a pipeline written casually gets wrong." },
        { t: "p", text: "It must survive: a caller taking only the first ten results, a malformed line halfway through, and a `KeyboardInterrupt` during the API call — releasing the file handle and the database connection in every case." }
      ],
      requirements: [
        "Each stage takes an iterable and returns an iterator, and is testable with a list.",
        "The file and the database connection are owned by their stages and released on every exit path.",
        "Malformed lines are skipped and counted, not fatal — and the count is available to the caller.",
        "Batch the output without materialising the stream.",
        "Prove memory stays bounded on an infinite input.",
        "Prove the file is closed when a caller abandons the pipeline after one item.",
        "**Explain why a counter cannot simply be returned from the parsing stage.**"
      ],
      hint: "A generator's `return` value is only visible to `yield from`, not to a `for` loop. For a count the caller can read, you need something that outlives the generator — and the simplest correct answer is not a global.",
      solution: {
        lang: "python",
        title: "pipeline.py",
        code: `from __future__ import annotations

import gzip
import json
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from itertools import islice
from typing import Any


# ---- why a plain return does not work -----------------------------------
#
#   def parse(lines):
#       skipped = 0
#       for line in lines:
#           ...
#       return skipped          # <- invisible
#
# A generator's return value becomes the value of a StopIteration, which
# "for" swallows. Only "yield from" can see it:
#
#   total = yield from parse(lines)      # works
#   for r in parse(lines): ...           # the count is lost
#
# And even with yield from, the value only arrives when the generator is
# EXHAUSTED -- so an abandoned pipeline never produces it, which is
# exactly the case this exercise is about.
#
# The answer is a small mutable object the caller holds: it is readable
# at any time, including partway through and after abandonment. A module
# global would also "work" and is wrong -- two concurrent pipelines would
# share one counter (Lesson 4.2).


@dataclass
class Stats:
    """Owned by the caller, mutated by the stages. Readable mid-stream."""
    read: int = 0
    skipped: int = 0
    emitted: int = 0
    reasons: dict[str, int] = field(default_factory=dict)

    def skip(self, reason: str) -> None:
        self.skipped += 1
        self.reasons[reason] = self.reasons.get(reason, 0) + 1


# ---- stages --------------------------------------------------------------

def read_lines(path: str, stats: Stats) -> Iterator[str]:
    """Owns the file handle.

    "with" inside the generator is what makes abandonment safe: when a
    suspended generator is closed or collected, GeneratorExit is raised
    AT the yield, so the with block unwinds and the file closes. A
    try/finally would do the same; "with" cannot be forgotten.
    """
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            stats.read += 1
            yield line


def parse(lines: Iterable[str], stats: Stats) -> Iterator[dict[str, Any]]:
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            stats.skip("malformed_json")        # counted, not fatal
            continue
        if not isinstance(record, dict) or "account" not in record:
            stats.skip("missing_account")
            continue
        yield record


def errors_only(records: Iterable[dict]) -> Iterator[dict]:
    for record in records:
        if record.get("level") == "ERROR":
            yield record


def enrich(records: Iterable[dict], dsn: str, stats: Stats) -> Iterator[dict]:
    """Owns the database connection for the life of the stream.

    The connection is opened lazily -- on the first next(), not when the
    generator object is created -- so building an unused pipeline costs
    nothing. And it is released by the same GeneratorExit path as the
    file above.
    """
    with connect(dsn) as conn, conn.cursor() as cur:
        cache: dict[str, str] = {}
        for record in records:
            account = record["account"]
            if account not in cache:
                cur.execute("SELECT name FROM customers WHERE account = %s", (account,))
                row = cur.fetchone()
                cache[account] = row[0] if row else "unknown"
            stats.emitted += 1
            yield record | {"customer": cache[account]}


def batched(items: Iterable[Any], size: int) -> Iterator[list[Any]]:
    """Batches WITHOUT materialising the stream: islice pulls exactly
    "size" items, and the walrus loop stops on the first empty batch --
    which is also what yields the final SHORT batch (Lesson 5.10)."""
    iterator = iter(items)
    while batch := list(islice(iterator, size)):
        yield batch


# ---- composition ---------------------------------------------------------

def build(path: str, dsn: str, stats: Stats, batch_size: int = 500):
    """Returns a lazy iterator of batches. Nothing has run yet."""
    return batched(
        enrich(errors_only(parse(read_lines(path, stats), stats)), dsn, stats),
        batch_size,
    )


def run(path: str, dsn: str, api, batch_size: int = 500) -> Stats:
    stats = Stats()
    pipeline = build(path, dsn, stats, batch_size)

    # closing() guarantees the generator chain is closed even if the API
    # raises or the process is interrupted -- yield from forwards close()
    # all the way to read_lines and enrich (Lesson 5.8).
    from contextlib import closing

    with closing(pipeline):
        for batch in pipeline:
            api.send(batch)

    return stats


# ---- tests ---------------------------------------------------------------

class FakeFile:
    """Records whether it was closed -- the only way to test the
    abandonment guarantee."""

    def __init__(self, lines: list[str]) -> None:
        self.lines, self.closed = lines, False

    def __enter__(self) -> "FakeFile":
        return self

    def __exit__(self, *exc: object) -> None:
        self.closed = True

    def __iter__(self) -> Iterator[str]:
        return iter(self.lines)


def test_stages_are_testable_with_lists() -> None:
    """The whole point of the uniform iterable-in, iterator-out shape."""
    stats = Stats()
    records = list(parse(['{"account": "a", "level": "ERROR"}', "not json"], stats))

    assert records == [{"account": "a", "level": "ERROR"}]
    assert stats.skipped == 1
    assert stats.reasons == {"malformed_json": 1}


def test_file_is_closed_when_the_caller_takes_only_one_item(monkeypatch) -> None:
    """THE requirement. A pipeline abandoned after one next() must not
    leave a file handle open."""
    handle = FakeFile(['{"account": "a", "level": "ERROR"}'] * 100)
    monkeypatch.setattr(gzip, "open", lambda *a, **k: handle)

    stats = Stats()
    lines = read_lines("x.gz", stats)

    next(lines)
    assert not handle.closed          # still streaming
    lines.close()                     # GeneratorExit at the yield
    assert handle.closed


def test_abandoning_without_close_still_cleans_up(monkeypatch) -> None:
    """Dropping the last reference closes it too -- via the GC. This is
    the path that hides bugs, because CPython's refcounting makes it
    prompt and other runtimes do not."""
    handle = FakeFile(['{"account": "a"}'] * 100)
    monkeypatch.setattr(gzip, "open", lambda *a, **k: handle)

    lines = read_lines("x.gz", Stats())
    next(lines)
    del lines

    import gc
    gc.collect()
    assert handle.closed


def test_pipeline_is_lazy_over_an_infinite_source() -> None:
    """Proves nothing is materialised: an endless generator is consumed
    only as far as the requested batch."""
    def forever() -> Iterator[str]:
        while True:
            yield '{"account": "a", "level": "ERROR"}'

    stats = Stats()
    records = errors_only(parse(forever(), stats))

    assert len(next(batched(records, 10))) == 10
    assert stats.read == 0            # read_lines was not in this chain
    # ... and this test TERMINATES, which a materialising pipeline would not


def test_stats_are_readable_partway_through() -> None:
    """A returned count would be invisible until exhaustion -- and an
    abandoned pipeline never exhausts."""
    stats = Stats()
    records = parse(['{"account": "a"}', "bad", '{"account": "b"}'], stats)

    next(records)
    assert stats.skipped == 0
    next(records)                     # skips "bad" on the way to the third
    assert stats.skipped == 1


def test_final_partial_batch_is_emitted() -> None:
    assert [len(b) for b in batched(range(7), 3)] == [3, 3, 1]


def test_two_pipelines_do_not_share_a_counter() -> None:
    """Why Stats is passed in rather than being a module global."""
    a, b = Stats(), Stats()
    list(parse(["bad"], a))
    list(parse(["bad", "worse"], b))

    assert (a.skipped, b.skipped) == (1, 2)`,
        notes: [
          { t: "p", text: "**A generator's `return` value is unreachable from a `for` loop.** It becomes the value attached to `StopIteration`, which the loop swallows — only `yield from` can capture it. Worse, it only exists on exhaustion, so a pipeline abandoned after ten items never produces it. That is why the count lives in an object the caller holds." },
          { t: "p", text: "**`Stats` is passed in rather than being a module-level counter** for the same reason a `defaultdict` should not escape into shared state: two pipelines running concurrently would share one tally, and the numbers would be quietly wrong rather than obviously broken (Lesson 4.2)." },
          { t: "p", text: "**`with` inside the generator is the whole cleanup story.** When a suspended generator is closed or collected, `GeneratorExit` is raised at the paused `yield`, which unwinds the `with` blocks above it. `yield from` forwards `close()` down the chain, so closing the outermost generator closes the file and the database connection." },
          { t: "callout", kind: "insight", title: "The two abandonment tests are not the same test", body: [
            { t: "p", text: "`lines.close()` tests the explicit path — what `contextlib.closing` and a `with` around the pipeline will do. `del lines; gc.collect()` tests the implicit one, which is what actually happens when a function returns early or an exception unwinds past the loop." },
            { t: "p", text: "The implicit path is the one that hides bugs: CPython's refcounting usually collects promptly, so a generator holding a resource without a `with` looks fine until it lands in a reference cycle or runs on a different implementation." }
          ]},
          { t: "p", text: "**The infinite-source test is the only proof of laziness.** Every assertion over finite input passes just as happily when a stage secretly calls `list()`; a test that terminates over an endless generator cannot." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An export job reads a large table, transforms rows and writes a file. It is written as a pipeline and works well — until someone adds a validation step that raises on the first bad row, so that the operator can fix the data and re-run." },
      { t: "p", text: "**Database connections start accumulating.** The pool exhausts after a few dozen failed runs and unrelated services begin timing out waiting for a connection." },
      { t: "p", text: "**The reading stage opened its connection and had no `with`.** On the happy path the generator ran to exhaustion and the code after the loop closed it. On the exception path the generator was left suspended, holding an open connection, until garbage collection — and because the traceback object held a reference to the frame, it was in a reference cycle and the collector took its time." },
      { t: "p", text: "**Two lines fixed it**: a `with` inside the generator instead of an open-and-close around the loop. The general rule is that **a generator owning a resource must acquire it inside a `with`, in the generator's own body** — anything else depends on the consumer finishing, and a consumer that raises is not a rare case." }
    ]}
  ],

  takeaways: [
    "**A pipeline stage takes an iterable and returns an iterator.** That uniform shape makes stages composable by nesting and testable with a list.",
    "**Demand pulls backward, data flows forward, one item at a time** — so peak memory is one item per stage regardless of source size.",
    "**Early termination is free.** `next(pipeline)` reads only enough of the source to produce one result; no flags, no propagated `break`.",
    "**`yield from` forwards the full protocol** — `send`, `throw` and `close` reach the sub-generator — where a manual `for` loop swallows all three.",
    "**A generator's `return` value is only visible to `yield from`**, and only on exhaustion, so it cannot report a count to a `for` loop or to an abandoned pipeline.",
    "**`yield` is an expression**: its value comes from `send()`, which is the two-way protocol `async` was built on and that `@contextmanager` still uses.",
    "**Prime a coroutine with `next()` before the first `send()`**, or you get `TypeError: can't send non-None value to a just-started generator`.",
    "**Closing a suspended generator raises `GeneratorExit` at the paused `yield`**, so `finally` blocks and `with` statements inside it do run.",
    "**A generator owning a resource must acquire it with `with`, inside the generator** — anything else depends on the consumer running to completion.",
    "**Abandonment is the normal case**, not an edge case: a caller taking ten items, an exception, or an early return all leave a generator suspended.",
    "**Test laziness with an infinite source.** Any assertion over finite input passes when a stage secretly materialises.",
    "**Pipelines are wrong for sorting, joining, random access, reuse and parallelism** — all of those need the whole dataset, and forcing them into a pipeline only hides the materialisation."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A pipeline stage opens a database connection and the caller abandons the pipeline after ten items. What guarantees the connection is released?",
        options: [
          "Nothing — the connection leaks until the process exits",
          "Closing or collecting the suspended generator raises `GeneratorExit` at the paused `yield`, so a `with` inside the generator unwinds",
          "The connection is released when the generator object is created",
          "Python closes all open resources at the end of each `for` loop"
        ],
        answer: 1,
        why: "`GeneratorExit` is raised at the point the generator is paused, so `finally` blocks and `with` statements enclosing that `yield` run normally. That is why the resource must be acquired *inside* the generator: an open-and-close around the consuming loop only runs on the happy path, and a consumer that raises or returns early leaves the generator suspended holding the connection."
      },
      {
        stem: "Why can a pipeline stage not report its skipped-row count with `return count`?",
        options: [
          "Generators cannot contain a `return` statement",
          "The value becomes part of `StopIteration`, which a `for` loop swallows — only `yield from` sees it, and only on exhaustion",
          "The count would be reset on each iteration",
          "`return` closes the generator prematurely"
        ],
        answer: 1,
        why: "A generator's return value is attached to the `StopIteration` that ends iteration, so `for` discards it and only `total = yield from gen()` captures it. It also only exists once the generator is exhausted, so a pipeline abandoned after ten items never produces one. A small mutable object owned by the caller is readable at any point, including partway through."
      },
      {
        stem: "What does `yield from source` give you that `for x in source: yield x` does not?",
        options: [
          "It is faster because it avoids a loop",
          "It forwards `send`, `throw` and `close` to the sub-generator and captures its return value",
          "It flattens nested structures recursively",
          "It makes the outer generator reusable"
        ],
        answer: 1,
        why: "The manual loop only relays values outward. Anything the caller sends or throws into the outer generator lands in the loop rather than in the sub-generator, and `close()` does not propagate. For a plain producer the two are equivalent apart from a small speed difference; for delegation involving the two-way protocol, `yield from` is the only correct form."
      },
      {
        stem: "Which of these is a poor fit for a generator pipeline?",
        options: [
          "Parsing and filtering a 40 GB log file",
          "Sorting the stream, then feeding two independent consumers from it",
          "Transforming records and writing them in batches",
          "Taking the first ten matching records from a large source"
        ],
        answer: 1,
        why: "Sorting needs the entire input in memory, so the laziness is lost anyway — and a generator is single-pass, so the first consumer drains it and the second gets nothing. `tee` does not help: it buffers everything one branch has consumed. A pipeline is a sequence of single-pass transformations on a stream; anything needing the whole dataset at once is a different tool."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you process a file larger than memory?",
        strong: "A generator pipeline: a stage per transformation, each taking an iterable and returning an iterator. Demand pulls one item through all the stages, so peak memory is one item per stage regardless of file size.",
        answer: [
          { t: "p", text: "The composability point is worth making concrete — stages compose by nesting, each is testable with a list, and reordering is a change to the nesting rather than a rewrite of a loop body." },
          { t: "p", text: "Early termination is the benefit people forget: taking ten results reads only enough of the source to produce them, with no flag threaded through four levels." },
          { t: "p", text: "The resource rule is what makes it production-ready: any stage owning a file or a connection must acquire it inside a `with`, in the generator's own body, so abandonment still releases it." }
        ]
      },
      {
        level: "advanced",
        q: "What happens to a generator that is never exhausted?",
        strong: "It stays suspended until it is closed or collected. Either raises `GeneratorExit` at the paused `yield`, so `finally` blocks and `with` statements inside run — which is what makes resource cleanup possible at all.",
        answer: [
          { t: "p", text: "The production failure makes it real: a stage that opens a connection without a `with`, plus a consumer that raises, leaks a connection per run until the pool is exhausted." },
          { t: "p", text: "The timing caveat shows depth — CPython's refcounting usually collects promptly, so the bug hides in development and appears under a reference cycle or a different implementation." },
          { t: "p", text: "Knowing that catching `GeneratorExit` and yielding again raises `RuntimeError` demonstrates the protocol is understood rather than half-remembered." }
        ]
      },
      {
        level: "expert",
        q: "What is `send()` for, and would you use it?",
        strong: "It makes `yield` a two-way channel: the expression's value is whatever the caller sends. It was how Python did cooperative concurrency before `async`/`await`, and `async def` now expresses the same thing with a real scheduler.",
        answer: [
          { t: "p", text: "Declining to use it in new code, with a reason, is the strong position — a class is clearer for a stateful accumulator and `async` is clearer for concurrency." },
          { t: "p", text: "The reason to know it anyway is `@contextmanager`, which is exactly this mechanism: the `yield` receives control back, and `throw` is how an exception inside the `with` block reaches your `finally`." },
          { t: "p", text: "Mentioning that a generator must be primed with `next()` before the first `send()` is a small detail that shows the protocol has actually been used." }
        ]
      }
    ]
  }
});
