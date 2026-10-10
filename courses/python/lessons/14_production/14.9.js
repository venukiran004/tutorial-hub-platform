/* ============================================================================
   LESSON 14.9 — Debugging Production
   ========================================================================= */
EC.receiveLesson({
  id: "14.9",

  lede: "Debugging production is not debugging with worse tools. **It is a different discipline**: you cannot reproduce, you cannot add a print statement, the system is changing while you look at it, and someone is asking how long. The method that works is the same every time — stabilise, observe, hypothesise, test cheaply, and only then fix.",

  objectives: [
    "Separate mitigation from diagnosis, and do them in that order",
    "Form hypotheses that can be cheaply falsified",
    "Use py-spy, gdb and process introspection on a live process",
    "Diagnose the four failure shapes you will actually meet",
    "Write a postmortem that changes something"
  ],

  prerequisites: ["14.3", "14.8"],

  blocks: [

    { t: "h2", n: "01", text: "Mitigate first", id: "mitigate" },

    {"kind": "steps", "title": "Mitigate first, then diagnose", "caption": "During an incident the order is fixed: stop the bleeding, then understand. Rolling back, scaling, or shedding load buys the time to look inside the process without users paying for it.", "items": [{"label": "Mitigate", "desc": "roll back, restart, scale, feature-flag off", "tone": "crit"}, {"label": "Preserve evidence", "desc": "logs, metrics, a py-spy dump or core before the restart", "tone": "warn"}, {"label": "Diagnose", "desc": "correlate the change, the metric and the trace", "tone": "accent"}, {"label": "Fix and verify", "desc": "a test that reproduces it, then the postmortem", "tone": "good"}], "t": "diagram", "id": "dg-14_9-01-0"},


    { t: "viz",
      title: "The order that keeps you calm",
      caption: "Stopping the bleeding is not the same as understanding the wound. Teams that skip mitigation debug for forty minutes while users are down; teams that skip diagnosis have the same incident again next week.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Five ordered phases of incident response">
  <rect x="20" y="26" width="164" height="88" rx="9" style="fill:var(--surface);stroke:var(--crit)"/>
  <text x="102" y="52" text-anchor="middle" class="s-label" style="fill:var(--crit)">1 · MITIGATE</text>
  <text x="102" y="76" text-anchor="middle" class="s-sub">roll back, scale,</text>
  <text x="102" y="96" text-anchor="middle" class="s-sub">disable the flag</text>

  <rect x="204" y="26" width="164" height="88" rx="9" style="fill:var(--surface);stroke:var(--t-amber)"/>
  <text x="286" y="52" text-anchor="middle" class="s-label" style="fill:var(--t-amber)">2 · OBSERVE</text>
  <text x="286" y="76" text-anchor="middle" class="s-sub">what changed,</text>
  <text x="286" y="96" text-anchor="middle" class="s-sub">and exactly when</text>

  <rect x="388" y="26" width="164" height="88" rx="9" style="fill:var(--surface);stroke:var(--t-blue)"/>
  <text x="470" y="52" text-anchor="middle" class="s-label" style="fill:var(--t-blue)">3 · HYPOTHESISE</text>
  <text x="470" y="76" text-anchor="middle" class="s-sub">a claim that can</text>
  <text x="470" y="96" text-anchor="middle" class="s-sub">be proved wrong</text>

  <rect x="572" y="26" width="164" height="88" rx="9" style="fill:var(--surface);stroke:var(--t-violet)"/>
  <text x="654" y="52" text-anchor="middle" class="s-label" style="fill:var(--t-violet)">4 · TEST</text>
  <text x="654" y="76" text-anchor="middle" class="s-sub">the cheapest</text>
  <text x="654" y="96" text-anchor="middle" class="s-sub">falsification first</text>

  <rect x="756" y="26" width="124" height="88" rx="9" style="fill:var(--surface);stroke:var(--t-green)"/>
  <text x="818" y="52" text-anchor="middle" class="s-label" style="fill:var(--t-green)">5 · FIX</text>
  <text x="818" y="76" text-anchor="middle" class="s-sub">then prevent</text>
  <text x="818" y="96" text-anchor="middle" class="s-sub">the class</text>

  <text x="20" y="160" class="s-sub" style="fill:var(--ink-3)">MITIGATION IS NOT THE FIX. Rolling back stops the harm and buys you the time to understand it.</text>
  <text x="20" y="188" class="s-sub" style="fill:var(--ink-3)">Capture evidence BEFORE mitigating: a heap dump, a stack sample, the logs. Restarting destroys the scene.</text>
  <text x="20" y="216" class="s-sub" style="fill:var(--crit)">The most expensive mistake is changing two things at once — you learn nothing from the recovery.</text>
</svg>`
    },

    { t: "code", lang: "bash", title: "the first five minutes", code: `
# 1. WHAT CHANGED? Most incidents follow a change. Check in this
#    order, because this is the order of likelihood.
kubectl rollout history deploy/app          # a deploy?
git log --since="2 hours ago" --oneline     # merged, not yet deployed?
# feature flags changed?  config changed?  a dependency deployed?
# a certificate expired?  a scheduled job started?

# 2. SCOPE. One endpoint or all? One region? One customer?
#    Answering this eliminates most hypotheses immediately.

# 3. CAPTURE BEFORE YOU MITIGATE. A restart destroys the evidence,
#    and you cannot get it back.
kubectl logs deploy/app --since=30m > incident.log
kubectl top pods
py-spy dump --pid 1 > stacks.txt            # what is it doing NOW
py-spy record --pid 1 -d 30 -o profile.svg  # where the CPU goes

# 4. MITIGATE. One action, then observe.
kubectl rollout undo deploy/app             # the usual answer
# or: scale up, disable the flag, shed load, fail over

# 5. CONFIRM the mitigation worked before doing anything else.
`,
      hl: [12, 18, 21],
      caption: "**Change one thing at a time, even under pressure.** If you roll back and scale up simultaneously and the incident ends, you have not learned which one mattered — and you will need to know that at 3am next month."
    },

    { t: "h2", n: "02", text: "Looking inside a running process", id: "tools" },

    { t: "code", lang: "bash", title: "py-spy — the tool to reach for first", code: `
# py-spy reads another process's memory. It does NOT require the
# process to cooperate, does not need it restarted with a flag, and
# adds essentially no overhead. That combination is why it is the
# first thing to run.

# What is every thread doing, right now?
$ py-spy dump --pid 1
Thread 0x7F2A (active): "MainThread"
    _wait_for_tstate_lock (threading.py:1116)
    join (threading.py:1096)
    shutdown (concurrent/futures/thread.py:235)
    process_batch (app/jobs.py:88)
# -> blocked on a thread join, in process_batch. That is your answer.

# Where is the CPU going, over 30 seconds?
$ py-spy record --pid 1 -d 30 -o profile.svg
# A flame graph. Width is time. The widest box is the problem.

# Live, like top:
$ py-spy top --pid 1

# In Kubernetes it needs SYS_PTRACE, which is worth having available
# as a debug profile you can attach when needed:
#   securityContext:
#     capabilities: { add: ["SYS_PTRACE"] }
# or: kubectl debug -it pod/app --image=python:3.12 --target=app
`,
      hl: [7, 14, 17],
      caption: "**`py-spy dump` answers \"what is it doing?\" in one command**, on a process you did not prepare, in production, without restarting it. Nothing else in the Python ecosystem does that."
    },

    { t: "table",
      head: ["Question", "Tool", "Note"],
      rows: [
        ["What is it doing right now?", "`py-spy dump`", "**No restart, no overhead**"],
        ["Where is the CPU going?", "`py-spy record`", "A flame graph over N seconds"],
        ["What is growing in memory?", "`tracemalloc`, `objgraph`", "Needs to have been enabled"],
        ["What is it doing in C?", "`gdb` + `py-bt`", "For a C extension deadlock"],
        ["Which syscalls?", "`strace -p`", "When you suspect I/O or a hang"],
        ["What is the database doing?", "`pg_stat_activity`", "**Often the real answer**"],
        ["What is the network doing?", "`ss -tanp`", "Connection states, CLOSE_WAIT leaks"]
      ],
      caption: "**Check `pg_stat_activity` early.** A surprising share of \"the application is slow\" incidents are one query, one lock, or one connection pool — and the database tells you directly."
    },

    { t: "h2", n: "03", text: "Four shapes you will meet", id: "shapes" },

    { t: "code", lang: "bash", title: "recognising them by their curve", code: `
# ---- 1. MEMORY GROWS UNTIL OOM -------------------------------------
# Shape: a sawtooth, or a steady climb ending in a restart.
# Cause:  an unbounded cache, an accumulating list, a growing session,
#         a C extension leak, or a reference cycle with __del__.
$ py-spy dump --pid 1
$ kubectl exec pod -- python -c "
import gc, objgraph
objgraph.show_most_common_types(limit=20)"     # what is there?
$ objgraph.show_growth()                        # what is INCREASING?

# ---- 2. LATENCY RISES WITH NO CPU INCREASE -------------------------
# Shape: p99 climbs, CPU flat. Almost always WAITING.
# Cause:  pool exhaustion, a lock, a slow dependency, an N+1.
$ SELECT state, count(*), max(now() - query_start)
  FROM pg_stat_activity GROUP BY state;
$ py-spy dump --pid 1      # if every thread is in .acquire(), it is
                           # a lock or a pool

# ---- 3. EVERYTHING STOPS ------------------------------------------
# Shape: requests stop completing. CPU near zero.
# Cause:  a deadlock, a blocking call on the event loop, a missing
#         timeout on an external call.
$ py-spy dump --pid 1      # every thread blocked on the same thing
$ strace -p 1 -f -e trace=network   # waiting on a socket that never
                                    # answers

# ---- 4. INTERMITTENT, ONE POD, OR ONE CUSTOMER ---------------------
# Shape: some requests fail; most are fine.
# Cause:  one bad pod, one large tenant, a cache-key collision, a race.
$ kubectl get pods -o wide          # is it always the same pod?
# Group your error metric BY POD and BY TENANT. If it is one of
# either, the general theory is wrong.
`,
      hl: [11, 17, 25, 32],
      caption: "**Shape 2 is the most common and the most misdiagnosed.** Rising latency with flat CPU means waiting, and adding capacity to a waiting system makes the queue longer, not shorter."
    },

    { t: "callout", kind: "insight", title: "Hypotheses must be falsifiable and cheap", body: [
      { t: "code", lang: "bash", title: "the difference", numbered: false, code: `
# NOT A HYPOTHESIS -- nothing would disprove it.
"The database is slow."
"There's a memory leak somewhere."
"It's probably the network."

# A HYPOTHESIS -- states what you would see if it were true, and what
# you would see if it were not.
"The 14:02 deploy added a query with no index, so p99 rose at 14:02
 and pg_stat_statements will show a new statement with a high mean
 time and a sequential scan."
#   -> falsified in 30 seconds by one query
#   -> if p99 rose at 13:40, the deploy is not the cause

# ORDER BY COST OF TESTING, NOT BY LIKELIHOOD.
#   30 seconds:  check the deploy time against the metric's inflection
#   2 minutes:   py-spy dump on one pod
#   5 minutes:   pg_stat_activity and pg_stat_statements
#   20 minutes:  reproduce in staging
#   2 hours:     read the diff line by line
# Testing a 20%-likely hypothesis in 30 seconds beats testing an
# 80%-likely one in two hours.`},
      { t: "p", text: "**Write the timeline as you go.** \"p99 rose at 14:02:15; the deploy completed at 14:02:40\" eliminates the deploy in one line — and under pressure, nobody remembers the order of events afterwards." }
    ]},

    { t: "h2", n: "04", text: "A worked incident", id: "worked" },

    { t: "code", lang: "bash", title: "the trail, end to end", code: `
# 09:14  PAGE: checkout error rate 8%, above the 1% SLO.

# 09:15  SCOPE. Errors are 502s, only on POST /checkout. GET routes
#        are healthy. All six pods affected, all regions.
#        -> not one bad pod, not a regional dependency.

# 09:16  WHAT CHANGED? No deploy for 3 days. No flag changes.
#        -> not a code change. Something external, or something
#           accumulating.

# 09:17  py-spy dump on two pods. Both show the same thing:
#          _get_impl (sqlalchemy/pool/base.py:1180)
#          connect (sqlalchemy/engine/base.py:3280)
#          create_order (app/services/ordering.py:42)
#        -> every worker is WAITING FOR A DATABASE CONNECTION.
#           Shape 2: rising latency, flat CPU.

# 09:19  pg_stat_activity:
#          state                | count | max_age
#          idle in transaction  |   94  | 00:41:12
#          active               |    3  | 00:00:02
#        -> 94 connections held open by transactions doing NOTHING,
#           some for 41 minutes. The pool is exhausted by idle
#           transactions, not by load.

# 09:21  Which query opened them?
#          SELECT query, count(*) FROM pg_stat_activity
#          WHERE state = 'idle in transaction' GROUP BY query;
#        -> all from the same statement, in the payment path.

# 09:22  HYPOTHESIS: a transaction is opened, an external call is
#        made inside it, and the call is now hanging -- so the
#        transaction never commits and the connection is never
#        returned.
#        FALSIFIABLE: if true, the payment provider is slow or down.

# 09:23  Confirmed: the provider's status page reports degradation.
#        Their p99 went from 400ms to 45s at 08:30 -- 44 minutes
#        before the page, which matches the pool filling gradually.

# 09:24  MITIGATE: enable the circuit breaker for the provider,
#        failing checkout fast with a clear error rather than holding
#        connections. Error rate stays high but the site recovers --
#        GET routes, cart, and everything else stop being affected.

# 09:31  Provider recovers. Errors return to baseline.
`,
      hl: [17, 22, 29, 41],
      caption: "**The root cause was ours, not theirs.** A third party being slow is a normal condition; a transaction held open across an external call is a design error that converted their degradation into our outage."
    },

    { t: "callout", kind: "trap", title: "The bug the incident revealed", body: [
      { t: "code", lang: "python", title: "one transaction, one network call", numbered: false, code: `
# BEFORE -- the database transaction spans the payment call.
def create_order(cmd: PlaceOrder) -> Order:
    with transaction():                 # connection checked out
        order = Order.new(cmd)
        repo.add(order)
        charge = payments.charge(...)   # 45 SECONDS when they degrade
        order.mark_paid(charge.id)      # connection held throughout

# Normally the call takes 400ms and nobody notices. At 45s, each
# in-flight checkout holds a connection for 45 seconds -- so the pool
# empties in about a minute of ordinary traffic, and then EVERY
# endpoint that needs the database fails, not just checkout.

# AFTER -- three phases, no lock across a network call (Lesson 13.4).
def create_order(cmd: PlaceOrder) -> Order:
    with transaction():                 # milliseconds
        order = Order.new(cmd)
        repo.add(order)

    charge = payments.charge(            # NO transaction held
        ..., idempotency_key=f"order-{order.id}",
        timeout=(3, 10),                 # and a real timeout
    )

    with transaction():                 # milliseconds
        order.mark_paid(charge.id)
        repo.save(order)`},
      { t: "p", text: "**The amplification is what makes this severe.** Checkout failing when payments fail is expected; the whole site failing because checkout held every database connection is the bug, and it is entirely on our side of the boundary." }
    ]},

    { t: "h2", n: "05", text: "The postmortem", id: "postmortem" },

    { t: "code", lang: "bash", title: "what makes one worth writing", code: `
# BLAMELESS. Not politeness -- accuracy. "Alice deployed a bad
# change" stops the analysis at the last human; "the pipeline had no
# gate that would have caught this" continues it to something you can
# fix. A system that fails when one person errs is the finding.

# THE FIVE SECTIONS THAT MATTER:
#
#   1. IMPACT, in user terms and numbers.
#      "17 minutes; 8% of checkouts failed; ~340 customers; ~£12k."
#      Not "the service was degraded."
#
#   2. TIMELINE, with timestamps.
#      08:30 provider latency rose
#      09:14 alert fired            <- 44 MINUTES of unnoticed harm
#      09:24 mitigated
#      This gap is usually the most important number in the document.
#
#   3. ROOT CAUSE, going past the first answer.
#      "The provider was slow"        <- a normal condition
#      "We hold a transaction across an external call"  <- ours
#      "Nothing alerts on pool saturation"              <- also ours
#
#   4. WHAT WENT WELL. Genuinely. If py-spy gave you the answer in
#      three minutes, that is a practice to keep and to teach.
#
#   5. ACTIONS -- each with an owner, a date, and a priority. An
#      action with no owner is a wish.

# THE TEST FOR AN ACTION ITEM: would it have prevented this, or
# detected it sooner, or made recovery faster? "Be more careful" does
# none of the three.
`,
      hl: [1, 14, 20, 27],
      caption: "**The alert gap is usually the finding with the widest application.** Forty-four minutes of unnoticed harm says more about your monitoring than the root cause says about your code."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Work an incident from the evidence",
      difficulty: "expert",
      minutes: 40,
      body: [
        { t: "p", text: "You are on call. This is what you have." },
        { t: "code", lang: "bash", numbered: false, title: "the evidence", code: `
ALERT 03:47  p99 latency 8.2s (SLO 500ms).  Error rate 0.3% (normal).

Metrics over the last 6 hours:
  p99 latency     240ms flat until 02:10, then a smooth rise to 8.2s
  requests/sec    unchanged, ~400
  CPU             12% (normal 11%)
  memory          1.1GB, was 400MB at 02:10, still climbing
  db pool in use  3 of 20 (normal)
  error rate      0.3% (normal)

$ kubectl get pods
NAME          READY  STATUS    RESTARTS  AGE
app-7d4f-x2p  1/1    Running   0         6h
app-7d4f-k9m  1/1    Running   0         6h
app-7d4f-w3q  1/1    Running   0         6h
(all three identical, all three slow)

$ py-spy dump --pid 1
Thread 0x7F1A (active): "MainThread"
    _match (app/routing.py:142)
    resolve (app/routing.py:98)
    __call__ (app/middleware/tenant.py:31)
    ...

Last deploy: 4 days ago.
Config change: 02:05 — "increase tenant cache TTL from 5m to 24h"`},
        { t: "p", text: "Diagnose it. Give your hypothesis, how you would falsify it in under two minutes, your mitigation, the fix, and the postmortem actions." }
      ],
      requirements: [
        "State which failure shape this is, and what it rules out.",
        "Explain why flat CPU with rising latency is significant here — and what makes this case unusual.",
        "Give the hypothesis and its cheapest falsification.",
        "Explain the connection between the config change and the symptom.",
        "Give the immediate mitigation and the real fix.",
        "Write the postmortem actions, with the one that matters most."
      ],
      hint: "The memory graph and the config change share a timestamp. And look carefully at what `py-spy` says the process is doing — it is not waiting.",
      solution: {
        lang: "python",
        title: "incident-2026-09-05.md",
        code: `# =========================================================================
# THE SHAPE
# =========================================================================
#
# At first glance this is SHAPE 2 -- latency rising with flat CPU --
# which normally means WAITING. That reading rules out:
#
#   - a deploy         (4 days ago; the inflection is at 02:10)
#   - one bad pod      (all three identical)
#   - traffic          (RPS unchanged)
#   - the database     (pool at 3/20; nothing is waiting on it)
#   - an error path    (error rate normal -- requests SUCCEED, slowly)
#
# BUT THE py-spy DUMP CONTRADICTS THE FLAT-CPU READING.
#
#   _match (app/routing.py:142)
#
# The process is not blocked on a lock or a socket -- it is EXECUTING
# Python, in a matching function. So this is not waiting; it is
# WORKING TOO HARD.
#
# WHY IS CPU ONLY 12% THEN? Because 12% is the average across a
# multi-core container over a scrape interval. A single-threaded
# event loop saturating ONE core of eight shows as ~12%. The metric
# is not lying; it is the wrong aggregation for a single-threaded
# process.
#
# THAT IS THE LESSON IN THIS CASE: a py-spy dump takes ten seconds
# and beats an inference from a container-level metric. Always look
# at what the process is actually doing.
#
#
# =========================================================================
# THE TIMELINE
# =========================================================================
#
#   02:05   config change: tenant cache TTL 5m -> 24h
#   02:10   memory begins climbing; latency begins rising
#   03:47   alert fires at 8.2s
#
# 5 minutes between the change and the inflection. 97 MINUTES between
# the inflection and the alert -- which is its own finding.
#
# The correlation is not subtle: memory and latency both begin
# climbing within minutes of the change, and nothing else changed.
#
#
# =========================================================================
# THE HYPOTHESIS
# =========================================================================
#
#   "Raising the tenant cache TTL from 5 minutes to 24 hours turned a
#    bounded cache into an unbounded one. Entries that previously
#    expired now accumulate, and the routing code does a LINEAR SCAN
#    over the cache on every request -- so per-request work grows
#    with cache size, which grows with time."
#
# IT PREDICTS, precisely:
#   - memory grows steadily and does not plateau            [matches]
#   - latency grows in proportion to memory                 [matches]
#   - CPU is high on ONE core, low on average               [matches]
#   - RPS, errors and the database are unaffected           [matches]
#   - a restart fixes it TEMPORARILY, then it recurs        [testable]
#
# IT WOULD BE FALSIFIED BY: memory plateauing, latency not tracking
# memory, or the cache being small.
#
#
# =========================================================================
# FALSIFICATION, IN UNDER TWO MINUTES
# =========================================================================
#
# TEST 1 -- how big is the cache? (~20 seconds)
#
#   $ kubectl exec app-7d4f-x2p -- python -c "
#     from app.middleware.tenant import _tenant_cache
#     print(len(_tenant_cache))"
#     847293
#
#   847,000 entries where 5-minute expiry previously kept it at a few
#   thousand. HYPOTHESIS SUPPORTED.
#
# TEST 2 -- is the routing code linear in cache size? (~40 seconds)
#
#   $ kubectl exec app-7d4f-x2p -- sed -n '138,146p' app/routing.py
#     138  def _match(self, host: str, cache: dict) -> Tenant | None:
#     139      for key, tenant in cache.items():       # O(n)
#     140          if tenant.matches_host(host):
#     141              return tenant
#     142      return None
#
#   A full scan of 847,000 entries, calling matches_host on each, on
#   EVERY REQUEST. At 400 RPS that is ~340 million comparisons per
#   second. CONFIRMED.
#
# TEST 3 -- confirm causality (~30 seconds)
#
#   $ kubectl delete pod app-7d4f-x2p
#   # The replacement starts with an empty cache. If latency on that
#   # pod returns to 240ms, the cache is the cause.
#   -> it does.
#
# Under two minutes, three tests, no guessing.
#
#
# =========================================================================
# MITIGATION
# =========================================================================
#
# IMMEDIATE (2 minutes): revert the config change.
#
#   $ kubectl set env deploy/app TENANT_CACHE_TTL=300
#   $ kubectl rollout restart deploy/app
#
# Reverting the TTL alone is not enough -- the existing entries live
# for 24 hours from when they were written, so the restart is what
# clears them. Do both.
#
# Latency returns to 240ms within a minute of the rollout completing.
#
# NOTE: revert first, understand second. The config change is the
# smallest, most reversible action available, and it is one change --
# so if latency recovers, the causal link is established rather than
# assumed.
#
#
# =========================================================================
# THE REAL FIX
# =========================================================================
#
# The config change EXPOSED the bug; it did not cause it. A linear
# scan on every request is wrong at any TTL -- the 5-minute expiry
# was accidentally keeping the cache small enough to hide it.
#
# ---- 1. THE ALGORITHM. O(n) -> O(1). -----------------------------

# BEFORE
def _match(self, host: str, cache: dict) -> Tenant | None:
    for key, tenant in cache.items():        # scans everything
        if tenant.matches_host(host):
            return tenant
    return None

# AFTER -- index by what is looked up.
def _match(self, host: str, cache: dict[str, Tenant]) -> Tenant | None:
    return cache.get(host)                   # O(1), always

# The cache was keyed by tenant id and searched by host, which is why
# the scan existed at all. Keying by host removes it entirely.


# ---- 2. THE CACHE. Bounded, not merely expiring. ------------------

from cachetools import TTLCache

# maxsize is the important half. A TTL bounds how STALE an entry
# gets; only maxsize bounds how MANY there are -- and it was the
# count, not the staleness, that caused this.
_tenant_cache: TTLCache[str, Tenant] = TTLCache(maxsize=10_000, ttl=3600)

# Now the TTL is a freshness decision, and it cannot affect memory or
# latency. The 24-hour TTL would have been perfectly safe here.


# ---- 3. VISIBILITY. -----------------------------------------------

cache_size = Gauge("tenant_cache_entries", "Entries in the tenant cache")
cache_hits = Counter("tenant_cache_hits_total", "Hits", ["result"])

# An unbounded structure with no metric is invisible until it is an
# incident. This gauge would have shown the growth at 02:15.


# =========================================================================
# POSTMORTEM
# =========================================================================
#
# IMPACT
#   97 minutes of degraded latency (240ms -> 8.2s p99).
#   No errors; every request succeeded, slowly. Estimated 140,000
#   requests served above the 500ms SLO.
#
# ROOT CAUSE
#   A linear scan over an unbounded cache in the request path. A TTL
#   reduction had been holding the cache small enough to mask it; the
#   TTL increase removed that accident.
#
# TRIGGER
#   Config change at 02:05 raising the tenant cache TTL.
#
#   NOTE THE DISTINCTION. The config change was reasonable and
#   correctly reviewed. It was the TRIGGER, not the cause. A
#   postmortem that stops at "we changed the TTL" produces the action
#   item "be careful with config" -- which prevents nothing, and
#   discourages a change that was actually a good idea.
#
# CONTRIBUTING FACTORS
#   - No alert on latency until it was 16x the SLO
#   - No metric on cache size
#   - The cache had no maxsize
#   - CPU appeared normal because a single-threaded saturation reads
#     as 12% on an 8-core container
#
# WHAT WENT WELL
#   - py-spy gave the answer in one command, on an unmodified process
#   - The timeline correlation was unambiguous once written down
#   - Mitigation was one reversible action
#
# ---- ACTIONS ------------------------------------------------------
#
#   P0  Alert on p99 latency > 2x SLO for 5 minutes.
#       Owner: platform.  Due: this week.
#
#       THIS IS THE ONE THAT MATTERS MOST. The bug is one line and
#       will be fixed today. The 97-MINUTE ALERT GAP is a property of
#       our monitoring that applies to EVERY future incident -- and
#       the reason it existed is that we alert on errors and
#       saturation, but not on latency. A service that is up and
#       unusable triggered nothing.
#
#   P0  Index the tenant cache by host; remove the linear scan.
#       Owner: tenancy team.  Due: today.
#
#   P1  Add maxsize to every cache. Audit for others.
#       Owner: tenancy team.  Due: this week.
#       $ grep -rn "cache\\|_cache = {}" src/ | grep -v maxsize
#
#   P1  Export a size metric for every cache and unbounded structure.
#       Owner: platform.  Due: two weeks.
#
#   P2  Add a load test with a realistic tenant count, so O(n) in the
#       request path fails in CI rather than at 03:47.
#       Owner: platform.  Due: this month.
#
#   P2  Document that container CPU% is misleading for single-
#       threaded processes; add per-core CPU to the service dashboard.
#       Owner: platform.  Due: this month.
#
# NOT AN ACTION: "review config changes more carefully." The change
# was correct. The system should tolerate it.
#
#
# =========================================================================
# THE REGRESSION TESTS
# =========================================================================

def test_tenant_lookup_is_constant_time():
    """The bug, pinned. Without this the next refactor can quietly
    reintroduce a scan and nothing fails."""
    small = build_cache(100)
    large = build_cache(1_000_000)

    t_small = timeit(lambda: _match("acme.example.com", small), number=1000)
    t_large = timeit(lambda: _match("acme.example.com", large), number=1000)

    # A 10,000x size difference must not produce a meaningful time
    # difference.
    assert t_large < t_small * 3


def test_the_cache_is_bounded():
    """maxsize, not just ttl. It was the COUNT that caused this."""
    for i in range(50_000):
        _tenant_cache[f"tenant-{i}.example.com"] = make_tenant(i)

    assert len(_tenant_cache) <= 10_000


def test_no_cache_in_the_codebase_is_unbounded():
    """Generalise the finding. The specific cache is fixed; this
    stops the next one."""
    unbounded = [
        (path, n) for path, n, line in cache_declarations("src/")
        if "maxsize" not in line
    ]
    assert unbounded == [], f"unbounded caches: {unbounded}"


def test_latency_does_not_degrade_with_tenant_count():
    """The load test that would have caught this in CI."""
    seed_tenants(500_000)

    p99 = load_test(rps=400, duration=30).percentile(99)

    assert p99 < 0.5, f"p99 {p99}s exceeds the 500ms SLO"`,
        notes: [
          { t: "p", text: "**The `py-spy` dump contradicts the flat-CPU reading, and it wins.** The process is executing `_match`, not blocking — so this is not waiting despite looking like shape 2. Twelve percent is a single-threaded process saturating one core of eight, averaged over a container-level metric." },
          { t: "p", text: "**The config change was the trigger, not the cause.** A linear scan on every request is wrong at any TTL; the five-minute expiry had been accidentally keeping the cache small enough to hide it. Stopping the analysis at the change produces \"be careful with config\", which prevents nothing and discourages a change that was correct." },
          { t: "callout", kind: "insight", title: "A TTL bounds staleness; only maxsize bounds size", body: [
            { t: "p", text: "The distinction is the whole incident. Entries expiring after five minutes kept the count low as a side effect, so nobody noticed the cache had no limit — and raising the TTL removed the accident without changing anything about the cache's design." },
            { t: "p", text: "With `maxsize=10_000` in place, the 24-hour TTL would have been entirely safe. The freshness decision and the memory decision become independent, which is what they should have been." }
          ]},
          { t: "p", text: "**The 97-minute alert gap is the finding with the widest application.** The bug is one line and will be fixed today; the fact that a service can be up and unusable for an hour and a half without paging anyone applies to every future incident — and it exists because the team alerts on errors and saturation but not on latency." },
          { t: "p", text: "**Reverting the config first is both mitigation and evidence.** It is the smallest reversible action available and it is one change, so latency recovering establishes the causal link rather than leaving it assumed." },
          { t: "p", text: "**Keying the cache by host removes the scan entirely.** The cache was keyed by tenant id and searched by host, which is why a scan existed at all — the algorithmic fix is not an optimisation but a correction of the data structure to match its access pattern." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team spent three hours debugging a slow endpoint during an incident. They read the code, added logging, deployed twice, and tried to reproduce it in staging." },
      { t: "p", text: "**A `py-spy dump` would have taken ten seconds.** Every worker was blocked in the same function — a regex compiled inside a loop, on a pattern built from user input — and the stack trace named the line." },
      { t: "p", text: "**They had never used py-spy**, and did not know it works on an unmodified running process without a restart. Adding it to the debug container image and writing a three-line runbook entry cost an afternoon." },
      { t: "p", text: "**The tools you have not used before an incident are tools you do not have during one.** Practise them on a healthy system, so the first time is not at 3am." }
    ]}
  ],

  takeaways: [
    "**Mitigate first, diagnose second** — but capture evidence before mitigating, because a restart destroys the scene.",
    "**Change one thing at a time, even under pressure.** Two simultaneous actions and a recovery teaches you nothing.",
    "**Ask what changed, in order of likelihood**: a deploy, a config change, a flag, a dependency, a certificate, a scheduled job.",
    "**Scope before theorising.** One endpoint or all, one pod or every pod, one tenant or everyone — the answer eliminates most hypotheses instantly.",
    "**`py-spy dump` answers \"what is it doing?\"** on an unmodified production process, with no restart and no overhead.",
    "**Order hypotheses by cost of testing, not by likelihood.** A thirty-second test of a 20%-likely theory beats a two-hour test of an 80%-likely one.",
    "**A hypothesis must state what you would see if it were false.** \"The database is slow\" is not one.",
    "**Rising latency with flat CPU usually means waiting** — but check with `py-spy` first: a single-threaded process saturating one core shows as low average CPU.",
    "**Check `pg_stat_activity` early.** \"Idle in transaction\" with a large count means a transaction is held across something slow.",
    "**A transaction held across a network call converts a third party's degradation into your outage**, and that amplification is your bug, not theirs.",
    "**A TTL bounds staleness; only `maxsize` bounds size.** An expiring cache with no limit is unbounded, and something else is accidentally keeping it small.",
    "**Write the timeline as you go.** The gap between impact starting and the alert firing is usually the most important number in the postmortem.",
    "**Distinguish the trigger from the cause.** A postmortem that stops at \"we changed the config\" produces \"be careful\", which prevents nothing.",
    "**Every action item must have prevented it, detected it sooner, or made recovery faster** — with an owner and a date."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Latency is rising, CPU shows 12%, and `py-spy dump` shows every thread executing a Python function. What does this mean?",
        options: [
          "The process is waiting on I/O",
          "It is CPU-bound — a single-threaded process saturating one core of eight averages to ~12% at the container level",
          "py-spy is sampling incorrectly",
          "The metric scrape interval is too long"
        ],
        answer: 1,
        why: "Container CPU percentage is averaged across cores, so it is the wrong aggregation for a single-threaded event loop. The stack dump is direct evidence of what the process is doing and beats an inference from an aggregate metric — which is why running it early is worth the ten seconds."
      },
      {
        stem: "`pg_stat_activity` shows 94 connections \"idle in transaction\", some for 41 minutes. What does that indicate?",
        options: [
          "The connection pool is too small",
          "Transactions are being held open across something slow — typically an external call inside the transaction",
          "The database needs vacuuming",
          "Queries are missing indexes"
        ],
        answer: 1,
        why: "Idle in transaction means a transaction is open and doing nothing, so its connection is unavailable. An HTTP call inside a transaction is the usual cause: at 400ms nobody notices, and when the provider degrades to 45 seconds the pool empties and every database-using endpoint fails, not just the affected one."
      },
      {
        stem: "Raising a cache TTL from 5 minutes to 24 hours causes memory and latency to climb. What is the root cause?",
        options: [
          "The TTL change — revert it and add a review process for config",
          "The cache has no `maxsize` and the lookup is a linear scan; the short TTL was accidentally hiding both",
          "24 hours is too long for any cache",
          "Memory pressure is triggering garbage collection"
        ],
        answer: 1,
        why: "A TTL bounds how stale an entry gets; only `maxsize` bounds how many there are. The change was the trigger, not the cause — with a bounded cache and an O(1) lookup the 24-hour TTL would have been entirely safe, and stopping at \"revert the config\" produces an action item that prevents nothing."
      },
      {
        stem: "An incident's timeline shows impact starting at 02:10 and the alert firing at 03:47. Which finding generalises furthest?",
        options: [
          "The root cause in the application code",
          "The 97-minute detection gap — the code bug is one line, but the monitoring gap applies to every future incident",
          "The config change process",
          "The mitigation took too long"
        ],
        answer: 1,
        why: "A specific bug gets fixed today. A service that can be up and unusable for an hour and a half without paging anyone will be again — usually because the team alerts on errors and saturation but not on latency, so a slow-but-working service triggers nothing."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "Walk me through how you would debug a production incident.",
        strong: "Capture evidence, mitigate with one reversible action, then diagnose: what changed, what is the scope, and a falsifiable hypothesis tested cheapest-first. Fix the cause, then close the detection gap.",
        answer: [
          { t: "p", text: "Separating mitigation from diagnosis is the structure interviewers are listening for — and capturing evidence before restarting is the detail that shows experience." },
          { t: "p", text: "Ordering hypotheses by cost of testing rather than by likelihood is a genuinely useful heuristic and is uncommon to hear." },
          { t: "p", text: "Naming the change-one-thing rule shows you have been in a room where two people changed two things and nobody learned anything." }
        ]
      },
      {
        level: "expert",
        q: "A service is slow and you cannot reproduce it. What tools do you reach for?",
        strong: "`py-spy dump` first — it shows what an unmodified production process is doing in one command. Then `pg_stat_activity`, then a `py-spy record` flame graph if it is CPU-bound.",
        answer: [
          { t: "p", text: "Leading with py-spy and explaining why — no restart, no cooperation, no overhead — shows you have actually used it in anger." },
          { t: "p", text: "Checking the database early is worth stating: a large share of \"the application is slow\" incidents are one query or one lock." },
          { t: "p", text: "Mentioning that unfamiliar tools are unavailable during an incident, so you practise on healthy systems, is a good closing thought." }
        ]
      },
      {
        level: "advanced",
        q: "What makes a postmortem useful?",
        strong: "Impact in numbers, a timestamped timeline, a root cause that goes past the trigger, and actions with owners and dates that would have prevented, detected or shortened it.",
        answer: [
          { t: "p", text: "The trigger-versus-cause distinction is the substance — \"we changed the config\" yields \"be careful\", which prevents nothing." },
          { t: "p", text: "Highlighting the detection gap as the most transferable finding shows you think about the next incident rather than this one." },
          { t: "p", text: "Framing blamelessness as accuracy rather than politeness is the version that convinces sceptical engineers." }
        ]
      }
    ]
  }
});
