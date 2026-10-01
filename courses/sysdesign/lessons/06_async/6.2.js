/* ============================================================================
   LESSON 6.2 — Pub-Sub and Event Streams
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "A work queue hands each message to one consumer and deletes it. An **event stream** — Kafka, Kinesis, Pulsar, Redpanda — is a different idea: an **append-only log** that keeps every message for a retention period, and that any number of independent consumer groups read at their own pace, each tracking its own position. That one change makes fan-out, replay and late-joining consumers free. It comes with a precise ordering rule that designs must respect: **order is guaranteed within a partition, and only there** — so the message key you choose decides what stays in order.",

  objectives: [
    "Distinguish a work queue, pub-sub and a log-based event stream",
    "Explain topics, partitions, offsets and consumer groups, and what each controls",
    "Show why ordering holds only within a partition, and choose a key that preserves the order you need",
    "Choose a partition count from throughput and consumer parallelism",
    "Use retention and offset reset to replay events safely"
  ],

  prerequisites: ["6.1", "4.2"],

  blocks: [

    { t: "h2", n: "01", id: "models", text: "Queue, pub-sub, log",
      sub: "Who receives a message, and whether it survives being read" },

    { t: "diagram", kind: "compare", title: "Three messaging models",
      caption: "A log subsumes the other two: one consumer group reading a topic behaves like a work queue (each message to one member), and several groups behave like pub-sub (each group gets every message) — with replay on top.",
      columns: [
        { title: "Work queue", tone: "accent", items: [
          "each message to exactly one consumer",
          "deleted once acknowledged",
          "consumers compete for work",
          "SQS, RabbitMQ queues"
        ] },
        { title: "Pub-sub", tone: "violet", items: [
          "each message to every subscriber",
          "gone if a subscriber was offline",
          "fan-out of notifications",
          "SNS, Redis pub/sub, RabbitMQ fanout"
        ] },
        { title: "Log (event stream)", tone: "good", items: [
          "each message to every consumer group",
          "kept until retention expires",
          "each group tracks its own offset",
          "Kafka, Kinesis, Pulsar, Redpanda"
        ] }
      ] },

    { t: "viz", title: "A topic, its partitions and two consumer groups",
      caption: "Each partition is an ordered, append-only sequence numbered by offset. Producers append; the key decides the partition. Each consumer group records, per partition, how far it has read. Billing and analytics read the same events independently — one nearly current, one far behind — and neither affects the other.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="A partitioned log with two consumer groups">
<defs><marker id="lg-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<text x="16" y="24" class="s-label">topic: orders</text>
<text x="138" y="58" text-anchor="end" class="s-label">partition 0</text>
<rect x="150" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="166.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">0</text>
<rect x="184" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="200.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">1</text>
<rect x="218" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="234.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">2</text>
<rect x="252" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="268.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">3</text>
<rect x="286" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="302.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">4</text>
<rect x="320" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="336.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">5</text>
<rect x="354" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="370.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">6</text>
<rect x="388" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="404.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">7</text>
<rect x="422" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="438.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">8</text>
<rect x="456" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="472.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">9</text>
<rect x="490" y="40" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="506.0" y="57" text-anchor="middle" class="s-mono" style="font-size:10px">10</text>
<rect x="524" y="40" width="31" height="26" rx="4" style="fill:none;stroke:var(--line);stroke-dasharray:3 3"/>
<line x1="420" y1="34" x2="420" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<line x1="250" y1="34" x2="250" y2="72" style="stroke:var(--violet)" stroke-width="2.4"/>
<line x1="554" y1="53.0" x2="528" y2="53.0" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#lg-a)"/>
<text x="138" y="100" text-anchor="end" class="s-label">partition 1</text>
<rect x="150" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="166.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">0</text>
<rect x="184" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="200.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">1</text>
<rect x="218" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="234.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">2</text>
<rect x="252" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="268.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">3</text>
<rect x="286" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="302.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">4</text>
<rect x="320" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="336.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">5</text>
<rect x="354" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="370.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">6</text>
<rect x="388" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="404.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">7</text>
<rect x="422" y="82" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="438.0" y="99" text-anchor="middle" class="s-mono" style="font-size:10px">8</text>
<rect x="456" y="82" width="31" height="26" rx="4" style="fill:none;stroke:var(--line);stroke-dasharray:3 3"/>
<rect x="490" y="82" width="31" height="26" rx="4" style="fill:none;stroke:var(--line);stroke-dasharray:3 3"/>
<rect x="524" y="82" width="31" height="26" rx="4" style="fill:none;stroke:var(--line);stroke-dasharray:3 3"/>
<line x1="454" y1="76" x2="454" y2="114" style="stroke:var(--good)" stroke-width="2.4"/>
<line x1="318" y1="76" x2="318" y2="114" style="stroke:var(--violet)" stroke-width="2.4"/>
<line x1="486" y1="95.0" x2="460" y2="95.0" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#lg-a)"/>
<text x="138" y="142" text-anchor="end" class="s-label">partition 2</text>
<rect x="150" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="166.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">0</text>
<rect x="184" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="200.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">1</text>
<rect x="218" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="234.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">2</text>
<rect x="252" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="268.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">3</text>
<rect x="286" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="302.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">4</text>
<rect x="320" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="336.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">5</text>
<rect x="354" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="370.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">6</text>
<rect x="388" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="404.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">7</text>
<rect x="422" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="438.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">8</text>
<rect x="456" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="472.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">9</text>
<rect x="490" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="506.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">10</text>
<rect x="524" y="124" width="31" height="26" rx="4" class="s-fill s-stroke"/>
<text x="540.0" y="141" text-anchor="middle" class="s-mono" style="font-size:10px">11</text>
<line x1="488" y1="118" x2="488" y2="156" style="stroke:var(--good)" stroke-width="2.4"/>
<line x1="216" y1="118" x2="216" y2="156" style="stroke:var(--violet)" stroke-width="2.4"/>
<line x1="588" y1="137.0" x2="562" y2="137.0" style="stroke:var(--warn)" stroke-width="1.6" marker-end="url(#lg-a)"/>
<text x="598" y="100" class="s-sub" style="fill:var(--warn)">producers append</text>
<text x="598" y="116" class="s-sub" style="fill:var(--warn)">key → partition</text>
<line x1="150" y1="174" x2="172" y2="174" style="stroke:var(--good)" stroke-width="2.4"/><text x="180" y="178" class="s-sub">billing group: committed offsets — nearly caught up</text>
<line x1="150" y1="194" x2="172" y2="194" style="stroke:var(--violet)" stroke-width="2.4"/><text x="180" y="198" class="s-sub">analytics group: same events, its own offsets — far behind, and that is fine</text>
<text x="150" y="222" class="s-sub">messages stay after reading (until retention), so a group can rewind its offset and replay</text>
</svg>` },

    { t: "dl", items: [
      ["Topic", "A named stream of events of one kind — `orders`, `payments`, `page-views`."],
      ["Partition", "A topic is split into partitions for throughput: each is an ordered log on one broker (replicated to others for durability), and partitions are written and read in parallel."],
      ["Offset", "A message's position in its partition. Consumers commit the offset they have processed up to; after a restart they resume from it."],
      ["Consumer group", "A set of consumers sharing one set of offsets. Each partition is assigned to exactly one member of the group, so **a group can never have more active consumers than the topic has partitions**."]
    ] },

    { t: "h2", n: "02", id: "ordering", text: "Ordering lives in the partition",
      sub: "The key decides what stays in order" },

    { t: "p", text: "Two hundred orders each emit `created`, `paid`, `shipped` in that order, into four partitions read by consumers running at different speeds. Once with the order id as the message key, once with no key:" },

    { t: "code", lang: "python", title: "minilog.py — a partitioned log, keyed and unkeyed", code: `import random, zlib
from collections import defaultdict

class Topic:
    """A Kafka-shaped log: N append-only partitions; messages are kept, not deleted."""
    def __init__(self, partitions): self.parts = [[] for _ in range(partitions)]
    def publish(self, key, value, rr=[0]):
        if key is None:                                   # no key: spread round-robin
            p = rr[0] % len(self.parts); rr[0] += 1
        else:
            p = zlib.crc32(key.encode()) % len(self.parts) # same key -> same partition, always
        self.parts[p].append((key, value)); return p

class Group:
    """A consumer group: one committed offset per partition, shared by its members."""
    def __init__(self, topic): self.topic, self.offset = topic, defaultdict(int)
    def poll(self, partition, n):
        log = self.topic.parts[partition]; start = self.offset[partition]
        batch = log[start:start + n]; self.offset[partition] += len(batch); return batch

def run(keyed):
    rng = random.Random(4)
    t = Topic(4)
    for order in range(1, 201):                            # each order emits 3 events, in order
        for seq, ev in enumerate(("created", "paid", "shipped")):
            t.publish(f"order-{order}" if keyed else None, (order, seq, ev))
    billing, analytics = Group(t), Group(t)               # two independent groups, same events
    seen, out_of_order = {}, 0
    speeds = [rng.randint(1, 6) for _ in range(4)]        # consumers on each partition run at different speeds
    while any(billing.offset[p] < len(t.parts[p]) for p in range(4)):
        for p in range(4):
            for _, (order, seq, ev) in billing.poll(p, speeds[p]):
                if seq < seen.get(order, -1): out_of_order += 1
                seen[order] = max(seen.get(order, -1), seq)
    for p in range(4): analytics.poll(p, 10_000)           # analytics reads everything too
    return [len(x) for x in t.parts], out_of_order, sum(analytics.offset.values())

for keyed in (True, False):
    sizes, ooo, an = run(keyed)
    print("%-22s partition sizes %s | events seen out of order: %3d | analytics also read %d"
          % ("keyed by order id" if keyed else "no key (round robin)", sizes, ooo, an))`,
      out: `keyed by order id      partition sizes [150, 150, 147, 153] | events seen out of order:   0 | analytics also read 600
no key (round robin)   partition sizes [150, 150, 150, 150] | events seen out of order: 247 | analytics also read 600`,
      hl: [9, 11, 33],
      caption: "Keyed by order id, all three events for an order land in one partition and are consumed in order: **zero** out-of-order events, even though partitions are consumed at different speeds. Without a key, an order's events are scattered across partitions, and a fast partition delivers `shipped` before a slow one delivers `paid` — hundreds of events processed out of order. Both runs also show the log's other property: analytics read all 600 events independently of billing." },

    { t: "callout", kind: "trap", title: "Changing the partition count reorders keys",
      body: [
        { t: "p", text: "The default partitioner is `hash(key) % partitions` — the same modulo as 4.3. Increase a topic from 12 to 24 partitions and most keys now map to a different partition. Events for order 901 written before the change sit in partition 5; events written after sit in partition 17; a consumer of 17 can process `shipped` before the consumer of 5 has processed `paid`." },
        { t: "p", text: "Choose the partition count with headroom up front (the exercise), and if it must grow, do it when consumers have drained the old partitions or migrate to a new topic. Never assume per-key ordering survives a repartition." }
      ] },

    { t: "h2", n: "03", id: "groups", text: "Parallelism, rebalancing and lag",
      sub: "Partitions are the unit of scale" },

    { t: "table",
      head: ["Consumers in the group", "With 4 partitions", "Effect"],
      rows: [
        ["1", "one consumer reads all four", "Correct, slowest"],
        ["2", "two partitions each", "Twice the throughput"],
        ["4", "one partition each", "Maximum parallelism"],
        ["8", "four busy, **four idle**", "No gain: a partition has only one reader per group"]
      ],
      caption: "When a consumer joins, leaves or stops heartbeating, the group **rebalances** — partitions are reassigned — and consumption pauses briefly. Consumers that take longer than the poll timeout to process a batch are evicted and trigger rebalances repeatedly; keep processing per poll bounded." },

    { t: "callout", kind: "insight", title: "Retention turns the log into a time machine",
      body: [
        { t: "p", text: "Because messages are kept, a consumer group can **reset its offset** — to the beginning, or to a timestamp — and reprocess. That is how a bug in a consumer is repaired (fix it, rewind to before the bad deploy, replay), how a new service is bootstrapped (read the topic from the start), and how a read model is rebuilt (10.4). It is safe only if consumers are idempotent (6.3), because replay means processing events a second time." },
        { t: "p", text: "Compacted topics take this further: Kafka keeps only the latest message per key forever, so the topic is a durable, replayable table of current state — the basis of change data capture streams (6.4)." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Partition a payments event stream",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "A payments topic peaks at 60,000 events a second today; plan for three times that. The slowest consumer group processes about 4,000 events a second per instance, and a partition comfortably absorbs about 10,000 writes a second. Events for the same merchant must be processed in order. Merchant sizes follow a power law." }
      ],
      requirements: [
        "Compute the partitions needed for consumer parallelism and for write throughput, and choose a count",
        "Key by merchant id and measure the busiest partition against a fair share",
        "Compute what the largest merchant alone would need from its single partition at 3× peak",
        "Propose a key that relieves the hot partition and say exactly which ordering it gives up"
      ],
      hint: "A group's throughput is capped at partitions × per-consumer rate. And every event for one key goes to one partition, read by one consumer.",
      solution: { lang: "python", title: "partitions_ex.py",
        code: `import math, random, zlib
from collections import Counter

PEAK_EVENTS_S = 60_000          # payment events at today's peak
GROWTH = 3                      # plan for three times today's peak
PER_CONSUMER = 4_000            # events/s one consumer instance processes (the slowest group)
PER_PARTITION_WRITE = 10_000    # events/s one partition comfortably absorbs on the brokers

need_consume = math.ceil(PEAK_EVENTS_S * GROWTH / PER_CONSUMER)
need_write = math.ceil(PEAK_EVENTS_S * GROWTH / PER_PARTITION_WRITE)
partitions = max(need_consume, need_write)
print("partitions for consumer parallelism: %d, for write throughput: %d -> choose %d (round up to 48)"
      % (need_consume, need_write, partitions))
partitions = 48

rng = random.Random(7)                                   # merchants: a few giants, a long tail
merchants = rng.choices(range(1, 20_001), [1 / m ** 1.05 for m in range(1, 20_001)], k=200_000)
load = Counter(zlib.crc32(str(m).encode()) % partitions for m in merchants)
fair = len(merchants) / partitions
top_share = Counter(merchants).most_common(1)[0][1] / len(merchants)
print("key = merchant_id: busiest partition %.1fx fair share; largest merchant alone = %.1f%% of events"
      % (max(load.values()) / fair, 100 * top_share))
print("  at 3x peak that merchant needs %.0f events/s on ONE partition (consumer limit %d/s)"
      % (top_share * PEAK_EVENTS_S * GROWTH, PER_CONSUMER))
customer = [rng.randrange(1_000_000) for _ in merchants]          # who paid, per event
load2 = Counter(zlib.crc32(f"{m}:{c % 8}".encode()) % partitions for m, c in zip(merchants, customer))
print("key = merchant_id + (customer_id %% 8): busiest partition %.1fx fair share" % (max(load2.values()) / fair))`,
        out: `partitions for consumer parallelism: 45, for write throughput: 18 -> choose 45 (round up to 48)
key = merchant_id: busiest partition 6.2x fair share; largest merchant alone = 11.9% of events
  at 3x peak that merchant needs 21408 events/s on ONE partition (consumer limit 4000/s)
key = merchant_id + (customer_id % 8): busiest partition 1.8x fair share`,
        notes: [
          { t: "p", text: "Consumer parallelism, not broker throughput, sets the count here: 180,000 events a second at 4,000 per consumer needs at least 45 partitions, so 48 with room. Partition count is hard to change later without breaking key ordering, which is why it is sized for the planned peak, not today's." },
          { t: "p", text: "Keying by merchant puts the largest merchant — over a tenth of all events — on one partition read by one consumer: about five times what a consumer can process at the planned peak. No partition count fixes that; one key can only ever use one partition (the hot-key problem of 3.4 and 4.2, again)." },
          { t: "p", text: "Keying by `merchant_id + (customer_id % 8)` spreads each merchant over up to eight partitions. What it gives up is **merchant-wide** ordering; what it keeps is ordering **per merchant–customer pair**, which is what payment correctness actually needs — a customer's charge before its refund. Choosing a key is choosing the narrowest ordering the business requires." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: refunds applied before the charges they refunded",
      body: [
        { t: "p", text: "**Symptom.** A ledger service consuming payment events began showing negative balances for a few hundred customers per day. Each case was a refund recorded before its charge; the next morning's batch reconciliation corrected them, but customers saw the negative balance in the app overnight." },
        { t: "p", text: "**Mechanism.** A new producer library had been rolled out that did not set a message key, so payment events were spread round-robin across 32 partitions. A charge and its refund issued seconds apart landed in different partitions; whenever the refund's partition was consumed faster, the ledger saw them in the wrong order — the unkeyed half of section 02's measurement, in production." },
        { t: "p", text: "**Fix.** The key was restored as the customer account id; a producer-side check now rejects unkeyed messages on topics that require ordering; and the ledger consumer defensively parks any refund whose charge it has not yet seen and retries it shortly after. Ordering in a log is a property you configure per message, and it was one missing argument away from not existing." }
      ] }
  ],

  takeaways: [
    "A **work queue** delivers each message to one consumer and deletes it; **pub-sub** delivers to every subscriber; a **log** keeps messages and lets every consumer group read independently.",
    "A **topic** is split into **partitions**; each message has an **offset**; each **consumer group** commits its own offsets.",
    "**Ordering is guaranteed only within a partition.** Measured: keyed by order id, zero events out of order; with no key, hundreds.",
    "Choose the key as the **narrowest unit that needs ordering** — an account, an order — not the widest.",
    "A group has **at most one active consumer per partition**; extra consumers sit idle. Partitions are the unit of scale.",
    "**Changing the partition count remaps keys** (hash modulo N) and breaks per-key ordering across the change; size it with headroom up front.",
    "A single hot key is limited to **one partition's consumer** however many partitions there are.",
    "**Retention and offset reset** make replay, backfills and new consumers free — and require idempotent consumers.",
    "Compacted topics keep the latest message per key: a replayable table of current state."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A topic has 6 partitions. A consumer group runs 10 consumers. How many process messages at once?",
        options: ["10", "6", "1", "60"],
        answer: 1,
        why: "Each partition is assigned to exactly one member of a group, so at most six consumers have work; the other four are idle standbys. Ten would require ten partitions, one is the single-consumer case, and sixty has no meaning in this model." },

      { stem: "Events for an order — created, paid, shipped — are published without a key to a 12-partition topic. What can happen?",
        options: ["Nothing; Kafka preserves global order", "They land in different partitions and can be consumed out of order", "They are rejected", "They are deduplicated"],
        answer: 1,
        why: "Without a key the producer spreads messages across partitions, and order holds only within one partition, so a faster partition can deliver shipped before paid — the unkeyed run measured hundreds of such cases. Kafka never guarantees order across partitions, unkeyed messages are accepted, and nothing deduplicates them." },

      { stem: "What does keeping messages after consumption make possible that a work queue does not?",
        options: ["Lower latency", "Several independent consumer groups, and rewinding an offset to replay events", "Exactly-once delivery by default", "Unlimited ordering across partitions"],
        answer: 1,
        why: "Because the log retains events, each group reads at its own pace from its own offsets, and a group can reset to an earlier offset to reprocess after a bug or to build a new read model. Retention does not lower latency or provide exactly-once delivery by itself, and ordering remains per partition." },

      { stem: "A topic's partition count is doubled from 16 to 32 while traffic is flowing. What risk does this create?",
        options: ["Messages are lost", "Keys map to different partitions, so a key's new events can be consumed before its older events in the old partition", "Consumers stop", "Retention resets"],
        answer: 1,
        why: "The default partitioner is hash(key) modulo the partition count, so most keys move to a new partition; their older events remain in the old one, and the two can be consumed in either order. No messages are lost, consumers rebalance rather than stop, and retention is unaffected." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Kafka questions are ordering questions in disguise.",
    questions: [
      { level: "core",
        q: "What is the difference between a message queue and an event stream like Kafka?",
        strong: "A strong answer contrasts delete-on-ack with retention and independent offsets, and gives use cases for each.",
        answer: [
          { t: "p", text: "A queue distributes work: each message goes to one consumer and is deleted once acknowledged. An event stream is a retained, partitioned log: messages stay for the retention period, and each consumer group tracks its own offset, so many independent consumers — billing, analytics, search indexing — read the same events at their own pace, and any of them can rewind and replay." },
          { t: "p", text: "So I use a queue for tasks — send this email, resize this image — and a log for facts other systems react to — an order was placed — especially when there will be several consumers or I want replay. The log costs more to operate and imposes partitioning decisions, which is why I would not use it as a simple task queue." }
        ] },

      { level: "advanced",
        q: "How does Kafka guarantee ordering, and how do you design for it?",
        strong: "A strong answer states per-partition ordering, ties it to keys, and covers partition count and hot keys.",
        answer: [
          { t: "p", text: "Only within a partition. So I choose the message key as the smallest entity whose events must stay in order — the account, the order, the device — because all messages with one key go to one partition and are consumed in order by one group member." },
          { t: "p", text: "Then I size partitions for the planned peak, since changing the count remaps keys and breaks ordering across the change, and I check for hot keys, because one key can only use one partition's consumer. If a key is too hot, I widen it — say merchant plus a customer bucket — and accept that ordering is now per merchant–customer pair, which is usually what correctness needs anyway." }
        ] },

      { level: "core",
        q: "How do you reprocess events after fixing a bug in a consumer?",
        strong: "A strong answer covers offset reset, idempotency and side-effect safety.",
        answer: [
          { t: "p", text: "Deploy the fix, then reset the consumer group's offsets to a point before the faulty version started — by timestamp — and let it consume again. Retention must cover that window, which is one reason to keep retention generous on important topics." },
          { t: "p", text: "It is only safe if the consumer is idempotent, because the events before the bug's effects were already processed once. External side effects — emails, payments — need idempotency keys so a replay does not repeat them; often I would replay into a dry-run mode first and compare the results." }
        ] }
    ]
  }
});
