/* ============================================================================
   LESSON 5.3 — Consistency Models and Quorums
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "\"Consistent\" means nothing until you say *which* consistency. The models form a ladder, from **linearizable** — the system behaves as one copy and every read sees the latest completed write — down to **eventual**, which promises only that replicas converge if writes stop. Each rung down buys latency and availability. Leaderless stores let you pick your rung per request with two numbers: write to **W** replicas, read from **R**, and if **R + W > N** every read set overlaps every write set, so the newest value is always among the answers.",

  objectives: [
    "Order the main consistency models from linearizable to eventual and say what each guarantees",
    "Recognise a linearizability violation on a timeline",
    "Explain why R + W > N guarantees a read overlaps the latest write, and measure it",
    "Trade staleness, latency and availability by choosing W and R",
    "Describe read repair, anti-entropy and sloppy quorums, and what each breaks or fixes"
  ],

  prerequisites: ["4.1", "5.1"],

  blocks: [

    { t: "h2", n: "01", id: "ladder", text: "The ladder of consistency models",
      sub: "Stronger guarantees above, cheaper operations below" },

    { t: "diagram", kind: "layers", title: "Consistency models, strongest first",
      caption: "Each rung implies everything below it. The session guarantees in the middle (4.1) are what users notice — seeing their own write, never going backwards — and they are cheap to provide with sticky routing or version tokens, even on top of an eventually consistent store.",
      items: [
        { label: "Linearizable", sub: "one copy, real time: a read sees every write that completed before it began", tone: "accent", side: "etcd, Spanner, a single primary" },
        { label: "Sequential", sub: "one order all clients agree on, but not tied to real time", tone: "accent", side: "rarely offered alone" },
        { label: "Causal", sub: "if A could have influenced B, everyone sees A before B", tone: "violet", side: "MongoDB causal sessions, CRDT stores" },
        { label: "Session guarantees", sub: "read-your-writes · monotonic reads · writes follow reads", tone: "teal", side: "sticky or token-based routing" },
        { label: "Eventual", sub: "if writes stop, replicas converge — no promise about when or what you read meanwhile", tone: "warn", side: "Cassandra/DynamoDB defaults, DNS" }
      ] },

    { t: "h3", text: "What a linearizability violation looks like" },

    { t: "diagram", kind: "timeline", title: "Three clients and one register x, initially 0",
      caption: "Alice's write of 1 finishes at 40 ms. Bob reads 1 at 50–60 ms. Carol starts reading at 70 ms — after both — and gets 0. In a single copy that is impossible: once any reader has seen 1, and after the write completed, no later read may return 0. An eventually consistent store can return exactly this, because Carol's read hit a replica the write had not reached.",
      span: 100, tick: 10, unit: "milliseconds",
      lanes: [
        { label: "Alice", bars: [[10, 40, "write x = 1 ✓", "good"]] },
        { label: "Bob", bars: [[50, 60, "read → 1", "accent"]] },
        { label: "Carol", bars: [[70, 85, "read → 0  ✗", "crit"]] }
      ] },

    { t: "callout", kind: "insight", title: "Where linearizability is non-negotiable",
      body: [
        { t: "p", text: "Anything used to make a single decision among many contenders: a lock or a lease (8.4), leader election (8.3), a uniqueness check such as \"is this username taken\", the last seat or the last unit of stock. If two clients can read different \"latest\" values, two can win. That is why coordination services — etcd, ZooKeeper, Consul — are linearizable even though it costs them latency and availability, and why everything else should use them sparingly." }
      ] },

    { t: "h2", n: "02", id: "quorums", text: "Quorums: R + W > N",
      sub: "Overlapping sets of replicas" },

    { t: "viz", title: "Why the overlap guarantees a fresh value",
      caption: "Five replicas. A write is acknowledged once W = 3 have it; a read asks R = 3 and takes the answer with the highest version. Any 3 and any 3 out of 5 must share at least one replica, so the read always includes a replica holding the latest acknowledged write. With W = 2 and R = 2 the sets can miss each other entirely.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Quorum overlap">
  <text x="190" y="20" text-anchor="middle" class="s-label" style="fill:var(--good)">W = 3, R = 3 — always overlap</text>
  <text x="570" y="20" text-anchor="middle" class="s-label" style="fill:var(--crit)">W = 2, R = 2 — can miss</text>
  <rect x="34" y="38" width="196" height="60" rx="14" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
  <text x="132" y="54" text-anchor="middle" class="s-sub">write set</text>
  <rect x="150" y="104" width="196" height="60" rx="14" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
  <text x="248" y="158" text-anchor="middle" class="s-sub">read set</text>
  <circle cx="70" cy="76" r="16" class="s-fill s-stroke"/><text x="70" y="81" text-anchor="middle" class="s-label">1</text>
  <circle cx="130" cy="76" r="16" class="s-fill s-stroke"/><text x="130" y="81" text-anchor="middle" class="s-label">2</text>
  <circle cx="190" cy="100" r="18" style="fill:var(--good);fill-opacity:.3;stroke:var(--good)" stroke-width="2"/><text x="190" y="105" text-anchor="middle" class="s-label">3</text>
  <circle cx="250" cy="126" r="16" class="s-fill s-stroke"/><text x="250" y="131" text-anchor="middle" class="s-label">4</text>
  <circle cx="310" cy="126" r="16" class="s-fill s-stroke"/><text x="310" y="131" text-anchor="middle" class="s-label">5</text>
  <text x="190" y="194" text-anchor="middle" class="s-sub">3 + 3 &gt; 5 → replica 3 is in both</text>

  <line x1="380" y1="30" x2="380" y2="196" style="stroke:var(--line);stroke-dasharray:4 4"/>

  <rect x="414" y="50" width="136" height="56" rx="14" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
  <text x="482" y="64" text-anchor="middle" class="s-sub">write set</text>
  <rect x="604" y="50" width="136" height="56" rx="14" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
  <text x="672" y="64" text-anchor="middle" class="s-sub">read set</text>
  <circle cx="450" cy="86" r="16" class="s-fill s-stroke"/><text x="450" y="91" text-anchor="middle" class="s-label">1</text>
  <circle cx="512" cy="86" r="16" class="s-fill s-stroke"/><text x="512" y="91" text-anchor="middle" class="s-label">2</text>
  <circle cx="577" cy="140" r="16" class="s-fill s-stroke"/><text x="577" y="145" text-anchor="middle" class="s-label">3</text>
  <circle cx="640" cy="86" r="16" class="s-fill s-stroke"/><text x="640" y="91" text-anchor="middle" class="s-label">4</text>
  <circle cx="702" cy="86" r="16" class="s-fill s-stroke"/><text x="702" y="91" text-anchor="middle" class="s-label">5</text>
  <text x="577" y="194" text-anchor="middle" class="s-sub" style="fill:var(--crit)">2 + 2 ≤ 5 → no common replica: the read can be stale</text>
</svg>` },

    { t: "p", text: "Three replicas, one write followed immediately by one read, every combination of W and R — plus how often the operation is refused when each replica is independently down 5% of the time:" },

    { t: "code", lang: "python", title: "quorum.py — stale reads and unavailability for each W and R", code: `import random

N, TRIALS = 3, 20_000
rng = random.Random(17)

def trial(W, R, down_p):
    """One write followed immediately by one read, against N replicas."""
    up = [rng.random() > down_p for _ in range(N)]
    if sum(up) < max(W, R): return "unavailable"
    arrive = [rng.expovariate(1 / 5.0) if up[i] else float("inf") for i in range(N)]  # ms to apply
    ack_time = sorted(a for a in arrive if a < float("inf"))[W - 1]   # write returns after W acks
    read_at = ack_time + 0.1                                           # the very next operation
    asked = rng.sample([i for i in range(N) if up[i]], R)
    newest = max(1 if arrive[i] <= read_at else 0 for i in asked)      # take the highest version seen
    return "fresh" if newest == 1 else "stale"

print("N = 3 replicas; a read issued the moment a write is acknowledged")
print("%-10s %8s %14s %32s" % ("W, R", "R+W>N", "stale reads", "unavailable (each node down 5%)"))
for W, R in ((1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (1, 3)):
    res = [trial(W, R, 0.0) for _ in range(TRIALS)]
    stale = res.count("stale") / TRIALS
    unav = sum(trial(W, R, 0.05) == "unavailable" for _ in range(TRIALS)) / TRIALS
    print("%-10s %8s %13.1f%% %31.2f%%" % (f"W={W}, R={R}", "yes" if W + R > N else "no", 100 * stale, 100 * unav))`,
      out: `N = 3 replicas; a read issued the moment a write is acknowledged
W, R          R+W>N    stale reads  unavailable (each node down 5%)
W=1, R=1         no          65.1%                            0.01%
W=1, R=2         no          32.2%                            0.65%
W=2, R=1         no          32.4%                            0.79%
W=2, R=2        yes           0.0%                            0.79%
W=3, R=1        yes           0.0%                           13.83%
W=1, R=3        yes           0.0%                           14.24%`,
      hl: [11, 13, 14],
      caption: "Every combination with **R + W > N** returned no stale reads; every combination without it returned stale data a third to two-thirds of the time on an immediate read-back. The overlap does not come free: requiring all three replicas on either side (W = 3 or R = 3) made about one operation in seven fail when any single replica was down. **W = 2, R = 2** is the balanced default for N = 3 — fresh reads, and it survives one replica down." },

    { t: "diagram", kind: "matrix", title: "Common settings for N = 3",
      caption: "Cassandra calls these consistency levels ONE, QUORUM and ALL, chosen per query; DynamoDB exposes the read side as eventually versus strongly consistent reads. Note that R + W > N gives a read that overlaps the latest write — still not full linearizability under concurrent writes without further care.",
      cols: ["W", "R", "Fresh reads", "Survives 1 down", "Use for"],
      rows: ["Fast and loose", "Quorum both", "Write-heavy", "Read-heavy"],
      cells: [
        [{ text: "1" }, { text: "1" }, { text: "no", tone: "crit" }, { text: "yes", tone: "good" }, { text: "metrics, likes, logs" }],
        [{ text: "2" }, { text: "2" }, { text: "yes", tone: "good" }, { text: "yes", tone: "good" }, { text: "the default", tone: "accent" }],
        [{ text: "1" }, { text: "3" }, { text: "yes", tone: "good" }, { text: "reads no", tone: "warn" }, { text: "ingest, rare reads" }],
        [{ text: "3" }, { text: "1" }, { text: "yes", tone: "good" }, { text: "writes no", tone: "warn" }, { text: "config, rare writes" }]
      ] },

    { t: "h2", n: "03", id: "repair", text: "How replicas converge",
      sub: "Read repair, anti-entropy, hinted handoff" },

    { t: "dl", items: [
      ["Read repair", "When a quorum read sees replicas disagree, it writes the newest value back to the stale ones. Hot keys converge quickly; keys nobody reads stay divergent."],
      ["Anti-entropy", "A background process compares replicas — using Merkle trees so only differing ranges are exchanged — and copies what is missing. This is what repairs cold data."],
      ["Hinted handoff and sloppy quorums", "When a replica is down, a write goes to another node with a hint to forward it later, so the write still reaches W nodes. Availability rises; but those W nodes are not the key's home replicas, so a read quorum may not overlap them and **R + W > N stops guaranteeing freshness** until the hints are delivered."],
      ["Conflicts", "Concurrent writes to the same key on different replicas need a rule: last-writer-wins by timestamp (simple, loses one write silently), version vectors that keep both for the application to merge, or CRDTs that merge automatically (8.6)."]
    ] },

    { t: "callout", kind: "trap", title: "Last-writer-wins with wall-clock timestamps",
      body: [
        { t: "p", text: "Resolving concurrent writes by keeping the one with the latest timestamp sounds fair, and it is the default in several stores. But clocks on different machines disagree by milliseconds to seconds (8.2). A node whose clock runs 300 ms fast wins every conflict for 300 ms after its write, even against writes that genuinely happened later; one that runs slow loses writes that clients were told succeeded. Nothing reports the loss — the losing value simply vanishes." },
        { t: "p", text: "Use LWW only where losing a concurrent write is acceptable (a cache, a last-seen timestamp). For anything else, avoid concurrent writes to the same key (single-writer per key), use conditional writes, or keep siblings with version vectors or a CRDT so both writes survive." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Choose W and R for five replicas",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A store keeps N = 5 replicas of each key, each down about 5% of the time. Measure staleness, unavailability and the combined write-then-read latency for several (W, R) pairs, then choose a setting for each of: a user-profile store read far more than written; a click-stream counter; a feature-flag store written by admins a few times a day." }
      ],
      requirements: [
        "Simulate W = 1/R = 1, W = 1/R = 5, W = 3/R = 3, W = 2/R = 4, W = 4/R = 2 and W = 5/R = 1",
        "Report stale reads, unavailability and write-plus-read latency for each",
        "Choose a pair for each workload and justify it from the table",
        "Explain why W = 1/R = 5 and W = 5/R = 1 are rarely chosen despite never being stale"
      ],
      hint: "Latency is set by waiting for the W-th and R-th fastest replica; availability by needing max(W, R) replicas up.",
      solution: { lang: "python", title: "quorum_ex.py",
        code: `import random

rng = random.Random(23)
TRIALS, DOWN_P = 20_000, 0.05

def trial(N, W, R):
    up = [rng.random() > DOWN_P for _ in range(N)]
    if sum(up) < max(W, R): return "unavailable", 0.0
    arrive = sorted(rng.expovariate(1 / 5.0) for _ in range(sum(up)))  # ms for each live replica
    write_ms = arrive[W - 1]                                           # wait for the W-th ack
    seen = rng.sample(arrive, R)                                       # replicas the read asks
    read_ms = 2.0 + sorted(rng.expovariate(1 / 2.0) for _ in range(R))[-1]   # wait for the R-th answer
    fresh = any(a <= write_ms + 0.1 for a in seen)
    return ("fresh" if fresh else "stale"), write_ms + read_ms

def measure(N, W, R):
    out = [trial(N, W, R) for _ in range(TRIALS)]
    ok = [ms for r, ms in out if r != "unavailable"]
    return (sum(r == "stale" for r, _ in out) / TRIALS, sum(r == "unavailable" for r, _ in out) / TRIALS,
            sum(ok) / len(ok))

print("N = 5 replicas, each down 5% of the time")
print("%-12s %12s %14s %18s" % ("W, R", "stale", "unavailable", "write+read ms"))
for W, R in ((1, 1), (1, 5), (3, 3), (2, 4), (4, 2), (5, 1)):
    s, u, ms = measure(5, W, R)
    print("%-12s %11.1f%% %13.2f%% %18.1f" % (f"W={W}, R={R}", 100 * s, 100 * u, ms))`,
        out: `N = 5 replicas, each down 5% of the time
W, R                stale    unavailable      write+read ms
W=1, R=1            77.3%          0.00%                5.1
W=1, R=5             0.0%         22.56%                7.6
W=3, R=3             0.0%          0.10%               10.0
W=2, R=4             0.0%          2.25%                8.6
W=4, R=2             0.0%          2.05%               12.3
W=5, R=1             0.0%         22.80%               15.4`,
        notes: [
          { t: "p", text: "**Profiles**: W = 3, R = 3 — never stale and the most available of the fresh options, because it tolerates two replicas down on either side. If reads dominate and must be fast, W = 4, R = 2 shifts the waiting onto the rarer writes. **Click-stream counter**: W = 1, R = 1 — the cheapest by far, and staleness is irrelevant for a number aggregated later. **Feature flags**: W = 4 or 5 with R = 1 or 2 — writes are rare and can wait or be retried by an admin; reads are constant and should be fast and available." },
          { t: "p", text: "The extremes are rarely chosen because they put the whole availability burden on one side: W = 1, R = 5 cannot read at all if any single replica is down, which in this simulation was more than a fifth of the time. Overlap protects freshness; slack — W and R both well below N — protects availability; the balanced settings buy both." },
          { t: "p", text: "Remember the caveat from section 03: with sloppy quorums and hinted handoff enabled, a write's W acknowledgements may come from non-home nodes, and the overlap argument no longer holds until hints are delivered. Freshness guarantees from R + W > N assume strict quorums." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: usernames that were taken twice",
      body: [
        { t: "p", text: "**Symptom.** A social app discovered pairs of accounts with identical usernames — about forty pairs, all created within a second of each other during a celebrity's launch-day sign-up rush. Login by username returned whichever account a replica happened to hold." },
        { t: "p", text: "**Mechanism.** Sign-up checked availability with a read at consistency ONE and then wrote the account at ONE, on a five-replica eventually consistent store. Two sign-ups for the same name, landing on different replicas, each read \"free\" and each wrote — a uniqueness decision made on the bottom rung of the ladder, where it cannot be made. With last-writer-wins on the username index, the earlier account's index entry was silently overwritten." },
        { t: "p", text: "**Fix.** Username claims moved to a lightweight transaction (Cassandra's `INSERT … IF NOT EXISTS`, a Paxos round — linearizable for that one operation) and everything else stayed at ONE or QUORUM. The duplicates were resolved by hand. The rule: **any check-then-act on a shared name, seat or balance needs a linearizable operation**; quorum reads and writes are not enough, because they do not make check-and-act atomic." }
      ] }
  ],

  takeaways: [
    "Consistency is a ladder: **linearizable → sequential → causal → session guarantees → eventual**, cheaper and more available as you go down.",
    "**Linearizable** means one copy in real time: after a write completes, no read may return the older value.",
    "Locks, leader election, uniqueness and last-unit decisions **need linearizability**; most other reads do not.",
    "Leaderless stores write to **W** and read from **R** of **N** replicas; if **R + W > N** the sets overlap and the read includes the latest acknowledged write.",
    "Measured for N = 3: every R + W > N setting had **0% stale** reads on immediate read-back; W = R = 1 was stale about two-thirds of the time.",
    "Overlap costs availability: needing all replicas on one side failed about **one operation in seven** when each replica was down 5% of the time. **W = 2, R = 2** balances both for N = 3.",
    "Replicas converge by **read repair**, **anti-entropy** (Merkle trees) and **hinted handoff**; sloppy quorums break the overlap guarantee until hints land.",
    "**Last-writer-wins on wall clocks silently drops writes**; use single writers, conditional writes, version vectors or CRDTs.",
    "Check-then-act on a shared name needs a **linearizable compare-and-set**, not a quorum read followed by a quorum write."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "With N = 3, which setting guarantees a read sees the latest acknowledged write while tolerating one replica being down?",
        options: ["W = 1, R = 1", "W = 2, R = 2", "W = 3, R = 1", "W = 1, R = 3"],
        answer: 1,
        why: "2 + 2 > 3, so read and write sets always share a replica, and both need only two of three, so either side survives one failure. W = R = 1 does not overlap. W = 3 or R = 3 overlap too, but then writes or reads respectively fail whenever any one replica is down — about one in seven operations in the simulation." },

      { stem: "A write completes at 40 ms. A client starting a read at 70 ms gets the old value, though another client already read the new value at 55 ms. Which model is violated?",
        options: ["Eventual consistency", "Linearizability", "Read-your-writes", "None"],
        answer: 1,
        why: "Linearizability requires that once a write has completed, every read that starts afterwards returns it (or something newer) — a later read returning the old value after the new one has been observed is the defining violation. Eventual consistency permits it. Read-your-writes concerns a client's own writes, and the reading client here did not write." },

      { stem: "Why can sloppy quorums break the R + W > N guarantee?",
        options: ["They reduce N", "Writes may be accepted by stand-in nodes that are not the key's home replicas, which a later read quorum need not include", "They disable read repair", "They use last-writer-wins"],
        answer: 1,
        why: "When home replicas are unreachable, a sloppy quorum lets other nodes accept the write with a hint to forward it, so the W acknowledgements can come from nodes outside the key's replica set; a read from the home replicas can then miss the write until the hints are delivered. N is unchanged, read repair still runs, and the conflict-resolution rule is a separate choice." },

      { stem: "Two sign-ups for the same username both read \"available\" at QUORUM and both write at QUORUM. Why can both succeed?",
        options: ["QUORUM is not durable", "Quorum reads and writes do not make the check and the write atomic; both can read before either writes", "R + W ≤ N", "The replicas are partitioned"],
        answer: 1,
        why: "Each read correctly returned the latest completed write — there was none yet — and then each wrote; overlap guarantees freshness of individual reads, not atomicity of read-then-write across clients. A linearizable compare-and-set such as INSERT … IF NOT EXISTS is needed. QUORUM writes are durable, 2 + 2 > 3 does overlap, and no partition is required for this race." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Pick the weakest model each operation can tolerate — and say which ones cannot.",
    questions: [
      { level: "core",
        q: "What is the difference between strong and eventual consistency?",
        strong: "A strong answer defines both precisely, places session guarantees between them, and ties each to operations.",
        answer: [
          { t: "p", text: "Strong — linearizable — means the system behaves as one copy: after a write completes, every subsequent read anywhere sees it. Eventual means replicas converge if writes stop, with no promise about what a read returns in the meantime; a user can even see a value and then an older one." },
          { t: "p", text: "Between them are the guarantees users notice: read-your-writes, monotonic reads and causal ordering, which can be provided cheaply with routing or version tokens on an eventually consistent store. I use linearizable operations for decisions — locks, uniqueness, the last unit of stock — and the weaker models for everything else, because each step up costs latency and availability." }
        ] },

      { level: "advanced",
        q: "Explain quorum reads and writes.",
        strong: "A strong answer derives R + W > N from overlap, quantifies the availability cost, and names the caveats.",
        answer: [
          { t: "p", text: "Each key has N replicas. A write is acknowledged after W of them confirm; a read asks R and takes the highest version. If R + W > N, any read set and any write set share at least one replica, so the read includes the latest acknowledged write. With N = 3, W = R = 2 gives that and still tolerates one replica down on either side." },
          { t: "p", text: "Caveats: it guarantees fresh individual reads, not linearizability under concurrent writes, and not atomic check-then-act; sloppy quorums with hinted handoff can break the overlap until hints are delivered; and concurrent writes still need a conflict rule — last-writer-wins on wall clocks silently loses data, so I would prefer version vectors, CRDTs or a single writer per key." }
        ] },

      { level: "core",
        q: "Which operations in an e-commerce site need strong consistency?",
        strong: "A strong answer lists the decision points and leaves the rest eventual.",
        answer: [
          { t: "p", text: "The ones where two clients could both win: reserving the last unit of stock, applying a single-use coupon, charging a payment exactly once, claiming a username or email, and seat or slot bookings. Those go through a single leader, a conditional write, or a linearizable transaction." },
          { t: "p", text: "Product pages, search results, recommendations, reviews, view counts and even the basket can be eventually consistent — with session guarantees so users see their own changes — and that is most of the traffic." }
        ] }
    ]
  }
});
