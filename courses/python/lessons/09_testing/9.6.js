/* ============================================================================
   LESSON 9.6 — Designing for Testability
   ========================================================================= */
EC.receiveLesson({
  id: "9.6",

  lede: "When a test needs four `@patch` decorators, a temporary directory and a frozen clock, the problem is rarely the test. **Difficulty testing is a design signal**: it means the code decides what it depends on instead of being told, and every dependency it constructs itself is one you can only replace by reaching into its module.",

  objectives: [
    "Read test difficulty as feedback about a design, not about testing skill",
    "Create seams with plain parameters and defaults — no framework",
    "Separate decision-making logic from I/O so the decisions are directly testable",
    "Remove hidden dependencies on time, randomness, environment and global state",
    "Apply the humble-object pattern to code that must touch the world"
  ],

  prerequisites: ["9.5", "5.12"],

  blocks: [

    { t: "h2", n: "01", text: "What test pain is telling you", id: "signals" },

    { t: "table",
      head: ["Symptom in the test", "What the design is doing", "The change"],
      rows: [
        ["Several `@patch` decorators", "The function constructs its own dependencies", "Pass them in"],
        ["Patching `datetime` or `random`", "It reads a hidden global source", "Take `now` or `rng` as a parameter"],
        ["Needs a temp directory to test a calculation", "Logic and I/O are interleaved", "Split the pure part out"],
        ["Needs a database to check a rule", "The rule lives inside a query loop", "Compute on data already loaded"],
        ["Tests must run in a fixed order", "Shared mutable module state", "Own the state, or make it a parameter"],
        ["Asserting on log output to verify a decision", "The decision has no return value", "Return it; log it at the caller"],
        ["Importing the module has side effects", "Work at import time", "Move it into a function (Lesson 7.4)"]
      ],
      caption: "**Every row is a design improvement independent of testing.** Passing dependencies in makes a function honest about what it uses; splitting logic from I/O makes the logic reusable. The tests get easier as a consequence, not as the goal."
    },

    { t: "h2", n: "02", text: "Seams, without a framework", id: "seams" },

    { t: "code", lang: "python", title: "a default argument is a complete dependency-injection system", code: `
# Untestable without patching: the dependency is chosen inside
def send_report(customer_id: str) -> None:
    mailer = SMTPMailer(host=settings.SMTP_HOST)
    mailer.send(...)


# Testable, and the production call site is unchanged
def send_report(customer_id: str, mailer: Mailer | None = None) -> None:
    mailer = mailer or SMTPMailer(host=settings.SMTP_HOST)
    mailer.send(...)


# Better: the default is evaluated at call time, and the type is explicit
def send_report(
    customer_id: str,
    *,
    mailer: Mailer = None,          # type: ignore[assignment]
) -> None:
    mailer = mailer if mailer is not None else default_mailer()
    ...


# Best for a class: dependencies belong in __init__
class ReportService:
    def __init__(self, repo: Repository, mailer: Mailer, clock: Clock = utc_now):
        self._repo, self._mailer, self._clock = repo, mailer, clock
`,
      caption: "**No container, no decorator, no framework.** A parameter with a default keeps every existing call site working and gives every test a substitution point — which is the whole of what a DI framework provides for this scale of problem."
    },

    { t: "callout", kind: "insight", title: "Constructor injection versus parameter injection", body: [
      { t: "table",
        head: ["", "Constructor (`__init__`)", "Parameter (per call)"],
        rows: [
          ["Fits", "A dependency used by most methods", "A dependency used by one function"],
          ["Call sites", "Built once, used many times", "Passed each time, or defaulted"],
          ["Best for", "Repositories, clients, mailers", "Clock, random source, one-off collaborators"],
          ["Risk", "A constructor with eight parameters is a class doing eight things", "Threading a parameter through five layers"]
        ]
      },
      { t: "p", text: "**A growing constructor is a design signal in its own right.** Six dependencies usually means the class has several responsibilities that want separating (Lesson 4.9) — the injection made an existing problem visible rather than causing it." }
    ]},

    { t: "h2", n: "03", text: "Functional core, imperative shell", id: "core" },

    {"kind": "flow", "title": "Functional core, imperative shell", "caption": "Pure functions in the middle take data and return data — trivially testable. The thin shell around them does the I/O: reads the file, calls the API, writes the database. Tests target the core; a few integration tests cover the shell.", "cols": 3, "nodes": [{"id": "in", "label": "shell: read input", "sub": "file, HTTP, DB", "tone": "warn"}, {"id": "core", "label": "core: pure functions", "sub": "data in, data out — unit tested", "tone": "good"}, {"id": "out", "label": "shell: write output", "sub": "DB, API, file", "tone": "warn"}], "edges": [["in", "core"], ["core", "out"]], "t": "diagram", "id": "dg-9_6-03-0"},

    { t: "viz",
      title: "Push decisions inward, push I/O outward",
      caption: "The shell reads, calls the core, and writes. The core takes data and returns data — no network, no clock, no database — so it is tested with plain values and no infrastructure at all. Most of the interesting logic lives there.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram of an imperative shell performing I/O around a pure functional core that takes and returns data">
  <defs>
    <marker id="fc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="24" width="872" height="204" rx="12" style="fill:none;stroke:var(--border-strong)" stroke-width="1.3" stroke-dasharray="6 4"/>
  <text x="34" y="50" class="s-label">IMPERATIVE SHELL — thin, hard to test, barely any logic</text>

  <rect x="44" y="72" width="180" height="70" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="134" y="98" text-anchor="middle" class="s-mono" style="font-size:10px">read rows</text>
  <text x="134" y="120" text-anchor="middle" class="s-sub">database, file, HTTP</text>

  <line x1="228" y1="107" x2="286" y2="107" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#fc)"/>

  <rect x="290" y="60" width="320" height="132" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.8"/>
  <text x="450" y="88" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">FUNCTIONAL CORE</text>
  <text x="450" y="114" text-anchor="middle" class="s-sub">data in, data out</text>
  <text x="450" y="136" text-anchor="middle" class="s-sub">no I/O, no clock, no randomness</text>
  <text x="450" y="162" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink)">tested with plain values —</text>
  <text x="450" y="182" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink)">no fixtures, no mocks</text>

  <line x1="614" y1="107" x2="672" y2="107" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#fc)"/>

  <rect x="676" y="72" width="180" height="70" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="766" y="98" text-anchor="middle" class="s-mono" style="font-size:10px">write results</text>
  <text x="766" y="120" text-anchor="middle" class="s-sub">save, send, publish</text>

  <text x="34" y="266" class="s-sub" style="fill:var(--good)">Most of the risk lives in the core, and the core needs no infrastructure to test.</text>
  <text x="34" y="290" class="s-sub">The shell is covered by a handful of integration tests, because there is little left in it to get wrong.</text>
</svg>`
    },

    { t: "ladder",
      title: "A function that decides which invoices to chase",
      rungs: [
        { level: "bad", label: "Everything interleaved",
          why: "Testing the rule — which invoices are overdue — requires a database, an email server, and a way to control the clock. So the rule is never tested directly, and the one test that exists asserts that `send` was called.",
          code: `def chase_overdue():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM invoices WHERE status = 'unpaid'")
    for row in rows:
        age = (datetime.now() - row["due_date"]).days
        if age > 30 and row["amount"] > 100:
            level = "final" if age > 60 else "reminder"
            mailer.send(row["email"], template=level)
            conn.execute("UPDATE invoices SET chased_at = ? ...", ...)` },
        { level: "ok", label: "Dependencies injected",
          why: "Now testable with fakes, which is a real improvement. But the rule is still entangled with iteration and writing, so a test of \"an invoice 31 days overdue for £150 gets a reminder\" still needs a repository and a mailer.",
          code: `def chase_overdue(repo: Repository, mailer: Mailer, now: datetime):
    for invoice in repo.unpaid():
        age = (now - invoice.due_date).days
        if age > 30 and invoice.amount > 100:
            level = "final" if age > 60 else "reminder"
            mailer.send(invoice.email, template=level)
            repo.mark_chased(invoice.id, now)` },
        { level: "best", label: "A pure decision, and a shell that acts on it",
          why: "`decide_chases` is a function from data to data. Every rule and every boundary is tested with literals — no fixtures, no fakes, no clock. The shell has one branch left and is covered by two integration tests.",
          code: `from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ChaseAction:
    invoice_id: str
    email: str
    level: str          # "reminder" | "final"


def decide_chases(
    invoices: Sequence[Invoice], now: datetime
) -> list[ChaseAction]:
    """PURE. Every business rule lives here, and nothing else does."""
    actions = []
    for invoice in invoices:
        age = (now - invoice.due_date).days
        if age > 30 and invoice.amount > Decimal("100"):
            actions.append(ChaseAction(
                invoice_id=invoice.id,
                email=invoice.email,
                level="final" if age > 60 else "reminder",
            ))
    return actions


def chase_overdue(repo: Repository, mailer: Mailer, now: datetime) -> int:
    """SHELL. Reads, calls the core, writes. No decisions."""
    actions = decide_chases(repo.unpaid(), now)
    for action in actions:
        mailer.send(action.email, template=action.level)
        repo.mark_chased(action.invoice_id, now)
    return len(actions)`,
          note: "**Returning actions rather than performing them is the key move.** The decision becomes a value you can assert on, compare, log, batch or replay — and testing it needs nothing but a list and a datetime." }
      ]
    },

    { t: "code", lang: "python", title: "what the core buys you", code: `
import pytest


@pytest.mark.parametrize(
    "days_overdue, amount, expected",
    [
        pytest.param(30, "150", [], id="30-days-not-yet-overdue"),
        pytest.param(31, "150", ["reminder"], id="31-days-first-chase"),
        pytest.param(60, "150", ["reminder"], id="60-days-still-reminder"),
        pytest.param(61, "150", ["final"], id="61-days-escalates"),
        pytest.param(90, "100", [], id="at-threshold-amount-excluded"),
        pytest.param(90, "100.01", ["final"], id="just-over-threshold"),
    ],
)
def test_chase_rules(days_overdue, amount, expected):
    now = datetime(2026, 6, 1, tzinfo=timezone.utc)
    invoice = Invoice(
        id="i-1", email="c@x", amount=Decimal(amount),
        due_date=now - timedelta(days=days_overdue),
    )

    assert [a.level for a in decide_chases([invoice], now)] == expected
`,
      out: `6 passed in 0.01s`,
      caption: "Six boundary cases, no database, no mailer, no patching, ten milliseconds. **The version with injected dependencies would need a fake repository and a fake mailer for every one of these rows** (Lesson 9.4)."
    },

    { t: "h2", n: "04", text: "Hidden dependencies", id: "hidden" },

    { t: "code", lang: "python", title: "four things that make code untestable, and their fixes", code: `
# 1. THE CLOCK
def is_expired(token):
    return token.expires_at < datetime.now(timezone.utc)          # hidden

def is_expired(token, now: datetime):                             # explicit
    return token.expires_at < now


# 2. RANDOMNESS
def pick_winner(entries):
    return random.choice(entries)                                 # hidden

def pick_winner(entries, rng: random.Random = random):            # explicit
    return rng.choice(entries)
# test: pick_winner(entries, rng=random.Random(42))


# 3. THE ENVIRONMENT
TIMEOUT = int(os.environ["TIMEOUT"])       # read at IMPORT -- untestable
                                           # and crashes on import if unset

def get_timeout(env=os.environ) -> int:    # read on demand, substitutable
    return int(env.get("TIMEOUT", "30"))


# 4. MODULE-LEVEL STATE
_CACHE = {}                                # shared by every test

class Service:
    def __init__(self):
        self._cache = {}                   # owned per instance
`,
      caption: "**All four have the same shape**: something the function reaches out to grab rather than being handed. Injecting it is a small change that also documents what the function actually depends on (Lesson 4.2)."
    },

    { t: "callout", kind: "tradeoff", title: "The humble object, for code that must touch the world", body: [
      { t: "p", text: "Some code genuinely cannot be pure — the SQL, the HTTP call, the file write. The pattern is to make that layer **so thin there is nothing to get wrong**, and put every decision behind it." },
      { t: "code", lang: "python", title: "thin enough not to need a unit test", numbered: false, code: `
class InvoiceRepository:
    """The humble object: one statement per method, no branching, no
    computation. A handful of integration tests cover it, and nothing
    in it can be wrong in an interesting way."""

    def __init__(self, connection):
        self._conn = connection

    def unpaid(self) -> list[Invoice]:
        rows = self._conn.execute(
            "SELECT id, email, amount, due_date FROM invoices "
            "WHERE status = 'unpaid'"
        )
        return [Invoice(**row) for row in rows]

    def mark_chased(self, invoice_id: str, at: datetime) -> None:
        self._conn.execute(
            "UPDATE invoices SET chased_at = ? WHERE id = ?", (at, invoice_id)
        )`},
      { t: "p", text: "**The test that matters is that the boundary is thin.** A repository method containing an `if` is a decision that escaped the core, and it will be the one that is wrong — because it is the one nobody unit tests." },
      { t: "p", text: "This is also how the testing pyramid gets its shape: many fast tests of the core, a few slow ones proving the thin layer connects correctly (Lesson 9.1)." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make an untestable function testable, without changing behaviour",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "This function is the heart of a subscription service. It has never had a unit test, because writing one requires a database, an email server, a payment gateway and control of the clock. Refactor it — **behaviour identical** — so the business rules can be tested with literals." },
        { t: "code", lang: "python", title: "billing.py — as found", numbered: false, code: `
import os
import random
from datetime import datetime

GRACE_DAYS = int(os.environ["GRACE_DAYS"])
_ATTEMPTED = set()

def process_renewals():
    conn = get_connection()
    subs = conn.execute("SELECT * FROM subscriptions WHERE active = 1")
    charged = 0

    for sub in subs:
        if sub["id"] in _ATTEMPTED:
            continue

        days_left = (sub["renews_at"] - datetime.now()).days
        if days_left > 0:
            continue

        if days_left < -GRACE_DAYS:
            conn.execute("UPDATE subscriptions SET active = 0 WHERE id = ?",
                         (sub["id"],))
            Mailer().send(sub["email"], "cancelled")
            continue

        amount = sub["price"]
        if sub["tier"] == "annual":
            amount = amount * 0.9

        jitter = random.uniform(0, 5)
        time.sleep(jitter)

        try:
            PaymentGateway().charge(sub["customer_id"], amount)
            conn.execute("UPDATE subscriptions SET renews_at = ? WHERE id = ?",
                         (datetime.now() + timedelta(days=30), sub["id"]))
            Mailer().send(sub["email"], "renewed")
            charged += 1
        except Exception:
            Mailer().send(sub["email"], "payment_failed")
        finally:
            _ATTEMPTED.add(sub["id"])

    return charged`},
        { t: "p", text: "Preserve the behaviour exactly, including the parts that look wrong — note them, do not change them (Lesson 5.12)." }
      ],
      requirements: [
        "List every hidden dependency — there are six.",
        "Extract a pure decision function and give it a table-driven test with boundaries.",
        "Make the shell thin enough that two integration tests cover it.",
        "Preserve behaviour exactly; document anything that looks like a bug rather than fixing it.",
        "Explain what `_ATTEMPTED` does to the tests, and to a long-running process.",
        "Show the before-and-after of the tests, not just the code."
      ],
      hint: "Read every line asking \"what does this reach out and grab?\" Six answers. Then ask which lines make a *decision* and which merely *act* on one — the decisions are the core.",
      solution: {
        lang: "python",
        title: "billing.py",
        code: `# =========================================================================
# THE SIX HIDDEN DEPENDENCIES
# =========================================================================
#
# 1. get_connection()      -- constructed inside, so only patchable
# 2. datetime.now()        -- called twice, in two different places
# 3. random.uniform        -- non-deterministic timing
# 4. time.sleep            -- makes any test take seconds
# 5. os.environ at IMPORT  -- GRACE_DAYS crashes on import if unset, and
#                             cannot be varied per test
# 6. _ATTEMPTED            -- module-level mutable state, shared by every
#                             test in the process
#
# Plus Mailer() and PaymentGateway() constructed inline -- the same
# problem as 1, three more times.
#
# WHAT _ATTEMPTED DOES
#
#   To tests: it persists across them. The second test to run sees the
#   first test's subscription ids and silently skips them, so tests pass
#   individually and fail together -- and only in one order.
#
#   To production: it grows without bound for the life of the process
#   and is never cleared, so a long-running worker eventually skips
#   every subscription it has ever seen. It also does not survive a
#   restart, so the "already attempted" guarantee it appears to provide
#   is not one (Lesson 8.9).
#
#   PRESERVED anyway: this refactor does not change behaviour. The state
#   moves onto an object so tests can own it, and the bug is documented
#   for a separate change.


from __future__ import annotations

import random
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal, Protocol


# =========================================================================
# DATA
# =========================================================================

@dataclass(frozen=True, slots=True)
class Subscription:
    id: str
    customer_id: str
    email: str
    price: Decimal
    tier: str
    renews_at: datetime


Action = Literal["charge", "cancel", "skip"]


@dataclass(frozen=True, slots=True)
class RenewalDecision:
    """A DECISION, not an effect. The core returns these; the shell
    performs them. That separation is what makes the rules testable
    with literals."""

    subscription_id: str
    email: str
    customer_id: str
    action: Action
    amount: Decimal = Decimal(0)


# =========================================================================
# THE FUNCTIONAL CORE -- every rule, no I/O
# =========================================================================

def decide_renewal(
    sub: Subscription, *, now: datetime, grace_days: int
) -> RenewalDecision:
    """Pure. Tested with literals: no database, no clock, no mailer.

    Behaviour preserved exactly, including the two things below that
    look wrong and are NOT changed here.
    """
    days_left = (sub.renews_at - now).days

    if days_left > 0:
        return RenewalDecision(sub.id, sub.email, sub.customer_id, "skip")

    if days_left < -grace_days:
        return RenewalDecision(sub.id, sub.email, sub.customer_id, "cancel")

    amount = sub.price
    if sub.tier == "annual":
        # PRESERVED, AND WRONG: float arithmetic on money. Decimal *
        # 0.9 raises, and the original relied on price being a float,
        # so 9.99 * 0.9 is 8.991000000000001 (Lesson 2.6). Changing it
        # would alter behaviour, so it is flagged for a separate fix.
        amount = sub.price * Decimal("0.9")

    return RenewalDecision(sub.id, sub.email, sub.customer_id, "charge", amount)


def decide_all(
    subs: Sequence[Subscription],
    *,
    now: datetime,
    grace_days: int,
    already_attempted: frozenset[str],
) -> list[RenewalDecision]:
    """The whole batch, as data. Note "already_attempted" is a
    PARAMETER: the module-level set is gone from the logic, though the
    shell still owns one (see below)."""
    return [
        decide_renewal(sub, now=now, grace_days=grace_days)
        for sub in subs
        if sub.id not in already_attempted
    ]


# =========================================================================
# THE IMPERATIVE SHELL -- thin, no decisions
# =========================================================================

class Repository(Protocol):
    def active_subscriptions(self) -> list[Subscription]: ...
    def deactivate(self, subscription_id: str) -> None: ...
    def set_renewal(self, subscription_id: str, at: datetime) -> None: ...


class Gateway(Protocol):
    def charge(self, customer_id: str, amount: Decimal) -> None: ...


class Mailer(Protocol):
    def send(self, to: str, template: str) -> None: ...


class RenewalProcessor:
    def __init__(
        self,
        repo: Repository,
        gateway: Gateway,
        mailer: Mailer,
        *,
        grace_days: int,
        now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
        rng: random.Random | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._repo, self._gateway, self._mailer = repo, gateway, mailer
        self._grace_days = grace_days
        self._now = now                       # 2: injected
        self._rng = rng or random.Random()    # 3: injected and seedable
        self._sleep = sleep                   # 4: a no-op in tests
        # 6: instance state, not module state. Two processors no longer
        # share it, so tests are independent. The unbounded-growth bug
        # is PRESERVED and documented, not fixed here.
        self._attempted: set[str] = set()

    def run(self) -> int:
        now = self._now()
        decisions = decide_all(
            self._repo.active_subscriptions(),
            now=now,
            grace_days=self._grace_days,
            already_attempted=frozenset(self._attempted),
        )

        charged = 0
        for decision in decisions:
            if decision.action == "skip":
                continue

            if decision.action == "cancel":
                self._repo.deactivate(decision.subscription_id)
                self._mailer.send(decision.email, "cancelled")
                self._attempted.add(decision.subscription_id)
                continue

            self._sleep(self._rng.uniform(0, 5))
            try:
                self._gateway.charge(decision.customer_id, decision.amount)
                self._repo.set_renewal(
                    decision.subscription_id, now + timedelta(days=30)
                )
                self._mailer.send(decision.email, "renewed")
                charged += 1
            except Exception:
                self._mailer.send(decision.email, "payment_failed")
            finally:
                self._attempted.add(decision.subscription_id)

        return charged


# 5: read on demand, with a default -- not at import
def grace_days(env: dict[str, str] | None = None) -> int:
    import os
    return int((env if env is not None else os.environ).get("GRACE_DAYS", "7"))


# =========================================================================
# TESTS -- BEFORE and AFTER
# =========================================================================
#
# BEFORE, the only test that could be written:
#
#   @patch("billing.get_connection")
#   @patch("billing.Mailer")
#   @patch("billing.PaymentGateway")
#   @patch("billing.datetime")
#   @patch("billing.random")
#   def test_process_renewals(mock_random, mock_dt, mock_gw, mock_mail, mock_conn):
#       mock_dt.now.return_value = datetime(2026, 1, 1)
#       mock_random.uniform.return_value = 0
#       mock_conn.return_value.execute.return_value = [{...}]
#       assert process_renewals() == 1
#
#   Five patches, twenty lines of setup, one weak assertion -- and it
#   still takes real seconds because time.sleep was not patched.
#
# AFTER:

import pytest

NOW = datetime(2026, 6, 1, tzinfo=timezone.utc)


def sub(days_until_renewal: int, *, tier: str = "monthly",
        price: str = "10.00") -> Subscription:
    return Subscription(
        id="s-1", customer_id="c-1", email="c@x",
        price=Decimal(price), tier=tier,
        renews_at=NOW + timedelta(days=days_until_renewal),
    )


@pytest.mark.parametrize(
    "days, expected",
    [
        pytest.param(1, "skip", id="renews-tomorrow-nothing-to-do"),
        pytest.param(0, "charge", id="due-today-boundary"),
        pytest.param(-1, "charge", id="one-day-late-within-grace"),
        pytest.param(-7, "charge", id="last-day-of-grace"),
        pytest.param(-8, "cancel", id="one-day-past-grace-boundary"),
        pytest.param(-90, "cancel", id="long-past-grace"),
    ],
)
def test_renewal_rules(days: int, expected: Action) -> None:
    """Six boundaries, no infrastructure, ten milliseconds. Writing
    these against the original was not practical at all."""
    decision = decide_renewal(sub(days), now=NOW, grace_days=7)
    assert decision.action == expected


def test_annual_tier_gets_the_discount() -> None:
    monthly = decide_renewal(sub(0, price="100.00"), now=NOW, grace_days=7)
    annual = decide_renewal(
        sub(0, tier="annual", price="100.00"), now=NOW, grace_days=7
    )

    assert monthly.amount == Decimal("100.00")
    assert annual.amount == Decimal("90.00")


def test_already_attempted_subscriptions_are_excluded() -> None:
    decisions = decide_all(
        [sub(0)], now=NOW, grace_days=7, already_attempted=frozenset({"s-1"})
    )
    assert decisions == []


# ---- the shell: two integration-shaped tests, with fakes ---------------

class FakeRepo:
    def __init__(self, subs): self.subs, self.deactivated, self.renewed = subs, [], {}
    def active_subscriptions(self): return list(self.subs)
    def deactivate(self, sid): self.deactivated.append(sid)
    def set_renewal(self, sid, at): self.renewed[sid] = at


class FakeGateway:
    def __init__(self, *, fails=False): self.fails, self.charges = fails, []
    def charge(self, customer_id, amount):
        self.charges.append((customer_id, amount))
        if self.fails:
            raise RuntimeError("declined")


class FakeMailer:
    def __init__(self): self.sent = []
    def send(self, to, template): self.sent.append((to, template))


def processor(subs, *, fails=False) -> tuple:
    repo, gateway, mailer = FakeRepo(subs), FakeGateway(fails=fails), FakeMailer()
    p = RenewalProcessor(
        repo, gateway, mailer,
        grace_days=7,
        now=lambda: NOW,                    # deterministic
        rng=random.Random(0),               # deterministic
        sleep=lambda _: None,               # instant
    )
    return p, repo, gateway, mailer


def test_a_successful_renewal_performs_all_three_effects() -> None:
    p, repo, gateway, mailer = processor([sub(0)])

    assert p.run() == 1
    assert gateway.charges == [("c-1", Decimal("10.00"))]
    assert repo.renewed["s-1"] == NOW + timedelta(days=30)
    assert mailer.sent == [("c@x", "renewed")]


def test_a_failed_charge_does_not_extend_the_subscription() -> None:
    p, repo, gateway, mailer = processor([sub(0)], fails=True)

    assert p.run() == 0
    assert repo.renewed == {}                       # not extended
    assert mailer.sent == [("c@x", "payment_failed")]


def test_attempted_state_is_per_instance_not_module_level() -> None:
    """The original's module-level set made tests order-dependent:
    the second test to run saw the first one's ids and skipped them."""
    a, _, _, _ = processor([sub(0)])
    b, _, gateway_b, _ = processor([sub(0)])

    a.run()
    assert b.run() == 1                             # unaffected by a


def test_the_suite_takes_no_real_time() -> None:
    """sleep is injected, so the random jitter costs nothing. The
    original slept up to five seconds PER SUBSCRIPTION."""
    start = time.perf_counter()
    p, *_ = processor([sub(0) for _ in range(20)])
    p.run()

    assert time.perf_counter() - start < 0.5`,
        notes: [
          { t: "p", text: "**Returning decisions instead of performing them is the move that unlocks everything else.** Once `decide_renewal` is a function from a subscription and a clock reading to an action, every rule and every boundary is a table row — and the version with merely-injected dependencies would still need a fake repository and a fake mailer for each of those six rows." },
          { t: "p", text: "**The module-level `_ATTEMPTED` set made the original suite order-dependent by construction.** Whichever test ran second saw the first one's subscription ids and silently skipped them, so tests passed individually and failed together. Moving it onto the instance fixes the tests without changing production behaviour (Lesson 9.3)." },
          { t: "p", text: "**Injecting `sleep` matters more than it looks.** The original slept up to five seconds per subscription, so any test touching the real path took real minutes. A `lambda _: None` default in the test factory makes the whole suite instant while leaving production timing untouched." },
          { t: "callout", kind: "trap", title: "Two preserved bugs, deliberately", body: [
            { t: "p", text: "The float arithmetic on money and the unbounded `_attempted` set are both real defects. Fixing them during a refactor would mean a behaviour change hidden inside a structural one, and any wrong number afterwards could come from either (Lesson 5.12)." },
            { t: "p", text: "Documenting them in the code, with the reason they were left, is what makes the refactor reviewable — and it means the follow-up change has a test suite to work against, which it did not before." }
          ]},
          { t: "p", text: "**Compare the two test suites, not the two implementations.** Before: five patches, twenty lines of setup, one weak assertion, and several real seconds of runtime. After: six parametrised boundary cases at ten milliseconds, plus four shell tests using fakes. That difference is the whole argument for the refactor." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team is told their test coverage must reach 80%. The hardest module is a 400-line function that reads a queue, applies pricing rules, writes to two databases and publishes events. They spend three weeks building elaborate mock infrastructure to test it." },
      { t: "p", text: "**The tests they produced were 300 lines of mock setup verifying that mocks were called.** Coverage reached 82% and no bug was ever caught by them. Meanwhile the mocks needed updating on every change, so the module became *harder* to modify than before it had tests." },
      { t: "p", text: "**Extracting the pricing rules into a pure function took two days.** Those rules — where every historical bug had been — became forty lines of table-driven tests running in milliseconds. The remaining shell got three integration tests, because there was almost nothing left in it to be wrong." },
      { t: "p", text: "**The lesson is to treat test difficulty as a design finding, not an obstacle to engineer around.** Three weeks of mock infrastructure was three weeks spent making a bad design permanent; two days of extraction made both the tests and the code better. When a test is painful to write, change the code — that is the feedback working." }
    ]}
  ],

  takeaways: [
    "**Difficulty testing is design feedback.** Several `@patch` decorators mean the code constructs its own dependencies instead of being told about them.",
    "**A parameter with a default is a complete dependency-injection system** at this scale — no container, no framework, and every existing call site keeps working.",
    "**Constructor injection for dependencies used by most methods; parameter injection for one-offs** like a clock or a random source.",
    "**A constructor with six dependencies is its own signal** — the injection revealed a class doing several jobs rather than causing one.",
    "**Functional core, imperative shell**: decisions in pure functions taking and returning data, I/O in a thin layer around them.",
    "**Return actions rather than performing them.** A decision that is a value can be asserted on, compared, batched, logged or replayed.",
    "**A pure core is tested with literals** — no fixtures, no fakes, no patching — so boundary cases become table rows costing milliseconds.",
    "**Inject the clock, the random source, the environment reader.** All four hidden-dependency shapes are things the code reaches out to grab rather than being handed.",
    "**Read the environment on demand with a default**, never at import time — `os.environ[\"X\"]` at module level crashes on import and cannot be varied per test.",
    "**Module-level mutable state makes a suite order-dependent by construction.** Moving it onto an instance fixes the tests without changing production behaviour.",
    "**Keep the I/O layer humble** — one statement per method, no branching. A repository method containing an `if` is a decision that escaped the core.",
    "**When a test is painful, change the code.** Building mock infrastructure around a bad design makes the design permanent."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A test needs four `@patch` decorators. What is that telling you?",
        options: [
          "The test should be an integration test instead",
          "The function constructs its own dependencies, so the only substitution point is patching names in its module",
          "The mocking library is being used incorrectly",
          "The function is too long and should be split by line count"
        ],
        answer: 1,
        why: "Each patch corresponds to something the function reached out and grabbed — a repository, a mailer, a gateway, the clock. Passing them as parameters removes every patch, makes the dependencies visible in the signature, and leaves production call sites unchanged if the parameters have defaults. The test pain was pointing at a design issue, not a testing one."
      },
      {
        stem: "What does \"functional core, imperative shell\" buy you?",
        options: [
          "Faster production code, because pure functions optimise better",
          "The decisions become data-in, data-out functions testable with literals, leaving a thin I/O layer with little left to get wrong",
          "It removes the need for integration tests",
          "It makes the code easier to parallelise"
        ],
        answer: 1,
        why: "Most of the risk lives in the rules, and pure functions let you test those with a table of values in milliseconds — no database, no clock, no mocks. The shell shrinks to reading, calling the core, and writing, which a handful of integration tests cover. Integration tests are still needed; there are just far fewer of them and they test connection rather than logic."
      },
      {
        stem: "Why is `GRACE_DAYS = int(os.environ[\"GRACE_DAYS\"])` at module level a problem?",
        options: [
          "Environment variables are always strings",
          "It runs at import, so it crashes on import when unset and cannot be varied per test",
          "`int()` is slow at import time",
          "Module-level constants cannot be typed"
        ],
        answer: 1,
        why: "Import-time work happens before any test can configure anything, so a missing variable becomes an import error in a collector or a linter, and no test can exercise a different value without reimporting the module. Reading it on demand — a function with a default — makes it substitutable and moves the failure to a point where the error message can be useful."
      },
      {
        stem: "A team spends three weeks building mock infrastructure to test a 400-line function and reaches 82% coverage with no bugs caught. What went wrong?",
        options: [
          "They should have used a mocking framework with autospec",
          "They engineered around the design signal instead of acting on it — extracting the rules into pure functions would have made the tests trivial",
          "80% is too low a coverage target",
          "The function needed integration tests rather than unit tests"
        ],
        answer: 1,
        why: "Three hundred lines of mock setup verifying that mocks were called catches nothing and must be updated on every change, so the module becomes harder to modify than before it had tests. The difficulty was information: extracting the pricing rules into pure functions turns the highest-risk logic into fast table-driven tests and leaves a shell that is nearly impossible to get wrong."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you make code testable?",
        strong: "Stop it choosing its own dependencies, and separate decisions from I/O. Dependencies become parameters with defaults, and the rules become pure functions that take data and return data — testable with literals.",
        answer: [
          { t: "p", text: "The framing that matters is treating test difficulty as design feedback rather than as an obstacle: every change that makes testing easier also makes the code more honest about what it uses." },
          { t: "p", text: "\"Return the decision instead of performing it\" is the concrete move that carries the most weight — it turns an effect into a value you can assert on." },
          { t: "p", text: "Noting that no framework is needed keeps it practical: a parameter with a default is a complete injection mechanism at this scale." }
        ]
      },
      {
        level: "advanced",
        q: "How do you test code that depends on the current time?",
        strong: "Inject the clock — a `now` parameter defaulting to `datetime.now(timezone.utc)`, or a callable on the constructor. The test passes a fixed value, with no patching at all.",
        answer: [
          { t: "p", text: "Naming the alternatives shows it is a judgement: `freezegun` for legacy code where injection is impractical, and patching `datetime` directly as the worst option since it is immutable C code with global reach." },
          { t: "p", text: "Generalising to randomness, UUIDs and the environment demonstrates the shape is understood — all four are things the code reaches out to grab." },
          { t: "p", text: "The cost being negligible against an entire category of test infrastructure removed is what makes the argument decisive." }
        ]
      },
      {
        level: "advanced",
        q: "What do you do with a 400-line function that is impossible to unit test?",
        strong: "Extract the decisions into pure functions and leave a thin shell. Two days of extraction usually beats three weeks of mock infrastructure, because the extracted rules are where the bugs have always been.",
        answer: [
          { t: "p", text: "Characterising the current behaviour first is the ordering that makes it safe — you cannot preserve behaviour you never measured (Lesson 5.12)." },
          { t: "p", text: "The honest warning about the alternative lands well: elaborate mocks around a bad design make it permanent and raise the cost of every future change." },
          { t: "p", text: "The humble-object endpoint completes it — an I/O layer thin enough that a handful of integration tests suffice, because there is nothing left in it to be wrong." }
        ]
      }
    ]
  }
});
