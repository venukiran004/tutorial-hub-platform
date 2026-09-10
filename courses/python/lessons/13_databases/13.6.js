/* ============================================================================
   LESSON 13.6 — The N+1 Problem and Query Optimisation
   ========================================================================= */
EC.receiveLesson({
  id: "13.6",

  lede: "Almost every slow endpoint is one of three things: a query issued in a loop, a query with no usable index, or a query returning far more data than the response needs. **You do not guess which** — `EXPLAIN` tells you, and query logging tells you the rest.",

  objectives: [
    "Detect an N+1 automatically rather than by reading code",
    "Read an `EXPLAIN ANALYZE` plan and find the expensive node",
    "Design an index for a specific query, and know when one will not help",
    "Choose an eager-loading strategy on the shape of the relationship",
    "Recognise the queries an index cannot save"
  ],

  prerequisites: ["13.5"],

  blocks: [

    { t: "h2", n: "01", text: "Find it before your users do", id: "detect" },


    { t: "viz",
      title: "The N+1 problem, drawn",
      caption: "One query for the list, then one more per row. It is invisible in code — the loop looks like plain attribute access — and it is the single most common cause of a slow ORM endpoint.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="One list query followed by one query per row, beside a single joined query">
  <text x="30" y="34" class="s-label" style="fill:var(--crit)">N + 1 queries</text>
  <rect x="30" y="46" width="170" height="32" rx="5" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="2"/>
  <text x="46" y="67" class="s-sub" style="fill:var(--ink-2)">SELECT * FROM post</text>
  <g style="stroke:var(--crit);stroke-width:1.5">
    <line x1="115" y1="80" x2="115" y2="96"/>
    <line x1="115" y1="96" x2="60"  y2="96"/><line x1="115" y1="96" x2="170" y2="96"/>
    <line x1="115" y1="96" x2="280" y2="96"/>
  </g>
  <g style="stroke-width:2">
    <rect x="20"  y="100" width="80" height="30" rx="4" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
    <rect x="110" y="100" width="80" height="30" rx="4" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
    <rect x="200" y="100" width="80" height="30" rx="4" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
  </g>
  <text x="36"  y="120" class="s-sub" style="fill:var(--crit)">author 1</text>
  <text x="126" y="120" class="s-sub" style="fill:var(--crit)">author 2</text>
  <text x="216" y="120" class="s-sub" style="fill:var(--crit)">author 3</text>
  <text x="300" y="120" class="s-sub" style="fill:var(--crit)">... one per row</text>
  <text x="30" y="160" class="s-sub" style="fill:var(--ink-3)">100 posts = 101 round trips</text>

  <text x="500" y="34" class="s-label" style="fill:var(--good)">one query</text>
  <rect x="500" y="46" width="350" height="32" rx="5" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="2"/>
  <text x="516" y="67" class="s-sub" style="fill:var(--ink-2)">SELECT ... FROM post JOIN author ...</text>
  <text x="500" y="110" class="s-sub" style="fill:var(--good)">selectinload / joinedload / prefetch_related</text>
  <text x="500" y="136" class="s-sub" style="fill:var(--ink-3)">1 round trip, whatever the row count</text>

  <text x="30" y="212" class="s-sub" style="fill:var(--ink-3)">It scales with your data, so it passes review and every test, then appears when the table grows.</text>
  <text x="30" y="232" class="s-sub" style="fill:var(--ink-3)">Log the query count per request — a number that jumps with row count is the signature.</text>
</svg>`
    },
    { t: "code", lang: "python", title: "counting queries per request", code: `
from sqlalchemy import event

class QueryCounter:
    """Attach in development and in tests. An N+1 is invisible when
    reading code and obvious when counting."""

    def __init__(self):
        self.statements: list[str] = []

    def __enter__(self):
        event.listen(engine, "before_cursor_execute", self._record)
        return self

    def __exit__(self, *exc):
        event.remove(engine, "before_cursor_execute", self._record)

    def _record(self, conn, cursor, statement, params, context, many):
        self.statements.append(statement)

    @property
    def total(self) -> int:
        return len(self.statements)

    @property
    def repeated(self) -> list[tuple[str, int]]:
        """The N+1 signature: the same SQL text, many times."""
        counts = Counter(normalise(s) for s in self.statements)
        return [(sql, n) for sql, n in counts.items() if n > 3]


# In a test -- this is what makes the fix permanent.
def test_the_dashboard_query_count_is_bounded(client, db):
    seed_orders(count=50, items_each=5)

    with QueryCounter() as counter:
        client.get("/dashboard")

    assert counter.total <= 5, f"{counter.total}: {counter.repeated}"
`,
      hl: [25, 34],
      caption: "**Seed more rows than you need.** An N+1 with three fixture rows costs four queries and passes any threshold; with fifty it is fifty-one and impossible to miss."
    },

    { t: "callout", kind: "insight", title: "Three detection layers", body: [
      { t: "table",
        head: ["Layer", "Catches", "When"],
        rows: [
          ["`lazy=\"raise\"`", "**Every unintended lazy load**", "Development, immediately"],
          ["A query-count assertion", "Regressions in a fixed endpoint", "CI, on every commit"],
          ["`echo=True` or `pg_stat_statements`", "What is actually running", "When investigating"],
          ["Tracing spans per query", "Production N+1s under real data", "**After the fact**"]
        ]
      },
      { t: "p", text: "**`lazy=\"raise\"` is the one that prevents rather than detects.** The others tell you about a problem you already shipped; that one makes it a stack trace before the code leaves your machine." },
      { t: "p", text: "**`pg_stat_statements` is the production view.** Sort by `calls` rather than `total_time` and an N+1 stands out immediately — one statement with a call count matching your request rate multiplied by a page size." }
    ]},

    { t: "h2", n: "02", text: "Reading EXPLAIN", id: "explain" },

    { t: "code", lang: "sql", title: "a plan, annotated", code: `
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE account_id = 'a-1';

--  Seq Scan on orders  (cost=0.00..184.32 rows=1 width=128)
--                      (actual time=0.021..412.883 rows=1 loops=1)
--    Filter: (account_id = 'a-1'::uuid)
--    Rows Removed by Filter: 4999999
--    Buffers: shared read=64103
--  Planning Time: 0.089 ms
--  Execution Time: 412.951 ms
--
-- READ IT LIKE THIS:
--
--   Seq Scan          -- no index used. Every row examined.
--   cost=0.00..184.32 -- the PLANNER'S ESTIMATE, in arbitrary units.
--                        Only useful for comparing plans.
--   rows=1            -- estimated rows.
--   actual ... rows=1 -- what really happened. A large gap between
--                        estimated and actual means bad statistics,
--                        and bad statistics mean bad plans.
--   Rows Removed by Filter: 4999999
--                     -- THE SMOKING GUN. Five million rows read to
--                        return one.
--   Buffers: shared read=64103
--                     -- 64,103 blocks (~500MB) read from disk. This
--                        is the real cost, and it is why a Seq Scan
--                        hurts other queries too: it evicts their
--                        pages from cache.
`,
      hl: [7, 22, 25],
      caption: "**Always use `ANALYZE`.** Without it you get estimates only, and the gap between estimate and reality is usually the thing you need to see. **Always use `BUFFERS`** — I/O is the cost that matters, not the abstract cost number."
    },

    { t: "table",
      head: ["Node", "Means", "Concerning when"],
      rows: [
        ["`Seq Scan`", "Every row read", "**The table is large and few rows match**"],
        ["`Index Scan`", "Index used, then heap fetched", "Rarely — usually what you want"],
        ["`Index Only Scan`", "**Answered from the index alone**", "Never. The best case"],
        ["`Bitmap Heap Scan`", "Many index matches, batched", "Fine — it beats many random reads"],
        ["`Nested Loop`", "For each outer row, scan inner", "**The inner side is large**"],
        ["`Hash Join`", "Build a hash, probe it", "Fine for large joins"],
        ["`Sort`", "Explicit sort", "`Sort Method: external merge` — it spilled to disk"]
      ],
      caption: "**A `Seq Scan` is not automatically wrong.** On a small table, or when returning most rows, it is faster than an index — reading sequentially beats thousands of random lookups. It is wrong when `Rows Removed by Filter` dwarfs the rows returned."
    },

    { t: "h2", n: "03", text: "Indexing for a query", id: "indexing" },

    { t: "ladder",
      title: "`WHERE account_id = ? AND status = ? ORDER BY created_at DESC LIMIT 20`",
      rungs: [
        { level: "bad", label: "One index per column",
          why: "The planner can combine them with a bitmap scan, but it must then sort the result to satisfy the `ORDER BY` — and it reads every matching row before discarding all but twenty. Three indexes, three write costs, and the sort remains.",
          code: `CREATE INDEX ON orders (account_id);
CREATE INDEX ON orders (status);
CREATE INDEX ON orders (created_at);

-- Bitmap Heap Scan, then Sort. Better than nothing, and still
-- reading thousands of rows to return twenty.` },
        { level: "ok", label: "A composite index on the filters",
          why: "One index scan finds the matching rows directly. The `ORDER BY` still needs a sort, because `created_at` is not in the index — so the whole matching set is read and sorted before the limit applies.",
          code: `CREATE INDEX ON orders (account_id, status);

-- Index Scan, then Sort, then Limit.
-- Fast when few rows match. Slow for an account with 50,000 orders. ` },
        { level: "best", label: "Filters, then the sort column",
          why: "The index provides the order, so the planner walks it and stops after twenty rows. Nothing is sorted and nothing extra is read — the cost stops depending on how many orders the account has.",
          code: `CREATE INDEX ON orders (account_id, status, created_at DESC);

-- Index Scan Backward (or forward, given DESC in the index) -> Limit.
-- 20 rows read. No Sort node at all.
--
-- THE ORDER OF COLUMNS:
--   1. equality predicates first  (account_id, status)
--   2. then the sort/range column (created_at)
-- A range or sort column consumes the index's ordering, so nothing
-- after it can be used for filtering.`,
          note: "**The absence of a `Sort` node is the signal.** If `EXPLAIN` still shows one, the index does not match the `ORDER BY` and the limit is not saving you anything." }
      ]
    },

    { t: "callout", kind: "trap", title: "Indexes that do not get used", body: [
      { t: "code", lang: "sql", title: "five reasons the planner ignores yours", numbered: false, code: `
-- 1. A FUNCTION ON THE COLUMN.
WHERE lower(email) = 'a@b.com'          -- index on (email) unusable
CREATE INDEX ON users (lower(email));   -- an expression index fixes it

-- 2. A LEADING WILDCARD.
WHERE name LIKE '%smith'                -- a B-tree cannot help
-- Use a trigram index: CREATE INDEX ... USING gin (name gin_trgm_ops)

-- 3. A TYPE MISMATCH. The column is bigint, the parameter is text --
--    so the column is cast, which is case 1 in disguise.
WHERE order_id = '12345'                -- check your driver's binding

-- 4. LOW SELECTIVITY. 60% of rows have status='active'. Reading the
--    index and then 60% of the heap in random order is SLOWER than a
--    sequential scan, so the planner correctly declines.
--    A partial index on the RARE value is the fix:
CREATE INDEX ON orders (created_at) WHERE status = 'pending';

-- 5. STALE STATISTICS. The planner's row estimates are badly wrong,
--    so it picks the wrong plan. After a bulk load:
ANALYZE orders;`},
      { t: "p", text: "**Number four is the one people fight.** The planner is right — an index scan touching most of the table is slower than reading it sequentially, because random I/O is far more expensive than sequential. The answer is a partial index or a different query, not forcing the index." }
    ]},

    { t: "h2", n: "04", text: "Fixing the N+1", id: "fixing" },

    { t: "code", lang: "python", title: "the same problem in three frameworks", code: `
# SQLAlchemy -- state the load per query.
orders = db.scalars(
    select(Order)
    .options(selectinload(Order.items), joinedload(Order.account))
    .where(Order.status == "pending")
).all()


# Raw SQL -- one query, aggregate in the database.
rows = db.execute(text("""
    SELECT o.id, a.name,
           count(i.id)                        AS item_count,
           coalesce(sum(i.unit_price * i.quantity), 0) AS total
    FROM   orders o
    JOIN   accounts a ON a.id = o.account_id
    LEFT JOIN order_items i ON i.order_id = o.id
    WHERE  o.status = 'pending'
    GROUP BY o.id, a.name
""")).mappings().all()


# When an ORM cannot express it -- batch the second query yourself.
# Two round trips instead of N, and the pattern generalises to any
# lookup you cannot express as a join (a cache, another service).
orders = get_orders()
account_ids = {o.account_id for o in orders}
accounts = {
    a.id: a for a in db.scalars(
        select(Account).where(Account.id.in_(account_ids))
    )
}
for order in orders:
    order.account_name = accounts[order.account_id].name
`,
      hl: [4, 16, 27],
      caption: "**The third pattern is the general one.** Collect the keys, fetch them in one query, index them by key, then attach — it works when the related data comes from Redis, another service, or a file, where no join exists."
    },

    { t: "callout", kind: "tradeoff", title: "Eager loading is not free", body: [
      { t: "p", text: "Eagerly loading a relationship nobody uses is wasted I/O on every request. **The failure mode is symmetrical**: lazy loading everything gives you N+1, eager loading everything gives you one enormous query." },
      { t: "code", lang: "python", title: "load per query, not per model", numbered: false, code: `
# The list view needs the account name only.
select(Order).options(joinedload(Order.account))

# The detail view needs everything.
select(Order).options(
    selectinload(Order.items).joinedload(OrderItem.product),
    joinedload(Order.account),
    selectinload(Order.events),
)

# The export needs neither -- just columns.
select(Order.id, Order.total, Order.created_at)`},
      { t: "p", text: "**This is why `lazy=\"joined\"` on the model is a trap.** It applies to every query touching that model, including the ones that only need an id — and it is invisible at the call site, which is exactly the property that made lazy loading dangerous." }
    ]},

    { t: "h2", n: "05", text: "Queries an index cannot save", id: "no-index" },

    { t: "table",
      head: ["Query", "Why an index does not help", "What does"],
      rows: [
        ["`count(*)` on a large table", "Must visit every row for visibility", "An estimate from `pg_class`, or a counter table"],
        ["`OFFSET 100000`", "The database counts past every skipped row", "**Cursor pagination** (Lesson 12.6)"],
        ["`ORDER BY random()`", "Sorts the entire table", "`TABLESAMPLE`, or a random id lookup"],
        ["`LIKE '%term%'`", "No prefix for a B-tree to seek", "A trigram index, or full-text search"],
        ["Returning a million rows", "The transfer is the cost", "Aggregate in SQL; return the answer"],
        ["`WHERE status = 'active'` at 60%", "**Random heap reads beat sequential? No**", "A partial index on the rare value"]
      ],
      caption: "**`count(*)` surprises people.** PostgreSQL's MVCC means visibility is per-row, so even an index-only scan must check the visibility map — and on a table with recent writes, that means reading the heap anyway."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Take an endpoint from 8s to under 100ms",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This endpoint takes eight seconds for large accounts. You have the code, the query count and an `EXPLAIN` from production." },
        { t: "code", lang: "python", numbered: false, title: "app/api.py", code: `
@app.get("/accounts/{account_id}/activity")
def activity(account_id: str, page: int = 1, db: DB):
    offset = (page - 1) * 50

    orders = db.scalars(
        select(Order)
        .where(Order.account_id == account_id)
        .order_by(Order.created_at.desc())
        .offset(offset).limit(50)
    ).all()

    total = db.scalar(select(func.count()).select_from(Order))

    return {
        "total": total,
        "page": page,
        "orders": [{
            "id": o.id,
            "customer": o.account.name,
            "items": [{"name": i.product.name, "qty": i.quantity}
                      for i in o.items],
            "last_event": o.events[-1].type if o.events else None,
        } for o in orders],
    }`},
        { t: "code", lang: "sql", numbered: false, title: "EXPLAIN of the orders query", code: `
Limit  (cost=284913.22..284913.35 rows=50) (actual time=3821.4..3821.5 rows=50 loops=1)
  ->  Sort  (cost=284913.22..285163.22 rows=100000)
            (actual time=3798.2..3814.9 rows=5050 loops=1)
        Sort Key: created_at DESC
        Sort Method: external merge  Disk: 42104kB
        ->  Seq Scan on orders  (cost=0.00..274120.00 rows=100000)
                                (actual time=0.03..3402.1 rows=98412 loops=1)
              Filter: (account_id = 'a-1'::uuid)
              Rows Removed by Filter: 7901588
              Buffers: shared read=182043`},
        { t: "p", text: "Fix it. State the query count before and after, and explain why page 200 is slower than page 1 even after indexing." }
      ],
      requirements: [
        "Read the plan and name the three problems it shows.",
        "Count the queries for a page of 50 orders with 10 items each.",
        "Give the index, with the column order justified.",
        "Fix the N+1s.",
        "Explain the `total` bug — it is wrong, not just slow.",
        "Explain why `OFFSET` degrades with page number, and what to do."
      ],
      hint: "Look at what `Rows Removed by Filter` and `Sort Method` are telling you. And read the `count()` query carefully — what is it counting?",
      solution: {
        lang: "python",
        title: "app/api.py",
        code: `# =========================================================================
# READING THE PLAN
# =========================================================================
#
# 1. Seq Scan, Rows Removed by Filter: 7,901,588
#    Eight million rows read to find 98,412. There is NO INDEX on
#    account_id. 182,043 buffers is ~1.4GB of I/O for one request --
#    which also evicts every other query's pages from cache, so this
#    endpoint makes the whole service slower.
#
# 2. Sort Method: external merge  Disk: 42104kB
#    The sort did not fit in work_mem and SPILLED TO DISK. It is
#    sorting all 98,412 matching rows to return 50.
#
# 3. actual rows=5050 at the Sort node, for page 101.
#    OFFSET 5000 means the database produces 5,050 rows and throws
#    away 5,000. The work grows linearly with the page number.
#
# The three are one cause: no usable index, so everything downstream
# is forced to do it the hard way.
#
#
# =========================================================================
# THE QUERY COUNT -- 50 orders, 10 items each
# =========================================================================
#
#   1     SELECT orders (the 8-second one)
#   1     SELECT count(*) -- over the WHOLE table
#   50    o.account          -> lazy load per order
#   50    o.items            -> lazy load per order
#   500   i.product          -> lazy load PER ITEM (50 x 10)
#   50    o.events           -> lazy load per order
#   -----
#   652 queries.
#
# The nested one is the worst: i.product inside the items
# comprehension is a query per line item, so it scales with
# page_size x items_per_order.
#
#
# =========================================================================
# THE total BUG -- wrong, not just slow
# =========================================================================
#
#   select(func.count()).select_from(Order)
#
# There is NO WHERE CLAUSE. It counts every order in the system,
# across every account. So:
#
#   - the pagination is wrong: the UI shows page counts for 8 million
#     orders when the account has 98,412
#   - it leaks information: the total order volume of the entire
#     platform is exposed to any authenticated customer
#
# A missing WHERE on an aggregate is a quiet cross-tenant leak, and
# it looks exactly like a correct query.
#
#
# =========================================================================
# WHY OFFSET DEGRADES
# =========================================================================
#
# OFFSET does not skip rows cheaply. The database must PRODUCE every
# row up to the offset -- reading it, checking visibility, sorting it
# -- and then discard it. Page 1 produces 50 rows; page 200 produces
# 10,050 and discards 10,000.
#
# An index fixes the SCAN but not this: the index walk still visits
# every skipped entry. So page 200 stays proportionally slower
# forever.
#
# It is also INCORRECT under concurrent writes. A new order arriving
# between page 1 and page 2 shifts everything down one, so the last
# row of page 1 reappears as the first of page 2 -- and one row is
# never seen. This presents as "the export is missing records".
#
# The fix is keyset (cursor) pagination: WHERE (created_at, id) <
# (last_seen_created_at, last_seen_id), which is O(limit) at any
# depth and stable under writes.


# =========================================================================
# THE INDEX
# =========================================================================
--
-- CREATE INDEX CONCURRENTLY orders_account_created_idx
--     ON orders (account_id, created_at DESC, id DESC);
--
-- COLUMN ORDER:
--   account_id     equality predicate -> first. It is also highly
--                  selective: 98k rows out of 8M.
--   created_at DESC  the sort column -> second, so the index SUPPLIES
--                  the order and no Sort node is needed.
--   id DESC        the tiebreak, so the keyset comparison is a clean
--                  composite and rows never repeat across pages.
--
-- DESC in the index is not strictly required -- PostgreSQL can scan a
-- B-tree backwards -- but it matters for the composite: a mixed
-- ASC/DESC sort cannot be served by an all-ASC index.
--
-- CONCURRENTLY, always: a plain CREATE INDEX takes ACCESS EXCLUSIVE
-- and blocks the table for the duration on 8M rows.
--
-- AFTER: Index Scan -> Limit. 50 rows read. No Seq Scan, no Sort, no
-- disk spill. ~2ms.


# =========================================================================
# THE REWRITE
# =========================================================================

class ActivityPage(BaseModel):
    orders: list[ActivityOrder]
    next_cursor: str | None
    has_more: bool
    total: int


@app.get("/accounts/{account_id}/activity", response_model=ActivityPage)
def activity(
    account_id: UUID,
    db: DB,
    user: CurrentUser,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> ActivityPage:
    # Authorisation first (Lesson 12.8): 404 rather than 403.
    if account_id != user.account_id:
        raise HTTPException(404, "Not found")

    # ---- QUERY 1: the page, with everything it needs ---------------
    stmt = (
        select(Order)
        .options(
            # Many-to-one: a join adds no rows, so keep it in query 1.
            joinedload(Order.account),
            # Collection: selectinload issues a second IN query rather
            # than multiplying 50 orders into 500 rows.
            #
            # The CHAINED joinedload is the fix for the 500-query
            # nested lazy load: products are joined into the items
            # query, not fetched one per line.
            selectinload(Order.items).joinedload(OrderItem.product),
        )
        .where(Order.account_id == account_id)
        # The tiebreak is part of the sort, matching the index exactly.
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(limit + 1)          # +1 tells us whether more exist,
    )                              # without a second COUNT query

    if cursor:
        created_at, order_id = decode_cursor(cursor)
        # A composite comparison on the SAME columns as the ORDER BY.
        # Comparing created_at alone is wrong: two orders sharing a
        # timestamp straddle the boundary and one is skipped.
        stmt = stmt.where(
            tuple_(Order.created_at, Order.id) < (created_at, order_id)
        )

    rows = db.scalars(stmt).unique().all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    # ---- QUERY 2: last event per order, batched --------------------
    #
    # o.events[-1] loaded EVERY event for every order to take the last
    # one. DISTINCT ON gets one row per order in a single query, and
    # transfers only what is displayed.
    last_events = {
        r.order_id: r.type
        for r in db.execute(
            select(OrderEvent.order_id, OrderEvent.type)
            .distinct(OrderEvent.order_id)
            .where(OrderEvent.order_id.in_([o.id for o in rows]))
            .order_by(OrderEvent.order_id, OrderEvent.created_at.desc())
        )
    }

    # ---- QUERY 3: the count, SCOPED and bounded --------------------
    total = db.scalar(
        select(func.count())
        .select_from(Order)
        .where(Order.account_id == account_id)     # THE MISSING FILTER
    )

    return ActivityPage(
        orders=[
            ActivityOrder(
                id=o.id,
                customer=o.account.name,
                items=[ItemOut(name=i.product.name, qty=i.quantity)
                       for i in o.items],
                last_event=last_events.get(o.id),
            )
            for o in rows
        ],
        next_cursor=encode_cursor(rows[-1]) if has_more and rows else None,
        has_more=has_more,
        total=total,
    )


# =========================================================================
# RESULT
# =========================================================================
#
#             before            after
#   queries   652               4  (orders, items+products, events, count)
#   scan      Seq, 8M rows      Index Scan, 50 rows
#   sort      external merge    none -- the index supplies the order
#   I/O       ~1.4GB            ~200KB
#   time      8,000ms           ~35ms
#   page 200  slower still      identical to page 1 (keyset)
#   total     WRONG             correct, and scoped
#
# The count is now the most expensive query, at ~40ms on 98k rows. If
# that matters, drop exact counts -- has_more is what the UI actually
# needs -- or use an estimate:
#
#   SELECT reltuples::bigint FROM pg_class WHERE relname = 'orders';
#
# ...though that is table-wide and cannot be scoped, so the honest
# option is usually to stop showing an exact total.


# =========================================================================
# TESTS
# =========================================================================

def test_the_query_count_is_bounded(client, db):
    """Pin the fix so the next serialiser field cannot undo it."""
    seed_orders(account_id=ACCOUNT, count=50, items_each=10)

    with QueryCounter() as counter:
        client.get(f"/accounts/{ACCOUNT}/activity")

    assert counter.total <= 4, f"{counter.total}: {counter.repeated}"


def test_the_total_is_scoped_to_the_account(client, db):
    """The cross-tenant leak. This is the correctness bug, not the
    performance one."""
    seed_orders(account_id=ACCOUNT, count=3)
    seed_orders(account_id="other-account", count=500)

    assert client.get(f"/accounts/{ACCOUNT}/activity").json()["total"] == 3


def test_pagination_is_stable_under_concurrent_writes(client, db):
    """The OFFSET correctness bug, pinned. With keyset pagination a
    new row at the front cannot cause a repeat or a skip."""
    seed_orders(account_id=ACCOUNT, count=100)

    page1 = client.get(f"/accounts/{ACCOUNT}/activity?limit=20").json()
    seed_orders(account_id=ACCOUNT, count=5)          # new, at the front
    page2 = client.get(
        f"/accounts/{ACCOUNT}/activity?limit=20"
        f"&cursor={page1['next_cursor']}").json()

    ids1 = {o["id"] for o in page1["orders"]}
    ids2 = {o["id"] for o in page2["orders"]}
    assert ids1 & ids2 == set(), "a row appeared on both pages"


def test_orders_sharing_a_timestamp_are_not_skipped(client, db):
    """Why the cursor compares (created_at, id) and not created_at."""
    at = utcnow()
    seed_orders(account_id=ACCOUNT, count=10, created_at=at)   # identical

    seen = []
    cursor = None
    while True:
        page = client.get(f"/accounts/{ACCOUNT}/activity"
                          f"?limit=3&cursor={cursor or ''}").json()
        seen += [o["id"] for o in page["orders"]]
        cursor = page["next_cursor"]
        if not cursor:
            break

    assert len(seen) == len(set(seen)) == 10


def test_the_plan_uses_the_index(db):
    """Guard the index itself. A dropped index is a silent 8-second
    regression, and nothing else in the suite would notice."""
    plan = db.execute(text(
        "EXPLAIN (FORMAT JSON) SELECT * FROM orders "
        "WHERE account_id = :a ORDER BY created_at DESC, id DESC LIMIT 50"
    ), {"a": ACCOUNT}).scalar()

    text_plan = json.dumps(plan)
    assert "Seq Scan" not in text_plan
    assert "Sort" not in text_plan          # the index supplies order`,
        notes: [
          { t: "p", text: "**The `total` is a correctness bug, not a performance one.** `select(func.count()).select_from(Order)` has no `WHERE`, so it counts every order on the platform — wrong pagination, and a quiet cross-tenant disclosure of total volume to any authenticated customer." },
          { t: "p", text: "**The nested `i.product` lazy load is the largest share of the 652 queries.** It runs once per line item, so it scales with page size multiplied by items per order — and the chained `selectinload(Order.items).joinedload(OrderItem.product)` collapses all 500 into the items query." },
          { t: "callout", kind: "insight", title: "An index fixes the scan; it does not fix OFFSET", body: [
            { t: "p", text: "`OFFSET` still requires producing and discarding every skipped row, so page 200 remains proportionally slower even with a perfect index. The work is inherent to the operation, not to the access path." },
            { t: "p", text: "It is also incorrect under concurrent writes: a row inserted at the front shifts everything down, so the last row of page 1 reappears on page 2 and another is never seen. Keyset pagination is O(limit) at any depth and stable." }
          ]},
          { t: "p", text: "**`Sort Method: external merge Disk: 42104kB` is the line that says the sort spilled.** It did not fit in `work_mem`, so 42MB went to disk — and the reason there is a sort at all is that no index supplied the order." },
          { t: "p", text: "**Comparing `(created_at, id)` rather than `created_at` alone is what makes the cursor correct.** Ten orders sharing a timestamp straddle the page boundary otherwise, and the ones on the wrong side are silently never returned." },
          { t: "p", text: "**The `EXPLAIN` assertion in the test suite guards the index itself.** Dropping it during a migration is an eight-second regression that no functional test detects — asserting the absence of `Seq Scan` and `Sort` catches it at the point it happens." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team added an index to fix a slow query, measured a large improvement in staging, and shipped it. Write latency on the table rose 40% the next day." },
      { t: "p", text: "**The table already had eleven indexes**, several of which `pg_stat_user_indexes` showed had never been scanned. Every insert was maintaining twelve B-trees, and the new one was the straw." },
      { t: "p", text: "**Dropping four unused indexes returned write latency below where it started**, and the new index kept its read benefit. The unused ones had been added the same way — a slow query, an index, a measurement, a ship." },
      { t: "p", text: "**Every index is a permanent tax on every write.** Adding one is a trade, and the way to keep the trade honest is to check `idx_scan` periodically and drop what nothing reads." }
    ]}
  ],

  takeaways: [
    "**Count queries in tests with a real number of fixture rows.** An N+1 with three rows costs four queries and passes every threshold.",
    "**`lazy=\"raise\"` prevents; query counting and `pg_stat_statements` detect.** Prefer the one that fails before the code leaves your machine.",
    "**In `pg_stat_statements`, sort by `calls`, not `total_time`** — an N+1 shows up as one statement with an absurd call count.",
    "**Always `EXPLAIN (ANALYZE, BUFFERS)`.** Estimates alone hide the gap between what the planner expected and what happened.",
    "**`Rows Removed by Filter` is the smoking gun** for a missing index, and `Sort Method: external merge` means the sort spilled to disk.",
    "**Composite index order: equality columns, then the sort or range column.** A range column consumes the ordering, so nothing after it filters.",
    "**The absence of a `Sort` node is the sign your index matches the `ORDER BY`.** If a sort remains, the `LIMIT` is not saving you anything.",
    "**A function on a column defeats a plain index**, as does a leading wildcard and a type mismatch that forces a cast.",
    "**A `Seq Scan` is correct when most rows match.** Random heap reads are far more expensive than sequential ones — use a partial index on the rare value instead.",
    "**Load per query, not per model.** `lazy=\"joined\"` on a relationship applies to every query, including ones that need only an id.",
    "**Collect keys, fetch in one query, index by key, attach** — the general N+1 fix, and the only one that works when the data is not in the database.",
    "**An index fixes the scan, not `OFFSET`.** Deep pages stay slow and are incorrect under concurrent writes; use keyset pagination.",
    "**Every index taxes every write.** Check `idx_scan` and drop what nothing reads."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`EXPLAIN ANALYZE` shows `Seq Scan` with `Rows Removed by Filter: 7901588` returning 50 rows. What does this tell you?",
        options: [
          "The table needs vacuuming",
          "No usable index exists for the filter — eight million rows were read and discarded to return fifty",
          "The statistics are stale",
          "`work_mem` is too small"
        ],
        answer: 1,
        why: "`Rows Removed by Filter` far exceeding rows returned is the clearest missing-index signal there is. The `BUFFERS` line quantifies the damage — it is not only this query that suffers, because a large sequential scan evicts other queries' pages from the shared buffer cache."
      },
      {
        stem: "For `WHERE account_id = ? ORDER BY created_at DESC LIMIT 20`, why is `(account_id, created_at DESC)` better than `(account_id)`?",
        options: [
          "It is smaller",
          "The index supplies the sort order, so the planner reads 20 rows and stops instead of reading every match and sorting it",
          "It allows an index-only scan",
          "Two-column indexes are always faster"
        ],
        answer: 1,
        why: "With only `account_id` indexed, all 98,000 matching rows are read and sorted before the limit applies — and the sort may spill to disk. The absence of a `Sort` node in the plan is the confirmation that the index matches the `ORDER BY`."
      },
      {
        stem: "You add the right index, but page 200 is still much slower than page 1. Why?",
        options: [
          "The index is not being used for deep pages",
          "`OFFSET` requires producing and discarding every skipped row, so the work grows with page number regardless of the access path",
          "The planner switches to a sequential scan",
          "Deep pages exceed `work_mem`"
        ],
        answer: 1,
        why: "The index makes each row cheap to produce; it does not remove the need to produce them. Keyset pagination — comparing `(created_at, id)` against the last row seen — is O(limit) at any depth, and it also fixes the correctness bug where a concurrent insert makes a row repeat on the next page."
      },
      {
        stem: "The planner ignores your index on `status` where 60% of rows are `'active'`. Is this a bug?",
        options: [
          "Yes — force it with a planner hint",
          "No — an index scan touching most of the table means random heap reads, which are slower than a sequential scan; a partial index on a rare value is the fix",
          "Yes — run `ANALYZE` to correct it",
          "No — indexes never work on text columns"
        ],
        answer: 1,
        why: "Low selectivity is the one case where the planner declining your index is the right call. Random I/O costs far more per page than sequential, so reading 60% of the heap in index order loses. `CREATE INDEX ... WHERE status = 'pending'` gives a small index for the query that actually needs one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the N+1 problem and how do you find it?",
        strong: "One query for a list, then one per row for a relationship. Find it by counting queries in tests with realistic fixture sizes, and prevent it with `lazy=\"raise\"` so an unintended load is an error rather than latency.",
        answer: [
          { t: "p", text: "The prevention-versus-detection distinction is what makes this a senior answer — everything else finds a problem you already shipped." },
          { t: "p", text: "Noting that three fixture rows hide it is the practical detail: the test exists and passes, which is why the bug reaches production." },
          { t: "p", text: "Mentioning `pg_stat_statements` sorted by `calls` gives the production-side answer for a system already running." }
        ]
      },
      {
        level: "advanced",
        q: "Walk me through optimising a slow query.",
        strong: "`EXPLAIN (ANALYZE, BUFFERS)` first. Look for `Seq Scan` with a large `Rows Removed by Filter`, a `Sort` that should have come from an index, and a gap between estimated and actual rows. Then index for the specific query — equality columns, then the sort column.",
        answer: [
          { t: "p", text: "Starting with the plan rather than a guess is the whole answer; the specific signals show you have read plans rather than heard of them." },
          { t: "p", text: "The estimated-versus-actual gap is a good detail, because it points at statistics rather than indexes and shows you know both causes." },
          { t: "p", text: "Closing with the write cost of an index — and checking `idx_scan` for unused ones — shows you treat it as a trade rather than a free win." }
        ]
      },
      {
        level: "advanced",
        q: "When does adding an index not help?",
        strong: "When the predicate applies a function to the column, when the pattern has a leading wildcard, when selectivity is low enough that a sequential scan wins, when the cost is the volume of data returned, and for `OFFSET`, which must produce every skipped row regardless.",
        answer: [
          { t: "p", text: "Naming low selectivity and explaining why the planner is right shows you understand the cost model rather than fighting it." },
          { t: "p", text: "The `OFFSET` case is the one that connects to API design, and being able to move from there to keyset pagination shows range." },
          { t: "p", text: "Offering the fixes alongside — expression index, trigram index, partial index — keeps it constructive rather than a list of limitations." }
        ]
      }
    ]
  }
});
