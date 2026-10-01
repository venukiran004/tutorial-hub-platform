/* ============================================================================
   LESSON 11.3 — Connection Pools and Database Performance
   ========================================================================= */
EC.receiveLesson({
  id: "11.3",

  lede: "Most slow services are slow in the database, and most of that slowness comes from a few recurring causes: opening connections too often, opening too many of them, making one query per row instead of one per page, and asking for rows the database can only find by reading everything. Each is measured here on a real PostgreSQL. Connecting per query was about **forty times** slower than reusing a connection; more connections than cores made the database **slower**, not faster; a template's N+1 pattern made **101 queries** where one would do; and the right index turned a 30 ms scan into a tenth of a millisecond.",

  objectives: [
    "Measure the cost of a connection, and reuse connections through a pool",
    "Explain why a database's throughput falls when given more connections than it has cores",
    "Size application pools and use PgBouncer to multiplex many clients onto few server connections",
    "Recognise N+1 queries and replace them with joins or batched lookups",
    "Read a query plan and choose an index — including composite and expression indexes"
  ],

  prerequisites: ["11.2", "9.3", "2.3"],

  blocks: [

    { t: "h2", n: "01", id: "connections", text: "What a connection costs",
      sub: "Reuse them" },

    { t: "p", text: "A PostgreSQL connection is a TCP handshake, often a TLS handshake (1.4), authentication, and a new server **process** forked to serve it, with its own memory. Measured against the local database, three hundred primary-key lookups:" },

    { t: "code", lang: "python", title: "conncost.py — a new connection per query, against one reused connection", code: `import time, psycopg

DSN = "host=127.0.0.1 port=5433 user=postgres dbname=postgres"
N = 300

def timed(fn):
    start = time.perf_counter(); fn(); return (time.perf_counter() - start) * 1000

def connect_per_query():
    for i in range(N):
        with psycopg.connect(DSN) as conn: conn.execute("SELECT abalance FROM pgbench_accounts WHERE aid = %s", (i + 1,)).fetchone()

def reuse_one_connection():
    with psycopg.connect(DSN) as conn:
        for i in range(N): conn.execute("SELECT abalance FROM pgbench_accounts WHERE aid = %s", (i + 1,)).fetchone()

a, b = timed(connect_per_query), timed(reuse_one_connection)
print(f"{N} queries, new connection each : {a:7.0f} ms  ({a / N:.2f} ms per query)")
print(f"{N} queries, one reused connection: {b:7.0f} ms  ({b / N:.3f} ms per query)")
print(f"connecting for every query was {a / b:.0f}x slower, on localhost and without TLS")`,
      out: `300 queries, new connection each :    1077 ms  (3.59 ms per query)
300 queries, one reused connection:      27 ms  (0.089 ms per query)
connecting for every query was 40x slower, on localhost and without TLS` },

    { t: "p", text: "Connecting for each query cost over 3 ms per query; the query itself took less than a tenth of a millisecond. With TLS and a real network the gap is wider still. This is why every serious application uses a **connection pool** (9.3's object pool): open a bounded set of connections once, lend them to requests, take them back." },

    { t: "h2", n: "02", id: "how-many", text: "How many connections?",
      sub: "Fewer than you think" },

    { t: "p", text: "A database does its work on CPU cores and disks. Once every core is busy, extra connections do not add throughput — they add context switching, lock contention and memory, and every query waits longer. Measured with `pgbench`, PostgreSQL's own benchmark, running read-only queries against the 4-core machine this course is built on:" },

    { t: "code", lang: "bash", title: "pgbench, read-only, 10 seconds per run", code: `pgbench -i -s 20 postgres                       # 2 million rows (connection flags omitted)
for c in 1 2 4 8 16 32 64 90; do
  printf "clients %3d: " $c
  pgbench -c $c -j $(( c < 4 ? c : 4 )) -T 10 -S postgres 2>/dev/null \\
    | grep -E "^tps|latency average" | sed 's/ (without initial connection time)//' | tr '\\n' ' '; echo
done`,
      out: `clients   1: latency average = 0.067 ms tps = 14912.763982
clients   2: latency average = 0.066 ms tps = 30086.730302
clients   4: latency average = 0.032 ms tps = 123868.991678
clients   8: latency average = 0.086 ms tps = 92666.230825
clients  16: latency average = 0.195 ms tps = 82075.912365
clients  32: latency average = 0.377 ms tps = 84911.558041
clients  64: latency average = 0.800 ms tps = 79977.301649
clients  90: latency average = 1.162 ms tps = 77443.255363` },

    { t: "viz", title: "Throughput by number of connections",
      caption: "Throughput peaked at four connections — one per core — and fell by about 35% beyond it. The benchmark client shares the same four cores, so treat the absolute numbers as illustrative; the shape, a peak near the core count and a decline after it, is what production databases show too.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<line x1="64" y1="204.0" x2="610" y2="204.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="208.0" text-anchor="end" class="s-sub">0k</text>
<line x1="64" y1="157.5" x2="610" y2="157.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="161.5" text-anchor="end" class="s-sub">35k</text>
<line x1="64" y1="111.0" x2="610" y2="111.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="115.0" text-anchor="end" class="s-sub">70k</text>
<line x1="64" y1="64.5" x2="610" y2="64.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="68.5" text-anchor="end" class="s-sub">105k</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">140k</text>
<text x="64.0" y="222" text-anchor="middle" class="s-sub">1</text>
<text x="142.0" y="222" text-anchor="middle" class="s-sub">2</text>
<text x="220.0" y="222" text-anchor="middle" class="s-sub">4</text>
<text x="298.0" y="222" text-anchor="middle" class="s-sub">8</text>
<text x="376.0" y="222" text-anchor="middle" class="s-sub">16</text>
<text x="454.0" y="222" text-anchor="middle" class="s-sub">32</text>
<text x="532.0" y="222" text-anchor="middle" class="s-sub">64</text>
<text x="610.0" y="222" text-anchor="middle" class="s-sub">90</text>
<text x="337.0" y="244" text-anchor="middle" class="s-sub">client connections (4 CPU cores)</text>
<text x="14" y="111.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 111.0)">thousand transactions per second</text>
<polyline points="64.0,184.2 142.0,164.0 220.0,39.4 298.0,80.8 376.0,94.9 454.0,91.2 532.0,97.7 610.0,101.2" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="184.2" r="3.6" style="fill:var(--good)"/>
<circle cx="142.0" cy="164.0" r="3.6" style="fill:var(--good)"/>
<circle cx="220.0" cy="39.4" r="3.6" style="fill:var(--good)"/>
<circle cx="298.0" cy="80.8" r="3.6" style="fill:var(--good)"/>
<circle cx="376.0" cy="94.9" r="3.6" style="fill:var(--good)"/>
<circle cx="454.0" cy="91.2" r="3.6" style="fill:var(--good)"/>
<circle cx="532.0" cy="97.7" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="101.2" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">throughput</text>
</svg>` },

    { t: "viz", title: "Latency by number of connections",
      caption: "Average latency rose from 0.03 ms at four connections to 1.16 ms at ninety — over thirty-six times — while throughput fell. More connections than the database can run at once just queue inside it, which is 11.2's utilisation curve again.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img">
<line x1="64" y1="204.0" x2="610" y2="204.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="208.0" text-anchor="end" class="s-sub">0 ms</text>
<line x1="64" y1="157.5" x2="610" y2="157.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="161.5" text-anchor="end" class="s-sub">0.3 ms</text>
<line x1="64" y1="111.0" x2="610" y2="111.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="115.0" text-anchor="end" class="s-sub">0.6 ms</text>
<line x1="64" y1="64.5" x2="610" y2="64.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="68.5" text-anchor="end" class="s-sub">0.9 ms</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">1.2 ms</text>
<text x="64.0" y="222" text-anchor="middle" class="s-sub">1</text>
<text x="142.0" y="222" text-anchor="middle" class="s-sub">2</text>
<text x="220.0" y="222" text-anchor="middle" class="s-sub">4</text>
<text x="298.0" y="222" text-anchor="middle" class="s-sub">8</text>
<text x="376.0" y="222" text-anchor="middle" class="s-sub">16</text>
<text x="454.0" y="222" text-anchor="middle" class="s-sub">32</text>
<text x="532.0" y="222" text-anchor="middle" class="s-sub">64</text>
<text x="610.0" y="222" text-anchor="middle" class="s-sub">90</text>
<text x="337.0" y="244" text-anchor="middle" class="s-sub">client connections (4 CPU cores)</text>
<text x="14" y="111.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 111.0)">average latency</text>
<polyline points="64.0,193.6 142.0,193.8 220.0,199.0 298.0,190.7 376.0,173.8 454.0,145.6 532.0,80.0 610.0,23.9" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="193.6" r="3.6" style="fill:var(--crit)"/>
<circle cx="142.0" cy="193.8" r="3.6" style="fill:var(--crit)"/>
<circle cx="220.0" cy="199.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="298.0" cy="190.7" r="3.6" style="fill:var(--crit)"/>
<circle cx="376.0" cy="173.8" r="3.6" style="fill:var(--crit)"/>
<circle cx="454.0" cy="145.6" r="3.6" style="fill:var(--crit)"/>
<circle cx="532.0" cy="80.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="23.9" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">latency</text>
</svg>` },

    { t: "callout", kind: "insight", title: "A starting point for pool size",
      body: [
        { t: "p", text: "The guidance popularised by HikariCP's maintainers is **connections ≈ cores × 2 + effective spindles** on the database server — on the order of ten to twenty for a typical primary, far fewer than most applications configure. That is the database's total, shared by every application instance. Then apply 11.2: Little's law gives the busy connections needed at peak, and pool wait time on a dashboard tells you when the pool, not the database, is the bottleneck." }
      ] },

    { t: "p", text: "The two numbers collide in a fleet: twenty application instances each wanting a pool of ten makes 200 connections, ten times what the database runs well. A connection **pooler** such as PgBouncer sits between them. In **transaction pooling** mode it lends a server connection to a client only for the duration of one transaction, so many mostly-idle client connections share a few busy server connections:" },

    { t: "viz", title: "PgBouncer multiplexing a fleet onto a small pool",
      caption: "Each application instance keeps its own pool of ten connections — to PgBouncer, where connections are cheap. PgBouncer keeps twenty real connections to PostgreSQL and assigns one to a client transaction only while it runs. The database sees a small, busy pool, close to its best throughput.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="PgBouncer between applications and PostgreSQL">
<defs><marker id="pb-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="16" y="14" width="150" height="32" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="91.0" y="34.0" text-anchor="middle" class="s-label">app instance</text>
<line x1="166" y1="30" x2="300" y2="118" style="stroke:var(--ink-3);stroke-opacity:.6" stroke-width="1.2" marker-end="url(#pb-a)"/>
<rect x="16" y="56" width="150" height="32" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="91.0" y="76.0" text-anchor="middle" class="s-label">app instance</text>
<line x1="166" y1="72" x2="300" y2="118" style="stroke:var(--ink-3);stroke-opacity:.6" stroke-width="1.2" marker-end="url(#pb-a)"/>
<rect x="16" y="98" width="150" height="32" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="91.0" y="118.0" text-anchor="middle" class="s-label">app instance</text>
<line x1="166" y1="114" x2="300" y2="118" style="stroke:var(--ink-3);stroke-opacity:.6" stroke-width="1.2" marker-end="url(#pb-a)"/>
<rect x="16" y="140" width="150" height="32" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="91.0" y="160.0" text-anchor="middle" class="s-label">app instance</text>
<line x1="166" y1="156" x2="300" y2="118" style="stroke:var(--ink-3);stroke-opacity:.6" stroke-width="1.2" marker-end="url(#pb-a)"/>
<rect x="16" y="182" width="150" height="32" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="91.0" y="202.0" text-anchor="middle" class="s-label">… 20 instances</text>
<line x1="166" y1="198" x2="300" y2="118" style="stroke:var(--ink-3);stroke-opacity:.6" stroke-width="1.2" marker-end="url(#pb-a)"/>
<text x="382" y="56" text-anchor="middle" class="s-sub">10 connections × 20 instances</text>
<text x="382" y="72" text-anchor="middle" class="s-sub" style="fill:var(--warn)">= 200 client connections</text>
<rect x="302" y="82" width="160" height="72" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="382.0" y="115.0" text-anchor="middle" class="s-label">PgBouncer</text><text x="382.0" y="130.0" text-anchor="middle" class="s-sub">transaction pooling</text>
<line x1="462" y1="100" x2="566" y2="100" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#pb-a)"/>
<line x1="462" y1="112" x2="566" y2="112" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#pb-a)"/>
<line x1="462" y1="124" x2="566" y2="124" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#pb-a)"/>
<line x1="462" y1="136" x2="566" y2="136" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#pb-a)"/>
<text x="514" y="176" text-anchor="middle" class="s-sub" style="fill:var(--good)">20 server connections</text>
<rect x="568" y="76" width="176" height="84" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="656.0" y="115.0" text-anchor="middle" class="s-label">PostgreSQL</text><text x="656.0" y="130.0" text-anchor="middle" class="s-sub">4 cores, 20 busy backends</text>
<text x="380" y="196" text-anchor="middle" class="s-sub">a server connection is lent to a client only for the length of one transaction,</text>
<text x="380" y="214" text-anchor="middle" class="s-sub">so 200 mostly idle client connections share 20 that are mostly busy</text>
</svg>` },

    { t: "callout", kind: "trap", title: "What transaction pooling breaks",
      body: [
        { t: "p", text: "Because consecutive transactions from one client may run on different server connections, anything that lives in a **session** misbehaves: session-level `SET` commands, advisory locks held across transactions, `LISTEN/NOTIFY`, temporary tables, and — in older PgBouncer versions — server-side prepared statements. Use transaction-scoped equivalents (`SET LOCAL`, transaction-level advisory locks), or a session-mode pool for the few clients that need sessions." }
      ] },

    { t: "h2", n: "03", id: "nplus1", text: "The N+1 query",
      sub: "One query per row, hidden behind an attribute" },

    { t: "p", text: "An order list template reads `order.customer.name` for each of 100 orders. With a lazy-loading ORM relationship — 9.4's remote proxy — that is one query for the orders and one more per order:" },

    { t: "code", lang: "python", title: "nplus1.py — the same page three ways", code: `import time, psycopg

conn = psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres", autocommit=True)
conn.execute("DROP TABLE IF EXISTS n1_orders, n1_customers")
conn.execute("CREATE TABLE n1_customers (id int PRIMARY KEY, name text)")
conn.execute("CREATE TABLE n1_orders (id int PRIMARY KEY, customer_id int REFERENCES n1_customers, total int)")
conn.execute("INSERT INTO n1_customers SELECT g, 'customer ' || g FROM generate_series(1, 5000) g")
conn.execute("INSERT INTO n1_orders SELECT g, 1 + g % 5000, g % 997 FROM generate_series(1, 50000) g")

def n_plus_one():                                   # what a lazy-loading ORM does in a template loop (9.4)
    orders = conn.execute("SELECT id, customer_id, total FROM n1_orders ORDER BY id DESC LIMIT 100").fetchall()
    return [(o[0], conn.execute("SELECT name FROM n1_customers WHERE id = %s", (o[1],)).fetchone()[0]) for o in orders], 1 + len(orders)

def join():
    rows = conn.execute("""SELECT o.id, c.name FROM n1_orders o JOIN n1_customers c ON c.id = o.customer_id
                           ORDER BY o.id DESC LIMIT 100""").fetchall()
    return rows, 1

def two_queries():                                  # what eager loading (selectinload, prefetch_related) does
    orders = conn.execute("SELECT id, customer_id FROM n1_orders ORDER BY id DESC LIMIT 100").fetchall()
    names = dict(conn.execute("SELECT id, name FROM n1_customers WHERE id = ANY(%s)", ([o[1] for o in orders],)).fetchall())
    return [(o[0], names[o[1]]) for o in orders], 2

for label, fn in (("N+1: one query per row", n_plus_one), ("one JOIN", join), ("two queries, IN list", two_queries)):
    best = float("inf")
    for _ in range(5):
        start = time.perf_counter(); rows, queries = fn(); best = min(best, time.perf_counter() - start)
    rtt = queries * 0.5                              # at a typical 0.5 ms network round trip per query
    print(f"{label:<24} {queries:>4} queries  {best * 1000:6.1f} ms on localhost   + ~{rtt:5.1f} ms of round trips over a real network")`,
      hl: [10, 12, 14, 19, 21],
      out: `N+1: one query per row    101 queries     7.6 ms on localhost   + ~ 50.5 ms of round trips over a real network
one JOIN                    1 queries     0.2 ms on localhost   + ~  0.5 ms of round trips over a real network
two queries, IN list        2 queries     0.5 ms on localhost   + ~  1.0 ms of round trips over a real network` },

    { t: "viz", title: "101 round trips, or one",
      caption: "Each lazy load is a full round trip. On localhost the 101 queries took under 8 ms, which is why N+1 hides in development; across a data-centre network at about half a millisecond each, they add some 50 ms to the page, and far more on a busy database. The join answers in one round trip, and an eager-loading IN query in two.",
      svg: `<svg viewBox="0 0 760 333" width="100%" role="img"><defs><marker id="q683628accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q683628good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q683628warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q683628crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q683628violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q683628teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q683628line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">N+1: 101 round trips</text>
<rect x="14.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="70.0" y="54" text-anchor="middle" class="s-label">App</text>
<rect x="244.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="300.0" y="54" text-anchor="middle" class="s-label">Database</text>
<line x1="70.0" y1="64" x2="70.0" y2="321.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="300.0" y1="64" x2="300.0" y2="321.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="70.0" y1="82" x2="296.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q683628accent)"/>
<text x="185.0" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">SELECT 100 orders</text>
<line x1="300.0" y1="108" x2="74.0" y2="108" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q683628good)"/>
<text x="185.0" y="102" text-anchor="middle" class="s-sub" style="fill:var(--good)">(100 rows)</text>
<line x1="70.0" y1="134" x2="296.0" y2="134" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q683628warn)"/>
<text x="185.0" y="128" text-anchor="middle" class="s-sub" style="fill:var(--warn)">SELECT customer 1</text>
<line x1="300.0" y1="160" x2="74.0" y2="160" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q683628good)"/>
<text x="185.0" y="154" text-anchor="middle" class="s-sub" style="fill:var(--good)">(1 row)</text>
<line x1="70.0" y1="186" x2="296.0" y2="186" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q683628warn)"/>
<text x="185.0" y="180" text-anchor="middle" class="s-sub" style="fill:var(--warn)">SELECT customer 5000</text>
<line x1="300.0" y1="212" x2="74.0" y2="212" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q683628good)"/>
<text x="185.0" y="206" text-anchor="middle" class="s-sub" style="fill:var(--good)">(1 row)</text>
<text x="185.0" y="242" text-anchor="middle" class="s-sub" style="font-style:italic">… 98 more round trips …</text>
<text x="185.0" y="262" text-anchor="middle" class="s-sub" style="font-style:italic"></text>
<line x1="70.0" y1="278" x2="296.0" y2="278" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q683628warn)"/>
<text x="185.0" y="272" text-anchor="middle" class="s-sub" style="fill:var(--warn)">SELECT customer 4902</text>
<line x1="300.0" y1="304" x2="74.0" y2="304" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q683628good)"/>
<text x="185.0" y="298" text-anchor="middle" class="s-sub" style="fill:var(--good)">(1 row)</text><line x1="380.0" y1="10" x2="380.0" y2="323" style="stroke:var(--line);stroke-dasharray:4 4"/><g transform="translate(390.0,0)"><defs><marker id="r765666accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="r765666good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="r765666warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="r765666crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="r765666violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="r765666teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="r765666line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">JOIN: 1 round trip</text>
<rect x="14.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="70.0" y="54" text-anchor="middle" class="s-label">App</text>
<rect x="244.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="300.0" y="54" text-anchor="middle" class="s-label">Database</text>
<line x1="70.0" y1="64" x2="70.0" y2="151.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="300.0" y1="64" x2="300.0" y2="151.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="70.0" y1="82" x2="296.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#r765666accent)"/>
<text x="185.0" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">SELECT ... JOIN customers</text>
<line x1="300.0" y1="108" x2="74.0" y2="108" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r765666good)"/>
<text x="185.0" y="102" text-anchor="middle" class="s-sub" style="fill:var(--good)">(100 rows, names included)</text>
<rect x="25.0" y="122" width="90" height="20" rx="5" style="fill:var(--good);fill-opacity:.16;stroke:var(--good)"/>
<text x="70.0" y="136" text-anchor="middle" class="s-sub" style="fill:var(--ink)">done</text></g></svg>` },

    { t: "p", text: "ORMs provide the fix — `selectinload` and `joinedload` in SQLAlchemy, `select_related` and `prefetch_related` in Django — but someone has to use them. The reliable defence is to **count queries**: log the number per request, alert on pages above a threshold, and assert the count in tests for important pages." },

    { t: "h2", n: "04", id: "plans", text: "Reading a query plan",
      sub: "How did the database find the rows?" },

    { t: "p", text: "`EXPLAIN ANALYZE` runs a query and reports the plan the database chose and how long each step took. The one question to ask of it is: **did it find the rows through an index, or by reading the table?** On a million-row table:" },

    { t: "code", lang: "python", title: "plan.py — the same lookups before and after the right index", code: `import psycopg

db = psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres", autocommit=True)
db.execute("DROP TABLE IF EXISTS plan_orders")
db.execute("""CREATE TABLE plan_orders AS
    SELECT g AS id, (g::bigint * 7919) % 200000 AS customer_id,
           'user' || (g % 200000) || '@Example.com' AS email,
           (ARRAY['placed', 'paid', 'shipped', 'delivered'])[1 + g % 4] AS status,
           now() - (g % 525600) * interval '1 minute' AS created_at
    FROM generate_series(1, 1000000) g""")
db.execute("ANALYZE plan_orders")

def explain(sql, *args):
    """Run EXPLAIN ANALYZE and keep the essentials: how the rows were found, and how long it took."""
    lines = [r[0].strip() for r in db.execute("EXPLAIN (ANALYZE, COSTS OFF) " + sql, args).fetchall()]
    scan = next(l for l in lines if "Scan" in l and "Bitmap Heap" not in l).lstrip("-> ").split(" (actual")[0]
    total = next(l for l in lines if l.startswith("Execution Time")).split(": ")[1]
    return f"{scan:<52} {total:>10}"

q1 = "SELECT * FROM plan_orders WHERE customer_id = %s"
print("customer's orders, no index:     ", explain(q1, 4242))
db.execute("CREATE INDEX ON plan_orders (customer_id)")
print("customer's orders, with index:   ", explain(q1, 4242))

