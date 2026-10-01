/* ============================================================================
   LESSON 4.2 — Sharding and Partitioning
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "Sharding splits one table's rows across several databases so that writes, storage and reads are all divided — the only technique that scales writes (4.1). Almost everything about a sharded system is decided by one choice: **the shard key**. A good key spreads load evenly *and* lets the common queries touch one shard; those two goals pull against each other, and the measurements below show each classic key winning one and losing the other. What you give up in every case is the ability to cheaply ask questions across shards — joins, global sorts, unique constraints and transactions.",

  objectives: [
    "Distinguish horizontal sharding from vertical partitioning, and each from replication",
    "Compare hash, range and directory partitioning, measured on write balance and query fan-out",
    "Choose a shard key from the dominant queries and the write distribution",
    "Detect and relieve a hot partition caused by a giant tenant or a time-ordered key",
    "Name what cross-shard operations cost, and how designs avoid them"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", id: "what", text: "Splitting the data",
      sub: "Rows across machines, or columns into tables" },

    { t: "diagram", kind: "compare", title: "Three ways to put one table on several machines",
      caption: "Only sharding divides writes. Vertical partitioning divides a wide table or a monolith's tables by function — useful, but each piece still lives on one primary. Replication copies everything and divides only reads.",
      columns: [
        { title: "Replication (4.1)", tone: "accent", items: [
          "every machine has every row",
          "divides reads",
          "every replica applies every write",
          "no change to queries"
        ] },
        { title: "Vertical partitioning", tone: "violet", items: [
          "split by column or by table",
          "orders here, users there; hot columns apart from blobs",
          "each piece still has one primary",
          "joins across pieces move to the app"
        ] },
        { title: "Horizontal sharding", tone: "good", items: [
          "split by row: each shard holds a subset",
          "divides writes, storage and reads",
          "routing by a shard key",
          "cross-shard queries become expensive"
        ] }
      ] },

    { t: "h2", n: "02", id: "strategies", text: "Hash, range and directory",
      sub: "Three ways to map a key to a shard" },

    { t: "diagram", kind: "matrix", title: "The three partitioning strategies",
      caption: "Hash spreads load and destroys order; range keeps order and concentrates whatever is new; a directory can do anything at the cost of a lookup and a component to keep available. Most real systems use hash for entities and range for time-series, often combined (hash of tenant, then range of time).",
      cols: ["Maps a key by", "Balance", "Range queries", "Resharding"],
      rows: ["Hash", "Range", "Directory (lookup)"],
      cells: [
        [{ text: "hash(key) → shard" }, { text: "even", tone: "good" }, { text: "fan out to all", tone: "crit" }, { text: "consistent hashing (4.3)", tone: "warn" }],
        [{ text: "key in [lo, hi) → shard" }, { text: "hot spots on new keys", tone: "crit" }, { text: "one or few shards", tone: "good" }, { text: "split a range", tone: "good" }],
        [{ text: "a table: key → shard" }, { text: "whatever you choose", tone: "good" }, { text: "depends", tone: "warn" }, { text: "move one entry", tone: "good" }]
      ] },

    { t: "p", text: "Ninety days of orders on eight shards, partitioned three ways. Two queries dominate an order system: a customer's order history, and the operations dashboard showing the last 24 hours:" },

    { t: "code", lang: "python", title: "shardkeys.py — the same orders under three shard keys", code: `import random, zlib
from collections import Counter, defaultdict

SHARDS, ORDERS, CUSTOMERS, DAY = 8, 200_000, 20_000, 86_400
rng = random.Random(30)
COUNTRIES = ["US"] * 40 + ["DE"] * 12 + ["GB"] * 11 + ["FR"] * 9 + ["IN"] * 8 + ["JP"] * 7 + ["BR"] * 7 + ["CA"] * 6
home = {c: rng.choice(COUNTRIES) for c in range(1, CUSTOMERS + 1)}
orders = []
for i in range(ORDERS):                                     # 90 days of orders, in time order
    c = rng.randint(1, CUSTOMERS)
    orders.append({"customer": c, "country": home[c], "ts": 1_790_000_000 + i * 90 * DAY // ORDERS})

h = lambda v: zlib.crc32(str(v).encode())
bounds = [1_790_000_000 + (i + 1) * 90 * DAY // SHARDS for i in range(SHARDS)]
STRATEGIES = {
    "hash(customer_id)": lambda o: h(o["customer"]) % SHARDS,
    "range(created_at)": lambda o: next(i for i, b in enumerate(bounds) if o["ts"] < b),
    "country":           lambda o: sorted(set(COUNTRIES)).index(o["country"]),
}
today = [o for o in orders if o["ts"] >= orders[-1]["ts"] - DAY]

print("%-18s %15s %17s %20s %22s" % ("shard key", "busiest shard", "busiest today",
      "'my orders' shards", "'last 24 h' shards"))
for name, f in STRATEGIES.items():
    load, now = Counter(map(f, orders)), Counter(map(f, today))
    per_customer = defaultdict(set)
    for o in orders: per_customer[o["customer"]].add(f(o))
    fan_mine = sum(len(s) for s in per_customer.values()) / len(per_customer)
    print("%-18s %14.1fx %16.1fx %20.1f %22d" % (name, max(load.values()) / (ORDERS / SHARDS),
          max(now.values()) / (len(today) / SHARDS), fan_mine, len(now)))`,
      out: `shard key            busiest shard     busiest today   'my orders' shards     'last 24 h' shards
hash(customer_id)             1.0x              1.1x                  1.0                      8
range(created_at)             1.0x              8.0x                  5.7                      1
country                       3.2x              3.2x                  1.0                      8`,
      hl: [16, 17, 18],
      caption: "**Hash of customer** balances perfectly and answers \"my orders\" from one shard, at the cost of the dashboard asking all eight. **Range of time** answers the dashboard from one shard and balances total storage — but **every new order lands on the newest shard**, eight times its fair share of today's writes, while seven shards sit idle. **Country** inherits the real-world skew of the business: the US shard carries over three times its share, permanently." },

    { t: "viz", title: "Where today's writes land",
      caption: "Each bar is one shard; the dashed line is a fair share. Range-by-time sends every write to one shard — the hot partition is the present. Partitioning by a business attribute inherits the business's skew.",
      svg: `<svg viewBox="0 0 760 190" width="100%" role="img"><text x="118.0" y="16" text-anchor="middle" class="s-label">hash(customer_id) — last 24 h</text>
<line x1="0.0" y1="160" x2="236.0" y2="160" style="stroke:var(--line)"/>
<rect x="2.0" y="143.7" width="25.5" height="16.3" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<rect x="31.5" y="143.1" width="25.5" height="16.9" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<rect x="61.0" y="144.6" width="25.5" height="15.4" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<rect x="90.5" y="143.6" width="25.5" height="16.4" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<rect x="120.0" y="144.3" width="25.5" height="15.7" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<rect x="149.5" y="144.8" width="25.5" height="15.2" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<rect x="179.0" y="142.3" width="25.5" height="17.7" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<rect x="208.5" y="143.6" width="25.5" height="16.4" rx="2" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<line x1="0.0" y1="143.8" x2="236.0" y2="143.8" style="stroke:var(--ink-3);stroke-dasharray:4 3"/>
<text x="118.0" y="182" text-anchor="middle" class="s-sub">busiest = 1.1× fair share</text>
<text x="380.0" y="16" text-anchor="middle" class="s-label">range(created_at) — last 24 h</text>
<line x1="262.0" y1="160" x2="498.0" y2="160" style="stroke:var(--line)"/>
<rect x="264.0" y="160.0" width="25.5" height="0.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<rect x="293.5" y="160.0" width="25.5" height="0.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<rect x="323.0" y="160.0" width="25.5" height="0.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<rect x="352.5" y="160.0" width="25.5" height="0.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<rect x="382.0" y="160.0" width="25.5" height="0.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<rect x="411.5" y="160.0" width="25.5" height="0.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<rect x="441.0" y="160.0" width="25.5" height="0.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<rect x="470.5" y="30.0" width="25.5" height="130.0" rx="2" style="fill:var(--crit);fill-opacity:.55;stroke:var(--crit)"/>
<line x1="262.0" y1="143.8" x2="498.0" y2="143.8" style="stroke:var(--ink-3);stroke-dasharray:4 3"/>
<text x="380.0" y="182" text-anchor="middle" class="s-sub">busiest = 8.0× fair share</text>
<text x="642.0" y="16" text-anchor="middle" class="s-label">country — last 24 h</text>
<line x1="524.0" y1="160" x2="760.0" y2="160" style="stroke:var(--line)"/>
<rect x="526.0" y="150.8" width="25.5" height="9.2" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="555.5" y="152.7" width="25.5" height="7.3" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="585.0" y="143.7" width="25.5" height="16.3" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="614.5" y="148.9" width="25.5" height="11.1" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="644.0" y="146.4" width="25.5" height="13.6" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="673.5" y="149.2" width="25.5" height="10.8" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="703.0" y="150.8" width="25.5" height="9.2" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="732.5" y="107.4" width="25.5" height="52.6" rx="2" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<line x1="524.0" y1="143.8" x2="760.0" y2="143.8" style="stroke:var(--ink-3);stroke-dasharray:4 3"/>
<text x="642.0" y="182" text-anchor="middle" class="s-sub">busiest = 3.2× fair share</text></svg>` },

    { t: "h2", n: "03", id: "choosing", text: "Choosing the shard key",
      sub: "High cardinality, even load, and the queries that matter" },

    { t: "diagram", kind: "steps", title: "Questions that pick a shard key",
      caption: "There is rarely a key that wins every row; the goal is a key under which the queries that matter most touch one shard, and the rest can fan out or be served elsewhere.",
      items: [
        { label: "What is the dominant query?", desc: "the key it filters on should be the shard key — \"my orders\" → customer_id", code: "single-shard reads", tone: "good" },
        { label: "Is the key high-cardinality?", desc: "millions of distinct values spread; eight countries cannot", code: "cardinality ≫ shards", tone: "accent" },
        { label: "Are writes even across its values?", desc: "no giant tenant, no monotonic key that sends all new rows to one place", code: "no hot partition", tone: "warn" },
        { label: "What must happen atomically?", desc: "rows that change together in one transaction should share a shard", code: "co-locate", tone: "violet" },
        { label: "What is left over?", desc: "cross-shard queries: fan-out, a secondary index, or a copy elsewhere (6.4)", code: "plan the rest", tone: "crit" }
      ] },

    { t: "callout", kind: "trap", title: "An auto-increment or timestamp shard key",
      body: [
        { t: "p", text: "Ranges on a monotonically increasing key — an auto-increment id, a timestamp, a time-ordered UUID — look balanced in storage because old ranges are full. But every **new** row has the largest key, so all writes hit the last range: the 8× column in the measurement. The same applies to systems that split ranges automatically (Bigtable, HBase, CockroachDB): the newest range splits, and the new half is immediately the hot one again." },
        { t: "p", text: "Hash the key, prefix it with something high-cardinality (`hash(customer) + timestamp`), or reverse it. Use pure time ranges only for data written once and queried by time — logs, metrics — where the hot newest shard is sized for the write rate on purpose." }
      ] },

    { t: "h2", n: "04", id: "hot", text: "Hot partitions",
      sub: "When one key is bigger than its shard" },

    { t: "p", text: "A multi-tenant system sharded by tenant gives each tenant's queries a single shard — until one customer is the size of a hundred others. Tenant sizes follow a power law, so this is the normal case, not the exception:" },

    { t: "code", lang: "python", title: "hot_tenant.py — sharding by tenant when tenants follow a power law", code: `import random, zlib
from collections import Counter

SHARDS, EVENTS, TENANTS = 16, 300_000, 2_000
rng = random.Random(9)
weights = [1 / t ** 1.1 for t in range(1, TENANTS + 1)]           # tenant size: a few giants
tenants = rng.choices(range(1, TENANTS + 1), weights, k=EVENTS)
users = [rng.randrange(50_000) for _ in range(EVENTS)]
h = lambda *v: zlib.crc32(":".join(map(str, v)).encode()) % SHARDS
fair = EVENTS / SHARDS

def report(name, keys):
    c = Counter(keys)
    print("%-38s busiest shard %4.1fx fair share, quietest %4.2fx" % (name, max(c.values()) / fair, min(c.values()) / fair))

print("largest tenant's share of all events: %.1f%%" % (100 * Counter(tenants).most_common(1)[0][1] / EVENTS))
report("hash(tenant)", (h(t) for t in tenants))
BIG = {t for t, _ in Counter(tenants).most_common(3)}               # the known giants
report("hash(tenant), top 3 salted x16", (h(t, u % 16) if t in BIG else h(t) for t, u in zip(tenants, users)))
report("hash(tenant, user)", (h(t, u) for t, u in zip(tenants, users)))`,
      out: `largest tenant's share of all events: 17.0%
hash(tenant)                           busiest shard  3.4x fair share, quietest 0.42x
hash(tenant), top 3 salted x16         busiest shard  1.4x fair share, quietest 0.79x
hash(tenant, user)                     busiest shard  1.0x fair share, quietest 0.98x`,
      caption: "The largest tenant alone produces about a sixth of all events, so whichever shard it hashes to carries over three times a fair share. **Salting just the known giants** — spreading each across sixteen sub-keys — brings the busiest shard near fair share while every other tenant still lives on one shard. Sharding everyone by (tenant, user) balances perfectly but makes every tenant-wide query fan out." },

    { t: "callout", kind: "tradeoff", title: "What every sharded design gives up",
      body: [
        { t: "ul", items: [
          "**Joins across shards** — move to the application, or denormalise so the join is unnecessary (4.4).",
          "**Global ordering and pagination** — \"latest 20 across all customers\" asks every shard for its 20 and merges them.",
          "**Global unique constraints** — a unique email across shards needs a separate lookup table or a reservation service.",
          "**Transactions across shards** — need two-phase commit or a saga (5.4); designs co-locate what must change together.",
          "**Resharding** — moving data when shards are added; with `hash % N` almost everything moves (4.3)."
        ] },
        { t: "p", text: "That list is why sharding is a last resort after indexing, caching, replicas and a bigger machine (2.1) — and why systems that need it often choose a store that does it for them (DynamoDB, Cassandra, Spanner, CockroachDB, Vitess for MySQL, Citus for PostgreSQL)." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Shard a chat application's messages",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "A chat service stores messages on 32 shards. Conversation sizes follow a power law — most are two people, a few are channels with millions of messages. The dominant read is \"the last 50 messages of a conversation\"." }
      ],
      requirements: [
        "Compare sharding by message id, by conversation id, and by (conversation id, day)",
        "For each, report the busiest shard's share of all data and of today's writes",
        "For each, report how many shards a last-50 read touches",
        "Propose a hybrid and measure it",
        "Say which problem your hybrid does not solve, and how you would solve it"
      ],
      hint: "Treat the few giant conversations differently from the millions of small ones — they are a known, short list.",
      solution: { lang: "python", title: "chat_shard_ex.py",
        code: `import random, zlib
from collections import Counter, defaultdict

SHARDS, MESSAGES, CONVS, DAYS = 32, 400_000, 50_000, 30
rng = random.Random(4)
weights = [1 / c ** 0.9 for c in range(1, CONVS + 1)]      # a few enormous group channels
convs = rng.choices(range(1, CONVS + 1), weights, k=MESSAGES)
msgs = [{"id": i, "conv": c, "day": i * DAYS // MESSAGES} for i, c in enumerate(convs)]
h = lambda *v: zlib.crc32(":".join(map(str, v)).encode()) % SHARDS

GIANTS = {c for c, _ in Counter(convs).most_common(20)}        # known from metrics, revisited daily
KEYS = {
    "hash(message_id)":          lambda m: h(m["id"]),
    "hash(conversation_id)":     lambda m: h(m["conv"]),
    "hash(conversation_id, day)": lambda m: h(m["conv"], m["day"]),
    "conversation; giants by day": lambda m: h(m["conv"], m["day"]) if m["conv"] in GIANTS else h(m["conv"]),
}
last_day = [m for m in msgs if m["day"] == DAYS - 1]
by_conv = defaultdict(list)
for m in msgs: by_conv[m["conv"]].append(m)
sample = [c for c in by_conv if len(by_conv[c]) >= 50][:500]

print("%-28s %16s %16s %22s" % ("shard key", "busiest (all)", "busiest (today)", "last-50 read touches"))
for name, f in KEYS.items():
    a, t = Counter(map(f, msgs)), Counter(map(f, last_day))
    fan = sum(len({f(m) for m in by_conv[c][-50:]}) for c in sample) / len(sample)
    print("%-28s %15.1fx %15.1fx %18.1f shards" % (name, max(a.values()) / (MESSAGES / SHARDS),
          max(t.values()) / (len(last_day) / SHARDS), fan))`,
        out: `shard key                       busiest (all)  busiest (today)   last-50 read touches
hash(message_id)                         1.0x             1.0x               25.6 shards
hash(conversation_id)                    2.6x             2.5x                1.0 shards
hash(conversation_id, day)               1.1x             2.6x                9.8 shards
conversation; giants by day              1.1x             2.6x                1.0 shards`,
        notes: [
          { t: "p", text: "Sharding by message id balances perfectly and makes the dominant read touch about **26 of 32 shards** — every page of history becomes a scatter-gather. Sharding by conversation makes that read touch **one** shard, which is why it is the right base key, at the cost of the giant channels making their shards 2.5× busier." },
          { t: "p", text: "Bucketing *everything* by day spreads storage but scatters small conversations' recent history across the days they were active — about ten shards per read. The hybrid applies day buckets **only to the known giants**: storage evens out and reads stay single-shard. This is close to what Discord describes doing — channel id plus a time bucket — sized so an active channel's recent messages sit in one bucket." },
          { t: "p", text: "What it does not solve is the **write** skew today: one enormous channel's messages for today still all go to one shard. If that matters, the giant's current bucket can be split further (by message id modulo a few), accepting a small fan-out for that one channel's reads — or the channel can get a dedicated shard. Storage skew, write skew and read fan-out are three different problems with three different fixes, and the measurement shows which one you have." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: Black Friday and the shard holding one merchant",
      body: [
        { t: "p", text: "**Symptom.** A payments platform sharded its transactions by merchant id across 64 shards. On Black Friday, one shard's CPU reached 100% at 09:00 and stayed there; its transactions timed out while the other 63 shards ran at 30%. Every merchant on that shard — about 1,500 small businesses — saw failed payments." },
        { t: "p", text: "**Mechanism.** One very large retailer lived on that shard. On a normal day it produced 3% of all transactions, within the shard's headroom; on Black Friday its traffic rose twelvefold while most merchants' rose threefold. A hash key spreads *keys* evenly, not *load* — and one key had become larger than a shard. Its neighbours suffered for being on the same machine." },
        { t: "p", text: "**Fix.** That day: move the retailer's new transactions to a dedicated pair of shards through the directory layer that already existed for migrations. After: the top fifty merchants by forecast peak are salted across several sub-shards each, and capacity planning models the **peak-day share** per merchant, not the average. The broader lesson is section 04's: a power-law key will always have a head, and the head needs a plan." }
      ] }
  ],

  takeaways: [
    "**Sharding divides writes**, storage and reads by row; vertical partitioning divides by column or table; replication divides only reads.",
    "**Hash** partitioning balances and loses order; **range** keeps order and concentrates new keys; a **directory** can do anything for a lookup and a component to keep available.",
    "Measured: hash(customer) balanced at 1.0× and served \"my orders\" from one shard; range(time) sent **8× a fair share of today's writes to one shard**; country carried a **3.2×** permanent skew.",
    "Pick the shard key from the **dominant query**, with **high cardinality** and **even writes**, and co-locate rows that change together.",
    "**Monotonic keys** — auto-increment ids, timestamps — make the newest shard the hot one forever. Hash or prefix them.",
    "Power-law keys always have a head: **salt the known giants** — measured, the busiest shard fell from 3.4× to 1.4× while small tenants stayed single-shard.",
    "Hash spreads **keys**, not **load**: one key can outgrow a shard.",
    "Every sharded design gives up cheap **cross-shard joins, global ordering, global uniqueness, cross-shard transactions** and easy resharding.",
    "Shard last — after indexes, caches, replicas and a bigger machine — and prefer a store that shards for you."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Orders are range-partitioned by created_at across eight shards. Storage is balanced. Why is the system still overloaded?",
        options: ["Range partitioning cannot use indexes", "Every new order has the newest timestamp, so all writes go to the last shard", "The ranges overlap", "Old shards must be compacted"],
        answer: 1,
        why: "A monotonically increasing key puts every new row in the newest range, so one shard takes all the writes — 8× its fair share in the measurement — while the others serve only reads of old data. Range partitions use indexes normally, the ranges are disjoint by construction, and compaction is unrelated to where new writes land." },

      { stem: "Which shard key makes \"show this customer's order history\" a single-shard query and balances writes?",
        options: ["hash(order_id)", "hash(customer_id)", "range(created_at)", "country"],
        answer: 1,
        why: "Hashing the customer puts all of one customer's orders on one shard, so the history query touches one shard, and with many customers the hash spreads writes evenly. hash(order_id) balances but scatters one customer's orders across all shards; range(created_at) scatters a customer's history across time and concentrates writes; country is low-cardinality and skewed." },

      { stem: "A multi-tenant system shards by hash(tenant_id). One tenant produces 17% of all traffic. What is the targeted fix?",
        options: ["Add more shards", "Salt that tenant's key across several sub-shards, leaving other tenants on one shard each", "Switch to range partitioning by tenant name", "Replicate the whole database"],
        answer: 1,
        why: "The tenant is one key, so it lands on one shard however many shards there are; splitting just that tenant across sub-keys spreads its load while preserving single-shard queries for everyone else — 3.4× to 1.4× in the measurement. More shards do not split a single key, range by name concentrates it the same way, and replicas do not divide writes." },

      { stem: "Which operation becomes expensive once a table is sharded by user_id?",
        options: ["Fetching one user's rows", "Inserting a row for one user", "Enforcing that email addresses are globally unique", "Updating one user's profile"],
        answer: 2,
        why: "A unique constraint is checked within one database; with rows spread across shards by user, two users with the same email may land on different shards, so global uniqueness needs a separate lookup table or reservation step. The other three operations involve a single user and therefore a single shard, which is exactly what the key was chosen for." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Sharding answers live or die on the shard key and what it costs.",
    questions: [
      { level: "core",
        q: "How would you shard this table?",
        strong: "A strong answer derives the key from the queries, checks balance and cardinality, and names what is given up.",
        answer: [
          { t: "p", text: "I start from the dominant queries. If most reads are per customer, I shard by a hash of customer id: their data is on one shard, and with millions of customers the hash balances writes. I check cardinality and skew — a few giant customers would need salting — and I avoid monotonic keys like timestamps, which send every new row to one shard." },
          { t: "p", text: "Then I list what is left over and plan for it: queries across customers fan out or are served from an analytics copy fed by CDC; global uniqueness needs a lookup table; anything that must change atomically with the customer's data goes on the same shard. And I would use consistent hashing or a directory so adding shards moves a fraction of the data, not all of it." }
        ] },

      { level: "advanced",
        q: "You have a hot shard. What do you do?",
        strong: "A strong answer diagnoses which kind of hot spot it is before choosing a fix.",
        answer: [
          { t: "p", text: "Find out what kind it is. If it is one key — a giant tenant or a celebrity — the key is larger than a shard, so adding shards will not help; I salt that key across sub-shards, or give it a dedicated shard through a directory. If it is a key range — new timestamps — the key is monotonic, and the fix is changing the key, by hashing or prefixing it." },
          { t: "p", text: "If it is just an unlucky set of keys under a hash, splitting the shard or moving some keys rebalances it. Short term, reads can come off a hot shard with replicas or a cache; writes cannot, which is why the key design matters more than any of these." }
        ] },

      { level: "core",
        q: "When would you not shard?",
        strong: "A strong answer exhausts cheaper options and names the costs that justify waiting.",
        answer: [
          { t: "p", text: "Until the write rate or data size actually requires it. Sharding gives up cheap joins, global ordering and uniqueness, and single-database transactions, and it makes operations harder. Before that I would use indexes and query fixes, a cache, read replicas, a larger primary, moving write-heavy side data like counters and events elsewhere, and vertical partitioning of unrelated tables." },
          { t: "p", text: "If the projection still exceeds one primary within the planning horizon, I would shard deliberately, ideally with a system that handles routing and rebalancing — Vitess, Citus, or a natively partitioned store — rather than hand-rolled routing in the application." }
        ] }
    ]
  }
});
