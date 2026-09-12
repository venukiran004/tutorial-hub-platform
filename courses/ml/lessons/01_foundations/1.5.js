/* ============================================================================
   LESSON 1.5 — Cross-Validation That Matches Deployment
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "**A single train/test split gives you one draw from a distribution of scores, and on the churn table that distribution runs from 0.695 to 0.813.** Cross-validation replaces the draw with an average — and, more importantly, with a spread you can report. But the average is only honest if the folds are built the way deployment will be: stratified when the label is rare, grouped when an entity repeats, ordered when time moves. This lesson measures each of those with the same model on the same data — the score jumps from 0.668 to 0.995 when a customer's five snapshots are allowed to straddle a fold — and ends with nested cross-validation, which is what stops a tuned model's score from being a tuned score.",

  objectives: [
    "Show that a single split is a lottery and read k-fold's mean and spread as an estimate with uncertainty",
    "Choose between stratified, group, time-series, leave-one-out and repeated folds by matching the fold structure to deployment",
    "Demonstrate the group leak and the time leak numerically, and know the signature of each",
    "Run nested cross-validation and explain why the inner best score is optimistic and the outer score is the one to report"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "One split is a lottery", id: "lottery" },

    { t: "code", lang: "python", title: "The same logistic regression, thirty random 70/30 splits of the churn table (executed)",
      hl: [3, 4, 6],
      code: `aucs = []
for seed in range(30):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=seed)
    aucs.append(roc_auc_score(y_te, model().fit(X_tr, y_tr).predict_proba(X_te)[:, 1]))
np.min(aucs), np.max(aucs), np.mean(aucs), np.std(aucs)
#   0.695      0.813      0.756       0.028          <- the same model, the same data: which number would you have reported?`,
      caption: "A range of 0.12 from the split alone, on 990 rows. Any comparison of two models on one split is a comparison of two draws. With `random_state=42` you get one of these thirty numbers and no idea which."
    },

    { t: "code", lang: "python", title: "k-fold: an average with a spread, and what k changes (executed, 20 repetitions each)",
      hl: [2, 3, 4, 5, 8, 9, 10],
      code: `for k in [2, 5, 10]:
    cross_val_score(model(), X, y, cv=StratifiedKFold(k, shuffle=True, random_state=rep), scoring="roc_auc")
#   k     mean of the CV mean    typical fold-to-fold sd    sd of the CV mean across 20 repetitions
#   2          0.748                    0.014                        0.012
#   5          0.754                    0.040                        0.005
#   10         0.757                    0.059                        0.004
# leave-one-out (990 fits, one row held out each time): AUC of the pooled predictions 0.757

# what to read: the CV mean is far more stable than a single split (sd 0.005 against 0.028);
# larger k trains on more rows per fold, so the mean rises toward the full-data score (less pessimistic bias);
# but the per-fold scores spread more, because each fold has fewer rows (a 99-row fold has 16 churners);
# the folds also overlap more in their training sets, so their scores are correlated and the fold sd understates the true uncertainty.`,
      caption: "Five or ten is the usual compromise: enough training rows per fold that the estimate is not pessimistic, few enough fits that it is cheap. Leave-one-out is nearly unbiased but expensive and, for a metric like AUC that needs many rows to compute, must be scored on the pooled predictions rather than per fold. The bias–variance of the CV estimate itself is the interview question hiding here: small k trains on less data (pessimistic bias); large k gives highly correlated folds (variance the fold sd does not show)."
    },

    { t: "dl", items: [
      ["k-fold", "Split into k folds; train on k−1, score on the held-out fold; rotate. Every row is scored exactly once."],
      ["Stratified", "Each fold keeps the class proportions of the whole. Mandatory for classification with a rare class."],
      ["Group k-fold", "All rows of a group (customer, patient, session) stay in one fold. Mandatory when an entity has more than one row."],
      ["TimeSeriesSplit", "Folds are contiguous in time and training always precedes testing — expanding or rolling origin. Mandatory when the deployed model will predict the future."],
      ["Leave-one-out", "k = n. Nearly unbiased, n fits, high variance for small n; score on pooled predictions for AUC-like metrics."],
      ["Repeated k-fold", "k-fold with several shufflings. Averages out the luck of one particular fold assignment; gives a better estimate of the CV mean's own spread."],
      ["Nested CV", "An outer loop for scoring wrapped round an inner loop for hyperparameter choice. The only CV that gives an honest score for a tuned model."],
      ["Shuffle", "`shuffle=True` before folding, unless order carries meaning (time). Without it, sorted data produces folds with different distributions."]
    ]},

    { t: "h2", n: "02", text: "Folds that match deployment", id: "structure" },

    { t: "code", lang: "python", title: "Stratification: what plain KFold does to a 16 % class (executed)",
      code: `for train_idx, test_idx in KFold(5, shuffle=True, random_state=3).split(X, y):            y.iloc[test_idx].mean()
#   plain KFold        churn rate per fold: 0.126  0.152  0.177  0.202  0.157       <- 12.6 % to 20.2 %: the folds are different problems
#   StratifiedKFold    churn rate per fold: 0.162  0.162  0.162  0.162  0.167`,
      caption: "A fold with 12.6 % positives and one with 20.2 % will score differently for reasons that have nothing to do with the model, and the fold sd will report that as model uncertainty. Stratify by default for classification; for regression with a skewed target, stratify on binned quantiles."
    },

    { t: "code", lang: "python", title: "The group leak: when one customer has five rows (executed)",
      hl: [2, 3, 8, 9, 10, 11],
      code: `# the raw churn table has ten customers duplicated exactly; a random forest, 5-fold:
#   random folds with the duplicates in     0.709
#   GroupKFold with duplicates grouped      0.696
#   deduplicated table                      0.689          <- ten pairs out of a thousand rows: a two-point inflation

# now the realistic case: five monthly snapshots per customer (logins jittered by a couple), same forest
snapshots = pd.concat([df.assign(logins_30d=df.logins_30d + rng.integers(-2, 3, len(df)), snap=i) for i in range(5)])
cross_val_score(forest, X_s, y_s, cv=StratifiedKFold(5, shuffle=True), scoring="roc_auc")         # 0.995
cross_val_score(forest, X_s, y_s, cv=GroupKFold(5), groups=snapshots.customer_id, scoring="roc_auc")   # 0.668
# the forest memorised each customer from four snapshots and 'predicted' the fifth. The 0.995 is not a model score;
# it is a lookup. In production every scored customer is new to the model, which is what GroupKFold simulates.`,
      caption: "0.995 against 0.668 is the largest single-number lie in this course, and it needs nothing exotic to produce: repeated measurements of the same entity and a random split. Panel data, sessions, patients with several visits, products with daily rows — group by the entity the deployed model will see for the first time. The signature: a flexible model scores implausibly well and a linear one does not."
    },

    { t: "code", lang: "python", title: "The time leak: a relationship that drifts (executed on a synthetic year)",
      hl: [2, 3, 5, 6, 8],
      code: `# 1,200 days; the coefficient on x1 drifts from +1.5 in January to -1.5 in December
# random 5-fold (shuffled)         AUC 0.708        <- every fold trains on days after the days it tests
# TimeSeriesSplit(5)               AUC 0.638        folds: 0.764  0.716  0.609  0.484  0.619
# train on the first 800 days, score the last 400:   0.473       <- worse than a coin: the sign of the relationship has flipped

# the random score is not wrong about the data; it is wrong about the deployment, which always trains on the past
# and scores the future. Only the time-ordered folds saw the drift — and the falling fold scores are the diagnosis.`,
      caption: "Time-ordered folds are pessimistic by design and that is the point: they estimate what a model trained today will do next month, including the drift it will meet. The per-fold trajectory is a bonus — a monotone decline in fold scores says the world is moving, which is the case for retraining on a schedule (11.1). A gap between the training end and the test start (a purge) is needed when features are computed from windows that would otherwise straddle the boundary (10.3)."
    },

    { t: "table",
      head: ["Data has…", "Use", "Because deployment…", "The leak if you do not"],
      rows: [
        ["A rare class", "StratifiedKFold", "Meets the same base rate", "Folds are different problems; spread is misread as model uncertainty"],
        ["Several rows per entity", "GroupKFold / StratifiedGroupKFold", "Scores entities the model has never seen", "The model memorises entities; 0.995 for a lookup"],
        ["A time order and a future to predict", "TimeSeriesSplit, with a gap", "Trains on the past, scores the future", "Trains on the future; misses drift; sign flips go unseen"],
        ["Both entities and time", "Group folds within a time split, or split entities by their first appearance", "New customers, later period", "Either leak above"],
        ["Very few rows", "Repeated stratified k-fold, or LOO", "…is uncertain anyway; you need the spread", "One fold assignment's luck reported as the result"],
        ["Hierarchy (stores within regions)", "GroupKFold on the level the model generalises across", "Scores new stores, or new regions", "Regional effects memorised and counted as skill"]
      ]
    },

    { t: "h2", n: "03", text: "Nested cross-validation", id: "nested" },

    { t: "p", text: "Tuning a hyperparameter by cross-validation and then reporting the best cross-validated score is using the folds twice: once to choose, once to report. The best of eleven candidate scores is optimistic for the same reason the best of thirty splits is. **Nested CV puts the choice inside an inner loop and scores the chosen model on an outer fold that took no part in the choice.**" },

    { t: "code", lang: "python", title: "Grid search inside cross_validate (executed)",
      hl: [1, 2, 3, 6, 7, 8, 11],
      code: `inner = StratifiedKFold(5, shuffle=True, random_state=1); outer = StratifiedKFold(5, shuffle=True, random_state=2)
search = GridSearchCV(model(), {"m__C": np.logspace(-3, 2, 11)}, cv=inner, scoring="roc_auc")
result = cross_validate(search, X, y, cv=outer, scoring="roc_auc", return_estimator=True)

#   outer fold        1       2       3       4       5      mean
#   inner best score  0.761   0.738   0.765   0.770   0.759   0.758      <- the score that chose C, on the folds that chose it
#   outer score       0.722   0.841   0.737   0.694   0.748   0.749      <- the chosen model on rows that chose nothing
#   chosen C          0.032   0.032   0.1     0.032   0.1                <- the choice is itself unstable across folds

# the non-nested version, GridSearchCV on everything and report best_score_:   0.756 at C = 0.01
# the honest number is 0.749 ± 0.05 -- and the ± is the more important half of it`,
      caption: "The optimism here is small (0.758 against 0.749) because the grid is small and C is a gentle knob; with a hundred candidate configurations and a flexible model the gap can be several points. The unstable choice of C across folds is its own finding: the data does not distinguish 0.032 from 0.1, and any of them is defensible. When you must pick one C for the final model, refit the search on all the data and take its choice — the nested score is what you report, not the one that search prints."
    },

    { t: "viz",
      title: "Nested: two loops, two jobs",
      caption: "The outer loop exists only to score; the inner loop exists only to choose. Any row used to choose cannot also score without bias, which is why the inner loop lives entirely inside each outer training fold.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Outer loop: five folds, one held out for scoring. Inside each outer training set, an inner loop of five folds chooses the hyperparameter. The chosen model is refitted on the outer training set and scored on the outer held-out fold.">
  <g class="s-label" style="font-weight:600">
    <text x="20" y="30">outer fold 1 of 5</text>
    <text x="20" y="150">inner loop, inside the outer training set</text>
  </g>
  <g stroke-width="1.2">
    <rect x="20" y="42" width="130" height="34" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="152" y="42" width="130" height="34" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="284" y="42" width="130" height="34" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="416" y="42" width="130" height="34" rx="6" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="548" y="42" width="130" height="34" rx="6" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="85" y="64">train</text><text x="217" y="64">train</text><text x="349" y="64">train</text><text x="481" y="64">train</text>
    <text x="613" y="64" style="fill:var(--crit)">score → 0.722</text>
  </g>
  <path d="M283,80 L283,120" style="stroke:var(--ink-3)" stroke-width="1.2" stroke-dasharray="3 3"/>
  <g stroke-width="1.2">
    <rect x="20" y="162" width="100" height="30" rx="6" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="122" y="162" width="100" height="30" rx="6" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="224" y="162" width="100" height="30" rx="6" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="326" y="162" width="100" height="30" rx="6" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="428" y="162" width="100" height="30" rx="6" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="70" y="182">fit C₁…C₁₁</text><text x="172" y="182">fit</text><text x="274" y="182">fit</text><text x="376" y="182">fit</text>
    <text x="478" y="182" style="fill:var(--warn)">choose</text>
  </g>
  <text x="274" y="215" class="s-sub" text-anchor="middle">rotate five times → best C = 0.032 (inner best 0.761) → refit on all four outer training folds</text>
  <g class="s-sub">
    <text x="700" y="120">the outer score is the only number that</text>
    <text x="700" y="138">was never used to choose anything</text>
    <text x="700" y="170">inner best: 0.758 (optimistic)</text>
    <text x="700" y="188" style="fill:var(--crit)">outer: 0.749 ± 0.05 (report this)</text>
  </g>
</svg>`
    },

    { t: "h2", n: "04", text: "The six mistakes", id: "mistakes" },

    { t: "table",
      head: ["Mistake", "What it does to the score", "Fix"],
      rows: [
        ["Preprocessing fitted before the folds (scaler, imputer, target encoder, SMOTE)", "Inflates: every fold's test rows shaped the transform", "Put the transform in the Pipeline that `cross_val_score` receives"],
        ["Random folds on grouped data", "Inflates, sometimes absurdly (0.995)", "GroupKFold on the entity"],
        ["Random folds on time-ordered data", "Inflates and hides drift", "TimeSeriesSplit with a gap"],
        ["No stratification with a rare class", "Adds fold-to-fold noise; a fold may have almost no positives", "StratifiedKFold; stratify on binned targets for regression"],
        ["Reporting the CV score that chose the hyperparameters", "Optimistic by the best-of-n effect", "Nested CV, or a separate test set"],
        ["Reporting the mean without the spread", "Hides that a 0.03 difference is inside ±0.05", "Report mean ± sd, or the fold scores; use paired comparisons (2.7)"]
      ]
    },

    { t: "callout", kind: "production", title: "Cross-validation estimates the procedure, not the model", body: [
      { t: "p", text: "The five models fitted during 5-fold CV are thrown away. What the CV score describes is **the procedure** — this pipeline, these hyperparameters, trained on about 80 % of the data — and the final model is that procedure run once more on all the data. That is why the final model should be refitted on everything, and why its score is expected to be slightly better than the CV estimate, not worse. If it is much worse on a genuinely new sample, the folds did not match deployment." }
    ]},

    { t: "ladder",
      title: "Reporting a tuned gradient-boosting model's performance",
      rungs: [
        { level: "bad", label: "GridSearchCV.best_score_", code: `search = GridSearchCV(model, grid, cv=5).fit(X, y); print(search.best_score_)`,
          note: "**The best of every configuration tried, on the folds that chose it.** Optimistic, and more so the bigger the grid." },
        { level: "ok", label: "Search on a training portion, score on a held-out test set", code: `search.fit(X_train, y_train); roc_auc_score(y_test, search.predict_proba(X_test)[:, 1])`,
          note: "**Honest, but one draw** — the test score's own uncertainty is unknown, and on 150 rows it is wide." },
        { level: "best", label: "Nested CV for the estimate, refit on all data for the artefact", code: `scores = cross_validate(search, X, y, cv=outer, scoring="roc_auc")["test_score"]   # report mean ± sd
final = search.fit(X, y).best_estimator_                                              # the model you ship`,
          note: "**The estimate and the artefact are separated.** Five honest scores with a spread describe the procedure; the shipped model is that procedure run on everything." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Find the leak in a 0.98",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "A colleague reports 0.98 AUC for a random forest predicting whether a support ticket will be escalated, cross-validated with `KFold(5, shuffle=True)`. The table has one row per ticket message; a ticket has between one and twelve messages, all sharing the ticket's escalation label, with message features including word counts and hour of day. Build a synthetic version — 300 tickets, 1–12 messages each, features that are mostly per-ticket plus per-message noise — and reproduce the inflated score. Then produce the honest score with the correct splitter, and a third score with a splitter that also respects time (tickets arrive over a year and escalation policy changes mid-year)." }
      ],
      requirements: [
        "Three CV scores: random KFold, GroupKFold by ticket, and a time-aware group split.",
        "One sentence on why the random score is inflated, using the words 'memorise' and 'entity'.",
        "The per-fold scores of the time-aware split, and what their trend says."
      ],
      hint: "Generate per-ticket latent features, replicate them per message with small noise, set the label from the ticket features plus a coefficient that flips halfway through the year. For the time-aware group split, sort tickets by arrival, assign contiguous blocks of tickets to folds, and train only on earlier blocks (a manual TimeSeriesSplit over groups).",
      solution: {
        lang: "python",
        title: "ticket_leak.py",
        code: `rng = np.random.default_rng(0)
n_t = 300
tickets = pd.DataFrame({"ticket": np.arange(n_t), "arrival": np.sort(rng.uniform(0, 365, n_t)),
                        "urgency": rng.normal(size=n_t), "customer_value": rng.normal(size=n_t),
                        "product_age": rng.normal(size=n_t), "prior_tickets": rng.poisson(2, n_t)})
flip = np.where(tickets.arrival < 180, 1.0, -1.0)                              # the policy change: urgency's effect reverses mid-year
tickets["escalated"] = (0.9 * flip * tickets.urgency + 0.6 * tickets.customer_value + rng.normal(0, 0.7, n_t) > 0).astype(int)
n_msg = rng.integers(1, 13, n_t)
msgs = tickets.loc[np.repeat(tickets.index, n_msg)].copy()
msgs["words"] = rng.poisson(40, len(msgs)); msgs["hour"] = rng.integers(0, 24, len(msgs))
for c in ["urgency", "customer_value", "product_age"]: msgs[c] += rng.normal(0, 0.03, len(msgs))   # per-message jitter
X = msgs[["urgency", "customer_value", "product_age", "prior_tickets", "words", "hour"]]; y = msgs.escalated; g = msgs.ticket   # 1,946 rows

rf = RandomForestClassifier(300, random_state=0)
cross_val_score(rf, X, y, cv=KFold(5, shuffle=True, random_state=0), scoring="roc_auc").mean()          # 0.990: the leak reproduced
cross_val_score(rf, X, y, cv=GroupKFold(5), groups=g, scoring="roc_auc").mean()                          # 0.702: new tickets only

# time-aware group split: contiguous blocks of tickets by arrival, train on earlier blocks only
order = tickets.sort_values("arrival").ticket.values; blocks = np.array_split(order, 6)
scores = []
for k in range(1, 6):
    train_t = np.concatenate(blocks[:k]); test_t = blocks[k]
    tr = msgs.ticket.isin(train_t); te = msgs.ticket.isin(test_t)
    rf.fit(X[tr], y[tr]); scores.append(roc_auc_score(y[te], rf.predict_proba(X[te])[:, 1]))
np.round(scores, 3)          # 0.852  0.740  0.413  0.545  0.624
# falls to 0.413 at the fold that crosses day 180 (the model was trained on the old policy), then partly recovers as post-change tickets enter training

# the random score is inflated because the forest memorises each ticket (entity) from most of its messages and recognises
# the remaining messages of the same ticket in the test fold -- a lookup of the label, not a prediction for a new ticket.`,
        notes: [
          { t: "p", text: "**Rows are messages; the deployed model scores tickets.** The unit of generalisation is the ticket, so the ticket is the group. This is the single most common cause of a too-good CV score in practice." },
          { t: "p", text: "**The time-aware split finds the second problem** that GroupKFold cannot: the policy change. Its fold scores dip at the boundary — a monotone or step-shaped trajectory across time-ordered folds is the signature of drift, and the argument for retraining cadence." },
          { t: "p", text: "**Both splits are pessimistic relative to the random one, and both are right**: they estimate what deployment will see — new tickets, later in time." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A random forest scores 0.995 with random folds and 0.668 with GroupKFold by customer, on a table with five snapshots per customer. Which number describes the deployed model?",
          options: [
            "0.995 — more data per fold",
            "0.668 — in production every scored customer is one the model has not seen, which is what GroupKFold simulates; the 0.995 is the forest recognising customers it memorised from their other snapshots",
            "The average of the two",
            "Neither; forests cannot be cross-validated"
          ],
          answer: 1,
          why: "The unit the model must generalise across is the customer, so the customer is the group. Repeated measurements plus random folds is a lookup, not a model."
        }
      ]
    }
  ],

  takeaways: [
    "**A single split is one draw**: thirty splits of the same data ranged 0.695–0.813.",
    "**k-fold gives a mean and a spread**; report both. The CV mean's own sd was 0.005 against 0.028 for a single split.",
    "**Larger k: less pessimistic bias, more correlated folds; 5 or 10 is the compromise.** LOO for tiny data, scored on pooled predictions.",
    "**Stratify** for a rare class: plain KFold gave folds from 12.6 % to 20.2 % positives.",
    "**GroupKFold** when an entity has several rows: random folds scored 0.995 for a lookup.",
    "**TimeSeriesSplit with a gap** when the future is predicted: random folds hid a sign flip that made the deployed model worse than a coin.",
    "**Match the fold structure to deployment**: new entities, later time, same base rate.",
    "**Nested CV** for a tuned model: the inner best score chose the hyperparameters and is optimistic; the outer score is reported.",
    "**The hyperparameter choice can be unstable across folds** — that is information about the data, not a bug.",
    "**CV estimates the procedure, not the model**: refit on all the data for the artefact you ship."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is a 10-fold estimate less pessimistic than a 2-fold estimate, and why is its fold-to-fold sd not the whole uncertainty?",
        options: [
          "10-fold uses less data",
          "Each 10-fold model trains on 90 % of the rows rather than 50 %, so it is closer to the final model's performance; but the ten training sets overlap heavily, so the fold scores are correlated and their sd understates the variance of the estimate",
          "10-fold is always exact",
          "2-fold is more accurate"
        ],
        answer: 1,
        why: "The executed run: means 0.748 → 0.757 with k, fold sd 0.014 → 0.059 while the sd of the CV mean fell 0.012 → 0.004. Bias falls with k; the naive fold sd is not a confidence interval."
      },
      {
        stem: "What is the signature of a group leak in a cross-validation result?",
        options: [
          "All models score badly",
          "A flexible model (forest, boosting, KNN) scores implausibly well while a linear model does not, on data where an entity has several rows",
          "The fold scores fall over time",
          "The folds have different class rates"
        ],
        answer: 1,
        why: "Flexible models can memorise an entity from its other rows; a linear model cannot. The 0.995 came from a forest on five snapshots per customer."
      },
      {
        stem: "Time-ordered folds scored 0.764, 0.716, 0.609, 0.484, 0.619 while random folds averaged 0.708. What do you conclude?",
        options: [
          "Random folds are better because the number is higher",
          "The relationship is drifting: the random score trains on the future and hides it; the falling time-ordered folds are the honest estimate of deployment and the case for scheduled retraining",
          "The model is underfitting",
          "TimeSeriesSplit is broken"
        ],
        answer: 1,
        why: "Training on the first 800 days and scoring the last 400 gave 0.473. The random score was never available to a model deployed in time."
      },
      {
        stem: "GridSearchCV reports best_score_ = 0.756. Nested CV on the same search gives 0.749 ± 0.05. Which do you report and why?",
        options: [
          "0.756; it is the best model",
          "0.749 ± 0.05: the best_score_ is the maximum over eleven candidates on the folds that chose it, so it is optimistic; the outer folds took no part in the choice",
          "Their average",
          "0.756 with the sd from the nested run"
        ],
        answer: 1,
        why: "Any number that was used to make a choice is biased as a report of that choice. The gap here is small; with a large grid and a flexible model it is not."
      },
      {
        stem: "After 5-fold CV, which model do you deploy?",
        options: [
          "The fold model with the best score",
          "The same pipeline and hyperparameters refitted on all the data: CV estimated the procedure's performance at ~80 % of the data, and the full-data fit is expected to do slightly better",
          "An average of the five fold models",
          "The fold model with the median score"
        ],
        answer: 1,
        why: "The five fold models are scaffolding. The estimate describes the procedure; the artefact is the procedure applied once more, to everything."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is cross-validation and when would you use k-fold rather than a hold-out set?",
        strong: "Cross-validation splits the data into k folds, trains on k−1 and scores on the held-out fold, rotating so every row is scored once, and reports the mean and spread of the k scores. A single hold-out gives one draw from a distribution — on a thousand rows I have seen the same model range from 0.70 to 0.81 across random splits — so k-fold is the default whenever training is cheap enough, because it gives a more stable estimate and, critically, a spread to compare models against. A hold-out set is right when data is huge and training is expensive, and as the final test set that no decision ever touched. The folds must match deployment: stratified for a rare class, grouped when an entity has several rows, time-ordered when the future is predicted; and any preprocessing must be fitted inside each fold via a Pipeline.",
        answer: [
          { t: "p", text: "Mean and spread, folds matched to deployment, and preprocessing inside the fold — the three points that make it a practitioner's answer." }
        ]
      },
      {
        level: "core",
        q: "Derive the bias and variance of the k-fold estimate.",
        strong: "Each fold model is trained on (k−1)/k of the data, so it is slightly worse than the final model trained on all of it — the k-fold estimate is pessimistically biased, and the bias shrinks as k grows; leave-one-out is nearly unbiased. The variance has two parts: the per-fold scores vary because each test fold is small — a 99-row fold with 16 positives gives a noisy AUC — and, as k grows, the k training sets overlap more and more, so the fold scores become correlated and the naive sd of the fold scores understates the true variance of the mean. In a run on a thousand rows, going from k=2 to k=10 moved the mean from 0.748 to 0.757 and the fold sd from 0.014 to 0.059, while repeated CV showed the sd of the mean falling from 0.012 to 0.004. The practical compromise is five or ten folds, repeated with different shuffles when you need the spread of the estimate itself.",
        answer: [
          { t: "p", text: "Pessimistic bias falling with k; variance from small folds and from correlated training sets — with numbers." }
        ]
      },
      {
        level: "advanced",
        q: "You cross-validate a tuned model and report its best CV score. What is wrong, and what should you do?",
        strong: "The score that chose the hyperparameters is the maximum over every configuration tried, measured on the same folds that made the choice, so it is optimistic by the best-of-n effect — mildly for a small grid on a gentle knob, badly for a large search on a flexible model. The fix is nested cross-validation: an outer loop that only scores, and inside each outer training set an inner loop that only chooses; the outer fold never influenced the choice, so its score is honest. In a run I did, the inner best was 0.758 and the outer 0.749 ± 0.05, with the chosen regularisation strength varying across folds, which is itself useful — the data cannot distinguish those settings. For the artefact, refit the search on all the data and ship its choice; report the nested estimate. If compute forbids nesting, a separate test set touched once is the fallback, with the caveat that a single test score has an unknown spread.",
        answer: [
          { t: "p", text: "Best-of-n optimism, the two-loop structure, the unstable choice as information, and estimate-versus-artefact — complete." }
        ]
      }
    ]
  }
});
