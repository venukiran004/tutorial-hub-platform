/* ============================================================================
   LESSON 9.3 — Fixtures
   ========================================================================= */
EC.receiveLesson({
  id: "9.3",

  lede: "A fixture is a named piece of setup that pytest supplies by matching a parameter name — dependency injection, driven by the function signature (Lesson 8.7). Used well it turns setup into a **declarative dependency graph**. Used badly it becomes the mechanism by which tests quietly share state and start depending on the order they run in.",

  objectives: [
    "Write fixtures that request other fixtures, and read the resulting graph",
    "Choose a scope deliberately, and explain what a wider scope risks",
    "Use `yield` fixtures for teardown that runs even when a test fails",
    "Build factory fixtures for data that varies per test",
    "Recognise a fixture that has become shared mutable state"
  ],

  prerequisites: ["9.2"],

  blocks: [

    { t: "h2", n: "01", text: "Setup as a dependency graph", id: "graph" },

    {"kind": "tree", "title": "Fixtures form a dependency graph", "caption": "A test names the fixtures it needs; each fixture can name others. pytest builds them in dependency order, once per scope, and tears them down in reverse.", "root": {"label": "test_checkout(client, order)", "tone": "good", "children": [{"label": "client", "sub": "needs app", "tone": "accent", "children": [{"label": "app", "sub": "needs db", "tone": "warn", "children": [{"label": "db", "sub": "session scope", "tone": "crit"}]}]}, {"label": "order", "sub": "needs db", "tone": "accent"}]}, "t": "diagram", "id": "dg-9_3-01-0"},

    { t: "code", lang: "python", title: "fixtures request fixtures", code: `
import pytest


@pytest.fixture
def config() -> Config:
    return Config(dsn="sqlite://:memory:", timeout=1)


@pytest.fixture
def db(config: Config) -> Database:           # requests "config"
    return Database(config.dsn)


@pytest.fixture
def service(db: Database, clock) -> BillingService:   # requests two
    return BillingService(db, clock)


def test_invoice_total(service: BillingService) -> None:
    # pytest resolved config -> db -> service before this ran
    assert service.total_for("c-1") == 100
`,
      caption: "**The test asks for what it needs and nothing else.** pytest walks the graph, builds each fixture once per scope, and passes the results in — so adding a dependency to `service` changes one fixture rather than every test."
    },

    { t: "viz",
      title: "Resolution order, and what teardown reverses",
      caption: "Fixtures are built depth-first in dependency order and torn down in exactly the reverse. That ordering is a guarantee: a fixture can rely on everything it requested still existing during its own cleanup.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram of fixture setup order from config through db to service, with teardown in reverse order">
  <defs>
    <marker id="fx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent-line)"/>
    </marker>
    <marker id="fy" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="14" y="30" class="s-label" style="fill:var(--accent-ink)">SETUP — depth first</text>

  <rect x="14" y="44" width="150" height="46" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="89" y="72" text-anchor="middle" class="s-mono" style="font-size:10px">config</text>

  <line x1="168" y1="67" x2="206" y2="67" style="stroke:var(--accent-line)" stroke-width="1.5" marker-end="url(#fx)"/>

  <rect x="210" y="44" width="150" height="46" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="285" y="72" text-anchor="middle" class="s-mono" style="font-size:10px">db</text>

  <line x1="364" y1="67" x2="402" y2="67" style="stroke:var(--accent-line)" stroke-width="1.5" marker-end="url(#fx)"/>

  <rect x="406" y="44" width="150" height="46" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="481" y="72" text-anchor="middle" class="s-mono" style="font-size:10px">service</text>

  <line x1="560" y1="67" x2="598" y2="67" style="stroke:var(--accent-line)" stroke-width="1.5" marker-end="url(#fx)"/>

  <rect x="602" y="44" width="180" height="46" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="692" y="72" text-anchor="middle" class="s-mono" style="font-size:10px">the test runs</text>

  <line x1="14" y1="126" x2="886" y2="126" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="158" class="s-label">TEARDOWN — exact reverse, and it runs even if the test FAILS</text>

  <rect x="602" y="176" width="180" height="46" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="692" y="204" text-anchor="middle" class="s-mono" style="font-size:10px">test finished</text>

  <line x1="598" y1="199" x2="560" y2="199" style="stroke:var(--border-strong)" stroke-width="1.5" marker-end="url(#fy)"/>

  <rect x="406" y="176" width="150" height="46" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="481" y="204" text-anchor="middle" class="s-mono" style="font-size:10px">service</text>

  <line x1="402" y1="199" x2="364" y2="199" style="stroke:var(--border-strong)" stroke-width="1.5" marker-end="url(#fy)"/>

  <rect x="210" y="176" width="150" height="46" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="285" y="204" text-anchor="middle" class="s-mono" style="font-size:10px">db</text>

  <line x1="206" y1="199" x2="168" y2="199" style="stroke:var(--border-strong)" stroke-width="1.5" marker-end="url(#fy)"/>

  <rect x="14" y="176" width="150" height="46" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="89" y="204" text-anchor="middle" class="s-mono" style="font-size:10px">config</text>

  <text x="14" y="258" class="s-sub" style="fill:var(--good)">db's cleanup can still use config — a guarantee, not a coincidence</text>
</svg>`
    },

    { t: "h2", n: "02", text: "Teardown", id: "teardown" },

    { t: "code", lang: "python", title: "yield is the whole mechanism", code: `
@pytest.fixture
def connection(config: Config):
    conn = connect(config.dsn)
    yield conn                      # the test runs here
    conn.close()                    # runs even if the test FAILED


# Better still -- a with block inside the fixture
@pytest.fixture
def connection(config: Config):
    with connect(config.dsn) as conn:
        yield conn                  # closed on failure, error, or interrupt


# Transaction rollback: the most useful database fixture there is
@pytest.fixture
def db_session(connection):
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()          # every test starts from a clean database
`,
      hl: [5, 11, 12, 21],
      caption: "This is `@contextmanager` with a different decorator (Lesson 5.8) — and it has the same rule: **put the `yield` inside a `with`**, so cleanup survives an exception in the fixture setup itself, not only a failing test."
    },

    { t: "callout", kind: "trap", title: "Teardown after `yield` is skipped if setup raises", body: [
      { t: "code", lang: "python", title: "the gap", numbered: false, code: `
@pytest.fixture
def resources():
    a = acquire_a()
    b = acquire_b()          # if THIS raises, a is never released
    yield (a, b)
    b.release()
    a.release()


# Correct: with blocks, or an ExitStack for a variable number
@pytest.fixture
def resources():
    with acquire_a() as a, acquire_b() as b:
        yield (a, b)`},
      { t: "p", text: "Code after `yield` only runs if execution reached the `yield`. A failure while acquiring the second resource leaks the first — and in a suite of a thousand tests that is a thousand leaked handles." },
      { t: "p", text: "`request.addfinalizer(fn)` is the alternative: it registers cleanup **immediately**, so it runs even if a later line in the fixture raises. `with` is clearer where it applies." }
    ]},

    { t: "h2", n: "03", text: "Scope", id: "scope" },

    { t: "table",
      head: ["Scope", "Created once per", "Use for", "Risk"],
      rows: [
        ["`function` (default)", "Test", "Anything mutable — the safe default", "Slow if setup is expensive"],
        ["`class`", "Test class", "A shared object for a group of related tests", "Order dependence within the class"],
        ["`module`", "File", "A module's worth of expensive setup", "Tests in that file can affect each other"],
        ["`package`", "Directory", "Rare", "As above, wider"],
        ["`session`", "Whole run", "A container, a schema, a compiled artefact", "**Any mutation leaks across the entire suite**"]
      ],
      caption: "**Default to `function` and widen only with a measurement.** A session-scoped fixture is a global variable that every test in the suite shares — acceptable for something immutable or externally managed, dangerous for anything a test can change."
    },

    { t: "ladder",
      title: "An expensive database fixture",
      rungs: [
        { level: "bad", label: "Session-scoped, mutable, shared",
          why: "One database for the whole suite. Tests see each other's rows, pass in one order and fail in another, and a failure leaves data that breaks the next twenty tests. The classic \"works alone, fails in CI\" suite.",
          code: `@pytest.fixture(scope="session")
def db():
    engine = create_engine(DSN)
    Base.metadata.create_all(engine)
    return Session(engine)          # every test shares this session` },
        { level: "ok", label: "Function-scoped, truncate between tests",
          why: "Every test starts clean, so order no longer matters. But schema creation and truncation run per test, which on a real database is tens of milliseconds each — a thousand tests is half a minute of pure overhead.",
          code: `@pytest.fixture
def db():
    engine = create_engine(DSN)
    Base.metadata.create_all(engine)
    session = Session(engine)
    yield session
    session.close()
    Base.metadata.drop_all(engine)` },
        { level: "best", label: "Session-scoped container, function-scoped transaction",
          why: "The expensive, immutable part — the container and the schema — is created once. The per-test isolation comes from a transaction that is rolled back, which is far cheaper than truncation and gives each test a genuinely clean database.",
          code: `@pytest.fixture(scope="session")
def engine():
    """Expensive and IMMUTABLE: created once, mutated by nobody."""
    with PostgresContainer("postgres:16") as container:
        engine = create_engine(container.get_connection_url())
        Base.metadata.create_all(engine)
        yield engine


@pytest.fixture
def db(engine):
    """Cheap and per-test: a transaction, always rolled back."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()          # even if the test committed
    connection.close()`,
          note: "**The split is the pattern**: put the expensive setup in the widest scope where nothing mutates it, and the isolation in `function` scope. It applies well beyond databases — a compiled asset, a started server, a loaded model (Lesson 9.7)." }
      ]
    },

    { t: "callout", kind: "warn", title: "A narrower fixture cannot request a wider one's opposite", body: [
      { t: "code", lang: "python", title: "the error you will hit", numbered: false, code: `
@pytest.fixture(scope="session")
def app(config):                    # config is function-scoped
    ...

# ScopeMismatch: You tried to access the function scoped fixture
# 'config' with a session scoped request object.`},
      { t: "p", text: "A wider fixture cannot depend on a narrower one, because the narrower one would have to be rebuilt while the wider one is still alive. The dependency arrow always points from narrow to wide." },
      { t: "p", text: "**The fix is usually to widen the dependency**, not the dependent — make `config` session-scoped if it is genuinely immutable. If it is not immutable, the wider fixture should not be caching it." }
    ]},

    { t: "h2", n: "04", text: "Factory fixtures", id: "factories" },

    { t: "code", lang: "python", title: "when each test needs its own variant", code: `
@pytest.fixture
def make_order(db):
    """Returns a FUNCTION, so a test can create several, each different."""
    created = []

    def _make(customer="c-1", total=100, status="paid", **extra) -> Order:
        order = Order(customer=customer, total=total, status=status, **extra)
        db.add(order)
        db.flush()
        created.append(order)
        return order

    yield _make

    for order in created:            # cleanup knows what it made
        db.delete(order)


def test_only_paid_orders_are_invoiced(make_order, service):
    make_order(status="paid", total=100)
    make_order(status="paid", total=50)
    make_order(status="pending", total=999)     # must be excluded

    assert service.invoice_total("c-1") == 150
`,
      caption: "**A factory fixture keeps defaults in one place and lets each test override only what it cares about.** The test above says \"pending orders are excluded\" and nothing else — every irrelevant field is invisible."
    },

    { t: "callout", kind: "insight", title: "Fixtures pytest already gives you", body: [
      { t: "table",
        head: ["Fixture", "Gives"],
        rows: [
          ["`tmp_path`", "A fresh `Path` to an empty directory, cleaned up automatically"],
          ["`monkeypatch`", "Attribute, dict and environment patching, undone after the test (Lesson 9.5)"],
          ["`capsys` / `capfd`", "Captured stdout and stderr"],
          ["`caplog`", "Captured log **records** — assert on `record.user_id`, not on rendered text (Lesson 6.4)"],
          ["`request`", "Metadata about the running test, and `addfinalizer`"],
          ["`recwarn`", "Warnings raised during the test"]
        ]
      },
      { t: "p", text: "**`tmp_path` over `tempfile` in tests**: the directory is named after the test, kept for the last few runs, and shown in the failure output — so you can inspect what a failing test actually wrote." }
    ]},

    { t: "callout", kind: "trap", title: "The fixture that became shared state", body: [
      { t: "code", lang: "python", title: "three ways it happens", numbered: false, code: `
# 1. A mutable default in a wide scope
@pytest.fixture(scope="module")
def orders():
    return []                      # every test in the file appends to THIS

# 2. Autouse, patching something globally
@pytest.fixture(autouse=True)
def _fast_clock(monkeypatch):
    monkeypatch.setattr(time, "sleep", lambda _: None)
    # now NO test in scope can test real timing, and nobody knows why

# 3. A fixture that returns a cached singleton
@pytest.fixture
def client():
    return get_global_client()     # the same object, with the same state`},
      { t: "ul", items: [
        "**The symptom is order dependence**: the suite passes locally and fails in CI, or fails when run with `-p no:randomly`.",
        "**Diagnose with `pytest -p no:cacheprovider --randomly-seed=...`** or `pytest-randomly`, which shuffles order and surfaces the coupling immediately.",
        "**`autouse` deserves particular suspicion.** It applies to every test in scope, invisibly, so a test that fails for a reason no one can see is usually an autouse fixture doing something helpful."
      ]},
      { t: "p", text: "**A fixture returning a mutable object should be function-scoped unless you can state why sharing it is safe.** \"It is slow to build\" is a reason to split it, not to widen it." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a suite that fails only in CI",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "This suite passes locally, fails intermittently in CI, and fails reliably with `pytest-randomly`. There are four distinct problems in the fixtures, and one of them also leaks resources." },
        { t: "code", lang: "python", title: "conftest.py", numbered: false, code: `
import pytest

@pytest.fixture(scope="session")
def db():
    engine = create_engine(TEST_DSN)
    Base.metadata.create_all(engine)
    return Session(engine)

@pytest.fixture(scope="module")
def orders():
    return []

@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    monkeypatch.setattr(time, "sleep", lambda _: None)

@pytest.fixture
def client():
    conn = connect_to_api()
    auth = authenticate(conn)          # raises if the token file is missing
    yield ApiClient(conn, auth)
    conn.close()

@pytest.fixture
def sample_order(db, orders):
    order = Order(customer="c-1", total=100)
    db.add(order)
    db.commit()
    orders.append(order)
    return order`},
        { t: "p", text: "Rewrite `conftest.py` so the suite is order-independent, and explain each change." }
      ],
      requirements: [
        "Identify all four problems and say which causes the CI-only failures.",
        "Keep the expensive setup expensive-once — do not simply make everything function-scoped.",
        "Fix the resource leak in `client`.",
        "Replace the shared list with something each test owns.",
        "Justify keeping or removing the autouse fixture.",
        "Add a test that fails on the original suite and passes on the fix."
      ],
      hint: "Run the failing scenario in your head: `test_a` commits an order and `test_b` counts orders. Now run them in the other order. Then ask what `_no_sleep` does to a test that measures a timeout.",
      solution: {
        lang: "python",
        title: "conftest.py",
        code: `# =========================================================================
# THE FOUR PROBLEMS
# =========================================================================
#
# 1. session-scoped db with COMMITS -- the CI-only failure
#
#    One Session for the whole suite, and sample_order commits. Test A
#    creates an order; test B counts orders and sees A's. Locally the
#    file order happens to work; in CI, with -n auto or a different
#    collection order, it does not.
#
#    This is the one causing the intermittent failures, and randomised
#    ordering reproduces it every time.
#
# 2. module-scoped mutable list
#
#    "return []" at module scope is a shared mutable default (Lesson
#    3.2, at a different layer). Every test in the file appends to the
#    same list, so a test asserting on its length depends on how many
#    ran before it.
#
# 3. autouse _no_sleep
#
#    Applies to EVERY test, invisibly. Any test of retry backoff,
#    timeout behaviour or rate limiting now silently passes without
#    exercising the delay it was written to check (Lesson 6.5). The
#    author of such a test has no way to see why.
#
# 4. client leaks a connection
#
#    conn is opened, then authenticate() may raise. Code after the
#    yield never runs, because execution never reached the yield -- so
#    every test that hits a missing token file leaks a connection. Over
#    a suite, that is connection-pool exhaustion.


from __future__ import annotations

import time
from collections.abc import Callable, Iterator

import pytest


# =========================================================================
# 1. THE SPLIT: expensive-and-immutable session-scoped,
#               isolation function-scoped
# =========================================================================

@pytest.fixture(scope="session")
def engine():
    """Expensive, and nothing mutates it: the schema is created once and
    read many times. This is what "session scope" is actually for."""
    engine = create_engine(TEST_DSN)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db(engine) -> Iterator[Session]:
    """Per test, and always rolled back.

    Binding the session to an explicit connection with an open
    transaction means even a commit inside the test is rolled back at
    the end -- so test isolation does not depend on the code under test
    being well behaved.

    Cheaper than truncation, and far cheaper than recreating the schema.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# =========================================================================
# 2. THE SHARED LIST -> A FACTORY THE TEST OWNS
# =========================================================================

@pytest.fixture
def make_order(db) -> Iterator[Callable[..., Order]]:
    """Replaces both "orders" and "sample_order".

    Each test creates exactly the orders it needs, with only the fields
    it cares about spelled out. Nothing is shared, and no cleanup list
    is required -- the transaction rollback handles it.
    """
    def _make(customer: str = "c-1", total: int = 100,
              status: str = "paid", **extra) -> Order:
        order = Order(customer=customer, total=total, status=status, **extra)
        db.add(order)
        db.flush()                  # visible to this session, not committed
        return order

    return _make


# =========================================================================
# 3. AUTOUSE: REMOVED, and replaced by an opt-in fixture
# =========================================================================

@pytest.fixture
def no_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    """Opt-in, not autouse.

    A test that wants instant retries asks for this by name, which is
    visible in its signature. A test that MEASURES backoff behaviour is
    unaffected -- which under the autouse version was impossible, and
    silently so.

    Kept as a fixture rather than deleted because the need was real:
    the fix is making it visible, not removing the capability.
    """
    monkeypatch.setattr(time, "sleep", lambda _: None)


# A better pattern still, where the code under test allows it: inject a
# sleep function rather than patching a module. Then no patching is
# needed at all and the test says what it is doing (Lesson 9.6).


# =========================================================================
# 4. THE LEAK
# =========================================================================

@pytest.fixture
def client() -> Iterator[ApiClient]:
    """closing() guarantees the connection is released even if
    authenticate() raises -- code after a yield never runs when the
    failure happens BEFORE the yield."""
    from contextlib import closing

    with closing(connect_to_api()) as conn:
        auth = authenticate(conn)      # may raise; conn still closes
        yield ApiClient(conn, auth)


# =========================================================================
# THE REGRESSION TESTS
# =========================================================================

def test_each_test_starts_with_an_empty_database(db) -> None:
    """THE test for problem 1. Paired with the one below, it fails on
    the original in whichever order leaves data behind -- and passes in
    both orders on the fix."""
    assert db.query(Order).count() == 0


def test_creating_orders_does_not_leak_into_other_tests(db, make_order) -> None:
    make_order(total=100)
    make_order(total=50)

    assert db.query(Order).count() == 2
    # ... and the rollback means the previous test still sees zero,
    # whichever order they run in


def test_factory_gives_each_test_its_own_data(make_order, db) -> None:
    """Problem 2: with the shared module-scoped list, this count
    depended on how many earlier tests in the file had run."""
    orders = [make_order(total=t) for t in (10, 20, 30)]

    assert len(orders) == 3
    assert db.query(Order).count() == 3


def test_sleep_is_real_unless_a_test_asks_otherwise() -> None:
    """Problem 3. Under the autouse fixture this assertion failed --
    and a test of retry backoff would have passed without ever waiting."""
    start = time.perf_counter()
    time.sleep(0.01)

    assert time.perf_counter() - start >= 0.005


def test_sleep_is_patched_when_requested(no_sleep) -> None:
    """Opt-in, and visible in the signature."""
    start = time.perf_counter()
    time.sleep(10)

    assert time.perf_counter() - start < 0.1


def test_client_releases_the_connection_when_auth_fails(monkeypatch) -> None:
    """Problem 4. Setup failing before the yield skips everything after
    it, so the original leaked a connection per failing test."""
    closed = []

    class FakeConn:
        def close(self): closed.append(True)

    monkeypatch.setattr("conftest.connect_to_api", lambda: FakeConn())
    monkeypatch.setattr(
        "conftest.authenticate",
        lambda conn: (_ for _ in ()).throw(RuntimeError("no token")),
    )

    with pytest.raises(RuntimeError):
        with closing(connect_to_api()) as conn:
            authenticate(conn)

    assert closed == [True]


# =========================================================================
# THE COMMAND THAT PROVES IT
# =========================================================================
#
#   pip install pytest-randomly
#   pytest -p randomly --randomly-seed=12345
#
# Randomised ordering turns an intermittent CI failure into a
# reproducible local one. Running it in CI permanently is what stops
# order dependence being reintroduced -- the suite that only passes in
# one order is a suite that will fail on the day someone adds a test in
# the middle of a file.`,
        notes: [
          { t: "p", text: "**The session-scoped session with commits is the CI-only failure**, and the mechanism is worth stating precisely: local runs happen to collect files in an order that works, while CI parallelism or a different collection order does not. Randomised ordering turns \"intermittent\" into \"every time\", which is the difference between a two-day investigation and a ten-minute one." },
          { t: "p", text: "**Binding the session to an explicit connection with an open transaction is what makes the rollback total.** A test that calls `commit()` still has its work discarded, so isolation does not depend on the code under test behaving well — which is exactly the code most likely to misbehave." },
          { t: "p", text: "**The autouse fixture was silently disabling real tests.** Anything checking retry backoff, a timeout, or rate limiting passed without ever waiting, and the author had no way to see why. Making it opt-in puts it in the test's signature where a reader will find it." },
          { t: "callout", kind: "insight", title: "The `yield` gap is a resource leak, not a style issue", body: [
            { t: "p", text: "Code after `yield` runs only if execution reached the `yield`. When `authenticate()` raises, the connection opened on the line above is never closed — and in a suite where a token file is missing, that is one leaked connection per test until the pool is exhausted." },
            { t: "p", text: "`with` or `contextlib.closing` inside the fixture closes the gap, exactly as it does for a generator holding a resource (Lesson 8.1). `request.addfinalizer` is the alternative when a `with` does not fit." }
          ]},
          { t: "p", text: "**Keeping `pytest-randomly` in CI is the durable fix.** Rewriting the fixtures makes the suite order-independent today; running it shuffled on every push is what keeps it that way, because the next order-dependent fixture fails immediately rather than in six months." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's suite takes eleven minutes, so someone widens the database fixture from `function` to `session`. It drops to ninety seconds and everyone is pleased." },
      { t: "p", text: "**Three weeks later the suite fails on a pull request that changed nothing relevant.** Adding a test in the middle of a file shifted the order, and a test that had been silently relying on rows created by an earlier test started failing. The pull request was reverted twice before anyone connected it to the fixture change." },
      { t: "p", text: "**The speed-up was real and the isolation loss was invisible** — no test failed on the day of the change, because the existing order still happened to work. The suite had become order-dependent without a single failing test to say so." },
      { t: "p", text: "**The right split gets both.** Session scope for the container and the schema, which nothing mutates; function scope for a transaction that is always rolled back. The suite ran in a hundred seconds *and* stayed isolated — and `pytest-randomly` in CI made it impossible to lose that again quietly." }
    ]}
  ],

  takeaways: [
    "**A fixture is dependency injection by parameter name**, so setup becomes a declarative graph rather than repeated boilerplate.",
    "**Fixtures are torn down in exact reverse order of setup**, so a fixture can rely on everything it requested still existing during its own cleanup.",
    "**`yield` gives teardown that runs even when the test fails** — but only if execution reached the `yield`.",
    "**Put the `yield` inside a `with`.** A setup failure after acquiring one resource otherwise leaks it, once per test.",
    "**`request.addfinalizer` registers cleanup immediately**, which covers the case a `with` cannot.",
    "**Default to `function` scope and widen only with a measurement.** A session-scoped fixture is a global variable shared by the entire suite.",
    "**The pattern that gets both speed and isolation**: expensive immutable setup in session scope, per-test isolation in function scope — a container and schema once, a transaction rolled back per test.",
    "**A wider fixture cannot depend on a narrower one.** The dependency arrow points from narrow to wide, and the fix is usually to widen the dependency rather than the dependent.",
    "**A factory fixture returns a function**, so each test creates only the data it cares about and defaults live in one place.",
    "**`autouse` deserves particular suspicion**: it applies invisibly to every test in scope, and can silently disable the thing a test was written to check.",
    "**Use `tmp_path`, `monkeypatch` and `caplog`** rather than hand-rolling — and assert on `caplog.records`, not rendered text.",
    "**Run the suite in randomised order in CI.** Order dependence is invisible until the day someone inserts a test, and shuffling makes it fail immediately instead."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A suite passes locally and fails intermittently in CI. The database fixture is `scope=\"session\"` and tests commit. What is happening?",
        options: [
          "CI has a slower database, so queries time out",
          "Tests share one database across the run, so one test's committed rows are visible to another — and the outcome depends on execution order",
          "Session-scoped fixtures are not supported with parallel execution",
          "The schema is created after the first test runs"
        ],
        answer: 1,
        why: "Session scope means one shared object for the whole run, so committed data persists between tests. Local collection order happens to work; CI's does not. The fix is the split: session scope for the container and schema, which nothing mutates, and a function-scoped transaction that is rolled back. Running with `pytest-randomly` turns the intermittent failure into a reproducible one."
      },
      {
        stem: "A fixture opens a connection, then calls `authenticate()` which raises, then yields. What happens to the connection?",
        options: [
          "pytest closes it automatically at the end of the test",
          "It leaks — code after `yield` runs only if execution reached the `yield`",
          "It is closed when the fixture is garbage collected, promptly",
          "The test is skipped, so no resource was acquired"
        ],
        answer: 1,
        why: "Teardown after `yield` is unreachable when the failure occurs before it, so every test hitting that path leaks a connection — enough of them exhausts the pool. Wrap the acquisition in a `with` (or `contextlib.closing`) inside the fixture, or use `request.addfinalizer`, which registers cleanup immediately rather than after the yield."
      },
      {
        stem: "Why is `@pytest.fixture(autouse=True)` that patches `time.sleep` risky?",
        options: [
          "`monkeypatch` cannot patch standard library functions",
          "It applies invisibly to every test in scope, so a test written to verify retry backoff or a timeout passes without ever exercising the delay",
          "Autouse fixtures run after the test rather than before",
          "It prevents other fixtures from using `monkeypatch`"
        ],
        answer: 1,
        why: "Nothing in a test's signature reveals that an autouse fixture applied, so a test measuring elapsed time silently verifies nothing and its author has no way to see why. Making it opt-in — the test names it as a parameter — keeps the capability and puts it where a reader will find it. Better still, inject the sleep function into the code under test so no patching is needed."
      },
      {
        stem: "You need a database fixture that is fast and isolated. What is the right structure?",
        options: [
          "Function scope, recreating the schema per test",
          "Session-scoped engine and schema, with a function-scoped transaction that is rolled back after each test",
          "Session scope, with tests responsible for cleaning up after themselves",
          "Module scope, with truncation between files"
        ],
        answer: 1,
        why: "Schema creation is expensive and immutable, so it belongs in the widest scope; isolation is cheap when it comes from a transaction rollback rather than truncation or recreation. Binding the session to an explicit connection with an open transaction means even a test that calls `commit()` is rolled back — so isolation does not depend on the code under test behaving well."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do pytest fixtures work?",
        strong: "pytest reads the test function's signature and supplies an object for each parameter name from a registered fixture — dependency injection driven by introspection. Fixtures can request other fixtures, so setup becomes a dependency graph resolved depth-first.",
        answer: [
          { t: "p", text: "Mentioning that it is signature-based introspection connects it to how the framework actually works, and explains why a decorator without `functools.wraps` breaks fixtures (Lesson 8.7)." },
          { t: "p", text: "The teardown ordering guarantee is worth stating: exact reverse of setup, so a fixture's cleanup can still use everything it requested." },
          { t: "p", text: "`yield` being the teardown mechanism, and the need to put it inside a `with`, is the practical detail that separates people who have debugged a leaking suite." }
        ]
      },
      {
        level: "advanced",
        q: "How do you make a test suite with a real database both fast and isolated?",
        strong: "Split by scope: a session-scoped container and schema, since neither is mutated, plus a function-scoped transaction rolled back after every test. Rollback is much cheaper than truncation and gives genuine isolation.",
        answer: [
          { t: "p", text: "The detail that makes it robust is binding the session to an explicit connection with an open transaction, so even a test that commits is rolled back — isolation does not depend on the code under test." },
          { t: "p", text: "Naming the failure mode of the naive speed-up shows judgement: widening the fixture to session scope makes the suite fast and silently order-dependent, with no failing test on the day of the change." },
          { t: "p", text: "Running randomised order in CI is the durable half — it stops order dependence being reintroduced quietly." }
        ]
      },
      {
        level: "advanced",
        q: "When would you avoid a fixture?",
        strong: "When it hides something the test should state. Data a test's assertions depend on belongs in the test or in a factory it calls explicitly, not in a fixture that silently supplies three orders whose totals the assertion happens to match.",
        answer: [
          { t: "p", text: "`autouse` is the clearest case, and the reason is legibility: nothing in the signature reveals it, so a test can fail for a cause no reader can see." },
          { t: "p", text: "The factory-fixture middle ground is the constructive alternative — defaults in one place, and each test overriding only the field it is actually testing." },
          { t: "p", text: "The underlying principle is that a test should be readable as a single unit; setup that changes what the assertions mean belongs where the assertions are." }
        ]
      }
    ]
  }
});