q2 = "SELECT * FROM plan_orders WHERE lower(email) = %s"
db.execute("CREATE INDEX ON plan_orders (email)")
print("lower(email), index on email:    ", explain(q2, "user4242@example.com"))
db.execute("CREATE INDEX ON plan_orders (lower(email))")
print("lower(email), index on lower():  ", explain(q2, "user4242@example.com"))`,
      hl: [13, 22, 26, 28],
      out: `customer's orders, no index:      Parallel Seq Scan on plan_orders                      29.553 ms
customer's orders, with index:    Bitmap Index Scan on plan_orders_customer_id_idx       0.092 ms
lower(email), index on email:     Parallel Seq Scan on plan_orders                     138.379 ms
lower(email), index on lower():   Bitmap Index Scan on plan_orders_lower_idx             0.084 ms` },

    { t: "p", text: "Without an index, finding one customer's five orders meant scanning the whole table in parallel: about 30 ms. A B-tree index on `customer_id` made it about 0.1 ms — **300 times faster**, and the gap grows with the table. The second pair is the classic trap: an index on `email` is useless to `WHERE lower(email) = ...`, because the indexed values are not the ones being compared, so PostgreSQL scanned a million rows. An **expression index** on `lower(email)` fixed it." },

    { t: "table", head: ["In the plan", "Means", "Usually"], rows: [
      ["Seq Scan / Parallel Seq Scan", "read every row of the table", "fine for small tables; a missing index for big ones"],
      ["Index Scan", "walk the index, fetch matching rows", "good for a few rows"],
      ["Index Only Scan", "the index alone answers the query", "best: a covering index"],
      ["Bitmap Index + Heap Scan", "collect matches from the index, then read pages in order", "good for a moderate number of rows"],
      ["Sort", "ordering done after fetching", "an index in the ORDER BY's order can remove it"],
      ["Nested Loop with a Seq Scan inside", "a scan repeated for every outer row", "a missing index on the join key"],
      ["Rows Removed by Filter: large", "rows read and thrown away", "an index that does not match the WHERE clause"]
    ] },

    { t: "callout", kind: "tradeoff", title: "Indexes are not free",
      body: [
        { t: "p", text: "Every index is updated on every insert, update and delete of the columns it covers, takes disk and memory, and competes for the buffer cache. A table with fifteen indexes is a write-heavy table that has become slow to write. Index for the queries you actually run — `pg_stat_statements` lists them by total time — and drop indexes that `pg_stat_user_indexes` shows are never used." }
      ] },

    { t: "exercise", kind: "Challenge", title: "One index for every customer",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A marketplace's order page runs: the 20 most recent **paid** orders for a customer. One customer is a huge seller with 200,000 orders; most have about ten. Try no index, an index on `customer_id`, an index on `created_at`, and a composite index, and time the query for both a big seller and a small shop. Which index serves both?" }
      ],
      requirements: [
        "A million-row orders table with one very large customer",
        "EXPLAIN ANALYZE timings for both customers under each index",
        "Report the plan shape for the small shop",
        "Explain why each single-column index fails one of the two customers"
      ],
      hint: "Equality columns first, then the column you ORDER BY, in the same direction: an index on (customer_id, status, created_at DESC) can return the first 20 matching rows already in order and stop.",
      solution: { lang: "python", title: "index_ex.py",
        code: `import psycopg

