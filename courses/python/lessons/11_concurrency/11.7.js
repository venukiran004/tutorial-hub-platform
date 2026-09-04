/* ============================================================================
   LESSON 11.7 — Async Patterns That Hold Up
   ========================================================================= */
EC.receiveLesson({
  id: "11.7",

  lede: "The event loop is straightforward; what breaks in production is everything around it. A task nobody holds a reference to is silently garbage collected. A `gather` that fails leaves its siblings running. A cancellation your cleanup swallows never happens. **These are the patterns that survive contact with a real service**, and most of them exist because a naive version failed somewhere expensive.",

  objectives: [
    "Choose between `gather` and `TaskGroup`, and say what each does on failure",
    "Handle cancellation correctly, including in cleanup code",
    "Apply timeouts that actually stop work rather than stop waiting",
    "Bound concurrency and rate with a semaphore",
    "Bridge synchronous and asynchronous code in both directions"
  ],

  prerequisites: ["11.6"],

  blocks: [

    { t: "h2", n: "01", text: "gather and TaskGroup", id: "grouping" },

    { t: "viz",
      title: "What happens to the siblings when one fails",
      caption: "`gather` reports the first exception and leaves the others running, so a dead dependency costs you three requests instead of one. A `TaskGroup` cancels the siblings and raises everything that went wrong together.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram contrasting gather leaving sibling tasks running after a failure with TaskGroup cancelling them">
  <rect x="14" y="26" width="418" height="248" rx="11" style="fill:none;stroke:var(--warn-line)" stroke-width="1.4"/>
  <text x="34" y="52" class="s-label" style="fill:var(--warn)">gather — siblings keep running</text>

  <g class="s-mono" style="font-size:9px">
    <rect x="34" y="70" width="90" height="20" rx="3" style="fill:var(--crit)" opacity=".8"/>
    <text x="44" y="84" style="fill:#2a0710">A fails</text>
    <rect x="34" y="96" width="330" height="20" rx="3" style="fill:var(--warn)" opacity=".55"/>
    <text x="44" y="110" style="fill:#241a00">B — still running, nobody waiting</text>
    <rect x="34" y="122" width="270" height="20" rx="3" style="fill:var(--warn)" opacity=".55"/>
    <text x="44" y="136" style="fill:#241a00">C — still running, nobody waiting</text>
  </g>

  <text x="34" y="172" class="s-sub">The caller gets A's exception immediately.</text>
  <text x="34" y="194" class="s-sub" style="fill:var(--warn)">B and C hold connections, write rows, and</text>
  <text x="34" y="214" class="s-sub" style="fill:var(--warn)">consume rate limit for a request that has</text>
  <text x="34" y="234" class="s-sub" style="fill:var(--warn)">already failed.</text>
  <text x="34" y="260" class="s-sub">return_exceptions=True changes the reporting, not this.</text>

  <rect x="468" y="26" width="418" height="248" rx="11" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="488" y="52" class="s-label" style="fill:var(--good)">TaskGroup — siblings cancelled</text>

  <g class="s-mono" style="font-size:9px">
    <rect x="488" y="70" width="90" height="20" rx="3" style="fill:var(--crit)" opacity=".8"/>
    <text x="498" y="84" style="fill:#2a0710">A fails</text>
    <rect x="488" y="96" width="120" height="20" rx="3" style="fill:var(--good)" opacity=".6"/>
    <text x="498" y="110" style="fill:#06231a">B cancelled</text>
    <rect x="488" y="122" width="120" height="20" rx="3" style="fill:var(--good)" opacity=".6"/>
    <text x="498" y="136" style="fill:#06231a">C cancelled</text>
  </g>

  <text x="488" y="172" class="s-sub">All work stops. The block raises an</text>
  <text x="488" y="194" class="s-mono" style="font-size:10px">ExceptionGroup</text>
  <text x="488" y="216" class="s-sub">containing every failure, not only the first.</text>
  <text x="488" y="252" class="s-sub" style="fill:var(--good)">3.11+. The default for new code.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the three behaviours", code: `
import asyncio

# 1. gather — first exception propagates, siblings keep running
try:
    a, b, c = await asyncio.gather(fetch_a(), fetch_b(), fetch_c())
except Exception:
    ...                       # b and c are STILL RUNNING

# 2. gather(return_exceptions=True) — nothing raises; inspect the results
results = await asyncio.gather(fetch_a(), fetch_b(), fetch_c(),
                               return_exceptions=True)
for r in results:
    if isinstance(r, BaseException):
        log.error("one failed", exc_info=r)

# 3. TaskGroup — siblings cancelled, every failure reported
try:
    async with asyncio.TaskGroup() as tg:
        ta = tg.create_task(fetch_a())
        tb = tg.create_task(fetch_b())
        tc = tg.create_task(fetch_c())
except* ValueError as group:          # except* — one clause per type
    for err in group.exceptions:
        log.error("validation failed", exc_info=err)
`,
      hl: [7, 18, 22],
      caption: "**`except*` is the syntax for an `ExceptionGroup`** (Lesson 6.3). A `TaskGroup` may raise several failures at once, so a single `except` clause could not express which to handle."
    },

    { t: "table",
      head: ["", "`gather`", "`gather(return_exceptions=True)`", "`TaskGroup`"],
      rows: [
        ["On one failure", "Raises the first", "Returns it as a value", "**Cancels siblings**, raises a group"],
        ["Siblings", "Keep running", "Keep running", "**Cancelled**"],
        ["Reports", "The first exception", "All, as results", "**All**, in a group"],
        ["Results in order", "Yes", "Yes", "Via each task's `.result()`"],
        ["Use for", "Legacy code", "\"Try everything, report what failed\"", "**The default for new code**"]
      ],
      caption: "**`return_exceptions=True` changes the reporting, not the cancellation.** It is the right choice when every task should be attempted regardless — a broadcast to ten webhooks — and it still leaves nothing cancelled."
    },

    { t: "h2", n: "02", text: "The task that disappears", id: "gc" },

    { t: "callout", kind: "trap", title: "`create_task` without a reference is a bug", body: [
      { t: "code", lang: "python", title: "fire and forget, emphasis on forget", numbered: false, code: `
async def handler(request):
    asyncio.create_task(send_analytics(request))   # no reference kept
    return Response(200)

# The loop holds only a WEAK reference to a task. If nothing else does,
# the task can be garbage collected mid-execution -- so the analytics
# call happens sometimes, and the failure rate looks like a flaky
# upstream rather than a bug here.`},
      { t: "code", lang: "python", title: "the fix, and it is not optional", numbered: false, code: `
_background: set[asyncio.Task] = set()


def spawn(coro) -> asyncio.Task:
    """Hold a strong reference until the task completes, and log any
    failure -- a background task's exception is otherwise reported only
    when the task object is finalised, which may be never."""
    task = asyncio.create_task(coro)
    _background.add(task)
    task.add_done_callback(_background.discard)
    task.add_done_callback(_log_if_failed)
    return task


def _log_if_failed(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception() is not None:
        log.error("background task failed", exc_info=task.exception())`},
      { t: "p", text: "**Two separate problems, both silent.** The task may vanish, and if it fails, nothing surfaces the exception until the object is finalised — at which point Python prints \"Task exception was never retrieved\" to stderr, often long after the request that caused it." },
      { t: "p", text: "**Prefer a `TaskGroup` where the work is part of the request**, and this pattern only for genuinely detached work — analytics, cache warming — where the caller must not wait." }
    ]},

    { t: "h2", n: "03", text: "Cancellation", id: "cancellation" },

    { t: "code", lang: "python", title: "cancellation is an exception, and it must win", code: `
async def worker():
    try:
        await long_operation()
    except asyncio.CancelledError:
        await release_resources()        # cleanup is allowed
        raise                            # RE-RAISE. Always.
    finally:
        await close_connection()         # runs either way
`,
      hl: [6],
      caption: "**Swallowing `CancelledError` breaks cancellation for everyone above you.** The task keeps running, `TaskGroup` and `timeout` wait for it, and a shutdown that should take milliseconds hangs until something kills the process."
    },

    { t: "callout", kind: "warn", title: "`except Exception` does not catch cancellation, and that is deliberate", body: [
      { t: "code", lang: "python", title: "the hierarchy is the design", numbered: false, code: `
# 3.8+: CancelledError inherits from BaseException, not Exception
try:
    await work()
except Exception:            # does NOT catch CancelledError. Good.
    log.exception("failed")

try:
    await work()
except BaseException:        # DOES catch it -- almost always wrong
    log.exception("failed")  # cancellation is now silently swallowed`},
      { t: "p", text: "It was moved out of `Exception` precisely so a broad `except Exception:` in ordinary error handling cannot accidentally defeat cancellation. Any `except BaseException` in async code deserves a second look." },
      { t: "code", lang: "python", title: "cleanup that must survive cancellation", numbered: false, code: `
async def worker():
    try:
        await work()
    finally:
        # A plain await here can ITSELF be cancelled, leaving the
        # cleanup half-done. shield protects it.
        await asyncio.shield(flush_and_close())`},
      { t: "p", text: "**Use `shield` sparingly.** It makes cleanup uninterruptible, so a shielded operation that hangs makes shutdown hang — which is the failure it was meant to prevent, relocated." }
    ]},

    { t: "h2", n: "04", text: "Timeouts and limits", id: "limits" },

    { t: "ladder",
      title: "Bounding a set of outbound calls",
      rungs: [
        { level: "bad", label: "No bound at all",
          why: "Ten thousand items become ten thousand simultaneous connections. The remote host rate-limits or refuses, local file descriptors run out, and a slow upstream means the whole batch is in flight forever.",
          code: `results = await asyncio.gather(*(fetch(u) for u in urls))` },
        { level: "ok", label: "A semaphore",
          why: "Caps concurrency at something the upstream tolerates, and it is three lines. It bounds how many are in flight, not how long they take — so a hung request still occupies a slot indefinitely.",
          code: `sem = asyncio.Semaphore(20)


async def bounded(url: str):
    async with sem:
        return await fetch(url)


results = await asyncio.gather(*(bounded(u) for u in urls))` },
        { level: "best", label: "A semaphore, a per-call timeout and a deadline",
          why: "Three limits doing three different jobs: how many at once, how long any one may take, and how long the caller will wait in total. Each is necessary and none substitutes for the others.",
          code: `async def fetch_all(
    urls: list[str], *, concurrency: int = 20,
    per_call: float = 5.0, deadline: float = 60.0,
) -> list[Result]:
    sem = asyncio.Semaphore(concurrency)

    async def one(url: str) -> Result:
        async with sem:                          # how many at once
            async with asyncio.timeout(per_call):  # how long each may take
                return await fetch(url)

    async with asyncio.timeout(deadline):        # how long we will wait
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(one(u)) for u in urls]

    return [t.result() for t in tasks]`,
          note: "**Put the timeout inside the semaphore, not outside.** Outside, the clock runs while the task queues for a slot, so a task can time out having never started — and the error blames the upstream for your own backlog." }
      ]
    },

    { t: "code", lang: "python", title: "a rate limit is not a concurrency limit", code: `
import asyncio
import time


class RateLimiter:
    """A token bucket. A semaphore caps how many run AT ONCE; this caps
    how many start PER SECOND, which is what an API's quota measures."""

    def __init__(self, rate: float, burst: int) -> None:
        self._rate = rate
        self._capacity = burst
        self._tokens = float(burst)
        self._updated = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            while True:
                now = time.monotonic()
                self._tokens = min(
                    self._capacity,
                    self._tokens + (now - self._updated) * self._rate,
                )
                self._updated = now
                if self._tokens >= 1:
                    self._tokens -= 1
                    return
                await asyncio.sleep((1 - self._tokens) / self._rate)


limiter = RateLimiter(rate=10, burst=20)      # 10/s, bursting to 20


async def call(url: str):
    await limiter.acquire()
    return await fetch(url)
`,
      caption: "**Twenty concurrent requests each taking 50 ms is 400 per second**, which a semaphore alone does nothing about. If the API's limit is expressed per second, you need a limiter; if it is expressed as concurrent connections, a semaphore is the right tool."
    },

    { t: "h2", n: "05", text: "Bridging sync and async", id: "bridging" },

    { t: "table",
      head: ["Direction", "Use", "Note"],
      rows: [
        ["Sync → async, at the top level", "`asyncio.run(main())`", "Once, at the entry point. Never inside a running loop"],
        ["Async → blocking function", "`await asyncio.to_thread(fn, *args)`", "The workhorse for a legacy synchronous call"],
        ["Async → CPU-bound work", "`await loop.run_in_executor(process_pool, fn, arg)`", "A process, not a thread — pure Python contends for the GIL"],
        ["Sync → async, from inside a loop", "`asyncio.run_coroutine_threadsafe(coro, loop)`", "Returns a `concurrent.futures.Future`"],
        ["Sync library needing a callback", "`loop.call_soon_threadsafe(fn)`", "The only loop method safe to call from another thread"]
      ],
      caption: "**`asyncio.run` inside a running loop raises.** It creates and closes a loop, so calling it from a coroutine is the error `asyncio.run() cannot be called from a running event loop` — usually seen when a synchronous helper is called from async code and reaches for it internally."
    },

    { t: "callout", kind: "insight", title: "`to_thread` is the pragmatic escape hatch", body: [
      { t: "code", lang: "python", title: "one line around a call you cannot replace", numbered: false, code: `
# A vendor SDK with no async version
async def charge(amount: int) -> str:
    return await asyncio.to_thread(vendor_sdk.charge, amount)


# It uses the default executor, which is a ThreadPoolExecutor with
# min(32, cpu_count + 4) workers -- shared by every to_thread call in
# the process. For heavy use, give it a dedicated pool:
pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="vendor")
loop = asyncio.get_running_loop()
result = await loop.run_in_executor(pool, vendor_sdk.charge, amount)`},
      { t: "p", text: "**The default executor is shared and small.** A service making heavy use of `to_thread` for one slow dependency starves every other use of it — including any library that quietly does the same thing." },
      { t: "p", text: "**It does not make the call cancellable.** `asyncio.timeout` around a `to_thread` stops you waiting; the thread runs to completion regardless (Lesson 11.5)." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "An async client that behaves under failure",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Build the outbound client for a service that fans out to a partner API. The requirements are all about the unhappy path: a partner that hangs, a shutdown mid-flight, a rate limit, and one call failing out of two hundred." },
        { t: "code", lang: "python", title: "the version to replace", numbered: false, code: `
async def notify_all(events):
    tasks = [asyncio.create_task(post(e)) for e in events]
    return await asyncio.gather(*tasks)

async def post(event):
    async with httpx.AsyncClient() as client:
        r = await client.post(PARTNER_URL, json=event)
        return r.json()`},
        { t: "p", text: "Six problems. One of them makes a graceful shutdown impossible." }
      ],
      requirements: [
        "Concurrency bounded, and separately rate-limited.",
        "A per-call timeout and an overall deadline, with the timeout inside the semaphore.",
        "One failure must not abandon the others, and every failure must be reported.",
        "Cancellation must propagate — a shutdown cannot hang.",
        "One client for the whole batch, not one per call.",
        "**Explain why a `TaskGroup` is a better default than `gather` here, and when it would not be.**"
      ],
      hint: "Look at where the `AsyncClient` is created. Then ask what happens to the other 199 tasks when the fifth one raises.",
      solution: {
        lang: "python",
        title: "notify.py",
        code: `# =========================================================================
# THE SIX PROBLEMS
# =========================================================================
#
# 1. A NEW AsyncClient PER CALL
#    Each one builds a connection pool, does a TCP handshake and a TLS
#    negotiation, then throws it away. For 200 events that is 200 TLS
#    handshakes against a host that would have accepted one connection
#    reused 200 times -- typically 10-20x the latency.
#
# 2. UNBOUNDED CONCURRENCY
#    200 events become 200 simultaneous connections. The partner rate
#    limits or refuses, and local file descriptors run out first on a
#    large batch.
#
# 3. NO TIMEOUT ANYWHERE
#    httpx has a default, but nothing bounds the BATCH. One hanging
#    partner holds the whole call open for as long as it likes.
#
# 4. gather WITHOUT return_exceptions
#    The first failure propagates and the other 199 keep running --
#    holding connections and consuming rate limit for a call that has
#    already failed. Nothing awaits them, so their exceptions surface
#    later as "Task exception was never retrieved".
#
# 5. NO ERROR ISOLATION
#    One bad event loses the batch. For a notification fan-out that is
#    exactly backwards: 199 partners should still be told.
#
# 6. CANCELLATION IS NOT HANDLED  <- makes shutdown impossible
#    Nothing re-raises CancelledError and nothing closes the client on
#    cancellation. On SIGTERM the tasks are cancelled, the exception is
#    swallowed by the bare gather, and the shutdown waits for tasks that
#    never finish -- so the container is SIGKILLed instead.


from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class Delivery:
    """The outcome travels WITH its event, so a failure names its input
    and the caller can retry exactly what failed (Lesson 11.5)."""

    event_id: str
    ok: bool
    status: int | None = None
    error: str | None = None


class RateLimiter:
    """Token bucket. Distinct from the semaphore: the semaphore caps how
    many run AT ONCE, this caps how many START PER SECOND. Twenty
    concurrent calls at 50 ms each is 400/s, which a semaphore alone
    does nothing about."""

    def __init__(self, rate: float, burst: int) -> None:
        self._rate, self._capacity = rate, float(burst)
        self._tokens, self._updated = float(burst), time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            while True:
                now = time.monotonic()
                self._tokens = min(self._capacity,
                                   self._tokens + (now - self._updated) * self._rate)
                self._updated = now
                if self._tokens >= 1:
                    self._tokens -= 1
                    return
                await asyncio.sleep((1 - self._tokens) / self._rate)


class PartnerNotifier:
    def __init__(self, url: str, *, concurrency: int = 20,
                 rate: float = 10.0, per_call: float = 5.0) -> None:
        self._url = url
        self._sem = asyncio.Semaphore(concurrency)          # FIX 2
        self._limiter = RateLimiter(rate, burst=concurrency)
        self._per_call = per_call
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "PartnerNotifier":
        # FIX 1: ONE client for the whole batch. Its connection pool is
        # sized to the concurrency limit so the pool is never the
        # bottleneck the semaphore was meant to be.
        self._client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=self._sem._value,
                                max_keepalive_connections=self._sem._value),
            timeout=httpx.Timeout(self._per_call, connect=3.05),
        )
        return self

    async def __aexit__(self, *exc) -> None:
        # Runs on cancellation too, so a shutdown closes the pool.
        if self._client is not None:
            await self._client.aclose()

    async def _post(self, event: dict) -> Delivery:
        eid = event["id"]
        try:
            async with self._sem:                    # FIX 2: how many at once
                await self._limiter.acquire()        #        how many per second
                # FIX 3: the timeout is INSIDE the semaphore. Outside, the
                # clock would run while queueing for a slot, so a task
                # could time out having never started -- blaming the
                # partner for our own backlog.
                async with asyncio.timeout(self._per_call):
                    response = await self._client.post(self._url, json=event)
                    return Delivery(eid, response.is_success, response.status_code)

        except asyncio.CancelledError:
            # FIX 6: re-raise. Swallowing this breaks cancellation for
            # everything above -- the TaskGroup waits, the shutdown
            # hangs, and the container is SIGKILLed.
            log.info("delivery cancelled", extra={"event_id": eid})
            raise

        except (httpx.HTTPError, TimeoutError) as exc:
            # FIX 5: a failure is a RESULT, not an exception that ends
            # the batch. Note CancelledError is caught above and is not
            # an Exception subclass, so it cannot land here by accident.
            return Delivery(eid, ok=False, error=f"{type(exc).__name__}: {exc}")

    async def notify_all(self, events: list[dict], *,
                         deadline: float = 60.0) -> list[Delivery]:
        # FIX 4: a TaskGroup, so a genuine bug cancels the siblings
        # rather than leaving 199 tasks nobody is waiting for.
        #
        # _post returns Delivery for EXPECTED failures, so the group only
        # sees programming errors -- which is exactly when abandoning the
        # batch is right.
        async with asyncio.timeout(deadline):
            async with asyncio.TaskGroup() as tg:
                tasks = [tg.create_task(self._post(e)) for e in events]

        return [t.result() for t in tasks]


# =========================================================================
# WHY TaskGroup, AND WHEN NOT
# =========================================================================
#
# TaskGroup is the better DEFAULT because its failure mode is the safe
# one: if something unexpected happens, everything stops. gather leaves
# siblings running with nobody awaiting them, so their exceptions are
# reported at finalisation -- long after the request, out of context.
#
# But cancel-the-siblings is wrong for a broadcast. If this were "tell
# ten partners, and one being down must not stop the others", the
# semantics wanted are gather(return_exceptions=True): attempt
# everything, report what failed, cancel nothing.
#
# The design here gets both: expected failures (timeouts, HTTP errors)
# become Delivery values inside _post and never reach the group, so a
# down partner does not cancel anything. The group's cancellation is
# reserved for genuine bugs, where stopping IS correct.
#
#   expected failure  -> a Delivery with ok=False   -> batch continues
#   programming error -> escapes to the TaskGroup   -> batch stops
#
# That split is the point: choose the boundary deliberately rather than
# taking whichever failure semantics the API happens to have.


# =========================================================================
# TESTS
# =========================================================================

import pytest


@pytest.mark.asyncio
async def test_one_failure_does_not_lose_the_batch():
    """PROBLEM 4/5. The original abandoned 199 deliveries when the fifth
    partner returned a 500."""
    async with PartnerNotifier(URL) as n:
        with mock_partner(fail_on={5}):
            results = await n.notify_all([{"id": str(i)} for i in range(200)])

    assert len(results) == 200
    assert sum(r.ok for r in results) == 199
    assert next(r for r in results if not r.ok).event_id == "5"


@pytest.mark.asyncio
async def test_concurrency_is_bounded():
    """PROBLEM 2. Asserts peak in-flight, which is a property of the
    algorithm rather than a measurement of the machine."""
    peak = live = 0

    async def counting(*a, **kw):
        nonlocal peak, live
        live += 1
        peak = max(peak, live)
        await asyncio.sleep(0.01)
        live -= 1
        return httpx.Response(200, json={})

    async with PartnerNotifier(URL, concurrency=10, rate=1000) as n:
        with mock.patch.object(httpx.AsyncClient, "post", counting):
            await n.notify_all([{"id": str(i)} for i in range(200)])

    assert peak <= 10, f"{peak} concurrent, limit was 10"


@pytest.mark.asyncio
async def test_rate_is_limited_independently_of_concurrency():
    """A semaphore of 20 with 50 ms calls is 400/s. The limiter is what
    makes the quota hold."""
    started: list[float] = []

    async def timed(*a, **kw):
        started.append(time.monotonic())
        return httpx.Response(200, json={})

    async with PartnerNotifier(URL, concurrency=20, rate=10) as n:
        with mock.patch.object(httpx.AsyncClient, "post", timed):
            await n.notify_all([{"id": str(i)} for i in range(30)])

    window = started[-1] - started[0]
    assert window >= 2.5, f"30 calls at 10/s took {window:.1f}s"


@pytest.mark.asyncio
async def test_cancellation_propagates_and_shutdown_completes():
    """PROBLEM 6 — the one that makes a graceful shutdown impossible.
    A swallowed CancelledError leaves the TaskGroup waiting forever."""
    async def hanging(*a, **kw):
        await asyncio.sleep(3600)

    async with PartnerNotifier(URL) as n:
        with mock.patch.object(httpx.AsyncClient, "post", hanging):
            task = asyncio.create_task(
                n.notify_all([{"id": str(i)} for i in range(50)]))
            await asyncio.sleep(0.1)
            task.cancel()

            with pytest.raises(asyncio.CancelledError):
                # A timeout here means cancellation was swallowed.
                await asyncio.wait_for(task, timeout=2.0)


@pytest.mark.asyncio
async def test_the_client_is_reused_not_recreated():
    """PROBLEM 1. 200 TLS handshakes against one reused connection."""
    created = 0
    real = httpx.AsyncClient.__init__

    def counting_init(self, *a, **kw):
        nonlocal created
        created += 1
        real(self, *a, **kw)

    with mock.patch.object(httpx.AsyncClient, "__init__", counting_init):
        async with PartnerNotifier(URL) as n:
            with mock_partner():
                await n.notify_all([{"id": str(i)} for i in range(50)])

    assert created == 1


@pytest.mark.asyncio
async def test_timeout_is_inside_the_semaphore():
    """PROBLEM 3, subtly. With the timeout outside, a task queued behind
    19 others times out having never sent a request -- and the error
    blames the partner for our own backlog."""
    async def slow(*a, **kw):
        await asyncio.sleep(0.3)
        return httpx.Response(200, json={})

    async with PartnerNotifier(URL, concurrency=2, per_call=1.0, rate=1000) as n:
        with mock.patch.object(httpx.AsyncClient, "post", slow):
            results = await n.notify_all([{"id": str(i)} for i in range(20)])

    # 20 calls / 2 concurrent x 0.3s = 3s total, well past a 1s per-call
    # timeout -- yet every one succeeds, because each one's clock starts
    # when it acquires its slot.
    assert all(r.ok for r in results)`,
        notes: [
          { t: "p", text: "**Putting the timeout inside the semaphore is the subtlest fix and has its own test.** Outside, the clock starts when the coroutine is created, so a task queued behind nineteen others can exhaust its budget having never sent a request — and the resulting error blames the partner for your own backlog. The test runs twenty calls through a concurrency of two with a per-call timeout shorter than the total, and expects every one to succeed." },
          { t: "p", text: "**Catching expected failures inside `_post` is what makes the `TaskGroup` safe here.** A timeout or a 500 becomes a `Delivery` and never reaches the group, so a down partner cannot cancel the other 199. The group's cancellation is reserved for programming errors, where abandoning the batch is the correct response." },
          { t: "p", text: "**`CancelledError` is caught explicitly and re-raised, above the `except (httpx.HTTPError, TimeoutError)` clause.** Since 3.8 it inherits from `BaseException`, so it would not have been caught by the error clause anyway — but naming it makes the intent visible and the log line useful during a shutdown." },
          { t: "callout", kind: "insight", title: "The cancellation test is the one that matters operationally", body: [
            { t: "p", text: "It cancels the batch and asserts that awaiting it completes within two seconds. A swallowed `CancelledError` makes that hang — which in production is a container that ignores SIGTERM, waits out its grace period and gets SIGKILLed, losing whatever was in flight." },
            { t: "p", text: "It is worth writing for any long-running async operation, because the failure is invisible until a deploy and then looks like an infrastructure problem." }
          ]},
          { t: "p", text: "**A semaphore and a rate limiter are not substitutes.** Twenty concurrent calls at 50 ms each is 400 per second; if the partner's quota is expressed per second, the semaphore does nothing about it. Which one you need depends on how the limit is written down, and services with both need both." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service deploys cleanly for months. Then a release changes an error handler from `except Exception` to `except BaseException` — tidying up, to catch \"anything that goes wrong\". Deployments start taking their full thirty-second grace period and rolling restarts begin dropping requests." },
      { t: "p", text: "**`CancelledError` inherits from `BaseException`.** On SIGTERM the shutdown cancelled every in-flight task; each one caught the cancellation, logged it as an error, and carried on working. The tasks never finished, the graceful shutdown waited, and the orchestrator eventually sent SIGKILL." },
      { t: "p", text: "**The logs said `ERROR: request failed` with a `CancelledError` traceback**, which read like an upstream problem rather than the shutdown doing exactly what it was asked to do. It took two days, because nobody connects a broadened exception clause with a deployment timing change." },
      { t: "p", text: "**`CancelledError` was moved out of `Exception` in 3.8 for precisely this reason.** Treat any `except BaseException` in async code as a bug until proven otherwise, and always re-raise after cleanup — cancellation is a request you are obliged to honour, not an error you may decline." }
    ]}
  ],

  takeaways: [
    "**`gather` leaves siblings running when one fails**, so a dead dependency costs several requests instead of one; `TaskGroup` cancels them and reports every failure.",
    "**`return_exceptions=True` changes the reporting, not the cancellation** — right for a broadcast where every task should be attempted regardless.",
    "**`TaskGroup` raises an `ExceptionGroup`**, handled with `except*`, because several tasks may fail at once.",
    "**`create_task` without keeping a reference is a bug.** The loop holds only a weak reference, so the task can be collected mid-execution.",
    "**A background task's exception surfaces only at finalisation**, so add a done-callback that logs it.",
    "**Always re-raise `CancelledError` after cleanup.** Swallowing it makes shutdown hang until something kills the process.",
    "**`CancelledError` inherits from `BaseException`**, deliberately — so `except Exception` cannot defeat cancellation, and `except BaseException` in async code is suspect.",
    "**Put the per-call timeout inside the semaphore.** Outside, a queued task can time out having never started, and the error blames the wrong system.",
    "**A semaphore bounds concurrency; a token bucket bounds rate.** Twenty concurrent 50 ms calls is 400 per second, which no semaphore prevents.",
    "**Create one HTTP client per batch, not per call**, and size its connection pool to the concurrency limit or the pool becomes the real bottleneck.",
    "**`asyncio.to_thread` is the escape hatch for a blocking call**, but it uses a small shared executor and does not make the call cancellable.",
    "**Decide your failure boundary deliberately**: expected failures become values, programming errors escape to the group — rather than accepting whichever semantics the API happens to have."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`await asyncio.gather(a(), b(), c())` and `a()` raises. What happens to `b()` and `c()`?",
        options: [
          "Both are cancelled automatically",
          "Both keep running — holding connections and consuming rate limit for a call that has already failed",
          "Both are paused until the exception is handled",
          "Their results are returned alongside the exception"
        ],
        answer: 1,
        why: "`gather` propagates the first exception and does nothing about the siblings. Nothing awaits them, so their own failures surface later as \"Task exception was never retrieved\", out of context. `TaskGroup` cancels the siblings and raises an `ExceptionGroup` with everything that failed, which is why it is the better default for new code."
      },
      {
        stem: "A handler calls `asyncio.create_task(send_analytics(req))` and keeps no reference. What can go wrong?",
        options: [
          "Nothing — the loop owns the task",
          "The loop holds only a weak reference, so the task can be garbage collected mid-execution and the work happens only sometimes",
          "The task runs twice",
          "It blocks the handler until it completes"
        ],
        answer: 1,
        why: "The failure rate looks like a flaky upstream rather than a bug in your code, which makes it very hard to find. Keep the task in a module-level set and discard it in a done-callback. Add a second callback that logs the exception, because a background task's failure otherwise surfaces only when the object is finalised — possibly never."
      },
      {
        stem: "Deployments start taking the full grace period after `except Exception` was changed to `except BaseException`. Why?",
        options: [
          "`BaseException` catches `SystemExit`, preventing the process from exiting",
          "`CancelledError` inherits from `BaseException`, so shutdown cancellations are swallowed and tasks keep running until SIGKILL",
          "The broader clause slows exception handling",
          "`BaseException` disables the signal handlers"
        ],
        answer: 1,
        why: "It was moved out of `Exception` in 3.8 precisely so ordinary error handling cannot defeat cancellation. Catching it and continuing means the task never finishes, the graceful shutdown waits, and the orchestrator eventually kills the container — losing in-flight work. Always re-raise after cleanup; cancellation is an obligation, not an error you may decline."
      },
      {
        stem: "Why should a per-call timeout go inside the semaphore rather than outside it?",
        options: [
          "Outside, the timeout applies to the whole batch",
          "Outside, the clock runs while the task queues for a slot, so it can time out having never sent a request — blaming the upstream for your own backlog",
          "`asyncio.timeout` cannot be nested inside a context manager",
          "The semaphore resets the timeout on acquisition"
        ],
        answer: 1,
        why: "With a concurrency of two and twenty queued calls, a task at the back waits for nineteen others before it starts. If its timeout began at creation, it fails without having done anything, and the error names the partner rather than your queue. Starting the clock when the slot is acquired measures what the call actually took."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "`gather` or `TaskGroup`?",
        strong: "`TaskGroup` for new code: it cancels siblings on failure and reports every error in an `ExceptionGroup`. `gather` leaves siblings running with nobody awaiting them, so a dead dependency costs several requests and the failures surface out of context.",
        answer: [
          { t: "p", text: "Knowing when `gather(return_exceptions=True)` is still right — a broadcast where every task should be attempted regardless — shows it is a judgement rather than a rule." },
          { t: "p", text: "The stronger design point is choosing the failure boundary deliberately: expected failures become return values, programming errors escape to the group." },
          { t: "p", text: "Mentioning `except*` and `ExceptionGroup` shows currency, and explains why a single `except` clause could not express the semantics." }
        ]
      },
      {
        level: "advanced",
        q: "How do you handle cancellation correctly?",
        strong: "Catch `CancelledError` only to clean up, then re-raise. Swallowing it breaks cancellation for everything above — the `TaskGroup` waits, the shutdown hangs, and the process gets killed.",
        answer: [
          { t: "p", text: "The `BaseException` detail is the one that separates a real answer: it was moved out of `Exception` in 3.8 so ordinary error handling could not defeat cancellation, which makes any `except BaseException` in async code suspect." },
          { t: "p", text: "The deployment story makes it concrete — grace periods exhausted, requests dropped, and logs that read like an upstream problem." },
          { t: "p", text: "`asyncio.shield` for cleanup that must not itself be cancelled is worth adding, with the caveat that a shielded hang relocates the problem rather than removing it." }
        ]
      },
      {
        level: "advanced",
        q: "How do you bound outbound calls from an async service?",
        strong: "Three separate limits: a semaphore for how many run at once, a token bucket for how many start per second, and a timeout for how long any one may take — plus a deadline for the caller. None substitutes for the others.",
        answer: [
          { t: "p", text: "Distinguishing concurrency from rate is the part most answers miss: twenty concurrent 50 ms calls is 400 per second, which a semaphore does nothing about." },
          { t: "p", text: "Putting the timeout inside the semaphore is a small detail with a real consequence, and it shows the failure mode has actually been hit." },
          { t: "p", text: "Sizing the HTTP client's connection pool to the concurrency limit closes the loop — otherwise the client library silently becomes the constraint you thought you were setting." }
        ]
      }
    ]
  }
});
