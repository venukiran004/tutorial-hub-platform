/* ============================================================================
   SYSTEM DESIGN — CURRICULUM
   ----------------------------------------------------------------------------
   The reference folder tutorial-hub/11_System_Design holds fourteen documents
   across eight pages, and they overlap heavily: caching is taught in five of
   them, CAP in four, rate limiting in five. Mirroring them file for file, as
   the GenAI course does, would teach the same idea four times in four voices.
   This course is ordered by CONCEPT instead — each idea taught once, at the
   depth of the deepest document that covers it — and the map below records
   where every lesson's material came from, so nothing in the reference is
   left out:

     foundations.html  A  Software Design Principles ............ M9
                       B  System Design — Engineering Reference .. M1-M7, M15
     scaling.html      C  The Living Blueprint (30 concepts) ..... M1-M4
                       D  Scalability & Performance .............. M11
     patterns.html     E  The 30 System Design Patterns ......... M3-M7, M10, M12
                       F  Architecture Patterns .................. M10
     distributed.html  G  Distributed Systems Deep Dive ......... M5, M8
                       H  Data Systems Internals ................. M4-M6
     security.html     I  Security & Cloud Architecture ......... M12
     ml.html           J  ML System Design ....................... M13
                       K  Real-World Architectures ............... M14
     interview.html    L  Architect Interview Guide .............. M15
                       M  200 interview questions ................ Interview track
                       N  Programs 901-1000 ...................... Practice track
     scenarios.html    O  Production scenarios ................... Practice track

   Every lesson is drawn first and written second: a lesson carries several
   diagrams, because system design is a subject people reason about in boxes
   and arrows, and a paragraph describing a picture is a worse picture.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "sysdesign",
    title: "System Design",
    short: "System Design",
    blurb: "From a single server to millions of users: how a request travels, scaling the stateless tier, caching, replication and sharding, consistency and transactions, queues and streams, the resilience patterns, distributed-systems theory from clocks to Raft, code-level and architecture-level design, performance and reliability engineering, security and cloud, ML and LLM systems, how the large companies built theirs, and the interview that ties it together.",

    trackLabels: { learn: "System Design", practice: "Practice", interview: "Interview" },
    trackBlurbs: {
      learn: "Concept by concept, each drawn before it is explained, with the numbers that make a trade-off a decision rather than an opinion.",
      practice: "Production scenarios and the pattern programs, answers folded away.",
      interview: "The two-hundred-question bank, general, ML and LLM design, answers hidden until you ask."
    },

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "2.2", "2.3", "2.4", "2.5", "3.1", "3.2", "3.3", "3.4", "3.5"],

    modules: [

      /* ================================================================
         M1 · C §1-8, B §10, E A1 — how a request travels
         ================================================================ */
      {
        id: "request",
        short: "M1",
        dir: "01_request",
        phase: "Phase 1 · The vocabulary",
        title: "How a Request Travels",
        blurb: "Every hop between a user pressing enter and a byte coming back: the client and the server, addresses and DNS, the latency that distance costs, the proxies and balancers in the path, HTTP and TLS, the API styles, and the real-time channels that keep a connection open.",
        outcome: "You can draw the read path of any web system, put a number on every hop, and say which box each later decision is about.",
        source: "scaling.html §1-8, §24 · foundations.html B §10",
        lessons: [
          { id: "1.1", title: "Client, Server, IP and DNS", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "The two roles every system is built from, how a name becomes an address, and the caching at every level of DNS that makes a change take hours to land.",
            keywords: ["client server", "ip address", "dns", "ttl", "resolver", "a record", "cname"] },
          { id: "1.2", title: "Latency: The Numbers Every Design Rests On", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "L1 cache to a cross-continent round trip on one scale, why the speed of light is a design constraint, and how to turn the table into a budget.",
            keywords: ["latency", "round trip", "speed of light", "latency numbers", "budget", "throughput"] },
          { id: "1.3", title: "Proxies, Load Balancers and Gateways", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "Forward against reverse proxy, and the four boxes people confuse — reverse proxy, load balancer, API gateway, service mesh — told apart by what each one knows.",
            keywords: ["forward proxy", "reverse proxy", "load balancer", "api gateway", "nginx", "tls termination"] },
          { id: "1.4", title: "HTTP, HTTPS and TLS", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "The request and response, methods and status codes, what the TLS handshake costs in round trips, and what HTTP/2 and HTTP/3 change.",
            keywords: ["http", "https", "tls", "handshake", "status codes", "http2", "http3", "quic"] },
          { id: "1.5", title: "API Styles: REST, GraphQL and gRPC", difficulty: "core", minutes: 30, tier: "must",
            summary: "Resources against queries against procedures, the over- and under-fetching each one fixes, and the API design rules — naming, versioning, pagination, idempotency keys — that outlive the choice.",
            keywords: ["rest", "graphql", "grpc", "api design", "versioning", "pagination", "cursor", "n+1"] },
          { id: "1.6", title: "Keeping a Connection Open: Polling, SSE, WebSockets, Webhooks", difficulty: "core", minutes: 26, tier: "must",
            summary: "Four ways for a server to tell a client something changed, what each costs to hold open, and the one that is server-to-server.",
            keywords: ["websockets", "webhooks", "sse", "long polling", "real time", "push"] }
        ]
      },

      /* ================================================================
         M2 · C §9-14, B §2-3, E 1-2
         ================================================================ */
      {
        id: "scaling",
        short: "M2",
        dir: "02_scaling",
        phase: "Phase 1 · The vocabulary",
        title: "Scaling the Core",
        blurb: "The first decisions a growing system makes: a bigger box or more boxes, why more boxes need statelessness, how a load balancer chooses, which database shape fits the access pattern, the index that makes it fast, and the resilient core that results.",
        outcome: "You can take a single-server design to a horizontally scaled one and say what had to change for each step to work.",
        source: "scaling.html §9-14 · foundations.html B §2-3 · patterns.html E §1-2",
        lessons: [
          { id: "2.1", title: "Vertical and Horizontal Scaling", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "Scale up until it stops, scale out when it does — and the session state that has to leave the server first.",
            keywords: ["vertical scaling", "horizontal scaling", "stateless", "session", "scale up", "scale out"] },
          { id: "2.2", title: "Load Balancing Algorithms and Health Checks", difficulty: "core", minutes: 28, tier: "must",
            summary: "Round robin to least connections to consistent hashing, L4 against L7, and the health check that decides whether a dead server keeps receiving traffic.",
            keywords: ["load balancing", "round robin", "least connections", "l4", "l7", "health check", "sticky sessions"] },
          { id: "2.3", title: "SQL or NoSQL: Choosing by Access Pattern", difficulty: "core", minutes: 30, tier: "must",
            summary: "Relational, document, key-value, wide-column and graph stores, chosen by how you will read the data rather than by fashion.",
            keywords: ["sql", "nosql", "document", "key value", "wide column", "graph", "schema"] },
          { id: "2.4", title: "Indexing", difficulty: "core", minutes: 28, tier: "must",
            summary: "From a full scan to a B-tree lookup, the composite index and its column order, and what every index costs on write.",
            keywords: ["index", "b-tree", "composite index", "covering index", "full scan", "write amplification"] },
          { id: "2.5", title: "Synthesis: The Resilient Core", difficulty: "core", minutes: 26, tier: "must",
            summary: "One server to a balanced, stateless, replicated tier, drawn stage by stage with the failure each stage removes.",
            keywords: ["synthesis", "single point of failure", "redundancy", "architecture evolution", "stateless tier"] }
        ]
      },

      /* ================================================================
         M3 · B §4, C §18 §22, D §6 §9, E 6-9, interview Q51-55
         ================================================================ */
      {
        id: "caching",
        short: "M3",
        dir: "03_caching",
        phase: "Phase 2 · Making it fast",
        title: "Caching",
        blurb: "Memory over disk: where caches sit, what a hit ratio buys, the four read and write strategies, invalidation and eviction, the stampede that follows a flush, and the CDN that moves the cache next to the user.",
        outcome: "You can choose a caching strategy for a read path, say what it costs in staleness, and protect it against the stampede.",
        source: "foundations.html B §4 · scaling.html §18, §22, D §6, §9 · patterns.html E §6-9",
        lessons: [
          { id: "3.1", title: "Why Cache: Hit Ratios and Where Caches Sit", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "The arithmetic of a hit ratio on mean and tail latency, and the five layers — browser to database — where a cache can live.",
            keywords: ["cache", "hit ratio", "redis", "memcached", "cache layers", "effective latency"] },
          { id: "3.2", title: "Cache-Aside, Read-Through, Write-Through, Write-Behind", difficulty: "core", minutes: 30, tier: "must",
            summary: "Four strategies, drawn as sequences, with the consistency and durability each one gives up.",
            keywords: ["cache aside", "read through", "write through", "write behind", "write back", "lazy loading"] },
          { id: "3.3", title: "Invalidation, TTLs and Eviction", difficulty: "core", minutes: 28, tier: "must",
            summary: "The hard problem: TTL against explicit invalidation, the race that leaves a stale value forever, and LRU, LFU and their cousins.",
            keywords: ["invalidation", "ttl", "lru", "lfu", "eviction", "stale data", "race condition"] },
          { id: "3.4", title: "Stampedes, Hot Keys and Penetration", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "Three ways a cache fails under load — a thousand misses at once, one key too popular, lookups for things that do not exist — and the fix for each.",
            keywords: ["cache stampede", "thundering herd", "hot key", "cache penetration", "bloom filter", "request coalescing"] },
          { id: "3.5", title: "CDNs and the Edge", difficulty: "core", minutes: 26, tier: "must",
            summary: "Moving the cache to within a few milliseconds of the user: push against pull, cache keys, purging, and what belongs at the edge.",
            keywords: ["cdn", "edge", "pop", "cache control", "purge", "origin shield", "static assets"] }
        ]
      },

      /* ================================================================
         M4 · B §5-6 §8, C §15-17 §19 §21, E 3-5 10 13, H §1-4 §7-8
         ================================================================ */
      {
        id: "data",
        short: "M4",
        dir: "04_data",
        phase: "Phase 2 · Making it fast",
        title: "Scaling the Data",
        blurb: "When one database stops being enough: replication and its lag, sharding and the key that makes or breaks it, consistent hashing, denormalisation and materialised views, blob storage, and the storage engines underneath.",
        outcome: "You can choose a replication topology and a shard key, predict the hot partition, and say why a store is fast at what it is fast at.",
        source: "foundations.html B §5-6, §8 · scaling.html §15-17, §19, §21 · patterns.html E §3-5, §10, §13 · distributed.html H §1-4, §7-8",
        lessons: [
          { id: "4.1", title: "Replication", difficulty: "core", minutes: 30, tier: "must",
            summary: "Leader-follower, multi-leader and leaderless; synchronous against asynchronous; and the replication lag that makes a user's own post vanish.",
            keywords: ["replication", "leader follower", "read replica", "replication lag", "read your writes", "multi leader"] },
          { id: "4.2", title: "Sharding and Partitioning", difficulty: "core", minutes: 30, tier: "must",
            summary: "Range, hash and directory partitioning, the shard key that decides everything, hot partitions, and the cross-shard query you gave up.",
            keywords: ["sharding", "partitioning", "shard key", "hot partition", "range", "hash", "resharding"] },
          { id: "4.3", title: "Consistent Hashing", difficulty: "core", minutes: 28, tier: "must",
            summary: "Why hash mod N moves almost every key when N changes, the ring that moves only 1/N, and the virtual nodes that even it out.",
            keywords: ["consistent hashing", "hash ring", "virtual nodes", "rebalancing", "mod n"] },
          { id: "4.4", title: "Denormalisation, Materialised Views and Blob Storage", difficulty: "core", minutes: 26, tier: "should",
            summary: "Trading space and write cost for read speed, keeping the copies honest, and why files never belong in the database.",
            keywords: ["denormalization", "materialized view", "blob storage", "s3", "object storage", "presigned url"] },
          { id: "4.5", title: "Storage Engines: B-Trees, LSM-Trees and the WAL", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "The two designs underneath every database, what each is fast and slow at, and the write-ahead log that makes either one survive a crash.",
            keywords: ["b-tree", "lsm tree", "wal", "write ahead log", "compaction", "sstable", "memtable"] }
        ]
      },

      /* ================================================================
         M5 · B §7, C §20, G §9-10, H §5-6, E 14-15
         ================================================================ */
      {
        id: "consistency",
        short: "M5",
        dir: "05_consistency",
        phase: "Phase 3 · Staying correct",
        title: "Consistency and Transactions",
        blurb: "What a distributed store promises and what it cannot: CAP read precisely and PACELC beside it, ACID and BASE, isolation levels and the anomalies each one allows, MVCC, the consistency spectrum and quorums, and transactions that span services.",
        outcome: "You can name the consistency a feature needs, choose the isolation level that gives it, and design a cross-service transaction that recovers.",
        source: "foundations.html B §7 · scaling.html §20 · distributed.html G §9-10, H §5-6 · patterns.html E §14-15",
        lessons: [
          { id: "5.1", title: "CAP and PACELC", difficulty: "core", minutes: 28, tier: "must",
            summary: "The theorem stated precisely — a choice made only during a partition — and the latency-consistency trade-off PACELC adds for the rest of the time.",
            keywords: ["cap theorem", "pacelc", "partition", "availability", "consistency", "cp", "ap"] },
          { id: "5.2", title: "ACID, Isolation Levels and MVCC", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "What each letter guarantees, the four isolation levels drawn against the anomalies they allow, and how MVCC lets readers and writers stop blocking each other.",
            keywords: ["acid", "isolation", "read committed", "repeatable read", "serializable", "mvcc", "write skew", "base"] },
          { id: "5.3", title: "Consistency Models and Quorums", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Linearizable to eventual on one line, the session guarantees in between, and R + W > N worked on real numbers.",
            keywords: ["linearizability", "eventual consistency", "causal", "quorum", "r w n", "read repair", "session guarantees"] },
          { id: "5.4", title: "Distributed Transactions: 2PC and Sagas", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Two-phase commit and the coordinator that blocks everyone, sagas with compensations, and choreography against orchestration.",
            keywords: ["two phase commit", "2pc", "saga", "compensation", "choreography", "orchestration", "distributed transaction"] }
        ]
      },

      /* ================================================================
         M6 · B §9, C §26 §28, E 16-20, H §9-10, interview Q71-76
         ================================================================ */
      {
        id: "async",
        short: "M6",
        dir: "06_async",
        phase: "Phase 3 · Staying correct",
        title: "Queues, Streams and Events",
        blurb: "Taking work out of the request: message queues and what they buffer, pub-sub and the log-based stream, delivery semantics and the idempotency that makes at-least-once safe, the outbox and change data capture, and stream processing.",
        outcome: "You can put a queue in a design for a stated reason, choose its delivery guarantee, and make the consumer safe to run twice.",
        source: "foundations.html B §9 · scaling.html §26, §28 · patterns.html E §16-20 · distributed.html H §9-10",
        lessons: [
          { id: "6.1", title: "Message Queues: Decoupling and Buffering", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "What a queue buys — absorbed spikes, independent failure, async work — the dead-letter queue, and the lag metric that says it is losing.",
            keywords: ["message queue", "rabbitmq", "sqs", "decoupling", "dead letter queue", "consumer lag", "buffer"] },
          { id: "6.2", title: "Pub-Sub and Event Streams", difficulty: "core", minutes: 30, tier: "must",
            summary: "A queue deletes and a log keeps: topics, partitions, offsets and consumer groups, and why ordering holds only within a partition.",
            keywords: ["pub sub", "kafka", "event stream", "partition", "offset", "consumer group", "ordering"] },
          { id: "6.3", title: "Delivery Semantics and Idempotency", difficulty: "core", minutes: 30, tier: "must",
            summary: "At-most-once, at-least-once and the exactly-once that is really at-least-once plus deduplication — and the idempotency key that makes a retry harmless.",
            keywords: ["at least once", "exactly once", "idempotency", "idempotency key", "deduplication", "retry"] },
          { id: "6.4", title: "The Outbox Pattern and Change Data Capture", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "The dual write that loses events, the outbox that fixes it in one transaction, and CDC reading the database's own log.",
            keywords: ["outbox", "dual write", "cdc", "change data capture", "debezium", "transactional outbox"] },
          { id: "6.5", title: "Stream Processing and Event-Driven Architecture", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Windows, watermarks and late data; stateful operators; webhooks at the edge; and what an event-driven system costs to debug.",
            keywords: ["stream processing", "flink", "window", "watermark", "event driven", "webhook", "late data"] }
        ]
      },

      /* ================================================================
         M7 · B §12-13, C §27, E 21-25, G §16, interview Q11 Q17
         ================================================================ */
      {
        id: "resilience",
        short: "M7",
        dir: "07_resilience",
        phase: "Phase 3 · Staying correct",
        title: "Resilience Patterns",
        blurb: "Designing for the dependency that is slow rather than down: timeouts and retries with jittered backoff, circuit breakers and bulkheads, the rate-limiting algorithms, backpressure and load shedding, and failover.",
        outcome: "You can stop one slow dependency from taking down a whole system, and say which pattern stops which failure.",
        source: "foundations.html B §12-13 · scaling.html §27 · patterns.html E §21-25 · distributed.html G §16",
        lessons: [
          { id: "7.1", title: "Timeouts, Retries and Backoff with Jitter", difficulty: "core", minutes: 28, tier: "must",
            summary: "The timeout every call needs, retry budgets, and the jitter that stops a thousand clients retrying in step.",
            keywords: ["timeout", "retry", "exponential backoff", "jitter", "retry storm", "retry budget"] },
          { id: "7.2", title: "Circuit Breakers and Bulkheads", difficulty: "core", minutes: 28, tier: "must",
            summary: "Closed, open and half-open drawn as a state machine, and the separate pools that keep one failure in one compartment.",
            keywords: ["circuit breaker", "bulkhead", "half open", "fail fast", "cascading failure", "isolation"] },
          { id: "7.3", title: "Rate Limiting Algorithms", difficulty: "core", minutes: 30, tier: "must",
            summary: "Token bucket, leaky bucket, fixed window, sliding log and sliding counter — traced on the same burst — and the 429 a client should respect.",
            keywords: ["rate limiting", "token bucket", "leaky bucket", "fixed window", "sliding window", "429"] },
          { id: "7.4", title: "Backpressure and Load Shedding", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Saying no early and cheaply, bounded queues, priority shedding, and why an unbounded queue is a latency bomb.",
            keywords: ["backpressure", "load shedding", "bounded queue", "flow control", "priority", "admission control"] },
          { id: "7.5", title: "Failover and Redundancy", difficulty: "core", minutes: 26, tier: "must",
            summary: "Active-passive against active-active, what a nine costs, RTO and RPO, and the failover that has never been tested.",
            keywords: ["failover", "redundancy", "active passive", "active active", "rto", "rpo", "availability nines"] }
        ]
      },

      /* ================================================================
         M8 · G §1-8 §11-15 §17-19
         ================================================================ */
      {
        id: "distributed",
        short: "M8",
        dir: "08_distributed",
        phase: "Phase 4 · Distributed systems",
        title: "Distributed Systems Theory",
        blurb: "Why a system of many computers is a different kind of thing: the fallacies and failure models, time and ordering without a shared clock, consensus with Raft, leader election and the fencing token, gossip and failure detection, split brain, CRDTs and Byzantine faults.",
        outcome: "You can explain why a distributed lock without fencing is unsafe, how Raft survives a partition, and when a CRDT replaces consensus.",
        source: "distributed.html G §1-8, §11-15, §17-19",
        lessons: [
          { id: "8.1", title: "Why Distributed Is Hard: Fallacies and Failure Models", difficulty: "core", minutes: 28, tier: "must",
            summary: "The eight fallacies, partial failure, and crash-stop against crash-recovery against Byzantine — the assumption every protocol makes first.",
            keywords: ["fallacies", "partial failure", "failure model", "crash stop", "byzantine", "network partition"] },
          { id: "8.2", title: "Time and Ordering", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Why wall clocks lie, Lamport timestamps, vector clocks traced on three nodes, and hybrid logical clocks.",
            keywords: ["clock skew", "lamport clock", "vector clock", "happens before", "hlc", "ntp", "ordering"] },
          { id: "8.3", title: "Consensus with Raft", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Terms, elections and log replication, drawn through a partition — and why a majority is the whole trick.",
            keywords: ["consensus", "raft", "paxos", "leader", "term", "log replication", "majority", "etcd"] },
          { id: "8.4", title: "Leader Election, Distributed Locks and Fencing Tokens", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Leases, the paused process that still thinks it holds the lock, and the fencing token that makes the storage refuse it.",
            keywords: ["leader election", "distributed lock", "lease", "fencing token", "redlock", "zookeeper"] },
          { id: "8.5", title: "Gossip, Failure Detection and Split Brain", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Epidemic dissemination, heartbeats and the phi-accrual detector, and the two leaders a partition can create.",
            keywords: ["gossip", "failure detection", "heartbeat", "phi accrual", "split brain", "swim"] },
          { id: "8.6", title: "CRDTs, Snapshots and Byzantine Faults", difficulty: "expert", minutes: 30, tier: "should",
            summary: "Data types that merge without coordination, the Chandy-Lamport snapshot, and when you need to tolerate liars.",
            keywords: ["crdt", "g-counter", "or-set", "chandy lamport", "snapshot", "byzantine fault tolerance", "pbft"] }
        ]
      },

      /* ================================================================
         M9 · A (Software Design Principles)
         ================================================================ */
      {
        id: "principles",
        short: "M9",
        dir: "09_principles",
        phase: "Phase 5 · Design at every scale",
        title: "Code-Level Design",
        blurb: "Design at the scale of a module: the SOLID principles with a violation and a repair for each, DRY, KISS and YAGNI, coupling and cohesion, dependency injection, and the creational, structural and behavioural patterns that recur in system design.",
        outcome: "You can name the principle a piece of code violates, repair it, and say which pattern the repair is.",
        source: "foundations.html A (Software Design Principles)",
        lessons: [
          { id: "9.1", title: "SOLID", difficulty: "core", minutes: 32, tier: "must",
            summary: "Five principles, each shown as a violation, the bug it causes, and the repair.",
            keywords: ["solid", "srp", "ocp", "lsp", "isp", "dip", "single responsibility"] },
          { id: "9.2", title: "DRY, KISS, YAGNI, Coupling and Cohesion", difficulty: "core", minutes: 28, tier: "must",
            summary: "The heuristics, where each one misleads, the Law of Demeter, composition over inheritance, and dependency injection.",
            keywords: ["dry", "kiss", "yagni", "coupling", "cohesion", "law of demeter", "composition", "dependency injection"] },
          { id: "9.3", title: "Creational Patterns", difficulty: "core", minutes: 26, tier: "should",
            summary: "Singleton, factory and builder, what each solves, and the singleton that is really a global variable.",
            keywords: ["singleton", "factory", "abstract factory", "builder", "creational"] },
          { id: "9.4", title: "Structural Patterns", difficulty: "core", minutes: 26, tier: "should",
            summary: "Adapter, decorator, facade and proxy — four wrappers, told apart by what the wrapper changes.",
            keywords: ["adapter", "decorator", "facade", "proxy", "structural"] },
          { id: "9.5", title: "Behavioural Patterns", difficulty: "core", minutes: 26, tier: "should",
            summary: "Strategy, observer and chain of responsibility — and the system-design patterns each one grows into.",
            keywords: ["strategy", "observer", "chain of responsibility", "pub sub", "middleware", "behavioural"] }
        ]
      },

      /* ================================================================
         M10 · F, A §19, B §11, E 11-12 26-30
         ================================================================ */
      {
        id: "architecture",
        short: "M10",
        dir: "10_architecture",
        phase: "Phase 5 · Design at every scale",
        title: "Architecture Patterns",
        blurb: "Design at the scale of a system: monolith, modular monolith and microservices; domain-driven design; layered, hexagonal and clean architecture; event sourcing with CQRS; the gateway, discovery, sidecar and mesh; and how to get from one architecture to another without stopping.",
        outcome: "You can choose an architecture for a team and a domain, draw its boundaries, and plan the migration to it.",
        source: "patterns.html F §1-17, E §11-12, §26-30 · foundations.html A §19, B §11",
        lessons: [
          { id: "10.1", title: "Monolith, Modular Monolith, Microservices", difficulty: "core", minutes: 30, tier: "must",
            summary: "The evolution and the cost of each step, why the modular monolith is usually the right answer, and the distributed monolith that is the wrong one.",
            keywords: ["monolith", "modular monolith", "microservices", "distributed monolith", "conway's law"] },
          { id: "10.2", title: "Domain-Driven Design", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Bounded contexts, aggregates and the ubiquitous language, applied to an e-commerce platform until the service boundaries fall out.",
            keywords: ["ddd", "bounded context", "aggregate", "ubiquitous language", "context map", "domain events"] },
          { id: "10.3", title: "Layered, Hexagonal and Clean Architecture", difficulty: "core", minutes: 28, tier: "should",
            summary: "Three ways to point the dependencies inward, ports and adapters, and the test that proves the core is independent.",
            keywords: ["layered architecture", "hexagonal", "ports and adapters", "clean architecture", "dependency rule"] },
          { id: "10.4", title: "Event Sourcing and CQRS", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Storing what happened instead of what is, rebuilding state by replay, and separating the write model from the read model.",
            keywords: ["event sourcing", "cqrs", "event store", "projection", "snapshot", "read model"] },
          { id: "10.5", title: "Gateway, Discovery, Sidecar and Service Mesh", difficulty: "core", minutes: 28, tier: "must",
            summary: "The infrastructure between services: one front door, a registry of who is where, and the proxy beside every service that does the networking.",
            keywords: ["api gateway", "service discovery", "sidecar", "service mesh", "istio", "envoy", "bff"] },
          { id: "10.6", title: "Migration, Cells, ADRs and Anti-Patterns", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "The strangler fig, cell-based architecture for blast radius, data mesh, recording decisions in ADRs, and the anti-patterns to recognise.",
            keywords: ["strangler fig", "cell based architecture", "data mesh", "adr", "anti patterns", "evolutionary architecture"] }
        ]
      },

      /* ================================================================
         M11 · D, B §14
         ================================================================ */
      {
        id: "performance",
        short: "M11",
        dir: "11_performance",
        phase: "Phase 6 · Operating it",
        title: "Performance and Reliability Engineering",
        blurb: "The numbers behind a running system: percentiles and tail latency, Little's Law and queuing, Amdahl's Law, connection pools and database tuning, auto-scaling and load testing, SLOs and error budgets with the observability that feeds them, chaos engineering and cost.",
        outcome: "You can size a pool from a latency and a rate, set an SLO with a budget, and find where a slow request spends its time.",
        source: "scaling.html D §1-15 · foundations.html B §14",
        lessons: [
          { id: "11.1", title: "Percentiles and Tail Latency", difficulty: "core", minutes: 28, tier: "must",
            summary: "Why the mean lies, p50 to p99.9, fan-out amplification of the tail, and hedged requests.",
            keywords: ["percentiles", "p99", "tail latency", "fan out", "hedged requests", "mean"] },
          { id: "11.2", title: "Little's Law, Queuing and Amdahl", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "L = lambda W worked on a pool, the utilisation curve that explodes near 100%, and the serial fraction that caps speed-up.",
            keywords: ["little's law", "queuing theory", "utilisation", "amdahl's law", "throughput", "concurrency"] },
          { id: "11.3", title: "Connection Pools and Database Performance", difficulty: "core", minutes: 28, tier: "must",
            summary: "What a connection costs, sizing a pool, PgBouncer, the N+1 query, and reading a query plan.",
            keywords: ["connection pool", "pgbouncer", "n+1", "query plan", "explain", "slow query"] },
          { id: "11.4", title: "Auto-Scaling and Load Testing", difficulty: "core", minutes: 28, tier: "should",
            summary: "Reactive, scheduled and predictive scaling, the metric to scale on, and load, stress, soak and spike tests.",
            keywords: ["autoscaling", "hpa", "load testing", "stress test", "soak test", "capacity planning"] },
          { id: "11.5", title: "SLOs, Error Budgets and Observability", difficulty: "core", minutes: 30, tier: "must",
            summary: "SLI, SLO and SLA told apart, the error budget as a release policy, and the metrics, logs and traces that measure it.",
            keywords: ["sli", "slo", "sla", "error budget", "observability", "metrics", "tracing", "red", "use"] },
          { id: "11.6", title: "Chaos Engineering and Cost", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Breaking it on purpose with a hypothesis and a blast radius, and the cost levers that do not trade away reliability.",
            keywords: ["chaos engineering", "game day", "blast radius", "cost optimisation", "spot instances", "rightsizing"] }
        ]
      },

      /* ================================================================
         M12 · I, E A1-A2
         ================================================================ */
      {
        id: "security",
        short: "M12",
        dir: "12_security",
        phase: "Phase 6 · Operating it",
        title: "Security and Cloud Architecture",
        blurb: "Who you are and what you may do: authentication and authorisation, OAuth 2.0 and OpenID Connect, JWTs and their revocation problem, zero trust and API security, encryption and secrets, then the cloud: networks and subnets, serverless against containers, infrastructure as code and compliance.",
        outcome: "You can secure a service-to-service call, choose a token format, and lay out a VPC that keeps the database off the internet.",
        source: "security.html I §1-12 · patterns.html E A1-A2",
        lessons: [
          { id: "12.1", title: "Authentication, Authorisation, OAuth and OIDC", difficulty: "core", minutes: 30, tier: "must",
            summary: "AuthN against AuthZ, RBAC and ABAC, the authorization-code flow with PKCE drawn step by step, and what OIDC adds.",
            keywords: ["authentication", "authorization", "oauth", "oidc", "pkce", "rbac", "abac"] },
          { id: "12.2", title: "JWT and Opaque Tokens", difficulty: "core", minutes: 28, tier: "must",
            summary: "What is inside a JWT, why it cannot be revoked, short-lived access with refresh tokens, and when an opaque token is better.",
            keywords: ["jwt", "opaque token", "refresh token", "revocation", "signature", "jwks"] },
          { id: "12.3", title: "Zero Trust, API Security, Encryption and Secrets", difficulty: "core", minutes: 30, tier: "must",
            summary: "Never trust the network, mTLS between services, the OWASP API risks, encryption at rest and in transit, and a secret's life cycle.",
            keywords: ["zero trust", "mtls", "owasp", "encryption", "kms", "secrets management", "vault"] },
          { id: "12.4", title: "VPCs, Subnets and Cloud-Native Patterns", difficulty: "core", minutes: 28, tier: "should",
            summary: "Public and private subnets, the NAT gateway, security groups, and the cloud-native patterns that assume the box will die.",
            keywords: ["vpc", "subnet", "nat gateway", "security group", "cloud native", "twelve factor"] },
          { id: "12.5", title: "Serverless, Containers, IaC and Compliance", difficulty: "core", minutes: 28, tier: "should",
            summary: "Choosing serverless or containers on the numbers, multi-cloud honestly assessed, infrastructure as code, and compliance as an architectural input.",
            keywords: ["serverless", "lambda", "containers", "kubernetes", "terraform", "iac", "multi cloud", "gdpr"] }
        ]
      },

      /* ================================================================
         M13 · J, interview Q146-185
         ================================================================ */
      {
        id: "mlsys",
        short: "M13",
        dir: "13_mlsys",
        phase: "Phase 7 · Applied",
        title: "ML and LLM System Design",
        blurb: "Systems whose behaviour comes from data: the ML design framework, data and feature pipelines, training infrastructure, online against batch inference and serving optimisation, monitoring and retraining, experiments, the classic case studies, and LLM systems at scale.",
        outcome: "You can run an ML system design interview from problem framing to monitoring, and design the serving path for a model or an LLM.",
        source: "ml.html J §1-17 · interview.html Q146-185",
        lessons: [
          { id: "13.1", title: "The ML System Design Framework", difficulty: "core", minutes: 28, tier: "must",
            summary: "Business goal to ML objective to metrics, the baseline, and the seven stages every ML design answer walks through.",
            keywords: ["ml system design", "framework", "problem formulation", "metrics", "baseline", "online metrics"] },
          { id: "13.2", title: "Data Pipelines, Feature Stores and Skew", difficulty: "core", minutes: 30, tier: "must",
            summary: "Batch and streaming features, the feature store's two halves, point-in-time correctness, and training-serving skew.",
            keywords: ["feature store", "training serving skew", "point in time", "data pipeline", "feature engineering"] },
          { id: "13.3", title: "Training, Inference and Serving", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Distributed training, online against batch inference, and the serving optimisations — batching, distillation, quantisation, caching.",
            keywords: ["training infrastructure", "online inference", "batch inference", "model serving", "distillation", "quantization"] },
          { id: "13.4", title: "Monitoring, Retraining and Experiments", difficulty: "core", minutes: 28, tier: "must",
            summary: "Data drift and concept drift, the retraining trigger, shadow and canary deployment, A/B tests for models, and fairness checks.",
            keywords: ["monitoring", "drift", "retraining", "a/b testing", "shadow", "canary", "fairness"] },
          { id: "13.5", title: "Case Studies: Recommendations, Fraud, Ranking, Ads", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Four classic designs side by side: the two-stage funnel, the latency budget, the label delay and the calibration each one turns on.",
            keywords: ["recommendation system", "fraud detection", "search ranking", "ad click prediction", "two tower", "candidate generation"] },
          { id: "13.6", title: "LLM Systems at Scale", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "A RAG system for millions of documents, LLM serving at 10K QPS, a customer-support assistant and a multi-agent workflow — the boxes and the numbers.",
            keywords: ["llm system design", "rag", "llm serving", "semantic cache", "agents", "guardrails", "gpu"] }
        ]
      },

      /* ================================================================
         M14 · K
         ================================================================ */
      {
        id: "realworld",
        short: "M14",
        dir: "14_realworld",
        phase: "Phase 7 · Applied",
        title: "Real-World Architectures",
        blurb: "How the large companies actually built theirs, read for the decisions rather than the logos: Netflix, YouTube, Amazon, Meta, Uber, Slack and Discord, Stripe, Twitter and LinkedIn — and the patterns they share.",
        outcome: "You can cite a real system's decision as evidence for your own, and say what in its situation made that decision right.",
        source: "ml.html K §1-11",
        lessons: [
          { id: "14.1", title: "Netflix, YouTube and Amazon", difficulty: "core", minutes: 30, tier: "should",
            summary: "Streaming at a third of the internet's traffic, video at upload scale, and the two-pizza teams behind service-oriented architecture.",
            keywords: ["netflix", "youtube", "amazon", "open connect", "chaos monkey", "two pizza teams"] },
          { id: "14.2", title: "Meta, Uber, Twitter and LinkedIn", difficulty: "core", minutes: 30, tier: "should",
            summary: "TAO and the social graph, geospatial dispatch, fan-out on write against read, and Kafka's birthplace.",
            keywords: ["meta", "tao", "uber", "h3", "twitter", "fan out", "linkedin", "kafka"] },
          { id: "14.3", title: "Slack, Discord, Stripe and the Common Patterns", difficulty: "core", minutes: 28, tier: "should",
            summary: "Real-time messaging, Discord's move from Cassandra to ScyllaDB, Stripe's idempotency, and the eight patterns every giant ended up with.",
            keywords: ["slack", "discord", "scylladb", "stripe", "idempotency", "common patterns"] }
        ]
      },

      /* ================================================================
         M15 · L, B §15-16
         ================================================================ */
      {
        id: "interview",
        short: "M15",
        dir: "15_interview",
        phase: "Phase 8 · The interview",
        title: "The System Design Interview",
        blurb: "The interview as a method: the four-step process and the non-functional checklist, capacity estimation, four full walkthroughs — URL shortener, rate limiter and distributed cache, notification system, news feed and chat — and what separates a staff-level answer from a senior one.",
        outcome: "You can run a forty-five-minute design interview end to end, with the numbers, the trade-offs and the deep dive the interviewer is waiting for.",
        source: "interview.html L §1-14 · foundations.html B §15-16",
        lessons: [
          { id: "15.1", title: "The Four-Step Method and the NFR Checklist", difficulty: "core", minutes: 28, tier: "must",
            summary: "Requirements, high-level design, deep dive, wrap-up — the minutes for each, and the non-functional questions to ask first.",
            keywords: ["interview framework", "requirements", "non functional requirements", "high level design", "deep dive"] },
          { id: "15.2", title: "Capacity Estimation", difficulty: "core", minutes: 30, tier: "must",
            summary: "QPS, storage and bandwidth from a daily-active-user count, the powers of ten to memorise, and the estimate that changes the design.",
            keywords: ["capacity estimation", "back of envelope", "qps", "storage", "bandwidth", "dau"] },
          { id: "15.3", title: "Walkthrough: URL Shortener", difficulty: "core", minutes: 34, tier: "must",
            summary: "The canonical problem done properly: key generation, base62, the 100:1 read path, redirects and analytics.",
            keywords: ["url shortener", "base62", "key generation", "redirect", "301", "302", "tinyurl"] },
          { id: "15.4", title: "Walkthrough: Rate Limiter and Distributed Cache", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "A rate limiter for a global gateway with Redis and Lua, and a distributed cache with sharding, replication and eviction.",
            keywords: ["rate limiter design", "distributed cache", "redis", "lua", "token bucket", "replication"] },
          { id: "15.5", title: "Walkthrough: Notifications, News Feed and Chat", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Three fan-out problems: a notification system with priorities and retries, a feed with the celebrity problem, and chat with presence and ordering.",
            keywords: ["notification system", "news feed", "chat system", "fan out", "celebrity problem", "presence", "websocket"] },
          { id: "15.6", title: "Trade-Offs, Red Flags and the Staff-Level Answer", difficulty: "advanced", minutes: 28, tier: "must",
            summary: "The trade-off framework, technology selection, the red and green flags interviewers note, and what staff-plus expectations add.",
            keywords: ["trade offs", "technology selection", "red flags", "green flags", "staff engineer", "adr"] }
        ]
      }
    ]
  });
})();
