/* ============================================================================
   LESSON 5.4 — Distributed Transactions: 2PC and Sagas
   ========================================================================= */
EC.receiveLesson({
  id: "5.4",

  lede: "Once an order touches the orders database, the payments service and the inventory service, no single database transaction can cover it. There are two families of answer. **Two-phase commit** makes several resources agree to commit together — atomic, and **blocking**: if the coordinator dies at the wrong moment, every participant waits, holding its locks. A **saga** gives up atomicity: it runs local transactions one after another and, on failure, runs **compensations** that semantically undo the completed ones. Sagas are how most microservice systems do it, and they work only if you order the steps around the one you cannot undo.",

  objectives: [
    "Trace two-phase commit and identify where it blocks",
    "Explain why 2PC is rare between services and where it is still used",
    "Design a saga with compensating actions and run it through a failure",
    "Order saga steps around the pivot so irreversible effects come after it",
    "Choose between orchestration and choreography for a saga"
  ],

  prerequisites: ["5.2", "1.5"],

  blocks: [

    { t: "h2", n: "01", id: "2pc", text: "Two-phase commit",
      sub: "Everyone promises, then everyone does it" },

    { t: "viz", title: "2PC when it works, and when the coordinator dies",
      caption: "Phase 1: each participant does the work, writes it durably, takes its locks and votes yes — a promise it can no longer take back on its own. Phase 2: the coordinator logs the decision and tells everyone. If the coordinator dies between the two phases, the participants have promised and do not know the outcome; they must wait, locks held, until it returns.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img"><defs><marker id="q23732accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q23732good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q23732warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q23732crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q23732violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q23732teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q23732line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">Phase 1 prepare, phase 2 commit</text>
<rect x="4.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="60.0" y="54" text-anchor="middle" class="s-label">Coordinator</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Orders</text>
<rect x="254.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="310.0" y="54" text-anchor="middle" class="s-label">Payments</text>
<line x1="60.0" y1="64" x2="60.0" y2="268.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="268.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="310.0" y1="64" x2="310.0" y2="268.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="60.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q23732accent)"/>
<text x="122.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">PREPARE</text>
<line x1="60.0" y1="110" x2="306.0" y2="110" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q23732accent)"/>
<text x="185.0" y="104" text-anchor="middle" class="s-sub" style="fill:var(--accent)">PREPARE</text>
<line x1="185.0" y1="138" x2="64.0" y2="138" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q23732warn)"/>
<text x="122.5" y="132" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(yes, locked)</text>
<line x1="310.0" y1="166" x2="64.0" y2="166" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q23732warn)"/>
<text x="185.0" y="160" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(yes, locked)</text>
<rect x="15.0" y="182" width="90" height="20" rx="5" style="fill:var(--violet);fill-opacity:.16;stroke:var(--violet)"/>
<text x="60.0" y="196" text-anchor="middle" class="s-sub" style="fill:var(--ink)">log: COMMIT</text>
<line x1="60.0" y1="222" x2="181.0" y2="222" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q23732good)"/>
<text x="122.5" y="216" text-anchor="middle" class="s-sub" style="fill:var(--good)">COMMIT</text>
<line x1="60.0" y1="250" x2="306.0" y2="250" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q23732good)"/>
<text x="185.0" y="244" text-anchor="middle" class="s-sub" style="fill:var(--good)">COMMIT</text><line x1="380.0" y1="10" x2="380.0" y2="270" style="stroke:var(--line);stroke-dasharray:4 4"/><g transform="translate(390.0,0)"><defs><marker id="r21981accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="r21981good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="r21981warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="r21981crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="r21981violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="r21981teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="r21981line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="185.0" y="20" text-anchor="middle" class="s-label">The coordinator dies after the votes</text>
<rect x="4.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="60.0" y="54" text-anchor="middle" class="s-label">Coordinator</text>
<rect x="129.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="185.0" y="54" text-anchor="middle" class="s-label">Orders</text>
<rect x="254.0" y="36" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="310.0" y="54" text-anchor="middle" class="s-label">Payments</text>
<line x1="60.0" y1="64" x2="60.0" y2="262.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="185.0" y1="64" x2="185.0" y2="262.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="310.0" y1="64" x2="310.0" y2="262.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="60.0" y1="82" x2="181.0" y2="82" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#r21981accent)"/>
<text x="122.5" y="76" text-anchor="middle" class="s-sub" style="fill:var(--accent)">PREPARE</text>
<line x1="60.0" y1="110" x2="306.0" y2="110" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#r21981accent)"/>
<text x="185.0" y="104" text-anchor="middle" class="s-sub" style="fill:var(--accent)">PREPARE</text>
<line x1="185.0" y1="138" x2="64.0" y2="138" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r21981warn)"/>
<text x="122.5" y="132" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(yes, locked)</text>
<line x1="310.0" y1="166" x2="64.0" y2="166" style="stroke:var(--warn);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#r21981warn)"/>
<text x="185.0" y="160" text-anchor="middle" class="s-sub" style="fill:var(--warn)">(yes, locked)</text>
<rect x="15.0" y="182" width="90" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="60.0" y="196" text-anchor="middle" class="s-sub" style="fill:var(--ink)">crashes</text>
<text x="185.0" y="226" text-anchor="middle" class="s-sub" style="font-style:italic">both hold locks, cannot decide alone</text>
<rect x="140.0" y="232" width="90" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="185.0" y="246" text-anchor="middle" class="s-sub" style="fill:var(--ink)">blocked</text></g></svg>` },

    { t: "code", lang: "python", title: "twopc.py — three outcomes, and how long locks are held", code: `class Participant:
    def __init__(self, name, vote="yes"):
        self.name, self.vote_with, self.state, self.locked_since = name, vote, "idle", None
    def prepare(self, t):
        if self.vote_with == "no":
            self.state = "aborted"; return "no"
        self.state, self.locked_since = "prepared", t     # durable promise; locks held from here
        return "yes"
    def finish(self, decision, t):
        held = t - self.locked_since if self.locked_since is not None else 0
        self.state, self.locked_since = decision, None
        return held

