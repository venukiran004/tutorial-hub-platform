/* ============================================================================
   LESSON 5.1 — CAP and PACELC
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "CAP is usually drawn as a triangle with the instruction \"pick two\". That reading is wrong in a way that matters. Partitions are not optional, so the theorem is really a statement about **one moment**: while the network is split, a replica that cannot reach the others must either **refuse** (keep consistency) or **answer from what it has** (keep availability). The rest of the time there is no partition and CAP says nothing — which is why PACELC adds the trade that is present on every single request: **waiting for other replicas costs latency**.",

  objectives: [
    "State the CAP theorem precisely, including what its C and A actually mean",
    "Explain why \"pick two of three\" and \"CA systems\" misread it",
    "Simulate a partition and show what CP and AP choices each cost",
    "Use PACELC to reason about the latency–consistency trade when nothing is broken",
    "Choose CP or AP behaviour per operation, not per system"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", id: "precise", text: "What CAP actually says",
      sub: "A choice forced during a partition — and only then" },

    { t: "dl", items: [
      ["C — consistency", "Specifically **linearizability**: every read sees the most recent completed write, as if there were one copy (5.3). Not the C in ACID, which is about invariants within a transaction."],
      ["A — availability", "**Every** request to a non-failed node gets a non-error response. Not \"high availability\" in the 99.99% sense — a strict, all-or-nothing property."],
      ["P — partition tolerance", "The system keeps operating when messages between nodes are lost. On a real network this is not a choice: links and switches fail, so a distributed system must tolerate it."]
    ] },

    { t: "p", text: "The theorem: **during a partition, a system cannot be both C and A.** A node cut off from the others cannot know about writes made on the other side, so it can refuse the request (giving up A) or answer with what it has (giving up C). When there is no partition, it can have both." },

    { t: "viz", title: "The moment CAP is about",
      caption: "A is cut off from B and C. A client asks A who holds seat 14. A CP system answers \"try again later\": correct but unavailable for that client. An AP system answers from A's copy: available, but possibly wrong — and if A also accepts a booking, the same seat can be sold on both sides.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="A network partition forcing a choice">
  <defs><marker id="cp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <rect x="20" y="30" width="250" height="150" rx="12" style="fill:var(--crit);fill-opacity:.06;stroke:var(--crit);stroke-dasharray:5 4"/>
  <rect x="330" y="30" width="410" height="150" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:5 4"/>
  <text x="145" y="52" text-anchor="middle" class="s-sub">minority side</text>
  <text x="535" y="52" text-anchor="middle" class="s-sub">majority side</text>
  <rect x="95" y="70" width="100" height="44" rx="9" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="145" y="90" text-anchor="middle" class="s-label">node A</text><text x="145" y="106" text-anchor="middle" class="s-sub">seat 14: free</text>
  <rect x="400" y="70" width="100" height="44" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="450" y="90" text-anchor="middle" class="s-label">node B</text><text x="450" y="106" text-anchor="middle" class="s-sub">seat 14: Ana</text>
  <rect x="570" y="70" width="100" height="44" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="620" y="90" text-anchor="middle" class="s-label">node C</text><text x="620" y="106" text-anchor="middle" class="s-sub">seat 14: Ana</text>
  <line x1="500" y1="92" x2="568" y2="92" style="stroke:var(--good)" stroke-width="1.4"/>
  <line x1="195" y1="92" x2="398" y2="92" style="stroke:var(--crit);stroke-dasharray:3 6" stroke-width="2"/>
  <text x="297" y="84" text-anchor="middle" class="s-label" style="fill:var(--crit)">✕ partition</text>
  <rect x="95" y="138" width="100" height="30" rx="7" class="s-fill s-stroke"/><text x="145" y="158" text-anchor="middle" class="s-sub">client: seat 14?</text>
  <line x1="145" y1="138" x2="145" y2="116" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#cp-a)"/>
  <rect x="40" y="196" width="220" height="44" rx="9" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
  <text x="150" y="214" text-anchor="middle" class="s-label">CP: \"503, try again\"</text>
  <text x="150" y="231" text-anchor="middle" class="s-sub">correct, not available</text>
  <rect x="290" y="196" width="220" height="44" rx="9" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
  <text x="400" y="214" text-anchor="middle" class="s-label">AP: \"seat 14 is free\"</text>
  <text x="400" y="231" text-anchor="middle" class="s-sub">available, wrong</text>
  <text x="630" y="214" text-anchor="middle" class="s-sub">B and C carry on normally:</text>
  <text x="630" y="231" text-anchor="middle" class="s-sub">they hold a majority</text>
</svg>` },

    { t: "callout", kind: "trap", title: "\"Pick two\" and the CA system that cannot exist",
      body: [
        { t: "p", text: "The triangle suggests three equal options: CP, AP, or CA. But a CA system — consistent and available, giving up partition tolerance — is a system that does not experience partitions, which on a network means a single node. As soon as data lives on two machines, partitions will happen and the system must do *something* during one; \"we chose CA\" only means nobody decided what." },
        { t: "p", text: "The useful reading: **design what each operation does when it cannot reach a quorum** — refuse, or answer from local state — and accept that a single-node database (\"CA\") is just a system whose partition behaviour is \"the whole thing is down\". Labels like \"MongoDB is CP\" describe default configurations, not laws; most stores let you choose per request." }
      ] },

    { t: "h2", n: "02", id: "simulated", text: "A partition, simulated",
      sub: "What each choice costs, counted" },

    { t: "p", text: "Three replicas hold a theatre's seat bookings. Node A is cut off from B and C while clients keep booking and looking up seats through whichever node is nearest. In CP mode, a node that cannot reach a majority refuses; in AP mode, it answers and accepts writes locally, to be reconciled when the partition heals:" },

    { t: "code", lang: "python", title: "cap.py — six thousand operations during a partition", code: `import random

rng = random.Random(5)
NODES = ["A", "B", "C"]
SIDE = {"A": 0, "B": 1, "C": 1}                 # partition: A alone, B and C together
KEYS = [f"seat:{i}" for i in range(20)]          # a small set of hot keys: theatre seats

def run(mode, ops=6_000):
    store = {n: {} for n in NODES}               # node -> key -> (value, version)
    truth = {}                                   # what a single, linearizable copy would say
    errors = stale = conflicts = 0
    clock = 0
    for i in range(ops):
        clock += 1
        node = rng.choice(NODES)                 # each client talks to whichever node is nearest
        reachable = [n for n in NODES if SIDE[n] == SIDE[node]]
        key = rng.choice(KEYS)
        if rng.random() < 0.3:                   # a write: book the seat
            if mode == "CP" and len(reachable) < 2:
                errors += 1; continue            # cannot reach a majority: refuse
            for n in reachable: store[n][key] = (f"{node}{i}", clock)
            truth[key] = f"{node}{i}"
        else:                                    # a read: who holds the seat?
            if mode == "CP" and len(reachable) < 2:
                errors += 1; continue
            seen = store[node].get(key, (None, 0))[0]
            stale += seen != truth.get(key)
    # the partition heals: AP reconciles by last-writer-wins on the version
    for key in KEYS:
        versions = {store[n].get(key) for n in NODES if key in store[n]}
        if len(versions) > 1: conflicts += 1
    return errors / ops, stale / ops, conflicts

print("3 nodes, A cut off from B and C, 6,000 bookings and lookups during the partition")
print("%-6s %18s %18s %26s" % ("mode", "requests refused", "stale reads", "keys in conflict at heal"))
for m in ("CP", "AP"):
    e, s, c = run(m)
    print("%-6s %17.1f%% %17.1f%% %20d of %d" % (m, 100 * e, 100 * s, c, len(KEYS)))`,
      out: `3 nodes, A cut off from B and C, 6,000 bookings and lookups during the partition
mode     requests refused        stale reads   keys in conflict at heal
CP                  32.9%               0.0%                    0 of 20
AP                   0.0%              31.8%                   20 of 20`,
      hl: [19, 20, 26, 27],
      caption: "**CP** refused every request from clients on A's side — about a third of all requests — and never returned a wrong answer. **AP** refused nothing, returned stale answers to about a third of lookups, and when the partition healed, **every seat had conflicting bookings** from the two sides. Neither is a free lunch: CP's cost is visible errors now; AP's is invisible wrongness, discovered later." },

    { t: "diagram", kind: "compare", title: "Choosing per operation",
      caption: "A real product makes both choices, operation by operation. The exercise below measures exactly this split: refuse the bookings that cannot reach a majority, keep showing the (possibly stale) seat map.",
      columns: [
        { title: "Needs CP — refuse rather than be wrong", tone: "accent", items: [
          "taking a seat, a room, a username",
          "moving money; spending a balance",
          "decrementing stock that cannot oversell",
          "leader election, locks (8.4)",
          "anything whose conflict cannot be merged"
        ] },
        { title: "Fine as AP — answer, reconcile later", tone: "warn", items: [
          "showing the seat map or a product page",
          "a shopping basket (merge both sides)",
          "likes, views, presence, feeds",
          "recommendations, search results",
          "anything mergeable or harmless if stale"
        ] }
      ] },

    { t: "h2", n: "03", id: "pacelc", text: "PACELC: the trade when nothing is broken",
      sub: "If Partitioned, A or C — Else, Latency or Consistency" },

    { t: "p", text: "Partitions are rare. What every request pays, all the time, is the round trip to other replicas that a consistent read or write must wait for. PACELC names that: even with a healthy network, **staying consistent means waiting** for at least one other copy, and how long depends only on where it is (1.2):" },

    { t: "code", lang: "python", title: "pacelc.py — the cost of consistency on a healthy network", code: `# PACELC's "else": with no partition at all, every consistent write waits for a quorum.
LOCAL_COMMIT = 0.5                                   # ms
RTT = {"same zone": 0.2, "cross-zone": 1.2, "cross-region": 70.0, "cross-continent": 150.0}

print("%-16s %18s %24s" % ("replica distance", "eventual (local)", "consistent (wait for 1)"))
for where, rtt in RTT.items():
    print("%-16s %15.1f ms %21.1f ms" % (where, LOCAL_COMMIT, LOCAL_COMMIT + rtt))`,
      out: `replica distance   eventual (local)  consistent (wait for 1)
same zone                    0.5 ms                   0.7 ms
cross-zone                   0.5 ms                   1.7 ms
cross-region                 0.5 ms                  70.5 ms
cross-continent              0.5 ms                 150.5 ms`,
      caption: "Within a region, consistency is almost free — a millisecond or two. Across regions it costs the speed of light on every write. That is the real reason global systems relax consistency: not partitions, which are rare, but latency, which is constant." },

    { t: "diagram", kind: "matrix", title: "Systems by PACELC, in their typical configuration",
      caption: "Most of these are configurable per request — Cassandra and DynamoDB offer strongly consistent reads at higher latency; Spanner offers bounded-staleness reads that skip the wait. The table describes defaults, which is what most code actually uses.",
      cols: ["If partitioned", "Else", "Typical use"],
      rows: ["Cassandra, DynamoDB (default)", "Spanner, CockroachDB", "etcd, ZooKeeper", "PostgreSQL + async replicas"],
      cells: [
        [{ text: "available", tone: "warn" }, { text: "latency", tone: "warn" }, { text: "high-volume, mergeable data" }],
        [{ text: "consistent", tone: "accent" }, { text: "consistency", tone: "accent" }, { text: "global transactions" }],
        [{ text: "consistent", tone: "accent" }, { text: "consistency", tone: "accent" }, { text: "coordination, config, locks" }],
        [{ text: "primary only", tone: "accent" }, { text: "replicas: latency", tone: "warn" }, { text: "OLTP; reads may lag (4.1)" }]
      ] },

    { t: "exercise", kind: "Challenge", title: "Bookings CP, the seat map AP",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Neither pure mode suits the theatre: CP leaves a third of users unable even to view the seat map during a partition, and AP sells the same seat twice. Add a third mode to the simulation that refuses bookings without a majority but serves lookups from the local copy, and compare all three." }
      ],
      requirements: [
        "Add a `split` mode: writes need a majority, reads are always answered locally",
        "Report refused requests, stale reads and keys in conflict for CP, AP and split",
        "Explain why split has no conflicts even though it serves stale reads",
        "Say what the user on the minority side experiences in split mode"
      ],
      hint: "Conflicts come only from writes accepted on both sides of the partition. Stale reads come from answering locally.",
      solution: { lang: "python", title: "cap_ex.py",
        code: `import random

rng = random.Random(5)
NODES = ["A", "B", "C"]
SIDE = {"A": 0, "B": 1, "C": 1}                 # partition: A alone, B and C together
KEYS = [f"seat:{i}" for i in range(20)]          # a small set of hot keys: theatre seats

def run(mode, ops=6_000):
    store = {n: {} for n in NODES}               # node -> key -> (value, version)
    truth = {}                                   # what a single, linearizable copy would say
    errors = stale = conflicts = 0
    clock = 0
    for i in range(ops):
        clock += 1
        node = rng.choice(NODES)                 # each client talks to whichever node is nearest
        reachable = [n for n in NODES if SIDE[n] == SIDE[node]]
        key = rng.choice(KEYS)
        if rng.random() < 0.3:                   # a write: book the seat
            if mode in ("CP", "split") and len(reachable) < 2:
                errors += 1; continue            # bookings need a majority in both CP and split
            for n in reachable: store[n][key] = (f"{node}{i}", clock)
            truth[key] = f"{node}{i}"
        else:                                    # a read: who holds the seat?
            if mode == "CP" and len(reachable) < 2:
                errors += 1; continue            # split: the seat map is served locally, maybe stale
            seen = store[node].get(key, (None, 0))[0]
            stale += seen != truth.get(key)
    # the partition heals: AP reconciles by last-writer-wins on the version
    for key in KEYS:
        versions = {store[n].get(key) for n in NODES if key in store[n]}
        if len(versions) > 1: conflicts += 1
    return errors / ops, stale / ops, conflicts

print("3 nodes, A cut off from B and C, 6,000 bookings and lookups during the partition")
print("%-6s %18s %18s %26s" % ("mode", "requests refused", "stale reads", "keys in conflict at heal"))
for m in ("CP", "AP", "split"):
    e, s, c = run(m)
    print("%-6s %17.1f%% %17.1f%% %20d of %d" % (m, 100 * e, 100 * s, c, len(KEYS)))`,
        out: `3 nodes, A cut off from B and C, 6,000 bookings and lookups during the partition
mode     requests refused        stale reads   keys in conflict at heal
CP                  32.9%               0.0%                    0 of 20
AP                   0.0%              31.8%                   20 of 20
split                9.9%              23.5%                    0 of 20`,
        notes: [
          { t: "p", text: "Split refuses only the bookings attempted on the minority side — about a tenth of all requests instead of a third — and has **zero conflicts**, because no write was ever accepted without a majority. Conflicts are a property of writes; staleness is a property of reads; deciding them separately is what makes the hybrid work." },
          { t: "p", text: "The user on A's side can browse the seat map, which may show a seat as free that was booked on the other side a moment ago, and gets \"try again\" if they try to book. That is the right failure for a theatre: a stale map is harmless as long as the booking itself re-checks under a majority, which it does." },
          { t: "p", text: "This is how most real systems behave: reads served from the nearest copy, the operations that cannot tolerate conflict sent to a leader or a quorum. CAP is a property of each operation, not a label for the whole database." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: two regions, one inventory, and a split brain on sale day",
      body: [
        { t: "p", text: "**Symptom.** A retailer ran active-active in two regions with an AP store for inventory: each region decremented stock locally and replicated to the other. During a 14-minute inter-region network outage on a sale day, both regions kept selling. When the link recovered, 2,300 orders had been taken for items that were already sold out." },
        { t: "p", text: "**Mechanism.** The store was doing exactly what AP promises: every request answered, writes reconciled later. But stock decrements are not mergeable — two \"sell the last one\" operations cannot both be right — and the reconciliation rule was last-writer-wins on the stock count, which silently discarded one region's decrements. The design had chosen A for an operation whose correctness needed C." },
        { t: "p", text: "**Fix.** Inventory reservations moved to a single-leader (per item) store: the region that does not own an item's stock forwards the reservation, and during a partition reservations for items owned by the other region are refused with a clear message — browsing and basket-building stay available. The cost is an inter-region round trip on the reservation step, about 70 ms, which PACELC said was the price all along." }
      ] }
  ],

  takeaways: [
    "CAP's **C is linearizability** and its **A is every request answered** — both stricter than their everyday meanings.",
    "The theorem: **during a partition**, a node that cannot reach the others must refuse (keep C) or answer locally (keep A).",
    "Partitions are not optional, so **\"pick two\" misleads** and a \"CA\" distributed system does not exist — it means nobody decided what happens.",
    "Simulated: **CP refused a third of requests and was never wrong; AP refused nothing, was stale a third of the time, and double-booked every seat.**",
    "Decide **per operation**: un-mergeable writes (seats, money, stock, usernames) need a majority; reads and mergeable data can answer locally.",
    "Measured hybrid: majority for bookings, local reads for the seat map — **a tenth refused, zero conflicts**.",
    "**PACELC**: else — with no partition — consistency still costs **latency**, from ~1 ms in a region to 70–150 ms across them.",
    "Global systems relax consistency mainly because of **constant latency**, not rare partitions.",
    "Database labels (\"CP\", \"AP\") describe **default configurations**; most stores let each request choose."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What does CAP actually force you to choose between, and when?",
        options: ["Any two of C, A and P, at design time", "Consistency or availability, for operations that happen while the network is partitioned", "Latency or throughput, always", "SQL or NoSQL"],
        answer: 1,
        why: "Partition tolerance is not optional on a real network, so the choice is between refusing (C) and answering locally (A), and it only arises during a partition. \"Any two\" implies a meaningful CA option, which for a distributed system does not exist. Latency versus consistency is PACELC's else-clause, and the theorem says nothing about database categories." },

      { stem: "A three-node CP store is partitioned with one node alone. What happens to requests sent to that node?",
        options: ["They are served from its local copy", "They are refused or time out, because it cannot reach a majority", "They are forwarded through the partition", "They succeed and conflicts are resolved later"],
        answer: 1,
        why: "A CP system will not answer what it cannot confirm with a majority, so the isolated node refuses — a third of requests in the simulation — while the two-node side continues. Serving locally and reconciling later is AP behaviour. Nothing can be forwarded across a partition; that is what a partition is." },

      { stem: "Two regions 70 ms apart replicate a database with no failures at all. Why might writes still be slow?",
        options: ["CAP forces slowness at all times", "A consistent write must wait for the other region's replica — PACELC's latency–consistency trade", "Replication is always synchronous", "Regions throttle each other"],
        answer: 1,
        why: "With no partition CAP is silent, but a write that must be consistent across regions waits at least one 70 ms round trip, which is exactly the else-clause of PACELC. Choosing eventual consistency removes the wait. Replication is not always synchronous — that is the choice being made — and regions do not throttle each other." },

      { stem: "Which operation is the poorest fit for AP behaviour during a partition?",
        options: ["Showing a product page", "Adding an item to a shopping basket", "Reserving the last unit of stock", "Incrementing a like counter"],
        answer: 2,
        why: "Two sides of a partition can each sell the last unit, and no merge can make both correct, so the reservation needs a majority or a single owner. A product page tolerates staleness, a basket can be merged by taking the union, and a like counter can be merged by adding the increments from both sides." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Correcting the triangle politely is one of the clearest seniority signals available.",
    questions: [
      { level: "core",
        q: "Explain the CAP theorem.",
        strong: "A strong answer states it precisely, rejects \"pick two\", and moves to per-operation design and PACELC.",
        answer: [
          { t: "p", text: "In a distributed system, when a network partition separates replicas, a replica that cannot reach the others must either refuse requests to stay consistent, or answer from its own copy to stay available. It cannot do both. C here means linearizable — every read sees the latest write — and A means every request to a working node gets a non-error response." },
          { t: "p", text: "The \"pick two\" framing is misleading because partitions are not optional, so the real decision is what each operation does during one. I would make un-mergeable writes like bookings or payments require a majority, and let reads and mergeable data answer locally. And I would bring in PACELC, because day to day the trade is latency versus consistency: a consistent write waits for another replica on every request, which across regions is the speed of light." }
        ] },

      { level: "advanced",
        q: "Is PostgreSQL CP or AP?",
        strong: "A strong answer explains that the question applies to configurations and operations, then answers for common setups.",
        answer: [
          { t: "p", text: "The label applies to a configuration, not a product. A single PostgreSQL node is not distributed, so partitions just mean it is unreachable. With a primary and asynchronous replicas, writes are only accepted by the primary — consistent, unavailable to clients cut off from it — while reads from replicas are available and possibly stale, so reads behave AP-ish." },
          { t: "p", text: "With a synchronous standby and automatic failover managed by a consensus tool like Patroni on etcd, the write path is CP: during a partition, only the side with the quorum keeps a primary. So I would describe each path — writes, replica reads — rather than give the database one letter." }
        ] },

      { level: "core",
        q: "Would you choose a CP or an AP database for a shopping cart?",
        strong: "A strong answer separates the cart from checkout and justifies by mergeability.",
        answer: [
          { t: "p", text: "The cart can be AP: it should always accept an \"add item\", even during a partition, and two diverged copies can be merged by taking the union — the original Dynamo paper's motivating example — with the occasional resurrected deleted item as a known, tolerable flaw." },
          { t: "p", text: "Checkout cannot: reserving stock and taking payment are not mergeable, so those operations go through a single leader or a quorum and are refused rather than double-processed during a partition. One product, two choices, per operation." }
        ] }
    ]
  }
});
