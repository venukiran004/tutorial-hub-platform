/* ============================================================================
   LESSON 8.1 — Why Distributed Is Hard: Fallacies and Failure Models
   ========================================================================= */
EC.receiveLesson({
  id: "8.1",

  lede: "On one machine, things work or they crash, and you know which. Spread the same program across a network and a third outcome appears: **you do not know**. A request that times out may have failed, may have succeeded, or may still be running; a node that stops answering may be dead or merely paused. Every protocol in this module — clocks, consensus, locks, gossip — is a way of acting correctly despite that uncertainty, and each starts by stating which failures it assumes. This lesson is those assumptions: the eight fallacies people make about networks, and the failure models protocols are designed against.",

  objectives: [
    "Explain partial failure and why a distributed system cannot tell slow from dead",
    "Measure the trade between timeout length, false suspicion and detection time",
    "Name the eight fallacies of distributed computing and the design response to each",
    "Order the failure models from crash-stop to Byzantine and say what each demands of a protocol",
    "Explain the two-generals problem and what it means for confirmations"
  ],

  prerequisites: ["1.2", "7.1"],

  blocks: [

    { t: "h2", n: "01", id: "partial", text: "Partial failure",
      sub: "Some parts fail, the rest carry on — and nobody is sure which is which" },

    { t: "diagram", kind: "compare", title: "One machine against many",
      caption: "The right-hand column is why distributed systems need timeouts, retries, idempotency, consensus and fencing. Each is a response to not knowing.",
      columns: [
        { title: "One process", tone: "accent", items: [
          "a function call returns or raises",
          "memory is shared and consistent",
          "a crash takes everything down together",
          "one clock orders all events",
          "slow means slow; nothing is \"maybe\""
        ] },
        { title: "Many processes over a network", tone: "crit", items: [
          "a call returns, fails, or never answers",
          "each node has its own copy of the state",
          "one node fails while the others continue",
          "each node has its own clock (8.2)",
          "a silent node may be dead, paused or cut off"
        ] }
      ] },

    { t: "p", text: "The heart of it is that **silence is ambiguous**. A node that has not answered may have crashed, may be stuck in a garbage-collection pause, may have a congested network link, or may have answered into a lost packet. From outside these look identical. Any detector must pick a timeout, and every timeout is a trade:" },

    { t: "code", lang: "python", title: "slow_or_dead.py — a live node, judged by a timeout", code: `import random

rng = random.Random(11)
def response_time():
    """A healthy node: usually fast, sometimes a GC pause or a congested link."""
    t = rng.lognormvariate(-4.5, 0.6)                  # ~11 ms typical
    if rng.random() < 0.003: t += rng.uniform(1, 8)    # GC pause / stop-the-world
    if rng.random() < 0.001: t += rng.uniform(0.2, 3)  # a retransmitted packet, a busy hypervisor
    return t

samples = [response_time() for _ in range(200_000)]
print("a node that is ALIVE the whole time; the caller declares it dead after a timeout")
print("%10s %26s %26s" % ("timeout", "healthy calls judged dead", "time to notice a real crash"))
for timeout in (0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0):
    false = sum(s > timeout for s in samples) / len(samples)
    print("%9.2fs %25.3f%% %24.2f s" % (timeout, 100 * false, timeout))`,
      out: `a node that is ALIVE the whole time; the caller declares it dead after a timeout
   timeout  healthy calls judged dead time to notice a real crash
     0.05s                     1.046%                     0.05 s
     0.10s                     0.419%                     0.10 s
     0.50s                     0.396%                     0.50 s
     1.00s                     0.379%                     1.00 s
     2.00s                     0.305%                     2.00 s
     5.00s                     0.130%                     5.00 s
    10.00s                     0.000%                    10.00 s`,
      caption: "The node never died. Yet with a 100 ms timeout it is declared dead on about 0.4% of calls — the pauses and retransmissions in its tail — and even a 5-second timeout misjudges some. Only a timeout longer than the longest pause eliminates false suspicion, and that timeout is also how long a **real** crash goes unnoticed. There is no setting that is both fast and never wrong; protocols are designed to stay correct when the detector is wrong." },

    { t: "h2", n: "02", id: "fallacies", text: "The eight fallacies",
      sub: "What everyone assumes, and what to do instead" },

    { t: "diagram", kind: "matrix", title: "Peter Deutsch's eight fallacies (1994), with the response this course gives each",
      caption: "Each fallacy is a design decision made by default when nobody makes it deliberately. The rightmost column points at where the deliberate version is taught.",
      cols: ["What actually happens", "Design response"],
      rows: ["The network is reliable", "Latency is zero", "Bandwidth is infinite", "The network is secure", "Topology doesn't change", "There is one administrator", "Transport cost is zero", "The network is homogeneous"],
      cells: [
        [{ text: "packets lost, connections reset", tone: "crit" }, { text: "timeouts, retries, idempotency (7.1, 6.3)" }],
        [{ text: "0.5 ms in a DC, 150 ms across oceans", tone: "crit" }, { text: "fewer round trips, caches, locality (1.2)" }],
        [{ text: "shared, congested, metered", tone: "warn" }, { text: "compression, binary formats (1.5)" }],
        [{ text: "eavesdropping, tampering", tone: "crit" }, { text: "mTLS, zero trust (12.3)" }],
        [{ text: "nodes come and go constantly", tone: "warn" }, { text: "discovery, health checks (10.5, 2.2)" }],
        [{ text: "many teams, clouds, vendors", tone: "warn" }, { text: "contracts, versioned APIs (1.5)" }],
        [{ text: "serialisation, egress fees", tone: "warn" }, { text: "keep chatty traffic local (11.6)" }],
        [{ text: "mixed versions mid-deploy", tone: "warn" }, { text: "backward-compatible changes (1.5)" }]
      ] },

    { t: "h2", n: "03", id: "models", text: "Failure models",
      sub: "What a protocol assumes can go wrong" },

    { t: "diagram", kind: "layers", title: "Failure models, from easiest to hardest to tolerate",
      caption: "A protocol is correct only under the failures it assumes. Raft and Paxos assume crash-recovery with durable storage; they are not safe if a node lies. Byzantine tolerance (8.6) is far more expensive and is used where nodes may be malicious or corrupted.",
      items: [
        { label: "Crash-stop", sub: "a node halts and never returns", tone: "good", side: "simplest to reason about" },
        { label: "Crash-recovery", sub: "a node halts, restarts, and resumes from what it saved durably", tone: "accent", side: "the realistic default" },
        { label: "Omission", sub: "a node or link drops some messages", tone: "accent", side: "lost packets, full buffers" },
        { label: "Timing", sub: "a node or link is arbitrarily slow — pauses, congestion", tone: "warn", side: "indistinguishable from dead" },
        { label: "Byzantine", sub: "a node behaves arbitrarily: corrupt data, lies, two faces", tone: "crit", side: "needs 3f + 1 nodes (8.6)" }
      ] },

    { t: "callout", kind: "insight", title: "The impossibility results, in one paragraph each",
      body: [
        { t: "p", text: "**FLP (1985)**: in a fully asynchronous system — no bound on message delay — no deterministic protocol can guarantee consensus if even one process may crash, because it can never tell a crashed process from a slow one. Real consensus protocols escape by assuming the network is *eventually* well-behaved and by using timeouts: they are always **safe** (never disagree) and are **live** (make progress) whenever timing cooperates." },
        { t: "p", text: "**CAP (2000)**: during a partition, choose consistency or availability (5.1). Both results say the same thing from different angles: with an unreliable network, you cannot have perfect agreement, perfect availability and perfect speed. Every design picks which one to bend." }
      ] },

    { t: "h2", n: "04", id: "generals", text: "Two generals",
      sub: "Why no number of acknowledgements makes both sides certain" },

    { t: "viz", title: "Each confirmation needs its own confirmation",
      caption: "Two armies must attack together, and their messengers may be captured. Whoever sent the most recent message cannot know whether it arrived, so another confirmation is needed — forever. Over an unreliable channel, two parties cannot become *certain* they agree in a bounded number of messages. Real systems stop chasing certainty: they make operations idempotent and retryable (6.3), so that \"I am not sure it arrived\" is answered by sending it again.",
      svg: `<svg viewBox="0 0 760 278.0" width="100%" role="img"><defs><marker id="q148125accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q148125good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q148125warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q148125crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q148125violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q148125teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q148125line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="54.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="110.0" y="32" text-anchor="middle" class="s-label">General A</text>
<rect x="324.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="380.0" y="32" text-anchor="middle" class="s-label">the valley</text>
<rect x="594.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="650.0" y="32" text-anchor="middle" class="s-label">General B</text>
<line x1="110.0" y1="42" x2="110.0" y2="266.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="380.0" y1="42" x2="380.0" y2="266.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="650.0" y1="42" x2="650.0" y2="266.0" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="110.0" y1="60" x2="646.0" y2="60" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q148125accent)"/>
<text x="380.0" y="54" text-anchor="middle" class="s-sub" style="fill:var(--accent)">"attack at dawn"</text>
<rect x="40.0" y="80" width="140.0" height="20" rx="5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)"/>
<text x="110.0" y="94" text-anchor="middle" class="s-sub" style="fill:var(--ink)">did B get it? unsure</text>
<line x1="650.0" y1="124" x2="114.0" y2="124" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#q148125violet)"/>
<text x="380.0" y="118" text-anchor="middle" class="s-sub" style="fill:var(--violet)">"agreed"</text>
<rect x="567.6" y="144" width="164.8" height="20" rx="5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)"/>
<text x="650.0" y="158" text-anchor="middle" class="s-sub" style="fill:var(--ink)">did A get my ack? unsure</text>
<line x1="110.0" y1="188" x2="646.0" y2="188" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q148125accent)"/>
<text x="380.0" y="182" text-anchor="middle" class="s-sub" style="fill:var(--accent)">"got your agreement"</text>
<rect x="33.8" y="208" width="152.4" height="20" rx="5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)"/>
<text x="110.0" y="222" text-anchor="middle" class="s-sub" style="fill:var(--ink)">did B get THAT? unsure</text>
<text x="380.0" y="256" text-anchor="middle" class="s-sub" style="font-style:italic">…every confirmation needs a confirmation: the last sender is always unsure</text></svg>` },

    { t: "callout", kind: "trap", title: "Treating a timeout as a failure",
      body: [
        { t: "p", text: "A timeout means \"I do not know\", not \"it did not happen\". Code that catches a timeout from a payment service and tells the user \"payment failed\" — while the payment completed a second later — has turned uncertainty into a false statement. So has a failover script that declares a primary dead because it missed three heartbeats during a GC pause, and promotes a second primary while the first is still accepting writes (8.4, 8.5)." },
        { t: "p", text: "Handle the unknown explicitly: retry with an idempotency key, query the outcome before reporting it, and in coordination protocols use mechanisms — majorities, leases, fencing tokens — that stay correct even when a live node is wrongly suspected." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Tune a heartbeat failure detector",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A cluster manager suspects a node when it receives no heartbeat for *misses × interval* seconds. The nodes are healthy but have stop-the-world pauses of 0.2–8 seconds about every five minutes, during which they send nothing. Measure, over a simulated day, how many times a healthy node would be wrongly suspected, and how quickly a real crash would be detected, for several settings." }
      ],
      requirements: [
        "Model pauses as a random process with realistic lengths, not as independent late heartbeats",
        "For each (interval, misses), count false suspicions per day",
        "Compute detection time for a real crash",
        "Choose a setting, and say what must be true of the system for a faster setting to be safe"
      ],
      hint: "A pause of p seconds silences the node for p seconds plus up to one interval. Suspicion fires if that gap exceeds misses × interval.",
      solution: { lang: "python", title: "heartbeat_ex.py",
        code: `import random

rng = random.Random(4)
HOURS = 24
# A LIVE node's stop-the-world pauses: about one every five minutes, 0.2-8 s long.
pauses, t = [], 0.0
while t < HOURS * 3600:
    t += rng.expovariate(1 / 300)
    pauses.append((t, t + rng.choice([rng.uniform(0.2, 1.5)] * 4 + [rng.uniform(1.5, 8)])))

def evaluate(interval, misses):
    """Suspect the node when no heartbeat has arrived for misses x interval seconds."""
    limit = interval * misses
    # A pause stops heartbeats for its whole length; the gap seen is pause length + one interval.
    false_alarms = sum(1 for a, b in pauses if (b - a) + interval * rng.random() > limit)
    detect = limit + interval / 2                      # a real crash: the silence just has to exceed the limit
    return false_alarms, detect

print("%-20s %24s %20s" % ("interval, misses", "false alarms per day", "detect a crash in"))
for interval, misses in ((0.5, 2), (1, 3), (2, 3), (3, 3), (5, 2), (10, 3)):
    fa, det = evaluate(interval, misses)
    print("%-20s %24d %18.1f s" % (f"{interval} s x {misses}", fa, det))`,
        out: `interval, misses         false alarms per day    detect a crash in
0.5 s x 2                                 197                1.2 s
1 s x 3                                    51                3.5 s
2 s x 3                                    17                7.0 s
3 s x 3                                     2               10.5 s
5 s x 2                                     4               12.5 s
10 s x 3                                    0               35.0 s`,
        notes: [
          { t: "p", text: "Fast settings are wrong constantly: suspecting after one second of silence fired nearly two hundred false alarms in a day, each one a pointless failover or a healthy node ejected. Only a silence threshold longer than the longest pause eliminates them — here about thirty seconds — and that is exactly how long a real crash would then go unnoticed." },
          { t: "p", text: "The way out is not a cleverer number. It is to make the system **safe under false suspicion** — a wrongly suspected leader is fenced (8.4) so its late writes are rejected — and then choose a fast setting for availability. Or to reduce the pauses themselves: GC tuning, or a separate lightweight heartbeat thread that keeps beating during application stalls, at the risk of declaring alive a node whose real work is stuck." },
          { t: "p", text: "A practical middle: three seconds by three misses here gave two false alarms a day and ten-second detection; adaptive detectors such as phi accrual (8.5) adjust the threshold to each node's observed heartbeat distribution instead of using one fixed number." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the pause that created two leaders",
      body: [
        { t: "p", text: "**Symptom.** A coordination cluster's leader went silent for fifteen seconds; the followers elected a new leader. Then the old leader resumed and, for a few seconds, kept serving writes as if nothing had happened. Some clients wrote to the old leader, some to the new; the resulting conflicting state took a day to reconcile." },
        { t: "p", text: "**Mechanism.** A fifteen-second garbage-collection pause: from the followers' side, indistinguishable from a crash, so electing a new leader was correct. From the old leader's side, no time had passed at all — it had no way to know it had been deposed until it next talked to a follower. The storage accepted writes from both, because nothing in a write identified which leader's term it belonged to." },
        { t: "p", text: "**Fix.** Writes now carry the leader's term, and storage rejects any term older than the newest it has seen — a fencing token (8.4). The old leader's first write after the pause was refused, telling it to step down. GC was also tuned to shorten pauses, but the real fix was accepting that pauses — and therefore false suspicions — cannot be eliminated, only made harmless." }
      ] }
  ],

  takeaways: [
    "**Partial failure**: parts fail while others continue, and the rest of the system cannot reliably tell which.",
    "**Silence is ambiguous**: crashed, paused, congested and cut-off nodes look the same from outside.",
    "Measured: a live node with occasional pauses was judged dead on **~0.4% of calls at a 100 ms timeout**; only a timeout longer than the longest pause removes false suspicion — and delays real detection by as long.",
    "The **eight fallacies** — reliable, zero-latency, infinite-bandwidth, secure, static, single-admin, free, homogeneous network — are defaults to replace with deliberate design.",
    "Failure models, easiest to hardest: **crash-stop, crash-recovery, omission, timing, Byzantine**. A protocol is correct only under the ones it assumes.",
    "**FLP**: no deterministic consensus is guaranteed in a fully asynchronous system with one crash; real protocols stay safe always and live when timing cooperates.",
    "**Two generals**: over a lossy channel no finite exchange makes both sides certain — so make operations **idempotent and retryable** instead.",
    "**A timeout means \"I don't know\"**, never \"it failed\".",
    "Measured: one-second heartbeat suspicion gave **~200 false alarms a day** against realistic pauses. Make the system **safe under false suspicion** (fencing), then tune for speed."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A call to a payment service times out. What do you know?",
        options: ["The payment failed", "The payment succeeded", "Nothing certain: it may have failed, succeeded, or still be running", "The service has crashed"],
        answer: 2,
        why: "A timeout only means no response arrived in time; the request may have been lost, processed with the response lost, or still be in progress. Treating it as failure can tell a customer their payment failed when it succeeded. The safe responses are retrying with an idempotency key or querying the outcome." },

      { stem: "Why can no timeout value both detect crashes quickly and never suspect a healthy node?",
        options: ["Timeouts are implemented incorrectly", "Healthy nodes sometimes pause or are delayed for longer than any short timeout, and a long timeout delays detection of real crashes by the same amount", "Crashes are always fast", "Networks have no delays"],
        answer: 1,
        why: "A live node's response time has a tail — GC pauses, retransmissions — so a short timeout misjudges it, and only a timeout longer than that tail avoids false suspicion; but a crashed node is then also only noticed after that long timeout. That is the slow-versus-dead ambiguity, measured in both simulations." },

      { stem: "Raft is designed for which failure model?",
        options: ["Byzantine faults", "Crash-recovery with durable storage, and lost or delayed messages", "Only crash-stop", "No failures at all"],
        answer: 1,
        why: "Raft tolerates nodes that crash and restart with their persisted log, and messages that are lost, delayed or reordered, as long as a majority is available. It assumes nodes do not lie, so it is not Byzantine-tolerant; it handles more than crash-stop because recovered nodes rejoin." },

      { stem: "What practical lesson do real systems take from the two-generals problem?",
        options: ["Always send three acknowledgements", "Certainty over a lossy channel is impossible, so make operations idempotent and safe to resend", "Use UDP instead of TCP", "Avoid acknowledgements entirely"],
        answer: 1,
        why: "Every confirmation leaves its sender unsure whether it arrived, so no fixed number of acknowledgements produces certainty. Systems therefore design for resending: idempotent operations and deduplication make \"not sure it arrived\" harmless. The protocol choices in the other options do not change the underlying impossibility." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Opening a distributed-systems answer with the failure model is a strong signal.",
    questions: [
      { level: "core",
        q: "What makes distributed systems hard?",
        strong: "A strong answer centres on partial failure and uncertainty and connects them to concrete design patterns.",
        answer: [
          { t: "p", text: "Partial failure combined with uncertainty. Parts of the system fail independently, and the rest cannot reliably tell a crashed node from a slow or partitioned one, because the network has no bounded delay and processes pause. A timed-out request may have succeeded. On top of that there is no shared clock, so the order of events across machines is not directly observable." },
          { t: "p", text: "Almost every pattern exists to cope with that: timeouts and retries with idempotency because outcomes are unknown; consensus and majorities so decisions survive wrong suspicions; fencing tokens so a node wrongly believed dead cannot corrupt state; logical clocks because wall clocks lie. I would start any design by stating which failures it must tolerate." }
        ] },

      { level: "advanced",
        q: "How would you choose a failure-detection timeout for a cluster?",
        strong: "A strong answer frames it as a trade-off measured against pause distributions and makes safety independent of it.",
        answer: [
          { t: "p", text: "From the measured distribution of how long healthy nodes go silent — GC pauses, network blips — because the timeout must exceed most of that tail to avoid false suspicions, and every extra second of timeout is a second of undetected real failure. I would look at the p99.9 of heartbeat gaps rather than averages." },
          { t: "p", text: "Then I would make correctness independent of the choice: leaders hold leases and every write carries a fencing token, so a wrongly suspected node cannot do damage when it wakes. With that, I can choose a faster timeout for availability, or an adaptive detector like phi accrual that learns each node's normal gaps." }
        ] },

      { level: "core",
        q: "Name some of the fallacies of distributed computing and what you do about them.",
        strong: "A strong answer gives several with a concrete design response for each.",
        answer: [
          { t: "p", text: "The network is reliable — so every call has a timeout and retries with backoff, and operations are idempotent. Latency is zero — so I minimise round trips, batch, cache and keep chatty services close together. The network is secure — so mutual TLS and zero-trust authentication between services. Topology doesn't change — so service discovery and health checks rather than fixed addresses." },
          { t: "p", text: "And the subtle one, the network is homogeneous: during a rolling deploy two versions run at once, so every message and API change has to be backward compatible." }
        ] }
    ]
  }
});
