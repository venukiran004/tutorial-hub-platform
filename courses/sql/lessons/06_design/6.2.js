/* ============================================================================
   LESSON 6.2 — Isolation Levels and Anomalies
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "**Two transactions running at once can each be correct alone and wrong together.** Both read the stock count of ten, both subtract their sale, and the second write silently erases the first. The isolation level is the dial that says which of these interleavings the database will prevent and which it leaves to you — and the default on every major engine leaves the most common one to you. This lesson reproduces the anomalies with two real connections, names them, and gives the three fixes that do not depend on the isolation level at all.",

  objectives: [
    "Reproduce a lost update, and explain why it happens at READ COMMITTED",
    "Name the four anomalies — dirty read, non-repeatable read, phantom, write skew — and say which isolation level prevents each",
    "Explain MVCC: readers see a snapshot, writers do not block readers, and the price is old row versions",
    "Fix a read-modify-write with an atomic UPDATE, a conditional UPDATE, or SELECT … FOR UPDATE, and know when SERIALIZABLE is the honest answer"
  ],

  prerequisites: ["6.1"],

  blocks: [

    { t: "h2", n: "01", text: "The lost update, reproduced", id: "lost" },

    { t: "p", text: "Two connections, A and B, each sell from a stock of ten. Each reads the quantity, subtracts its sale, and writes the result. Both reads happen before either write. **The final quantity is 6 — B's 10 − 4 — and A's sale of three has vanished without an error.** No isolation level below SERIALIZABLE stops this, because each transaction did nothing wrong by its own lights: it read a committed value and wrote a value." },

    { t: "code", lang: "python", title: "Two connections, one row, and the sale that disappears (executed against SQLite)",
      hl: [3, 4, 5, 6, 7],
      code: `# stock: product 1, qty 10. Two connections in autocommit, as most application code runs.
a, b = connect(), connect()
qa = a.execute("SELECT qty FROM stock WHERE product_id = 1").fetchone()[0]   # A reads 10
qb = b.execute("SELECT qty FROM stock WHERE product_id = 1").fetchone()[0]   # B reads 10
a.execute("UPDATE stock SET qty = ? WHERE product_id = 1", (qa - 3,))         # A writes 7
b.execute("UPDATE stock SET qty = ? WHERE product_id = 1", (qb - 4,))         # B writes 6
# final qty: 6      expected: 3      A's sale of 3 is lost, silently

# Wrapping each side in BEGIN ... COMMIT at READ COMMITTED changes nothing: each read is of committed data, each write
# is a legal write. The database enforced every rule it was asked to. The rule "qty must reflect every sale" was never asked.`,
      caption: "The script's actual output was `A read 10 B read 10 final 6 (expected 3)`. This is the single most common concurrency bug in application code, and it occurs at the default isolation level of PostgreSQL, MySQL, SQL Server and Oracle alike."
    },

    { t: "h2", n: "02", text: "The anomalies and the levels", id: "levels" },

    { t: "table",
      head: ["Anomaly", "What happens", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
      rows: [
        ["Dirty read", "Seeing another transaction's uncommitted write, which may then roll back", "prevented", "prevented", "prevented"],
        ["Non-repeatable read", "The same row read twice in one transaction returns different values, because another transaction committed between", "**allowed**", "prevented", "prevented"],
        ["Phantom", "The same WHERE run twice returns different rows, because another transaction inserted or deleted", "**allowed**", "prevented in PostgreSQL (snapshot); allowed by the standard", "prevented"],
        ["Lost update", "Two read-modify-write transactions; the second write overwrites the first", "**allowed**", "PostgreSQL aborts the second writer with a serialisation error; MySQL allows it", "prevented"],
        ["Write skew", "Two transactions each read a set, each write a different row, and together break an invariant neither broke alone", "**allowed**", "**allowed**", "prevented"]
      ]
    },

    { t: "p", text: "The standard names four levels; READ UNCOMMITTED is the fourth and PostgreSQL treats it as READ COMMITTED. **The default is READ COMMITTED in PostgreSQL, Oracle and SQL Server, and REPEATABLE READ in MySQL InnoDB.** Under READ COMMITTED each statement sees a snapshot as of its own start; under REPEATABLE READ the whole transaction sees a snapshot as of its first statement; under SERIALIZABLE the database additionally detects interleavings that no serial order could produce and aborts one participant with a serialisation failure — which the application must retry." },

    { t: "dl", items: [
      ["MVCC", "Multi-version concurrency control. Every write creates a new row version stamped with the transaction id; readers see the version current as of their snapshot. Readers never block writers and writers never block readers. Old versions are reclaimed later (VACUUM in PostgreSQL, purge in InnoDB)."],
      ["Snapshot", "The set of committed transactions a reader can see. Per statement at READ COMMITTED; per transaction at REPEATABLE READ and above."],
      ["Serialisation failure", "`could not serialize access due to concurrent update` — the database refusing to commit a transaction whose result would not match any serial order. Not a bug: a signal to retry the whole transaction."],
      ["`SELECT … FOR UPDATE`", "Read and lock the rows, so a concurrent FOR UPDATE on the same rows waits until you commit. Turns a read-modify-write into a serialised sequence for those rows only."],
      ["Deadlock", "Two transactions each holding a lock the other needs. The database detects it and aborts one; the fix is to acquire locks in a consistent order."],
      ["Write skew", "The anomaly SERIALIZABLE exists for: two transactions read overlapping data, each writes something the other did not read, and the combination violates a rule that each checked."]
    ]},

    { t: "h2", n: "03", text: "Three fixes that work at any level", id: "fixes" },

    { t: "p", text: "Raising the isolation level is one answer, but it is rarely the first one: it costs throughput, MySQL's REPEATABLE READ still permits the lost update, and SERIALIZABLE turns the bug into retries the code must handle. **The read-modify-write pattern itself is the problem, and there are three ways to remove it.**" },

    { t: "code", lang: "sql", title: "Atomic, conditional, locked — all three executed against the same two-connection setup",
      hl: [2, 3, 8, 9, 15, 16],
      code: `-- 1. atomic: let the database do the arithmetic. No read, so nothing to lose. The row lock serialises the two updates.
UPDATE stock SET qty = qty - 3 WHERE product_id = 1;     -- A
UPDATE stock SET qty = qty - 4 WHERE product_id = 1;     -- B
-- final 3. Add "AND qty >= 3" to refuse a sale that would go negative, and check rowcount.

-- 2. conditional (optimistic): write only if the row is still what you read. rowcount 0 means someone got there first: retry.
--    B read 10 and A has since made it 7:
UPDATE stock SET qty = 7 WHERE product_id = 1 AND qty = 10;    -- A: 1 row
UPDATE stock SET qty = 6 WHERE product_id = 1 AND qty = 10;    -- B: 0 rows -> re-read (7), recompute (3), retry
-- final 7 after the first round, 3 after B's retry. A version column (version = version + 1 WHERE version = :seen)
-- is the same idea when the value itself may legitimately repeat.

-- 3. pessimistic: lock the row while you think. B's FOR UPDATE waits until A commits, then reads 7.
BEGIN;
SELECT qty FROM stock WHERE product_id = 1 FOR UPDATE;   -- A: 10, and the row is locked
UPDATE stock SET qty = 7 WHERE product_id = 1; COMMIT;
-- B, having waited: SELECT ... FOR UPDATE -> 7; UPDATE ... SET qty = 3; COMMIT.     final 3
-- SQLite has no FOR UPDATE; BEGIN IMMEDIATE takes the write lock up front and B gets "database is locked" until A commits.`,
      caption: "In the executed run: fix 1 gave 3; fix 2 gave A 1 row, B 0 rows, final 7 until B retried; fix 3 blocked B with `database is locked`, then B read 7 and the final was 3. Prefer them in that order — the atomic form when the change is arithmetic, the conditional form when the decision needs application logic and contention is low, the lock when contention is high or the logic is long."
    },

    { t: "callout", kind: "trap", title: "REPEATABLE READ is not 'the safe one'", body: [
      { t: "p", text: "PostgreSQL's REPEATABLE READ detects the lost update and aborts the second writer — but MySQL's, the default, does not: both writers succeed and one is lost. And neither prevents write skew. **If your invariant spans more than one row — 'at least one doctor on call', 'total bookings ≤ capacity', 'username unique' without a unique constraint — only SERIALIZABLE, an explicit lock, or a constraint enforces it.** Prefer the constraint whenever one can express the rule (6.4)." }
    ]},

    { t: "viz",
      title: "Snapshot reads under MVCC",
      caption: "Transaction A starts and reads qty = 10. B commits qty = 99 while A is open. A's second read still returns 10 — its snapshot — and only after A ends does a new read see 99. That is repeatable reads without locks, and also why an open transaction stops old versions from being cleaned up.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A timeline with two transactions: A begins, reads 10, reads 10 again, commits, then reads 99. B updates to 99 and commits in the middle. Row versions 10 and 99 shown below with their visibility.">
  <defs>
    <marker id="ac-ah-62" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <line x1="60" y1="60" x2="850" y2="60" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-62)"/>
  <line x1="60" y1="130" x2="850" y2="130" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-62)"/>
  <text x="20" y="64" class="s-label" style="font-weight:600">A</text>
  <text x="20" y="134" class="s-label" style="font-weight:600">B</text>
  <rect x="120" y="44" width="520" height="32" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="330" y="114" width="150" height="32" rx="6" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)" stroke-width="1.2"/>
  <g class="s-sub" text-anchor="middle">
    <text x="140" y="34">BEGIN</text>
    <text x="230" y="34">read → 10</text>
    <text x="560" y="34">read → 10</text>
    <text x="640" y="34">COMMIT</text>
    <text x="760" y="34">read → 99</text>
    <text x="360" y="104">UPDATE → 99</text>
    <text x="470" y="104">COMMIT</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="230" y1="44" x2="230" y2="76"/><line x1="560" y1="44" x2="560" y2="76"/><line x1="760" y1="50" x2="760" y2="70"/>
    <line x1="480" y1="114" x2="480" y2="146"/>
  </g>
  <g stroke-width="1.2">
    <rect x="120" y="180" width="360" height="30" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
    <rect x="480" y="180" width="370" height="30" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)"/>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="300" y="200">version 1: qty = 10   (visible to A's snapshot)</text>
    <text x="665" y="200">version 2: qty = 99   (visible after B commits)</text>
  </g>
  <line x1="560" y1="76" x2="560" y2="180" style="stroke:var(--accent)" stroke-width="1.2" stroke-dasharray="3 3"/>
  <text x="560" y="240" class="s-sub" text-anchor="middle">A still reads version 1 here: its snapshot predates B's commit</text>
</svg>`
    },

    { t: "h2", n: "04", text: "Write skew and the doctor problem", id: "skew" },

    { t: "code", lang: "sql", title: "Two transactions each check the rule; together they break it (executed)",
      hl: [3, 4, 5, 6, 12, 15],
      code: `-- rule: at least one doctor must be on call. Alice and Bob both are; each asks to go off call.
-- A                                                   -- B
SELECT COUNT(*) FROM oncall WHERE on_call = 1;  -- 2    SELECT COUNT(*) FROM oncall WHERE on_call = 1;  -- 2
-- 2 >= 2, safe to leave                               -- 2 >= 2, safe to leave
UPDATE oncall SET on_call = 0 WHERE doctor = 'alice';  UPDATE oncall SET on_call = 0 WHERE doctor = 'bob';
COMMIT;                                                COMMIT;
-- on call now: 0.   Each transaction read the truth and wrote a different row. No row was written twice, so no
-- lost-update detection fires, and REPEATABLE READ is satisfied. Only SERIALIZABLE sees that the two reads and
-- two writes have no serial order and aborts one.

-- fixes, in order of preference:
-- 1. a constraint, if it can be expressed   (here it cannot -- "at least one" is a cross-row rule)
-- 2. lock what you read:   SELECT * FROM oncall WHERE on_call = 1 FOR UPDATE;   -- B now waits, then sees 1 and refuses
-- 3. serialise the rule through one row:   UPDATE shifts SET on_call_count = on_call_count - 1 WHERE shift_id = 7 AND on_call_count > 1;
-- 4. SET TRANSACTION ISOLATION LEVEL SERIALIZABLE, and retry on serialisation failure`,
      caption: "The executed output was `A saw 2 B saw 2 on call now: 0`. Write skew is the reason the phrase 'I checked before I wrote' is not a defence; the check and the write must be one indivisible unit, by lock, by single-row arithmetic, or by SERIALIZABLE."
    },

    { t: "ladder",
      title: "Reserving the last seat",
      rungs: [
        { level: "bad", label: "Check then insert", code: `SELECT COUNT(*) FROM bookings WHERE event_id = 7;   -- 99 of 100
INSERT INTO bookings (event_id, customer_id) VALUES (7, 3);   -- both callers pass the check; 101 booked`,
          note: "**Write skew.** Two callers each see 99, each insert, the event is oversold. Works perfectly in every test that runs one request at a time." },
        { level: "ok", label: "Lock the event row first", code: `BEGIN;
SELECT capacity FROM events WHERE event_id = 7 FOR UPDATE;      -- serialises all bookings for this event
SELECT COUNT(*) FROM bookings WHERE event_id = 7;
INSERT ...; COMMIT;`,
          note: "**Correct.** The FOR UPDATE on the parent row makes every booking for event 7 queue; unrelated events proceed in parallel." },
        { level: "best", label: "Keep the count on the row and let one UPDATE decide", code: `UPDATE events SET booked = booked + 1
WHERE  event_id = 7 AND booked < capacity;        -- rowcount 0: sold out, no insert
INSERT INTO bookings ... ;   -- only if the update hit`,
          note: "**Correct, lock held for microseconds, and the rule lives in one statement.** The denormalised count is maintained by the same transaction that inserts the booking, so it cannot drift." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Diagnose",
      title: "Which anomaly, which fix",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p", text: "For each scenario, name the anomaly, say whether READ COMMITTED permits it, and give the cheapest fix." },
        { t: "p", text: "**(a)** A report runs `SELECT SUM(amount) FROM orders` and then `SELECT COUNT(*) FROM orders`; a load commits between them, and the average computed from the two is wrong.\n\n**(b)** Two API calls both read `points = 500`, each adds 50, both write 550.\n\n**(c)** A sign-up checks `SELECT 1 FROM users WHERE email = ?`, finds nothing, inserts; two simultaneous sign-ups create two accounts with the same email.\n\n**(d)** A nightly job reads a row, does a minute of work, writes it back; a support agent edited the row during that minute and their edit is gone." }
      ],
      requirements: [
        "Name each anomaly precisely.",
        "State the isolation-level fact for READ COMMITTED.",
        "Give the fix that changes the least."
      ],
      hint: "Two of them are the same anomaly in different clothes. One is best fixed by a constraint, not a transaction setting.",
      solution: {
        lang: "sql",
        title: "Diagnoses",
        code: `-- (a) non-repeatable read / phantom across two statements. READ COMMITTED permits it: each statement has its own snapshot.
--     cheapest fix: one statement.   SELECT SUM(amount), COUNT(*) FROM orders;
--     if it must be several statements: BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; ... COMMIT;  -- one snapshot

-- (b) lost update. READ COMMITTED permits it.
--     fix: UPDATE users SET points = points + 50 WHERE user_id = ?;          -- atomic; no read to lose

-- (c) write skew on a uniqueness rule. READ COMMITTED permits it -- and so does REPEATABLE READ; the two inserts touch different rows.
--     fix: ALTER TABLE users ADD CONSTRAINT users_email_uq UNIQUE (email);   -- the database serialises it for you
--          and INSERT ... ON CONFLICT (email) DO NOTHING RETURNING user_id;  -- the second sign-up gets no row and knows why

-- (d) lost update again, with a long think between read and write. READ COMMITTED permits it. A lock held for a minute is wrong.
--     fix: optimistic.  read (row, version); ... work ...;
--          UPDATE t SET ..., version = version + 1 WHERE id = ? AND version = ?;   -- rowcount 0: the agent's edit wins; re-read and merge`,
        notes: [
          { t: "p", text: "**(b) and (d) are the same anomaly**; the difference is the length of the think. Short think: atomic UPDATE. Long think: version column, because holding a lock across a minute of work blocks everyone else for a minute." },
          { t: "p", text: "**(c) is the case where the isolation level is the wrong tool entirely.** A uniqueness rule is a constraint; declared, it is enforced under every level with no retries in application code." },
          { t: "p", text: "**(a) is the one case where the level itself is the cheap fix**, and only if the query cannot be one statement — which it almost always can." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does `UPDATE stock SET qty = qty - 3` prevent the lost update when `SELECT qty` followed by `UPDATE stock SET qty = 7` does not?",
          options: [
            "It is faster",
            "There is no read for a concurrent write to invalidate: the database reads the current value under the row lock and writes the result in one step, so two such updates serialise correctly",
            "It uses a higher isolation level",
            "It bypasses MVCC"
          ],
          answer: 1,
          why: "The anomaly lives in the gap between the application's read and its write. Remove the gap and there is nothing to lose."
        }
      ]
    }
  ],

  takeaways: [
    "**A lost update needs no isolation-level violation**: two read-modify-writes at READ COMMITTED, and the second write erases the first.",
    "**READ COMMITTED is the default** in PostgreSQL, Oracle and SQL Server; **REPEATABLE READ** in MySQL; neither stops the lost update on MySQL, and neither stops write skew anywhere.",
    "**MVCC gives every reader a snapshot** — per statement at READ COMMITTED, per transaction above — so readers and writers never block each other; old versions are the cost.",
    "**Fix the pattern, not the level**: atomic UPDATE, conditional UPDATE with a version column, or SELECT … FOR UPDATE.",
    "**Write skew is two transactions each checking a rule and each writing a different row**; only SERIALIZABLE, a lock on what was read, or a constraint stops it.",
    "**A constraint beats every isolation level** for any rule it can express — uniqueness above all.",
    "**SERIALIZABLE turns anomalies into serialisation failures** that the application must retry; it is the honest answer for cross-row invariants that cannot be constraints.",
    "**Deadlocks are detected and one side aborted**; acquire locks in a consistent order and keep transactions short (5.6).",
    "**Never hold a lock across user think-time or a long computation** — use optimistic versioning instead."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Under READ COMMITTED, a transaction runs the same SELECT twice and gets different rows. What is this and is it a bug in the database?",
        options: [
          "A dirty read; yes",
          "A non-repeatable read or phantom; no — READ COMMITTED gives each statement its own snapshot, so a commit between the two statements is legitimately visible to the second",
          "A lost update; yes",
          "Write skew; no"
        ],
        answer: 1,
        why: "It is the documented behaviour of the level. If two statements must agree, make them one statement or use REPEATABLE READ for that transaction."
      },
      {
        stem: "Which statement about MVCC is correct?",
        options: [
          "Writers block readers until commit",
          "Readers see a snapshot of committed data as of their statement or transaction start; writers create new row versions without blocking readers; old versions are reclaimed later",
          "Every read takes a shared lock",
          "It is only available at SERIALIZABLE"
        ],
        answer: 1,
        why: "Multi-version concurrency control is how PostgreSQL, InnoDB, Oracle and SQLite's WAL mode give repeatable reads without read locks — at the cost of storing and later vacuuming old versions."
      },
      {
        stem: "Two sign-ups with the same email both pass a SELECT-then-INSERT check and both succeed. What is the right fix?",
        options: [
          "SERIALIZABLE isolation",
          "A UNIQUE constraint on email: the database serialises the rule under every isolation level, and ON CONFLICT lets the second insert fail gracefully",
          "A longer transaction",
          "A retry loop"
        ],
        answer: 1,
        why: "This is write skew on a rule a constraint can express. Declare it and the anomaly is impossible rather than merely unlikely."
      },
      {
        stem: "What does a serialisation failure under SERIALIZABLE mean, and what should the application do?",
        options: [
          "The database is corrupt; restart it",
          "The database detected that the transaction's result could not match any serial ordering of the concurrent transactions and aborted it; retry the whole transaction from the start",
          "The transaction was too slow; increase the timeout",
          "Nothing; the write was applied"
        ],
        answer: 1,
        why: "The failure is the isolation level doing its job. Code that runs at SERIALIZABLE must be written to retry, which is why the atomic-UPDATE and constraint fixes are preferred where they apply."
      },
      {
        stem: "A job reads a row, computes for a minute, then writes it back. Which fix is appropriate?",
        options: [
          "SELECT … FOR UPDATE held for the minute",
          "A version column: write with WHERE version = the version read, and on rowcount 0 re-read and redo — no lock is held during the computation",
          "REPEATABLE READ",
          "Autocommit"
        ],
        answer: 1,
        why: "Optimistic concurrency detects the conflict at write time instead of preventing it with a lock that would block everyone for the duration of the work."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain the isolation levels and the anomalies each prevents.",
        strong: "READ UNCOMMITTED allows dirty reads — seeing uncommitted writes; PostgreSQL does not actually offer it. READ COMMITTED, the common default, prevents dirty reads but each statement gets its own snapshot, so a row can change between two reads in one transaction — non-repeatable reads and phantoms — and read-modify-write can lose updates. REPEATABLE READ gives the whole transaction one snapshot, so reads are stable; PostgreSQL also detects concurrent updates to the same row and aborts, MySQL does not. SERIALIZABLE guarantees the outcome equals some serial order, which is the only level that prevents write skew — two transactions each reading a set and each writing a different row so that together they break an invariant. The practical stance: fix read-modify-write with atomic or conditional updates, express rules as constraints where possible, and reserve SERIALIZABLE plus retries for cross-row invariants that cannot be constraints.",
        answer: [
          { t: "p", text: "The write-skew example and the engine differences at REPEATABLE READ are what distinguish an experienced answer." }
        ]
      },
      {
        level: "core",
        q: "How does MVCC let readers and writers avoid blocking each other?",
        strong: "Each write creates a new version of the row tagged with the writing transaction's id rather than overwriting in place. A reader is given a snapshot — the set of transactions committed as of its start — and sees, for each row, the newest version visible in that snapshot. So a writer never has to wait for readers and readers never see partial writes; the only conflicts are writer against writer on the same row. The costs are that old versions accumulate and must be reclaimed — VACUUM in PostgreSQL — and that a long-open transaction pins old versions and bloats the tables, which is one reason long transactions are discouraged.",
        answer: [
          { t: "p", text: "Mentioning the vacuum cost and the long-transaction pin shows you have operated one, not only read about it." }
        ]
      },
      {
        level: "advanced",
        q: "A ticketing system oversells events under load. Diagnose and fix it.",
        strong: "Almost certainly a check-then-insert: count the bookings, compare with capacity, insert. Two requests both see 99 of 100 and both insert — write skew, permitted at READ COMMITTED and REPEATABLE READ because the two inserts are different rows. Fixes in order of preference: keep a booked counter on the event row and make one atomic UPDATE the gate — SET booked = booked + 1 WHERE booked < capacity, insert the booking only if a row was updated; or lock the event row with SELECT FOR UPDATE before counting, which serialises bookings per event; or run at SERIALIZABLE and retry on failure. I would take the counter, because the rule lives in one statement, the lock is held for microseconds, and it does not depend on anyone remembering to set an isolation level.",
        answer: [
          { t: "p", text: "Naming the anomaly, listing the three fixes, and choosing with a reason is the full answer." }
        ]
      }
    ]
  }
});
