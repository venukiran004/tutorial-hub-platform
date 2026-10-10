EC.receiveLesson({
  id: "7.10",

  lede: "Since 2024 there is a second scaling dial: spend more compute at inference on the same model. The usual illustration is it with a worked trade \u2014 a 60%-accurate small model with self-consistency@8 reaching \u201c\u224878%\u201d against a 20\u00d7-cost big model at 85%. Simulated, that figure is only right if **all the model\u2019s wrong answers agree with each other**. With errors spread over five distinct wrong answers it reaches **93.4%**, beating the big model outright at 2.5\u00d7 less cost \u2014 and below a 50% base accuracy with agreeing errors, voting makes things **worse**.",

  objectives: [
    "Name the five test-time compute techniques and what each spends",
    "Explain why self-consistency depends on the structure of errors, not just their rate",
    "Compute the accuracy-versus-cost trade against a larger model",
    "Identify when voting degrades accuracy instead of improving it",
    "Route test-time compute to the traffic that needs it"
  ],

  prerequisites: ["7.9", "3.3"],

  blocks: [

    { t: "h2", n: "01", id: "axis", text: "The second axis",
      sub: "Quality is a function of two compute budgets" },

    { t: "math", tex: "\\text{Quality} \\approx f(\\text{training compute}) \\times g(\\text{inference compute})" },

    { t: "p", text: "7.2 was entirely about the first factor and its awkward arithmetic \u2014 over-training an 8B past Chinchilla cost more than training a 70B optimally. The second factor needs no retraining at all, which makes it the cheapest quality lever available to someone who did not train the model." },

    { t: "table",
      head: ["Technique", "How it spends compute", "Cost multiplier", "Best for"],
      rows: [
        ["**Longer CoT**", "More thinking tokens before answering", "2\u201320\u00d7 output tokens", "Any reasoning task \u2014 the native mode of 7.9's models"],
        ["**Self-consistency**", "Sample N, take the majority vote", "N\u00d7", "Tasks with a short comparable final answer"],
        ["**Best-of-N**", "Sample N, pick the highest verifier/RM score", "N\u00d7 plus scoring", "When you have a good verifier"],
        ["**Beam search over steps**", "Expand and prune partial reasoning with a PRM", "N\u00d7 with pruning", "Long multi-step derivations"],
        ["**Self-refine**", "Draft, critique, revise, k rounds", "2k\u00d7", "Writing, code review, agent plans"]
      ] },

    { t: "callout", kind: "insight", title: "Two of these need something you may not have",
      body: [
        { t: "p", text: "Best-of-N needs a scorer good enough to rank N candidates, and beam search over steps needs a **process** reward model \u2014 which 7.9 established is expensive to produce because step-level annotation does not come free the way outcome checking does." },
        { t: "p", text: "Self-consistency needs neither. It uses the model\u2019s own agreement as the signal, which is why it is the one most teams can apply immediately and why it is worth understanding precisely rather than approximately." },
        { t: "p", text: "Longer CoT needs nothing either, but it is not available on every model \u2014 it is a capability 7.9\u2019s training installs. Asking a non-reasoning model to think longer produces more tokens, not better answers." }
      ] },

    { t: "h2", n: "02", id: "consistency", text: "Self-consistency, measured",
      sub: "The number is right for one narrow case" },

    { t: "p", text: "The claim is that a 60%-accurate model voting over 8 samples reaches about 78%. That is simulatable, and the thing it turns on is not stated: when the model is wrong, does it give the *same* wrong answer each time, or different ones?" },

    { t: "code", lang: "python", title: "g710.py \u00a7A \u2014 60% accuracy, 8 samples, varying error structure", code: `def self_consistency(p_correct, n_samples, n_wrong_modes):
    """Correct answer is 0; wrong answers are drawn from n_wrong_modes options.
    n_wrong_modes=1  -> all errors agree (worst case for voting)
    n_wrong_modes=50 -> every error is different (best case)"""
    for _ in range(TRIALS):
        votes = [0 if rng.random() < p_correct
                 else 1 + rng.integers(0, n_wrong_modes)
                 for _ in range(n_samples)]
        # plurality, ties broken uniformly at random`,
      out: `  error structure                      accuracy@8   vs claim 78%
  all wrong answers AGREE (1 mode)          71.9%          -6.1
  2 distinct wrong answers                  85.3%          +7.3
  3 distinct wrong answers                  90.0%         +12.0
  5 distinct wrong answers                  93.4%         +15.4
  10 distinct wrong answers                 96.5%         +18.5
  every error unique (~50 modes)            98.6%         +20.6`,
      hl: [11, 12, 15],
      caption: "The claimed 78% sits between one and two error modes. Beyond that the technique is far stronger than advertised." },

    { t: "callout", kind: "insight", title: "Error diversity, not error rate, is what self-consistency exploits",
      body: [
        { t: "p", text: "Every row has the same 60% single-sample accuracy. The spread from 71.9% to 98.6% comes entirely from how the 40% of failures distribute \u2014 so quoting an accuracy number without the error structure says almost nothing about what voting will buy." },
        { t: "p", text: "The mechanism is that the correct answer only needs a **plurality**, not a majority. If errors scatter across many distinct wrong answers, each wrong answer gets few votes while the correct one accumulates all of its own \u2014 so a 60% model wins easily. If all errors agree, the vote is effectively 60-40 and voting adds little." },
        { t: "p", text: "That gives a practical diagnostic: on your own task, sample N times and measure how often the wrong answers coincide. High agreement among errors means voting will disappoint; scattered errors mean it will outperform the usual estimates." }
      ] },

    { t: "code", lang: "python", title: "g710.py \u00a7B \u2014 the binomial intuition people reach for", code: `def binom_majority(p, n):
    """P(more than half the samples are correct) -- the usual mental model."""
    return sum(comb(n, k) * p**k * (1-p)**(n-k) for k in range(n//2 + 1, n + 1))`,
      out: `  n samples  binomial P(>half) simulated (5 modes)
  1                     60.0%              59.6%
  4                     47.5%              80.5%
  8                     59.4%              93.6%
  16                    71.6%              99.3%
  32                    83.5%             100.0%`,
      hl: [6, 7],
      caption: "Read the binomial column at n = 4: 47.5%, *below* the single-sample 60%." },

    { t: "callout", kind: "trap", title: "The binomial model is not just pessimistic, it is non-monotone",
      body: [
        { t: "p", text: "P(more than half correct) at n = 4 is **47.5%**, worse than taking one sample. That is because a strict majority of 4 requires 3 or more, which is a harder bar than 1 of 1 \u2014 so the model predicts that adding samples *hurts*, which is nonsense as a description of self-consistency." },
        { t: "p", text: "The error is in the question. Self-consistency takes the **plurality**, not the majority \u2014 whichever answer appears most often wins, even with 2 votes out of 8. With errors spread over 5 modes the simulated figure at n = 4 is 80.5%, not 47.5%." },
        { t: "p", text: "So the binomial framing is wrong by 33 points at n = 4 and 34 at n = 8, in the direction of underselling the technique. It is worth knowing because it is the calculation most people do in their heads, and it is the likely origin of conservative estimates like 78%." }
      ] },

    { t: "h2", n: "03", id: "trade", text: "The trade against a bigger model",
      sub: "Where the conclusion is stronger than the" },

    { t: "code", lang: "python", title: "g710.py \u00a7C \u2014 small model plus voting against a 20\u00d7 big model", code: `rows = [("small, single sample", 0.60, 1)]
for n in (4, 8, 16):
    rows.append(("small + self-consistency@%d" % n, self_consistency(0.60, n, 5), n))
rows.append(("big model, single sample", 0.85, 20))`,
      out: `  option                             accuracy       cost acc per unit cost
  small, single sample                  60.0%          1           0.6000
  small + self-consistency@4            80.7%          4           0.2017
  small + self-consistency@8            93.8%          8           0.1173
  small + self-consistency@16           99.3%         16           0.0621
  big model, single sample              85.0%         20           0.0425`,
      hl: [4, 6],
      caption: "At 5 error modes, voting@8 beats the big model on accuracy *and* costs 2.5\u00d7 less." },

    { t: "callout", kind: "good", title: "It is commonly said \u201coften the right answer\u201d; the measurement says it is not close",
      body: [
        { t: "p", text: "Its comparison has voting@8 at 78% losing on accuracy to the big model\u2019s 85% while winning on cost \u2014 a genuine trade-off. With realistic error scattering, voting@8 reaches **93.8%** at 8\u00d7 cost against 85% at 20\u00d7. It wins on both axes." },
        { t: "p", text: "So the recommendation is right and its justification understates the case. That matters for how confidently you would propose it: \u201ccheaper but slightly worse\u201d is an argument you might lose, and \u201ccheaper *and* better\u201d is not." },
        { t: "p", text: "The caveat that keeps this honest is the one the whole lesson rests on: the five-error-mode assumption is mine, not a measurement of any real task. The number to establish before believing any of this is how much your model\u2019s wrong answers agree." }
      ] },

    { t: "callout", kind: "tradeoff", title: "And \u201caccuracy per unit cost\u201d is the wrong column to optimise",
      body: [
        { t: "p", text: "That column is monotonically best for a single sample \u2014 0.60 against 0.12 for voting@8 \u2014 which would argue for never spending anything. It is the wrong metric because accuracy is bounded at 1.0 while cost is not, so ratios always favour doing less." },
        { t: "p", text: "The right question is whether the accuracy gain is worth the marginal cost *at your required accuracy level*. If you need 90%, the single sample is not an option at any price and the comparison is between voting@8 and something larger." },
        { t: "p", text: "Which is why routing is the actual answer rather than a global setting \u2014 \u00a705. Different requests have different required accuracy, and spending the same compute on all of them is wrong in both directions at once." }
      ] },

    { t: "h2", n: "04", id: "degenerate", text: "When voting makes it worse",
      sub: "The caveat the usual treatment omits entirely" },

    { t: "code", lang: "python", title: "g710.py \u00a7D \u2014 vote@8 with agreeing errors, across base accuracies", code: `for p in (0.2, 0.35, 0.5, 0.6, 0.8):
    a = self_consistency(p, 8, 1)      # 1 mode = all errors agree`,
      out: `  p_correct              single vote@8 (1 mode)         change
  0.20                    20.0%           3.0%         -17.0
  0.35                    35.0%          19.7%         -15.3
  0.50                    50.0%          49.5%          -0.5
  0.60                    60.0%          71.2%         +11.2
  0.80                    80.0%          96.8%         +16.8`,
      hl: [2, 3, 4],
      caption: "At 20% base accuracy with agreeing errors, voting over 8 samples drops accuracy to 3.0%." },

    { t: "callout", kind: "trap", title: "Self-consistency is a variance reducer, not an accuracy creator",
      body: [
        { t: "p", text: "Below 50% with concentrated errors, voting **amplifies** the error. At 20% base accuracy it falls to 3.0% \u2014 because the wrong answer is the modal answer, and voting\u2019s whole job is to find the mode more reliably. It does exactly what it is supposed to and that is the problem." },
        { t: "p", text: "The crossover is at 50%, where voting is neutral. So the precondition is that **the correct answer must already be the most likely single outcome**. Where that holds, more samples sharpen the estimate; where it does not, more samples sharpen a wrong estimate." },
        { t: "p", text: "This is a genuine failure mode on hard subsets. A model can be above 50% overall and well below it on a specific category \u2014 and voting will make that category worse while improving the aggregate, which is invisible unless you evaluate by slice." }
      ] },

    { t: "viz", title: "Self-consistency depends on error structure, and can backfire", caption: "Same 60% base accuracy, 71.9% to 98.6% depending on whether errors agree. And below 50%, voting hurts.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Self-consistency accuracy by error structure and base accuracy">
  <text x="16" y="22" class="s-label">VOTE@8 FROM A 60% MODEL \u2014 BY HOW MANY DISTINCT WRONG ANSWERS</text>
  <line x1="150" y1="130" x2="700" y2="130" stroke="var(--line)" stroke-width="1.2"/>
  <text x="140" y="56" text-anchor="end" class="s-mono" style="font-size:9px">100%</text>
  <text x="140" y="134" text-anchor="end" class="s-mono" style="font-size:9px">60%</text>
  <line x1="150" y1="52" x2="700" y2="52" stroke="var(--line)" stroke-width="0.8" stroke-dasharray="3 3"/>

  <rect x="168" y="100" width="62" height="30" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="199" y="94" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">71.9%</text>
  <text x="199" y="148" text-anchor="middle" class="s-sub" style="font-size:9px">1 mode</text>

  <rect x="256" y="77" width="62" height="53" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="287" y="71" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">85.3%</text>
  <text x="287" y="148" text-anchor="middle" class="s-sub" style="font-size:9px">2</text>

  <rect x="344" y="68" width="62" height="62" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="375" y="62" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">90.0%</text>
  <text x="375" y="148" text-anchor="middle" class="s-sub" style="font-size:9px">3</text>

  <rect x="432" y="62" width="62" height="68" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="463" y="56" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">93.4%</text>
  <text x="463" y="148" text-anchor="middle" class="s-sub" style="font-size:9px">5</text>

  <rect x="520" y="57" width="62" height="73" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="551" y="51" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">96.5%</text>
  <text x="551" y="148" text-anchor="middle" class="s-sub" style="font-size:9px">10</text>

  <rect x="608" y="53" width="62" height="77" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="639" y="47" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">98.6%</text>
  <text x="639" y="148" text-anchor="middle" class="s-sub" style="font-size:9px">~50</text>

  <text x="706" y="134" class="s-sub" style="font-size:9px">base</text>

  <line x1="16" y1="176" x2="744" y2="176" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="200" class="s-label">AND WITH AGREEING ERRORS, BELOW 50% IT BACKFIRES</text>
  <text x="30" y="224" class="s-mono" style="font-size:10px">base 20%</text>
  <text x="150" y="224" class="s-mono" style="font-size:10px;fill:var(--crit)">vote@8 -&gt; 3.0%   (-17.0)</text>
  <text x="30" y="244" class="s-mono" style="font-size:10px">base 35%</text>
  <text x="150" y="244" class="s-mono" style="font-size:10px;fill:var(--crit)">vote@8 -&gt; 19.7%  (-15.3)</text>
  <text x="30" y="264" class="s-mono" style="font-size:10px">base 50%</text>
  <text x="150" y="264" class="s-mono" style="font-size:10px;fill:var(--warn)">vote@8 -&gt; 49.5%  (neutral)</text>
  <text x="30" y="284" class="s-mono" style="font-size:10px">base 80%</text>
  <text x="150" y="284" class="s-mono" style="font-size:10px;fill:var(--good)">vote@8 -&gt; 96.8%  (+16.8)</text>
</svg>` },

    { t: "h2", n: "05", id: "routing", text: "Route it, do not enable it",
      sub: "The soundbite, and why it is correct" },

    { t: "p", text: "The framing is the right one: test-time compute is the cheapest quality lever because it needs no retraining, and it trades latency for accuracy \u2014 so it belongs on the hard tail of traffic, not on every request." },

    { t: "callout", kind: "good", title: "Which is 6.7's argument arriving from the other direction",
      body: [
        { t: "p", text: "6.7 measured a RAG pipeline where the cross-encoder was 2,405 ms against 11 ms of retrieval, and concluded that the expensive stages are the optional model calls you chose to add. Test-time compute is the same category: an N\u00d7 cost multiplier applied by choice." },
        { t: "p", text: "The routing logic is identical too. A classifier sends easy queries down a cheap single-pass route and hard ones to verified sampling \u2014 and the cost is dominated by the fraction routed to the expensive path, so the classifier\u2019s precision is what determines the bill." },
        { t: "p", text: "The honest difficulty is that deciding whether a request is hard is itself a prediction, and getting it wrong in the cheap direction means a wrong answer at low cost. Self-consistency offers a useful signal here: if the N samples disagree, the question was hard \u2014 so sampling a few and escalating on disagreement is a measurement rather than a guess." }
      ] },

    { t: "exercise", kind: "analysis", title: "Measure your error structure before buying samples", difficulty: "core", minutes: 30,
      body: "For a task where you are considering self-consistency, sample N times per question on a held-out set and measure the thing that determines whether it will work: how often the wrong answers agree with each other. Then compute the accuracy voting would give at several N and compare against a larger model you could use instead.",
      requirements: [
        "Report single-sample accuracy and the distribution of distinct wrong answers per question",
        "Compute plurality-vote accuracy at N = 4, 8 and 16 from your samples",
        "Report accuracy by slice, not only in aggregate",
        "Identify any slice where the base accuracy is below 50%",
        "State whether voting or a larger model is the better spend, with the numbers"
      ],
      hint: "Measure distinct wrong answers per question, not just the error rate. Two tasks with identical accuracy can respond completely differently to voting.",
      solution: { lang: "python", title: "the error-structure measurement", code: `from collections import Counter

def analyse(samples, gold):
    """samples: list of N answers for one question. Returns the facts that matter."""
    c = Counter(samples)
    wrong = Counter({k: v for k, v in c.items() if k != gold})
    top = max(c.values())
    leaders = [k for k, v in c.items() if v == top]
    return {
        "single_acc":      c[gold] / len(samples),
        "n_wrong_modes":   len(wrong),                 # THE number that matters
        "plurality_right": gold in leaders and len(leaders) == 1,
        "tied":            len(leaders) > 1,
    }

rows = [analyse(s, g) for s, g in zip(ALL_SAMPLES, GOLDS)]
print("single-sample accuracy : %.1f%%"
      % (100 * np.mean([r["single_acc"] for r in rows])))
print("mean distinct wrong answers: %.2f"
      % np.mean([r["n_wrong_modes"] for r in rows]))
print("plurality accuracy     : %.1f%%"
      % (100 * np.mean([r["plurality_right"] for r in rows])))
print("tied (coin-flip) rate  : %.1f%%"
      % (100 * np.mean([r["tied"] for r in rows])))

# the slice check -- voting HURTS below 50%
for name, idx in SLICES.items():
    sub = [rows[i] for i in idx]
    base = np.mean([r["single_acc"] for r in sub])
    vote = np.mean([r["plurality_right"] for r in sub])
    flag = "  <-- VOTING HURTS" if vote < base else ""
    print("%-18s base %.1f%% -> vote %.1f%%%s"
          % (name, 100 * base, 100 * vote, flag))`,
        out: `  [shape -- run against your own task]

  single-sample accuracy : 61.4%
  mean distinct wrong answers: 3.12
  plurality accuracy     : 89.7%
  tied (coin-flip) rate  : 4.2%

  arithmetic        base 78.2% -> vote 97.1%
  word problems     base 64.0% -> vote 91.3%
  geometry          base 41.5% -> vote 33.8%  <-- VOTING HURTS`,
        notes: [
          { t: "p", text: "**`n_wrong_modes` is the number to collect**, and it is the one nobody reports. Two tasks at identical accuracy can land anywhere from 71.9% to 98.6% under voting@8 depending on it \u2014 so an accuracy figure alone does not predict what voting will buy." },
          { t: "p", text: "**The slice table is why aggregate evaluation is insufficient.** Geometry at 41.5% base accuracy gets *worse* under voting, falling to 33.8%, because below 50% the modal answer is wrong and voting finds the mode more reliably. That degradation is invisible in the 61.4% aggregate." },
          { t: "p", text: "**So route by slice, not globally.** Enable voting where base accuracy clears 50% comfortably and suppress it where it does not \u2014 and on a sub-50% slice, spend the compute on a larger model or a verifier instead, since more samples will not help." },
          { t: "p", text: "**Track the tie rate.** Ties are broken arbitrarily, so a high tie rate means a meaningful fraction of answers are coin flips dressed as decisions. If it is large, N is too small for the number of distinct answers your model produces." },
          { t: "p", text: "One honest limit on my own figures: the 71.9%-to-98.6% range came from a simulation where I *chose* the number of error modes, not from a real task. The simulation shows the sensitivity; only this measurement tells you where your task sits on it, which is the whole reason the exercise exists." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Self-consistency exploits error *diversity*, not error rate. Same 60% accuracy gives 71.9% if the wrong answers agree and 98.6% if they scatter, and the correct answer needs only a plurality \u2014 which is why the binomial majority calculation undersells it by over 30 points." },
        { t: "p", text: "And it is a variance reducer, not an accuracy creator: below 50% with concentrated errors it makes things worse, dropping a 20% model to 3%. So the precondition is that the correct answer is already the modal one, which has to be checked per slice rather than in aggregate." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur model gets 60% on this task. Should we use self-consistency or move to a bigger model?\u201d**" },
        { t: "p", text: "I would not answer from the accuracy figure alone, because it does not determine what voting buys. What matters is how the errors are structured \u2014 when the model is wrong, does it give the same wrong answer every time or different ones?" },
        { t: "p", text: "I simulated the spread. Holding single-sample accuracy at exactly 60% and voting over 8: if all the wrong answers agree, you get 71.9%. With two distinct wrong answers, 85.3%. With five, 93.4%. With errors essentially unique, 98.6%. Same accuracy, a 27-point range in outcome." },
        { t: "p", text: "So the first thing I would measure is distinct wrong answers per question on a held-out set. That takes one sampling run and it is the number that decides the question." },
        { t: "p", text: "With realistic scattering \u2014 say five modes \u2014 voting@8 reaches about 93.8% at 8\u00d7 cost, against the big model\u2019s 85% at 20\u00d7. It wins on accuracy *and* on cost, which is a stronger conclusion than the usual framing of cheaper-but-slightly-worse." },
        { t: "p", text: "I would also correct a calculation people often do in their heads. The binomial probability of more than half the samples being correct is the wrong model \u2014 at n = 4 it gives 47.5%, which is *below* the single-sample 60% and would suggest sampling hurts. Self-consistency takes the plurality, not the majority: whichever answer appears most often wins, even with 2 votes of 8. The simulated figure at n = 4 is 80.5%." },
        { t: "p", text: "And the caveat I would insist on: self-consistency is a variance reducer, not an accuracy creator. Below 50% base accuracy with agreeing errors it makes things worse \u2014 a 20% model drops to 3% over 8 votes, because the wrong answer is the modal answer and voting finds the mode more reliably. So I would check accuracy by slice. A model above 50% overall can be well below it on a sub-category, and voting will degrade that category while improving the aggregate." }
      ] }
  ],

  takeaways: [
    "**Quality scales on two axes** \u2014 training compute and inference compute \u2014 and the second needs no retraining, making it the cheapest lever for anyone who did not train the model.",
    "**Self-consistency exploits error diversity, not error rate**: at a fixed 60% accuracy, vote@8 ranges from 71.9% (errors agree) to 98.6% (errors unique).",
    "**The \u224878% is right only between one and two error modes**, and understates the technique for any realistic scattering.",
    "**The correct answer needs a plurality, not a majority** \u2014 which is why the binomial calculation is wrong by 33 points at n = 4 and is non-monotone, predicting 47.5% below the single-sample 60%.",
    "**At five error modes, voting@8 reaches 93.8% at 8\u00d7 cost** against a big model's 85% at 20\u00d7 \u2014 winning on both axes, not trading.",
    "**\u201cAccuracy per unit cost\u201d always favours doing less**, because accuracy is bounded and cost is not; the real question is marginal cost at your required accuracy.",
    "**Below 50% base accuracy with agreeing errors, voting backfires** \u2014 a 20% model falls to 3.0% and a 35% model to 19.7%.",
    "**So self-consistency is a variance reducer, not an accuracy creator**: the correct answer must already be the modal single outcome.",
    "**Check accuracy by slice**, because a model above 50% overall can be below it on a category where voting then degrades results invisibly.",
    "**Best-of-N needs a good scorer and beam search needs a PRM**, which 7.9 showed is expensive \u2014 self-consistency needs neither, which is why it is the accessible one.",
    "**Longer CoT is a trained capability**, so asking a non-reasoning model to think longer buys tokens rather than accuracy.",
    "**Route rather than enable globally** \u2014 and sample disagreement is itself a hardness signal, making escalation a measurement rather than a guess."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two tasks both show 60% single-sample accuracy. Voting over 8 samples gives 71.9% on one and 98.6% on the other. What differs?",
        options: [
          "The second task has a smaller answer space, making correct answers more likely",
          "Error structure \u2014 on the first, wrong answers all agree with each other; on the second they scatter across many distinct wrong answers",
          "The second task's samples were drawn at a higher temperature",
          "The first task's gold answers were ambiguous, causing scoring errors"
        ],
        answer: 1,
        why: "Self-consistency works by finding the plurality answer, so what matters is whether the 40% of failures concentrate on one wrong answer or spread out. Concentrated errors make the vote effectively 60-40 and voting adds little; scattered errors mean each wrong answer gets few votes while the correct one accumulates all of its own. This is why an accuracy figure alone cannot predict what voting will buy, and why distinct wrong answers per question is the measurement to take." },

      { stem: "The binomial probability of more than half of 4 samples being correct, for a 60% model, is 47.5% \u2014 below the single-sample 60%. Why is this not evidence that sampling hurts?",
        options: [
          "Because the binomial assumes independence, which does not hold for samples from one model",
          "Because self-consistency takes the plurality rather than the majority \u2014 an answer can win with 2 votes of 8 \u2014 so the majority calculation asks the wrong question",
          "Because 4 is an even number and ties are excluded from the calculation",
          "Because the binomial does not account for the temperature used during sampling"
        ],
        answer: 1,
        why: "A strict majority of 4 requires 3 or more, a harder bar than 1 of 1, which is why the majority model is non-monotone and predicts that adding samples hurts. Self-consistency picks whichever answer appears most often, which is a far weaker requirement \u2014 the simulated figure at n = 4 with five error modes is 80.5%, not 47.5%. The majority calculation is likely the origin of conservative published estimates, since it understates the technique by over 30 points." },

      { stem: "A model scores 20% on a hard slice and its errors are concentrated on one wrong answer. What does voting over 8 samples do?",
        options: [
          "Raises accuracy to about 35%, since sampling reduces variance",
          "Lowers accuracy to about 3% \u2014 the wrong answer is the modal answer, and voting finds the mode more reliably",
          "Leaves accuracy unchanged, since voting cannot add information",
          "Raises accuracy only if N exceeds the number of distinct answers"
        ],
        answer: 1,
        why: "Voting's job is to identify the most likely answer, so when the most likely answer is wrong, more samples identify it more confidently \u2014 accuracy falls from 20% to 3.0%. The crossover is at 50%, where voting is neutral, so the precondition is that the correct answer is already the modal single outcome. This matters practically because a model above 50% overall can be below it on a specific slice, and voting will then degrade that slice while improving the aggregate." },

      { stem: "Why is \u201caccuracy per unit cost\u201d a poor metric for choosing a test-time compute setting?",
        options: [
          "Because cost varies by provider, making the ratio incomparable",
          "Because accuracy is bounded at 1.0 while cost is not, so the ratio always favours doing less \u2014 a single sample wins it trivially",
          "Because it ignores latency, which is the real constraint",
          "Because accuracy is measured on a held-out set and cost in production"
        ],
        answer: 1,
        why: "Measured, a single sample scores 0.60 on that ratio against 0.12 for voting@8, which would argue for never spending anything \u2014 a conclusion the metric forces rather than discovers. The useful question is whether the marginal accuracy is worth the marginal cost at the accuracy level you actually require: if you need 90%, the single sample is not an option at any price. That requirement varies by request, which is why routing beats any global setting." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The second scaling axis, measured rather than assumed",
    questions: [
      { level: "core",
        q: "What is test-time compute and what are the main techniques?",
        strong: "A strong answer notes which techniques need extra machinery.",
        answer: [
          { t: "p", text: "Spending more compute at inference on the same model, rather than training a bigger one. Quality is roughly a function of training compute times a function of inference compute, and the second factor needs no retraining \u2014 which makes it the cheapest lever for anyone who did not train the model." },
          { t: "p", text: "Five main techniques. Longer chain-of-thought, which costs 2 to 20\u00d7 output tokens. Self-consistency \u2014 sample N, take the plurality \u2014 at N\u00d7. Best-of-N, picking the highest verifier or reward-model score. Beam search over reasoning steps with a process reward model. And self-refine, draft-critique-revise, at 2k\u00d7 for k rounds." },
          { t: "p", text: "Worth separating by what they require. Best-of-N needs a scorer good enough to rank candidates; beam search needs a process reward model, which is expensive because step-level annotation does not come free the way outcome checking does. Self-consistency needs neither, which is why it is the one most teams can apply immediately." },
          { t: "p", text: "And longer CoT is a trained capability rather than a prompting trick \u2014 asking a non-reasoning model to think longer buys tokens, not accuracy. That capability comes from the verifiable-reward training stage." }
        ] },

      { level: "advanced",
        q: "How would you decide whether self-consistency is worth it?",
        strong: "A strong answer measures error structure rather than reasoning from accuracy.",
        answer: [
          { t: "p", text: "By measuring the number nobody reports: distinct wrong answers per question. Accuracy alone does not determine what voting buys \u2014 I simulated a fixed 60% single-sample accuracy and vote@8 ranged from 71.9% when all errors agree to 98.6% when they are unique. A 27-point spread at identical accuracy." },
          { t: "p", text: "So one sampling run on a held-out set, counting how often the wrong answers coincide. With realistic scattering \u2014 around five modes \u2014 voting@8 reached 93.8% at 8\u00d7 cost against a big model at 85% for 20\u00d7, so it wins on both accuracy and cost rather than trading one for the other." },
          { t: "p", text: "I would also check it by slice rather than in aggregate, because the technique has a real failure mode. Below 50% base accuracy with concentrated errors, voting makes things worse \u2014 a 20% model drops to 3% over 8 votes, since the wrong answer is the modal answer and voting finds the mode more reliably. A model above 50% overall can be well below it on a sub-category." },
          { t: "p", text: "And I would not optimise accuracy per unit cost, because that ratio always favours a single sample \u2014 accuracy is bounded and cost is not. The real question is whether the marginal cost is worth it at the accuracy level the product requires, which differs per request and is why routing beats a global setting." }
        ] },

      { level: "core",
        q: "Should test-time compute be applied to every request?",
        strong: "A strong answer routes and knows how to detect hardness.",
        answer: [
          { t: "p", text: "No \u2014 it trades latency for accuracy, so it belongs on the hard tail of traffic. A cheap single pass for easy queries, verified sampling or longer reasoning for hard ones, with a router deciding. The bill is dominated by the fraction sent down the expensive path, so the router\u2019s precision is what determines cost." },
          { t: "p", text: "That is the same shape as any optional model call in a pipeline. In a retrieval system I measured the cross-encoder at 2,405 ms against 11 ms of actual retrieval \u2014 the expensive stages are always the ones you chose to add, and the right response is to add them selectively." },
          { t: "p", text: "The difficulty is that predicting whether a request is hard is itself a prediction, and being wrong in the cheap direction means a confident wrong answer. Self-consistency gives a way out: sample a few, and if they disagree the question was hard. That turns escalation into a measurement rather than a guess, at the cost of a few samples on every request." },
          { t: "p", text: "I would also watch the tie rate if voting. Ties are broken arbitrarily, so a high tie rate means a meaningful share of answers are coin flips presented as decisions \u2014 which is a signal that N is too small for the spread of answers the model produces." }
        ] }
    ]
  }
});
