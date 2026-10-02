EC.receiveLesson({
  id: "9.9",

  lede: "Four Ragas metrics, and the reference is explicit that their value is **not the numbers** \u2014 it is that the four **split the blame** between retrieval and generation. The 2\u00d72 that does it is the useful artefact: low faithfulness with high context recall is a generation problem, high faithfulness with low context recall is a retrieval problem. And faithfulness itself is arithmetic \u2014 supported claims over total claims, 4 of 5 giving **0.80** \u2014 where the useful output is *which* claim failed, not the 0.80.",

  objectives: [
    "Name the four Ragas metrics and what each needs as input",
    "Compute faithfulness from a claim decomposition",
    "Use the faithfulness-by-context-recall 2\u00d72 to assign blame",
    "Explain why the failing claim matters more than the score",
    "Say which of the four need a ground-truth answer"
  ],

  prerequisites: ["9.8", "8.8"],

  blocks: [

    { t: "h2", n: "01", id: "four", text: "The four metrics",
      sub: "Each failing for a different reason" },

    { t: "table",
      head: ["Metric", "Question", "Needs", "Fails when"],
      rows: [
        ["**Faithfulness**", "Is every claim in the answer supported by the retrieved context?", "answer + context", "The model hallucinated"],
        ["**Answer relevancy**", "Does the answer address the question asked?", "question + answer", "The model waffled on-topic"],
        ["**Context precision**", "Are the retrieved chunks relevant, and ranked well?", "question + context", "Retrieval returned noise"],
        ["**Context recall**", "Did retrieval find everything needed?", "context + **ground truth**", "Retrieval missed documents"]
      ] },

    { t: "callout", kind: "insight", title: "Only context recall needs a ground-truth answer",
      body: [
        { t: "p", text: "Three of the four are reference-free, which 8.1 argued is what lifts the ceiling on eval-set size \u2014 a gold answer per case bounds you by annotation effort, and faithfulness, answer relevancy and context precision all score against inputs the system already produced." },
        { t: "p", text: "So the practical split is to run those three over sampled production traffic at whatever volume you like, and keep a smaller curated set for context recall and answer correctness. That is the shape 8.10 recommended for a regression suite." },
        { t: "p", text: "It also means context recall is the expensive one and the hardest to keep current, because 8.10 noted gold answers go stale as the corpus moves \u2014 at which point the suite fails for the wrong reason and someone edits the test." }
      ] },

    { t: "h2", n: "02", id: "faithfulness", text: "How faithfulness is actually computed",
      sub: "Three steps, and the third is division" },

    { t: "code", lang: "text", title: "the procedure", code: `1. break the answer into atomic CLAIMS with an LLM
2. for each claim, ask: "is this supported by the context?" (yes / no)
3. faithfulness = supported claims / total claims`,
      hl: [1, 3],
      caption: "Step 1 is a model call and is where the number is really decided. Step 3 is division." },

    { t: "code", lang: "text", title: "worked", code: `an answer produces 5 claims, 4 of which the context supports

faithfulness = 4 / 5 = 0.80`,
      caption: "The arithmetic is trivial. Everything interesting is upstream of it." },

    { t: "callout", kind: "good", title: "The claim that failed is the useful output, not the 0.80",
      body: [
        { t: "p", text: "The reference\u2019s instruction is the operative one: **always log which claim was unsupported**, because that is what a person can act on. A score of 0.80 tells you to investigate; the failing claim tells you what to fix." },
        { t: "p", text: "That is the same argument 8.9 made about agent traces and 6.8 made about production incidents \u2014 the aggregate says something is wrong and the record says what. A faithfulness pipeline that returns only a float has thrown away its most valuable output." },
        { t: "p", text: "It also makes the metric auditable. If you disagree with a 0.80, you can read the five claims and the judgement on each, which is not possible with a score a judge produced holistically \u2014 and 8.6 argued that auditability is why a reasoning-then-verdict judge prompt beats a bare verdict." }
      ] },

    { t: "callout", kind: "warn", title: "The denominator is a judgement, and it moves the number",
      body: [
        { t: "p", text: "How aggressively step 1 splits the answer changes the score. One sentence treated as a single claim and judged unsupported scores **0**; the same sentence split into four claims with three supported scores **0.75**. Same answer, same context." },
        { t: "p", text: "8.12 found the sharper version in a worked example: an answer claiming \u201c18 days per year\u201d from a context stating \u201c1.5 per month\u201d. That claim is *entailed* by arithmetic and not *stated*, so a strict judge gives 0.5 and a lenient one 1.0 \u2014 both defensible." },
        { t: "p", text: "So report the claim-extraction policy and the derivation policy alongside the score. 8.13\u2019s rule in its most concrete form: two teams quoting \u201cRagas faithfulness 0.91\u201d can be computing materially different quantities." }
      ] },

    { t: "h2", n: "03", id: "split", text: "The diagnostic split",
      sub: "The reason to compute four numbers instead of one" },

    { t: "code", lang: "text", title: "the 2x2 that assigns blame", code: `faithfulness LOW  + context recall HIGH  -> GENERATION problem
                                            the context was there and it made things up
                                            fix: prompt, grounding instructions, model

faithfulness HIGH + context recall LOW   -> RETRIEVAL problem
                                            faithful to context that was missing the answer
                                            fix: chunking, embeddings, top-k, hybrid, rerank`,
      hl: [1, 5],
      caption: "Two numbers, four quadrants, two completely different weeks of work." },

    { t: "callout", kind: "insight", title: "The second row is the one people misdiagnose",
      body: [
        { t: "p", text: "High faithfulness with low context recall looks like a success on the headline metric. The model is being scrupulously faithful \u2014 to context that did not contain the answer. So the answer is grounded, cautious, and useless." },
        { t: "p", text: "That is 6.7\u2019s refund-policy case in metric form: a query retrieved a document titled \u201cScenario 1: The Invented Policy\u201d, which is genuinely on-topic and genuinely not an answer. A faithfulness score would pass it." },
        { t: "p", text: "And it is why 8.8 insisted the branch-point check is whether the gold chunk was in the top-k. Faithfulness alone cannot distinguish \u201cgrounded and correct\u201d from \u201cgrounded in the wrong thing\u201d \u2014 you need the retrieval number beside it." }
      ] },

    { t: "callout", kind: "good", title: "And the other two quadrants are worth naming",
      body: [
        { t: "p", text: "**Both high** is the working system, and the thing to check there is answer relevancy \u2014 because a faithful, well-retrieved answer can still waffle on-topic without answering the question, which is exactly what that metric exists to catch." },
        { t: "p", text: "**Both low** is the case where you should stop and look at individual examples rather than tuning anything. It usually means the eval set, the labels or the retrieval configuration is broken rather than that two independent components degraded simultaneously." },
        { t: "p", text: "8.12 is the worked instance of reading a quadrant properly: recall 1.0 with precision 0.5 localised the fault to retrieval precision, and the fix turned out to be a relevance gate rather than a reranker because precision was already at its ceiling." }
      ] },

    { t: "h2", n: "04", id: "relevancy", text: "Answer relevancy and context precision",
      sub: "The two that are easy to skip" },

    { t: "callout", kind: "note", title: "Answer relevancy catches the on-topic non-answer",
      body: [
        { t: "p", text: "A model can produce a paragraph that is entirely faithful to the context, entirely about the right subject, and does not answer the question. That is not hallucination and no faithfulness check sees it." },
        { t: "p", text: "7.11 catalogued hedging as the reward hack evaluation misses, because a vague non-answer reads as careful and avoids the penalty a confident error attracts. Answer relevancy is the metric that closes that gap on the RAG side." },
        { t: "p", text: "It needs only the question and the answer, so it is reference-free and cheap. Of the four it is the one most often omitted and the one whose absence is hardest to notice, because the failures it catches look like good answers." }
      ] },

    { t: "callout", kind: "insight", title: "Context precision is 9.8's precision@k with a judge instead of labels",
      body: [
        { t: "p", text: "It asks whether the retrieved chunks are relevant and ranked well \u2014 the same question as precision@k and MRR, judged by a model rather than scored against a labelled relevant set. That makes it reference-free where 9.8\u2019s metrics are not." },
        { t: "p", text: "The trade is the usual one from 9.1: you gain unbounded eval-set size and you inherit the judge\u2019s biases, which 9.11 and 9.12 are about measuring. Where you have labels, 9.8\u2019s precision@k is the stronger measurement." },
        { t: "p", text: "9.8\u2019s ceiling warning transfers too. With two relevant chunks and k = 5, precision cannot exceed 0.4 however perfect the ranking \u2014 so a low context-precision score may be arithmetic rather than a failure, and it needs its k reported." }
      ] },

    { t: "viz", title: "Two numbers, four quadrants", caption: "Faithfulness against context recall assigns the blame. High faithfulness with low recall is the misdiagnosed case.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Faithfulness by context recall quadrants">
  <text x="16" y="22" class="s-label">FAITHFULNESS (vertical) BY CONTEXT RECALL (horizontal)</text>
  <line x1="120" y1="50" x2="120" y2="250" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="120" y1="250" x2="700" y2="250" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="410" y1="50" x2="410" y2="250" stroke="var(--line)" stroke-width="0.8" stroke-dasharray="4 3"/>
  <line x1="120" y1="150" x2="700" y2="150" stroke="var(--line)" stroke-width="0.8" stroke-dasharray="4 3"/>
  <text x="112" y="56" text-anchor="end" class="s-mono" style="font-size:9px">high</text>
  <text x="112" y="254" text-anchor="end" class="s-mono" style="font-size:9px">low</text>
  <text x="265" y="268" text-anchor="middle" class="s-sub" style="font-size:9px">recall LOW</text>
  <text x="555" y="268" text-anchor="middle" class="s-sub" style="font-size:9px">recall HIGH</text>

  <rect x="130" y="60" width="270" height="80" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="265" y="84" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">RETRIEVAL problem</text>
  <text x="265" y="102" text-anchor="middle" class="s-sub" style="font-size:9px">faithful to context that</text>
  <text x="265" y="116" text-anchor="middle" class="s-sub" style="font-size:9px">was missing the answer</text>
  <text x="265" y="132" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">looks like a success \u2014 misdiagnosed</text>

  <rect x="420" y="60" width="270" height="80" rx="5" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="555" y="84" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">WORKING</text>
  <text x="555" y="104" text-anchor="middle" class="s-sub" style="font-size:9px">now check answer relevancy \u2014</text>
  <text x="555" y="118" text-anchor="middle" class="s-sub" style="font-size:9px">it can still waffle on-topic</text>

  <rect x="130" y="160" width="270" height="80" rx="5" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="265" y="184" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">BOTH LOW</text>
  <text x="265" y="204" text-anchor="middle" class="s-sub" style="font-size:9px">stop tuning, read examples \u2014</text>
  <text x="265" y="218" text-anchor="middle" class="s-sub" style="font-size:9px">usually the eval set or config</text>

  <rect x="420" y="160" width="270" height="80" rx="5" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="555" y="184" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">GENERATION problem</text>
  <text x="555" y="204" text-anchor="middle" class="s-sub" style="font-size:9px">context was there and it</text>
  <text x="555" y="218" text-anchor="middle" class="s-sub" style="font-size:9px">made things up</text>
  <text x="555" y="234" text-anchor="middle" class="s-mono" style="font-size:8px">fix: prompt, grounding, model</text>

  <text x="16" y="284" class="s-mono" style="fill:var(--crit)">faithfulness = supported claims / total claims \u2014 but LOG WHICH CLAIM FAILED, that is the actionable output</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Compute the quadrant for your own failures", difficulty: "advanced", minutes: 35,
      body: "For a sample of your failing cases, compute faithfulness with the claims logged individually and context recall against ground truth, then place each case in the 2x2 and report how your failures distribute. State your claim-extraction and derivation policies.",
      requirements: [
        "Log every extracted claim and its support judgement, not just the score",
        "Compute context recall against a ground-truth answer",
        "Place each failing case in one of the four quadrants",
        "Report the distribution and what it implies about where to work",
        "State the claim-extraction policy and whether derived claims count as supported"
      ],
      hint: "Log the claims. A faithfulness pipeline that returns only a float has discarded the output a person can act on.",
      solution: { lang: "python", title: "faithfulness with claims logged, and the quadrant", code: `def faithfulness(answer, context, judge, derived_counts_as_supported=False):
    """Returns the SCORE and the per-claim record. The record is the point."""
    claims = judge.extract_claims(answer)          # step 1 -- a model call
    records = []
    for c in claims:
        verdict = judge.supports(context, c)       # "stated" | "derived" | "no"
        supported = verdict == "stated" or (
            verdict == "derived" and derived_counts_as_supported)
        records.append({"claim": c, "verdict": verdict, "supported": supported})
    score = sum(r["supported"] for r in records) / max(len(records), 1)
    return score, records

def quadrant(faith, recall, f_hi=0.85, r_hi=0.85):
    if faith >= f_hi and recall >= r_hi:  return "working"
    if faith >= f_hi and recall <  r_hi:  return "RETRIEVAL"
    if faith <  f_hi and recall >= r_hi:  return "GENERATION"
    return "both low -- read examples"

from collections import Counter
dist = Counter()
for case in FAILING:
    f, records = faithfulness(case["answer"], case["context"], JUDGE)
    r = context_recall(case["context"], case["ground_truth"], JUDGE)
    dist[quadrant(f, r)] += 1
    for rec in records:                             # LOG THE CLAIMS
        if not rec["supported"]:
            log.info("unsupported [%s] %s", rec["verdict"], rec["claim"])

for q, n in dist.most_common():
    print("%-28s %d" % (q, n))`,
        out: `  [shape -- run on your own failures]

  RETRIEVAL                    23
  GENERATION                    9
  both low -- read examples     5
  working                       3

  unsupported [derived] "18 vacation days per year"
  unsupported [no]      "the policy was updated in March"`,
        notes: [
          { t: "p", text: "**The distribution is the output that directs the week.** Twenty-three retrieval against nine generation says to work on chunking, embeddings or hybrid search \u2014 and that matches the general prior that most RAG failures are retrieval failures." },
          { t: "p", text: "**The three-way verdict rather than a boolean is what makes the derivation policy explicit.** \u2018stated\u2019, \u2018derived\u2019 and \u2018no\u2019 lets you compute faithfulness both strictly and leniently and see when they diverge \u2014 and the logged \u2018derived\u2019 claim is exactly the \u201818 days per year\u2019 case, entailed by arithmetic rather than stated." },
          { t: "p", text: "**The unsupported-claim log is the actionable artefact.** \u2018The policy was updated in March\u2019 with verdict \u2018no\u2019 is a concrete hallucination a person can investigate; 0.80 is a number that prompts a meeting." },
          { t: "p", text: "**\u2018Working\u2019 appearing among failing cases is informative**, not a contradiction. Those are faithful, well-retrieved answers that still failed \u2014 which usually means answer relevancy, the metric most often omitted, because an on-topic non-answer looks like a good answer." },
          { t: "p", text: "One judgement embedded in the code: the 0.85 thresholds are team decisions rather than derived values, so they should be written down explicitly. A helper function with defaults implies they are principled, and they are not." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "The value of the four is not the numbers \u2014 it is that faithfulness against context recall assigns the blame. Low faithfulness with high recall is generation; high faithfulness with low recall is retrieval, and that second case looks like a success on the headline metric." },
        { t: "p", text: "Faithfulness is supported claims over total claims, so the denominator is a claim-extraction judgement that moves the score \u2014 report it, and report whether derived claims count. And log which claim failed, because that is the output a person can act on." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur Ragas faithfulness is 0.91. Are we in good shape?\u201d**" },
        { t: "p", text: "I cannot tell from that number alone, and the first thing I would want beside it is context recall \u2014 because the two together assign the blame and either one alone can mislead." },
        { t: "p", text: "The dangerous quadrant is high faithfulness with low context recall. The model is being scrupulously faithful to context that did not contain the answer, so you get grounded, cautious, useless responses \u2014 and the headline metric reads 0.91. I have seen the concrete version: a refund-policy query retrieving a document titled \u2018Scenario 1: The Invented Policy\u2019, which is genuinely on-topic and genuinely not an answer. Faithfulness passes it." },
        { t: "p", text: "The other direction, low faithfulness with high recall, is a generation problem \u2014 the context was there and the model made things up \u2014 and the fix is the prompt, grounding instructions or the model. Two numbers, four quadrants, two completely different weeks of work." },
        { t: "p", text: "Then I would ask how the 0.91 was computed, because faithfulness is supported claims over total claims and the claim extraction is a model call. One sentence judged unsupported scores 0; the same sentence split into four claims with three supported scores 0.75. So two teams quoting 0.91 can be measuring different things unless the extraction policy is written down." },
        { t: "p", text: "And specifically whether derived claims count. An answer saying \u201818 days per year\u2019 from a context stating \u20181.5 per month\u2019 is entailed by arithmetic rather than stated \u2014 a strict judge gives 0.5 and a lenient one 1.0, both defensible. I would use the strict definition for a gate because reproducibility matters more than generosity, and track the lenient one alongside." },
        { t: "p", text: "The last thing I would check is answer relevancy, which is the metric teams skip most often. A faithful, well-retrieved answer can still waffle on-topic without answering the question, and the failures it catches look like good answers \u2014 so its absence is unusually hard to notice." }
      ] }
  ],

  takeaways: [
    "**The value of the four Ragas metrics is not the numbers** \u2014 it is that they split the blame between retrieval and generation.",
    "**Only context recall needs a ground-truth answer**; the other three are reference-free, which is what lifts the ceiling on eval-set size.",
    "**So run the three reference-free ones over sampled production traffic** and keep a smaller curated set for context recall.",
    "**Faithfulness is supported claims over total claims** \u2014 4 of 5 giving 0.80, where the arithmetic is trivial and everything interesting is upstream.",
    "**Log which claim failed**, because that is what a person can act on \u2014 a pipeline returning only a float has discarded its most valuable output.",
    "**The denominator is a claim-extraction judgement**: one sentence judged unsupported scores 0, split into four with three supported scores 0.75.",
    "**Report whether derived claims count** \u2014 \u201c18 per year\u201d from \u201c1.5 per month\u201d is entailed, not stated, and the two policies give 0.5 and 1.0.",
    "**Low faithfulness with high context recall is a generation problem** \u2014 the context was there and the model invented.",
    "**High faithfulness with low context recall is a retrieval problem**, and it is the misdiagnosed quadrant because it looks like a success.",
    "**Both high means check answer relevancy next**, since a faithful well-retrieved answer can still waffle on-topic.",
    "**Both low means stop tuning and read examples** \u2014 usually the eval set or configuration rather than two components degrading at once.",
    "**Context precision is 9.8's precision@k judged rather than labelled**, so it inherits both the unbounded eval-set size and the judge's biases."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A system reports high faithfulness and low context recall. What does this diagnose?",
        options: [
          "A generation problem \u2014 the model is not using the context it was given",
          "A retrieval problem \u2014 the model is faithful to context that did not contain the answer, which looks like a success on the headline metric",
          "A labelling problem in the ground-truth answers",
          "Nothing \u2014 the two metrics measure independent properties"
        ],
        answer: 1,
        why: "Faithfulness only asks whether claims are supported by what was retrieved, so a model grounded in irrelevant context scores well while answering nothing useful. This is the misdiagnosed quadrant precisely because the headline number looks healthy \u2014 the concrete case being a refund-policy query that retrieved a document about invented policies, which is on-topic and not an answer. The reverse pattern, low faithfulness with high recall, is the generation problem." },

      { stem: "Why does the reference insist on logging which claim was unsupported rather than just the faithfulness score?",
        options: [
          "Because the score is unreliable without the claim count",
          "Because the score prompts an investigation while the failing claim is the thing a person can act on",
          "Because scores cannot be aggregated across cases without the claims",
          "Because the judge's claim extraction needs auditing for correctness"
        ],
        answer: 1,
        why: "A score of 0.80 says something is wrong somewhere; \"the policy was updated in March\" identifies a specific fabrication to investigate. It is the same argument that applies to agent traces and production incidents \u2014 the aggregate detects and the record diagnoses. Logging claims also makes the metric auditable, since a reader can check the judgement on each claim rather than accepting a holistic score, which is a secondary benefit." },

      { stem: "The same answer and context yield faithfulness of 0 under one claim-extraction policy and 0.75 under another. Why?",
        options: [
          "One policy used a stronger judge model",
          "The denominator is the number of claims, so how aggressively the answer is split changes both numerator and denominator \u2014 one unsupported sentence against four claims with three supported",
          "The second policy counted derived claims as supported",
          "The context was truncated differently between runs"
        ],
        answer: 1,
        why: "Faithfulness is supported claims over total claims and both halves depend on the decomposition, so a single sentence judged unsupported scores 0 while the same content split finely can score 0.75. The derivation question \u2014 whether an arithmetically entailed claim counts as supported \u2014 is a separate second policy that also moves the number, measured at 0.5 against 1.0 on one worked example. Both must be reported for the figure to be comparable." },

      { stem: "Which Ragas metric is most often omitted, and what does its absence hide?",
        options: [
          "Context precision \u2014 it hides retrieval noise",
          "Answer relevancy \u2014 it hides an on-topic non-answer, which is hard to notice because the failures look like good answers",
          "Context recall \u2014 it hides missed documents",
          "Faithfulness \u2014 it hides hallucination"
        ],
        answer: 1,
        why: "A response can be entirely faithful to the context, entirely about the right subject, and still not answer the question \u2014 which no faithfulness or retrieval metric detects. That is the RAG-side version of hedging, where a vague non-answer reads as careful and avoids the penalty a confident error attracts. It needs only the question and the answer, so it is cheap, and its absence is unusually hard to notice because the failures it catches are superficially good." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Four numbers, because one cannot assign blame",
    questions: [
      { level: "advanced",
        q: "What are the Ragas metrics for?",
        strong: "A strong answer leads with blame assignment rather than the scores.",
        answer: [
          { t: "p", text: "Their value is not the numbers \u2014 it is that the four split the blame between retrieval and generation. Faithfulness asks whether every claim is supported by the retrieved context. Answer relevancy asks whether the answer addresses the question. Context precision asks whether the chunks were relevant and well-ranked. Context recall asks whether retrieval found everything needed." },
          { t: "p", text: "The diagnostic is a two-by-two on faithfulness and context recall. Low faithfulness with high recall is a generation problem \u2014 the context was there and the model invented \u2014 and the fix is the prompt, grounding instructions or the model. High faithfulness with low recall is a retrieval problem, and the fix is chunking, embeddings, top-k or hybrid search." },
          { t: "p", text: "The second case is the one people misdiagnose, because it looks like a success. The model is scrupulously faithful to context that did not contain the answer, so you get grounded, cautious and useless, with a healthy headline metric." },
          { t: "p", text: "Only context recall needs a ground-truth answer; the other three are reference-free. That matters practically because the reference-free ones can run over sampled production traffic at any volume, while the gold-answer one is bounded by annotation and goes stale as the corpus moves." }
        ] },

      { level: "core",
        q: "How is faithfulness computed?",
        strong: "A strong answer names the judgement in the denominator.",
        answer: [
          { t: "p", text: "Three steps. Break the answer into atomic claims with a model; for each claim ask whether the context supports it; divide supported by total. An answer producing five claims with four supported scores 0.80." },
          { t: "p", text: "The arithmetic is trivial and the first step is where the number is really decided. How aggressively you split changes both numerator and denominator \u2014 one sentence judged unsupported scores 0, while the same content split into four claims with three supported scores 0.75." },
          { t: "p", text: "There is a second policy question underneath: whether a claim entailed by the context counts as supported. An answer saying \u201818 days per year\u2019 when the context says \u20181.5 per month\u2019 is arithmetically entailed and not stated \u2014 a strict judge gives 0.5 and a lenient one 1.0, and both are defensible readings." },
          { t: "p", text: "So I would classify each claim as stated, derived or unsupported rather than a boolean, compute faithfulness both ways, and use the strict version for a gate because reproducibility beats generosity when the number compares two versions. And log the failing claims \u2014 that is the output someone can act on, where 0.80 only prompts a meeting." }
        ] },

      { level: "core",
        q: "Which of the four would you add first to a system with none?",
        strong: "A strong answer pairs faithfulness with a retrieval number.",
        answer: [
          { t: "p", text: "Faithfulness and context recall together, because neither is interpretable alone and the pair gives the diagnosis. Faithfulness by itself cannot distinguish \u2018grounded and correct\u2019 from \u2018grounded in the wrong thing\u2019." },
          { t: "p", text: "If I could only have one, faithfulness \u2014 it measures the failure that actually costs you, a confident fabrication, and it is reference-free so it scales over production traffic. But I would be explicit that it is half a diagnosis." },
          { t: "p", text: "Where I have a labelled relevant set, I would prefer the labelled retrieval metrics from the retrieval-metrics work \u2014 recall@k and MRR \u2014 over context precision, because a labelled measurement is stronger than a judged one. Context precision is the version you use when you have no labels." },
          { t: "p", text: "And I would add answer relevancy third, earlier than people expect. It is cheap, reference-free, and it catches the on-topic non-answer \u2014 a response that is faithful and well-retrieved and still does not answer the question. Those failures look like good answers, which is why they survive a long time without it." }
        ] }
    ]
  }
});
