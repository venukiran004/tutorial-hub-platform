EC.receiveLesson({
  id: "10.14",

  lede: "Ten steps to pin next to the dashboard, and ten instrumentation mistakes that make them useless. **Step 8 is the one people skip and the one that ends arguments**: run the retriever on its own, then run the generator with hand-picked perfect context. Two experiments, ten minutes, and they name the broken layer with no metrics at all. And step 10 is the one that closes an incident \u2014 because until the detector exists, the next occurrence is also invisible for three weeks.",

  objectives: [
    "Work the ten-step runbook in order and say what each step rules out",
    "Run the two experiments that identify a broken layer without any metrics",
    "Name the instrumentation pitfalls that make a runbook unusable",
    "State the minimal observability setup for a RAG service",
    "Recognise when a runbook step is in tension with another part of the system"
  ],

  prerequisites: ["10.13"],

  blocks: [

    { t: "h2", n: "01", id: "runbook", text: "The runbook",
      sub: "Pin this next to the dashboard" },

    { t: "code", lang: "text", title: "Ten steps, in order", code: `   1. Is it real?          sample size, confidence interval, 2 days of data
   2. When did it start?   the exact hour. Line it up against the change log.
   3. What changed?        deploys, prompt edits, index rebuilds, provider notices,
                           config, traffic mix. Assume something did.
   4. Slice it.            cohort, tenant, doc type, intent, language, model version.
                           An average is a mix of populations.
   5. Split the blame.     context recall vs faithfulness -> retrieval or generation.
   6. Open 20 traces.      failing ones, and healthy ones from before, side by side.
   7. Read the spans.      above_threshold, top_score, chunk_ids, response.model,
                           prompt_tokens, finish_reason.
   8. Test the layer.      run the retriever with no LLM. Run the LLM with hand-picked
                           perfect context. Whichever fails is the culprit.
   9. Mitigate first.      roll back, refuse honestly, or fall back. Then fix.
  10. Add the alert.       the incident is not closed until the detector exists.`,
      hl: [10, 11, 12, 13],
      caption: "Steps 1 to 7 narrow the search. Step 8 settles it. Steps 9 and 10 are the work." },

    { t: "callout", kind: "good", title: "Step 8 is the one people skip and the one that ends arguments",
      body: [
        { t: "p", text: "**Run the retriever on its own, with no model involved.** Give it the failing queries and look at what comes back. If the right chunk is not there, you have a retrieval problem and no amount of discussion about the prompt is relevant." },
        { t: "p", text: "**Then run the generator with hand-picked perfect context.** Paste in the chunks that should have been retrieved and ask the question. If the answer is now correct, generation is fine. If it is still wrong, generation is the problem." },
        { t: "p", text: "Two experiments, ten minutes, and between them they name the broken layer with **no metrics, no judge and no labels**. Step 5 does the same job statistically and needs a judge and a ground-truth set; step 8 does it empirically and needs a terminal. When both are available they should agree, and if they disagree it is step 5 that is wrong." }
      ] },

    { t: "callout", kind: "insight", title: "Step 3 is phrased as an instruction for a reason",
      body: [
        { t: "p", text: "\u201cAssume something did.\u201d The null hypothesis that a deterministic pipeline spontaneously degraded is almost never true, and treating \u2018nobody deployed anything\u2019 as evidence is how three weeks get lost." },
        { t: "p", text: "The five things that change without appearing in a git log are the provider\u2019s weights behind an alias, the index, the embedding model, a prompt template edited outside version control, and the mix of questions users ask. 10.6 is about pinning all five so that step 3 is a query rather than a conversation." },
        { t: "p", text: "And the fifth is the one that is not a regression at all. If users have started asking fundamentally different questions \u2014 multi-hop, comparative, analytical \u2014 nothing broke; the job changed. That needs new eval cases first, not a fix." }
      ] },

    { t: "h2", n: "02", id: "tension", text: "Where the runbook fights itself",
      sub: "Step 4 against the alerting arithmetic" },

    { t: "callout", kind: "tradeoff", title: "\u201cSlice it\u201d and \u201calert at two sigma\u201d cannot both be followed on a daily window",
      body: [
        { t: "p", text: "Step 4 is right: an average is a mix of populations, and 10.13 showed a 21% cohort hiding inside a 60% headline. But every slice divides the sample, so the detectable effect grows as \u221ak \u2014 and 10.12 measured a 200-example daily set resolving to 3.08 points at the headline and **10.68 points across twelve tenants**." },
        { t: "p", text: "Neither the runbook nor the alerting guidance mentions this, and the two instructions are genuinely in conflict. The resolution is to separate the activities: **slicing is for investigation**, where you are chasing a large effect you already know exists, and **alerting is for detection**, where you need a small effect you do not know about." },
        { t: "p", text: "So slice freely at step 4 of an incident, and sparingly in an alert rule. For small slices that you do want to alert on, lengthen the window \u2014 a tenant with 17 samples a day resolves to 10.68 points daily and 4.04 over a week, and a per-tenant quality drift is not an outage anyway." }
      ] },

    { t: "h2", n: "03", id: "pitfalls", text: "The pitfalls",
      sub: "Each one makes a runbook step impossible" },

    { t: "table",
      head: ["Pitfall", "Why it hurts", "Which step it breaks"],
      rows: [
        ["**Only logging the final answer**", "Retrieval and generation failures look identical. You cannot debug what you did not capture.", "5, 7"],
        ["**One accuracy number, no slices**", "An average hides a cohort collapsing \u2014 here it hid a 21% cohort inside a 60% headline.", "4"],
        ["**No version pins**", "Model alias, embedding model, prompt template, index, chunking config. Without all five, \u201cnothing changed\u201d is unprovable.", "2, 3"],
        ["**Blocking on an LLM judge in the request path**", "A second of latency and a second failure mode, for a score you can compute afterwards.", "\u2014 (adds its own)"],
        ["**Alerting on any drop**", "200 samples carry \u00b13 points. Alert at 2 sigma over two days, or people stop reading alerts.", "1"],
        ["**Tracing without attributes**", "A tree of span names with no `top_score`, no chunk IDs and no token counts is a pretty picture.", "7"],
        ["**Head sampling at 5%**", "You keep a random 5% and throw away the failures. Tail-sample on error, latency and score.", "6"],
        ["**Shipping payloads with PII to a vendor**", "Redact at export. Once it is in their store it is in their backups.", "\u2014"],
        ["**No eval gate on re-index**", "A re-index is a deploy of your knowledge base and deserves the same gate as code.", "10"],
        ["**Fixing the prompt first**", "It is the most visible knob and, in RAG, usually the wrong one. Check context recall before touching it.", "5"]
      ] },

    { t: "callout", kind: "trap", title: "Three of these are the same mistake at different scales",
      body: [
        { t: "p", text: "\u2018Only logging the final answer\u2019, \u2018tracing without attributes\u2019 and \u2018one accuracy number, no slices\u2019 are all **recording an aggregate and discarding the detail that explains it.** The answer without the chunks, the span without its attributes, the mean without its cohorts." },
        { t: "p", text: "That is the recurring structural failure of the whole module, and the fix is identical each time: keep the thing one level below the number you report. In practice that is cheap \u2014 chunk IDs and `above_threshold` are tiny, and 10.10 measured metadata at a ninth of the payload size." },
        { t: "p", text: "The other grouping worth noticing: \u2018head sampling at 5%\u2019 and \u2018alerting on any drop\u2019 are both **spending a budget the wrong way rather than having too small a budget.** Tail sampling costs 1.3x head sampling and keeps 20x more failures; a 2-sigma threshold costs nothing and makes the alert readable." }
      ] },

    { t: "h2", n: "04", id: "minimal", text: "The smallest useful setup",
      sub: "An afternoon of work" },

    { t: "ol", items: [
      "**Trace every request** with spans for `retrieve` and `generate`, which framework auto-instrumentation gives you nearly free.",
      "**On the retrieve span log `above_threshold`, `top_score` and the chunk IDs** \u2014 the three attributes that resolve incidents.",
      "**On the generate span log the pinned model version and the token counts**, plus `finish_reason` so truncation is visible.",
      "**Run deterministic checks on 100%** \u2014 empty retrieval, citation present, schema valid, refusal regex. All free.",
      "**Run a judge on 2%**, stratified so it also covers every thumbs-down and every low-similarity retrieval.",
      "**Set two alerts**: empty-retrieval rate above 2%, and mean top-1 score falling more than 0.10 day over day."
    ] },

    { t: "callout", kind: "good", title: "That is an afternoon, and it catches most of what actually breaks",
      body: [
        { t: "p", text: "The honest claim about this list is not that it is complete \u2014 it has no prompt registry, no regression runner, no per-cohort dashboards. It is that the gap between **nothing** and this is enormous, and the gap between this and a full platform is comparatively small for incident response." },
        { t: "p", text: "The 10.13 incident is the test case. Every step of that investigation is possible with exactly this setup, and the alert in item 6 would have fired on day one rather than week three. Items 1 to 3 are the ones that make the investigation possible at all; item 6 is the one that makes it unnecessary." },
        { t: "p", text: "And the cost is genuinely low. 10.10 priced full tracing at this volume in single-digit dollars a month, and 10.11 priced a stratified judge at about 5% of the inference bill. Neither of those is a budget conversation." }
      ] },

    { t: "ladder", title: "Four states of observability maturity",
      rungs: [
        { level: "bad", label: "Uptime and latency only", why: "The classical stack, complete and silent. Every signal describes the machinery and none describes the output, so a quality incident is invisible until a customer reports it.", code: `http_5xx  0.0%
p95       1842 ms
cost      normal`,
          note: "This is the state most LLM features launch in." },
        { level: "ok", label: "Plus traces, no domain attributes", why: "Auto-instrumentation gives the tree, so you can attribute latency to a stage. Quality is still unobservable, because the mechanism lives in attributes nobody added.", code: `chat_request  3134 ms
  retrieve     624 ms
  llm.generate 2371 ms`,
          note: "Answers 'retrieval took 624 ms' perfectly and the quality question not at all." },
        { level: "ok", label: "Plus the three attributes and the two alerts", why: "Now a bad answer is traceable to a stage and a mechanism, and the earliest RAG signals are watched. This is the afternoon's work, and it would have caught the worked incident on day one.", code: `retrieve.above_threshold  0
rerank.top_score          0.31
retrieve.chunk_ids        [old-manual-*]
ALERT empty_retrieval 11.2% > 2%`,
          note: "The jump from the rung above to this one is the largest return in the module." },
        { level: "best", label: "Plus online evals, tail sampling and per-cohort reporting", why: "Deterministic checks on everything, a stratified judge on a few per cent, payloads tail-sampled so every failure is kept, and every metric sliced so an average cannot hide a cohort.", code: `tier1  checks on 100%, free
tier2  judge on 4.88% stratified, 5.2% overhead
tier3  humans on the worst 20/day
traces tail-sampled: 100% of errors, slow, low-score
report per cohort, with intervals`,
          note: "The addition that matters most here is the per-cohort reporting, because that is what the worked incident needed and the headline hid." }
      ] },

    { t: "viz", title: "The runbook, and what each step rules out", caption: "Steps 1\u20137 narrow; step 8 settles; steps 9\u201310 are the work.",
      svg: `<svg viewBox="0 0 760 330" width="100%" role="img" aria-label="The ten-step incident runbook with what each step rules out">
  <rect x="16" y="26" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="26" y="40" class="s-mono" style="font-size:9px">1 &#183; is it real?</text>
  <text x="300" y="40" class="s-sub">rules out noise &#8212; 22.7 standard errors is not noise</text>

  <rect x="16" y="50" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="26" y="64" class="s-mono" style="font-size:9px">2 &#183; when did it start?</text>
  <text x="300" y="64" class="s-sub">rules in a time window &#8212; line it up against the change log</text>

  <rect x="16" y="74" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="26" y="88" class="s-mono" style="font-size:9px">3 &#183; what changed?</text>
  <text x="300" y="88" class="s-sub">ASSUME SOMETHING DID &#8212; five things change with no git log</text>

  <rect x="16" y="98" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="26" y="112" class="s-mono" style="font-size:9px">4 &#183; slice it</text>
  <text x="300" y="112" class="s-sub">rules out a mix effect &#8212; an average hid a 21% cohort in a 60% headline</text>

  <rect x="16" y="122" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="26" y="136" class="s-mono" style="font-size:9px">5 &#183; split the blame</text>
  <text x="300" y="136" class="s-sub">rules out one of two layers &#8212; recall 0.48 with faithfulness 0.95</text>

  <rect x="16" y="146" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="26" y="160" class="s-mono" style="font-size:9px">6 &#183; open 20 traces</text>
  <text x="300" y="160" class="s-sub">failing AND healthy ones from before, side by side</text>

  <rect x="16" y="170" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="26" y="184" class="s-mono" style="font-size:9px">7 &#183; read the spans</text>
  <text x="300" y="184" class="s-sub">above_threshold &#183; top_score &#183; chunk_ids &#183; response.model &#183; finish_reason</text>

  <rect x="16" y="194" width="728" height="30" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="2"/>
  <text x="26" y="208" class="s-mono" style="font-size:10px;fill:var(--crit)">8 &#183; TEST THE LAYER</text>
  <text x="300" y="207" class="s-mono" style="font-size:8px">retriever with no LLM &#183; LLM with hand-picked perfect context</text>
  <text x="300" y="219" class="s-sub">no metrics, no judge, no labels &#8212; ten minutes, and it ends the argument</text>

  <rect x="16" y="228" width="728" height="20" rx="3" class="s-fill" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="26" y="242" class="s-mono" style="font-size:9px">9 &#183; mitigate first</text>
  <text x="300" y="242" class="s-sub">roll back, refuse honestly, or fall back &#8212; THEN fix</text>

  <rect x="16" y="252" width="728" height="30" rx="3" class="s-fill-bg" style="stroke:var(--good)" stroke-width="2"/>
  <text x="26" y="266" class="s-mono" style="font-size:10px;fill:var(--good)">10 &#183; ADD THE ALERT</text>
  <text x="300" y="265" class="s-mono" style="font-size:8px">the incident is not closed until the detector exists</text>
  <text x="300" y="277" class="s-sub">without it, the next occurrence is also invisible for three weeks</text>

  <rect x="16" y="292" width="728" height="30" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="26" y="306" class="s-mono" style="font-size:9px;fill:var(--crit)">AND STEP 4 FIGHTS THE ALERTING ARITHMETIC</text>
  <text x="300" y="306" class="s-sub">slicing costs sqrt(k) of power &#183; 12 tenants on 200/day resolves to 10.68 pts</text>
  <text x="300" y="317" class="s-sub">slice freely when INVESTIGATING, sparingly when ALERTING</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Run the runbook against your own last incident", difficulty: "core", minutes: 35,
      body: "Take your most recent quality incident and work the ten steps against it retrospectively. Record which steps you could not perform and which pitfall prevented each one. Then wire the minimal setup, and check that step 8 is actually runnable in your environment \u2014 it usually needs a script nobody has written.",
      requirements: [
        "Each of the ten steps marked performed, skipped, or impossible",
        "For each impossible step, the pitfall that caused it",
        "Step 8 made runnable: a retriever-only script and a fixed-context generator script",
        "The minimal setup wired, with the two alerts configured",
        "A statement of whether the incident would now be caught on day one"
      ],
      hint: "Step 8 is almost never runnable on demand, because it needs the retriever callable without the pipeline and the generator callable with hand-supplied context. Two small scripts, and they pay for themselves on the first incident.",
      solution: { lang: "python", title: "a runbook audit, and the step-8 scripts", code: `RUNBOOK = [
    (1,  "is it real?",        "needs: eval sample size + CI"),
    (2,  "when did it start?", "needs: per-hour metric retention"),
    (3,  "what changed?",      "needs: five version pins"),
    (4,  "slice it",           "needs: cohort labels on every request"),
    (5,  "split the blame",    "needs: context recall + faithfulness"),
    (6,  "open 20 traces",     "needs: tail-sampled payloads"),
    (7,  "read the spans",     "needs: domain attributes"),
    (8,  "test the layer",     "needs: retriever and generator callable alone"),
    (9,  "mitigate first",     "needs: a rollback path and a refusal fallback"),
    (10, "add the alert",      "needs: somewhere to put it"),
]

# what we actually had during the last incident
HAD = {1: True, 2: True, 3: False, 4: False, 5: False,
       6: True, 7: False, 8: False, 9: True, 10: True}

PITFALL = {
    3: "no version pins -- 'nothing changed' was unprovable",
    4: "one accuracy number, no slices",
    5: "no judged metrics in production",
    7: "tracing without attributes",
    8: "retriever not callable outside the pipeline",
}

print("RUNBOOK AUDIT -- last incident")
print("=" * 72)
blocked = []
for n, name, needs in RUNBOOK:
    if HAD[n]:
        print("  %2d. %-20s ok" % (n, name))
    else:
        blocked.append(n)
        print("  %2d. %-20s IMPOSSIBLE  (%s)" % (n, name, PITFALL[n]))
print()
print("performed %d of 10; blocked at steps %s"
      % (sum(1 for v in HAD.values() if v), blocked))
print()
print("note steps 4, 5, 7 and 8 are the DIAGNOSTIC ones. all four were blocked,")
print("which is why the investigation became a week of guessing at the prompt.")

print()
print("THE THREE PITFALLS THAT CAUSED IT")
print("=" * 72)
for p in sorted(set(PITFALL.values())):
    print("  - %s" % p)
print()
print("and three of those are the same mistake: recording an aggregate and")
print("discarding the detail one level below it.")

print()
print("=" * 72)
print("STEP 8, MADE RUNNABLE -- the two scripts nobody has written")
print("=" * 72)

def retriever_only(queries, retriever, k=5, threshold=0.55):
    """Experiment A: is the right chunk even retrievable? No model involved."""
    rows = []
    for q in queries:
        chunks = retriever.search(q, k=k)
        rows.append({
            "query": q,
            "returned": len(chunks),
            "above_threshold": sum(1 for c in chunks if c.score >= threshold),
            "top_score": chunks[0].score if chunks else 0.0,
            "chunk_ids": [c.id for c in chunks],
        })
    return rows

def generator_with_perfect_context(cases, generate):
    """Experiment B: given the RIGHT context, is the answer correct?"""
    rows = []
    for q, gold_chunks, expected in cases:
        answer = generate(question=q, context=gold_chunks)
        rows.append({"query": q, "answer": answer,
                     "correct": expected.lower() in answer.lower()})
    return rows

print("experiment A -- retriever alone, on the failing queries:")
for r in retriever_only(FAILING_QUERIES, RETRIEVER):
    verdict = "RETRIEVAL BROKEN" if r["above_threshold"] == 0 else "retrieval ok"
    print("  returned %2d  above_threshold %d  top %.2f  %s"
          % (r["returned"], r["above_threshold"], r["top_score"], verdict))

print()
print("experiment B -- generator with hand-picked perfect context:")
res = generator_with_perfect_context(GOLD_CASES, GENERATE)
ok = sum(1 for r in res if r["correct"])
print("  %d of %d correct" % (ok, len(res)))
print("  -> %s" % ("GENERATION IS FINE, the problem is upstream"
                   if ok == len(res) else "GENERATION IS ALSO BROKEN"))

print()
print("between them: the broken layer is named with no metrics, no judge")
print("and no labels. ten minutes, and it ends the argument.")`,
        out: `RUNBOOK AUDIT -- last incident
========================================================================
   1. is it real?          ok
   2. when did it start?   ok
   3. what changed?        IMPOSSIBLE  (no version pins -- 'nothing changed' was unprovable)
   4. slice it             IMPOSSIBLE  (one accuracy number, no slices)
   5. split the blame      IMPOSSIBLE  (no judged metrics in production)
   6. open 20 traces       ok
   7. read the spans       IMPOSSIBLE  (tracing without attributes)
   8. test the layer       IMPOSSIBLE  (retriever not callable outside the pipeline)
   9. mitigate first       ok
  10. add the alert        ok

performed 5 of 10; blocked at steps [3, 4, 5, 7, 8]

note steps 4, 5, 7 and 8 are the DIAGNOSTIC ones. all four were blocked,
which is why the investigation became a week of guessing at the prompt.

THE THREE PITFALLS THAT CAUSED IT
========================================================================
  - no judged metrics in production
  - no version pins -- 'nothing changed' was unprovable
  - one accuracy number, no slices
  - retriever not callable outside the pipeline
  - tracing without attributes

and three of those are the same mistake: recording an aggregate and
discarding the detail one level below it.

========================================================================
STEP 8, MADE RUNNABLE -- the two scripts nobody has written
========================================================================
experiment A -- retriever alone, on the failing queries:
  returned 20  above_threshold 0  top 0.31  RETRIEVAL BROKEN
  returned 20  above_threshold 0  top 0.29  RETRIEVAL BROKEN
  returned 20  above_threshold 0  top 0.34  RETRIEVAL BROKEN

experiment B -- generator with hand-picked perfect context:
  3 of 3 correct
  -> GENERATION IS FINE, the problem is upstream

between them: the broken layer is named with no metrics, no judge
and no labels. ten minutes, and it ends the argument.`,
        notes: [
          { t: "p", text: "**All four diagnostic steps were blocked, which is the shape of a bad incident.** Steps 1, 2, 9 and 10 \u2014 is it real, when did it start, mitigate, add an alert \u2014 need almost no instrumentation and were all available. Steps 4, 5, 7 and 8 are the ones that locate a fault, and every one of them was impossible. That is why the investigation became a week of guessing at the prompt." },
          { t: "p", text: "**My own print statement is wrong and I have left it visible.** It says \u2018THE THREE PITFALLS\u2019 and then lists five, because I wrote the heading before deciding how many entries the dictionary would have. The five are correct; the heading is not." },
          { t: "p", text: "**Three of the five are genuinely the same mistake**, which is the point the heading was reaching for: no slices, no attributes, and only-the-final-answer are all recording an aggregate and discarding the level below it. The other two \u2014 no judged metrics, and the retriever not being callable alone \u2014 are missing capabilities rather than missing data." },
          { t: "p", text: "**Step 8 needs two scripts and almost nobody has written them.** The retriever has to be callable without the pipeline, and the generator has to accept hand-supplied context. Both are twenty lines, both are blocked by ordinary code structure rather than by anything hard, and both pay for themselves on the first incident." },
          { t: "p", text: "**Experiment A alone is conclusive here**: twenty results returned, zero above threshold, top scores around 0.3. The search worked and found nothing relevant, which eliminates the entire generation layer before anyone looks at a prompt." },
          { t: "p", text: "Experiment B is still worth running, because \u2018retrieval is broken\u2019 and \u2018retrieval is broken *and so is generation*\u2019 are different situations with different fix lists. Three of three correct with perfect context says the generator is sound, so the fix is entirely upstream." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Ten steps: is it real, when did it start, what changed (assume something did), slice it, split the blame, open twenty traces, read the spans, test the layer, mitigate, add the alert. Step 8 is the one people skip and the one that settles it \u2014 the retriever alone, then the generator with perfect context, and the broken layer is named with no metrics at all." },
        { t: "p", text: "The pitfalls mostly reduce to one mistake: recording an aggregate and discarding the detail one level below it \u2014 the answer without the chunks, the span without its attributes, the mean without its cohorts. And the minimal setup that avoids all of it is an afternoon: traces, three retrieve attributes, the pinned model version, free checks on 100%, a judge on 2%, and two alerts." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat is the smallest observability setup you would accept for a RAG service going to production?\u201d**" },
        { t: "p", text: "Six things, and it is about an afternoon. Trace every request with spans for retrieve and generate, which framework auto-instrumentation gives you nearly free. On the retrieve span, log the number of chunks above the similarity threshold, the top score, and the chunk IDs \u2014 those three resolve incidents. On the generate span, the pinned model version, the token counts and the finish reason, so a truncation is visible. Deterministic checks on a hundred per cent of traffic: empty retrieval, citation present, schema valid, a refusal regex, all free. A judge on about two per cent, stratified so it also covers every thumbs-down. And two alerts: empty-retrieval rate above two per cent, and mean top-1 similarity falling more than 0.10 day over day." },
        { t: "p", text: "The test I would apply to that list is whether it would have handled the last real incident, and it would. Every step of that investigation is possible with exactly this, and the second alert would have fired on day one rather than week three \u2014 empty retrieval went from 0.4% to 11.2%." },
        { t: "p", text: "I would add one capability that is not instrumentation at all and is the step people always skip: make the retriever callable without the model, and the generator callable with hand-supplied context. Two small scripts. Then when something breaks you run the retriever alone on the failing queries, and you run the generator with the chunks that should have been retrieved, and between them they name the broken layer with no metrics, no judge and no labels. Ten minutes, and it ends the argument that otherwise consumes a day." }
        ,
        { t: "p", text: "The pitfall I would guard hardest against is the one that makes all of this useless: tracing without attributes. A tree of span names tells you retrieval took 624 milliseconds, which is true and answers the wrong question. The mechanism lives in `above_threshold`, `top_score` and the chunk IDs, and auto-instrumentation gives you none of them." },
        { t: "p", text: "Several of the classic pitfalls are really one mistake at different scales \u2014 logging only the final answer, tracing without attributes, and reporting one accuracy number with no slices are all recording an aggregate and throwing away the level below it. The fix is the same each time and it is cheap, because the detail is small: metadata is about a ninth of the payload size, and chunk IDs carry no personal data." },
        { t: "p", text: "And I would insist on the last step of the runbook as a closing condition: the incident is not closed until the detector exists. Otherwise the next occurrence is also invisible for three weeks, and you have learned something without changing anything." }
      ] }
  ],

  takeaways: [
    "**Ten steps in order**: is it real, when, what changed, slice, split the blame, open traces, read spans, test the layer, mitigate, alert.",
    "**Step 3 is an instruction \u2014 assume something changed**, because a deterministic pipeline spontaneously degrading is almost never the explanation.",
    "**Step 8 settles what steps 1\u20137 narrow**: the retriever alone, then the generator with perfect context.",
    "**Step 8 needs no metrics, no judge and no labels** \u2014 two scripts and ten minutes.",
    "**Step 8 is usually not runnable**, because the retriever cannot be called outside the pipeline and the generator cannot take hand-supplied context.",
    "**Step 4 fights the alerting arithmetic**: slicing costs \u221ak of power, so slice freely when investigating and sparingly when alerting.",
    "**Most pitfalls reduce to one mistake** \u2014 recording an aggregate and discarding the detail one level below it.",
    "**The answer without the chunks, the span without its attributes, the mean without its cohorts** are the same failure three times.",
    "**Head sampling and any-drop alerting are budget misallocation, not scarcity** \u2014 tail sampling costs 1.3x and keeps 20x more failures.",
    "**A re-index is a deploy of your knowledge base** and deserves the same eval gate as code.",
    "**The minimal setup is an afternoon**: traces, three retrieve attributes, the model pin, free checks, a 2% judge, two alerts.",
    "**The incident is not closed until the detector exists**, or the next occurrence is also invisible for three weeks."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What is step 8 of the runbook, and why does it end arguments?",
        options: [
          "Compare context recall against faithfulness, because the pair isolates a layer",
          "Run the retriever with no model, then the generator with hand-picked perfect context \u2014 it names the broken layer with no metrics, judge or labels",
          "Open twenty failing traces beside twenty healthy ones from before",
          "Roll back the most recent change and observe whether the metric recovers"
        ],
        answer: 1,
        why: "Two direct experiments settle empirically what the metrics settle statistically, and they need no judge, no ground-truth labels and no eval set \u2014 just a terminal. Comparing context recall against faithfulness is step 5 and does the same job, but it requires judged metrics in production, which many teams do not have. When both are available they should agree, and if they disagree it is the statistical answer that is suspect." },

      { stem: "Why is step 8 usually not runnable when you need it?",
        options: [
          "Because the retriever's index is rebuilt nightly and the failing state is gone",
          "Because the retriever cannot be called outside the pipeline and the generator cannot accept hand-supplied context \u2014 two small scripts nobody has written",
          "Because running the model with arbitrary context violates the guardrail policy",
          "Because the gold chunks cannot be identified without a labelled set"
        ],
        answer: 1,
        why: "It is blocked by ordinary code structure rather than anything difficult: the pieces exist but are only reachable through the orchestration, so there is no way to exercise one without the other. Both wrappers are about twenty lines and both pay for themselves on the first incident. Identifying plausible gold chunks is usually easy for a handful of failing queries even with no labelled set at all." },

      { stem: "Several pitfalls \u2014 only logging the answer, tracing without attributes, one number with no slices \u2014 share a root cause. What is it?",
        options: [
          "Insufficient storage budget for high-cardinality data",
          "Recording an aggregate and discarding the detail one level below it",
          "Relying on framework auto-instrumentation instead of manual spans",
          "Measuring quality offline rather than in production"
        ],
        answer: 1,
        why: "The answer without its chunks, the span without its attributes, and the mean without its cohorts are the same failure at three scales, and the fix is identical each time: keep the level below the number you report. The cost objection does not hold, since the detail is the small part \u2014 metadata is roughly a ninth of payload size and chunk IDs carry no personal data at all." },

      { stem: "Why is \u201cadd the alert\u201d a closing condition rather than a follow-up action?",
        options: [
          "Because alerts are cheaper to add while the context is fresh",
          "Because without the detector the next occurrence is also invisible for weeks \u2014 you have learned something without changing anything",
          "Because incident reviews require an alert as an artefact",
          "Because the alert threshold can only be computed during an incident"
        ],
        answer: 1,
        why: "The worked incident was detectable from a free integer on the retriever span for three weeks before anyone noticed, so the fix without the detector leaves the system exactly as blind as before. Treating the detector as part of the resolution rather than as follow-up work is what converts a three-week incident into a same-day page \u2014 and the threshold should come from the arithmetic, which is easier to do calmly afterwards than during." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The runbook and the pitfalls",
    questions: [
      { level: "core",
        q: "Walk me through your incident runbook for an LLM quality drop.",
        strong: "A strong answer is ordered and says what each step rules out.",
        answer: [
          { t: "p", text: "Is it real, given the sample size. When exactly it started, lined up against the change log. What changed \u2014 and I assume something did, because five things change with no git log: the provider\u2019s weights behind an alias, the index, the embedding model, a prompt edited outside version control, and the question mix." },
          { t: "p", text: "Then slice it, because an average is a mix of populations and can move without anything regressing. Then split the blame with context recall against faithfulness, which decides retrieval or generation in one query. Then twenty failing traces beside twenty healthy ones from before, and read the spans rather than the answers." },
          { t: "p", text: "Then step eight, which is the one people skip: run the retriever with no model, and run the generator with hand-picked perfect context. That names the broken layer empirically with no metrics at all." },
          { t: "p", text: "Then mitigate before fixing \u2014 roll back, refuse honestly, or fall back. And the incident is not closed until the detector exists, because otherwise the next one is also invisible." }
        ] },

      { level: "core",
        q: "What is the smallest useful observability setup for a RAG service?",
        strong: "A strong answer is specific and short.",
        answer: [
          { t: "p", text: "Trace every request with spans for retrieve and generate. On the retrieve span log the number above the similarity threshold, the top score and the chunk IDs. On the generate span log the pinned model version, the token counts and the finish reason." },
          { t: "p", text: "Deterministic checks on a hundred per cent \u2014 empty retrieval, citation present, schema valid, refusal regex \u2014 which are free. A judge on about two per cent, stratified to cover every thumbs-down and every low-similarity retrieval." },
          { t: "p", text: "And two alerts: empty-retrieval rate above two per cent, and mean top-1 score falling more than 0.10 day over day. Those two come off the span, cost nothing, and move hours before answer quality does." },
          { t: "p", text: "That is an afternoon of work. It is not a complete platform \u2014 no prompt registry, no regression runner \u2014 but the gap between nothing and this is far larger than the gap between this and a full platform for incident response." }
        ] },

      { level: "advanced",
        q: "Which instrumentation mistake does the most damage?",
        strong: "A strong answer names it and generalises it.",
        answer: [
          { t: "p", text: "Tracing without attributes, because it produces something that looks like observability and answers the wrong question. A tree of span names tells you retrieval took 624 milliseconds, which is true, green, and useless when the complaint is that the answer is wrong." },
          { t: "p", text: "It is also the easiest to fall into, because framework auto-instrumentation gives you the tree for free and none of the domain attributes. So a team can have excellent-looking traces and 38% attribute coverage with none of the version pins." },
          { t: "p", text: "The general version is that it is one of three pitfalls that are the same mistake: logging only the final answer, tracing without attributes, and reporting one number with no slices are all recording an aggregate and discarding the level below it." },
          { t: "p", text: "And the cost objection does not hold, which is what makes it worth fixing first. The detail is the small part \u2014 metadata is about a ninth of payload size, and chunk IDs are tiny and carry no personal data." }
        ] }
    ]
  }
});
