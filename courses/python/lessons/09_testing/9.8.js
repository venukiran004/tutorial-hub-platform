/* ============================================================================
   LESSON 9.8 — Coverage and Testing in CI
   ========================================================================= */
EC.receiveLesson({
  id: "9.8",

  lede: "Coverage measures which lines ran, not whether anything was verified — a suite that mocks everything and asserts nothing reaches 95%. That makes it a **useful map and a terrible target**. The job of CI is different and simpler: make the suite's verdict arrive fast, on every push, and mean something when it is red.",

  objectives: [
    "Read a coverage report for what it can and cannot tell you",
    "Configure branch coverage and exclude what genuinely should not count",
    "Set a gate that catches regressions without becoming theatre",
    "Write a CI workflow with caching, a matrix and useful failure output",
    "Apply a flaky-test policy that neither ignores nor tolerates them"
  ],

  prerequisites: ["9.7", "7.6"],

  blocks: [

    { t: "h2", n: "01", text: "What coverage measures", id: "what" },


    { t: "viz",
      title: "What coverage does and does not tell you",
      caption: "Coverage measures which lines ran, not whether anything was checked. A test with no assertion still counts every line it touched, which is why 100% coverage and a working test suite are different achievements.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Line coverage compared with branch coverage and assertion quality">
  <g style="stroke-width:2">
    <rect x="24"  y="46" width="260" height="130" rx="8" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
    <rect x="310" y="46" width="260" height="130" rx="8" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
    <rect x="596" y="46" width="260" height="130" rx="8" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
  </g>
  <text x="44"  y="74" class="s-label" style="fill:var(--good)">LINE COVERAGE</text>
  <text x="330" y="74" class="s-label" style="fill:var(--warn)">BRANCH COVERAGE</text>
  <text x="616" y="74" class="s-label" style="fill:var(--crit)">NOT MEASURED</text>

  <text x="44"  y="104" class="s-sub" style="fill:var(--ink-2)">did this line execute?</text>
  <text x="330" y="104" class="s-sub" style="fill:var(--ink-2)">did both sides of the if run?</text>
  <text x="616" y="104" class="s-sub" style="fill:var(--ink-2)">did anything assert?</text>

  <text x="44"  y="140" class="s-sub" style="fill:var(--ink-3)">easy to reach 100%</text>
  <text x="330" y="140" class="s-sub" style="fill:var(--ink-3)">catches the untested else</text>
  <text x="616" y="140" class="s-sub" style="fill:var(--crit)">no tool reports this</text>
  <text x="616" y="162" class="s-sub" style="fill:var(--crit)">only review does</text>

  <text x="24" y="212" class="s-sub" style="fill:var(--ink-3)">Use branch coverage, set the gate where the team will keep it, and treat a sudden jump as a signal to read the diff.</text>
  <text x="24" y="232" class="s-sub" style="fill:var(--ink-3)">A ratchet that only ever rises is more useful than a fixed threshold nobody can reach.</text>
</svg>`
    },
    { t: "code", lang: "python", title: "95% coverage, zero verification", code: `
def apply_discount(total, tier):
    if tier == "gold":
        return total * Decimal("0.8")
    if tier == "silver":
        return total * Decimal("0.9")
    return total


# This test covers every line of it.
def test_apply_discount():
    apply_discount(Decimal("100"), "gold")
    apply_discount(Decimal("100"), "silver")
    apply_discount(Decimal("100"), "bronze")
    # ... and asserts nothing at all
`,
      out: `Name         Stmts   Miss  Cover
--------------------------------
pricing.py       6      0   100%`,
      caption: "**100% coverage on a function whose output is never checked.** Coverage answers \"did this line execute\", which is a necessary condition for a test to catch a bug and nowhere near sufficient."
    },

    { t: "table",
      head: ["Coverage tells you", "Coverage does not tell you"],
      rows: [
        ["This line never ran in any test", "Whether the assertion checked anything"],
        ["This branch was never taken", "Whether the *right* thing was asserted"],
        ["This module is entirely untested", "Whether the edge cases were covered"],
        ["A new file arrived with no tests", "Whether the test would fail if the code broke"],
        ["Coverage dropped in this change", "Whether the tests are worth keeping"]
      ],
      caption: "**Read the left column as a to-do list and ignore the number.** \"`billing/refunds.py` is at 12%\" is actionable; \"the project is at 87.3%\" is not."
    },

    { t: "callout", kind: "insight", title: "Branch coverage is the setting that earns its keep", body: [
      { t: "code", lang: "python", title: "line coverage says 100%; the bug is live", numbered: false, code: `
def notify(user, order):
    message = build_message(order)
    if user.email:
        send_email(user.email, message)
    return message


def test_notify():
    notify(User(email="a@b.test"), order)     # every LINE executes`},
      { t: "p", text: "The `if` is never taken in its false direction, so the path where a user has no email — and `send_email` is skipped — is untested. Line coverage reports 100% because every line ran; branch coverage reports the missing edge." },
      { t: "code", lang: "toml", title: "turn it on", numbered: false, code: `
[tool.coverage.run]
branch = true
source = ["src"]`,
        out: `Name         Stmts   Miss Branch BrPart  Cover
---------------------------------------------
notify.py        4      0      2      1    83%`},
      { t: "p", text: "**`branch = true` is one line and finds a genuinely different class of gap.** It is the single highest-value coverage setting there is." }
    ]},

    { t: "h2", n: "02", text: "Configuring it honestly", id: "config" },

    { t: "code", lang: "toml", title: "pyproject.toml", code: `
[tool.coverage.run]
branch = true
source = ["src"]
# Without this, a subprocess or an xdist worker reports nothing and the
# number silently drops — which people then "fix" by lowering the gate.
parallel = true
concurrency = ["thread", "multiprocessing"]
omit = [
  "*/migrations/*",          # generated, and asserted by running them
  "*/__main__.py",           # two lines that call main()
]

[tool.coverage.report]
show_missing = true
skip_covered = true          # a 400-line report nobody reads is not a report
fail_under = 85
exclude_also = [
  "if TYPE_CHECKING:",              # never executes at runtime by design
  "raise NotImplementedError",      # an abstract method's body
  "if __name__ == .__main__.:",
  "class .*\\\\bProtocol\\\\):",       # structural types have no bodies
  "@(abc\\\\.)?abstractmethod",
  "def __repr__",                   # arguable — see the trade-off below
]

[tool.coverage.paths]
# Maps the installed package back to src/ so a coverage run inside a
# container matches the paths in a local report (Lesson 7.7).
source = ["src/", "*/site-packages/"]
`,
      hl: [6, 7, 15],
      caption: "**`parallel = true` is the one people miss.** Run under `pytest-xdist` without it and each worker overwrites the last file, so coverage collapses to whatever the final worker happened to run."
    },

    { t: "callout", kind: "tradeoff", title: "What to exclude, and what excluding really costs", body: [
      { t: "table",
        head: ["Exclusion", "Verdict", "Why"],
        rows: [
          ["`if TYPE_CHECKING:`", "**Right**", "It cannot execute at runtime; counting it is a measurement error (Lesson 8.3)"],
          ["`@abstractmethod` bodies", "**Right**", "There is nothing to run"],
          ["Migrations", "Usually right", "Generated, and covered by applying them in an integration test"],
          ["`def __repr__`", "Defensible", "Rarely load-bearing — but a `repr` leaking a secret is a real bug (Lesson 6.4)"],
          ["`except ImportError:` fallbacks", "Defensible", "Only reachable on another platform"],
          ["`# pragma: no cover` on a hard-to-test branch", "**Suspicious**", "Usually marks the code most worth testing"],
          ["A whole module", "**Wrong**", "That is where the untested code hides"]
        ]
      },
      { t: "p", text: "**Every exclusion raises the number without changing the risk.** That is fine when the line genuinely cannot execute, and self-deception when it is merely awkward — and the awkward branch is disproportionately where bugs live (Lesson 9.6)." },
      { t: "p", text: "Grep for `pragma: no cover` occasionally. A codebase that accumulates them is one whose coverage number has quietly stopped meaning anything." }
    ]},

    { t: "h2", n: "03", text: "A gate that is not theatre", id: "gate" },

    { t: "ladder",
      title: "Enforcing coverage",
      rungs: [
        { level: "bad", label: "A single project-wide percentage",
          why: "It fails on unrelated changes, so people learn to lower it. And it says nothing about the change in front of them: a pull request adding 300 untested lines can *raise* the total if the project is large enough.",
          code: `# CI
pytest --cov=src --cov-fail-under=85

# Six months later, after three "just this once" edits:
pytest --cov=src --cov-fail-under=71` },
        { level: "ok", label: "A ratchet — never go down",
          why: "Stops the slow decline without demanding a number nobody agreed to. Still project-wide, so it cannot see that the new code is the untested part, and a large refactor produces noise.",
          code: `# Store the current figure and compare
coverage report --format=total > .coverage-baseline
# in CI
CURRENT=$(coverage report --format=total)
BASE=$(cat .coverage-baseline)
[ "$CURRENT" -ge "$BASE" ] || exit 1` },
        { level: "best", label: "Gate the diff, report the whole",
          why: "The question that matters is whether *this change* is tested. Diff coverage puts the requirement where the author can act on it, while the project figure stays visible as a trend rather than a tripwire.",
          code: `# .github/workflows/ci.yml
- run: pytest --cov=src --cov-report=xml --cov-report=term-missing

- name: Coverage on changed lines
  run: |
    pip install diff-cover
    git fetch --no-tags origin "\${{ github.base_ref }}"
    diff-cover coverage.xml \\
      --compare-branch "origin/\${{ github.base_ref }}" \\
      --fail-under 90 \\
      --markdown-report diff-cover.md

- name: Post the report
  if: always()
  run: cat diff-cover.md >> "$GITHUB_STEP_SUMMARY"`,
          note: "90% on the diff is a demanding number that people accept, because it applies to code they just wrote. 90% project-wide is a number people negotiate down." }
      ]
    },

    { t: "h2", n: "04", text: "The workflow", id: "workflow" },

    { t: "code", lang: "yaml", title: ".github/workflows/ci.yml", code: `
name: ci

on:
  push:
    branches: [main]
  pull_request:

# A new push supersedes the old run: no point paying for a build of a
# commit nobody will merge.
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15          # a hung test must not burn an hour

    strategy:
      fail-fast: false           # show ALL failing versions, not the first
      matrix:
        python: ["3.11", "3.12", "3.13"]

    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }          # diff-cover needs history

      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true
          cache-dependency-glob: uv.lock

      - run: uv python install \${{ matrix.python }}

      # --frozen: fail if uv.lock is stale rather than silently
      # re-resolving, so CI installs exactly what was reviewed.
      - run: uv sync --frozen --all-extras

      - name: Lint
        run: |
          uv run ruff check --output-format=github .
          uv run ruff format --check .

      - name: Types
        run: uv run mypy src

      - name: Test
        run: uv run pytest -m '' --cov=src --cov-report=xml
             --junitxml=results.xml -n auto

      - name: Publish the failure summary
        if: always()
        uses: pmeier/pytest-results-action@main
        with: { path: results.xml }

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: results-\${{ matrix.python }}
          path: |
            results.xml
            coverage.xml
`,
      hl: [10, 11, 12, 18, 22, 40],
      caption: "**`fail-fast: false` on the matrix is deliberate.** The default cancels the other versions on the first failure, so \"it broke on 3.13\" hides that it also broke on 3.11 — and you fix it twice."
    },

    { t: "callout", kind: "insight", title: "The order of the steps is a design decision", body: [
      { t: "ol", items: [
        "**Lint and format** — seconds, and catches the largest share of review comments before a human reads the diff.",
        "**Type check** — tens of seconds, and finds a class of bug tests do not (Lesson 8.3).",
        "**Unit tests** — the fast majority.",
        "**Integration tests** — containers and real dependencies (Lesson 9.7).",
        "**Coverage report** — a comment, not a wall."
      ]},
      { t: "p", text: "**Cheapest and most specific first.** A formatting failure arriving in ten seconds is useful; the same failure after an eleven-minute integration run has already wasted the loop." },
      { t: "p", text: "The counter-argument is that a developer wants *all* the failures at once rather than one at a time. That is what `--output-format=github` annotations and the uploaded results are for: fail fast, but report everything you did manage to run." }
    ]},

    { t: "h2", n: "05", text: "Flaky tests", id: "flaky" },

    {"kind": "steps", "title": "Handling a flaky test", "caption": "A test that passes on retry is measuring something outside the code: time, ordering, shared state or the network. Quarantine it, find the dependency, remove it — never just add a retry.", "items": [{"label": "Quarantine", "desc": "mark it, keep the suite green, keep it running", "tone": "warn"}, {"label": "Find the hidden input", "desc": "clock, random seed, test order, shared fixture, real network", "tone": "accent"}, {"label": "Make the input explicit", "desc": "freeze time, seed, isolate state, stub the network", "tone": "good"}, {"label": "Un-quarantine or delete", "desc": "a test nobody trusts is worse than no test", "tone": "crit"}], "t": "diagram", "id": "dg-9_8-05-0"},


    { t: "callout", kind: "trap", title: "A retry plugin is not a policy", body: [
      { t: "p", text: "`pytest-rerunfailures` makes the build green. It does not make the test deterministic, and a flaky test is usually a **real race in the code** rather than a defect in the test — so what you have muted is a production bug that reproduces once in fifty." },
      { t: "table",
        head: ["Cause", "Typical tell", "Fix"],
        rows: [
          ["Shared state between tests", "Passes alone, fails in a suite", "Function-scoped fixtures; run with `pytest-randomly` (Lesson 9.3)"],
          ["Time", "Fails around midnight, or on the last day of a month", "Inject the clock (Lesson 9.6)"],
          ["Ordering", "Depends on dict or filesystem order", "Sort before asserting (Lesson 5.10)"],
          ["A real race", "Fails under `-n auto`, passes serially", "Fix the race — this is a production bug"],
          ["Network", "Fails when a third party is slow", "Stub the transport (Lesson 9.7)"],
          ["Resource leak", "Fails only late in a long run", "Find the unclosed handle (Lesson 8.1)"]
        ]
      },
      { t: "code", lang: "python", title: "a policy that neither ignores nor tolerates", numbered: false, code: `
# 1. Quarantine, visibly and with an expiry
@pytest.mark.flaky(reason="ISSUE-2231 — race in the cache warmer",
                   expires="2026-11-01")
def test_cache_warms_before_first_request(): ...

# 2. CI runs quarantined tests, but does not fail on them
#    pytest -m 'not flaky'                      the gate
#    pytest -m flaky || true                    reported, not blocking

# 3. A test asserts the quarantine list is shrinking
def test_no_expired_quarantines():
    """A quarantine with no expiry is a deletion nobody admitted to."""
    for item in collect_flaky_markers():
        assert item.expires > date.today(), f"{item.name} expired"`},
      { t: "p", text: "**The expiry is what stops quarantine becoming a graveyard.** Without it, \"we'll fix it next sprint\" is how a suite ends up with forty muted tests and no one able to say which failures are real." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a CI pipeline everyone has learned to ignore",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "This pipeline is green. It takes 22 minutes, the coverage gate has been lowered three times, and the team re-runs failed builds as a reflex. Find every reason it stopped being useful and rebuild it." },
        { t: "code", lang: "yaml", title: ".github/workflows/ci.yml — as found", numbered: false, code: `
name: ci
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python: ["3.9", "3.10", "3.11", "3.12", "3.13"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python }}
      - run: pip install -r requirements.txt
      - run: pip install -r requirements-dev.txt
      - run: pytest --cov=src --cov-fail-under=62 -p no:randomly --reruns 3
      - run: ruff check . || true
      - run: mypy src || true`},
        { t: "p", text: "There are at least nine problems. The coverage number is not the most important one." }
      ],
      requirements: [
        "List every problem and say what each one costs.",
        "Explain what `|| true` on the lint and type steps actually achieves.",
        "Replace the project-wide gate with something that catches regressions.",
        "Fix the 22 minutes without deleting tests.",
        "Give a flaky-test policy to replace `--reruns 3`.",
        "Explain why `-p no:randomly` is the most dangerous line in the file."
      ],
      hint: "Two of the flags do not fail the build when their check fails. One disables the thing that would find the reason for the reruns. And nothing in the file makes the install reproducible.",
      solution: {
        lang: "yaml",
        title: "ci.yml + the reasoning",
        code: `# =========================================================================
# THE PROBLEMS
# =========================================================================
#
# 1. "|| true" on ruff and mypy.
#    The steps run, print their errors, and pass. The pipeline reports
#    green while the type checker has 400 errors. This is worse than not
#    running them: it produces a signal everyone believes is meaningful.
#
# 2. "-p no:randomly" — THE most dangerous line.
#    It disables randomised ordering, which is what surfaces tests that
#    depend on each other. Combined with --reruns 3, the pipeline is
#    configured to hide exactly the failure it keeps re-running for.
#
# 3. "--reruns 3" as policy.
#    Makes the build green without making the test deterministic. A flaky
#    test is usually a real race in the code, so this mutes a production
#    bug that reproduces once in fifty.
#
# 4. --cov-fail-under=62, lowered three times.
#    A project-wide gate fails on unrelated changes, so it gets lowered.
#    It also cannot see that the NEW code is the untested part.
#
# 5. Five Python versions.
#    Five full runs of a 22-minute suite. 3.9 is end-of-life; if the
#    project does not support it, testing it is pure cost.
#
# 6. No dependency caching, and no lockfile.
#    pip install from requirements.txt on every job, resolving fresh --
#    minutes per run, and two builds of the same commit can install
#    different versions (Lesson 7.6).
#
# 7. on: [push] with no concurrency group.
#    Every push to every branch runs the full matrix, and pushing three
#    times in a minute runs it three times.
#
# 8. No timeout.
#    A hung test burns a six-hour runner.
#
# 9. No test report or artifacts.
#    A failure is a wall of log output that has to be read to find which
#    test failed.


# =========================================================================
# THE REBUILD
# =========================================================================

name: ci

on:
  push:
    branches: [main]        # 7: full runs on main only
  pull_request:             #    and on PRs, where the feedback is used

concurrency:                # 7: a new push supersedes the old run
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

env:
  UV_FROZEN: "1"            # 6: never silently re-resolve

jobs:
  # -----------------------------------------------------------------
  # Cheap and specific first: a formatting failure in 30 seconds is
  # useful; the same failure after the integration suite is not.
  # -----------------------------------------------------------------
  static:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true                    # 6: cached, keyed on the lock
          cache-dependency-glob: uv.lock
      - run: uv sync --frozen --all-extras

      # 1: no "|| true". These fail the build, which is the point.
      #    --output-format=github annotates the diff inline.
      - run: uv run ruff check --output-format=github .
      - run: uv run ruff format --check .
      - run: uv run mypy src

  # -----------------------------------------------------------------
  # The fast majority. One version for the PR loop; the matrix runs
  # on main and nightly, where a version-specific break is rare and
  # waiting is acceptable.
  # -----------------------------------------------------------------
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10                          # 8
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }                 # diff-cover needs history
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true, cache-dependency-glob: uv.lock }
      - run: uv sync --frozen --all-extras

      # 2: randomised ordering ON. If it fails, that is a real coupling
      #    and the seed in the output reproduces it exactly.
      # 3: no reruns. A flaky test is quarantined explicitly, below.
      # 5: -n auto uses the runner's cores instead of five sequential
      #    interpreters.
      - name: Unit tests
        run: >
          uv run pytest -m 'not integration and not flaky'
          -p randomly -n auto
          --cov=src --cov-report=xml --junitxml=results-unit.xml

      # 4: gate the DIFF, report the whole. 90% on lines the author just
      #    wrote is demanding and accepted; 90% project-wide is negotiated
      #    down to 62.
      - name: Coverage on changed lines
        if: github.event_name == 'pull_request'
        run: |
          uv run diff-cover coverage.xml \\
            --compare-branch "origin/\${{ github.base_ref }}" \\
            --fail-under 90 \\
            --markdown-report diff-cover.md
          cat diff-cover.md >> "$GITHUB_STEP_SUMMARY"

      # 9: a readable summary instead of a log wall
      - uses: pmeier/pytest-results-action@main
        if: always()
        with: { path: results-unit.xml }

  integration:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: static                                # do not pay for it if lint fails
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true, cache-dependency-glob: uv.lock }
      - run: uv sync --frozen --all-extras
      - run: uv run pytest -m integration --junitxml=results-int.xml
      - uses: pmeier/pytest-results-action@main
        if: always()
        with: { path: results-int.xml }

  # -----------------------------------------------------------------
  # Reported, never blocking. Running them is what stops quarantine
  # becoming a place tests go to be forgotten.
  # -----------------------------------------------------------------
  quarantine:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true, cache-dependency-glob: uv.lock }
      - run: uv sync --frozen --all-extras
      - run: uv run pytest -m flaky -p randomly --junitxml=results-flaky.xml
      - uses: pmeier/pytest-results-action@main
        if: always()
        with: { path: results-flaky.xml }

  # -----------------------------------------------------------------
  # 5: the matrix, where waiting is acceptable
  # -----------------------------------------------------------------
  matrix:
    if: github.event_name == 'push' || github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false        # show ALL failing versions, not just the first
      matrix:
        python: ["3.11", "3.12", "3.13"]     # 3.9 is end-of-life
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true, cache-dependency-glob: uv.lock }
      - run: uv python install \${{ matrix.python }}
      - run: uv sync --frozen --all-extras
      - run: uv run pytest -m 'not flaky' -n auto


# =========================================================================
# THE FLAKY POLICY THAT REPLACES --reruns 3
# =========================================================================
#
#   1. A flaky test is quarantined with a marker, an issue and an EXPIRY:
#
#        @pytest.mark.flaky(reason="ISSUE-2231 — race in the cache warmer",
#                           expires="2026-11-01")
#
#   2. The gate runs "-m 'not flaky'". The quarantine job runs them and
#      reports, but cannot fail the build.
#
#   3. A test in the suite asserts no quarantine has expired, so the list
#      has to shrink:
#
#        def test_no_expired_quarantines():
#            for item in collect_flaky_markers():
#                assert item.expires > date.today(), f"{item.name} expired"
#
#   4. Randomised ordering stays ON everywhere, because the most common
#      cause is shared state between tests and that is the only thing
#      that finds it.
#
# The difference from --reruns 3: a rerun hides the failure and tells
# nobody. A quarantine is visible, counted, dated, and gets smaller.


# =========================================================================
# WHERE THE 22 MINUTES WENT
# =========================================================================
#
#   5 Python versions x (2 min install + ~2.5 min suite)  = ~22 min
#
#   caching the install          5 x 2 min      ->  ~5 x 10s   = -9 min
#   3 versions instead of 5      -2 runs                       = -5 min
#   -n auto on 4 cores           2.5 min -> ~45s               = -4 min
#   matrix off the PR path       PR runs one version           = -8 min
#
#   PR feedback:   ~22 min  ->  ~2 min (static + unit, in parallel)
#   main:          ~22 min  ->  ~6 min
#
# No tests were deleted. The whole saving is caching, parallelism, and
# not running the full matrix on every keystroke.`,
        notes: [
          { t: "p", text: "**`|| true` is the worst line in the original, and it is easy to miss.** The steps run, print their errors and exit zero, so the badge is green while `mypy` reports hundreds of errors. A check that cannot fail is worse than no check, because the team believes it is covered." },
          { t: "p", text: "**`-p no:randomly` combined with `--reruns 3` is a configuration that hides its own bug.** Randomised ordering is the only thing that surfaces tests sharing state, and reruns paper over exactly the intermittent failure that would result. Someone added each flag to make the build green, and together they removed the pipeline's ability to tell them why it was not (Lesson 9.3)." },
          { t: "p", text: "**Gating the diff rather than the project is what makes 90% survivable.** A project-wide number fails on unrelated changes until it is lowered — three times here, ending at 62. Ninety per cent on the lines the author just wrote is a demand people accept, because it is about their own work and they can act on it." },
          { t: "callout", kind: "insight", title: "The 22 minutes was never the tests", body: [
            { t: "p", text: "Five uncached installs at two minutes each is ten minutes of the twenty-two, and running the full matrix on every push multiplies everything by five. Caching, dropping two end-of-life versions and moving the matrix off the pull-request path account for almost the whole saving." },
            { t: "p", text: "The suite itself went from 2.5 minutes to 45 seconds with `-n auto`. Nothing was deleted, and no coverage was lost — which is the usual shape of a slow pipeline (Lesson 10.2)." }
          ]},
          { t: "p", text: "**The quarantine job that cannot fail the build is the part that makes the policy honest.** Muted tests still run and still report, so the list is visible; the expiry assertion in the suite means it has to shrink. Without both, quarantine is just a slower way of deleting a test." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team is told to reach 90% coverage before a compliance audit. They are at 71%. Two engineers spend three weeks writing tests, and they reach 91%." },
      { t: "p", text: "**The next production incident is in a module at 96%.** The tests there called every function and asserted that the results were not `None` — every line ran, nothing was verified. Written to move a number, they measured exactly what they were asked to measure." },
      { t: "p", text: "**Coverage was doing its job; the target was wrong.** As a map, 71% correctly said several modules were untested. As a target, it produced 20% more executed lines and no additional verification, because the cheapest way to raise coverage is always to call code without checking it." },
      { t: "p", text: "**What they kept afterwards:** branch coverage on, the per-file report as a to-do list, and a 90% gate on changed lines only. What they dropped was the project-wide number as a goal. **Use coverage to find what is untested, and mutation testing or review to judge whether the tests are any good** — the number itself is a measurement, not an objective." }
    ]}
  ],

  takeaways: [
    "**Coverage measures which lines ran, not whether anything was verified.** A test that calls every function and asserts nothing reaches 100%.",
    "**Read the per-file report as a to-do list and ignore the total.** \"`refunds.py` is at 12%\" is actionable; \"the project is at 87.3%\" is not.",
    "**`branch = true` is the highest-value coverage setting** — it finds the untaken `else` that line coverage reports as fully covered.",
    "**`parallel = true` is required under `pytest-xdist`**, or each worker overwrites the last and the number silently collapses.",
    "**Exclude only what genuinely cannot execute** — `TYPE_CHECKING` blocks, abstract bodies. `pragma: no cover` on an awkward branch usually marks the code most worth testing.",
    "**Gate the diff, report the whole.** 90% on lines the author just wrote is accepted; 90% project-wide gets negotiated down.",
    "**Order CI steps cheapest and most specific first**: format, lint, types, unit, integration. A formatting failure at ten seconds beats the same failure at eleven minutes.",
    "**`|| true` on a check makes it worse than absent**, because the team believes a green badge means it passed.",
    "**`fail-fast: false` on a version matrix** shows every failing version instead of hiding the rest behind the first.",
    "**A retry plugin is not a flaky-test policy.** A flaky test is usually a real race, so reruns mute a production bug that reproduces once in fifty.",
    "**Quarantine with a marker, an issue and an expiry**, run the quarantined tests without blocking, and assert in the suite that none has expired.",
    "**Keep randomised ordering on.** Shared state between tests is the most common cause of flakiness and the only thing that finds it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A module has 96% coverage and still ships a bug. What does that tell you about the tests?",
        options: [
          "The remaining 4% contained the bug",
          "Nothing about their quality — coverage records that lines executed, not that anything was asserted about the result",
          "The coverage tool is misconfigured",
          "Branch coverage was disabled"
        ],
        answer: 1,
        why: "A test that calls every function and asserts the result is not `None` reaches 100%. That is the cheapest way to raise the number, so it is what a coverage target produces. Use the per-file report to find untested modules; use review or mutation testing to judge whether the tests would actually fail if the code broke."
      },
      {
        stem: "`notify()` has an `if user.email:` guard. One test passes a user with an email. Line coverage says 100%. What is missing?",
        options: [
          "Nothing — every line executed",
          "The false branch: the path where the user has no email is never taken, which branch coverage reports and line coverage cannot",
          "An assertion on the return value",
          "A test for an invalid email format"
        ],
        answer: 1,
        why: "Line coverage asks whether each line ran; both lines here did. Branch coverage asks whether each conditional went both ways, and reports the untaken edge as a partial branch. It is one line of configuration — `branch = true` — and finds a genuinely different class of gap, which is why it is the coverage setting most worth turning on."
      },
      {
        stem: "A CI file has `ruff check . || true` and `mypy src || true`. What does that achieve?",
        options: [
          "It runs the checks in parallel",
          "The checks run and print errors but always exit zero, so the build is green while the code fails both — worse than not running them",
          "It suppresses warnings but keeps errors fatal",
          "It allows the steps to be skipped on draft pull requests"
        ],
        answer: 1,
        why: "`|| true` discards the exit status, so the step always passes. The output is in the log where nobody reads it, and the green badge tells the team the code type-checks when it does not. A check that cannot fail is worse than an absent one, because absence is visible and a false pass is not."
      },
      {
        stem: "A suite has `-p no:randomly --reruns 3`. Why is that combination self-defeating?",
        options: [
          "The two flags are incompatible and pytest ignores one",
          "Randomised ordering is what surfaces tests that share state, and reruns hide the resulting intermittent failure — so the pipeline is configured to conceal the bug it keeps re-running for",
          "Reruns reset the random seed",
          "`no:randomly` makes reruns non-deterministic"
        ],
        answer: 1,
        why: "Each flag was added to make the build green. Together they remove the ability to diagnose it: ordering is disabled so coupling never shows, and the intermittent failure it causes elsewhere is retried until it passes. The fix is the opposite — keep randomisation on so the seed reproduces the failure, and quarantine the test explicitly with an expiry."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What coverage percentage should a project aim for?",
        strong: "It is the wrong question. Coverage records which lines ran, not whether anything was verified, so a target produces tests that execute code without asserting on it. Use it as a map — which files are untested — and gate the diff rather than the project.",
        answer: [
          { t: "p", text: "Refusing the number and reframing it is the answer being looked for; the compliance example, where 91% was reached and the next incident was in a module at 96%, makes it concrete rather than contrarian." },
          { t: "p", text: "Branch coverage is the constructive half — one setting that finds real gaps line coverage cannot." },
          { t: "p", text: "Diff coverage at 90% is the practical landing point: demanding, about code the author just wrote, and therefore not negotiated down over time." }
        ]
      },
      {
        level: "advanced",
        q: "How would you structure a CI pipeline for a Python service?",
        strong: "Cheapest and most specific first: format and lint, then types, then unit tests, then integration. Cache the dependency install keyed on the lockfile, install frozen so CI gets exactly what was reviewed, set a timeout, and use a concurrency group so a new push cancels the old run.",
        answer: [
          { t: "p", text: "The ordering rationale — a formatting failure in ten seconds beats the same failure after an eleven-minute integration run — shows the design is about the feedback loop rather than a list of tools." },
          { t: "p", text: "`--frozen` connects it to reproducibility: without it CI can silently install a different graph from the one the lockfile describes (Lesson 7.6)." },
          { t: "p", text: "Running the full version matrix on main and nightly rather than on every pull-request push is the change that usually recovers the most time." }
        ]
      },
      {
        level: "advanced",
        q: "What do you do about a flaky test?",
        strong: "Diagnose it, because it is usually a real race in the code rather than a defect in the test. Reruns make the build green and mute a production bug that reproduces once in fifty.",
        answer: [
          { t: "p", text: "Naming the common causes — shared state, time, ordering, a real race, network — turns it into a procedure rather than a complaint, and each has a different fix." },
          { t: "p", text: "The quarantine policy is the pragmatic half: a marker with an issue and an expiry, a job that runs them without blocking, and an assertion in the suite that nothing has expired." },
          { t: "p", text: "Keeping randomised ordering on is the detail that shows first-hand experience, since shared state is the most common cause and nothing else surfaces it." }
        ]
      }
    ]
  }
});
