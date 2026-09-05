/* ============================================================================
   LESSON 14.8 — Deployment and Runtime
   ========================================================================= */
EC.receiveLesson({
  id: "14.8",

  lede: "`uvicorn app:app` is a development server. **What runs in production is a process manager supervising workers, sized against your actual workload, restarting cleanly under load** — and the difference between a service that survives a deploy and one that drops requests is almost entirely in these settings.",

  objectives: [
    "Explain what WSGI and ASGI are, and which your application needs",
    "Choose a worker model from the shape of your workload",
    "Size workers from measurements rather than a formula",
    "Configure timeouts that fail rather than hang",
    "Achieve a rolling restart that drops no requests"
  ],

  prerequisites: ["11.6", "14.5"],

  blocks: [

    { t: "h2", n: "01", text: "WSGI and ASGI", id: "wsgi-asgi" },

    { t: "code", lang: "python", title: "the two interfaces, in full", code: `
# WSGI (PEP 3333, 2003). Synchronous. One request occupies one worker
# from first byte to last -- so concurrency equals worker count.
def application(environ, start_response):
    start_response("200 OK", [("Content-Type", "text/plain")])
    return [b"Hello"]

# Used by: Flask, Django (traditionally), Pyramid, Bottle.


# ASGI (2018). Async, and it can express things WSGI cannot: a request
# is a series of messages, so streaming, WebSockets and server-sent
# events all fit.
async def application(scope, receive, send):
    await send({"type": "http.response.start", "status": 200,
                "headers": [(b"content-type", b"text/plain")]})
    await send({"type": "http.response.body", "body": b"Hello"})

# Used by: FastAPI, Starlette, Litestar, Django (3.0+, partially).


# THE CONSEQUENCE THAT MATTERS:
#
#   WSGI: 4 workers = 4 concurrent requests. A request waiting on a
#         database occupies its worker doing nothing.
#
#   ASGI: 4 workers x thousands of concurrent awaits -- as long as
#         the waiting is genuinely awaited. A blocking call in an
#         async handler stalls every other request on that worker
#         (Lesson 12.7).
`,
      hl: [3, 14, 24],
      caption: "**ASGI's advantage is only realised with async I/O throughout.** An ASGI app calling a blocking database driver has WSGI's concurrency and async's complexity — the worst of both."
    },

    { t: "h2", n: "02", text: "Worker models", id: "workers" },

    { t: "table",
      head: ["Model", "Concurrency", "Right for"],
      rows: [
        ["`sync` (gunicorn default)", "1 per worker", "**CPU-bound**, or blocking code you cannot change"],
        ["`gthread`", "Threads per worker", "**Blocking I/O** — a sync ORM, `requests`"],
        ["`gevent` / `eventlet`", "Greenlets, monkey-patched", "Legacy sync code needing high concurrency"],
        ["`uvicorn.workers.UvicornWorker`", "**Async, thousands**", "**FastAPI and any async framework**"],
        ["Uvicorn alone, no manager", "Async, single process", "Development, or a platform that supervises for you"]
      ],
      caption: "**Gunicorn managing uvicorn workers is the standard production shape for FastAPI.** Gunicorn handles supervision, restarts and signals; uvicorn handles the ASGI protocol and the event loop."
    },

    { t: "code", lang: "bash", title: "the command, with every flag explained", code: `
gunicorn app.main:app \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --workers 4 \\
    --bind 0.0.0.0:8000 \\
    \\
    # How long a worker may take to finish in-flight requests after
    # SIGTERM. Must exceed your slowest normal request, and must be
    # LESS than the platform's grace period.
    --graceful-timeout 30 \\
    \\
    # A worker silent for this long is killed and replaced. It is a
    # deadlock detector, not a request timeout -- the client is
    # already gone by the time it fires.
    --timeout 60 \\
    \\
    # Keep-alive must EXCEED the load balancer's idle timeout, or the
    # server closes a connection the balancer is about to reuse and
    # the balancer reports a 502.
    --keep-alive 75 \\
    \\
    # Recycle workers periodically. A pragmatic guard against slow
    # leaks in dependencies you do not control. The jitter stops all
    # workers recycling at the same moment.
    --max-requests 10000 \\
    --max-requests-jitter 1000 \\
    \\
    --access-logfile - --error-logfile - \\
    --forwarded-allow-ips '*'      # trust X-Forwarded-* from the LB
`,
      hl: [8, 13, 18, 23],
      caption: "**The keep-alive relationship is the one people get wrong.** If gunicorn's is shorter than the load balancer's idle timeout, the balancer sends a request onto a connection the server has just closed — an intermittent 502 that correlates with traffic troughs."
    },

    { t: "callout", kind: "trap", title: "Preload saves memory and breaks things", body: [
      { t: "code", lang: "python", title: "what --preload actually does", numbered: false, code: `
gunicorn --preload --workers 8 app:app

# The app is imported ONCE in the master, then fork() copies it.
# Linux copy-on-write means the 8 workers share those pages, so
# memory can drop substantially -- often 40% for a large app.
#
# WHAT BREAKS:
#
# 1. CONNECTION POOLS CREATED AT IMPORT ARE SHARED ACROSS PROCESSES.
#    Two workers using the same socket produce corrupted responses.
#    Create them in post_fork, not at module level.
#
# 2. NO ZERO-DOWNTIME RELOAD. Without preload, gunicorn's HUP reloads
#    the app in new workers. With preload, the master holds the old
#    code, so a code change needs a full restart.
#
# 3. RANDOM SEEDS AND UUIDs ARE SHARED. Every worker inherits the
#    same random state, so they generate the same "random" sequence.

# The fix for pools:
def post_fork(server, worker):
    """Runs in each worker AFTER fork. Everything holding a file
    descriptor belongs here."""
    from app.db import engine
    engine.dispose()          # discard inherited connections`},
      { t: "p", text: "**Use preload when memory is the binding constraint, and make `post_fork` mandatory reading for anyone who adds a global.** The failure mode — two processes sharing a socket — produces responses that interleave, which reads as data corruption." }
    ]},

    { t: "h2", n: "03", text: "Sizing", id: "sizing" },

    { t: "ladder",
      title: "Choosing a worker count",
      rungs: [
        { level: "bad", label: "The formula from a blog post",
          why: "`(2 × cores) + 1` assumes a synchronous, CPU-bound workload with no memory constraint. Applied to an async I/O-bound service on a container limited to 1GB, it produces workers that are either idle or OOM-killed.",
          code: `workers = (2 * multiprocessing.cpu_count()) + 1

# In a container, cpu_count() returns the HOST's core count, not the
# cgroup limit. A 2-CPU container on a 64-core host asks for 129
# workers, and the pod is killed on the first request.` },
        { level: "ok", label: "Derived from the container limit",
          why: "Now bounded by what the container actually has. Still ignores memory per worker and the workload's actual shape, which are usually the binding constraints.",
          code: `import os
cpu_quota = int(os.environ.get("CPU_LIMIT", "2"))
workers = (2 * cpu_quota) + 1` },
        { level: "best", label: "Measured, against both constraints",
          why: "The number is derived from what a worker actually costs and what the workload actually does. It is also stated as a decision with reasons, so the next person can revisit it when either changes.",
          code: `# 1. MEASURE memory per worker under real load.
#      RSS per worker: ~250MB (measured, not guessed)
#      Container limit: 2GB
#      -> at most 2048 / 250 = 8 workers, leaving headroom
#
# 2. IDENTIFY the workload shape.
#      p50 request: 40ms, of which 35ms is waiting on the database.
#      -> I/O-bound. Async workers, not more processes.
#
# 3. CHOOSE, and write down why.
#      CPU limit: 2 cores
#      workers = 4              # 2 per core: async, so each handles
#                               # many concurrent awaits
#      -> 4 x 250MB = 1GB, half the limit. Room for spikes.
#
# 4. LOAD TEST to confirm, and watch SATURATION, not throughput:
#      - request latency at target RPS
#      - pool usage (Lesson 14.3)
#      - memory at p99, not average

# The formula is a starting point for a load test, never an answer.`,
          note: "**More workers is not more throughput past the bottleneck.** If the database pool allows 10 connections, a twentieth worker adds queueing and memory, not capacity." }
      ]
    },

    { t: "callout", kind: "insight", title: "The constraint is usually not CPU", body: [
      { t: "code", lang: "bash", title: "work out what actually limits you", numbered: false, code: `
# THE CHAIN, and its weakest link:
#
#   load balancer connections
#     -> gunicorn workers
#       -> per-worker concurrency (threads or async)
#         -> DATABASE CONNECTION POOL          <- usually here
#           -> database max_connections
#             -> database CPU and I/O
#
# 8 workers x pool_size 10 = 80 connections from ONE pod.
# 6 pods = 480. Postgres default max_connections = 100.
#
# Adding workers here makes things WORSE: more connections competing
# for a limit already exceeded, and more memory for no throughput
# (Lesson 13.7).

# Measure at each layer before adding capacity at any of them.`},
      { t: "p", text: "**Scale the layer that is saturated.** Adding workers when the pool is the bottleneck increases memory and contention while throughput stays flat — and the graph looks like the change did nothing, because it did." }
    ]},

    { t: "h2", n: "04", text: "Timeouts", id: "timeouts" },

    { t: "code", lang: "python", title: "every layer needs one, and they must nest", code: `
# THE ORDERING RULE: each layer's timeout must be SHORTER than the
# one outside it. Otherwise the outer layer gives up first and the
# inner work continues, holding resources for a client that has gone.
#
#   client            30s
#   load balancer     29s
#   gunicorn timeout  60s   <- a deadlock detector, deliberately longer
#   application       25s   <- the real deadline
#   database query    10s
#   outbound HTTP      5s

# Outbound calls: ALWAYS both a connect and a read timeout. A single
# number sets only the connect timeout in some libraries, so a server
# that accepts and never responds hangs forever.
client = httpx.Client(
    timeout=httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=2.0)
)

# The database, per session.
engine = create_engine(
    url,
    connect_args={
        "connect_timeout": 5,
        # Kills a query that exceeds this, server-side. Without it a
        # missing index can hold a connection for minutes.
        "options": "-c statement_timeout=10000",
    },
    pool_timeout=5,        # waiting for a pooled connection
)

# The application's own deadline, so the work stops when the client
# has already given up.
async def handler():
    async with asyncio.timeout(25):
        return await do_work()
`,
      hl: [8, 15, 25],
      caption: "**A missing timeout is not \"waits a long time\" — it is \"holds a worker forever\".** Enough of those and every worker is occupied by a request whose client disconnected minutes ago."
    },

    { t: "h2", n: "05", text: "Restarting without dropping requests", id: "restart" },

    { t: "viz",
      title: "The sequence a clean rolling deploy follows",
      caption: "Every step exists because skipping it drops requests. The one teams miss is the first — Kubernetes signals the pod and updates endpoints concurrently, so without a pause the pod stops accepting while traffic is still arriving.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Six ordered steps of a graceful pod shutdown">
  <rect x="20" y="24" width="860" height="40" rx="7" style="fill:var(--surface-2);stroke:var(--t-amber)"/>
  <text x="40" y="49" class="s-sub"><tspan style="fill:var(--t-amber)">1 · preStop: sleep 5</tspan>  — the load balancer removes the pod from its pool first</text>

  <rect x="20" y="72" width="860" height="40" rx="7" style="fill:var(--surface-2);stroke:var(--border)"/>
  <text x="40" y="97" class="s-sub"><tspan class="s-label">2 · SIGTERM</tspan>  — sent to PID 1, which must be your server, not /bin/sh</text>

  <rect x="20" y="120" width="860" height="40" rx="7" style="fill:var(--surface-2);stroke:var(--border)"/>
  <text x="40" y="145" class="s-sub"><tspan class="s-label">3 · stop accepting</tspan>  — the listening socket closes; in-flight requests continue</text>

  <rect x="20" y="168" width="860" height="40" rx="7" style="fill:var(--surface-2);stroke:var(--border)"/>
  <text x="40" y="193" class="s-sub"><tspan class="s-label">4 · drain</tspan>  — finish in-flight work, up to --graceful-timeout</text>

  <rect x="20" y="216" width="860" height="40" rx="7" style="fill:var(--surface-2);stroke:var(--t-green)"/>
  <text x="40" y="241" class="s-sub"><tspan style="fill:var(--t-green)">5 · lifespan shutdown</tspan>  — close pools, flush buffers, cancel background tasks</text>

  <rect x="20" y="264" width="860" height="30" rx="7" style="fill:var(--surface-2);stroke:var(--crit)"/>
  <text x="40" y="284" class="s-sub"><tspan style="fill:var(--crit)">6 · SIGKILL at terminationGracePeriodSeconds</tspan>  — must be LONGER than 1+4+5, or work is severed</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the application half", code: `
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.pool = await create_pool()
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(5.0))
    yield
    # Shutdown -- SIGTERM lands here, after uvicorn has stopped
    # accepting and drained in-flight requests.
    #
    # Order matters: finish work first, then close what it needs.
    await drain_background_tasks(timeout=20)
    await app.state.http.aclose()
    await app.state.pool.close()
    logger.info("shutdown_complete")

app = FastAPI(lifespan=lifespan)


# Deployment settings that make the above possible:
#
#   terminationGracePeriodSeconds: 60   # > preStop + graceful + drain
#   lifecycle:
#     preStop:
#       exec: { command: ["sh", "-c", "sleep 5"] }
#
#   readinessProbe:                     # gates traffic
#     httpGet: { path: /health/ready, port: 8000 }
#     periodSeconds: 5
#   livenessProbe:                      # gates restarts -- see 14.3
#     httpGet: { path: /health/live, port: 8000 }
#     failureThreshold: 3
#   startupProbe:                       # a slow start must not be
#     httpGet: { path: /health/live, port: 8000 }   # read as a crash
#     failureThreshold: 30
#     periodSeconds: 5
`,
      hl: [10, 21, 31],
      caption: "**The `startupProbe` prevents a restart loop on slow-starting applications.** Without it, an application taking forty seconds to load a model fails its liveness probe and is killed before it ever becomes ready."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a runtime configuration",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "A FastAPI service on Kubernetes: 6 pods, 2 CPU and 2GB each, backed by Postgres with `max_connections = 100`. Requests average 45ms, of which 40ms is database time. It shows 502s on deploy, gets OOM-killed a few times a day, and periodically returns \"too many clients\"." },
        { t: "code", lang: "bash", numbered: false, title: "the current configuration", code: `
# Dockerfile
CMD gunicorn app.main:app --workers 17 --bind 0.0.0.0:8000

# app/db.py
engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=10)

# app/main.py
@app.get("/report")
async def report():
    data = requests.get("https://analytics.internal/data").json()
    return process(data)

# deployment.yaml
resources:
  limits: { cpu: "2", memory: "2Gi" }
readinessProbe:
  httpGet: { path: /health, port: 8000 }
livenessProbe:
  httpGet: { path: /health, port: 8000 }`},
        { t: "p", text: "Diagnose all three symptoms and fix the configuration. Give your worker count with the arithmetic." }
      ],
      requirements: [
        "Explain each of the three symptoms with its cause.",
        "Compute the total connection demand against the limit.",
        "Give the worker count, with arithmetic for both CPU and memory.",
        "Identify the bug in the `/report` handler.",
        "Give the corrected gunicorn command, engine settings and manifest.",
        "Explain what `--preload` would change here."
      ],
      hint: "Count the connections: workers × (pool_size + overflow) × pods. And look at what `requests.get` does inside an `async def`.",
      solution: {
        lang: "bash",
        title: "the fix",
        code: `# =========================================================================
# THE THREE SYMPTOMS
# =========================================================================
#
# ---- "too many clients" -------------------------------------------
#
#   workers per pod         17
#   connections per worker  pool_size 20 + max_overflow 10 = 30
#   pods                    6
#
#   17 x 30 x 6 = 3,060 connections demanded
#   Postgres max_connections =   100
#
#   A 30x oversubscription. The service works while traffic is low
#   enough that pools stay mostly empty; the moment load rises, pools
#   fill and Postgres refuses connections -- including the ones the
#   migration job and the on-call engineer's psql need.
#
#   Note also: 17 comes from (2 x cpu_count()) + 1 evaluated on the
#   HOST. cpu_count() in a container returns the host's core count,
#   not the cgroup limit -- so on an 8-core node it produced 17 for a
#   2-CPU container.
#
# ---- OOM kills ----------------------------------------------------
#
#   Each worker is a full Python process: interpreter, imports,
#   FastAPI app, SQLAlchemy metadata, connection pool objects.
#   Measured RSS is ~180MB.
#
#   17 x 180MB = 3.06GB against a 2GB limit.
#
#   The kernel OOM-killer takes the largest process, Kubernetes
#   restarts the pod, and the pattern is "a few times a day" because
#   it depends on which workers happen to be busy.
#
# ---- 502s on deploy -----------------------------------------------
#
#   THREE independent causes, all present:
#
#   a) SHELL-FORM CMD. "CMD gunicorn ..." runs /bin/sh -c, so the
#      shell is PID 1 and does not forward SIGTERM. Gunicorn never
#      learns to shut down and is SIGKILLed with requests in flight
#      (Lesson 14.5).
#
#   b) NO preStop HOOK. Kubernetes sends SIGTERM and removes the pod
#      from endpoints CONCURRENTLY, so even a well-behaved pod stops
#      accepting while the load balancer is still routing to it.
#
#   c) NO --graceful-timeout, and no terminationGracePeriodSeconds
#      above it, so there is no defined drain window.
#
#   Fixing only (a) shrinks the spike and does not remove it, which
#   is why this is usually diagnosed twice.
#
# ---- and a fourth problem, not yet symptomatic ---------------------
#
#   ONE HEALTH ENDPOINT FOR BOTH PROBES. /health serves liveness and
#   readiness. If it checks any dependency, a database blip kills
#   every pod rather than removing them from rotation (Lesson 14.3).
#
#
# =========================================================================
# THE BUG IN /report
# =========================================================================
#
#   @app.get("/report")
#   async def report():
#       data = requests.get("https://analytics.internal/data").json()
#
# TWO defects in one line:
#
# 1. A BLOCKING CALL IN AN async def HANDLER. FastAPI trusts the
#    declaration and runs it ON THE EVENT LOOP. So for the duration
#    of that HTTP call -- often seconds -- this worker serves NO
#    other request, including the health probe. With async workers
#    that is the entire concurrency of the process, gone
#    (Lesson 12.7).
#
# 2. NO TIMEOUT. requests.get() with no timeout waits indefinitely.
#    An internal service that accepts the connection and never
#    responds holds this worker forever. Enough of those and every
#    worker is stuck on a call whose client left minutes ago.
#
# THE FIX:
#
#   http = httpx.AsyncClient(
#       timeout=httpx.Timeout(connect=3.0, read=5.0)
#   )
#
#   @app.get("/report")
#   async def report():
#       r = await http.get("https://analytics.internal/data")
#       r.raise_for_status()
#       return process(r.json())
#
# A shared AsyncClient, created in lifespan -- creating one per
# request defeats connection pooling and exhausts ephemeral ports.


# =========================================================================
# THE WORKER COUNT
# =========================================================================
#
# CONSTRAINT 1 -- MEMORY
#   limit 2GB, ~180MB per worker.
#   Leave 25% headroom for spikes and the OS:
#     2048 x 0.75 / 180 = 8.5  ->  at most 8 workers
#
# CONSTRAINT 2 -- CPU
#   limit is 2 cores. The workload is I/O-bound (40ms of 45ms is
#   database time), so workers do not need a core each -- they are
#   waiting. With async workers, 2 per core is generous:
#     2 x 2 = 4 workers
#
# CONSTRAINT 3 -- DATABASE CONNECTIONS. The binding one.
#   Budget: 100 max_connections, reserve 20 for migrations,
#   monitoring and human access -> 80 for the application.
#     80 / 6 pods = 13 connections per pod
#     13 / 4 workers = 3 per worker
#   So: pool_size=3, max_overflow=2 -> 5 max per worker
#     4 x 5 x 6 = 120... still over. Tighten:
#     pool_size=2, max_overflow=1 -> 3 per worker
#     4 x 3 x 6 = 72 connections. Fits, with headroom.
#
# CHOSEN: 4 workers, pool_size=2, max_overflow=1.
#
#   memory:      4 x 180MB = 720MB of 2GB          (36%)
#   connections: 4 x 3 x 6 = 72 of 80              (90% of budget)
#
# Is 72 connections enough concurrency? Yes, and this is the point
# about async: a request holds a connection for its 40ms of database
# time, not for its whole lifetime. 72 connections at 40ms each is
# ~1,800 database operations per second, which is far above what
# these six pods will serve.
#
# IF MORE CONCURRENCY IS NEEDED: add PgBouncer in transaction mode
# (Lesson 13.7), which multiplexes hundreds of client connections
# onto a handful of server ones. That is the correct answer to
# connection pressure -- more workers is not.


# =========================================================================
# THE CORRECTED CONFIGURATION
# =========================================================================

# ---- Dockerfile ---------------------------------------------------
# EXEC form: gunicorn is PID 1 and receives SIGTERM (502 cause a).
CMD ["gunicorn", "app.main:app", \\
     "--worker-class", "uvicorn.workers.UvicornWorker", \\
     "--workers", "4", \\
     "--bind", "0.0.0.0:8000", \\
     # Longer than the slowest normal request, shorter than the grace
     # period. This is the drain window.
     "--graceful-timeout", "30", \\
     # A deadlock detector, not a request timeout.
     "--timeout", "60", \\
     # MUST exceed the load balancer's idle timeout (60s here), or
     # the server closes a connection the LB is about to reuse.
     "--keep-alive", "75", \\
     # Recycle against slow leaks in dependencies we do not control.
     # Jitter so workers do not all recycle together.
     "--max-requests", "10000", \\
     "--max-requests-jitter", "1000", \\
     "--access-logfile", "-", "--error-logfile", "-", \\
     "--forwarded-allow-ips", "*"]


# ---- app/db.py ----------------------------------------------------
# engine = create_engine(
#     DATABASE_URL,
#     pool_size=2,
#     max_overflow=1,
#     pool_timeout=5,          # fail fast rather than queue silently
#     pool_recycle=1800,       # replace connections before the DB or
#                              # a firewall drops them
#     pool_pre_ping=True,      # verify before handing out -- survives
#                              # a database restart
#     connect_args={
#         "connect_timeout": 5,
#         # Server-side query kill. Without it a missing index can
#         # hold one of our very few connections for minutes.
#         "options": "-c statement_timeout=10000",
#     },
# )


# ---- app/main.py --------------------------------------------------
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # ONE client for the process. Per-request clients defeat
#     # connection reuse and exhaust ephemeral ports under load.
#     app.state.http = httpx.AsyncClient(
#         timeout=httpx.Timeout(connect=3.0, read=5.0),
#         limits=httpx.Limits(max_connections=20),
#     )
#     yield
#     await app.state.http.aclose()
#     await engine.dispose()
#     logger.info("shutdown_complete")
#
# app = FastAPI(lifespan=lifespan)
#
# @app.get("/report")
# async def report(request: Request):
#     r = await request.app.state.http.get(
#         "https://analytics.internal/data")
#     r.raise_for_status()
#     return process(r.json())


# ---- deployment.yaml ----------------------------------------------
# spec:
#   # > preStop(5) + graceful-timeout(30) + lifespan shutdown, with
#   # margin. Too short and SIGKILL severs work mid-drain.
#   terminationGracePeriodSeconds: 60
#   containers:
#     - name: app
#       resources:
#         # requests == limits for memory: guaranteed QoS, so this pod
#         # is not evicted first under node pressure.
#         requests: { cpu: "1", memory: "2Gi" }
#         limits:   { cpu: "2", memory: "2Gi" }
#
#       lifecycle:
#         preStop:
#           exec:
#             # 502 cause (b). Lets the load balancer deregister
#             # before the server stops accepting.
#             command: ["sh", "-c", "sleep 5"]
#
#       # Liveness: NOTHING external. Restarting cannot fix a database
#       # outage, and checking one here kills every pod during a blip.
#       livenessProbe:
#         httpGet: { path: /health/live, port: 8000 }
#         periodSeconds: 10
#         failureThreshold: 3
#
#       # Readiness: critical dependencies only. Gates TRAFFIC.
#       readinessProbe:
#         httpGet: { path: /health/ready, port: 8000 }
#         periodSeconds: 5
#         failureThreshold: 2
#
#       # A slow start must not be read as a crash.
#       startupProbe:
#         httpGet: { path: /health/live, port: 8000 }
#         failureThreshold: 30
#         periodSeconds: 5
#
#   strategy:
#     rollingUpdate:
#       maxUnavailable: 0        # never reduce capacity during a roll
#       maxSurge: 2


# =========================================================================
# WHAT --preload WOULD CHANGE HERE
# =========================================================================
#
# WOULD HELP: the app is imported once in the master and fork()
# shares those pages copy-on-write. Roughly 40% less memory --
# 4 workers at ~110MB instead of ~180MB.
#
# WOULD BREAK, unless handled:
#
#   The SQLAlchemy engine is created at MODULE level in app/db.py. It
#   is therefore created before fork(), and its pooled sockets are
#   inherited by every worker. Two workers using the same socket
#   produce interleaved responses -- which presents as data
#   corruption, not as an error, and is extremely hard to diagnose.
#
#   THE REQUIRED FIX:
#
#     # gunicorn.conf.py
#     def post_fork(server, worker):
#         """Runs in each worker AFTER fork. Anything holding a file
#         descriptor must be re-created here."""
#         from app.db import engine
#         engine.dispose()      # discard inherited connections
#
#   It also disables gunicorn's zero-downtime HUP reload, since the
#   master holds the old code.
#
# VERDICT HERE: NOT WORTH IT. Memory is at 36% of the limit after
# fixing the worker count, so there is nothing to buy. Revisit only
# if memory becomes the binding constraint again -- and then add
# post_fork first, not at the same time.


# =========================================================================
# EXPECTED RESULT
# =========================================================================
#
#                        before              after
#   workers/pod          17                  4
#   memory used          3.06GB of 2GB       720MB of 2GB
#   DB connections       3,060 of 100        72 of 80
#   OOM kills            a few per day       0
#   "too many clients"   under load          none
#   502s per deploy      a spike             0
#   /report concurrency  1 (loop blocked)    full
#
# Note that the fix REDUCED workers from 17 to 4 and made the service
# faster and more stable. That is the usual shape: the oversized
# configuration was competing with itself.


# =========================================================================
# TESTS
# =========================================================================
#
# def test_total_connection_demand_fits_the_database_limit():
#     """The arithmetic, as a permanent guard. Every one of these
#     numbers is easy to change in isolation without anyone
#     multiplying them out again."""
#     per_worker = settings.pool_size + settings.max_overflow
#     total = per_worker * settings.workers * settings.replicas
#
#     assert total <= DB_MAX_CONNECTIONS - RESERVED_FOR_OPS
#
#
# def test_worker_memory_fits_the_container_limit():
#     measured = measure_worker_rss()
#     assert measured * settings.workers < CONTAINER_MEMORY * 0.8
#
#
# def test_no_async_handler_makes_a_blocking_call():
#     """The /report bug, as a lint rule. An async def handler with no
#     await in its body is either trivial or blocking the loop."""
#     for handler in async_route_handlers(app):
#         src = inspect.getsource(handler)
#         assert "await" in src, f"{handler.__name__} may block the loop"
#         assert "requests." not in src, f"{handler.__name__} uses requests"
#
#
# def test_sigterm_drains_in_flight_requests():
#     """The 502 regression test. With shell-form CMD or no preStop,
#     this fails."""
#     container = start_container()
#     future = start_slow_request(container)      # 5s handler
#     time.sleep(1)
#
#     start = time.monotonic()
#     container.stop(timeout=45)
#     elapsed = time.monotonic() - start
#
#     assert future.result().status_code == 200   # not severed
#     assert elapsed < 20                          # drained, not killed`,
        notes: [
          { t: "p", text: "**The fix reduces workers from 17 to 4 and makes the service faster.** The oversized configuration was competing with itself — 3,060 connections demanded against a limit of 100, and 3GB of workers in a 2GB container." },
          { t: "p", text: "**`(2 × cpu_count()) + 1` produced 17 because `cpu_count()` returns the host's cores, not the cgroup limit.** On an 8-core node a 2-CPU container asks for 17 workers, and on a 64-core node it asks for 129." },
          { t: "callout", kind: "insight", title: "Connections are the binding constraint, not CPU", body: [
            { t: "p", text: "The chain runs load balancer → workers → per-worker concurrency → connection pool → `max_connections`, and the weakest link here is the database. Adding workers there increases memory and contention while throughput stays flat." },
            { t: "p", text: "72 connections at 40ms of database time each is roughly 1,800 operations per second — far above what six pods will serve, because an async request holds a connection for its query, not for its whole lifetime. If more is genuinely needed, PgBouncer in transaction mode is the answer, not more workers." }
          ]},
          { t: "p", text: "**`requests.get()` inside an `async def` handler is two bugs in one line.** It blocks the event loop, so that worker serves nothing else — including its health probe — and with no timeout it can hold the worker indefinitely against a service that accepts the connection and never replies." },
          { t: "p", text: "**The 502s have three independent causes**, which is why they are usually diagnosed twice: shell-form `CMD` means SIGTERM never arrives, no `preStop` means the pod stops accepting while the load balancer still routes to it, and no defined drain window means SIGKILL arrives mid-request." },
          { t: "p", text: "**`--preload` is not worth it here, and would be actively dangerous.** The engine is created at module level, so its pooled sockets would be inherited across `fork()` — two workers on one socket produce interleaved responses, which reads as data corruption rather than as an error." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's service was slow under load, so they doubled the worker count from 8 to 16. Latency got worse." },
      { t: "p", text: "**The bottleneck was the database connection pool.** Sixteen workers competed for the same connections, so requests queued waiting for a pool slot rather than for the database — and every worker added memory pressure and context-switching for no additional capacity." },
      { t: "p", text: "**Reducing to 6 workers and adding PgBouncer cut p99 latency by 60%.** Fewer processes, multiplexed connections, and the database doing the same amount of work with far less contention around it." },
      { t: "p", text: "**Adding capacity at the wrong layer makes things worse, not neutral.** Find the saturated layer first — the graph after a change that did nothing is the clue that you scaled the wrong one." }
    ]}
  ],

  takeaways: [
    "**WSGI is one request per worker; ASGI is many concurrent awaits per worker** — but only if the I/O is genuinely awaited.",
    "**An ASGI app calling a blocking driver has WSGI's concurrency and async's complexity.**",
    "**Gunicorn supervising uvicorn workers is the standard production shape** for FastAPI: supervision and signals from one, the event loop from the other.",
    "**`cpu_count()` in a container returns the host's cores**, so worker formulas produce absurd numbers under a cgroup limit.",
    "**Size against every constraint — memory per worker, CPU, and connections** — and the binding one is usually the database pool.",
    "**More workers past the bottleneck adds memory and contention, not throughput.** Scale the layer that is saturated.",
    "**Multiply connections out: workers × (pool + overflow) × replicas**, and reserve headroom for migrations and human access.",
    "**Timeouts must nest**, each layer shorter than the one outside it, or the outer gives up while the inner holds resources.",
    "**Always set both connect and read timeouts** on outbound calls — a server that accepts and never responds hangs a worker forever.",
    "**Set `statement_timeout` server-side**, or one missing index can hold a scarce connection for minutes.",
    "**Gunicorn's keep-alive must exceed the load balancer's idle timeout**, or the server closes connections the balancer is about to reuse.",
    "**A clean shutdown is preStop pause → SIGTERM → stop accepting → drain → close pools**, with the grace period longer than all of it.",
    "**`--preload` saves memory and breaks anything holding a file descriptor at import.** Use `post_fork` to re-create pools, or two workers will share a socket."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A container limited to 2 CPUs runs `(2 * multiprocessing.cpu_count()) + 1` workers and is OOM-killed. Why?",
        options: [
          "The formula is correct but memory limits are too low",
          "`cpu_count()` reports the host's core count, not the cgroup limit — so on an 8-core node it asks for 17 workers in a 2-CPU container",
          "Gunicorn ignores the workers flag",
          "Each worker reserves a full core of memory"
        ],
        answer: 1,
        why: "The formula also assumes a synchronous CPU-bound workload with no memory constraint. Sizing must come from measured memory per worker, the actual CPU limit, and — usually the binding constraint — the total connection demand against the database's `max_connections`."
      },
      {
        stem: "17 workers × pool_size 20 + overflow 10 × 6 pods, against `max_connections = 100`. What happens?",
        options: [
          "SQLAlchemy caps the total automatically",
          "Up to 3,060 connections are demanded, so under load pools fill and Postgres refuses connections — including for migrations and operators",
          "Connections are shared between workers",
          "The pool silently reduces its size"
        ],
        answer: 1,
        why: "It works while traffic is low enough that pools stay mostly empty, which is why it survives testing. Adding workers makes it worse; the correct responses are smaller pools, fewer workers, and PgBouncer in transaction mode if genuine concurrency is needed."
      },
      {
        stem: "`async def report(): data = requests.get(url).json()`. What are the two problems?",
        options: [
          "It needs a try/except, and the URL should be configurable",
          "The blocking call runs on the event loop so the worker serves nothing else, and with no timeout it can hold that worker indefinitely",
          "`requests` cannot parse JSON asynchronously",
          "The handler should return a Response object"
        ],
        answer: 1,
        why: "FastAPI trusts the `async def` declaration and runs the handler on the loop, so one slow call stalls every other request on that worker including the health probe. A shared `httpx.AsyncClient` with explicit connect and read timeouts fixes both."
      },
      {
        stem: "Why must gunicorn's `--keep-alive` exceed the load balancer's idle timeout?",
        options: [
          "To reduce TLS handshakes",
          "Otherwise the server closes an idle connection the balancer is about to reuse, and the balancer reports a 502",
          "Because keep-alive controls the graceful drain",
          "To allow WebSocket upgrades"
        ],
        answer: 1,
        why: "The race is between the two sides deciding a connection is idle. If the server closes first, the balancer's next request lands on a socket that is already closing — an intermittent 502 that correlates with traffic troughs, when connections sit idle long enough to hit the boundary."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How many workers would you run?",
        strong: "It depends on three constraints and I would measure all of them: memory per worker against the container limit, the CPU limit, and total connection demand against the database's maximum. The last is usually binding.",
        answer: [
          { t: "p", text: "Refusing to give a formula is the right answer, provided you then give the arithmetic you would do instead." },
          { t: "p", text: "Multiplying connections out — workers × pool × replicas — is the calculation most people never perform, and it is where the real limit sits." },
          { t: "p", text: "Noting that `cpu_count()` sees the host in a container is a specific detail that shows you have debugged this." }
        ]
      },
      {
        level: "advanced",
        q: "How do you deploy without dropping requests?",
        strong: "A preStop pause so the load balancer deregisters first, exec-form CMD so the server is PID 1 and gets SIGTERM, a graceful timeout longer than the slowest request, and a grace period longer than all of it.",
        answer: [
          { t: "p", text: "Naming the preStop pause unprompted is the signal — it is the step teams miss after correctly fixing the signal handling." },
          { t: "p", text: "The nesting of the three timeouts shows you have configured this rather than copied it." },
          { t: "p", text: "Offering a test that stops a container with a request in flight turns the fix into something that stays fixed." }
        ]
      },
      {
        level: "core",
        q: "WSGI or ASGI?",
        strong: "ASGI if the application is genuinely async throughout, because one worker then handles thousands of concurrent awaits. WSGI with threads is perfectly good for a blocking codebase, and better than an async app that calls blocking drivers.",
        answer: [
          { t: "p", text: "The caveat is the substance: async gains nothing if the I/O is not awaited, and costs complexity regardless." },
          { t: "p", text: "Mentioning that ASGI also enables WebSockets and streaming shows you know it is a protocol difference, not just a concurrency one." },
          { t: "p", text: "Being willing to recommend `gthread` for a blocking codebase demonstrates judgement rather than fashion." }
        ]
      }
    ]
  }
});
