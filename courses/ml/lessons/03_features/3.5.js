/* ============================================================================
   LESSON 3.5 — Feature Selection
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "**Fifty-one columns, six of which matter: five linear signals and one U-shaped one, plus three linear combinations of the first three, two near-duplicates, and forty columns of noise.** That is the test bench for this lesson, built so that every selection method's blind spot has something to trip on. The ANOVA F-test ranked the U-shaped feature forty-third; mutual information ranked it fourth. Lasso kept three noise columns; forward selection picked two more. A correlation filter dropped the duplicates and left the linear combinations. And a top-10 selection made on all rows turned five hundred columns of pure noise into an AUC of 0.734 — the leak that every selection outside the fold commits. The lesson is the map of what each method sees, what it misses, and where it must run.",

  objectives: [
    "Apply filter methods — variance, correlation, ANOVA F, chi², mutual information — and state what each can and cannot detect",
    "Apply wrappers (RFE, sequential selection) and embedded methods (L1, tree importance) and compare cost against accuracy",
    "Diagnose multicollinearity with VIF and explain why correlated features share credit in every method",
    "Run selection inside the cross-validation fold and demonstrate the inflated score that results when it is not"
  ],

  prerequisites: ["3.1", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "The bench, and why to select at all", id: "bench" },

    { t: "code", lang: "python", title: "Fifty-one features, 1,500 rows: what the model scores with all, with the true six, and by family (executed)",
      hl: [4, 5, 6],
      code: `# inf0..inf4: five linear signals   nonlin: a U-shaped signal (x² enters the logit)   red0..red2: linear combinations of inf0..inf2
# dup0, dup1: inf0 and inf1 plus tiny noise   noise0..noise39: pure noise                    y from the logit + Gaussian noise
# 5-fold AUC:
#   logistic regression, all 51 features        0.867
#   logistic regression, the true 6             0.875        <- fewer features, better score: the 45 extra columns cost variance
#   random forest, all 51                       0.909        <- it can use the U-shape that a logistic regression cannot; noise costs it little`,
      caption: "Selection is worth doing when it improves the held-out score (the 45 useless columns cost the logistic regression 0.008 here — a mild case), when it cuts cost (a model on six columns is cheaper to compute, store, monitor and explain), or when features are expensive to collect. It is not worth doing for a tree ensemble on a moderate table, which shrugs off noise columns — the forest is the best model above and used all 51."
    },

    { t: "dl", items: [
      ["Filter", "Score each feature against the target, or by its own statistics, without a model. Fast, model-independent, blind to interactions and to the model's needs."],
      ["Wrapper", "Search over subsets by training the actual model and scoring it. Accurate for that model, expensive (RFE: p fits; sequential: O(p²)), prone to overfitting the search."],
      ["Embedded", "Selection as a side-effect of training: L1 zeroes coefficients, trees assign importance. Cheap, model-specific, inherits the model's biases."],
      ["Variance threshold", "Drop near-constant columns. A sanity filter, not a selector."],
      ["ANOVA F / chi²", "Univariate tests of a linear (F) or count-based (chi², non-negative features) relationship with the target."],
      ["Mutual information", "Univariate, non-parametric dependence. Sees non-linear and non-monotone relationships; needs more rows; noisy on small data."],
      ["VIF", "Variance inflation factor: 1/(1 − R²) of each feature regressed on the others. Above ~10 is serious collinearity; the coefficient's variance is inflated by that factor."],
      ["RFE", "Recursive feature elimination: fit, drop the least important feature(s), repeat to the target count."],
      ["Sequential selection", "Forward: add the feature that most improves CV score, repeat. Backward: remove. Greedy and expensive."]
    ]},

    { t: "h2", n: "02", text: "Filters: what each test can see", id: "filters" },

    { t: "code", lang: "python", title: "Univariate rankings, a correlation filter, and VIF (executed)",
      hl: [2, 3, 5, 6, 9, 13, 14, 15],
      code: `# ANOVA F, top 8:        red0, dup0, inf0, inf1, dup1, red2, inf2, inf4          nonlin ranked 43rd of 51
# mutual information:     red0, dup0, inf0, nonlin, dup1, inf1, red2, noise38      nonlin ranked 4th; one noise column crept into the top 8
# the F-test measures a difference in class means: a U-shape has none. MI measures dependence of any shape and found it, at the cost of some noise.

# correlation filter (|r| > 0.95 with an earlier column): drops dup0, dup1        <- the duplicates, correctly; the linear combinations survive
# chi² (needs non-negative input; run on min-max scaled X): dup0, inf0, red0, inf1, dup1    <- the same linear story as F

# VIF on the ten non-noise columns:
#   inf0 855   inf1 564   inf2 497   inf3 1.0   inf4 1.0   red0 560   red1 71   red2 502   dup0 387   dup1 395
# inf3 and inf4 are clean (VIF 1); everything else is in a web of near-perfect linear dependence. A coefficient with VIF 855 has a
# standard error 29x what it would be alone: the model cannot tell inf0 from red0 from dup0, and neither can any filter.`,
      caption: "Every filter ranked `red0` — a linear combination of the real signals — above the real signals themselves. That is not a bug: red0 correlates with the target as strongly as any of its parents, and a univariate test has no way to know it is derivative. Filters find *which columns are related to the target*; they cannot find *which columns the model needs*, because that depends on what the other columns already say. VIF is the tool for the second question in the linear case, and its numbers here say three groups of columns are interchangeable."
    },

    { t: "table",
      head: ["Method", "Sees non-linear?", "Sees interactions?", "Handles collinearity?", "Cost", "Use it for"],
      rows: [
        ["Variance threshold", "—", "—", "—", "trivial", "Removing constants and near-constants"],
        ["Correlation filter", "No", "No", "Duplicates only", "p²", "Removing near-duplicates before anything else"],
        ["ANOVA F / chi²", "No", "No", "No — all correlated copies rank high", "p", "A first cut on wide linear problems"],
        ["Mutual information", "Yes", "No", "No", "p, but slower", "Non-linear signals; needs rows"],
        ["VIF", "No", "No", "Diagnoses it", "p fits", "Finding which linear-model coefficients are unstable"],
        ["RFE", "As the model does", "As the model does", "Picks one of a correlated group", "p fits", "A model-specific subset of fixed size"],
        ["Sequential (forward/backward)", "As the model does", "Partly", "Picks one of a group", "p² fits × CV", "Small p; when the search is affordable"],
        ["L1 / lasso", "No", "No", "Picks one arbitrarily", "1 fit", "Sparse linear models; fast; unstable under collinearity"],
        ["Tree importance", "Yes", "Yes", "Splits credit across copies", "1 fit", "Ranking for tree models; biased toward high-cardinality"],
        ["Permutation importance (9.1)", "Yes", "Yes", "Shares credit — a correlated copy hides a drop", "p × predictions", "Model-agnostic importance; the honest default"]
      ]
    },

    { t: "h2", n: "03", text: "Wrappers and embedded methods", id: "wrappers" },

    { t: "code", lang: "python", title: "RFE, forward selection, lasso and forest importance on the same bench (executed)",
      hl: [2, 4, 7, 8, 11, 12],
      code: `# wrappers, logistic regression, 6 features requested
# RFE                 inf1, inf2, inf3, inf4, red0, dup0                  0.2 s      <- five right; red0 and dup0 stand in for inf0, which it dropped
# forward sequential  inf3, inf4, red0, red2, noise31, noise32            2.8 s      <- two noise columns: greedy search on noisy CV folds overfits the search

# embedded
# lasso (LassoCV)     keeps 9: inf1, inf3, inf4, red0, red2, dup0, noise0, noise13, noise28     <- one of each correlated group, plus three noise columns
# forest MDI, top 8   nonlin 0.082, red0 0.077, dup0 0.064, inf0 0.062, red2 0.059, inf1 0.049, dup1 0.047, inf2 0.044
#                     <- the forest found the U-shape first, and spread inf0's credit across inf0, red0 and dup0: 0.062 + 0.077 + 0.064

# the honest score by number of features kept, SelectKBest(F) fitted INSIDE the fold, logistic regression:
#   k = 3   0.740        k = 6   0.847        k = 10   0.876        k = 20   0.871        k = 51   0.867`,
      caption: "Three lessons. Wrappers and lasso each pick *one representative* of a collinear group, and which one is arbitrary — inf0 or red0 or dup0 — so the selected set is not 'the true features', it is 'a set that works'. Forward selection with a noisy CV score is a search that overfits: it accepted two noise columns because they happened to help on those folds. And the k-curve says the right number of features is a validation question with a flat optimum — ten was best, six and twenty within a few thousandths — not a number to read off a ranking."
    },

    { t: "h2", n: "04", text: "Where selection must run", id: "fold" },

    { t: "code", lang: "python", title: "Five hundred columns of pure noise, three hundred rows (executed)",
      hl: [3, 4, 7, 8],
      code: `X_noise = rng.normal(size=(300, 500)); y_noise = rng.integers(0, 2, 300)          # nothing predicts anything

top10 = np.argsort(-f_classif(X_noise, y_noise)[0])[:10]                              # select on ALL rows...
cross_val_score(LogisticRegression(), X_noise[:, top10], y_noise, cv=cv, scoring="roc_auc").mean()      # ...then cross-validate:  0.734
# among 500 random columns, ten will correlate with any label by chance; chosen using every row's label, they carry it into every validation fold

pipe = Pipeline([("select", SelectKBest(f_classif, k=10)), ("m", LogisticRegression())])
cross_val_score(pipe, X_noise, y_noise, cv=cv, scoring="roc_auc").mean()              # selection refitted per fold:  0.503`,
      caption: "0.734 on noise. This is the selection-outside-the-fold leak from 1.6 with its own number, and it is the most common way a wide dataset produces a publishable result that does not replicate. The rule is the same as for every fitted step: **the selector is a Pipeline step, so it sees only the training fold's labels.** The same applies to a correlation-with-target filter done in pandas before the split, to features chosen 'by looking at importance on the full data', and to the analyst who drops columns that 'did not help' on the test set."
    },

    { t: "viz",
      title: "Three families, three blind spots",
      caption: "Filters score each column alone and cannot see that red0 is a copy of information the model already has. Wrappers search subsets with the real model and overfit the search. Embedded methods read the model's own weights and inherit its bias — L1 picks one of a correlated group at random; trees split the credit. All three must run inside the fold.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three columns for filter, wrapper and embedded methods, each with what it sees, what it misses, and its cost, and a bar across the bottom stating that all three run inside the cross-validation fold.">
  <g stroke-width="1.2">
    <rect x="20" y="30" width="270" height="150" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="305" y="30" width="270" height="150" rx="8" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="590" y="30" width="270" height="150" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="20" y="200" width="840" height="36" rx="8" style="fill:var(--crit);fill-opacity:.08;stroke:var(--crit)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="155" y="54" style="fill:var(--accent)">filter</text>
    <text x="440" y="54" style="fill:var(--warn)">wrapper</text>
    <text x="725" y="54" style="fill:var(--good)">embedded</text>
    <text x="440" y="223" style="fill:var(--crit)">all three: a Pipeline step, fitted on the training fold — 0.734 on pure noise otherwise</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="155" y="80">one column at a time vs the target</text>
    <text x="155" y="100">F, chi², MI, correlation</text>
    <text x="155" y="130" style="fill:var(--crit)">misses: interactions, redundancy</text>
    <text x="155" y="150">F ranked the U-shape 43rd; MI 4th</text>
    <text x="155" y="170">cost: p</text>
    <text x="440" y="80">search subsets with the real model</text>
    <text x="440" y="100">RFE, forward / backward</text>
    <text x="440" y="130" style="fill:var(--crit)">misses: overfits the search</text>
    <text x="440" y="150">forward SFS accepted two noise columns</text>
    <text x="440" y="170">cost: p to p² fits</text>
    <text x="725" y="80">read the trained model's weights</text>
    <text x="725" y="100">L1, tree importance</text>
    <text x="725" y="130" style="fill:var(--crit)">misses: inherits the model's bias</text>
    <text x="725" y="150">lasso kept 3 noise columns; forest split credit 3 ways</text>
    <text x="725" y="170">cost: one fit</text>
  </g>
</svg>`
    },

    { t: "callout", kind: "mental", title: "Selection is a decision about the model, not a discovery about the world", body: [
      { t: "p", text: "Every method above returned a set that *works for that model* rather than *the true features*: RFE swapped inf0 for its copies, lasso chose red0, the forest gave nonlin the top spot the logistic regression could not use. **The selected set is a property of the model, the data and the method.** Report it that way. If the question is 'which variables matter' rather than 'which columns should this model use', that is an inference question with VIF, confidence intervals and, for causal claims, a design — not a selector." }
    ]},

    { t: "ladder",
      title: "A 400-column customer table for a logistic churn model",
      rungs: [
        { level: "bad", label: "Keep the 30 columns most correlated with churn, on the full table, then cross-validate", code: `keep = df.corrwith(df.churned).abs().nlargest(30).index; cross_val_score(model, df[keep], y)`,
          note: "**Selection leak.** Thirty columns chosen with every fold's labels; the CV score is a fiction, and on a wide table a large one." },
        { level: "ok", label: "Variance and correlation filters, then SelectKBest inside the pipeline, k by validation", code: `Pipeline([("var", VarianceThreshold()), ("corr", DropCorrelated(0.95)), ("sel", SelectKBest(mutual_info_classif, k=k)), ("m", model)])`,
          note: "**Honest and fast.** Univariate; a feature that only matters through an interaction will be dropped." },
        { level: "best", label: "Filters for the obvious, then an embedded or permutation-based selector for the model, inside nested CV, and VIF on the survivors", code: `Pipeline([("var", ...), ("corr", ...), ("sel", SelectFromModel(LogisticRegressionCV(penalty="l1", solver="saga"))), ("m", model)])
# outer CV for the score; VIF on the chosen columns to see which coefficients are stable; permutation importance (9.1) to report`,
          note: "**The selector uses the model's own view, the score is nested, and the surviving coefficients are checked for the collinearity that makes them uninterpretable.**" }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Reproduce the leak and rescue the U-shape",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Generate 400 rows and 2,000 pure-noise features; select the top 20 by ANOVA F on all rows and cross-validate a logistic regression; then do the same with `SelectKBest` inside a Pipeline. Report both AUCs and, for the leaked version, the AUC as the number of noise features grows (500, 2,000, 10,000). **(b)** On the lesson's 51-feature bench, build a selector that keeps the U-shaped feature: compare `SelectKBest(f_classif, k=6)`, `SelectKBest(mutual_info_classif, k=6)` and `SelectFromModel(RandomForestClassifier)` by whether `nonlin` survives and by the downstream AUC of a logistic regression with an added squared term. **(c)** Compute VIF for the six selected features under each selector and say which coefficient you would refuse to interpret." }
      ],
      requirements: [
        "(a): the two AUCs and the trend with feature count, with a one-sentence explanation of the trend.",
        "(b): survival of nonlin under each selector and the three downstream AUCs.",
        "(c): VIFs and the refusal, with the reason."
      ],
      hint: "(a) The leaked score rises with the number of noise columns: more columns, more spurious correlations to choose from. (b) Give the logistic regression squared copies of the kept columns so it can use the U-shape once a selector keeps nonlin. (c) Any selected pair from {inf0, red0, dup0} will have VIF in the hundreds.",
      solution: {
        lang: "python",
        title: "selection_practice.py",
        code: `# (a)
for p_ in [500, 2000, 10000]:
    Xn = rng.normal(size=(400, p_)); yn = rng.integers(0, 2, 400)
    top = np.argsort(-f_classif(Xn, yn)[0])[:20]
    leaked = cross_val_score(LogisticRegression(), Xn[:, top], yn, cv=cv, scoring="roc_auc").mean()
    honest = cross_val_score(Pipeline([("sel", SelectKBest(f_classif, k=20)), ("m", LogisticRegression())]), Xn, yn, cv=cv, scoring="roc_auc").mean()
    print(p_, round(leaked, 3), round(honest, 3))
# executed:   p = 500      leaked 0.714    honest 0.462
#             p = 2,000    leaked 0.798    honest 0.552
#             p = 10,000   leaked 0.826    honest 0.495
# the leaked AUC climbs with p: the more noise columns, the more extreme the best spurious correlations with the full label vector,
# and the more label information the chosen twenty carry into every fold. The honest score wanders around 0.5, as noise should.

# (b)
def bench(selector):
    pipe = Pipeline([("sc", StandardScaler()), ("sel", selector), ("sq", FunctionTransformer(lambda Z: np.c_[Z, Z**2])), ("m", LogisticRegression(max_iter=3000))])
    pipe.fit(X, y); kept = np.where(pipe.named_steps["sel"].get_support())[0]
    return [names[i] for i in kept], cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc").mean()
for name, sel in [("F", SelectKBest(f_classif, k=6)), ("MI", SelectKBest(mutual_info_classif, k=6)),
                  ("forest", SelectFromModel(RandomForestClassifier(300, random_state=0), max_features=6, threshold=-np.inf))]:
    print(name, bench(sel))
# executed (6 kept, then squares added, logistic regression):
#   F        inf0, inf1, red0, red2, dup0, dup1          AUC 0.844     <- nonlin dropped; the squared terms have nothing to square
#   MI       inf0, inf1, red0, dup0, dup1, nonlin        AUC 0.934     <- nonlin kept; nonlin² gives the logistic regression the U-shape
#   forest   inf0, inf1, red0, red2, dup0, nonlin        AUC 0.935
# nine points of AUC between F and MI, entirely from one column that only a curvature-aware selector could see.

# (c)
for kept in [...]:   # the six columns from each selector
    Z = X[:, kept]; print([round(variance_inflation_factor(Z, i), 1) for i in range(Z.shape[1])])
# executed VIFs for the six kept:
#   F        [736, 528, 510, 50, 386, 394]      inf0 / red0 / dup0 and inf1 / dup1 are each a collinear group
#   MI       [396, 395,  12, 386, 394, 1.0]     nonlin: VIF 1.0 -- the only coefficient in that set that means what it says
#   forest   [736, 133, 510, 50, 386, 1.0]
# any selection that includes two of {inf0, red0, dup0} or two of {inf1, red1, dup1} shows VIFs in the hundreds for both: refuse to
# interpret those coefficients -- the model can move weight between them freely and their signs and sizes are arbitrary. nonlin's
# coefficient (VIF 1.0) can be read; so could inf3's and inf4's, had a selector kept them.`,
        notes: [
          { t: "p", text: "**(a) is the number to remember**: a leaked selection makes noise look like signal in proportion to how wide the table is, which is exactly the situation — genomics, text, sensor arrays — where selection is most used." },
          { t: "p", text: "**(b) shows that the selector and the model must agree about shape**: a filter that cannot see curvature will drop the only curved feature, and no downstream feature engineering can bring it back." },
          { t: "p", text: "**(c) separates prediction from interpretation**: a collinear pair predicts fine and explains nothing. VIF is the check before any coefficient is quoted." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Every filter ranked red0 — a linear combination of the real features — above the real features. Is that a failure of the filters?",
          options: [
            "Yes; the filters are broken",
            "No: a univariate filter scores a column's relationship with the target, and red0's is as strong as its parents'; no univariate score can know a column is derivative. Redundancy is a multivariate question — VIF, wrappers, or the model itself",
            "Yes; mutual information should have caught it",
            "No; red0 is genuinely the most important feature"
          ],
          answer: 1,
          why: "Filters answer 'related to the target?'; only methods that see the other columns can answer 'needed given the others?'."
        }
      ]
    }
  ],

  takeaways: [
    "**Select for a reason**: a better held-out score (the true six beat all 51 by 0.008), lower cost, or expensive features — not by reflex; tree ensembles shrug off noise columns.",
    "**Filters score columns alone**: F and chi² see linear relationships, MI sees any shape (nonlin: 43rd by F, 4th by MI); none sees redundancy or interactions.",
    "**Correlated features share credit in every method**: filters rank all copies high, lasso and RFE pick one arbitrarily, trees split the importance.",
    "**VIF diagnoses collinearity**: VIF 855 means a standard error 29× inflated; refuse to interpret that coefficient.",
    "**Wrappers overfit the search** — forward selection accepted two noise columns; **embedded methods inherit the model's bias** — lasso kept three.",
    "**The number of features is a validation question with a flat optimum**: k = 10 best, 6 and 20 within thousandths.",
    "**Selection outside the fold is a leak**: top-10 by F on all rows gave 0.734 on pure noise; inside the Pipeline, 0.503.",
    "**The selected set is a property of the model and method, not a discovery about the world.**",
    "**Sequence**: variance and correlation filters for the obvious, a model-aware selector inside nested CV, VIF on the survivors, permutation importance to report.",
    "**A selector that cannot see curvature will drop the curved feature** — match the selector's view to the model's."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why did selecting the top 10 of 500 noise columns by F-test, on all rows, give AUC 0.734?",
        options: [
          "The F-test is biased",
          "Among 500 random columns some correlate with the label by chance; choosing those ten using every row's label puts label information into the features of every validation fold — the selection is a fit to the labels, done outside the fold",
          "Logistic regression overfits noise",
          "Ten features is too many for 300 rows"
        ],
        answer: 1,
        why: "The same selector inside the Pipeline scored 0.503. Any fitted step — and a selector is one — must see only the training fold."
      },
      {
        stem: "What does a VIF of 855 on a coefficient mean?",
        options: [
          "The feature is 855 times more important",
          "That feature is almost perfectly predicted by the other features (R² ≈ 0.9988), so its coefficient's variance is 855 times what it would be alone: the model can shift weight between it and its copies freely, and the sign and size are not interpretable",
          "The feature should be scaled",
          "The model has 855 parameters"
        ],
        answer: 1,
        why: "VIF is 1/(1 − R²) of the feature on the others. Prediction is unaffected; interpretation is impossible."
      },
      {
        stem: "Which selection method could find a feature that matters only through an interaction with another?",
        options: [
          "ANOVA F-test",
          "A method that evaluates subsets with a model able to represent interactions — RFE or sequential selection with a tree model, or tree-based embedded importance; univariate filters test each column alone and cannot see it",
          "Mutual information",
          "Variance threshold"
        ],
        answer: 1,
        why: "MI sees non-linear univariate relationships, not interactions. Only multivariate evaluation with a suitable model can credit a feature that is useless alone."
      },
      {
        stem: "Lasso kept three noise columns and forward selection kept two. What does that tell you about the selected sets?",
        options: [
          "Both methods are unreliable and should not be used",
          "That a selected set is a fit to the data like any other and carries noise; stability across resamples (does the same set come back?), a held-out check, and a nested score are how you tell the robust part from the lucky part",
          "That the noise columns were informative",
          "That regularisation was too weak"
        ],
        answer: 1,
        why: "Stability selection — rerunning the selector on bootstrap samples and keeping features chosen most of the time — is the formal version. The informal version is not to believe a single run."
      },
      {
        stem: "When is feature selection a waste of effort?",
        options: [
          "For linear models",
          "For a tree ensemble on a moderately wide table, where noise columns cost little accuracy — the forest used all 51 features and beat every selected logistic regression; selection then buys only cost and interpretability, if those are wanted",
          "For small datasets",
          "When features are expensive"
        ],
        answer: 1,
        why: "Trees ignore columns they never split on. Selection for them is about compute, storage and explanation, not accuracy."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain filter, wrapper and embedded feature selection.",
        strong: "Filters score each feature without a model — variance, correlation, ANOVA F, chi-squared, mutual information — fast and model-independent, but blind to interactions and redundancy: on a bench I built, every filter ranked a linear combination of the real features above the real features, and the F-test ranked a U-shaped signal forty-third where mutual information ranked it fourth. Wrappers search subsets with the actual model — recursive elimination, forward or backward selection — accurate for that model, expensive, and prone to overfitting the search; forward selection accepted two noise columns. Embedded methods select as a side-effect of training — L1 zeroing coefficients, tree importance — cheap and model-specific, inheriting the model's biases; lasso kept three noise columns and chose one member of each collinear group at random. All three must run inside the cross-validation fold, or the score is inflated: top-ten selection on all rows turned pure noise into AUC 0.73.",
        answer: [
          { t: "p", text: "Three families with executed blind spots, and the fold rule as the closing line." }
        ]
      },
      {
        level: "core",
        q: "What is multicollinearity, how do you detect it, and does it matter?",
        strong: "Multicollinearity is features that are nearly linear combinations of each other. It does not hurt prediction — the model finds a working combination of the collinear group — but it destroys interpretation: the coefficients can trade weight freely, so their signs and sizes are arbitrary, and their standard errors are inflated. Detect it with the variance inflation factor, one over one minus R² of each feature regressed on the others; above ten is serious, and I have seen 855, which means a standard error thirty times what it would be alone. A pairwise correlation matrix catches duplicates but misses a feature that is a combination of three others, which VIF catches. Handle it by dropping or combining the redundant features when coefficients must be read, by ridge regularisation when only prediction matters, or by PCA when the group is genuinely one underlying quantity.",
        answer: [
          { t: "p", text: "Prediction unaffected, interpretation destroyed, VIF over pairwise correlation, and three remedies by goal." }
        ]
      },
      {
        level: "advanced",
        q: "You have 200 features and need to select the most important. How?",
        strong: "First decide what 'important' is for: a leaner model, a cheaper pipeline, or an explanation — the method differs. Then the sequence, all inside the cross-validation fold as Pipeline steps. Drop constants and near-duplicates with a variance threshold and a correlation filter, because those are free. Use a filter that matches the model's view for a first cut — mutual information if the model can use curvature, the F-test if it is linear — with k chosen by validation, where the optimum is usually flat. Then a model-aware selector: L1 for a linear model, importance-based for trees, with nested cross-validation for the reported score because the selector was tuned. Check stability by rerunning on bootstrap samples and keeping features selected most of the time; run VIF on the survivors and refuse to interpret collinear coefficients; and report permutation importance rather than the selector's internal ranking. What I would not do is choose columns by their correlation with the target on the full table and then cross-validate — that produced 0.73 from noise in a test I ran.",
        answer: [
          { t: "p", text: "Purpose, sequence inside the fold, stability, VIF, honest reporting, and the leak named." }
        ]
      }
    ]
  }
});
