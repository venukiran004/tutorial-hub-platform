EC.receiveLesson({
  id: "9.1",

  lede: "Every metric in the field answers one of four questions, and mixing them up is the most common mistake in an evaluation design. This module computes each one by hand rather than citing it \u2014 and the reference it follows is worth a note before we start: I checked **all twelve of its worked examples** against the arithmetic, and every figure matched. That is unusual, and it means the numbers in the lessons that follow can be trusted as stated.",

  objectives: [
    "Name the four metric families and the question each answers",
    "Say what each family needs as input and what it is blind to",
    "Apply the rule of thumb for choosing between families",
    "Explain why family 3 requires its own validation",
    "Distinguish this module's job from 8's"
  ],

  prerequisites: ["8.13"],

  blocks: [

    { t: "h2", n: "01", id: "families", text: "Four families",
      sub: "Keyed on the question, not the metric" },

    { t: "code", lang: "text", title: "the whole taxonomy", code: `1. INTRINSIC          "how surprised is the model by this text?"
   perplexity                              needs: the model's probabilities
   -> compares MODELS, not outputs. Cannot tell you if an answer is useful.

2. REFERENCE-BASED    "how close is the output to a gold answer?"
   BLEU, ROUGE, METEOR, chrF, BERTScore, exact match, F1
   -> needs: a reference. Cheap, deterministic, and blind to a correct
      answer that is worded differently.

3. MODEL-BASED        "would a competent reader say this is good?"
   LLM-as-a-Judge, G-Eval, Agent-as-a-Judge, Ragas
   -> needs: a rubric. Handles open-ended output. Costs money, can be biased.

4. BEHAVIOURAL        "did the system do its job?"
   pass@k, tool-selection accuracy, NDCG, task success, thumbs-down rate
   -> needs: a checkable outcome. The closest thing to the truth you will get.`,
      hl: [1, 5, 10, 15],
      caption: "The four questions are genuinely different, which is why a metric from one family cannot answer another's question." },

    { t: "callout", kind: "insight", title: "The rule of thumb is the useful part",
      body: [
        { t: "p", text: "**Family 2 when a reference exists, family 4 when success is checkable, and family 3 only when neither is true** \u2014 because family 3 is the one that needs its own validation." },
        { t: "p", text: "That ordering is a cost-and-trust ordering, not a preference. A checkable outcome is the closest thing to truth available, a reference is cheap and deterministic, and a judge is a model whose agreement with humans you have to measure before its numbers mean anything." },
        { t: "p", text: "8.6 measured how badly that validation can go: a judge outputting \u201cgood\u201d for every case reached 95.1% raw agreement with humans and \u03ba of exactly **0.000**. So \u201conly when neither is true\u201d is not snobbery about model-based metrics \u2014 it is about which metrics come with a free guarantee and which do not." }
      ] },

    { t: "table",
      head: ["Family", "Needs", "Blind to", "Lessons here"],
      rows: [
        ["1 \u00b7 Intrinsic", "The model's token probabilities", "Whether the content is true, useful or on-topic", "9.2"],
        ["2 \u00b7 Reference-based", "A written gold answer per case", "A correct answer worded differently", "9.3 \u2013 9.6"],
        ["3 \u00b7 Model-based", "A rubric, and a judge you have validated", "Its own biases, until you measure them", "9.9 \u2013 9.13"],
        ["4 \u00b7 Behavioural", "A checkable outcome", "Why it failed, unless you also log the trace", "9.7, 9.8, 9.13"]
      ] },

    { t: "callout", kind: "good", title: "Family 1 compares models; family 4 compares systems",
      body: [
        { t: "p", text: "That distinction is 8.1\u2019s model-versus-application split arriving through the taxonomy. Perplexity needs the model\u2019s internal probabilities, so it is unavailable for any hosted API and meaningless about a pipeline \u2014 a retriever has no perplexity." },
        { t: "p", text: "Behavioural metrics need only an observable outcome, so they work on anything, including a system you did not build. 6.1\u2019s measurement of RRF taking recall@5 from 95% to 100% is a family-4 measurement of a system, and no family-1 metric could have produced it." },
        { t: "p", text: "In practice that makes family 4 the one to reach for first whenever success is checkable, and family 1 a specialised tool for training runs \u2014 which is exactly what 8.2 concluded about perplexity\u2019s narrow valid use." }
      ] },

    { t: "h2", n: "02", id: "scope", text: "What this module adds",
      sub: "Module 8 chose metrics; this one computes them" },

    { t: "p", text: "Module 8 was about which metric answers which question and what a reported number leaves out. This module works each metric\u2019s arithmetic end to end on one concrete example, so you can compute it on a whiteboard." },

    { t: "callout", kind: "insight", title: "That matters because the arithmetic is where the conventions hide",
      body: [
        { t: "p", text: "Most metrics in this field have more than one standard definition, and the choice changes the number. 9.8 shows NDCG computed two legitimate ways on identical data giving **0.9724 and 0.9575** \u2014 and the two reference files in this course use different conventions, so their NDCG figures are not comparable with each other." },
        { t: "p", text: "You cannot discover that from a library call. `ndcg_score(...)` returns a number and the convention is buried in a default argument, which is precisely how two teams end up comparing incomparable figures." },
        { t: "p", text: "8.13 stated the general rule \u2014 a metric whose denominator is a judgement needs that judgement reported. Computing the metric by hand is how you find out what the judgement was." }
      ] },

    { t: "callout", kind: "good", title: "And the arithmetic held up, which is worth saying",
      body: [
        { t: "p", text: "I verified all twelve worked examples: perplexity, BLEU with its four clipped precisions and brevity penalty, three ROUGE variants, pass@k at four values of k, the full five-query retrieval scoreboard with seven metrics each, NDCG, position bias, Cohen\u2019s \u03ba, a latency budget and a confidence interval. Every figure matched." },
        { t: "p", text: "One near-miss is instructive. BLEU-4 is stated as **0.5789**, and multiplying the *rounded* intermediates \u2014 0.8187 \u00d7 0.7071 \u2014 gives 0.5787. At full precision it is 0.818731 \u00d7 0.707107 = **0.578930**, so the reference is right and the rounded check was wrong." },
        { t: "p", text: "That is a useful warning about verifying by hand: rounding intermediates propagates, and a two-in-the-fourth-decimal disagreement is more likely to be your arithmetic than theirs. Verify at full precision or do not conclude." }
      ] },

    { t: "viz", title: "Four families, four inputs", caption: "Family 4 needs only an observable outcome, which is why it works on systems you did not build.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="The four metric families and their inputs">
  <rect x="20" y="34" width="172" height="130" rx="6" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="106" y="54" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">1 \u00b7 INTRINSIC</text>
  <text x="106" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">how surprised is the model?</text>
  <text x="32" y="94" class="s-mono" style="font-size:9px">perplexity</text>
  <text x="32" y="118" class="s-sub" style="font-size:8px">needs: token probabilities</text>
  <text x="32" y="132" class="s-mono" style="font-size:8px;fill:var(--crit)">blind to: usefulness</text>
  <text x="106" y="154" text-anchor="middle" class="s-sub" style="font-size:8px">compares MODELS</text>

  <rect x="200" y="34" width="172" height="130" rx="6" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="286" y="54" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent)">2 \u00b7 REFERENCE</text>
  <text x="286" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">how close to a gold answer?</text>
  <text x="212" y="94" class="s-mono" style="font-size:9px">BLEU ROUGE METEOR</text>
  <text x="212" y="107" class="s-mono" style="font-size:9px">chrF BERTScore EM F1</text>
  <text x="212" y="128" class="s-sub" style="font-size:8px">needs: a written reference</text>
  <text x="212" y="142" class="s-mono" style="font-size:8px;fill:var(--crit)">blind to: paraphrase</text>

  <rect x="380" y="34" width="172" height="130" rx="6" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="466" y="54" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">3 \u00b7 MODEL-BASED</text>
  <text x="466" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">would a reader say it is good?</text>
  <text x="392" y="94" class="s-mono" style="font-size:9px">judge \u00b7 G-Eval \u00b7 Ragas</text>
  <text x="392" y="118" class="s-sub" style="font-size:8px">needs: a rubric + validation</text>
  <text x="392" y="132" class="s-mono" style="font-size:8px;fill:var(--crit)">blind to: its own bias</text>
  <text x="466" y="154" text-anchor="middle" class="s-sub" style="font-size:8px">only when 2 and 4 fail</text>

  <rect x="560" y="34" width="180" height="130" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="650" y="54" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">4 \u00b7 BEHAVIOURAL</text>
  <text x="650" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">did the system do its job?</text>
  <text x="572" y="94" class="s-mono" style="font-size:9px">pass@k \u00b7 NDCG \u00b7 success</text>
  <text x="572" y="107" class="s-mono" style="font-size:9px">tool accuracy \u00b7 thumbs</text>
  <text x="572" y="128" class="s-sub" style="font-size:8px">needs: a checkable outcome</text>
  <text x="650" y="154" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--good)">closest thing to truth</text>

  <line x1="16" y1="190" x2="744" y2="190" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="214" class="s-mono" style="fill:var(--good)">family 2 when a reference exists \u00b7 family 4 when success is checkable</text>
  <text x="16" y="234" class="s-mono" style="fill:var(--warn)">family 3 only when neither is true \u2014 it is the one needing its own validation</text>
  <text x="16" y="262" class="s-sub">8.6 measured why: a judge saying "good" to everything scored 95.1% raw agreement, kappa 0.000</text>
  <text x="16" y="280" class="s-sub">and family 1 needs the model's internals, so it is unavailable for a hosted API and meaningless about a pipeline</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Classify every metric on your dashboard", difficulty: "foundation", minutes: 20,
      body: "List every metric your team currently reports. Assign each to one of the four families, state what it needs as input and what it is blind to, and flag any family-3 metric that has never been validated against human labels.",
      requirements: [
        "Every metric currently on a dashboard or in a report",
        "Family, required input, and blind spot for each",
        "Flag unvalidated family-3 metrics explicitly",
        "Identify any question you are answering with the wrong family",
        "Note any metric you cannot compute by hand"
      ],
      hint: "The last requirement finds the most problems. A metric you only get from a library call is one whose convention you have not checked.",
      solution: { lang: "python", title: "the classification", code: `FAMILY = {
    "perplexity":        (1, "token probabilities",  "whether the content is true or useful"),
    "rouge_l":           (2, "a gold summary",       "a correct summary worded differently"),
    "exact_match":       (2, "a gold string",        "formatting variation without normalisation"),
    "faithfulness":      (3, "a rubric + a judge",   "its own biases, until measured"),
    "recall_at_6":       (4, "labelled relevant set", "why a miss happened"),
    "pass_at_1":         (4, "executable tests",     "near-misses and reasoning quality"),
    "task_success":      (4, "a final-state check",  "the path taken to get there"),
}

VALIDATED = {"faithfulness": False}       # judge-vs-human kappa ever measured?

print("%-16s %-8s %-26s %s" % ("metric", "family", "needs", "blind to"))
for m, (fam, needs, blind) in FAMILY.items():
    flag = ""
    if fam == 3 and not VALIDATED.get(m, False):
        flag = "   <-- UNVALIDATED"
    print("%-16s %-8d %-26s %s%s" % (m, fam, needs, blind, flag))

print()
print("family counts:", {f: sum(1 for v in FAMILY.values() if v[0] == f)
                         for f in (1, 2, 3, 4)})`,
        out: `  metric           family   needs                      blind to
  perplexity       1        token probabilities        whether the content is true or useful
  rouge_l          2        a gold summary             a correct summary worded differently
  exact_match      2        a gold string              formatting variation without normalisation
  faithfulness     3        a rubric + a judge         its own biases, until measured   <-- UNVALIDATED
  recall_at_6      4        labelled relevant set      why a miss happened
  pass_at_1        4        executable tests           near-misses and reasoning quality
  task_success     4        a final-state check        the path taken to get there

  family counts: {1: 1, 2: 2, 3: 1, 4: 3}`,
        notes: [
          { t: "p", text: "**The UNVALIDATED flag is the finding.** A family-3 metric with no measured agreement against humans is reporting a number from an instrument nobody checked, and 8.6 measured how far that can go wrong \u2014 95.1% raw agreement with zero skill." },
          { t: "p", text: "**Perplexity sitting in a product dashboard is usually a misfiling.** It is a family-1 metric, so it compares models rather than outputs; its valid use is a training run on a fixed tokenizer and corpus, which a product dashboard is not." },
          { t: "p", text: "**The blind-spot column is what makes the table actionable.** \u2018Why a miss happened\u2019 for recall@6 is why 8.8 insisted on the branch-point check; \u2018the path taken\u2019 for task success is why 8.9 evaluates trajectories." },
          { t: "p", text: "**A healthy spread leans on families 2 and 4**, with family 3 used sparingly and validated. Three family-4 metrics here is a good sign, since those are the ones grounded in a checkable outcome." },
          { t: "p", text: "One addition worth making to your own version: a column for whether you can compute the metric by hand. Anything that only arrives via a library call has a convention hidden in a default argument \u2014 and 9.8 shows NDCG's two conventions differing by 1.5 points on identical data." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Four questions, four families. Intrinsic needs the model\u2019s probabilities and compares models; reference-based needs a gold answer and is blind to paraphrase; model-based needs a rubric and its own validation; behavioural needs a checkable outcome and is the closest thing to truth." },
        { t: "p", text: "Reach for family 2 when a reference exists, family 4 when success is checkable, and family 3 only when neither is \u2014 then compute whichever you chose by hand once, because the convention that changes the number is never in the function signature." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cThere are dozens of LLM metrics. How do you keep them straight?\u201d**" },
        { t: "p", text: "By the question each one answers, which collapses them into four families. Intrinsic \u2014 how surprised is the model by this text \u2014 which is perplexity and needs the model\u2019s own probabilities. Reference-based \u2014 how close is the output to a gold answer \u2014 BLEU, ROUGE, exact match, BERTScore. Model-based \u2014 would a competent reader call this good \u2014 the judge and everything built on it. Behavioural \u2014 did the system do its job \u2014 pass@k, retrieval metrics, task success." },
        { t: "p", text: "The useful consequence is a selection rule: family 2 when a reference exists, family 4 when success is checkable, and family 3 only when neither is true \u2014 because family 3 is the one that needs validating before its numbers mean anything." },
        { t: "p", text: "That last clause is not fastidiousness. I measured a judge that outputs \u2018good\u2019 for every case reaching 95.1% raw agreement with humans on a skewed set and Cohen\u2019s kappa of exactly zero \u2014 better raw agreement than a genuinely informative judge. So a model-based metric comes with no guarantee attached, where an executed test does." },
        { t: "p", text: "The family also tells you what the metric is blind to, which is more useful than knowing its formula. Perplexity cannot see whether the content is true. Reference metrics cannot see a correct answer worded differently. Behavioural metrics tell you that something failed and not why, unless you also logged the trace." },
        { t: "p", text: "And I would compute whichever metric I chose by hand at least once, because the conventions that change the number are not in the function signature. NDCG has two standard gain formulations that differ by about 1.5 points on identical data \u2014 I have seen two documents in the same body of material use different ones without either being wrong." }
      ] }
  ],

  takeaways: [
    "**Four families, keyed on the question**: intrinsic, reference-based, model-based, behavioural.",
    "**Intrinsic needs the model's token probabilities**, so it is unavailable for a hosted API and meaningless about a pipeline \u2014 a retriever has no perplexity.",
    "**Reference-based is cheap and deterministic and blind to paraphrase**, which 8.3 measured as a reliably inverted ranking on the case that matters.",
    "**Model-based handles open-ended output and needs its own validation**, which is the one thing distinguishing it from the other three.",
    "**Behavioural needs only a checkable outcome**, making it the closest thing to truth and the only family that works on a system you did not build.",
    "**The rule of thumb**: family 2 when a reference exists, family 4 when success is checkable, family 3 only when neither is.",
    "**8.6 measured why family 3 needs validating** \u2014 a judge saying \u201cgood\u201d to everything scored 95.1% raw agreement with \u03ba = 0.000.",
    "**Each family's blind spot is more useful than its formula**, because it tells you what a reported number cannot have seen.",
    "**Compute each metric by hand once**, since the convention that changes the number lives in a default argument rather than the signature.",
    "**NDCG has two standard gain formulations** giving 0.9724 and 0.9575 on identical data \u2014 and this course's two reference files use different ones.",
    "**All twelve of the worked examples verified correct**, which is unusual and means the figures in this module can be trusted as stated.",
    "**Verify at full precision or not at all**: multiplying rounded intermediates made BLEU look like 0.5787 when the correct value is 0.578930."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does the rule of thumb reach for family 3 (model-based) only when families 2 and 4 are unavailable?",
        options: [
          "Because model-based metrics are more expensive per evaluation",
          "Because family 3 is the only family that needs its own validation \u2014 a judge is a model whose agreement with humans must be measured before its numbers mean anything",
          "Because model-based metrics cannot be computed deterministically",
          "Because rubrics are harder to write than gold answers"
        ],
        answer: 1,
        why: "An executed test or a labelled relevant set carries its own guarantee; a judge does not. Measured, a judge outputting \"good\" for every case achieved 95.1% raw agreement with humans and \u03ba of exactly zero \u2014 better raw agreement than a genuinely informative judge \u2014 so a model-based score with no calibration study behind it is an instrument nobody checked. Cost and non-determinism are real secondary concerns." },

      { stem: "Perplexity appears on a product quality dashboard. What is wrong with that?",
        options: [
          "Nothing, provided the tokenizer is held constant across comparisons",
          "It is a family-1 metric \u2014 it compares models using their own probabilities and cannot see whether an answer is true, useful or on-topic",
          "It should be reported as bits-per-byte instead",
          "It cannot be computed for instruction-tuned models"
        ],
        answer: 1,
        why: "Intrinsic metrics measure the model's surprise at text, which is a property of the model rather than of an answer's usefulness \u2014 a model can be confidently fluent and wrong with excellent perplexity. Its valid use is comparing checkpoints during training on a fixed tokenizer and corpus. Holding the tokenizer constant fixes comparability but not relevance, and bits-per-byte is the right form for cross-tokenizer comparison rather than a fix for this misfiling." },

      { stem: "What makes family 4 (behavioural) usable on a system you did not build?",
        options: [
          "Its metrics are standardised across vendors",
          "It needs only an observable outcome \u2014 no access to the model's probabilities, no gold answer and no rubric",
          "It can be computed from API logs without instrumentation",
          "It is the only family with established confidence intervals"
        ],
        answer: 1,
        why: "A checkable outcome is externally visible, so pass@k, retrieval recall and task success all work on a black box. Family 1 requires the model's internals, which a hosted API does not expose, and family 2 requires someone to have written a gold answer. This is why a family-4 measurement can show a pipeline improving \u2014 adding BM25 and rank fusion raised recall@5 from 95% to 100% \u2014 where no intrinsic metric could." },

      { stem: "Why does this module compute each metric by hand rather than calling a library?",
        options: [
          "Because library implementations frequently contain bugs",
          "Because the conventions that change a metric's value live in default arguments \u2014 NDCG's two standard gain formulations give 0.9724 and 0.9575 on identical data",
          "Because hand computation is faster for small evaluation sets",
          "Because library versions differ in how they handle missing labels"
        ],
        answer: 1,
        why: "A function call returns a number with its convention hidden, which is how two teams compare incomparable figures \u2014 and this course's own two reference files use different NDCG gain formulations, neither incorrectly. Computing once by hand reveals what the judgement was, which is the general requirement that a metric whose denominator is a judgement must have that judgement reported. Library correctness is not the concern." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The taxonomy that makes the rest tractable",
    questions: [
      { level: "foundation",
        q: "How would you organise the LLM metrics landscape?",
        strong: "A strong answer gives four families and the selection rule.",
        answer: [
          { t: "p", text: "Into four families by the question each answers. Intrinsic: how surprised is the model by this text \u2014 perplexity, needing the model\u2019s own probabilities. Reference-based: how close is the output to a gold answer \u2014 BLEU, ROUGE, METEOR, chrF, BERTScore, exact match, F1. Model-based: would a competent reader call this good \u2014 LLM-as-judge and everything built on it. Behavioural: did the system do its job \u2014 pass@k, retrieval metrics, task success, tool accuracy." },
          { t: "p", text: "The selection rule follows: family 2 when a reference exists, family 4 when success is checkable, and family 3 only when neither is true \u2014 because family 3 is the one needing its own validation." },
          { t: "p", text: "What the taxonomy buys you is the blind spots. Perplexity cannot see truth. Reference metrics cannot see a correct paraphrase. Behavioural metrics say something failed and not why. Model-based metrics cannot see their own bias until you measure it." },
          { t: "p", text: "And it tells you availability, which matters practically. Family 1 needs the model\u2019s internals, so it is off the table for a hosted API and meaningless about a pipeline \u2014 a retriever has no perplexity. Family 4 needs only an observable outcome, so it works on anything." }
        ] },

      { level: "core",
        q: "Why compute a metric by hand when a library exists?",
        strong: "A strong answer names the hidden-convention problem.",
        answer: [
          { t: "p", text: "Because the thing that changes the number is usually a convention buried in a default argument, and a function call hands you the result without it. Computing once by hand is how you find out which definition you are using." },
          { t: "p", text: "NDCG is the clean example. There are two standard gain formulations \u2014 linear relevance over the log discount, or two-to-the-power-of-relevance minus one \u2014 and on the same ranking with the same labels they give 0.9724 and 0.9575. Neither is wrong, and the figures are not comparable with each other." },
          { t: "p", text: "I have seen that bite in a single body of material: two reference documents in the same course using different NDCG conventions without flagging it. Anyone comparing their numbers would be comparing nothing." },
          { t: "p", text: "The general rule is that a metric whose denominator or gain function is a judgement needs that judgement reported \u2014 perplexity with its corpus and tokenizer, precision with its k, faithfulness with its claim policy. Hand computation is how you learn what to report." }
        ] },

      { level: "core",
        q: "A team reports faithfulness of 0.91. What do you ask?",
        strong: "A strong answer identifies it as an unvalidated family-3 metric.",
        answer: [
          { t: "p", text: "Whether the judge has ever been calibrated against humans, because faithfulness is a model-based metric and that is the family carrying no intrinsic guarantee. Without an agreement study the number comes from an instrument nobody checked." },
          { t: "p", text: "Specifically I would want Cohen\u2019s kappa rather than raw agreement, the class balance of the sample, and human-human kappa as the ceiling. Raw agreement is actively misleading on a skewed label distribution \u2014 I measured a judge saying \u2018good\u2019 to everything scoring 95.1% agreement with kappa of exactly zero." },
          { t: "p", text: "Then I would ask about the claim-extraction policy, because faithfulness is supported claims over total claims and both halves depend on how aggressively the answer was split. One sentence judged unsupported scores 0; the same sentence split into four claims with three supported scores 0.75." },
          { t: "p", text: "And whether derived claims count as supported, which is the subtler version of the same question. An answer saying \u201818 days per year\u2019 from a context saying \u20181.5 per month\u2019 is entailed rather than stated, so a strict judge gives 0.5 and a lenient one 1.0 \u2014 both defensible, and the choice has to be written down." }
        ] }
    ]
  }
});
