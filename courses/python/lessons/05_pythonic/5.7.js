/* ============================================================================
   LESSON 5.7 — Generators
   ========================================================================= */
EC.receiveLesson({
  id: "5.7",

  lede: "A generator function does not run when you call it. It returns a paused object, and each `next()` runs it **until the next `yield` and then freezes it again** — locals, position and all. That suspension is what makes a generator different from a function returning a list: memory stays constant regardless of how much data flows through, and a pipeline of them processes a 10 GB file in the same footprint as a 10-line one.",

  objectives: [
    "Explain what a generator function returns and when its body runs",
    "Build pipelines of generators that stay lazy end to end",
    "Use `yield from` to delegate, and know what it adds over a loop",
    "Guarantee cleanup in a generator that holds a resource",
    "Recognise where a generator is the wrong choice"
  ],

  prerequisites: ["5.6", "2.11"],

  blocks: [

    { t: "h2", n: "01", text: "The body does not run on call", id: "suspension" },

    { t: "code", lang: "python", title: "watch when each line executes", code: `
def counter(n: int):
    print("  body starts")
    for i in range(n):
        print(f"  about to yield {i}")
        yield i
    print("  body finishes")


print("calling counter(2)")
gen = counter(2)                # NOTHING has run yet
print(f"got {gen}")

print("first next()")
print(f"-> {next(gen)}")

print("second next()")
print(f"-> {next(gen)}")

print("third next()")
next(gen)
`,
      out: `calling counter(2)
got <generator object counter at 0x...>
first next()
  body starts
  about to yield 0
-> 0
second next()
  about to yield 1
-> 1
third next()
  body finishes
StopIteration`,
      caption: "Calling the function produced an object and ran no code. The first `next()` runs up to the first `yield`; the second resumes *after* that `yield` and runs to the next one. Exhaustion raises `StopIteration`, which is what `for` catches."
    },

    { t: "viz",
      title: "Suspension is the whole idea",
      caption: "A generator's frame is kept alive between calls rather than destroyed on return. Locals, the instruction pointer and any open resources survive the pause — which is why a generator can hold a position in a file across millions of yields without holding the file's contents.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Diagram contrasting a function that runs to completion with a generator that suspends and resumes at each yield">
  <defs>
    <marker id="e1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">FUNCTION — one call, one return, frame destroyed</text>
  <rect x="20" y="36" width="120" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="80" y="56" text-anchor="middle" class="s-mono" style="font-size:10px">call</text>
  <line x1="140" y1="51" x2="196" y2="51" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#e1)"/>
  <rect x="202" y="36" width="240" height="30" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="322" y="56" text-anchor="middle" class="s-sub">runs everything, builds a list</text>
  <line x1="442" y1="51" x2="498" y2="51" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#e1)"/>
  <rect x="504" y="36" width="180" height="30" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="594" y="56" text-anchor="middle" class="s-sub" style="fill:var(--crit)">all n items in memory</text>

  <line x1="20" y1="88" x2="880" y2="88" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="114" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--accent-ink)">GENERATOR — the frame is kept and resumed</text>

  <rect x="20" y="126" width="120" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="80" y="146" text-anchor="middle" class="s-mono" style="font-size:10px">call</text>
  <line x1="140" y1="141" x2="190" y2="141" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#e1)"/>
  <rect x="196" y="126" width="130" height="30" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="261" y="146" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink)">object, nothing run</text>

  <g>
    <rect x="196" y="172" width="90" height="28" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="241" y="191" text-anchor="middle" class="s-mono" style="font-size:9.5px">next()</text>
    <rect x="300" y="172" width="90" height="28" rx="5" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
    <text x="345" y="191" text-anchor="middle" class="s-mono" style="font-size:9.5px">yield 0</text>
    <rect x="404" y="172" width="90" height="28" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="449" y="191" text-anchor="middle" class="s-mono" style="font-size:9.5px">next()</text>
    <rect x="508" y="172" width="90" height="28" rx="5" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
    <text x="553" y="191" text-anchor="middle" class="s-mono" style="font-size:9.5px">yield 1</text>
    <rect x="612" y="172" width="120" height="28" rx="5" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="672" y="191" text-anchor="middle" class="s-mono" style="font-size:9.5px">StopIteration</text>
  </g>

  <text x="746" y="180" class="s-sub" style="fill:var(--good)">ONE item</text>
  <text x="746" y="196" class="s-sub" style="fill:var(--good)">in memory</text>

  <rect x="20" y="214" width="860" height="28" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="233" class="s-sub">Between yields the frame is frozen: locals keep their values, open files stay open, and the position is remembered.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the memory difference is not marginal", code: `
import sys


def squares_list(n: int) -> list[int]:
    return [i * i for i in range(n)]


def squares_gen(n: int):
    for i in range(n):
        yield i * i


print(sys.getsizeof(squares_list(1_000_000)))
print(sys.getsizeof(squares_gen(1_000_000)))

# And a generator can be unbounded, which a list cannot
def naturals():
    n = 0
    while True:
        yield n
        n += 1
`,
      out: `8448728
200`
    },

    { t: "h2", n: "02", text: "Pipelines", id: "pipelines" },

    {"kind": "flow", "title": "A generator pipeline pulls one item at a time", "caption": "Nothing runs until the consumer asks. Each stage yields one item to the next; no stage ever holds the whole dataset, so a ten-gigabyte file streams through in constant memory.", "cols": 4, "nodes": [{"id": "src", "label": "read_lines(path)", "sub": "yields one line", "tone": "accent"}, {"id": "p", "label": "parse(lines)", "sub": "yields one record", "tone": "good"}, {"id": "f", "label": "filter_valid(records)", "sub": "yields some", "tone": "good"}, {"id": "c", "label": "sum(...)", "sub": "the consumer pulls", "tone": "warn"}], "edges": [["src", "p"], ["p", "f"], ["f", "c"]], "t": "diagram", "id": "dg-5_7-02-0"},


    { t: "p", text: "The real value is composition. Each stage pulls one item from the stage before it, so a chain of generators processes a stream in constant memory — no stage ever holds the whole dataset." },

    { t: "code", lang: "python", title: "a log-processing pipeline", code: `
from collections.abc import Iterator
from pathlib import Path


def read_lines(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8") as handle:
        yield from handle


def parse(lines: Iterator[str]) -> Iterator[dict]:
    for line in lines:
        parts = line.rstrip().split(" ", 2)
        if len(parts) == 3:
            yield {"ts": parts[0], "level": parts[1], "message": parts[2]}


def errors_only(entries: Iterator[dict]) -> Iterator[dict]:
    for entry in entries:
        if entry["level"] == "ERROR":
            yield entry


# Nothing has been read yet -- this only wires the stages together
pipeline = errors_only(parse(read_lines(Path("app.log"))))

for entry in pipeline:          # NOW one line at a time flows through
    alert(entry)
`,
      caption: "A 10 GB log runs through this in the memory of one line. Each stage is independently testable with a literal list, and reordering or inserting a stage is one function call."
    },

    { t: "callout", kind: "trap", title: "One `list()` collapses the whole pipeline", body: [
      { t: "code", lang: "python", title: "the word that undoes it", numbered: false, code: `
def parse(lines) -> list[dict]:
    return [make_entry(line) for line in lines]     # materialises

# Every stage downstream is still lazy, and it no longer matters:
# parse() read the entire file before returning.`},
      { t: "p", text: "Laziness is a property of the **whole chain**. A single eager stage — a comprehension with brackets, a `sorted()`, a `list()` — buffers everything at that point, and the constant-memory property is gone (Lesson 2.11)." },
      { t: "p", text: "**Some operations are unavoidably eager:** `sorted`, `max`, `min` and `len` must see every item before they can produce anything. Put them at the end, and know that the pipeline is streaming only up to that point." }
    ]},

    { t: "h2", n: "03", text: "yield from", id: "yield-from" },

    { t: "code", lang: "python", title: "delegation, and what it adds", code: `
# Equivalent for simple iteration:
def flatten_manual(nested):
    for group in nested:
        for item in group:
            yield item


def flatten(nested):
    for group in nested:
        yield from group        # shorter, and see below


# Recursive delegation -- where it genuinely shines
def walk(node: dict):
    yield node["name"]
    for child in node.get("children", []):
        yield from walk(child)      # the recursive case is one line


tree = {"name": "root", "children": [
    {"name": "a", "children": [{"name": "a1"}]},
    {"name": "b"},
]}
print(list(walk(tree)))
`,
      out: `['root', 'a', 'a1', 'b']`
    },

    { t: "callout", kind: "insight", title: "`yield from` is more than a shorthand", body: [
      { t: "p", text: "For plain iteration it is sugar for a loop. What it also does is **establish a transparent channel** to the sub-generator: `send()`, `throw()` and `close()` pass straight through, and the sub-generator's `return` value becomes the value of the `yield from` expression." },
      { t: "code", lang: "python", title: "capturing a sub-generator's return", numbered: false, code: `
def count_and_yield(items):
    n = 0
    for item in items:
        n += 1
        yield item
    return n                        # a generator CAN return a value


def outer(groups):
    total = 0
    for group in groups:
        total += yield from count_and_yield(group)
    print(f"{total} items passed through")`},
      { t: "p", text: "That channel is what makes `yield from` the foundation of coroutines — `await` is built on the same mechanism. For ordinary iteration the loop is equally correct; for recursion and delegation, `yield from` is clearly better." }
    ]},

    { t: "h2", n: "04", text: "Cleanup", id: "cleanup" },

    { t: "code", lang: "python", title: "the `with` inside a generator", code: `
def read_lines(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8") as handle:
        yield from handle
    # The file closes when the generator is exhausted OR closed OR
    # garbage-collected -- but NOT when the consumer simply stops.
`},

    { t: "callout", kind: "trap", title: "Abandoning a generator leaves the resource open", body: [
      { t: "code", lang: "python", title: "the leak", numbered: false, code: `
def first_error(path: Path) -> str | None:
    for line in read_lines(path):
        if "ERROR" in line:
            return line             # the generator is abandoned here
    return None

# read_lines is suspended forever inside its "with". The file closes
# only when CPython's refcount drops to zero -- promptly here, but not
# guaranteed, and not at all on PyPy or under a reference cycle.`},
      { t: "p", text: "When a generator is discarded, Python calls `close()` on it during collection, which raises `GeneratorExit` at the paused `yield` and lets the `with` unwind. In CPython that usually happens immediately thanks to reference counting — but relying on it is relying on an implementation detail (Lesson 1.1)." },
      { t: "p", text: "**Two robust fixes.** Use `contextlib.closing` when you need the guarantee, or invert the design so the caller owns the resource:" },
      { t: "code", lang: "python", title: "both forms", numbered: false, code: `
from contextlib import closing

with closing(read_lines(path)) as lines:
    for line in lines:
        if "ERROR" in line:
            break                   # close() is called on the way out


# Or: the caller owns the file, the generator just transforms
def parse(handle) -> Iterator[dict]:
    for line in handle:
        yield make_entry(line)

with path.open(encoding="utf-8") as handle:
    for entry in parse(handle):
        ...`},
      { t: "p", text: "The second is usually the better design: **a generator that opens a resource has a lifetime the caller cannot see.** Taking an already-open handle keeps ownership where the `with` statement is." }
    ]},

    { t: "h2", n: "05", text: "When a generator is wrong", id: "when-wrong" },

    { t: "table",
      head: ["Use a generator", "Use a list"],
      rows: [
        ["The source is large or unbounded", "The result is small and known"],
        ["You consume it once", "You need it more than once"],
        ["You only iterate", "You need `len()`, indexing or slicing"],
        ["Early exit is likely", "You will consume all of it anyway"],
        ["Stages compose into a pipeline", "You need to sort or reverse it"]
      ]
    },

    { t: "callout", kind: "warn", title: "Three real costs", body: [
      { t: "ul", items: [
        "**Single-use.** A generator is an iterator (Lesson 5.6), so a second pass yields nothing — silently. If a function might iterate its argument twice, it should say `Sequence`, not `Iterable`.",
        "**No length.** `len(gen)` raises; counting means consuming, which destroys it. `sum(1 for _ in gen)` gives you a count and an empty generator.",
        "**Deferred errors.** Nothing runs until consumption, so an exception surfaces at the `for` loop rather than at the call that created it — often far from the code that caused it."
      ]},
      { t: "code", lang: "python", title: "the deferred-error surprise", numbered: false, code: `
def load(path):
    if not path.exists():
        raise FileNotFoundError(path)      # never raised at call time!
    for line in path.open():
        yield line


gen = load(Path("missing.txt"))            # succeeds -- nothing ran
list(gen)                                  # FileNotFoundError, here`},
      { t: "p", text: "**The fix is a wrapper:** validate eagerly in a plain function, and return a generator from it. The check then runs at call time and the streaming still works." },
      { t: "code", lang: "python", title: "eager validation, lazy body", numbered: false, code: `
def load(path: Path) -> Iterator[str]:
    if not path.exists():                  # runs immediately
        raise FileNotFoundError(path)
    return _load(path)                     # returns the generator


def _load(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8") as handle:
        yield from handle`}
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Build a streaming ETL pipeline",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Process a large CSV export into a database, in constant memory. The interesting requirements are the ones that fight laziness: batching for efficient inserts, counting for a report, and validating eagerly so a bad path fails at call time rather than mid-stream." }
      ],
      requirements: [
        "Read, parse, filter and batch — each stage a separate generator, composable in any order.",
        "The whole pipeline must use memory proportional to one batch, not the file.",
        "Batch rows into groups of N for bulk insert, yielding lists.",
        "Count processed and skipped rows **without** a second pass over the data.",
        "Validate the input path eagerly so a missing file raises at call time, not at first iteration.",
        "Guarantee the file closes even if the consumer stops early.",
        "Write a test proving no full materialisation occurs, and one proving early exit closes the file."
      ],
      hint: "For counting without a second pass, a mutable stats object that a pass-through stage updates as items flow gives you totals when the pipeline finishes. For the early-exit test, a fake handle can record whether `__exit__` ran.",
      solution: {
        lang: "python",
        title: "etl.py",
        code: `"""A streaming ETL pipeline in constant memory."""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from contextlib import closing
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


@dataclass
class Stats:
    """Accumulated as rows flow past -- no second pass needed."""
    read: int = 0
    skipped: int = 0
    written: int = 0
    reasons: dict[str, int] = field(default_factory=dict)

    def skip(self, reason: str) -> None:
        self.skipped += 1
        self.reasons[reason] = self.reasons.get(reason, 0) + 1


# ---- stage 1: read ------------------------------------------------------

def read_rows(handle: Iterable[str]) -> Iterator[str]:
    """Takes an ALREADY-OPEN handle.

    The generator does not open the file, so ownership stays with the
    caller's "with" statement. A generator that opens a resource has a
    lifetime the caller cannot see.
    """
    for line in handle:
        yield line.rstrip("\\n")


# ---- stage 2: parse -----------------------------------------------------

def parse_rows(lines: Iterable[str], stats: Stats) -> Iterator[dict]:
    for line in lines:
        stats.read += 1
        parts = line.split(",")

        if len(parts) != 4:
            stats.skip("wrong column count")
            continue

        order_id, sku, qty_raw, amount_raw = parts
        try:
            qty = int(qty_raw)
            amount = Decimal(amount_raw)      # str, never float (Lesson 1.5)
        except (ValueError, InvalidOperation):
            stats.skip("unparseable number")
            continue

        yield {"order_id": order_id, "sku": sku, "qty": qty, "amount": amount}


# ---- stage 3: filter ----------------------------------------------------

def positive_only(rows: Iterable[dict], stats: Stats) -> Iterator[dict]:
    for row in rows:
        if row["qty"] <= 0 or row["amount"] <= 0:
            stats.skip("non-positive")
            continue
        yield row


# ---- stage 4: batch -----------------------------------------------------

def batched(rows: Iterable[dict], size: int) -> Iterator[list[dict]]:
    """Group into fixed-size lists. Memory is one batch, not the file.

    itertools.batched (3.12+) does this; written out here to show that
    the partial final batch is the part people get wrong.
    """
    if size < 1:
        raise ValueError(f"batch size must be >= 1, got {size}")

    batch: list[dict] = []
    for row in rows:
        batch.append(row)
        if len(batch) == size:
            yield batch
            batch = []              # a NEW list -- reusing it would
                                    # mean every yielded batch aliases
                                    # the same object (Lesson 1.4)
    if batch:
        yield batch                 # the remainder


# ---- eager validation, lazy body ----------------------------------------

def run_etl(
    path: Path, db: Database, *, batch_size: int = 500
) -> Stats:
    """Validate immediately; stream everything else.

    The path check is in this plain function rather than a generator,
    so a missing file raises HERE rather than at the first iteration
    somewhere else entirely.
    """
    if not path.exists():
        raise FileNotFoundError(f"no such export: {path}")
    if batch_size < 1:
        raise ValueError(f"batch size must be >= 1, got {batch_size}")

    stats = Stats()

    with path.open(encoding="utf-8") as handle:
        pipeline = batched(
            positive_only(parse_rows(read_rows(handle), stats), stats),
            batch_size,
        )
        for batch in pipeline:
            db.insert_many(batch)
            stats.written += len(batch)

    return stats


# =========================================================================
# tests
# =========================================================================

class CountingHandle:
    """A file-like object recording lines read and whether it closed."""

    def __init__(self, lines: list[str]) -> None:
        self._lines = lines
        self.lines_read = 0
        self.closed = False

    def __enter__(self) -> "CountingHandle":
        return self

    def __exit__(self, *exc: Any) -> bool:
        self.closed = True
        return False

    def __iter__(self) -> Iterator[str]:
        for line in self._lines:
            self.lines_read += 1
            yield line


class RecordingDb:
    def __init__(self) -> None:
        self.batches: list[list[dict]] = []

    def insert_many(self, rows: list[dict]) -> None:
        self.batches.append(list(rows))


SAMPLE = [
    "o-1,W-1,2,19.99",
    "o-2,W-2,1,5.00",
    "bad row",                       # wrong column count
    "o-3,W-3,0,7.00",                # non-positive qty
    "o-4,W-4,3,x",                   # unparseable amount
    "o-5,W-5,1,3.50",
]


def test_pipeline_is_lazy_end_to_end() -> None:
    """Taking one batch must not read the whole file."""
    handle = CountingHandle(SAMPLE)
    stats = Stats()

    pipeline = batched(
        positive_only(parse_rows(read_rows(handle), stats), stats), 2
    )
    assert handle.lines_read == 0, "wiring the stages must read nothing"

    first = next(pipeline)
    assert len(first) == 2
    # Only the first two valid rows were needed, so only two lines read.
    assert handle.lines_read == 2, handle.lines_read


def test_batches_are_independent_lists() -> None:
    """Reusing one list would make every batch alias the same object."""
    stats = Stats()
    rows = [{"n": i} for i in range(5)]
    batches = list(batched(rows, 2))

    assert [len(b) for b in batches] == [2, 2, 1]     # partial final batch
    batches[0].append({"n": 99})
    assert len(batches[1]) == 2, "batches must not share a list"


def test_stats_accumulate_without_a_second_pass() -> None:
    handle = CountingHandle(SAMPLE)
    db = RecordingDb()
    stats = Stats()

    with handle:
        for batch in batched(
            positive_only(parse_rows(read_rows(handle), stats), stats), 500
        ):
            db.insert_many(batch)
            stats.written += len(batch)

    assert stats.read == 6
    assert stats.written == 3                        # o-1, o-2, o-5
    assert stats.skipped == 3
    assert stats.reasons == {
        "wrong column count": 1, "unparseable number": 1, "non-positive": 1
    }
    assert handle.lines_read == 6                    # exactly one pass


def test_early_exit_still_closes_the_file() -> None:
    handle = CountingHandle(SAMPLE)
    stats = Stats()

    with handle:
        for row in parse_rows(read_rows(handle), stats):
            break                                    # abandon immediately

    assert handle.closed, "the with statement must close on early exit"
    assert handle.lines_read == 1


def test_missing_file_raises_at_call_time() -> None:
    """Not at first iteration, which is the generator default."""
    try:
        run_etl(Path("does-not-exist.csv"), RecordingDb())
    except FileNotFoundError as exc:
        assert "does-not-exist" in str(exc)
    else:
        raise AssertionError("expected FileNotFoundError immediately")


if __name__ == "__main__":
    for t in (
        test_pipeline_is_lazy_end_to_end,
        test_batches_are_independent_lists,
        test_stats_accumulate_without_a_second_pass,
        test_early_exit_still_closes_the_file,
        test_missing_file_raises_at_call_time,
    ):
        t()
    print("streaming, batched, counted, and eager where it matters")`,
        notes: [
          { t: "p", text: "**`batch = []` rather than `batch.clear()` is not a stylistic choice.** Reusing one list would mean every yielded batch is the *same object*, so a consumer holding a previous batch would watch it change — the aliasing bug from Lesson 1.4, arriving through a generator. The test asserts independence explicitly." },
          { t: "p", text: "**The `Stats` object solves the count-without-a-second-pass requirement.** Generators are single-use, so counting after the fact is impossible; a mutable accumulator threaded through the stages records totals as rows flow past. It is deliberate shared mutable state, confined to one pipeline run (Lesson 2.5)." },
          { t: "p", text: "**`read_rows` takes a handle rather than a path.** That keeps the `with` in the caller, so ownership and lifetime are visible at the top level — and the early-exit test passes without `contextlib.closing`, because the file is closed by a statement the reader can see." },
          { t: "callout", kind: "insight", title: "Why `run_etl` is not itself a generator", body: [
            { t: "p", text: "If it were, the `path.exists()` check would not run until the first iteration — so a typo in a filename would surface deep inside a `for` loop somewhere else, with a traceback pointing at the consumer rather than the caller." },
            { t: "p", text: "The pattern is worth remembering: **a plain function that validates and returns a generator.** Eager where correctness demands it, lazy everywhere else. It is exactly how `open()` behaves — the path is checked immediately, the reading is lazy." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly export refactored to generators still gets OOM-killed. Each stage is written with `yield`, the file is streamed, and memory climbs steadily until the process dies at around 4 GB." },
      { t: "p", text: "**One stage sorts.** `sorted(rows, key=...)` in the middle of the chain must see every row before it can yield the first, so it buffers the entire dataset — and every generator downstream of it inherits that footprint. The stages either side are lazy and irrelevant." },
      { t: "p", text: "**Sorting is inherently eager**, as are `max`, `min`, `len`, `reversed` on a generator, and any `list()` or bracketed comprehension. The fix is to move the ordering elsewhere: sort in the database with `ORDER BY`, or use an external merge sort, or accept the buffering and size the container for it — but know which you chose." },
      { t: "p", text: "The diagnostic habit: **read a pipeline looking for the first stage that must see everything.** Memory is determined by that stage, not by how many `yield`s appear before or after it. One eager operation makes the whole chain eager from that point on." }
    ]}
  ],

  takeaways: [
    "**A generator function returns a paused object; the body runs on the first `next()`.** Each `yield` freezes the frame — locals, position and open resources survive the pause.",
    "Memory is constant regardless of the source size, and a generator can be **unbounded**, which a list cannot.",
    "**Laziness is a property of the whole chain.** One `list()`, `sorted()` or bracketed comprehension buffers everything at that point and the constant-memory property is gone.",
    "`sorted`, `max`, `min` and `len` are **inherently eager** — they must see every item. Put them at the end and know the pipeline streams only up to there.",
    "`yield from` delegates in one line, shines for recursion, and establishes a **transparent channel** — `send`, `throw`, `close` pass through, and the sub-generator's `return` value becomes the expression's value.",
    "**Abandoning a generator leaves its `with` suspended.** CPython usually closes it promptly by refcount, but that is an implementation detail — use `contextlib.closing`, or have the caller own the resource.",
    "**A generator that opens a resource has a lifetime the caller cannot see.** Taking an already-open handle keeps the `with` where a reader can find it.",
    "Three costs: **single-use**, **no `len()`**, and **deferred errors** — nothing runs until consumption, so exceptions surface at the loop rather than at the call.",
    "**Validate eagerly in a plain function that returns a generator.** That is how `open()` behaves, and it puts the error where the mistake was made.",
    "When batching, yield a **new list** each time — reusing one means every batch aliases the same object."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "When does the body of a generator function first execute?",
        options: [
          "When the function is called",
          "On the first `next()` — calling it only creates a paused generator object",
          "When the generator is garbage-collected",
          "Immediately, but output is buffered until iteration"
        ],
        answer: 1,
        why: "Calling a generator function creates an object and runs no code at all. The first `next()` executes up to the first `yield`; the second resumes after it. This is why a validation check written inside a generator does not fire at call time — the fix is a plain function that validates eagerly and returns the generator, which is exactly how `open()` behaves."
      },
      {
        stem: "A pipeline of five generators still exhausts memory. Four use `yield`; one calls `sorted()`. What is happening?",
        options: [
          "`sorted` is slow but does not affect memory",
          "`sorted` must see every item before yielding the first, so it buffers the whole dataset and every stage downstream inherits that footprint",
          "The generators are being consumed twice",
          "Generator frames accumulate because they are never closed"
        ],
        answer: 1,
        why: "Laziness is a property of the entire chain. Sorting cannot produce its first output until it has seen the last input, so it materialises everything at that point — and the `yield`s either side become irrelevant to the memory profile. `max`, `min`, `len` and any `list()` or bracketed comprehension have the same effect. Read a pipeline looking for the first stage that must see everything."
      },
      {
        stem: "A generator opens a file in a `with` block. A consumer `break`s out of the loop early. When does the file close?",
        options: [
          "Immediately, when `break` executes",
          "When the generator is closed or garbage-collected — prompt in CPython by refcounting, but not guaranteed",
          "Never — the `with` block is unreachable after suspension",
          "When the enclosing function returns"
        ],
        answer: 1,
        why: "Abandoning a generator leaves it suspended at the `yield`, inside the `with`. Python calls `close()` during collection, which raises `GeneratorExit` at that point and lets the block unwind. CPython's reference counting usually makes this immediate, but relying on it is relying on an implementation detail — it does not hold on PyPy or under a reference cycle. Use `contextlib.closing`, or let the caller own the resource."
      },
      {
        stem: "Why yield a fresh list from a batching generator rather than clearing and reusing one?",
        options: [
          "Clearing is slower than allocating a new list",
          "Every yielded batch would be the same object, so a consumer holding a previous batch would see it change underneath them",
          "`clear()` is not available on lists inside generators",
          "It prevents the garbage collector from reclaiming the batches"
        ],
        answer: 1,
        why: "Reusing one list means every yield hands out the same object, and the next batch overwrites it. A consumer that appends batches to a results list ends up with N references to one list holding only the final batch — the aliasing trap from Lesson 1.4, arriving through a generator. Allocating a new list per batch is cheap and the only correct option."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a generator and why would you use one?",
        strong: "A function containing `yield`. Calling it returns a paused object; each `next()` runs the body to the next `yield` and freezes the frame again. The point is constant memory — a generator holds one item rather than the whole collection, so it can process an unbounded stream in the footprint of a single element.",
        answer: [
          { t: "p", text: "Emphasising the suspension rather than just \"lazy evaluation\" shows you know the mechanism: locals, the instruction pointer and any open resources survive between yields, which is what lets a generator hold a position in a file across millions of items." },
          { t: "p", text: "Pipelines are the strongest practical argument — each stage pulls one item from the one before it, so a 10 GB file flows through a chain of transformations in the memory of one line, and every stage is independently testable with a literal list." },
          { t: "p", text: "Naming the costs unprompted keeps it balanced: single-use, no `len()`, and deferred errors — an exception surfaces at the consuming loop rather than at the call that created the generator." }
        ]
      },
      {
        level: "core",
        q: "A pipeline of generators still runs out of memory. Where do you look?",
        strong: "For the first stage that must see every item before producing anything — a `sorted()`, a `list()`, a bracketed comprehension, a `max` or `len`. Laziness is a property of the whole chain, so one eager stage buffers everything and every stage after it inherits that footprint.",
        answer: [
          { t: "p", text: "The framing that lands is that the number of `yield`s is irrelevant. Memory is set by the first operation that cannot stream, and the generators either side of it do not change that." },
          { t: "p", text: "Sorting is the usual culprit and worth naming specifically, along with the fixes: order in the database with `ORDER BY`, use an external merge sort, or accept the buffering and size the container for it — but as a decision, not by accident." },
          { t: "p", text: "The subtler variant is worth mentioning too: a comprehension with square brackets rather than parentheses. One character turns a streaming stage into a materialising one, and it is easy to miss in review." }
        ]
      },
      {
        level: "advanced",
        q: "How do you guarantee a generator that opens a file closes it?",
        strong: "You cannot, from inside. If the consumer abandons the generator, it stays suspended in the `with` until it is closed or collected — prompt in CPython by refcounting, but not guaranteed. Wrap it in `contextlib.closing`, or better, restructure so the caller owns the resource and the generator takes an already-open handle.",
        answer: [
          { t: "p", text: "The design point is the more valuable half: a generator that opens a resource has a lifetime the caller cannot see. Taking a handle instead puts the `with` in the caller's code, where a reader can find it." },
          { t: "p", text: "It is worth explaining what `close()` actually does — raises `GeneratorExit` at the suspended `yield` so the `with` can unwind — because that shows the cleanup path exists and is simply not deterministic." },
          { t: "p", text: "Naming PyPy makes the implementation-detail point concrete rather than theoretical: without refcounting, the file may stay open until the next collection cycle, which on a busy service can mean running out of descriptors." }
        ]
      }
    ]
  }
});
