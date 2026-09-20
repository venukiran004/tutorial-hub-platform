/* ============================================================================
   LESSON 13.8 — Sixteen Production Scenarios: FastAPI, Threads and the ORM
   Mirrors 29_Backend_Web_Concepts/Python_FastAPI_Threading_ORM_Scenarios.md:
   each scenario as symptom → diagnosis → fix, and the five recurring
   lessons the reference draws from them.
   ========================================================================= */
EC.receiveLesson({
  id: "13.8",

  lede: "**These are the incidents that a Python service actually has: not syntax errors but a blocked event loop, a session shared across threads, an exhausted pool, an inventory oversold by eighteen units, a welcome email that vanished on deploy.** The reference collects sixteen of them from production, each with the symptom you would see, the diagnosis, and the fix. This lesson keeps that shape — symptom, diagnosis, fix — and groups the sixteen by the five rules they keep breaking: the GIL draws the line, sessions are per request, invariants belong in the database, bound everything, and plan for restarts.",

  objectives: [
    "Recognise each of the sixteen scenarios from its symptom and name the diagnosis",
    "Apply the fix: run_in_threadpool, per-request sessions, pool sizing, eager loading, atomic updates and row locks, a process pool, a durable queue, idempotency keys, a semaphore, a bounded cache, a rollback-on-exception dependency, streaming queries, graceful shutdown",
    "State the five recurring lessons and map any new incident onto one of them",
    "Choose threads, processes or async for a given endpoint using the reference's decision table"
  ],

  prerequisites: ["11.8", "12.7", "13.5", "13.7"],

  blocks: [

    { t: "h2", n: "01", text: "The GIL draws the line: scenarios 1, 6 and 16", id: "gil" },

    { t: "dl", items: [
      ["1 · The event loop blocked by sync work", "**Symptom:** latency on *every* endpoint spikes whenever one report endpoint is hit; health checks time out. **Diagnosis:** an `async def` endpoint called a blocking function — `requests.get`, a sync database driver, `time.sleep` — and held the single event-loop thread. **Fix:** an async client (httpx), or `await run_in_threadpool(blocking_fn, …)`, or make the endpoint plain `def` so FastAPI runs it in the thread pool itself."],
      ["6 · A CPU-bound endpoint freezes the server", "**Symptom:** one request that renders a PDF or crunches a DataFrame stalls all the others, even in a thread pool. **Diagnosis:** the GIL — threads do not help pure-Python CPU work, and in an async server the loop is held outright. **Fix:** a `ProcessPoolExecutor` via `loop.run_in_executor`, or push the job to a worker queue and return 202."],
      ["16 · Choosing threads, processes or async", "The decision: I/O-bound and a few tasks → threads; I/O-bound at scale → async end to end; CPU-bound → processes; mixed → async for the I/O and a process pool for the CPU (lesson 11.8)."]
    ] },

    { t: "diagram", kind: "timeline", title: "One blocking call in an async handler", caption: "While the report endpoint runs requests.get for three seconds, no other coroutine — including the health check — gets the loop. run_in_threadpool moves the call to a worker thread and the loop carries on.", span: 6, tick: 1, lanes: [
      { label: "GET /report (async)", tone: "crit", bars: [[0, 3, "requests.get — holds the loop"]] },
      { label: "GET /health", tone: "warn", bars: [[3, 3.4, "finally answers"]] },
      { label: "GET /orders", tone: "warn", bars: [[3.4, 4, "finally answers"]] }
    ] },

    { t: "code", lang: "python", title: "Scenario 1's fix",
      code: `from fastapi.concurrency import run_in_threadpool

@app.get("/report")
async def report():
    data = await run_in_threadpool(build_report_sync)      # the loop is free while a thread works
    return data

# or, simplest: a plain def endpoint — FastAPI runs it in the threadpool for you
@app.get("/report")
def report():
    return build_report_sync()` },

    { t: "h2", n: "02", text: "Sessions are per request, engines are global: scenarios 2, 3 and 13", id: "sessions" },

    { t: "dl", items: [
      ["2 · One Session shared across threads or requests", "**Symptom:** random `InvalidRequestError`, objects from one user's request appearing in another's response, sporadic deadlocks. **Diagnosis:** a module-level `session = Session()` used by every request; a Session is not thread-safe and holds one transaction. **Fix:** one engine per process, one Session per request from a dependency that closes it."],
      ["3 · Connection pool exhausted", "**Symptom:** under load, requests hang for ~30 s then fail with `QueuePool limit of size 5 overflow 10 reached`. **Diagnosis:** connections checked out and never returned — a session not closed on an exception path, or a pool sized for one worker multiplied by eight. **Fix:** close in `finally`, size pool × workers under the database's `max_connections` (lesson 13.7), set `pool_pre_ping` and a `pool_timeout`."],
      ["13 · Session left dirty", "**Symptom:** after one request errors mid-write, later requests on the same connection see partial data or `PendingRollbackError`. **Diagnosis:** the dependency yielded a session but neither committed on success nor rolled back on exception. **Fix:** the try / commit / except / rollback / finally / close dependency below."]
    ] },

    { t: "code", lang: "python", title: "The session dependency that fixes 2, 3 and 13 at once",
      code: `engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10, pool_pre_ping=True, pool_timeout=10)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def get_db():
    db = SessionLocal()                 # one Session per request
    try:
        yield db
        db.commit()                     # success path: commit once, here
    except Exception:
        db.rollback()                   # any error: the transaction is undone
        raise
    finally:
        db.close()                      # the connection returns to the pool, always`,
      caption: "Global engine, per-request session, commit on success, rollback on error, close always. Every one of the three scenarios is a missing line from this function." },

    { t: "h2", n: "03", text: "Invariants belong where the data lives: scenarios 5, 8, 10 and 11", id: "invariants" },

    { t: "diagram", kind: "timeline", title: "Scenario 5: the oversold flash sale", caption: "Two requests read stock = 1 at the same time, both decide it is fine, both write stock = 0 and both confirm the order. Reading, deciding and writing are three steps; only the database can make them one.", span: 6, tick: 1, lanes: [
      { label: "request A", tone: "accent", bars: [[0, 1, "read stock=1"], [1, 2, "ok?"], [2, 3, "write 0, confirm", "good"]] },
      { label: "request B", tone: "warn", bars: [[0.3, 1.3, "read stock=1"], [1.3, 2.3, "ok?"], [2.3, 3.3, "write 0, confirm", "crit"]] }
    ] },

    { t: "code", lang: "python", title: "Scenario 5's fix: a conditional atomic update",
      code: `# one statement: the database checks and decrements under its own row lock
result = db.execute(
    text("UPDATE products SET stock = stock - 1 WHERE id = :id AND stock > 0"),
    {"id": product_id},
)
if result.rowcount == 0:
    raise HTTPException(409, "sold out")          # someone else took the last unit
# alternatives: SELECT ... FOR UPDATE then decrement; a CHECK (stock >= 0) constraint as the backstop`,
      caption: "A threading.Lock in the process would only serialise one worker; eight workers on two machines would still oversell. The invariant lives in the database, so the database enforces it." },

    { t: "dl", items: [
      ["8 · Duplicate charges from client retries", "**Symptom:** a customer charged twice after a timeout; the client retried a POST that had in fact succeeded. **Fix:** an `Idempotency-Key` header; store the key with the response in the same transaction as the charge (a unique constraint on the key); on a repeat, return the stored response."],
      ["10 · Deadlocks under concurrent updates", "**Symptom:** `DeadlockDetected` errors at peak. **Diagnosis:** two transactions updating the same rows in different orders. **Fix:** update rows in a consistent order (sort the ids), keep transactions short, and retry on deadlock — the database aborts one participant and the application must re-run it (lesson 13.4)."],
      ["11 · Lost updates", "**Symptom:** two users edit the same record; the second save silently overwrites the first. **Fix:** optimistic locking — a `version` column, `UPDATE … WHERE id = ? AND version = ?`, zero rows means someone else got there first, return 409; or `SELECT … FOR UPDATE` when conflicts are common and the edit is short."]
    ] },

    { t: "h2", n: "04", text: "Bound everything: scenarios 9, 12, 14 and 4", id: "bound" },

    { t: "dl", items: [
      ["9 · Fan-out to a slow upstream", "**Symptom:** enriching 500 records through a partner API is either painfully slow (serial) or gets the service rate-limited and the partner paged (500 concurrent calls). **Fix:** `asyncio.Semaphore(10)` around each call inside `gather`, with a timeout per call and a retry policy — bounded concurrency (lesson 15.9)."],
      ["12 · An in-process cache that leaks", "**Symptom:** a hand-rolled dict cache shared across threads raises sporadic `KeyError`s, and memory grows for days. **Diagnosis:** compound operations on a plain dict are not atomic under threads, and the dict has no bound. **Fix:** `functools.lru_cache(maxsize=…)` (thread-safe, bounded) or `cachetools.TTLCache` behind a lock; for anything shared across workers, Redis."],
      ["14 · Streaming a huge query", "**Symptom:** `GET /export` on a five-million-row table spikes memory and the worker is OOM-killed. **Diagnosis:** `.all()` materialises every row as an ORM object at once, and the response is built as one string. **Fix:** `session.execute(stmt).yield_per(1000)` (or `stream_results=True`) and a `StreamingResponse` that yields CSV rows as they arrive."],
      ["4 · Lazy loading in async SQLAlchemy", "**Symptom:** `MissingGreenlet: greenlet_spawn has not been called` when a response is serialised, often only when a relationship is touched. **Diagnosis:** relationships are lazy by default; in async, touching `user.posts` after the awaited query triggers implicit I/O outside an `await`, which the async engine forbids — the same access in sync code silently fires the N+1 queries instead. **Fix:** eager-load anything you will serialise."]
    ] },

    { t: "code", lang: "python", title: "Scenario 4's fix: eager loading, chosen per query",
      code: `from sqlalchemy import select
from sqlalchemy.orm import selectinload

@app.get("/users/{uid}")
async def get_user(uid: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(User)
        .where(User.id == uid)
        .options(selectinload(User.posts))   # a second SELECT ... WHERE post.user_id IN (...)
    )
    return result.scalar_one()

# selectinload → two queries, no row multiplication: best for one-to-many collections
# joinedload   → one JOIN: best for many-to-one and one-to-one
# expire_on_commit=False keeps already-loaded attributes from being re-fetched after commit`,
      caption: "The async ORM removes the 'lazy loading just works' safety net; decide the loading strategy per query. In sync code the same laziness is the N+1 problem of lesson 13.6 — fix it there too." },

    { t: "h2", n: "05", text: "Plan for failure and restarts: scenarios 7 and 15", id: "restarts" },

    { t: "dl", items: [
      ["7 · BackgroundTasks lost on deploy", "**Symptom:** 'send welcome email' tasks silently vanish during deploys; long jobs started from a request never finish. **Diagnosis:** FastAPI `BackgroundTasks` run in the same process after the response is sent; when the process is replaced, they die with it, and nothing records that they existed. **Fix:** a durable queue — Celery, RQ, Dramatiq, or a jobs table polled by a worker — with the job written before the response returns (lesson 12.7)."],
      ["15 · Shutdown that drops work", "**Symptom:** deploys cause sporadic 502s and a few half-written rows. **Diagnosis:** on SIGTERM the process exits immediately instead of stopping new traffic, finishing in-flight requests and closing the pool. **Fix:** handle SIGTERM — fail the readiness check so the load balancer stops sending traffic, wait for in-flight requests up to a grace period, flush the queue producer, dispose the engine, then exit (lesson 14.8)."]
    ] },

    { t: "diagram", kind: "steps", title: "Graceful shutdown: drain, then die", caption: "The order matters: readiness goes red before the process stops accepting, so the load balancer has already moved on by the time in-flight requests finish.", items: [
      { label: "SIGTERM arrives", desc: "from the orchestrator's rolling deploy", tone: "warn" },
      { label: "readiness → 503", desc: "the load balancer stops routing new requests here", tone: "accent" },
      { label: "finish in-flight requests", desc: "up to a grace period, e.g. 30 s", tone: "good" },
      { label: "flush and close", desc: "queue producers, engine.dispose(), log handlers", tone: "good" },
      { label: "exit 0", desc: "the orchestrator starts the replacement", tone: "violet" }
    ] },

    { t: "h2", n: "06", text: "The five recurring lessons", id: "five" },

    { t: "diagram", kind: "compare", title: "Sixteen incidents, five rules", caption: "Every scenario in the reference breaks one of these. When a new incident arrives, ask which rule it broke; the fix is usually the rule's standard remedy.", columns: [
      { title: "The GIL draws the line", tone: "crit", items: ["threads for I/O", "processes for CPU", "never block the loop", "scenarios 1, 6, 16"] },
      { title: "Sessions per request", tone: "warn", items: ["engine global", "commit / rollback / close", "pool × workers < max_conn", "scenarios 2, 3, 13"] },
      { title: "Invariants in the DB", tone: "accent", items: ["atomic UPDATE … WHERE", "row locks, constraints", "not in-process locks", "scenarios 5, 8, 10, 11"] },
      { title: "Bound everything", tone: "good", items: ["semaphores and pools", "cache maxsize and TTL", "short transactions", "scenarios 4, 9, 12, 14"] },
      { title: "Plan for restarts", tone: "violet", items: ["idempotency keys", "durable queues", "drain-then-die", "scenarios 7, 8, 15"] }
    ] },

    { t: "table", head: ["Endpoint does…", "Run it as", "Because"],
      rows: [
        ["awaits an async client or driver", "`async def`", "the loop overlaps the waits"],
        ["calls a sync library (requests, a sync driver)", "plain `def`, or `run_in_threadpool`", "FastAPI's thread pool keeps the loop free"],
        ["computes for seconds in pure Python", "process pool or a worker queue", "the GIL; threads and the loop both stall"],
        ["fans out to 500 upstream calls", "`async def` + `Semaphore`", "bounded concurrency"],
        ["must outlive the request", "durable queue, return 202", "BackgroundTasks die with the process"]
      ] },

    { t: "exercise", kind: "diagnose", title: "Name the scenario", difficulty: "advanced", minutes: 15,
      body: [{ t: "p", text: "For each symptom, name the scenario number, the diagnosis and the fix in one line each: (a) `/health` times out whenever `/export-pdf` is busy; (b) after a 500 on `/orders`, the next three requests on that worker return stale reads; (c) a customer sees a stranger's cart items; (d) memory climbs 2 GB a day on a service with a home-made dict cache; (e) two admins edit a product description and the first edit disappears." }],
      requirements: ["Five lines, one per symptom", "Each names the rule from the five", "Each names the concrete fix"],
      hint: "(c) is a Session shared where it should not be.",
      solution: { lang: "text", title: "Solution",
        code: `(a) scenario 1 or 6 — blocked loop / CPU in-process; rule 1; run_in_threadpool or a process pool
(b) scenario 13 — session left dirty; rule 2; rollback on exception in the dependency
(c) scenario 2 — one Session across requests; rule 2; a per-request Session
(d) scenario 12 — unbounded cache; rule 4; lru_cache(maxsize) or TTLCache
(e) scenario 11 — lost update; rule 3; a version column and UPDATE ... WHERE version = ?`,
        notes: [{ t: "p", text: "Two of the five are the same rule broken two ways, which is the point of the grouping: the rule is the thing to remember, the scenarios are its symptoms." }] } }
  ],

  takeaways: [
    "A blocking call inside async def holds the only thread; run it in the thread pool, use an async client, or make the endpoint plain def. CPU work needs a process.",
    "Engine global, Session per request, commit on success, rollback on exception, close always; pool size × workers must fit the database.",
    "The oversold sale, the duplicate charge, the deadlock and the lost update are all fixed in the database: conditional atomic updates, idempotency keys with a unique constraint, consistent lock order plus retry, a version column.",
    "Async SQLAlchemy raises MissingGreenlet on lazy loads; eager-load with selectinload or joinedload per query.",
    "Bound fan-out with a semaphore, caches with maxsize and TTL, exports with yield_per and a StreamingResponse.",
    "BackgroundTasks die with the process; durable work goes through a queue. On SIGTERM, fail readiness, drain in-flight requests, close the pool, then exit."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Every endpoint's latency spikes whenever one async endpoint calls a synchronous HTTP library. Why?",
      options: ["The database is overloaded", "The synchronous call holds the event loop's single thread, so no other coroutine can run until it returns", "The GIL is released", "Too many workers"],
      answer: 1,
      why: "An async server runs all coroutines on one thread; they take turns at await points. A blocking call never awaits, so it holds the thread for its whole duration and every other request — including health checks — waits. run_in_threadpool or an async client fixes it." },
    { stem: "A flash sale of 100 units sells 118. Which fix actually works with eight workers on two machines?",
      options: ["A threading.Lock around the check", "An asyncio.Lock around the check", "A conditional atomic UPDATE … WHERE stock > 0, checked by rowcount, in the database", "Retrying the request"],
      answer: 2,
      why: "In-process locks serialise only within one process; sixteen workers across two machines still race. The database holds the row and can check and decrement atomically under its own lock, and a CHECK constraint is the backstop. Invariants belong where the data lives." },
    { stem: "What does MissingGreenlet in async SQLAlchemy tell you?",
      options: ["The database connection was lost", "A lazy relationship was accessed after the awaited query, triggering implicit I/O outside an await", "The session was not committed", "greenlet is not installed"],
      answer: 1,
      why: "Relationships load lazily on first access. In async code that access would need I/O without an await, which the async engine forbids — so it raises. Eager-load with selectinload or joinedload for anything the response serialises; in sync code the same laziness silently becomes N+1 queries." },
    { stem: "Why do FastAPI BackgroundTasks lose work during a deploy?",
      options: ["They run before the response", "They run in the same process after the response, so they die when the process is replaced and nothing recorded them", "They are rate-limited", "They require Celery"],
      answer: 1,
      why: "BackgroundTasks are convenient for tiny fire-and-forget work, but they exist only in the worker's memory. A rolling deploy replaces the worker mid-task. Durable work — emails, reports, charges — is written to a queue or jobs table before the response returns and processed by a worker that can be restarted." }
  ] },

  interview: { title: "Interview", sub: "Incident questions with a diagnosis expected", questions: [
    { level: "Core", q: "Under load, requests hang for thirty seconds then fail with 'QueuePool limit reached'. Diagnose and fix.",
      strong: "Connections checked out and never returned, or pool × workers exceeding the database; close in finally, size the pool, add pre-ping and a timeout.",
      answer: [{ t: "p", text: "The pool has size 5 and overflow 10, so fifteen connections per worker; the thirty seconds is the default pool_timeout waiting for one to come back. Either connections leak — a session not closed on an exception path, a request that returned before commit — or the arithmetic is wrong: eight workers × 15 is 120 connections against a database allowing 100, so some workers can never get one. Fix the dependency to close in finally and roll back on error; size pool_size and max_overflow so workers × total stays under max_connections with headroom; set pool_pre_ping to drop dead connections and a short pool_timeout so failure is fast and visible. Then look for the long transaction that holds connections for seconds." }] },
    { level: "Core", q: "How do you make a POST safe to retry?",
      strong: "An idempotency key stored with the response in the same transaction, a unique constraint on it, and replay on repeat.",
      answer: [{ t: "p", text: "The client sends an Idempotency-Key header — a UUID it generates once per logical operation and reuses on retry. The server, inside the transaction that performs the operation, inserts the key with the operation's result into an idempotency table with a unique constraint. A retry with the same key either finds the stored response and replays it, or hits the unique constraint if the first attempt is still in flight and returns 409 to retry shortly. The key scope is per client and per endpoint, with an expiry of a day or so. The charge and the key are committed together, so there is no window where the charge exists without the key." }] },
    { level: "Senior", q: "Design the shutdown sequence for a FastAPI service behind Kubernetes so a deploy drops no requests and corrupts no rows.",
      strong: "Readiness red on SIGTERM, drain in-flight up to the grace period, stop queue producers, dispose the engine, exit; set terminationGracePeriodSeconds to match.",
      answer: [{ t: "p", text: "Kubernetes sends SIGTERM and waits terminationGracePeriodSeconds before SIGKILL. On SIGTERM the app flips its readiness probe to 503 so the endpoints controller removes the pod from the service — there is a propagation delay, so a preStop sleep of a few seconds covers requests already routed. The server then stops accepting new connections and lets in-flight requests finish (uvicorn's timeout-graceful-shutdown); each request completes its transaction, so no half-written rows. Background producers flush to the queue, the SQLAlchemy engine is disposed so connections close cleanly, and the process exits 0. The grace period must exceed the slowest request plus the drain; and anything that must outlive the process was never in-process to begin with — it went through a durable queue." }] }
  ] }
});
