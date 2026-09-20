/* ============================================================================
   LESSON 10.6 — When Python Is Not the Answer
   ========================================================================= */
EC.receiveLesson({
  id: "10.6",

  lede: "Every optimisation in this module keeps you inside Python. At some point that stops working, and the question becomes which boundary to cross — vectorise, drop to C, rewrite in Rust, or add machines. **Most teams reach for the most expensive option first**, because it is the most interesting one, and the honest answer is usually further up the list.",

  objectives: [
    "Establish whether the bottleneck is the interpreter at all",
    "Use vectorisation where the work is homogeneous and numeric",
    "Compare Cython, C extensions and Rust bindings on the axes that matter",
    "Judge scaling out against speeding up, including the costs nobody quotes",
    "Decide, and be able to defend the decision to someone who wanted the rewrite"
  ],

  prerequisites: ["10.2", "10.5"],

  blocks: [

    { t: "h2", n: "01", text: "First: is it Python?", id: "first" },

    {"kind": "steps", "title": "Is it Python, and what then", "caption": "Profile first: most slow Python programs are slow because of an algorithm or I/O, not the interpreter. Only when the hot loop is genuinely numeric Python do the last three options apply.", "items": [{"label": "Profile", "desc": "is the time in your loop, in a library, or waiting on I/O?", "tone": "accent"}, {"label": "Fix the algorithm or the query", "desc": "the usual 10–1000× win", "tone": "good"}, {"label": "Vectorise", "desc": "NumPy, pandas, polars — the loop moves into C", "tone": "good"}, {"label": "Native code", "desc": "Cython, Rust via PyO3, a C extension", "tone": "warn"}, {"label": "Scale out", "desc": "more processes or machines — after the above, not instead", "tone": "crit"}], "t": "diagram", "id": "dg-10_6-01-0"},


    { t: "viz",
      title: "The decision, in order of cost",
      caption: "Each step is cheaper than the one below it and rules out the ones after. Teams that start at the bottom usually discover, several months in, that the answer was three steps up.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="A decision ladder from profiling through algorithm, vectorisation, scaling out, and finally a native rewrite">
  <rect x="14" y="20" width="700" height="40" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="34" y="45" class="s-mono" style="font-size:11px;fill:var(--good)">1  Profile it</text>
  <text x="220" y="45" class="s-sub">Is the interpreter even on the critical path?</text>
  <text x="730" y="45" class="s-sub" style="fill:var(--good)">hours</text>

  <rect x="14" y="72" width="700" height="40" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.4"/>
  <text x="34" y="97" class="s-mono" style="font-size:11px;fill:var(--good)">2  Fix the algorithm</text>
  <text x="220" y="97" class="s-sub">O(n²) → O(n) beats any language change</text>
  <text x="730" y="97" class="s-sub" style="fill:var(--good)">a day</text>

  <rect x="14" y="124" width="700" height="40" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.4"/>
  <text x="34" y="149" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">3  Use a faster library</text>
  <text x="220" y="149" class="s-sub">numpy, polars, orjson — already C, already tested</text>
  <text x="730" y="149" class="s-sub" style="fill:var(--accent-ink)">days</text>

  <rect x="14" y="176" width="700" height="40" rx="8" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.4"/>
  <text x="34" y="201" class="s-mono" style="font-size:11px;fill:var(--warn)">4  Scale out</text>
  <text x="220" y="201" class="s-sub">More processes or machines, if the work divides</text>
  <text x="730" y="201" class="s-sub" style="fill:var(--warn)">days, then rent</text>

  <rect x="14" y="228" width="700" height="40" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.4"/>
  <text x="34" y="253" class="s-mono" style="font-size:11px;fill:var(--crit)">5  Rewrite the hot part natively</text>
  <text x="220" y="253" class="s-sub">Cython, C, Rust — a build chain and a new skill</text>
  <text x="730" y="253" class="s-sub" style="fill:var(--crit)">weeks</text>

  <rect x="14" y="280" width="700" height="40" rx="8" style="fill:none;stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="34" y="305" class="s-mono" style="font-size:11px;fill:var(--crit)">6  Rewrite the service</text>
  <text x="220" y="305" class="s-sub">Almost never the answer to a performance problem</text>
  <text x="730" y="305" class="s-sub" style="fill:var(--crit)">quarters</text>
</svg>`
    },

    { t: "table",
      head: ["What the profile shows", "The bottleneck is", "Native code helps?"],
      rows: [
        ["Time in `socket.recv`, `psycopg`, `requests`", "I/O — the network or the database", "**No.** Concurrency or fewer round trips (Lesson 11.5)"],
        ["Time in one query", "The database", "**No.** An index, or less data"],
        ["Time spread thinly across your own functions", "The interpreter", "**Yes** — this is the case that qualifies"],
        ["Time in `numpy` already", "Memory bandwidth or the algorithm", "Rarely — better vectorisation, or a different one"],
        ["Time in `json.loads`", "A C library already", "Swap it: `orjson` is 2–5× and is one import"],
        ["High memory, then a stall", "Garbage collection or swapping", "**No.** Fix the allocation (Lesson 10.3)"]
      ],
      caption: "**Only the third row is a case for native code.** A rewrite that makes your Python 50× faster on a request spending 98% of its time waiting for Postgres changes the total by under 2%."
    },

    { t: "callout", kind: "insight", title: "Amdahl's law, as a sanity check", body: [
      { t: "code", lang: "python", title: "compute the ceiling before you start", numbered: false, code: `
def best_case(total_seconds: float, hot_fraction: float, speedup: float) -> float:
    """The most a rewrite can possibly give you.

    Run this BEFORE writing any of it. It has stopped more bad projects
    than any code review.
    """
    hot = total_seconds * hot_fraction
    return (total_seconds - hot) + hot / speedup


# A 12-second request, 15% of it in Python, made 50x faster:
print(best_case(12.0, 0.15, 50))       # 10.2 s — a 15% win for a month's work

# The same request, 85% in Python:
print(best_case(12.0, 0.85, 50))       # 2.0 s — now it is worth doing`,
        out: `10.236
2.004`},
      { t: "p", text: "**Infinite speedup of the hot part still leaves the cold part.** If Python is 15% of your runtime, the theoretical ceiling is a 15% improvement — and no amount of Rust changes that arithmetic." },
      { t: "p", text: "Measure `hot_fraction` from the profile, not from intuition. It is routinely much smaller than people expect in anything that touches a network." }
    ]},

    { t: "h2", n: "02", text: "Vectorisation", id: "vectorise" },

    { t: "code", lang: "python", title: "the same work, three ways", code: `
import numpy as np

# 10 million elements
xs = list(range(10_000_000))
ys = list(range(10_000_000))

# 1. A Python loop — one interpreter step per element
result = [x * 2 + y for x, y in zip(xs, ys)]              # 4.10 s

# 2. numpy, but element-wise access — the worst of both worlds
a, b = np.array(xs), np.array(ys)
result = np.array([a[i] * 2 + b[i] for i in range(len(a))])   # 9.80 s

# 3. Vectorised — the loop happens in C, over unboxed memory
result = a * 2 + b                                         # 0.031 s
`,
      out: `python loop:      4.10 s
numpy, indexed:   9.80 s      <- SLOWER than plain Python
numpy, vectorised: 0.031 s    <- 130x`,
      hl: [11, 12, 15],
      caption: "**Case 2 is the mistake people make on their first day with `numpy`.** Indexing an array element by element pays boxing on every access, so it is slower than a plain list. The gain comes from expressing the operation over the whole array, never from the array type itself."
    },

    { t: "callout", kind: "tradeoff", title: "When vectorisation does not apply", body: [
      { t: "ul", items: [
        "**Heterogeneous data.** A list of dicts with mixed types has no array representation; `polars` or `pandas` may still help, `numpy` will not.",
        "**Data-dependent control flow.** \"Process until a condition, then branch differently\" does not vectorise — though `np.where` covers simple cases.",
        "**Small inputs.** Conversion costs microseconds; below a few thousand elements it dominates the saving.",
        "**Work that is not the bottleneck.** Vectorising a loop that takes 3% of the runtime is Amdahl's law again."
      ]},
      { t: "code", lang: "python", title: "the conversion cost is real", numbered: false, code: `
# 500 elements, called once per request
xs = [...]
result = (np.asarray(xs) * 2).tolist()     # ~40 us, mostly conversion
result = [x * 2 for x in xs]               # ~18 us

# Vectorise where the data ALREADY lives in arrays, or where n is large
# enough that conversion is noise.`},
      { t: "p", text: "**Keep data in arrays across steps** rather than converting per operation. Most of the disappointment with `numpy` comes from paying conversion on both ends of every call." }
    ]},

    { t: "h2", n: "03", text: "Crossing into native code", id: "native" },

    { t: "table",
      head: ["", "Cython", "C extension", "Rust + PyO3", "ctypes / cffi"],
      rows: [
        ["Looks like", "Annotated Python", "C with CPython API", "Rust with a macro", "Python calling a `.so`"],
        ["Learning cost", "Low", "High", "**High**", "Low"],
        ["Memory safety", "Yours to get right", "Yours to get right", "**Enforced**", "Yours"],
        ["Build chain", "A compiler", "A compiler", "cargo + maturin", "None — the library exists"],
        ["Wheels for every platform", "`cibuildwheel`", "`cibuildwheel`", "`maturin`, well supported", "N/A"],
        ["Releases the GIL", "Yes, explicitly", "Yes", "Yes", "Depends"],
        ["Best for", "Speeding up existing Python incrementally", "Wrapping an existing C library", "**New performance-critical components**", "Calling a library you already have"]
      ],
      caption: "**Cython is the cheapest first step** because it starts as your existing Python and gets faster as you add types. **Rust is the right choice for something new**, largely because a memory-safety bug in a C extension is a segfault with no traceback."
    },

    { t: "code", lang: "python", title: "Cython: the same function, typed", code: `
# hot.pyx — compiled, not interpreted
cimport cython


@cython.boundscheck(False)      # skip the bounds check we know holds
@cython.wraparound(False)       # no negative indexing in this loop
def rolling_max(double[:] values, int window):
    """A typed memoryview means no boxing and no interpreter dispatch
    per element. Roughly 60x the pure-Python version here."""
    cdef Py_ssize_t i, j, n = values.shape[0]
    cdef double best
    cdef double[:] out = np.empty(n - window + 1, dtype=np.float64)

    for i in range(n - window + 1):
        best = values[i]
        for j in range(i + 1, i + window):
            if values[j] > best:
                best = values[j]
        out[i] = best
    return np.asarray(out)
`,
      caption: "**`boundscheck(False)` is where the danger enters.** It removes the check that would have raised `IndexError` and replaces it with reading arbitrary memory — so it belongs only on a loop whose bounds you have proved, with a test that exercises the edges."
    },

    { t: "callout", kind: "warn", title: "What a native extension actually costs", body: [
      { t: "ul", items: [
        "**A build chain in CI**, producing wheels for every platform and Python version you support — `cibuildwheel` or `maturin` make this tractable, not free (Lesson 7.7).",
        "**A crash instead of an exception.** A memory bug is a `SIGSEGV`: no traceback, no `except`, and a worker that dies mid-request.",
        "**A second debugging skill.** `pdb` cannot step into it; you need `gdb` or `lldb` and a debug build (Lesson 6.6).",
        "**A second language in review.** Every future maintainer needs it, and the pool of people who can fix a production issue narrows.",
        "**Crossing the boundary is not free.** Calls in a loop can cost more than the work saved — the win comes from doing a *batch* on the other side.",
        "**`pip install` from source for anyone without a matching wheel**, which turns a missing compiler into a failed deploy."
      ]},
      { t: "p", text: "**None of this argues against it** — `numpy`, `pydantic-core` and `orjson` are all native and all worth it. It argues for being sure the alternative is exhausted, because the cost is permanent and the benefit is bounded by Amdahl." }
    ]},

    { t: "h2", n: "04", text: "Speed up, or scale out", id: "scale" },

    { t: "ladder",
      title: "A batch job that no longer finishes in its window",
      rungs: [
        { level: "bad", label: "Rewrite it in Go",
          why: "Takes a quarter, needs a second deployment story, and abandons every library the job depends on. It also fixes the wrong thing if the job is I/O-bound — which, being a batch job over a database, it very likely is.",
          code: `// six weeks in, reimplementing the CSV quirks
// and the date parsing, and the retry logic...` },
        { level: "ok", label: "Scale out",
          why: "If the work divides cleanly, more workers is a configuration change. It costs money for as long as it runs, and does nothing for a single item that is too slow — but it is available today.",
          code: `# The work is per-customer and independent, so it shards
with ProcessPoolExecutor(max_workers=8) as pool:
    results = pool.map(process_customer, customer_ids, chunksize=16)

# Or across machines, if the queue already exists
for cid in customer_ids:
    queue.enqueue(process_customer, cid)` },
        { level: "best", label: "Fix the algorithm, then scale the remainder",
          why: "The job was quadratic. Making it linear is a one-day change that beats any amount of hardware, and it makes the scaling decision cheaper afterwards because there is less left to scale.",
          code: `# Before: for each order, scan every refund   O(n*m)
for order in orders:
    refunds = [r for r in all_refunds if r.order_id == order.id]

# After: index once                              O(n+m)
by_order = defaultdict(list)
for r in all_refunds:
    by_order[r.order_id].append(r)

for order in orders:
    refunds = by_order[order.id]

# 4 h 20 m  ->  6 min. No new language, no new machines.`,
          note: "**Always ask what the complexity is before asking what the language is.** A language change buys a constant factor; an algorithm change buys a different curve, and the curve wins at every size that matters (Lesson 10.1)." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "The honest comparison", body: [
      { t: "table",
        head: ["", "Speed up", "Scale out"],
        rows: [
          ["Helps a single slow item", "**Yes**", "No"],
          ["Needs the work to divide", "No", "**Yes**"],
          ["Cost shape", "One-off engineering", "Recurring rent"],
          ["Time to first benefit", "Weeks", "**Hours**"],
          ["Adds operational complexity", "A build chain", "Coordination, partial failure, ordering"],
          ["Reversible", "Hard", "**Easy**"]
        ]
      },
      { t: "p", text: "**Scale out first when the work divides and the deadline is near** — it is reversible, and it buys the time to do the other thing properly." },
      { t: "p", text: "**Speed up when the per-item latency is the problem**, when the recurring cost is large enough to fund the work, or when the work genuinely does not divide. A single request that takes eight seconds is not helped by any number of machines." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Say no to a rewrite, with numbers",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "A team proposes rewriting a risk-scoring service in Rust. It handles 400 requests per second at p99 = 2.1 s, and the SLO is 500 ms. They estimate a quarter of work and a 40× speed-up of the scoring code." },
        { t: "code", lang: "python", title: "the profile they attached", numbered: false, code: `
         12,401,203 function calls in 2.084 seconds
   ncalls  tottime  cumtime  filename:lineno(function)
        1    0.000    2.084  service.py:41(score_request)
        1    0.001    1.520  features.py:12(load_features)
      847    0.004    1.498  psycopg/cursor.py:âŸ¨execute⟩
        1    0.002    0.410  model.py:88(predict)
   400000    0.180    0.310  scoring.py:24(_normalise)
        1    0.001    0.148  cache.py:31(get)
        1    0.000    0.006  service.py:77(serialise)`},
        { t: "p", text: "Write the assessment. If the rewrite is wrong, say what to do instead and what it is worth." }
      ],
      requirements: [
        "Compute the best case for the proposed rewrite using Amdahl's law.",
        "Identify the actual bottleneck from the profile and say what it is.",
        "Propose fixes in order of cost, with an estimate for each.",
        "Say whether anything in the profile does justify native code.",
        "State what you would need to see to change your mind.",
        "**Explain the 847 in the `ncalls` column** — it is the most important number on the page."
      ],
      hint: "One line has 847 calls where every other top-level entry has 1. And add up how much of the 2.084 seconds is actually Python doing arithmetic.",
      solution: {
        lang: "python",
        title: "assessment.md",
        code: `# =========================================================================
# THE 847
# =========================================================================
#
#   847    0.004    1.498    psycopg/cursor.py:execute
#
# Eight hundred and forty-seven database round trips in ONE request.
# Every other top-level entry has ncalls=1, so this is a loop issuing a
# query per iteration -- a textbook N+1 (Lesson 10.5).
#
#   1.498 s / 847  =  1.77 ms per query
#
# That is not a slow query. It is a fast query executed 847 times, and
# the cost is 847 x network latency. Note tottime is 0.004 s: the
# database driver is doing almost nothing, it is WAITING.
#
# 1.498 of 2.084 seconds -- 72% of the request -- is round trips.


# =========================================================================
# AMDAHL: WHAT THE REWRITE CAN POSSIBLY BUY
# =========================================================================
#
# Python actually executing (tottime, summed):
#
#   score_request   0.000
#   load_features   0.001
#   execute         0.004
#   predict         0.002
#   _normalise      0.180      <- the only real Python compute
#   cache.get       0.001
#   serialise       0.000
#                   -----
#                   0.188 s   =  9% of 2.084 s
#
# best_case(2.084, hot_fraction=0.09, speedup=40)
#   = (2.084 - 0.188) + 0.188/40
#   = 1.896 + 0.005
#   = 1.901 s
#
#   p99: 2.084 s  ->  1.901 s      an 8.8% improvement
#   SLO: 500 ms                     STILL MISSED BY 4x
#
# A quarter of engineering, a second language in the stack, and a
# permanent build chain, to miss the SLO by 1.4 seconds instead of 1.6.
#
# Even an INFINITE speed-up of the Python leaves 1.896 s. The rewrite
# cannot reach the SLO. That is not an opinion about Rust; it is
# arithmetic on their own profile.


# =========================================================================
# WHAT TO DO INSTEAD, IN ORDER OF COST
# =========================================================================
#
# FIX 1 — the N+1 in load_features            ~2 days      1.498 s -> ~0.02 s
#
#   847 queries become 2: one for the rows, one for the relation, or a
#   single query with a join. At 1.77 ms per round trip the whole 1.498 s
#   collapses to about 4 ms plus a slightly larger result set.
#
#     p99  2.084 -> ~0.59 s
#
#   Guard it with a query-count test so it cannot come back
#   (Lesson 9.7):
#
#     assert len(query_count) <= 3
#
#
# FIX 2 — cache the feature lookup            ~1 day       0.148 s -> ~0.01 s
#
#   cache.py is already there and taking 148 ms, which suggests a miss
#   on every request. Check the hit rate before assuming (Lesson 10.4):
#
#     log.info("cache", extra={"hit_rate": hits / (hits + misses)})
#
#   If features change slowly, a 60-second TTL is nearly free.
#
#     p99  ~0.59 -> ~0.45 s        SLO MET
#
#
# FIX 3 — _normalise, 400k calls              ~2 days      0.180 s -> ~0.01 s
#
#   400,000 calls to one function in a single request is the shape that
#   vectorises. It is homogeneous numeric work over an array:
#
#     values = (values - mean) / std          # numpy, one call
#
#   No new language, no build chain, and numpy is almost certainly
#   already a dependency of the model.
#
#     p99  ~0.45 -> ~0.28 s
#
#
# TOTAL:  ~5 days,  2.084 s -> ~0.28 s,  SLO met with headroom.
#         versus a quarter for ~1.90 s and the SLO still missed.


# =========================================================================
# DOES ANYTHING HERE JUSTIFY NATIVE CODE?
# =========================================================================
#
# No -- and _normalise is the one to look at honestly, because it is the
# only genuine interpreter cost. 400,000 calls at 0.45 us each is real
# Python overhead, and it is exactly what Cython or Rust is for.
#
# But vectorising it gets most of the same win for two days instead of
# a quarter, in a language the team already has. Native code would be
# the right answer if:
#
#   - the operation could NOT be expressed over an array (data-dependent
#     branching per element), and
#   - after fixes 1 and 2, _normalise were still the dominant term.
#
# Neither holds. After fix 1 it is 0.180 of 0.59 s; after fix 2 it is
# 0.180 of 0.45 s -- worth vectorising, not worth a language.


# =========================================================================
# WHAT WOULD CHANGE MY MIND
# =========================================================================
#
# I would support a native component if, AFTER fixes 1-3, a profile
# showed:
#
#   1. Python compute above ~60% of the remaining request time -- so
#      Amdahl leaves room for the work to matter.
#   2. A hot path that resists vectorisation: per-element branching, or
#      a data structure numpy has no equivalent for.
#   3. A stable interface, so the native boundary does not change every
#      sprint and cost a rebuild each time.
#   4. Two people on the team who can debug a segfault, because a memory
#      bug is a crashed worker with no traceback (Lesson 6.6).
#
# The rewrite is not wrong in principle. It is wrong FOURTH -- the
# profile they attached argues against their own proposal, and the
# cheapest fix is worth eight times more than the most expensive one.


# =========================================================================
# THE ONE-LINE VERSION FOR THE MEETING
# =========================================================================
#
#   "Your profile says 72% of the request is 847 database round trips and
#    9% is Python. Amdahl caps the rewrite at an 8.8% improvement, which
#    still misses the SLO by four times. Fixing the N+1 takes two days
#    and gets us most of the way; vectorising _normalise finishes it.
#    Let us do that first and re-profile -- if Python is still the
#    bottleneck afterwards, I will help write the Rust."
`,
        notes: [
          { t: "p", text: "**The `ncalls` column settled the whole argument.** Every top-level entry has one call; `execute` has 847. That single number identifies an N+1 and accounts for 72% of the request — and it was in the profile the team attached to their own proposal." },
          { t: "p", text: "**`tottime` of 0.004 against `cumtime` of 1.498 is the signature of waiting, not working.** The driver spends almost no CPU; it sits in a socket read. That distinction is what tells you a faster language cannot help, and it is why reading both columns matters (Lesson 10.2)." },
          { t: "p", text: "**Amdahl turns a debate into arithmetic.** \"Rust is faster\" is unarguable and irrelevant; \"9% of your runtime is Python, so your ceiling is 8.8% and your SLO needs 76%\" ends the discussion without anyone having to be wrong about Rust." },
          { t: "callout", kind: "insight", title: "Conceding the one real point is what makes the rest land", body: [
            { t: "p", text: "`_normalise` at 400,000 calls genuinely is interpreter overhead, and saying so — rather than defending Python everywhere — is what makes the assessment credible instead of territorial." },
            { t: "p", text: "It also produces a better answer: vectorising captures most of that win in two days, and naming the conditions under which native code *would* be right leaves the door open rather than shutting the conversation down." }
          ]},
          { t: "p", text: "**Stating what would change your mind is the part most assessments omit**, and it is what turns a rejection into a plan. Four falsifiable conditions mean the team can come back with a re-profile rather than a grievance — and if they meet all four, the rewrite has become the right call." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team spends four months porting their recommendation service from Python to Go. The rewrite is competent and the benchmark is real: the scoring loop is 30× faster." },
      { t: "p", text: "**End-to-end latency improves by 6%.** The service spends its time on two database queries and a call to a feature store, and none of that changed. The scoring loop had been 7% of the request all along." },
      { t: "p", text: "**The costs were the part nobody estimated.** Two production languages, a second deployment pipeline, and a scoring implementation that now had to be kept in step with the Python one still used for training — which drifted within two months and caused an incident where offline and online scores disagreed." },
      { t: "p", text: "**Nobody had profiled the request end to end before starting.** They had benchmarked the loop, found it slow, and generalised. **Measure the whole path, compute the ceiling with Amdahl, and fix in order of cost.** The four months would have bought an index, a batched query and a cache — and about 80% of the latency." }
    ]}
  ],

  takeaways: [
    "**Establish that the interpreter is on the critical path before anything else.** Time in `socket.recv` or `psycopg` is waiting, not computing, and no language change touches it.",
    "**Compute the ceiling with Amdahl's law first.** If Python is 9% of the runtime, an infinite speed-up buys 9% — arithmetic that has stopped more bad projects than any review.",
    "**Read `ncalls` as well as the times.** One entry with 847 calls where everything else has one is an N+1, and it is usually the whole problem.",
    "**Fix the algorithm before the language.** A language change buys a constant factor; a complexity change buys a different curve.",
    "**Vectorisation is about expressing the operation over the whole array**, not about using array types — element-wise `numpy` indexing is slower than a plain list.",
    "**Vectorisation needs homogeneous numeric data at scale.** Below a few thousand elements the conversion dominates, and heterogeneous or branch-heavy work does not apply.",
    "**Cython is the cheapest native step** because it starts as your existing Python; **Rust with PyO3 is the best choice for something new**, largely for memory safety.",
    "**A native extension costs a build chain, cross-platform wheels, a second debugging skill, and crashes instead of exceptions** — permanently, and for a benefit Amdahl bounds.",
    "**Crossing the Python/native boundary is not free.** The win comes from doing a batch on the other side, not from calling across it in a loop.",
    "**Scale out when the work divides and the deadline is near** — it is reversible and available in hours. It does nothing for a single slow item.",
    "**Speed up when per-item latency is the problem**, when the recurring cost funds the work, or when the work genuinely does not divide.",
    "**Concede the point where native code is genuinely right**, and state what would change your mind — an assessment with falsifiable conditions is a plan rather than a refusal."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A profile shows Python executing for 9% of a 2-second request. A rewrite promises a 40× speed-up. What is the best possible result?",
        options: [
          "About 50 ms — a 40× improvement",
          "About 1.9 seconds — an 8.8% improvement, because the other 91% is untouched",
          "About 1 second, since the speed-up compounds",
          "It cannot be estimated without benchmarking"
        ],
        answer: 1,
        why: "Amdahl's law: `(total - hot) + hot/speedup`. With `hot` at 0.188 s, even an infinite speed-up leaves 1.896 s. If the SLO is 500 ms the rewrite cannot reach it, which turns an argument about languages into arithmetic on the team's own profile — and is worth computing before any code is written."
      },
      {
        stem: "In a profile, one line reads `847  0.004  1.498  psycopg/cursor.py:execute` while every other top-level entry has `ncalls=1`. What does that mean?",
        options: [
          "The query is slow and needs an index",
          "847 round trips in one request — an N+1 — and `tottime` of 0.004 shows the driver is waiting, not computing",
          "The connection pool is exhausted",
          "The profiler is double-counting recursive calls"
        ],
        answer: 1,
        why: "1.498 s over 847 calls is 1.77 ms each — a fast query executed far too many times. The near-zero `tottime` against a large `cumtime` is the signature of I/O wait, which is why a faster language cannot help. Fixing the N+1 removes 72% of the request in about two days."
      },
      {
        stem: "Why is `np.array([a[i] * 2 + b[i] for i in range(len(a))])` slower than the same loop over plain lists?",
        options: [
          "`numpy` arrays are stored on disk",
          "Element-wise indexing boxes each value back into a Python object, so you pay array overhead *and* interpreter overhead",
          "The array is copied on every index",
          "`range()` is slower than `zip()`"
        ],
        answer: 1,
        why: "The speed comes from expressing the operation over the whole array — `a * 2 + b` — so the loop runs in C over unboxed memory. Indexing element by element re-boxes every value, which is strictly worse than a list comprehension. It is the most common first-week `numpy` mistake, and the reason \"we tried numpy and it was slower\" is a common report."
      },
      {
        stem: "A batch job misses its window. The work is per-customer and independent. What do you try first?",
        options: [
          "Rewrite the job in a compiled language",
          "Check the complexity — a quadratic scan made linear is a one-day change that beats any hardware — then scale out the remainder if needed",
          "Add more workers immediately",
          "Move the job to a larger machine"
        ],
        answer: 1,
        why: "A language change buys a constant factor; a complexity change buys a different curve, and the curve wins at every size that matters. Scaling out is the right *second* move here because the work divides and it is reversible within hours — but doing it first means renting machines to run a quadratic algorithm faster."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "When would you rewrite a Python component in a compiled language?",
        strong: "When the profile shows the interpreter is genuinely the bottleneck, Amdahl leaves room for the work to matter, and the hot path resists vectorisation. In practice that is rare — most slow services are waiting on I/O.",
        answer: [
          { t: "p", text: "Leading with Amdahl turns it into a calculation rather than a preference, and \"9% of runtime means a 9% ceiling\" is the sentence that ends most of these debates." },
          { t: "p", text: "Naming the permanent costs — a build chain, cross-platform wheels, segfaults instead of exceptions, a narrower pool of maintainers — shows the decision is being made with both columns visible." },
          { t: "p", text: "Conceding where it genuinely is right, and stating falsifiable conditions for changing your mind, is what makes the position credible rather than territorial." }
        ]
      },
      {
        level: "core",
        q: "When does `numpy` actually make things faster?",
        strong: "When the operation is expressed over a whole array, the data is homogeneous and numeric, and there is enough of it that conversion is noise. Element-wise indexing into an array is slower than a plain list.",
        answer: [
          { t: "p", text: "The indexed-`numpy` case is the discriminator — it is why \"we tried numpy and it was slower\" is such a common report, and knowing why shows the mechanism is understood." },
          { t: "p", text: "The conversion cost matters in practice: keeping data in arrays across steps, rather than converting on both ends of every call, is where most of the disappointment comes from." },
          { t: "p", text: "Being clear about what does not vectorise — per-element branching, heterogeneous records — stops it being offered as a universal answer." }
        ]
      },
      {
        level: "advanced",
        q: "Speed up or scale out?",
        strong: "Scale out when the work divides and the deadline is near — it is reversible and available in hours. Speed up when per-item latency is the problem, when the recurring cost funds the engineering, or when the work does not divide.",
        answer: [
          { t: "p", text: "The point that scaling out does nothing for a single slow request is the one that decides most real cases, and it is easy to state." },
          { t: "p", text: "The cost shapes — one-off engineering against recurring rent — is the framing a manager can act on, which matters because this is usually a conversation with one." },
          { t: "p", text: "Putting the algorithm check before both is the answer that most often makes the question moot, and it costs a day to find out." }
        ]
      }
    ]
  }
});
