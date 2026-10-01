/* ============================================================================
   LESSON 8.4 — Leader Election, Distributed Locks and Fencing Tokens
   ========================================================================= */
EC.receiveLesson({
  id: "8.4",

  lede: "A distributed lock, or a leader, is a promise that only one process acts at a time. In a distributed system that promise is always held as a **lease** — valid until a deadline — because a holder that crashes must not block everyone forever. And a lease has a hole: the holder can be **paused** — garbage collection, a stalled VM, a slow disk — past its deadline, wake up still believing it holds the lock, and act. No lock service can prevent that, because the process cannot tell that time passed. The fix lives in the resource being protected: every holder gets a **fencing token** that only ever increases, and the resource **rejects any token older than the newest it has seen**.",

  objectives: [
    "Explain why distributed locks and leadership must be leases",
    "Reproduce the paused-holder problem with a real lease lock",
    "Make a protected resource safe with fencing tokens",
    "Implement leader election for a scheduler that never double-runs a job",
    "Choose where to get locks from, and when a lock is the wrong tool"
  ],

  prerequisites: ["8.1", "8.3"],

  blocks: [

    { t: "h2", n: "01", id: "leases", text: "Every distributed lock is a lease",
      sub: "Because holders can die" },

    { t: "p", text: "A lock held forever is fine on one machine: if the holder crashes, the process and its lock die together. Across machines, a crashed holder leaves its lock behind, so the lock service must eventually give it to someone else — after a **lease** expires, or when the holder's session to the coordination service lapses. That makes every distributed lock time-bounded, and every holder must assume its ownership can end without its knowledge." },

    { t: "diagram", kind: "timeline", title: "The paused holder",
      caption: "A acquires a 300 ms lease and starts its work, then stalls for half a second. At 300 ms the lease expires and B acquires the lock, does its work and writes. A resumes, has no idea that any time passed, and writes its stale result over B's. Both followed the protocol. Without fencing, the storage cannot tell them apart.",
      span: 600, tick: 100, unit: "milliseconds",
      lanes: [
        { label: "A's lease", bars: [[0, 300, "valid", "good"], [300, 600, "expired", "crit"]] },
        { label: "A", bars: [[0, 40, "work", "accent"], [40, 540, "paused (GC) — believes it holds the lock", "warn"], [540, 600, "writes!", "crit"]] },
        { label: "B", bars: [[300, 370, "takes lock", "violet"], [370, 410, "writes", "good"]] }
      ] },

    { t: "p", text: "The same sequence on a real Redis lease lock (`SET key value NX PX 300`), with A's pause simulated by a sleep, and a storage layer with and without fencing:" },

    { t: "code", lang: "python", title: "fencing.py — a lease lock, a pause, and fencing tokens", code: `import threading, time, uuid, redis

r = redis.Redis(port=6380)
LEASE_MS = 300

def acquire(name):
    """A lease lock: SET if absent, with an expiry. Returns a fencing token on success."""
    me = str(uuid.uuid4())
    while not r.set("lock:invoice-42", me, nx=True, px=LEASE_MS):
        time.sleep(0.01)
    return me, r.incr("fence:invoice-42")                 # a token that only ever increases

class Storage:
    """The resource the lock protects. With fencing, it remembers the highest token seen."""
    def __init__(self, fencing): self.fencing, self.max_token, self.value, self.log = fencing, 0, None, []
    def write(self, who, token, value):
        if self.fencing and token < self.max_token:
            self.log.append(f"   storage REJECTS {who} (token {token} < {self.max_token})"); return
        self.max_token = max(self.max_token, token); self.value = value
        self.log.append(f"   storage accepts {who}'s write {value!r} (token {token})")

def run(fencing):
    r.delete("lock:invoice-42", "fence:invoice-42")
    store = Storage(fencing)
    def client_a():
        _, tok = acquire("A"); store.log.append(f"   A holds the lock, token {tok}")
        time.sleep(0.5)                                    # a GC pause: the lease expires meanwhile
        store.log.append("   A wakes up, still believing it holds the lock")
        store.write("A", tok, "total = 100 (computed before the pause)")
    def client_b():
        time.sleep(0.05)
        _, tok = acquire("B"); store.log.append(f"   B gets the lock after A's lease expired, token {tok}")
        store.write("B", tok, "total = 140")
    ts = [threading.Thread(target=client_a), threading.Thread(target=client_b)]
    for t in ts: t.start()
    for t in ts: t.join()
    print("with fencing tokens" if fencing else "lease lock only")
    print("\\n".join(store.log)); print(f"   final value: {store.value!r}\\n")

run(False); run(True)`,
      out: `lease lock only
   A holds the lock, token 1
   B gets the lock after A's lease expired, token 2
   storage accepts B's write 'total = 140' (token 2)
   A wakes up, still believing it holds the lock
   storage accepts A's write 'total = 100 (computed before the pause)' (token 1)
   final value: 'total = 100 (computed before the pause)'

with fencing tokens
   A holds the lock, token 1
   B gets the lock after A's lease expired, token 2
   storage accepts B's write 'total = 140' (token 2)
   A wakes up, still believing it holds the lock
   storage REJECTS A (token 1 < 2)
   final value: 'total = 140'`,
      hl: [9, 11, 17, 18, 19],
      caption: "With the lease alone, A's write — computed before its pause — overwrote B's, and the stale total won. With fencing, every acquisition took the next value of a counter (`INCR`), the storage remembered the highest token it had accepted, and A's token 1 was refused because token 2 had already written. The lock service did not change; the **resource** became the thing that enforces mutual exclusion." },

    { t: "callout", kind: "insight", title: "Where the fencing token comes from",
      body: [
        { t: "p", text: "It must increase monotonically with each new holder, and the increase must itself be agreed: an `INCR` on a single Redis node, ZooKeeper's `zxid`, an etcd key's revision, a Raft leader's **term** (8.3, 8.1's incident). Consensus-backed services give tokens that survive their own failovers; a single Redis node's counter does not survive losing that node." },
        { t: "p", text: "The storage must check it on every write. That is easy when you own the storage — a version column with `WHERE fence < :token`, a conditional put — and impossible when you do not, which is the real limit of distributed locking: you can only make protected resources safe if they can participate." }
      ] },

    { t: "callout", kind: "trap", title: "Trusting Redlock (or any lease) for correctness",
      body: [
        { t: "p", text: "Redlock acquires a lease on a majority of independent Redis nodes, which protects against one Redis node failing. It does nothing about the paused holder: the lease is time-based, and a client paused past its expiry still acts. Martin Kleppmann's analysis of Redlock makes exactly this point — and adds that Redlock relies on bounded clock drift and process pauses, which real systems do not guarantee (8.1, 8.2)." },
        { t: "p", text: "Use a lease lock for **efficiency** — to stop two workers doing the same job wastefully — where an occasional double run is harmless. Where a double run is **incorrect** — two payouts, two primaries — use fencing tokens checked by the resource, or design the operation to be idempotent so that running twice is harmless (6.3)." }
      ] },

    { t: "h2", n: "02", id: "election", text: "Leader election",
      sub: "A lock on the right to lead" },

    { t: "diagram", kind: "steps", title: "Leader election on a consensus store",
      caption: "Kubernetes controllers, Patroni for PostgreSQL and most job schedulers do exactly this against etcd, ZooKeeper or Consul. The term or revision is the fencing token; anything the leader writes carries it.",
      items: [
        { label: "Campaign", desc: "create a lease-backed key; whoever's write wins becomes leader, and gets the key's revision", code: "revision = token", tone: "accent" },
        { label: "Lead while renewing", desc: "renew the lease well before expiry; stop acting if a renewal fails", code: "keep-alive", tone: "good" },
        { label: "Carry the token", desc: "every action against shared resources includes the token", code: "fence on write", tone: "violet" },
        { label: "Step down on doubt", desc: "if renewals stall or a newer token is seen, stop at once", code: "fail safe", tone: "warn" },
        { label: "Others watch and wait", desc: "followers watch the key and campaign when it disappears", code: "watch", tone: "teal" }
      ] },

    { t: "table",
      head: ["Need", "Use"],
      rows: [
        ["Avoid duplicate work; doubles are harmless", "A lease lock in Redis or a database row with an expiry"],
        ["One leader whose actions must not overlap", "etcd / ZooKeeper / Consul election, with the revision as a fencing token"],
        ["Exclusive access to a database row", "The database's own locks: SELECT … FOR UPDATE, advisory locks (5.2)"],
        ["Exactly one execution of an effect", "Idempotency keys or fencing at the resource — not a lock alone (6.3)"],
        ["Ordering many writers to one resource", "A single-writer design: route all writes through one partition owner (6.2)"]
      ],
      caption: "Most \"we need a distributed lock\" problems are better solved by not needing one: a single writer per key, a database transaction, or an idempotent operation." },

    { t: "exercise", kind: "Challenge", title: "A scheduler that never pays out twice",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "Two scheduler instances run a nightly payout job; leader election through a lease store decides which one runs it. On 3% of nights the leader suffers a long pause after winning, its lease expires, and the other instance takes over. Simulate a year with and without fencing at the job's sink." }
      ],
      requirements: [
        "Model a linearizable lease store whose revision increases with each new holder",
        "Run the job from whichever scheduler holds the lease, carrying the revision as a token",
        "Model the pause: the other scheduler acquires the expired lease and runs the job; the paused one wakes and runs it too",
        "Count nights the job ran twice, with and without the sink checking tokens",
        "Confirm the job never failed to run"
      ],
      hint: "With fencing, the sink keeps the highest token it has accepted and refuses anything lower. The paused leader's token is always older than its successor's.",
      solution: { lang: "python", title: "scheduler_ex.py",
        code: `import random

class LeaseStore:
    """A linearizable store (think etcd): one lease key, a revision that only grows."""
    def __init__(self): self.holder, self.expires, self.revision = None, -1.0, 0
    def try_acquire(self, who, now, ttl):
        if self.holder in (None, who) or now >= self.expires:
            if self.holder != who: self.revision += 1          # a new holder gets a new token
            self.holder, self.expires = who, now + ttl
            return self.revision
        return None

class JobSink:
    """Where the job's effect lands (a payments batch). Optionally checks fencing tokens."""
    def __init__(self, fencing): self.fencing, self.max_token, self.runs = fencing, 0, {}
    def run(self, day, token, who):
        if self.fencing and token < self.max_token: return False
        self.max_token = max(self.max_token, token)
        self.runs.setdefault(day, []).append(who); return True

def simulate(fencing, days=365, seed=1):
    rng, store, sink = random.Random(seed), LeaseStore(), JobSink(fencing)
    TTL = 10.0
    for day in range(days):
        t0 = day * 1000.0
        plan = []                                          # (time, scheduler) attempts around 02:00
        for s in ("sched-1", "sched-2"):
            plan.append((t0 + rng.uniform(0, 2), s))
        plan.sort()
        holders = {}
        for t, s in plan:                                  # each scheduler tries to become leader
            tok = store.try_acquire(s, t, TTL)
            if tok: holders[s] = (t, tok)
        for s, (t, tok) in holders.items():
            pause = rng.uniform(12, 30) if rng.random() < 0.03 else 0   # 3%: a long GC pause first
            if pause:                                       # while paused, the lease expires and
                other = "sched-2" if s == "sched-1" else "sched-1"      # the other scheduler takes over
                tok2 = store.try_acquire(other, t + TTL + 0.5, TTL)
                if tok2: sink.run(day, tok2, other)
            sink.run(day, tok, s)                           # the paused one wakes and runs the job too
    dup = sum(1 for d, who in sink.runs.items() if len(who) > 1)
    missing = days - len(sink.runs)
    return dup, missing

for f in (False, True):
    dup, miss = simulate(f)
    print("%-22s days the nightly payout ran twice: %2d   days it did not run: %d"
          % ("with fencing tokens" if f else "lease only", dup, miss))`,
        out: `lease only             days the nightly payout ran twice: 10   days it did not run: 0
with fencing tokens    days the nightly payout ran twice:  0   days it did not run: 0`,
        notes: [
          { t: "p", text: "Ten double payouts in a year from a perfectly functioning lease-based election — each one a night when the leader paused past its lease. The election did its job; the problem is that \"leader\" is a belief the paused process holds after it has stopped being true." },
          { t: "p", text: "With the sink rejecting stale tokens, the paused leader's late run is refused every time, and the job still ran every night because the successor's token was accepted. Fencing makes the system safe *under* wrong beliefs instead of trying to eliminate them — the theme of this module since 8.1." },
          { t: "p", text: "In a real payout system the token would be stored with the batch (`INSERT … WHERE NOT EXISTS a batch for this date with a higher token`), and the payout itself would also carry an idempotency key per day, so even a bug in fencing could not pay twice. Defence in depth for the operations that move money." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: two primaries after a pause",
      body: [
        { t: "p", text: "**Symptom.** A database cluster managed by a lease-based failover tool briefly had two primaries. For about twenty seconds, some application servers wrote to the old primary and some to the new one; the old primary's writes were then lost when it rejoined as a replica and was rebuilt." },
        { t: "p", text: "**Mechanism.** The old primary's host stalled for 40 seconds (a storage controller reset). Its leader lease expired, the failover tool promoted a replica, and the cluster's DNS pointed new connections at it. When the old host resumed, its database process had no idea it had been demoted, and application servers holding pooled connections to it kept writing. Nothing in a write identified which primary's era it belonged to." },
        { t: "p", text: "**Fix.** The old primary now self-fences: it must renew its leader key in the consensus store before accepting writes and goes read-only the moment a renewal fails, and the failover tool additionally cuts its network access (\"STONITH\" — shoot the other node in the head) before promoting. Applications validate pooled connections on checkout. Several layers, because the failure is that one process cannot know it has been replaced." }
      ] }
  ],

  takeaways: [
    "Every distributed lock or leadership is a **lease**: crashed holders must not block forever.",
    "A holder can be **paused past its lease** and act on a stale belief — measured on Redis, a paused client's stale write **overwrote** the new holder's.",
    "**Fencing tokens**: each new holder gets a larger token, and the protected resource **rejects older tokens** — measured, the stale write was refused.",
    "Tokens come from an agreed, monotonic source: a Raft **term**, an etcd **revision**, a ZooKeeper **zxid**, or `INCR`.",
    "Mutual exclusion is only enforceable if the **resource participates**; otherwise make the operation idempotent.",
    "**Redlock** guards against Redis node failure, not paused clients; use lease locks for efficiency, fencing for correctness.",
    "Leader election = a lease on a consensus store; carry the revision as a token, renew early, **step down on doubt**.",
    "Measured: a year of lease-based scheduling with 3% pauses **paid out twice on ten nights**; fencing at the sink made it zero.",
    "Often the best lock is none: a **single writer per key**, a database transaction, or an idempotent effect."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Client A holds a lease lock, pauses for longer than the lease, and resumes. What does it know?",
        options: ["That the lease expired", "Nothing — from its point of view no time passed, so it believes it still holds the lock", "That client B now holds the lock", "That it must re-acquire"],
        answer: 1,
        why: "A paused process does not observe the pause; it resumes mid-instruction believing its earlier state is current. Unless it checks the time and the lock before every action — and even then it can pause between the check and the action — it will act as holder. That is why the resource must fence." },

      { stem: "How does a fencing token prevent a paused former holder from corrupting data?",
        options: ["It encrypts the write", "Each new holder gets a larger token, and the storage rejects writes carrying a token older than the highest it has seen", "It extends the lease automatically", "It wakes the paused process"],
        answer: 1,
        why: "Monotonic tokens let the storage order holders without relying on clocks or the holders' beliefs: once the new holder writes with token 2, any later write with token 1 is refused — as the Redis demonstration showed. The token has nothing to do with encryption, leases or waking processes." },

      { stem: "When is a plain lease lock (without fencing) acceptable?",
        options: ["Never", "When it only prevents duplicate work whose occasional double execution is harmless", "For moving money", "For electing a database primary"],
        answer: 1,
        why: "A lease lock reduces duplicates but cannot rule them out, so it suits efficiency — not recomputing a cache twice, not sending a report twice — where a rare double is harmless. Payments and primaries are the cases where a double is incorrect, and they need fencing, consensus-based election or idempotency." },

      { stem: "A leader is elected via etcd. What should it use as its fencing token?",
        options: ["Its hostname", "The wall-clock time it was elected", "The revision of its election key (or its term)", "A random UUID"],
        answer: 2,
        why: "The revision increases with every change agreed by etcd's consensus, so a later leader always has a larger one, independent of clocks. Hostnames and UUIDs do not order holders, and wall-clock times are subject to skew (8.2)." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "If you mention a distributed lock, mention fencing in the same sentence.",
    questions: [
      { level: "advanced",
        q: "How would you implement a distributed lock?",
        strong: "A strong answer separates efficiency from correctness locks and centres on fencing.",
        answer: [
          { t: "p", text: "First, which kind. If it only prevents duplicate work and a rare double run is harmless, a lease in Redis — SET with NX and an expiry, released only by the owner — is enough. If a double run would be incorrect, a lease alone is not safe, because the holder can pause past its expiry and act after someone else has acquired the lock." },
          { t: "p", text: "For correctness I would take the lock from a consensus store — etcd or ZooKeeper — and use its revision as a fencing token that the protected resource checks on every write, rejecting older tokens. If the resource cannot check tokens, I would redesign so it does not need a lock: route all writes for a key through one owner, use a database transaction, or make the operation idempotent." }
        ] },

      { level: "advanced",
        q: "Explain fencing tokens and why they matter.",
        strong: "A strong answer gives the paused-holder scenario and the resource-side check.",
        answer: [
          { t: "p", text: "A lease-based lock holder can be paused — GC, VM stall — beyond its lease; the lock passes to someone else; then the old holder resumes, still believing it holds the lock, and writes. Nothing it can check reliably prevents this, because it can pause between any check and the write." },
          { t: "p", text: "A fencing token is a number that increases with each grant of the lock. Every write carries it, and the storage rejects any token lower than the highest it has accepted, so the stale holder's write is refused once the new holder has written. The token must come from an agreed monotonic source — an etcd revision, a Raft term — and the resource must participate." }
        ] },

      { level: "core",
        q: "How do you ensure a scheduled job runs exactly once across several instances?",
        strong: "A strong answer combines leader election with fencing or idempotency at the effect.",
        answer: [
          { t: "p", text: "Elect one runner with a lease on a consensus store, so normally only one instance runs it. But election alone allows a paused leader to run it again after a successor has, so the effect needs protection too." },
          { t: "p", text: "Either fence — the job carries the election revision and the sink rejects older ones — or make the job idempotent per run, for example a unique key on (job, date) in the same transaction as its effect so a second run is a no-op. For money I would do both." }
        ] }
    ]
  }
});
