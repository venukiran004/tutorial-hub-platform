/* ============================================================================
   LESSON 4.1 — Replication
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "Replication keeps copies of the same data on several machines, for three different reasons that are easy to conflate: **read scaling**, **failover**, and **putting data near users**. Every replication design then answers two questions — **who may accept writes**, and **does the primary wait for the copies before saying yes** — and each answer has a precise cost. Asynchronous replicas are fast and lag, so a user's own post can vanish when they refresh; synchronous ones never lag and make every write wait for the slowest copy. And no number of replicas adds write capacity, because **every replica must apply every write**.",

  objectives: [
    "Distinguish single-leader, multi-leader and leaderless replication by who accepts writes",
    "Compare asynchronous, semi-synchronous and synchronous replication on latency and loss, measured",
    "Explain read-your-writes and monotonic-read violations and route reads to prevent them",
    "Compute how many read replicas a workload needs, and why the answer explodes as writes grow",
    "Predict what an asynchronous failover loses"
  ],

  prerequisites: ["2.5"],

  blocks: [

    { t: "h2", n: "01", id: "topologies", text: "Who accepts writes",
      sub: "One leader, several leaders, or none" },

    { t: "viz", title: "Three replication topologies",
      caption: "Single-leader: all writes go to one primary, which streams its log to followers — simple, no write conflicts, one place where writes can bottleneck. Multi-leader: each region accepts writes and they replicate to each other — local writes everywhere, and two regions can change the same row at once. Leaderless: the client writes to several replicas directly and reads from several, and quorums decide (5.3).",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="Single-leader, multi-leader and leaderless replication">
  <defs><marker id="tp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker>
  <marker id="tp-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker></defs>
  <text x="125" y="20" text-anchor="middle" class="s-label">Single-leader</text>
  <text x="380" y="20" text-anchor="middle" class="s-label">Multi-leader</text>
  <text x="635" y="20" text-anchor="middle" class="s-label">Leaderless</text>
  <text x="125" y="48" text-anchor="middle" class="s-sub" style="fill:var(--warn)">writes</text>
  <line x1="125" y1="54" x2="125" y2="72" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#tp-w)"/>
  <rect x="75" y="74" width="100" height="36" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="125" y="97" text-anchor="middle" class="s-label">primary</text>
  <line x1="105" y1="110" x2="60" y2="150" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#tp-a)"/>
  <line x1="125" y1="110" x2="125" y2="150" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#tp-a)"/>
  <line x1="145" y1="110" x2="190" y2="150" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#tp-a)"/>
  <rect x="20" y="152" width="76" height="30" rx="7" class="s-fill s-stroke"/><text x="58" y="172" text-anchor="middle" class="s-sub">follower</text>
  <rect x="96" y="152" width="58" height="30" rx="7" class="s-fill s-stroke"/><text x="125" y="172" text-anchor="middle" class="s-sub">follower</text>
  <rect x="156" y="152" width="76" height="30" rx="7" class="s-fill s-stroke"/><text x="194" y="172" text-anchor="middle" class="s-sub">follower</text>
  <text x="125" y="212" text-anchor="middle" class="s-sub">reads anywhere · writes in one place</text>

  <line x1="255" y1="30" x2="255" y2="220" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <rect x="290" y="74" width="80" height="36" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="330" y="97" text-anchor="middle" class="s-label">EU leader</text>
  <rect x="400" y="74" width="80" height="36" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="440" y="97" text-anchor="middle" class="s-label">US leader</text>
  <line x1="370" y1="86" x2="398" y2="86" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#tp-a)"/>
  <line x1="400" y1="100" x2="372" y2="100" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#tp-a)"/>
  <line x1="330" y1="54" x2="330" y2="72" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#tp-w)"/>
  <line x1="440" y1="54" x2="440" y2="72" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#tp-w)"/>
  <text x="330" y="48" text-anchor="middle" class="s-sub" style="fill:var(--warn)">writes</text>
  <text x="440" y="48" text-anchor="middle" class="s-sub" style="fill:var(--warn)">writes</text>
  <rect x="300" y="140" width="160" height="40" rx="8" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
  <text x="380" y="158" text-anchor="middle" class="s-sub" style="fill:var(--ink)">both change row 42 at once</text>
  <text x="380" y="173" text-anchor="middle" class="s-sub" style="fill:var(--ink)">→ conflict to resolve</text>
  <text x="380" y="212" text-anchor="middle" class="s-sub">local writes everywhere · conflicts</text>

  <line x1="510" y1="30" x2="510" y2="220" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <rect x="595" y="44" width="80" height="30" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="635" y="64" text-anchor="middle" class="s-label">client</text>
  <rect x="528" y="140" width="66" height="30" rx="7" class="s-fill s-stroke"/><text x="561" y="160" text-anchor="middle" class="s-sub">node A</text>
  <rect x="602" y="140" width="66" height="30" rx="7" class="s-fill s-stroke"/><text x="635" y="160" text-anchor="middle" class="s-sub">node B</text>
  <rect x="676" y="140" width="66" height="30" rx="7" class="s-fill s-stroke"/><text x="709" y="160" text-anchor="middle" class="s-sub">node C</text>
  <line x1="620" y1="74" x2="575" y2="138" style="stroke:var(--warn)" stroke-width="1.5" marker-end="url(#tp-w)"/>
  <line x1="635" y1="74" x2="635" y2="138" style="stroke:var(--warn)" stroke-width="1.5" marker-end="url(#tp-w)"/>
  <line x1="650" y1="74" x2="695" y2="138" style="stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.5" marker-end="url(#tp-w)"/>
  <text x="690" y="100" text-anchor="start" class="s-sub">W of N</text>
  <text x="635" y="212" text-anchor="middle" class="s-sub">no leader · quorums (5.3)</text>
</svg>` },

    { t: "diagram", kind: "matrix", title: "Choosing a topology",
      caption: "Single-leader is the default for good reason: it has no write conflicts. Multi-leader is mostly a multi-region technique and should be confined to data where conflicts are rare or mergeable. Leaderless suits high-volume key-value data that tolerates eventual consistency.",
      cols: ["Write conflicts", "Write latency far away", "Typical systems"],
      rows: ["Single-leader", "Multi-leader", "Leaderless"],
      cells: [
        [{ text: "none", tone: "good" }, { text: "cross-region round trip", tone: "warn" }, { text: "PostgreSQL, MySQL, MongoDB" }],
        [{ text: "yes: resolve them", tone: "crit" }, { text: "local", tone: "good" }, { text: "multi-region MySQL, CouchDB" }],
        [{ text: "yes: versions, repair", tone: "warn" }, { text: "local quorum", tone: "good" }, { text: "Cassandra, DynamoDB-style" }]
      ] },

    { t: "h2", n: "02", id: "sync", text: "Does the primary wait?",
      sub: "Asynchronous, semi-synchronous, synchronous" },

    { t: "p", text: "A primary in one zone with two replicas — one in another zone of the same region, one in another region. Each write is timed under three replication modes, and the last column is what a crash of the primary loses at 2,000 writes a second with 150 ms of lag:" },

    { t: "code", lang: "python", title: "sync_modes.py — write latency and loss under three modes", code: `import random

rng = random.Random(2)
ack = {                                        # time for each replica to confirm a write, ms
    "replica in another zone":   lambda: rng.lognormvariate(0, 0.4) * 1.2,
    "replica in another region": lambda: 68 + rng.lognormvariate(0, 0.3) * 4,
}
WRITES, WRITES_PER_S, LAG_S = 50_000, 2_000, 0.15

def latency(mode):
    out = []
    for _ in range(WRITES):
        local = 0.3                                            # the primary's own commit
        a, b = (f() for f in ack.values())
        out.append(local + {"async": 0, "semi-sync (any 1 of 2)": min(a, b),
                            "sync (all replicas)": max(a, b)}[mode])
    out.sort()
    return out[len(out) // 2], out[int(len(out) * 0.99)]

print("%-24s %9s %9s %32s" % ("mode", "p50 ms", "p99 ms", "acknowledged writes lost on crash"))
for m in ("async", "semi-sync (any 1 of 2)", "sync (all replicas)"):
    p50, p99 = latency(m)
    lost = "~%d (everything in the lag window)" % (WRITES_PER_S * LAG_S) if m == "async" else "0"
    print("%-24s %9.1f %9.1f %32s" % (m, p50, p99, lost))`,
      out: `mode                        p50 ms    p99 ms acknowledged writes lost on crash
async                          0.3       0.3 ~300 (everything in the lag window)
semi-sync (any 1 of 2)         1.5       3.3                                0
sync (all replicas)           72.3      76.3                                0`,
      caption: "**Asynchronous** commits locally and acknowledges at once; whatever had not reached a replica when the primary dies is lost — acknowledged writes, gone. **Synchronous to all** waits for the slowest replica, so one cross-region copy puts 70 ms on every write, and if that replica is down, writes stop. **Semi-synchronous** waits for any one replica: near-zone latency, and no acknowledged write exists on only one machine." },

    { t: "callout", kind: "insight", title: "The common production answer",
      body: [
        { t: "p", text: "A synchronous (or semi-synchronous) standby **in another zone of the same region** for failover without loss — a millisecond or two per write — plus **asynchronous** replicas for read scaling and in other regions for disaster recovery and local reads. PostgreSQL expresses it with `synchronous_standby_names = 'ANY 1 (b, c)'`; managed databases call it multi-AZ. Writes pay one nearby round trip; reads scale; a region loss loses at most the async lag." }
      ] },

    { t: "h2", n: "03", id: "lag", text: "Replication lag and what users see",
      sub: "The read that goes backwards in time" },

    { t: "viz", title: "The vanished comment",
      caption: "The write is committed and acknowledged by the primary. The next read is routed to a replica that has applied the log up to an earlier position, so the user's own comment is missing. Nothing is broken or lost — the replica will catch up in milliseconds — but to the user the site just ate their post.",
      svg: `<svg viewBox="0 0 760 361.0" width="100%" role="img"><defs><marker id="q309226accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q309226good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q309226warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q309226crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q309226violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q309226teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q309226line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="24.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="80.0" y="32" text-anchor="middle" class="s-label">User</text>
<rect x="224.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="280.0" y="32" text-anchor="middle" class="s-label">App</text>
<rect x="424.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="480.0" y="32" text-anchor="middle" class="s-label">Primary</text>
<rect x="624.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="680.0" y="32" text-anchor="middle" class="s-label">Replica</text>
<line x1="80.0" y1="42" x2="80.0" y2="349.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="280.0" y1="42" x2="280.0" y2="349.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="480.0" y1="42" x2="480.0" y2="349.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="680.0" y1="42" x2="680.0" y2="349.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="80.0" y1="60" x2="276.0" y2="60" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q309226accent)"/>
<text x="180.0" y="54" text-anchor="middle" class="s-sub" style="fill:var(--accent)">POST comment</text>
<line x1="280.0" y1="90" x2="476.0" y2="90" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#q309226good)"/>
<text x="380.0" y="84" text-anchor="middle" class="s-sub" style="fill:var(--good)">INSERT (LSN 9041)</text>
<line x1="480.0" y1="120" x2="284.0" y2="120" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q309226good)"/>
<text x="380.0" y="114" text-anchor="middle" class="s-sub" style="fill:var(--good)">(committed)</text>
<line x1="280.0" y1="150" x2="84.0" y2="150" style="stroke:var(--accent);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q309226accent)"/>
<text x="180.0" y="144" text-anchor="middle" class="s-sub" style="fill:var(--accent)">(201 Created)</text>
<line x1="480.0" y1="180" x2="676.0" y2="180" style="stroke:var(--line)" stroke-width="1.6" marker-end="url(#q309226line)"/>
<text x="580.0" y="174" text-anchor="middle" class="s-sub" style="fill:var(--line)">replicate 9041 …</text>
<line x1="80.0" y1="210" x2="276.0" y2="210" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q309226accent)"/>
<text x="180.0" y="204" text-anchor="middle" class="s-sub" style="fill:var(--accent)">GET page (0.3 s later)</text>
<line x1="280.0" y1="240" x2="676.0" y2="240" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#q309226warn)"/>
<text x="480.0" y="234" text-anchor="middle" class="s-sub" style="fill:var(--warn)">SELECT comments</text>
<rect x="603.8" y="258" width="152.4" height="20" rx="5" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
<text x="680.0" y="272" text-anchor="middle" class="s-sub" style="fill:var(--ink)">applied up to LSN 9037</text>
<line x1="680.0" y1="300" x2="284.0" y2="300" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q309226crit)"/>
<text x="480.0" y="294" text-anchor="middle" class="s-sub" style="fill:var(--crit)">(no new comment)</text>
<line x1="280.0" y1="330" x2="84.0" y2="330" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q309226crit)"/>
<text x="180.0" y="324" text-anchor="middle" class="s-sub" style="fill:var(--crit)">(their comment is gone)</text></svg>` },

    { t: "dl", items: [
      ["Read-your-writes", "A user must always see their own writes. Violated by reading from a lagging replica right after writing, as above."],
      ["Monotonic reads", "A user must never see data go backwards. Violated when two consecutive reads hit two replicas with different lag — the comment appears, then disappears on refresh."],
      ["Consistent prefix", "Related writes must be seen in order. Violated when an answer is visible before the question it answers, because they replicated through different paths (6.2)."]
    ] },

    { t: "p", text: "Twenty thousand users each write, then read back after 0.3 s, 2 s and 30 s, with three replicas whose lag is usually 150 ms and occasionally several seconds. Three ways to route the reads:" },

    { t: "code", lang: "python", title: "replication.py — routing reads after a write", code: `import random

rng = random.Random(14)
REPLICAS = 3
def lag():                                    # replication lag: usually small, sometimes not
    return rng.expovariate(1 / 0.15) if rng.random() > 0.02 else rng.uniform(2, 10)

def simulate(policy, users=20_000):
    stale_own = reads = primary_reads = 0
    lsn = 0
    for _ in range(users):
        t = rng.uniform(0, 3600)
        lsn += 1; my_lsn = lsn                                # the user writes (a post, a setting)
        applied_at = [t + lag() for _ in range(REPLICAS)]     # when each replica has it
        for gap in (0.3, 2.0, 30.0):                          # they read back: soon, then later
            reads += 1; now = t + gap
            if policy == "any replica":
                r = rng.randrange(REPLICAS); fresh = applied_at[r] <= now
            elif policy == "primary for 5 s after a write":
                if gap < 5: primary_reads += 1; fresh = True
                else: r = rng.randrange(REPLICAS); fresh = applied_at[r] <= now
            elif policy == "replica only if caught up":
                caught_up = [i for i in range(REPLICAS) if applied_at[i] <= now]  # replica LSN >= my_lsn
                if caught_up: fresh = True
                else: primary_reads += 1; fresh = True
            stale_own += not fresh
    return stale_own / reads, primary_reads / reads

print("%-32s %26s %20s" % ("read routing", "reads missing own write", "reads on primary"))
for p in ("any replica", "primary for 5 s after a write", "replica only if caught up"):
    s, pr = simulate(p)
    print("%-32s %25.2f%% %19.1f%%" % (p, 100 * s, 100 * pr))`,
      out: `read routing                        reads missing own write     reads on primary
any replica                                           5.71%                 0.0%
primary for 5 s after a write                         0.00%                66.7%
replica only if caught up                             0.00%                 0.1%`,
      hl: [18, 20, 23, 24],
      caption: "Reading from any replica shows **about one read in twenty missing the user's own write**. Sending reads to the primary for five seconds after a write fixes it but puts every such read on the primary — two-thirds here, since every simulated read follows a write. Routing by **log position** — use a replica only if it has applied at least the user's last write — fixes it while sending almost nothing to the primary." },

    { t: "callout", kind: "trap", title: "\"Sticky to the primary after a write\" quietly becomes \"everything on the primary\"",
      body: [
        { t: "p", text: "The time-window fix is the one most teams ship, because it needs only a cookie. Then a feature makes most page views involve a write — a view counter, a \"last seen\" timestamp, an analytics event written to the same database — and every user is permanently inside the window. The replicas sit idle and the primary carries all the reads it was meant to be spared." },
        { t: "p", text: "Track the **log position** instead: after a write, record the primary's LSN (PostgreSQL `pg_current_wal_lsn()`, MySQL GTID) in the user's session; route a read to a replica only if its replayed position is at least that. It costs one comparison, and it only sends reads to the primary when a replica is genuinely behind." }
      ] },

    { t: "h2", n: "04", id: "limits", text: "What replicas cannot do",
      sub: "Every replica applies every write" },

    { t: "p", text: "Read replicas multiply read capacity, but each one must replay the entire write stream. As writes grow, the capacity a replica has left for reads shrinks, and the number of replicas needed explodes — the exercise below works it through. **Replication scales reads; only partitioning scales writes** (4.2)." },

    { t: "exercise", kind: "Challenge", title: "How many read replicas?",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Each database node sustains about 12,000 simple operations a second, and you plan to run nodes at no more than 70%. The application makes 50,000 reads a second, 5% of which must go to the primary for read-your-writes. Every replica also applies every write." }
      ],
      requirements: [
        "Compute the replicas needed at 2,000, 4,000, 6,000 and 8,000 writes a second",
        "Compute the primary's load in each case and flag when it exceeds its budget",
        "Explain why the replica count grows faster than the write rate",
        "Say what should change before the write rate reaches 6,000 a second"
      ],
      hint: "A replica's read budget is its total budget minus the writes it must apply. The primary handles all writes plus its share of reads.",
      solution: { lang: "python", title: "replicas_ex.py",
        code: `import math

NODE_CAPACITY = 12_000        # simple operations per second one database node sustains
HEADROOM = 0.7                # plan to run nodes at 70% at most
READS = 50_000                # read queries per second
PRIMARY_READ_SHARE = 0.05     # reads that must go to the primary (read-your-writes)

print("%10s %16s %18s %18s" % ("writes/s", "primary load", "reads/replica max", "replicas needed"))
for writes in (2_000, 4_000, 6_000, 8_000):
    budget = NODE_CAPACITY * HEADROOM
    primary = writes + READS * PRIMARY_READ_SHARE
    per_replica = budget - writes                 # every replica re-applies every write
    replica_reads = READS * (1 - PRIMARY_READ_SHARE)
    need = "impossible" if per_replica <= 0 else str(math.ceil(replica_reads / per_replica))
    flag = "  <- primary over budget" if primary > budget else ""
    print("%10s %16s %18s %18s%s" % ("{:,}".format(writes), "{:,.0f}".format(primary),
          "{:,.0f}".format(max(per_replica, 0)), need, flag))`,
        out: `  writes/s     primary load  reads/replica max    replicas needed
     2,000            4,500              6,400                  8
     4,000            6,500              4,400                 11
     6,000            8,500              2,400                 20  <- primary over budget
     8,000           10,500                400                119  <- primary over budget`,
        notes: [
          { t: "p", text: "Doubling writes from 2,000 to 4,000 a second takes the fleet from 8 replicas to 11; tripling them makes it 20, and at 8,000 a second it is 119. The count grows **hyperbolically**, because each replica's spare capacity is its budget minus the write rate, and that difference heads to zero. Replicas are a read-scaling tool with a write-driven ceiling." },
          { t: "p", text: "The primary breaks first anyway: at 6,000 writes a second it is over its 70% budget before any replica question arises, and nothing about replication helps, because all writes go to it. That is the signal to partition writes — sharding by a key (4.2) — or to remove writes from the database (counters to a write-behind store, events to a log)." },
          { t: "p", text: "The 5% of reads pinned to the primary looks small and is not: at 50,000 reads a second it is 2,500 operations on the most constrained machine in the system. Log-position routing (section 03) shrinks it to the reads that genuinely need it." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the failover that lost forty seconds of orders",
      body: [
        { t: "p", text: "**Symptom.** The primary database of an online shop died after a disk failure. Automated failover promoted a replica within thirty seconds, and the site recovered. Over the next day, customers with confirmation emails for orders that did not exist began contacting support — about 1,400 orders placed in the forty seconds before the failure." },
        { t: "p", text: "**Mechanism.** All replicas were asynchronous. A burst of write load had pushed replication lag to about forty seconds shortly before the disk failed, and the promoted replica had never received those transactions. They had been committed and acknowledged on the old primary — confirmation emails sent — and existed nowhere else. Section 02's \"acknowledged writes lost on crash\" was no longer a number in a table." },
        { t: "p", text: "**Fix.** A semi-synchronous standby in a second zone (`ANY 1`), so an acknowledged order exists on two machines; an alert and a write-throttle when replication lag exceeds a few seconds; and failover tooling that refuses to promote a replica whose lag exceeds a threshold without a human decision. The orders were reconstructed from payment-provider records and emails, which took a team three days." }
      ] }
  ],

  takeaways: [
    "Replication serves three goals — **read scaling, failover, locality** — and the design differs for each.",
    "**Single-leader** has no write conflicts; **multi-leader** writes locally and must resolve conflicts; **leaderless** writes and reads quorums (5.3).",
    "**Asynchronous**: fast, and a primary crash loses acknowledged writes in the lag window. **Synchronous to all**: no loss, and every write waits for the slowest replica (measured ~72 ms with one cross-region copy).",
    "**Semi-synchronous** (any one replica) gave near-zone latency (~1.5 ms) with no acknowledged write on only one machine — the usual production choice for the failover standby.",
    "Lag breaks **read-your-writes**, **monotonic reads** and **consistent prefix**; measured, about one in twenty read-backs from a random replica missed the user's own write.",
    "Route by **log position** — a replica only if it has applied the user's last write — rather than \"primary for N seconds\", which can drift into every read on the primary.",
    "**Every replica applies every write**, so replica count grows hyperbolically with write rate. **Replication scales reads; only partitioning scales writes.**",
    "Alert on replication lag, and never promote a far-behind replica without a decision."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A primary replicates asynchronously to two replicas with 2 seconds of lag and crashes. What is lost?",
        options: ["Nothing — replicas have all committed data", "Up to 2 seconds of writes that were acknowledged to clients", "Only uncommitted transactions", "The replicas' data"],
        answer: 1,
        why: "With asynchronous replication the primary acknowledges after its own commit, so writes still in the lag window were confirmed to clients but exist only on the dead primary; the promoted replica never received them. Committed is exactly the problem — committed on one machine. Uncommitted transactions are lost in any mode, and the replicas keep everything they had applied." },

      { stem: "A user posts a comment, refreshes, and the comment is missing; a second refresh shows it. What is happening?",
        options: ["The write failed and was retried", "The read went to a replica that had not yet applied the write — a read-your-writes violation", "The cache evicted the comment", "The primary lost the write"],
        answer: 1,
        why: "The write committed on the primary; the first read hit a lagging replica, and by the second refresh a replica had caught up. That is the classic replication-lag anomaly. A failed write would not reappear by itself, nothing in the description involves a cache, and a lost write would never appear." },

      { stem: "Why does adding read replicas eventually stop helping as the write rate grows?",
        options: ["Replicas cannot serve reads during writes", "Each replica must apply every write, so its spare read capacity shrinks toward zero", "Replication requires a lock on the primary", "Replicas share one disk"],
        answer: 1,
        why: "Each replica replays the whole write stream, so its read budget is total capacity minus the write rate; as writes approach capacity the budget approaches zero and the replica count needed explodes — 8 replicas at 2,000 writes/s, 119 at 8,000 in the exercise. Replicas serve reads concurrently with applying writes, replication does not lock the primary, and replicas have their own disks." },

      { stem: "Which read-routing rule guarantees read-your-writes while keeping most reads off the primary?",
        options: ["Always read from a random replica", "Read from the primary for 60 seconds after any write", "Read from a replica only if its replayed log position is at least the user's last write position", "Read from the replica with the lowest CPU"],
        answer: 2,
        why: "Comparing log positions sends a read to a replica exactly when that replica has the user's write, and to the primary only when no replica does — 0.1% of reads in the simulation. A random replica violates read-your-writes; a fixed time window works but can put most reads on the primary when users write often; and CPU says nothing about whether a replica has the data." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Replication answers are judged on lag, loss and the read-routing rule.",
    questions: [
      { level: "core",
        q: "Your database is overloaded with reads. Do you add replicas?",
        strong: "A strong answer says yes with conditions, and names the consistency cost and the write ceiling.",
        answer: [
          { t: "p", text: "Probably, after checking that indexes and a cache would not do it more cheaply. Replicas scale reads, but they are asynchronous, so reads can be stale: a user who just wrote may not see it. I would route reads that need read-your-writes by log position — a replica only if it has applied the user's last write — and let everything else read any replica." },
          { t: "p", text: "I would also check the write rate, because every replica applies every write; as writes grow, each replica's spare read capacity shrinks and the number needed grows very fast. If writes are the trend, replicas buy time and partitioning is the real answer." }
        ] },

      { level: "core",
        q: "Synchronous or asynchronous replication?",
        strong: "A strong answer separates the failover standby from read replicas and quantifies both costs.",
        answer: [
          { t: "p", text: "Both, for different copies. For the failover standby I want no acknowledged write on only one machine, so semi-synchronous to a standby in another zone of the same region — about a millisecond per write. Fully synchronous to all replicas makes every write wait for the slowest one and stops writes if any is down, which I would avoid, especially across regions where it adds 70 ms or more." },
          { t: "p", text: "For read replicas and other regions, asynchronous: they lag, so reads there are eventually consistent, and losing a region can lose its lag window — acceptable for disaster recovery if it is stated and monitored." }
        ] },

      { level: "advanced",
        q: "How would you design a database for users in Europe and the US who both write?",
        strong: "A strong answer weighs single-leader with remote writes against multi-leader and partitioning by home region.",
        answer: [
          { t: "p", text: "First option: single leader in one region, async replicas in the other for reads, and remote users pay a cross-Atlantic round trip on writes — simple, no conflicts, often fine if writes are infrequent." },
          { t: "p", text: "If writes must be local, I would prefer partitioning by home region over true multi-leader: each user's data has one leader in their region, so writes are local and there are no conflicts on that data; only genuinely global data needs special care. Full multi-leader on the same rows means designing conflict resolution — last-writer-wins loses data, so it would have to be mergeable types or CRDTs (8.6) — which I would accept only for data where that is natural." }
        ] }
    ]
  }
});
