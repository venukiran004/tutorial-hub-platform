EC.receiveLesson({
  id: "7.3",

  lede: "Metrics tell you *that* something is wrong and are structurally unable to tell you *which* request — lesson 7.1's arithmetic is why: a per-request label would be an unbounded label, and 144 million series is what that costs. So the three signals divide by **cardinality**: metrics are cheap and aggregate, logs are per-event and searchable, traces are per-request and causal. The thing that makes them one system rather than three is a single **correlation id** threaded through all of them, and for an ML service there is a fourth consumer of that id — the prediction log of lesson 16.2, which is the only one of the four that must still be readable in forty-five days when the labels arrive.",

  objectives: [
    "Divide the three signals by cardinality and say what each can and cannot answer",
    "Thread one correlation id through logs, traces and the prediction log",
    "Decide what to log around a prediction, and what must never be logged",
    "Choose a sampling strategy that keeps the interesting requests"
  ],

  prerequisites: ["7.2"],

  blocks: [

    { t: "h2", n: "01", id: "divide", text: "The division is cardinality",
      sub: "Not a matter of taste or tooling" },

    { t: "p", text: "The three signals are usually introduced as *the three pillars*, which suggests they are alternatives. They are not — each is the only affordable way to answer a particular shape of question, and the constraint that separates them is the one lesson 7.1 measured." },

    { t: "diagram", kind: "matrix", id: "dg-7_3-01-0",
      title: "Three signals, divided by what they can afford to carry",
      caption: "Read the middle column. **A metric cannot carry a request id because that is an unbounded label — 144 million series in lesson 7.1's arithmetic** — so the question 'which request was slow' is not answerable from metrics at any price.",
      rows: ["Metrics", "Logs", "Traces"],
      cols: ["Answers", "Cannot answer"],
      cells: [
        [{ text: "is it broken, how much, since when", tone: "good" }, { text: "which request, and why", tone: "crit" }],
        [{ text: "what happened in this request", tone: "good" }, { text: "how the time was distributed", tone: "warn" }],
        [{ text: "where the time went, and what called what", tone: "good" }, { text: "aggregate rates, cheaply", tone: "warn" }]
      ] },

    { t: "p", text: "**Metrics are pre-aggregated at write time**, which is what makes them cheap enough to keep for a year and queryable in milliseconds — and is exactly why they cannot be disaggregated afterwards. The information was discarded when the counter was incremented." },

    { t: "p", text: "**Logs are per-event and retain detail**, at a storage cost proportional to traffic rather than to the number of distinct label combinations. A log line can contain a customer id, a feature vector and an error message, none of which could be a metric label." },

    { t: "p", text: "**Traces are per-request and retain causality** — the structure of which operation called which, with durations. Lesson 2.1 measured inference at 0.581 ms of a 1.936 ms request by instrumenting the handler by hand; a trace gives that decomposition per request, without a bespoke header." },

    { t: "callout", kind: "mental", title: "Metrics for alerting, traces for diagnosing, logs for explaining",
      body: [
        { t: "p", text: "The sequence in an incident is fixed by what each signal can do. A metric alert fires — the burn rate from lesson 7.4. You open a trace for one slow request and see **where** the time went. You read that request's logs and learn **why** that stage was slow." },
        { t: "p", text: "Skipping a step does not work. Metrics cannot name the request; a trace shows a slow span and not the reason; logs without a trace mean grepping for a needle without knowing the haystack. The thing that connects them is the next section." }
      ] },

    { t: "h2", n: "02", id: "correlation", text: "One id, four consumers",
      sub: "The ML-specific fourth" },

    { t: "p", text: "The three signals become one system when every record carries the same request identifier. In an OpenTelemetry setup that is the `trace_id`, propagated via the W3C `traceparent` header, and generated at the edge if the caller did not supply one." },

    { t: "code", lang: "python", title: "The id threaded through all four",
      code: `@app.post("/predict")
def predict(a: Applicant, request: Request, response: Response):
    # Accept the caller's id if there is one; otherwise mint it at the edge.
    cid = request.headers.get("x-correlation-id") or str(uuid.uuid4())
    response.headers["X-Correlation-Id"] = cid      # so the caller can quote it

    with tracer.start_as_current_span("predict") as span:
        span.set_attribute("model.version", MODEL_VERSION)
        span.set_attribute("correlation.id", cid)

        with tracer.start_as_current_span("fetch_features"): ...
        with tracer.start_as_current_span("infer"):
            p = float(model.predict_proba(X)[0, 1])

    LAT.labels(stage="total").observe(elapsed)       # 1. metrics: no id
    log.info("prediction served", extra={            # 2. logs: id present
        "correlation_id": cid, "model_version": MODEL_VERSION,
        "score": p, "latency_ms": elapsed * 1000})
    prediction_log.append({                          # 4. the prediction log
        "correlation_id": cid, "ts": now, "model_version": MODEL_VERSION,
        "features": X[0].tolist(), "score": p})      #    label joins here later
    return {"approve": p >= 0.5, "score": p, "model_version": MODEL_VERSION}` },

    { t: "p", text: "The fourth consumer is the one that does not exist outside ML, and it has a different lifetime from the other three. Logs and traces are retained for days or weeks; the **prediction log must survive until the labels arrive**, which lesson 2.2 measured at **45 days** for a loan. So it is not a log in the operational sense — it is a dataset, stored where lesson 16.2 puts it, and the correlation id is what lets an operational investigation and a retrospective accuracy computation refer to the same prediction." },

    { t: "callout", kind: "good", title: "Return the correlation id to the caller",
      body: [
        { t: "p", text: "The `X-Correlation-Id` response header is what makes a support report actionable. *The model declined my application at 14:32* is an hour of searching; *correlation id 7f3a…* is one query against logs, one trace, and one row of the prediction log." },
        { t: "p", text: "It also propagates the right way round: accept the caller's id if present so a trace spans services, and mint one at the edge if not, so there is never a request without an identifier." }
      ] },

    { t: "h2", n: "03", id: "structured", text: "Structured logs, and the three levels that mean something",
      sub: "A log line is a record, not a sentence" },

    { t: "p", text: "A log line that has to be parsed with a regular expression is a log line that will be parsed differently by three tools. JSON per line, one event per line, fields rather than interpolation." },

    { t: "code", lang: "python", title: "The difference",
      code: `# unqueryable: the model version and the score are inside prose
log.info(f"served prediction {p:.3f} for {cid} using {MODEL_VERSION} in {ms}ms")

# queryable: score > 0.9 AND model_version = "..." is a filter, not a regex
log.info("prediction served", extra={"correlation_id": cid,
         "model_version": MODEL_VERSION, "score": p, "latency_ms": ms})` },

    { t: "p", text: "And levels, which are routinely used as a vague severity gradient when they should answer one question: **does somebody need to do something?**" },

    { t: "dl", items: [
      { k: "ERROR — a human must act", v: "The request failed and the cause is not self-correcting. If an ERROR fires a thousand times a day and nobody acts, it is not an ERROR, and its presence has trained everyone to ignore the level." },
      { k: "WARN — the system handled it, and the frequency matters", v: "A retry succeeded, a fallback was used, a feature was imputed because the fetch failed. Nothing to do now; a rising rate is a signal — and lesson 3.1 made the same point about a retry count surviving into the log." },
      { k: "INFO — the record of what happened", v: "One line per request, structured. This is the operational narrative and it is what you read after a trace identifies the request." },
      { k: "DEBUG — off in production, and on for one request", v: "Not a global switch. Enabled per correlation id or per sampled trace, which is what makes it usable at all at volume." }
    ] },

    { t: "callout", kind: "trap", title: "The feature vector is the thing you most want and most must not log",
      body: [
        { t: "p", text: "A model's inputs are usually personal data — income, debt ratio, credit score, in this course's case. Logging them raw puts a copy of your most sensitive dataset into a log store with weeks of retention, broad read access, and a different compliance posture from your warehouse." },
        { t: "p", text: "The split that works: **operational logs get identifiers and derived values** — the correlation id, the model version, the score, the latency. The **feature values go to the prediction log**, which is a governed dataset with access control, a retention policy and, where required, pseudonymisation. Lesson 16.2 specifies it. Logging a raw feature vector at INFO is the commonest serious privacy mistake in ML serving, and it is invisible because the system works perfectly." }
      ] },

    { t: "h2", n: "04", id: "traces", text: "Spans, and what to make one of",
      sub: "The decomposition from lesson 2.1, for free" },

    { t: "p", text: "A span is a timed operation with a name, a parent and attributes. A trace is the tree of spans for one request. The useful discipline is choosing boundaries that correspond to things you might fix." },

    { t: "p", text: "For the service measured in lesson 2.1, the spans are the stages whose costs that lesson had to instrument by hand: deserialize and validate, fetch features, transform, infer, serialize. Its finding — **inference at 0.581 ms of 1.936 ms, thirty percent** — is exactly what a trace shows per request, and lesson 12.1's whole triage is reading that decomposition." },

    { t: "p", text: "Two span attributes are worth setting on every ML trace: **`model.version`**, so a canary's traces are separable (lesson 3.3), and **a cache hit flag** where there is a cache, because a hit and a miss are different distributions and a mean across both is meaningless — lesson 12.3's measurement depends on the distinction." },

    { t: "p", text: "What *not* to make a span: anything sub-microsecond, and anything in a loop over features. A span has overhead and a trace with four thousand spans is unreadable and expensive. Instrument the stages, not the statements." },

    { t: "h2", n: "05", id: "sampling", text: "Sampling, and keeping the interesting ones",
      sub: "Head-based is cheap and throws away the incident" },

    { t: "p", text: "Tracing every request at lesson 2.2's twenty requests a second is 1.7 million traces a day, which nobody keeps. So you sample, and the choice of mechanism decides whether you keep the requests you will want." },

    { t: "p", text: "**Head-based sampling** decides at the start of the request — keep 1%, discard the rest. It is cheap, it is decided before anything is known, and it therefore keeps a representative sample of the **ordinary** requests. The 1-in-100 chance that the one pathological request was sampled is exactly the problem." },

    { t: "p", text: "**Tail-based sampling** buffers the spans and decides once the request is finished, when its duration and outcome are known: keep everything slow, everything that errored, and 1% of the rest. That keeps the traces an incident needs, at the cost of a collector that holds spans in memory until each trace completes." },

    { t: "diagram", kind: "steps", id: "dg-7_3-05-0",
      title: "A sampling policy that keeps what matters",
      caption: "**The first two rules are the whole value** — they are a small fraction of traffic and they are the only traces anyone opens during an incident. The baseline exists to make the common case comparable.",
      items: [
        { label: "Keep every error and every request over the SLO", desc: "Tail-based: decided after the fact. These are a small share of traffic and they are what you look at." },
        { label: "Keep every request for a canary model version", desc: "A new version is a tiny traffic share, so a flat 1% keeps almost none of the traces you need." },
        { label: "Keep 1% of the rest, as a baseline", desc: "Without it you cannot tell whether a slow trace is unusual, since you kept only the slow ones." },
        { label: "Keep the metric for everything", desc: "Sampling applies to traces and logs, never to metrics: the histogram counts all 20,000 requests regardless." }
      ] },

    { t: "callout", kind: "insight", title: "Never sample metrics, and never compute rates from sampled logs",
      body: [
        { t: "p", text: "The last row is the one that gets confused. Metrics are already aggregated, so they cost nothing extra per request and must count every one — that is what makes lesson 7.2's p99 trustworthy and lesson 7.4's burn rate exact." },
        { t: "p", text: "The corresponding mistake is computing an error rate by counting log lines when logs are sampled, which produces a rate that is wrong by the sampling factor and silently varies if the sampling is adaptive. Rates come from counters; logs explain individual events." }
      ] },

    { t: "exercise", kind: "practice", title: "Trace one prediction end to end", difficulty: "core", minutes: 30,
      prompt: "Take one prediction request in a service you run and establish whether you could reconstruct it. Does the response carry a correlation id the caller can quote? Given that id, can you find the request's logs, its trace, and its row in the prediction log — and is the id identical in all three, or does each system have its own? Then check two things about the logs: are they structured JSON with the model version and score as fields, and is any raw feature value present at INFO. Finally, check your trace sampling: is it head-based at a flat percentage, and if so, work out what fraction of your last incident's slow requests you would have retained.",
      hints: [
        "Three different ids in three systems is the common finding, and it means every investigation starts with a timestamp-and-guess join.",
        "Grep your log output for a feature name — if income or a credit score appears at INFO, that is a copy of your sensitive dataset in a log store.",
        "At 1% head-based sampling you kept roughly 1% of the incident's slow traces, which is usually a handful or none."
      ],
      solution: {
        body: [
          { t: "p", text: "The usual finding is that the three signals exist and share no identifier, so investigations proceed by timestamp correlation — which works until two requests arrive in the same second. Adopting one id, generated at the edge and returned to the caller, is a small change that removes a whole class of investigative friction." },
          { t: "p", text: "The feature-logging check is the one worth acting on immediately if it finds something. The fix is not to stop recording features — lesson 16.2 needs them — but to move them to a governed prediction log with its own retention and access control, leaving identifiers and derived values in the operational log." }
        ]
      } }

  ],

  takeaways: [
    "**The three signals divide by cardinality**, not by taste: a metric cannot carry a request id because that is an unbounded label, which lesson 7.1 measured at 144 million series.",
    "**Metrics are aggregated at write time**, which makes them cheap and queryable and means the per-request information is gone for ever.",
    "**Metrics for alerting, traces for diagnosing, logs for explaining** — and the sequence is fixed, because metrics cannot name the request and a trace cannot say why.",
    "**One correlation id, generated at the edge if the caller did not supply one**, and returned in the response so a support report becomes one query instead of an hour.",
    "**ML has a fourth consumer of that id with a different lifetime**: the prediction log, which must survive until labels arrive — 45 days in lesson 2.2's case.",
    "**Structured JSON with fields, not interpolated prose**, so `score > 0.9 AND model_version = …` is a filter rather than a regular expression.",
    "**Levels answer one question — does somebody need to act?** An ERROR nobody acts on has trained everyone to ignore the level.",
    "**DEBUG is enabled per correlation id or per sampled trace**, never as a global switch at production volume.",
    "**Never log a raw feature vector at INFO.** It puts your most sensitive dataset in a log store with broad access and weeks of retention; features belong in the governed prediction log.",
    "**Spans are the stages you might fix** — deserialize, fetch, transform, infer, serialize — which is lesson 2.1's 30% decomposition per request, for free.",
    "**Set `model.version` and a cache-hit flag on every ML span**: the first separates a canary's traces, the second because hit and miss are different distributions.",
    "**Head-based sampling keeps a representative sample of the ordinary requests**, which is the opposite of what an incident needs.",
    "**Tail-based: keep every error, everything over the SLO, every canary request, and 1% as a baseline** — and never sample metrics, nor compute a rate from sampled logs."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your p99 latency alert fires. Why can metrics not tell you which requests were slow?",
        options: [
          "They can, by querying the histogram for observations above the threshold",
          "Metrics are aggregated at write time and a request id would be an unbounded label — lesson 7.1's arithmetic put one such label at 144 million series, so the information is discarded by construction",
          "They can, provided the scrape interval is short enough"
        ],
        answer: 1,
        why: "A histogram bucket knows how many observations exceeded a boundary, never which ones. That is the cardinality division: metrics answer how much and since when, traces answer which request and where the time went, logs answer why."
      },
      {
        stem: "You sample 1% of traces head-based. An incident produces 400 slow requests. Roughly how many of their traces do you have?",
        options: [
          "All 400, because slow requests are retained preferentially",
          "About 4 — head-based sampling decides before the outcome is known, so it keeps a representative sample of ordinary requests rather than the interesting ones",
          "None, because sampling excludes requests that exceed the latency budget"
        ],
        answer: 1,
        why: "This is the argument for tail-based sampling: buffer the spans and decide once duration and outcome are known, keeping every error, everything over the SLO, every canary request, and 1% as a baseline for comparison."
      },
      {
        stem: "Where should a prediction's feature values be recorded?",
        options: [
          "In the operational log at INFO, alongside the correlation id and score",
          "In the prediction log — a governed dataset with its own access control and retention — while the operational log carries only identifiers and derived values",
          "As metric labels, so distributions can be monitored directly"
        ],
        answer: 1,
        why: "Features are usually personal data, and an operational log store has broad read access and a different compliance posture from a warehouse. The third option is lesson 7.1's per-feature cardinality trap. The prediction log also has a longer lifetime, since labels arrive weeks later."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between metrics, logs and traces?",
        strong: "They divide by cardinality rather than by preference. Metrics are aggregated at write time, which makes them cheap enough to keep for a year and queryable in milliseconds, and means they cannot carry anything per-request — a request id as a label would be unbounded, and I have computed one such label at 144 million series. Logs are per-event, so they can hold a customer id, an error message, a score. Traces are per-request and retain causality, so they show where the time went. The practical consequence is a fixed sequence in an incident: a metric alert tells you something is wrong, a trace tells you which stage was slow for a specific request, and that request's logs tell you why. And they are one system only if a single correlation id runs through all three, generated at the edge and returned to the caller.",
        answer: [
          { t: "p", text: "Framing the division as cardinality rather than as three pillars is what makes the answer explanatory, and the 144-million figure makes the constraint concrete." },
          { t: "p", text: "The incident sequence is the practical payoff and shows the three are used together rather than chosen between." }
        ]
      },
      {
        level: "senior",
        q: "What would you log around a prediction, and what would you not?",
        strong: "In the operational log: the correlation id, the model version, the score, the latency with its stage breakdown, and the outcome — structured JSON with fields, so a filter on score and version is a query rather than a regex. What I would not put there is the feature vector. A model's inputs are usually personal data, and an operational log store has weeks of retention, broad read access and a different compliance posture from a warehouse, so logging income and a credit score at INFO puts a copy of your most sensitive dataset somewhere it was never governed. The features go to the prediction log instead, which is a different artifact with a different lifetime — it has to survive until the labels arrive, which in a lending case I measured was forty-five days, because that is when accuracy becomes computable. The correlation id is what lets an operational investigation and a retrospective accuracy computation refer to the same prediction.",
        answer: [
          { t: "p", text: "Separating the operational log from the prediction log by governance and lifetime is the senior distinction, and it is the right answer to a question that sounds like it is about logging practice." },
          { t: "p", text: "Naming the feature vector as the specific privacy hazard is valuable because the system works perfectly while it is happening, so nothing surfaces it." }
        ]
      }
    ]
  }
});
