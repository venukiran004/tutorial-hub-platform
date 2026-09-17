/* ============================================================================
   LESSON 6.5 — Stacking, Voting and Ensemble Design
   ========================================================================= */
EC.receiveLesson({
  id: "6.5",

  lede: "**Every ensemble in this module has rested on one theorem and one condition: a majority of better-than-chance voters is more accurate than any one of them — provided their errors are independent.** Condorcet's arithmetic says 11 voters at 60 % reach 75 % together and 101 reach 98 %; the same simulation with voters that share a common source of difficulty gives 63 % and 61 %. This lesson makes that condition concrete for the models of modules 4–6: it measures how correlated their predictions are on the churn data, tries every combination — averaging, rank averaging, hard and soft voting, stacking with a learned meta-model, blending — and finds that on a problem where one model dominates and the rest agree with it, nothing beats the best single model (0.741), while on the spend surface, where the tree models err differently from each other and the linear model errs differently from all of them, a stacked ridge takes the error below every member. It also builds the leak that stacking exists to avoid, and shows the meta-learner trusting the wrong model when it is fed in-sample predictions.",

  objectives: [
    "State Condorcet's jury theorem, compute it, and show what correlated errors do to it",
    "Measure diversity between fitted models and predict from it whether an average will help",
    "Build hard voting, soft voting, weighted averaging, rank averaging, stacking and blending, and explain the out-of-fold requirement",
    "Recognise when an ensemble does not help, and place bagging, boosting and stacking in the bias–variance frame"
  ],

  prerequisites: ["6.2", "6.3", "2.5", "3.5"],

  blocks: [

    { t: "h2", n: "01", text: "Condorcet, and the condition that carries all the weight", id: "condorcet" },

    { t: "code", lang: "text", title: "Majority of n independent voters, each correct with probability p (executed)",
      code: `P(majority correct) = Σ_{k > n/2} C(n, k) pᵏ (1 - p)ⁿ⁻ᵏ

   p         n = 1      n = 5      n = 11     n = 25     n = 101
   0.55      0.550      0.593      0.633      0.694      0.844
   0.60      0.600      0.683      0.753      0.846      0.979
   0.70      0.700      0.837      0.922      0.983      1.000
   0.45      0.450         .          .          .       0.156        <- voters worse than chance: the majority is worse than any of them

the same 11 voters at 60 %, simulated with a shared 'difficulty' component (20,000 trials):
   independent            single voter 0.600    majority of 11:  0.750      (the theorem: 0.753)
   mildly correlated                    0.600                    0.630
   highly correlated                    0.600                    0.606      <- eleven copies of one opinion`,
      caption: "Independence does the work, not numbers. Eleven independent 60 % voters are a 75 % committee; eleven who all find the same cases hard are a 61 % committee. Every ensemble technique is a way of manufacturing independence — bootstrap rows and random features in a forest, sequential re-weighting in boosting, different model families in a stack — and every ensemble failure is a case where the manufacturing did not work."
    },

    { t: "viz",
      title: "Majority accuracy against committee size (executed values)",
      caption: "Three independent-voter curves and the correlated 60 % committee for comparison. The 45 % curve falls: a majority amplifies whatever the voters have in common, including being wrong.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Line chart of majority accuracy against number of voters for individual accuracies 0.55, 0.60 and 0.70, all rising toward 1; a fourth flat line at 0.61 marks highly correlated voters at 0.60; a fifth line for accuracy 0.45 falls toward 0.16.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="250" x2="820" y2="250"/><line x1="80" y1="30" x2="80" y2="250"/></g>
  <g class="s-sub">
    <text x="72" y="254" text-anchor="end">0.1</text><text x="72" y="182" text-anchor="end">0.4</text><text x="72" y="110" text-anchor="end">0.7</text><text x="72" y="38" text-anchor="end">1.0</text>
    <text x="118" y="270" text-anchor="middle">1</text><text x="278" y="270" text-anchor="middle">5</text><text x="438" y="270" text-anchor="middle">11</text><text x="598" y="270" text-anchor="middle">25</text><text x="758" y="270" text-anchor="middle">101</text>
    <text x="400" y="290">voters (independent unless marked)</text>
  </g>
  <polyline fill="none" style="stroke:var(--good)" stroke-width="2.2" points="118,109 278,76 438,56 598,42 758,38"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.2" points="118,132 278,113 438,96 598,74 758,43"/>
  <polyline fill="none" style="stroke:var(--ink-3)" stroke-width="2" points="118,144 278,134 438,124 598,110 758,75"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2" stroke-dasharray="5 4" points="118,132 438,131"/>
  <polyline fill="none" style="stroke:var(--crit)" stroke-width="2" points="118,168 758,237"/>
  <g class="s-label" style="font-weight:600">
    <text x="770" y="38" style="fill:var(--good)">p = 0.70</text>
    <text x="770" y="60" style="fill:var(--accent)">p = 0.60</text>
    <text x="770" y="82" style="fill:var(--ink-3)">p = 0.55</text>
    <text x="448" y="140" style="fill:var(--accent)">p = 0.60, highly correlated: 0.606</text>
    <text x="770" y="246" style="fill:var(--crit)">p = 0.45</text>
  </g>
</svg>`
    },

    { t: "dl", items: [
      ["Hard voting", "Each model casts a label; majority wins. Throws away confidence; on 15 % positives the majority at 0.5 almost never votes 'churn' (recall 0.043)."],
      ["Soft voting / averaging", "Average the probabilities (optionally weighted), then threshold. Uses confidence; needs the members' probabilities on a comparable scale (2.5)."],
      ["Rank averaging", "Average each model's ranks instead of its probabilities: immune to calibration differences, produces a ranking rather than a probability."],
      ["Stacking", "Fit a meta-model on the base models' *out-of-fold* predictions to learn how to combine them. `StackingClassifier(cv=…)` does the cross-fitting; the meta-model should be simple."],
      ["Blending", "Stacking with a single hold-out slice instead of cross-validated folds: simpler, and the base models never see the slice (0.695 vs 0.717 here)."],
      ["Diversity", "Members that err on different rows. Measured by the correlation of their predictions or errors; created by different families, features, rows or objectives."],
      ["Random subspace", "Train each member on a random subset of *features* — the column half of a random forest's two randomisations."],
      ["Meta-feature leakage", "Feeding the meta-model a base model's predictions on the rows that base model trained on. It then learns to trust whichever member overfits most."]
    ]},

    { t: "h2", n: "02", text: "The churn data: six models, and why no combination wins", id: "churn" },

    { t: "code", lang: "python", title: "Six base models and the correlation of their out-of-fold probabilities (executed, 989 rows, 5-fold)",
      hl: [2, 7, 10, 11, 12, 13, 14, 15],
      code: `#   model            AUC       log-loss
#   logistic         0.7411    0.3953      <- the best; the truth is an additive logit
#   svc_rbf          0.7390    0.3931         (class-weighted, Platt-scaled)
#   forest           0.7238    0.4012
#   knn (k=101)      0.7083    0.4079
#   hist_gb          0.7074    0.4096
#   naive_bayes      0.7000    0.5902

# correlation of predicted probabilities
#               logistic  forest  hist_gb   knn   naive_bayes  svc_rbf
#   logistic       1.00     0.90    0.85    0.79     0.82        0.97      <- the SVM is a copy of the logistic model
#   forest         0.90     1.00    0.88    0.85     0.88        0.92
#   hist_gb        0.85     0.88    1.00    0.71     0.75        0.86
#   knn            0.79     0.85    0.71    1.00     0.86        0.83
#   naive_bayes    0.82     0.88    0.75    0.86     1.00        0.85`,
      caption: "Two facts before any combining: one member is clearly best, and the members agree with it and with each other at 0.8–0.97. Condorcet's condition is not met — these are eleven voters sharing a difficulty component — and the theorem says to expect little. The model that disagrees most (KNN, hist_gb at 0.71) is also among the weakest, which is the usual shape: diversity is easy to get from bad models and hard to get from good ones."
    },

    { t: "code", lang: "python", title: "Every way of combining them (executed, out-of-fold or nested)",
      hl: [2, 5, 9, 13, 14, 15],
      code: `# averaging probabilities
#   all six                            AUC 0.7288    log-loss 0.4004      <- worse than the best member
#   logistic + forest                      0.7381             0.3936
#   logistic + hist_gb                     0.7330             0.3971
#   logistic + forest + hist_gb            0.7327             0.3960
#   logistic + knn + naive_bayes           0.7212             0.4145
#   rank average of all six                0.7327
# voting (logistic, forest, hist_gb), refitted inside each outer fold
#   hard voting        accuracy 0.8382   recall at 0.5: 0.043            (base rate 0.837 -- it predicts 'no churn' for nearly everyone)
#   soft voting        AUC 0.7327   log-loss 0.3960   accuracy 0.8392
# stacking (same three; base predictions cross-fitted with cv=5 inside each outer fold)
#   logistic meta-model                AUC 0.7362    log-loss 0.3976      meta coefficients on [logistic, forest, hist_gb]: [3.26, 1.34, 1.23]
#   logistic meta, C = 0.1                 0.7345             0.4178
#   random-forest meta-model               0.7245             0.4015      <- a flexible meta-model overfits three columns
# the best single model: 0.7411 / 0.3953.  Nothing above beats it.`,
      caption: "The stack did the sensible thing — it weighted the logistic model by 3.26 against 1.3 for the others — and still lost by 0.005 to using the logistic model alone, because the other members add correlated noise and the meta-model must be estimated from 989 rows. Hard voting is the cautionary row: majority-of-labels at a 0.5 threshold is a majority-class predictor on imbalanced data. **An ensemble is not free accuracy; it is a bet that the members' errors differ, and here they do not.**"
    },

    { t: "callout", kind: "trap", title: "Stacking on in-sample predictions: the meta-learner trusts the wrong model (executed)", body: [
      { t: "p", text: "Fit logistic, forest and boosting on the 692 training rows, take their predictions *on those same rows* as meta-features, fit a logistic meta-model: coefficients **[0.97, 2.46, 4.61]** — it trusts boosting most and the logistic model least. Its hold-out AUC is 0.712. Now do it properly, with each base model's out-of-fold predictions as meta-features: coefficients **[3.13, 1.18, 0.94]**, hold-out 0.717. The leaky meta-model trusted the members in order of their *training* AUC (logistic 0.797, forest 0.849, boosting 0.877) — that is, in order of how much they overfit — because on the training rows the overfitted members look best. Out-of-fold predictions are the only meta-features that reflect how a member behaves on data it has not seen, which is the only thing the meta-model needs to know. `StackingClassifier(cv=5)` does this for you; a hand-rolled stack that skips it is measuring memorisation." }
    ]},

    { t: "code", lang: "python", title: "Blending, and one dominant model with weak partners (executed)",
      code: `# blending: base models on 80 % of the training rows, meta-model on the remaining 20 %
#   meta coefficients [1.08, 0.89, 0.93]    hold-out AUC 0.6950     <- vs 0.7172 for cross-fitted stacking on the same split: the base models lost 20 % of their data
#   and the meta-model saw 138 rows

# one strong model, two weak ones (hold-out AUC):  logistic 0.7206   naive Bayes 0.7081   KNN-5 0.6514
#   equal-weight average of the three     0.7232      (+0.003: the weak members are diluted, not harmful, because they are somewhat different)
#   weights 0.7 / 0.15 / 0.15             0.7278      (+0.007: a little diversity, sized so it cannot hurt)`,
      caption: "Blending is what you do when the data are large enough that giving up a slice costs nothing and the simplicity of one holdout is worth having; on 692 rows it is the worst option. The last two lines are the honest ceiling on the churn data: a few thousandths from weighting in some diversity, at the cost of three models in production instead of one."
    },

    { t: "h2", n: "03", text: "The spend data: where stacking earns its keep", id: "spend" },

    { t: "code", lang: "python", title: "Four regressors on spend, the correlation of their errors, and the stack (executed, 5-fold MAE)",
      hl: [2, 3, 4, 5, 13, 14, 15, 16],
      code: `#   member     MAE          error correlation:   linear   forest   hist_gb   knn
#   linear     19.93        linear                1.00     0.31     0.34     0.42      <- the linear model errs differently from everything
#   forest      7.35        forest                0.31     1.00     0.82     0.75
#   hist_gb     7.31        hist_gb               0.34     0.82     1.00     0.72
#   knn         8.68        knn                   0.42     0.75     0.72     1.00

#   average of forest + hist_gb + knn                     7.33      <- no gain: three similar models
#   average of all four, linear included                  8.70      <- a bad member with equal weight drags the average
#   stacking, ridge meta-model                            7.12      <- better than every member
#   meta weights [linear, forest, hist_gb, knn] = [-0.01, 0.40, 0.52, 0.09], intercept -0.6
#   (the engineered column from 4.4: 6.34; noise floor 6.38)`,
      caption: "The stack learned what the correlation table implies: give the linear model zero weight — it is wrong in its own way, but too wrong to be useful — split the weight between the two tree ensembles that err differently enough (0.82) to average profitably, and add a little KNN. That is the whole craft: a *learned* combination can exclude a member that an equal-weight average would have to include, and the learning is done on out-of-fold predictions so that the weights reflect generalisation. The gain is 0.2 MAE, worth having when 0.2 matters and not when a fourth model in production does not pay for itself."
    },

    { t: "table",
      head: ["Family", "Members", "Reduces", "Diversity comes from", "Typical gain", "Cost"],
      rows: [
        ["Bagging / forest (6.2)", "Same learner, deep", "Variance", "Bootstrap rows, random feature subsets", "Large on high-variance learners", "Parallel; B× inference"],
        ["Boosting (6.3–6.4)", "Same learner, shallow", "Bias (and variance via shrinkage)", "Sequential re-weighting of errors", "Largest on tabular data with interactions", "Sequential; tuning"],
        ["Voting / averaging", "Different families", "Variance of the combination", "Different inductive biases", "Small unless members are diverse and comparable", "All members at inference"],
        ["Stacking", "Different families + meta-model", "Both, by learned weighting", "Different families; meta-model can zero a member", "Small–moderate; 7.31 → 7.12", "All members + cross-fitting at training"],
        ["Random subspace", "Same learner on feature subsets", "Variance", "Columns", "Moderate on wide data", "Parallel"]
      ]
    },

    { t: "callout", kind: "mental", title: "When an ensemble does not help, and how to know in advance", body: [
      { t: "p", text: "Compute the correlation of the members' out-of-fold predictions (or errors) before combining anything. Above ~0.9 with one clearly best member, the combination will land at or below the best member — the churn case, six ways. Below ~0.8 among comparably good members, averaging will gain — the spend trees at 0.82 gained a little; a stack that can drop bad members gained more. A member far worse than the rest is harmful in an equal-weight average (8.70) and harmless in a stack (weight −0.01). And weigh the cost: the churn stack predicted 35× slower than its best member for −0.005 AUC. The usual outcome on a well-specified problem is that the ensemble's gain is smaller than the gain from a better feature; the usual outcome in a competition is that it is the last 0.2 % that wins." }
    ]},

    { t: "ladder",
      title: "Combining a credit model's three candidate learners for a lending decision",
      rungs: [
        { level: "bad", label: "Hard-vote the three at 0.5", code: `VotingClassifier([lr, rf, gb], voting="hard")`,
          note: "**A majority of labels at 0.5 on a 15 % positive rate is a majority-class predictor** (recall 0.043 on churn), and it has no score to set a lending threshold on." },
        { level: "ok", label: "Soft-vote calibrated members, threshold from cost", code: `VotingClassifier([lr, rf_cal, gb], voting="soft", weights=[2, 1, 1]); threshold from the cost matrix (2.3)`,
          note: "**A score, a threshold and some diversity.** The weights are guessed, the forest's compressed probabilities needed calibrating first, and the gain over the logistic model alone is unproven." },
        { level: "best", label: "Measure diversity; stack with cross-fitted meta-features only if it pays; ship the simplest winner", code: `oof = {name: cross_val_predict(m, X, y, cv=5, method="predict_proba")[:, 1] for name, m in members}
print(pd.DataFrame(oof).corr())                                   # above 0.9? stop here and ship the best member
stack = StackingClassifier(members, final_estimator=LogisticRegression(), cv=5)   # else: learned weights on OOF predictions
# compare stack vs best member on the SAME outer folds; ship the stack only if the gain survives the cost of three models in production`,
          note: "**The decision to ensemble is made from the correlation table, the combination is learned without leakage, and the comparison is like-for-like** — which on the churn data means shipping the logistic model." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Investigate",
      title: "Condorcet with correlation, a stack you must leak and repair, and a weight you must justify",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Compute by hand the majority accuracy of 3 independent voters at p = 0.6 and at p = 0.8; then compute the accuracy of 3 voters at p = 0.6 whose errors are *perfectly* correlated, and state the general lesson in one sentence. **(b)** On the churn data, build a stack by hand two ways — meta-features from in-sample base predictions, and from 5-fold out-of-fold predictions — with a logistic meta-model; report the meta coefficients and hold-out AUC of each and explain the ordering of the coefficients in the leaky version. **(c)** On the spend data, fit a ridge meta-model on out-of-fold predictions of [linear, forest, hist_gb, knn], report its weights, and explain why the linear member receives approximately zero even though its errors are the least correlated with the others'." }
      ],
      requirements: [
        "(a) three probabilities and the one-sentence lesson.",
        "(b) two coefficient vectors, two AUCs, and the explanation.",
        "(c) the four weights and the reasoning."
      ],
      hint: "(a) Majority of 3 = P(2 or 3 correct) = 3p²(1 − p) + p³. (b) `cross_val_predict(..., method=\"predict_proba\")` for the OOF version. (c) A ridge meta-model minimises squared error of the combination; a member's weight depends on its own error size as well as its correlation.",
      solution: {
        lang: "python",
        title: "ensemble_practice.py (executed where marked)",
        code: `# (a) majority of 3 independent voters: P = 3p²(1 - p) + p³
#   p = 0.6:  3(0.36)(0.4) + 0.216 = 0.432 + 0.216 = 0.648
#   p = 0.8:  3(0.64)(0.2) + 0.512 = 0.384 + 0.512 = 0.896
#   perfectly correlated errors at p = 0.6: all three are right or wrong together -> majority accuracy = 0.600, no gain at all
#   lesson: an ensemble's gain is bounded by how differently its members err, not by how many of them there are.

# (b) executed (30 % hold-out, members logistic / forest / hist_gb):
#   in-sample meta-features:  coefficients [0.97, 2.46, 4.61]   hold-out AUC 0.7118
#   out-of-fold meta-features: coefficients [3.13, 1.18, 0.94]   hold-out AUC 0.7172       (best single member: logistic 0.7206)
#   the leaky coefficients are ordered by the members' TRAINING AUC (0.797, 0.849, 0.877): on the training rows the most overfitted member
#   looks most accurate, so the meta-model learns to trust memorisation. Out-of-fold predictions reverse the order to the members'
#   generalisation, which is what the meta-model is supposed to weigh.

# (c) executed: ridge meta weights [linear -0.01, forest 0.40, hist_gb 0.52, knn 0.09], intercept -0.6; stack MAE 7.12 vs best member 7.31
#   low correlation is necessary for a member to help, not sufficient: the linear member's errors are also nearly three times LARGER than
#   the others' (MAE 19.9 vs 7.3), so adding any positive weight of it adds more error than its independence removes. The ridge meta-model
#   minimises the combination's squared error and finds that the optimal weight is ~0 -- the equal-weight average (8.70) could not.
#   diversity is the ticket in; comparable accuracy is the price of a seat.`,
        notes: [
          { t: "p", text: "**(a)** in one line: 0.648 with independence, 0.600 without. Every diversity mechanism in this module exists to move a committee from the second number toward the first." },
          { t: "p", text: "**(b)** is the leak to remember: it does not crash, it does not warn, and it produces a confident, wrong weighting. Cross-fit the meta-features, always." },
          { t: "p", text: "**(c)** is why stacking beats averaging when the members differ in quality — and why a stack with a learned meta-model is worth its cost only when there is something to learn." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Six churn models averaged (AUC 0.729) scored below the best of them (0.741). Why, and what would you have checked first?",
          options: [
            "Averaging always loses to the best model",
            "The members' predictions correlate at 0.8–0.97 with one clearly best member, so averaging adds correlated noise from weaker models without cancelling errors — Condorcet's independence condition fails, as it did for the correlated voters (0.606 vs 0.750). The check is the correlation table of out-of-fold predictions before combining anything",
            "The probabilities were not calibrated",
            "Six is too many models"
          ],
          answer: 1,
          why: "A learned stack did better than the average (0.736) by weighting the logistic model 3.26 to 1.3, and still did not beat it alone."
        }
      ]
    }
  ],

  takeaways: [
    "**Condorcet**: a majority of n independent voters at p > 0.5 approaches certainty (0.6 → 0.753 at n = 11, 0.979 at 101); correlated voters gain almost nothing (0.606); voters below 0.5 get worse (0.156).",
    "**Measure diversity first**: the correlation of out-of-fold predictions or errors. Churn members at 0.8–0.97 with one dominant model → no combination beat 0.741; spend trees at 0.82 → a stack gained 0.2 MAE.",
    "**Hard voting discards confidence** and is a majority-class predictor on imbalanced data (recall 0.043); soft voting averages calibrated probabilities; rank averaging sidesteps calibration.",
    "**Stacking learns the weights** on out-of-fold meta-features — [3.26, 1.34, 1.23] on churn, [−0.01, 0.40, 0.52, 0.09] on spend — and can exclude a bad member that an equal-weight average must include (8.70 vs 7.12).",
    "**In-sample meta-features leak**: the meta-model trusts members in order of training AUC, i.e. in order of overfitting ([0.97, 2.46, 4.61]); cross-fitting reverses it.",
    "**Blending** trades data for simplicity (0.695 vs 0.717 on 692 rows); use it when a slice is cheap.",
    "**Keep the meta-model simple**: a forest meta-model on three columns overfitted (0.7245).",
    "**Diversity is necessary, comparable accuracy is required**: the linear member was the least correlated and still got weight zero, because its errors were three times larger.",
    "**Bagging cuts variance, boosting cuts bias, stacking learns a combination** — the same models, three ways of manufacturing independence.",
    "**Count the cost**: the churn stack predicted 35× slower for −0.005 AUC. Ship the simplest model that wins on the same folds."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does Condorcet's jury theorem say, and what is its condition?",
        options: [
          "More models are always better",
          "If each voter is correct with probability p > 0.5 and the voters' errors are independent, the probability that the majority is correct rises toward 1 with the number of voters (0.6 → 0.753 at 11, 0.979 at 101). The condition is independence: eleven 60 % voters sharing a difficulty component reached 0.606; and for p < 0.5 the majority gets worse",
          "Averaging removes bias",
          "Ensembles need at least 100 members"
        ],
        answer: 1,
        why: "Every ensemble method is a technique for approximating the independence the theorem assumes."
      },
      {
        stem: "Why must stacking use out-of-fold predictions as meta-features?",
        options: [
          "To make training faster",
          "Because a base model's predictions on its own training rows reflect how much it memorised, not how it generalises; a meta-model fitted on them trusts the most overfitted member (coefficients [0.97, 2.46, 4.61], ordered by training AUC) and generalises worse (0.712 vs 0.717). Out-of-fold predictions are the members' behaviour on unseen rows, which is what the combination should be learned from",
          "Because the meta-model needs more rows",
          "It is optional; scikit-learn does it for convenience"
        ],
        answer: 1,
        why: "The same principle as 3.5's cross-fitting and 6.4's ordered statistics: a row's derived feature must not contain its own label."
      },
      {
        stem: "Hard versus soft voting: when does each make sense?",
        options: [
          "Hard voting is better for probabilities",
          "Soft voting averages probabilities and keeps confidence, so a 99 %-sure member outweighs three at 51 %; it needs members on a comparable probability scale. Hard voting counts labels and is defensible only when members give no usable scores; at a 0.5 threshold on imbalanced data it becomes a majority-class predictor (recall 0.043). Rank averaging is the calibration-free middle ground",
          "They are equivalent for binary problems",
          "Hard voting is always preferred"
        ],
        answer: 1,
        why: "Voting is averaging with a threshold; the threshold must still be chosen from costs (2.3)."
      },
      {
        stem: "The spend stack gave the linear model weight −0.01 despite its errors being the least correlated with the other members'. Explain.",
        options: [
          "Ridge shrank it to zero by accident",
          "Low correlation makes a member's errors cancel against the others', but its errors were three times larger (MAE 19.9 vs 7.3), so any positive weight adds more error than the cancellation removes; the ridge meta-model minimising the combination's squared error therefore sets it near zero, which an equal-weight average cannot do (8.70 vs 7.12)",
          "Linear models cannot be stacked",
          "The meta-model was overfitted"
        ],
        answer: 1,
        why: "Diversity is necessary for a member to help; comparable accuracy is what makes the help outweigh the harm."
      },
      {
        stem: "Place bagging, boosting and stacking in the bias–variance frame.",
        options: [
          "All three reduce bias",
          "Bagging averages independent high-variance learners: variance falls, bias unchanged. Boosting fits each learner to the current errors: bias falls, with shrinkage and subsampling for variance. Stacking learns a weighted combination of different families on out-of-fold predictions: it can reduce either, by weighting members whose errors differ and excluding those that do not — and it gains only when such members exist",
          "Bagging reduces bias, boosting reduces variance",
          "Stacking is bagging with a meta-model"
        ],
        answer: 1,
        why: "Same models, three ways of manufacturing independent errors."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain stacking and how it differs from voting and blending.",
        strong: "Voting combines models with fixed weights: hard voting takes the majority label, soft voting averages probabilities, and neither learns anything about which member to trust. Stacking learns the combination: the base models' predictions become the features of a second-level model, usually a logistic or ridge regression, which is fitted to the labels. The essential detail is that those meta-features must be out-of-fold — each base model's prediction for a row must come from a fit that did not see that row — otherwise the meta-model is trained on memorisation and trusts the most overfitted member; on the churn data the leaky version weighted the members [0.97, 2.46, 4.61], in order of their training AUC, and the cross-fitted version [3.13, 1.18, 0.94], in order of their hold-out AUC. Blending is stacking with one hold-out slice instead of cross-validated folds: simpler, and the base models lose the slice, which cost 0.02 AUC on 692 rows. Stacking's advantage over averaging is that it can down-weight or exclude a member: on the spend data it gave a linear model with three times the error a weight of zero and beat every member, while an equal-weight average was dragged to 8.70. Its costs are cross-fitting at training and every member at inference, and it only pays when the members err differently — on churn, where they agreed at 0.8–0.97, it did not beat the best single model.",
        answer: [
          { t: "p", text: "Fixed versus learned weights, the out-of-fold requirement with the executed leak, blending's trade, and the honest case for and against." }
        ]
      },
      {
        level: "core",
        q: "When does an ensemble not help?",
        strong: "When its members make the same mistakes, which is the failure of Condorcet's independence condition: eleven 60 % voters that share a difficulty component score 61 % as a committee against 75 % for independent ones. In practice that means members from similar families fitted to the same features on the same rows — on the churn data six models correlated at 0.8 to 0.97, one was clearly best, and every combination I tried, from averaging to a learned stack, landed at or below it. It also does not help when one member is far worse than the rest and enters an equal-weight average: the linear model on spend dragged the average from 7.3 to 8.7. And it does not help in the ways that matter operationally when interpretability is required, when inference latency is tight — the churn stack was 35 times slower than its best member — or when the same effort spent on a feature would buy more. The check that predicts all of this is the correlation table of out-of-fold predictions: above about 0.9 with a dominant member, ship the member.",
        answer: [
          { t: "p", text: "The independence failure with numbers, the weak-member failure, the operational costs, and the diagnostic." }
        ]
      },
      {
        level: "advanced",
        q: "Design an ensemble for a tabular fraud model where the business will only accept a latency of 20 ms and a single explainable score.",
        strong: "The constraints decide most of it. Twenty milliseconds rules out a stack of several heavy members at inference unless they are cheap — a logistic model, a CatBoost model with symmetric trees, and a small LightGBM would each fit — and 'one explainable score' means the final output must be a calibrated probability from a model whose contributions can be attributed, so the meta-model must be a logistic regression on the members' logits, not a tree. I would first fit the candidate members and compute the correlation of their out-of-fold predictions; if the best member dominates and the others agree with it above 0.9, the answer is that member alone, calibrated, and the ensemble question is closed. If there is diversity — typically a linear model, a boosted model with interactions, and a model on a different feature view such as sequence-derived features — I would stack them with cross-fitted meta-features and a two- or three-coefficient logistic meta-model, which is itself explainable: the score is a fixed weighted sum of three member scores, each of which can be attributed with SHAP or coefficients. I would validate on a time-ordered slice because fraud drifts, report the stack against the best member on identical folds with the latency measured, and ship the stack only if the gain in the metric the business cares about — recall at the operating false-positive rate, not AUC — survives both the latency budget and the cost of three models to monitor. The most likely outcome is a two-member stack or a single boosted model, and either is a fine answer.",
        answer: [
          { t: "p", text: "Constraints first, the diversity check as the gate, an explainable meta-model, time-aware validation, and the like-for-like decision." }
        ]
      }
    ]
  }
});
