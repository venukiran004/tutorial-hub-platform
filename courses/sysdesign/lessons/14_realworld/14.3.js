/* ============================================================================
   LESSON 14.3 — Slack, Discord, Stripe and the Common Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "14.3",

  lede: "Chat and payments put opposite pressures on a design. Chat needs every message delivered to every connected member within a fraction of a second, and its history grows without limit. Payments need every charge to happen exactly once, even when networks lose responses and clients retry. Slack, Discord and Stripe have each published how they met these pressures. This lesson reads those accounts, measures Discord's partitioning and Stripe's idempotency, and closes the module with the patterns that recur in every large system studied here.",

  objectives: [
    "Describe a real-time messaging architecture with gateway and channel servers",
    "Explain Discord's time-bucketed partition key and its migration to ScyllaDB, and measure the trade-off",
    "Implement idempotency keys as Stripe describes them, and show why retries need them",
    "Explain Stripe's dated API versions and its dual-write migration pattern",
    "Name the patterns shared by the large systems in this module and when each applies"
  ],

  prerequisites: ["1.6", "4.2", "6.3", "10.6"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "slack",
      text: "Slack: real-time delivery",
      sub: "Persistent connections, servers per channel" },
    { t: "p",
      text: "Slack's engineering blog has described its real-time path. Clients hold a WebSocket to a **gateway server** in a nearby region. A new message is accepted by the web application, written to the database, and published to the **channel server** that owns the channel, chosen by consistent hashing. The channel server sends it to every gateway with a subscribed member, and the gateways push it down the open connections. Slack began with MySQL sharded by workspace and moved to Vitess from around 2017, as shared channels and very large organisations made 'one workspace, one shard' fit badly." },
    { t: "viz",
      title: "A real-time messaging path",
      caption: "The post is stored before it is fanned out, so a client that reconnects can fetch anything it missed from the database instead of depending on delivery.",
      svg: `<svg viewBox="0 0 760 235" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="119.5" y1="130.0" x2="230.5" y2="77.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="175.0" y="97.5" text-anchor="middle" class="s-sub">send</text>
<line x1="360.0" y1="51.0" x2="440.0" y2="51.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="329.3" y1="77.0" x2="470.7" y2="160.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="400.0" y="112.5" text-anchor="middle" class="s-sub">publish</text>
<line x1="440.0" y1="186.0" x2="360.0" y2="186.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="400.0" y="180.0" text-anchor="middle" class="s-sub">fan out</text>
<line x1="210.0" y1="175.8" x2="120.0" y2="163.5" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="165.0" y="163.6" text-anchor="middle" class="s-sub">push</text>
<rect x="10" y="130" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="65.0" y="152" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Clients</text>
<text x="65.0" y="170" text-anchor="middle" class="s-sub">desktop, mobile</text>
<rect x="210" y="25" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="285.0" y="47" text-anchor="middle" class="s-label" style="fill:var(--accent)">Web app</text>
<text x="285.0" y="65" text-anchor="middle" class="s-sub">accepts the post</text>
<rect x="440" y="25" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="515.0" y="47" text-anchor="middle" class="s-label" style="fill:var(--good)">MySQL (Vitess)</text>
<text x="515.0" y="65" text-anchor="middle" class="s-sub">store of record</text>
<rect x="440" y="160" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="515.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--violet)">Channel servers</text>
<text x="515.0" y="200" text-anchor="middle" class="s-sub">hashed by channel</text>
<rect x="210" y="160" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="285.0" y="182" text-anchor="middle" class="s-label" style="fill:var(--warn)">Gateway servers</text>
<text x="285.0" y="200" text-anchor="middle" class="s-sub">WebSockets</text>
</svg>` },
    { t: "h2",
      n: "02",
      id: "discord",
      text: "Discord: storing trillions of messages",
      sub: "The partition key decides the failure mode" },
    { t: "p",
      text: "Discord's 2017 post described moving messages from MongoDB to Cassandra with a partition key of (channel_id, bucket), where a bucket is a fixed ten-day window, so no partition grows without limit. Its 2023 post described moving from 177 Cassandra nodes to 72 ScyllaDB nodes, after years of hot partitions and garbage-collection pauses, with a Rust data-service layer that routes requests for a channel to one instance and coalesces identical concurrent reads into one query. It reported p99 read latency falling from 40–125 ms to 15 ms." },
    { t: "code",
      lang: "python",
      title: "buckets.py — partitioning a message history by channel or by channel and time",
      code: `import numpy as np
rng = np.random.default_rng(8)

# Messages per channel over three years. Activity is heavy-tailed: most channels are quiet, a few carry huge servers.
CHANNELS, DAYS = 200_000, 3 * 365
rate = rng.pareto(1.1, CHANNELS) * 0.5                          # messages per day per channel
total = rng.poisson(rate * DAYS)

# Partition key = channel: one partition holds a channel's whole history.
print("partition key = channel_id")
print(f"  largest partition {total.max():,} messages; p99.99 {np.percentile(total, 99.99):,.0f}")

# Partition key = (channel_id, 10-day bucket), as in Discord's 2017 design: every partition is bounded in time.
B = 10
sizes = []
for c in np.argsort(-total)[:2_000]:                             # the busiest channels decide the largest partitions
    days = rng.integers(0, DAYS, total[c])
    sizes.append(np.bincount(days // B).max())
print(f"partition key = (channel_id, {B}-day bucket)")
print(f"  largest partition {max(sizes):,} messages ({total.max() / max(sizes):.0f}x smaller)")

# The cost: reading the latest 50 messages walks back bucket by bucket until it has 50.
def buckets_read(n_msgs):
    days = np.sort(rng.integers(0, DAYS, n_msgs))[::-1]
    if n_msgs < 50: return (DAYS - 1) // B + 1                    # walks back through every bucket
    return ((DAYS - 1) // B - days[49] // B) + 1
sample = rng.choice(CHANNELS, 5_000, replace=False)
reads = np.array([buckets_read(total[c]) for c in sample])
for lo, hi, name in ((0, 50, "fewer than 50 messages"), (50, 1_000, "50 to 1,000"), (1_000, 10 ** 12, "over 1,000")):
    m = (total[sample] >= lo) & (total[sample] < hi)
    print(f"  channels with {name:<22} {m.mean():>6.1%} of channels, buckets read for the latest 50: median {np.median(reads[m]):.0f}")`,
      out: `partition key = channel_id
  largest partition 16,377,812 messages; p99.99 1,896,410
partition key = (channel_id, 10-day bucket)
  largest partition 150,582 messages (109x smaller)
  channels with fewer than 50 messages   8.9% of channels, buckets read for the latest 50: median 110
  channels with 50 to 1,000             59.3% of channels, buckets read for the latest 50: median 19
  channels with over 1,000              31.8% of channels, buckets read for the latest 50: median 3` },
    { t: "dl",
      items: [
        { term: "Bounded partitions",
          def: "Keyed by channel alone, the busiest channel's partition held 16.4 million messages after three years. Ten-day buckets cut the largest partition to about 150,000, 109 times smaller, which keeps compaction, repair and reads predictable." },
        { term: "The cost lands on quiet channels",
          def: "A busy channel found its latest 50 messages in a median of 3 buckets. A channel with fewer than 50 messages in total walked back through all 110 buckets. A design needs a way to skip empty buckets, such as recording each channel's last active bucket." },
        { term: "Coalescing",
          def: "When a large server is pinged, thousands of clients read the same channel at once. Routing all reads for a channel to one data-service instance lets it run the query once and give every waiting request the result, the same idea as the lease in lesson 14.2." }
      ] },
    { t: "h2",
      n: "03",
      id: "stripe",
      text: "Stripe: exactly-once charges",
      sub: "Idempotency, versions and migrations" },
    { t: "p",
      text: "A client that sends a charge and hears nothing back cannot tell whether the charge happened. Stripe's API accepts an **Idempotency-Key** header: the client generates one key per logical operation and sends it on every retry, and the server stores the result against the key and replays it for any repeat. Stripe's documentation says keys can be removed after they are at least 24 hours old, so retries must happen within that window. The exercise implements the scheme and measures it." },
    { t: "dl",
      items: [
        { term: "Dated API versions",
          def: "Stripe pins each account to the API version current at its first request, and expresses every breaking change as a small transformation between adjacent versions, so old integrations keep working while new ones get the current behaviour." },
        { term: "Online migrations",
          def: "Stripe's 2017 post described moving data between stores in four steps: write to both, move reads to the new store, stop writing to the old one, then remove it, checking agreement between them at each step." },
        { term: "Atomic phases",
          def: "A charge that calls an external card network cannot sit inside one database transaction. The key records which phase finished, so a retry resumes from the last completed phase rather than starting over." }
      ] },
    { t: "h2",
      n: "04",
      id: "patterns",
      text: "The patterns they share",
      sub: "What every system in this module ended up with" },
    { t: "table",
      head: ["Pattern", "Where it appeared", "When it applies"],
      rows: [
        [
          "Shard by the main access key",
          "Vitess at YouTube and Slack; Discord's channel buckets",
          "One machine's storage or write rate is not enough"
        ],
        ["Bound every partition", "Discord's 10-day buckets", "Keys with unbounded growth or skewed activity"],
        ["Cache with careful invalidation", "TAO, memcache leases", "Read-heavy data that changes"],
        ["A log as the integration point", "Kafka at LinkedIn", "Many systems need the same changes"],
        [
          "Precompute for the common read",
          "Twitter timelines, Netflix fills",
          "Reads vastly outnumber writes, or demand is predictable"
        ],
        ["Idempotent operations", "Stripe keys, safe retries everywhere", "Any operation that a retry could repeat"],
        [
          "Isolate failures in cells or shards",
          "Amazon cells, shuffle sharding",
          "Multi-tenant services and bad deploys"
        ],
        [
          "Split control plane from data plane",
          "Netflix; Slack's gateways",
          "Small decisions and bulk bytes have different needs"
        ]
      ] },
    { t: "callout",
      kind: "insight",
      title: "The pattern is chosen by the problem",
      body: [
        { t: "p",
          text: "Every pattern above has a cost: shards make cross-shard queries hard, precomputation multiplies writes, cells add operational overhead. Each company adopted them only when a measured problem forced it, and often after running the simpler design for years. In an interview, cite the forcing problem with the pattern, and say what you would do before reaching that scale." }
      ] },
    { t: "callout", kind: "trap", title: "Retrying a payment without an idempotency key",
      body: [
        { t: "p", text: "A client that retries a charge after a timeout cannot know whether the first attempt succeeded. Without an idempotency key, each retry can charge again." },
        { t: "p", text: "Generate an idempotency key per logical operation on the client, send it with every retry, and have the server store the result per key." }
      ] },

    { t: "exercise",
      kind: "Challenge",
      title: "Idempotency keys over a lossy network",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p",
          text: "Implement a payments endpoint backed by SQLite, and a network that loses 30% of responses after the server has acted. A client makes 1,000 payments and retries up to five times when it hears nothing. Run it without idempotency keys and with them, counting charges created and customers charged more than once. Then show the two error cases: a duplicate arriving while the first request is still running, and a key reused with different parameters." }
      ],
      requirements: [
        "A charges table and an idempotency table keyed by the client's key",
        "Key check, charge and stored response in one transaction",
        "Replay of the stored response for a repeated key",
        "409 for a request still in progress, 422 for a key reused with different parameters"
      ],
      hint: "The client must generate the key once per logical payment, before the first attempt, and reuse it on every retry. A new key per attempt is no key at all.",
      solution: { lang: "python",
        title: "idempotency.py",
        code: `import json, random, sqlite3, uuid
random.seed(9)

# A payments API over a flaky network: 30% of responses are lost after the server has committed,
# so the client cannot tell a failed charge from a successful one and retries.
db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE charges (id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
CREATE TABLE idempotency (key TEXT PRIMARY KEY, request TEXT, status TEXT, response TEXT);
""")

class LostResponse(Exception): pass

def charge(customer, amount, key=None, lossy=True):
    """The network: any response, including a replayed one, can be lost on the way back."""
    result = handle(customer, amount, key)
    if lossy and random.random() < 0.3: raise LostResponse()     # the server acted, the client never hears back
    return result

def handle(customer, amount, key):
    """Server side. With a key: the key, the charge and the stored response commit in one transaction."""
    req = json.dumps([customer, amount])
    with db:                                                     # one transaction
        if key:
            row = db.execute("SELECT request, status, response FROM idempotency WHERE key = ?", (key,)).fetchone()
            if row:
                if row[0] != req: return 422, "key reused with different parameters"
                if row[1] == "started": return 409, "request with this key in progress"
                return 200, row[2]                               # replay the original response
            db.execute("INSERT INTO idempotency VALUES (?, ?, 'started', NULL)", (key, req))
        cid = db.execute("INSERT INTO charges (customer, amount) VALUES (?, ?)", (customer, amount)).lastrowid
        resp = json.dumps({"charge": cid})
        if key: db.execute("UPDATE idempotency SET status = 'done', response = ? WHERE key = ?", (resp, key))
    return 200, resp

def client_pay(customer, amount, use_key, retries=5):
    key = str(uuid.uuid4()) if use_key else None                 # one key per logical payment, reused on every retry
    for _ in range(retries + 1):
        try: return charge(customer, amount, key)
        except LostResponse: continue
    return None, "gave up"

for use_key in (False, True):
    db.execute("DELETE FROM charges"); db.execute("DELETE FROM idempotency")
    results = [client_pay(f"cus_{i}", 1_000, use_key) for i in range(1_000)]
    n = db.execute("SELECT COUNT(*) FROM charges").fetchone()[0]
    dup = db.execute("SELECT COUNT(*) FROM (SELECT customer FROM charges GROUP BY customer HAVING COUNT(*) > 1)").fetchone()[0]
    gave_up = sum(r[0] is None for r in results)
    print(f"{'with' if use_key else 'without'} idempotency keys: 1,000 payments -> {n:,} charges, "
          f"{dup} customers charged more than once, gave up after 6 attempts: {gave_up}")

# Reusing a key with different parameters is rejected, and a concurrent duplicate sees 'in progress'.
k = str(uuid.uuid4()); db.execute("INSERT INTO idempotency VALUES (?, ?, 'started', NULL)", (k, json.dumps(["cus_x", 500])))
print("same key, request still running:", charge("cus_x", 500, k, lossy=False))
print("same key, different amount:     ", charge("cus_x", 900, k, lossy=False))`,
        out: `without idempotency keys: 1,000 payments -> 1,443 charges, 301 customers charged more than once, gave up after 6 attempts: 0
with idempotency keys: 1,000 payments -> 1,000 charges, 0 customers charged more than once, gave up after 6 attempts: 1
same key, request still running: (409, 'request with this key in progress')
same key, different amount:      (422, 'key reused with different parameters')`,
        notes: [
          { t: "p",
            text: "Without keys, 1,000 payments created 1,443 charges and 301 customers were charged more than once, close to the expected 1/0.7 attempts per payment. With keys, exactly 1,000 charges and no duplicates: each retry found the stored response and replayed it." },
          { t: "p",
            text: "One client gave up after six lost responses, yet its customer had been charged once; giving up is not the same as failing. The client should later look the payment up by its key rather than charge again. The 409 case cannot occur inside a single SQLite transaction, so the script inserts an in-progress key directly; it matters when a phase calls an external network outside the transaction, which is why Stripe records phases against the key." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: double charges after a deploy",
      body: [
        { t: "p",
          text: "**Symptom.** After a mobile release, support received complaints of duplicate charges, all from customers on poor connections." },
        { t: "p",
          text: "**Mechanism.** The new app generated the idempotency key inside the retry loop, so every attempt carried a fresh key. The server, correctly, treated each as a new payment. The old app generated it once per checkout. Tests passed because the test network never lost a response." },
        { t: "p",
          text: "**Fix.** The key is now created when the checkout screen opens and stored with the pending order, so even a retry after the app is restarted reuses it. The test suite gained a fault-injecting network that drops responses after the server commits, and the server alerts when one customer has two charges for the same amount within a minute." }
      ] }
  ],

  takeaways: [
    "Slack: WebSocket **gateways**, **channel servers** chosen by consistent hashing, and storage before fan-out so reconnects can catch up.",
    "Discord bounded partitions with **(channel_id, 10-day bucket)** and later moved from **177** Cassandra nodes to **72** ScyllaDB nodes.",
    "Measured: buckets made the largest partition **109×** smaller (16.4M to 150K messages).",
    "The cost: a quiet channel walked back through **110** buckets to find its latest messages; track the last active bucket.",
    "Coalescing identical reads for a hot channel is the lease idea again: one query, many waiters.",
    "Idempotency keys: one key per logical operation, reused on every retry, stored with the result in one transaction.",
    "Measured: without keys, 1,000 payments became **1,443** charges; with keys, exactly **1,000**.",
    "A client that gives up may still have succeeded; look the operation up by its key.",
    "Stripe: dated API versions per account, and migrations by dual write, read switch, write switch, removal.",
    "Eight patterns recur: shard, bound partitions, cache carefully, log, precompute, idempotency, cells, control/data split."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why did Discord add a time bucket to its message partition key?",
        options: [
          "To make each message ID globally unique",
          "To keep any one partition from growing without limit",
          "To store each channel's messages on a different node",
          "To let messages expire after ten days of storage"
        ],
        answer: 1,
        why: "Keyed by channel alone, a busy channel's partition grows forever: 16.4M messages in the simulation. Ten-day buckets bounded the largest at about 150K." },
      { stem: "A client retries a payment with a new idempotency key on each attempt. What happens?",
        options: [
          "The server replays the first stored response",
          "Each attempt can create a separate charge",
          "The server returns 409 for every retry",
          "The server rejects the keys as malformed"
        ],
        answer: 1,
        why: "The server can only recognise a repeat by its key; fresh keys look like new payments. The key must be created once per logical operation and reused." },
      { stem: "In the exercise, one client gave up after six lost responses. What was true of its payment?",
        options: [
          "It was never charged, so it is safe to retry",
          "It had been charged once and should be looked up",
          "It was charged six separate times, once per attempt",
          "Its idempotency key was deleted by the server"
        ],
        answer: 1,
        why: "The first attempt committed and only the response was lost. Giving up is not failure; the client should query by its key rather than start a new payment." },
      { stem: "Which recurring pattern did Netflix's appliances and Twitter's timelines share?",
        options: [
          "Sharding all data by the main access key",
          "Precomputing for the common read path",
          "Isolating tenants in separate cells",
          "Using a log as the integration point"
        ],
        answer: 1,
        why: "Both do work ahead of demand: Netflix fills caches overnight with predicted titles, and Twitter writes tweets into followers' timelines at post time." }
    ] },

  interview: { title: "In an interview",
    sub: "Name the pattern, the company that forced it, and the condition that made it right.",
    questions: [
      { level: "core",
        q: "Design a chat system like Slack or Discord.",
        strong: "A strong answer covers connections, fan-out by channel, storage with bounded partitions, catch-up and presence.",
        answer: [
          { t: "p",
            text: "Clients keep a WebSocket to a regional gateway. A message is written first, to a store partitioned by (channel, time bucket) with time-ordered IDs, then published to the server that owns the channel, which forwards it to every gateway with a subscribed member. On reconnect, a client fetches everything after its last seen ID from storage, so delivery can be best-effort." },
          { t: "p",
            text: "Large channels need coalesced reads and rate-limited fan-out; quiet channels need a pointer to their last active bucket. Presence is separate, approximate and cheap, because it changes far more often than messages." }
        ] },
      { level: "core",
        q: "How do you make a payment API safe to retry?",
        strong: "A strong answer describes idempotency keys end to end, including expiry, parameter checks and external calls.",
        answer: [
          { t: "p",
            text: "The client creates a key per logical payment and sends it on every attempt. The server, in one transaction, records the key with the request's parameters, performs the local work, and stores the response; a repeat replays the response, a repeat with different parameters is rejected, and a repeat while the first is running gets a conflict." },
          { t: "p",
            text: "Calls to external networks happen in recorded phases, so a retry resumes rather than repeats. Keys expire after a documented window, 24 hours at Stripe, and the client looks up the outcome by key if it gives up." }
        ] },
      { level: "advanced",
        q: "Which patterns do large systems converge on, and how do you decide when to adopt one?",
        strong: "A strong answer lists several patterns with their costs and ties adoption to a measured forcing problem.",
        answer: [
          { t: "p",
            text: "Sharding, bounded partitions, careful caching, a log for integration, precomputation for hot reads, idempotent operations, cell isolation and a control/data plane split. Each costs something: cross-shard queries, write amplification, operational overhead." },
          { t: "p",
            text: "I adopt one when a measurement shows the simpler design will fail within the planning horizon, for example a partition growing without bound, retries causing duplicates, or one tenant able to take down others, and I can name a real system that hit the same wall." }
        ] }
    ] }
});
