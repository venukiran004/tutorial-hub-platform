/* ============================================================================
   LESSON 8.6 — CRDTs, Snapshots and Byzantine Faults
   ========================================================================= */
EC.receiveLesson({
  id: "8.6",

  lede: "Three tools for the edges of distributed systems. **CRDTs** are data types whose replicas can be updated independently — offline, across regions, during a partition — and always **merge to the same value**, because the merge is built to be order-free and repeat-safe. **Distributed snapshots** record one consistent picture of a running system with no global clock and without pausing it, which is how stream processors checkpoint. And **Byzantine fault tolerance** handles nodes that do not just crash but **lie**, at a price: **3f + 1** nodes to survive f liars, where crashes need only 2f + 1.",

  objectives: [
    "Explain why a CRDT's merge must be commutative, associative and idempotent",
    "Build a G-Counter and an OR-Set and show that replicas converge in any order",
    "Recognise invariants a CRDT cannot protect, and make one safe with escrow",
    "Take a consistent snapshot with the Chandy-Lamport algorithm, and say why it needs FIFO channels",
    "Derive why tolerating f Byzantine nodes takes 3f + 1, and know when that model is worth paying for"
  ],

  prerequisites: ["5.1", "8.2", "8.3"],

  blocks: [

    { t: "h2", n: "01", id: "crdts", text: "CRDTs: data that merges itself",
      sub: "Conflict-free replicated data types" },

    { t: "p", text: "4.1 left multi-leader and leaderless replication with a problem: two replicas accept writes to the same thing concurrently, and something must reconcile them. Last-writer-wins silently drops one; asking the application to merge pushes the problem onto every developer. A **conflict-free replicated data type** designs the conflict away: each replica updates its own copy with no coordination, replicas exchange state whenever they can, and a **merge** function combines any two states into one." },

    { t: "p", text: "For replicas to end up identical however messages are ordered, delayed or repeated, the merge must have three properties:" },

    { t: "dl", items: [
      { term: "Commutative", def: "merge(a, b) = merge(b, a) — the order in which two replicas meet does not matter." },
      { term: "Associative", def: "merge(merge(a, b), c) = merge(a, merge(b, c)) — how states are grouped on their way around does not matter." },
      { term: "Idempotent", def: "merge(a, a) = a — receiving the same state twice changes nothing, so at-least-once delivery is fine." }
    ] },

    { t: "p", text: "A plain number fails this test. Take a like counter on three replicas: A records 3 likes, B 5, C 2, all concurrently. Merging by **max** is order-free and repeat-safe but throws away likes; merging by **sum** keeps them but counts any state delivered twice. A **G-Counter** gives each replica its own slot, lets a replica increment only its own, and merges slot by slot with max:" },

    { t: "code", lang: "python", title: "crdt.py — a G-Counter and an OR-Set, merged in every order with repeats", code: `import itertools, random

class GCounter:
    """Grow-only counter: one slot per replica; a replica only ever increments its own slot."""
    def __init__(self, me): self.me, self.slots = me, {}
    def inc(self, n=1): self.slots[self.me] = self.slots.get(self.me, 0) + n
    def merge(self, other):                                   # element-wise max
        for r, v in other.slots.items(): self.slots[r] = max(self.slots.get(r, 0), v)
    def value(self): return sum(self.slots.values())

class MaxCounter:                                             # one number, merge keeps the larger
    def __init__(self, me): self.n = 0
    def inc(self, n=1): self.n += n
    def merge(self, other): self.n = max(self.n, other.n)
    def value(self): return self.n

class SumCounter(MaxCounter):                                 # one number, merge adds them up
    def merge(self, other): self.n += other.n

def converge(kind, rng=random.Random(4)):
    a, b, c = kind("A"), kind("B"), kind("C")
    a.inc(3); b.inc(5); c.inc(2)                              # 10 likes, concurrently, on 3 replicas
    seen = set()
    for order in itertools.permutations([a, b, c]):           # every delivery order ...
        reader = kind("R")
        for replica in order:
            for _ in range(rng.randint(1, 3)):                # ... and each state delivered 1-3 times
                reader.merge(replica)
        seen.add(reader.value())
    return sorted(seen)

print("10 likes on 3 replicas (A +3, B +5, C +2), merged in all 6 orders, with duplicate deliveries:")
print("  one number, merge = max :", converge(MaxCounter))
print("  one number, merge = sum :", converge(SumCounter))
print("  G-Counter               :", converge(GCounter))

class ORSet:
    """Observed-remove set: every add gets a unique tag; remove deletes only the tags it has seen."""
    def __init__(self, me): self.me, self.adds, self.removed, self.n = me, set(), set(), 0
    def add(self, item): self.n += 1; self.adds.add((item, f"{self.me}{self.n}"))
    def remove(self, item): self.removed |= {t for t in self.adds if t[0] == item}
    def merge(self, other): self.adds |= other.adds; self.removed |= other.removed
    def items(self): return sorted({item for item, tag in self.adds - self.removed})

phone, laptop = ORSet("phone"), ORSet("laptop")
phone.add("socks"); phone.add("book"); laptop.merge(phone)      # both devices see {book, socks}
phone.remove("socks")                                          # offline: phone removes socks ...
laptop.add("socks"); laptop.remove("book")                     # ... laptop re-adds socks, removes book
print("\\nshopping cart, edited on two devices while offline:")
print("  phone  before sync:", phone.items())
print("  laptop before sync:", laptop.items())
phone.merge(laptop); laptop.merge(phone)
print("  after sync, both  :", phone.items(), "and", laptop.items())`,
      hl: [7, 8, 9],
      out: `10 likes on 3 replicas (A +3, B +5, C +2), merged in all 6 orders, with duplicate deliveries:
  one number, merge = max : [5]
  one number, merge = sum : [13, 18, 25, 28]
  G-Counter               : [10]

shopping cart, edited on two devices while offline:
  phone  before sync: ['book']
  laptop before sync: ['socks']
  after sync, both  : ['socks'] and ['socks']` },

    { t: "viz", title: "A G-Counter merging three replicas",
      caption: "Each replica increments only its own slot, so no two replicas ever write the same slot concurrently. Merging takes the maximum of each slot, which is order-free and repeat-safe, and the value is the sum of the slots. A plain number cannot do both: max loses likes, and sum counts a repeated delivery twice — 13 to 28 in the run above, depending on how many repeats arrived.",
      svg: `<svg viewBox="0 0 760 252" width="100%" role="img" aria-label="G-Counter merge">
  <text x="139" y="30" text-anchor="middle" class="s-sub">slot A</text><text x="181" y="30" text-anchor="middle" class="s-sub">slot B</text><text x="223" y="30" text-anchor="middle" class="s-sub">slot C</text>
  <text x="20" y="60" class="s-label">replica A</text>
  <rect x="120" y="40" width="38" height="30" rx="5" class="s-stroke" style="fill:var(--accent);fill-opacity:.2"/><text x="139" y="60" text-anchor="middle" class="s-mono">3</text>
  <rect x="162" y="40" width="38" height="30" rx="5" class="s-fill s-stroke"/><text x="181" y="60" text-anchor="middle" class="s-mono">0</text>
  <rect x="204" y="40" width="38" height="30" rx="5" class="s-fill s-stroke"/><text x="223" y="60" text-anchor="middle" class="s-mono">0</text>
  <text x="20" y="120" class="s-label">replica B</text>
  <rect x="120" y="100" width="38" height="30" rx="5" class="s-fill s-stroke"/><text x="139" y="120" text-anchor="middle" class="s-mono">0</text>
  <rect x="162" y="100" width="38" height="30" rx="5" class="s-stroke" style="fill:var(--accent);fill-opacity:.2"/><text x="181" y="120" text-anchor="middle" class="s-mono">5</text>
  <rect x="204" y="100" width="38" height="30" rx="5" class="s-fill s-stroke"/><text x="223" y="120" text-anchor="middle" class="s-mono">0</text>
  <text x="20" y="180" class="s-label">replica C</text>
  <rect x="120" y="160" width="38" height="30" rx="5" class="s-fill s-stroke"/><text x="139" y="180" text-anchor="middle" class="s-mono">0</text>
  <rect x="162" y="160" width="38" height="30" rx="5" class="s-fill s-stroke"/><text x="181" y="180" text-anchor="middle" class="s-mono">0</text>
  <rect x="204" y="160" width="38" height="30" rx="5" class="s-stroke" style="fill:var(--accent);fill-opacity:.2"/><text x="223" y="180" text-anchor="middle" class="s-mono">2</text>
  <defs><marker id="gc-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
  <line x1="250" y1="55" x2="298" y2="106" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#gc-arr)"/>
  <line x1="250" y1="115" x2="298" y2="115" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#gc-arr)"/>
  <line x1="250" y1="175" x2="298" y2="124" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#gc-arr)"/>
  <rect x="300" y="90" width="140" height="50" rx="9" class="s-fill" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="370" y="111" text-anchor="middle" class="s-label">merge</text><text x="370" y="128" text-anchor="middle" class="s-sub">max of each slot</text>
  <line x1="440" y1="115" x2="488" y2="115" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#gc-arr)"/>
  <text x="514" y="92" text-anchor="middle" class="s-sub">A</text><text x="556" y="92" text-anchor="middle" class="s-sub">B</text><text x="598" y="92" text-anchor="middle" class="s-sub">C</text>
  <rect x="495" y="100" width="38" height="30" rx="5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/><text x="514" y="120" text-anchor="middle" class="s-mono">3</text>
  <rect x="537" y="100" width="38" height="30" rx="5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/><text x="556" y="120" text-anchor="middle" class="s-mono">5</text>
  <rect x="579" y="100" width="38" height="30" rx="5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/><text x="598" y="120" text-anchor="middle" class="s-mono">2</text>
  <text x="632" y="121" class="s-label" style="fill:var(--good)">sum = 10</text>
  <text x="556" y="162" text-anchor="middle" class="s-sub">B's state arrives again: max(5, 5) = 5, still 10</text>
  <text x="556" y="180" text-anchor="middle" class="s-sub">any order, any repeats: the same result</text>
  <line x1="20" y1="208" x2="740" y2="208" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <text x="380" y="234" text-anchor="middle" class="s-sub" style="fill:var(--crit)">one plain number instead: merge by max gives 5 (likes lost); merge by sum gives 13 to 28 (repeats counted)</text>
</svg>` },

    { t: "p", text: "Sets are harder, because removal fights addition. If one device removes an item while another adds it, which wins? The **OR-Set** (observed-remove set) answers: every add carries a unique tag, and a remove deletes only the tags it has **seen**. An add the remover never saw survives, so concurrent add and remove resolves as **add wins**. In the output above, the phone removed socks while the laptop, offline, re-added them and removed the book; after syncing, both hold exactly `['socks']`." },

    { t: "diagram", kind: "trace", title: "The cart, step by step",
      caption: "Each entry is an item with the tag of the add that created it. The laptop's second add of socks carries a new tag, l1, which the phone never saw, so the phone's remove (of p1) cannot delete it. The book's only tag, p2, was seen and removed by the laptop. After both sides exchange adds and removes, each computes adds minus removed and arrives at the same cart.",
      left: "what happens", vars: ["phone's live tags", "laptop's live tags"], codeW: 268,
      steps: [
        { code: "phone adds socks, book; laptop syncs", state: ["socks:p1 book:p2", "socks:p1 book:p2"], changed: [0, 1], note: "same cart on both" },
        { code: "phone, offline: remove socks", state: ["book:p2", "socks:p1 book:p2"], changed: [0], note: "removes tag p1 only", tone: "warn" },
        { code: "laptop, offline: add socks", state: ["book:p2", "socks:p1 socks:l1 book:p2"], changed: [1], note: "a NEW tag, l1", tone: "violet" },
        { code: "laptop, offline: remove book", state: ["book:p2", "socks:p1 socks:l1"], changed: [1], note: "removes tag p2" },
        { code: "sync: union adds, union removes", state: ["socks:l1", "socks:l1"], changed: [0, 1], note: "add wins: ['socks']", tone: "good" }
      ] },

    { t: "table", head: ["CRDT", "Holds", "Merge", "Used for"], rows: [
      ["G-Counter", "one count per replica", "max per slot; value = sum", "views, likes, metrics"],
      ["PN-Counter", "two G-Counters, P and N", "merge each; value = P − N", "counters that go down"],
      ["G-Set", "a set that only grows", "union", "seen IDs, tags"],
      ["OR-Set", "tagged adds, removed tags", "union both; add wins", "carts, memberships, presence"],
      ["LWW-Register", "value + timestamp", "keep the later", "a profile field, a setting"],
      ["MV-Register", "every concurrent value", "keep all; the app chooses", "values where loss is unacceptable"],
      ["Sequence (RGA, Yjs)", "ordered elements with IDs", "interleave by ID", "collaborative text editing"]
    ] },

    { t: "diagram", kind: "compare", title: "Two ways to ship a CRDT",
      caption: "The data type is the same idea either way. State-based sends whole states and tolerates any network; operation-based sends small operations but leans on the delivery layer to get each one to every replica exactly once (or the operations themselves must be idempotent).",
      columns: [
        { title: "State-based (CvRDT)", tone: "accent", items: ["send the whole state", "merge is a join: max, union", "survives loss, reordering, repeats", "more bandwidth as state grows", "gossip anti-entropy (8.5) fits well"] },
        { title: "Operation-based (CmRDT)", tone: "violet", items: ["send each operation", "concurrent ops must commute", "needs reliable, causal delivery", "small messages", "delta-state CRDTs sit in between"] }
      ] },

    { t: "callout", kind: "trap", title: "Convergence is not correctness",
      body: [
        { t: "p", text: "A CRDT guarantees that replicas **agree**, not that the value they agree on respects your business rules. Any invariant that needs a check across replicas — stock never below zero, a username taken only once, a balance that cannot overdraw — cannot be enforced by checking the **local** copy, because the other replica may be spending the same unit at the same moment. The exercise below shows a PN-counter overselling 10 units as 16." },
        { t: "p", text: "The fixes either coordinate or pre-divide: route the decision through consensus (8.3) for the scarce cases, or give each replica an **escrow** of rights it can spend alone. Use CRDTs where any interleaving of the operations is acceptable." }
      ] },

    { t: "callout", kind: "insight", title: "Where CRDTs run in production",
      body: [
        { t: "p", text: "Riak's data types (counters, sets, maps), Redis Enterprise's Active-Active databases, which accept writes in every region and merge them, and collaborative-editing libraries such as Automerge and Yjs, which let several people type into one document offline. The cost is metadata: tags, tombstones and per-replica slots that grow with replicas and history, and must be garbage-collected carefully, since a tombstone dropped too early lets a deleted item come back." }
      ] },

    { t: "h2", n: "02", id: "snapshots", text: "Distributed snapshots",
      sub: "A consistent picture of a system that never stops" },

    { t: "p", text: "Three bank branches hold 300 between them and keep sending each other money. To audit the total — or to checkpoint the system so it can restart after a crash — you need every branch's balance **at the same moment**. There is no such moment to ask for: clocks disagree (8.2), and money is always in flight. Asking every branch for its balance double-counts money that moves to a branch after it is read from, and loses money in transit." },

    { t: "p", text: "What you can get is a **consistent cut**: a set of per-node states such that every message received before the cut was also sent before it. Money in flight across the cut is recorded as **channel state**. The **Chandy-Lamport** algorithm finds such a cut with no pause, using a **marker** message that travels along the same channels as the data:" },

    { t: "diagram", kind: "steps", title: "Chandy-Lamport, from one node's point of view",
      items: [
        { label: "Initiator records", desc: "Saves its own state, then sends a marker on every outgoing channel before sending anything else.", tone: "accent" },
        { label: "First marker arrives", desc: "Not yet recorded? Save state, send markers on every outgoing channel, record the other incoming ones.", tone: "violet" },
        { label: "Data while recording", desc: "Any message arriving on a channel that is being recorded was in flight at the cut; log it as that channel's state.", tone: "warn" },
        { label: "Marker on a channel", desc: "Stop recording that channel. Every message sent before the sender recorded has now arrived.", tone: "teal" },
        { label: "Done", desc: "Every node recorded, every channel saw its marker: states plus channel logs form one snapshot.", tone: "good" }
      ] },

    { t: "p", text: "A simulation of the three branches, transferring random amounts continuously over channels with random delays. Each of 1,000 runs takes a snapshot mid-traffic, once by asking every branch for its balance and once with Chandy-Lamport:" },

    { t: "code", lang: "python", title: "snapshot.py — asking around against Chandy-Lamport, 1,000 snapshots each", code: `import heapq, itertools, random

NODES = "ABC"

class Bank:
    """Three branches move money between each other over FIFO channels; the total is always 300."""
    def __init__(self, seed):
        self.rng, self.now, self.events, self.seq = random.Random(seed), 0.0, [], itertools.count()
        self.balance = {n: 100 for n in NODES}
        self.last_arrival = {}                                # FIFO: never overtake on a channel
        self.snap, self.recording, self.channel_state = {}, {}, {}
    def send(self, src, dst, msg):
        t = max(self.now + self.rng.uniform(1, 10), self.last_arrival.get((src, dst), 0))
        self.last_arrival[(src, dst)] = t
        heapq.heappush(self.events, (t, next(self.seq), src, dst, msg))
    def transfer(self):
        src, dst = self.rng.sample(NODES, 2); amount = self.rng.randint(1, 30)
        if self.balance[src] >= amount:
            self.balance[src] -= amount; self.send(src, dst, ("money", amount))

    # --- Chandy-Lamport -------------------------------------------------------------
    def record(self, node):
        self.snap[node] = self.balance[node]                  # 1. save own state
        for other in NODES:
            if other != node:
                self.send(node, other, ("marker",))           # 2. marker on every outgoing channel
                self.recording[(other, node)] = True          # 3. record each incoming channel ...
                self.channel_state[(other, node)] = 0
    def deliver(self, src, dst, msg):
        if msg[0] == "money":
            self.balance[dst] += msg[1]
            if self.recording.get((src, dst)): self.channel_state[(src, dst)] += msg[1]
        else:                                                 # a marker arrives on src -> dst
            if dst not in self.snap: self.record(dst)
            self.recording[(src, dst)] = False                # ... until its marker arrives

    def run(self, until, snapshot_at=None, naive=False):
        reads, next_transfer = {}, 0.0
        while self.now < until:
            if self.events and self.events[0][0] <= next_transfer:
                self.now, _, src, dst, msg = heapq.heappop(self.events)
                if msg[0] == "read": reads[dst] = self.balance[dst]
                else: self.deliver(src, dst, msg)
            else:
                self.now = next_transfer; next_transfer += self.rng.uniform(0.5, 2); self.transfer()
                if snapshot_at is not None and self.now >= snapshot_at:
                    snapshot_at = None
                    if naive:                                 # ask each branch for its balance
                        for n in NODES: self.send("coordinator", n, ("read",))
                    else:
                        self.record("A")                      # A starts the snapshot
        return reads

naive_totals, cl_totals = [], []
for seed in range(1000):
    reads = Bank(seed).run(until=200, snapshot_at=100, naive=True)
    naive_totals.append(sum(reads.values()))
    b = Bank(seed); b.run(until=200, snapshot_at=100)
    cl_totals.append(sum(b.snap.values()) + sum(b.channel_state.values()))

for name, totals in (("ask every branch for its balance", naive_totals),
                     ("Chandy-Lamport (states + channels)", cl_totals)):
    right = sum(t == 300 for t in totals)
    print("%-36s total = 300 in %4d of 1000 snapshots; seen %d .. %d" % (name, right, min(totals), max(totals)))

b = Bank(7); b.run(until=200, snapshot_at=100)
print("\\none Chandy-Lamport snapshot:")
print("  branch states :", b.snap)
print("  in flight     :", {f"{s}->{d}": v for (s, d), v in sorted(b.channel_state.items()) if v})
print("  total         :", sum(b.snap.values()) + sum(b.channel_state.values()))`,
      hl: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
      out: `ask every branch for its balance     total = 300 in    7 of 1000 snapshots; seen 143 .. 344
Chandy-Lamport (states + channels)   total = 300 in 1000 of 1000 snapshots; seen 300 .. 300

one Chandy-Lamport snapshot:
  branch states : {'A': 5, 'B': 187, 'C': 55}
  in flight     : {'B->A': 46, 'C->A': 7}
  total         : 300` },

    { t: "p", text: "Asking around got the total right **7 times in 1,000**, and was off by as much as 157. Chandy-Lamport got it right every time: in the sample run, A recorded only 5, but 46 was on its way from B and 7 from C, and the channel logs caught both." },

    { t: "viz", title: "The cut, drawn",
      caption: "B sends $30 before the snapshot; it arrives at A after A has recorded, so A logs it as in flight on channel B→A until B's marker arrives on that channel. C's $20 to B is sent after C recorded and arrives after B recorded, so it lies entirely after the cut and is not counted. The dashed line joining the three recording points is the consistent cut; only the $30 crosses it. Markers from B and C to other nodes are omitted.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Chandy-Lamport consistent cut">
  <defs>
    <marker id="cl-m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker>
    <marker id="cl-k" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker>
  </defs>
  <text x="30" y="75" class="s-label">A</text><text x="30" y="155" class="s-label">B</text><text x="30" y="235" class="s-label">C</text>
  <line x1="60" y1="70" x2="570" y2="70" class="s-stroke" stroke-width="1.4"/>
  <line x1="60" y1="150" x2="570" y2="150" class="s-stroke" stroke-width="1.4"/>
  <line x1="60" y1="230" x2="570" y2="230" class="s-stroke" stroke-width="1.4"/>
  <path d="M200 36 L200 70 Q250 150 360 150 L280 230 L280 262" style="fill:none;stroke:var(--warn);stroke-dasharray:6 5" stroke-width="2"/>
  <line x1="140" y1="150" x2="287" y2="72" style="stroke:var(--accent)" stroke-width="1.8" marker-end="url(#cl-m)"/>
  <text x="188" y="124" text-anchor="end" class="s-label" style="fill:var(--accent)">$30</text>
  <line x1="200" y1="70" x2="357" y2="148" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#cl-k)"/>
  <line x1="200" y1="70" x2="279" y2="227" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#cl-k)"/>
  <line x1="360" y1="150" x2="517" y2="72" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#cl-k)"/>
  <line x1="420" y1="230" x2="517" y2="153" style="stroke:var(--accent)" stroke-width="1.8" marker-end="url(#cl-m)"/>
  <text x="474" y="208" class="s-sub" style="fill:var(--accent)">$20, after the cut</text>
  <circle cx="200" cy="70" r="6" style="fill:var(--warn)"/><circle cx="360" cy="150" r="6" style="fill:var(--warn)"/><circle cx="280" cy="230" r="6" style="fill:var(--warn)"/>
  <text x="200" y="26" text-anchor="middle" class="s-sub">A records 100</text>
  <text x="372" y="172" class="s-sub">B records 70</text>
  <text x="292" y="252" class="s-sub">C records 100</text>
  <text x="300" y="96" class="s-sub" style="fill:var(--accent)">+$30 → log on B→A</text>
  <text x="520" y="52" text-anchor="middle" class="s-sub" style="fill:var(--violet)">B's marker: stop logging B→A</text>
  <rect x="598" y="92" width="146" height="124" rx="9" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="671" y="113" text-anchor="middle" class="s-label">snapshot</text>
  <text x="612" y="136" class="s-mono">A</text><text x="730" y="136" text-anchor="end" class="s-mono">100</text>
  <text x="612" y="154" class="s-mono">B</text><text x="730" y="154" text-anchor="end" class="s-mono">70</text>
  <text x="612" y="172" class="s-mono">C</text><text x="730" y="172" text-anchor="end" class="s-mono">100</text>
  <text x="612" y="190" class="s-mono" style="fill:var(--accent)">B→A</text><text x="730" y="190" text-anchor="end" class="s-mono" style="fill:var(--accent)">30</text>
  <text x="612" y="208" class="s-mono" style="fill:var(--good)">total</text><text x="730" y="208" text-anchor="end" class="s-mono" style="fill:var(--good)">300</text>
  <line x1="70" y1="284" x2="96" y2="284" style="stroke:var(--accent)" stroke-width="1.8"/><text x="102" y="288" class="s-sub">money</text>
  <line x1="160" y1="284" x2="186" y2="284" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6"/><text x="192" y="288" class="s-sub">marker</text>
  <line x1="256" y1="284" x2="282" y2="284" style="stroke:var(--warn);stroke-dasharray:6 5" stroke-width="2"/><text x="288" y="288" class="s-sub">consistent cut</text>
  <circle cx="392" cy="284" r="5" style="fill:var(--warn)"/><text x="402" y="288" class="s-sub">state recorded</text>
  <text x="570" y="288" text-anchor="end" class="s-sub">time →</text>
</svg>` },

    { t: "callout", kind: "trap", title: "Chandy-Lamport assumes FIFO channels",
      body: [
        { t: "p", text: "The marker works as a dividing line only because nothing sent after it can overtake it. Remove FIFO ordering from the simulation — let each message on a channel take its own random delay — and the snapshot total was right in only **109 of 1,000** runs, ranging from 216 to 385: money sent after the sender recorded slipped in ahead of the marker and was counted twice." },
        { t: "p", text: "TCP connections are FIFO, so one connection per channel is fine. Retries over new connections, multiple connections per peer, or a queue that redelivers out of order are not — if you build this yourself, number the messages or carry the snapshot ID on every message, as Lai-Yang style algorithms do." }
      ] },

    { t: "callout", kind: "insight", title: "Your stream processor already does this",
      body: [
        { t: "p", text: "Apache Flink's checkpoints are a Chandy-Lamport variant: the job manager injects **barriers** into the sources, barriers flow through the dataflow with the records, and each operator snapshots its state when the barrier passes. Operators with several inputs **align** — wait for the barrier on every input — which is the FIFO, stop-recording-on-marker rule applied to a pipeline. Restoring a checkpoint and rewinding the sources to the matching Kafka offsets is what gives the exactly-once state of 6.4. Unaligned checkpoints let barriers overtake buffered records and store those records in the checkpoint instead — the channel state, made explicit." }
      ] },

    { t: "h2", n: "03", id: "byzantine", text: "Byzantine faults",
      sub: "When nodes do not just fail, but lie" },

    { t: "p", text: "Everything so far in this module assumed nodes fail **honestly**: they stop, restart, or go quiet, but whatever they do say is true. A **Byzantine** node can say anything — different things to different peers, forged votes, corrupted data — because of a bug, bit-flipping hardware, or an attacker. The name comes from Lamport's Byzantine generals problem (1982), where some generals are traitors." },

    { t: "diagram", kind: "layers", title: "Fault models, from mildest to worst",
      caption: "Each model includes the ones above it. Raft and Paxos tolerate everything except the last row; a single Byzantine node can break them, for example a leader that sends different entries to different followers.",
      items: [
        { label: "Crash-stop", sub: "a node halts and never returns", tone: "good" },
        { label: "Crash-recovery", sub: "halts, then restarts from what it saved durably", tone: "teal" },
        { label: "Omission", sub: "drops some messages it should send or receive", tone: "accent" },
        { label: "Timing", sub: "answers, but too late: pauses, slow clocks", tone: "warn" },
        { label: "Byzantine", sub: "arbitrary behaviour, including lying and equivocating", tone: "crit" }
      ] },

    { t: "p", text: "Why does lying cost so much more? With crashes, a quorum of a majority works because any two majorities share a node, and that node, being honest, will not vote for two conflicting values. With liars, the shared node might be a liar who votes for both. The quorum has to be big enough that any two quorums share **at least one honest node** — while still being small enough to reach without the f nodes that may stay silent. The simulation tries every way a lying primary can split the honest replicas between two conflicting values:" },

    { t: "code", lang: "python", title: "byzantine.py — an equivocating primary against every cluster size", code: `import itertools

def attack(n, f):
    """A traitorous primary tells some honest replicas "pay Alice" and the rest "pay Bob".
    The f traitors (primary included) then vote for whatever each honest replica was told.
    An honest replica commits once it holds a quorum of matching votes, its own included.
    The quorum is n - f: the most a replica can wait for, since f traitors may stay silent."""
    honest, quorum = n - f, n - f
    worst = None
    for told in itertools.product("AB", repeat=honest):          # every way to split the honest
        committed = set()
        for value in told:
            votes = told.count(value) + f                         # honest who agree, plus all traitors
            if votes >= quorum: committed.add(value)
        if len(committed) == 2:
            worst = "Alice ×%d, Bob ×%d" % (told.count("A"), told.count("B")); break
    return quorum, worst

print("%3s %6s %8s   %s" % ("f", "nodes", "quorum", "a lying primary splits the honest replicas ..."))
for f in (1, 2, 3):
    for n in sorted({2 * f + 1, 3 * f, 3 * f + 1}):
        q, worst = attack(n, f)
        verdict = ("told %s: honest replicas commit BOTH" % worst) if worst else "no split works: at most one value commits"
        print("%3d %6d %8d   %s" % (f, n, q, verdict))`,
      hl: [12, 13, 14],
      out: `  f  nodes   quorum   a lying primary splits the honest replicas ...
  1      3        2   told Alice ×1, Bob ×1: honest replicas commit BOTH
  1      4        3   no split works: at most one value commits
  2      5        3   told Alice ×2, Bob ×1: honest replicas commit BOTH
  2      6        4   told Alice ×2, Bob ×2: honest replicas commit BOTH
  2      7        5   no split works: at most one value commits
  3      7        4   told Alice ×3, Bob ×1: honest replicas commit BOTH
  3      9        6   told Alice ×3, Bob ×3: honest replicas commit BOTH
  3     10        7   no split works: at most one value commits` },

    { t: "viz", title: "Why 3f + 1: where two quorums overlap",
      caption: "Left: with 3 nodes and one traitor T, the quorum is 2. H1 and T form a quorum for Alice, H2 and T one for Bob, and they overlap only in T, who voted for both. Right: with 4 nodes the quorum is 3, any two quorums share two nodes, and at least one of them is honest and votes only once — so Bob, with two votes, can never commit.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="Byzantine quorum overlap">
  <text x="185" y="22" text-anchor="middle" class="s-label" style="fill:var(--crit)">3 nodes, f = 1: quorum 2</text>
  <text x="575" y="22" text-anchor="middle" class="s-label" style="fill:var(--good)">4 nodes, f = 1: quorum 3</text>
  <rect x="44" y="72" width="180" height="76" rx="12" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)" stroke-width="1.5"/>
  <rect x="146" y="82" width="180" height="76" rx="12" style="fill:var(--violet);fill-opacity:.08;stroke:var(--violet)" stroke-width="1.5"/>
  <text x="70" y="64" class="s-sub" style="fill:var(--accent)">Alice quorum</text>
  <text x="300" y="174" text-anchor="end" class="s-sub" style="fill:var(--violet)">Bob quorum</text>
  <circle cx="80" cy="115" r="22" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="80" y="120" text-anchor="middle" class="s-label">H1</text>
  <circle cx="185" cy="115" r="22" class="s-fill" style="stroke:var(--crit)" stroke-width="2"/><text x="185" y="120" text-anchor="middle" class="s-label" style="fill:var(--crit)">T</text>
  <circle cx="290" cy="115" r="22" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="290" y="120" text-anchor="middle" class="s-label">H2</text>
  <text x="185" y="198" text-anchor="middle" class="s-sub">the quorums overlap only in T, who voted for both</text>
  <text x="185" y="218" text-anchor="middle" class="s-sub" style="fill:var(--crit)">H1 commits "pay Alice", H2 commits "pay Bob"</text>
  <line x1="380" y1="34" x2="380" y2="224" style="stroke:var(--line);stroke-dasharray:4 4"/>
  <rect x="408" y="72" width="226" height="76" rx="12" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)" stroke-width="1.5"/>
  <rect x="572" y="82" width="152" height="76" rx="12" style="fill:none;stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.5"/>
  <text x="420" y="64" class="s-sub" style="fill:var(--accent)">Alice quorum: 3 votes</text>
  <text x="720" y="174" text-anchor="end" class="s-sub" style="fill:var(--violet)">Bob: 2 of 3, never commits</text>
  <circle cx="440" cy="115" r="22" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="440" y="120" text-anchor="middle" class="s-label">H1</text>
  <circle cx="520" cy="115" r="22" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="520" y="120" text-anchor="middle" class="s-label">H2</text>
  <circle cx="602" cy="115" r="22" class="s-fill" style="stroke:var(--crit)" stroke-width="2"/><text x="602" y="120" text-anchor="middle" class="s-label" style="fill:var(--crit)">T</text>
  <circle cx="690" cy="115" r="22" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/><text x="690" y="120" text-anchor="middle" class="s-label">H3</text>
  <text x="575" y="198" text-anchor="middle" class="s-sub">any two quorums of 3 share 2 nodes, at least one honest</text>
  <text x="575" y="218" text-anchor="middle" class="s-sub" style="fill:var(--good)">at most one value can ever commit</text>
</svg>` },

    { t: "p", text: "The algebra matches the table. With n nodes and f liars, a quorum q can be at most **n − f**, or the honest nodes alone could never reach it. Two quorums overlap in at least **2q − n** nodes, and that overlap must hold more than f nodes so one is honest: 2(n − f) − n > f, which gives **n > 3f**, so **n = 3f + 1**. Crash faults need only a non-empty overlap, 2(n − f) − n > 0, which gives **n = 2f + 1**." },

    { t: "diagram", kind: "steps", title: "PBFT: three phases to agree despite liars",
      caption: "Practical Byzantine Fault Tolerance (Castro and Liskov, 1999). Messages are signed or authenticated, so a liar cannot forge someone else's vote. Every replica talks to every other in two phases, so traffic grows as n² per request — which keeps PBFT-style groups small, typically 4 to a few dozen nodes. If the primary is caught equivocating or goes quiet, a view change elects the next one.",
      items: [
        { label: "Pre-prepare", desc: "The primary assigns the request a sequence number and sends it to all replicas.", tone: "accent" },
        { label: "Prepare", desc: "Every replica broadcasts PREPARE; 2f + 1 matching means no rival proposal can win this slot.", tone: "violet" },
        { label: "Commit", desc: "Every replica broadcasts COMMIT; 2f + 1 commits mean the order survives a change of primary.", tone: "warn" },
        { label: "Reply", desc: "Replicas execute and answer the client, which waits for f + 1 matching replies, since at most f can lie.", tone: "good" }
      ] },

    { t: "diagram", kind: "matrix", title: "Crash tolerance or Byzantine tolerance",
      cols: ["Nodes for f faults", "Quorum", "Messages per decision", "Typical home"],
      rows: ["Crash (Raft, Paxos)", "Byzantine (PBFT, HotStuff)"],
      cells: [
        [{ text: "2f + 1", tone: "good" }, { text: "f + 1 (majority)", tone: "good" }, { text: "≈ n", tone: "good" }, { text: "etcd, databases" }],
        [{ text: "3f + 1", tone: "warn" }, { text: "2f + 1", tone: "warn" }, { text: "≈ n² (PBFT)", tone: "crit" }, { text: "blockchains, ledgers" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "Inside your own data centre, you rarely pay for BFT",
      body: [
        { t: "p", text: "When you operate every node, the realistic Byzantine-like faults are **corruption** and **bugs**, not malice, and cheaper defences cover most of them: checksums on disk blocks and network payloads (8.1's silent-corruption cases), authenticated connections (mTLS) so no outsider can inject messages, and running consensus on a small, well-tested group. BFT earns its 3f + 1 nodes and n² messages where participants do not trust each other — public and consortium blockchains, cross-organisation settlement — or where a wrong answer is catastrophic and hardware faults are expected, such as flight control." }
      ] },

    { t: "exercise", kind: "Challenge", title: "A stock counter that cannot oversell",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "Ten units of a product are replicated to an EU and a US region as a PN-counter. A partition separates the regions, and each receives 8 orders; a region sells if its local count is at least 1. Show how many units are sold and what the stock reads after the partition heals. Then add **escrow**: give each region the right to spend 5 units, and show the same partitioned sale again." }
      ],
      requirements: [
        "A PN-counter with per-replica increment and decrement maps, merged by max per slot",
        "Sell only when the local value is at least 1",
        "A bounded counter that refuses a decrement beyond that replica's granted rights",
        "Run both through the same partitioned sale and print units sold and final stock"
      ],
      hint: "The PN-counter converges correctly; the problem is that each region checked a value that was already stale. Escrow turns a global invariant into two local ones: if EU never spends more than 5 and US never more than 5, the total never exceeds 10.",
      solution: { lang: "python", title: "bounded_ex.py",
        code: `class PNCounter:
    """Two grow-only maps, increments and decrements per replica; value = P - N."""
    def __init__(self, me): self.me, self.p, self.n = me, {}, {}
    def inc(self, k=1): self.p[self.me] = self.p.get(self.me, 0) + k
    def dec(self, k=1): self.n[self.me] = self.n.get(self.me, 0) + k; return True
    def merge(self, o):
        for mine, theirs in ((self.p, o.p), (self.n, o.n)):
            for r, v in theirs.items(): mine[r] = max(mine.get(r, 0), v)
    def value(self): return sum(self.p.values()) - sum(self.n.values())

class BoundedCounter(PNCounter):
    """A PN-counter plus escrow: each replica may only spend the units it was granted."""
    def __init__(self, me, rights): super().__init__(me); self.rights = rights
    def dec(self, k=1):
        if self.rights[self.me] - self.n.get(self.me, 0) < k:
            return False                                      # local stock spent: refuse (or ask a peer)
        return super().dec(k)

def sell(stock, orders):
    return sum(1 for _ in range(orders) if stock.value() >= 1 and stock.dec())

def partitioned_sale(make):
    eu, us = make("EU"), make("US")
    eu.inc(10); us.merge(eu)                                  # 10 units, both regions agree
    a, b = sell(eu, 8), sell(us, 8)                           # partitioned: 8 orders arrive in each
    eu.merge(us); us.merge(eu)                                # the partition heals
    print("  EU sold %d, US sold %d: %2d sold of 10, stock after sync = %d" % (a, b, a + b, eu.value()))

print("PN-counter, check the local value then decrement:")
partitioned_sale(PNCounter)
print("bounded counter, rights split 5 / 5:")
partitioned_sale(lambda me: BoundedCounter(me, {"EU": 5, "US": 5}))`,
        out: `PN-counter, check the local value then decrement:
  EU sold 8, US sold 8: 16 sold of 10, stock after sync = -6
bounded counter, rights split 5 / 5:
  EU sold 5, US sold 5: 10 sold of 10, stock after sync = 0`,
        notes: [
          { t: "p", text: "The PN-counter sold 16 of 10 units and converged, correctly, on −6. Every merge was right; the decision to sell was made against a local copy that could not see the other region's sales. This is the limit of any coordination-free design: it can count anything, but it cannot enforce a threshold." },
          { t: "p", text: "The bounded counter sold exactly 10, because each region could only spend its own five. The cost is that a region can run dry while the other still has stock — then it must ask its peer to transfer some rights, a message to one replica rather than a global consensus round. Production versions (the bounded counter of the Antidote database, and escrow schemes in inventory systems) rebalance rights in the background, and route the very last units through a single region." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: an active-active flash sale that sold 1,400 of 1,000",
      body: [
        { t: "p", text: "**Symptom.** A retailer ran its inventory service active-active in three regions so that checkout never waited on another continent. During a flash sale of 1,000 consoles, 1,400 orders were confirmed. Every region's counter agreed, afterwards, that stock was −400." },
        { t: "p", text: "**Mechanism.** Stock was a replicated counter whose decrements merged correctly, but each region checked its local value before decrementing. Under load, replication lag between regions was a few hundred milliseconds — long enough for each region to sell units the others had already sold. The data structure converged; the invariant was never protected." },
        { t: "p", text: "**Fix.** Each region received an escrow of units in proportion to its expected demand, and could sell only from its own allocation. A background job moved unused allocation to regions running low, and the final 5% of every item was held by one home region whose decrements went through a consensus-backed store. Views, likes and analytics counters stayed as plain CRDTs, because nobody minds if those are briefly inconsistent." }
      ] }
  ],

  takeaways: [
    "A **CRDT** lets replicas update independently and always converge, because its merge is **commutative, associative and idempotent**.",
    "Measured: three replicas' likes merged in every order with repeats — a plain number gave **5** (max) or **13 to 28** (sum); a **G-Counter** gave **10** every time.",
    "An **OR-Set** tags each add and removes only tags it has seen, so a concurrent add and remove resolves as **add wins**.",
    "**State-based** CRDTs ship whole states and survive any network; **operation-based** ones ship small operations but need reliable, causal delivery.",
    "CRDTs guarantee agreement, **not invariants**: measured, a PN-counter sold **16 of 10** units across a partition; **escrow** of 5 rights per region sold exactly 10.",
    "A **consistent cut** is a set of node states where nothing is received before it was sent; messages crossing the cut are **channel state**.",
    "**Chandy-Lamport** finds one with markers and no pause: measured, **1,000 of 1,000** snapshots totalled 300, against **7 of 1,000** by asking each node.",
    "It depends on **FIFO channels**: without them, only **109 of 1,000** snapshots were right.",
    "**Flink checkpoints** are Chandy-Lamport with barriers, and are what make its exactly-once state possible.",
    "**Byzantine** nodes can lie; tolerating f of them needs **3f + 1** nodes and quorums of **2f + 1**, against 2f + 1 nodes for crashes.",
    "Use BFT where participants do not trust each other; inside one organisation, **checksums, mTLS and small consensus groups** handle most Byzantine-like faults."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why can a G-Counter's state be merged with max per slot, while a single shared number cannot?",
        options: ["Max is faster to compute than addition", "Each replica writes only its own slot, so max per slot never loses another replica's increments and ignores repeated deliveries", "A G-Counter uses timestamps to choose the latest value", "A G-Counter needs a leader to order increments"],
        answer: 1,
        why: "Each slot has one writer and only grows, so its largest value is its latest one, and max is order-free and repeat-safe. On a single number, max keeps one replica's count and loses the rest. A G-Counter has no timestamps and no leader; speed has nothing to do with it." },

      { stem: "Two regions share 10 units of stock as a PN-counter. During a partition, each checks its local value and sells 8. What happens when the partition heals?",
        options: ["The merge detects the conflict and cancels 6 orders", "The replicas disagree forever", "Both replicas converge on −6: the counter is correct, but the invariant was broken", "The CRDT refuses the sales during the partition"],
        answer: 2,
        why: "The PN-counter merges correctly to 10 − 16 = −6. CRDTs guarantee convergence, not business rules, and have no mechanism to cancel orders or refuse local operations. Protecting a threshold needs coordination or escrow." },

      { stem: "In Chandy-Lamport, a node has recorded its state and is recording channel C→N. A money message arrives on C→N before C's marker does. What happens to it?",
        options: ["It is dropped", "It is added to the node's recorded state", "It is logged as the state of channel C→N: it was sent before C recorded, and was in flight at the cut", "It triggers a new snapshot"],
        answer: 2,
        why: "On a FIFO channel, anything arriving before C's marker was sent before C recorded, so it belongs to the snapshot but is not in either node's recorded state; it is the channel's state. Adding it to the node's already-recorded state would change a recorded value, and dropping it would lose money from the total." },

      { stem: "Why does tolerating one Byzantine node need four replicas, when tolerating one crash needs only three?",
        options: ["Byzantine nodes are slower, so more replicas are needed for throughput", "Any two quorums must overlap in at least one honest node; with 3 nodes and a quorum of 2, the overlap can be just the liar, who votes for both values", "Four is the smallest number that works with signatures", "Byzantine tolerance requires an even number of replicas"],
        answer: 1,
        why: "With crashes, a one-node overlap is enough because the shared node is honest. A liar in the overlap can vote both ways, so the overlap must exceed f, giving n = 3f + 1 — four for f = 1. It is about safety, not throughput; signatures prevent forgery but not equivocation; and the bound has nothing to do with parity." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "These are the questions that test whether you know where coordination is needed.",
    questions: [
      { level: "core",
        q: "What is a CRDT, and when would you choose one over consensus?",
        strong: "A strong answer names the merge properties, gives fitting examples, and states what CRDTs cannot do.",
        answer: [
          { t: "p", text: "A conflict-free replicated data type lets every replica accept updates locally and merge with others in any order, with repeats, and still converge — because its merge is commutative, associative and idempotent. Examples: a G-Counter with one slot per replica, an OR-Set where add wins over a concurrent remove, sequence CRDTs for collaborative text." },
          { t: "p", text: "Choose one when availability and local latency matter more than a single up-to-date answer, and when any interleaving of operations is acceptable: counters, likes, carts, presence, offline editing, multi-region writes. Choose consensus when an invariant spans replicas — uniqueness, stock that must not go negative, balances — because a CRDT can only check its local, possibly stale copy. A common design uses both, or escrow to make the invariant local." }
        ] },

      { level: "advanced",
        q: "How would you take a consistent checkpoint of a running distributed system without stopping it?",
        strong: "A strong answer explains consistent cuts, Chandy-Lamport's markers, the FIFO assumption and a production example.",
        answer: [
          { t: "p", text: "I need a consistent cut: per-node states such that every message received before the cut was sent before it, plus the messages in flight across it. Chandy-Lamport gets one without pausing: the initiator records its state and sends a marker on every outgoing channel; a node receiving its first marker records its state and forwards markers; messages arriving on a channel after the receiver recorded but before that channel's marker are recorded as channel state." },
          { t: "p", text: "It relies on FIFO channels, so a marker cannot be overtaken. Flink's checkpointing is the production form: barriers injected at the sources flow with the records, operators snapshot state as barriers pass and align on multiple inputs, and restoring a checkpoint while rewinding source offsets gives exactly-once state." }
        ] },

      { level: "advanced",
        q: "Why does Byzantine fault tolerance need 3f + 1 nodes, and would you use it for an internal database?",
        strong: "A strong answer derives the bound from quorum overlap and argues the cost against the threat model.",
        answer: [
          { t: "p", text: "Quorums must be reachable without the f nodes that may stay silent, so q ≤ n − f. Two quorums overlap in at least 2q − n nodes, and that overlap must contain an honest node, so it must exceed f: 2(n − f) − n > f, so n > 3f. With crashes the overlap only needs to be non-empty, so 2f + 1 suffices." },
          { t: "p", text: "For an internal database, usually not. I operate every node, so the threat is corruption and bugs rather than malice; checksums, authenticated connections and a well-tested crash-tolerant consensus group cover that at far lower cost than n² messages and a third more replicas. BFT is for mutually distrustful participants — blockchains, cross-organisation ledgers — or safety-critical systems." }
        ] }
    ]
  }
});
