/* ============================================================================
   LESSON 6.3 — Boosting: AdaBoost and Gradient Boosting
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "**A forest grows its trees independently and averages them; boosting grows them one after another, each one fitted to what the ensemble so far gets wrong.** That single change turns variance reduction into bias reduction, and it is why boosted trees are the strongest general-purpose model on tabular data. This lesson runs AdaBoost for three rounds by hand — weights, weighted error, α = ½ ln((1 − ε)/ε), the re-weighting — until ten points are classified perfectly by three stumps that individually get three or four wrong; then derives gradient boosting as gradient descent in function space, where the residuals are the negative gradient of the loss, and runs it by hand to match scikit-learn to three decimals. The second half is the discipline: learning rate against number of trees (a rate of 1.0 peaks at 30 trees and collapses; 0.03 is still improving at 1,000), the staged curve that puts the optimum at stage 48, early stopping that finds 63, depth-1 trees beating depth 8 by 0.14 AUC, and the exponential loss that makes AdaBoost chase mislabelled points.",

  objectives: [
    "Run AdaBoost's weight update by hand and explain α, the re-weighting, and the exponential loss it minimises",
    "Derive gradient boosting as forward stagewise additive modelling with pseudo-residuals as the negative gradient, for squared and log loss",
    "Tune learning rate, n_estimators, depth and subsampling together, and use staged curves and early stopping",
    "Contrast boosting with bagging on bias, variance, noise sensitivity and tuning burden"
  ],

  prerequisites: ["6.1", "6.2", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "AdaBoost: reweight, refit, vote", id: "adaboost" },

    { t: "code", lang: "text", title: "The algorithm, and three rounds by hand on ten points (executed)",
      code: `start with weights wᵢ = 1/n.  For each round t:
   fit a weak learner hₜ to the WEIGHTED data;  εₜ = Σ wᵢ [hₜ(xᵢ) ≠ yᵢ]  (weighted error)
   αₜ = ½ ln( (1 - εₜ) / εₜ )                  its vote: 0 at ε = 0.5, large as ε -> 0, negative if ε > 0.5
   wᵢ <- wᵢ · exp( -αₜ yᵢ hₜ(xᵢ) ),  normalise   correct points shrink by e^{-α}, wrong points grow by e^{α}
final classifier:  sign( Σₜ αₜ hₜ(x) )

x = 0 1 2 3 4 5 6 7 8 9        y = + + + - - - + + + -        weak learner: a decision stump (one threshold on x)

round 1   weights 0.1 everywhere
          best stump: x ≤ 2.5 -> +, else -        wrong on x = 6, 7, 8        ε = 0.300        α = ½ ln(0.7/0.3) = 0.424
          wrong points × e^{0.424} = 1.528 -> 0.153;  right points × e^{-0.424} = 0.655 -> 0.065;  normalise (sum 0.9165):
          weights: 0.071 ×6, 0.167 ×3 (x = 6,7,8), 0.071        ensemble sign(F) wrong on 3 points

round 2   best stump: x ≤ 8.5 -> +, else -        wrong on x = 3, 4, 5        ε = 3 × 0.071 = 0.214        α = 0.650
          weights: x = 3,4,5 -> 0.167;  x = 6,7,8 -> 0.106;  the rest 0.045       ensemble F = [1.07 ×3, 0.23 ×6, -1.07]: still 3 wrong

round 3   best stump: x ≤ 5.5 -> -, else +        wrong on x = 0, 1, 2, 9      ε = 0.182        α = 0.752
          ensemble F = 0.424 h₁ + 0.650 h₂ + 0.752 h₃ = [+0.32 ×3, -0.53 ×3, +0.98 ×3, -0.32]:  ZERO errors

scikit-learn AdaBoostClassifier(3 stumps): errors [0.300, 0.214, 0.182], weights [0.847, 1.299, 1.504] = 2α (SAMME's convention), 0 training errors`,
      caption: "No single stump can do better than 7 of 10 on this pattern (+ + + − − − + + + −), but three stumps that each get a *different* three or four wrong, weighted by how good they were, get all ten. The re-weighting is what makes them different: after round 1 the three misclassified points carry 50 % of the weight, so round 2 is forced to fix them, at the cost of others, which round 3 then fixes. AdaBoost is provably forward stagewise minimisation of the exponential loss Σ exp(−yᵢF(xᵢ)) — the α formula and the weight update both fall out of that."
    },

    { t: "dl", items: [
      ["Weak learner", "Anything slightly better than chance; a decision stump (one split) is the classic. Boosting's strength comes from combining many, so each can be simple."],
      ["Weighted error εₜ", "The learner's error with the current weights, in [0, 1). Each round is fitted to the weighted data, so 'error' is measured where the previous rounds failed."],
      ["αₜ = ½ ln((1 − ε)/ε)", "The learner's vote. ε = 0.3 → 0.424; ε = 0.1 → 1.099; ε = 0.5 → 0 (useless); ε > 0.5 → negative (invert it)."],
      ["Exponential loss", "Σ exp(−yᵢF(xᵢ)): grows without bound for confidently wrong points (54.6 at margin −4, where log-loss is 4.0). AdaBoost's objective, and the source of its noise sensitivity."],
      ["Pseudo-residual", "−∂L/∂F at the current model: the direction in which each prediction should move. Squared loss → y − F; log-loss → y − p; any differentiable loss → its own."],
      ["Shrinkage / learning rate ν", "Fₘ = Fₘ₋₁ + ν hₘ. Each tree contributes a fraction; smaller ν needs more trees and generalises better."],
      ["Stochastic gradient boosting", "Fit each tree on a random row fraction (`subsample`): variance reduction and speed, at the price of some bias."],
      ["Early stopping", "Stop adding trees when a validation score has not improved for k rounds. The number of trees is then chosen by the data, not by you."]
    ]},

    { t: "h2", n: "02", text: "Gradient boosting: descent in function space", id: "gradient" },

    { t: "code", lang: "text", title: "From residual fitting to the general algorithm",
      code: `goal:  F(x) = Σₘ ν hₘ(x)  minimising  Σᵢ L(yᵢ, F(xᵢ))       (forward stagewise: add one hₘ at a time, never revisit earlier ones)

gradient descent on a parameter vector:   θ <- θ - ν ∇L(θ)
gradient descent on a FUNCTION, evaluated at the training points:   F(xᵢ) <- F(xᵢ) - ν ∂L(yᵢ, F(xᵢ))/∂F(xᵢ)
the negative gradient is a vector of n numbers, one per row -- the pseudo-residuals rᵢ. A tree fitted to (xᵢ, rᵢ) is a function that
approximates that vector and extends it to new x. So:

   F₀ = argmin_c Σ L(yᵢ, c)                       (the mean for squared loss; the logit of the base rate for log-loss)
   for m = 1..M:
      rᵢ = -[∂L(yᵢ, F)/∂F] at F = Fₘ₋₁           squared loss: rᵢ = yᵢ - F(xᵢ)         log-loss: rᵢ = yᵢ - pᵢ,  p = σ(F)
      fit a small tree hₘ to (xᵢ, rᵢ); set each leaf's value to the loss-minimising step for the rows in it
      Fₘ = Fₘ₋₁ + ν hₘ

squared loss is 'fit the residuals'; log-loss is 'fit label minus probability, on the logit scale'; Huber, quantile, Poisson, ... are
one derivative each. That generality -- any differentiable loss, the same machinery -- is the point of the word 'gradient'.`,
      caption: "AdaBoost is this algorithm with the exponential loss and a particular choice of step; gradient boosting is the same idea with any loss. The tree is only a way to turn a vector of n gradient values into a function of x, which is why it should be small: it needs to capture the *direction* of the gradient, not to fit it perfectly."
    },

    { t: "code", lang: "text", title: "Three stages by hand: squared loss, stumps, ν = 0.5 (executed)",
      code: `x = 1 2 3 4 5 6        y = 1.0  1.2  2.9  3.1  5.0  5.2

F₀ = mean(y) = 3.067                                                             SSE 16.07
stage 1   r = y - F₀ = [-2.067, -1.867, -0.167, 0.033, 1.933, 2.133]
          stump on r: x ≤ 4.5 -> -1.017,  else 2.033                            (the leaf means of r)
          F₁ = F₀ + 0.5 h₁ = [2.558 ×4, 4.083 ×2]                                SSE 6.77
stage 2   r = [-1.558, -1.358, 0.342, 0.542, 0.917, 1.117]
          stump: x ≤ 2.5 -> -1.458,  else 0.729
          F₂ = [1.829, 1.829, 2.923, 2.923, 4.448, 4.448]                        SSE 1.99
stage 3   r = [-0.829, -0.629, -0.023, 0.177, 0.552, 0.752]
          stump: x ≤ 2.5 -> -0.729,  else 0.365
          F₃ = [1.465, 1.465, 3.105, 3.105, 4.630, 4.630]                        SSE 0.79
scikit-learn GradientBoostingRegressor(n_estimators=3, learning_rate=0.5, max_depth=1): [1.465, 1.465, 3.105, 3.105, 4.630, 4.630]`,
      caption: "Each stage looks only at what is left over. Note the shrinkage at work: stage 1's stump would have removed the whole coarse residual at ν = 1; at ν = 0.5 it takes half, and stages 2 and 3 revisit the same region (x ≤ 2.5) with smaller steps. That is why a small learning rate needs more trees, and why it generalises better — each tree commits to less, and the ensemble averages more of them over the same structure."
    },

    { t: "code", lang: "python", title: "Log-loss on the churn data: the first stage (executed; tickets missing encoded as −1)",
      code: `F₀ = logit(base rate 0.163) = -1.638            pseudo-residuals y - p:  churners +0.837, everyone else -0.163
GradientBoostingClassifier(learning_rate=0.1, max_depth=2).estimators_[0, 0]
#   root: logins_30d <= 11.5;  leaf values (steps on the logit scale, before shrinkage): [1.210, -0.280, 1.557, -0.744]
#   after two stages at ν = 0.1 the logits span -1.763 .. -1.372: the model has moved every customer by at most 0.27 log-odds`,
      caption: "For classification the trees are regression trees on the logit scale, fitted to y − p: a churner the model rates at 0.16 has residual +0.84 and pulls the logit up in its leaf, and each leaf's value is the Newton step for the log-loss on the rows it holds. The probabilities are σ(F), which is why boosted classifiers are usually better calibrated than forests — they are fitted to the log-loss directly (2.5)."
    },

    { t: "h2", n: "03", text: "The dials, executed", id: "dials" },

    { t: "viz",
      title: "Staged log-loss, ν = 0.1, depth 2, 1,000 trees (executed; 30 % holdout)",
      caption: "Training loss falls forever; the test loss bottoms at stage 48 (0.4169) and climbs to 0.565 by stage 1,000. Early stopping with 20 rounds of patience on a 20 % validation slice stopped at 63 — the same plateau, chosen by the data.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Line chart of training and test log-loss against the number of boosting stages on a log scale from 1 to 1,000. Training loss falls steadily from 0.43 to 0.10; test loss falls to a minimum near stage 48 and then rises to 0.57.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="260" x2="820" y2="260"/><line x1="80" y1="40" x2="80" y2="260"/></g>
  <g class="s-sub">
    <text x="72" y="244" text-anchor="end">0.1</text><text x="72" y="204" text-anchor="end">0.2</text><text x="72" y="164" text-anchor="end">0.3</text><text x="72" y="124" text-anchor="end">0.4</text><text x="72" y="84" text-anchor="end">0.5</text>
    <text x="76" y="280">1</text><text x="319" y="280">10</text><text x="562" y="280">100</text><text x="804" y="280">1,000</text>
    <text x="400" y="296">boosting stages (log scale)</text><text x="40" y="30">log-loss</text>
  </g>
  <polyline fill="none" style="stroke:var(--ink-3)" stroke-width="2" points="80,106 327,126 444,140 519,151 573,162 648,181 746,214 820,240"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.2" points="80,105 327,111 444,112 519,113 573,110 648,106 746,87 820,54"/>
  <circle cx="495" cy="113" r="5" style="fill:var(--accent)"/>
  <line x1="524" y1="60" x2="524" y2="250" style="stroke:var(--warn)" stroke-width="1.2" stroke-dasharray="5 4"/>
  <g class="s-label" style="font-weight:600">
    <text x="700" y="232" style="fill:var(--ink-3)">train</text>
    <text x="700" y="72" style="fill:var(--accent)">test</text>
    <text x="534" y="72" style="fill:var(--warn)">early stop: 63</text>
  </g>
  <text x="380" y="98" class="s-sub" style="fill:var(--accent)">minimum: stage 48, 0.4169</text>
</svg>`
    },

    { t: "code", lang: "python", title: "Learning rate × number of trees (executed; test AUC, depth 2)",
      hl: [2, 3, 4, 5],
      code: `#   ν        n = 10     30      100     300     1,000
#   1.0      0.688    0.719   0.641   0.622   0.596      <- fast, peaks early, then overfits hard
#   0.3      0.671    0.677   0.667   0.655   0.636
#   0.1      0.674    0.683   0.689   0.691   0.667      <- the usual compromise
#   0.03     0.666    0.674   0.683   0.686   0.690      <- still improving at 1,000: it needs ~3,000
# staged log-loss at ν = 0.1:  stage 1 0.438   10 0.423   30 0.420   60 0.418   100 0.425   200 0.434   500 0.484   1,000 0.565
# training log-loss at those stages: 0.434 -> 0.384 -> 0.350 -> 0.323 -> 0.295 -> 0.247 -> 0.166 -> 0.100`,
      caption: "ν and M are one dial, not two: the model's total movement is roughly ν × M, and the question is how many small steps versus how many large. Small steps win — every row's best score is at a lower ν with more trees — because each tree then fits less of the noise in the current residuals. The practical recipe: fix ν around 0.05–0.1, set M large, and let early stopping find the number."
    },

    { t: "code", lang: "python", title: "Depth and subsampling, with early stopping choosing the tree count (executed; ν = 0.05)",
      hl: [2, 3, 6, 7],
      code: `#   max_depth     stopped at    test AUC    log-loss
#   1 (stumps)       252          0.7036      0.4070      <- additive model: the churn logit IS additive
#   2                127          0.6919      0.4176
#   3                 93          0.6703      0.4289
#   5                 36          0.6647      0.4312
#   8                 32          0.5602      0.4921      <- deep trees fit the residual noise in a few stages, then stop; 0.14 AUC lost
#   subsample (depth 2):  1.0 -> 0.6919     0.8 -> 0.6851     0.5 -> 0.6781     0.3 -> 0.6859   (little to gain on 700 rows)`,
      caption: "Depth sets the interaction order each tree can express: stumps give an additive model, depth 2 pairwise interactions, and so on. On a target whose truth is additive, stumps win by 0.14 AUC over depth 8 — the deeper trees have the capacity to fit noise and use it in the first thirty stages. In practice depth 3–6 is the usual range for real interactions, and it is the second dial to search after the learning rate. Row subsampling helps more with more data; here it mostly adds variance."
    },

    { t: "code", lang: "python", title: "Where each family lands on the two course targets (executed, 5-fold)",
      hl: [3, 4, 5, 6, 12, 13],
      code: `# churn (AUC / log-loss)                        # spend regression (MAE)
#   logistic                  0.7299 / 0.4006     #   single tree, depth 8               7.90
#   forest, leaf 20           0.7216 / 0.4019     #   forest, leaf 3                     7.35
#   AdaBoost, 200 stumps      0.7348 / 0.5208     #   Extra Trees, leaf 3                7.28
#   GB depth 2, ν 0.05, 300   0.7044 / 0.4221     #   GB depth 3, ν 0.1, 300             7.34
#   HistGB defaults           0.6785 / 0.5499     #   GB depth 2, ν 0.1, 500             7.14
#   HistGB ν 0.05, depth 3,   0.7164 / 0.4051     #   GB Huber loss                      7.29
#          early stopping                         #   GB absolute-error loss             7.12    <- the loss is a parameter; MAE is the metric
#                                                 #   engineered column 6.34, noise floor 6.38
# AdaBoost's log-loss (0.52) is far worse than its AUC suggests: its scores are votes, not probabilities -- calibrate before quoting
# HistGB with defaults (ν 0.1, 100 iterations, 31 leaves) overfits 989 rows badly; tuned and early-stopped it is competitive`,
      caption: "On 989 rows with an additive truth nothing beats logistic regression by much, and boosting's advantage — bias reduction through interactions — has nothing to work on; on the kinked, multiplicative spend surface every tree ensemble beats the linear model threefold and boosting edges the forest. The two lessons: boosting needs tuning where a forest needs almost none (the untuned HistGB is the worst model in the table), and boosting's loss is a choice — fitting the absolute error directly gave the best MAE."
    },

    { t: "code", lang: "python", title: "Noise: 10 % of labels flipped on two moons (executed; accuracy against the CLEAN test labels)",
      hl: [2, 3, 5, 6],
      code: `#                                    clean test accuracy    training accuracy on the noisy labels
#   AdaBoost, 300 stumps                    0.912                   0.867
#   AdaBoost, 300 depth-3 trees             0.895                   1.000      <- fitted every flipped label; the exponential loss demanded it
#   GB, 300 depth-3, ν 0.1                  0.887                   0.990
#   GB, same, subsample 0.5                 0.917                   0.993
#   forest, 300, leaf 5                     0.922                   0.888      <- averaging ignores the noise; boosting chases it
# loss for a point at margin m = yF:   m = 0: exp 1.0 / log 0.69      -1: 2.7 / 1.31      -2: 7.4 / 2.13      -4: 54.6 / 4.02`,
      caption: "A mislabelled point is, to boosting, a point the model keeps getting wrong, so its weight grows every round until a tree is built for it; under the exponential loss the weight grows as e^{−margin}, without bound. The forest, which never looks at its own errors, is the most robust model here. The remedies for boosting are the ones in the table: weak learners, a bounded loss (log-loss grows linearly in the margin, exponential loss exponentially), subsampling, and stopping early."
    },

    { t: "table",
      head: ["", "Bagging / random forest", "Boosting"],
      rows: [
        ["Trees are", "Independent, on bootstrap samples, grown deep", "Sequential, each on the current pseudo-residuals, grown shallow"],
        ["Reduces", "Variance (bias unchanged)", "Bias, mostly; variance via shrinkage and subsampling"],
        ["More trees", "Never hurts", "Overfits past the optimum (0.719 → 0.596 at ν = 1)"],
        ["Key dials", "max_features, min_samples_leaf", "learning rate, n_estimators (early stopping), depth, subsample, loss"],
        ["Tuning burden", "Low", "High; defaults can be the worst model in the room"],
        ["Label noise", "Robust (0.922)", "Sensitive, especially exponential loss with deep trees (0.895)"],
        ["Parallel", "Trivially", "Across features/rows within a tree only"],
        ["Probabilities", "Compressed toward the base rate", "Fitted to log-loss; usually better calibrated (AdaBoost excepted)"],
        ["Typical winner", "Strong baseline; robust", "Best tabular accuracy when tuned (6.4)"]
      ]
    },

    { t: "ladder",
      title: "Boosting a demand model on 200,000 rows for a weekly forecast",
      rungs: [
        { level: "bad", label: "Defaults, many trees, no validation", code: `GradientBoostingRegressor(n_estimators=2000).fit(X, y)         # ν 0.1, depth 3, no subsample, no early stopping`,
          note: "**Two thousand trees at ν = 0.1 is far past the optimum** (the churn curve turned at 48); the training loss looks wonderful and the forecast is fitted noise." },
        { level: "ok", label: "Small rate, early stopping, depth searched", code: `HistGradientBoostingRegressor(learning_rate=0.05, max_iter=3000, early_stopping=True, validation_fraction=0.1, n_iter_no_change=50, max_depth=d)   # d in {3, 4, 6, 8} by CV`,
          note: "**The number of trees chosen by the data**, the depth by CV, and the histogram implementation fast enough to search on 200,000 rows." },
        { level: "best", label: "The loss matched to the metric, subsampling, and the stopping set that respects time", code: `HistGradientBoostingRegressor(loss="absolute_error" or "poisson" or "quantile", learning_rate=0.03, max_iter=5000, early_stopping=True, l2_regularization=1.0, max_features=0.8)
# validation slice = the LAST weeks, not a random 10 % (10.1); ν × best_iter reported; refit on all data with the found iteration count`,
          note: "**Loss = the business metric, regularised and subsampled, early-stopped on a time-respecting slice, and refitted on everything at the chosen count** — the working recipe for boosted models." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A fourth AdaBoost round, a log-loss stage by hand, and a curve you must read",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** Starting from the round-3 weights [0.125 ×3, 0.102 ×3, 0.065 ×3, 0.125], find the best stump for round 4 (search thresholds x ≤ 0.5 … 8.5, both orientations), compute ε₄ and α₄, and state whether the ensemble still classifies all ten points correctly after adding it. **(b)** For a two-row toy with F₀ = −1.638 (churn base rate) and labels [1, 0], compute the pseudo-residuals, then the Newton leaf step Σr / Σp(1 − p) if both rows share one leaf, and the new logits at ν = 0.1. **(c)** From the staged curve (train 0.434 → 0.100, test minimum 0.4169 at stage 48, test 0.565 at stage 1,000), sketch what changes if ν is halved to 0.05: where does the minimum move, does its value change much, and what does early stopping with 20-round patience risk at the smaller rate?" }
      ],
      requirements: [
        "(a) the round-4 stump, ε₄, α₄ and the ensemble's error count.",
        "(b) the residuals, the leaf step and the updated logits.",
        "(c) the three predictions about the ν = 0.05 curve, with reasoning."
      ],
      hint: "(a) The weights now sit on x = 0, 1, 2, 9 (0.125 each): a stump that gets those right is favoured. (b) p = σ(−1.638) = 0.163; the Newton step is the leaf value scikit-learn uses for log-loss. (c) Total movement ≈ ν × M.",
      solution: {
        lang: "python",
        title: "boosting_practice.py",
        code: `# (a) round-4 weights: x=0,1,2 -> 0.125; x=3,4,5 -> 0.102; x=6,7,8 -> 0.065; x=9 -> 0.125   (sum 1.0)
#   candidate x <= 2.5 -> +:  wrong on x = 6,7,8 (should be +, predicted -)  ->  ε = 3 × 0.065 = 0.195
#   candidate x <= 8.5 -> +:  wrong on x = 3,4,5                              ->  ε = 3 × 0.102 = 0.306
#   candidate x <= 5.5 -> -:  wrong on x = 0,1,2,9                            ->  ε = 4 × 0.125 = 0.500  (useless now: those points are heavy)
#   best: x <= 2.5 -> +, ε₄ = 0.195, α₄ = ½ ln(0.805/0.195) = 0.710
#   F₄ = F₃ + 0.710 h₄:  x=0,1,2: 0.32 + 0.71 = 1.03;  x=3,4,5: -0.53 - 0.71 = -1.24;  x=6,7,8: 0.98 - 0.71 = 0.27;  x=9: -0.32 - 0.71 = -1.03
#   signs unchanged: still 0 errors, and the margins on x = 0..5 and 9 grew. Boosting keeps enlarging margins after training error hits zero --
#   which is the margin-theory explanation of why AdaBoost often does not overfit as fast as its capacity suggests.

# (b) p₀ = σ(-1.638) = 0.163 for both rows
#   pseudo-residuals r = y - p:  row 1 (y=1): +0.837;  row 2 (y=0): -0.163
#   Newton leaf value = Σ r / Σ p(1-p) = (0.837 - 0.163) / (2 × 0.163 × 0.837) = 0.674 / 0.2729 = 2.470
#   new logits at ν = 0.1:  -1.638 + 0.1 × 2.470 = -1.391 for both rows  ->  p = 0.199
#   (one leaf for both rows can only move them together; a split between them would give leaf steps of +6.14 and -1.19 -- the sign
#    of each row's residual -- and that is what a real tree does)

# (c) halving ν to 0.05:
#   the minimum moves to roughly twice the stage (≈ 100), because total movement ≈ ν × M and the same amount of fitting is needed;
#   its VALUE improves slightly or stays flat -- smaller steps average more trees over the same structure (the ν = 0.03 row was still
#   improving at 1,000 and ended above the ν = 0.1 row's best);
#   early stopping with 20-round patience risks stopping too early: at a small rate the curve is flatter, 20 rounds can pass without a
#   0.0001 improvement on a 20 % slice, and the run halts on a plateau that is still descending. Scale the patience with 1/ν.`,
        notes: [
          { t: "p", text: "**(a)** shows AdaBoost after zero training error: it keeps going, and what it optimises is the margin. The exponential loss never reaches zero, so there is always a gradient." },
          { t: "p", text: "**(b)** is the leaf value most explanations skip: for log-loss the leaf is not the mean residual but a Newton step, Σr / Σp(1 − p), which is why boosted classifiers converge in tens of stages rather than thousands." },
          { t: "p", text: "**(c)** is the practical calculus of ν, M and patience: they are one budget, and the patience must be sized to the rate." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Three stumps that individually misclassify 3, 3 and 4 of ten points classify all ten correctly together. What made that possible?",
          options: [
            "Averaging reduces variance",
            "Each stump was fitted to re-weighted data that emphasised the previous stumps' mistakes, so they err on *different* points, and their votes were weighted by α = ½ ln((1 − ε)/ε) (0.424, 0.650, 0.752); the weighted sum has the right sign everywhere even though no single vote does. Sequential error-correction reduces bias, which is what a stump has in excess",
            "The third stump was more accurate than the first two",
            "The data were linearly separable"
          ],
          answer: 1,
          why: "The ensemble F = [+0.32, +0.32, +0.32, −0.53, −0.53, −0.53, +0.98, +0.98, +0.98, −0.32] matches every label's sign."
        }
      ]
    }
  ],

  takeaways: [
    "**Boosting fits trees sequentially, each to the current errors**; it reduces bias where bagging reduces variance.",
    "**AdaBoost by hand**: ε 0.300 → α 0.424; wrong points × 1.528, right × 0.655, normalise; three stumps → zero errors; scikit-learn's weights are 2α.",
    "**AdaBoost minimises the exponential loss**, which grows as e^{−margin} (54.6 at margin −4 vs log-loss 4.0) — hence its noise sensitivity (fitted every flipped label: 1.000 train, 0.895 clean test).",
    "**Gradient boosting is gradient descent in function space**: pseudo-residuals rᵢ = −∂L/∂F, a small tree fitted to them, Fₘ = Fₘ₋₁ + ν hₘ. Squared loss → residuals; log-loss → y − p with Newton leaf steps.",
    "**By hand it matches the library**: F₃ = [1.465, 1.465, 3.105, 3.105, 4.630, 4.630] to three decimals.",
    "**ν and M are one budget**: ν = 1.0 peaks at 30 trees and collapses to 0.596; ν = 0.03 is still improving at 1,000. Small rate, many trees, early stopping.",
    "**The staged curve**: training loss 0.434 → 0.100, test minimum 0.4169 at stage 48, 0.565 at 1,000; early stopping found 63.",
    "**Depth = interaction order**: stumps 0.7036 vs depth 8 0.5602 on an additive truth; search depth after the rate.",
    "**The loss is a parameter**: absolute-error boosting gave the best spend MAE (7.12); AdaBoost's votes need calibration (log-loss 0.52 at AUC 0.735).",
    "**Untuned boosting can be the worst model in the room** (HistGB defaults 0.679 vs logistic 0.730); a forest needs no tuning to be second-best."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Explain the AdaBoost weight update and why α has the form ½ ln((1 − ε)/ε).",
        options: [
          "Weights are set to the residuals; α is arbitrary",
          "After each round, every point's weight is multiplied by exp(−α y h(x)): correct points shrink by e^{−α}, wrong ones grow by e^{α}, then weights are normalised, so the next learner concentrates on the mistakes. α is the exact minimiser of the exponential loss for the new learner's contribution, giving zero vote at ε = 0.5, a large vote as ε → 0, and a negative one (invert the learner) for ε > 0.5",
          "Weights are uniform; α is the accuracy",
          "Weights double for wrong points; α = 1 − ε"
        ],
        answer: 1,
        why: "With ε = 0.3: α = 0.424, wrong points × 1.528, right × 0.655 — three points went from 30 % of the weight to 50 %."
      },
      {
        stem: "Why is it called *gradient* boosting, and what are the pseudo-residuals for log-loss?",
        options: [
          "Because it uses gradient descent to fit each tree's splits",
          "Because each stage moves the model's predictions in the direction of the negative gradient of the loss with respect to those predictions — gradient descent in function space — and a tree is fitted to that gradient vector to extend it to new inputs. For log-loss the negative gradient is y − p: a churner rated 0.16 has residual +0.84. Any differentiable loss works the same way",
          "Because the learning rate is a gradient",
          "Because the residuals are always y − F"
        ],
        answer: 1,
        why: "For squared loss the gradient happens to be the ordinary residual, which is why the method is often introduced as 'fit the residuals'."
      },
      {
        stem: "A colleague sets learning_rate = 1.0 and n_estimators = 1,000 'to be thorough'. What happens?",
        options: [
          "The model converges faster and better",
          "It overfits severely: at ν = 1.0 the test AUC peaked at 30 trees (0.719) and fell to 0.596 by 1,000, because each full-size step fits the noise in the current residuals and later trees fit the noise of earlier ones. Use ν ≈ 0.05–0.1 with a large tree budget and early stopping on a validation slice, which chose 63 trees here",
          "Nothing; more trees never hurt boosting",
          "The training loss rises"
        ],
        answer: 1,
        why: "Boosting is the ensemble where more trees *does* hurt; the forest is the one where it does not."
      },
      {
        stem: "Why did depth-1 trees beat depth-8 trees by 0.14 AUC on the churn target, and when would deeper trees win?",
        options: [
          "Stumps are always better in boosting",
          "Tree depth is the interaction order the ensemble can express; the churn logit is additive, so stumps have exactly the right capacity and deep trees spend it fitting residual noise in the first thirty stages. Deeper trees (3–6) win when real interactions exist — the spend surface's product of fee and tenure — and depth is the second dial to search after the learning rate",
          "Because deeper trees need more data",
          "Because early stopping favours stumps"
        ],
        answer: 1,
        why: "Depth 8 stopped after 32 stages with test AUC 0.560: fast, confident, wrong."
      },
      {
        stem: "Which ensemble would you choose for data with substantial label noise, and why?",
        options: [
          "AdaBoost with deep trees; it corrects errors",
          "A random forest (0.922 clean-test accuracy against AdaBoost's 0.895 and plain GB's 0.887): averaging never looks at its own errors, while boosting re-weights every mislabelled point until a tree is built for it — under the exponential loss the weight grows as e^{−margin} without bound. If boosting is required, use log-loss, stumps or shallow trees, subsampling (0.917) and early stopping",
          "Gradient boosting with a large learning rate",
          "A single deep tree"
        ],
        answer: 1,
        why: "The depth-3 AdaBoost fitted the noisy training labels to 100 % — every flip became a rule."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain gradient boosting from first principles, and how it differs from a random forest.",
        strong: "Both are ensembles of trees, but a forest grows its trees independently on bootstrap samples and averages them, which reduces variance and leaves bias alone; boosting grows them one at a time, each fitted to what the ensemble so far gets wrong, which reduces bias. Formally it is forward stagewise additive modelling by gradient descent in function space: start from a constant, and at each stage compute the negative gradient of the loss with respect to the current prediction at every training row — for squared loss that is the residual y − F, for log-loss it is y − p — fit a small tree to those values, and add it to the model scaled by a learning rate. On six points with stumps and a rate of 0.5 I can do it by hand and match scikit-learn to three decimals after three stages. The consequences of the sequential structure: more trees eventually overfit, so the count is chosen by early stopping on a validation slice; the learning rate and the tree count form one budget, and small rates with many trees generalise best; tree depth sets the interaction order; and any differentiable loss can be plugged in, which is why 'gradient' is in the name. A forest needs almost no tuning and is robust to label noise; boosting needs tuning and chases mislabelled points, but tuned it is usually the more accurate model on tabular data.",
        answer: [
          { t: "p", text: "Variance versus bias, the functional-gradient derivation with the two pseudo-residuals, the hand check, and the four practical consequences." }
        ]
      },
      {
        level: "core",
        q: "How do you tune a gradient boosting model?",
        strong: "In a fixed order, because the dials interact. First the learning rate and the tree count together: I fix the rate around 0.05 to 0.1, set the tree budget high and let early stopping on a held-out slice pick the count — on the churn data the test loss bottomed at stage 48 with a rate of 0.1 and early stopping with twenty rounds' patience found 63; at a rate of 1.0 the model peaked at 30 trees and collapsed, and at 0.03 it was still improving at a thousand. Then tree depth, which sets the interaction order: stumps beat depth 8 by 0.14 AUC on an additive target, and depth 3 to 6 is where real interactions live. Then regularisers — row subsampling, feature subsampling, L2 on the leaf values, minimum rows per leaf — which mostly help with more data. Throughout I match the loss to the metric — absolute error, Poisson, quantile — because the loss is a parameter, not a fixed choice. I keep the validation slice honest, which for time-ordered data means the last period rather than a random fraction, and I refit on all the data at the chosen iteration count. And I benchmark against a forest and a linear model, because the untuned boosting defaults were the worst model in my comparison and the tuned one was only competitive on 989 rows.",
        answer: [
          { t: "p", text: "Rate and count with early stopping, then depth, then regularisers, then the loss — with the executed numbers and the honest-validation caveat." }
        ]
      },
      {
        level: "advanced",
        q: "AdaBoost keeps improving test performance after its training error reaches zero. How is that possible?",
        strong: "Because the exponential loss it minimises never reaches zero: a point on the correct side of the boundary still contributes exp(−margin), so every round has a gradient and the algorithm keeps adding learners. What those rounds do is enlarge the margins — in my fourth hand-computed round, after three stumps had already classified all ten points correctly, the best stump had weighted error 0.195 and vote 0.709, the signs of the ensemble did not change, and the margins on seven of the ten points grew. Larger margins on the training data bound the generalisation error more tightly, which is the margin-theory explanation of why AdaBoost resists overfitting far longer than its capacity would suggest. The same mechanism is its weakness with noise: a mislabelled point has a negative margin, its loss grows as e^{−margin} without bound, and the algorithm devotes rounds to it — a depth-3 AdaBoost fitted 100 % of noisy training labels and lost three points of clean accuracy against a forest. So the phenomenon is real, it is about margins rather than error, and it holds only when the labels are worth fitting.",
        answer: [
          { t: "p", text: "The non-vanishing exponential loss, the executed fourth round, margin theory, and the noise caveat with numbers." }
        ]
      }
    ]
  }
});
