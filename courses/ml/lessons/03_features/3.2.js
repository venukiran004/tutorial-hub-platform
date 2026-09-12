/* ============================================================================
   LESSON 3.2 — Encoding Categoricals
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**A model computes with numbers; a category is a name. Every encoding is a decision about what arithmetic on that name should mean.** One-hot says the levels are unrelated; ordinal says they are ordered; target encoding says a level is its average outcome; hashing says collisions are an acceptable price for a fixed width. This lesson works each on the churn table's plan column, shows the dummy trap as a singular matrix, shows ordinal encoding costing a logistic regression nineteen points of AUC while a forest does not care, and then the hard case — two thousand cities with ten rows each — where one-hot, target, frequency and hashing encoders are run against each other and against an oracle that knows the truth.",

  objectives: [
    "Apply one-hot, ordinal, target, frequency and hashing encoding and state the assumption each makes about the levels",
    "Show the dummy variable trap as rank deficiency and know when to drop a level and when not to",
    "Explain why ordinal encoding of an unordered category harms linear models and not trees",
    "Choose an encoder for high-cardinality columns from measured accuracy, width and leakage risk, and handle unseen levels at serving time"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "One-hot, and the trap", id: "onehot" },

    { t: "code", lang: "python", title: "The plan column, one-hot encoded, and the rank of the design matrix (executed)",
      hl: [2, 3, 4, 5, 9, 10],
      code: `OneHotEncoder().fit_transform([["basic"], ["plus"], ["pro"], ["plus"]])
#   basic  plus  pro
#     1     0     0
#     0     1     0
#     0     0     1
#     0     1     0            <- three columns, exactly one 1 per row: the three always sum to 1

X = [intercept, basic, plus, pro]         # a linear model's design matrix
np.linalg.matrix_rank(X)                  # 3, for 4 columns; det(XᵀX) = 0.0
# the intercept equals basic + plus + pro: perfect collinearity. OLS has no unique solution; ridge and gradient descent find one of many.
OneHotEncoder(drop="first")               # [plus, pro] with basic as the reference level: rank 3 of 3`,
      caption: "The dummy trap is exact collinearity between the intercept and a full set of indicators. For unpenalised linear regression it makes XᵀX singular and the coefficients meaningless; drop one level and each remaining coefficient reads 'compared with the dropped level'. For penalised models, trees, and anything with regularisation the trap is harmless — and dropping a level then costs you symmetry: with `drop='first'` the reference level's row is all zeros, which a penalty treats differently from the others. **Drop for unpenalised OLS and for coefficient interpretation; keep all levels for everything else.**"
    },

    { t: "dl", items: [
      ["One-hot", "One binary column per level. No assumption about relations between levels; width grows with cardinality; sparse by nature."],
      ["Dummy (drop one)", "One-hot minus a reference level. Required for unpenalised OLS; the coefficients are contrasts against the reference."],
      ["Ordinal", "Levels mapped to integers 0, 1, 2 … Correct when the levels are ordered (small < medium < large); a fabrication otherwise."],
      ["Target encoding", "Each level replaced by the mean of the target for that level, smoothed toward the global mean and computed out-of-fold. One column; leaks the label if fitted on the rows it scores."],
      ["Frequency / count encoding", "Each level replaced by how often it appears. One column; carries signal when rarity matters; no label involved."],
      ["Hashing trick", "Levels hashed into a fixed number of buckets; collisions share a column. Fixed width, no fitting, handles unseen levels; loses interpretability."],
      ["Native categorical handling", "LightGBM, CatBoost and HistGradientBoosting split on categories directly; CatBoost uses ordered target statistics to avoid the leak."],
      ["Entity embedding", "A learned low-dimensional vector per level, trained by a network. For very high cardinality with lots of data (11.6)."]
    ]},

    { t: "h2", n: "02", text: "Ordinal encoding of something that is not ordered", id: "ordinal" },

    { t: "code", lang: "python", title: "Four colours whose effects are not monotone in alphabetical order (executed, 3,000 rows)",
      hl: [3, 4, 5, 6],
      code: `# true effect on the logit:  red +2.0   green -1.0   blue +2.5   yellow -2.0      (alphabetical: blue 0, green 1, red 2, yellow 3)
#                                              logistic regression AUC      random forest AUC
# ordinal (blue=0, green=1, red=2, yellow=3)          0.785                       0.972
# one-hot                                              0.972                       0.972
# the ordinal column says 'blue < green < red < yellow'; the truth is +2.5, -1.0, +2.0, -2.0. A line through that is a bad line.
# a tree splits the integer at 0.5, 1.5, 2.5 and recovers every level in three splits: it never assumed an order.`,
      caption: "`LabelEncoder` on an unordered categorical is the most common silent error in feature engineering: the model runs, the score is plausible, and a linear model has been told a lie about the levels. Trees are indifferent because a sequence of threshold splits can isolate any level — which is why tree-based pipelines often use ordinal encoding deliberately, as a compact alternative to one-hot. For linear models, kernels and networks, ordinal encoding is only for genuinely ordered levels, and then the integers should reflect the spacing if it is known."
    },

    { t: "h2", n: "03", text: "High cardinality: two thousand cities", id: "highcard" },

    { t: "p", text: "Twenty thousand rows, a city column with two thousand levels — ten rows each — where each city has a real hidden effect on the outcome, plus one numeric feature. **The city carries signal, and no encoder can extract more than ten rows per level allow.** An oracle that knows each city's true effect scores 0.730; that is the ceiling." },

    { t: "code", lang: "python", title: "Every encoder on the same split, logistic regression unless stated (executed)",
      hl: [3, 4, 6, 7, 8, 12, 13],
      code: `#                                            test AUC    columns    fit time
# x only (city dropped)                         0.627          1        0.01 s     <- the floor: what the numeric feature alone gives
# one-hot                                       0.671       1,999       0.09 s     <- the best here: 2,000 coefficients, each from ~7 training rows, regularised
# one-hot, min_frequency=10 (rare levels pooled) 0.639         328       0.04 s     <- pooling 'infrequent' levels threw away most of the signal
# target encoding, in-fold                      0.666           2       0.03 s     <- two columns, nearly one-hot's score
# frequency encoding                            0.628           2       0.03 s     <- how common a city is says nothing about its effect here
# hashing, 64 / 256 / 1,024 buckets             0.627 / 0.625 / 0.633             <- collisions average unrelated cities together; barely above the floor
# target encoding + gradient boosting           0.647           2        3.9 s
# CatBoost, native (ordered target statistics)  0.648           —      111.8 s     <- 30x slower, no better than in-fold target encoding
# oracle: the true city effect as a feature     0.730           2                  <- the ceiling; nothing gets near it with ten rows per city
# HistGradientBoosting native categoricals: refuses -- cardinality must be <= 255`,
      caption: "Three findings. One-hot with regularisation is not the naive choice it is made out to be: with a linear model and a penalty, 2,000 sparse columns are cheap and each coefficient is a shrunken per-city estimate. Target encoding got within 0.005 of it with two columns, which is why it is the default for high cardinality in practice — provided it is fitted in-fold (1.6 showed 0.836 from pure noise when it was not). Hashing and frequency encoding did nothing here because the signal is per-city and neither preserves it; hashing earns its place when the vocabulary is unbounded or unknown in advance (text, URLs, ids that arrive daily), not as a way to squeeze a known column."
    },

    { t: "table",
      head: ["Encoder", "Width", "Assumes", "Leaks?", "Unseen levels", "Use for"],
      rows: [
        ["One-hot", "k", "Nothing", "No", "`handle_unknown='ignore'` → all zeros", "k up to a few hundred; any model; the default"],
        ["Ordinal", "1", "An order", "No", "`unknown_value`", "Ordered levels; trees with any levels"],
        ["Target (out-of-fold, smoothed)", "1", "A level's mean outcome is informative", "Yes, unless in-fold", "Global mean", "High cardinality with a label"],
        ["Frequency", "1", "Rarity is informative", "No", "0", "When how common a level is matters (fraud, rare devices)"],
        ["Hashing", "fixed", "Collisions are tolerable", "No", "Handled by construction", "Unbounded vocabularies, streaming, text tokens"],
        ["Native (LightGBM, CatBoost)", "1", "The library's split rule", "CatBoost: no; naive stats: yes", "Handled", "Tree models on categorical-heavy tables"],
        ["Embedding", "d", "Similar levels should be near", "No", "A reserved 'unknown' vector", "Very high cardinality with lots of data"]
      ]
    },

    { t: "viz",
      title: "Encoders on the two-thousand-city problem",
      caption: "Every encoder sits between the floor (the numeric feature alone) and the oracle ceiling. One-hot and in-fold target encoding recover most of what ten rows per city allow; frequency and hashing recover almost nothing because they discard the per-level identity the signal lives in.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Horizontal bar chart of test AUC for eight encoders between a floor line at 0.627 and a ceiling line at 0.730. One-hot and target encoding are the longest bars; frequency and hashing barely exceed the floor.">
  <line x1="200" y1="20" x2="200" y2="225" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="800" y1="20" x2="800" y2="225" style="stroke:var(--good)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="200" y="14" class="s-sub" text-anchor="middle">floor 0.627</text>
  <text x="800" y="14" class="s-sub" text-anchor="middle" style="fill:var(--good)">oracle 0.730</text>
  <!-- x = 200 + (auc-0.627)/(0.730-0.627)*600 -->
  <g class="s-label" text-anchor="end">
    <text x="190" y="40">one-hot</text><text x="190" y="66">target, in-fold</text><text x="190" y="92">CatBoost native</text><text x="190" y="118">target + gbdt</text>
    <text x="190" y="144">one-hot, pooled rare</text><text x="190" y="170">hashing 1,024</text><text x="190" y="196">frequency</text><text x="190" y="222">hashing 64</text>
  </g>
  <g style="fill:var(--accent)">
    <rect x="200" y="28" width="256" height="16" rx="3"/><rect x="200" y="54" width="227" height="16" rx="3"/>
    <rect x="200" y="80" width="122" height="16" rx="3"/><rect x="200" y="106" width="117" height="16" rx="3"/>
    <rect x="200" y="132" width="70" height="16" rx="3"/><rect x="200" y="158" width="35" height="16" rx="3"/>
    <rect x="200" y="184" width="6" height="16" rx="3"/><rect x="200" y="210" width="2" height="16" rx="3"/>
  </g>
  <g class="s-mono">
    <text x="462" y="41">0.671</text><text x="433" y="67">0.666</text><text x="328" y="93">0.648</text><text x="323" y="119">0.647</text>
    <text x="276" y="145">0.639</text><text x="241" y="171">0.633</text><text x="212" y="197">0.628</text><text x="208" y="223">0.627</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "Target encoding done right: smoothing, in-fold fitting, and what arrives at serving time (executed)",
      hl: [1, 2, 5, 6, 9, 10],
      code: `TargetEncoder(cv=5, smooth="auto")                # scikit-learn: cross-fitted on the training rows, smoothed toward the global mean
# smoothing: encoded value = (n_level · mean_level + m · global_mean) / (n_level + m)     a city with 3 rows is pulled hard toward the prior

# as a Pipeline step it is refitted per outer fold, and the inner cv=5 keeps each training row from seeing its own label:
Pipeline([("pre", ColumnTransformer([("city", TargetEncoder(cv=5), ["city"]), ...])), ("m", LogisticRegression())])
cross_val_score(pipe, X, y, cv=outer)              # honest: 0.666 here.   Fitted once on all rows and then cross-validated: the 0.836-from-noise leak of 1.6

# serving: a city never seen in training gets the global mean; a one-hot column gets all zeros with handle_unknown="ignore";
OneHotEncoder(handle_unknown="ignore").transform([["family"]])      # [[0, 0, 0]]  -- the model sees 'none of the known plans'`,
      caption: "Two things make target encoding safe: smoothing, so a level with three rows is mostly the prior rather than three coin flips; and cross-fitting, so no row's encoded value contains its own label. scikit-learn's `TargetEncoder` does both. The serving question — what does a level the encoder never saw become — must be answered for every encoder before deployment; 'the pipeline crashes on the first new city' is the default answer if you do not."
    },

    { t: "callout", kind: "trap", title: "LabelEncoder is for the target, not for features", body: [
      { t: "p", text: "`LabelEncoder` maps class names to integers for y and is documented as such. Used on a feature column it produces exactly the ordinal encoding of section 02, with alphabetical order as the fabricated ranking, and it has no `handle_unknown` — a new level at serving time raises an error. Use `OrdinalEncoder` for ordered features and `OneHotEncoder` for unordered ones; both take a 2-D input, both handle unknown levels, both live in a ColumnTransformer." }
    ]},

    { t: "ladder",
      title: "A 'device model' column with 8,000 levels for a fraud model",
      rungs: [
        { level: "bad", label: "LabelEncoder, then logistic regression", code: `X["device"] = LabelEncoder().fit_transform(X.device)`,
          note: "**An invented order over 8,000 phone models**, fed to a linear model — and an exception the first day a new handset appears." },
        { level: "ok", label: "One-hot with rare levels pooled", code: `OneHotEncoder(handle_unknown="infrequent_if_exist", min_frequency=50)`,
          note: "**Safe and honest**, but pooling loses the rare devices — which in fraud are often exactly the signal." },
        { level: "best", label: "In-fold target encoding plus frequency, inside the pipeline; CatBoost if trees", code: `ColumnTransformer([("te", TargetEncoder(cv=5), ["device"]), ("freq", FrequencyEncoder(), ["device"]), ...])
# fraud rate per device (smoothed, cross-fitted) AND how rare the device is: two columns, no width problem, unseen -> prior`,
          note: "**Both signals a fraud model wants — a device's history and its rarity — in two columns.** Native CatBoost handling is the alternative for a tree model, at a training-time cost." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Encode the churn table three ways and break one of them",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Encode `plan`, `region` and `channel` with one-hot, with ordinal (alphabetical), and with in-fold target encoding; cross-validate a logistic regression and a gradient booster on each and tabulate the six AUCs. **(b)** Fit an unpenalised `LinearRegression` on `spend_12m` with a full one-hot of `plan` plus an intercept and inspect the coefficients; then refit with `drop='first'` and interpret the two plan coefficients as contrasts. **(c)** Take the target encoder, fit it on *all* rows before cross-validation (the wrong way), and report the inflated score against the in-fold one — then explain the mechanism in two sentences." }
      ],
      requirements: [
        "The 3 × 2 AUC table for (a), and a sentence on where ordinal hurt and where it did not.",
        "Both coefficient sets for (b) with the contrast interpretation.",
        "The leaked and honest scores for (c)."
      ],
      hint: "For (a), `plan` is arguably ordered (basic < plus < pro by price) so ordinal may not hurt much on it; `region` and `channel` are not. For (b), scikit-learn's LinearRegression handles the singular matrix by least-norm; the coefficients will be spread across the intercept and the three indicators in a way that is not interpretable.",
      solution: {
        lang: "python",
        title: "encode_churn.py",
        code: `cat = ["plan", "region", "channel"]; num = [...]
encoders = {"one-hot": OneHotEncoder(handle_unknown="ignore"),
            "ordinal": OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1),
            "target":  TargetEncoder(cv=5, random_state=0)}
for ename, enc in encoders.items():
    pre = ColumnTransformer([("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), num), ("cat", enc, cat)])
    for mname, m in [("logistic", LogisticRegression(max_iter=2000)), ("gbdt", HistGradientBoostingClassifier(max_iter=150, learning_rate=0.05, max_depth=2))]:
        print(ename, mname, cross_val_score(Pipeline([("pre", pre), ("m", m)]), X, y, cv=cv, scoring="roc_auc").mean().round(3))
# executed:            logistic    gbdt
#   one-hot             0.747      0.740
#   ordinal             0.739      0.729
#   target (in-fold)    0.748      0.734
# one-hot and target within a thousandth for logistic; ordinal cost logistic 0.008 (region and channel have no order; plan's
# alphabetical order basic < plus < pro happens to match price, so plan was not hurt) and, on this small table, also cost the
# booster 0.011 -- with 150 depth-2 rounds it has fewer splits to spend isolating integer-coded levels than a forest would.

# (b)
Xf = np.c_[np.ones(len(d)), OneHotEncoder(sparse_output=False).fit_transform(d[["plan"]])]
LinearRegression(fit_intercept=False).fit(Xf, d.spend_12m).coef_          # [108.72, -23.26, 27.97, 104.02]: intercept + each indicator reproduces
#   the group means (85.46, 136.69, 212.74) but the four numbers are individually meaningless -- any constant can be moved between
#   the intercept and the three indicators; the least-norm solution happened to pick this one
Xd = OneHotEncoder(sparse_output=False, drop="first").fit_transform(d[["plan"]])    # columns: plus, pro; basic is the reference
lr = LinearRegression().fit(Xd, d.spend_12m)
lr.intercept_, lr.coef_      # 85.46, [51.23, 127.28]: intercept = mean spend of basic customers; plus spends 51.23 more; pro 127.28 more

# (c)
enc_all = d.groupby("region").churned.mean(); X_leak = X.assign(region=d.region.map(enc_all))       # fitted on every row, including the folds to be scored
cross_val_score(logistic_on(X_leak), ...)          # executed: 0.749 leaked vs 0.748 in-fold -- with four regions of ~250 rows the leak is a thousandth
# mechanism: each row's encoded value includes its own label's contribution to the level mean, so the feature carries a fraction 1/n_level
# of the label into the validation fold; with four regions the fraction is 1/250 and invisible, with two thousand cities at ten rows
# each it is a tenth of the label per row, and with 200 noise 'cities' of five rows it produced the 0.836 of 1.6.`,
        notes: [
          { t: "p", text: "**(a) will show ordinal encoding costing little on this table**, because plan's alphabetical order is coincidentally its price order and the other two categoricals carry little signal. The lesson's colour example is the case where it costs nineteen points; the exercise's point is that you cannot know which case you are in without the one-hot comparison." },
          { t: "p", text: "**(b)'s contrast interpretation** — 'plus customers spend this much more than basic' — is the reason to drop a level when the coefficients are the product. When the predictions are the product, keep all levels and regularise." },
          { t: "p", text: "**(c) with four levels leaked a thousandth; with two thousand it leaks the label.** The leak scales with 1/(rows per level), which is exactly the regime where target encoding is used. Cross-fitting is not optional." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Ordinal-encoded colours gave logistic regression AUC 0.785 and a random forest 0.972; one-hot gave both 0.972. Why the difference?",
          options: [
            "Logistic regression is a weaker model",
            "The ordinal column asserts blue < green < red < yellow, but the true effects are +2.5, −1.0, +2.0, −2.0 — not monotone — so a single coefficient on the integer cannot fit them; a tree splits the integer at three thresholds and isolates each level without assuming an order",
            "The forest overfitted",
            "One-hot always helps trees"
          ],
          answer: 1,
          why: "The encoding is a claim about the levels. Linear models believe the claim; trees do not need it."
        }
      ]
    }
  ],

  takeaways: [
    "**Every encoding is a claim about the levels**: one-hot says unrelated, ordinal says ordered, target says 'a level is its outcome rate', hashing says collisions are fine.",
    "**The dummy trap is exact collinearity with the intercept**; drop a level for unpenalised OLS and for contrast interpretation, keep all levels otherwise.",
    "**Ordinal encoding of an unordered column cost a logistic regression 0.19 AUC and a forest nothing** — trees split integers, linear models believe them.",
    "**LabelEncoder is for y**; OrdinalEncoder and OneHotEncoder are for features and handle unknown levels.",
    "**High cardinality**: regularised one-hot and in-fold target encoding recovered the most (0.671, 0.666); frequency and hashing recovered nothing where the signal is per level.",
    "**Target encoding must be smoothed and cross-fitted**; fitted on all rows it copies the label at 1/(rows per level) resolution.",
    "**Hashing is for unbounded vocabularies**, not for compressing a known column.",
    "**Native categorical handling** exists in LightGBM, CatBoost (ordered statistics, leak-free, slow) and HistGradientBoosting (≤ 255 levels).",
    "**Decide what an unseen level becomes** before deployment: zeros, the prior, an unknown bucket — never an exception.",
    "**Frequency encoding carries a different signal — rarity** — worth adding when rare levels matter (fraud, devices)."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `drop='first'` sometimes wrong for a regularised model?",
        options: [
          "It always improves regularised models",
          "With a level dropped, the reference level is the all-zeros row and its effect is absorbed into the intercept, which is usually unpenalised; the other levels' coefficients are penalised as deviations from it — an asymmetry that depends on which level was dropped. Keeping all levels treats every level the same, and the penalty resolves the collinearity",
          "It causes the dummy trap",
          "Regularised models cannot use one-hot"
        ],
        answer: 1,
        why: "The trap only bites unpenalised OLS. For everything else, symmetry is worth more than one fewer column."
      },
      {
        stem: "Target encoding a 2,000-level column on all rows, then cross-validating, inflates the score. What is the mechanism?",
        options: [
          "The encoder overfits the categories",
          "Each row's encoded value is the mean label of its level, computed including that row's own label; with ten rows per level a tenth of each row's label is copied into its feature and carried into the validation fold — a noise column scored 0.836 this way in 1.6",
          "Cross-validation is not stratified",
          "Target encoding always inflates"
        ],
        answer: 1,
        why: "Cross-fitting (an inner cv) computes each row's value from folds that exclude it. The leak scales with 1 / rows-per-level, largest exactly where target encoding is used."
      },
      {
        stem: "When does the hashing trick earn its place?",
        options: [
          "For any column with more than 100 levels",
          "When the vocabulary is unbounded or unknown at training time — text tokens, URLs, ids that appear daily — so a fixed-width, fit-free encoding that handles new values by construction is worth the collisions; on a known column with per-level signal it lost to one-hot by four points",
          "As a faster one-hot",
          "For ordered categories"
        ],
        answer: 1,
        why: "Collisions average unrelated levels. That is acceptable when the alternative is no encoding at all, and unnecessary when the levels are known."
      },
      {
        stem: "A tree-based pipeline uses ordinal encoding on an unordered 300-level column. Is that a mistake?",
        options: [
          "Yes; always one-hot for trees",
          "Not necessarily: a tree can isolate any level with threshold splits on the integer, so ordinal encoding is a compact, common choice for trees on high-cardinality columns; it would be a mistake for a linear model or a distance method, which would read the integers as an order",
          "Yes; ordinal encoding is only for the target",
          "It depends on the number of trees"
        ],
        answer: 1,
        why: "The colour experiment: forest 0.972 either way, logistic 0.785 versus 0.972. The encoder's assumption only matters to models that use it."
      },
      {
        stem: "A new region appears in production. What happens with each encoder if unseen levels were not planned for?",
        options: [
          "All encoders assign the mean",
          "One-hot with handle_unknown='ignore' gives all zeros; TargetEncoder gives the global mean; hashing maps it to a bucket by construction; LabelEncoder and a bare OrdinalEncoder raise an error and the pipeline fails on its first request",
          "The model retrains automatically",
          "Nothing; models ignore unknown categories"
        ],
        answer: 1,
        why: "'What does an unseen level become' is a serving question with a per-encoder answer, and 'exception' is the default for two of them."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you encode categorical variables?",
        strong: "By what the levels mean and how many there are. Unordered with a manageable number of levels: one-hot, keeping all levels for regularised models and trees, dropping one only for unpenalised OLS or when the coefficients must read as contrasts. Genuinely ordered levels: ordinal encoding with integers that reflect the order — and for tree models, ordinal is also fine on unordered columns because a tree isolates levels with threshold splits, whereas a linear model would read the integers as a ranking and lose accuracy; I have seen nineteen AUC points go that way. High cardinality: cross-fitted, smoothed target encoding as the default, frequency encoding alongside when rarity matters, native handling in CatBoost or LightGBM for trees, hashing only when the vocabulary is unbounded. All inside a ColumnTransformer with unseen levels handled explicitly, because a new value at serving time must become something, not an exception.",
        answer: [
          { t: "p", text: "Encoder by level semantics and cardinality, the tree-versus-linear distinction, and the serving question." }
        ]
      },
      {
        level: "core",
        q: "What is target encoding and what is its risk?",
        strong: "Each level of a categorical is replaced by the mean of the target among rows with that level, smoothed toward the global mean so that a level with three rows is mostly prior rather than three coin flips. It compresses a column of any cardinality into one informative number, which is why it is the workhorse for high-cardinality features. The risk is leakage: if the means are computed on the rows that will then be scored, each row's feature contains a share of its own label — one over the rows per level — and a validation fold sees the label through the feature. A column of random ids encoded this way scored 0.84 AUC on churn. The fix is cross-fitting, computing each row's value from folds that exclude it, which scikit-learn's TargetEncoder does with its internal cv, and refitting the encoder inside each outer fold as a Pipeline step.",
        answer: [
          { t: "p", text: "Definition with smoothing, the compression argument, the leak mechanism with the 1/n scaling, and cross-fitting." }
        ]
      },
      {
        level: "advanced",
        q: "How would you handle a categorical feature with 50,000 unique values?",
        strong: "First ask whether the values have structure — a URL has a domain, a product id has a category, a postcode has a district — because a hierarchy gives lower-cardinality parents worth encoding separately. Then the candidates: cross-fitted smoothed target encoding for the level itself, which handles any cardinality in one column and gives unseen levels the prior; a frequency feature, because with 50,000 levels rarity is usually informative; for a tree model, CatBoost's ordered target statistics, which are leak-free by construction at a training-time cost; and if there is enough data and a network is in play, a learned embedding, which also gives 'similar levels are near each other'. I would rule out plain one-hot at that width unless the model is a regularised linear one on sparse input — where it is actually competitive — and hashing unless the values are unbounded. Whatever I pick, I would measure it against dropping the column and against an encoder that cannot leak, because with a few rows per level the honest ceiling is low and the leaky score can be spectacular.",
        answer: [
          { t: "p", text: "Structure first, the four candidates with their regimes, the surprising competitiveness of regularised one-hot, and the leakage guard." }
        ]
      }
    ]
  }
});
