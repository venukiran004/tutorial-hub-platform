/* ============================================================================
   LESSON 10.4 — Event Sourcing and CQRS
   ========================================================================= */
EC.receiveLesson({
  id: "10.4",

  lede: "Most systems store **what is**: a row with the current balance, overwritten on every change. **Event sourcing** stores **what happened** — an append-only log of events — and derives current state by replaying them, which gives a complete audit trail, state at any past moment, and the ability to answer questions nobody planned for. **CQRS** separates the model that accepts changes from the models that answer queries, so each can be shaped and scaled for its job. Together they are powerful and genuinely complex: concurrency through versioned appends, snapshots for long histories, read models that lag the writes, and event schemas that must stay readable for years. All of it is run here against a real PostgreSQL.",

  objectives: [
    "Store events in an append-only PostgreSQL table and rebuild state by replaying them",
    "Use the stream version for optimistic concurrency, so two writers cannot both succeed",
    "Measure what snapshots save on long streams",
    "Build a projection with a checkpoint, and handle the lag between write and read",
    "Evolve event schemas with upcasters, and decide when the pattern is worth its cost"
  ],

  prerequisites: ["10.2", "6.4", "5.2"],

  blocks: [

    { t: "h2", n: "01", id: "es", text: "Event sourcing",
      sub: "The log is the truth; state is a fold over it" },

    { t: "viz", title: "Storing what is, and storing what happened",
      caption: "Left: a CRUD row holds only the latest balance; every update destroys the previous value. Right: an event-sourced account holds the four things that happened. The balance is computed by folding over them — all four give 2,000, the first two give 10,000 as of version 2 — and the same log can feed any number of read models, including ones invented later.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="Current state against an event log">
<defs><marker id="es-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="150" y="20" text-anchor="middle" class="s-label" style="fill:var(--warn)">Storing what IS</text>
<rect x="30" y="40" width="240" height="56" rx="8" class="s-fill s-stroke"/>
<text x="44" y="62" class="s-sub">accounts</text><line x1="30" y1="70" x2="270" y2="70" style="stroke:var(--line)"/>
<text x="44" y="88" class="s-mono">acct-7</text><text x="256" y="88" text-anchor="end" class="s-mono">balance 2000</text>
<text x="150" y="126" text-anchor="middle" class="s-sub">each update overwrites the last:</text>
<text x="150" y="144" text-anchor="middle" class="s-sub">how it got to 2000 is gone,</text>
<text x="150" y="162" text-anchor="middle" class="s-sub">unless someone also wrote an audit log</text>
<line x1="300" y1="30" x2="300" y2="226" style="stroke:var(--line);stroke-dasharray:4 4"/>
<text x="530" y="20" text-anchor="middle" class="s-label" style="fill:var(--good)">Storing what HAPPENED</text>
<rect x="330" y="36" width="230" height="30" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
<text x="344" y="56" class="s-mono" style="fill:var(--ink-3)">v1</text><text x="380" y="56" class="s-mono">Opened</text><text x="546" y="56" text-anchor="end" class="s-mono">0</text>
<rect x="330" y="72" width="230" height="30" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
<text x="344" y="92" class="s-mono" style="fill:var(--ink-3)">v2</text><text x="380" y="92" class="s-mono">Deposited</text><text x="546" y="92" text-anchor="end" class="s-mono">10000</text>
<rect x="330" y="108" width="230" height="30" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
<text x="344" y="128" class="s-mono" style="fill:var(--ink-3)">v3</text><text x="380" y="128" class="s-mono">Withdrawn</text><text x="546" y="128" text-anchor="end" class="s-mono">3000</text>
<rect x="330" y="144" width="230" height="30" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
<text x="344" y="164" class="s-mono" style="fill:var(--ink-3)">v4</text><text x="380" y="164" class="s-mono">Withdrawn</text><text x="546" y="164" text-anchor="end" class="s-mono">5000</text>
<text x="445" y="194" text-anchor="middle" class="s-sub">append only; never updated</text>
<line x1="562" y1="105" x2="618" y2="105" style="stroke:var(--good)" stroke-width="1.5" marker-end="url(#es-a)"/><text x="590" y="97" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">fold all</text>
<rect x="620" y="88" width="120" height="34" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="680.0" y="109.0" text-anchor="middle" class="s-label">2000</text>
<path d="M562 69 Q600 60 618 50" style="fill:none;stroke:var(--violet);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#es-a)"/>
<rect x="620" y="34" width="120" height="34" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="680.0" y="55.0" text-anchor="middle" class="s-label">10000</text>
<text x="680" y="82" text-anchor="middle" class="s-sub" style="fill:var(--violet)">at v2: time travel</text>
<text x="530" y="222" text-anchor="middle" class="s-sub" style="fill:var(--good)">state is derived: any point in time, any new projection</text>
</svg>` },

    { t: "p", text: "An event store needs very little: a table where each event has a **stream** (one aggregate, 10.2), a **version** within that stream, a type and a payload. The primary key on stream and version does the important work: it makes **optimistic concurrency** free, because two writers that both loaded version 3 cannot both append version 4. Here two withdrawals of 5,000 race against a balance of 7,000:" },

    { t: "code", lang: "python", title: "es.py — an event store in PostgreSQL, a race, and time travel", code: `import threading, psycopg
from psycopg.types.json import Jsonb

DSN = "host=127.0.0.1 port=5433 user=postgres dbname=postgres"
with psycopg.connect(DSN, autocommit=True) as c:
    c.execute("DROP TABLE IF EXISTS events")
    c.execute("""CREATE TABLE events (
        position   bigserial,                       -- global order: projections read from here
        stream_id  text      NOT NULL,
        version    int       NOT NULL,              -- per-stream order
        type       text      NOT NULL,
        data       jsonb     NOT NULL,
        at         timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (stream_id, version))""")     # two writers cannot both append version N

class Conflict(Exception): pass

def load(conn, stream):
    return conn.execute("SELECT version, type, data FROM events WHERE stream_id = %s ORDER BY version", (stream,)).fetchall()

def append(conn, stream, expected_version, type_, data):
    try:
        conn.execute("INSERT INTO events (stream_id, version, type, data) VALUES (%s, %s, %s, %s)",
                     (stream, expected_version + 1, type_, Jsonb(data)))
    except psycopg.errors.UniqueViolation: raise Conflict(stream) from None

def balance(history):                                # current state is a fold over the events
    total = 0
    for _, type_, data in history:
        total += data["pence"] if type_ == "Deposited" else -data["pence"]
    return total

def withdraw(stream, pence, who, log):
    with psycopg.connect(DSN, autocommit=True) as conn:
        while True:
            history = load(conn, stream); version = len(history)
            if balance(history) < pence:
                log.append(f"{who}: refused, balance {balance(history)} < {pence}"); return
            try:
                append(conn, stream, version, "Withdrawn", {"pence": pence, "by": who})
                log.append(f"{who}: withdrew {pence} as version {version + 1}"); return
            except Conflict:
                log.append(f"{who}: conflict on version {version + 1}, reloading")

with psycopg.connect(DSN, autocommit=True) as conn:
    append(conn, "acct-7", 0, "Opened", {"pence": 0})
    append(conn, "acct-7", 1, "Deposited", {"pence": 10_000})
    append(conn, "acct-7", 2, "Withdrawn", {"pence": 3_000})

    log, barrier = [], threading.Barrier(2)
    def go(who): barrier.wait(); withdraw("acct-7", 5_000, who, log)
    threads = [threading.Thread(target=go, args=(w,)) for w in ("card", "transfer")]
    for t in threads: t.start()
    for t in threads: t.join()
    print("two withdrawals of 5,000 race against a balance of 7,000:")
    for line in log: print("  " + line)

    history = load(conn, "acct-7")
    print("the stream:", ", ".join(f"v{v} {t} {d['pence']}" for v, t, d in history))
    print("balance now:", balance(history), "| balance after version 2 (time travel):", balance(history[:2]))`,
      hl: [14, 25, 27, 42],
      out: `two withdrawals of 5,000 race against a balance of 7,000:
  card: withdrew 5000 as version 4
  transfer: conflict on version 4, reloading
  transfer: refused, balance 2000 < 5000
the stream: v1 Opened 0, v2 Deposited 10000, v3 Withdrawn 3000, v4 Withdrawn 5000
balance now: 2000 | balance after version 2 (time travel): 10000` },

    { t: "p", text: "Whichever writer appended version 4 first won; the other hit the primary key, reloaded the stream, saw the new balance of 2,000, and was refused by the business rule — so the account never went negative, without a lock held across the check. The full history is still there, and folding only the first two events gives the balance as it was at version 2." },

    { t: "callout", kind: "insight", title: "What the log gives you",
      body: [
        { t: "p", text: "An **audit trail** that cannot drift from the data, because it is the data — the reason ledgers, banking cores and trading systems work this way. **Time travel**: state at any version or timestamp, for disputes and debugging. **Retroactive read models**: a new question (\"how often do customers withdraw within a day of depositing?\") is answered by replaying history into a new projection. And **integration**: the events are already the domain events other contexts subscribe to (6.2)." }
      ] },

    { t: "p", text: "Replaying a stream on every command is fine for an order with ten events and not for an account with a hundred thousand. A **snapshot** stores the folded state every N events; loading becomes the latest snapshot plus the events after it:" },

    { t: "code", lang: "python", title: "es_snap.py — rebuilding a 100,437-event stream, with and without snapshots", code: `import json, time, psycopg

DSN = "host=127.0.0.1 port=5433 user=postgres dbname=postgres"
conn = psycopg.connect(DSN, autocommit=True)
conn.execute("DROP TABLE IF EXISTS snap_events, snapshots")
conn.execute("CREATE TABLE snap_events (stream_id text, version int, type text, data jsonb, PRIMARY KEY (stream_id, version))")
conn.execute("CREATE TABLE snapshots (stream_id text, version int, state jsonb, PRIMARY KEY (stream_id, version))")

N, EVERY = 100_437, 1_000                              # a busy account: ~100,000 events; snapshot every 1,000
with conn.cursor().copy("COPY snap_events FROM STDIN") as copy:
    for v in range(1, N + 1):
        copy.write_row(("acct-busy", v, "Deposited", json.dumps({"pence": v % 97})))
state = 0
for v in range(1, N + 1):
    state += v % 97
    if v % EVERY == 0:
        conn.execute("INSERT INTO snapshots VALUES (%s, %s, %s)", ("acct-busy", v, json.dumps({"balance": state})))

def full_replay():
    rows = conn.execute("SELECT data FROM snap_events WHERE stream_id = %s ORDER BY version", ("acct-busy",)).fetchall()
    return sum(r[0]["pence"] for r in rows), len(rows)

def from_snapshot():
    version, snap = conn.execute("SELECT version, state FROM snapshots WHERE stream_id = %s ORDER BY version DESC LIMIT 1",
                                 ("acct-busy",)).fetchone()
    tail = conn.execute("SELECT data FROM snap_events WHERE stream_id = %s AND version > %s ORDER BY version",
                        ("acct-busy", version)).fetchall()
    return snap["balance"] + sum(r[0]["pence"] for r in tail), len(tail)

def best_of_three(fn):
    times = []
    for _ in range(3):
        start = time.perf_counter(); result = fn(); times.append(time.perf_counter() - start)
    return result, min(times)

for label, fn in (("replay every event", full_replay), ("latest snapshot + tail", from_snapshot)):
    (balance, rows), seconds = best_of_three(fn)
    print(f"{label:<24} balance {balance:,}  events read {rows:>7,}  {seconds * 1000:7.1f} ms")`,
      out: `replay every event       balance 4,819,863  events read 100,437    327.1 ms
latest snapshot + tail   balance 4,819,863  events read     437      1.7 ms` },

    { t: "p", text: "Both paths produced the same balance; replaying every event read 100,437 rows in about a third of a second, while the snapshot read 437 rows in about 2 ms. Snapshots are a cache: they can be deleted and rebuilt from the log at any time, and should be, whenever the fold logic changes." },

    { t: "h2", n: "02", id: "cqrs", text: "CQRS",
      sub: "One model to change things, others to answer questions" },

    { t: "p", text: "Command Query Responsibility Segregation splits the write model — aggregates that enforce rules — from read models shaped for each query: a summary table for the account page, a search index, an analytics cube. With event sourcing, **projectors** read the event log and keep each read model up to date. Without event sourcing, CQRS still works: the write side publishes events through an outbox (6.4) or CDC, and read models consume them." },

    { t: "viz", title: "CQRS with an event-sourced write side",
      caption: "Commands go to the aggregate, which checks the rules and appends events. Projectors consume the log asynchronously and maintain read models in whatever store fits each query; a new read model can be added at any time by replaying from the start. Queries hit only read models, so they never contend with writes — and they can be slightly behind.",
      svg: `<svg viewBox="0 0 760 262" width="100%" role="img" aria-label="CQRS with event sourcing">
<defs><marker id="es-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="20" y="20" class="s-label" style="fill:var(--accent)">write side: commands</text>
<text x="20" y="252" class="s-label" style="fill:var(--violet)">read side: queries</text>
<rect x="20" y="36" width="100" height="40" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="70.0" y="60.0" text-anchor="middle" class="s-label">client</text>
<line x1="120" y1="56" x2="188" y2="56" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#es-a)"/><text x="155" y="48" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">PlaceOrder</text>
<rect x="190" y="32" width="140" height="48" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="260.0" y="53.0" text-anchor="middle" class="s-mono">Order aggregate</text><text x="260.0" y="68.0" text-anchor="middle" class="s-sub">checks the rules</text>
<line x1="330" y1="56" x2="398" y2="56" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#es-a)"/><text x="365" y="48" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">OrderPlaced</text>
<rect x="400" y="32" width="130" height="48" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="465.0" y="53.0" text-anchor="middle" class="s-mono">event store</text><text x="465.0" y="68.0" text-anchor="middle" class="s-sub">append only</text>
<text x="465" y="100" text-anchor="middle" class="s-sub">the source of truth</text>
<line x1="530" y1="64" x2="580" y2="114" style="stroke:var(--good);stroke-dasharray:4 3" stroke-width="1.5" marker-end="url(#es-a)"/><text x="560" y="84" text-anchor="start" class="s-sub" style="fill:var(--ink-2)">projector, async</text>
<rect x="570" y="116" width="170" height="36" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="655.0" y="131.0" text-anchor="middle" class="s-mono">order summary</text><text x="655.0" y="146.0" text-anchor="middle" class="s-sub">Postgres table</text>
<rect x="570" y="160" width="170" height="36" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="655.0" y="175.0" text-anchor="middle" class="s-mono">search index</text><text x="655.0" y="190.0" text-anchor="middle" class="s-sub">Elasticsearch</text>
<rect x="570" y="204" width="170" height="36" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="655.0" y="219.0" text-anchor="middle" class="s-mono">revenue by day</text><text x="655.0" y="234.0" text-anchor="middle" class="s-sub">added later, by replay</text>
<rect x="20" y="190" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="75.0" y="214.0" text-anchor="middle" class="s-label">client</text>
<line x1="130" y1="210" x2="566" y2="140" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#es-a)"/><text x="330" y="166" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">GetOrderSummary</text>
<text x="360" y="216" text-anchor="middle" class="s-sub" style="fill:var(--warn)">reads may lag the writes by the projector&apos;s delay</text>
</svg>` },

    { t: "p", text: "That last point is the price. A projector polling every half second means a user who places an order and immediately opens the order summary may not see it. The usual fix is to return the event's **position** from the command and let the next query ask for a read model **at least that new**:" },

    { t: "code", lang: "python", title: "cqrs.py — a projector with a checkpoint, a stale read, and a read-your-writes read", code: `import threading, time, psycopg
from psycopg.types.json import Jsonb

DSN = "host=127.0.0.1 port=5433 user=postgres dbname=postgres"
setup = psycopg.connect(DSN, autocommit=True)
setup.execute("DROP TABLE IF EXISTS order_events, order_summary, checkpoints")
setup.execute("CREATE TABLE order_events (position bigserial PRIMARY KEY, order_id text UNIQUE, customer text, pence int)")
setup.execute("CREATE TABLE order_summary (customer text PRIMARY KEY, orders int, pence int)")   # the read model
setup.execute("CREATE TABLE checkpoints (projection text PRIMARY KEY, position bigint)")
setup.execute("INSERT INTO checkpoints VALUES ('order_summary', 0)")

def place_order(conn, order_id, customer, pence):        # write side: append, return where it landed
    return conn.execute("INSERT INTO order_events (order_id, customer, pence) VALUES (%s, %s, %s) RETURNING position",
                        (order_id, customer, pence)).fetchone()[0]

def project_forever(stop, every=0.5):                     # the projector: its own process in production
    conn = psycopg.connect(DSN)
    while not stop.is_set():
        with conn.transaction():                           # read-model change and checkpoint commit together
            (pos,) = conn.execute("SELECT position FROM checkpoints WHERE projection = 'order_summary' FOR UPDATE").fetchone()
            for position, customer, pence in conn.execute(
                    "SELECT position, customer, pence FROM order_events WHERE position > %s ORDER BY position", (pos,)).fetchall():
                conn.execute("""INSERT INTO order_summary VALUES (%s, 1, %s) ON CONFLICT (customer)
                                DO UPDATE SET orders = order_summary.orders + 1, pence = order_summary.pence + EXCLUDED.pence""",
                             (customer, pence))
                pos = position
            conn.execute("UPDATE checkpoints SET position = %s WHERE projection = 'order_summary'", (pos,))
        stop.wait(every)

def summary(conn, customer, at_least=None, timeout=2.0):   # read side, optionally "at least as new as my write"
    start = time.perf_counter()
    while True:
        (pos,) = conn.execute("SELECT position FROM checkpoints WHERE projection = 'order_summary'").fetchone()
        if at_least is None or pos >= at_least or time.perf_counter() - start > timeout:
            row = conn.execute("SELECT orders, pence FROM order_summary WHERE customer = %s", (customer,)).fetchone()
            return row or (0, 0), pos, (time.perf_counter() - start) * 1000
        time.sleep(0.01)

conn = psycopg.connect(DSN, autocommit=True)
for i in range(3): place_order(conn, f"o-{i}", "asha", 1000)
stop = threading.Event(); threading.Thread(target=project_forever, args=(stop,), daemon=True).start()
while summary(conn, "asha")[1] < 3: time.sleep(0.01)      # the projector has caught up on history ...
time.sleep(0.05)                                           # ... and is now between polls

written_at = place_order(conn, "o-3", "asha", 2500)
print(f"command: order o-3 for asha appended at position {written_at}")
(orders, pence), seen, _ = summary(conn, "asha")
print(f"query straight away:           {orders} orders, {pence} pence  (read model at position {seen})")
(orders, pence), seen, waited = summary(conn, "asha", at_least=written_at)
print(f"query 'at least position {written_at}':  {orders} orders, {pence} pence  (read model at position {seen}, waited {waited:.0f} ms)")
stop.set()`,
      hl: [19, 22, 27, 34],
      out: `command: order o-3 for asha appended at position 4
query straight away:           3 orders, 3000 pence  (read model at position 3)
query 'at least position 4':  4 orders, 5500 pence  (read model at position 4, waited 451 ms)` },

    { t: "p", text: "The query straight after the command saw three orders — the read model was still at position 3. The query that asked for position 4 waited until the projector's next pass, a few hundred milliseconds later, and saw four. The projector updates the read model and its checkpoint in **one transaction**, so a crash cannot apply an event twice or skip one: the projection's version of 6.3's effectively-once consumer." },

    { t: "callout", kind: "trap", title: "Sequence numbers commit out of order",
      body: [
        { t: "p", text: "The demo's projector reads `position > checkpoint`. With concurrent writers that is subtly wrong: transaction A takes position 7, transaction B takes 8 and commits first, the projector reads 8 and moves its checkpoint past 7 — and when A commits, event 7 is never projected. Production event stores close this gap by reading in **commit order** (PostgreSQL logical replication or CDC, 4.4), by serialising appends through one writer, or by only reading positions older than the oldest in-flight transaction. Kafka-based designs avoid it because a partition's offsets are assigned in append order." }
      ] },

    { t: "h2", n: "03", id: "costs", text: "The costs",
      sub: "Schemas forever, deletion, and complexity" },

    { t: "dl", items: [
      { term: "Schema evolution", def: "Events are kept forever, so every version of every event must stay readable. Add fields with defaults, never change a field's meaning, and convert old events to the current shape on read with upcasters — the exercise below." },
      { term: "Deleting personal data", def: "An immutable log conflicts with the right to erasure. The common answer is crypto-shredding: encrypt personal fields with a per-person key held elsewhere, and delete the key to make those fields unreadable while the events remain." },
      { term: "Eventual consistency", def: "Read models lag. Design the user experience for it — return the new state from the command, or wait for a position — and monitor projector lag like consumer lag (6.3)." },
      { term: "Complexity", def: "Projections, replays, snapshots, upcasting and a log that grows forever are real work. Teams new to the pattern often apply it everywhere and regret it." }
    ] },

    { t: "diagram", kind: "matrix", title: "Choosing a level",
      cols: ["Audit history", "New read models", "Complexity", "Fits"],
      rows: ["CRUD", "CRUD + outbox events", "CQRS read models", "Event sourcing + CQRS"],
      cells: [
        [{ text: "add-on, can drift", tone: "warn" }, { text: "needs a migration", tone: "warn" }, { text: "lowest", tone: "good" }, { text: "most services" }],
        [{ text: "events since day N", tone: "accent" }, { text: "from events since N", tone: "accent" }, { text: "low", tone: "good" }, { text: "integration" }],
        [{ text: "as above", tone: "accent" }, { text: "rebuild by replay", tone: "good" }, { text: "moderate", tone: "warn" }, { text: "very different reads" }],
        [{ text: "complete, by design", tone: "good" }, { text: "any, from day one", tone: "good" }, { text: "high", tone: "crit" }, { text: "ledgers, core domains" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "Use it per bounded context, not per company",
      body: [
        { t: "p", text: "Event sourcing earns its cost where history is the product or the law: ledgers and payments, trading, inventory movements, insurance claims, collaborative documents. CQRS earns its cost where reads and writes differ sharply in shape or volume. Applied to a settings page or a CRUD catalogue they are overhead. Choose them for one context (10.2) at a time; the rest of the system just consumes that context's events." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Read six years of events with today's code",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "An account's stream holds events in three schemas: 2019's `Deposited` with a float `amount` in pounds, 2021's schema 2 with integer `amount_pence`, and 2024's schema 3 `MoneyDeposited` with `minor` units and a `currency`. The events must never be rewritten. Write **upcasters** that convert each schema to the next on read, so a projection that understands only schema 3 can compute balances per currency from the whole history." }
      ],
      requirements: [
        "One upcaster per version step: 1 → 2 and 2 → 3",
        "Apply them repeatedly on read until the event is current",
        "Convert pounds to pence exactly, without float rounding errors",
        "Compute balances per currency from the upcast stream",
        "Show what code that reads only the 2019 field would compute"
      ],
      hint: "Convert floats through str() into Decimal before multiplying by 100. Events with no schema field are schema 1.",
      solution: { lang: "python", title: "upcast_ex.py",
        code: `from decimal import Decimal, ROUND_HALF_UP

STORED = [                                     # six years of one account's events, never rewritten
    {"type": "Deposited", "amount": 12.5},                                        # 2019: pounds, as a float
    {"type": "Deposited", "amount": 0.1},
    {"type": "Withdrawn", "amount": 0.3},
    {"type": "Deposited", "schema": 2, "amount_pence": 4000},                     # 2021: integer pence
    {"type": "Withdrawn", "schema": 2, "amount_pence": 1250},
    {"type": "MoneyDeposited", "schema": 3, "minor": 900, "currency": "EUR"},     # 2024: multi-currency
]

def v1_to_v2(e):
    pence = int((Decimal(str(e["amount"])) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return {"type": e["type"], "schema": 2, "amount_pence": pence}

def v2_to_v3(e):
    renamed = {"Deposited": "MoneyDeposited", "Withdrawn": "MoneyWithdrawn"}[e["type"]]
    return {"type": renamed, "schema": 3, "minor": e["amount_pence"], "currency": "GBP"}

UPCASTERS = {1: v1_to_v2, 2: v2_to_v3}        # applied on read, one step at a time, until current

def upcast(event):
    while event.get("schema", 1) in UPCASTERS:
        event = UPCASTERS[event.get("schema", 1)](event)
    return event

def balances(events):                          # the projection only knows the current schema
    out = {}
    for e in events:
        sign = 1 if e["type"] == "MoneyDeposited" else -1
        out[e["currency"]] = out.get(e["currency"], 0) + sign * e["minor"]
    return out

def naive_balance(events):                     # what code written in 2019 would compute today
    return sum((1 if "Deposit" in e["type"] else -1) * e.get("amount", 0) for e in events)

print("naive, reading 'amount' only:", round(naive_balance(STORED), 2), "pounds  (and ignores 3 newer events)")
print("upcast on read:")
for raw in STORED:
    up = upcast(raw)
    print(f"  schema {raw.get('schema', 1)} {raw['type']:<15} -> schema 3 {up['type']:<15} {up['minor']:>5} {up['currency']}")
print("balances:", {cur: f"{minor / 100:.2f}" for cur, minor in balances(map(upcast, STORED)).items()})`,
        out: `naive, reading 'amount' only: 12.3 pounds  (and ignores 3 newer events)
upcast on read:
  schema 1 Deposited       -> schema 3 MoneyDeposited   1250 GBP
  schema 1 Deposited       -> schema 3 MoneyDeposited     10 GBP
  schema 1 Withdrawn       -> schema 3 MoneyWithdrawn     30 GBP
  schema 2 Deposited       -> schema 3 MoneyDeposited   4000 GBP
  schema 2 Withdrawn       -> schema 3 MoneyWithdrawn   1250 GBP
  schema 3 MoneyDeposited  -> schema 3 MoneyDeposited    900 EUR
balances: {'GBP': '39.80', 'EUR': '9.00'}`,
        notes: [
          { t: "p", text: "Code that still read the 2019 field computed 12.30 pounds and silently ignored three of the six events; upcast, the history gives 39.80 GBP and 9.00 EUR. Each upcaster knows only one step, so adding schema 4 means adding one function, and the projection only ever sees the current shape." },
          { t: "p", text: "Two details matter in production. Converting through Decimal avoids 0.1 × 100 becoming 10.000000000000002; and upcasting on read keeps the log immutable, at the cost of doing the conversion on every replay — a copy-and-transform migration into a new stream is the alternative when old schemas become too many to carry." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a read model that disagreed with the ledger",
      body: [
        { t: "p", text: "**Symptom.** A finance reconciliation found that the balances shown to customers differed from the event-sourced ledger for a few hundred accounts, always by exactly one transaction, and only for transactions made at peak times." },
        { t: "p", text: "**Mechanism.** The balance projector read events by sequence position greater than its checkpoint. Under concurrent writes, a transaction that had taken a lower position sometimes committed after one with a higher position had already been projected, so the checkpoint moved past it and that event was never applied — the out-of-order commit trap. The ledger itself was correct; only the read model was missing events." },
        { t: "p", text: "**Fix.** The projector was moved to read the log through logical replication, which delivers in commit order, and the affected read models were rebuilt by replaying from position zero — possible only because the events were the source of truth. A nightly job now recomputes a sample of balances from the log and alerts on any difference." }
      ] }
  ],

  takeaways: [
    "**Event sourcing** stores what happened in an append-only log; current state is a **fold** over the events.",
    "A primary key on **(stream, version)** gives optimistic concurrency: measured, of two racing withdrawals one **won**, the other **reloaded and was refused** — no lock, no overdraft.",
    "The log gives an **audit trail**, **time travel** and **read models added retroactively** by replay.",
    "**Snapshots** bound rebuild time: measured, **~2 ms** from a snapshot against **~330 ms** replaying 100,437 events — and they can always be rebuilt.",
    "**CQRS** separates the write model from read models shaped per query, fed by projectors.",
    "Read models **lag**: measured, a query straight after a command was stale; asking for **at least the command's position** waited a few hundred ms and was correct.",
    "Update a read model and its **checkpoint in one transaction**; read the log in **commit order**, or concurrent writers can make a projector skip events.",
    "Events live forever: evolve them with **upcasters** — six years of three schemas gave **39.80 GBP and 9.00 EUR**, where 2019's code saw 12.30.",
    "Erase personal data in an immutable log by **crypto-shredding**.",
    "Choose these patterns per **bounded context** — ledgers and core domains — not for a whole company."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "How does an event store with PRIMARY KEY (stream_id, version) prevent two concurrent withdrawals from both succeeding?",
        options: ["It locks the account row for the whole transaction", "Both writers try to append the same next version; the second insert violates the key, so that writer must reload and re-check its rule", "It sorts the withdrawals by time", "It rejects all concurrent writes"],
        answer: 1,
        why: "Each writer appends version N+1 based on the version it loaded. Only one insert of that version can succeed; the loser reloads the stream, sees the new state and re-applies the business rule. No lock is held across the check, nothing is sorted by time, and non-conflicting streams proceed concurrently." },

      { stem: "A stream has 100,000 events and commands are slow. What is the standard fix?",
        options: ["Delete old events", "Store periodic snapshots of the folded state and load the latest snapshot plus the events after it", "Move the events to a faster disk", "Split the stream randomly into ten streams"],
        answer: 1,
        why: "Snapshots bound the replay to the events since the last snapshot — 437 instead of 100,437 in the measurement. Deleting events destroys the source of truth, faster disks only shave a constant factor, and splitting a stream randomly breaks per-aggregate ordering and concurrency." },

      { stem: "A user places an order and the order summary page, served from a CQRS read model, does not show it yet. What is a good fix?",
        options: ["Make the projector synchronous for every query", "Return the event's position from the command, and have the next read wait until the read model reaches it (or read this user's own new data from the write side)", "Disable CQRS", "Cache the summary page longer"],
        answer: 1,
        why: "Read-your-writes for the writer is enough: wait for the read model to catch up to the command's position, or answer that user's own change from the write side. Making every query wait on projection removes the benefit, disabling CQRS is drastic, and longer caching makes staleness worse." },

      { stem: "Events from 2019 store amounts as float pounds; today's code expects integer pence and a currency. What is the recommended approach?",
        options: ["Rewrite the old events in place", "Upcast old events to the current schema when they are read, keeping the stored log unchanged", "Ignore old events", "Store every new event in all three schemas"],
        answer: 1,
        why: "Upcasters convert on read, step by step, so the log stays immutable and projections see one schema. Rewriting events in place destroys the audit trail, ignoring them gives wrong balances, and writing every schema multiplies storage and still needs a reader for the old ones." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Interviewers ask about event sourcing mostly to hear when you would not use it.",
    questions: [
      { level: "advanced",
        q: "What is event sourcing? When is it appropriate and when is it not?",
        strong: "A strong answer covers the mechanics, the benefits, the costs and a clear boundary for use.",
        answer: [
          { t: "p", text: "Instead of storing current state, store the sequence of domain events per aggregate in an append-only log, and derive state by folding over them. A unique key on stream and version gives optimistic concurrency; snapshots bound replay time; projections build read models, and new ones can be added by replaying history." },
          { t: "p", text: "It fits where history matters — ledgers, payments, trading, inventory movements, claims, collaborative editing — or where you need audit, time travel or many differently shaped read models. It does not fit simple CRUD, settings, or teams without the capacity to handle schema evolution, projection lag, replay tooling and GDPR erasure via crypto-shredding. I would apply it to one bounded context, not the whole system." }
        ] },

      { level: "advanced",
        q: "How do you keep a CQRS read model correct and consistent enough for users?",
        strong: "A strong answer covers checkpoints, ordering, idempotency, lag handling and rebuilds.",
        answer: [
          { t: "p", text: "The projector applies each event and advances its checkpoint in the same transaction, so a crash neither skips nor double-applies an event; handlers are idempotent anyway. It must read the log in commit order — through CDC, a single writer, or a log like Kafka — because sequence numbers can commit out of order under concurrency." },
          { t: "p", text: "For users, I give read-your-writes where it matters by returning the command's position and waiting for the read model to reach it, or by showing the result the command returned. I monitor projector lag, and because the log is the truth, I can always rebuild a read model from position zero — and periodically verify a sample against the write side." }
        ] },

      { level: "core",
        q: "Can you use CQRS without event sourcing?",
        strong: "A strong answer says yes and explains how read models are fed.",
        answer: [
          { t: "p", text: "Yes. The write side can be an ordinary database with aggregates and transactions; changes are published through a transactional outbox or captured with CDC, and consumers maintain read models — a search index, a denormalised summary, a reporting store." },
          { t: "p", text: "What you lose is full history from the beginning: new read models can only be built from the events captured since publishing started, or by a one-off backfill from the current state. That is often an acceptable trade for much less complexity." }
        ] }
    ]
  }
});
