/* ============================================================================
   LESSON 8.3 — Consensus with Raft
   ========================================================================= */
EC.receiveLesson({
  id: "8.3",

  lede: "Consensus is getting a group of machines to agree on a sequence of decisions, such that once something is decided it is never undone — even when machines crash, messages are lost and the network splits. **Raft** does it with three ideas: one **leader** at a time, chosen by election in numbered **terms**; a replicated **log** that the leader copies to followers; and the rule that an entry is **committed** only once a **majority** holds it. The whole trick is that any two majorities share at least one member, so a decision made by one majority can never be contradicted by another. Everything else — etcd, ZooKeeper-style coordination, Kubernetes' brain, CockroachDB's ranges — is built on that.",

  objectives: [
    "Explain what consensus provides and why majorities make it safe",
    "Trace a Raft leader election, including terms, votes and the up-to-date log check",
    "Trace log replication and the commit rule",
    "Follow Raft through a network partition and explain why the minority cannot commit",
    "Size a consensus cluster for fault tolerance and commit latency"
  ],

  prerequisites: ["8.1", "8.2", "4.1"],

  blocks: [

    { t: "h2", n: "01", id: "what", text: "What consensus is for",
      sub: "Agreeing on one history, despite failures" },

    { t: "dl", items: [
      ["Agreement", "All non-faulty nodes decide the same sequence of values — the same log, entry by entry."],
      ["Validity", "Only values that some client actually proposed are decided."],
      ["Durability of decisions", "Once an entry is committed, it stays committed in every future leader's log."],
      ["Progress", "As long as a majority of nodes can talk to each other, the system keeps deciding. (FLP, 8.1: this needs the network to behave eventually; safety never does.)"]
    ] },

    { t: "p", text: "Put a state machine behind that log — a key-value store, a lock table, cluster configuration — and every node that applies the same log in the same order ends in the same state. That is **state machine replication**, and it is what etcd, Consul and the coordination layer of most distributed databases provide." },

    { t: "h2", n: "02", id: "election", text: "Leader election",
      sub: "Terms, votes and randomised timeouts" },

    { t: "diagram", kind: "cycle", title: "A Raft node's roles",
      caption: "A follower that hears nothing from a leader within a randomised election timeout (here 150–300 ms) becomes a candidate, increments the term and asks for votes. A majority makes it leader. Any node that sees a higher term in any message immediately reverts to follower. Randomising the timeout makes split votes rare.",
      centre: "one leader per term",
      nodes: [
        { label: "Follower", sub: "obeys the leader", tone: "accent", edge: "election timeout" },
        { label: "Candidate", sub: "term + 1, asks for votes", tone: "warn", edge: "majority of votes" },
        { label: "Leader", sub: "heartbeats, replicates", tone: "good", edge: "sees a higher term" }
      ] },

    { t: "dl", items: [
      ["Terms", "A logical clock (8.2) for leadership: each election starts a new term, and every message carries its term. A node with a stale term learns it is out of date the moment it hears from anyone newer."],
      ["One vote per term", "Each node votes for at most one candidate per term, persisted to disk, so two candidates cannot both collect a majority in the same term."],
      ["The up-to-date check", "A node refuses to vote for a candidate whose log is less complete than its own (compared by last entry's term, then length). So a leader always holds every committed entry — the key to never losing a decision."]
    ] },

    { t: "h2", n: "03", id: "replication", text: "Log replication and the commit rule",
      sub: "An entry counts once a majority has it" },

    { t: "viz", title: "One write through a three-node Raft group",
      caption: "The leader appends the entry, sends it to followers, and commits it as soon as a majority — itself plus one follower — has it on disk. It does not wait for the slowest follower. Followers learn the new commit index on the next message and apply the entry to their own state machines.",
      svg: `<svg viewBox="0 0 760 331.0" width="100%" role="img"><defs><marker id="q752061accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q752061good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q752061warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q752061crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q752061violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q752061teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q752061line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="24.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="80.0" y="32" text-anchor="middle" class="s-label">Client</text>
<rect x="224.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="280.0" y="32" text-anchor="middle" class="s-label">Leader (term 4)</text>
<rect x="424.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="480.0" y="32" text-anchor="middle" class="s-label">Follower 1</text>
<rect x="624.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="680.0" y="32" text-anchor="middle" class="s-label">Follower 2</text>
<line x1="80.0" y1="42" x2="80.0" y2="319.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="280.0" y1="42" x2="280.0" y2="319.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="480.0" y1="42" x2="480.0" y2="319.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="680.0" y1="42" x2="680.0" y2="319.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="80.0" y1="60" x2="276.0" y2="60" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q752061accent)"/>
<text x="180.0" y="54" text-anchor="middle" class="s-sub" style="fill:var(--accent)">SET x = 7</text>
<path d="M280.0 84 h26 v14 h-24" style="fill:none;stroke:var(--warn)" stroke-width="1.5" marker-end="url(#q752061warn)"/>
<text x="312.0" y="94" text-anchor="start" class="s-sub" style="fill:var(--warn)">append entry 12 to own log</text>
<line x1="280.0" y1="120" x2="476.0" y2="120" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#q752061violet)"/>
<text x="380.0" y="114" text-anchor="middle" class="s-sub" style="fill:var(--violet)">AppendEntries(term 4, prev 11, [x=7])</text>
<line x1="280.0" y1="150" x2="676.0" y2="150" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#q752061violet)"/>
<text x="480.0" y="144" text-anchor="middle" class="s-sub" style="fill:var(--violet)">AppendEntries(term 4, prev 11, [x=7])</text>
<line x1="480.0" y1="180" x2="284.0" y2="180" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q752061violet)"/>
<text x="380.0" y="174" text-anchor="middle" class="s-sub" style="fill:var(--violet)">(ok: appended 12)</text>
<rect x="197.6" y="198" width="164.8" height="20" rx="5" style="fill:var(--good);fill-opacity:.16;stroke:var(--good)"/>
<text x="280.0" y="212" text-anchor="middle" class="s-sub" style="fill:var(--ink)">2 of 3 have it: majority</text>
<path d="M280.0 234 h26 v14 h-24" style="fill:none;stroke:var(--good)" stroke-width="1.5" marker-end="url(#q752061good)"/>
<text x="312.0" y="244" text-anchor="start" class="s-sub" style="fill:var(--good)">commit 12, apply x = 7</text>
<line x1="280.0" y1="270" x2="84.0" y2="270" style="stroke:var(--accent);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q752061accent)"/>
<text x="180.0" y="264" text-anchor="middle" class="s-sub" style="fill:var(--accent)">(ok)</text>
<line x1="680.0" y1="300" x2="284.0" y2="300" style="stroke:var(--line);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q752061line)"/>
<text x="480.0" y="294" text-anchor="middle" class="s-sub" style="fill:var(--line)">(ok, late — not needed)</text></svg>` },

    { t: "callout", kind: "insight", title: "Why a majority is the whole trick",
      body: [
        { t: "p", text: "In five nodes, any two groups of three share at least one node. A committed entry is on a majority; a new leader needs votes from a majority; so at least one voter has the committed entry, and the up-to-date check means it will not vote for a candidate that lacks it. **Every future leader therefore has every committed entry.** No timing assumption is involved — which is why Raft stays safe through partitions, pauses and clock jumps, and only its *progress* depends on the network behaving." }
      ] },

    { t: "h2", n: "04", id: "partition", text: "Raft through a partition",
      sub: "The minority cannot commit; the majority moves on" },

    { t: "p", text: "Five nodes elect a leader and commit a write. Then the leader and one follower are cut off from the other three. A client writes to the old leader on the minority side, and another client writes on the majority side. Then the partition heals:" },

    { t: "code", lang: "python", title: "raft.py — election, replication and a partition, simulated", code: `import random

class Node:
    def __init__(self, i, n, rng):
        self.id, self.n, self.rng = i, n, rng
        self.term, self.voted, self.log = 0, None, []      # log entries: (term, command)
        self.state, self.commit, self.leader = "follower", 0, None
        self.reset_timer(0)
    def reset_timer(self, now): self.deadline = now + self.rng.uniform(150, 300)   # ms
    def last(self): return (self.log[-1][0] if self.log else 0, len(self.log))

class Cluster:
    def __init__(self, n=5, seed=3):
        self.rng = random.Random(seed); self.now = 0
        self.nodes = [Node(i, n, self.rng) for i in range(n)]
        self.cut = set(); self.events = []
    def ok(self, a, b): return a not in self.cut and b not in self.cut or a in self.cut and b in self.cut
    def say(self, msg): self.events.append(f"t={self.now:>5} ms  {msg}")
    def leader_of(self, side):
        ls = [x for x in self.nodes if x.state == "leader" and (x.id in self.cut) == side]
        return max(ls, key=lambda x: x.term) if ls else None

    def tick(self):
        self.now += 10
        for x in self.nodes:
            if x.state != "leader" and self.now >= x.deadline:
                self.election(x)
            if x.state == "leader" and self.now % 50 == 0:
                self.replicate(x)

    def election(self, c):
        c.term += 1; c.state, c.voted = "candidate", c.id; c.reset_timer(self.now)
        votes = 1
        for p in self.nodes:
            if p is c or not self.ok(c.id, p.id): continue
            if c.term > p.term: p.term, p.voted, p.state = c.term, None, "follower"
            up_to_date = c.last() >= p.last()                  # candidate's log at least as complete
            if p.term == c.term and p.voted in (None, c.id) and up_to_date:
                p.voted = c.id; p.reset_timer(self.now); votes += 1
        if votes > len(self.nodes) // 2:
            c.state = "leader"; c.leader = c.id
            self.say(f"node {c.id} elected leader for term {c.term} with {votes} votes")

    def replicate(self, l):
        reached = [l]
        for f in self.nodes:
            if f is l or not self.ok(l.id, f.id): continue
            if l.term < f.term:                                # a newer term exists: step down
                l.state = "follower"; self.say(f"node {l.id} sees term {f.term}, steps down"); return
            f.term, f.state, f.leader = l.term, "follower", l.id; f.reset_timer(self.now)
            i = 0                                              # keep the longest matching prefix
            while i < min(len(f.log), len(l.log)) and f.log[i] == l.log[i]: i += 1
            if f.log[i:]:
                self.say(f"node {f.id} discards uncommitted {f.log[i:]}")
            f.log = list(l.log); reached.append(f)
        # commit only entries from the leader's own term, once a majority holds them
        if len(reached) > len(self.nodes) // 2 and len(l.log) > l.commit and l.log[-1][0] == l.term:
            l.commit = len(l.log)
            self.say(f"leader {l.id} (term {l.term}) commits up to entry {l.commit}: on {len(reached)} of 5")
        for f in reached: f.commit = max(f.commit, min(l.commit, len(f.log)))   # leaderCommit travels along

    def client_write(self, side, cmd):
        l = self.leader_of(side)
        if l: l.log.append((l.term, cmd)); self.say(f"client writes {cmd!r} to leader {l.id} (term {l.term})")

c = Cluster()
for _ in range(40): c.tick()
c.client_write(False, "x=1"); [c.tick() for _ in range(10)]
old = c.leader_of(False).id
c.cut = {old, (old + 1) % 5}; c.say(f"PARTITION: {{{old}, {(old + 1) % 5}}} cut off from the other three")
c.client_write(True, "x=2 (minority side)")
for _ in range(60): c.tick()
c.client_write(False, "x=3 (majority side)")
for _ in range(20): c.tick()
c.cut = set(); c.say("partition heals")
for _ in range(30): c.tick()
print("\\n".join(c.events))
print("\\nfinal logs:")
for x in c.nodes: print(f"  node {x.id} term {x.term} {x.state:<9} committed {x.commit}  log {x.log}")`,
      out: `t=  190 ms  node 0 elected leader for term 1 with 5 votes
t=  400 ms  client writes 'x=1' to leader 0 (term 1)
t=  450 ms  leader 0 (term 1) commits up to entry 1: on 5 of 5
t=  500 ms  PARTITION: {0, 1} cut off from the other three
t=  500 ms  client writes 'x=2 (minority side)' to leader 0 (term 1)
t=  670 ms  node 4 elected leader for term 2 with 3 votes
t= 1100 ms  client writes 'x=3 (majority side)' to leader 4 (term 2)
t= 1150 ms  leader 4 (term 2) commits up to entry 2: on 3 of 5
t= 1300 ms  partition heals
t= 1350 ms  node 0 sees term 2, steps down
t= 1350 ms  node 0 discards uncommitted [(1, 'x=2 (minority side)')]
t= 1350 ms  node 1 discards uncommitted [(1, 'x=2 (minority side)')]

final logs:
  node 0 term 2 follower  committed 2  log [(1, 'x=1'), (2, 'x=3 (majority side)')]
  node 1 term 2 follower  committed 2  log [(1, 'x=1'), (2, 'x=3 (majority side)')]
  node 2 term 2 follower  committed 2  log [(1, 'x=1'), (2, 'x=3 (majority side)')]
  node 3 term 2 follower  committed 2  log [(1, 'x=1'), (2, 'x=3 (majority side)')]
  node 4 term 2 leader    committed 2  log [(1, 'x=1'), (2, 'x=3 (majority side)')]`,
      hl: [37, 38, 48, 57, 58],
      caption: "The old leader on the minority side accepted `x=2` but could reach only one follower — two of five — so it **never committed** it and never told the client it succeeded. The three-node majority timed out, elected node 4 in **term 2**, and committed `x=3`. When the partition healed, the old leader saw term 2 and stepped down, and its uncommitted entry was **overwritten** on both minority nodes. Every node ended with the same log, and nothing that had been committed was lost." },

    { t: "callout", kind: "trap", title: "\"The leader accepted my write\" is not \"my write is committed\"",
      body: [
        { t: "p", text: "A client that treats the leader's receipt of a write as success can lose it: the minority-side `x=2` above was accepted, held in two logs, and later discarded. Raft only promises durability for **committed** entries, and the leader acknowledges a client only after committing. Systems built on Raft that offer a faster \"accepted\" acknowledgement are offering a weaker guarantee." },
        { t: "p", text: "The same applies to reads: a leader that answers a read from its own state might have been deposed by a partition it has not noticed yet, and serve stale data. Linearizable reads require the leader to confirm it is still leader — a round of heartbeats to a majority (ReadIndex) or a time-bounded lease — before answering." }
      ] },

    { t: "h2", n: "05", id: "sizing", text: "Sizing a consensus group",
      sub: "Odd numbers, few nodes, close together" },

    { t: "exercise", kind: "Challenge", title: "How many nodes, and where?",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "A team is deploying an etcd-style consensus cluster and asks for advice on size and placement. Compute, for several layouts, how many node failures each tolerates and the median and p99 time to commit a write, given round trips of about 0.3 ms within a zone, 1.2 ms between zones, 70 ms to another region and 140 ms to a far one." }
      ],
      requirements: [
        "Commit latency = the time for enough followers to acknowledge so that, with the leader, a majority holds the entry",
        "Compare 3, 4 and 5 nodes within one region",
        "Compare 5 nodes spread over 3 regions and over 5 regions",
        "Report failures tolerated and p50/p99 commit latency",
        "Recommend a layout for a single-region system and for one that must survive a region loss"
      ],
      hint: "With n nodes the leader needs ⌊n/2⌋ follower acknowledgements, so it waits for the ⌊n/2⌋-th fastest follower.",
      solution: { lang: "python", title: "quorum_size_ex.py",
        code: `import random

rng = random.Random(5)
RTT = {"same zone": 0.3, "other zone": 1.2, "other region": 70.0, "far region": 140.0}

def commit_ms(followers, trials=5_000):
    """The leader commits once a majority (counting itself) has the entry:
    it waits for the k-th fastest follower acknowledgement."""
    n = len(followers) + 1; need = n // 2           # follower acks needed besides the leader
    out = []
    for _ in range(trials):
        acks = sorted(RTT[f] * rng.uniform(0.9, 1.6) for f in followers)
        out.append(acks[need - 1] + 0.5)               # + the leader's own fsync
    out.sort(); return out[len(out) // 2], out[int(len(out) * 0.99)]

print("%-46s %6s %10s %12s %10s" % ("placement (leader + followers)", "nodes", "tolerates", "p50 commit", "p99"))
for label, followers in (
    ("3 nodes, 3 zones, one region", ["other zone"] * 2),
    ("4 nodes, 3 zones, one region", ["other zone"] * 2 + ["same zone"]),
    ("5 nodes, 3 zones, one region", ["other zone"] * 3 + ["same zone"]),
    ("5 nodes, 3 regions (2+2+1)", ["same zone", "other region", "other region", "far region"]),
    ("5 nodes, 5 regions", ["other region"] * 2 + ["far region"] * 2),
):
    n = len(followers) + 1
    p50, p99 = commit_ms(followers)
    print("%-46s %6d %8d down %10.1f ms %8.1f ms" % (label, n, (n - 1) // 2, p50, p99))`,
        out: `placement (leader + followers)                  nodes  tolerates   p50 commit        p99
3 nodes, 3 zones, one region                        3        1 down        1.8 ms      2.3 ms
4 nodes, 3 zones, one region                        4        1 down        1.8 ms      2.3 ms
5 nodes, 3 zones, one region                        5        2 down        1.8 ms      2.2 ms
5 nodes, 3 regions (2+2+1)                          5        2 down       77.7 ms    107.6 ms
5 nodes, 5 regions                                  5        2 down       97.9 ms    112.2 ms`,
        notes: [
          { t: "p", text: "**Four nodes tolerate one failure, the same as three**: a majority of four is three, so losing two stops progress. The fourth node adds cost, a replica to keep in sync, and no resilience. Consensus groups are odd-sized for this reason — 3 or 5, occasionally 7." },
          { t: "p", text: "Within one region, five nodes across three zones commit as fast as three — the leader waits for the second-fastest follower, which is still a cross-zone hop — and survive two failures, or a whole zone plus one more node. Spread across regions, the commit time is set by the speed of light to the **majority's** nearest members: with 2+2+1 placement, the leader's region plus one other gives a majority, so commits cost one inter-region round trip; spreading over five regions makes even the nearest majority further away." },
          { t: "p", text: "Recommendation: three or five nodes over three zones for a single-region system; for region-loss survival, five nodes in a 2+2+1 layout across three regions, accepting about one inter-region round trip per write — and keep the consensus group small and dedicated, because every member is on the write path (Spanner and CockroachDB keep a separate small group per range rather than one large one)." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the Kubernetes control plane that lost its quorum",
      body: [
        { t: "p", text: "**Symptom.** A company ran its Kubernetes etcd cluster as three nodes, two of them in one availability zone. When that zone lost power, the control plane froze: no new pods could be scheduled and no deployments could proceed for the ninety minutes the zone was down, though the workloads already running in the other zones kept serving." },
        { t: "p", text: "**Mechanism.** One surviving etcd node out of three is not a majority, so etcd — correctly — refused to commit anything. Three nodes tolerate one failure, but placing two in one zone made a single zone failure a two-node failure. The cluster's fault tolerance was set by its placement, not its size." },
        { t: "p", text: "**Fix.** etcd moved to three nodes in three different zones (later five across three zones), on dedicated machines with fast disks, since fsync latency directly sets commit latency. A quarterly test now stops one zone's control-plane nodes and checks the cluster keeps working. The general rule: **count failure domains, not machines** — the same lesson as 2.5's stage 5." }
      ] }
  ],

  takeaways: [
    "**Consensus** makes a group agree on one log of decisions that are never undone; replaying that log gives every node the same state (**state machine replication**).",
    "Raft: one **leader** per **term**, elected by a **majority**, with **randomised election timeouts** to avoid split votes.",
    "A node votes once per term and only for a candidate whose log is **at least as up to date** as its own — so every leader holds every committed entry.",
    "An entry is **committed when a majority holds it**; the leader does not wait for the slowest follower.",
    "**Any two majorities overlap**, which makes Raft safe without any timing assumption; only progress needs the network to cooperate.",
    "Simulated partition: the minority leader **accepted but could never commit**; the majority elected a new leader in a higher term and committed; on healing, the uncommitted entry was **overwritten**.",
    "\"Accepted\" is not \"committed\"; and linearizable reads need the leader to **confirm its leadership** first (ReadIndex or leases).",
    "Use **odd** sizes: four nodes tolerate one failure, like three. Measured: five nodes in three zones commit as fast as three and tolerate two failures.",
    "Commit latency is the round trip to the **nearest majority**; spread across regions, it is the speed of light.",
    "**Count failure domains, not machines**: three nodes with two in one zone lose quorum with that zone."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A five-node Raft cluster is partitioned into groups of two and three. The leader is in the group of two. What happens?",
        options: ["Both sides keep committing writes", "The two-node side cannot commit; the three-node side elects a new leader in a higher term and continues", "Both sides stop until the partition heals", "The leader keeps committing because it was elected first"],
        answer: 1,
        why: "Committing needs a majority — three of five — so the old leader can accept writes but never commit them; the three nodes time out, elect a leader in a new term and commit normally, as the simulation showed. Only the majority side makes progress, and having been elected earlier gives no authority once a higher term exists." },

      { stem: "Why can a Raft leader never be missing a committed entry?",
        options: ["Leaders copy logs from every node before starting", "Committed entries are on a majority, a leader needs a majority's votes, and nodes only vote for candidates at least as up to date as themselves", "Clocks are synchronised", "Followers never crash"],
        answer: 1,
        why: "The voting majority and the majority holding the entry overlap in at least one node, and that node refuses to vote for a candidate whose log lacks the entry. No timing, clock or reliability assumption is needed, and leaders do not collect every log at election time." },

      { stem: "Why are consensus clusters usually 3 or 5 nodes rather than 4 or 6?",
        options: ["Even numbers cannot elect a leader", "An even-sized cluster tolerates no more failures than the odd size below it, while adding cost and a replica on the write path", "Raft only supports odd sizes", "Even sizes are slower to elect"],
        answer: 1,
        why: "A majority of 4 is 3, so 4 nodes survive one failure — the same as 3 — and a majority of 6 is 4, surviving two, the same as 5. Even sizes elect leaders and work correctly; they just buy no extra tolerance." },

      { stem: "A client's write was accepted by the Raft leader, which then lost its majority to a partition. Is the write durable?",
        options: ["Yes — the leader wrote it to disk", "Not necessarily: only committed entries are durable, and an uncommitted entry may be overwritten by a new leader", "Yes, once the partition heals", "No write is ever durable in Raft"],
        answer: 1,
        why: "Raft guarantees durability for entries committed on a majority; an entry held only by a minority can be replaced by the new leader's log after healing — exactly what happened to x=2 in the simulation. That is why leaders acknowledge clients only after commit." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Explain Raft with the majority-overlap argument, and you have explained it.",
    questions: [
      { level: "advanced",
        q: "How does Raft work?",
        strong: "A strong answer covers election, replication, the commit rule and the safety argument.",
        answer: [
          { t: "p", text: "Raft keeps a replicated log with one leader per term. Followers that stop hearing heartbeats wait a randomised timeout, become candidates, increment the term and request votes; a node grants one vote per term, and only to a candidate whose log is at least as up to date as its own. A candidate with a majority becomes leader." },
          { t: "p", text: "The leader appends client commands to its log and replicates them; an entry is committed once a majority has it, and committed entries are applied to the state machine on every node in order. Safety comes from majorities overlapping: a committed entry is on a majority, any leader was elected by a majority, the overlap guarantees some voter had the entry and refused candidates without it. So every leader holds all committed entries, regardless of timing." }
        ] },

      { level: "advanced",
        q: "How does Raft handle a network partition?",
        strong: "A strong answer walks both sides of the partition and the healing.",
        answer: [
          { t: "p", text: "Only the side with a majority can make progress. If the leader is on the minority side, it keeps accepting writes but cannot commit them, so it never acknowledges them to clients. The majority side times out, elects a new leader in a higher term and continues committing." },
          { t: "p", text: "When the partition heals, the old leader sees the higher term in any message and steps down; the new leader's log overwrites the uncommitted entries on the former minority nodes. Nothing committed is lost, and nothing uncommitted was ever acknowledged. Stale reads from the old leader are the remaining risk, which ReadIndex or leader leases prevent." }
        ] },

      { level: "core",
        q: "Where would you use a consensus system in an architecture?",
        strong: "A strong answer places consensus at coordination points and keeps it off the bulk data path.",
        answer: [
          { t: "p", text: "For the small amount of state that must be agreed on exactly: leader election for a primary database or a scheduler, distributed locks and leases with fencing tokens, cluster membership and configuration, service discovery metadata. That is what etcd, ZooKeeper and Consul are for — Kubernetes keeps its entire desired state in etcd." },
          { t: "p", text: "I keep it off the bulk path because every write pays a majority round trip and the group should stay small. Databases that use consensus for data, like CockroachDB and Spanner, partition the data into many small consensus groups rather than one large one." }
        ] }
    ]
  }
});
