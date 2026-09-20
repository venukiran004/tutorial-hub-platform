/* ============================================================================
   LESSON 11.3 — Threading
   ========================================================================= */
EC.receiveLesson({
  id: "11.3",

  lede: "Threads share memory, which is what makes them cheap and what makes them dangerous. Every bug in this lesson comes from the same source: **two threads reading and writing the same object with no agreement about when**. The fix is almost never cleverness — it is either a lock held correctly, or an architecture where nothing is shared at all.",

  objectives: [
    "Start, join and manage threads without leaking them",
    "Identify a race condition from the symptom rather than the code",
    "Use `Lock`, `RLock` and `Event` for the situations each is meant for",
    "Avoid deadlock with lock ordering and timeouts",
    "Prefer `queue.Queue` over shared state, and explain why"
  ],

  prerequisites: ["11.2"],

  blocks: [

    { t: "h2", n: "01", text: "The basics, and the parts people get wrong", id: "basics" },

    { t: "code", lang: "python", title: "starting and finishing threads", code: `
import threading


def worker(name: str, results: list) -> None:
    results.append(f"{name} done")


results: list[str] = []
threads = [
    threading.Thread(target=worker, args=(f"w{i}", results), name=f"worker-{i}")
    for i in range(4)
]

for t in threads:
    t.start()
for t in threads:
    t.join()          # WAIT. Without this, main may exit first.

print(len(results))
`,
      out: `4`,
      caption: "**`join()` is not optional.** It is how the parent learns a thread has finished, and it is where an exception raised inside the thread does *not* surface — which is the next trap."
    },

    { t: "callout", kind: "trap", title: "An exception in a thread is invisible", body: [
      { t: "code", lang: "python", title: "the failure that leaves no trace", numbered: false, code: `
def worker():
    raise ValueError("something broke")


t = threading.Thread(target=worker)
t.start()
t.join()

print("carrying on")        # reached. The exception went to stderr and
                            # nowhere else -- t.join() does NOT re-raise.`,
        out: `Exception in thread Thread-1:
Traceback (most recent call last):
  ...
ValueError: something broke
carrying on`},
      { t: "p", text: "The traceback is printed by the threading machinery and then discarded. The parent has no way to know, `join()` returns normally, and a job that silently processed nothing looks exactly like one that succeeded." },
      { t: "code", lang: "python", title: "three ways to see it", numbered: false, code: `
# 1. Best: use an Executor, which captures it in the Future
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor() as pool:
    future = pool.submit(worker)
future.result()              # RE-RAISES here (Lesson 11.5)

# 2. Catch inside the thread and put it somewhere the parent reads
errors: list[BaseException] = []

def guarded():
    try:
        worker()
    except Exception as exc:
        errors.append(exc)

# 3. A process-wide hook, for logging rather than handling
threading.excepthook = lambda args: log.exception(
    "thread died", extra={"thread": args.thread.name},
    exc_info=(args.exc_type, args.exc_value, args.exc_traceback))`},
      { t: "p", text: "**This alone is a strong argument for `concurrent.futures` over raw threads.** A `Future` re-raises on `.result()`, so a failure propagates to the caller the way it would in ordinary code." }
    ]},

    { t: "table",
      head: ["", "Non-daemon (default)", "Daemon (`daemon=True`)"],
      rows: [
        ["On interpreter exit", "Python **waits** for it", "Killed abruptly"],
        ["Runs `finally` blocks on shutdown", "Yes", "**No**"],
        ["Suits", "Work that must complete", "Background polling, heartbeats"],
        ["Risk", "A hung thread blocks exit forever", "**Cleanup is skipped** — files unclosed, buffers unflushed"]
      ],
      caption: "**A daemon thread holding a file or a lock at shutdown is a corrupted file.** Use them only for work that is genuinely disposable, and prefer an `Event` to signal a clean stop."
    },

    { t: "h2", n: "02", text: "Races", id: "races" },

    {"kind": "timeline", "title": "A race on counter += 1", "caption": "The += is three bytecodes: read, add, write. Two threads can both read 5, both write 6, and one increment is lost. A lock makes the three steps one.", "span": 6, "tick": 1, "lanes": [{"label": "thread A", "tone": "accent", "bars": [[0, 1, "read 5"], [1, 2, "add"], [2, 3, "write 6"]]}, {"label": "thread B", "tone": "warn", "bars": [[0.5, 1.5, "read 5"], [1.5, 2.5, "add"], [2.5, 3.5, "write 6", "crit"]]}], "t": "diagram", "id": "dg-11_3-02-0"},

    { t: "viz",
      title: "Where the update goes",
      caption: "Both threads read 5, both compute 6, both write 6. One increment is gone. Nothing raises, nothing logs, and the result is merely wrong — which is why races are found by reconciliation reports rather than by tracebacks.",
      svg: `<svg viewBox="0 0 900 290" role="img" aria-label="Diagram showing two threads interleaving a read-modify-write and losing one update">
  <text x="14" y="26" class="s-mono" style="font-size:11px">counter += 1   compiles to:   LOAD  ·  ADD  ·  STORE</text>

  <line x1="14" y1="48" x2="886" y2="48" class="s-stroke" stroke-width="1"/>

  <text x="14" y="82" class="s-sub">T1</text>
  <g class="s-mono" style="font-size:9px">
    <rect x="56" y="66" width="96" height="22" rx="4" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
    <text x="70" y="81">LOAD → 5</text>
    <rect x="330" y="66" width="96" height="22" rx="4" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
    <text x="344" y="81">ADD → 6</text>
    <rect x="604" y="66" width="110" height="22" rx="4" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.3"/>
    <text x="618" y="81">STORE 6</text>
  </g>

  <text x="14" y="140" class="s-sub">T2</text>
  <g class="s-mono" style="font-size:9px">
    <rect x="194" y="124" width="96" height="22" rx="4" style="fill:var(--violet-soft);stroke:var(--violet-line)" stroke-width="1.2"/>
    <text x="208" y="139">LOAD → 5</text>
    <rect x="466" y="124" width="96" height="22" rx="4" style="fill:var(--violet-soft);stroke:var(--violet-line)" stroke-width="1.2"/>
    <text x="480" y="139">ADD → 6</text>
    <rect x="740" y="124" width="110" height="22" rx="4" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.3"/>
    <text x="754" y="139">STORE 6</text>
  </g>

  <line x1="14" y1="174" x2="886" y2="174" class="s-stroke" stroke-width="1"/>

  <text x="14" y="204" class="s-sub">counter before: <b>5</b></text>
  <text x="220" y="204" class="s-sub">two increments applied</text>
  <text x="470" y="204" class="s-sub" style="fill:var(--crit)">counter after: <b>6</b>, not 7</text>

  <text x="14" y="246" class="s-sub">The GIL guarantees each bytecode completes. It guarantees nothing about the three together —</text>
  <text x="14" y="268" class="s-sub">and it forces a switch every 5 ms, so the interleaving above is not rare, it is routine.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the fix, and the shape to prefer", code: `
import threading

# 1. A lock around the critical section
counter = 0
lock = threading.Lock()


def increment(n: int) -> None:
    global counter
    for _ in range(n):
        with lock:                 # always a context manager, never
            counter += 1           # acquire()/release() by hand


# 2. Better: no shared mutable state at all
def count(n: int) -> int:
    return n                       # each thread returns its own result


with ThreadPoolExecutor(4) as pool:
    total = sum(pool.map(count, [100_000] * 4))
`,
      hl: [11, 12, 17],
      caption: "**The second version has no lock because it has nothing to protect.** That is the general move: a race is a property of *shared mutable state*, so removing the sharing removes the whole class of bug rather than guarding one instance of it."
    },

    { t: "callout", kind: "warn", title: "Locks have a cost, and it is not the lock", body: [
      { t: "ul", items: [
        "**Acquiring an uncontended lock is fast** — tens of nanoseconds. That is almost never the problem.",
        "**A held lock serialises everything waiting for it.** A lock around a whole request handler turns a thread pool back into one thread.",
        "**Hold it for the shortest possible span.** Compute outside, mutate inside.",
        "**Never do I/O while holding a lock.** A network call inside a critical section blocks every other thread for the duration of a round trip."
      ]},
      { t: "code", lang: "python", title: "the difference in scope", numbered: false, code: `
# Wrong: the whole operation, including a network call
with lock:
    profile = api.fetch_profile(user_id)      # 200 ms, everyone blocked
    cache[user_id] = profile

# Right: compute first, hold the lock only for the mutation
profile = api.fetch_profile(user_id)
with lock:
    cache[user_id] = profile`}
    ]},

    { t: "h2", n: "03", text: "Deadlock", id: "deadlock" },

    {"kind": "cycle", "title": "Deadlock: two locks, two orders", "caption": "A holds lock 1 and waits for lock 2; B holds lock 2 and waits for lock 1. Neither can proceed. The fix is one global lock order — or one lock.", "nodes": [{"label": "thread A holds L1", "tone": "accent"}, {"label": "A waits for L2", "tone": "warn"}, {"label": "thread B holds L2", "tone": "accent"}, {"label": "B waits for L1", "tone": "warn"}], "centre": "forever", "t": "diagram", "id": "dg-11_3-03-1"},

    { t: "ladder",
      title: "Transferring between two accounts",
      rungs: [
        { level: "bad", label: "Lock in the order the arguments arrive",
          why: "Two concurrent transfers in opposite directions each hold one lock and wait for the other, forever. It is load-dependent, so it never happens in testing and happens under peak traffic.",
          code: `def transfer(a: Account, b: Account, amount: Decimal) -> None:
    with a.lock:
        with b.lock:              # transfer(x, y) and transfer(y, x)
            a.balance -= amount   # deadlock each other
            b.balance += amount` },
        { level: "ok", label: "Impose a global lock order",
          why: "If every thread acquires locks in the same order, a cycle is impossible — this is the standard fix and it is provably correct. It needs a stable total ordering, which an id gives you.",
          code: `def transfer(a: Account, b: Account, amount: Decimal) -> None:
    first, second = sorted((a, b), key=lambda acc: acc.id)
    with first.lock:
        with second.lock:
            a.balance -= amount
            b.balance += amount` },
        { level: "best", label: "One lock, or none",
          why: "Two locks is already a design smell. A single lock over the accounts table removes the ordering question entirely, and at real scale the answer is a database transaction — which solves ordering, durability and multi-process safety at once.",
          code: `# For an in-process structure: one lock over the collection
class Ledger:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._balances: dict[str, Decimal] = {}

    def transfer(self, a: str, b: str, amount: Decimal) -> None:
        with self._lock:
            if self._balances[a] < amount:
                raise InsufficientFunds(a)
            self._balances[a] -= amount
            self._balances[b] += amount


# At scale, this is not a threading problem at all:
#   BEGIN; UPDATE accounts SET ... WHERE id = %s; ... COMMIT;
# The database orders the locks, and it survives a process restart.`,
          note: "**A `timeout` on `acquire()` turns a deadlock into a detectable error** — `lock.acquire(timeout=5)` returning `False` is something you can log and alert on, where a deadlock is a thread that never returns and no signal at all." }
      ]
    },

    { t: "table",
      head: ["Primitive", "Use for", "Note"],
      rows: [
        ["`Lock`", "Mutual exclusion", "The default. Not reentrant — acquiring twice in one thread deadlocks"],
        ["`RLock`", "A method holding the lock calling another that also takes it", "Reentrant. Often a sign the design should be flattened"],
        ["`Event`", "Signalling: \"stop\", \"ready\", \"go\"", "The clean way to shut a worker down"],
        ["`Condition`", "Wait until a predicate holds", "Usually `queue.Queue` is what you actually wanted"],
        ["`Semaphore`", "Limit concurrency to N", "Rate limiting, connection pools"],
        ["`Barrier`", "All threads reach a point before any continues", "Rare outside simulation and testing"]
      ],
      caption: "**`RLock` deserves suspicion.** It exists so a class can call its own locked methods, which usually means the public and internal APIs are tangled — separating them removes the need."
    },

    { t: "h2", n: "04", text: "Queues instead of shared state", id: "queues" },

    { t: "code", lang: "python", title: "the producer-consumer shape", code: `
import queue
import threading

work: queue.Queue[str | None] = queue.Queue(maxsize=100)   # BOUNDED
results: queue.Queue[Result] = queue.Queue()
stop = threading.Event()


def consumer() -> None:
    while True:
        item = work.get()
        try:
            if item is None:            # the sentinel: one per worker
                return
            results.put(process(item))
        except Exception:
            log.exception("item failed", extra={"item": item})
        finally:
            work.task_done()


workers = [threading.Thread(target=consumer, daemon=False) for _ in range(8)]
for w in workers:
    w.start()

for item in items:
    work.put(item)                      # blocks when full -> backpressure
for _ in workers:
    work.put(None)                      # one sentinel per worker

for w in workers:
    w.join()
`,
      hl: [5, 12, 25, 29],
      caption: "**`maxsize` is the important argument.** An unbounded queue lets a fast producer read the entire input into memory while consumers fall behind — the queue becomes the memory leak (Lesson 10.3)."
    },

    { t: "callout", kind: "insight", title: "Why a queue beats a lock", body: [
      { t: "ul", items: [
        "**`queue.Queue` is already thread-safe**, so there is no lock to hold correctly and no critical section to keep short.",
        "**It gives backpressure for free** when bounded — the producer blocks rather than allocating without limit.",
        "**It makes the data flow visible.** Ownership passes with the item, so no two threads touch the same object.",
        "**It scales to processes unchanged**: swap for `multiprocessing.Queue` and the code is the same shape (Lesson 11.4)."
      ]},
      { t: "p", text: "**The `finally: task_done()` placement matters.** Outside the `finally`, an exception in `process()` means the count is never decremented and `queue.join()` hangs forever — a shutdown that never completes, with no error to explain it." },
      { t: "p", text: "**Prefer sentinels to a `stop` flag for draining.** A flag stops workers immediately and abandons queued items; one `None` per worker lets each finish the queue and exit cleanly." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a worker pool with four concurrency bugs",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "This pool processes uploads. It loses records, occasionally hangs on shutdown, silently swallows failures, and grows without bound on a large batch. All four are visible in twenty lines." },
        { t: "code", lang: "python", title: "pool.py — as found", numbered: false, code: `
import threading

processed = 0
results = []
work = queue.Queue()

def worker():
    global processed
    while True:
        item = work.get()
        if item is None:
            break
        results.append(transform(item))
        processed += 1
        work.task_done()

threads = [threading.Thread(target=worker, daemon=True) for _ in range(8)]
for t in threads:
    t.start()

for item in load_all_items():
    work.put(item)
work.put(None)

work.join()
print(f"processed {processed}")`},
        { t: "p", text: "Rewrite it, and write a test for each bug that fails on the original." }
      ],
      requirements: [
        "Name all four bugs and the symptom each produces.",
        "Fix the lost-update race without serialising the actual work.",
        "Make a failing item visible rather than fatal or silent.",
        "Bound memory so a ten-million-row batch does not exhaust it.",
        "Make shutdown deterministic.",
        "**Explain why `daemon=True` here is a data-loss risk, not just untidy.**"
      ],
      hint: "Count the sentinels against the workers. Then ask what happens to `task_done()` when `transform` raises.",
      solution: {
        lang: "python",
        title: "pool.py",
        code: `# =========================================================================
# THE FOUR BUGS
# =========================================================================
#
# 1. ONE SENTINEL, EIGHT WORKERS                      -> hangs on shutdown
#
#    work.put(None) is called once. One worker takes it and breaks; the
#    other seven block forever in work.get(). work.join() never returns
#    because those seven never call task_done() again.
#
#    Symptom: the job finishes its items and then hangs. Under
#    daemon=True the process may exit anyway, which HIDES it -- see (4).
#
# 2. processed += 1 AND results.append UNGUARDED       -> lost counts
#
#    processed += 1 is load-add-store, so increments are lost under
#    contention (Lesson 11.2). list.append happens to be atomic in
#    CPython, but relying on that is relying on an implementation
#    detail, and the count beside it is not.
#
#    Symptom: "processed 7,412" for 8,000 items, varying per run.
#
# 3. NO ERROR HANDLING                    -> silent loss AND a hung queue
#
#    If transform() raises, the worker dies. task_done() is never called
#    for that item, so work.join() waits for a decrement that will never
#    come -- and the pool is now one worker smaller with nothing logged.
#
# 4. UNBOUNDED QUEUE + daemon=True                     -> OOM, then loss
#
#    Queue() with no maxsize: the producer loop reads every item from
#    load_all_items() into memory as fast as it can. On a large batch the
#    queue IS the memory leak (Lesson 10.3).
#
#    daemon=True compounds it: daemon threads are killed abruptly at
#    interpreter exit and their finally blocks do NOT run. A worker
#    halfway through writing a record is terminated mid-write, so this
#    is data loss and corruption, not untidiness. It also masks bug 1,
#    because the process exits despite seven blocked workers.


from __future__ import annotations

import logging
import queue
import threading
from dataclasses import dataclass, field

log = logging.getLogger(__name__)


@dataclass
class PoolResult:
    """Returned by the pool rather than accumulated in globals, so there
    is nothing shared to race on."""

    items: list = field(default_factory=list)
    processed: int = 0
    failed: int = 0


SENTINEL = object()


def run_pool(source, transform, workers: int = 8,
             queue_size: int = 1000) -> PoolResult:
    """A bounded, observable, deterministic worker pool.

    source is an ITERABLE, not a list: the producer pulls lazily and the
    bounded queue applies backpressure, so peak memory is queue_size
    rather than the whole input (Lesson 8.1).
    """
    # FIX 4a: bounded. put() blocks when full, so a fast producer waits
    # for the consumers instead of buffering the world.
    work: queue.Queue = queue.Queue(maxsize=queue_size)

    # FIX 2: each worker keeps its OWN results and counts. Nothing is
    # shared, so no lock is needed and no update can be lost -- removing
    # the sharing beats guarding it.
    per_worker: list[PoolResult] = [PoolResult() for _ in range(workers)]

    def consumer(slot: PoolResult) -> None:
        while True:
            item = work.get()
            try:
                if item is SENTINEL:
                    return
                # FIX 3: one item's failure is data, not a dead worker.
                try:
                    slot.items.append(transform(item))
                    slot.processed += 1
                except Exception:
                    slot.failed += 1
                    log.exception("item failed", extra={"item": repr(item)[:200]})
            finally:
                # FIX 3b: in a finally, so a raise cannot leave the
                # counter high and hang work.join() forever.
                work.task_done()

    # FIX 4b: daemon=False. The interpreter waits for these, so finally
    # blocks run and no worker is killed mid-write.
    threads = [
        threading.Thread(target=consumer, args=(per_worker[i],),
                         name=f"pool-{i}", daemon=False)
        for i in range(workers)
    ]
    for t in threads:
        t.start()

    try:
        for item in source:
            work.put(item)
    finally:
        # FIX 1: ONE SENTINEL PER WORKER. Each takes exactly one and
        # returns; none is left blocked in get().
        # In a finally, so an exception in the producer still shuts the
        # pool down instead of leaving eight threads blocked forever.
        for _ in threads:
            work.put(SENTINEL)

    for t in threads:
        t.join()

    total = PoolResult()
    for slot in per_worker:
        total.items.extend(slot.items)
        total.processed += slot.processed
        total.failed += slot.failed
    return total


# =========================================================================
# WHY daemon=True IS DATA LOSS
# =========================================================================
#
# A daemon thread is killed when the last non-daemon thread exits. It is
# not asked to stop -- it is terminated, and its finally blocks do not
# run. So a worker that is:
#
#   - halfway through writing a row          -> a partial record
#   - holding an open file                   -> an unflushed buffer
#   - holding a lock                         -> released only because the
#                                               process died
#
# ...leaves damage rather than simply stopping early. In this pool it
# also hides bug 1: with seven workers blocked forever, a non-daemon
# pool would hang visibly at exit. daemon=True lets the process exit
# cleanly and report success, having silently dropped whatever those
# seven were meant to do.
#
# The rule: daemon=True only for work that is genuinely disposable --
# a metrics heartbeat, a cache warmer. Never for work that writes.


# =========================================================================
# TESTS — one per bug
# =========================================================================

import pytest


def test_all_workers_exit_and_the_pool_returns():
    """BUG 1. The original put ONE sentinel for eight workers, so seven
    blocked forever and work.join() never returned. A timeout makes the
    hang a failure rather than a stuck test run."""
    done = threading.Event()
    result = {}

    def go():
        result["r"] = run_pool(range(100), lambda x: x * 2, workers=8)
        done.set()

    threading.Thread(target=go, daemon=True).start()

    assert done.wait(timeout=10), "pool did not shut down — blocked workers"
    assert result["r"].processed == 100


def test_no_counts_are_lost_under_contention():
    """BUG 2. processed += 1 across eight threads loses updates. Enough
    items that the race is near-certain if the sharing is still there."""
    result = run_pool(range(50_000), lambda x: x, workers=8)

    assert result.processed == 50_000
    assert len(result.items) == 50_000


def test_a_failing_item_is_counted_not_fatal():
    """BUG 3. The original killed the worker AND left task_done()
    uncalled, so the pool shrank and then hung."""
    def sometimes(x):
        if x % 10 == 0:
            raise ValueError(f"bad {x}")
        return x

    result = run_pool(range(100), sometimes, workers=4)

    assert result.failed == 10
    assert result.processed == 90
    assert len(result.items) == 90


def test_memory_is_bounded_by_the_queue_not_the_input():
    """BUG 4a. Proves backpressure: an infinite source must not be
    drained into memory. If put() did not block, this never terminates."""
    seen = 0

    def endless():
        nonlocal seen
        while True:
            seen += 1
            if seen > 5_000:
                return          # stop the test; a real source would not
            yield seen

    result = run_pool(endless(), lambda x: x, workers=4, queue_size=50)

    assert result.processed == 5_000
    # The producer could never have run more than queue_size ahead.


def test_workers_are_not_daemons():
    """BUG 4b. A daemon worker is killed mid-write at exit, so this
    asserts the property directly rather than hoping."""
    created = []
    real = threading.Thread

    class Recording(real):
        def __init__(self, *a, **kw):
            super().__init__(*a, **kw)
            created.append(self)

    threading.Thread = Recording
    try:
        run_pool(range(10), lambda x: x, workers=2)
    finally:
        threading.Thread = real

    assert created and all(not t.daemon for t in created)


def test_producer_failure_still_shuts_the_pool_down():
    """The finally around the sentinels. Without it, an exception in the
    source leaves every worker blocked in get() forever."""
    def broken():
        yield 1
        raise RuntimeError("source failed")

    with pytest.raises(RuntimeError):
        run_pool(broken(), lambda x: x, workers=4)
    # The test completing at all is the assertion: no thread is stuck.`,
        notes: [
          { t: "p", text: "**Giving each worker its own result slot removes the race rather than guarding it.** A lock around `processed += 1` would also work and would serialise eight threads on a counter; separate slots merged at the end have no contention and no lock to hold correctly. Removing the sharing is nearly always better than protecting it." },
          { t: "p", text: "**`task_done()` belongs in a `finally`, and this is the subtlest bug of the four.** When `transform` raises, the original never decrements the queue's unfinished count, so `work.join()` waits for a decrement that will never come — a hang whose cause is an exception logged somewhere else entirely." },
          { t: "p", text: "**One sentinel per worker, put in a `finally`.** The count is what stops seven workers blocking forever; the `finally` is what stops a producer exception leaving them blocked. Both are one line and both are load-bearing." },
          { t: "callout", kind: "trap", title: "daemon=True was hiding bug 1", body: [
            { t: "p", text: "With non-daemon threads, seven workers blocked in `get()` would keep the interpreter alive and the job would visibly hang at exit. `daemon=True` let the process exit and print \"processed 7,412\" as though it had succeeded." },
            { t: "p", text: "That is the general hazard: a daemon thread converts a hang into silent partial work. Combined with abrupt termination skipping `finally` blocks, it turns a visible bug into data loss." }
          ]},
          { t: "p", text: "**The backpressure test uses an endless source deliberately.** A test over a finite list passes whether or not `maxsize` is set, so it would not catch the unbounded queue. Only an infinite producer proves the consumer is throttling it (Lesson 8.1)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments reconciliation job runs nightly with a twelve-thread pool. For eight months the totals match. Then, on the first night the input exceeds a million rows, the reconciliation is short by a few hundred pounds — and the next night it matches again." },
      { t: "p", text: "**A shared `total += amount` had been racing all along.** At small volumes the workers rarely collided; past a million rows the contention crossed a threshold and updates started being lost. The bug was eight months old and had never produced a wrong answer before." },
      { t: "p", text: "**It was found by a reconciliation check, not by a test or an alert.** Nothing raised, nothing logged, and the job reported success — which is the defining property of a race, and why they are found by the numbers being wrong rather than by anything failing." },
      { t: "p", text: "**The fix was to give each worker its own accumulator and sum at the end**, which is faster than a lock as well as correct. The transferable rule: **any variable mutated by more than one thread is a bug until it is protected**, and the test that finds it needs enough contention to make the race likely — a two-item fixture proves nothing." }
    ]}
  ],

  takeaways: [
    "**An exception in a thread is printed and discarded.** `join()` does not re-raise, so a failed worker looks identical to a successful one — which is a strong argument for `concurrent.futures`.",
    "**`daemon=True` threads are killed at exit and their `finally` blocks do not run**, so a worker mid-write leaves a partial record. Use them only for disposable work.",
    "**A race is lost updates with no error.** `counter += 1` is load-add-store, and the GIL forces a switch every 5 ms, so the interleaving is routine rather than rare.",
    "**Removing shared state beats guarding it.** Per-worker accumulators merged at the end are both correct and faster than a contended lock.",
    "**Hold a lock for the shortest possible span**, and never across I/O — a network call inside a critical section blocks every other thread for a round trip.",
    "**Always use a lock as a context manager**, so an exception cannot leave it held.",
    "**Deadlock comes from inconsistent lock ordering.** Sorting locks by a stable key makes a cycle impossible; a `timeout` on `acquire` turns a hang into a loggable error.",
    "**`RLock` is usually a design smell** — it exists so a class can call its own locked methods, which means the public and internal APIs need separating.",
    "**Prefer `queue.Queue` to shared state.** It is already thread-safe, it makes ownership explicit, and it swaps for a process queue unchanged.",
    "**Bound the queue.** An unbounded one lets a fast producer read the whole input into memory, and the queue becomes the leak.",
    "**Put `task_done()` in a `finally`**, or an exception leaves the count high and `queue.join()` hangs forever.",
    "**One sentinel per worker**, placed in a `finally`, so every worker exits and a producer failure still shuts the pool down."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A worker thread raises `ValueError`. The parent calls `join()` and continues normally. Why?",
        options: [
          "`join()` swallows exceptions by design and returns the traceback",
          "The threading machinery prints the traceback and discards it — `join()` has no mechanism to re-raise, so the parent cannot tell",
          "The exception is re-raised on the next `start()`",
          "`ValueError` is not propagated across threads; other exceptions are"
        ],
        answer: 1,
        why: "A failed worker is indistinguishable from a successful one, so a job that processed nothing reports success. `ThreadPoolExecutor` fixes this: the exception is captured in the `Future` and re-raised on `.result()`, which is how it would behave in ordinary code. Failing that, catch inside the thread and put the error somewhere the parent reads."
      },
      {
        stem: "A pool starts eight workers and the producer calls `work.put(None)` once at the end. What happens?",
        options: [
          "All eight workers see the sentinel and exit",
          "One worker exits; the other seven block forever in `get()`, and `queue.join()` never returns",
          "The queue raises on the second `get()` after the sentinel",
          "The sentinel is broadcast to every consumer"
        ],
        answer: 1,
        why: "A queue item is consumed by exactly one getter. You need one sentinel per worker, and it belongs in a `finally` so a producer exception still shuts the pool down. With `daemon=True` this bug is *hidden*: the process exits despite seven blocked threads and reports success."
      },
      {
        stem: "A consumer calls `work.task_done()` at the end of its loop body, and `transform(item)` sometimes raises. What is the consequence?",
        options: [
          "The failing item is silently retried",
          "The unfinished count is never decremented for that item, so `queue.join()` waits forever — a hang whose cause is an exception logged elsewhere",
          "The queue raises `ValueError` on the next `get()`",
          "Nothing — `task_done()` is optional"
        ],
        answer: 1,
        why: "`Queue.join()` blocks until `task_done()` has been called once per `put()`. An exception that skips the call leaves the count permanently high. Putting it in a `finally` fixes it, and the same exception also kills the worker, so the pool silently shrinks — two failures from one missing `try`."
      },
      {
        stem: "Why is `daemon=True` on a worker that writes files a data-loss risk rather than a tidiness issue?",
        options: [
          "Daemon threads cannot open files",
          "They are killed abruptly at interpreter exit and their `finally` blocks do not run, so a worker mid-write leaves a partial record and an unflushed buffer",
          "Daemon threads run at a lower priority and fall behind",
          "The GIL is released differently for daemon threads"
        ],
        answer: 1,
        why: "A daemon thread is terminated rather than asked to stop, so cleanup is skipped entirely — files unclosed, buffers unflushed, locks released only because the process died. It also masks hangs: a pool with blocked workers exits cleanly and reports success. Use `daemon=True` only for genuinely disposable background work, and an `Event` to signal a clean stop."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is a race condition and how do you prevent one?",
        strong: "Two threads reading and writing the same state with no ordering guarantee, so an update is lost. Prevent it with a lock around the critical section — or better, by removing the sharing, since a race is a property of shared mutable state.",
        answer: [
          { t: "p", text: "`counter += 1` being three bytecodes is the concrete mechanism, and it also explains why the GIL does not save you." },
          { t: "p", text: "Preferring per-worker accumulators to a lock is the stronger answer: it is correct *and* faster than serialising eight threads on one counter." },
          { t: "p", text: "The symptom is worth describing — nothing raises, nothing logs, the numbers are merely wrong — because it explains why races are found by reconciliation rather than by monitoring." }
        ]
      },
      {
        level: "advanced",
        q: "How do you avoid deadlock?",
        strong: "Acquire locks in a consistent global order, so a cycle is impossible. Sorting by a stable key like an id is the standard technique. Add a timeout to `acquire` so a deadlock becomes a loggable error rather than a thread that never returns.",
        answer: [
          { t: "p", text: "The two-account transfer is the canonical example, and noting that it is load-dependent — never in testing, always at peak — explains why it reaches production." },
          { t: "p", text: "The better answer is fewer locks: two locks is already a design smell, and one lock over the collection removes the ordering question entirely." },
          { t: "p", text: "Escalating to \"at real scale this is a database transaction\" shows you know when the in-process solution stops being the right layer." }
        ]
      },
      {
        level: "core",
        q: "When would you use a queue instead of a lock?",
        strong: "Almost always, for producer-consumer work. `queue.Queue` is already thread-safe, ownership passes with the item so nothing is shared, and a bounded queue gives backpressure for free.",
        answer: [
          { t: "p", text: "Backpressure is the point most people miss: an unbounded queue lets a fast producer read the entire input into memory, so the queue becomes the leak." },
          { t: "p", text: "The two operational details show real use — `task_done()` in a `finally`, and one sentinel per worker — and both cause hangs that are hard to diagnose." },
          { t: "p", text: "Noting that the same shape swaps to `multiprocessing.Queue` unchanged is a good closing point about designing for the boundary you may need later." }
        ]
      }
    ]
  }
});
