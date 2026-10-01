/* ============================================================================
   LESSON 8.5 — Gossip, Failure Detection and Split Brain
   ========================================================================= */
EC.receiveLesson({
  id: "8.5",

  lede: "A cluster of hundreds or thousands of nodes needs every member to know, roughly, who else is alive — without a central registry that would itself be a bottleneck and a single point of failure. **Gossip** spreads that knowledge the way rumours spread, reaching every node in a number of rounds that grows only with the **logarithm** of the cluster size. **Failure detectors** decide when a silent member is dead, and the good ones adapt to each node's normal behaviour and ask others before accusing. When detection goes wrong across a partition, both halves can decide they are the survivors — **split brain** — which only a majority or a tie-breaker prevents.",

  objectives: [
    "Explain push gossip and measure how its rounds grow with cluster size",
    "Compare a fixed-timeout detector with a phi-accrual detector on steady and noisy nodes",
    "Use indirect probing (SWIM) to avoid suspecting a node because of one bad link",
    "Explain split brain and why two-node clusters need a witness",
    "Choose between gossip membership and a consensus-backed registry"
  ],

  prerequisites: ["8.1", "8.3"],

  blocks: [

    { t: "h2", n: "01", id: "gossip", text: "Gossip: spreading information like a rumour",
      sub: "No coordinator, logarithmic rounds" },

    { t: "p", text: "In push gossip, every node that knows a piece of news tells a few random peers each round; they tell a few more. The number informed roughly multiplies each round, so the whole cluster hears in about log₂ N rounds, and every node does a small, constant amount of work per round:" },

    { t: "code", lang: "python", title: "gossip.py — rounds to reach everyone, by cluster size and fan-out", code: `import math, random

def spread(n, fanout, rng):
    """Push gossip: each round, every node that knows the rumour tells \`fanout\` random peers."""
    informed, rounds, messages = {0}, 0, 0
    while len(informed) < n:
        rounds += 1
        new = set()
        for _ in informed:
            for p in rng.sample(range(n), fanout):
                new.add(p); messages += 1
        informed |= new
        if rounds > 200: break
    return rounds, messages

rng = random.Random(2)
print("%8s %8s %14s %18s %14s" % ("nodes", "fanout", "rounds (avg)", "messages per node", "log2(nodes)"))
for n in (10, 100, 1_000, 10_000):
    for fanout in (1, 3):
        runs = [spread(n, fanout, rng) for _ in range(20)]
        r = sum(x for x, _ in runs) / len(runs); m = sum(y for _, y in runs) / len(runs) / n
        print("%8s %8d %14.1f %18.1f %14.1f" % ("{:,}".format(n), fanout, r, m, math.log2(n)))`,
      out: `   nodes   fanout   rounds (avg)  messages per node    log2(nodes)
      10        1            7.0                3.5            3.3
      10        3            3.1                4.3            3.3
     100        1           12.8                6.1            6.6
     100        3            5.6                6.3            6.6
   1,000        1           17.9                7.8           10.0
   1,000        3            8.2                9.2           10.0
  10,000        1           23.4               10.0           13.3
  10,000        3           10.6               11.1           13.3`,
      hl: [9, 10, 11, 12],
      caption: "Going from 10 nodes to 10,000 — a thousandfold increase — only roughly tripled the rounds, which track log₂ N. Raising the fan-out from 1 to 3 more than halved the rounds for a small increase in messages per node. No node is special, no node is a bottleneck, and losing any node or message only slows the spread slightly. That robustness is why Cassandra, Consul (Serf), and many cluster managers use gossip for membership." },

    { t: "dl", items: [
      ["What gossip carries", "Membership (who is in the cluster, and their state), metadata such as ring ownership (4.3), versioned key-value state, and failure suspicions."],
      ["Anti-entropy", "Periodically, pairs of nodes compare their state — often with Merkle trees (5.3) — and exchange differences, so anything a rumour missed is eventually repaired."],
      ["What it does not give", "Agreement. Gossip converges eventually; at any moment nodes may disagree. Anything that must be decided once — a leader, a lock — needs consensus (8.3)."]
    ] },

    { t: "h2", n: "02", id: "detectors", text: "Better failure detectors",
      sub: "Adapt to each node, and get a second opinion" },

    { t: "p", text: "8.1 showed that a fixed timeout trades false alarms against detection speed. The **phi-accrual** detector (used by Cassandra and Akka) replaces the fixed threshold with a suspicion level computed from the intervals this particular node's heartbeats have actually shown: φ = −log₁₀(probability a heartbeat this late is still on its way). A steady node becomes suspicious quickly; a noisy one is given the slack its history justifies:" },

    { t: "code", lang: "python", title: "phi.py — a fixed timeout against phi accrual, on a steady node and a noisy one", code: `import math, random, statistics

class PhiAccrual:
    """Suspicion level phi = -log10(probability that a heartbeat this late is still coming),
    using the mean and spread of the intervals actually observed for this node."""
    def __init__(self, window=200): self.intervals, self.window, self.last = [], window, None
    def heartbeat(self, t):
        if self.last is not None:
            self.intervals = (self.intervals + [t - self.last])[-self.window:]
        self.last = t
    def phi(self, now):
        if len(self.intervals) < 10: return 0.0
        mean = statistics.fmean(self.intervals); sd = max(statistics.pstdev(self.intervals), mean / 10)
        p_later = 0.5 * math.erfc((now - self.last - mean) / (sd * math.sqrt(2)))   # tail of a normal
        return -math.log10(max(p_later, 1e-300))

def run(jitter, detector, hours=6, seed=1):
    """A LIVE node sends a heartbeat every second with the given jitter; count false suspicions."""
    rng = random.Random(seed); d = PhiAccrual(); t = 0.0; false = 0
    while t < hours * 3600:
        gap = max(0.05, rng.gauss(1.0, jitter))
        for k in range(1, int(gap / 0.1) + 1):                    # the monitor checks every 100 ms
            now = t + k * 0.1
            if detector == "fixed 1.5 s" and now - t > 1.5: false += 1; break
            if detector == "phi > 8" and d.phi(now) > 8: false += 1; break
        t += gap; d.heartbeat(t)
    # time for each detector to suspect a node that really crashed (heartbeats stop)
    if detector == "fixed 1.5 s": detect = 1.5
    else:
        detect = next(s / 10 for s in range(1, 600) if d.phi(d.last + s / 10) > 8)
    return false, detect

print("%-14s %-30s %22s %18s" % ("detector", "node", "false suspicions in 6 h", "detects a crash in"))
for jitter, label in ((0.02, "steady (±20 ms)"), (0.25, "noisy (±250 ms, busy VM)")):
    for det in ("fixed 1.5 s", "phi > 8"):
        f, dt = run(jitter, det)
        print("%-14s %-30s %22d %16.1f s" % (det, label, f, dt))`,
      out: `detector       node                           false suspicions in 6 h detects a crash in
fixed 1.5 s    steady (±20 ms)                                     0              1.5 s
phi > 8        steady (±20 ms)                                     0              1.6 s
fixed 1.5 s    noisy (±250 ms, busy VM)                          175              1.5 s
phi > 8        noisy (±250 ms, busy VM)                            0              2.5 s`,
      hl: [11, 12, 13, 14, 15],
      caption: "On the steady node both detectors behave well. On the noisy node — a busy VM whose heartbeats wander by a quarter of a second — the fixed 1.5 s threshold raised **175 false suspicions in six hours**, while phi accrual raised **none**, at the cost of detecting a real crash about a second later. One threshold for every node is wrong for most of them; phi sets each node's threshold from its own behaviour." },

    { t: "callout", kind: "insight", title: "Ask others before accusing: SWIM",
      body: [
        { t: "p", text: "Many false suspicions are about a **link**, not a node: A cannot reach B, but everyone else can. SWIM, the protocol behind HashiCorp's memberlist and Consul, handles it with **indirect probes**: when A's direct ping to B fails, A asks a few other members to ping B on its behalf, and only suspects B if none of them can reach it either. A suspected node then gets a short window to refute the suspicion before it is declared dead. The exercise measures how much this helps." }
      ] },

    { t: "h2", n: "03", id: "split-brain", text: "Split brain",
      sub: "Two halves, each sure it is the survivor" },

    { t: "viz", title: "A two-node cluster partitioned, with and without a witness",
      caption: "Left: each node sees the other vanish and cannot tell a crash from a partition, so each promotes itself — two primaries accepting writes that cannot be reconciled. Right: a third, lightweight witness in another failure domain gives three voters; only the side that can reach two of three continues, and the isolated node fences itself.",
      svg: `<svg viewBox="0 0 760 240" width="100%" role="img" aria-label="Split brain and a witness">
  <text x="185" y="20" text-anchor="middle" class="s-label" style="fill:var(--crit)">Two nodes, no tie-breaker</text>
  <text x="575" y="20" text-anchor="middle" class="s-label" style="fill:var(--good)">Two nodes + a witness</text>
  <rect x="40" y="70" width="110" height="50" rx="9" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="95" y="92" text-anchor="middle" class="s-label">node 1</text><text x="95" y="109" text-anchor="middle" class="s-sub">\"I am primary\"</text>
  <rect x="220" y="70" width="110" height="50" rx="9" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="275" y="92" text-anchor="middle" class="s-label">node 2</text><text x="275" y="109" text-anchor="middle" class="s-sub">\"I am primary\"</text>
  <line x1="150" y1="95" x2="220" y2="95" style="stroke:var(--crit);stroke-dasharray:3 6" stroke-width="2"/>
  <text x="185" y="86" text-anchor="middle" class="s-label" style="fill:var(--crit)">✕</text>
  <text x="185" y="160" text-anchor="middle" class="s-sub">each sees 1 of 2: no way to break the tie</text>
  <text x="185" y="180" text-anchor="middle" class="s-sub" style="fill:var(--crit)">both accept writes → divergent data</text>
  <line x1="380" y1="30" x2="380" y2="220" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <rect x="420" y="70" width="110" height="50" rx="9" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="475" y="92" text-anchor="middle" class="s-label">node 1</text><text x="475" y="109" text-anchor="middle" class="s-sub">1 of 3: steps down</text>
  <rect x="620" y="70" width="110" height="50" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="675" y="92" text-anchor="middle" class="s-label">node 2</text><text x="675" y="109" text-anchor="middle" class="s-sub">2 of 3: primary</text>
  <rect x="620" y="160" width="110" height="44" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="675" y="180" text-anchor="middle" class="s-label">witness</text><text x="675" y="196" text-anchor="middle" class="s-sub">third zone, no data</text>
  <line x1="530" y1="95" x2="620" y2="95" style="stroke:var(--crit);stroke-dasharray:3 6" stroke-width="2"/>
  <text x="575" y="86" text-anchor="middle" class="s-label" style="fill:var(--crit)">✕</text>
  <line x1="675" y1="120" x2="675" y2="160" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="575" y="226" text-anchor="middle" class="s-sub">a majority exists on exactly one side</text>
</svg>` },

    { t: "callout", kind: "trap", title: "The two-node cluster",
      body: [
        { t: "p", text: "Two nodes is the most common highly-available setup and the one that cannot decide anything on its own during a partition: each half has exactly half the votes. Configured to fail over automatically, it produces split brain on the first network blip between the two; configured to wait, it cannot fail over at all. There is no setting that fixes it, because the information needed — is the other node dead or just unreachable? — does not exist on either side." },
        { t: "p", text: "Add a third vote: a **witness** or quorum device in a third failure domain, which holds no data and only votes; or use a consensus-backed manager (etcd with three members) to decide who is primary. Then fence the loser — revoke its lease, cut its storage or network access — because an isolated node may still be serving clients (8.4)." }
      ] },

    { t: "diagram", kind: "compare", title: "Membership by gossip, or by consensus",
      caption: "Large systems commonly use both: gossip for the fast-changing, approximate view of thousands of members, and a small consensus group for the handful of facts that must be agreed exactly.",
      columns: [
        { title: "Gossip (SWIM, Serf, Cassandra)", tone: "accent", items: [
          "scales to thousands of nodes",
          "no single point of failure",
          "eventually consistent view of membership",
          "cheap, constant work per node",
          "for: who is alive, ring metadata, load hints"
        ] },
        { title: "Consensus registry (etcd, ZooKeeper)", tone: "good", items: [
          "a small group of 3–5 decides",
          "one agreed, linearizable view",
          "every change pays a majority round trip",
          "unavailable to a minority partition",
          "for: leaders, locks, configuration, primaries"
        ] }
      ] },

    { t: "exercise", kind: "Challenge", title: "Indirect probing over a flaky link",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Node A monitors node B over a link that loses 30% of packets in each direction; B itself is healthy, and every other link loses about 1%. Measure how often A wrongly suspects B with direct pings only, and with 1, 3 and 5 indirect probes through other members, and check that a genuinely dead B is still always detected." }
      ],
      requirements: [
        "Direct probe: ping and reply both over the flaky link",
        "Indirect probe: A asks a helper, which pings B and relays the answer — four hops over healthy links",
        "Suspect B only if the direct probe and every indirect probe fail",
        "Report false suspicion rates for k = 0, 1, 3, 5",
        "Report the detection rate for a dead B"
      ],
      hint: "A direct round trip over the flaky link succeeds with probability 0.7 × 0.7. Each indirect path avoids that link entirely.",
      solution: { lang: "python", title: "swim_ex.py",
        code: `import random

rng = random.Random(8)
LOSS = {("A", "B"): 0.30}                         # one flaky link; every other link loses 1%
def delivered(x, y):
    p = LOSS.get((x, y)) or LOSS.get((y, x)) or 0.01
    return rng.random() > p

def probe(target_alive, k):
    """A pings B; on no answer, asks k other members to ping B on its behalf (SWIM)."""
    if target_alive and delivered("A", "B") and delivered("B", "A"):
        return "alive"
    helpers = [f"M{i}" for i in range(k)]
    for h in helpers:                             # indirect: A -> h -> B -> h -> A
        if target_alive and delivered("A", h) and delivered(h, "B") and delivered("B", h) and delivered(h, "A"):
            return "alive"
    return "suspect"

PROBES = 20_000
print("A probes a LIVE B over a link losing 30%% of packets, %s times" % "{:,}".format(PROBES))
for k in (0, 1, 3, 5):
    false = sum(probe(True, k) == "suspect" for _ in range(PROBES))
    caught = sum(probe(False, k) == "suspect" for _ in range(1000)) / 1000
    print("  %d indirect probes: B wrongly suspected %5d times (%5.2f%%); a dead B still caught %3.0f%% of the time"
          % (k, false, 100 * false / PROBES, 100 * caught))`,
        out: `A probes a LIVE B over a link losing 30% of packets, 20,000 times
  0 indirect probes: B wrongly suspected 10290 times (51.45%); a dead B still caught 100% of the time
  1 indirect probes: B wrongly suspected   392 times ( 1.96%); a dead B still caught 100% of the time
  3 indirect probes: B wrongly suspected     0 times ( 0.00%); a dead B still caught 100% of the time
  5 indirect probes: B wrongly suspected     0 times ( 0.00%); a dead B still caught 100% of the time`,
        notes: [
          { t: "p", text: "With direct pings alone, A suspects a perfectly healthy B about half the time, because a round trip over a 30%-loss link fails 51% of the time. One indirect probe cuts that to about 2%; three remove it entirely in this run. The accusation now requires several independent paths to fail, which a single bad link cannot cause." },
          { t: "p", text: "Detection of a real failure is unaffected — a dead B answers nobody — so indirect probing improves accuracy without slowing detection, at the cost of a few extra messages only when a direct probe fails." },
          { t: "p", text: "SWIM adds one more stage: a suspected member is announced as suspect, and has a short window to refute it (with a higher incarnation number) before being declared dead. That catches the remaining cases — a node that was paused, or overloaded — where even indirect probes failed briefly." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: one switch port, and a cluster that kept ejecting a healthy node",
      body: [
        { t: "p", text: "**Symptom.** A Cassandra-style cluster repeatedly marked one node down and up again, dozens of times an hour. Each flap moved its token ranges' traffic to other replicas and back, raising latency across the cluster, and hinted-handoff backlogs grew. The node itself showed no errors, and pinging it from most hosts worked." },
        { t: "p", text: "**Mechanism.** A faulty switch port was dropping packets on the paths between that node and a few others. Their failure detectors, using a fixed threshold, saw missing heartbeats and declared it down; gossip spread the verdict; other nodes saw it alive and spread that. The node was healthy and the cluster was arguing about a link." },
        { t: "p", text: "**Fix.** The switch port was replaced. Afterwards: phi-accrual thresholds tuned per data centre so ordinary jitter does not trigger them, a dashboard of per-node and per-link suspicion counts so a flapping link stands out from a flapping node, and a change to require suspicion from several observers before routing around a node — the same principle as SWIM's indirect probes." }
      ] }
  ],

  takeaways: [
    "**Gossip** spreads information by random peer-to-peer exchange: measured, rounds grew roughly with **log₂ N** — a thousandfold larger cluster took only about three times as many rounds.",
    "Gossip is robust and coordinator-free, with constant work per node; it converges **eventually** and does not provide agreement.",
    "**Anti-entropy** with Merkle trees repairs whatever rumours missed.",
    "**Phi accrual** sets each node's suspicion threshold from its own heartbeat history: measured, a noisy node got **175 false suspicions in six hours** from a fixed timeout and **none** from phi.",
    "**SWIM's indirect probes** ask others before accusing: measured, false suspicion over a flaky link fell from **~51% to 0** with three helpers, with no loss of real detection.",
    "**Split brain**: partitioned halves each believe they are the survivor and both act.",
    "A **two-node cluster cannot decide** during a partition; add a **witness** in a third failure domain or use a consensus manager, and **fence** the loser.",
    "Use **gossip** for large, approximate membership and **consensus** for the few facts that must be agreed exactly — often both."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Roughly how does the number of gossip rounds needed to inform every node grow with cluster size N?",
        options: ["Linearly in N", "Logarithmically in N", "Quadratically in N", "It is constant"],
        answer: 1,
        why: "The informed set roughly multiplies each round, so the rounds needed grow like log N — the simulation went from about 7 rounds at 10 nodes to about 23 at 10,000 with fan-out 1. Linear growth would be a coordinator telling nodes one by one; constant rounds would require each node to message everyone." },

      { stem: "Why does a phi-accrual detector produce fewer false suspicions than a fixed timeout on a node with jittery heartbeats?",
        options: ["It uses a longer fixed timeout for everyone", "It computes suspicion from that node's own observed heartbeat intervals, so a node with high variance is given proportionally more slack", "It ignores heartbeats entirely", "It requires consensus before suspecting"],
        answer: 1,
        why: "Phi measures how unlikely the current silence is given the distribution of this node's past intervals, so a noisy node's threshold is effectively longer and a steady node's shorter — zero false suspicions on the noisy node against 175 for the fixed timeout. It is per node, not a global longer timeout, and it is a local computation." },

      { stem: "In SWIM, what happens when A's direct ping to B fails?",
        options: ["A immediately declares B dead", "A asks several other members to ping B and only suspects B if none of them gets an answer", "A restarts B", "A waits for the next round and ignores it"],
        answer: 1,
        why: "Indirect probing separates a bad link between A and B from a dead B: if other members can reach B, it is alive. Declaring death on one failed ping is what produces the ~51% false-suspicion rate in the exercise; restarting or silently ignoring are not part of the protocol." },

      { stem: "Why can a two-node primary/standby cluster not safely fail over automatically on its own?",
        options: ["Two nodes are too slow", "During a partition each node sees only itself — half the votes — and cannot tell a dead peer from an unreachable one, so automatic promotion risks two primaries", "Standbys cannot become primary", "Replication is impossible with two nodes"],
        answer: 1,
        why: "With two votes, neither side of a partition has a majority, and the information needed to choose is missing on both sides, so automatic promotion can create split brain. A third vote — a witness in another failure domain — or a consensus-backed manager supplies the majority. Speed, promotion and replication all work fine with two nodes." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Membership and failure detection are where theory meets the switch port.",
    questions: [
      { level: "advanced",
        q: "How do nodes in a large cluster know which other nodes are alive?",
        strong: "A strong answer covers gossip, adaptive detection, indirect probing and the consensus boundary.",
        answer: [
          { t: "p", text: "With gossip-based membership: each node periodically exchanges its view with a few random peers, so changes reach everyone in roughly log N rounds with constant work per node and no central registry. Failure detection is layered on top — SWIM-style probing, where a failed direct ping triggers indirect pings through other members before suspicion, and suspects get a window to refute." },
          { t: "p", text: "Thresholds should adapt per node — phi accrual — because one fixed timeout is too aggressive for noisy nodes and too slow for steady ones. And the view is eventually consistent, so anything that must be decided exactly once, like a primary or a lock, goes through a small consensus group instead." }
        ] },

      { level: "core",
        q: "What is split brain and how do you prevent it?",
        strong: "A strong answer explains the partition scenario, quorum and fencing.",
        answer: [
          { t: "p", text: "A partition leaves two parts of a cluster each believing the other has failed, so each acts as the authority — two primaries accepting conflicting writes. It comes from making a leadership decision without a majority." },
          { t: "p", text: "Prevention: require a majority for leadership — odd-sized groups, or a witness to break ties in two-node setups — so only one side can proceed; and fence the other side so that, if it is still running, its writes are rejected or its access is cut (fencing tokens, revoking storage access, STONITH). Monitoring then should show which side lost quorum, so nobody manually promotes it." }
        ] },

      { level: "core",
        q: "When would you use gossip versus a coordination service like etcd?",
        strong: "A strong answer separates approximate, large-scale state from small, agreed state.",
        answer: [
          { t: "p", text: "Gossip for state that is large, changes often and tolerates brief disagreement — membership of thousands of nodes, load information, ring metadata — because it scales and has no single point of failure." },
          { t: "p", text: "A coordination service for the small set of facts that must be agreed exactly and survive partitions correctly — who is leader, who holds a lock, the current configuration — accepting that every change pays a majority round trip and that a minority partition cannot change them." }
        ] }
    ]
  }
});
