/* ============================================================================
   LESSON 11.5 — concurrent.futures
   ========================================================================= */
EC.receiveLesson({
  id: "11.5",

  lede: "One API over threads and processes, with a `Future` standing in for a result that has not arrived yet. It is the level most production code should sit at: **switching between threads and processes becomes a one-word change**, exceptions propagate to the caller instead of vanishing, and the pool shuts down correctly without you writing the shutdown.",

  objectives: [
    "Use `ThreadPoolExecutor` and `ProcessPoolExecutor` interchangeably",
    "Choose between `map`, `submit` and `as_completed` for a given job",
    "Handle exceptions from a worker without losing the rest of the batch",
    "Apply timeouts and cancellation, and know the limits of both",
    "Recognise the deadlock a nested pool creates"
  ],

  prerequisites: ["11.3", "11.4"],

  blocks: [

    { t: "h2", n: "01", text: "Why this layer exists", id: "why" },

    { t: "code", lang: "python", title: "the same job, one word apart", code: `
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

# I/O-bound: threads
with ThreadPoolExecutor(max_workers=32) as pool:
    results = list(pool.map(fetch, urls))

# CPU-bound: processes. Same call, same shape, same result type.
with ProcessPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(transform, rows, chunksize=64))
`,
      caption: "**That interchangeability is the point.** Measure the workload, change one class name, and the decision from Lesson 11.1 becomes a one-line edit rather than a rewrite."
    },

    { t: "table",
      head: ["", "Raw `threading` / `multiprocessing`", "`concurrent.futures`"],
      rows: [
        ["A worker raises", "Printed to stderr and lost", "**Re-raised on `.result()`**"],
        ["Collecting results", "A shared list or a queue you write", "Returned directly"],
        ["Shutdown", "`join()` every worker by hand", "The `with` block"],
        ["Switching thread ↔ process", "Rewrite", "**One class name**"],
        ["Backpressure", "Your bounded queue", "Not built in — see below"],
        ["Fine control of an individual worker", "**Full**", "Limited by design"]
      ],
      caption: "**Drop to the raw modules when you need something the executor does not model** — a long-lived worker with its own loop, a custom shutdown protocol. For \"run this function over these inputs\", the executor is strictly better."
    },

    { t: "callout", kind: "insight", title: "A Future is a result that has not happened yet", body: [
      { t: "code", lang: "python", title: "the object in the middle", numbered: false, code: `
with ThreadPoolExecutor() as pool:
    future = pool.submit(fetch, "https://example.test")

    future.done()          # False, probably
    future.result()        # BLOCKS until it is ready, then returns
                           # -- or RE-RAISES whatever the worker raised
    future.exception()     # the exception object, without raising it
    future.cancel()        # True only if it had not started yet`},
      { t: "p", text: "**`.result()` re-raising is the single most valuable thing here.** A failed thread otherwise prints a traceback nobody reads and returns as though it succeeded (Lesson 11.3), so a job that processed nothing looks identical to one that worked." },
      { t: "p", text: "The trade is that the exception surfaces where you *collect* the result, not where it happened — so the traceback shows the worker's stack with your call site attached, which takes a moment to read the first time." }
    ]},

    { t: "h2", n: "02", text: "map, submit, as_completed", id: "apis" },

    {"kind": "flow", "title": "submit and as_completed", "caption": "submit returns a Future immediately; the pool runs the callable on a worker; as_completed yields futures in the order they finish, not the order they were submitted.", "cols": 4, "nodes": [{"id": "sub", "label": "executor.submit(f, x)", "sub": "returns a Future now", "tone": "accent"}, {"id": "q", "label": "work queue", "sub": "waits for a free worker"}, {"id": "w", "label": "worker thread/process", "sub": "runs f(x)", "tone": "good"}, {"id": "done", "label": "as_completed(futures)", "sub": "yields in finishing order", "tone": "warn"}], "edges": [["sub", "q"], ["q", "w"], ["w", "done", ".result()"]], "t": "diagram", "id": "dg-11_5-02-0"},

    { t: "viz",
      title: "Three ways to get results back",
      caption: "`map` preserves input order and yields lazily. `as_completed` yields whichever finishes first, so slow items stop blocking fast ones. `submit` alone gives you the futures to manage yourself.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Diagram comparing map returning results in submission order against as_completed returning them in completion order">
  <text x="14" y="26" class="s-label">Four tasks, finishing at different times</text>
  <g class="s-mono" style="font-size:9px">
    <rect x="14" y="40" width="60" height="20" rx="3" style="fill:var(--accent)" opacity=".8"/><text x="24" y="54" style="fill:#06122b">A 400ms</text>
    <rect x="14" y="64" width="200" height="20" rx="3" style="fill:var(--accent)" opacity=".8"/><text x="24" y="78" style="fill:#06122b">B 1200ms</text>
    <rect x="14" y="88" width="40" height="20" rx="3" style="fill:var(--accent)" opacity=".8"/><text x="24" y="102" style="fill:#06122b">C 250</text>
    <rect x="14" y="112" width="100" height="20" rx="3" style="fill:var(--accent)" opacity=".8"/><text x="24" y="126" style="fill:#06122b">D 700ms</text>
  </g>

  <line x1="14" y1="152" x2="886" y2="152" class="s-stroke" stroke-width="1"/>

  <rect x="14" y="170" width="418" height="132" rx="10" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="34" y="196" class="s-label">pool.map — input order</text>
  <g class="s-mono" style="font-size:10px">
    <text x="34" y="222">A  ·  B  ·  C  ·  D</text>
  </g>
  <text x="34" y="250" class="s-sub">C finished first and waits behind B.</text>
  <text x="34" y="272" class="s-sub">Right when order matters, or when you</text>
  <text x="34" y="292" class="s-sub">need the results as a list anyway.</text>

  <rect x="468" y="170" width="418" height="132" rx="10" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.3"/>
  <text x="488" y="196" class="s-label" style="fill:var(--good)">as_completed — completion order</text>
  <g class="s-mono" style="font-size:10px">
    <text x="488" y="222">C  ·  A  ·  D  ·  B</text>
  </g>
  <text x="488" y="250" class="s-sub">Each result is usable the moment it</text>
  <text x="488" y="272" class="s-sub">exists. Right for streaming progress, or</text>
  <text x="488" y="292" class="s-sub">when one slow item must not block the rest.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "when to reach for each", code: `
from concurrent.futures import ThreadPoolExecutor, as_completed

# 1. map — simplest, ordered, and it RAISES on the first failure,
#    abandoning the rest of the results.
with ThreadPoolExecutor(8) as pool:
    for result in pool.map(fetch, urls):
        handle(result)

# 2. as_completed — results as they arrive, and one failure does not
#    stop the others. The dict maps the future back to its input, which
#    you almost always need for the error message.
with ThreadPoolExecutor(8) as pool:
    futures = {pool.submit(fetch, url): url for url in urls}

    for future in as_completed(futures):
        url = futures[future]
        try:
            handle(future.result())
        except Exception:
            log.exception("failed", extra={"url": url})

# 3. submit — when the tasks are not uniform
with ThreadPoolExecutor(8) as pool:
    a = pool.submit(fetch_profile, user_id)
    b = pool.submit(fetch_orders, user_id)
    profile, orders = a.result(), b.result()
`,
      hl: [13, 17, 20],
      caption: "**The `{future: input}` dict is the idiom worth memorising.** A `Future` does not remember its arguments, so without it a failure gives you a traceback and no way to say which input caused it."
    },

    { t: "callout", kind: "trap", title: "`map` hides failures until you iterate, then loses the rest", body: [
      { t: "code", lang: "python", title: "two surprises in one call", numbered: false, code: `
with ThreadPoolExecutor(4) as pool:
    results = pool.map(risky, items)      # returns INSTANTLY -- lazy

    # Nothing has been checked yet. The exception surfaces here:
    for r in results:                     # raises on the first bad item
        print(r)                          # ...and items after it are lost

# The list() form makes the laziness moot but not the abandonment:
results = list(pool.map(risky, items))    # raises, and you get nothing`},
      { t: "ul", items: [
        "**It is lazy**, so the call returning without error means nothing.",
        "**The first exception ends the iteration**, so results already computed after that item are discarded.",
        "**Remaining tasks still run** to completion in the background; you simply never see them."
      ]},
      { t: "p", text: "**Use `as_completed` for anything where partial success matters** — a batch import where one bad row should not lose the other 9,999. `map` is right when the batch is all-or-nothing and order matters." }
    ]},

    { t: "h2", n: "03", text: "Timeouts and cancellation", id: "timeouts" },

    { t: "code", lang: "python", title: "what each timeout actually does", code: `
from concurrent.futures import TimeoutError as FuturesTimeout

with ThreadPoolExecutor(4) as pool:
    future = pool.submit(slow_call)

    try:
        result = future.result(timeout=5)
    except FuturesTimeout:
        # The CALLER stopped waiting. The task is STILL RUNNING.
        log.warning("gave up waiting")

# A timeout across a whole batch
try:
    for future in as_completed(futures, timeout=30):
        handle(future.result())
except FuturesTimeout:
    log.error("batch exceeded 30s", extra={"done": sum(f.done() for f in futures)})
`,
      hl: [9, 10],
      caption: "**A timeout bounds your waiting, not the work.** The worker keeps running, keeps holding its thread, and keeps whatever resource it acquired — which is why the real timeout belongs on the operation itself (Lesson 6.5)."
    },

    { t: "callout", kind: "warn", title: "You cannot cancel a running task", body: [
      { t: "code", lang: "python", title: "cancel() only works before it starts", numbered: false, code: `
future = pool.submit(work)

future.cancel()      # True  if still queued -> it never runs
                     # False if already started -> it runs to completion

# Shutting down without waiting:
pool.shutdown(wait=False, cancel_futures=True)    # 3.9+
# cancels QUEUED futures. Running ones still finish.`},
      { t: "p", text: "There is no safe way to interrupt a running Python function from outside — killing a thread mid-operation would leave locks held and files half-written, which is exactly the problem daemon threads cause (Lesson 11.3)." },
      { t: "code", lang: "python", title: "cooperative cancellation is the only kind", numbered: false, code: `
stop = threading.Event()


def work(item, stop: threading.Event):
    for chunk in item.chunks():
        if stop.is_set():          # the task agrees to be cancelled
            raise CancelledError
        process(chunk)


stop.set()          # asks every worker to stop at its next check`},
      { t: "p", text: "**With processes there is a real option**: `pool.shutdown()` then terminating the child. It is abrupt and loses in-flight work, but the operating system reclaims everything — which is one genuine advantage of the process boundary." }
    ]},

    { t: "h2", n: "04", text: "The two failure modes people hit", id: "failures" },

    { t: "ladder",
      title: "Submitting a large batch",
      rungs: [
        { level: "bad", label: "Submit everything at once",
          why: "`submit` never blocks, so the executor's internal queue accepts all ten million tasks immediately. Every argument is held in memory before any work finishes, and the process is killed before the first result arrives.",
          code: `with ThreadPoolExecutor(16) as pool:
    futures = [pool.submit(process, row) for row in ten_million_rows]
    for f in as_completed(futures):
        handle(f.result())` },
        { level: "ok", label: "Use `map` with a generator",
          why: "`map` consumes the input lazily and is bounded by the executor's internal buffering, so memory stays flat. But it gives up `as_completed`'s partial-failure handling and its progress reporting.",
          code: `with ThreadPoolExecutor(16) as pool:
    for result in pool.map(process, row_generator(), chunksize=100):
        handle(result)` },
        { level: "best", label: "Keep a bounded window of in-flight futures",
          why: "Submits enough to keep every worker busy and no more, so memory is bounded by the window rather than the input — while keeping per-item error handling and results as they complete.",
          code: `from concurrent.futures import FIRST_COMPLETED, wait


def run_bounded(fn, items, workers=16, window=None):
    """Peak memory is O(window), not O(len(items))."""
    window = window or workers * 4
    source = iter(items)
    in_flight = set()

    with ThreadPoolExecutor(workers) as pool:
        # Prime the window
        for item in itertools.islice(source, window):
            in_flight.add(pool.submit(fn, item))

        while in_flight:
            done, in_flight = wait(in_flight, return_when=FIRST_COMPLETED)

            for future in done:
                try:
                    yield future.result()
                except Exception:
                    log.exception("item failed")

            # Top the window back up, one submission per completion
            for item in itertools.islice(source, len(done)):
                in_flight.add(pool.submit(fn, item))`,
          note: "**`window = workers * 4` is a starting point, not a law.** Enough that no worker idles waiting for the producer, small enough that the held arguments are not the memory problem you were avoiding." }
      ]
    },

    { t: "callout", kind: "trap", title: "A pool inside a pool deadlocks", body: [
      { t: "code", lang: "python", title: "the classic", numbered: false, code: `
def outer(group):
    with ThreadPoolExecutor(4) as inner:          # a NESTED pool
        return list(inner.map(process, group))


with ThreadPoolExecutor(4) as pool:
    list(pool.map(outer, groups))    # 4 outer tasks, each waiting on 4
                                     # inner ones -- and with a shared
                                     # pool, nothing is left to run them`},
      { t: "p", text: "With separate pools this merely oversubscribes: sixteen threads on four workers' worth of intent. With a **shared** pool it deadlocks outright — every worker is blocked waiting for a task that can only run on a worker." },
      { t: "p", text: "**Flatten instead of nesting.** Submit the leaf work directly and let one pool schedule all of it, which is simpler and uses the workers better." },
      { t: "code", lang: "python", title: "flattened", numbered: false, code: `
items = [item for group in groups for item in group]

with ThreadPoolExecutor(16) as pool:
    results = list(pool.map(process, items))`}
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A batch fetcher that survives real inputs",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Build the function a service uses to fetch several thousand URLs. The requirements are the ones that only matter once the input is large or the network misbehaves — which is to say, in production and never in testing." },
        { t: "code", lang: "python", title: "the version to replace", numbered: false, code: `
def fetch_all(urls):
    with ThreadPoolExecutor(200) as pool:
        return list(pool.map(requests.get, urls))`},
        { t: "p", text: "That version has six problems. Find them, then write the replacement." }
      ],
      requirements: [
        "Memory bounded by a window, not by the number of URLs.",
        "One failure must not lose the other results.",
        "Every result identifiable — which URL produced it.",
        "A per-request timeout and an overall deadline.",
        "Concurrency capped at something the remote host tolerates.",
        "Results usable as they arrive, with progress visible.",
        "**Explain why 200 threads is worse than 20 here.**"
      ],
      hint: "Ask what `pool.map` does when the tenth URL 404s, and what `requests.get` does with no timeout when a host stops responding.",
      solution: {
        lang: "python",
        title: "fetch_all.py",
        code: `# =========================================================================
# THE SIX PROBLEMS
# =========================================================================
#
# 1. list(pool.map(...)) raises on the FIRST failure and discards every
#    result after it. One 404 in ten thousand loses the batch.
#
# 2. No timeout on requests.get. The default is to wait forever, so one
#    unresponsive host holds a thread until the process dies. With 200
#    threads and a slow host, the pool fills with permanent waiters.
#
# 3. The results are bare Responses. Nothing says which URL produced
#    which -- and on failure there is no URL in the traceback at all.
#
# 4. urls is materialised, and every Response holds its full body in
#    memory until the list is complete. Ten thousand pages at 200 KB is
#    2 GB before the first one is used.
#
# 5. 200 threads. Each costs ~8 MB of stack address space and a kernel
#    object, and they all point at the same host -- so the practical
#    result is rate limiting or a ban, not throughput (see below).
#
# 6. No connection pooling. requests.get creates a new Session per call,
#    so every request pays a TCP handshake and a TLS negotiation that a
#    shared Session would have reused.


from __future__ import annotations

import itertools
import logging
import time
from collections.abc import Iterable, Iterator
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from dataclasses import dataclass

import requests
from requests.adapters import HTTPAdapter

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class Fetched:
    """FIX 3: the URL travels WITH the outcome, so a failure names its
    input and a success can be matched back without a side table."""

    url: str
    status: int | None = None
    body: bytes | None = None
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.error is None and self.status is not None and self.status < 400


def _session(pool_size: int) -> requests.Session:
    """FIX 6: one Session, with its connection pool sized to match the
    worker count. Without this the adapter's default of 10 becomes the
    real concurrency limit and the extra threads queue inside requests."""
    session = requests.Session()
    adapter = HTTPAdapter(pool_connections=pool_size, pool_maxsize=pool_size)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def fetch_all(
    urls: Iterable[str],
    *,
    workers: int = 20,
    window: int | None = None,
    timeout: float = 10.0,
    deadline: float | None = None,
) -> Iterator[Fetched]:
    """Fetch many URLs, yielding results as they arrive.

    Peak memory is O(window), not O(len(urls)) -- so this works on an
    iterator of ten million URLs as readily as on a list of ten.
    """
    window = window or workers * 4
    source = iter(urls)
    started = time.monotonic()
    session = _session(workers)

    def one(url: str) -> Fetched:
        # FIX 2: a timeout on every request. (connect, read) -- a healthy
        # host accepts in milliseconds, so the connect budget is small
        # and the read budget covers the actual work (Lesson 6.5).
        try:
            response = session.get(url, timeout=(3.05, timeout))
            return Fetched(url, response.status_code, response.content)
        except requests.RequestException as exc:
            # FIX 1: a failure becomes a RESULT, not an exception that
            # ends the batch. The caller decides what to do with it.
            return Fetched(url, error=f"{type(exc).__name__}: {exc}")

    in_flight: set = set()
    submitted = completed = 0

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            # FIX 4: prime a bounded window rather than submitting
            # everything. submit() never blocks, so the naive version
            # queues every task before any completes.
            for url in itertools.islice(source, window):
                in_flight.add(pool.submit(one, url))
                submitted += 1

            while in_flight:
                done, in_flight = wait(in_flight, return_when=FIRST_COMPLETED)

                for future in done:
                    completed += 1
                    # one() catches its own errors, so result() cannot
                    # raise for network reasons. Anything reaching here
                    # is a bug in one(), and should not be swallowed.
                    yield future.result()

                if completed % 100 == 0:
                    log.info("fetch progress", extra={
                        "completed": completed, "in_flight": len(in_flight),
                    })

                if deadline and time.monotonic() - started > deadline:
                    log.warning("deadline reached", extra={
                        "completed": completed, "abandoned": len(in_flight),
                    })
                    # Cancels what is QUEUED; running requests finish,
                    # bounded by their own timeout.
                    for f in in_flight:
                        f.cancel()
                    break

                # Top the window back up: one submission per completion,
                # so exactly "window" are ever outstanding.
                for url in itertools.islice(source, len(done)):
                    in_flight.add(pool.submit(one, url))
                    submitted += 1
    finally:
        session.close()


# =========================================================================
# WHY 20 THREADS BEATS 200
# =========================================================================
#
# 1. THE REMOTE HOST IS THE LIMIT, NOT YOUR CPU.
#    200 concurrent requests to one origin is indistinguishable from an
#    attack. The realistic outcomes are 429s, connection resets, or an
#    IP ban -- so the extra 180 threads produce errors rather than
#    throughput (Lesson 11.1).
#
# 2. THREADS ARE NOT FREE.
#    ~8 MB of stack address space each and a real kernel object. 200
#    threads is 1.6 GB of address space and a scheduler working harder
#    for the same amount of waiting.
#
# 3. THE CONNECTION POOL CAPS IT ANYWAY.
#    requests' default adapter allows 10 connections per host. Without
#    the HTTPAdapter fix above, 190 of the 200 threads sit blocked
#    INSIDE requests waiting for a connection -- the concurrency is
#    imaginary.
#
# 4. LITTLE'S LAW GIVES THE RIGHT NUMBER.
#      concurrency = target throughput x average latency
#      50 req/s x 0.2 s latency = 10 in flight
#    Twenty is a comfortable margin. Two hundred is a number chosen by
#    hoping.
#
# If more throughput is genuinely needed, asyncio is the right tool:
# thousands of connections at a few kilobytes each rather than 8 MB
# (Lesson 11.6).


# =========================================================================
# TESTS
# =========================================================================

import pytest
import respx
import httpx


@respx.mock
def test_one_failure_does_not_lose_the_batch():
    """PROBLEM 1. The original raised on the first 404 and discarded
    every result after it."""
    respx.get(url__regex=r".*/ok/.*").mock(return_value=httpx.Response(200))
    respx.get(url__regex=r".*/bad/.*").mock(side_effect=httpx.ConnectError("x"))

    urls = [f"https://t.test/{'bad' if i == 3 else 'ok'}/{i}" for i in range(10)]
    results = list(fetch_all(urls, workers=4))

    assert len(results) == 10
    assert sum(r.ok for r in results) == 9
    assert sum(1 for r in results if r.error) == 1


def test_every_result_names_its_url():
    """PROBLEM 3. Without this, a failure is a traceback with no input."""
    results = list(fetch_all(["https://t.test/a", "https://t.test/b"], workers=2))

    assert {r.url for r in results} == {"https://t.test/a", "https://t.test/b"}


def test_memory_is_bounded_by_the_window_not_the_input():
    """PROBLEM 4. The assertion is on IN-FLIGHT COUNT, which is a
    property of the algorithm -- a memory assertion would be brittle."""
    peak = 0
    live = 0

    def counting(url):
        nonlocal peak, live
        live += 1
        peak = max(peak, live)
        time.sleep(0.001)
        live -= 1
        return Fetched(url, 200, b"")

    def endless():
        for i in range(5_000):
            yield f"https://t.test/{i}"

    with mock.patch("__main__.one", counting):
        list(fetch_all(endless(), workers=8, window=32))

    assert peak <= 32, f"{peak} in flight, window was 32"


def test_every_request_has_a_timeout():
    """PROBLEM 2. One unresponsive host must not hold a thread forever.
    Asserting on the call means a future refactor cannot drop it."""
    captured = {}

    class Probe:
        def get(self, url, **kw):
            captured.update(kw)
            raise requests.ConnectTimeout()
        def close(self): pass
        def mount(self, *a): pass

    with mock.patch("__main__._session", lambda n: Probe()):
        list(fetch_all(["https://t.test/a"], workers=1))

    assert captured.get("timeout") is not None


def test_deadline_stops_the_batch():
    """A caller who can wait 2 s must not be made to wait for 10,000
    URLs to finish."""
    def slow():
        for i in range(10_000):
            yield f"https://t.test/{i}"

    start = time.monotonic()
    results = list(fetch_all(slow(), workers=4, window=8, deadline=1.0))
    elapsed = time.monotonic() - start

    assert elapsed < 5
    assert len(results) < 10_000        # stopped early, by design


def test_results_stream_rather_than_batching():
    """The generator must yield before the whole input is consumed --
    otherwise the caller cannot show progress or start downstream work."""
    def endless():
        i = 0
        while True:
            yield f"https://t.test/{i}"
            i += 1

    gen = fetch_all(endless(), workers=4, window=8)
    first = next(gen)              # terminates only if it truly streams

    assert first.url.startswith("https://t.test/")
    gen.close()`,
        notes: [
          { t: "p", text: "**Turning a failure into a result rather than an exception is the structural change.** `pool.map` raising on the first bad item and discarding the rest is correct for an all-or-nothing batch and wrong for a fetch of ten thousand URLs, where a 404 is expected data. A `Fetched` with an `error` field lets the caller decide, and keeps the other 9,999." },
          { t: "p", text: "**The connection-pool fix is the one that makes the thread count real.** `requests`' default adapter allows ten connections per host, so 200 threads means 190 blocked *inside* `requests` — the concurrency was imaginary before the `HTTPAdapter` was sized to match." },
          { t: "p", text: "**Little's law gives the worker count instead of a guess**: target throughput times average latency is the number you need in flight. Fifty requests per second at 200 ms is ten; twenty is a comfortable margin. Two hundred is a number chosen by hoping, and against one host it produces 429s rather than throughput." },
          { t: "callout", kind: "insight", title: "The in-flight test asserts an algorithm, not a measurement", body: [
            { t: "p", text: "Counting concurrent executions and asserting it never exceeds the window states a property of the code that holds on any machine, at any input size. A memory assertion would be brittle and would pass on the broken version given a small enough fixture." },
            { t: "p", text: "The streaming test does the same job from the other side: taking one result from an infinite generator terminates only if the function genuinely yields as it goes (Lesson 8.1)." }
          ]},
          { t: "p", text: "**`future.cancel()` on the deadline path cancels only what is queued.** Running requests finish, bounded by their own timeout — which is why the per-request timeout is doing the real work and the deadline is a second-order control. A timeout on the caller never stops the worker (Lesson 6.5)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly job imports records through a thread pool with `pool.map`. It has run for two years. One night the upstream API returns a 500 for a single record, and the job imports nothing at all." },
      { t: "p", text: "**`map` raises on the first exception and abandons the rest.** Around four thousand records had already been fetched successfully and were discarded when the iteration stopped — and because the failure surfaced at the loop rather than at the call, the log said only \"HTTPError\" with no indication of which record or how many had succeeded." },
      { t: "p", text: "**The retry made it worse.** The scheduler re-ran the whole job, hit the same record, and failed again — six times, each attempt re-fetching four thousand records to throw them away." },
      { t: "p", text: "**Switching to `as_completed` with a `{future: record}` map changed the failure from total to partial**: 9,999 records imported, one logged with its id, and an alert on the failure rate rather than on the job. **Decide whether a batch is all-or-nothing before choosing the API** — `map` is right when one failure should stop everything, and wrong whenever partial success is worth having." }
    ]}
  ],

  takeaways: [
    "**`concurrent.futures` gives one API over threads and processes**, so switching between them is a one-word change once you have measured the workload.",
    "**A `Future` re-raises the worker's exception on `.result()`**, which is the single biggest advantage over raw threads, where a failure is printed and lost.",
    "**`map` preserves input order, is lazy, and raises on the first failure** — discarding results computed after it.",
    "**`as_completed` yields in completion order and isolates failures**, which is what a batch with partial success needs.",
    "**Keep a `{future: input}` dict.** A `Future` does not remember its arguments, so without it a failure gives no way to name the input.",
    "**`submit` never blocks**, so submitting a large batch queues every task and holds every argument in memory before any work completes.",
    "**Bound the work in flight with a sliding window** — top it up one submission per completion, so peak memory is the window rather than the input.",
    "**A timeout on `.result()` bounds your waiting, not the work.** The task keeps running and keeps its thread; the real timeout belongs on the operation.",
    "**You cannot cancel a running task.** `cancel()` succeeds only before it starts, and cooperative cancellation via an `Event` is the only safe kind.",
    "**A nested pool oversubscribes, and a shared nested pool deadlocks.** Flatten the work and let one pool schedule all of it.",
    "**Size a thread pool from Little's law** — throughput times latency — not from a round number. For one remote host the limit is usually theirs, not yours.",
    "**Match the HTTP adapter's connection pool to the worker count**, or the client library becomes the real concurrency limit."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A nightly job uses `list(pool.map(fetch, records))`. One record returns a 500 and the job imports nothing. Why?",
        options: [
          "The pool shuts down when a worker raises",
          "`map` re-raises the first exception during iteration, so results computed after that item are discarded — even though they succeeded",
          "`map` retries the failing item until the pool is exhausted",
          "The exception corrupted the executor's internal queue"
        ],
        answer: 1,
        why: "The remaining tasks still run, but the iteration stops at the first failure and everything after it is lost. `as_completed` with a `{future: input}` dict turns this from a total failure into a partial one: 9,999 records imported and one logged with its id. Choose `map` only when the batch really is all-or-nothing."
      },
      {
        stem: "`future.result(timeout=5)` raises `TimeoutError`. What happened to the task?",
        options: [
          "It was cancelled and its resources released",
          "Nothing — it is still running and still holding its worker; only the caller stopped waiting",
          "It was moved to the back of the queue",
          "It will be retried automatically"
        ],
        answer: 1,
        why: "A timeout on a `Future` bounds how long *you* wait, not how long the work takes. The thread stays occupied and any resource it acquired stays held, so a pool can silently fill with tasks nobody is waiting for. The real timeout belongs on the operation itself — the HTTP request, the query — where it can actually stop the work."
      },
      {
        stem: "Why does submitting ten million tasks with a list comprehension exhaust memory?",
        options: [
          "The executor pre-allocates a thread per task",
          "`submit` never blocks, so every task is queued immediately and every argument is held in memory before any work completes",
          "`Future` objects are never garbage collected",
          "The results accumulate in the executor"
        ],
        answer: 1,
        why: "There is no backpressure: the executor's internal queue accepts everything. Either use `map` with a generator, which consumes lazily, or keep a bounded window of in-flight futures topped up one submission per completion — which keeps `as_completed`'s per-item error handling while bounding memory by the window."
      },
      {
        stem: "Why is a 200-thread pool against a single host usually worse than 20?",
        options: [
          "Python cannot create more than 100 threads",
          "The remote host is the limit — 200 concurrent requests produce 429s or a ban — and the HTTP client's connection pool caps real concurrency anyway",
          "Thread creation dominates the runtime at that count",
          "The GIL serialises them, so extra threads do nothing"
        ],
        answer: 1,
        why: "Threads cost about 8 MB of stack address space each, and `requests`' default adapter allows ten connections per host — so most of those threads block inside the library and the concurrency is imaginary. Little's law gives the honest number: target throughput times average latency. If you genuinely need thousands in flight, that is an `asyncio` problem."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why use `concurrent.futures` rather than `threading` directly?",
        strong: "Exceptions propagate — a `Future` re-raises on `.result()`, where a raw thread prints a traceback and returns as though it succeeded. Results come back directly, shutdown is the `with` block, and switching threads to processes is one class name.",
        answer: [
          { t: "p", text: "Leading with exception propagation is right, because the silent-failure mode is the one that causes real incidents: a job that processed nothing looks exactly like one that worked." },
          { t: "p", text: "The interchangeability point connects it to the measurement question — once you know whether the work is I/O- or CPU-bound, acting on it costs one word." },
          { t: "p", text: "Being clear about when to drop down — a long-lived worker with its own loop, a custom shutdown protocol — keeps it a judgement rather than a rule." }
        ]
      },
      {
        level: "advanced",
        q: "`map` or `as_completed`?",
        strong: "`map` when order matters and the batch is all-or-nothing. `as_completed` when partial success is worth having, or when a slow item should not block fast ones — with a `{future: input}` dict so a failure can name its input.",
        answer: [
          { t: "p", text: "The failure semantics are the substance: `map` raising on the first exception and discarding later results is the behaviour that turns one bad record into a lost batch." },
          { t: "p", text: "The `{future: input}` idiom is small and specific enough to show first-hand use — a `Future` does not remember its arguments." },
          { t: "p", text: "Mentioning that `map` is lazy, so the call returning cleanly means nothing, is the detail that catches people out." }
        ]
      },
      {
        level: "advanced",
        q: "How do you cancel work in a thread pool?",
        strong: "You largely cannot. `cancel()` succeeds only if the task has not started; a running Python function cannot be interrupted from outside safely. Cooperative cancellation — a shared `Event` the task checks — is the only reliable approach.",
        answer: [
          { t: "p", text: "Explaining *why* is what makes it more than a limitation: killing a thread mid-operation would leave locks held and files half-written, which is the same reason daemon threads are dangerous." },
          { t: "p", text: "The process case is a genuine contrast — terminating a child is abrupt but safe, because the OS reclaims everything, and it is one real advantage of the process boundary." },
          { t: "p", text: "Noting that a timeout on `.result()` bounds the caller and not the work rounds it out, and points at where the real timeout belongs." }
        ]
      }
    ]
  }
});
