EC.receiveLesson({
  id: "9.14",

  lede: "The metrics for refusal, adversarial robustness and confidence \u2014 and the one with real arithmetic in it is calibration. Expected Calibration Error bins predictions by stated confidence and averages the gap between confidence and accuracy per bin, which is the only form that detects the failure: 8.7 measured a calibrated model and one overconfident by 0.20 having **mean confidences of 0.749 and 0.752** and accuracies of **0.758 and 0.544**. Averages cannot see it; binning gives 0.0136 against 0.2075.",

  objectives: [
    "Compute Expected Calibration Error and read a reliability table",
    "Explain why mean confidence cannot detect miscalibration",
    "Diagnose which calibration fix applies from the sign pattern",
    "Measure refusal in both directions",
    "Generate robustness slices from an existing eval set"
  ],

  prerequisites: ["9.13", "8.7"],

  blocks: [

    { t: "h2", n: "01", id: "ece", text: "Expected Calibration Error",
      sub: "Binned, because averages cancel" },

    { t: "math", tex: "\\text{ECE} = \\sum_{b=1}^{B} \\frac{n_b}{N}\\,\\big|\\,\\text{conf}(b) - \\text{acc}(b)\\,\\big|" },

    { t: "p", text: "Bin by stated confidence, take the absolute gap between mean confidence and actual accuracy inside each bin, and weight by bin size. Zero means confidence tracks accuracy exactly." },

    { t: "code", lang: "python", title: "8.7 \u00a7D \u2014 two models with nearly identical mean confidence", code: `def ece(conf, correct, n_bins=10):
    for lo, hi in zip(edges, edges[1:]):
        m = (conf > lo) & (conf <= hi)
        out += m.sum() / total * abs(conf[m].mean() - correct[m].mean())`,
      out: `  well calibrated      : ECE = 0.0136, accuracy = 0.758, mean confidence = 0.749
  overconfident by 0.20: ECE = 0.2075, accuracy = 0.544, mean confidence = 0.752`,
      hl: [5, 6],
      caption: "Mean confidence 0.749 against 0.752 \u2014 indistinguishable. Accuracy 0.758 against 0.544." },

    { t: "callout", kind: "insight", title: "This is why ECE bins rather than comparing two averages",
      body: [
        { t: "p", text: "A dashboard reporting average confidence would call these two models equivalent, and one of them is overconfident by twenty points everywhere. The global averages match while the *relationship* between confidence and accuracy is badly wrong." },
        { t: "p", text: "Binning compares confidence to accuracy **within** each bin, so a structure that cancels in the aggregate becomes visible. ECE separates them at 0.0136 against 0.2075." },
        { t: "p", text: "It is the same discipline as 7.15 binning win rates by length rather than reporting mean length beside a win rate, and 8.7\u2019s general rule: an aggregate cannot detect a structure that cancels." }
      ] },

    { t: "code", lang: "text", title: "8.7 \u00a7D \u2014 the reliability table for the overconfident model", code: `bin                     n   confidence     accuracy        gap
0.5-0.6               778        0.549        0.305     -0.245
0.6-0.7               770        0.651        0.457     -0.194
0.7-0.8               814        0.748        0.523     -0.225
0.8-0.9               863        0.849        0.674     -0.175
0.9-1.0               775        0.949        0.748     -0.201`,
      hl: [2, 6],
      caption: "All five gaps negative and of similar size. That consistency is the diagnostic signal." },

    { t: "callout", kind: "good", title: "Read the sign pattern, because it names the fix",
      body: [
        { t: "p", text: "**All gaps negative and similar in size** is systematic overconfidence, which temperature scaling corrects with a single parameter fitted on held-out data. That is the cheap case." },
        { t: "p", text: "**Gaps alternating in sign** is noise, needing more data rather than recalibration \u2014 and applying a temperature fit to noise will make things worse rather than better." },
        { t: "p", text: "**Negative at high confidence and positive at low** is a model overconfident when sure and underconfident when unsure. That is the hardest pattern and needs a non-monotone correction, so a one-parameter fix will not work." }
      ] },

    { t: "callout", kind: "warn", title: "And eliciting the confidence is itself unreliable",
      body: [
        { t: "p", text: "A verbalised \u201cI am 80% sure\u201d is a generated token sequence rather than a probability, so the calibration measurement inherits whatever noise the elicitation has. Where token log-probabilities are available they are better behaved \u2014 which puts this in 9.1\u2019s family-1 availability bracket." },
        { t: "p", text: "That is worth saying before reporting an ECE, because a poor figure can reflect bad elicitation rather than bad calibration. The two have different fixes and the metric cannot distinguish them." },
        { t: "p", text: "9.10\u2019s G-Eval has the same dependency for the same reason: both want the model\u2019s probability mass over tokens rather than its verbal report of its own confidence." }
      ] },

    { t: "h2", n: "02", id: "refusal", text: "Refusal, in both directions",
      sub: "Or the metric has a useless optimum" },

    { t: "callout", kind: "trap", title: "Measuring only harmful output makes \u201crefuse everything\u201d optimal",
      body: [
        { t: "p", text: "A red-team suite measures whether the model does things it should not. Optimise only that and the trivially best model refuses every request \u2014 it scores perfectly and ships to nobody." },
        { t: "p", text: "7.11 catalogued hedging as the reward hack evaluation misses, because a refusal is never *wrong* the way an incorrect answer is. Over-refusal is its safety-flavoured sibling: any one-directional evaluation makes refusing the risk-free strategy." },
        { t: "p", text: "So you need an **over-refusal set** \u2014 questions that should be answered \u2014 and a refusal rate on it. What you are measuring for is a model that discriminates, and only the two together distinguish that from one that is merely cautious. 8.7 measured 0.187 over-refusal beside 0.962 red-team pass, which is a real product decision rather than a clean win." }
      ] },

    { t: "h2", n: "03", id: "robustness", text: "Robustness",
      sub: "Four free eval sets from one" },

    { t: "dl", items: [
      { k: "Paraphrase", v: "Accuracy under reworded prompts. 9.3 measured the metric-side blind spot \u2014 a correct paraphrase scoring BLEU 0.000000 \u2014 and this is the model-side version." },
      { k: "Typos", v: "Accuracy under realistic input noise, which production traffic contains and eval sets usually do not." },
      { k: "Distractors", v: "Accuracy with irrelevant content in context. 6.8 measured 20,000 off-topic chunks changing retrieval recall by nothing \u2014 but that was the retriever, not the generator." },
      { k: "Long context", v: "\u201cLost in the middle\u201d \u2014 accuracy as a function of where the needed information sits, which is why 6.8\u2019s generation-branch fix is to put the most relevant chunk last." }
    ] },

    { t: "callout", kind: "good", title: "They cost no new labelling, which is what makes robustness affordable",
      body: [
        { t: "p", text: "None of the four perturbations changes the correct answer, so the labels transfer unchanged \u2014 four extra eval sets from one, with no annotation. That is unusually good value in evaluation work." },
        { t: "p", text: "The assumption to verify on a sample is that the perturbation really is label-preserving. An aggressive paraphrase occasionally changes what is being asked, and a typo injected into a key entity can change the answer rather than obscure it." },
        { t: "p", text: "And report the **worst** slice rather than the mean, which 8.7 and 6.5 both argued. 8.7\u2019s shape had position-shifting costing the most, pointing at a concrete fix \u2014 move the most relevant chunk last \u2014 that a four-set average would have hidden." }
      ] },

    { t: "viz", title: "Calibration: the structure averages cannot see", caption: "Mean confidence 0.749 vs 0.752, accuracy 0.758 vs 0.544. Binning separates them at 0.0136 vs 0.2075.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img" aria-label="Mean confidence hides miscalibration that binning reveals">
  <text x="16" y="22" class="s-label">TWO MODELS, NEARLY IDENTICAL MEAN CONFIDENCE</text>
  <text x="26" y="52" class="s-mono" style="font-size:9px">calibrated</text>
  <rect x="150" y="40" width="300" height="18" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="458" y="54" class="s-mono" style="font-size:9px">mean conf 0.749</text>
  <text x="600" y="54" class="s-mono" style="font-size:9px;fill:var(--good)">acc 0.758</text>

  <text x="26" y="82" class="s-mono" style="font-size:9px">overconfident</text>
  <rect x="150" y="70" width="301" height="18" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="459" y="84" class="s-mono" style="font-size:9px">mean conf 0.752</text>
  <text x="600" y="84" class="s-mono" style="font-size:9px;fill:var(--crit)">acc 0.544</text>

  <text x="16" y="112" class="s-mono" style="font-size:10px;fill:var(--crit)">a dashboard showing mean confidence calls these equivalent</text>

  <line x1="16" y1="130" x2="744" y2="130" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="152" class="s-label">BINNED \u2014 ECE SEES IT</text>
  <text x="26" y="176" class="s-mono" style="font-size:9px">calibrated</text>
  <rect x="150" y="164" width="20" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="178" y="178" class="s-mono" style="font-size:9px;fill:var(--good)">ECE 0.0136</text>
  <text x="26" y="206" class="s-mono" style="font-size:9px">overconfident</text>
  <rect x="150" y="194" width="300" height="18" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="458" y="208" class="s-mono" style="font-size:9px;fill:var(--crit)">ECE 0.2075</text>

  <text x="16" y="238" class="s-mono" style="fill:var(--warn)">all five bins below the diagonal and similar in size = systematic -> temperature scaling fixes it</text>
  <text x="16" y="254" class="s-sub">alternating signs = noise, more data \u00b7 negative high and positive low = non-monotone, hardest case</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Compute ECE and read the sign pattern", difficulty: "core", minutes: 30,
      body: "Compute ECE and a reliability table for your own system, state which calibration pattern you see and whether one parameter would fix it, then generate the four robustness slices and report the worst one.",
      requirements: [
        "At least five confidence bins with per-bin n, confidence, accuracy and signed gap",
        "State the pattern and the fix it implies",
        "Report how confidence was elicited and whether log-probabilities were available",
        "Build the four perturbed sets and verify labels still hold on a sample",
        "Report the worst slice and both refusal directions"
      ],
      hint: "Read the sign pattern before reaching for a fix. All-negative gaps are a one-parameter problem; alternating signs mean you need more data, not recalibration.",
      solution: { lang: "python", title: "ECE, the diagnosis, and four free eval sets", code: `import numpy as np

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
    g = [r["gap"] for r in rows]
    if all(x < -0.03 for x in g):
        return "systematic overconfidence -- temperature scaling, one parameter"
    if all(x > 0.03 for x in g):
        return "systematic underconfidence -- same one-parameter fix, other way"
    if g[0] > 0 and g[-1] < 0:
        return "underconfident when unsure, overconfident when sure -- non-monotone"
    return "no consistent pattern -- likely noise, collect more data"

PERTURB = {                       # none of these changes the correct answer
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
scores = {k: accuracy([f(c) for c in EVAL]) for k, f in PERTURB.items()}
worst = min(scores, key=scores.get)
for k, v in sorted(scores.items(), key=lambda kv: kv[1]):
    print("%-12s %.3f%s" % (k, v, "   <- WORST" if k == worst else ""))
print()
print("red-team pass %.3f   over-refusal %.3f" % (REDTEAM, OVER_REFUSAL))`,
        out: `  [shape -- the overconfident case's real figures, perturbations illustrative]

  ECE 0.2075 -- systematic overconfidence -- temperature scaling, one parameter
    0.5-0.6    n=778   conf 0.549  acc 0.305  gap -0.245
    0.6-0.7    n=770   conf 0.651  acc 0.457  gap -0.194
    0.7-0.8    n=814   conf 0.748  acc 0.523  gap -0.225
    0.8-0.9    n=863   conf 0.849  acc 0.674  gap -0.175
    0.9-1.0    n=775   conf 0.949  acc 0.748  gap -0.201

  needle_mid   0.612   <- WORST
  distractor   0.698
  typos        0.731
  paraphrase   0.744
  original     0.771

  red-team pass 0.962   over-refusal 0.187
`,
        notes: [
          { t: "p", text: "**`diagnose` is the part worth writing.** ECE of 0.2075 says there is a problem; five consistently negative gaps of similar size say it is systematic, which one temperature parameter on held-out data corrects. Alternating signs would mean noise, and fitting a temperature to noise makes things worse." },
          { t: "p", text: "**The two models behind these figures had mean confidences of 0.749 and 0.752** with accuracies of 0.758 and 0.544 \u2014 so any dashboard reporting average confidence would have called them equivalent. That is precisely why ECE bins rather than comparing averages." },
          { t: "p", text: "**The four perturbations cost no new labelling**, because rewording a question or padding its context does not change the correct answer. Verify that on a sample though \u2014 an aggressive paraphrase occasionally does change what is being asked." },
          { t: "p", text: "**Report the worst slice.** Position-shifting the needle costs most here, which points at a concrete fix \u2014 put the most relevant chunk last \u2014 that an average across five sets would have hidden entirely." },
          { t: "p", text: "**The last line is the pair that must be read together.** A red-team pass of 0.962 looks excellent until you see 18.7% of answerable questions being refused; a model refusing everything scores 1.000 on the first and ships to nobody." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "ECE bins because averages cancel: two models with mean confidence 0.749 and 0.752 had accuracies of 0.758 and 0.544. Read the sign pattern, not just the scalar \u2014 all-negative means one temperature parameter fixes it, alternating means collect more data." },
        { t: "p", text: "Measure refusal in both directions or the optimum refuses everything. And generate four robustness slices from your existing set for free, reporting the worst rather than the mean \u2014 because none of the perturbations changes the correct answer." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you tell whether a model\u2019s confidence means anything?\u201d**" },
        { t: "p", text: "Expected Calibration Error with a reliability table \u2014 bin answers by stated confidence and compare mean confidence to actual accuracy inside each bin, weighted by bin size." },
        { t: "p", text: "What I would not report is mean confidence, because it cannot see the failure. In a case I measured, a calibrated model and one overconfident by twenty points had mean confidences of 0.749 and 0.752 \u2014 indistinguishable \u2014 with accuracies of 0.758 and 0.544. ECE separated them at 0.0136 against 0.2075, because it compares within bins rather than comparing two averages." },
        { t: "p", text: "Then I would read the sign pattern rather than the scalar, because it names the fix. All five bins negative and similar in size is systematic overconfidence, which temperature scaling corrects with one parameter on held-out data. Alternating signs mean noise and more data \u2014 and fitting a temperature to noise will make it worse. Negative at high confidence with positive at low is non-monotone and needs a more flexible correction." },
        { t: "p", text: "The caveat I would state before quoting any ECE is the elicitation. A verbalised \u2018I am 80% sure\u2019 is a generated token sequence rather than a probability, so a poor figure can reflect bad elicitation rather than bad calibration \u2014 and those have different fixes. Where token log-probabilities are available I would use them." },
        { t: "p", text: "Alongside calibration I would measure refusal in both directions, because a red-team score alone has \u2018refuse everything\u2019 as its optimum. I have seen 0.962 red-team pass sitting beside 18.7% over-refusal, which is a product decision rather than a clean win." },
        { t: "p", text: "And robustness, which is unusually cheap: reword the prompts, inject typos, pad the context with distractors, and move the needed information to different positions. That is four extra eval sets from one with no new labelling, since none of those perturbations changes the correct answer \u2014 and I would report the worst slice rather than the average, because the worst one usually points at a concrete fix." }
      ] }
  ],

  takeaways: [
    "**ECE bins by stated confidence** and averages the per-bin gap between confidence and accuracy, weighted by bin size.",
    "**Mean confidence cannot detect miscalibration**: two models at 0.749 and 0.752 mean confidence had accuracies of 0.758 and 0.544.",
    "**Binning separated them at 0.0136 against 0.2075**, because it compares within bins rather than comparing two averages that cancel.",
    "**Read the sign pattern, not just the scalar** \u2014 it names which fix applies.",
    "**All gaps negative and similar means systematic overconfidence**, which one temperature parameter on held-out data corrects.",
    "**Alternating signs mean noise**, and fitting a temperature to noise makes things worse rather than better.",
    "**Negative at high confidence with positive at low is non-monotone** and needs a more flexible correction than one parameter.",
    "**Elicitation is itself unreliable** \u2014 a verbalised confidence is a token sequence, not a probability, so report how it was obtained.",
    "**Measure refusal in both directions**, or the trivially optimal model refuses everything and scores perfectly on the half you remembered.",
    "**0.962 red-team pass beside 18.7% over-refusal is a product decision**, not a clean win.",
    "**Four robustness slices come free from one eval set** \u2014 paraphrase, typos, distractors, position \u2014 because none changes the correct answer.",
    "**Report the worst slice rather than the mean**, since the worst one usually points at a concrete fix an average would hide."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two models have mean stated confidence of 0.749 and 0.752, with accuracies of 0.758 and 0.544. What does this show?",
        options: [
          "The second model needs more training data",
          "Mean confidence cannot detect miscalibration \u2014 the averages match while the confidence-accuracy relationship is badly wrong, which is why ECE bins",
          "Confidence elicitation failed for the second model",
          "The two models were evaluated on different sets"
        ],
        answer: 1,
        why: "A global average can coincide while the relationship between stated confidence and realised accuracy differs by twenty points everywhere, so any dashboard showing mean confidence would call these equivalent. Binning compares confidence to accuracy inside each bin, which makes structure that cancels in aggregate visible \u2014 ECE separated them at 0.0136 against 0.2075. It is the same reason win rates are binned by length rather than reported alongside mean length." },

      { stem: "A reliability table shows all five bins with negative gaps of similar magnitude. What applies?",
        options: [
          "More evaluation data, since the pattern may be noise",
          "Systematic overconfidence \u2014 a single temperature parameter fitted on held-out data should correct it",
          "A per-bin learned correction, since the miscalibration is non-monotone",
          "Nothing \u2014 negative gaps are expected for any confident model"
        ],
        answer: 1,
        why: "Consistency in direction and magnitude indicates the confidences need uniformly shifting, which is a one-parameter problem. Alternating signs would indicate noise, where applying a temperature fit actively makes things worse; negative at high confidence with positive at low would be the non-monotone case requiring something more flexible. This is why the scalar ECE should be read with the table rather than alone." },

      { stem: "Why must an over-refusal set accompany a red-team suite?",
        options: [
          "Because red-team suites cannot cover every category of harm",
          "Because measuring only harmful output has \u201crefuse everything\u201d as its optimum \u2014 a model that refuses all requests scores perfectly and is useless",
          "Because over-refusal correlates with jailbreak vulnerability",
          "Because refusal rates are needed to normalise the red-team score"
        ],
        answer: 1,
        why: "One-directional measurement has a degenerate solution, and a refusal is never wrong in the way an incorrect answer is \u2014 making refusal the risk-free strategy. That is the safety-flavoured version of hedging as a reward hack. A measured example had 0.962 red-team pass alongside 18.7% over-refusal, which is a genuine product trade rather than a clean result. Coverage gaps are a separate real concern." },

      { stem: "What makes the four robustness perturbations unusually cheap?",
        options: [
          "They can be generated by the model under test",
          "None of them changes the correct answer, so the existing labels transfer unchanged \u2014 four extra eval sets with no new annotation",
          "They only require a subset of the original eval set",
          "They can be scored deterministically without a judge"
        ],
        answer: 1,
        why: "Rewording a question, injecting typos, padding context with irrelevant material and moving the needed information all leave the right answer intact, so labelling effort is zero. The assumption is worth verifying on a sample, since an aggressive paraphrase can change what is being asked and a typo in a key entity can change the answer rather than obscure it. Scoring still uses whatever method the original set used." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Confidence, refusal and robustness",
    questions: [
      { level: "core",
        q: "How do you measure calibration?",
        strong: "A strong answer bins and reads the sign pattern.",
        answer: [
          { t: "p", text: "Expected Calibration Error with a reliability table. Bin answers by stated confidence, and for each bin compare mean confidence to actual accuracy; ECE is the sample-weighted mean of those absolute gaps." },
          { t: "p", text: "What I would avoid is reporting mean confidence, because it cannot see the problem. I measured a calibrated model and one overconfident by twenty points having mean confidences of 0.749 and 0.752 with accuracies of 0.758 and 0.544 \u2014 identical on the average and twenty points apart in what the confidence was worth." },
          { t: "p", text: "Then the sign pattern, because it tells you which fix applies. All bins negative and similar is systematic overconfidence and temperature scaling corrects it with one parameter. Alternating signs is noise, and fitting a temperature to noise is worse than doing nothing. Negative at high confidence and positive at low is non-monotone and needs something more flexible." },
          { t: "p", text: "The caveat I would give before quoting a figure is elicitation: a verbalised \u2018I am 80% sure\u2019 is a generated token sequence rather than a probability, so a poor ECE can reflect bad elicitation rather than bad calibration. Where log-probabilities are available I would use those instead." }
        ] },

      { level: "core",
        q: "How would you evaluate safety?",
        strong: "A strong answer insists on both directions.",
        answer: [
          { t: "p", text: "In both directions, always. A red-team or jailbreak suite measures whether the model does things it should not, and an over-refusal set measures whether it refuses things it should answer." },
          { t: "p", text: "The reason is that one-directional measurement has a useless optimum: a model that refuses every request scores perfectly on the red-team suite and ships to nobody. A refusal is never wrong in the way an incorrect answer is, so any evaluation that penalises errors and not non-answers makes refusing risk-free." },
          { t: "p", text: "I have seen the shape of the trade directly \u2014 0.962 red-team pass alongside 18.7% over-refusal, meaning nearly a fifth of answerable questions declined. That is a product decision to be taken deliberately, not a clean win to report." },
          { t: "p", text: "What you are looking for is a model that discriminates rather than one that is cautious, and only the two measurements together distinguish those. It is the same structure as hedging being the reward hack that evaluation misses." }
        ] },

      { level: "core",
        q: "How would you test robustness without new labelling?",
        strong: "A strong answer names the four perturbations and the worst-slice rule.",
        answer: [
          { t: "p", text: "Perturb the eval set you already have, four ways. Reword each prompt for paraphrase robustness. Inject typos at a realistic rate, because production traffic contains them and eval sets usually do not. Pad the context with irrelevant material. And move the needed information to different positions, for lost-in-the-middle." },
          { t: "p", text: "The reason it costs nothing is that none of those changes the correct answer, so the labels transfer unchanged \u2014 four extra eval sets from one. That is unusually good value for evaluation work." },
          { t: "p", text: "The assumption worth verifying on a sample is that the perturbation really is label-preserving. An aggressive paraphrase occasionally changes what is being asked, and a typo injected into a key entity can change the answer rather than obscure it." },
          { t: "p", text: "Then report the worst slice rather than the mean. In practice position-shifting tends to cost the most, which points at a concrete fix \u2014 put the most relevant chunk last in the prompt \u2014 and that finding would be invisible in an average across the five sets." }
        ] }
    ]
  }
});
