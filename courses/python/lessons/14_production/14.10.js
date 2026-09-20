/* ============================================================================
   LESSON 14.10 — Designing for Maintainability
   ========================================================================= */
EC.receiveLesson({
  id: "14.10",

  lede: "Code is read far more often than it is written, and changed more often than either. **Maintainability is not tidiness — it is the property that a change costs roughly what it looks like it should cost.** A codebase loses that property gradually, through a hundred reasonable decisions, and regains it only deliberately.",

  objectives: [
    "Reason about coupling and cohesion in concrete terms",
    "Build seams where change is likely, and nowhere else",
    "Record decisions so future readers know what was considered",
    "Distinguish deliberate debt from accidental mess",
    "Refactor safely, in steps that are individually shippable"
  ],

  prerequisites: ["14.1", "14.9"],

  blocks: [

    { t: "h2", n: "01", text: "Coupling, in concrete terms", id: "coupling" },

    {"kind": "compare", "title": "Coupling, in concrete terms", "caption": "Coupling is how much of B you must know to change A. Low coupling is a narrow interface with data crossing it; high coupling is shared mutable state and reaching into internals.", "columns": [{"title": "loose", "tone": "good", "items": ["calls a function with data", "depends on an interface", "can be tested alone"]}, {"title": "tight", "tone": "crit", "items": ["reads B's private attributes", "shares a global", "must be deployed together"]}], "t": "diagram", "id": "dg-14_10-01-0"},


    { t: "viz",
      title: "What actually makes code maintainable",
      caption: "None of these is about cleverness. Each reduces the amount someone must hold in their head to change one thing safely — which is the only definition of maintainable that survives contact with a real team.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Four properties that make code maintainable, each with the question it answers">
  <g style="stroke-width:2">
    <rect x="24"  y="46" width="200" height="124" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="240" y="46" width="200" height="124" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="456" y="46" width="200" height="124" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="672" y="46" width="184" height="124" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
  </g>
  <text x="44"  y="74" class="s-label" style="fill:var(--accent)">LOCALITY</text>
  <text x="260" y="74" class="s-label" style="fill:var(--accent)">NAMES</text>
  <text x="476" y="74" class="s-label" style="fill:var(--accent)">BOUNDARIES</text>
  <text x="692" y="74" class="s-label" style="fill:var(--accent)">TESTS</text>

  <text x="44"  y="104" class="s-sub" style="fill:var(--ink-2)">how many files</text>
  <text x="44"  y="124" class="s-sub" style="fill:var(--ink-2)">must I open to</text>
  <text x="44"  y="144" class="s-sub" style="fill:var(--ink-2)">change one thing?</text>

  <text x="260" y="104" class="s-sub" style="fill:var(--ink-2)">can I guess what</text>
  <text x="260" y="124" class="s-sub" style="fill:var(--ink-2)">this does without</text>
  <text x="260" y="144" class="s-sub" style="fill:var(--ink-2)">reading it?</text>

  <text x="476" y="104" class="s-sub" style="fill:var(--ink-2)">what can I change</text>
  <text x="476" y="124" class="s-sub" style="fill:var(--ink-2)">without anyone</text>
  <text x="476" y="144" class="s-sub" style="fill:var(--ink-2)">else noticing?</text>

  <text x="692" y="104" class="s-sub" style="fill:var(--ink-2)">will I know if</text>
  <text x="692" y="124" class="s-sub" style="fill:var(--ink-2)">I broke it?</text>

  <text x="24" y="212" class="s-sub" style="fill:var(--ink-3)">Code is read far more often than written, and modified by someone with none of the context you have today.</text>
</svg>`
    },
    { t: "table",
      head: ["Kind", "Looks like", "Cost"],
      rows: [
        ["**Data**", "Passing the values a function needs", "**None — this is the goal**"],
        ["Stamp", "Passing a whole object for two fields", "The signature lies about what it uses"],
        ["Control", "A boolean that switches behaviour", "One function doing two things"],
        ["Global", "Shared mutable module state", "**Any caller can change any other's behaviour**"],
        ["Content", "Reaching into another module's internals", "**Their refactor breaks you silently**"],
        ["Temporal", "`init()` must be called before `run()`", "An invisible ordering rule"]
      ],
      caption: "**The useful question is not \"are these coupled?\" but \"if I change A, must I change B?\"** Everything else is vocabulary."
    },

    { t: "code", lang: "python", title: "the same function, three couplings", code: `
# CONTENT COUPLING -- reaches into another object's internals.
# Renaming Order._items breaks this, and nothing points here.
def total(order):
    return sum(i._price * i._qty for i in order._items)


# STAMP COUPLING -- takes a whole Order to use two fields. You cannot
# call it without constructing an Order, so testing it needs a
# fixture, and the signature does not say what it depends on.
def shipping_cost(order: Order) -> Decimal:
    return calculate(order.weight, order.destination)


# DATA COUPLING -- takes what it needs. Testable with two literals,
# reusable from anywhere, and the signature is the documentation.
def shipping_cost(weight: Decimal, destination: Country) -> Decimal:
    return calculate(weight, destination)

# The caller does the unpacking, which is where the knowledge of
# Order's shape belongs:
cost = shipping_cost(order.weight, order.destination)
`,
      hl: [3, 10, 16],
      caption: "**The test for stamp coupling: how many lines does it take to call this in a test?** If constructing the argument is longer than the assertion, the signature is asking for too much."
    },

    { t: "callout", kind: "trap", title: "Control coupling hides two functions in one", body: [
      { t: "code", lang: "python", title: "the boolean parameter", numbered: false, code: `
def send_report(data, *, draft: bool = False, email: bool = True,
                compress: bool = False):
    ...
# 8 combinations, of which 3 are used and 5 are untested. Every
# reader must trace which branches apply, and the call site reads:
send_report(data, True, False, True)      # what does this do?

# THE SMELL: a boolean parameter that selects behaviour usually means
# the function is two functions sharing a body.

def send_draft_report(data) -> None: ...
def send_final_report(data) -> None: ...
# Each does one thing, is named for what it does, and the shared part
# is a private helper both call.

# THE EXCEPTION: a flag that is genuinely DATA rather than a switch.
def render(items, *, include_totals: bool) -> str: ...
# Fine -- it changes the output, not the operation.`},
      { t: "p", text: "**A boolean argument at a call site is unreadable without opening the definition.** Keyword-only arguments help; separate functions help more, when the two branches genuinely do different things." }
    ]},

    { t: "h2", n: "02", text: "Cohesion", id: "cohesion" },

    { t: "ladder",
      title: "Where does `calculate_tax` belong?",
      rungs: [
        { level: "bad", label: "utils.py",
          why: "A module named for what it is not. It accumulates everything with no obvious home, becomes imported by every other module, and is the single biggest source of import cycles in most codebases.",
          code: `# app/utils.py -- 2,400 lines
def calculate_tax(...): ...
def format_currency(...): ...
def send_email(...): ...
def parse_csv(...): ...
def retry_with_backoff(...): ...
# Nothing connects these except that nobody knew where to put them.` },
        { level: "ok", label: "Grouped by kind",
          why: "Better than `utils`, and it is grouping by what things *are* rather than what they are *for*. A change to tax rules still touches several modules, because the tax logic is spread across `calculations`, `formatting` and `validation`.",
          code: `app/calculations.py    tax, discounts, shipping
app/formatting.py      currency, dates, addresses
app/validation.py      all validators` },
        { level: "best", label: "Grouped by what changes together",
          why: "A change to tax rules touches one module. The test for cohesion is not \"are these similar?\" but \"do these change for the same reason?\" — that is what makes a change local.",
          code: `app/pricing/
├── tax.py           rates, rules, exemptions, and their formatting
├── discounts.py     promotion logic and eligibility
└── shipping.py      zones, weights, carriers

# The tax formatter lives next to the tax rules, because when VAT
# changes, both change. Grouping it with "all formatters" means a
# single business change touches three packages.`,
          note: "**Things that change together belong together.** That single sentence resolves most module-boundary arguments." }
      ]
    },

    { t: "h2", n: "03", text: "Seams", id: "seams" },

    { t: "code", lang: "python", title: "a seam is a place you can change behaviour without editing the code", code: `
# NO SEAM. To test this you must have a real Stripe key and make a
# real charge, or monkey-patch a module attribute by string -- which
# breaks silently when the import moves.
def process_payment(order: Order) -> str:
    return stripe.Charge.create(amount=order.total).id


# A SEAM. The dependency is a parameter, so a test passes a fake and
# a second provider is an implementation rather than a rewrite.
class PaymentGateway(Protocol):
    def charge(self, amount: Decimal, key: str) -> str: ...

def process_payment(order: Order, gateway: PaymentGateway) -> str:
    return gateway.charge(order.total, key=f"order-{order.id}")


# WHERE SEAMS EARN THEIR PLACE:
#   - external services       (a provider will be replaced)
#   - the clock and randomness (tests need determinism)
#   - storage                 (in-memory tests are 100x faster)
#   - anything you must fake to test a rule
#
# WHERE THEY DO NOT:
#   - "we might swap the database one day"      -- you will not
#   - a plugin system with exactly one plugin
#   - an abstraction over the standard library
`,
      hl: [10, 17, 23],
      caption: "**A seam you do not use is a cost with no benefit.** Every abstraction adds a layer to read through; add one where change has actually happened, or where testing demands it."
    },

    { t: "callout", kind: "insight", title: "The clock is the seam people forget", body: [
      { t: "code", lang: "python", title: "and it makes tests flaky forever", numbered: false, code: `
# UNTESTABLE. You cannot test the end-of-month case without waiting
# for the end of the month, or freezing time globally.
def is_overdue(invoice: Invoice) -> bool:
    return invoice.due_date < datetime.now(tz=UTC)

# A SEAM, with a default so callers are not burdened.
def is_overdue(invoice: Invoice, now: datetime | None = None) -> bool:
    now = now or datetime.now(tz=UTC)
    return invoice.due_date < now

# Now every boundary case is a one-line test:
assert is_overdue(invoice, now=datetime(2026, 3, 1, tzinfo=UTC))
assert not is_overdue(invoice, now=datetime(2026, 2, 1, tzinfo=UTC))

# The same applies to uuid4(), random(), and os.environ -- anything
# that makes the same input produce a different output.`},
      { t: "p", text: "**A test that depends on the real clock will fail eventually** — at a month boundary, during a daylight-saving change, or on the one day of the year the logic differs. Passing time in costs one parameter." }
    ]},

    { t: "h2", n: "04", text: "Recording decisions", id: "adr" },

    { t: "code", lang: "bash", title: "an ADR — one page, in the repository", code: `
# docs/adr/0007-postgres-over-dynamodb.md

# 7. Use PostgreSQL rather than DynamoDB for the orders service

Date: 2026-03-14
Status: Accepted
(Superseded by 0019 would be added here if it were ever reversed.)

## Context
Orders need multi-row transactions (an order and its line items must
commit together) and ad-hoc reporting queries from the finance team.
We expect under 10M orders per year.

## Decision
PostgreSQL, with SQLAlchemy.

## Consequences
+ Transactions across tables, which the domain genuinely requires
+ SQL for reporting, so finance does not need us to build endpoints
+ The team already operates Postgres
- Horizontal scaling requires deliberate work; we accept this given
  the expected volume
- A single write primary is a failure domain

## Alternatives considered
DynamoDB: rejected. Single-table design would work for the write
path, but the finance reporting requirement would need a second
system, and the transaction guarantees we need are limited to 100
items and one region.

# WHY THIS IS WORTH TEN MINUTES:
# In two years someone will ask "why not Dynamo?" -- and without
# this, the answer is a guess. Worse, they will assume nobody
# considered it, and re-litigate a decision that was made carefully.
`,
      hl: [7, 20, 27],
      caption: "**Record the alternatives, not just the choice.** The value is telling a future reader what was already thought about — and whether the reasons still hold, which is how a decision gets legitimately reversed."
    },

    { t: "callout", kind: "insight", title: "Comments explain why; code explains what", body: [
      { t: "code", lang: "python", title: "the only comments worth writing", numbered: false, code: `
# USELESS -- restates the code, and rots when the code changes.
# Increment the counter by one
counter += 1

# VALUABLE -- explains a decision the code cannot express.
# Sorted before hashing because the API signs the canonical form;
# an unsorted dict produces a valid-looking signature that fails
# verification on their side. See incident 2026-04-02.
payload = json.dumps(data, sort_keys=True)

# VALUABLE -- warns about a constraint that is invisible locally.
# Must stay under 50 items: the downstream service silently
# truncates larger batches rather than rejecting them.
BATCH_SIZE = 50

# VALUABLE -- documents a deliberate deviation.
# Not using the shared retry helper: this endpoint is not idempotent,
# so a retry would double-charge. See ADR 0012.
response = client.post(url, json=body)`},
      { t: "p", text: "**A comment explaining what the code does is a sign the code is unclear.** Rename the variable or extract the function instead — the comment will drift out of date and the name will not." }
    ]},

    { t: "h2", n: "05", text: "Debt, deliberately", id: "debt" },

    { t: "table",
      head: ["Quadrant", "Example", "Response"],
      rows: [
        ["**Deliberate + prudent**", "\"Ship it now, refactor after launch\"", "**Fine — record it with a trigger**"],
        ["Deliberate + reckless", "\"We don't have time for tests\"", "Push back; this is not debt, it is damage"],
        ["**Inadvertent + prudent**", "\"Now we know how it should be structured\"", "**Normal.** Refactor as you learn"],
        ["Inadvertent + reckless", "\"What's a repository pattern?\"", "A learning problem, not a debt problem"]
      ],
      caption: "**Only the first quadrant is debt in the financial sense** — borrowed deliberately, with an intent to repay. The others are mess, ignorance, or the ordinary process of learning what you are building."
    },

    { t: "code", lang: "python", title: "make debt visible and dated", code: `
# A TODO with no owner and no date is a wish. Half of them are years
# old and nobody can say whether they still apply.
# TODO: fix this

# A recorded, triggered piece of debt:
#
# DEBT: this recalculates every tenant's totals on each request.
# Acceptable while tenants are under ~500. At that point it needs a
# materialised view -- see docs/debt/0004-tenant-totals.md
#
# Trigger:  tenant_count > 400
# Owner:    billing team
# Cost now: ~200ms per request at 300 tenants
# Cost to fix: ~2 days
#
# ...and the trigger is a MONITOR, not a memory:
tenant_count = Gauge("tenant_count", "Tenants, for the debt trigger")

# alert: TenantCountApproachingDebtTrigger
#   expr: tenant_count > 400
#   annotations:
#     runbook: docs/debt/0004-tenant-totals.md
`,
      hl: [11, 17, 20],
      caption: "**A trigger that is a metric will fire; a trigger that is a memory will not.** This is the difference between debt you chose and debt that chose you."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a module changeable",
      difficulty: "expert",
      minutes: 40,
      body: [
        { t: "p", text: "This module has been changed eleven times in six months, and each change has caused a regression. The team is now afraid of it. You have been asked to make it safe to change." },
        { t: "code", lang: "python", numbered: false, title: "app/pricing.py", code: `
import stripe
from app.db import session
from app.email import send

TAX_RATES = {"UK": 0.20, "DE": 0.19, "US": 0.0}

def process(order_id, apply_discount=False, send_receipt=True,
            is_test=False):
    order = session.query(Order).get(order_id)

    subtotal = 0
    for item in order.items:
        subtotal += item.price * item.quantity

    if apply_discount:
        if order.customer.tier == "gold":
            subtotal = subtotal * 0.9
        elif order.customer.orders_count > 10:
            subtotal = subtotal * 0.95

    tax = subtotal * TAX_RATES.get(order.customer.country, 0.20)
    total = subtotal + tax

    if not is_test:
        charge = stripe.Charge.create(amount=int(total * 100))
        order.charge_id = charge.id

    order.total = total
    session.commit()

    if send_receipt:
        send(order.customer.email, f"Total: {total}")

    return total`},
        { t: "p", text: "Restructure it. Explain what makes each change dangerous today, and show the tests that become possible." }
      ],
      requirements: [
        "Name every kind of coupling present, with the line.",
        "Explain why `is_test` is the most dangerous parameter here.",
        "Identify the correctness bug in the money handling.",
        "Restructure into testable pieces.",
        "Show the tests that were impossible before.",
        "Give the refactoring order — each step independently shippable."
      ],
      hint: "Count how many reasons this function has to change. And ask what `is_test=True` means for the rest of the function's effects.",
      solution: {
        lang: "python",
        title: "app/pricing/",
        code: `# =========================================================================
# WHY EVERY CHANGE IS DANGEROUS
# =========================================================================
#
# ---- COUPLING -----------------------------------------------------
#
# GLOBAL COUPLING (line 2, 10, 28)
#   "from app.db import session" -- a module-level session. Importing
#   this module requires a database. The function cannot run without
#   one, and two callers share connection state (Lesson 13.5).
#
# CONTENT COUPLING (line 10, 16-18, 21)
#   Reaches through order -> customer -> tier, country, orders_count,
#   email. Any change to the Customer model can break pricing, and
#   nothing in the Customer module points here.
#
# CONTROL COUPLING (lines 7-8)
#   THREE boolean parameters -> 8 combinations, of which perhaps 3
#   are used and none are tested. The call site
#   "process(id, True, False, True)" is unreadable.
#
# TEMPORAL COUPLING (line 26-28)
#   The charge must happen before the commit, and the commit before
#   the email -- an ordering rule that exists only in this function's
#   body and is easy to break while editing.
#
# ---- COHESION -----------------------------------------------------
#
# SEVEN REASONS TO CHANGE, in one function:
#   1. tax rates change
#   2. discount rules change
#   3. the payment provider changes
#   4. the receipt wording changes
#   5. the persistence layer changes
#   6. the order model changes
#   7. rounding rules change
#
# ELEVEN CHANGES IN SIX MONTHS is the direct consequence: every one
# of those seven concerns lands in the same function, so every change
# risks the other six. That is the whole explanation for the
# regression rate.
#
# ---- NO SEAMS -----------------------------------------------------
#
#   stripe   -- imported directly, called directly
#   session  -- module-level global
#   send     -- imported directly
#
# To test the discount rule you need a database, a Stripe key and an
# SMTP server. So nobody tests the discount rule.
#
#
# =========================================================================
# WHY is_test IS THE MOST DANGEROUS PARAMETER
# =========================================================================
#
#   if not is_test:
#       charge = stripe.Charge.create(...)
#
# 1. TEST CODE IN THE PRODUCTION PATH. The behaviour under test is
#    NOT the behaviour in production -- the single most important
#    property a test must have. Every test of this function exercises
#    a code path that never runs for a customer.
#
# 2. IT IS ONE MISTAKE FROM CATASTROPHE, IN EITHER DIRECTION.
#      is_test=True in production  -> orders complete with NO CHARGE.
#                                     Revenue lost silently; the
#                                     order looks successful.
#      is_test=False in a test     -> a REAL charge against a real
#                                     card, from CI.
#    A defaulted positional boolean makes both one keystroke away,
#    and neither produces an error.
#
# 3. IT ONLY HALF-WORKS. is_test skips the charge but still commits
#    the order, sends a real email to a real address, and returns as
#    though it succeeded. So "test mode" writes production data.
#
# 4. IT GROWS. The next person needing to skip the email adds
#    is_test to that branch too, or adds a fourth boolean.
#
# THE FIX IS NOT A BETTER FLAG. It is a seam: inject the gateway, and
# a test passes a fake. The production path then has no test-specific
# branch at all, and the thing you test is the thing that runs.
#
#
# =========================================================================
# THE CORRECTNESS BUG
# =========================================================================
#
#   subtotal = 0                        # int
#   subtotal += item.price * item.quantity
#   subtotal = subtotal * 0.9           # -> FLOAT
#   tax = subtotal * 0.20               # float
#   int(total * 100)                    # TRUNCATES
#
# MONEY IN FLOATING POINT (Lesson 13.2). Concretely:
#
#   subtotal 100.00, gold discount 0.9  -> 90.00000000000001
#   tax at 0.20                         -> 18.000000000000004
#   total                               -> 108.00000000000001
#   int(108.00000000000001 * 100)       -> 10800    (lucky)
#
#   But: subtotal 29.97 * 0.95          -> 28.4715
#   tax                                 -> 5.6943
#   total                               -> 34.1658
#   int(34.1658 * 100) = int(3416.58)   -> 3416, LOSING A PENNY
#
# int() truncates rather than rounds, so the charge is systematically
# under the recorded total. Every affected order is off by up to a
# penny, always in the same direction, and order.total does not match
# what was charged.
#
# THE FIX: Decimal throughout, with an EXPLICIT rounding step at each
# monetary boundary -- and rounding after tax, not before, because
# the order of rounding changes the result.
#
#
# =========================================================================
# THE RESTRUCTURE
# =========================================================================

# ---- app/pricing/rules.py -- PURE. Imports nothing. ---------------

from decimal import Decimal, ROUND_HALF_UP

PENNY = Decimal("0.01")

TAX_RATES: dict[str, Decimal] = {
    "UK": Decimal("0.20"),
    "DE": Decimal("0.19"),
    "US": Decimal("0.00"),
}
DEFAULT_TAX_RATE = Decimal("0.20")


def round_money(amount: Decimal) -> Decimal:
    """One rounding rule, one place. ROUND_HALF_UP because that is
    what finance expects; Python's default is banker's rounding,
    which rounds 0.5 to even and surprises people."""
    return amount.quantize(PENNY, rounding=ROUND_HALF_UP)


def subtotal(lines: Sequence[OrderLine]) -> Decimal:
    return round_money(sum(
        (l.unit_price * l.quantity for l in lines), Decimal("0")
    ))


def discount_rate(tier: CustomerTier, order_count: int) -> Decimal:
    """One reason to change: discount policy. Testable with two
    literals -- no database, no order, no fixture."""
    if tier is CustomerTier.GOLD:
        return Decimal("0.10")
    if order_count > 10:
        return Decimal("0.05")
    return Decimal("0")


def tax_amount(taxable: Decimal, country: str) -> Decimal:
    """One reason to change: tax rules."""
    return round_money(taxable * TAX_RATES.get(country, DEFAULT_TAX_RATE))


@dataclass(frozen=True)
class Price:
    """The result is a VALUE, not four loose numbers. Adding a field
    later does not change any signature."""
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal


def price_order(lines, tier, order_count, country) -> Price:
    """DATA COUPLING: four values in, one value out. No Order, no
    Customer, no session. This is the whole pricing rule, and it is
    testable in a single line."""
    sub = subtotal(lines)
    discount = round_money(sub * discount_rate(tier, order_count))
    taxable = sub - discount
    tax = tax_amount(taxable, country)
    return Price(sub, discount, tax, round_money(taxable + tax))


# ---- app/pricing/ports.py -- the seams ----------------------------

class PaymentGateway(Protocol):
    def charge(self, amount: Decimal, customer_id: UUID,
               idempotency_key: str) -> str: ...

class Notifier(Protocol):
    def receipt(self, order: Order, price: Price) -> None: ...

class OrderRepository(Protocol):
    def get(self, order_id: UUID) -> Order | None: ...
    def save(self, order: Order) -> None: ...


# ---- app/pricing/service.py -- orchestration ----------------------

class PricingService:
    def __init__(self, repo: OrderRepository, gateway: PaymentGateway,
                 notifier: Notifier, uow: UnitOfWork) -> None:
        # Constructor injection. No module-level globals, so importing
        # this module costs nothing and a test needs no infrastructure.
        self._repo = repo
        self._gateway = gateway
        self._notifier = notifier
        self._uow = uow

    def process(self, order_id: UUID, *, apply_discount: bool) -> Price:
        """ONE boolean remains, and it is genuinely a pricing input --
        whether this order is eligible for promotions -- not a switch
        between two different operations.

        is_test and send_receipt are gone: the gateway and the
        notifier are now injected, so a test supplies fakes and the
        production path has no test-specific branch.
        """
        order = self._repo.get(order_id)
        if order is None:
            raise OrderNotFound(order_id)

        # 1. PURE calculation. No I/O, fully tested elsewhere.
        price = price_order(
            order.lines,
            order.customer.tier,
            order.customer.order_count if apply_discount else 0,
            order.customer.country,
        )

        # 2. Persist, in a SHORT transaction.
        with self._uow:
            order.apply_price(price)
            self._repo.save(order)

        # 3. Charge OUTSIDE the transaction (Lessons 13.4, 14.9).
        charge_id = self._gateway.charge(
            price.total, order.customer_id,
            idempotency_key=f"order-{order.id}",
        )
        with self._uow:
            order.mark_paid(charge_id)
            self._repo.save(order)

        # 4. Notify. A failure here must not fail a paid order.
        try:
            self._notifier.receipt(order, price)
        except NotificationError:
            logger.warning("receipt_failed", extra={"order_id": order.id})

        return price


# =========================================================================
# THE TESTS THAT WERE IMPOSSIBLE
# =========================================================================

@pytest.mark.parametrize("tier,count,expected", [
    (CustomerTier.GOLD,     0,  "0.10"),
    (CustomerTier.STANDARD, 11, "0.05"),
    (CustomerTier.STANDARD, 10, "0.00"),   # boundary: > not >=
    (CustomerTier.GOLD,     50, "0.10"),   # gold wins, not cumulative
])
def test_discount_rate(tier, count, expected):
    """Four cases, microseconds, no infrastructure. Before the
    restructure each of these needed a database, a Stripe key and an
    SMTP server -- which is why none of them existed."""
    assert discount_rate(tier, count) == Decimal(expected)


def test_money_is_exact():
    """The float bug, pinned. The old code lost a penny here."""
    price = price_order(
        lines=[line("29.97", 1)], tier=CustomerTier.STANDARD,
        order_count=11, country="UK",
    )

    assert price.discount == Decimal("1.50")     # 29.97 * 0.05
    assert price.tax      == Decimal("5.69")     # (29.97-1.50) * 0.20
    assert price.total    == Decimal("34.16")
    # And every value is exactly two decimal places:
    assert all(v.as_tuple().exponent == -2
               for v in (price.subtotal, price.discount,
                         price.tax, price.total))


def test_rounding_is_half_up_not_bankers():
    """A deliberate deviation from Python's default, and one that
    must not be silently changed."""
    assert round_money(Decimal("2.345")) == Decimal("2.35")
    assert round_money(Decimal("2.355")) == Decimal("2.36")   # not 2.36->2.36
    # Python's default would give 2.34 and 2.36.


def test_tax_is_calculated_after_the_discount():
    """The ORDER of operations is a business rule, and it was
    implicit in a 30-line function before."""
    price = price_order([line("100.00", 1)], CustomerTier.GOLD, 0, "UK")

    assert price.discount == Decimal("10.00")
    assert price.tax      == Decimal("18.00")    # 20% of 90, not 100
    assert price.total    == Decimal("108.00")


def test_a_failed_receipt_does_not_fail_a_paid_order():
    """A fake that raises. No mock framework, no patching by string."""
    svc = PricingService(
        repo=InMemoryOrderRepository(with_order=an_order()),
        gateway=FakeGateway(),
        notifier=BrokenNotifier(),
        uow=NullUnitOfWork(),
    )

    svc.process(ORDER_ID, apply_discount=True)

    assert reload(ORDER_ID).status is OrderStatus.PAID


def test_the_payment_is_idempotent_per_order():
    gateway = FakeGateway()
    svc = service_with(gateway=gateway)

    svc.process(ORDER_ID, apply_discount=False)

    assert gateway.calls[0].idempotency_key == f"order-{ORDER_ID}"


def test_no_test_specific_branch_exists_in_production_code():
    """Guard the is_test removal. The thing under test must be the
    thing that runs."""
    src = Path("src/app/pricing").rglob("*.py")
    for path in src:
        text = path.read_text()
        assert "is_test" not in text, path
        assert "if TESTING" not in text, path


# =========================================================================
# THE REFACTORING ORDER
# =========================================================================
#
# Each step is independently shippable and independently revertible.
# That is the constraint that makes a refactor safe -- a six-step
# change that only works when complete is a rewrite.
#
# STEP 0 -- CHARACTERISATION TESTS. Before changing anything.
#   Capture what the function does NOW, bugs included:
#
#     def test_current_behaviour_100_gold_uk():
#         assert process(order_id) == 108.00000000000001
#
#   These are not aspirational. They pin actual behaviour so a
#   refactor that changes it fails loudly. Delete them as real tests
#   replace them.
#
# STEP 1 -- EXTRACT THE PURE FUNCTIONS. No behaviour change.
#   Move discount_rate, tax_amount and subtotal out, keeping float
#   arithmetic exactly as it was. The old function calls them.
#   -> shippable. The characterisation tests still pass.
#
# STEP 2 -- FIX THE MONEY. A behaviour change, alone, so it is
#   visible in one diff and revertible on its own.
#   Decimal throughout, explicit rounding. The characterisation tests
#   now FAIL -- correctly. Update them to the right values and get
#   finance to confirm the pennies.
#   -> shippable, and the only step that changes output.
#
# STEP 3 -- INTRODUCE THE PORTS. Add PaymentGateway, Notifier and
#   OrderRepository protocols with real implementations, injected
#   with defaults so no caller changes.
#   -> shippable. Nothing behaves differently.
#
# STEP 4 -- REMOVE is_test. Now possible, because tests pass a fake
#   gateway. Delete the branch and every caller passing it.
#   -> shippable, and this is the step that removes the catastrophic
#      failure mode.
#
# STEP 5 -- SPLIT THE BOOLEANS. send_receipt goes away (inject a
#   NullNotifier where a receipt is not wanted). apply_discount stays
#   as a keyword-only argument.
#   -> shippable.
#
# STEP 6 -- MOVE THE CHARGE OUTSIDE THE TRANSACTION.
#   -> shippable, and it fixes the connection-holding problem from
#      Lesson 14.9.
#
# WHY THIS ORDER:
#   - the safety net comes first (step 0)
#   - the correctness fix is isolated in its own step (2), so if
#     finance disputes the pennies, that one commit reverts
#   - the seams (3) must exist before is_test can go (4)
#   - nothing depends on completing step 6, so the work can stop
#     after any step and leave the codebase better than it was`,
        notes: [
          { t: "p", text: "**`is_test` is the most dangerous parameter because it makes the tested behaviour differ from the production behaviour.** `is_test=True` in production completes orders with no charge and no error; `is_test=False` in a test makes a real charge from CI. Both are one keystroke away and neither fails loudly." },
          { t: "p", text: "**A better flag is not the fix — a seam is.** Injecting the gateway means the production path has no test-specific branch at all, which is the property that matters: the thing you test is the thing that runs." },
          { t: "callout", kind: "insight", title: "Seven reasons to change explains eleven regressions", body: [
            { t: "p", text: "Tax rates, discount rules, the payment provider, receipt wording, persistence, the order model and rounding all land in one function. Every change to any one of them risks the other six, which is precisely the regression rate the team is experiencing." },
            { t: "p", text: "Splitting by reason-to-change is what makes a change local. After the restructure, a VAT change touches `tax_amount` and its four tests, and nothing else can break." }
          ]},
          { t: "p", text: "**The money bug loses a penny per order, always downward.** `int(34.1658 * 100)` truncates to 3416, so the charge is systematically below the recorded total — and `order.total` and the Stripe charge disagree, which surfaces weeks later in reconciliation." },
          { t: "p", text: "**Rounding order is a business rule made explicit.** Tax is calculated after the discount, and `ROUND_HALF_UP` is a deliberate deviation from Python's banker's rounding — both are now single-line tests rather than implicit consequences of a thirty-line function." },
          { t: "p", text: "**Step 0 is characterisation tests that pin current behaviour, bugs included.** They are not aspirational; they exist so that a refactor which accidentally changes output fails loudly, and they are deleted as real tests replace them." },
          { t: "p", text: "**Every step ships independently, which is what separates a refactor from a rewrite.** The correctness fix is isolated in step 2 so it can be reverted alone if finance disputes the pennies, and the work can stop after any step leaving the codebase better than it was." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team inherited a service where every change took a week and roughly one in three caused a regression. They proposed a rewrite, estimated at four months." },
      { t: "p", text: "**Instead they spent three weeks adding characterisation tests and extracting pure functions.** No behaviour changed and no feature shipped, which was uncomfortable to justify." },
      { t: "p", text: "**Change velocity roughly tripled and the regression rate fell to near zero.** The rewrite was never needed — the problem was not the design so much as the absence of any seam that let a change be verified in isolation." },
      { t: "p", text: "**A rewrite discards working behaviour, including the edge cases nobody has documented.** Extracting seams keeps all of it and makes the next change cheap, which is what the rewrite was actually being asked to deliver." }
    ]}
  ],

  takeaways: [
    "**Maintainability is the property that a change costs what it looks like it should cost**, and it is lost gradually through reasonable decisions.",
    "**The useful coupling question is \"if I change A, must I change B?\"** — everything else is vocabulary.",
    "**Pass the values a function needs, not the object that contains them.** If constructing the argument in a test is longer than the assertion, the signature asks too much.",
    "**A boolean parameter that switches behaviour usually means two functions sharing a body**, and it makes the call site unreadable without opening the definition.",
    "**Group by what changes together, not by what things are.** `utils.py` is a module named for what it is not, and the main source of import cycles.",
    "**A seam is a place you can change behaviour without editing the code.** Add them for external services, the clock, randomness and storage.",
    "**A seam you do not use is a cost with no benefit** — every abstraction is a layer to read through.",
    "**Pass the clock in.** A test that depends on the real one fails eventually, at a month boundary or a daylight-saving change.",
    "**Test-mode flags in production code are the most dangerous kind of coupling**: the tested behaviour is not the production behaviour, and failure is silent in both directions.",
    "**Comments explain why; code explains what.** A comment restating the code is a sign the code needs renaming.",
    "**Record decisions with their alternatives**, so a future reader knows what was considered and whether the reasons still hold.",
    "**Only deliberate, prudent debt is debt.** Give it a trigger that is a metric, not a memory — a TODO with no owner or date is a wish.",
    "**Refactor in independently shippable steps**, starting with characterisation tests that pin current behaviour, bugs included.",
    "**A rewrite discards the edge cases nobody documented.** Extracting seams keeps them and delivers what the rewrite was being asked for."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function takes `is_test: bool` and skips the payment call when true. Why is this the most dangerous parameter in the module?",
        options: [
          "It adds an untested branch",
          "The tested behaviour is not the production behaviour, and a wrong value silently either charges real cards from CI or completes orders with no charge",
          "Booleans should always be enums",
          "It prevents type checking"
        ],
        answer: 1,
        why: "Both failure directions are one keystroke away and neither raises. The fix is not a safer flag but a seam: injecting the gateway means the production path has no test-specific branch, so the thing under test is the thing that runs."
      },
      {
        stem: "A function has seven reasons to change and has caused a regression on eight of its last eleven edits. What is the connection?",
        options: [
          "The team needs more code review",
          "Every concern lives in one place, so a change to any one of them risks the other six",
          "The function is too long to read",
          "It lacks type annotations"
        ],
        answer: 1,
        why: "Cohesion is about reasons to change, not similarity or length. Splitting by reason makes a change local — after the split, a VAT change touches the tax function and its tests, and nothing else can break."
      },
      {
        stem: "`def is_overdue(invoice): return invoice.due_date < datetime.now(tz=UTC)`. What is the maintainability problem?",
        options: [
          "It should use a naive datetime for speed",
          "There is no seam for the clock, so boundary cases cannot be tested and the test will eventually fail on a real date",
          "The comparison operator is wrong",
          "It should be a method on Invoice"
        ],
        answer: 1,
        why: "Anything that makes the same input produce different outputs — the clock, `uuid4()`, `random()` — needs a seam. An optional `now` parameter with a sensible default costs nothing at the call site and turns every boundary case into a one-line test."
      },
      {
        stem: "You inherit a service where changes are slow and regressions frequent. When is a rewrite the right answer?",
        options: [
          "When the design is more than three years old",
          "Rarely — a rewrite discards undocumented edge cases; adding characterisation tests and extracting seams usually delivers what the rewrite was asked for",
          "Whenever the framework is out of date",
          "When more than half the team is new"
        ],
        answer: 1,
        why: "The working behaviour includes years of accumulated edge cases nobody wrote down, and a rewrite loses all of them while delivering nothing until it is finished. Characterisation tests plus extracted seams make the next change cheap, which is the actual goal."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "How do you decide where to draw module boundaries?",
        strong: "By what changes together. If a business change touches three modules, the boundary is wrong — grouping by what things *are* rather than what they are *for* is what produces `utils.py` and import cycles.",
        answer: [
          { t: "p", text: "\"Things that change together belong together\" is a single sentence that resolves most boundary arguments, and stating it plainly is stronger than reciting cohesion types." },
          { t: "p", text: "The concrete example — a tax formatter belonging next to tax rules rather than with all formatters — makes it actionable." },
          { t: "p", text: "Naming `utils.py` as the failure mode shows you have seen where the principle breaks down in practice." }
        ]
      },
      {
        level: "expert",
        q: "You inherit a codebase everyone is afraid to change. What do you do?",
        strong: "Characterisation tests first, pinning current behaviour including bugs, then extract pure functions and seams in independently shippable steps. Not a rewrite.",
        answer: [
          { t: "p", text: "Leading with the safety net rather than the redesign is what distinguishes someone who has done this from someone who has read about it." },
          { t: "p", text: "The independently-shippable constraint is the substance: a change that only works when complete is a rewrite wearing a refactor's name." },
          { t: "p", text: "Explaining why a rewrite loses undocumented edge cases gives you a reason to decline one without sounding conservative." }
        ]
      },
      {
        level: "advanced",
        q: "How do you manage technical debt?",
        strong: "Make it deliberate, visible and triggered. A recorded decision with a condition that is a monitored metric — not a TODO, which is a wish with no owner and no date.",
        answer: [
          { t: "p", text: "The metric-versus-memory distinction is the practical detail: a trigger that fires is worth more than an intention." },
          { t: "p", text: "Distinguishing deliberate prudent debt from mess is worth making — most \"debt\" is not borrowed, it is accumulated." },
          { t: "p", text: "Being willing to say that some debt should never be repaid, because the trigger will never fire, shows judgement rather than perfectionism." }
        ]
      }
    ]
  }
});
