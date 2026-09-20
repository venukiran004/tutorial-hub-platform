/* ============================================================================
   LESSON 5.3 — EAFP vs LBYL
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "Two ways to handle something that might not work: check first, or try and handle the failure. Python leans hard toward the second, and the reason is not style — **the checking version contains a race condition that cannot be fixed by checking more carefully.** Between your check and your action, the world can change.",

  objectives: [
    "State both approaches and the specific problem each solves",
    "Explain the time-of-check-to-time-of-use race and why LBYL cannot avoid it",
    "Choose deliberately rather than by habit, using the cost of the failure path",
    "Write `try` blocks narrow enough to catch only what you meant",
    "Recognise where LBYL is genuinely the better answer"
  ],

  prerequisites: ["1.7", "2.3"],

  blocks: [

    { t: "h2", n: "01", text: "The two styles", id: "the-two" },

    { t: "code", lang: "python", title: "same operation, two shapes", code: `
# LBYL -- Look Before You Leap
if "timeout" in config:
    timeout = config["timeout"]
else:
    timeout = 30

# EAFP -- Easier to Ask Forgiveness than Permission
try:
    timeout = config["timeout"]
except KeyError:
    timeout = 30

# For this case, both are noise -- the dict already has the operation
timeout = config.get("timeout", 30)
`,
      caption: "Most textbook comparisons use an example where a built-in already solves it. The interesting cases are the ones where no `get()` exists — files, network calls, attribute access on objects you did not build."
    },

    { t: "callout", kind: "mental", title: "The distinction that matters", body: [
      { t: "p", text: "**LBYL asks: is this going to work?** It queries state, then acts on the answer." },
      { t: "p", text: "**EAFP asks: did this work?** It acts, and handles the failure." },
      { t: "p", text: "The difference is *when* you learn the truth. LBYL learns it before the action and hopes nothing changes in between; EAFP learns it from the action itself, which cannot be out of date." }
    ]},

    { t: "h2", n: "02", text: "The race LBYL cannot fix", id: "toctou" },

    {"kind": "timeline", "title": "The race that look-before-you-leap cannot fix", "caption": "Between the check and the use, another process can change the world. EAFP does the operation and handles the failure, which closes the gap.", "span": 6, "lanes": [{"label": "your code", "tone": "accent", "bars": [[0, 2, "os.path.exists(p) → True"], [4, 6, "open(p) → FileNotFoundError", "crit"]]}, {"label": "other process", "tone": "warn", "bars": [[2, 4, "deletes p"]]}], "t": "diagram", "id": "dg-5_3-02-0"},


    { t: "p", text: "This is the substantive argument, and it is not about elegance. A check and the action it guards are two separate operations, and anything can happen between them." },

    { t: "viz",
      title: "Time-of-check to time-of-use",
      caption: "The check reports the state at one instant; the action happens at another. Any process, thread, or user can change the world in the gap — so a passing check is a statement about the past, not a guarantee about the action.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Timeline showing a check succeeding, an external process deleting the file, and the subsequent action failing anyway">
  <defs>
    <marker id="c1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--crit)">LBYL — two operations, one gap</text>

  <line x1="20" y1="90" x2="860" y2="90" style="stroke:var(--border-strong)" stroke-width="1.5" marker-end="url(#c1)"/>
  <text x="866" y="94" class="s-sub">time</text>

  <line x1="120" y1="78" x2="120" y2="102" style="stroke:var(--good)" stroke-width="2"/>
  <rect x="40" y="44" width="160" height="28" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="120" y="63" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">path.exists()  True</text>

  <line x1="420" y1="78" x2="420" y2="102" style="stroke:var(--crit)" stroke-width="2"/>
  <rect x="320" y="112" width="200" height="42" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.5"/>
  <text x="420" y="130" text-anchor="middle" class="s-sub" style="fill:var(--crit);font-weight:600">another process</text>
  <text x="420" y="146" text-anchor="middle" class="s-sub" style="fill:var(--crit)">deletes the file</text>

  <line x1="720" y1="78" x2="720" y2="102" style="stroke:var(--crit)" stroke-width="2"/>
  <rect x="620" y="44" width="200" height="28" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="720" y="63" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">open()  FileNotFoundError</text>

  <text x="230" y="180" class="s-sub" style="fill:var(--warn)">the gap — nothing you can write makes it zero</text>
  <line x1="128" y1="172" x2="412" y2="172" style="stroke:var(--warn)" stroke-width="1" stroke-dasharray="4 3"/>

  <rect x="20" y="200" width="840" height="38" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="216" class="s-sub" style="fill:var(--ink-2);font-weight:600">EAFP has no gap</text>
  <text x="36" y="232" class="s-sub">open() is ONE operation. It either returns a handle or raises — and the answer describes the action, not a moment before it.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the bug that survives every extra check", code: `
from pathlib import Path

# LBYL -- looks careful, still racy
if path.exists() and path.is_file() and os.access(path, os.R_OK):
    with path.open() as f:          # any of the three can be false BY NOW
        data = f.read()

# EAFP -- one operation, no gap
try:
    data = path.read_text(encoding="utf-8")
except FileNotFoundError:
    data = ""
except PermissionError:
    logger.error("cannot read %s", path)
    raise
`,
      hl: [4, 5],
      caption: "Adding more checks makes the window smaller and never closes it. The filesystem is shared state, and the only operation that tells you the truth about a file is the one that opens it."
    },

    { t: "callout", kind: "warn", title: "This is a security issue, not just a bug", body: [
      { t: "p", text: "TOCTOU races are a recognised vulnerability class. The canonical exploit: a program checks that a path is a safe regular file, and an attacker replaces it with a symlink to something sensitive before the program opens it. The check passed; the open followed the symlink." },
      { t: "p", text: "The defence is the same as the correctness fix — **do not check and then act; act and handle the result.** Open the file and inspect the handle you actually got, rather than inspecting a name and then opening it." }
    ]},

    { t: "h2", n: "03", text: "EAFP is also usually faster", id: "performance" },

    { t: "code", lang: "python", title: "the cost is in which path is common", code: `
import timeit

setup = "d = {'key': 1}"

hit_lbyl  = timeit.timeit("d['key'] if 'key' in d else 0", setup=setup, number=1_000_000)
hit_eafp  = timeit.timeit("try:\\n d['key']\\nexcept KeyError:\\n 0", setup=setup, number=1_000_000)

miss_lbyl = timeit.timeit("d['x'] if 'x' in d else 0", setup=setup, number=1_000_000)
miss_eafp = timeit.timeit("try:\\n d['x']\\nexcept KeyError:\\n 0", setup=setup, number=1_000_000)

print(f"hit   lbyl={hit_lbyl:.3f}  eafp={hit_eafp:.3f}")
print(f"miss  lbyl={miss_lbyl:.3f} eafp={miss_eafp:.3f}")
`,
      out: `hit   lbyl=0.089  eafp=0.041
miss  lbyl=0.062  eafp=0.271`,
      caption: "Setting up a `try` block is nearly free; **raising** an exception is expensive. So EAFP wins when the operation usually succeeds and loses when it usually fails — which is why the guidance is about the *expected* case, not a blanket rule."
    },

    { t: "table",
      head: ["If the failure is", "Prefer", "Because"],
      rows: [
        ["Rare — the operation nearly always succeeds", "**EAFP**", "No check cost on the common path, and no race"],
        ["Common — failure is the expected case", "**LBYL**", "Raising is expensive; a check is cheaper than an exception"],
        ["About shared state — files, network, other processes", "**EAFP**", "A check is out of date by the time you act"],
        ["Expensive or irreversible to attempt", "**LBYL**", "Better to check than to half-perform and roll back"],
        ["Cheap to attempt and cheap to undo", "**EAFP**", "Attempting *is* the check"]
      ]
    },

    { t: "h2", n: "04", text: "Where LBYL is right", id: "lbyl-right" },

    { t: "code", lang: "python", title: "four legitimate cases", code: `
# 1. Failure is the common case -- validating untrusted input
def parse_rows(raw: list[str]) -> list[int]:
    # Most of this file is malformed; exceptions would dominate
    return [int(r) for r in raw if r.strip().lstrip("-").isdigit()]


# 2. The attempt is expensive or irreversible
if not dry_run and order.total > Decimal("10000"):
    require_manual_approval(order)      # check BEFORE charging the card
charge(order)


# 3. You need several conditions reported together
problems = []
if not user.email:
    problems.append("email is required")
if user.age is not None and user.age < 13:
    problems.append("must be 13 or older")
if problems:
    raise ValidationError(problems)     # all of them, not just the first


# 4. Guard clauses -- checking is the whole point (Lesson 2.6)
def process(order: Order | None) -> Receipt:
    if order is None:
        raise ValueError("order is required")
    ...
`,
      caption: "Case 3 is the one people miss. EAFP reports the first failure and stops; when a user needs every problem at once — a form, a config file, an import — checking is the only way to collect them."
    },

    { t: "callout", kind: "insight", title: "The `hasattr` middle ground", body: [
      { t: "code", lang: "python", title: "checking for a method", numbered: false, code: `
# LBYL
if hasattr(obj, "close"):
    obj.close()

# EAFP
try:
    obj.close()
except AttributeError:
    pass                    # DANGEROUS -- see below`},
      { t: "p", text: "Here LBYL is usually better, for a reason specific to `AttributeError`: **the `except` swallows attribute errors raised *inside* `close()` too**, not just the one from the missing method. A `close` implementation with a typo in it would silently do nothing." },
      { t: "p", text: "This is the general limit of EAFP — an exception type tells you *what* went wrong, not *where*. When the same exception can come from the operation or from deep inside it, narrow the `try` or check first." }
    ]},

    { t: "h2", n: "05", text: "Narrow the try block", id: "narrow" },

    { t: "ladder",
      title: "Loading and processing a config file",
      rungs: [
        { level: "bad", label: "Everything in one try", why: "catches far more than intended",
          code: `try:
    config = json.loads(path.read_text())
    timeout = config["timeout"]
    client = HttpClient(timeout=timeout)
    return client.fetch(config["url"])
except (KeyError, OSError, ValueError):
    return None`,
          note: "Four operations, one handler. A `KeyError` from deep inside `client.fetch` is indistinguishable from a missing `timeout` key, and returning `None` for all of them destroys the information about what actually failed. This is how a network outage gets reported as a config problem." },

        { level: "ok", label: "One try per operation", why: "each handler knows its cause",
          code: `try:
    raw = path.read_text(encoding="utf-8")
except FileNotFoundError:
    raise ConfigError(f"no config at {path}") from None

try:
    config = json.loads(raw)
except json.JSONDecodeError as exc:
    raise ConfigError(f"{path} is not valid JSON: {exc}") from exc

timeout = config.get("timeout", 30)      # a default, not an exception`,
          note: "Each `try` wraps exactly the operation whose failure it understands, and each handler produces a message naming the actual problem. Note that `timeout` needs no exception at all — an optional value with a default is what `get` is for." },

        { level: "best", label: "Parse once, at the boundary", why: "one failure point, full context",
          code: `from pydantic import BaseModel, HttpUrl


class Config(BaseModel):
    url: HttpUrl
    timeout: int = 30


def load_config(path: Path) -> Config:
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ConfigError(f"cannot read {path}: {exc}") from exc

    try:
        return Config.model_validate_json(raw)
    except ValidationError as exc:
        # Errors carry the field path: "url: invalid URL"
        raise ConfigError(f"invalid config in {path}:\\n{exc}") from exc`,
          note: "Two failure modes, two handlers, and every field problem reported at once with its path — which is the LBYL case-3 benefit obtained inside an EAFP structure. Downstream code receives a validated object and needs no defensive access at all (Lesson 2.9)." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a racy import job",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The job below is written entirely LBYL. It has one genuine race, one over-broad handler hiding a real failure, and one place where LBYL is actually correct and should stay." },
        { t: "p", text: "Fix the first two and identify the third." }
      ],
      requirements: [
        "Identify the TOCTOU race and explain why adding more checks does not close it.",
        "Convert the racy check to EAFP with a handler narrow enough to name the cause.",
        "Find the handler that swallows an error from inside an operation rather than from the operation itself.",
        "Identify the check that should stay LBYL, and justify it.",
        "Ensure every failure path produces a message naming the file and the reason.",
        "Write a test proving a file deleted between check and use is handled, and one proving a malformed row does not stop the batch."
      ],
      hint: "For the test of the race, you do not need real concurrency — a fake path object whose `exists()` returns `True` and whose `open()` raises reproduces it deterministically.",
      solution: {
        lang: "python",
        title: "import_job.py",
        code: `# ---- the original -------------------------------------------------------

def import_files(paths, db):
    imported = 0
    for path in paths:
        if not path.exists():                    # RACE: check...
            continue
        if not path.suffix == ".csv":
            continue
        text = path.read_text()                  # ...then use

        try:
            rows = parse(text)
            for row in rows:
                db.insert(row)                   # OVER-BROAD: an insert
            imported += 1                        # failure looks like a
        except Exception:                        # parse failure
            continue
    return imported


# ---- the three findings -------------------------------------------------
#
# 1. THE RACE: path.exists() then path.read_text() are two operations.
#    Another process can delete or replace the file in between, and
#    read_text raises anyway. Adding is_file() and os.access() shrinks
#    the window without closing it -- the filesystem is shared state,
#    and only the open itself reports the truth at the moment it matters.
#
# 2. THE OVER-BROAD HANDLER: "except Exception" wraps both parse() and
#    db.insert(). A database failure is silently treated as a bad file
#    and skipped, so a broken connection looks like a clean run that
#    imported nothing. It also swallows KeyboardInterrupt-adjacent
#    problems and any bug inside parse().
#
# 3. THE CHECK THAT SHOULD STAY: path.suffix == ".csv" is correct LBYL.
#    It is a pure inspection of a string we already hold, with no I/O
#    and no shared state -- there is nothing to race against, and the
#    EAFP alternative would mean parsing a .png to discover it is not
#    a CSV, which is expensive and produces a worse error.


# ---- the fix ------------------------------------------------------------

from __future__ import annotations

import logging
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


class ParseError(ValueError):
    """A file's contents could not be parsed."""


@dataclass
class ImportReport:
    imported: int = 0
    skipped: list[tuple[str, str]] = field(default_factory=list)

    def skip(self, path: Path, reason: str) -> None:
        # Every skip records WHICH file and WHY -- a silent "continue"
        # turns a broken import into a clean-looking run.
        logger.warning("skipping %s: %s", path, reason)
        self.skipped.append((str(path), reason))


def import_files(paths: Iterable[Path], db: Database) -> ImportReport:
    report = ImportReport()

    for path in paths:
        # KEPT AS LBYL: a pure string inspection with no I/O. There is
        # no window for anything to change, and trying to parse a .png
        # to discover it is not a CSV is both slower and less clear.
        if path.suffix.lower() != ".csv":
            report.skip(path, "not a .csv file")
            continue

        # EAFP: one operation. No exists() check, because the read is
        # the only thing that can tell the truth about the file.
        try:
            text = path.read_text(encoding="utf-8")
        except FileNotFoundError:
            report.skip(path, "disappeared before it could be read")
            continue
        except PermissionError:
            report.skip(path, "not readable")
            continue
        except UnicodeDecodeError as exc:
            report.skip(path, f"not valid UTF-8: {exc.reason}")
            continue

        # Narrow: this try covers parsing ONLY. A database failure is
        # not a parse failure and must not be reported as one.
        try:
            rows = parse(text)
        except ParseError as exc:
            report.skip(path, f"malformed: {exc}")
            continue

        # Deliberately NOT wrapped: a database failure is not this
        # file's fault and must not be swallowed. Let it propagate --
        # the batch should stop rather than silently import nothing.
        for row in rows:
            db.insert(row)

        report.imported += 1

    return report


# ---- tests --------------------------------------------------------------

class VanishingPath:
    """A path that exists() reports as present and refuses to open.

    Reproduces the TOCTOU race deterministically -- no threads, no
    timing, no flakiness.
    """

    suffix = ".csv"

    def __init__(self, name: str = "gone.csv") -> None:
        self._name = name

    def exists(self) -> bool:
        return True                     # the check passes...

    def read_text(self, encoding: str = "utf-8") -> str:
        raise FileNotFoundError(2, "No such file or directory", self._name)

    def __str__(self) -> str:
        return self._name


class RecordingDb:
    def __init__(self, fail_on: int | None = None) -> None:
        self.rows: list[dict] = []
        self._fail_on = fail_on

    def insert(self, row: dict) -> None:
        if self._fail_on is not None and len(self.rows) == self._fail_on:
            raise ConnectionError("database went away")
        self.rows.append(row)


def test_file_deleted_between_check_and_use_is_handled() -> None:
    """The race, made deterministic."""
    db = RecordingDb()
    report = import_files([VanishingPath()], db)

    assert report.imported == 0
    assert report.skipped == [("gone.csv", "disappeared before it could be read")]
    assert db.rows == []


def test_malformed_file_does_not_stop_the_batch(tmp_path: Path) -> None:
    good = tmp_path / "good.csv"
    good.write_text("id,name\\n1,Ada\\n", encoding="utf-8")
    bad = tmp_path / "bad.csv"
    bad.write_text("not,a,valid\\nrow", encoding="utf-8")

    db = RecordingDb()
    report = import_files([bad, good], db)

    assert report.imported == 1                 # the good one still ran
    assert len(report.skipped) == 1
    assert "malformed" in report.skipped[0][1]


def test_database_failure_is_not_swallowed(tmp_path: Path) -> None:
    """The over-broad handler, closed.

    A database outage must NOT look like a bad file -- otherwise the
    job reports a clean run that imported nothing.
    """
    path = tmp_path / "a.csv"
    path.write_text("id,name\\n1,Ada\\n2,Grace\\n", encoding="utf-8")

    db = RecordingDb(fail_on=1)
    try:
        import_files([path], db)
    except ConnectionError:
        pass
    else:
        raise AssertionError("database failure must propagate")


if __name__ == "__main__":
    test_file_deleted_between_check_and_use_is_handled()
    print("race handled, db failures propagate, suffix check kept")`,
        notes: [
          { t: "p", text: "**`VanishingPath` is the technique worth taking away.** Testing a TOCTOU race with real concurrency is flaky and slow; a fake object whose `exists()` returns `True` and whose `read_text()` raises reproduces the exact condition deterministically. Duck typing is what makes it possible — the function never asked for a real `Path` (Lesson 4.6)." },
          { t: "p", text: "**Not wrapping `db.insert` is a decision, not an omission.** A database failure is not this file's fault, and treating it as one produces the worst possible outcome: a job that reports success having imported nothing. Letting it propagate stops the batch loudly." },
          { t: "p", text: "**Keeping `path.suffix` as LBYL** is the part that shows judgement. EAFP is a default, not a rule — a pure string check with no I/O has nothing to race against, and the exception alternative is slower and produces a worse message." },
          { t: "callout", kind: "insight", title: "Why every skip is recorded", body: [
            { t: "p", text: "The original's bare `continue` meant a run that skipped every file was indistinguishable from a run that had nothing to do. Both return a number and log nothing." },
            { t: "p", text: "Recording the path and the reason turns silence into evidence. The general rule: **a skip is a decision, and a decision that leaves no trace cannot be reviewed** — which is the same argument as the bare `except: pass` from Lesson 2.7." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service creates a user only if the email is unused: `if not db.exists(email): db.insert(user)`. Under normal load it works. During a marketing campaign, duplicate accounts appear — a few dozen, all created within milliseconds of each other." },
      { t: "p", text: "**Two requests passed the check before either inserted.** The database is shared state, and `exists()` reports a moment that has already passed by the time `insert` runs. The window is milliseconds and the campaign supplied enough concurrent requests to hit it." },
      { t: "p", text: "**The fix is not a lock in the application** — that only serialises one process, and there are four. It is a **unique constraint on the column**, plus EAFP: attempt the insert and catch the integrity error. The database is the only component that can make the check and the write one atomic operation." },
      { t: "p", text: "The generalisable rule: **when the state is shared across processes, the check and the action must happen in the same place that owns the state.** In SQL that is a constraint or `INSERT ... ON CONFLICT`; in a filesystem it is opening with `O_EXCL`. An application-level check is a race with extra steps." }
    ]}
  ],

  takeaways: [
    "**LBYL asks \"will this work?\"; EAFP asks \"did this work?\"** The difference is whether your information can be out of date.",
    "**A check and the action it guards are two operations**, and anything can change in between. Adding more checks shrinks the window and never closes it.",
    "TOCTOU is a recognised **security vulnerability class**, not only a correctness bug — the classic exploit swaps a checked path for a symlink before it is opened.",
    "Setting up a `try` is nearly free; **raising is expensive**. EAFP wins when the operation usually succeeds and loses when failure is the common case.",
    "**LBYL is right** when failure is common, when the attempt is expensive or irreversible, when you need every problem reported at once, and for guard clauses.",
    "`hasattr` usually beats catching `AttributeError`, because the `except` also swallows attribute errors raised *inside* the method you called.",
    "**An exception type says what went wrong, not where.** When the same exception can come from the operation or from deep inside it, narrow the `try` or check first.",
    "**Wrap exactly the operation whose failure you understand.** One `try` around four operations makes a network outage indistinguishable from a config typo.",
    "Parsing at the boundary gives you LBYL's collect-every-error benefit inside an EAFP structure.",
    "**For state shared across processes, the check and the action must be atomic in the component that owns the state** — a unique constraint, not an application-level `if`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `if path.exists(): data = path.read_text()` unsafe even with additional checks added?",
        options: [
          "`exists()` is unreliable on network filesystems",
          "The check and the read are separate operations — another process can delete or replace the file in the gap, so more checks shrink the window without closing it",
          "`read_text` caches the result of the previous `exists()` call",
          "It is safe as long as `is_file()` and `os.access()` are also checked"
        ],
        answer: 1,
        why: "This is the time-of-check-to-time-of-use race. The filesystem is shared state, so a passing check describes a moment that has already passed. No sequence of checks makes the gap zero — only performing the operation and handling its failure gives an answer that describes the action itself. It is also a recognised security vulnerability, since an attacker can replace the checked path with a symlink."
      },
      {
        stem: "When is LBYL faster than EAFP?",
        options: [
          "Always — checking is cheaper than setting up a `try` block",
          "When failure is the common case — entering a `try` is nearly free, but raising an exception is expensive",
          "Never — EAFP is faster in every scenario",
          "Only for dictionary access, where `in` is optimised"
        ],
        answer: 1,
        why: "Entering a `try` costs almost nothing in modern CPython, so EAFP wins on the success path. Raising and handling an exception is comparatively expensive, so a loop where most attempts fail — parsing a file where most lines are malformed — is faster with a check. The guidance is about which path is *expected*, not a blanket preference."
      },
      {
        stem: "Why is `hasattr(obj, \"close\")` often better than catching `AttributeError` around `obj.close()`?",
        options: [
          "`hasattr` is faster because it avoids exception machinery",
          "The `except` also catches `AttributeError` raised *inside* `close()`, so a bug in the method is silently swallowed",
          "`AttributeError` cannot be caught reliably for method calls",
          "`hasattr` works on objects that define `__getattr__` and the exception approach does not"
        ],
        answer: 1,
        why: "An exception type tells you what went wrong, not where. If `close()` exists but references a missing attribute internally, the `except AttributeError` treats that as \"no close method\" and does nothing — hiding a real bug. This is the general limit of EAFP: when the same exception can arise from the operation or from inside it, either narrow the `try` or check first."
      },
      {
        stem: "Two concurrent requests both pass `if not db.exists(email)` and create duplicate users. What is the correct fix?",
        options: [
          "An application-level lock around the check and the insert",
          "A unique constraint on the column, and catching the integrity error — only the database can make the check and the write atomic",
          "Retry the check three times before inserting",
          "Increase the transaction isolation level to serialisable"
        ],
        answer: 1,
        why: "An application lock only serialises one process, and there are typically several workers. The database owns the state, so it is the only component that can make checking and writing one atomic operation — a unique constraint plus EAFP on the integrity error. Serialisable isolation can also work but is a heavier, less targeted tool. Retrying the check does not help: the race is between check and write, not within the check."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is EAFP and why does Python prefer it?",
        strong: "Easier to Ask Forgiveness than Permission — attempt the operation and handle the failure, rather than checking first. Python prefers it because a check and the action it guards are two separate operations, so anything about shared state can change in the gap. It is also usually faster, since entering a `try` is nearly free while raising is not.",
        answer: [
          { t: "p", text: "The race argument is what makes this more than a style preference, and it is worth leading with: `if path.exists()` followed by `path.read_text()` can still raise, and adding more checks shrinks the window without closing it." },
          { t: "p", text: "Mentioning that TOCTOU is a recognised vulnerability class — an attacker replacing a checked path with a symlink — shows you understand why the guidance is stronger than taste." },
          { t: "p", text: "Being able to name where LBYL wins is what makes the answer balanced: when failure is the common case, when the attempt is expensive or irreversible, and when you need every validation problem reported at once rather than just the first." }
        ]
      },
      {
        level: "core",
        q: "How large should a `try` block be?",
        strong: "As small as the operation whose failure you understand. One `try` around four operations means a network failure and a missing config key produce the same handler, so the error message cannot name the real cause — and a bug deep inside one call gets treated as a routine failure of another.",
        answer: [
          { t: "p", text: "The concrete consequence is the persuasive part: a broad handler turns a database outage into \"skipped a bad file\", so the job reports a clean run having imported nothing." },
          { t: "p", text: "It connects to exception granularity — catch the narrowest type that means what you think it means. `except Exception` around a loop body is where silent failures come from." },
          { t: "p", text: "Worth adding that some operations should be *outside* the `try` deliberately. Not wrapping a database insert is a decision that says \"this failure is not this file's fault and must stop the batch\"." }
        ]
      },
      {
        level: "advanced",
        q: "A uniqueness check passes for two concurrent requests and duplicates are created. How do you fix it?",
        strong: "Move the check into the component that owns the state. A unique constraint on the column plus catching the integrity error makes the check and the write one atomic operation — which no amount of application-level checking can achieve across several worker processes.",
        answer: [
          { t: "p", text: "The point interviewers are testing is whether you reach for an application lock first. A lock serialises one process, and production usually runs four — so it makes the race rarer and does not remove it." },
          { t: "p", text: "The generalisation is worth stating: whenever state is shared across processes, atomicity has to live where the state lives. In SQL that is a constraint or `INSERT ... ON CONFLICT`; on a filesystem it is opening with `O_EXCL`; in Redis it is `SETNX`." },
          { t: "p", text: "A good closing observation is why it appeared during a campaign: the window was always there, and the traffic simply supplied enough concurrent requests to hit it. Load does not create these bugs, it reveals them — the same point as the mutability lessons earlier in the course." }
        ],
        weak: "Proposing only a retry or a longer check. Neither addresses the gap between checking and writing, which is where the race lives."
      }
    ]
  }
});