db = psycopg.connect("host=127.0.0.1 port=5433 user=postgres dbname=postgres", autocommit=True)
db.execute("DROP TABLE IF EXISTS ex_orders")
db.execute("""CREATE TABLE ex_orders AS
    SELECT g AS id,
           CASE WHEN g % 5 = 0 THEN 1 ELSE 2 + g % 100000 END AS customer_id,     -- customer 1 is a huge seller
           (ARRAY['placed', 'paid', 'shipped', 'delivered'])[1 + (g / 7) % 4] AS status,
           now() - (g % 525600) * interval '1 minute' AS created_at
    FROM generate_series(1, 1000000) g""")
db.execute("ANALYZE ex_orders")

QUERY = """SELECT id, created_at FROM ex_orders
           WHERE customer_id = %s AND status = 'paid' ORDER BY created_at DESC LIMIT 20"""

def plan(customer):
    lines = [r[0].strip() for r in db.execute("EXPLAIN (ANALYZE, COSTS OFF) " + QUERY, (customer,)).fetchall()]
    nodes = [l.lstrip("-> ").split(" (actual")[0] for l in lines if "actual" in l]
    total = next(l for l in lines if l.startswith("Execution Time")).split(": ")[1]
    return total, " > ".join(n.split(" on ")[0] for n in nodes)

