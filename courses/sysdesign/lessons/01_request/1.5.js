/* ============================================================================
   LESSON 1.5 — API Styles: REST, GraphQL and gRPC
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "REST, GraphQL and gRPC are three answers to one question: **who decides the shape of the response?** In REST the server decides, per resource; in GraphQL the client decides, per query; in gRPC both sides compile the same contract. Each answer moves a cost somewhere — round trips, caching, server complexity, debuggability — and the choice is about which cost you can afford. The rules that outlive the choice matter more: **naming, versioning, pagination and idempotency**, which every public API eventually has to get right.",

  objectives: [
    "Explain what REST, GraphQL and gRPC each optimise and what each gives up",
    "Choose an API style for a public API, a mobile front end and internal service calls",
    "Measure why OFFSET pagination degrades and why cursor pagination does not",
    "Design a versioning and error contract that will survive the API's first breaking change",
    "Specify an endpoint that is safe for a client to retry"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", id: "three", text: "Three styles, one question",
      sub: "Who decides what comes back?" },

    { t: "diagram", kind: "compare", title: "REST, GraphQL and gRPC in one view",
      caption: "None of the three is newer-is-better. Large systems commonly use all three: REST for the public API, GraphQL behind the mobile and web apps, gRPC between internal services.",
      columns: [
        { title: "REST — resources", tone: "accent", items: [
          "many URLs, one per resource: /users/7/orders",
          "HTTP verbs carry the meaning (1.4)",
          "server fixes each response's shape",
          "HTTP caching works for free",
          "over-fetching and extra round trips",
          "best for: public and partner APIs"
        ] },
        { title: "GraphQL — queries", tone: "violet", items: [
          "one endpoint; the client writes a query",
          "exactly the fields asked for, in one trip",
          "typed schema, introspectable",
          "everything is a POST: HTTP caching is lost",
          "expensive queries and resolver N+1",
          "best for: front ends with nested screens"
        ] },
        { title: "gRPC — procedures", tone: "good", items: [
          "methods on a service, defined in .proto",
          "binary Protocol Buffers over HTTP/2",
          "generated clients in every language",
          "streaming in both directions",
          "not browser-native; opaque on the wire",
          "best for: internal service-to-service calls"
        ] }
      ] },

    { t: "h2", n: "02", id: "round-trips", text: "The cost REST pays and GraphQL avoids",
      sub: "Dependent calls are sequential round trips" },

    { t: "p", text: "A mobile order-history screen needs a user, their recent orders, and the items in each. In REST those are three resources, and each request needs an id from the previous response, so they cannot be sent together. GraphQL describes the whole tree in one query and lets the server walk it, where the round trips are sub-millisecond:" },

    { t: "code", lang: "text", title: "the same screen, two ways", code: `REST — three dependent requests
  GET /users/7                      -> { id: 7, name, email, address, preferences, ... }
  GET /users/7/orders?limit=5       -> [ { id: 901, total, status, ... }, ... ]
  GET /orders/901/items             -> [ ... ]   (and again for 902, 903 ...)

GraphQL — one request, exactly these fields
  POST /graphql
  query {
    user(id: 7) {
      name
      orders(last: 5) { id total status items { sku name qty } }
    }
  }` },

    { t: "diagram", kind: "timeline", title: "The order-history screen on a phone 80 ms from the API",
      caption: "Three dependent REST calls cost three round trips, and the item calls multiply with the number of orders unless the API adds a combined endpoint. One GraphQL query costs one round trip plus the server's own work walking the tree.",
      span: 340, tick: 40, unit: "milliseconds",
      lanes: [
        { label: "REST", bars: [[0, 85, "GET /users/7", "accent"], [85, 170, "GET …/orders", "accent"], [170, 255, "items ×5 (parallel)", "warn"]] },
        { label: "GraphQL", bars: [[0, 100, "one query", "violet"]] }
      ] },

    { t: "callout", kind: "tradeoff", title: "What GraphQL moves rather than removes",
      body: [
        { t: "p", text: "The round trips do not disappear; they move to the server, where the resolver for `items` runs once per order — the N+1 pattern (1.2) now on the server side, hidden behind one request. The standard fix is a batching loader (DataLoader) that collects the ids from one level of the tree and makes one query for all of them." },
        { t: "p", text: "Caching moves too. Every GraphQL request is a POST to one URL, so CDNs and browsers cannot cache it by URL; you get it back with persisted queries (a hash of an approved query sent as a GET). And because clients write queries, one client can write a very expensive one, so production GraphQL needs **depth limits and query cost analysis** before it is public." }
      ] },

    { t: "h2", n: "03", id: "grpc", text: "gRPC: a contract both sides compile",
      sub: "Why internal calls are usually not JSON" },

    { t: "code", lang: "text", title: "orders.proto — the contract, from which both client and server are generated", code: `syntax = "proto3";

service Orders {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc StreamStatus (GetOrderRequest) returns (stream StatusUpdate);  // server push
}

message GetOrderRequest { int64 order_id = 1; }

message Order {
  int64  id       = 1;
  string status   = 2;
  int64  total_pence = 3;      // money as integer minor units, never float
  repeated LineItem items = 4;
}`,
      caption: "Field numbers, not names, go on the wire, so a field can be renamed freely and new fields added without breaking old clients — as long as numbers are never reused. That is versioning built into the format." },

    { t: "dl", items: [
      ["Why it is fast", "Protocol Buffers are compact binary — typically several times smaller than the same JSON and much cheaper to parse — and gRPC runs on HTTP/2, so many calls multiplex over one long-lived connection (1.4)."],
      ["Why it is safe to change", "Both sides are generated from the `.proto` file, so a type mismatch is a compile error rather than a production incident, and the field-number rules make additive change backward compatible."],
      ["Why it stays internal", "Browsers cannot speak gRPC directly (gRPC-Web and a proxy are needed), the payloads are not human-readable, and `curl` does not help when debugging. Those costs are cheap inside a company and expensive for partners."]
    ] },

    { t: "h2", n: "04", id: "pagination", text: "Pagination: OFFSET against cursor",
      sub: "The rule every list endpoint needs, measured" },

    { t: "p", text: "Any endpoint that returns a list must return it a page at a time. The obvious way — `LIMIT 20 OFFSET 20 × (page − 1)` — has two defects that appear only at scale. The first is speed. This builds a million orders in SQLite and fetches the same pages two ways:" },

    { t: "code", lang: "python", title: "paginate.py — the same page, by OFFSET and by cursor", code: `import sqlite3, time

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, total REAL)")
db.executemany("INSERT INTO orders (customer, total) VALUES (?, ?)",
               ((f"c{i % 5000}", i % 997) for i in range(1_000_000)))

def timed(sql, args=()):
    t = time.perf_counter()
    for _ in range(20):
        rows = db.execute(sql, args).fetchall()
    return (time.perf_counter() - t) / 20 * 1000, rows

print("%-12s %16s %16s" % ("page", "OFFSET ms", "cursor ms"))
for page in (1, 1_000, 10_000, 49_999):
    off_ms, rows = timed("SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET ?", ((page - 1) * 20,))
    last_id_before = (page - 1) * 20               # the cursor the previous page returned
    cur_ms, rows2 = timed("SELECT * FROM orders WHERE id > ? ORDER BY id LIMIT 20", (last_id_before,))
    assert rows == rows2                           # same page, two ways
    print("%-12s %16.3f %16.3f" % (f"{page:,}", off_ms, cur_ms))`,
      out: `page                OFFSET ms        cursor ms
1                       0.015            0.012
1,000                   0.186            0.011
10,000                  1.762            0.012
49,999                  8.627            0.050`,
      hl: [16, 18],
      caption: "OFFSET grows with the page number — the database still reads and discards every skipped row — while the cursor query is flat, because `WHERE id > ?` seeks straight to the right place in the index (2.4). The exact milliseconds differ per run; the shape does not." },

    { t: "p", text: "The second defect is correctness. A feed sorted newest-first changes while the user scrolls, and OFFSET counts positions, not rows:" },

    { t: "code", lang: "python", title: "paginate_drift.py — one new post between page 1 and page 2", code: `import sqlite3

def fresh():
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE posts (id INTEGER PRIMARY KEY, created INTEGER)")
    db.executemany("INSERT INTO posts (id, created) VALUES (?, ?)", ((i, i) for i in range(1, 31)))
    return db

# newest first, 10 per page; a new post arrives between page 1 and page 2
db = fresh()
p1 = [r[0] for r in db.execute("SELECT id FROM posts ORDER BY created DESC LIMIT 10 OFFSET 0")]
db.execute("INSERT INTO posts (id, created) VALUES (31, 31)")
p2 = [r[0] for r in db.execute("SELECT id FROM posts ORDER BY created DESC LIMIT 10 OFFSET 10")]
print("OFFSET  page 1:", p1)
print("OFFSET  page 2:", p2, " <- 21 shown twice")

db = fresh()
p1 = [r[0] for r in db.execute("SELECT id, created FROM posts ORDER BY created DESC LIMIT 10")]
cursor = 21                                   # created-value of the last row on page 1
db.execute("INSERT INTO posts (id, created) VALUES (31, 31)")
p2 = [r[0] for r in db.execute("SELECT id FROM posts WHERE created < ? ORDER BY created DESC LIMIT 10", (cursor,))]
print("CURSOR  page 1:", p1)
print("CURSOR  page 2:", p2, " <- continues exactly")`,
      out: `OFFSET  page 1: [30, 29, 28, 27, 26, 25, 24, 23, 22, 21]
OFFSET  page 2: [21, 20, 19, 18, 17, 16, 15, 14, 13, 12]  <- 21 shown twice
CURSOR  page 1: [30, 29, 28, 27, 26, 25, 24, 23, 22, 21]
CURSOR  page 2: [20, 19, 18, 17, 16, 15, 14, 13, 12, 11]  <- continues exactly`,
      caption: "The new post pushed everything down one position, so OFFSET 10 re-reads the last row of page 1. A deletion would make it skip a row instead. The cursor says \"older than the last thing I saw\", which no insertion can disturb." },

    { t: "table",
      head: ["", "OFFSET / page number", "Cursor (keyset)"],
      rows: [
        ["Cost of page N", "Grows with N — reads and discards N × size rows", "Constant — an index seek"],
        ["Rows inserted or deleted while paging", "Duplicates or skips", "Stable"],
        ["Jump to page 500", "Yes", "No — next and previous only"],
        ["Total count", "Usually shown, costs a `COUNT(*)`", "Usually omitted"],
        ["Use for", "Small, stable admin tables", "Feeds, timelines, public APIs, anything large"]
      ],
      caption: "Make the cursor opaque — base64 of the sort key and id — so clients cannot construct one and you can change what is inside it. Sort on a unique key, or on (timestamp, id) when timestamps can collide." },

    { t: "h2", n: "05", id: "contract", text: "The rules that outlive the style",
      sub: "Names, versions, errors and retries" },

    { t: "diagram", kind: "steps", title: "An API contract checklist",
      caption: "These are the decisions that are cheap on day one and nearly impossible to change once partners depend on the API — which is why they are worth more interview time than the choice of style.",
      items: [
        { label: "Nouns in paths, verbs in methods", desc: "POST /orders, not POST /createOrder; plural collections; nest only one level", code: "/orders/901/items" },
        { label: "Version from the first release", desc: "in the path for public APIs; additive change needs no new version", code: "/v1/orders" },
        { label: "One error shape everywhere", desc: "a machine-readable code, a human message, the field at fault, a request id", code: "{code, message, field}" },
        { label: "Cursor pagination on every list", desc: "limit with a maximum, an opaque next cursor, no unbounded responses", code: "?limit=50&cursor=…" },
        { label: "Idempotency keys on unsafe writes", desc: "the client sends one key per logical operation; the server stores the result", code: "Idempotency-Key: …" },
        { label: "Rate limits stated in headers", desc: "remaining quota and reset time, 429 with Retry-After when exceeded (7.3)", code: "RateLimit-Remaining" }
      ] },

    { t: "callout", kind: "trap", title: "\"Additive changes are safe\" — until a client validates strictly",
      body: [
        { t: "p", text: "Adding a field to a response is the textbook backward-compatible change. It breaks any client that deserialises into a strict schema that rejects unknown fields, and it breaks clients that switch over an enum the moment you add a new value — a mobile app compiled last year has a `switch (status)` with no case for `\"partially_refunded\"`." },
        { t: "p", text: "The contract has to say so in advance: **clients must ignore unknown fields and handle unknown enum values**, documented on day one and exercised by your own SDKs. Then additive change really is safe, and a new version is needed only for removals, renames and changes of meaning." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Specify a create-order endpoint a client can safely retry",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A partner integration creates orders from a warehouse system with flaky connectivity. Their client retries any request that times out. Write the contract for creating an order and listing a customer's orders so that retries never create duplicate orders and listing never skips or repeats one." }
      ],
      requirements: [
        "Give the method and path for create and list, with the version",
        "Specify how a retried create returns the original order rather than creating another",
        "Specify the list endpoint's pagination parameters and response shape",
        "Define the error response for a request that fails validation",
        "Say what happens when the same idempotency key arrives with a different body"
      ],
      hint: "The server needs to store the idempotency key with the response it produced, scoped to the partner, and compare the request body on a repeat.",
      solution: { lang: "text", title: "orders-api.txt",
        code: `POST /v1/orders
  Headers:  Authorization: Bearer <partner token>
            Idempotency-Key: 6f1c2a0e-...          (client-generated, one per logical order)
  Body:     { "customer_id": "c_123", "lines": [ { "sku": "A-7", "qty": 2 } ] }

  201 Created   { "id": "ord_901", "status": "pending", ... }   first time
  201 Created   { "id": "ord_901", ... }    same key + same body: the STORED response, replayed
  422           { "code": "idempotency_key_reused",
                  "message": "key was used with a different request body" }
  Server: store (partner_id, key) -> (body hash, status, response) for 24 h,
          inserted in the same transaction as the order (6.3).

GET /v1/customers/c_123/orders?limit=50&cursor=<opaque>
  200 OK  { "data": [ ... up to 50, newest first ... ],
            "next_cursor": "eyJjIjoxNzI3...",      null on the last page
            "has_more": true }
  Ordered by (created_at DESC, id DESC); cursor encodes the last (created_at, id).
  limit capped at 200; default 50.

Errors, everywhere:
  { "code": "validation_failed", "message": "qty must be >= 1",
    "field": "lines[0].qty", "request_id": "req_8c1..." }`,
        notes: [
          { t: "p", text: "The idempotency record is keyed by **partner and key**, not key alone — otherwise two partners' UUIDs could collide, or one partner could probe for another's orders. It stores the **response**, not just a flag, so the retry gets byte-for-byte what the first attempt would have returned, including the order id it needs. And it is written **in the same transaction as the order**, so there is no window in which the order exists but the key does not (6.3 shows why that window loses data)." },
          { t: "p", text: "Comparing the body hash catches a real bug class: a client that reuses a key for a *different* order. Silently returning the first order would hide the bug and lose the second order; failing loudly with 422 surfaces it. Twenty-four hours of retention covers any realistic retry window without keeping keys forever." },
          { t: "p", text: "The list sorts on `(created_at, id)` rather than `created_at` alone because two orders can share a timestamp, and a cursor on a non-unique key skips one of them at a page boundary. The cursor is opaque so it can change format later, and `limit` is capped so no client can ask for a million rows in one response." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the export job that took down the orders database",
      body: [
        { t: "p", text: "**Symptom.** Every night at 02:00, the orders database's CPU climbed to 100% for about forty minutes and API latency for every customer rose tenfold. Nothing was deployed at 02:00. The slow-query log showed one query, repeated, with a different number each time: `SELECT … ORDER BY id LIMIT 100 OFFSET …`." },
        { t: "p", text: "**Mechanism.** A partner's nightly export paged through all 40 million orders with `?page=N&limit=100`. Page N cost the database N × 100 rows of reading and discarding, so the whole export cost about 400,000 × 40,000,000 ÷ 2 row reads — quadratic in the table size. It had been fine at a million orders; at forty million it was saturating the primary every night, and it grew worse every day." },
        { t: "p", text: "**Fix.** A cursor on the list endpoint, so each page is an index seek (the export dropped from forty minutes of saturation to four minutes of light load), a cap on `page` for the legacy parameter, and a dedicated bulk-export endpoint that reads from a replica (4.1). The general rule the team adopted: **no list endpoint ships without cursor pagination and a maximum page size.**" }
      ] }
  ],

  takeaways: [
    "The three styles answer **who decides the response's shape**: the server per resource (REST), the client per query (GraphQL), or a compiled contract (gRPC).",
    "REST is cacheable and simple but makes **dependent screens cost one round trip per level**; GraphQL fetches the tree in one trip.",
    "GraphQL **moves** costs rather than removing them: resolver N+1 (fix with batching loaders), lost URL caching (fix with persisted queries), and expensive queries (fix with depth and cost limits).",
    "gRPC is **binary Protobuf over HTTP/2** with generated clients and streaming — ideal inside a company, awkward for browsers and partners.",
    "In Protobuf, **field numbers go on the wire**: rename freely, add freely, never reuse a number.",
    "**OFFSET pagination reads and discards every skipped row** — measured, its cost grows with the page number while a cursor stays flat.",
    "**OFFSET duplicates or skips rows when the list changes**; a cursor (\"older than the last row I saw\") cannot.",
    "Cursors should be **opaque** and sort on a **unique key** — `(created_at, id)` — or rows sharing a timestamp vanish at page boundaries.",
    "**Version from the first release; one error shape everywhere; cursor pagination with a maximum; idempotency keys on unsafe writes; limits in headers.**",
    "Additive change is only safe if the contract says, from day one, that **clients ignore unknown fields and unknown enum values**."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is OFFSET pagination slow on deep pages even with an index on the sort column?",
        options: ["The index is not used with LIMIT", "The database must still walk past every skipped row before returning the page", "OFFSET forces a full sort of the table", "It is not slow; only COUNT(*) is"],
        answer: 1,
        why: "OFFSET is defined by position, so the database reaches row 1,000,000 by stepping over the 999,999 before it, even when it walks them in index order — the measurement shows cost growing with the page number. The index is used, which is why the walk is ordered rather than a sort. A cursor's WHERE id > ? seeks directly to the start of the page instead, which is why it stays flat." },

      { stem: "A public partner API is being designed. Which style is the strongest default, and why?",
        options: ["gRPC, because it is fastest", "GraphQL, because it avoids over-fetching", "REST, because it is cacheable, browser- and curl-friendly, and partners know it", "Any — the choice does not matter for partners"],
        answer: 2,
        why: "For partners, the costs that matter are integration effort, debuggability and caching, and REST wins on all three: any HTTP client works, responses are readable, and CDNs cache GET responses by URL. gRPC's speed matters most inside a data centre and its tooling burden falls on every partner. GraphQL suits front ends with nested screens but needs cost limits before it is safe to expose publicly." },

      { stem: "A GraphQL query for 50 orders and their items is slow, though it is a single HTTP request. What is the likely cause?",
        options: ["GraphQL responses cannot be compressed", "The items resolver runs one database query per order — N+1 on the server", "POST requests are slower than GET", "The schema is too large"],
        answer: 1,
        why: "GraphQL removes client round trips by walking the tree on the server, and a naive resolver for `items` runs once per order — 51 queries for one request. A batching loader collects all 50 order ids and fetches their items in one query. Compression works on GraphQL like any HTTP body, POST is not inherently slower, and schema size does not affect execution of one query." },

      { stem: "A client retries a create request after a timeout, sending the same Idempotency-Key with a different body. What should the server do?",
        options: ["Create a second resource with the new body", "Return the original response, ignoring the new body", "Reject it with an error saying the key was reused with a different request", "Overwrite the original resource with the new body"],
        answer: 2,
        why: "A key identifies one logical operation, so the same key with a different body is a client bug — usually a key being reused across operations. Rejecting it loudly surfaces the bug. Returning the original silently loses the second order; creating a second resource defeats the key's purpose; and overwriting turns a create into an update nobody asked for." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Style questions are trade-off questions; contract questions are where seniority shows.",
    questions: [
      { level: "core",
        q: "REST, GraphQL or gRPC — how do you choose?",
        strong: "A strong answer chooses per audience and names the cost each choice moves.",
        answer: [
          { t: "p", text: "By who the client is. For a public or partner API I default to REST: any HTTP client can call it, responses are readable, and GETs cache at the CDN. For internal service-to-service calls I prefer gRPC: a compiled contract catches mismatches at build time, Protobuf is compact, HTTP/2 multiplexes calls, and streaming is built in — and the costs, browser support and readability, barely matter inside a company." },
          { t: "p", text: "GraphQL earns its place behind front ends with nested, fast-changing screens, where it turns several dependent round trips into one. But it moves costs rather than removing them — resolver N+1, harder caching, and the risk of expensive queries — so I would add batching loaders, persisted queries and cost limits before calling it production-ready." }
        ] },

      { level: "core",
        q: "How would you paginate a timeline with hundreds of millions of rows?",
        strong: "A strong answer rejects OFFSET with both reasons and specifies the cursor precisely.",
        answer: [
          { t: "p", text: "Cursor pagination. OFFSET has two problems at that size: each page costs the database every skipped row, so deep pages and bulk exports get quadratically expensive, and new posts arriving while the user scrolls shift positions so rows are duplicated or skipped." },
          { t: "p", text: "The cursor encodes the last row's sort key — here `(created_at, id)`, because timestamps collide and a non-unique key loses rows at page boundaries — and the query is `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT n` on a matching index. I make the cursor opaque so I can change it, cap `limit`, and give up jump-to-page, which a timeline does not need." }
        ] },

      { level: "advanced",
        q: "Your API has partners on it. How do you evolve it without breaking them?",
        strong: "A strong answer separates additive from breaking change and states the client obligations up front.",
        answer: [
          { t: "p", text: "Most change should be additive and need no version: new optional fields, new endpoints, new enum values. That only works if the contract says from day one that clients must ignore unknown fields and handle unknown enum values, and my own SDKs behave that way — otherwise a strict deserialiser turns a new field into an outage." },
          { t: "p", text: "Breaking changes — removing or renaming a field, changing meaning — get a new major version, `/v2`, run side by side with `/v1`. I track per-partner usage of v1, announce a deprecation date with a `Sunset` header, contact the stragglers directly, and only turn it off when usage is near zero — the same discipline as draining an old DNS address (1.1)." }
        ] }
    ]
  }
});
