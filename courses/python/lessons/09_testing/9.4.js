/* ============================================================================
   LESSON 9.4 — Parameterisation
   ========================================================================= */
EC.receiveLesson({
  id: "9.4",

  lede: "Six near-identical tests differing only in their input is six places to update when the function changes. `parametrize` turns them into one test and a table of cases — and the table is the real deliverable, because **a table makes a missing case visible** in a way six scattered functions never do.",

  objectives: [
    "Convert duplicated tests into a table-driven test",
    "Write `ids` that make a failure report readable without opening the file",
    "Mark individual cases as expected failures without excluding them",
    "Parametrise a fixture, and know when that beats parametrising the test",
    "Recognise when parameterisation is the wrong shape"
  ],

  prerequisites: ["9.2"],

  blocks: [

    { t: "h2", n: "01", text: "One test, many cases", id: "basics" },

    { t: "code", lang: "python", title: "the transformation", code: `
import pytest

# Before -- six functions, one assertion each
def test_no_discount_below_threshold():
    assert discount(quantity=10) == Decimal("0")

def test_five_percent_at_fifty_one():
    assert discount(quantity=51) == Decimal("0.05")

# ... four more


# After -- one function, a table
@pytest.mark.parametrize(
    "quantity, expected",
    [
        (0, "0"),
        (50, "0"),        # boundary: no discount AT the threshold
        (51, "0.05"),     # boundary: first quantity that qualifies
        (100, "0.05"),    # boundary: still 5% at the upper edge
        (101, "0.10"),    # boundary: first quantity at the higher rate
        (10_000, "0.10"),
    ],
)
def test_discount_by_quantity(quantity: int, expected: str) -> None:
    assert discount(quantity=quantity) == Decimal(expected)
`,
      hl: [16, 17, 18, 19, 20],
      caption: "**The table is the specification.** Every boundary sits on adjacent rows, so a missing one is visible — where six separate functions hide the gap between 100 and 101 completely."
    },

    { t: "viz",
      title: "Each row is a separate test",
      caption: "pytest generates one independent test per row. A failure in the middle does not stop the rest, each has its own identifier for selection and reporting, and the count in CI reflects the cases actually covered.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Diagram showing one parametrized test function expanding into six independently named and independently passing or failing test cases">
  <defs>
    <marker id="pm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="86" width="220" height="76" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="124" y="114" text-anchor="middle" class="s-mono" style="font-size:10px">test_discount_by_quantity</text>
  <text x="124" y="136" text-anchor="middle" class="s-sub">one function, six rows</text>

  <line x1="238" y1="124" x2="292" y2="124" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#pm)"/>

  <g class="s-mono" style="font-size:9px">
    <rect x="296" y="20" width="300" height="26" rx="5" style="fill:none;stroke:var(--good)" stroke-width="1.2"/>
    <text x="312" y="38" style="fill:var(--good)">test_discount_by_quantity[0-0]           PASSED</text>

    <rect x="296" y="52" width="300" height="26" rx="5" style="fill:none;stroke:var(--good)" stroke-width="1.2"/>
    <text x="312" y="70" style="fill:var(--good)">test_discount_by_quantity[50-0]          PASSED</text>

    <rect x="296" y="84" width="300" height="26" rx="5" style="fill:none;stroke:var(--good)" stroke-width="1.2"/>
    <text x="312" y="102" style="fill:var(--good)">test_discount_by_quantity[51-0.05]       PASSED</text>

    <rect x="296" y="116" width="300" height="26" rx="5" style="fill:none;stroke:var(--crit)" stroke-width="1.4"/>
    <text x="312" y="134" style="fill:var(--crit)">test_discount_by_quantity[100-0.05]      FAILED</text>

    <rect x="296" y="148" width="300" height="26" rx="5" style="fill:none;stroke:var(--good)" stroke-width="1.2"/>
    <text x="312" y="166" style="fill:var(--good)">test_discount_by_quantity[101-0.10]      PASSED</text>

    <rect x="296" y="180" width="300" height="26" rx="5" style="fill:none;stroke:var(--good)" stroke-width="1.2"/>
    <text x="312" y="198" style="fill:var(--good)">test_discount_by_quantity[10000-0.10]    PASSED</text>
  </g>

  <text x="620" y="120" class="s-sub" style="fill:var(--crit)">The failing case names</text>
  <text x="620" y="140" class="s-sub" style="fill:var(--crit)">itself: quantity 100</text>
  <text x="620" y="160" class="s-sub" style="fill:var(--crit)">is an off-by-one at</text>
  <text x="620" y="180" class="s-sub" style="fill:var(--crit)">the upper boundary</text>

  <text x="14" y="238" class="s-mono" style="font-size:10px">pytest -k "100-0.05"</text>
  <text x="230" y="238" class="s-sub">— rerun just that case, without editing anything</text>
</svg>`
    },

    { t: "h2", n: "02", text: "ids: making failures readable", id: "ids" },

    { t: "code", lang: "python", title: "three ways to name cases", code: `
# 1. Automatic -- fine for scalars, unreadable for objects
@pytest.mark.parametrize("payload", [{"a": 1}, {"b": 2}])
def test_parse(payload): ...
# test_parse[payload0]  test_parse[payload1]      <- useless


# 2. An explicit ids list -- parallel to the cases
@pytest.mark.parametrize(
    "payload, expected",
    [({"a": 1}, 1), ({"b": 2}, 2), ({}, 0)],
    ids=["single-key", "different-key", "empty"],
)
def test_parse(payload, expected): ...
# test_parse[single-key]  test_parse[different-key]  test_parse[empty]


# 3. pytest.param with an id -- keeps the name NEXT TO the case
@pytest.mark.parametrize(
    "quantity, expected",
    [
        pytest.param(50, "0", id="at-threshold-no-discount"),
        pytest.param(51, "0.05", id="just-over-threshold"),
        pytest.param(-1, None, id="negative-quantity"),
    ],
)
def test_discount(quantity, expected): ...
`,
      caption: "**Prefer `pytest.param`.** A parallel `ids` list drifts out of alignment the moment someone inserts a case in the middle — and the resulting mislabelled failure sends people to the wrong row."
    },

    { t: "callout", kind: "insight", title: "The id is what a CI failure gives you", body: [
      { t: "code", lang: "python", title: "the difference at 3 a.m.", numbered: false, code: `
FAILED test_pricing.py::test_discount[quantity2-expected2]

FAILED test_pricing.py::test_discount[at-threshold-no-discount]`},
      { t: "p", text: "The second tells you what broke and roughly why, from the CI summary alone. The first requires opening the file and counting rows — and counting *from zero*, which people get wrong under pressure." },
      { t: "p", text: "**Write the id as a claim about the case**, not a restatement of the values: `empty-cart-is-free`, not `quantity-0`. The values are already in the row." }
    ]},

    { t: "h2", n: "03", text: "Marking individual cases", id: "marks" },

    { t: "code", lang: "python", title: "xfail and skip, per row", code: `
@pytest.mark.parametrize(
    "value, expected",
    [
        pytest.param("1.5", Decimal("1.5"), id="decimal-string"),
        pytest.param("1e3", Decimal("1000"), id="scientific-notation"),

        # A known bug, tracked, and still RUN -- so it reports xpass the
        # day it starts working, which is how you find out it is fixed.
        pytest.param(
            "1,000", Decimal("1000"), id="thousands-separator",
            marks=pytest.mark.xfail(reason="ISSUE-4821: separators unsupported"),
        ),

        # Genuinely not applicable here, and never will be
        pytest.param(
            "١٢٣", Decimal("123"), id="arabic-numerals",
            marks=pytest.mark.skip(reason="out of scope: ASCII input only"),
        ),

        # Environment-dependent
        pytest.param(
            "1_000", Decimal("1000"), id="underscore-separator",
            marks=pytest.mark.skipif(sys.version_info < (3, 11), reason="3.11+"),
        ),
    ],
)
def test_parse_decimal(value: str, expected: Decimal) -> None:
    assert parse_decimal(value) == expected
`,
      hl: [10, 11, 12, 13],
      caption: "**`xfail` keeps the case in the suite.** It runs, it is expected to fail, and if it ever *passes* pytest reports `XPASS` — which is how a fixed bug announces itself instead of the test being deleted and forgotten."
    },

    { t: "table",
      head: ["Mark", "Runs?", "Use when"],
      rows: [
        ["`xfail`", "**Yes**", "A known bug you intend to fix — the case documents the expectation and reports when it starts passing"],
        ["`xfail(strict=True)`", "**Yes**", "As above, but an unexpected pass **fails** the suite — forces the marker to be removed"],
        ["`skip`", "No", "Genuinely not applicable, permanently"],
        ["`skipif`", "Conditionally", "Platform, Python version, an optional dependency"],
        ["Deleting the case", "—", "Almost never — the case documented a real requirement"]
      ],
      caption: "**`xfail` over `skip` for bugs.** A skipped case is invisible; an xfailing one appears in every run as a known gap, and `strict=True` makes fixing it a required cleanup rather than an optional one."
    },

    { t: "h2", n: "04", text: "Stacking and fixtures", id: "stacking" },

    {"kind": "matrix", "title": "Stacked parametrize is a product", "caption": "Two @parametrize decorators multiply: three inputs by two modes is six test cases, each reported with its own id.", "rows": ["x=1", "x=2", "x=3"], "cols": ["mode='fast'", "mode='safe'"], "cells": [[{"text": "case", "tone": "good"}, {"text": "case", "tone": "good"}], [{"text": "case", "tone": "good"}, {"text": "case", "tone": "good"}], [{"text": "case", "tone": "good"}, {"text": "case", "tone": "good"}]], "t": "diagram", "id": "dg-9_4-04-0"},

    { t: "code", lang: "python", title: "the product, and when it is too much", code: `
# Stacked decorators produce the CARTESIAN PRODUCT: 3 x 2 = 6 tests
@pytest.mark.parametrize("currency", ["GBP", "USD", "EUR"])
@pytest.mark.parametrize("rounding", ["half-up", "half-even"])
def test_formats_money(currency: str, rounding: str) -> None: ...


# Parametrising a FIXTURE: every test using it runs once per value
@pytest.fixture(params=["sqlite", "postgres"])
def db(request):
    """Each dependent test runs twice -- once per backend."""
    with make_database(request.param) as database:
        yield database


def test_insert(db): ...           # runs for sqlite AND postgres
def test_query(db): ...            # so does this one
`,
      caption: "**A parametrised fixture multiplies every test that uses it**, which is exactly right for \"this behaviour must hold on both backends\" and disastrous when applied to something incidental."
    },

    { t: "callout", kind: "trap", title: "The combinatorial explosion", body: [
      { t: "code", lang: "python", title: "how a suite becomes unrunnable", numbered: false, code: `
@pytest.mark.parametrize("currency", [...])     # 5
@pytest.mark.parametrize("locale", [...])       # 8
@pytest.mark.parametrize("tier", [...])         # 4
@pytest.mark.parametrize("rounding", [...])     # 3
def test_format(currency, locale, tier, rounding): ...
# 480 tests, of which perhaps 12 test anything distinct`},
      { t: "p", text: "The dimensions are usually **independent**, so testing every combination verifies the same code paths hundreds of times. It is slow, and a failure in one combination rarely means anything the others do not already tell you." },
      { t: "p", text: "**Test each dimension separately, and add specific combinations that genuinely interact.** Five currency cases plus eight locale cases plus the three pairs that are known to interact is sixteen tests instead of 480 — and it is easier to read." },
      { t: "p", text: "Where the space is genuinely large and the properties are general, property-based testing with `hypothesis` explores it far better than an enumerated product." }
    ]},

    { t: "ladder",
      title: "Turning a bug report into a test",
      rungs: [
        { level: "bad", label: "Fix the code, no test",
          why: "Nothing stops it recurring, and the next person to touch that branch has no idea the case exists. Six months later the same ticket is filed again.",
          code: `# ISSUE-4821: totals wrong for orders with a 100% discount
- return subtotal * (1 - rate)
+ return max(Decimal(0), subtotal * (1 - rate))` },
        { level: "ok", label: "A dedicated regression test",
          why: "The case is captured and cannot recur silently. But it sits apart from the other discount tests, so a reader of either group cannot see the whole rule — and the next person adding a boundary will not find it.",
          code: `def test_issue_4821_full_discount_does_not_go_negative():
    assert total(subtotal=Decimal("100"), rate=Decimal("1")) == Decimal("0")` },
        { level: "best", label: "A row in the existing table",
          why: "The bug becomes part of the specification, sitting on the row next to the boundaries it belongs with. Anyone reading the table sees the whole rule, and the id explains why the row exists without a comment.",
          code: `@pytest.mark.parametrize(
    "subtotal, rate, expected",
    [
        pytest.param("100", "0",    "100", id="no-discount"),
        pytest.param("100", "0.10",  "90", id="ten-percent"),
        pytest.param("100", "1",      "0", id="full-discount-ISSUE-4821"),
        pytest.param("100", "1.5",    "0", id="over-100-percent-clamped"),
        pytest.param("0",   "0.10",   "0", id="empty-order"),
    ],
)
def test_total_after_discount(subtotal, rate, expected):
    assert total(Decimal(subtotal), Decimal(rate)) == Decimal(expected)`,
          note: "Note the row that was added *because* of the bug: `over-100-percent-clamped`. A bug at a boundary almost always means a neighbouring case is untested too — writing the row prompts the question." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "When not to parametrise", body: [
      { t: "table",
        head: ["Situation", "Parametrise?"],
        rows: [
          ["Same logic, different inputs and expected outputs", "**Yes** — this is exactly the case"],
          ["Same inputs, different assertions per case", "**No** — separate tests; the assertions are the point"],
          ["Cases needing different setup", "No, unless the setup is itself a parameter"],
          ["Two or three cases with meaningful names", "Either — separate tests read fine and often better"],
          ["A body full of `if case == \"x\"`", "**No** — that is two tests wearing one coat"]
        ]
      },
      { t: "p", text: "**The test is whether the body stays identical.** The moment it branches on the parameter, you have merged tests that should be separate, and the reader must now execute the branch mentally to know what each row asserts." },
      { t: "p", text: "Parameterisation is for removing duplication, not for reaching a lower test count. Two clearly-named tests are better than one table of two rows." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Build the table the bug reports asked for",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Here is a password validator, its existing tests, and three bug reports from production. Convert the tests to a table, add the cases the bugs revealed, and add the neighbouring boundaries the bugs imply." },
        { t: "code", lang: "python", title: "validator.py and test_validator.py", numbered: false, code: `
def validate_password(password: str, username: str) -> list[str]:
    """Returns a list of problems; empty means valid."""
    problems = []
    if len(password) < 12:
        problems.append("too_short")
    if len(password) > 128:
        problems.append("too_long")
    if not any(c.isdigit() for c in password):
        problems.append("no_digit")
    if username.lower() in password.lower():
        problems.append("contains_username")
    return problems


def test_valid_password():
    assert validate_password("correcthorse42", "ada") == []

def test_too_short():
    assert "too_short" in validate_password("short1", "ada")

def test_no_digit():
    assert "no_digit" in validate_password("correcthorsebattery", "ada")

def test_contains_username():
    assert "contains_username" in validate_password("ada12345678901", "ada")`},
        { t: "code", lang: "bash", title: "the bug reports", numbered: false, code: `
ISSUE-901: a 12-character password is rejected as too short
ISSUE-902: an empty username makes every password fail as
           "contains_username"
ISSUE-914: a password of exactly 128 characters is rejected`},
        { t: "p", text: "Fix the code and produce the table." }
      ],
      requirements: [
        "Convert the four tests into one parametrised test with meaningful ids.",
        "Add a row for each bug report, with the issue number in the id.",
        "For each bug, add the neighbouring boundary case it implies.",
        "Fix the validator so every row passes.",
        "Mark one case as `xfail` for a limitation you choose not to fix, with a reason.",
        "Explain why `parametrize` is right here and where you would still write a separate test."
      ],
      hint: "Every one of the three bugs is an off-by-one or an empty-input case. For each, the fix is one operator or one condition — and the interesting work is deciding which neighbouring row proves the fix is correct rather than merely different.",
      solution: {
        lang: "python",
        title: "test_validator.py",
        code: `from __future__ import annotations

import pytest


# =========================================================================
# THE FIXES
# =========================================================================

MIN_LENGTH = 12
MAX_LENGTH = 128


def validate_password(password: str, username: str) -> list[str]:
    """Returns a list of problems; empty means valid."""
    problems = []

    # ISSUE-901: "< 12" rejected a 12-character password. The rule says
    # "at least 12", so the boundary is inclusive.
    if len(password) < MIN_LENGTH:
        problems.append("too_short")

    # ISSUE-914: the same off-by-one at the other end. "> 128" was
    # actually correct here -- the reported bug was that the caller's
    # form field truncated at 128 and then the server rejected it. The
    # server rule is right; the test row documents it so nobody
    # "fixes" the wrong end.
    if len(password) > MAX_LENGTH:
        problems.append("too_long")

    if not any(c.isdigit() for c in password):
        problems.append("no_digit")

    # ISSUE-902: "" is a substring of EVERY string, so an empty
    # username made every password fail. Guard the empty case.
    if username and username.lower() in password.lower():
        problems.append("contains_username")

    return problems


# =========================================================================
# THE TABLE
# =========================================================================

@pytest.mark.parametrize(
    "password, username, expected",
    [
        # ---- valid -----------------------------------------------------
        pytest.param("correcthorse42", "ada", [], id="valid-password"),

        # ---- length: the boundaries, adjacent --------------------------
        pytest.param("short1", "ada", ["too_short"], id="clearly-too-short"),
        pytest.param("a" * 10 + "12", "ada", [], id="exactly-12-ISSUE-901"),
        pytest.param("a" * 9 + "12", "ada", ["too_short"],
                     id="11-chars-one-below-minimum"),
        pytest.param("a" * 126 + "12", "ada", [], id="exactly-128-ISSUE-914"),
        pytest.param("a" * 127 + "12", "ada", ["too_long"],
                     id="129-chars-one-above-maximum"),

        # ---- digits ----------------------------------------------------
        pytest.param("correcthorsebattery", "ada", ["no_digit"],
                     id="letters-only"),
        pytest.param("correcthorseba1", "ada", [], id="single-digit-is-enough"),

        # ---- username --------------------------------------------------
        pytest.param("ada12345678901", "ada", ["contains_username"],
                     id="contains-username"),
        pytest.param("ADA12345678901", "ada", ["contains_username"],
                     id="username-match-is-case-insensitive"),
        pytest.param("correcthorse42", "", [], id="empty-username-ISSUE-902"),
        pytest.param("correcthorse42", "a", [], id="single-char-username-not-matched"),

        # ---- several problems at once ----------------------------------
        pytest.param("ada", "ada", ["too_short", "no_digit", "contains_username"],
                     id="short-no-digit-and-contains-username"),

        # ---- a limitation we are choosing not to fix -------------------
        pytest.param(
            "adalovelace1234", "Ada Lovelace", ["contains_username"],
            id="username-with-space-partially-contained",
            marks=pytest.mark.xfail(
                reason="ISSUE-1002: only exact substring matching; "
                       "'Ada Lovelace' does not match 'adalovelace'",
                strict=True,
            ),
        ),
    ],
)
def test_validate_password(password: str, username: str,
                           expected: list[str]) -> None:
    assert validate_password(password, username) == expected


# =========================================================================
# WHY THE NEIGHBOURING ROWS MATTER
# =========================================================================
#
# ISSUE-901 said "12 characters is rejected". Changing "< 12" to
# "<= 11" -- or to "< 11" -- both make that report go away. Only the
# PAIR of rows distinguishes a fix from a different bug:
#
#     exactly-12         -> valid          (the reported case)
#     11-chars           -> too_short      (proves we did not just
#                                           loosen the rule by one)
#
# The same applies at 128/129. A bug at a boundary is a signal that the
# boundary was never tested; fixing it without adding its neighbour
# just moves the off-by-one one position along.
#
#
# WHY strict=True ON THE XFAIL
#
# Without strict, an unexpected pass is reported as XPASS and the suite
# stays green -- so if someone implements fuzzy username matching, the
# stale marker sits there forever. With strict=True the suite FAILS,
# forcing the marker to be removed along with the fix.
#
#
# WHERE I WOULD STILL WRITE A SEPARATE TEST
#
# Anything whose ASSERTIONS differ rather than its inputs:
#
#     def test_problems_are_returned_in_a_stable_order():
#         """A different property: the ORDER of the list, not which
#         problems it contains. Parametrising this alongside the rows
#         above would mean a body that branches on the case, which is
#         two tests wearing one coat."""
#         first = validate_password("ada", "ada")
#         second = validate_password("ada", "ada")
#         assert first == second
#
#     def test_validation_does_not_log_the_password(caplog):
#         """Tests a side effect, not a return value. Different
#         assertion, different setup, different test."""
#         with caplog.at_level(logging.DEBUG):
#             validate_password("correcthorse42", "ada")
#         assert "correcthorse42" not in caplog.text
#
# The rule: parametrise when only the INPUTS and EXPECTED OUTPUT change.
# The moment the body needs an "if" on the parameter, they are separate
# tests.


def test_problems_are_returned_in_a_stable_order() -> None:
    """Not parametrised: this asserts a property of the output, not a
    mapping from input to output."""
    assert validate_password("ada", "ada") == validate_password("ada", "ada")


def test_a_valid_password_returns_an_empty_list_not_none() -> None:
    """The falsy-versus-empty distinction, worth its own name: a caller
    writing "if problems:" behaves the same for [] and None, and a
    caller writing "len(problems)" does not (Lesson 2.3)."""
    result = validate_password("correcthorse42", "ada")

    assert result == []
    assert result is not None
    assert isinstance(result, list)`,
        notes: [
          { t: "p", text: "**The neighbouring row is what proves a boundary fix.** ISSUE-901 is satisfied by changing `< 12` to `< 11`, which is a different bug rather than a fix. Only the pair — 12 valid, 11 rejected — pins the boundary. Every off-by-one report should produce two rows, and the second is the one that does the work." },
          { t: "p", text: "**`strict=True` on the `xfail` turns a known gap into a required cleanup.** Without it, implementing fuzzy username matching leaves the marker in place forever and the suite stays green while lying about what it covers. With it, the fix fails the build until the marker is removed alongside it." },
          { t: "p", text: "**ISSUE-902 is the one that is not an off-by-one**, and it is the most instructive: `\"\" in anything` is `True`, so an empty username matched every password. Empty string, empty list and zero are the inputs most likely to be missing from a table, precisely because nobody writes them by accident." },
          { t: "callout", kind: "insight", title: "The ids carry the issue numbers deliberately", body: [
            { t: "p", text: "`exactly-12-ISSUE-901` means a CI failure names both the behaviour and the ticket that motivated it. Six months later, someone tightening the length rule sees immediately that this row exists for a reason and can read the original report." },
            { t: "p", text: "A comment would do the same job in the file, but not in the CI summary — and the CI summary is where the information is needed under time pressure." }
          ]},
          { t: "p", text: "**Two tests stayed separate on purpose.** Ordering stability and \"returns `[]` not `None`\" assert properties of the output rather than a mapping from input to output. Folding them into the table would need a body that branches on the case, which is the clearest signal that two tests have been merged." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments team has forty separate tests for their fee calculator, one per scenario, each a few lines long. The rules change: a new tier is added between two existing ones." },
      { t: "p", text: "**Nobody can tell which of the forty tests are now wrong.** The cases are scattered across 300 lines with names like `test_medium_volume_customer`, and the boundaries between tiers are implicit — spread across tests that never appear on screen together." },
      { t: "p", text: "**Converting them to one table took an afternoon and revealed two gaps immediately**: no test at the exact boundary of the top tier, and no test for a volume of zero. Both had been shipped for two years, and both were visible the moment the cases sat on adjacent rows." },
      { t: "p", text: "**The table became the specification the product team reviewed.** They read the rows, disagreed with one, and the disagreement was resolved before any code changed — which forty scattered test functions could never have prompted, because nobody outside the team could read them as a set of rules." }
    ]}
  ],

  takeaways: [
    "**`parametrize` generates one independent test per row**, so a failure in the middle does not stop the rest and each case can be selected with `-k`.",
    "**The table is the specification.** Boundaries on adjacent rows make a missing case visible in a way scattered test functions never do.",
    "**Use `pytest.param(..., id=...)` rather than a parallel `ids` list**, which drifts out of alignment when someone inserts a case.",
    "**Write the id as a claim about the case** — `empty-cart-is-free`, not `quantity-0`. The values are already in the row; the id should say why the row exists.",
    "**A readable id is what a CI summary gives you** — `[at-threshold-no-discount]` beats `[quantity2-expected2]` when you are reading a failure at 3 a.m.",
    "**Prefer `xfail` over `skip` for known bugs.** The case still runs, appears as a known gap, and reports when it starts passing.",
    "**`xfail(strict=True)` fails the suite on an unexpected pass**, which forces the marker to be removed when the bug is fixed.",
    "**Stacked `parametrize` decorators produce the cartesian product** — four dimensions of five values is 500 tests exercising perhaps a dozen distinct paths.",
    "**Test dimensions separately and add the specific combinations that interact**, rather than enumerating a product.",
    "**A parametrised fixture multiplies every test that uses it** — right for \"must work on both backends\", wrong for anything incidental.",
    "**A bug report becomes a row in the existing table**, not a separate `test_issue_4821` function, so the bug joins the specification.",
    "**A boundary bug needs two rows**: the reported case and its neighbour. One row alone is satisfied by an off-by-one in the other direction.",
    "**Stop parametrising the moment the body branches on the parameter** — that is two tests wearing one coat."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A CI run reports `FAILED test_pricing.py::test_discount[quantity2-expected2]`. What is the problem?",
        options: [
          "The test is flaky and needs a rerun",
          "The auto-generated id says nothing — you must open the file and count rows from zero to learn which case failed",
          "Parametrised tests cannot be rerun individually",
          "The parameters were passed in the wrong order"
        ],
        answer: 1,
        why: "Automatic ids are positional and meaningless for anything but simple scalars. `pytest.param(50, \"0\", id=\"at-threshold-no-discount\")` makes the CI summary self-explanatory, and it survives someone inserting a row above it — which a parallel `ids` list does not."
      },
      {
        stem: "A bug report says a 12-character password is wrongly rejected. Which test rows do you add?",
        options: [
          "One row: 12 characters is valid",
          "Two rows: 12 characters valid, and 11 characters rejected",
          "One row per length from 1 to 20",
          "None — fix the code and rely on the existing tests"
        ],
        answer: 1,
        why: "A single row is satisfied by changing `< 12` to `< 11`, which is a different off-by-one rather than a fix. The neighbouring row pins the boundary from the other side, so only a correct rule passes both. A bug at a boundary is evidence the boundary was never tested — and the fix should leave the boundary tested from both directions."
      },
      {
        stem: "Why prefer `xfail` over `skip` for a known bug?",
        options: [
          "`skip` is deprecated",
          "The case still runs, so it appears as a known gap in every run and reports when it starts passing — with `strict=True`, it fails the suite until the marker is removed",
          "`xfail` runs faster",
          "`skip` cannot take a reason"
        ],
        answer: 1,
        why: "A skipped case is invisible: nothing tells you when the bug is fixed, and the marker outlives the problem. An xfailing case documents the expectation, runs on every push, and `strict=True` makes an unexpected pass a failure — so the person who fixes the bug is forced to remove the marker as part of the same change."
      },
      {
        stem: "When should you stop parametrising and write separate tests?",
        options: [
          "When there are more than ten cases",
          "When the test body needs an `if` on the parameter — at that point the assertions differ, not just the inputs",
          "When the parameters are objects rather than scalars",
          "When the cases need different fixtures"
        ],
        answer: 1,
        why: "Parameterisation removes duplication when only the inputs and expected output vary. A body that branches has merged two tests, and a reader must now execute the branch mentally to know what each row asserts. Tests that assert a *property* — ordering stability, a side effect, a return type — belong on their own, however similar their setup looks."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use `pytest.mark.parametrize`?",
        strong: "When several tests share a body and differ only in inputs and expected output. The real benefit is not fewer lines — it is that the table makes a missing case visible, which scattered test functions cannot.",
        answer: [
          { t: "p", text: "Leading with the specification argument rather than the DRY argument is the stronger framing, and it is what makes a table worth reviewing with non-engineers." },
          { t: "p", text: "Meaningful ids via `pytest.param` is the practical detail — a CI summary that names the behaviour beats one that names an index." },
          { t: "p", text: "Knowing when to stop shows judgement: the moment the body branches on the parameter, two tests have been merged." }
        ]
      },
      {
        level: "core",
        q: "A production bug is reported. What do you do about tests?",
        strong: "Write the failing case first, as a row in the existing table for that behaviour, then fix the code. And add the neighbouring boundary — a bug at a boundary means the boundary was untested, so one row alone can be satisfied by an off-by-one in the other direction.",
        answer: [
          { t: "p", text: "Adding the row to the existing table rather than writing `test_issue_4821` is the distinguishing choice: the bug becomes part of the specification instead of an orphan next to it." },
          { t: "p", text: "The neighbouring-boundary point is what shows care about correctness rather than about closing a ticket." },
          { t: "p", text: "Putting the issue number in the id means the CI summary carries the provenance, which matters six months later when someone tightens the rule." }
        ]
      },
      {
        level: "advanced",
        q: "How do you decide what to parametrise when there are several dimensions?",
        strong: "Test each dimension separately, then add the specific combinations that genuinely interact. Stacking decorators gives the cartesian product, which for four dimensions of five values is 500 tests exercising a dozen distinct paths.",
        answer: [
          { t: "p", text: "The point that most combinations verify the same code repeatedly is what makes this a real trade-off rather than a preference." },
          { t: "p", text: "Mentioning `hypothesis` for genuinely large spaces shows range — property-based testing explores a combinatorial space far better than enumerating it." },
          { t: "p", text: "The fixture-parameterisation case is a useful contrast: multiplying every dependent test is exactly right for \"must hold on both backends\" and wrong for anything incidental." }
        ]
      }
    ]
  }
});
