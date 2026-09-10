/* ============================================================================
   LESSON 13.3 — Connecting Python to PostgreSQL
   ========================================================================= */
EC.receiveLesson({
  id: "13.3",

  lede: "Every Python database library — psycopg, SQLAlchemy, Django's ORM — sits on the same small interface: connect, get a cursor, execute, fetch, commit. **Learn that layer and the rest is convenience.** It is also where SQL injection lives, and the fix is one character wide.",

  objectives: [
    "Use the DB-API correctly: cursors, fetching, and closing",
    "Parameterise every query, and know why string formatting is never safe",
    "Explain what `%s` does that an f-string does not",
    "Choose row factories, and fetch without exhausting memory",
    "Handle connection failures and transactions with context managers"
  ],

  prerequisites: ["13.1", "13.2"],

  blocks: [

    { t: "h2", n: "01", text: "The DB-API in one page", id: "dbapi" },


    { t: "viz",
      title: "Why a connection pool exists",
      caption: "Opening a PostgreSQL connection means a TCP handshake, TLS, authentication and a new server-side process. A pool pays that once and hands out the result.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="The cost of opening a database connection versus borrowing one from a pool">
  <text x="30" y="34" class="s-label" style="fill:var(--crit)">connect per request</text>
  <g style="stroke-width:2">
    <rect x="30"  y="48" width="110" height="36" rx="5" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
    <rect x="150" y="48" width="110" height="36" rx="5" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
    <rect x="270" y="48" width="110" height="36" rx="5" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
    <rect x="390" y="48" width="130" height="36" rx="5" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
    <rect x="530" y="48" width="110" height="36" rx="5" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
  </g>
  <text x="46"  y="71" class="s-sub" style="fill:var(--ink-3)">TCP</text>
  <text x="166" y="71" class="s-sub" style="fill:var(--ink-3)">TLS</text>
  <text x="286" y="71" class="s-sub" style="fill:var(--ink-3)">auth</text>
  <text x="406" y="71" class="s-sub" style="fill:var(--ink-3)">backend fork</text>
  <text x="546" y="71" class="s-sub" style="fill:var(--good)">query</text>
  <text x="660" y="71" class="s-sub" style="fill:var(--crit)">tens of ms, every time</text>

  <text x="30" y="136" class="s-label" style="fill:var(--good)">pooled</text>
  <rect x="30" y="150" width="110" height="36" rx="5" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="2"/>
  <text x="44" y="173" class="s-sub" style="fill:var(--good)">borrow</text>
  <rect x="150" y="150" width="110" height="36" rx="5" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="2"/>
  <text x="166" y="173" class="s-sub" style="fill:var(--good)">query</text>
  <text x="290" y="173" class="s-sub" style="fill:var(--ink-3)">microseconds — the setup already happened</text>

  <text x="30" y="224" class="s-sub" style="fill:var(--crit)">Size the pool to the database, not the app: every worker times its pool size must stay under max_connections.</text>
</svg>`
    },
    { t: "code", lang: "python", title: "psycopg 3, the whole interface", code: `
import psycopg

# The connection is a context manager: exiting COMMITS on success and
# ROLLS BACK on an exception. That is the transaction boundary, and it
# is the reason to use "with" rather than manual close().
with psycopg.connect(settings.database_url) as conn:

    # The cursor is where the results live. Also a context manager,
    # so its server-side resources are released deterministically.
    with conn.cursor() as cur:

        # %s is NOT string formatting. psycopg sees the placeholder,
        # sends the SQL and the values SEPARATELY, and the database
        # never parses the value as SQL. This is the whole defence.
        cur.execute(
            "SELECT id, total FROM orders WHERE account_id = %s AND total > %s",
            (account_id, minimum),                 # always a TUPLE
        )

        one   = cur.fetchone()      # a single row, or None
        some  = cur.fetchmany(100)  # a list, at most 100
        rest  = cur.fetchall()      # everything remaining -- careful

        # Iterating the cursor is the memory-safe default.
        cur.execute("SELECT id FROM orders")
        for row in cur:
            handle(row)

        # Writes report how many rows they touched.
        cur.execute("UPDATE orders SET status = %s WHERE id = %s",
                    ("paid", order_id))
        assert cur.rowcount == 1        # 0 means it did not exist
`,
      hl: [6, 15, 17, 30],
      caption: "**`cur.rowcount` after an `UPDATE` is the check people skip.** Zero rows updated is not an error to the database — it is the normal result of a `WHERE` matching nothing, and silently doing nothing is the bug."
    },

    { t: "callout", kind: "trap", title: "The tuple that is not a tuple", body: [
      { t: "code", lang: "python", title: "a comma with consequences", numbered: false, code: `
# WRONG. (account_id) is just account_id in brackets -- not a tuple.
cur.execute("SELECT * FROM orders WHERE account_id = %s", (account_id))
# psycopg tries to iterate a string: "TypeError: not all arguments
# converted", or worse, one parameter per character.

cur.execute("...", (account_id,))    # the trailing comma makes it a tuple
cur.execute("...", [account_id])     # a list works, and is harder to
                                     # get wrong -- prefer it

# Named parameters are clearer past two or three values, and they are
# order-independent, which removes a whole class of mistake.
cur.execute(
    """SELECT * FROM orders
       WHERE account_id = %(account)s AND created_at >= %(since)s""",
    {"account": account_id, "since": since},
)`},
      { t: "p", text: "**Use a list or a dict.** The one-element tuple is a genuine Python papercut, and it produces an error message that points nowhere near the missing comma." }
    ]},

    { t: "h2", n: "02", text: "SQL injection", id: "injection" },

    { t: "ladder",
      title: "Filtering orders by a status the user supplied",
      rungs: [
        { level: "bad", label: "String formatting",
          why: "The user's input becomes part of the SQL text. A status of `x' OR '1'='1` returns every order in the system; `x'; DROP TABLE orders; --` does what it says. Every variant of this — f-strings, `%`, `.format()`, `+` — is the same vulnerability.",
          code: `cur.execute(f"SELECT * FROM orders WHERE status = '{status}'")

# status = "x' OR '1'='1"
#   -> SELECT * FROM orders WHERE status = 'x' OR '1'='1'
#      every row, for every account` },
        { level: "ok", label: "Escape it yourself",
          why: "It handles the quote you thought of. It does not handle backslash escaping, multi-byte encodings, numeric contexts where no quotes are involved, or the next place someone forgets to call it. Hand-rolled escaping has failed publicly many times.",
          code: `safe = status.replace("'", "''")
cur.execute(f"SELECT * FROM orders WHERE status = '{safe}'")
# Better. Still wrong, and now it LOOKS careful, which is worse.` },
        { level: "best", label: "Parameterise",
          why: "The SQL text and the values travel separately. The database parses the query once, then binds the value as data — there is no parse step in which the value could become syntax, so no escaping is required or possible to get wrong.",
          code: `cur.execute("SELECT * FROM orders WHERE status = %s", [status])

# status = "x' OR '1'='1"
#   -> the database looks for a status literally equal to
#      "x' OR '1'='1", finds none, returns zero rows. Correct.

# Multiple values: IN with a list, not a formatted join.
cur.execute("SELECT * FROM orders WHERE status = ANY(%s)",
            [["pending", "paid"]])`,
          note: "**Parameterisation is not escaping done well — it is a different mechanism.** The value never passes through the SQL parser at all, which is why it cannot be defeated by an encoding trick." }
      ]
    },

    { t: "callout", kind: "insight", title: "What you cannot parameterise", body: [
      { t: "p", text: "Placeholders bind **values**. They cannot bind a table name, a column name, or a keyword like `ASC` — those are syntax, and the query must be parsed with them in place." },
      { t: "code", lang: "python", title: "the two correct approaches", numbered: false, code: `
from psycopg import sql

# 1. An ALLOWLIST. The right answer almost always, because it also
#    stops a caller sorting by an unindexed or internal column.
SORTABLE = {"created_at": "created_at", "total": "total"}
column = SORTABLE[user_input]                 # KeyError on anything else

# 2. psycopg's composable SQL, for genuinely dynamic identifiers.
#    Identifier() quotes correctly for the server -- it is NOT a
#    string escape, it builds a parsed identifier node.
query = sql.SQL("SELECT * FROM {table} ORDER BY {col} {dir}").format(
    table=sql.Identifier("orders"),
    col=sql.Identifier(column),
    dir=sql.SQL("DESC" if descending else "ASC"),   # from a fixed set
)
cur.execute(query, params)`},
      { t: "p", text: "**`getattr(Model, user_input)` in an ORM is the same hole wearing a different hat.** It lets the caller name any column, and an ORM will happily order by one you never meant to expose." }
    ]},

    { t: "h2", n: "03", text: "Getting rows back usefully", id: "rows" },

    { t: "code", lang: "python", title: "row factories", code: `
from psycopg.rows import dict_row, class_row, namedtuple_row

# Default: tuples. Fast and positional -- and a query change silently
# shifts every index, so row[2] becomes the wrong column.
with conn.cursor() as cur:
    cur.execute("SELECT id, total, status FROM orders")
    row = cur.fetchone()          # ('o-1', Decimal('99.99'), 'paid')

# dict_row: named access, at the cost of a dict per row.
with conn.cursor(row_factory=dict_row) as cur:
    cur.execute("SELECT id, total, status FROM orders")
    row = cur.fetchone()          # {'id': 'o-1', 'total': ..., ...}
    row["total"]

# class_row: straight into a dataclass or Pydantic model. Typed,
# validated at the boundary, and the column names must match the
# fields -- which turns a renamed column into an immediate error
# rather than a KeyError somewhere downstream.
@dataclass
class Order:
    id: str
    total: Decimal
    status: str

with conn.cursor(row_factory=class_row(Order)) as cur:
    cur.execute("SELECT id, total, status FROM orders")
    order = cur.fetchone()        # Order(id='o-1', ...)
    order.total
`,
      hl: [10, 25],
      caption: "**`class_row` is the one to reach for in application code.** It gives type checking, autocompletion and an early failure when the query and the model drift apart."
    },

    { t: "callout", kind: "trap", title: "fetchall() on a table you did not size", body: [
      { t: "code", lang: "python", title: "the shape of an out-of-memory error", numbered: false, code: `
# Fine in development against 1,000 rows. Fatal against 50 million.
cur.execute("SELECT * FROM events")
rows = cur.fetchall()             # every row, in Python objects, at once

# Iterating the cursor is better, but a CLIENT-SIDE cursor still
# buffers the entire result set in the driver first -- the memory is
# spent before the loop begins.
for row in cur: ...               # still buffered by default

# A SERVER-SIDE (named) cursor streams. The server holds the result
# and sends batches, so client memory stays flat regardless of size.
with conn.cursor(name="stream") as cur:       # naming it is the switch
    cur.itersize = 2000                       # rows fetched per batch
    cur.execute("SELECT * FROM events")
    for row in cur:                           # constant memory
        handle(row)`},
      { t: "p", text: "**A named cursor holds a transaction open for its lifetime**, which blocks vacuum and can hold locks. That is fine for a batch job and wrong for a web request — in a request, paginate instead." }
    ]},

    { t: "h2", n: "04", text: "Writing efficiently", id: "writing" },

    { t: "table",
      head: ["Approach", "10,000 rows", "Use when"],
      rows: [
        ["`execute` in a loop", "~40s", "**Never** — 10,000 round trips"],
        ["`executemany`", "~2s", "Rows with different shapes, or `ON CONFLICT`"],
        ["`execute` with `UNNEST`", "~0.4s", "One statement, moderate volume"],
        ["`COPY`", "~0.15s", "**Bulk loading**, no conflict handling"]
      ],
      caption: "**The loop is not slightly slower — it is two orders of magnitude slower**, and almost all of it is network latency rather than database work. Each round trip costs a millisecond you pay ten thousand times."
    },

    { t: "code", lang: "python", title: "the three that matter", code: `
# executemany -- one statement, many parameter sets. psycopg 3 pipelines
# these, so it is far faster than the equivalent loop.
cur.executemany(
    "INSERT INTO events (id, type, payload) VALUES (%s, %s, %s)",
    [(e.id, e.type, Json(e.payload)) for e in events],
)

# UNNEST -- one statement, arrays as parameters. A single round trip,
# and it composes with ON CONFLICT.
cur.execute(
    """
    INSERT INTO events (id, type, payload)
    SELECT * FROM unnest(%s::uuid[], %s::text[], %s::jsonb[])
    ON CONFLICT (id) DO NOTHING
    """,
    ([e.id for e in events],
     [e.type for e in events],
     [Json(e.payload) for e in events]),
)

# COPY -- the fastest path into PostgreSQL. No conflict handling and
# no per-row feedback, so it is for loading, not for merging.
with cur.copy("COPY events (id, type, payload) FROM STDIN") as copy:
    for e in events:
        copy.write_row((e.id, e.type, Json(e.payload)))
`,
      hl: [10, 14, 23],
      caption: "**`ON CONFLICT DO NOTHING` makes a bulk insert idempotent**, which is what lets a failed batch job be re-run without deduplicating by hand."
    },

    { t: "h2", n: "05", text: "Failures", id: "failures" },

    { t: "code", lang: "python", title: "the errors worth catching separately", code: `
from psycopg import errors

try:
    cur.execute("INSERT INTO users (email) VALUES (%s)", [email])
    conn.commit()

except errors.UniqueViolation:
    # Expected: someone registered with this address. A 409, not a 500.
    conn.rollback()
    raise HTTPException(409, "That email is already registered")

except errors.ForeignKeyViolation:
    # A referenced row does not exist -- usually a 400, a bad id.
    conn.rollback()
    raise HTTPException(400, "Unknown account")

except errors.CheckViolation as exc:
    # A schema invariant was broken, which means APPLICATION validation
    # let something through. Log it as a bug; return 400 to the caller.
    conn.rollback()
    logger.error("check_violation", extra={"constraint": exc.diag.constraint_name})
    raise HTTPException(400, "Invalid data")

except errors.SerializationFailure:
    # Not a bug. Two transactions conflicted under SERIALIZABLE, and
    # the correct response is to RETRY -- see Lesson 13.4.
    conn.rollback()
    raise

except errors.OperationalError:
    # Connection lost, server restarted, network partition. Retriable,
    # but the transaction's outcome may be UNKNOWN -- so retry only
    # operations that are idempotent.
    conn.rollback()
    raise
`,
      hl: [7, 17, 24, 30],
      caption: "**A bare `except Exception` on a database call turns four different situations into one 500.** A unique violation is a 409 the user can act on; a serialisation failure is a retry; an operational error is a health signal."
    },

    { t: "callout", kind: "insight", title: "A failed statement poisons the transaction", body: [
      { t: "code", lang: "python", title: "the confusing follow-on error", numbered: false, code: `
try:
    cur.execute("INSERT INTO users (email) VALUES (%s)", [email])
except errors.UniqueViolation:
    pass                          # "handled"

cur.execute("SELECT count(*) FROM users")
# InFailedSqlTransaction: current transaction is aborted, commands
# ignored until end of transaction block

# In PostgreSQL, ANY error aborts the whole transaction. Nothing else
# runs until you rollback -- so the confusing error is not the second
# statement's fault.

# A SAVEPOINT scopes the failure, so only the inner work is undone.
with conn.transaction():                    # outer
    for email in emails:
        try:
            with conn.transaction():        # a SAVEPOINT
                cur.execute("INSERT INTO users (email) VALUES (%s)", [email])
        except errors.UniqueViolation:
            continue                        # skip this one, keep the rest`},
      { t: "p", text: "**This surprises people coming from MySQL**, where a failed statement leaves the transaction usable. In PostgreSQL the first error ends it, and every subsequent statement returns the same unhelpful message until you roll back." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a data-access layer",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "This module is in production. It has an injection vulnerability, leaks connections, and takes forty seconds to import ten thousand rows." },
        { t: "code", lang: "python", numbered: false, title: "app/db.py", code: `
conn = psycopg.connect(os.environ["DATABASE_URL"])

def search_orders(status, sort_by, account_id):
    cur = conn.cursor()
    cur.execute(
        f"""SELECT * FROM orders
            WHERE status = '{status}' AND account_id = '{account_id}'
            ORDER BY {sort_by}"""
    )
    return cur.fetchall()

def import_orders(rows):
    cur = conn.cursor()
    for row in rows:
        cur.execute(
            f"INSERT INTO orders VALUES ('{row['id']}', {row['total']})"
        )
    conn.commit()

def get_report():
    cur = conn.cursor()
    cur.execute("SELECT * FROM order_events")     # 40M rows
    return [process(r) for r in cur.fetchall()]`},
        { t: "p", text: "There are at least nine problems. One of them means the whole module stops working after any single error." }
      ],
      requirements: [
        "List all nine, ranked.",
        "Explain why `sort_by` cannot be fixed with a placeholder.",
        "Rewrite the module.",
        "Make the import at least fifty times faster.",
        "Bound the memory of `get_report`.",
        "Explain what happens to every subsequent call after one query raises."
      ],
      hint: "The module-level connection is the one that breaks everything. Ask what state it is in after an error, and what happens when two threads use it at once.",
      solution: {
        lang: "python",
        title: "app/db.py",
        code: `# =========================================================================
# THE NINE
# =========================================================================
#
# CRITICAL
#   1. SQL INJECTION in status and account_id. f-string interpolation
#      of user input. status = "x' OR '1'='1" returns every order for
#      every account -- a cross-tenant data leak, not just a leak.
#
#   2. SQL INJECTION in sort_by, and it is the worse one. ORDER BY is
#      not a value, so it cannot be parameterised, and a payload here
#      can carry a subquery:
#
#        sort_by = "(SELECT CASE WHEN (SELECT substr(password_hash,1,1)
#                    FROM users LIMIT 1)='a' THEN total ELSE id END)"
#
#      That is a blind extraction oracle: the row order reveals one
#      character at a time.
#
#   3. INJECTION in import_orders too, via row['id'] and row['total'].
#      Imported data is not trusted input just because it arrived in a
#      file.
#
# HIGH
#   4. A MODULE-LEVEL CONNECTION. Three separate failures:
#        a) after ANY error, the transaction is aborted and EVERY
#           subsequent call raises InFailedSqlTransaction until
#           something rolls back -- which nothing here does. One bad
#           query breaks the module until restart.
#        b) a connection is not thread-safe. Under a threaded server,
#           two requests interleave on one connection and get each
#           other's results.
#        c) no reconnection. A database restart or an idle timeout
#           leaves a dead connection object forever.
#
#   5. NO TRANSACTION HANDLING. No rollback anywhere, and commit only
#      in import_orders. search_orders leaves an idle-in-transaction
#      connection open, which holds a snapshot and blocks vacuum.
#
#   6. CURSORS NEVER CLOSED. Server-side resources leak for the life
#      of the connection.
#
# MEDIUM
#   7. A LOOP OF INSERTS. 10,000 round trips at ~4ms each is the forty
#      seconds. The database is idle for almost all of it.
#
#   8. fetchall() ON 40 MILLION ROWS, then a list comprehension over
#      the result. Two full copies in memory; the process is killed by
#      the OOM reaper long before it finishes.
#
#   9. SELECT * -- the column set is whatever the schema happens to
#      contain today, so tuple indexing silently shifts when a column
#      is added, and every unused column crosses the network.
#
# Also: no LIMIT on a user-facing search, so one account with a
# million orders returns a million rows.
#
#
# =========================================================================
# WHY sort_by CANNOT BE A PLACEHOLDER
# =========================================================================
#
# A placeholder binds a VALUE. The database parses the SQL first and
# then binds values into the already-parsed plan -- so a value can
# never become syntax. That is exactly why it is safe.
#
# ORDER BY needs an IDENTIFIER, which is syntax: the query cannot be
# parsed until it is known. Passing it as a parameter yields
# "ORDER BY $1", which sorts every row by a constant -- a no-op, not
# an error, so it fails silently.
#
# The two correct options are an allowlist (preferred: it also stops a
# caller sorting by an unindexed or internal column) and psycopg's
# sql.Identifier, which builds a properly-quoted identifier node
# rather than escaping a string.


# =========================================================================
# THE REWRITE
# =========================================================================

from contextlib import contextmanager
from psycopg import sql
from psycopg.rows import class_row
from psycopg_pool import ConnectionPool

# A POOL, not a connection. Thread-safe, reconnects on failure, and
# bounds how many connections this process can hold -- which is what
# stops one service exhausting the database's max_connections.
pool = ConnectionPool(
    settings.database_url.get_secret_value(),
    min_size=2,
    max_size=10,
    max_idle=300,
    # Checked before handing a connection out, so a dead one is
    # replaced rather than returned to a caller.
    check=ConnectionPool.check_connection,
)


@contextmanager
def transaction():
    """One connection, one transaction, always returned to the pool.

    Commits on success, rolls back on any exception, and the
    connection goes back to the pool either way -- so an error can no
    longer poison later calls, which was finding 4a.
    """
    with pool.connection() as conn:      # returns to the pool on exit
        with conn.transaction():         # commit / rollback
            yield conn


# ---- the allowlist for finding 2 ------------------------------------
# Only these columns can be sorted on. Anything else is a KeyError,
# which is a 400, not a query.
SORTABLE = {
    "created_at": "created_at",
    "total":      "total",
    "status":     "status",
}


@dataclass
class OrderRow:
    id: UUID
    account_id: UUID
    status: str
    total: Decimal
    created_at: datetime


def search_orders(
    account_id: UUID,
    status: str | None = None,
    sort_by: str = "created_at",
    descending: bool = True,
    limit: int = 100,
) -> list[OrderRow]:
    try:
        column = SORTABLE[sort_by]
    except KeyError:
        raise ValueError(f"Cannot sort by {sort_by!r}")

    # Identifier() for the column, SQL() for the direction chosen from
    # a fixed pair -- never from the caller's string.
    query = sql.SQL(
        """
        SELECT id, account_id, status, total, created_at
        FROM   orders
        WHERE  account_id = %(account_id)s
          AND  (%(status)s IS NULL OR status = %(status)s)
        ORDER BY {column} {direction}
        LIMIT  %(limit)s
        """
    ).format(
        column=sql.Identifier(column),
        direction=sql.SQL("DESC" if descending else "ASC"),
    )

    with transaction() as conn:
        with conn.cursor(row_factory=class_row(OrderRow)) as cur:
            # Values parameterised. account_id and status never reach
            # the parser.
            cur.execute(query, {
                "account_id": account_id,
                "status": status,
                "limit": min(limit, 1000),      # a hard ceiling
            })
            return cur.fetchall()               # bounded by LIMIT


def import_orders(rows: Iterable[dict]) -> int:
    """One round trip instead of ten thousand.

    UNNEST passes arrays as parameters, so the whole batch is one
    statement -- and ON CONFLICT makes a re-run after a failure safe.
    ~0.4s against the original ~40s.
    """
    rows = list(rows)
    if not rows:
        return 0

    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO orders (id, account_id, status, total, created_at)
                SELECT * FROM unnest(
                    %(ids)s::uuid[], %(accounts)s::uuid[],
                    %(statuses)s::text[], %(totals)s::numeric[],
                    %(created)s::timestamptz[]
                )
                ON CONFLICT (id) DO NOTHING
                """,
                {
                    "ids":      [r["id"] for r in rows],
                    "accounts": [r["account_id"] for r in rows],
                    "statuses": [r["status"] for r in rows],
                    # Decimal, never float -- see Lesson 13.2.
                    "totals":   [Decimal(str(r["total"])) for r in rows],
                    "created":  [r["created_at"] for r in rows],
                },
            )
            return cur.rowcount


def import_orders_bulk(path: Path) -> int:
    """For a genuinely large file, COPY is several times faster still.

    No conflict handling, so it is for loading into an empty or
    staging table rather than merging into a live one.
    """
    count = 0
    with transaction() as conn:
        with conn.cursor() as cur:
            with cur.copy(
                "COPY orders (id, account_id, status, total, created_at) "
                "FROM STDIN"
            ) as copy:
                for row in read_csv(path):       # streamed, not loaded
                    copy.write_row(row)
                    count += 1
    return count


def get_report() -> Iterator[Result]:
    """Constant memory over 40 million rows.

    A NAMED cursor is server-side: the result stays on the server and
    arrives in batches, so nothing here scales with the table. The
    generator means the caller does not accumulate them either.
    """
    with transaction() as conn:
        # Naming the cursor is what makes it server-side.
        with conn.cursor(name="report_stream",
                         row_factory=class_row(EventRow)) as cur:
            cur.itersize = 5000
            # Explicit columns, not SELECT *: adding a column to the
            # table must not change what this function receives.
            cur.execute(
                "SELECT id, order_id, type, created_at FROM order_events"
            )
            for row in cur:
                yield process(row)

# NOTE on the named cursor: it holds a transaction open for the whole
# scan, which blocks vacuum and can hold locks. Correct for a batch
# job, wrong inside a web request -- there, paginate with a cursor
# instead (Lesson 12.6).


# =========================================================================
# TESTS
# =========================================================================

@pytest.mark.parametrize("payload", [
    "x' OR '1'='1",
    "'; DROP TABLE orders; --",
    "x' UNION SELECT id, email, NULL, NULL, NULL FROM users --",
])
def test_injection_payloads_are_treated_as_data(db, payload):
    """Findings 1 and 3. Each payload must match nothing, not error."""
    seed_orders(account_id=ACCOUNT, count=5)

    assert search_orders(account_id=ACCOUNT, status=payload) == []
    assert count_rows("orders") == 5


def test_an_unknown_sort_column_is_rejected(db):
    """Finding 2. The allowlist, not a placeholder."""
    with pytest.raises(ValueError):
        search_orders(account_id=ACCOUNT, sort_by="(SELECT 1)")

    with pytest.raises(ValueError):
        search_orders(account_id=ACCOUNT, sort_by="password_hash")


def test_an_error_does_not_break_later_calls(db):
    """Finding 4a -- the one that took the module down until restart."""
    with pytest.raises(Exception):
        search_orders(account_id="not-a-uuid")

    # Must still work: the failed connection was rolled back and
    # returned to the pool, not left aborted.
    assert search_orders(account_id=ACCOUNT) is not None


def test_search_is_scoped_to_the_account(db):
    """The injection was a cross-tenant leak; pin the boundary."""
    seed_orders(account_id="account-a", count=3)
    seed_orders(account_id="account-b", count=3)

    rows = search_orders(account_id="account-a")

    assert {r.account_id for r in rows} == {"account-a"}


def test_import_is_idempotent(db):
    """ON CONFLICT DO NOTHING: a re-run after a partial failure is safe."""
    rows = make_rows(100)

    import_orders(rows)
    import_orders(rows)

    assert count_rows("orders") == 100


def test_the_report_streams(db):
    """Finding 8. Memory must not scale with row count."""
    seed_events(1_000_000)

    before = process_rss()
    for _ in itertools.islice(get_report(), 1000):
        pass
    after = process_rss()

    assert after - before < 50 * 1024 * 1024`,
        notes: [
          { t: "p", text: "**The module-level connection is the finding with the widest blast radius.** After any error PostgreSQL aborts the transaction, and since nothing rolls back, every later call raises `InFailedSqlTransaction` until the process restarts — one malformed UUID takes the module down." },
          { t: "p", text: "**It is also not thread-safe.** Under a threaded server two requests interleave on one connection, and the symptom is one request receiving another's result set — which reads as data corruption and is nearly impossible to reproduce." },
          { t: "callout", kind: "insight", title: "The ORDER BY injection is worse than the WHERE one", body: [
            { t: "p", text: "A payload in `ORDER BY` can carry a `CASE` expression over a subquery, so the row ordering encodes one bit of a password hash per request. It is a blind extraction oracle, and it produces no error and no unusual result shape." },
            { t: "p", text: "It cannot be fixed with a placeholder, because an identifier is syntax rather than a value — the query cannot be parsed without it. An allowlist is the answer, and it also prevents sorting by an unindexed or internal column." }
          ]},
          { t: "p", text: "**`UNNEST` turns 10,000 round trips into one.** Almost all of the original forty seconds was network latency, not database work — the server was idle waiting for the next statement most of the time." },
          { t: "p", text: "**A named cursor is the switch for server-side streaming.** An unnamed cursor buffers the entire result in the driver before the loop starts, so iterating it does not bound memory; naming it does." },
          { t: "p", text: "**`SELECT *` with tuple rows is a latent bug.** Adding a column to the table shifts every positional index, and the code keeps running with the wrong values — naming columns and using `class_row` turns that into an immediate, obvious failure." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A search endpoint let users sort results. The `WHERE` clause was properly parameterised — the team had been careful — but `ORDER BY` was interpolated, because a placeholder there did not work and nobody asked why." },
      { t: "p", text: "**A researcher extracted the entire users table through it.** A `CASE` expression in the sort key made the row order depend on one character of a password hash, one request at a time. Nothing in the logs looked unusual: valid queries, normal response sizes, ordinary status codes." },
      { t: "p", text: "**The fix was a seven-line dictionary.** Mapping three public sort names to three columns, with a `KeyError` for anything else." },
      { t: "p", text: "**The lesson is what the placeholder failure was telling them.** \"This does not work as a parameter\" means \"this is syntax, not data\" — which is precisely the signal that an allowlist is required, and precisely the moment it is easiest to interpolate instead." }
    ]}
  ],

  takeaways: [
    "**`%s` in psycopg is a placeholder, not string formatting.** The SQL and the values travel separately and the value never reaches the parser.",
    "**Parameterisation is not escaping done well — it is a different mechanism**, which is why no encoding trick defeats it.",
    "**Every f-string, `%`, `.format()` and `+` in a query is the same vulnerability.** There is no careful version.",
    "**Pass a list or a dict, never a one-element tuple** — the missing trailing comma produces an error that points nowhere near the cause.",
    "**Identifiers cannot be parameterised.** A placeholder that \"does not work\" is telling you the value is syntax — use an allowlist, or `sql.Identifier`.",
    "**`getattr(Model, user_input)` in an ORM is the same hole**, letting a caller order by any column including unindexed and internal ones.",
    "**Use `class_row` in application code**, so a renamed column fails immediately instead of shifting a tuple index silently.",
    "**Never `SELECT *` in code you maintain.** Adding a column changes what positional access returns.",
    "**An unnamed cursor buffers the whole result in the driver.** A named cursor streams server-side — that is the switch for constant memory.",
    "**A named cursor holds a transaction open**, so it belongs in a batch job, not a web request.",
    "**A loop of inserts is two orders of magnitude slower than one statement**, and almost all of the difference is network latency.",
    "**In PostgreSQL any error aborts the whole transaction.** Every later statement fails until you roll back — use a savepoint to scope a failure.",
    "**Use a connection pool, never a module-level connection.** A shared connection is not thread-safe, does not reconnect, and stays poisoned after one error."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `cur.execute(\"... WHERE status = %s\", [status])` safe when an f-string is not?",
        options: [
          "psycopg escapes the quotes in the value",
          "The SQL text and the value are sent separately — the database parses the query first, then binds the value as data, so it can never become syntax",
          "`%s` only accepts strings without quotes",
          "The driver validates the value against the column type"
        ],
        answer: 1,
        why: "This is why parameterisation cannot be defeated by an encoding trick or a quote style you did not anticipate: there is no parse step in which the value participates. Escaping tries to make dangerous input safe to parse; parameterisation removes the parse entirely."
      },
      {
        stem: "A placeholder in `ORDER BY %s` does not work. What does that tell you?",
        options: [
          "The driver has a bug — use `sql.Identifier` for everything",
          "An identifier is syntax, not a value, so the query cannot be parsed without it — which means an allowlist is required, not interpolation",
          "You need to cast the parameter to text",
          "`ORDER BY` requires a positional index instead"
        ],
        answer: 1,
        why: "The failure is the signal. Interpolating instead is the exact moment the vulnerability is introduced, and `ORDER BY` injection is worse than `WHERE` injection because a `CASE` over a subquery turns row order into a blind extraction oracle that produces no errors and no unusual response shape."
      },
      {
        stem: "A query raises a `UniqueViolation`, which you catch and ignore. The next query fails with `InFailedSqlTransaction`. Why?",
        options: [
          "The connection was closed by the error",
          "In PostgreSQL any error aborts the entire transaction, and nothing else runs until a rollback",
          "The cursor must be recreated after an error",
          "The exception handler swallowed the commit"
        ],
        answer: 1,
        why: "This differs from MySQL, where a failed statement leaves the transaction usable. A savepoint — `with conn.transaction()` nested inside an outer one — scopes the failure so only the inner work is undone and the loop can continue."
      },
      {
        stem: "Iterating a cursor over 40 million rows still exhausts memory. Why, and what fixes it?",
        options: [
          "The rows are too wide — select fewer columns",
          "An unnamed cursor buffers the whole result in the driver before iteration begins; naming the cursor makes it server-side and streams in batches",
          "`itersize` defaults to zero",
          "The generator must be consumed lazily by the caller"
        ],
        answer: 1,
        why: "The memory is spent before the loop's first iteration. A named cursor leaves the result on the server and fetches `itersize` rows at a time, so client memory is flat. It holds a transaction open for the scan, which makes it right for a batch job and wrong inside a web request."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you prevent SQL injection?",
        strong: "Parameterise every value — the SQL and the values are sent separately, so the value never reaches the parser. For identifiers, which cannot be parameterised, use an allowlist mapping public names to columns you control.",
        answer: [
          { t: "p", text: "Explaining the mechanism rather than saying \"use parameters\" is what distinguishes a real answer: it shows why escaping is a weaker approach rather than an equivalent one." },
          { t: "p", text: "The identifier case is where interviews go, because it is where real vulnerabilities remain after a team has parameterised everything else." },
          { t: "p", text: "Naming `getattr(Model, field)` in an ORM as the same hole shows you can spot it outside raw SQL." }
        ]
      },
      {
        level: "advanced",
        q: "You need to insert a million rows. How?",
        strong: "`COPY` if it is a straight load, `INSERT ... SELECT FROM unnest(...)` if it needs `ON CONFLICT`. Never a loop — that is a million round trips, and the database is idle for most of them.",
        answer: [
          { t: "p", text: "Framing the loop's cost as network latency rather than database work is the insight; it explains why the gap is two orders of magnitude." },
          { t: "p", text: "Choosing between `COPY` and `UNNEST` on whether conflict handling is needed shows you have used both rather than heard of them." },
          { t: "p", text: "Mentioning `ON CONFLICT DO NOTHING` for idempotency connects it to re-running a failed batch, which is the operational reason it matters." }
        ]
      },
      {
        level: "advanced",
        q: "Why not keep one database connection open at module level?",
        strong: "It is not thread-safe, it never reconnects, and after any error the transaction is aborted so every later query fails until a rollback. A pool fixes all three and bounds how many connections the process holds.",
        answer: [
          { t: "p", text: "The aborted-transaction failure is the one worth leading with, because it is the least obvious and it takes the whole module down until a restart." },
          { t: "p", text: "The threading failure is worth describing concretely — one request receiving another's result set reads as data corruption and is very hard to reproduce." },
          { t: "p", text: "Noting that a pool also caps connections connects it to the database's `max_connections`, which is where this becomes a whole-system concern." }
        ]
      }
    ]
  }
});
