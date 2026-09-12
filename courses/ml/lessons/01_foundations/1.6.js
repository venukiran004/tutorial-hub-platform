/* ============================================================================
   LESSON 1.6 — Data Leakage
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "**Leakage is information in the training features that will not exist at prediction time — and it is the most common reason a model that scored 0.94 offline does nothing in production.** It arrives four ways: a column that is a consequence of the label, a transform fitted on rows it will later be tested on, a feature computed from a window that reaches into the future, and rows that straddle the split. Each has a signature. This lesson plants all four on the course data, shows the number each one fakes — a noise column scoring 0.836, a rolling mean scoring 0.771 for looking three days ahead — and gives the tests that find them before a reviewer does.",

  objectives: [
    "Name the four kinds of leakage and, for each, the mechanism and the offline score it inflates",
    "Recognise the signatures: an implausible score, one dominating feature, a transform outside the fold, a window that is centred rather than trailing",
    "Run the detection tests — the availability question, permutation importance, in-fold re-encoding, time-shifted features, adversarial validation",
    "Apply the prevention checklist so that the pipeline cannot leak by construction"
  ],

  prerequisites: ["1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Four kinds, four signatures", id: "kinds" },

    { t: "table",
      head: ["Kind", "Mechanism", "Example on the churn table", "Signature", "Executed score"],
      rows: [
        ["Target (label) leakage", "A feature is caused by, recorded after, or derived from the label", "`refund_issued` — refunds are issued after cancellation", "One feature dominates importance; score too good for the problem", "0.943 CV AUC; permutation importance 0.345 against 0.017 for the next feature"],
        ["Preprocessing leakage", "A transform (scaler, imputer, encoder, resampler, selector) is fitted on rows that are later scored", "A 200-level noise column target-encoded on all rows", "A useless feature scores well; the score falls when the transform moves inside the fold", "0.836 encoded on all rows; 0.468 encoded in-fold"],
        ["Temporal leakage", "A feature uses information from after the as-of time", "A 7-day rolling mean that is centred rather than trailing", "A rolling or aggregate feature scores far better than the raw value it summarises", "0.771 centred; 0.618 trailing; 0.571 raw"],
        ["Train–test contamination", "The same entity, or an exact duplicate, appears in both sides of the split", "Ten duplicated customers; five snapshots per customer (1.5)", "A flexible model scores implausibly; a linear one does not", "0.995 random folds; 0.668 grouped"]
      ]
    },

    { t: "code", lang: "python", title: "Target leakage: the score and the importance table (executed)",
      hl: [2, 5, 6, 7],
      code: `# gradient boosting with refund_issued among the features, 5-fold
cross_val_score(pipe_with_refund, X, y, cv=cv, scoring="roc_auc").mean()        # 0.943      (0.730 without it, 1.2)

permutation_importance(pipe_with_refund, X_test, y_test, scoring="roc_auc", n_repeats=10)
#   refund_issued      0.345     <- shuffle it and AUC drops by 0.345
#   tenure_months      0.017
#   logins_30d         0.013
#   region             0.007
#   support_tickets    0.002
# one feature carries twenty times the next. That is not a strong predictor; it is the label under another name.`,
      caption: "Two tests catch this. The availability question — *at the moment of scoring, is this value known?* — answered by whoever produces the column, not by the data scientist. And the importance table: a real driver of a noisy human decision shares the load; a consequence of the label takes all of it. `churned` correlated +0.829 with the refund flag and −0.21 with tenure; nothing honest correlates at 0.83 with churn."
    },

    { t: "dl", items: [
      ["Target leakage", "A feature that would not exist, or would have a different value, if the label were different — because it is downstream of the label in time or causation."],
      ["Label leakage vs feature leakage", "Label leakage: the label itself, or a proxy, is in the features. Feature leakage: legitimate features computed with information from the wrong time — the same disease, different vector."],
      ["Preprocessing leakage", "Any fit-then-transform step that saw test rows during fit. Scalers leak a little; imputers by model, target encoders, feature selectors and SMOTE leak a lot."],
      ["Temporal leakage", "Features built from windows that reach past the as-of time, or labels defined so that the feature window overlaps the label window."],
      ["Contamination", "Rows in the test set that are copies, near-copies, or same-entity siblings of training rows."],
      ["Train-time vs inference-time feature", "A feature that can be computed at training time from the historical table but not at inference time from the live system — an aggregate that needs the whole month, a column populated by a nightly job."],
      ["Adversarial validation", "Train a classifier to tell training rows from test rows. AUC near 0.5 means the two are alike; higher means a shift, and its top feature says where."]
    ]},

    { t: "h2", n: "02", text: "Preprocessing leakage: the noise column that scored 0.836", id: "preprocessing" },

    { t: "code", lang: "python", title: "Target encoding a random category, outside and inside the fold (executed)",
      hl: [2, 5, 6, 10, 11],
      code: `df["city"] = rng.integers(0, 200, len(df)).astype(str)          # 200 cities assigned at random: no relation to churn whatsoever

# wrong: encode each city by its churn rate over ALL rows, then cross-validate a model on that one column
enc = df.groupby("city").churned.mean(); X_wrong = df.city.map(enc)
cross_val_score(LogisticRegression(), X_wrong, y, cv=cv, scoring="roc_auc").mean()          # 0.836
# a city with 5 customers of whom 2 churned gets the value 0.4 -- computed FROM the churn of the rows now being scored.
# the encoder has copied the label into the feature at the resolution of a five-row group.

# right: the encoder is a Pipeline step, refitted on each training fold, with inner cross-fitting
pipe = Pipeline([("te", TargetEncoder(cv=5)), ("m", LogisticRegression())])
cross_val_score(pipe, df[["city"]], y, cv=cv, scoring="roc_auc").mean()                     # 0.468   -- noise scores like noise`,
      caption: "0.836 from a column of random integers. Target encoding is the extreme case because its transform is literally a function of the label, but the same mechanism inflates any transform fitted outside the fold: a feature selector that picked the columns most correlated with y across all rows, an imputer that learned from test rows, SMOTE that manufactured test-fold neighbours from training positives. **The rule is mechanical: every fitted step is inside the Pipeline that the CV loop receives.**"
    },

    { t: "table",
      head: ["Transform", "Fitted outside the fold leaks…", "Severity", "In-fold form"],
      rows: [
        ["StandardScaler / MinMaxScaler", "The test rows' mean and range", "Low, but non-zero", "Pipeline step"],
        ["SimpleImputer (median)", "The test rows' median", "Low", "Pipeline step"],
        ["KNNImputer / IterativeImputer", "Test rows' values into training rows' imputations", "Medium", "Pipeline step"],
        ["TargetEncoder", "The label itself, at group resolution", "Severe (0.836 from noise)", "Pipeline step with internal cv"],
        ["SelectKBest / correlation filter", "Which features happen to correlate with the test labels", "Severe with many features", "Pipeline step"],
        ["SMOTE / oversampling", "Synthetic test-fold positives built from training positives", "Severe; also fakes the validation base rate", "imblearn Pipeline, resampling on the training fold only (8.2)"],
        ["PCA", "Test rows' directions of variance", "Low", "Pipeline step"]
      ]
    },

    { t: "h2", n: "03", text: "Temporal leakage: the window that looked ahead", id: "temporal" },

    { t: "code", lang: "python", title: "A centred rolling mean predicts tomorrow because it contains tomorrow (executed)",
      hl: [3, 4, 8, 9, 10],
      code: `# a wandering daily signal; the task: predict whether tomorrow's value is above the median, from today's history
s = pd.Series(signal[:-1]); target = (signal[1:] > np.median(signal)).astype(int)
trailing = s.rolling(7).mean()                    # days t-6 .. t          : available at t
centred  = s.rolling(7, center=True).mean()       # days t-3 .. t+3        : uses three days that have not happened yet

# logistic regression, TimeSeriesSplit(5)
#   today only               AUC 0.571
#   today + trailing mean    AUC 0.618      <- history helps a little, honestly
#   today + centred mean     AUC 0.771      <- the 'feature' contains the answer: t+1 is inside the window
# pandas' rolling(center=True), a groupby-transform mean over the whole month, a 'days since last order' that counts
# an order placed after the as-of date -- every one of these is this row.`,
      caption: "The signature is a summary feature that beats the raw values it was computed from by more than smoothing could explain. The test is the one from the SQL course's point-in-time lesson: for each feature, name the window it was computed over and check that it ends strictly before the as-of time. Labels have the mirror rule — the label window starts at or after the as-of time and must not overlap the feature window."
    },

    { t: "viz",
      title: "Where each leak enters",
      caption: "Target leakage enters through the columns; preprocessing leakage through a fit that saw the wrong rows; temporal leakage through a window that crosses the as-of line; contamination through rows that should have been one. Each has a place in the pipeline where it can be stopped.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="A pipeline: source columns, rows, split, transforms, model, score. Four red arrows mark where each leakage kind enters: consequence columns at the source, duplicate rows at the split, transforms fitted across the split, and feature windows crossing the as-of time.">
  <defs>
    <marker id="ac-ah-16" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <g stroke-width="1.2">
    <rect x="20" y="90" width="130" height="50" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="190" y="90" width="130" height="50" rx="8" style="fill:var(--ink-4);fill-opacity:.2;stroke:var(--ink-3)"/>
    <rect x="360" y="90" width="130" height="50" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="530" y="90" width="130" height="50" rx="8" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)"/>
    <rect x="700" y="90" width="150" height="50" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="85" y="120">columns</text><text x="255" y="120">split</text><text x="425" y="120">fitted transforms</text><text x="595" y="120">features in time</text><text x="775" y="120">model + score</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2">
    <line x1="150" y1="115" x2="190" y2="115" marker-end="url(#ac-ah-16)"/><line x1="320" y1="115" x2="360" y2="115" marker-end="url(#ac-ah-16)"/>
    <line x1="490" y1="115" x2="530" y2="115" marker-end="url(#ac-ah-16)"/><line x1="660" y1="115" x2="700" y2="115" marker-end="url(#ac-ah-16)"/>
  </g>
  <g style="stroke:var(--crit)" stroke-width="1.6" fill="none">
    <line x1="85" y1="40" x2="85" y2="88" marker-end="url(#ac-ah-16)"/><line x1="255" y1="40" x2="255" y2="88" marker-end="url(#ac-ah-16)"/>
    <line x1="425" y1="40" x2="425" y2="88" marker-end="url(#ac-ah-16)"/><line x1="595" y1="40" x2="595" y2="88" marker-end="url(#ac-ah-16)"/>
  </g>
  <g class="s-sub" text-anchor="middle" style="fill:var(--crit)">
    <text x="85" y="22">target leakage</text><text x="85" y="36">a consequence of y</text>
    <text x="255" y="22">contamination</text><text x="255" y="36">duplicates, same entity</text>
    <text x="425" y="22">preprocessing leakage</text><text x="425" y="36">fit saw test rows</text>
    <text x="595" y="22">temporal leakage</text><text x="595" y="36">window crosses as-of</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="85" y="170">ask: known at scoring time?</text>
    <text x="255" y="170">dedupe; GroupKFold</text>
    <text x="425" y="170">Pipeline inside the CV loop</text>
    <text x="595" y="170">trailing windows; as-of joins</text>
    <text x="775" y="170">importance table; plausibility</text>
  </g>
  <text x="440" y="225" class="s-sub" text-anchor="middle">each leak has one place in the pipeline where it can be stopped by construction rather than by vigilance</text>
</svg>`
    },

    { t: "h2", n: "04", text: "Detection and prevention", id: "detection" },

    { t: "table",
      head: ["Test", "What it asks", "Finds", "Executed result"],
      rows: [
        ["Plausibility", "Is this score possible for this problem? Churn, fraud and default are noisy human outcomes; 0.95 is not a model, it is a leak", "Any kind", "0.943 with the refund flag; 0.73 without"],
        ["Availability", "For each feature: at the instant of scoring, who computes this and from what? Would it have a value for a customer who has not churned yet?", "Target, temporal", "`refund_issued` is 0 for every live customer"],
        ["Importance domination", "Does one feature carry most of the permutation importance?", "Target", "0.345 vs 0.017"],
        ["Fold-position check", "Is every fitted transform inside the Pipeline given to `cross_val_score`?", "Preprocessing", "0.836 → 0.468 when the encoder moved in-fold"],
        ["Window audit", "For each engineered feature, the window's end relative to the as-of time; for the label, the window's start", "Temporal", "centred 0.771 vs trailing 0.618"],
        ["Time-shift test", "Refit with every feature lagged by one period; a large drop means a feature was looking ahead", "Temporal", "—"],
        ["Adversarial validation", "Can a classifier tell training rows from test rows?", "Shift and contamination", "AUC 0.74 with a shifted `logins_30d`; 0.5 is the goal"],
        ["Entity check", "Does any key appear on both sides of the split?", "Contamination", "20 duplicate rows; 0.995 for five snapshots"]
      ]
    },

    { t: "code", lang: "python", title: "Adversarial validation: a model whose only job is to tell the two sides apart (executed)",
      hl: [3, 4, 6, 7],
      code: `# the last 290 rows have logins_30d shifted up by 4 (a changed logging system, say); label each row train=0 / test=1
is_test = (df.index >= 700).astype(int)
adv = Pipeline([("pre", pre), ("m", RandomForestClassifier(200))])
cross_val_score(adv, X, is_test, cv=cv, scoring="roc_auc").mean()          # 0.740        (0.5 would mean indistinguishable)
permutation_importance(adv.fit(X, is_test), X, is_test, scoring="roc_auc")
#   logins_30d   0.245     <- the feature that changed; everything else near zero
# the cure is not 'drop logins': it is to find out why the distribution moved, and whether it moved in production too`,
      caption: "Adversarial validation answers a different question from the other tests — not 'is there a leak' but 'are these two sets the same population' — and it is the first thing to run when a model that cross-validated well fails on the holdout or in production. A high AUC with one dominating feature usually means a data-collection change; with many features contributing, a genuine drift (11.1)."
    },

    { t: "callout", kind: "production", title: "The prevention checklist", body: [
      { t: "p", text: "**1.** Define the as-of time and the label window before any feature. **2.** For every column, write who produces it and when; drop anything produced after the as-of time or by a process that knows the outcome. **3.** Deduplicate and choose the split — group, time, or both — before any fit. **4.** Every fitted transform is a Pipeline step; the Pipeline is what the CV loop receives. **5.** Build windowed features with trailing windows ending strictly before the as-of time, and labels from windows starting at or after it. **6.** Read the importance table and the score for plausibility before believing either. **7.** Run adversarial validation between the training set and the most recent data. **8.** Keep the test set for one look, and compare that look to the CV estimate." }
    ]},

    { t: "ladder",
      title: "A feature engineer proposes 'average monthly spend' for the churn model",
      rungs: [
        { level: "bad", label: "Compute it over the customer's whole history", code: `spend_avg = orders.groupby("customer_id").amount.mean()        # includes months after the as-of date, and the final month of a churner`,
          note: "**Temporal leakage.** A churner's final partial month drags the average down; the feature encodes the outcome." },
        { level: "ok", label: "Compute it over months before the as-of date", code: `spend_avg = orders[orders.month < as_of].groupby("customer_id").amount.mean()`,
          note: "**Honest window.** But it is fitted once on the historical table; in production the same feature must come from the live orders table with the same rule — training–serving skew risk." },
        { level: "best", label: "Trailing window, strict inequality, one definition for training and serving", code: `# feature table keyed on (customer_id, as_of): AVG(amount) over orders with month >= as_of - 6 AND month < as_of
# the same SQL produces the training rows (historical as_of grid) and the serving rows (as_of = today)`,
          note: "**Strict, bounded, and the same code path both times.** The window's end is before the as-of time by construction; the window's length is fixed so the feature means the same thing for a new and an old customer." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Diagnose",
      title: "Five features, five verdicts",
      difficulty: "core",
      minutes: 22,
      body: [
        { t: "p", text: "A churn model is being built with an as-of date of the 1st of each month and a label of 'cancelled during that month'. For each proposed feature, state whether it leaks, which kind, and the fix or replacement." },
        { t: "p", text: "**(a)** `days_since_last_login` computed from the login table as of the extraction date (the 15th). **(b)** `support_tickets_30d` counting tickets with `created_at` in the 30 days before the 1st. **(c)** `plan_downgraded_flag`, set by the billing system when a customer moves to a cheaper plan — including the automatic downgrade to 'free' that happens on cancellation. **(d)** `region_churn_rate`, the historical churn rate of the customer's region computed over the full table, added as a numeric column before cross-validation. **(e)** `tenure_months`, months since sign-up as of the 1st." }
      ],
      requirements: [
        "A verdict and a kind for each of the five.",
        "A concrete fix for each leaking feature.",
        "One sentence on how you would have caught (c) without reading the billing system's code."
      ],
      hint: "Two are clean. One is temporal, one is target, one is preprocessing. For (c): the importance table and the availability question both catch it.",
      solution: {
        lang: "text",
        title: "Verdicts",
        code: `(a) days_since_last_login as of the 15th        TEMPORAL LEAK. The as-of time is the 1st; logins between the 1st and the 15th are
    in the label window. A customer who cancelled on the 3rd has no logins after it, so the feature grows with the label.
    Fix: compute as of the 1st: days between the last login strictly before the 1st and the 1st.

(b) support_tickets_30d, created_at in the 30 days before the 1st        CLEAN. Trailing window ending strictly before the as-of time.
    Confirm the strictness (< the 1st, not <=) and that created_at is not backfilled by a later process.

(c) plan_downgraded_flag including the automatic downgrade on cancellation        TARGET LEAK. For every churner the flag is set by
    the cancellation itself; it is the label with a different name. Fix: rebuild the flag from voluntary downgrades only, with the
    downgrade date strictly before the as-of time; or drop it. Caught without reading the billing code by: permutation importance
    dominated by one binary flag, and the availability question -- 'what value does this have for a live customer on the 1st?'

(d) region_churn_rate computed over the full table before CV        PREPROCESSING LEAK. The rate includes the churn outcomes of the rows
    in every validation fold. Fix: TargetEncoder as a Pipeline step (refitted per fold, with internal cross-fitting), or compute the rate
    from a period strictly before the training window.

(e) tenure_months as of the 1st        CLEAN. Known at scoring time, computed from a date before the as-of time.`,
        notes: [
          { t: "p", text: "**(a) is the subtle one**: the feature's definition is fine; its computation date is wrong. Every 'as of extraction' feature has this problem when the extraction happens inside the label window." },
          { t: "p", text: "**(d) is the one people defend** — 'it is just a regional average'. Any statistic that includes the label of rows being scored is the label at some resolution; regions with few customers make it worse." },
          { t: "p", text: "**The two clean features share a property**: a window that ends strictly before the as-of time, computed from a column that is not rewritten by later events. That property is the definition of a safe feature." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A column of 200 random city ids, target-encoded on all rows, scored 0.836 alone. Why?",
          options: [
            "Cities predict churn",
            "The encoding replaced each city with the churn rate of its four or five customers — including the churn of the very rows then being scored; the feature was a copy of the label at group resolution. Encoded inside the fold it scored 0.468",
            "Logistic regression overfitted",
            "The CV was not stratified"
          ],
          answer: 1,
          why: "Any transform fitted on the rows it will be evaluated on leaks; a transform that is a function of the label leaks the label. The fix is structural: the encoder is a Pipeline step."
        }
      ]
    }
  ],

  takeaways: [
    "**Leakage is information in training that will not exist at scoring time**; it inflates offline scores and evaporates in production.",
    "**Four kinds**: target (a consequence of y), preprocessing (a fit that saw test rows), temporal (a window past the as-of time), contamination (entities on both sides of the split).",
    "**Signatures**: an implausible score; one feature dominating importance (0.345 vs 0.017); a noise feature that scores (0.836); a summary feature beating its raw inputs (0.771 vs 0.618).",
    "**The availability question** — who computes this, when, and what value does a live row have — is answered by the data producer, not by correlation.",
    "**Every fitted transform is a Pipeline step inside the CV loop**; target encoding, feature selection and SMOTE are the severe cases.",
    "**Windowed features are trailing and end strictly before the as-of time; labels start at or after it.**",
    "**Adversarial validation** (AUC of train-vs-test) finds shift and contamination and names the feature.",
    "**Plausibility first**: churn, fraud and default do not score 0.95 from honest features.",
    "**One definition for training and serving features**, so the honest window is also the deployed one.",
    "**Prevent by construction, detect by habit**: the checklist, then the tests, then the one look at the test set."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the difference between label leakage and feature leakage?",
        options: [
          "None; they are synonyms",
          "Label leakage puts the label or a proxy for it among the features (a refund flag set on cancellation); feature leakage computes a legitimate feature with information from the wrong time (a centred rolling mean) — same effect, different vector and different fix",
          "Label leakage only affects classification",
          "Feature leakage only affects trees"
        ],
        answer: 1,
        why: "Both inflate the score; one is fixed by dropping or rebuilding the column, the other by fixing the window."
      },
      {
        stem: "Which transform is most dangerous to fit outside the cross-validation fold?",
        options: [
          "StandardScaler",
          "A target encoder or a feature selector — both are functions of the labels, so fitting them on all rows copies label information into the features of the rows that will be scored",
          "PCA",
          "Median imputation"
        ],
        answer: 1,
        why: "Scalers leak the test rows' mean — a small effect. Label-dependent transforms leak the label itself, at whatever resolution their groups have."
      },
      {
        stem: "A 7-day centred rolling mean scored 0.771 and the trailing version 0.618. What made the difference?",
        options: [
          "Centred windows smooth better",
          "The centred window includes three future days, one of which is the day being predicted; the feature contained the answer. Trailing windows ending before the as-of time are the only honest form",
          "The trailing window was too short",
          "Random noise"
        ],
        answer: 1,
        why: "The window audit — where does this window end relative to the as-of time — catches this without running anything."
      },
      {
        stem: "Adversarial validation between training rows and last month's rows gives AUC 0.74 with `logins_30d` dominating. What do you conclude?",
        options: [
          "The model is leaking",
          "The two sets are not the same population and the difference is concentrated in one feature — most likely a data-collection or logging change; find the cause before retraining or dropping the feature",
          "Drop logins_30d",
          "Nothing; 0.74 is fine"
        ],
        answer: 1,
        why: "One dominating feature points to a pipeline change; many contributing features point to genuine drift. Either way the model trained on the old rows is scoring a different world."
      },
      {
        stem: "Why does an implausibly high score deserve suspicion before celebration?",
        options: [
          "High scores are always wrong",
          "Outcomes like churn, fraud and default depend on information nobody records; honest features rarely exceed ~0.8 AUC on them, so 0.94 is far more likely to be a leak than a breakthrough — and the cost of shipping a leak is a model that does nothing",
          "Reviewers dislike high scores",
          "Because the test set is small"
        ],
        answer: 1,
        why: "Plausibility is a prior. The executed leak scored 0.943; the honest model 0.73. Which of those numbers is surprising depends on knowing the problem."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is data leakage? Give three examples from production.",
        strong: "Leakage is information in the training features that will not be available, or will have a different value, at prediction time — so the offline score is inflated and the deployed model underperforms it. Three I have seen: a refund or downgrade flag that the billing system sets when a customer cancels, which is the churn label under another name and dominates feature importance; a target encoding or feature selection fitted on the whole table before cross-validation, which copies the validation labels into the features — I have watched a column of random ids score 0.84 that way; and a rolling or aggregate feature computed with a window that reaches past the as-of date, such as a centred moving average or a 'days since last event' that counts events after the label window opened. A fourth, contamination, is the same entity's rows on both sides of a random split.",
        answer: [
          { t: "p", text: "Naming the mechanism and the signature for each — dominance, in-fold collapse, summary-beats-raw — is what makes the examples credible." }
        ]
      },
      {
        level: "core",
        q: "How do you prevent leakage in feature engineering?",
        strong: "By construction where possible and by testing where not. Construction: fix the as-of time and the label window first; build every windowed feature with a trailing window that ends strictly before the as-of time; compute features from a point-in-time feature table so training and serving use one definition; put every fitted transform — scaler, imputer, encoder, selector, resampler — inside a Pipeline that the cross-validation loop receives; deduplicate and split by entity and time before any fit. Testing: ask for each column who produces it and when; read the permutation-importance table for a dominating feature; check the score for plausibility against the problem; refit with all features lagged one period and look for a drop; run adversarial validation between training data and the latest data. Then one look at the test set, compared with the CV estimate.",
        answer: [
          { t: "p", text: "Construction first, tests second, and the test set last — the order matters as much as the list." }
        ]
      },
      {
        level: "advanced",
        q: "A model cross-validated at 0.92 and scores 0.68 in production. Diagnose.",
        strong: "The gap is the signature of leakage or a mismatched split, so I would check those before anything about the model. First, plausibility: 0.92 on a human-behaviour label is itself the alarm. Then the four vectors. Target leakage: permutation importance — one feature dominating — and the availability question for the top features, asked of the people who produce them. Preprocessing leakage: whether every fitted transform sat inside the CV pipeline, especially encoders, selectors and resampling. Temporal leakage: an audit of each feature's window against the as-of time, and a refit with features lagged one period. Contamination: whether entities appear across folds, which a GroupKFold rerun exposes immediately. In parallel, adversarial validation between the training rows and recent production rows, to separate leakage from a shift in the population — a high AUC with one feature dominating suggests a logging change; many features contributing suggests drift. The fix follows from which test fires, and in my experience it is usually the second or third of those, not the model.",
        answer: [
          { t: "p", text: "A structured diagnosis that treats the gap as evidence and knows which test isolates which cause." }
        ]
      }
    ]
  }
});
