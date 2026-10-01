/* ============================================================================
   LESSON 14.3 — Slack, Discord, Stripe and the Common Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "14.3",

  lede: "Slack and Discord both deliver messages in real time to millions of connected clients, and both learned that the hard part is not sending a message but sending the same message to many people, and reading the same data for many people at once. Stripe moves money, where the hard parts are never doing anything twice, never breaking an integration that a customer wrote years ago, and always being able to prove where every cent went. The lesson ends by stepping back across all ten companies of this module to the eight patterns nearly every one of them arrived at. Measured on the way: a gateway layer turning a 20,000-member channel's message into 40 sends instead of 8,000, request coalescing with channel-based routing turning 5,000 identical reads into 9 database queries, and a versioned API serving three generations of clients from one code path.",

  objectives: [
    "Describe Slack's real-time architecture of channel servers and gateway servers, and why it scales",
    "Explain Discord's hot-partition problem and its fix with routed request coalescing",
    "Explain Stripe's idempotency, date-based API versioning, and double-entry ledger",
    "Name the patterns that recur across large systems and the lesson where each was built",
    "Judge which of those patterns a system of your size actually needs"
  ],

  prerequisites: ["14.2", "6.3", "3.4"],

  blocks: [

    { t: "h2", n: "01", id: "slack", text: "Slack: channels, gateways and the boot problem",
      sub: "Fan out to servers, not to people" },

    { t: "diagram", kind: "flow", title: "How a Slack message reaches everyone in the channel",
      caption: "As Slack's engineers have described it, each client keeps a WebSocket to a gateway server near it. A message is written through the API to the database and handed to the channel server that owns the channel (channels are spread across channel servers by consistent hashing, 4.3). The channel server sends one copy to every gateway with a subscribed member online, and each gateway delivers to its own connected clients.",
      cols: 4,
      nodes: [
        { id: "c", label: "Sender", sub: "posts a message", tone: "accent" },
        { id: "api", label: "Web API", sub: "validate, persist", tone: "accent" },
        { id: "cs", label: "Channel server", sub: "owns this channel", tone: "violet" },
        { id: "g1", label: "Gateway A", sub: "WebSockets", tone: "teal" },
        { id: "db", label: "MySQL via Vitess", sub: "messages, channels", tone: "warn" },
        { id: "s", label: "Search index", sub: "updated asynchronously", tone: "warn" },
        { id: "g2", label: "Gateway B", sub: "WebSockets", tone: "teal" },
        { id: "m", label: "Members", sub: "online clients", tone: "good" }
      ],
      edges: [["c", "api", "send"], ["api", "db", "write"], ["api", "s", "", "dashed"], ["api", "cs", "publish"],
              ["cs", "g1", "one copy"], ["cs", "g2", "one copy"], ["g1", "m", "deliver"], ["g2", "m", "deliver"]] },

    { t: "code", lang: "python", title: "slack_fanout.py — sends from the channel server against deliveries by gateways",
      code: `import random
random.seed(67)
GATEWAYS = 40                                # servers holding users' WebSocket connections in one region
ONLINE = 0.4                                 # share of a channel's members connected right now

print(f"{'channel members':>15}{'online':>8}{'sends from the channel server':>31}{'sends by gateways':>19}")
for members in (8, 300, 20_000, 200_000):
    online = [random.randrange(GATEWAYS) for _ in range(int(members * ONLINE))]   # each online member's gateway
    print(f"{members:>15,}{len(online):>8,}{len(set(online)):>31,}{len(online):>19,}")`,
      hl: [8],
      out: `channel members  online  sends from the channel server  sends by gateways
              8       3                              3                  3
            300     120                             38                120
         20,000   8,000                             40              8,000
        200,000  80,000                             40             80,000` },

    { t: "p", text: "The work of delivering to thousands of people moves out to the gateways, which hold the connections anyway, and the channel server's work is bounded by the number of gateways — forty sends for a channel of 20,000 or 200,000. Slack's other well-documented scaling problem was the opposite direction: when a client starts, it used to download the whole workspace — every user and channel — which for the largest customers meant very large payloads and slow starts. Flannel, an edge cache near clients, let them load lazily what they need when they need it. Behind it, Slack moved its sharded MySQL onto Vitess (4.2) to shard by more than the workspace, and in 2023 described reorganising into cells per availability zone, so a sick zone can be drained in minutes (10.6)." },

    { t: "h2", n: "02", id: "discord", text: "Discord: one popular channel, many readers",
      sub: "A hot partition, and a data service that reads it once" },

    { t: "p", text: "Discord stores messages partitioned by channel and a time bucket (the design 4.2 derived). Its 2023 account of moving trillions of messages from Cassandra to ScyllaDB described the remaining problem as **hot partitions**: when a big server announces something, thousands of people open the same channel at once and all read the same partition, the nodes holding it slow down, and because queries for many channels wait on those nodes, latency rises everywhere. The fix sat above the database: data services that **coalesce** identical concurrent queries into one, with requests **routed by channel** so that all readers of a channel arrive at the same instance. An announcement burst against eight data-service instances:" },

    { t: "code", lang: "python", title: "coalesce.py — 5,000 readers of one channel, with and without routed coalescing",
      code: `import asyncio, random, zlib
random.seed(61)
INSTANCES, DB_MS = 8, 20

class Database:
    def __init__(self): self.queries, self.hot = 0, 0
    async def recent_messages(self, channel):
        self.queries += 1; self.hot += channel == "announcements"; await asyncio.sleep(DB_MS / 1000); return f"last 50 messages of {channel}"

class DataService:                 # one instance: identical concurrent reads can share a single database query
    def __init__(self, db, coalesce): self.db, self.coalesce, self.in_flight = db, coalesce, {}
    async def recent_messages(self, channel):
        if not self.coalesce: return await self.db.recent_messages(channel)
        if channel not in self.in_flight:
            self.in_flight[channel] = asyncio.ensure_future(self.db.recent_messages(channel))
            self.in_flight[channel].add_done_callback(lambda _: self.in_flight.pop(channel, None))
        return await self.in_flight[channel]

async def burst(coalesce, route):  # an announcement: 5,000 clients open one channel within 200 ms, amid normal traffic
    db = Database(); services = [DataService(db, coalesce) for _ in range(INSTANCES)]
    async def client(i, channel):
        await asyncio.sleep(random.uniform(0, 0.2))
        await services[route(i, channel)].recent_messages(channel)
    await asyncio.gather(*(client(i, "announcements") for i in range(5_000)),
                         *(client(i, f"channel-{random.randrange(2_000)}") for i in range(1_000)))
    return db.queries, db.hot

by_random = lambda i, channel: random.randrange(INSTANCES)
by_channel = lambda i, channel: zlib.crc32(channel.encode()) % INSTANCES      # every request for a channel, same instance
print(f"{'':32}{'announcements':>16}{'all queries':>16}")
for name, coalesce, route in [("no coalescing", False, by_random),
                              ("coalescing, random routing", True, by_random),
                              ("coalescing, routing by channel", True, by_channel)]:
    total, hot = asyncio.run(burst(coalesce, route))
    print(f"{name:<32}{hot:>16,}{total:>16,}")`,
      hl: [10, 14, 29],
      out: `                                   announcements     all queries
no coalescing                              5,000           6,000
coalescing, random routing                    72           1,065
coalescing, routing by channel                 9             960` },

    { t: "p", text: "Coalescing alone cut the hot channel's database reads from 5,000 to 72; routing by channel cut them to 9, because a single instance sees every request for the channel and can share one query among all of them, where random routing gave each of the eight instances its own copy. The background traffic, spread over two thousand channels, hardly changed — coalescing helps exactly where load concentrates. Together with ScyllaDB, Discord reported shrinking the cluster from 177 nodes to 72 and the p99 latency of reading historical messages from between 40 and 125 ms to 15 ms." },

    { t: "callout", kind: "insight", title: "Routing makes local optimisations global",
      body: [
        { t: "p", text: "Coalescing, caching and batching work only on requests that meet in the same place. Routing by the key — consistent hashing of the channel, the user, the tenant — makes them meet. The same idea appears in Slack's channel servers, in 3.4's request coalescing, and in sticky routing for LLM prefix caches (13.6)." }
      ] },

    { t: "h2", n: "03", id: "stripe", text: "Stripe: correctness as the product",
      sub: "Never twice, never break a client, always balance" },

    { t: "dl", items: [
      { term: "Idempotency keys", def: "Every mutating request may carry a key; the server stores the key with the result and returns that result for a retry, so a timeout never means a double charge (1.4, 6.3)." },
      { term: "A ledger in double entry", def: "Every movement of money is a transaction whose entries sum to zero, so totals always balance and every cent can be traced; reconciliation compares the ledger with banks' and card networks' records daily." },
      { term: "Careful change", def: "Online migrations in four steps — dual-write, backfill, switch reads, remove the old path — and rate limiters and load shedders in front of everything (7.3, 7.4)." },
      { term: "A disciplined monolith", def: "Much of Stripe's API long ran in a large Ruby codebase, kept healthy with strong tooling such as the Sorbet type checker it built — evidence that a monolith can scale with discipline (10.1)." }
    ] },

    { t: "p", text: "Stripe's API versioning is the least-copied and most instructive of its practices. An integration written years ago must keep working unchanged, yet the API must evolve. Each account is pinned to the API version current when it first called, identified by a date; the application builds every response in the latest shape only; and each dated change ships with a small transformation that converts the new shape back into the old one. A response is rendered for an old client by walking back through every change newer than its version:" },

    { t: "code", lang: "python", title: "versioning.py — one code path, three generations of clients",
      code: `import copy, json

# the application only ever builds the latest shape of a response...
def charge_latest():
    return {"id": "ch_1", "amount": 5000, "amount_captured": 5000, "refund_status": "partial",
            "billing": {"address": {"line1": "1 Main St", "city": "Leeds"}}}

# ...and each dated API change knows how to turn that shape back into the one before it
def undo_refund_status(c):     c["refunded"] = c.pop("refund_status") == "full"; return c
def undo_address_object(c):    a = c["billing"].pop("address"); c["billing"]["address"] = f"{a['line1']}, {a['city']}"; return c
def undo_amount_captured(c):   c.pop("amount_captured"); return c
CHANGES = [("2022-08-01", undo_amount_captured), ("2023-10-16", undo_address_object), ("2024-06-01", undo_refund_status)]

def render(resource, version):  # walk back through every change newer than the caller's pinned version
    resource = copy.deepcopy(resource)
    for date, undo in reversed(CHANGES):
        if date > version: resource = undo(resource)
    return resource

for account, pinned in [("an account created in 2021", "2021-03-15"), ("an account created in 2023", "2023-01-10"),
                        ("an account created this year", "2024-06-01")]:
    print(f"{account} (pinned to {pinned}):\\n  {json.dumps(render(charge_latest(), pinned))}")`,
      hl: [12, 14, 17],
      out: `an account created in 2021 (pinned to 2021-03-15):
  {"id": "ch_1", "amount": 5000, "billing": {"address": "1 Main St, Leeds"}, "refunded": false}
an account created in 2023 (pinned to 2023-01-10):
  {"id": "ch_1", "amount": 5000, "amount_captured": 5000, "billing": {"address": "1 Main St, Leeds"}, "refunded": false}
an account created this year (pinned to 2024-06-01):
  {"id": "ch_1", "amount": 5000, "amount_captured": 5000, "refund_status": "partial", "billing": {"address": {"line1": "1 Main St", "city": "Leeds"}}}` },

    { t: "p", text: "Three accounts received the same charge in three shapes, and none of the business logic knows that old shapes exist. A breaking change costs one small, testable function rather than a branch in every handler, and clients upgrade by changing their pinned date, one version at a time, when they choose. The same structure works for event payloads and webhooks, which are the other half of an API's contract." },

    { t: "h2", n: "04", id: "patterns", text: "The patterns they all arrived at",
      sub: "Different companies, different starting points, much the same destination" },

    { t: "table", head: ["Pattern", "Seen at", "Built in"],
      rows: [
        ["A durable log as the backbone", "LinkedIn, Uber, Netflix, Slack", "6.2, 6.4"],
        ["Caches in front of everything, with careful invalidation", "Meta, Twitter, Slack, Netflix", "3.1–3.5, 14.2"],
        ["Sharding by a well-chosen key, often behind a proxy", "YouTube (Vitess), Slack, Discord", "4.2, 4.3"],
        ["Cells and shuffle sharding to limit blast radius", "AWS, Slack", "10.6"],
        ["Idempotency and exactly-once effects", "Stripe, Uber, Amazon", "6.3"],
        ["Retrieval, ranking, re-ranking funnels", "YouTube, Netflix, Meta, LinkedIn", "13.5"],
        ["Progressive delivery and experimentation", "Netflix, Meta, nearly all", "11.5, 13.4"],
        ["Deliberate failure testing", "Netflix, Amazon", "11.6"]
      ] },

    { t: "p", text: "Two cautions come with the table. First, each company reached its pattern because a simpler design broke at its scale; the evidence is in the failure, not in the destination. Second, most of these companies also built custom infrastructure — TAO, Open Connect, Kafka, ScyllaDB migrations — because nothing off the shelf existed at their scale; for almost everyone else, an existing managed service does the job. Copy the reasoning, at your size." },

    { t: "callout", kind: "trap", title: "Designing for their scale, not yours",
      body: [
        { t: "p", text: "A team of ten adopting Netflix's microservices, Discord's custom data services and LinkedIn's event backbone on day one inherits their operating cost without their problems. Start with the simplest design that meets your requirements with headroom (15.1), know which of these patterns you will need at ten times and a hundred times your load, and keep the seams — clean module boundaries, idempotent APIs, an outbox — that make adopting them later cheap." }
      ] },

    { t: "exercise", kind: "Challenge", title: "A double-entry ledger with reconciliation",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Build the core of a payments ledger. Payments credit the merchant's balance net of a fee and the platform's fee revenue, and debit a card-clearing account for the gross amount; refunds reverse the merchant side. Posting must refuse any transaction whose entries do not sum to zero. Then reconcile the clearing account against the card network's settlement file, reporting every transaction that is missing on either side or differs in amount." }
      ],
      requirements: [
        "Use exact decimal arithmetic, never floating point, for money",
        "post() writes all legs of a transaction or none, and rejects unbalanced transactions",
        "Show that the sum of all balances is exactly zero",
        "Report reconciliation breaks: in the ledger but not settled, settled but not in the ledger, or different amounts"
      ],
      hint: "Represent debits as positive and credits as negative amounts; then \"balanced\" simply means the legs sum to zero.",
      solution: { lang: "python", title: "ledger_ex.py",
        code: `from collections import defaultdict
from decimal import Decimal as D

balances, journal = defaultdict(D), []

def post(txn_id, *legs):            # double entry: every transaction's legs must sum to zero, or nothing is written
    if sum(amount for _, amount in legs) != 0:
        raise ValueError(f"{txn_id} is unbalanced by {sum(a for _, a in legs)}")
    for account, amount in legs: balances[account] += amount
    journal.append((txn_id, legs))

# debits positive, credits negative
def payment(pid, amount, fee):
    post(pid, ("card_clearing", amount), ("merchant_balance", -(amount - fee)), ("fee_revenue", -fee))
def refund(rid, amount):
    post(rid, ("merchant_balance", amount), ("card_clearing", -amount))

payment("py_1", D("100.00"), D("3.20")); payment("py_2", D("250.00"), D("7.55")); payment("py_3", D("40.00"), D("1.46"))
refund("re_1", D("100.00"))
try:
    post("py_4", ("card_clearing", D("60.00")), ("merchant_balance", D("-58.10")))   # a bug: the fee leg is missing
except ValueError as e:
    print(f"rejected: {e}")

print("balances:", {k: str(v) for k, v in balances.items()}, "| sum:", sum(balances.values()))

# reconciliation: what the card network says it settled into our bank, against what the ledger expects
ledger_clearing = defaultdict(D)
for txn_id, legs in journal:
    for account, amount in legs:
        if account == "card_clearing": ledger_clearing[txn_id] += amount
network_file = {"py_1": D("100.00"), "py_2": D("250.00"), "re_1": D("-100.00"), "py_9": D("75.00")}  # py_3 missing
for txn_id in sorted(set(ledger_clearing) | set(network_file)):
    ours, theirs = ledger_clearing.get(txn_id), network_file.get(txn_id)
    if ours != theirs:
        print(f"break: {txn_id:<5} ledger {str(ours):>8}  network {str(theirs):>8}  -> investigate")`,
        out: `rejected: py_4 is unbalanced by 1.90
balances: {'card_clearing': '290.00', 'merchant_balance': '-277.79', 'fee_revenue': '-12.21'} | sum: 0.00
break: py_3  ledger    40.00  network     None  -> investigate
break: py_9  ledger     None  network    75.00  -> investigate`,
        notes: [
          { t: "p", text: "The posting with a missing fee leg was refused instead of silently creating money, and the balances sum to exactly zero — the property that makes every total trustworthy. Reconciliation found the two kinds of break that matter: a payment the network has not settled (it may arrive tomorrow, or may have failed) and a settlement the ledger knows nothing about (a bug, or something to investigate urgently)." },
          { t: "p", text: "Production ledgers make journal entries immutable — corrections are new, reversing transactions — and run reconciliation continuously against every external source of truth. Breaks age through statuses with owners, because an unexplained cent today is how a real loss is found next month." }
        ] } },

    { t: "callout", kind: "scenario", title: "Case: the announcement that slowed every channel",
      body: [
        { t: "p", text: "**Symptom.** In Discord's account of its Cassandra years, a burst of activity in one very large server could raise message-read latency for many unrelated channels, and the on-call team would find a handful of database nodes struggling while the rest were idle." },
        { t: "p", text: "**Mechanism.** All reads for a channel's recent messages land on the replicas holding that channel's partition. A popular announcement concentrated thousands of identical reads there within seconds; those nodes fell behind, and every other query that needed them waited too. Garbage-collection pauses and compaction backlogs on the stressed nodes made it worse." },
        { t: "p", text: "**Response.** Data services between the API and the database, routed by channel with consistent hashing, coalesce identical concurrent queries into one — coalesce.py's 5,000 reads becoming 9 — and the move to ScyllaDB removed the garbage-collection pauses. The pattern generalises: when load concentrates on a key, make the requests for that key meet in one place and do the work once." }
      ] }
  ],

  takeaways: [
    "Slack fans out to **gateways, not people**: a 20,000-member channel's message became **40 sends** from the channel server, not 8,000.",
    "Channel servers are assigned by **consistent hashing**; Flannel made clients load lazily; cells per zone limit blast radius.",
    "Discord's problem was **hot partitions**: one popular channel slowing the nodes many queries need.",
    "**Routed request coalescing**: 5,000 identical reads became **72** queries with random routing and **9** routed by channel.",
    "Routing by key is what makes local coalescing, caching and batching effective.",
    "Stripe: **idempotency keys**, a **double-entry ledger** with reconciliation, careful online migrations, and a disciplined monolith.",
    "**Date-pinned API versions** with per-change downgrade transforms served three generations of clients from one code path.",
    "Across ten companies the same patterns recur — log, caches, sharding, cells, idempotency, funnels, progressive delivery, failure testing — each adopted when something simpler broke.",
    "Copy the **reasoning at your size**, and keep the seams that make adopting a pattern later cheap."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does a gateway layer let a channel server handle very large channels?",
        options: ["Gateways compress messages", "The channel server sends one copy per gateway with members online — bounded by the number of gateways — and each gateway delivers to its own connected clients", "Gateways store messages", "Large channels are throttled"],
        answer: 1,
        why: "slack_fanout.py: 40 sends for 8,000 or 80,000 online members. Delivery work happens where the WebSockets already are." },

      { stem: "Discord added request coalescing in its data services. Why did routing requests by channel matter?",
        options: ["It encrypts traffic", "Coalescing only merges requests that reach the same instance; routing all of a channel's requests to one instance lets one query serve all of them", "It balances load evenly at random", "It reduces storage"],
        answer: 1,
        why: "Random routing left eight instances each issuing their own queries (72); routing by channel brought it to 9 for 5,000 reads." },

      { stem: "How does date-based API versioning let Stripe change its API without breaking old integrations?",
        options: ["It never changes the API", "Accounts are pinned to a version date; responses are built in the latest shape and transformed back through each newer change, so old clients see old shapes", "Old clients get errors and must upgrade", "Each version runs as separate code"],
        answer: 1,
        why: "versioning.py rendered one charge in three shapes from one code path. Each breaking change adds one small downgrade function instead of branches everywhere." },

      { stem: "Which statement best describes how to use the common patterns of large companies?",
        options: ["Adopt all of them from the start", "Understand the failure each one fixed, adopt it when your system approaches that failure, and keep seams that make adoption cheap", "Avoid them; they only apply to giants", "Copy whichever company is closest to your industry"],
        answer: 1,
        why: "Each pattern was a response to a simpler design breaking at scale. Adopting it early buys operating cost without the problem; the reasoning transfers, the timing must be yours." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Real-time and payments questions are common; anchor them in these systems' mechanisms.",
    questions: [
      { level: "advanced",
        q: "Design a chat system like Slack or Discord.",
        strong: "A strong answer separates connection handling, channel ownership, storage and fan-out, and handles hot channels.",
        answer: [
          { t: "p", text: "Clients hold WebSockets to gateway servers. Sending a message goes through an API that validates, persists it (partitioned by channel and time bucket, with a per-channel sequence number for ordering) and publishes it to the channel's owner — a channel server chosen by consistent hashing — which sends one copy to each gateway with subscribed members online. Offline members get push notifications and catch up from storage by sequence number on reconnect." },
          { t: "p", text: "Large channels and announcements create hot keys: route reads by channel to data services that coalesce identical queries and cache the recent window; rate-limit very large broadcasts. Presence is a separate, lossy service. Clients load workspace data lazily. Partition the whole stack into cells by workspace or zone to limit blast radius." }
        ] },

      { level: "advanced",
        q: "How would you design a payments API so that clients can retry safely and integrations never break?",
        strong: "A strong answer covers idempotency, the ledger, and versioning.",
        answer: [
          { t: "p", text: "Idempotency keys on every mutating request, stored with the request's fingerprint and result, returned for retries and rejected if reused with a different body; downstream calls to card networks carry their own idempotency and are reconciled. Money moves only through a double-entry ledger with immutable entries, and daily reconciliation against bank and network files." },
          { t: "p", text: "For change: only additive changes without a version bump; breaking changes as dated versions with a downgrade transform each, accounts pinned to their first version and upgraded deliberately; the same versioning for webhooks. Online migrations by dual-write, backfill, switch reads, then cleanup." }
        ] },

      { level: "core",
        q: "What patterns do large-scale systems have in common?",
        strong: "A strong answer names the patterns with the problem each solves and a caution about timing.",
        answer: [
          { t: "p", text: "A durable log as the integration backbone; caching at every layer with careful invalidation; sharding by a well-chosen key; cells to contain failures; idempotency for safe retries; multi-stage funnels for ranking; progressive delivery with experiments; and deliberate failure testing." },
          { t: "p", text: "Each was adopted because something simpler broke at that company's scale, and several required custom infrastructure that smaller systems should buy rather than build. The useful skill is knowing which pattern your next order of magnitude will need." }
        ] }
    ]
  }
});
