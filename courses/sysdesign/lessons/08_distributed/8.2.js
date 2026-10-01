/* ============================================================================
   LESSON 8.2 — Time and Ordering
   ========================================================================= */
EC.receiveLesson({
  id: "8.2",

  lede: "Every machine has its own clock, and they disagree — by milliseconds on a good day, by seconds after an NTP hiccup, and occasionally they jump backwards. So \"which happened first?\" cannot be answered by comparing timestamps from different machines, and any rule that does — last-writer-wins being the famous one — silently keeps the wrong value. What can be tracked exactly is **causality**: whether one event could have influenced another. **Lamport clocks** give an order consistent with causality; **vector clocks** also reveal when two events were **concurrent**; **hybrid logical clocks** keep causality while staying close to real time.",

  objectives: [
    "Explain why wall-clock timestamps from different machines cannot order events, and measure the damage to last-writer-wins",
    "Define happened-before and trace Lamport clocks through message exchanges",
    "Trace vector clocks on three nodes and use them to detect concurrent writes",
    "Explain what hybrid logical clocks add, and implement one",
    "Choose an ordering mechanism for a replicated store"
  ],

  prerequisites: ["8.1", "5.3"],

  blocks: [

    { t: "h2", n: "01", id: "wall", text: "Why wall clocks lie",
      sub: "Drift, synchronisation error and jumps" },

    { t: "dl", items: [
      ["Drift", "Quartz oscillators drift by tens of parts per million — a few milliseconds per minute — so unsynchronised clocks wander apart steadily."],
      ["Synchronisation error", "NTP corrects drift to within about a millisecond in a good data centre and tens of milliseconds over the internet; a misconfigured or unreachable server leaves a node seconds off."],
      ["Jumps", "When NTP corrects a large error it may **step** the clock — backwards as well as forwards — and leap seconds add their own discontinuity. \"Now\" can be earlier than a moment ago."]
    ] },

    { t: "p", text: "A user edits a profile field repeatedly, each edit landing on one of three replicas; replicas resolve conflicts by keeping the value with the highest timestamp. One replica's clock runs 300 ms fast, another 50 ms slow — both well within what real fleets see:" },

    { t: "code", lang: "python", title: "skew_lww.py — last-writer-wins with modestly skewed clocks", code: `import random

rng = random.Random(7)
SKEW = {"A": 0.000, "B": +0.300, "C": -0.050}      # B's clock runs 300 ms fast, C 50 ms slow

def clock(node, real): return real + SKEW[node]

# A user edits their profile name several times, each request landing on a random node.
# Each write is stamped with the receiving node's clock; replicas keep the highest stamp (LWW).
writes, real = [], 0.0
for i in range(1, 2_001):
    real += rng.uniform(0.05, 0.6)                   # successive edits 50-600 ms apart, in real time
    node = rng.choice("ABC")
    writes.append((clock(node, real), real, f"v{i}", node))

def lww_winner(ws): return max(ws)[2]                # highest timestamp wins
wrong, examples = 0, []
for i in range(1, len(writes)):
    pair = writes[i - 1:i + 1]                       # the second write really happened later
    if lww_winner(pair) != pair[1][2]:
        wrong += 1
        if len(examples) < 3:
            (t1, r1, v1, n1), (t2, r2, v2, n2) = pair
            examples.append(f"{v1}@{n1} real {r1:.2f}s stamp {t1:.2f}  then  {v2}@{n2} real {r2:.2f}s stamp {t2:.2f}  -> keeps {v1}")
print("consecutive edits where last-writer-wins kept the OLDER value: %d of %d (%.1f%%)"
      % (wrong, len(writes) - 1, 100 * wrong / (len(writes) - 1)))
for e in examples: print("  ", e)`,
      out: `consecutive edits where last-writer-wins kept the OLDER value: 227 of 1999 (11.4%)
   v26@B real 7.08s stamp 7.38  then  v27@A real 7.32s stamp 7.32  -> keeps v26
   v36@B real 10.20s stamp 10.50  then  v37@C real 10.49s stamp 10.44  -> keeps v36
   v43@B real 12.56s stamp 12.86  then  v44@C real 12.87s stamp 12.82  -> keeps v43`,
      hl: [4, 6, 14, 16],
      caption: "About **one consecutive edit in nine kept the older value**: whenever an edit was stamped by the fast node and the next edit by another node less than 300 ms later, the older edit had the larger timestamp. Nothing logged an error, nothing conflicted visibly — the user's newer change simply vanished. Timestamps compare clocks, not causality." },

    { t: "h2", n: "02", id: "lamport", text: "Happened-before and Lamport clocks",
      sub: "An order that respects cause and effect" },

    { t: "p", text: "Lamport's insight (1978) was to stop asking about real time and ask about influence. Event *a* **happened before** *b* if they are on the same node and *a* came first, or *a* is the sending of a message and *b* its receipt, or there is a chain of such steps between them. If neither happened before the other, they are **concurrent** — neither could have known about the other. A **Lamport clock** is a counter: increment it on every event, attach it to every message, and on receipt jump to the maximum of your counter and the message's, plus one. Then if *a* happened before *b*, *a*'s counter is smaller." },

    { t: "h2", n: "03", id: "vector", text: "Vector clocks",
      sub: "One counter per node, and the ability to say \"concurrent\"" },

    { t: "diagram", kind: "trace", title: "Vector clocks on three nodes",
      caption: "Each node keeps a counter for every node. A local event increments its own entry; a message carries the sender's vector, and the receiver takes the element-wise maximum before incrementing its own entry. Comparing two vectors: if every entry of one is ≤ the other, it happened before; otherwise they are concurrent.",
      left: "event", vars: ["A's vector", "B's vector", "C's vector"],
      steps: [
        { code: "A writes x = 1 (w1)", state: ["[1,0,0]", "[0,0,0]", "[0,0,0]"], changed: [0] },
        { code: "A sends to B", state: ["[2,0,0]", "[0,0,0]", "[0,0,0]"], changed: [0] },
        { code: "B receives: max, then +1", state: ["[2,0,0]", "[2,1,0]", "[0,0,0]"], changed: [1] },
        { code: "B writes x = 2 (w2)", state: ["[2,0,0]", "[2,2,0]", "[0,0,0]"], changed: [1], tone: "good" },
        { code: "C writes x = 3 (w3), unaware", state: ["[2,0,0]", "[2,2,0]", "[0,0,1]"], changed: [2], tone: "warn" },
        { code: "w1 [1,0,0] ≤ w2 [2,2,0]", state: ["", "before", ""], note: "w1 → w2" },
        { code: "w2 [2,2,0] vs w3 [0,0,1]", state: ["", "neither ≤", ""], note: "concurrent", tone: "crit" }
      ] },

    { t: "code", lang: "python", title: "clocks.py — the same exchange with Lamport and vector clocks", code: `class Node:
    def __init__(self, name, names):
        self.name, self.lamport, self.vc = name, 0, {n: 0 for n in names}
    def local(self):                                  # an event on this node (e.g. a write)
        self.lamport += 1; self.vc[self.name] += 1
        return self.lamport, dict(self.vc)
    def send(self): return self.local()               # sending is an event; the stamps travel with it
    def receive(self, stamp):
        lam, vc = stamp
        self.lamport = max(self.lamport, lam)         # Lamport: jump past anything seen
        for n in self.vc: self.vc[n] = max(self.vc[n], vc[n])   # vector: element-wise max
        return self.local()

def relation(a, b):
    le = all(a[n] <= b[n] for n in a); ge = all(a[n] >= b[n] for n in a)
    return "equal" if le and ge else "happened-before" if le else "happened-after" if ge else "CONCURRENT"

names = ["A", "B", "C"]
A, B, C = (Node(n, names) for n in names)
w1 = A.local()                        # A writes x = 1
B.receive(A.send())                   # A tells B
w2 = B.local()                        # B writes x = 2, having seen x = 1
w3 = C.local()                        # C writes x = 3, knowing nothing of the others
C.receive(B.send())                   # later, B tells C

fmt = lambda s: "lamport=%d vector=%s" % (s[0], [s[1][n] for n in names])
print("w1 (A: x=1)", fmt(w1)); print("w2 (B: x=2)", fmt(w2)); print("w3 (C: x=3)", fmt(w3))
for (la, va), (lb, vb), label in ((w1, w2, "w1 vs w2"), (w2, w3, "w2 vs w3"), (w1, w3, "w1 vs w3")):
    print("%-9s Lamport %d vs %d   vectors: %s" % (label, la, lb, relation(va, vb)))`,
      out: `w1 (A: x=1) lamport=1 vector=[1, 0, 0]
w2 (B: x=2) lamport=4 vector=[2, 2, 0]
w3 (C: x=3) lamport=1 vector=[0, 0, 1]
w1 vs w2  Lamport 1 vs 4   vectors: happened-before
w2 vs w3  Lamport 4 vs 1   vectors: CONCURRENT
w1 vs w3  Lamport 1 vs 1   vectors: CONCURRENT`,
      hl: [10, 11, 12],
      caption: "Lamport clocks are consistent with causality — w1's 1 is below w2's 4 — but they cannot detect concurrency: they rank w3 (1) below w2 (4) although neither knew of the other. Vector clocks say **concurrent**, which is the truth a replicated store needs: these two writes conflict and must be merged or resolved, not silently ordered." },

    { t: "callout", kind: "insight", title: "What a database does with \"concurrent\"",
      body: [
        { t: "p", text: "Dynamo-style stores (the original Dynamo, Riak) used version vectors exactly this way: when a read finds two versions neither of which descends from the other, it returns both as **siblings** and lets the application merge — the union of two shopping baskets. Systems that would rather not burden the application merge automatically with CRDTs (8.6), or fall back to last-writer-wins and accept the losses measured above." },
        { t: "p", text: "The cost of vector clocks is size: one entry per writer. With thousands of clients writing directly, vectors grow without bound, which is why practical systems use one entry per *replica* (version vectors) or dotted version vectors, and prune old entries." }
      ] },

    { t: "callout", kind: "trap", title: "Ordering events by the timestamp in the log line",
      body: [
        { t: "p", text: "During an incident, logs from twenty services are merged and sorted by timestamp to reconstruct what happened. With clocks a few milliseconds apart, a request's \"received\" log line on service B can sort before its \"sent\" line on service A, and the reconstructed story is causally impossible — a response before its request, a retry before the failure that caused it." },
        { t: "p", text: "Propagate a trace id and parent span id with every request (11.5) and order by the trace structure, which encodes happened-before exactly. Use timestamps for durations within one machine, never for ordering across machines when the gaps are small." }
      ] },

    { t: "h2", n: "04", id: "hlc", text: "Hybrid logical clocks and TrueTime",
      sub: "Causality, close to real time" },

    { t: "diagram", kind: "matrix", title: "Ordering mechanisms compared",
      caption: "Google Spanner takes a different route: TrueTime exposes clock uncertainty as an interval from GPS and atomic clocks, and a commit waits out that uncertainty (a few milliseconds) so timestamps are globally ordered. Without that hardware, HLCs — used by CockroachDB and MongoDB — are the practical choice.",
      cols: ["Respects causality", "Detects concurrency", "Close to real time", "Size"],
      rows: ["Wall clock", "Lamport clock", "Vector clock", "Hybrid logical clock", "TrueTime (Spanner)"],
      cells: [
        [false, false, true, { text: "1 number", tone: "good" }],
        [true, false, false, { text: "1 number", tone: "good" }],
        [true, true, false, { text: "1 per node", tone: "warn" }],
        [true, false, true, { text: "time + counter", tone: "good" }],
        [true, { text: "n/a", tone: "accent" }, true, { text: "interval + commit wait", tone: "accent" }]
      ] },

    { t: "exercise", kind: "Challenge", title: "Implement a hybrid logical clock",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "Four nodes with clocks up to 250 ms apart exchange 20,000 messages. Stamp each send and receive with the node's physical clock and with a hybrid logical clock, and count how often each stamps a receipt no later than its send — an effect timestamped before its cause." }
      ],
      requirements: [
        "Represent an HLC timestamp as (l, c): the largest physical time seen, and a counter for ties",
        "On a local or send event: if physical time has moved past l, set l to it and c to 0; otherwise increment c",
        "On receive: take the maximum of local l, the message's l and physical time, and set c by the standard rules",
        "Count causality violations for physical stamps and for HLC stamps",
        "Report how far an HLC stamp can run ahead of its node's own clock"
      ],
      hint: "Compare HLC timestamps as tuples: first l, then c. The receive rule ensures the result is greater than both the local clock and the incoming message.",
      solution: { lang: "python", title: "hlc_ex.py",
        code: `import random

class HLC:
    """Hybrid logical clock: (l, c). l tracks the largest physical time seen; c breaks ties."""
    def __init__(self): self.l, self.c = 0.0, 0
    def now(self, pt):                                    # a local or send event
        if pt > self.l: self.l, self.c = pt, 0
        else: self.c += 1
        return (self.l, self.c)
    def recv(self, pt, msg):
        ml, mc = msg; l = max(self.l, ml, pt)
        if l == self.l == ml: c = max(self.c, mc) + 1
        elif l == self.l:     c = self.c + 1
        elif l == ml:         c = mc + 1
        else:                 c = 0
        self.l, self.c = l, c
        return (l, c)

rng = random.Random(3)
SKEW = [0.0, 0.25, -0.15, 0.08]                          # seconds each node's clock is off
clocks = [HLC() for _ in SKEW]
real, phys_violations, hlc_violations, max_drift, msgs = 0.0, 0, 0, 0.0, 0
for _ in range(20_000):
    real += rng.uniform(0.001, 0.05)
    a, b = rng.sample(range(len(SKEW)), 2)               # a sends to b; delivery takes 1-20 ms
    sent_phys = real + SKEW[a]; sent_hlc = clocks[a].now(sent_phys)
    arrive = real + rng.uniform(0.001, 0.02)
    recv_phys = arrive + SKEW[b]; recv_hlc = clocks[b].recv(recv_phys, sent_hlc)
    msgs += 1
    phys_violations += recv_phys <= sent_phys            # the effect stamped before its cause
    hlc_violations += recv_hlc <= sent_hlc
    max_drift = max(max_drift, recv_hlc[0] - (arrive + SKEW[b]))
print("messages: %d between 4 nodes with clocks up to 250 ms apart" % msgs)
print("receive stamped no later than send — physical clocks: %d   HLC: %d" % (phys_violations, hlc_violations))
print("largest gap between an HLC stamp and its node's own clock: %.0f ms" % (max_drift * 1000))`,
        out: `messages: 20000 between 4 nodes with clocks up to 250 ms apart
receive stamped no later than send — physical clocks: 9974   HLC: 0
largest gap between an HLC stamp and its node's own clock: 414 ms`,
        notes: [
          { t: "p", text: "Physical timestamps put the receipt at or before the send on about half the messages — every message from a fast clock to a slower one, delivered within the skew. The HLC never did: the receive rule always produces a stamp larger than the incoming message's, so causality is preserved whatever the clocks say." },
          { t: "p", text: "The HLC's l component can run ahead of a node's own clock, but only by as much as the skew between clocks — here about 400 ms, the gap between the fastest and slowest node — never unboundedly, which is what distinguishes it from a pure Lamport counter. That is the property that lets databases use HLC stamps for snapshot reads at \"roughly now\"." },
          { t: "p", text: "An HLC orders causally related events correctly but, like a Lamport clock, it does not detect concurrency: two independent writes get distinct, comparable stamps. Systems that need to know about conflicts still need version vectors or a single writer per key; HLCs are for ordering and snapshots, not for conflict detection." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the clock jump that hid an hour of writes",
      body: [
        { t: "p", text: "**Symptom.** After an NTP server misbehaved, one node in a multi-leader cache cluster had its clock stepped forward by an hour and then corrected back. For the following hour, every write accepted by that node during its fast period beat every other write to the same keys — and newer writes from other nodes were silently discarded on replication." },
        { t: "p", text: "**Mechanism.** Conflict resolution was last-writer-wins on wall-clock timestamps. Section 01's 300 ms skew lost an edit in nine; an hour's skew made that node's writes unbeatable for an hour. Nothing was technically broken: each node did exactly what the rule said, with a clock that briefly said something false." },
        { t: "p", text: "**Fix.** Nodes now refuse to start or serve writes if their clock is more than a configured bound away from their peers (a common feature of databases that use HLCs, such as CockroachDB's maximum offset); NTP was configured to slew rather than step small corrections; and the data with real conflict risk moved to a single-writer-per-key design so timestamps no longer decide anything. Clock monitoring — offset per node — joined the standard dashboards." }
      ] }
  ],

  takeaways: [
    "Clocks **drift**, are **synchronised only approximately**, and can **jump backwards**; timestamps from different machines cannot order close events.",
    "Measured: with clocks 300 ms and 50 ms off, **last-writer-wins kept the older value on about one edit in nine** — silently.",
    "**Happened-before**: same node in order, a send before its receipt, or a chain of these. Otherwise events are **concurrent**.",
    "**Lamport clocks** give an order consistent with causality, but cannot tell concurrent events from ordered ones.",
    "**Vector clocks** keep one counter per node; comparing vectors says before, after or **concurrent** — the basis of sibling detection in Dynamo-style stores.",
    "Order cross-service logs by **trace structure**, not timestamps.",
    "**Hybrid logical clocks** combine physical time with a counter: measured, **zero causality violations** against about half for raw physical stamps, staying within the clock skew of real time.",
    "Spanner's **TrueTime** bounds clock uncertainty with hardware and waits it out; without it, HLCs plus a clock-offset limit are the practical choice."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two replicas resolve conflicts by keeping the value with the later timestamp. One replica's clock is 300 ms fast. What can happen?",
        options: ["Nothing; 300 ms is negligible", "A newer write from another replica within 300 ms of the fast replica's write is discarded", "Both writes are kept", "The fast replica rejects writes"],
        answer: 1,
        why: "The fast replica's stamps are 300 ms too large, so any genuinely later write elsewhere within that window carries a smaller stamp and loses — about one consecutive edit in nine in the simulation. LWW keeps exactly one value, and nothing in plain LWW detects or rejects a skewed clock." },

      { stem: "Event a has Lamport timestamp 3 and event b has 7. What can you conclude?",
        options: ["a happened before b", "b did not happen before a", "a and b are concurrent", "a happened 4 seconds before b"],
        answer: 1,
        why: "Lamport clocks guarantee that if b happened before a then b's stamp is smaller; since 7 > 3, b cannot have happened before a. But a smaller stamp does not prove a happened before b — they may be concurrent — and Lamport counters say nothing about real time." },

      { stem: "Vector clocks [2,1,0] and [1,2,0]. What is their relationship?",
        options: ["The first happened before the second", "The second happened before the first", "Concurrent", "Equal"],
        answer: 2,
        why: "Neither is less than or equal to the other in every entry — the first is ahead in A's entry, the second in B's — so neither event knew of the other: they are concurrent, which a replicated store treats as a conflict to merge or resolve." },

      { stem: "What does a hybrid logical clock provide that a Lamport clock does not?",
        options: ["Detection of concurrent events", "Timestamps that respect causality while staying close to physical time", "Perfectly synchronised wall clocks", "One counter per node"],
        answer: 1,
        why: "An HLC carries physical time in its l component and uses a counter only to break ties and preserve causality, so its stamps are both causally consistent and within the clock skew of real time — useful for snapshots at a point in time. Like Lamport clocks it does not detect concurrency, it does not synchronise clocks, and it is a single (time, counter) pair rather than a vector." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "\"Don't use wall clocks to order events across machines\" — then say what to use instead.",
    questions: [
      { level: "advanced",
        q: "How do you order events across machines without a global clock?",
        strong: "A strong answer covers happened-before, Lamport and vector clocks, HLCs, and when each fits.",
        answer: [
          { t: "p", text: "By causality rather than time. Lamport defined happened-before — same process in order, send before receive, transitively — and a Lamport clock gives every event a counter consistent with it. If I also need to know when two events were concurrent, as a replicated store does to detect conflicts, I use vector clocks: one counter per node, compared element-wise." },
          { t: "p", text: "If I want ordering that also tracks real time — for snapshot reads or time-ordered ids — hybrid logical clocks combine physical time with a counter, which is what CockroachDB and MongoDB use, plus a bound on how far a node's clock may drift before it is taken out. Spanner's TrueTime does it with GPS and atomic clocks and a short commit wait." }
        ] },

      { level: "core",
        q: "Why is last-writer-wins dangerous?",
        strong: "A strong answer explains clock skew silently dropping writes and gives alternatives.",
        answer: [
          { t: "p", text: "Because \"last\" is decided by timestamps from different machines, and clocks disagree. A node whose clock runs fast wins every conflict within its skew, so genuinely newer writes from other nodes are discarded — silently, with no error. A clock step can make one node's writes win for an hour." },
          { t: "p", text: "Alternatives: avoid concurrent writers per key with a single leader or a conditional write; detect concurrency with version vectors and merge siblings; use CRDTs where the data type merges naturally; and if LWW is used anyway, use hybrid logical clocks and refuse writes from nodes with excessive clock offset." }
        ] },

      { level: "core",
        q: "Lamport clocks or vector clocks?",
        strong: "A strong answer contrasts ordering with concurrency detection and the size cost.",
        answer: [
          { t: "p", text: "Lamport clocks are one integer and give a total order consistent with causality, which is enough for ordering — say, a log or mutual exclusion. They cannot tell whether two events were concurrent: a smaller stamp might be a cause or might be unrelated." },
          { t: "p", text: "Vector clocks can, which is what conflict detection needs: if neither vector dominates, the writes were concurrent. The price is one entry per node or writer, so they are used per replica rather than per client, and pruned." }
        ] }
    ]
  }
});
