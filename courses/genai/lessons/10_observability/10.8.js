EC.receiveLesson({
  id: "10.8",

  lede: "**OpenTelemetry** is the vendor-neutral standard for traces, metrics and logs, and it matters here for one reason: the LLM tools all speak it, so instrumenting once means changing backend without re-instrumenting. The **GenAI semantic conventions** standardise the attribute names on top of that \u2014 and one pair of them, `gen_ai.request.model` against `gen_ai.response.model`, is the cheapest possible detector for a provider changing the model underneath you. Measured below: it fires a full day before any quality metric could.",

  objectives: [
    "Name the standard GenAI attributes and what each records",
    "Explain why the request and response model fields must both be logged",
    "Build the alias-roll detector and state when it fires",
    "Say what framework auto-instrumentation gives you and what it does not",
    "Map a home-grown span onto the conventions and identify what has no standard name"
  ],

  prerequisites: ["10.6", "10.7"],

  blocks: [

    { t: "h2", n: "01", id: "conventions", text: "The conventions",
      sub: "Standard names, so a trace is readable by another tool" },

    { t: "code", lang: "text", title: "The GenAI semantic conventions", code: `  gen_ai.system                  the provider
  gen_ai.request.model           the model asked for
  gen_ai.response.model          the model that actually answered   <- these two differ!
  gen_ai.request.temperature
  gen_ai.request.max_tokens
  gen_ai.usage.input_tokens
  gen_ai.usage.output_tokens
  gen_ai.response.finish_reasons stop | length | content_filter | tool_calls
  gen_ai.operation.name          chat | embeddings | ...`,
      hl: [2, 3],
      caption: "Two fields for the model, and the gap between them is a detector." },

    { t: "callout", kind: "insight", title: "A standard name is also an unambiguous name",
      body: [
        { t: "p", text: "The usual argument for the conventions is portability \u2014 instrument once, change vendor later. That is true and it is the weaker argument." },
        { t: "p", text: "The stronger one came out of building the tracer in 10.7. Rolling up token counts by filtering on span kind overstated cost by 63% after an ordinary refactor, because two spans legitimately carried `prompt_tokens` and only a structural property kept them apart. `gen_ai.usage.input_tokens`, set by the model call and nothing else, cannot be accidentally satisfied." },
        { t: "p", text: "So the conventions buy correctness as well as portability. A name that means exactly one thing is a name you can aggregate on safely, which is not true of \u2018the token count on this span\u2019." }
      ] },

    { t: "h2", n: "02", id: "twomodels", text: "The two model fields",
      sub: "The cheapest detector there is" },

    { t: "callout", kind: "warn", title: "`gen_ai.request.model` is what you asked for; `gen_ai.response.model` is what answered",
      body: [
        { t: "p", text: "When a provider moves an alias, **only the second one changes**. You asked for `chat-large` yesterday and today, and yesterday `chat-large-2026-03-11` answered while today `chat-large-2026-06-02` does. The request field is identical on both days." },
        { t: "p", text: "So log both, and alert when the response model is not the version you pinned. That is one comparison on one attribute, and it is the difference between knowing a model changed and arguing about whether it did." },
        { t: "p", text: "It also reframes the investigation. A quality metric tells you something got worse and you then have to go looking for the cause; this tells you the cause directly, on the day, before the quality metric has enough samples to move." }
      ] },

    { t: "callout", kind: "trap", title: "An alias roll is not atomic, which breaks a single-day comparison",
      body: [
        { t: "p", text: "The exercise below runs a realistic roll and the shape is the finding: **19.9% of traffic on the new version on day one, 100% on day two.** Providers roll gradually, by region or by shard, and for a day or more your traffic is served by two different models." },
        { t: "p", text: "Which means a before-and-after comparison of aggregate quality across that boundary is comparing a mixture against a mixture. If the new version is worse, the day-one number shows a fifth of the effect and looks like noise \u2014 and 9.16\u2019s arithmetic says a fifth of a small effect is certainly inside the margin." },
        { t: "p", text: "The attribute fixes this too, and this is the part that is easy to miss: once `gen_ai.response.model` is on every span, you can slice quality **by responding version** rather than by date. That turns a mixed comparison into a clean paired one against the same traffic." }
      ] },

    { t: "h2", n: "03", id: "auto", text: "Auto-instrumentation and what it leaves out",
      sub: "The skeleton is free; the five attributes that matter are not" },

    { t: "code", lang: "python", title: "A minimal instrumentation \u2014 the same shape as the from-scratch tracer", code: `from opentelemetry import trace

tracer = trace.get_tracer("rag-chatbot")

with tracer.start_as_current_span("retrieve") as span:
    span.set_attribute("index.name", "support-docs-v4")
    span.set_attribute("retrieval.top_k", 5)
    chunks = retriever.search(query, k=5)
    span.set_attribute("retrieval.returned", len(chunks))
    span.set_attribute("retrieval.above_threshold",
                       sum(1 for c in chunks if c.score >= 0.55))
    span.set_attribute("retrieval.top_score", chunks[0].score if chunks else 0.0)
    span.set_attribute("retrieval.chunk_ids", [c.id for c in chunks])`,
      hl: [9, 10, 11, 12],
      caption: "`start_as_current_span` is the `contextvars` machinery from 10.7. The highlighted lines are the part no framework gives you." },

    { t: "callout", kind: "good", title: "Auto-instrument for the skeleton, then add the five attributes specific to your system",
      body: [
        { t: "p", text: "LangChain callbacks, LlamaIndex handlers and the OpenInference instrumentors give you the tree for free \u2014 spans for every chain step, every retriever call, every model call, correctly nested. That is real value and it is most of the plumbing." },
        { t: "p", text: "**It does not give you your own domain attributes.** `above_threshold`, the chunk IDs, the prompt-template hash, the tenant, the index version \u2014 none of those can be inferred by a generic instrumentor, and 10.6\u2019s audit found exactly this shape: a tree, 38% attribute coverage, and none of the three pins." },
        { t: "p", text: "So the division of labour is clear. Auto-instrument the skeleton, then add the handful of attributes that are specific to your system. Those are the ones that resolve incidents, and there are usually about five of them." }
      ] },

    { t: "viz", title: "Two model fields, one detector", caption: "The alias never changes. Only the responding version does, and it moves gradually.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Request versus response model attributes detecting a gradual provider alias roll">
  <text x="16" y="20" class="s-label">gen_ai.request.model &#8212; WHAT YOU ASKED FOR</text>
  <rect x="16" y="30" width="728" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="30" y="47" class="s-mono" style="font-size:9px;fill:var(--good)">chat-large</text>
  <text x="160" y="47" class="s-mono" style="font-size:9px;fill:var(--good)">chat-large</text>
  <text x="290" y="47" class="s-mono" style="font-size:9px;fill:var(--good)">chat-large</text>
  <text x="420" y="47" class="s-mono" style="font-size:9px;fill:var(--good)">chat-large</text>
  <text x="550" y="47" class="s-mono" style="font-size:9px;fill:var(--good)">chat-large</text>
  <text x="660" y="47" class="s-sub">never moves</text>

  <text x="16" y="82" class="s-label">gen_ai.response.model &#8212; WHAT ACTUALLY ANSWERED</text>
  <rect x="16" y="92" width="130" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="26" y="109" class="s-mono" style="font-size:8px">...2026-03-11</text>
  <rect x="150" y="92" width="130" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="160" y="109" class="s-mono" style="font-size:8px">...2026-03-11</text>
  <rect x="284" y="92" width="130" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="294" y="109" class="s-mono" style="font-size:8px">...2026-03-11</text>
  <rect x="418" y="92" width="130" height="26" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.8"/>
  <text x="428" y="105" class="s-mono" style="font-size:8px;fill:var(--warn)">19.9% ...06-02</text>
  <text x="428" y="115" class="s-mono" style="font-size:8px">80.1% ...03-11</text>
  <rect x="552" y="92" width="130" height="26" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="562" y="109" class="s-mono" style="font-size:8px;fill:var(--crit)">100% ...06-02</text>

  <text x="26" y="134" class="s-sub">07-26</text>
  <text x="160" y="134" class="s-sub">07-27</text>
  <text x="294" y="134" class="s-sub">07-28</text>
  <text x="428" y="134" class="s-sub">07-29</text>
  <text x="562" y="134" class="s-sub">07-30</text>

  <path d="M 483 142 L 483 162" stroke="var(--crit)" stroke-width="1.6" marker-end="url(#a108)"/>
  <defs><marker id="a108" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="var(--crit)"/></marker></defs>
  <rect x="300" y="166" width="366" height="30" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="312" y="185" class="s-mono" style="font-size:9px;fill:var(--crit)">ALERT fires here &#8212; a full day early</text>

  <line x1="16" y1="212" x2="744" y2="212" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="234" class="s-label">AND WHY THE GRADUAL ROLL MATTERS</text>
  <rect x="16" y="244" width="356" height="46" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="28" y="262" class="s-mono" style="font-size:9px;fill:var(--crit)">compare quality BY DATE</text>
  <text x="28" y="278" class="s-sub">day one mixes two models &#8212; a fifth of the effect,</text>
  <text x="28" y="288" class="s-sub">which is inside the margin and reads as noise</text>
  <rect x="388" y="244" width="356" height="46" rx="3" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="400" y="262" class="s-mono" style="font-size:9px;fill:var(--good)">compare quality BY RESPONDING VERSION</text>
  <text x="400" y="278" class="s-sub">same traffic, same day, two clean populations</text>
  <text x="400" y="288" class="s-sub">a paired comparison instead of a mixed one</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Map to the conventions and build the alias-roll detector", difficulty: "core", minutes: 30,
      body: "Map a home-grown LLM span onto the GenAI semantic conventions, note which of your attributes have no standard name, and then build the detector: alert when the responding model is not the version you pinned. Run it over a traffic log containing a gradual roll.",
      requirements: [
        "Every home-grown key mapped to its standard name, or marked as a domain attribute",
        "Standard attributes you are not yet recording, listed",
        "A detector comparing the responding model against the pinned version",
        "The share of traffic on an unpinned version, per day",
        "A statement of when the alert fires relative to when the roll completes"
      ],
      hint: "Your retrieval attributes have no standard GenAI names and should not be forced into one \u2014 they are domain attributes and they stay yours. The conventions cover the model call, not your pipeline.",
      solution: { lang: "python", title: "convention mapping and the alias-roll detector", code: `GENAI = {
    "gen_ai.system":                  "the provider",
    "gen_ai.operation.name":          "chat | embeddings | ...",
    "gen_ai.request.model":           "the model asked for",
    "gen_ai.response.model":          "the model that actually answered",
    "gen_ai.request.temperature":     "",
    "gen_ai.request.max_tokens":      "",
    "gen_ai.usage.input_tokens":      "",
    "gen_ai.usage.output_tokens":     "",
    "gen_ai.response.finish_reasons": "stop | length | content_filter | tool_calls",
}

HOMEGROWN = {
    "provider":      "acme",
    "model":         "chat-large",
    "temp":          0.0,
    "max_out":       512,
    "tokens_prompt": 1842,
    "tokens_out":    214,
    "stop_reason":   "stop",
    "index_name":    "support-docs-v4",     # no standard name -- domain attribute
    "above_thresh":  6,                     # no standard name -- domain attribute
}

MAP = {
    "provider":      "gen_ai.system",
    "model":         "gen_ai.request.model",
    "temp":          "gen_ai.request.temperature",
    "max_out":       "gen_ai.request.max_tokens",
    "tokens_prompt": "gen_ai.usage.input_tokens",
    "tokens_out":    "gen_ai.usage.output_tokens",
    "stop_reason":   "gen_ai.response.finish_reasons",
}

print("mapping a home-grown span onto the conventions")
print("=" * 70)
converted, domain = {}, {}
for k, v in HOMEGROWN.items():
    if k in MAP:
        converted[MAP[k]] = v
        print("  %-14s -> %-30s = %s" % (k, MAP[k], v))
    else:
        domain[k] = v
print()
print("no standard name, so they stay yours:")
for k, v in domain.items():
    print("  %-14s    (domain attribute) = %s" % (k, v))

print()
missing = [k for k in GENAI if k not in converted]
print("standard attributes still missing: %d" % len(missing))
for k in missing:
    print("  %-32s %s" % (k, GENAI[k]))
print()
print("gen_ai.response.model is the important one -- see below.")

print()
print("=" * 70)
print("THE TWO MODEL FIELDS, AS AN ALIAS-ROLL DETECTOR")
print("=" * 70)
PINNED = "chat-large-2026-03-11"
TRAFFIC = [
    ("2026-07-26", "chat-large", "chat-large-2026-03-11", 41000),
    ("2026-07-27", "chat-large", "chat-large-2026-03-11", 39800),
    ("2026-07-28", "chat-large", "chat-large-2026-03-11", 40200),
    ("2026-07-29", "chat-large", "chat-large-2026-06-02",  8100),
    ("2026-07-29", "chat-large", "chat-large-2026-03-11", 32600),
    ("2026-07-30", "chat-large", "chat-large-2026-06-02", 40900),
]
print("%-12s %-14s %-24s %8s  %s" % ("date", "requested", "responded", "requests", ""))
by_day = {}
for day, req, resp, n in TRAFFIC:
    by_day.setdefault(day, []).append((req, resp, n))
for day in sorted(by_day):
    total = sum(n for _, _, n in by_day[day])
    off = sum(n for _, resp, n in by_day[day] if resp != PINNED)
    for req, resp, n in by_day[day]:
        flag = "<-- NOT THE PINNED VERSION" if resp != PINNED else ""
        print("%-12s %-14s %-24s %8d  %s" % (day, req, resp, n, flag))
    if off:
        print("%-12s %s %.1f%% of traffic on an unpinned version"
              % ("", " " * 39, 100.0 * off / total))

print()
print("the alias never changed -- gen_ai.request.model is 'chat-large' throughout.")
print("only gen_ai.response.model moved, and it moved GRADUALLY:")
print("  2026-07-29: 19.9% rolled    2026-07-30: 100% rolled")
print()
print("so a single-day comparison of aggregate quality would have mixed two")
print("models in one number. the detector is the field, not the metric.")

print()
print("alert rule:")
print("  fire when gen_ai.response.model != pinned_version, on ANY request")
print("  -> would have fired on 2026-07-29 at 8,100 requests, a day early")`,
        out: `mapping a home-grown span onto the conventions
======================================================================
  provider       -> gen_ai.system                  = acme
  model          -> gen_ai.request.model           = chat-large
  temp           -> gen_ai.request.temperature     = 0.0
  max_out        -> gen_ai.request.max_tokens      = 512
  tokens_prompt  -> gen_ai.usage.input_tokens      = 1842
  tokens_out     -> gen_ai.usage.output_tokens     = 214
  stop_reason    -> gen_ai.response.finish_reasons = stop

no standard name, so they stay yours:
  index_name        (domain attribute) = support-docs-v4
  above_thresh      (domain attribute) = 6

standard attributes still missing: 2
  gen_ai.operation.name            chat | embeddings | ...
  gen_ai.response.model            the model that actually answered

gen_ai.response.model is the important one -- see below.

======================================================================
THE TWO MODEL FIELDS, AS AN ALIAS-ROLL DETECTOR
======================================================================
date         requested      responded                requests  
2026-07-26   chat-large     chat-large-2026-03-11       41000  
2026-07-27   chat-large     chat-large-2026-03-11       39800  
2026-07-28   chat-large     chat-large-2026-03-11       40200  
2026-07-29   chat-large     chat-large-2026-06-02        8100  <-- NOT THE PINNED VERSION
2026-07-29   chat-large     chat-large-2026-03-11       32600  
                                                     19.9% of traffic on an unpinned version
2026-07-30   chat-large     chat-large-2026-06-02       40900  <-- NOT THE PINNED VERSION
                                                     100.0% of traffic on an unpinned version

the alias never changed -- gen_ai.request.model is 'chat-large' throughout.
only gen_ai.response.model moved, and it moved GRADUALLY:
  2026-07-29: 19.9% rolled    2026-07-30: 100% rolled

so a single-day comparison of aggregate quality would have mixed two
models in one number. the detector is the field, not the metric.

alert rule:
  fire when gen_ai.response.model != pinned_version, on ANY request
  -> would have fired on 2026-07-29 at 8,100 requests, a day early`,
        notes: [
          { t: "p", text: "**Two of nine standard attributes were missing, and one of them is the whole point.** `gen_ai.response.model` has no home-grown equivalent because the original span recorded only `model` \u2014 which is the alias that was asked for. Without the second field there is no detector at all, and that is the typical starting state." },
          { t: "p", text: "**The alias never moved.** `gen_ai.request.model` reads `chat-large` on every single day including the two after the roll. Anyone grepping for a model change in their own configuration or traces would have found nothing, which is exactly why \u2018nothing changed\u2019 gets said with confidence." },
          { t: "p", text: "**The roll was gradual: 19.9% then 100%.** That is the finding this is rarely mentioned, and it has a direct consequence \u2014 a before-and-after quality comparison across 29 July compares a mixture against a mixture, so a real regression shows a fifth of its size on day one and looks like noise." },
          { t: "p", text: "**And the fix for that is the same attribute.** With `gen_ai.response.model` on every span you slice quality by *responding version* rather than by date, which gives two clean populations from the same day\u2019s traffic \u2014 a paired comparison instead of a mixed one, which is what 9.16 argued needs far fewer samples." },
          { t: "p", text: "**Two of the home-grown keys have no standard name and should keep theirs.** `index_name` and `above_thresh` are domain attributes; the GenAI conventions cover the model call, not your pipeline. Forcing them into a `gen_ai.*` name would be worse than leaving them alone, because it would imply a portability that does not exist." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "OpenTelemetry means instrumenting once and changing backend later; the GenAI conventions standardise the attribute names on top. The better argument than portability is unambiguity \u2014 `gen_ai.usage.input_tokens` is set by the model call and nothing else, which is what makes aggregating on it safe." },
        { t: "p", text: "Log both model fields. The alias you requested never moves; only the responding version does, and comparing it against your pin is the cheapest detector there is. Rolls are gradual \u2014 19.9% then 100% \u2014 so slice quality by responding version rather than by date, or you are comparing one mixture against another." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you tell whether the provider changed the model under you?\u201d**" },
        { t: "p", text: "By logging two fields rather than one. The GenAI semantic conventions separate `gen_ai.request.model`, which is what you asked for, from `gen_ai.response.model`, which is what actually answered. When a provider rolls an alias forward, only the second one changes \u2014 so I alert whenever the responding model is not the version I pinned." },
        { t: "p", text: "That is one comparison on one attribute, and it is qualitatively better than inferring it from quality. A metric tells me something got worse and then I go hunting for a cause; this tells me the cause directly, on the day, before a quality metric has enough samples to move at all." },
        { t: "p", text: "The thing I would want to flag is that a roll is not atomic. When I ran this over a realistic traffic log, day one had 19.9% of requests on the new version and day two had 100% \u2014 providers roll by region or by shard. So a before-and-after comparison of aggregate quality across that boundary is comparing a mixture against a mixture, and a genuine regression shows a fifth of its size on day one and reads as noise." },
        { t: "p", text: "The same attribute fixes that, which is the part worth knowing. Once the responding version is on every span you can slice quality by responding version instead of by date \u2014 two clean populations from the same day\u2019s traffic, which is a paired comparison rather than a mixed one, and paired comparisons need far fewer samples to resolve." },
        { t: "p", text: "Then re-run the frozen regression set against both versions, so the conversation becomes \u2018here is the measured difference\u2019 rather than an argument about whether anything changed." },
        { t: "p", text: "More generally I would use the conventions throughout, and not mainly for portability. Building a tracer by hand taught me that aggregating token counts by span kind overstated cost by 63% after an ordinary refactor, because two spans legitimately carried a prompt-token count and only a structural property separated them. A standard attribute name set by exactly one thing is a name you can aggregate on safely \u2014 that is a correctness argument, not a vendor one." }
      ] }
  ],

  takeaways: [
    "**OpenTelemetry means instrumenting once and changing backend later**, because the LLM tools all speak it.",
    "**The GenAI conventions standardise attribute names**, so a trace from one library is readable by another tool.",
    "**Unambiguity is a stronger argument than portability**: a name set by exactly one thing is a name you can safely aggregate.",
    "**`gen_ai.request.model` is what you asked for; `gen_ai.response.model` is what answered** \u2014 log both.",
    "**When a provider rolls an alias, only the response field changes**, which makes the comparison against your pin the cheapest detector there is.",
    "**Measured: the alias read `chat-large` on every day including after the roll** \u2014 so grepping your own config finds nothing.",
    "**Measured: the roll was gradual \u2014 19.9% of traffic on day one, 100% on day two.**",
    "**So a by-date quality comparison across a roll compares a mixture against a mixture**, and a real regression reads as noise on day one.",
    "**Slice quality by responding version instead of by date** \u2014 same traffic, two clean populations, a paired comparison.",
    "**The alert fires a full day before the roll completes**, and before any quality metric could have moved.",
    "**Auto-instrumentation gives you the tree for free and none of your domain attributes** \u2014 `above_threshold`, chunk IDs, template hash, index version.",
    "**Retrieval attributes have no standard GenAI names and should keep their own** \u2014 the conventions cover the model call, not your pipeline."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why log both `gen_ai.request.model` and `gen_ai.response.model`?",
        options: [
          "Because some providers rename models between the request and the response",
          "Because when a provider rolls an alias forward only the response field changes \u2014 so the difference from your pinned version is a direct detector",
          "Because the request field is unavailable when using a gateway",
          "Because billing is computed from the response model and quality from the request model"
        ],
        answer: 1,
        why: "The alias you request stays constant by definition, which is the whole purpose of an alias, so the request field cannot reveal a roll \u2014 in the worked log it read `chat-large` on every day including after the change. Only the responding version moves, and comparing it against the pinned string is one comparison on one attribute that fires before any quality metric has the samples to move." },

      { stem: "A provider alias roll shows 19.9% of traffic on the new version one day and 100% the next. What does that break?",
        options: [
          "Nothing \u2014 a gradual roll is safer because it limits exposure",
          "A before-and-after quality comparison by date, because day one mixes two models and shows only a fraction of any real effect",
          "The alert, which cannot fire until the roll is complete",
          "Token accounting, since the two versions price differently"
        ],
        answer: 1,
        why: "With a fifth of traffic on the new version, a genuine regression contributes roughly a fifth of its magnitude to the day's average \u2014 which for any realistic effect size lands inside the confidence interval and reads as noise. The fix uses the same attribute that detected the roll: slice quality by responding version rather than by date, which yields two clean populations from one day's traffic and turns a mixed comparison into a paired one." },

      { stem: "What does framework auto-instrumentation give you, and what does it not?",
        options: [
          "It gives both the tree and the attributes, so no manual work is needed",
          "It gives the span tree for free but none of your domain attributes \u2014 above_threshold, chunk IDs, the template hash, the index version",
          "It gives the attributes but not the parent relationships",
          "It gives only metrics, not traces"
        ],
        answer: 1,
        why: "A generic instrumentor can see that a retriever was called and how long it took, which is most of the plumbing and real value, but it cannot know that the number of chunks clearing your similarity threshold matters or what your index version is. That is why an audited service typically shows a well-formed tree with low attribute coverage and none of the version pins \u2014 the skeleton is free and the five attributes that resolve incidents are not." },

      { stem: "Beyond portability, why prefer a standard attribute name like `gen_ai.usage.input_tokens`?",
        options: [
          "Because standard names compress better in the exporter",
          "Because it is set by exactly one thing, so aggregating on it cannot be accidentally satisfied by another span",
          "Because vendors validate standard names and reject malformed ones",
          "Because standard names are indexed by default and custom ones are not"
        ],
        answer: 1,
        why: "Aggregating by a structural property instead \u2014 such as summing token counts over spans whose kind is CLIENT \u2014 works until a refactor changes the structure, and in the worked case it overstated cost by 63% after prompt assembly moved to a service, with no error raised. A name owned by one operation is unambiguous, which makes the aggregation correct rather than merely conventional." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "OpenTelemetry and the GenAI conventions",
    questions: [
      { level: "core",
        q: "Why use OpenTelemetry rather than a vendor SDK?",
        strong: "A strong answer gives both arguments and ranks them.",
        answer: [
          { t: "p", text: "The usual reason is portability: the LLM tools all speak it, so instrumenting once means I can change backend without re-instrumenting. That is true, and it is the weaker of the two reasons." },
          { t: "p", text: "The stronger one is unambiguity. A standard attribute name is owned by exactly one operation, so aggregating on it is safe. I learned that the hard way building a tracer \u2014 I rolled up token counts by filtering on span kind, which overstated cost by 63% after prompt assembly moved into a service, because two spans legitimately carried a prompt-token count and only the structure separated them." },
          { t: "p", text: "So I would use the conventions for the model call and keep my own names for my own pipeline. Retrieval attributes have no standard GenAI name and should not be forced into one." },
          { t: "p", text: "Practically I would auto-instrument for the tree and then add about five domain attributes by hand, because the tree is the free part and those five are what actually resolve incidents." }
        ] },

      { level: "advanced",
        q: "The provider rolled a model and you want to quantify the impact. How?",
        strong: "A strong answer slices by responding version, not by date.",
        answer: [
          { t: "p", text: "Not by comparing yesterday against today, because the roll is gradual. In the log I worked through, day one was 19.9% on the new version and day two was 100% \u2014 so a by-date comparison puts a mixture on each side and a real regression shows a fifth of its size on day one." },
          { t: "p", text: "Instead I would slice by `gen_ai.response.model`. That gives two clean populations from the *same* day\u2019s traffic, which controls for everything a date comparison cannot: question mix, time of day, which tenants were active." },
          { t: "p", text: "That is effectively a paired comparison, and paired comparisons need far fewer samples than two independent runs because they remove the variance from how hard the examples are." },
          { t: "p", text: "Then I would re-run the frozen regression set against both pinned versions, so I have a controlled number as well as a production one, and the discussion becomes about a measured difference rather than about whether anything changed." }
        ] },

      { level: "foundation",
        q: "What goes on an LLM span under the conventions?",
        strong: "A strong answer gets the two model fields in.",
        answer: [
          { t: "p", text: "The system, the operation name, the requested model and the responding model, temperature, max tokens, input and output token usage, and the finish reasons." },
          { t: "p", text: "The two model fields are the pair worth calling out \u2014 one is what you asked for and one is what answered, and they differ exactly when a provider has moved an alias under you." },
          { t: "p", text: "The finish reasons matter more than they look: `length` rather than `stop` means the response was truncated, which is a quality failure recorded nowhere else and shows up to the user as an answer stopping mid-sentence." },
          { t: "p", text: "And the usage fields are the ones to aggregate cost from, because they are set only by the model call \u2014 never roll cost up from a structural property like span kind." }
        ] }
    ]
  }
});
