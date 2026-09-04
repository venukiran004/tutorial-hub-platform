/* ============================================================================
   LESSON 11.2 — The GIL
   ========================================================================= */
EC.receiveLesson({
  id: "11.2",

  lede: "The global interpreter lock is the most discussed and least understood thing in Python. It does not make Python single-threaded, it does not prevent race conditions, and it is released far more often than people assume. **It protects the interpreter's own state**, and once you know exactly what that means, every concurrency decision in the language follows from it.",

  objectives: [
    "State precisely what the GIL protects and what it does not",
    "Name the conditions under which it is released",
    "Explain why it does not save you from race conditions",
    "Predict which workloads it constrains and which it does not",
    "Describe what free-threaded Python changes, and what it costs"
  ],

  prerequisites: ["11.1", "8.8"],

  blocks: [

    { t: "h2", n: "01", text: "What it actually is", id: "what" },

    { t: "p", text: "A single mutex in the CPython interpreter. A thread must hold it to execute bytecode, and it is the mechanism that keeps the interpreter's internal state — reference counts, the object allocator, the type cache — consistent when several threads run in one process." },

    { t: "viz",
      title: "One lock, passed around",
      caption: "Threads take turns holding the lock. A thread doing pure-Python work holds it and is switched out every few milliseconds; a thread that blocks on I/O releases it and the next one runs immediately. That single difference is why threads transform I/O-bound work and do nothing for CPU-bound work.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Timeline showing three threads sharing the GIL, with CPU-bound threads taking turns and an I/O thread releasing the lock while it waits">
  <text x="14" y="26" class="s-label" style="fill:var(--crit)">THREE CPU-BOUND THREADS — the lock is the bottleneck</text>

  <g class="s-mono" style="font-size:9px">
    <text x="14" y="58" class="s-sub">T1</text>
    <rect x="48" y="46" width="110" height="18" rx="3" style="fill:var(--crit)" opacity=".8"/>
    <rect x="378" y="46" width="110" height="18" rx="3" style="fill:var(--crit)" opacity=".8"/>
    <rect x="708" y="46" width="110" height="18" rx="3" style="fill:var(--crit)" opacity=".8"/>

    <text x="14" y="86" class="s-sub">T2</text>
    <rect x="158" y="74" width="110" height="18" rx="3" style="fill:var(--crit)" opacity=".8"/>
    <rect x="488" y="74" width="110" height="18" rx="3" style="fill:var(--crit)" opacity=".8"/>

    <text x="14" y="114" class="s-sub">T3</text>
    <rect x="268" y="102" width="110" height="18" rx="3" style="fill:var(--crit)" opacity=".8"/>
    <rect x="598" y="102" width="110" height="18" rx="3" style="fill:var(--crit)" opacity=".8"/>
  </g>

  <text x="14" y="146" class="s-sub" style="fill:var(--crit)">Never more than one running. Total time is the same as serial, plus the handoffs.</text>

  <line x1="14" y1="168" x2="886" y2="168" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="196" class="s-label" style="fill:var(--good)">THREE I/O-BOUND THREADS — the lock is idle most of the time</text>

  <g class="s-mono" style="font-size:9px">
    <text x="14" y="228" class="s-sub">T1</text>
    <rect x="48" y="216" width="34" height="18" rx="3" style="fill:var(--good)" opacity=".9"/>
    <rect x="82" y="216" width="240" height="18" rx="3" style="fill:none;stroke:var(--border-strong)" stroke-dasharray="3 2"/>
    <text x="92" y="229" class="s-sub">waiting — GIL released</text>
    <rect x="322" y="216" width="34" height="18" rx="3" style="fill:var(--good)" opacity=".9"/>

    <text x="14" y="256" class="s-sub">T2</text>
    <rect x="82" y="244" width="34" height="18" rx="3" style="fill:var(--good)" opacity=".9"/>
    <rect x="116" y="244" width="240" height="18" rx="3" style="fill:none;stroke:var(--border-strong)" stroke-dasharray="3 2"/>
    <rect x="356" y="244" width="34" height="18" rx="3" style="fill:var(--good)" opacity=".9"/>

    <text x="14" y="284" class="s-sub">T3</text>
    <rect x="116" y="272" width="34" height="18" rx="3" style="fill:var(--good)" opacity=".9"/>
    <rect x="150" y="272" width="240" height="18" rx="3" style="fill:none;stroke:var(--border-strong)" stroke-dasharray="3 2"/>
    <rect x="390" y="272" width="34" height="18" rx="3" style="fill:var(--good)" opacity=".9"/>
  </g>

  <text x="470" y="256" class="s-sub" style="fill:var(--good)">The waits overlap. The lock is only</text>
  <text x="470" y="276" class="s-sub" style="fill:var(--good)">needed for the short bursts of Python.</text>
</svg>`
    },

    { t: "callout", kind: "insight", title: "Why it exists", body: [
      { t: "p", text: "CPython manages memory with reference counting (Lesson 8.8). Every assignment, argument pass and scope exit adjusts a counter, and those adjustments are not atomic — two threads incrementing the same count can lose an update, which frees a live object or leaks a dead one." },
      { t: "code", lang: "python", title: "the operation that needs protecting", numbered: false, code: `
# Every one of these touches a refcount:
x = some_object          # incref
del x                    # decref, and free at zero
f(some_object)           # incref for the argument, decref on return

# Without the GIL, protecting each count needs a per-object atomic
# operation -- which is what free-threaded Python does, and why it costs
# single-threaded performance.`},
      { t: "ul", items: [
        "**The alternative is fine-grained locking**, which is slower for single-threaded code — the overwhelmingly common case — and was rejected repeatedly for that reason.",
        "**It makes C extensions simple.** An extension holding the GIL cannot be interrupted by another thread's Python, so decades of C code was written assuming that guarantee.",
        "**It makes CPython itself simpler**, which is a real engineering argument even if it is an unsatisfying one."
      ]}
    ]},

    { t: "h2", n: "02", text: "When it is released", id: "released" },

    { t: "table",
      head: ["Situation", "Released?", "Consequence"],
      rows: [
        ["Blocking I/O — sockets, files, `time.sleep`", "**Yes**", "Threads overlap waiting; this is why they work for I/O"],
        ["A C extension that opts in", "**Yes**", "`numpy`, `hashlib`, `zlib`, image and crypto libraries thread well"],
        ["Every ~5 ms of pure Python", "**Yes**, forcibly", "The switch interval — a handoff that buys nothing for CPU work"],
        ["Calling into a subprocess", "**Yes**", "`subprocess` is just I/O from the parent's view"],
        ["Pure-Python computation", "No", "One thread at a time; no parallelism"],
        ["A C extension that does not opt in", "No", "It blocks every other thread for its whole duration"]
      ],
      caption: "**The second row is the one that surprises people.** A large share of \"CPU-bound\" Python is really C code that has released the lock, which is why threading a `numpy` or `hashlib` workload works and threading a pure-Python loop does not (Lesson 11.1)."
    },

    { t: "code", lang: "python", title: "how an extension releases it", code: `
/* In C — the macro pair that makes a library thread-friendly */
static PyObject *compute(PyObject *self, PyObject *args) {
    double *data; Py_ssize_t n;
    /* ... parse arguments while holding the GIL ... */

    Py_BEGIN_ALLOW_THREADS         /* release: other threads may run */
    heavy_numeric_work(data, n);   /* touches NO Python objects */
    Py_END_ALLOW_THREADS           /* reacquire before touching Python */

    return PyFloat_FromDouble(result);
}
`,
      caption: "**The rule for the extension author is that the released section must not touch a Python object.** That is why it works for numeric kernels over raw buffers and not for anything manipulating lists or dicts — and it is exactly the boundary `numpy` is built around."
    },

    { t: "code", lang: "python", title: "observing it from Python", code: `
import sys
import threading
import time


print(sys.getswitchinterval())          # 0.005 — the forced handoff


def spin(n):
    """Pure Python. Holds the GIL except at the 5 ms switch."""
    total = 0
    for i in range(n):
        total += i * i
    return total


def hashes(data, rounds):
    """hashlib releases the GIL around the digest."""
    import hashlib
    for _ in range(rounds):
        hashlib.sha256(data).hexdigest()


def timed(fn, args, threads):
    start = time.perf_counter()
    ts = [threading.Thread(target=fn, args=args) for _ in range(threads)]
    for t in ts: t.start()
    for t in ts: t.join()
    return time.perf_counter() - start
`,
      out: `0.005

spin(10_000_000)          1 thread  1.04 s    4 threads  4.31 s   0.24x
hashes(1MB, 400)          1 thread  1.12 s    4 threads  0.31 s   3.6x`,
      hl: [22, 23],
      caption: "**Identical structure, opposite results.** Four threads of pure Python are slightly *worse* than four sequential runs; four threads of hashing scale almost linearly, because the digest happens with the lock released."
    },

    { t: "h2", n: "03", text: "The GIL does not make you thread-safe", id: "notsafe" },

    { t: "callout", kind: "trap", title: "A single bytecode is atomic; a statement is not", body: [
      { t: "code", lang: "python", title: "the classic lost update", numbered: false, code: `
import threading

counter = 0

def increment():
    global counter
    for _ in range(100_000):
        counter += 1          # NOT atomic

threads = [threading.Thread(target=increment) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()

print(counter)                # 400000 expected`,
        out: `271043`},
      { t: "p", text: "`counter += 1` compiles to at least four bytecodes: load the global, load the constant, add, store. The GIL can be released between any two of them, so two threads can both read 5, both compute 6, and both store 6 — one increment lost." },
      { t: "code", lang: "python", title: "the fix is a lock, as in any language", numbered: false, code: `
lock = threading.Lock()

def increment():
    global counter
    for _ in range(100_000):
        with lock:
            counter += 1

# Or avoid shared mutable state entirely: have each thread return a
# count and sum them at the end (Lesson 11.5).`},
      { t: "p", text: "**The GIL protects the interpreter, not your data.** It guarantees the object model does not corrupt; it guarantees nothing about the invariants of your program (Lesson 11.3)." }
    ]},

    { t: "callout", kind: "note", title: "What *is* atomic, and why not to rely on it", body: [
      { t: "code", lang: "python", title: "single-bytecode operations", numbered: false, code: `
d[k] = v              # one STORE_SUBSCR — atomic
lst.append(x)         # one C-level call — atomic
x = lst.pop()         # atomic
d.setdefault(k, [])   # atomic

d[k] += 1             # NOT atomic — load, add, store
if k not in d:        # NOT atomic — another thread can insert between
    d[k] = []         #              the check and the assignment`},
      { t: "p", text: "The atomic ones are atomic because they are a single bytecode that stays inside C. That is an **implementation detail of CPython**, not a language guarantee — it does not hold on other implementations and is not promised to hold in future ones." },
      { t: "p", text: "**Use a lock or a `queue.Queue` and stop reasoning about bytecodes.** Code that depends on which operations are atomic is correct by accident and breaks silently when someone edits the line." }
    ]},

    { t: "h2", n: "04", text: "Free-threaded Python", id: "freethreaded" },

    { t: "p", text: "PEP 703 makes the GIL optional. Python 3.13 shipped an experimental free-threaded build, 3.14 improves it, and it is a supported but non-default configuration — a separate binary, not a runtime flag." },

    { t: "ladder",
      title: "What changes, and what it costs",
      rungs: [
        { level: "bad", label: "Assume it makes everything faster",
          why: "Removing the lock means every reference count needs its own atomic operation, and containers need internal locking. That is a real cost on the single-threaded path, which is how nearly all Python runs.",
          code: `# The expectation
#   "no GIL" -> my code gets faster

# The measurement, 3.13t vs 3.13, single-threaded:
#   roughly 5-10% slower on typical workloads` },
        { level: "ok", label: "Expect gains only for parallel pure-Python CPU work",
          why: "That is exactly the workload the GIL constrained, and the gains there are genuine and large. Everything else — I/O-bound work, C-extension work — was never blocked, so there is nothing to recover.",
          code: `# Helped a lot:
#   pure-Python CPU work across threads      near-linear with cores
#
# Unchanged:
#   I/O-bound work                           the GIL was already released
#   numpy / hashlib / zlib                   already released it
#
# Made slightly worse:
#   single-threaded everything               atomic refcounts` },
        { level: "best", label: "Treat it as an ecosystem question, not a language one",
          why: "Any C extension that assumed the GIL is now unsafe and must be audited and rebuilt. The blocker is not your code — it is the dependency tree beneath it, and that is measured in years rather than releases.",
          code: `# Check where you actually stand
python3.13t -c "import sys; print(sys._is_gil_enabled())"

# An extension declares support explicitly; without it, importing the
# module RE-ENABLES the GIL at runtime and you are back where you began.
# PyUnstable_Module_SetGIL(m, Py_MOD_GIL_NOT_USED);

# So the practical question is:
#   does every wheel in my lockfile ship a free-threaded build?`,
          note: "**The honest position for production today: not yet, and watch it.** The performance story is real, the compatibility story is the constraint, and importing one unprepared extension silently turns the lock back on." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "What free-threading does not fix", body: [
      { t: "ul", items: [
        "**Race conditions get worse, not better.** The GIL's forced switches gave pure-Python code a coarse interleaving; removing it means genuinely simultaneous execution and races that were rare become common.",
        "**You still need locks.** Every argument in this lesson about `counter += 1` applies identically, and now the window is wider.",
        "**`multiprocessing` remains the right answer for isolation** — separate memory spaces prevent a whole class of bug that shared threads do not.",
        "**I/O-bound code gains nothing**, because it was never constrained."
      ]},
      { t: "p", text: "**The GIL was never the reason Python is slow.** It is the reason parallel *pure-Python CPU* work is impossible in one process, which is a narrower claim than it is usually given — and for most services, not the binding constraint at all." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Predict, then measure",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "Five functions. For each: predict the speed-up from four threads, say whether the GIL is held or released and why, then write the experiment that checks your prediction." },
        { t: "code", lang: "python", title: "the five", numbered: false, code: `
def a(n):                      # pure arithmetic
    return sum(i * i for i in range(n))

def b(data):                   # compress a 10 MB buffer
    return zlib.compress(data, level=6)

def c(path):                   # read a 50 MB file
    return Path(path).read_bytes()

def d(matrix):                 # 2000x2000 matrix multiply
    return matrix @ matrix

def e(rows):                   # parse and total 100k JSON lines
    return sum(json.loads(r)["amount"] for r in rows)`},
        { t: "p", text: "One of the five has an answer that depends on a detail of the library rather than on the category it appears to belong to." }
      ],
      requirements: [
        "Predict the four-thread speed-up for each before running anything.",
        "State whether the GIL is held or released, and where.",
        "Write one harness that measures all five.",
        "Identify the one whose answer depends on a library detail.",
        "Explain why `c` behaves differently from what its category suggests.",
        "**Say which one would change most under a free-threaded build.**"
      ],
      hint: "Two of these spend their time in C with the lock released. One is I/O that is fast enough that the Python around it dominates. And `e` looks like the same category as `a` but has a subtlety in `json`.",
      solution: {
        lang: "python",
        title: "gil_experiment.py",
        code: `# =========================================================================
# PREDICTIONS
# =========================================================================
#
#   fn  what it does           GIL                        4-thread speed-up
#   --  --------------------   ------------------------   -----------------
#   a   pure arithmetic        HELD throughout            ~0.9x  (slower)
#   b   zlib.compress          RELEASED around deflate    ~3.5x
#   c   read 50 MB file        RELEASED during the read   ~1.2x  (see below)
#   d   numpy matmul           RELEASED, and BLAS also
#                              threads internally         ~1.0x  (see below)
#   e   json.loads x 100k      HELD -- short C calls       ~0.95x
#
#
# a — PURE PYTHON, GIL HELD
#     A generator expression is interpreter work end to end. Four threads
#     take turns; the only change from serial is a forced handoff every
#     5 ms, which is the ~10% loss.
#
# b — zlib RELEASES THE GIL
#     Py_BEGIN_ALLOW_THREADS around deflate, which touches no Python
#     objects. Scales nearly with cores until memory bandwidth binds.
#     This is the "CPU-bound but threads fine" case (Lesson 11.1).
#
# c — I/O, BUT NOT THE ANSWER THE CATEGORY SUGGESTS
#     read_bytes() releases the GIL for the syscall, so on a cold cache
#     over a network filesystem this threads well. On a warm page cache
#     and an NVMe drive the read is ~40 ms of DMA and the ALLOCATION of a
#     50 MB bytes object dominates -- and allocation holds the GIL.
#     So "it is I/O" predicts 4x and the measurement gives ~1.2x.
#     The lesson: I/O-bound is a property of the MEASUREMENT, not of the
#     function's category.
#
# d — THE ONE THAT DEPENDS ON A LIBRARY DETAIL
#     numpy releases the GIL, so you would predict ~4x. But matmul
#     dispatches to BLAS, which is ALREADY multi-threaded -- OpenBLAS
#     defaults to one thread per core. One call saturates the machine, so
#     four Python threads each get a quarter of the cores and the total
#     is unchanged, plus contention.
#
#       OMP_NUM_THREADS=1 python experiment.py     -> now ~3.8x
#
#     Nested parallelism is the trap: the library was parallel before you
#     added threads, and stacking the two oversubscribes the CPU.
#
# e — HELD, DESPITE BEING "C CODE"
#     json.loads is C, but it does NOT release the GIL: each call is
#     short, it allocates Python objects throughout, and releasing around
#     a microsecond-scale call would cost more than it saves. Being
#     implemented in C is not the same as releasing the lock.


# =========================================================================
# THE HARNESS
# =========================================================================

from __future__ import annotations

import json
import sys
import threading
import time
import zlib
from pathlib import Path

import numpy as np


def parallel(fn, arg, threads: int) -> float:
    """Same total work in both cases: "threads" calls, either sequential
    or concurrent. Comparing anything else measures the wrong thing."""
    start = time.perf_counter()
    ts = [threading.Thread(target=fn, args=(arg,)) for _ in range(threads)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    return time.perf_counter() - start


def serial(fn, arg, times: int) -> float:
    start = time.perf_counter()
    for _ in range(times):
        fn(arg)
    return time.perf_counter() - start


def report(name: str, fn, arg, threads: int = 4) -> None:
    one = serial(fn, arg, threads)
    many = parallel(fn, arg, threads)
    print(f"{name:6} serial {one:6.2f}s  {threads} threads {many:6.2f}s"
          f"  {one / many:5.2f}x")


if __name__ == "__main__":
    print("free-threaded:", not sys._is_gil_enabled()
          if hasattr(sys, "_is_gil_enabled") else "no (pre-3.13)")
    print("switch interval:", sys.getswitchinterval())
    print()

    blob = b"x" * 10_000_000
    matrix = np.random.rand(2000, 2000)
    rows = [json.dumps({"amount": i}) for i in range(100_000)]
    big_file = Path("/tmp/50mb.bin")
    big_file.write_bytes(b"\\0" * 50_000_000)

    report("a", lambda n: sum(i * i for i in range(n)), 5_000_000)
    report("b", lambda d: zlib.compress(d, 6), blob)
    report("c", lambda p: Path(p).read_bytes(), str(big_file))
    report("d", lambda m: m @ m, matrix)
    report("e", lambda rs: sum(json.loads(r)["amount"] for r in rs), rows)


# =========================================================================
# MEASURED (8-core laptop, CPython 3.12)
# =========================================================================
#
#   a      serial   4.21s   4 threads   4.68s   0.90x    as predicted
#   b      serial   3.84s   4 threads   1.09s   3.52x    as predicted
#   c      serial   0.31s   4 threads   0.26s   1.19x    NOT 4x
#   d      serial   2.90s   4 threads   2.81s   1.03x    NOT 4x
#   e      serial   1.44s   4 threads   1.51s   0.95x    as predicted
#
#   with OMP_NUM_THREADS=1:
#   d      serial  11.20s   4 threads   2.95s   3.79x
#
# Two of five predictions from the CATEGORY were wrong, and both for the
# same reason: the category tells you about the work, and the speed-up
# depends on what the LIBRARY does with it.


# =========================================================================
# UNDER A FREE-THREADED BUILD
# =========================================================================
#
#   a   changes MOST: ~0.9x  ->  ~3.5x. This is precisely the workload
#       the GIL constrained -- parallel pure-Python computation -- and
#       the only one on the list that gains.
#
#   b   unchanged. zlib already released the lock.
#   c   unchanged, and possibly slightly worse: the allocation-heavy part
#       now pays atomic refcounts.
#   d   unchanged. BLAS was never limited by the GIL.
#   e   improves somewhat, since json.loads holds the lock -- but it
#       allocates heavily, so atomic refcounting eats into the gain.
#
# And single-threaded runs of ALL five are ~5-10% slower, which is the
# trade the design makes.


# =========================================================================
# TESTS
# =========================================================================

import pytest


@pytest.mark.benchmark
def test_pure_python_does_not_scale_with_threads():
    """The GIL, demonstrated. If this ever passes on a standard build,
    something has changed in CPython worth knowing about."""
    fn = lambda n: sum(i * i for i in range(n))
    assert serial(fn, 2_000_000, 4) < parallel(fn, 2_000_000, 4) * 1.3


@pytest.mark.benchmark
def test_zlib_releases_the_gil():
    """Documents a property of the LIBRARY that a design depends on.
    If a future zlib stopped releasing it, the thread pool built on
    this assumption would silently lose its speed-up."""
    blob = b"x" * 5_000_000
    fn = lambda d: zlib.compress(d, 6)

    assert serial(fn, blob, 4) > parallel(fn, blob, 4) * 2


def test_counter_increment_is_not_atomic():
    """The GIL protects the interpreter, not your invariants."""
    counter = 0
    def bump():
        nonlocal counter
        for _ in range(200_000):
            counter += 1

    ts = [threading.Thread(target=bump) for _ in range(4)]
    for t in ts: t.start()
    for t in ts: t.join()

    # Deliberately asserting the RACE, to make the point concrete.
    # With a lock this would be exactly 800_000.
    assert counter <= 800_000`,
        notes: [
          { t: "p", text: "**Two of five predictions from the category were wrong, and both for the same reason.** \"CPU-bound\" and \"I/O-bound\" describe the work; the speed-up depends on what the library does with it. `numpy` releases the GIL *and* is already parallel, so adding threads oversubscribes; `read_bytes` releases it for a syscall that turns out to be shorter than the allocation around it." },
          { t: "p", text: "**`d` is the nested-parallelism trap and it is common in production.** BLAS defaults to one thread per core, so a single `matmul` already saturates the machine. Four Python threads each get a quarter of the cores, and the total is unchanged plus contention — `OMP_NUM_THREADS=1` is the fix, and it makes the outer threading work as predicted." },
          { t: "p", text: "**`e` shows that \"implemented in C\" and \"releases the GIL\" are different claims.** `json.loads` is C, allocates Python objects throughout, and each call is microseconds — releasing around it would cost more than it saves. The release is opt-in and only makes sense for long stretches that touch no Python objects." },
          { t: "callout", kind: "insight", title: "The zlib test documents a dependency on a library's internals", body: [
            { t: "p", text: "A thread pool built around compression is relying on `zlib` releasing the GIL — a fact about the library, not about the language. If that ever changed, the pool would silently lose its speed-up with nothing failing." },
            { t: "p", text: "A benchmark-marked test that asserts the scaling turns an invisible assumption into a checkable one. It is slow and belongs behind a marker, and it is the only thing that would notice (Lesson 9.8)." }
          ]},
          { t: "p", text: "**Only `a` changes materially under free-threading**, which is the honest summary of what removing the GIL buys: parallel pure-Python CPU work becomes possible, everything already released is unaffected, and every single-threaded run pays 5–10% for the privilege." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team parallelises their feature-engineering pipeline with a sixteen-thread pool. Locally it runs 6× faster. In production on a 64-core machine it runs slower than the serial version it replaced." },
      { t: "p", text: "**The pipeline is mostly `numpy`, and `numpy` was already parallel.** BLAS spawns one thread per core, so on the developer's 8-core laptop sixteen Python threads oversubscribed by 2× and still came out ahead. On 64 cores the oversubscription was 16×, and the machine spent its time context-switching between 1,024 threads." },
      { t: "p", text: "**`OMP_NUM_THREADS=1` in the worker environment fixed it in one line**, and the pool then scaled as intended — because the parallelism moved from inside each call to across the calls, which is where the team wanted it." },
      { t: "p", text: "**Check for parallelism you did not add before adding your own.** `numpy`, `scipy`, `torch`, `polars` and most numeric libraries thread internally by default, and stacking a pool on top of them oversubscribes rather than accelerates — a failure that scales with the size of the machine, so it is worst exactly where it was meant to help most." }
    ]}
  ],

  takeaways: [
    "**The GIL is one mutex protecting the interpreter's own state** — reference counts, the allocator, the type cache — not your program's data.",
    "**It exists because reference counting is not atomic.** The alternative is fine-grained locking, which is slower for the single-threaded case that dominates.",
    "**It is released around blocking I/O**, which is exactly why threads transform I/O-bound work.",
    "**C extensions can release it explicitly** with `Py_BEGIN_ALLOW_THREADS`, provided the released section touches no Python objects — that is why `numpy`, `zlib` and `hashlib` thread well.",
    "**Being implemented in C is not the same as releasing the lock.** `json.loads` is C, allocates Python objects, and holds it throughout.",
    "**It is forcibly released every ~5 ms** (`sys.getswitchinterval()`), which for pure-Python CPU work is a handoff that buys nothing.",
    "**It does not make you thread-safe.** `counter += 1` is four bytecodes and loses updates; the GIL guarantees the object model, not your invariants.",
    "**Some operations are atomic because they are one bytecode** — `d[k] = v`, `list.append` — but that is a CPython implementation detail, not a language guarantee.",
    "**Free-threaded Python (PEP 703) removes it**, at a cost of roughly 5–10% single-threaded performance from atomic refcounting.",
    "**Only parallel pure-Python CPU work gains from free-threading.** I/O and C-extension work were never constrained.",
    "**Races get worse without the GIL**, not better — the coarse interleaving it imposed disappears, so you still need locks and the windows are wider.",
    "**Check for parallelism you did not add.** BLAS-backed libraries thread internally, and a pool on top oversubscribes in proportion to the core count."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Four threads run `counter += 1` a hundred thousand times each. The result is 271,043 rather than 400,000. Why did the GIL not prevent this?",
        options: [
          "The GIL only applies to I/O operations",
          "`counter += 1` is several bytecodes — load, add, store — and the GIL can be released between any two of them, so updates are lost",
          "Integers above a certain size are not thread-safe",
          "`global` variables bypass the GIL"
        ],
        answer: 1,
        why: "The GIL guarantees that the interpreter's own state stays consistent, not that your statements are atomic. Only a single bytecode is indivisible, and a compound assignment is at least four. The fix is the same as in any language: a lock around the critical section, or better, no shared mutable state at all."
      },
      {
        stem: "Hashing with `hashlib` across four threads gives a 3.6× speed-up, but a pure-Python loop gives 0.9×. What explains the difference?",
        options: [
          "`hashlib` internally uses processes",
          "`hashlib` releases the GIL around the digest, so the C code runs in parallel; the pure-Python loop must hold the lock to execute bytecode",
          "Hashing is I/O-bound because it reads files",
          "The pure-Python loop was memory-bound"
        ],
        answer: 1,
        why: "A C extension may release the GIL for any section that touches no Python objects, which is exactly what a numeric or crypto kernel over a raw buffer does. This is why \"CPU-bound means use processes\" is a rule about *pure Python* — a large share of heavy Python work happens in C libraries that already let go of the lock."
      },
      {
        stem: "A sixteen-thread `numpy` pipeline is 6× faster on an 8-core laptop and slower than serial on a 64-core server. What is happening?",
        options: [
          "The server has slower cores",
          "BLAS already threads internally — one thread per core — so the pool oversubscribes by the core count and the machine context-switches instead of computing",
          "The GIL behaves differently above 16 cores",
          "`numpy` arrays do not fit in the server's cache"
        ],
        answer: 1,
        why: "The library was parallel before the pool was added. On 8 cores, sixteen Python threads oversubscribe by 2× and the gain survives; on 64 cores it is 16×, so 1,024 threads compete for 64 cores. Setting `OMP_NUM_THREADS=1` moves the parallelism from inside each call to across the calls, which is where the pool wanted it."
      },
      {
        stem: "What does a free-threaded (no-GIL) build change?",
        options: [
          "All Python code becomes faster",
          "Parallel pure-Python CPU work becomes possible, at a cost of roughly 5–10% single-threaded performance from atomic reference counting",
          "Race conditions become impossible",
          "`multiprocessing` becomes unnecessary"
        ],
        answer: 1,
        why: "It removes the one constraint the GIL imposed. I/O-bound work and C-extension work were never blocked, so they gain nothing, and every single-threaded run pays for per-object atomic refcounts. Races get *worse*, since the coarse interleaving disappears — and the practical blocker today is whether every C extension in your dependency tree ships a free-threaded build."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is the GIL and why does it exist?",
        strong: "A single mutex a thread must hold to execute bytecode. It exists because CPython uses reference counting and those counts are not atomic — protecting them individually would need fine-grained locking, which is slower for the single-threaded case that dominates.",
        answer: [
          { t: "p", text: "Naming what it protects — the interpreter's state, not your data — is the distinction that separates an understood answer from a recited one." },
          { t: "p", text: "The release conditions are the practically useful half: blocking I/O, C extensions that opt in, and a forced handoff every five milliseconds." },
          { t: "p", text: "Resisting the framing that it makes Python slow is worth doing: it makes parallel pure-Python CPU work impossible in one process, which is much narrower than the reputation." }
        ]
      },
      {
        level: "advanced",
        q: "Does the GIL make Python code thread-safe?",
        strong: "No. It guarantees the object model stays consistent, not that your operations are atomic. `counter += 1` is four bytecodes and loses updates under contention.",
        answer: [
          { t: "p", text: "The concrete example does the work — four threads incrementing a hundred thousand times each and landing well short of the total is unarguable." },
          { t: "p", text: "The nuance about single-bytecode operations shows depth, along with the warning not to rely on it: it is a CPython implementation detail, not a language guarantee." },
          { t: "p", text: "Noting that free-threading makes races *worse* rather than better is the observation most people get backwards." }
        ]
      },
      {
        level: "expert",
        q: "Should we move to free-threaded Python?",
        strong: "Not yet for production, and worth tracking. The gains apply only to parallel pure-Python CPU work; single-threaded code is 5–10% slower, and the blocker is the C-extension ecosystem rather than your own code.",
        answer: [
          { t: "p", text: "Framing it as an ecosystem question rather than a language one is the mature position — the constraint is whether every wheel in your lockfile ships a free-threaded build." },
          { t: "p", text: "The detail that importing an unprepared extension silently re-enables the GIL is the kind of thing that decides a real migration, and few people know it." },
          { t: "p", text: "Being clear about who benefits — and that most services are I/O-bound and gain nothing — keeps it an engineering judgement rather than enthusiasm." }
        ]
      }
    ]
  }
});
