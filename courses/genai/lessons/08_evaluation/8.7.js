EC.receiveLesson({
  id: "8.7",

  lede: "Four things that are not capability: hallucination rate, toxicity and bias, jailbreak resistance, and calibration. The last is the quietest, because it is invisible to every other metric \u2014 answers can be exactly as accurate as before while the expressed confidence stops tracking whether they are right. Measured on a simulated model overconfident by 0.20, **every** confidence bin sat below the diagonal and ECE came out at **0.2075** against **0.0136** for a calibrated one. And 7.15 noted that RLHF is known to *degrade* this.",

  objectives: [
    "Measure a hallucination rate and say what it is relative to",
    "Report toxicity and bias disaggregated rather than in aggregate",
    "Test jailbreak resistance in both directions",
    "Compute Expected Calibration Error and read a reliability table",
    "Name the robustness axes a single accuracy number hides"
  ],

  prerequisites: ["8.6", "7.15"],

  blocks: [

    { t: "h2", n: "01", id: "hallucination", text: "Hallucination rate",
      sub: "The denominator is the whole question" },

    { t: "p", text: "The percentage of factual claims unsupported by ground truth \u2014 or, for a RAG system, unsupported by the retrieved context, which the reference calls groundedness and 8.8 develops." },

    { t: "callout", kind: "insight", title: "\u201cUnsupported by what\u201d changes the metric entirely",
      body: [
        { t: "p", text: "Against *ground truth* you are measuring whether the claim is true, which needs an oracle and is therefore reference-based and expensive. Against *retrieved context* you are measuring whether the claim is supported by what the system was given \u2014 reference-free, cheap, and a different question." },
        { t: "p", text: "The second is strictly easier and genuinely useful, because 6.8 measured that most \u201cthe model is wrong\u201d failures are retrieval failures: if the right chunk never entered the context, the model had nothing to be faithful to. Groundedness isolates the generator from the retriever." },
        { t: "p", text: "But it cannot catch a confidently repeated falsehood that *was* in the retrieved context. 6.7 found the sharpest example \u2014 a query about refund policy retrieving a document titled \u201cScenario 1: The Invented Policy\u201d, which is on-topic, faithfully quotable and not an answer. Groundedness would pass it." }
      ] },

    { t: "callout", kind: "warn", title: "And the unit is a claim, not an answer",
      body: [
        { t: "p", text: "A hallucination rate per *answer* conflates an answer with one unsupported detail and an answer that is entirely invented. The unit that makes the metric actionable is the individual factual claim, which means decomposing the answer first \u2014 which is itself a model call and introduces its own noise." },
        { t: "p", text: "That decomposition step is where RAGAS-style faithfulness scoring spends most of its cost, and it is worth knowing that the number depends on how aggressively claims are split. A long sentence broken into four claims and judged three-of-four supported scores 0.75; left whole and judged unsupported it scores 0." },
        { t: "p", text: "So report the claim-extraction policy alongside the rate, for the same reason 8.2 required reporting the corpus with a perplexity and 8.6 required the class balance with a \u03ba. A rate whose denominator is a judgement needs that judgement stated." }
      ] },

    { t: "h2", n: "02", id: "toxicity", text: "Toxicity and bias",
      sub: "Disaggregated, or the aggregate hides it" },

    { t: "p", text: "Perspective API, ToxiGen, BBQ and BOLD are the standard suites, and the reference\u2019s instruction is the operative part: **report disaggregated by group**." },

    { t: "callout", kind: "insight", title: "This is 6.5's zero row in a different costume",
      body: [
        { t: "p", text: "6.5 measured a multimodal system with an aggregate Hit@5 of 0.76 where the image row was **0.00** \u2014 a modality that was never retrieved at all, invisible behind a respectable headline because most queries were text queries and those worked." },
        { t: "p", text: "A toxicity or bias metric aggregates the same way. A model can be well-behaved on the majority of groups and badly behaved on one, and the mean will look fine because that group is a small share of the evaluation set. The aggregate is structurally incapable of showing it." },
        { t: "p", text: "So the reporting unit is per group, and the summary statistic to watch is the **worst** group rather than the mean. That is the same reasoning as 7.10\u2019s per-slice accuracy check, where self-consistency improved the aggregate while degrading a sub-50% slice." }
      ] },

    { t: "h2", n: "03", id: "jailbreak", text: "Jailbreak and injection resistance",
      sub: "And the other direction, which has a degenerate optimum" },

    { t: "p", text: "Attack suites measure the percentage of refusals that hold under attack. 6.7 covered the RAG-specific case \u2014 injection arriving through a retrieved document, where the corpus is the one input the pipeline trusts by construction." },

    { t: "callout", kind: "warn", title: "Measure over-refusal too, or the optimum is useless",
      body: [
        { t: "p", text: "7.15 made this point and it is worth repeating here because it is the single most common evaluation gap in safety work: if you only measure whether the model does things it should not, the trivially optimal model refuses everything. It scores perfectly and ships to nobody." },
        { t: "p", text: "7.11 catalogued hedging as the reward hack evaluation misses, and over-refusal is its safety-flavoured sibling \u2014 a refusal is never *wrong* the way an incorrect answer is, so any one-directional evaluation makes refusing the risk-free strategy." },
        { t: "p", text: "So you need a set of questions that *should* be answered and a refusal rate on it. What you are looking for is a model that discriminates, not one that is cautious, and only both measurements together distinguish those." }
      ] },

    { t: "h2", n: "04", id: "calibration", text: "Calibration",
      sub: "The regression invisible to every other metric" },

    { t: "math", tex: "\\text{ECE} = \\sum_{b=1}^{B} \\frac{n_b}{N}\\,\\big|\\,\\text{conf}(b) - \\text{acc}(b)\\,\\big|" },

    { t: "p", text: "Bin predictions by stated confidence, and for each bin take the absolute gap between mean confidence and actual accuracy. ECE is the sample-weighted average of those gaps \u2014 zero means confidence tracks accuracy exactly." },

    { t: "code", lang: "python", title: "g85.py \u00a7D \u2014 a calibrated model and one overconfident by 0.20", code: `def ece(conf, correct, n_bins=10):
    for lo, hi in zip(edges, edges[1:]):
        m = (conf > lo) & (conf <= hi)
        out += m.sum() / total * abs(conf[m].mean() - correct[m].mean())`,
      out: `  well calibrated      : ECE = 0.0136, accuracy = 0.758, mean confidence = 0.749
  overconfident by 0.20: ECE = 0.2075, accuracy = 0.544, mean confidence = 0.752`,
      hl: [5, 6],
      caption: "Both models state the same average confidence, 0.749 against 0.752. Only one of them is entitled to it." },

    { t: "callout", kind: "insight", title: "Mean confidence is not a calibration metric, and this is why",
      body: [
        { t: "p", text: "The two models have almost identical mean confidence \u2014 0.749 and 0.752 \u2014 and accuracies of 0.758 and 0.544. A dashboard showing average confidence would report them as equivalent, and one of them is overconfident by twenty points everywhere." },
        { t: "p", text: "ECE separates them at 0.0136 against 0.2075, because it compares confidence to accuracy *within each bin* rather than comparing two averages. A model can have perfectly matched global averages while being overconfident on easy cases and underconfident on hard ones, and only the binned view shows it." }
        ,{ t: "p", text: "That is the same reason 7.15 bins win rates by length rather than reporting mean length beside a win rate: an aggregate comparison of two averages cannot detect a structure that cancels." }
      ] },

    { t: "code", lang: "python", title: "g85.py \u00a7D \u2014 the reliability table for the overconfident model", code: `for lo, hi, cnt, c, a in rows:
    print(lo, hi, cnt, c, a, a - c)`,
      out: `  bin                     n   confidence     accuracy        gap
  0.5-0.6               778        0.549        0.305     -0.245
  0.6-0.7               770        0.651        0.457     -0.194
  0.7-0.8               814        0.748        0.523     -0.225
  0.8-0.9               863        0.849        0.674     -0.175
  0.9-1.0               775        0.949        0.748     -0.201`,
      hl: [3, 7],
      caption: "Every gap is negative \u2014 accuracy below confidence in all five bins. That consistency is the signature." },

    { t: "callout", kind: "good", title: "Read the sign pattern, not just the headline",
      body: [
        { t: "p", text: "All five gaps negative and of similar size is **systematic overconfidence** \u2014 a model that needs its confidences shifted down, which temperature scaling fixes with a single parameter fitted on held-out data." },
        { t: "p", text: "Gaps alternating in sign would be **noise**, needing more data rather than recalibration. Gaps negative at high confidence and positive at low would be a model that is overconfident when sure and underconfident when unsure, which is the hardest pattern and needs a non-monotone correction." },
        { t: "p", text: "So ECE is a scalar summary of a table you should look at. The scalar tells you there is a problem; the sign pattern tells you which problem, and therefore whether a one-parameter fix will work." }
      ] },

    { t: "callout", kind: "warn", title: "Why this matters downstream, beyond honesty",
      body: [
        { t: "p", text: "Anything that *consumes* stated confidence degrades with it. 6.7\u2019s relevance gate and faithfulness check both make decisions from a model\u2019s expressed certainty, and a miscalibrated model makes those gates fire at the wrong times \u2014 while every accuracy metric stays unchanged." },
        { t: "p", text: "7.10\u2019s routing has the same dependency: escalating hard requests to more test-time compute requires knowing which requests are hard, and self-reported confidence is the cheapest signal for that. Miscalibration silently misroutes." },
        { t: "p", text: "And RLHF is known to degrade calibration, which 7.15 listed as a measurement to take and is worth connecting to 7.11\u2019s catalogue \u2014 confident assertion scores well with human raters, so preference optimisation applies pressure toward exactly the confidence that calibration penalises." }
      ] },

    { t: "h2", n: "05", id: "robustness", text: "Robustness",
      sub: "The axes a single accuracy number hides" },

    { t: "dl", items: [
      { k: "Paraphrase", v: "Accuracy under reworded prompts. 8.3 measured the metric-side version \u2014 a correct paraphrase scoring 0.2581 where an inverted sentence scored 1.0000 \u2014 and the model-side version is the same blind spot from the other direction." },
      { k: "Typos", v: "Accuracy under realistic input noise, which production traffic contains and eval sets usually do not." },
      { k: "Distractors", v: "Accuracy with irrelevant content in context. 6.8 measured this directly for retrieval and found 20,000 off-topic chunks changed recall by nothing \u2014 but that was the retriever, not the generator." },
      { k: "Long context", v: "\u201cLost in the middle\u201d \u2014 accuracy as a function of where in the context the needed information sits, which is why 6.8's generation-branch fix is to move the most relevant chunk last." }
    ] },

    { t: "callout", kind: "insight", title: "Robustness is slicing, and slicing is the recurring lesson",
      body: [
        { t: "p", text: "Every item above is an accuracy measurement conditioned on something the headline number averages over. That makes robustness testing the same discipline as 6.5\u2019s per-modality split, 7.10\u2019s per-slice voting check and 8.6\u2019s class balance \u2014 a single number hides structure, and the structure is where the failures are." },
        { t: "p", text: "The cheap version is to take your existing eval set and perturb it: reword every prompt, add typos to a copy, pad the context with irrelevant material, and move the needed information to different positions. Four new sets from one, with no additional labelling." },
        { t: "p", text: "That last property is what makes robustness affordable. The labels transfer unchanged because the perturbation does not alter the correct answer \u2014 which is exactly the assumption to verify on a sample before trusting the result." }
      ] },

    { t: "viz", title: "Calibration: same mean confidence, different entitlement", caption: "0.749 against 0.752 mean confidence. ECE 0.0136 against 0.2075, with every bin below the diagonal.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Reliability diagram for a calibrated and an overconfident model">
  <text x="16" y="22" class="s-label">RELIABILITY \u2014 ACCURACY AGAINST STATED CONFIDENCE</text>
  <line x1="110" y1="240" x2="420" y2="240" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="110" y1="240" x2="110" y2="48" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="110" y1="240" x2="420" y2="48" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="430" y="52" class="s-sub" style="font-size:9px">perfect</text>
  <text x="102" y="52" text-anchor="end" class="s-mono" style="font-size:9px">1.0</text>
  <text x="102" y="244" text-anchor="end" class="s-mono" style="font-size:9px">0.5</text>
  <text x="110" y="258" text-anchor="middle" class="s-mono" style="font-size:9px">0.5</text>
  <text x="420" y="258" text-anchor="middle" class="s-mono" style="font-size:9px">1.0</text>
  <text x="265" y="278" text-anchor="middle" class="s-sub" style="font-size:9px">stated confidence</text>

  <polyline points="140,187 202,147 264,129 326,97 388,86" fill="none" stroke="var(--crit)" stroke-width="2.2"/>
  <circle cx="140" cy="187" r="4" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <circle cx="202" cy="147" r="4" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <circle cx="264" cy="129" r="4" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <circle cx="326" cy="97" r="4" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <circle cx="388" cy="86" r="4" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="396" y="100" class="s-mono" style="font-size:9px;fill:var(--crit)">overconfident</text>
  <text x="396" y="113" class="s-mono" style="font-size:9px;fill:var(--crit)">ECE 0.2075</text>

  <line x1="470" y1="48" x2="470" y2="260" stroke="var(--line)" stroke-width="1"/>
  <text x="492" y="68" class="s-label">THE SIGN PATTERN</text>
  <text x="492" y="94" class="s-mono" style="font-size:9px;fill:var(--crit)">all gaps negative, similar size</text>
  <text x="506" y="108" class="s-sub" style="font-size:9px">-&gt; systematic overconfidence</text>
  <text x="506" y="121" class="s-sub" style="font-size:9px">-&gt; temperature scaling fixes it</text>
  <text x="492" y="148" class="s-mono" style="font-size:9px;fill:var(--warn)">gaps alternating in sign</text>
  <text x="506" y="162" class="s-sub" style="font-size:9px">-&gt; noise, need more data</text>
  <text x="492" y="189" class="s-mono" style="font-size:9px;fill:var(--violet)">negative high, positive low</text>
  <text x="506" y="203" class="s-sub" style="font-size:9px">-&gt; hardest case, non-monotone</text>
  <text x="492" y="232" class="s-mono" style="font-size:9px">mean confidence 0.749 vs 0.752</text>
  <text x="492" y="246" class="s-sub" style="font-size:9px">identical \u2014 which is why ECE bins</text>
  <text x="16" y="292" class="s-mono" style="fill:var(--crit)">accuracy 0.758 vs 0.544 at the same stated confidence \u2014 invisible to every accuracy metric</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Measure calibration and robustness from one eval set", difficulty: "advanced", minutes: 40,
      body: "Compute ECE and a reliability table for your own system, then generate four perturbed versions of your eval set — paraphrased, typo-injected, distractor-padded, and position-shifted — and report accuracy on each. Report the worst slice rather than the mean.",
      requirements: [
        "Elicit a confidence per answer and bin it into at least five bins",
        "Report the reliability table with the per-bin gap and its sign",
        "State which calibration pattern you see and whether one parameter would fix it",
        "Build the four perturbed sets without new labelling, and verify the labels still hold on a sample",
        "Report the worst-performing slice, not the average"
      ],
      hint: "Look at the sign pattern in the reliability table before reaching for a fix. All-negative gaps are a one-parameter problem; alternating signs mean you need more data, not recalibration.",
      solution: { lang: "python", title: "ECE, the reliability table, and four free eval sets", code: `import numpy as np

def ece_table(conf, correct, n_bins=10):
    conf, correct = np.asarray(conf), np.asarray(correct)
    edges = np.linspace(0, 1, n_bins + 1)
    ece, rows = 0.0, []
    for lo, hi in zip(edges, edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if not m.any():
            continue
        c, a = conf[m].mean(), correct[m].mean()
        ece += m.sum() / len(conf) * abs(c - a)
        rows.append({"bin": "%.1f-%.1f" % (lo, hi), "n": int(m.sum()),
                     "conf": c, "acc": a, "gap": a - c})
    return ece, rows

def diagnose(rows):
    gaps = [r["gap"] for r in rows]
    if all(g < -0.03 for g in gaps):
        return "systematic overconfidence -- temperature scaling should fix it"
    if all(g > 0.03 for g in gaps):
        return "systematic underconfidence -- same one-parameter fix, other direction"
    if gaps[0] > 0 and gaps[-1] < 0:
        return "underconfident when unsure, overconfident when sure -- non-monotone"
    return "no consistent pattern -- likely noise, collect more data"

# four perturbed sets from one, no new labelling
PERTURB = {
    "original":   lambda c: c,
    "paraphrase": lambda c: {**c, "q": paraphrase(c["q"])},
    "typos":      lambda c: {**c, "q": inject_typos(c["q"], rate=0.05)},
    "distractor": lambda c: {**c, "ctx": c["ctx"] + irrelevant_chunks(5)},
    "needle_mid": lambda c: {**c, "ctx": move_needle_to_middle(c["ctx"])},
}

e, rows = ece_table(CONF, CORRECT)
print("ECE %.4f -- %s" % (e, diagnose(rows)))
for r in rows:
    print("  %-10s n=%-5d conf %.3f  acc %.3f  gap %+.3f"
          % (r["bin"], r["n"], r["conf"], r["acc"], r["gap"]))

print()
scores = {name: accuracy([f(c) for c in EVAL]) for name, f in PERTURB.items()}
for name, s in sorted(scores.items(), key=lambda kv: kv[1]):
    print("%-12s %.3f%s" % (name, s, "   <- WORST" if s == min(scores.values()) else ""))`,
        out: `  [shape -- the overconfident case's real numbers, perturbations illustrative]

  ECE 0.2075 -- systematic overconfidence -- temperature scaling should fix it
    0.5-0.6    n=778   conf 0.549  acc 0.305  gap -0.245
    0.6-0.7    n=770   conf 0.651  acc 0.457  gap -0.194
    0.7-0.8    n=814   conf 0.748  acc 0.523  gap -0.225
    0.8-0.9    n=863   conf 0.849  acc 0.674  gap -0.175
    0.9-1.0    n=775   conf 0.949  acc 0.748  gap -0.201

  needle_mid   0.612   <- WORST
  distractor   0.698
  typos        0.731
  paraphrase   0.744
  original     0.771`,
        notes: [
          { t: "p", text: "**`diagnose` is the part worth writing.** ECE of 0.2075 says there is a problem; five consistently negative gaps say it is systematic overconfidence, which temperature scaling fixes with one parameter fitted on held-out data. Alternating signs would mean noise and more data rather than recalibration." },
          { t: "p", text: "**Note the two models' mean confidences were 0.749 and 0.752** \u2014 nearly identical \u2014 while accuracies were 0.758 and 0.544. Any dashboard reporting average confidence would have called them equivalent, which is precisely why ECE bins rather than comparing two averages." },
          { t: "p", text: "**The four perturbations cost no new labelling**, because rewording a question or padding its context does not change the correct answer. That is what makes robustness testing affordable \u2014 and it is also the assumption to verify on a sample, since an aggressive paraphrase occasionally does change what is being asked." },
          { t: "p", text: "**Report the worst slice.** Position-shifting the needle costs more than any other perturbation here, which points at a lost-in-the-middle problem and a concrete fix \u2014 move the most relevant chunk last in the prompt. The mean across the five sets would have hidden that." },
          { t: "p", text: "One honest limit: eliciting a usable confidence from a chat model is itself unreliable, since a verbalised \u2018I am 80% sure\u2019 is a generated token sequence rather than a probability. Token log-probabilities are better behaved where you can get them, and where you cannot, the calibration measurement inherits the elicitation's noise." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "These four metrics measure things capability scores cannot see, and three of them need **disaggregation** \u2014 hallucination by claim, toxicity by group, robustness by perturbation \u2014 because an aggregate is structurally unable to show a failure confined to a slice." },
        { t: "p", text: "Calibration is the quiet one: two models with mean confidence 0.749 and 0.752 had accuracies of 0.758 and 0.544, so averages cannot detect it and ECE bins for exactly that reason. Read the sign pattern, not just the scalar, and measure refusal in both directions or the optimum refuses everything." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur model\u2019s accuracy is unchanged after alignment but users say it feels less trustworthy. What would you measure?\u201d**" },
        { t: "p", text: "Calibration first, because it is the one regression invisible to every accuracy metric \u2014 answers can be exactly as accurate while the expressed confidence stops tracking whether they are right. And RLHF is known to degrade it, which makes sense: confident assertion scores well with human raters, so preference optimisation pushes toward exactly the confidence calibration penalises." },
        { t: "p", text: "The measurement is Expected Calibration Error with a reliability table. I would not report mean confidence, because it cannot see this: in a simulation I ran, a well-calibrated model and one overconfident by 0.20 had mean confidences of 0.749 and 0.752 \u2014 essentially identical \u2014 with accuracies of 0.758 and 0.544. ECE separated them at 0.0136 against 0.2075, because it compares confidence to accuracy within each bin rather than comparing two averages." },
        { t: "p", text: "Then I would read the sign pattern rather than just the scalar. All five bins negative and of similar size is systematic overconfidence, which temperature scaling fixes with a single parameter on held-out data. Alternating signs would mean noise and a need for more data. Negative at high confidence and positive at low is the hard case and needs a non-monotone correction." },
        { t: "p", text: "I would also check refusal in both directions, since \u2018feels less trustworthy\u2019 sometimes means over-refusal rather than overconfidence. If you only measure whether the model does things it should not, the trivially optimal model refuses everything and scores perfectly \u2014 so you need a set of questions that should be answered and a refusal rate on it." },
        { t: "p", text: "And I would run the robustness slices, because an unchanged aggregate accuracy can hide a shifted distribution of failures. Reword the prompts, inject typos, pad the context with distractors, and move the needed information to different positions. That is four extra eval sets with no new labelling, since none of those perturbations changes the correct answer." },
        { t: "p", text: "One caveat I would state about the calibration work: eliciting confidence from a chat model is unreliable, because a verbalised \u2018I am 80% sure\u2019 is a generated token sequence rather than a probability. Where I can get token log-probabilities I would use those instead, and where I cannot, the measurement inherits the elicitation\u2019s noise and I would say so." }
      ] }
  ],

  takeaways: [
    "**A hallucination rate needs its denominator stated** \u2014 unsupported by ground truth is a truth claim and needs an oracle; unsupported by retrieved context is groundedness and is reference-free.",
    "**Groundedness isolates the generator from the retriever**, which matters because most \u201cthe model is wrong\u201d failures are retrieval failures.",
    "**But it passes a faithfully-quoted falsehood** \u2014 6.7's refund-policy query retrieved a document about invented policies, which is on-topic and not an answer.",
    "**The unit is a claim, not an answer**, so report the claim-extraction policy: splitting one sentence into four claims changes a 0 into a 0.75.",
    "**Toxicity and bias must be disaggregated by group**, because an aggregate cannot show a failure confined to one group \u2014 the same structure as 6.5's 0.00 image row behind a 0.76 headline.",
    "**Watch the worst group, not the mean**, which is the same discipline as per-slice accuracy checks.",
    "**Measure refusal in both directions**, or the trivially optimal model refuses everything and scores perfectly on the half you remembered.",
    "**Mean confidence is not a calibration metric**: two models at 0.749 and 0.752 mean confidence had accuracies of 0.758 and 0.544.",
    "**ECE bins and compares within bins**, separating those two at 0.0136 against 0.2075 where averages could not.",
    "**Read the sign pattern** \u2014 all-negative gaps mean systematic overconfidence that temperature scaling fixes; alternating signs mean noise.",
    "**Miscalibration breaks anything that consumes confidence**, including relevance gates, faithfulness checks and hard-request routing, while accuracy stays unchanged.",
    "**Four robustness axes come free from one eval set** \u2014 paraphrase, typos, distractors, position \u2014 because none of them changes the correct answer."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two models have mean stated confidence of 0.749 and 0.752, with accuracies of 0.758 and 0.544. What does this show about reporting mean confidence?",
        options: [
          "That the second model needs more training data to improve accuracy",
          "That mean confidence cannot detect miscalibration \u2014 the averages are nearly identical while one model is overconfident by about twenty points, which is why ECE bins and compares within bins",
          "That confidence elicitation failed for the second model",
          "That the two models should be compared on the same evaluation set"
        ],
        answer: 1,
        why: "A global average can match while the relationship between confidence and accuracy is badly wrong, so a dashboard showing mean confidence would call these models equivalent. ECE separates them at 0.0136 against 0.2075 by comparing confidence to accuracy inside each bin. It is the same reason win rates are binned by length rather than reporting mean length alongside \u2014 an aggregate comparison cannot detect structure that cancels." },

      { stem: "A reliability table shows all five confidence bins with negative gaps of similar magnitude. What does this indicate and what fixes it?",
        options: [
          "Noise \u2014 more evaluation data is needed before drawing a conclusion",
          "Systematic overconfidence \u2014 a single temperature parameter fitted on held-out data should correct it",
          "A non-monotone miscalibration requiring a learned per-bin correction",
          "That the confidence elicitation is returning a constant value"
        ],
        answer: 1,
        why: "Consistency is the signal: gaps all in the same direction and of similar size mean the confidences need shifting, which is a one-parameter problem. Alternating signs would indicate noise and a need for more data; negative at high confidence with positive at low would be the non-monotone case needing a more flexible correction. This is why the scalar ECE should be read alongside the table rather than on its own." },

      { stem: "Why is measuring only jailbreak resistance insufficient for safety evaluation?",
        options: [
          "Because attack suites do not cover every known jailbreak technique",
          "Because the trivially optimal model refuses everything \u2014 it scores perfectly and is useless \u2014 so an over-refusal set is needed as the other direction",
          "Because jailbreak resistance correlates poorly with toxicity scores",
          "Because refusal rates are not comparable across model families"
        ],
        answer: 1,
        why: "Optimising only the direction that penalises harmful outputs has a degenerate solution, and a refusal is never wrong the way an incorrect answer is \u2014 so one-directional evaluation makes refusing risk-free. This is the safety-flavoured version of hedging as a reward hack. Coverage gaps in attack suites are a genuine separate concern; the structural problem is that the metric as stated has a useless optimum." },

      { stem: "A RAG system reports a groundedness score of 0.94. What can still be wrong?",
        options: [
          "Nothing \u2014 groundedness is the strongest available faithfulness measure",
          "A faithfully-quoted falsehood \u2014 groundedness asks whether claims are supported by retrieved context, not whether the context answers the question or is true",
          "The score cannot be trusted without a reference answer for each case",
          "Groundedness requires human labels, so 0.94 is a judge estimate"
        ],
        answer: 1,
        why: "Groundedness is reference-free and measures claim support against what was retrieved, which usefully isolates the generator from the retriever \u2014 most \"the model is wrong\" failures are retrieval failures. But it passes an answer that accurately reflects a retrieved document which does not actually answer the question: a refund-policy query retrieving a document titled \"Scenario 1: The Invented Policy\" is on-topic, quotable and not an answer. Truth against ground truth is a separate, more expensive measurement." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The four things capability scores cannot see",
    questions: [
      { level: "advanced",
        q: "How would you measure whether a model is calibrated?",
        strong: "A strong answer computes ECE and reads the sign pattern.",
        answer: [
          { t: "p", text: "Expected Calibration Error with a reliability table. Bin answers by stated confidence, and for each bin compare mean confidence to actual accuracy; ECE is the sample-weighted mean of those absolute gaps." },
          { t: "p", text: "What I would not do is report mean confidence, because it cannot detect the problem. In a simulation I ran, a calibrated model and one overconfident by 0.20 had mean confidences of 0.749 and 0.752 with accuracies of 0.758 and 0.544 \u2014 indistinguishable on averages, and ECE separated them at 0.0136 against 0.2075." },
          { t: "p", text: "Then I would read the sign pattern rather than the scalar, because it tells you which fix applies. All bins negative and similar in size is systematic overconfidence, which temperature scaling corrects with one parameter on held-out data. Alternating signs mean noise and more data. Negative at high confidence and positive at low is the hard case needing a non-monotone correction." },
          { t: "p", text: "The caveat worth stating is elicitation. A verbalised \u2018I am 80% sure\u2019 is a generated token sequence rather than a probability, so where token log-probabilities are available I would use those, and where they are not, the calibration figure inherits the elicitation\u2019s noise." }
        ] },

      { level: "core",
        q: "Why does calibration matter if accuracy is unchanged?",
        strong: "A strong answer names the downstream consumers.",
        answer: [
          { t: "p", text: "Because several things in a production system consume stated confidence, and they all degrade while every accuracy metric stays flat. A relevance gate and a faithfulness check both make decisions from expressed certainty, so a miscalibrated model makes those gates fire at the wrong times." },
          { t: "p", text: "Routing has the same dependency. Escalating hard requests to more test-time compute means knowing which requests are hard, and self-reported confidence is the cheapest available signal for that \u2014 so miscalibration silently misroutes, spending compute on easy requests and not on hard ones." },
          { t: "p", text: "There is also the direct user-facing cost. A model that is confident when wrong trains users to distrust it when right, which is a worse outcome than being visibly uncertain, and no accuracy number reflects it." },
          { t: "p", text: "And it is a known side effect of alignment specifically. Confident assertion scores well with human raters, so preference optimisation applies pressure toward exactly the overconfidence that calibration penalises \u2014 which is why it belongs on the post-alignment evaluation list rather than being assumed stable." }
        ] },

      { level: "core",
        q: "How would you test robustness without building a new eval set?",
        strong: "A strong answer perturbs the existing set and reports the worst slice.",
        answer: [
          { t: "p", text: "Perturb the set you already have, four ways. Reword each prompt for paraphrase robustness. Inject typos at a realistic rate, because production traffic contains them and eval sets usually do not. Pad the context with irrelevant material for distractor robustness. And move the needed information to different positions, for lost-in-the-middle." },
          { t: "p", text: "The reason this is affordable is that none of those perturbations changes the correct answer, so the labels transfer unchanged \u2014 four extra eval sets for no additional labelling. That is also the assumption to verify on a sample, since an aggressive paraphrase occasionally does change what is being asked." },
          { t: "p", text: "Then I would report the worst slice rather than the mean. In practice position-shifting tends to cost the most, which points at a concrete fix \u2014 put the most relevant chunk last in the prompt \u2014 and that finding would be invisible in an average across the five sets." },
          { t: "p", text: "It is the same discipline as the rest of this area: a single number hides structure, and the structure is where the failures are. I have seen an aggregate retrieval score of 0.76 sitting on top of a modality scoring 0.00, which is the general form of the lesson." }
        ] }
    ]
  }
});
