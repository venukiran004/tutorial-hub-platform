/* ============================================================================
   LESSON 12.9 — Backend System Design in Python
   Mirrors 29_Backend_Web_Concepts/Python_Backend_System_Design.md: the
   approach, capacity estimation (helper run), architecture patterns, API
   design, gateways, event-driven architecture and queues, caching and its
   failure modes, database design, CAP and sagas, concurrency control,
   resilience, observability, and the worked examples.
   ========================================================================= */
EC.receiveLesson({
  id: "12.9",

  lede: "**A system-design question is answered in a fixed order: requirements, numbers, a simple architecture, then the parts that scale it — and every part has a Python shape.** This lesson is the reference's design guide compressed to what an interviewer listens for: the two questions to ask first, the back-of-the-envelope arithmetic run on a Twitter-sized service, the patterns (layers, hexagonal, gateway, events, queues, caches, shards) with the trade each one makes, the consistency vocabulary (CAP, sagas, the outbox), the resilience patterns you would write in Python, and the four worked examples — a URL shortener, a rate limiter, notifications, a news feed — each reduced to its one deciding choice.",

  objectives: [
    "Run a design question through the reference's order: clarify, non-functional requirements, estimate, simple design, scale the bottleneck",
    "Estimate QPS, storage and bandwidth from daily active users with the reference's helper, and say what the numbers force",
    "Choose between monolith and services, REST and gRPC, offset and cursor pagination, cache-aside and write-through, SQL and NoSQL — with the trade named",
    "Explain at-least-once delivery and why consumers must be idempotent, the four cache failure modes and their fixes, CAP, sagas and the outbox pattern",
    "Sketch the URL shortener, distributed rate limiter, notification system and news feed, each around its deciding design choice"
  ],

  prerequisites: ["12.6", "12.7", "11.8"],

  blocks: [

    { t: "h2", n: "01", text: "How to approach a system-design question", id: "approach" },

    { t: "diagram", kind: "steps", title: "The order that scores", caption: "Interviewers grade the process. Jumping to Kafka in the first minute loses more points than a modest design that followed the requirements.", items: [
      { label: "Clarify requirements", desc: "who are the users, what are the core operations, what is out of scope", tone: "accent" },
      { label: "Drive the non-functional requirements", desc: "read/write ratio, latency target, availability, consistency, data volume", tone: "warn" },
      { label: "Estimate", desc: "QPS, storage, bandwidth — orders of magnitude, not decimals", tone: "good" },
      { label: "Draw the simple design", desc: "client → API → database, and where a cache goes", tone: "accent" },
      { label: "Scale the bottleneck", desc: "the estimate tells you which one; add the pattern that removes it", tone: "violet" }
    ] },

    { t: "p", text: "Two questions always come first. *What are the core operations?* — for a URL shortener, create and redirect; everything else is optional. *What are the numbers?* — reads per write, users per day, bytes per item. The non-functional requirements — latency, availability, consistency — decide the architecture far more than the functional ones, because they decide where the state lives and how many copies of it there are." },

    { t: "h2", n: "02", text: "Back-of-the-envelope estimation", id: "estimate" },

    { t: "code", lang: "text", title: "Numbers every engineer should know",
      code: `1 thousand = 10³ = KB    1 million = 10⁶ = MB    1 billion = 10⁹ = GB    1 trillion = 10¹² = TB
a day ≈ 86,400 s ≈ 10⁵ s        → 1M events/day ≈ 12/s;  100M/day ≈ 1,200/s

latency, orders of magnitude:
  L1 cache          0.5 ns          network within a data centre   0.5 ms
  main memory     100 ns            disk seek                     10 ms
  SSD random read 100 µs            network US → EU              150 ms`,
      caption: "The ratios matter more than the values: memory is a thousand times faster than an SSD, which is a hundred times faster than a cross-continent round trip." },

    { t: "code", lang: "python", title: "The reference's estimation helper, run on a Twitter-like service",
      code: `def estimate(dau, actions_per_user_per_day, bytes_per_action, read_write_ratio=100):
    writes_per_day = dau * actions_per_user_per_day
    write_qps = writes_per_day / 86_400
    read_qps = write_qps * read_write_ratio
    daily_storage_gb = (writes_per_day * bytes_per_action) / 1e9
    return {
        "write_qps_avg": round(write_qps),
        "write_qps_peak": round(write_qps * 2),
        "read_qps_avg": round(read_qps),
        "storage_per_year_tb": round(daily_storage_gb * 365 / 1000, 1),
    }

print(estimate(dau=300_000_000, actions_per_user_per_day=2, bytes_per_action=300))`,
      caption: "300 million daily users posting twice a day at 300 bytes each, read a hundred times more often than written." },

    { t: "out", text: `{'write_qps_avg': 6944, 'write_qps_peak': 13889, 'read_qps_avg': 694444, 'storage_per_year_tb': 65.7}` },

    { t: "p", text: "Three numbers shape the whole design. **700,000 reads per second** means the database cannot serve reads directly — cache aggressively and add read replicas. **66 TB a year, 330 TB over five** means one database cannot hold it — shard. **Bandwidth of 210 MB/s of reads** means a CDN and object store for anything larger than text; media never goes in the database. The estimate is not decoration; it is the argument for every box you draw next." },

    { t: "h2", n: "03", text: "Architecture patterns", id: "patterns" },

    { t: "diagram", kind: "compare", title: "Monolith versus microservices — start with the monolith", caption: "In an interview, say 'monolith first' and give the reasons to split later: independent scaling, independent deployment, team boundaries. Splitting early buys network calls, distributed transactions and an operations bill.", columns: [
      { title: "Modular monolith", tone: "good", items: ["one deployable, clear internal layers", "in-process calls, one transaction", "split along module seams later", "the right first answer"] },
      { title: "Microservices", tone: "warn", items: ["scale and deploy parts independently", "team ownership boundaries", "network failures, sagas, tracing needed", "earned by scale, not chosen up front"] }
    ] },

    { t: "diagram", kind: "layers", title: "Hexagonal architecture: ports and adapters", caption: "The domain declares the interfaces it needs (ports); adapters implement them for FastAPI, PostgreSQL, Redis, an external API. Swapping an adapter — SQLite in tests, Postgres in production — touches nothing inside.", items: [
      { label: "inbound adapters: FastAPI routers, CLI, queue consumers", sub: "call the application through a port", tone: "warn" },
      { label: "application services", sub: "use cases; own transactions", tone: "accent" },
      { label: "domain: entities, value objects, rules", sub: "pure Python, no framework", tone: "good" },
      { label: "outbound ports → adapters: repositories, clients, publishers", sub: "Protocol in the domain, implementation outside", tone: "violet" }
    ] },

    { t: "h2", n: "04", text: "API design", id: "api" },

    { t: "table", head: ["", "REST", "gRPC", "GraphQL"],
      rows: [
        ["Transport", "HTTP + JSON", "HTTP/2 + protobuf", "HTTP + JSON, one endpoint"],
        ["Best for", "public APIs, CRUD", "internal service-to-service, low latency", "clients that need flexible shapes"],
        ["Cost", "over- and under-fetching", "tooling, browser support", "N+1 on the server, caching is harder"]
      ] },

    { t: "p", text: "Two details the reference flags as interview-critical. **Idempotency**: a client that retries a POST must not create two orders; accept an `Idempotency-Key` header, store the key with the first response, and replay that response for a repeat (lesson 12.1). **Pagination**: offset pagination (`?page=50&size=20`) makes the database skip a thousand rows and drifts when rows are inserted; cursor pagination (`?after=<last id>`) is O(1) per page and stable, at the cost of not jumping to page 50 (lesson 12.6)." },

    { t: "h2", n: "05", text: "Service communication and the API gateway", id: "gateway" },

    { t: "diagram", kind: "flow", title: "The API gateway", caption: "One entry point that authenticates, rate-limits, routes and aggregates, so each service behind it does none of that. It is also the single place to add a new client type or a canary.", cols: 4, nodes: [
      { id: "c", label: "clients", sub: "web, mobile, partners" },
      { id: "g", label: "API gateway", sub: "auth · rate limit · routing · TLS", tone: "accent" },
      { id: "s1", label: "orders service", tone: "good" },
      { id: "s2", label: "users service", tone: "good" }
    ], edges: [["c", "g"], ["g", "s1"], ["g", "s2"]] },

    { t: "p", text: "Between services, synchronous HTTP or gRPC is simple and couples availability: if users-service is down, orders-service fails. Asynchronous messaging decouples them at the price of eventual consistency. The reference's rule: synchronous for a request that needs the answer now, asynchronous for anything that can be told later." },

    { t: "h2", n: "06", text: "Event-driven architecture and message queues", id: "events" },

    { t: "diagram", kind: "flow", title: "Event sourcing and CQRS", caption: "Event sourcing stores the facts — OrderPlaced, ItemAdded, OrderPaid — and derives current state by replaying them. CQRS splits the write model (commands, validated) from read models (projections shaped for each query), updated from the same events.", cols: 4, nodes: [
      { id: "cmd", label: "command", sub: "PlaceOrder", tone: "accent" },
      { id: "ev", label: "event store", sub: "append-only facts", tone: "warn" },
      { id: "proj", label: "projections", sub: "read models per query", tone: "good" },
      { id: "q", label: "queries", sub: "fast, denormalised", tone: "violet" }
    ], edges: [["cmd", "ev", "append"], ["ev", "proj", "replay / subscribe"], ["proj", "q"]] },

    { t: "table", head: ["Delivery guarantee", "Meaning", "Cost"],
      rows: [
        ["At-most-once", "May lose messages, never duplicates", "Simplest"],
        ["**At-least-once**", "Never lost, may duplicate — **make consumers idempotent**", "The common default"],
        ["Exactly-once", "No loss, no duplicates", "Expensive; usually 'effectively once' via deduplication"]
      ] },

    { t: "p", text: "The line to say out loud: *the queue is at-least-once, so the consumer is idempotent* — it records processed message ids, or its operation is naturally repeatable (set a status, upsert a row). Celery over RabbitMQ or Redis is the Python default for background work; Redis Streams with consumer groups is the lightweight alternative when you already run Redis." },

    { t: "h2", n: "07", text: "Caching strategy", id: "cache" },

    { t: "diagram", kind: "layers", title: "Multi-level cache-aside", caption: "Check the in-process cache, then Redis, then the database, filling each level on the way back. The in-process level is nanoseconds and per-worker; Redis is sub-millisecond and shared; the database is the source of truth.", items: [
      { label: "L1: in-process dict / lru_cache", sub: "per worker · fastest · smallest", tone: "good" },
      { label: "L2: Redis", sub: "shared across workers · TTL", tone: "accent" },
      { label: "database", sub: "source of truth · slowest", tone: "warn" }
    ] },

    { t: "table", head: ["Failure mode", "Cause", "Fix"],
      rows: [
        ["Stampede / thundering herd", "A hot key expires and thousands of requests hit the database at once", "Single-flight lock on rebuild; stale-while-revalidate; jittered TTL"],
        ["Penetration", "Queries for keys that do not exist bypass the cache every time", "Cache the null result briefly; a Bloom filter of valid keys"],
        ["Avalanche", "Many keys expire at the same instant", "Random jitter on every TTL"],
        ["Stale data", "The database changed and the cache did not", "Invalidate on write; short TTL; versioned keys"]
      ] },

    { t: "code", lang: "python", title: "The reference's single-flight rebuild",
      code: `def get_with_lock(key, loader, ttl=300):
    if (v := r.get(key)) is not None:
        return json.loads(v)
    if r.set(f"lock:{key}", "1", nx=True, ex=10):     # I won the right to rebuild
        try:
            value = loader()
            r.setex(key, ttl + random.randint(0, 60), json.dumps(value))   # jittered TTL
            return value
        finally:
            r.delete(f"lock:{key}")
    time.sleep(0.05)                                   # someone else is rebuilding
    return get_with_lock(key, loader, ttl)`,
      caption: "SET NX is the atomic lock: exactly one worker wins, rebuilds and fills the cache; the others sleep briefly and then find the fresh value. The jitter on the TTL prevents the next avalanche." },

    { t: "h2", n: "08", text: "Database design at scale", id: "database" },

    { t: "p", text: "**SQL or NoSQL** is a question about the data, not fashion: relational data with transactions and joins wants PostgreSQL; a document with a flexible shape, or a key-value access pattern at enormous write volume, wants a document or wide-column store. Justify the choice from the access pattern. Then scale reads with **replicas** (the primary takes writes, replicas serve reads a few milliseconds behind — read-your-own-writes needs care) and scale writes and storage with **sharding**: split rows across databases by a key, and accept that cross-shard joins and transactions are gone." },

    { t: "diagram", kind: "cycle", title: "Consistent hashing", caption: "Servers and keys are hashed onto a ring; a key belongs to the first server clockwise from it. Adding or removing a server moves only the keys between it and its neighbour — about 1/n of the data — instead of rehashing everything. Virtual nodes smooth the distribution.", nodes: [
      { label: "server A", sub: "owns the arc before it", tone: "accent" },
      { label: "key k₁ → B", sub: "first server clockwise", tone: "good" },
      { label: "server B", tone: "accent" },
      { label: "new server D", sub: "takes part of C's arc only", tone: "warn" },
      { label: "server C", tone: "accent" }
    ], centre: "hash ring" },

    { t: "h2", n: "09", text: "Consistency, CAP and distributed transactions", id: "cap" },

    { t: "p", text: "**CAP**: during a network partition a distributed system chooses between consistency (every read sees the latest write, or an error) and availability (every request gets a non-error answer, possibly stale). Partitions happen, so the real choice is CP or AP per subsystem — a bank ledger is CP, a like counter is AP. The consistency spectrum runs from strong (linearisable) through causal and read-your-writes to eventual." },

    { t: "diagram", kind: "flow", title: "A saga: local transactions with compensations", caption: "Two-phase commit locks resources across services and stalls on any failure; a saga runs each step as a local transaction and undoes completed steps with compensating actions if a later step fails. Usually the right answer in an interview.", cols: 4, nodes: [
      { id: "a", label: "reserve inventory", sub: "local tx", tone: "good" },
      { id: "b", label: "charge card", sub: "local tx", tone: "good" },
      { id: "c", label: "create shipment", sub: "fails", tone: "crit" },
      { id: "comp", label: "compensate", sub: "refund · release inventory", tone: "warn" }
    ], edges: [["a", "b"], ["b", "c"], ["c", "comp", "on failure"]] },

    { t: "p", text: "**The outbox pattern** solves 'update the database *and* publish an event' without losing either: write the row and the event into an outbox table in one transaction, and let a relay publish outbox rows to the queue afterwards. If the process dies between the two, the event is still in the table and is published on restart." },

    { t: "h2", n: "10", text: "Concurrency control", id: "concurrency" },

    { t: "table", head: ["", "Optimistic", "Pessimistic"],
      rows: [
        ["Mechanism", "Read a version; `UPDATE … WHERE id = ? AND version = ?`; zero rows → retry", "`SELECT … FOR UPDATE` holds a row lock until commit"],
        ["Wins when", "Conflicts are rare; no lock held while the user thinks", "Conflicts are common; the operation is short"],
        ["Cost", "Retries under contention", "Waiting; deadlocks if two orders are used"]
      ] },

    { t: "p", text: "Across app instances neither helps — a lock in one process is invisible to another. A **distributed lock** in Redis (`SET key token NX PX 30000`, released only by the holder that owns the token, with a TTL so a crashed holder cannot lock forever) serialises the critical section; for correctness under Redis failover the reference points at Redlock or a database advisory lock." },

    { t: "h2", n: "11", text: "Scalability and resilience patterns", id: "resilience" },

    { t: "diagram", kind: "cycle", title: "The circuit breaker", caption: "Closed: calls go through and failures are counted. Open: after a threshold, calls fail fast for a cooling period instead of hammering a dependency that is already down. Half-open: one trial call decides whether to close again.", nodes: [
      { label: "closed", sub: "normal; count failures", tone: "good" },
      { label: "open", sub: "fail fast for N seconds", tone: "crit" },
      { label: "half-open", sub: "one probe call", tone: "warn" }
    ] },

    { t: "p", text: "The rest of the resilience list, each one line: **retry with exponential backoff and jitter** for transient failures, idempotent operations only (lesson 6.5); **timeouts** on every outbound call; **bulkheads** — separate pools so one slow dependency cannot exhaust the threads for the others; **rate limiting and load shedding** to protect the service from its clients; **load balancing** (round robin, least connections, consistent hashing for stickiness) in front of stateless instances so **horizontal scaling** is a matter of adding instances. The precondition for all of it: no state in the process." },

    { t: "h2", n: "12", text: "Observability", id: "observability" },

    { t: "p", text: "Structured logs with a correlation id on every line, the **four golden signals** as metrics — latency, traffic, errors, saturation — and traces that follow a request across services (lesson 14.3). Health checks split into liveness (is the process alive? restart it if not) and readiness (can it serve? take it out of the load balancer if not); a readiness check that pings the database will pull every instance out at once when the database blips, which is the classic self-inflicted outage." },

    { t: "h2", n: "13", text: "Worked examples", id: "examples" },

    { t: "p", text: "**URL shortener.** 100M new URLs a month is about 40 writes/s and, at 100:1, 4,000 reads/s — cache the redirects. Five years is 6 billion URLs, so the code needs 7 base-62 characters (62⁷ ≈ 3.5 trillion). The deciding choice is how to make the code: a hash truncated (stateless, collisions to handle), a random string (collision check on insert), or **a counter encoded in base 62** — no collisions, shortest codes, at the cost of a global counter (a database sequence, Redis INCR, or ranges pre-allocated per host)." },

    { t: "code", lang: "python", title: "The reference's base-62 encoder, run",
      code: `import string
ALPHABET = string.digits + string.ascii_letters      # 0-9 a-z A-Z: 62 symbols

def encode_base62(num: int) -> str:
    if num == 0:
        return ALPHABET[0]
    s = []
    while num:
        num, r = divmod(num, 62)
        s.append(ALPHABET[r])
    return "".join(reversed(s))

print(encode_base62(0), encode_base62(61), encode_base62(62), encode_base62(6_000_000_000))
print(62 ** 7, encode_base62(62 ** 7 - 1))` },

    { t: "out", text: `0 Z 10 6y3o5y
3521614606208 ZZZZZZZ` },

    { t: "p", text: "Six billion encodes to six characters; the seventh character is headroom to 3.5 trillion. **Distributed rate limiter**: a token bucket per client key in Redis, refilled by time, checked and decremented atomically with a Lua script so two instances cannot both admit the last request; sliding-window counters are the alternative when burst tolerance matters less than fairness. **Real-time notifications**: producers publish to a queue; a fan-out service writes per-user inboxes and pushes over WebSockets to connected clients, with the connection registry in Redis so any instance can reach any user. **News feed**: fan-out on write (push each post into every follower's precomputed timeline; fast reads, expensive for a celebrity with 50M followers) versus fan-out on read (merge followees' posts at request time; cheap writes, slow reads) — the answer is the hybrid: push for ordinary users, pull for the few with enormous audiences." },

    { t: "diagram", kind: "compare", title: "News feed: fan-out on write versus on read", caption: "The interview answer is 'both': precompute timelines for normal accounts, and merge celebrity posts in at read time so one post does not trigger fifty million writes.", columns: [
      { title: "fan-out on write", tone: "accent", items: ["post → every follower's timeline", "reads are one lookup", "writes explode for celebrities"] },
      { title: "fan-out on read", tone: "warn", items: ["timeline built at request time", "writes are cheap", "reads merge N sources — slow"] },
      { title: "hybrid", tone: "good", items: ["push for most", "pull for accounts over a threshold", "the production answer"] }
    ] },

    { t: "exercise", kind: "design", title: "Estimate, then choose", difficulty: "advanced", minutes: 20,
      body: [{ t: "p", text: "A photo-sharing service has 20 million daily users who each upload one 2 MB photo a day and view fifty. Using the estimation helper (bytes_per_action for the metadata row, say 500 bytes, and the photo separately), work out write and read QPS, metadata storage per year, and photo storage per year. Then name the three design decisions those numbers force and the pattern for each." }],
      requirements: ["The four numbers", "Three decisions, each tied to a number", "One sentence on what you would cache and what you would never put in the database"],
      hint: "20M × 2 MB a day is 40 TB a day of photos.",
      solution: { lang: "python", title: "Solution",
        code: `print(estimate(dau=20_000_000, actions_per_user_per_day=1, bytes_per_action=500, read_write_ratio=50))
# {'write_qps_avg': 231, 'write_qps_peak': 463, 'read_qps_avg': 11574, 'storage_per_year_tb': 3.6}
photos_per_year_pb = 20_000_000 * 2e6 * 365 / 1e15      # ≈ 14.6 PB`,
        notes: [{ t: "p", text: "Metadata is small — 3.6 TB a year fits one well-indexed PostgreSQL with replicas for the 11,500 reads/s. The photos are 40 TB a day, 14.6 PB a year: object storage behind a CDN, never the database. Uploads at 231/s peak 463/s are fine for a direct-to-storage pre-signed URL flow; feed reads are cached per user. The three decisions: object store + CDN for bytes, Postgres + replicas + cache for metadata, and asynchronous processing (thumbnails, feed fan-out) through a queue." }] } }
  ],

  takeaways: [
    "Order: clarify, non-functional requirements, estimate, simple design, scale the bottleneck the estimate reveals.",
    "The Twitter-sized estimate — 7,000 writes/s, 700,000 reads/s, 66 TB a year — forces caching plus replicas, sharding, and object storage with a CDN.",
    "Monolith first; split along module seams when scaling, deployment or ownership demands it. Hexagonal layering keeps the domain free of the framework either way.",
    "Queues are at-least-once, so consumers are idempotent; the outbox pattern makes 'write the row and publish the event' atomic; sagas replace 2PC.",
    "Cache-aside in two levels, with single-flight rebuilds and jittered TTLs against stampede, penetration and avalanche.",
    "Optimistic locking for rare conflicts, pessimistic for common ones, a Redis lock across instances; circuit breakers, backoff, timeouts and bulkheads keep one failing dependency from taking the service down.",
    "The worked examples each turn on one choice: counter-plus-base62 for the shortener, an atomic token bucket for the rate limiter, a Redis connection registry for notifications, hybrid fan-out for the feed."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A message queue guarantees at-least-once delivery. What must be true of the consumer?",
      options: ["It must acknowledge before processing", "It must be idempotent, because it may see the same message twice", "It must process messages in order", "Nothing — at-least-once means no duplicates"],
      answer: 1,
      why: "At-least-once means a message is never lost but may be redelivered — after a crash between processing and acknowledging, for instance. A consumer that would double-charge on a repeat is wrong; it must deduplicate by message id or perform an operation that is naturally repeatable." },
    { stem: "Which cache problem does a jittered TTL address?",
      options: ["Penetration", "Avalanche — many keys expiring at the same instant", "Stale data", "Cache misses on cold start"],
      answer: 1,
      why: "If a batch of keys was written together with the same TTL, they expire together and the database takes every request at once. Adding random seconds to each TTL spreads the expiries out. Penetration needs null-caching or a Bloom filter; stale data needs invalidation on write." },
    { stem: "Why does the reference recommend a saga over two-phase commit for a checkout that spans inventory, payment and shipping services?",
      options: ["Sagas are transactional across services", "2PC holds locks across services and stalls on any failure; a saga uses local transactions and compensating actions", "Sagas never fail", "2PC does not work with PostgreSQL"],
      answer: 1,
      why: "Two-phase commit needs a coordinator and every participant to hold locks until the global commit, so one slow or failed service blocks all of them. A saga commits each step locally and, if a later step fails, runs compensations — refund, release — for the steps already done. It gives up atomicity for availability, which is the usual trade." },
    { stem: "For a news feed, why is pure fan-out on write a problem?",
      options: ["Reads become slow", "A post by an account with fifty million followers triggers fifty million timeline writes", "It cannot be cached", "It requires GraphQL"],
      answer: 1,
      why: "Fan-out on write precomputes every follower's timeline at post time, which is one lookup per read but a write per follower. For a celebrity that is tens of millions of writes per post. The hybrid keeps push for ordinary accounts and merges the few enormous accounts' posts in at read time." }
  ] },

  interview: { title: "Interview", sub: "The reference's checklist, as questions", questions: [
    { level: "Core", q: "Design a URL shortener. Walk me through it.",
      strong: "Clarify, estimate (40 writes/s, 4,000 reads/s, 6B URLs → 7-char base62), counter-based codes, cached redirects, a 301 versus 302 decision.",
      answer: [{ t: "p", text: "Core operations: create a short code for a URL, redirect on GET. At 100M new URLs a month that is about 40 writes/s and, read-heavy, 4,000 redirects/s; five years is 6 billion codes, so 7 base-62 characters. Generate codes from a counter encoded in base 62 — no collisions, shortest codes — with the counter as a database sequence or Redis INCR, or ranges allocated per host to avoid a single point of contention. Store code → URL in PostgreSQL with the code as primary key; cache hot codes in Redis, since redirects dominate. Use 302 if you want analytics on every hit, 301 if you want browsers to cache. Add expiry and a custom-alias option only if asked." }] },
    { level: "Core", q: "Explain CAP and where you would choose CP or AP.",
      strong: "Under a partition, consistency or availability; the ledger is CP, the like counter is AP; choose per subsystem.",
      answer: [{ t: "p", text: "A distributed system cannot, during a network partition, give every request both a non-error answer and the latest write. Since partitions are a fact, each subsystem picks: CP returns errors or waits rather than serve stale data — account balances, inventory reservations, anything where a stale read causes a wrong action; AP serves what it has — like counts, feeds, product descriptions — and reconciles later. Most systems are a mix, and the interviewer wants to hear the choice made per data type with the reason." }] },
    { level: "Senior", q: "A dependency is failing intermittently and your service's latency has tripled. What do you put in place?",
      strong: "Timeouts, a circuit breaker, bounded retries with jitter, a bulkhead pool, and a fallback — then load shedding if it persists.",
      answer: [{ t: "p", text: "First a strict timeout on the call, so a hung dependency costs a bounded amount of time. Then a circuit breaker: after N failures in a window, open and fail fast for a cooling period, half-open with a probe, close on success — that stops the retries from making the dependency's outage worse and returns capacity to the service. Retries only for idempotent calls, capped, with exponential backoff and jitter. A bulkhead — a separate connection or thread pool for that dependency — so its slowness cannot exhaust the pool other endpoints use. A fallback where one exists: cached data, a default, a degraded response. And if the service itself is saturating, shed load at the edge with a 503 and Retry-After rather than queue requests that will time out anyway." }] }
  ] }
});
