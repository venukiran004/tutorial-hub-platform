/* ============================================================================
   LESSON 9.2 — pytest Fundamentals
   ========================================================================= */
EC.receiveLesson({
  id: "9.2",

  lede: "pytest lets you write `assert x == y` and still get a full diff on failure. That is not the interpreter being clever — **pytest rewrites the bytecode of your test modules as it imports them**, and knowing that explains both the good failure messages and the two places they mysteriously disappear. The rest of the lesson is about the other half of the job: making the suite collect what you think it collects, and reading a failure report to the end.",

  objectives: [
    "Explain how pytest produces a diff from a plain `assert`, and name where it cannot",
    "Predict which files and functions pytest will collect, and fix a suite that silently collects nothing",
    "Diagnose an `import file mismatch` error from the import mechanics that cause it",
    "Read a failure report section by section, including captured output and the short summary",
    "Write assertions whose failure message identifies the defect without a debugger"
  ],

  prerequisites: ["9.1", "7.4"],

  blocks: [

    { t: "h2", n: "01", text: "Why a plain assert prints a diff", id: "assert-rewriting" },

    { t: "p", text: "Python's `assert` raises a bare `AssertionError` with no information about the values involved. Run the same statement under pytest and you get both sides, expanded and diffed. The difference is an import hook." },

    { t: "code", lang: "python", title: "the same assertion, two runners", code: `
# test_orders.py
def test_totals_match():
    expected = {"subtotal": 100, "tax": 20, "total": 120}
    actual = {"subtotal": 100, "tax": 20, "total": 121}
    assert actual == expected
`,
      out: `$ python test_orders.py           # plain Python
Traceback (most recent call last):
  ...
AssertionError

$ pytest test_orders.py -q         # under pytest
    def test_totals_match():
        expected = {"subtotal": 100, "tax": 20, "total": 120}
        actual = {"subtotal": 100, "tax": 20, "total": 121}
>       assert actual == expected
E       AssertionError: assert {'subtotal': 100, 'tax': 20, 'total': 121} == {'subtotal': 100, 'tax': 20, 'total': 120}
E
E         Common items:
E         {'subtotal': 100, 'tax': 20}
E         Differing items:
E         {'total': 121} != {'total': 120}
E         Use -v to get more diff`,
      caption: "Same statement, same interpreter. pytest imported the module through a hook that rewrote the assertion into code which captures each subexpression and builds the explanation before raising."
    },

    { t: "viz",
      title: "The assertion-rewriting import hook",
      caption: "pytest installs a meta path finder before collection. Any module it decides to rewrite is compiled from a modified AST in which each assert is expanded into intermediate variables plus an explanation builder. The rewritten bytecode is cached in __pycache__, so the cost is paid once.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram: pytest rewrites test module ASTs during import so assertions carry an explanation">
  <defs>
    <marker id="n92" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="20" y="40" width="150" height="56" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="95" y="64" text-anchor="middle" class="s-label">test_orders.py</text>
  <text x="95" y="82" text-anchor="middle" class="s-sub">assert a == b</text>

  <line x1="170" y1="68" x2="232" y2="68" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#n92)"/>
  <text x="201" y="60" text-anchor="middle" class="s-sub">import</text>

  <rect x="238" y="28" width="210" height="80" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="343" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">AssertionRewritingHook</text>
  <text x="343" y="70" text-anchor="middle" class="s-sub">a meta path finder on</text>
  <text x="343" y="86" text-anchor="middle" class="s-sub">sys.meta_path, installed first</text>
  <text x="343" y="102" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">parses to AST, transforms, compiles</text>

  <line x1="448" y1="68" x2="510" y2="68" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#n92)"/>

  <rect x="516" y="24" width="364" height="88" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="532" y="46" class="s-sub" style="fill:var(--ink-2);font-weight:600">what the assert becomes, roughly</text>
  <text x="532" y="66" class="s-mono" style="font-size:9.5px">tmp_1 = a; tmp_2 = b</text>
  <text x="532" y="82" class="s-mono" style="font-size:9.5px">if not (tmp_1 == tmp_2):</text>
  <text x="532" y="98" class="s-mono" style="font-size:9.5px">    raise AssertionError(explain(tmp_1, tmp_2))</text>

  <line x1="20" y1="132" x2="880" y2="132" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="158" class="s-sub" style="font-weight:700;letter-spacing:.08em">WHAT GETS REWRITTEN</text>

  <rect x="20" y="172" width="270" height="100" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="36" y="194" class="s-sub" style="fill:var(--good);font-weight:600">rewritten — full diffs</text>
  <text x="36" y="214" class="s-mono" style="font-size:9.5px">test_*.py / *_test.py</text>
  <text x="36" y="230" class="s-mono" style="font-size:9.5px">conftest.py</text>
  <text x="36" y="246" class="s-mono" style="font-size:9.5px">plugins declared as entry points</text>
  <text x="36" y="264" class="s-sub">collected by pytest, so the hook sees them</text>

  <rect x="306" y="172" width="290" height="100" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.4"/>
  <text x="322" y="194" class="s-sub" style="fill:var(--crit);font-weight:600">NOT rewritten — bare AssertionError</text>
  <text x="322" y="214" class="s-mono" style="font-size:9.5px">tests/helpers.py</text>
  <text x="322" y="230" class="s-mono" style="font-size:9.5px">tests/matchers.py</text>
  <text x="322" y="246" class="s-mono" style="font-size:9.5px">your application package</text>
  <text x="322" y="264" class="s-sub">imported normally, before pytest looks at it</text>

  <rect x="612" y="172" width="268" height="100" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="628" y="194" class="s-sub" style="fill:var(--ink-2);font-weight:600">the fix, in conftest.py</text>
  <text x="628" y="216" class="s-mono" style="font-size:9.5px">import pytest</text>
  <text x="628" y="232" class="s-mono" style="font-size:9.5px">pytest.register_assert_rewrite(</text>
  <text x="628" y="248" class="s-mono" style="font-size:9.5px">    "tests.helpers")</text>
  <text x="628" y="266" class="s-sub">must run BEFORE the module is imported</text>
</svg>`
    },

    { t: "callout", kind: "trap", title: "Assertions in a helper module lose their diff", body: [
      { t: "p", text: "You factor a repeated check into `tests/helpers.py` and every failure it produces turns into a bare `AssertionError` with no values. Nothing is broken — the helper was imported through the ordinary import machinery, before pytest's hook had any reason to look at it, so its assertions were never rewritten." },
      { t: "code", lang: "python", title: "two ways out", numbered: false, code: `
# Option A -- register the module for rewriting, in the ROOT conftest.py,
# before anything imports it.
import pytest

pytest.register_assert_rewrite("tests.helpers", "tests.matchers")


# Option B -- do not assert in helpers. Return the data and let the test
# assert. This keeps the failure at the line a reader is looking at.
def order_summary(response) -> dict:
    """Extract just the fields the assertions care about."""
    return {
        "status": response.status_code,
        "total": response.json()["total"],
    }


def test_checkout(client):
    assert order_summary(client.post("/checkout")) == {
        "status": 200,
        "total": "120.00",
    }`},
      { t: "p", text: "**Option B is usually better.** A helper that asserts hides the failing comparison one frame away from the test; a helper that *extracts* leaves the assertion in the test, where the rewriter works and where the reader is already looking." }
    ]},

    { t: "h2", n: "02", text: "Collection: what pytest actually looks at", id: "collection" },

    {"kind": "tree", "title": "What pytest collects", "caption": "Files matching test_*.py or *_test.py, then functions starting with test_ and methods of classes starting with Test. Anything else is invisible, which is the usual reason a new test 'does not run'.", "root": {"label": "rootdir", "tone": "accent", "children": [{"label": "tests/", "children": [{"label": "test_orders.py", "tone": "good", "children": [{"label": "test_total()", "tone": "good"}, {"label": "class TestRefund", "tone": "good"}, {"label": "helper()", "sub": "not collected", "tone": "warn"}]}, {"label": "orders_helpers.py", "sub": "not collected", "tone": "warn"}]}, {"label": "conftest.py", "sub": "fixtures, hooks"}]}, "t": "diagram", "id": "dg-9_2-02-0"},


    { t: "p", text: "A test that is never collected is indistinguishable from a test that passes. The rules are mechanical, and every one of them has a silent failure mode." },

    { t: "table",
      head: ["Rule", "Default", "Silent failure it causes"],
      rows: [
        ["Files", "`test_*.py` or `*_test.py`", "`tests_orders.py` (plural) is never collected and reports nothing"],
        ["Functions", "`test_*`", "`check_total()` in a test file is dead code that lints clean"],
        ["Classes", "`Test*` with **no `__init__`**", "A class with a constructor is skipped with a warning most people never read"],
        ["Methods", "`test_*` inside a collected class", "Same as functions"],
        ["Directories", "everything under `rootdir`, minus `norecursedirs`", "A `venv` inside the repo doubles collection time or crashes it"],
        ["Start points", "`testpaths` in config, else the current directory", "Running from the wrong directory collects a different set than CI does"]
      ]
    },

    { t: "code", lang: "python", title: "the class that quietly disappears", code: `
class TestCheckout:
    def __init__(self):                  # <-- kills collection
        self.client = TestClient(app)

    def test_returns_200(self):
        assert self.client.post("/checkout").status_code == 200
`,
      out: `$ pytest -q
no tests ran in 0.01s

$ pytest -q -W error::pytest.PytestCollectionWarning
PytestCollectionWarning: cannot collect test class 'TestCheckout'
because it has a __init__ constructor`,
      hl: [2, 3],
      caption: "pytest instantiates the class per test method and cannot pass constructor arguments, so a class with `__init__` is skipped rather than failed. Use a fixture for the setup (Lesson 9.3) — that is what fixtures are for, and it makes the dependency visible in the signature."
    },

    { t: "callout", kind: "trap", title: "import file mismatch", body: [
      { t: "code", lang: "bash", title: "the error everyone hits once", numbered: false, code: `$ pytest
ERROR collecting tests/api/test_utils.py
import file mismatch:
imported module 'test_utils' has this __file__ attribute:
  /repo/tests/core/test_utils.py
which is not the same as the test file we want to collect:
  /repo/tests/api/test_utils.py
HINT: remove __pycache__ / use unique basenames / add __init__.py`},
      { t: "p", text: "**The mechanism is `sys.modules`, not pytest.** In the default `prepend` import mode, pytest inserts each test file's directory onto `sys.path` and imports the file by its basename. Two files called `test_utils.py` in different folders therefore both want the module name `test_utils`, and the second import finds the first already in `sys.modules` with a different `__file__`." },
      { t: "ul", items: [
        "**Add `__init__.py` to every test directory.** The files then import as `tests.api.test_utils` and `tests.core.test_utils` — distinct names, no collision. This is the fix that also makes shared test helpers importable by a stable path.",
        "**Or set `importmode = importlib`** in your pytest config, which imports each file under a unique name and stops touching `sys.path` altogether. It is the modern recommendation and it composes properly with a `src/` layout.",
        "**Do not just rename the files.** It works until the next pair collides, and it forces unnatural names on tests that legitimately mirror two same-named modules."
      ]},
      { t: "p", text: "The same mechanism explains why a `src/` layout is worth the extra folder: with the package under `src/`, an accidental import of your working tree instead of the installed package is impossible, so the tests exercise the artefact you actually ship (Lesson 7.5)." }
    ]},

    { t: "code", lang: "toml", title: "pyproject.toml — the configuration worth having on day one", code: `
[tool.pytest.ini_options]
minversion = "8.0"
testpaths = ["tests"]              # where collection starts, so CI and local agree
addopts = [
    "-ra",                          # summary for every non-passing outcome
    "--strict-markers",             # an unregistered marker is an error, not a typo
    "--strict-config",              # a typo in this file is an error
    "--import-mode=importlib",
]
markers = [
    "integration: needs a real database or network",
    "slow: takes more than a second",
]
filterwarnings = ["error"]         # a new DeprecationWarning fails the build
`,
      caption: "`--strict-markers` is the highest-value line here: without it, `@pytest.mark.integraton` is silently accepted as a new marker, and `-m 'not integration'` quietly runs the test you meant to exclude. `filterwarnings = [\"error\"]` turns a library's deprecation notice into a failure while you still have time to act on it."
    },

    { t: "h2", n: "03", text: "Reading a failure report", id: "reading-failures" },

    { t: "p", text: "A pytest failure has four sections and most people read one. The other three are where the cause usually is." },

    { t: "code", lang: "bash", title: "one failure, annotated", numbered: false, code: `=================================== FAILURES ===================================
______________________ test_checkout_charges_once[card] _______________________   (1)

client = <TestClient>, gateway = <FakeGateway charges=2>                          (2)

    def test_checkout_charges_once(client, gateway):
        client.post("/checkout", json={"order_id": "o-1"})
>       assert gateway.charge_count == 1
E       assert 2 == 1                                                            (3)
E        +  where 2 = <FakeGateway charges=2>.charge_count

tests/test_checkout.py:41: AssertionError
---------------------------- Captured stdout call -----------------------------   (4)
retrying charge for o-1 after ConnectionResetError
------------------------------ Captured log call ------------------------------
WARNING  payments.gateway:gateway.py:88 transient failure, attempt 1/3
=========================== short test summary info ============================   (5)
FAILED tests/test_checkout.py::test_checkout_charges_once[card] - assert 2 == 1
========================= 1 failed, 214 passed in 3.11s ========================`},

    { t: "dl", items: [
      ["**(1) The node id**", "`file::test[param]` — the exact argument to rerun just this test. Copy it; do not re-run the suite."],
      ["**(2) The fixture line**", "Every fixture the test received, with its repr. A useful `__repr__` on your fakes turns this line into free diagnostics — here it already says the fake saw two charges."],
      ["**(3) The `E` lines**", "The rewritten explanation. The `+ where` lines show how each side was computed, which is how you tell a wrong value from a wrong attribute."],
      ["**(4) Captured output**", "stdout, stderr and log records from the test, shown only on failure. This is where the retry that caused the double charge is visible — and it is the section people skip."],
      ["**(5) Short summary**", "One line per non-passing test, enabled by `-ra`. On a 40-failure run this is the only section worth reading first, because it exposes the pattern."]
    ]},

    { t: "table",
      head: ["Flag", "Does", "Use it when"],
      rows: [
        ["`-x`", "Stop at the first failure", "The suite is red and you want one problem at a time"],
        ["`--lf` / `--ff`", "Run last-failed only / failures first", "The tight loop while fixing. `--ff` keeps the rest running behind them"],
        ["`-k 'refund and not slow'`", "Select by name expression", "Narrowing without editing markers"],
        ["`-m integration`", "Select by registered marker", "Splitting fast and slow suites in CI (Lesson 9.8)"],
        ["`--durations=10`", "Print the ten slowest tests", "The first command to run on a suite that takes too long"],
        ["`-vv`", "Full diffs, no truncation", "When the diff says `...` exactly where you need to look"],
        ["`-s`", "Do not capture output", "A `print`-and-`breakpoint()` session; never in CI"],
        ["`-p no:randomly`", "Disable test-order randomisation", "Proving a failure is order-dependent rather than real"]
      ]
    },

    { t: "h2", n: "04", text: "Assertions that name the defect", id: "assertions" },

    { t: "ladder",
      title: "Three ways to assert the same thing",
      rungs: [
        { level: "bad", label: "Assert on a reduction", why: "the failure message throws the evidence away",
          code: `def test_no_validation_errors():
    errors = validate(payload)
    assert len(errors) == 0

# E       assert 3 == 0
# E        +  where 3 = len([...])`,
          note: "The one thing you need — *which* three errors — has been reduced to the number 3 before pytest ever saw it. You now open a debugger to learn something the test already had in its hands. The same applies to `assert result is not None`, `assert response.ok` and `assert x in y` on large collections." },

        { level: "ok", label: "Assert on the collection", why: "the values survive into the message",
          code: `def test_no_validation_errors():
    assert validate(payload) == []

# E       assert ['email: missing @',
# E               'age: -3 is negative',
# E               'country: XX unknown'] == []`,
          note: "Comparing the whole object costs nothing and the rewriter prints both sides. **The general rule: assert on the richest value you have, not on a summary of it.** `== []` beats `len(...) == 0`; `== expected_dict` beats four separate key checks." },

        { level: "best", label: "Assert the whole shape at once", why: "one failure shows every difference",
          code: `def test_quote_for_eu_customer():
    quote = price(order, country="DE")

    assert quote == Quote(
        subtotal=Decimal("100.00"),
        vat=Decimal("19.00"),
        total=Decimal("119.00"),
        currency="EUR",
    )

# E   assert Quote(subtotal=Decimal('100.00'), vat=Decimal('20.00'), ...)
# E        == Quote(subtotal=Decimal('100.00'), vat=Decimal('19.00'), ...)
# E     Matching attributes: ['subtotal', 'currency']
# E     Differing attributes: ['vat', 'total']`,
          note: "Four separate assertions stop at the first failure, so you fix the VAT rate, rerun, and *then* discover the total is wrong too. One structural comparison reports every difference in a single run — and pytest expands dataclass and attrs comparisons attribute by attribute, which is a strong argument for the value objects of Lesson 4.10." }
      ]
    },

    { t: "code", lang: "python", title: "asserting that something raises", code: `
import pytest


def test_refund_over_total_is_rejected():
    # match= is a REGEX searched against str(exception). Without it, this
    # test passes when the code raises ValueError for any reason at all --
    # including a typo in your own test setup.
    with pytest.raises(ValueError, match=r"exceeds order total"):
        service.refund("o-1", amount=Decimal("100.01"))


def test_error_carries_the_order_id():
    # Bind the exception when you need to assert on its attributes.
    with pytest.raises(RefundError) as exc_info:
        service.refund("missing", amount=Decimal("1.00"))

    assert exc_info.value.order_id == "missing"
    assert exc_info.value.__cause__ is not None       # chained (Lesson 6.3)


def test_floats_need_a_tolerance():
    # 0.1 + 0.2 != 0.3. approx has sensible relative tolerance built in.
    assert 0.1 + 0.2 == pytest.approx(0.3)
    # For money, do not reach for approx -- use Decimal and compare exactly.
`,
      hl: [7, 8],
      caption: "**Never write `pytest.raises(Exception)`.** It passes when your test calls a misspelled method, when a fixture blows up, and when the code raises the wrong error for the wrong reason — a test that can only pass, which is the same as no test."
    },

    { t: "callout", kind: "good", title: "Name tests after the behaviour, not the function", body: [
      { t: "code", lang: "python", title: "the name is the failure message", numbered: false, code: `
# Names the unit under test. Tells a reader nothing on failure.
def test_refund(): ...
def test_refund_2(): ...
def test_refund_edge_case(): ...

# Names the guarantee. The CI failure line is now a bug report.
def test_refund_above_order_total_is_rejected(): ...
def test_repeated_refund_moves_money_once(): ...
def test_refund_of_cancelled_order_raises_not_refundable(): ...`},
      { t: "p", text: "The short summary prints only the node id, so the test name *is* what the on-call engineer reads at 3am. A name that states the rule turns a red build into a diagnosis, and it also makes the duplicate tests obvious — two tests cannot honestly share a behavioural name." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A suite that reports success and tests nothing",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A colleague hands over the file below. `pytest` prints `1 passed` and they are satisfied. There are seven distinct problems: two stop tests from being collected at all, three make an assertion incapable of failing, and two make a genuine failure hard to diagnose." },
        { t: "code", lang: "python", title: "tests/api/test_utils.py — as found", code: `
from checkout import CheckoutService, InvalidCoupon


class TestCheckout:
    def __init__(self):
        self.svc = CheckoutService()

    def test_applies_coupon(self):
        assert self.svc.quote("o-1", coupon="SUMMER")


def check_rejects_expired_coupon():
    svc = CheckoutService()
    try:
        svc.quote("o-1", coupon="EXPIRED")
    except Exception:
        pass


def test_quote_has_no_errors():
    svc = CheckoutService()
    quote = svc.quote("o-1", coupon="SUMMER")
    assert len(quote.errors) == 0
    assert quote.total
    assert svc.validate_coupon


@pytest.mark.slow_intergration
def test_totals(self):
    assert CheckoutService().quote("o-1").total == 100
`}
      ],
      requirements: [
        "Name each of the seven problems and the mechanism behind it — not just what to change.",
        "Make every test collectable, and prove it by stating what `pytest --collect-only` prints before and after.",
        "Replace each assertion that cannot fail with one whose failure message identifies the defect.",
        "Assert the exception properly, including that it is the *right* exception for the right reason.",
        "Write the `pyproject.toml` section that would have turned the marker typo into an error.",
        "The file lives at `tests/api/test_utils.py` and another `test_utils.py` exists under `tests/core/`. Fix that collision at the root, not by renaming."
      ],
      hint: "Three of the assertions are true for reasons unrelated to correctness. One of them is true even if the method it names is deleted and replaced by a typo — look at what a bare name evaluates to.",
      solution: {
        lang: "python",
        title: "tests/api/test_utils.py — repaired",
        code: `"""Seven problems, seven mechanisms.

 1. class TestCheckout has __init__       -> pytest cannot instantiate it per
                                             test, so it SKIPS the class with a
                                             PytestCollectionWarning. Zero tests,
                                             no failure.
 2. check_rejects_expired_coupon          -> does not match test_*, so it is not
                                             collected. It is dead code.
 3. try/except Exception: pass            -> passes whether the code raises the
                                             right error, the wrong error, or
                                             nothing at all.
 4. assert len(quote.errors) == 0         -> discards the errors before pytest
                                             can print them: "assert 3 == 0".
 5. assert quote.total                    -> truthiness. Decimal("0.00") is
                                             falsy, and 999999 is truthy, so
                                             this passes for a wrong total and
                                             fails for a legitimately free order.
 6. assert svc.validate_coupon            -> a bound METHOD object, always
                                             truthy. Still passes after the
                                             method is deleted and misspelled.
 7. @pytest.mark.slow_intergration        -> typo silently registers a new
                                             marker, so -m "not slow_integration"
                                             does not exclude it. Also: a bare
                                             function taking self is collected
                                             and errors with a fixture lookup
                                             failure for "self".

 Collection before:  1 test   (test_quote_has_no_errors)
 Collection after:   6 tests
"""

from decimal import Decimal

import pytest

from checkout import CheckoutService, CouponExpired, Quote


@pytest.fixture
def svc() -> CheckoutService:
    """Replaces the __init__ that killed collection.

    A fixture states the dependency in the test signature and is rebuilt
    per test, which is exactly what the constructor was trying to do.
    """
    return CheckoutService()


class TestCoupons:
    """A class with no __init__ is collected normally.

    Grouping is the only thing the class buys here; fixtures still arrive
    as parameters, so there is no shared mutable state between methods.
    """

    def test_valid_coupon_reduces_the_total(self, svc: CheckoutService) -> None:
        quote = svc.quote("o-1", coupon="SUMMER")

        # The whole shape at once: one run reports every difference.
        assert quote == Quote(
            subtotal=Decimal("100.00"),
            discount=Decimal("10.00"),
            total=Decimal("90.00"),
            errors=[],
        )

    def test_expired_coupon_raises_coupon_expired(self, svc) -> None:
        # A specific type AND a match on the message: this can no longer
        # pass because of a typo in the test itself.
        with pytest.raises(CouponExpired, match=r"SUMMER19 expired on 2019"):
            svc.quote("o-1", coupon="SUMMER19")

    def test_expired_coupon_leaves_the_order_untouched(self, svc) -> None:
        with pytest.raises(CouponExpired):
            svc.quote("o-1", coupon="SUMMER19")

        assert svc.quote("o-1").total == Decimal("100.00")


def test_quote_reports_no_errors(svc: CheckoutService) -> None:
    # == [] instead of len(...) == 0, so a failure prints the errors.
    assert svc.quote("o-1", coupon="SUMMER").errors == []


def test_quote_total_is_exact(svc: CheckoutService) -> None:
    # An exact Decimal, not truthiness. A free order (0.00) is a legitimate
    # value that the truthiness version would have rejected.
    assert svc.quote("o-1", coupon="SUMMER").total == Decimal("90.00")


def test_validate_coupon_rejects_unknown_codes(svc: CheckoutService) -> None:
    # CALL the method. "assert svc.validate_coupon" tested that a bound
    # method object is truthy, which it always is.
    assert svc.validate_coupon("NOPE") is False
    assert svc.validate_coupon("SUMMER") is True


@pytest.mark.slow
def test_full_quote_matches_the_pricing_sheet(svc: CheckoutService) -> None:
    """Marker spelled correctly, and registered in pyproject.toml.

    With --strict-markers the old typo would have failed collection with
    "Unknown pytest.mark.slow_intergration" instead of quietly creating a
    marker that no -m expression ever matches.
    """
    assert svc.quote("o-1").total == Decimal("100.00")`,
        notes: [
          { t: "p", text: "**Problem 6 is the one worth internalising.** `assert svc.validate_coupon` asserts that a bound method object is truthy — which it always is. The test survives renaming the method, deleting its body, or replacing it with a property that raises on call, because the name is never invoked. The same shape appears as `assert mock.called_once` in mocking (Lesson 9.5), and both are invisible in review unless you are looking for a missing pair of parentheses." },
          { t: "p", text: "**Problem 5 is the argument against truthiness assertions generally.** `assert quote.total` is false for `Decimal(\"0.00\")` and true for every wrong non-zero number, so it fails on the one legitimate edge case and passes on the whole space of defects. Assert the value." },
          { t: "p", text: "**The `try/except Exception: pass` idiom is worse than deleting the test**, because it reports a pass. It succeeds when nothing raises, when the wrong exception raises, and when your own setup line raises before reaching the code under test. `pytest.raises(SpecificError, match=...)` fails in all three of those cases." },
          { t: "code", lang: "toml", title: "pyproject.toml — the configuration that catches problems 6 and 7 mechanically", code: `
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["-ra", "--strict-markers", "--strict-config", "--import-mode=importlib"]
markers = [
    "slow: takes more than a second",
    "integration: needs a real database or network",
]
filterwarnings = [
    "error",
    # A collection warning must never be silent -- this is what makes the
    # skipped TestCheckout class an actual failure.
    "error::pytest.PytestCollectionWarning",
]`},
          { t: "callout", kind: "insight", title: "The name collision, fixed at the root", body: [
            { t: "p", text: "`tests/api/test_utils.py` and `tests/core/test_utils.py` collide because the default `prepend` import mode inserts each test file's directory on `sys.path` and imports by basename — so both want the module name `test_utils`, and the second import finds the first in `sys.modules`." },
            { t: "p", text: "`--import-mode=importlib` imports each file under a unique name and never touches `sys.path`, which removes the whole class of problem and stops your tests from accidentally importing the working tree instead of the installed package. Adding `__init__.py` to each test directory also works, by making the names `tests.api.test_utils` and `tests.core.test_utils`. Renaming the files fixes only this pair, and the next collision is someone else's afternoon." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments team splits its test suite into `tests/unit` and `tests/integration` and adds `-m 'not integration'` to the fast pull-request job. Six weeks later a schema change ships that drops a column still referenced in a query. The integration test covering it exists, is correct, and never ran — in either job." },
      { t: "p", text: "**The mechanism: a marker typo plus no strict-markers.** The test was decorated `@pytest.mark.integratoin`. Without `--strict-markers`, pytest accepts any attribute on `pytest.mark` as a new marker, so nothing complained. The pull-request job's `-m 'not integration'` did not match the misspelled marker, so the test *should* have run there — but the nightly integration job selected with `-m integration`, which also did not match. The test fell between two filters and was executed by neither, while `pytest --collect-only` cheerfully listed it." },
      { t: "p", text: "**The fix is two lines of configuration.** `--strict-markers` in `addopts` plus a `markers` list turns an unregistered marker into a collection error, so the typo fails the build the moment it is written. `--strict-config` does the same for the config file itself." },
      { t: "p", text: "The general lesson: **selection is a silent operation.** A `-m` or `-k` expression that matches nothing exits successfully with `no tests ran`, and CI treats that as green. Any job that filters tests should also assert a floor — `--strict-markers` for the marker names, and a plugin or a grep on the collected count for the number of tests that must run." }
    ]}
  ],

  takeaways: [
    "**pytest rewrites the AST of the modules it imports**, expanding each `assert` into intermediates plus an explanation. That is why a plain `assert` prints a diff.",
    "Only test modules, `conftest.py` and registered plugins are rewritten. **Assertions in a `tests/helpers.py` produce a bare `AssertionError`** unless you call `pytest.register_assert_rewrite` before it is imported — or better, return data and assert in the test.",
    "**A test that is not collected is indistinguishable from a passing test.** A class with `__init__` is skipped with a warning; a function not named `test_*` is dead code.",
    "`import file mismatch` comes from `sys.modules`, not pytest: in `prepend` mode two files with the same basename claim the same module name. Fix it with `--import-mode=importlib` or `__init__.py` files, not by renaming.",
    "**Set `--strict-markers` on day one.** Without it a marker typo silently creates a new marker, and a test can fall between `-m integration` and `-m 'not integration'` and run in neither job.",
    "Read all four sections of a failure: the node id to rerun, the fixture reprs, the `E` explanation with its `+ where` lines, and the **captured output**, which is where the cause usually is.",
    "**Assert on the richest value you have.** `== []` beats `len(...) == 0`; comparing a whole dataclass reports every differing attribute in one run instead of one per rerun.",
    "**Truthiness assertions pass for the wrong reasons.** `assert quote.total` fails on a legitimate `Decimal('0.00')` and passes on every wrong non-zero value.",
    "`assert svc.method` without parentheses asserts that a bound method object is truthy — always true, even after the method is deleted and misspelled.",
    "**Never `pytest.raises(Exception)`.** Use the specific type plus `match=`, or the test also passes when your own setup line raises.",
    "Name tests after the guarantee, not the function. The short summary prints only the node id, so the name is what an on-call engineer reads first."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You move a repeated assertion into `tests/helpers.py`. Failures now show a bare `AssertionError` with no values. Why?",
        options: [
          "Helper modules run with optimisations enabled, which strips assertions",
          "pytest only rewrites assertions in modules it collects — test modules, `conftest.py` and registered plugins — so the helper was imported by the ordinary machinery and never transformed",
          "The diff is suppressed because the assertion is not in a `test_*` function",
          "Assertions only produce diffs inside a `pytest.raises` block"
        ],
        answer: 1,
        why: "The explanation comes from pytest's `AssertionRewritingHook`, a meta path finder that parses a module to an AST, expands each `assert` into captured intermediates plus an explanation builder, and compiles that. It runs only for modules pytest knows about; `tests/helpers.py` is imported normally, before pytest has any reason to look at it. `pytest.register_assert_rewrite(\"tests.helpers\")` in the root `conftest.py` fixes it, but returning the data and asserting in the test is usually better — the failure then appears on the line the reader is looking at. `-O` does strip asserts, but that is not what happened here."
      },
      {
        stem: "A test class is written as `class TestCheckout` with an `__init__` that builds a client. `pytest` reports `no tests ran`. What happened?",
        options: [
          "The class name must end in `Test` rather than begin with it",
          "pytest instantiates a collected class once per test method and cannot supply constructor arguments, so a class defining `__init__` is skipped with a `PytestCollectionWarning`",
          "Test classes must inherit from `unittest.TestCase`",
          "The methods need the `@pytest.mark.test` decorator"
        ],
        answer: 1,
        why: "Collection requires pytest to create a fresh instance per test method, which it cannot do for a class with a constructor — so it skips the class and emits a warning that scrolls past unread. The correct home for that setup is a fixture, which declares the dependency in the test signature and is rebuilt per test. `Test*` is the default prefix and is correct here, inheriting from `TestCase` is unnecessary, and there is no `@pytest.mark.test`. Adding `filterwarnings = [\"error::pytest.PytestCollectionWarning\"]` turns this silent skip into a hard failure."
      },
      {
        stem: "Which assertion is true even after the method it names is deleted and replaced by a misspelling?",
        options: [
          "`assert svc.validate_coupon(\"NOPE\") is False`",
          "`assert svc.validate_coupon`",
          "`assert svc.validate_coupon(\"NOPE\") == False`",
          "`with pytest.raises(AttributeError): svc.validate_coupon(\"NOPE\")`"
        ],
        answer: 1,
        why: "A bare attribute reference evaluates to a bound method object, which is always truthy, so the assertion passes without ever invoking anything. If the method is renamed the attribute lookup raises `AttributeError` and the test fails — but if it is replaced by any other attribute, or if a `__getattr__` supplies something, it keeps passing. The two calling forms actually invoke the method and would fail, and the `pytest.raises` version deliberately asserts absence. The same missing-parentheses shape appears as `assert mock.called_once`, where `Mock` auto-creates the attribute and it is truthy forever."
      },
      {
        stem: "A test decorated `@pytest.mark.integratoin` ran in neither the `-m integration` job nor the `-m 'not integration'` job. How is that possible, and what prevents it?",
        options: [
          "A typo in a marker cannot affect selection; the test must have been skipped for another reason",
          "Without `--strict-markers`, any attribute on `pytest.mark` becomes a valid marker, so the misspelled marker matched neither expression — `--strict-markers` plus a registered `markers` list makes it a collection error",
          "Markers only work on classes, not functions",
          "The test needed `-p no:cacheprovider` to be selected"
        ],
        answer: 1,
        why: "`pytest.mark` accepts arbitrary attribute names by default, so the typo silently creates a marker nobody selects on. The `-m integration` job did not match it and the `-m 'not integration'` job — which should have run it — was itself misconfigured in the incident to select a positive set, leaving the test in neither. Registering markers in the config and adding `--strict-markers` turns the typo into an immediate collection error. The deeper habit is to remember that selection is silent: a `-m` or `-k` expression matching nothing exits zero with `no tests ran`, which CI reports as green."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How does pytest turn a plain `assert` into a detailed failure message?",
        strong: "It installs an import hook — a meta path finder — that parses each module it collects into an AST and rewrites every `assert` into code that stores each subexpression in a temporary and builds an explanation before raising. So the values are captured at the moment of comparison, not reconstructed afterwards. It applies to test modules, `conftest.py` and registered plugins only.",
        answer: [
          { t: "p", text: "The scope limitation is the part that shows you have hit it in practice: assertions in a `tests/helpers.py` produce a bare `AssertionError`, because that module was imported by ordinary machinery before pytest looked at it." },
          { t: "p", text: "Two fixes, and a preference between them: `pytest.register_assert_rewrite(\"tests.helpers\")` in the root `conftest.py` before anything imports it, or — better — have the helper *return* the data and let the test assert, so the failing comparison stays on the line the reader is looking at." },
          { t: "p", text: "A good closing detail: the rewritten bytecode is cached in `__pycache__`, so the transformation costs one compile, not one per run." }
        ]
      },
      {
        level: "core",
        q: "A colleague's test file reports `1 passed` but you think it tests nothing. What do you look for?",
        strong: "Assertions that cannot fail and tests that were never collected. Truthiness assertions like `assert quote.total`, bare attribute references like `assert svc.validate_coupon` that never call anything, `try/except Exception: pass`, and `pytest.raises(Exception)` without a `match`. Then `pytest --collect-only` to see whether the functions and classes are actually being picked up.",
        answer: [
          { t: "p", text: "Leading with `--collect-only` is a strong move, because the invisible failures are the worst ones: a class with `__init__` is skipped with a warning, and a function named `check_*` is simply dead code that lints clean." },
          { t: "p", text: "For assertion quality, the rule to state is: assert the richest value you have. `assert errors == []` prints the errors; `assert len(errors) == 0` prints `assert 3 == 0` and sends you to a debugger for information the test already held." },
          { t: "p", text: "The missing-parentheses case is worth naming explicitly because it survives deletion of the thing it claims to test — a bound method object is always truthy, so the assertion passes forever." },
          { t: "p", text: "Finish on the mechanical defences rather than vigilance: `--strict-markers`, `--strict-config`, `filterwarnings = [\"error\"]`, and treating `PytestCollectionWarning` as an error. Those catch four of these classes without anyone having to review carefully." }
        ]
      },
      {
        level: "advanced",
        q: "What is `import file mismatch` and how do you fix it properly?",
        strong: "Two test files share a basename. In the default `prepend` import mode pytest puts each test file's directory on `sys.path` and imports the file by basename, so both want the module name `test_utils` — and the second import finds the first already in `sys.modules` with a different `__file__`. The proper fixes are `--import-mode=importlib`, which imports each file under a unique name and never touches `sys.path`, or `__init__.py` files that give the modules package-qualified names.",
        answer: [
          { t: "p", text: "Attributing it to `sys.modules` rather than to pytest is what makes the answer sound like understanding rather than a remembered incantation — and it explains why deleting `__pycache__`, the hint in the error message, sometimes appears to work and then does not." },
          { t: "p", text: "Say why renaming files is the wrong fix: it resolves this pair only, forces unnatural names on tests that legitimately mirror two same-named modules, and the next collision costs someone else an afternoon." },
          { t: "p", text: "The related point that earns credit: the same import mechanics are the argument for a `src/` layout. With the package under `src/`, tests cannot accidentally import the working tree instead of the installed distribution, so the suite exercises what you actually ship." }
        ],
        weak: "Saying \"just add `__init__.py` everywhere\" with no mechanism. It happens to work, and it leaves you unable to explain why `importlib` mode is now the recommended default."
      }
    ]
  }
});
