/* ============================================================================
   LESSON 11.4 — Multiprocessing
   ========================================================================= */
EC.receiveLesson({
  id: "11.4",

  lede: "Separate processes mean separate interpreters, separate memory and no GIL between them — which is the only way to run pure-Python code on several cores at once. **Everything that makes it work also makes it expensive**: nothing is shared, so every argument and every result has to be serialised and copied across a boundary.",

  objectives: [
    "Explain what a process boundary costs, and when the work justifies it",
    "Choose between the fork, spawn and forkserver start methods",
    "Recognise what can and cannot cross the boundary, and why",
    "Share data between processes when copying is genuinely too expensive",
    "Debug the failure modes that only appear with processes"
  ],

  prerequisites: ["11.3", "7.3"],

  blocks: [

    { t: "h2", n: "01", text: "What crossing the boundary costs", id: "cost" },

    {"kind": "flow", "title": "Crossing the process boundary", "caption": "Arguments are pickled, sent through a pipe, unpickled in the child; results come back the same way. A large array crosses twice, which is why multiprocessing loses on small tasks with big inputs.", "cols": 4, "nodes": [{"id": "p", "label": "parent", "sub": "pool.map(f, items)"}, {"id": "pk", "label": "pickle", "sub": "items serialised", "tone": "warn"}, {"id": "pipe", "label": "pipe / queue", "sub": "bytes across processes", "tone": "accent"}, {"id": "c", "label": "child", "sub": "unpickle, run f, pickle result", "tone": "good"}], "edges": [["p", "pk"], ["pk", "pipe"], ["pipe", "c"], ["c", "pipe", "result"], ["pipe", "p"]], "t": "diagram", "id": "dg-11_4-01-0"},

    { t: "viz",
      title: "Every argument is pickled, sent and rebuilt",
      caption: "A thread passes a pointer. A process serialises the object, writes it to a pipe, and the far side rebuilds it — then does the same in reverse with the result. That round trip is the whole cost model, and it is why fine-grained tasks lose.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram contrasting a thread sharing a pointer with a process pickling data through a pipe and back">
  <rect x="14" y="26" width="418" height="118" rx="10" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="34" y="52" class="s-label" style="fill:var(--good)">THREAD — shares memory</text>
  <rect x="34" y="68" width="150" height="40" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="109" y="93" text-anchor="middle" class="s-mono" style="font-size:10px">worker</text>
  <line x1="188" y1="88" x2="252" y2="88" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="220" y="80" text-anchor="middle" class="s-mono" style="font-size:8px">pointer</text>
  <rect x="256" y="68" width="150" height="40" rx="7" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.2"/>
  <text x="331" y="93" text-anchor="middle" class="s-mono" style="font-size:10px">the object</text>
  <text x="34" y="132" class="s-sub" style="fill:var(--good)">cost: ~0 — nothing is copied</text>

  <rect x="468" y="26" width="418" height="248" rx="10" style="fill:none;stroke:var(--warn)" stroke-width="1.4"/>
  <text x="488" y="52" class="s-label" style="fill:var(--warn)">PROCESS — copies everything</text>

  <rect x="488" y="68" width="130" height="34" rx="7" class="s-fill s-stroke" stroke-width="1.1"/>
  <text x="553" y="90" text-anchor="middle" class="s-mono" style="font-size:10px">parent</text>

  <g class="s-mono" style="font-size:9px">
    <rect x="488" y="114" width="378" height="22" rx="4" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
    <text x="500" y="129">1  pickle.dumps(args)</text>
    <text x="800" y="129" class="s-sub">~40 us</text>

    <rect x="488" y="142" width="378" height="22" rx="4" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
    <text x="500" y="157">2  write to a pipe</text>
    <text x="800" y="157" class="s-sub">~15 us</text>

    <rect x="488" y="170" width="378" height="22" rx="4" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
    <text x="500" y="185">3  pickle.loads in the child</text>
    <text x="800" y="185" class="s-sub">~45 us</text>

    <rect x="488" y="198" width="378" height="22" rx="4" class="s-fill s-stroke" stroke-width="1"/>
    <text x="500" y="213">4  do the work</text>
    <text x="800" y="213" class="s-sub">?</text>

    <rect x="488" y="226" width="378" height="22" rx="4" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
    <text x="500" y="241">5  pickle the result and send it back</text>
    <text x="800" y="241" class="s-sub">~60 us</text>
  </g>

  <text x="34" y="196" class="s-sub">The rule: step 4 must be much larger</text>
  <text x="34" y="218" class="s-sub">than steps 1, 2, 3 and 5 combined.</text>
  <text x="34" y="248" class="s-sub" style="fill:var(--crit)">~160 us of overhead per task.</text>
  <text x="34" y="270" class="s-sub" style="fill:var(--crit)">Below ~1 ms of work, you lose.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "chunking is what makes it viable", code: `
from concurrent.futures import ProcessPoolExecutor


def square(n: int) -> int:
    return n * n                       # ~0.1 us of work


# One task per item: 160 us of overhead for 0.1 us of work
with ProcessPoolExecutor() as pool:
    results = list(pool.map(square, range(1_000_000)))          # 48 s


# chunksize amortises the boundary over many items
with ProcessPoolExecutor() as pool:
    results = list(pool.map(square, range(1_000_000), chunksize=10_000))  # 0.9 s


# Serial, for comparison
results = [square(n) for n in range(1_000_000)]                 # 0.31 s
`,
      out: `per-item:     48.2 s      155x SLOWER than serial
chunked:       0.9 s        3x slower than serial
serial:        0.31 s`,
      hl: [9, 14],
      caption: "**Even chunked, this loses.** The work is 0.1 µs per item, so there is nothing to parallelise — chunking rescued it from catastrophic to merely bad. Multiprocessing needs work measured in milliseconds per task, not microseconds."
    },

    { t: "callout", kind: "insight", title: "The break-even, in one calculation", body: [
      { t: "code", lang: "python", title: "worth it or not", numbered: false, code: `
def worth_it(work_seconds: float, arg_bytes: int, cores: int = 8) -> bool:
    """Roughly 100 MB/s of pickling plus ~100 us fixed per task."""
    overhead = 100e-6 + (arg_bytes * 2) / 100e6
    speedup = (work_seconds * cores) / (work_seconds + overhead * cores)
    return speedup > 1.5


worth_it(work_seconds=0.000_1, arg_bytes=100)      # False — 100 us of work
worth_it(work_seconds=0.050,   arg_bytes=100)      # True  — 50 ms of work
worth_it(work_seconds=0.050,   arg_bytes=50_000_000)  # False — 50 MB argument`,
        out: `False
True
False`},
      { t: "p", text: "**Two independent ways to lose**: too little work per task, or too much data per task. A 50 MB argument costs about a second to pickle each way, which no amount of computation on eight cores recovers." },
      { t: "p", text: "**The fix for the first is `chunksize`; the fix for the second is not sending the data** — have the worker read it, or put it in shared memory." }
    ]},

    { t: "h2", n: "02", text: "Start methods", id: "start" },

    { t: "table",
      head: ["", "`fork`", "`spawn`", "`forkserver`"],
      rows: [
        ["Default on", "Linux (until 3.14)", "**macOS, Windows, Linux from 3.14**", "—"],
        ["Child starts from", "A copy of the parent, mid-flight", "A fresh interpreter", "A clean pre-forked template"],
        ["Startup", "~1 ms", "~50–300 ms", "~5 ms after the first"],
        ["Inherits globals and open files", "**Yes**", "No — re-imports `__main__`", "Only what was imported before the server started"],
        ["Safe with threads", "**No** — a classic deadlock source", "Yes", "Yes"],
        ["Needs picklable arguments", "No", "**Yes**", "**Yes**"]
      ],
      caption: "**Python 3.14 changed the Linux default from `fork` to `spawn`**, because forking a process that holds locks in threads has caused deadlocks for years. Code that relied on inherited state breaks on the new default, which makes this worth knowing now."
    },

    { t: "callout", kind: "trap", title: "Why forking a threaded process deadlocks", body: [
      { t: "p", text: "`fork()` copies only the calling thread. Any lock held by another thread at that instant is copied in its **locked state**, with no thread left to release it — so the child blocks forever the first time it touches that lock." },
      { t: "code", lang: "python", title: "the shape that hangs", numbered: false, code: `
import logging
import multiprocessing
import threading

# A background thread that logs. logging uses an internal lock.
threading.Thread(target=lambda: [logging.info("tick") for _ in range(10_000)],
                 daemon=True).start()

def child():
    logging.info("hello")        # may block forever: the lock was copied
                                 # while the other thread held it

# With start_method="fork" this hangs intermittently.
multiprocessing.Process(target=child).start()`},
      { t: "p", text: "**It is intermittent, which is what makes it expensive.** It depends on where the other thread happened to be, so it passes locally and hangs in production one deploy in twenty." },
      { t: "p", text: "**Set the start method explicitly** rather than relying on the platform default — and if your process has any threads at all, do not use `fork`." }
    ]},

    { t: "code", lang: "python", title: "set it explicitly, and guard main", code: `
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor


def main() -> None:
    # Explicit beats a default that differs by platform and version.
    ctx = mp.get_context("spawn")

    with ProcessPoolExecutor(max_workers=8, mp_context=ctx) as pool:
        results = list(pool.map(work, items, chunksize=64))


if __name__ == "__main__":
    main()          # NOT optional under spawn
`,
      hl: [7, 13],
      caption: "**The `__main__` guard is a hard requirement with `spawn`.** The child re-imports the module to find the target function; without the guard it re-runs the pool creation, which spawns more children, which re-import — a fork bomb that presents as the machine freezing."
    },

    { t: "h2", n: "03", text: "What can cross", id: "picklable" },

    { t: "code", lang: "python", title: "the things that will not pickle", code: `
# These fail with a PicklingError or AttributeError
pool.map(lambda x: x * 2, items)              # lambdas
pool.map(local_function, items)               # functions defined inside another
pool.map(obj.method, items)                   # bound methods of unpicklable objects
pool.map(process, [open("f.txt")])            # file handles, sockets, locks
pool.map(process, [db_connection])            # database connections


# These work
from functools import partial

pool.map(partial(scale, factor=2), items)     # partial IS picklable
pool.map(module_level_function, items)        # defined at module level
pool.map(Worker.process, items)               # a staticmethod or classmethod
`,
      caption: "**A `lambda` cannot be pickled because pickle stores a qualified name, not code.** `functools.partial` over a module-level function is the standard replacement, and it is one of the strongest practical arguments for `partial` over `lambda` (Lesson 5.10)."
    },

    { t: "ladder",
      title: "Giving each worker a database connection",
      rungs: [
        { level: "bad", label: "Pass the connection as an argument",
          why: "A connection wraps a socket and cannot be pickled. Under `fork` it appears to work and is worse: the file descriptor is inherited, so several processes write to one socket and the protocol corrupts.",
          code: `conn = psycopg.connect(DSN)

with ProcessPoolExecutor() as pool:
    pool.map(partial(process, conn), items)     # TypeError, or corruption` },
        { level: "ok", label: "Connect inside every task",
          why: "Correct, and each worker gets its own connection. But it opens and closes one per item — a TCP handshake and an authentication round trip for every unit of work.",
          code: `def process(item):
    with psycopg.connect(DSN) as conn:          # ~30 ms, per item
        return conn.execute(...)` },
        { level: "best", label: "One connection per worker, created at start-up",
          why: "`initializer` runs once when the worker process starts, so the connection is created once and reused for every task that worker handles. This is the standard shape for any per-worker resource.",
          code: `_conn = None


def init_worker() -> None:
    """Runs once per worker process, not once per task."""
    global _conn
    _conn = psycopg.connect(DSN)


def process(item):
    return _conn.execute("SELECT ... WHERE id = %s", (item,)).fetchone()


with ProcessPoolExecutor(
    max_workers=8,
    initializer=init_worker,
) as pool:
    results = list(pool.map(process, items, chunksize=32))`,
          note: "A module-level global is normally a smell (Lesson 4.2). Here it is the intended mechanism: each process has its own copy, so there is no sharing and nothing to race on." }
      ]
    },

    { t: "h2", n: "04", text: "Sharing data", id: "sharing" },

    { t: "table",
      head: ["Mechanism", "For", "Cost"],
      rows: [
        ["Arguments and return values", "The default — small data", "Pickled both ways"],
        ["`multiprocessing.Queue`", "A stream of work or results", "Pickled per item"],
        ["`Value` / `Array`", "A few numbers, shared", "Needs a lock; no pickling"],
        ["`shared_memory.SharedMemory`", "**A large array many workers read**", "Zero copy; you manage the lifetime"],
        ["`Manager().dict()`", "A shared mutable mapping", "**Very slow** — every access is a round trip to a server process"],
        ["A file or a database", "Anything that must survive a crash", "Real I/O, and worth it"]
      ],
      caption: "**`Manager` is the one people reach for and regret.** It looks like a normal dict and every read is an inter-process call — commonly a thousand times slower than a local dict, which is invisible until it is in a loop."
    },

    { t: "code", lang: "python", title: "shared memory for a large array", code: `
import numpy as np
from multiprocessing import shared_memory
from concurrent.futures import ProcessPoolExecutor

data = np.random.rand(50_000_000)          # 400 MB


def init(name: str, shape: tuple, dtype) -> None:
    global _view, _shm
    _shm = shared_memory.SharedMemory(name=name)
    _view = np.ndarray(shape, dtype=dtype, buffer=_shm.buf)


def chunk_mean(bounds: tuple[int, int]) -> float:
    start, stop = bounds
    return float(_view[start:stop].mean())


shm = shared_memory.SharedMemory(create=True, size=data.nbytes)
try:
    shared = np.ndarray(data.shape, dtype=data.dtype, buffer=shm.buf)
    shared[:] = data                        # copied ONCE

    bounds = [(i, i + 5_000_000) for i in range(0, 50_000_000, 5_000_000)]
    with ProcessPoolExecutor(
        max_workers=8,
        initializer=init,
        initargs=(shm.name, data.shape, data.dtype),
    ) as pool:
        means = list(pool.map(chunk_mean, bounds))
finally:
    shm.close()
    shm.unlink()                            # or it leaks until reboot
`,
      out: `pickling 400 MB per worker:   ~6.4 s
shared memory:                 ~0.9 s`,
      hl: [21, 33],
      caption: "**`unlink()` in a `finally` is mandatory.** A shared memory segment outlives the process that created it; on Linux it sits in `/dev/shm` until something removes it, so a crashed job leaks 400 MB permanently."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a parallel job faster than the serial one it replaced",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "This job was parallelised to speed it up. It is now four times slower than the serial version, leaks shared memory on failure, and hangs intermittently in production. Five distinct problems." },
        { t: "code", lang: "python", title: "score.py — as found", numbered: false, code: `
import multiprocessing
from multiprocessing import Manager

model = load_model()          # 800 MB, at module level
counts = Manager().dict()

def score_one(row):
    result = model.predict(row)
    counts[row["region"]] = counts.get(row["region"], 0) + 1
    return result

def run(rows):
    with multiprocessing.Pool(16) as pool:
        return pool.map(score_one, rows)

if __name__ == "__main__":
    logging.info("starting")
    threading.Thread(target=heartbeat, daemon=True).start()
    print(run(load_rows()))`},
        { t: "p", text: "The machine has 8 cores. Each `predict` call takes about 3 ms." }
      ],
      requirements: [
        "Identify all five problems and the cost of each.",
        "Fix the model-loading so it is not paid per task.",
        "Replace the `Manager` dict without losing the counts.",
        "Explain the intermittent hang precisely.",
        "Set `chunksize` from the work per item, and justify the number.",
        "**Say why 16 workers on an 8-core machine is wrong here but right for I/O.**"
      ],
      hint: "Work out what `pool.map` sends to a worker for each row, and what the `Manager` dict does on every one of those lines. Then look at what runs before the pool is created.",
      solution: {
        lang: "python",
        title: "score.py",
        code: `# =========================================================================
# THE FIVE PROBLEMS
# =========================================================================
#
# 1. THE MANAGER DICT — the dominant cost
#
#      counts[row["region"]] = counts.get(...) + 1
#
#    A Manager dict is a PROXY. Every read and every write is a pickled
#    round trip to a separate server process: roughly 100-200 us each,
#    and there are two per row. That is ~300 us of IPC against 3 ms of
#    work -- and all 16 workers serialise through one server process, so
#    it is also a global bottleneck. This alone accounts for most of the
#    4x regression.
#
#    It is also RACY: get-then-set is not atomic across processes, so
#    the counts are wrong as well as slow.
#
# 2. THE MODEL AT MODULE LEVEL, WITH spawn
#
#    Under fork the 800 MB is inherited copy-on-write and looks free.
#    Under spawn -- the default on macOS, Windows, and Linux from 3.14 --
#    each of the 16 children RE-IMPORTS the module, so load_model() runs
#    16 times: ~16 x 800 MB of RAM and ~16 x the load time.
#
#    On an 8-core box that is 12.8 GB of model. The machine swaps, which
#    is the other half of the regression.
#
# 3. 16 WORKERS ON 8 CORES
#
#    predict() is CPU-bound, so more processes than cores adds context
#    switching and memory pressure with no extra throughput. For I/O the
#    opposite is true -- a waiting worker uses no core -- which is why
#    "workers = 2x cores" is right for I/O and wrong here (Lesson 11.1).
#
# 4. NO chunksize
#
#    pool.map defaults to a small chunk. At 3 ms per row the boundary is
#    ~160 us, so per-item dispatch wastes ~5%. Not fatal, but free to fix.
#
# 5. THE INTERMITTENT HANG — a thread, then a fork
#
#    logging.info() and the heartbeat thread both run BEFORE the pool is
#    created. Under the fork start method, fork() copies only the calling
#    thread: any lock held by the heartbeat thread at that instant is
#    copied LOCKED, with no thread alive to release it. The first child
#    that calls logging.info() blocks forever.
#
#    It depends on where the heartbeat thread happened to be, so it hangs
#    perhaps one run in twenty -- which is why it reached production.


from __future__ import annotations

import logging
import multiprocessing as mp
import os
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass

log = logging.getLogger(__name__)

_model = None


def init_worker() -> None:
    """FIX 2: runs ONCE per worker process, not once per task and not at
    import. Eight loads instead of sixteen, and none of them happen
    before the pool exists."""
    global _model
    _model = load_model()
    log.info("worker ready", extra={"pid": os.getpid()})


@dataclass(frozen=True, slots=True)
class Scored:
    """FIX 1: the region travels back WITH the result instead of being
    written to shared state. Counting then happens once, in the parent,
    with no IPC and no race."""
    region: str
    score: float


def score_batch(rows: list[dict]) -> list[Scored]:
    """FIX 4: takes a BATCH. One boundary crossing per chunk rather than
    per row, and the model is already loaded in this process."""
    return [Scored(r["region"], _model.predict(r)) for r in rows]


def run(rows: list[dict]) -> tuple[list[Scored], Counter]:
    # FIX 3: one worker per core for CPU-bound work. More adds switching
    # and memory pressure, not throughput.
    workers = os.cpu_count() or 4

    # FIX 4: ~3 ms per row against ~160 us of boundary cost. A chunk of
    # 64 rows is ~190 ms of work for one crossing -- overhead under 0.1%,
    # and small enough that the last chunk does not leave cores idle.
    chunk = 64
    batches = [rows[i:i + chunk] for i in range(0, len(rows), chunk)]

    # FIX 5: an explicit start method. spawn gives each child a clean
    # interpreter, so no lock can be inherited in a locked state.
    ctx = mp.get_context("spawn")

    results: list[Scored] = []
    with ProcessPoolExecutor(
        max_workers=workers,
        mp_context=ctx,
        initializer=init_worker,
    ) as pool:
        for batch in pool.map(score_batch, batches):
            results.extend(batch)

    # FIX 1b: counted in the parent, from data that came back anyway.
    # Zero IPC, and correct -- Counter here has no concurrency at all.
    counts = Counter(s.region for s in results)
    return results, counts


if __name__ == "__main__":
    # FIX 5b: nothing that takes a lock, and no thread, runs before the
    # pool is created. With spawn this is belt and braces; with fork it
    # is the difference between working and hanging one run in twenty.
    logging.basicConfig(level=logging.INFO)
    scored, counts = run(load_rows())
    log.info("done", extra={"rows": len(scored), "regions": len(counts)})


# =========================================================================
# WHY 16 WORKERS IS WRONG HERE AND RIGHT FOR I/O
# =========================================================================
#
#   CPU-bound:  a worker occupies a core for its whole runtime. Sixteen
#               workers on eight cores means each runs at half speed,
#               plus context-switch cost and 2x the memory. Throughput
#               is unchanged at best.
#
#   I/O-bound:  a worker waiting on a socket uses NO core. Sixteen
#               waiting workers on eight cores is fine, and hundreds of
#               threads or thousands of asyncio tasks are normal --
#               the limit is the remote service, not the CPU
#               (Lesson 11.1).
#
# The model to hold: for CPU work, "workers" means "cores I am using".
# For I/O work it means "requests I have in flight".


# =========================================================================
# MEASURED
# =========================================================================
#
#   original, 100k rows            18.4 min   (4.2x slower than serial)
#   serial                          4.4 min
#
#   fix 1 alone (drop the Manager)  5.1 min
#   + fix 2 (initializer)           2.9 min
#   + fix 3 (8 workers)             1.1 min
#   + fix 4 (chunksize=64)          0.9 min    4.9x faster than serial
#
# The Manager dict was more than half the regression, and it was the
# line that looked most innocent.


# =========================================================================
# TESTS
# =========================================================================

import pytest


def test_the_model_is_loaded_once_per_worker_not_per_task():
    """FIX 2. Counting loads is the only way to see this -- a timing
    test would pass on a small fixture."""
    with mp.get_context("spawn").Manager() as m:
        loads = m.list()
        # a probe initializer that records instead of loading
        with ProcessPoolExecutor(
            max_workers=2, mp_context=mp.get_context("spawn"),
            initializer=_record_load, initargs=(loads,),
        ) as pool:
            list(pool.map(_noop, range(50)))

        assert len(loads) == 2, f"loaded {len(loads)} times for 2 workers"


def test_counts_are_correct_and_need_no_shared_state():
    """FIX 1. The Manager version was racy as well as slow: get-then-set
    is not atomic across processes, so counts were lost under load."""
    rows = [{"region": "eu"}] * 600 + [{"region": "us"}] * 400
    _, counts = run(rows)

    assert counts == Counter({"eu": 600, "us": 400})


def test_worker_count_matches_cores_for_cpu_work(monkeypatch):
    """FIX 3."""
    monkeypatch.setattr(os, "cpu_count", lambda: 8)
    created = {}

    class Probe(ProcessPoolExecutor):
        def __init__(self, *a, **kw):
            created["workers"] = kw.get("max_workers")
            super().__init__(*a, **kw)

    monkeypatch.setattr("score.ProcessPoolExecutor", Probe)
    run([{"region": "eu"}] * 10)

    assert created["workers"] == 8


def test_batches_cross_the_boundary_not_rows():
    """FIX 4. Asserts the SHAPE: the callable must take a list, so a
    future refactor back to per-row dispatch fails here."""
    import inspect

    sig = inspect.signature(score_batch)
    param = next(iter(sig.parameters.values()))
    assert "list" in str(param.annotation)


def test_start_method_is_explicit():
    """FIX 5. The default differs by platform and changed in 3.14, so
    relying on it is relying on something that moves."""
    import inspect

    source = inspect.getsource(run)
    assert 'get_context("spawn")' in source`,
        notes: [
          { t: "p", text: "**The `Manager` dict was more than half the regression and looks like ordinary code.** Every `counts.get()` and every assignment is a pickled round trip to a server process — two per row, roughly 300 µs against 3 ms of real work — and all sixteen workers queue behind that one process. It is also racy, since get-then-set is not atomic across processes." },
          { t: "p", text: "**The fix is to stop sharing, not to share faster.** The region travels back with the result, which was crossing the boundary anyway, and the counting happens in the parent where there is no concurrency at all. That is the same move as per-worker accumulators in threading (Lesson 11.3)." },
          { t: "p", text: "**The module-level model is free under `fork` and catastrophic under `spawn`.** Copy-on-write makes it invisible on Linux today; a `spawn` default — macOS, Windows, and Linux from 3.14 — re-imports the module in every child and loads 800 MB sixteen times. Code that works only under `fork` is code with a deadline on it." },
          { t: "callout", kind: "trap", title: "The hang is a thread plus a fork", body: [
            { t: "p", text: "`logging.info()` and the heartbeat thread both run before the pool is created. `fork()` copies only the calling thread, so a lock held by the heartbeat at that instant is copied locked with nobody left to release it — and the first child to log blocks forever." },
            { t: "p", text: "It depends on where the other thread happened to be, so it fails perhaps one run in twenty. Setting `spawn` explicitly removes the whole class, which is why the new default exists." }
          ]},
          { t: "p", text: "**`chunksize=64` is derived, not guessed**: 3 ms per row against a ~160 µs boundary means 64 rows is about 190 ms of work per crossing, so overhead falls under 0.1% while chunks stay small enough that the tail does not leave cores idle." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team parallelises an image pipeline with `multiprocessing.Pool`. It works beautifully on their Linux CI and on every developer's Linux laptop. A new engineer joins on a Mac, and the same code loads the ML model eight times, exhausts memory and is killed." },
      { t: "p", text: "**Linux defaulted to `fork` and macOS to `spawn`.** Under `fork` the model at module level was inherited copy-on-write and cost nothing; under `spawn` each child re-imported the module and loaded its own copy. Nobody had written anything platform-specific — the default did it." },
      { t: "p", text: "**Python 3.14 makes `spawn` the default on Linux too**, so this stopped being a Mac problem and became everyone's, on an upgrade rather than a code change." },
      { t: "p", text: "**Set the start method explicitly and load heavy resources in an `initializer`.** Both are one line, both make the behaviour identical everywhere, and together they remove a class of bug that only ever appears on someone else's machine — usually the newest person's, on their first day." }
    ]}
  ],

  takeaways: [
    "**Processes give real parallelism because nothing is shared** — which is also why every argument and result must be pickled and copied.",
    "**The boundary costs roughly 100–200 µs per task.** Work below about a millisecond loses, however many cores you have.",
    "**`chunksize` amortises the boundary**, and it should be derived from the work per item rather than guessed.",
    "**Large arguments are the other way to lose**: a 50 MB payload costs about a second to pickle each way, which no amount of parallelism recovers.",
    "**Set the start method explicitly.** The default differs by platform and changed on Linux in 3.14, so relying on it is relying on something that moves.",
    "**Never `fork` a process that has threads.** A lock held by another thread is copied in its locked state with nobody to release it, and the child hangs intermittently.",
    "**`spawn` re-imports the module in every child**, so module-level work runs once per worker — free under `fork`, catastrophic under `spawn`.",
    "**The `__main__` guard is mandatory with `spawn`**, or the child re-runs the pool creation and forks recursively.",
    "**Lambdas, local functions, file handles and connections cannot be pickled.** `functools.partial` over a module-level function is the standard replacement.",
    "**Create per-worker resources in an `initializer`** — once per process, not once per task.",
    "**`Manager` proxies are a round trip per access**, commonly a thousand times slower than a local dict. Return data instead of sharing it.",
    "**Use `shared_memory` for a large array many workers read**, and `unlink()` in a `finally` or the segment leaks until reboot."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`pool.map(square, range(1_000_000))` is 155× slower than the serial version. Why?",
        options: [
          "The pool has too many workers",
          "Each item crosses the process boundary separately — roughly 160 µs of pickling and IPC for 0.1 µs of work",
          "`range` cannot be parallelised",
          "The GIL still applies across processes"
        ],
        answer: 1,
        why: "Every task is pickled, written to a pipe, unpickled, computed and sent back. When the computation is smaller than that round trip, more workers means more overhead. `chunksize` amortises it over many items — but here the work is so small that even chunked it loses to serial, which is the real answer: this workload should not use processes at all."
      },
      {
        stem: "A job loads an 800 MB model at module level. It works on Linux and exhausts memory on macOS. Why?",
        options: [
          "macOS has less memory available to Python",
          "Linux defaulted to `fork`, which inherits the model copy-on-write; macOS uses `spawn`, so each child re-imports the module and loads its own copy",
          "The model file is not portable between platforms",
          "macOS limits the number of child processes"
        ],
        answer: 1,
        why: "Nothing platform-specific was written — the start-method default did it. Under `fork` the model is inherited and effectively free; under `spawn` the child starts a fresh interpreter and re-imports `__main__` to find the target. Python 3.14 makes `spawn` the Linux default too, so this becomes everyone's problem on an upgrade. Load heavy resources in an `initializer`."
      },
      {
        stem: "A process pool hangs intermittently, roughly one run in twenty. The parent starts a logging thread before creating the pool. What is happening?",
        options: [
          "The logging thread is starving the pool of CPU",
          "`fork()` copies only the calling thread, so a lock held by the logging thread is copied locked with no thread left to release it — the first child to log blocks forever",
          "The log file handle is shared and contended",
          "Daemon threads prevent the pool from starting"
        ],
        answer: 1,
        why: "It depends on where the other thread happened to be when the fork occurred, which is why it is intermittent and reaches production. Any lock — `logging`'s internal lock, an allocator lock, a lock inside a library — can be inherited in a locked state. Using `spawn` removes the whole class, which is precisely why it became the default."
      },
      {
        stem: "Workers update a shared `Manager().dict()` counter once per row. What does that cost?",
        options: [
          "Nothing measurable — it is a normal dict",
          "Two pickled round trips to a separate server process per row, all workers serialising through it, and get-then-set is not atomic so counts are lost",
          "A GIL acquisition per access",
          "Memory proportional to the number of workers"
        ],
        answer: 1,
        why: "A `Manager` object is a proxy: every read and write is inter-process communication with one server process, commonly a thousand times slower than a local dict and a global bottleneck besides. It is racy too, since get-then-set spans two round trips. Return the data with the result and aggregate in the parent, where there is no concurrency at all."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "When would you use multiprocessing over threading?",
        strong: "For CPU-bound pure-Python work, because separate interpreters mean no shared GIL. The trade is that nothing is shared, so every argument and result is pickled — which makes it a poor fit for fine-grained tasks or large payloads.",
        answer: [
          { t: "p", text: "Quantifying the boundary — roughly 100–200 µs per task — turns the decision into arithmetic rather than a preference, and `chunksize` follows directly from it." },
          { t: "p", text: "The large-argument case is the second way to lose and is less well known: 50 MB of data costs about a second to pickle each way, which parallelism cannot recover." },
          { t: "p", text: "Noting that C extensions releasing the GIL often make threads sufficient shows you would check before reaching for processes at all (Lesson 11.2)." }
        ]
      },
      {
        level: "advanced",
        q: "What is the difference between fork and spawn?",
        strong: "`fork` copies the parent process, so the child inherits memory and open descriptors and starts in about a millisecond. `spawn` starts a fresh interpreter and re-imports the module, which is slower and requires everything to be picklable.",
        answer: [
          { t: "p", text: "The threading interaction is the important part: `fork` copies only the calling thread, so a lock held elsewhere is inherited locked and the child deadlocks — intermittently, which is why it reaches production." },
          { t: "p", text: "Knowing that Linux moved to `spawn` in 3.14 shows the knowledge is current, and it makes the advice actionable: set it explicitly rather than inheriting a default that moves." },
          { t: "p", text: "The practical consequence — module-level work runs once per worker under `spawn` — is what breaks real code on the switch, and `initializer` is the fix." }
        ]
      },
      {
        level: "advanced",
        q: "How do you share a large dataset between worker processes?",
        strong: "Prefer not to. Have each worker read what it needs, or send indices rather than data. When it genuinely must be shared and read-only, `shared_memory` gives zero-copy access at the cost of managing the lifetime yourself.",
        answer: [
          { t: "p", text: "Warning against `Manager` proxies is the practically valuable half — they look like ordinary containers and cost a round trip per access." },
          { t: "p", text: "`unlink()` in a `finally` is the operational detail: a shared segment outlives the process that created it, so a crash leaks memory until reboot." },
          { t: "p", text: "Returning data with the result rather than writing to shared state generalises beyond processes, and is the same move that removes races in threading." }
        ]
      }
    ]
  }
});
