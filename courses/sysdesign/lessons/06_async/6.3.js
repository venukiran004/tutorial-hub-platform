/* ============================================================================
   LESSON 6.3 — Delivery Semantics and Idempotency
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "Every message system makes one of two promises about crashes: a message may be **lost** (at-most-once) or it may be **delivered again** (at-least-once). There is no third option at the transport level, because a consumer cannot apply an effect and record that it did so in one indivisible step on two different systems. **Exactly-once** is real, but it is an end-to-end property you build: at-least-once delivery plus a consumer whose effects are **idempotent** — applied once however many times the message arrives. That idempotency must be stored in the same transaction as the effect, or it is an illusion.",

  objectives: [
    "Explain at-most-once and at-least-once by where the offset commit happens relative to the effect",
    "Measure lost and duplicated effects under crashes for each ordering",
    "Explain what \"exactly-once\" means in practice and where it holds",
    "Make a consumer idempotent with a dedupe record written in the same transaction as the effect",
    "Design idempotency keys for APIs and for messages"
  ],

  prerequisites: ["6.1", "1.4"],

  blocks: [

    { t: "h2", n: "01", id: "two", text: "Commit first, or process first",
      sub: "The order of two steps decides what a crash costs" },

    { t: "diagram", kind: "matrix", title: "Where the consumer crashes, and what each ordering does about it",
      caption: "A consumer does two things: applies the effect and records its progress (commits the offset or acknowledges). Whichever comes first, a crash between them leaves one done and one not. Commit first and the effect is lost; process first and it will be applied again.",
      cols: ["Crash before effect", "Crash between", "Crash after both"],
      rows: ["Commit, then process (at-most-once)", "Process, then commit (at-least-once)", "Idempotent consumer (effectively once)"],
      cells: [
        [{ text: "lost", tone: "crit" }, { text: "lost", tone: "crit" }, { text: "fine", tone: "good" }],
        [{ text: "retried: fine", tone: "good" }, { text: "applied twice", tone: "warn" }, { text: "fine", tone: "good" }],
        [{ text: "retried: fine", tone: "good" }, { text: "retried, deduplicated", tone: "good" }, { text: "fine", tone: "good" }]
      ] },

    { t: "code", lang: "python", title: "semantics.py — ten thousand events, a consumer that crashes on 2% of them", code: `import random

def run(strategy, events=10_000, crash_p=0.02, seed=8):
    """A consumer reads event i, applies its effect (+1 to a counter per event), commits
    the offset. It may crash at any point; on restart it resumes from the committed offset."""
    rng = random.Random(seed)
    applied = [0] * events                  # how many times each event's effect happened
    processed_ids = set()                   # the dedupe record (used by "idempotent")
    committed = 0
    while committed < events:
        i = committed
        crash_point = rng.random() < crash_p and rng.choice(["before effect", "between", "after commit"])
        if strategy == "commit, then process":          # at-most-once
            committed = i + 1
            if crash_point in ("before effect", "between"): continue   # committed, never processed
            applied[i] += 1
        else:                                            # process, then commit: at-least-once
            if crash_point == "before effect": continue                 # retried from offset i
            if strategy == "idempotent":
                if i not in processed_ids:               # dedupe record + effect: one transaction
                    processed_ids.add(i); applied[i] += 1
            else:
                applied[i] += 1
            if crash_point == "between": continue        # effect done, offset not committed: redelivered
            committed = i + 1
    lost = sum(a == 0 for a in applied); dup = sum(a > 1 for a in applied)
    return lost, dup

print("10,000 events, the consumer crashes on 2% of them at a random point")
print("%-24s %10s %14s" % ("strategy", "lost", "duplicated"))
for s in ("commit, then process", "process, then commit", "idempotent"):
    lost, dup = run(s)
    print("%-24s %10d %14d" % (s, lost, dup))`,
      out: `10,000 events, the consumer crashes on 2% of them at a random point
strategy                       lost     duplicated
commit, then process            137              0
process, then commit              0             74
idempotent                        0              0`,
      hl: [14, 15, 20, 21, 24, 25],
      caption: "Committing first **lost** every event whose processing was interrupted. Processing first lost nothing and **applied dozens of events twice** — every crash between the effect and the commit. The idempotent consumer, at-least-once underneath, applied every event exactly once. For counters, payments and emails, \"lost\" and \"twice\" are both bugs; for metrics or cache refreshes, one of them may be acceptable." },

    { t: "callout", kind: "insight", title: "What \"exactly-once\" really means",
      body: [
        { t: "p", text: "Kafka's exactly-once semantics are genuine — within Kafka. An idempotent producer de-duplicates its own retries per partition, and transactions let a consumer that reads from Kafka and writes to Kafka commit its output and its input offsets atomically. As soon as the effect leaves Kafka — a database row, an email, a call to a payment API — the guarantee stops, and the consumer is back to at-least-once delivery plus its own idempotency." },
        { t: "p", text: "So the honest phrase is **effectively once**: at-least-once delivery, made harmless by idempotent processing. It is the same idea as the `Idempotency-Key` on a POST (1.4) and the de-duplicated webhook receiver (1.6), applied to every consumer." }
      ] },

    { t: "h2", n: "02", id: "idempotent", text: "Making effects idempotent",
      sub: "Naturally, by design, or with a dedupe record" },

    { t: "diagram", kind: "steps", title: "Three ways to make an effect safe to repeat",
      caption: "Prefer the first two: they need no extra storage and cannot drift. Use a dedupe record when the effect is inherently cumulative — add money, send a message, increment a count.",
      items: [
        { label: "Naturally idempotent operations", desc: "set status = 'shipped', upsert a row by key, delete by id — twice equals once", code: "SET, UPSERT", tone: "good" },
        { label: "Conditional writes", desc: "apply only if the version is the one you expect, or the event is newer than the last applied", code: "WHERE version = ?", tone: "accent" },
        { label: "A dedupe record per message", desc: "store the message id under a unique constraint, in the same transaction as the effect", code: "processed(event_id)", tone: "violet" },
        { label: "Idempotency key to the next system", desc: "pass a key derived from the message to any downstream API so it deduplicates too", code: "Idempotency-Key", tone: "teal" }
      ] },

    { t: "callout", kind: "trap", title: "The dedupe check in a separate transaction",
      body: [
        { t: "p", text: "The obvious implementation is: look up the event id; if not seen, apply the effect; then record the id. Three steps, two or three transactions. A crash after the effect and before the record — exactly the \"between\" case — means the event is redelivered, the lookup finds nothing, and the effect is applied again. The dedupe table made the bug rarer, not impossible, and harder to notice." },
        { t: "p", text: "The record and the effect must **commit together**: insert the event id under a primary-key constraint inside the same database transaction as the effect, and let the constraint violation mean \"already done\". The exercise below measures the difference. When the effect lives in another system that cannot share your transaction — a payment API — pass an idempotency key so that system deduplicates, and store its result." }
      ] },

    { t: "h3", text: "Idempotency keys, designed" },

    { t: "table",
      head: ["Decision", "Recommendation", "Why"],
      rows: [
        ["Who generates the key", "The caller, once per logical operation", "Only the caller knows two attempts are the same intent"],
        ["What it is derived from", "A message or event id, or a UUID made before the first attempt", "Must be identical on every retry"],
        ["Scope", "Per client / tenant", "Prevents collisions and cross-tenant probing (1.5)"],
        ["What is stored", "Key, request hash, status, the full response", "A retry gets the original answer, not just \"duplicate\""],
        ["Retention", "Longer than the longest retry or replay window", "Hours to days; replays from a log can go further back"]
      ],
      caption: "The same table applies to a payment API, a message consumer and a saga step (5.4): the key identifies the intent, and the stored result makes repetition harmless." },

    { t: "exercise", kind: "Challenge", title: "A wallet that never double-credits",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A consumer credits a wallet for each top-up event. Delivery is at-least-once: 5% of attempts crash after the credit, and 5% of acknowledgements are lost, so the event is redelivered. Five hundred top-ups of 10 should leave a balance of exactly 5,000." }
      ],
      requirements: [
        "Implement the consumer with the dedupe check and the record in separate steps",
        "Implement it with the dedupe insert and the credit in one transaction",
        "Run both under the same crashes and redeliveries",
        "Report deliveries and the final balance for each",
        "Explain why the primary-key violation is the duplicate detector"
      ],
      hint: "In the correct version, try to insert the event id first. If it violates the primary key, the event was already applied — roll back and return.",
      solution: { lang: "python", title: "idem_consumer_ex.py",
        code: `import random, sqlite3

class Crash(Exception): pass

def make_db():
    db = sqlite3.connect(":memory:", isolation_level=None)
    db.execute("CREATE TABLE wallet (user_id INTEGER PRIMARY KEY, balance INTEGER)")
    db.execute("CREATE TABLE processed (event_id TEXT PRIMARY KEY)")
    db.execute("INSERT INTO wallet VALUES (7, 0)")
    return db

def separate_steps(db, ev, crash):
    """Wrong: the dedupe record and the effect are written in two transactions."""
    if db.execute("SELECT 1 FROM processed WHERE event_id = ?", (ev["id"],)).fetchone():
        return
    db.execute("UPDATE wallet SET balance = balance + ? WHERE user_id = 7", (ev["amount"],))
    if crash: raise Crash()                                   # dies before recording it
    db.execute("INSERT INTO processed VALUES (?)", (ev["id"],))

def one_transaction(db, ev, crash):
    """Right: the dedupe record and the effect commit together or not at all."""
    db.execute("BEGIN")
    try:
        db.execute("INSERT INTO processed VALUES (?)", (ev["id"],))   # PK violation = duplicate
    except sqlite3.IntegrityError:
        db.execute("ROLLBACK"); return
    db.execute("UPDATE wallet SET balance = balance + ? WHERE user_id = 7", (ev["amount"],))
    if crash:
        db.execute("ROLLBACK"); raise Crash()                 # a crash before COMMIT undoes both
    db.execute("COMMIT")

rng = random.Random(2)
events = [{"id": f"evt_{i}", "amount": 10} for i in range(500)]       # 500 top-ups of 10 = 5,000
for name, handler in (("separate steps", separate_steps), ("one transaction", one_transaction)):
    db, deliveries, queue = make_db(), 0, list(events)
    while queue:
        ev = queue.pop(0); deliveries += 1
        try:
            handler(db, ev, crash=rng.random() < 0.05)
        except Crash:
            queue.append(ev)                                   # not acknowledged: redelivered
            continue
        if rng.random() < 0.05: queue.append(ev)              # ack lost: redelivered anyway
    bal = db.execute("SELECT balance FROM wallet").fetchone()[0]
    print("%-16s deliveries %4d   balance %5d   (correct: 5000)" % (name, deliveries, bal))`,
        out: `separate steps   deliveries  549   balance  5230   (correct: 5000)
one transaction  deliveries  556   balance  5000   (correct: 5000)`,
        notes: [
          { t: "p", text: "With separate steps the wallet was over-credited: every crash between the credit and the record left a credit with no record, and the redelivery applied it again. One transaction makes the crash roll back **both** the record and the credit, so the redelivery finds nothing and applies it once; a lost acknowledgement finds the record and does nothing." },
          { t: "p", text: "Inserting the event id first and treating the primary-key violation as \"already processed\" uses the database's own uniqueness guarantee as the check, which is atomic and race-free even with two consumers handling the same event at once — something a SELECT-then-INSERT is not (5.2)." },
          { t: "p", text: "The `processed` table grows with every event, so in production it gets a retention policy at least as long as the topic's retention, or a compact form such as storing the highest applied offset per partition when processing is strictly ordered." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the loyalty points that kept arriving",
      body: [
        { t: "p", text: "**Symptom.** During a Kafka broker upgrade, the loyalty service's consumer group rebalanced a dozen times in an hour. Afterwards, customers' points balances were higher than their purchases justified; a few thousand had been credited two to five times for the same order." },
        { t: "p", text: "**Mechanism.** The consumer added points and then committed offsets every five seconds. Each rebalance revoked partitions from consumers that had processed events but not yet committed, and the new owners started from the last committed offset — redelivering up to five seconds of already-applied events per partition per rebalance. The consumer had always been at-least-once; the rebalances simply made \"at least\" much larger than one." },
        { t: "p", text: "**Fix.** The points update and a `processed(order_id)` insert moved into one transaction, making redelivery harmless however often it happens; offsets are committed on partition revocation; and the excess points were reversed by replaying the topic against the now-idempotent consumer in dry-run mode to compute each customer's correct total. The lesson the team wrote down: **design every consumer as if every message will arrive twice, because during an incident many will.**" }
      ] }
  ],

  takeaways: [
    "A consumer applies an effect and records progress; **the order of those two steps decides what a crash costs**.",
    "**Commit then process** = at-most-once: crashes lose messages. **Process then commit** = at-least-once: crashes duplicate them.",
    "Measured: committing first **lost** 137 events in 10,000; processing first **duplicated** 74; an idempotent consumer did neither.",
    "**Exactly-once** holds inside systems like Kafka transactions; once the effect leaves, it is **at-least-once + idempotency** — effectively once.",
    "Make effects idempotent by **natural idempotence** (set, upsert), **conditional writes**, or a **dedupe record**.",
    "The dedupe record must be written **in the same transaction as the effect** — measured, separate steps over-credited a wallet; one transaction kept it exact.",
    "Let a **primary-key violation** be the duplicate detector: atomic and race-free.",
    "Idempotency keys come from the **caller**, are **stable across retries**, **scoped per client**, and stored **with the response**.",
    "Design every consumer as if **every message arrives twice** — rebalances and replays make it so."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A consumer commits its offset and then processes the message. It crashes after committing. What happens to that message?",
        options: ["It is redelivered", "It is lost — the restarted consumer resumes after it", "It is processed twice", "It goes to a dead-letter queue"],
        answer: 1,
        why: "The committed offset says the message was handled, so the restarted consumer begins after it and the message is never processed — at-most-once, 137 losses in the simulation. Redelivery is what happens when processing comes before the commit. Nothing reached the dead-letter queue, because no processing attempt failed." },

      { stem: "Which statement about exactly-once delivery is accurate?",
        options: ["Kafka guarantees exactly-once effects in any database you write to", "Exactly-once is impossible in every sense", "It holds within a system that can commit output and progress atomically; across systems it is at-least-once plus idempotent processing", "It requires two-phase commit with every consumer"],
        answer: 2,
        why: "Kafka transactions make read-process-write within Kafka exactly-once; once an effect lands elsewhere, delivery is at-least-once and the consumer must deduplicate. It is not impossible in every sense, Kafka cannot extend its guarantee to your database, and 2PC with every consumer is neither required nor typical." },

      { stem: "A consumer checks a processed-events table, applies a credit, then inserts the event id, each in its own transaction. What can still go wrong?",
        options: ["Nothing; the table prevents duplicates", "A crash after the credit and before the insert leads to the credit being applied again on redelivery", "The table grows too fast", "Messages are lost"],
        answer: 1,
        why: "The check and the record are separate from the effect, so the window between applying the credit and recording the id is exactly where a crash makes redelivery look new — the exercise's separate-steps balance overshot. Putting the insert and the credit in one transaction closes it. Growth is a retention concern, and processing first means nothing is lost." },

      { stem: "Who should generate an idempotency key for a payment request, and when?",
        options: ["The server, when it receives the request", "The caller, once per logical payment, before the first attempt", "A new random key for every retry", "The database, as an auto-increment id"],
        answer: 1,
        why: "Only the caller knows that two requests are attempts at the same payment, so it must create the key once and reuse it on every retry. A server-generated or per-retry key differs between attempts and cannot identify duplicates, and an auto-increment id is assigned after the server has already treated the request as new." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Say \"at-least-once plus idempotency\" and then show where the transaction boundary is.",
    questions: [
      { level: "core",
        q: "How do you guarantee a message is processed exactly once?",
        strong: "A strong answer reframes as effectively-once and puts the dedupe record in the effect's transaction.",
        answer: [
          { t: "p", text: "At the transport level I can only choose between at-most-once and at-least-once, because the consumer cannot apply an effect and record its progress in one step across two systems. So I take at-least-once — process, then commit — and make the processing idempotent, which gives effectively-once." },
          { t: "p", text: "Concretely: if the effect is naturally idempotent, like setting a status or upserting by key, nothing more is needed. Otherwise I insert the message id into a processed table under a unique constraint in the same database transaction as the effect, and treat a constraint violation as already done. For effects in other systems, I pass an idempotency key derived from the message id. Kafka's transactions give true exactly-once only for Kafka-to-Kafka pipelines." }
        ] },

      { level: "advanced",
        q: "A consumer crashed after processing a Kafka message but before committing the offset. What happens and how do you handle it?",
        strong: "A strong answer explains redelivery on restart or rebalance and the idempotency that makes it safe.",
        answer: [
          { t: "p", text: "When the consumer restarts, or another group member takes over the partition after a rebalance, it resumes from the last committed offset, so that message — and possibly a batch of others processed since the last commit — is delivered again. That is normal at-least-once behaviour and gets much larger during incidents with repeated rebalances." },
          { t: "p", text: "It is handled by idempotency, not by trying to commit faster: dedupe records written in the same transaction as the effect, or naturally idempotent writes, so redelivery changes nothing. Committing offsets on partition revocation reduces how much is redelivered, but the design must be correct even when it does not." }
        ] },

      { level: "core",
        q: "How would you design idempotency for a payments API?",
        strong: "A strong answer covers key generation, scope, stored response, request hashing and retention.",
        answer: [
          { t: "p", text: "Clients send an Idempotency-Key header they generate once per logical payment and reuse on retries. The server stores the key scoped to the client, a hash of the request body, the status and the full response, written in the same transaction as the payment record. A repeat with the same key and body returns the stored response; the same key with a different body is rejected as a client error." },
          { t: "p", text: "A request still in progress when its retry arrives gets a 409 or waits on the first, so two attempts never run concurrently. Keys are kept for longer than any client retries — typically a day or more — and calls the service makes downstream carry keys derived from the original, so the whole chain is idempotent." }
        ] }
    ]
  }
});
