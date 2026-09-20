/* ============================================================================
   LESSON 10.2 — Profiling Before Optimising
   ========================================================================= */
EC.receiveLesson({
  id: "10.2",

  lede: "Every engineer believes they know where their code spends its time. **Measured against a profiler, that belief is wrong more often than it is right** — not slightly wrong, but pointing at a different function entirely. This lesson is about the instruments: which one answers which question, how to read their output without the two classic misreadings, and why the number you write in the pull request matters more than the change you made.",

  objectives: [
    "Choose between `timeit`, `cProfile`, a line profiler and a sampling profiler from the question you are asking",
    "Read a `cProfile` report correctly, distinguishing `tottime` from `cumtime` and knowing what each one finds",
    "Profile a live production process without restarting it or changing its code",
    "Read a flame graph, including the two things its horizontal axis does *not* mean",
    "Compute the ceiling on a proposed optimisation before spending a week on it"
  ],

  prerequisites: ["10.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Predict, then measure", id: "predict",
      sub: "Do this honestly. The gap between your guess and the profile is the point of the lesson." },

    { t: "p", text: "Here is a function that summarises a deploy log. It runs over 200,000 JSON lines and takes 3.8 seconds. Before reading on, decide which single operation you think dominates." },

    { t: "code", lang: "python", title: "summarise.py", code: `
import json
from datetime import datetime
from pathlib import Path


def summarise_deploys(path: Path) -> dict[str, int]:
    """Count deploys per service per month for 2026."""
    counts: dict[str, int] = {}

    for line in path.read_text().splitlines():
        record = json.loads(line)
        stamp = datetime.strptime(record["at"], "%Y-%m-%dT%H:%M:%S%z")
        if stamp.year != 2026:
            continue
        key = f"{record['service']}:{stamp.strftime('%Y-%m')}"
        counts[key] = counts.get(key, 0) + 1

    return counts
`,
      caption: "Most engineers pick `json.loads`, because parsing is the operation that *sounds* expensive. Some pick `read_text` on a large file. A few pick the dict update."
    },

    { t: "p", text: "The profile says something else. `json.loads` is about 16% of the runtime. **Roughly 58% is in `datetime.strptime`** — a function nobody had an opinion about, which is slow because it builds and matches a regular expression derived from your format string on every single call." },

    { t: "callout", kind: "mental", title: "Why intuition fails here specifically", body: [
      { t: "p", text: "Your intuition ranks operations by how *conceptually complicated* they are. A runtime ranks them by **how much work per call, multiplied by how many calls**. Those two orderings agree only by accident." },
      { t: "p", text: "The three things intuition systematically under-weights:" },
      { t: "ul", items: [
        "**Cheap-looking calls in a big loop.** 200,000 × 11 µs is 2.2 seconds. Nobody notices 11 µs.",
        "**Convenience functions that hide real work.** `strptime` parses a format. `str.format` walks a template. An ORM attribute access can issue a query.",
        "**Waiting.** A 200 ms network round trip is invisible in the source and dominant in the profile."
      ]},
      { t: "p", text: "And the thing intuition systematically over-weights: the loop you personally find ugly. Ugliness and cost are unrelated." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Four instruments, four questions", id: "instruments" },

    {"kind": "compare", "title": "Four instruments, four questions", "caption": "Pick the tool by the question. Each answers one thing well and the others badly.", "columns": [{"title": "timeit", "tone": "accent", "items": ["how long does this expression take?", "microbenchmarks", "repeat, take the min"]}, {"title": "cProfile", "tone": "good", "items": ["which functions eat the time?", "whole-program", "tottime vs cumtime"]}, {"title": "line_profiler", "tone": "warn", "items": ["which line in this function?", "after cProfile named it"]}, {"title": "py-spy", "tone": "violet", "items": ["what is the live process doing?", "no restart, no code change", "flame graphs"]}], "t": "diagram", "id": "dg-10_2-02-0"},

    { t: "table",
      head: ["Instrument", "Answers", "Overhead", "Use it when"],
      rows: [
        ["`timeit`", "*Is A faster than B?* — one small thing, in isolation", "none (it is the thing being timed)", "Comparing two implementations of the same function"],
        ["`cProfile` / `profile`", "*Which function gets the time?* — every call counted", "1.3–3×, and worse for many tiny calls", "A script or request you can run locally and reproduce"],
        ["`line_profiler`", "*Which line inside this function?*", "very high — 10× or more", "You already know the function and need the line"],
        ["`py-spy` / `austin` (sampling)", "*What is this process doing right now?*", "1–3%, safe in production", "A live service, a hung process, or anything you cannot restart"],
        ["`tracemalloc`", "*Where did the memory go?*", "moderate, and it distorts timing", "Memory, not time — Lesson 10.3"]
      ],
      caption: "The mistake is not picking the wrong tool. It is picking a tool before deciding what question you are asking — which is how people end up micro-benchmarking a function that turns out to be 3% of the runtime."
    },

    { t: "callout", kind: "tradeoff", title: "Deterministic versus sampling", body: [
      { t: "p", text: "`cProfile` is **deterministic**: it hooks every call and return, so its counts are exact. `py-spy` is a **sampler**: it reads the interpreter's stack from another process a hundred times a second and builds a statistical picture." },
      { t: "table",
        head: ["", "Deterministic (`cProfile`)", "Sampling (`py-spy`)"],
        rows: [
          ["Call counts", "exact", "not available"],
          ["Distortion", "**high for many small calls** — the hook costs about as much as a cheap function", "negligible and uniform"],
          ["Needs code change", "no, but needs to run under the profiler", "no, and no restart"],
          ["Works on a hung process", "no", "**yes** — the single best reason to install it"],
          ["Sees threads other than the main one", "only if instrumented per thread", "yes, all of them"]
        ]
      },
      { t: "p", text: "The practical rule: **reproduce locally with `cProfile`, diagnose production with a sampler.** If the two disagree about the ranking, believe the sampler — the disagreement is usually `cProfile`'s per-call overhead inflating a function called two million times." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "timeit, without fooling yourself", id: "timeit" },

    { t: "p", text: "`timeit` looks trivial and has four traps, three of which produce a number that is confidently wrong rather than obviously wrong." },

    { t: "ladder",
      title: "Timing one function, three ways",
      rungs: [
        { level: "bad", label: "Wall clock, one sample", why: "measures the machine's mood",
          code: `import time

start = time.time()
result = summarise_deploys(path)
print(f"took {time.time() - start:.2f}s")`,
          note: "Three separate defects. `time.time()` is a wall clock that the OS can adjust mid-measurement, so use `time.perf_counter()`. One sample cannot distinguish your change from a background process waking up. And the run includes cold-cache effects — the first read of a file, the first import, the first JIT-warm of the adaptive interpreter — which are real but are not what you are comparing." },

        { level: "ok", label: "timeit with a repeat count", why: "averages the noise, hides the floor",
          code: `import timeit

elapsed = timeit.timeit(
    lambda: summarise_deploys(path),
    number=20,
)
print(f"mean {elapsed / 20:.4f}s")`,
          note: "Much better: twenty runs amortise startup and give a stable mean. But a mean is the wrong statistic. Timing noise is one-sided — nothing makes your function run faster than it can, while a scheduler switch, a page fault or a CPU frequency drop makes it slower. So the mean measures your machine's interference and the **minimum** measures your code." },

        { level: "best", label: "repeat, then take the minimum", why: "the floor is the signal",
          code: `import statistics
import timeit

runs = timeit.repeat(
    lambda: summarise_deploys(path),
    number=5,       # inner loop: amortises call overhead
    repeat=7,       # outer loop: 7 independent samples
)
per_call = [r / 5 for r in runs]

print(f"best   {min(per_call):.4f}s")
print(f"median {statistics.median(per_call):.4f}s")
print(f"spread {max(per_call) / min(per_call):.2f}x")`,
          note: "Report the best as the answer and the spread as the confidence. A spread above about 1.3× means the machine is too noisy to trust the comparison — close your browser, or move the benchmark somewhere quiet. Reporting median alongside best is honest: if they diverge sharply, something is warming up between runs and you are measuring two different things." }
      ]
    },

    { t: "callout", kind: "trap", title: "The three ways timeit lies to you", body: [
      { t: "ol", items: [
        "**You timed a generator you never consumed.** `timeit.timeit(lambda: (transform(x) for x in rows))` measures the creation of a generator object — about 300 ns — and reports that your pipeline is astonishingly fast. Wrap it in `list()` or `sum()` or the measurement is meaningless (Lesson 5.7)."
      ]},
      { t: "code", lang: "python", title: "the empty measurement", numbered: false, code: `
import timeit

rows = list(range(100_000))

lazy = timeit.timeit(lambda: (x * 2 for x in rows), number=1000)
real = timeit.timeit(lambda: [x * 2 for x in rows], number=1000)

print(f"generator expression: {lazy:.6f}s")
print(f"list comprehension:   {real:.6f}s")
`, out: `generator expression: 0.000271s
list comprehension:   2.914000s

# The generator is not 10,000x faster. It has not run.`},
      { t: "ol", items: [
        "**A cache made your second run free.** `functools.lru_cache`, a warmed DNS entry, an OS page cache holding the file you 'read', a database plan cache. The first run measured the work; the next nineteen measured a dict lookup (Lesson 10.4).",
        "**`timeit` disables the garbage collector by default.** That makes runs comparable and makes them unrepresentative — if your function allocates heavily, GC is a genuine part of its cost in production. Pass `gc.enable()` in `setup` when the allocation behaviour is the thing you care about."
      ], tight: true },
      { t: "p", text: "All three produce a plausible number. That is what makes them dangerous — a wrong benchmark is worse than no benchmark, because it ends the investigation." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "cProfile: the two columns that matter", id: "cprofile" },

    { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
# profile a script, write the raw stats, then read them
$ python -m cProfile -o deploys.prof summarise.py

# or from inside code, around one call
$ python -c "import pstats; pstats.Stats('deploys.prof').sort_stats('tottime').print_stats(8)"
`},

    { t: "code", lang: "text", title: "pstats output (top 8 by internal time)", numbered: false, code: `
         3200147 function calls (3200142 primitive calls) in 3.842 seconds

   Ordered by: internal time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
   200000    0.951    0.000    1.612    0.000 _strptime.py:326(_strptime)
   200000    0.402    0.000    2.208    0.000 _strptime.py:575(_strptime_datetime)
        1    0.371    0.371    3.842    3.842 summarise.py:7(summarise_deploys)
   200000    0.334    0.000    0.611    0.000 json/__init__.py:299(loads)
   200000    0.298    0.000    0.298    0.000 {method 'strftime' of 'datetime.date'}
   200000    0.277    0.000    0.277    0.000 {built-in method _json.loads}
   200000    0.241    0.000    0.241    0.000 {method 'match' of 're.Pattern'}
   400000    0.196    0.000    0.196    0.000 {method 'get' of 'dict' objects}
`,
      caption: "Two columns carry the meaning and they answer different questions. Everything else is context."
    },

    { t: "dl", items: [
      ["`tottime` — internal time", "Time executing this function's own bytecode, **excluding** anything it called. Sorting by `tottime` finds the *leaf* that is actually burning the CPU. Here that is `_strptime`, which nobody suspected."],
      ["`cumtime` — cumulative time", "Time in this function **including** everything it called. Sorting by `cumtime` finds the *entry point* responsible for a chunk of the run. Here `_strptime_datetime` has a cumtime of 2.208 s — 58% of the total — which is the number you would quote in a ticket."],
      ["`ncalls`", "Call count. `3200147 (3200142 primitive)` means five calls were recursive; `primitive` excludes recursion. A surprising `ncalls` is often the whole finding: 400,000 `dict.get` calls in a loop you thought ran 200,000 times means the loop body runs twice."],
      ["`percall`", "Two of them, one per time column. Almost never the interesting number — a function at 4 µs per call is irrelevant or catastrophic depending entirely on `ncalls`."]
    ]},

    { t: "callout", kind: "trap", title: "The two classic misreadings", body: [
      { t: "p", text: "**Misreading one: taking the top `cumtime` row as the answer.** Sorted by `cumtime`, the top entry is always your entry point — `main`, or the request handler — with 100% of the runtime. It is perfectly accurate and completely useless. Read down until the cumulative share *drops*; the row where it drops is the branch that owns the time." },
      { t: "p", text: "**Misreading two: trusting cProfile's absolute numbers as latency.** The profiler hooks every call and return. That hook costs roughly as much as a cheap Python function call, so a function called two million times can gain seconds of pure instrumentation and jump up the ranking. The relative picture is usually sound; the wall-clock total is inflated, sometimes by 3×." },
      { t: "p", text: "**And the blind spot:** `cProfile` only sees *calls*. A quadratic built out of `rows = rows + [x]` or `s += chunk` involves no function call at all, so it never appears as a row — its cost is charged to the enclosing function's `tottime` and looks like ordinary loop overhead (Lesson 10.1). If `tottime` is concentrated in one of your own functions and you cannot see why, read that function's loop for operators, not for calls." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Line level, and live processes", id: "line-and-live" },

    { t: "p", text: "`cProfile` stops at function boundaries. When the expensive function is one of yours and forty lines long, you need the next resolution down." },

    { t: "tabs", items: [
      { label: "line_profiler", blocks: [
        { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
$ pip install line_profiler
$ kernprof -lv summarise.py      # -l line-by-line, -v print the report
`},
        { t: "code", lang: "text", title: "per-line report", numbered: false, code: `
Line #      Hits         Time  Per Hit   % Time  Line Contents
=====================================================================
     8         1          3.1      3.1      0.0  counts = {}
    10    200001      42100.0      0.2      1.3  for line in ...splitlines():
    11    200000     611000.0      3.1     18.6  record = json.loads(line)
    12    200000    2208000.0     11.0     67.2  stamp = datetime.strptime(...)
    13    200000      88000.0      0.4      2.7  if stamp.year != 2026:
    15    200000     298000.0      1.5      9.1  key = f"{record['service']}..."
    16    200000      37000.0      0.2      1.1  counts[key] = counts.get(...)
`,
          caption: "Decorate the function with `@profile` (injected by `kernprof`, not imported) or pass `-p module.func`. The 10× overhead means the *absolute* times are fiction; the **% Time** column is what you read."
        },
        { t: "p", text: "Use this when you have already narrowed to a function. Starting here is a mistake — the overhead is high enough to change which function looks slow." }
      ]},
      { label: "py-spy in production", blocks: [
        { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
# what is this process doing, right now, no restart, no code change
$ py-spy dump --pid 4127

# a live top-style view, updating
$ py-spy top --pid 4127

# 60 seconds of samples as an interactive flame graph
$ py-spy record -o profile.svg --pid 4127 --duration 60

# follow forked workers too (gunicorn, celery)
$ py-spy record -o profile.svg --pid 4127 --subprocesses
`},
        { t: "p", text: "`py-spy` attaches from outside the process and reads the interpreter's stacks directly. It needs no import, no restart and no flag, and it costs a few percent of CPU — which means you can run it against a pod that is currently on fire." },
        { t: "callout", kind: "insight", title: "The hung-process trick", body: [
          { t: "p", text: "A worker that has stopped making progress is the case where every other tool fails. There is no traceback, the logs stop, and restarting it destroys the evidence." },
          { t: "p", text: "`py-spy dump --pid` prints the current stack of every thread. Nine times in ten the answer is in that output: a `socket.recv` with no timeout, a `lock.acquire` in a deadlock, or a regular expression backtracking (Lesson 5.11). It has replaced hours of guessing with one command." }
        ]}
      ]},
      { label: "Scoping it in code", blocks: [
        { t: "code", lang: "python", title: "profile one block, not the whole script", code: `
import cProfile
import pstats
from contextlib import contextmanager


@contextmanager
def profiled(label: str, top: int = 12):
    """Profile just the enclosed block and print the worst offenders.

    Scoping matters: profiling a whole script buries the interesting
    20 milliseconds under import and setup time.
    """
    pr = cProfile.Profile()
    pr.enable()
    try:
        yield
    finally:
        pr.disable()
        print(f"--- {label} ---")
        pstats.Stats(pr).sort_stats("cumtime").print_stats(top)


with profiled("summarise 200k deploys"):
    summarise_deploys(path)
`,
          caption: "This is the form to keep in your own utilities. A profile of a whole CLI run is mostly `importlib`; a profile of the one call you care about is a finding."
        }
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Reading a flame graph", id: "flame-graph",
      sub: "The output format of every sampling profiler, and the two things its x-axis does not mean." },

    { t: "viz",
      title: "A flame graph of one slow request",
      caption: "Each box is a stack frame. Its width is the share of samples in which that frame was on the stack. Boxes stack upwards: a box sits on the frame that called it. The widest box at the top of a tower is where the process actually was.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Flame graph showing handle_request spending sixty-five percent of samples inside socket receive under a repeated database call">
  <text x="20" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">py-spy record — 60 s, 6,000 SAMPLES</text>

  <rect x="192" y="140" width="536" height="24" rx="3" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="198" y="156" class="s-mono" style="font-size:10.5px;fill:var(--crit)">socket.recv_into  65%</text>

  <rect x="188" y="166" width="548" height="24" rx="3" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="194" y="182" class="s-mono" style="font-size:10.5px;fill:var(--crit)">psycopg.Cursor.execute  67%</text>
  <rect x="748" y="166" width="80" height="24" rx="3" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="754" y="182" class="s-mono" style="font-size:10.5px">format</text>

  <rect x="184" y="192" width="560" height="24" rx="3" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="190" y="208" class="s-mono" style="font-size:10.5px;fill:var(--crit)">fetch_customer  68%   (called 340x per request)</text>
  <rect x="748" y="192" width="112" height="24" rx="3" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="754" y="208" class="s-mono" style="font-size:10.5px;fill:var(--warn)">format_rows 14%</text>

  <rect x="40" y="218" width="140" height="24" rx="3" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="46" y="234" class="s-mono" style="font-size:10.5px">load_orders 17%</text>
  <rect x="180" y="218" width="680" height="24" rx="3" class="s-fill s-stroke" stroke-width="1"/>
  <text x="186" y="234" class="s-mono" style="font-size:10.5px">render_report  83%</text>

  <rect x="40" y="244" width="820" height="24" rx="3" class="s-fill s-stroke" stroke-width="1"/>
  <text x="46" y="260" class="s-mono" style="font-size:10.5px">handle_request  100%</text>

  <line x1="40" y1="276" x2="860" y2="276" style="stroke:var(--border-strong)" stroke-width="1.2"/>
  <text x="40" y="292" class="s-sub" style="fill:var(--ink-3)">0%</text>
  <text x="860" y="292" text-anchor="end" class="s-sub" style="fill:var(--ink-3)">100% of samples</text>

  <path d="M700 132 L680 100 L820 100" style="stroke:var(--crit);fill:none" stroke-width="1.2"/>
  <text x="820" y="96" text-anchor="end" class="s-sub" style="fill:var(--crit);font-weight:700">the process is waiting, not computing</text>

  <path d="M804 220 L804 60 L560 60" style="stroke:var(--warn);fill:none" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="556" y="56" text-anchor="end" class="s-sub" style="fill:var(--warn)">the loop the team spent a sprint rewriting</text>

  <text x="20" y="312" class="s-sub" style="fill:var(--ink-2)">Left-to-right is alphabetical, not chronological — a flame graph carries no ordering in time. Width is share of samples, never absolute duration.</text>
</svg>`
    },

    { t: "dl", items: [
      ["Width", "Share of samples containing that frame. Wide means *the process was here a lot*, which may mean computing or may mean waiting."],
      ["Height", "Stack depth, nothing more. A tall narrow tower is deep recursion or a framework's middleware chain, and is not by itself a problem."],
      ["Left-to-right", "**Not time.** Frames are ordered alphabetically so that the same code lands in the same place across runs. You cannot read 'this happened before that' off a flame graph — for chronology you need a trace (Lesson 14.3)."],
      ["A wide plateau at the top", "The leaf where the process actually sits. This is the answer to *what is it doing?* — everything below is just how it got there."]
    ]},

    /* ================================================================== */
    { t: "h2", n: "07", text: "The ceiling, computed before you start", id: "ceiling" },

    { t: "p", text: "A profile gives you each part's share of the runtime. That share caps what any optimisation of that part can ever return, and the arithmetic is worth doing before you commit a week." },

    { t: "table",
      head: ["That part is X% of runtime", "Make it 2× faster", "Make it 10× faster", "Make it **infinitely** fast"],
      rows: [
        ["90%", "1.8×", "5.3×", "10×"],
        ["61%", "1.4×", "2.2×", "2.6×"],
        ["30%", "1.2×", "1.4×", "1.4×"],
        ["10%", "1.05×", "1.1×", "1.1×"],
        ["5%", "1.03×", "1.05×", "1.05×"]
      ],
      caption: "Overall speedup is `1 / ((1 - share) + share / factor)`. Read the last column first: it is the best case, it costs nothing to compute, and it has stopped more doomed projects than any code review."
    },

    { t: "callout", kind: "good", title: "The loop that produces a defensible change", body: [
      { t: "ol", items: [
        "**Reproduce with a fixed input.** A benchmark you cannot run twice is an anecdote. Pin the data, pin the seed.",
        "**Record the baseline number** before touching anything. If you cannot state what it was, you cannot claim an improvement.",
        "**Establish the growth class** with a doubling test (Lesson 10.1). Ratio ~4.0 means fix the algorithm and re-profile; the ranking will change completely.",
        "**Assert equivalence.** Compare the output of old and new on the fixed input. A faster function returning different results is a regression with a good benchmark attached.",
        "**Change one thing.** Two changes measured together give you a number you cannot attribute, and one of them is often a slowdown hiding behind the other.",
        "**Re-measure and write both numbers in the pull request.** 3.84 s → 0.41 s, at n = 200,000, on this input. That sentence is the deliverable.",
        "**Guard it with something deterministic.** A wall-clock assertion in CI is flaky and will be deleted within a month. Assert the *query count*, the *number of rows read*, or the *call count* instead — those are stable across machines and they are what actually regressed."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "08", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Profile it, compute the ceiling, then fix one thing",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Use `summarise_deploys` from section 01. Your job is not to make it fast — it is to produce the evidence trail that would let a reviewer accept your change without re-running anything." },
        { t: "p", text: "Generate a file of 200,000 JSON lines, profile the function, and follow the loop from section 07 exactly. The interesting part of this exercise is step three: before you optimise, compute what the profile says your ceiling is, and then check afterwards whether you hit it." }
      ],
      requirements: [
        "Write a generator that produces a 200,000-line JSON log file to a temporary path, with a fixed seed so the input is reproducible.",
        "Profile the function with `cProfile` scoped to the one call, and print the top rows sorted by `cumtime`.",
        "From the profile, state the share of runtime taken by date parsing, and compute the overall speedup you would get if date parsing became free.",
        "Assert that your optimised version returns a dict equal to the original's, on the same input, before timing it.",
        "Replace date parsing with something faster and measure again with `timeit.repeat`, reporting best-of-7 rather than a mean.",
        "State whether you beat, met or missed the ceiling you computed, and explain the discrepancy."
      ],
      hint: "`datetime.strptime` derives a regular expression from your format string. Python 3.11+ has a dedicated ISO-8601 parser that does not. And ask what `strftime('%Y-%m')` produces compared with the first seven characters of the timestamp you already have.",
      solution: {
        lang: "python",
        title: "profile_summarise.py",
        code: `"""Profile first, compute the ceiling, then change exactly one thing."""

import cProfile
import json
import pstats
import random
import statistics
import timeit
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from tempfile import mkdtemp

SERVICES = ["checkout", "search", "billing", "auth", "notify"]


def write_log(path: Path, n: int = 200_000) -> None:
    random.seed(7)                      # reproducible input or it is an anecdote
    with path.open("w", encoding="utf-8") as fh:
        for i in range(n):
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            year = 2026 if i % 20 else 2025
            fh.write(json.dumps({
                "at": f"{year}-{month:02d}-{day:02d}T09:{i % 60:02d}:00+00:00",
                "service": random.choice(SERVICES),
                "kind": "deploy",
            }) + "\\n")


@contextmanager
def profiled(label: str, top: int = 8):
    pr = cProfile.Profile()
    pr.enable()
    try:
        yield
    finally:
        pr.disable()
        print(f"--- {label} ---")
        pstats.Stats(pr).sort_stats("cumtime").print_stats(top)


def summarise_slow(path: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    for line in path.read_text().splitlines():
        record = json.loads(line)
        stamp = datetime.strptime(record["at"], "%Y-%m-%dT%H:%M:%S%z")
        if stamp.year != 2026:
            continue
        key = f"{record['service']}:{stamp.strftime('%Y-%m')}"
        counts[key] = counts.get(key, 0) + 1
    return counts


def summarise_fast(path: Path) -> dict[str, int]:
    """One change: stop parsing dates with a format string.

    fromisoformat is a purpose-built C parser -- no regex derived from a
    format, no locale lookup. And the month key is already the first seven
    characters of the timestamp, so strftime is not needed at all.
    """
    counts: dict[str, int] = {}
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:                              # stream, do not read_text
            record = json.loads(line)
            at = record["at"]
            if not at.startswith("2026"):            # cheap reject, no parsing
                continue
            key = f"{record['service']}:{at[:7]}"
            counts[key] = counts.get(key, 0) + 1
    return counts


def best_of(fn, path: Path, number: int = 3, repeat: int = 7) -> float:
    runs = timeit.repeat(lambda: fn(path), number=number, repeat=repeat)
    per_call = [r / number for r in runs]
    print(f"  best {min(per_call):.4f}s   median {statistics.median(per_call):.4f}s"
          f"   spread {max(per_call) / min(per_call):.2f}x")
    return min(per_call)


if __name__ == "__main__":
    log = Path(mkdtemp()) / "deploys.jsonl"
    write_log(log)

    with profiled("summarise_slow, 200k lines"):
        summarise_slow(log)

    # From the cumtime column: _strptime_datetime = 2.208s of 3.842s = 57.5%.
    # Ceiling if date parsing becomes free: 1 / (1 - 0.575) = 2.35x.
    share = 0.575
    print(f"ceiling from the profile: {1 / (1 - share):.2f}x\\n")

    # Equivalence before timing. Not optional.
    assert summarise_slow(log) == summarise_fast(log)

    print("slow:")
    slow = best_of(summarise_slow, log)
    print("fast:")
    fast = best_of(summarise_fast, log)
    print(f"\\nachieved {slow / fast:.2f}x against a computed ceiling of "
          f"{1 / (1 - share):.2f}x")`,
        out: `--- summarise_slow, 200k lines ---
   ncalls  tottime  cumtime  filename:lineno(function)
        1    0.371    3.842  summarise.py:7(summarise_slow)
   200000    0.402    2.208  _strptime.py:575(_strptime_datetime)
   200000    0.951    1.612  _strptime.py:326(_strptime)
   200000    0.334    0.611  json/__init__.py:299(loads)
   200000    0.298    0.298  {method 'strftime' of 'datetime.date'}

ceiling from the profile: 2.35x

slow:
  best 3.8102s   median 3.8390s   spread 1.02x
fast:
  best 0.4137s   median 0.4201s   spread 1.03x

achieved 9.21x against a computed ceiling of 2.35x`,
        notes: [
          { t: "p", text: "**You are meant to blow through the ceiling, and the reason is the lesson.** Amdahl's arithmetic assumes you make one part faster and leave the rest alone. This change did three things at once: it removed `strptime` (57%), it removed `strftime` (8%), and — crucially — the `startswith` guard now rejects 5% of lines *before* any parsing at all, while the original parsed every line and then discarded it." },
          { t: "p", text: "That is the single most valuable move in optimisation and profiles rarely suggest it: **do not make the expensive work faster, arrange not to do it.** A profiler tells you what is expensive. It cannot tell you that the work was unnecessary — only reading the code with the profile in hand does that." },
          { t: "callout", kind: "trap", title: "Two things in this solution that are easy to get wrong", body: [
            { t: "ul", items: [
              "**`fromisoformat` is not a drop-in replacement for `strptime`.** It accepts ISO-8601 and raises `ValueError` on anything else, including the `%d/%m/%Y` formats that real logs are full of. This solution avoids it entirely by comparing strings — which is faster still, and only valid because the timestamps are known to be zero-padded ISO. Write that assumption down in a docstring or the next person will feed it a different format.",
              "**`read_text().splitlines()` materialises the entire file plus a list of every line** — about 60 MB of peak memory for this input, and it is why the fast version iterates the file handle instead. That change contributes little to the time here and a great deal to the memory (Lesson 10.3)."
            ]}
          ]},
          { t: "p", text: "Note that `spread` is 1.02× in both measurements. That is what a trustworthy benchmark looks like. If it had come back at 1.8× the correct action is to fix the measurement environment before believing either number." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A pricing service has a p99 of 900 ms against a 200 ms budget. The team's shared belief is that the culprit is a nested aggregation loop that everyone finds ugly. Two engineers spend a sprint rewriting it with `itertools` and vectorised arithmetic. The p99 moves to 870 ms." },
      { t: "p", text: "Someone runs `py-spy record --pid --duration 60` against a production pod. Forty percent of samples are inside the `logging` package. Thirty percent are in `json.dumps`, called from the structured-log formatter. The aggregation loop that consumed the sprint is 6%." },
      { t: "p", text: "**The mechanism.** The hot path contained `logger.debug(f\"priced {sku} at {price} using {rules!r}\")` inside a loop that runs 40,000 times per request. The service runs at `INFO`, so nothing was ever written — but **the f-string is evaluated before `debug()` is called**, so every request built 40,000 formatted strings, and `{rules!r}` invoked `repr` on a large object each time. The level check happens *inside* the function, after the arguments already exist. Then the JSON formatter serialised each `INFO` record synchronously on the request thread." },
      { t: "p", text: "**The fix is two lines and no rewrite:** pass lazy arguments — `logger.debug(\"priced %s at %s\", sku, price)` — so formatting happens only if the record is emitted, and move the log handler behind a `QueueHandler` so serialisation leaves the request path (Lesson 6.4). The p99 dropped to 180 ms." },
      { t: "p", text: "**Why the sprint was wasted:** nobody measured. The loop was chosen because it was the ugliest code in the file, and the profile showed it capped the possible gain at 1.06×. One 60-second sampling run, available without a restart or a deploy, would have redirected the whole sprint on day one." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Your intuition ranks operations by conceptual complexity; the runtime ranks them by work per call times number of calls.** Those orderings agree by accident.",
    "Pick the instrument from the question: `timeit` for *is A faster than B*, `cProfile` for *which function*, a line profiler for *which line*, a sampler for *what is this process doing right now*.",
    "**`tottime` finds the leaf burning CPU; `cumtime` finds the entry point that owns the time.** The top `cumtime` row is always your own entry point at 100% — read down until the share drops.",
    "`cProfile` hooks every call, so it inflates functions called millions of times and can invert the ranking. Believe a sampler over it when they disagree.",
    "**`cProfile` cannot see operators.** A quadratic built from `+=` never appears as a row; its cost hides inside the enclosing function's `tottime`.",
    "Timing noise is one-sided, so **report the best of several `timeit.repeat` runs, not the mean** — and report the spread as your confidence.",
    "The three benchmarks that lie: timing a generator you never consumed, timing a warm cache, and forgetting that `timeit` disables the garbage collector by default.",
    "**A flame graph's width is share of samples and its left-to-right order is alphabetical, not chronological.** Wide can mean computing or waiting.",
    "`py-spy` attaches to a live process with no restart and a few percent overhead, and `py-spy dump` is the only tool that tells you what a hung worker is doing.",
    "**Compute the ceiling before you start:** overall speedup is `1 / ((1 - share) + share / factor)`. A part that is 10% of runtime cannot give you more than 1.1×.",
    "Guard a fixed regression with something deterministic — query count, rows read, call count — not a wall-clock assertion, which is flaky and gets deleted."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A `cProfile` report sorted by `cumtime` has your request handler at the top with 100% of the runtime. What have you learned?",
        options: [
          "That the handler's own code is the bottleneck and should be optimised first",
          "Nothing yet — the entry point always has 100% cumulative time; you read downwards until the cumulative share drops, and that row owns the time",
          "That the profile is corrupt, since no single function should account for all the time",
          "That the work is I/O-bound, because cumulative time includes waiting"
        ],
        answer: 1,
        why: "`cumtime` includes everything a function called, so whatever you entered through necessarily shows 100%. It is accurate and carries no information. The row where the cumulative share drops away from 100% is the branch that actually owns the time — and to find the code burning CPU rather than delegating it, re-sort by `tottime`. The handler's *own* work is its `tottime`, which here would be small. Nothing about a 100% top row indicates corruption or I/O."
      },
      {
        stem: "You benchmark two implementations with `timeit.repeat(..., repeat=7)` and get, per call: 0.41, 0.42, 0.41, 0.58, 0.43, 0.41, 0.41. Which number do you report?",
        options: [
          "The mean, 0.44 s, because averaging removes measurement noise",
          "The 0.58 s worst case, because production will hit the worst case",
          "The minimum, 0.41 s, because timing noise only ever makes a run slower — the floor is the code and the excursions are the machine",
          "The median, 0.42 s, because it is robust to the outlier"
        ],
        answer: 2,
        why: "Nothing can make your function run faster than it is able to, while a scheduler switch, a page fault or a CPU frequency change can make any single run slower. That makes the noise strictly one-sided, so the minimum is the best estimate of the code's cost and the mean is partly a measurement of your machine's interference. The median is a reasonable sanity check to report alongside — if best and median diverge sharply something is warming up between runs — but it is not the headline. And the worst case here is measurement noise, not a latency characteristic; for tail latency you measure the deployed system, not a benchmark loop."
      },
      {
        stem: "A profile shows one function is 30% of runtime. Your team proposes rewriting it in Rust for an expected 20× speedup on that function. What is the overall gain?",
        options: [
          "About 20×, since that function dominates the profile",
          "About 6×, proportional to its share of the runtime",
          "About 1.4× — even making it instantaneous only removes 30% of the total",
          "It cannot be estimated without measuring the Rust version first"
        ],
        answer: 2,
        why: "Overall speedup is `1 / ((1 - share) + share / factor)` = `1 / (0.70 + 0.015)` ≈ 1.40×. The ceiling, with the function taking zero time, is `1 / 0.70` ≈ 1.43× — so the last 19× of the 20× buys you three percent. This arithmetic needs no measurement of the new implementation, only its share of the current one, which is why it is the first thing to compute when someone proposes a rewrite. It is also the argument for spending that effort on the other 70% instead."
      },
      {
        stem: "A worker process has stopped making progress. No logs, no traceback, and it holds the only evidence. What do you reach for?",
        options: [
          "Restart it with `cProfile` enabled and wait for the hang to recur",
          "`py-spy dump --pid` to print the current stack of every thread without touching the process",
          "`timeit` around the suspected function to find which call is slow",
          "Attach `line_profiler` to the running process"
        ],
        answer: 1,
        why: "A sampling profiler reads the interpreter's stacks from outside the process, so `py-spy dump` shows you exactly where every thread is sitting — typically a `socket.recv` with no timeout, a lock acquisition in a deadlock, or a regex backtracking. Restarting under `cProfile` destroys the evidence and requires reproducing a hang you may not be able to trigger; `timeit` needs a call that returns; and `line_profiler` requires the code to have been decorated before it started, so it cannot be attached to a running process."
      }
    ]
  },

  /* ==================================================================== */
  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Walk me through how you would find out why an endpoint is slow.",
        strong: "Reproduce it with a fixed input, record the baseline, then measure rather than read. Locally I would scope `cProfile` to the one call and sort by `cumtime` to find the branch that owns the time, then by `tottime` to find the leaf burning CPU. In production I would sample with `py-spy`, which needs no restart. Then I compute what the top entry's share caps the gain at, before changing anything.",
        answer: [
          { t: "p", text: "The interviewer is checking whether you have a procedure or a reflex. Naming the specific tools and what each one answers is what makes it a procedure." },
          { t: "p", text: "Two details reliably impress. First, scoping the profile: a profile of a whole script or a whole test run is mostly import machinery, and scoping it to the one call is the difference between noise and a finding. Second, computing the ceiling from the share before starting work — it is a two-second calculation that has cancelled many week-long projects." },
          { t: "p", text: "If the role touches production, mention that you would sample a live pod rather than trying to reproduce locally. Local reproduction changes the data volume, the cache state, the network and the concurrency — four of the most common causes of the slowness you are hunting." }
        ],
        weak: "Starting with a hypothesis about which function is slow, or describing an optimisation before describing a measurement. It is the answer that says you have solved this by guessing before and got lucky."
      },
      {
        level: "core",
        q: "What is the difference between tottime and cumtime in a cProfile report?",
        strong: "`tottime` is time in that function's own bytecode, excluding calls it made. `cumtime` includes everything it called. Sorting by `tottime` finds the leaf actually burning CPU; sorting by `cumtime` finds the entry point responsible for a chunk of the run. You need both, because a function can own 60% of the runtime while doing almost nothing itself.",
        answer: [
          { t: "p", text: "This is a competence check and the answer is short. What earns the follow-up is knowing what each ranking is *for*, rather than reciting the definitions." },
          { t: "p", text: "Strong candidates volunteer the classic misreading unprompted: the top `cumtime` row is always your own entry point at 100%, which is accurate and useless, and you read downwards until the share drops." },
          { t: "p", text: "If you have room, name the blind spot. `cProfile` instruments *calls*, so a quadratic built out of `s += chunk` or `rows = rows + [x]` produces no row at all — its cost is charged to the enclosing function's `tottime`. That is the detail that shows you have actually chased a bug with this tool rather than read its documentation." }
        ]
      },
      {
        level: "advanced",
        q: "Why would you use a sampling profiler in production instead of cProfile?",
        strong: "Overhead and access. `cProfile` hooks every call and return, costing 1.3–3× and much worse for many small calls, which both distorts the ranking and is unacceptable on live traffic. A sampler reads stacks from outside the process at a fixed rate, costs a few percent, needs no restart or code change, sees every thread, and works on a process that has already hung.",
        answer: [
          { t: "p", text: "The distortion point is the one that separates a real answer from a memorised one. `cProfile`'s per-call hook costs roughly what a cheap Python function call costs, so a function invoked two million times can gain seconds of pure instrumentation and climb the ranking past the function that is genuinely slow. The relative shape usually survives; the absolute numbers do not." },
          { t: "p", text: "The access point matters just as much in practice. Reproducing production slowness locally changes the data volume, the cache warmth, the network latency and the concurrency — which are frequently the cause. Sampling a live pod measures the actual system." },
          { t: "p", text: "Give the trade-off honestly so it does not sound like advocacy: a sampler gives you no call counts, and call counts are sometimes the entire finding — 340 database calls in one request is a diagnosis you can only get from a deterministic profile or a query log." }
        ],
        weak: "Saying only that cProfile is 'slow'. The interesting claim is not that it is slow but that it is *unevenly* slow, which changes the answer rather than just the runtime."
      },
      {
        level: "advanced",
        q: "Your profile is accurate and your optimisation made no difference to the user-visible latency. What are the possible explanations?",
        strong: "The profiled path was not the path production takes; the share you improved was too small for the change to show; the time is spent waiting rather than computing so a CPU profile ranked the wrong thing; or the bottleneck is a queue or a lock, where latency is governed by contention rather than by per-request work.",
        answer: [
          { t: "p", text: "The interviewer wants to see whether you can distinguish *a correct measurement* from *a measurement of the right thing*. Both failures look identical from the outside." },
          { t: "p", text: "The most common concrete case is profiling a warm local run against a cold production one — a different cache state, a different data volume, and a query planner making a different choice. The second most common is that the request spends its time blocked, so a CPU-time profile shows you the 6% that ran while hiding the 65% that waited. Wall-clock sampling shows the wait; CPU sampling hides it, and knowing which mode your tool is in is the whole difference." },
          { t: "p", text: "Finish with the systemic case, because it is the one that generalises: under saturation, latency is dominated by queueing. If requests are waiting on a connection pool with ten slots, making each request 30% faster reduces service time and barely moves p99 until the pool stops being the constraint. That is a capacity problem wearing a performance costume, and no amount of profiling one process will reveal it — you need the pool's own metrics (Lessons 13.7, 14.3)." }
        ]
      }
    ]
  }
});
