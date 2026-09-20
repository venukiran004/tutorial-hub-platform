/* ============================================================================
   LESSON 9.1 — What to Test, and What Not To
   ========================================================================= */
EC.receiveLesson({
  id: "9.1",

  lede: "Most untrustworthy test suites are not small — they are large. Thousands of tests that pass, break on every refactor, and still let the bug through. The way out is to stop asking *is this covered* and start asking **what will I know when this test fails**. A test that cannot answer that question is costing you more than it returns.",

  objectives: [
    "Decide what deserves a test from the cost of the code being wrong",
    "Explain what the pyramid optimises for, and diagnose the two shapes teams actually end up with",
    "Read a coverage number for what it measures — and name three defects it cannot see",
    "Identify the tests in a suite worth deleting, and justify each deletion",
    "Predict which tests will fail for reasons unrelated to any bug"
  ],

  prerequisites: ["3.1", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "A test is a question with a cost", id: "what-tests-are-for" },

    { t: "p", text: "Every test you write is a permanent liability: it must be read, maintained, and kept passing for as long as the code lives. It pays for itself only by doing one of three jobs — and the third one is the one people forget." },

    { t: "dl", items: [
      ["**Regression fence**", "It fails when a specific behaviour breaks. Value = the cost of that behaviour breaking unnoticed × how likely it is to break."],
      ["**Design pressure**", "Writing it forces the code into a shape you can call from outside. Most of the value here is collected *before* the test ever runs."],
      ["**Executable specification**", "It states what the code is supposed to do in a form that cannot go stale, because staleness makes it fail. Prose documentation cannot do this."]
    ]},

    { t: "callout", kind: "mental", title: "The failure question", body: [
      { t: "p", text: "Before writing a test, answer this out loud: **if this test fails a year from now, what will the person reading the failure know?**" },
      { t: "ul", items: [
        "*Good answer:* \"Refunds of part-paid orders now round the wrong way.\" That test earns its place forever.",
        "*Bad answer:* \"Something in `OrderService` changed.\" That test will be deleted by whoever is unlucky enough to hit it during a refactor.",
        "*Worst answer:* \"The implementation no longer calls `save()` twice.\" That test does not describe behaviour at all — it describes last year's code."
      ]},
      { t: "p", text: "The question also tells you where to put the test. If the answer involves two components interacting, a unit test with fakes on both sides cannot give it to you." }
    ]},

    { t: "h2", n: "02", text: "The pyramid, and the shapes teams actually have", id: "pyramid" },

    {"kind": "layers", "title": "The test pyramid", "caption": "Many fast unit tests at the base, fewer integration tests, a handful of end-to-end checks at the top. The shape is about cost: a unit test runs in microseconds and pins one decision; an end-to-end test runs in seconds and pins nothing in particular.", "taper": true, "items": [{"label": "end-to-end", "sub": "a few · slow · the whole system", "tone": "crit"}, {"label": "integration", "sub": "some · real database, stubbed HTTP", "tone": "warn"}, {"label": "unit", "sub": "many · milliseconds · one function", "tone": "good"}], "t": "diagram", "id": "dg-9_1-02-0"},


    { t: "p", text: "The pyramid is not a statement about virtue. It is a statement about **cost per unit of confidence**: tests near the bottom are cheap to run and pinpoint the fault; tests near the top are expensive and slow but prove the parts actually fit. You want a lot of the cheap ones and enough of the expensive ones." },

    { t: "viz",
      title: "Three suite shapes and what each one feels like",
      caption: "The shape is a consequence, not a choice. A cone forms when the code cannot be tested in isolation, so the only tests anyone can write are end-to-end. The hourglass forms when the middle layer is dismissed as 'not real unit tests' — and it is the layer that catches most integration bugs at a fraction of end-to-end cost.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram comparing a test pyramid, an inverted ice-cream cone suite, and an hourglass suite">
  <defs>
    <marker id="n91" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--good)">HEALTHY — PYRAMID</text>
  <polygon points="145,36 185,96 105,96" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.4"/>
  <text x="145" y="76" text-anchor="middle" class="s-sub" style="font-size:9px">e2e</text>
  <polygon points="105,100 185,100 215,160 75,160" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.4"/>
  <text x="145" y="136" text-anchor="middle" class="s-sub">integration</text>
  <polygon points="75,164 215,164 255,244 35,244" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="145" y="212" text-anchor="middle" class="s-sub">unit</text>
  <text x="145" y="268" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">fast, pinpoints the fault</text>
  <text x="145" y="284" text-anchor="middle" class="s-sub">suite runs in seconds</text>

  <line x1="300" y1="20" x2="300" y2="284" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="330" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--crit)">ICE-CREAM CONE</text>
  <polygon points="385,36 525,36 525,116 385,116" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.4"/>
  <text x="455" y="82" text-anchor="middle" class="s-sub">e2e / UI</text>
  <polygon points="405,120 505,120 505,176 405,176" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.4"/>
  <text x="455" y="152" text-anchor="middle" class="s-sub">integration</text>
  <polygon points="435,180 475,180 475,244 435,244" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="455" y="216" text-anchor="middle" class="s-sub" style="font-size:9px">unit</text>
  <text x="455" y="268" text-anchor="middle" class="s-sub" style="fill:var(--crit)">40-minute suite, flaky</text>
  <text x="455" y="284" text-anchor="middle" class="s-sub">a failure names no cause</text>

  <line x1="610" y1="20" x2="610" y2="284" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="640" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--warn)">HOURGLASS</text>
  <polygon points="690,36 830,36 830,96 690,96" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.4"/>
  <text x="760" y="72" text-anchor="middle" class="s-sub">e2e</text>
  <polygon points="745,100 775,100 775,164 745,164" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.4"/>
  <text x="798" y="136" class="s-sub" style="fill:var(--warn)">missing middle</text>
  <polygon points="690,168 830,168 830,244 690,244" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="760" y="210" text-anchor="middle" class="s-sub">unit (heavily mocked)</text>
  <text x="760" y="268" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">every unit passes,</text>
  <text x="760" y="284" text-anchor="middle" class="s-sub">the wiring is still wrong</text>
