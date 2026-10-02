EC.receiveLesson({
  id: "10.2",

  lede: "Three classical pillars \u2014 metrics, logs, traces \u2014 plus the one LLM systems add, **evals**. Each answers exactly one question and none of them answers another\u2019s. The discipline is the path between them: a metric says *something is wrong*, a slice says *wrong here*, a trace says *wrong at this stage*, a span says *this is the mechanism*, and a log says *this is the cause*. **A metric without a trace tells you that you are bleeding, not where the wound is.**",

  objectives: [
    "Say what each of the four signals answers and what it cannot",
    "Order the four by cardinality and therefore by what you can afford to keep",
    "Walk an incident from metric to cohort to trace to span to log",
    "Explain why evals are a separate signal rather than a kind of metric",
    "Recognise which signal is missing when an investigation stalls"
  ],

  prerequisites: ["10.1"],

  blocks: [

    { t: "h2", n: "01", id: "four", text: "The four signals",
      sub: "One question each" },

    { t: "table",
      head: ["Signal", "Shape", "Answers", "Cardinality"],
      rows: [
        ["**Metrics**", "numbers over time, aggregated", "*Is something wrong, and since when?*", "low \u2014 cheap to keep forever"],
        ["**Logs**", "timestamped text lines", "*What did this component say?*", "high \u2014 sampled or expired"],
        ["**Traces**", "a tree of timed spans per request", "*Where in the pipeline did it go wrong?*", "high \u2014 sampled"],
        ["**Evals**", "scores attached to traces or datasets", "*Was the answer any good?*", "medium \u2014 the LLM-specific one"]
      ] },

    { t: "callout", kind: "insight", title: "Cardinality is what decides your retention policy, not importance",
      body: [
        { t: "p", text: "A metric is a number per time bucket per label combination, so it compresses enormously and you can keep it for years. A trace is a tree of spans with attributes and payloads, so it does not compress and you keep weeks of it. That asymmetry is not a budget decision, it is arithmetic." },
        { t: "p", text: "Which gives the standard split that 10.10 works through: **aggregated metrics forever, payloads for two to four weeks.** Incidents are found in weeks and trends are found in months, so the retention matches the question each signal answers." },
        { t: "p", text: "And it is why the escalation order below runs from cheap to expensive. You do not open traces first because traces are the thing you have least of \u2014 you use a metric to decide which twenty traces are worth opening." }
      ] },

    { t: "h2", n: "02", id: "evals", text: "Why evals are a fourth signal",
      sub: "Not a kind of metric" },

    { t: "callout", kind: "good", title: "An eval score is a judgement about content, attached to a specific request",
      body: [
        { t: "p", text: "A metric is derived from the machinery \u2014 counts, durations, bytes. An eval score is derived from the **meaning** of a request and its response, which means it needs a model or a human to produce, costs money per observation, and carries an uncertainty that a latency measurement does not." },
        { t: "p", text: "That is why it does not fit in the metrics pillar even though it ends up on a dashboard as a number. Faithfulness at 0.91 is the output of a judge with a measured agreement figure \u2014 9.11 found judges flip under swapped ordering, and 9.9 found 80% raw agreement can be a kappa of 0.58. No latency number has that property." },
        { t: "p", text: "The operational consequence is specific: **an eval score must be joinable to the trace that produced it.** A faithfulness score with no trace is a number you cannot act on, and a trace with no score is a request you cannot rank. The join is what makes the pair useful." }
      ] },

    { t: "h2", n: "03", id: "path", text: "The path, in the order you actually use it",
      sub: "Metric to cohort to trace to span to log" },

    { t: "code", lang: "text", title: "One incident, five signals", code: `  METRIC   answer_accuracy fell 95% -> 60%          "something is wrong"
     |
     v
  METRIC   sliced by cohort: new-product queries at 21%   "it is wrong HERE"
     |
     v
  TRACE    open 20 failing requests, look at the retriever span
     |                                              "it is wrong AT THIS STAGE"
     v
  SPAN     retrieve.docs_above_threshold = 0, top_score = 0.31
     |                                              "and this is the mechanism"
     v
  LOG      indexer: "skipped 1,284 files: unsupported content-type application/pdf"
                                                    "and this is the cause"`,
      hl: [1, 4, 13],
      caption: "Five steps, each narrowing by an order of magnitude. This is the whole discipline." },

    { t: "callout", kind: "trap", title: "Every stalled investigation is a missing rung on this ladder",
      body: [
        { t: "p", text: "If you have a metric and no slices, you know the system got worse and cannot say for whom \u2014 and the headline number is a mix of populations that can move for reasons that are not quality at all. 10.13 has a case where three of thirty-five points were a traffic shift rather than a regression." },
        { t: "p", text: "If you have slices and no traces, you know which cohort and not which stage, so the argument becomes \u201cis it retrieval or the prompt?\u201d with no way to settle it. If you have traces and no attributes, you have a tree of span names and a pretty picture \u2014 the mechanism lives in `top_score` and the chunk IDs, not in the shape of the tree." },
        { t: "p", text: "And if you have spans and no logs from the components around them, you reach the mechanism and stop short of the cause. Knowing that nothing cleared the threshold does not tell you that 1,284 PDFs were skipped at ingest three weeks earlier." }
      ] },

    { t: "ladder", title: "The same incident, with each rung missing",
      rungs: [
        { level: "bad", label: "Metric only", why: "You know accuracy fell and nothing else. The next step is a meeting, and the most likely action is someone editing the prompt \u2014 which in a RAG system is usually the wrong knob.", code: `answer_accuracy  0.95 -> 0.60`,
          note: "This is the state most LLM features are actually in." },
        { level: "ok", label: "Metric plus slices", why: "Now you know which population. \u2018The bot cannot answer anything about the product we launched three weeks ago\u2019 is a different bug from \u2018the bot got worse\u2019, and it comes with a suspect.", code: `cohort A (existing docs)  0.96 -> 0.86   60% of traffic
cohort B (new product)    0.86 -> 0.21   40% of traffic`,
          note: "And it reveals that part of the headline drop was a traffic shift, not a regression." },
        { level: "ok", label: "Plus traces with attributes", why: "Now you know the stage and the mechanism. Twenty failing traces all show nothing above the threshold and a top score of 0.31 against a normal 0.78, and every chunk ID comes from the old manual.", code: `retrieve.above_threshold   0     (healthy: 6)
rerank.top_score           0.31  (healthy: 0.78)
retrieve.chunk_ids         all from the OLD manual`,
          note: "The retriever is not misranking the new documents. It has never seen them." },
        { level: "best", label: "Plus the component logs", why: "Now you have the cause, the date and the fix. Everything above said the new documents are not in the index; this says why, and it was logged at INFO three weeks earlier with nothing watching it.", code: `indexer 2026-07-28T02:14Z
  processed 4,102 files, indexed 2,818,
  skipped 1,284: unsupported content-type application/pdf`,
          note: "The incident is not closed until an alert exists that would have caught this on day one." }
      ] },

    { t: "viz", title: "What each signal can and cannot answer", caption: "The arrows are the only path; skipping one is where investigations stall.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="The four observability signals and the escalation path between them">
  <defs><marker id="a102" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)"/></marker></defs>

  <rect x="16" y="30" width="168" height="76" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="100" y="50" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">METRICS</text>
  <text x="100" y="68" text-anchor="middle" class="s-sub">is something wrong,</text>
  <text x="100" y="82" text-anchor="middle" class="s-sub">and since when?</text>
  <text x="100" y="99" text-anchor="middle" class="s-mono" style="font-size:8px">low cardinality &#183; keep forever</text>

  <rect x="206" y="30" width="168" height="76" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="290" y="50" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent)">TRACES</text>
  <text x="290" y="68" text-anchor="middle" class="s-sub">where in the pipeline</text>
  <text x="290" y="82" text-anchor="middle" class="s-sub">did it go wrong?</text>
  <text x="290" y="99" text-anchor="middle" class="s-mono" style="font-size:8px">high &#183; sampled, 2-4 weeks</text>

  <rect x="396" y="30" width="168" height="76" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="480" y="50" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">LOGS</text>
  <text x="480" y="68" text-anchor="middle" class="s-sub">what did this</text>
  <text x="480" y="82" text-anchor="middle" class="s-sub">component say?</text>
  <text x="480" y="99" text-anchor="middle" class="s-mono" style="font-size:8px">high &#183; sampled or expired</text>

  <rect x="586" y="30" width="158" height="76" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="665" y="50" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">EVALS</text>
  <text x="665" y="68" text-anchor="middle" class="s-sub">was the answer</text>
  <text x="665" y="82" text-anchor="middle" class="s-sub">any good?</text>
  <text x="665" y="99" text-anchor="middle" class="s-mono" style="font-size:8px">the LLM-specific one</text>

  <text x="16" y="138" class="s-label">AND THE ONLY PATH THROUGH THEM</text>
  <rect x="16" y="150" width="128" height="30" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="80" y="169" text-anchor="middle" class="s-mono" style="font-size:9px">metric</text>
  <path d="M 148 165 L 170 165" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a102)"/>
  <rect x="174" y="150" width="128" height="30" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="238" y="169" text-anchor="middle" class="s-mono" style="font-size:9px">sliced metric</text>
  <path d="M 306 165 L 328 165" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a102)"/>
  <rect x="332" y="150" width="128" height="30" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="396" y="169" text-anchor="middle" class="s-mono" style="font-size:9px">trace</text>
  <path d="M 464 165 L 486 165" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a102)"/>
  <rect x="490" y="150" width="112" height="30" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="546" y="169" text-anchor="middle" class="s-mono" style="font-size:9px">span attribute</text>
  <path d="M 606 165 L 628 165" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a102)"/>
  <rect x="632" y="150" width="112" height="30" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="688" y="169" text-anchor="middle" class="s-mono" style="font-size:9px">log line</text>

  <text x="80" y="198" text-anchor="middle" class="s-sub">something</text>
  <text x="80" y="210" text-anchor="middle" class="s-sub">is wrong</text>
  <text x="238" y="198" text-anchor="middle" class="s-sub">wrong</text>
  <text x="238" y="210" text-anchor="middle" class="s-sub">HERE</text>
  <text x="396" y="198" text-anchor="middle" class="s-sub">wrong at</text>
  <text x="396" y="210" text-anchor="middle" class="s-sub">THIS STAGE</text>
  <text x="546" y="198" text-anchor="middle" class="s-sub">the</text>
  <text x="546" y="210" text-anchor="middle" class="s-sub">mechanism</text>
  <text x="688" y="198" text-anchor="middle" class="s-sub">the</text>
  <text x="688" y="210" text-anchor="middle" class="s-sub">cause</text>

  <rect x="16" y="232" width="728" height="54" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="34" y="252" class="s-mono" style="font-size:10px;fill:var(--crit)">A METRIC WITHOUT A TRACE TELLS YOU THAT YOU ARE BLEEDING, NOT WHERE THE WOUND IS</text>
  <text x="34" y="272" class="s-sub">every stalled investigation is a missing rung &#183; traces with no attributes are a pretty picture</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Walk your own incident down the ladder", difficulty: "core", minutes: 30,
      body: "Take the last quality problem you investigated. Write down which of the five rungs you actually had, and where the investigation stalled. Then wire the missing rung \u2014 usually it is span attributes rather than traces, because the tree is easy and the domain attributes are the work.",
      requirements: [
        "Record which rungs existed at the time: metric, slice, trace, attribute, log",
        "Name the rung where the investigation stalled and what you did instead",
        "Wire the missing rung for next time",
        "Check that your eval scores are joinable to a trace ID",
        "State the retention you keep for each signal and whether it matches the question"
      ],
      hint: "If you ended up guessing at the prompt, the missing rung was almost certainly span attributes \u2014 the prompt is the most visible knob and in a RAG system it is usually the wrong one.",
      solution: { lang: "python", title: "an escalation audit over one incident", code: `RUNGS = ["metric", "sliced_metric", "trace", "span_attributes", "component_logs"]

INCIDENT = {
    "metric":          {"had": True,  "value": "accuracy 0.95 -> 0.60"},
    "sliced_metric":   {"had": True,  "value": "cohort B 0.86 -> 0.21 at 40% of traffic"},
    "trace":           {"had": True,  "value": "20 failing requests opened"},
    "span_attributes": {"had": False, "value": "span names only, no top_score or chunk_ids"},
    "component_logs":  {"had": True,  "value": "indexer logs retained 30 days"},
}

def walk(incident):
    for i, rung in enumerate(RUNGS):
        r = incident[rung]
        mark = "ok " if r["had"] else "GAP"
        print("  %d. %-16s %s  %s" % (i + 1, rung, mark, r["value"]))
        if not r["had"]:
            return rung
    return None

print("escalation walk:")
stalled = walk(INCIDENT)
print()
if stalled:
    print("stalled at: %s" % stalled)
    print("everything below it is unreachable, however good it is --")
    print("the logs were retained and nobody got far enough to read them.")

# what the gap cost
print()
print("the trace tree without attributes answers: 'retrieval took 624 ms'")
print("the attribute answers:                     'retrieval returned 0 usable chunks'")
print("only the second one names the bug, and it is one integer.")`,
          out: `escalation walk:
  1. metric           ok   accuracy 0.95 -> 0.60
  2. sliced_metric    ok   cohort B 0.86 -> 0.21 at 40% of traffic
  3. trace            ok   20 failing requests opened
  4. span_attributes  GAP  span names only, no top_score or chunk_ids

stalled at: span_attributes
everything below it is unreachable, however good it is --
the logs were retained and nobody got far enough to read them.

the trace tree without attributes answers: 'retrieval took 624 ms'
the attribute answers:                     'retrieval returned 0 usable chunks'
only the second one names the bug, and it is one integer.`,
          notes: [
            { t: "p", text: "**The stall is at rung four, and that is the typical place.** Getting a trace tree is nearly free \u2014 framework auto-instrumentation hands it to you. Getting `top_score`, `above_threshold` and the chunk IDs onto the retriever span is work nobody has done, and those are the attributes that resolve incidents." },
            { t: "p", text: "**Note what the gap costs downstream.** The indexer logs were retained for thirty days and contained the answer in plain text. Nobody read them, because the investigation never got far enough to know which component to look at. A missing rung does not slow the walk down, it ends it." },
            { t: "p", text: "The last two lines are the comparison worth internalising. A trace without domain attributes answers a latency question very well and a quality question not at all \u2014 \u2018retrieval took 624 ms\u2019 is true, green, and useless here." }
          ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Four signals, one question each: metrics say whether something is wrong and since when, traces say where in the pipeline, logs say what a component said, and evals say whether the answer was any good. Evals are separate because they judge meaning, cost money per observation, and carry an uncertainty no latency number has." },
        { t: "p", text: "The discipline is the path: metric, slice, trace, span attribute, log. Each rung narrows by an order of magnitude, and every stalled investigation is a rung you did not have \u2014 most often span attributes, because the tree is free and the domain attributes are the work." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWalk me through how you would debug a quality regression in a RAG system.\u201d**" },
        { t: "p", text: "I would walk down five rungs in order, because each one narrows the search by about an order of magnitude and skipping one is where investigations stall. The metric tells me something is wrong and since when. A sliced metric tells me it is wrong *here*. A trace tells me it is wrong at *this stage*. A span attribute gives me the mechanism. And a component log gives me the cause." },
        { t: "p", text: "Concretely: accuracy fell from 95 to 60. Slice by cohort, document type, tenant, intent and language, and the drop concentrates in one cohort at 21% while the other sits at 86% \u2014 that converts \u2018the bot got worse\u2019 into \u2018the bot cannot answer anything about a product we launched three weeks ago\u2019, which is a different bug with a different fix. It also tends to reveal that part of the headline drop was a traffic shift rather than a regression at all." },
        { t: "p", text: "Then twenty failing traces from that cohort, and I read the retriever span rather than the answer. If nothing cleared the similarity threshold and the top score is 0.31 against a normal 0.78, and every chunk ID comes from the old manual, then the retriever is not misranking the new documents \u2014 it has never seen them. Then the indexer log for the day they landed, which in that case said 1,284 PDFs skipped as an unsupported content type, logged at INFO with nothing watching it." },
        { t: "p", text: "The rung people are missing is almost always the fourth. A trace tree is nearly free from framework auto-instrumentation, so teams have traces; what they do not have is `above_threshold`, `top_score` and the chunk IDs on the retriever span. Without those a trace answers \u2018retrieval took 624 milliseconds\u2019 very well and the quality question not at all." },
        { t: "p", text: "I would also check the eval scores are joinable to trace IDs, because a faithfulness score with no trace is a number you cannot act on, and a trace with no score is a request you cannot rank. The join is what lets you pull the twenty worst answers of the day rather than twenty random ones." },
        { t: "p", text: "And the last step is not a fix, it is the alert. The incident is not closed until a detector exists that would have caught it on day one \u2014 here, empty-retrieval rate above two per cent, which comes free off the span and would have fired three weeks earlier." }
      ] }
  ],

  takeaways: [
    "**Four signals, one question each**: metrics (is something wrong, since when), logs (what did a component say), traces (where in the pipeline), evals (was the answer any good).",
    "**Cardinality decides retention, not importance** \u2014 aggregated metrics forever, payloads two to four weeks, because incidents are found in weeks and trends in months.",
    "**Evals are a fourth signal, not a kind of metric**: they judge meaning, need a model or a human, cost money per observation, and carry uncertainty.",
    "**An eval score must be joinable to its trace** \u2014 a score with no trace cannot be acted on, a trace with no score cannot be ranked.",
    "**The path is metric \u2192 slice \u2192 trace \u2192 span attribute \u2192 log**, each rung narrowing by an order of magnitude.",
    "**A metric without a trace tells you that you are bleeding, not where the wound is.**",
    "**Every stalled investigation is a missing rung**, and a missing rung does not slow the walk \u2014 it ends it.",
    "**The rung most often missing is span attributes**, because the trace tree is free from auto-instrumentation and the domain attributes are the work.",
    "**A trace without attributes is a pretty picture** \u2014 it answers a latency question well and a quality question not at all.",
    "**Slice before theorising**: a headline number is a mix of populations and can move for reasons that are not quality.",
    "**You open traces last, not first**, because traces are the signal you have least of \u2014 the metric chooses which twenty to open.",
    "**The incident is not closed until the detector exists**, which for this one was a free integer off the retriever span."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why are evals treated as a separate signal rather than as metrics?",
        options: [
          "Because they are computed offline rather than in production",
          "Because they judge the meaning of a request and response \u2014 needing a model or human, costing money per observation, and carrying uncertainty no latency number has",
          "Because they are stored in a different database from metrics",
          "Because they are only available for text outputs"
        ],
        answer: 1,
        why: "Metrics are derived from the machinery \u2014 counts, durations, bytes \u2014 while an eval score is a judgement about content, which is a different kind of observation with a different cost and reliability profile. Judges flip under swapped ordering and 80% raw agreement can be a kappa of 0.58, so an eval score needs its agreement figure reported alongside it in a way that a latency measurement never does. Evals also run on live traffic, not only offline." },

      { stem: "An investigation knows accuracy fell and has traces open, but cannot decide whether retrieval or the prompt is at fault. Which rung is missing?",
        options: [
          "Component logs \u2014 the cause is always in a log line",
          "Span attributes \u2014 the tree gives stage timings, but the mechanism lives in top_score, above_threshold and the chunk IDs",
          "Metrics \u2014 the drop has not been confirmed as statistically real",
          "Evals \u2014 the answers have not been scored by a judge"
        ],
        answer: 1,
        why: "A trace tree without domain attributes can tell you retrieval took 624 milliseconds, which does not distinguish a retriever that found nothing from a model that ignored what it found. The attributes that settle it are the number of chunks above the similarity threshold, the top score, and the chunk IDs. This is the rung teams most often lack, because auto-instrumentation supplies the tree for free while the domain attributes have to be added by hand." },

      { stem: "Why do you open traces after slicing the metric rather than before?",
        options: [
          "Because traces are expensive to query and slicing warms the cache",
          "Because traces are the signal you keep least of, so the sliced metric is what tells you which twenty are worth opening",
          "Because traces are only generated for failed requests",
          "Because slicing a metric requires a trace ID as input"
        ],
        answer: 1,
        why: "Traces do not compress and are sampled and expired within weeks, so you have far fewer of them than metric points and cannot browse them. The sliced metric identifies the population that moved, which turns \u201copen some traces\u201d into \u201copen twenty failing traces from this cohort and twenty healthy ones from before.\u201d That pairing is what makes reading them productive rather than anecdotal." },

      { stem: "What does it mean that aggregated metrics are kept forever and payloads for two to four weeks?",
        options: [
          "That metrics are more important than traces for debugging",
          "That retention matches the question each signal answers \u2014 incidents are found in weeks, trends in months \u2014 and follows from cardinality rather than from budget preference",
          "That payload storage is unreliable beyond a month",
          "That traces should be deleted once an incident closes"
        ],
        answer: 1,
        why: "A metric is a number per time bucket per label combination and compresses enormously; a trace is a tree of spans with attributes and text payloads and does not. That asymmetry is arithmetic rather than policy, and the resulting split happens to align with what each signal is for \u2014 you investigate an incident within weeks of it happening, but you compare against a baseline from months ago." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The four signals",
    questions: [
      { level: "foundation",
        q: "What are the four observability signals for an LLM system?",
        strong: "A strong answer gives the question each one answers.",
        answer: [
          { t: "p", text: "Metrics, logs and traces \u2014 the three classical pillars \u2014 plus evals, which is the one LLM systems add. Each answers exactly one question." },
          { t: "p", text: "Metrics are numbers over time and answer \u2018is something wrong, and since when\u2019. Logs are timestamped text and answer \u2018what did this component say\u2019. Traces are a tree of timed spans per request and answer \u2018where in the pipeline did it go wrong\u2019. Evals are scores attached to traces and answer \u2018was the answer any good\u2019." },
          { t: "p", text: "The one that does not exist in a normal service is the last, and it is the one that matters most here, because in an LLM system quality is the thing that fails while everything else stays green." },
          { t: "p", text: "Their cardinality also differs by orders of magnitude, which is what sets retention: metrics compress and you keep them forever, traces and logs do not and you keep weeks." }
        ] },

      { level: "core",
        q: "What does a metric not tell you?",
        strong: "A strong answer gets to localisation.",
        answer: [
          { t: "p", text: "Where. A metric without a trace tells you that you are bleeding, not where the wound is \u2014 it establishes that something changed and when, and that is genuinely the first thing you need, but it stops there." },
          { t: "p", text: "It also hides a population. A headline accuracy is an average over a mix, so it can move because one cohort collapsed, or because traffic shifted towards a harder cohort with nothing having regressed at all. Those are different situations and the average cannot distinguish them." },
          { t: "p", text: "So the first move after a metric is a slice, not a trace: cohort, tenant, document type, intent, language, model version. That is cheap, it is still a metric query, and it frequently reframes the whole incident." },
          { t: "p", text: "Only then do traces earn their keep, because they are the signal you have least of \u2014 the slice is what tells you which twenty traces to open." }
        ] },

      { level: "core",
        q: "Why keep metrics forever but traces for weeks?",
        strong: "A strong answer reasons from cardinality.",
        answer: [
          { t: "p", text: "Because of what each one is. A metric is a number per time bucket per label combination, so it compresses enormously \u2014 years of it costs very little. A trace is a tree of spans with attributes and payload text, and it does not compress at all." },
          { t: "p", text: "That asymmetry is arithmetic rather than a budget preference, and it happens to match the questions. You investigate an incident within weeks of it happening, so payloads for two to four weeks is enough. You compare against a baseline from months or a year ago, which is a metric question." },
          { t: "p", text: "The practical policy that follows is metadata on 100% of requests forever, payloads tail-sampled and expired. And tail-sampled specifically \u2014 keep every error, every slow request and every low-scoring answer, plus a small random share of the rest." },
          { t: "p", text: "Head sampling at five per cent would cut volume about twenty-fold, but it keeps only five per cent of the failures, which are exactly the traces you will want. That is the whole argument for deciding after the request rather than before." }
        ] }
    ]
  }
});
