/* ============================================================================
   LESSON 7.1 — SQL from Python, Safely
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "**Most SQL is not typed into a console; it is a string inside a Python program, and how that string is built decides whether the program is safe.** A query assembled with an f-string from user input is the oldest vulnerability on the web and still the most common. This lesson reproduces the injection, shows the one mechanism that prevents it — parameters, sent separately from the SQL — and then covers the rest of the driver contract: transactions from Python, executemany and COPY for bulk, connection pools, timeouts and retries, and DuckDB as the bridge between SQL and DataFrames.",

  objectives: [
    "Reproduce SQL injection and explain why parameterised queries prevent it at the protocol level, not by escaping",
    "Handle the cases parameters cannot cover — identifiers and IN lists — without reintroducing the hole",
    "Control transactions from Python: explicit BEGIN/COMMIT, rollback on exception, and the driver's autocommit setting",
    "Use executemany and COPY for bulk, a connection pool for concurrency, timeouts and retries for resilience, and DuckDB to query DataFrames directly"
  ],

  prerequisites: ["6.1"],

  blocks: [

    { t: "h2", n: "01", text: "The injection, reproduced", id: "injection" },

    { t: "code", lang: "python", title: "Building the query from the input (executed against SQLite)",
      hl: [2, 5, 6, 7, 10, 11],
      code: `name = "Asha"
cur.execute(f"SELECT customer_id, name FROM customers WHERE name = '{name}'")      # [(1, 'Asha')]   -- works, which is the problem

name = "x' OR '1'='1"
cur.execute(f"SELECT customer_id, name FROM customers WHERE name = '{name}'")
# the SQL that ran:  SELECT customer_id, name FROM customers WHERE name = 'x' OR '1'='1'
# 8 rows: every customer. The input closed the quote and appended its own condition.

name = "x'; DELETE FROM events; --"
cur.execute(f"SELECT * FROM customers WHERE name = '{name}'")
# sqlite3 refuses: "You can only execute one statement at a time"  -- a property of this driver, not a defence:
# psycopg and mysql connectors run multi-statement strings, and a UNION SELECT needs no second statement anyway`,
      caption: "The vulnerability is not the quote character; it is that data was made part of the program. Escaping quotes is a patch on the symptom that fails on encodings, on numeric contexts, and on the next character nobody thought of."
    },

    { t: "code", lang: "python", title: "Parameters: the SQL and the values travel separately (executed)",
      hl: [1, 2, 5, 8],
      code: `name = "x' OR '1'='1"
cur.execute("SELECT customer_id, name FROM customers WHERE name = ?", (name,))     # []   -- no customer has that name
# the driver sends the SQL with a placeholder and the value as a value; the database never parses the value as SQL

# named parameters read better with several values
cur.execute("SELECT order_id FROM orders WHERE customer_id = :cid AND status = :st", {"cid": 1, "st": "paid"})   # [(100,), (102,), (108,)]

# placeholder style is per driver (DB-API paramstyle): sqlite3 "?" or ":name";  psycopg "%s" or "%(name)s";  duckdb "?" or "$name"
con.execute("SELECT name FROM customers WHERE customer_id = $cid", {"cid": 4})     # DuckDB: [('Dalia',)]`,
      caption: "In PostgreSQL the server receives the statement and the parameters as two separate protocol messages; in SQLite the values are bound to a compiled statement. Either way there is no string in which the value could become code. Parameters also let the server cache the plan across calls (5.6)."
    },

    { t: "dl", items: [
      ["SQL injection", "User-controlled text becoming part of a SQL statement. Reads other rows, changes data, or runs arbitrary statements, depending on the driver and permissions."],
      ["Parameterised query", "SQL with placeholders; values are sent separately and bound by the driver or server. The only complete defence, and a performance feature besides."],
      ["DB-API", "Python's standard interface for database drivers (PEP 249): `connect`, `cursor`, `execute`, `executemany`, `fetchall`, `commit`, `rollback`. sqlite3, psycopg, mysql-connector and DuckDB follow it."],
      ["Autocommit", "Driver behaviour when no transaction is open. sqlite3 opens one implicitly before writes (legacy mode) unless `autocommit` is set; psycopg 3 defaults to a transaction per connection until commit; DuckDB is autocommit."],
      ["Connection pool", "A set of open connections reused across requests. Opening a PostgreSQL connection costs a process fork and a handshake; a pool amortises it and caps concurrency."],
      ["Statement timeout", "A server-side limit on a statement's run time. `SET statement_timeout = '5s'` in PostgreSQL; `max_execution_time` in MySQL; a `progress_handler` in sqlite3. The guard against the query that never comes back."]
    ]},

    { t: "h2", n: "02", text: "What parameters cannot do", id: "limits" },

    { t: "code", lang: "python", title: "Identifiers, IN lists and dynamic ORDER BY (executed)",
      hl: [2, 5, 6, 10, 11, 12],
      code: `# 1. a table or column name is not a value
cur.execute("SELECT * FROM ? LIMIT 1", ("customers",))        # sqlite3: near "?": syntax error  -- the grammar needs the name at parse time
# allow-list, then quote as an identifier:
ALLOWED = {"customers", "orders"}
if table not in ALLOWED: raise ValueError(table)
cur.execute(f'SELECT COUNT(*) FROM "{table}"')                  # (8,)  -- safe because table came from the set, not from the user
# psycopg has sql.Identifier(table) which quotes correctly; use it rather than hand-quoting

# 2. an IN list has one placeholder per value
ids = [1, 3, 5]
placeholders = ",".join("?" * len(ids))
cur.execute(f"SELECT name FROM customers WHERE customer_id IN ({placeholders})", ids)   # [('Asha',), ('Chen',), ('Emeka',)]
# PostgreSQL alternative: WHERE customer_id = ANY(%s) with a Python list, one parameter

# 3. ORDER BY a user-chosen column: allow-list the column and the direction, never interpolate the raw string
SORTS = {"name": "name", "signed_up": "signed_up"}
direction = "DESC" if desc else "ASC"
cur.execute(f"SELECT * FROM customers ORDER BY {SORTS[sort_key]} {direction}")`,
      caption: "The pattern is the same three times: anything that must be text in the SQL comes from a set the program owns, and the user's input selects from that set. The user never supplies the text itself."
    },

    { t: "callout", kind: "trap", title: "The ORM does not make you safe", body: [
      { t: "p", text: "SQLAlchemy, Django and their peers parameterise everything they generate. **They also all offer a raw-SQL escape hatch**, and the f-string finds its way into it: `session.execute(text(f\"... WHERE name = '{name}'\"))`. The rule is unchanged inside an ORM: values are parameters (`text(\"... = :name\").bindparams(name=name)`), identifiers come from allow-lists." }
    ]},

    { t: "h2", n: "03", text: "Transactions from Python", id: "transactions" },

    { t: "code", lang: "python", title: "Explicit transactions, rollback on error, and the context-manager forms (executed)",
      hl: [2, 3, 4, 5, 9, 10, 11, 12, 16, 17, 20, 21],
      code: `# explicit, works on every DB-API driver
try:
    cur.execute("BEGIN")
    cur.execute("INSERT INTO orders VALUES (300, 1, '2025-05-02 00:00:00', 'paid')")
    cur.execute("INSERT INTO orders VALUES (300, 1, '2025-05-02 00:00:00', 'paid')")   # primary key duplicate
    cur.execute("COMMIT")
except sqlite3.IntegrityError as e:
    cur.execute("ROLLBACK")                                     # rolled back: UNIQUE constraint failed: orders.order_id
# SELECT COUNT(*) FROM orders WHERE order_id = 300  ->  0: the first insert did not survive either

# psycopg 3: the connection is a context manager that commits on success and rolls back on exception
with psycopg.connect(DSN) as conn:
    with conn.transaction():                                    # nested: a savepoint (6.1)
        conn.execute("UPDATE stock SET qty = qty - %s WHERE product_id = %s AND qty >= %s", (3, 1, 3))
        conn.execute("INSERT INTO sales VALUES (%s, %s)", (1, 3))
# leaving the block commits; an exception inside rolls back and re-raises

# sqlite3 (Python 3.12+): autocommit=False gives the same discipline; the legacy default opens transactions implicitly before writes
con = sqlite3.connect("shop.db", autocommit=False)
with con:                                                       # commits on success, rolls back on exception
    con.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)", rows)

# DuckDB: autocommit by default; con.begin() / con.commit() / con.rollback() for explicit control`,
      caption: "Know your driver's default. sqlite3's legacy behaviour — an implicit BEGIN before the first write, no implicit commit — has produced many 'my data vanished' reports from scripts that exited without committing. Make the transaction boundaries explicit, and put the rollback in the except."
    },

    { t: "h2", n: "04", text: "Bulk, pools, timeouts, retries", id: "ops" },

    { t: "code", lang: "python", title: "The four operational patterns",
      hl: [2, 3, 7, 8, 9, 13, 14, 19, 20, 21, 22, 23],
      code: `# 1. bulk: executemany in one transaction (263 ms for 20,000 rows in 6.3) or COPY (faster, PostgreSQL)
with conn.transaction():
    cur.executemany("INSERT INTO events VALUES (%s, %s, %s, %s)", rows)
with cur.copy("COPY events (event_id, customer_id, event_type, occurred_at) FROM STDIN") as cp:
    for r in rows: cp.write_row(r)

# 2. pool: open once, borrow per request, cap concurrency below the server's max_connections
from psycopg_pool import ConnectionPool
pool = ConnectionPool(DSN, min_size=2, max_size=10)
with pool.connection() as conn:                                   # borrowed; returned to the pool on exit, transaction closed
    conn.execute("SELECT 1")

# 3. timeout: server-side, so the query is cancelled rather than merely abandoned by the client
conn.execute("SET statement_timeout = '5s'")                      # PostgreSQL; or in the DSN: options='-c statement_timeout=5s'
con.set_progress_handler(lambda: 1 if time.monotonic() > deadline else 0, 10_000)   # sqlite3: abort when the handler returns non-zero

# 4. retry: only for errors that mean "try again" -- serialisation failure (6.2), deadlock, connection dropped -- and only for
#    idempotent transactions (6.1). Never retry a unique violation or a syntax error.
import psycopg.errors as E
for attempt in range(3):
    try:
        with conn.transaction(): do_work(conn); break
    except (E.SerializationFailure, E.DeadlockDetected, psycopg.OperationalError):
        time.sleep(0.1 * 2 ** attempt)                            # backoff, then the whole transaction again`,
      caption: "A retry wraps the whole transaction, not the failed statement, because after a serialisation failure the transaction is aborted. The exception classes tell you which errors are transient; a catch-all `except Exception: retry` turns a bug into an infinite loop."
    },

    { t: "table",
      head: ["Concern", "Pattern", "Failure it prevents"],
      rows: [
        ["Injection", "Parameters for values; allow-lists for identifiers", "Reading every row; deleting the table"],
        ["Atomicity", "Explicit transaction; rollback in except; context managers", "Half-applied changes; data lost on exit"],
        ["Throughput", "executemany / COPY inside one transaction; a pool", "Minutes of per-row commits; connection exhaustion"],
        ["Hung queries", "Server-side statement timeout", "A request that holds a connection and a lock for an hour"],
        ["Transient failures", "Bounded retry with backoff on specific error classes, for idempotent work", "A deploy-time blip becoming an outage; or a retry loop duplicating rows"],
        ["Leaks", "`with` for connections and cursors; pool returns on exit", "Connections held by finished requests until max_connections"]
      ]
    },

    { t: "h2", n: "05", text: "DuckDB: SQL over DataFrames", id: "duckdb" },

    { t: "code", lang: "python", title: "A DataFrame is a table; a result is a DataFrame (executed)",
      hl: [3, 6, 7, 10, 11],
      code: `import duckdb, pandas as pd
con = duckdb.connect()                                            # in-memory; or duckdb.connect("shop.duckdb") for a file
df = con.execute("SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY 1 ORDER BY 1").df()    # pandas out
#    customer_id  n
# 0            1  3
# 1            2  2

scores = pd.DataFrame({"customer_id": [1, 2], "score": [0.9, 0.4]})
con.execute("SELECT c.name, p.score FROM customers c JOIN scores p USING (customer_id)").fetchall()   # a DataFrame in scope is a table
# [('Asha', 0.9), ('Bruno', 0.4)]

con.execute("SELECT * FROM read_parquet('events/*.parquet') WHERE occurred_at >= ?", [cutoff]).pl()  # Polars out; files in
con.execute("COPY (SELECT ...) TO 'out.parquet'")                                                  # Parquet out

# the pandas equivalents against any DB-API or SQLAlchemy connection: parameters still travel separately
df = pd.read_sql("SELECT * FROM orders WHERE customer_id = %(cid)s", engine, params={"cid": 4})      # read_sql_query / read_sql_table
df.to_sql("predictions", engine, if_exists="append", index=False, method="multi", chunksize=5_000)  # multi-row INSERTs per chunk; COPY is still faster`,
      caption: "This is the working pattern for a data scientist: load with pandas or Polars, do the joins, windows and aggregates in SQL where they are clearer, get a DataFrame back. Parameters work the same way, and the DataFrame-as-table trick means no temporary tables and no CSV round trips."
    },

    { t: "ladder",
      title: "A report endpoint that filters by customer name",
      rungs: [
        { level: "bad", label: "f-string, autocommit, no timeout", code: `@app.get("/orders")
def orders(name: str):
    return db.execute(f"SELECT * FROM orders o JOIN customers c USING (customer_id) WHERE c.name = '{name}'").fetchall()`,
          note: "**Injectable, unbounded, and holding a connection from a global for the life of the process.** `name = x' OR '1'='1` returns every order." },
        { level: "ok", label: "Parameterised, pooled", code: `def orders(name: str):
    with pool.connection() as conn:
        return conn.execute("SELECT ... WHERE c.name = %s", (name,)).fetchall()`,
          note: "**Safe and scalable.** A slow query still ties up a pool slot indefinitely, and a million-row result is returned whole." },
        { level: "best", label: "Parameterised, pooled, bounded, paginated", code: `def orders(name: str, after_id: int = 0, limit: int = 100):
    limit = min(limit, 500)
    with pool.connection() as conn:
        conn.execute("SET LOCAL statement_timeout = '5s'")
        return conn.execute("""SELECT ... WHERE c.name = %s AND o.order_id > %s
                               ORDER BY o.order_id LIMIT %s""", (name, after_id, limit)).fetchall()`,
          note: "**Every dimension bounded**: input is a parameter, time is capped server-side, the result is a keyset page (5.4), the connection returns to the pool." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A safe query helper",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "Write a function `fetch_orders(conn, *, customer_ids=None, statuses=None, since=None, sort='placed_at', desc=True, limit=100)` for sqlite3 that builds the WHERE from whichever filters are given, supports an IN list for each, allow-lists the sort column, bounds the limit, and never interpolates a user value. Return the SQL and parameters it would run for `customer_ids=[1, 3], statuses=['paid'], sort='order_id'`, and show that a malicious `sort` raises rather than runs." }
      ],
      requirements: [
        "Values only ever appear in the parameter tuple.",
        "IN lists expand to one placeholder per value; an empty list means 'no filter' or 'no rows' — choose and document.",
        "`sort` validated against a dict of allowed columns; `desc` mapped to a literal by the code.",
        "`limit` clamped to a maximum."
      ],
      hint: "Accumulate `clauses` and `params` lists; join clauses with AND; if no clauses, omit WHERE. The only f-string content is the allow-listed column, the direction literal, and the joined placeholders.",
      solution: {
        lang: "python",
        title: "fetch_orders.py",
        code: `SORTS = {"placed_at": "o.placed_at", "order_id": "o.order_id", "status": "o.status"}
MAX_LIMIT = 500

def fetch_orders(conn, *, customer_ids=None, statuses=None, since=None, sort="placed_at", desc=True, limit=100):
    clauses, params = [], []
    if customer_ids is not None:                              # None: no filter.  []: no rows (an empty IN list is invalid SQL)
        if not customer_ids: return []
        clauses.append(f"o.customer_id IN ({','.join('?' * len(customer_ids))})")
        params.extend(customer_ids)
    if statuses is not None:
        if not statuses: return []
        clauses.append(f"o.status IN ({','.join('?' * len(statuses))})")
        params.extend(statuses)
    if since is not None:
        clauses.append("o.placed_at >= ?"); params.append(since)
    if sort not in SORTS:
        raise ValueError(f"unknown sort column: {sort!r}")     # 'order_id; DROP TABLE orders' raises here, before any SQL exists
    direction = "DESC" if desc else "ASC"
    limit = max(1, min(int(limit), MAX_LIMIT))

    sql = "SELECT o.order_id, o.customer_id, o.placed_at, o.status FROM orders o"
    if clauses: sql += " WHERE " + " AND ".join(clauses)
    sql += f" ORDER BY {SORTS[sort]} {direction} LIMIT ?"
    params.append(limit)
    return conn.execute(sql, params).fetchall()

# fetch_orders(conn, customer_ids=[1, 3], statuses=['paid'], sort='order_id') runs:
#   SELECT o.order_id, o.customer_id, o.placed_at, o.status FROM orders o
#   WHERE o.customer_id IN (?,?) AND o.status IN (?) ORDER BY o.order_id DESC LIMIT ?
#   params: [1, 3, 'paid', 100]
# fetch_orders(conn, sort="order_id; DROP TABLE orders") -> ValueError: unknown sort column`,
        notes: [
          { t: "p", text: "**Every value is in `params`** — ids, statuses, the date, even the limit. The f-strings contain only text the function itself produced: placeholders, an allow-listed column, a direction chosen by an `if`." },
          { t: "p", text: "**The empty-list decision is explicit**: `IN ()` is a syntax error on most engines, so the function returns no rows before building SQL. The alternative — treating `[]` as 'no filter' — is a plausible design too; what matters is that it is decided and documented, not discovered." },
          { t: "p", text: "**The malicious sort fails before any SQL exists.** That is the property to aim for: bad input is rejected by the program's own checks, and the database never sees it." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does `cur.execute(\"... WHERE name = ?\", (name,))` prevent injection when escaping quotes does not?",
          options: [
            "It escapes better",
            "The value never becomes part of the SQL text: it is sent or bound separately, so the database parses only the program's SQL and treats the value purely as data whatever characters it contains",
            "The driver rejects dangerous strings",
            "It runs in a transaction"
          ],
          answer: 1,
          why: "Escaping tries to make data safe inside code; parameters keep data out of the code. Only the second is complete."
        }
      ]
    }
  ],

  takeaways: [
    "**Values are parameters, always** — the SQL and the data travel separately, so input cannot become code.",
    "**Identifiers, IN lists and ORDER BY columns come from allow-lists** the program owns; the user selects, never supplies.",
    "**The ORM's raw-SQL escape hatch follows the same rule.**",
    "**Know the driver's transaction default**: sqlite3's implicit BEGIN, psycopg's transaction-until-commit, DuckDB's autocommit. Make boundaries explicit; rollback in the except.",
    "**Context managers commit on success and roll back on exception** — use them.",
    "**executemany or COPY inside one transaction** for bulk; a pool for connections; `with` so both return.",
    "**Server-side statement timeouts** cancel the query rather than abandoning it.",
    "**Retry only transient errors — serialisation failure, deadlock, dropped connection — with backoff, wrapping the whole transaction, and only if it is idempotent.**",
    "**DuckDB makes DataFrames tables and results DataFrames**: the SQL-in-the-notebook pattern without CSV round trips.",
    "**Bound every dimension of an endpoint**: input, time, result size, connection lifetime."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function must query a table whose name comes from a request. What is the safe approach?",
        options: [
          "Parameterise the table name",
          "Check the name against a set of allowed tables the code defines, then quote it as an identifier; the request selects from the set and never supplies the text",
          "Escape quotes in the name",
          "Use an ORM"
        ],
        answer: 1,
        why: "Identifiers must be present at parse time, so parameters cannot carry them. An allow-list makes the input a choice rather than a string."
      },
      {
        stem: "A sqlite3 script inserts rows, prints success, and the database is empty afterwards. What happened?",
        options: [
          "The disk failed",
          "The legacy sqlite3 default opened an implicit transaction before the first write and the script exited without committing; make transactions explicit or use `with con:` / `autocommit=False` with a commit",
          "The rows were rejected silently",
          "SQLite does not persist inserts"
        ],
        answer: 1,
        why: "Uncommitted work is rolled back when the connection closes. Explicit boundaries prevent the surprise."
      },
      {
        stem: "Which errors should a retry loop catch?",
        options: [
          "All exceptions",
          "Transient ones with a specific meaning — serialisation failure, deadlock, connection dropped — and only around idempotent transactions, with backoff and a bound",
          "Unique violations",
          "Syntax errors"
        ],
        answer: 1,
        why: "A unique violation or a syntax error will fail identically every time. Catch-all retries turn a bug into a loop and a non-idempotent write into duplicates."
      },
      {
        stem: "Why set a statement timeout on the server rather than a timeout in the client?",
        options: [
          "Client timeouts do not exist",
          "A client timeout abandons the query while the server keeps running it, holding locks and a connection; a server-side timeout cancels the statement itself",
          "It is faster",
          "Servers ignore client timeouts"
        ],
        answer: 1,
        why: "Abandoned queries are how a pool fills with connections running work nobody is waiting for. Cancel at the source."
      },
      {
        stem: "What does a connection pool give a web application?",
        options: [
          "Faster queries",
          "Reuse of expensive connections across requests and a cap on concurrent connections below the server's limit, with `with pool.connection()` returning each one on exit",
          "Automatic retries",
          "Injection protection"
        ],
        answer: 1,
        why: "Opening a PostgreSQL connection costs a process and a handshake; a pool pays it once and prevents a burst of requests from exhausting max_connections."
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
        strong: "Parameterised queries for every value: the SQL with placeholders and the values are sent separately, so the database never parses input as SQL — that is a protocol property, not an escaping trick, and it also lets the server cache the plan. For the things parameters cannot express — table and column names, sort columns — an allow-list in the code, with the user's input selecting an entry rather than supplying text; IN lists get one placeholder per value or an array parameter. The same rule holds inside an ORM's raw-SQL escape hatch. And least privilege on the database role, so that if something is missed the damage is bounded.",
        answer: [
          { t: "p", text: "Parameters as a protocol property, the allow-list for identifiers, and least privilege as the backstop." }
        ]
      },
      {
        level: "core",
        q: "How do you manage transactions and connections in a Python service?",
        strong: "A connection pool opened at startup, sized below the server's max_connections; each request borrows a connection in a with block so it is returned on exit even on exception. Transactions are explicit — the driver's context manager commits on success and rolls back on exception — and short: no network calls or user waits inside one. A server-side statement timeout so a runaway query is cancelled rather than abandoned. Bulk writes use executemany or COPY inside one transaction. And I know the driver's autocommit default, because sqlite3's implicit transactions and psycopg's transaction-until-commit have each surprised people into lost or stuck writes.",
        answer: [
          { t: "p", text: "Pool, with-blocks, explicit short transactions, server timeout, and knowing the default — the operational checklist." }
        ]
      },
      {
        level: "advanced",
        q: "When should a database call be retried?",
        strong: "When the error is transient and the operation is idempotent. Transient means the error class says 'try again': a serialisation failure or deadlock under SERIALIZABLE or REPEATABLE READ, a dropped connection during a failover. Idempotent means re-running the whole transaction produces the same state — an upsert, a replace-the-period load, a conditional update — not a plain insert that would duplicate. The retry wraps the entire transaction, because after a serialisation failure the transaction is aborted; it backs off exponentially and gives up after a few attempts. What I never do is catch all exceptions: a unique violation or a bug retried forever is an incident, and a non-idempotent write retried is corruption.",
        answer: [
          { t: "p", text: "Transient plus idempotent, whole transaction, bounded backoff, and the two things never to retry." }
        ]
      }
    ]
  }
});
