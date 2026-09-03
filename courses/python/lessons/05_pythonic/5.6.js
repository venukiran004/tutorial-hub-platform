/* ============================================================================
   LESSON 5.6 — Iterators and the Iteration Protocol
   ========================================================================= */
EC.receiveLesson({
  id: "5.6",

  lede: "Lesson 2.7 established what `for` does: `iter()` then `next()` until `StopIteration`. This lesson is the other side of that contract — **writing objects that participate in it.** The distinction that matters, and that most people never make explicit, is between an *iterable* (something you can get an iterator from, repeatedly) and an *iterator* (a single-use cursor). Confusing them produces a class that works once and then silently yields nothing.",

  objectives: [
    "Distinguish an iterable from an iterator, and explain why both exist",
    "Implement `__iter__` and `__next__` correctly",
    "Diagnose the single-use bug where a class returns `self` from `__iter__`",
    "Use `iter()` with a sentinel, and know when it helps",
    "Choose between a class, a generator and `collections.abc` for an iterable"
  ],

  prerequisites: ["2.7", "4.9"],

  blocks: [

    { t: "h2", n: "01", text: "Two different things", id: "two-things" },

    { t: "viz",
      title: "Iterable and iterator are separate roles",
      caption: "An iterable is a factory: ask it for an iterator and it hands you a fresh one each time. An iterator is a cursor: it holds a position, is consumed as you read it, and is exhausted permanently. A list is an iterable; the object list.__iter__() returns is the iterator.",
      svg: `<svg viewBox="0 0 900 270" role="img" aria-label="Diagram: an iterable producing fresh independent iterators, each holding its own position">
  <defs>
    <marker id="d1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="20" y="80" width="180" height="80" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="110" y="104" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">ITERABLE</text>
  <text x="110" y="124" text-anchor="middle" class="s-sub">defines __iter__</text>
  <text x="110" y="142" text-anchor="middle" class="s-sub">reusable — a factory</text>

  <line x1="200" y1="100" x2="266" y2="60" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#d1)"/>
  <line x1="200" y1="140" x2="266" y2="180" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#d1)"/>
  <text x="222" y="70" class="s-mono" style="font-size:9px">iter()</text>
  <text x="222" y="196" class="s-mono" style="font-size:9px">iter()</text>

  <rect x="272" y="34" width="190" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
  <text x="367" y="56" text-anchor="middle" class="s-label">ITERATOR A</text>
  <text x="367" y="74" text-anchor="middle" class="s-sub">__iter__ AND __next__</text>
  <text x="367" y="91" text-anchor="middle" class="s-mono" style="font-size:9.5px">position: 2</text>

  <rect x="272" y="150" width="190" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
  <text x="367" y="172" text-anchor="middle" class="s-label">ITERATOR B</text>
  <text x="367" y="190" text-anchor="middle" class="s-sub">independent position</text>
  <text x="367" y="207" text-anchor="middle" class="s-mono" style="font-size:9.5px">position: 0</text>

  <text x="490" y="56" class="s-sub" style="fill:var(--good)">Two loops over the same iterable</text>
  <text x="490" y="74" class="s-sub" style="fill:var(--good)">get independent cursors and</text>
  <text x="490" y="92" class="s-sub" style="fill:var(--good)">cannot interfere.</text>

  <rect x="490" y="150" width="390" height="66" rx="9" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="506" y="172" class="s-sub" style="fill:var(--crit);font-weight:600">If __iter__ returns self, there is only ONE cursor</text>
  <text x="506" y="190" class="s-sub">the second loop resumes where the first stopped —</text>
  <text x="506" y="207" class="s-sub">and after exhaustion it yields nothing, silently.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the difference, demonstrated", code: `
numbers = [1, 2, 3]

it1 = iter(numbers)
it2 = iter(numbers)

print(next(it1), next(it1))     # it1 has advanced
print(next(it2))                # it2 is independent
print(it1 is it2)

# An iterator is its OWN iterator -- that is what lets it work in a for
print(iter(it1) is it1)

# But it is single-use
list(it1)                       # consumes the rest
print(list(it1))                # empty, and no error
`,
      out: `1 2
1
False
True
[]`
    },

    { t: "table",
      head: ["", "Iterable", "Iterator"],
      rows: [
        ["Defines", "`__iter__`", "`__iter__` **and** `__next__`"],
        ["`__iter__` returns", "A **new** iterator each call", "`self`"],
        ["Reusable", "Yes — loop over it repeatedly", "**No** — exhausted after one pass"],
        ["Holds a position", "No", "Yes"],
        ["Examples", "`list`, `dict`, `set`, `str`, `range`", "`iter([1,2])`, a generator, a file object, `zip`, `map`"]
      ],
      caption: "An iterator must define `__iter__` returning `self`, because `for` calls `iter()` on whatever it is given — so an iterator has to survive being passed to a `for` loop directly."
    },

    { t: "callout", kind: "trap", title: "A file is an iterator, not an iterable", body: [
      { t: "code", lang: "python", title: "the second loop reads nothing", numbered: false, code: `
with open("data.csv", encoding="utf-8") as f:
    header = next(f)                    # consumes line 1
    count = sum(1 for _ in f)           # consumes the rest
    rows = [line for line in f]         # empty -- f is exhausted

print(count, rows)`,
        out: `999 []`},
      { t: "p", text: "No error, no warning — the file object is an iterator, so the second pass starts from the end. The same applies to generators, `zip`, `map`, `filter`, `enumerate`, `reversed` and database cursors: **all iterators, all single-use.**" },
      { t: "p", text: "**Two fixes.** `f.seek(0)` rewinds a file specifically. For anything else, materialise with `list()` if you genuinely need two passes — and if the data is large, restructure so one pass does both jobs (Lesson 2.10)." }
    ]},

    { t: "h2", n: "02", text: "Writing an iterable", id: "writing" },

    { t: "ladder",
      title: "A paginated API result you can loop over",
      rungs: [
        { level: "bad", label: "__iter__ returns self", why: "usable exactly once",
          code: `class Results:
    def __init__(self, pages: list[list[dict]]) -> None:
        self._pages = pages
        self._page = 0
        self._index = 0

    def __iter__(self):
        return self                     # THE BUG

    def __next__(self):
        while self._page < len(self._pages):
            page = self._pages[self._page]
            if self._index < len(page):
                item = page[self._index]
                self._index += 1
                return item
            self._page += 1
            self._index = 0
        raise StopIteration`,
          note: "The state lives on the object itself, so there is only one cursor. `len(list(results))` then `for r in results:` gives zero rows — and worse, two `for` loops in different functions interfere with each other invisibly." },

        { level: "ok", label: "A separate iterator class", why: "correct, and verbose",
          code: `class Results:
    def __init__(self, pages: list[list[dict]]) -> None:
        self._pages = pages

    def __iter__(self) -> "ResultsIterator":
        return ResultsIterator(self._pages)   # a FRESH cursor each time


class ResultsIterator:
    def __init__(self, pages: list[list[dict]]) -> None:
        self._pages, self._page, self._index = pages, 0, 0

    def __iter__(self):
        return self          # an iterator must return itself

    def __next__(self) -> dict:
        while self._page < len(self._pages):
            page = self._pages[self._page]
            if self._index < len(page):
                item = page[self._index]
                self._index += 1
                return item
            self._page += 1
            self._index = 0
        raise StopIteration`,
          note: "Correct: each `iter()` produces an independent cursor. This is the textbook form and it is worth writing once to see the protocol clearly — twenty lines of manual index bookkeeping for something the language can generate." },

        { level: "best", label: "__iter__ as a generator", why: "the same contract, five lines",
          code: `from collections.abc import Iterator


class Results:
    def __init__(self, pages: list[list[dict]]) -> None:
        self._pages = pages

    def __iter__(self) -> Iterator[dict]:
        # A generator function returns a NEW generator on every call,
        # so this satisfies the iterable contract automatically.
        for page in self._pages:
            yield from page`,
          note: "Calling a generator function creates a fresh generator object each time, which *is* an iterator — so `__iter__` written as a generator gives correct reusable-iterable semantics for free. The index bookkeeping, the `StopIteration` and the second class all disappear. This is the form to write; Lesson 5.7 covers generators properly." }
      ]
    },

    { t: "callout", kind: "insight", title: "The one-line test for the bug", body: [
      { t: "code", lang: "python", title: "run this on any iterable you write", numbered: false, code: `
def test_iterable_is_reusable(obj) -> None:
    """Two passes must give the same result."""
    first = list(obj)
    second = list(obj)
    assert first == second, f"{type(obj).__name__} is single-use"
    assert first, "test with non-empty data"


test_iterable_is_reusable(Results([[{"id": 1}], [{"id": 2}]]))`},
      { t: "p", text: "Two `list()` calls. It costs nothing and it catches the most common iteration bug there is — a class that works in the test that iterates it once and fails in the code that iterates it twice." }
    ]},

    { t: "h2", n: "03", text: "Inheriting the rest", id: "abc" },

    { t: "code", lang: "python", title: "collections.abc gives you the surrounding methods", code: `
from collections.abc import Iterator, Sequence


class Page(Sequence):
    """Implement two methods, receive the whole Sequence interface."""

    def __init__(self, items: list[dict]) -> None:
        self._items = items

    def __getitem__(self, index):
        return self._items[index]

    def __len__(self) -> int:
        return len(self._items)


page = Page([{"id": 1}, {"id": 2}, {"id": 3}])

# All of these come from Sequence, built on the two methods above
print(len(page), page[0], page[-1], list(page[1:]))
print({"id": 2} in page, page.index({"id": 2}), list(reversed(page)))
`,
      out: `3 {'id': 1} {'id': 3} [{'id': 2}, {'id': 3}]
True 1 [{'id': 3}, {'id': 2}, {'id': 1}]`,
      caption: "`Sequence` supplies `__contains__`, `__iter__`, `__reversed__`, `index` and `count` from `__getitem__` and `__len__`. This is the ABC case from Lesson 4.8 at its strongest — genuine shared implementation, not just an interface declaration."
    },

    { t: "callout", kind: "good", title: "Which ABC to reach for", body: [
      { t: "table",
        head: ["Inherit", "Implement", "Receive"],
        rows: [
          ["`Iterable`", "`__iter__`", "Little — mostly a declaration"],
          ["`Iterator`", "`__next__`", "`__iter__` returning `self`"],
          ["`Sequence`", "`__getitem__`, `__len__`", "`__contains__`, `__iter__`, `__reversed__`, `index`, `count`"],
          ["`Mapping`", "`__getitem__`, `__iter__`, `__len__`", "`keys`, `values`, `items`, `get`, `__contains__`, `__eq__`"],
          ["`Set`", "`__contains__`, `__iter__`, `__len__`", "All the set operators and comparisons"]
        ]
      },
      { t: "p", text: "The bottom three are worth real money — `Mapping` in particular replaces about forty lines. **`Iterable` and `Iterator` are not**: they enforce a method you were going to write anyway and give almost nothing back, so a plain class with `__iter__` is usually better (Lesson 4.6 — duck typing already makes it work)." }
    ]},

    { t: "h2", n: "04", text: "iter() with a sentinel", id: "sentinel" },

    { t: "code", lang: "python", title: "the two-argument form", code: `
# iter(callable, sentinel) calls the function repeatedly until it
# returns the sentinel value, then stops.

# Read a binary file in fixed blocks -- no while loop, no break
with open("data.bin", "rb") as f:
    for block in iter(lambda: f.read(4096), b""):
        process(block)

# Consume a queue until it signals completion
for job in iter(queue.get, None):
    handle(job)

# Compare with the manual form:
#     while True:
#         block = f.read(4096)
#         if block == b"":
#             break
#         process(block)
`,
      caption: "This is the pre-walrus idiom for read-until-sentinel loops, and it is still the cleanest when the sentinel is a specific value rather than falsiness. `while (chunk := f.read(4096)):` (Lesson 5.4) stops on *any* falsy value, which differs subtly — a legitimate empty result would end the loop early."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Build a reusable log reader",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Write a class representing a log file that can be iterated more than once, streams rather than loading, and exposes a filtered view. The interesting constraint is that the underlying file object is an iterator — so getting reusability right means opening it fresh per pass." }
      ],
      requirements: [
        "`LogFile(path)` must be iterable **more than once**, yielding parsed entries each time.",
        "It must stream — never load the whole file into memory.",
        "Implement `__iter__` as a generator; do not write a separate iterator class.",
        "Add a `filtered(level)` method returning something itself reusable and lazy.",
        "Add `__len__`, and explain the trade-off it forces.",
        "Write a test proving two passes give identical results, and one proving no full materialisation occurs.",
        "Explain why returning `self` from `__iter__` would be wrong here."
      ],
      hint: "For the memory test, a fake file whose lines come from a generator can count how many were read — if the whole file were materialised, the count after taking two items would be the total.",
      solution: {
        lang: "python",
        title: "logfile.py",
        code: `"""A log file that is a reusable, streaming iterable."""

from __future__ import annotations

import re
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

LINE = re.compile(
    r"^(?P<ts>\\S+)\\s+(?P<level>[A-Z]+)\\s+(?P<message>.*)$"
)


@dataclass(frozen=True, slots=True)
class Entry:
    timestamp: datetime
    level: str
    message: str


class LogFile:
    """A reusable iterable over parsed log entries.

    WHY __iter__ MUST NOT RETURN self:

    The underlying file object IS an iterator -- single-use. If
    __iter__ returned self and held one open handle, the first pass
    would exhaust it and every later pass would yield nothing, silently.
    Opening a fresh handle inside __iter__ gives each pass its own
    cursor, which is exactly the iterable/iterator split.
    """

    def __init__(self, path: Path, *, encoding: str = "utf-8") -> None:
        self._path = path
        self._encoding = encoding
        self._malformed = 0

    def __iter__(self) -> Iterator[Entry]:
        # A generator function returns a NEW generator per call, so this
        # satisfies the iterable contract with no bookkeeping.
        self._malformed = 0
        with self._path.open(encoding=self._encoding) as handle:
            for raw in handle:              # streams, one line at a time
                entry = self._parse(raw)
                if entry is None:
                    self._malformed += 1
                    continue
                yield entry

    def _parse(self, raw: str) -> Entry | None:
        match = LINE.match(raw.strip())
        if match is None:
            return None
        try:
            return Entry(
                timestamp=datetime.fromisoformat(match["ts"]),
                level=match["level"],
                message=match["message"],
            )
        except ValueError:
            return None

    @property
    def malformed_count(self) -> int:
        """Lines skipped during the most recent pass."""
        return self._malformed

    def filtered(self, level: str) -> FilteredLog:
        """A lazy, reusable view. Does not read anything yet."""
        return FilteredLog(self, lambda e: e.level == level)

    def __len__(self) -> int:
        """Count entries by streaming the file.

        THE TRADE-OFF: len() is expected to be O(1) and cheap (Lesson
        4.4). Here it is O(n) and does disk I/O, so bool(log) -- which
        falls back to __len__ -- silently reads the entire file.

        __bool__ is defined below specifically to stop that: it needs
        only the first entry, so truthiness costs one line rather than
        a full scan.
        """
        return sum(1 for _ in self)

    def __bool__(self) -> bool:
        return next(iter(self), None) is not None

    def __repr__(self) -> str:
        return f"LogFile({str(self._path)!r})"


class FilteredLog:
    """A lazy view over another iterable. Reusable because it holds the
    SOURCE, not an iterator over it."""

    def __init__(
        self, source: LogFile, predicate: Callable[[Entry], bool]
    ) -> None:
        self._source = source
        self._predicate = predicate

    def __iter__(self) -> Iterator[Entry]:
        # Iterating the source afresh each time is what makes this view
        # reusable. Storing iter(source) here would make it single-use.
        return (e for e in self._source if self._predicate(e))


# =========================================================================
# tests
# =========================================================================

class FakeFile:
    """A file-like object that counts how many lines were actually read."""

    def __init__(self, lines: list[str]) -> None:
        self._lines = lines
        self.lines_read = 0
        self.opens = 0

    def open(self, encoding: str = "utf-8"):
        self.opens += 1
        outer = self

        class Handle:
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

            def __iter__(self):
                for line in outer._lines:
                    outer.lines_read += 1
                    yield line

        return Handle()


SAMPLE = [
    "2024-01-15T10:00:00 INFO started\\n",
    "not a valid log line\\n",
    "2024-01-15T10:00:01 ERROR disk full\\n",
    "2024-01-15T10:00:02 INFO retrying\\n",
]


def _log() -> tuple[LogFile, FakeFile]:
    fake = FakeFile(SAMPLE)
    log = LogFile(fake)          # duck typing: any object with .open()
    return log, fake


def test_two_passes_give_identical_results() -> None:
    """The one-line test for the single-use bug."""
    log, fake = _log()

    first = list(log)
    second = list(log)

    assert first == second, "LogFile is single-use"
    assert len(first) == 3
    assert fake.opens == 2, "each pass must open its own handle"


def test_streams_rather_than_materialising() -> None:
    """Taking two entries must not read the whole file."""
    log, fake = _log()

    it = iter(log)
    next(it)
    next(it)

    # 3 lines read: two valid entries plus the malformed one skipped
    # between them. If __iter__ materialised, this would be 4.
    assert fake.lines_read == 3, fake.lines_read


def test_filtered_view_is_lazy_and_reusable() -> None:
    log, fake = _log()

    errors = log.filtered("ERROR")
    assert fake.lines_read == 0, "filtered() must not read anything yet"

    assert [e.message for e in errors] == ["disk full"]
    assert [e.message for e in errors] == ["disk full"]   # reusable


def test_malformed_lines_are_counted_not_hidden() -> None:
    log, _ = _log()
    list(log)
    assert log.malformed_count == 1


def test_bool_does_not_read_the_whole_file() -> None:
    """__len__ is O(n); __bool__ must not inherit that cost."""
    log, fake = _log()

    assert bool(log) is True
    assert fake.lines_read == 1, "truthiness must stop at the first entry"


if __name__ == "__main__":
    for t in (
        test_two_passes_give_identical_results,
        test_streams_rather_than_materialising,
        test_filtered_view_is_lazy_and_reusable,
        test_malformed_lines_are_counted_not_hidden,
        test_bool_does_not_read_the_whole_file,
    ):
        t()
    print("reusable, streaming, lazy")`,
        notes: [
          { t: "p", text: "**Opening the file inside `__iter__` is the whole design.** The handle is an iterator, so a single shared one could only be consumed once. Creating it per pass is what turns a single-use cursor into a reusable iterable — and `fake.opens == 2` is the assertion that proves it." },
          { t: "p", text: "**`FilteredLog` stores the source, not an iterator over it.** Writing `self._it = iter(source)` in `__init__` would make the view single-use while looking identical from outside. Holding the iterable and calling `iter()` inside `__iter__` is the pattern that keeps laziness *and* reusability." },
          { t: "p", text: "**`__bool__` exists because `__len__` is expensive here.** Without it, truthiness falls back to `__len__` and `if log:` silently reads the entire file — a property-that-does-I/O problem (Lesson 4.4) arriving through a dunder. Defining `__bool__` to check only the first entry costs three lines and removes the trap." },
          { t: "callout", kind: "insight", title: "Why the memory test counts lines rather than measuring memory", body: [
            { t: "p", text: "Measuring memory in a test is slow and flaky. Counting how many lines the fake actually yielded is deterministic and asserts the same property: after taking two entries, exactly three lines have been read, so nothing was materialised." },
            { t: "p", text: "This is a generalisable technique — **instrument the fake rather than the system**. It works because duck typing let `LogFile` accept any object with an `open()` method, which is the Lesson 4.6 payoff appearing in a test." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A report function takes a `results` argument, logs `len(list(results))` for observability, then iterates it to build the output. It works in tests. In production the reports come out empty — but only when the caller passes a database cursor rather than a list." },
      { t: "p", text: "**`list(results)` consumed the cursor.** A list is an iterable and survives being materialised; a cursor is an iterator and does not. The function worked with every test fixture because every fixture was a list, and the one production caller passing a real cursor got empty output with no error." },
      { t: "p", text: "**Two fixes, and the choice matters.** If the function genuinely needs two passes, materialise once at the top — `rows = list(results)` — and use `rows` throughout, accepting the memory. If it does not, restructure to a single pass, counting as you go (Lesson 2.10). What you must not do is consume an iterator and then iterate it again." },
      { t: "p", text: "**The type hint is the durable defence.** Annotating the parameter `Iterable[Row]` and testing with a generator rather than a list makes the single-pass assumption explicit and catches the bug in CI. A fixture that is always a list tests a property the production caller does not have." }
    ]}
  ],

  takeaways: [
    "**An iterable produces a fresh iterator on each `iter()` call; an iterator is a single-use cursor.** Both exist so several loops can traverse one collection independently.",
    "An iterator must define `__iter__` returning `self`, because `for` calls `iter()` on whatever it is given.",
    "**Files, generators, `zip`, `map`, `filter`, `enumerate` and database cursors are all iterators** — single-use, and exhausting one yields nothing on the next pass with no error.",
    "**Returning `self` from `__iter__` is the classic bug:** the class works in the test that iterates it once and fails silently wherever it is iterated twice.",
    "**Write `__iter__` as a generator.** A generator function returns a new generator per call, giving correct reusable-iterable semantics with no bookkeeping and no second class.",
    "A lazy view must hold the **source iterable**, not an iterator over it — otherwise the view is single-use while looking identical from outside.",
    "**The one-line test:** `list(obj) == list(obj)`. It costs nothing and catches the most common iteration bug there is.",
    "`Sequence` and `Mapping` from `collections.abc` give real shared implementation; `Iterable` and `Iterator` give almost nothing and are usually not worth inheriting.",
    "`iter(callable, sentinel)` reads until a specific value — distinct from `while (x := read()):`, which stops on **any** falsy value.",
    "**Annotate a parameter `Iterable[T]` and test with a generator**, not a list, or you will not discover that your function needs two passes."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A class's `__iter__` returns `self`. What breaks?",
        options: [
          "Nothing — that is the standard implementation",
          "It becomes single-use: the first loop exhausts it and every later loop yields nothing, silently",
          "`for` raises `TypeError` because `__next__` is missing",
          "Only nested loops over the same object break"
        ],
        answer: 1,
        why: "Returning `self` makes the object its own iterator, so there is one shared cursor rather than a fresh one per pass. After the first traversal it is exhausted, and subsequent loops complete immediately with no error — the failure is silent output rather than an exception. An iterable's `__iter__` must return a *new* iterator; writing it as a generator does that automatically."
      },
      {
        stem: "Why does the second loop over an open file read nothing?",
        options: [
          "The file handle is closed after the first iteration",
          "A file object is an iterator, not an iterable — it holds a position and is exhausted after one pass",
          "Buffering discards lines once they are read",
          "Files require an explicit `readlines()` before iterating"
        ],
        answer: 1,
        why: "File objects implement `__next__` and return `self` from `__iter__`, making them iterators. The position advances as you read and never resets, so a second pass starts from the end. The same is true of generators, `zip`, `map`, `filter` and database cursors. `f.seek(0)` rewinds a file; for other iterators you must materialise with `list()` or restructure to a single pass."
      },
      {
        stem: "What is the simplest way to write a correct reusable iterable?",
        options: [
          "Inherit from `collections.abc.Iterable` and implement `__next__`",
          "Write `__iter__` as a generator function — each call returns a new generator, satisfying the contract automatically",
          "Return `iter(self)` from `__iter__`",
          "Implement `__getitem__` and rely on the legacy iteration fallback"
        ],
        answer: 1,
        why: "Calling a generator function creates a fresh generator object every time, and a generator is an iterator — so `__iter__` written with `yield` gives correct reusable semantics with no index bookkeeping, no `StopIteration` and no second class. Option A confuses the two roles, option C is infinite recursion, and option D relies on a Python 2 compatibility path that misbehaves on mapping-like classes (Lesson 4.9)."
      },
      {
        stem: "A function does `count = len(list(results))` then iterates `results`. It works with lists and produces empty output for a database cursor. Why?",
        options: [
          "Cursors need an explicit `fetchall()` before iteration",
          "`list(results)` consumed the cursor — an iterator is single-use, while a list survives being materialised",
          "The cursor was closed by the `list()` call",
          "Cursors do not implement `__iter__`"
        ],
        answer: 1,
        why: "Every test fixture was a list, which can be traversed any number of times, so the bug never appeared. A cursor is an iterator: materialising it exhausts it, and the following loop sees nothing. Fix it by materialising once and using that list throughout, or by restructuring to a single pass. Annotating the parameter `Iterable[Row]` and testing with a generator makes the single-pass assumption explicit."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between an iterable and an iterator?",
        strong: "An iterable defines `__iter__` and returns a fresh iterator each time, so it can be traversed repeatedly. An iterator defines `__next__` as well, returns `self` from `__iter__`, holds a position, and is exhausted after one pass. A list is an iterable; what `iter(list)` gives you is an iterator.",
        answer: [
          { t: "p", text: "The reason both exist is the part worth stating: separate cursors let two loops traverse the same collection independently, including nested loops over one list." },
          { t: "p", text: "The practical payoff is knowing which everyday objects are iterators — files, generators, `zip`, `map`, `enumerate`, database cursors — because that is where the single-use surprise comes from." },
          { t: "p", text: "The one-line diagnostic is worth offering: `list(x) == list(x)`. If the second call is empty, you have an iterator." }
        ]
      },
      {
        level: "core",
        q: "How would you make a class iterable?",
        strong: "Write `__iter__` as a generator function. Each call returns a new generator, which is an iterator, so the reusable-iterable contract is satisfied with no bookkeeping. The manual alternative is a separate iterator class holding the position, which is twenty lines to do what `yield` does in two.",
        answer: [
          { t: "p", text: "Naming the bug you are avoiding shows understanding rather than recall: returning `self` from `__iter__` makes the object single-use, and it fails silently in any code that iterates twice." },
          { t: "p", text: "It is worth mentioning `collections.abc` for the neighbouring case — inheriting `Sequence` or `Mapping` gives you a large surface from two or three methods, while `Iterable` and `Iterator` give almost nothing back." },
          { t: "p", text: "If the object wraps something single-use like a file, the design point is that `__iter__` should open a fresh handle per pass — that is what turns a single-use resource into a reusable iterable." }
        ]
      },
      {
        level: "advanced",
        q: "A function works with lists and returns empty results for a generator. What happened?",
        strong: "It iterates the argument more than once. A list can be traversed repeatedly; a generator is an iterator and is exhausted by the first pass — often a `len(list(...))` or a `sum(...)` for logging, with the real loop coming afterwards.",
        answer: [
          { t: "p", text: "The framing that matters is why tests missed it: every fixture was a list, so the suite never exercised the single-pass property that the production caller actually has." },
          { t: "p", text: "The fix depends on intent. If two passes are genuinely needed, materialise once at the top and use that list throughout, accepting the memory. If not, restructure to a single pass — counting as you accumulate rather than counting first." },
          { t: "p", text: "The durable defence is the type hint plus the fixture: annotate `Iterable[T]` and test with a generator. That makes the assumption explicit and turns the bug into a CI failure rather than a production one." }
        ],
        weak: "Suggesting the caller should always pass a list. That pushes the constraint onto every caller and gives up streaming, which is usually why a generator was passed in the first place."
      }
    ]
  }
});
