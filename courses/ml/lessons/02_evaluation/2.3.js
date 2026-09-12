/* ============================================================================
   LESSON 2.3 — Thresholds, Costs and the Business Decision
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**A classifier does not make decisions; a threshold does, and 0.5 is a default nobody chose.** The same churn model flags 246 customers at a threshold of 0.05 and 13 at 0.50; every threshold between is a different number of calls made and churners missed, and only one of them is cheapest. This lesson sweeps the threshold on the held-out set, attaches a cost to each cell of the confusion matrix, and finds the operating point that minimises it — then shows that the threshold maximising F1 is not that point, on the churn table by £125 a month and on a fraud example by 68 %. It ends with the two questions that settle any metric argument: what does a false positive cost, and what does a false negative cost?",

  objectives: [
    "Sweep the threshold and read the confusion matrix, precision, recall and cost at each operating point",
    "Attach costs to the four cells, compute expected cost per threshold, and derive the break-even probability analytically",
    "Show why F1-maximisation, Youden's J and 'precision at recall ≥ x' each pick a different threshold and when each is appropriate",
    "Handle the budget-constrained case — score the top k — and explain when precision matters more than recall and when the reverse"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "The sweep", id: "sweep" },

    { t: "p", text: "Held-out set: 297 customers, 48 churners. The retention team's economics, agreed before modelling (1.2): **a call costs £5** in offer and agent time whether or not it was needed; **a lost churner costs £100**; a call to a genuine churner **saves them 40 % of the time**. So the cost at a threshold is £5 × (TP + FP) + £100 × (FN + 0.6 × TP)." },

    { t: "table",
      head: ["threshold", "TP", "FP", "FN", "TN", "precision", "recall", "F1", "flagged", "cost £"],
      rows: [
        ["0.05", "45", "201", "3", "48", "0.183", "0.938", "0.306", "246", "4,230"],
        ["0.10", "42", "140", "6", "109", "0.231", "0.875", "0.365", "182", "4,030"],
        ["**0.15**", "40", "99", "8", "150", "0.288", "0.833", "0.428", "139", "**3,895**"],
        ["0.20", "33", "70", "15", "179", "0.320", "0.688", "0.437", "103", "3,995"],
        ["**0.25**", "28", "40", "20", "209", "0.412", "0.583", "**0.483**", "68", "4,020"],
        ["0.30", "22", "27", "26", "222", "0.449", "0.458", "0.454", "49", "4,165"],
        ["0.35", "20", "19", "28", "230", "0.513", "0.417", "0.460", "39", "4,195"],
        ["0.40", "16", "14", "32", "235", "0.533", "0.333", "0.410", "30", "4,310"],
        ["0.50", "10", "3", "38", "246", "0.769", "0.208", "0.328", "13", "4,465"],
        ["0.70", "3", "0", "45", "249", "1.000", "0.062", "0.118", "3", "4,695"],
        ["≥ 0.80", "0", "0", "48", "249", "—", "0.000", "0.000", "0", "4,800"]
      ]
    },

    { t: "code", lang: "python", title: "What the table says (executed)",
      hl: [3, 4, 6, 7, 9],
      code: `# reference points
# do nothing:            48 churners lost                    cost 4,800
# call everyone:         297 calls, 40 % of 48 saved          cost 4,365      <- cheaper than doing nothing: calls are cheap here
# the model at 0.50:     13 calls, 10 churners reached        cost 4,465      <- WORSE than calling everyone. The default threshold loses money.
# the model at 0.15:     139 calls, 40 churners reached       cost 3,895      <- the minimum: 19 % cheaper than doing nothing
# the model at 0.25:     the maximum-F1 point (0.483)          cost 4,020      <- F1 chose a threshold that costs 125 more per month

# the analytic break-even: call a customer when the expected saving exceeds the call
#   p × (£100 × 0.4) > £5    ->    p > 5 / 40 = 0.125          the table's minimum at 0.15 is the nearest grid point`,
      caption: "Three things the default hid. The model at 0.5 is worse than the crudest policy, because at 0.5 it only flags 13 people. The best threshold is far below 0.5 because a call is cheap relative to a loss — the ratio of the costs sets the threshold, not the model. And F1, which knows nothing about pounds, picked a point £125 dearer. **The threshold is a property of the costs; the model only supplies the probabilities.**"
    },

    { t: "dl", items: [
      ["Operating point", "One threshold, one confusion matrix, one set of consequences. The thing you deploy."],
      ["Expected cost", "Σ over cells of (count × cost of that cell). Minimising it over thresholds is the whole decision when costs are known."],
      ["Break-even probability", "For a per-row decision with a fixed cost c of acting and a benefit b if the row is positive: act when p > c/b. The optimal threshold in closed form, if the probabilities are calibrated."],
      ["Youden's J", "TPR − FPR = recall + specificity − 1. Its maximum is the threshold that treats a missed positive and a false alarm as equally costly, per row of their class."],
      ["Precision at recall ≥ r", "Fix the share of positives you must catch; take the highest threshold that achieves it. The screening formulation."],
      ["Recall at precision ≥ p", "Fix the reliability a flag must have; take the lowest threshold that achieves it. The auto-action formulation."],
      ["Top-k", "Flag the k highest-scored rows, where k is a budget. The threshold is whatever score the k-th row has; it moves with the population."],
      ["Cost-sensitive learning", "Building the costs into training via class weights or a weighted loss, so the model's probabilities are already tilted (8.2). Different from thresholding, and combinable with it."]
    ]},

    { t: "h2", n: "02", text: "Four rules, four thresholds", id: "rules" },

    { t: "code", lang: "python", title: "The same model, four ways to choose the threshold (executed)",
      hl: [2, 5, 8, 11, 14],
      code: `# minimum expected cost (£5 call, £100 loss, 40 % save rate)
threshold 0.15    139 flagged    recall 0.833   precision 0.288   cost 3,895

# maximum F1
threshold 0.25     68 flagged    recall 0.583   precision 0.412   cost 4,020      <- treats a missed churner and a wasted call as equally bad

# Youden's J (TPR - FPR), from the ROC curve
threshold 0.164   J = 0.476     TPR 0.833   FPR 0.357                              <- close to the cost optimum here, by coincidence of the cost ratio

# highest threshold with recall >= 0.80 (the screening rule)
threshold 0.15    precision 0.288                                                  <- the same point again: the recall floor happens to coincide

# lowest threshold with precision >= 0.50 (the auto-action rule)
threshold 0.35    recall 0.417                                                     <- if every flag triggered an automatic discount, this is the point

# a budget: the team can call 10 % of the base (29 customers)
top 29 by score    16 churners caught of 48    recall 0.333   precision 0.552    implied threshold 0.403`,
      caption: "Six defensible thresholds between 0.15 and 0.40, each right for a different question. Cost-minimisation is right when the costs are known; the recall floor when a miss is the disaster and the budget is elastic; the precision floor when a flag acts automatically; the budget when capacity is fixed. Youden and F1 are right only when the two errors genuinely cost the same — which is the assumption nobody states and almost nobody means."
    },

    { t: "viz",
      title: "Cost against threshold, with the rules marked",
      caption: "The cost curve is flat-bottomed near 0.15 and climbs steeply past 0.4 as the model stops flagging. F1's maximum sits to the right of the cost minimum; the 0.5 default is on the expensive slope, above 'call everyone'.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A line chart of monthly cost against threshold from 0.05 to 0.8. The curve dips to a minimum near 0.15 and rises to 4800 at 0.8. Horizontal reference lines for do-nothing at 4800 and call-everyone at 4365. Markers for the cost minimum at 0.15, the F1 maximum at 0.25 and the default 0.5.">
  <defs>
    <marker id="ac-ah-23" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="80" y1="250" x2="840" y2="250" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-23)"/>
  <line x1="80" y1="250" x2="80" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-23)"/>
  <g class="s-sub" text-anchor="middle">
    <text x="130" y="270">0.05</text><text x="230" y="270">0.15</text><text x="330" y="270">0.25</text><text x="480" y="270">0.40</text><text x="580" y="270">0.50</text><text x="780" y="270">0.70</text>
    <text x="460" y="292">threshold</text>
  </g>
  <g class="s-sub" text-anchor="end">
    <text x="72" y="60">4,800</text><text x="72" y="118">4,400</text><text x="72" y="176">4,000</text><text x="72" y="234">3,600</text>
  </g>
  <!-- y = 250 - (cost-3600)/1200*190 ; 3895 -> 203, 4030 -> 182, 4230 -> 150, 3995 -> 187, 4020 -> 183, 4165 -> 160, 4195 -> 156, 4310 -> 138, 4300->139, 4465 -> 113, 4565 -> 97, 4665 -> 81, 4700 -> 76, 4695->77, 4730 -> 71, 4800 -> 60 -->
  <line x1="80" y1="60" x2="840" y2="60" style="stroke:var(--crit)" stroke-width="1" stroke-dasharray="5 4"/>
  <line x1="80" y1="129" x2="840" y2="129" style="stroke:var(--warn)" stroke-width="1" stroke-dasharray="5 4"/>
  <polyline points="130,150 180,182 230,203 280,187 330,183 380,160 430,156 480,138 530,139 580,113 630,97 680,81 730,76 780,77 830,60" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>
  <circle cx="230" cy="203" r="6" style="fill:var(--good)"/>
  <circle cx="330" cy="183" r="6" style="fill:var(--warn)"/>
  <circle cx="580" cy="113" r="6" style="fill:var(--crit)"/>
  <g class="s-sub">
    <text x="600" y="55" style="fill:var(--crit)">do nothing: 4,800</text>
    <text x="600" y="124" style="fill:var(--warn)">call everyone: 4,365</text>
    <text x="150" y="225" style="fill:var(--good)">cost minimum 0.15: 3,895</text>
    <text x="345" y="178" style="fill:var(--warn)">F1 maximum 0.25: 4,020</text>
    <text x="595" y="108" style="fill:var(--crit)">default 0.50: 4,465</text>
  </g>
</svg>`
    },

    { t: "h2", n: "03", text: "When precision matters, when recall matters, and when F1 lies", id: "when" },

    { t: "code", lang: "python", title: "A fraud example: card declines, 10,000 transactions, 100 frauds (executed on a synthetic scorer)",
      hl: [3, 4, 5, 6],
      code: `# a false decline annoys a good customer: cost 10.   a missed fraud: cost 500.
#   t      TP   FP    FN    precision   recall    F1        cost
#   0.50   88   642   12      0.121     0.880    0.212     12,420      <- cheapest by far: 642 annoyed customers, 12 frauds through
#   0.70   59    35   41      0.628     0.590    0.608     20,850      <- the F1 maximum: 68 % more expensive than the cheapest point
#   0.85   23     0   77      1.000     0.230    0.374     38,500      <- perfect precision, three quarters of the fraud through
#   0.95    2     0   98      1.000     0.020    0.039     49,000`,
      caption: "F1 picked 0.70 because it weighs a false decline and a missed fraud equally, and here they differ fifty-fold. At the cost optimum the precision is 0.12 — eight of nine declines are wrong — and that is correct, because the ninth decline prevents a £500 loss for £80 of annoyance. **When someone says precision is low, the question is not 'how do we raise it' but 'what does a false positive cost'.** If the answer were 'a lost customer worth £2,000', the table would flip."
    },

    { t: "table",
      head: ["Situation", "Error that dominates", "Metric to fix", "Example threshold rule"],
      rows: [
        ["Screening for a serious, treatable condition", "A miss is a harm; a false alarm is a follow-up test", "Recall (sensitivity)", "Highest threshold with recall ≥ 0.95; report precision there"],
        ["Auto-declining a card, auto-suspending an account", "A false positive acts on a good customer with no human check", "Precision", "Lowest threshold with precision ≥ 0.9; route the rest to review"],
        ["Retention calls, marketing offers", "Both are money; a cost model exists", "Expected cost", "Minimise cost; the break-even p = c / b"],
        ["A review queue with fixed staff", "Neither — capacity is the constraint", "Precision at the top k", "Top k by score; report recall achieved"],
        ["Spam filtering", "A lost real email is worse than a spam that gets through", "Precision on 'spam'", "High threshold; let doubtful mail through"],
        ["No cost model and both errors matter", "Unknown", "F1 or F-beta, honestly labelled as a guess about equal costs", "Max F-beta with β chosen to reflect the guessed ratio"]
      ]
    },

    { t: "callout", kind: "trap", title: "The threshold assumes calibrated probabilities and a stable population", body: [
      { t: "p", text: "The break-even rule p > c/b only works if p means what it says: a model that outputs 0.15 for customers who churn 30 % of the time has its threshold in the wrong place by a factor of two. Check calibration (2.5) before using probabilities in arithmetic; and remember that a threshold chosen on one month's base rate moves the flagged count when the base rate moves (11.1). **A budget-based top-k rule is robust to both problems**, at the cost of not knowing what recall it will achieve until afterwards." }
    ]},

    { t: "ladder",
      title: "Someone asks: 'should we use precision or recall for this model?'",
      rungs: [
        { level: "bad", label: "'Recall, because missing churners is bad'", code: `threshold = argmax recall  ->  flag everyone`,
          note: "**Recall alone is maximised by flagging every row.** A metric with no counterweight chooses a degenerate threshold." },
        { level: "ok", label: "'F1, to balance them'", code: `threshold = argmax F1  ->  0.25, cost 4,020`,
          note: "**A balance, but at a ratio nobody chose.** F1's implicit assumption is that the two mistakes cost the same per row." },
        { level: "best", label: "Ask the two questions, then compute", code: `# what does a false positive cost?  a £5 call.     what does a false negative cost?  a £100 loss, 40 % recoverable.
threshold = argmin expected cost  ->  0.15, cost 3,895        # and report precision and recall at that point`,
          note: "**The costs choose the threshold and the metrics describe it.** If the costs are unknown, say so and use the budget or a recall floor — not a metric that hides the assumption." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Cost curves for two cost structures",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Using the churn model's held-out probabilities, build the threshold sweep with expected cost for two economies: **(i)** the lesson's (£5 call, £100 loss, 40 % save rate); **(ii)** a premium product where a call costs £40 (a human account manager) and a loss costs £150 with a 60 % save rate. For each, report the cost-minimising threshold, the analytic break-even p = c / (b × save rate), the F1-maximising threshold and its cost penalty, and the flagged count. Then add the calibration check: bin the probabilities into deciles and compare the mean predicted probability with the observed churn rate per bin — and state whether the analytic threshold can be trusted." }
      ],
      requirements: [
        "Two cost columns in one sweep table.",
        "Analytic break-even for each economy compared with the grid minimum.",
        "The F1 penalty in pounds for each economy.",
        "A decile calibration table and a one-line verdict."
      ],
      hint: "Economy (ii)'s break-even is 40 / (150 × 0.6) = 0.444 — the optimum moves to the right of the F1 point, and the model at 0.5 becomes reasonable. For the calibration table, `pd.qcut(p, 10)` then `groupby` with mean of p and mean of y.",
      solution: {
        lang: "python",
        title: "two_economies.py",
        code: `def cost(tp, fp, fn, c_call, c_loss, save):
    return c_call * (tp + fp) + c_loss * (fn + tp * (1 - save))

rows = []
for t in np.arange(0.05, 0.96, 0.05):
    pred = (p >= t).astype(int); tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    P = tp / (tp + fp) if tp + fp else 0; R = tp / (tp + fn); F = 2 * P * R / (P + R) if P + R else 0
    rows.append(dict(t=round(t, 2), flagged=tp + fp, precision=P, recall=R, f1=F,
                     cost_i=cost(tp, fp, fn, 5, 100, 0.4), cost_ii=cost(tp, fp, fn, 40, 150, 0.6)))
sweep = pd.DataFrame(rows)
for econ, c_call, c_loss, save in [("i", 5, 100, 0.4), ("ii", 40, 150, 0.6)]:
    best = sweep.loc[sweep["cost_" + econ].idxmin()]; f1_row = sweep.loc[sweep.f1.idxmax()]
    print(econ, "min-cost t", best.t, "cost", best["cost_" + econ], "flagged", best.flagged,
          "| break-even", round(c_call / (c_loss * save), 3),
          "| F1 t", f1_row.t, "F1 penalty", f1_row["cost_" + econ] - best["cost_" + econ])
# executed:
# economy i:  min-cost t 0.15 (cost 3,895, 139 flagged)   break-even 0.125   F1 at 0.25 costs +125
# economy ii: min-cost t 0.45 (cost 6,650,  20 flagged)   break-even 0.444   F1 at 0.25 costs +750: 68 expensive calls to reach 28 churners

# calibration by decile
cal = pd.DataFrame({"p": p, "y": y}); cal["bin"] = pd.qcut(cal.p, 10, duplicates="drop")
print(cal.groupby("bin").agg(mean_p=("p", "mean"), rate=("y", "mean"), n=("y", "size")))
#   decile of p       mean p   observed rate   n
#   0.00-0.03          0.012       0.000       30
#   0.03-0.06          0.044       0.100       30
#   0.06-0.08          0.068       0.000       29
#   0.08-0.10          0.092       0.100       30
#   0.10-0.14          0.116       0.033       30
#   0.14-0.18          0.158       0.207       29
#   0.18-0.22          0.200       0.167       30
#   0.22-0.28          0.244       0.138       29
#   0.28-0.40          0.326       0.333       30
#   0.40-0.78          0.512       0.533       30
# verdict: the observed rates track the mean predictions across the range within the sampling noise of ~30 rows per bin
# (one churner is 3.3 points), with no systematic over- or under-confidence -- so the break-even threshold can be applied to
# the probabilities directly, and indeed the grid minimum landed within one step of the formula in both economies. A model that was
# systematically off would need calibrating first (2.5), or the threshold taken from the empirical sweep rather than the formula.`,
        notes: [
          { t: "p", text: "**The same model, two economies, two thresholds three grid steps apart.** Nothing about the model changed; the costs did. This is why the threshold belongs in the problem definition, not in the model's code." },
          { t: "p", text: "**The break-even formula matched the grid minimum within one step in both economies** — but only because the model is roughly calibrated. The decile table is the check that earns the formula." },
          { t: "p", text: "**F1's penalty differs by economy** and is always non-negative: F1 can only coincide with the cost optimum by accident." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "At the default threshold of 0.5 the churn model cost £4,465 a month — more than calling every customer (£4,365). What went wrong?",
          options: [
            "The model is worse than random",
            "Nothing about the model: at 0.5 it flags only 13 customers because a £5 call against a £100 loss makes the break-even probability 0.125, far below 0.5. The default threshold ignores the costs; the model's ranking is fine",
            "The costs are wrong",
            "The test set is too small"
          ],
          answer: 1,
          why: "The same model at 0.15 cost £3,895. A threshold is a decision rule, and 0.5 encodes the decision that both errors cost the same."
        }
      ]
    }
  ],

  takeaways: [
    "**0.5 is a default nobody chose**; it encodes 'both errors cost the same', which is almost never true.",
    "**The cost-minimising threshold comes from the costs**: the break-even p = c / (b × save rate) — 0.125 here, so the model at 0.5 lost to calling everyone.",
    "**Attach a cost to each cell of the confusion matrix and sweep**: the minimum is the operating point to deploy.",
    "**F1 picks a different threshold** — £125 dearer on churn, 68 % dearer on fraud — because it assumes equal costs.",
    "**Youden's J assumes equal per-class error costs too**; it coincided with the optimum here by accident of the cost ratio.",
    "**Recall floor for screening; precision floor for auto-actions; top-k for fixed budgets; expected cost when costs are known.**",
    "**When precision matters: a false positive acts on an innocent row without review. When recall matters: a miss is the harm.**",
    "**Ask the two questions** — what does a false positive cost, what does a false negative cost — before choosing any metric.",
    "**The break-even rule needs calibrated probabilities** and a stable base rate; top-k is robust to both.",
    "**The costs choose the threshold; the metrics describe it.**"
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why can F1 select the most expensive threshold?",
        options: [
          "F1 is computed incorrectly",
          "F1 is the harmonic mean of precision and recall and weighs a false positive and a false negative equally per row; when their costs differ — £5 against £100, or 10 against 500 — the F1-optimal point sits wherever the two rates balance, not where the money does",
          "F1 ignores true negatives",
          "F1 always favours recall"
        ],
        answer: 1,
        why: "On the fraud example F1 chose 0.70 at cost 20,850 against 12,420 at 0.50. Ignoring true negatives is a separate, real limitation of F1 but not the reason here."
      },
      {
        stem: "A fraud team says precision is only 0.12 and wants a higher threshold. What is the right response?",
        options: [
          "Raise the threshold until precision is 0.5",
          "Ask what a false decline costs against a missed fraud: at 10 against 500, the 0.12-precision threshold is the cost minimum, and raising it to reach precision 0.63 would cost 68 % more; low precision is correct when a false positive is cheap and a miss is dear",
          "Retrain the model",
          "Switch to recall"
        ],
        answer: 1,
        why: "Precision is a description, not a target. The target is the cost, and the costs here make many cheap false alarms the right policy."
      },
      {
        stem: "When is a top-k budget rule preferable to a probability threshold?",
        options: [
          "Never; thresholds are more principled",
          "When capacity is fixed (a team can review k cases), when the probabilities are not trusted to be calibrated, or when the base rate drifts — top-k always produces k flags, whereas a threshold's flagged count moves with the population",
          "When the model is very accurate",
          "When recall must be 1"
        ],
        answer: 1,
        why: "Top-k trades a known volume for an unknown recall; a threshold trades a known probability cut for an unknown volume. Which unknown you can live with is a business question."
      },
      {
        stem: "The break-even rule says act when p > c/b. What must be true of p for this to be valid?",
        options: [
          "p must be above 0.5",
          "p must be calibrated — a predicted 0.15 must correspond to about 15 % of such customers churning — otherwise the arithmetic is on a number that does not mean what it claims; check with a reliability table before using the formula",
          "p must be from a logistic regression",
          "p must be rounded"
        ],
        answer: 1,
        why: "AUC-optimal scores can be badly calibrated (2.5). The empirical cost sweep sidesteps this; the formula does not."
      },
      {
        stem: "A cancer screening programme sets its threshold for recall ≥ 0.95. What does the resulting precision tell the programme?",
        options: [
          "That the model is bad",
          "How many follow-up tests per true case the programme has committed to — the operational cost of the recall target — which it reports alongside so the trade is explicit, not hidden in a single metric",
          "Nothing useful",
          "That the threshold should be raised"
        ],
        answer: 1,
        why: "Fixing one metric makes the other a consequence to be reported, not a failure to be fixed. Both numbers, in the programme's units."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you choose the classification threshold?",
        strong: "From the costs, not from the model. If a false positive and a false negative have known costs, I sweep the threshold on the validation set, compute expected cost per threshold from the confusion-matrix cells, and deploy the minimum; the analytic version is to act when the probability exceeds the cost of acting over the benefit if positive, which requires calibrated probabilities. If costs are unknown but one error is clearly the disaster, I fix a floor on the corresponding rate — recall for screening, precision for automatic actions — and report the other rate at that point. If the constraint is capacity, I flag the top k. Only when both errors matter and I have no cost model do I fall back to maximising F1 or F-beta, and I say explicitly that it assumes a cost ratio. On a churn model the cost-optimal threshold was 0.15 and the default 0.5 lost money against calling everyone.",
        answer: [
          { t: "p", text: "Cost first, then floors, then budgets, then F1 as a labelled fallback — and the executed example of 0.5 being wrong." }
        ]
      },
      {
        level: "core",
        q: "Explain the precision–recall trade-off with a real example.",
        strong: "Lowering a threshold flags more rows: it catches more positives, so recall rises, but it also sweeps in more negatives, so precision falls. On a churn model, going from 0.5 to 0.15 raised recall from 0.21 to 0.83 and cut precision from 0.77 to 0.29 — the retention team calls ten times as many people to reach four times as many churners. Which point is right depends on what a wasted call and a lost customer cost: at £5 against £100 the low-precision point is the cheaper one by a wide margin. The mistake is to treat the trade-off as a property of the model to be optimised in the abstract; it is a menu of operating points and the business picks one.",
        answer: [
          { t: "p", text: "Mechanism, executed numbers, and the reframing from 'optimise' to 'choose'." }
        ]
      },
      {
        level: "advanced",
        q: "A stakeholder wants a single metric to track. What do you give them?",
        strong: "I would push back once, then give them the expected cost at the deployed operating point in their own units — pounds per month, or missed cases per thousand — because that is the only number that already contains the cost trade-off and cannot be gamed by moving the threshold. If they insist on a model-quality number independent of the operating point, PR-AUC for a rare class or ROC-AUC for a balanced one, with the caveat that it will not move when the threshold is changed and does not by itself say whether the deployment is working. What I would not give them is accuracy, which a constant predictor wins at 84 %, or F1, which assumes a cost ratio nobody agreed to. And whichever number goes on the dashboard, the confusion matrix at the operating point goes next to it, in counts, because that is what they will ask about when the number moves.",
        answer: [
          { t: "p", text: "Cost in their units, PR-AUC as the model-quality fallback, the matrix beside it, and the two numbers refused with reasons." }
        ]
      }
    ]
  }
});
