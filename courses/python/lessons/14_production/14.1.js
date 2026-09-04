/* ============================================================================
   LESSON 14.1 — Project Structure That Scales
   ========================================================================= */
EC.receiveLesson({
  id: "14.1",

  lede: "Structure is not filing. **It is where you decide what may depend on what** — and that decision is the one thing a codebase cannot easily revisit later. A project that grows without it does not become messy so much as inseparable: every module imports every other, and nothing can be tested, replaced or understood alone.",

  objectives: [
    "Adopt the src layout, and explain the class of bug it prevents",
    "Choose between layering and feature packages on the size of the team",
    "Keep business logic free of the framework it happens to be served by",
    "Detect and break an import cycle",
    "Enforce boundaries in CI rather than in review"
  ],

  prerequisites: ["7.5", "7.7"],

  blocks: [

    { t: "h2", n: "01", text: "src layout", id: "src-layout" },

    { t: "code", lang: "bash", title: "the two layouts, and why one wins", code: `
# FLAT LAYOUT -- the package sits at the repository root.
myproject/
├── myproject/          <- importable from the repo root
│   └── __init__.py
├── tests/
└── pyproject.toml

# The problem: running pytest from the root puts "." on sys.path, so
# "import myproject" finds the SOURCE DIRECTORY, not the installed
# package. Tests pass against code that was never packaged -- so a
# missing entry in [tool.setuptools] or an omitted data file is
# invisible until a user installs the wheel.


# SRC LAYOUT -- the package is one level down.
myproject/
├── src/
│   └── myproject/
│       └── __init__.py
├── tests/
└── pyproject.toml

# "src" is not a package and is not on sys.path, so "import myproject"
# can ONLY resolve to the installed distribution. Tests exercise what
# users receive.

pip install -e .        # then tests import the installed package
`,
      hl: [10, 24],
      caption: "**The bug src layout prevents is \"works on my machine, fails on install\".** It is not a style preference — it makes the test suite validate the artefact rather than the working directory."
    },

    { t: "code", lang: "toml", title: "the pyproject that goes with it", code: `
[project]
name = "orders-service"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["fastapi>=0.115", "sqlalchemy>=2.0", "pydantic-settings>=2.0"]

[project.optional-dependencies]
dev = ["pytest>=8", "ruff>=0.6", "mypy>=1.11", "pytest-cov"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/orders_service"]

[tool.pytest.ini_options]
# importmode=importlib avoids the sys.path manipulation that makes
# test discovery depend on where you happened to run pytest from.
addopts = "--import-mode=importlib --strict-markers"
testpaths = ["tests"]
`,
      hl: [15, 20],
      caption: "**One `pyproject.toml` configures the build, the tests, the linter and the type checker.** Scattered `setup.cfg`, `.flake8` and `pytest.ini` files are a migration nobody has finished."
    },

    { t: "h2", n: "02", text: "Layering", id: "layering" },

    { t: "viz",
      title: "Dependencies point one way",
      caption: "Each layer may import the ones below it and never the ones above. That single rule is what makes the domain testable without a database and replaceable without touching business logic.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Four layers with dependencies pointing downward only">
  <rect x="180" y="24" width="540" height="52" rx="9" style="fill:var(--surface-2);stroke:var(--t-blue)"/>
  <text x="450" y="46" text-anchor="middle" class="s-label" style="fill:var(--t-blue)">api / cli / workers</text>
  <text x="450" y="66" text-anchor="middle" class="s-sub">HTTP shapes, request validation, status codes</text>

  <rect x="180" y="96" width="540" height="52" rx="9" style="fill:var(--surface-2);stroke:var(--t-violet)"/>
  <text x="450" y="118" text-anchor="middle" class="s-label" style="fill:var(--t-violet)">services</text>
  <text x="450" y="138" text-anchor="middle" class="s-sub">use cases, orchestration, transaction boundaries</text>

  <rect x="180" y="168" width="540" height="52" rx="9" style="fill:var(--surface-2);stroke:var(--t-green)"/>
  <text x="450" y="190" text-anchor="middle" class="s-label" style="fill:var(--t-green)">domain</text>
  <text x="450" y="210" text-anchor="middle" class="s-sub">entities, rules, invariants — NO framework imports</text>

  <rect x="180" y="240" width="540" height="52" rx="9" style="fill:var(--surface-2);stroke:var(--t-amber)"/>
  <text x="450" y="262" text-anchor="middle" class="s-label" style="fill:var(--t-amber)">adapters</text>
  <text x="450" y="282" text-anchor="middle" class="s-sub">database, HTTP clients, queues, storage</text>

  <path d="M140 44 L140 288" style="stroke:var(--accent)" fill="none" marker-end="url(#dn)"/>
  <defs><marker id="dn" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto">
    <path d="M0 0 L8 0 L4 8 z" style="fill:var(--accent)"/></marker></defs>
  <text x="128" y="170" text-anchor="end" class="s-sub" style="fill:var(--accent)">imports</text>

  <text x="760" y="196" class="s-sub" style="fill:var(--crit)">domain imports</text>
  <text x="760" y="216" class="s-sub" style="fill:var(--crit)">NOTHING above</text>
</svg>`
    },

    { t: "code", lang: "bash", title: "on disk", code: `
src/orders_service/
├── api/                    # FastAPI: routers, dependencies, schemas
│   ├── routers/orders.py
│   ├── schemas.py          # request/response models -- NOT domain
│   └── deps.py
├── services/               # use cases: one module per capability
│   ├── ordering.py
│   └── refunds.py
├── domain/                 # the part with no imports from above
│   ├── models.py           # dataclasses / entities
│   ├── rules.py            # pure functions
│   └── errors.py
├── adapters/               # everything that touches the outside
│   ├── db/
│   │   ├── models.py       # SQLAlchemy -- separate from domain
│   │   └── repositories.py
│   ├── payments.py
│   └── email.py
├── config.py
└── main.py                 # composition root: wires it all together

tests/
├── unit/                   # domain and services, no I/O
├── integration/            # adapters against real infrastructure
└── e2e/                    # the API through the whole stack
`,
      caption: "**`main.py` is the composition root** — the only module that knows which concrete adapter satisfies which interface. Everything else receives what it needs."
    },

    { t: "callout", kind: "tradeoff", title: "Layers or features", body: [
      { t: "code", lang: "bash", title: "the same code, organised twice", numbered: false, code: `
# BY LAYER -- a change to "orders" touches four directories.
api/routers/orders.py      services/ordering.py
domain/order.py           adapters/db/orders.py

# BY FEATURE -- a change to "orders" touches one.
orders/
├── router.py   service.py   models.py   repository.py
billing/
├── router.py   service.py   models.py   repository.py
shared/
└── db.py   config.py   errors.py`},
      { t: "table",
        head: ["", "By layer", "By feature"],
        rows: [
          ["A typical change", "Four directories", "**One**"],
          ["Reviewing a PR", "Scattered", "**Contained**"],
          ["Right below", "**~10 modules**", "Above that"],
          ["Team ownership", "Unclear", "**A team per package**"],
          ["Risk", "Everything becomes shared", "`shared/` becomes a dumping ground"]
        ]
      },
      { t: "p", text: "**Start by layer, split by feature when it hurts.** The moment is recognisable: pull requests routinely touch four directories, and two people cannot work on separate features without conflicting." },
      { t: "p", text: "**Within a feature package, keep the layering.** Feature packages replace the top-level split, not the dependency rule — `orders/router.py` still must not be imported by `orders/domain.py`." }
    ]},

    { t: "h2", n: "03", text: "Keeping the framework out of the domain", id: "framework" },

    { t: "ladder",
      title: "The rule that an order over £10,000 needs approval",
      rungs: [
        { level: "bad", label: "In the route handler",
          why: "The rule is unreachable from anywhere else — a CLI, a bulk import, a worker — so it gets copied and the copies diverge. Testing it needs an HTTP client, and the threshold now lives in three files with two values.",
          code: `@app.post("/orders")
def create_order(body: OrderIn, db: DB):
    if body.total > 10_000:
        raise HTTPException(400, "Needs approval")
    ...` },
        { level: "ok", label: "In a service function",
          why: "Reusable and testable, which is most of the win. The service still imports SQLAlchemy models and raises HTTP-flavoured errors, so the rule cannot be tested without a database and cannot be reused off the web stack.",
          code: `def create_order(db: Session, body: OrderIn) -> Order:
    if body.total > 10_000:
        raise HTTPException(400, "Needs approval")   # HTTP in a service
    order = Order(...)                               # ORM model
    db.add(order)
    return order` },
        { level: "best", label: "In the domain, as a pure function",
          why: "The rule is a function of values. It runs in microseconds with no database, no HTTP and no mocks; the service orchestrates and the API translates. Each layer can be tested for what it actually does.",
          code: `# domain/rules.py -- imports nothing but the standard library
APPROVAL_THRESHOLD = Decimal("10000")

def requires_approval(total: Decimal, customer_tier: Tier) -> bool:
    if customer_tier is Tier.ENTERPRISE:
        return total > APPROVAL_THRESHOLD * 5
    return total > APPROVAL_THRESHOLD


# services/ordering.py -- orchestrates, owns the transaction
def place_order(repo: OrderRepository, cmd: PlaceOrder) -> Order:
    order = Order.new(cmd.items, cmd.customer)
    if requires_approval(order.total, cmd.customer.tier):
        order.mark_pending_approval()
    repo.add(order)
    return order


# api/routers/orders.py -- translates, and nothing else
@router.post("/orders", status_code=201)
def create_order(body: OrderIn, svc: OrderingService) -> OrderOut:
    try:
        return OrderOut.from_domain(svc.place_order(body.to_command()))
    except DomainError as exc:
        raise HTTPException(422, str(exc))`,
          note: "**The test for whether a layer is clean: can you import it in a script with no database running?** If `import domain.rules` starts a connection pool, the layering is decorative." }
      ]
    },

    { t: "callout", kind: "insight", title: "Two sets of models is not duplication", body: [
      { t: "p", text: "Teams resist having a `domain.Order`, a `db.Order` and an `api.OrderOut`, and the resistance is reasonable — three classes with similar fields looks like triplication." },
      { t: "code", lang: "python", title: "what each one is for", numbered: false, code: `
# api/schemas.py -- the WIRE contract. Changing it breaks clients, so
# it must be able to stay still while the others move.
class OrderOut(BaseModel):
    id: UUID
    total: Decimal
    status: str

# domain/models.py -- the RULES. No persistence concerns, no JSON.
@dataclass
class Order:
    id: UUID
    lines: list[OrderLine]
    def total(self) -> Decimal: ...
    def cancel(self) -> None: ...      # enforces the invariant

# adapters/db/models.py -- the STORAGE shape. Indexes, foreign keys,
# denormalised columns, and columns the API must never expose.
class OrderRow(Base):
    __tablename__ = "orders"
    internal_risk_score: Mapped[float]     # never leaves the database`},
      { t: "p", text: "**They diverge the first time any one of them needs to change alone** — a new index, a renamed API field, a rule that needs a value not stored. One class serving all three means every such change is a breaking change somewhere." },
      { t: "p", text: "**For a small service, one Pydantic model is genuinely fine.** The cost of the split is real; pay it when the layers start pulling in different directions, not before." }
    ]},

    { t: "h2", n: "04", text: "Import cycles", id: "cycles" },

    { t: "code", lang: "python", title: "the cycle, and three ways out", code: `
# services/orders.py
from services.billing import charge          # <-+
                                             #   |  cycle
# services/billing.py                        #   |
from services.orders import get_order        # <-+
#
# ImportError: cannot import name 'charge' from partially initialized
# module -- and it appears only for whichever module is imported
# FIRST, which makes it look intermittent.


# FIX 1 -- move the shared thing down. Usually the right answer,
# because a cycle means two modules share a concept neither owns.
# domain/order.py has get_order; both services import downward.

# FIX 2 -- invert the dependency. Billing does not need Orders; it
# needs something that can fetch one.
class OrderLookup(Protocol):
    def get(self, order_id: UUID) -> Order: ...

def charge(lookup: OrderLookup, order_id: UUID) -> Charge: ...

# FIX 3 -- TYPE_CHECKING, for annotations only. This is a workaround,
# not a fix: it silences the error without removing the coupling.
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.orders import Order        # not imported at runtime

def charge(order: "Order") -> Charge: ...
`,
      hl: [12, 17, 24],
      caption: "**A cycle is a design signal, not an import problem.** Reaching for `TYPE_CHECKING` first hides the message; ask what concept the two modules are both reaching for and give it a home below both."
    },

    { t: "h2", n: "05", text: "Enforcing it", id: "enforcing" },

    { t: "code", lang: "toml", title: "boundaries as a CI check", code: `
# import-linter: contracts that fail the build, not a review comment.
[[tool.importlinter.contracts]]
name = "Layers point downward"
type = "layers"
layers = [
    "orders_service.api",
    "orders_service.services",
    "orders_service.domain",
]
# Anything importing upward fails. The domain cannot import services;
# services cannot import api.

[[tool.importlinter.contracts]]
name = "The domain is framework-free"
type = "forbidden"
source_modules = ["orders_service.domain"]
forbidden_modules = ["fastapi", "sqlalchemy", "requests", "starlette"]

[[tool.importlinter.contracts]]
name = "Features are independent"
type = "independence"
modules = ["orders_service.orders", "orders_service.billing"]
# They may share "shared", but not each other.
`,
      hl: [3, 15, 21],
      caption: "**A rule enforced only in review is a rule that survives until a busy week.** These three contracts are the whole architecture, expressed as something CI can check in two seconds."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Restructure a service nobody can test",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This is one file, 2,400 lines. Testing anything requires a running database and a Stripe key, so the team writes no tests. Adding a CLI to place orders has been estimated at two weeks." },
        { t: "code", lang: "python", numbered: false, title: "app.py (excerpt)", code: `
app = FastAPI()
engine = create_engine(os.environ["DATABASE_URL"])
stripe.api_key = os.environ["STRIPE_KEY"]

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    total = Column(Float)
    internal_risk_score = Column(Float)

@app.post("/orders")
def create_order(body: dict):
    with Session(engine) as db:
        if body["total"] > 10000 and body["customer_tier"] != "enterprise":
            raise HTTPException(400, "Needs approval")
        if body["total"] <= 0:
            raise HTTPException(400, "Invalid total")

        order = Order(id=str(uuid4()), total=body["total"])
        order.internal_risk_score = calculate_risk(body)
        db.add(order)

        charge = stripe.Charge.create(amount=int(body["total"] * 100))
        order.charge_id = charge.id
        db.commit()

        requests.post(SLACK_URL, json={"text": f"Order {order.id}"})
        return {"id": order.id, "total": order.total,
                "internal_risk_score": order.internal_risk_score}`},
        { t: "p", text: "Restructure it. Show the target tree, the moved code, and the tests that become possible." }
      ],
      requirements: [
        "Give the target directory structure.",
        "Show where each piece of the handler ends up.",
        "Make the business rules testable with no database and no Stripe.",
        "Identify the data leak in the response.",
        "Explain how adding a CLI becomes a small change.",
        "Give the import-linter contracts that keep it this way."
      ],
      hint: "Read the response dictionary against the model. And note what happens between `db.add` and `db.commit`.",
      solution: {
        lang: "python",
        title: "src/orders_service/",
        code: `# =========================================================================
# WHAT IS WRONG
# =========================================================================
#
# 1. NO SEAMS. Business rules, persistence, payment and notification
#    are interleaved in one function, so none can be exercised
#    without all of them. That is why there are no tests -- not
#    discipline, structure.
#
# 2. MODULE-LEVEL SIDE EFFECTS. create_engine() and stripe.api_key at
#    import time means importing this module opens a connection pool
#    and requires a Stripe key. You cannot import it in a script, a
#    test, or a CLI without production credentials present.
#
# 3. THE DATA LEAK. internal_risk_score is returned in the response.
#    It is an internal signal -- likely a fraud model output -- and it
#    is now visible to every customer, and to anyone who can make an
#    order. A response model would have made this impossible.
#
# 4. body: dict. No validation at all. Missing keys are KeyError ->
#    500; a string total compares fine against 10000 in some paths and
#    explodes in others; total is a float, so money is wrong (13.2).
#
# 5. THE STRIPE CALL IS INSIDE THE TRANSACTION. Row locks are held
#    for the full network round trip -- two seconds normally, thirty
#    on a timeout. Under load that is pool exhaustion (13.4).
#
# 6. NO IDEMPOTENCY. A client retry after a timeout charges twice.
#
# 7. THE SLACK POST CAN FAIL THE REQUEST. The order is committed and
#    the charge is made, then a notification failure raises and the
#    caller sees a 500 for a successful order -- and retries it.
#
# 8. RULES ARE UNREACHABLE. "over 10,000 needs approval" exists only
#    inside an HTTP handler, which is exactly why the CLI is
#    estimated at two weeks: it means reimplementing all of them.


# =========================================================================
# THE TARGET STRUCTURE
# =========================================================================
#
#   src/orders_service/
#   ├── api/
#   │   ├── routers/orders.py     HTTP only: status codes, shapes
#   │   ├── schemas.py            OrderIn / OrderOut  <- the leak fix
#   │   └── deps.py               get_db, current_user, get_service
#   ├── cli/
#   │   └── orders.py             the "two week" feature: ~30 lines
#   ├── services/
#   │   └── ordering.py           orchestration + transaction boundary
#   ├── domain/
#   │   ├── models.py             Order, OrderLine  (dataclasses)
#   │   ├── rules.py              PURE functions, no imports
#   │   └── errors.py             DomainError hierarchy
#   ├── adapters/
#   │   ├── db/models.py          SQLAlchemy rows
#   │   ├── db/repositories.py    OrderRepository
#   │   ├── payments.py           PaymentGateway protocol + Stripe impl
#   │   └── notifications.py      Notifier protocol + Slack impl
#   ├── config.py                 typed settings, no os.environ reads
#   └── main.py                   composition root
#
#   tests/unit/                   no I/O at all
#   tests/integration/            adapters against real infrastructure
#   tests/e2e/                    the API end to end


# =========================================================================
# domain/rules.py -- imports NOTHING. Runs in microseconds.
# =========================================================================

APPROVAL_THRESHOLD = Decimal("10000")
ENTERPRISE_MULTIPLIER = 5


def requires_approval(total: Decimal, tier: CustomerTier) -> bool:
    """The rule that was buried in an HTTP handler. It is a function
    of two values, so it is a function of two values."""
    if tier is CustomerTier.ENTERPRISE:
        return total > APPROVAL_THRESHOLD * ENTERPRISE_MULTIPLIER
    return total > APPROVAL_THRESHOLD


def validate_total(total: Decimal) -> None:
    if total <= 0:
        raise InvalidOrder("Total must be positive")
    if total > Decimal("1000000"):
        raise InvalidOrder("Total exceeds the maximum order value")


# =========================================================================
# domain/models.py -- entities that enforce their own invariants
# =========================================================================

@dataclass
class Order:
    id: UUID
    customer_id: UUID
    lines: list[OrderLine]
    status: OrderStatus = OrderStatus.PENDING
    risk_score: float | None = None       # internal; never serialised
    charge_id: str | None = None

    @classmethod
    def new(cls, customer: Customer, lines: list[OrderLine]) -> "Order":
        order = cls(id=uuid4(), customer_id=customer.id, lines=lines)
        validate_total(order.total)
        if requires_approval(order.total, customer.tier):
            order.status = OrderStatus.PENDING_APPROVAL
        return order

    @property
    def total(self) -> Decimal:
        return sum((l.unit_price * l.quantity for l in self.lines), Decimal(0))

    def mark_paid(self, charge_id: str) -> None:
        if self.status is OrderStatus.PENDING_APPROVAL:
            raise InvalidTransition("Cannot pay an unapproved order")
        self.status = OrderStatus.PAID
        self.charge_id = charge_id


# =========================================================================
# adapters -- protocols first, so services depend on the interface
# =========================================================================

class PaymentGateway(Protocol):
    def charge(self, amount: Decimal, customer_id: UUID,
               idempotency_key: str) -> str: ...


class Notifier(Protocol):
    def order_placed(self, order: Order) -> None: ...


class OrderRepository(Protocol):
    def add(self, order: Order) -> None: ...
    def get(self, order_id: UUID) -> Order | None: ...


# adapters/payments.py -- the only module that knows about Stripe.
class StripeGateway:
    def __init__(self, api_key: SecretStr) -> None:
        # Constructor injection, not module-level configuration. This
        # is what makes the module importable without a key.
        self._client = stripe.StripeClient(api_key.get_secret_value())

    def charge(self, amount: Decimal, customer_id: UUID,
               idempotency_key: str) -> str:
        return self._client.charges.create(
            amount=int(amount * 100),
            customer=str(customer_id),
            idempotency_key=idempotency_key,      # finding 6
        ).id


# =========================================================================
# services/ordering.py -- orchestration, transaction boundaries
# =========================================================================

class OrderingService:
    def __init__(self, repo: OrderRepository, payments: PaymentGateway,
                 notifier: Notifier, uow: UnitOfWork) -> None:
        # Everything is injected, so every dependency can be a fake in
        # a test without a mocking framework.
        self._repo = repo
        self._payments = payments
        self._notifier = notifier
        self._uow = uow

    def place_order(self, cmd: PlaceOrder) -> Order:
        # --- 1. domain: rules applied, nothing external touched ----
        order = Order.new(cmd.customer, cmd.lines)
        order.risk_score = score_risk(order)

        # --- 2. persist, in a SHORT transaction --------------------
        with self._uow:
            self._repo.add(order)

        # --- 3. charge OUTSIDE the transaction (finding 5) ---------
        if order.status is not OrderStatus.PENDING_APPROVAL:
            charge_id = self._payments.charge(
                order.total, order.customer_id,
                # Deterministic: a retry cannot double-charge.
                idempotency_key=f"order-{order.id}",
            )
            with self._uow:
                order.mark_paid(charge_id)
                self._repo.save(order)

        # --- 4. notify: failure must NOT fail the order (finding 7)
        try:
            self._notifier.order_placed(order)
        except NotificationError:
            logger.warning("notify_failed", extra={"order_id": order.id})

        return order


# =========================================================================
# api -- translation only. AND THE LEAK FIX.
# =========================================================================

class OrderOut(BaseModel):
    """An explicit response model. risk_score is ABSENT, so it cannot
    be serialised by accident -- which is finding 3, fixed
    structurally rather than by remembering."""
    id: UUID
    total: Decimal
    status: str

    @classmethod
    def from_domain(cls, order: Order) -> "OrderOut":
        return cls(id=order.id, total=order.total, status=order.status.value)


@router.post("/orders", status_code=201, response_model=OrderOut)
def create_order(body: OrderIn, svc: OrderingSvc,
                 user: CurrentUser) -> OrderOut:
    try:
        return OrderOut.from_domain(svc.place_order(body.to_command(user)))
    except InvalidOrder as exc:
        raise HTTPException(422, str(exc))
    except ApprovalRequired as exc:
        raise HTTPException(409, str(exc))


# =========================================================================
# THE CLI -- the "two week" feature
# =========================================================================

@click.command()
@click.option("--customer", required=True)
@click.option("--sku", "skus", multiple=True, required=True)
def place(customer: str, skus: tuple[str, ...]) -> None:
    """Every rule, every side effect, none of it reimplemented."""
    svc = build_ordering_service()          # the composition root
    order = svc.place_order(PlaceOrder(
        customer=load_customer(customer),
        lines=[line_for(sku) for sku in skus],
    ))
    click.echo(f"{order.id}  {order.status.value}  {order.total}")

# Thirty lines and an afternoon, because the logic was never in the
# HTTP handler. THAT is what the structure buys -- the two-week
# estimate was the cost of the coupling, not the cost of the feature.


# =========================================================================
# main.py -- the composition root
# =========================================================================

def build_ordering_service(settings: Settings) -> OrderingService:
    """The ONLY place that knows which concrete class satisfies which
    protocol. Swapping Stripe for another provider is one line here."""
    engine = create_engine(settings.database_url.get_secret_value())
    return OrderingService(
        repo=SqlOrderRepository(engine),
        payments=StripeGateway(settings.stripe_key),
        notifier=SlackNotifier(settings.slack_url),
        uow=SqlUnitOfWork(engine),
    )


# =========================================================================
# THE TESTS THAT ARE NOW POSSIBLE
# =========================================================================

# ---- unit: microseconds, no I/O, no mocks --------------------------

@pytest.mark.parametrize("total,tier,expected", [
    ("9999",  CustomerTier.STANDARD,   False),
    ("10001", CustomerTier.STANDARD,   True),
    ("10001", CustomerTier.ENTERPRISE, False),   # 5x threshold
    ("50001", CustomerTier.ENTERPRISE, True),
])
def test_approval_threshold(total, tier, expected):
    """Four cases in under a millisecond. Before the restructure this
    needed a database, a Stripe key and an HTTP client."""
    assert requires_approval(Decimal(total), tier) is expected


def test_an_unapproved_order_cannot_be_paid():
    """An invariant on the entity, tested directly."""
    order = Order.new(enterprise_customer(), lines_totalling("60000"))

    with pytest.raises(InvalidTransition):
        order.mark_paid("ch_123")


# ---- service: fakes, not mocks -------------------------------------

def test_a_notification_failure_does_not_fail_the_order():
    """Finding 7. A fake that raises, and no mocking framework."""
    svc = OrderingService(
        repo=InMemoryOrderRepository(),
        payments=FakeGateway(),
        notifier=BrokenNotifier(),           # always raises
        uow=NullUnitOfWork(),
    )

    order = svc.place_order(valid_command())

    assert order.status is OrderStatus.PAID


def test_the_payment_is_idempotent_per_order():
    """Finding 6."""
    payments = FakeGateway()
    svc = service_with(payments=payments)

    order = svc.place_order(valid_command())

    assert payments.calls[0].idempotency_key == f"order-{order.id}"


# ---- api: the leak, pinned -----------------------------------------

def test_the_risk_score_is_never_serialised(client):
    """Finding 3. The response model makes it structurally impossible;
    this test makes the guarantee explicit."""
    body = client.post("/orders", json=VALID).json()

    assert "internal_risk_score" not in body
    assert "risk_score" not in body


# =========================================================================
# THE CONTRACTS THAT KEEP IT THIS WAY
# =========================================================================
#
# [[tool.importlinter.contracts]]
# name = "Layers point downward"
# type = "layers"
# layers = [
#     "orders_service.api",
#     "orders_service.cli",
#     "orders_service.services",
#     "orders_service.domain",
# ]
#
# [[tool.importlinter.contracts]]
# name = "The domain is framework-free"
# type = "forbidden"
# source_modules = ["orders_service.domain"]
# forbidden_modules = ["fastapi", "sqlalchemy", "stripe", "requests"]
#
# [[tool.importlinter.contracts]]
# name = "Services do not import adapters directly"
# type = "forbidden"
# source_modules = ["orders_service.services"]
# forbidden_modules = ["orders_service.adapters"]
# # They depend on the PROTOCOLS; main.py supplies the implementations.
#
# Without these, the structure decays in about six months -- one
# import at a time, each individually reasonable.`,
        notes: [
          { t: "p", text: "**The two-week CLI estimate was the cost of the coupling, not the feature.** Once the rules live in `domain/` and the orchestration in `services/`, the CLI is thirty lines that call the same service the API calls — and every rule comes with it for free." },
          { t: "p", text: "**`internal_risk_score` in the response is the finding with real consequences.** An explicit `response_model` that simply does not contain the field makes the leak structurally impossible rather than something a reviewer has to notice." },
          { t: "callout", kind: "insight", title: "Module-level side effects are what make code untestable", body: [
            { t: "p", text: "`create_engine()` and `stripe.api_key = ...` at import time mean the module cannot be imported without a database URL and a payment key present. Every test, every script and every CLI inherits that requirement." },
            { t: "p", text: "Constructor injection moves the decision to the composition root, so `import domain.rules` costs nothing and a test supplies a fake in one line. The rule to apply: importing a module should do nothing observable." }
          ]},
          { t: "p", text: "**Fakes beat mocks here, and the structure is what enables them.** `InMemoryOrderRepository` and `BrokenNotifier` are ten lines each, they never drift out of sync with a signature the way a patched string does, and the test reads as a description of behaviour rather than of calls." },
          { t: "p", text: "**The Stripe call moving outside the transaction is a correctness fix as much as a performance one.** Row locks held for a thirty-second timeout exhaust the pool, and a commit failing after a successful charge leaves money taken with no record." },
          { t: "p", text: "**Without the import-linter contracts this decays in about six months.** Each individual upward import is reasonable in the moment — a service reaching for a schema, a domain module wanting a session — and the contracts turn that from a review argument into a two-second CI check." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team split their monolith into `api`, `services` and `domain` packages, wrote it up, and were pleased with it. They did not enforce it." },
      { t: "p", text: "**Eight months later, `domain` imported FastAPI.** A tracing decorator here, an `HTTPException` there, a Pydantic model for convenience — each addition reviewed and approved by someone who did not have the whole rule in mind." },
      { t: "p", text: "**The unit tests had quietly become integration tests.** They still passed, but the suite had gone from four seconds to ninety, and nobody could point to the commit that did it because no single commit did." },
      { t: "p", text: "**Three import-linter contracts, added at the start, would have cost nothing.** Adding them afterwards took a fortnight of untangling — which is the general shape: architecture is cheap to enforce and expensive to restore." }
    ]}
  ],

  takeaways: [
    "**Use the src layout.** It makes `import mypackage` resolve to the installed distribution, so tests exercise the artefact users receive rather than the working directory.",
    "**Structure is a decision about what may depend on what**, and that is the decision a codebase cannot easily revisit later.",
    "**Dependencies point downward: api → services → domain**, and the domain imports nothing above it.",
    "**The test for a clean layer: can you import it with no database running?** If `import domain` opens a connection pool, the layering is decorative.",
    "**Start by layer, split by feature when pull requests routinely touch four directories** — and keep the layering inside each feature package.",
    "**Business rules belong in pure functions**, so they run in microseconds, need no mocks, and are reachable from a CLI, a worker or a bulk import.",
    "**Separate API schemas, domain models and database rows when they start pulling in different directions** — one class serving all three makes every change a breaking change somewhere.",
    "**An explicit `response_model` prevents data leaks structurally**, rather than relying on a reviewer noticing an internal field.",
    "**Module-level side effects are what make code untestable.** Importing a module should do nothing observable.",
    "**An import cycle is a design signal** — two modules reaching for a concept neither owns. Move it down rather than reaching for `TYPE_CHECKING`.",
    "**The composition root is the only module that knows which concrete class satisfies which protocol.**",
    "**Fakes beat mocks when the structure allows them** — they do not drift out of sync with a signature the way a patched string does.",
    "**Enforce boundaries with import-linter in CI.** A rule that lives only in review survives until a busy week."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What class of bug does the src layout prevent?",
        options: [
          "Circular imports",
          "\"Works locally, fails on install\" — with a flat layout, tests import the source directory rather than the installed package, so packaging mistakes are invisible",
          "Namespace collisions between dependencies",
          "Slow test collection"
        ],
        answer: 1,
        why: "Running pytest from the repository root puts `.` on `sys.path`, so `import myproject` finds the source tree. A missing package entry or an omitted data file then passes every test and fails for the first user who installs the wheel. With `src/`, the only resolvable import is the installed distribution."
      },
      {
        stem: "A team estimates two weeks to add a CLI that places orders. What does that estimate reveal?",
        options: [
          "CLIs are inherently expensive in Python",
          "The business rules live inside HTTP handlers, so the CLI would have to reimplement them — the estimate is the cost of the coupling",
          "The database schema needs changing",
          "Click requires significant boilerplate"
        ],
        answer: 1,
        why: "With rules in pure domain functions and orchestration in a service, a CLI is thirty lines calling the same service the API calls. The estimate measures how far the logic has spread into the delivery mechanism, which is exactly what layering is meant to prevent."
      },
      {
        stem: "Two service modules import each other and you get a partially-initialised module error. What is the best first response?",
        options: [
          "Wrap one import in `TYPE_CHECKING`",
          "Find the concept both modules are reaching for and move it into a module below both",
          "Move the import inside the function that needs it",
          "Merge the two modules"
        ],
        answer: 1,
        why: "A cycle means two modules share ownership of something neither owns. `TYPE_CHECKING` and function-level imports silence the error while leaving the coupling, and the error is a useful signal — it appears only for whichever module is imported first, which is why it looks intermittent."
      },
      {
        stem: "Why does `create_engine()` at module level make a codebase hard to test?",
        options: [
          "It is slow to construct",
          "Importing the module then requires a database URL and opens a pool, so every test, script and CLI inherits that requirement",
          "SQLAlchemy engines are not thread-safe",
          "It prevents dependency injection frameworks from working"
        ],
        answer: 1,
        why: "Importing a module should do nothing observable. Moving construction into a composition root means `import domain.rules` costs nothing, a test supplies a fake in one line, and the module can be used from a CLI without production credentials present."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you structure a Python service?",
        strong: "src layout, and layers where dependencies point one way: api → services → domain, with adapters at the edge. The domain imports no framework, so it can be tested with no infrastructure — and I would enforce that with import-linter rather than in review.",
        answer: [
          { t: "p", text: "The enforcement point is what makes this a considered answer; anyone can name layers, and the interesting question is what stops them decaying." },
          { t: "p", text: "Giving the concrete test — can you import the domain with no database running — turns an abstract principle into something checkable." },
          { t: "p", text: "Saying you would start by layer and split by feature when pull requests touch four directories shows you treat structure as a response to pressure rather than a template." }
        ]
      },
      {
        level: "advanced",
        q: "Why keep business logic out of framework code?",
        strong: "So it is reachable from anywhere and testable without infrastructure. A rule inside an HTTP handler cannot be used by a CLI, a worker or a bulk import, so it gets copied — and the copies diverge.",
        answer: [
          { t: "p", text: "The divergence argument is stronger than the testability one, because it explains a failure people have seen: two thresholds with different values in two files." },
          { t: "p", text: "The two-week CLI estimate is a concrete illustration worth having ready — it makes coupling measurable in days." },
          { t: "p", text: "Acknowledging that a small service can reasonably keep one Pydantic model shows judgement rather than dogma." }
        ]
      },
      {
        level: "core",
        q: "You find a circular import. What do you do?",
        strong: "Treat it as a design signal. Two modules are reaching for a concept neither owns, so I find that concept and move it into a module below both — or invert the dependency with a protocol.",
        answer: [
          { t: "p", text: "Naming `TYPE_CHECKING` as a workaround rather than a fix is the distinction interviewers listen for." },
          { t: "p", text: "The protocol inversion shows a second tool: billing does not need orders, it needs something that can fetch one." },
          { t: "p", text: "Mentioning that the error appears only for whichever module is imported first explains why these look intermittent, which suggests you have debugged one." }
        ]
      }
    ]
  }
});
