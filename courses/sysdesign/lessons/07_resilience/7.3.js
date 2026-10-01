/* ============================================================================
   LESSON 7.3 — Rate Limiting Algorithms
   ========================================================================= */
EC.receiveLesson({
  id: "7.3",

  lede: "A rate limiter decides, per client, whether one more request is allowed now. Five algorithms are in common use, and they differ in exactly two places: **what happens at the edge of a time window**, and **how much burst they let through**. A fixed window — the simplest — can admit twice the limit in a fraction of a second; a sliding log is exact and stores every timestamp; a token bucket allows a controlled burst and then a steady rate. Across a fleet of gateways, the limiter must also be **atomic** — a read-decide-write sequence in a shared store over-admits under concurrency, measured here at several times the limit.",

  objectives: [
    "Implement fixed window, sliding log, sliding counter, token bucket and leaky bucket limiters",
    "Measure how each treats a burst at a window boundary and a sustained overload",
    "Choose an algorithm from the burst behaviour and memory a use case can accept",
    "Build a distributed limiter that is atomic, and show why a naive one is not",
    "Return 429 with the headers that let a well-behaved client back off"
  ],

  prerequisites: ["1.4", "7.1"],

  blocks: [

    { t: "h2", n: "01", id: "algorithms", text: "Five algorithms, one limit",
      sub: "Ten requests per second, measured" },

    { t: "code", lang: "python", title: "ratelimit.py — five limiters, a boundary burst and a sustained overload", code: `from collections import deque

LIMIT, WINDOW = 10, 1.0                    # 10 requests per second

class FixedWindow:
    def __init__(self): self.win, self.count = None, 0
    def allow(self, t):
        w = int(t // WINDOW)
        if w != self.win: self.win, self.count = w, 0
        if self.count < LIMIT: self.count += 1; return True
        return False

class SlidingLog:
    def __init__(self): self.log = deque()
    def allow(self, t):
        while self.log and self.log[0] <= t - WINDOW: self.log.popleft()
        if len(self.log) < LIMIT: self.log.append(t); return True
        return False

class SlidingCounter:                      # two counters, previous window weighted by overlap
    def __init__(self): self.win, self.cur, self.prev = None, 0, 0
    def allow(self, t):
        w = int(t // WINDOW)
        if w != self.win:
            self.prev = self.cur if self.win == w - 1 else 0
            self.win, self.cur = w, 0
        overlap = 1 - (t - w * WINDOW) / WINDOW
        if self.prev * overlap + self.cur < LIMIT: self.cur += 1; return True
        return False

class TokenBucket:                         # capacity = burst allowed; refills at LIMIT per second
    def __init__(self, capacity=LIMIT): self.cap, self.tokens, self.last = capacity, capacity, 0.0
    def allow(self, t):
        self.tokens = min(self.cap, self.tokens + (t - self.last) * LIMIT / WINDOW); self.last = t
        if self.tokens >= 1: self.tokens -= 1; return True
        return False

class LeakyBucket:                         # a queue drained at a constant rate: smooths, delays
    def __init__(self, size=LIMIT): self.size, self.queue_free_at = size, []
    def allow(self, t):
        self.queue_free_at = [x for x in self.queue_free_at if x > t]
        if len(self.queue_free_at) >= self.size: return False
        start = max([t] + self.queue_free_at)
        self.queue_free_at.append(start + WINDOW / LIMIT); return True

def burst_at_boundary():                   # 10 requests just before t=1, 10 just after
    return [0.90 + i * 0.01 for i in range(10)] + [1.00 + i * 0.01 for i in range(10)]
def steady_overload():                     # 25 requests/s for 4 seconds
    return [i / 25 for i in range(100)]

def max_in_any_window(times):
    return max(sum(1 for x in times if s <= x < s + WINDOW) for s in times) if times else 0

print("%-16s %26s %28s %20s" % ("algorithm", "boundary burst: accepted", "  ...max in any 1 s window", "overload 25/s: kept"))
for cls in (FixedWindow, SlidingLog, SlidingCounter, TokenBucket, LeakyBucket):
    a = cls(); acc = [t for t in burst_at_boundary() if a.allow(t)]
    b = cls(); acc2 = [t for t in steady_overload() if b.allow(t)]
    print("%-16s %20d of 20 %24d %21.1f/s" % (cls.__name__, len(acc), max_in_any_window(acc), len(acc2) / 4))`,
      out: `algorithm          boundary burst: accepted     ...max in any 1 s window  overload 25/s: kept
FixedWindow                        20 of 20                       20                  10.0/s
SlidingLog                         10 of 20                       10                  10.0/s
SlidingCounter                     11 of 20                       11                  10.0/s
TokenBucket                        11 of 20                       11                  12.2/s
LeakyBucket                        11 of 20                       11                  12.2/s`,
      hl: [9, 10, 16, 17, 28, 34, 35],
      caption: "The **fixed window** accepted all twenty requests sent within 0.2 s — ten at the end of one window and ten at the start of the next — **twice the limit in any one-second span**. The sliding log accepted exactly ten. The sliding counter and token bucket let one extra through. Under sustained overload, every algorithm settles at the limit; the token bucket and leaky bucket show their **burst capacity** — a full bucket at the start — in a higher average over a short run." },

    { t: "diagram", kind: "timeline", title: "The fixed-window boundary problem",
      caption: "The window resets at t = 1.0, so a client can spend a full window's allowance in its last moments and another full allowance immediately after. Sliding algorithms look at the trailing second at every moment, so the second burst is refused.",
      span: 2, tick: 0.5, unit: "seconds",
      lanes: [
        { label: "window", bars: [[0, 1, "window 1: limit 10", "accent"], [1, 2, "window 2: limit 10", "violet"]] },
        { label: "requests", bars: [[0.9, 1.0, "10", "warn"], [1.0, 1.1, "10", "warn"]] },
        { label: "fixed", bars: [[0.9, 1.0, "✓", "good"], [1.0, 1.1, "✓", "crit"]] },
        { label: "sliding", bars: [[0.9, 1.0, "✓", "good"], [1.0, 1.1, "✗", "crit"]] }
      ] },

    { t: "viz", title: "The token bucket",
      caption: "Tokens drip in at the sustained rate up to a capacity; each request removes one, and a request that finds the bucket empty is refused. Capacity sets the largest burst a client may send after being idle; the refill rate sets its long-run rate. Two numbers, chosen independently — which is why token buckets are the default in API gateways and cloud APIs.",
      svg: `<svg viewBox="0 0 760 230" width="100%" role="img" aria-label="Token bucket">
  <defs><marker id="tk-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="300" y="22" text-anchor="middle" class="s-label" style="fill:var(--good)">refill: 10 tokens per second</text>
  <line x1="300" y1="30" x2="300" y2="58" style="stroke:var(--good)" stroke-width="1.8" marker-end="url(#tk-a)"/>
  <path d="M230 62 L240 196 L360 196 L370 62" style="fill:none;stroke:var(--ink-3)" stroke-width="2"/>
  <text x="390" y="72" class="s-sub">capacity 10 = largest burst</text>
  <circle cx="265" cy="182" r="9" style="fill:var(--accent);fill-opacity:.6"/><circle cx="290" cy="182" r="9" style="fill:var(--accent);fill-opacity:.6"/>
  <circle cx="315" cy="182" r="9" style="fill:var(--accent);fill-opacity:.6"/><circle cx="340" cy="182" r="9" style="fill:var(--accent);fill-opacity:.6"/>
  <circle cx="277" cy="162" r="9" style="fill:var(--accent);fill-opacity:.6"/><circle cx="302" cy="162" r="9" style="fill:var(--accent);fill-opacity:.6"/>
  <circle cx="327" cy="162" r="9" style="fill:var(--accent);fill-opacity:.6"/>
  <text x="300" y="130" text-anchor="middle" class="s-mono">7 tokens</text>
  <rect x="30" y="150" width="150" height="34" rx="8" class="s-fill s-stroke"/><text x="105" y="171" text-anchor="middle" class="s-label">request</text>
  <line x1="180" y1="167" x2="236" y2="167" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#tk-a)"/>
  <text x="208" y="158" text-anchor="middle" class="s-sub">take 1</text>
  <rect x="470" y="118" width="250" height="34" rx="8" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
  <text x="595" y="139" text-anchor="middle" class="s-label">token available → allow</text>
  <rect x="470" y="164" width="250" height="34" rx="8" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
  <text x="595" y="185" text-anchor="middle" class="s-label">bucket empty → 429</text>
  <line x1="372" y1="150" x2="466" y2="136" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#tk-a)"/>
  <line x1="372" y1="170" x2="466" y2="180" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#tk-a)"/>
  <text x="380" y="222" text-anchor="middle" class="s-sub">state per client: two numbers — tokens and the time of the last refill</text>
</svg>` },

    { t: "diagram", kind: "matrix", title: "Choosing an algorithm",
      caption: "The leaky bucket differs from the rest: it queues requests and releases them at a constant rate, so it smooths traffic for a downstream that needs it — at the cost of adding delay rather than rejecting.",
      cols: ["Boundary burst", "Burst after idle", "State per client", "Use for"],
      rows: ["Fixed window", "Sliding log", "Sliding counter", "Token bucket", "Leaky bucket"],
      cells: [
        [{ text: "up to 2× limit", tone: "crit" }, { text: "full window", tone: "warn" }, { text: "1 counter", tone: "good" }, { text: "daily quotas" }],
        [{ text: "exact", tone: "good" }, { text: "none beyond limit", tone: "good" }, { text: "every timestamp", tone: "crit" }, { text: "low, precise limits" }],
        [{ text: "≈ exact", tone: "good" }, { text: "none beyond limit", tone: "good" }, { text: "2 counters", tone: "good" }, { text: "high-volume APIs", tone: "accent" }],
        [{ text: "≤ capacity", tone: "good" }, { text: "capacity, by design", tone: "accent" }, { text: "2 numbers", tone: "good" }, { text: "API gateways", tone: "accent" }],
        [{ text: "smoothed", tone: "good" }, { text: "queued, not burst", tone: "accent" }, { text: "a queue", tone: "warn" }, { text: "a fragile downstream" }]
      ] },

    { t: "h2", n: "02", id: "distributed", text: "Rate limiting across a fleet",
      sub: "One limit, many gateways, one shared counter" },

    { t: "p", text: "A per-key limit enforced by eight gateway instances needs a shared store — usually Redis — and the per-instance counter of 2.1's exercise allows eight times the limit. Sharing the store is not enough on its own: the check and the update must be **one atomic step**, or concurrent gateways all read the same count and all decide to allow." },

    { t: "callout", kind: "trap", title: "GET, decide, SET",
      body: [
        { t: "p", text: "Reading the counter, comparing it in application code and writing it back is three round trips with a gap in the middle, and every gateway that reads during the gap sees the same value. Under real concurrency the limiter admits several times the limit — the exercise below measures it on a real Redis — and the over-admission is worst exactly when traffic is heaviest, which is when the limit matters." },
        { t: "p", text: "Make the whole decision atomic inside the store: `INCR` with `EXPIRE` for a fixed window (INCR returns the new count, so compare after incrementing), or a **Lua script** for a token bucket or sliding counter, which Redis runs without interleaving any other command. Use the server's clock or pass one time source, so gateways with skewed clocks do not disagree about refills." }
      ] },

    { t: "h2", n: "03", id: "contract", text: "The 429 contract",
      sub: "Tell the client how to behave" },

    { t: "code", lang: "text", title: "a rate-limited response", code: `HTTP/1.1 429 Too Many Requests
Retry-After: 2
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 2
Content-Type: application/json

{"code": "rate_limited", "message": "100 requests per second per API key; retry after 2 s"}`,
      caption: "`Retry-After` tells a client exactly how long to wait, which a client with jittered backoff (7.1) should respect over its own schedule. The `RateLimit-*` headers let clients pace themselves before they are refused. Successful responses should carry `RateLimit-Remaining` too." },

    { t: "table",
      head: ["Limit on", "Protects against", "Typical placement"],
      rows: [
        ["IP address", "Unauthenticated floods, credential stuffing on login", "CDN / WAF, edge"],
        ["API key or user", "One customer consuming shared capacity", "API gateway (1.3)"],
        ["Endpoint", "An expensive operation (search, export) overwhelming its backend", "Gateway or the service"],
        ["Tenant, globally", "A noisy tenant across every endpoint", "Gateway with a shared store"],
        ["Outbound, per dependency", "Your own service exceeding a partner's quota", "Client library (a token bucket)"]
      ],
      caption: "Real systems layer several: a generous per-IP limit at the edge, per-key quotas at the gateway, and tighter per-endpoint limits on expensive operations." },

    { t: "exercise", kind: "Challenge", title: "An atomic distributed limiter on Redis",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "Eight gateway threads share a Redis instance and enforce 100 requests per second per API key. Implement the naive GET–decide–SET limiter and a token bucket in a Lua script, hammer both with 1,600 requests as fast as possible, and compare what each admitted with what the limit allows." }
      ],
      requirements: [
        "The naive limiter reads a per-second counter, compares in Python, and writes it back",
        "The Lua limiter refills by elapsed time, spends a token if one is available, and stores both values with an expiry",
        "Run each with eight concurrent gateways",
        "Report accepted requests against the limit for the elapsed time",
        "Explain why the Lua version cannot over-admit"
      ],
      hint: "The allowance for a run of T seconds is the bucket's capacity plus T × rate. Redis runs a Lua script atomically — no other command executes in the middle of it.",
      solution: { lang: "python", title: "redis_limit_ex.py",
        code: `import threading, time, redis

r = redis.Redis(port=6380)
LIMIT = 100                                   # requests per second per API key

def naive(key):
    """Read, decide, write — three round trips with a gap other gateways can slip through."""
    k = f"naive:{key}:{int(time.time())}"
    n = int(r.get(k) or 0)
    if n >= LIMIT: return False
    r.set(k, n + 1, ex=2); return True

TOKEN_BUCKET = r.register_script("""
local tokens_key, ts_key = KEYS[1], KEYS[2]
local rate, capacity, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local tokens = tonumber(redis.call('GET', tokens_key) or capacity)
local last = tonumber(redis.call('GET', ts_key) or now)
tokens = math.min(capacity, tokens + (now - last) * rate)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('SET', tokens_key, tokens, 'EX', 10)
redis.call('SET', ts_key, now, 'EX', 10)
return allowed
""")

def atomic(key):
    """The whole check-and-update runs inside Redis, as one indivisible step."""
    return TOKEN_BUCKET(keys=[f"tb:{key}:tokens", f"tb:{key}:ts"], args=[LIMIT, LIMIT, time.time()]) == 1

def hammer(fn, key, gateways=8, per_gateway=200):
    r.flushdb(); accepted = []
    def gateway():
        n = 0
        for _ in range(per_gateway): n += fn(key)
        accepted.append(n)
    t0 = time.time()
    ts = [threading.Thread(target=gateway) for _ in range(gateways)]
    for t in ts: t.start()
    for t in ts: t.join()
    return sum(accepted), time.time() - t0

for name, fn in (("naive GET then SET", naive), ("Lua token bucket", atomic)):
    ok, secs = hammer(fn, "key_42")
    print("%-20s 8 gateways sent 1,600 in %.2f s -> accepted %4d (limit allows about %d)"
          % (name, secs, ok, LIMIT + int(LIMIT * secs)))`,
        out: `naive GET then SET   8 gateways sent 1,600 in 0.37 s -> accepted  467 (limit allows about 137)
Lua token bucket     8 gateways sent 1,600 in 0.30 s -> accepted  130 (limit allows about 130)`,
        notes: [
          { t: "p", text: "The naive limiter admitted several times what the limit allows: eight gateways repeatedly read the same count in the gap between GET and SET, all decided \"under the limit\", and all wrote back the same incremented value. The shared store was correct; the protocol around it was not." },
          { t: "p", text: "The Lua script admitted almost exactly the allowance, because refill, check and spend happen inside Redis as a single step that no other command can interleave. It is also one round trip instead of three, so it is faster — atomicity and latency improve together here." },
          { t: "p", text: "In production the same script runs against a Redis cluster with keys hashed by API key, so different keys spread across shards; the expiry keeps idle keys from accumulating; and if Redis is unreachable the gateway must choose to fail open (allow, protect availability) or fail closed (deny, protect the backend) — a decision to make deliberately per endpoint." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the export endpoint that bypassed every limit",
      body: [
        { t: "p", text: "**Symptom.** A customer's integration began calling the CSV export endpoint in a loop. Each export scanned millions of rows; the reporting database's CPU hit 100%, and every customer's dashboards timed out for an hour. The customer was within their API quota the whole time." },
        { t: "p", text: "**Mechanism.** The only limit was 1,000 requests per minute per API key, applied uniformly to every endpoint. An export cost the database roughly ten thousand times what a typical read cost, so 300 exports a minute — well inside the quota — was enough to saturate it. A rate limit that counts requests treats a request as a unit of cost, and for this endpoint it was not." },
        { t: "p", text: "**Fix.** A per-endpoint limit on exports (a handful per minute per tenant), exports moved to an asynchronous job queue with one concurrent export per tenant (6.1), and a cost-based limiter on the reporting API that charges each request tokens proportional to the rows it scans. The general rule: **limit expensive operations by their cost, not by their count.**" }
      ] }
  ],

  takeaways: [
    "Five algorithms: **fixed window, sliding log, sliding counter, token bucket, leaky bucket** — they differ at window boundaries and in burst behaviour.",
    "Measured: a **fixed window admitted 20 requests in 0.2 s** against a 10/s limit; the sliding log admitted exactly 10.",
    "The **sliding counter** approximates the log with two counters; the **token bucket** separates burst size (capacity) from sustained rate (refill).",
    "The **leaky bucket** queues and smooths instead of rejecting — for protecting a downstream that cannot take bursts.",
    "Across gateways the limiter needs a **shared store** and an **atomic** check-and-update.",
    "Measured on real Redis: GET–decide–SET from eight gateways admitted **several times** the allowance; a Lua token bucket admitted almost exactly it.",
    "Return **429 with Retry-After** and `RateLimit-*` headers, and expect clients to honour them.",
    "Layer limits: per IP at the edge, per key at the gateway, per endpoint for expensive operations, outbound per dependency.",
    "**Limit expensive operations by cost, not count** — one export can cost ten thousand reads."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A fixed-window limiter allows 100 requests per minute. What is the most a client can send successfully within two seconds?",
        options: ["100", "200 — 100 at the end of one window and 100 at the start of the next", "50", "3"],
        answer: 1,
        why: "The counter resets at the boundary, so a client can use a full allowance just before it and another just after, 200 in a moment — the boundary burst measured at 2× the limit. Sliding algorithms prevent this by looking back a full window at every request." },

      { stem: "What do a token bucket's two parameters control?",
        options: ["Window length and key size", "Capacity sets the largest burst after idleness; refill rate sets the long-run rate", "Number of gateways and Redis shards", "Timeout and retry count"],
        answer: 1,
        why: "Tokens accumulate up to the capacity while a client is idle, so capacity bounds the burst it can then send; the refill rate is the steady rate it can sustain. That independence is why token buckets suit APIs. The other options name unrelated settings." },

      { stem: "Eight gateways enforce a shared limit by reading a Redis counter, comparing in code, and writing the new value. What goes wrong under load?",
        options: ["Redis becomes inconsistent", "Concurrent gateways read the same value in the gap and all allow, so the limit is exceeded several times over", "Requests are double-counted and the limit is too strict", "Nothing — Redis serialises commands"],
        answer: 1,
        why: "Redis serialises individual commands, but GET and SET are separate commands with application logic between them, so several gateways read the same count before any writes — the exercise admitted several times the allowance. Doing the decision inside Redis, via INCR or a Lua script, makes it atomic." },

      { stem: "An API's per-key limit is 1,000 requests per minute, and one endpoint scans millions of rows per call. What is the problem?",
        options: ["The limit is too high for cheap endpoints", "Counting requests treats every request as equal cost, so a few hundred expensive calls within quota can overload the backend", "Rate limits cannot apply to exports", "The limit should be per IP"],
        answer: 1,
        why: "A request-count limit is a proxy for cost, and it fails when one endpoint costs thousands of times more than another — the export incident. Expensive operations need their own limit, a cost-based token charge, or asynchronous execution with concurrency limits. Per-IP limits would not help with an authenticated integration." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The rate limiter is a top-ten interview problem; the boundary burst and atomicity are what separate answers.",
    questions: [
      { level: "core",
        q: "Explain the common rate-limiting algorithms and when you would use each.",
        strong: "A strong answer covers all five with the boundary and burst behaviour and a recommendation.",
        answer: [
          { t: "p", text: "Fixed window counts per calendar window — cheap, but allows up to twice the limit across a boundary. Sliding log keeps every timestamp in the trailing window — exact, memory-heavy. Sliding counter weights the previous window's count by its overlap — nearly exact with two counters, a good default for high-volume APIs. Token bucket refills tokens at the sustained rate up to a capacity — it allows a configurable burst then a steady rate, which is why API gateways use it. Leaky bucket queues and drains at a constant rate — it smooths traffic for a fragile downstream, adding delay rather than rejecting." },
          { t: "p", text: "For a public API I would choose a token bucket per key, with capacity and rate as separate product decisions." }
        ] },

      { level: "advanced",
        q: "Design a rate limiter for an API gateway running on many instances.",
        strong: "A strong answer covers shared state, atomicity, clocks, failure mode and response headers.",
        answer: [
          { t: "p", text: "State in a shared Redis cluster, keyed by API key so keys spread across shards. The decision must be atomic — a Lua script implementing a token bucket that refills by elapsed time, spends a token if available and stores both values with an expiry — because read-decide-write from many gateways over-admits several times over. Time comes from one source, Redis's own clock or the script's argument from a synchronised clock, so refills agree." },
          { t: "p", text: "Then the edges: a small local token bucket in each gateway to absorb extreme bursts before Redis; a decision on Redis being unavailable — fail open for most endpoints, fail closed for expensive ones; 429 responses with Retry-After and RateLimit headers; and metrics on rejections per key so a customer hitting limits is visible before they complain." }
        ] },

      { level: "core",
        q: "Where would you apply rate limits in a system?",
        strong: "A strong answer layers limits by identity and cost.",
        answer: [
          { t: "p", text: "In layers. At the edge, per IP, to stop floods and credential stuffing before they reach anything that costs money. At the gateway, per API key or user, to enforce quotas and fairness between customers. Per endpoint for expensive operations, by cost rather than count. And outbound, in our own clients, so we never exceed a partner's quota." },
          { t: "p", text: "Inside the system I prefer load shedding and backpressure (7.4) to rate limits, because those react to actual capacity rather than to a fixed number someone chose." }
        ] }
    ]
  }
});
