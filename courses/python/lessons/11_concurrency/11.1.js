/* ============================================================================
   LESSON 11.1 — Concurrency vs Parallelism, I/O vs CPU
   ========================================================================= */
EC.receiveLesson({
  id: "11.1",

  lede: "Two distinctions decide every concurrency question you will ever face, and they are frequently confused with each other. **Concurrency is dealing with many things at once; parallelism is doing many things at once.** Which one you need depends entirely on whether your program is waiting or working — and measuring that takes about a minute.",

  objectives: [
    "State the difference between concurrency and parallelism precisely",
    "Classify a workload as I/O-bound or CPU-bound with a measurement",
    "Predict which approach helps a given workload, and why the other does not",
    "Explain why threads speed up one and not the other in CPython",
    "Recognise a mixed workload and the trap it sets"
  ],

  prerequisites: ["10.2"],

  blocks: [

    { t: "h2", n: "01", text: "The two distinctions", id: "distinctions" },

    {"kind": "matrix", "title": "Which model for which workload", "caption": "I/O-bound work waits; threads and asyncio overlap the waiting. CPU-bound work computes; only processes (or free-threaded Python) use a second core, because of the GIL.", "rows": ["threads", "asyncio", "multiprocessing"], "cols": ["I/O-bound", "CPU-bound"], "cells": [[{"text": "good — GIL released while waiting", "tone": "good"}, {"text": "no speed-up", "tone": "crit"}], [{"text": "best at scale — one thread, thousands of tasks", "tone": "good"}, {"text": "blocks the loop", "tone": "crit"}], [{"text": "works, heavy", "tone": "warn"}, {"text": "true parallelism", "tone": "good"}]], "t": "diagram", "id": "dg-11_1-01-0"},

    { t: "viz",
      title: "Concurrency is structure; parallelism is execution",
      caption: "A single core can be concurrent — it interleaves tasks, making progress on several by switching whenever one waits. Only more than one core can be parallel. Concurrency is a way of writing a program; parallelism is a property of how it runs.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Timeline diagram comparing sequential, concurrent on one core, and parallel across two cores">
  <text x="14" y="26" class="s-label">SEQUENTIAL — one core, no overlap</text>
  <g class="s-mono" style="font-size:9px">
    <rect x="14" y="38" width="90" height="20" rx="3" style="fill:var(--accent)" opacity=".85"/><text x="24" y="52" style="fill:#06122b">work A</text>
    <rect x="106" y="38" width="150" height="20" rx="3" style="fill:var(--border-strong)"/><text x="116" y="52" class="s-sub">wait A</text>
    <rect x="258" y="38" width="90" height="20" rx="3" style="fill:var(--accent)" opacity=".85"/><text x="268" y="52" style="fill:#06122b">work B</text>
    <rect x="350" y="38" width="150" height="20" rx="3" style="fill:var(--border-strong)"/><text x="360" y="52" class="s-sub">wait B</text>
  </g>
  <text x="512" y="53" class="s-mono" style="font-size:10px;fill:var(--crit)">480 ms</text>

  <text x="14" y="102" class="s-label">CONCURRENT — one core, overlapped waiting</text>
  <g class="s-mono" style="font-size:9px">
    <rect x="14" y="114" width="90" height="20" rx="3" style="fill:var(--accent)" opacity=".85"/><text x="24" y="128" style="fill:#06122b">work A</text>
    <rect x="106" y="114" width="90" height="20" rx="3" style="fill:var(--accent)" opacity=".85"/><text x="116" y="128" style="fill:#06122b">work B</text>
    <rect x="198" y="114" width="150" height="20" rx="3" style="fill:var(--border-strong)"/><text x="208" y="128" class="s-sub">both waiting</text>
  </g>
  <text x="360" y="129" class="s-mono" style="font-size:10px;fill:var(--good)">330 ms</text>
  <text x="440" y="129" class="s-sub">the waits happen at the same time</text>

  <text x="14" y="178" class="s-label">PARALLEL — two cores, overlapped work</text>
  <g class="s-mono" style="font-size:9px">
    <text x="14" y="200" class="s-sub">core 1</text>
    <rect x="70" y="188" width="90" height="20" rx="3" style="fill:var(--good)" opacity=".9"/><text x="80" y="202" style="fill:#06231a">work A</text>
    <text x="14" y="226" class="s-sub">core 2</text>
    <rect x="70" y="214" width="90" height="20" rx="3" style="fill:var(--good)" opacity=".9"/><text x="80" y="228" style="fill:#06231a">work B</text>
  </g>
  <text x="172" y="215" class="s-mono" style="font-size:10px;fill:var(--good)">90 ms</text>
  <text x="252" y="215" class="s-sub">the WORK happens at the same time</text>

  <line x1="14" y1="256" x2="886" y2="256" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="14" y="282" class="s-sub">Concurrency removes <b>waiting</b>. It needs one core and helps when the program is blocked on something else.</text>
  <text x="14" y="306" class="s-sub">Parallelism removes <b>working</b>. It needs many cores and helps when the program is computing.</text>
</svg>`
    },

    { t: "table",
      head: ["", "Concurrency", "Parallelism"],
      rows: [
        ["Is", "A way of structuring a program", "A way of executing it"],
        ["Needs", "One core", "**More than one core**"],
        ["Removes", "Time spent waiting", "Time spent computing"],
        ["Helps", "**I/O-bound** work", "**CPU-bound** work"],
        ["In Python", "`asyncio`, threads", "`multiprocessing`, native code"],
        ["Limited by", "How many waits can overlap", "How many cores you have"]
      ],
      caption: "**The two are independent.** A concurrent program may run on one core; a parallel one may be written without any concurrency constructs at all. Conflating them is what produces threads added to a CPU-bound loop, which makes it slower."
    },

    { t: "h2", n: "02", text: "Which one are you?", id: "classify" },

    { t: "code", lang: "python", title: "the measurement takes a minute", code: `
import time


def classify(fn, *args, **kwargs) -> str:
    """Wall-clock time is what a user experiences. CPU time is what the
    process actually computed. The gap between them is waiting."""
    wall_start = time.perf_counter()
    cpu_start = time.process_time()

    fn(*args, **kwargs)

    wall = time.perf_counter() - wall_start
    cpu = time.process_time() - cpu_start
    ratio = cpu / wall

    print(f"wall {wall:.2f}s   cpu {cpu:.2f}s   cpu/wall {ratio:.0%}")
    return "CPU-bound" if ratio > 0.7 else "I/O-bound"


print(classify(download_reports, urls))
print(classify(resize_images, paths))
`,
      out: `wall 8.40s   cpu 0.21s   cpu/wall 2%       -> I/O-bound
wall 8.10s   cpu 7.95s   cpu/wall 98%      -> CPU-bound`,
      caption: "**`cpu / wall` is the whole diagnostic.** Near zero means the process is asleep waiting for something else; near one means it is computing. Anything in between is mixed, and that is where the traps are."
    },

    { t: "callout", kind: "insight", title: "What each looks like in practice", body: [
      { t: "table",
        head: ["I/O-bound — the process waits", "CPU-bound — the process computes"],
        rows: [
          ["HTTP requests to an API", "Parsing and transforming in a loop"],
          ["Database queries", "Image or video processing"],
          ["Reading and writing files", "Compression, encryption, hashing"],
          ["Waiting on a queue or a lock", "Numeric work, model inference"],
          ["Calling another service", "Serialising a large structure"],
          ["**Most web application code**", "**Most data pipeline inner loops**"]
        ]
      },
      { t: "p", text: "**Most application code is I/O-bound and most people assume it is not.** A request handler that makes two queries and calls one API spends over 95% of its time waiting, which is why `asyncio` and threads help so much there and `multiprocessing` helps so little." },
      { t: "p", text: "The reverse mistake is rarer but more expensive: reaching for `asyncio` on a CPU-bound loop, where it adds machinery and cannot help at all, because there is no waiting to overlap." }
    ]},

    { t: "h2", n: "03", text: "The benchmark that makes it concrete", id: "benchmark" },

    {"kind": "timeline", "title": "Concurrency versus parallelism", "caption": "Two I/O tasks on one core interleave their waits and finish in about the time of one. Two CPU tasks on one core just take turns; they need two cores to finish sooner.", "span": 8, "tick": 2, "lanes": [{"label": "I/O, 1 thread", "tone": "crit", "bars": [[0, 4, "wait A"], [4, 8, "wait B"]]}, {"label": "I/O, 2 threads", "tone": "good", "bars": [[0, 4, "wait A"], [0.2, 4.2, "wait B"]]}, {"label": "CPU, 2 threads, 1 core", "tone": "warn", "bars": [[0, 1, "A"], [1, 2, "B"], [2, 3, "A"], [3, 4, "B"], [4, 5, "A"], [5, 6, "B"], [6, 7, "A"], [7, 8, "B"]]}, {"label": "CPU, 2 processes", "tone": "good", "bars": [[0, 4, "A on core 1"], [0, 4, "B on core 2"]]}], "t": "diagram", "id": "dg-11_1-03-1"},

    { t: "code", lang: "python", title: "the same three approaches, two workloads", code: `
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

import requests


def io_task(url: str) -> int:
    return len(requests.get(url, timeout=10).content)


def cpu_task(n: int) -> int:
    return sum(i * i for i in range(n))


def run(fn, items, mode: str) -> float:
    start = time.perf_counter()
    if mode == "serial":
        [fn(i) for i in items]
    elif mode == "threads":
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(fn, items))
    else:
        with ProcessPoolExecutor(max_workers=8) as pool:
            list(pool.map(fn, items))
    return time.perf_counter() - start
`,
      out: `I/O-bound — 40 HTTP requests
  serial      8.42 s
  threads     1.18 s     7.1x     <- concurrency removes the waiting
  processes   1.402 s    6.0x     <- also works, at much higher cost

CPU-bound — 8 x sum of squares to 10 million
  serial      6.10 s
  threads     6.44 s     0.95x    <- SLOWER. The GIL, plus switching
  processes   0.92 s     6.6x     <- parallelism removes the computing`,
      hl: [22, 25],
      caption: "**The two middle rows are the lesson.** Threads give a sevenfold speed-up on I/O and make CPU work slightly slower. Processes help both, but pay a startup and serialisation cost that only the CPU case justifies."
    },

    { t: "callout", kind: "trap", title: "Why threads make CPU-bound work slower", body: [
      { t: "p", text: "In CPython a thread must hold the **global interpreter lock** to execute bytecode, so only one thread runs Python at a time. Adding threads to a CPU-bound loop does not add throughput — it adds contention for a lock, plus a context switch every few milliseconds." },
      { t: "code", lang: "python", title: "where the extra 5% goes", numbered: false, code: `
import sys

# Every ~5 ms, a thread holding the GIL is asked to drop it so another
# can run. On CPU-bound work that switch buys nothing and costs a
# handoff — which is why 8 threads are marginally SLOWER than 1.
print(sys.getswitchinterval())          # 0.005`,
        out: `0.005`},
      { t: "p", text: "**The GIL is released around I/O**, which is exactly why threads work for the first benchmark: a thread waiting on a socket is not holding the lock, so the others run. It is also released inside many C extensions — `numpy`, compression, hashing — which is why some \"CPU-bound\" work does thread well (Lesson 11.2)." },
      { t: "p", text: "Free-threaded builds from Python 3.13 remove the GIL and change this picture. They are not yet the default, and the trade-offs are the subject of the next lesson." }
    ]},

    { t: "h2", n: "04", text: "The mixed workload", id: "mixed" },

    { t: "ladder",
      title: "A pipeline that downloads images and resizes them",
      rungs: [
        { level: "bad", label: "Pick one and apply it to everything",
          why: "Threads make the downloads fast and leave the resizing serialised behind the GIL. Processes make the resizing fast and pay a process boundary for every download, which was only ever waiting.",
          code: `# threads everywhere: downloads 8x faster, resize unchanged
with ThreadPoolExecutor(8) as pool:
    list(pool.map(download_and_resize, urls))

# processes everywhere: resize 6x faster, downloads pay pickling
with ProcessPoolExecutor(8) as pool:
    list(pool.map(download_and_resize, urls))` },
        { level: "ok", label: "Measure first, then pick the dominant one",
          why: "If downloading is 90% of the time, threads are the right single answer and the resize is noise. This is often correct and always cheap — but it leaves the smaller half unimproved.",
          code: `# Measured: 7.6 s downloading, 0.9 s resizing.
# Downloads dominate, so optimise those and stop.
with ThreadPoolExecutor(16) as pool:
    list(pool.map(download_and_resize, urls))` },
        { level: "best", label: "Split the stages and match each",
          why: "Each stage gets the model that fits it: threads overlap the waiting, processes parallelise the computing, and a queue between them means neither blocks the other.",
          code: `from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor


def process_all(urls: list[str]) -> list[Path]:
    # Stage 1 — I/O-bound. Many threads, cheap to create.
    with ThreadPoolExecutor(max_workers=32) as io_pool:
        images = list(io_pool.map(download, urls))

    # Stage 2 — CPU-bound. One process per core, no more.
    with ProcessPoolExecutor(max_workers=os.cpu_count()) as cpu_pool:
        return list(cpu_pool.map(resize, images))`,
          note: "**Worker counts differ by an order of magnitude for a reason.** Threads are waiting, so 32 is reasonable; processes are computing, so more than one per core just adds switching (Lesson 11.5)." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "How many workers", body: [
      { t: "table",
        head: ["Workload", "Rule of thumb", "Bounded by"],
        rows: [
          ["CPU-bound processes", "`os.cpu_count()`", "Cores. More is pure overhead"],
          ["I/O-bound threads", "Tens — 20 to 100", "The remote service's limits, and memory per thread"],
          ["`asyncio` tasks", "Thousands", "Memory, and what the other end tolerates"],
          ["Mixed", "Split the stages", "Each stage separately"]
        ]
      },
      { t: "p", text: "**The ceiling on I/O concurrency is usually someone else's rate limit, not your machine.** Thirty-two threads hammering an API that allows ten requests per second produces errors rather than throughput, which is what semaphores are for (Lesson 11.7)." },
      { t: "p", text: "**A thread costs roughly 8 MB of stack address space** and a real kernel object; an `asyncio` task costs a few kilobytes. That is why the scale differs by two orders of magnitude, and why 10,000 concurrent connections is an `asyncio` problem rather than a threading one." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Classify four workloads and predict the outcome",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "For each workload below: classify it, predict what threads and processes would do, and say what you would actually build. Then write the measurement that would prove you right." },
        { t: "code", lang: "python", title: "the four", numbered: false, code: `
# A — fetch 500 product pages and extract a price from each
def scrape(url):
    html = requests.get(url, timeout=10).text
    return re.search(r'"price":([\\d.]+)', html).group(1)

# B — hash 10,000 files to detect duplicates
def fingerprint(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

# C — for each of 200 orders, call the tax API then compute a total
def settle(order):
    rate = tax_api.get_rate(order.region)          # ~120 ms
    return sum(l.price * rate for l in order.lines)  # ~0.2 ms

# D — parse 50,000 JSON lines and aggregate by customer
def aggregate(lines):
    totals = defaultdict(Decimal)
    for line in lines:
        row = json.loads(line)
        totals[row["customer"]] += Decimal(row["amount"])
    return totals`},
        { t: "p", text: "One of the four has an answer that is neither threads nor processes." }
      ],
      requirements: [
        "Classify each as I/O-bound, CPU-bound or mixed, with the reason.",
        "Predict the speed-up from threads and from processes for each.",
        "Identify the one where the best answer is neither, and say what it is.",
        "Note where `hashlib` and `json` change the GIL analysis.",
        "Give the `cpu/wall` measurement that confirms each classification.",
        "**Say which one would get slower with processes, and why.**"
      ],
      hint: "Two of these call into C libraries that release the GIL. And for D, ask what the actual cost is before assuming it needs concurrency at all.",
      solution: {
        lang: "python",
        title: "assessment.py",
        code: `# =========================================================================
# A — SCRAPE 500 PAGES                                        I/O-BOUND
# =========================================================================
#
#   cpu/wall  ~2%      500 x ~180 ms network, ~1 ms of regex each
#
#   threads     ~15-30x    the waiting overlaps
#   processes   ~15x       works, but each worker is a full interpreter
#                          and the HTML has to be pickled back
#   asyncio     ~30x+      thousands of connections for kilobytes each
#
# BUILD: asyncio with httpx, or 32 threads if the codebase is sync.
# The real ceiling is the site's rate limit, not the machine -- 500
# concurrent requests to one host gets you blocked, so a semaphore
# matters more than the worker count (Lesson 11.7).

def measure_a():
    """cpu/wall near zero confirms it: the process is asleep."""
    return classify(lambda: [scrape(u) for u in urls[:20]])


# =========================================================================
# B — HASH 10,000 FILES                              MIXED, AND SURPRISING
# =========================================================================
#
#   cpu/wall  ~55%     read_bytes() waits on disk; sha256 computes
#
# This is the one where the GIL analysis changes. hashlib RELEASES the
# GIL around the digest for inputs over a few kilobytes, so:
#
#   threads     ~4-6x     BOTH halves overlap -- the disk reads AND the
#                         hashing, because the C code is not holding the
#                         lock while it works
#   processes   ~6x       marginally better on the CPU half, worse on
#                         startup and on shipping file contents around
#
# BUILD: threads. The usual "CPU-bound means processes" rule does not
# apply, because the CPU work happens in a C extension that lets go of
# the GIL. The same is true of numpy, zlib, and most compression and
# crypto libraries (Lesson 11.2).

def measure_b():
    """~55% is the tell for mixed. Then verify the GIL claim directly:
    if threads scale, the C code is releasing it."""
    serial = time_it(lambda: [fingerprint(p) for p in paths[:200]])
    threaded = time_it(lambda: thread_map(fingerprint, paths[:200], 8))
    assert threaded < serial * 0.4, "hashlib is not releasing the GIL here"


# =========================================================================
# C — 200 ORDERS: TAX API THEN A TOTAL                        I/O-BOUND
# =========================================================================
#
#   120 ms waiting vs 0.2 ms computing  =  99.8% waiting
#   cpu/wall  ~0.2%
#
#   threads     ~20x     limited by the API's concurrency allowance
#   processes   ~20x     same benefit, ~50 ms startup each, and the
#                        order objects must pickle
#
# BUILD: threads or asyncio -- but FIRST ask whether the API has a batch
# endpoint. 200 calls for 200 regions when there are perhaps 12 distinct
# regions is the real bug:
#
#   rates = {r: tax_api.get_rate(r) for r in {o.region for o in orders}}
#
# That is 12 calls instead of 200, and it needs no concurrency at all.
# Removing the work beats overlapping it (Lesson 10.5).

def measure_c():
    """Count the DISTINCT regions before adding any concurrency."""
    print(len(orders), "orders", len({o.region for o in orders}), "regions")


# =========================================================================
# D — PARSE 50,000 JSON LINES                    CPU-BOUND, AND THE ANSWER
#                                                IS NEITHER
# =========================================================================
#
#   cpu/wall  ~99%     pure computation once the file is read
#
#   threads     ~1x     json.loads holds the GIL for short inputs; no gain
#   processes   ~0.4x   SLOWER -- see below
#
# WHY PROCESSES MAKE IT SLOWER:
#
#   The work per item is ~30 us. The cost of shipping an item to a worker
#   and a Decimal back is ~80 us of pickling plus IPC. The boundary costs
#   more than the work, so 8 processes finish later than 1.
#
#   Chunking fixes the ratio -- send 5,000 lines per task, not one -- but
#   then the aggregation has to be merged, and the whole thing is ~1.2 s
#   of work. The machinery costs more than it saves.
#
# BUILD: neither. 50,000 lines at ~30 us is 1.5 seconds; the honest
# answers, in order:
#
#   1. orjson instead of json          ~3x, one import          -> 0.5 s
#   2. stream it, do not hold it       constant memory (Lesson 10.3)
#   3. if it must be faster, chunk across processes -- but only once
#      the file is large enough that the boundary cost is noise
#
# This is the workload where the right answer is "it is already fast
# enough, and a faster parser is one line".

def measure_d():
    """Time it before designing for it. 1.5 s is not a concurrency
    problem."""
    return classify(lambda: aggregate(lines))


# =========================================================================
# SUMMARY
# =========================================================================
#
#   workload  class      threads   processes   build
#   --------  ---------  --------  ----------  -------------------------
#   A         I/O        ~20x      ~15x        asyncio, with a semaphore
#   B         mixed      ~5x       ~6x         threads (hashlib frees GIL)
#   C         I/O        ~20x      ~20x        DEDUPLICATE first, then threads
#   D         CPU        ~1x       ~0.4x       neither -- swap the parser
#
# The two general lessons:
#
#   1. "CPU-bound means processes" is a heuristic, not a rule. B is CPU
#      work that threads beautifully because the computation happens in
#      C with the GIL released.
#
#   2. Two of the four are better served by doing LESS work than by
#      doing work concurrently. Deduplicating C's API calls and swapping
#      D's parser are both larger wins than any concurrency model, and
#      both are one line.


# =========================================================================
# THE MEASUREMENT HARNESS
# =========================================================================

import time
from concurrent.futures import ThreadPoolExecutor


def classify(fn) -> str:
    wall0, cpu0 = time.perf_counter(), time.process_time()
    fn()
    wall = time.perf_counter() - wall0
    cpu = time.process_time() - cpu0
    ratio = cpu / wall if wall else 0

    kind = ("CPU-bound" if ratio > 0.7
            else "I/O-bound" if ratio < 0.3
            else "mixed")
    print(f"wall {wall:6.2f}s  cpu {cpu:6.2f}s  cpu/wall {ratio:5.0%}  {kind}")
    return kind


def time_it(fn) -> float:
    start = time.perf_counter()
    fn()
    return time.perf_counter() - start


def thread_map(fn, items, workers):
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(fn, items))


# The test that pins the classification, so a future change that makes a
# workload CPU-bound fails loudly rather than quietly losing its speed-up.
def test_scrape_is_io_bound():
    assert classify(lambda: [scrape(u) for u in urls[:20]]) == "I/O-bound"


def test_aggregate_is_cpu_bound():
    assert classify(lambda: aggregate(lines[:5000])) == "CPU-bound"`,
        notes: [
          { t: "p", text: "**B is the workload that breaks the rule everyone learns.** It is genuinely CPU-heavy and threads beautifully, because `hashlib` releases the GIL around the digest. The same applies to `numpy`, `zlib`, image libraries and most crypto — so \"CPU-bound means processes\" is a heuristic about *pure Python* computation, not about computation in general (Lesson 11.2)." },
          { t: "p", text: "**D gets slower with processes**, which is the most useful negative result here. At 30 µs of work per item against roughly 80 µs of pickling and IPC, the boundary costs more than the work. Chunking fixes the ratio but the total is only 1.5 seconds, so the machinery costs more than it saves." },
          { t: "p", text: "**Two of the four are better solved by doing less work.** C makes 200 API calls for perhaps 12 distinct regions — deduplicating is one line and beats any concurrency model. D swaps `json` for `orjson` and gets 3× for an import. Overlapping work is what you do after you have stopped doing unnecessary work (Lesson 10.5)." },
          { t: "callout", kind: "insight", title: "The classification test is worth keeping", body: [
            { t: "p", text: "`assert classify(...) == \"I/O-bound\"` pins an assumption the whole design rests on. If someone later adds expensive parsing inside the scrape loop, the workload becomes mixed and the thread pool quietly stops helping — with nothing to indicate why." },
            { t: "p", text: "It is a slow test and belongs behind a marker, but it is the only thing that notices a design assumption going stale (Lesson 9.8)." }
          ]},
          { t: "p", text: "**`cpu / wall` is the entire diagnostic and takes a minute to run.** Almost every wrong concurrency decision traces back to nobody having computed it — the workload was assumed to be CPU-bound because it felt like work, or assumed to be I/O-bound because it touched a network." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's data import is slow, so they add a `ThreadPoolExecutor` with sixteen workers around the row-processing loop. It gets 4% slower. They conclude that Python threading is useless and start planning a rewrite in Go." },
      { t: "p", text: "**The loop was pure-Python parsing and arithmetic — CPU-bound.** Sixteen threads contended for the GIL and added a context switch every five milliseconds, which is exactly the 4%. Nothing about the result was surprising once anyone measured `cpu/wall`, and nobody had." },
      { t: "p", text: "**The same pool around the *fetch* step gave 12×.** The import had two stages: pulling files from object storage, which was 80% of the wall time and pure waiting, and parsing them, which was the rest. Threads were the right tool applied to the wrong stage." },
      { t: "p", text: "**Measure before choosing, and measure per stage.** One number — `cpu / wall` — separates the two cases, and a mixed workload needs the stages split so each gets the model that fits it. The rewrite would have been four months to solve a problem that a thread pool moved one function call up the file." }
    ]}
  ],

  takeaways: [
    "**Concurrency is dealing with many things at once; parallelism is doing many things at once.** The first is a way of structuring a program, the second a property of how it executes.",
    "**Concurrency removes waiting and needs one core. Parallelism removes computing and needs many.** Which you need depends entirely on which your program is doing.",
    "**`cpu / wall` classifies a workload in about a minute.** Near zero is I/O-bound, near one is CPU-bound, and in between is mixed.",
    "**Most application code is I/O-bound**, which is why threads and `asyncio` help web services so much and `multiprocessing` helps them so little.",
    "**Threads make pure-Python CPU work slightly slower**, because only one thread holds the GIL and the switching costs a handoff every few milliseconds.",
    "**But CPU work inside a C extension threads well** — `hashlib`, `numpy`, `zlib` and most crypto release the GIL, so \"CPU-bound means processes\" is a heuristic about pure Python.",
    "**Processes can be slower than serial** when the work per item costs less than pickling it across the boundary. Chunk, or do not use them.",
    "**Worker counts differ by an order of magnitude**: one process per core, tens of threads, thousands of `asyncio` tasks.",
    "**The ceiling on I/O concurrency is usually someone else's rate limit**, not your machine — thirty-two threads against a ten-per-second API produces errors, not throughput.",
    "**A mixed workload needs its stages split**, each matched to its own model, with a boundary between them.",
    "**Doing less work beats doing work concurrently.** Deduplicating calls or swapping a parser is often a bigger win than any concurrency model, and is one line.",
    "**Pin the classification with a test.** A design that assumes I/O-bound work stops being right the day someone adds parsing to the loop."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function reports `wall 8.40s, cpu 0.21s`. What does that tell you?",
        options: [
          "It is CPU-bound and needs more cores",
          "It is I/O-bound — 2% of the elapsed time was computing, so the rest was waiting and concurrency will help",
          "The measurement is faulty; CPU time cannot be lower than wall time",
          "The process was starved by other work on the machine"
        ],
        answer: 1,
        why: "`cpu / wall` near zero means the process spent almost all its time asleep waiting for something external — a socket, a disk, a lock. That waiting is what concurrency overlaps, so threads or `asyncio` will help substantially. `multiprocessing` would also work and would pay for a full interpreter per worker to solve a problem that was never about CPU."
      },
      {
        stem: "Adding eight threads to a pure-Python parsing loop makes it 5% slower. Why?",
        options: [
          "Thread creation dominates the runtime",
          "Only one thread can execute bytecode at a time, so there is no extra throughput — just GIL contention and a context switch every 5 ms",
          "The parser is not thread-safe",
          "The list being written to needs a lock"
        ],
        answer: 1,
        why: "In CPython a thread must hold the GIL to run bytecode. For CPU-bound pure-Python work that means no parallelism is possible, while `sys.getswitchinterval()` forces a handoff every five milliseconds that buys nothing. The same pool around an I/O stage would give a large speed-up, because a thread waiting on a socket releases the lock."
      },
      {
        stem: "Hashing 10,000 files with `hashlib` is CPU-heavy, yet threads give a 5× speed-up. Why?",
        options: [
          "The files are cached, so it is really I/O-bound",
          "`hashlib` releases the GIL around the digest, so the C code computes in parallel while other threads run Python",
          "`hashlib` uses processes internally",
          "SHA-256 is implemented in pure Python and is therefore interruptible"
        ],
        answer: 1,
        why: "The GIL only protects the interpreter, so a C extension can release it while doing work that touches no Python objects. `hashlib`, `zlib`, `numpy` and most compression and crypto libraries do exactly that. This is why \"CPU-bound means processes\" is a rule about *pure Python* computation and misleads on anything that spends its time in C."
      },
      {
        stem: "A task takes 30 µs per item. Running it across 8 processes is slower than serial. What is the explanation?",
        options: [
          "Eight processes exceed the core count",
          "Pickling each item to a worker and the result back costs more than the 30 µs of work, so the boundary dominates",
          "The GIL is shared between processes",
          "`ProcessPoolExecutor` runs tasks sequentially by default"
        ],
        answer: 1,
        why: "Every process boundary crossing serialises the argument, sends it over a pipe, and deserialises the result on the way back — on the order of tens of microseconds. When the work per item is smaller than that, more workers means more overhead. Chunking amortises it, but the better question is whether the total runtime justifies any of the machinery."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between concurrency and parallelism?",
        strong: "Concurrency is dealing with many things at once — a way of structuring a program so it can make progress on several tasks by switching whenever one waits. Parallelism is doing many things at once, which requires more than one core.",
        answer: [
          { t: "p", text: "The consequence is what makes it more than a definition: concurrency removes waiting and parallelism removes computing, so which one helps depends entirely on which your program is doing." },
          { t: "p", text: "A single-core concurrent program is the example that proves they are independent, and it is the one that makes the distinction stick." },
          { t: "p", text: "Landing on `cpu / wall` as the way to tell which case you are in turns the answer into something actionable rather than definitional." }
        ]
      },
      {
        level: "core",
        q: "How do you decide between threads, processes and asyncio?",
        strong: "Measure `cpu / wall` first. I/O-bound work takes `asyncio` for high connection counts or threads if the codebase is synchronous; CPU-bound pure-Python work takes processes. Mixed workloads get their stages split.",
        answer: [
          { t: "p", text: "The C-extension exception is the detail that shows real experience — `hashlib` and `numpy` release the GIL, so plenty of CPU-heavy work threads perfectly well." },
          { t: "p", text: "Worker counts differing by an order of magnitude — one per core, tens, thousands — shows the reasoning is about what each unit costs rather than a memorised recipe." },
          { t: "p", text: "Noting that the practical ceiling on I/O concurrency is usually the remote service's rate limit is the operational half most answers omit." }
        ]
      },
      {
        level: "advanced",
        q: "A team adds a thread pool and the code gets slower. What happened?",
        strong: "The work was CPU-bound pure Python. Only one thread can hold the GIL, so there was no throughput to gain — just lock contention and a context switch every five milliseconds.",
        answer: [
          { t: "p", text: "The constructive half matters: the same pool applied to the I/O stage of the same job often gives a large speed-up, so the tool was right and the placement was wrong." },
          { t: "p", text: "Pointing out that nobody measured `cpu / wall` first identifies the process failure rather than just the technical one." },
          { t: "p", text: "Resisting the conclusion that \"Python threading is useless\" is the judgement being tested — it is useless for exactly one case, and that case is narrower than most people think." }
        ]
      }
    ]
  }
});