def run(scenario):
    ps = [Participant("orders"), Participant("payments", "no" if scenario == "a participant votes no" else "yes"),
          Participant("inventory")]
    t, log = 0, []
    votes = [p.prepare(t) for p in ps]; t += 5               # phase 1: prepare, collect votes
    decision = "committed" if all(v == "yes" for v in votes) else "aborted"
    log.append(f"votes {votes} -> decide {decision}")
    if scenario == "coordinator crashes after the votes":
        log.append("coordinator crashes before sending the decision; restarts after 30 min")
        t += 30 * 60 * 1000                                  # nobody may decide in its place
    held = [p.finish(decision, t) for p in ps if p.state == "prepared"]   # phase 2
    log.append("participants %s; locks were held for up to %s ms" % (decision, "{:,}".format(max(held, default=0))))
    return log

for s in ("all vote yes", "a participant votes no", "coordinator crashes after the votes"):
    print(s)
    for line in run(s): print("   " + line)`,
      out: `all vote yes
   votes ['yes', 'yes', 'yes'] -> decide committed
   participants committed; locks were held for up to 5 ms
a participant votes no
   votes ['yes', 'no', 'yes'] -> decide aborted
   participants aborted; locks were held for up to 5 ms
coordinator crashes after the votes
   votes ['yes', 'yes', 'yes'] -> decide committed
   coordinator crashes before sending the decision; restarts after 30 min
   participants committed; locks were held for up to 1,800,005 ms`,
      hl: [7, 21, 23, 24],
      caption: "One \"no\" vote aborts everything cleanly — that is 2PC's strength. But a coordinator crash after the votes leaves every participant **prepared and locked for as long as the coordinator is down** — thirty minutes here — because a participant that has voted yes may not commit or abort on its own: the coordinator might have decided either way. Rows locked for thirty minutes in a payments table are an outage." },

    { t: "diagram", kind: "compare", title: "Where 2PC fits",
      caption: "2PC is alive and well inside systems that own all the participants and replicate the coordinator's decision with consensus. Between independently deployed services owned by different teams, its blocking failure mode and tight coupling make sagas the usual choice.",
      columns: [
        { title: "Good fit", tone: "good", items: [
          "inside one distributed database: Spanner, CockroachDB",
          "coordinator replicated with Paxos/Raft (8.3) — no single point",
          "XA between a database and a message broker in one app",
          "few participants, short transactions, one operator"
        ] },
        { title: "Poor fit", tone: "crit", items: [
          "microservices owned by different teams",
          "third-party APIs (a payment provider cannot \"prepare\")",
          "long-running steps: a courier booking, a human approval",
          "anything where locks held for minutes are unacceptable"
        ] }
      ] },

    { t: "h2", n: "02", id: "saga", text: "Sagas",
      sub: "A sequence of local transactions, each with an undo" },

    { t: "p", text: "A saga splits the business transaction into steps, each a local transaction in one service that commits immediately. Every step has a **compensation** — an action that semantically undoes it: a refund for a charge, a release for a reservation, a cancellation for a booking. If a step fails, the saga runs the compensations of the completed steps in reverse order:" },

    { t: "code", lang: "python", title: "saga.py — an order saga where the courier booking fails", code: `import itertools

