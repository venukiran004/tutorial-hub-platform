EC.receiveLesson({
  id: "9.10",

  lede: "Three judging modes, and the one the reference adds beyond 8.6 is **reference-guided** \u2014 give the judge a gold answer and ask it to compare, which converts an open-ended judgement into a much easier one. The rubric is where the work is: a scale whose points are *described* rather than numbered, because \u201crate helpfulness 1\u20135\u201d invites a judge to invent its own anchors and then drift between prompts.",

  objectives: [
    "Distinguish pointwise, pairwise and reference-guided judging",
    "Write a rubric whose scale points are described rather than numbered",
    "Say what G-Eval adds over a plain rubric prompt",
    "Price a judge-based evaluation",
    "Choose the mode from what you have available"
  ],

  prerequisites: ["9.1", "8.6"],

  blocks: [

    { t: "h2", n: "01", id: "modes", text: "Three modes",
      sub: "Ordered by how hard the judge's task is" },

    { t: "dl", items: [
      { k: "Pointwise / rubric", v: "Score one answer against a described scale. Gives an absolute number, which is convenient \u2014 and it is the hardest task, because the judge must hold the scale steady across prompts." },
      { k: "Pairwise", v: "\u201cIs A or B better?\u201d More reliable than absolute scores, and what powers MT-Bench and Arena-Hard. Gives an ordering rather than a level." },
      { k: "**Reference-guided**", v: "Give the judge the gold answer and ask it to compare. The easiest task of the three, and it needs something the other two do not." }
    ] },

    { t: "callout", kind: "insight", title: "Reference-guided is the mode to reach for when you have a gold answer",
      body: [
        { t: "p", text: "\u201cIs this answer as good as this known-correct one?\u201d is a far easier question than \u201cis this answer good?\u201d, because the standard is supplied rather than recalled. The judge is doing comparison rather than evaluation." },
        { t: "p", text: "8.12 measured the general version of this inversion: answer correctness against a gold answer was unambiguous at 1.0 exactly where reference-free faithfulness was murky, because someone had already decided what the right answer was. A reference resolves the policy questions a reference-free judge must guess at." },
        { t: "p", text: "The cost is that you need the gold answer, which puts it back in 9.1\u2019s family 2 for availability \u2014 bounded by annotation. So the practical pattern is reference-guided on a small curated set and pairwise on everything else." }
      ] },

    { t: "callout", kind: "good", title: "Pairwise beats pointwise for the reason preference data exists",
      body: [
        { t: "p", text: "7.1 established the asymmetry: ranking two answers is both cheaper and **better defined** than scoring one. Two experts asked to rate an answer out of five use different scales; asked which of two is better, they often agree." },
        { t: "p", text: "7.4 measured the deeper version \u2014 a Bradley-Terry fit recovers *differences* to a correlation of 0.9989 while the absolute level is mathematically unidentifiable. Pointwise judging is asking a model to report a quantity that is not identified." },
        { t: "p", text: "The cost of pairwise is that it gives an ordering rather than a level, so you need a fixed baseline to compare against \u2014 which is exactly why 7.15\u2019s headline metric is a win rate against the pre-change model rather than an absolute score." }
      ] },

    { t: "h2", n: "02", id: "rubric", text: "A rubric that works",
      sub: "Described scale points, not numbered ones" },

    { t: "code", lang: "text", title: "the shape of a usable rubric", code: `You are an impartial judge. Score the ANSWER on FAITHFULNESS to the CONTEXT.

5 \u2014 every claim is directly stated in the context
4 \u2014 every claim is stated or follows by simple arithmetic from the context
3 \u2014 one minor claim is unsupported; the main answer is grounded
2 \u2014 the main answer is grounded but several claims are unsupported
1 \u2014 the central claim is not supported by the context

Think step by step, listing each claim and its support, then output JSON:
{"score": 1-5, "unsupported_claims": [...], "reason": "..."}`,
      hl: [3, 4, 9, 10],
      caption: "Every point is described. Note line 4 \u2014 the derivation policy 9.9 insisted on, written into the scale itself." },

    { t: "callout", kind: "insight", title: "Describing the points is what makes the scale stable",
      body: [
        { t: "p", text: "\u201cRate helpfulness 1\u20135\u201d gives the judge no anchors, so it invents them \u2014 and invents different ones for different prompts. The scores then drift in a way that looks like variation in answer quality and is variation in the judge\u2019s internal scale." },
        { t: "p", text: "Described points make the task closer to classification than to measurement, which is a task models do far better. It also makes disagreements auditable: if you disagree with a 3, you can check whether the answer matches the description of 3." },
        { t: "p", text: "And it is where 9.9\u2019s derivation policy belongs. Putting \u201cor follows by simple arithmetic\u201d explicitly at level 4 settles the \u201c18 days per year\u201d question in the rubric rather than leaving the judge to decide silently and inconsistently." }
      ] },

    { t: "callout", kind: "good", title: "Ask for the reasoning first and a structured verdict after",
      body: [
        { t: "p", text: "Reasoning before the verdict matters because the alternative is a verdict the model then rationalises. Listing each claim and its support *before* producing the score makes the score a conclusion rather than a guess." },
        { t: "p", text: "The structured output buys a free deterministic check: an unparseable response is a detectable failure rather than a silently miscounted score. 8.4 noted answer-parsing as the quietest source of benchmark variance, and a schema removes it here." },
        { t: "p", text: "And `unsupported_claims` in the schema is 9.9\u2019s instruction enforced structurally \u2014 the judge cannot return a score without also returning the actionable part, which is the thing a person can work from." }
      ] },

    { t: "h2", n: "03", id: "geval", text: "G-Eval, in one paragraph",
      sub: "The refinement worth knowing" },

    { t: "callout", kind: "insight", title: "It weights the score by the model's own token probabilities",
      body: [
        { t: "p", text: "A plain rubric judge returns a discrete score \u2014 3 or 4, with nothing in between. G-Eval reads the probability the model assigns to each score token and takes the expectation, so a judge that is genuinely torn between 3 and 4 returns 3.5 rather than arbitrarily picking one." },
        { t: "p", text: "That removes a quantisation problem that matters more than it sounds. With a 1\u20135 scale and a hundred cases, discrete scores give you a coarse average dominated by which side of a boundary each borderline case fell on \u2014 and borderline cases are exactly where a judge is least reliable." },
        { t: "p", text: "The catch is that it needs **token log-probabilities**, which puts it in 9.1\u2019s family-1 availability bracket: unavailable for any API that does not expose them. That is a real constraint and it is why G-Eval is less widely used than the idea deserves." }
      ] },

    { t: "h2", n: "04", id: "cost", text: "What it costs",
      sub: "And the comparison that makes it look cheap" },

    { t: "callout", kind: "good", title: "Against human labelling it is nearly free; against nothing it is not",
      body: [
        { t: "p", text: "7.12 priced the comparison: human preference labels at $1\u20135 each against roughly $0.001 for a model call \u2014 a flat 3,000\u00d7 ratio that does not improve with scale, because both are linear." },
        { t: "p", text: "So a judge-based suite over ten thousand cases is a few dollars of inference, which is noise. The cost that bites is the **both-orders requirement** from 9.11, which doubles it, and any reasoning-before-verdict prompt, which multiplies output tokens." },
        { t: "p", text: "The real cost is latency rather than money. A judged suite with reasoning on ten thousand cases is a long serial run unless you parallelise it, which is why judge evaluation tends to be nightly rather than per-commit \u2014 and why 8.10 recommended deterministic checks for the CI gate." }
      ] },

    { t: "callout", kind: "warn", title: "And the uncounted cost is the calibration study",
      body: [
        { t: "p", text: "9.12 is the lesson, and the point here is that the calibration is the only part that does not scale. A hundred human labels with thirty doubled is a one-off few hundred dollars, and it is what licenses every number the judge produces afterwards." },
        { t: "p", text: "Skipping it is the common failure and the expensive one. 8.6 measured a judge outputting \u201cgood\u201d for everything reaching **95.1% raw agreement** with humans and \u03ba of exactly **0.000** \u2014 a number that would have passed any review that did not compute \u03ba." },
        { t: "p", text: "So the honest accounting is: inference nearly free, latency manageable, calibration a fixed one-time cost per judge. Budget the third explicitly or the first two are buying nothing." }
      ] },

    { t: "viz", title: "Three modes, by how hard the judge's task is", caption: "Reference-guided is easiest and needs a gold answer. Pointwise is hardest and asks for an unidentified quantity.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="Three judging modes compared">
  <rect x="26" y="34" width="220" height="110" rx="6" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="136" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">POINTWISE</text>
  <text x="136" y="74" text-anchor="middle" class="s-sub" style="font-size:9px">"score this 1-5"</text>
  <text x="42" y="98" class="s-mono" style="font-size:9px">+ gives an absolute level</text>
  <text x="42" y="114" class="s-mono" style="font-size:9px;fill:var(--crit)">- hardest task</text>
  <text x="42" y="130" class="s-sub" style="font-size:8px">asks for a quantity that is</text>
  <text x="42" y="140" class="s-sub" style="font-size:8px">not mathematically identified</text>

  <rect x="262" y="34" width="220" height="110" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="372" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">PAIRWISE</text>
  <text x="372" y="74" text-anchor="middle" class="s-sub" style="font-size:9px">"is A or B better?"</text>
  <text x="278" y="98" class="s-mono" style="font-size:9px">+ better defined</text>
  <text x="278" y="114" class="s-mono" style="font-size:9px">- ordering, not a level</text>
  <text x="278" y="134" class="s-sub" style="font-size:8px">needs a fixed baseline</text>

  <rect x="498" y="34" width="236" height="110" rx="6" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="616" y="56" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">REFERENCE-GUIDED</text>
  <text x="616" y="74" text-anchor="middle" class="s-sub" style="font-size:9px">"as good as this gold answer?"</text>
  <text x="514" y="98" class="s-mono" style="font-size:9px">+ easiest task of the three</text>
  <text x="514" y="114" class="s-mono" style="font-size:9px">- needs a gold answer</text>
  <text x="514" y="134" class="s-sub" style="font-size:8px">the standard is supplied, not recalled</text>

  <line x1="16" y1="170" x2="744" y2="170" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="194" class="s-label">THE RUBRIC IS WHERE THE WORK IS</text>
  <text x="30" y="216" class="s-mono" style="font-size:9px;fill:var(--good)">describe every scale point \u2014 "rate 1-5" lets the judge invent anchors and drift</text>
  <text x="30" y="234" class="s-mono" style="font-size:9px;fill:var(--good)">reasoning first, then structured JSON \u2014 or you get a verdict the model rationalises</text>
  <text x="30" y="252" class="s-mono" style="font-size:9px;fill:var(--crit)">inference is ~3000x cheaper than human labels; the calibration study is the cost that does not scale</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Write a rubric and test it for scale stability", difficulty: "advanced", minutes: 35,
      body: "Write a pointwise rubric with every scale point described, then test whether the judge holds the scale steady: score the same set of answers twice in different random orders and in two different prompt batches, and report how often the score changes.",
      requirements: [
        "Describe every scale point, including any derivation policy",
        "Require reasoning before the verdict and a structured output",
        "Score the same answers twice and report the self-consistency rate",
        "Compare against a pairwise run on the same answers",
        "State which mode you would ship and why"
      ],
      hint: "Score the same answer twice in different batches. A judge that changes its own score is not holding the scale steady, and that instability caps everything downstream.",
      solution: { lang: "python", title: "a rubric, and the stability test", code: `RUBRIC = """You are an impartial judge. Score the ANSWER on FAITHFULNESS to the CONTEXT.

5 - every claim is directly stated in the context
4 - every claim is stated or follows by simple arithmetic from the context
3 - one minor claim is unsupported; the main answer is grounded
2 - the main answer is grounded but several claims are unsupported
1 - the central claim is not supported by the context

List each claim and whether the context supports it, THEN output JSON:
{"score": 1-5, "unsupported_claims": [...], "reason": "..."}"""

def judge_pointwise(judge, context, answer):
    out = judge(RUBRIC, context=context, answer=answer)
    return json.loads(out)          # a parse failure is a detectable failure

def self_consistency(judge, cases, repeats=2):
    """Does the judge give the SAME answer the same score twice?"""
    scores = {}
    for r in range(repeats):
        for case in random.sample(cases, len(cases)):     # shuffle the batch
            s = judge_pointwise(judge, case["context"], case["answer"])["score"]
            scores.setdefault(case["id"], []).append(s)
    same = sum(len(set(v)) == 1 for v in scores.values())
    drift = sum(abs(v[0] - v[1]) for v in scores.values()) / len(scores)
    return {"identical": same / len(scores), "mean_abs_drift": drift}

m = self_consistency(JUDGE, CASES)
print("pointwise self-consistency: %.3f identical, mean drift %.2f points"
      % (m["identical"], m["mean_abs_drift"]))

# compare: does pairwise agree with itself more often?
pw = pairwise_self_consistency(JUDGE, PAIRS)
print("pairwise self-consistency : %.3f" % pw)`,
        out: `  [shape -- run with your own judge]

  pointwise self-consistency: 0.712 identical, mean drift 0.34 points
  pairwise self-consistency : 0.871`,
        notes: [
          { t: "p", text: "**The self-consistency number caps everything downstream.** If the judge gives the same answer different scores 29% of the time, no amount of averaging recovers a precision finer than that drift \u2014 and it is a ceiling you cannot see from a single run." },
          { t: "p", text: "**Pairwise being more self-consistent than pointwise is the expected result**, and it is the measured form of the argument that ranking is better defined than scoring. The same asymmetry makes preference data cheaper and more consistent than written demonstrations." },
          { t: "p", text: "**Shuffling the batch between repeats is what makes the test valid.** Scoring in a fixed order lets position and neighbouring examples influence the judge consistently, which hides the instability you are trying to measure." },
          { t: "p", text: "**Mean absolute drift in points is more useful than the identical rate** for deciding what precision to report. A drift of 0.34 on a 1\u20135 scale means differences under half a point are noise, so reporting a judge mean to two decimals is false precision." },
          { t: "p", text: "One thing the rubric does deliberately: level 4 writes the derivation policy into the scale. That settles whether an arithmetically entailed claim counts as supported, rather than leaving the judge to decide silently and differently each time \u2014 which is a large part of what pointwise instability actually is." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Three modes by how hard the judge\u2019s task is: pointwise asks for a level that is not mathematically identified, pairwise asks for an ordering and is better defined, reference-guided supplies the standard and is easiest of all." },
        { t: "p", text: "The rubric is the work \u2014 describe every scale point so the judge classifies rather than measures, write the derivation policy into the scale, and ask for reasoning before a structured verdict. Inference is ~3,000\u00d7 cheaper than human labels; the calibration study is the cost that does not scale and the one that licenses the rest." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe want an LLM judge for answer quality. How do you set it up?\u201d**" },
        { t: "p", text: "First I would ask whether we have gold answers for any of the cases, because that opens the easiest mode. Reference-guided judging \u2014 \u2018is this as good as this known-correct answer?\u2019 \u2014 is a much simpler task than \u2018is this good?\u2019, since the standard is supplied rather than recalled from the model\u2019s own notion of quality." },
        { t: "p", text: "Where there is no gold answer, pairwise over pointwise. Ranking two answers is better defined than scoring one \u2014 the same asymmetry that makes preference data more consistent than written demonstrations, and the deeper reason is that an absolute quality level is not a mathematically identified quantity. Pointwise asks the model to report something that does not exist independently of a scale it has to invent." },
        { t: "p", text: "If pointwise is unavoidable because someone needs an absolute number, then the rubric is where all the work goes. Describe every scale point rather than numbering them \u2014 \u2018rate helpfulness 1 to 5\u2019 lets the judge invent anchors and then drift between prompts, and that drift reads as variation in answer quality." },
        { t: "p", text: "I would write the contested policies into the scale itself. For faithfulness, level 4 saying \u2018stated or follows by simple arithmetic\u2019 settles whether a derived claim counts as supported \u2014 which otherwise gets decided silently and inconsistently, and I have seen that single question move a faithfulness score between 0.5 and 1.0." },
        { t: "p", text: "Then reasoning before the verdict and a structured JSON output, with the unsupported claims required in the schema. Reasoning first stops the judge rationalising a guess; the schema makes an unparseable response a detectable failure; and requiring the claims means the judge cannot return a score without also returning the part a person can act on." },
        { t: "p", text: "On cost, inference is close to free \u2014 about three thousand times cheaper per label than a human. The cost that actually matters is the calibration study, which is the only part that does not scale: about a hundred human labels with thirty doubled, once per judge. Skip it and every number afterwards comes from an instrument nobody checked \u2014 I have measured a judge saying \u2018good\u2019 to everything scoring 95.1% raw agreement with kappa of exactly zero." }
      ] }
  ],

  takeaways: [
    "**Three modes, ordered by task difficulty**: pointwise hardest, pairwise better defined, reference-guided easiest because the standard is supplied.",
    "**Reference-guided is the mode to use when a gold answer exists** \u2014 8.12 measured correctness against gold being unambiguous exactly where reference-free faithfulness was murky.",
    "**Pointwise asks for a quantity that is not identified**, which is why 7.4's Bradley-Terry fit recovers differences at 0.9989 correlation while the absolute level is unidentifiable.",
    "**Pairwise gives an ordering, not a level**, so it needs a fixed baseline \u2014 hence a win rate against the pre-change model.",
    "**Describe every scale point**: \u201crate 1\u20135\u201d lets the judge invent anchors and drift between prompts, which reads as variation in answer quality.",
    "**Described points turn measurement into classification**, a task models do far better, and make a disagreement auditable against the description.",
    "**Write the derivation policy into the scale** \u2014 \u201cstated or follows by simple arithmetic\u201d settles the question that otherwise moves faithfulness between 0.5 and 1.0.",
    "**Reasoning before the verdict**, or you get a verdict the model rationalises; and a structured schema makes an unparseable response detectable.",
    "**Require the unsupported claims in the schema**, so the judge cannot return a score without the actionable part.",
    "**G-Eval weights the score by token probabilities**, removing a quantisation problem \u2014 but it needs log-probabilities, so it is unavailable on many APIs.",
    "**Inference is ~3,000\u00d7 cheaper than human labels**, and the both-orders requirement plus reasoning tokens are what actually drive the bill.",
    "**The calibration study is the cost that does not scale**, and the one that licenses every number the judge produces."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is reference-guided judging described as the easiest of the three modes?",
        options: [
          "Because it requires fewer output tokens from the judge",
          "Because the standard is supplied rather than recalled \u2014 comparing an answer to a known-correct one is a simpler task than evaluating quality in the abstract",
          "Because it eliminates position bias",
          "Because it can be computed deterministically"
        ],
        answer: 1,
        why: "\"Is this as good as this gold answer?\" gives the judge an explicit anchor, turning evaluation into comparison. The same inversion was measured elsewhere: correctness against a gold answer was unambiguous exactly where reference-free faithfulness depended on an unstated policy, because someone had already decided what the right answer was. The cost is needing the gold answer, which bounds it by annotation effort." },

      { stem: "What is wrong with a rubric that says \u201crate helpfulness 1\u20135\u201d without describing the points?",
        options: [
          "Five points is too coarse a scale for quality judgements",
          "The judge invents its own anchors and invents different ones for different prompts, so scores drift in a way that looks like variation in answer quality",
          "It prevents the judge from producing structured output",
          "Odd-numbered scales bias judges toward the midpoint"
        ],
        answer: 1,
        why: "Without described anchors the scale is reconstructed by the judge on each call, so the same answer can receive different scores depending on what else was in the prompt \u2014 and that instability is indistinguishable from real quality variation in the aggregate. Describing each point turns the task into classification, which models do substantially better, and makes disagreements auditable against the written description." },

      { stem: "Why does the reference recommend reasoning before the verdict rather than after?",
        options: [
          "Because reasoning tokens are cheaper when generated first",
          "Because a verdict produced first is then rationalised \u2014 reasoning first makes the score a conclusion rather than a guess",
          "Because JSON must be the last token sequence for parsing to succeed",
          "Because it reduces position bias in pairwise comparisons"
        ],
        answer: 1,
        why: "If the score is emitted first, any subsequent explanation is constructed to justify it rather than to reach it, so the trace stops being evidence. Reasoning first also yields an auditable record of which claims were considered supported. Requiring structured output after the reasoning is a separate benefit \u2014 it turns an unparseable response into a detectable failure rather than a silently miscounted score." },

      { stem: "What is the main practical limitation of G-Eval?",
        options: [
          "It requires a pairwise setup, so it cannot produce absolute scores",
          "It needs token log-probabilities to weight the score, which many APIs do not expose",
          "It is substantially more expensive per judgement than a plain rubric",
          "It cannot incorporate a described rubric"
        ],
        answer: 1,
        why: "G-Eval takes the expectation over score tokens using the model's own probabilities, which removes the quantisation of discrete 3-or-4 scores \u2014 so a judge genuinely torn returns 3.5. That requires access to log-probabilities, putting it in the same availability bracket as perplexity: unavailable wherever the API does not expose them. It works with a rubric and costs essentially the same as the underlying call." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Three modes, and the rubric that carries the work",
    questions: [
      { level: "core",
        q: "What are the modes of LLM-as-a-judge?",
        strong: "A strong answer orders them by how hard the judge's task is.",
        answer: [
          { t: "p", text: "Three, and I would order them by how hard the judge\u2019s job is rather than by popularity. Pointwise \u2014 score one answer against a rubric \u2014 gives an absolute number and is the hardest, because the judge has to hold a scale steady across prompts." },
          { t: "p", text: "Pairwise \u2014 is A or B better \u2014 is more reliable, and it is what powers MT-Bench and Arena-Hard. The reason is the same asymmetry that makes preference data work: ranking two answers is better defined than scoring one, and an absolute quality level is not a mathematically identified quantity." },
          { t: "p", text: "Reference-guided \u2014 here is the gold answer, is this as good \u2014 is the easiest of the three, because the standard is supplied rather than recalled. I would use it wherever a gold answer exists, which is usually a small curated set." },
          { t: "p", text: "So the practical pattern is reference-guided on the curated set, pairwise against a fixed baseline on everything else, and pointwise only when someone genuinely needs an absolute level \u2014 with the understanding that it is the least stable." }
        ] },

      { level: "advanced",
        q: "What makes a good judge rubric?",
        strong: "A strong answer describes the scale points and the output format.",
        answer: [
          { t: "p", text: "Described scale points rather than numbered ones. \u2018Rate helpfulness 1 to 5\u2019 gives the judge no anchors, so it invents them \u2014 and different ones for different prompts, which produces drift that reads as variation in answer quality." },
          { t: "p", text: "Describing each point turns the task from measurement into classification, which models do much better, and it makes a disagreement auditable: if you think a 3 is wrong, you can check the answer against the written description of 3." },
          { t: "p", text: "I would also write the contested policies into the scale. For faithfulness, having level 4 say \u2018stated or follows by simple arithmetic\u2019 settles whether a derived claim counts as supported \u2014 a question I have seen move a faithfulness score between 0.5 and 1.0 depending on which way the judge happened to read it." },
          { t: "p", text: "Then reasoning before the verdict, a structured JSON output, and the unsupported claims required in the schema. The first stops rationalisation, the second makes a parse failure detectable, and the third means the judge cannot return a score without the part a person can act on." }
        ] },

      { level: "core",
        q: "What does a judge-based evaluation cost?",
        strong: "A strong answer separates inference cost from the calibration cost.",
        answer: [
          { t: "p", text: "Inference is close to free in the terms that matter. A model call is roughly a thousandth of a dollar against one to five dollars for a human label \u2014 a flat three-thousand-fold ratio that does not improve with scale, since both are linear." },
          { t: "p", text: "What actually drives the bill is the multipliers: running both orders to measure position bias doubles it, and asking for reasoning before the verdict multiplies output tokens. Those are worth paying and they should be budgeted rather than discovered." }
          ,{ t: "p", text: "The bigger practical constraint is latency rather than money. A judged suite with reasoning over ten thousand cases is a long serial run unless parallelised, which is why judge evaluation tends to be nightly while the CI gate uses deterministic checks." },
          { t: "p", text: "And the cost that does not scale is the calibration study \u2014 roughly a hundred human labels with thirty double-labelled, once per judge. That is a few hundred dollars and it is what licenses every number afterwards. Skipping it is the common failure: I measured a judge outputting \u2018good\u2019 for every case reaching 95.1% raw agreement with humans and Cohen\u2019s kappa of exactly zero." }
        ] }
    ]
  }
});
