/* ============================================================================
   LESSON 11.8 — Choosing a Concurrency Model
   ========================================================================= */
EC.receiveLesson({
  id: "11.8",

  lede: "Seven lessons of mechanism, reduced to a decision you can make in ten minutes. **The choice is nearly always determined by two measurements and one constraint** — whether the work waits or computes, how many things must be in flight, and whether your dependencies have async drivers. Everything else is detail you can change later.",

  objectives: [
    "Apply a decision procedure rather than a preference",
    "Work four realistic systems end to end and defend each choice",
    "Recognise a workload whose stages need different models",
    "Identify when the answer is not concurrency at all",
    "Say what would make you revisit a decision"
  ],

  prerequisites: ["11.5", "11.6", "11.7"],

  blocks: [

    { t: "h2", n: "01", text: "The procedure", id: "procedure" },

    { t: "viz",
      title: "Four questions, in order",
      caption: "Each question rules out branches below it. Most decisions are settled by the first two, and the ones that reach the fourth are the ones worth thinking hard about.",
      svg: `<svg viewBox="0 0 900 350" role="img" aria-label="A decision tree: can the work be avoided, is it I/O or CPU bound, how many concurrent operations, and are async drivers available">
  <defs>
    <marker id="dt" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="18" width="872" height="40" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="34" y="43" class="s-mono" style="font-size:11px;fill:var(--good)">0  Can the work be avoided?</text>
  <text x="330" y="43" class="s-sub">Batch the calls · cache · index the query · do less</text>
  <text x="800" y="43" class="s-sub" style="fill:var(--good)">stop here</text>

  <line x1="450" y1="60" x2="450" y2="74" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#dt)"/>

  <rect x="14" y="78" width="872" height="40" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="34" y="103" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">1  cpu / wall  — waiting or computing?</text>
  <text x="330" y="103" class="s-sub">near 0 → I/O   ·   near 1 → CPU   ·   between → split the stages</text>

  <line x1="240" y1="120" x2="240" y2="140" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#dt)"/>
  <line x1="680" y1="120" x2="680" y2="140" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#dt)"/>

  <rect x="14" y="144" width="430" height="40" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="34" y="169" class="s-mono" style="font-size:11px">2  I/O — how many in flight?</text>

  <rect x="456" y="144" width="430" height="40" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="476" y="169" class="s-mono" style="font-size:11px">2  CPU — is it pure Python?</text>

  <line x1="130" y1="186" x2="130" y2="204" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#dt)"/>
  <line x1="330" y1="186" x2="330" y2="204" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#dt)"/>
  <line x1="570" y1="186" x2="570" y2="204" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#dt)"/>
  <line x1="780" y1="186" x2="780" y2="204" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#dt)"/>

  <rect x="14" y="208" width="212" height="62" rx="8" style="fill:none;stroke:var(--accent-line)" stroke-width="1.3"/>
  <text x="120" y="232" text-anchor="middle" class="s-sub">tens to hundreds</text>
  <text x="120" y="256" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">ThreadPoolExecutor</text>

  <rect x="234" y="208" width="210" height="62" rx="8" style="fill:none;stroke:var(--accent-line)" stroke-width="1.3"/>
  <text x="339" y="232" text-anchor="middle" class="s-sub">thousands+</text>
  <text x="339" y="256" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">asyncio</text>

  <rect x="456" y="208" width="212" height="62" rx="8" style="fill:none;stroke:var(--good)" stroke-width="1.3"/>
  <text x="562" y="232" text-anchor="middle" class="s-sub">no — numpy, hashlib, zlib</text>
  <text x="562" y="256" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">threads work</text>

  <rect x="676" y="208" width="210" height="62" rx="8" style="fill:none;stroke:var(--warn-line)" stroke-width="1.3"/>
  <text x="781" y="232" text-anchor="middle" class="s-sub">yes — the GIL binds</text>
  <text x="781" y="256" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">ProcessPool</text>

  <line x1="14" y1="292" x2="886" y2="292" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="14" y="318" class="s-sub" style="fill:var(--crit)">3  Does every driver have an async version? If not, asyncio is off the table whatever question 2 said.</text>
  <text x="14" y="342" class="s-sub">One synchronous call on the loop removes all concurrency in the process — it is a stack property, not a syntax one.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the measurement that answers question 1", code: `
import time


def classify(fn, *args) -> str:
    """Ten minutes of work that decides everything after it."""
    w0, c0 = time.perf_counter(), time.process_time()
    fn(*args)
    wall = time.perf_counter() - w0
    cpu = time.process_time() - c0
    ratio = cpu / wall if wall else 0

    print(f"wall {wall:6.2f}s  cpu {cpu:6.2f}s  cpu/wall {ratio:5.0%}")
    return ("CPU-bound" if ratio > 0.7
            else "I/O-bound" if ratio < 0.3
            else "mixed — split the stages")
`,
      caption: "**Do this before choosing.** Almost every wrong concurrency decision traces back to nobody having run it — the work was assumed CPU-bound because it felt like work, or I/O-bound because it touched a network (Lesson 11.1)."
    },

    { t: "table",
      head: ["Answer", "Model", "Typical size", "Watch for"],
      rows: [
        ["I/O, tens–hundreds", "`ThreadPoolExecutor`", "20–200 threads", "The remote rate limit, not your CPU"],
        ["I/O, thousands+", "`asyncio`", "1,000–50,000 tasks", "One blocking call ruins it"],
        ["CPU, pure Python", "`ProcessPoolExecutor`", "One worker per core", "Pickling cost; `chunksize`"],
        ["CPU, in a C extension", "`ThreadPoolExecutor`", "One per core", "Nested library parallelism"],
        ["Mixed", "Split the stages", "Each stage sized separately", "A queue between them"],
        ["Avoidable", "**None**", "—", "Batch, cache, index, or do less"]
      ],
      caption: "**Row six is the one people skip.** Deduplicating 200 API calls down to 12, or adding an index, is usually a bigger win than any concurrency model and carries none of the complexity (Lesson 10.5)."
    },

    { t: "h2", n: "02", text: "Four systems", id: "worked" },

    { t: "tabs", items: [
      { label: "Web scraper", blocks: [
        { t: "p", text: "**Fetch 50,000 product pages daily and extract a price from each.** Roughly 180 ms of network and 2 ms of parsing per page." },
        { t: "code", lang: "python", numbered: false, title: "the reasoning", code: `
# 0. Avoidable?   No — the pages must be fetched. But check for a
#                 sitemap, a bulk export or an API first; often there is
#                 one and the whole job disappears.
# 1. cpu/wall     ~1%. Overwhelmingly I/O.
# 2. In flight    Thousands would be ideal, but the SITE is the limit,
#                 not the machine. 20-50 against one host is polite;
#                 more gets you blocked.
# 3. Drivers      httpx is async. Nothing else is involved.
#
# VERDICT: asyncio, with a semaphore and a rate limiter -- and the
# semaphore is doing more work than the model choice.`},
        { t: "code", lang: "python", numbered: false, title: "the shape", code: `
async def scrape_all(urls: list[str]) -> list[Price]:
    sem = asyncio.Semaphore(30)
    limiter = RateLimiter(rate=15, burst=30)

    async with httpx.AsyncClient(
        limits=httpx.Limits(max_connections=30),
        timeout=httpx.Timeout(10.0, connect=3.05),
    ) as client:

        async def one(url: str) -> Price:
            async with sem:
                await limiter.acquire()
                async with asyncio.timeout(10):
                    r = await client.get(url)
                    return parse_price(url, r.text)

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(one(u)) for u in urls]
    return [t.result() for t in tasks]`},
        { t: "p", text: "**Threads would also work** and would be a reasonable choice if the codebase were synchronous. At 30 concurrent that is 30 threads, which is nothing — `asyncio` wins here on being the natural fit for HTTP fan-out rather than on necessity." }
      ]},

      { label: "Image pipeline", blocks: [
        { t: "p", text: "**Download 10,000 images, resize each, upload the result.** Download ~200 ms, resize ~400 ms of Pillow, upload ~150 ms." },
        { t: "code", lang: "python", numbered: false, title: "the reasoning", code: `
# 0. Avoidable?   Partly -- do the images need resizing at all, or can
#                 a CDN do it on request? Ask before building anything.
# 1. cpu/wall     ~55%. MIXED, and that is the whole answer.
# 2. Per stage    download  I/O          -> overlap the waiting
#                 resize    CPU, Pillow  -> Pillow releases the GIL for
#                                           most operations, so threads
#                                           work; processes also fine
#                 upload    I/O          -> overlap the waiting
# 3. Drivers      boto3 is synchronous. aioboto3 exists but is thinner.
#
# VERDICT: split the stages. Threads for I/O, processes for the resize
# -- and MEASURE whether Pillow's GIL release makes threads sufficient,
# because one model is simpler than two.`},
        { t: "code", lang: "python", numbered: false, title: "the shape", code: `
def process_all(keys: list[str]) -> list[str]:
    # Stage 1 — I/O. Many threads, each mostly waiting.
    with ThreadPoolExecutor(max_workers=32) as io_pool:
        blobs = list(io_pool.map(download, keys))

    # Stage 2 — CPU. One worker per core, no more.
    with ProcessPoolExecutor(max_workers=os.cpu_count()) as cpu_pool:
        resized = list(cpu_pool.map(resize, blobs, chunksize=4))

    # Stage 3 — I/O again.
    with ThreadPoolExecutor(max_workers=32) as io_pool:
        return list(io_pool.map(upload, resized))

# Materialising between stages is fine for 10,000 images and wrong for
# 10 million -- at that size, a bounded queue between stages so the
# three run concurrently and memory stays flat (Lesson 11.3).`},
        { t: "p", text: "**The worker counts differ by a factor of four for a reason.** Threads are waiting, so 32 is fine; processes are computing, so more than one per core adds switching. Using the same number for both is the most common mistake in a mixed pipeline." }
      ]},

      { label: "API gateway", blocks: [
        { t: "p", text: "**Serve 5,000 requests per second; each fans out to three internal services and returns a merged response.** ~40 ms per downstream call, ~1 ms of merging." },
        { t: "code", lang: "python", numbered: false, title: "the reasoning", code: `
# 0. Avoidable?   Are all three calls needed every time? A cache on the
#                 slowest-changing one often removes a third of the load.
# 1. cpu/wall     ~2%. Almost pure I/O.
# 2. In flight    5,000 req/s x 40 ms = 200 concurrent (Little's law),
#                 x3 downstream calls = 600 sockets. Threads could do
#                 this; at 20,000 req/s they could not.
# 3. Drivers      httpx async. Redis has an async client. No blocking
#                 ORM in the request path.
#
# VERDICT: asyncio. The connection counts are within reach of threads
# today, and asyncio leaves headroom for an order of magnitude more.`},
        { t: "code", lang: "python", numbered: false, title: "the shape", code: `
@app.get("/summary/{user_id}")
async def summary(user_id: str) -> Summary:
    # A deadline on the HANDLER, so a slow downstream cannot hold a
    # client past what it will wait for.
    async with asyncio.timeout(0.5):
        async with asyncio.TaskGroup() as tg:
            profile = tg.create_task(svc.profile(user_id))
            orders = tg.create_task(svc.orders(user_id))
            prefs = tg.create_task(svc.prefs(user_id))

    return merge(profile.result(), orders.result(), prefs.result())`},
        { t: "p", text: "**The risk is not the model, it is the discipline it demands.** One synchronous call added later — a metrics library, a JSON schema validator over a large payload, a blocking driver in a new dependency — removes all concurrency in the process. A heartbeat test in CI is what keeps that honest (Lesson 11.6)." }
      ]},

      { label: "Batch ETL", blocks: [
        { t: "p", text: "**Nightly: read 40 GB of JSONL, transform each row, write to a warehouse.** ~30 µs of parsing per row, ~50 million rows." },
        { t: "code", lang: "python", numbered: false, title: "the reasoning", code: `
# 0. Avoidable?   The biggest question here. Is the transform pushable
#                 into SQL? Can the warehouse ingest the raw file and
#                 transform in-database? Often yes, and then there is
#                 no Python job at all.
# 1. cpu/wall     ~95% once the file is streaming. CPU-bound.
# 2. Pure Python? Yes -- json.loads holds the GIL, and the transform is
#                 dict manipulation. So threads are useless.
# 3. Per item     30 us of work against ~160 us of process boundary.
#                 Per-row dispatch would be 5x SLOWER than serial;
#                 CHUNKING is what makes processes viable at all.
#
# VERDICT: processes with a large chunksize -- but first swap json for
# orjson (3x, one import) and check whether the warehouse can do it.`},
        { t: "code", lang: "python", numbered: false, title: "the shape", code: `
def run(path: str) -> int:
    # Stream the file: peak memory is one chunk, not 40 GB
    # (Lesson 10.3).
    def chunks(size: int = 20_000):
        with open(path, encoding="utf-8") as f:
            while batch := list(itertools.islice(f, size)):
                yield batch

    written = 0
    ctx = multiprocessing.get_context("spawn")
    with ProcessPoolExecutor(max_workers=os.cpu_count(),
                             mp_context=ctx) as pool:
        for rows in pool.map(transform_chunk, chunks()):
            written += warehouse.write(rows)
    return written

# 20,000 rows per chunk = ~600 ms of work per boundary crossing, so the
# ~160 us of pickling is 0.03% overhead instead of 500%.`},
        { t: "p", text: "**Note what is not here: no threads, no asyncio.** The write is I/O, but it happens in the parent as a stream of batches, and overlapping it would complicate the job for a few per cent. Reach for a second model only when the measurement says the first one is not enough." }
      ]}
    ]},

    { t: "h2", n: "03", text: "Signals you chose wrong", id: "signals" },

    { t: "table",
      head: ["Symptom", "Likely cause", "Check"],
      rows: [
        ["Threads made it slower", "CPU-bound pure Python — GIL contention", "`cpu/wall`; try processes"],
        ["Processes made it slower", "Work per task below the boundary cost", "Add `chunksize`, or drop concurrency"],
        ["Async is slower than the sync version", "A blocking call on the loop", "`asyncio.run(main(), debug=True)`"],
        ["Fast locally, slow on a bigger machine", "Nested library parallelism", "`OMP_NUM_THREADS=1`"],
        ["Memory grows until OOM", "Unbounded queue or submitted batch", "Bound the queue; window the submissions"],
        ["Works, then 429s from upstream", "Concurrency limit but no rate limit", "Add a token bucket"],
        ["Shutdown hangs", "`CancelledError` swallowed, or a daemon thread", "Re-raise it; check `except BaseException`"]
      ],
      caption: "**Every row is recoverable and most are one line.** The decision is not permanent — `concurrent.futures` makes threads and processes a one-word change, and only a commitment to `asyncio` is genuinely expensive to reverse."
    },

    { t: "callout", kind: "tradeoff", title: "What each choice actually costs you later", body: [
      { t: "table",
        head: ["", "Reversibility", "Spreads through the codebase?", "New failure modes"],
        rows: [
          ["`ThreadPoolExecutor`", "**Trivial**", "No — a local change", "Races on shared state"],
          ["`ProcessPoolExecutor`", "**Trivial**", "Slightly — arguments must pickle", "Start-method and pickling issues"],
          ["`asyncio`", "**Expensive**", "**Yes — upward through every caller**", "Blocking calls, cancellation, task lifetime"],
          ["Splitting stages", "Moderate", "A queue between them", "Backpressure to get right"],
          ["Doing less work", "—", "No", "**None**"]
        ]
      },
      { t: "p", text: "**`asyncio` is the only one that is hard to undo.** `async` is contagious upward: every caller of a coroutine must itself be a coroutine, so adopting it in one module tends to convert the modules above it (Lesson 11.6)." },
      { t: "p", text: "**Which argues for starting with threads in an existing synchronous codebase**, measuring, and moving to `asyncio` only when the connection counts or the measurement demand it. In a new I/O-heavy service, start async and keep every driver async from the first commit." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Four decisions, with the reasoning written down",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Four systems. For each, run the procedure and write the decision as you would put it in a design document — including what you measured, what you chose, what you rejected, and what would change your mind." },
        { t: "code", lang: "python", numbered: false, title: "the four", code: `
# A — A webhook receiver. 200 req/s. Each request validates a JSON
#     payload (~3 ms), writes one row to Postgres (~8 ms), and returns.
#     The codebase is Flask, synchronous, 40k lines.

# B — A nightly report. Reads 2M rows from Postgres, computes a
#     statistical summary per customer with numpy (~4 ms each,
#     ~9,000 customers), writes a PDF per customer (~200 ms, a C
#     library that releases the GIL).

# C — A chat backend. 30,000 concurrent WebSocket connections, each
#     mostly idle. A message arriving fans out to a room of up to 500.
#     Greenfield.

# D — A log ingester. Reads from Kafka, parses each line (~40 us of
#     pure Python), enriches from a Redis lookup (~1 ms), writes to
#     ClickHouse in batches. 80,000 lines/second required.`},
        { t: "p", text: "One of the four has an answer that is not a concurrency model." }
      ],
      requirements: [
        "State the measurement you would take first for each.",
        "Give a decision with a reason, not a preference.",
        "Say explicitly what you rejected and why.",
        "Identify the one where the answer is not concurrency.",
        "For D, work out whether the required throughput is even achievable in Python.",
        "**For each, state what would make you revisit it.**"
      ],
      hint: "For A, weigh the cost of the rewrite against the benefit. For D, do the arithmetic on 80,000 × 40 µs before choosing anything.",
      solution: {
        lang: "python",
        title: "decisions.md",
        code: `# =========================================================================
# A — WEBHOOK RECEIVER
# =========================================================================
#
# MEASURE      cpu/wall on one request.
#              ~3 ms validation + ~8 ms database wait = ~27% CPU.
#              I/O-dominated, but not overwhelmingly.
#
# IN FLIGHT    Little's law: 200 req/s x 11 ms = ~2.2 concurrent.
#              Two. Not two hundred.
#
# DECISION     Gunicorn with threaded workers. 4 workers x 8 threads.
#              No application code changes at all.
#
# REJECTED     asyncio. This is the important rejection: converting 40k
#              lines of Flask to async, swapping psycopg2 for asyncpg
#              and rewriting every test, to serve a workload needing
#              2.2 concurrent operations. The ceiling is not the
#              problem, so nothing is bought.
#
# REJECTED     processes-per-request. The work is I/O; processes would
#              add memory and pickling for no gain.
#
# REVISIT IF   sustained load exceeds ~2,000 req/s (≈22 concurrent, at
#              which point thread count starts to matter), or the
#              handler grows a slow outbound call that pushes
#              concurrency past a few hundred.
#
# NOTE         The honest first move is not concurrency at all: check
#              whether the 8 ms Postgres write is a single INSERT that
#              could be batched. Batching 200/s into groups of 50 is a
#              4x reduction in database round trips and needs no model.


# =========================================================================
# B — NIGHTLY REPORT
# =========================================================================
#
# MEASURE      cpu/wall per stage, not for the job.
#                read 2M rows      I/O + driver          ~15% CPU
#                numpy summary     C, releases the GIL   ~98% CPU
#                PDF render        C, releases the GIL   ~95% CPU
#
#              Total work: 9,000 x (4 ms + 200 ms) = ~31 minutes serial.
#
# DECISION     ThreadPoolExecutor, one worker per core, over customers.
#              Both CPU stages happen inside C libraries that release
#              the GIL, so threads achieve real parallelism here
#              (Lesson 11.2).
#
# REJECTED     ProcessPoolExecutor. It would also work, and it would
#              pickle a numpy array and a PDF buffer per customer -- a
#              real cost for no benefit, since the GIL is not the
#              constraint. Simpler is better when both work.
#
# REJECTED     asyncio. There is nothing to overlap; the job is 95% CPU.
#
# VERIFY       Do not take the GIL-release claim on trust:
#
#                serial = time_it(lambda: [render(c) for c in sample])
#                threaded = time_it(lambda: thread_map(render, sample, 8))
#                assert threaded < serial * 0.4
#
#              If that fails, the library holds the GIL and the answer
#              becomes processes. This assertion belongs in the test
#              suite, because a library upgrade can change it silently.
#
# REVISIT IF   the PDF library is replaced, or the summary moves to
#              pure Python -- either flips the answer to processes.


# =========================================================================
# C — CHAT BACKEND
# =========================================================================
#
# MEASURE      Nothing to measure yet -- it is greenfield. The design
#              constraint is the connection count, which is given.
#
# IN FLIGHT    30,000 idle WebSockets.
#                threads: 30,000 x ~8 MB = 240 GB of address space.
#                         Not feasible.
#                tasks:   30,000 x ~5 KB = ~150 MB. Comfortable.
#
# DECISION     asyncio. This is the case where it is not a preference
#              but the only option: no other model in Python holds
#              30,000 mostly-idle connections in one process.
#
# REJECTED     threads, on the arithmetic above.
# REJECTED     processes -- connections cannot be shared across them
#              without a broker, and each process would need its own
#              copy of the room membership.
#
# DISCIPLINE   Because asyncio is chosen, three rules apply from commit
#              one, and they are cheap now and expensive later:
#                1. every driver async -- Redis, Postgres, everything
#                2. a CI test asserting the loop is never blocked
#                   (the heartbeat test from Lesson 11.6)
#                3. no CPU work in a handler; anything heavy goes to
#                   run_in_executor
#
# FAN-OUT      A 500-member room is 500 sends. Use a TaskGroup with a
#              semaphore so one slow client cannot delay the room, and
#              a per-send timeout so a dead connection is dropped
#              rather than waited on.
#
# REVISIT IF   a single message needs meaningful CPU (encryption,
#              moderation) -- then a process pool alongside the loop,
#              not instead of it.


# =========================================================================
# D — LOG INGESTER: THE ARITHMETIC COMES FIRST
# =========================================================================
#
# REQUIRED     80,000 lines/second.
#
# BUDGET       1 second / 80,000 = 12.5 us per line, TOTAL.
#              Measured cost per line:
#                parse (pure Python)     40 us
#                Redis lookup             1 ms
#                                        -------
#                                        ~1,040 us
#
#              1,040 / 12.5 = 83x too slow, single-threaded.
#
# SO: what would 80,000/s require?
#
#   Redis at 1 ms each     -> 80 concurrent lookups minimum. Trivial
#                             with asyncio, and it MUST be pipelined or
#                             it alone caps throughput.
#   Parsing at 40 us       -> 80,000 x 40 us = 3.2 CPU-SECONDS of pure
#                             Python per second of input.
#                             That needs 4+ cores doing nothing else,
#                             and the GIL means one process cannot.
#
# DECISION     Not one model -- a shape:
#                1. FIRST: reduce the 40 us. orjson instead of json is
#                   ~3x; a compiled parser more. 40 -> 12 us takes the
#                   CPU requirement from 3.2 to 1.0 core-seconds.
#                2. Batch the Redis lookups. 1,000 keys in one MGET is
#                   ~2 ms, not 1,000 ms. This removes the I/O problem
#                   entirely -- and it is the biggest single win.
#                3. Multiple PROCESSES, each owning Kafka partitions.
#                   This is the standard answer: parallelism through
#                   partitioning, with no shared state and no IPC.
#                4. Batched ClickHouse writes, which it wants anyway.
#
# REJECTED     A single process with any model. The CPU arithmetic rules
#              it out before any consideration of I/O.
#
# REJECTED     asyncio alone. It would fix the Redis half and leave the
#              3.2 core-seconds of parsing untouched -- and blocking the
#              loop with it.
#
# THE POINT    Two of the four steps are not concurrency at all. Batching
#              the lookups and swapping the parser together take the
#              requirement from "83x too slow" to "about 1 core plus
#              partitioning", which is ordinary. Concurrency was never
#              the first question (Lesson 10.5).
#
# REVISIT IF   the parse cost cannot come down -- then the honest
#              options are a native parser (Lesson 10.6) or accepting
#              more machines.


# =========================================================================
# THE ONE THAT IS NOT A CONCURRENCY PROBLEM
# =========================================================================
#
# D, most sharply -- batching 1,000 Redis lookups into one MGET is a
# 500x reduction in I/O and needs no concurrency model whatsoever.
#
# But A deserves the same look: 200 database writes per second batched
# into groups of 50 is a 4x reduction in round trips, and the threaded
# worker configuration is then comfortable rather than adequate.
#
# The general lesson of this module: run question 0 properly. Batching,
# caching and indexing are usually larger wins than any concurrency
# model, they carry none of its failure modes, and they are almost
# always fewer lines of code.


# =========================================================================
# THE SUMMARY TABLE
# =========================================================================
#
#   sys  bound      in flight   decision              rejected
#   ---  ---------  ----------  --------------------  ------------------
#   A    I/O        ~2          threaded workers      asyncio (rewrite
#                                                     buys nothing)
#   B    CPU in C   ~8          ThreadPoolExecutor    processes (pickling
#                                                     for no gain)
#   C    I/O        30,000      asyncio               threads (240 GB)
#   D    both       ~80         batch + orjson +      one process, any
#                               process partitions    model (83x short)`,
        notes: [
          { t: "p", text: "**A is the decision most teams get wrong, and the reasoning is arithmetic.** Little's law gives 2.2 concurrent operations for 200 req/s at 11 ms — so the `asyncio` rewrite would spend a quarter converting 40,000 lines to raise a ceiling that is not being approached. \"We might need it later\" is answered by the revisit trigger, not by building it now." },
          { t: "p", text: "**B is the case where the obvious rule gives the wrong answer.** Ninety-five per cent CPU says \"processes\", but both hot stages run inside C libraries that release the GIL, so threads achieve real parallelism without pickling numpy arrays and PDF buffers. The assertion that verifies it belongs in the test suite, because a library upgrade can silently change it (Lesson 11.2)." },
          { t: "p", text: "**C is the only one where the model is forced.** 30,000 threads is 240 GB of address space; 30,000 tasks is 150 MB. Nothing else in Python holds that many mostly-idle connections in one process — and because the choice is forced, the three disciplines it demands should be adopted from the first commit rather than discovered later." },
          { t: "callout", kind: "insight", title: "D's arithmetic is the technique worth taking away", body: [
            { t: "p", text: "Dividing one second by the required rate gives a per-item budget — 12.5 µs — and comparing it with the measured cost immediately shows the job is 83× short. That single calculation rules out every single-process design before any model is considered." },
            { t: "p", text: "It also shows where to look: 1,000 µs of the 1,040 is the Redis lookup, and batching it into an `MGET` removes 99% of the problem. Concurrency was never the first question." }
          ]},
          { t: "p", text: "**Writing down what would change your mind is what makes a decision reviewable.** \"Threads, revisit above 2,000 req/s\" invites a measurement later; \"threads are fine\" invites an argument. Every one of these four has a trigger, and three of them are numbers someone can check against a dashboard." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team is asked to make their API faster. They spend a quarter converting it to `asyncio` — every handler, the ORM, the tests. The rewrite is well executed and p99 improves by 8%." },
      { t: "p", text: "**They never measured the request.** A profile taken afterwards showed 91% of a typical request was one database query with a missing index. The concurrency ceiling had never been the constraint: the service handled 300 requests per second and `asyncio` raised a limit it was nowhere near." },
      { t: "p", text: "**The index took twenty minutes and cut p99 by 70%.** It was found by someone new reading the slow-query log in their first week." },
      { t: "p", text: "**The procedure exists to prevent exactly this.** Question 0 — can the work be avoided — would have found the index. Question 1 would have shown the request was waiting on one query rather than starved of concurrency. **Ten minutes of measurement before choosing a model is the highest-return work in this entire module**, and it is the step under deadline pressure that people skip first." }
    ]}
  ],

  takeaways: [
    "**Ask whether the work can be avoided first.** Batching, caching and indexing are usually larger wins than any concurrency model and carry none of its failure modes.",
    "**Measure `cpu / wall` before choosing.** Near zero is I/O, near one is CPU, in between means the stages need splitting.",
    "**Use Little's law for the concurrency you actually need**: throughput × latency. It is often two, not two hundred.",
    "**I/O with tens to hundreds in flight: threads. Thousands: `asyncio`.** The deciding factor is the connection count, not taste.",
    "**CPU-bound pure Python needs processes; CPU-bound C-extension work threads fine** — and that exception covers `numpy`, `hashlib`, `zlib`, Pillow and most compression and crypto.",
    "**Verify a GIL-release claim with a test.** A library upgrade can change it silently and your parallelism disappears with nothing failing.",
    "**Check that every driver has an async version before choosing `asyncio`.** One synchronous call on the loop removes all concurrency in the process.",
    "**`asyncio` is the only choice that is expensive to reverse**, because `async` spreads upward through every caller. Threads and processes are a one-word change.",
    "**In an existing synchronous codebase, start with threads.** In a new I/O-heavy service, start async and keep every driver async from the first commit.",
    "**A mixed workload needs its stages split**, each sized separately — threads for waiting, processes for computing, a bounded queue between.",
    "**Compute a per-item budget from the required throughput.** One second divided by the target rate, against the measured cost, rules out whole designs before you pick a model.",
    "**Write down what would make you revisit the decision.** A trigger invites a measurement later; a bare conclusion invites an argument."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A Flask service handles 200 req/s; each request takes 11 ms, mostly a database write. A team proposes an `asyncio` rewrite. What does Little's law say?",
        options: [
          "200 concurrent operations are needed, so async is justified",
          "About 2.2 concurrent operations — the ceiling threads provide is nowhere near being approached, so the rewrite buys nothing",
          "Concurrency cannot be estimated without profiling the ORM",
          "11,000 concurrent operations, since latency compounds"
        ],
        answer: 1,
        why: "Throughput × latency is 200 × 0.011 ≈ 2.2 in flight. Threaded workers handle that with enormous headroom, so converting 40,000 lines of Flask — plus the driver and every test — raises a limit that is not binding. The right answer is a revisit trigger: reconsider above roughly 2,000 req/s, where thread counts start to matter."
      },
      {
        stem: "A nightly job is 95% CPU, but the hot work is `numpy` and a PDF library. Which model?",
        options: [
          "Processes — CPU-bound work always needs processes",
          "Threads, because both libraries release the GIL, so they parallelise without paying to pickle arrays and buffers",
          "asyncio, since the job also reads from a database",
          "None — CPU-bound work cannot be parallelised in Python"
        ],
        answer: 1,
        why: "\"CPU-bound means processes\" is a rule about *pure Python*. A C extension that releases the GIL achieves real parallelism with threads, and avoids pickling a numpy array and a PDF buffer per item. Verify it rather than assuming — a benchmark-marked test asserting the threaded version is meaningfully faster catches a library upgrade that changes the behaviour."
      },
      {
        stem: "A chat backend needs 30,000 concurrent WebSocket connections. Why is `asyncio` not merely preferable but required?",
        options: [
          "WebSockets can only be implemented with asyncio",
          "30,000 threads is roughly 240 GB of stack address space; 30,000 tasks is about 150 MB",
          "Threads cannot hold a socket open indefinitely",
          "The GIL prevents threads from handling network I/O"
        ],
        answer: 1,
        why: "A thread costs about 8 MB of stack address space and a kernel object; a task costs a few kilobytes. At this connection count no other model in Python fits in one process. Because the choice is forced, the disciplines it demands — async drivers throughout, a loop-blocking test in CI, no CPU work in handlers — should be adopted from the first commit."
      },
      {
        stem: "An ingester must handle 80,000 lines/second. Each line costs 40 µs to parse and 1 ms for a Redis lookup. What does the arithmetic show?",
        options: [
          "asyncio will handle it, since the Redis lookup dominates",
          "The budget is 12.5 µs per line and the cost is ~1,040 µs — 83× short, so batching the lookups and speeding the parser come before any concurrency model",
          "A process pool with one worker per core is sufficient",
          "It is achievable with threads because Redis releases the GIL"
        ],
        answer: 1,
        why: "One second divided by 80,000 gives the per-item budget. Comparing it with the measured cost rules out every single-process design immediately. Batching 1,000 lookups into one `MGET` removes 99% of the cost, and a faster parser removes most of the rest — after which ordinary partitioning across processes is enough. Concurrency was not the first question."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you choose a concurrency model?",
        strong: "Ask whether the work can be avoided, measure `cpu/wall`, compute the concurrency actually needed with Little's law, and check whether async drivers exist. Most decisions are settled by the first two questions.",
        answer: [
          { t: "p", text: "Leading with \"can this be avoided\" is what separates an engineer from someone reciting a decision tree — batching and indexing beat every model and carry none of the failure modes." },
          { t: "p", text: "Little's law turns \"we need async for scale\" into a number, and the number is usually far smaller than people assume." },
          { t: "p", text: "The reversibility point is the practical one: threads and processes are a one-word change, `asyncio` spreads upward through every caller and is expensive to undo." }
        ]
      },
      {
        level: "advanced",
        q: "When is asyncio the wrong choice despite the work being I/O-bound?",
        strong: "When the drivers are not async, when the codebase is large and synchronous, or when the required concurrency is small enough that threads are trivially sufficient. One blocking call on the loop removes all concurrency in the process.",
        answer: [
          { t: "p", text: "\"Async all the way down is a stack property, not a syntax one\" is the compact form, and the FastAPI-with-psycopg2 case makes it concrete." },
          { t: "p", text: "Weighing the rewrite cost against the benefit — a quarter of work to raise a ceiling nobody is near — is the judgement being tested." },
          { t: "p", text: "Naming where it is genuinely forced, like 30,000 idle connections, keeps the answer balanced rather than dismissive." }
        ]
      },
      {
        level: "advanced",
        q: "A pipeline downloads, processes and uploads. What would you build?",
        strong: "Split the stages and match each: threads for the I/O ends because they are waiting, processes for the CPU middle if it is pure Python, with a bounded queue between them if the volume means you cannot materialise between stages.",
        answer: [
          { t: "p", text: "Sizing the stages differently — tens of threads against one process per core — is the detail that shows the reasoning is about what each unit costs." },
          { t: "p", text: "Checking whether the CPU stage is really pure Python is the step that often collapses two models into one, which is worth preferring when both work." },
          { t: "p", text: "Mentioning backpressure between stages shows awareness that the queue is where a mixed pipeline usually fails — a fast producer filling memory ahead of a slow consumer." }
        ]
      }
    ]
  }
});