class Service:
    def __init__(self, name): self.name, self.effects, self.seen = name, [], set()
    def do(self, key, what, fail=False):
        if key in self.seen: return "duplicate ignored"      # idempotent by key
        if fail: raise RuntimeError(f"{self.name}: {what} failed")
        self.seen.add(key); self.effects.append(what); return "ok"

orders, payments, stock, shipping = (Service(n) for n in ("orders", "payments", "inventory", "shipping"))
order_id = "ord_901"
STEPS = [  # (service, action, compensation) — the compensation semantically undoes the action
    (orders,   "create order (pending)",  "mark order cancelled"),
    (payments, "charge card £49.99",       "refund card £49.99"),
    (stock,    "reserve 1 kettle",         "release 1 kettle"),
    (shipping, "book courier",             "cancel courier"),
]

def orchestrate(fail_at=None):
    done, log = [], []
    for i, (svc, action, comp) in enumerate(STEPS):
        try:
            svc.do(f"{order_id}:{action}", action, fail=(i == fail_at))
            done.append((svc, comp)); log.append(f"  ✓ {svc.name:<9} {action}")
        except RuntimeError as e:
            log.append(f"  ✗ {e}")
            for svc_c, comp_c in reversed(done):            # compensate, newest first
                svc_c.do(f"{order_id}:{comp_c}", comp_c)
                log.append(f"  ↺ {svc_c.name:<9} {comp_c}")
            return log, "order cancelled, every completed step compensated"
    orders.do(f"{order_id}:confirm", "confirm order")
    return log, "order confirmed"

