/* ============================================================================
   LESSON 6.4 — The Outbox Pattern and Change Data Capture
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "A service that saves an order and then publishes `OrderPlaced` is writing to two systems — the database and the broker — with no transaction spanning both. Whichever it does first, a crash or an outage between the two leaves them disagreeing: an order nobody hears about, or an announcement of an order that does not exist. This **dual-write problem** is behind a large share of \"the systems drifted apart\" incidents. The fix is to write to **one** system: put the event in the database in the same transaction as the change — the **outbox** — or read the changes straight from the database's own log — **change data capture**.",

  objectives: [
    "Explain why writing to a database and a broker in sequence cannot be made reliable",
    "Measure lost and phantom events under both dual-write orderings",
    "Implement the transactional outbox and a relay, and say what it guarantees",
    "Read real change events from a database's write-ahead log with logical decoding",
    "Run relays in parallel without breaking per-entity ordering"
  ],

  prerequisites: ["6.3", "4.5"],

  blocks: [

    { t: "h2", n: "01", id: "dual", text: "The dual-write problem",
      sub: "Two systems, two commits, one gap" },

    { t: "viz", title: "A dual write, and the outbox",
      caption: "Left: the database commits and then the process dies — the order exists and the event is never published. Reversing the order just moves the gap: the event is published and then the database write fails. Right: the order and the outbox row commit in one local transaction, and a separate relay publishes what is in the outbox, retrying until it succeeds.",
      svg: `<svg viewBox="0 0 760 224" width="100%" role="img"><defs><marker id="q274413accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q274413good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q274413warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q274413crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q274413violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q274413teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q274413line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">Dual write: two systems, no shared commit</text>
<rect x="4.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="60.0" y="54" text-anchor="middle" class="s-label">Service</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Database</text>
<rect x="254.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="310.0" y="54" text-anchor="middle" class="s-label">Broker</text>
<line x1="60.0" y1="64" x2="60.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="310.0" y1="64" x2="310.0" y2="206.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="60.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q274413accent)"/>
<text x="122.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">INSERT order</text>
<line x1="185.0" y1="110" x2="64.0" y2="110" style="stroke:var(--accent);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q274413accent)"/>
<text x="122.5" y="104" text-anchor="middle" class="s-sub" style="fill:var(--accent)">(committed)</text>
<rect x="4.0" y="126" width="133.8" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="70.9" y="140" text-anchor="middle" class="s-sub" style="fill:var(--ink)">crash / broker down</text>
<text x="185.0" y="170" text-anchor="middle" class="s-sub" style="font-style:italic">OrderPlaced is never published</text>
<rect x="188.79999999999995" y="176" width="177.20000000000002" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="277.4" y="190" text-anchor="middle" class="s-sub" style="fill:var(--ink)">order exists, nobody knows</text><line x1="380.0" y1="10" x2="380.0" y2="214" style="stroke:var(--line);stroke-dasharray:4 4"/><g transform="translate(390.0,0)"><defs><marker id="r170527accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="r170527good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="r170527warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="r170527crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="r170527violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="r170527teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="r170527line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">Outbox: one commit, then relay</text>
<rect x="4.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="60.0" y="54" text-anchor="middle" class="s-label">Service</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Database</text>
<rect x="254.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="310.0" y="54" text-anchor="middle" class="s-label">Relay → Broker</text>
<line x1="60.0" y1="64" x2="60.0" y2="212.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="212.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="310.0" y1="64" x2="310.0" y2="212.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="60.0" y1="82" x2="181.0" y2="82" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#r170527good)"/>
<text x="122.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--good)">BEGIN; INSERT order;</text>
<line x1="60.0" y1="110" x2="181.0" y2="110" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#r170527good)"/>
<text x="122.5" y="104" text-anchor="middle" class="s-sub" style="fill:var(--good)">INSERT outbox row; COMMIT</text>
<rect x="130.5" y="126" width="109.0" height="20" rx="5" style="fill:var(--good);fill-opacity:.16;stroke:var(--good)"/>
<text x="185.0" y="140" text-anchor="middle" class="s-sub" style="fill:var(--ink)">both or neither</text>
<line x1="310.0" y1="166" x2="189.0" y2="166" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#r170527violet)"/>
<text x="247.5" y="160" text-anchor="middle" class="s-sub" style="fill:var(--violet)">poll unsent rows</text>
<path d="M310.0 188 h-26 v14 h24" style="fill:none;stroke:var(--violet)" stroke-width="1.5" marker-end="url(#r170527violet)"/>
<text x="278.0" y="198" text-anchor="end" class="s-sub" style="fill:var(--violet)">publish, then mark sent</text></g></svg>` },

    { t: "p", text: "A thousand orders. The broker is unavailable for 3% of publishes, the process crashes between steps 2% of the time, and 2% of database commits fail. Three ways to save an order and announce it:" },

    { t: "code", lang: "python", title: "outbox.py — dual writes in both orders, and the outbox", code: `import json, random, sqlite3

def fresh():
    db = sqlite3.connect(":memory:", isolation_level=None)
    db.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, total REAL)")
    db.execute("CREATE TABLE outbox (id INTEGER PRIMARY KEY, payload TEXT, sent INTEGER DEFAULT 0)")
    return db

def run(strategy, n=1_000, seed=5):
    rng = random.Random(seed); db = fresh(); broker = []
    for oid in range(1, n + 1):
        broker_down = rng.random() < 0.03          # the publish call fails
        crash = rng.random() < 0.02                # the process dies between two steps
        db_fails = rng.random() < 0.02             # the database commit fails (constraint, failover)
        event = {"type": "OrderPlaced", "order_id": oid}
        if strategy == "commit, then publish":
            if db_fails: continue
            db.execute("INSERT INTO orders VALUES (?, 9.99)", (oid,))
            if crash or broker_down: continue      # committed, event never sent
            broker.append(event)
        elif strategy == "publish, then commit":
            if broker_down: continue
            broker.append(event)                   # announced...
            if crash or db_fails: continue         # ...but the order was never stored
            db.execute("INSERT INTO orders VALUES (?, 9.99)", (oid,))
        else:                                      # outbox: one local transaction
            if db_fails: continue
            db.execute("BEGIN")
            db.execute("INSERT INTO orders VALUES (?, 9.99)", (oid,))
            db.execute("INSERT INTO outbox (payload) VALUES (?)", (json.dumps(event),))
            db.execute("COMMIT")
        if strategy == "outbox":                   # the relay: a separate loop, retried forever
            for row_id, payload in db.execute("SELECT id, payload FROM outbox WHERE sent = 0").fetchall():
                if rng.random() < 0.03: break      # broker down: try again next time
                broker.append(json.loads(payload))
                if rng.random() < 0.02: break      # relay crashes before marking: will resend
                db.execute("UPDATE outbox SET sent = 1 WHERE id = ?", (row_id,))
    stored = {r[0] for r in db.execute("SELECT id FROM orders")}
    announced = [e["order_id"] for e in broker]
    return (len(stored), len(stored - set(announced)), len(set(announced) - stored),
            len(announced) - len(set(announced)))

print("%-22s %8s %22s %22s %12s" % ("strategy", "orders", "stored, never announced",
      "announced, never stored", "duplicates"))
for s in ("commit, then publish", "publish, then commit", "outbox"):
    print("%-22s %8d %22d %22d %12d" % (s, *run(s)))`,
      out: `strategy                 orders stored, never announced announced, never stored   duplicates
commit, then publish        986                     49                      0            0
publish, then commit        937                      0                     32            0
outbox                      989                      0                      0           22`,
      hl: [19, 24, 28, 30, 31, 35, 37],
      caption: "**Commit, then publish** stored dozens of orders that were never announced — the warehouse never ships them. **Publish, then commit** announced dozens of orders that do not exist — the warehouse ships orders nobody paid for. The **outbox** lost nothing and invented nothing; its only imperfection is **duplicates**, from a relay that published and crashed before marking the row sent — which the idempotent consumers of 6.3 absorb." },

    { t: "callout", kind: "trap", title: "\"We publish after commit and retry on failure\"",
      body: [
        { t: "p", text: "Retrying the publish in the request handler fixes the broker-down case and not the crash case: if the process dies after the commit, there is no handler left to retry. Publishing from a database trigger or an `after_commit` hook has the same gap. Every dual-write fix that lives in the application's memory fails the moment the application does." },
        { t: "p", text: "The test is simple: **after a crash at any instruction, is the intent to publish still recorded somewhere durable?** With an outbox it is — a row, in the same commit as the order. With CDC it is — the WAL record of the order itself. With anything else it is not." }
      ] },

    { t: "h2", n: "02", id: "outbox", text: "The transactional outbox",
      sub: "The event is just another row" },

    { t: "diagram", kind: "steps", title: "Outbox, end to end",
      caption: "Delivery is at-least-once — the relay may publish a row twice if it crashes before marking it — so every consumer must be idempotent on the event id (6.3). In exchange, the event and the state change are atomic: one never exists without the other.",
      items: [
        { label: "One local transaction", desc: "INSERT the order and INSERT an outbox row with the event payload, then COMMIT", code: "atomic", tone: "good" },
        { label: "A relay polls the outbox", desc: "unsent rows, oldest first, in batches — or tails them via CDC", code: "WHERE sent_at IS NULL", tone: "accent" },
        { label: "Publish to the broker", desc: "keyed by the aggregate id so per-order ordering is kept (6.2)", code: "key = order id", tone: "violet" },
        { label: "Mark the rows sent", desc: "only after the broker acknowledged; a crash before this republishes", code: "at-least-once", tone: "warn" },
        { label: "Prune old rows", desc: "delete or archive sent rows after a retention window", code: "housekeeping", tone: "teal" }
      ] },

    { t: "h2", n: "03", id: "cdc", text: "Change data capture",
      sub: "Read the database's own log" },

    { t: "p", text: "Every committed change is already written to the database's write-ahead log (4.5) in commit order. **Change data capture** reads that log and turns it into a stream of events, with no change to the application at all. PostgreSQL exposes it through logical decoding; this creates a replication slot — a durable cursor into the WAL — makes ordinary writes, and reads what the slot captured:" },

    { t: "code", lang: "python", title: "cdc.py — logical decoding on PostgreSQL 16", code: `import psycopg

DSN = "host=127.0.0.1 port=5433 user=postgres"
with psycopg.connect(DSN, autocommit=True) as c:
    c.execute("SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE slot_name = 'search_indexer'")
    c.execute("DROP TABLE IF EXISTS products")
    c.execute("CREATE TABLE products (id int PRIMARY KEY, name text, price numeric)")
    # A CDC consumer (Debezium, a search indexer) owns a replication slot: a cursor into the WAL.
    c.execute("SELECT pg_create_logical_replication_slot('search_indexer', 'test_decoding')")

    # The application just does ordinary writes. It knows nothing about the consumer.
    c.execute("INSERT INTO products VALUES (1, 'Kettle', 30.00), (2, 'Mug', 8.50)")
    with c.transaction():
        c.execute("UPDATE products SET price = 27.00 WHERE id = 1")
        c.execute("DELETE FROM products WHERE id = 2")
    try:
        with c.transaction():
            c.execute("UPDATE products SET price = 0 WHERE id = 1")
            raise RuntimeError("rolled back")
    except RuntimeError:
        pass

    for (lsn, xid, data) in c.execute("SELECT lsn, xid, data FROM pg_logical_slot_get_changes('search_indexer', NULL, NULL)"):
        print(f"{str(lsn):<12} {data}")
    c.execute("SELECT pg_drop_replication_slot('search_indexer')")`,
      out: `0/17DF0A0    BEGIN 2183
0/17DF0A0    table public.products: INSERT: id[integer]:1 name[text]:'Kettle' price[numeric]:30.00
0/17DF188    table public.products: INSERT: id[integer]:2 name[text]:'Mug' price[numeric]:8.50
0/17DF240    COMMIT 2183
0/17DF240    BEGIN 2184
0/17DF240    table public.products: UPDATE: id[integer]:1 name[text]:'Kettle' price[numeric]:27.00
0/17DF298    table public.products: DELETE: id[integer]:2
0/17DF308    COMMIT 2184`,
      hl: [9, 12, 14, 15, 18, 23],
      caption: "Every committed change appears once, grouped by transaction, in commit order — including the delete. The transaction that **rolled back does not appear at all**, because it never committed to the log. Tools such as Debezium do exactly this against PostgreSQL, MySQL's binlog or MongoDB's oplog, and publish each change to Kafka." },

    { t: "diagram", kind: "compare", title: "Outbox or CDC",
      caption: "They combine well: CDC can be used *as* the outbox relay, tailing the outbox table instead of polling it — the events are designed, and their delivery is driven by the log.",
      columns: [
        { title: "Transactional outbox", tone: "good", items: [
          "events are designed: OrderPlaced, with the fields consumers need",
          "the application chooses what to publish",
          "needs a relay process and table housekeeping",
          "polling adds a little latency",
          "best for: domain events between services"
        ] },
        { title: "Change data capture", tone: "violet", items: [
          "events are row changes: table, operation, columns",
          "no application change; catches every writer",
          "exposes your schema to consumers — renames break them",
          "needs slot monitoring: a stuck slot keeps WAL forever",
          "best for: replicas, search indexes, caches, warehouses"
        ] }
      ] },

    { t: "callout", kind: "warn", title: "A replication slot that nobody reads fills the disk",
      body: [
        { t: "p", text: "A replication slot promises that the database will keep every WAL segment its consumer has not yet read. If the CDC consumer stops — a crashed connector, a deleted pipeline that forgot to drop its slot — the database keeps WAL indefinitely, and the primary's disk fills until it stops accepting writes. Alert on retained WAL per slot (`pg_replication_slots`, `max_slot_wal_keep_size` in PostgreSQL 13+) and drop slots you no longer use." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Two relays, and ordering per order",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "One relay cannot keep up, so you run two against the same outbox table in PostgreSQL. Each order emits `created`, `paid`, `shipped`, and consumers rely on receiving them in that order." }
      ],
      requirements: [
        "Let both relays claim batches with `SELECT … FOR UPDATE SKIP LOCKED` so they never take the same rows",
        "Add a small random delay before each publish, as a real network has",
        "Count duplicates and events published out of order within an order",
        "Change the relays so ordering per order is preserved, and measure again",
        "Explain why SKIP LOCKED alone does not preserve ordering"
      ],
      hint: "Two relays working on different batches can publish them in either order. What if each relay only ever handled a fixed subset of orders?",
      solution: { lang: "python", title: "relay_ex.py",
        code: `import random, threading, time, psycopg

DSN = "host=127.0.0.1 port=5433 user=postgres"
with psycopg.connect(DSN, autocommit=True) as c:
    c.execute("DROP TABLE IF EXISTS outbox")
    c.execute("""CREATE TABLE outbox (id bigserial PRIMARY KEY, aggregate text, seq int,
                 payload text, sent_at timestamptz)""")
    c.execute("CREATE INDEX outbox_unsent ON outbox (id) WHERE sent_at IS NULL")
    for order in range(1, 101):                       # 100 orders x 3 events, in order per order
        for seq, ev in enumerate(("created", "paid", "shipped")):
            c.execute("INSERT INTO outbox (aggregate, seq, payload) VALUES (%s, %s, %s)",
                      (f"order-{order}", seq, ev))

published, lock = [], threading.Lock()

def relay(name, shard=None):
    rng = random.Random(name)
    where = "" if shard is None else "AND abs(hashtext(aggregate)) %% 2 = %d" % shard
    with psycopg.connect(DSN) as c:
        while True:
            with c.transaction():
                rows = c.execute(f"""SELECT id, aggregate, seq FROM outbox
                                     WHERE sent_at IS NULL {where} ORDER BY id
                                     LIMIT 25 FOR UPDATE SKIP LOCKED""").fetchall()
                if not rows: return
                time.sleep(rng.uniform(0, 0.005))     # network jitter before the publish lands
                with lock:                            # "publish" the batch, in id order
                    published.extend((agg, seq, name) for _, agg, seq in rows)
                c.execute("UPDATE outbox SET sent_at = now() WHERE id = ANY(%s)", ([r[0] for r in rows],))

def trial(sharded):
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute("UPDATE outbox SET sent_at = NULL")
    published.clear()
    threads = [threading.Thread(target=relay, args=(f"relay-{i}", i if sharded else None)) for i in (0, 1)]
    for t in threads: t.start()
    for t in threads: t.join()
    last, out_of_order = {}, 0
    for agg, seq, _ in published:
        if seq < last.get(agg, -1): out_of_order += 1
        last[agg] = seq
    dup = len(published) - len({(a, s) for a, s, _ in published})
    print("%-38s published %d, duplicates %d, out of order within an order %d"
          % ("two relays, SKIP LOCKED" + (", by aggregate" if sharded else ""), len(published), dup, out_of_order))

trial(sharded=False)
trial(sharded=True)`,
        out: `two relays, SKIP LOCKED                published 300, duplicates 0, out of order within an order 2
two relays, SKIP LOCKED, by aggregate  published 300, duplicates 0, out of order within an order 0`,
        notes: [
          { t: "p", text: "SKIP LOCKED makes the relays **disjoint** — no row is taken twice — but not **ordered**: when one order's events straddle two batches claimed by different relays, whichever publish lands first wins, and a few orders were delivered out of sequence. Disjoint work and ordered work are different properties." },
          { t: "p", text: "Sharding the relays by a hash of the aggregate id gives each order exactly one relay, so its events are published by one process in id order — the same idea as keying a Kafka partition by order id (6.2), applied one step earlier. The relays still scale out; they just scale by aggregate rather than by batch." },
          { t: "p", text: "The outbox's `ORDER BY id` relies on ids reflecting commit order, which a sequence only approximates: two transactions can take ids 101 and 102 and commit in the opposite order. Where strict per-aggregate order matters, add a per-aggregate sequence number to the event (as here) so consumers can detect and hold an early arrival — or use CDC, which reads changes in true commit order." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the search index that slowly forgot products",
      body: [
        { t: "p", text: "**Symptom.** Merchants reported that some products they edited never updated in search results, and a few new products never appeared at all. A full reindex fixed it; three weeks later the drift was back, at a few hundred products per week." },
        { t: "p", text: "**Mechanism.** The catalogue service updated PostgreSQL and then published a change event to the search indexer in the request handler. Deploys killed in-flight requests; occasional broker timeouts were logged and swallowed. Every one of those was a dual-write gap — committed product, no event — and nothing recorded that an event was owed. The weekly drift was simply the rate of deploys and timeouts." },
        { t: "p", text: "**Fix.** The indexer now consumes a Debezium CDC stream of the products table, so every committed change reaches search regardless of which code path made it — including the admin scripts that had never published events at all. Indexing is an idempotent upsert keyed by product id, and a nightly job compares counts and checksums between the database and the index. The weekly full reindex was retired." }
      ] }
  ],

  takeaways: [
    "Writing to a database and a broker in sequence is a **dual write**: a crash between them leaves the two disagreeing, whichever goes first.",
    "Measured: **commit-then-publish** stored orders never announced; **publish-then-commit** announced orders never stored.",
    "Retrying in memory cannot fix it: **after a crash, the intent to publish must already be durable**.",
    "The **transactional outbox** writes the event as a row in the same transaction as the change; a relay publishes it — **no loss, no phantoms, possible duplicates**.",
    "Outbox delivery is **at-least-once**; consumers must be idempotent on the event id (6.3).",
    "**Change data capture** reads committed changes from the WAL in commit order — measured on PostgreSQL, a rolled-back transaction never appears.",
    "Outbox for **designed domain events**; CDC for **replicas, search, caches and warehouses** — or CDC tailing the outbox table.",
    "An unread **replication slot retains WAL forever** and can fill the primary's disk: monitor and drop unused slots.",
    "Parallel relays with SKIP LOCKED are disjoint but **not ordered**; shard relays by aggregate to keep per-entity order."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service commits an order, then publishes OrderPlaced, retrying the publish three times on failure. What can still go wrong?",
        options: ["Nothing; retries make it reliable", "The process can crash after the commit, and the event is never published", "The order can be committed twice", "The event can be published before the order exists"],
        answer: 1,
        why: "Retries live in the process's memory, so a crash after the database commit leaves no one to publish — the order exists and nobody downstream knows. Committing first prevents phantom events, which is the opposite ordering's failure, and nothing here commits the order twice." },

      { stem: "What does the transactional outbox guarantee?",
        options: ["Exactly-once delivery to consumers", "The state change and the event record commit together, so an event is published at least once for every committed change and never for an uncommitted one", "Events are delivered faster", "Global ordering across all events"],
        answer: 1,
        why: "Because the outbox row is written in the same transaction as the change, either both exist or neither does, and the relay keeps trying until each row is published — at least once, possibly twice. It does not provide exactly-once delivery, it adds a little latency rather than removing it, and it gives no ordering beyond what the relay and keys preserve." },

      { stem: "A CDC stream is read from PostgreSQL's logical decoding. A transaction updates a row and then rolls back. What does the stream show?",
        options: ["The update, followed by a compensating update", "Nothing — rolled-back changes are not decoded", "The update only", "An error event"],
        answer: 1,
        why: "Logical decoding emits changes from committed transactions, in commit order; a transaction that rolls back never commits, so its changes never appear — the cdc.py run shows the rolled-back price change absent. No compensating or error events are generated." },

      { stem: "Why is an abandoned replication slot dangerous?",
        options: ["It slows down reads", "The database keeps all WAL the slot has not consumed, which can fill the disk and stop writes", "It duplicates every write", "It locks the tables it watches"],
        answer: 1,
        why: "A slot guarantees its consumer will be able to read every change, so the database retains WAL from the slot's position onward; with no consumer, retention grows without limit until the disk is full. Reads are unaffected, writes are not duplicated, and logical decoding takes no table locks." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The phrase to use is \"dual write\" — and then never do one.",
    questions: [
      { level: "core",
        q: "How do you reliably publish an event when a database row changes?",
        strong: "A strong answer names the dual-write problem and gives the outbox and CDC with their delivery semantics.",
        answer: [
          { t: "p", text: "Not by writing to the database and then the broker: that is a dual write, and a crash between the two leaves them inconsistent in either order. I would use a transactional outbox: in the same transaction as the change, insert a row describing the event into an outbox table; a relay process reads unsent rows, publishes them keyed by the entity id, and marks them sent." },
          { t: "p", text: "That gives at-least-once delivery with no lost or phantom events, so consumers deduplicate on the event id. Alternatively, change data capture reads the database's WAL — Debezium on PostgreSQL or MySQL — which needs no application change and catches every writer, at the cost of exposing row-level changes rather than designed events. Often the best combination is CDC tailing the outbox table." }
        ] },

      { level: "advanced",
        q: "Outbox or CDC — which do you choose?",
        strong: "A strong answer chooses by event design, coupling and operational cost.",
        answer: [
          { t: "p", text: "For events between services I prefer the outbox: the event is a deliberate contract — OrderPlaced with the fields consumers need — not my table schema, so I can refactor tables without breaking consumers. For data movement — replicas, search indexes, caches, warehouses — CDC is better: it catches every change from every code path, including scripts and migrations, with no application changes." },
          { t: "p", text: "Operationally, CDC needs replication-slot monitoring, because a stuck consumer makes the database retain WAL until the disk fills; the outbox needs a relay and table pruning. Using CDC as the outbox relay gets designed events with log-driven delivery." }
        ] },

      { level: "core",
        q: "Your outbox relay is too slow. How do you scale it without breaking ordering?",
        strong: "A strong answer distinguishes disjoint work from ordered work and shards by aggregate.",
        answer: [
          { t: "p", text: "First the cheap fixes: batch publishes, an index on unsent rows, and pruning sent rows so the table stays small. Then multiple relays — but SKIP LOCKED only makes their batches disjoint; two relays can still publish one order's events in the wrong order if they straddle batches." },
          { t: "p", text: "So I shard relays by a hash of the aggregate id: each order is owned by exactly one relay, which publishes its events in sequence. Consumers still carry a per-aggregate sequence number to detect gaps, because outbox ids only approximate commit order." }
        ] }
    ]
  }
});
