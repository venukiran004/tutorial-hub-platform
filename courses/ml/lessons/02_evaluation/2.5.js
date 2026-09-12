/* ============================================================================
   LESSON 2.5 — Calibration
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "**A model is calibrated when the rows it scores 0.7 are positive seven times in ten.** Nothing about ranking quality guarantees it: a random forest with AUC 0.916 in this lesson scores a block of rows at 0.55 that turn out positive 86 % of the time. That matters the moment a probability is used as a number — an expected-cost threshold, a ranked budget, a risk shown to a person — and it does not matter at all if only the ordering is used. This lesson builds reliability tables for five model families, computes expected calibration error, decomposes the Brier score, fixes the forest with Platt scaling and isotonic regression on a held-out fold, and shows the cost of using an uncalibrated probability in a break-even formula: £4,335 against £3,870.",

  objectives: [
    "Build a reliability table and diagram, compute expected calibration error, and read over-confidence, under-confidence and an S-curve",
    "Know which model families are calibrated out of the box and why forests, boosters, SVMs and Naive Bayes are not",
    "Apply Platt scaling and isotonic regression on a held-out fold, and say when each is appropriate",
    "Decompose the Brier score into reliability, resolution and uncertainty, and distinguish discrimination from calibration"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Reliability tables for five models", id: "tables" },

    { t: "p", text: "A synthetic 12-feature problem at 21.6 % prevalence, 3,000 training rows, 1,000 held for calibration, 2,000 for testing — large enough that a bin of predictions has a stable observed rate. **Bin the predicted probabilities into tenths; in each bin compare the mean prediction with the observed positive rate.** A calibrated model's two columns match; the diagram of one against the other lies on the diagonal." },

    { t: "code", lang: "text", title: "Five families, one test set (executed)",
      code: `model               AUC     Brier    log-loss   ECE     mean p / observed rate
logistic            0.658   0.1564   0.4941     0.034    0.218 / 0.216       <- poor ranker on this non-linear problem; well calibrated
random forest       0.916   0.0826   0.3086     0.070    0.222 / 0.216       <- best ranker; worst calibration
gbdt, 300 rounds    0.894   0.0891   0.3037     0.015    0.213 / 0.216
naive bayes         0.687   0.1522   0.4929     0.055    0.218 / 0.216
svm, rbf + Platt    0.911   0.0780   0.2741     0.015    0.216 / 0.216       <- SVC(probability=True) is already Platt-scaled internally

ECE = Σ_bins (n_bin / n) · | mean prediction - observed rate |          the weighted average gap between the two columns`,
      caption: "Discrimination and calibration are separate axes. The forest ranks best and is the worst calibrated; the logistic regression ranks badly here and is nearly perfectly calibrated. The average prediction matches the base rate for every model — 'calibration in the large' — so the problem is not a global offset but the shape of the curve, which only the table shows."
    },

    { t: "code", lang: "text", title: "The tables themselves — logistic, random forest, Naive Bayes (executed)",
      code: `bin       logistic: n  mean p  rate     forest: n  mean p  rate      naive bayes: n  mean p  rate
0.0-0.1     320   0.075  0.144           813   0.046  0.026             657   0.056  0.126
0.1-0.2     771   0.147  0.140           469   0.143  0.066             556   0.144  0.156
0.2-0.3     471   0.245  0.208           243   0.244  0.169             328   0.246  0.207
0.3-0.4     248   0.343  0.359           107   0.349  0.299             161   0.342  0.242
0.4-0.5     104   0.445  0.327            78   0.448  0.526             108   0.443  0.370
0.5-0.6      45   0.545  0.533            69   0.554  0.855              64   0.542  0.438
0.6-0.7      26   0.636  0.769            74   0.656  0.959              32   0.649  0.656
0.7-0.8      12   0.742  0.917            61   0.746  0.869              34   0.756  0.529
0.8-0.9       2   0.828  1.000            43   0.849  0.977              29   0.856  0.793
0.9-1.0       1   0.909  1.000            43   0.935  0.977              31   0.954  0.839`,
      caption: "Read the forest's column: below 0.4 it says more than it should (0.143 predicted, 0.066 observed), above 0.5 it says less (0.554 predicted, 0.855 observed) — an S-curve. That is the signature of averaging many trees: individual trees vote 0 or 1, and the average is pulled toward the middle, so the forest is under-confident at the extremes. Naive Bayes shows the opposite at the top: 0.954 predicted, 0.839 observed — over-confidence from multiplying probabilities that were assumed independent and are not. Logistic regression's small bins wobble (two rows in 0.8–0.9), but its populated bins sit on the diagonal."
    },

    { t: "dl", items: [
      ["Calibration", "Among rows predicted p, the positive rate is p. A property of the probabilities, not of the ranking."],
      ["Discrimination", "How well the scores separate positives from negatives — AUC. Independent of calibration: any monotone transform preserves it."],
      ["Reliability diagram", "Mean predicted probability against observed rate, per bin. The diagonal is perfect; above it under-confident, below it over-confident."],
      ["Expected calibration error (ECE)", "The bin-weighted average absolute gap between predicted and observed. Depends on the binning; ten equal-width bins is the convention."],
      ["Platt scaling", "Fit a logistic regression of the label on the model's score (or logit) on a held-out fold: two parameters, a sigmoid. Right for S-shaped or monotone-offset miscalibration with few calibration rows."],
      ["Isotonic regression", "Fit a non-decreasing step function from score to probability on a held-out fold. Flexible, needs thousands of rows, can overfit and produce ties."],
      ["Brier decomposition", "Brier = reliability − resolution + uncertainty: calibration gap, how much the bins' rates spread from the base rate, and the base rate's own variance."],
      ["Temperature scaling", "Platt scaling with the offset fixed at zero: divide the logits by one learned constant. The standard fix for over-confident neural networks."]
    ]},

    { t: "h2", n: "02", text: "Why each family is or is not calibrated", id: "families" },

    { t: "table",
      head: ["Family", "Typical shape", "Why", "Fix"],
      rows: [
        ["Logistic regression", "Calibrated", "Trained on log loss, a proper score; the sigmoid outputs are probabilities by construction (4.5)", "Usually none; regularisation can flatten slightly"],
        ["Random forest", "S-curve: under-confident at both ends", "Averaging 0/1 votes pulls toward the middle; never reaches 0 or 1 unless every tree agrees", "Platt or isotonic"],
        ["Gradient boosting", "Mildly off; over-confident if run long, under-confident if stopped early", "Trained on log loss, so reasonable; but the additive logit can overshoot", "Check; Platt if needed"],
        ["Naive Bayes", "Over-confident at the extremes", "Multiplies conditional probabilities as if independent; correlated features count several times (5.2)", "Isotonic or Platt"],
        ["SVM", "No probabilities at all", "The decision function is a margin distance, not a likelihood", "Platt scaling — what `probability=True` does, with internal CV"],
        ["Neural networks", "Over-confident, more so when deep and trained long", "Cross-entropy pushes logits apart without bound; the softmax saturates", "Temperature scaling"],
        ["KNN", "Coarse: probabilities are fractions of k", "With k = 5 the only outputs are 0, 0.2, …, 1", "Larger k; isotonic"]
      ]
    },

    { t: "code", lang: "python", title: "Fixing the forest and Naive Bayes on the 1,000-row calibration fold (executed)",
      hl: [2, 3, 7, 8, 11, 12],
      code: `from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator                       # the fitted model is frozen; only the calibrator learns
cal = CalibratedClassifierCV(FrozenEstimator(forest), method="sigmoid").fit(X_cal, y_cal)     # or method="isotonic"

#                                 AUC      Brier     log-loss    ECE
# random forest, raw             0.916    0.0826    0.3086     0.070
# random forest, Platt           0.916    0.0729    0.2601     0.016     <- Brier down 12 %, log-loss down 16 %, AUC unchanged
# random forest, isotonic        0.916    0.0753    0.3125     0.019
# naive bayes, raw               0.687    0.1522    0.4929     0.055
# naive bayes, Platt             0.687    0.1482    0.4691     0.017
# gbdt, raw                      0.894    0.0891    0.3037     0.015     <- already calibrated; Platt changes nothing (0.0892)

# CalibratedClassifierCV(model, cv=5) without FrozenEstimator does the same thing with cross-fitting, when there is no spare fold`,
      caption: "AUC is unchanged in every row because calibration is a monotone transform of the scores. Platt beat isotonic here on 1,000 calibration rows — the forest's S-curve is exactly a sigmoid's shape, and isotonic's extra freedom cost it a little in log loss. With ten thousand calibration rows and a stranger curve, isotonic usually wins. **Never calibrate on the training rows**: the forest predicts its own training set perfectly, so the calibrator would learn that 0.9 means 1.0."
    },

    { t: "viz",
      title: "Reliability diagram: the forest before and after Platt scaling",
      caption: "The raw forest's curve is an S around the diagonal — above it at the top (under-confident), below it at the bottom (over-confident). Platt scaling maps scores through a fitted sigmoid and straightens the S. The ranking, and therefore AUC, is untouched.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="A reliability diagram with the diagonal, the random forest's S-shaped curve of observed rate against predicted probability, and the Platt-scaled curve lying close to the diagonal.">
  <defs>
    <marker id="ac-ah-25" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="120" y1="280" x2="600" y2="280" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-25)"/>
  <line x1="120" y1="280" x2="120" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-25)"/>
  <line x1="120" y1="280" x2="580" y2="50" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="5 4"/>
  <g class="s-sub" text-anchor="middle">
    <text x="120" y="298">0</text><text x="350" y="298">0.5</text><text x="580" y="298">1.0</text>
    <text x="350" y="314">mean predicted probability</text>
    <text x="90" y="285">0</text><text x="90" y="170">0.5</text><text x="90" y="55">1.0</text>
    <text x="60" y="160" transform="rotate(-90 60 160)">observed rate</text>
  </g>
  <!-- x = 120 + 460*p ; y = 280 - 230*rate -->
  <polyline points="141,274 186,265 232,241 281,211 326,159 375,83 422,59 463,80 511,55 550,55" fill="none" style="stroke:var(--crit)" stroke-width="2.4"/>
  <g style="fill:var(--crit)"><circle cx="141" cy="274" r="3"/><circle cx="186" cy="265" r="3"/><circle cx="232" cy="241" r="3"/><circle cx="281" cy="211" r="3"/><circle cx="326" cy="159" r="3"/><circle cx="375" cy="83" r="3"/><circle cx="422" cy="59" r="3"/><circle cx="463" cy="80" r="3"/><circle cx="511" cy="55" r="3"/><circle cx="550" cy="55" r="3"/></g>
  <path d="M141,272 C230,235 330,150 420,95 C470,65 530,52 560,50" fill="none" style="stroke:var(--good)" stroke-width="2.4"/>
  <g class="s-label" style="font-weight:600">
    <text x="640" y="80" style="fill:var(--crit)">raw forest · ECE 0.070</text>
    <text x="640" y="104" style="fill:var(--good)">Platt-scaled · ECE 0.016</text>
    <text x="640" y="128" style="fill:var(--ink-3)">diagonal · perfect</text>
  </g>
  <g class="s-sub">
    <text x="640" y="170">below the diagonal: over-confident</text>
    <text x="640" y="188">(says 0.14, delivers 0.07)</text>
    <text x="640" y="216">above the diagonal: under-confident</text>
    <text x="640" y="234">(says 0.55, delivers 0.86)</text>
  </g>
</svg>`
    },

    { t: "h2", n: "03", text: "The Brier decomposition, and when calibration matters", id: "brier" },

    { t: "code", lang: "text", title: "Brier = reliability − resolution + uncertainty, for the raw forest (executed)",
      code: `reliability   Σ_bins (n_b/n) (mean p_b - rate_b)²          = 0.0100      the calibration gap, squared and weighted: what Platt removes
resolution    Σ_bins (n_b/n) (rate_b - base rate)²           = 0.0968      how far the bins' observed rates spread from 0.216: the model's ability to separate
uncertainty   base rate × (1 - base rate) = 0.216 × 0.784    = 0.1696      the variance of the label itself: no model can touch it

Brier = 0.0100 - 0.0968 + 0.1696 = 0.0828        (measured directly: 0.0826; the difference is binning)`,
      caption: "The decomposition says what a proper score measures: a floor set by the problem (uncertainty), a credit for separating the classes (resolution — the same thing AUC rewards, in different units), and a penalty for the probabilities being wrong (reliability). Calibration attacks the third term only; a better model raises the second; nothing lowers the first. The forest's Brier is dominated by resolution, which is why it is a good model with a fixable flaw."
    },

    { t: "code", lang: "python", title: "The cost of an uncalibrated probability in the break-even formula (executed)",
      hl: [3, 4, 5],
      code: `# costs: a false positive £5, a false negative £40 -> act when p > 5 / 40 = 0.125 (2.3), if p is a probability
#                       cost at the formula's threshold 0.125     best cost over a fine threshold sweep, and where
# raw forest                     £4,335                                  £3,680  at 0.19
# Platt-scaled forest            £3,870                                  £3,690  at 0.10
# the raw forest's 0.125 is not a probability of 0.125 -- it delivers about 0.07 -- so the formula flags far too many rows;
# after scaling the formula lands within 5 % of the sweep's minimum. The sweep itself does not need calibration; the formula does.`,
      caption: "If the operating point is chosen by sweeping thresholds on validation data, calibration is irrelevant — the sweep finds the best cut whatever the scores mean. If it is chosen by a formula, by a probability shown to a user, by ranking across models, or by expected-value arithmetic (offer value × probability), the probabilities must mean what they say. The ladder in 2.3 and the decision below follow from that."
    },

    { t: "table",
      head: ["Use of the score", "Calibration needed?", "Why"],
      rows: [
        ["Rank rows and act on the top k", "No", "Only the ordering is used"],
        ["Threshold chosen by validation sweep", "No", "The sweep is on the empirical outcomes, whatever the scores mean"],
        ["Threshold from a cost formula p > c/b", "Yes", "The formula treats p as a probability"],
        ["Expected value: p × revenue", "Yes", "Arithmetic on p"],
        ["Show 'risk 73 %' to a clinician or customer", "Yes", "A person will act on the number as a probability"],
        ["Combine scores from several models, or across time", "Yes", "Uncalibrated scores from different models are not on the same scale"],
        ["Compare two models by AUC", "No", "AUC is invariant to calibration"],
        ["Feed the score into a downstream model", "Usually", "Downstream arithmetic assumes a scale"]
      ]
    },

    { t: "callout", kind: "trap", title: "Resampling and class weights break calibration on purpose", body: [
      { t: "p", text: "Training with `class_weight='balanced'` or after SMOTE makes the model behave as if positives were half the data; its probabilities are then calibrated to that imaginary base rate, not the real one — every score is inflated. That is fine for ranking and for a validation-swept threshold, and wrong for any formula. **If you resample or reweight for training, recalibrate on unresampled data afterwards** (8.2), or shift the logits back analytically." }
    ]},

    { t: "ladder",
      title: "A model's probabilities will drive an expected-value offer engine",
      rungs: [
        { level: "bad", label: "Use the forest's predict_proba directly", code: `expected_value = model.predict_proba(X)[:, 1] * offer_value        # the 0.55 bin delivers 0.86`,
          note: "**Every expected value is wrong by the calibration gap**, and in a different direction at each end of the scale." },
        { level: "ok", label: "Calibrate on a held-out fold, check the table", code: `cal = CalibratedClassifierCV(FrozenEstimator(model), method="sigmoid").fit(X_cal, y_cal)   # ECE 0.070 -> 0.016`,
          note: "**Probabilities now mean what they say on this population.** They will drift as the base rate does." },
        { level: "best", label: "Calibrate, monitor the reliability table in production, recalibrate on a schedule", code: `# monthly: recompute the ten-bin table on scored rows whose labels have arrived; alert when ECE > 0.03;
# refit the calibrator (cheap) more often than the model (expensive)`,
          note: "**Calibration is a property of model + population**, and populations move. The calibrator is the cheapest part of the pipeline to refresh (11.1)." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Calibrate the churn model's random forest",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Train a 300-tree random forest on the churn table with the usual preprocessing, using 5-fold cross-fitted calibration (`CalibratedClassifierCV(model, cv=5)` with method sigmoid and isotonic) so that no separate fold is needed. On the held-out 297 rows report, for raw, sigmoid and isotonic: AUC, Brier, log loss, ECE with five bins (the set is small), and the reliability table. Then use each version's probabilities in the 2.3 break-even rule (£5 call, £100 loss, 40 % save rate → 0.125) and report the cost, against the best cost over a threshold sweep. State which version you would deploy for the expected-value use and whether five bins on 297 rows is enough to trust the ECE." }
      ],
      requirements: [
        "Three rows of metrics, AUC identical across them (or nearly, for isotonic ties).",
        "Reliability tables with bin counts shown.",
        "The cost comparison at 0.125 and at the sweep optimum for all three.",
        "A one-line verdict with the sample-size caveat."
      ],
      hint: "With 48 positives, each bin's observed rate has a standard error of several points; treat ECE as indicative. Expect the raw forest's S-curve, expect sigmoid to help, and expect isotonic to be no better than sigmoid at this size.",
      solution: {
        lang: "python",
        title: "calibrate_churn.py",
        code: `forest = Pipeline([("pre", pre), ("rf", RandomForestClassifier(300, random_state=0))])
variants = {"raw": forest.fit(X_train, y_train),
            "sigmoid": CalibratedClassifierCV(Pipeline([("pre", pre), ("rf", RandomForestClassifier(300, random_state=0))]), method="sigmoid", cv=5).fit(X_train, y_train),
            "isotonic": CalibratedClassifierCV(Pipeline([("pre", pre), ("rf", RandomForestClassifier(300, random_state=0))]), method="isotonic", cv=5).fit(X_train, y_train)}
def ece(y, p, bins=5):
    edges = np.linspace(0, 1, bins + 1); e = 0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & ((p < hi) | (hi == 1))
        if m.sum(): e += m.mean() * abs(p[m].mean() - y[m].mean())
    return e
def cost(p, t): pred = p >= t; tp = (pred & (y_test == 1)).sum(); fp = (pred & (y_test == 0)).sum(); fn = ((~pred) & (y_test == 1)).sum()
    return 5 * (tp + fp) + 100 * (fn + 0.6 * tp)
for name, m in variants.items():
    p = m.predict_proba(X_test)[:, 1]
    sweep = [cost(p, t) for t in np.linspace(0.02, 0.6, 59)]
    print(name, round(roc_auc_score(y_test, p), 3), round(brier_score_loss(y_test, p), 4), round(log_loss(y_test, p), 4), round(ece(y_test.values, p), 3),
          "cost@0.125", cost(p, 0.125), "best", min(sweep))
    # and the five-bin reliability table, with n per bin

# executed:            AUC     Brier    log-loss   ECE(5)   cost@0.125   sweep best
#   raw               0.727   0.1244   0.4049     0.047      4,030        3,950 at 0.16
#   sigmoid, cv=5     0.729   0.1207   0.3950     0.024      4,030        3,970 at 0.16
#   isotonic, cv=5    0.735   0.1230   0.4020     0.026      4,035        3,950 at 0.14
# five-bin tables (n, mean p, observed):
#   raw       0.0-0.2 (190, 0.078, 0.100)  0.2-0.4 (75, 0.292, 0.200)  0.4-0.6 (23, 0.474, 0.348)  0.6-0.8 (9, 0.671, 0.667)
#   sigmoid   0.0-0.2 (207, 0.114, 0.106)  0.2-0.4 (65, 0.271, 0.215)  0.4-0.6 (20, 0.470, 0.500)  0.6-0.8 (5, 0.656, 0.400)
# on this table the raw forest is over-confident in the middle (0.29 predicted, 0.20 observed) rather than S-shaped; sigmoid halves
# the ECE and improves Brier and log loss. The AUCs differ in the third decimal because cv=5 trains five new forests rather than
# freezing one -- not because calibration moved the ranking. The cost at 0.125 barely moves: on 297 rows the sweep is flat there.
# verdict: deploy the sigmoid version for expected-value use; with 48 positives the per-bin rates carry standard errors of
# 5-10 points (the 0.6-0.8 bin has five rows), so the ECE ranks the variants but does not measure them precisely -- recompute
# on production data once a few hundred labelled outcomes have accumulated.`,
        notes: [
          { t: "p", text: "**`cv=5` inside CalibratedClassifierCV** trains five forests on four fifths of the data and calibrates each on the fifth, then averages — the way to calibrate when there is no spare fold. It costs five fits." },
          { t: "p", text: "**The caveat is not decoration.** On 297 rows a bin of 30 with 5 positives has an observed rate of 0.17 ± 0.07; two variants with ECEs of 0.03 and 0.05 are not distinguished. The right response is to say so, deploy the one the theory favours, and measure again when the data allows." },
          { t: "p", text: "**The cost comparison is the point**: if the formula's threshold on raw probabilities is far from the sweep optimum, the probabilities are not probabilities, and any downstream arithmetic on them is wrong by that much." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Platt scaling cut the forest's Brier from 0.0826 to 0.0729 and left AUC at 0.916. Why did AUC not move?",
          options: [
            "Platt scaling does not change predictions",
            "Platt scaling maps each score through one fitted sigmoid — a monotone transform — so the ordering of rows is unchanged and AUC, which depends only on ordering, cannot move; Brier depends on the values and did",
            "AUC was already at its maximum",
            "The calibration fold was too small"
          ],
          answer: 1,
          why: "Calibration and discrimination are separate axes. A calibrator can only fix the values; a better model is needed to fix the ranking."
        }
      ]
    }
  ],

  takeaways: [
    "**Calibrated means 'rows scored p are positive at rate p'**; it is a property of the values, independent of the ranking.",
    "**The reliability table is the diagnostic**: predicted mean against observed rate per bin; ECE is its weighted gap.",
    "**Logistic regression is calibrated by construction; forests show an S-curve (under-confident at the extremes); Naive Bayes and neural networks are over-confident; SVMs have no probabilities.**",
    "**Calibrate on a held-out fold or by cross-fitting, never on training rows.**",
    "**Platt scaling: two parameters, right for S-shapes and small folds; isotonic: a step function, needs thousands of rows.**",
    "**AUC is invariant to calibration** — it moved by 0.000 across every fix.",
    "**Brier = reliability − resolution + uncertainty**: calibration attacks the first term, a better model the second, nothing the third.",
    "**Calibration matters when p is used as a number** — cost formulas, expected values, risks shown to people, cross-model comparison — and not when only the ordering is used.",
    "**An uncalibrated probability in a break-even formula cost £4,335 against £3,870 calibrated.**",
    "**Resampling and class weights de-calibrate on purpose**; recalibrate on real base-rate data afterwards.",
    "**Calibration drifts with the population**; the calibrator is cheap to refit — monitor the table in production."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is a random forest's probability under-confident at the extremes?",
        options: [
          "Because trees are biased",
          "Its probability is the fraction of trees voting positive; individual trees vote 0 or 1 on their bootstrap samples, and the average of many noisy votes is pulled toward the middle — 0.55 predicted delivered 0.86 observed",
          "Because of the bootstrap",
          "It is over-confident, not under-confident"
        ],
        answer: 1,
        why: "The S-curve is the averaging mechanism itself. Boosting, which adds logits rather than averaging votes, does not have it."
      },
      {
        stem: "When would you choose isotonic regression over Platt scaling?",
        options: [
          "Always; it is more flexible",
          "When the calibration fold has thousands of rows and the miscalibration is not sigmoid-shaped; with a small fold or an S-curve, Platt's two parameters generalise better — it beat isotonic on 1,000 rows here",
          "When the model is a logistic regression",
          "Never"
        ],
        answer: 1,
        why: "Isotonic is a non-parametric step function; its flexibility is paid for in variance and in tied outputs."
      },
      {
        stem: "A model's probabilities are used only to choose the top 10 % of customers for a call. Does calibration matter?",
        options: [
          "Yes, always",
          "No — only the ordering is used, and calibration is a monotone transform that leaves it unchanged; it would matter the moment the scores were used in a formula, shown to someone, or combined with another model's",
          "Only for logistic regression",
          "Only if AUC is low"
        ],
        answer: 1,
        why: "The use-case table is the rule: arithmetic on p needs calibration; ranking by p does not."
      },
      {
        stem: "After training with class_weight='balanced', the model's mean predicted probability is 0.42 on a 16 % problem. What happened?",
        options: [
          "The model is broken",
          "The weighting made the model behave as if positives were half the data, so its probabilities are calibrated to that imaginary base rate and are inflated; they rank fine but need recalibration on unweighted data before any formula uses them",
          "The test set has more churners",
          "This is expected and correct"
        ],
        answer: 1,
        why: "Reweighting and resampling shift the prior on purpose. The ranking survives; the scale does not."
      },
      {
        stem: "In the Brier decomposition, which term does a better feature set improve, and which does calibration improve?",
        options: [
          "Both improve uncertainty",
          "A better feature set raises resolution (the bins' observed rates spread further from the base rate); calibration lowers reliability (the gap between predicted and observed); uncertainty is the label's own variance and is fixed",
          "Calibration improves resolution",
          "Neither changes any term"
        ],
        answer: 1,
        why: "The decomposition separates 'can the model tell them apart' from 'are its numbers honest' — AUC-like and calibration-like terms in one proper score."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is model calibration and why does it matter?",
        strong: "A model is calibrated when its predicted probabilities match observed frequencies — among rows it scores 0.7, about 70 % are positive. It is separate from discrimination: a random forest can have AUC 0.92 and still say 0.55 for rows that are positive 86 % of the time, because averaging trees' votes pulls scores toward the middle. It matters whenever a probability is used as a number rather than as a rank: an expected-cost threshold, an expected-value calculation, a risk shown to a clinician, combining models, or a downstream system that consumes the score. It does not matter for ranking the top k or for a threshold chosen by a validation sweep. The diagnostic is a reliability table or diagram, summarised by expected calibration error; the fix is Platt scaling or isotonic regression on a held-out fold, which changes the values and leaves AUC untouched.",
        answer: [
          { t: "p", text: "Definition, the separation from discrimination with the forest example, when it matters, and the fix." }
        ]
      },
      {
        level: "core",
        q: "Which models are well calibrated and which are not, and why?",
        strong: "Logistic regression is calibrated by construction — it is trained on log loss, a proper score, and its sigmoid outputs are probabilities. Gradient boosting is usually close, since it also minimises log loss, though it can overshoot when run long. Random forests are under-confident at the extremes because they average 0/1 votes; Naive Bayes is over-confident because it multiplies conditional probabilities as if features were independent; SVMs have no probabilities at all, only a margin, so scikit-learn's probability option is Platt scaling in disguise; neural networks are over-confident because cross-entropy keeps pushing logits apart and the softmax saturates — temperature scaling is the standard fix. KNN gives coarse fractions of k. And anything trained with class weights or resampling is calibrated to the wrong base rate on purpose.",
        answer: [
          { t: "p", text: "Each family with its mechanism — the mechanisms are what make the list memorable and the fixes obvious." }
        ]
      },
      {
        level: "advanced",
        q: "How would you calibrate a model, and how do you know it worked?",
        strong: "Fit a calibrator on data the model did not train on — a held-out fold, or cross-fitting with CalibratedClassifierCV — because on its training rows the model is far too confident and the calibrator would learn the wrong map. Platt scaling fits a two-parameter sigmoid from score to probability; it suits S-shaped or offset miscalibration and small folds. Isotonic regression fits a monotone step function; it suits arbitrary shapes and needs thousands of rows or it overfits. Temperature scaling is Platt without the offset, for networks. Verification: the reliability table on a test set the calibrator never saw, ECE before and after, and the Brier score's reliability term — on a forest I have seen ECE go from 0.070 to 0.016 and Brier fall 12 % with AUC unchanged to three decimals. Then the operational check: does the cost formula's threshold now land near the empirical sweep's optimum? And in production, recompute the table as labels arrive, because calibration is a property of the model and the population together and the population moves.",
        answer: [
          { t: "p", text: "Held-out fitting, the two methods with their regimes, the three verifications, and drift — complete." }
        ]
      }
    ]
  }
});
