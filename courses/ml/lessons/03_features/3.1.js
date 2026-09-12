/* ============================================================================
   LESSON 3.1 — Scaling: Standardise, Normalise, Robust
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**The distance between a 25-year-old earning 35,000 and a 42-year-old earning 65,000 is 30,000, and age contributed three ten-millionths of it.** Any algorithm that compares features to each other — by distance, by a shared penalty, by a shared gradient step — is a model of whichever feature has the biggest units until the features are put on a common scale. This lesson works the three scalers on the churn table's fee column with its planted 999, shows which algorithms care (KNN moved, the forest did not), why a ridge penalty applied to unscaled features shrinks the wrong coefficient, why PCA on raw columns finds 'tenure' and nothing else, and the one rule that makes all of it safe: fit on the training rows only.",

  objectives: [
    "Compute z-score, min-max and robust scaling by hand and say what each does to an outlier",
    "Name which algorithm families need scaling and the mechanism that breaks without it, and which are immune and why",
    "Show that regularisation penalties and PCA depend on units, and that trees do not",
    "Fit scalers on the training fold only, inside a Pipeline, and handle the sparse-matrix exception"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "Three formulas, one outlier", id: "formulas" },

    { t: "code", lang: "text", title: "The churn table's monthly fee — 990 rows, one planted 999.0 — under each scaler (executed)",
      code: `monthly_fee:  min 6.43   Q1 7.99   median 10.45   Q3 13.26   max 999.0        mean 12.49   std 31.65   (the outlier owns the mean and the std)

                        z-score (x - mean) / std       min-max (x - min) / (max - min)       robust (x - median) / IQR
basic plan     7.99          -0.142                           0.002                              -0.467
plus plan     12.99           0.016                           0.007                               0.482
pro plan      19.99           0.237                           0.014                               1.810
the outlier  999.00          31.169                           1.000                             187.581

with the outlier removed and the scalers refitted:
basic          7.99          -0.831                           0.105                              -0.243
plus          12.99           0.356                           0.442                               0.706
pro           19.99           2.017                           0.914                               2.034`,
      caption: "Min-max hands the outlier the whole axis: the three real plans occupy 1.2 % of the [0, 1] range and any distance-based model sees them as the same customer. Z-score is dragged too — the std is 31.65 instead of 4.2, so the plans span 0.38 instead of 2.85. Robust scaling uses the median and the interquartile range, which the outlier cannot move; the three plans keep their spread and the outlier sits at 188, visible and out of charge. Removing the outlier is better still — but robust scaling is what protects you from the outlier you did not find."
    },

    { t: "dl", items: [
      ["Standardisation (z-score)", "(x − mean) / std. Centre 0, unit variance, unbounded. The default for linear models, SVMs, PCA, networks."],
      ["Normalisation (min-max)", "(x − min) / (max − min). Exactly [0, 1]. For genuinely bounded inputs (pixels, percentages) and algorithms needing a fixed range; destroyed by a single outlier."],
      ["Robust scaling", "(x − median) / IQR. Centre at the median, unit interquartile range, unbounded. For skewed or dirty columns; the statistics are immune to the extremes."],
      ["MaxAbsScaler", "x / max|x|. Keeps zeros as zeros, so it preserves sparsity. For sparse matrices."],
      ["Fit on train only", "The mean, std, min, max, median and IQR are learned from the training rows and applied unchanged to validation, test and production rows."],
      ["Feature-to-feature comparison", "The test for whether an algorithm needs scaling: does it ever add, compare or penalise two features together? Distances, dot products and shared penalties do; a tree's threshold on one feature does not."]
    ]},

    { t: "h2", n: "02", text: "Which algorithms care, measured", id: "who" },

    { t: "code", lang: "python", title: "Four models, four scalers, 5-fold AUC on the churn table (executed)",
      hl: [2, 3, 4, 5],
      code: `#                        no scaling    standard    min-max    robust
# KNN, k = 15                0.650        0.678       0.661      0.670       <- distance: scaling is the difference between a fee model and a model
# SVM, RBF kernel            0.611        0.613       0.665      0.656       <- the kernel is a distance; with C = 1 fixed, min-max happened to suit gamma best
# logistic (L-BFGS)          0.746        0.747       0.741      0.745       <- the optimum is the same; a second-order solver reaches it either way
# random forest              0.686        0.688       0.686      0.686       <- identical to two decimals: a tree never compares two features`,
      caption: "The fee column with its 999 is in every run, so 'no scaling' for KNN means a model that is mostly about monthly fee. Logistic regression is unmoved because L-BFGS does not care about conditioning the way plain gradient descent does (1.8) and the unpenalised optimum is unit-free; with a stronger penalty it would not be. The forest's third-decimal wobble is floating-point tie-breaking in the split search, not an effect."
    },

    { t: "table",
      head: ["Family", "Needs scaling", "The mechanism that breaks"],
      rows: [
        ["KNN, k-means, DBSCAN, LOF, SVM (RBF, polynomial)", "Always", "A distance or kernel is dominated by the feature with the largest units"],
        ["PCA, LDA, t-SNE, UMAP", "Always", "The components chase the highest-variance feature, which is the one with the biggest units"],
        ["Ridge, lasso, elastic net, logistic with a penalty", "Always", "One λ penalises every coefficient equally, so a feature in small units gets a large coefficient that is shrunk hard, and vice versa"],
        ["Neural networks", "Always", "Unscaled inputs saturate activations and make the loss ill-conditioned; the first layer's step size is set by the largest input"],
        ["Linear and logistic regression, unpenalised", "For gradient-descent convergence only", "The coefficients' optimum is unit-free; the condition number is not (1.8)"],
        ["Decision trees, random forests, gradient boosting", "No", "Every split compares one feature with a constant; any monotone rescaling gives the same splits"],
        ["Naive Bayes", "No", "Each feature's distribution is modelled on its own"]
      ]
    },

    { t: "code", lang: "python", title: "The penalty depends on the units (executed)",
      hl: [3, 4, 5],
      code: `# y = 2·x1 + 2·x2 + noise, both features standard normal; then the same x2 expressed in thousandths
#                            ridge α = 50 coefficients        effect per standard deviation of the feature
# both in unit scale           [1.769, 1.758]                  [1.80, 1.71]       <- both shrunk from 2.0 by about 12 %
# x2 in thousandths            [1.758, 0.002]                  [1.79, 2.02]       <- x2's coefficient is tiny, so the penalty ignores it: not shrunk at all`,
      caption: "Same information, different units, different regularisation: the feature stored in small units escapes the penalty because its coefficient is numerically small. Regularised models must be scaled or the strength of the penalty is a function of the units each column happened to arrive in. This is why scikit-learn's `LogisticRegression` and `Ridge` documentation both say to standardise first, and why `LassoCV`'s chosen α means nothing on unscaled data."
    },

    { t: "code", lang: "python", title: "PCA on raw columns finds the biggest unit (executed)",
      hl: [2, 3],
      code: `# tenure (1-60), logins (0-31), fee (6-21): PCA on the raw columns, then on standardised ones
# raw           explained variance [0.877, 0.106, 0.017]   first component = [1.000, 0.004, 0.005]    <- 'the first principal component is tenure'
# standardised  explained variance [0.574, 0.333, 0.093]   first component = [0.027, 0.707, 0.707]    <- logins and fee together: the plan axis (1.1)`,
      caption: "Unscaled, the first component is the tenure column wearing a hat, because tenure has the largest variance in its own units. Scaled, the first component is a genuine direction in the data — fee and logins moving together, which is the subscription plan. Every variance-based method has this property (7.4)."
    },

    { t: "h2", n: "03", text: "Fit on train only, and the sparse exception", id: "fit" },

    { t: "code", lang: "python", title: "The mistake that invalidates a result, and the Pipeline that prevents it (executed)",
      hl: [2, 3, 7, 8],
      code: `# StandardScaler fitted on all 989 fee values (outlier removed) vs on the 692 training rows only
#   all rows:      mean 11.492   std 4.214
#   training rows: mean 11.509   std 4.310             <- the difference is small here, and it is still information from the test rows

pre = ColumnTransformer([("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", RobustScaler())]), numeric),
                         ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)])
model = Pipeline([("pre", pre), ("knn", KNeighborsClassifier(15))])
cross_val_score(model, X, y, cv=cv)          # the scaler is refitted on each fold's training rows; the test fold never touches it
model.fit(X_train, y_train)                  # the shipped artefact carries the training-set statistics with it (1.2)`,
      caption: "Scaling leaks little — the test rows' mean and spread — and that little is still a violation whose cost is invisible until a transform with more leverage (target encoding, 3.2) is added with the same habit. The Pipeline makes the habit unnecessary: the scaler is a step, and steps fit on the training fold. In production the same fitted scaler transforms every incoming row with the statistics it learned, so a customer with a fee of 999 gets a robust-scaled value of 188 and the model sees an outlier, not a new scale."
    },

    { t: "code", lang: "python", title: "Sparse matrices: centring destroys sparsity (executed)",
      hl: [2, 3, 4],
      code: `S = sparse.random(1000, 50, density=0.02)                       # 1,000 non-zeros in 50,000 cells: a bag-of-words shape
StandardScaler(with_mean=False).fit_transform(S).nnz               # 1,000  -- scale only: every zero stays a zero
StandardScaler().fit_transform(S.toarray())                        # 50,000 non-zeros: subtracting the mean made every cell non-zero
# MaxAbsScaler() is the sparse-safe default; StandardScaler(with_mean=False) is the alternative`,
      caption: "A TF-IDF matrix of a million documents by fifty thousand terms is 0.1 % non-zero; centring it would need 400 GB. Text pipelines (11.5) scale by max-absolute or not at all; linear models on sparse input converge fine because the columns are already comparable."
    },

    { t: "viz",
      title: "The same three plans under the three scalers, with the outlier present",
      caption: "Min-max crushes the three real plans into the bottom 1.2 % of its axis; z-score keeps them within 0.4 of a standard deviation; robust scaling spreads them across 2.3 units and leaves the outlier off the page. Only the last is a feature a distance can use.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three horizontal axes. Min-max: three plan markers piled at the far left and the outlier at the far right. Z-score: three markers close together near zero and the outlier far right. Robust: three markers spread across the middle and the outlier beyond the axis.">
  <g class="s-label" style="font-weight:600">
    <text x="20" y="50">min-max</text><text x="20" y="130">z-score</text><text x="20" y="210">robust</text>
  </g>
  <g style="stroke:var(--line)" stroke-width="1.2">
    <line x1="130" y1="45" x2="840" y2="45"/><line x1="130" y1="125" x2="840" y2="125"/><line x1="130" y1="205" x2="840" y2="205"/>
  </g>
  <!-- min-max: 0..1 over 130..840 -->
  <g style="fill:var(--accent)"><circle cx="131" cy="45" r="5"/><circle cx="135" cy="45" r="5"/><circle cx="140" cy="45" r="5"/></g>
  <circle cx="840" cy="45" r="5" style="fill:var(--crit)"/>
  <text x="150" y="70" class="s-sub">basic, plus, pro: 0.002, 0.007, 0.014</text><text x="700" y="70" class="s-sub" style="fill:var(--crit)">outlier: 1.000</text>
  <!-- z-score: -1..32 mapped; place plans near left -->
  <g style="fill:var(--accent)"><circle cx="160" cy="125" r="5"/><circle cx="163" cy="125" r="5"/><circle cx="168" cy="125" r="5"/></g>
  <circle cx="840" cy="125" r="5" style="fill:var(--crit)"/>
  <text x="180" y="150" class="s-sub">−0.14, 0.02, 0.24</text><text x="700" y="150" class="s-sub" style="fill:var(--crit)">outlier: 31.2</text>
  <!-- robust: -1..3 over 130..840 => 177.5 px per unit; -0.467 -> 225, 0.482 -> 393, 1.81 -> 629 -->
  <g style="fill:var(--accent)"><circle cx="225" cy="205" r="5"/><circle cx="393" cy="205" r="5"/><circle cx="629" cy="205" r="5"/></g>
  <text x="240" y="230" class="s-sub">−0.47</text><text x="405" y="230" class="s-sub">0.48</text><text x="640" y="230" class="s-sub">1.81</text>
  <text x="780" y="210" class="s-sub" style="fill:var(--crit)">→ 188</text>
</svg>`
    },

    { t: "callout", kind: "mental", title: "Scale for the model you are fitting, not out of habit", body: [
      { t: "p", text: "Scaling a random forest is not harmful; it is a fitted object to maintain, a step that can go wrong in serving, and a false sense that something was addressed. **If a tree model is under-performing, scaling is never the reason.** Conversely, a distance or penalised model without scaling is a model of the widest column, and no hyperparameter will fix that — the KNN row above gained more from a scaler than it would from tuning k." }
    ]},

    { t: "ladder",
      title: "Preparing numeric features for a k-nearest-neighbours model",
      rungs: [
        { level: "bad", label: "Feed the raw columns", code: `KNeighborsClassifier(15).fit(X_train, y_train)        # tenure 1-60, fee 6-999, logins 0-31, tickets 0-4`,
          note: "**A model of the fee column**, and of its outlier. AUC 0.650." },
        { level: "ok", label: "Standardise inside a Pipeline", code: `make_pipeline(StandardScaler(), KNeighborsClassifier(15))       # AUC 0.678`,
          note: "**Every column now counts.** The 999 still inflates the fee's std and squashes the real plans." },
        { level: "best", label: "Robust-scale, or fix the outlier, then standardise", code: `make_pipeline(RobustScaler(), KNeighborsClassifier(15))         # immune to the 999
# or: correct the data error (no plan costs 999), then StandardScaler -- the better answer when the outlier is a known mistake`,
          note: "**The scaler that the outlier cannot move, or the outlier removed as the data error it is.** Either way the plans keep their spread." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Scale by hand, then break a model with units",
      difficulty: "core",
      minutes: 22,
      body: [
        { t: "p", text: "**(a)** For incomes [20,000, 35,000, 50,000, 65,000, 200,000], compute the min-max, z-score (population std) and robust values of every row by hand; state which scaler leaves the four ordinary rows with the most resolution. **(b)** Build a synthetic 2-feature dataset where the class is decided by feature 1 alone, then multiply feature 2 by 10,000 and show KNN's accuracy collapse without scaling and recover with it. **(c)** Take the churn table's numeric columns, fit `Lasso(alpha=0.05)` with and without standardisation, and report which features survive in each — explain why the sets differ." }
      ],
      requirements: [
        "The 5 × 3 table for (a) with the arithmetic for one row of each scaler shown.",
        "Three accuracies for (b): raw, raw with feature 2 inflated, inflated then scaled.",
        "The two surviving-feature sets for (c) and the reason."
      ],
      hint: "(a) mean 74,000, population std 64,762, median 50,000, IQR 30,000. (c) Without scaling, lasso's single α penalises tenure (1–60) and support_tickets (0–4) with the same weight although their coefficients live on different scales, so it zeroes the wrong ones.",
      solution: {
        lang: "python",
        title: "scaling_practice.py",
        code: `# (a)  mean 74,000   pop. std 64,762   median 50,000   Q1 35,000   Q3 65,000   IQR 30,000   min 20,000   max 200,000
#   x         min-max                    z-score                          robust
#   20,000    (20-20)/180   = 0.000      (20,000-74,000)/64,762 = -0.834   (20,000-50,000)/30,000 = -1.0
#   35,000    0.083                      -0.602                           -0.5
#   50,000    0.167                      -0.371                            0.0
#   65,000    0.250                      -0.139                           +0.5
#   200,000   1.000                      +1.946                           +5.0
# robust keeps the four ordinary rows spread over 1.5 units; z-score over 0.70; min-max over 0.25 of its range.

# (b)
rng = np.random.default_rng(0); n = 1000
x1 = rng.normal(size=n); x2 = rng.normal(size=n); yb = (x1 > 0).astype(int)              # the class is feature 1's sign
X_raw = np.c_[x1, x2]; X_big = np.c_[x1, x2 * 10_000]
for name, Xm in [("raw", X_raw), ("x2 x 10,000", X_big), ("x2 x 10,000, standardised", StandardScaler().fit_transform(X_big))]:
    print(name, cross_val_score(KNeighborsClassifier(15), Xm, yb, cv=5).mean().round(3))
# raw ~0.97   inflated ~0.50 (KNN now measures distance in x2 only: a coin toss)   standardised ~0.97

# (c)
num = ["tenure_months", "monthly_fee", "logins_30d", "support_tickets", "discount_pct"]
Xn = dd[num].fillna(dd[num].median()); Xn = Xn[Xn.monthly_fee < 100]; yn = dd.loc[Xn.index, "churned"]
raw = Lasso(alpha=0.05).fit(Xn, yn); std = make_pipeline(StandardScaler(), Lasso(alpha=0.05)).fit(Xn, yn)
print([n for n, c in zip(num, raw.coef_) if abs(c) > 1e-9]); print([n for n, c in zip(num, std[-1].coef_) if abs(c) > 1e-9])
# executed at alpha = 0.05:
#   unscaled     survivors: tenure_months, monthly_fee, logins_30d, discount_pct       <- support_tickets zeroed; discount kept
#   standardised survivors: tenure_months, logins_30d, support_tickets                  <- tickets kept; fee and discount zeroed
# unscaled: the columns with wide ranges (tenure 1-60, discount 0-20) need tiny coefficients that the penalty barely touches, while
# the narrow column (tickets 0-4) needs a large coefficient and is zeroed first -- although tickets is the strongest churn signal
# in the table (1.2). Standardised: every coefficient is 'per standard deviation', the penalty treats them equally, and the survivors
# are the features with the most signal per sd -- the set you meant. (LassoCV picks a small alpha on this data where nothing is
# zeroed either way; the ordering in which features drop out along the path is where the units show.)`,
        notes: [
          { t: "p", text: "**(a) is the whole argument in fifteen numbers**: the scaler's statistics decide whether one row can steal the axis." },
          { t: "p", text: "**(b) is the failure mode in its purest form**: nothing about the information changed, and the model went from 0.97 to 0.50 because the distance did." },
          { t: "p", text: "**(c) is the subtle one people miss**: lasso's feature selection on unscaled data selects by units, not by signal — it dropped support_tickets, the strongest predictor, and kept the discount. The same applies to any penalised model and to any importance measure derived from coefficient size." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Min-max scaling gave the three real plans values 0.002, 0.007 and 0.014. Why, and what does it do to a KNN model?",
          options: [
            "The plans are genuinely similar",
            "The 999 outlier is the max, so the range is 993 and everything real is squashed into the bottom 1.2 %; KNN sees the three plans as the same customer and the fee column carries no information",
            "Min-max always compresses",
            "It has no effect on KNN"
          ],
          answer: 1,
          why: "Min-max is defined by the extremes; one extreme owns the axis. Robust scaling gave the same plans −0.47, 0.48 and 1.81."
        }
      ]
    }
  ],

  takeaways: [
    "**Scale when the algorithm compares features to each other** — distances, kernels, shared penalties, gradient steps; trees and Naive Bayes are immune.",
    "**z-score for most models; min-max for genuinely bounded inputs; robust when outliers are present or suspected.**",
    "**One outlier owns min-max's axis and inflates z-score's std**; only the median and IQR do not move.",
    "**KNN gained 0.03 AUC from a scaler on the churn table; the forest gained nothing** — measured, not assumed.",
    "**Penalties depend on units**: a feature in small units escapes shrinkage; lasso on unscaled data selects by units.",
    "**PCA on raw columns finds the biggest unit** ('the first component is tenure'); on scaled columns it finds structure.",
    "**Fit the scaler on the training fold only, as a Pipeline step**; the shipped artefact carries the training statistics.",
    "**Never centre a sparse matrix**: MaxAbsScaler or with_mean=False.",
    "**A scaler is not a fix for a tree model**; if a tree under-performs, look elsewhere.",
    "**Fixing the data error beats scaling around it** — but robust scaling protects you from the one you did not find."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which statement about tree models and scaling is correct?",
        options: [
          "Trees need min-max scaling",
          "Trees are invariant to any monotone rescaling of a feature, because every split compares one feature with a threshold and the same rows fall on each side; scaling costs a fitted object and fixes nothing",
          "Trees need scaling only for regression",
          "Scaling improves tree accuracy slightly"
        ],
        answer: 1,
        why: "The forest scored 0.686 unscaled and 0.686–0.688 scaled; the third-decimal wobble is floating-point tie-breaking."
      },
      {
        stem: "Why must regularised linear models be scaled?",
        options: [
          "For speed",
          "One λ penalises every coefficient equally, but a coefficient's size depends on its feature's units — a column in thousandths needs a tiny coefficient that the penalty ignores; standardising makes every coefficient 'per standard deviation' so the penalty is fair",
          "They do not need scaling",
          "Because of the intercept"
        ],
        answer: 1,
        why: "Ridge at α = 50 shrank x1 by 12 % and the rescaled x2 not at all. LassoCV's chosen α on unscaled data is a statement about units."
      },
      {
        stem: "Why fit the scaler on the training fold only when the leak is 'only the test mean and std'?",
        options: [
          "It is not necessary for scalers",
          "Because it is still information from rows that will be scored, because the habit must be automatic for the transforms where it matters enormously (target encoding, selection, resampling), and because a Pipeline makes it free",
          "To make the numbers match the documentation",
          "For reproducibility only"
        ],
        answer: 1,
        why: "Scaling leaks little; the discipline is what prevents the transforms that leak a lot. The Pipeline is the discipline made structural."
      },
      {
        stem: "When is min-max the right choice?",
        options: [
          "Always for neural networks",
          "When the range is a genuine fact of the feature — pixel intensities, percentages, a bounded sensor — and there are no outliers, or when an algorithm needs inputs in a fixed non-negative range",
          "When the data is skewed",
          "Never"
        ],
        answer: 1,
        why: "Min-max is a statement that min and max are meaningful. For a column with a 999 typo they are not."
      },
      {
        stem: "A TF-IDF matrix is passed through StandardScaler and memory explodes. Why?",
        options: [
          "TF-IDF values are too large",
          "Subtracting the mean turns every stored zero into a non-zero, converting a 0.1 %-dense sparse matrix into a dense one — use MaxAbsScaler or StandardScaler(with_mean=False), which only rescale",
          "The scaler is slow",
          "TF-IDF cannot be scaled"
        ],
        answer: 1,
        why: "1,000 non-zeros became 50,000 in the executed example. Sparse data is scaled without centring, or not at all."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When do you need to scale features, and which scaler?",
        strong: "Whenever the algorithm compares features to each other: distance and kernel methods like KNN, k-means, SVMs; variance-based methods like PCA; anything with a shared penalty like ridge, lasso or a regularised logistic regression; and neural networks, where unscaled inputs make the loss ill-conditioned. Trees and their ensembles do not need it — a split compares one feature with a threshold, so monotone rescaling changes nothing — and neither does Naive Bayes. As for which: standardisation by default; min-max when the range is a genuine fact, such as pixels; robust scaling when outliers are present or the column is skewed, because the median and IQR do not move when one value flies off. Sparse data is the exception — never centre it. And always inside a Pipeline, fitted on the training fold, so the test rows never inform the statistics and serving uses the same fitted object.",
        answer: [
          { t: "p", text: "The feature-to-feature test, the family list with mechanisms, the three scalers with their regimes, sparse, and the Pipeline." }
        ]
      },
      {
        level: "core",
        q: "Standardisation versus normalisation — which and why?",
        strong: "Standardisation subtracts the mean and divides by the standard deviation: centred, unit variance, unbounded, and moderately sensitive to outliers through the std. Normalisation, meaning min-max, maps to exactly [0, 1] using the extremes, so a single outlier owns the whole range — on a fee column with one 999, the three real price points ended up at 0.002, 0.007 and 0.014, indistinguishable to a distance. Standardise by default; normalise when the bounds are a real property of the feature and there are no outliers; and when there are outliers you cannot remove, use neither — robust scaling by median and IQR keeps the ordinary rows spread out and leaves the outlier visible without letting it set the scale.",
        answer: [
          { t: "p", text: "Formulas, the outlier test with numbers, and the third option most candidates forget." }
        ]
      },
      {
        level: "advanced",
        q: "What goes wrong if you regularise or run PCA on unscaled features?",
        strong: "Both become functions of the units the columns arrived in rather than of the data. For regularisation, one λ penalises every coefficient equally, but the size of a coefficient depends on its feature's scale: a feature stored in thousandths needs a coefficient a thousand times larger, so it is shrunk a million times harder under L2, while a feature stored in thousands escapes almost untouched — in a ridge example the coefficient on a rescaled copy of the same information went from 12 % shrinkage to none. Lasso then selects features by their units, and the chosen α means nothing transferable. For PCA, the first component is whichever column has the largest variance in its own units: on tenure, logins and fee it was tenure alone, with loadings of one, zero, zero; standardised, it became the fee-plus-logins direction that is the actual structure. The fix is the same for both — standardise inside the pipeline — and the tell is a first component or a surviving feature set that reads as a list of the widest columns.",
        answer: [
          { t: "p", text: "Both mechanisms with executed numbers and the diagnostic tell — that is a complete answer." }
        ]
      }
    ]
  }
});
