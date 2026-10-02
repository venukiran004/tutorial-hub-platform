EC.receiveLesson({
  id: "8.13",

  lede: "The cheat sheet, the tools and the seven pitfalls \u2014 and this module has measured most of them rather than taking them on trust. \u201cBLEU/ROUGE don\u2019t measure correctness\u201d turned out to be gentler than reality: a factually **inverted** sentence scored **ROUGE-1 = 1.0000** while a correct paraphrase scored 0.2581. \u201cLLM-as-judge is biased\u201d has a specific number too \u2014 a judge saying \u201cgood\u201d to everything reached **95.1% raw agreement with \u03ba = 0.000**.",

  objectives: [
    "Pick a metric from the question you are asking",
    "Choose tooling by what layer of the stack it serves",
    "State each pitfall with the evidence behind it",
    "Recall which claims in this module were measured and which were assumed",
    "Assemble the module into a single evaluation strategy"
  ],

  prerequisites: ["8.12", "8.11"],

  blocks: [

    { t: "h2", n: "01", id: "cheatsheet", text: "Metric, keyed on the question",
      sub: "The reference's table, with what this module measured about each" },

    { t: "table",
      head: ["You want to know\u2026", "Use", "Measured in this module"],
      rows: [
        ["Is this base model better on the same corpus?", "**Perplexity / BPB**", "8.2 \u2014 tokenisation alone spans 2.13\u00d7, so use BPB across tokenizers"],
        ["Translation or summary regression?", "BLEU / ROUGE / chrF / BERTScore", "8.3 \u2014 an inverted sentence scored ROUGE-1 1.0000; relative signal only"],
        ["Code correctness?", "**pass@k** with unit tests", "8.3 \u2014 n must substantially exceed k, or the estimator returns 1.0 by boundary"],
        ["Broad capability snapshot?", "MMLU, GSM8K, HumanEval, GPQA", "8.4 \u2014 read the format column; execution-scored ones resist most gaming"],
        ["Holistic chat preference?", "Pairwise judge / Arena Elo / human A/B", "8.5 \u2014 resolving a 20-Elo gap needs ~1,163 comparisons"],
        ["Is my RAG hallucinating?", "**Faithfulness / groundedness**", "8.12 \u2014 and the score depends on whether derived claims count"],
        ["Is retrieval the problem?", "Recall@k, nDCG, context precision/recall", "8.8 \u2014 dense and BM25 rank opposite on MRR versus nDCG"],
        ["Is my agent doing the right things?", "Task success, tool selection, trajectory, cost", "8.9 \u2014 cost per *resolved* task, or you reward giving up"],
        ["Is it safe in production?", "Injection suites, PII checks, refusal correctness", "8.7, 8.10 \u2014 both directions, and check tool arguments"],
        ["Is it good *for real users*?", "**Online A/B, feedback, KPIs, drift**", "8.11 \u2014 the only ground truth; four of six incidents failed silently"]
      ] },

    { t: "callout", kind: "insight", title: "The table is keyed on the question, which is the actual skill",
      body: [
        { t: "p", text: "Every row starts with what you want to know rather than with a metric, and that ordering is the discipline. 8.1\u2019s first question \u2014 is this a model question or an application question? \u2014 determines which half of the table you are in before any metric is chosen." },
        { t: "p", text: "The failure mode is picking a metric because it is available and then deciding what it means. That is how a team ends up reporting BLEU on open-ended chat, or comparing perplexity across tokenizers, or quoting an Elo rank without its interval." },
        { t: "p", text: "So the practical habit is to write the question down first, in a sentence, and only then choose. If the sentence does not name a unit \u2014 a token, an answer, a trajectory, a session \u2014 it is not yet a question a metric can answer." }
      ] },

    { t: "h2", n: "02", id: "tooling", text: "The tooling",
      sub: "Each serves a different layer" },

    { t: "table",
      head: ["Tool", "Focus", "Layer"],
      rows: [
        ["lm-evaluation-harness", "Standardised model benchmarks", "Model \u2014 and it exists because 8.4's harness settings move scores"],
        ["**RAGAS**", "Faithfulness, relevancy, context precision/recall", "Application \u2014 the 8.8 quartet"],
        ["DeepEval", "pytest-style LLM unit tests plus metrics", "The 8.10 CI gate"],
        ["promptfoo", "Prompt and model A/B, red-teaming, CI", "The 8.10 gate plus guardrails"],
        ["LangSmith / Langfuse", "Tracing, datasets, online eval, judge", "The 8.9 trace and the 8.11 loop"],
        ["TruLens / Phoenix", "RAG and agent observability, feedback functions", "Online, 8.11"],
        ["OpenAI Evals / Braintrust", "Eval registries and CI", "The 8.10 gate"]
      ] },

    { t: "callout", kind: "good", title: "Tracing is the one to install first",
      body: [
        { t: "p", text: "Everything in 8.9 and 8.11 depends on having the trace. Without logged tool calls, arguments, retrieved chunk ids and scores, a loop and a give-up are indistinguishable, a PII leak through a tool argument is undetectable, and you cannot sample production failures into the golden set." },
        { t: "p", text: "6.8 measured the general version: four of six production incidents failed silently, so every permanent fix was a measurement rather than a code change. The trace is the measurement surface, and it has to exist before any of the metrics have anything to read." },
        { t: "p", text: "5.13\u2019s specific instruction applies here too \u2014 log retrieval **scores**, not just ids. A score distribution shifting is how 6.8\u2019s embedding-model mismatch becomes visible, and that costs one float per query." }
      ] },

    { t: "h2", n: "03", id: "pitfalls", text: "The seven pitfalls, with evidence",
      sub: "Most of them this module measured rather than asserted" },

    { t: "dl", items: [
      { k: "\u201cBenchmarks are necessary but not sufficient\u201d", v: "8.4. And the sharper version: no benchmark contains your retriever, your documents or your users \u2014 6.1 improved an application by 5 points of recall with no model change." },
      { k: "Contamination inflates benchmark scores", v: "8.4. Memorisation and competence produce the same number, so a score is an upper bound; the signature is strong performance on an old benchmark against a fresh equivalent." },
      { k: "BLEU/ROUGE don\u2019t measure correctness", v: "**Measured, and worse than stated**: an inverted sentence scored ROUGE-1 and ROUGE-2 of exactly 1.0000 while a correct paraphrase scored 0.2581 and 0.1379." },
      { k: "LLM-as-judge is biased", v: "**Measured**: a judge outputting \u201cgood\u201d for everything got 95.1% raw agreement and \u03ba = 0.000. Use pairwise, swap the order, validate against humans." },
      { k: "Most RAG failures are retrieval failures", v: "8.8. The branch point is whether the gold chunk is in the top-k, and the two branches share no fixes." },
      { k: "Faithfulness > fluency for enterprise", v: "8.8, 8.12 \u2014 and the score depends on a claim-extraction and derivation policy that has to be written down." },
      { k: "Eval-driven development", v: "8.10, 8.11. Gate merges on metrics, grow the set from production failures, measure online \u2014 because offline alone never catches everything." }
    ] },

    { t: "callout", kind: "trap", title: "Two of the seven are stated too gently, and one needs a correction",
      body: [
        { t: "p", text: "\u201cBLEU/ROUGE don\u2019t measure correctness\u201d suggests they are weakly correlated with it. Measured, they are **anti**-correlated on the case that matters: swapping two numbers preserves the unigram multiset by construction, so a sentence asserting the opposite ties the exact copy at 1.0000 while a correct rewording scores 0.2581." },
        { t: "p", text: "\u201cLLM-as-judge is biased\u201d suggests a correction factor. Measured, a zero-skill judge can **beat** an informative one on raw agreement \u2014 95.1% against 91.0% \u2014 so the problem is not a bias to adjust for but a metric that cannot distinguish skill from degeneracy without \u03ba." },
        { t: "p", text: "And 8.5 corrects the module\u2019s own framing: \u201cthe confidence interval nobody prints\u201d is unfair to LMSYS, which publishes intervals. It is secondary reporting \u2014 slides, procurement documents \u2014 that drops the \u00b1 and turns an indistinguishable cluster into an ordered list." }
      ] },

    { t: "h2", n: "04", id: "strategy", text: "Assembling it",
      sub: "What a complete evaluation stack looks like" },

    { t: "ol", items: [
      "**Ask which job** \u2014 model or application \u2014 because the unit decides everything downstream (8.1)",
      "**Screen with benchmarks** if choosing a model, reading the format column and ignoring the absolute scores (8.4)",
      "**Build a private set from real traffic**, stratified by slice and seeded with known failures (8.4, 8.10)",
      "**Split RAG evaluation in two**, so a failure localises to retrieval or generation (8.8)",
      "**Calibrate the judge** against humans with \u03ba and a both-orders flip rate before trusting it (8.6)",
      "**Gate CI per slice** with thresholds committed in advance, mostly reference-free (8.10)",
      "**Measure online** \u2014 implicit feedback, drift, A/B \u2014 and close the loop back into the golden set (8.11)"
    ] },

    { t: "callout", kind: "insight", title: "The ordering is a cost ordering, and step 5 is the one that gets skipped",
      body: [
        { t: "p", text: "Steps 1 to 4 cost thought and little money. Step 5 costs human labelling, which is why it gets skipped \u2014 and skipping it means every number downstream is produced by an instrument nobody checked. 8.6 measured how badly that can go." },
        { t: "p", text: "The minimum viable version is small: a hundred cases labelled by one human, thirty of them by two, giving \u03ba against a human ceiling and a measured flip rate. 7.12 priced human labels at $1\u20135, so that is a few hundred dollars once." },
        { t: "p", text: "Everything after it is cheap again. Once the judge is calibrated, running it over thousands of cases costs model calls, and 7.12\u2019s arithmetic put AI labelling at roughly 3,000\u00d7 less than human labelling \u2014 so the calibration is the only part that does not scale, and it only has to happen once per judge." }
      ] },

    { t: "callout", kind: "good", title: "And the recurring structural lesson of the module",
      body: [
        { t: "p", text: "**A metric whose denominator is a judgement needs that judgement reported.** Perplexity needs its corpus and tokenizer (8.2). Precision@k needs its k (8.8). \u03ba needs its class balance (8.6). pass@k needs n and temperature (8.3). Faithfulness needs its claim-extraction and derivation policy (8.12)." },
        { t: "p", text: "**And an aggregate hides a failure confined to a slice.** 6.5 measured an image row of 0.00 behind a 0.76 headline; 7.10 measured voting improving an aggregate while degrading a sub-50% slice; 8.7 required toxicity disaggregated; 8.10 gates per slice for the same reason." },
        { t: "p", text: "Those two sentences are most of what this module teaches. Everything else is which metric answers which question \u2014 and the cheat sheet above is that, with the measurements behind each row." }
      ] },

    { t: "viz", title: "The stack, in cost order", caption: "Steps 1-4 cost thought. Step 5 costs human labels once. Everything after is model calls.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="The evaluation stack in cost order">
  <text x="16" y="22" class="s-label">BUILD ORDER \u2014 AND WHERE THE MONEY IS</text>

  <rect x="26" y="36" width="300" height="100" rx="5" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="176" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">CHEAP \u2014 THOUGHT ONLY</text>
  <text x="42" y="78" class="s-mono" style="font-size:9px">1. which job? model or application</text>
  <text x="42" y="94" class="s-mono" style="font-size:9px">2. screen with benchmarks</text>
  <text x="42" y="110" class="s-mono" style="font-size:9px">3. private set from real traffic</text>
  <text x="42" y="126" class="s-mono" style="font-size:9px">4. split RAG eval in two</text>

  <rect x="346" y="36" width="180" height="100" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="436" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">THE SKIPPED STEP</text>
  <text x="362" y="80" class="s-mono" style="font-size:9px">5. CALIBRATE</text>
  <text x="362" y="94" class="s-mono" style="font-size:9px">   THE JUDGE</text>
  <text x="362" y="112" class="s-sub" style="font-size:8px">100 human labels, 30 doubled</text>
  <text x="362" y="126" class="s-sub" style="font-size:8px">kappa + flip rate \u00b7 a few $100</text>

  <rect x="546" y="36" width="188" height="100" rx="5" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="640" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent)">CHEAP AGAIN</text>
  <text x="562" y="80" class="s-mono" style="font-size:9px">6. gate CI per slice</text>
  <text x="562" y="96" class="s-mono" style="font-size:9px">7. measure online</text>
  <text x="562" y="114" class="s-sub" style="font-size:8px">AI labels ~3000x cheaper</text>
  <text x="562" y="128" class="s-sub" style="font-size:8px">than human, and scale</text>

  <line x1="16" y1="160" x2="744" y2="160" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="184" class="s-label">THE TWO STRUCTURAL LESSONS</text>
  <text x="30" y="210" class="s-mono" style="font-size:10px;fill:var(--warn)">a metric whose denominator is a judgement needs that judgement reported</text>
  <text x="44" y="226" class="s-sub" style="font-size:9px">perplexity: corpus + tokenizer \u00b7 precision@k: k \u00b7 kappa: class balance</text>
  <text x="44" y="240" class="s-sub" style="font-size:9px">pass@k: n and temperature \u00b7 faithfulness: claim + derivation policy</text>
  <text x="30" y="266" class="s-mono" style="font-size:10px;fill:var(--crit)">an aggregate hides a failure confined to a slice</text>
  <text x="44" y="282" class="s-sub" style="font-size:9px">0.00 image row behind a 0.76 headline \u00b7 voting that helps the mean and hurts a slice</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Write your evaluation strategy on one page", difficulty: "core", minutes: 30,
      body: "Produce a one-page evaluation strategy for your own system: the questions you need answered, the metric for each, the thresholds, the slices, the judge calibration status, and what you measure online. Mark every metric whose denominator is a judgement, and state that judgement.",
      requirements: [
        "One row per question, phrased as a question with a named unit",
        "The metric, the threshold, and whether it gates CI",
        "The slices you report each metric across",
        "Judge calibration status: \u03ba, the human ceiling, and the flip rate",
        "Flag every metric whose denominator is a judgement, with the policy stated"
      ],
      hint: "The flagged column is the most useful part. Any metric whose denominator is a judgement is not comparable with anyone else's version of the same metric unless the judgement is stated.",
      solution: { lang: "python", title: "the strategy as a checkable object", code: `STRATEGY = [
    # question, unit, metric, threshold, gates_ci, slices, denominator_policy
    dict(q="Does retrieval find the right documents?", unit="ranked list",
         metric="recall@6", threshold=0.80, gates_ci=True,
         slices=["query_type", "language"], policy="k=6; relevance = human-labelled"),
    dict(q="Does the answer stick to the context?", unit="claim",
         metric="faithfulness_strict", threshold=0.90, gates_ci=True,
         slices=["query_type"],
         policy="claims split at sentence level; DERIVED claims count as UNSUPPORTED"),
    dict(q="Is the output machine-readable?", unit="answer",
         metric="schema_valid", threshold=0.99, gates_ci=True,
         slices=["query_type"], policy="deterministic -- no judgement"),
    dict(q="Do we refuse the right things?", unit="answer",
         metric="over_refusal", threshold=0.10, gates_ci=True,
         slices=["category"], policy="upper bound; benign set hand-curated"),
    dict(q="Are users better off?", unit="session",
         metric="copy_rate", threshold=None, gates_ci=False,
         slices=["query_type", "surface"],
         policy="validated against 100 hand-labelled sessions, corr +0.41"),
]

JUDGE = dict(kappa=0.628, human_ceiling=0.710, flip_rate=0.138,
             class_balance=0.782, calibrated_on=120)

print("%-44s %-22s %9s %6s" % ("question", "metric", "threshold", "CI"))
for s in STRATEGY:
    print("%-44s %-22s %9s %6s"
          % (s["q"][:42], s["metric"], s["threshold"], "yes" if s["gates_ci"] else "-"))

print("\\njudge: kappa %.3f of ceiling %.3f (%.0f%%), flip rate %.3f, balance %.3f"
      % (JUDGE["kappa"], JUDGE["human_ceiling"],
         100 * JUDGE["kappa"] / JUDGE["human_ceiling"],
         JUDGE["flip_rate"], JUDGE["class_balance"]))

print("\\nmetrics whose denominator is a judgement:")
for s in STRATEGY:
    if "no judgement" not in s["policy"]:
        print("  %-22s %s" % (s["metric"], s["policy"]))`,
        out: `  question                                     metric                 threshold     CI
  Does retrieval find the right documents?     recall@6                    0.8    yes
  Does the answer stick to the context?        faithfulness_strict         0.9    yes
  Is the output machine-readable?              schema_valid               0.99    yes
  Do we refuse the right things?               over_refusal                0.1    yes
  Are users better off?                        copy_rate                  None      -

  judge: kappa 0.628 of ceiling 0.710 (88%), flip rate 0.138, balance 0.782

  metrics whose denominator is a judgement:
    recall@6               k=6; relevance = human-labelled
    faithfulness_strict    claims split at sentence level; DERIVED claims count as UNSUPPORTED
    over_refusal           upper bound; benign set hand-curated
    copy_rate              validated against 100 hand-labelled sessions, corr +0.41`,
        notes: [
          { t: "p", text: "**Four of five metrics have a judgement in the denominator**, which is the normal case and the reason this column matters. Without it, \u2018faithfulness 0.91\u2019 is not comparable to anyone else's faithfulness 0.91 \u2014 or to your own figure from six months ago, if the policy drifted." },
          { t: "p", text: "**The faithfulness policy is stated explicitly as strict**, counting derived claims as unsupported. That is the choice 8.12 argued for in a gate: it will mark genuinely useful answers unfaithful, and it is reproducible, which matters more when the number's job is comparing versions." },
          { t: "p", text: "**The judge line expresses \u03ba as a fraction of the human ceiling**, which is the only interpretable form. 0.628 alone means nothing; 88% of an achievable 0.710 means it is close to the limit of what the labels support, and chasing higher would mean fitting annotator disagreement." },
          { t: "p", text: "**Only one row is online and it has no threshold**, which is correct. Copy rate is a measurement rather than a gate, and the validated correlation of +0.41 against hand labels is what licenses using it at all \u2014 an unvalidated implicit signal supplies confidence rather than information." },
          { t: "p", text: "One deliberate omission: there is no aggregate quality score in the table. Every row names a unit and a slice set, because a single headline number is the thing that hides a failure confined to one query type or one language \u2014 which is the structural lesson this module keeps arriving at." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Two sentences carry most of the module. **A metric whose denominator is a judgement needs that judgement reported** \u2014 perplexity its corpus, precision its k, \u03ba its class balance, pass@k its n, faithfulness its derivation policy. **And an aggregate hides a failure confined to a slice**, which is why everything is reported per slice and gated per slice." },
        { t: "p", text: "The rest is choosing the cheapest method that still correlates, with *correlates* as a claim you check. The one step that costs real money is calibrating the judge against humans, it only happens once, and skipping it means every number downstream comes from an instrument nobody verified." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe have no evaluation at all. What do you build first?\u201d**" },
        { t: "p", text: "Tracing, before any metric. Everything else depends on having logged tool calls, arguments, retrieved chunk ids and the retrieval scores \u2014 without it a loop and a give-up are indistinguishable, a PII leak through a tool argument is undetectable, and you cannot sample production failures into a golden set. Of six production incidents I have traced, four failed silently, so the trace is the measurement surface." },
        { t: "p", text: "Then a private golden set from real traffic, fifty to a hundred cases, stratified by query type and seeded with every failure we already know about. Known past bugs are the highest-value cases because each is a failure already paid for." },
        { t: "p", text: "Then split the RAG evaluation in two, because most failures are retrieval failures and a combined score sends you to tune the prompt \u2014 which is the cheapest thing to change and usually the wrong one. The branch point is one check: was the gold chunk in the top-k at all." },
        { t: "p", text: "The step I would insist on and expect resistance to is calibrating the judge. A hundred cases labelled by one human and thirty by two, giving Cohen\u2019s kappa against a human ceiling plus a both-orders flip rate. That is a few hundred dollars once, and without it every number downstream comes from an instrument nobody checked \u2014 I have measured a judge saying \u2018good\u2019 to everything scoring 95.1% raw agreement with kappa of exactly zero." },
        { t: "p", text: "Then a CI gate with thresholds committed in advance, mostly reference-free so it survives product change, failing if **any slice** regresses rather than on the aggregate. And online measurement \u2014 implicit feedback, the retrieval no-results rate, an A/B for anything consequential \u2014 with the loop closed back into the golden set." },
        { t: "p", text: "Two habits I would push throughout. Report the denominator for any metric that has a judgement in it, because faithfulness without its claim policy or precision without its k is not comparable to anything. And never ship a single aggregate quality number, because that is precisely what hides a regression confined to one language or one query type." }
      ] }
  ],

  takeaways: [
    "**Key the metric on the question, not the other way round** \u2014 and if the question does not name a unit, it is not yet answerable by a metric.",
    "**Install tracing first**, because 8.9's agent checks and 8.11's production loop both depend on it, and four of six real incidents failed silently.",
    "**Log retrieval scores, not just ids**, since a shifted score distribution is how a silent embedding mismatch becomes visible for one float per query.",
    "**\u201cBLEU/ROUGE don't measure correctness\u201d is too gentle**: an inverted sentence scored ROUGE-1 and ROUGE-2 of 1.0000 against a correct paraphrase's 0.2581.",
    "**\u201cLLM-as-judge is biased\u201d is too gentle too**: a zero-skill judge beat an informative one on raw agreement, 95.1% against 91.0%, with \u03ba = 0.000.",
    "**And the module's own framing needed correcting** \u2014 LMSYS does publish Elo intervals; secondary reporting drops them.",
    "**Build in cost order**: four cheap steps, then judge calibration, then everything cheap again at roughly 3,000\u00d7 less per label.",
    "**Judge calibration is the step that gets skipped** and the one that licenses every number after it \u2014 100 labels with 30 doubled is enough.",
    "**A metric whose denominator is a judgement needs that judgement reported**: corpus and tokenizer, k, class balance, n and temperature, claim policy.",
    "**An aggregate hides a failure confined to a slice**, which is why metrics are reported per slice and gates fail per slice.",
    "**Never ship a single aggregate quality number**, because that is exactly what conceals a regression in one language or query type.",
    "**Offline gates, online decides** \u2014 and the loop from production traces back into the golden set is what makes the suite improve rather than ossify."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What should be built before any evaluation metric?",
        options: [
          "A golden dataset, since metrics need cases to run against",
          "Tracing \u2014 logged tool calls, arguments, retrieved ids and scores \u2014 because agent checks and the production loop both depend on it and silent failures are invisible without it",
          "A judge calibration sample, since the judge gates everything downstream",
          "A CI gate, so regressions are blocked from the first commit"
        ],
        answer: 1,
        why: "Without a trace, a loop and a premature give-up are indistinguishable, PII leaving through a tool argument is undetectable, and production failures cannot be sampled into a golden set \u2014 so the measurement surface has to exist first. Four of six measured production incidents failed silently with every check passing, which is only discoverable from logged detail. The golden set, judge calibration and CI gate all come next and all consume the trace." },

      { stem: "Which of these metrics does NOT need an additional piece of context reported alongside it?",
        options: [
          "Faithfulness, which needs its claim-extraction and derivation policy",
          "Schema validity, which is a deterministic check with no judgement in the denominator",
          "Precision@k, which needs its k",
          "Cohen's \u03ba, which needs its class balance"
        ],
        answer: 1,
        why: "Schema validity is a parse that either succeeds or fails, so there is no judgement to report. The other three all have a judgement or a parameter in the denominator \u2014 faithfulness depends on how aggressively claims are split and whether derived claims count, precision@k is bounded by the relevant-item count over k, and \u03ba is not comparable across different marginal distributions. Perplexity and pass@k belong to the same family, needing corpus plus tokenizer and n plus temperature respectively." },

      { stem: "Why is judge calibration described as the step that gets skipped?",
        options: [
          "Because it requires statistical expertise most teams lack",
          "Because it is the only step that costs human labelling, and skipping it means every downstream number comes from an instrument nobody verified",
          "Because \u03ba is difficult to interpret without a published threshold",
          "Because it must be repeated whenever the judge model is updated"
        ],
        answer: 1,
        why: "The surrounding steps cost thought or model calls, which are cheap; calibration needs humans, which is why it is deferred. The minimum is modest \u2014 about 100 labelled cases with 30 double-labelled for a ceiling \u2014 and at a few dollars per label that is a one-off few hundred dollars. The consequence of skipping it is severe: a judge saying \"good\" to everything reached 95.1% raw agreement with \u03ba of exactly zero, so raw agreement cannot distinguish skill from degeneracy." },

      { stem: "Why should an evaluation strategy avoid a single aggregate quality score?",
        options: [
          "Because aggregates are harder to compute across heterogeneous metrics",
          "Because an aggregate hides a failure confined to one slice \u2014 a regressing query type or language is small precisely because traffic is skewed toward the rest",
          "Because stakeholders will over-interpret a single number",
          "Because reference-free metrics cannot be meaningfully averaged"
        ],
        answer: 1,
        why: "This is the module's recurring structural lesson: an aggregate weighted by traffic cannot surface a problem in a minority segment, and the segment is a minority for the same reason the aggregate is dominated by other traffic. Measured instances include an image row of 0.00 behind an overall 0.76, and self-consistency improving an aggregate while degrading a sub-50% slice. The practical consequence is reporting per slice and gating per slice rather than on the mean." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The whole module, assembled",
    questions: [
      { level: "core",
        q: "How do you choose which evaluation metric to use?",
        strong: "A strong answer starts from the question and the unit.",
        answer: [
          { t: "p", text: "From the question, not from the metric. The first fork is whether it is a model question or an application question, because the unit differs \u2014 a token or a fixed answer for a model, a RAG answer or an agent trajectory or a session for an application. If the question I write down does not name a unit, it is not yet answerable." },
          { t: "p", text: "Then it is mostly a lookup. Same corpus and tokenizer, comparing checkpoints: perplexity, or bits-per-byte if the tokenizers differ. Code: pass@k with real tests. Is retrieval the problem: recall@k and nDCG. Is the answer grounded: faithfulness. Is it good for real users: online A/B and implicit feedback." },
          { t: "p", text: "The governing rule is the cheapest method that still correlates with what users care about, and *correlates* is the part that needs checking rather than assuming. An unvalidated cheap metric supplies confidence instead of information." },
          { t: "p", text: "And I would report the denominator for anything that has a judgement in it \u2014 perplexity with its corpus and tokenizer, precision with its k, faithfulness with its claim policy. Without that, two teams quoting the same metric name are not comparing the same quantity." }
        ] },

      { level: "advanced",
        q: "What are the biggest mistakes teams make in LLM evaluation?",
        strong: "A strong answer gives measured evidence for each.",
        answer: [
          { t: "p", text: "Four, and I can put numbers on most of them. Using surface-overlap metrics on open-ended output \u2014 I measured a sentence with two figures swapped, so it states the opposite, scoring ROUGE-1 and ROUGE-2 of exactly 1.0000 while a correct paraphrase scored 0.2581. They are not weakly correlated with correctness, they are anti-correlated on the case that matters." },
          { t: "p", text: "Trusting a judge without calibrating it. A judge that outputs \u2018good\u2019 for everything reached 95.1% raw agreement with humans on a skewed set \u2014 better than a genuinely informative judge at 91.0% \u2014 with Cohen\u2019s kappa of exactly zero. So raw agreement cannot distinguish skill from degeneracy, and kappa needs its class balance reported alongside." },
          { t: "p", text: "Reporting a single aggregate. Every instance I have measured had structure hidden underneath \u2014 an overall retrieval score of 0.76 concealing a modality at 0.00, self-consistency improving an aggregate while degrading a sub-50% slice. So metrics get reported per slice and gates fail per slice." },
          { t: "p", text: "And treating offline evaluation as proof. An eval set is frozen and traffic is not; four of six production incidents I have worked through failed silently with every offline check green. Offline is a cheap frequent filter and online is the only ground truth." }
        ] },

      { level: "core",
        q: "Build me an evaluation plan for a RAG product.",
        strong: "A strong answer orders it by cost and names the skipped step.",
        answer: [
          { t: "p", text: "Tracing first \u2014 tool calls, arguments, retrieved chunk ids and the retrieval scores. Everything downstream reads from it, and the silent failures are only visible there." },
          { t: "p", text: "Then a private golden set of fifty to a hundred cases from real traffic, stratified by query type and seeded with every known failure, because those are the highest-value cases. Then split the evaluation into retrieval and generation, since most failures are retrieval failures and a combined score sends you to the prompt." },
          { t: "p", text: "Then calibrate the judge, which is the step that gets skipped and the only one costing human labour: a hundred cases labelled once, thirty labelled twice for a ceiling, giving kappa as a fraction of what humans achieve plus a both-orders flip rate. A few hundred dollars once, and it licenses every number after it." },
          { t: "p", text: "Then the CI gate \u2014 thresholds committed in advance, mostly reference-free so it survives corpus change, failing if any slice regresses. And online measurement with implicit feedback weighted over thumbs, the retrieval no-results rate as a leading drift indicator, and an A/B for anything consequential." },
          { t: "p", text: "The loop is what makes it compound: sample production failures, label them, add them to the golden set, re-evaluate. Every incident ends with a test rather than just a fix, which is how the suite gets better instead of staying as it was first written." }
        ] }
    ]
  }
});
