/* ============================================================================
   LESSON 11.6 — asyncio and the Event Loop
   ========================================================================= */
EC.receiveLesson({
  id: "11.6",

  lede: "One thread, one loop, thousands of connections. `asyncio` gets its concurrency from cooperation rather than pre-emption: a coroutine runs until it hits an `await` and voluntarily hands control back. **That is the whole model, and it is also the whole hazard** — a coroutine that never yields stops every other task in the process.",

  objectives: [
    "Describe the event loop as a scheduler of ready callbacks",
    "Distinguish a coroutine from a function, and a coroutine object from a running task",
    "Identify where control can and cannot be handed back",
    "Recognise a blocking call inside async code and move it off the loop",
    "Choose `asyncio` over threads with a reason rather than a preference"
  ],

  prerequisites: ["11.1", "8.1"],

  blocks: [

    { t: "h2", n: "01", text: "The loop", id: "loop" },

    { t: "viz",
      title: "One thread, a queue of ready tasks",
      caption: "The loop picks a ready task and runs it until it awaits something unfinished. That task is parked with the OS watching its socket, and the loop picks the next ready one. Nothing is pre-empted — every switch happens at an `await`.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Diagram of an event loop taking ready tasks from a queue, running each until it awaits, and parking it while the OS watches its socket">
  <defs>
    <marker id="el" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent-line)"/>
    </marker>
  </defs>

  <rect x="14" y="40" width="200" height="120" rx="10" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="114" y="66" text-anchor="middle" class="s-label">READY QUEUE</text>
  <g class="s-mono" style="font-size:10px">
    <rect x="34" y="80" width="160" height="20" rx="4" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="44" y="95">task A</text>
    <rect x="34" y="106" width="160" height="20" rx="4" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="44" y="121">task D</text>
    <rect x="34" y="132" width="160" height="20" rx="4" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="44" y="147">task G</text>
  </g>

  <line x1="218" y1="100" x2="278" y2="100" style="stroke:var(--accent-line)" stroke-width="1.6" marker-end="url(#el)"/>

  <rect x="282" y="56" width="220" height="88" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.6"/>
  <text x="392" y="82" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">RUN ONE TASK</text>
  <text x="392" y="106" text-anchor="middle" class="s-sub">until it awaits something</text>
  <text x="392" y="126" text-anchor="middle" class="s-sub">that is not ready yet</text>

  <line x1="506" y1="100" x2="566" y2="100" style="stroke:var(--accent-line)" stroke-width="1.6" marker-end="url(#el)"/>

  <rect x="570" y="40" width="316" height="120" rx="10" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="728" y="66" text-anchor="middle" class="s-label">PARKED — the OS watches</text>
  <g class="s-mono" style="font-size:10px">
    <rect x="590" y="80" width="276" height="20" rx="4" class="s-fill s-stroke" stroke-width="1"/>
    <text x="600" y="95">task B — waiting on a socket</text>
    <rect x="590" y="106" width="276" height="20" rx="4" class="s-fill s-stroke" stroke-width="1"/>
    <text x="600" y="121">task C — waiting on a timer</text>
    <rect x="590" y="132" width="276" height="20" rx="4" class="s-fill s-stroke" stroke-width="1"/>
    <text x="600" y="147">task E — waiting on a query</text>
  </g>

  <path d="M728 164 L728 186 L114 186 L114 166" style="fill:none;stroke:var(--good)" stroke-width="1.5" marker-end="url(#el)"/>
  <text x="420" y="204" text-anchor="middle" class="s-sub" style="fill:var(--good)">ready again — the socket has data</text>

  <line x1="14" y1="228" x2="886" y2="228" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="256" class="s-sub">One thread. One task running at any instant. Thousands parked, costing a few KB each.</text>
  <text x="14" y="282" class="s-sub" style="fill:var(--crit)">A task that computes for 200 ms without awaiting freezes every other task for 200 ms.</text>
  <text x="14" y="308" class="s-sub">There is no pre-emption: the loop cannot take control back, it can only be given it.</text>
</svg>`
    },

    { t: "callout", kind: "insight", title: "Why this scales where threads do not", body: [
      { t: "table",
        head: ["", "Thread", "asyncio task"],
        rows: [
          ["Memory", "~8 MB of stack address space", "**A few KB**"],
          ["Created by", "The kernel", "Python"],
          ["Switch costs", "A kernel context switch", "A function call"],
          ["Practical ceiling", "Hundreds", "**Tens of thousands**"],
          ["Switches", "Anywhere, pre-emptively", "**Only at `await`**"],
          ["Needs locks", "Yes", "Rarely — see below"]
        ]
      },
      { t: "p", text: "**Ten thousand concurrent connections is an `asyncio` problem.** Ten thousand threads is 80 GB of address space and a scheduler in difficulty; ten thousand tasks is perhaps 40 MB." },
      { t: "p", text: "**Races are rarer but not impossible.** Between two `await` points a coroutine runs uninterrupted, so `counter += 1` is safe in a way it never is with threads (Lesson 11.3). Anything spanning an `await` is not — the loop can run other tasks in that gap." }
    ]},

    { t: "h2", n: "02", text: "Coroutines, and the three things people confuse", id: "coroutines" },

    { t: "code", lang: "python", title: "calling one does not run it", code: `
import asyncio


async def fetch(url: str) -> str:
    await asyncio.sleep(1)
    return f"content of {url}"


coro = fetch("https://example.test")     # NOTHING has happened
print(coro)                              # a coroutine object

result = await coro                      # now it runs
result = asyncio.run(fetch("..."))       # from synchronous code
task = asyncio.create_task(fetch("..."))  # scheduled, runs concurrently
`,
      out: `<coroutine object fetch at 0x...>
RuntimeWarning: coroutine 'fetch' was never awaited`,
      caption: "**Calling an `async def` builds a coroutine object and runs none of it.** Forgetting the `await` is the most common `asyncio` bug, and it produces a warning rather than an error — so it reaches production as \"the function silently did nothing\"."
    },

    { t: "table",
      head: ["", "Does", "Runs concurrently?"],
      rows: [
        ["`fetch(url)`", "Creates a coroutine object", "No — nothing runs"],
        ["`await fetch(url)`", "Runs it and waits for the result", "**No** — sequential"],
        ["`asyncio.create_task(fetch(url))`", "Schedules it on the loop", "**Yes**"],
        ["`await asyncio.gather(a, b)`", "Schedules all and waits", "**Yes**"],
        ["`asyncio.run(main())`", "Starts a loop, runs to completion, closes it", "It is the entry point"]
      ],
      caption: "**`await` in a loop is sequential.** Awaiting each of a hundred fetches one after another takes as long as doing them serially — which is the second most common mistake, and it produces correct results slowly rather than an error."
    },

    { t: "code", lang: "python", title: "the difference in wall time", code: `
import asyncio
import time


async def one(n: int) -> int:
    await asyncio.sleep(1)
    return n


async def sequential() -> list[int]:
    return [await one(i) for i in range(10)]        # 10 seconds


async def concurrent() -> list[int]:
    return await asyncio.gather(*(one(i) for i in range(10)))    # 1 second


async def main() -> None:
    for fn in (sequential, concurrent):
        start = time.perf_counter()
        await fn()
        print(f"{fn.__name__:12} {time.perf_counter() - start:.2f}s")


asyncio.run(main())
`,
      out: `sequential   10.02s
concurrent    1.00s`,
      hl: [11, 15],
      caption: "**Both are `async` and only one is concurrent.** Writing `async def` buys nothing on its own — the concurrency comes from having several things in flight, which means `gather`, a `TaskGroup`, or explicit `create_task`."
    },

    { t: "h2", n: "03", text: "The blocking call", id: "blocking" },

    { t: "callout", kind: "trap", title: "One synchronous call stops the whole process", body: [
      { t: "code", lang: "python", title: "each of these freezes the loop", numbered: false, code: `
async def handler(request):
    time.sleep(1)                      # blocks the LOOP, not this task
    requests.get(url)                  # a synchronous HTTP client
    conn.execute("SELECT ...")         # a synchronous database driver
    Path("big.csv").read_text()        # synchronous file I/O
    hashlib.pbkdf2_hmac(...)           # 200 ms of CPU with no await
    json.dumps(enormous_structure)     # same -- no await point`},
      { t: "p", text: "There is no pre-emption. While that line runs, the loop cannot service **any** other task — so a thousand connected clients all wait, and the symptom is every request slowing down rather than one." },
      { t: "code", lang: "python", title: "the fixes, in order of preference", numbered: false, code: `
# 1. Use an async library
await asyncio.sleep(1)                          # not time.sleep
async with httpx.AsyncClient() as client:       # not requests
    await client.get(url)
await conn.execute("SELECT ...")                # asyncpg, not psycopg2

# 2. No async version? Push it to a thread.
result = await asyncio.to_thread(blocking_call, arg)     # 3.9+

# 3. CPU-bound work belongs in a process, not a thread
loop = asyncio.get_running_loop()
with ProcessPoolExecutor() as pool:
    result = await loop.run_in_executor(pool, cpu_heavy, arg)`},
      { t: "p", text: "**`asyncio.to_thread` is the workhorse.** It runs the blocking call on a thread pool and awaits the result, so the loop stays free — and it is one line around a legacy call you cannot replace." }
    ]},

    { t: "code", lang: "python", title: "catching it in development", code: `
import asyncio

# Warns when a single callback occupies the loop for too long.
asyncio.run(main(), debug=True)

# Or:
loop = asyncio.get_running_loop()
loop.set_debug(True)
loop.slow_callback_duration = 0.1        # default 0.1s
`,
      out: `Executing <Task ... handler() at app.py:42> took 1.031 seconds`,
      caption: "**Debug mode names the file and line of the blocking call.** Enable it in development and in CI; it is the difference between \"the service is slow\" and a specific line number."
    },

    { t: "h2", n: "04", text: "Choosing asyncio", id: "choosing" },

    { t: "ladder",
      title: "A service that calls three APIs per request",
      rungs: [
        { level: "bad", label: "Async syntax, sequential awaits",
          why: "Every function is `async`, the framework is async, and each call still waits for the previous one. All the complexity of the model with none of the benefit — and it looks concurrent, which is why it survives review.",
          code: `async def handler(user_id):
    profile = await fetch_profile(user_id)     # 120 ms
    orders = await fetch_orders(user_id)       # 140 ms
    prefs = await fetch_prefs(user_id)         # 90 ms
    return combine(profile, orders, prefs)     # 350 ms total` },
        { level: "ok", label: "Gather the independent calls",
          why: "The three requests overlap, so the handler takes as long as the slowest rather than their sum. This is the whole point of the model, and it is one line.",
          code: `async def handler(user_id):
    profile, orders, prefs = await asyncio.gather(
        fetch_profile(user_id),
        fetch_orders(user_id),
        fetch_prefs(user_id),
    )
    return combine(profile, orders, prefs)     # 140 ms total` },
        { level: "best", label: "A TaskGroup, with a deadline",
          why: "A `TaskGroup` cancels the siblings when one fails, so a dead dependency does not leave two requests running for nothing. The timeout bounds the handler rather than trusting three separate clients to behave.",
          code: `async def handler(user_id: str) -> Response:
    async with asyncio.timeout(2.0):
        async with asyncio.TaskGroup() as tg:
            profile = tg.create_task(fetch_profile(user_id))
            orders = tg.create_task(fetch_orders(user_id))
            prefs = tg.create_task(fetch_prefs(user_id))

    # Reached only if ALL succeeded; otherwise an ExceptionGroup
    # propagates and the siblings are already cancelled.
    return combine(profile.result(), orders.result(), prefs.result())`,
          note: "`TaskGroup` and `asyncio.timeout` are 3.11+. They replace the `gather` and `wait_for` patterns for new code, and the difference — automatic sibling cancellation — is the subject of the next lesson." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "asyncio or threads", body: [
      { t: "table",
        head: ["", "asyncio", "Threads"],
        rows: [
          ["Concurrent connections", "**Tens of thousands**", "Hundreds"],
          ["Library support needed", "**Async all the way down**", "Any library works"],
          ["Adding to existing sync code", "Hard — it spreads", "**Easy** — drop in a pool"],
          ["A blocking call", "**Freezes everything**", "Blocks one thread"],
          ["Debugging", "Harder — tracebacks cross awaits", "Familiar"],
          ["Races", "Only across `await` points", "Anywhere"]
        ]
      },
      { t: "p", text: "**\"Async all the way down\" is the real cost.** One synchronous database driver anywhere in the stack undoes the model, and rewriting a codebase to `async def` touches every caller — the colour of a function is contagious upward." },
      { t: "p", text: "**Choose `asyncio` for a new I/O-heavy service** with async libraries available, or when connection counts are in the thousands. **Choose threads to add concurrency to existing synchronous code**, where a `ThreadPoolExecutor` is a five-line change (Lesson 11.5)." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find why an async service is slower than the sync one it replaced",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "A team rewrote a handler in `asyncio`. Under load it is slower than the threaded version, and p99 latency is far worse. Five problems, all of which look like correct async code." },
        { t: "code", lang: "python", title: "handler.py — as found", numbered: false, code: `
import asyncio, requests, time

async def enrich(order):
    profile = await fetch_profile(order.customer_id)
    history = await fetch_history(order.customer_id)
    rates = requests.get(RATES_URL).json()
    score = compute_risk(order, profile, history)     # ~80 ms of CPU
    return {"order": order.id, "score": score, "rate": rates[order.currency]}

async def handle_batch(orders):
    results = []
    for order in orders:
        results.append(await enrich(order))
    return results

@app.post("/score")
async def score(orders: list[Order]):
    return await handle_batch(orders)`},
        { t: "p", text: "Diagnose each, fix them, and say which single fix recovers the most latency." }
      ],
      requirements: [
        "Identify all five and the symptom each causes under load.",
        "Say which one makes the service worse than sequential, not merely un-concurrent.",
        "Fix the CPU-bound call without blocking the loop.",
        "Bound the concurrency so a large batch does not open ten thousand connections.",
        "Add a deadline that actually stops work.",
        "**Explain why the `requests` call harms other users' requests, not just this one.**"
      ],
      hint: "Two of the five are sequential awaits at different levels. One is synchronous. One is CPU. And one value is being fetched far more often than it changes.",
      solution: {
        lang: "python",
        title: "handler.py",
        code: `# =========================================================================
# THE FIVE PROBLEMS
# =========================================================================
#
# 1. requests.get INSIDE A COROUTINE                    -- the worst one
#
#    A synchronous HTTP call. While it runs -- 50 ms, or 10 s if the
#    rates host is slow -- the event loop cannot service ANY task. Not
#    just this request: every connected client waits.
#
#    This is why the service is worse than the threaded version. With
#    threads, a blocking call blocks one thread out of sixteen. On a
#    loop it blocks all concurrency in the process, so under load the
#    latencies stack: 100 concurrent requests x 50 ms = 5 s of p99 for
#    requests that did nothing wrong.
#
# 2. compute_risk -- 80 ms of CPU with no await
#
#    Same failure, different cause. There is no pre-emption, so 80 ms of
#    pure Python freezes the loop exactly as a blocking socket does. At
#    100 requests per second the loop is saturated by CPU alone.
#
# 3. SEQUENTIAL AWAITS in enrich()
#
#    profile and history are independent and awaited one after the
#    other. The syntax is async; the behaviour is serial.
#
# 4. SEQUENTIAL AWAITS in handle_batch()
#
#    The same mistake one level up, and worse: a batch of 200 orders is
#    200 x (profile + history) in series. This is the "async but not
#    concurrent" trap -- correct results, arbitrarily slow.
#
# 5. RATES FETCHED PER ORDER
#
#    An exchange-rate table that changes a few times a day, fetched once
#    per order. For a 200-order batch that is 200 identical requests --
#    and it is the fix with the best ratio of effort to benefit, because
#    the right number of calls is zero (Lesson 10.5).


from __future__ import annotations

import asyncio
import logging
import time
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)

MAX_CONCURRENT_ORDERS = 20
BATCH_DEADLINE = 10.0
RATES_TTL = 300.0


# =========================================================================
# FIX 5 — fetch the rates once, not once per order
# =========================================================================

@dataclass
class RatesCache:
    """A single-flight cache: concurrent callers during a refresh await
    the SAME request rather than starting their own. Without the lock, a
    cold cache under load produces one upstream call per in-flight
    request -- the stampede the cache existed to prevent (Lesson 10.4).
    """

    ttl: float = RATES_TTL
    _rates: dict | None = None
    _fetched_at: float = 0.0
    _lock: asyncio.Lock = None

    def __post_init__(self) -> None:
        self._lock = asyncio.Lock()

    async def get(self, client: httpx.AsyncClient) -> dict:
        if self._rates and time.monotonic() - self._fetched_at < self.ttl:
            return self._rates

        async with self._lock:
            # Re-check inside the lock: another task may have refreshed
            # while we waited for it.
            if self._rates and time.monotonic() - self._fetched_at < self.ttl:
                return self._rates
            response = await client.get(RATES_URL, timeout=5.0)
            response.raise_for_status()
            self._rates = response.json()
            self._fetched_at = time.monotonic()
            return self._rates


_rates_cache = RatesCache()
_cpu_pool: ProcessPoolExecutor | None = None      # created at startup


# =========================================================================
# FIX 3 — concurrent, not sequential, within one order
# =========================================================================

async def enrich(order: Order, rates: dict, sem: asyncio.Semaphore) -> dict:
    # FIX 3b: bound the concurrency. Without this a 10,000-order batch
    # opens 20,000 connections at once, which the upstream refuses.
    async with sem:
        # FIX 3a: the two fetches are independent, so they overlap.
        # A TaskGroup cancels the sibling if one fails, so a dead
        # dependency does not leave a request running for nothing.
        async with asyncio.TaskGroup() as tg:
            profile_task = tg.create_task(fetch_profile(order.customer_id))
            history_task = tg.create_task(fetch_history(order.customer_id))

    # FIX 2: 80 ms of CPU goes to a PROCESS, not the loop and not a
    # thread -- compute_risk is pure Python, so a thread would contend
    # for the GIL and gain nothing (Lesson 11.2).
    loop = asyncio.get_running_loop()
    score = await loop.run_in_executor(
        _cpu_pool, compute_risk, order, profile_task.result(), history_task.result()
    )

    return {"order": order.id, "score": score, "rate": rates[order.currency]}


# =========================================================================
# FIX 4 — the batch runs concurrently
# =========================================================================

async def handle_batch(orders: list[Order]) -> list[dict]:
    sem = asyncio.Semaphore(MAX_CONCURRENT_ORDERS)

    async with httpx.AsyncClient() as client:     # FIX 1: async client
        rates = await _rates_cache.get(client)    # FIX 5: once per batch

        # FIX: a deadline that bounds the whole batch. On expiry every
        # task is cancelled, so nothing is left running for a caller who
        # has already given up (Lesson 6.5).
        async with asyncio.timeout(BATCH_DEADLINE):
            async with asyncio.TaskGroup() as tg:
                tasks = [tg.create_task(enrich(o, rates, sem)) for o in orders]

    return [t.result() for t in tasks]


# =========================================================================
# WHY THE requests CALL HURTS OTHER USERS
# =========================================================================
#
# A coroutine runs until it awaits. requests.get() never awaits -- it
# blocks the OS thread inside a socket read, and that thread IS the
# event loop.
#
# So for the duration of that call:
#
#   - no other coroutine can run
#   - no new connection is accepted
#   - no already-completed I/O is collected
#   - every timer is late
#
# With threads, a blocking call costs one worker out of sixteen and the
# other fifteen keep serving. On a loop it costs all concurrency in the
# process. That inversion -- the same call being cheap with threads and
# catastrophic with asyncio -- is why the rewrite made things worse.
#
# Under 100 concurrent requests each doing a 50 ms blocking call, the
# loop is fully occupied for 5 seconds of every second of work offered:
# the queue grows without bound and p99 becomes unbounded.


# =========================================================================
# WHICH SINGLE FIX RECOVERS THE MOST
# =========================================================================
#
#   fix 1 (async HTTP client)      p99 12.4 s -> 2.1 s
#   + fix 2 (CPU to a process)     2.1 s -> 0.9 s
#   + fix 4 (batch concurrency)    0.9 s -> 0.31 s
#   + fix 3 (per-order overlap)    0.31 s -> 0.22 s
#   + fix 5 (rates cached)         0.22 s -> 0.19 s
#
# Fix 1, decisively. It is also the smallest change -- one import and
# one await -- and the only one that is a CORRECTNESS problem rather
# than a missed optimisation: the others make the service slow, that one
# makes it unable to serve concurrent traffic at all.


# =========================================================================
# TESTS
# =========================================================================

import pytest


@pytest.mark.asyncio
async def test_the_loop_is_never_blocked():
    """THE test. A heartbeat task ticks every 10 ms; if the loop is
    blocked, the gap between ticks exceeds the work that blocked it.

    This catches problems 1 and 2 together, and it catches any future
    blocking call nobody thought about."""
    gaps: list[float] = []

    async def heartbeat():
        last = time.perf_counter()
        while True:
            await asyncio.sleep(0.01)
            now = time.perf_counter()
            gaps.append(now - last)
            last = now

    beat = asyncio.create_task(heartbeat())
    try:
        await handle_batch([make_order(i) for i in range(20)])
    finally:
        beat.cancel()

    assert max(gaps) < 0.05, f"loop blocked for {max(gaps) * 1000:.0f} ms"


@pytest.mark.asyncio
async def test_the_batch_is_concurrent_not_sequential():
    """Problems 3 and 4. Asserts on elapsed time against a known
    per-item latency -- the one place a timing assertion is the right
    tool, because concurrency IS a timing property."""
    orders = [make_order(i) for i in range(20)]      # ~120 ms each

    start = time.perf_counter()
    await handle_batch(orders)
    elapsed = time.perf_counter() - start

    assert elapsed < 1.0, f"{elapsed:.2f}s — looks sequential"


@pytest.mark.asyncio
async def test_concurrency_is_bounded():
    """A 10,000-order batch must not open 20,000 connections. Asserting
    on peak in-flight count is a property; a connection-count assertion
    would depend on the client's pooling."""
    peak = live = 0

    async def counting(customer_id):
        nonlocal peak, live
        live += 1
        peak = max(peak, live)
        await asyncio.sleep(0.01)
        live -= 1
        return {}

    with mock.patch("__main__.fetch_profile", counting), \\
         mock.patch("__main__.fetch_history", counting):
        await handle_batch([make_order(i) for i in range(500)])

    assert peak <= MAX_CONCURRENT_ORDERS * 2


@pytest.mark.asyncio
async def test_rates_are_fetched_once_per_batch():
    """Problem 5, and the single-flight lock. Concurrent cold-cache
    callers must share one upstream request, not start their own."""
    calls = 0

    async def counting_get(url, **kw):
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.05)
        return httpx.Response(200, json={"GBP": 1.0})

    _rates_cache._rates = None
    with mock.patch.object(httpx.AsyncClient, "get", counting_get):
        await asyncio.gather(*(handle_batch([make_order(i)]) for i in range(10)))

    assert calls == 1, f"{calls} rate fetches for 10 concurrent batches"


@pytest.mark.asyncio
async def test_deadline_cancels_outstanding_work():
    """A caller who gave up must not leave tasks running."""
    cancelled = 0

    async def slow(customer_id):
        nonlocal cancelled
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            cancelled += 1
            raise

    with mock.patch("__main__.fetch_profile", slow):
        with pytest.raises(TimeoutError):
            await handle_batch([make_order(i) for i in range(5)])

    assert cancelled >= 5`,
        notes: [
          { t: "p", text: "**The `requests` call is the whole story, and it is why the rewrite went backwards.** With threads a blocking call costs one worker out of sixteen; on an event loop it costs all concurrency in the process. The same line is cheap in one model and catastrophic in the other, which is exactly the trap of porting synchronous code to `async def` without changing the libraries underneath." },
          { t: "p", text: "**80 ms of CPU blocks the loop just as thoroughly as a socket read.** There is no pre-emption, so \"blocking\" means \"does not await\" rather than \"does I/O\". It goes to a *process* rather than a thread because `compute_risk` is pure Python and a thread would contend for the GIL (Lesson 11.2)." },
          { t: "p", text: "**The double-checked lock in `RatesCache` is the detail that makes caching safe under load.** Without it, a cold cache with a hundred concurrent requests produces a hundred upstream calls — the stampede the cache existed to prevent — because every task checks, finds nothing, and starts its own fetch before any of them finish." },
          { t: "callout", kind: "insight", title: "The heartbeat test is the one worth copying", body: [
            { t: "p", text: "A task ticking every 10 ms and recording the gaps detects *any* blocking call, including ones nobody has written yet. It catches the synchronous HTTP client, the CPU-bound function, a `json.dumps` over something enormous, and the accidental `time.sleep` a future contributor adds." },
            { t: "p", text: "It is the async equivalent of asserting a query count: a property of the code that holds regardless of machine or input, where `assert elapsed < 2` would not (Lesson 10.5)." }
          ]},
          { t: "p", text: "**The timing assertion in the concurrency test is the exception to the usual rule.** Concurrency *is* a timing property — there is no other observable difference between twenty sequential awaits and twenty concurrent ones — so here elapsed time is the correct thing to assert on, with a generous margin." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team migrates a Flask service to FastAPI for the async support. Every endpoint becomes `async def`. Throughput drops by 60% and p99 latency triples." },
      { t: "p", text: "**The database driver was still `psycopg2`, which is synchronous.** Every query blocked the event loop, so the service effectively became single-threaded — where Flask had been running sixteen worker threads, each able to block independently." },
      { t: "p", text: "**The fastest fix was not more async.** Removing `async` from the handlers made FastAPI run them in a thread pool automatically, which restored the original behaviour in one edit — a useful property to know, and the right temporary answer." },
      { t: "p", text: "**The real fix was `asyncpg`, and it took a sprint** because the query layer, the ORM usage and every test had to change. **\"Async all the way down\" is a stack property, not a syntax one.** A single synchronous driver anywhere below your handlers converts the model from an advantage into a serialisation point." }
    ]}
  ],

  takeaways: [
    "**The event loop runs one task at a time on one thread**, switching only at `await`. There is no pre-emption — the loop cannot take control back, only be given it.",
    "**A task costs a few kilobytes against a thread's ~8 MB**, which is why tens of thousands of connections is an `asyncio` problem and hundreds is a threading one.",
    "**Calling an `async def` runs nothing.** It builds a coroutine object, and forgetting the `await` is a warning rather than an error.",
    "**`await` in a loop is sequential.** Concurrency comes from `gather`, a `TaskGroup` or `create_task` — writing `async def` buys nothing on its own.",
    "**Any call that does not await blocks everything**, including pure CPU work: 80 ms of computation freezes every other task for 80 ms.",
    "**A blocking call is cheap with threads and catastrophic on a loop** — one worker out of sixteen versus all concurrency in the process.",
    "**Use an async library, or `asyncio.to_thread` for a blocking call**, and a `ProcessPoolExecutor` via `run_in_executor` for CPU-bound work.",
    "**Run with `debug=True` in development.** It names the file and line of any callback that occupies the loop too long.",
    "**Bound concurrency with a `Semaphore`**, or a large batch opens as many connections as it has items.",
    "**Races are rarer but not gone.** Anything spanning an `await` can interleave, so a cache refresh needs a lock or it stampedes.",
    "**\"Async all the way down\" is the real cost.** One synchronous driver anywhere below your handlers undoes the model.",
    "**Choose `asyncio` for a new I/O-heavy service with async libraries; choose threads to add concurrency to existing synchronous code.**"
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An async handler calls `requests.get(url)`. Under load every request slows down, not just that one. Why?",
        options: [
          "`requests` is slower than `httpx`",
          "It blocks the OS thread that *is* the event loop, so no other coroutine can run, no connection is accepted and every timer is late",
          "The connection pool is exhausted by concurrent calls",
          "Synchronous calls inside coroutines raise and are retried"
        ],
        answer: 1,
        why: "There is no pre-emption: a coroutine runs until it awaits, and `requests.get` never does. With threads the same call costs one worker out of sixteen and the rest keep serving; on a loop it costs all concurrency in the process. That inversion is why porting synchronous code to `async def` without changing the libraries makes throughput worse."
      },
      {
        stem: "`results = [await fetch(u) for u in urls]` takes ten seconds for ten one-second fetches. What is wrong?",
        options: [
          "The comprehension is not supported in async code",
          "`await` in a loop is sequential — concurrency requires `gather`, a `TaskGroup`, or `create_task`",
          "The event loop is limited to one connection at a time",
          "`fetch` is not actually a coroutine"
        ],
        answer: 1,
        why: "`async def` provides the *ability* to yield control, not concurrency itself. Awaiting each fetch in turn waits for each to finish before starting the next, so the result is correct and exactly as slow as doing it serially. `await asyncio.gather(*(fetch(u) for u in urls))` puts them all in flight and takes as long as the slowest."
      },
      {
        stem: "A coroutine performs 80 ms of pure computation with no `await`. What is the effect on other tasks?",
        options: [
          "None — CPU work does not block the loop",
          "They are frozen for the full 80 ms, exactly as a blocking socket read would freeze them",
          "The loop pre-empts it after the switch interval",
          "It is automatically moved to a thread"
        ],
        answer: 1,
        why: "\"Blocking\" on an event loop means \"does not await\", not \"does I/O\". There is no switch interval and no pre-emption, so CPU work holds the loop as completely as a synchronous socket call. Move it off with `run_in_executor` and a `ProcessPoolExecutor` — a thread pool would not help, since pure Python contends for the GIL."
      },
      {
        stem: "A cold cache with 100 concurrent requests produces 100 upstream fetches despite the caching code. What is missing?",
        options: [
          "A longer TTL",
          "A lock around the refresh, with a re-check inside it — otherwise every task checks, finds nothing, and starts its own fetch before any complete",
          "A larger cache size",
          "The cache should be per-request"
        ],
        answer: 1,
        why: "Between two `await` points a coroutine is uninterrupted, but the check and the fetch span an await — so all hundred tasks pass the check before the first result arrives. An `asyncio.Lock` with a second check inside it makes concurrent callers await the same in-flight request. This is the cache stampede, and it is the async form of a race."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How does the asyncio event loop work?",
        strong: "One thread running a queue of ready tasks. It runs a task until it awaits something unfinished, parks it while the OS watches the socket, and picks the next ready one. Every switch happens at an `await` — there is no pre-emption.",
        answer: [
          { t: "p", text: "The cooperative point is the one everything else follows from, including why a blocking call is so much worse here than with threads." },
          { t: "p", text: "The cost comparison makes the scaling concrete: a few kilobytes per task against roughly 8 MB per thread, which is why the ceilings differ by two orders of magnitude." },
          { t: "p", text: "Noting that races still exist across `await` points shows the model is understood rather than treated as magic — the cache stampede is a good concrete example." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between `await f()` and `asyncio.create_task(f())`?",
        strong: "`await f()` runs it and waits — sequential. `create_task` schedules it on the loop and returns immediately, so it runs concurrently with whatever comes next.",
        answer: [
          { t: "p", text: "The consequence is what matters: `[await f(x) for x in xs]` is exactly as slow as doing it serially, which is the most common way an async rewrite delivers nothing." },
          { t: "p", text: "Mentioning that calling a coroutine function without awaiting it runs nothing at all, and only warns, covers the other half of the confusion." },
          { t: "p", text: "Preferring `TaskGroup` over bare `create_task` in new code shows currency — the sibling cancellation is the reason." }
        ]
      },
      {
        level: "advanced",
        q: "When would you not use asyncio?",
        strong: "When the stack is not async all the way down, when adding concurrency to an existing synchronous codebase, or when the work is CPU-bound. A single synchronous driver below your handlers turns the loop into a serialisation point.",
        answer: [
          { t: "p", text: "The FastAPI-with-psycopg2 case makes it concrete, and the detail that removing `async` from the handlers restores thread-pool behaviour is a genuinely useful fact." },
          { t: "p", text: "Framing async as a stack property rather than a syntax choice is the insight — the colour of a function is contagious upward through every caller." },
          { t: "p", text: "Being clear about where it wins — a new I/O-heavy service, thousands of connections — keeps it a judgement rather than a dismissal." }
        ]
      }
    ]
  }
});
