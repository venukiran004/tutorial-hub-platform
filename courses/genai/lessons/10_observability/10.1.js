EC.receiveLesson({
  id: "10.1",

  lede: "A normal service tells you it is broken by returning a 500. An LLM service returns **HTTP 200 with a confidently wrong answer**, in 1.8 seconds, at normal cost. Every classical signal is green while the product is broken \u2014 which means the entire discipline of observability has to be rebuilt around one idea: **quality is a production signal, not a pre-deploy signal.** If you only measure it at eval time, you will learn about regressions from customers.",

  objectives: [
    "State why status codes and latency cannot detect an LLM failure",
    "Name the three properties that make an LLM system harder to observe than a service",
    "Explain why a single accuracy number cannot locate a fault in a compound system",
    "Identify the three kinds of silent drift that break a system with no deploy",
    "Argue for quality as a production signal rather than a release gate"
  ],

  prerequisites: ["9.17", "6.8"],

  blocks: [

    { t: "h2", n: "01", id: "green", text: "Every classical signal is green",
      sub: "And the product is broken" },

    { t: "code", lang: "text", title: "What the two kinds of service give you", code: `  classical service          LLM service
  ------------------         ---------------------------------------------
  200 vs 500                 200 always. Correctness is a separate signal.
  latency                    still matters, plus time-to-first-token
  throughput                 plus tokens/sec, plus queue depth at the provider
  error rate                 plus refusal rate, hallucination rate, empty-retrieval rate
  deterministic              same input, different output, run to run
  you own the code           the model is a vendor's, and it changes underneath you`,
      hl: [2, 6, 7],
      caption: "The three highlighted rows are the ones that have no classical equivalent at all." },

    { t: "callout", kind: "insight", title: "The failure mode is a successful request",
      body: [
        { t: "p", text: "This is the whole reason LLM observability is a separate subject. A database that cannot find a row raises an exception; a retriever that cannot find a chunk returns five bad chunks and the model writes a fluent answer from them. The request succeeds at every layer." },
        { t: "p", text: "So the signals that exist in every monitoring stack \u2014 error rate, latency, saturation, traffic \u2014 are necessary and **none of them fire**. You can have a perfect uptime dashboard over a system that has been giving wrong answers for three weeks, which is exactly the incident in 10.13." },
        { t: "p", text: "The practical consequence: **correctness has to be instrumented deliberately**, as its own signal, with its own storage and its own alerts. Nothing you get for free will tell you about it." }
      ] },

    { t: "h2", n: "02", id: "three", text: "Three properties that make it worse",
      sub: "Non-determinism, compound systems, silent drift" },

    { t: "dl", items: [
      { k: "Non-determinism", v: "You cannot reproduce a failure by replaying the input. 1.2 measured logits differing by 1.984e-04 for the same prompt in one process with no sampling, purely from batch composition \u2014 so you need the actual request captured: inputs, retrieved chunks, the assembled prompt, the raw output." },
      { k: "Compound systems", v: "A RAG answer passes through embed \u2192 search \u2192 rerank \u2192 prompt \u2192 generate \u2192 guardrail. One accuracy number tells you the pipeline failed, not which of six stages did it." },
      { k: "Silent drift", v: "Nothing crashes when your corpus grows threefold, when the provider swaps the weights behind a model alias, or when users start asking about a product you never indexed. All three are deploy-free changes to behaviour." }
    ] },

    { t: "callout", kind: "trap", title: "\u201cNobody deployed anything\u201d is not evidence that nothing changed",
      body: [
        { t: "p", text: "It is the most common opening sentence of an LLM incident and it is usually wrong. The change log covers your code; it does not cover the provider\u2019s weights behind an alias, the index that a nightly job rebuilt, the prompt someone edited in a dashboard, or the mix of questions users are asking." },
        { t: "p", text: "Each of those is a deploy of something, and none of them appears in a git log. 12.4 is about the first of them specifically; 10.6 is about making all five provable by logging a version string for each." },
        { t: "p", text: "The useful reflex is to invert the sentence: **assume something changed and go and find it**, because the alternative hypothesis \u2014 that a deterministic pipeline spontaneously got worse \u2014 is almost never true." }
      ] },

    { t: "h2", n: "03", id: "signal", text: "Quality is a production signal",
      sub: "The one-line framing" },

    { t: "callout", kind: "mental", title: "If quality is only measured before deploy, production is unmonitored",
      body: [
        { t: "p", text: "A pre-deploy eval suite answers \u201cdid this change break the cases I thought of?\u201d. It cannot answer \u201cis the system working now?\u201d, because the things that break an LLM system in production \u2014 corpus changes, traffic shifts, provider rolls \u2014 all happen after the suite has passed." },
        { t: "p", text: "9.16 gives the arithmetic that makes this concrete: a 200-example suite carries a \u00b15.3-point margin, so it cannot resolve a 2-point change at all. It is a filter for clear regressions, not an instrument. Production is where the resolution is, because production is where the volume is." },
        { t: "p", text: "So the shape of the answer is: deterministic checks on 100% of live traffic, a judge on a sample, human review on the worst, and traces underneath all of it so a bad score can be traced to a stage. That is 10.11, and it is the part teams build last and need first." }
      ] },

    { t: "viz", title: "Where the signals are, and where they are not", caption: "The classical stack is complete and silent. Quality has to be added deliberately.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Classical monitoring signals are green while LLM quality fails">
  <text x="16" y="20" class="s-label">ONE REQUEST, EVERY SIGNAL GREEN</text>
  <rect x="16" y="32" width="728" height="64" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="34" y="54" class="s-mono" style="font-size:10px;fill:var(--good)">HTTP 200</text>
  <text x="150" y="54" class="s-mono" style="font-size:10px;fill:var(--good)">1,842 ms</text>
  <text x="280" y="54" class="s-mono" style="font-size:10px;fill:var(--good)">$0.0087</text>
  <text x="400" y="54" class="s-mono" style="font-size:10px;fill:var(--good)">no retries</text>
  <text x="530" y="54" class="s-mono" style="font-size:10px;fill:var(--good)">no exceptions</text>
  <text x="34" y="78" class="s-sub">uptime dashboard: 100% &#183; error rate: 0.0% &#183; p95 within SLO &#183; cost normal</text>

  <path d="M 380 100 L 380 124" stroke="var(--crit)" stroke-width="1.6" marker-end="url(#a101)"/>
  <defs><marker id="a101" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="var(--crit)"/></marker></defs>

  <rect x="16" y="130" width="728" height="56" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="34" y="152" class="s-mono" style="font-size:10px;fill:var(--crit)">THE ANSWER IS WRONG</text>
  <text x="34" y="172" class="s-sub">retriever returned 5 chunks whose best similarity was 0.31 &#183; the model summarised them faithfully</text>

  <line x1="16" y1="204" x2="744" y2="204" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="226" class="s-label">WHAT WOULD HAVE CAUGHT IT</text>
  <rect x="16" y="236" width="232" height="44" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="254" class="s-mono" style="font-size:9px;fill:var(--accent)">a span attribute</text>
  <text x="28" y="270" class="s-mono" style="font-size:9px">docs_above_threshold = 0</text>
  <rect x="264" y="236" width="232" height="44" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="276" y="254" class="s-mono" style="font-size:9px;fill:var(--accent)">a free metric</text>
  <text x="276" y="270" class="s-mono" style="font-size:9px">mean top-1 score 0.78 -&gt; 0.41</text>
  <rect x="512" y="236" width="232" height="44" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="524" y="254" class="s-mono" style="font-size:9px;fill:var(--warn)">an online eval</text>
  <text x="524" y="270" class="s-mono" style="font-size:9px">context recall 0.93 -&gt; 0.48</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Find the failure your dashboard cannot see", difficulty: "core", minutes: 25,
      body: "Take an LLM feature you run. Write down every signal currently alerting on it, then construct a concrete failure that would leave all of them green. If you cannot construct one, you have unusually good instrumentation \u2014 check whether the quality signal is actually wired to an alert or merely recorded.",
      requirements: [
        "List every existing alert and what it fires on",
        "Construct one concrete silent failure that leaves all of them green",
        "Name the cheapest signal that would have caught it",
        "State whether that signal is currently recorded, alerted on, or neither",
        "Classify the failure as non-determinism, compound-system or silent drift"
      ],
      hint: "The cheapest signals are almost always deterministic attributes off a span \u2014 an empty retrieval, a similarity score, a missing citation. They need no judge, no labels and no model call.",
      solution: { lang: "python", title: "a silent-failure audit", code: `SIGNALS = {
    "http_5xx":      {"fires_on": "status >= 500",          "catches_wrong_answer": False},
    "p95_latency":   {"fires_on": "p95 > 4000 ms",          "catches_wrong_answer": False},
    "error_rate":    {"fires_on": "exceptions > 1%",        "catches_wrong_answer": False},
    "cost_per_req":  {"fires_on": "> 1.5x 7-day mean",      "catches_wrong_answer": False},
    "empty_retrieval": {"fires_on": "above_threshold == 0", "catches_wrong_answer": True},
}

# the failure: the new product docs were never indexed
FAILURE = {
    "status": 200, "latency_ms": 1842, "exceptions": 0, "cost": 0.0087,
    "above_threshold": 0, "top_score": 0.31, "answer_correct": False,
}

def audit(signals, event):
    green, caught = [], []
    for name, s in signals.items():
        if name == "empty_retrieval" and event["above_threshold"] == 0:
            caught.append(name)
        else:
            green.append(name)
    return green, caught

green, caught = audit(SIGNALS, FAILURE)
print("the request:        HTTP %d, %d ms, $%.4f, answer correct = %s"
      % (FAILURE["status"], FAILURE["latency_ms"], FAILURE["cost"],
         FAILURE["answer_correct"]))
print("signals green:      %s" % ", ".join(green))
print("signals that fired: %s" % (", ".join(caught) or "NONE"))

print()
configured = {k for k, v in SIGNALS.items() if v["catches_wrong_answer"]}
print("signals that CAN catch a wrong answer: %d of %d" % (len(configured), len(SIGNALS)))
print("and the one that can costs nothing -- it is an integer already on the span.")`,
          out: `the request:        HTTP 200, 1842 ms, $0.0087, answer correct = False
signals green:      http_5xx, p95_latency, error_rate, cost_per_req
signals that fired: empty_retrieval

signals that CAN catch a wrong answer: 1 of 5
and the one that can costs nothing -- it is an integer already on the span.`,
          notes: [
            { t: "p", text: "**Four of five signals are green on a request that gave a wrong answer**, and that ratio is typical rather than pessimistic. Status, latency, error rate and cost all describe the machinery; none of them describes the output." },
            { t: "p", text: "**The one signal that fired is an integer.** `above_threshold == 0` is a count the retriever already has \u2014 no judge, no labels, no second model call. 10.12 argues this and mean top-1 score are the two alerts to add first in any RAG system, precisely because they cost nothing." },
            { t: "p", text: "The audit is deliberately crude because the conclusion does not need subtlety. If your alert list contains nothing that reads the *content* of a response or the *attributes* of a retrieval, then the quality of your system is unmonitored however good the uptime dashboard looks." }
          ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "An LLM failure is a successful request: HTTP 200, normal latency, normal cost, wrong answer. Every classical signal stays green, so correctness must be instrumented deliberately as its own signal." },
        { t: "p", text: "Three properties make it harder than a service: you cannot replay a failure, a single accuracy number cannot locate a fault in a six-stage pipeline, and the things that break the system most often \u2014 corpus, provider, traffic mix \u2014 leave no trace in your change log. Which is why quality is a production signal, not a release gate." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe already have Datadog on this service. Why do we need anything else for the LLM feature?\u201d**" },
        { t: "p", text: "Because the failure mode of an LLM feature is a successful request. It returns HTTP 200, in normal latency, at normal cost, with no exception \u2014 and the answer is wrong. Every signal Datadog is collecting describes the machinery, and none of them describes the output, so the dashboard can be entirely green over a system that has been giving wrong answers for weeks." },
        { t: "p", text: "Three things make this harder than it sounds. You cannot reproduce a failure by replaying the input, because the same prompt does not give the same output \u2014 so you have to capture the actual request, including the retrieved chunks and the assembled prompt, not just re-run it later. A RAG answer passes through six stages, so one accuracy number tells you the pipeline failed without telling you which stage. And the changes that break it most often leave no trace in your change log: the provider rolling an alias, a nightly re-index, a prompt edited outside version control, or users starting to ask about something you never indexed." },
        { t: "p", text: "So what I would add is not a different tool, it is a different signal. Tracing with domain attributes on each stage, so a bad answer can be attributed to retrieval or generation. Deterministic checks on 100% of traffic \u2014 empty retrieval, missing citation, malformed output \u2014 which cost nothing because they read attributes that already exist. A judge on a small sample for the things a check cannot see. And alerts on those, because a signal that is recorded but not alerted on is a signal nobody looks at." },
        { t: "p", text: "The cheapest version of this is genuinely cheap. The incident I would point at was detectable from a single integer on the retriever span \u2014 the number of chunks that cleared the similarity threshold, which was zero. That needs no judge and no labels. If I could add exactly two alerts to a RAG system they would be that and the mean top-1 similarity score, both of which move hours before answer quality does." },
        { t: "p", text: "And I would push back on treating the eval suite as the answer. A pre-deploy suite tells you whether a change broke the cases you thought of. It cannot tell you the system is working now, and a 200-example suite carries a margin of about five points, so it cannot even resolve a small regression. Production has the volume; the suite has the control. You need both and they do different jobs." }
      ] }
  ],

  takeaways: [
    "**An LLM failure is a successful request** \u2014 HTTP 200, normal latency, normal cost, wrong answer.",
    "**Every classical signal describes the machinery, not the output**, so all of them stay green through a quality incident.",
    "**Correctness has to be instrumented deliberately**; nothing you get for free reports on it.",
    "**Non-determinism means you cannot replay a failure** \u2014 capture the inputs, chunks, assembled prompt and raw output at the time.",
    "**A compound system needs per-stage signals**: one accuracy number says the pipeline failed, not which of six stages did.",
    "**Silent drift needs no deploy** \u2014 a bigger corpus, a rolled provider alias, or a new kind of question all change behaviour invisibly.",
    "**\u201cNobody deployed anything\u201d is not evidence**; your change log does not cover the provider, the index, the prompt dashboard or the traffic mix.",
    "**Quality is a production signal, not a pre-deploy signal** \u2014 if it is only measured at eval time you learn about regressions from customers.",
    "**A 200-example suite carries a \u00b15-point margin**, so it is a filter for clear regressions rather than an instrument for small ones.",
    "**The cheapest quality signals are integers already on a span** \u2014 chunks above threshold, top similarity score, citation present.",
    "**A signal that is recorded but not alerted on is a signal nobody reads**, which is the state most quality metrics are in.",
    "**Four of five typical alerts stay green on a wrong answer**, and the one that fires costs nothing to compute."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why do classical monitoring signals fail to detect an LLM quality problem?",
        options: [
          "Because LLM services are too slow for latency thresholds to be meaningful",
          "Because the failure mode is a successful request \u2014 200, normal latency, normal cost, wrong answer",
          "Because LLM providers do not expose error codes",
          "Because tracing is not supported by most LLM frameworks"
        ],
        answer: 1,
        why: "Status codes, latency, error rate and cost all describe the machinery rather than the content of the output, so a retriever that returns five irrelevant chunks and a model that faithfully summarises them produce a request that is successful at every layer. This is why correctness has to be instrumented as its own signal with its own alerts, rather than inferred from the absence of errors. Latency and errors remain necessary; they are simply not sufficient." },

      { stem: "What does non-determinism specifically force you to change about debugging?",
        options: [
          "You must set temperature to 0 in production so failures become reproducible",
          "You must capture the actual request \u2014 inputs, chunks, assembled prompt, raw output \u2014 because you cannot reproduce the failure by replaying it",
          "You must log every request at DEBUG level rather than INFO",
          "You must run every request twice and compare the outputs"
        ],
        answer: 1,
        why: "Replaying an input does not reproduce the output, so the evidence has to be captured at the time rather than regenerated later. Setting temperature to 0 does not make a server deterministic either \u2014 batch composition alone shifts logits, which was measured at around 2e-04 for an identical prompt in a single process with no sampling. That is why the trace has to hold the retrieved chunks and the assembled prompt, not merely the question and the answer." },

      { stem: "A team says \u201cnothing changed, so the model must have got worse on its own.\u201d What is wrong with that?",
        options: [
          "Nothing \u2014 models do degrade over time as weights decay",
          "The change log covers code but not the provider's weights behind an alias, a re-index, a prompt edited outside version control, or the traffic mix",
          "The statement is unfalsifiable and therefore not worth investigating",
          "Models only change when explicitly fine-tuned, so the claim is correct"
        ],
        answer: 1,
        why: "Each of those four is a deploy of something that influences behaviour, and none of them appears in a git log \u2014 which is why version pins on the model, embedding model, prompt template, index and chunking config are what make \u201cnothing changed\u201d a provable claim rather than an assumption. Weights do not decay in place. The productive reflex is to assume something changed and go and find which of the five it was." },

      { stem: "Why is a pre-deploy eval suite insufficient as a production quality signal?",
        options: [
          "Because eval suites are usually written by the same engineers who wrote the prompt",
          "Because the things that break production \u2014 corpus changes, traffic shifts, provider rolls \u2014 all happen after the suite has passed, and a small suite cannot resolve a small regression anyway",
          "Because offline metrics do not correlate with human judgement",
          "Because eval suites cannot be automated in CI"
        ],
        answer: 1,
        why: "A suite answers whether a change broke the cases it contains, which is a different question from whether the system is working now. The failures that matter most arrive after deploy and are invisible to a fixed dataset. On top of that, a 200-example suite carries roughly a five-point margin, so it cannot resolve small movements \u2014 production has the volume and the suite has the control, and they do different jobs." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Why LLM systems need their own observability",
    questions: [
      { level: "core",
        q: "What is different about observing an LLM system?",
        strong: "A strong answer leads with the silent-success failure mode.",
        answer: [
          { t: "p", text: "The failure mode is a successful request. A classical service tells you it is broken by returning a 500; an LLM service returns 200 with a confidently wrong answer, in normal latency, at normal cost, with no exception raised anywhere." },
          { t: "p", text: "So every signal in a standard monitoring stack stays green through a quality incident, because they all describe the machinery and none of them describes the output. You can have a perfect uptime dashboard over a system that has been wrong for three weeks." },
          { t: "p", text: "Which means correctness has to be instrumented deliberately, with its own storage and its own alerts. The good news is that the cheapest version of it is very cheap \u2014 the number of retrieved chunks above the similarity threshold is an integer the retriever already has, and it is often the single attribute that names the bug." }
        ] },

      { level: "core",
        q: "Why is one accuracy number not enough?",
        strong: "A strong answer connects it to the compound structure.",
        answer: [
          { t: "p", text: "Because the system is a pipeline. A RAG answer passes through embedding, search, reranking, prompt assembly, generation and a guardrail, and one accuracy number tells you the pipeline failed without telling you which of the six stages did it." },
          { t: "p", text: "Worse, two completely different faults look identical from the outside. If the retriever never found the right chunk, and if the retriever found it and the model ignored it, both produce a wrong answer at a normal latency and cost. Only per-stage signals separate them." },
          { t: "p", text: "The pair I would reach for is context recall against faithfulness. Low recall with high faithfulness means the model faithfully summarised context that did not contain the answer, which is a retrieval failure and means the prompt is not the problem. High recall with low faithfulness is the reverse." },
          { t: "p", text: "And an average also hides a cohort. A headline of 60% can be one population at 86% and another at 21%, which are two different bugs with two different fixes \u2014 so I would slice before theorising, not after." }
        ] },

      { level: "advanced",
        q: "Where do LLM systems change without a deploy?",
        strong: "A strong answer names the five unpinned things.",
        answer: [
          { t: "p", text: "Five places, and none of them appears in a git log. The provider\u2019s weights behind a model alias. The index, which a nightly job rebuilds. The embedding model, which has its own version. A prompt template, which is frequently edited in a dashboard rather than in version control. And the mix of questions users ask." },
          { t: "p", text: "That last one is the subtlest because nothing is broken at all \u2014 the job changed. A pipeline built for \u2018what is the refund window\u2019 does not answer \u2018how did the refund policy change between the 2024 and 2026 contracts\u2019, and no amount of prompt tuning gets there." },
          { t: "p", text: "The fix is the same in every case: log a version string and alert on it changing. For the provider specifically, log the requested model and the responding model separately, because when an alias rolls forward only the second one changes \u2014 and that difference is the cheapest possible detector for \u2018the model changed underneath us\u2019." },
          { t: "p", text: "With all five pinned, \u2018nothing changed\u2019 becomes a claim you can check in a query rather than a belief you argue about in a meeting." }
        ] }
    ]
  }
});
