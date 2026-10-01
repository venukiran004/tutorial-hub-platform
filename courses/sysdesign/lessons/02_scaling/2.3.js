/* ============================================================================
   LESSON 2.3 — SQL or NoSQL: Choosing by Access Pattern
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "\"SQL or NoSQL\" is the wrong question, because NoSQL is four different data models and each one is fast at something specific. The right question is **how will this data be read and written?** A relational schema stores each fact once and answers questions nobody planned for; a document stores what one screen needs in one place and answers the planned question in one read. **Each model makes some access patterns cheap by making others expensive** — and the expensive one usually arrives six months later as a request from finance.",

  objectives: [
    "Name the five data-model families and the access pattern each is built for",
    "Measure what a relational and a document model each make cheap and expensive on the same data",
    "Distinguish a copy that is a historical fact from a copy that is a stale cache",
    "Choose a store for a feature from its reads, writes, consistency needs and scale",
    "Recognise when a system needs more than one store, and how they stay in step"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", id: "families", text: "Five data models, not two",
      sub: "\"NoSQL\" is a family, not a product" },

    { t: "diagram", kind: "tree", title: "Data models and what each is built to answer",
      caption: "Each leaf names the question its model answers in one cheap operation. Everything else it can do is slower, harder, or done in your application code.",
      root: { label: "Where data lives", tone: "accent", children: [
        { label: "Relational", sub: "PostgreSQL, MySQL", tone: "good", children: [
          { label: "Any query", sub: "joins, ad hoc" } ] },
        { label: "Document", sub: "MongoDB, Firestore", tone: "violet", children: [
          { label: "Whole object", sub: "by id, nested" } ] },
        { label: "Key-value", sub: "Redis, DynamoDB", tone: "warn", children: [
          { label: "Value by key", sub: "sub-millisecond" } ] },
        { label: "Wide-column", sub: "Cassandra, Bigtable", tone: "teal", children: [
          { label: "Huge writes", sub: "by partition key" } ] },
        { label: "Graph", sub: "Neo4j, Neptune", tone: "crit", children: [
          { label: "Hops", sub: "friends of friends" } ] }
      ] } },

    { t: "viz", title: "One order, stored two ways",
      caption: "Left: each fact once, connected by ids — answering a new question means writing a new query. Right: everything the order screen needs, together — answering the planned question is one read, and a product's name now lives in every order that bought it.",
      svg: `<svg viewBox="0 0 760 252" width="100%" role="img" aria-label="An order as relational tables and as a document">
  <text x="190" y="20" text-anchor="middle" class="s-label" style="fill:var(--good)">RELATIONAL — normalised</text>
  <rect x="20" y="34" width="150" height="70" rx="7" class="s-fill s-stroke"/>
  <text x="95" y="52" text-anchor="middle" class="s-label">orders</text>
  <text x="32" y="72" class="s-mono">id 901</text>
  <text x="32" y="90" class="s-mono">customer 7</text>
  <rect x="210" y="34" width="150" height="88" rx="7" class="s-fill s-stroke"/>
  <text x="285" y="52" text-anchor="middle" class="s-label">items</text>
  <text x="222" y="72" class="s-mono">901 · p42 · ×2</text>
  <text x="222" y="90" class="s-mono">901 · p7  · ×1</text>
  <text x="222" y="108" class="s-mono">902 · p42 · ×1</text>
  <rect x="210" y="150" width="150" height="70" rx="7" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="285" y="168" text-anchor="middle" class="s-label">products</text>
  <text x="222" y="188" class="s-mono">p42 · Kettle · 30.00</text>
  <text x="222" y="206" class="s-mono">p7  · Mug · 8.50</text>
  <line x1="170" y1="70" x2="208" y2="78" style="stroke:var(--line)" stroke-width="1.3"/>
  <line x1="285" y1="122" x2="285" y2="150" style="stroke:var(--line)" stroke-width="1.3"/>
  <text x="190" y="242" text-anchor="middle" class="s-sub">\"Kettle\" is stored once · reading an order is a join</text>

  <line x1="390" y1="30" x2="390" y2="230" style="stroke:var(--line);stroke-dasharray:4 4"/>

  <text x="575" y="20" text-anchor="middle" class="s-label" style="fill:var(--violet)">DOCUMENT — denormalised</text>
  <rect x="420" y="34" width="310" height="186" rx="9" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="434" y="56" class="s-mono">{ "id": 901, "customer": 7,</text>
  <text x="450" y="76" class="s-mono">"items": [</text>
  <text x="466" y="96" class="s-mono">{ "sku": "p42", "name": "Kettle",</text>
  <text x="482" y="114" class="s-mono">"price": 30.00, "qty": 2 },</text>
  <text x="466" y="134" class="s-mono">{ "sku": "p7", "name": "Mug",</text>
  <text x="482" y="152" class="s-mono">"price": 8.50, "qty": 1 } ],</text>
  <text x="450" y="172" class="s-mono">"shipping": { "city": "Leeds" } }</text>
  <text x="575" y="242" text-anchor="middle" class="s-sub">one read for the screen · \"Kettle\" copied into every order</text>
</svg>` },

    { t: "h2", n: "02", id: "measured", text: "The same data, three access patterns",
      sub: "What each model makes cheap, and what it makes you pay for" },

    { t: "p", text: "Fifty thousand orders with one to five items each, over five hundred products, stored both ways. Three things a real business asks of order data:" },

    { t: "code", lang: "python", title: "models.py — relational against document, on one dataset", code: `import json, random, sqlite3, time

rng = random.Random(4)
PRODUCTS = {p: (f"Product {p}", round(rng.uniform(2, 200), 2)) for p in range(1, 501)}
ORDERS = [(o, [(rng.randint(1, 500), rng.randint(1, 3)) for _ in range(rng.randint(1, 5))])
          for o in range(1, 50_001)]

# --- relational: three tables, each fact stored once ------------------------------------
rel = sqlite3.connect(":memory:")
rel.executescript("""
  CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL);
  CREATE TABLE orders   (id INTEGER PRIMARY KEY);
  CREATE TABLE items    (order_id INTEGER, product_id INTEGER, qty INTEGER);
  CREATE INDEX items_by_order ON items(order_id);""")
rel.executemany("INSERT INTO products VALUES (?,?,?)", ((p, n, pr) for p, (n, pr) in PRODUCTS.items()))
rel.executemany("INSERT INTO orders VALUES (?)", ((o,) for o, _ in ORDERS))
rel.executemany("INSERT INTO items VALUES (?,?,?)", ((o, p, q) for o, its in ORDERS for p, q in its))

# --- document: one JSON document per order, product details copied in -------------------
doc = sqlite3.connect(":memory:")
doc.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, body TEXT)")
doc.executemany("INSERT INTO orders VALUES (?,?)", ((o, json.dumps({"id": o, "items": [
    {"product_id": p, "name": PRODUCTS[p][0], "price": PRODUCTS[p][1], "qty": q} for p, q in its]}))
    for o, its in ORDERS))

def ms(f, n=5):
    t = time.perf_counter()
    for _ in range(n): r = f()
    return (time.perf_counter() - t) / n * 1000, r

# A. show one order with its items: the document model's home ground
a_rel, _ = ms(lambda: rel.execute("""SELECT p.name, p.price, i.qty FROM items i
                 JOIN products p ON p.id = i.product_id WHERE i.order_id = 31337""").fetchall(), 200)
a_doc, _ = ms(lambda: json.loads(doc.execute("SELECT body FROM orders WHERE id = 31337").fetchone()[0]), 200)

# B. revenue per product across every order: the relational model's home ground
b_rel, _ = ms(lambda: rel.execute("""SELECT p.id, SUM(i.qty * p.price) FROM items i
                 JOIN products p ON p.id = i.product_id GROUP BY p.id""").fetchall())
def revenue_from_docs():
    rev = {}
    for (body,) in doc.execute("SELECT body FROM orders"):
        for it in json.loads(body)["items"]:
            rev[it["product_id"]] = rev.get(it["product_id"], 0) + it["qty"] * it["price"]
    return rev
b_doc, _ = ms(revenue_from_docs)

# C. rename product 42: one fact, or a copy in every order that ever bought it
c_rel = rel.execute("UPDATE products SET name = 'Product 42 (v2)' WHERE id = 42").rowcount
c_doc = sum(1 for (body,) in doc.execute("SELECT body FROM orders")
            if any(it["product_id"] == 42 for it in json.loads(body)["items"]))

print("%-44s %12s %12s" % ("", "relational", "document"))
print("%-44s %9.3f ms %9.3f ms" % ("A  read one order with its items", a_rel, a_doc))
print("%-44s %9.1f ms %9.1f ms" % ("B  revenue per product, all 50,000 orders", b_rel, b_doc))
print("%-44s %7d rows %7d docs" % ("C  rename one product: records to rewrite", c_rel, c_doc))`,
      out: `                                               relational     document
A  read one order with its items                 0.003 ms     0.005 ms
B  revenue per product, all 50,000 orders         87.4 ms     228.7 ms
C  rename one product: records to rewrite          1 rows     328 docs`,
      caption: "**A** is a draw here because everything is in memory on one machine; the document's real advantage is **locality** — one contiguous record instead of rows on several pages, or after sharding on several machines. **B** is the question nobody designed the documents for: every order must be read and parsed in application code. **C** is the cost of copying: one product rename means rewriting 328 orders." },

    { t: "callout", kind: "insight", title: "Some copies are facts, some are caches",
      body: [
        { t: "p", text: "Look again at what the document copied. The **price** in an order is the price the customer paid — a historical fact that must *not* change when the catalogue price changes. Copying it into the order is correct in any model; a relational design does the same with a `unit_price` column on the line item." },
        { t: "p", text: "The **name** is different: it is a copy of the product's current name, kept for convenience. When the product is renamed, either 328 documents are rewritten or the old name lingers. Before denormalising a field, ask which kind it is. Facts frozen at a moment belong in the record; current values that merely save a lookup are a cache with all the invalidation problems of Module 3 (4.4)." }
      ] },

    { t: "h2", n: "03", id: "choosing", text: "Choosing by access pattern",
      sub: "Start from the reads and writes, then the guarantees" },

    { t: "diagram", kind: "matrix", title: "Which model fits which pattern",
      caption: "Green is the model's home ground, amber is possible with care, red is a fight. Note the bottom row: a model's weakness at ad hoc questions is usually solved by copying the data into a second system built for them, not by forcing the first one.",
      cols: ["Relational", "Document", "Key-value", "Wide-column", "Graph"],
      rows: ["Fetch one object by id", "Money that must balance", "Schema varies per record", "500k writes/s, by key", "Friends of friends of friends", "Questions nobody planned"],
      cells: [
        [{ text: "join", tone: "warn" }, { text: "one read", tone: "good" }, { text: "one read", tone: "good" }, { text: "by partition", tone: "good" }, { text: "possible", tone: "warn" }],
        [{ text: "ACID", tone: "good" }, { text: "per document", tone: "warn" }, { text: "no", tone: "crit" }, { text: "no", tone: "crit" }, { text: "rarely", tone: "crit" }],
        [{ text: "JSONB column", tone: "warn" }, { text: "native", tone: "good" }, { text: "opaque blob", tone: "warn" }, { text: "sparse columns", tone: "good" }, { text: "properties", tone: "good" }],
        [{ text: "needs sharding", tone: "crit" }, { text: "with sharding", tone: "warn" }, { text: "native", tone: "good" }, { text: "native", tone: "good" }, { text: "no", tone: "crit" }],
        [{ text: "recursive joins", tone: "warn" }, { text: "no", tone: "crit" }, { text: "no", tone: "crit" }, { text: "no", tone: "crit" }, { text: "native", tone: "good" }],
        [{ text: "SQL", tone: "good" }, { text: "scan + code", tone: "crit" }, { text: "no", tone: "crit" }, { text: "no", tone: "crit" }, { text: "graph queries", tone: "warn" }]
      ] },

    { t: "diagram", kind: "steps", title: "A decision order that holds up in interviews and in production",
      caption: "Most systems end at step 1 for their core data and add a specialised store later for one access pattern — a cache, a search index, a time-series store — fed from the primary.",
      items: [
        { label: "Default to relational", desc: "unless something below forces otherwise: it answers unplanned questions and gives ACID", code: "PostgreSQL", tone: "good" },
        { label: "Does correctness need multi-record transactions?", desc: "money, inventory, bookings → keep it relational", code: "ACID", tone: "good" },
        { label: "Is one access pattern overwhelmingly dominant?", desc: "get-by-key at huge rate → key-value; whole nested object → document", code: "DynamoDB / Mongo", tone: "violet" },
        { label: "Does write volume exceed one primary?", desc: "append-heavy, partitionable by key → wide-column", code: "Cassandra", tone: "teal" },
        { label: "Is the query about paths through relationships?", desc: "variable-depth traversal → graph", code: "Neo4j", tone: "crit" },
        { label: "Add, don't replace", desc: "a search index, cache or warehouse beside the primary, fed by CDC (6.4)", code: "polyglot", tone: "accent" }
      ] },

    { t: "callout", kind: "trap", title: "Choosing NoSQL \"for scale\" and rebuilding joins in application code",
      body: [
        { t: "p", text: "A team picks a document store because it \"scales horizontally\", for data that is fundamentally relational — customers, orders, products, payments, all referring to each other. A year later the application contains hand-written joins (fetch the order, then fetch each product by id), hand-written referential integrity (a background job that finds orders pointing at deleted products), and hand-written transactions (a two-step update with a compensating write when the second step fails)." },
        { t: "p", text: "Each of those is a feature the relational database provided, now re-implemented with fewer guarantees and more bugs. Meanwhile the data would have fit comfortably on one large PostgreSQL instance (2.1). **Scale is a reason to choose a model only when you have the scale** — and modern relational databases go far further than their reputation suggests." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Pick a store for five features",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A ride-hailing company is designing five features. For each, name the data model you would choose, the access pattern that decides it, and the consistency it needs." },
        { t: "ol", items: [
          "Rider and driver accounts, payment methods and the ledger of every charge and payout",
          "Driver GPS positions: 2 million active drivers reporting every 4 seconds, kept for 30 days",
          "Login sessions and the per-user rate limiter",
          "A trip-history screen showing a rider's last 50 trips with route, price and driver details",
          "Fraud rule: flag accounts that share a payment card or device with a banned account, up to three hops away"
        ] }
      ],
      requirements: [
        "Name a model (and an example product) for each feature",
        "State the access pattern and the write rate that decides it",
        "State whether it needs multi-record transactions",
        "Say how features 4 and 5 get their data without becoming the source of truth"
      ],
      hint: "Work out the GPS write rate first: 2 million ÷ 4 seconds. Then ask which features are the source of truth and which are views of it.",
      solution: { lang: "text", title: "stores.txt",
        code: `1  accounts, cards, ledger   RELATIONAL (PostgreSQL)        source of truth
   pattern: varied queries; money moves between records -> ACID transactions required

2  GPS positions             WIDE-COLUMN / TIME-SERIES      2,000,000 / 4 s = 500,000 writes/s
   (Cassandra, Bigtable)     partition by (driver_id, day); append-only; 30-day TTL
   no transactions; losing one point is harmless; latest position also kept in Redis

3  sessions, rate limits     KEY-VALUE (Redis)              get/set/incr by key, sub-ms
   expiry built in; loss on failover is tolerable (users log in again)

4  trip-history screen       DOCUMENT (or a JSONB read model) one read per screen
   a VIEW built from 1 and 2 by events (6.4); price paid frozen in the document

5  shared-card fraud rule    GRAPH (Neo4j / Neptune)        3-hop traversal
   a VIEW: account -card-> account -device-> account, fed from 1 by CDC`,
        notes: [
          { t: "p", text: "The arithmetic decides feature 2 before any opinion does: **500,000 writes a second** is beyond one relational primary, append-only, and partitions naturally by driver and day — the exact shape wide-column stores are built for. The current position is a different access pattern (\"where is driver 7 now?\") and goes in a key-value store, overwritten in place." },
          { t: "p", text: "Features 4 and 5 are the important design move: they are **views, not sources of truth**. The ledger stays relational because money needs transactions; the trip screen and the fraud graph are derived copies, rebuilt from events or change data capture. If either is lost it can be regenerated, which is what makes it safe to optimise it ruthlessly for one query." },
          { t: "p", text: "That is what \"polyglot persistence\" should mean: one system of record per fact, chosen for correctness, and specialised read stores beside it chosen for speed — not five teams each picking a favourite database for overlapping data." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: finance asked for revenue by product",
      body: [
        { t: "p", text: "**Symptom.** A marketplace stored orders as documents keyed by order id, which served its order pages perfectly. Finance asked for monthly revenue by product and category. The analytics job had to read and parse every order document; at 400 million orders it ran for six hours, saturated the production cluster's disks, and slowed checkout every night it ran." },
        { t: "p", text: "**Mechanism.** Exactly pattern B in section 02, at scale: a question the document shape was not designed for, answerable only by a full scan in application code. The product name and category copied into each order were also stale for renamed products, so the report was wrong as well as slow." },
        { t: "p", text: "**Fix.** Change data capture (6.4) streams every order change into a columnar warehouse, joined there with the current product dimension; finance queries the warehouse, which answers the monthly report in seconds without touching production. The operational store kept doing what it was good at. The lesson is the bottom row of the matrix: **ad hoc questions belong in a system built for them, fed from the system of record.**" }
      ] }
  ],

  takeaways: [
    "Ask **how the data will be read and written**, not \"SQL or NoSQL\" — NoSQL is four models, each fast at a different thing.",
    "**Relational** stores each fact once and answers unplanned questions; **document** stores what one screen needs together; **key-value** is get-by-key; **wide-column** is massive partitioned writes; **graph** is traversal.",
    "Measured on one dataset: reading one order was a draw in memory, but **revenue across all orders took 2.6× as long** from documents, and **renaming one product meant rewriting 328 documents** against one row.",
    "The document's real advantage is **locality** — one contiguous record — which matters most on disk and after sharding.",
    "**A copied price is a fact; a copied name is a cache.** Freeze facts in the record; treat convenience copies as caches with invalidation costs.",
    "**Default to relational**; leave it for a dominant access pattern, a write rate beyond one primary, or a traversal problem.",
    "Choosing NoSQL \"for scale\" without the scale ends with **joins, integrity and transactions rebuilt in application code**.",
    "Polyglot persistence done right: **one system of record per fact**, plus specialised read stores fed from it by events or CDC.",
    "Ad hoc analytics belong in a warehouse fed by CDC, **not a full scan of the operational store**."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Orders are stored as documents with each product's name copied in. A product is renamed. What is the cost?",
        options: ["None — the document store updates references automatically", "Every order document containing that product must be rewritten, or it keeps the old name", "Only new orders are affected, and that is always correct", "The rename is impossible in a document store"],
        answer: 1,
        why: "Denormalising copies the name into each order, so a rename either touches every copy — 328 documents in the measurement, against one relational row — or leaves stale names behind. Document stores do not maintain references between documents. Whether old orders should keep the old name is a product decision: for a price paid it is right, for a display name usually not. The rename is entirely possible, just expensive." },

      { stem: "Which feature most clearly calls for a relational database?",
        options: ["Storing user sessions with a 30-minute expiry", "A ledger where a transfer debits one account and credits another", "Logging 1 million sensor readings a second", "Finding the shortest path between two users in a social graph"],
        answer: 1,
        why: "A transfer changes two records that must change together or not at all, which is a multi-record ACID transaction — the relational model's defining strength. Sessions with expiry are a key-value pattern with built-in TTLs. A million appends a second, partitioned by sensor, suit a wide-column or time-series store. Shortest paths over relationships are a graph traversal." },

      { stem: "Why did the revenue-by-product report take longer on the document model?",
        options: ["JSON is slower to store than integers", "The documents were designed for fetching one order, so an aggregate across all of them requires reading and parsing every document in application code", "Document stores cannot store numbers", "The relational model caches the answer"],
        answer: 1,
        why: "The document shape optimises one access pattern — fetch an order — and an aggregation across every order is not that pattern, so it becomes a full scan with parsing and summing done outside the database. The relational model expresses it as one GROUP BY the engine executes directly. Storage format speed is not the issue, documents store numbers fine, and no cache was involved." },

      { stem: "A team plans to put a fraud graph, a search index and a ledger in three different databases. What makes this sound rather than chaotic?",
        options: ["Using the same vendor for all three", "Each fact has one system of record, and the other stores are derived views fed from it", "Writing to all three in every request", "Avoiding transactions entirely"],
        answer: 1,
        why: "Polyglot persistence works when the ledger is the source of truth and the graph and search index are rebuilt from it by events or CDC, so they can be lost and regenerated. Writing to all three in each request is the dual-write problem — they drift apart on any partial failure (6.4). The vendor is irrelevant, and the ledger needs transactions." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "\"Which database?\" is answered with an access pattern, not a product name.",
    questions: [
      { level: "core",
        q: "SQL or NoSQL — how do you decide?",
        strong: "A strong answer reframes to access patterns and consistency, defaults sensibly, and names what would move the choice.",
        answer: [
          { t: "p", text: "By the access patterns and the guarantees. I default to relational: it stores each fact once, answers questions nobody planned for, and gives multi-record transactions, which anything touching money or inventory needs. A large single instance also goes much further than people assume." },
          { t: "p", text: "I move away for a specific reason. One dominant get-by-key pattern at very high rate points to key-value; whole nested objects read together point to documents; write volume beyond one primary that partitions cleanly by key points to wide-column; variable-depth relationship queries point to a graph. And often the answer is both: relational as the system of record, a specialised store beside it fed by change data capture." }
        ] },

      { level: "core",
        q: "What do you give up by denormalising?",
        strong: "A strong answer names write amplification, staleness and lost flexibility — and distinguishes facts from caches.",
        answer: [
          { t: "p", text: "Three things. Write cost: a fact stored in many places must be updated in all of them, so a rename becomes hundreds of writes. Consistency: until they are all updated, copies disagree, and partial failures leave them disagreeing. And flexibility: the data is shaped for the reads you planned, so new questions become scans." },
          { t: "p", text: "The distinction I would draw is between copies that are facts and copies that are caches. The price on an order line is what the customer paid and should be frozen there in any model. The product name copied in is a cache of the current value, and that one carries the invalidation cost." }
        ] },

      { level: "advanced",
        q: "A team wants to move from PostgreSQL to a NoSQL store because \"it won't scale\". How do you respond?",
        strong: "A strong answer asks for the numbers, exhausts cheaper options, and identifies what would actually justify the move.",
        answer: [
          { t: "p", text: "Ask for the numbers first — current and projected reads and writes per second, data size, the slowest queries — because \"won't scale\" is often an unindexed query, an N+1 loop or an undersized instance. Then the cheaper steps in order: indexes and query fixes, a bigger instance, read replicas for read load, a cache for hot reads, partitioning large tables." },
          { t: "p", text: "If writes genuinely exceed what one primary can take and they partition cleanly by a key, then sharding or a distributed store is justified — possibly a distributed SQL database, which keeps the relational model. What I would resist is moving relational data to a document store and rebuilding joins and transactions in application code to solve a problem the numbers have not shown." }
        ] }
    ]
  }
});
