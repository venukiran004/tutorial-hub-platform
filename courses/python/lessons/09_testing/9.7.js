/* ============================================================================
   LESSON 9.7 — Integration Tests and Test Data
   ========================================================================= */
EC.receiveLesson({
  id: "9.7",

  lede: "Unit tests prove your logic is right. Integration tests prove your **assumptions about someone else's system** are right — and that is where the expensive bugs live: the query that works against SQLite and not Postgres, the API whose 404 body is HTML rather than JSON. The trick is getting that coverage without a suite nobody will run.",

  objectives: [
    "Decide what genuinely needs a real dependency and what does not",
    "Run a real database in tests with `testcontainers`, once per session",
    "Stub HTTP at the transport layer rather than mocking your own client",
    "Build test data with factories that state only what the test cares about",
    "Keep an integration suite fast enough that people run it before pushing"
  ],

  prerequisites: ["9.5", "9.6"],

  blocks: [

    { t: "h2", n: "01", text: "What an integration test is for", id: "why" },

    { t: "viz",
      title: "The two tests catch different bugs",
      caption: "A unit test asks whether your code does what you meant. An integration test asks whether what you meant matches reality. Neither substitutes for the other, and the second is where the surprises are.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram contrasting unit tests covering your own logic with integration tests covering the boundary to a real dependency">
  <rect x="14" y="34" width="418" height="196" rx="12" style="fill:none;stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="34" y="60" class="s-label" style="fill:var(--accent-ink)">UNIT — your logic, with fakes</text>

  <rect x="44" y="80" width="150" height="52" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="119" y="103" text-anchor="middle" class="s-mono" style="font-size:10px">pricing rules</text>
  <text x="119" y="120" text-anchor="middle" class="s-sub">pure functions</text>

  <rect x="252" y="80" width="150" height="52" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="327" y="103" text-anchor="middle" class="s-mono" style="font-size:10px">FakeRepository</text>
  <text x="327" y="120" text-anchor="middle" class="s-sub">in memory</text>

  <text x="34" y="164" class="s-sub">Catches: wrong branch, off-by-one, bad boundary,</text>
  <text x="34" y="184" class="s-sub">a rule applied in the wrong order.</text>
  <text x="34" y="212" class="s-sub" style="fill:var(--good)">Milliseconds. Hundreds of them. Run on every save.</text>

  <rect x="468" y="34" width="418" height="196" rx="12" style="fill:none;stroke:var(--warn-line)" stroke-width="1.5"/>
  <text x="488" y="60" class="s-label" style="fill:var(--warn)">INTEGRATION — the real thing</text>

  <rect x="498" y="80" width="150" height="52" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="573" y="103" text-anchor="middle" class="s-mono" style="font-size:10px">Repository</text>
  <text x="573" y="120" text-anchor="middle" class="s-sub">real SQL</text>

  <rect x="706" y="80" width="150" height="52" rx="8" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.4"/>
  <text x="781" y="103" text-anchor="middle" class="s-mono" style="font-size:10px">Postgres 16</text>
  <text x="781" y="120" text-anchor="middle" class="s-sub">in a container</text>

  <text x="488" y="164" class="s-sub">Catches: a migration that does not apply, a unique</text>
  <text x="488" y="184" class="s-sub">index you forgot, a type that round-trips wrong.</text>
  <text x="488" y="212" class="s-sub" style="fill:var(--warn)">Seconds. A few dozen. Run before pushing.</text>
</svg>`
    },

    { t: "table",
      head: ["Bug", "Unit test with a fake", "Integration test"],
      rows: [
        ["A pricing rule applied in the wrong order", "**Catches it**", "Catches it, slowly"],
        ["A SQL query with a syntax error", "Misses — the fake has no SQL", "**Catches it**"],
        ["A unique constraint you did not declare", "Misses", "**Catches it**"],
        ["`Decimal` stored and read back as `float`", "Misses — the fake stores the object", "**Catches it**"],
        ["A migration that fails on an empty table", "Misses", "**Catches it**"],
        ["An API returning HTML on a 404", "Misses", "**Catches it**"],
        ["A timezone dropped on the way into the database", "Misses", "**Catches it**"]
      ],
      caption: "**Every miss in that column is a fake agreeing with you.** A fake encodes your understanding of the dependency, so it cannot tell you your understanding is wrong — which is exactly what an integration test is for (Lesson 9.5)."
    },

    { t: "h2", n: "02", text: "A real database, once per session", id: "database" },

    { t: "code", lang: "python", title: "testcontainers: the container is the fixture", code: `
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from testcontainers.postgres import PostgresContainer


@pytest.fixture(scope="session")
def engine():
    """One container for the whole run.

    Starting Postgres takes two to four seconds. Per test that is a suite
    nobody runs; once per session it is a fixed cost you stop noticing.
    """
    with PostgresContainer("postgres:16-alpine") as container:
        engine = create_engine(container.get_connection_url(), future=True)
        Base.metadata.create_all(engine)          # or run your migrations
        yield engine


@pytest.fixture
def db(engine):
    """Per test, and always rolled back — so tests cannot see each other's
    rows however badly the code under test behaves (Lesson 9.3)."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    yield session

    session.close()
    transaction.rollback()
    connection.close()
`,
      hl: [8, 13, 24, 29],
      caption: "**`join_transaction_mode=\"create_savepoint\"` is the detail that makes it airtight.** Without it, a `session.commit()` inside the code under test ends the outer transaction and the rollback has nothing left to undo."
    },

    { t: "callout", kind: "tradeoff", title: "SQLite in place of the real database", body: [
      { t: "p", text: "It is tempting: no container, no Docker, sub-millisecond startup. And for a suite whose queries are simple it genuinely works. The question is what it stops catching." },
      { t: "table",
        head: ["Differs in", "SQLite", "Postgres"],
        rows: [
          ["Types", "Dynamic — a `VARCHAR(10)` accepts 400 characters", "Enforced, and it raises"],
          ["`ALTER TABLE`", "Very limited", "Full — so migrations behave differently"],
          ["Concurrency", "One writer, whole-file locking", "MVCC, row locks, deadlocks"],
          ["`JSONB`, arrays, `ILIKE`, window frames", "Absent or approximated", "Present, and probably in your queries"],
          ["Constraint timing", "Immediate only", "Deferrable"],
          ["`RETURNING`, upsert", "Partial", "Full"]
        ]
      },
      { t: "p", text: "**Use the same engine you deploy on.** A test suite that passes on a database you do not run in production is testing a system that does not exist — and the failures it misses arrive on the day of a release, in the queries you were most confident about." },
      { t: "p", text: "SQLite is a reasonable choice when SQLite *is* production, or for a throwaway prototype. Not as a stand-in." }
    ]},

    { t: "h2", n: "03", text: "HTTP, stubbed at the right layer", id: "http" },

    {"kind": "layers", "title": "Stub HTTP at the right layer", "caption": "Replace the transport, not your own client code: respx or a fake transport answers httpx's requests, so serialisation, retries and error handling still run for real.", "items": [{"label": "your service code", "sub": "runs for real", "tone": "good"}, {"label": "your API client wrapper", "sub": "runs for real — retries, parsing", "tone": "good"}, {"label": "httpx / requests", "sub": "runs for real", "tone": "accent"}, {"label": "transport → stubbed here", "sub": "respx / responses / a MockTransport", "tone": "warn"}, {"label": "the network", "sub": "never touched in a test", "tone": "crit"}], "t": "diagram", "id": "dg-9_7-03-0"},

    { t: "ladder",
      title: "Testing a client that calls a payment API",
      rungs: [
        { level: "bad", label: "Mock your own client",
          why: "The thing under test is replaced by the test's assumptions, so nothing about the request, the URL, the headers or the response parsing is exercised. A renamed SDK method still passes (Lesson 9.5).",
          code: `@patch("app.billing.PaymentClient")
def test_charge(mock_client):
    mock_client.return_value.charge.return_value = {"id": "ch_1"}
    assert charge(order) == "ch_1"` },
        { level: "ok", label: "Stub the transport",
          why: "Your real client runs: it builds the URL, sets the headers, sends the body and parses the response. Only the socket is replaced. `responses` or `respx` assert on the request that was actually made.",
          code: `import respx
import httpx


@respx.mock
def test_charge():
    route = respx.post("https://pay.test/charges").mock(
        return_value=httpx.Response(200, json={"id": "ch_1"})
    )

    assert charge(order) == "ch_1"

    # The request itself is now assertable
    request = route.calls.last.request
    assert request.headers["Idempotency-Key"]
    assert json.loads(request.content)["amount"] == 1999` },
        { level: "best", label: "Stub the transport, and pin it to the real contract",
          why: "A stub still encodes your belief about the API. Recording a real response once, and replaying it, means the stub is the vendor's output rather than your memory of it — and a contract test run nightly tells you when it stops being true.",
          code: `# tests/fixtures/charge_201.json — captured from the sandbox API,
# secrets scrubbed, committed.

@pytest.fixture
def charge_response():
    return json.loads(
        (FIXTURES / "charge_201.json").read_text(encoding="utf-8")
    )


@respx.mock
def test_charge_parses_a_real_response(charge_response):
    respx.post("https://pay.test/charges").mock(
        return_value=httpx.Response(201, json=charge_response)
    )
    result = charge(order)
    assert result.id == charge_response["id"]


@pytest.mark.contract          # deselected by default, run nightly
def test_sandbox_still_matches_our_fixture():
    """The one test that talks to the real sandbox. When the vendor
    changes a field, this fails and every replayed test is stale."""
    live = httpx.post(SANDBOX_URL, json=PAYLOAD, timeout=10).json()
    assert set(live) >= set(charge_response)`,
          note: "Mark the live test and deselect it in the default run — `addopts = \"-m 'not contract'\"` — so a vendor outage cannot fail a pull request that has nothing to do with them." }
      ]
    },

    { t: "callout", kind: "trap", title: "Never let the default suite reach the network", body: [
      { t: "code", lang: "python", title: "make it structurally impossible", numbered: false, code: `
# conftest.py
import socket

import pytest


@pytest.fixture(autouse=True)
def _no_network(request, monkeypatch):
    """Block real sockets unless a test asks for them by marker.

    One of the very few justified autouse fixtures (Lesson 9.3): it makes
    an accidental network call fail loudly instead of making the suite
    slow, flaky and dependent on someone else's uptime.
    """
    if "network" in request.keywords:
        return

    def guard(*args, **kwargs):
        raise RuntimeError(
            "this test tried to open a socket — stub the transport, "
            "or mark it @pytest.mark.network"
        )

    monkeypatch.setattr(socket, "socket", guard)`},
      { t: "p", text: "The symptom without it is a suite that passes on a laptop, fails in CI where egress is blocked, and passes again on a re-run — because the call it was making was cached somewhere." },
      { t: "p", text: "**The error message is the feature.** \"Connection refused\" sends someone to the network team; \"this test tried to open a socket\" sends them to the test." }
    ]},

    { t: "h2", n: "04", text: "Test data", id: "data" },

    { t: "code", lang: "python", title: "state only what the test is about", code: `
import factory
from factory.alchemy import SQLAlchemyModelFactory


class CustomerFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Customer
        sqlalchemy_session_persistence = "flush"

    id = factory.Sequence(lambda n: f"c-{n}")
    name = factory.Faker("name")
    email = factory.LazyAttribute(lambda o: f"{o.id}@example.test")
    tier = "standard"


class OrderFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Order
        sqlalchemy_session_persistence = "flush"

    id = factory.Sequence(lambda n: f"o-{n}")
    customer = factory.SubFactory(CustomerFactory)   # built automatically
    total = Decimal("100.00")
    status = "paid"


def test_gold_customers_are_not_charged_delivery(db):
    """The test names ONE thing: the tier. Everything else is a default,
    so a reader knows instantly which field the assertion depends on."""
    customer = CustomerFactory(tier="gold")
    OrderFactory(customer=customer, total=Decimal("20.00"))

    assert delivery_charge_for(customer) == Decimal("0")
`,
      hl: [30, 31],
      caption: "**The alternative is a twelve-field constructor call in every test**, where a reader cannot tell which field matters. A factory makes the significant field the only one written down."
    },

    { t: "callout", kind: "insight", title: "Shared fixture data is the slow poison", body: [
      { t: "code", lang: "python", title: "the pattern that always ends badly", numbered: false, code: `
# A "realistic" seed file, loaded once, used by everything
@pytest.fixture(scope="session")
def seeded_db(engine):
    load_fixtures(engine, "tests/data/full_dataset.sql")   # 400 rows
    return engine


def test_report_totals(seeded_db):
    assert report_total() == Decimal("48210.55")     # why? nobody knows`},
      { t: "ul", items: [
        "**The magic number is unexplainable.** Six months later nobody can say whether 48210.55 is right, so when it changes the test is updated to match rather than investigated.",
        "**Every test depends on every row.** Adding a customer for one test breaks four others, so the dataset ossifies and new tests work around it.",
        "**It hides what each test needs.** The setup is invisible, so the test reads as an assertion with no premise."
      ]},
      { t: "p", text: "**Build the data the test needs, in the test.** Three factory calls and an assertion on a total you can compute in your head beats a shared dataset every time — and it stays true when someone adds a row." }
    ]},

    { t: "h2", n: "05", text: "Keeping it fast enough to run", id: "fast" },

    { t: "table",
      head: ["Technique", "Buys", "Costs"],
      rows: [
        ["Session-scoped container, per-test transaction", "The whole startup cost, once", "Nothing — this is simply correct"],
        ["`pytest-xdist` (`-n auto`)", "Near-linear speed-up across cores", "Each worker needs its own database or schema"],
        ["Markers: `unit`, `integration`, `contract`", "A fast default run; the slow ones on demand", "Discipline to mark them"],
        ["`--lf` / `--ff` locally", "Failures first, instant feedback loop", "Nothing"],
        ["A template database restored per test", "Faster than re-running migrations", "Postgres-specific setup"],
        ["Reusing the container across runs (`--reuse`)", "Two seconds saved per local run", "Stale schema if migrations change"]
      ],
      caption: "**The target is a default `pytest` under about a minute.** Past that, people stop running it before pushing, CI becomes the first feedback, and the loop that makes tests useful is broken."
    },

    { t: "code", lang: "toml", title: "the configuration that makes the split real", code: `
[tool.pytest.ini_options]
testpaths = ["tests"]
# Default run: unit tests only. Fast enough to run on save.
addopts = "-q --strict-markers -m 'not integration and not contract'"

markers = [
  "integration: needs a real database or container",
  "contract: talks to a live third-party sandbox",
  "network: allowed to open a socket",
]

# CI runs everything:            pytest -m ''
# Integration only:              pytest -m integration
# Nightly contract check:        pytest -m contract
`,
      caption: "`--strict-markers` turns a typo in a marker name into an error rather than a test that silently belongs to no group — which is how a suite quietly stops running half its integration tests."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Build an integration suite that people will actually run",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "A team has an order service backed by Postgres and a payment API. Their suite takes eleven minutes, is skipped locally, and still misses a bug class that reaches production twice a year: queries that work on SQLite and not on Postgres." },
        { t: "code", lang: "python", title: "conftest.py — as found", numbered: false, code: `
@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)

@pytest.fixture(scope="session")
def seeded():
    load_fixtures("tests/data/everything.sql")     # 900 rows

@patch("app.billing.PaymentClient")
def test_checkout(mock_client, db, seeded):
    mock_client.return_value.charge.return_value = {"id": "ch_1"}
    assert checkout(order_id="o-1").status == "paid"`},
        { t: "p", text: "Rebuild it. The measure of success is that the default run is under a minute and the Postgres-only bugs get caught." }
      ],
      requirements: [
        "Real Postgres, started once per session, with per-test isolation that survives a `commit()` in the code under test.",
        "Replace the mocked client with a transport-level stub that asserts on the request.",
        "Replace the shared seed file with factories.",
        "Make an accidental network call fail with a useful message.",
        "Split the suite with markers so the default run is fast.",
        "Show the test that fails on SQLite and passes on Postgres.",
        "**Explain which of these changes actually fixed the eleven minutes.**"
      ],
      hint: "The eleven minutes is not the container — that is two seconds once. Look at what the per-test database fixture does, and how many tests there are.",
      solution: {
        lang: "python",
        title: "conftest.py + tests",
        code: `# =========================================================================
# WHAT WAS WRONG
# =========================================================================
#
# 1. SQLite standing in for Postgres. Types are dynamic, ALTER TABLE is
#    limited, and JSONB/arrays/ILIKE do not exist -- so a whole class of
#    query bug is invisible until release. This is the correctness half.
#
# 2. create_all() PER TEST. Building the schema is tens of milliseconds;
#    across 900 tests it is the eleven minutes. The container is not the
#    cost -- the per-test setup is.
#
# 3. A 900-row shared seed file. Every test depends on every row, so the
#    dataset cannot change and no test states its own premise.
#
# 4. The client is mocked, so the request it builds is never exercised.
#    A renamed SDK method or a wrong header still passes.
#
# 5. Nothing stops a test opening a socket.


from __future__ import annotations

import json
import socket
from decimal import Decimal
from pathlib import Path

import factory
import httpx
import pytest
import respx
from factory.alchemy import SQLAlchemyModelFactory
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from testcontainers.postgres import PostgresContainer

FIXTURES = Path(__file__).parent / "fixtures"


# =========================================================================
# 1 + 2. THE DATABASE
# =========================================================================

@pytest.fixture(scope="session")
def engine():
    """The real engine, started ONCE.

    Two to four seconds for the whole run, against tens of milliseconds
    per test for create_all(). That swap is what takes the suite from
    eleven minutes to under one -- not the choice of database.
    """
    with PostgresContainer("postgres:16-alpine") as container:
        engine = create_engine(container.get_connection_url(), future=True)
        # Run the real migrations, not metadata.create_all(): a migration
        # that fails on an empty table is exactly the bug this catches.
        run_migrations(engine.url)
        yield engine
        engine.dispose()


@pytest.fixture
def db(engine):
    """Per-test isolation by transaction rollback.

    join_transaction_mode="create_savepoint" is the load-bearing detail:
    without it a commit() inside the code under test ends the outer
    transaction, and the rollback has nothing left to undo -- so rows
    leak into the next test and the suite becomes order-dependent
    (Lesson 9.3).
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# =========================================================================
# 3. FACTORIES INSTEAD OF A SEED FILE
# =========================================================================

@pytest.fixture(autouse=True)
def _bind_factories(db):
    """Point every factory at this test's session, so a factory call
    inside a test lands in the transaction that will be rolled back."""
    for f in (CustomerFactory, OrderFactory):
        f._meta.sqlalchemy_session = db


class CustomerFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Customer
        sqlalchemy_session_persistence = "flush"

    id = factory.Sequence(lambda n: f"c-{n}")
    name = factory.Faker("name")
    email = factory.LazyAttribute(lambda o: f"{o.id}@example.test")
    tier = "standard"


class OrderFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Order
        sqlalchemy_session_persistence = "flush"

    id = factory.Sequence(lambda n: f"o-{n}")
    customer = factory.SubFactory(CustomerFactory)
    total = Decimal("100.00")
    status = "pending"
    metadata_ = factory.Dict({"source": "web"})       # JSONB column


# =========================================================================
# 4. TRANSPORT-LEVEL STUB
# =========================================================================

@pytest.fixture
def payment_api():
    """Replaces the socket, not our client.

    The real PaymentClient still builds the URL, sets the headers,
    serialises the body and parses the response -- all the code the
    mocked version skipped straight past.
    """
    with respx.mock(base_url="https://pay.test", assert_all_called=False) as mock:
        mock.post("/charges").mock(return_value=httpx.Response(
            201, json=json.loads((FIXTURES / "charge_201.json").read_text("utf-8"))
        ))
        yield mock


# =========================================================================
# 5. NO ACCIDENTAL NETWORK
# =========================================================================

@pytest.fixture(autouse=True)
def _no_network(request, monkeypatch):
    """Justified autouse: it makes a mistake fail loudly rather than
    making the suite slow and flaky.

    testcontainers and respx both need real sockets, so the container
    fixture and anything marked @pytest.mark.network are exempt.
    """
    if request.node.get_closest_marker("network"):
        return
    if "engine" in request.fixturenames:
        return

    real = socket.socket

    def guard(*args, **kwargs):
        raise RuntimeError(
            "this test tried to open a socket — stub the transport with "
            "respx, or mark it @pytest.mark.network"
        )

    monkeypatch.setattr(socket, "socket", guard)
    yield
    monkeypatch.setattr(socket, "socket", real)


# =========================================================================
# TESTS
# =========================================================================

pytestmark = pytest.mark.integration


def test_checkout_charges_and_records(db, payment_api):
    """The rewritten version of the original test. Every dependency is
    real except the socket."""
    order = OrderFactory(total=Decimal("19.99"))

    result = checkout(db, order_id=order.id)

    assert result.status == "paid"

    # The REQUEST is now assertable -- the mocked version could not see it
    request = payment_api["/charges"].calls.last.request
    body = json.loads(request.content)
    assert body["amount"] == 1999                 # minor units, not 19.99
    assert request.headers["Idempotency-Key"]
    assert request.headers["Authorization"].startswith("Bearer ")


def test_decimal_survives_a_round_trip(db):
    """THE test that fails on SQLite and passes on Postgres.

    SQLite has dynamic typing: a Decimal goes in and a float comes back,
    so 19.99 becomes 19.989999999999998 and every equality assertion on
    money is subtly wrong. Postgres NUMERIC round-trips exactly.
    """
    order = OrderFactory(total=Decimal("19.99"))
    db.expire_all()                                # force a real read

    stored = db.get(Order, order.id)
    assert stored.total == Decimal("19.99")
    assert isinstance(stored.total, Decimal)


def test_the_unique_constraint_is_actually_declared(db):
    """A fake repository cannot know about an index. This asserts the
    migration created it, which is a different claim from 'the code
    checks for duplicates'."""
    OrderFactory(id="o-dup")

    with pytest.raises(IntegrityError):
        OrderFactory(id="o-dup")
        db.flush()


def test_a_jsonb_query_works(db):
    """JSONB does not exist in SQLite, so this query could not be tested
    at all before -- it was verified by deploying it."""
    OrderFactory(metadata_={"source": "mobile"})
    OrderFactory(metadata_={"source": "web"})

    rows = db.execute(text(
        "SELECT id FROM orders WHERE metadata_ @> :probe"
    ), {"probe": '{"source": "mobile"}'}).all()

    assert len(rows) == 1


def test_migrations_apply_to_an_empty_database(engine):
    """Runs implicitly through the engine fixture, asserted explicitly
    here so the failure names the real problem."""
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    assert version == HEAD_REVISION


@pytest.mark.contract
@pytest.mark.network
def test_the_vendor_still_returns_what_our_fixture_says():
    """Deselected by default; run nightly. When the vendor adds or
    renames a field, this fails and every replayed test above is known
    to be stale -- which is the only thing that keeps a recorded
    fixture honest."""
    live = httpx.post(SANDBOX_URL, json=SANDBOX_PAYLOAD, timeout=10).json()
    recorded = json.loads((FIXTURES / "charge_201.json").read_text("utf-8"))

    assert set(live) >= set(recorded), f"vendor dropped: {set(recorded) - set(live)}"


# =========================================================================
# WHAT ACTUALLY FIXED THE ELEVEN MINUTES
# =========================================================================
#
# Not the container, and not Postgres. Both of those made the suite
# SLOWER in absolute terms -- a container costs three seconds that
# in-memory SQLite did not.
#
# The fix was moving schema creation from per-test to per-session.
# create_all() on every one of 900 tests was roughly 700ms each once
# indexes and constraints are included; a transaction rollback is
# sub-millisecond.
#
#   before   900 x ~700ms   =  ~10.5 min
#   after    3s once + 900 x ~1ms  =  ~5s
#
# Then markers split the run, so the default is unit tests only and the
# integration suite is opt-in:
#
#   [tool.pytest.ini_options]
#   addopts = "-q --strict-markers -m 'not integration and not contract'"
#
# The lesson generalises: when a suite is slow, measure what happens per
# test rather than assuming it is the slowest-looking dependency.`,
        notes: [
          { t: "p", text: "**The eleven minutes was per-test schema creation, not the database.** Swapping SQLite for a real Postgres container made the absolute cost *higher* by three seconds and the suite twenty times faster overall, because `create_all()` moved from 900 executions to one. Measuring what happens per test, rather than blaming the slowest-looking dependency, is the transferable move (Lesson 10.2)." },
          { t: "p", text: "**`join_transaction_mode=\"create_savepoint\"` is the line the whole isolation strategy rests on.** Without it a `commit()` in the code under test ends the outer transaction, the rollback becomes a no-op, and rows leak into the next test — which surfaces as an order-dependent suite months later." },
          { t: "p", text: "**The `Decimal` round-trip test is the one that justifies the container.** SQLite's dynamic typing returns a float where Postgres returns a `Decimal`, so every money assertion in the old suite was passing against a value that would be wrong in production (Lesson 2.6)." },
          { t: "callout", kind: "insight", title: "Why the contract test earns its place", body: [
            { t: "p", text: "A recorded fixture is only as true as the day it was recorded. Every replayed test above asserts against the team's snapshot of the vendor's response, which drifts silently the moment the vendor ships a change." },
            { t: "p", text: "One nightly test hitting the real sandbox converts that silent drift into a failing build, and marking it `contract` keeps a vendor outage from failing unrelated pull requests." }
          ]},
          { t: "p", text: "**The socket guard's value is its error message.** \"Connection refused\" sends someone to the network team; \"this test tried to open a socket — stub the transport\" sends them to the three lines that need changing. Exempting the fixtures that legitimately need sockets is what makes it usable rather than something people disable." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team runs their whole suite against SQLite for speed. It has 2,400 tests, 94% coverage, and runs in forty seconds. Everyone is happy with it." },
      { t: "p", text: "**A release adds a case-insensitive search.** `WHERE name ILIKE :q` passes every test — SQLite silently accepts `ILIKE` as an unknown operator in some builds and `LIKE` is case-insensitive there by default anyway. In Postgres the query is fine, but `LIKE` is case-sensitive, so the fallback path they had written for SQLite returned nothing in production." },
      { t: "p", text: "**The deeper problem was that nobody knew which behaviours were being approximated.** The suite had been green for two years against an engine with dynamic types, different locking, no `JSONB` and different collation — so its silence carried no information about any of those." },
      { t: "p", text: "**Moving to a container took a day and added six seconds.** It immediately failed four existing tests, all of which were genuine bugs that had been shipped and worked around elsewhere. **Test against the engine you deploy on** — a fast suite that tests a system you do not run is measuring the wrong thing." }
    ]}
  ],

  takeaways: [
    "**Unit tests check your logic; integration tests check your assumptions about someone else's system.** A fake encodes your understanding, so it cannot tell you your understanding is wrong.",
    "**Test against the engine you deploy on.** SQLite differs from Postgres in typing, `ALTER TABLE`, concurrency, `JSONB`, collation and constraint timing — every one a bug class the suite cannot see.",
    "**Start the container once per session and isolate per test with a transaction rollback** — that split gives both speed and isolation.",
    "**`join_transaction_mode=\"create_savepoint\"`** is what keeps the rollback effective when the code under test calls `commit()`.",
    "**Run your real migrations in the fixture, not `metadata.create_all()`** — a migration that fails on an empty table is exactly what this catches.",
    "**Stub HTTP at the transport layer, not at your own client.** `respx` and `responses` leave your client building the request, and let you assert on what it built.",
    "**A recorded fixture is only true on the day it was recorded.** One nightly contract test against the live sandbox turns silent vendor drift into a failing build.",
    "**Block sockets by default with an autouse fixture** — one of the few justified ones — and make the error message name the fix.",
    "**Build test data in the test with factories.** A shared seed file makes every test depend on every row and produces magic numbers nobody can verify.",
    "**Name only the field the test is about**; everything else should be a factory default, so a reader knows what the assertion rests on.",
    "**Split the suite with markers and `--strict-markers`**, so the default run is fast and a typo in a marker is an error rather than a silently ungrouped test.",
    "**Aim for a default run under a minute.** Past that people stop running it before pushing, and CI becomes the first feedback instead of the last."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A suite runs against SQLite in memory and is green. What class of bug can it not see?",
        options: [
          "Off-by-one errors in pagination",
          "Anything that depends on the real engine — dynamic versus enforced typing, `JSONB`, collation, `ALTER TABLE` limits, concurrency behaviour",
          "Incorrect business rules",
          "Missing error handling"
        ],
        answer: 1,
        why: "SQLite's silence carries no information about Postgres. A `Decimal` written and read back comes out as a float, a `VARCHAR(10)` accepts 400 characters, `JSONB` queries cannot run at all, and `LIKE` has different case sensitivity. Those bugs are found by deploying. The other three options are logic errors that a unit test with a fake catches perfectly well."
      },
      {
        stem: "An integration suite takes eleven minutes. The database fixture calls `create_all()` per test. What is the fix?",
        options: [
          "Switch to SQLite in memory",
          "Move schema creation to a session-scoped fixture and isolate per test with a transaction rollback",
          "Run fewer integration tests",
          "Increase the container's memory"
        ],
        answer: 1,
        why: "Schema creation is tens to hundreds of milliseconds; across 900 tests that is the whole eleven minutes. A rollback is sub-millisecond. Moving to a real container actually adds a few seconds in absolute terms and still takes the suite to under a minute — which is why measuring per-test cost beats blaming the slowest-looking dependency."
      },
      {
        stem: "Why stub HTTP with `respx` rather than patching your own `PaymentClient`?",
        options: [
          "`respx` is faster",
          "Your real client still runs — building the URL, headers and body, and parsing the response — so the request it produces becomes assertable",
          "Patching does not work with `httpx`",
          "It avoids needing a fixture"
        ],
        answer: 1,
        why: "Patching the client replaces the code under test with the test's assumptions, so a wrong header, a wrong URL, a wrong serialisation or a renamed SDK method all still pass. Stubbing the transport replaces only the socket, which means `route.calls.last.request` lets you assert the amount was sent in minor units and the idempotency key was set."
      },
      {
        stem: "Why prefer factories over a shared 900-row seed file?",
        options: [
          "Factories are faster to load",
          "Each test states its own premise, so the assertion is verifiable and adding data for one test cannot break four others",
          "Seed files cannot contain foreign keys",
          "Factories generate more realistic data"
        ],
        answer: 1,
        why: "A shared dataset produces assertions like `== Decimal(\"48210.55\")` that nobody can verify six months later, so when it changes the test gets updated rather than investigated. It also couples every test to every row, which ossifies the dataset. A factory call naming only the field under test makes the premise visible and the total computable in your head."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you test code that talks to a database?",
        strong: "Against the real engine, in a container started once per session, with per-test isolation from a transaction rollback. Pure logic is unit-tested with fakes; the repository layer gets integration tests.",
        answer: [
          { t: "p", text: "The argument against SQLite is the substance: dynamic typing, no `JSONB`, different collation and locking mean a green suite carries no information about the engine you actually deploy on." },
          { t: "p", text: "The session-container plus per-test-transaction split is the design detail that gets both speed and isolation, and mentioning `create_savepoint` shows you have hit the commit-inside-the-test problem." },
          { t: "p", text: "Running real migrations rather than `create_all()` is worth adding — a migration that fails on an empty table is a deploy-blocking bug that only this catches." }
        ]
      },
      {
        level: "advanced",
        q: "How do you test against a third-party API?",
        strong: "Stub the transport, not your client — `respx` or `responses` — so your code still builds the request and parses the response, and the request becomes assertable. Then one contract test against the real sandbox, run nightly and deselected by default.",
        answer: [
          { t: "p", text: "The distinction between mocking your client and stubbing the socket is the whole answer: the first tests nothing about the integration, the second tests everything except the network." },
          { t: "p", text: "The honesty problem with recorded fixtures — they are only true on the day they were recorded — is what justifies the nightly contract test, and marking it keeps a vendor outage from failing unrelated pull requests." },
          { t: "p", text: "Blocking sockets by default with an autouse fixture is the operational detail that stops an accidental live call making the suite slow and flaky." }
        ]
      },
      {
        level: "core",
        q: "Your test suite takes twenty minutes. What do you do?",
        strong: "Measure first — `--durations=25` — because the answer is usually one fixture doing expensive work per test rather than the slowest-looking dependency. Then split with markers so the default run is fast.",
        answer: [
          { t: "p", text: "Leading with measurement rather than a list of speed-ups is the signal; the eleven-minute example where the container was blamed and per-test `create_all` was the cause makes it concrete." },
          { t: "p", text: "`pytest-xdist` is the obvious lever and worth stating with its cost — each worker needs its own database or schema, which is real setup." },
          { t: "p", text: "The reason the target matters closes it: past about a minute people stop running it before pushing, and the feedback loop that makes tests valuable is gone." }
        ]
      }
    ]
  }
});
