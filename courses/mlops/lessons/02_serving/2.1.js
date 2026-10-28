EC.receiveLesson({
  id: "2.1",

  lede: "Four serving patterns, and a real FastAPI service to measure them with — started under uvicorn, hit over HTTP with httpx. The headline is the breakdown: in a warm online request of **1.936 ms**, the model accounts for **0.581 ms, thirty percent**, and the other seventy is HTTP, validation and JSON. The same thousand predictions take **2.109 s** one request at a time, **0.036 s** batched a hundred at a time (**59x**) and **0.002 s** with no HTTP at all (**857x**). And the first request after boot costs **23.04 ms against a warm p50 of 1.94** — a twelvefold cold start that no amount of model optimisation touches.",

  objectives: [
    "Choose between online, batch, streaming and embedded serving from the latency and freshness requirement",
    "Decompose a request's latency into model time and everything else, and say which dominates",
    "Quantify what batching buys and when it is unavailable",
    "List the three things a prediction response must carry for an incident to be traceable"
  ],

  prerequisites: ["1.5"],

  blocks: [

    { t: "h2", n: "01", id: "four", text: "Four patterns, one question each",
      sub: "The tool is downstream of the requirement" },

    { t: "p", text: "Serving is usually discussed as a choice between tools — TorchServe or BentoML or a FastAPI container or SageMaker endpoints. That is the last decision, not the first. The first decision is which of four shapes the problem has, and it is settled by two numbers: **how fresh the prediction has to be, and how long the caller is willing to wait**." },

    { t: "dl", items: [
      { k: "Online", v: "A caller is waiting. The prediction is for one entity, now, and the latency budget is a user's patience — tens to low hundreds of milliseconds. This is the only pattern where the tail latency of lesson 12.2 is a product problem." },
      { k: "Batch", v: "Nobody is waiting. Score every customer nightly and write the results to a table, so the read path is a lookup. The budget is a window, not a request, and throughput is the only thing that matters." },
      { k: "Streaming", v: "An event arrives and a prediction has to follow within seconds, but no human is blocked. A fraud score on a transaction, a ranking refresh. The pattern is a consumer, not a server." },
      { k: "Embedded", v: "The model runs inside the calling process — in the app, in the browser, on the device. No network, no serving infrastructure, and no way to roll back without shipping a release." }
    ] },

    { t: "callout", kind: "mental", title: "Batch where you can, online where you must",
      body: [
        { t: "p", text: "Online serving costs you an endpoint, an autoscaler, a latency SLO, a cold-start problem and a pager rotation. Batch costs you a cron entry and a table." },
        { t: "p", text: "So the question to ask of any online requirement is **what would break if this were computed last night?** Often the honest answer is nothing: a churn score, a customer segment and a recommendation shelf are all perfectly serviceable a few hours stale. The cases that genuinely need online are the ones where the input did not exist until now — a transaction to score, a search query, a form the user just filled in." }
      ] },

    { t: "diagram", kind: "matrix", id: "dg-2_1-01-0",
      title: "The four patterns against the two questions that decide them",
      caption: "The pattern falls out of the two columns; the tool comes afterwards. **The expensive mistake is serving online what could have been batched**, because you buy the entire operational surface of an endpoint to deliver a number that could have been a lookup.",
      rows: ["Online", "Batch", "Streaming", "Embedded"],
      cols: ["Is someone waiting?", "Must the input be fresh?"],
      cells: [
        [{ text: "yes, tens of ms", tone: "crit" }, { text: "yes, it just arrived", tone: "crit" }],
        [{ text: "no, a nightly window", tone: "good" }, { text: "no, hours-stale is fine", tone: "good" }],
        [{ text: "no, but seconds matter", tone: "warn" }, { text: "yes, event-driven", tone: "crit" }],
        [{ text: "yes, and no network", tone: "crit" }, { text: "model is stale by release", tone: "warn" }]
      ] },

    { t: "h2", n: "02", id: "service", text: "A real endpoint",
      sub: "And the three things its response has to carry" },

    { t: "p", text: "Here is the service the rest of the lesson measures. It is deliberately ordinary: FastAPI, a pydantic model for the request, the loan classifier from module 1 loaded once at import." },

    { t: "code", lang: "python", title: "serve_app.py — the endpoint, with the headers that matter",
      code: `MODEL_VERSION = "loan-approval:4d8e8c10a2bb"
model, _, _ = common.train_model()

@app.post("/predict")
def predict(a: Applicant, response: Response):
    t0 = time.perf_counter()
    X = np.array([[a.income, a.dti, a.credit_score, a.tenure]])
    p = float(model.predict_proba(X)[0, 1])
    infer_us = (time.perf_counter() - t0) * 1e6
    # Three things every prediction response should carry.
    response.headers["X-Model-Version"] = MODEL_VERSION
    response.headers["X-Infer-Us"] = "%.1f" % infer_us
    return {"approve": bool(p >= 0.5), "score": p,
            "model_version": MODEL_VERSION}

@app.get("/healthz")
def healthz():
    return {"ok": True, "model_version": MODEL_VERSION}`,
      out: `== starting the service ==
  uvicorn ready after 2.82 s (model trained at import)
  healthz: {'ok': True, 'model_version': 'loan-approval:4d8e8c10a2bb'}` },

    { t: "p", text: "Three details in that handler are not decoration, and each one is a lesson later in the course." },

    { t: "p", text: "**The response carries the model version**, as both a header and a field. This is the answer to lesson 15.1's question — *which model is running* — and it has to be emitted at prediction time, because afterwards nobody can reconstruct it. The id is the `run_id` from lesson 1.2, which means a single prediction traces back to params, metrics and the three fingerprints." },

    { t: "p", text: "**It returns the score, not only the decision.** `approve: true` is unloggable: you cannot compute a calibration curve, a threshold change or an AUC from booleans. The probability costs nothing extra and is what makes the prediction log of lesson 16.2 useful." },

    { t: "p", text: "**It separates its own inference time from the request time**, which is what makes the next section possible at all. Without `X-Infer-Us` you can measure that a request took 2 ms and have no idea whether the model or the framework owns it." },

    { t: "callout", kind: "trap", title: "A health check that does not touch the model is a lie",
      body: [
        { t: "p", text: "`/healthz` above returns the model version, which means it can only answer once the model is loaded. A health check that returns `{\"ok\": true}` from a handler that never touches the model will pass while the model is still loading, or has failed to load, or was replaced by a corrupt file." },
        { t: "p", text: "In Kubernetes that distinction is what readiness is for — lesson 5.2 — because a pod that reports ready before its model is loaded gets traffic it cannot serve, and the result is the cold-start tail measured below arriving on real users." }
      ] },

    { t: "h2", n: "03", id: "breakdown", text: "Where the time actually goes",
      sub: "The model is thirty percent of it" },

    { t: "p", text: "Five hundred warm requests, one applicant each, measured end to end by the client and internally by the handler." },

    { t: "code", lang: "python", title: "m21.py — the warm request, decomposed",
      out: `== the first request against the steady state ==
  first request           23.04 ms   (model inference 1879 us)
  warm p50                 1.94 ms
  warm p99                 3.08 ms
  first / warm p50         11.9x

== where an online request's time goes ==
  end to end, p50                     1.936 ms   100.0%
  model inference only, p50           0.581 ms    30.0%
  HTTP + validation + JSON, p50       1.356 ms    70.0%` },

    { t: "p", text: "**Thirty percent.** The gradient-boosted ensemble — forty-four trees, the thing everyone would optimise first — accounts for less than a third of the request. The other 1.356 ms is the socket, the ASGI plumbing, pydantic validating four floats, and JSON encoding a three-field response." },

    { t: "p", text: "This is the single most useful measurement in serving, and it is the one teams skip. A quantisation project that halves inference time on this service buys **15% end to end**, and it takes a week. The framework overhead is the larger term and nobody looks at it, because the model is the interesting part." },

    { t: "callout", kind: "insight", title: "Measure the split before you choose an optimisation",
      body: [
        { t: "p", text: "The ratio is not a property of ML; it is a property of this model and this payload. A four-feature tree ensemble is 0.58 ms and the framework is fixed-cost, so the framework dominates. A transformer at 80 ms inverts it completely, and then quantisation is exactly the right move." },
        { t: "p", text: "Which is why lesson 12.1 insists on the stage-by-stage breakdown before anything is tuned, and lesson 12.4 puts model compression *last* on the optimisation ladder. One `X-Infer-Us` header turns the argument into a number." }
      ] },

    { t: "p", text: "Then the cold start, which is a different animal: **23.04 ms against a warm p50 of 1.94 ms, nearly twelve times**, and the handler reports 1,879 us of its own — so even the model's first call is three times its steady-state cost. First-call overhead is lazy allocation, branch prediction, page faults and caches that have not been touched. It is not something you optimise away; it is something you **arrange never to be on the user's path**, which is what a warm-up request in a readiness probe is for." },

    { t: "h2", n: "04", id: "batch", text: "What batching buys",
      sub: "Fifty-nine times, and why you often cannot have it" },

    { t: "p", text: "The same thousand predictions, four ways: one per request, a hundred per request, all thousand in one request, and in-process with no HTTP at all." },

    { t: "code", lang: "python", title: "m21.py — a thousand predictions, four ways",
      out: `== 1000 predictions, four ways ==
  online, 1 row per request               2.109 s       474.2 pred/s     2.109 ms each
  batched, 100 rows per request           0.036 s     27807.3 pred/s     0.036 ms each
  batched, 1000 rows in one request       0.011 s     88678.4 pred/s     0.011 ms each
  in-process, no HTTP at all              0.002 s    406190.3 pred/s     0.002 ms each

  batching 100 is 59x the throughput of one-at-a-time
  skipping HTTP entirely is 857x` },

    { t: "p", text: "**474 predictions per second online, 27,807 batched at a hundred.** The amortisation is almost entirely the fixed per-request cost disappearing: the 1.356 ms of framework overhead is paid once per *request*, not once per *row*, so a hundred rows per request divides it by a hundred. The model itself also vectorises, which is why the in-process figure reaches 406,190." },

    { t: "diagram", kind: "steps", id: "dg-2_1-04-0",
      title: "Why the same model is 857x faster with no HTTP",
      caption: "Each step removes a fixed cost paid per request rather than per row. **The model is the one term that does not change** — which is why throughput work is mostly about amortising everything around it.",
      items: [
        { label: "474/s: one row per request", desc: "Full framework cost per prediction: socket, ASGI, validation, JSON. 2.109 ms each, of which 0.58 ms is the model." },
        { label: "27,807/s: 100 rows per request", desc: "Fixed cost divided by 100, and the model vectorises over the batch. 59x, for a change to the client." },
        { label: "88,678/s: 1000 rows per request", desc: "Diminishing: the fixed cost is already amortised away, so only vectorisation remains to win." },
        { label: "406,190/s: in-process", desc: "No serialization and no network. The ceiling, and what a batch job or an embedded model actually gets." }
      ] },

    { t: "p", text: "Two honest qualifications, because *just batch it* is not available as often as the numbers suggest." },

    { t: "p", text: "**An online caller has one entity.** A loan application is one applicant; there is no batch to form. The server can create one artificially by holding requests for a few milliseconds and grouping them — dynamic batching, measured in lesson 12.3 — but that trades latency for throughput and is only worth it when the model is the dominant cost, which here it is not." },

    { t: "p", text: "**The 857x is not available to an online service at all.** It is the number a *batch job* gets, and the reason the nightly-scoring pattern is so much cheaper per prediction than the endpoint. It belongs in the comparison because it is the size of the prize for moving a workload out of the request path." },

    { t: "h2", n: "05", id: "choose", text: "Choosing, and the operational cost",
      sub: "What each pattern commits you to" },

    { t: "p", text: "The patterns differ less in code than in what they oblige you to run. That is the comparison worth having before an endpoint exists." },

    { t: "table",
      head: ["Pattern", "Measured here", "What it commits you to"],
      rows: [
        ["Online", "474 pred/s, p50 1.94 ms, p99 3.08 ms, cold start 11.9x", "An autoscaler, a latency SLO, readiness probes, a warm pool, and a pager rotation."],
        ["Batch", "406,190 pred/s in-process", "A scheduler and a table. Staleness bounded by the schedule; no tail latency at all."],
        ["Streaming", "between the two; per-event overhead like online", "A consumer, offset management, and a replay story when the model changes."],
        ["Embedded", "no network cost, no rollback", "Shipping a release to change the model, and no server-side observability."]
      ] },

    { t: "callout", kind: "tradeoff", title: "Batch has a hidden advantage: it is auditable before it is used",
      body: [
        { t: "p", text: "A nightly batch writes a table, and a table can be validated before anything reads it. The distribution checks from lesson 1.5 and the volume assertion can gate the *publish*, so a bad scoring run never reaches a consumer." },
        { t: "p", text: "An online endpoint has no such gate: the prediction is consumed at the instant it is made. Every protection has to be in the request path, paying latency, which is why guardrails are a budget problem in lesson 19.5 and why the rollout strategies of lesson 3.3 matter so much more for online than for batch." }
      ] },

    { t: "exercise", kind: "practice", title: "Decompose and challenge your own endpoint", difficulty: "core", minutes: 30,
      prompt: "Take an online model endpoint you run and do two things. First, add a header reporting the handler's own inference time, hit it five hundred times warm, and compute the ratio of model time to end-to-end p50 — then say which half an optimisation should target. Second, ask of the endpoint what would break if this prediction were computed nightly instead, and answer concretely rather than defensively: name the input that does not exist until request time. If you cannot name one, you have found a batch job wearing an endpoint's operational costs. Finally, measure your own cold start by restarting the service and timing the first request.",
      hints: [
        "Measure the first request separately and discard it from the warm percentiles, or the cold start contaminates your p99.",
        "If the model is under about a millisecond, framework overhead almost certainly dominates and quantisation is the wrong project.",
        "'The user expects it to be live' is not an input that fails to exist until request time."
      ],
      solution: {
        body: [
          { t: "p", text: "The usual finding is the one measured here: the model is a minority of the request, often a small one, and the team's planned optimisation was aimed at the minority. The header is a permanent fix for that — it turns the question from an argument into a dashboard panel." },
          { t: "p", text: "The second question has a real answer surprisingly often. Scores recomputed per request for entities whose features change daily are the commonest case, and moving them to a nightly table removes an autoscaler, an SLO and a pager rotation at once." }
        ]
      } }

  ],

  takeaways: [
    "**Four patterns, decided by two questions**: is someone waiting, and must the input be fresh. The tool choice comes after, not before.",
    "**Inference was 0.581 ms of a 1.936 ms warm request — thirty percent.** HTTP, pydantic validation and JSON were the other seventy.",
    "**Halving this model's inference time would buy 15% end to end**, which is why lesson 12.4 puts compression last on the optimisation ladder.",
    "**The ratio is not a law.** Four features and forty-four trees make the framework dominant; a transformer at 80 ms inverts it, and then quantisation is correct.",
    "**Cold start was 23.04 ms against a warm p50 of 1.94 ms, 11.9x**, with the handler's own first inference at 1,879 us — three times its steady state.",
    "**A cold start is arranged off the user's path, not optimised away** — a warm-up call in the readiness probe, which is lesson 5.2's gate.",
    "**474 predictions/second online, 27,807 batched at 100 per request: 59x**, almost entirely the per-request fixed cost being amortised.",
    "**In-process with no HTTP reached 406,190/s, 857x** — that is the batch pattern's number and the size of the prize for leaving the request path.",
    "**An online caller usually has one entity**, so batching must be manufactured by the server (dynamic batching, lesson 12.3) at the cost of latency.",
    "**Emit the model version on every response**, as the run_id from 1.2, or lesson 15.1's question has no answer after the fact.",
    "**Return the score, not just the decision.** Booleans cannot produce a calibration curve, a threshold change or a retrospective AUC.",
    "**A health check that never touches the model will pass while the model is missing**, and in Kubernetes that sends traffic to a pod that cannot serve it.",
    "**Batch can be validated before it is read**; an online prediction is consumed as it is made, so every protection costs latency."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your endpoint's p50 is 1.9 ms and the model takes 0.58 ms of it. A team proposes quantising the model to halve inference time. What is the end-to-end gain?",
        options: [
          "About 50%, since inference is the dominant cost",
          "About 15% — the model is 30% of the request, so halving it removes 15% of the total",
          "None, because quantisation does not affect latency"
        ],
        answer: 1,
        why: "Thirty percent of the request halved is fifteen percent of the whole. The 1.356 ms of HTTP, validation and JSON is the larger term and is untouched by anything done to the model. Measure the split before choosing the optimisation."
      },
      {
        stem: "Why does batching 100 rows per request give 59x the throughput of one row per request?",
        options: [
          "The model is 59x faster on batches due to vectorisation",
          "The per-request fixed cost — socket, ASGI, validation, JSON — is paid once per request rather than once per row, so it divides by 100; vectorisation adds to that",
          "The network transfers 100 rows in the same time as one"
        ],
        answer: 1,
        why: "Amortisation of fixed cost is the dominant term: 1.356 ms per request becomes 0.0136 ms per row. Vectorisation contributes too — the in-process figure reaches 406,190/s — but the step from 474 to 27,807 is mostly overhead being divided."
      },
      {
        stem: "A readiness probe returns {\"ok\": true} without touching the model. What goes wrong in Kubernetes?",
        options: [
          "Nothing; the probe correctly reports that the process is alive",
          "The pod reports ready before the model is loaded, so it receives traffic it cannot serve — and the 11.9x cold start lands on real users",
          "The probe will time out during model loading and the pod will be restarted"
        ],
        answer: 1,
        why: "Liveness asks whether the process should be killed; readiness asks whether it should receive traffic, and those are different questions. A probe that returns the model version can only answer once the model is loaded, which is what makes it a real gate."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How would you serve a model?",
        strong: "I would start from two questions rather than a tool: is a caller waiting, and does the input exist before the request. If nothing is waiting and the features change daily, it is a batch job that writes a table, and that avoids an autoscaler, a latency SLO, readiness probes and a pager rotation. Online is for inputs that did not exist until now — a transaction, a query, a submitted form. Then I would instrument the handler to report its own inference time separately from the request, because when I measured this the model was 0.58 ms of a 1.94 ms request, thirty percent, and the framework was the rest. That ratio decides what is worth optimising.",
        answer: [
          { t: "p", text: "Leading with the requirement rather than the stack is the whole answer, and 'what would break if this were computed nightly' is the question that most reliably finds an endpoint that should not exist." },
          { t: "p", text: "The 30/70 split is the detail that signals measurement rather than recall, and it sets up a good follow-up about where optimisation effort goes." }
        ]
      },
      {
        level: "senior",
        q: "Your p99 is much worse than your p50 on a new endpoint. Where do you look first?",
        strong: "First I separate the first-request cost from the steady state, because they are different problems with different fixes. I measured a cold start at 23 ms against a warm p50 of 1.94, nearly twelve times, with the handler's own first inference three times its steady-state value — lazy allocation and cold caches. If the tail is cold starts, the fix is not optimisation, it is keeping them off the user's path: a warm-up call inside the readiness probe, a warm pool, and a minimum replica count so scale-to-zero never serves a user. If the tail survives warm-up, then it is queueing or contention rather than the model, and the distinguishing measurement is whether the tail grows with concurrency — which is lesson territory on utilisation.",
        answer: [
          { t: "p", text: "Separating cold start from queueing before proposing a fix is the senior move; they look identical on a latency dashboard and need opposite responses." },
          { t: "p", text: "Naming the readiness-probe warm-up as the fix is concrete and shows the Kubernetes mechanism is understood rather than just named." }
        ]
      },
      {
        level: "senior",
        q: "What should a prediction response contain?",
        strong: "The decision, the score behind it, and the model version — plus a correlation id if the caller does not supply one. The version matters because it is the only moment at which the question 'which model produced this' is cheaply answerable; afterwards it cannot be reconstructed, and I would use the training run id so a single prediction traces back to params, data hash and environment. The score rather than just the boolean, because you cannot compute a calibration curve, re-threshold, or recover an AUC from booleans once the labels arrive. I would also have the handler report its own inference time as a header, so latency can be attributed between the model and the framework without guessing.",
        answer: [
          { t: "p", text: "The version-plus-score pair is the answer; most candidates give one. Tying the version to the training run id connects serving to provenance, which is the thing that makes an incident diagnosable." },
          { t: "p", text: "Mentioning what you cannot do later with only booleans is the argument that lands, because it is a cost paid at log-join time rather than at serving time." }
        ]
      }
    ]
  }
});
