/* ============================================================================
   LESSON 9.3 — Creational Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "9.3",

  lede: "Creational patterns answer one question: **who builds an object, and who decides which one?** A **singleton** guarantees one instance — and is usually a global variable with good branding, one per process rather than one per system. A **factory** decides which concrete class to build, so callers never name it, and an **abstract factory** builds a whole matching family at once. A **builder** assembles a complex object step by step and checks the result before handing it over. Each is shown with the bug it prevents or, in the singleton's case, the bugs it causes.",

  objectives: [
    "Explain why a singleton is one per process, and race a lazy one into existing eight times",
    "Replace singletons with one instance created in the composition root and injected",
    "Use a factory and an abstract factory to choose implementations by environment",
    "Build a query builder that makes injection impossible and refuses unbounded queries",
    "Recognise the creational patterns that matter at system scale: pools and prototypes"
  ],

  prerequisites: ["9.1"],

  blocks: [

    { t: "diagram", kind: "compare", title: "The patterns in this module, by the question each answers",
      caption: "The Gang of Four catalogue (1994) has 23 patterns in three families. These ten are the ones that recur in system design, and each grows into an architectural pattern later in the course.",
      columns: [
        { title: "Creational: who builds it? (9.3)", tone: "good", items: ["Singleton: one instance", "Factory: picks the class", "Builder: assembles, then validates"] },
        { title: "Structural: how wrapped? (9.4)", tone: "violet", items: ["Adapter: converts an interface", "Decorator: adds behaviour", "Facade: hides a subsystem", "Proxy: controls access"] },
        { title: "Behavioural: who decides? (9.5)", tone: "warn", items: ["Strategy: swaps an algorithm", "Observer: notifies subscribers", "Chain: passes a request along"] }
      ] },

    { t: "h2", n: "01", id: "singleton", text: "Singleton",
      sub: "One instance — per process, if you are lucky" },

    { t: "p", text: "A singleton class ensures there is only one instance of itself and gives global access to it: `Settings.instance()` anywhere returns the same object. It is the most used and most criticised pattern in the catalogue, because the two properties it bundles — exactly one, reachable from anywhere — each cause trouble. The lazy version is not even guaranteed to be one:" },

    { t: "code", lang: "python", title: "singleton.py — a start-up race, and a 'global' limiter", code: `import multiprocessing, threading, time

class Settings:
    """The textbook lazy singleton: create on first use, return the same object after that."""
    _instance, created = None, 0
    @classmethod
    def instance(cls):
        if cls._instance is None:                  # two threads can both see None here ...
            time.sleep(0.01)                       # (loading a file, a network call: anything that yields)
            Settings.created += 1
            cls._instance = cls()                  # ... and both create one
        return cls._instance

class LockedSettings(Settings):
    _instance, created, _lock = None, 0, threading.Lock()
    @classmethod
    def instance(cls):
        if cls._instance is None:
            with cls._lock:                        # double-checked: only the first caller builds it
                if cls._instance is None:
                    time.sleep(0.01); LockedSettings.created += 1; cls._instance = cls()
        return cls._instance

for cls in (Settings, LockedSettings):
    threads = [threading.Thread(target=cls.instance) for _ in range(8)]
    for t in threads: t.start()
    for t in threads: t.join()
    print(f"{cls.__name__:<15} 8 threads at start-up -> {cls.created} instance(s) created")

class RateLimiter:
    """'One global limiter' as a singleton: 100 requests per minute."""
    _instance = None
    def __init__(self): self.allowed = 0
    @classmethod
    def instance(cls):
        if cls._instance is None: cls._instance = cls()
        return cls._instance
    def allow(self):
        if self.allowed < 100: self.allowed += 1; return True
        return False

def worker(requests, results):                     # one web-server worker process
    results.put(sum(RateLimiter.instance().allow() for _ in range(requests)))

if __name__ == "__main__":
    ctx = multiprocessing.get_context("fork"); results = ctx.Queue()
    procs = [ctx.Process(target=worker, args=(150, results)) for _ in range(4)]   # like gunicorn -w 4
    for p in procs: p.start()
    allowed = [results.get() for _ in procs]
    for p in procs: p.join()
    print(f"RateLimiter     limit 100/min, 600 requests over 4 worker processes -> {sum(allowed)} allowed {allowed}")`,
      hl: [8, 9, 11, 19, 20],
      out: `Settings        8 threads at start-up -> 8 instance(s) created
LockedSettings  8 threads at start-up -> 1 instance(s) created
RateLimiter     limit 100/min, 600 requests over 4 worker processes -> 400 allowed [100, 100, 100, 100]` },

    { t: "p", text: "Eight threads asked for the settings at start-up, and the check-then-create gap let **all eight** build their own; the double-checked lock fixed it. The second result is the one that bites in production: a rate limiter written as a singleton, run the way web servers run Python — several worker processes — allowed **400 requests against a limit of 100**. Each process has its own memory and therefore its own \"only\" instance." },

    { t: "viz", title: "\"One instance\" across a real deployment",
      caption: "A singleton is scoped to the process that created it. Three pods with four workers each hold twelve independent rate limiters, so a limit meant for the service is enforced twelve times over. Anything that must be one per system — a limit, a counter, a scheduler that must not double-run — needs shared state (Redis, 7.3) or a leader (8.4), not a class pattern.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="One singleton per process">
<rect x="20" y="22" width="230" height="150" rx="12" style="fill:var(--accent);fill-opacity:.05;stroke:var(--accent);stroke-dasharray:5 4"/>
<text x="32" y="40" class="s-sub" style="fill:var(--accent)">pod 1</text>
<rect x="30" y="50" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="80" y="70" text-anchor="middle" class="s-sub">worker 1</text>
<text x="80" y="88" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="140" y="50" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="190" y="70" text-anchor="middle" class="s-sub">worker 2</text>
<text x="190" y="88" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="30" y="108" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="80" y="128" text-anchor="middle" class="s-sub">worker 3</text>
<text x="80" y="146" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="140" y="108" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="190" y="128" text-anchor="middle" class="s-sub">worker 4</text>
<text x="190" y="146" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="265" y="22" width="230" height="150" rx="12" style="fill:var(--accent);fill-opacity:.05;stroke:var(--accent);stroke-dasharray:5 4"/>
<text x="277" y="40" class="s-sub" style="fill:var(--accent)">pod 2</text>
<rect x="275" y="50" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="325" y="70" text-anchor="middle" class="s-sub">worker 1</text>
<text x="325" y="88" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="385" y="50" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="435" y="70" text-anchor="middle" class="s-sub">worker 2</text>
<text x="435" y="88" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="275" y="108" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="325" y="128" text-anchor="middle" class="s-sub">worker 3</text>
<text x="325" y="146" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="385" y="108" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="435" y="128" text-anchor="middle" class="s-sub">worker 4</text>
<text x="435" y="146" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="510" y="22" width="230" height="150" rx="12" style="fill:var(--accent);fill-opacity:.05;stroke:var(--accent);stroke-dasharray:5 4"/>
<text x="522" y="40" class="s-sub" style="fill:var(--accent)">pod 3</text>
<rect x="520" y="50" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="570" y="70" text-anchor="middle" class="s-sub">worker 1</text>
<text x="570" y="88" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="630" y="50" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="680" y="70" text-anchor="middle" class="s-sub">worker 2</text>
<text x="680" y="88" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="520" y="108" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="570" y="128" text-anchor="middle" class="s-sub">worker 3</text>
<text x="570" y="146" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<rect x="630" y="108" width="100" height="50" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
<text x="680" y="128" text-anchor="middle" class="s-sub">worker 4</text>
<text x="680" y="146" text-anchor="middle" class="s-mono" style="fill:var(--warn)">100/min</text>
<text x="380" y="200" text-anchor="middle" class="s-sub">RateLimiter.instance() is one object per PROCESS: 3 pods × 4 workers = 12 limiters</text>
<text x="380" y="222" text-anchor="middle" class="s-label" style="fill:var(--crit)">"100 requests per minute" lets the fleet through 1,200</text>
</svg>` },

    { t: "callout", kind: "trap", title: "The singleton is a global variable",
      body: [
        { t: "p", text: "Reaching for `Settings.instance()` inside a function hides a dependency: the signature does not show it, a test cannot pass a different one, and state left by one test leaks into the next. In a threaded server, any per-request data stored on a singleton — the current user, a transaction — is shared by every request at once, which is how one customer sees another's data (the incident below)." },
        { t: "p", text: "The repair keeps the useful half. Create **one instance in the composition root** (9.2) and pass it to whatever needs it: there is still exactly one per process, by construction, and every dependency is visible and replaceable. In Python, a module-level object created once at import is the idiomatic version of \"one per process\" — with the same testing caveats." }
      ] },

    { t: "h2", n: "02", id: "factory", text: "Factory and abstract factory",
      sub: "The caller asks for a role; the factory picks the class" },

    { t: "p", text: "A **factory** is a function or method that decides which concrete class to instantiate, so callers depend on the role (a queue, a blob store) rather than the vendor. In Python the simplest factory is a dictionary of constructors — the registry of 9.1's open/closed section. An **abstract factory** goes one step further and builds a **family** of objects that must match each other: production on AWS gets SQS and S3, on GCP Pub/Sub and Cloud Storage, and tests get in-memory versions of both." },

    { t: "code", lang: "python", title: "factory.py — one family per environment, and a mixed configuration", code: `from dataclasses import dataclass

class Blobs:
    scheme = ""
    def __init__(self): self.files = {}
    def put(self, key, data): self.files[key] = data; return f"{self.scheme}://invoices/{key}"
    def get(self, url):
        if not url.startswith(self.scheme + "://"):
            raise ValueError(f"{type(self).__name__} cannot read {url}")
        return self.files[url.split("/")[-1]]
class S3Blobs(Blobs): scheme = "s3"
class GcsBlobs(Blobs): scheme = "gs"
class MemoryBlobs(Blobs): scheme = "mem"

class Queue:
    def __init__(self): self.messages = []
    def send(self, msg): self.messages.append(msg)
class SqsQueue(Queue): pass
class PubSubQueue(Queue): pass
class MemoryQueue(Queue): pass

@dataclass(frozen=True)
class Infra:                                            # a FAMILY of parts that must match
    queue: Queue
    blobs: Blobs

FAMILIES = {                                            # abstract factory: one entry per environment
    "aws":  lambda: Infra(SqsQueue(), S3Blobs()),
    "gcp":  lambda: Infra(PubSubQueue(), GcsBlobs()),
    "test": lambda: Infra(MemoryQueue(), MemoryBlobs()),
}
def make_infra(profile):
    if profile not in FAMILIES: raise ValueError(f"unknown profile {profile!r}; known: {sorted(FAMILIES)}")
    return FAMILIES[profile]()

def publish_invoice(infra, order_id, pdf):              # application code: no vendor names anywhere
    infra.queue.send({"order": order_id, "pdf": infra.blobs.put(f"{order_id}.pdf", pdf)})

def render_worker(infra):                               # the consumer, built from the same family
    msg = infra.queue.messages[-1]
    return f"{len(infra.blobs.get(msg['pdf']))} bytes from {msg['pdf']}"

for profile in ("aws", "gcp", "test"):
    infra = make_infra(profile)
    publish_invoice(infra, "o-1042", b"%PDF-1.7 ...")
    print(f"{profile:<5} {type(infra.queue).__name__:<12} {type(infra.blobs).__name__:<12} worker read {render_worker(infra)}")

mixed = Infra(SqsQueue(), GcsBlobs())                   # chosen piece by piece: QUEUE=sqs, BLOBS=gcs
publish_invoice(mixed, "o-1043", b"%PDF-1.7 ...")
worker = Infra(mixed.queue, S3Blobs())                  # the AWS worker reads with its own store
try: render_worker(worker)
except ValueError as e: print("mixed SqsQueue     GcsBlobs     worker failed:", e)`,
      hl: [27, 28, 29, 30, 31, 32, 33, 34, 48],
      out: `aws   SqsQueue     S3Blobs      worker read 12 bytes from s3://invoices/o-1042.pdf
gcp   PubSubQueue  GcsBlobs     worker read 12 bytes from gs://invoices/o-1042.pdf
test  MemoryQueue  MemoryBlobs  worker read 12 bytes from mem://invoices/o-1042.pdf
mixed SqsQueue     GcsBlobs     worker failed: S3Blobs cannot read gs://invoices/o-1043.pdf` },

    { t: "diagram", kind: "matrix", title: "What the abstract factory builds for each profile",
      caption: "The profile is the unit of choice, not each component. Configured piece by piece, a deployment can end up with an SQS queue carrying links to Google Cloud Storage that its AWS worker cannot read — the last line of the output. The factory makes the valid combinations the only ones that can be expressed.",
      cols: ["Queue", "Blob store", "Worker reads"],
      rows: ["aws", "gcp", "test", "QUEUE=sqs, BLOBS=gcs"],
      cells: [
        [{ text: "SqsQueue" }, { text: "S3Blobs" }, { text: "s3:// links", tone: "good" }],
        [{ text: "PubSubQueue" }, { text: "GcsBlobs" }, { text: "gs:// links", tone: "good" }],
        [{ text: "MemoryQueue" }, { text: "MemoryBlobs" }, { text: "mem:// links", tone: "good" }],
        [{ text: "SqsQueue", tone: "warn" }, { text: "GcsBlobs", tone: "warn" }, { text: "fails: wrong store", tone: "crit" }]
      ] },

    { t: "callout", kind: "insight", title: "Factories live at the edges",
      body: [
        { t: "p", text: "The factory call belongs in the composition root, read from configuration once at start-up. Business code receives the built objects and never sees a profile name — which is what lets the same `publish_invoice` run against S3 in production and a dictionary in tests. Plugin systems (Python entry points, Java's ServiceLoader) are factories whose registry is filled by installed packages instead of a literal dictionary." }
      ] },

    { t: "h2", n: "03", id: "builder", text: "Builder",
      sub: "Assemble step by step, validate once, then hand it over" },

    { t: "p", text: "A **builder** constructs a complex object through a series of calls and produces it only when `build()` is called — which is the moment to check that the whole thing is valid. Fluent query builders, HTTP request builders and infrastructure-as-code constructs are all builders. The classic tutorial query builder, though, pastes conditions in as strings, and that makes it an injection machine:" },

    { t: "code", lang: "python", title: "builder.py — a string-pasting builder against one that owns the rules", code: `import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""CREATE TABLE users (id INTEGER, name TEXT, active INTEGER);
    INSERT INTO users VALUES (1, 'asha', 1), (2, 'ben', 1), (3, 'chen', 0), (4, 'dara', 1);""")

class NaiveQuery:
    """The builder found in many tutorials: conditions are pasted in as strings."""
    def __init__(self, table): self.table, self.conds, self.n = table, [], None
    def where(self, condition): self.conds.append(condition); return self
    def limit(self, n): self.n = n; return self
    def build(self):
        sql = f"SELECT id, name FROM {self.table}"
        if self.conds: sql += " WHERE " + " AND ".join(self.conds)
        return sql + (f" LIMIT {self.n}" if self.n else "")

class Query:
    """A builder that owns the rules: known columns and operators, values as parameters, a limit."""
    COLUMNS = {"users": {"id", "name", "active"}}
    OPS = {"=", "!=", "<", "<=", ">", ">="}
    def __init__(self, table):
        if table not in self.COLUMNS: raise ValueError(f"unknown table {table!r}")
        self.table, self.conds, self.params, self.n = table, [], [], None
    def where(self, column, op, value):
        if column not in self.COLUMNS[self.table] or op not in self.OPS:
            raise ValueError(f"refused condition {column} {op}")
        self.conds.append(f"{column} {op} ?"); self.params.append(value); return self
    def limit(self, n): self.n = int(n); return self
    def build(self):
        if self.n is None: raise ValueError("refused: no limit() on a query that could return the table")
        sql = f"SELECT id, name FROM {self.table}"
        if self.conds: sql += " WHERE " + " AND ".join(self.conds)
        return sql + " LIMIT ?", (*self.params, self.n)

name = "nobody' OR '1'='1"                              # typed into a search box
naive = NaiveQuery("users").where("active = 1").where(f"name = '{name}'").limit(10).build()
print("naive :", naive, "\\n       ->", db.execute(naive).fetchall())

sql, params = Query("users").where("active", "=", 1).where("name", "=", name).limit(10).build()
print("safe  :", sql, params, "\\n       ->", db.execute(sql, params).fetchall())

for attempt in (lambda: Query("users").where("name", "=", "asha").build(),
                lambda: Query("users").where("1=1 OR name", "=", "x").limit(5).build()):
    try: attempt()
    except ValueError as e: print("build :", e)`,
      hl: [10, 24, 25, 26, 27, 30, 33],
      out: `naive : SELECT id, name FROM users WHERE active = 1 AND name = 'nobody' OR '1'='1' LIMIT 10 
       -> [(1, 'asha'), (2, 'ben'), (3, 'chen'), (4, 'dara')]
safe  : SELECT id, name FROM users WHERE active = ? AND name = ? LIMIT ? (1, "nobody' OR '1'='1", 10) 
       -> []
build : refused: no limit() on a query that could return the table
build : refused condition 1=1 OR name =` },

    { t: "p", text: "A search for the name `nobody' OR '1'='1` returned every user from the naive builder — including Chen, who is inactive, because the injected `OR` also defeated the `active = 1` filter. The builder that accepts only known columns and operators and passes values as parameters returned nothing, and its `build()` refused both an unbounded query and an injected column name." },

    { t: "diagram", kind: "steps", title: "What each call of the safe builder checks",
      items: [
        { label: "Start", desc: "The table must be one the builder knows.", code: "Query(\"users\")", tone: "accent" },
        { label: "Add conditions", desc: "Column and operator from a fixed list; the value becomes a ? parameter.", code: ".where(\"name\", \"=\", name)", tone: "violet" },
        { label: "Bound it", desc: "A limit is part of the object, not an afterthought.", code: ".limit(10)", tone: "teal" },
        { label: "Build", desc: "Refuse anything incomplete; return SQL and values separately.", code: ".build()", tone: "good" }
      ] },

    { t: "callout", kind: "tradeoff", title: "In Python, a builder is often just keyword arguments",
      body: [
        { t: "p", text: "Builders exist in Java largely to avoid constructors with a dozen positional parameters. Python's keyword arguments and dataclasses solve that directly: `Request(url, method=\"POST\", timeout=2.0, retries=3)` needs no builder (KISS, 9.2). A builder earns its place when construction is **conditional or incremental** — a query assembled from optional filters, a request built across several layers of middleware — or when the finished object must be **validated as a whole**." }
      ] },

    { t: "h2", n: "04", id: "at-scale", text: "Creational patterns at system scale",
      sub: "The two that every service uses without naming" },

    { t: "table", head: ["Pattern", "Solves", "Python idiom", "At system scale"], rows: [
      ["Singleton", "exactly one instance", "a module-level object, or one built in main()", "leader election (8.4), a single-writer service"],
      ["Factory", "choose a class at run time", "a dict of constructors", "adapters chosen by config, plugin loading"],
      ["Abstract factory", "a consistent family", "a function returning a bundle", "environment profiles, cloud abstraction layers"],
      ["Builder", "complex, validated construction", "keyword arguments, a fluent class", "query builders, infrastructure-as-code"],
      ["Prototype", "copy a configured object", "copy.deepcopy", "machine images, container images, templates"],
      ["Object pool", "reuse expensive objects", "a queue of idle instances", "connection pools, thread pools (11.3)"]
    ] },

    { t: "p", text: "The **object pool** is the creational pattern with the most production impact: opening a database connection costs a TCP handshake, TLS and authentication, and the database can hold only so many. A pool opens a bounded number once and lends them out. The exercise builds one." },

    { t: "exercise", kind: "Challenge", title: "A connection pool",
      difficulty: "core", minutes: 30,
      body: [
        { t: "p", text: "Opening a connection takes 50 ms and a query 20 ms. Twenty threads serve 200 requests. Build a pool that creates connections lazily up to a maximum, lends them through a context manager that always returns them, and raises a clear error when none is free within a timeout. Compare a new connection per request with pools of 20 and 5." }
      ],
      requirements: [
        "Create connections lazily, never more than the pool size",
        "Lend through a context manager that returns the connection even if the caller raises",
        "Block for up to a timeout when the pool is exhausted, then raise TimeoutError",
        "Report total time, connections opened and peak connections in use"
      ],
      hint: "A queue.Queue of idle connections handles the waiting and the timeout. Keep a count of connections created under a lock, and do the slow connect outside it.",
      solution: { lang: "python", title: "pool_ex.py",
        code: `import queue, threading, time
from contextlib import contextmanager

class Connection:
    opened = 0
    def __init__(self):
        time.sleep(0.05)                                 # a TCP + TLS + auth handshake is expensive
        Connection.opened += 1; self.id = Connection.opened
    def query(self, sql): time.sleep(0.02); return f"conn {self.id}: {sql}"

class Pool:
    """Object pool: create at most \`size\` connections, lend them out, take them back."""
    def __init__(self, size, timeout):
        self.idle, self.size, self.timeout = queue.LifoQueue(), size, timeout
        self.created, self.lock, self.in_use, self.peak = 0, threading.Lock(), 0, 0
    @contextmanager
    def connection(self):
        conn = self._acquire()
        try: yield conn
        finally:
            with self.lock: self.in_use -= 1
            self.idle.put(conn)                          # returned even if the caller raised
    def _acquire(self):
        with self.lock:
            grow = self.idle.empty() and self.created < self.size
            if grow: self.created += 1
        if grow: conn = Connection()                     # build outside the lock
        else:
            try: conn = self.idle.get(timeout=self.timeout)
            except queue.Empty: raise TimeoutError(f"no connection free within {self.timeout} s") from None
        with self.lock: self.in_use += 1; self.peak = max(self.peak, self.in_use)
        return conn

def run(label, pool_size=None, requests=200, threads=20):
    use_pool = pool_size is not None
    Connection.opened = 0; pool = Pool(size=pool_size or 1, timeout=2.0); start = time.perf_counter()
    def handle(i):
        if use_pool:
            with pool.connection() as c: c.query(f"SELECT {i}")
        else: Connection().query(f"SELECT {i}")          # a new connection per request
    work = list(range(requests))
    def drain():
        while work:
            try: i = work.pop()
            except IndexError: return
            handle(i)
    ts = [threading.Thread(target=drain) for _ in range(threads)]
    for t in ts: t.start()
    for t in ts: t.join()
    extra = f", peak in use {pool.peak}" if use_pool else ""
    print(f"{label:<26} {requests} requests: {time.perf_counter() - start:5.2f} s, {Connection.opened:>3} connections opened{extra}")

run("connect per request")
run("pool of 20", pool_size=20)
run("pool of 5", pool_size=5)

pool = Pool(size=1, timeout=0.1)
with pool.connection():                                  # hold the only connection ...
    try:
        with pool.connection(): pass                     # ... and ask for another
    except TimeoutError as e: print("exhausted pool            ", e)`,
        out: `connect per request        200 requests:  0.84 s, 200 connections opened
pool of 20                 200 requests:  7.00 s,  20 connections opened, peak in use 20
pool of 5                  200 requests: 17.18 s,   5 connections opened, peak in use 5
exhausted pool             no connection free within 0.1 s`,
        notes: [
          { t: "p", text: "A pool of 20 served the same 200 requests about three times faster than connecting per request, because it paid the 50 ms handshake 20 times instead of 200 — and the database saw 20 connections instead of a churn of 200." },
          { t: "p", text: "The pool of 5 was the slowest, and that is a feature: it caps the load this service can put on the database at five concurrent queries, and requests queue in the application instead. Pool size is a capacity decision — 11.3 sizes it with Little's law — and the timeout turns an overloaded database into a fast, clear error instead of a pile-up." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a singleton that showed customers each other's accounts",
      body: [
        { t: "p", text: "**Symptom.** A handful of customers reported seeing another person's name and order history on their account page. It happened only at peak traffic, never in testing, and never reproducibly." },
        { t: "p", text: "**Mechanism.** A `RequestContext` singleton held the current user, set by authentication middleware at the start of each request and read by the page templates. The service ran with a thread pool, so all concurrent requests in a process shared that one object. Under load, request B set the user between request A's authentication and its rendering, and A rendered B's account. Single-threaded tests had no way to show it." },
        { t: "p", text: "**Fix.** The current user is now passed explicitly through the call chain, with `contextvars` for the few places where that is impractical — a per-request, per-task context rather than a per-process one. The team added a load test with two users interleaving requests and asserting each page shows its own user, and searched the codebase for any other mutable singleton." }
      ] }
  ],

  takeaways: [
    "A **singleton** bundles two things — exactly one instance, reachable from anywhere — and both cause trouble.",
    "A lazy singleton is not thread-safe: measured, **eight threads created eight instances**; a double-checked lock created one.",
    "A singleton is **one per process**: a rate limiter written as one allowed **400 requests against a limit of 100** across four workers.",
    "Anything that must be one per **system** needs shared state or a leader (7.3, 8.4), not a class pattern.",
    "Prefer **one instance built in the composition root and injected**: still one per process, but visible and replaceable in tests.",
    "A **factory** lets callers ask for a role instead of a class; an **abstract factory** builds a **matching family**, so invalid combinations cannot be configured.",
    "A **builder** constructs step by step and **validates in build()**; string-pasting builders are injection machines — measured, one search returned every user, inactive ones included.",
    "In Python, keyword arguments and dataclasses replace most builders; use one when construction is conditional or must be validated as a whole.",
    "The **object pool** matters most at scale: a pool of 20 served 200 requests about **3× faster** than connecting per request and opened **20 connections instead of 200**."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service enforces an API limit with a RateLimiter singleton. It runs as 3 pods with 4 worker processes each. What limit does it actually enforce?",
        options: ["The configured limit, because a singleton has exactly one instance", "Up to 12 times the configured limit, because each process has its own instance", "Up to 3 times the limit, one per pod", "Half the limit, because instances share the count"],
        answer: 1,
        why: "A singleton is one object per process. Twelve processes hold twelve independent limiters, each allowing the full limit. Pods do not share memory either, and nothing makes instances share a count. A fleet-wide limit needs shared state such as Redis." },

      { stem: "Why does the lazy singleton in singleton.py create eight instances when eight threads call it at start-up?",
        options: ["Python creates one instance per thread by design", "Between checking that no instance exists and storing the new one, other threads also see none and create their own", "The class attribute is copied per thread", "time.sleep resets class attributes"],
        answer: 1,
        why: "Check-then-act without a lock is a race: every thread that checks before the first one finishes creating sees None. The delay simply widens the window that loading a file or making a network call would create anyway. Class attributes are shared across threads, which is why the lock fixes it." },

      { stem: "What does an abstract factory give you that a set of independent per-component factories does not?",
        options: ["Faster object creation", "A guarantee that the components built together are a consistent family, so invalid combinations cannot be configured", "Automatic thread safety", "The ability to create objects without classes"],
        answer: 1,
        why: "Choosing each component separately allows mismatches, such as an AWS queue carrying links to Google Cloud Storage. An abstract factory chooses the whole family at once. It has no effect on speed or thread safety, and still creates instances of classes." },

      { stem: "A query builder accepts where(\"name = '\" + name + \"'\"). What is the real fix?",
        options: ["Escape quotes in name before concatenating", "Accept only known columns and operators and pass values as bound parameters, separately from the SQL text", "Use an ORM for this one query", "Validate that name contains only letters"],
        answer: 1,
        why: "Parameters keep values out of the SQL text entirely, so no value can change the query's structure. Escaping by hand is error-prone and database-specific, allow-listing letters breaks legitimate names, and an ORM helps only because it does exactly this underneath." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Interviewers often use the singleton to test whether you can criticise a pattern.",
    questions: [
      { level: "core",
        q: "What is wrong with the singleton pattern, and what would you use instead?",
        strong: "A strong answer covers hidden dependencies, testing, thread safety and the per-process scope.",
        answer: [
          { t: "p", text: "It combines \"exactly one instance\" with \"global access\". Global access hides dependencies: functions reach for it instead of declaring it, so tests cannot substitute it and state leaks between them. Lazy creation races under threads, and any per-request data stored on it is shared across concurrent requests. And it is only one per process: four workers and three pods give twelve." },
          { t: "p", text: "Instead I create one instance in the composition root and inject it — still one per process, but explicit and replaceable. If something must be unique across the whole system, that is an architectural concern: shared state in Redis or a database, or leader election." }
        ] },

      { level: "core",
        q: "When would you use a factory, and when an abstract factory?",
        strong: "A strong answer ties both to configuration at the composition root and gives a family example.",
        answer: [
          { t: "p", text: "A factory when callers should depend on a role and the concrete class is chosen at run time — a storage backend from configuration, a parser by file type, a plugin by name. In Python it is often a dictionary of constructors." },
          { t: "p", text: "An abstract factory when several components must be chosen together and only certain combinations are valid — a cloud profile that pairs a queue, a blob store and a secrets manager from the same provider, or a test profile of in-memory fakes. Choosing the family as one unit makes mismatched configurations impossible." }
        ] },

      { level: "advanced",
        q: "Which creational patterns show up in system design, beyond class design?",
        strong: "A strong answer names pools and prototypes and connects singletons to coordination.",
        answer: [
          { t: "p", text: "Object pools are everywhere: database connection pools, HTTP keep-alive pools, thread and worker pools. They amortise expensive creation and cap the load on a downstream; their size is a capacity decision. Prototypes appear as machine and container images — a configured instance copied many times." },
          { t: "p", text: "The singleton's system-scale version is a single writer or a leader: one scheduler, one primary, one lock holder, which needs leader election with fencing rather than a class. Builders show up as infrastructure-as-code constructs and request builders that validate the whole object before it is sent." }
        ] }
    ]
  }
});
