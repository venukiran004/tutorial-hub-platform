EC.receiveLesson({
  id: "7.1",

  lede: "Prometheus **pulls**, and that single choice explains most of its behaviour — including why a training Job is invisible to it and needs a different mechanism entirely. The four metric types answer four different questions, and picking wrongly is unrecoverable after the fact: a Summary's quantiles **cannot be aggregated across replicas**, which lesson 7.2 measures costing 46%. Then the failure that takes a monitoring system down rather than a service: cardinality is the **product** of a metric's label values, so five modest labels on this course's endpoint produce **2,880 time series**, and adding a `customer_id` label with 50,000 values produces **144 million**.",

  objectives: [
    "Explain the pull model and what it implies for short-lived jobs",
    "Choose between counter, gauge, histogram and summary from the question being asked",
    "Expose a metrics endpoint from a model service and name what belongs on it",
    "Compute a metric's cardinality and recognise an unbounded label"
  ],

  prerequisites: ["6.4"],

  blocks: [

    { t: "h2", n: "01", id: "pull", text: "Pull, and what it costs",
      sub: "The design decision everything follows from" },

    { t: "p", text: "Prometheus does not receive metrics; it **scrapes** them. Each target exposes a plain-text endpoint, usually `/metrics`, and the server fetches it on an interval — fifteen seconds is the usual default." },

    { t: "p", text: "Three consequences are worth having straight." },

    { t: "p", text: "**Service discovery replaces configuration.** Prometheus asks Kubernetes what pods exist and scrapes them, so a new replica is monitored without anybody registering it. That is lesson 5.1's control loop again: the list of targets is derived, not declared." },

    { t: "p", text: "**A target that is down is observable as a fact.** The synthetic `up` metric is 0 for a target that failed to scrape — you learn that a pod is unreachable because the scrape failed, not because it stopped reporting. Under a push model, silence is ambiguous: a healthy idle service and a crashed one both send nothing." },

    { t: "p", text: "**A process that exits between scrapes is invisible.** This is the one that matters for ML, and it has no fix within the pull model." },

    { t: "callout", kind: "trap", title: "A training Job cannot be scraped",
      body: [
        { t: "p", text: "Lesson 5.2 established that a training run is a Job: it starts, works, and exits. If it runs for four minutes with a fifteen-second scrape interval it might be scraped sixteen times — or zero, if it finishes before discovery notices it. Either way its **final** values, the ones you actually want, are gone the moment the pod terminates." },
        { t: "p", text: "The answer is a **Pushgateway**: the job pushes its final metrics to a long-lived service that Prometheus scrapes. It is the explicit exception to the pull model and it is for exactly this case. It is also widely misused — pushing *service* metrics to it loses the `up` signal and makes staleness indistinguishable from a steady value, which is why the documentation warns against it." }
      ] },

    { t: "h2", n: "02", id: "types", text: "Four types, four questions",
      sub: "And one choice that cannot be undone later" },

    { t: "dl", items: [
      { k: "Counter — how many, ever", v: "Monotonically increasing. You never read its value; you read `rate()` over it. Monotonicity is what lets a scrape be missed without corrupting the series, and what lets a restart be detected as a reset." },
      { k: "Gauge — what is it now", v: "Goes up and down. In-flight requests, queue depth, memory. A gauge sampled every fifteen seconds misses everything between samples, which is why it is wrong for latency." },
      { k: "Histogram — how is it distributed", v: "Counts observations into cumulative buckets. Quantiles are computed at query time from the buckets, which is what makes them **aggregatable across replicas**." },
      { k: "Summary — count and sum, and client-side quantiles", v: "Cheaper, and its quantiles are computed in the process. Which means they cannot be combined across instances — the error lesson 7.2 measures." }
    ] },

    { t: "p", text: "The histogram-versus-summary choice is the one to get right, because it is **not reversible without re-instrumenting and losing history**. A summary's quantiles are per-process numbers; there is no mathematical operation that combines three processes' p99s into the fleet's p99. A histogram's buckets add." },

    { t: "code", lang: "python", title: "m7.py — all four, on a real registry",
      code: `reqs = Counter("predict_requests_total", "Predictions served",
               ["model_version", "outcome"], registry=reg)
inflight = Gauge("predict_inflight", "Requests in flight", registry=reg)
lat = Histogram("predict_latency_seconds", "End-to-end latency",
                buckets=(0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, float("inf")),
                registry=reg)
score = Summary("predict_score", "Model output score", registry=reg)`,
      out: `    predict_requests_total{model_version="4d8e8c10a2bb",outcome="decline"} 10935.0
    predict_requests_total{model_version="4d8e8c10a2bb",outcome="approve"} 9065.0
    predict_inflight 0.0
    predict_latency_seconds_bucket{le="0.001"} 555.0
    predict_latency_seconds_bucket{le="0.002"} 10378.0
    predict_latency_seconds_bucket{le="0.005"} 19337.0
    predict_latency_seconds_bucket{le="0.01"} 19473.0
    predict_latency_seconds_bucket{le="0.025"} 19788.0
    predict_latency_seconds_bucket{le="0.05"} 19967.0
    predict_latency_seconds_bucket{le="0.1"} 19998.0
    predict_latency_seconds_bucket{le="+Inf"} 20000.0

  scraped GET /metrics -> 200, 1613 bytes, 19 series lines` },

    { t: "p", text: "The buckets are **cumulative**, which is the detail that makes them composable: `le=\"0.002\"` is 10,378 and `le=\"0.005\"` is 19,337, so 8,959 observations fell between them. To combine replicas you add the counts at each `le` — a sum, which is why `sum(rate(...)) by (le)` is the canonical query." },

    { t: "p", text: "Note also that the latency distribution driving this was shaped like lesson 2.1's real measurement: a body around 1.9 ms with a small heavy tail. 20,000 observations produced **19 series lines and 1,613 bytes** — a histogram is eight-ish series per label combination, which is where section 5's arithmetic comes from." },

    { t: "h2", n: "03", id: "instrument", text: "What to put on a model service's endpoint",
      sub: "Four metrics, and the one that is not obvious" },

    { t: "p", text: "The instrumentation that makes lesson 12's diagnosis possible is small, and three of the four items come straight from measurements earlier in this course." },

    { t: "code", lang: "python", title: "The minimum, for the lesson 2.1 service",
      code: `# 1. latency, as a histogram, with stage labels -- lesson 2.1 measured the
#    model at 30% of the request, and you cannot find that without stages.
LAT = Histogram("predict_latency_seconds", "Latency by stage",
                ["stage"], buckets=(0.0005, 0.001, 0.002, 0.005, 0.01,
                                    0.025, 0.05, 0.1, 0.25, float("inf")))

# 2. requests, as a counter, labelled by the two things an incident needs
REQ = Counter("predict_requests_total", "Requests",
              ["model_version", "outcome", "status"])

# 3. occupancy, as a gauge -- lesson 5.3's scaling signal
INFLIGHT = Gauge("predict_inflight", "Requests in flight")

# 4. the prediction itself, as a histogram -- NOT a summary, because the
#    output distribution has to be comparable across replicas (lesson 2.2)
SCORE = Histogram("predict_score", "Model output score",
                  ["model_version"], buckets=[i / 10.0 for i in range(11)])` },

    { t: "p", text: "The fourth is the one teams omit and the one this course keeps needing. Lesson 2.2 measured that a five-point move in the prediction rate is detectable in **1.9 minutes with no labels**, making it the fastest harm-correlated signal available — and lesson 1.5's unit change collapsed the approval rate from 0.447 to 0.036, which this metric would have caught within minutes." },

    { t: "p", text: "It must be a **histogram labelled by model version**, not a summary and not a bare counter of approvals. A histogram because the distribution must aggregate across replicas; labelled by version because during a canary (lesson 3.3) the entire question is whether the two versions' output distributions differ." },

    { t: "callout", kind: "good", title: "Label latency by stage, or lesson 12.1 is impossible",
      body: [
        { t: "p", text: "Lesson 2.1 measured inference at **0.581 ms of a 1.936 ms request** — thirty percent — and concluded that halving the model's time would buy 15% end to end. That conclusion required knowing the split." },
        { t: "p", text: "A single unlabelled latency histogram cannot produce it. One `stage` label — `deserialize`, `fetch_features`, `transform`, `infer`, `serialize` — makes the decomposition a query instead of an investigation, and it is what turns lesson 12.1's triage from guesswork into reading a graph." }
      ] },

    { t: "h2", n: "04", id: "rate", text: "Why you always wrap a counter in `rate()`",
      sub: "And the two traps in doing so" },

    { t: "p", text: "A counter's raw value is meaningless — it is *how many since this process started*. The useful quantity is its derivative, and `rate()` computes a per-second average over a window." },

    { t: "p", text: "Two mechanics catch people out. **`rate()` handles counter resets**: a pod restart takes the counter to zero, and `rate()` detects the decrease and treats it as a reset rather than reporting a vast negative. This is why monotonicity is a contract rather than a convention." },

    { t: "p", text: "And **the window must exceed twice the scrape interval**. `rate(x[15s])` with a fifteen-second scrape may contain one sample or none, producing gaps and spikes; the rule of thumb is a window at least four times the interval, so `rate(x[1m])` at minimum." },

    { t: "code", lang: "python", title: "The queries that matter for a model service",
      code: `# requests per second, by outcome
sum(rate(predict_requests_total[5m])) by (outcome)

# error ratio -- a ratio of two rates, which is what an SLO is measured on
sum(rate(predict_requests_total{status=~"5.."}[5m]))
  / sum(rate(predict_requests_total[5m]))

# p99 latency across the fleet: sum the BUCKETS, then take the quantile
histogram_quantile(0.99, sum(rate(predict_latency_seconds_bucket[5m])) by (le))

# the approval rate, as a fraction -- lesson 2.2's fastest harm proxy
sum(rate(predict_score_bucket{le="0.5"}[5m]))
  / sum(rate(predict_score_count[5m]))` },

    { t: "p", text: "The third query is the correct form of the thing lesson 7.2 is about: `sum` the buckets by `le` **first**, then compute the quantile. Writing `avg(histogram_quantile(...))` instead is the mistake, and it is measured at a 46% error." },

    { t: "h2", n: "05", id: "cardinality", text: "Cardinality is a product",
      sub: "2,880 series, or 144 million" },

    { t: "p", text: "Each distinct combination of label values is a separate time series, stored and indexed independently. So the cost of a metric is the **product** of its labels' value counts — and for a histogram, multiplied again by the bucket count." },

    { t: "code", lang: "python", title: "m7.py — the series count",
      out: `== 4. label cardinality: the series count ==
  label            values series so far
  model_version         3            3
  outcome               2            6
  endpoint              4           24
  status_code           5          120
  region                3          360
  x 8 histogram buckets                   2880 time series

  adding customer_id  (50000 values) -> 144000000 series
  adding request_id   (1000000 values) -> 2880000000 series` },

    { t: "p", text: "Five entirely reasonable labels give **2,880 series** for one histogram, which is fine. Adding one label whose values are unbounded gives **144 million**, which is not — and Prometheus holds a substantial amount per series in memory, so this is how a monitoring system is taken down by an instrumentation change." },

    { t: "diagram", kind: "matrix", id: "dg-7_1-05-0",
      title: "Labels that are safe, and labels that are not",
      caption: "The test is whether the set of values is **bounded and small**. **Anything per-request or per-entity belongs in a log or a trace, not in a label** — which is lesson 7.3's division of labour.",
      rows: ["model_version", "outcome, status", "endpoint, region", "customer_id", "request_id", "error message"],
      cols: ["Values", "Verdict"],
      cells: [
        [{ text: "a handful, and you control them", tone: "good" }, { text: "safe, and essential for canaries", tone: "good" }],
        [{ text: "two to five, enumerable", tone: "good" }, { text: "safe", tone: "good" }],
        [{ text: "tens, bounded by deployment", tone: "good" }, { text: "safe; watch the product", tone: "warn" }],
        [{ text: "50,000 and growing", tone: "crit" }, { text: "144M series — never", tone: "crit" }],
        [{ text: "one per request", tone: "crit" }, { text: "unbounded — a log field", tone: "crit" }],
        [{ text: "unbounded free text", tone: "crit" }, { text: "unbounded — a log field", tone: "crit" }]
      ] },

    { t: "callout", kind: "insight", title: "The ML-specific cardinality trap is a feature name",
      body: [
        { t: "p", text: "Instrumenting per-feature statistics — a gauge of each feature's mean, labelled by feature name — is a natural idea and is fine for four features. For a model with two thousand features it is two thousand series per statistic, and if the label set also includes model version and region it is the product again." },
        { t: "p", text: "Drift monitoring belongs on the prediction log from lesson 16.2, computed in batch, not on a metrics endpoint. Metrics are for the things you alert on in seconds; lesson 2.2 measured drift needing **20,000 samples for 80% power**, which is not a per-scrape question." }
      ] },

    { t: "exercise", kind: "practice", title: "Instrument and count", difficulty: "core", minutes: 30,
      prompt: "Add four metrics to a model service: a latency histogram labelled by stage, a request counter labelled by model version and outcome, an in-flight gauge, and a histogram of the prediction score labelled by model version. Then compute the cardinality: multiply the value counts of every label on each metric, multiply histograms by their bucket count, and sum. Compare that against your Prometheus's current series count. Then audit your existing metrics for any label whose value set is unbounded — ids, messages, paths with ids in them — and for any Summary whose quantiles are being averaged across replicas on a dashboard.",
      hints: [
        "A path label like /predict/12345 is an unbounded label wearing a route's clothes; normalise it to /predict/:id at instrumentation time.",
        "The stage label on latency is what makes lesson 12.1's decomposition a query rather than an investigation.",
        "If a dashboard panel shows avg of a p99, that is the 46% error from lesson 7.2 and it is on your wall."
      ],
      solution: {
        body: [
          { t: "p", text: "The unbounded label is usually a URL path containing an id, which is easy to miss because it looks like a route. Normalising at instrumentation time is the fix; dropping it later means losing the series and the history." },
          { t: "p", text: "The score histogram is the metric most often absent, and it is the one lesson 2.2 identified as the fastest harm-correlated signal available without labels — 1.9 minutes to detect a five-point move in the positive rate." }
        ]
      } }

  ],

  takeaways: [
    "**Prometheus pulls**, so service discovery replaces registration and a failed scrape is itself observable as `up == 0` — where under push, silence is ambiguous.",
    "**A process that exits between scrapes is invisible**, which makes a training Job unscrapeable: its final values vanish with the pod.",
    "**A Pushgateway is the explicit exception** for short-lived jobs, and is widely misused for service metrics, where it destroys the `up` signal.",
    "**Counter: how many ever** — never read its value, read `rate()`; monotonicity is what makes a missed scrape harmless and a reset detectable.",
    "**Gauge: what is it now** — and a gauge sampled every 15 s misses everything between samples, which is why it is wrong for latency.",
    "**Histogram against Summary is the one irreversible choice**: a summary's quantiles are per-process and cannot be combined; histogram buckets add.",
    "**Buckets are cumulative**, which is what makes `sum(rate(bucket[5m])) by (le)` the canonical aggregation.",
    "**Label latency by stage**, or lesson 2.1's finding that the model is 30% of the request is not derivable and lesson 12.1's triage is guesswork.",
    "**Instrument the prediction score as a histogram labelled by model version** — lesson 2.2's fastest harm proxy, and the only way to compare two versions' output during a canary.",
    "**`rate()` handles counter resets**, so a pod restart does not produce a negative; and the window must be at least four times the scrape interval.",
    "**Cardinality is the product of label value counts**, times the bucket count for a histogram: five reasonable labels gave **2,880 series**.",
    "**One unbounded label gave 144 million series** — `customer_id` with 50,000 values. That is how an instrumentation change takes down a monitoring system.",
    "**Per-feature statistics are the ML cardinality trap**: drift belongs on the prediction log computed in batch, since it needs 20,000 samples for 80% power, not a 15-second scrape."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your four-minute training Job records its final metrics. Why will Prometheus probably not have them?",
        options: [
          "Job metrics are written to a different endpoint that Prometheus ignores",
          "Prometheus pulls on an interval, and a process that exits between scrapes is invisible — the final values go with the pod, so a short-lived job needs a Pushgateway",
          "Prometheus cannot scrape pods whose restartPolicy is Never"
        ],
        answer: 1,
        why: "This is the pull model's one genuine gap, and the Pushgateway exists specifically for it. It is also commonly misused for service metrics, where pushing destroys the `up` signal and makes a stale value indistinguishable from a steady one."
      },
      {
        stem: "You instrument latency as a Summary. Later you want fleet-wide p99 across ten replicas. What is the problem?",
        options: [
          "Summaries are more expensive to store than histograms",
          "A Summary's quantiles are computed inside each process, so there is no operation that combines ten p99s into the fleet's p99 — and fixing it means re-instrumenting and losing history",
          "Summaries do not expose a count, so a weighted average is impossible"
        ],
        answer: 1,
        why: "Histogram buckets are cumulative counts and therefore add, which is why `sum(rate(bucket[5m])) by (le)` works. This is the one metric-type choice that cannot be reversed cheaply — lesson 7.2 measures the error from trying to average quantiles at 46%."
      },
      {
        stem: "A metric has labels with 3, 2, 4, 5 and 3 values and 8 histogram buckets. Someone adds a `customer_id` label with 50,000 values. What happens to the series count?",
        options: [
          "It increases by 50,000, from 2,880 to 52,880",
          "It is multiplied: 2,880 becomes 144,000,000, because cardinality is the product of label value counts",
          "Prometheus deduplicates unused combinations, so the practical increase is small"
        ],
        answer: 1,
        why: "Cardinality is a product, not a sum — this is the arithmetic that makes an apparently harmless instrumentation change take a monitoring system down. Anything per-request or per-entity belongs in a log or a trace, which is lesson 7.3's division of labour."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What would you instrument on a model serving endpoint?",
        strong: "Four metrics. A latency histogram labelled by stage — deserialize, fetch features, transform, infer, serialize — because without the stage label you cannot tell where the time goes, and when I measured that split the model was only 30% of the request, so an optimisation aimed at it would have bought 15% end to end. A request counter labelled by model version and outcome. An in-flight gauge, which is a better autoscaling signal than CPU. And a histogram of the prediction score labelled by model version, which people usually omit: it is the fastest harm-correlated signal available without labels, detectable in under two minutes for a five-point shift, and it is what would have caught a unit-change incident where the approval rate collapsed from 0.45 to 0.04. A histogram rather than a summary for all of those, because summary quantiles cannot be aggregated across replicas.",
        answer: [
          { t: "p", text: "The stage label and the score histogram are the two that distinguish this from a generic answer, and both have measurements behind them." },
          { t: "p", text: "Noting histogram-over-summary unprompted, with the aggregation reason, pre-empts the natural follow-up." }
        ]
      },
      {
        level: "senior",
        q: "What takes a Prometheus down?",
        strong: "Almost always cardinality, and the arithmetic is the thing to understand: a metric's cost is the product of its label value counts, multiplied again by the bucket count for a histogram. I measured five entirely reasonable labels on a prediction endpoint — model version, outcome, endpoint, status, region — giving 2,880 series, which is fine. Adding one customer_id label with 50,000 values makes it 144 million, and since Prometheus holds a meaningful amount per series in memory, that is an instrumentation change taking down the monitoring system. The traps are labels that look bounded and are not: a URL path with an id in it, an error message, an exception type from a library that includes detail. And the ML-specific one is per-feature statistics — a gauge per feature is fine for four features and is two thousand series for a real model, which is why drift belongs on the prediction log computed in batch rather than on a metrics endpoint. It also needs about 20,000 samples for reasonable power, so it was never a per-scrape question.",
        answer: [
          { t: "p", text: "Having the product arithmetic with real numbers makes the risk concrete, and the 2,880-to-144-million jump is memorable." },
          { t: "p", text: "The per-feature drift point is the ML-specific insight, and connecting it to the statistical power requirement shows why the architectural separation is correct rather than merely conventional." }
        ]
      }
    ]
  }
});
