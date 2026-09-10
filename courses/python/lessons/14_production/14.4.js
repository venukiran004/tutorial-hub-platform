/* ============================================================================
   LESSON 14.4 — Code Quality Tooling
   ========================================================================= */
EC.receiveLesson({
  id: "14.4",

  lede: "Every rule a tool can enforce is a rule that does not need a reviewer's attention. **That is the entire argument**: formatting, unused imports and mutable defaults are not worth a human's time, and the time saved goes to the questions only a human can answer — is this the right design, does this handle the case the ticket did not mention.",

  objectives: [
    "Configure ruff to replace an entire linting stack",
    "Adopt mypy on an existing codebase without a rewrite",
    "Use pre-commit so the checks run before CI, not after",
    "Choose which rules to enforce and which to ignore, deliberately",
    "Introduce all of it to a legacy codebase without a 4,000-file diff"
  ],

  prerequisites: ["8.3", "14.1"],

  blocks: [

    { t: "h2", n: "01", text: "One tool where there were six", id: "ruff" },


    { t: "viz",
      title: "Where each tool catches a problem",
      caption: "The further left a fault is caught, the cheaper it is. A formatter settles arguments before review; a type checker catches in seconds what a test would catch in minutes and production in hours.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Quality tools placed along the timeline from editor to production">
  <line x1="40" y1="120" x2="840" y2="120" style="stroke:var(--line)" stroke-width="2"/>
  <g style="fill:var(--good)">
    <circle cx="110" cy="120" r="7"/><circle cx="290" cy="120" r="7"/>
  </g>
  <g style="fill:var(--warn)"><circle cx="470" cy="120" r="7"/><circle cx="650" cy="120" r="7"/></g>
  <circle cx="810" cy="120" r="7" style="fill:var(--crit)"/>

  <text x="70"  y="98" class="s-label" style="fill:var(--good)">editor</text>
  <text x="250" y="98" class="s-label" style="fill:var(--good)">pre-commit</text>
  <text x="430" y="98" class="s-label" style="fill:var(--warn)">CI</text>
  <text x="600" y="98" class="s-label" style="fill:var(--warn)">review</text>
  <text x="770" y="98" class="s-label" style="fill:var(--crit)">production</text>

  <text x="56"  y="152" class="s-sub" style="fill:var(--ink-3)">formatter</text>
  <text x="56"  y="172" class="s-sub" style="fill:var(--ink-3)">linter</text>
  <text x="236" y="152" class="s-sub" style="fill:var(--ink-3)">ruff</text>
  <text x="236" y="172" class="s-sub" style="fill:var(--ink-3)">mypy</text>
  <text x="420" y="152" class="s-sub" style="fill:var(--ink-3)">tests</text>
  <text x="420" y="172" class="s-sub" style="fill:var(--ink-3)">coverage</text>
  <text x="596" y="152" class="s-sub" style="fill:var(--ink-3)">design,</text>
  <text x="596" y="172" class="s-sub" style="fill:var(--ink-3)">intent</text>
  <text x="756" y="152" class="s-sub" style="fill:var(--crit)">everything</text>
  <text x="756" y="172" class="s-sub" style="fill:var(--crit)">missed</text>

  <text x="40" y="212" class="s-sub" style="fill:var(--ink-3)">Every tool left of review is arguing about something a human should not spend attention on.</text>
</svg>`
    },
    { t: "table",
      head: ["Was", "Did", "Now"],
      rows: [
        ["black", "Formatting", "`ruff format`"],
        ["isort", "Import sorting", "ruff, rule `I`"],
        ["flake8 + plugins", "Linting", "ruff, ~800 rules"],
        ["pyupgrade", "Modernising syntax", "ruff, rule `UP`"],
        ["autoflake", "Unused imports", "ruff, rule `F401`"],
        ["bandit", "Security patterns", "ruff, rule `S`"],
        ["mypy", "Type checking", "**Still mypy** — ruff does not type-check"]
      ],
      caption: "**Ruff is 10–100× faster because it is compiled and single-pass.** On a large codebase that is the difference between a pre-commit hook people keep and one they disable with `--no-verify`."
    },

    { t: "code", lang: "toml", title: "a configuration that earns its rules", code: `
[tool.ruff]
line-length = 88
target-version = "py312"
src = ["src", "tests"]          # so first-party imports sort correctly

[tool.ruff.lint]
select = [
    "E", "W",     # pycodestyle
    "F",          # pyflakes -- unused imports, undefined names
    "I",          # isort
    "N",          # pep8-naming
    "UP",         # pyupgrade -- modern syntax for your target version
    "B",          # bugbear -- REAL BUGS, the highest-value set
    "A",          # builtin shadowing: id, list, type
    "C4",         # comprehension simplifications
    "DTZ",        # naive datetimes -- see the trap below
    "T20",        # leftover print statements
    "SIM",        # simplifications
    "PTH",        # pathlib over os.path
    "RUF",        # ruff's own rules
    "S",          # bandit security rules
]

ignore = [
    "E501",       # line length -- the formatter owns this
    "B008",       # function call in a default: FastAPI's Depends()
]

[tool.ruff.lint.per-file-ignores]
# Rules that are correct in application code and wrong in tests.
"tests/**" = [
    "S101",       # assert is the point of a test
    "S105",       # hardcoded passwords in fixtures are fine
    "PLR2004",    # magic numbers are clearer than named constants here
]
"migrations/**" = ["E501", "F401"]

[tool.ruff.lint.flake8-bugbear]
# FastAPI's Depends() and Query() in defaults are idiomatic, not bugs.
extend-immutable-calls = ["fastapi.Depends", "fastapi.Query"]
`,
      hl: [13, 16, 30],
      caption: "**`B` (bugbear) is the set to enable first.** It catches mutable default arguments, `except` clauses that swallow everything, and loop variables captured by closures — genuine bugs rather than style."
    },

    { t: "callout", kind: "insight", title: "The rules that find real bugs", body: [
      { t: "code", lang: "python", title: "each of these has shipped", numbered: false, code: `
# B006 -- a mutable default. The list is created ONCE, at function
# definition, and shared by every call that omits the argument.
def add_item(item, items=[]):      # every call appends to the SAME list
    items.append(item)
    return items

# B902 / B023 -- a loop variable captured by a closure. All the
# callbacks see the LAST value of i, not their own.
handlers = [lambda: print(i) for i in range(3)]     # prints 2, 2, 2

# DTZ003 -- a naive datetime. utcnow() returns a datetime with NO
# tzinfo, so comparing it to an aware one raises, and storing it
# loses the zone (Lesson 13.2).
datetime.utcnow()                  # flagged
datetime.now(tz=UTC)               # correct

# S608 -- SQL built by string formatting. Injection (Lesson 13.3).
cur.execute(f"SELECT * FROM t WHERE id = {user_id}")

# A002 -- shadowing a builtin. Works until something in scope needs
# the real "id" or "type".
def get(id: str, type: str): ...`},
      { t: "p", text: "**These are not style opinions.** Each one is a defect class that has caused production incidents, and each is found in milliseconds by a tool rather than in an afternoon by a person." }
    ]},

    { t: "h2", n: "02", text: "Type checking on a real codebase", id: "mypy" },

    { t: "ladder",
      title: "Introducing mypy to 80,000 lines with no annotations",
      rungs: [
        { level: "bad", label: "strict mode, everywhere, immediately",
          why: "Twelve thousand errors. Nobody reads twelve thousand errors, so the check is disabled \"until we have time\" and never re-enabled. The tool is now a config file nobody runs.",
          code: `[tool.mypy]
strict = true

# $ mypy src/
# Found 12,847 errors in 431 files` },
        { level: "ok", label: "Lenient globally, ratchet over time",
          why: "The build passes on day one, which is what matters. The risk is that leniency is permanent: without a mechanism forcing the ratchet, the settings stay where they were set and nothing improves.",
          code: `[tool.mypy]
ignore_missing_imports = true
check_untyped_defs = true       # check bodies even without annotations

# Then tighten one flag per quarter.` },
        { level: "best", label: "Strict for new code, lenient for old",
          why: "Per-module overrides mean strict is the default and legacy modules are explicitly exempted. The exemption list is visible in one file, shrinks as modules are cleaned, and a new module is strict without anyone deciding.",
          code: `[tool.mypy]
python_version = "3.12"
strict = true                      # the DEFAULT for everything

# The legacy list. Visible, finite, and it only ever shrinks.
[[tool.mypy.overrides]]
module = [
    "app.legacy.reporting",
    "app.legacy.imports",
]
ignore_errors = true

# Third-party packages without stubs.
[[tool.mypy.overrides]]
module = ["untyped_vendor_lib.*"]
ignore_missing_imports = true`,
          note: "**Make the exemption list visible and make removing entries a normal task.** A global lenient setting hides the debt; a list of module names measures it." }
      ]
    },

    { t: "code", lang: "python", title: "what strict mode actually catches", code: `
# A None that flows into an operation that cannot handle it. The
# single most common runtime error in Python, found statically.
def get_user(uid: str) -> User | None: ...

def greet(uid: str) -> str:
    user = get_user(uid)
    return f"Hello {user.name}"     # error: "User | None" has no "name"


# A signature change that missed a call site. Rename a parameter and
# mypy finds every caller; grep finds the ones spelled the same way.
def charge(amount: Decimal, customer: str) -> str: ...
charge(customer="c-1", amount=100)  # error: int is not Decimal


# An unhandled enum member. Add "disputed" to the enum and every
# exhaustive match becomes an error -- which is exactly what you want.
def label(status: Status) -> str:
    match status:
        case Status.PAID: return "Paid"
        case Status.PENDING: return "Pending"
    # error: Missing return statement  <- the new member


# Any spreading silently. --disallow-any-expr is usually too strict,
# but warn_return_any catches the common case:
def parse(raw: str) -> dict:
    return json.loads(raw)          # returns Any; fine
def total(raw: str) -> Decimal:
    return json.loads(raw)["total"] # error: returning Any
`,
      hl: [7, 20, 30],
      caption: "**The exhaustive-match check is the one that pays for itself.** Adding an enum member becomes a compile-time list of every place that needs updating, instead of a runtime surprise in the branch nobody tested."
    },

    { t: "h2", n: "03", text: "pre-commit", id: "pre-commit" },

    { t: "code", lang: "toml", title: ".pre-commit-config.yaml", code: `
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9                    # PINNED. An unpinned rev means the
    hooks:                         # hook changes under you, and a
      - id: ruff                   # colleague gets different results
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: check-merge-conflict
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
      # Catches the 200MB CSV someone commits by accident.
      - id: check-added-large-files
        args: [--maxkb=500]
      # Prevents committing to main directly.
      - id: no-commit-to-branch
        args: [--branch, main]

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.0
    hooks:
      - id: gitleaks               # secrets, before they reach history

  # mypy LOCALLY, not from a hook repo: the hook repo's environment
  # does not have your dependencies, so it cannot resolve your imports
  # and reports hundreds of false positives.
  - repo: local
    hooks:
      - id: mypy
        name: mypy
        entry: mypy
        language: system
        types: [python]
        require_serial: true
`,
      hl: [3, 24, 28],
      caption: "**Run the same commands in CI.** A hook people can skip with `--no-verify` is a convenience; CI is the gate. If they disagree, engineers stop trusting the hook."
    },

    { t: "callout", kind: "trap", title: "Why teams abandon pre-commit", body: [
      { t: "code", lang: "bash", title: "four reasons, and the fixes", numbered: false, code: `
# 1. IT IS SLOW. A hook taking 30 seconds is bypassed within a week.
#    Hooks run only on CHANGED files by default -- keep it that way,
#    and never add a full test run.

# 2. IT REFORMATS AND FAILS THE COMMIT, leaving changes unstaged.
#    Confusing the first time. Tell people the workflow:
git commit -m "..."         # hook reformats, commit ABORTS
git add -u && git commit -m "..."   # now it passes

# 3. IT DISAGREES WITH CI. Different versions, different results, and
#    nobody knows which is authoritative. Pin the same versions and
#    run the SAME command:
#      CI:   pre-commit run --all-files
#      local: pre-commit run

# 4. IT WAS INSTALLED ON ONE MACHINE. Someone clones and never runs
#    "pre-commit install", so their commits skip everything. Put it in
#    the setup script AND enforce in CI -- the hook is a fast local
#    signal, never the guarantee.`},
      { t: "p", text: "**The hook is an optimisation; CI is the contract.** Treating the hook as the enforcement point means anyone who has not installed it, or who passes `--no-verify`, is exempt." }
    ]},

    { t: "h2", n: "04", text: "Adopting on a legacy codebase", id: "legacy" },

    { t: "code", lang: "bash", title: "the sequence that does not produce a 4,000-file diff", code: `
# STEP 1 -- format everything, in ONE commit that does nothing else.
ruff format .
git commit -m "Format with ruff (no functional changes)"

# Record it so "git blame" skips past it. Without this, every line in
# the codebase blames the formatting commit and history is destroyed.
git rev-parse HEAD >> .git-blame-ignore-revs
git config blame.ignoreRevsFile .git-blame-ignore-revs
# GitHub reads .git-blame-ignore-revs automatically once committed.


# STEP 2 -- lint with a small rule set, fix everything, commit.
#   select = ["F", "E9"]        # undefined names and syntax errors only
#   These are unambiguous bugs. Nobody argues about them.


# STEP 3 -- add rules one group at a time, each its own commit.
#   + "I"   import sorting     (auto-fixable)
#   + "UP"  modern syntax      (auto-fixable)
#   + "B"   bugbear            (REAL BUGS -- read every fix)
#   + "SIM" simplifications    (mostly auto-fixable)
#
# Auto-fixable rules are cheap; the ones needing judgement come last
# and get proper review.


# STEP 4 -- baseline what you cannot fix now.
ruff check --add-noqa .        # adds "# noqa: RULE" to every existing
                               # violation
# The build is green immediately, new code is checked, and the noqa
# count is a number that can be tracked down. Grep it in CI:
#   git grep -c "noqa" | awk -F: '{s+=$2} END {print s}'


# STEP 5 -- mypy, strict by default with a shrinking exemption list.
`,
      hl: [6, 22, 27],
      caption: "**`.git-blame-ignore-revs` is the step people skip.** Without it, a formatting commit makes `git blame` useless for the entire codebase — and blame is the main tool for understanding why code is the way it is."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Set up quality tooling for a legacy service",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A 60,000-line service, six years old, no linting, no type checking, no formatting standard. Four engineers, and code review is dominated by style comments. You have one week." },
        { t: "code", lang: "python", numbered: false, title: "a representative file", code: `
import os, sys, json
from datetime import datetime
from app.models import *

def process(items=[], config=None):
    if config == None:
        config = {}
    results = []
    for i in range(len(items)):
        item = items[i]
        if item['status'] == 'active':
            try:
                results.append({
                    'id': item['id'],
                    'processed_at': datetime.utcnow(),
                    'path': os.path.join('/data', item['id'])
                })
            except:
                pass
    print(f"Processed {len(results)}")
    return results`},
        { t: "p", text: "Give the adoption plan and the configuration. Also list every defect a linter would flag in that file, and say which are bugs rather than style." }
      ],
      requirements: [
        "List every issue in the file, marking each as bug or style.",
        "Give the day-by-day plan for the week.",
        "Provide the ruff and mypy configuration.",
        "Explain how to avoid destroying `git blame`.",
        "Say how you would handle 3,000 pre-existing violations.",
        "Give the corrected version of the function."
      ],
      hint: "Two of the defects cause wrong behaviour that no test would catch, and one of them only appears on the second call.",
      solution: {
        lang: "python",
        title: "app/processing.py",
        code: `# =========================================================================
# EVERY DEFECT IN THAT FILE
# =========================================================================
#
# ---- BUGS (wrong behaviour, not style) ----------------------------
#
# B006  items=[] -- A MUTABLE DEFAULT.
#       The list is created ONCE, when the function is defined, and
#       shared by every call that omits the argument. Since the
#       function appends to "results" rather than "items" it is not
#       currently exploited -- but the moment anyone appends to items,
#       state leaks between calls, and the bug appears on the SECOND
#       call only. Untraceable from a stack trace.
#
# E722  bare "except:" -- CATCHES EVERYTHING, including
#       KeyboardInterrupt, SystemExit and MemoryError. Combined with
#       "pass", every failure is silent: a malformed item is skipped
#       with no log, no metric and no way to know it happened. THIS IS
#       THE WORST LINE IN THE FILE.
#
# DTZ003 datetime.utcnow() -- a NAIVE datetime. No tzinfo, so
#       comparing it against an aware datetime raises TypeError, and
#       storing it in a TIMESTAMPTZ column silently reinterprets it in
#       the server's local zone (Lesson 13.2). Wrong data, no error.
#
# E711  "config == None" -- compares by VALUE. A class overriding
#       __eq__ can be equal to None; "is None" is an identity check
#       and cannot be fooled.
#
# F403  "from app.models import *" -- SHADOWING. Any name in
#       app.models silently overwrites one here, so an unrelated
#       change in that module can break this file. It also defeats
#       every tool: neither ruff nor mypy can tell whether a name is
#       defined.
#
# ---- STYLE / CLARITY ----------------------------------------------
#
# E401  "import os, sys, json" on one line.
# F401  "sys" and "json" are imported and never used.
# C0200 "for i in range(len(items))" -- index arithmetic where
#       iteration would do. Not a bug here, but it is how off-by-one
#       errors are written.
# T201  a bare print() instead of a logger: no level, no structure,
#       no destination control (Lesson 14.3).
# PTH118 os.path.join -- pathlib is the current idiom.
# ANN   no type annotations anywhere, so mypy can check nothing.
# S     the dict access item['status'] raises KeyError on a malformed
#       item -- which is precisely what the bare except is hiding.
#
# Of these, FIVE are bugs. A linter finds all five in under a second.


# =========================================================================
# THE WEEK
# =========================================================================
#
# --- DAY 1: formatting. One commit, nothing else in it. ------------
#
#   ruff format .
#   git commit -m "Format with ruff (no functional changes)"
#   git rev-parse HEAD >> .git-blame-ignore-revs
#   git add .git-blame-ignore-revs
#   git commit -m "Add formatting commit to blame ignore list"
#   git config blame.ignoreRevsFile .git-blame-ignore-revs
#
# THE BLAME STEP IS NOT OPTIONAL. Without it every line in 60,000
# lines blames the formatting commit, and "git blame" -- the main
# tool for understanding why code is the way it is -- is destroyed
# for six years of history. GitHub reads the file automatically once
# it is committed.
#
# Announce it: everyone rebases their branches the same day, or they
# get 60,000-line conflicts.
#
#
# --- DAY 2: the unambiguous rules. -------------------------------
#
#   select = ["F", "E9"]     # undefined names, syntax errors
#
# Nobody argues about these; they are bugs. Fix them all, one commit
# per logical group. Expect a handful of genuine finds -- F821
# (undefined name) in an error path that has never executed is the
# classic.
#
#
# --- DAY 3: auto-fixable rules, one commit per group. -------------
#
#   + "I"    import sorting        ruff check --fix
#   + "UP"   modern syntax         ruff check --fix
#   + "C4"   comprehensions        ruff check --fix
#   + "PTH"  pathlib               review these: os.path -> Path is
#                                  mechanical but changes types
#
# Separate commits so a bad auto-fix can be reverted alone.
#
#
# --- DAY 4: the rules that find bugs. READ EVERY FIX. -------------
#
#   + "B"    bugbear      mutable defaults, bare excepts
#   + "DTZ"  naive datetimes
#   + "S"    security patterns
#   + "SIM"  simplifications
#
# These are NOT blanket auto-fix. A bare except becoming
# "except Exception" changes behaviour, and a mutable default becoming
# None may reveal that callers depended on the shared list. Review
# each one, and expect this day to find real bugs.
#
#
# --- DAY 5: baseline, mypy, CI, pre-commit. -----------------------
#
#   ruff check --add-noqa .     # ~3,000 remaining violations
#   git commit -m "Baseline existing lint violations"
#
# The build is green, NEW code is fully checked, and the noqa count
# is a number that goes down. Track it in CI so it cannot go up:
#
#   COUNT=$(git grep -c "noqa" -- '*.py' | awk -F: '{s+=$2} END {print s+0}')
#   test "$COUNT" -le "$(cat .noqa-budget)" || {
#       echo "noqa count rose to $COUNT"; exit 1; }
#
# Then mypy strict with an exemption list, pre-commit, and the same
# commands wired into CI.


# =========================================================================
# CONFIGURATION
# =========================================================================
#
# [tool.ruff]
# line-length = 88
# target-version = "py312"
# src = ["src", "tests"]
#
# [tool.ruff.lint]
# select = ["E", "W", "F", "I", "N", "UP", "B", "A", "C4",
#           "DTZ", "T20", "SIM", "PTH", "RUF", "S"]
# ignore = [
#     "E501",    # the formatter owns line length
#     "B008",    # FastAPI Depends() in a default is idiomatic
# ]
#
# [tool.ruff.lint.per-file-ignores]
# "tests/**"      = ["S101", "S105", "PLR2004"]
# "migrations/**" = ["E501", "F401"]
#
# [tool.mypy]
# python_version = "3.12"
# strict = true                     # the DEFAULT
# warn_unused_ignores = true        # so stale ignores get removed
# plugins = ["pydantic.mypy"]
#
# [[tool.mypy.overrides]]           # the shrinking legacy list
# module = ["app.legacy.*", "app.reporting.*"]
# ignore_errors = true
#
# [[tool.mypy.overrides]]
# module = ["untyped_vendor.*"]
# ignore_missing_imports = true


# =========================================================================
# THE CORRECTED FUNCTION
# =========================================================================

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.models import Item          # EXPLICIT, not a star import

logger = logging.getLogger(__name__)

DATA_ROOT = Path("/data")


@dataclass(frozen=True)
class ProcessedItem:
    """A typed result. A dict of str -> Any tells mypy nothing, and
    tells the next reader nothing either."""
    id: str
    processed_at: datetime
    path: Path


def process(
    items: Sequence[Item],           # required: no mutable default, and
                                     # no reason for one -- processing
                                     # nothing is a caller's decision
    config: dict[str, Any] | None = None,
) -> list[ProcessedItem]:
    """Process active items, reporting what could not be handled.

    Malformed items are skipped and LOGGED. The original swallowed
    them silently, so a bad upstream feed looked like a quiet day.
    """
    config = config or {}            # "or" handles None and {} alike;
                                     # use "is None" if {} must be distinct
    results: list[ProcessedItem] = []
    failures = 0

    for item in items:               # iterate directly, no index
        if item.status != "active":
            continue

        try:
            results.append(
                ProcessedItem(
                    id=item.id,
                    # AWARE datetime. Comparable, storable, correct.
                    processed_at=datetime.now(tz=UTC),
                    path=DATA_ROOT / item.id,
                )
            )
        except (KeyError, AttributeError, ValueError) as exc:
            # SPECIFIC exceptions, and the failure is visible. A bare
            # except would also swallow KeyboardInterrupt and
            # MemoryError.
            failures += 1
            logger.warning(
                "item_processing_failed",
                extra={"item_id": getattr(item, "id", None),
                       "error": str(exc)},
            )

    # A structured summary, not print(). One line per call, not one
    # per item (Lesson 14.3).
    logger.info("items_processed",
                extra={"processed": len(results), "failed": failures})

    return results


# =========================================================================
# TESTS
# =========================================================================

def test_a_malformed_item_is_logged_not_swallowed(caplog):
    """The bare-except bug. Silence is the defect."""
    results = process([valid_item(), malformed_item()])

    assert len(results) == 1
    assert "item_processing_failed" in caplog.text


def test_timestamps_are_timezone_aware():
    """DTZ003. A naive datetime is silently reinterpreted on write."""
    result = process([valid_item()])[0]

    assert result.processed_at.tzinfo is not None


def test_repeated_calls_do_not_share_state():
    """B006, pinned. The failure only ever appeared on the second
    call, which is why it survived six years."""
    first = process([valid_item()])
    second = process([valid_item()])

    assert len(first) == len(second) == 1


def test_the_lint_baseline_does_not_grow():
    """The ratchet. Without it, the baseline is permanent."""
    count = sum(
        len([l for l in p.read_text().splitlines() if "noqa" in l])
        for p in Path("src").rglob("*.py")
    )
    budget = int(Path(".noqa-budget").read_text())

    assert count <= budget, f"noqa count rose to {count} (budget {budget})"`,
        notes: [
          { t: "p", text: "**The bare `except: pass` is the worst line in the file.** It catches `KeyboardInterrupt`, `SystemExit` and `MemoryError` alongside the error it meant to handle, and `pass` means a malformed upstream feed looks exactly like a quiet day — no log, no metric, no signal at all." },
          { t: "p", text: "**The mutable default only fails on the second call.** That is what makes it survive six years: every test that calls the function once passes, and the failure has no stack trace pointing anywhere useful." },
          { t: "callout", kind: "insight", title: "The blame-ignore step is the one people skip", body: [
            { t: "p", text: "A formatting commit touching 60,000 lines makes `git blame` attribute every line to it, destroying six years of history — and blame is the main tool for answering \"why is this code like this?\"" },
            { t: "p", text: "`.git-blame-ignore-revs` costs two commands and GitHub reads it automatically. It must be done on the same day as the format commit, along with telling everyone to rebase, or people get 60,000-line conflicts." }
          ]},
          { t: "p", text: "**`datetime.utcnow()` is wrong rather than merely dated.** It returns a naive datetime, so comparing it to an aware one raises and storing it in a `TIMESTAMPTZ` column reinterprets it in the server's zone — bad data with no error anywhere." },
          { t: "p", text: "**`--add-noqa` is how you get a green build on day five.** The baseline is explicit, per-line and countable, so new code is fully checked while the debt is measured — and the CI budget check is what stops the baseline being permanent." },
          { t: "p", text: "**Day four is not a blanket auto-fix.** Changing a bare except to `except Exception` alters behaviour, and removing a mutable default may reveal callers that depended on the shared list. That day should find real bugs and deserves real review." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team spent two years arguing about formatting in code review. Every pull request collected comments about line breaks, quote style and import order, and the substantive questions went unasked." },
      { t: "p", text: "**They adopted a formatter in an afternoon.** The argument ended immediately — not because anyone was persuaded, but because the tool's output is not a person's opinion and there is nothing to disagree with." },
      { t: "p", text: "**Review comments dropped by roughly two thirds, and the remaining third got better.** Reviewers who no longer had a style checklist to work through started asking whether the approach was right." },
      { t: "p", text: "**The value of a formatter is not the formatting.** It is removing a category of discussion from human attention entirely, and that is the argument for every rule a tool can enforce." }
    ]}
  ],

  takeaways: [
    "**Every rule a tool enforces is one that does not need a reviewer's attention**, and that attention is the scarce resource.",
    "**Ruff replaces black, isort, flake8, pyupgrade, autoflake and bandit** at 10–100× the speed — which is what makes a pre-commit hook survive.",
    "**Enable bugbear (`B`) first.** Mutable defaults, bare excepts and captured loop variables are defects, not style.",
    "**`DTZ` catches naive datetimes**, which are silently reinterpreted when stored in a `TIMESTAMPTZ` column.",
    "**Ruff does not type-check.** You still need mypy, and they answer different questions.",
    "**Adopt mypy strict by default with a visible exemption list**, not globally lenient — a list of module names measures the debt where a flag hides it.",
    "**The exhaustive-match check pays for itself**: adding an enum member becomes a compile-time list of everywhere that needs updating.",
    "**Run mypy from a local pre-commit hook**, because a hook repo's environment lacks your dependencies and reports false positives.",
    "**The hook is an optimisation; CI is the contract.** Anyone without it installed, or passing `--no-verify`, is otherwise exempt.",
    "**Format in one commit that does nothing else**, and add it to `.git-blame-ignore-revs` the same day.",
    "**Add rules one group at a time**, auto-fixable first, judgement-requiring last and reviewed properly.",
    "**Use `ruff check --add-noqa` to baseline a legacy codebase**, then track the count in CI so it can only go down.",
    "**Per-file ignores matter**: `assert` is the point of a test, and magic numbers are clearer than named constants in one."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`def process(items=[])` — why is this a bug rather than a style issue?",
        options: [
          "Lists are slower than tuples as defaults",
          "The list is created once at function definition and shared by every call that omits the argument, so state leaks between calls",
          "It prevents type checking",
          "Python raises a warning at runtime"
        ],
        answer: 1,
        why: "The default is evaluated once, when the `def` executes. The failure appears only on the second call, which is why it survives in codebases for years — every test that calls the function once passes, and the resulting stack trace points nowhere useful."
      },
      {
        stem: "You run a formatter over a 60,000-line codebase. What must you do the same day?",
        options: [
          "Tag a release",
          "Record the commit hash in `.git-blame-ignore-revs`, or every line in the codebase blames the formatting commit and history becomes useless",
          "Squash the commit into the previous one",
          "Disable the formatter for existing files"
        ],
        answer: 1,
        why: "`git blame` is the main tool for understanding why code is the way it is, and a bulk-formatting commit destroys it for the whole repository. GitHub reads the file automatically once committed. Everyone also needs to rebase that day, or they face 60,000-line conflicts."
      },
      {
        stem: "How should mypy be introduced to a large untyped codebase?",
        options: [
          "Strict mode everywhere, fixing errors over several sprints",
          "Strict by default with an explicit per-module exemption list for legacy code, so new modules are checked automatically and the list only shrinks",
          "Globally lenient settings, tightened later",
          "Only in CI, never locally"
        ],
        answer: 1,
        why: "Strict everywhere produces thousands of errors that nobody reads, and the check gets disabled permanently. Globally lenient settings hide the debt with no mechanism forcing improvement; a visible list of exempted module names measures it and makes removing entries a normal task."
      },
      {
        stem: "Why run mypy as a `local` pre-commit hook rather than from the hook repository?",
        options: [
          "It is faster",
          "The hook repository's isolated environment lacks your project's dependencies, so mypy cannot resolve imports and reports hundreds of false positives",
          "Local hooks can modify files",
          "The published hook is unmaintained"
        ],
        answer: 1,
        why: "pre-commit creates an isolated environment per hook repository. Type checking needs your actual installed dependencies to resolve third-party types, so `language: system` with the project's environment is the only configuration that produces meaningful results."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What tooling would you set up on a new Python project?",
        strong: "Ruff for formatting and linting with bugbear enabled, mypy in strict mode, pre-commit running both on changed files, and the same commands in CI as the actual gate.",
        answer: [
          { t: "p", text: "Framing it as removing categories of discussion from review is the argument, rather than listing tools." },
          { t: "p", text: "Naming bugbear specifically shows you distinguish rules that find defects from rules that enforce taste." },
          { t: "p", text: "The hook-versus-CI distinction matters: treating the hook as the gate exempts anyone who has not installed it." }
        ]
      },
      {
        level: "advanced",
        q: "How would you introduce type checking to a large legacy codebase?",
        strong: "Strict by default, with an explicit exemption list of legacy modules. New code is checked automatically, the list is visible in one file, and removing entries becomes a normal piece of work.",
        answer: [
          { t: "p", text: "Explaining why strict-everywhere fails — nobody reads twelve thousand errors, so the check gets disabled — shows you have attempted it." },
          { t: "p", text: "The distinction between a lenient flag and a visible list is the substance: one hides the debt, the other measures it." },
          { t: "p", text: "Adding a CI budget that can only decrease turns the intention into a mechanism, which is what makes the ratchet real." }
        ]
      },
      {
        level: "core",
        q: "Ruff or mypy?",
        strong: "Both — they answer different questions. Ruff finds patterns and style in a single fast pass; mypy tracks types across function boundaries and finds the `None` that flows somewhere it cannot be handled.",
        answer: [
          { t: "p", text: "Knowing that ruff does not type-check is the basic distinction, and getting it wrong is a common slip." },
          { t: "p", text: "Naming the exhaustive-match check as mypy's highest-value catch shows you have used it on something real." },
          { t: "p", text: "Noting that ruff subsumes six previous tools is worth mentioning, since it changes what a reasonable stack looks like." }
        ]
      }
    ]
  }
});
