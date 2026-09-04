/* ============================================================================
   LESSON 14.3 — Observability: Logs, Metrics, Traces
   ========================================================================= */
EC.receiveLesson({
  id: "14.3",

  lede: "Monitoring tells you the system is broken. **Observability tells you why, for a failure you did not anticipate.** The difference matters at 3am: a dashboard of pre-built charts answers the questions someone thought to ask last quarter, and the outage you are in is never one of them.",

  objectives: [
    "Choose the right signal for a question — log, metric, or trace",
    "Emit structured logs that can be queried rather than read",
    "Propagate a correlation ID across services and background work",
    "Instrument with OpenTelemetry without hand-writing every span",
    "Write health checks and alerts that mean something"
  ],

  prerequisites: ["6.4", "14.1"],

  blocks: [

    { t: "h2", n: "01", text: "Three signals, three questions", id: "signals" },

    { t: "table",
      head: ["Signal", "Answers", "Cost", "Cardinality"],
      rows: [
        ["**Logs**", "What happened in this one request?", "High per event", "**Unlimited** — any field"],
        ["**Metrics**", "How often, how slow, how many, over time?", "Very low", "**Strictly limited**"],
        ["**Traces**", "Where did the time go, across services?", "Medium, sampled", "High"],
        ["Profiles", "Which function is burning the CPU?", "High", "n/a"]
      ],
      caption: "**Cardinality is the constraint that decides everything.** A metric labelled with a user ID creates one time series per user — a million users is a million series, and it will take down your metrics backend before it helps you."
    },

    { t: "code", lang: "python", title: "the same event, three ways", code: `
# METRIC -- aggregate, cheap, alertable. Labels must be BOUNDED.
http_requests.labels(
    method="POST",
    route="/orders/{id}",     # the TEMPLATE, never the resolved path
    status="500",
).inc()
# 4 methods x 30 routes x 6 statuses = 720 series. Fine.
# Using the resolved path instead: one series per order id. Fatal.

# LOG -- one event, rich, queryable, unbounded fields.
logger.error("order_failed", extra={
    "order_id": order.id,          # high cardinality: fine here
    "account_id": account.id,
    "amount": str(order.total),
    "error_code": "payment_declined",
    "trace_id": get_current_trace_id(),   # the link to the trace
})

# TRACE -- the causal chain, with timings.
with tracer.start_as_current_span("place_order") as span:
    span.set_attribute("order.id", str(order.id))
    span.set_attribute("order.total", float(order.total))
    ...
`,
      hl: [4, 12, 16],
      caption: "**The `trace_id` in the log is what makes the three usable together.** Alert on the metric, find the trace, read the logs for that trace — that is the workflow, and it only exists if the id is present in all three."
    },

    { t: "h2", n: "02", text: "Logs you can query", id: "logs" },

    { t: "ladder",
      title: "Recording a failed payment",
      rungs: [
        { level: "bad", label: "An f-string",
          why: "Unparseable. Answering \"how many payments failed for account X last week\" means a regex over gigabytes of text, and the regex breaks the day someone adds a field. The message is also a unique string per event, so it cannot be grouped.",
          code: `logger.error(f"Payment failed for order {order.id}: {exc}")

# 2026-09-05 14:22:01 ERROR Payment failed for order
#   9f2a-...: Card declined (insufficient funds)` },
        { level: "ok", label: "Structured, with fields",
          why: "Now queryable: `error_code:payment_declined AND account_id:acc_123`. The remaining gap is context — every log line in the request needs the same identifiers, and adding them by hand to each call is how they get missed.",
          code: `logger.error("payment_failed", extra={
    "order_id": str(order.id),
    "error_code": exc.code,
    "amount": str(order.total),
})` },
        { level: "best", label: "Structured, with bound context",
          why: "Context is bound once per request and attached to every log line emitted downstream — including from libraries and from code that knows nothing about requests. Nothing is forgotten because nothing is repeated.",
          code: `import structlog

# In middleware, once per request:
structlog.contextvars.bind_contextvars(
    request_id=request_id,
    trace_id=trace_id,
    account_id=user.account_id,
    route=request.scope["route"].path,
)

# Anywhere, at any depth:
logger.error("payment_failed", error_code=exc.code,
             order_id=str(order.id))

# {"event": "payment_failed", "error_code": "declined",
#  "order_id": "9f2a...", "request_id": "req_8c1f",
#  "trace_id": "4bf92f...", "account_id": "acc_123",
#  "route": "/orders", "level": "error",
#  "timestamp": "2026-09-05T14:22:01.482Z"}`,
          note: "**`contextvars` is what makes this work under async.** A thread-local would leak context between concurrent requests sharing an event loop; a context variable follows the task." }
      ]
    },

    { t: "code", lang: "python", title: "the logging setup, once", code: `
import structlog, logging

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,   # the bound context
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        # Redact before rendering, not after. A processor cannot be
        # forgotten the way a call site can.
        redact_sensitive_fields,
        (structlog.processors.JSONRenderer() if settings.is_production
         else structlog.dev.ConsoleRenderer()),   # human-readable local
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        logging.getLevelName(settings.log_level)
    ),
    cache_logger_on_first_use=True,
)

SENSITIVE = {"password", "token", "secret", "authorization",
             "api_key", "card_number", "cvv"}

def redact_sensitive_fields(logger, method, event_dict):
    for key in list(event_dict):
        if any(s in key.lower() for s in SENSITIVE):
            event_dict[key] = "[REDACTED]"
    return event_dict
`,
      hl: [5, 12, 25],
      caption: "**JSON in production, coloured text locally.** The same code produces both, so nobody is tempted to add `print()` calls because the logs are unreadable on their machine."
    },

    { t: "callout", kind: "trap", title: "Four logging mistakes with real cost", body: [
      { t: "code", lang: "python", title: "each has caused an incident", numbered: false, code: `
# 1. LOGGING THE REQUEST BODY ON AN AUTH ROUTE.
logger.info("request", body=await request.json())
# Every password, in the aggregator, for the retention period.
# Use an allowlist of loggable fields, never a dump.

# 2. LOGGING INSIDE A LOOP.
for item in order.items:          # 50 items
    logger.info("processing_item", item_id=item.id)
# 50 lines per order becomes millions per day. Log the SUMMARY:
logger.info("processed_items", count=len(order.items),
            failed=len(failures))

# 3. logger.error FOR AN EXPECTED CONDITION.
except UserNotFound:
    logger.error("user not found")        # not an error: a 404
# Error rate is now dominated by normal behaviour, so the alert on it
# is either meaningless or muted -- and either way it never fires for
# the real thing.

# 4. exc_info NOT SET, SO NO STACK TRACE.
except Exception as exc:
    logger.error(f"failed: {exc}")        # message only
logger.exception("failed")                # message AND traceback`},
      { t: "p", text: "**Number three is the most corrosive.** An error log should mean \"a human may need to look at this\". Once expected conditions are logged as errors, the signal is gone and nobody notices the day it matters." }
    ]},

    { t: "h2", n: "03", text: "Metrics", id: "metrics" },

    { t: "code", lang: "python", title: "the four instrument types", code: `
from prometheus_client import Counter, Gauge, Histogram

# COUNTER -- only goes up. Rate is what you query.
orders_total = Counter(
    "orders_total", "Orders created",
    ["status", "channel"],           # bounded label sets only
)
orders_total.labels(status="paid", channel="web").inc()

# GAUGE -- goes up and down. A current value.
queue_depth = Gauge("job_queue_depth", "Jobs waiting", ["queue"])
queue_depth.labels(queue="exports").set(pending_count)

# HISTOGRAM -- a distribution, so you can query percentiles. Choose
# buckets around your SLO, not the defaults.
request_duration = Histogram(
    "http_request_duration_seconds", "Request duration",
    ["method", "route", "status"],
    buckets=(.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10),
)

# The percentile is what matters. An AVERAGE hides everything:
# 99 requests at 10ms and one at 10s averages 110ms, which looks fine
# and describes nobody's experience.
`,
      hl: [6, 18, 22],
      caption: "**Alert on percentiles, never averages.** p99 latency is the experience of your least fortunate one percent of requests, and that one percent is disproportionately your largest customers — they make the most requests."
    },

    { t: "callout", kind: "insight", title: "The four golden signals", body: [
      { t: "table",
        head: ["Signal", "Query", "Alert when"],
        rows: [
          ["**Latency**", "p99 of request duration", "It exceeds the SLO for 5 minutes"],
          ["**Traffic**", "Requests per second", "It drops sharply — an outage upstream"],
          ["**Errors**", "5xx rate as a fraction of total", "Above the error budget burn rate"],
          ["**Saturation**", "Pool usage, queue depth, memory", "**Above 80% — before it fails**"]
        ]
      },
      { t: "p", text: "**Saturation is the leading indicator and the one teams instrument last.** Connection pool at 95% is a warning; connection pool at 100% is an outage, and the gap between them is your entire chance to act." },
      { t: "p", text: "**Separate error latency from success latency.** A fast failure looks like a fast request, so a service failing quickly can show excellent p99 while serving nothing but 500s." }
    ]},

    { t: "h2", n: "04", text: "Tracing", id: "tracing" },

    { t: "viz",
      title: "Where the eight seconds went",
      caption: "A trace shows the causal structure and the time in each part. The N+1 below is visible instantly and invisible in every log and metric — the individual queries are fast, and there are simply four hundred of them.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="A waterfall trace showing nested spans and a repeated database query">
  <text x="20" y="26" class="s-label">POST /orders  ·  8.2s</text>

  <rect x="20" y="40" width="856" height="22" rx="4" style="fill:var(--t-blue);opacity:.28"/>
  <text x="30" y="56" class="s-sub">http.server  8.20s</text>

  <rect x="44" y="70" width="90" height="20" rx="4" style="fill:var(--t-green);opacity:.4"/>
  <text x="54" y="85" class="s-sub">auth 60ms</text>

  <rect x="140" y="70" width="120" height="20" rx="4" style="fill:var(--t-green);opacity:.4"/>
  <text x="150" y="85" class="s-sub">validate 90ms</text>

  <rect x="266" y="70" width="420" height="20" rx="4" style="fill:var(--crit);opacity:.34"/>
  <text x="276" y="85" class="s-sub" style="fill:var(--crit)">load_customer_orders  4.1s  ← 400 spans</text>

  <g style="opacity:.55">
    <rect x="272" y="96" width="9" height="14" rx="2" style="fill:var(--crit)"/>
    <rect x="285" y="96" width="9" height="14" rx="2" style="fill:var(--crit)"/>
    <rect x="298" y="96" width="9" height="14" rx="2" style="fill:var(--crit)"/>
    <rect x="311" y="96" width="9" height="14" rx="2" style="fill:var(--crit)"/>
    <rect x="324" y="96" width="9" height="14" rx="2" style="fill:var(--crit)"/>
    <rect x="337" y="96" width="9" height="14" rx="2" style="fill:var(--crit)"/>
    <rect x="350" y="96" width="9" height="14" rx="2" style="fill:var(--crit)"/>
  </g>
  <text x="366" y="108" class="s-sub" style="fill:var(--ink-3)">SELECT … WHERE id = ?  ·  10ms each  ·  ×400</text>

  <rect x="692" y="70" width="150" height="20" rx="4" style="fill:var(--t-amber);opacity:.45"/>
  <text x="702" y="85" class="s-sub">stripe.charge 1.4s</text>

  <rect x="848" y="70" width="26" height="20" rx="4" style="fill:var(--t-violet);opacity:.45"/>

  <text x="20" y="160" class="s-sub" style="fill:var(--ink-3)">Each query is fast. There are four hundred of them.</text>
  <text x="20" y="184" class="s-sub" style="fill:var(--ink-3)">No log line and no metric shows this — only the shape does.</text>
  <text x="20" y="208" class="s-sub" style="fill:var(--ink-3)">The Stripe call is also inside the request: 1.4s of the 8.2s is waiting on a third party.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "instrumenting, mostly automatically", code: `
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# Auto-instrumentation covers the boundaries: every HTTP request,
# every query, every outbound call. That is 90% of the value for
# three lines, and it includes libraries you did not write.
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument(engine=engine)
HTTPXClientInstrumentor().instrument()


# Add manual spans only for BUSINESS operations worth naming.
tracer = trace.get_tracer(__name__)

def place_order(cmd: PlaceOrder) -> Order:
    with tracer.start_as_current_span("place_order") as span:
        span.set_attribute("order.item_count", len(cmd.lines))
        span.set_attribute("customer.tier", cmd.customer.tier.value)
        try:
            order = _do_place(cmd)
        except PaymentDeclined as exc:
            # Record the exception AND mark the span failed -- an
            # unmarked span is invisible when filtering for errors.
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise
        span.set_attribute("order.id", str(order.id))
        return order
`,
      hl: [8, 19, 26],
      caption: "**Do not hand-write a span per function.** Auto-instrumentation gives you the boundaries where time is actually spent; manual spans are for the handful of operations you would name in a conversation."
    },

    { t: "callout", kind: "tradeoff", title: "Sampling", body: [
      { t: "table",
        head: ["Strategy", "Keeps", "Trade-off"],
        rows: [
          ["Always on", "Everything", "Cost, at scale"],
          ["Head sampling (1%)", "A random 1%, decided at the start", "**Misses most errors** — they are rare"],
          ["**Tail sampling**", "All errors, all slow, 1% of the rest", "Needs a collector buffering whole traces"],
          ["Per-route", "100% of checkout, 1% of health checks", "Manual, and it drifts"]
        ]
      },
      { t: "p", text: "**Head sampling and errors are a bad match.** If 0.1% of requests fail and you sample 1% at the start, you keep one failure in a thousand — so the trace for the incident you are investigating almost certainly does not exist." },
      { t: "p", text: "**Tail sampling is what you want and it needs infrastructure**: the collector must buffer every span of a trace until it completes before deciding. Budget for it rather than discovering it during an outage." }
    ]},

    { t: "h2", n: "05", text: "Health checks and alerts", id: "health" },

    { t: "code", lang: "python", title: "liveness and readiness are different questions", code: `
@app.get("/health/live")
def liveness() -> dict:
    """Am I alive? Restart me if not.

    Checks NOTHING external. A database outage must not cause every
    pod to be killed and restarted -- that turns a degraded service
    into no service, exactly when the database is already struggling.
    """
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness(db: DB) -> dict:
    """Can I serve traffic? Take me out of the load balancer if not.

    Checks the dependencies this service cannot work without, with a
    short timeout so the check itself cannot hang.
    """
    checks = {}
    try:
        async with asyncio.timeout(2):
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "failed"

    # A NON-critical dependency is reported, not failed on. If the
    # cache being down made the service unready, a cache outage would
    # remove every pod from the load balancer.
    checks["cache"] = "ok" if await cache.ping() else "degraded"

    healthy = checks["database"] == "ok"
    return JSONResponse(
        {"status": "ok" if healthy else "unhealthy", "checks": checks},
        status_code=200 if healthy else 503,
    )
`,
      hl: [5, 21, 27],
      caption: "**Conflating the two is a classic outage amplifier.** A liveness probe that checks the database restarts every pod during a database blip, and a service that was returning cached responses now returns nothing at all."
    },

    { t: "callout", kind: "trap", title: "Alerts nobody can act on", body: [
      { t: "code", lang: "python", title: "the difference between noise and a page", numbered: false, code: `
# BAD: alerts on a CAUSE that may not matter.
alert: CPUAbove80Percent
# So what? If latency and error rate are fine, high CPU is a machine
# doing work. This fires weekly, gets muted, and the mute survives.

# GOOD: alerts on a SYMPTOM the user experiences.
alert: CheckoutErrorRateAboveSLO
  expr: |
    sum(rate(http_requests_total{route="/checkout",status=~"5.."}[5m]))
    / sum(rate(http_requests_total{route="/checkout"}[5m])) > 0.01
  for: 5m                       # not a single scrape: a sustained
  annotations:                  # condition
    summary: "Checkout failing for {{ $value | humanizePercentage }}"
    runbook: "https://wiki/runbooks/checkout-errors"
    dashboard: "https://grafana/d/checkout"

# THE TEST FOR EVERY ALERT:
#   1. Does it mean a user is affected, now?
#   2. Is there something a human can DO about it right now?
#   3. If it fires at 3am, is waking someone justified?
#
# Any "no" means it is a dashboard panel or a ticket, not a page.`},
      { t: "p", text: "**Every muted alert is one that will not fire when it matters.** Alert fatigue is not a discipline problem — it is a design problem, and the fix is deleting alerts, not asking people to try harder." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a service debuggable",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This service has an incident every few weeks and each one takes hours to diagnose. This is all the observability it has." },
        { t: "code", lang: "python", numbered: false, title: "app/main.py", code: `
logging.basicConfig(level=logging.INFO)

@app.post("/orders")
def create_order(body: OrderIn, db: DB):
    logging.info(f"Creating order for {body.customer_email}")
    try:
        order = service.place_order(body)
        logging.info("Order created")
        return order
    except Exception as e:
        logging.error(f"Error: {e}")
        raise HTTPException(500, "Something went wrong")

@app.get("/health")
def health(db: DB):
    db.execute(text("SELECT 1"))
    redis.ping()
    stripe.Balance.retrieve()
    return {"ok": True}

# Prometheus:
request_count = Counter("requests", "Requests", ["path"])

@app.middleware("http")
async def count_requests(request, call_next):
    request_count.labels(path=request.url.path).inc()
    return await call_next(request)`},
        { t: "p", text: "Find every problem and rewrite it. One line is a cardinality bomb; one is why every deploy causes a partial outage." }
      ],
      requirements: [
        "List every problem, grouped by signal.",
        "Identify the cardinality bomb and estimate the series count.",
        "Explain why the health check causes outages.",
        "Rewrite logging, metrics, tracing and health checks.",
        "Give the three alerts you would actually page on.",
        "Explain what the current setup cannot tell you during an incident."
      ],
      hint: "Look at the metric label. And ask what happens to every pod when Stripe has a slow morning.",
      solution: {
        lang: "python",
        title: "app/observability.py",
        code: `# =========================================================================
# THE PROBLEMS
# =========================================================================
#
# ---- LOGGING ------------------------------------------------------
#
# 1. UNSTRUCTURED f-strings. "Creating order for alice@example.com"
#    cannot be queried. Answering "how many orders failed for account
#    X" is a regex over gigabytes.
#
# 2. PII IN LOGS. customer_email in every line, in the aggregator,
#    for its full retention. Under GDPR that is personal data in a
#    system with no deletion path, and it is almost certainly outside
#    what the privacy notice describes.
#
# 3. NO CORRELATION ID. Nothing links the "Creating order" line to
#    the "Error" line 200ms later, or to any other service's logs.
#    With concurrent requests the two interleave arbitrarily, so you
#    cannot even tell which error belongs to which order.
#
# 4. THE EXCEPTION IS SWALLOWED. logging.error(f"Error: {e}") gives
#    the message with NO STACK TRACE. You know something failed and
#    not where. This is the single biggest cause of the "hours to
#    diagnose".
#
# 5. NO CONTEXT ON FAILURE. No order id, no account id, no amount --
#    nothing to correlate with a customer report or to reproduce.
#
# 6. "Something went wrong" WITH NO REFERENCE. The customer cannot
#    give support anything to search for. A request id in the
#    response is the cheapest support tool there is.
#
# ---- METRICS ------------------------------------------------------
#
# 7. THE CARDINALITY BOMB.
#
#      request_count.labels(path=request.url.path)
#
#    request.url.path is the RESOLVED path. Every distinct URL
#    creates a new time series:
#
#      /orders/9f2a-...  /orders/3c81-...  /orders/b74e-...
#
#    One series PER ORDER, forever. At 10k orders/day that is 3.6M
#    series/year, each held in memory by Prometheus at roughly 3KB
#    resident -- ~10GB of RAM for one metric. In practice the
#    scrape times out and the metrics backend falls over, taking
#    every other metric with it.
#
#    THE FIX: the route TEMPLATE, /orders/{id}, which is bounded by
#    the number of routes.
#
# 8. NO DURATION METRIC. There is no way to know whether the service
#    is slow, or to alert on latency at all.
#
# 9. NO STATUS LABEL. The counter cannot distinguish success from
#    failure, so there is no error rate.
#
# 10. NO SATURATION METRICS. Pool usage, queue depth and memory are
#     all unmeasured -- so every incident is discovered at 100%
#     rather than at 80%.
#
# ---- TRACING ------------------------------------------------------
#
# 11. NONE AT ALL. There is no way to see where time is spent, and no
#     way to follow a request across services.
#
# ---- HEALTH -------------------------------------------------------
#
# 12. ONE ENDPOINT FOR TWO QUESTIONS.  <- THE DEPLOY OUTAGE
#
#     Kubernetes uses this for BOTH liveness and readiness. It checks
#     Stripe. So when Stripe is slow:
#
#       Stripe slow -> /health slow or failing
#                   -> LIVENESS fails -> every pod KILLED and restarted
#                   -> readiness fails on the new pods too
#                   -> every pod removed from the load balancer
#                   -> total outage, caused by a third party that
#                      most requests do not even touch
#
#     A payment provider having a slow morning takes the entire
#     service down, including the read-only endpoints.
#
# 13. NO TIMEOUT ON THE CHECKS. A hanging Redis connection hangs the
#     probe, which the platform reads as a failure.
#
# 14. A THIRD-PARTY DEPENDENCY IN A HEALTH CHECK AT ALL. Your health
#     is not Stripe's health. Report it; do not fail on it.
#
#
# =========================================================================
# WHAT THE CURRENT SETUP CANNOT TELL YOU AT 3AM
# =========================================================================
#
#   - Which requests failed, and for whom
#   - WHERE they failed (no stack trace, no spans)
#   - Whether the service is slow, and by how much
#   - Whether this is one customer or everyone
#   - Whether the database, Stripe or the code is at fault
#   - What changed
#
# Which is the complete list of questions an incident consists of.
# The "hours to diagnose" is not a skill problem.


# =========================================================================
# THE REWRITE
# =========================================================================

# ---- 1. logging -----------------------------------------------------

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.format_exc_info,
        redact_pii,                        # findings 2
        (structlog.processors.JSONRenderer() if settings.is_production
         else structlog.dev.ConsoleRenderer()),
    ],
)

PII_FIELDS = {"email", "password", "token", "card", "phone", "address"}

def redact_pii(logger, method, event_dict):
    """A processor, not a call-site rule: it cannot be forgotten."""
    for key in list(event_dict):
        if any(p in key.lower() for p in PII_FIELDS):
            event_dict[key] = "[REDACTED]"
    return event_dict


# ---- 2. correlation -------------------------------------------------

@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    # Accept an upstream id so a trace spans services; generate one
    # otherwise.
    request_id = request.headers.get("X-Request-ID") or f"req_{uuid4().hex[:12]}"
    span = trace.get_current_span()
    trace_id = format(span.get_span_context().trace_id, "032x")

    # contextvars, not thread-locals: correct under async, where many
    # requests share one thread.
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        trace_id=trace_id,
        method=request.method,
        # The TEMPLATE. This is also what the metric uses.
        route=route_template(request),
    )

    start = time.perf_counter()
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception:
        status = 500
        logger.exception("unhandled_exception")   # WITH the traceback
        raise
    finally:
        duration = time.perf_counter() - start
        request_duration.labels(
            method=request.method,
            route=route_template(request),        # finding 7 fixed
            status=str(status),
        ).observe(duration)

    # Finding 6: the customer can quote this to support, and support
    # can find every log line and the full trace from it.
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Trace-ID"] = trace_id
    return response


def route_template(request: Request) -> str:
    """/orders/9f2a-... -> /orders/{order_id}.

    THE CARDINALITY FIX. Bounded by the number of routes (~30) rather
    than by the number of orders (unbounded).
    """
    route = request.scope.get("route")
    return getattr(route, "path", "unmatched")


# ---- 3. metrics -----------------------------------------------------

request_duration = Histogram(
    "http_request_duration_seconds",
    "Request duration in seconds",
    ["method", "route", "status"],
    # Buckets chosen around the SLO (200ms), not the defaults.
    buckets=(.005, .01, .025, .05, .1, .2, .5, 1, 2, 5, 10),
)
# 4 methods x 30 routes x 6 status classes = 720 series. Bounded.

# Business metrics, low cardinality, genuinely useful in an incident.
orders_total = Counter("orders_total", "Orders", ["status", "channel"])
payment_failures = Counter("payment_failures_total", "Payment failures",
                           ["reason"])   # a FIXED set of reason codes

# Saturation -- finding 10. The leading indicators.
db_pool_in_use = Gauge("db_pool_connections_in_use", "In-use connections")
db_pool_size = Gauge("db_pool_size", "Pool size")
job_queue_depth = Gauge("job_queue_depth", "Queued jobs", ["queue"])


# ---- 4. tracing -----------------------------------------------------

FastAPIInstrumentor.instrument_app(app)      # every request
SQLAlchemyInstrumentor().instrument(engine=engine)   # every query
HTTPXClientInstrumentor().instrument()       # every outbound call
# Three lines, and the N+1 in the waterfall above becomes visible.


# ---- 5. the handler -------------------------------------------------

@app.post("/orders", status_code=201, response_model=OrderOut)
def create_order(body: OrderIn, svc: OrderingSvc, request: Request):
    # No email. The account id is the useful identifier and it is not
    # personal data in the same sense.
    logger.info("order_requested", item_count=len(body.lines),
                amount=str(body.total))
    try:
        order = svc.place_order(body.to_command())
    except PaymentDeclined as exc:
        # A DOMAIN failure: expected, so a warning and a metric, not
        # an error. Keeping the error rate meaningful (finding 3 in
        # the earlier trap list).
        payment_failures.labels(reason=exc.code).inc()
        logger.warning("payment_declined", error_code=exc.code,
                       amount=str(body.total))
        raise HTTPException(402, {"code": exc.code, "message": str(exc)})
    except Exception:
        # UNEXPECTED: an error, with the traceback (finding 4).
        logger.exception("order_failed", amount=str(body.total))
        raise HTTPException(
            500,
            {"code": "internal_error",
             # The reference the customer can quote.
             "request_id": request.state.request_id},
        )

    orders_total.labels(status="created", channel=body.channel).inc()
    logger.info("order_created", order_id=str(order.id),
                amount=str(order.total))
    return order


# ---- 6. health checks -- finding 12 ---------------------------------

@app.get("/health/live", include_in_schema=False)
def liveness() -> dict:
    """Is the PROCESS alive? Nothing external.

    This is what stops a Stripe outage restarting every pod.
    """
    return {"status": "ok"}


@app.get("/health/ready", include_in_schema=False)
async def readiness(db: DB) -> JSONResponse:
    """Can I serve traffic? Only CRITICAL dependencies.

    Stripe is NOT critical: most endpoints do not touch it, and a
    payment outage should degrade checkout, not remove the service.
    """
    checks: dict[str, str] = {}

    try:
        async with asyncio.timeout(2):          # finding 13
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "failed"
        logger.error("readiness_database_failed", exc_info=True)

    try:
        async with asyncio.timeout(1):
            await redis.ping()
        checks["cache"] = "ok"
    except Exception:
        # Reported, not fatal. The service works without the cache,
        # slower -- so a cache outage must not empty the load
        # balancer.
        checks["cache"] = "degraded"

    ready = checks["database"] == "ok"
    return JSONResponse(
        {"status": "ready" if ready else "not_ready", "checks": checks},
        status_code=200 if ready else 503,
    )


@app.get("/health/dependencies", include_in_schema=False)
def dependency_status() -> dict:
    """Third parties, for a DASHBOARD -- never wired to a probe.
    This is where Stripe belongs (finding 14)."""
    return {"stripe": circuit_breaker_state("stripe"),
            "email": circuit_breaker_state("email")}


# =========================================================================
# THE THREE ALERTS WORTH PAGING ON
# =========================================================================
#
# Symptoms the user feels, sustained, with something a human can do.
#
# 1. ERROR RATE ABOVE THE SLO
#    expr: sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m]))
#          / sum(rate(http_request_duration_seconds_count[5m])) > 0.01
#    for: 5m
#    -> users are seeing failures, now.
#
# 2. LATENCY ABOVE THE SLO
#    expr: histogram_quantile(0.99,
#            sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
#          ) > 1.0
#    for: 10m
#    -> the service is up and unusable, which no error-rate alert
#       catches.
#
# 3. SATURATION -- the LEADING indicator
#    expr: db_pool_connections_in_use / db_pool_size > 0.85
#    for: 5m
#    -> act before it becomes alerts 1 and 2. This is the only one of
#       the three that gives you time.
#
# NOT paged on: CPU, memory, disk, individual pod restarts, third-
# party status. Those are dashboard panels and tickets. Every one of
# them fires regularly without a user being affected, and every
# regularly-firing alert is eventually muted.


# =========================================================================
# TESTS
# =========================================================================

def test_metric_labels_use_the_route_template(client):
    """Finding 7 -- the cardinality bomb, pinned."""
    for _ in range(50):
        client.get(f"/orders/{uuid4()}")

    routes = {s.labels["route"] for s in collect("http_request_duration_seconds")}

    assert routes == {"/orders/{order_id}"}


def test_liveness_does_not_touch_external_services(client, monkeypatch):
    """Finding 12 -- the deploy outage. Everything is down; liveness
    must still be 200, or the platform kills every pod."""
    monkeypatch.setattr("app.db.execute", boom)
    monkeypatch.setattr("app.redis.ping", boom)
    monkeypatch.setattr("stripe.Balance.retrieve", boom)

    assert client.get("/health/live").status_code == 200


def test_a_cache_outage_does_not_make_the_service_unready(client, monkeypatch):
    """Finding 14. Degraded, not out of the load balancer."""
    monkeypatch.setattr("app.redis.ping", boom)

    r = client.get("/health/ready")

    assert r.status_code == 200
    assert r.json()["checks"]["cache"] == "degraded"


def test_no_pii_reaches_the_logs(client, log_capture):
    """Finding 2."""
    client.post("/orders", json={"customer_email": "alice@example.com", ...})

    assert "alice@example.com" not in log_capture.text


def test_every_log_line_carries_the_request_id(client, log_capture):
    """Finding 3 -- the correlation that makes logs usable."""
    r = client.post("/orders", json=VALID)
    request_id = r.headers["X-Request-ID"]

    lines = [json.loads(l) for l in log_capture.lines]
    assert lines and all(l["request_id"] == request_id for l in lines)


def test_an_unhandled_error_logs_a_traceback(client, log_capture, monkeypatch):
    """Finding 4 -- the reason incidents took hours."""
    monkeypatch.setattr("app.service.place_order", boom)

    r = client.post("/orders", json=VALID)

    assert r.status_code == 500
    assert "request_id" in r.json()["detail"]      # finding 6
    assert "Traceback" in log_capture.text`,
        notes: [
          { t: "p", text: "**`request.url.path` as a metric label is the cardinality bomb.** Every distinct order URL creates its own time series — around 3.6 million per year at modest volume, roughly 10GB of Prometheus memory for one metric. In practice the scrape times out and the metrics backend fails, taking every other metric with it during the incident you need them for." },
          { t: "p", text: "**The health check causes the deploy outages.** One endpoint serves both probes and it calls Stripe, so a slow payment provider fails liveness, Kubernetes kills every pod, and the replacements fail readiness too — a total outage caused by a third party most requests never touch." },
          { t: "callout", kind: "insight", title: "Liveness and readiness answer different questions", body: [
            { t: "p", text: "Liveness asks \"should this process be restarted?\" — and restarting cannot fix a database outage, so checking one there converts a degraded service into no service exactly when the dependency is already struggling." },
            { t: "p", text: "Readiness asks \"should traffic come here?\" and may check critical dependencies. Even then, a non-critical one like a cache is reported as degraded rather than failing the check, or a cache outage empties the load balancer." }
          ]},
          { t: "p", text: "**`logging.error(f\"Error: {e}\")` is the reason incidents take hours.** It records that something failed and discards where. `logger.exception(...)` captures the traceback, and that one substitution is the largest single improvement in this rewrite." },
          { t: "p", text: "**Returning the request id in the error response is the cheapest support tool available.** \"Something went wrong\" gives the customer nothing to quote; a reference turns a support ticket into a log query that finds every line and the full trace." },
          { t: "p", text: "**A declined payment is a warning, not an error.** Logging expected conditions at error level means the error rate is dominated by normal behaviour, the alert on it gets muted, and it never fires for the real thing." },
          { t: "p", text: "**Only the saturation alert gives you time.** Error rate and latency tell you users are already affected; pool usage at 85% is the one that fires while there is still something to do about it." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team added a Prometheus counter labelled with the customer ID, to answer questions about per-customer usage. It worked well at forty customers." },
      { t: "p", text: "**At four thousand customers, Prometheus ran out of memory and stopped scraping.** Every dashboard went blank and every alert went silent — during a genuine incident that nobody could then see, because the observability had become the outage." },
      { t: "p", text: "**Per-customer questions belong in logs, not metrics.** Logs carry unbounded fields by design; a metric label multiplies the series count, and the multiplication is permanent because old series are retained." },
      { t: "p", text: "**The rule that prevents this: before adding a label, ask how many distinct values it can ever have.** If the answer is \"as many as we have customers, orders or requests\", it is a log field." }
    ]}
  ],

  takeaways: [
    "**Logs answer \"what happened in this request\", metrics answer \"how often and how slow\", traces answer \"where did the time go\".** Use the one that fits the question.",
    "**Cardinality decides everything.** A metric label with unbounded values creates one time series per value and will take down your metrics backend.",
    "**Label metrics with the route template, never the resolved path** — `/orders/{id}`, not `/orders/9f2a...`.",
    "**Structured logs are queryable; f-strings are not.** `error_code:declined AND account_id:acc_123` is impossible over free text.",
    "**Bind context once per request with `contextvars`**, so every downstream log line carries the ids without anyone remembering to add them.",
    "**Redact in a processor, not at the call site.** A processor cannot be forgotten; a call site can.",
    "**`logger.exception` not `logger.error(f\"{e}\")`.** The traceback is the difference between a diagnosis and a guess.",
    "**Reserve error level for things a human should look at.** Logging expected conditions as errors destroys the signal and gets the alert muted.",
    "**Return a request id in error responses**, so a customer report becomes a log query.",
    "**Alert on percentiles, never averages** — and separate error latency from success latency, since fast failures look fast.",
    "**Liveness checks nothing external; readiness checks only critical dependencies.** Conflating them turns a dependency blip into a full outage.",
    "**Head sampling misses errors** because errors are rare. Tail sampling keeps all of them, and needs a collector that buffers whole traces.",
    "**Page only on sustained user-visible symptoms with an action attached.** Saturation is the only alert that gives you time; everything else tells you it already happened."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`request_count.labels(path=request.url.path).inc()` — what is wrong?",
        options: [
          "Counters should be gauges for request counts",
          "The resolved path is unbounded, so every distinct URL creates a time series — millions of them, which exhausts the metrics backend",
          "The label name should be `route`",
          "Nothing, provided retention is short"
        ],
        answer: 1,
        why: "Old series are retained, so the count only grows. Using the route template `/orders/{id}` bounds the label by the number of routes. Per-customer or per-order questions belong in logs, which carry unbounded fields by design."
      },
      {
        stem: "A single `/health` endpoint checks the database, Redis and Stripe, and serves both liveness and readiness probes. What happens when Stripe is slow?",
        options: [
          "Checkout degrades gracefully",
          "Liveness fails, so every pod is killed and restarted, and the replacements fail readiness too — a total outage caused by a third party",
          "The probes time out but traffic continues",
          "Only the payment routes are affected"
        ],
        answer: 1,
        why: "Liveness asks whether the process should be restarted, and restarting cannot fix a third party's outage. Liveness should check nothing external, readiness only critical dependencies, and a non-critical one like a cache should be reported as degraded rather than failing the check."
      },
      {
        stem: "Why does head sampling at 1% fail you during an incident?",
        options: [
          "It samples too much data",
          "The decision is made at the start of a request, so with a 0.1% error rate you keep roughly one failure in a thousand — the trace you need almost certainly was not kept",
          "It cannot be combined with metrics",
          "It only samples the first request of each minute"
        ],
        answer: 1,
        why: "Errors are rare, which is exactly why random sampling misses them. Tail sampling decides after the trace completes, so it can keep every error and every slow request plus a small percentage of the rest — at the cost of a collector that buffers whole traces."
      },
      {
        stem: "A service logs `UserNotFound` at error level. What is the consequence?",
        options: [
          "Nothing — it is defensive",
          "The error rate is dominated by normal behaviour, so the alert built on it is muted and never fires for a real failure",
          "The log volume grows but nothing else changes",
          "Tracing spans are marked failed incorrectly"
        ],
        answer: 1,
        why: "Error level should mean a human may need to look. Once expected conditions are logged as errors, the metric derived from them is meaningless — and the alert gets muted, which is the outcome that matters, because a muted alert is one that will not fire when it should."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is the difference between monitoring and observability?",
        strong: "Monitoring tells you a known condition has occurred; observability lets you ask new questions about a failure nobody anticipated. Dashboards answer last quarter's questions, and the outage you are in is never one of them.",
        answer: [
          { t: "p", text: "Grounding it in the three signals and what each answers keeps it concrete rather than a definition contest." },
          { t: "p", text: "The cardinality trade-off is the technical substance: metrics are cheap because they are aggregated, logs are expensive because they are not, and that is why per-customer questions belong in logs." },
          { t: "p", text: "The trace id linking all three is the practical detail — alert on the metric, find the trace, read the logs — and it only works if the id is present everywhere." }
        ]
      },
      {
        level: "advanced",
        q: "How do you decide what to alert on?",
        strong: "Sustained user-visible symptoms with an action attached — error rate above the SLO, latency above the SLO, saturation approaching a limit. Not CPU, not memory, not individual restarts.",
        answer: [
          { t: "p", text: "The three questions — is a user affected, can a human act, is 3am justified — give a repeatable test rather than a list." },
          { t: "p", text: "Noting that saturation is the only alert that gives you time shows you distinguish leading from lagging indicators." },
          { t: "p", text: "Framing alert fatigue as a design problem solved by deleting alerts, not by asking people to try harder, is the point most answers miss." }
        ]
      },
      {
        level: "core",
        q: "Why structured logging?",
        strong: "So logs can be queried instead of read. `error_code:declined AND account_id:acc_123` is impossible over free text, and a correlation id bound once per request links every line of a single request across services.",
        answer: [
          { t: "p", text: "The query example makes the benefit concrete in a way \"it's more parseable\" does not." },
          { t: "p", text: "Mentioning `contextvars` shows you know why thread-locals fail under async, where many requests share one thread." },
          { t: "p", text: "Redaction as a processor rather than a call-site rule is a good closing detail: it is the difference between a guarantee and a habit." }
        ]
      }
    ]
  }
});
