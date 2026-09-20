/* ============================================================================
   LESSON 9.5 — Mocking and Monkeypatching
   ========================================================================= */
EC.receiveLesson({
  id: "9.5",

  lede: "Mocking replaces a real dependency with something you control. Two rules cover almost every mistake people make with it: **patch where the name is looked up, not where it is defined**, and **a bare `Mock` accepts anything you do to it** — including calls that would fail against the real object. A suite that mocks everything passes forever and proves nothing.",

  objectives: [
    "Resolve a patch target correctly, and explain why the obvious target is usually wrong",
    "Use `autospec` so a mock rejects calls the real object would reject",
    "Distinguish stubs, fakes, spies and mocks, and choose deliberately",
    "Control time and randomness without patching the standard library everywhere",
    "Recognise a test that only verifies its own mock setup"
  ],

  prerequisites: ["9.3", "7.4"],

  blocks: [

    { t: "h2", n: "01", text: "Patch where it is looked up", id: "target" },

    {"kind": "flow", "title": "Patch where it is looked up, not where it is defined", "caption": "orders.py did 'from payments import charge', so it holds its own name 'charge'. Patching payments.charge changes a name orders never reads; patching orders.charge is what the test needs.", "cols": 3, "nodes": [{"id": "pay", "label": "payments.charge", "sub": "defined here", "tone": "warn"}, {"id": "ord", "label": "orders.charge", "sub": "bound at import — the name the code uses", "tone": "good"}, {"id": "test", "label": "patch('orders.charge')", "sub": "the right target", "tone": "accent"}], "edges": [["pay", "ord", "from payments import charge"], ["test", "ord", "replaces"]], "t": "diagram", "id": "dg-9_5-01-0"},

    { t: "viz",
      title: "The import binds a name in *your* module",
      caption: "`from x import y` copies a reference into the importing module's namespace. Patching `x.y` afterwards replaces the original but not the copy the module under test is already holding — so the real function still runs.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram showing that patching the module where a function is defined does not affect the reference already imported into the module under test">
  <defs>
    <marker id="pt" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="34" width="240" height="94" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="134" y="58" text-anchor="middle" class="s-label">requests (the library)</text>
  <text x="134" y="84" text-anchor="middle" class="s-mono" style="font-size:10px">get = &lt;function&gt;</text>
  <text x="134" y="108" text-anchor="middle" class="s-sub">where it is DEFINED</text>

  <line x1="258" y1="80" x2="330" y2="80" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#pt)"/>
  <text x="294" y="70" text-anchor="middle" class="s-mono" style="font-size:8px">import</text>

  <rect x="334" y="34" width="266" height="94" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="467" y="58" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">app.client (your module)</text>
  <text x="467" y="84" text-anchor="middle" class="s-mono" style="font-size:10px">from requests import get</text>
  <text x="467" y="108" text-anchor="middle" class="s-sub">a SEPARATE name, same object</text>

  <line x1="14" y1="160" x2="886" y2="160" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <rect x="14" y="182" width="418" height="98" rx="9" style="fill:none;stroke:var(--crit)" stroke-width="1.4"/>
  <text x="34" y="206" class="s-label" style="fill:var(--crit)">patch("requests.get")</text>
  <text x="34" y="232" class="s-sub">replaces the name in the requests module</text>
  <text x="34" y="254" class="s-sub" style="fill:var(--crit)">app.client.get still points at the ORIGINAL</text>
  <text x="34" y="274" class="s-sub" style="fill:var(--crit)">→ the real HTTP call happens</text>

  <rect x="468" y="182" width="418" height="98" rx="9" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="488" y="206" class="s-label" style="fill:var(--good)">patch("app.client.get")</text>
  <text x="488" y="232" class="s-sub">replaces the name the module under test uses</text>
  <text x="488" y="254" class="s-sub" style="fill:var(--good)">→ the mock is called</text>
  <text x="488" y="274" class="s-sub">Rule: patch where it is LOOKED UP</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the two import styles patch differently", code: `
# app/client.py
from requests import get              # binds "get" in app.client

def fetch(url):
    return get(url).json()


# app/other.py
import requests                       # binds "requests" in app.other

def fetch(url):
    return requests.get(url).json()   # looked up at CALL time


# In the tests:
patch("app.client.get")               # correct for the first
patch("requests.get")                 # ALSO works for the second, because
                                      # the lookup happens through the module
patch("app.other.requests.get")       # equivalent, and clearer about intent
`,
      caption: "**`import module` defers the lookup to call time**, which is why it is more patchable — and a small argument for preferring it over `from module import name` in code you expect to test (Lesson 7.4)."
    },

    { t: "callout", kind: "trap", title: "A bare `Mock` accepts everything", body: [
      { t: "code", lang: "python", title: "the test that verifies nothing", numbered: false, code: `
from unittest.mock import Mock, patch

@patch("app.client.get")
def test_fetch(mock_get):
    mock_get.return_value.json.return_value = {"ok": True}

    assert fetch("http://x") == {"ok": True}

    # All of these PASS against a bare Mock, and all are wrong:
    mock_get.jsonn()                       # typo -- returns a new Mock
    mock_get(1, 2, 3, 4, 5)                # wrong arity
    mock_get.assert_called_once_with(...)  # -- but see below`,
        out: `# no errors: every attribute access creates a new Mock`},
      { t: "p", text: "A `Mock` auto-creates any attribute you touch and accepts any call signature. So a test passes after the real function's signature changes, after a method is renamed, and after the code under test starts calling something that does not exist." },
      { t: "p", text: "**Worse: a mistyped assertion silently passes.** `mock.assert_called_once()` is real; `mock.assert_called_once_wiht(...)` is a new auto-created attribute that returns a `Mock` and asserts nothing. `Mock(spec=...)` and `autospec` both close this." }
    ]},

    { t: "code", lang: "python", title: "autospec: a mock shaped like the real thing", code: `
from unittest.mock import create_autospec, patch


# 1. autospec=True: the mock has the real signature and attributes
@patch("app.client.get", autospec=True)
def test_fetch(mock_get):
    mock_get.return_value.json.return_value = {"ok": True}

    fetch("http://x")

    mock_get.assert_called_once_with("http://x")
    # mock_get(1, 2, 3)              -> TypeError: too many arguments
    # mock_get.jsonn()               -> AttributeError
    # mock_get.assert_called_onec()  -> AttributeError


# 2. create_autospec for an object you build yourself
fake_db = create_autospec(Database, instance=True)
fake_db.load_profile.return_value = {"id": "c-1"}
fake_db.load_prfile()                        # AttributeError -- caught
`,
      hl: [5, 11, 12, 13, 14],
      caption: "**Use `autospec=True` by default.** The cost is a slightly slower mock; the benefit is that your tests fail when the real interface changes, which is the entire reason the tests exist."
    },

    { t: "h2", n: "02", text: "The taxonomy", id: "taxonomy" },

    { t: "table",
      head: ["Double", "Does", "Use when"],
      rows: [
        ["**Dummy**", "Nothing — just fills a parameter", "The value is never used"],
        ["**Stub**", "Returns canned answers", "You need the dependency to produce data"],
        ["**Spy**", "Records calls, and passes them through", "You need the real behaviour *and* to check it was called"],
        ["**Mock**", "Records calls and asserts on them", "The **interaction** is the thing being tested"],
        ["**Fake**", "A working, simplified implementation", "**The best default** — an in-memory repository, a fake clock"]
      ],
      caption: "**Reach for a fake before a mock.** A fake exercises real logic through a real interface, so it catches misuse a mock silently accepts — and it is reusable across every test that needs that dependency."
    },

    { t: "ladder",
      title: "Testing a service that saves an order and sends an email",
      rungs: [
        { level: "bad", label: "Mock everything, assert on the mocks",
          why: "Every assertion is about the test's own setup. The service could compute the wrong total, save the wrong customer, or send the email before saving — and this passes. It also breaks whenever an implementation detail changes, so it costs maintenance while catching nothing.",
          code: `@patch("app.service.Database")
@patch("app.service.Mailer")
@patch("app.service.calculate_total")
def test_place_order(mock_total, mock_mailer, mock_db):
    mock_total.return_value = 100
    service = OrderService()

    service.place(order)

    mock_db.return_value.save.assert_called_once()
    mock_mailer.return_value.send.assert_called_once()` },
        { level: "ok", label: "Autospec the boundary, keep the logic real",
          why: "The pricing logic actually runs, so a wrong total fails the test. The mailer is autospecced, so a renamed method is caught. Still asserting on call records rather than on outcomes, which couples the test to how the service does its job.",
          code: `def test_place_order():
    mailer = create_autospec(Mailer, instance=True)
    service = OrderService(db=real_test_db, mailer=mailer)

    service.place(order)

    saved = real_test_db.get(order.id)
    assert saved.total == Decimal("100")
    mailer.send.assert_called_once_with(to="c@x", template="order-placed")` },
        { level: "best", label: "Fakes with real behaviour, assert on outcomes",
          why: "The fakes are simple, reusable and *inspectable*, so assertions read as statements about what happened rather than about which methods were called. And the fake mailer can enforce a rule a mock cannot — that sending requires a saved order.",
          code: `class FakeMailer:
    """A working implementation. Records what it sent, and enforces
    the same precondition the real one does."""

    def __init__(self, db):
        self.db = db
        self.sent: list[Email] = []

    def send(self, *, to: str, template: str, **context) -> None:
        if not to or "@" not in to:
            raise ValueError(f"invalid recipient: {to!r}")
        self.sent.append(Email(to, template, context))


def test_place_order(db, mailer):
    service = OrderService(db=db, mailer=mailer)

    service.place(order)

    assert db.get(order.id).total == Decimal("100")
    assert [e.template for e in mailer.sent] == ["order-placed"]
    assert mailer.sent[0].to == "c@x"`,
          note: "**Write the fake once, in `conftest.py` or a `testing` module, and reuse it everywhere.** The cost is amortised across the whole suite, and it becomes the place where \"what the real mailer requires\" is written down." }
      ]
    },

    { t: "h2", n: "03", text: "monkeypatch versus patch", id: "monkeypatch" },

    { t: "code", lang: "python", title: "the same job, different ergonomics", code: `
# pytest's monkeypatch fixture -- undone automatically after the test
def test_reads_config(monkeypatch, tmp_path):
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    monkeypatch.setattr("app.settings.CONFIG_PATH", tmp_path / "config.toml")
    monkeypatch.setitem(app.REGISTRY, "csv", FakeExporter)
    monkeypatch.chdir(tmp_path)

    assert load_config().log_level == "DEBUG"


# unittest.mock.patch -- as a decorator, context manager, or fixture
from unittest.mock import patch

def test_fetch():
    with patch("app.client.get", autospec=True) as mock_get:
        ...
`,
      caption: "**`monkeypatch` for values, `patch` for callables you will assert on.** `monkeypatch` has no mock machinery — no `assert_called_with`, no `return_value` — which makes it the better tool when you simply want a different value in place."
    },

    { t: "callout", kind: "insight", title: "Time and randomness: inject, do not patch", body: [
      { t: "ladder",
        title: "Making a timestamp testable",
        rungs: [
          { level: "bad", label: "Patch datetime globally",
            why: "`datetime` is immutable C code, so patching it needs a mock class and affects every module that looks it up during the test — including libraries doing their own time arithmetic.",
            code: `@patch("app.service.datetime")
def test_expiry(mock_dt):
    mock_dt.now.return_value = datetime(2026, 1, 1)` },
          { level: "ok", label: "freezegun or time-machine",
            why: "One line, patches the clock globally and correctly, and handles the awkward cases. Good for legacy code where injecting is not practical — and still global, so it slows the suite and affects everything.",
            code: `@freeze_time("2026-01-01")
def test_expiry():
    assert token_expiry().year == 2026` },
          { level: "best", label: "Take the clock as a parameter",
            why: "No patching at all. The dependency is visible in the signature, the test passes a plain lambda, and the production default costs nothing. The same shape handles randomness, uuid generation and anything else non-deterministic.",
            code: `from collections.abc import Callable
from datetime import datetime, timezone


def token_expiry(
    *, now: Callable[[], datetime] = lambda: datetime.now(timezone.utc)
) -> datetime:
    return now() + timedelta(hours=1)


def test_expiry():
    fixed = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert token_expiry(now=lambda: fixed) == fixed + timedelta(hours=1)` }
        ]
      },
      { t: "p", text: "**If something is hard to mock, that is design feedback** (Lesson 9.6). An injected clock is three extra characters at the call site and removes an entire category of test infrastructure." }
    ]},

    { t: "h2", n: "04", text: "Asserting on calls", id: "asserting" },

    { t: "code", lang: "python", title: "the API worth knowing", code: `
mock.assert_called_once_with("http://x", timeout=10)
mock.assert_called_with(...)              # the LAST call only
mock.assert_any_call(...)                 # any call, in any position
mock.assert_not_called()

print(mock.call_count)
print(mock.call_args)                     # the last call: call(args, kwargs)
print(mock.call_args_list)                # every call, in order
print(mock.call_args.kwargs["timeout"])   # 3.8+: named access

# Behaviour
mock.return_value = {"ok": True}
mock.side_effect = ConnectionError("down")            # raises
mock.side_effect = [1, 2, 3]                          # successive returns
mock.side_effect = lambda url: {"url": url}           # computed
`,
      caption: "**`assert_called_with` checks only the most recent call**, which is a common source of tests that pass while missing an earlier wrong call. Use `assert_called_once_with` when there should be exactly one, and `call_args_list` when order matters."
    },

    { t: "callout", kind: "warn", title: "Three assertions that silently do nothing", body: [
      { t: "code", lang: "python", title: "each of these always passes", numbered: false, code: `
mock.assert_called_once_wiht("x")     # typo -> auto-created attribute
mock.assert_called                    # not CALLED -- just an attribute
mock.called_once_with("x")            # not a real method at all`},
      { t: "p", text: "All three are `Mock` attribute accesses that return a new `Mock`, which is truthy and asserts nothing. They have shipped in real codebases for years, giving a green suite over untested code." },
      { t: "p", text: "**Three defences, in order:** use `autospec` so unknown attributes raise; enable `mock.patch` linting (`ruff`'s `PGH005` and pylint's `assert-on-tuple` family catch some); and prefer asserting on **outcomes** over call records, since an outcome assertion cannot be silently misspelled into nothing." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Rescue an over-mocked test",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "This test passes. It also passes if the service charges the wrong amount, saves the wrong customer, emails the wrong person, or sends the confirmation before the payment succeeds. Find every way it fails to test, and rewrite it." },
        { t: "code", lang: "python", title: "test_checkout.py", numbered: false, code: `
from unittest.mock import Mock, patch

@patch("app.checkout.Mailer")
@patch("app.checkout.PaymentGateway")
@patch("app.checkout.OrderRepository")
@patch("app.checkout.calculate_total")
def test_checkout(mock_total, mock_repo, mock_gateway, mock_mailer):
    mock_total.return_value = 100
    mock_gateway.return_value.charge.return_value = Mock(id="ch_1")

    result = checkout(customer_id="c-1", items=[{"sku": "W-1", "qty": 2}])

    assert result is not None
    mock_repo.return_value.save.assert_called_once()
    mock_gateway.return_value.charge.assert_called_once()
    mock_mailer.return_value.send.assert_called_once()`},
        { t: "code", lang: "python", title: "app/checkout.py", numbered: false, code: `
def checkout(customer_id, items):
    total = calculate_total(items)
    repo = OrderRepository()
    gateway = PaymentGateway()
    mailer = Mailer()

    order = repo.save(Order(customer_id=customer_id, total=total))
    charge = gateway.charge(amount=total, customer=customer_id)
    mailer.send(to=f"{customer_id}@example.com", template="receipt")
    return order`},
        { t: "p", text: "The production code has a real bug that the test cannot detect. Find it too." }
      ],
      requirements: [
        "List every behaviour this test fails to verify — there are at least six.",
        "Identify the production bug the mocking hides.",
        "Rewrite using fakes for things you own and an autospecced double at the external boundary.",
        "Assert on outcomes, not on call records, wherever possible.",
        "Make the dependencies injectable, and say why that is the enabling change.",
        "Add a test that fails on the current production code."
      ],
      hint: "Read the order of operations in `checkout` and ask what a customer experiences when the gateway declines. Then ask which of the four mocks would notice.",
      solution: {
        lang: "python",
        title: "checkout.py + test_checkout.py",
        code: `# =========================================================================
# WHAT THE ORIGINAL TEST DOES NOT VERIFY
# =========================================================================
#
# 1. The AMOUNT charged. calculate_total is mocked, so the real pricing
#    logic never runs -- the test asserts 100 only because it said so.
#
# 2. WHICH customer was charged. assert_called_once() checks that a call
#    happened, not what was in it.
#
# 3. WHAT was saved. Same problem: the Order could have the wrong
#    customer, a null total, or no items.
#
# 4. WHO was emailed, and with what template.
#
# 5. The ORDER of operations -- the actual bug, below.
#
# 6. What happens when the gateway DECLINES. There is no test for the
#    failure path at all, and it is the path that matters.
#
# Also: "assert result is not None" passes for any Mock, since every
# Mock is truthy. It asserts nothing.
#
#
# THE PRODUCTION BUG
#
#     order = repo.save(...)                 # saved
#     charge = gateway.charge(...)           # may RAISE
#     mailer.send(..., template="receipt")   # never reached on failure
#
# The order is saved BEFORE the payment is attempted, and nothing
# removes or marks it if the charge fails. So a declined card leaves a
# saved order in the database with no payment and no status -- it looks
# fulfilled to every downstream system.
#
# The mocked gateway never raises, so the failure path is never
# executed and the test cannot see it. That is the cost of mocking a
# boundary and only ever configuring the happy path.


# =========================================================================
# THE FIX -- production code
# =========================================================================

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Protocol


class PaymentDeclined(Exception):
    """Terminal: retrying with the same card will not help (Lesson 6.3)."""


class PaymentGatewayProtocol(Protocol):
    def charge(self, *, amount: Decimal, customer: str) -> str: ...


class OrderRepositoryProtocol(Protocol):
    def save(self, order: "Order") -> "Order": ...
    def get(self, order_id: str) -> "Order | None": ...


class MailerProtocol(Protocol):
    def send(self, *, to: str, template: str, **context: object) -> None: ...


@dataclass
class Order:
    customer_id: str
    total: Decimal
    items: list[dict] = field(default_factory=list)
    id: str = ""
    status: str = "pending"
    charge_id: str | None = None


def checkout(
    *,
    customer_id: str,
    items: list[dict],
    repo: OrderRepositoryProtocol,
    gateway: PaymentGatewayProtocol,
    mailer: MailerProtocol,
) -> Order:
    """Dependencies are PARAMETERS, not constructed inside.

    That is the enabling change: with OrderRepository() called in the
    body, the only way to substitute anything is to patch the name in
    this module -- which is why the original test had four @patch
    decorators. Injection removes the need for any of them (Lesson 9.6).
    """
    total = calculate_total(items)                # real logic, real bug risk
    order = repo.save(Order(customer_id=customer_id, total=total, items=items))

    try:
        charge_id = gateway.charge(amount=total, customer=customer_id)
    except PaymentDeclined:
        # THE FIX: the order does not silently remain as if fulfilled.
        order.status = "payment_failed"
        repo.save(order)
        raise

    order.status = "paid"
    order.charge_id = charge_id
    repo.save(order)

    # After the payment, so a declined card sends no receipt.
    mailer.send(to=f"{customer_id}@example.com", template="receipt",
                order_id=order.id, total=total)
    return order


# =========================================================================
# FAKES -- written once, reused by every test
# =========================================================================

class FakeRepository:
    """A working in-memory implementation, not a mock.

    It can be QUERIED, so tests assert on what was stored rather than
    on which methods were called -- and an outcome assertion cannot be
    silently misspelled into nothing.
    """

    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}
        self._next = 1

    def save(self, order: Order) -> Order:
        if not order.id:
            order.id = f"o-{self._next}"
            self._next += 1
        self._orders[order.id] = order
        return order

    def get(self, order_id: str) -> Order | None:
        return self._orders.get(order_id)

    @property
    def all(self) -> list[Order]:
        return list(self._orders.values())


class FakeMailer:
    """Enforces the same precondition the real mailer does -- a mock
    would happily accept an empty recipient."""

    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, *, to: str, template: str, **context: object) -> None:
        if "@" not in to:
            raise ValueError(f"invalid recipient: {to!r}")
        self.sent.append({"to": to, "template": template, **context})


class FakeGateway:
    """The external boundary. A fake here still beats a mock, because
    it can model DECLINES -- which is the path the original test could
    never reach."""

    def __init__(self, *, declines: bool = False) -> None:
        self.declines = declines
        self.charges: list[dict] = []

    def charge(self, *, amount: Decimal, customer: str) -> str:
        if amount <= 0:
            raise ValueError(f"cannot charge {amount}")
        self.charges.append({"amount": amount, "customer": customer})
        if self.declines:
            raise PaymentDeclined("card declined")
        return f"ch_{len(self.charges)}"


# =========================================================================
# TESTS
# =========================================================================

import pytest
from unittest.mock import create_autospec


@pytest.fixture
def repo() -> FakeRepository:
    return FakeRepository()


@pytest.fixture
def mailer() -> FakeMailer:
    return FakeMailer()


ITEMS = [{"sku": "W-1", "qty": 2, "price": "25.00"}]


def test_successful_checkout_charges_the_real_calculated_total(repo, mailer):
    """calculate_total is NOT mocked, so a pricing bug fails here.
    The original asserted 100 only because the mock returned 100."""
    gateway = FakeGateway()

    order = checkout(customer_id="c-1", items=ITEMS,
                     repo=repo, gateway=gateway, mailer=mailer)

    assert order.total == Decimal("50.00")            # 2 x 25.00, computed
    assert gateway.charges == [{"amount": Decimal("50.00"), "customer": "c-1"}]


def test_the_saved_order_is_correct(repo, mailer):
    """Asserts on STORED STATE, not on save.assert_called_once()."""
    order = checkout(customer_id="c-1", items=ITEMS,
                     repo=repo, gateway=FakeGateway(), mailer=mailer)

    stored = repo.get(order.id)
    assert stored is not None
    assert stored.customer_id == "c-1"
    assert stored.total == Decimal("50.00")
    assert stored.items == ITEMS
    assert stored.status == "paid"
    assert stored.charge_id == "ch_1"


def test_the_receipt_goes_to_the_right_person_with_the_right_data(repo, mailer):
    checkout(customer_id="c-1", items=ITEMS,
             repo=repo, gateway=FakeGateway(), mailer=mailer)

    assert len(mailer.sent) == 1
    assert mailer.sent[0]["to"] == "c-1@example.com"
    assert mailer.sent[0]["template"] == "receipt"
    assert mailer.sent[0]["total"] == Decimal("50.00")


def test_a_declined_payment_does_not_leave_an_order_looking_fulfilled(repo, mailer):
    """THE test that fails on the original production code.

    The order was saved before the charge and nothing marked it, so a
    declined card left a pending order indistinguishable from a paid
    one -- and no mocked test could reach this path, because the mock
    gateway never raised.
    """
    gateway = FakeGateway(declines=True)

    with pytest.raises(PaymentDeclined):
        checkout(customer_id="c-1", items=ITEMS,
                 repo=repo, gateway=gateway, mailer=mailer)

    assert len(repo.all) == 1
    assert repo.all[0].status == "payment_failed"     # NOT "pending"
    assert repo.all[0].charge_id is None


def test_a_declined_payment_sends_no_receipt(repo, mailer):
    """The customer-visible half of the same bug."""
    with pytest.raises(PaymentDeclined):
        checkout(customer_id="c-1", items=ITEMS, repo=repo,
                 gateway=FakeGateway(declines=True), mailer=mailer)

    assert mailer.sent == []


def test_autospec_catches_an_interface_change_at_the_boundary(repo, mailer):
    """Where a double IS the right tool -- an external SDK we do not
    own. autospec means a renamed method or a changed signature fails
    the test instead of being silently accepted.
    """
    gateway = create_autospec(PaymentGatewayProtocol, instance=True)
    gateway.charge.return_value = "ch_9"

    checkout(customer_id="c-1", items=ITEMS,
             repo=repo, gateway=gateway, mailer=mailer)

    gateway.charge.assert_called_once_with(
        amount=Decimal("50.00"), customer="c-1"
    )

    with pytest.raises(AttributeError):
        gateway.chrage                                # a bare Mock allows this

    with pytest.raises(TypeError):
        gateway.charge(1, 2, 3)                       # so does a bare Mock


def test_the_fake_mailer_rejects_what_the_real_one_would(mailer):
    """A fake can enforce preconditions. A Mock accepts an empty
    recipient forever, and the bug ships."""
    with pytest.raises(ValueError, match="invalid recipient"):
        mailer.send(to="", template="receipt")`,
        notes: [
          { t: "p", text: "**The production bug was unreachable, not merely untested.** With the gateway mocked and only its happy path configured, no arrangement of assertions could execute the decline branch — so the test suite's structure, not its assertions, was what hid the bug. A fake that can decline makes the path reachable in one line." },
          { t: "p", text: "**`assert result is not None` passes for every `Mock`**, because mocks are truthy. It is the archetypal assertion that looks like verification and is not, and it appears in real codebases constantly." },
          { t: "p", text: "**Injection is the enabling change, not a style preference.** With `OrderRepository()` constructed inside the function, the only substitution point is patching the name in that module — hence four `@patch` decorators. Parameters remove all four and make the dependencies visible in the signature (Lesson 9.6)." },
          { t: "callout", kind: "insight", title: "Fakes for what you own, autospec at the boundary", body: [
            { t: "p", text: "The repository and mailer are yours: a fake exercises real behaviour, can be queried for outcome assertions, and enforces the same preconditions the real one does — the fake mailer rejecting an empty recipient is a bug caught that a mock would have shipped." },
            { t: "p", text: "The payment gateway is a third-party SDK. There, an autospecced double is right: it verifies the exact call, and it fails when the vendor changes a signature — which is precisely the change a hand-written fake would silently keep passing." }
          ]},
          { t: "p", text: "**Every assertion moved from a call record to an outcome.** `repo.get(order.id).status == \"paid\"` states what the system now believes; `save.assert_called_once()` states only that a method ran. The first survives a refactor that changes how saving works; the second breaks, and it never verified the thing that mattered." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team has 94% coverage and a fully green suite. A release goes out and every payment fails: the payment SDK's `charge()` had been renamed to `create_charge()` in a minor version bump the dependency bot merged." },
      { t: "p", text: "**Every test mocked the gateway with a bare `Mock`.** `mock_gateway.charge(...)` auto-created the attribute and returned a mock, so the tests passed against a method that no longer existed anywhere in the SDK." },
      { t: "p", text: "**`autospec=True` would have failed the suite on the dependency bump**, which is exactly what you want a test suite to do — turn a silent interface change into a red build before it reaches production." },
      { t: "p", text: "**Coverage measured the wrong thing.** The lines executed; nothing verified they did anything real. A test that mocks its dependency and asserts on the mock is a test of the test, and it produces coverage numbers indistinguishable from genuine verification (Lesson 9.8)." }
    ]}
  ],

  takeaways: [
    "**Patch where the name is looked up, not where it is defined.** `from x import y` copies a reference into your module, so patching `x.y` leaves your module's copy untouched.",
    "**`import module` defers the lookup to call time**, which makes it more patchable than `from module import name`.",
    "**A bare `Mock` accepts every attribute and every signature**, so a test can pass against a method that no longer exists.",
    "**A mistyped assertion on a bare `Mock` silently passes** — `assert_called_once_wiht` is just a new attribute. `autospec` turns it into an `AttributeError`.",
    "**Use `autospec=True` by default.** It gives the mock the real signature, so an interface change fails the suite instead of being accepted.",
    "**Prefer a fake to a mock for anything you own.** It exercises real behaviour, can be queried for outcome assertions, and can enforce the preconditions the real object does.",
    "**Assert on outcomes, not on call records.** `repo.get(id).status == \"paid\"` survives a refactor; `save.assert_called_once()` verifies only that a method ran.",
    "**Mocking only the happy path makes failure paths unreachable**, which hides bugs the structure of the test prevents you from finding.",
    "**`assert_called_with` checks the last call only.** Use `assert_called_once_with`, or `call_args_list` when order matters.",
    "**`monkeypatch` for values, `patch` for callables you will assert on** — `monkeypatch` has no mock machinery and undoes itself.",
    "**Inject the clock and the random source rather than patching them.** A `now` parameter with a sensible default removes an entire category of test infrastructure.",
    "**If something is hard to mock, that is design feedback.** Dependencies constructed inside a function force patching; parameters do not."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`app/client.py` has `from requests import get`. Your test patches `requests.get` and a real HTTP call still happens. Why?",
        options: [
          "`patch` cannot replace third-party functions",
          "The import bound a separate name in `app.client` that still points at the original function — you must patch `app.client.get`",
          "The patch was applied after the module was imported",
          "`requests.get` is a C function and cannot be patched"
        ],
        answer: 1,
        why: "`from x import y` copies a reference into the importing module's namespace. Replacing `x.y` afterwards does not change the copy your module is holding. Patch where the name is looked up. `import requests` followed by `requests.get(...)` defers the lookup to call time, which is why that style is patchable at either location."
      },
      {
        stem: "A suite is green, but every payment fails in production after the SDK renamed `charge()` to `create_charge()`. What would have caught it?",
        options: [
          "Higher line coverage",
          "`autospec=True` on the patch, so calling a method the real object does not have raises `AttributeError`",
          "Running the tests against the real API",
          "Pinning the SDK version"
        ],
        answer: 1,
        why: "A bare `Mock` auto-creates any attribute, so `mock.charge(...)` succeeds against a method that no longer exists. `autospec` builds the double from the real object's interface, so the dependency bump fails the suite instead of production. Pinning delays the problem; coverage measures that lines ran, not that they did anything real."
      },
      {
        stem: "Why prefer a hand-written fake over a `Mock` for your own repository class?",
        options: [
          "Fakes are faster to construct",
          "A fake can be queried, so tests assert on stored state rather than on which methods were called — and it can enforce the same preconditions the real one does",
          "`Mock` cannot be used for classes",
          "Fakes are required for integration tests"
        ],
        answer: 1,
        why: "`repo.get(order.id).status == \"paid\"` states what the system believes and survives a refactor of how saving works; `save.assert_called_once()` states only that a method ran and breaks when the implementation changes. A fake that rejects an invalid recipient also catches bugs a mock accepts silently — and it is written once and reused across the suite."
      },
      {
        stem: "A checkout test mocks the payment gateway and configures only a successful charge. What does that make impossible to test?",
        options: [
          "The amount charged",
          "Every failure path — a declined card is never raised, so the code handling it never runs",
          "The email template used",
          "The order in which dependencies are constructed"
        ],
        answer: 1,
        why: "The structure of the test, not its assertions, is what hides the bug: with a mock that always succeeds, no arrangement of assertions can reach the decline branch. A fake that can be configured to decline makes the path reachable in one line — which is how you discover that an order was saved before the payment and left looking fulfilled."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Where do you patch something?",
        strong: "Where it is looked up, not where it is defined. `from requests import get` binds a separate name in your module, so patching `requests.get` leaves that copy untouched — you patch `app.client.get`.",
        answer: [
          { t: "p", text: "Explaining the mechanism rather than reciting the rule is what makes it stick: the import copies a reference, so there are two names for one object and you must replace the one the code under test reads." },
          { t: "p", text: "The corollary is practically useful — `import module` defers the lookup to call time, which makes that style easier to test." },
          { t: "p", text: "The stronger position is that needing to patch at all is often design feedback: an injected dependency needs no patching (Lesson 9.6)." }
        ]
      },
      {
        level: "advanced",
        q: "What is wrong with a test that mocks all its dependencies and asserts the mocks were called?",
        strong: "It verifies its own setup. The code could compute the wrong value, act on the wrong entity, or do things in the wrong order, and the test still passes — while breaking whenever an implementation detail changes.",
        answer: [
          { t: "p", text: "The unreachable-path point is the strongest specific: mocking only the happy path means failure branches never execute, so the structure of the test prevents finding the bug rather than merely missing it." },
          { t: "p", text: "The constructive alternative — fakes for what you own, autospecced doubles at external boundaries, assertions on outcomes — is what turns a critique into a method." },
          { t: "p", text: "The coverage observation lands well: mocked tests execute the lines, so coverage looks identical to genuine verification." }
        ]
      },
      {
        level: "advanced",
        q: "How do you test code that depends on the current time?",
        strong: "Inject the clock — a `now` parameter defaulting to `datetime.now(timezone.utc)`. The test passes a lambda returning a fixed instant, with no patching at all.",
        answer: [
          { t: "p", text: "Naming the alternatives honestly shows range: `freezegun` or `time-machine` for legacy code where injection is impractical, and patching `datetime` directly as the worst option since it is immutable C code with global effects." },
          { t: "p", text: "The general principle is the takeaway — if something is hard to mock, that is design feedback, and the same shape covers randomness, UUIDs and any other non-deterministic source." },
          { t: "p", text: "The cost being three characters at the call site, against an entire category of test infrastructure removed, is what makes the argument decisive." }
        ]
      }
    ]
  }
});
