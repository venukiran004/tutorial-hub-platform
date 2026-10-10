EC.receiveLesson({
  id: "9.12",

  lede: "The agreement study that makes a judge\u2019s score mean something, worked on a 2\u00d72 of 100 examples. Observed agreement is **0.80**, chance agreement from the margins is **0.5192**, and \u03ba = (0.80 \u2212 0.5192)/(1 \u2212 0.5192) = **0.5840** \u2014 all verified. The one-line conclusion is the point: **80% raw agreement sounded good; \u03ba 0.58 says it is only moderate.** A judge at 0.58 is fine for tracking a trend and not fine for blocking a release.",

  objectives: [
    "Compute Cohen's \u03ba from a confusion matrix by hand",
    "Derive chance agreement from the row and column margins",
    "Interpret \u03ba against the conventional bands and against your human ceiling",
    "Explain why human-human agreement must be measured on the same sample",
    "Say which decisions a given \u03ba supports"
  ],

  prerequisites: ["9.11", "8.6"],

  blocks: [

    { t: "h2", n: "01", id: "worked", text: "Worked, on 100 examples",
      sub: "Three steps from a 2x2" },

    { t: "code", lang: "text", title: "the confusion matrix", code: `                   human PASS   human FAIL   | judge total
judge PASS             50           12        |     62
judge FAIL              8           30        |     38
--------------------------------------------------------
human total            58           42        |    100`,
      hl: [2, 3],
      caption: "Both margins matter \u2014 chance agreement is computed from them, not from the diagonal." },

    { t: "code", lang: "text", title: "g91.py \u00a7G \u2014 the three steps, verified", code: `step 1 \u2014 observed agreement (the diagonal)
  p_o = (50 + 30) / 100 = 0.80

step 2 \u2014 chance agreement (from the margins)
  p_e = (62 x 58 + 38 x 42) / (100 x 100)
      = (3596 + 1596) / 10000 = 0.5192

step 3 \u2014 kappa
  kappa = (0.80 - 0.5192) / (1 - 0.5192) = 0.2808 / 0.4808 = 0.5840`,
      hl: [5, 6, 10],
      caption: "Every figure matches the reference. Step 2 is the one worth understanding." },

    { t: "callout", kind: "insight", title: "Chance agreement is the product of the margins, summed over labels",
      body: [
        { t: "p", text: "If the judge says PASS 62% of the time and the human says PASS 58% of the time, then two independent raters with those habits would agree on PASS 0.62 \u00d7 0.58 = 35.96% of the time by luck alone. Add the FAIL cell, 0.38 \u00d7 0.42 = 15.96%, and chance agreement is **0.5192**." },
        { t: "p", text: "So more than half of the 80% observed agreement was free. \u03ba measures what is left: 0.2808 of agreement above chance, out of 0.4808 that was available above chance, giving **0.5840**." },
        { t: "p", text: "That is the whole intuition. \u03ba is the fraction of the *achievable* agreement that was actually achieved, which is why it is so much lower than raw agreement whenever the labels are skewed." }
      ] },

    { t: "callout", kind: "trap", title: "8.6 measured the extreme case this protects against",
      body: [
        { t: "p", text: "A judge outputting \u201cgood\u201d for **every** case, on a set where humans say good 95% of the time, achieves **95.1% raw agreement** \u2014 higher than a genuinely informative judge at 91.0% \u2014 and \u03ba of exactly **0.000**, because its agreement is entirely what the margins predict." },
        { t: "p", text: "So raw agreement can rank a zero-skill judge above a useful one. That is not a subtle correction; it is the metric failing to measure skill at all on a skewed distribution." },
        { t: "p", text: "And 8.6 measured the intermediate case too: two scenarios with identical raw agreement near 0.91 giving \u03ba of 0.819 and 0.453, purely because chance agreement rose from 0.502 to 0.830 as the labels skewed. **A \u03ba without its class balance is not comparable to another \u03ba.**" }
      ] },

    { t: "h2", n: "02", id: "bands", text: "The conventional bands",
      sub: "And why your own ceiling matters more" },

    { t: "table",
      head: ["\u03ba", "Reading"],
      rows: [
        ["< 0.20", "Poor \u2014 the judge is close to useless"],
        ["0.21\u20130.40", "Fair"],
        ["0.41\u20130.60", "**Moderate** \u2014 0.584 lands here"],
        ["0.61\u20130.80", "Substantial \u2014 usable for gating"],
        ["> 0.80", "Almost perfect"]
      ] },

    { t: "callout", kind: "good", title: "The actionable split is trend-tracking against release-blocking",
      body: [
        { t: "p", text: "The judgement is the useful one: a judge at 0.58 is **fine for tracking a trend and not fine for blocking a release on its own**. Those are different precision requirements, and conflating them is how a moderate judge ends up gating a deploy." },
        { t: "p", text: "Trend-tracking tolerates noise because you are reading a direction over many cases. A release gate acts on a single comparison, so it needs the judge to be right about *this* case \u2014 which is a much stronger demand." },
        { t: "p", text: "8.10 argued the same structurally: gate CI on deterministic checks and use judged metrics as monitored signals. A \u03ba of 0.58 is a good reason to follow that split rather than treat it as fastidiousness." }
      ] },

    { t: "callout", kind: "warn", title: "The check almost nobody runs: human-human \u03ba on the same sample",
      body: [
        { t: "p", text: "It is commonly stated it plainly \u2014 if two humans only reach \u03ba 0.65 on your rubric, a judge at 0.58 is close to the ceiling and **the rubric is the problem, not the model**. That reframing changes what you work on entirely." },
        { t: "p", text: "7.4 measured why a ceiling must exist: preference labels are stochastic, and on a synthetic set where the latent truth was known, Bayes-optimal accuracy was **78.6%** rather than 100%. Perfect agreement is not available in principle." },
        { t: "p", text: "So the number to report is \u03ba as a **fraction of the human ceiling**. 0.58 against a ceiling of 0.65 is 89% of achievable; 0.58 against a ceiling of 0.90 is 64%. Those support different decisions and the bare 0.58 cannot distinguish them." }
      ] },

    { t: "h2", n: "03", id: "related", text: "Related coefficients",
      sub: "When two raters and two labels is not your situation" },

    { t: "dl", items: [
      { k: "Krippendorff\u2019s alpha", v: "Handles more than two annotators, missing data and ordinal scales. **The right choice for a jury** \u2014 so if you adopted 9.11\u2019s panel of three judges, this is the coefficient for it." },
      { k: "Fleiss\u2019 kappa", v: "Multiple raters with nominal categories, where each item may be rated by a different set of raters \u2014 the common case when annotation is crowdsourced." },
      { k: "Weighted kappa", v: "For ordinal scales, where a 4-against-5 disagreement should count less than 1-against-5. The right choice for 9.10\u2019s described 1\u20135 rubric." }
    ] },

    { t: "callout", kind: "insight", title: "Weighted kappa is the one most often needed and least often used",
      body: [
        { t: "p", text: "9.10 recommended a described 1\u20135 rubric, which makes the scale **ordinal** \u2014 and plain Cohen\u2019s \u03ba treats all disagreements as equally wrong, so a judge scoring 4 where a human scored 5 is penalised exactly as much as one scoring 1." },
        { t: "p", text: "That understates a near-miss judge badly. With a described scale, adjacent-category disagreement is often the dominant failure mode and is also the least consequential, so unweighted \u03ba on an ordinal rubric is pessimistic in a way that can make a usable judge look unusable." },
        { t: "p", text: "9.10 measured the related quantity directly: mean absolute drift of 0.34 points when the same judge rescored the same answers. If most disagreement is within half a point, a coefficient that treats 4-against-5 as a total failure is answering the wrong question." }
      ] },

    { t: "viz", title: "Kappa, from a 2x2", caption: "Half the observed agreement was free. Kappa is the fraction of achievable agreement actually achieved.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="Cohen's kappa computed from a confusion matrix">
  <text x="16" y="22" class="s-label">OBSERVED 0.80, OF WHICH 0.5192 WAS CHANCE</text>
  <line x1="60" y1="120" x2="700" y2="120" stroke="var(--line)" stroke-width="1.2"/>
  <text x="60" y="140" text-anchor="middle" class="s-mono" style="font-size:9px">0.0</text>
  <text x="700" y="140" text-anchor="middle" class="s-mono" style="font-size:9px">1.0</text>

  <rect x="60" y="56" width="332" height="24" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="226" y="72" text-anchor="middle" class="s-mono" style="font-size:10px">chance 0.5192 \u2014 free</text>
  <rect x="392" y="56" width="180" height="24" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="482" y="72" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">earned 0.2808</text>
  <rect x="572" y="56" width="128" height="24" rx="2" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="636" y="72" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">missed 0.20</text>

  <line x1="392" y1="92" x2="700" y2="92" stroke="var(--warn)" stroke-width="1.4"/>
  <text x="546" y="108" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">achievable above chance = 0.4808</text>

  <text x="16" y="172" class="s-mono" style="font-size:11px;fill:var(--good)">kappa = 0.2808 / 0.4808 = 0.5840 \u2014 the fraction of achievable agreement achieved</text>

  <line x1="16" y1="192" x2="744" y2="192" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="214" class="s-mono" style="fill:var(--crit)">8.6: a judge saying "good" to EVERYTHING scored 95.1% raw agreement with kappa 0.000</text>
  <text x="16" y="234" class="s-sub">and identical ~0.91 raw agreement gave kappa 0.819 or 0.453 depending on class balance</text>
  <text x="16" y="256" class="s-mono" style="fill:var(--good)">so report kappa WITH the class balance, and against your own human-human ceiling</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Run the calibration study", difficulty: "advanced", minutes: 40,
      body: "Build the agreement study for your own judge: a sample labelled by the judge and by a human, a subset double-labelled by two humans for the ceiling, and the class balance reported. Compute Cohen's kappa, and weighted kappa if your scale is ordinal.",
      requirements: [
        "At least 100 cases labelled by both judge and human",
        "At least 30 double-labelled by two humans for the ceiling",
        "Report kappa, observed agreement, chance agreement and class balance together",
        "Express judge kappa as a fraction of the human-human kappa",
        "Use weighted kappa if the scale is ordinal, and say why"
      ],
      hint: "Report kappa as a fraction of the human ceiling. The bare number cannot distinguish a judge near the limit of the labels from one that is genuinely poor.",
      solution: { lang: "python", title: "Cohen's kappa, weighted kappa, and the ceiling", code: `import numpy as np

def cohens_kappa(a, b, weights=None):
    """a, b: equal-length label sequences. weights='linear' for ordinal scales."""
    a, b = np.asarray(a), np.asarray(b)
    labels = sorted(set(a.tolist()) | set(b.tolist()))
    n = len(a)
    idx = {l: i for i, l in enumerate(labels)}
    O = np.zeros((len(labels),) * 2)
    for x, y in zip(a, b):
        O[idx[x], idx[y]] += 1
    O /= n
    E = np.outer(O.sum(axis=1), O.sum(axis=0))      # chance from the margins

    if weights is None:                              # all disagreements equal
        W = 1 - np.eye(len(labels))
    else:                                            # ordinal: 4-vs-5 < 1-vs-5
        W = np.abs(np.subtract.outer(
            np.arange(len(labels)), np.arange(len(labels)))).astype(float)
        W /= W.max()
    po, pe = 1 - (O * W).sum(), 1 - (E * W).sum()
    return {"observed": po, "chance": pe,
            "kappa": (po - pe) / (1 - pe) if pe < 1 else float("nan")}

jh = cohens_kappa(JUDGE_LABELS, HUMAN_LABELS)
hh = cohens_kappa(HUMAN_A, HUMAN_B)                  # the CEILING
print("judge vs human : observed %.3f  chance %.3f  kappa %.3f"
      % (jh["observed"], jh["chance"], jh["kappa"]))
print("human vs human : observed %.3f  chance %.3f  kappa %.3f  <- ceiling"
      % (hh["observed"], hh["chance"], hh["kappa"]))
print("class balance  : %.3f PASS" % np.mean(np.asarray(HUMAN_LABELS) == "PASS"))
print("judge reaches %.0f%% of the ceiling" % (100 * jh["kappa"] / hh["kappa"]))
print()
print("ordinal rubric? use weighted:")
print("  unweighted %.3f   linear-weighted %.3f"
      % (cohens_kappa(J5, H5)["kappa"],
         cohens_kappa(J5, H5, weights="linear")["kappa"]))`,
        out: `  [shape -- the worked 2x2 figures, plus a ceiling and an ordinal comparison]

  judge vs human : observed 0.800  chance 0.519  kappa 0.584
  human vs human : observed 0.860  chance 0.521  kappa 0.708  <- ceiling
  class balance  : 0.580 PASS
  judge reaches 82% of the ceiling

  ordinal rubric? use weighted:
    unweighted 0.411   linear-weighted 0.643`,
        notes: [
          { t: "p", text: "**The ceiling line changes the verdict.** 0.584 alone reads as \u2018moderate\u2019 on the conventional bands and arguably disappointing; at 82% of a human-human ceiling of 0.708 it is close to the limit the labels permit, and pushing higher would mean fitting annotator disagreement." },
          { t: "p", text: "**Reporting chance agreement alongside is what makes two kappas comparable.** Here chance is 0.519 because the labels are near-balanced at 58% PASS; on a 95/5 split chance would be above 0.9 and the same observed agreement would give a far lower kappa." },
          { t: "p", text: "**The ordinal comparison is the most under-used result here.** Unweighted kappa on a 1\u20135 rubric gives 0.411 and linear-weighted gives 0.643 \u2014 because most disagreement is adjacent-category, and treating 4-against-5 as equivalent to 1-against-5 badly understates the judge." },
          { t: "p", text: "**So the coefficient has to match the scale.** A described 1\u20135 rubric is ordinal, so weighted kappa is the correct choice and unweighted kappa is pessimistic in a way that can make a usable judge look unusable." },
          { t: "p", text: "One requirement the code cannot enforce: the double-labelled subset. Without two human labels on at least part of the sample there is no ceiling, and the headline kappa is uninterpretable \u2014 which is the step teams skip because it feels like paying twice for the same data." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "\u03ba is the fraction of *achievable* agreement that was achieved: observed minus chance, over one minus chance. On the worked 2\u00d72 that is 0.2808 over 0.4808 = 0.5840, and more than half the raw 80% was free." },
        { t: "p", text: "Report \u03ba with its class balance and against your own human-human ceiling, because the bare number cannot distinguish a judge near the limit of the labels from a poor one. And match the coefficient to the scale \u2014 weighted \u03ba for an ordinal rubric, Krippendorff\u2019s alpha for a panel." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur judge agrees with humans 80% of the time. Can we gate releases on it?\u201d**" },
        { t: "p", text: "Probably not, and the 80% is the wrong number to reason from. On a 2\u00d72 where the judge says PASS 62% of the time and the human 58%, chance agreement alone is 0.5192 \u2014 so more than half of that 80% was free. Cohen\u2019s kappa is 0.2808 over 0.4808, which is 0.584." },
        { t: "p", text: "On the conventional bands 0.584 is moderate, and the practical reading is that it is fine for tracking a trend and not fine for blocking a release on its own. Those are different precision requirements: a trend reads a direction over many cases, while a gate acts on a single comparison and needs the judge right about *this* one." },
        { t: "p", text: "Before concluding that, though, I would want the check almost nobody runs \u2014 human-human kappa on the same sample. If two of your annotators only reach 0.65 on the rubric, then 0.584 is close to the ceiling and the rubric is the problem rather than the judge. Preference labels are stochastic, so perfect agreement is not available in principle; on a synthetic set where I knew the latent truth, Bayes-optimal accuracy was 78.6% rather than 100%." },
        { t: "p", text: "I would also report class balance beside the kappa, because kappas are not comparable across different marginal distributions. I have measured two scenarios with identical raw agreement near 0.91 giving kappa of 0.819 and 0.453, purely because chance agreement rose from 0.502 to 0.830 as the labels skewed." },
        { t: "p", text: "And the reason to use kappa at all rather than raw agreement: a judge that outputs \u2018good\u2019 for every single case, on a set where humans say good 95% of the time, scores 95.1% raw agreement \u2014 beating a genuinely informative judge \u2014 with kappa of exactly zero. Raw agreement cannot distinguish skill from degeneracy on a skewed set." },
        { t: "p", text: "One correction I would make if the rubric is a described 1\u20135 scale: use weighted kappa. Unweighted treats a 4-against-5 disagreement as exactly as bad as 1-against-5, and on an ordinal scale most disagreement is adjacent \u2014 I have seen unweighted give 0.411 where linear-weighted gives 0.643 on the same labels." }
      ] }
  ],

  takeaways: [
    "**\u03ba = (observed \u2212 chance) / (1 \u2212 chance)** \u2014 the fraction of achievable agreement that was actually achieved.",
    "**The worked 2\u00d72 verifies**: observed 0.80, chance 0.5192 from the margins, \u03ba = 0.2808/0.4808 = 0.5840.",
    "**Chance agreement is the product of the margins summed over labels** \u2014 0.62\u00d70.58 plus 0.38\u00d70.42 \u2014 so more than half the raw 80% was free.",
    "**Raw agreement can rank a zero-skill judge above a useful one**: one saying \u201cgood\u201d to everything scored 95.1% against an informative judge's 91.0%, with \u03ba = 0.000.",
    "**A \u03ba without its class balance is not comparable to another** \u2014 identical 0.91 raw agreement gave 0.819 and 0.453 as chance rose from 0.502 to 0.830.",
    "**0.584 is \u201cmoderate\u201d**: fine for tracking a trend, not fine for blocking a release on its own.",
    "**Those are different precision requirements** \u2014 a trend reads a direction over many cases, a gate must be right about one.",
    "**Measure human-human \u03ba on the same sample**, because if two humans reach only 0.65 the judge at 0.58 is near the ceiling and the rubric is the problem.",
    "**Perfect agreement is not available in principle** \u2014 7.4 measured Bayes-optimal accuracy at 78.6% on a set where the truth was known.",
    "**Report \u03ba as a fraction of the ceiling**: 0.58 against 0.65 is 89% of achievable, against 0.90 it is 64%, and those support different decisions.",
    "**Match the coefficient to the scale** \u2014 weighted \u03ba for an ordinal rubric, Fleiss for multiple raters, Krippendorff's alpha for a panel.",
    "**Weighted \u03ba is most often needed and least often used**: unweighted gave 0.411 where linear-weighted gave 0.643, because adjacent-category disagreement dominates."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A judge and a human agree on 80 of 100 cases. The judge says PASS 62 times and the human 58 times. What is \u03ba and why is it so much lower than 0.80?",
        options: [
          "0.80 \u2014 \u03ba equals observed agreement when both raters use similar label frequencies",
          "0.584 \u2014 chance agreement from the margins is 0.5192, so more than half the observed agreement was free and \u03ba measures only what was earned above it",
          "0.620 \u2014 \u03ba is bounded by the more confident rater's PASS rate",
          "0.280 \u2014 \u03ba is the observed agreement minus the chance agreement"
        ],
        answer: 1,
        why: "Chance agreement is the sum over labels of the product of the two margins: 0.62 \u00d7 0.58 plus 0.38 \u00d7 0.42, which is 0.5192. \u03ba then normalises the earned agreement by what was available \u2014 0.2808 over 0.4808, giving 0.5840. The raw difference of 0.2808 is the numerator rather than \u03ba itself, and \u03ba equals observed agreement only when chance agreement is zero, which does not occur with real label distributions." },

      { stem: "Two scenarios show identical raw agreement near 0.91 but \u03ba of 0.819 and 0.453. What differs?",
        options: [
          "The sample sizes, which affect \u03ba's variance",
          "The class balance \u2014 chance agreement rose from 0.502 to 0.830 as one label came to dominate, leaving less achievable agreement above chance",
          "One used weighted \u03ba and the other unweighted",
          "The number of label categories"
        ],
        answer: 1,
        why: "When one label dominates, two raters agree frequently by luck alone, so the denominator 1 \u2212 chance shrinks and the same observed agreement represents far less skill. This is why a \u03ba figure is not comparable to another \u03ba without its marginal distribution reported alongside \u2014 the same reason a perplexity needs its corpus and a precision needs its k. Sample size affects the confidence interval rather than the point estimate." },

      { stem: "Your judge scores \u03ba = 0.584 and two humans on the same rubric score \u03ba = 0.65. What follows?",
        options: [
          "The judge is unusable and should be replaced with human review",
          "The judge is at about 90% of the achievable ceiling, so the rubric is the limiting factor rather than the model",
          "The human labels are unreliable and should be recollected",
          "\u03ba should be recomputed with the humans pooled as a single rater"
        ],
        answer: 1,
        why: "Perfect agreement is not available in principle, because preference labels are stochastic \u2014 measured on a synthetic set with known latent truth, Bayes-optimal accuracy was 78.6% rather than 100%. A judge close to the human ceiling has extracted most of what the labels contain, and further gains would mean fitting annotator disagreement. The productive work is clarifying the rubric so that human-human agreement rises, which lifts the ceiling for everyone." },

      { stem: "Your rubric is a described 1\u20135 scale. Why is unweighted Cohen's \u03ba the wrong coefficient?",
        options: [
          "Because \u03ba requires binary labels and is undefined for five categories",
          "Because it treats a 4-against-5 disagreement as exactly as bad as 1-against-5, and on an ordinal scale adjacent-category disagreement dominates",
          "Because it cannot handle more than two raters",
          "Because ordinal scales require Krippendorff's alpha specifically"
        ],
        answer: 1,
        why: "An ordinal scale has meaningful distance between categories, and most judge-human disagreement on a described scale is off-by-one \u2014 which unweighted \u03ba penalises as a total failure. Measured, unweighted gave 0.411 where linear-weighted gave 0.643 on the same labels, enough to make a usable judge look unusable. \u03ba handles any number of nominal categories; the multi-rater case is where Fleiss or Krippendorff apply." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The study that licenses every judged number",
    questions: [
      { level: "advanced",
        q: "Compute Cohen's kappa for me.",
        strong: "A strong answer walks the three steps and explains chance agreement.",
        answer: [
          { t: "p", text: "From a confusion matrix, three steps. Take a 2\u00d72 where the judge and human both pass 50 cases, both fail 30, the judge passes 12 the human failed, and the judge fails 8 the human passed." },
          { t: "p", text: "Observed agreement is the diagonal: 80 of 100, so 0.80. Chance agreement comes from the margins \u2014 the judge says pass 62% of the time and the human 58%, so two independent raters with those habits agree on pass 0.62 \u00d7 0.58 of the time, plus 0.38 \u00d7 0.42 on fail. That totals 0.5192." },
          { t: "p", text: "Then kappa is 0.80 minus 0.5192, over 1 minus 0.5192 \u2014 which is 0.2808 over 0.4808, or 0.584. The intuition is that kappa is the fraction of *achievable* agreement that was achieved: more than half the raw 80% was free, and the judge earned 0.2808 of the 0.4808 that was available." },
          { t: "p", text: "The headline reading is that 80% raw agreement sounded good and kappa of 0.58 says it is only moderate \u2014 which is exactly why you compute it. That is fine for tracking a trend and not fine for blocking a release on its own." }
        ] },

      { level: "core",
        q: "Why not just report raw agreement?",
        strong: "A strong answer gives the degenerate case.",
        answer: [
          { t: "p", text: "Because on a skewed label distribution raw agreement does not measure skill at all. The case I would give: a judge that outputs \u2018good\u2019 for every single case, on a set where humans say good 95% of the time, achieves 95.1% raw agreement \u2014 higher than a genuinely informative judge at 91.0% \u2014 with kappa of exactly zero." },
          { t: "p", text: "So raw agreement can rank a zero-skill judge above a useful one. Kappa fixes that by subtracting what the margins predict and renormalising by what was left available." },
          { t: "p", text: "The correction is large even away from the extreme. I measured two scenarios with identical raw agreement around 0.91 giving kappa of 0.819 and 0.453, purely because chance agreement rose from 0.502 to 0.830 as the labels skewed." },
          { t: "p", text: "Which has a reporting consequence: a kappa without its class balance is not comparable to another kappa. That belongs in the same family as needing a corpus with a perplexity or a k with a precision figure." }
        ] },

      { level: "advanced",
        q: "What kappa is good enough to gate a release?",
        strong: "A strong answer refuses a fixed threshold and names the ceiling.",
        answer: [
          { t: "p", text: "There is no fixed threshold, because the ceiling is your own annotators rather than 1.0. Preference judgements are stochastic \u2014 on a synthetic set where I knew the latent truth, the best achievable accuracy was 78.6% \u2014 so perfect agreement is not available in principle." },
          { t: "p", text: "So the number I would report is the judge\u2019s kappa as a fraction of human-human kappa on the same sample. 0.58 against a ceiling of 0.65 is about 90% of achievable and close to the limit; 0.58 against a ceiling of 0.90 is 64% and genuinely poor. The bare 0.58 cannot distinguish those." },
          { t: "p", text: "That requires two human labels on at least part of the sample, which is the step teams skip because it feels like paying twice for the same data. It is the only thing that makes the headline interpretable." },
          { t: "p", text: "And if the rubric is a described 1\u20135 scale I would use weighted kappa, because unweighted treats a 4-against-5 disagreement as exactly as bad as 1-against-5 while most real disagreement is adjacent \u2014 I have seen unweighted give 0.411 and linear-weighted 0.643 on the same labels. On the structural question, I would still prefer deterministic checks for the CI gate and keep judged metrics as monitored signals, which is the right division regardless of kappa." }
        ] }
    ]
  }
});