log, outcome = orchestrate(fail_at=3)                      # the courier booking fails
print("\\n".join(log)); print("  ->", outcome)
print("  payments saw:", payments.effects)
print("  retry of the refund after a timeout:", payments.do(f"{order_id}:refund card £49.99", "refund card £49.99"))`,
      out: `  ✓ orders    create order (pending)
  ✓ payments  charge card £49.99
  ✓ inventory reserve 1 kettle
  ✗ shipping: book courier failed
  ↺ inventory release 1 kettle
  ↺ payments  refund card £49.99
  ↺ orders    mark order cancelled
  -> order cancelled, every completed step compensated
  payments saw: ['charge card £49.99', 'refund card £49.99']
  retry of the refund after a timeout: duplicate ignored`,
      hl: [6, 27, 28],
      caption: "Three steps committed, the fourth failed, and the three were compensated newest-first. Notice what the customer could observe in between: their card was charged and then refunded — a saga is **not isolated**; intermediate states are real and visible (section 03). And the compensations are **idempotent** by key, because the orchestrator will retry a refund whose response it never received." },

    { t: "diagram", kind: "compare", title: "Orchestration or choreography",
      caption: "Choreography suits short sagas with a few participants. Once a saga has more than three or four steps, or conditional paths, an explicit orchestrator — often a workflow engine such as Temporal or AWS Step Functions — makes the flow visible, testable and recoverable.",
      columns: [
        { title: "Orchestration — a coordinator calls each step", tone: "accent", items: [
          "one place holds the saga's state and order",
          "easy to see, test and change the flow",
          "compensation logic is explicit and central",
          "the orchestrator must be durable (a workflow engine)",
          "risk: it becomes a god service if it grows business logic"
        ] },
        { title: "Choreography — services react to events", tone: "violet", items: [
          "OrderCreated → payment listens and charges → PaymentTaken → …",
          "no central coordinator; loose coupling",
          "the flow exists only implicitly across services",
          "hard to answer \"where is order 901 stuck?\"",
          "cyclic event chains are easy to create by accident"
        ] }
      ] },

    { t: "h2", n: "03", id: "design", text: "Designing a saga that can always finish",
      sub: "Pivots, retriable steps and semantic locks" },

    { t: "diagram", kind: "steps", title: "The shape of a correct saga",
      caption: "The pivot is the step after which the saga will only go forward. Everything before it must be compensatable; everything after it must be retriable until it succeeds. Irreversible side effects — emails, shipments, notifications to third parties — belong after the pivot.",
      items: [
        { label: "Compensatable steps", desc: "reserve stock, authorise (hold) payment — each has an undo", code: "can roll back", tone: "good" },
        { label: "The pivot", desc: "capture the payment: once it succeeds, the saga commits to finishing", code: "point of no return", tone: "crit" },
        { label: "Retriable steps", desc: "book courier, award points — retried with backoff until done (7.1)", code: "must succeed", tone: "accent" },
        { label: "Irreversible effects last", desc: "send the confirmation email only when nothing can roll back", code: "after the pivot", tone: "violet" }
      ] },

    { t: "callout", kind: "trap", title: "Sagas are not isolated",
      body: [
        { t: "p", text: "Each step commits as it goes, so other transactions see the in-between states: the stock is reserved for an order that will be cancelled, the card shows a charge that will be refunded, and a report counts revenue that disappears an hour later. A second saga can read the first one's half-finished state and act on it — the distributed version of 5.2's anomalies." },
        { t: "p", text: "Countermeasures are designed in: **semantic locks** (an order in state `PENDING` that other operations treat as not yet real), **commutative updates** (adjust stock by deltas, not by setting absolute values), **reordering** so that steps others depend on happen late, and reading the authoritative state again before an irreversible action. None of these is automatic; each is a decision about what the rest of the system may see mid-saga." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Order the steps of a checkout saga",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "A checkout saga has six steps. Two are compensatable (reserve stock, authorise a card hold), one is the pivot (capture the payment), two are retriable (book courier, award loyalty points), and one is irreversible (send the confirmation email). The current implementation sends the email second." }
      ],
      requirements: [
        "Model each step's kind and simulate a failure at each step in turn",
        "Before the pivot, a failure rolls back; after it, the saga retries forward",
        "Count cancelled orders left with an effect that cannot be undone",
        "Reorder the steps so that count is zero, and explain the rule you applied"
      ],
      hint: "A failure can only cancel the order if it happens before the pivot. Which steps can therefore be left behind by a cancellation?",
      solution: { lang: "python", title: "saga_order_ex.py",
        code: `# Kinds: "compensatable" steps can be undone; the "pivot" is the point of no return;
# "irreversible" steps cannot be undone. A saga may only ROLL BACK before its pivot;
# after it, every failure is retried forward until it succeeds.
STEPS = {
    "reserve stock":           "compensatable",
    "authorise payment":       "compensatable",   # a hold on the card, releasable
    "capture payment":         "pivot",           # money taken
    "send confirmation email": "irreversible",
    "book courier":            "retriable",
    "award loyalty points":    "retriable",
}

def damage(order):
    """Fail each step in turn. Count irreversible effects left behind on a cancelled order."""
    total = []
    for i, step in enumerate(order):
        done = order[:i]
        if "pivot" in (STEPS[s] for s in done):
            continue                                  # past the pivot: retry forward, never cancel
        left = [s for s in done if STEPS[s] == "irreversible"]
        if left: total.append(f"fail at '{step}' leaves: {', '.join(left)}")
    return total

