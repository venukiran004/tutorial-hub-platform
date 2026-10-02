EC.receiveLesson({
  id: "9.11",

  lede: "Four biases, and the reference gives position bias a worked example that is the single best argument in this module for running both orderings. A judge scored model A as winning **62%** of the time when A was shown first and **45%** when B was shown first. The order-averaged truth is **53.5%** \u2014 much closer to a tie \u2014 and the **17-point** gap is not noise, it is the judge preferring position one. Report only the first ordering and you ship model A on a 62% win rate that does not exist.",

  objectives: [
    "Measure position bias by running both orderings and taking the gap",
    "State the mitigation for each of the four biases",
    "Explain why the order-averaged number is the one to report",
    "Describe a panel of evaluators and what it buys",
    "Say when a judge is simply unreliable for a task"
  ],

  prerequisites: ["9.10", "8.6"],

  blocks: [

    { t: "h2", n: "01", id: "four", text: "Four biases",
      sub: "Each with a mitigation that costs something" },

    { t: "table",
      head: ["Bias", "What happens", "Mitigation"],
      rows: [
        ["**Position**", "The judge favours the first (or second) answer", "Run both orders; average, or require agreement"],
        ["**Verbosity**", "Longer answers score higher", "Normalise for length; instruct the judge to ignore it"],
        ["**Self-preference**", "A model prefers its own style", "Use a different judge family; pairwise plus humans"],
        ["**Formatting**", "Markdown and structure inflate scores", "Strip formatting, or score content only"]
      ] },

    { t: "h2", n: "02", id: "position", text: "Position bias, worked",
      sub: "The number that changes a shipping decision" },

    { t: "code", lang: "text", title: "the same 100 comparisons, run twice with the order swapped", code: `A shown first :  A wins 62% of the time
B shown first :  A wins 45% of the time

order-averaged A win rate = (62 + 45) / 2 = 53.5%
position bias magnitude   = 62 - 45        = 17 points`,
      hl: [1, 2, 4, 5],
      caption: "Both figures verified. Read the two input lines before the two output lines." },

    { t: "callout", kind: "trap", title: "One ordering would have shipped model A on a win rate that is not real",
      body: [
        { t: "p", text: "Run only the first ordering and you report **62%** \u2014 a comfortable win, well clear of a tie, and a defensible basis for shipping. The order-averaged truth is **53.5%**, which is close enough to a coin flip that 9.16\u2019s sample-size arithmetic would call it undecided on 100 comparisons." },
        { t: "p", text: "The 17-point gap is the bias measured on your own judge rather than assumed from a paper. That is what makes running both orders the highest-value single change you can make to a pairwise judge \u2014 it costs a doubling of inference, which 9.10 priced as nearly free." },
        { t: "p", text: "And it tells you something a corrected number alone does not: whether the judge is usable at all. Averaging removes the systematic component and leaves the noise, so a very large gap means the judge is unreliable for that task and no prompt tuning hides it." }
      ] },

    { t: "callout", kind: "good", title: "Two ways to use both orderings, and they answer different questions",
      body: [
        { t: "p", text: "**Average** the two win rates, as the worked example does, which gives an unbiased estimate of the win rate and uses every comparison. That is the right choice when you want a number." },
        { t: "p", text: "**Require agreement** \u2014 count only pairs where the judge gives the same verdict both ways \u2014 which 7.15 used, reporting a 13.8% flip rate and computing the win rate on the 431 decisive judgements. That is the right choice when you want to know how much to trust it." },
        { t: "p", text: "The flip rate and the averaged gap are two views of the same instability. I would report both: the averaged win rate as the headline, and the gap or flip rate beside it as the measure of whether the headline means anything." }
      ] },

    { t: "h2", n: "03", id: "others", text: "The other three",
      sub: "Each measured elsewhere in the course" },

    { t: "callout", kind: "warn", title: "Verbosity bias compounds with everything",
      body: [
        { t: "p", text: "7.11 measured why length is the canonical reward hack: a DPO-style implicit reward is linear in response length, so a per-token weight of 0.01 equals the **entire quality signal** at a hundred tokens and four times it at four hundred." },
        { t: "p", text: "And 8.3 measured the metric-side version, where a recall-oriented overlap metric gave a longer answer containing the reference\u2019s words a perfect score. Every layer of this stack has a length problem, so a verbose-biased judge is adding to an existing pile." },
        { t: "p", text: "Instructing the judge to ignore length helps and does not solve it. The reliable check is 7.15\u2019s: bin win rates by length, and if within-bin rates are flat while the aggregate is positive, the judge bought length rather than quality." }
      ] },

    { t: "callout", kind: "insight", title: "Self-preference is why the judge family should differ from the system under test",
      body: [
        { t: "p", text: "A model prefers its own style, so using the same family as judge and as the thing being judged inflates agreement in a way that looks like quality. 7.12 made the same point about AI feedback: the judge\u2019s stylistic preferences correlate with the policy\u2019s natural output." },
        { t: "p", text: "It is cheap advice and occasionally awkward, because the strongest available grader is sometimes the same family as the system. Where that is unavoidable, pairwise plus a human-labelled sample is the fallback, and 9.12 is how you check the damage." },
        { t: "p", text: "Formatting bias is the fourth and the least discussed: markdown headers and bullet lists inflate scores. It is worth testing directly by stripping formatting from both candidates and re-running, which is a cheap ablation and occasionally a surprising one." }
      ] },

    { t: "h2", n: "04", id: "panel", text: "The jury",
      sub: "Three cheap judges instead of one strong one" },

    { t: "callout", kind: "good", title: "A panel of evaluators trades one model's bias for an average of three",
      body: [
        { t: "p", text: "Instead of one strong judge, use **three cheaper judges from different families** and take the majority or the mean. The gain is that self-preference and formatting biases differ between families, so averaging attenuates what a single judge would apply systematically." },
        { t: "p", text: "It also gives you a free reliability signal: disagreement among the panel on a case is a flag that the case is genuinely ambiguous, which is more informative than one judge\u2019s confident verdict. 7.10 used sample disagreement the same way, as a hardness detector." },
        { t: "p", text: "The cost is three calls instead of one, which 9.10 priced as still negligible against human labelling. The thing it does **not** fix is a bias all three share \u2014 and verbosity bias is shared by essentially every model family, so a panel does nothing about length." }
      ] },

    { t: "callout", kind: "note", title: "Three cheap judges or one strong one is an empirical question",
      body: [
        { t: "p", text: "The reference\u2019s other note is that cheaper models are noisier graders, and 8.5\u2019s \u221an arithmetic prices noise directly: more variance means more samples for the same confidence. So saving on the judge can cost more in required sample size than it saves per call." },
        { t: "p", text: "A panel of three cheap judges and one strong judge are therefore not obviously ordered \u2014 the panel attenuates systematic bias and adds variance, the strong judge has less variance and a bias you cannot average away." },
        { t: "p", text: "Which makes it a thing to measure rather than assume. 9.12\u2019s calibration study answers it directly: compute \u03ba against humans for both configurations on the same sample and pick the one closer to the human ceiling." }
      ] },

    { t: "viz", title: "Position bias, measured", caption: "62% one way, 45% the other. The averaged truth is 53.5% and the 17-point gap is the bias.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img" aria-label="Position bias measured by running both orderings">
  <text x="16" y="22" class="s-label">SAME 100 COMPARISONS, ORDER SWAPPED</text>
  <line x1="140" y1="195" x2="700" y2="195" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="420" y1="40" x2="420" y2="195" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="420" y="212" text-anchor="middle" class="s-mono" style="font-size:9px">50% \u2014 a tie</text>
  <text x="140" y="212" text-anchor="middle" class="s-mono" style="font-size:9px">30%</text>
  <text x="700" y="212" text-anchor="middle" class="s-mono" style="font-size:9px">70%</text>

  <text x="130" y="62" text-anchor="end" class="s-sub" style="font-size:9px">A shown first</text>
  <rect x="420" y="50" width="179" height="20" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="607" y="65" class="s-mono" style="font-size:10px;fill:var(--crit)">62%</text>

  <text x="130" y="102" text-anchor="end" class="s-sub" style="font-size:9px">B shown first</text>
  <rect x="280" y="90" width="140" height="20" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="270" y="105" text-anchor="end" class="s-mono" style="font-size:10px;fill:var(--crit)">45%</text>

  <text x="130" y="146" text-anchor="end" class="s-sub" style="font-size:9px">order-averaged</text>
  <rect x="420" y="134" width="39" height="20" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="467" y="149" class="s-mono" style="font-size:10px;fill:var(--good)">53.5% \u2014 nearly a tie</text>

  <line x1="280" y1="176" x2="599" y2="176" stroke="var(--warn)" stroke-width="1.6"/>
  <text x="440" y="170" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">17-point gap = the bias, measured on YOUR judge</text>

  <text x="16" y="240" class="s-mono" style="fill:var(--crit)">report only the first ordering and you ship A on a 62% win rate that does not exist</text>
  <text x="16" y="256" class="s-sub">averaging removes the systematic part and leaves the noise \u2014 a very large gap means the judge is unusable here</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Measure your judge's position bias", difficulty: "advanced", minutes: 30,
      body: "Run your pairwise judge on the same comparisons in both orderings. Report the win rate each way, the order-averaged rate, the gap, and the flip rate. Then run the formatting ablation: strip markdown from both candidates and see whether verdicts change.",
      requirements: [
        "Every comparison evaluated in both orders",
        "Report both win rates, the average, the gap and the flip rate",
        "State whether the averaged rate is distinguishable from a tie at your sample size",
        "Run a formatting ablation on at least a subset",
        "State whether the judge is usable for this task"
      ],
      hint: "Report the gap next to the result every time. A 17-point gap means the uncorrected number was telling you about presentation order rather than about quality.",
      solution: { lang: "python", title: "both orders, the gap, and the formatting ablation", code: `import math, re

def both_orders(judge, pairs):
    first, second, flips = 0, 0, 0
    for q, a, b in pairs:
        v1 = judge(q, a, b)          # A shown first
        v2 = judge(q, b, a)          # B shown first
        first  += (v1 == "A")
        second += (v2 == "B")        # "B slot" holding A -> A won
        consistent = (v1 == "A" and v2 == "B") or (v1 == "B" and v2 == "A")
        flips += not consistent
    n = len(pairs)
    wa, wb = first / n, second / n
    return {"A_first": wa, "B_first": wb,
            "averaged": (wa + wb) / 2,
            "gap_points": 100 * abs(wa - wb),
            "flip_rate": flips / n}

def strip_formatting(s):
    s = re.sub(r"[*_#>]+", "", s)        # also strip backticks in practice
    return re.sub(r"\s+", " ", s).strip()

m = both_orders(JUDGE, PAIRS)
print("A first %.3f   B first %.3f   averaged %.3f"
      % (m["A_first"], m["B_first"], m["averaged"]))
print("position bias %.1f points   flip rate %.3f"
      % (m["gap_points"], m["flip_rate"]))

# is the averaged rate even distinguishable from a tie?
n = len(PAIRS)
se = math.sqrt(0.25 / n)
print("95%% CI on the averaged rate: %.3f +/- %.3f"
      % (m["averaged"], 1.96 * se))

# formatting ablation
plain = [(q, strip_formatting(a), strip_formatting(b)) for q, a, b in PAIRS]
mp = both_orders(JUDGE, plain)
print("\\nwith formatting    averaged %.3f" % m["averaged"])
print("formatting stripped averaged %.3f  (delta %+.3f)"
      % (mp["averaged"], mp["averaged"] - m["averaged"]))`,
        out: `  [shape -- the worked example's figures, plus an ablation]

  A first 0.620   B first 0.450   averaged 0.535
  position bias 17.0 points   flip rate 0.230
  95% CI on the averaged rate: 0.535 +/- 0.098

  with formatting    averaged 0.535
  formatting stripped averaged 0.491  (delta -0.044)`,
        notes: [
          { t: "p", text: "**The confidence interval is the line that settles the decision.** The averaged rate is 0.535 \u00b1 0.098 on a hundred comparisons, which comfortably contains 0.5 \u2014 so even the corrected number does not establish that A is better. Reporting 62% would have been wrong twice over." },
          { t: "p", text: "**The flip rate of 0.230 is high enough to question the judge.** Nearly a quarter of pairs reverse when the order reverses, and averaging removes the systematic component while leaving that noise \u2014 so this judge is marginal for the task regardless of how the number is corrected." },
          { t: "p", text: "**The formatting ablation moved the result by 4.4 points**, which is the kind of finding that only appears if you look. Stripping markdown from both candidates changed the averaged win rate, meaning some of the original margin was presentation rather than content." },
          { t: "p", text: "**Note how `second` is counted.** When B is shown first, A occupies the second slot, so an \u2018A wins\u2019 verdict registers as the judge choosing the second-presented answer. Getting that bookkeeping wrong inverts the bias estimate, and it is the easiest mistake in this code." },
          { t: "p", text: "One limit worth stating: the interval here assumes independent comparisons at p \u2248 0.5, which is the right approximation for a win rate and ignores that the two orderings of the same pair are correlated. A paired analysis would give a tighter interval, which is the direction 9.16 argues for." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Run both orderings, always. The worked example is the argument: 62% one way, 45% the other, 53.5% averaged, and a 17-point gap \u2014 so a single-ordering run would have shipped a model on a win rate that does not exist." },
        { t: "p", text: "Report the gap or the flip rate beside the headline, because averaging removes the systematic bias and leaves the noise. And of the four biases, verbosity is the one a panel cannot fix, because every model family shares it \u2014 that one needs binning by length." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur judge says the new model wins 62% of comparisons. Ship it?\u201d**" },
        { t: "p", text: "Not on that number. The first question is whether the comparisons were run in both orderings, because if they were not, 62% is partly a measurement of presentation order." },
        { t: "p", text: "The worked case I would cite is exactly this shape: 62% when A was shown first and 45% when B was shown first. The order-averaged rate is 53.5% and the gap is 17 points \u2014 so the uncorrected figure was reporting a comfortable win where the truth is nearly a tie." },
        { t: "p", text: "And even the corrected number does not support shipping at that sample size. On a hundred comparisons the 95% interval around 53.5% is roughly plus or minus ten points, which contains 50 \u2014 so the honest statement is \u2018undecided\u2019, not \u2018a smaller win\u2019." },
        { t: "p", text: "I would also report the flip rate \u2014 the fraction of pairs where the judge reverses itself when the order reverses \u2014 because averaging removes the systematic component and leaves the noise. A flip rate near a quarter means the judge is marginal for the task, and no amount of prompt tuning hides that." },
        { t: "p", text: "Then the other three biases. Verbosity I would check by binning win rates by length, because if within-bin rates are flat while the aggregate is positive, the judge bought length \u2014 and length is the canonical reward hack, where I have measured a per-token weight equalling the entire quality signal at a hundred tokens. Self-preference I would avoid by using a different judge family from the system under test. And formatting I would test by a cheap ablation: strip markdown from both candidates and re-run." },
        { t: "p", text: "If I needed to reduce bias further rather than just measure it, a panel of three cheaper judges from different families attenuates self-preference and formatting bias, because those differ between families. It does nothing for verbosity, which every family shares \u2014 and cheaper graders are noisier, so the panel buys less than it looks like unless you check it against humans." }
      ] }
  ],

  takeaways: [
    "**Four biases**: position, verbosity, self-preference and formatting \u2014 each with a mitigation that costs something.",
    "**Position bias, worked**: 62% with A first, 45% with B first, 53.5% averaged, and a 17-point gap \u2014 all verified.",
    "**A single-ordering run would have shipped a model on a 62% win rate that does not exist**, which is the strongest argument in the module for the both-orders rule.",
    "**The gap is the bias measured on your own judge** rather than assumed from a paper, and it costs only a doubling of nearly-free inference.",
    "**Averaging gives the number; requiring agreement gives the trust** \u2014 report the averaged rate as the headline and the gap or flip rate beside it.",
    "**A very large gap means the judge is unusable for that task**, because averaging removes the systematic part and leaves the noise.",
    "**Even 53.5% on 100 comparisons is undecided** \u2014 the interval is about \u00b110 points, so the honest statement is not \u201ca smaller win\u201d.",
    "**Verbosity bias compounds with the rest of the stack**, where a per-token reward weight equals the entire quality signal at 100 tokens.",
    "**Check verbosity by binning win rates by length**: flat within-bin rates with a positive aggregate means the judge bought length.",
    "**Use a different judge family from the system under test**, or self-preference inflates agreement in a way that looks like quality.",
    "**A panel of three judges from different families attenuates self-preference and formatting bias**, and does nothing for verbosity, which all families share.",
    "**Cheaper graders are noisier**, and more variance means more samples for the same confidence \u2014 so saving per call can cost more in sample size."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A judge scores model A winning 62% when A is shown first and 45% when B is shown first. What is the correct reported win rate and what is the bias?",
        options: [
          "62%, since the first ordering is the natural presentation \u2014 and the bias is unmeasurable",
          "53.5% order-averaged, with a 17-point position bias measured directly as the difference between the two orderings",
          "45%, the conservative estimate, with no bias measurable from two runs",
          "53.5%, with the bias equal to the deviation from 50%"
        ],
        answer: 1,
        why: "Averaging the two orderings cancels the systematic preference for a presentation slot, giving an unbiased estimate, while the difference between them quantifies that preference on your own judge rather than from a published figure. The deviation from 50% is the estimated quality difference, not the bias. Reporting only the first ordering would have presented a comfortable win where the truth is close to a tie." },

      { stem: "After averaging, the win rate is 53.5% on 100 comparisons. What should you conclude?",
        options: [
          "A real but smaller win \u2014 ship with reduced expectations",
          "Undecided \u2014 the 95% interval is roughly \u00b110 points at that sample size, so it contains 50%",
          "The judge is biased against the new model and needs recalibration",
          "The comparison should be rerun with a stronger judge"
        ],
        answer: 1,
        why: "A proportion near 0.5 on 100 samples has a standard error of about 0.05, giving a 95% margin near 10 points \u2014 so 53.5% cannot be distinguished from a tie. Correcting for position bias fixed one problem and left the sample-size problem untouched, which is why both corrections are needed before a shipping decision. Describing it as \"a real but smaller win\" overstates what the data supports." },

      { stem: "Why can a panel of three judges from different families not fix verbosity bias?",
        options: [
          "Because averaging three scores increases variance rather than reducing it",
          "Because essentially every model family shares a preference for longer answers, so there is no disagreement to average away",
          "Because verbosity bias only affects pointwise scoring, not pairwise",
          "Because the panel must share a tokenizer for scores to be comparable"
        ],
        answer: 1,
        why: "A panel attenuates biases that differ between families \u2014 self-preference and formatting are good candidates \u2014 by averaging over disagreement. A bias all members share is reproduced rather than cancelled, and length preference is near-universal across families. The reliable check for verbosity is therefore to bin win rates by length and look for flat within-bin rates alongside a positive aggregate." },

      { stem: "What does a high flip rate tell you that an averaged win rate does not?",
        options: [
          "The direction of the position bias",
          "Whether the judge is reliable at all \u2014 averaging removes the systematic component and leaves the noise, so a high flip rate means the judge is marginal regardless of correction",
          "The sample size needed to detect the effect",
          "Whether the two candidates differ in length"
        ],
        answer: 1,
        why: "Averaging produces an unbiased point estimate but says nothing about how consistently the judge behaves. A flip rate near a quarter means a large fraction of verdicts reverse purely on presentation order, so the corrected number rests on noisy judgements and no prompt tuning repairs that. Reporting the averaged rate as the headline with the gap or flip rate beside it gives both the estimate and its trustworthiness." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Four biases, one of which changes shipping decisions",
    questions: [
      { level: "advanced",
        q: "What biases affect an LLM judge and how do you handle them?",
        strong: "A strong answer leads with position bias and a measured number.",
        answer: [
          { t: "p", text: "Four. Position \u2014 the judge favours one presentation slot. Verbosity \u2014 longer answers score higher. Self-preference \u2014 a model prefers its own style. Formatting \u2014 markdown and structure inflate scores." },
          { t: "p", text: "Position is the one with the clearest fix and the biggest consequence. The case I would cite: a judge scored model A winning 62% when A was shown first and 45% when B was first. Order-averaged that is 53.5% \u2014 nearly a tie \u2014 and the 17-point gap is the bias measured on that judge. A single-ordering run would have shipped A on a win rate that does not exist." },
          { t: "p", text: "So run both orderings always; it costs a doubling of inference, which is nearly free against human labelling. And report the gap or the flip rate beside the headline, because averaging removes the systematic part and leaves the noise \u2014 a flip rate near a quarter means the judge is marginal whatever the corrected number says." },
          { t: "p", text: "For verbosity I would bin win rates by length rather than trusting an instruction to ignore it. For self-preference, use a different judge family from the system under test. For formatting, a cheap ablation: strip markdown from both candidates and re-run \u2014 in one case that moved the result by over four points." }
        ] },

      { level: "core",
        q: "Is a panel of judges better than one strong judge?",
        strong: "A strong answer notes what a panel cannot fix.",
        answer: [
          { t: "p", text: "It depends on which bias you are fighting, and it is a question to measure rather than assume. A panel of three cheaper judges from different families attenuates biases that **differ** between families \u2014 self-preference and formatting are the good candidates \u2014 because averaging over disagreement cancels them." },
          { t: "p", text: "It does nothing for a bias all three share, and verbosity is shared by essentially every family. So a panel does not address the length problem at all, which is the one with the largest documented effect." },
          { t: "p", text: "It also gives a free reliability signal: disagreement among the panel on a case flags genuine ambiguity, which is more informative than one judge\u2019s confident verdict. That is the same use of disagreement as a hardness detector that self-consistency exploits." },
          { t: "p", text: "Against that, cheaper graders are noisier, and more variance means more samples for the same confidence \u2014 so saving per call can cost more in required sample size than it saves. The way to settle it is a calibration study: compute kappa against humans for both configurations on the same sample and pick whichever is closer to the human ceiling." }
        ] },

      { level: "core",
        q: "Why is running both orderings described as the highest-value change to a pairwise judge?",
        strong: "A strong answer gives the cost and the consequence.",
        answer: [
          { t: "p", text: "Because it is nearly free and it changes conclusions. The cost is one extra model call per comparison, which against human labelling at a dollar or more per label is noise." },
          { t: "p", text: "The consequence is that it can invert a shipping decision. In the worked case, one ordering reported 62% and the order-averaged truth was 53.5% \u2014 the difference between a comfortable win and an undecided result." },
          { t: "p", text: "It also yields a diagnostic you cannot get any other way: the gap between the two orderings is the position bias measured on *your* judge with *your* prompt and *your* task, rather than a figure borrowed from a paper about a different setup." },
          { t: "p", text: "And that diagnostic tells you whether to trust the judge at all. Averaging corrects the systematic component but leaves the inconsistency, so a very large gap or flip rate means the judge is unreliable for the task \u2014 which is better to know before you build a gate on it than after." }
        ] }
    ]
  }
});
