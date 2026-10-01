/* ============================================================================
   LESSON 5.2 — ACID, Isolation Levels and MVCC
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "A transaction promises that a group of changes happens entirely or not at all, survives a crash, and keeps the data's rules intact. The fourth promise — **isolation**, that concurrent transactions do not see each other's half-finished work — is the one databases quietly weaken for speed, and the default in PostgreSQL, Oracle and SQL Server is a level at which **two checkouts can sell the same last item**. The anomalies are concrete, each level prevents a specific set, and every example below ran against a real PostgreSQL 16.",

  objectives: [
    "State what each letter of ACID guarantees, and what BASE trades instead",
    "Reproduce lost updates, non-repeatable reads and write skew, and say which level prevents each",
    "Explain how MVCC lets readers and writers proceed without blocking each other",
    "Prevent a lost update at the default level with an atomic update, a row lock or optimistic versioning",
    "Choose an isolation level and handle the serialisation failures it produces"
  ],

  prerequisites: ["4.5", "5.1"],

  blocks: [

    { t: "h2", n: "01", id: "acid", text: "What a transaction promises",
      sub: "Four guarantees, one of them adjustable" },

    { t: "dl", items: [
      ["Atomicity", "All of the transaction's changes take effect, or none do. A transfer that debits one account and fails before crediting the other is rolled back entirely."],
      ["Consistency", "The database's declared rules — constraints, foreign keys, checks — hold before and after. (A different C from CAP's, 5.1.) Rules the database does not know about are the application's job."],
      ["Isolation", "Concurrent transactions behave as if they ran one at a time — fully at SERIALIZABLE, partially at weaker levels. This is the dial, and the subject of this lesson."],
      ["Durability", "Once committed, the change survives a crash — the write-ahead log of 4.5."]
    ] },

    { t: "callout", kind: "note", title: "BASE: the other end of the spectrum",
      body: [
        { t: "p", text: "**B**asically **A**vailable, **S**oft state, **E**ventual consistency describes stores that give up multi-record transactions and immediate consistency for availability and scale — the AP side of 5.1. The trade is not \"ACID is slow, BASE is fast\": it is which invariants you are willing to enforce in application code. Many modern stores sit between the two, with transactions within a partition and eventual consistency across them." }
      ] },

    { t: "h2", n: "02", id: "anomalies", text: "Three anomalies, run for real",
      sub: "Two connections, interleaved, at each isolation level" },

    { t: "p", text: "Each scenario interleaves two transactions on separate connections, at each of PostgreSQL's three distinct levels. (PostgreSQL treats READ UNCOMMITTED as READ COMMITTED, so dirty reads never occur in it.)" },

    { t: "code", lang: "python", title: "isolation.py — lost update, non-repeatable read and write skew on PostgreSQL 16", code: `import psycopg

DSN = "host=127.0.0.1 port=5433 user=postgres"
LEVELS = ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"]

def setup():
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute("DROP TABLE IF EXISTS stock, doctors")
        c.execute("CREATE TABLE stock (sku text PRIMARY KEY, qty int)")
        c.execute("INSERT INTO stock VALUES ('kettle', 10)")
        c.execute("CREATE TABLE doctors (name text PRIMARY KEY, on_call bool)")
        c.execute("INSERT INTO doctors VALUES ('alice', true), ('bob', true)")

def pair(level):
    a, b = psycopg.connect(DSN), psycopg.connect(DSN)
    for c in (a, b): c.execute(f"SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL {level}"); c.commit()
    return a, b

def lost_update(level):
    """Two checkouts each read qty, subtract 1 in the app, write it back."""
    setup(); a, b = pair(level)
    qa = a.execute("SELECT qty FROM stock WHERE sku='kettle'").fetchone()[0]
    qb = b.execute("SELECT qty FROM stock WHERE sku='kettle'").fetchone()[0]
    a.execute("UPDATE stock SET qty=%s WHERE sku='kettle'", (qa - 1,)); a.commit()
    try:
        b.execute("UPDATE stock SET qty=%s WHERE sku='kettle'", (qb - 1,)); b.commit()
    except psycopg.errors.SerializationFailure:
        b.rollback(); return "prevented: B aborted, must retry"
    final = a.execute("SELECT qty FROM stock").fetchone()[0]; a.commit()
    return f"HAPPENS: 2 sold, qty {final} (should be 8)" if final != 8 else "no anomaly"

def non_repeatable(level):
    """A reads a value twice inside one transaction while B commits a change."""
    setup(); a, b = pair(level)
    first = a.execute("SELECT qty FROM stock").fetchone()[0]
    b.execute("UPDATE stock SET qty = 3"); b.commit()
    second = a.execute("SELECT qty FROM stock").fetchone()[0]; a.commit()
    return f"HAPPENS: read {first}, then {second}" if first != second else f"prevented: read {first} both times"

def write_skew(level):
    """Rule: at least one doctor on call. Each checks the rule, then goes off call."""
    setup(); a, b = pair(level)
    n_a = a.execute("SELECT count(*) FROM doctors WHERE on_call").fetchone()[0]
    n_b = b.execute("SELECT count(*) FROM doctors WHERE on_call").fetchone()[0]
    if n_a >= 2: a.execute("UPDATE doctors SET on_call=false WHERE name='alice'")
    if n_b >= 2: b.execute("UPDATE doctors SET on_call=false WHERE name='bob'")
    a.commit()
    try:
        b.commit()
    except psycopg.errors.SerializationFailure:
        return "prevented: B aborted, must retry"
    with psycopg.connect(DSN) as c:
        left = c.execute("SELECT count(*) FROM doctors WHERE on_call").fetchone()[0]
    return f"HAPPENS: {left} doctors on call" if left == 0 else "no anomaly"

for name, test in (("lost update", lost_update), ("non-repeatable read", non_repeatable), ("write skew", write_skew)):
    print(name)
    for lvl in LEVELS:
        print("  %-16s %s" % (lvl, test(lvl)))`,
      out: `lost update
  READ COMMITTED   HAPPENS: 2 sold, qty 9 (should be 8)
  REPEATABLE READ  prevented: B aborted, must retry
  SERIALIZABLE     prevented: B aborted, must retry
non-repeatable read
  READ COMMITTED   HAPPENS: read 10, then 3
  REPEATABLE READ  prevented: read 10 both times
  SERIALIZABLE     prevented: read 10 both times
write skew
  READ COMMITTED   HAPPENS: 0 doctors on call
  REPEATABLE READ  HAPPENS: 0 doctors on call
  SERIALIZABLE     prevented: B aborted, must retry`,
      hl: [22, 23, 24, 26, 43, 44, 45, 46],
      caption: "At **READ COMMITTED** — the default — every anomaly happens: two checkouts sold two kettles and stock fell by one. **REPEATABLE READ** (snapshot isolation in PostgreSQL) stops the lost update by aborting the second writer, and gives each transaction a stable view — but **write skew** still happens, because the two transactions changed *different* rows. Only **SERIALIZABLE** stops all three, by aborting a transaction that would make the result impossible in any serial order." },

    { t: "diagram", kind: "matrix", title: "Which level prevents which anomaly",
      caption: "Prevented is ✓, possible is ✗. The SQL standard defines levels by the anomalies they exclude; real databases implement them differently — PostgreSQL's REPEATABLE READ is snapshot isolation and also prevents phantoms; MySQL InnoDB's default is REPEATABLE READ with different locking behaviour.",
      cols: ["Dirty read", "Non-repeatable", "Lost update", "Phantom", "Write skew"],
      rows: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
      cells: [
        [false, false, false, false, false],
        [true, false, false, false, false],
        [true, true, true, { text: "✓ in PG", tone: "warn" }, false],
        [true, true, true, true, true]
      ] },

    { t: "viz", title: "Write skew: each transaction is correct alone",
      caption: "Both read that two doctors are on call, both conclude it is safe to leave, and each updates only its own row — so snapshot isolation sees no conflicting writes and commits both. The invariant spans two rows, and only serialisable isolation (or an explicit lock) protects an invariant no single row holds.",
      svg: `<svg viewBox="0 0 760 331.0" width="100%" role="img"><defs><marker id="q975550accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q975550good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q975550warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q975550crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q975550violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q975550teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q975550line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="54.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="110.0" y="32" text-anchor="middle" class="s-label">Alice's txn</text>
<rect x="324.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="380.0" y="32" text-anchor="middle" class="s-label">Database</text>
<rect x="594.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="650.0" y="32" text-anchor="middle" class="s-label">Bob's txn</text>
<line x1="110.0" y1="42" x2="110.0" y2="319.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="380.0" y1="42" x2="380.0" y2="319.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="650.0" y1="42" x2="650.0" y2="319.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="110.0" y1="60" x2="376.0" y2="60" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q975550accent)"/>
<text x="245.0" y="54" text-anchor="middle" class="s-sub" style="fill:var(--accent)">count on call → 2</text>
<line x1="650.0" y1="90" x2="384.0" y2="90" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#q975550violet)"/>
<text x="515.0" y="84" text-anchor="middle" class="s-sub" style="fill:var(--violet)">count on call → 2</text>
<rect x="40.0" y="108" width="140.0" height="20" rx="5" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)"/>
<text x="110.0" y="122" text-anchor="middle" class="s-sub" style="fill:var(--ink)">2 ≥ 2: safe to leave</text>
<rect x="580.0" y="138" width="140.0" height="20" rx="5" style="fill:var(--violet);fill-opacity:.16;stroke:var(--violet)"/>
<text x="650.0" y="152" text-anchor="middle" class="s-sub" style="fill:var(--ink)">2 ≥ 2: safe to leave</text>
<line x1="110.0" y1="180" x2="376.0" y2="180" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q975550accent)"/>
<text x="245.0" y="174" text-anchor="middle" class="s-sub" style="fill:var(--accent)">UPDATE alice off</text>
<line x1="650.0" y1="210" x2="384.0" y2="210" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#q975550violet)"/>
<text x="515.0" y="204" text-anchor="middle" class="s-sub" style="fill:var(--violet)">UPDATE bob off</text>
<line x1="110.0" y1="240" x2="376.0" y2="240" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q975550good)"/>
<text x="245.0" y="234" text-anchor="middle" class="s-sub" style="fill:var(--good)">COMMIT ✓</text>
<line x1="650.0" y1="270" x2="384.0" y2="270" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#q975550crit)"/>
<text x="515.0" y="264" text-anchor="middle" class="s-sub" style="fill:var(--crit)">COMMIT ✓ (snapshot isolation)</text>
<rect x="319.3" y="288" width="121.4" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="380.0" y="302" text-anchor="middle" class="s-sub" style="fill:var(--ink)">0 doctors on call</text></svg>` },

    { t: "callout", kind: "trap", title: "Read-modify-write in application code at the default level",
      body: [
        { t: "p", text: "The commonest concurrency bug in web applications is three lines: read the stock, check and subtract in code, write the new value. At READ COMMITTED it is a lost update waiting for two simultaneous requests — the first scenario above, and the exercise below shows twenty buyers taking twenty orders for ten kettles. Tests never catch it because tests are not concurrent." },
        { t: "p", text: "Whenever code reads a value, computes a new one and writes it back, it needs one of: an **atomic update** that does the arithmetic in SQL (`qty = qty - 1 WHERE qty > 0`), a **row lock** (`SELECT … FOR UPDATE`), an **optimistic version check**, or a higher isolation level with retries. The exercise measures all four." }
      ] },

    { t: "h2", n: "03", id: "mvcc", text: "MVCC: how readers avoid blocking writers",
      sub: "An update writes a new version; a snapshot picks which version it sees" },

    { t: "p", text: "Snapshot isolation would be expensive if it meant locking everything a transaction read. **Multi-version concurrency control** avoids that: an update never overwrites a row; it writes a new version stamped with the writing transaction's id, and each transaction's snapshot decides which version is visible to it:" },

    { t: "code", lang: "python", title: "mvcc.py — a new row version, and a snapshot that keeps seeing the old one", code: `import psycopg

DSN = "host=127.0.0.1 port=5433 user=postgres"
with psycopg.connect(DSN, autocommit=True) as c:
    c.execute("DROP TABLE IF EXISTS account")
    c.execute("CREATE TABLE account (id int PRIMARY KEY, balance int)")
    c.execute("INSERT INTO account VALUES (1, 100)")
    show = lambda: c.execute("SELECT ctid, xmin, balance FROM account").fetchone()
    print("after insert      ctid=%s xmin=%s balance=%s" % show())

    reader = psycopg.connect(DSN)
    reader.execute("BEGIN ISOLATION LEVEL REPEATABLE READ")
    print("reader's snapshot sees balance =", reader.execute("SELECT balance FROM account").fetchone()[0])

    c.execute("UPDATE account SET balance = 70 WHERE id = 1")      # a writer commits a change
    print("after update      ctid=%s xmin=%s balance=%s   <- a NEW row version" % show())
    print("reader still sees balance =", reader.execute("SELECT balance FROM account").fetchone()[0],
          "(its snapshot predates the update; no lock was taken)")
    reader.commit()
    print("new snapshot sees balance =", reader.execute("SELECT balance FROM account").fetchone()[0])
    reader.close()`,
      out: `after insert      ctid=(0,1) xmin=1035 balance=100
reader's snapshot sees balance = 100
after update      ctid=(0,2) xmin=1036 balance=70   <- a NEW row version
reader still sees balance = 100 (its snapshot predates the update; no lock was taken)
new snapshot sees balance = 70`,
      caption: "The update created a new tuple at a new physical location (`ctid`) stamped with a new transaction id (`xmin`). The reader's snapshot, taken before that transaction committed, keeps resolving to the old version — without taking a lock and without blocking the writer. **Readers do not block writers and writers do not block readers**, which is why MVCC databases handle mixed workloads so well." },

    { t: "diagram", kind: "flow", title: "One row, two versions, two snapshots",
      caption: "Old versions cannot be removed while any snapshot might still need them. PostgreSQL's VACUUM reclaims them afterwards; a transaction left open for hours pins every version created since it began, which is how one forgotten session bloats a busy table.",
      cols: 4,
      nodes: [
        { id: "v1", label: "balance = 100", sub: "xmin 1035, xmax 1036", tone: "warn" },
        { id: "v2", label: "balance = 70", sub: "xmin 1036 (current)", tone: "good" },
        { id: "s1", label: "Snapshot from before 1036", sub: "sees 100", tone: "accent" },
        { id: "s2", label: "Snapshot after 1036 commits", sub: "sees 70", tone: "violet" }
      ],
      edges: [["v1", "v2", "updated by 1036"], ["v2", "s1", "invisible to"], ["s1", "s2", "next txn"]] },

    { t: "h2", n: "04", id: "choosing", text: "Choosing a level",
      sub: "And paying for it in retries" },

    { t: "table",
      head: ["Level", "Use when", "Cost"],
      rows: [
        ["READ COMMITTED", "Most CRUD, where each statement stands alone or uses atomic updates", "Anomalies in read-modify-write code, unless guarded"],
        ["REPEATABLE READ (snapshot)", "Reports and multi-statement reads that need one consistent view", "Write conflicts abort; write skew still possible"],
        ["SERIALIZABLE", "Invariants spanning rows: bookings, balances, on-call rotas", "More aborts under contention; every transaction must be retryable"]
      ],
      caption: "Higher levels convert silent corruption into explicit serialisation failures. That is only an improvement if the application retries — a SERIALIZABLE system without a retry loop just turns wrong answers into errors." },

    { t: "exercise", kind: "Challenge", title: "Twenty buyers, ten kettles",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Twenty concurrent requests try to buy one kettle each when ten are in stock, at READ COMMITTED. Implement the naive read-modify-write and three correct alternatives, and measure orders taken, stock left and units oversold for each." }
      ],
      requirements: [
        "Start all twenty buyers at the same moment, each on its own connection",
        "Naive: read qty, check and subtract in Python, write it back",
        "Atomic: one UPDATE that subtracts and checks in SQL",
        "Pessimistic: SELECT … FOR UPDATE, then update",
        "Optimistic: a version column and compare-and-set with retry",
        "Report orders taken, quantity left and units oversold"
      ],
      hint: "Use a threading.Barrier so the reads genuinely overlap. For the optimistic version, the UPDATE's WHERE clause includes the version you read; rowcount tells you whether you won.",
      solution: { lang: "python", title: "oversell_ex.py",
        code: `import threading, psycopg

DSN = "host=127.0.0.1 port=5433 user=postgres"
BUYERS, STOCK = 20, 10

def reset():
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute("DROP TABLE IF EXISTS stock")
        c.execute("CREATE TABLE stock (sku text PRIMARY KEY, qty int CHECK (qty >= 0), version int)")
        c.execute("INSERT INTO stock VALUES ('kettle', %s, 0)", (STOCK,))

def naive(c):                        # read, decide in the app, write back
    q = c.execute("SELECT qty FROM stock WHERE sku='kettle'").fetchone()[0]
    if q <= 0: return False
    c.execute("UPDATE stock SET qty=%s WHERE sku='kettle'", (q - 1,)); return True

def atomic(c):                       # let the database do the arithmetic and the check
    return c.execute("UPDATE stock SET qty = qty - 1 WHERE sku='kettle' AND qty > 0").rowcount == 1

def locked(c):                       # pessimistic: lock the row before reading it
    q = c.execute("SELECT qty FROM stock WHERE sku='kettle' FOR UPDATE").fetchone()[0]
    if q <= 0: return False
    c.execute("UPDATE stock SET qty = qty - 1 WHERE sku='kettle'"); return True

def optimistic(c):                   # compare-and-set on a version column, retry on conflict
    for _ in range(50):
        q, v = c.execute("SELECT qty, version FROM stock WHERE sku='kettle'").fetchone()
        if q <= 0: return False
        if c.execute("UPDATE stock SET qty=%s, version=%s WHERE sku='kettle' AND version=%s",
                     (q - 1, v + 1, v)).rowcount == 1:
            return True
        c.commit()                   # someone else won: start again with fresh values
    return False

def trial(fn):
    reset(); sold = []; gate = threading.Barrier(BUYERS)
    def buyer():
        with psycopg.connect(DSN) as c:            # READ COMMITTED, PostgreSQL's default
            gate.wait()                            # everyone starts at the same moment
            ok = fn(c); c.commit(); sold.append(ok)
    ts = [threading.Thread(target=buyer) for _ in range(BUYERS)]
    for t in ts: t.start()
    for t in ts: t.join()
    with psycopg.connect(DSN) as c:
        left = c.execute("SELECT qty FROM stock").fetchone()[0]
    return sum(sold), left

print("%d buyers, %d kettles, READ COMMITTED" % (BUYERS, STOCK))
print("%-12s %14s %10s %12s" % ("approach", "orders taken", "qty left", "oversold"))
for name, fn in (("naive", naive), ("atomic", atomic), ("FOR UPDATE", locked), ("optimistic", optimistic)):
    taken, left = trial(fn)
    print("%-12s %14d %10d %12d" % (name, taken, left, taken - (STOCK - left)))`,
        out: `20 buyers, 10 kettles, READ COMMITTED
approach       orders taken   qty left     oversold
naive                    20          8           18
atomic                   10          0            0
FOR UPDATE               10          0            0
optimistic               10          0            0`,
        notes: [
          { t: "p", text: "The naive version is worse than \"slightly wrong\": all twenty read 10, nearly all of them wrote 9, and **twenty orders were taken while stock fell by one or two**. The database did nothing wrong — each statement was correct at READ COMMITTED; the invariant lived in Python between two statements, where no database can see it." },
          { t: "p", text: "The **atomic update** is the best fix when the logic fits in SQL: one statement, no extra round trip, and the `qty > 0` check happens under the row lock the update takes anyway. **FOR UPDATE** is the fix when the decision needs application logic between read and write; it serialises buyers on the row, which is fine for one product and a bottleneck for a flash sale on one SKU." },
          { t: "p", text: "**Optimistic** versioning takes no lock and retries on conflict, which is ideal when conflicts are rare and awful when they are constant — here all twenty contend for one row, so most attempts lose and retry. The general rule: atomic when you can, pessimistic under high contention, optimistic under low contention, and SERIALIZABLE when the invariant spans rows." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the on-call rota that left nobody on call",
      body: [
        { t: "p", text: "**Symptom.** A hospital scheduling system allowed clinicians to swap themselves off a shift as long as at least two remained. One night, two clinicians on the same ward swapped off within the same second, the ward was left with one, and the system showed no error. A month later it happened on a ward with a minimum of one, leaving nobody." },
        { t: "p", text: "**Mechanism.** The rule was checked with `SELECT count(*)` and enforced by updating the clinician's own row, under REPEATABLE READ. Exactly the write skew of section 02: each transaction read the same count, each changed a different row, and snapshot isolation saw no conflict. The developers had chosen REPEATABLE READ believing it was \"the strict one\"." },
        { t: "p", text: "**Fix.** The swap transaction moved to SERIALIZABLE with a retry loop, and the shift row itself is now locked (`SELECT … FOR UPDATE` on the shift) before counting, so even at a lower level the check and the change are serialised per shift. A property-based test now runs swaps concurrently and asserts the invariant afterwards — the only kind of test that catches isolation bugs." }
      ] }
  ],

  takeaways: [
    "ACID: **atomic** all-or-nothing, **consistent** declared rules, **isolated** concurrent transactions, **durable** commits (the WAL).",
    "Isolation is the adjustable one — and the default in PostgreSQL is **READ COMMITTED**, where read-modify-write code loses updates.",
    "Run on PostgreSQL 16: READ COMMITTED allowed **lost updates, non-repeatable reads and write skew**; REPEATABLE READ stopped the first two; **only SERIALIZABLE stopped write skew**.",
    "**Write skew** breaks invariants that span rows: each transaction changes a different row, so snapshot isolation sees no conflict.",
    "**MVCC**: an update writes a new version; each snapshot sees the versions committed before it began — readers and writers do not block each other.",
    "Old versions live until no snapshot needs them; **a long-open transaction bloats tables**.",
    "Measured: naive read-modify-write took **20 orders for 10 kettles** while stock barely moved; an atomic update, FOR UPDATE and optimistic versioning each took exactly 10.",
    "Atomic SQL when you can, **pessimistic** locks under high contention, **optimistic** versions under low contention, **SERIALIZABLE** for cross-row invariants.",
    "Higher isolation turns corruption into **serialisation failures** — useful only with a retry loop."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two transactions at REPEATABLE READ each check that two doctors are on call, then each takes a different doctor off call. What happens in PostgreSQL?",
        options: ["The second transaction blocks until the first commits", "Both commit, leaving nobody on call — write skew", "The second aborts with a serialisation failure", "Both abort"],
        answer: 1,
        why: "Snapshot isolation detects conflicting writes to the same row, but these update different rows, so both commit and the cross-row invariant is broken — the run showed 0 doctors on call. Only SERIALIZABLE, which tracks read–write dependencies, aborts one of them. Updates to different rows do not block each other." },

      { stem: "Code reads qty, subtracts 1 in the application, and writes the result, at READ COMMITTED. Twenty requests run at once on a row with qty = 10. What is the worst case?",
        options: ["Exactly 10 sales", "Twenty sales and stock reduced by only one", "A deadlock", "The database refuses the extra writes"],
        answer: 1,
        why: "Every request can read 10 before any writes, so nearly all of them write 9: twenty orders while stock falls by one or two — what the exercise measured. READ COMMITTED does not detect this lost update, the updates queue rather than deadlock on a single row, and nothing refuses them because each statement is valid on its own." },

      { stem: "How does MVCC let a long report read consistent data while writers keep updating?",
        options: ["It locks every row the report reads", "Writers create new row versions, and the report's snapshot keeps seeing the versions committed before it started", "It copies the table before the report starts", "Writers are paused until the report finishes"],
        answer: 1,
        why: "An MVCC update writes a new version rather than overwriting, and each transaction's snapshot selects the versions that were committed when it began — the mvcc.py run shows a reader still seeing 100 after a committed update to 70. No locks or pauses are needed, and nothing is copied up front; old versions simply remain until no snapshot needs them." },

      { stem: "A team switches a booking service to SERIALIZABLE and starts seeing errors under load. What is missing?",
        options: ["Nothing; SERIALIZABLE is broken", "A retry loop: serialisation failures are expected and the transaction must be re-run", "An index on every column", "A switch back to READ UNCOMMITTED"],
        answer: 1,
        why: "SERIALIZABLE prevents anomalies by aborting transactions that would make the outcome non-serialisable, and the contract is that the application retries them; without retries, correctness becomes user-visible errors. Indexes can reduce false conflicts in some engines but do not remove the need to retry, and lowering isolation brings the anomalies back." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Name the anomaly, then the level or the lock that prevents it.",
    questions: [
      { level: "core",
        q: "What are the transaction isolation levels and what does each prevent?",
        strong: "A strong answer ties each level to the anomalies it excludes and mentions the database-specific reality.",
        answer: [
          { t: "p", text: "READ UNCOMMITTED allows dirty reads; READ COMMITTED prevents them but allows non-repeatable reads, lost updates and write skew; REPEATABLE READ — snapshot isolation in PostgreSQL — gives each transaction a stable view and aborts conflicting writes to the same row, but still allows write skew across rows; SERIALIZABLE makes the result equivalent to some serial order, preventing all of them by aborting transactions that would violate it." },
          { t: "p", text: "In practice the default is READ COMMITTED in PostgreSQL, Oracle and SQL Server, so read-modify-write logic needs an atomic update, a row lock or a version check. And implementations differ — PostgreSQL never does dirty reads, and its REPEATABLE READ also prevents phantoms — so I would check the specific engine's documentation rather than the standard's table." }
        ] },

      { level: "advanced",
        q: "How would you prevent two users from booking the same seat?",
        strong: "A strong answer offers several correct mechanisms with their contention trade-offs.",
        answer: [
          { t: "p", text: "The simplest correct one is a unique constraint on (event, seat) and an INSERT of the booking: the second insert fails, whatever the isolation level. If the booking is a state change on a seat row, an atomic conditional update — set holder where id = ? and holder is null — and check that one row was affected." },
          { t: "p", text: "If the decision needs application logic, lock the seat row with SELECT … FOR UPDATE, or use SERIALIZABLE with retries. For a hot event with a flash crowd, I would add a short reservation step with a TTL so the lock is held for seconds, not for a whole payment flow." }
        ] },

      { level: "core",
        q: "What is MVCC and why does it matter?",
        strong: "A strong answer explains versions and snapshots and names the operational cost.",
        answer: [
          { t: "p", text: "Multi-version concurrency control keeps several versions of each row. An update writes a new version tagged with its transaction id instead of overwriting, and each transaction reads through a snapshot that sees only versions committed before it began. So readers never block writers and writers never block readers, which is why long reports and short updates coexist well." },
          { t: "p", text: "The cost is cleaning up: old versions remain until no snapshot needs them, so PostgreSQL's VACUUM must keep up, and a transaction left open for hours pins every version created since and bloats busy tables. Monitoring the oldest open transaction is therefore part of operating an MVCC database." }
        ] }
    ]
  }
});
