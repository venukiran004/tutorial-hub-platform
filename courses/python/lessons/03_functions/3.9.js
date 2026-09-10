/* ============================================================================
   LESSON 3.9 — Designing Function Signatures
   ========================================================================= */
EC.receiveLesson({
  id: "3.9",

  lede: "This lesson closes the module by putting the pieces together. A signature is the **only part of a function most people will ever read** — it appears in autocomplete, in review diffs, in documentation and in the caller's head. Designing it well means a colleague uses your function correctly on the first try, without opening it.",

  objectives: [
    "Design signatures that communicate intent without a docstring",
    "Use type hints to make wrong calls impossible rather than merely discouraged",
    "Choose sentinel defaults correctly, including when `None` is a real value",
    "Recognise and remove the boolean trap and the parameter-explosion smell",
    "Evolve a public signature without breaking callers"
  ],

  prerequisites: ["3.1", "3.2", "3.4"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The signature is the interface", id: "the-interface" },


    { t: "viz",
      title: "The parameter order Python enforces",
      caption: "Positional-only, then normal, then keyword-only. The `/` and `*` markers are what draw those boundaries, and they let you change a parameter's name later without breaking callers.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="A function signature divided into positional-only, standard, and keyword-only regions">
  <text x="30" y="58" class="s-sub" style="fill:var(--ink-2)">def render(template, /, data, *, escape=True, timeout=5):</text>

  <g style="stroke-width:2">
    <rect x="30"  y="78" width="180" height="60" rx="7" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="226" y="78" width="170" height="60" rx="7" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)"/>
    <rect x="412" y="78" width="300" height="60" rx="7" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
  </g>
  <text x="48"  y="102" class="s-label" style="fill:var(--accent)">before /</text>
  <text x="48"  y="124" class="s-sub" style="fill:var(--ink-3)">positional only</text>
  <text x="244" y="102" class="s-label" style="fill:var(--warn)">between</text>
  <text x="244" y="124" class="s-sub" style="fill:var(--ink-3)">either way</text>
  <text x="430" y="102" class="s-label" style="fill:var(--good)">after *</text>
  <text x="430" y="124" class="s-sub" style="fill:var(--ink-3)">keyword only — must be named at the call site</text>

  <text x="30" y="172" class="s-sub" style="fill:var(--ink-3)">Positional-only frees you to rename the parameter later; keyword-only stops a caller passing flags by position.</text>
  <text x="30" y="198" class="s-sub" style="fill:var(--crit)">A boolean is almost always better keyword-only: render(t, d, True) tells the reader nothing.</text>
</svg>`
    },
    { t: "p", text: "Read these two and decide which you could call correctly without opening the body." },

    { t: "code", lang: "python", title: "same function, two contracts", code: `
# A
def process(data, flag=False, mode=1, opts=None, cb=None):
    ...


# B
def export_orders(
    orders: Iterable[Order],
    destination: Path,
    *,
    format: Literal["csv", "json"] = "csv",
    include_cancelled: bool = False,
    on_error: Callable[[Order, Exception], None] | None = None,
) -> ExportResult:
    ...
`,
      caption: "B answers, without a docstring: what it takes, what it returns, which arguments are optional, what `format` accepts, and that errors are reported through a callback rather than raised. A answers none of those, and its parameter names are now frozen because callers pass them positionally."
    },

    { t: "callout", kind: "mental", title: "Four questions a signature should answer", body: [
      { t: "ol", items: [
        "**What does it need?** Required parameters, positional, in an order a reader would guess.",
        "**What can it be told?** Optional parameters, keyword-only, with defaults that state the common case.",
        "**What does it give back?** A return type that is the same on every path (Lesson 3.1).",
        "**What can go wrong?** Which exceptions, documented — the one thing the signature genuinely cannot carry."
      ]},
      { t: "p", text: "If a reader has to open the body to answer any of the first three, the signature has failed at its job." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Naming", id: "naming" },

    { t: "table",
      head: ["Instead of", "Write", "Because"],
      rows: [
        ["`process(data)`", "`normalise_addresses(addresses)`", "The verb says what happens; the noun says to what"],
        ["`get_user(id)`", "`fetch_user(user_id)` / `find_user(user_id)`", "`get` hides whether it hits the network; `fetch` implies I/O, `find` implies it may return nothing"],
        ["`check(x)`", "`is_valid(x)` / `validate(x)`", "`is_` returns a bool; `validate` raises. `check` could be either"],
        ["`n`, `d`, `tmp`", "`retry_count`, `deadline`, `staged_path`", "Single letters are fine only where the domain is maths"],
        ["`flag=True`", "`include_archived=True`", "A flag with no noun is a flag nobody can read at the call site"],
        ["`timeout=30`", "`timeout_seconds=30`", "Units belong in the name or the type, never in the docstring alone"]
      ],
      caption: "The `timeout` row is worth internalising. `timeout=30` is ambiguous between seconds and milliseconds, and the failure — a request that gives up 1000× too early or too late — appears far from the call."
    },

    { t: "callout", kind: "good", title: "Naming conventions that carry meaning", body: [
      { t: "ul", items: [
        "**`is_` / `has_` prefix returns a bool** and does not raise. `is_valid(x)` answers a question; `validate(x)` enforces a rule.",
        "**`get_` is cheap; `fetch_` / `load_` may do I/O.** A reader treats them differently when deciding whether to call one in a loop.",
        "**`find_` may return `None`; `get_` should not.** This is a widely-recognised convention worth following.",
        "**A leading underscore is not-public.** It is not enforcement (Lesson 2.5), but it tells a reader the name may change without a deprecation."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Types that constrain", id: "types" },

    { t: "code", lang: "python", title: "hints that rule out wrong calls", code: `
from collections.abc import Callable, Iterable, Mapping, Sequence
from pathlib import Path
from typing import Literal

# Literal: only these exact values type-check
def export(fmt: Literal["csv", "json", "parquet"]) -> None: ...

# Sequence/Mapping: "I will read this, not modify it" (Lesson 2.5)
def summarise(rows: Sequence[Row], config: Mapping[str, str]) -> Summary: ...

# Iterable: "one pass is enough" -- accepts generators, files, cursors
def total(amounts: Iterable[Decimal]) -> Decimal: ...

# Path, not str: the type carries the meaning
def load(source: Path) -> bytes: ...

# NewType: a str that is specifically a user id, and not interchangeable
from typing import NewType
UserId = NewType("UserId", str)
def ban(user_id: UserId) -> None: ...
`,
      caption: "Each of these narrows what a caller can pass. `Literal` turns a typo into a type error at edit time; `Sequence` makes an accidental `.append()` inside the function a type error; `NewType` stops a raw string being passed where an id belongs."
    },

    { t: "ladder",
      title: "A function that schedules a job",
      rungs: [
        { level: "bad", label: "Stringly typed", why: "every wrong value is a runtime error",
          code: `def schedule(job, when, priority="normal", retry=True, notify=""):
    ...

schedule(job, "2024-13-45", "urgnt", 1, "a@b.com")
#              ^ invalid date  ^ typo  ^ not a bool`,
          note: "Three mistakes, none caught until the job runs — or worse, until it silently runs with `priority=\"urgnt\"` falling through to a default branch. `retry=1` is truthy so it works by accident, which is how it survives review." },

        { level: "ok", label: "Typed and keyword-only", why: "mypy catches the typo and the type",
          code: `def schedule(
    job: Job,
    when: datetime,
    *,
    priority: Literal["low", "normal", "urgent"] = "normal",
    retry: bool = True,
    notify: list[str] | None = None,
) -> JobId:
    ...`,
          note: "The invalid date is now impossible — a `datetime` cannot be malformed. The typo and the `1` are type errors caught before the code runs. `notify` uses a `None` sentinel rather than a mutable default, and returns a `JobId` rather than nothing." },

        { level: "best", label: "Domain types that cannot be wrong", why: "invalid states are unrepresentable",
          code: `from enum import Enum


class Priority(Enum):
    LOW = "low"
    NORMAL = "normal"
    URGENT = "urgent"


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    attempts: int = 3
    base_delay_seconds: float = 1.0

    def __post_init__(self) -> None:
        if self.attempts < 1:
            raise ValueError(f"attempts must be >= 1, got {self.attempts}")


NO_RETRY = RetryPolicy(attempts=1)


def schedule(
    job: Job,
    run_at: datetime,
    *,
    priority: Priority = Priority.NORMAL,
    retry: RetryPolicy = RetryPolicy(),
    notify: Sequence[EmailAddress] = (),
) -> JobId:
    ...`,
          note: "`retry=True` said nothing about *how* to retry, so that policy lived somewhere else and could drift. `RetryPolicy` names it, validates itself, and is frozen so a shared default is safe as an empty tuple would be. The enum makes an invalid priority unrepresentable rather than merely type-checked, and `run_at` reads better than `when` because it says what the datetime *means*." }
      ]
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "Sentinels", id: "sentinels" },

    { t: "code", lang: "python", title: "three levels of default", code: `
from typing import Any, Final

# 1. A plain default -- fine for immutable values
def paginate(page: int = 1, size: int = 50) -> Page: ...


# 2. None sentinel -- for mutable defaults, and "not supplied"
def search(filters: dict | None = None) -> list[Row]:
    filters = filters or {}
    ...


# 3. A private sentinel -- when None is itself a valid argument
_MISSING: Final = object()


def update_profile(user: User, *, bio: str | None | Any = _MISSING) -> User:
    """Update bio. Passing None CLEARS it; omitting it leaves it alone."""
    if bio is not _MISSING:
        user.bio = bio          # may legitimately be None
    return user
`,
      caption: "The third case is the PATCH-endpoint distinction from Lesson 1.5, solved at the function level. Without a private sentinel there is no way to tell *field omitted* from *field set to null*, and that distinction is the entire semantics of a partial update."
    },

    { t: "callout", kind: "trap", title: "`filters or {}` versus `filters if filters is None`", body: [
      { t: "code", lang: "python", title: "they differ, and it matters", numbered: false, code: `
def search(filters=None):
    filters = filters or {}          # an EMPTY dict also becomes {}
    ...

def search(filters=None):
    if filters is None:              # only a MISSING dict becomes {}
        filters = {}
    ...`},
      { t: "p", text: "For a dict the two are usually equivalent in effect. They diverge the moment a falsy value is meaningful — `page or 1` silently rejects `page=0`, and `retries or 3` rejects `retries=0` (Lesson 1.7). **Use `or` only when every falsy value should genuinely be replaced**; otherwise test `is None`." },
      { t: "p", text: "There is a second reason to prefer the explicit form: `filters or {}` also creates a new dict when an *empty* one is passed, silently discarding the caller's object. Harmless for a filter, surprising if the caller expected to see mutations." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Evolving a signature", id: "evolving" },

    { t: "table",
      head: ["Change", "Breaking?", "Note"],
      rows: [
        ["Add a keyword-only parameter **with a default**", "No", "The safe way to extend a function"],
        ["Add a positional parameter", "**Yes**", "Every existing call is now missing an argument"],
        ["Rename a parameter", "**Yes**, unless positional-only", "Names are public API once keywords are accepted (Lesson 3.2)"],
        ["Reorder parameters", "**Yes** for positional; no for keyword-only", "Another reason to make options keyword-only"],
        ["Widen a parameter type (`list` → `Sequence`)", "No", "Accepts strictly more"],
        ["Narrow a return type (`X | None` → `X`)", "No", "Callers handling `None` still work"],
        ["Widen a return type (`X` → `X | None`)", "**Yes**", "Every call site now needs a check"],
        ["Change a default value", "**Yes**, silently", "The worst kind — no error, different behaviour"]
      ],
      caption: "The last row is the most dangerous because nothing fails. Changing `timeout=30` to `timeout=5` breaks callers who relied on the old value, and they discover it as intermittent production timeouts rather than as an error."
    },

    { t: "code", lang: "python", title: "deprecating a parameter safely", code: `
import warnings
from typing import Any, Final

_MISSING: Final = object()


def fetch(
    url: str,
    /,
    *,
    timeout_seconds: float = 30.0,
    timeout: Any = _MISSING,          # deprecated, removed in 3.0
) -> Response:
    """Fetch a URL.

    Args:
        timeout: Deprecated alias for timeout_seconds. Removed in 3.0.
    """
    if timeout is not _MISSING:
        warnings.warn(
            "timeout= is deprecated, use timeout_seconds=; "
            "it will be removed in 3.0",
            DeprecationWarning,
            stacklevel=2,          # point at the CALLER, not at this line
        )
        timeout_seconds = timeout

    ...
`,
      hl: [19],
      caption: "`stacklevel=2` is the detail that makes a deprecation warning useful — without it the warning points at the library's own line, and the user cannot find which of their calls triggered it."
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Redesign a public API surface",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Below is the public entry point of a small reporting library, as it grew over two years. Every individual change was reasonable; the result is a signature nobody can call correctly on the first try." },
        { t: "p", text: "Redesign it, then answer the harder question: how would you ship your redesign without breaking every existing caller?" }
      ],
      requirements: [
        "Reduce it to at most two positional parameters, everything else keyword-only.",
        "Replace stringly-typed parameters with types that make invalid values unrepresentable.",
        "Group parameters that only make sense together.",
        "Fix the mutable default and the ambiguous units.",
        "Give it one return type that is the same on every path.",
        "**Then write a migration shim** that keeps every old call working while emitting a `DeprecationWarning` pointing at the caller.",
        "List which of your changes are breaking and which are not, using the table from this lesson."
      ],
      hint: "For the shim, keep the old function name and signature, translate its arguments into the new call, and warn with `stacklevel=2`. The new function gets a new name or lives in a new module.",
      solution: {
        lang: "python",
        title: "reporting.py",
        code: `# ---- the original, after two years of growth ---------------------------

def build_report(data, out, fmt="csv", hdr=True, idx=False, tz="UTC",
                 email=[], subject="", compress=None, timeout=30,
                 verbose=False, dry_run=False):
    ...
#
# Problems, in order of severity:
#   - 12 parameters, all positional-callable
#   - email=[] is a shared mutable default
#   - fmt, tz, compress are stringly typed: a typo is a runtime surprise
#   - email/subject only make sense together, but are separate
#   - timeout: seconds or milliseconds? nothing says
#   - hdr/idx/verbose/dry_run: four positional booleans
#   - no return type; returns a path, or None on dry_run, or False on error


# ---- the redesign ------------------------------------------------------

from __future__ import annotations

import warnings
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Final, NamedTuple


class Format(Enum):
    CSV = "csv"
    JSON = "json"
    PARQUET = "parquet"


class Compression(Enum):
    NONE = "none"
    GZIP = "gzip"
    ZSTD = "zstd"


@dataclass(frozen=True, slots=True)
class Layout:
    """Presentation options -- they travel together, so they are one thing."""
    header: bool = True
    index: bool = False


@dataclass(frozen=True, slots=True)
class Delivery:
    """Email options only make sense together, and validate together."""
    recipients: tuple[str, ...] = ()
    subject: str = "Report"

    def __post_init__(self) -> None:
        bad = [r for r in self.recipients if "@" not in r]
        if bad:
            raise ValueError(f"invalid recipients: {bad}")


class ReportResult(NamedTuple):
    """One return type on every path -- including dry runs and failures.

    The original returned a Path, or None, or False, so no caller could
    write one correct line.
    """
    path: Path | None          # None only for a dry run
    rows_written: int
    dry_run: bool


def build_report(
    rows: Iterable[Sequence],
    destination: Path,
    /,
    *,
    format: Format = Format.CSV,
    layout: Layout = Layout(),
    compression: Compression = Compression.NONE,
    delivery: Delivery | None = None,
    timeout: timedelta = timedelta(seconds=30),
    dry_run: bool = False,
) -> ReportResult:
    """Write rows to destination and optionally email the result.

    rows and destination are positional-only: their names carry no
    information a caller needs, which leaves them free to be renamed.

    Raises:
        OSError: destination is not writable.
        DeliveryError: the report was written but could not be emailed.
    """
    ...
    return ReportResult(path=destination, rows_written=0, dry_run=dry_run)


# ---- the migration shim ------------------------------------------------

_MISSING: Final = object()


def build_report_legacy(
    data,
    out,
    fmt: str = "csv",
    hdr: bool = True,
    idx: bool = False,
    tz: str = "UTC",
    email: Any = _MISSING,
    subject: str = "",
    compress: str | None = None,
    timeout: float = 30,
    verbose: bool = False,
    dry_run: bool = False,
):
    """Deprecated. Use build_report. Removed in 4.0.

    Kept byte-compatible with the old signature so no existing call site
    has to change on the day this ships.
    """
    warnings.warn(
        "build_report_legacy is deprecated; use build_report. "
        "Removed in 4.0.",
        DeprecationWarning,
        stacklevel=2,          # points at the CALLER's line, not this one
    )

    recipients = () if email is _MISSING else tuple(email)

    result = build_report(
        data,
        Path(out),
        format=Format(fmt),                       # ValueError on a typo
        layout=Layout(header=hdr, index=idx),
        compression=Compression(compress or "none"),
        delivery=Delivery(recipients, subject) if recipients else None,
        timeout=timedelta(seconds=timeout),       # the old unit, made explicit
        dry_run=dry_run,
    )

    # Old callers expected a bare path, so preserve that shape here even
    # though the new API returns a richer object.
    return result.path


# ---- which changes break callers ---------------------------------------
#
# NOT BREAKING (safe to ship in a minor release):
#   - adding keyword-only parameters with defaults
#   - widening list -> Sequence / Iterable (accepts strictly more)
#   - narrowing the return from "Path or None or False" to ReportResult
#     IF callers go through the shim
#
# BREAKING (needs a major version, or the shim):
#   - making rows/destination positional-only     (renames become free)
#   - making everything else keyword-only         (old positional calls fail)
#   - fmt: str -> Format enum                     (old strings rejected)
#   - timeout: float -> timedelta                 (unit made explicit)
#   - the changed return type                     (silently different!)
#
# SILENTLY BREAKING, and the one to be most careful with:
#   - none here, deliberately. The shim converts every old default into
#     the same behaviour. Changing a DEFAULT VALUE is the dangerous kind
#     of change: nothing fails, behaviour just differs.


if __name__ == "__main__":
    import warnings as w

    with w.catch_warnings(record=True) as caught:
        w.simplefilter("always")
        build_report_legacy([], "out.csv", "json", email=["a@b.com"])

    assert len(caught) == 1
    assert issubclass(caught[0].category, DeprecationWarning)
    print("old call still works, warning raised at the caller")`,
        notes: [
          { t: "p", text: "**`stacklevel=2` is the line that makes the deprecation usable.** Without it the warning reports the library's own file and line number, so a user sees \"something in this library is deprecated\" with no way to find which of their hundred calls triggered it. With it, the warning points at their code." },
          { t: "p", text: "**`Format(fmt)` in the shim does real work.** Converting the old string through the enum means a typo that previously fell through to a default branch now raises `ValueError` with the valid options listed — so migrating callers surfaces latent bugs rather than carrying them forward." },
          { t: "p", text: "**The shim returns `result.path` rather than the new `ReportResult`.** Old callers expect a path; handing them a `NamedTuple` would be a silent breaking change, since a tuple is truthy and subscriptable and would fail somewhere far away. A shim's job is to be boring." },
          { t: "callout", kind: "insight", title: "Why `timedelta` rather than `timeout_seconds`", body: [
            { t: "p", text: "Both fix the ambiguity. `timeout_seconds: float` puts the unit in the name; `timeout: timedelta` puts it in the type, so the unit cannot be wrong and arithmetic on durations works correctly." },
            { t: "p", text: "The trade-off is ergonomics: `timeout=timedelta(seconds=5)` is wordier than `timeout_seconds=5`, and many library APIs choose the simpler form. Either is defensible; **leaving the unit only in the docstring is not**, because that is exactly where nobody reads it." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A shared internal library changes a client's default from `timeout=30` to `timeout=5` to stop slow calls holding connections. Nothing fails at build time. Two weeks later, three teams report intermittent failures on a legitimately slow upstream, and none of them connects it to the library upgrade." },
      { t: "p", text: "**Changing a default value is the most dangerous signature change**, because it is the only one with no failure mode. Adding a positional parameter breaks loudly at every call site; changing a default breaks quietly, later, in production, in someone else's service." },
      { t: "p", text: "**How to ship it instead:** add the new behaviour as an opt-in first (`timeout=None` meaning \"use the new default\"), emit a warning when the old implicit default is used, give teams a release to migrate, then flip. Or bump the major version and put it in the release notes under a heading nobody can miss." },
      { t: "p", text: "The general point: **a default is part of the contract, not an implementation detail.** Callers who never pass the argument have still depended on its value, and they have no way to know it changed." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**The signature is the interface** — most people will never read the body. If a reader must open it to learn what the function takes, returns, or which arguments are optional, the signature has failed.",
    "Names carry conventions worth honouring: `is_`/`has_` return a bool, `find_` may return `None`, `get_` should not, `fetch_`/`load_` imply I/O.",
    "**Units belong in the name or the type, never only in the docstring.** `timeout=30` is ambiguous; `timeout_seconds` or `timedelta` is not.",
    "Types can rule out wrong calls: `Literal` catches a typo at edit time, `Sequence`/`Mapping` promise you will not mutate, `NewType` stops a raw string standing in for an id.",
    "**An enum makes invalid states unrepresentable**, where a `str` merely makes them type-checkable and a `bool` makes them invisible.",
    "Group parameters that only make sense together into a small frozen object rather than threading them through every layer.",
    "`or` as a default replaces **every** falsy value. Use `is None` whenever `0`, `\"\"` or `[]` is a legitimate argument, and a private `_MISSING` sentinel when `None` itself is.",
    "**Adding a keyword-only parameter with a default is the safe way to extend** a function. Adding a positional one, renaming, or reordering all break callers.",
    "`stacklevel=2` on a `DeprecationWarning` points at the caller's line rather than your own — without it the warning is unactionable.",
    "**Changing a default value is the most dangerous change**, because nothing fails: callers who never passed the argument still depended on its value."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which signature change breaks existing callers most dangerously?",
        options: [
          "Adding a required positional parameter",
          "Changing a default value from `timeout=30` to `timeout=5`",
          "Renaming a keyword parameter",
          "Reordering two positional parameters"
        ],
        answer: 1,
        why: "The others break loudly — a missing argument or an unexpected keyword raises `TypeError` at every affected call site, immediately. Changing a default breaks **silently**: nothing fails, behaviour just differs, and callers who never passed the argument have no way to know they depended on its value. It surfaces later as intermittent production failures nobody connects to the upgrade."
      },
      {
        stem: "Why is `Literal[\"csv\", \"json\"]` better than `str` for a format parameter?",
        options: [
          "It is faster at runtime because the values are interned",
          "A type checker rejects any other value, so a typo becomes an editor-time error rather than a runtime surprise",
          "It automatically validates the value when the function is called",
          "It prevents the parameter from being passed positionally"
        ],
        answer: 1,
        why: "`Literal` narrows the accepted values so mypy flags `format=\"jsonn\"` before the code runs. It is not enforced at runtime — hints never are (Lesson 1.8) — so a value arriving from JSON or user input still needs validation. An `Enum` goes further: it makes the invalid value impossible to construct in the first place, which is why the ladder in this lesson ends there."
      },
      {
        stem: "When do you need a private `_MISSING = object()` sentinel rather than `None`?",
        options: [
          "Whenever a parameter is optional",
          "When `None` is itself a valid value a caller might pass, so you must distinguish *omitted* from *explicitly None*",
          "When the default is mutable",
          "Only in async functions, where `None` has special meaning"
        ],
        answer: 1,
        why: "`None` works as a sentinel until a caller might legitimately pass `None`. The archetypal case is a PATCH endpoint: `bio=None` means *clear this field* while omitting `bio` means *leave it alone*, and a `None` default cannot tell them apart. A private sentinel object cannot be constructed by a caller, so its presence unambiguously means \"not supplied\". Mutable defaults are handled by a plain `None`."
      },
      {
        stem: "What does `stacklevel=2` do in `warnings.warn(...)`?",
        options: [
          "Raises the warning's severity so it is not suppressed",
          "Attributes the warning to the caller's line rather than the line inside your library",
          "Includes two frames of traceback in the warning output",
          "Delays the warning until the second time the function is called"
        ],
        answer: 1,
        why: "By default a warning reports the line where `warn()` was called — inside your library — so a user sees that something is deprecated with no indication which of their calls triggered it. `stacklevel=2` walks one frame up to the caller, making the warning actionable. It is the difference between a deprecation people can migrate from and one they ignore."
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
        q: "What makes a good function signature?",
        strong: "It answers what the function needs, what it can be told, and what it gives back — without the reader opening the body. Concretely: at most two positional parameters, everything else keyword-only with defaults, types that rule out wrong values, and a return type that is the same on every path.",
        answer: [
          { t: "p", text: "Framing it as \"the signature is the interface\" is what elevates the answer. It appears in autocomplete, in review diffs and in the caller's head; the body is read once by the author and rarely again." },
          { t: "p", text: "A concrete detail that lands: units belong in the name or the type. `timeout=30` is ambiguous between seconds and milliseconds, and the failure — giving up 1000× too early — shows up far from the call site." },
          { t: "p", text: "Mentioning that keyword-only parameters also buy *future* freedom shows design thinking: nobody depends on their position, so you can add, reorder or rename options without breaking callers." }
        ]
      },
      {
        level: "core",
        q: "How do you add a parameter to a widely-used public function?",
        strong: "Keyword-only, with a default that preserves existing behaviour. That is the one change that breaks nobody — every existing call keeps working and gets the old semantics. Adding a positional parameter, renaming, or reordering all break callers immediately.",
        answer: [
          { t: "p", text: "The categorisation is the substance of the answer, and it is worth being explicit that some changes are safe, some break loudly, and one breaks silently." },
          { t: "p", text: "That silent one is the point to dwell on: changing a *default value* has no failure mode. Callers who never passed the argument still depended on its value and have no way to learn it changed. It surfaces as intermittent production failures nobody attributes to the upgrade." },
          { t: "p", text: "If you want to show you have shipped this, describe the migration shape: introduce the new behaviour opt-in, warn when the old implicit default is used, give a release to migrate, then flip." }
        ]
      },
      {
        level: "advanced",
        q: "A function has twelve parameters, four of them booleans. How do you approach it?",
        strong: "Ask what the parameters mean together. Booleans that are mutually exclusive become an enum, so invalid combinations stop being representable. Parameters that only make sense together — recipients and subject — become one frozen object. What is left goes keyword-only behind at most two positional arguments.",
        answer: [
          { t: "p", text: "The counting argument is concrete and persuasive: four booleans describe sixteen states, and if only three are valid the signature is silently permitting thirteen wrong calls with nothing to catch them." },
          { t: "p", text: "Grouping is the half people miss. Threading `recipients` and `subject` separately through four layers means every layer carries both and any of them can drop one; a `Delivery` object carries them as one thing and validates itself." },
          { t: "p", text: "The senior move is addressing migration unprompted. A redesign nobody can adopt is not a redesign — so keep the old name as a shim that translates to the new call and warns with `stacklevel=2`, and be explicit about which changes are breaking." }
        ],
        weak: "Only adding type hints and defaults. Both help, and neither stops a caller passing six positional arguments in the wrong order — which is the failure that actually ships."
      }
    ]
  }
});
