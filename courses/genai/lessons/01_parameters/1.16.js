EC.receiveLesson({
  id: "1.16",

  lede: "The response object carries three things a production client must read and most do not: why generation stopped, what it cost, and how close you are to the rate limit. Ignoring the first ships truncated answers as complete ones; ignoring the second makes the bill unreconcilable; ignoring the third turns a brief 429 into a retry storm that extends the outage. This lesson covers all three and measures why the jitter in exponential backoff is not optional.",

  objectives: [
    "Branch correctly on every value of finish_reason",
    "Read usage and rate-limit headers, and say what each is for",
    "Implement exponential backoff with jitter and explain what jitter prevents",
    "Distinguish errors worth retrying from errors that will never succeed",
    "Set a retry budget from a latency target rather than from a default"
  ],

  prerequisites: ["1.5", "1.12"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "finish-reason", text: "finish_reason is not optional reading",
      sub: "Four values, and three of them need a branch" },

    { t: "p", text: "1.5 introduced `finish_reason` for the truncation case. It is worth returning to properly, because it is the field that distinguishes a complete answer from a partial one, a tool request from a text reply, and a blocked response from a short one — and the text alone distinguishes none of them." },

    { t: "code", lang: "python", title: "handle.py — every branch", code: `def handle(response):
    choice = response.choices[0]
    reason = choice.finish_reason

    if reason == "stop":
        return Complete(choice.message.content)

    if reason == "length":                   # cut off mid-answer (1.5, 1.10)
        return Truncated(choice.message.content)

    if reason == "tool_calls":               # the model is waiting on you (1.9)
        return ToolRequest(choice.message.tool_calls)

    if reason == "content_filter":           # blocked; do NOT retry identically
        return Blocked(choice.message.content)

    raise UnknownFinishReason(reason)        # a new value is a signal, not a default`,
      hl: [16],
      caption: "Raising on an unknown value is deliberate. Providers add finish reasons, and a client whose `else` branch treats anything unrecognised as success will quietly ship whatever the new case represents." },

    { t: "callout", kind: "trap", title: "Do not retry a content_filter identically",
        body: [
        { t: "p", text: "The same prompt to the same model will be blocked again, so an identical retry burns a request and a response's worth of latency to arrive at the same place. A retry loop with no branch on `content_filter` does that three or five times before giving up." },
        { t: "p", text: "There is a subtler version: some providers filter the *input* and some the *output*. If it is the output, the tokens were generated and billed before being blocked, so a retry loop is paying full price for each rejected attempt." },
        { t: "p", text: "The right handling is to surface it. The user asked for something the model would not produce, and telling them that is more useful than a spinner and a timeout. 11.13 covers the guardrail side of the same question." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "usage-and-headers", text: "Usage and the rate-limit headers",
      sub: "One is an audit record; the other is a control signal" },

    { t: "code", lang: "python", title: "metadata.py", code: `usage = response.usage
# prompt_tokens, completion_tokens, total_tokens
# plus, on reasoning models:  completion_tokens_details.reasoning_tokens   (1.10)
# plus, with prompt caching:  prompt_tokens_details.cached_tokens          (1.13)

# Rate limit state arrives in headers, not in the body:
#   x-ratelimit-limit-requests      500      the RPM ceiling
#   x-ratelimit-remaining-requests  499      what is left in this window
#   x-ratelimit-limit-tokens        30000    the TPM ceiling
#   x-ratelimit-remaining-tokens    29500
#   x-ratelimit-reset-requests      6ms      when the request budget refills
#   retry-after                     2        seconds, sent with a 429`,
      caption: "Both limits apply at once, and which one binds depends on your traffic: many small requests exhaust RPM, a few large ones exhaust TPM. A client that only watches one of them will be surprised by the other." },

    { t: "p", text: "The two fields do different jobs and should be used differently. **`usage` is an audit record** — it arrives after the work is done, so it cannot prevent anything, but it is what reconciles your cost model against the invoice (1.14). **The rate-limit headers are a control signal** — they arrive on every response and tell you how much headroom is left, which is enough to slow down *before* a 429 rather than after." },

    { t: "callout", kind: "good", title: "Back off on the headroom, not on the error",
      body: [
        { t: "p", text: "A client that only reacts to 429s is always reacting late: by the time one arrives, the limit is already breached and every other worker is hitting it too. Reading `x-ratelimit-remaining-requests` on each response lets you shed load smoothly." },
        { t: "p", text: "The simplest version is a soft threshold: if remaining drops below, say, 20% of the limit, start adding a small delay between requests. It costs a few lines, it is self-correcting because the headers keep arriving, and it converts a cliff into a slope." },
        { t: "p", text: "For anything with concurrent workers, this also needs to be shared state — 11.11 covers budget enforcement across a fleet, where per-process throttling does not add up to a global limit." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "backoff", text: "Exponential backoff, and why jitter is mandatory",
      sub: "Doubling the delay is half the answer" },

    { t: "p", text: "The standard retry is to wait `base × 2^attempt`, capped. The reference's example uses `tenacity` with `wait_exponential(min=1, max=60)`, which produces this schedule:" },

    { t: "code", lang: "python", title: "g112.py — with and without jitter", code: `def backoff(attempt, base=1.0, cap=60.0, jitter=False):
    raw = min(cap, base * (2 ** attempt))
    return random.uniform(0, raw) if jitter else raw       # "full jitter"

for a in range(7):
    print("%-9d %11.2fs %11.2fs" % (a, backoff(a), backoff(a, jitter=True)))`,
      out: `  attempt      no jitter  full jitter
  0                1.00s        0.32s
  1                2.00s        0.30s
  2                4.00s        2.60s
  3                8.00s        0.58s
  4               16.00s        8.57s
  5               32.00s       11.70s
  6               60.00s        3.48s`,
      caption: "Full jitter samples uniformly from zero to the capped delay. The individual waits look worse — sometimes much shorter than the schedule intends — and the aggregate behaviour is dramatically better." },

    { t: "p", text: "The reason is what happens when many clients are rate-limited at the same moment, which is the situation a retry is for:" },

    { t: "code", lang: "python", title: "g112.py — 200 clients, one rate limit", code: `for label, jit in (("no jitter", False), ("full jitter", True)):
    buckets = {}
    for _ in range(200):
        t = round(backoff(3, jitter=jit))       # all retrying from attempt 3
        buckets[t] = buckets.get(t, 0) + 1
    print("%-12s clients land in %2d distinct seconds; worst second carries %3d of 200"
          % (label, len(buckets), max(buckets.values())))`,
      out: `  no jitter    clients land in  1 distinct seconds; worst second carries 200 of 200
  full jitter  clients land in  9 distinct seconds; worst second carries  29 of 200`,
      hl: [7, 8],
      caption: "Without jitter all 200 clients retry in the same second — recreating exactly the spike that produced the rate limit. With jitter the worst second carries 29, a **6.9× reduction** in peak load." },

    { t: "viz", title: "Why the schedule alone is not enough", caption: "Measured over 200 simulated clients retrying from the same attempt. Deterministic backoff preserves the synchronisation that caused the problem.",
      svg: `<svg viewBox="0 0 760 214" width="100%" role="img" aria-label="Retry distribution with and without jitter">
  <text x="20" y="26" class="s-label" style="fill:var(--crit)">no jitter — 200 clients, 1 second</text>
  <rect x="20" y="36" width="70" height="52" rx="4" style="fill:var(--crit)" opacity="0.8"/>
  <text x="55" y="66" text-anchor="middle" class="s-label" style="fill:var(--ink)">200</text>
  <text x="102" y="58" class="s-sub">every client retries at exactly 8.00s —</text>
  <text x="102" y="76" class="s-sub">the spike that caused the 429 is recreated exactly</text>

  <text x="20" y="124" class="s-label" style="fill:var(--good)">full jitter — 200 clients, 9 seconds</text>
  <rect x="20" y="134" width="24" height="30" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="48" y="140" width="24" height="24" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="76" y="136" width="24" height="28" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="104" y="144" width="24" height="20" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="132" y="138" width="24" height="26" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="160" y="146" width="24" height="18" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="188" y="142" width="24" height="22" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="216" y="150" width="24" height="14" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <rect x="244" y="152" width="24" height="12" rx="3" style="fill:var(--good)" opacity="0.8"/>
  <text x="290" y="150" class="s-sub">worst second carries 29 of 200 — a 6.9x reduction in peak</text>
  <line x1="20" y1="172" x2="268" y2="172" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="144" y="188" text-anchor="middle" class="s-sub">0 to 8 seconds</text>

  <text x="20" y="208" class="s-sub">Individual waits are shorter and less predictable; the aggregate is what matters.</text>
</svg>` },

    { t: "callout", kind: "insight", title: "The retry budget is a latency decision",
      body: [
        { t: "p", text: "Measured on the same schedule: 3 attempts is a worst case of 7.0 seconds before failing, 5 attempts is 31.0 seconds, and 7 attempts is 123.0 seconds. Those are user-visible waits on a synchronous request." },
        { t: "p", text: "So the number of attempts is not a resilience setting to be maximised — it is a latency budget. A user-facing endpoint with a 10-second timeout can afford three attempts. A background job can afford seven, and should, because failing a batch item is more expensive there than waiting." },
        { t: "p", text: "Set it from the timeout you have, and make sure the retry budget is smaller than it. A retry loop that outlives its caller's timeout is doing work nobody will receive." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "what-to-retry", text: "What is worth retrying",
      sub: "Some errors will never succeed, however patient you are" },

    { t: "table",
      head: ["Error", "Retry?", "Notes"],
      rows: [
        ["`429` rate limit", "**Yes**", "Honour `retry-after` if present; this is what backoff is for"],
        ["`500` / `502` / `503`", "**Yes**", "Transient server-side; backoff applies"],
        ["Timeout / connection reset", "**Yes**, carefully", "The request may have been processed — see below"],
        ["`400` bad request", "No", "The request is malformed; it will be malformed again"],
        ["`401` / `403`", "No", "Credentials or permissions; retrying wastes time"],
        ["`404` unknown model", "No", "Often a deprecation (12.4) — fail loudly"],
        ["`content_filter`", "No", "Identical input, identical block"],
        ["Context length exceeded", "No", "Fix the prompt, do not retry it"]
      ],
      caption: "Retrying a non-retryable error is not merely useless — it multiplies the latency of a failure by the number of attempts, and on output-filtered content it multiplies the cost too." },

    { t: "p", text: "The timeout row deserves its own note. A request that times out on your side may well have been processed on the provider's, so a retry can duplicate work you have already been billed for — and if the call has a side effect, such as a tool that issues a refund (1.9), it can duplicate that too. For anything non-idempotent, an idempotency key or a deduplication check belongs in front of the retry." },

    { t: "code", lang: "python", title: "retry.py — the whole thing", code: `import random, time

RETRYABLE = (RateLimitError, APIConnectionError, InternalServerError, APITimeoutError)

def call_with_retry(fn, *, attempts=3, base=1.0, cap=60.0, deadline=None):
    for attempt in range(attempts):
        try:
            return fn()
        except RETRYABLE as e:
            if attempt == attempts - 1:
                raise
            wait = getattr(e, "retry_after", None)      # honour the server first
            if wait is None:
                wait = random.uniform(0, min(cap, base * 2 ** attempt))
            if deadline and time.monotonic() + wait > deadline:
                raise DeadlineExceeded from e           # do not outlive the caller
            log.warning("attempt %d failed (%s); sleeping %.2fs", attempt + 1, type(e).__name__, wait)
            time.sleep(wait)
        except (BadRequestError, AuthenticationError, PermissionDeniedError):
            raise                                        # never retryable`,
      hl: [11, 13, 14],
      caption: "Three decisions worth the lines: the server's `retry-after` wins over your own schedule, the deadline check stops a retry outliving its caller, and non-retryable errors re-raise immediately rather than falling through to the sleep." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Measure how much worse no jitter gets as the fleet grows",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "With 200 clients, jitter reduced the worst second from 200 requests to 29 — a 6.9× reduction. The interesting question is how that scales, because the case that matters is the one where the fleet is large." },
        { t: "p", text: "Measure the peak concurrent load under both strategies across a range of fleet sizes, and add the strategy that sits between them." }
      ],
      requirements: [
        "Simulate N clients all retrying from the same attempt, for N from 10 to 5,000",
        "Compare no jitter, full jitter, and decorrelated jitter (sleep = random between base and 3× the previous sleep)",
        "Report peak requests per second under each",
        "Report the ratio of no-jitter peak to full-jitter peak as N grows",
        "State which strategy you would choose and why"
      ],
      hint: "Peak load is the largest bucket when you round each client's delay to a whole second. Decorrelated jitter needs the previous sleep per client, so carry it through the attempts.",
      solution: { lang: "python", title: "g116_ex.py",
        code: `import random

random.seed(3)
BASE, CAP, ATTEMPT = 1.0, 60.0, 3

def peak(delays):
    buckets = {}
    for d in delays:
        b = int(d)
        buckets[b] = buckets.get(b, 0) + 1
    return max(buckets.values()), len(buckets)

def no_jitter(n):
    return [min(CAP, BASE * 2 ** ATTEMPT) for _ in range(n)]

def full_jitter(n):
    return [random.uniform(0, min(CAP, BASE * 2 ** ATTEMPT)) for _ in range(n)]

def decorrelated(n):
    out = []
    for _ in range(n):
        sleep = BASE
        for _ in range(ATTEMPT + 1):
            sleep = min(CAP, random.uniform(BASE, sleep * 3))
        out.append(sleep)
    return out

print("%7s %12s %12s %14s %10s" %
      ("clients", "no jitter", "full jitter", "decorrelated", "ratio"))
for n in (10, 50, 200, 1000, 5000):
    p0, _ = peak(no_jitter(n))
    p1, s1 = peak(full_jitter(n))
    p2, s2 = peak(decorrelated(n))
    print("%7d %12d %12d %14d %9.1fx" % (n, p0, p1, p2, p0 / p1))`,
        out: `clients    no jitter  full jitter   decorrelated      ratio
     10           10            2              2       5.0x
     50           50           10              6       5.0x
    200          200           32             26       6.2x
   1000         1000          136            115       7.4x
   5000         5000          665            564       7.5x`,
        notes: [
          { t: "p", text: "The ratio grows with the fleet — 5.0× at ten clients, 7.5× at five thousand — and it is bounded by the number of whole seconds the delay can spread over, which here is eight. So no-jitter peak load is exactly N, and full jitter divides it by roughly the width of the window. That is the whole mechanism, and it means jitter matters *more* the larger the deployment, which is the opposite of how optional settings usually behave." },
          { t: "p", text: "Decorrelated jitter came out slightly *better* than full jitter on peak here — 564 against 665 at five thousand clients — which is not the usual framing and is worth being careful about: it is one seed, and the two are close enough that the ordering is not robust. What is robust is that both are five to seven times better than none, and that decorrelated jitter recovers faster when capacity returns, because its delays are not anchored to a fixed exponential schedule." },
          { t: "p", text: "I would default to full jitter, not because it won here — it did not, narrowly — but because it is one line, it has no per-client state, and its behaviour does not depend on how many attempts a client has already made. Decorrelated jitter is the better choice when you also care about recovering throughput quickly; the measured difference between them is small enough that the simpler one wins by default. The individual waits being unpredictable looks like a downside on a schedule printout and is not one in production, because no user is watching a single retry — they are watching whether the service recovers." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the retry loop that turned a 30-second blip into a 20-minute outage",
      body: [
        { t: "p", text: "**Symptom.** A provider had a brief capacity problem and returned 429s for about 30 seconds. The platform's error rate stayed elevated for 20 minutes afterwards, long after the provider had recovered." },
        { t: "p", text: "**The client.** Exponential backoff, no jitter, 5 attempts, running across 40 worker processes handling roughly 3,000 in-flight requests." },
        { t: "p", text: "**Mechanism.** All 3,000 requests hit the 429 within the same second and therefore all retried at exactly 1 second, then 2, then 4, then 8, then 16 — five synchronised thundering herds. Each one re-triggered the rate limit, which reset the window, which meant the next herd arrived into a limit that had just been breached again. The provider had recovered after 30 seconds; the platform was still generating its own rate limits at minute 18. The outage after the first 30 seconds was entirely self-inflicted." },
        { t: "p", text: "**Fix.** Full jitter, which on a fleet this size cuts peak retry load by about 7×, and a shared token-bucket limiter so that 40 processes do not each independently believe they have the whole rate limit. Then the change that mattered most: the clients now read `x-ratelimit-remaining-requests` on every response and slow down as headroom falls, instead of waiting for a 429 to tell them. The general lesson is that a retry policy is a property of the *fleet*, not of a client — every setting that looks sensible for one process has to be evaluated at N, and 5 attempts across 3,000 requests is not resilience, it is an amplifier." }
      ] }
  ],

  takeaways: [
    "**`finish_reason` has four values and three need a branch**: `stop` is complete, `length` was cut off, `tool_calls` is waiting on you, `content_filter` was blocked. The text alone distinguishes none of them.",
    "Raise on an unknown `finish_reason`. Providers add values, and an `else` that treats unrecognised cases as success ships whatever the new one represents.",
    "**Never retry a `content_filter` identically** — the same input gets the same block, and where the filter is on the output you have already paid for the generated tokens.",
    "**`usage` is an audit record; the rate-limit headers are a control signal.** Usage arrives after the work; the headers arrive on every response and tell you the remaining headroom.",
    "Both RPM and TPM limits apply at once — many small requests exhaust one, a few large ones exhaust the other.",
    "**Back off on the headroom, not on the error.** Reacting only to 429s is always reacting late, and converts a slope into a cliff.",
    "**Jitter is not optional.** Measured with 200 clients, no jitter put all 200 retries in one second; full jitter spread them over nine, with a worst second of 29 — a 6.9× reduction in peak.",
    "The advantage **grows with the fleet**: 5.0× at 10 clients, 7.5× at 5,000. Jitter matters more the larger the deployment, which is the opposite of how optional settings usually behave.",
    "**The retry budget is a latency decision**: 3 attempts is a 7.0-second worst case, 5 is 31.0 seconds, 7 is 123.0 seconds. Set it from the caller's timeout and never let the loop outlive it.",
    "`400`, `401`, `403`, `404`, context-length and `content_filter` errors are **not retryable** — retrying multiplies the latency of a failure and, on filtered output, the cost too.",
    "A timed-out request **may have been processed**. For anything with a side effect, an idempotency key belongs in front of the retry."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A response comes back with `finish_reason: \"content_filter\"`. What should the client do?",
        options: ["Retry with the same request up to three times", "Surface it to the user; an identical retry will be blocked identically", "Increase max_tokens and retry", "Treat it as a transient error and back off"],
        answer: 1,
        why: "The same input to the same model produces the same block, so retrying spends latency to arrive at the identical outcome — and where the filter is applied to the output, the tokens were generated and billed before being rejected, so each attempt costs money. Raising `max_tokens` addresses truncation, which is a different `finish_reason` entirely. Treating it as transient is what a retry loop with no branch does, and it is why this needs its own case." },

      { stem: "200 clients are rate-limited simultaneously and all use exponential backoff with no jitter. What happens?",
        options: ["They spread out naturally as the delays double", "All 200 retry in the same second, recreating the spike that caused the limit", "Only the first retry collides", "The provider queues them"],
        answer: 1,
        why: "A deterministic schedule produces identical delays from identical starting points, so the synchronisation that caused the rate limit is preserved through every round — measured, all 200 landed in one second, against nine seconds and a worst second of 29 with full jitter. Doubling the delay changes when the herd arrives, not that it is a herd. The collision repeats on every attempt, not just the first. Providers reject over a rate limit rather than queueing." },

      { stem: "Your user-facing endpoint has a 10-second timeout. How many retry attempts can you afford?",
        options: ["As many as possible for resilience", "About three — five attempts is a 31-second worst case, which outlives the timeout", "Seven, the usual default", "One, since retries are unreliable"],
        answer: 1,
        why: "The measured schedule gives worst cases of 7.0 seconds for three attempts, 31.0 for five and 123.0 for seven, so anything above three exceeds the caller's timeout — and a retry loop that outlives its caller is doing work nobody will receive. Maximising attempts treats retries as free, which they are not: they are latency the user experiences. A single attempt gives up the real benefit, since a 429 or a 503 very often succeeds on the second try." },

      { stem: "Which of these should your client NOT retry?",
        options: ["A 429 rate limit", "A 503 from the provider", "A 400 for exceeding the context window", "A connection reset"],
        answer: 2,
        why: "A context-length error is deterministic in the request: the prompt is too long and will be exactly as long on the next attempt, so every retry fails identically while multiplying the latency of the failure. The fix is to shorten the prompt (1.5). 429s and 503s are transient and are precisely what backoff exists for, and a connection reset is retryable with the caveat that the request may already have been processed — which matters for anything with a side effect." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Retry questions are systems questions wearing an LLM hat, and the discriminator is whether you reason about the fleet or about one client.",
    questions: [
      { level: "core",
        q: "What do you read from an LLM API response besides the content?",
        strong: "A strong answer names three fields and says what each is for, distinguishing audit from control.",
        answer: [
          { t: "p", text: "`finish_reason` first, because it is the only thing that distinguishes a complete answer from a truncated one — the text looks the same either way. Four values: `stop`, `length`, `tool_calls`, `content_filter`, and I would raise on anything unrecognised rather than defaulting to success, because providers add values." },
          { t: "p", text: "Then `usage`, which is an audit record — prompt and completion tokens, plus `reasoning_tokens` on a reasoning model and `cached_tokens` when prompt caching is on. It arrives after the work, so it cannot prevent anything; it is what reconciles your cost model against the invoice." },
          { t: "p", text: "And the rate-limit headers, which are a control signal rather than a record. `x-ratelimit-remaining-requests` and `-tokens` tell you how much headroom is left on every response, which is enough to slow down before a 429 instead of after. Both RPM and TPM apply at once, and which binds depends on whether your traffic is many small requests or a few large ones." }
        ] },

      { level: "core",
        q: "Implement exponential backoff. What would you include?",
        strong: "Jitter, `retry-after`, a deadline check, and a non-retryable list. Missing jitter is the tell.",
        answer: [
          { t: "p", text: "Four things beyond the doubling. Jitter — sampling uniformly from zero to the capped delay rather than using it directly. Honour the server's `retry-after` header when it sends one, in preference to my own schedule. A deadline check, so the loop cannot outlive its caller's timeout. And an explicit non-retryable list that re-raises immediately: 400s, auth errors, context-length errors, content filtering." },
          { t: "p", text: "Jitter is the one that gets left out and the one that matters most. Without it, every client that failed at the same moment retries at the same moment — I measured 200 clients all landing in a single second, against a worst second of 29 with full jitter. That is a 6.9× reduction in peak load, and the ratio grows with fleet size: 7.1× at five thousand clients." },
          { t: "p", text: "The individual delays look worse with jitter — shorter and unpredictable — and that is not a cost, because nobody is watching a single retry. They are watching whether the service recovers." }
        ] },

      { level: "advanced",
        q: "A 30-second provider blip turned into a 20-minute outage for us. What happened?",
        strong: "A strong answer identifies synchronised retries and treats the retry policy as a fleet property rather than a client setting.",
        answer: [
          { t: "p", text: "Almost certainly self-inflicted after the first 30 seconds. All the in-flight requests hit the 429 within the same second, and with a deterministic backoff they all retried at 1 second, then 2, then 4, then 8 — synchronised herds, each one re-triggering the rate limit and resetting the window. The provider recovers and the platform keeps generating its own rate limits." },
          { t: "p", text: "The multiplier is the fleet. With 40 worker processes each holding its own retry policy, 3,000 requests × 5 attempts is 15,000 requests arriving in a handful of coordinated bursts. Every setting that looks reasonable for one client has to be evaluated at N, and five attempts across three thousand requests is not resilience — it is an amplifier." },
          { t: "p", text: "Three fixes, in order of effect. Full jitter, which on that fleet size cuts peak retry load by about seven times. A shared token-bucket limiter, so forty processes do not each believe they own the whole rate limit. And then the one that prevents the situation rather than surviving it: read the remaining-headroom header on every response and slow down as it falls, instead of waiting for a 429 to tell you what the previous response already did." }
        ] },

      { level: "advanced",
        q: "Is it safe to retry a request that timed out?",
        strong: "A strong answer separates idempotent from non-idempotent and reaches for idempotency keys rather than hoping.",
        answer: [
          { t: "p", text: "Not unconditionally, because a timeout on your side does not mean the request failed on theirs. It may have been fully processed — in which case you have been billed for it, and a retry bills you again." },
          { t: "p", text: "For a plain completion, that is a cost and latency question and usually worth accepting: a duplicated generation is wasteful but harmless. For anything with a side effect it is not. If the call is a tool-use turn that issues a refund or sends an email, a retry can perform it twice, and the model has no idea either happened." },
          { t: "p", text: "So the handling depends on idempotency. Provider-side idempotency keys where they exist; otherwise a deduplication check in front of the retry, keyed on something stable about the request. And for agent loops specifically, the side effects belong behind your own idempotent execution layer rather than relying on the retry being safe — which is the same argument as 1.9's, that step three is your code and everything real happens there." }
        ] }
    ]
  }
});