</svg>`
    },

    { t: "table",
      head: ["Level", "Proves", "Cannot prove", "Budget"],
      rows: [
        ["**Unit**", "A decision, calculation or state transition is correct in isolation", "That the pieces are wired together, or that your fakes match reality", "Milliseconds. Thousands of them."],
        ["**Integration**", "Your code and one real collaborator agree — the SQL runs, the schema matches, the JSON round-trips", "That the whole user journey works", "Under a second each. Dozens to low hundreds."],
        ["**End-to-end**", "A complete journey works against a running system", "Anything specific — a failure tells you *something* broke", "Seconds to minutes each. A handful, on the paths that cost money."]
      ],
      caption: "The numbers are ratios, not quotas. A payments service with three end-to-end tests covering charge, refund and webhook replay is better served than one with sixty covering every form field."
    },

    { t: "callout", kind: "insight", title: "Why the cone forms, and why adding unit tests will not fix it", body: [
      { t: "p", text: "Teams do not choose a cone. They arrive at one because the code cannot be constructed without infrastructure — the `__init__` that opens a database connection (Lesson 4.1), the module-level client, the function that reads `datetime.now()` and the environment. When isolating a component costs an afternoon of mocking, everybody writes the end-to-end test instead, because it is the only test that can be written at all." },
      { t: "p", text: "So the cone is a **design symptom**, and the fix is a design fix. Lesson 9.6 is that fix. Mandating unit tests on untestable code produces the hourglass instead: a mock for every collaborator, tests that pass, and wiring that is still wrong." }
    ]},

    { t: "h2", n: "03", text: "Risk chooses the tests, not coverage", id: "risk" },

    { t: "p", text: "Ask what it costs if this specific line is wrong and nobody notices for a month. That number, multiplied by the chance of it being wrong, is the test budget for that code. It is wildly uneven across a codebase, and a coverage percentage flattens exactly the distinction that matters." },

    { t: "table",
      head: ["Code", "Cost of being silently wrong", "Test it like this"],
      rows: [
        ["Money arithmetic, tax, proration, refunds", "Financial loss, restated accounts, regulatory exposure", "Exhaustive table-driven unit tests, including rounding boundaries (Lesson 9.4)"],
        ["Authorisation checks", "Data breach", "One unit test per rule, plus an integration test per endpoint proving the check is actually wired in"],
        ["Parsers and deserialisers of external input", "Silent data corruption spreading downstream", "Table tests over real captured payloads, including malformed ones"],
        ["Retry and idempotency logic", "Duplicate charges (Lesson 3.7)", "Unit tests that simulate a lost response, plus one integration test with a real repeated key"],
        ["Data migrations", "Irreversible corruption", "Test on a copy of production-shaped data. Test the rollback too."],
        ["A CRUD endpoint that stores a nickname", "A user retypes a nickname", "One integration test on the happy path. That is the whole budget."],
        ["A `__repr__`", "Nothing", "No test. Ever."]
      ]
    },

    { t: "callout", kind: "trap", title: "Six things that look like tests and are not", body: [
      { t: "ul", items: [
        "**Testing the framework.** A test asserting that SQLAlchemy persists a column, or that FastAPI returns 422 for a missing field, tests somebody else's library. They have their own suite.",
        "**Testing a getter.** `assert order.total == 100` after `Order(total=100)` asserts that Python assignment works.",
        "**Testing your mock.** If the test configures `repo.get.return_value = order` and then asserts `repo.get.called`, the only thing proved is that you configured a mock (Lesson 9.5).",
        "**Testing private helpers directly.** Every test on a `_name` is a test of an implementation detail — it will break on a refactor that changed no behaviour, which is the definition of a false alarm.",
        "**Snapshot tests nobody reads.** A 400-line approved blob gets regenerated whenever it fails, because reviewing the diff is impossible. It is a rubber stamp with a CI cost.",
        "**Tests that restate the code.** If the test computes the expected value with the same expression the implementation uses, it will agree with the implementation even when both are wrong. Write the expected value out by hand."
      ]},
      { t: "code", lang: "python", title: "the last one, concretely", numbered: false, code: `
