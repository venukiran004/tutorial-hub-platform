/* ============================================================================
   LESSON 15.9 — Async and Batching for LLM Workloads
   ========================================================================= */
EC.receiveLesson({
  id: "15.9",

  lede: "An LLM workload is almost entirely waiting. **A thousand calls that each take four seconds is an hour sequentially and under a minute concurrently** — the work is the provider's, and your job is to keep enough requests in flight without exceeding a rate limit, exhausting memory, or building a queue nobody will ever consume.",

  objectives: [
    "Run many provider calls concurrently, with a bounded degree of concurrency",
    "Respect rate limits that are measured in both requests and tokens",
    "Apply backpressure so an overloaded system degrades rather than collapses",
    "Cache at the right granularity, including the provider's own cache",
    "Set timeouts that free a worker rather than merely failing later"
  ],

  prerequisites: ["11.6", "15.8"],

  blocks: [

    { t: "h2", n: "01", text: "Concurrency, bounded", id: "concurrency" },

    { t: "ladder",
      title: "Classifying ten thousand documents",
      rungs: [
        { level: "bad", label: "Sequentially",
          why: "Each call waits four seconds doing nothing while the CPU idles. Ten thousand documents is eleven hours, and the provider was never the constraint — your loop was.",
          code: `results = []
for doc in documents:            # 10,000 x 4s
    results.append(await classify(doc))
# 11 hours. The provider could have served all of them in minutes.` },
        { level: "ok", label: "All at once with `gather`",
          why: "Ten thousand simultaneous requests. The provider rate-limits you within seconds, every task holds its document in memory, and a single failure in the middle loses everything `gather` was collecting.",
          code: `results = await asyncio.gather(*[classify(d) for d in documents])
# 429s immediately, ~4GB of held documents, and one exception
# cancels the lot.` },
        { level: "best", label: "A bounded worker pool",
          why: "A fixed number in flight at any moment. Throughput is set by the limit you choose rather than by the size of the input, memory is bounded, and one failure affects one document.",
          code: `async def classify_all(
    documents: list[str], concurrency: int = 20,
) -> list[Result | Exception]:
    sem = asyncio.Semaphore(concurrency)

    async def one(doc: str) -> Result | Exception:
        async with sem:              # at most N inside this block
            try:
                return await classify(doc)
            except Exception as exc:
                # Return the failure rather than raising: one bad
                # document must not discard 9,999 good results.
                return exc

    return await asyncio.gather(*(one(d) for d in documents))

# 10,000 / 20 x 4s = ~33 minutes, and it does not fall over.`,
          note: "**Note that all 10,000 coroutines are still created up front.** That is fine for a list of strings and wrong for large documents — see the streaming version below." }
      ]
    },

    { t: "code", lang: "python", title: "streaming the input, for a queue that does not fit in memory", code: `
async def process_stream(
    source: AsyncIterator[Document],
    concurrency: int = 20,
) -> AsyncIterator[Result]:
    """Constant memory regardless of input size.

    The semaphore version above creates every coroutine immediately.
    This creates at most \`concurrency\` at a time, so a million
    documents costs the same as twenty.
    """
    pending: set[asyncio.Task] = set()

    async for doc in source:
        pending.add(asyncio.create_task(classify(doc)))

        if len(pending) >= concurrency:
            done, pending = await asyncio.wait(
                pending, return_when=asyncio.FIRST_COMPLETED
            )
            for task in done:
                yield task.result()

    # Drain what remains.
    for task in asyncio.as_completed(pending):
        yield await task
`,
      hl: [12, 17],
      caption: "**`gather` on a generator still materialises every coroutine.** When the input is large or unbounded, create tasks as capacity frees up rather than all at once."
    },

    { t: "h2", n: "02", text: "Rate limits have two dimensions", id: "rate-limits" },

    { t: "viz",
      title: "Requests per minute and tokens per minute",
      caption: "Providers limit both. A concurrency setting tuned against the request limit will breach the token limit the moment your prompts get longer — and the prompt length is not something you control.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Two independent rate limits, requests and tokens per minute">
  <text x="24" y="30" class="s-label">Two independent budgets, refilling continuously</text>

  <text x="24" y="66" class="s-sub">requests / min</text>
  <rect x="150" y="50" width="600" height="26" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
  <rect x="150" y="50" width="220" height="26" rx="5" style="fill:var(--good);opacity:.35"/>
  <text x="762" y="68" class="s-sub" style="fill:var(--ink-3)">1,000</text>
  <text x="380" y="68" class="s-sub" style="fill:var(--good)">370 used</text>

  <text x="24" y="118" class="s-sub">tokens / min</text>
  <rect x="150" y="102" width="600" height="26" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
  <rect x="150" y="102" width="558" height="26" rx="5" style="fill:var(--crit);opacity:.4"/>
  <text x="762" y="120" class="s-sub" style="fill:var(--ink-3)">400,000</text>
  <text x="718" y="120" text-anchor="end" class="s-sub" style="fill:var(--crit)">372,000 used — the binding limit</text>

  <text x="24" y="172" class="s-sub" style="fill:var(--ink-3)">37% of the request budget, 93% of the token budget. Concurrency tuned on request count will 429.</text>
  <text x="24" y="200" class="s-sub" style="fill:var(--ink-3)">Longer documents move the second bar without moving the first, so the limit you hit changes with your input.</text>
  <text x="24" y="232" class="s-sub" style="fill:var(--warn)">Reserve against the ESTIMATE before the call, then reconcile with the ACTUAL usage from the response.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "a limiter that tracks both", code: `
class DualRateLimiter:
    """Token-bucket on requests AND tokens, because providers meter
    both and the binding constraint changes with your input."""

    def __init__(self, requests_per_min: int, tokens_per_min: int):
        self.rpm, self.tpm = requests_per_min, tokens_per_min
        self.request_tokens = float(requests_per_min)
        self.token_tokens = float(tokens_per_min)
        self.updated = time.monotonic()
        self.lock = asyncio.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.updated
        # Continuous refill, not a per-minute reset: a reset produces
        # a thundering herd at the top of each minute.
        self.request_tokens = min(self.rpm,
                                  self.request_tokens + elapsed * self.rpm / 60)
        self.token_tokens = min(self.tpm,
                                self.token_tokens + elapsed * self.tpm / 60)
        self.updated = now

    async def acquire(self, estimated_tokens: int) -> None:
        while True:
            async with self.lock:
                self._refill()
                if self.request_tokens >= 1 and \\
                   self.token_tokens >= estimated_tokens:
                    self.request_tokens -= 1
                    self.token_tokens -= estimated_tokens
                    return
                # How long until BOTH budgets can satisfy this call.
                wait = max(
                    (1 - self.request_tokens) * 60 / self.rpm,
                    (estimated_tokens - self.token_tokens) * 60 / self.tpm,
                )
            await asyncio.sleep(min(wait, 5) + random.random() * 0.1)

    async def reconcile(self, estimated: int, actual: int) -> None:
        """Estimates are wrong in both directions. Give back what was
        over-reserved so the limiter does not throttle unnecessarily."""
        async with self.lock:
            self.token_tokens = min(self.tpm,
                                    self.token_tokens + (estimated - actual))
`,
      hl: [15, 32, 38],
      caption: "**Reconciling after the call matters more than it looks.** Over-estimating by 30% on every request means you throttle yourself at 70% of the limit you are paying for."
    },

    { t: "callout", kind: "trap", title: "Client-side limiting is not enough", body: [
      { t: "code", lang: "python", title: "three reasons it breaks", numbered: false, code: `
# 1. MULTIPLE PROCESSES SHARE ONE PROVIDER ACCOUNT.
#    Eight gunicorn workers, six pods: 48 independent limiters, each
#    thinking it may use the full budget. A distributed limiter needs
#    shared state:
#      Redis INCR with an expiry, or a token bucket in Redis.

# 2. YOUR ESTIMATE IS NOT THEIR COUNT. Output tokens are unknown
#    before the call, and their tokeniser is not your approximation.

# 3. LIMITS CHANGE WITHOUT NOTICE -- a tier change, a provider-side
#    adjustment, or a temporary reduction during an incident.

# SO: client-side limiting REDUCES 429s; it does not eliminate them.
# Always handle the 429 as well, and honour Retry-After:
except RateLimitError as exc:
    delay = float(exc.response.headers.get("retry-after", 2 ** attempt))
    await asyncio.sleep(delay + random.random())

# ADAPTIVE CONCURRENCY is the practical answer at scale: reduce on
# 429, increase slowly on sustained success -- the same shape as TCP
# congestion control.
class AdaptiveLimiter:
    def on_success(self) -> None:
        self.limit = min(self.max_limit, self.limit + 0.05)
    def on_rate_limit(self) -> None:
        self.limit = max(1, self.limit * 0.5)      # halve immediately`},
      { t: "p", text: "**Additive increase, multiplicative decrease** is the right shape: back off hard when told to, recover gently. Recovering quickly after a 429 produces an oscillation that spends most of its time rate-limited." }
    ]},

    { t: "h2", n: "03", text: "Backpressure", id: "backpressure" },

    { t: "code", lang: "python", title: "refuse work you cannot do", code: `
# WITHOUT BACKPRESSURE: accept everything, queue it, and fail later.
#
#   requests arrive at 100/s, capacity is 20/s
#   -> the queue grows by 80/s
#   -> after 60s: 4,800 queued requests
#   -> every client has timed out and retried, adding more
#   -> memory grows, latency is minutes, nothing succeeds
#
# The system does not degrade -- it collapses, and the collapse
# continues after the load stops.

queue: asyncio.Queue = asyncio.Queue(maxsize=500)   # BOUNDED


@app.post("/summarise")
async def summarise(req: Request) -> Response:
    try:
        # Refuse immediately rather than queueing indefinitely.
        queue.put_nowait(job)
    except asyncio.QueueFull:
        raise HTTPException(
            503, "At capacity, please retry",
            headers={"Retry-After": "10"},   # tell them WHEN
        )

    # A deadline the client actually cares about. Work that outlives
    # its client is waste.
    try:
        async with asyncio.timeout(30):
            return await job.result()
    except TimeoutError:
        job.cancel()                 # stop doing it
        raise HTTPException(504, "Timed out")


# LOAD SHEDDING, when even the queue is not enough: drop the requests
# that are already doomed.
async def worker() -> None:
    while True:
        job = await queue.get()
        # If it has been waiting longer than the client's timeout,
        # the client is gone. Doing the work now costs money and
        # helps nobody.
        if time.monotonic() - job.enqueued_at > CLIENT_TIMEOUT:
            jobs_shed.inc()
            job.cancel()
            continue
        await process(job)
`,
      hl: [12, 20, 30, 42],
      caption: "**Shedding stale work is what breaks the death spiral.** Once every queued job is older than its client's timeout, processing them is pure cost — and it prevents the queue from ever draining."
    },

    { t: "h2", n: "04", text: "Caching", id: "caching" },

    { t: "table",
      head: ["Layer", "Saves", "Cost"],
      rows: [
        ["**Exact-match cache**", "**100%** of a repeated call", "Only helps on identical input"],
        ["**Provider prompt cache**", "~90% of the cached prefix", "A stable prefix; a short TTL"],
        ["Semantic cache (embeddings)", "100%, on similar input", "**An embedding call, and false hits**"],
        ["Partial results", "Re-running only what failed", "State to manage"]
      ],
      caption: "**Prompt caching is the highest-value option for most applications**, because a long stable system prompt is the common case and the saving needs no exact repeat."
    },

    { t: "code", lang: "python", title: "the two caches worth having", code: `
# 1. EXACT MATCH. Key on everything that changes the output --
#    including the model and any parameter, or a model upgrade
#    silently serves stale answers.
def cache_key(prompt: str, model: str, temperature: float) -> str:
    return "llm:" + hashlib.sha256(
        f"{model}|{temperature}|{prompt}".encode()
    ).hexdigest()

async def cached_call(prompt: str, **kw) -> str:
    key = cache_key(prompt, kw["model"], kw.get("temperature", 0))
    if hit := await redis.get(key):
        cache_hits.inc()
        return hit
    result = await call(prompt, **kw)
    await redis.setex(key, 86_400, result)
    return result


# 2. PROVIDER PROMPT CACHING. The stable PREFIX is cached on their
#    side, so it is not re-processed. Order matters: everything
#    before the cache breakpoint must be byte-identical.
response = await client.messages.create(
    model=MODEL,
    system=[
        {"type": "text", "text": LONG_SYSTEM_PROMPT,        # stable
         "cache_control": {"type": "ephemeral"}},
    ],
    messages=[
        {"role": "user", "content": [
            {"type": "text", "text": large_reference_document,  # stable
             "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": user_question},            # varies
        ]},
    ],
)
# Reading the cached portion costs roughly a tenth of the normal
# input rate; WRITING it costs slightly more than normal. So it pays
# off after about two uses and is a loss for a one-off call.

response.usage.cache_read_input_tokens     # measure it
response.usage.cache_creation_input_tokens
`,
      hl: [4, 21, 30, 36],
      caption: "**Put the variable part last.** The cache matches a prefix, so a timestamp at the top of your system prompt invalidates the whole thing on every call."
    },

    { t: "callout", kind: "tradeoff", title: "Semantic caching", body: [
      { t: "p", text: "Embed the query, find a near neighbour above a similarity threshold, and return its cached answer. It catches paraphrases that an exact cache misses — and it returns **wrong** answers when two similar-looking questions have different answers." },
      { t: "code", lang: "python", title: "where it goes wrong", numbered: false, code: `
"What is our refund policy for UK customers?"
"What is our refund policy for US customers?"
#   cosine similarity ~0.97 -- above almost any threshold, and the
#   answers are completely different.

"How do I cancel my subscription?"
"How do I cancel my subscription and get a refund?"
#   ~0.95, and the second needs an answer the first does not contain.

# IF YOU USE IT:
#   - a high threshold (0.97+), tuned on YOUR queries
#   - never for anything factual, personalised or jurisdictional
#   - log every hit so wrong answers are discoverable
#   - measure the false-hit rate before trusting it`},
      { t: "p", text: "**Use it for high-volume, low-stakes, repetitive queries** — an FAQ bot with a narrow domain. Not for anything where a confidently wrong answer costs more than an API call." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a batch job finish",
      difficulty: "expert",
      minutes: 36,
      body: [
        { t: "p", text: "This nightly job summarises the previous day's support tickets. It has never completed successfully: it either runs past its window, exhausts memory, or dies with rate-limit errors." },
        { t: "code", lang: "python", numbered: false, title: "jobs/summarise_tickets.py", code: `
async def summarise_all():
    tickets = db.query(Ticket).filter(
        Ticket.created_at >= yesterday()).all()      # ~80,000

    summaries = await asyncio.gather(*[
        summarise(t) for t in tickets
    ])

    for ticket, summary in zip(tickets, summaries):
        db.save_summary(ticket.id, summary)
    db.commit()

async def summarise(ticket):
    response = await client.messages.create(
        model="claude-opus-4",
        max_tokens=2000,
        messages=[{"role": "user",
                   "content": SUMMARY_PROMPT + ticket.full_thread}],
    )
    return response.content[0].text`},
        { t: "p", text: "Rewrite it. Give the concurrency figure with arithmetic, and explain what happens today at each stage of the failure." }
      ],
      requirements: [
        "Trace the failure from the first line to the crash.",
        "Explain why `gather` is the wrong primitive here.",
        "Compute a concurrency limit from the rate limits.",
        "Make the job resumable.",
        "Add the caching and cost controls.",
        "Estimate the runtime and cost, before and after."
      ],
      hint: "Count how many coroutines exist a microsecond after `gather` is called, and what each one holds.",
      solution: {
        lang: "python",
        title: "jobs/summarise_tickets.py",
        code: `# =========================================================================
# THE FAILURE, TRACED
# =========================================================================
#
# t=0     .all() loads 80,000 Ticket ORM objects, each with a
#         full_thread that averages perhaps 8 KB.
#           80,000 x 8 KB of text        = 640 MB
#           + ORM object overhead (~3x)  = ~2 GB
#         The job has not made a single API call yet and is already
#         near a typical container limit.
#
# t=0.1s  gather creates 80,000 COROUTINES SIMULTANEOUSLY. Each holds
#         a reference to its ticket and builds its own prompt string,
#         which duplicates the thread text again:
#           + another 640 MB of prompt strings
#         The event loop now has 80,000 tasks scheduled.
#
# t=1s    All 80,000 attempt HTTP connections at once.
#           - the connection pool (default ~100) queues the rest
#           - the provider sees a burst far above any rate limit
#
# t=2s    429s begin. With no handling they propagate as exceptions.
#
# t=2s    THE gather PROBLEM: the first exception CANCELS EVERY OTHER
#         TASK (return_exceptions defaults to False). 79,999 calls in
#         flight are discarded -- including the ones that succeeded
#         and whose results are now lost. Money spent, nothing saved.
#
# t=~3s   The job dies. Nothing was written, because db.commit() is
#         after the gather. Every retry starts from zero and fails
#         identically.
#
# WHEN IT DOES NOT DIE AT t=3s (a smaller day, or a raised limit) it
# instead runs past its window: sequential-equivalent throughput once
# rate limiting throttles everything, with no progress recorded.
#
# WHY gather IS THE WRONG PRIMITIVE:
#   1. it materialises every coroutine immediately -- memory is a
#      function of input size, not of concurrency
#   2. it has no concurrency limit at all
#   3. one failure cancels everything by default
#   4. nothing is available until ALL of it is
#
#
# =========================================================================
# THE CONCURRENCY FIGURE
# =========================================================================
#
# Suppose the account's limits are 4,000 requests/min and 400,000
# input tokens/min.
#
# MEASURE the average call:
#   input   ~2,200 tokens (prompt + an 8 KB thread)
#   output    ~350 tokens
#   latency    ~6 s
#
# BOUND 1 -- the token limit (usually binding):
#   400,000 / 2,200 = 181 requests/min
#
# BOUND 2 -- the request limit:
#   4,000 requests/min
#
# The token limit binds at 181 rpm, roughly 3 requests/second.
#
# CONCURRENCY = throughput x latency  (Little's Law)
#             = 3 req/s x 6 s
#             = 18 in flight
#
# Use 15 to leave headroom for estimate error and for anything else
# sharing the account. That is the number -- derived, not guessed.
#
# RUNTIME: 80,000 / 181 per minute = ~7.4 hours.
#
# THAT DOES NOT FIT A NIGHTLY WINDOW, which is the real finding. The
# fixes below address it: caching, a smaller model with a higher
# limit, or the provider's batch API.


# =========================================================================
# THE REWRITE
# =========================================================================

CONCURRENCY = 15
BATCH_SIZE = 500          # database batch, not API batch
MODEL = "claude-haiku-4-5-20251001"     # see the cost note below


async def summarise_all(day: date) -> RunStats:
    """Streaming, bounded, resumable, and it records progress as it
    goes rather than at the end."""
    stats = RunStats()
    limiter = DualRateLimiter(requests_per_min=4_000,
                              tokens_per_min=400_000)
    sem = asyncio.Semaphore(CONCURRENCY)

    async def one(ticket: TicketRow) -> None:
        async with sem:
            try:
                summary = await summarise(ticket, limiter)
                await save_summary(ticket.id, summary)   # SAVE AS WE GO
                stats.succeeded += 1
            except Exception:
                # One ticket failing must not affect the other 79,999.
                logger.exception("summary_failed",
                                 extra={"ticket_id": ticket.id})
                await mark_failed(ticket.id)
                stats.failed += 1

    # STREAM the input. yield_per keeps the database result on the
    # server, so memory is a function of BATCH_SIZE, not of 80,000
    # (Lesson 13.3).
    pending: set[asyncio.Task] = set()
    async for ticket in stream_unsummarised(day, batch=BATCH_SIZE):
        pending.add(asyncio.create_task(one(ticket)))
        if len(pending) >= CONCURRENCY * 2:
            _, pending = await asyncio.wait(
                pending, return_when=asyncio.FIRST_COMPLETED)

    if pending:
        await asyncio.wait(pending)
    return stats


async def stream_unsummarised(day: date, batch: int):
    """RESUMABILITY, in one WHERE clause. A re-run after a crash
    picks up only what is not yet done, so restarting is free and
    the job can be interrupted at any moment (Lesson 15.3)."""
    stmt = (
        select(Ticket)
        .outerjoin(Summary, Summary.ticket_id == Ticket.id)
        .where(Ticket.created_at >= day,
               Ticket.created_at < day + timedelta(days=1),
               Summary.id.is_(None))          # not yet summarised
        .execution_options(yield_per=batch)
    )
    async for row in await db.stream_scalars(stmt):
        yield row


async def summarise(ticket: TicketRow, limiter: DualRateLimiter) -> str:
    # 1. CACHE: an unchanged thread has an unchanged summary.
    key = f"summary:{MODEL}:{sha256(ticket.full_thread)}"
    if cached := await redis.get(key):
        cache_hits.inc()
        return cached

    # 2. TRUNCATE. A 200 KB thread is not more informative than its
    #    first and last few thousand tokens, and it is 100x the cost.
    thread = truncate_middle(ticket.full_thread, max_tokens=4_000)
    estimated = count_tokens(SUMMARY_PROMPT) + count_tokens(thread) + 400

    # 3. RESERVE against both limits BEFORE calling.
    await limiter.acquire(estimated)

    for attempt in range(3):
        try:
            async with asyncio.timeout(60):
                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=400,          # a summary, not an essay
                    system=[{
                        "type": "text", "text": SUMMARY_PROMPT,
                        # The prompt is identical for all 80,000
                        # calls, so caching it is nearly free after
                        # the first.
                        "cache_control": {"type": "ephemeral"},
                    }],
                    messages=[{"role": "user", "content": thread}],
                )
            break

        except RateLimitError as exc:
            delay = float(exc.response.headers.get("retry-after",
                                                   2 ** attempt))
            await asyncio.sleep(delay + random.random())
        except (APIConnectionError, InternalServerError, APITimeoutError):
            if attempt == 2:
                raise
            await asyncio.sleep((2 ** attempt) + random.random())
    else:
        raise ProviderUnavailable(ticket.id)

    # 4. RECONCILE: give back what was over-reserved, or the limiter
    #    throttles at well below the real limit.
    await limiter.reconcile(estimated, response.usage.input_tokens)
    llm_tokens.labels(feature="summarise", kind="input").inc(
        response.usage.input_tokens)

    summary = response.content[0].text
    await redis.setex(key, 604_800, summary)
    return summary


async def save_summary(ticket_id: UUID, summary: str) -> None:
    """Upsert, so a re-run replaces rather than duplicates
    (Lesson 15.3)."""
    await db.execute(text("""
        INSERT INTO summaries (ticket_id, summary, model, created_at)
        VALUES (:id, :summary, :model, now())
        ON CONFLICT (ticket_id) DO UPDATE SET
            summary = EXCLUDED.summary,
            model = EXCLUDED.model,
            created_at = EXCLUDED.created_at
    """), {"id": ticket_id, "summary": summary, "model": MODEL})
    await db.commit()


# =========================================================================
# GETTING IT INSIDE THE WINDOW
# =========================================================================
#
# 7.4 hours is still too long. Four options, in order of value:
#
# 1. THE PROVIDER'S BATCH API. Submit all 80,000 as one job, poll for
#    completion. Typically ~50% cheaper and NOT subject to the
#    interactive rate limits -- results within hours. This is the
#    correct answer for an overnight job with no latency requirement,
#    and it removes the concurrency problem entirely.
#
# 2. A SMALLER MODEL. Summarisation is not a frontier-model task.
#    Haiku has a higher rate limit and costs roughly a tenth as much,
#    which cuts BOTH the runtime and the bill.
#
# 3. TRUNCATION. Most of the token cost is long threads. Capping at
#    4,000 tokens typically halves total input tokens, which directly
#    halves the token-limit-bound runtime.
#
# 4. CACHING. Tickets updated but not materially changed hit the
#    content-hash cache -- in practice 20-40% on a nightly re-run.
#
# Combined, 1 and 2 alone move this from "never finishes" to "done
# before anyone arrives".
#
#
# =========================================================================
# COST AND RUNTIME
# =========================================================================
#
#                        before              after
#   memory               ~3 GB, then OOM     ~250 MB (streamed)
#   coroutines           80,000 at once      30
#   completed runs       0                   1
#   partial progress     none (all-or-        saved per ticket
#                        nothing)
#   runtime              never / 7.4 h       ~40 min (batch API)
#   model                opus                haiku
#   input tokens/call    ~2,200              ~1,100 (truncated)
#   est. cost/night      ~$400 (if it ran)   ~$12
#
# The largest single change is the model, and the largest structural
# change is saving progress per ticket -- a job that cannot record
# partial progress cannot be retried, which is why it had never
# completed.


# =========================================================================
# TESTS
# =========================================================================

async def test_concurrency_is_bounded(mock_llm):
    """The gather bug. At most N calls in flight at any instant."""
    mock_llm.with_delay(0.1)

    await summarise_all(day=YESTERDAY)

    assert mock_llm.max_concurrent <= CONCURRENCY


async def test_memory_does_not_scale_with_input(db):
    """Streaming, not .all(). 80,000 tickets must cost the same as
    800."""
    seed_tickets(80_000, thread_size=8_000)

    peak = await measure_peak_rss(summarise_all, YESTERDAY)

    assert peak < 500 * 1024**2


async def test_one_failure_does_not_lose_the_others(mock_llm):
    """gather cancelled 79,999 in-flight calls on the first error."""
    seed_tickets(100)
    mock_llm.fails_on_call(50)

    stats = await summarise_all(YESTERDAY)

    assert stats.succeeded == 99
    assert stats.failed == 1
    assert count_summaries() == 99


async def test_the_job_is_resumable(db, mock_llm):
    """Interrupted at 40%, restarted, and it does not redo the first
    40% or skip anything."""
    seed_tickets(1_000)
    await run_until(summarise_all, stop_after=400)
    calls_before = mock_llm.call_count

    await summarise_all(YESTERDAY)

    assert count_summaries() == 1_000
    assert mock_llm.call_count == calls_before + 600   # not 1,400


async def test_a_rate_limit_is_respected(mock_llm):
    """The limiter must keep us under the token budget, not merely
    react to 429s."""
    limiter = DualRateLimiter(requests_per_min=60, tokens_per_min=6_000)

    with timed() as t:
        await asyncio.gather(*(limiter.acquire(1_000) for _ in range(12)))

    assert t.elapsed >= 60, "12 x 1,000 tokens exceeded 6,000/min"


async def test_unchanged_tickets_are_not_reprocessed(mock_llm):
    await summarise_all(YESTERDAY)
    calls = mock_llm.call_count

    await summarise_all(YESTERDAY)          # same day, same content

    assert mock_llm.call_count == calls`,
        notes: [
          { t: "p", text: "**`gather` materialises all 80,000 coroutines a microsecond after it is called**, each holding its ticket and building its own prompt string — so memory is a function of input size rather than of concurrency, and the job is near its container limit before the first API call." },
          { t: "p", text: "**The first exception cancels every other task**, because `return_exceptions` defaults to False. Calls that had already succeeded are discarded along with the rest, so money was spent and nothing was saved." },
          { t: "callout", kind: "insight", title: "Little's Law gives you the concurrency number", body: [
            { t: "p", text: "Concurrency = throughput × latency. The token limit allows 181 requests per minute, or 3 per second; at 6 seconds per call that is 18 in flight. Choosing 15 leaves headroom for estimate error and anything else sharing the account." },
            { t: "p", text: "The point is that the number is derived from two measurements rather than guessed — and it changes when either the prompt length or the provider's limits change." }
          ]},
          { t: "p", text: "**The real finding is that 7.4 hours does not fit a nightly window.** Tuning the concurrency correctly makes the job stable and still too slow; the provider's batch API removes the rate-limit constraint entirely and halves the cost, which is the right answer for work with no latency requirement." },
          { t: "p", text: "**Saving per ticket rather than at the end is what makes the job retryable.** With a `WHERE summary IS NULL` predicate, a crash at 40% means the re-run does the remaining 60% — which is why the original had never completed even once." },
          { t: "p", text: "**Reconciling the token reservation is not a detail.** Over-estimating by 30% on every call means you throttle yourself at 70% of the limit you are paying for, and the effect compounds across a long batch." },
          { t: "p", text: "**The largest single cost change is the model.** Summarisation into a few hundred tokens does not need a frontier model, and the smaller one has a higher rate limit — so it improves the runtime and the bill at the same time." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team added an LLM enrichment step to their ingest pipeline with unbounded concurrency. It worked in testing against a few hundred records." },
      { t: "p", text: "**The first production run hit 40,000 records and rate-limited the entire organisation's API key.** Three other teams' production features started failing, and it took twenty minutes to identify which job was responsible because no call was labelled." },
      { t: "p", text: "**A shared account is a shared resource.** A semaphore and a token-labelled metric would have prevented both the outage and the twenty minutes of investigation." },
      { t: "p", text: "**Bound concurrency before you need to, and label every call with its feature.** Both cost a line, and their absence is discovered by taking down someone else's service." }
    ]}
  ],

  takeaways: [
    "**LLM workloads are dominated by waiting**, so concurrency is the entire performance story — the provider was never the constraint, your loop was.",
    "**`gather` on a large input materialises every coroutine at once**, so memory scales with input size rather than with concurrency.",
    "**One exception cancels every other task in a `gather`** unless you catch per-task or pass `return_exceptions=True`.",
    "**Bound concurrency with a semaphore**, and stream the input when it is large — create tasks as capacity frees, not all at once.",
    "**Derive the concurrency number: throughput × latency.** Both come from measurements you can take in a minute.",
    "**Providers limit requests *and* tokens.** The binding constraint changes with prompt length, which is not something you control.",
    "**Reconcile the token reservation with actual usage**, or a 30% over-estimate throttles you at 70% of the limit you pay for.",
    "**Client-side limiting reduces 429s; it never eliminates them.** Multiple processes share one account, and your estimate is not their count.",
    "**Back off multiplicatively, recover additively** — halve on a 429, creep back up on success.",
    "**Bound the queue and refuse work you cannot do.** An unbounded queue does not degrade, it collapses, and the collapse outlives the load.",
    "**Shed work older than its client's timeout.** Processing it costs money and helps nobody.",
    "**Prompt caching is the highest-value cache for most applications** — put the stable content first, the variable part last.",
    "**Semantic caching returns wrong answers for similar questions with different answers.** Use it only for high-volume, low-stakes queries.",
    "**For overnight work with no latency requirement, use the provider's batch API** — cheaper, and not subject to interactive rate limits."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`await asyncio.gather(*[classify(d) for d in documents])` on 80,000 documents. What happens first?",
        options: [
          "The tasks run a few at a time as the event loop schedules them",
          "All 80,000 coroutines are created immediately, each holding its document — so memory is exhausted before rate limiting even begins",
          "asyncio caps concurrency at the connection pool size",
          "The list comprehension is evaluated lazily"
        ],
        answer: 1,
        why: "Memory becomes a function of input size rather than of concurrency. A semaphore bounds how many run at once but not how many exist; for a large input, create tasks as capacity frees up so both are bounded."
      },
      {
        stem: "You are rate-limited despite staying well under the requests-per-minute limit. Why?",
        options: [
          "The limit is enforced per-second, not per-minute",
          "Providers meter tokens per minute as well, and longer prompts exhaust that budget while the request count stays low",
          "Retries count double against the limit",
          "The connection pool is too small"
        ],
        answer: 1,
        why: "The binding constraint shifts with input length, which you do not control. A limiter must reserve against both budgets before the call and reconcile against actual usage afterwards, or an over-estimate throttles you below the limit you are paying for."
      },
      {
        stem: "Requests arrive at 100/s against a capacity of 20/s, with an unbounded queue. What is the outcome?",
        options: [
          "Latency rises to a steady state and stabilises",
          "The queue grows without bound, clients time out and retry, and the system continues failing after the load stops",
          "The event loop applies backpressure automatically",
          "Throughput increases to match demand"
        ],
        answer: 1,
        why: "This is a collapse rather than a degradation, and it is self-sustaining because timed-out clients retry. A bounded queue returning 503 with `Retry-After`, plus shedding jobs older than the client timeout, is what allows the queue to drain."
      },
      {
        stem: "Where should the variable part of a prompt go when using provider prompt caching?",
        options: [
          "At the beginning, so it is processed first",
          "At the end — the cache matches a prefix, so anything variable near the top invalidates everything after it",
          "In a separate request",
          "Position does not matter"
        ],
        answer: 1,
        why: "A timestamp or a user id at the top of a system prompt breaks the cache on every call. Reading a cached prefix costs roughly a tenth of the normal input rate while writing it costs slightly more, so it pays off after about two uses and loses on a one-off."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "How would you process a hundred thousand documents through an LLM?",
        strong: "Streamed input, bounded concurrency derived from the rate limits, per-item saves so it is resumable, and per-item failure isolation. For overnight work with no latency requirement, the provider's batch API instead.",
        answer: [
          { t: "p", text: "Deriving concurrency from Little's Law rather than picking a number shows you have tuned one of these." },
          { t: "p", text: "Resumability is what interviewers listen for — a job that cannot record partial progress cannot be retried, and long jobs are always interrupted." },
          { t: "p", text: "Volunteering the batch API demonstrates you know when the concurrency problem should be avoided rather than solved." }
        ]
      },
      {
        level: "advanced",
        q: "How do you handle provider rate limits?",
        strong: "Limit client-side against both requests and tokens, reconcile the reservation with actual usage, and still handle the 429 — honouring `Retry-After` with jitter. Adaptive concurrency at scale: halve on a limit, creep up on success.",
        answer: [
          { t: "p", text: "The two-dimensional point is the substance, and the fact that the binding limit shifts with prompt length is the reason it matters." },
          { t: "p", text: "Saying client-side limiting reduces but never eliminates 429s shows you have run this across multiple processes." },
          { t: "p", text: "The AIMD shape is a good reference: recovering quickly after a 429 oscillates and spends most of its time limited." }
        ]
      },
      {
        level: "advanced",
        q: "What is backpressure and why does it matter here?",
        strong: "Refusing work you cannot do, rather than queueing it. With an unbounded queue and demand above capacity, latency grows without bound, clients time out and retry, and the system keeps failing after the load has gone.",
        answer: [
          { t: "p", text: "Describing it as a collapse rather than a degradation is what conveys the severity." },
          { t: "p", text: "Shedding work older than the client timeout is the specific that shows you have broken a death spiral." },
          { t: "p", text: "Returning 503 with a `Retry-After` header, rather than a bare error, is the detail that makes the client's behaviour correct too." }
        ]
      }
    ]
  }
});
