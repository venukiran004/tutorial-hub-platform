/* ============================================================================
   LESSON 15.8 — Python in GenAI Applications
   ========================================================================= */
EC.receiveLesson({
  id: "15.8",

  lede: "An LLM call is an HTTP request to a slow, non-deterministic, rate-limited service that charges by the token and occasionally returns something that does not parse. **Everything you already know about calling unreliable third parties applies** — timeouts, retries, idempotency, circuit breakers — plus three concerns that are specific: token budgets, structured output, and cost.",

  objectives: [
    "Stream responses so the user sees output immediately",
    "Get structured, validated data out of a model reliably",
    "Budget tokens, and know what happens when you exceed the window",
    "Retry a provider correctly, distinguishing what is retriable",
    "Control and attribute cost before the invoice arrives"
  ],

  prerequisites: ["12.7", "15.7"],

  blocks: [

    { t: "h2", n: "01", text: "What is different, and what is not", id: "different" },

    { t: "table",
      head: ["Property", "An ordinary API", "An LLM API"],
      rows: [
        ["Latency", "Tens of ms", "**Seconds to minutes**"],
        ["Determinism", "Same input, same output", "**Varies at temperature 0 too**"],
        ["Cost", "Per request", "**Per token, in and out**"],
        ["Failure", "A status code", "**A 200 containing something wrong**"],
        ["Rate limits", "Requests per second", "Requests **and tokens** per minute"],
        ["Output shape", "A schema you enforce", "**Text you hope parses**"]
      ],
      caption: "**The fourth row is the one that changes your design.** A 200 with malformed JSON, a refusal, or a plausible fabrication all look like success to every layer of your stack."
    },

    { t: "h2", n: "02", text: "Streaming", id: "streaming" },

    { t: "code", lang: "python", title: "server-sent events, end to end", code: `
@app.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    async def generate() -> AsyncIterator[str]:
        # Accumulate as we go: the client may disconnect, and we still
        # want the partial text for logging and cost accounting.
        chunks: list[str] = []
        try:
            async with client.messages.stream(
                model=MODEL,
                max_tokens=1024,
                messages=req.to_messages(),
            ) as stream:
                async for text in stream.text_stream:
                    chunks.append(text)
                    # SSE framing: "data: <json>\\n\\n". JSON-encode the
                    # payload -- raw text containing a newline would
                    # otherwise terminate the event early.
                    yield f"data: {json.dumps({'delta': text})}\\n\\n"

                final = await stream.get_final_message()
                yield f"data: {json.dumps({
                    'done': True,
                    'usage': final.usage.model_dump(),
                })}\\n\\n"

        except asyncio.CancelledError:
            # The client went away. Log what we have and re-raise --
            # swallowing this leaks the task.
            logger.info("stream_cancelled", extra={"chars": len("".join(chunks))})
            raise
        except Exception as exc:
            # An error mid-stream cannot become a 500: the response
            # already started with a 200. Send it as an event.
            logger.exception("stream_failed")
            yield f"data: {json.dumps({'error': str(exc)})}\\n\\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # nginx buffers by default,
        },                               # which defeats streaming
    )
`,
      hl: [18, 27, 32, 41],
      caption: "**`X-Accel-Buffering: no` is the header people spend an afternoon on.** nginx buffers proxied responses, so streaming works locally and arrives as one block in production."
    },

    { t: "callout", kind: "insight", title: "Streaming changes perceived latency, not real latency", body: [
      { t: "p", text: "A 12-second response feels unusable. The same response streaming its first token in 400ms feels responsive, and the total time is identical — **time to first token is the metric that matters to a user**, and it is the one to measure and alert on." },
      { t: "code", lang: "python", title: "what it costs you", numbered: false, code: `
# 1. THE STATUS CODE IS COMMITTED EARLY. Once bytes are sent you have
#    already returned 200, so an error must be an in-band event and
#    every client must handle it.
#
# 2. RESPONSE VALIDATION IS GONE. You cannot check the whole output
#    before sending it, so a moderation or schema check must run per
#    chunk or not at all.
#
# 3. RETRIES ARE HARDER. A failure at token 400 of 500 cannot be
#    retried transparently -- the client has already rendered 400.
#
# 4. TIMEOUTS NEED CARE. A stream that stalls mid-response holds a
#    connection indefinitely unless you enforce an inactivity
#    timeout, separate from the total-duration timeout.`},
      { t: "p", text: "**Do not stream a structured response.** If the caller needs valid JSON, they cannot use it until it is complete — streaming buys nothing and costs you the ability to validate before responding." }
    ]},

    { t: "h2", n: "03", text: "Structured output", id: "structured" },

    { t: "ladder",
      title: "Extracting fields from a document",
      rungs: [
        { level: "bad", label: "Ask for JSON and parse it",
          why: "The model returns prose around the JSON, a trailing comma, or markdown fences. It parses in testing and fails in production on the input that had an apostrophe in it, and the failure is a 500 with no useful message.",
          code: `response = await client.messages.create(
    messages=[{"role": "user",
               "content": f"Extract the invoice fields as JSON: {doc}"}],
)
data = json.loads(response.content[0].text)     # JSONDecodeError` },
        { level: "ok", label: "Strip fences and validate",
          why: "Handles the common formatting cases and gives a typed object. It still has no retry path — when validation fails you have a stack trace and no result, and the model is often one nudge away from correct.",
          code: `text = response.content[0].text
text = re.sub(r"^\\\\s*\`\`\`(?:json)?|\`\`\`\\\\s*$", "", text.strip())
invoice = Invoice.model_validate_json(text)     # ValidationError` },
        { level: "best", label: "Tool use, with a validating retry",
          why: "The schema is given to the model as a tool definition, so the provider constrains the output shape. Validation still runs — the shape is guaranteed, the semantics are not — and a failure is fed back as a correction rather than raised.",
          code: `class Invoice(BaseModel):
    invoice_number: str = Field(pattern=r"^INV-\\\\d{6}$")
    total: Decimal = Field(ge=0)
    currency: Literal["GBP", "EUR", "USD"]
    line_items: list[LineItem] = Field(min_length=1)

    @model_validator(mode="after")
    def total_matches_lines(self) -> "Invoice":
        # The model will happily return a total that does not match
        # its own line items. Check it.
        computed = sum(i.amount for i in self.line_items)
        if abs(self.total - computed) > Decimal("0.01"):
            raise ValueError(f"total {self.total} != lines {computed}")
        return self


async def extract(doc: str, attempts: int = 3) -> Invoice:
    messages = [{"role": "user", "content": PROMPT.format(doc=doc)}]

    for attempt in range(attempts):
        response = await client.messages.create(
            model=MODEL,
            tools=[{
                "name": "record_invoice",
                "input_schema": Invoice.model_json_schema(),
            }],
            tool_choice={"type": "tool", "name": "record_invoice"},
            messages=messages,
        )
        block = next(b for b in response.content if b.type == "tool_use")
        try:
            return Invoice.model_validate(block.input)
        except ValidationError as exc:
            # Feed the error back. The model usually corrects it, and
            # this is far more effective than a blind retry.
            messages += [
                {"role": "assistant", "content": response.content},
                {"role": "user", "content":
                 f"That failed validation: {exc}. Correct it."},
            ]
    raise ExtractionFailed(doc_id)`,
          note: "**A schema constrains the shape, never the truth.** The model can return a well-formed invoice whose total is invented — semantic validators are where you catch that." }
      ]
    },

    { t: "h2", n: "04", text: "Tokens and the context window", id: "tokens" },

    { t: "code", lang: "python", title: "budget before you send", code: `
# THE WINDOW IS SHARED: system prompt + history + documents + the
# space reserved for the answer. Exceeding it is an error, and
# approaching it degrades quality well before that.

MAX_CONTEXT = 200_000
RESERVED_FOR_OUTPUT = 4_000


def build_context(system: str, history: list[Message],
                  documents: list[str]) -> list[Message]:
    """Fit the request to the window deliberately, rather than
    discovering the limit as a 400 from the provider."""
    budget = MAX_CONTEXT - RESERVED_FOR_OUTPUT - count_tokens(system)

    # Documents first: they are usually the point of the request.
    included, used = [], 0
    for doc in documents:
        n = count_tokens(doc)
        if used + n > budget * 0.7:      # cap documents at 70%
            break
        included.append(doc)
        used += n

    # Then as much history as fits, MOST RECENT FIRST.
    kept: list[Message] = []
    for message in reversed(history):
        n = count_tokens(message.content)
        if used + n > budget:
            break
        kept.insert(0, message)
        used += n

    return [system_message(system), *kept, *doc_messages(included)]


# COUNTING: use the provider's tokeniser, not an estimate. The
# rule-of-thumb "4 characters per token" is roughly right for English
# prose and badly wrong for code, JSON, non-Latin scripts and numbers
# -- which is exactly what your documents contain.
n = client.messages.count_tokens(model=MODEL, messages=messages)

# TRUNCATION IS A PRODUCT DECISION, not a technical one:
#   - drop the oldest turns          (loses long-range context)
#   - summarise the dropped turns    (costs a call, keeps the gist)
#   - retrieve only relevant history (RAG, and more machinery)
# Whichever you choose, TELL THE USER something was dropped.
`,
      hl: [12, 26, 37],
      caption: "**Quality degrades before the limit does.** Models attend less reliably to the middle of a very long context, so filling the window is rarely the best use of it."
    },

    { t: "callout", kind: "trap", title: "Cost arrives as a surprise", body: [
      { t: "code", lang: "python", title: "four ways the bill grows", numbered: false, code: `
# 1. THE FULL HISTORY, RESENT EVERY TURN. Conversations are
#    stateless, so turn 20 pays for turns 1-19 again. Cost per turn
#    grows LINEARLY, and a long session costs quadratically in total.

# 2. A RETRY LOOP WITH NO CEILING. Three retries on a large context
#    is four times the cost of one call, and a bug that always fails
#    validation multiplies every request by the retry count.

# 3. NO max_tokens. The model fills whatever it is given; without a
#    limit, a verbose answer costs several times a concise one.

# 4. NO PER-USER LIMIT. One user pasting a book into a loop can spend
#    a month's budget in an afternoon.

# THE CONTROLS, in order of value:
#   - a hard max_tokens on every call
#   - a per-user daily token budget, enforced BEFORE the call
#   - prompt caching for a large stable system prompt (often ~90%
#     cheaper on the cached portion)
#   - a smaller model for classification and routing
#   - a spend alert at 50%, 80% and 100% of the monthly budget

async def check_budget(user_id: str, estimated: int) -> None:
    spent = await redis.get(f"tokens:{user_id}:{today()}") or 0
    if int(spent) + estimated > DAILY_TOKEN_LIMIT:
        raise HTTPException(429, "Daily token limit reached")`},
      { t: "p", text: "**Attribute every call to a user and a feature.** Without that label, a cost spike is a number on an invoice with no way to find its source — and the first question anyone asks is which feature caused it." }
    ]},

    { t: "h2", n: "05", text: "Retries and failure", id: "retries" },

    { t: "code", lang: "python", title: "what to retry, and what not to", code: `
RETRIABLE = (
    RateLimitError,        # 429 -- honour Retry-After if present
    APIConnectionError,    # network
    InternalServerError,   # 5xx
    APITimeoutError,
)

NOT_RETRIABLE = (
    AuthenticationError,   # a wrong key stays wrong
    BadRequestError,       # malformed request, or over the window
    PermissionDeniedError,
)


async def call_with_retry(**kwargs) -> Message:
    for attempt in range(MAX_ATTEMPTS):
        try:
            async with asyncio.timeout(60):
                return await client.messages.create(**kwargs)

        except RateLimitError as exc:
            # The provider tells you how long to wait. Use it.
            delay = float(exc.response.headers.get("retry-after", 2 ** attempt))
            await asyncio.sleep(delay + random.random())

        except RETRIABLE:
            if attempt == MAX_ATTEMPTS - 1:
                raise
            await asyncio.sleep((2 ** attempt) + random.random())

        except NOT_RETRIABLE:
            raise                    # retrying wastes time and money

    raise ProviderUnavailable()


# A CIRCUIT BREAKER, so a provider outage does not become yours.
# Without it, every request waits its full timeout before failing --
# and your workers fill with requests to a service that is down.
breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)

@breaker
async def generate(prompt: str) -> str: ...

# THE DEGRADED PATH matters as much as the retry. Decide in advance:
#   - fall back to a smaller or different-provider model
#   - serve a cached answer if one exists
#   - return a clear "unavailable" rather than a slow timeout
#   - queue it for later, if the work is not interactive
`,
      hl: [22, 27, 38],
      caption: "**Jitter is not optional on a rate limit.** Without it every rate-limited client retries at the same instant, and the second wave is larger than the first."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix an LLM feature",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This support-ticket classifier fails on about 3% of tickets, occasionally hangs for minutes, and last month cost £14,000 against a £2,000 budget." },
        { t: "code", lang: "python", numbered: false, title: "app/classify.py", code: `
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

PROMPT = """Classify this support ticket.
Return JSON with: category, priority, sentiment, summary.

Ticket: {ticket}
Full customer history: {history}
"""

@app.post("/classify")
async def classify(ticket_id: str):
    ticket = db.get_ticket(ticket_id)
    history = db.get_all_messages(ticket.customer_id)

    response = client.messages.create(
        model="claude-opus-4",
        max_tokens=4096,
        messages=[{"role": "user", "content": PROMPT.format(
            ticket=ticket.body, history=history)}],
    )

    result = json.loads(response.content[0].text)
    db.save_classification(ticket_id, result)
    return result`},
        { t: "p", text: "Find every problem and rewrite it. Explain the cost overrun with arithmetic." }
      ],
      requirements: [
        "List every problem, grouped by symptom.",
        "Explain the 3% failure rate precisely.",
        "Explain the hangs.",
        "Give the cost arithmetic and the fixes, in order of saving.",
        "Rewrite it.",
        "Give the monitoring that would have caught the overspend in week one."
      ],
      hint: "Look at what `get_all_messages` returns for a long-standing customer, and at how the JSON is parsed.",
      solution: {
        lang: "python",
        title: "app/classify.py",
        code: `# =========================================================================
# THE PROBLEMS
# =========================================================================
#
# ---- THE 3% FAILURE RATE ------------------------------------------
#
# 1. json.loads ON RAW MODEL OUTPUT.
#      json.loads(response.content[0].text)
#    The model returns markdown fences, a preamble ("Here is the
#    classification:"), or a trailing comma. Any of these is a
#    JSONDecodeError -> unhandled -> 500.
#
# 2. NO SCHEMA VALIDATION. When it DOES parse, nothing checks it.
#    A missing "priority" key, a category outside the allowed set, or
#    a sentiment of "kind of annoyed" all get written to the database
#    and break the downstream routing that consumes them.
#
# 3. NO RETRY. A transient 429 or 529 is a 500 to the caller. Given
#    the rate limits this service must be hitting (see cost), this is
#    probably most of the 3%.
#
# 4. CONTEXT OVERFLOW. For a customer with years of history, the
#    prompt exceeds the window and the provider returns a
#    BadRequestError. The failure correlates with the customers who
#    matter most -- long-standing ones.
#
# ---- THE HANGS ----------------------------------------------------
#
# 5. A SYNCHRONOUS CALL IN AN async def HANDLER.
#      client.messages.create(...)     # the sync client
#    Declared async, so FastAPI runs it ON THE EVENT LOOP. A 30-second
#    generation blocks EVERY other request on that worker, including
#    the health probe (Lesson 12.7). That is the "hangs for minutes"
#    -- not one slow request, but every request queued behind it.
#
# 6. NO TIMEOUT. Neither on the HTTP call nor on the operation. A
#    slow or stalled response holds a worker indefinitely.
#
# 7. TWO UNBOUNDED DATABASE QUERIES per request, one of which
#    (get_all_messages) can return tens of thousands of rows.
#
# ---- THE COST -----------------------------------------------------
#
# 8. THE ENTIRE CUSTOMER HISTORY IN EVERY PROMPT.
# 9. THE LARGEST MODEL FOR A CLASSIFICATION TASK.
# 10. max_tokens=4096 FOR A FOUR-FIELD JSON OBJECT.
# 11. NO CACHING -- reclassifying an unchanged ticket costs full price.
# 12. NO PER-USER OR GLOBAL BUDGET, and no cost attribution at all.
#
#
# =========================================================================
# THE COST ARITHMETIC
# =========================================================================
#
# ASSUME: 40,000 tickets/month, average history 60,000 tokens,
# ticket body ~500 tokens, output ~200 tokens actually used.
#
# CURRENT, per call:
#   input   60,500 tokens
#   output     200 tokens (of 4,096 reserved)
#
#   At roughly $15/M input and $75/M output for a frontier model:
#     input   60,500 x 15 / 1e6  = $0.9075
#     output     200 x 75 / 1e6  = $0.0150
#     ------------------------------------
#     per call                     $0.92
#     x 40,000                   = $36,800/month
#
# The reported £14,000 suggests fewer tickets or shorter histories
# than this estimate, but the SHAPE is the point: 99.2% of the input
# cost is the history, and it is not needed to classify a ticket.
#
# THE FIXES, IN ORDER OF SAVING:
#
#   A. DROP THE FULL HISTORY. Send the last 3 messages (~1,500
#      tokens) instead of 60,000.
#        input 2,000 tokens -> $0.030/call        -97% of input cost
#
#   B. USE A SMALLER MODEL. Classification into a fixed taxonomy does
#      not need a frontier model. At roughly $1/M in, $5/M out:
#        $0.0020 + $0.0010 = $0.003/call          another -90%
#
#   C. max_tokens=300. A four-field JSON object needs no more, and it
#      caps the worst case rather than the average.
#
#   D. PROMPT CACHING on the stable system prompt and taxonomy
#      (~2,000 tokens). Cached input reads at roughly 10% of the
#      normal rate.
#
#   E. CACHE BY TICKET CONTENT HASH. Reclassification of an unchanged
#      ticket costs nothing.
#
#   COMBINED: ~$0.92 -> ~$0.003 per call
#             $36,800 -> ~$120/month
#
# And A is the one that matters: the history was never needed. Most
# LLM cost problems are a prompt containing something nobody asked
# for.
#
#
# =========================================================================
# THE REWRITE
# =========================================================================

class Classification(BaseModel):
    """The schema is the contract, and it is enforced -- problem 2."""
    model_config = ConfigDict(extra="forbid")

    category: Literal["billing", "technical", "account",
                      "feature_request", "other"]
    priority: Literal["low", "medium", "high", "urgent"]
    sentiment: Literal["positive", "neutral", "negative"]
    summary: str = Field(min_length=10, max_length=200)
    confidence: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def urgent_requires_confidence(self) -> "Classification":
        # A low-confidence "urgent" pages someone at 3am. Require the
        # model to be sure before it can escalate.
        if self.priority == "urgent" and self.confidence < 0.7:
            raise ValueError("urgent priority requires confidence >= 0.7")
        return self


# The async client -- problem 5.
client = anthropic.AsyncAnthropic(
    api_key=settings.anthropic_key.get_secret_value(),
    timeout=httpx.Timeout(connect=5.0, read=30.0),   # problem 6
    max_retries=0,          # we handle retries ourselves, below
)

# A small model. Classification into a fixed taxonomy does not need a
# frontier model -- fix B.
MODEL = "claude-haiku-4-5-20251001"
MAX_HISTORY_MESSAGES = 3


@app.post("/classify", response_model=Classification)
async def classify(ticket_id: UUID, db: DB) -> Classification:
    ticket = await db.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(404)

    # Problem 7 / fix A: bounded, not "all messages ever".
    history = await db.get_recent_messages(
        ticket.customer_id, limit=MAX_HISTORY_MESSAGES
    )

    # Fix E: an unchanged ticket costs nothing to reclassify.
    cache_key = f"classify:{sha256(ticket.body, history)}"
    if cached := await redis.get(cache_key):
        classification_cache_hits.inc()
        return Classification.model_validate_json(cached)

    # Fix: a budget check BEFORE the call, not an invoice afterwards.
    await check_budget(ticket.customer_id, estimated_tokens=2_500)

    result, usage = await _classify_with_retry(ticket, history)

    await redis.setex(cache_key, 86_400, result.model_dump_json())
    await db.save_classification(ticket_id, result)

    # Attribution: every token, labelled. Without this a cost spike
    # is a number on an invoice with no source.
    llm_tokens.labels(model=MODEL, feature="classify",
                      kind="input").inc(usage.input_tokens)
    llm_tokens.labels(model=MODEL, feature="classify",
                      kind="output").inc(usage.output_tokens)

    return result


async def _classify_with_retry(ticket, history, attempts: int = 3):
    """Tool use for the shape, validation for the semantics, and the
    validation error fed back as a correction -- problems 1 and 2."""
    messages = [{"role": "user", "content": build_prompt(ticket, history)}]

    for attempt in range(attempts):
        try:
            async with asyncio.timeout(45):
                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=300,              # fix C
                    system=[{
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        # Fix D: the stable prefix is cached, at
                        # roughly a tenth of the input rate.
                        "cache_control": {"type": "ephemeral"},
                    }],
                    # The schema goes to the provider, so the SHAPE is
                    # constrained rather than hoped for -- problem 1.
                    tools=[{
                        "name": "record_classification",
                        "input_schema": Classification.model_json_schema(),
                    }],
                    tool_choice={"type": "tool",
                                 "name": "record_classification"},
                    messages=messages,
                )

        except RateLimitError as exc:
            # Honour the provider's own guidance, with jitter.
            delay = float(exc.response.headers.get("retry-after",
                                                   2 ** attempt))
            await asyncio.sleep(delay + random.random())
            continue
        except (APIConnectionError, InternalServerError, APITimeoutError):
            if attempt == attempts - 1:
                raise
            await asyncio.sleep((2 ** attempt) + random.random())
            continue
        except (AuthenticationError, BadRequestError):
            raise                     # retrying wastes time and money

        block = next(b for b in response.content if b.type == "tool_use")
        try:
            return Classification.model_validate(block.input), response.usage
        except ValidationError as exc:
            # Feed the error back rather than retrying blindly. The
            # model usually corrects on the next attempt.
            llm_validation_failures.labels(feature="classify").inc()
            messages += [
                {"role": "assistant", "content": response.content},
                {"role": "user",
                 "content": f"That failed validation: {exc}. Correct it."},
            ]

    # A deterministic fallback beats a 500 for a classification task.
    logger.error("classification_failed", extra={"ticket_id": ticket.id})
    return Classification(
        category="other", priority="medium", sentiment="neutral",
        summary=ticket.body[:200], confidence=0.0,
    ), None


async def check_budget(customer_id: UUID, estimated_tokens: int) -> None:
    """Enforced before the call. A budget checked after the fact is a
    report, not a control."""
    key = f"tokens:{customer_id}:{date.today()}"
    spent = int(await redis.get(key) or 0)
    if spent + estimated_tokens > DAILY_TOKEN_LIMIT:
        raise HTTPException(429, "Daily AI usage limit reached")
    await redis.incrby(key, estimated_tokens)
    await redis.expire(key, 172_800)


# =========================================================================
# THE MONITORING THAT WOULD HAVE CAUGHT £14,000 IN WEEK ONE
# =========================================================================
#
# The overspend was invisible because NOTHING measured tokens. Four
# signals, none expensive:
#
# 1. TOKENS PER CALL, as a histogram.
#      llm_input_tokens{feature="classify"}
#    A p50 of 60,000 input tokens for a classification task is
#    obviously wrong to anyone who looks at the chart once.
#
# 2. RUNNING SPEND, as a gauge with a budget alert.
#      alert: LLMSpendPacing
#        expr: llm_spend_month_to_date > monthly_budget * (day_of_month/30)
#        for: 1h
#    This fires on DAY TWO at the observed burn rate, not at month
#    end when the invoice arrives.
#
# 3. SPEND BY FEATURE AND BY CUSTOMER. When the alert fires, the
#    first question is which feature -- and without the label there
#    is no answer.
#
# 4. VALIDATION FAILURE RATE.
#      llm_validation_failures / llm_calls
#    The 3% was visible in the 500 rate but not attributed. This
#    names it, and it distinguishes a parse failure from a provider
#    error.
#
# THE GENERAL RULE: an LLM feature without a token metric is a
# feature with an unbounded, unattributable cost.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_malformed_json_does_not_500(mock_llm):
    """Problem 1. The three shapes seen in production."""
    for bad in ["\`\`\`json\\n{...}\\n\`\`\`",
                "Here is the classification: {...}",
                '{"category": "billing",}']:
        mock_llm.returns_text(bad)
        assert client.post(f"/classify/{TICKET}").status_code == 200


def test_an_invalid_category_is_rejected_and_retried(mock_llm):
    """Problem 2. It must not reach the database."""
    mock_llm.returns_tool_input({"category": "made_up_category", ...})
    mock_llm.then_returns_tool_input(valid_classification())

    result = client.post(f"/classify/{TICKET}").json()

    assert result["category"] == "billing"
    assert mock_llm.call_count == 2


def test_urgent_requires_confidence(mock_llm):
    """A low-confidence urgent pages someone at 3am."""
    mock_llm.returns_tool_input({**valid(), "priority": "urgent",
                                 "confidence": 0.3})

    with pytest.raises(ValidationError, match="confidence"):
        Classification.model_validate(mock_llm.last_input)


def test_history_is_bounded(db):
    """Fix A -- the whole cost problem, as an assertion."""
    seed_messages(customer_id=CUSTOMER, count=5000)

    prompt = build_prompt(ticket(), await get_recent_messages(CUSTOMER, 3))

    assert count_tokens(prompt) < 3_000


def test_a_rate_limit_is_retried_with_the_provider_delay(mock_llm):
    mock_llm.raises(RateLimitError(headers={"retry-after": "1"}))
    mock_llm.then_returns_tool_input(valid_classification())

    with timed() as t:
        client.post(f"/classify/{TICKET}")

    assert 1.0 <= t.elapsed < 2.5


def test_an_auth_error_is_not_retried(mock_llm):
    """Retrying a wrong key wastes time and money."""
    mock_llm.raises(AuthenticationError)

    client.post(f"/classify/{TICKET}")

    assert mock_llm.call_count == 1


def test_the_event_loop_is_not_blocked():
    """Problem 5 -- the hangs. A slow generation must not stall
    other requests on the worker."""
    with mock_llm.slow(seconds=5):
        slow = asyncio.create_task(post_classify())
        await asyncio.sleep(0.1)

        with timed() as t:
            await client.get("/health/live")

        assert t.elapsed < 0.5, "the event loop was blocked"
        await slow


def test_repeated_classification_is_cached(mock_llm):
    client.post(f"/classify/{TICKET}")
    client.post(f"/classify/{TICKET}")

    assert mock_llm.call_count == 1`,
        notes: [
          { t: "p", text: "**The entire customer history is 99% of the input cost and was never needed.** Classifying a ticket requires the ticket, not every message that customer has ever sent — and dropping it takes the per-call cost from about $0.92 to $0.03 before any other change." },
          { t: "p", text: "**A synchronous client in an `async def` handler is the hang.** FastAPI trusts the declaration and runs it on the event loop, so a 30-second generation stalls every other request on that worker, including the health probe — it is not one slow request but everything queued behind it." },
          { t: "callout", kind: "insight", title: "Feed the validation error back instead of retrying blindly", body: [
            { t: "p", text: "A blind retry sends the identical prompt and usually produces the identical failure. Appending the model's own output and the specific validation error gives it what it needs to correct, and it succeeds on the second attempt far more often." },
            { t: "p", text: "Tool use constrains the shape at the provider, so the remaining failures are semantic — a category outside the taxonomy, a total that does not match its line items — which is exactly what the validators are for." }
          ]},
          { t: "p", text: "**The context overflow correlates with your most valuable customers.** A long-standing account has the most history, so the failure lands on exactly the tickets you least want to drop — which is why bounding it is a correctness fix as well as a cost one." },
          { t: "p", text: "**A budget checked after the call is a report, not a control.** Enforcing it before the request, per customer per day, is what turns a £14,000 month into a 429 for one heavy user." },
          { t: "p", text: "**A token metric labelled by feature would have shown this on day two.** A p50 of 60,000 input tokens for a classification task is obviously wrong to anyone who looks at the chart once, and without the label a cost spike has no attributable source." },
          { t: "p", text: "**The deterministic fallback beats a 500.** For a classification, returning `other`/`medium` with confidence 0 keeps the ticket flowing and records that the model could not decide — which is more useful than an exception." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team shipped a document-summarisation feature with no `max_tokens` limit and no per-user cap. It worked well in testing." },
      { t: "p", text: "**One customer scripted it against their entire document archive.** Forty thousand calls over a weekend, each with a large document, and the bill arrived at eleven times the monthly budget on a Monday morning." },
      { t: "p", text: "**The controls that would have prevented it took an afternoon**: a hard `max_tokens`, a per-user daily token budget checked before each call, and a spend alert at 50% of budget." },
      { t: "p", text: "**Treat an LLM API like any metered external service.** Nobody would ship an unbounded loop against a paid API and hope; the same instinct should apply here, and usually does not because the cost is invisible until the invoice." }
    ]}
  ],

  takeaways: [
    "**An LLM call is a slow, non-deterministic, metered third-party request.** Everything you know about unreliable dependencies applies first.",
    "**The distinctive failure is a 200 containing something wrong** — malformed JSON, a refusal, or a confident fabrication all look like success.",
    "**Stream for perceived latency.** Time to first token is what a user experiences, and it is the metric to alert on.",
    "**Set `X-Accel-Buffering: no`**, or nginx buffers your stream and it arrives as one block in production.",
    "**Once streaming starts you have committed to a 200** — errors must be in-band events, and every client must handle them.",
    "**Do not stream structured output.** The caller cannot use partial JSON, and you lose the chance to validate before responding.",
    "**Use tool use with a JSON schema for structured data**, then validate anyway — the schema constrains the shape, never the truth.",
    "**Feed a validation error back as a correction** rather than retrying blindly; the model usually fixes it on the next attempt.",
    "**Budget the context window explicitly**, reserving space for the output, and count with the provider's tokeniser rather than a rule of thumb.",
    "**Quality degrades before the window does.** Filling the context is rarely the best use of it.",
    "**Retry 429s and 5xx with jitter, honouring `Retry-After`; never retry auth or bad-request errors.**",
    "**Add a circuit breaker and decide the degraded path in advance** — a smaller model, a cached answer, or a clear failure beats a slow timeout.",
    "**Cap `max_tokens`, cache by content, and enforce a per-user budget before the call.** A budget checked afterwards is a report.",
    "**Label every token by feature and user.** Without attribution, a cost spike is a number on an invoice with no source."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `json.loads(response.content[0].text)` unreliable for structured output?",
        options: [
          "The response is always base64-encoded",
          "The model may wrap the JSON in markdown fences or prose, so it parses in testing and fails on some production inputs",
          "`json.loads` cannot handle Unicode from LLMs",
          "The content list is always empty"
        ],
        answer: 1,
        why: "Tool use with a JSON schema constrains the shape at the provider, which removes the parsing class of failure. Validation still matters for semantics — a well-formed invoice whose total does not match its own line items passes any schema check."
      },
      {
        stem: "A synchronous LLM client is called inside an `async def` FastAPI handler. What is the symptom?",
        options: [
          "The request fails with a RuntimeError",
          "The call blocks the event loop, so every other request on that worker stalls for its full duration — including health probes",
          "Only that request is slow",
          "The response is truncated"
        ],
        answer: 1,
        why: "FastAPI trusts the declaration and runs `async def` handlers on the loop. With generations taking tens of seconds this presents as the whole service hanging rather than one slow endpoint. Use the async client, or declare the handler `def` so it runs in a threadpool."
      },
      {
        stem: "A classification feature costs £14,000 a month against a £2,000 budget. Which change saves the most?",
        options: [
          "Reducing `max_tokens` on the output",
          "Removing the full customer history from the prompt — it can be 99% of the input tokens and is not needed to classify a ticket",
          "Switching to a streaming response",
          "Adding a retry limit"
        ],
        answer: 1,
        why: "Most LLM cost problems are a prompt containing something nobody asked for. A smaller model, a `max_tokens` cap and prompt caching all help afterwards, but they act on a base that the history change reduces by roughly two orders of magnitude first."
      },
      {
        stem: "Structured extraction fails validation. What is more effective than retrying the same prompt?",
        options: [
          "Increasing the temperature",
          "Appending the model's output and the specific validation error, asking it to correct — it usually succeeds on the next attempt",
          "Switching to a larger model each retry",
          "Parsing the output with a regex instead"
        ],
        answer: 1,
        why: "A blind retry sends an identical prompt and often produces an identical failure. Giving the model its own output plus the precise reason it was rejected is a correction rather than a repetition, and it costs one extra turn instead of a full re-run."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you get reliable structured output from an LLM?",
        strong: "Tool use with a JSON schema so the provider constrains the shape, Pydantic validation for the semantics, and a retry that feeds the validation error back as a correction rather than repeating the prompt.",
        answer: [
          { t: "p", text: "The shape-versus-truth distinction is the substance: a schema cannot stop a well-formed fabrication." },
          { t: "p", text: "Semantic validators — a total matching its line items, an urgent priority requiring confidence — show you have thought about what the model gets wrong." },
          { t: "p", text: "Feeding the error back rather than retrying blindly is the technique that most distinguishes someone who has shipped one of these." }
        ]
      },
      {
        level: "advanced",
        q: "How would you control cost in an LLM feature?",
        strong: "Look at the prompt first — most overspend is a prompt containing something nobody needs. Then a smaller model where the task allows, a hard `max_tokens`, prompt caching, content-hash caching, and a per-user budget enforced before the call.",
        answer: [
          { t: "p", text: "Starting with the prompt rather than the model choice shows you have actually reduced a bill; the input side usually dominates." },
          { t: "p", text: "\"Enforced before the call\" is the operative phrase — a budget checked afterwards is a report." },
          { t: "p", text: "Token metrics labelled by feature and user is the monitoring answer, and without it a cost spike has no attributable source." }
        ]
      },
      {
        level: "core",
        q: "What should you retry when calling an LLM provider?",
        strong: "429s honouring `Retry-After`, connection errors and 5xx, all with jitter. Never authentication or bad-request errors — a wrong key stays wrong, and an over-length context stays over-length.",
        answer: [
          { t: "p", text: "Jitter matters more here than usual: rate-limited clients retrying in lockstep produce a second wave larger than the first." },
          { t: "p", text: "A circuit breaker is worth volunteering — without one, a provider outage fills your workers with requests waiting on their full timeout." },
          { t: "p", text: "Naming the degraded path in advance — smaller model, cached answer, clear failure — shows you plan for the outage rather than reacting to it." }
        ]
      }
    ]
  }
});
