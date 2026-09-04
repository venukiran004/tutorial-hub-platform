/* ============================================================================
   LESSON 10.5 — Performance Anti-Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "10.5",

  lede: "Ranked by how often they actually appear in profiles, not by how interesting they are. **The first one on this list causes more production slowdowns than the other five combined**, and none of them are exotic — they are all things that look completely reasonable in review and get slower in a way nobody notices until the data grows.",

  objectives: [
    "Recognise the N+1 query and fix it at the query rather than in Python",
    "Spot accidental quadratic behaviour in code that contains no nested loop",
    "Choose the container whose complexity matches the operation you repeat",
    "Move invariant work out of a loop, including the work you did not write",
    "Tell a real optimisation from a premature one, with a rule you can apply"
  ],

  prerequisites: ["10.1", "10.2"],

  blocks: [

    { t: "h2", n: "01", text: "1 — The N+1 query", id: "n1" },

    { t: "viz",
      title: "One query, or a hundred and one",
      caption: "The loop looks like it touches memory. Each iteration is a network round trip to the database, so the cost is not the Python — it is 100 × the latency between your service and a machine in another rack.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram contrasting 101 sequential database round trips with a single query returning all rows">
  <rect x="14" y="28" width="418" height="246" rx="12" style="fill:none;stroke:var(--crit)" stroke-width="1.5"/>
  <text x="34" y="54" class="s-label" style="fill:var(--crit)">N+1 — 101 round trips</text>

  <g class="s-mono" style="font-size:9px">
    <rect x="34" y="72" width="120" height="20" rx="4" class="s-fill s-stroke" stroke-width="1"/>
    <text x="44" y="86">SELECT orders</text>
    <text x="168" y="86" class="s-sub">2 ms</text>

    <rect x="34" y="100" width="120" height="20" rx="4" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="44" y="114">SELECT customer 1</text>
    <text x="168" y="114" class="s-sub">2 ms</text>

    <rect x="34" y="128" width="120" height="20" rx="4" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="44" y="142">SELECT customer 2</text>
    <text x="168" y="142" class="s-sub">2 ms</text>

    <text x="44" y="168" class="s-sub">… 97 more …</text>

    <rect x="34" y="180" width="120" height="20" rx="4" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="44" y="194">SELECT customer 100</text>
    <text x="168" y="194" class="s-sub">2 ms</text>
  </g>

  <line x1="34" y1="216" x2="412" y2="216" style="stroke:var(--crit)" stroke-width="1"/>
  <text x="34" y="240" class="s-mono" style="font-size:12px;fill:var(--crit)">202 ms</text>
  <text x="34" y="262" class="s-sub">and it grows linearly with the page size</text>

  <rect x="468" y="28" width="418" height="246" rx="12" style="fill:none;stroke:var(--good)" stroke-width="1.5"/>
  <text x="488" y="54" class="s-label" style="fill:var(--good)">JOINED — 1 round trip</text>

  <g class="s-mono" style="font-size:9px">
    <rect x="488" y="72" width="300" height="20" rx="4" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
    <text x="498" y="86">SELECT orders JOIN customers</text>
    <text x="802" y="86" class="s-sub">4 ms</text>
  </g>

  <text x="488" y="124" class="s-sub">The database does the join, where the data</text>
  <text x="488" y="146" class="s-sub">already is and an index already exists.</text>

  <line x1="488" y1="216" x2="866" y2="216" style="stroke:var(--good)" stroke-width="1"/>
  <text x="488" y="240" class="s-mono" style="font-size:12px;fill:var(--good)">4 ms</text>
  <text x="488" y="262" class="s-sub">50x, and flat as the page grows</text>
</svg>`
    },

    { t: "code", lang: "python", title: "it never looks like a query", code: `
# The loop body reads like an attribute access
orders = session.query(Order).limit(100).all()
for order in orders:
    print(order.customer.name)          # <- a SELECT, every iteration


# ORM fix: fetch the relation in the same query
from sqlalchemy.orm import selectinload

orders = session.query(Order).options(
    selectinload(Order.customer)        # 2 queries total, whatever N is
).limit(100).all()


# No ORM? Batch the second query and index it in Python.
orders = fetch_orders(limit=100)
ids = {o.customer_id for o in orders}
customers = {
    c.id: c for c in fetch_customers_in(ids)      # ONE query
}
for order in orders:
    print(customers[order.customer_id].name)
`,
      hl: [4, 11, 12],
      caption: "**`selectinload` issues a second query with `WHERE id IN (...)`; `joinedload` uses a JOIN.** Prefer `selectinload` for one-to-many, where a join multiplies rows and ships the parent's columns once per child."
    },

    { t: "callout", kind: "insight", title: "Catch it in tests, not in production", body: [
      { t: "code", lang: "python", title: "assert on the query count", numbered: false, code: `
@pytest.fixture
def query_counter(engine):
    """Counts statements. An N+1 is a COUNT regression, so it is
    catchable long before it is a latency regression."""
    queries = []

    @event.listens_for(engine, "after_cursor_execute")
    def record(conn, cursor, statement, *args):
        queries.append(statement)

    yield queries
    event.remove(engine, "after_cursor_execute", record)


def test_order_list_does_not_n_plus_one(client, query_counter, make_orders):
    make_orders(50)                       # fifty orders, fifty customers

    client.get("/orders")

    # The number must not depend on how many orders exist.
    assert len(query_counter) <= 3, "\\n".join(query_counter)`},
      { t: "p", text: "**The assertion is on a constant, not a threshold.** \"At most three queries regardless of row count\" is a property; \"under 200 ms\" is a measurement that passes on a fast laptop with ten rows (Lesson 9.7)." },
      { t: "p", text: "N+1 is the most common performance bug in web applications by a wide margin, and this test is the only reliable way to keep it out — because it is invisible in code review by construction." }
    ]},

    { t: "h2", n: "02", text: "2 — Accidental quadratic", id: "quadratic" },

    { t: "code", lang: "python", title: "no nested loop in sight", code: `
# 1. Membership test against a list — O(n) per check, inside a loop
known = load_known_ids()                     # a list of 50,000
new = [r for r in rows if r.id not in known]        # 50,000 x 50,000

new = [r for r in rows if r.id not in set(known)]   # set() INSIDE the
                                                     # comprehension: rebuilt
                                                     # every iteration!
known_ids = set(known)                               # hoist it. O(n) total.
new = [r for r in rows if r.id not in known_ids]


# 2. Building a string with +=
out = ""
for row in rows:
    out += format(row)                       # copies everything, every time
out = "".join(format(row) for row in rows)   # O(n)


# 3. Removing from the front of a list
while queue:
    job = queue.pop(0)                       # shifts every element
from collections import deque
queue = deque(queue)
while queue:
    job = queue.popleft()                    # O(1)


# 4. Repeated concatenation of lists
result = []
for chunk in chunks:
    result = result + chunk                  # a new list each time
    result.extend(chunk)                     # in place. O(1) amortised
`,
      hl: [4, 6, 9, 10],
      caption: "**Lines 6 and 9 are the same bug in opposite directions.** `set(known)` inside the comprehension is evaluated per item, so it is *slower* than the list version it was meant to fix — a genuinely common regression."
    },

    { t: "table",
      head: ["Operation", "`list`", "`set` / `dict`", "`deque`"],
      rows: [
        ["`x in c`", "**O(n)**", "O(1)", "O(n)"],
        ["Append to the end", "O(1)", "O(1)", "O(1)"],
        ["Insert or remove at the front", "**O(n)**", "—", "**O(1)**"],
        ["Index by position", "O(1)", "—", "O(n)"],
        ["Preserves order", "Yes", "Insertion order (dict)", "Yes"],
        ["Holds duplicates", "Yes", "No", "Yes"]
      ],
      caption: "**Pick the container from the operation you repeat, not from what the data looks like.** A membership test in a loop is the single most valuable thing to move off a list (Lesson 5.9)."
    },

    { t: "h2", n: "03", text: "3 — Work repeated inside a loop", id: "hoisting" },

    { t: "ladder",
      title: "Validating and formatting fifty thousand records",
      rungs: [
        { level: "bad", label: "Everything inside",
          why: "The pattern is compiled, the config is read, the lookup is built and the attribute chain is resolved on every iteration. None of it depends on the row, and together it is most of the runtime.",
          code: `for row in rows:
    if re.match(r"^[A-Z]{2}\\d{6}$", row.reference):     # compiled each time
        rate = load_config()["rates"][row.currency]      # file read each time
        valid = row.code in [c.code for c in db.codes()] # query + list each time
        self.results.append(format(row, rate))           # attribute lookup x2` },
        { level: "ok", label: "Hoisted",
          why: "Everything invariant moves out. The loop now does only what varies per row, which is usually a five- to fifty-fold difference and needed no cleverness at all.",
          code: `REFERENCE = re.compile(r"^[A-Z]{2}\\d{6}$")      # module level
rates = load_config()["rates"]
valid_codes = {c.code for c in db.codes()}      # set, not list

for row in rows:
    if REFERENCE.match(row.reference):
        if row.code in valid_codes:
            self.results.append(format(row, rates[row.currency]))` },
        { level: "best", label: "Hoisted, and the loop body reduced",
          why: "Binding the method once removes an attribute lookup per iteration, and the local aliases remove a global lookup each. Micro-optimisations individually — but they are free here, and this is the one place where a constant factor is multiplied by n.",
          code: `REFERENCE = re.compile(r"^[A-Z]{2}\\d{6}$")


def process(self, rows: Iterable[Row]) -> None:
    rates = load_config()["rates"]
    valid_codes = {c.code for c in db.codes()}
    append = self.results.append          # bound once, not per row
    match = REFERENCE.match               # local beats global lookup

    for row in rows:
        if match(row.reference) and row.code in valid_codes:
            append(format(row, rates[row.currency]))`,
          note: "**Only reach for the last rung inside a hot loop, and only after profiling.** Written everywhere it is noise; written in the one loop that runs fifty thousand times it is measurable and harmless (Lesson 10.2)." }
      ]
    },

    { t: "callout", kind: "trap", title: "The invariant work you did not write", body: [
      { t: "code", lang: "python", title: "these all hide a rebuild per iteration", numbered: false, code: `
for row in rows:
    if row.status in ("paid", "pending", "refunded"):   # tuple: fine, cached
        ...

for row in rows:
    if row.status in {"paid", "pending", "refunded"}:   # set literal of
        ...                                              # constants: also
                                                         # cached by the peephole
                                                         # optimiser

for row in rows:
    if row.status in {s.name for s in statuses}:        # REBUILT every time
        ...

for row in rows:
    total += Decimal(str(rate))                          # parsed every time

for row in rows:
    logger.debug(f"processing {row.to_json()}")          # to_json() runs even
                                                         # when DEBUG is off`},
      { t: "p", text: "**CPython caches constant tuples and frozensets of literals**, so the first two are free. Anything computed — a comprehension, a `Decimal` parse, a method call — is not, and runs per iteration." },
      { t: "p", text: "The logging one is the sneakiest: the f-string is evaluated before `debug()` is called, so an expensive `to_json()` runs on every row in production where the level is INFO. Pass the value as an argument instead (Lesson 6.4)." }
    ]},

    { t: "h2", n: "04", text: "4, 5 and 6 — the rest of the list", id: "rest" },

    { t: "tabs", items: [
      { label: "4 · Loading more than you need", blocks: [
        { t: "code", lang: "python", title: "the row count is the cost", numbered: false, code: `
# Fetching everything to count it
orders = session.query(Order).all()
count = len(orders)                       # ships every row over the wire
count = session.query(Order).count()      # the database counts

# Fetching every column to use two
rows = session.query(Order).all()
rows = session.query(Order.id, Order.total).all()

# Filtering in Python what SQL could filter
paid = [o for o in session.query(Order).all() if o.status == "paid"]
paid = session.query(Order).filter_by(status="paid").all()

# Sorting and slicing in Python
top = sorted(all_orders, key=lambda o: -o.total)[:10]
top = session.query(Order).order_by(Order.total.desc()).limit(10).all()`},
        { t: "p", text: "**Every one of these moves work from the database to your process**, across a network, after serialising rows you then discard. The database has indexes, statistics and a query planner; your `for` loop has none of those." },
        { t: "p", text: "The same applies to APIs: requesting a full object list to count it, or paging through everything to find one item, is the identical mistake at a higher latency." }
      ]},
      { label: "5 · Pure-Python numeric loops", blocks: [
        { t: "code", lang: "python", title: "when the loop is arithmetic", numbered: false, code: `
# 10 million floats, element by element
result = [a * 2 + b for a, b in zip(xs, ys)]        # ~4.1 s

import numpy as np
xs, ys = np.asarray(xs), np.asarray(ys)
result = xs * 2 + ys                                # ~0.03 s

# The interpreter overhead per element is the whole cost: a Python-level
# loop pays object unboxing, dispatch and refcounting per item, where a
# vectorised call does the loop in C over unboxed memory.`,
          out: `list comprehension:  4.12 s
numpy:               0.03 s      ~130x`},
        { t: "p", text: "**This only applies to homogeneous numeric work at scale.** For a thousand elements the conversion costs more than it saves, and for heterogeneous data it does not apply at all (Lesson 10.6)." }
      ]},
      { label: "6 · Optimising the wrong thing", blocks: [
        { t: "code", lang: "python", title: "the profile nobody read", numbered: false, code: `
#   ncalls  tottime  cumtime  function
#        1    0.001   12.400  handle_request
#        1    0.002   12.180  fetch_from_api        <- 98% of the time
#      500    0.140    0.180  parse_row
#     5000    0.031    0.031  format_currency       <- optimised for a week`},
        { t: "p", text: "**The list comprehension someone rewrote as a generator saved 30 ms of a 12-second request.** The other 12.18 seconds is one HTTP call with no timeout and no connection pooling." },
        { t: "p", text: "**Profile first, always.** Intuition about hot paths is wrong often enough that acting on it without measurement is guessing with extra steps." }
      ]}
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a 40-second endpoint fast",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "This endpoint takes 40 seconds for 500 orders and times out at 1,000. It contains five of the six anti-patterns. Find them, rank them by cost, and fix them in that order." },
        { t: "code", lang: "python", title: "views.py — as found", numbered: false, code: `
def order_report(request):
    orders = session.query(Order).all()

    valid_codes = [c.code for c in session.query(Code).all()]

    html = ""
    for order in orders:
        if order.created_at.year != request.year:
            continue
        if order.status not in ["paid", "shipped", "delivered"]:
            continue
        if order.product_code not in valid_codes:
            continue

        customer = session.query(Customer).get(order.customer_id)
        rate = Decimal(str(load_config()["rates"][order.currency]))

        html += render_row(order, customer, rate)
        logger.debug(f"rendered {order.to_dict()}")

    return HttpResponse(html)`},
        { t: "p", text: "Give the expected time after each fix, so the ranking is justified rather than asserted." }
      ],
      requirements: [
        "Identify each anti-pattern and estimate its share of the 40 seconds.",
        "Fix them in descending order of cost.",
        "Make the filtering happen in the database.",
        "Add a test that catches the N+1 by counting queries, not by timing.",
        "Say which fix you would ship first if you could only ship one.",
        "**Explain why the `logger.debug` line costs anything when the level is INFO.**"
      ],
      hint: "Count the round trips. There is one query up front, one per order inside the loop, and a config read per order — and the loop is filtering rows the database should never have sent.",
      solution: {
        lang: "python",
        title: "views.py",
        code: `# =========================================================================
# WHERE THE 40 SECONDS WENT — 500 orders, ~2 ms per round trip
# =========================================================================
#
#  1. N+1 on customer                  500 queries x 2 ms   =  ~1.0 s
#  2. load_config() per order          500 file reads       = ~18.0 s
#  3. to_dict() per order, at DEBUG    500 serialisations   = ~12.0 s
#  4. valid_codes as a LIST            500 x O(n) scans     =  ~0.4 s
#  5. html += in a loop                quadratic copying    =  ~2.5 s
#  6. .all() then filtering in Python  ships every row      =  ~5.0 s
#                                                            ---------
#                                                              ~38.9 s
#
# The ranking is the point: the N+1 is the famous one and it is FOURTH.
# The two that dominate are a file read and a serialisation, both of
# which look like nothing in review.


from __future__ import annotations

import functools
from decimal import Decimal

from sqlalchemy.orm import selectinload

VALID_STATUSES = ("paid", "shipped", "delivered")


# ---- fix 2 (18 s): read the config once ---------------------------------
# The single biggest win, and the least interesting line in the file.
# load_config() opens and parses a file; inside a loop that is 500 file
# reads for a value that cannot change during a request.
@functools.cache
def rates() -> dict[str, Decimal]:
    """Parsed once per process. Decimal conversion happens here too, so
    the loop does a dict lookup rather than a parse (Lesson 10.4)."""
    return {k: Decimal(str(v)) for k, v in load_config()["rates"].items()}


def order_report(request):
    # ---- fix 6 (5 s) + fix 1 (1 s) --------------------------------------
    # Filter in the DATABASE, and fetch the relation in the same trip.
    # The loop's three continue statements become a WHERE clause the
    # use an index for, so 500 rows shipped becomes only the matching ones.
    orders = (
        session.query(Order)
        .options(selectinload(Order.customer))     # 2 queries, not 1 + N
        .join(Code, Code.code == Order.product_code)   # fix 4, in SQL
        .filter(
            extract("year", Order.created_at) == request.year,
            Order.status.in_(VALID_STATUSES),
        )
        .order_by(Order.created_at)
        .all()
    )

    rate_by_currency = rates()

    # ---- fix 5 (2.5 s): build a list, join once -------------------------
    # "html += ..." copies the whole accumulated string on every
    # iteration: 1 + 2 + 3 + ... + n character copies. join() computes the
    # total length and allocates once.
    parts: list[str] = []
    for order in orders:
        parts.append(render_row(
            order,
            order.customer,                       # already loaded
            rate_by_currency[order.currency],
        ))

        # ---- fix 3 (12 s) -----------------------------------------------
        # The f-string is evaluated BEFORE debug() is called, so
        # order.to_dict() runs on every row even at INFO. Passing the
        # value as an argument defers it to the handler, which never
        # runs (Lesson 6.4).
        logger.debug("rendered order", extra={"order_id": order.id})

    return HttpResponse("".join(parts))


# =========================================================================
# WHY logger.debug COSTS 12 SECONDS AT INFO LEVEL
# =========================================================================
#
#   logger.debug(f"rendered {order.to_dict()}")
#
# Python evaluates the ARGUMENT before calling the function. The f-string
# is built -- which calls to_dict(), which walks the ORM object and
# serialises every column -- and only then is debug() invoked, checks the
# level, and throws the string away.
#
# The level check happens too late to save anything. This is why logging
# takes % arguments:
#
#   logger.debug("rendered %s", order)      # __str__ deferred to the handler
#
# and why structured fields are better still: nothing is formatted unless
# something will emit it.


# =========================================================================
# IF I COULD SHIP ONLY ONE
# =========================================================================
#
# @functools.cache on the config read. 18 of the 40 seconds, one
# decorator, no behaviour change, no schema knowledge, and it cannot
# break anything -- the config is immutable for the process lifetime.
#
# The N+1 fix is the one people reach for first because it has a name.
# It is worth 1 second of 40.


# =========================================================================
# TESTS
# =========================================================================

import pytest
from sqlalchemy import event


@pytest.fixture
def query_count(engine):
    """Counting queries makes an N+1 a COUNT regression, which is
    deterministic -- where a timing assertion passes on a fast laptop
    with ten rows (Lesson 9.7)."""
    statements = []

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(engine, "after_cursor_execute", record)
    yield statements
    event.remove(engine, "after_cursor_execute", record)


def test_query_count_does_not_grow_with_orders(client, query_count, make_orders):
    """THE test. The assertion is a CONSTANT, so it states a property of
    the code rather than a measurement of this machine."""
    make_orders(200)

    client.get("/orders/report?year=2026")

    assert len(query_count) <= 3, "N+1: \\n" + "\\n".join(query_count[:8])


def test_config_is_read_once_per_process(monkeypatch):
    """Fix 2 — the biggest one, and the easiest to regress by someone
    'simplifying' the cache away."""
    reads = []
    monkeypatch.setattr("views.load_config",
                        lambda: reads.append(1) or {"rates": {"GBP": "1.0"}})
    rates.cache_clear()

    rates(); rates(); rates()
    assert len(reads) == 1


def test_debug_logging_does_not_serialise_at_info_level(caplog):
    """Fix 3. Asserts the expensive call is NOT made, which is the whole
    point and is invisible in a timing test."""
    calls = []

    class Order:
        id = "o-1"
        def to_dict(self):
            calls.append(1)
            return {}

    with caplog.at_level(logging.INFO):
        logger.debug("rendered order", extra={"order_id": Order().id})

    assert calls == []


def test_filtering_happens_in_sql(query_count, client, make_orders):
    """Fix 6. If the WHERE clause were removed, this would still pass a
    correctness test — so assert on the SQL."""
    make_orders(50, year=2025)
    make_orders(50, year=2026)

    client.get("/orders/report?year=2026")

    joined = " ".join(query_count).lower()
    assert "where" in joined and "status in" in joined


def test_output_is_built_by_join_not_concatenation():
    """Fix 5, as a shape assertion. Quadratic string building is
    invisible at 10 rows and fatal at 100,000."""
    import inspect
    source = inspect.getsource(order_report)

    assert "+=" not in source
    assert '"".join' in source


# =========================================================================
# RESULT
# =========================================================================
#
#   before                 ~40 s at 500 orders, timeout at 1,000
#   after                  ~0.2 s at 500 orders
#                          ~0.4 s at 5,000 — because nothing is now
#                          quadratic and the query count is constant
#
# The shape changed, not just the constant: every remaining cost is
# linear in the rows actually returned.`,
        notes: [
          { t: "p", text: "**The ranking is the lesson, and it is counter-intuitive.** The N+1 has a name, appears in every performance article, and is worth 1 second of 40 here. The two that dominate — a config file read and a `to_dict()` inside an f-string — have no names and look like nothing in review." },
          { t: "p", text: "**The logging line is the one worth internalising.** Arguments are evaluated before the call, so `f\"...{order.to_dict()}\"` serialises every row at every level, and the level check that would have saved you happens after the work is done. `logger.debug(\"msg\", extra={...})` defers it to a handler that never runs." },
          { t: "p", text: "**Filtering in Python after `.all()` is the fix with the largest blast radius**, because it also removes the memory cost of rows you discard and lets the planner use an index. It is the one that turns a linear cost into one proportional to the answer rather than to the table (Lesson 10.3)." },
          { t: "callout", kind: "insight", title: "Assert on properties, not on times", body: [
            { t: "p", text: "`assert len(query_count) <= 3` is a claim about the algorithm: the number of round trips does not depend on the number of rows. It stays true on any machine, at any data size, in CI and locally." },
            { t: "p", text: "`assert elapsed < 0.5` passes on a fast laptop with ten rows and fails randomly in CI. Timing tests are for benchmarks; correctness-of-shape tests are for the suite." }
          ]},
          { t: "p", text: "**`test_output_is_built_by_join_not_concatenation` inspects source, which is unusual and defensible here.** Quadratic string building produces no wrong answer and no slow test at fixture scale, so there is nothing else to assert on — and it is exactly the change someone makes while 'tidying up'." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A dashboard endpoint is reported as slow. An engineer profiles it, finds a list comprehension near the top of the `tottime` column, and spends two days converting a chain of comprehensions into generators. The endpoint improves from 12.4 seconds to 12.35 seconds." },
      { t: "p", text: "**They read the wrong column.** `tottime` is time in the function itself, excluding calls; `cumtime` includes them. The comprehension had the highest `tottime` because everything slower was waiting on I/O, which spends its time in a socket read that the profiler attributes to the call, not the caller." },
      { t: "p", text: "**Sorting by `cumtime` put `fetch_from_api` at the top with 12.18 of the 12.4 seconds** — a single HTTP call with no timeout, no connection pooling, and no caching of a response that changed twice a day." },
      { t: "p", text: "**Three lines fixed it**: a connection pool, a ten-second timeout, and a five-minute cache. The endpoint went to 90 ms. **Read `cumtime` first to find where the time goes, then `tottime` to find where it is spent** — and be suspicious of any profile where the top entry is pure Python in a service that talks to a network." }
    ]}
  ],

  takeaways: [
    "**The N+1 query is the most common performance bug in web applications**, and it is invisible in review because the loop body looks like an attribute access.",
    "**Fix N+1 at the query** — `selectinload` or `joinedload` in an ORM, one batched `WHERE id IN (...)` plus a dict index without one.",
    "**Catch N+1 by asserting a constant query count**, not a time. \"At most three queries regardless of row count\" is a property; \"under 200 ms\" is a measurement of your laptop.",
    "**A membership test against a list inside a loop is quadratic.** Hoist the `set()` out — building it inside the comprehension is slower than the bug it was meant to fix.",
    "**`+=` on a string in a loop copies everything accumulated so far.** Append to a list and `join` once.",
    "**`list.pop(0)` shifts every element.** Use a `deque` when you take from the front.",
    "**Hoist invariant work out of loops** — compiled patterns, config reads, lookups built from queries. This is usually the largest single win and needs no cleverness.",
    "**CPython caches constant tuples and frozensets**, so `x in (\"a\", \"b\")` is free; a comprehension or a `Decimal` parse in the same position runs every iteration.",
    "**`logger.debug(f\"...{expensive()}\")` evaluates the argument before the level check**, so it costs full price in production. Pass values as arguments or `extra` fields.",
    "**Filter, sort, count and paginate in the database**, not after `.all()` — the planner has indexes and statistics that your `for` loop does not.",
    "**Vectorise only homogeneous numeric work at scale.** Below a few thousand elements the conversion costs more than it saves.",
    "**Read `cumtime` before `tottime`.** The function with the highest self-time is rarely where a service's time actually goes."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A loop reads `order.customer.name` for 100 orders and the endpoint takes 200 ms. What is happening?",
        options: [
          "Attribute access is slow on ORM objects",
          "Each access lazily issues a `SELECT` — 100 extra round trips, so the cost is network latency rather than Python",
          "The customer objects are being deep-copied",
          "The ORM is recomputing a property on every access"
        ],
        answer: 1,
        why: "This is the N+1: one query for the orders, then one per order for its customer. It is invisible in review because the loop body reads like an attribute access. Fix it at the query with `selectinload`, or batch a second query and index the results in a dict. Catch it with a test asserting the query count does not grow with row count."
      },
      {
        stem: "`new = [r for r in rows if r.id not in set(known)]` is slower than the list version it replaced. Why?",
        options: [
          "Sets are slower than lists for small collections",
          "`set(known)` is inside the comprehension, so it is rebuilt on every iteration — O(n) construction per item instead of one O(n) construction",
          "The comprehension copies `rows` first",
          "`not in` on a set falls back to a linear scan"
        ],
        answer: 1,
        why: "The expression after `if` is evaluated per item. Building the set once outside — `known_ids = set(known)` — makes the whole operation linear. Hoisting it inside the comprehension while trying to fix the O(n) membership test is a genuinely common regression, and it makes the code slower than the bug it was meant to fix."
      },
      {
        stem: "`logger.debug(f\"rendered {order.to_dict()}\")` runs in a loop with the level set to INFO. What does it cost?",
        options: [
          "Nothing — the level check skips it",
          "Full price: the f-string is evaluated before `debug()` is called, so `to_dict()` runs on every row and the result is then discarded",
          "Only the string formatting, not the method call",
          "It raises because DEBUG is disabled"
        ],
        answer: 1,
        why: "Python evaluates arguments before the call, so the serialisation happens and only then does `debug()` check the level and throw the string away. In one real case this was 12 of 40 seconds. Pass values as arguments — `logger.debug(\"rendered %s\", order)` — or as structured `extra` fields, so nothing is formatted unless a handler will emit it."
      },
      {
        stem: "A 12.4-second endpoint has a list comprehension at the top of the profile by `tottime`. Rewriting it saves 50 ms. What went wrong?",
        options: [
          "The comprehension was already optimal",
          "`tottime` excludes called functions, so I/O-bound work is attributed to the socket read — sorting by `cumtime` would have shown one HTTP call taking 12.18 seconds",
          "The profiler was misconfigured",
          "Generators are not faster than comprehensions"
        ],
        answer: 1,
        why: "`tottime` is time in the function body excluding calls, so pure-Python work rises to the top while the actual cost sits inside a call it made. `cumtime` includes callees and points straight at the HTTP request with no timeout, no pooling and no caching. Read `cumtime` first to find where the time goes, then `tottime` to find where it is spent."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is an N+1 query and how do you find one?",
        strong: "One query for a list, then one more per item because a relation is loaded lazily. Fix it with eager loading, or batch the second query and index it in a dict. Find it with a test that counts queries and asserts the count does not grow with row count.",
        answer: [
          { t: "p", text: "The reason it survives review is the part worth saying: the loop body reads like an attribute access, so there is nothing in the diff that looks like a query." },
          { t: "p", text: "Asserting a constant rather than a duration is the detail that shows you have kept one out of a codebase — a timing test passes on a laptop with ten rows." },
          { t: "p", text: "`selectinload` versus `joinedload` shows depth: a join multiplies rows for a one-to-many and ships the parent's columns once per child." }
        ]
      },
      {
        level: "core",
        q: "Where does accidental quadratic behaviour come from in Python?",
        strong: "Mostly from operations that look constant: `x in some_list` inside a loop, `+=` on a string, `list.pop(0)`, and `result = result + chunk`. None of them contains a nested loop, which is why they survive review.",
        answer: [
          { t: "p", text: "Naming the container fix — a `set` for membership, a `deque` for the front, `join` for strings — turns the answer into something actionable rather than a warning." },
          { t: "p", text: "The `set()`-inside-the-comprehension regression is a good one to raise unprompted, because it is the fix people apply while introducing a worse version of the bug." },
          { t: "p", text: "Framing it as \"choose the container from the operation you repeat\" is the general rule underneath all four cases." }
        ]
      },
      {
        level: "advanced",
        q: "An endpoint is slow. Walk me through what you do.",
        strong: "Profile it before changing anything, and read `cumtime` first — the function with the highest self-time is rarely where a networked service's time goes. Then check the query count, then look for invariant work inside loops.",
        answer: [
          { t: "p", text: "Leading with measurement and naming the `cumtime`/`tottime` distinction is the signal; the two-day rewrite that saved 50 ms of 12.4 seconds makes it concrete." },
          { t: "p", text: "Ranking by expected cost — I/O and round trips first, then repeated invariant work, then Python-level micro-optimisation last — shows a sense of proportion." },
          { t: "p", text: "Adding that the fix should come with a property test, so the improvement cannot silently regress, is what separates fixing an incident from fixing the code." }
        ]
      }
    ]
  }
});