print(f"{'index':<40} {'big seller':>11} {'small shop':>11}   plan for the small shop")
for label, ddl in (("none", None),
                   ("(customer_id)", "CREATE INDEX i1 ON ex_orders (customer_id)"),
                   ("(created_at)", "CREATE INDEX i2 ON ex_orders (created_at)"),
                   ("(customer_id, status, created_at DESC)", "CREATE INDEX i3 ON ex_orders (customer_id, status, created_at DESC)")):
    if ddl:
        for old in ("i1", "i2"): db.execute(f"DROP INDEX IF EXISTS {old}")
        db.execute(ddl)
    big, _ = plan(1); small, nodes = plan(4243)
    print(f"{label:<40} {big:>11} {small:>11}   {nodes}")
count = lambda c: db.execute("SELECT count(*) FROM ex_orders WHERE customer_id = %s", (c,)).fetchone()[0]
print(f"orders: big seller (customer 1) {count(1):,}, small shop (customer 4243) {count(4243)}")`,
        out: `index                                     big seller  small shop   plan for the small shop
none                                       32.180 ms   25.514 ms   Limit > Sort > Gather > Parallel Seq Scan
(customer_id)                              30.861 ms    0.079 ms   Limit > Sort > Bitmap Heap Scan > Bitmap Index Scan
(created_at)                                0.210 ms   30.455 ms   Limit > Sort > Gather > Parallel Seq Scan
(customer_id, status, created_at DESC)      0.054 ms    0.040 ms   Limit > Index Scan using i3
orders: big seller (customer 1) 200,000, small shop (customer 4243) 10`,
        notes: [
          { t: "p", text: "The `customer_id` index was perfect for the small shop and useless for the big seller: it found all 200,000 of the seller's orders, which then had to be filtered and sorted. The `created_at` index was the reverse: walking backwards through time finds the big seller's 20 recent paid orders almost immediately, because they are everywhere, but finds the small shop's only after a long search, so the planner chose a full scan. Each single-column index matched one data distribution." },
          { t: "p", text: "The composite index matched the query itself — equality on customer and status, then order by time — so for any customer PostgreSQL descends to the right place and reads exactly 20 entries in order, with no sort: about 0.1 ms or less for both. Design indexes from the query's WHERE and ORDER BY, and test them with skewed data, because real data is skewed." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the database that got slower when it got more connections",
      body: [
        { t: "p", text: "**Symptom.** After an autoscaling change let the application grow from 10 to 60 instances during a sale, database CPU hit 100%, query latency rose twentyfold, and the site slowed to a crawl — although the extra instances were added precisely to handle more traffic." },
        { t: "p", text: "**Mechanism.** Each instance opened a pool of 20 connections, so the database went from 200 to 1,200 connections on a 16-core server. Each connection is a process; with hundreds runnable at once, the server spent its time context-switching and fighting over locks, and per-query latency climbed until requests timed out and retried. The pgbench curve, at production scale." },
        { t: "p", text: "**Fix.** PgBouncer in transaction mode in front of the primary, with 40 server connections; application pools reduced to 10 connections each to PgBouncer; a hard cap on autoscaling tied to the database's capacity; and the two N+1-heavy pages fixed, which cut query volume by half. The next sale ran at 55% database CPU." }
      ] }
  ],

  takeaways: [
    "A database connection is expensive: measured, connecting per query was **~40× slower** than reusing a connection, on localhost without TLS.",
    "Use a **pool**; size it from Little's law at peak, and watch pool wait time.",
    "More connections than cores makes a database **slower**: measured, throughput **peaked at 4 connections on 4 cores** and fell ~35%, while latency rose **36×** at 90.",
    "Start from about **cores × 2 + spindles** for the database's total connections, shared by all instances.",
    "**PgBouncer** in transaction mode multiplexes many client connections onto a few server connections — but breaks session state.",
    "**N+1**: a lazy relationship in a loop made **101 queries** for 100 rows; a join made 1, an IN query 2. Count queries per request.",
    "Read plans for one thing first: **index or table scan?** An index took a lookup from **~30 ms to ~0.1 ms**.",
    "Functions on columns defeat plain indexes; use an **expression index**.",
    "Design **composite indexes** from WHERE equality columns then ORDER BY — measured, one composite index served both a 200,000-order seller and a 10-order shop in about 0.1 ms or less.",
    "Indexes cost writes and memory; index the queries you run and drop the ones never used."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A 16-core PostgreSQL server is slow at 800 connections. What is the most likely improvement?",
        options: ["Raise max_connections to 2,000", "Put PgBouncer in front and give PostgreSQL a few dozen server connections", "Add more application instances", "Disable connection pooling"],
        answer: 1,
        why: "Beyond roughly the core count, more connections add context switching and contention, as pgbench showed. A pooler lets many clients share a small number of busy server connections. More connections or instances make it worse, and removing pooling adds connection set-up to every query." },

      { stem: "A page shows 50 orders with their customer names and makes 51 queries. What is happening and how is it fixed?",
        options: ["The database is missing an index", "A lazy-loaded relationship runs one query per order (N+1); eager-load with a join or one IN query", "The cache is cold", "The connection pool is too small"],
        answer: 1,
        why: "One query for the list plus one per row is the N+1 pattern. A join or a batched IN query fetches all names in one or two round trips. An index or a cache would make each of the 51 queries cheaper but would not remove the round trips." },

      { stem: "There is an index on email, but WHERE lower(email) = 'a@b.com' scans the whole table. Why?",
        options: ["PostgreSQL cannot index text", "The index stores email values, not lower(email) values, so it cannot answer a comparison on the function's result; an expression index on lower(email) can", "The table needs VACUUM", "The query needs a LIMIT"],
        answer: 1,
        why: "An index can be used only when the query compares the same expression it indexes. Indexing lower(email) — or storing a normalised column — fixes it; the demo went from over 100 ms to about 0.1 ms. Text is indexable, and neither VACUUM nor LIMIT changes which expression is indexed." },

      { stem: "Which index best serves WHERE customer_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 20?",
        options: ["(created_at)", "(customer_id)", "(customer_id, status, created_at DESC)", "(status)"],
        answer: 2,
        why: "Equality columns first, then the sort column in the sort direction, lets the database jump to the matching range and read 20 entries already in order. Each single-column index failed for some customers in the exercise, and status alone matches a quarter of the table." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Database questions reward specific mechanisms and numbers.",
    questions: [
      { level: "core",
        q: "How do you size a database connection pool for a service with many instances?",
        strong: "A strong answer starts from the database's capacity, uses Little's law, and mentions a pooler.",
        answer: [
          { t: "p", text: "From the database's side first: it runs best with a modest number of active connections, on the order of cores × 2 plus spindles, so that is the total budget across all instances. From the application side, Little's law gives the busy connections needed at peak: queries per second times connection hold time, with headroom." },
          { t: "p", text: "If instances × pool size exceeds the database budget, I put PgBouncer in transaction mode in front, so instances can keep local pools while the database sees a small set of server connections, and I cap autoscaling accordingly. Then I validate with a load test and watch pool wait time, database CPU and active connections." }
        ] },

      { level: "core",
        q: "A query is slow. How do you investigate?",
        strong: "A strong answer is methodical: find the query, read the plan, fix the access path, and verify.",
        answer: [
          { t: "p", text: "Find the queries that cost the most in total from pg_stat_statements, not just the slowest single one. Run EXPLAIN ANALYZE with realistic parameters, including skewed ones, and look first at how rows are found: sequential scans on large tables, large Rows Removed by Filter, sorts that an index could provide, nested loops over unindexed joins." },
          { t: "p", text: "Then fix the access path: an index matching WHERE equality columns then ORDER BY, an expression index for functions, a covering index for hot reads, or a rewrite. I also check the application side — N+1 patterns and missing batching — and verify the improvement under load, watching write cost if I added an index." }
        ] },

      { level: "advanced",
        q: "What are the trade-offs of PgBouncer's transaction pooling mode?",
        strong: "A strong answer explains the multiplexing benefit and the specific session features it breaks.",
        answer: [
          { t: "p", text: "It lets thousands of client connections share a few dozen server connections, because a server connection is attached to a client only for the duration of a transaction. That keeps PostgreSQL near its efficient concurrency and makes application connection churn cheap." },
          { t: "p", text: "The cost is that session state does not survive between transactions: session SET, session advisory locks, LISTEN/NOTIFY, temporary tables and, depending on the version, prepared statements. I use transaction-scoped equivalents, a separate session-mode pool for clients that need sessions, and watch PgBouncer's wait queue as a capacity signal." }
        ] }
    ]
  }
});
