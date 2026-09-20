/* ============================================================================
   LESSON 12.7 — Async APIs and Background Work
   ========================================================================= */
EC.receiveLesson({
  id: "12.7",

  lede: "A request that takes ninety seconds is not a slow request — it is a design error. Somewhere between accepting the work and finishing it, the client's connection, the load balancer's timeout and your own deploy will all give up. **The fix is to stop pretending the work fits in a request** and give the caller something to poll or subscribe to instead.",

  objectives: [
    "Decide when an endpoint should be `async def` and when it must not be",
    "Choose between a background task, a queue and a scheduled job",
    "Design the accepted-and-polled pattern so clients can follow long work",
    "Make a worker safe to retry, and know why that is not optional",
    "Deliver a webhook that survives the receiver being down"
  ],

  prerequisites: ["11.6", "12.4", "12.5"],

  blocks: [

    { t: "h2", n: "01", text: "The decision that comes first", id: "decision" },

    { t: "viz",
      title: "How long is the work?",
      caption: "The boundary is not 'slow' versus 'fast' — it is whether the caller can reasonably hold a connection open for it. Past a few seconds they cannot, and every layer between you and them agrees.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Decision tree from request duration to the right execution mechanism">
  <rect x="330" y="18" width="240" height="42" rx="9" style="fill:var(--surface-2);stroke:var(--border-strong)"/>
  <text x="450" y="44" text-anchor="middle" class="s-label">How long does it take?</text>

  <path d="M400 60 L150 104" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M450 60 L450 104" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M500 60 L760 104" style="stroke:var(--border-strong)" fill="none"/>

  <rect x="24" y="104" width="252" height="40" rx="9" style="fill:none;stroke:var(--good)"/>
  <text x="150" y="129" text-anchor="middle" class="s-sub" style="fill:var(--good)">Under ~1s</text>
  <rect x="324" y="104" width="252" height="40" rx="9" style="fill:none;stroke:var(--warn)"/>
  <text x="450" y="129" text-anchor="middle" class="s-sub" style="fill:var(--warn)">1s to ~10s</text>
  <rect x="634" y="104" width="252" height="40" rx="9" style="fill:none;stroke:var(--crit)"/>
  <text x="760" y="129" text-anchor="middle" class="s-sub" style="fill:var(--crit)">Over ~10s, or unbounded</text>

  <path d="M150 144 L150 176" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M450 144 L450 176" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M760 144 L760 176" style="stroke:var(--border-strong)" fill="none"/>

  <rect x="24" y="176" width="252" height="128" rx="9" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="150" y="202" text-anchor="middle" class="s-label">In the request</text>
  <text x="150" y="228" text-anchor="middle" class="s-sub">Return the result</text>
  <text x="150" y="250" text-anchor="middle" class="s-sub">200 / 201</text>
  <text x="150" y="284" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">Most endpoints</text>

  <rect x="324" y="176" width="252" height="128" rx="9" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="450" y="202" text-anchor="middle" class="s-label">BackgroundTasks</text>
  <text x="450" y="228" text-anchor="middle" class="s-sub">Only if losing it is OK</text>
  <text x="450" y="250" text-anchor="middle" class="s-sub">Email, audit, cache warm</text>
  <text x="450" y="284" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">Dies with the process</text>

  <rect x="634" y="176" width="252" height="128" rx="9" style="fill:var(--surface);stroke:var(--border)"/>
  <text x="760" y="202" text-anchor="middle" class="s-label">A queue and a worker</text>
  <text x="760" y="228" text-anchor="middle" class="s-sub">202 + a job resource</text>
  <text x="760" y="250" text-anchor="middle" class="s-sub">Durable, retryable</text>
  <text x="760" y="284" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">The only safe option</text>
</svg>`
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A request is a conversation with a deadline that other people set.** The browser has one, the load balancer has one, the reverse proxy has one, and your own deploy rolls the process every time you ship. None of them asked you." },
      { t: "p", text: "So the question is never \"can I make this finish in time?\" — it is **\"what happens to this work when the process goes away mid-flight?\"** If the answer is \"it is lost and nobody knows\", the work does not belong in the request." },
      { t: "p", text: "Everything else in this lesson follows from that one question." }
    ]},

    { t: "h2", n: "02", text: "async def, and when it hurts", id: "async" },

    {"kind": "matrix", "title": "async def or def, by what the handler does", "caption": "FastAPI runs a plain def handler in a thread pool and an async def on the event loop. The wrong choice is silent: an async def that calls a synchronous library stalls every request.", "rows": ["awaits httpx / asyncpg", "calls requests / a sync driver", "pure CPU for seconds", "returns immediately"], "cols": ["async def", "def"], "cells": [[{"text": "right", "tone": "good"}, {"text": "works, wastes a thread", "tone": "warn"}], [{"text": "blocks the loop", "tone": "crit"}, {"text": "right", "tone": "good"}], [{"text": "blocks the loop", "tone": "crit"}, {"text": "blocks a thread — use a process or queue", "tone": "warn"}], [{"text": "fine", "tone": "good"}, {"text": "fine", "tone": "good"}]], "t": "diagram", "id": "dg-12_7-02-1"},

    { t: "table",
      head: ["The handler does", "Declare it", "Because"],
      rows: [
        ["`await`s a database or HTTP call", "`async def`", "The loop runs other requests while it waits"],
        ["Calls a **blocking** driver (`psycopg2`, `requests`)", "`def`", "FastAPI runs it in a threadpool; the loop stays free"],
        ["Pure CPU work — parsing, hashing, rendering", "`def`", "**It blocks the loop either way**; at least a thread is not the loop"],
        ["Nothing but returns a constant", "Either", "No difference worth the thought"],
        ["Mixes an `await` and a blocking call", "`async def` + `to_thread`", "Isolate the blocking part explicitly"]
      ],
      caption: "**`async def` with a blocking call inside is the worst of both**: FastAPI trusts your declaration and runs it on the event loop, so one slow query stalls every other request the process is serving."
    },

    { t: "code", lang: "python", title: "the failure and the three fixes", code: `
# WRONG. Declared async, blocks the loop for the full 800ms.
# Every other request on this worker waits, including the health check.
@app.get("/orders/{oid}")
async def get_order(oid: str):
    return psycopg2_connection.execute(...)      # blocking driver


# FIX A — drop async. FastAPI runs it in a threadpool, the loop is free.
# The smallest change, and correct.
@app.get("/orders/{oid}")
def get_order(oid: str):
    return psycopg2_connection.execute(...)


# FIX B — an async driver. Now the await is real.
@app.get("/orders/{oid}")
async def get_order(oid: str, db: AsyncSession = Depends(get_async_db)):
    return await db.get(Order, oid)


# FIX C — keep async, push the blocking part off the loop. Use this when
# a handler is mostly awaits with one stubborn synchronous call.
@app.get("/orders/{oid}")
async def get_order(oid: str):
    customer = await http.get(f"/customers/{oid}")          # real await
    pdf = await asyncio.to_thread(render_invoice_pdf, oid)  # CPU, off-loop
    return {"customer": customer, "pdf": pdf}
`,
      hl: [4, 11, 18, 26],
      caption: "**The threadpool is bounded** (40 threads by default in AnyIO). Forty concurrent slow queries and the forty-first waits — so `def` handlers are a pressure valve, not infinite capacity."
    },

    { t: "callout", kind: "trap", title: "The event loop stalls silently", body: [
      { t: "p", text: "There is no error when you block the loop. Latency rises across **every** endpoint on the process, including ones that touch nothing, and the shape in your dashboard is a service-wide p99 spike with no single slow route to blame." },
      { t: "code", lang: "python", title: "make it loud in development", numbered: false, code: `
import asyncio

# Warns whenever a single callback occupies the loop for over 100ms.
# Set it in a development-only startup hook and read the warnings.
asyncio.get_event_loop().set_debug(True)
asyncio.get_event_loop().slow_callback_duration = 0.1

# Then a blocking call prints:
#   Executing <Handle ...> took 0.812 seconds`},
      { t: "p", text: "**The grep that finds most cases**: an `async def` handler with no `await` anywhere in its body is either doing nothing interesting or blocking the loop. It is a cheap CI check and it catches the mistake at review time rather than under load." }
    ]},

    { t: "h2", n: "03", text: "Accept the work, return a job", id: "accepted" },

    {"kind": "flow", "title": "Accept the work, return a job", "caption": "A slow operation should not hold an HTTP connection open. The handler validates, enqueues, and returns 202 with a job id; a worker does the work; the client polls or receives a webhook.", "cols": 5, "nodes": [{"id": "c", "label": "client POST /reports"}, {"id": "api", "label": "API: validate, enqueue", "sub": "returns 202 + job id", "tone": "accent"}, {"id": "q", "label": "queue", "sub": "Redis, RabbitMQ, SQS", "tone": "warn"}, {"id": "w", "label": "worker", "sub": "does the work, survives restarts", "tone": "good"}, {"id": "done", "label": "GET /jobs/{id} or webhook", "sub": "the result", "tone": "violet"}], "edges": [["c", "api"], ["api", "q"], ["q", "w"], ["w", "done"]], "t": "diagram", "id": "dg-12_7-03-0"},


    { t: "code", lang: "python", title: "202 Accepted, and a resource to poll", code: `
class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class Job(BaseModel):
    id: str
    status: JobStatus
    created_at: datetime
    # Present only when it succeeded -- do not make the client guess
    result_url: str | None = None
    # Present only when it failed, and always actionable
    error: ErrorDetail | None = None


@app.post("/reports", status_code=202, response_model=Job)
def request_report(body: ReportRequest, db: DB, response: Response) -> Job:
    # 1. Persist the job FIRST, in the same transaction as any state it
    #    depends on. A job that exists only in the queue is a job that
    #    vanishes when the queue drops a message.
    job = ReportJob(id=new_id(), status=JobStatus.queued, params=body.model_dump())
    db.add(job)
    db.commit()

    # 2. Enqueue AFTER the commit, so the worker cannot start before the
    #    row it needs is visible. This ordering is the whole trick.
    generate_report.delay(job.id)

    # 3. Tell the client where to look. Location is the standard header;
    #    Retry-After stops well-behaved clients hammering you.
    response.headers["Location"] = f"/jobs/{job.id}"
    response.headers["Retry-After"] = "5"
    return Job.model_validate(job)


@app.get("/jobs/{job_id}", response_model=Job)
def get_job(job_id: str, db: DB) -> Job:
    job = db.get(ReportJob, job_id)
    if job is None:
        raise HTTPException(404, "No such job")
    return Job.model_validate(job)
`,
      hl: [19, 23, 30, 34],
      caption: "**Commit then enqueue, never the reverse.** Enqueue-inside-the-transaction produces a worker that picks up a job id the database has not committed yet — an intermittent \"job not found\" that only appears under load."
    },

    { t: "callout", kind: "insight", title: "Polling, streaming, or a callback", body: [
      { t: "table",
        head: ["Mechanism", "Good for", "Cost"],
        rows: [
          ["**Polling a job resource**", "Almost everything", "Wasted requests; needs `Retry-After`"],
          ["Server-Sent Events", "Progress a human is watching", "One connection held per client"],
          ["WebSocket", "Two-way, live collaboration", "Stateful; complicates scaling and deploys"],
          ["**Webhook**", "Machine consumers, minutes to hours", "You must handle their downtime"],
          ["Long polling", "Legacy clients", "Holds a connection and hits the same timeouts"]
        ]
      },
      { t: "p", text: "**Start with polling.** It is stateless, it survives a deploy on either side, it needs no infrastructure, and a `Retry-After` header keeps the traffic sane. The others are optimisations you adopt when polling demonstrably does not fit." },
      { t: "p", text: "**Offer a webhook in addition, not instead.** A machine consumer wants the push; they still want a way to reconcile after their receiver was down for an hour, and that way is the polling endpoint." }
    ]},

    { t: "h2", n: "04", text: "Workers that survive being killed", id: "workers" },

    { t: "ladder",
      title: "A worker task that charges a card",
      rungs: [
        { level: "bad", label: "Do the work, hope it finishes",
          why: "The worker is killed mid-task on every deploy. The retry runs the whole task again and the customer is charged twice — because nothing recorded that the charge already happened.",
          code: `@celery.task
def process_payment(order_id: str):
    order = db.get(Order, order_id)
    stripe.Charge.create(amount=order.total, source=order.token)
    order.status = "paid"
    db.commit()
    send_receipt(order)` },
        { level: "ok", label: "Guard on the current state",
          why: "The status check stops most duplicates, but it is a read followed by a write with no lock — two workers reading `pending` at the same moment both proceed. Narrower window, same bug.",
          code: `@celery.task(bind=True, max_retries=3)
def process_payment(self, order_id: str):
    order = db.get(Order, order_id)
    if order.status == "paid":
        return                      # racy: two workers can both pass
    try:
        stripe.Charge.create(...)
        order.status = "paid"
        db.commit()
    except StripeError as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)` },
        { level: "best", label: "Make the operation idempotent at the source",
          why: "A deterministic idempotency key means the payment provider itself refuses the second charge. The database row is then a record, not the lock — so a retry after a crash at any point is safe.",
          code: `@celery.task(bind=True, max_retries=5, acks_late=True)
def process_payment(self, order_id: str):
    with db.begin():
        # SELECT ... FOR UPDATE: one worker holds the row.
        order = db.execute(
            select(Order).where(Order.id == order_id).with_for_update()
        ).scalar_one()

        if order.status == "paid":
            return                              # genuinely settled

        # The SAME key on every retry, derived from the order --
        # never uuid4(), which is a new key each attempt.
        charge = stripe.Charge.create(
            amount=order.total,
            source=order.token,
            idempotency_key=f"order-{order.id}-charge",
        )

        order.status = "paid"
        order.charge_id = charge.id

    # AFTER the commit, and itself a separate retryable task.
    send_receipt.delay(order_id)`,
          note: "**`acks_late=True` is the other half.** By default a broker acknowledges a message when the worker picks it up, so a worker killed mid-task loses it silently. Late acknowledgement means the message returns to the queue — which is only safe because the task is now idempotent." }
      ]
    },

    { t: "callout", kind: "trap", title: "Four ways background work goes wrong", body: [
      { t: "code", lang: "python", title: "each of these has caused an incident", numbered: false, code: `
# 1. PASSING OBJECTS INSTEAD OF IDS.
#    The object is serialised at enqueue time, so the worker acts on a
#    stale snapshot -- and an ORM object may not serialise at all.
process_order.delay(order)          # no
process_order.delay(order.id)       # yes: re-read inside the task


# 2. A NEW IDEMPOTENCY KEY PER ATTEMPT.
#    Defeats the entire mechanism; every retry is a fresh charge.
idempotency_key=str(uuid4())                    # no
idempotency_key=f"order-{order.id}-charge"      # yes: deterministic


# 3. NO DEAD-LETTER QUEUE.
#    A permanently failing task retries forever, occupying a worker and
#    filling the log. After max_retries it must go somewhere a human
#    looks -- not into the void.
@celery.task(bind=True, max_retries=5)
def f(self, ...):
    try:
        ...
    except PermanentError:
        dead_letter.record(self.request.id, ...)   # then do NOT retry
        raise Reject(requeue=False)


# 4. A LINEAR RETRY AGAINST A STRUGGLING DEPENDENCY.
#    Fixed retries synchronise across workers and become a thundering
#    herd exactly when the dependency is least able to cope.
countdown=5                                          # no
countdown=2 ** self.request.retries + random.random()  # yes: jittered`},
      { t: "p", text: "**Number one is the most common and the least obvious.** It looks like a convenience; it is a stale read with extra steps, and it fails only when the row changes between enqueue and execution — which is exactly when correctness matters." }
    ]},

    { t: "h2", n: "05", text: "Sending webhooks", id: "webhooks" },

    { t: "code", lang: "python", title: "a delivery the receiver can trust", code: `
def deliver(endpoint: WebhookEndpoint, event: Event) -> None:
    body = json.dumps(event.payload, separators=(",", ":")).encode()
    timestamp = str(int(time.time()))

    # Sign the timestamp AND the body. Signing the body alone lets an
    # attacker who captures one delivery replay it forever.
    signature = hmac.new(
        endpoint.secret.encode(),
        timestamp.encode() + b"." + body,
        hashlib.sha256,
    ).hexdigest()

    requests.post(
        endpoint.url,
        data=body,
        timeout=(3, 10),                     # connect, read -- always both
        headers={
            "Content-Type": "application/json",
            "X-Signature": f"t={timestamp},v1={signature}",
            # Lets the receiver deduplicate, because you WILL send twice.
            "X-Event-Id": event.id,
            "X-Event-Type": event.type,
        },
    )
`,
      hl: [7, 16, 21],
      caption: "**Document at-least-once delivery explicitly.** A receiver that assumes exactly-once will double-process the first time you retry, and the retry is not a bug — it is what makes delivery reliable at all."
    },

    { t: "callout", kind: "insight", title: "The receiver will be down", body: [
      { t: "p", text: "Not might — will. Deploys, outages, expired certificates and a firewall change nobody told you about. **Delivery is a queue with retries, never an inline HTTP call from your request handler.**" },
      { t: "code", lang: "python", title: "what a mature sender does", numbered: false, code: `
# 1. Exponential backoff with a real ceiling, jittered.
#    e.g. 1m, 5m, 30m, 2h, 6h, 24h -- then stop.
# 2. Disable an endpoint after sustained failure, and tell the owner.
#    An endpoint failing for a week is not coming back on its own.
# 3. Keep a delivery log with the response code and body, exposed in
#    the dashboard -- "did you send it?" becomes self-service.
# 4. Offer manual redelivery of a single event.
# 5. Keep the polling API working, so a receiver that missed a window
#    can reconcile without asking you for a replay.`},
      { t: "p", text: "**Point five is the one teams skip**, and it is what turns \"our receiver was down for an hour\" from a support ticket into something the customer resolves themselves." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix an export endpoint that times out",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This endpoint generates a CSV export. It times out for large accounts, occasionally double-charges the export fee, and the team's fix so far has been to raise the gateway timeout to 300 seconds." },
        { t: "code", lang: "python", numbered: false, title: "app/exports.py", code: `
@app.post("/exports")
async def create_export(body: ExportRequest, user=Depends(current_user)):
    billing.charge(user.id, amount=EXPORT_FEE)

    rows = db.query(Order).filter(Order.account_id == user.account_id).all()

    csv_data = ""
    for row in rows:
        csv_data += f"{row.id},{row.total},{row.created_at}\\n"

    url = s3.upload(f"exports/{uuid4()}.csv", csv_data)

    requests.post(user.webhook_url, json={"export_url": url})

    return {"url": url}`},
        { t: "p", text: "Rewrite it. There are at least seven distinct problems, and one of them causes a double charge even after you move the work to a queue." }
      ],
      requirements: [
        "Name all seven problems before writing any code.",
        "Return 202 with a job resource the client can poll.",
        "Make the worker safe to kill at any instant.",
        "Explain why moving to a queue alone does **not** fix the double charge.",
        "Handle the webhook receiver being down.",
        "Bound the memory used by a ten-million-row export.",
        "Write the test that proves a retry does not charge twice."
      ],
      hint: "Look at the order of operations. What has already happened when the process dies during the S3 upload? And what does a Celery retry re-run?",
      solution: {
        lang: "python",
        title: "app/exports.py",
        code: `# =========================================================================
# THE SEVEN PROBLEMS
# =========================================================================
#
# 1. async def with entirely blocking calls. Declared async, so FastAPI
#    runs it ON THE EVENT LOOP -- one export stalls every other request
#    this worker is serving, including the health check.
#
# 2. Unbounded work in a request. .all() loads every order into memory
#    and the loop builds one giant string. A million rows is minutes of
#    CPU and gigabytes of RSS. No gateway timeout is large enough,
#    and raising it to 300s just makes the failure slower.
#
# 3. Charging BEFORE doing the work, with no idempotency. If anything
#    after line 3 fails -- and it does -- the customer paid for nothing.
#
# 4. String concatenation in a loop. Quadratic; also the source of the
#    memory problem in (2). Nothing is written until everything is built.
#
# 5. An inline webhook POST with no timeout. A receiver that accepts the
#    connection and never responds holds this request open forever, and
#    a receiver that is DOWN fails the whole export after the work
#    succeeded.
#
# 6. No idempotency anywhere. A client retry after a gateway timeout
#    starts a second full export and charges a second fee -- and a
#    gateway timeout is precisely what this endpoint produces.
#
# 7. No CSV escaping. A product name containing a comma or a newline
#    corrupts the file, and a value starting with "=" is a formula
#    injection when the file is opened in a spreadsheet.


# =========================================================================
# WHY A QUEUE ALONE DOES NOT FIX THE DOUBLE CHARGE
# =========================================================================
#
# Move the body into a Celery task and the charge moves with it. Now the
# worker is killed after billing.charge() but before the row is updated:
#
#     charge succeeds  ->  worker killed  ->  message redelivered
#     ->  task runs from the top  ->  charge AGAIN
#
# The queue has made it WORSE, because retries are now automatic where
# before they needed a human. Durability without idempotency multiplies
# the bug it was meant to fix.
#
# Two things fix it, and both are needed:
#   a) a deterministic idempotency key, so the billing provider itself
#      rejects the second attempt
#   b) charging AFTER the artefact exists, so a failure costs nothing


# =========================================================================
# THE API
# =========================================================================

class ExportJob(BaseModel):
    id: str
    status: Literal["queued", "running", "succeeded", "failed"]
    created_at: datetime
    row_count: int | None = None
    download_url: str | None = None
    error: ErrorDetail | None = None


@app.post("/exports", status_code=202, response_model=ExportJob)
def create_export(                          # def, not async def --
    body: ExportRequest,                    # every call in here blocks
    db: DB,
    response: Response,
    user: CurrentUser,
    idempotency_key: Annotated[str | None, Header()] = None,
) -> ExportJob:
    # A client that retries after a timeout gets the SAME job back
    # rather than starting a second export. This is the cheap half of
    # the double-charge fix and it lives at the edge.
    if idempotency_key:
        existing = db.execute(
            select(ExportJobRow).where(
                ExportJobRow.account_id == user.account_id,
                ExportJobRow.idempotency_key == idempotency_key,
            )
        ).scalar_one_or_none()
        if existing:
            response.headers["Location"] = f"/exports/{existing.id}"
            return ExportJob.model_validate(existing)

    job = ExportJobRow(
        id=new_id(),
        account_id=user.account_id,
        status="queued",
        params=body.model_dump(),
        idempotency_key=idempotency_key,
    )
    db.add(job)
    db.commit()                    # COMMIT, then enqueue. Never reverse:
                                   # the worker must not start before the
    run_export.delay(job.id)       # row it reads is visible.

    response.headers["Location"] = f"/exports/{job.id}"
    response.headers["Retry-After"] = "10"
    return ExportJob.model_validate(job)


@app.get("/exports/{job_id}", response_model=ExportJob)
def get_export(job_id: str, db: DB, user: CurrentUser) -> ExportJob:
    job = db.get(ExportJobRow, job_id)

    # 404, not 403, for another account's job -- 403 confirms the id
    # exists and turns this into an enumeration oracle.
    if job is None or job.account_id != user.account_id:
        raise HTTPException(404, "No such export")

    return ExportJob.model_validate(job)


# =========================================================================
# THE WORKER
# =========================================================================

@celery.task(bind=True, max_retries=3, acks_late=True)
def run_export(self, job_id: str) -> None:
    """Safe to kill at any instant. Every step is either idempotent or
    guarded by a state check under a row lock."""
    with db.begin():
        job = db.execute(
            select(ExportJobRow).where(ExportJobRow.id == job_id)
                                .with_for_update()
        ).scalar_one()

        # The redelivery guard. acks_late means this task WILL run
        # twice sooner or later; this is what makes that harmless.
        if job.status in ("succeeded", "failed"):
            return

        job.status = "running"
        job.started_at = utcnow()

    try:
        key = f"exports/{job.account_id}/{job.id}.csv"

        # Deterministic key -> the same object path on every retry, so a
        # re-run overwrites rather than leaving orphaned partial files.
        row_count = _stream_export_to_s3(job.account_id, key)

        # CHARGE AFTER the artefact exists. A failure now costs the
        # customer nothing, which is the right side to fail on.
        billing.charge(
            job.account_id,
            amount=EXPORT_FEE,
            # The SAME key every attempt. This is the half a queue
            # cannot give you: the provider itself refuses the second
            # charge, whatever this process does.
            idempotency_key=f"export-{job.id}-fee",
        )

        with db.begin():
            job = db.get(ExportJobRow, job_id)
            job.status = "succeeded"
            job.row_count = row_count
            job.s3_key = key
            job.finished_at = utcnow()

    except TransientError as exc:
        with db.begin():
            db.get(ExportJobRow, job_id).status = "queued"
        # Jittered backoff: fixed delays synchronise across workers and
        # hit a struggling dependency in a herd.
        raise self.retry(
            exc=exc,
            countdown=int(2 ** self.request.retries + random.random() * 5),
        )

    except Exception as exc:
        logger.exception("export_failed", extra={"job_id": job_id})
        with db.begin():
            job = db.get(ExportJobRow, job_id)
            job.status = "failed"
            job.error = {"code": "export_failed", "message": str(exc)}
            job.finished_at = utcnow()
        raise Reject(requeue=False)          # to the dead-letter queue

    # A SEPARATE task, so a broken receiver cannot fail a successful
    # export and cannot trigger a re-export through a retry.
    notify_webhook.delay(job_id)


def _stream_export_to_s3(account_id: str, key: str) -> int:
    """Constant memory regardless of row count.

    yield_per streams from the database instead of materialising every
    row; the multipart upload streams to S3 instead of holding the file.
    Ten million rows uses the same memory as ten.
    """
    row_count = 0

    with s3.multipart_writer(key) as sink:
        buf = io.StringIO()
        # csv.writer, not f-strings: it quotes commas, newlines and
        # embedded quotes correctly.
        writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["id", "total", "created_at", "description"])

        query = (
            select(Order)
            .where(Order.account_id == account_id)
            .execution_options(yield_per=1000)
        )

        for order in db.execute(query).scalars():
            writer.writerow([
                order.id,
                order.total,
                order.created_at.isoformat(),
                _defuse(order.description),
            ])
            row_count += 1

            if buf.tell() > 5 * 1024 * 1024:      # S3 minimum part size
                sink.write(buf.getvalue().encode())
                buf.seek(0)
                buf.truncate()

        if buf.tell():
            sink.write(buf.getvalue().encode())

    return row_count


def _defuse(value: str | None) -> str:
    """CSV formula injection. A cell beginning with = + - or @ is
    executed as a formula by Excel and Sheets, so a customer-supplied
    product name can exfiltrate the rest of the sheet."""
    if value and value[0] in ("=", "+", "-", "@", "\\t", "\\r"):
        return "'" + value
    return value


# =========================================================================
# THE WEBHOOK
# =========================================================================

@celery.task(bind=True, max_retries=6, acks_late=True)
def notify_webhook(self, job_id: str) -> None:
    job = db.get(ExportJobRow, job_id)
    endpoint = db.get(WebhookEndpoint, job.account_id)
    if endpoint is None or not endpoint.enabled:
        return

    body = json.dumps({
        "event": "export.succeeded",
        "export_id": job.id,
        # A short-lived signed URL, not a permanent public one.
        "download_url": s3.presigned_url(job.s3_key, expires_in=3600),
    }, separators=(",", ":")).encode()

    timestamp = str(int(time.time()))
    signature = hmac.new(
        endpoint.secret.encode(),
        timestamp.encode() + b"." + body,       # timestamp AND body,
        hashlib.sha256,                         # or replay is trivial
    ).hexdigest()

    try:
        r = requests.post(
            endpoint.url,
            data=body,
            timeout=(3, 10),                    # connect AND read
            headers={
                "Content-Type": "application/json",
                "X-Signature": f"t={timestamp},v1={signature}",
                "X-Event-Id": f"export-{job.id}",   # lets them dedupe
            },
        )
        r.raise_for_status()
        endpoint.consecutive_failures = 0
        db.commit()

    except requests.RequestException as exc:
        endpoint.consecutive_failures += 1
        db.commit()

        if self.request.retries >= self.max_retries:
            # An endpoint failing for days is not coming back by
            # itself. Disable it and tell a human.
            if endpoint.consecutive_failures > 50:
                endpoint.enabled = False
                db.commit()
                alert_account_owner(endpoint.account_id, "webhook_disabled")
            return          # the polling API still works; nothing is lost

        # 1m, 5m, 25m, 2h, 10h, 24h -- with jitter.
        raise self.retry(
            exc=exc,
            countdown=int(60 * 5 ** self.request.retries
                          + random.random() * 60),
        )


# =========================================================================
# TESTS
# =========================================================================

def test_a_retry_does_not_charge_twice(celery_worker, billing_spy):
    """The test that matters. Kill the worker mid-task and let the
    broker redeliver -- the guard plus the deterministic key must make
    the second run a no-op."""
    job = create_job(account_id="a-1")

    with mock.patch("app.exports.s3.multipart_writer",
                    side_effect=WorkerLost("SIGKILL")):
        with pytest.raises(WorkerLost):
            run_export(job.id)

    assert billing_spy.call_count == 0        # nothing charged yet: the
                                              # charge is AFTER the upload

    run_export(job.id)                        # redelivery
    run_export(job.id)                        # and again, for good measure

    assert billing_spy.call_count == 1
    assert billing_spy.calls[0].idempotency_key == f"export-{job.id}-fee"


def test_the_status_guard_stops_a_redelivered_message(celery_worker):
    job = create_job(status="succeeded", row_count=42)

    run_export(job.id)                        # must be a no-op

    assert reload(job).row_count == 42        # not regenerated


def test_the_same_idempotency_key_returns_the_same_job(client):
    headers = {"Idempotency-Key": "abc-123"}

    first = client.post("/exports", json=VALID, headers=headers)
    second = client.post("/exports", json=VALID, headers=headers)

    assert first.json()["id"] == second.json()["id"]
    assert ExportJobRow.query.count() == 1


def test_a_large_export_uses_constant_memory(tmp_path):
    """The bound that makes this endpoint safe for the largest account."""
    seed_orders(500_000)

    before = process_rss()
    _stream_export_to_s3("a-1", "exports/test.csv")
    after = process_rss()

    assert after - before < 100 * 1024 * 1024


def test_a_failing_webhook_does_not_fail_the_export(celery_worker):
    """The export succeeded. A dead receiver must not undo that."""
    job = create_job()

    with mock.patch("requests.post", side_effect=ConnectionError):
        run_export(job.id)

    assert reload(job).status == "succeeded"
    assert reload(job).s3_key is not None


def test_csv_values_are_escaped_and_defused():
    row = write_row(Order(description='=cmd|"/c calc"!A1, "quoted"'))

    assert row.startswith("'=")               # formula defused
    assert row.count('"') >= 2                # comma quoted, not raw`,
        notes: [
          { t: "p", text: "**The double charge is the heart of the exercise.** Moving the body to a queue makes it worse, not better: retries become automatic, so a crash between `charge()` and the status update now bills the customer repeatedly without anyone deciding to retry. Durability multiplies whatever bug it wraps." },
          { t: "p", text: "**Two independent fixes are both needed.** Charging after the artefact exists means a failure costs nothing; the deterministic `idempotency_key` means the billing provider refuses the second attempt regardless of what this process does. Either alone leaves a window." },
          { t: "p", text: "**`acks_late=True` is what makes the status guard load-bearing.** Without it a worker killed mid-task loses the message silently — the export never completes and nobody is told. With it the message returns to the queue, which is only safe because the task begins by checking whether it already ran." },
          { t: "callout", kind: "insight", title: "Why the webhook is a separate task", body: [
            { t: "p", text: "If the notification lived at the end of `run_export`, a receiver that is down would raise, the task would retry, and the retry would re-run the export — regenerating a file that was already correct and re-entering the billing path." },
            { t: "p", text: "Splitting them means the failure domains are separate: the export succeeds or fails on its own merits, and delivery retries on a schedule measured in hours without touching it." }
          ]},
          { t: "p", text: "**`yield_per` plus a multipart upload is what makes the size bound real.** The original built the entire file in a Python string before writing a byte; the rewrite holds 5MB at a time, so ten million rows costs the same memory as ten." },
          { t: "p", text: "**The formula injection is worth catching in review.** A cell beginning with `=` is executed by Excel and Sheets, so a customer-supplied product name in an export opened by an internal analyst is a genuine path to data exfiltration — and the fix is one character." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments team moved charge processing to Celery for reliability. They enabled `acks_late` correctly, so no work would be lost on a deploy. The task was not idempotent." },
      { t: "p", text: "**The next deploy killed workers mid-charge and every one of those messages was redelivered.** Two hundred customers were charged twice within a minute — a failure mode that did not exist before the reliability work, because previously a killed request simply failed and someone noticed." },
      { t: "p", text: "The fix was thirty lines: a deterministic idempotency key, a `SELECT ... FOR UPDATE` on the order, and a status check at the top of the task. **The refunds and the trust cost considerably more.**" },
      { t: "p", text: "**The lesson is the ordering.** Idempotency is a prerequisite for at-least-once delivery, not a follow-up to it — turning on durable retries before the task can tolerate them converts a visible failure into a silent duplicate." }
    ]}
  ],

  takeaways: [
    "**Work belongs in a request only if losing it to a killed process is acceptable.** That question, not the duration, is the real boundary.",
    "**`async def` with a blocking call inside is the worst option** — FastAPI trusts the declaration and stalls the event loop for every other request on the process.",
    "**A handler that only calls blocking drivers should be plain `def`**; FastAPI runs it in a bounded threadpool and the loop stays free.",
    "**A blocked event loop produces no error** — just a service-wide p99 spike with no slow route to blame. Enable loop debug in development.",
    "**`BackgroundTasks` dies with the process.** Use it for email and audit logs; never for anything you would have to explain the loss of.",
    "**Return 202 with a job resource**, plus `Location` and `Retry-After`. Polling is stateless, survives deploys on both sides, and needs no infrastructure.",
    "**Commit, then enqueue.** Enqueueing inside the transaction produces a worker that reads a row the database has not committed.",
    "**Pass ids to tasks, never objects** — a serialised object is a stale snapshot by the time the worker runs.",
    "**Idempotency is a prerequisite for `acks_late`, not a follow-up.** Durable retries multiply whatever bug the task already had.",
    "**A deterministic idempotency key is the only real defence.** `uuid4()` per attempt defeats the entire mechanism.",
    "**Retries need jitter and a dead-letter queue.** Fixed delays synchronise into a herd, and a permanently failing task must end somewhere a human looks.",
    "**Sign the timestamp with the body** in a webhook, send an event id so receivers can deduplicate, and document at-least-once delivery.",
    "**Keep the polling API working alongside webhooks**, so a receiver that was down can reconcile without asking you to replay."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An `async def` handler calls `psycopg2` directly. What happens?",
        options: [
          "FastAPI detects the blocking call and moves it to a thread",
          "The blocking call runs on the event loop, so every other request on that process waits for it, with no error raised",
          "The request fails with a RuntimeError",
          "Only that request is slow"
        ],
        answer: 1,
        why: "FastAPI trusts the declaration: `async def` runs on the loop, `def` runs in a threadpool. Blocking the loop raises nothing — latency simply rises across every endpoint on the process, including ones touching nothing, which is why it presents as a service-wide p99 spike with no slow route to blame."
      },
      {
        stem: "Why must you commit the job row before enqueueing the task, rather than the reverse?",
        options: [
          "Because Celery requires an active transaction",
          "Because a worker can pick up the message before the transaction commits, and then reads a row that does not yet exist",
          "Because the queue needs the primary key",
          "Because commits are slower than enqueues"
        ],
        answer: 1,
        why: "Workers are fast and transactions are not instantaneous. Enqueue-then-commit produces an intermittent \"job not found\" that appears only under load, and worse, a rolled-back transaction leaves a message referring to a row that will never exist."
      },
      {
        stem: "A team enables `acks_late=True` on a task that charges cards, without making it idempotent. What is the result?",
        options: [
          "Messages are lost more often",
          "A worker killed mid-task has its message redelivered, so the retry charges the customer a second time",
          "Nothing changes until max_retries is reached",
          "The broker rejects the configuration"
        ],
        answer: 1,
        why: "`acks_late` is what makes retries durable, so it converts a visible failure into an automatic duplicate. Idempotency is a prerequisite for it, not a follow-up — a deterministic idempotency key plus a status check under a row lock is the minimum before turning it on."
      },
      {
        stem: "Why pass `order.id` to a background task rather than the `order` object?",
        options: [
          "Objects cannot be serialised at all",
          "The object is serialised at enqueue time, so the worker acts on a stale snapshot rather than the current row",
          "Ids are faster to transmit",
          "Celery only accepts strings"
        ],
        answer: 1,
        why: "The gap between enqueue and execution can be seconds or hours, and the row may have changed in that window — cancelled, refunded, updated. Re-reading inside the task under a lock is the only way the task sees current state, and it is also what allows the status guard that makes retries safe."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you handle an API operation that takes several minutes?",
        strong: "Accept it and return 202 with a job resource plus a `Location` header. The work goes to a durable queue, the client polls or receives a webhook, and the task is written to be safe to re-run because the worker will be killed mid-flight.",
        answer: [
          { t: "p", text: "Naming the client-facing contract first — 202, `Location`, `Retry-After` — shows you are designing an interface rather than just moving code to a worker." },
          { t: "p", text: "The commit-then-enqueue ordering is a small detail that signals real experience, because the failure it prevents is intermittent and load-dependent." },
          { t: "p", text: "Offering polling and webhooks together, rather than choosing one, is the answer that holds up: the webhook is the optimisation and the polling endpoint is what makes recovery possible." }
        ]
      },
      {
        level: "advanced",
        q: "What makes a background task safe to retry?",
        strong: "It can run twice with the same effect as running once. That means a deterministic idempotency key at every external boundary, a state check under a row lock at the top, and side effects ordered so a crash costs nothing.",
        answer: [
          { t: "p", text: "Distinguishing the idempotency key from the database guard matters — the guard narrows the window, the key closes it, and only the key protects against two workers racing." },
          { t: "p", text: "Mentioning that `acks_late` requires idempotency first inverts the usual answer and is the point most candidates miss: durability multiplies an existing bug." },
          { t: "p", text: "Ordering side effects so the reversible ones happen first — build the artefact, then charge — is a design instinct worth stating explicitly." }
        ]
      },
      {
        level: "core",
        q: "When should a FastAPI endpoint be `async def`?",
        strong: "When it actually awaits something. If it calls blocking drivers, plain `def` is correct — FastAPI runs it in a threadpool and the event loop stays free for everyone else.",
        answer: [
          { t: "p", text: "The key insight is that `async` is a declaration FastAPI trusts, not an optimisation it applies; getting it wrong degrades every other request on the process." },
          { t: "p", text: "Noting that the threadpool is bounded shows you know `def` is a pressure valve rather than infinite capacity." },
          { t: "p", text: "`asyncio.to_thread` for one stubborn blocking call inside an otherwise async handler is the practical third option worth volunteering." }
        ]
      }
    ]
  }
});
