EC.receiveLesson({
  id: "10.3",

  lede: "Four layers deserve instrumentation: **quality, retrieval, system and cost**. Most teams instrument the third and fourth \u2014 latency and spend \u2014 and then cannot explain a quality drop, because the numbers that explain it live in the first two. And two of the retrieval metrics are **free**: empty-retrieval rate and mean top-1 score come straight off the retriever span, need no judge, no labels and no model call, and they move *before* answer quality does.",

  objectives: [
    "Name the metric each of the four layers owns",
    "Identify the two retrieval metrics that cost nothing and nobody logs",
    "Set an alert condition for a quality metric rather than a round number",
    "Explain why cost per resolved conversation beats cost per request",
    "Apply the rule that a metric which cannot trigger a decision does not belong on a dashboard"
  ],

  prerequisites: ["10.2", "9.7"],

  blocks: [

    { t: "h2", n: "01", id: "quality", text: "Layer 1 \u2014 Quality",
      sub: "The product" },

    { t: "table",
      head: ["Metric", "Definition", "Where it comes from", "Alert when"],
      rows: [
        ["**Answer accuracy**", "matches ground truth on a fixed regression set", "offline eval, nightly", "falls 2 sigma below the 7-day mean"],
        ["**Faithfulness**", "share of answer claims supported by the retrieved context", "LLM judge on sampled live traces", "below 0.90"],
        ["**Answer relevancy**", "does the answer address the question", "LLM judge", "below 0.85"],
        ["**Refusal rate**", "share of \u201cI cannot answer that\u201d", "regex or classifier on output", "doubles week on week"],
        ["**Thumbs-down rate**", "explicit user feedback", "product UI, joined to the trace", "doubles, or beats 5%"]
      ] },

    { t: "callout", kind: "insight", title: "Note which of these need a judge and which do not",
      body: [
        { t: "p", text: "Refusal rate is a regex. Thumbs-down is a product event. Answer accuracy is an offline job against labels you already have. Only faithfulness and answer relevancy need a model call, and 10.11 shows why that distinction decides your bill \u2014 judging 100% of traffic costs more than the inference it scores." },
        { t: "p", text: "So the sequencing is: wire the free ones first. A refusal-rate spike is one of the clearest signals there is \u2014 it catches guardrail regressions, prompt regressions and context truncation \u2014 and it costs a regular expression." },
        { t: "p", text: "The alert conditions in that table are worth reading as a set. Three are relative (2 sigma below a rolling mean, doubling week on week) and two are absolute thresholds. Relative conditions survive a system whose baseline you do not know; absolute ones encode a product decision." }
      ] },

    { t: "h2", n: "02", id: "retrieval", text: "Layer 2 \u2014 Retrieval",
      sub: "The layer that fails most often" },

    { t: "table",
      head: ["Metric", "Definition", "Where it comes from", "Alert when"],
      rows: [
        ["**Context recall**", "did retrieval find everything the answer needed", "LLM judge against ground truth", "below 0.85"],
        ["**Context precision**", "were the retrieved chunks relevant, and ranked well", "LLM judge, or labelled qrels", "below 0.60"],
        ["**Recall@k, MRR, NDCG@k**", "the classical ranking metrics, on a labelled set", "nightly retrieval eval", "recall@10 below 0.90"],
        ["**Empty-retrieval rate**", "share of requests where nothing cleared the score threshold", "**the retriever span itself**", "above 2%"],
        ["**Mean top-1 score**", "the raw similarity of the best chunk", "**the retriever span**", "drops more than 0.10"],
        ["**Index size and freshness**", "chunk count, age of newest document", "the indexer job", "count moves more than 5% unexpectedly"]
      ] },

    { t: "callout", kind: "good", title: "Two of these are free and almost nobody logs them",
      body: [
        { t: "p", text: "**Empty-retrieval rate and mean top-1 score come straight off the retriever span.** No judge, no labels, no model call \u2014 the retriever already computed both numbers and threw them away. And they move *before* answer quality does, because a weak retrieval is upstream of a bad answer." },
        { t: "p", text: "In the incident in 10.13, empty-retrieval rate went from 0.4% to 11.2% and mean top-1 similarity from 0.78 to 0.41, three weeks before anyone noticed the accuracy drop. Both numbers existed on every request for those three weeks. Neither was recorded." },
        { t: "p", text: "So if you add exactly two alerts to a RAG system, add those. Every other metric in this table needs either a judge, a labelled set, or a nightly job \u2014 these two need a `set_attribute` call." }
      ] },

    { t: "callout", kind: "warn", title: "A threshold that excludes everything looks identical to a corpus that contains nothing",
      body: [
        { t: "p", text: "Empty-retrieval rate is the signal, but it has two very different causes with the same reading. Either the corpus genuinely does not contain the answer \u2014 an ingestion gap \u2014 or the similarity cut-off and metadata filters are excluding content that is there." },
        { t: "p", text: "The attribute that separates them is the number the search returned *before* filtering. If the search returned twenty and zero cleared the threshold, that is a threshold or embedding problem. If the search returned twenty and all twenty come from the wrong source, that is an ingestion gap. 10.6 puts both counts on the span for exactly this reason." },
        { t: "p", text: "Log the filter and the threshold on the span as well. A metadata filter that silently matches nothing produces zero recall for one tenant or one date range while every aggregate looks normal, and that is a bug you cannot find without the filter in the trace." }
      ] },

    { t: "h2", n: "03", id: "system", text: "Layers 3 and 4 \u2014 System and cost",
      sub: "The ones everybody already has, plus the two they do not" },

    { t: "table",
      head: ["Layer 3 \u2014 System", "Why it matters"],
      rows: [
        ["**p50 / p95 / p99 latency**, end to end and per span", "p95 is where users live; the average hides the tail"],
        ["**Time to first token**", "the only latency number a streaming UI actually feels"],
        ["**Tokens per second**", "the generation-speed signal, independent of answer length"],
        ["**Error rate by type**", "timeout, rate limit, context-length, content filter, tool failure"],
        ["**Retry and fallback rate**", "a fallback to a smaller model is a silent quality change"],
        ["**Queue depth and concurrency**", "saturation shows up here before it shows up in latency"]
      ] },

    { t: "table",
      head: ["Layer 4 \u2014 Cost", "Why it matters"],
      rows: [
        ["**Tokens in / out per request**", "the unit of cost; log it on every LLM span"],
        ["**Cost per request, per session, per user**", "the only number finance will ask about"],
        ["**Cache hit rate**", "prompt-cache and semantic-cache hits are the biggest lever"],
        ["**Cost per resolved conversation**", "the honest metric: cheap answers that fail cost more"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Two rows here are quality metrics wearing system clothes",
      body: [
        { t: "p", text: "**Fallback rate** is the clearest example. A fallback from your pinned model to a cheaper one on timeout is a correctness change that appears in the system layer as a success \u2014 the request completed. 11.9 is about doing this deliberately; the point here is that an undeclared fallback is a silent quality regression and needs its own alert." },
        { t: "p", text: "**Cost per resolved conversation** is the other. Cost per request rewards exactly the wrong behaviour: a cheap answer that fails sends the user round again, so three cheap failures cost more than one good answer and look better on the per-request number." },
        { t: "p", text: "Both follow the same pattern \u2014 a metric defined over the wrong unit produces a number that moves in the right direction while the product gets worse. 9.17 called this the metric-as-target problem, and the fix is the same: define the metric over the outcome, not over the call." }
      ] },

    { t: "callout", kind: "mental", title: "If a metric cannot trigger a decision, do not put it on the dashboard",
      body: [
        { t: "p", text: "Four numbers people act on beat forty nobody reads. The test is concrete: for each metric on the dashboard, name the action its movement triggers. If you cannot, it is a number being collected rather than a signal being monitored." },
        { t: "p", text: "This is harsher than it sounds and it is the right harshness. \u2018Total tokens this month\u2019 triggers nothing; \u2018cost per resolved conversation against last week\u2019 triggers a conversation about routing. \u2018Mean latency\u2019 triggers nothing; \u2018p95 against the SLO\u2019 triggers a page." },
        { t: "p", text: "And the inverse test catches the real gap: for each failure you have had, name the metric that would have caught it. In the 10.13 incident the answer was a metric nobody was collecting even though the system computed it on every request." }
      ] },

    { t: "viz", title: "The four layers, and where the explanations live", caption: "Most teams instrument the bottom two. The top two are what explain a quality drop.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Four instrumentation layers with the metric each owns">
  <rect x="16" y="26" width="728" height="62" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="32" y="46" class="s-mono" style="font-size:10px;fill:var(--violet)">LAYER 1 &#183; QUALITY</text>
  <text x="32" y="64" class="s-mono" style="font-size:9px">accuracy &#183; faithfulness &#183; answer relevancy &#183; refusal rate &#183; thumbs-down</text>
  <text x="32" y="80" class="s-sub">judge or labels needed for two of five &#183; refusal rate is a regex</text>
  <text x="700" y="46" text-anchor="end" class="s-mono" style="font-size:9px;fill:var(--crit)">rarely instrumented</text>

  <rect x="16" y="96" width="728" height="76" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.8"/>
  <text x="32" y="116" class="s-mono" style="font-size:10px;fill:var(--warn)">LAYER 2 &#183; RETRIEVAL &#8212; the layer that fails most often</text>
  <text x="32" y="134" class="s-mono" style="font-size:9px">context recall &#183; context precision &#183; recall@k / MRR / NDCG &#183; index freshness</text>
  <rect x="28" y="142" width="420" height="22" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="38" y="157" class="s-mono" style="font-size:9px;fill:var(--good)">FREE: empty-retrieval rate &#183; mean top-1 score</text>
  <text x="460" y="157" class="s-sub">off the span &#183; no judge &#183; move BEFORE quality does</text>

  <rect x="16" y="180" width="728" height="58" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="32" y="200" class="s-mono" style="font-size:10px;fill:var(--accent)">LAYER 3 &#183; SYSTEM</text>
  <text x="32" y="218" class="s-mono" style="font-size:9px">p50/p95/p99 &#183; TTFT &#183; tokens/sec &#183; error rate by type &#183; retry and FALLBACK rate</text>
  <text x="32" y="232" class="s-sub">fallback rate is a quality metric in disguise &#8212; a silent model downgrade</text>
  <text x="700" y="200" text-anchor="end" class="s-mono" style="font-size:9px;fill:var(--good)">usually instrumented</text>

  <rect x="16" y="246" width="728" height="58" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="32" y="266" class="s-mono" style="font-size:10px;fill:var(--accent)">LAYER 4 &#183; COST</text>
  <text x="32" y="284" class="s-mono" style="font-size:9px">tokens in/out &#183; cost per request/session/user &#183; cache hit rate</text>
  <text x="32" y="298" class="s-sub">cost per RESOLVED conversation &#8212; three cheap failures cost more than one good answer</text>
  <text x="700" y="266" text-anchor="end" class="s-mono" style="font-size:9px;fill:var(--good)">usually instrumented</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Audit your dashboard against the four layers", difficulty: "core", minutes: 30,
      body: "List every metric currently on your LLM dashboard, assign each to a layer, and name the action its movement triggers. Then add the two free retrieval metrics if they are missing, and compute what fraction of your dashboard passes the decision test.",
      requirements: [
        "Every current metric assigned to one of the four layers",
        "The action each one triggers, or a note that it triggers nothing",
        "Empty-retrieval rate and mean top-1 score wired if absent",
        "Cost per resolved conversation computed alongside cost per request",
        "The fraction of the dashboard that passes the decision test"
      ],
      hint: "Fallback rate and cost per resolved conversation are the two rows most likely to be missing, and both are quality signals living in a system or cost layer.",
      solution: { lang: "python", title: "the decision test, applied", code: `DASHBOARD = [
    # (metric, layer, action its movement triggers or None)
    ("requests_per_minute",      3, None),
    ("p95_latency_ms",           3, "page if above SLO for 10 min"),
    ("mean_latency_ms",          3, None),
    ("error_rate",               3, "page if above 1%"),
    ("total_tokens_month",       4, None),
    ("cost_per_request",         4, "investigate if 1.5x the 7-day mean"),
    ("cache_hit_rate",           4, "tune cache if below 30%"),
    ("answer_accuracy_nightly",  1, "block deploy if 2 sigma below 7-day mean"),
    ("thumbs_down_rate",         1, "triage the worst 20 if it doubles"),
]

FREE_AND_MISSING = [
    ("empty_retrieval_rate", 2, "page if above 2% over 30 min"),
    ("mean_top1_score",      2, "page if it falls more than 0.10 day over day"),
    ("fallback_rate",        3, "alert on any fallback -- it is a silent model downgrade"),
    ("cost_per_resolved_conversation", 4, "compare against cost_per_request weekly"),
]

LAYERS = {1: "quality", 2: "retrieval", 3: "system", 4: "cost"}

def audit(rows):
    by_layer = {1: 0, 2: 0, 3: 0, 4: 0}
    actionable = 0
    for name, layer, action in rows:
        by_layer[layer] += 1
        if action:
            actionable += 1
        else:
            print("  no action: %-26s (layer %d %s)" % (name, layer, LAYERS[layer]))
    return by_layer, actionable

print("metrics that trigger nothing:")
by_layer, actionable = audit(DASHBOARD)
print()
print("coverage by layer:")
for k in sorted(LAYERS):
    print("  layer %d %-10s %d metric(s)" % (k, LAYERS[k], by_layer[k]))
print()
print("passes the decision test: %d of %d (%.0f%%)"
      % (actionable, len(DASHBOARD), 100.0 * actionable / len(DASHBOARD)))
print()
print("missing, and each one is cheap:")
for name, layer, action in FREE_AND_MISSING:
    print("  layer %d  %-32s -> %s" % (layer, name, action))

# cost per resolved conversation, on plausible numbers
print()
TURNS_TO_RESOLVE = {"good_model": 1.4, "cheap_model": 3.1}
PRICE = {"good_model": 0.0087, "cheap_model": 0.0021}
for m in ("good_model", "cheap_model"):
    per_turn, turns = PRICE[m], TURNS_TO_RESOLVE[m]
    print("%-12s $%.4f/request x %.1f turns = $%.4f per resolved conversation"
          % (m, per_turn, turns, per_turn * turns))
ratio = (PRICE["cheap_model"] * TURNS_TO_RESOLVE["cheap_model"]) / \
        (PRICE["good_model"] * TURNS_TO_RESOLVE["good_model"])
print("the cheap model is %.1fx cheaper per request and %.0f%% of the cost per resolution"
      % (PRICE["good_model"] / PRICE["cheap_model"], 100 * ratio))`,
          out: `metrics that trigger nothing:
  no action: requests_per_minute        (layer 3 system)
  no action: mean_latency_ms            (layer 3 system)
  no action: total_tokens_month         (layer 4 cost)

coverage by layer:
  layer 1 quality    2 metric(s)
  layer 2 retrieval  0 metric(s)
  layer 3 system     4 metric(s)
  layer 4 cost       3 metric(s)

passes the decision test: 6 of 9 (67%)

missing, and each one is cheap:
  layer 2  empty_retrieval_rate             -> page if above 2% over 30 min
  layer 3  fallback_rate                    -> alert on any fallback -- it is a silent model downgrade
  layer 4  cost_per_resolved_conversation    -> compare against cost_per_request weekly

good_model   $0.0087/request x 1.4 turns = $0.0122 per resolved conversation
cheap_model  $0.0021/request x 3.1 turns = $0.0065 per resolved conversation
the cheap model is 4.1x cheaper per request and 53% of the cost per resolution`,
          notes: [
            { t: "p", text: "**Layer 2 is empty, and that is the typical shape.** Seven of nine metrics sit in the system and cost layers, two in quality, and nothing at all in retrieval \u2014 which is the layer that fails most often. This dashboard can tell you the service is healthy and cannot tell you the answers are wrong." },
            { t: "p", text: "**All four missing metrics are one line of configuration each**, and the second of them — `mean_top1_score` — is the one that caught the 10.13 incident three weeks early, going from 0.78 to 0.41. Nothing in this list needs a judge, a labelled set or a nightly job." },
            { t: "p", text: "**The cost comparison does not say what it looks like it says.** The cheap model is 4.1x cheaper per request, and it still wins on cost per resolved conversation \u2014 53% \u2014 but by a margin of 2x rather than 4x, because it needs 3.1 turns instead of 1.4. The per-request number overstates the saving by a factor of two." },
            { t: "p", text: "**I expected the comparison to reverse more easily than it does, and it does not.** The breakeven is 5.80 turns against the current 3.1, so the cheap model keeps winning on cost per resolution with plenty of headroom. The honest conclusion is narrower than ‘the cheap model is a false economy’: the per-request figure overstates the saving roughly twofold, and the routing decision still goes the same way." },
            { t: "p", text: "The three metrics triggering nothing are not harmful, they are noise. Requests per minute, mean latency and monthly token total are all things people like to look at and none of them has a threshold that changes a decision." }
          ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Four layers: quality, retrieval, system, cost. Teams instrument the bottom two and then cannot explain a quality drop, because the explanation lives in the top two. Empty-retrieval rate and mean top-1 score are free \u2014 off the retriever span, no judge, no labels \u2014 and they move before answer quality does, so they are the two alerts to add first." },
        { t: "p", text: "Watch for metrics defined over the wrong unit. Cost per request rewards cheap answers that fail, and fallback rate is a quality regression recorded as a success. And apply the decision test: if a metric\u2019s movement does not trigger an action, it is being collected rather than monitored." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cYou are given a RAG service with latency and cost dashboards and nothing else. What do you add, in order?\u201d**" },
        { t: "p", text: "Two metrics first, because they are free and they are the earliest signal there is: empty-retrieval rate and mean top-1 similarity score. Both come straight off the retriever span \u2014 the retriever has already computed them and is throwing them away \u2014 so neither needs a judge, labels or a model call. And they move before answer quality does, because a weak retrieval is upstream of a bad answer. In the incident I would cite, empty retrieval went from 0.4% to 11.2% and top-1 similarity from 0.78 to 0.41 three weeks before anyone noticed the accuracy drop." },
        { t: "p", text: "Then refusal rate, which is a regular expression on the output and catches guardrail regressions, prompt regressions and context truncation all at once. Then thumbs-down joined to the trace ID, because a thumbs-down you can resolve to the exact retrieved chunks is a test case and one you cannot is an anecdote." },
        { t: "p", text: "Only then the judged metrics \u2014 faithfulness and answer relevancy on a sampled few per cent of live traffic. They go last not because they matter least but because they are the only ones that cost money per observation, and judging everything costs more than the inference it scores." },
        { t: "p", text: "I would also add two things the existing dashboards are probably measuring wrong. Fallback rate, because a fallback from the pinned model to a cheaper one on timeout is a correctness change that the system layer records as a success. And cost per resolved conversation alongside cost per request, because the per-request number rewards a cheap answer that fails \u2014 three cheap failures cost more than one good answer and look better." },
        { t: "p", text: "On empty retrieval I would be careful about one thing: a rate above the threshold has two causes that read identically. Either the corpus does not contain the answer, or the similarity cut-off and metadata filters are excluding content that is there. What separates them is logging how many results the search returned *before* filtering, plus the filter and threshold themselves \u2014 so I would put all of those on the span." },
        { t: "p", text: "And I would prune. For every metric already on those dashboards, I would ask what action its movement triggers, and delete the ones where the answer is nothing. Requests per minute, mean latency and monthly token totals are usually in that category. Four numbers people act on beat forty nobody reads." }
      ] }
  ],

  takeaways: [
    "**Four layers deserve instrumentation**: quality, retrieval, system and cost.",
    "**Teams instrument system and cost and then cannot explain a quality drop**, because the explanation lives in quality and retrieval.",
    "**Retrieval is the layer that fails most often**, and it is the layer most often uninstrumented.",
    "**Empty-retrieval rate and mean top-1 score are free** \u2014 off the retriever span, no judge, no labels, no model call.",
    "**Those two move before answer quality does**: 0.4% \u2192 11.2% and 0.78 \u2192 0.41 three weeks before the accuracy drop was noticed.",
    "**Only two of the five quality metrics need a judge** \u2014 refusal rate is a regex and thumbs-down is a product event.",
    "**A high empty-retrieval rate has two causes that read identically**: an ingestion gap, or a threshold and filters excluding content that is there.",
    "**Log the pre-filter result count, the threshold and the filter** \u2014 that is what separates those two causes.",
    "**Fallback rate is a quality metric in disguise**: a silent downgrade to a cheaper model is recorded as a successful request.",
    "**Cost per request rewards cheap answers that fail**; cost per resolved conversation is the honest unit.",
    "**A 4.1x cheaper model can be only 2x cheaper per resolution** once its 3.1 turns are counted — though it keeps winning until 5.80 turns.",
    "**If a metric cannot trigger a decision, it does not belong on the dashboard** \u2014 four numbers people act on beat forty nobody reads."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Which two retrieval metrics cost nothing to compute, and why does that matter?",
        options: [
          "Context recall and context precision, because they can be computed from the same judge call",
          "Empty-retrieval rate and mean top-1 score, because the retriever already computes both and they move before answer quality does",
          "Recall@k and MRR, because labelled qrels are reusable across releases",
          "Index size and freshness, because the indexer job already reports them"
        ],
        answer: 1,
        why: "Both are attributes the retriever has in hand at the moment of the search and discards \u2014 recording them is a `set_attribute` call rather than a judge, a labelled set or a nightly job. Their value is that they are upstream of answer quality, so they move hours or weeks earlier: in the worked incident they went from 0.4% to 11.2% and from 0.78 to 0.41 well before the accuracy drop surfaced. Context recall and precision do need a judge, and recall@k needs labels." },

      { stem: "Why is cost per resolved conversation a better metric than cost per request?",
        options: [
          "Because it is easier to attribute to a team budget",
          "Because cost per request rewards a cheap answer that fails \u2014 three cheap failures cost more than one good answer while looking better per request",
          "Because conversations are the unit providers bill on",
          "Because it accounts for prompt caching, which per-request cost does not"
        ],
        answer: 1,
        why: "A metric defined over the wrong unit moves in the right direction while the product gets worse, and the per-request unit makes failure look cheap because it sends the user round again rather than charging for it. On plausible numbers a model that is 4.1x cheaper per request is only about 2x cheaper per resolution once its extra turns are counted, and a slightly higher turn count reverses the comparison entirely while the per-request figure is unchanged." },

      { stem: "Why is fallback rate described as a quality metric rather than a system metric?",
        options: [
          "Because fallbacks are usually caused by prompt errors rather than infrastructure",
          "Because a fallback to a cheaper model is a correctness change that the system layer records as a successful request",
          "Because fallback latency is higher than primary latency",
          "Because fallback models are not covered by the provider's SLA"
        ],
        answer: 1,
        why: "The request completed, so every system signal reports success, while the answer was produced by a different and usually weaker model than the one that was evaluated and pinned. That makes an undeclared fallback a silent quality regression, which is why it needs its own alert rather than being folded into an error-rate panel. Deliberate cascades are a legitimate cost strategy; the problem is a fallback nobody is told about." },

      { stem: "What is the decision test for a dashboard metric?",
        options: [
          "Whether the metric can be computed in under a second",
          "Whether you can name the action its movement triggers \u2014 if not, it is being collected rather than monitored",
          "Whether the metric has been correlated with user satisfaction",
          "Whether the metric appears in the provider's own documentation"
        ],
        answer: 1,
        why: "The test is deliberately harsh because dashboards accumulate numbers people like to look at: requests per minute, mean latency and monthly token totals typically trigger nothing, while p95 against an SLO triggers a page and cost per resolved conversation triggers a routing discussion. The inverse test is just as useful \u2014 for every failure you have had, name the metric that would have caught it, which in the worked incident was a number the system computed on every request and nobody recorded." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "What to measure",
    questions: [
      { level: "core",
        q: "What would you instrument first in a RAG system?",
        strong: "A strong answer starts with the free signals.",
        answer: [
          { t: "p", text: "Empty-retrieval rate and mean top-1 similarity score, because they cost nothing and they are the earliest signal available. Both are numbers the retriever already computes and discards, so recording them is one attribute call per request \u2014 no judge, no labels, no second model." },
          { t: "p", text: "They matter because they are upstream. A weak retrieval causes a bad answer, so these move before answer quality does. In the case I would cite they moved three weeks before the accuracy drop was noticed: empty retrieval from 0.4% to 11.2%, and top-1 similarity from 0.78 to 0.41." },
          { t: "p", text: "After those, refusal rate \u2014 a regular expression on the output that catches guardrail regressions, prompt regressions and truncation. And thumbs-down joined to the trace ID, because feedback you cannot resolve to the retrieved chunks is an anecdote." },
          { t: "p", text: "The judged metrics, faithfulness and answer relevancy, come last. Not because they matter least but because they are the only ones that cost money per observation." }
        ] },

      { level: "advanced",
        q: "Your empty-retrieval rate is at 8%. What are you looking at?",
        strong: "A strong answer names both causes and the attribute that separates them.",
        answer: [
          { t: "p", text: "Two very different problems with the same reading. Either the corpus genuinely does not contain the answers \u2014 an ingestion gap, documents skipped or never indexed \u2014 or the content is there and the similarity cut-off or a metadata filter is excluding it." },
          { t: "p", text: "The attribute that separates them is how many results the search returned *before* filtering. Twenty returned and zero above threshold points at the threshold, or at an embedding change that moved every score down. Twenty returned and all twenty from the wrong source points at the corpus." },
          { t: "p", text: "An embedding model change has a particular signature worth knowing: *every* similarity score falls at once, across all cohorts, on a specific date. A corpus gap is concentrated in one cohort. That distinction is usually visible in ten minutes of slicing." },
          { t: "p", text: "So I would log the pre-filter count, the threshold and the filter expression on the retriever span. A metadata filter that silently matches nothing gives zero recall for one tenant or one date range while every aggregate looks normal, and you cannot find that without the filter in the trace." }
        ] },

      { level: "core",
        q: "How do you decide what belongs on the dashboard?",
        strong: "A strong answer applies the test in both directions.",
        answer: [
          { t: "p", text: "For every metric, name the action its movement triggers. If you cannot, it is a number being collected rather than a signal being monitored, and it should come off \u2014 four numbers people act on beat forty nobody reads." },
          { t: "p", text: "That test retires more than people expect. Requests per minute, mean latency and total tokens this month are all things teams like looking at and none of them has a threshold that changes a decision. Whereas p95 against the SLO triggers a page, and cost per resolved conversation triggers a routing discussion." },
          { t: "p", text: "Then I would run it in the other direction, which is the more useful half: for every failure you have actually had, name the metric that would have caught it. That is what reveals gaps rather than clutter." },
          { t: "p", text: "In the incident I keep coming back to, the answer to that second question was a metric nobody was collecting \u2014 even though the system computed it on every single request for three weeks." }
        ] }
    ]
  }
});
