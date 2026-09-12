/* ============================================================================
   LESSON 3.3 — Missing Data
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**A missing value is a fact about the row before it is a gap in the matrix — and the first question is why it is missing.** Missing at random because the sensor dropped a reading is one situation; missing because basic-plan customers do not get a support-tickets field is another; missing because the customers with the most tickets hid them is a third, and it is the one that poisons every imputer. This lesson tests the churn table's missingness mechanism (a model predicts 'is missing' at AUC 0.64, so it is not random), runs seven treatments from row deletion to iterative imputation, shows what each actually writes into the gaps, plants an MNAR pattern and watches the indicator column recover what imputation alone loses, and ends with the models that need no imputation at all.",

  objectives: [
    "Distinguish MCAR, MAR and MNAR, and test for MCAR by predicting missingness from the other columns",
    "Apply deletion, constant, mean/median, KNN and iterative imputation and say what each writes into the gaps and what it does to the variance",
    "Use missingness indicators and explain when missingness is itself a feature",
    "Handle missing categoricals, use models with native NaN support, and fit every imputer inside the fold"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "Why is it missing?", id: "why" },

    { t: "table",
      head: ["Mechanism", "Missingness depends on…", "Example", "Safe treatments", "What breaks"],
      rows: [
        ["MCAR — missing completely at random", "Nothing", "A sensor drops readings at random; a form field lost in a migration", "Anything, including deleting rows (only power is lost)", "Nothing, beyond lost rows"],
        ["MAR — missing at random", "Other observed columns", "Basic-plan customers rarely have the tickets field; older records lack a column added later", "Imputation that uses the other columns (KNN, iterative), plus an indicator", "Row deletion biases the sample toward the groups that have the field"],
        ["MNAR — missing not at random", "The missing value itself", "High earners decline to state income; customers with many complaints hide them; 'not applicable' meaning zero", "An indicator column, domain rules, models that treat NaN as a category; sensitivity analysis", "Every imputer: they fill in a 'typical' value for rows that are systematically atypical"]
      ]
    },

    { t: "code", lang: "python", title: "The churn table's missing tickets: pattern, and a test (executed)",
      hl: [2, 3, 6, 7, 10],
      code: `d.support_tickets.isna().mean()                                       # 0.127: 126 of 990 rows
d.groupby("plan").support_tickets.apply(lambda s: s.isna().mean())     # basic 0.198   plus 0.046   pro 0.084     <- depends on plan
d.groupby(d.support_tickets.isna()).churned.mean()                    # present 0.154   missing 0.222         <- and correlates with the target

# the MCAR test: can the other columns predict which rows are missing?
cross_val_score(logistic, X_without_tickets, is_missing, scoring="roc_auc")        # 0.640
# 0.5 would mean the other columns know nothing about missingness (consistent with MCAR); 0.64 says they do: this is at least MAR.
# a t-test of tenure between missing and present rows: p = 0.82 -- tenure is not involved; plan is.
# whether it is also MNAR -- whether the hidden values themselves are unusual -- cannot be tested from the data. Only the process can say.`,
      caption: "Three numbers settle the mechanism as far as data can: missingness varies by plan (MAR), correlates with churn (so it carries signal and should not be thrown away), and a classifier can predict it (not MCAR). The MNAR question — are the *missing values* different from the observed ones — is unanswerable from the table, because the values are missing. It is answered by asking whoever built the collection process, which is the availability question of 1.6 in another form."
    },

    { t: "dl", items: [
      ["Listwise deletion", "Drop any row with a missing value. Unbiased only under MCAR; with many columns it discards most rows (the reference case: 60 columns at 15 % leaves almost nothing)."],
      ["Constant imputation", "Fill with a fixed value: 0, −1, 'missing'. Right when the constant is the truth ('no tickets recorded' = 0) or as a flag a tree can split on."],
      ["Mean / median / mode", "Fill with the column's centre. Preserves the mean, collapses the variance, breaks correlations. Cheap; a fine default when the gap is small and the mechanism is benign."],
      ["KNN imputation", "Fill from the average of the k rows nearest on the other columns. Uses relationships; slow on large data; needs scaled features."],
      ["Iterative (MICE) imputation", "Model each column with missing values from the others, round-robin, until stable. Uses relationships; the closest to 'multiple imputation' in scikit-learn."],
      ["Missing indicator", "A binary column 'was missing'. Carries the missingness signal under MAR and MNAR; costs one column per imputed feature."],
      ["Native NaN handling", "HistGradientBoosting, LightGBM, XGBoost and CatBoost learn which way to send NaN at each split — a learned indicator with no imputation."]
    ]},

    { t: "h2", n: "02", text: "Seven treatments, one table", id: "treatments" },

    { t: "code", lang: "python", title: "Churn AUC by treatment, logistic regression unless stated, 5-fold (executed)",
      hl: [3, 4, 5, 9, 10, 12],
      code: `#   treatment                                  AUC
#   drop the 126 rows                          0.767 ± 0.036     <- NOT comparable: the dropped rows churn at 0.222, so the problem got easier;
#                                                                    and the deployed model would still meet customers with no tickets field
#   mean                                       0.745 ± 0.032
#   median                                     0.747 ± 0.033
#   constant 0                                 0.740 ± 0.031
#   median + missing indicator                 0.746 ± 0.034
#   KNN (k = 5)                                0.743 ± 0.029
#   iterative (MICE-like)                      0.746 ± 0.033
#   iterative + indicator                      0.746 ± 0.034
#   hist-gbdt, NaN passed through              0.734 ± 0.027     <- the booster learns a direction for NaN at each split
#   hist-gbdt, median-imputed                  0.740 ± 0.032

# what each imputer wrote into the 126 gaps (observed tickets: mean 0.79, sd 0.88):
#   mean        0.79 for every row   sd 0.00   one distinct value
#   median      1.00 for every row   sd 0.00   one distinct value
#   KNN         mean 0.79            sd 0.39   nine distinct values     <- the only one that put spread back
#   iterative   mean 0.79            sd 0.00   three distinct values    <- a regression prediction: the conditional mean, no noise`,
      caption: "On a 990-row table with one column 13 % missing, every honest treatment lands within the fold spread of every other — the mechanism matters more than the numbers here, and the numbers show two things. Deleting rows produced the highest score by making the problem easier, which is the trap: it is not a treatment, it is a different dataset. And the mean, median and iterative imputers all wrote a single value or the conditional mean into every gap, which is why imputed columns have too little variance and imputed correlations are too strong — multiple imputation, which adds noise drawn from the residual distribution and averages over several fills, exists to fix that, and scikit-learn's `IterativeImputer(sample_posterior=True)` is its approximation."
    },

    { t: "h2", n: "03", text: "MNAR, planted, and what recovers it", id: "mnar" },

    { t: "code", lang: "python", title: "Customers with three or more tickets hide them 60 % of the time (executed)",
      hl: [2, 3, 7, 8, 9, 10],
      code: `# start from the rows with observed tickets; hide 27 of the 41 rows with tickets >= 3
# churn rate among the hidden rows 0.333, among the rest 0.148      <- the gaps are the angriest customers
#                                          AUC
#   the complete column (the truth)        0.767 ± 0.036
#   median imputation                      0.762 ± 0.033    <- the angriest customers are given the median ticket count of 1
#   median + indicator                     0.766 ± 0.039    <- the indicator says 'this customer is one of the hidden ones'
#   iterative imputation                   0.761 ± 0.034    <- the model predicts a typical value from the other columns: still wrong, by design
#   iterative + indicator                  0.766 ± 0.039`,
      caption: "Under MNAR the missing values are systematically different from the observed ones, so any imputer that predicts a typical value is confidently wrong for exactly the rows that matter. Nothing can recover the hidden numbers; what can be recovered is the fact that they were hidden, and the indicator carries it: 0.762 → 0.766, back within a thousandth of the truth. The gap is small on 27 rows; the mechanism is not. **Whenever missingness could depend on the value, add the indicator** — it costs one column and is the only feature that survives MNAR."
    },

    { t: "viz",
      title: "What the imputers write into the gap",
      caption: "The observed tickets column spreads from 0 to 4. Mean and median imputation stack every missing row on one value; iterative imputation writes the conditional mean (three values); KNN spreads the fills across nine. Under MNAR the true hidden values sit at the right, where no imputer puts anything.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Five rows of dot plots over a tickets axis from 0 to 4: observed values spread across the range; mean imputation a single stack at 0.79; median a single stack at 1; iterative three stacks near 0.8; KNN nine small stacks between 0 and 2; and a highlighted region at 3 to 4 labelled where the MNAR truth is.">
  <line x1="200" y1="230" x2="840" y2="230" style="stroke:var(--line)" stroke-width="1.2"/>
  <g class="s-sub" text-anchor="middle"><text x="200" y="248">0</text><text x="360" y="248">1</text><text x="520" y="248">2</text><text x="680" y="248">3</text><text x="840" y="248">4</text></g>
  <g class="s-label" text-anchor="end" style="font-weight:600">
    <text x="185" y="44">observed</text><text x="185" y="84">mean</text><text x="185" y="124">median</text><text x="185" y="164">iterative</text><text x="185" y="204">KNN</text>
  </g>
  <!-- x = 200 + 160*value -->
  <g style="fill:var(--ink-3)">
    <rect x="196" y="30" width="8" height="18" rx="2"/><rect x="356" y="34" width="8" height="14" rx="2"/><rect x="516" y="40" width="8" height="8" rx="2"/><rect x="676" y="43" width="8" height="5" rx="2"/><rect x="836" y="45" width="4" height="3" rx="1"/>
  </g>
  <rect x="323" y="66" width="8" height="22" rx="2" style="fill:var(--crit)"/>
  <rect x="356" y="106" width="8" height="22" rx="2" style="fill:var(--crit)"/>
  <g style="fill:var(--warn)"><rect x="310" y="150" width="7" height="18" rx="2"/><rect x="330" y="146" width="7" height="22" rx="2"/><rect x="352" y="156" width="7" height="12" rx="2"/></g>
  <g style="fill:var(--good)"><rect x="200" y="196" width="5" height="12" rx="1"/><rect x="232" y="192" width="5" height="16" rx="1"/><rect x="264" y="188" width="5" height="20" rx="1"/><rect x="296" y="190" width="5" height="18" rx="1"/><rect x="328" y="194" width="5" height="14" rx="1"/><rect x="360" y="192" width="5" height="16" rx="1"/><rect x="392" y="198" width="5" height="10" rx="1"/><rect x="424" y="200" width="5" height="8" rx="1"/><rect x="456" y="202" width="5" height="6" rx="1"/></g>
  <rect x="680" y="20" width="160" height="210" rx="6" style="fill:var(--crit);fill-opacity:.07;stroke:var(--crit)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="760" y="132" class="s-sub" text-anchor="middle" style="fill:var(--crit)">where the MNAR truth is</text>
  <text x="760" y="150" class="s-sub" text-anchor="middle" style="fill:var(--crit)">no imputer writes here</text>
</svg>`
    },

    { t: "h2", n: "04", text: "Categoricals, native handling, and the fold", id: "rest" },

    { t: "code", lang: "python", title: "A missing categorical, and the models that do not need an imputer (executed)",
      hl: [2, 3, 7, 8, 11, 12],
      code: `# 15 % of the channel column blanked at random
# mode imputation ('organic' for every gap)      AUC 0.749
# 'missing' as its own level, then one-hot       AUC 0.747        <- the same here (MCAR); under MAR/MNAR the level carries the signal and mode hides it

# native NaN: the booster decides, at every split, whether NaN goes left or right -- a learned, per-split indicator
HistGradientBoostingClassifier().fit(X_with_nans, y)                  # no imputer in the pipeline; 0.734 above
# LightGBM, XGBoost and CatBoost do the same; RandomForest and LogisticRegression do not accept NaN

# inside the fold, always: the imputer's statistics come from the training rows
Pipeline([("pre", ColumnTransformer([("num", make_pipeline(SimpleImputer(strategy="median", add_indicator=True), StandardScaler()), numeric),
                                     ("cat", make_pipeline(SimpleImputer(strategy="constant", fill_value="missing"), OneHotEncoder(handle_unknown="ignore")), categorical)])),
          ("m", LogisticRegression())])`,
      caption: "For categoricals, 'missing' as a level is the honest default: it keeps the information that the value was absent, and one-hot encoding makes it a column the model can weigh. Mode imputation asserts the gap was the common case, which is exactly the MAR/MNAR assumption you cannot check. For tree boosters, no imputation is needed and the learned NaN direction is often the best treatment — but a linear model, a distance method or a network downstream still needs the gap filled, and the imputer's median or neighbours must come from the training fold."
    },

    { t: "table",
      head: ["Situation", "Treatment", "Why"],
      rows: [
        ["Under ~5 % missing, MCAR, plenty of rows", "Median (numeric), 'missing' level (categorical); an indicator if cheap", "Any method works; keep it simple and inside the fold"],
        ["MAR — missingness explained by other columns", "KNN or iterative imputation plus an indicator", "The other columns predict the value; the indicator keeps the mechanism"],
        ["MNAR suspected", "Indicator first; domain constant where 'missing means zero'; sensitivity analysis over plausible fills", "No imputer can recover the values; the indicator recovers the fact"],
        ["Many columns each partly missing (the 60-column case)", "Never row-wise deletion; per-type imputation with indicators; a NaN-native booster", "Row deletion compounds across columns and empties the table"],
        ["A column over ~50–60 % missing", "Keep only the indicator, or drop the column", "The filled values would be mostly fiction"],
        ["Time series", "Forward-fill for state variables, interpolation for continuous signals — never backward-fill for features", "Backward-fill copies the future into the past (10.1)"],
        ["Tree booster as the model", "Pass NaN through; still add an indicator if a linear model will also be tried", "The booster learns the direction per split"]
      ]
    },

    { t: "callout", kind: "trap", title: "Row deletion gave the best score and would have been the worst decision", body: [
      { t: "p", text: "The 126 customers without a tickets field churn at 0.222 against 0.154. Dropping them raised the AUC because the remaining problem is easier, not because the model is better — and the deployed model will meet those customers on its first day, without a tickets value, and have to score them. **A treatment is judged on the population the model will serve, not on the rows that are convenient.** Report the mechanism, keep the rows, carry the indicator." }
    ]},

    { t: "ladder",
      title: "A 'days since last complaint' feature that is missing for 40 % of customers",
      rungs: [
        { level: "bad", label: "Median imputation", code: `SimpleImputer(strategy="median")        # gives every never-complained customer the median of complainers`,
          note: "**The gap means 'never complained'** — the most contented 40 % are assigned a typical complainer's recency. MNAR in its purest form, imputed into a lie." },
        { level: "ok", label: "A large constant plus an indicator", code: `SimpleImputer(strategy="constant", fill_value=9999, add_indicator=True)`,
          note: "**Honest about the mechanism.** A tree splits cleanly on 9999 or on the indicator; a linear model is stuck with a fake distance of 9999 in its arithmetic." },
        { level: "best", label: "Encode the meaning: an indicator and a bounded recency", code: `has_complained = ~days.isna()
days_capped = days.fillna(365).clip(upper=365)        # 'a year or more, or never' -- a bounded number a linear model can use
# two features that say what the gap says; the model chooses how much each matters`,
          note: "**Missing was a category, and now it is one.** The indicator carries 'never'; the capped recency carries 'how long ago' on a scale that has no fiction in it." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Diagnose and treat three missingness mechanisms",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Starting from the churn rows with an observed tickets value, plant three versions of missingness in `logins_30d`: **(i)** MCAR — 20 % of rows at random; **(ii)** MAR — 40 % of `basic`-plan rows; **(iii)** MNAR — 60 % of rows with logins below 5. For each version: run the MCAR test (AUC of predicting missingness from the other columns, tickets excluded), then compare median imputation, median + indicator, KNN and iterative imputation by churn AUC against the complete column. Report a 3 × 5 table and, for each mechanism, say which treatments are safe and why the MCAR test can or cannot distinguish (ii) from (iii)." }
      ],
      requirements: [
        "Three MCAR-test AUCs.",
        "The 3 × 5 AUC table with fold spreads.",
        "Per mechanism, the safe treatments and the reason.",
        "One sentence on why the MCAR test cannot separate MAR from MNAR in general, and what could."
      ],
      hint: "Under (iii), the missing rows are the low-login customers — the ones most likely to churn — so median imputation writes a typical login count for the least active people. The indicator should recover most of the gap. The MCAR test will fire for (ii) and probably for (iii) too (low logins correlate with plan and tenure), which is why it cannot tell them apart.",
      solution: {
        lang: "python",
        title: "mechanisms.py",
        code: `base = d[d.support_tickets.notna()].reset_index(drop=True); truth = base.logins_30d.copy(); rng = np.random.default_rng(0)
versions = {
  "MCAR": rng.random(len(base)) < 0.20,
  "MAR":  (base.plan == "basic") & (rng.random(len(base)) < 0.40),
  "MNAR": (truth < 5) & (rng.random(len(base)) < 0.60),
}
treatments = {"median": SimpleImputer(strategy="median"), "median+ind": SimpleImputer(strategy="median", add_indicator=True),
              "knn": KNNImputer(n_neighbors=5), "iterative": IterativeImputer(random_state=0)}
for name, hide in versions.items():
    Xv = base[num + cat].copy(); Xv.loc[hide, "logins_30d"] = np.nan
    # MCAR test: other columns -> is missing
    mcar = cross_val_score(Pipeline([("pre", pre_without_logins), ("m", LogisticRegression(max_iter=2000))]), Xv.drop(columns="logins_30d"), hide.astype(int), cv=cv, scoring="roc_auc").mean()
    row = {"mcar_test_auc": round(mcar, 3), "complete": score(base[num + cat], base.churned)}
    for tname, imp in treatments.items():
        row[tname] = score(Xv, base.churned, num_pipe=make_pipeline(imp, StandardScaler()))
    print(name, row)

# executed (complete column: 0.767 ± 0.036):
#          hidden   MCAR-test AUC    median          median+ind      KNN             iterative
#   MCAR     172       0.472         0.757±0.040     0.757±0.041     0.764±0.043     0.755±0.040   <- test at 0.5: MCAR not rejected; indicator adds nothing
#   MAR      156       0.810         0.755±0.033     0.760±0.035     0.765±0.036     0.751±0.034   <- plan predicts missingness; KNN recovers most from plan+fee
#   MNAR      30       0.670         0.746±0.030     0.769±0.042     0.750±0.035     0.744±0.030   <- only 30 rows hidden, yet median lost 0.02 and the
#                                                                                                     indicator brought it back to the complete column's score
#   the test fires for MNAR (0.67) as it does for MAR (0.81), because low logins correlate with plan and tenure: it cannot tell them apart.
#   under MNAR, median and iterative imputation write typical login counts for the least active customers -- the ones most likely to churn --
#   and lose the most; the indicator marks exactly those rows and recovers it.
# what could separate MAR from MNAR: not the table -- the values are missing. Knowledge of the collection process, a follow-up
# sample where the missing values are recovered, or a sensitivity analysis: refit under several assumed fills for the gaps and
# see whether the conclusion survives.`,
        notes: [
          { t: "p", text: "**The MCAR test is one-sided**: it rejects MCAR, and that is all. MAR and MNAR both make missingness predictable from observed columns, because the missing value is itself correlated with them." },
          { t: "p", text: "**The indicator is the treatment that is never wrong**: under MCAR it is a useless column the model will ignore; under MAR and MNAR it is the signal. The cost is one column; the habit is worth forming." },
          { t: "p", text: "**Sensitivity analysis is the honest MNAR answer**: if the conclusion holds whether the hidden logins were 0, 2 or 5, the missingness does not matter; if it flips, say so." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Under planted MNAR, median imputation scored 0.762 and median plus an indicator 0.766, against 0.767 for the complete column. What did the indicator recover?",
          options: [
            "The hidden ticket counts",
            "Not the values — those are gone — but the fact that they were hidden, which under MNAR is itself the strongest signal about those rows: the hidden customers were the ones with the most complaints, and the indicator marks them",
            "Nothing; the difference is noise",
            "The median"
          ],
          answer: 1,
          why: "No imputer can write a number it has no information about. The indicator turns the missingness mechanism into a feature, which is the only move available under MNAR."
        }
      ]
    }
  ],

  takeaways: [
    "**Ask why it is missing before deciding what to do**: MCAR (unrelated), MAR (explained by other columns), MNAR (depends on the hidden value).",
    "**Test MCAR by predicting missingness**: AUC 0.64 on the churn table rejects it; the test cannot separate MAR from MNAR.",
    "**Row deletion is a different dataset, not a treatment** — it scored highest by dropping the customers most likely to churn.",
    "**Mean, median and iterative imputation write one value or the conditional mean into every gap**: variance collapses, correlations inflate; KNN puts spread back; multiple imputation adds the noise properly.",
    "**Under MNAR every imputer is confidently wrong for the rows that matter; the indicator column recovers the mechanism** (0.762 → 0.766 against 0.767 truth).",
    "**Add the indicator whenever missingness could carry signal** — one column, never harmful.",
    "**Categoricals: 'missing' as a level beats the mode**, which asserts the gap was the common case.",
    "**Tree boosters handle NaN natively** by learning a direction per split; linear models, distances and networks need a fill.",
    "**Never backward-fill a time-series feature**; forward-fill state, interpolate signals.",
    "**Every imputer is fitted inside the fold** as a Pipeline step, on the training rows."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does mean imputation do to a column's variance and to its correlations with other columns?",
        options: [
          "Nothing; the mean is preserved",
          "It preserves the mean but shrinks the variance (every gap becomes the same central value) and weakens correlations (the filled rows sit on a horizontal line); with 13 % filled, the imputed column had sd 0.00 across its gaps against 0.88 observed",
          "It increases the variance",
          "It strengthens correlations"
        ],
        answer: 1,
        why: "This is why multiple imputation adds residual noise and averages over several fills — to restore the uncertainty that single imputation erases."
      },
      {
        stem: "Why can the MCAR test not distinguish MAR from MNAR?",
        options: [
          "It can, with enough data",
          "Both mechanisms make missingness predictable from observed columns — under MNAR the hidden value is correlated with the observed ones, so its missingness is too; the test rejects MCAR and stops. Only knowledge of the process, a recovery sample or a sensitivity analysis goes further",
          "The test only works for numeric columns",
          "MNAR is undetectable in principle, so the test is useless"
        ],
        answer: 1,
        why: "The test is one-sided. It is still worth running: a rejected MCAR is the signal to keep the indicator and treat deletion as forbidden."
      },
      {
        stem: "A tree booster is the model. Should you impute?",
        options: [
          "Yes, always with the median",
          "Not necessarily: HistGradientBoosting, LightGBM, XGBoost and CatBoost learn a NaN direction at each split, which is a per-split indicator; imputation is needed only for a downstream linear model, a distance method or a network, or when the same pipeline must serve several model types",
          "No; imputation harms trees",
          "Only for categorical columns"
        ],
        answer: 1,
        why: "On the churn table the booster with NaN passed through and with median imputation were within a thousandth of each other; the choice is about the rest of the pipeline."
      },
      {
        stem: "Sixty columns are each 15 % missing. Why is listwise deletion catastrophic?",
        options: [
          "It is slow",
          "The probability a row is complete is roughly 0.85⁶⁰ ≈ 0.00006 if the gaps are independent — nearly every row has at least one gap, so deletion removes almost the whole table; per-column imputation with indicators, or a NaN-native model, keeps it",
          "It biases toward the majority class",
          "It is not catastrophic; 15 % is small"
        ],
        answer: 1,
        why: "Missingness compounds across columns. This is the reference case of 1.2, and the arithmetic is why 'drop rows with NaN' is never the answer at scale."
      },
      {
        stem: "Which fill is wrong for a time-series feature and why?",
        options: [
          "Forward-fill",
          "Backward-fill: it copies a later value into an earlier row, so the feature at time t contains information from after t — temporal leakage; forward-fill carries the last known state, and interpolation between known points is acceptable only if it does not use future points at training-feature time",
          "Interpolation",
          "Constant fill"
        ],
        answer: 1,
        why: "Any fill that uses rows after the as-of time is the centred-window leak of 1.6. Forward-fill is the only direction time allows."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you handle missing values?",
        strong: "First by asking why they are missing, because the mechanism decides the treatment. Missing completely at random — unrelated to anything — is harmless beyond lost rows, and I test it by trying to predict missingness from the other columns; an AUC above 0.5 rejects it. Missing at random — explained by other columns, like a field only some plans have — is handled by imputation that uses those columns, KNN or iterative, plus an indicator column. Missing not at random — the hidden value itself drives the gap, like customers hiding complaints — defeats every imputer, and the indicator is the only feature that survives; I add it whenever the mechanism is in doubt. Categoricals get 'missing' as a level rather than the mode. Tree boosters need no imputation at all. Row deletion is not a treatment: it changes the population, and on the churn table it raised the score by dropping the customers most likely to churn. And every imputer is a Pipeline step fitted on the training fold.",
        answer: [
          { t: "p", text: "Mechanism first, the test, treatment per mechanism, the indicator as the universal move, and the deletion trap." }
        ]
      },
      {
        level: "core",
        q: "SimpleImputer, KNNImputer or IterativeImputer?",
        strong: "SimpleImputer writes one value per column — median for numerics, most-frequent or a 'missing' constant for categoricals — cheap, robust, and it collapses the column's variance in the gaps, which matters little for a small gap. KNNImputer fills each gap from the k rows nearest on the other columns, so it uses relationships and puts spread back into the fills; it needs scaled features and is slow on large data. IterativeImputer models each column from the others round-robin, the closest to multiple imputation; it writes the conditional mean unless sample_posterior is on, and it is the right choice under MAR with strong relationships. On the churn table all three were within a fold spread of each other, so I choose by mechanism and cost: median plus an indicator by default, iterative when the other columns are informative, KNN when the data is small and scaled.",
        answer: [
          { t: "p", text: "What each writes, what each needs, and the honest observation that the choice mattered less than the indicator." }
        ]
      },
      {
        level: "advanced",
        q: "A critical feature is 30 % missing. What do you do?",
        strong: "Establish the mechanism before anything else: predict missingness from the other columns, and ask the data producer whether the gaps could depend on the value. Then decide whether the column is worth keeping: at 30 % it is, if the observed part carries signal. I would add a missing indicator unconditionally, because under MAR or MNAR it is a feature in its own right and under MCAR it is harmless. For the fill, if the mechanism is MAR I would use iterative imputation from the related columns and check the imputed distribution against the observed one; if MNAR is plausible I would run a sensitivity analysis — refit with the gaps filled at several assumed values and see whether the conclusion survives — and consider a tree booster that learns the NaN direction itself. I would not delete rows, because 30 % of the population would then be a population the model had never seen, and it will meet them in production. And I would report the mechanism and the treatment alongside the score, because a reviewer who sees '30 % imputed' will ask.",
        answer: [
          { t: "p", text: "Mechanism, indicator, fill by mechanism, sensitivity analysis for MNAR, no deletion, and disclosure." }
        ]
      }
    ]
  }
});