# Useless: if the formula is wrong, the test is wrong in the same way.
def test_line_total():
    item = LineItem(price=Decimal("19.99"), qty=3, tax_rate=Decimal("0.2"))
    expected = item.price * item.qty * (1 + item.tax_rate)
    assert item.total() == expected


# Useful: the expected value was computed by a human, once, on paper.
# If the formula changes, this fails -- which is the entire point.
def test_line_total():
    item = LineItem(price=Decimal("19.99"), qty=3, tax_rate=Decimal("0.2"))
    assert item.total() == Decimal("71.96")     # 59.97 + 11.994 -> 71.96`,
        hl: [4, 5]},
      { t: "p", text: "Hand-computed expected values are the single cheapest quality upgrade available to a suite. They convert a test from *self-consistent* to *independently verified*." }
    ]},

    { t: "h2", n: "04", text: "What coverage measures", id: "coverage" },

    { t: "p", text: "Line coverage answers exactly one question: **was this line executed by the test run?** It says nothing about whether anything was asserted, whether the assertion was meaningful, or whether the other branch was tried. Both properties are easy to demonstrate." },

    { t: "code", lang: "python", title: "100% line coverage, zero verification", code: `
# --- pricing.py ---------------------------------------------------------
from decimal import Decimal


def apply_discount(total: Decimal, percent: int) -> Decimal:
    if percent > 100:
        percent = 100
    return total - (total * percent / 100)     # BUG: no rounding to 2dp


# --- test_pricing.py ----------------------------------------------------
def test_apply_discount():
    apply_discount(Decimal("100.00"), 10)      # called. asserted: nothing.
    apply_discount(Decimal("100.00"), 150)
`,
      out: `$ pytest --cov=pricing --cov-report=term-missing

Name         Stmts   Miss  Cover   Missing
------------------------------------------
pricing.py       4      0   100%
------------------------------------------
TOTAL            4      0   100%

1 passed in 0.03s`,
      caption: "Four statements, all executed, 100%. The function returns `Decimal('90')` where it should return `Decimal('90.00')`, and a percentage of `33` produces `67.00000000000000000000000001`-shaped nonsense downstream. Coverage cannot see any of it, because coverage does not know what the answer should be."
    },

    { t: "code", lang: "python", title: "line coverage 100%, branch coverage 50%", code: `
def notify(user, order):
    if order.total > FRAUD_THRESHOLD:
        alert_fraud_team(order)      # covered by the one test
    send_receipt(user, order)


def test_notify_flags_large_orders():
    notify(user, Order(total=Decimal("99999")))
    assert fraud_alerts == [order]
`,
      out: `$ pytest --cov=notify --cov-report=term-missing
Name        Stmts   Miss  Cover
--------------------------------
notify.py       4      0   100%

$ pytest --cov=notify --cov-branch --cov-report=term-missing
Name        Stmts   Miss Branch BrPart  Cover   Missing
--------------------------------------------------------
notify.py       4      0      2      1    83%   2->4`,
      hl: [2, 3],
      caption: "The `if` was only ever taken one way, so the ordinary path — a normal-sized order that must *not* raise a fraud alert — was never executed. `--cov-branch` reports the untaken edge as `2->4`. **Always run coverage with `--cov-branch`**; without it the number systematically overstates what was exercised."
    },

    { t: "callout", kind: "trap", title: "The gate that manufactures fake tests", body: [
      { t: "p", text: "Set `fail_under = 90` on a suite sitting at 78% and watch what happens. The cheapest way for a developer under deadline to move the number is to write tests that call code and assert nothing — exactly the first example above. The gate is satisfied, the suite grows, and the confidence it reports is now actively false." },
      { t: "ul", items: [
        "**Coverage is a floor, never a target.** Its only honest use is spotting whole files and branches nobody tried at all.",
        "**Measure the diff, not the repo.** A tool like `diff-cover` requires the *lines you changed* to be covered. That is enforceable on a pull request without ever demanding a retrospective sprint of test-writing.",
        "**Ratchet, do not leap.** Let the threshold follow the current number upward and never drop. Lesson 9.8 sets this up in CI.",
        "**Spot-check with mutation testing.** `mutmut` or `cosmic-ray` flips `>` to `>=` and deletes lines, then reruns your suite. Every mutant that survives is a line your tests execute but do not verify. Run it on the money code once a quarter, not on everything nightly."
      ]},
      { t: "p", text: "Three defect classes coverage is structurally blind to: **wrong expected values**, since it never compares anything; **missing cases**, since a case nobody thought of has no lines to miss; and **everything about interaction** — N+1 queries, race conditions, and a check that runs but on the wrong object." }
    ]},

    { t: "h2", n: "05", text: "Tests worth deleting", id: "deleting" },

    { t: "p", text: "A test that has never caught a bug and breaks on every refactor is not neutral — it is a tax on all future change, and it trains the team to distrust red builds. Deleting it is a legitimate engineering act, not a failure of discipline." },

    { t: "ladder",
      title: "One rule, tested three ways",
      rungs: [
        { level: "bad", label: "Asserts the implementation", why: "breaks on refactors, catches no bugs",
          code: `def test_discount_applies(mocker):
    repo = mocker.Mock()
    logger = mocker.Mock()
    svc = PricingService(repo=repo, logger=logger)
    repo.get_rules.return_value = [Rule("SUMMER", 10)]

    svc.quote(order_id="o-1", code="SUMMER")

    repo.get_rules.assert_called_once_with("SUMMER")
    assert logger.info.call_count == 2
    assert svc._applied == ["SUMMER"]`,
          note: "Not one assertion is about the price. Rename `get_rules`, log once instead of twice, or drop the `_applied` list, and this fails — with no behaviour changed at all. Meanwhile the discount arithmetic could be wrong by a factor of ten and the test would still pass. **This is the test that makes people say tests slow them down**, and they are right." },

        { level: "ok", label: "Asserts behaviour, couples to wording", why: "real check, fragile edges",
          code: `def test_discount_applies(pricing):
    quote = pricing.quote(order_id="o-1", code="SUMMER")

    assert "10% off" in quote.description       # display string
    assert quote.total == Decimal("90.00")`,
          note: "The second assertion is the real test and it is good. The first one couples the test to marketing copy, so a translator changing `10% off` to `Save 10%` produces a red build in the pricing suite. Assert on structured data — `quote.discount_percent == 10` — and let copy live in a snapshot test that a designer is expected to update." },

        { level: "best", label: "Asserts the contract, in a table", why: "documents the rule, survives rewrites",
          code: `@pytest.mark.parametrize(
    "subtotal, code, expected_total",
    [
        ("100.00", "SUMMER",  "90.00"),   # flat 10%
        ("100.00", None,     "100.00"),   # no code -> untouched
        ("100.00", "EXPIRED","100.00"),   # expired -> ignored, not an error
        ("0.01",   "SUMMER",   "0.01"),   # rounds up, never to zero
        ("33.33",  "SUMMER",  "30.00"),   # 29.997 -> banker's rounding
    ],
    ids=["flat", "no-code", "expired", "sub-penny", "rounds-half-even"],
)
def test_discount_rules(pricing, subtotal, code, expected_total):
    quote = pricing.quote(subtotal=Decimal(subtotal), code=code)
    assert quote.total == Decimal(expected_total)`,
          note: "Every row is a behaviour someone can argue about, and the ids mean a failing run reads `test_discount_rules[rounds-half-even]` — the failure names the rule. You could rewrite `PricingService` from scratch and this suite would still be the specification. That is the property the first rung lacks entirely." }
      ]
    },

    { t: "callout", kind: "good", title: "A deletion checklist you can defend in review", body: [
      { t: "ul", items: [
        "**It asserts on mock calls only.** No assertion about a return value, state change or emitted event. Delete, or rewrite as a behaviour test.",
        "**It duplicates a table row.** Three tests differing only in an input value are one parametrised test (Lesson 9.4).",
        "**It has been `@pytest.mark.skip` for more than a release.** A skipped test is documentation of an intention nobody has. Delete it, or fix it this week.",
        "**Its git history is nothing but 'update test after refactor'.** It has never found a defect and has cost several hours. That is a negative return, measured.",
        "**It tests a private helper that a public test already covers.** Redundant coverage, double the maintenance.",
        "**Keep it if it was written from a bug report.** A regression test earns permanence the moment a real customer hits the bug — annotate it with the issue number so the next reader knows it is load-bearing."
      ]}
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Triage a real suite",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Below is the entire test file for a refund endpoint. It reports 94% line coverage and the team is proud of it. Last month a customer was refunded twice, and the suite was green throughout." },
        { t: "code", lang: "python", title: "test_refunds.py — as found", code: `
from unittest.mock import Mock, patch
import pytest
from refunds import RefundService, Refund


def test_refund_service_init():
    svc = RefundService(repo=Mock(), gateway=Mock())
    assert svc.repo is not None
    assert svc.gateway is not None


def test_refund_calls_gateway():
    gateway = Mock()
    svc = RefundService(repo=Mock(), gateway=gateway)
    svc.refund("o-1", amount=100)
    assert gateway.refund.called


def test_refund_amount_50():
    svc = RefundService(repo=Mock(), gateway=Mock())
    assert svc.refund("o-1", amount=50) is not None


def test_refund_amount_75():
    svc = RefundService(repo=Mock(), gateway=Mock())
    assert svc.refund("o-1", amount=75) is not None


def test_refund_repr():
    assert "Refund" in repr(Refund(id="r-1", amount=100))


@pytest.mark.skip(reason="flaky, fix later")   # skipped since March
def test_refund_is_idempotent():
    ...


def test_refund_logs(caplog):
    svc = RefundService(repo=Mock(), gateway=Mock())
    svc.refund("o-1", amount=100)
    assert "Refunding order o-1 for 100" in caplog.text
`}
      ],
      requirements: [
        "Classify every test as **keep**, **rewrite** or **delete**, with a one-line reason each.",
        "Explain in one sentence how a double refund passed this suite — name the mechanism, not the omission.",
        "Write the test that would have caught it, and say which level of the pyramid it belongs at.",
        "Replace the three amount tests with one table-driven test whose rows are behaviours, not numbers.",
        "State what coverage percentage this file would report *after* your triage, and why a drop is the correct outcome.",
        "Add one integration-level test and justify why a unit test cannot replace it."
      ],
      hint: "Look for the test that describes what the code does versus what it must guarantee. Then ask which of these tests would still pass if `refund()` were changed to call the gateway twice.",
      solution: {
        lang: "python",
        title: "test_refunds.py — after triage",
        code: `"""Refund suite after triage.

VERDICTS
  test_refund_service_init      DELETE   asserts that constructor assignment works
  test_refund_calls_gateway     REWRITE  asserts a call happened, not that money moved
  test_refund_amount_50/75      REWRITE  two copies of one table; "is not None" verifies nothing
  test_refund_repr              DELETE   __repr__ is a debugging aid with no contract
  test_refund_is_idempotent     REWRITE  the ONLY test that mattered, and it was skipped
  test_refund_logs              REWRITE  couples to a log string; assert the event, not the prose

HOW THE DOUBLE REFUND PASSED
  Every test used a Mock gateway whose .refund() returns a new Mock and
  records the call. "assert gateway.refund.called" is true after one call
  and equally true after two, so the suite could not distinguish the bug
  from correct behaviour. The idempotency test that could have seen it was
  skipped in March -- and a skipped test reports as neither pass nor fail,
  so nothing in CI complained for four months.
"""

from decimal import Decimal

import pytest

from refunds import AlreadyRefunded, RefundService


# ---- a fake, not a mock: it enforces the gateway's real contract --------

class FakeGateway:
    """Records refunds and rejects a repeated idempotency key.

    A Mock cannot do this: it accepts every call and remembers all of
    them. The fake encodes the one rule the real gateway guarantees, so a
    test can rely on it.
    """

    def __init__(self) -> None:
        self.charges: dict[str, Decimal] = {}

    def refund(self, *, order_id: str, amount: Decimal, key: str) -> str:
        if key in self.charges:
            return f"txn_{key}"          # same result, no second movement
        self.charges[key] = amount
        return f"txn_{key}"

    @property
    def total_moved(self) -> Decimal:
        return sum(self.charges.values(), Decimal("0"))


@pytest.fixture
def gateway() -> FakeGateway:
    return FakeGateway()


@pytest.fixture
def service(gateway: FakeGateway) -> RefundService:
    return RefundService(repo=InMemoryRepo(), gateway=gateway)


# ---- the test that was missing (unit level) -----------------------------

def test_refunding_twice_moves_money_once(service, gateway) -> None:
    """The regression test for INC-4471. Do not delete."""
    first = service.refund("o-1", amount=Decimal("100.00"))
    second = service.refund("o-1", amount=Decimal("100.00"))

    # The observable guarantee: one movement of money, same receipt.
    assert gateway.total_moved == Decimal("100.00")
    assert first.transaction_id == second.transaction_id
    assert len(gateway.charges) == 1


# ---- the three amount tests, as one table of behaviours -----------------

@pytest.mark.parametrize(
    "order_total, refund_amount, expected",
    [
        ("100.00", "100.00", "100.00"),   # full refund
        ("100.00",  "40.00",  "40.00"),   # partial
        ("100.00",   "0.01",   "0.01"),   # smallest unit still moves
        ("100.00",  "33.33",  "33.33"),   # no rounding drift on thirds
    ],
    ids=["full", "partial", "one-penny", "thirds"],
)
def test_refund_moves_the_requested_amount(
    service, gateway, order_total, refund_amount, expected
) -> None:
    service.repo.add(order_id="o-1", total=Decimal(order_total))

    refund = service.refund("o-1", amount=Decimal(refund_amount))

    assert refund.amount == Decimal(expected)
    assert gateway.total_moved == Decimal(expected)


def test_refund_over_order_total_is_rejected(service, gateway) -> None:
    service.repo.add(order_id="o-1", total=Decimal("100.00"))

    with pytest.raises(ValueError, match="exceeds order total"):
        service.refund("o-1", amount=Decimal("100.01"))

    assert gateway.total_moved == Decimal("0")     # nothing moved on failure


# ---- integration level: the wiring a unit test cannot reach -------------

@pytest.mark.integration
def test_repeated_post_returns_the_original_refund(client, db) -> None:
    """Two identical HTTP POSTs must produce one row and one 200.

    A unit test cannot cover this: the guarantee depends on the UNIQUE
    constraint on (order_id, idempotency_key) in the real schema plus the
    endpoint's handling of the resulting IntegrityError. Both live outside
    RefundService, and a fake repo will happily accept the duplicate that
    Postgres would reject.
    """
    body = {"order_id": "o-1", "amount": "100.00"}
    headers = {"Idempotency-Key": "k-1"}

    first = client.post("/refunds", json=body, headers=headers)
    second = client.post("/refunds", json=body, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["transaction_id"] == second.json()["transaction_id"]
    assert db.query("SELECT count(*) FROM refunds WHERE order_id = 'o-1'") == 1`,
        notes: [
          { t: "p", text: "**Coverage went down and the suite got better.** Deleting the `__repr__` and constructor tests removes executed lines, so the number drops — and the drop is the honest signal, because those lines were being executed without being verified. A gate that punishes this deletion is a gate that protects fake tests." },
          { t: "p", text: "**`FakeGateway` replaces `Mock()` because it can hold a rule.** A `Mock` accepts every call and returns a new `Mock`, so `assert gateway.refund.called` is true after one call and after seventeen. The fake encodes the real gateway's idempotency contract, which turns `gateway.total_moved` into an assertion about money rather than about call bookkeeping. Lesson 9.5 draws this line properly." },
          { t: "p", text: "**The skipped test was the whole incident.** `@pytest.mark.skip` reports as skipped, not failed, so CI stayed green for four months while the only test of the guarantee that broke sat inert. A skip with no deadline is a deleted test that still costs you a line in the report — either fix it this week or remove it and file the issue." },
          { t: "callout", kind: "insight", title: "Why the integration test cannot be pushed down a level", body: [
            { t: "p", text: "Idempotency here is not implemented in Python. It is a `UNIQUE (order_id, idempotency_key)` constraint plus the endpoint's decision to translate `IntegrityError` into the original receipt. An in-memory fake repo has no constraints, so it accepts the duplicate insert that Postgres rejects — and the unit test passes against a world that does not exist." },
            { t: "p", text: "This is the general rule for placing a test: **put it at the lowest level that contains the mechanism being guaranteed.** When the mechanism is a database constraint, the lowest honest level is an integration test against a real database (Lesson 9.7)." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A platform team introduces a hard CI gate: 90% line coverage or the build fails. The repo sits at 74%. Over six weeks coverage climbs to 91% and everyone reports the initiative a success. In the seventh week a pricing change ships that computes VAT on the discounted total instead of the gross, under-charging every EU order by roughly 4%. It runs for eleven days before finance notices." },
      { t: "p", text: "**The mechanism: the gate rewarded execution, and execution is cheap.** Under deadline the fastest way to lift a coverage number is a test that constructs the object, calls every method, and asserts `is not None` — or asserts nothing at all. Those tests executed the VAT line hundreds of times without ever comparing its output to a hand-computed figure. The 91% was real; it measured something that was never the goal." },
      { t: "p", text: "**Three fixes, in order of value.** First, gate the *diff*: `diff-cover` requires the lines a pull request touches to be covered, which is enforceable in the moment and cannot be satisfied retrospectively by drive-by tests. Second, add `--cov-branch`, which caught the untested `if country in EU` edge immediately. Third, run mutation testing on the pricing module alone: `mutmut` flipped the multiplication order and every one of the assertion-free tests still passed, which turned an abstract argument into a list of file names." },
      { t: "p", text: "The lasting change was cultural and cost nothing: **every test must name the behaviour it protects.** `test_vat_is_computed_on_gross_not_discounted_total` cannot be written by someone padding a number, and it fails in a way that tells the next reader exactly what the rule is." }
    ]}
  ],

  takeaways: [
    "**A test is a liability that pays for itself by failing informatively.** Before writing one, answer: if this fails in a year, what will the reader know?",
    "Tests buy three things — a regression fence, design pressure, and a specification that cannot go stale. Design pressure is collected before the test ever runs.",
    "**The pyramid is a cost curve, not a virtue.** Cheap tests pinpoint faults; expensive ones prove the pieces fit. You need many of the first and a few of the second.",
    "**An ice-cream cone is a design symptom.** When code cannot be constructed without infrastructure, the end-to-end test is the only test anybody can write — so fix the design (Lesson 9.6), not the ratio.",
    "**Risk chooses tests.** Money arithmetic, authorisation, parsers, retries and migrations deserve exhaustive tables; a nickname endpoint deserves one happy path.",
    "**Line coverage measures execution, not verification.** A function called with no assertions reports 100%, and can be arbitrarily wrong.",
    "**Always run coverage with `--cov-branch`.** Without it, a one-sided `if` reports fully covered while the ordinary path was never taken.",
    "**Coverage is a floor, never a target.** Gate the diff with `diff-cover`, ratchet the threshold, and spot-check the money code with mutation testing.",
    "Compute expected values by hand. A test that recomputes the implementation's formula agrees with the implementation even when both are wrong.",
    "**Delete tests that assert only on mock calls**, duplicate a table row, have been skipped for a release, or whose entire history is 'update after refactor'.",
    "Put each test at the **lowest level that contains the mechanism it guarantees** — when the guarantee is a database constraint, a unit test with a fake repo passes against a world that does not exist."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A test file reports 100% line coverage of a pricing function that returns the wrong rounding. How is that possible?",
        options: [
          "Coverage ignores functions that use `Decimal`",
          "Line coverage records only whether each line executed — it never compares output to an expected value, so a test that calls the function and asserts nothing reports full coverage",
          "The coverage tool needs `--strict` to detect wrong results",
          "The test must have been skipped, and skipped tests still count as covered"
        ],
        answer: 1,
        why: "Coverage instrumentation records executed lines and nothing else. A test body of `apply_discount(Decimal('100'), 10)` with no assertion executes every line and reports 100%, so the number is honest about what it measures and useless as evidence of correctness. Skipped tests execute nothing and therefore *reduce* coverage, and no flag makes a coverage tool check results — that is what assertions are for. The tools that do address this are branch coverage, which finds untaken edges, and mutation testing, which finds executed-but-unverified lines."
      },
      {
        stem: "Which suite shape indicates that the *code* needs changing rather than the tests?",
        options: [
          "A pyramid with slightly too many integration tests",
          "An ice-cream cone: almost all end-to-end tests, few unit tests, a 40-minute suite",
          "An hourglass, because the middle layer is always optional",
          "Any suite under 80% coverage"
        ],
        answer: 1,
        why: "A cone forms because components cannot be constructed or exercised in isolation — I/O in `__init__`, module-level clients, direct reads of the clock and environment — so the end-to-end test is the only test that can be written at all. Mandating unit tests on that code produces the hourglass instead: a mock per collaborator, all green, wiring still broken. The fix is to introduce seams so the cheap tests become writable. Coverage percentage says nothing about shape, and a few extra integration tests is a healthy suite, not a symptom."
      },
      {
        stem: "Which of these tests is the strongest candidate for deletion?",
        options: [
          "A test written from a customer bug report, annotated with the issue number",
          "A test that configures `repo.get.return_value` and then asserts `repo.get.called`, with no assertion about the result",
          "A parametrised test with eight rounding rows and readable ids",
          "An integration test proving a UNIQUE constraint rejects a duplicate idempotency key"
        ],
        answer: 1,
        why: "That test asserts only that a mock you configured was called, so it is true whether the call happens once or seventeen times and whether the returned value is used correctly or discarded. It fails on any rename and catches no behavioural defect — a pure tax. The regression test earns permanence the moment a real customer hit the bug, the rounding table is the specification for behaviour people argue about, and the constraint test covers a mechanism that lives in the database and cannot be verified at a lower level."
      },
      {
        stem: "Your team wants to raise confidence without a coverage-theatre outcome. Which policy does that?",
        options: [
          "Set `fail_under = 100` so no line escapes",
          "Require that lines changed by a pull request are covered (`diff-cover`), run coverage with `--cov-branch`, and mutation-test the money modules periodically",
          "Add an end-to-end test for every new endpoint",
          "Ban mocks from the suite entirely"
        ],
        answer: 1,
        why: "Diff coverage is enforceable at the moment of change and cannot be satisfied by drive-by assertion-free tests; branch coverage stops one-sided `if` statements from reporting as fully exercised; mutation testing directly detects lines that are executed but unverified, which is the exact blind spot. A 100% gate maximises the incentive to write tests that call code and assert nothing. An end-to-end test per endpoint builds the cone, with slow, non-specific failures. And mocks are the right tool at a real boundary — the problem is asserting on the mock's call log instead of on behaviour."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you decide what to test?",
        strong: "By the cost of the code being silently wrong, multiplied by the chance it is. Money arithmetic, authorisation, parsers of external input, retry logic and migrations get exhaustive table-driven tests; a CRUD endpoint that stores a nickname gets one happy path. Then each test has to answer a question when it fails — if the failure would not name a behaviour, it is not worth writing.",
        answer: [
          { t: "p", text: "Leading with risk rather than with a coverage number or a ratio separates you immediately. The budget is wildly uneven across a codebase, and any single percentage flattens exactly that distinction." },
          { t: "p", text: "Volunteer the negative list too, because it shows judgement: no tests on getters, `__repr__`, framework behaviour, or private helpers a public test already covers. Each of those breaks on refactors and catches nothing." },
          { t: "p", text: "The line that lands: a test earns permanence the moment it comes from a real bug report. Regression tests are the ones you never delete, and annotating them with the incident number tells the next reader they are load-bearing." }
        ],
        weak: "Answering \"everything, aim for 100%\". It signals that you have never maintained a large suite through a refactor, and it invites the follow-up about what coverage actually measures."
      },
      {
        level: "core",
        q: "What does a coverage number tell you, and what does it not?",
        strong: "Line coverage tells you whether a line executed during the run. It does not tell you whether anything was asserted, whether the expected value was right, or whether the other branch was tried. So it is useful as a floor — spotting files and branches nobody touched — and dangerous as a target, because the cheapest way to raise it is a test that calls code and asserts nothing.",
        answer: [
          { t: "p", text: "The concrete demonstration is worth having ready: a four-line function, a test that calls it twice with no assertions, `pytest --cov` printing 100%. It ends the argument in one screen." },
          { t: "p", text: "Mentioning `--cov-branch` unprompted signals real use. A one-sided `if` reports as fully covered under line coverage while the ordinary path was never taken — which is usually the path that matters." },
          { t: "p", text: "Then name the three blind spots explicitly: wrong expected values, cases nobody thought of, and everything about interaction — N+1 queries, races, a check that runs on the wrong object." },
          { t: "p", text: "Close with what you would actually enforce: diff coverage on changed lines, a ratcheting threshold that never drops, and mutation testing on the modules that move money. That is a policy, not an opinion." }
        ]
      },
      {
        level: "advanced",
        q: "You inherit a suite with 3,000 tests, a 40-minute run, and a reputation for false alarms. What do you do first?",
        strong: "Measure before changing anything: the ten slowest tests via `--durations`, the flakiest via rerun history, and the shape — how many tests need a database or a browser. That usually shows a cone, which is a design symptom rather than a testing one. Then attack in that order: quarantine flakes with a deadline, delete the tests that assert only on mock calls, and introduce seams so the cheap tests become writable.",
        answer: [
          { t: "p", text: "The instinct to resist is a rewrite. The suite is the only description of the system's behaviour you have, however bad, and deleting it wholesale destroys information you cannot recover." },
          { t: "p", text: "Deal with flakiness first, because it is what causes the loss of trust. A red build that people ignore is worse than no build — and the fix is quarantine with an owner and an expiry date, never an unconditional `--reruns 3`, which converts a real intermittent bug into a slow green suite (Lesson 9.8)." },
          { t: "p", text: "For the false alarms, the diagnostic is precise: does this test fail when behaviour changes, or when structure changes? Tests asserting on mock call logs fail on renames and catch nothing, and there are usually hundreds of them." },
          { t: "p", text: "Naming the design cause is what makes this an architecture answer rather than a tooling one. Constructors that open connections and functions that read the clock directly force everything up to the slow end of the pyramid. Fixing that is Lesson 9.6, and it is what actually shortens the 40 minutes." }
        ],
        weak: "Proposing a coverage gate as the first move. It adds tests to a suite nobody trusts, and the cheapest tests to add are the assertion-free ones that created the problem."
      }
    ]
  }
});
