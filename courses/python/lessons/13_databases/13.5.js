/* ============================================================================
   LESSON 13.5 — SQLAlchemy: Core and ORM
   ========================================================================= */
EC.receiveLesson({
  id: "13.5",

  lede: "SQLAlchemy is two libraries. **Core is a SQL expression language**; the ORM is an object-mapping layer built on top of it. Most confusion about SQLAlchemy — surprising queries, objects that mutate when you did not save them, sessions that hold connections all day — comes from using the ORM without knowing which layer you are standing on.",

  objectives: [
    "Distinguish Core from the ORM, and pick the right one per query",
    "Explain the unit of work: identity map, flush, and autoflush",
    "Scope a session correctly in a web application",
    "Model relationships and control when they load",
    "Recognise the ORM's real costs and when to drop to Core"
  ],

  prerequisites: ["13.3", "13.4"],

  blocks: [

    { t: "h2", n: "01", text: "Two layers", id: "layers" },

    {"kind": "layers", "title": "SQLAlchemy's two layers", "caption": "Core builds and executes SQL as Python expressions over an engine and connection pool. The ORM sits on top, mapping classes to tables and tracking changes in a Session. You can use Core alone; the ORM always uses Core.", "items": [{"label": "ORM: mapped classes, Session, relationships", "sub": "unit of work, identity map", "tone": "good"}, {"label": "Core: select(), insert(), Table, Engine", "sub": "SQL as expressions", "tone": "accent"}, {"label": "DB-API driver: psycopg, asyncpg", "sub": "the wire protocol", "tone": "warn"}, {"label": "PostgreSQL", "tone": "violet"}], "t": "diagram", "id": "dg-13_5-01-0"},

    { t: "code", lang: "python", title: "the same query at each level", code: `
# CORE -- a SQL expression language. Returns rows, not objects. No
# session, no identity map, no change tracking, no surprises.
from sqlalchemy import select, func

stmt = (
    select(orders.c.account_id, func.sum(orders.c.total).label("revenue"))
    .where(orders.c.created_at >= since)
    .group_by(orders.c.account_id)
)
with engine.connect() as conn:
    for account_id, revenue in conn.execute(stmt):
        ...


# ORM -- the same expression language, mapped to classes. Returns
# Order instances tracked by a Session.
stmt = select(Order).where(Order.created_at >= since)
with Session(engine) as session:
    for order in session.scalars(stmt):
        order.status = "reviewed"       # tracked; written on flush
    session.commit()


# Since 2.0 the query syntax is IDENTICAL. The difference is what you
# select -- a column expression or a mapped class -- and therefore
# what you get back and what tracks it.
`,
      hl: [4, 17, 22],
      caption: "**Reach for Core when you want rows and Core semantics**: reports, bulk operations, anything where object identity and change tracking are pure overhead. Reach for the ORM when you are manipulating domain objects."
    },

    { t: "table",
      head: ["", "Core", "ORM"],
      rows: [
        ["Returns", "Rows (tuples or mappings)", "Mapped instances"],
        ["Tracks changes", "No", "**Yes — the unit of work**"],
        ["Identity map", "No", "Yes — one object per row per session"],
        ["Overhead per row", "Minimal", "**Object construction, ~3–10×**"],
        ["Right for", "**Reports, bulk writes, aggregates**", "Business logic on entities"],
        ["Lazy loading surprises", "None", "**The main source of N+1**"]
      ],
      caption: "**The overhead is real but usually irrelevant.** Constructing 50 objects costs nothing; constructing 500,000 in a report is the whole runtime — and that report should have been Core, or better, a single aggregate query."
    },

    { t: "h2", n: "02", text: "The unit of work", id: "unit-of-work" },

    {"kind": "flow", "title": "The unit of work", "caption": "Changes to mapped objects are recorded, not sent. flush() turns them into SQL in dependency order; commit() flushes and ends the transaction. Nothing reaches the database until one of those.", "cols": 4, "nodes": [{"id": "a", "label": "session.add(obj) / obj.x = 1", "sub": "tracked in memory", "tone": "accent"}, {"id": "b", "label": "flush()", "sub": "SQL emitted, ids assigned", "tone": "warn"}, {"id": "c", "label": "commit()", "sub": "transaction ends", "tone": "good"}, {"id": "d", "label": "expired objects", "sub": "reloaded on next access"}], "edges": [["a", "b", "autoflush or explicit"], ["b", "c"], ["c", "d"]], "t": "diagram", "id": "dg-13_5-02-1"},

    { t: "viz",
      title: "What the Session is doing",
      caption: "Changes accumulate in memory and are written as one batch. That is why an object can be modified without a save call, and why a query can trigger a write you did not ask for.",
      svg: `<svg viewBox="0 0 900 290" role="img" aria-label="Session lifecycle from object states through flush to commit">
  <rect x="20" y="26" width="180" height="86" rx="9" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="110" y="52" text-anchor="middle" class="s-label">Transient</text>
  <text x="110" y="76" text-anchor="middle" class="s-sub">Order(...)</text>
  <text x="110" y="98" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">not in a session</text>

  <rect x="240" y="26" width="180" height="86" rx="9" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="330" y="52" text-anchor="middle" class="s-label">Pending</text>
  <text x="330" y="76" text-anchor="middle" class="s-sub">session.add(o)</text>
  <text x="330" y="98" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">no INSERT yet</text>

  <rect x="460" y="26" width="180" height="86" rx="9" style="fill:var(--surface);stroke:var(--accent)"/>
  <text x="550" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">Persistent</text>
  <text x="550" y="76" text-anchor="middle" class="s-sub">after flush</text>
  <text x="550" y="98" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">tracked, has an id</text>

  <rect x="680" y="26" width="180" height="86" rx="9" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="770" y="52" text-anchor="middle" class="s-label">Detached</text>
  <text x="770" y="76" text-anchor="middle" class="s-sub">session closed</text>
  <text x="770" y="98" text-anchor="middle" class="s-sub" style="fill:var(--crit)">lazy loads now raise</text>

  <path d="M200 69 L236 69" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M420 69 L456 69" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M640 69 L676 69" style="stroke:var(--border-strong)" fill="none"/>

  <rect x="20" y="152" width="840" height="112" rx="9" style="fill:none;stroke:var(--border-soft)"/>
  <text x="44" y="180" class="s-label">FLUSH sends the SQL · COMMIT ends the transaction</text>
  <g class="s-sub">
    <text x="44" y="210">flush()   emits INSERT / UPDATE / DELETE — inside the transaction, not durable</text>
    <text x="44" y="234">commit()  flushes, then COMMITs — and by default EXPIRES every object</text>
    <text x="44" y="258">autoflush automatically flushes before a query, so a query can trigger a write</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "the three behaviours that surprise people", code: `
# 1. NO SAVE CALL. A loaded object is tracked; mutating it schedules
#    an UPDATE. There is no .save() because there does not need to be.
order = session.get(Order, oid)
order.status = "paid"
session.commit()                 # UPDATE emitted here


# 2. AUTOFLUSH. A query flushes pending changes first, so the query
#    sees them -- which means a query can emit an INSERT.
new = Order(total=100)
session.add(new)                          # pending
count = session.scalar(select(func.count()).select_from(Order))
# ^ this INSERTed 'new' before counting, so count includes it. If the
#   insert violates a constraint, the exception is raised HERE, from
#   a line that only reads.

with session.no_autoflush:                # when you need the old value
    count = session.scalar(...)


# 3. EXPIRE ON COMMIT. After commit, every object is marked expired,
#    so the next attribute access re-queries the database.
order = session.get(Order, oid)
session.commit()
print(order.status)              # emits a SELECT -- surprising, and
                                 # fatal if the session is now closed

# Disable it when you return objects past the session boundary:
Session = sessionmaker(engine, expire_on_commit=False)
`,
      hl: [11, 19, 26, 31],
      caption: "**`expire_on_commit=True` is the default and it is usually wrong for a web application.** It exists so that a long-lived session sees other transactions' changes; a request-scoped session has no such need, and the reload is pure cost."
    },

    { t: "h2", n: "03", text: "Session scope", id: "scope" },

    { t: "ladder",
      title: "Getting a session into a request handler",
      rungs: [
        { level: "bad", label: "A module-level session",
          why: "One session shared by every request: not thread-safe, accumulates every object ever loaded, and one failed flush leaves it in a broken state that every later request inherits. The identity map becomes a memory leak.",
          code: `session = Session(engine)          # module level

@app.get("/orders/{oid}")
def get_order(oid):
    return session.get(Order, oid)` },
        { level: "ok", label: "A session per handler",
          why: "Correct scoping and correct lifetime. It just repeats in every handler, and the one place someone forgets the `with` is a leaked connection that only shows up as pool exhaustion under load.",
          code: `@app.get("/orders/{oid}")
def get_order(oid):
    with Session(engine) as session:
        return session.get(Order, oid)` },
        { level: "best", label: "A dependency",
          why: "One definition, used everywhere, impossible to forget. The session is created per request, closed on the way out whatever happens, and tests can override it with a transaction that rolls back.",
          code: `def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
        # No commit here: the handler decides. A dependency that
        # commits will commit half-finished work when a later
        # dependency raises.

DB = Annotated[Session, Depends(get_session)]


@app.get("/orders/{oid}", response_model=OrderPublic)
def get_order(oid: UUID, db: DB) -> Order:
    order = db.get(Order, oid)
    if order is None:
        raise HTTPException(404)
    return order`,
          note: "**Do not commit in the dependency.** The handler knows whether the work is complete; the dependency does not, and committing on the way out turns a partial failure into persisted partial state." }
      ]
    },

    { t: "h2", n: "04", text: "Relationships", id: "relationships" },

    { t: "code", lang: "python", title: "declaring them, and controlling loads", code: `
class Order(Base):
    __tablename__ = "orders"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(ForeignKey("accounts.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")

    # lazy="raise" is the setting worth adopting as a default. An
    # unintended lazy load becomes a loud error at development time
    # rather than an N+1 in production.
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",   # ORM-level; the FK still needs
        lazy="raise",                   # ON DELETE CASCADE for safety
    )

    account: Mapped["Account"] = relationship(
        back_populates="orders",
        lazy="raise",
    )


# Then every query states what it needs, explicitly.
stmt = (
    select(Order)
    .options(
        # selectinload: a SECOND query, WHERE id IN (...). Best for
        # collections -- no row multiplication, one extra round trip.
        selectinload(Order.items),
        # joinedload: a LEFT JOIN in the same query. Best for
        # many-to-one, where it adds no duplicate rows.
        joinedload(Order.account),
    )
    .where(Order.status == "pending")
)
`,
      hl: [11, 14, 28, 32],
      caption: "**`lazy=\"raise\"` converts a silent performance bug into a stack trace.** It is the single highest-value setting in a SQLAlchemy model, and it costs one line per relationship."
    },

    { t: "callout", kind: "tradeoff", title: "selectinload versus joinedload", body: [
      { t: "code", lang: "python", title: "why the choice matters", numbered: false, code: `
# joinedload on a COLLECTION multiplies rows. 100 orders with 10 items
# each returns 1,000 rows, and SQLAlchemy de-duplicates 100 orders
# from them -- transferring ten times the order data for nothing.
select(Order).options(joinedload(Order.items))     # 1 query, 1000 rows

# selectinload issues a second query. 100 rows, then 1,000 item rows.
# Same data, no duplication of the parent columns.
select(Order).options(selectinload(Order.items))   # 2 queries, clean

# joinedload on a MANY-TO-ONE adds no rows -- each order has exactly
# one account -- so a single query is strictly better.
select(Order).options(joinedload(Order.account))   # 1 query, 100 rows`},
      { t: "p", text: "**The rule: `selectinload` for collections, `joinedload` for many-to-one.** It is right often enough to be a default and wrong rarely enough that you will notice when it is." },
      { t: "p", text: "**`subqueryload` is legacy.** `selectinload` supersedes it, uses a simpler `IN` query, and works with more query shapes." }
    ]},

    { t: "h2", n: "05", text: "Where the ORM costs you", id: "costs" },

    { t: "code", lang: "python", title: "four places to drop to Core", code: `
# 1. BULK UPDATE. The ORM version loads a million objects to change
#    one field on each. The Core version is one statement.
for order in session.scalars(select(Order).where(...)):    # no
    order.status = "archived"

session.execute(                                           # yes
    update(Order).where(Order.created_at < cutoff)
                 .values(status="archived")
)
# Note: this bypasses ORM events and does not update in-memory
# objects. Pass synchronize_session="fetch" if the session holds any.


# 2. BULK INSERT. insert().values(list) is one statement; add_all is
#    one INSERT per object unless the dialect supports batching.
session.execute(insert(Event), [e.__dict__ for e in events])


# 3. AGGREGATES. Never load rows to count or sum them.
count = session.scalar(                                    # yes
    select(func.count()).select_from(Order).where(...)
)
count = len(session.scalars(select(Order)).all())          # no


# 4. REPORTS. Selecting columns rather than entities skips object
#    construction entirely, and returns exactly what you display.
rows = session.execute(
    select(Order.id, Order.total, Account.name)
    .join(Account)
    .where(Order.created_at >= since)
).all()
`,
      hl: [7, 20, 28],
      caption: "**`select(Order.id, Order.total)` is Core semantics through the ORM's session** — no instances constructed, no identity map entries, no change tracking. Often the simplest optimisation available."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a service layer that leaks and crawls",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This module works in development. In production it exhausts the connection pool under load, an endpoint takes nine seconds, and objects returned from one function occasionally raise when accessed by another." },
        { t: "code", lang: "python", numbered: false, title: "app/service.py", code: `
session = Session(engine)

def get_dashboard(account_id):
    orders = session.query(Order).filter_by(account_id=account_id).all()

    result = []
    for order in orders:
        result.append({
            "id": order.id,
            "customer": order.account.name,
            "item_count": len(order.items),
            "total": sum(i.unit_price * i.quantity for i in order.items),
        })

    total_orders = len(session.query(Order).all())
    return {"orders": result, "total": total_orders}

def archive_old_orders(cutoff):
    for order in session.query(Order).filter(Order.created_at < cutoff):
        order.status = "archived"
    session.commit()

def create_order(account_id, items):
    order = Order(account_id=account_id)
    session.add(order)
    session.commit()
    return order`},
        { t: "p", text: "Find every problem. One of them is why objects raise elsewhere, and one is why the pool exhausts." }
      ],
      requirements: [
        "List all the problems, grouped by cause.",
        "Count the queries `get_dashboard` issues for 100 orders of 10 items.",
        "Explain the `DetachedInstanceError` some callers see.",
        "Rewrite the module.",
        "Get `get_dashboard` to at most two queries.",
        "Say what `lazy=\"raise\"` would have caught, and when."
      ],
      hint: "Count the queries by walking each attribute access in the loop. And ask what `expire_on_commit` does to the object `create_order` returns.",
      solution: {
        lang: "python",
        title: "app/service.py",
        code: `# =========================================================================
# THE QUERY COUNT -- 100 orders, 10 items each
# =========================================================================
#
#   1        SELECT orders WHERE account_id = ?
#   100      order.account       -> one lazy load PER ORDER
#   100      order.items         -> one lazy load PER ORDER
#   1        SELECT * FROM orders   (for the count -- the whole table)
#   -----
#   202 queries, plus every row of the orders table loaded as objects
#   to compute a number.
#
# order.items is accessed TWICE per order (len, then the sum), but the
# collection is cached on the instance after the first load, so it is
# 100 queries and not 200. That caching is exactly what makes the N+1
# hard to spot by reading -- the second access looks free because it
# is.
#
# At ~2ms per round trip that is ~400ms of pure latency, and it grows
# linearly with the account's order count. The nine seconds is a large
# account.
#
#
# =========================================================================
# THE PROBLEMS
# =========================================================================
#
# A. THE MODULE-LEVEL SESSION -- three distinct failures
#
#   A1. NOT THREAD-SAFE. Under a threaded server, concurrent requests
#       share one session and one connection. Symptoms: one request
#       seeing another's objects, "this session is already flushing",
#       and results that make no sense.
#
#   A2. THE POOL EXHAUSTION. A Session holds a connection from its
#       first query until commit, rollback or close. This one is never
#       closed, so it holds a connection forever -- and under a
#       threaded server, each thread that touches it can check out
#       another. They are never returned. THIS IS THE POOL EXHAUSTION.
#
#   A3. AN UNBOUNDED IDENTITY MAP. Every object ever loaded is kept
#       alive by the session. It is a memory leak that grows for the
#       life of the process, and it also means stale reads: a second
#       call to session.get returns the cached object, not the
#       database's current row.
#
# B. THE N+1s -- order.account and order.items, 200 queries.
#
# C. len(session.query(Order).all()) -- loads EVERY order in the
#    system as an ORM object, across all accounts, to compute a
#    length. This is both the slowest line and a data leak in
#    aggregate form: the count includes other accounts.
#
# D. archive_old_orders LOADS EVERY MATCHING ORDER to set one field.
#    A million-row archive is a million objects constructed, tracked,
#    and flushed individually.
#
# E. THE DetachedInstanceError. create_order commits, and
#    expire_on_commit defaults to True -- so every attribute on the
#    returned object is expired. The caller accessing order.status
#    triggers a refresh; if the session has since been closed or
#    rolled back, that raises DetachedInstanceError. It is
#    intermittent, which is why it took months to diagnose.
#
# F. LEGACY Query API. session.query() is 1.x style; select() is the
#    2.0 API and is what current documentation covers.
#
# G. NO account_id FILTER on the total, no LIMIT on the order list,
#    and no error handling anywhere.
#
#
# =========================================================================
# THE REWRITE
# =========================================================================

# ---- models: make the failure loud ---------------------------------

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(
        ForeignKey("accounts.id"), index=True      # FK index, Lesson 13.2
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # lazy="raise" is what turns problem B from an invisible
    # performance bug into a stack trace on the first test run. Every
    # query must now state what it loads.
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="raise"
    )
    account: Mapped["Account"] = relationship(
        back_populates="orders", lazy="raise"
    )


# ---- session: scoped, and not expiring ------------------------------

SessionFactory = sessionmaker(
    engine,
    # Fixes E. A request-scoped session has no need to re-read after
    # commit, and the default reload is both a surprise and a cost.
    expire_on_commit=False,
)


def get_session() -> Iterator[Session]:
    """One session per request. Closed on the way out, whatever
    happens -- which is what returns the connection to the pool."""
    with SessionFactory() as session:
        yield session
        # No commit here: the handler owns the transaction boundary.


DB = Annotated[Session, Depends(get_session)]


# ---- the dashboard: 202 queries -> 2 -------------------------------

def get_dashboard(db: Session, account_id: UUID, limit: int = 50) -> dict:
    # QUERY 1. selectinload for the collection (no row multiplication),
    # joinedload for the many-to-one (no extra rows, so no reason to
    # split it out).
    #
    # selectinload issues its own IN query, so this is 2 statements
    # rather than 1 -- and 200 fewer than before.
    orders = db.scalars(
        select(Order)
        .options(
            selectinload(Order.items),
            joinedload(Order.account),
        )
        .where(Order.account_id == account_id)
        .order_by(Order.created_at.desc())
        .limit(limit)                       # G: bound the result
    ).all()

    # QUERY 2 (well, 3 with selectinload's). count() in the database:
    # no rows transferred, no objects built, and scoped to the account
    # -- the original counted every order in the system.
    total = db.scalar(
        select(func.count())
        .select_from(Order)
        .where(Order.account_id == account_id)
    )

    return {
        "orders": [
            {
                "id": order.id,
                "customer": order.account.name,     # already loaded
                "item_count": len(order.items),     # already loaded
                "total": sum(i.line_total for i in order.items),
            }
            for order in orders
        ],
        "total": total,
    }


# ---- an even better dashboard: let the database aggregate ----------

def get_dashboard_aggregated(db: Session, account_id: UUID,
                             limit: int = 50) -> dict:
    """When the items are only ever summed and counted, do not load
    them at all. One query, and it returns exactly what is displayed.

    This is the Core-through-the-ORM form: selecting COLUMNS, not
    entities, so no instances are constructed and nothing is tracked.
    """
    rows = db.execute(
        select(
            Order.id,
            Account.name.label("customer"),
            func.count(OrderItem.id).label("item_count"),
            func.coalesce(func.sum(OrderItem.line_total), 0).label("total"),
        )
        .join(Account, Account.id == Order.account_id)
        # LEFT JOIN: an order with no items must still appear, with a
        # count of 0 rather than vanishing.
        .outerjoin(OrderItem, OrderItem.order_id == Order.id)
        .where(Order.account_id == account_id)
        .group_by(Order.id, Account.name)
        .order_by(Order.created_at.desc())
        .limit(limit)
    ).mappings().all()

    total = db.scalar(
        select(func.count()).select_from(Order)
        .where(Order.account_id == account_id)
    )
    return {"orders": [dict(r) for r in rows], "total": total}


# ---- archive: one statement, not a million objects -----------------

def archive_old_orders(db: Session, cutoff: datetime) -> int:
    """Core UPDATE. Nothing is loaded, nothing is constructed.

    synchronize_session="fetch" keeps any in-memory objects consistent
    with the change. Use False when you know the session holds none --
    it is faster, and in a request-scoped session it is usually true.
    """
    result = db.execute(
        update(Order)
        .where(Order.created_at < cutoff, Order.status != "archived")
        .values(status="archived", archived_at=func.now())
        .execution_options(synchronize_session="fetch")
    )
    db.commit()
    return result.rowcount

# For a very large archive, batch it. One statement over ten million
# rows holds locks for minutes and bloats the table:
#
#   while True:
#       n = db.execute(
#           update(Order)
#           .where(Order.id.in_(
#               select(Order.id)
#               .where(Order.created_at < cutoff,
#                      Order.status != "archived")
#               .limit(10_000)
#           ))
#           .values(status="archived")
#       ).rowcount
#       db.commit()
#       if n == 0:
#           break


# ---- create: return something safe to use --------------------------

def create_order(db: Session, account_id: UUID,
                 items: list[ItemInput]) -> Order:
    order = Order(account_id=account_id)
    order.items = [
        OrderItem(product_id=i.product_id, quantity=i.quantity,
                  unit_price=i.unit_price, product_name=i.product_name)
        for i in items
    ]
    db.add(order)

    # flush assigns the primary key and emits the INSERTs WITHOUT
    # committing -- so the id is available while the caller can still
    # roll everything back.
    db.flush()

    # The caller decides when to commit. A service function that
    # commits cannot be composed into a larger transaction.
    return order


# =========================================================================
# WHAT lazy="raise" WOULD HAVE CAUGHT, AND WHEN
# =========================================================================
#
# Both N+1s, on the FIRST test run that exercised get_dashboard:
#
#   InvalidRequestError: 'Order.account' is not available due to
#   lazy='raise'
#
# The value is the timing. The N+1 was invisible in development
# because 3 orders cost 7 queries and nobody notices 14ms. It became
# visible in production, at nine seconds, on the largest account. With
# lazy="raise" it is a hard failure in CI on a 3-row fixture.
#
# The cost is that every query must declare what it loads. That is not
# a drawback -- it is the point: it moves the loading decision to
# where it is being made, and makes it reviewable.


# =========================================================================
# TESTS
# =========================================================================

def test_the_dashboard_issues_a_bounded_number_of_queries(db, caplog):
    """Pin the fix. Without this, the next refactor reintroduces the
    N+1 and nothing fails."""
    seed_orders(account_id=ACCOUNT, count=100, items_each=10)

    with count_queries() as counter:
        get_dashboard(db, ACCOUNT)

    assert counter.total <= 4, f"{counter.total} queries: {counter.statements}"


def test_the_dashboard_is_scoped_to_the_account(db):
    """The original counted every order in the system."""
    seed_orders(account_id="a", count=3)
    seed_orders(account_id="b", count=7)

    assert get_dashboard(db, "a")["total"] == 3


def test_an_order_with_no_items_still_appears(db):
    """The outer join. The original's sum() over an empty list gave 0,
    but an inner join would have dropped the row entirely."""
    seed_order(account_id=ACCOUNT, items=[])

    row = get_dashboard_aggregated(db, ACCOUNT)["orders"][0]

    assert row["item_count"] == 0
    assert row["total"] == 0


def test_a_returned_order_is_usable_after_commit(db):
    """Problem E. With expire_on_commit=False this needs no query and
    cannot raise."""
    order = create_order(db, ACCOUNT, [item()])
    db.commit()

    assert order.status == "pending"        # no refresh, no error
    assert order.id is not None


def test_lazy_loading_is_refused(db):
    """Problem B, as a permanent guard."""
    order = db.scalars(select(Order).limit(1)).one()

    with pytest.raises(InvalidRequestError, match="lazy='raise'"):
        _ = order.items


def test_archiving_does_not_load_rows(db):
    """Problem D. The row count comes from the UPDATE, not from
    counting objects."""
    seed_orders(count=10_000, created_at=long_ago())

    with count_queries() as counter:
        archived = archive_old_orders(db, cutoff=utcnow())

    assert archived == 10_000
    assert counter.total <= 2`,
        notes: [
          { t: "p", text: "**The pool exhaustion is the module-level session.** A `Session` holds its connection from the first query until commit, rollback or close — and this one is never closed, so the connection is never returned. Under a threaded server each thread can check out another, and none come back." },
          { t: "p", text: "**The `DetachedInstanceError` is `expire_on_commit=True`.** After `create_order` commits, every attribute on the returned object is expired, so the caller's first attribute access triggers a reload — which raises if the session has closed since. It is intermittent by nature, which is why it survives for months." },
          { t: "callout", kind: "insight", title: "Why the N+1 is hard to see by reading", body: [
            { t: "p", text: "`order.items` is accessed twice per order, but the collection is cached on the instance after the first load — so the second access is genuinely free. The line that looks expensive is not, and the line that looked like an attribute access issued a query." },
            { t: "p", text: "`lazy=\"raise\"` removes the guesswork entirely: the first access raises, on a three-row fixture, in CI. That timing is the whole value — the same bug in production was nine seconds on the largest account." }
          ]},
          { t: "p", text: "**`len(session.query(Order).all())` is the worst single line.** It loads every order in the system as a tracked ORM object to compute a number, and the number is wrong anyway because it is not scoped to the account." },
          { t: "p", text: "**`flush()` rather than `commit()` in `create_order` is the composability fix.** Flushing assigns the primary key and emits the inserts without ending the transaction, so a caller can still roll the whole operation back — a service function that commits cannot be used inside a larger unit of work." },
          { t: "p", text: "**The aggregated dashboard is the better answer when items are only summed.** Selecting columns rather than entities constructs no instances and returns exactly what is displayed, and the outer join is what keeps an order with no items in the result." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's API degraded gradually over eighteen months. No single deploy caused it; each release added a field to a serialiser, and some of those fields were relationships." },
      { t: "p", text: "**By the end, one endpoint issued four hundred queries per request.** Every one was a lazy load added by a one-line change that looked free in review — because in review it is one attribute access, and in a loop it is four hundred." },
      { t: "p", text: "**Setting `lazy=\"raise\"` broke thirty endpoints in CI in an afternoon**, and each fix was one `selectinload` in the query that had been missing it. The p99 fell from 3.2 seconds to 180 milliseconds." },
      { t: "p", text: "**The setting is the fix, not the individual queries.** Without it the same drift resumes with the next serialiser field — the failure mode is that a lazy load is invisible at the point it is written." }
    ]}
  ],

  takeaways: [
    "**SQLAlchemy is two layers.** Core is a SQL expression language; the ORM adds identity, change tracking and relationships on top of it.",
    "**Use Core semantics for reports, aggregates and bulk writes** — selecting columns instead of entities skips object construction entirely.",
    "**The ORM has no `save()` because it tracks changes.** Mutating a loaded object schedules an `UPDATE` at the next flush.",
    "**Autoflush means a query can emit an `INSERT`**, so a constraint violation can be raised from a line that only reads.",
    "**`expire_on_commit=True` is the default and usually wrong for a web app** — it reloads every object after commit and causes `DetachedInstanceError` past the session boundary.",
    "**A `Session` holds a connection until commit, rollback or close.** A module-level session never releases one, which is how pools are exhausted.",
    "**Scope the session to the request with a dependency**, and do not commit inside it — the handler owns the transaction boundary.",
    "**`lazy=\"raise\"` is the highest-value setting in a SQLAlchemy model.** It turns an invisible N+1 into a CI failure on a three-row fixture.",
    "**`selectinload` for collections, `joinedload` for many-to-one.** A joined load on a collection multiplies rows and transfers the parent columns repeatedly.",
    "**Never load rows to count them.** `select(func.count())` transfers one number.",
    "**Bulk updates belong in a Core `update()`**, and very large ones should be batched to avoid holding locks for minutes.",
    "**`flush()` assigns primary keys without committing**, which is how a service function stays composable inside a larger transaction.",
    "**`session.query()` is the 1.x API.** `select()` is 2.0 and is what current documentation covers."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A module-level `Session` exhausts the connection pool under load. Why?",
        options: [
          "Sessions open a new connection per query",
          "A session holds its connection from the first query until commit, rollback or close — and this one is never closed, so it is never returned to the pool",
          "The pool size is too small",
          "The identity map holds connections"
        ],
        answer: 1,
        why: "It is also not thread-safe, so under a threaded server multiple threads can check out connections through it and none are returned. A request-scoped session created by a dependency is closed on the way out whatever happens, which is what makes the connection lifetime bounded."
      },
      {
        stem: "A function commits and returns an ORM object. The caller sometimes gets `DetachedInstanceError` on an attribute. Why?",
        options: [
          "The object was never added to the session",
          "`expire_on_commit` defaults to True, so every attribute is expired after commit and the next access tries to reload — which fails once the session is closed",
          "The transaction was rolled back",
          "The primary key was not assigned"
        ],
        answer: 1,
        why: "The expiry exists so a long-lived session sees other transactions' changes; a request-scoped session has no such need. Setting `expire_on_commit=False` on the session factory removes both the surprise reload and the intermittent error."
      },
      {
        stem: "You add `joinedload(Order.items)` for 100 orders with 10 items each. What does the database return?",
        options: [
          "100 rows, with items in a nested structure",
          "1,000 rows — the join multiplies the parent, so the order columns are transferred ten times and SQLAlchemy de-duplicates in memory",
          "Two result sets",
          "100 rows, then 10 lazy loads"
        ],
        answer: 1,
        why: "`joinedload` on a collection is the classic misuse. `selectinload` issues a second `WHERE id IN (...)` query instead: 100 rows then 1,000 item rows, with no duplication of parent columns. `joinedload` is correct for many-to-one, where each parent has exactly one related row."
      },
      {
        stem: "What does `lazy=\"raise\"` on a relationship buy you?",
        options: [
          "Faster relationship loading",
          "An unintended lazy load becomes an immediate error, so an N+1 fails in CI on a small fixture instead of appearing as latency in production",
          "It prevents the relationship being written",
          "It forces eager loading everywhere"
        ],
        answer: 1,
        why: "The value is the timing rather than the performance. A lazy load is invisible at the point it is written — one attribute access in a serialiser — and only visible in aggregate under load. Requiring every query to declare what it loads moves that decision to where it can be reviewed."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How does SQLAlchemy's unit of work behave?",
        strong: "The session tracks loaded and added objects, accumulates changes in memory, and emits SQL at flush. Commit flushes then commits, and by default expires everything. Autoflush means a query flushes first, so a read can trigger a write.",
        answer: [
          { t: "p", text: "The autoflush point is the one that shows real use — a constraint violation raised from a line that only queries is confusing until you know why." },
          { t: "p", text: "Mentioning `expire_on_commit` and its consequence past the session boundary connects the mechanism to a bug people actually hit." },
          { t: "p", text: "Distinguishing flush from commit — SQL emitted versus transaction ended — is the underlying model, and it explains why `flush()` is how you get a primary key without committing." }
        ]
      },
      {
        level: "advanced",
        q: "How do you prevent N+1 queries with an ORM?",
        strong: "Set `lazy=\"raise\"` on every relationship so an unintended load is an error, then state loading explicitly per query — `selectinload` for collections, `joinedload` for many-to-one.",
        answer: [
          { t: "p", text: "Leading with the setting rather than the eager-load options is the stronger answer: it fixes the class of bug rather than the instances." },
          { t: "p", text: "The reason the bug is invisible — one attribute access in a serialiser, four hundred in a loop — explains why code review does not catch it." },
          { t: "p", text: "The collection-versus-many-to-one distinction shows you know why the two options exist rather than picking one by habit." }
        ]
      },
      {
        level: "core",
        q: "When would you use Core instead of the ORM?",
        strong: "Reports, aggregates and bulk writes — anywhere object identity and change tracking are overhead rather than help. Selecting columns rather than entities through the session gets most of the benefit without leaving the ORM.",
        answer: [
          { t: "p", text: "Framing it per-query rather than per-project is right: the choice is made statement by statement, not architecturally." },
          { t: "p", text: "The bulk-update example is concrete — loading a million objects to change one field is the shape everyone recognises." },
          { t: "p", text: "Noting the trade-off of a Core update — bypassing ORM events, needing `synchronize_session` — shows you know what you are giving up." }
        ]
      }
    ]
  }
});
