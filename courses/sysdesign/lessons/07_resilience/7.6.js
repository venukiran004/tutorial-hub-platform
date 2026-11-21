/* ============================================================================
   LESSON 7.6 — The Gatekeeper: Every Strategy for Too Many Requests
   Every number below comes from running the code in this lesson.
   ========================================================================= */
EC.receiveLesson({
  id: "7.6",

  lede: "Lessons 7.1 to 7.4 built the parts — retries, breakers, limiters, shedding. This lesson puts **every one of them in front of the same rate-limited upstream** and measures what each buys. The results are not subtle: retrying instantly made **5,905 upstream calls to get 5 answers**; per-request backoff alone still failed 252 of 300; a shared cool-down or a token bucket got all 300 through but took 19–23 seconds; and the composed gatekeeper got all 300 through with **121 upstream calls and 13 rejections**, because the cheapest request is the one you never send.",

  objectives: [
    "Name the strategies for too many requests and say which quantity each one bounds: rate, concurrency, cost or duplicates",
    "Explain why per-request backoff fails against a burst and a shared cool-down does not",
    "Diagnose a control that bounds the wrong quantity, using Little's law",
    "Compose a gatekeeper in the order that wastes the fewest upstream calls, and place the deadline check correctly",
    "Protect a quiet tenant from a noisy one with per-tenant budgets, and measure the effect"
  ],

  prerequisites: ["7.1", "7.2", "7.3", "7.4"],

  blocks: [

    { t: "h2", n: "01", id: "upstream", text: "One upstream, three limits",
      sub: "An LLM API is limited on requests, concurrency and tokens at the same time" },

    { t: "p", text: "Model providers enforce several limits at once: requests per minute, tokens per minute, and often concurrent requests. Exceed any of them and you get a `429 Too Many Requests` with a `Retry-After` header. The simulated upstream below enforces all three — scaled to seconds so the experiment runs in under a minute — and every strategy in this lesson is measured against it with the same burst: 300 requests arriving at once, about 60 % of them repeating an earlier prompt, as real traffic does." },

    { t: "code", lang: "python", title: "gatekeeper.py — the upstream",
      code: `class TooManyRequests(Exception):
    def __init__(self, retry_after): self.retry_after = retry_after

class Upstream:
    """Enforces 20 requests/s (sliding 1 s window), 5 in flight and 6,000 tokens/s; work takes ~1 ms per 20 tokens."""
    RPS, CONCURRENCY, TPS = 20, 5, 6000
    def __init__(self):
        self.starts, self.tokens, self.in_flight, self.calls, self.rejected = deque(), deque(), 0, 0, 0
    async def complete(self, tokens):
        now = time.monotonic(); self.calls += 1
        while self.starts and now - self.starts[0] > 1: self.starts.popleft()
        while self.tokens and now - self.tokens[0][0] > 1: self.tokens.popleft()
        used = sum(t for _, t in self.tokens)
        if len(self.starts) >= self.RPS or self.in_flight >= self.CONCURRENCY or used + tokens > self.TPS:
            self.rejected += 1
            wait = max(0.05, 1 - (now - self.starts[0])) if self.starts else 0.05
            raise TooManyRequests(retry_after=round(wait, 2))
        self.starts.append(now); self.tokens.append((now, tokens)); self.in_flight += 1
        try:
            await asyncio.sleep(tokens / 20_000)
            return f"answer({tokens})"
        finally:
            self.in_flight -= 1`,
      caption: "A sliding one-second window for requests and tokens, and a counter for concurrency. Retry-After is the time until the oldest request leaves the window, as a real limiter would report it." },

    { t: "table", head: ["Strategy", "What it bounds", "Where it runs", "Reacts or prevents"],
      rows: [
        ["Semaphore (concurrency cap)", "Requests in flight", "Client or server", "Prevents"],
        ["Token bucket / leaky bucket (Lesson 7.3)", "Request rate, with a burst allowance", "Client or server", "Prevents"],
        ["Token budget (reserve estimated tokens)", "Cost per second — what LLM limits are really about", "Client", "Prevents"],
        ["Backoff with jitter, honouring Retry-After (Lesson 7.1)", "Retry timing, per request", "Client", "Reacts"],
        ["Shared cool-down", "All callers' timing after one 429", "Client", "Reacts"],
        ["Circuit breaker (Lesson 7.2)", "Calls to a dependency that is failing", "Client", "Reacts"],
        ["Adaptive concurrency (AIMD)", "In-flight requests, learnt from 429s", "Client", "Reacts, then prevents"],
        ["Deadline-based shedding (Lesson 7.4)", "Work whose caller has already given up", "Client or server", "Prevents waste"],
        ["Request coalescing (single-flight)", "Duplicate identical requests", "Client or server", "Prevents"],
        ["Per-tenant budgets", "One tenant's share of the capacity", "Server or gateway", "Prevents starvation"]
      ],
      caption: "The column that matters most is the second: each strategy bounds one quantity, and the upstream will reject you for whichever quantity you did not bound." },

    { t: "h2", n: "02", id: "parts", text: "The building blocks",
      sub: "Each one small enough to read in a minute" },

    { t: "code", lang: "python", title: "gatekeeper.py — token bucket, cool-down, AIMD, single-flight, backoff",
      code: `class TokenBucket:
    """rate tokens per second, up to capacity; acquire waits until a token is available."""
    def __init__(self, rate, capacity):
        self.rate, self.capacity, self.level, self.t = rate, capacity, capacity, time.monotonic()
        self.lock = asyncio.Lock()
    async def acquire(self, n=1):
        async with self.lock:                          # one waiter at a time: FIFO, no stampede on refill
            while True:
                now = time.monotonic(); self.level = min(self.capacity, self.level + (now - self.t) * self.rate); self.t = now
                if self.level >= n: self.level -= n; return
                await asyncio.sleep((n - self.level) / self.rate)

class CoolDown:
    """One 429 pauses EVERY caller until the upstream's Retry-After has passed."""
    def __init__(self): self.until = 0.0
    def trip(self, seconds): self.until = max(self.until, time.monotonic() + seconds)
    async def wait(self):
        while (d := self.until - time.monotonic()) > 0: await asyncio.sleep(d)

class AIMD:
    """Adaptive concurrency: +1 slot per success window, halve on a 429 (TCP's congestion rule)."""
    def __init__(self, start=1, ceiling=50):
        self.limit, self.ceiling, self.in_flight, self.ok = start, ceiling, 0, 0
        self.cond = asyncio.Condition()
    async def __aenter__(self):
        async with self.cond:
            await self.cond.wait_for(lambda: self.in_flight < int(self.limit)); self.in_flight += 1
    async def __aexit__(self, *exc):
        async with self.cond: self.in_flight -= 1; self.cond.notify_all()
    def success(self):
        self.ok += 1
        if self.ok >= int(self.limit): self.limit = min(self.ceiling, self.limit + 1); self.ok = 0
    def throttled(self): self.limit = max(1, self.limit / 2); self.ok = 0

class SingleFlight:
    """Identical in-flight requests share one upstream call."""
    def __init__(self): self.inflight = {}
    async def do(self, key, fn):
        if key in self.inflight: return await asyncio.shield(self.inflight[key])
        task = asyncio.ensure_future(fn()); self.inflight[key] = task
        try: return await task
        finally: self.inflight.pop(key, None)

async def with_backoff(call, cool=None, attempts=6, base=0.05, cap=2.0):
    """Retry 429s with full-jitter exponential backoff, never sooner than Retry-After."""
    for attempt in range(attempts):
        try:
            return await call()
        except TooManyRequests as e:
            if attempt == attempts - 1: raise
            if cool: cool.trip(e.retry_after)
            await asyncio.sleep(max(e.retry_after, random.uniform(0, min(cap, base * 2 ** attempt))))`,
      caption: "The token bucket's lock makes waiters queue in order instead of all waking on the same refill. The cool-down is a single shared timestamp. AIMD is TCP's congestion rule applied to concurrency. Backoff waits for the larger of Retry-After and a random full-jitter delay." },

    { t: "callout", kind: "trap", title: "Retrying a 429 immediately",
      body: [{ t: "p", text: "The naive client below retries as soon as it is told no. It made **5,905 upstream calls for 5 successes**: every rejection is a request the upstream still had to receive, parse and refuse, so instant retries turn your own overload into theirs — and many providers count rejected requests against your limit. A 429 is an instruction about time. Honour `Retry-After`, or at the very least back off." }] },

    { t: "h2", n: "03", id: "measured", text: "Every strategy, measured",
      sub: "Same upstream, same burst" },

    { t: "code", lang: "python", title: "gatekeeper.py — the workload, the strategies and the run",
      code: `# ---------------------------------------------------------------- the workload: a burst, with repeats
def workload(seed=0, n=300):
    rng = random.Random(seed)
    prompts = [f"prompt-{rng.randint(0, 120)}" for _ in range(n)]          # ~60% of the burst repeats a prompt
    return [(p, rng.randint(100, 600)) for p in prompts]

async def run(name, handler, deadline=None):
    random.seed(1); up = Upstream(); jobs = workload(); lat, ok, failed, shed = [], 0, 0, 0
    tokens_of = {p: t for p, t in jobs}
    async def one(prompt, tokens):
        nonlocal ok, failed, shed
        t0 = time.monotonic()
        try:
            await handler(up, prompt, tokens_of[prompt], t0, deadline); ok += 1; lat.append(time.monotonic() - t0)
        except TimeoutError: shed += 1
        except TooManyRequests: failed += 1
    t0 = time.monotonic()
    await asyncio.gather(*(one(p, t) for p, t in jobs))
    q = statistics.quantiles(lat, n=20) if len(lat) > 1 else [0] * 19
    print(f"{name:<34} ok {ok:>3}  failed {failed:>3}  shed {shed:>3}  upstream calls {up.calls:>5}  429s {up.rejected:>5}  "
          f"p50 {q[9]:5.2f}s  p95 {q[18]:5.2f}s  wall {time.monotonic() - t0:5.1f}s")

# ---------------------------------------------------------------- the strategies
async def naive(up, p, t, t0, dl):                       # fire, and retry instantly on 429
    for _ in range(20):
        try: return await up.complete(t)
        except TooManyRequests: pass
    raise TooManyRequests(0)

def semaphore_only(n):
    sem = asyncio.Semaphore(n)
    async def h(up, p, t, t0, dl):
        async with sem: return await with_backoff(lambda: up.complete(t), attempts=1)
    return h

async def backoff_only(up, p, t, t0, dl): return await with_backoff(lambda: up.complete(t))

def cooldown_backoff():
    cool = CoolDown()
    async def h(up, p, t, t0, dl):
        async def call(): await cool.wait(); return await up.complete(t)
        return await with_backoff(call, cool)
    return h

def token_bucket_backoff():
    rpm = TokenBucket(rate=18, capacity=5)                # a little under the 20/s limit, small burst
    async def h(up, p, t, t0, dl):
        async def call(): await rpm.acquire(); return await up.complete(t)
        return await with_backoff(call)
    return h

def aimd_backoff():
    ctl = AIMD()
    async def h(up, p, t, t0, dl):
        async def call():
            async with ctl:
                try: r = await up.complete(t); ctl.success(); return r
                except TooManyRequests: ctl.throttled(); raise
        return await with_backoff(call)
    return h

def gatekeeper():
    """All of it: coalesce -> deadline check -> request bucket -> token budget -> concurrency cap -> cool-down + backoff."""
    flight, rps, tps, sem, cool = SingleFlight(), TokenBucket(18, 5), TokenBucket(5500, 5500), asyncio.Semaphore(5), CoolDown()
    async def h(up, p, t, t0, dl):
        async def call():
            await cool.wait()
            await rps.acquire(); await tps.acquire(t)                     # reserve the request and its tokens
            if dl and time.monotonic() - t0 > dl: raise TimeoutError     # shed AFTER queueing: the caller has given up,
            async with sem: return await up.complete(t)                   # so do not spend an upstream call on it
        return await flight.do(p, lambda: with_backoff(call, cool))
    return h

async def main():
    print(f"upstream: {Upstream.RPS} req/s, {Upstream.CONCURRENCY} in flight, {Upstream.TPS:,} tokens/s; "
          f"workload: a burst of 300 requests, ~60% repeats\\n")
    await run("naive: retry immediately", naive)
    await run("semaphore(5), no retry", semaphore_only(5))
    await run("backoff + jitter + Retry-After", backoff_only)
    await run("shared cool-down + backoff", cooldown_backoff())
    await run("token bucket (18/s) + backoff", token_bucket_backoff())
    await run("AIMD concurrency + backoff", aimd_backoff())
    await run("gatekeeper (all of the above)", gatekeeper())
    await run("gatekeeper, 3 s deadline", gatekeeper(), deadline=3.0)

if __name__ == "__main__":
    asyncio.run(main())`,
      out: `upstream: 20 req/s, 5 in flight, 6,000 tokens/s; workload: a burst of 300 requests, ~60% repeats

naive: retry immediately           ok   5  failed 295  shed   0  upstream calls  5905  429s  5900  p50  0.03s  p95  0.03s  wall   0.0s
semaphore(5), no retry             ok  19  failed 281  shed   0  upstream calls   300  429s   281  p50  0.05s  p95  0.09s  wall   0.1s
backoff + jitter + Retry-After     ok  48  failed 252  shed   0  upstream calls  1716  429s  1668  p50  3.09s  p95  4.22s  wall   4.2s
shared cool-down + backoff         ok 300  failed   0  shed   0  upstream calls   367  429s    67  p50 14.20s  p95 21.42s  wall  22.5s
token bucket (18/s) + backoff      ok 300  failed   0  shed   0  upstream calls   338  429s    38  p50  8.88s  p95 17.28s  wall  18.9s
AIMD concurrency + backoff         ok  60  failed 240  shed   0  upstream calls  1626  429s  1566  p50  1.11s  p95  2.27s  wall   3.2s
gatekeeper (all of the above)      ok 300  failed   0  shed   0  upstream calls   121  429s    13  p50  2.58s  p95  6.00s  wall   6.8s
gatekeeper, 3 s deadline           ok 171  failed   0  shed 129  upstream calls    59  429s     5  p50  1.45s  p95  2.86s  wall   6.0s`,
      caption: "Timings vary slightly between runs because this is real asyncio on a real clock; the ordering does not." },

    { t: "callout", kind: "insight", title: "Per-request backoff fails against a burst; a shared cool-down does not",
      body: [{ t: "p", text: "With backoff alone, each of 300 callers waits for its own jittered delay, and then they arrive again — still far more than 20 per second — so 252 of them exhaust their attempts. The shared cool-down turns one 429 into a pause for **every** caller, and the token bucket goes further by never sending faster than the limit in the first place: 38 rejections instead of 1,668. Prevention beats reaction because a rejected request still costs a round trip and counts against you." }] },

    { t: "callout", kind: "trap", title: "Bounding the wrong quantity",
      body: [{ t: "p", text: "Adaptive concurrency is a good control, and here it failed: 240 of 300 requests. The binding limit is **20 requests per second**, and these calls take about 15 ms, so by Little's law even 5 requests in flight is a rate of over 300 per second. AIMD shrinks concurrency after each 429, but concurrency was never the problem. Before adding a control, ask which limit you are actually hitting — and if it is a rate or a token budget, control that quantity directly." }] },

    { t: "viz", title: "The order of the gate",
      caption: "Cheapest refusal first. Coalescing removes duplicates before they cost anything; the cool-down stops everyone after a 429; the two buckets reserve the request and its tokens; the deadline check discards work whose caller has gone; the semaphore caps what is in flight; backoff handles whatever still comes back 429.",
      svg: `<svg viewBox="0 0 900 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gatekeeper pipeline">
  <g font-size="12">
    <rect x="10" y="70" width="100" height="56" rx="8" class="s-fill-2 s-stroke"/>
    <text x="60" y="94" text-anchor="middle" class="s-label">coalesce</text>
    <text x="60" y="112" text-anchor="middle" class="s-sub">duplicates</text>
    <rect x="130" y="70" width="100" height="56" rx="8" class="s-fill-2 s-stroke"/>
    <text x="180" y="94" text-anchor="middle" class="s-label">cool-down</text>
    <text x="180" y="112" text-anchor="middle" class="s-sub">after a 429</text>
    <rect x="250" y="70" width="110" height="56" rx="8" class="s-fill-2 s-stroke"/>
    <text x="305" y="94" text-anchor="middle" class="s-label">request bucket</text>
    <text x="305" y="112" text-anchor="middle" class="s-sub">rate</text>
    <rect x="380" y="70" width="110" height="56" rx="8" class="s-fill-2 s-stroke"/>
    <text x="435" y="94" text-anchor="middle" class="s-label">token budget</text>
    <text x="435" y="112" text-anchor="middle" class="s-sub">cost</text>
    <rect x="510" y="70" width="100" height="56" rx="8" fill="none" stroke="var(--warn)" stroke-width="2"/>
    <text x="560" y="94" text-anchor="middle" class="s-label">deadline?</text>
    <text x="560" y="112" text-anchor="middle" class="s-sub">shed if late</text>
    <rect x="630" y="70" width="100" height="56" rx="8" class="s-fill-2 s-stroke"/>
    <text x="680" y="94" text-anchor="middle" class="s-label">semaphore</text>
    <text x="680" y="112" text-anchor="middle" class="s-sub">concurrency</text>
    <rect x="750" y="70" width="140" height="56" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>
    <text x="820" y="94" text-anchor="middle" class="s-label">upstream</text>
    <text x="820" y="112" text-anchor="middle" class="s-sub">+ backoff on 429</text>
    <g stroke="var(--accent)" stroke-width="1.6">
      <line x1="110" y1="98" x2="130" y2="98"/><line x1="230" y1="98" x2="250" y2="98"/><line x1="360" y1="98" x2="380" y2="98"/>
      <line x1="490" y1="98" x2="510" y2="98"/><line x1="610" y1="98" x2="630" y2="98"/><line x1="730" y1="98" x2="750" y2="98"/>
    </g>
    <text x="560" y="160" text-anchor="middle" class="s-sub">checked after queueing, not before</text>
    <text x="60" y="160" text-anchor="middle" class="s-sub">192 of 300 shared a call</text>
  </g>
</svg>` },

    { t: "callout", kind: "trap", title: "Checking the deadline before the queue",
      body: [{ t: "p", text: "The first version of this gatekeeper checked the caller's deadline on entry, before waiting in the buckets — and requests then waited there for up to six seconds and were sent anyway, to callers who had given up after three. The check has to sit **after** the waiting and before the upstream call. Moved there, the 3-second run delivered every success inside its deadline (p95 2.86 s), shed 129 requests and spent only 59 upstream calls, none of them on an abandoned request." }] },

    { t: "ladder", title: "Calling a rate-limited API",
      rungs: [
        { level: "bad", label: "Retry on failure", why: "Instant retries amplify the overload",
          code: `for _ in range(20):
    try: return await api.complete(prompt)
    except TooManyRequests: pass`,
          note: "Measured: 5,905 calls for 5 answers." },
        { level: "ok", label: "Backoff with jitter, honouring Retry-After", why: "Correct per request, blind to the crowd",
          code: `await asyncio.sleep(max(e.retry_after, random.uniform(0, min(cap, base * 2 ** attempt))))`,
          note: "Necessary on every client, and on its own still failed 252 of 300 in a burst, because 300 independent retry schedules still add up to an overload." },
        { level: "best", label: "A gatekeeper: coalesce, pace, budget, cap, shed, then back off", why: "Prevents most rejections before they happen",
          code: `await flight.do(prompt, lambda: with_backoff(call, cool))
# call(): cool.wait -> rps.acquire -> tps.acquire(tokens) -> deadline check -> semaphore -> upstream`,
          note: "Measured: 300 of 300, 121 upstream calls, 13 rejections, p50 2.6 s — and, with a deadline, no upstream call spent on a caller who had left." }
      ] },

    { t: "callout", kind: "production", title: "Across many processes",
      body: [{ t: "p", text: "Everything here lives in one process. With twenty workers, each needs a share of the limit or a shared limiter: either divide the budget (each worker gets 1/20 and you lose the burst headroom), or keep the bucket in Redis with an atomic script as Lesson 7.3 builds — and keep the cool-down there too, so that one worker's 429 pauses the fleet. Coalescing across processes needs a shared cache keyed by the request, which is often just your response cache." }] },

    { t: "exercise", kind: "Challenge", title: "One noisy tenant", difficulty: "advanced", minutes: 30,
      body: [{ t: "p", text: "Put two tenants behind the same gate: a noisy one sending 250 requests and a quiet one sending 50, interleaved. Measure each tenant's p50 and p95 with one shared request bucket, then give each tenant its own bucket whose rates add up to the upstream's limit, and measure again." }],
      requirements: [
        "Reuse the gatekeeper's cool-down, semaphore and backoff; vary only the request bucket",
        "Report p50 and p95 latency per tenant for one shared bucket",
        "Give each tenant its own bucket with rates summing to just under the upstream limit, and report again",
        "Say what the quiet tenant gained, what the noisy tenant paid, and when per-tenant budgets are the wrong choice"
      ],
      hint: "With one shared bucket, a tenant's place in the queue is proportional to how much it sends. A reserved rate makes the quiet tenant's wait depend only on its own traffic.",
      solution: {
        lang: "python", title: "fairness.py",
        code: `"""fairness.py - one noisy tenant, one quiet tenant, one shared upstream. Uses gatekeeper.py from the lesson."""
import asyncio, random, statistics, time
from gatekeeper import CoolDown, TokenBucket, Upstream, with_backoff

async def run(label, bucket_for):
    random.seed(0); up = Upstream(); lat = {"noisy": [], "quiet": []}
    jobs = [("noisy", 300)] * 250 + [("quiet", 300)] * 50
    random.Random(1).shuffle(jobs)
    sem, cool = asyncio.Semaphore(5), CoolDown()
    async def one(tenant, tokens):
        t0 = time.monotonic()
        async def call():
            await cool.wait(); await bucket_for(tenant).acquire()
            async with sem: return await up.complete(tokens)
        await with_backoff(call, cool); lat[tenant].append(time.monotonic() - t0)
    await asyncio.gather(*(one(t, k) for t, k in jobs))
    for tenant, xs in lat.items():
        q = statistics.quantiles(xs, n=20)
        print(f"{label:<30} {tenant:<6} n={len(xs):>3}  p50 {q[9]:5.2f}s  p95 {q[18]:5.2f}s")

async def main():
    shared = TokenBucket(18, 5)
    await run("one shared bucket", lambda tenant: shared)
    # Per-tenant buckets whose rates add up to what the upstream allows: the quiet tenant's share is reserved.
    per = {"noisy": TokenBucket(13, 3), "quiet": TokenBucket(5, 2)}
    await run("per-tenant buckets (13 + 5/s)", lambda tenant: per[tenant])

asyncio.run(main())`,
        out: `one shared bucket              noisy  n=250  p50  8.03s  p95 15.65s
one shared bucket              quiet  n= 50  p50  9.17s  p95 16.47s
per-tenant buckets (13 + 5/s)  noisy  n=250  p50  9.59s  p95 18.28s
per-tenant buckets (13 + 5/s)  quiet  n= 50  p50  4.91s  p95  9.50s`,
        notes: [
          { t: "p", text: "With one shared bucket the quiet tenant waits behind the noisy one: its 50 requests are scattered through a queue of 300, so its p50 of 9.2 s is no better than the noisy tenant's. Reserving 5 requests per second for it halves that to 4.9 s, and the noisy tenant pays with a slightly longer wait, because 13 per second is now all it can use. That is the trade fairness always makes: the quiet tenant's latency becomes a function of its own load." },
          { t: "p", text: "Static per-tenant rates waste capacity when one tenant is idle, which is why production gateways use weighted fair queueing or let a tenant borrow unused share. Per-tenant budgets are the wrong choice when tenants are internal callers of equal priority and the total is what matters; they are the right one the moment a customer can be harmed by another customer's batch job." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the nightly batch that took down the chat product",
      body: [
        { t: "p", text: "**Symptom.** Every night at 02:00 the customer-facing chat feature returned errors for about forty minutes, while dashboards showed the model provider healthy." },
        { t: "p", text: "**Mechanism.** A nightly document-summarisation job shared the chat product's API key. It fanned out 2,000 requests with per-request exponential backoff and no shared limiter, so it hit the tokens-per-minute limit within seconds and kept the account there for the whole run. Every chat request in that window met a 429 that had nothing to do with chat traffic." },
        { t: "p", text: "**Fix.** The batch job got its own key and quota, and the chat path got a gatekeeper: a shared cool-down across workers, a token budget sized below the account limit, coalescing for identical prompts, and a deadline check so that requests from users who had abandoned the page were never sent. The account limit is now split between products deliberately rather than by whoever sends fastest." }
      ] }
  ],

  takeaways: [
    "Model providers limit requests, tokens and concurrency at once, and reject you for whichever one you did not bound.",
    "Instant retries on 429 amplify the overload: measured, 5,905 upstream calls for 5 successes.",
    "Per-request backoff with jitter is necessary but not sufficient: against a burst it still failed 252 of 300, because independent schedules still add up.",
    "A shared cool-down turns one 429 into a pause for every caller, and a token bucket prevents most rejections before they happen.",
    "Control the quantity that is actually limited: AIMD concurrency failed here because the binding limit was a rate, and by Little's law 5 in flight at 15 ms is 300 per second.",
    "Coalescing identical in-flight requests is the cheapest gate: the 300 requests needed only 108 successful upstream calls, one per distinct prompt.",
    "Check a caller's deadline after the request has waited in the queues and before the upstream call; checked on entry, abandoned work still gets sent.",
    "Order the gate cheapest-refusal-first: coalesce, cool-down, rate, token budget, deadline, concurrency, then backoff on whatever still fails.",
    "Per-tenant budgets protect a quiet tenant from a noisy one: measured, its median latency halved from 9.2 s to 4.9 s.",
    "Across many workers the limiter and the cool-down must be shared, or each worker's private budget adds up to more than the account allows."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Three hundred callers each retry 429s with exponential backoff, full jitter and Retry-After. Why do most still fail?",
      options: ["Full jitter makes a share of the retries fire too early", "Their separate schedules still add up past the limit", "Retry-After is only advisory and is best ignored", "Exponential backoff grows too slowly to matter here"],
      answer: 1,
      why: "Each caller's schedule is reasonable on its own, but three hundred of them still send far more than twenty per second; that is what a shared cool-down or a bucket fixes. Retries never fire before Retry-After here, the header is the server's instruction rather than something to ignore, and the growth rate is not the issue — the crowd is." },
    { stem: "Calls take 15 ms and the upstream allows 20 requests per second. AIMD settles at 5 concurrent requests. What happens?",
      options: ["The semaphore throttles it to 20 requests per second", "It converges below the limit because AIMD halves on errors", "It is safe because 5 is under the concurrency limit", "It still sends about 300 per second and keeps hitting 429"],
      answer: 3,
      why: "By Little's law rate equals concurrency divided by latency, so 5 in flight at 15 ms is about 333 per second. A semaphore bounds concurrency, not rate; halving keeps concurrency low but still far above the rate limit at this latency; and staying under the concurrency limit does nothing for the rate limit." },
    { stem: "Where should the gatekeeper check a caller's 3-second deadline?",
      options: ["On entry, before any queue, so late work is refused early", "After the upstream call returns, to discard late answers", "After the buckets, just before the upstream call", "Only inside the backoff loop, in between retries"],
      answer: 2,
      why: "Waiting happens inside the buckets, so a request can be on time when it enters and hopelessly late when it reaches the front. Checking on entry misses that wait; checking after the call has already spent the upstream request; and the backoff loop is only one of the places a request waits." },
    { stem: "Of 300 burst requests, about 60 % repeat an earlier prompt. Which control removed most upstream calls in the measured gatekeeper?",
      options: ["The token budget sized below the tokens-per-second limit", "The semaphore capping five requests in flight at once", "Coalescing identical in-flight requests", "The shared cool-down after the first 429 response"],
      answer: 2,
      why: "Coalescing let identical prompts share one call: 300 requests were answered by 108 successful calls, one per distinct prompt. The token budget and semaphore pace the calls that remain without removing any, and the cool-down only changes when calls are sent, not how many." }
  ] },

  interview: { title: "In an interview", sub: "Answer out loud before opening", questions: [
    { q: "Your service calls an LLM API and gets bursts of 429s at peak. Walk me through the fix.", level: "core",
      strong: "Find which limit is binding — requests, tokens or concurrency — then prevent rather than react: coalesce duplicates, pace with a token bucket and a token budget below the account limit, share a cool-down across workers, cap concurrency, shed work past its deadline, and keep backoff with jitter for what remains.",
      answer: [{ t: "p", text: "I would start with the 429 bodies and headers to see which limit we hit, because the fix differs. Then I would move from reacting to preventing: coalesce identical in-flight prompts, pace requests and reserve estimated tokens below the account's limits, and share the limiter and a cool-down across workers so one 429 pauses the fleet. Backoff with jitter and Retry-After stays, but as the last layer. I measured this pattern against a simulated upstream: per-request backoff alone failed most of a burst, and the composed gate got everything through with a fifth of the calls." }] },
    { q: "Token bucket or leaky bucket in front of a model API?", level: "advanced",
      strong: "A token bucket when you want to use bursts the provider tolerates and smooth the rest; a leaky bucket (a queue drained at a fixed rate) when the upstream punishes any burst. For LLMs you usually need two buckets: one for requests and one for tokens, reserving the estimated tokens up front and correcting afterwards.",
      answer: [{ t: "p", text: "They differ in how they treat bursts. The token bucket allows a burst up to its capacity and then paces; the leaky bucket emits at a constant rate. Provider limits are usually per-minute windows, so a modest burst is fine and the token bucket wastes less capacity. The detail people miss is that LLM limits are on tokens as well as requests, so I keep a second bucket for estimated tokens per call and reconcile with the actual usage the response reports." }] },
    { q: "How do you stop one customer's batch job from degrading everyone else?", level: "expert",
      strong: "Per-tenant budgets — separate keys or quotas, or weighted fair queueing at the gateway — so each tenant's latency depends on its own load; measure it, and decide how unused share is borrowed.",
      answer: [{ t: "p", text: "With one shared limiter, a tenant's share is proportional to how much it sends, so the batch job wins. Separate budgets fix that: in a simulation, reserving a fifth of the capacity for a quiet tenant halved its median latency while the noisy tenant paid a little. In production I would use weighted fair queueing or borrowable quotas so idle share is not wasted, and separate credentials for batch and interactive traffic so the provider's own limits are not shared by accident." }] }
  ] }
});
