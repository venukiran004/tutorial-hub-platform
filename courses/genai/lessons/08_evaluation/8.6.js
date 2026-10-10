EC.receiveLesson({
  id: "8.6",

  lede: "The instruction is the right one \u2014 measure judge-versus-human agreement with Cohen\u2019s \u03ba before trusting a judge, because a judge is itself a model you must evaluate. The reason \u03ba rather than raw agreement is worth measuring: a judge that outputs \u201cgood\u201d for **everything** scored **95.1% raw agreement** against humans on a skewed set, and **\u03ba = 0.000**. Raw agreement is not evidence of skill, and on an imbalanced label distribution it is barely evidence of anything.",

  objectives: [
    "Choose between pointwise and pairwise judging, and say why pairwise is more reliable",
    "Write a judge prompt that constrains its output",
    "Name the four known biases and the mitigation for each",
    "Compute Cohen's \u03ba and explain why raw agreement is insufficient",
    "Calibrate a judge against humans before relying on it"
  ],

  prerequisites: ["8.1", "7.15"],

  blocks: [

    { t: "h2", n: "01", id: "modes", text: "Two modes",
      sub: "And pairwise is the more reliable one" },

    { t: "dl", items: [
      { k: "Pointwise / rubric", v: "Score one answer 1\u20135 on a criterion \u2014 helpfulness, correctness. Gives an absolute number, which is convenient and is the harder task." },
      { k: "Pairwise", v: "\u201cIs A or B better?\u201d More reliable than absolute scores, and what powers MT-Bench and Arena-Hard." }
    ] },

    { t: "callout", kind: "insight", title: "Pairwise is more reliable for the same reason preference data exists",
      body: [
        { t: "p", text: "7.1 established the asymmetry: ranking two answers is both cheaper and **better defined** than scoring one. Ask two experts to rate an answer out of five and they use different scales; ask which of two is better and they often agree." },
        { t: "p", text: "A judge model has the same problem. \u201cIs this a 3 or a 4?\u201d has no stable answer across prompts, so pointwise scores drift \u2014 and 7.4 measured the deeper version, where a Bradley-Terry fit recovers differences to a correlation of 0.9989 while the absolute level is unidentifiable." },
        { t: "p", text: "So prefer pairwise where you can. The cost is that pairwise gives you a relative ordering rather than a level, which means you need a fixed baseline to compare against \u2014 which is exactly why 7.15\u2019s headline metric is a win rate against the *pre-alignment* model." }
      ] },

    { t: "code", lang: "text", title: "the judge prompt", code: `JUDGE PROMPT (pairwise, reference-free)
You are an impartial judge. Compare two answers to the user question on
correctness, completeness, and clarity. Think step by step, then output JSON.
Question: {q}
Answer A: {a}
Answer B: {b}
Output: {"winner": "A"|"B"|"tie", "reason": "..."}`,
      hl: [3, 7],
      caption: "Two details earn their place: \u201cthink step by step, then output JSON\u201d, and an explicit tie option." },

    { t: "callout", kind: "good", title: "Why those two details matter",
      body: [
        { t: "p", text: "**Reasoning before the verdict** matters because the alternative is a verdict the model then rationalises. Asking for JSON *after* the reasoning gets you both a parseable output and a trace you can audit when the judge disagrees with a human." },
        { t: "p", text: "**An explicit tie option** matters because without one the judge is forced to break genuine ties arbitrarily, which adds noise you then mistake for signal. 7.15 measured the related effect \u2014 evaluating each pair in both orders and counting only consistent judgements, where 14% of pairs flipped and were excluded." },
        { t: "p", text: "And the output schema is a deterministic check you get for free: an unparseable response is a detectable failure rather than a silently miscounted vote. 8.4 noted answer-parsing as the quietest source of benchmark variance, and a constrained schema removes it here." }
      ] },

    { t: "h2", n: "02", id: "biases", text: "The four biases",
      sub: "Each with a mitigation that costs something" },

    { t: "table",
      head: ["Bias", "What happens", "Mitigation"],
      rows: [
        ["**Position bias**", "The judge favours the first (or second) answer", "Run both orders; average, or require agreement"],
        ["**Verbosity bias**", "Longer answers score higher", "Normalise for length; instruct the judge to ignore it"],
        ["**Self-preference**", "A model prefers its own style", "Use a different judge family; pairwise plus humans"],
        ["**Formatting bias**", "Markdown and structure inflate scores", "Strip formatting, or score content only"]
      ] },

    { t: "callout", kind: "insight", title: "Position bias is the one with a free diagnostic",
      body: [
        { t: "p", text: "Running both orders is the standard mitigation and it buys more than the average: the fraction of pairs where the judge **contradicts itself** when the order flips *is* the position bias, measured on your own judge rather than assumed. 7.15\u2019s worked gate reported 13.8%." },
        { t: "p", text: "That number also tells you whether the win rate is interpretable at all. Randomising order removes the systematic component and leaves the noise, so a high flip rate means the judge is simply too inconsistent for the comparison \u2014 no amount of randomisation repairs it." },
        { t: "p", text: "The cost is doubling your judge calls, which is usually the cheapest thing in the budget. Compared with 7.12\u2019s $1\u20135 per human label, two model calls per pair is close to free." }
      ] },

    { t: "callout", kind: "warn", title: "Verbosity bias compounds with everything else in the course",
      body: [
        { t: "p", text: "7.11 measured why length is the canonical reward hack: the implicit reward is linear in response length, so a per-token weight of 0.01 equals the entire quality signal at a hundred tokens. A verbose-biased judge writes that weight into whatever you train on its labels." },
        { t: "p", text: "And 8.3 measured the automatic-metric version, where a recall-based overlap metric gives a longer answer containing the usual phrasing a perfect score. Every layer of this stack has a length problem, which is why 7.15\u2019s eval gate bins win rates by length rather than only reporting mean length." },
        { t: "p", text: "Instructing the judge to ignore length helps and does not solve it. The reliable check is to bin: if within-length-bin win rates are flat while the aggregate is positive, the judge bought length." }
      ] },

    { t: "callout", kind: "note", title: "Self-preference is why the judge family matters",
      body: [
        { t: "p", text: "A model prefers its own style, so using the same family as judge and as the system under test inflates agreement in a way that looks like quality. 7.12 made the same point about AI feedback: the judge\u2019s stylistic preferences correlate with the policy\u2019s natural output, and what you measure is self-preference." },
        { t: "p", text: "The mitigation is a different judge family, which is cheap advice and occasionally awkward in practice when one family is clearly the strongest available grader. Where you cannot avoid it, pairwise plus a human-labelled sample is the fallback." },
        { t: "p", text: "The other note is worth keeping: use a top model as judge, because cheaper models are noisier graders. A noisy judge needs more samples for the same confidence, which 8.5\u2019s \u221an arithmetic prices \u2014 so saving on the judge often costs more in sample size than it saves per call." }
      ] },

    { t: "h2", n: "03", id: "kappa", text: "Calibrating the judge",
      sub: "Where raw agreement fails badly" },

    { t: "p", text: "It is commonly said to measure judge-versus-human agreement with Cohen\u2019s \u03ba on a sample before trusting the judge. \u03ba corrects raw agreement for the agreement you would expect by chance, and the correction is not cosmetic." },

    { t: "math", tex: "\\kappa = \\frac{p_o - p_e}{1 - p_e}" },

    { t: "code", lang: "python", title: "g85.py \u00a7C \u2014 four scenarios, same metric", code: `def kappa(a, b):
    po = (a == b).mean()
    pe = sum((a == l).mean() * (b == l).mean() for l in set(a) | set(b))
    return po, pe, (po - pe) / (1 - pe)`,
      out: `  scenario                            raw agree  P(chance)      kappa
  balanced 50/50, 90% agreement          0.910      0.502      0.819
  skewed 95/5, 90% agreement             0.907      0.830      0.453
  skewed 95/5, judge always 'good'       0.951      0.951      0.000
  skewed 99/1, 95% agreement             0.950      0.927      0.310`,
      hl: [4, 5, 6],
      caption: "Rows 1 and 2 have the same raw agreement and \u03ba of 0.819 against 0.453. Row 3 is the one to fear." },

    { t: "callout", kind: "trap", title: "A judge with zero skill beat a good one on raw agreement",
      body: [
        { t: "p", text: "Row 3 is a judge that outputs \u201cgood\u201d for every single case. On a set where humans say \u201cgood\u201d 95% of the time it achieves **95.1% raw agreement** \u2014 higher than the genuinely informative judge in row 1 at 91.0% \u2014 and \u03ba is exactly **0.000**, because its agreement is entirely what chance predicts." },
        { t: "p", text: "That is the scenario to design against, and it is not hypothetical. A judge asked \u201cis this answer faithful?\u201d on a corpus where most answers are faithful will reach high raw agreement by leaning toward \u201cyes\u201d, and raw agreement will applaud it." },
        { t: "p", text: "Rows 1 and 2 make the mechanism clear: identical raw agreement around 0.91, \u03ba of 0.819 versus 0.453, purely because chance agreement rises from 0.502 to 0.830 when one label dominates. \u03ba is measuring skill *above chance*, and on a skewed set almost all agreement is chance." }
      ] },

    { t: "callout", kind: "insight", title: "Which makes the label distribution a thing you have to report",
      body: [
        { t: "p", text: "\u03ba of 0.453 on a 95/5 split and 0.819 on a 50/50 split are not comparable, so a \u03ba figure without its marginal distribution is as incomplete as a perplexity figure without its corpus. Report the class balance alongside." },
        { t: "p", text: "It also suggests constructing the calibration sample deliberately rather than by random sampling. A stratified sample with more of the minority class gives a more informative \u03ba, because it reduces chance agreement and leaves more room for skill to show." },
        { t: "p", text: "6.7 ran into the same structure from the other side: a relevance gate tested only on answerable queries would have looked perfect, and the informative test needed deliberately unanswerable ones. Balance the calibration set toward the cases that discriminate." }
      ] },

    { t: "callout", kind: "good", title: "And read \u03ba against the human ceiling, not against 1.0",
      body: [
        { t: "p", text: "7.4 measured that preference labels are stochastic, with a Bayes-optimal accuracy of 78.6% rather than 100% on a synthetic set where the truth was known. So human-human \u03ba is itself well below 1, and a judge matching it is as good as the labels allow." },
        { t: "p", text: "That means the calibration sample needs **two** human labels on at least a subset, so you can compute human-human \u03ba as the ceiling. Without it, a judge \u03ba of 0.6 is uninterpretable \u2014 excellent against a 0.65 ceiling, poor against a 0.9 one." },
        { t: "p", text: "The conventional reading of \u03ba \u2014 0.6 to 0.8 as substantial, above 0.8 as almost perfect \u2014 is a rule of thumb from contexts with crisper labels. On subjective judgements it is better to compare against your own humans than against a published band." }
      ] },

    { t: "viz", title: "Raw agreement is not evidence", caption: "A judge that says \"good\" to everything gets 95.1% agreement and kappa of exactly zero.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Raw agreement versus Cohen's kappa in four scenarios">
  <text x="16" y="22" class="s-label">RAW AGREEMENT (left bar) AGAINST KAPPA (right bar)</text>

  <text x="16" y="60" class="s-sub" style="font-size:9px">balanced 50/50</text>
  <rect x="150" y="48" width="273" height="14" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="430" y="59" class="s-mono" style="font-size:9px">0.910</text>
  <rect x="150" y="66" width="246" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="403" y="77" class="s-mono" style="font-size:9px;fill:var(--good)">kappa 0.819</text>

  <text x="16" y="110" class="s-sub" style="font-size:9px">skewed 95/5</text>
  <rect x="150" y="98" width="272" height="14" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="429" y="109" class="s-mono" style="font-size:9px">0.907</text>
  <rect x="150" y="116" width="136" height="14" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="293" y="127" class="s-mono" style="font-size:9px;fill:var(--warn)">kappa 0.453</text>

  <text x="16" y="160" class="s-sub" style="font-size:9px">always "good"</text>
  <rect x="150" y="148" width="285" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="442" y="159" class="s-mono" style="font-size:9px;fill:var(--crit)">0.951 \u2014 the HIGHEST</text>
  <rect x="150" y="166" width="2" height="14" rx="1" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="160" y="177" class="s-mono" style="font-size:9px;fill:var(--crit)">kappa 0.000 \u2014 zero skill</text>

  <text x="16" y="210" class="s-sub" style="font-size:9px">skewed 99/1</text>
  <rect x="150" y="198" width="285" height="14" rx="2" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="442" y="209" class="s-mono" style="font-size:9px">0.950</text>
  <rect x="150" y="216" width="93" height="14" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="250" y="227" class="s-mono" style="font-size:9px;fill:var(--warn)">kappa 0.310</text>

  <line x1="16" y1="246" x2="744" y2="246" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="268" class="s-mono" style="fill:var(--crit)">the zero-skill judge beats the informative one on raw agreement</text>
  <text x="16" y="286" class="s-sub">because chance agreement is 0.951 when one label dominates \u2014 so report the class balance with any kappa</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Calibrate your judge before relying on it", difficulty: "advanced", minutes: 40,
      body: "Take a sample of your judge's decisions, have humans label the same cases, and compute agreement properly: raw agreement, Cohen's kappa, the class balance, and human-human kappa on a doubly-labelled subset as the ceiling. Then measure the judge's position bias by running every pair in both orders.",
      requirements: [
        "At least 100 cases labelled by both the judge and a human",
        "A subset of at least 30 labelled by two humans, for the ceiling",
        "Report raw agreement, kappa, and the class balance together",
        "Report the both-orders flip rate as the measured position bias",
        "State whether the judge is usable, against the human ceiling rather than against 1.0"
      ],
      hint: "Stratify the calibration sample toward the minority class. A random sample from a skewed distribution gives a kappa dominated by chance agreement and tells you little.",
      solution: { lang: "python", title: "the calibration", code: `import numpy as np

def kappa(a, b):
    a, b = np.asarray(a), np.asarray(b)
    po = (a == b).mean()
    labels = set(a.tolist()) | set(b.tolist())
    pe = sum((a == l).mean() * (b == l).mean() for l in labels)
    return {"raw_agreement": po, "p_chance": pe,
            "kappa": (po - pe) / (1 - pe) if pe < 1 else float("nan")}

def position_bias(judge, pairs):
    """Both orders. The flip rate IS the bias, measured not assumed."""
    flips = decisive = 0
    for q, a, b in pairs:
        first, second = judge(q, a, b), judge(q, b, a)
        consistent = (first == "A" and second == "B") or (first == "B" and second == "A")
        decisive += consistent
        flips += not consistent
    return {"flip_rate": flips / len(pairs), "decisive": decisive}

m  = kappa(JUDGE_LABELS, HUMAN_LABELS)
hh = kappa(HUMAN_A, HUMAN_B)                 # the CEILING
pb = position_bias(JUDGE, PAIRS)

print("judge vs human : raw %.3f  chance %.3f  kappa %.3f"
      % (m["raw_agreement"], m["p_chance"], m["kappa"]))
print("human vs human : raw %.3f  chance %.3f  kappa %.3f  <- ceiling"
      % (hh["raw_agreement"], hh["p_chance"], hh["kappa"]))
print("class balance  : %.3f positive" % np.mean(HUMAN_LABELS))
print("position bias  : %.3f flip rate on %d pairs"
      % (pb["flip_rate"], len(PAIRS)))
print("judge reaches %.0f%% of the human ceiling" % (100 * m["kappa"] / hh["kappa"]))`,
        out: `  [shape -- run on your own sample]

  judge vs human : raw 0.874  chance 0.661  kappa 0.628
  human vs human : raw 0.901  chance 0.658  kappa 0.710  <- ceiling
  class balance  : 0.782 positive
  position bias  : 0.138 flip rate on 400 pairs
  judge reaches 88% of the human ceiling`,
        notes: [
          { t: "p", text: "**The last line is the only interpretable summary.** A judge kappa of 0.628 means nothing alone; at 88% of a human ceiling of 0.710 it is close to as good as the labels allow, and chasing higher would mean fitting disagreement between your own annotators." },
          { t: "p", text: "**Report the class balance in the same breath as kappa.** At 78.2% positive, chance agreement is already 0.661 \u2014 so raw agreement of 0.874 sounds strong and most of it is chance. On a 95/5 split a zero-skill judge that always says \u2018good\u2019 scores 0.951 raw with kappa exactly 0.000." },
          { t: "p", text: "**The flip rate is a measurement, not an assumption.** 13.8% of pairs reversed when the order reversed, so those are excluded from the win rate and the remaining judgements are the decisive ones. A flip rate much above about 0.2 would mean the judge is too inconsistent for the comparison at all." },
          { t: "p", text: "**You need two human labels on a subset or none of this is interpretable.** That is the part teams skip, because it feels like paying twice for the same data \u2014 and it is the only way to know whether 0.628 is good." },
          { t: "p", text: "One design note: stratify toward the minority class rather than sampling randomly. A random draw from a skewed distribution produces a kappa dominated by chance agreement, which is the same reasoning as testing a relevance gate on deliberately unanswerable queries rather than only on answerable ones." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A judge is a model you must evaluate, and raw agreement is not an evaluation \u2014 a judge saying \u201cgood\u201d to everything scored 95.1% agreement with \u03ba of exactly zero. Use \u03ba, report the class balance beside it, and read it against human-human \u03ba rather than against 1.0." },
        { t: "p", text: "Prefer pairwise over pointwise for the same reason preference data exists: ranking is better defined than scoring. Run both orders, because the flip rate is your position bias measured rather than assumed \u2014 and bin by length, because every layer of this stack has a verbosity problem." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur LLM judge agrees with human labels 92% of the time. Can we rely on it?\u201d**" },
        { t: "p", text: "Not from that number alone, and I would want two more before answering: the class balance and the human-human agreement." },
        { t: "p", text: "The class balance matters because raw agreement is inflated by chance whenever one label dominates. I tested the extreme: a judge that outputs \u2018good\u2019 for every single case, on a set where humans say \u2018good\u2019 95% of the time, gets 95.1% raw agreement \u2014 higher than a genuinely informative judge \u2014 with Cohen\u2019s kappa of exactly 0.000. All of its agreement is what chance predicts." },
        { t: "p", text: "Kappa corrects for that, and the correction is large. Two scenarios with identical raw agreement around 0.91 gave kappa of 0.819 on a balanced set and 0.453 on a 95/5 split, purely because chance agreement rose from 0.50 to 0.83. So I would report kappa with the class balance in the same breath \u2014 a kappa without its marginal distribution is as incomplete as a perplexity without its corpus." },
        { t: "p", text: "Human-human agreement matters because it is the ceiling. Preference labels are stochastic \u2014 in a synthetic case where I knew the ground truth, the Bayes-optimal accuracy was 78.6% rather than 100% \u2014 so a judge matching your annotators is as good as the labels allow. That needs two human labels on a subset, which is the step teams skip because it feels like paying twice." },
        { t: "p", text: "I would also measure position bias directly by running every pair in both orders. The fraction where the judge contradicts itself *is* the bias, and it tells you whether the comparison is interpretable at all \u2014 randomising removes the systematic part and leaves the noise, so a high flip rate means the judge is too inconsistent regardless." },
        { t: "p", text: "And I would stratify the calibration sample toward the minority class rather than sampling randomly, because a random draw from a skewed distribution gives a kappa dominated by chance and tells you very little about skill." }
      ] }
  ],

  takeaways: [
    "**Prefer pairwise over pointwise**: ranking two answers is better defined than scoring one, which is the same asymmetry that makes preference data exist.",
    "**Pairwise gives an ordering, not a level**, so it needs a fixed baseline \u2014 which is why a win rate is measured against the pre-change model.",
    "**Ask for reasoning before the verdict**, so you get a trace to audit rather than a verdict the model then rationalises.",
    "**Include an explicit tie option**, or the judge breaks genuine ties arbitrarily and you mistake that noise for signal.",
    "**Four biases**: position, verbosity, self-preference and formatting \u2014 each with a mitigation that costs something.",
    "**Position bias has a free diagnostic**: the both-orders flip rate *is* the bias, measured on your judge rather than assumed.",
    "**Verbosity bias compounds with everything else**, since the implicit reward is linear in length and overlap metrics reward it too \u2014 so bin win rates by length.",
    "**Self-preference means the judge family should differ from the system under test**, or you measure style agreement rather than quality.",
    "**Raw agreement is not evidence**: a judge outputting \u201cgood\u201d for everything scored 95.1% agreement with \u03ba = 0.000.",
    "**\u03ba of 0.819 and 0.453 arose from identical raw agreement**, because chance agreement rose from 0.502 to 0.830 on a skewed set.",
    "**Report the class balance beside any \u03ba**, and stratify the calibration sample toward the minority class so skill has room to show.",
    "**Read \u03ba against human-human \u03ba, not against 1.0**, which requires two human labels on a subset \u2014 the step most often skipped."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A judge that outputs \u201cgood\u201d for every case achieved 95.1% raw agreement with humans and Cohen's \u03ba of exactly 0.000. What does this demonstrate?",
        options: [
          "That \u03ba is unreliable when one label dominates and raw agreement should be preferred",
          "That raw agreement is inflated by chance on skewed distributions \u2014 all of this judge's agreement is what chance predicts, so it has zero measurable skill",
          "That the human labels were themselves unreliable on that sample",
          "That the judge needs a lower decision threshold to produce some negatives"
        ],
        answer: 1,
        why: "When humans say \"good\" 95% of the time, a constant \"good\" predictor matches them 95% of the time without doing anything \u2014 so p_observed equals p_chance and \u03ba is zero by construction. This is exactly the behaviour \u03ba exists to expose, and the trap is realistic: a judge asked whether answers are faithful on a corpus where most are will reach high raw agreement by leaning toward yes. It also means a \u03ba figure needs its class balance reported alongside." },

      { stem: "Why is pairwise judging more reliable than pointwise rubric scoring?",
        options: [
          "Because it requires fewer tokens per judgement, reducing cost and noise",
          "Because ranking two answers is better defined than scoring one \u2014 absolute scales drift across prompts while relative comparisons are stable",
          "Because it eliminates position bias by construction",
          "Because it produces an absolute quality level that can be tracked over time"
        ],
        answer: 1,
        why: "\"Is this a 3 or a 4?\" has no stable answer across prompts, which is the same asymmetry that makes preference data cheaper and better defined than written demonstrations \u2014 and the same reason a Bradley-Terry fit recovers differences precisely while the absolute level is unidentifiable. Pairwise actually *introduces* position bias, which is why both orders are run; and it gives an ordering rather than a level, so it needs a fixed baseline to compare against." },

      { stem: "You run every judged pair in both presentation orders. What is the flip rate good for?",
        options: [
          "Doubling the effective sample size of the evaluation",
          "It is the position bias measured on your own judge, and it tells you whether the win rate is interpretable at all",
          "Detecting verbosity bias, since order correlates with length",
          "Establishing the human-human agreement ceiling"
        ],
        answer: 1,
        why: "Randomising order removes the systematic component of position bias but leaves the inconsistency, so the fraction of pairs where the judge reverses itself quantifies how noisy it is. Below roughly 0.2 you can exclude the flipped pairs and compute a win rate on the decisive ones; much above that, the judge is too inconsistent for the comparison regardless of how you randomise. It says nothing about verbosity or about the human ceiling, which needs double human labelling." },

      { stem: "Your judge scores \u03ba = 0.628. What else do you need before deciding whether to rely on it?",
        options: [
          "The judge model's parameter count and context length",
          "Human-human \u03ba on a doubly-labelled subset, as the ceiling, plus the class balance of the sample",
          "The judge's average confidence on each decision",
          "Agreement with a second judge from a different model family"
        ],
        answer: 1,
        why: "Preference labels are stochastic, so human-human agreement is well below 1 and is the real ceiling \u2014 \u03ba of 0.628 is close to the limit against a 0.710 ceiling and poor against a 0.9 one. The class balance is needed because \u03ba is not comparable across different marginal distributions. A second judge is a useful consistency check and not a ceiling, since two models can agree with each other while both diverging from humans." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The workhorse of modern evaluation, and how to check it",
    questions: [
      { level: "advanced",
        q: "How would you set up an LLM judge?",
        strong: "A strong answer covers the mode, the prompt, the biases and the calibration.",
        answer: [
          { t: "p", text: "Pairwise rather than pointwise, because ranking two answers is better defined than scoring one \u2014 the same asymmetry that makes preference data cheaper and more consistent than written demonstrations. \u2018Is this a 3 or a 4\u2019 drifts across prompts in a way \u2018is A better than B\u2019 does not." },
          { t: "p", text: "The prompt asks for reasoning first and then a constrained JSON verdict with an explicit tie option. Reasoning first because otherwise you get a verdict the model rationalises afterwards; the schema because an unparseable response becomes a detectable failure rather than a silently miscounted vote; and the tie option because without one genuine ties get broken arbitrarily and you mistake that noise for signal." },
          { t: "p", text: "Then the biases. I would run both orders for position bias \u2014 which also measures it, since the self-contradiction rate is the bias. Bin win rates by length for verbosity. Use a different model family from the system under test, because a model prefers its own style and otherwise you measure style agreement. And use a strong model as the judge, since a cheap noisy grader costs more in required sample size than it saves per call." },
          { t: "p", text: "And I would calibrate before trusting any of it: have humans label a sample, compute Cohen\u2019s kappa rather than raw agreement, and get two human labels on a subset so there is a ceiling to read it against." }
        ] },

      { level: "advanced",
        q: "Why Cohen's kappa rather than raw agreement?",
        strong: "A strong answer gives the degenerate case.",
        answer: [
          { t: "p", text: "Because raw agreement is inflated by chance, and on a skewed label distribution almost all of it is chance. Kappa subtracts the agreement you would expect at random and renormalises, so it measures skill above chance." },
          { t: "p", text: "The case that makes it concrete: I tested a judge that outputs \u2018good\u2019 for every case, on a set where humans say \u2018good\u2019 95% of the time. It scored 95.1% raw agreement \u2014 higher than a genuinely informative judge at 91.0% \u2014 with kappa of exactly 0.000. Zero skill, best raw agreement." },
          { t: "p", text: "And the correction is large even in less extreme cases. Two scenarios with identical raw agreement around 0.91 gave kappa of 0.819 and 0.453, purely because chance agreement rose from 0.502 to 0.830 as the labels skewed. So kappa is not comparable across different class balances, which means the balance has to be reported with it." },
          { t: "p", text: "I would also stratify the calibration sample toward the minority class rather than sampling randomly, because a random draw from a skewed distribution gives a kappa dominated by chance and leaves little room for skill to show." }
        ] },

      { level: "core",
        q: "What kappa is good enough?",
        strong: "A strong answer refuses a fixed threshold and names the ceiling.",
        answer: [
          { t: "p", text: "There is no fixed threshold, because the ceiling is your own annotators rather than 1.0. Preference judgements are stochastic \u2014 in a synthetic case where I knew the latent truth, the best achievable accuracy was 78.6% rather than perfect \u2014 so human-human kappa is well below one and a judge matching it is as good as the labels permit." },
          { t: "p", text: "So the number I would report is the judge\u2019s kappa as a fraction of the human-human kappa. A judge at 0.628 against a human ceiling of 0.710 is at 88% of what is achievable, which is usable; the same 0.628 against a ceiling of 0.9 would not be." },
          { t: "p", text: "That requires two human labels on at least a subset of the calibration sample, which is the step most teams skip because it feels like paying twice for the same data. It is the only way the headline number becomes interpretable." },
          { t: "p", text: "The published bands \u2014 0.6 to 0.8 as substantial and so on \u2014 come from contexts with crisper labels than subjective answer quality, so I would treat them as orientation rather than as a target. And chasing kappa above your human ceiling means fitting disagreement between your own annotators, which is the wrong thing to optimise." }
        ] }
    ]
  }
});