written = ["reserve stock", "send confirmation email", "authorise payment",
           "capture payment", "book courier", "award loyalty points"]
fixed = ["reserve stock", "authorise payment", "capture payment",
         "book courier", "award loyalty points", "send confirmation email"]
for name, order in (("as written", written), ("reordered", fixed)):
    d = damage(order)
    print("%-10s %s" % (name, " -> ".join(order)))
    print("           cancelled orders with effects that cannot be undone: %d" % len(d))
    for line in d: print("             " + line)`,
        out: `as written reserve stock -> send confirmation email -> authorise payment -> capture payment -> book courier -> award loyalty points
           cancelled orders with effects that cannot be undone: 2
             fail at 'authorise payment' leaves: send confirmation email
             fail at 'capture payment' leaves: send confirmation email
reordered  reserve stock -> authorise payment -> capture payment -> book courier -> award loyalty points -> send confirmation email
           cancelled orders with effects that cannot be undone: 0`,
        notes: [
          { t: "p", text: "As written, a declined card authorisation or a failed capture cancels an order whose customer has already received \"your order is confirmed\" — the email is irreversible and sits before the pivot. Moving it after the pivot makes that impossible: by the time it is sent, the saga can only finish." },
          { t: "p", text: "The rule is the step diagram above: **compensatable steps, then the pivot, then retriable steps, then irreversible effects**. Authorising before capturing is the same idea applied inside payments — a hold is undoable, a capture is not — and is why card payments are two calls." },
          { t: "p", text: "\"Retriable\" is a promise you have to keep: after the pivot a courier booking that fails must be retried — with backoff, idempotency keys and eventually a human — because there is no longer any path that cancels the order cleanly. Sagas move failure handling from rollback to persistence, which is why they belong in a durable workflow engine rather than in an in-memory request handler." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: refunds that were issued three times",
      body: [
        { t: "p", text: "**Symptom.** After a payment-service slowdown, finance found customers who had been refunded two or three times for single cancelled orders. The total was small in that incident and would not have been small in the next one." },
        { t: "p", text: "**Mechanism.** The checkout orchestrator compensated a failed saga by calling `POST /refunds`. During the slowdown the refund calls succeeded but their responses timed out, so the orchestrator retried — correctly, since a compensation must eventually happen — and each retry was a new refund. The compensation was retriable but **not idempotent**, the exact gap 1.4 warns about for any POST." },
        { t: "p", text: "**Fix.** Every saga step and compensation now sends an idempotency key derived from the saga id and step name, and the payment service stores the key with the result (6.3), so a retry returns the original refund. The saga moved to a workflow engine that records each step's outcome durably, and a reconciliation job compares refunds against cancelled orders daily. The rule: **in a saga, every action and every compensation must be idempotent, because every one of them will be retried.**" }
      ] }
  ],

  takeaways: [
    "No single database transaction can span several services; the options are **2PC** and **sagas**.",
    "**2PC**: prepare (do the work, lock, vote) then commit — atomic, and **blocking**: a coordinator crash after the votes leaves participants locked until it returns.",
    "2PC thrives **inside** distributed databases with a consensus-replicated coordinator; between independently owned services it is rare.",
    "A **saga** is a sequence of local transactions with **compensations** run newest-first on failure — atomic in outcome, not in isolation.",
    "Sagas are **not isolated**: intermediate states are visible. Use semantic locks, commutative updates and late re-reads.",
    "Order steps: **compensatable → pivot → retriable → irreversible**. Measured, moving the email after the pivot took un-undoable cancellations from two to zero.",
    "**Orchestration** makes the flow explicit and recoverable; **choreography** is loosely coupled and hard to trace. Long sagas belong in a durable workflow engine.",
    "**Every action and compensation must be idempotent**, because every one will be retried."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "In two-phase commit, a participant has voted yes and the coordinator crashes before sending the decision. What may the participant do?",
        options: ["Commit, since everyone probably voted yes", "Abort, to release its locks", "Wait, holding its locks, until it learns the decision", "Ask another participant and follow the majority"],
        answer: 2,
        why: "Having voted yes, the participant has promised to commit if told to, and the coordinator may have decided either way — committing or aborting unilaterally could contradict the others. So it blocks with its locks held, which is 2PC's defining weakness. Asking peers helps only if one of them already received the decision; if none did, they are all equally in the dark." },

      { stem: "What does a saga give up compared with a distributed ACID transaction?",
        options: ["Durability", "Isolation: other transactions can see its intermediate states", "The ability to fail", "Ordering of steps"],
        answer: 1,
        why: "Each saga step commits locally and immediately, so the half-finished business transaction — a charge before its refund, a reservation for a cancelled order — is visible to everyone else. Each step is durable, sagas fail and compensate by design, and their steps are explicitly ordered." },

      { stem: "Where should an irreversible step such as sending a confirmation email go in a saga?",
        options: ["First, so the customer is informed early", "Immediately before the pivot", "After the pivot, when the saga can only go forward", "In parallel with every step"],
        answer: 2,
        why: "Before the pivot the saga may still roll back, and an email cannot be unsent, so a cancellation would leave a customer told their order is confirmed — the exercise counted exactly those. After the pivot, the saga only moves forward, so the email can never contradict the outcome." },

      { stem: "A saga's compensation calls POST /refunds and retries on timeout. Customers receive several refunds. What is the fix?",
        options: ["Stop retrying compensations", "Make the compensation idempotent with a key derived from the saga and step, stored with the result", "Use 2PC instead", "Increase the timeout"],
        answer: 1,
        why: "Compensations must be retried — a lost compensation leaves the saga half-undone — so they must also be idempotent; a key per saga step lets the payment service return the original refund for a retry. Not retrying risks no refund at all, 2PC is not available against a payment provider, and a longer timeout narrows the window without closing it." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "\"Use a saga\" is half an answer; the pivot and idempotency are the other half.",
    questions: [
      { level: "core",
        q: "How do you keep data consistent across microservices without distributed transactions?",
        strong: "A strong answer describes sagas, compensation, idempotency and the outbox, and admits the isolation gap.",
        answer: [
          { t: "p", text: "With a saga: the business transaction becomes a sequence of local transactions, each in one service, each with a compensating action. On a failure, the completed steps are compensated in reverse order. Each step publishes its outcome reliably — via a transactional outbox so the state change and the event cannot diverge (6.4) — and every action and compensation is idempotent, because they will be retried." },
          { t: "p", text: "I order the steps around a pivot: undoable steps first, then the point of no return, then steps that are retried until they succeed, then irreversible effects such as emails. And I am explicit that sagas are not isolated, so other parts of the system must treat pending states as not yet real." }
        ] },

      { level: "advanced",
        q: "Choreography or orchestration?",
        strong: "A strong answer chooses by saga length and observability needs, and names the tooling.",
        answer: [
          { t: "p", text: "Choreography — services reacting to each other's events — is fine for two or three steps with a simple happy path: no central component and loose coupling. Beyond that, the flow exists only implicitly across services, which makes it hard to answer where a given order is stuck and easy to create event cycles." },
          { t: "p", text: "For longer sagas with branches and compensations, I prefer orchestration with a durable workflow engine such as Temporal or Step Functions: the flow is code you can read and test, each step's outcome is recorded so a crash resumes rather than restarts, and timeouts and retries are declared. I keep business rules in the services and only the sequencing in the orchestrator." }
        ] },

      { level: "advanced",
        q: "When would you still use two-phase commit?",
        strong: "A strong answer identifies the conditions under which 2PC's blocking is acceptable or removed.",
        answer: [
          { t: "p", text: "When all participants are under one operator and support it, transactions are short, and the coordinator's decision is itself replicated so its crash is not a single point of failure — which is how Spanner and CockroachDB commit across shards, with the coordinator state in a Raft group." },
          { t: "p", text: "Also XA between a relational database and a message broker within one application, though I would usually replace that with the outbox pattern. Across services owned by different teams, or with third parties that cannot prepare, I would not: a blocked coordinator holding locks in someone else's database is an outage you cannot fix yourself." }
        ] }
    ]
  }
});
