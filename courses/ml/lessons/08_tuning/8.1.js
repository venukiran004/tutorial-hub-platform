/* ============================================================================
   LESSON 8.1 — Hyperparameter Search
   ========================================================================= */
EC.receiveLesson({
  id: "8.1",

  lede: "**A hyperparameter is a setting the training procedure cannot learn — the learning rate, the depth, C, γ, k — so it is chosen by searching, and the search is itself a statistical procedure with a budget, a variance and a leak.** This lesson runs the four search strategies on one budget and one problem, and finds them tied where the problem is easy (grid 0.9636, random 0.9644, TPE 0.9644 in 30 fits) and separated where it is not (in six dimensions TPE overtakes random by trial 20 and finishes ahead, 0.8827 to 0.8814, with both above the defaults' 0.8763). It proves the case for random over grid with a probability and a simulation (grid's best 0.670 against random's 0.971 when one narrow dimension matters), computes expected improvement by hand at three candidate points, and then measures the thing every tuned score hides: the best of many noisy estimates is biased upward — 0.740 on pure noise with 60 rows and 200 configurations — and only nested cross-validation reports what the tuned model will actually do (0.515 tuned versus 0.449 nested on noise).",

  objectives: [
    "Explain why random search beats grid search when few dimensions matter, with the probability argument",
    "Run grid, random, Bayesian (TPE) and successive-halving searches on one budget and read their trade-offs",
    "Compute expected improvement from a surrogate's mean and standard deviation, and explain exploration versus exploitation",
    "Use nested cross-validation to get an honest score, refit correctly, and control reproducibility and cost"
  ],

  prerequisites: ["2.7", "3.6", "6.3"],

  blocks: [

    { t: "h2", n: "01", text: "Grid versus random: the argument and the measurement", id: "random" },

    { t: "code", lang: "text", title: "Why random search wins when only a few dimensions matter (executed)",
      code: `the probability argument:  if the good region is the top 5 % of the space, n random draws miss it all with probability 0.95ⁿ
   n = 10: P(at least one hit) = 0.401      n = 20: 0.642      n = 60: 0.954      n = 100: 0.994       -- independent of how many dimensions the space has

the coverage argument:  a 5 × 5 grid over (x₁, x₂) evaluates 25 points but only 5 DISTINCT values of x₁; 25 random points evaluate 25 distinct values of each.
   if only x₁ matters (the usual case: Bergstra & Bengio found one to three parameters matter in most problems), the grid wasted 20 of 25 evaluations.

simulation:  f(x₁, x₂) = exp(-((x₁ - 0.31) / 0.08)²) + 0.1 x₂     -- a narrow peak on x₁ at 0.31, a weak slope on x₂; maximum 1.10
   25-point grid (x₁ ∈ {0, 0.25, 0.5, 0.75, 1}):    best found 0.670, every time -- the grid never lands near 0.31
   25 random points, 500 repetitions:               best found 0.971 on average; 10th-90th percentile 0.810-1.076`,
      caption: "A grid is a promise to test every combination of a few values per axis, which is exactly wrong when the response depends on one or two axes at fine resolution. Random search spends the same budget on distinct values of every axis and cannot be systematically unlucky. The practical corollary: sample continuous hyperparameters from log-uniform distributions (C, γ, learning rate, λ span orders of magnitude) and integers from wide ranges, and let the budget rather than the grid size decide how many trials to run."
    },

    { t: "code", lang: "python", title: "One budget, four searches: an RBF SVM on 2,000 rows, 30 fits of 5-fold AUC each (executed)",
      hl: [2, 3, 4, 7, 8],
      code: `#   search                                  best CV AUC     at                          time
#   grid, 5 C × 6 γ = 30 configs            0.9636          C = 1000, γ = 0.01          5 s
#   random, 30 configs (log-uniform)        0.9644          C = 21.6, γ = 0.048         3 s
#   Optuna TPE, 30 trials                   0.9644          C = 5.55, γ = 0.073         4 s
#   best-so-far after 5 / 10 / 20 / 30 trials -- random: 0.9644 at every checkpoint;  TPE: 0.9644 at every checkpoint
#   successive halving, 60 candidates, factor 3, starting at 250 rows
#                                           0.9477          C = 763, γ = 0.0075         2 s      <- rounds: 60 candidates on 250 rows, 20 on 750; the winner at 250 rows was not the winner at 2,000
#   two random searches of 10 with different seeds: best 0.9644 vs 0.9595, C = 5.55 vs 1.22`,
      caption: "On an easy two-dimensional problem the smart methods have nothing to be smart about: a broad plateau of good (C, γ) pairs means the fifth random trial is already on it. Successive halving is the cautionary row — it eliminates candidates on a 250-row subsample, and an SVM's best regularisation at 250 rows is not its best at 2,000, so the surviving candidate was wrong. Halving assumes the ranking at small resources predicts the ranking at full; that holds for iteration counts of a boosting model far better than for sample sizes of a kernel method."
    },

    { t: "viz",
      title: "TPE against random search in six dimensions (executed; HistGradientBoosting, 40 trials, mean of three seeds)",
      caption: "Best cross-validated AUC found so far. TPE's first ten trials are random (its start-up phase) and then it models where the good configurations are: it overtakes random search by trial 20 and finishes at 0.8827 against 0.8814, both above the library defaults at 0.8763. A modest, consistent gain — and the 40 trials cost 12 minutes of compute either way.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two lines of best-so-far cross-validated AUC against trial number from 5 to 40. Random search rises from 0.874 to 0.881. TPE starts lower at 0.866, crosses random search near trial 20 and finishes at 0.883. A dashed horizontal line marks the default configuration at 0.876.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="250" x2="820" y2="250"/><line x1="80" y1="40" x2="80" y2="250"/></g>
  <g class="s-sub">
    <text x="72" y="243" text-anchor="end">0.866</text><text x="72" y="201" text-anchor="end">0.870</text><text x="72" y="149" text-anchor="end">0.875</text><text x="72" y="96" text-anchor="end">0.880</text><text x="72" y="54" text-anchor="end">0.884</text>
    <text x="100" y="270" text-anchor="middle">5</text><text x="200" y="270" text-anchor="middle">10</text><text x="400" y="270" text-anchor="middle">20</text><text x="600" y="270" text-anchor="middle">30</text><text x="800" y="270" text-anchor="middle">40</text>
    <text x="400" y="290">trials</text>
  </g>
  <line x1="80" y1="131" x2="820" y2="131" style="stroke:var(--ink-3)" stroke-width="1.2" stroke-dasharray="6 4"/>
  <polyline fill="none" style="stroke:var(--ink-3)" stroke-width="2.2" points="100,159 200,96 400,96 600,88 800,77"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.4" points="100,236 200,129 400,78 600,67 800,64"/>
  <g class="s-label" style="font-weight:600">
    <text x="640" y="110" style="fill:var(--ink-3)">random: 0.8814</text>
    <text x="640" y="58" style="fill:var(--accent)">TPE: 0.8827</text>
    <text x="90" y="124" style="fill:var(--ink-3)">defaults 0.8763</text>
  </g>
  <text x="210" y="140" class="s-sub" style="fill:var(--accent)">10 random start-up trials</text>
</svg>`
    },

    { t: "dl", items: [
      ["Grid search", "Every combination of listed values. Exhaustive, parallel, and wasteful when few axes matter; cost multiplies with each axis."],
      ["Random search", "n draws from per-parameter distributions. Budget-controlled, embarrassingly parallel, cannot be systematically unlucky. The default for a first pass."],
      ["Bayesian optimisation", "Fit a surrogate (Gaussian process or TPE) to the trials so far; choose the next trial by an acquisition function that trades the predicted score against uncertainty. Sequential; wins when trials are expensive and the space is large."],
      ["TPE", "Tree-structured Parzen estimator: models p(x | good) and p(x | bad) over the trials and samples where their ratio is highest. Optuna's default; handles conditional and integer parameters."],
      ["Expected improvement", "EI(x) = σ(x)[ZΦ(Z) + φ(Z)], Z = (μ(x) − f*)/σ(x): the expected amount by which a trial at x beats the best so far. Large where μ is high or σ is large."],
      ["Successive halving / Hyperband", "Start many candidates on a small resource (rows or iterations), keep the best 1/factor, multiply the resource, repeat. Hyperband runs several halving brackets with different starting resources."],
      ["Nested CV", "An outer loop that holds out data the inner search never sees. The outer score is the honest estimate of the tuned procedure; the inner best_score_ is not."],
      ["Refit", "After the search, retrain the chosen configuration on all training rows (`refit=True`). The searched model saw only k − 1 folds; the deployed one should see everything."]
    ]},

    { t: "h2", n: "02", text: "Bayesian optimisation: the acquisition function by hand", id: "bayesian" },

    { t: "code", lang: "text", title: "Expected improvement at three candidates, best score so far f* = 0.80 (executed)",
      code: `the surrogate gives, at any candidate x, a predicted mean μ(x) and a standard deviation σ(x) (a Gaussian process posterior, or TPE's density ratio)
EI(x) = E[max(0, f(x) - f*)] = σ [ Z Φ(Z) + φ(Z) ],    Z = (μ - f*) / σ        Φ = normal CDF, φ = normal pdf

candidate A   μ = 0.82   σ = 0.02     Z = 1.00     EI = 0.02 × [1.00 × 0.8413 + 0.2420] = 0.0217      <- confidently a little better: exploit
candidate B   μ = 0.78   σ = 0.10     Z = -0.20    EI = 0.10 × [-0.20 × 0.4207 + 0.3910] = 0.0307     <- predicted worse, but so uncertain it might be much better: explore
candidate C   μ = 0.81   σ = 0.06     Z = 0.17     EI = 0.06 × [0.17 × 0.5675 + 0.3934] = 0.0293
the next trial goes to B. After it is evaluated the surrogate is updated and the three EIs are recomputed.`,
      caption: "The acquisition function is where the exploration–exploitation balance lives: a candidate with a lower predicted score can have the higher expected improvement because its uncertainty leaves room above the incumbent, and once it is tried that uncertainty collapses. GP-based methods scale badly beyond a few hundred trials and a dozen dimensions; TPE replaces the GP with two density estimates and handles integer, categorical and conditional parameters, which is why Optuna uses it. Both are sequential by nature, which is the cost: random search runs all trials at once."
    },

    { t: "code", lang: "python", title: "Optuna, the idiom",
      code: `def objective(trial):
    params = dict(learning_rate=trial.suggest_float("lr", 0.005, 0.5, log=True),         # log scale for anything spanning decades
                  max_iter=trial.suggest_int("iters", 30, 600, log=True),
                  max_leaf_nodes=trial.suggest_int("leaves", 4, 128, log=True),
                  min_samples_leaf=trial.suggest_int("leaf", 5, 200, log=True),
                  l2_regularization=trial.suggest_float("l2", 1e-3, 30, log=True),
                  max_features=trial.suggest_float("colsample", 0.3, 1.0))
    return cross_val_score(HistGradientBoostingClassifier(**params), X, y, cv=cv, scoring="roc_auc").mean()
study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=0, n_startup_trials=10))
study.optimize(objective, n_trials=40, timeout=3600)                                # a time budget as well as a trial budget
study.best_params; study.trials_dataframe()                                           # every trial, for the best-so-far curve and parameter importances
# pruning: report intermediate scores (per boosting iteration, per epoch) and let a MedianPruner stop hopeless trials early`,
      caption: "Three habits make the search honest and cheap: log-scale ranges, a time budget alongside the trial budget, and pruning of trials whose partial score is already below the median. The trials dataframe is the audit trail — it gives the best-so-far curve above, the parameter importances, and the evidence for whether the search had converged or was still climbing when the budget ran out."
    },

    { t: "h2", n: "03", text: "The tuned score is biased; nested CV is the fix", id: "nested" },

    { t: "code", lang: "python", title: "The winner's curse, measured on targets with no signal at all (executed)",
      hl: [2, 3, 4, 7],
      code: `# pure noise, 200 random SVC configurations, 3-fold CV AUC (chance = 0.5)
#   n = 60 rows      best 0.740     median across configs 0.703     sd across configs 0.064      <- this particular 60-row draw has chance structure (default SVC 0.69) and tuning inflates it further
#   n = 200          best 0.536     median 0.505                    sd 0.035
#   n = 1,000        best 0.517     median 0.492                    sd 0.010
# the best of many noisy estimates is biased upward by roughly (number of configurations, spread of the estimates); more rows shrink the spread

# nested vs plain on 200 noise rows, 60 configurations:   plain tuned best_score_ 0.515     nested outer score 0.449     (truth: 0.5)
# nested vs plain on a real 600-row problem, 36 configurations:   plain 0.8763     nested outer 0.8721 ± 0.029     optimism +0.004`,
      caption: "`best_score_` is the maximum over configurations of a cross-validated estimate, and the maximum of noisy numbers is not an unbiased estimate of anything. The bias is small when the estimates are precise (many rows, few configurations: +0.004 on the 600-row problem) and large when they are not (60 rows, 200 configurations: 0.74 on nothing). Nested cross-validation puts the whole search inside an outer fold so that the reported score comes from rows the search never touched; it is the only number to quote as 'expected performance of the tuned procedure'."
    },

    { t: "code", lang: "python", title: "Nested CV, and what to do after it",
      code: `outer = StratifiedKFold(5, shuffle=True, random_state=1); inner = StratifiedKFold(3, shuffle=True, random_state=2)
search = GridSearchCV(model, grid, cv=inner, scoring="roc_auc")           # or RandomizedSearchCV / an Optuna objective
outer_scores = cross_val_score(search, X, y, cv=outer, scoring="roc_auc")   # each outer fold: search on 4/5, score the refitted winner on 1/5
# report outer_scores.mean() ± std as the performance of 'this model, tuned this way'
# then: search.fit(X, y) ONCE on all rows to choose the final configuration, and refit it on all rows (refit=True does this)
# the outer folds may choose different configurations -- that is information about the search's stability, not a problem to hide`,
      caption: "Nested CV costs (outer folds) × (inner folds) × (configurations) fits — 5 × 3 × 36 = 540 here — and it answers a question the plain search cannot: not 'which configuration is best' but 'how good is a model chosen this way'. The final model is chosen by one more search on all the data and refitted on all the data; the outer score is what you report for it, because the procedure that produced it is what was evaluated."
    },

    { t: "callout", kind: "production", title: "Refit, seeds, warm starts and the budget", body: [
      { t: "p", text: "**Refit**: `best_estimator_` is retrained on every training row with the chosen parameters — the model the search scored saw only k − 1 folds, and the deployed one should see everything (confirmed: identical to a manual refit). **Seeds**: fix `random_state` on the search, the folds and the model, and report that two seeds of a 10-trial random search chose C = 5.55 and C = 1.22 with 0.9644 and 0.9595 — the search has variance too. **Warm starts**: for a sweep over n_estimators, grow one model with `warm_start=True` (1.9 s) rather than refitting at each size (3.6 s); for boosting, early stopping does the same job in one fit. **Budget**: decide the number of fits before starting, from the time per fit; use halving on iteration counts (not sample sizes for kernel methods), pruning in Optuna, and `n_jobs=-1` for grid and random, which are embarrassingly parallel where Bayesian methods are sequential." }
    ]},

    { t: "table",
      head: ["Method", "Parallel?", "Handles", "Best when", "Fails when", "scikit-learn / library"],
      rows: [
        ["Grid", "Fully", "Discrete lists", "≤ 2–3 axes with a few values each; reproducing a published sweep", "Continuous axes at fine resolution; many axes", "`GridSearchCV`"],
        ["Random", "Fully", "Any distribution", "A first pass; many axes; unknown ranges", "Trials are very expensive and few", "`RandomizedSearchCV`"],
        ["Bayesian (GP)", "Sequential (batch variants)", "Continuous, low-dimensional", "Expensive trials, smooth response", "Hundreds of trials; conditional spaces", "scikit-optimize, BoTorch"],
        ["TPE", "Sequential (batch OK)", "Mixed, conditional, integer", "Large mixed spaces with tens to hundreds of trials", "Very few trials (its start-up is random)", "Optuna, Hyperopt"],
        ["Successive halving", "Fully", "Any", "The resource predicts the final ranking: boosting iterations, epochs", "Sample-size subsets change the optimum (the SVM: 0.9477)", "`HalvingRandomSearchCV`"],
        ["Hyperband", "Fully", "Any", "Unknown best starting resource: several halving brackets", "Same as halving", "Optuna's HyperbandPruner, Ray Tune"]
      ]
    },

    { t: "ladder",
      title: "Tuning a gradient-boosted model for a quarterly credit-risk refresh",
      rungs: [
        { level: "bad", label: "A 6-axis grid, best_score_ reported", code: `GridSearchCV(gb, {6 axes × 5 values}, cv=5).fit(X, y); print(grid.best_score_)     # 15,625 configurations × 5 folds`,
          note: "**78,000 fits, most of them on axes that do not matter, and a reported score that is the maximum of 15,625 noisy estimates.**" },
        { level: "ok", label: "Random search with log-uniform ranges, a budget, refit", code: `RandomizedSearchCV(gb, dists, n_iter=60, cv=5, scoring="roc_auc", n_jobs=-1, random_state=0).fit(X, y)   # 300 fits`,
          note: "**Budgeted, parallel, well-spread** — the score is still the tuned maximum, and the iteration count is being searched rather than early-stopped." },
        { level: "best", label: "TPE with early stopping inside each trial, nested outer estimate, one final refit", code: `# inner: Optuna TPE, 60 trials, early stopping on a validation slice sets the iteration count; MedianPruner kills weak trials
# outer: 5 time-ordered folds around the whole search -> the number reported to risk committee
# final: one search on all rows, refit at the early-stopped count on all rows; log every trial, the seed, and the library versions`,
          note: "**The search is cheap where it can be, honest about its own optimism, and reproducible** — the three things a model that is refitted every quarter needs." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A probability, an acquisition, and an optimism you must measure",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** If the good region is the top 2 % of the space, how many random trials give a 90 % chance of at least one hit? How does the answer change if the space has 3 versus 30 dimensions? **(b)** With f* = 0.90 and candidates (μ, σ) = (0.91, 0.01), (0.88, 0.05), (0.90, 0.03), compute EI for each and say which is tried next and why; then state what a purely greedy rule (maximise μ) would choose and what it risks. **(c)** Build a pure-noise binary target with 100 rows and 10 features, run a 100-configuration random search of a random forest with 5-fold CV, and report best_score_; then wrap the same search in a 5-fold outer loop and report the nested score. Explain the gap in terms of the number of configurations and the per-configuration noise." }
      ],
      requirements: [
        "(a) the trial count and the dimension argument.",
        "(b) three EI values, the choice, and the greedy contrast.",
        "(c) the two scores and the explanation."
      ],
      hint: "(a) Solve 1 − 0.98ⁿ ≥ 0.9. (b) EI = σ[ZΦ(Z) + φ(Z)] with Z = (μ − f*)/σ. (c) `cross_val_score(RandomizedSearchCV(...), X, y, cv=outer)`.",
      solution: {
        lang: "python",
        title: "search_practice.py",
        code: `# (a) 1 - 0.98^n ≥ 0.9  ->  0.98^n ≤ 0.1  ->  n ≥ ln(0.1)/ln(0.98) = 114 trials.
#   the calculation does not mention dimensions: 'top 2 % of the space' is a volume fraction, and random draws hit it with the same
#   probability in 3 or 30 dimensions. What changes with dimension is the GRID: 2 % resolution on each of 30 axes is impossible, while
#   114 random draws still test 114 distinct values of every axis.

# (b) f* = 0.90  (executed)
#   (0.91, 0.01): Z = 1.0    EI = 0.01 × [1.0 × 0.8413 + 0.2420] = 0.0108
#   (0.88, 0.05): Z = -0.4   EI = 0.05 × [-0.4 × 0.3446 + 0.3683] = 0.0115
#   (0.90, 0.03): Z = 0.0    EI = 0.03 × [0 + 0.3989] = 0.0120          <- tried next: at the incumbent's level with enough uncertainty to be worth a look
#   greedy-on-μ would pick the first (0.91) and keep refining a region it already knows; it never learns whether the (0.88, 0.05) region hides
#   a 0.95. EI ranks the three the other way round from the means. Exploitation without exploration converges to the first good basin found.

# (c) executed: 100 rows of pure noise, 10 features, random forest, 100 random configurations, 5-fold
#   best_score_ 0.590     median across the 100 configurations 0.554     sd across configurations 0.024
#   nested outer score 0.618
#   two effects, and this draw shows both. The max over 100 configurations sits 0.036 above the median configuration -- the winner's curse.
#   And the nested score is ALSO above 0.5: this particular 100-row draw has chance structure that every fold shares (the 60-row SVC case in
#   the lesson was the same), so cross-validation of any kind reports it as signal. On 200 rows the lesson's nested score was 0.449 against a
#   tuned 0.515. At 100 rows both numbers are unreliable: the winner's curse is one problem, and the fold spread is the other.`,
        notes: [
          { t: "p", text: "**(a)**: the number of trials for random search is set by the size of the good region, not by the number of axes — the reverse of a grid." },
          { t: "p", text: "**(b)** is worth doing slowly: with three candidates the greedy pick, the exploratory pick and the EI pick can all differ, and EI's answer depends on both moments." },
          { t: "p", text: "**(c)** is the experiment to run once so that every future `best_score_` is read with the right suspicion — and a reminder that at 100 rows the estimate itself, nested or not, is noise." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Successive halving on the SVM problem returned a configuration scoring 0.9477 when random search found 0.9644 in the same time. What went wrong?",
          options: [
            "Too few candidates",
            "Halving eliminated candidates on 250-row subsamples and assumed the ranking there predicts the ranking on 2,000 rows; for a kernel SVM the best C and γ depend on the sample size, so the survivor of the small-resource rounds was the wrong one. Halving is safe when the resource is a training-length dial (boosting iterations, epochs) whose partial results order the candidates correctly, and risky when it is the sample size",
            "The factor should have been 2",
            "Halving cannot be used with continuous parameters"
          ],
          answer: 1,
          why: "The assumption is that early performance ranks candidates like final performance; check it before trusting the speed-up."
        }
      ]
    }
  ],

  takeaways: [
    "**Random beats grid when few axes matter**: 1 − 0.95ⁿ hits the top 5 % with 60 trials (95 %); 25 random points found 0.971 where a 25-point grid found 0.670 — and the argument does not depend on dimension.",
    "**Sample on log scales**, budget by time and trials, and let random search be the first pass.",
    "**On easy problems every method ties** (0.964 in 30 fits); **in six dimensions TPE overtakes random by trial 20** (0.8827 vs 0.8814, defaults 0.8763) — a modest, consistent gain for a sequential method.",
    "**Expected improvement = σ[ZΦ(Z) + φ(Z)]**: an uncertain, lower-mean candidate (EI 0.0307) can beat a confident, better one (0.0217). That is exploration.",
    "**Successive halving assumes early ranking predicts final ranking**: true for iteration budgets, false for the SVM on 250-row subsets (0.9477).",
    "**best_score_ is the maximum of noisy estimates**: 0.740 on 60 rows of pure noise with 200 configurations; 0.536 at 200 rows; the optimism shrinks with rows and grows with configurations.",
    "**Nested CV is the honest number**: 0.449 outer vs 0.515 tuned on noise; +0.004 optimism on a well-sized real problem.",
    "**Refit on all rows** after the search; **fix seeds** and report search variance (0.9644 vs 0.9595 across two seeds); **warm-start** sweeps over training length.",
    "**Optuna idiom**: log ranges, timeout, pruning, and the trials dataframe as the audit trail.",
    "**The search is a statistical procedure**: budget it, estimate its variance, and quote only scores from rows it never touched."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does random search usually beat grid search at equal budget?",
        options: [
          "Because random search evaluates more configurations",
          "Because in most problems only one to three hyperparameters matter, and a grid spends its budget on repeated values of the important axes (a 5 × 5 grid tests 5 distinct values of each) while random draws test a distinct value on every trial; the chance of landing in a good region depends on its volume, 1 − 0.95ⁿ for the top 5 %, not on the number of axes. On a narrow one-dimensional peak, 25 random points found 0.971 and the grid 0.670",
          "Because grid search overfits",
          "Because random search uses Bayesian priors"
        ],
        answer: 1,
        why: "Grid search is still right for reproducing a published sweep or for two or three discrete axes."
      },
      {
        stem: "How does Bayesian optimisation choose the next trial, and what is its cost?",
        options: [
          "It evaluates the gradient of the score",
          "It fits a surrogate to the trials so far — a Gaussian process, or TPE's densities of good and bad configurations — and maximises an acquisition function such as expected improvement, σ[ZΦ(Z) + φ(Z)], which favours candidates with high predicted score or high uncertainty; the cost is sequential evaluation (trials cannot all run at once) and, for GPs, poor scaling past a few hundred trials. TPE overtook random search by trial 20 in six dimensions",
          "It tries all configurations and averages",
          "It halves the search space each round"
        ],
        answer: 1,
        why: "The acquisition function is the exploration–exploitation trade made explicit."
      },
      {
        stem: "A random search reports best_score_ = 0.74 on a dataset. What must you check before believing it?",
        options: [
          "Whether the search used enough iterations",
          "How many configurations were compared and how noisy each estimate was: best_score_ is the maximum of many cross-validated estimates and is biased upward, by an amount that grows with configurations and with per-estimate noise — 0.74 was the best of 200 configurations on 60 rows of pure noise. Nested CV, with the search inside an outer fold, gives the unbiased number (0.449 vs 0.515 on 200 noise rows)",
          "Whether the model was refitted",
          "Whether the grid was fine enough"
        ],
        answer: 1,
        why: "On a well-sized real problem the optimism was +0.004; on small data with many trials it can be the whole result."
      },
      {
        stem: "When is successive halving a safe speed-up?",
        options: [
          "Always; it is strictly more efficient",
          "When the resource being scaled produces partial results that rank candidates as their final results would — boosting iterations, epochs, trees in a forest — so that eliminating the bottom two-thirds early loses nothing. Not when the resource is the sample size and the optimum moves with it, as for the kernel SVM (0.9477 vs 0.9644): the winner on 250 rows was not the winner on 2,000",
          "Only for tree models",
          "Only when the factor is 2"
        ],
        answer: 1,
        why: "Hyperband hedges the starting resource across brackets but inherits the same assumption."
      },
      {
        stem: "After the search, which model do you deploy and which score do you report?",
        options: [
          "The best fold's model and best_score_",
          "Deploy the chosen configuration refitted on all training rows (refit=True), because the searched model only ever saw k − 1 folds; report the nested cross-validated outer score, because it is the only estimate from rows the search never touched — and record the seed, the folds and the trial log, since a different seed chose a different C (5.55 vs 1.22) at a different score",
          "The best fold's model and the nested score",
          "An average of all fold models and the mean CV score"
        ],
        answer: 1,
        why: "The procedure is what was evaluated; the refitted product of that procedure is what ships."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Compare grid search, random search and Bayesian optimisation. Which would you use, when?",
        strong: "Grid search evaluates every combination of listed values: exhaustive, parallel, and wasteful, because in most problems only one to three hyperparameters matter and a grid spends its budget repeating the values of those axes — a 5 × 5 grid tests five distinct values of each. Random search draws each trial from per-parameter distributions, so every trial tests a new value of every axis, and the chance of hitting a good region depends only on its volume: 1 − 0.95ⁿ for the top 5 %, so 60 trials give 95 %. On a narrow one-dimensional peak, 25 random points found 0.97 of the maximum and the 25-point grid 0.67. Bayesian optimisation fits a surrogate to the trials so far and picks the next by an acquisition function like expected improvement, which trades predicted score against uncertainty; it is sequential and wins when trials are expensive and the space large — in six dimensions TPE overtook random search by trial 20 and finished at 0.8827 against 0.8814 — but on an easy two-dimensional problem all three tied at 0.964 in 30 fits. So: random search with log-uniform ranges as the first pass, always parallel; TPE via Optuna when each trial costs minutes and the space has many mixed parameters; grid only for two or three discrete axes or to reproduce a published sweep; and successive halving on training-length resources when the budget is tight. Whatever the method, the reported score comes from nested cross-validation and the final model is refitted on all rows.",
        answer: [
          { t: "p", text: "The three mechanisms with the probability argument and numbers, the selection rule, and the two rules that apply to all of them." }
        ]
      },
      {
        level: "core",
        q: "What is nested cross-validation and when is it necessary?",
        strong: "It is a cross-validation loop wrapped around the entire model-selection procedure: for each outer fold, the hyperparameter search — with its own inner cross-validation — runs on the outer training portion only, the winner is refitted there, and it is scored on the outer test portion that the search never saw. The mean outer score estimates the performance of 'a model chosen this way', which is the thing that will be deployed. It is necessary whenever a tuned score is going to be reported or compared, because a search's best_score_ is the maximum over configurations of noisy estimates and is biased upward: with 200 configurations on 60 rows of pure noise the best cross-validated AUC was 0.74, and with 60 configurations on 200 noise rows the plain tuned score was 0.515 while the nested score was 0.449. On a well-sized real problem with 36 configurations the optimism was only 0.004, so the bias is not always large — but you cannot know that without measuring it. The cost is outer × inner × configurations fits, which is why the inner search should be a budgeted random or TPE search rather than a grid. The final model is chosen by one further search on all rows and refitted; the outer score is its label.",
        answer: [
          { t: "p", text: "Definition, why plain tuned scores are biased with the executed numbers, when the bias matters, cost, and the final-model procedure." }
        ]
      },
      {
        level: "advanced",
        q: "You have a 20-minute compute budget per trial and a mixed search space of eight parameters, three of them categorical. Design the search.",
        strong: "Twenty minutes a trial means tens of trials, not hundreds, so the search must be sequential and informed, and it must not waste trials on hopeless configurations. I would use Optuna with TPE, which handles categorical and conditional parameters natively, with a short random start-up of about eight trials to seed the surrogate, log-uniform ranges for the rate-like and regularisation parameters, and integer ranges for the sizes. Inside each trial I would report intermediate scores — per boosting iteration or per epoch — and attach a median pruner so that a trial tracking below the median of completed trials at the same stage is stopped early, which turns a 20-minute trial into a 4-minute one for most of the space. If the training-length parameter is in the space I would remove it and let early stopping on a validation slice set it inside each trial, because that is a resource the trial can choose for itself. I would set a wall-clock timeout as well as a trial count, run two or three trials in parallel since TPE tolerates small batches, fix the sampler seed, and read the best-so-far curve at the end to judge whether the budget converged or was still climbing. And because the trial count is small and the tuned maximum is optimistic, I would either nest the whole thing in a coarse outer loop if the total budget allows or, if it does not, report the tuned score with that caveat and validate the final refitted model on a held-out slice that the search never saw.",
        answer: [
          { t: "p", text: "TPE with a random start-up, pruning, early stopping inside trials, time budget, parallel batches, convergence check, and the honesty step." }
        ]
      }
    ]
  }
});
