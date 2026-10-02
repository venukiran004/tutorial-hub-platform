EC.receiveLesson({
  id: "10.9",

  lede: "Eight tools, and the honest summary is that they differ less in capability than in **shape**: hosted or self-hosted, framework-native or agnostic, eval-first or monitoring-first, platform or library. Picking well is mostly a matter of answering four questions about your own constraints \u2014 and recognising that two entries on the list are not backends at all, they are the metric implementations that the backends call.",

  objectives: [
    "Distinguish the shapes: hosted platform, self-hostable, library, infrastructure",
    "Match a tool to a constraint rather than to a feature list",
    "Recognise which entries compute scores and which store traces",
    "State what you give up by choosing the infrastructure route",
    "Avoid the lock-in that makes a later change expensive"
  ],

  prerequisites: ["10.8"],

  blocks: [

    { t: "h2", n: "01", id: "landscape", text: "The landscape",
      sub: "Sorted by shape, not by preference" },

    { t: "table",
      head: ["Tool", "Shape", "Strongest at", "Watch out for"],
      rows: [
        ["**LangSmith**", "hosted, LangChain-native", "zero-effort tracing of LangChain/LangGraph, datasets, online evaluators", "best value inside the LangChain ecosystem"],
        ["**Langfuse**", "open source, self-hostable", "traces plus prompt management and cost tracking, framework-agnostic", "you run it, you scale it"],
        ["**Arize Phoenix**", "open source, OpenInference/OTel", "retrieval debugging, embedding drift visualisation, runs locally in a notebook", "more analysis tool than 24/7 platform"],
        ["**W&B Weave**", "hosted", "experiment lineage from training through to production traces", "heavier if you only need traces"],
        ["**Braintrust**", "hosted", "eval-first workflow, scoring and comparing prompt versions", "eval focus over live monitoring"],
        ["**TruLens**", "open source", "feedback functions, the RAG triad of groundedness / relevance / context relevance", "smaller ecosystem"],
        ["**Ragas / DeepEval**", "libraries", "the metric implementations themselves \u2014 faithfulness, context recall, precision", "they compute scores, they are not a backend"],
        ["**OTel + Grafana / Jaeger / Tempo**", "infrastructure", "one pane of glass with the rest of your services, no vendor lock-in", "you build the LLM-specific views yourself"]
      ] },

    { t: "callout", kind: "trap", title: "Two rows on that list are not alternatives to the others",
      body: [
        { t: "p", text: "Ragas and DeepEval compute metrics. They do not store traces, they have no UI, they do not alert, and they are not a competitor to LangSmith \u2014 they are the thing a backend calls to produce a faithfulness number. Several of the hosted platforms use them or something equivalent internally." },
        { t: "p", text: "Treating them as a platform choice is a category error that leads to the wrong question (\u2018should we use Ragas or Langfuse?\u2019) instead of the right one (\u2018which backend, and which metric library does it call?\u2019). The answer can be both." },
        { t: "p", text: "9.17\u2019s point applies here too: the metric implementation determines the number. Ragas\u2019 faithfulness and a hand-rolled claim-extraction judge are different measurements with the same name, so the library is part of the definition you report." }
      ] },

    { t: "h2", n: "02", id: "choose", text: "How to choose",
      sub: "One line each" },

    { t: "dl", items: [
      { k: "Already on LangChain and want it working this afternoon", v: "**LangSmith.** The callbacks give you the tree with no instrumentation at all, which is the single biggest time saving available \u2014 though it is also where the lock-in sits." },
      { k: "Data cannot leave your VPC", v: "**Langfuse self-hosted.** This is usually a constraint rather than a preference, and it eliminates most of the list immediately, which makes it the easiest decision on this page." },
      { k: "The problem is specifically retrieval quality", v: "**Phoenix.** Embedding drift visualisation and retrieval debugging are what it is for, and it runs in a notebook \u2014 so it is an instrument you pick up rather than a platform you adopt." },
      { k: "You already run Grafana and want LLM traces beside service traces", v: "**OTel** with an LLM dashboard on top. One pane of glass, no lock-in, and you build the LLM-specific views yourself." }
    ] },

    { t: "callout", kind: "tradeoff", title: "The infrastructure route trades build time for independence, and the trade is worse than it looks",
      body: [
        { t: "p", text: "Going OTel plus Grafana gives you no vendor lock-in and LLM traces next to your service traces, which is genuinely valuable in an incident where the question is whether the problem is even in the LLM path." },
        { t: "p", text: "What you build yourself is more than dashboards. Trace payload storage with sensible truncation, the retrieval-debugging views, the judge-scoring pipeline, the dataset and regression-run machinery, the prompt registry. Each of those is a week to a month, and 10.10\u2019s payload sizing shows why the storage half is not trivial." },
        { t: "p", text: "The honest reading is that the infrastructure route is right when the constraint is hard \u2014 compliance, or an existing observability investment you will not duplicate \u2014 and expensive when it is chosen on principle. 10.14\u2019s minimal setup is the useful middle: instrument with OTel so the data is portable, and send it somewhere that already has the views." }
      ] },

    { t: "callout", kind: "good", title: "Instrument with the standard, whatever backend you pick",
      body: [
        { t: "p", text: "This is the one recommendation that survives every constraint. If your spans carry the GenAI conventions from 10.8, then changing backend is a configuration change rather than a re-instrumentation project \u2014 which matters because this tool category is young and consolidating." },
        { t: "p", text: "The practical version: auto-instrument with an OpenInference or OTel instrumentor rather than a vendor-specific callback where you have the choice, and add your domain attributes with `set_attribute` rather than a vendor helper. Both are the same amount of work." },
        { t: "p", text: "Where that is not possible \u2014 LangSmith\u2019s LangChain integration is genuinely better than the generic path \u2014 take the integration and accept the cost knowingly. A deliberate lock-in you have priced is a reasonable engineering decision; an accidental one is not." }
      ] },

    { t: "viz", title: "Four shapes, four constraints", caption: "The constraint picks the shape; the shape narrows the list to one or two.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="LLM observability tools sorted by shape against the constraint each suits">
  <text x="16" y="20" class="s-label">START FROM THE CONSTRAINT, NOT THE FEATURE LIST</text>

  <rect x="16" y="32" width="176" height="104" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="104" y="52" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--accent)">HOSTED PLATFORM</text>
  <text x="104" y="72" text-anchor="middle" class="s-mono" style="font-size:9px">LangSmith</text>
  <text x="104" y="88" text-anchor="middle" class="s-mono" style="font-size:9px">Braintrust</text>
  <text x="104" y="104" text-anchor="middle" class="s-mono" style="font-size:9px">W&amp;B Weave</text>
  <text x="104" y="126" text-anchor="middle" class="s-sub">fastest to value</text>

  <rect x="200" y="32" width="176" height="104" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="288" y="52" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">SELF-HOSTABLE</text>
  <text x="288" y="72" text-anchor="middle" class="s-mono" style="font-size:9px">Langfuse</text>
  <text x="288" y="88" text-anchor="middle" class="s-mono" style="font-size:9px">Phoenix</text>
  <text x="288" y="104" text-anchor="middle" class="s-mono" style="font-size:9px">TruLens</text>
  <text x="288" y="126" text-anchor="middle" class="s-sub">data stays in your VPC</text>

  <rect x="384" y="32" width="176" height="104" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="472" y="52" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">LIBRARY</text>
  <text x="472" y="72" text-anchor="middle" class="s-mono" style="font-size:9px">Ragas</text>
  <text x="472" y="88" text-anchor="middle" class="s-mono" style="font-size:9px">DeepEval</text>
  <text x="472" y="110" text-anchor="middle" class="s-sub">NOT a backend &#8212; these</text>
  <text x="472" y="124" text-anchor="middle" class="s-sub">compute the scores</text>

  <rect x="568" y="32" width="176" height="104" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="656" y="52" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--violet)">INFRASTRUCTURE</text>
  <text x="656" y="72" text-anchor="middle" class="s-mono" style="font-size:9px">OTel + Grafana</text>
  <text x="656" y="88" text-anchor="middle" class="s-mono" style="font-size:9px">Jaeger / Tempo</text>
  <text x="656" y="110" text-anchor="middle" class="s-sub">no lock-in, and you</text>
  <text x="656" y="124" text-anchor="middle" class="s-sub">build the views</text>

  <line x1="16" y1="152" x2="744" y2="152" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="174" class="s-label">AND THE DECISION, ONE LINE EACH</text>

  <rect x="16" y="184" width="728" height="22" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="28" y="199" class="s-mono" style="font-size:9px">already on LangChain, want it working today</text>
  <text x="520" y="199" class="s-mono" style="font-size:9px;fill:var(--accent)">-&gt; LangSmith</text>

  <rect x="16" y="210" width="728" height="22" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="28" y="225" class="s-mono" style="font-size:9px">data cannot leave the VPC</text>
  <text x="520" y="225" class="s-mono" style="font-size:9px;fill:var(--good)">-&gt; Langfuse, self-hosted</text>

  <rect x="16" y="236" width="728" height="22" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="28" y="251" class="s-mono" style="font-size:9px">the problem is specifically retrieval quality</text>
  <text x="520" y="251" class="s-mono" style="font-size:9px;fill:var(--warn)">-&gt; Phoenix</text>

  <rect x="16" y="262" width="728" height="22" rx="3" class="s-fill" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="28" y="277" class="s-mono" style="font-size:9px">already run Grafana, want one pane of glass</text>
  <text x="520" y="277" class="s-mono" style="font-size:9px;fill:var(--violet)">-&gt; OTel + a dashboard</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Choose a backend from your constraints", difficulty: "foundation", minutes: 25,
      body: "Write down your actual constraints \u2014 data residency, existing observability investment, framework, team size, whether the pressing problem is retrieval or generation \u2014 and let them narrow the list. Then price the thing you would have to build yourself under the infrastructure route, so the comparison is honest.",
      requirements: [
        "Constraints listed before any tool is named",
        "The shape each constraint implies",
        "The surviving candidates, with the reason each other option was eliminated",
        "What you would build yourself under the OTel route, with a time estimate per piece",
        "A statement of whether any lock-in you are accepting is deliberate"
      ],
      hint: "If a hard constraint eliminates most of the list, stop there \u2014 the decision is made and comparing feature matrices is wasted effort. The interesting case is when nothing is eliminated.",
      solution: { lang: "python", title: "constraint-driven elimination", code: `TOOLS = {
    "LangSmith":  {"shape": "hosted",    "self_host": False, "framework": "langchain",
                   "retrieval_debug": False, "eval_first": True,  "is_backend": True},
    "Langfuse":   {"shape": "self-host", "self_host": True,  "framework": "any",
                   "retrieval_debug": False, "eval_first": False, "is_backend": True},
    "Phoenix":    {"shape": "self-host", "self_host": True,  "framework": "any",
                   "retrieval_debug": True,  "eval_first": False, "is_backend": True},
    "Weave":      {"shape": "hosted",    "self_host": False, "framework": "any",
                   "retrieval_debug": False, "eval_first": False, "is_backend": True},
    "Braintrust": {"shape": "hosted",    "self_host": False, "framework": "any",
                   "retrieval_debug": False, "eval_first": True,  "is_backend": True},
    "TruLens":    {"shape": "self-host", "self_host": True,  "framework": "any",
                   "retrieval_debug": False, "eval_first": False, "is_backend": True},
    "Ragas":      {"shape": "library",   "self_host": True,  "framework": "any",
                   "retrieval_debug": False, "eval_first": True,  "is_backend": False},
    "OTel+Grafana": {"shape": "infra",   "self_host": True,  "framework": "any",
                   "retrieval_debug": False, "eval_first": False, "is_backend": True},
}

CONSTRAINTS = {
    "data_must_stay_in_vpc": True,
    "framework": "any",                 # not on LangChain
    "pressing_problem": "retrieval",
    "team_can_run_infra": True,
    "existing_grafana": False,
}

def eliminate(tools, c):
    alive, dead = {}, {}
    for name, t in tools.items():
        if not t["is_backend"]:
            dead[name] = "not a backend -- computes scores, does not store traces"
        elif c["data_must_stay_in_vpc"] and not t["self_host"]:
            dead[name] = "hosted, and data cannot leave the VPC"
        elif t["framework"] != "any" and t["framework"] != c["framework"]:
            dead[name] = "framework-specific (%s)" % t["framework"]
        else:
            alive[name] = t
    return alive, dead

alive, dead = eliminate(TOOLS, CONSTRAINTS)
print("eliminated:")
for name, why in dead.items():
    print("  %-14s %s" % (name, why))
print()
print("surviving: %s" % ", ".join(sorted(alive)))
print()
if CONSTRAINTS["pressing_problem"] == "retrieval":
    best = [n for n, t in alive.items() if t["retrieval_debug"]]
    print("pressing problem is retrieval -> %s has the retrieval views" % (best or "none"))

# what the infra route costs you in build time
print()
print("=" * 64)
print("WHAT YOU BUILD YOURSELF UNDER THE OTel ROUTE")
print("=" * 64)
BUILD = [
    ("payload storage with truncation",  10),
    ("retrieval debugging views",        10),
    ("judge scoring pipeline",           15),
    ("dataset and regression runner",    20),
    ("prompt registry",                  15),
    ("tail sampling rules",               5),
    ("PII redaction at export",           8),
]
total = 0
for piece, days in BUILD:
    total += days
    print("  %-34s %3d days" % (piece, days))
print("  %-34s %3d days (%.1f months of one engineer)"
      % ("TOTAL", total, total / 21.0))
print()
print("that is the real price of 'no vendor lock-in' -- worth paying when the")
print("constraint is hard, and expensive when it is chosen on principle.")`,
        out: `eliminated:
  LangSmith      hosted, and data cannot leave the VPC
  Weave          hosted, and data cannot leave the VPC
  Braintrust     hosted, and data cannot leave the VPC
  Ragas          not a backend -- computes scores, does not store traces

surviving: Langfuse, OTel+Grafana, Phoenix, TruLens

pressing problem is retrieval -> ['Phoenix'] has the retrieval views

================================================================
WHAT YOU BUILD YOURSELF UNDER THE OTel ROUTE
================================================================
  payload storage with truncation     10 days
  retrieval debugging views           10 days
  judge scoring pipeline              15 days
  dataset and regression runner       20 days
  prompt registry                     15 days
  tail sampling rules                  5 days
  PII redaction at export              8 days
  TOTAL                               83 days (4.0 months of one engineer)

that is the real price of 'no vendor lock-in' -- worth paying when the
constraint is hard, and expensive when it is chosen on principle.`,
        notes: [
          { t: "p", text: "**One hard constraint eliminated half the list in one line.** Data residency removed three hosted platforms immediately, which is why constraints belong before feature comparisons \u2014 the interesting evaluation is over four candidates, not eight." },
          { t: "p", text: "**Ragas was eliminated for a different reason and it is the important one.** It is not a weaker backend, it is not a backend at all. Keeping it in a platform comparison produces the wrong question; the right one is which backend you run and which metric library it calls, and the answer can include Ragas." },
          { t: "p", text: "**The build estimate is the number worth arguing about.** 83 days \u2014 four months of one engineer \u2014 is my estimate rather than a measurement, and I would expect a team with an existing Grafana investment to come in well under it and a team without one to come in over. The point is that the comparison is not \u2018free versus paid\u2019." },
          { t: "p", text: "**Note what dominates that estimate.** The dataset and regression runner at 20 days and the prompt registry at 15 are not observability at all \u2014 they are 12.1 and 12.2, and the hosted platforms bundle them. If you already have those, the infra route is much cheaper than this suggests." },
          { t: "p", text: "Phoenix surviving *and* matching the pressing problem is a convenient outcome rather than a general result. It is an analysis tool more than a 24/7 platform, so the realistic answer here is Phoenix for the retrieval investigation now and Langfuse as the thing that runs continuously \u2014 which is a pairing, not a choice." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Four shapes: hosted platform, self-hostable, library, infrastructure. Start from your constraints \u2014 data residency, existing investment, framework, whether the pressing problem is retrieval \u2014 and the constraint picks the shape, which narrows eight tools to one or two. A hard constraint makes the decision; feature matrices only matter when nothing is eliminated." },
        { t: "p", text: "Ragas and DeepEval are not backends, they are the metric implementations a backend calls. And whatever you choose, instrument with the GenAI conventions so a change of backend is configuration rather than a project \u2014 taking a vendor integration is fine when the lock-in is deliberate and priced." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhich LLM observability tool should we use?\u201d**" },
        { t: "p", text: "I would not start from the tools, because the constraints usually make the decision. The ones that matter are: can data leave your network, are you on LangChain, do you already run Grafana or similar, and is the pressing problem retrieval quality or generation quality." },
        { t: "p", text: "Data residency is the most decisive. When I ran that elimination, a requirement that data stays in the VPC removed three hosted platforms in one line and left four candidates \u2014 so the interesting comparison was over half the list, and the feature matrices for the other half were wasted reading." },
        { t: "p", text: "Then the shortcuts. Already on LangChain and want it working this afternoon: LangSmith, because the callbacks give you the tree with no instrumentation, which is the biggest single time saving available. Data must stay in the VPC: Langfuse self-hosted. The problem is specifically retrieval: Phoenix, which is really an instrument you pick up in a notebook rather than a platform you adopt. Already running Grafana: OpenTelemetry with an LLM dashboard on top." },
        { t: "p", text: "One thing I would correct in most comparisons: Ragas and DeepEval are not alternatives to the others. They compute metrics \u2014 faithfulness, context recall, precision \u2014 and they have no storage, no UI and no alerting. Several hosted platforms call them or something equivalent internally. So the question is which backend, and which metric library it calls, and the answer can be both." },
        { t: "p", text: "On the no-lock-in route I would be honest about the price. Building it on OTel plus Grafana means building payload storage with truncation, retrieval views, a judge scoring pipeline, a dataset and regression runner, a prompt registry, tail sampling and PII redaction at export. My estimate is roughly four months of one engineer, and the two biggest items \u2014 the regression runner and the prompt registry \u2014 are not observability at all. It is worth paying when the constraint is hard and expensive when it is chosen on principle." },
        { t: "p", text: "The recommendation that survives every version of this is to instrument with the GenAI semantic conventions regardless of backend, so that changing backend is a configuration change. This category is young and consolidating. And where a vendor integration is genuinely better than the generic path, take it \u2014 but price the lock-in rather than acquiring it by accident." }
      ] }
  ],

  takeaways: [
    "**Four shapes, not eight tools**: hosted platform, self-hostable, library, infrastructure.",
    "**Start from constraints, not features** \u2014 one hard constraint typically eliminates half the list in a line.",
    "**Ragas and DeepEval are not backends**; they compute the scores a backend stores and displays.",
    "**The right question is which backend and which metric library it calls**, and the answer can be both.",
    "**The metric implementation is part of the definition** \u2014 Ragas faithfulness and a hand-rolled judge are different measurements with the same name.",
    "**LangChain plus speed \u2192 LangSmith**, where the callbacks give you the tree with no instrumentation.",
    "**Data cannot leave the VPC \u2192 Langfuse self-hosted**, and that constraint alone decides it.",
    "**Retrieval quality specifically \u2192 Phoenix**, which is an instrument you pick up rather than a platform you adopt.",
    "**Existing Grafana \u2192 OTel with LLM views on top**, accepting that you build the views.",
    "**The infrastructure route costs roughly four months of one engineer** by my estimate, and two of the biggest pieces are not observability.",
    "**Instrument with the GenAI conventions whatever you choose**, so a backend change is configuration rather than a project.",
    "**A deliberate, priced lock-in is a reasonable decision**; an accidental one is not."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why are Ragas and DeepEval not alternatives to LangSmith or Langfuse?",
        options: [
          "Because they are open source and the others are hosted",
          "Because they compute metric scores and have no trace storage, UI or alerting \u2014 they are what a backend calls",
          "Because they only support offline evaluation, not production traffic",
          "Because they lack OpenTelemetry support"
        ],
        answer: 1,
        why: "They are libraries that produce numbers such as faithfulness and context recall, and several hosted platforms call them or an equivalent internally, so treating them as a platform choice produces the wrong question. The right framing is which backend you run and which metric library it calls \u2014 and because the implementation determines the number, the library is part of the metric definition you report." },

      { stem: "What should drive the choice of observability backend?",
        options: [
          "A feature matrix comparison across all candidates",
          "Your constraints \u2014 data residency, framework, existing investment, and whether the pressing problem is retrieval or generation",
          "The size of each tool's community and release cadence",
          "Whichever tool the model provider recommends"
        ],
        answer: 1,
        why: "A single hard constraint typically eliminates half the list in one step: requiring that data stay inside the VPC removed three hosted platforms immediately in the worked elimination, leaving four candidates to actually evaluate. Feature comparisons are only the deciding factor in the rarer case where no constraint eliminates anything, and reading matrices for already-excluded tools is wasted effort." },

      { stem: "What is the real cost of the \u201cno vendor lock-in\u201d route?",
        options: [
          "Higher storage costs, since self-hosted retention is less efficient",
          "The pieces you build yourself \u2014 payload storage, retrieval views, a judge pipeline, a regression runner, a prompt registry, sampling and redaction",
          "Slower trace ingestion than a hosted collector",
          "Loss of OpenTelemetry compatibility"
        ],
        answer: 1,
        why: "On a rough estimate that is around four months of one engineer, and notably the two largest items \u2014 the dataset and regression runner, and the prompt registry \u2014 are not observability at all but the operational tooling that hosted platforms bundle. That makes the comparison \u201cpaid platform versus four months of build\u201d rather than \u201cfree versus paid,\u201d which is worth paying when a constraint is hard and expensive when chosen on principle." },

      { stem: "What recommendation holds regardless of which backend you pick?",
        options: [
          "Self-host, so data never leaves your network",
          "Instrument with the GenAI semantic conventions, so changing backend is a configuration change rather than a re-instrumentation project",
          "Use a framework-native integration for the richest traces",
          "Keep payloads for 90 days to allow retrospective analysis"
        ],
        answer: 1,
        why: "The tool category is young and consolidating, so the probability of changing backend within a couple of years is high, and standard attribute names are what make that cheap. Framework-native integrations are sometimes genuinely better and worth taking \u2014 the distinction that matters is whether the resulting lock-in was priced deliberately or acquired by accident." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The tool landscape",
    questions: [
      { level: "foundation",
        q: "How would you pick an LLM observability tool?",
        strong: "A strong answer starts from constraints.",
        answer: [
          { t: "p", text: "From the constraints, because they usually decide it. Can data leave the network, are we on LangChain, do we already run Grafana, and is the pressing problem retrieval or generation." },
          { t: "p", text: "Data residency is the most decisive one \u2014 requiring data to stay in the VPC eliminates the hosted platforms in a single step and leaves a much smaller set to actually evaluate." },
          { t: "p", text: "The shortcuts after that are short. LangChain plus urgency means LangSmith. VPC-only means Langfuse self-hosted. A retrieval problem means Phoenix, which runs in a notebook. An existing Grafana investment means OpenTelemetry with LLM views on top." },
          { t: "p", text: "And whatever I picked, I would instrument with the GenAI conventions, so a change of backend is configuration rather than a project. This category is consolidating." }
        ] },

      { level: "core",
        q: "Someone proposes \u201cRagas or Langfuse?\u201d. How do you respond?",
        strong: "A strong answer names the category error.",
        answer: [
          { t: "p", text: "That they are not the same kind of thing, so the question has no answer. Langfuse stores traces, displays them, and alerts. Ragas computes metric scores \u2014 faithfulness, context recall, context precision \u2014 and has no storage, no UI and no alerting." },
          { t: "p", text: "Several hosted platforms call Ragas or something equivalent internally, so the real question is which backend we run and which metric library it calls. The answer can perfectly well be Langfuse *and* Ragas." },
          { t: "p", text: "It also matters for reporting. The implementation determines the number, so Ragas faithfulness and a hand-rolled claim-extraction judge are two different measurements that share a name \u2014 which means the library belongs in the metric definition alongside the score." }
        ] },

      { level: "advanced",
        q: "When is building on OTel plus Grafana the right call?",
        strong: "A strong answer prices the build.",
        answer: [
          { t: "p", text: "When the constraint is hard. Compliance that forbids a hosted vendor, or an existing observability investment you are not going to duplicate and a genuine need to see LLM traces beside service traces during an incident." },
          { t: "p", text: "It is the wrong call when chosen on principle, because the build is substantial. Payload storage with truncation, retrieval debugging views, a judge scoring pipeline, a dataset and regression runner, a prompt registry, tail sampling rules, PII redaction at export \u2014 my estimate is around four months of one engineer." },
          { t: "p", text: "What is interesting in that estimate is that the two largest items are not observability. The regression runner and the prompt registry are operational tooling that the hosted platforms happen to bundle, so if you already have them the route is much cheaper than it looks." },
          { t: "p", text: "The middle path I would usually recommend is to instrument with OTel so the data is portable, and send it somewhere that already has the views built. That keeps the independence that matters and skips the four months." }
        ] }
    ]
  }
});
