/* ============================================================================
   LESSON 2.7 — Comparing Models Honestly
   ========================================================================= */
EC.receiveLesson({
  id: "2.7",

  lede: "**Two models score 0.789 and 0.772 on the same test set. Is the first one better?** On 297 rows the honest answer is 'probably, and not by much, and the interval on each number is ±0.07'. Every comparison in this course so far has quietly assumed the reader would ask that question; this lesson answers it with the tools: bootstrap intervals on a single test set, paired comparisons across repeated folds with the correction that makes their p-values honest, McNemar's test for two classifiers on one set, slice-level evaluation with its own intervals, and the sample-size arithmetic that says how many rows a ±0.02 claim needs. It ends with what changes when the metric is measured online.",

  objectives: [
    "Put a confidence interval on a single test-set metric by bootstrap and read the interval, not the point",
    "Compare two models on the same folds with a paired test, apply the Nadeau–Bengio correction for correlated folds, and use McNemar's test on one test set",
    "Evaluate by slice with per-slice intervals, and refuse to report a slice with one positive",
    "Compute how many rows a given precision on AUC needs, and separate offline evaluation from online measurement"
  ],

  prerequisites: ["2.2", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "The interval on a single number", id: "interval" },

    { t: "code", lang: "text", title: "Five fold scores, and what can be said about them (executed)",
      code: `fold AUCs   0.85  0.82  0.90  0.79  0.88
mean 0.848    sd 0.044    standard error of the mean 0.044 / sqrt(5) = 0.020    naive 95 % interval  0.848 ± 0.055

what this supports:  'the procedure scores about 0.85, plausibly anywhere from 0.79 to 0.90'
what it does not:    'the model is better than one scoring 0.83' -- the folds' training sets overlap, so the five numbers are
                     correlated and the true standard error is larger than 0.020 (1.5); and 0.83 sits inside the interval anyway`,
      caption: "The spread is the finding. A reader who sees only 0.848 will treat a competing 0.86 as an improvement; a reader who sees the five numbers will ask for the paired comparison below."
    },

    { t: "code", lang: "python", title: "Bootstrap intervals on the 297-row test set — two models, and their paired difference (executed)",
      hl: [2, 3, 4, 8, 9, 10],
      code: `p_lr, p_gb = logistic.predict_proba(X_test)[:, 1], gbdt.predict_proba(X_test)[:, 1]      # 297 rows, 48 positives
for _ in range(2000):
    idx = rng.integers(0, n, n)                                                             # resample rows with replacement
    auc_lr.append(roc_auc_score(y[idx], p_lr[idx])); auc_gb.append(roc_auc_score(y[idx], p_gb[idx]))
    diff.append(auc_lr[-1] - auc_gb[-1])                                                  # the SAME resample for both: a paired difference

#   logistic     AUC 0.789   95 % CI [0.717, 0.856]
#   gbdt         AUC 0.772   95 % CI [0.698, 0.840]
#   difference        0.017   95 % CI [-0.012, 0.049]     P(logistic worse) = 0.136
# the two intervals overlap almost entirely; the paired interval on the difference is the right object, and it includes zero.
# 'logistic is ahead' is the best guess; 'logistic is better' is not supported by 297 rows.`,
      caption: "Resampling rows with replacement and recomputing the metric gives its sampling distribution without any formula, for any metric. Two rules: resample the *same* rows for both models so the difference is paired (their errors are correlated, and the paired interval is much tighter than the two separate ones suggest); and check that the interval on the difference, not the overlap of the two intervals, is what you read — two overlapping intervals can still hide a significant paired difference."
    },

    { t: "dl", items: [
      ["Bootstrap CI", "Resample rows with replacement, recompute the metric, take the 2.5th and 97.5th percentiles. Works for any metric; needs enough positives that resamples contain them."],
      ["Paired comparison", "Both models evaluated on the same folds or the same rows; the statistic is the per-fold (or per-resample) difference. Removes the variance that comes from the folds themselves."],
      ["Nadeau–Bengio correction", "For k-fold or repeated-CV differences: replace the variance 1/k · σ² with (1/k + n_test/n_train) · σ² to account for the overlapping training sets. Turns many 'significant' results into 'not established'."],
      ["McNemar's test", "For two classifiers on one test set at fixed thresholds: counts the rows only A got right and only B got right; tests whether those two counts differ. Ignores rows where both agree."],
      ["Slice evaluation", "The metric computed within subgroups — plan, region, tenure band, device — each with its own n, positives and interval. Where the average hides a failure."],
      ["Hanley–McNeil standard error", "A closed-form SE for AUC from the AUC value and the numbers of positives and negatives. For sample-size planning."],
      ["Offline vs online metric", "Offline: computed on logged data with known labels. Online: measured on live traffic in an experiment. Offline chooses candidates; online decides."]
    ]},

    { t: "h2", n: "02", text: "Paired comparison across folds, corrected", id: "paired" },

    { t: "code", lang: "python", title: "Three models, 10 × 5 repeated stratified folds, the same folds for all (executed)",
      hl: [2, 3, 7, 8, 12, 13, 14],
      code: `cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=1)                # 50 folds, identical for every model
s_lr, s_gb, s_rf = (cross_val_score(m, X, y, cv=cv, scoring="roc_auc") for m in (logistic, gbdt, forest))
#   logistic   mean 0.756   sd 0.044
#   gbdt       mean 0.736   sd 0.038
#   forest     mean 0.727   sd 0.044

d = s_lr - s_gb                    # per-fold differences: mean 0.020, sd 0.023, logistic ahead on 84 % of folds
stats.ttest_rel(s_lr, s_gb)        # paired t = 6.22, p < 0.0001        <- looks decisive
stats.wilcoxon(s_lr, s_gb)         # p < 0.0001                         <- the non-parametric version agrees

# but the 50 folds share training rows, so the differences are correlated and the t-test's variance is too small.
# Nadeau-Bengio: multiply the variance by (1/k + n_test/n_train) instead of 1/k
se = np.sqrt(d.var(ddof=1) * (1/50 + 0.2/0.8)); t_corr = d.mean() / se       # t = 1.69, p = 0.097
# logistic - forest: mean diff 0.029, naive p < 0.0001, corrected p = 0.014      <- this one survives`,
      caption: "The naive paired t-test says logistic beats gradient boosting at p < 0.0001; the corrected test says p = 0.097, not established. The difference is not a technicality: the fifty fold scores are not fifty independent observations, because every training set shares 60 % of its rows with every other. The corrected test is the one to report, and it says the logistic–forest gap of 0.029 is real and the logistic–gbdt gap of 0.020 is a lean. That matches the bootstrap on the test set, which is the reassurance you want."
    },

    { t: "code", lang: "python", title: "McNemar's test on one test set, at the operating point (executed)",
      hl: [2, 3, 5],
      code: `# threshold 0.2 on both models; classify each of the 297 rows as right or wrong for each model
#                        gbdt right   gbdt wrong
#   logistic right          201          11
#   logistic wrong           12          73
mcnemar([[201, 11], [12, 73]], exact=True)      # p = 1.0
# only the off-diagonal cells count: 11 rows only logistic got right, 12 only gbdt. That is a coin toss.`,
      caption: "McNemar answers a narrower question than AUC — at this threshold, do the two models make different mistakes? — and it is the right test when the deployed artefact is the thresholded decision. Here the two disagree on 23 rows, split 11 to 12: no difference at all at the operating point, whatever the AUCs say. The 201 rows both get right are irrelevant to the comparison, which is why a test on accuracy alone would be wrong."
    },

    { t: "viz",
      title: "Two intervals overlap; the paired difference decides",
      caption: "The separate intervals on each model's AUC overlap heavily. The interval on the paired difference — computed on the same resampled rows — is narrower because the models' errors are correlated, and it is the one that answers 'is A better than B'. Here it straddles zero.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Three horizontal interval bars: logistic AUC from 0.717 to 0.856, gradient boosting from 0.698 to 0.840, both overlapping heavily; below, a narrower interval for the paired difference from minus 0.012 to 0.049 crossing a zero line.">
  <line x1="80" y1="120" x2="840" y2="120" style="stroke:var(--line)" stroke-width="1.2"/>
  <g class="s-sub" text-anchor="middle">
    <text x="140" y="140">0.65</text><text x="373" y="140">0.75</text><text x="607" y="140">0.85</text><text x="840" y="140">0.95</text>
    <text x="460" y="158">AUC</text>
  </g>
  <!-- x = 140 + (auc-0.65)*2333 -->
  <g stroke-width="3">
    <line x1="296" y1="50" x2="621" y2="50" style="stroke:var(--accent)"/>
    <line x1="252" y1="85" x2="583" y2="85" style="stroke:var(--warn)"/>
  </g>
  <circle cx="464" cy="50" r="5" style="fill:var(--accent)"/><circle cx="425" cy="85" r="5" style="fill:var(--warn)"/>
  <g class="s-label" style="font-weight:600">
    <text x="640" y="54" style="fill:var(--accent)">logistic 0.789 [0.717, 0.856]</text>
    <text x="640" y="89" style="fill:var(--warn)">gbdt 0.772 [0.698, 0.840]</text>
  </g>
  <line x1="80" y1="205" x2="840" y2="205" style="stroke:var(--line)" stroke-width="1.2"/>
  <g class="s-sub" text-anchor="middle">
    <text x="373" y="225">0</text><text x="140" y="225">−0.05</text><text x="607" y="225">+0.05</text><text x="840" y="225">+0.10</text>
  </g>
  <!-- x = 373 + diff*4667 -->
  <line x1="373" y1="175" x2="373" y2="210" style="stroke:var(--crit)" stroke-width="1.2" stroke-dasharray="3 3"/>
  <line x1="317" y1="190" x2="602" y2="190" style="stroke:var(--good)" stroke-width="3"/>
  <circle cx="452" cy="190" r="5" style="fill:var(--good)"/>
  <text x="640" y="194" class="s-label" style="font-weight:600;fill:var(--good)">difference +0.017 [−0.012, +0.049]</text>
</svg>`
    },

    { t: "h2", n: "03", text: "Slices, and the rows that are not there", id: "slices" },

    { t: "code", lang: "python", title: "The logistic model's AUC by plan and by region, with bootstrap intervals (executed)",
      hl: [4, 8, 9],
      code: `#   slice           n    positives   AUC     95 % CI
#   plan = basic   152      34       0.737   [0.629, 0.837]
#   plan = plus    101      13       0.805   [0.643, 0.918]
#   plan = pro      44       1       0.744   -- one positive: the AUC is one row's rank; do not report it
#   region = east   56      11       0.838   [0.672, 0.963]
#   region = north  90      17       0.770   [0.652, 0.878]
#   region = south  93      13       0.796   [0.634, 0.921]
#   region = west   58       7       0.756   [0.506, 0.958]     <- seven positives: an interval from coin-toss to near-perfect

# the overall 0.789 hides nothing here, because nothing can be seen: no slice is different from another beyond its interval.
# a slice with n = 5,000 and AUC 0.62 would be a finding; a slice with 7 positives and AUC 0.62 is noise.`,
      caption: "Slice evaluation is where models fail quietly — a segment the training data under-represented, a device type the features do not cover — and it is also where analysts fool themselves, because small slices produce extreme numbers. Report every slice with its n, its positives and its interval, and set a minimum positives count (twenty is a reasonable floor) below which the cell shows 'insufficient' rather than a number."
    },

    { t: "code", lang: "text", title: "How many rows does a claim need? Hanley–McNeil for AUC 0.79 at 16 % prevalence (executed)",
      code: `SE(AUC) = sqrt( ( A(1-A) + (n_pos - 1)(Q1 - A²) + (n_neg - 1)(Q2 - A²) ) / (n_pos · n_neg) )      Q1 = A/(2-A),  Q2 = 2A²/(1+A)

   rows      positives    SE       95 % half-width
    297         48       0.041        ± 0.080          <- the course's test set: 0.79 means 'somewhere in 0.71-0.87'
  1,000        162       0.022        ± 0.043
  3,000        486       0.013        ± 0.025
 10,000      1,620       0.007        ± 0.014          <- a ± 0.02 claim needs about five thousand rows at this prevalence

the width scales with 1 / sqrt(positives), so at 1 % prevalence a ± 0.02 interval needs eighty thousand rows.`,
      caption: "This is the arithmetic behind 'the test set is too small', and it should be done before the split, not after the result: decide what difference you need to detect, compute the rows that gives, and if the data cannot provide them, say the comparison will be inconclusive rather than pretending otherwise. The bootstrap gave ±0.07 on 297 rows; the formula gives ±0.08. They agree."
    },

    { t: "h2", n: "04", text: "Offline against online", id: "online" },

    { t: "table",
      head: ["", "Offline evaluation", "Online measurement"],
      rows: [
        ["Data", "Logged rows with known labels", "Live traffic, labels arrive later or never"],
        ["Question", "Which candidate is most promising", "Does the deployed model move the business metric"],
        ["Metric", "AUC, PR-AUC, log loss, NDCG — proxies", "Conversion, revenue, retention, complaints — the thing itself"],
        ["Comparison", "Paired on the same rows or folds", "Randomised: an A/B test with a control (11.1)"],
        ["Failure mode", "Optimises the proxy, not the goal; evaluated on what past policies chose to show", "Slow, expensive, needs traffic, can harm users during the test"],
        ["Statistics", "Bootstrap, corrected paired tests, McNemar", "Power analysis, sequential tests, guardrail metrics"],
        ["Verdict", "Necessary; never sufficient", "Sufficient; the final word"]
      ]
    },

    { t: "callout", kind: "production", title: "The report that survives a sceptical reviewer", body: [
      { t: "p", text: "**The metric with its interval**, not a point. **The baseline** in the same table. **The comparison as a paired difference** with a corrected test, on repeated folds, and the McNemar result at the operating point if a threshold is deployed. **Slices** with n, positives and intervals, and 'insufficient' where they are. **The number of rows the claim needed** and whether the data provided them. **The offline metric labelled as a proxy**, and the online metric that will decide. A reviewer who gets all six has nothing to ask; one who gets a single AUC has everything to ask." }
    ]},

    { t: "ladder",
      title: "'Model B has AUC 0.81, model A has 0.79 — ship B'",
      rungs: [
        { level: "bad", label: "Compare the two point estimates", code: `0.81 > 0.79`,
          note: "**Two draws from two distributions.** On 297 rows each has a ±0.07 interval; the difference is inside the noise of one fold." },
        { level: "ok", label: "Bootstrap both on the test set", code: `A: [0.72, 0.86]   B: [0.74, 0.88]     # overlapping intervals -> 'cannot tell'`,
          note: "**Better, and still wrong in one direction**: overlapping separate intervals can hide a real paired difference because the models' errors are correlated." },
        { level: "best", label: "Paired difference on the same resamples and the same folds, corrected", code: `bootstrap: B - A = +0.02 [-0.01, +0.05]        repeated CV, Nadeau-Bengio: p = 0.10
# verdict: B leans ahead; not established on this data. Ship on other grounds (simplicity, latency, calibration) or get more rows.`,
          note: "**The paired interval and the corrected test agree**, and the decision says what it is based on. If 0.02 of AUC is worth real money, the answer is a larger test set or an online experiment — not a bigger claim." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A comparison report for three churn models",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Write a function `compare(models, X, y, cv, scoring)` that returns, for every pair of models: the mean difference in the metric over repeated stratified folds, its naive paired p-value, the Nadeau–Bengio corrected p-value, and the fraction of folds on which the first model wins. Run it on logistic regression, the depth-2 gradient booster and a leafy random forest with 10 × 5 folds and AUC. Then, on the 297-row test set, add the bootstrap CI of each model's AUC and of each pairwise difference, and McNemar's p-value at threshold 0.2. Assemble the results into the six-part report from the callout and write the two-sentence verdict." }
      ],
      requirements: [
        "Pairwise table with all four statistics for the three pairs.",
        "Bootstrap CIs and McNemar's test on the test set.",
        "A report with the six parts, and a verdict that says what is and is not established."
      ],
      hint: "Use `RepeatedStratifiedKFold` with a fixed `random_state` and pass the same `cv` object to every `cross_val_score` so the folds are identical. The correction factor is `(1/k + n_test/n_train)` with k = 50 folds and the 80/20 split.",
      solution: {
        lang: "python",
        title: "compare.py",
        code: `from itertools import combinations
def compare(models, X, y, cv, scoring="roc_auc", test_frac=0.2):
    scores = {name: cross_val_score(m, X, y, cv=cv, scoring=scoring) for name, m in models.items()}
    k = len(next(iter(scores.values()))); corr = 1 / k + test_frac / (1 - test_frac)
    rows = []
    for a, b in combinations(scores, 2):
        d = scores[a] - scores[b]
        t_naive, p_naive = stats.ttest_rel(scores[a], scores[b])
        t_corr = d.mean() / np.sqrt(d.var(ddof=1) * corr); p_corr = 2 * (1 - stats.t.cdf(abs(t_corr), k - 1))
        rows.append(dict(pair=f"{a} - {b}", mean_diff=d.mean(), p_naive=p_naive, p_corrected=p_corr, wins=np.mean(d > 0)))
    return {n: (s.mean(), s.std()) for n, s in scores.items()}, pd.DataFrame(rows)

means, table = compare({"logistic": logistic, "gbdt": gbdt, "forest": forest}, X, y,
                       RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=1))
# executed:
#   logistic 0.756 ± 0.044    gbdt 0.736 ± 0.038    forest 0.727 ± 0.044
#   pair                mean diff   p naive    p corrected   wins
#   logistic - gbdt      +0.020    < 0.0001     0.097        0.84
#   logistic - forest    +0.029    < 0.0001     0.014        0.86
#   gbdt - forest        +0.009      0.0019     0.375        0.64      <- 'significant' naively; nothing once corrected

# test set (297 rows): bootstrap AUCs logistic 0.789 [0.717, 0.856], gbdt 0.772 [0.698, 0.840];
# paired difference +0.017 [-0.012, +0.049]; McNemar at 0.2: 11 vs 12 discordant rows, p = 1.0.

# report: (1) metric with interval; (2) baseline -- majority AP 0.163, AUC 0.5; (3) paired differences with corrected p;
# (4) slices with n/positives/CI, 'insufficient' for pro; (5) rows needed: ±0.02 on AUC needs ~5,000 rows, we have 297;
# (6) AUC is a proxy; the retention A/B test on saves per call decides.
# verdict: logistic regression is ahead of both tree models on every view of the data, and its lead over the forest is established
# (corrected p 0.014); its lead over gradient boosting is not (p 0.10, paired CI crosses zero). At the operating point the two
# make interchangeable decisions (McNemar p = 1.0). Ship the logistic regression for its calibration and simplicity; revisit when
# the labelled base exceeds a few thousand rows.`,
        notes: [
          { t: "p", text: "**The same `cv` object for every model is what makes the comparison paired.** Different folds per model would add fold variance to every difference and make the test both noisier and invalid." },
          { t: "p", text: "**The corrected p-values change the story** from 'three significant differences' to 'one established, two leaning'. That is the honest story, and it is the one that would have been told anyway had the models been deployed and measured." },
          { t: "p", text: "**The verdict names the grounds for the decision** — calibration and simplicity — because the metric did not decide it. That is not a weakness of the report; it is what an honest report looks like on 297 rows." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A paired t-test over 50 repeated folds gives p < 0.0001 for a 0.02 AUC difference; the Nadeau–Bengio corrected test gives p = 0.097. Which do you report?",
          options: [
            "The naive one; it is the standard test",
            "The corrected one: the 50 fold scores come from training sets that overlap by 60 %, so they are not independent and the naive variance is far too small; the correction accounts for the overlap and says the difference is a lean, not a result",
            "Neither; use accuracy",
            "The average of the two"
          ],
          answer: 1,
          why: "The bootstrap on the independent test set agreed with the corrected test (paired CI crossing zero). When two honest methods agree and a third disagrees, the third has an assumption wrong."
        }
      ]
    }
  ],

  takeaways: [
    "**Every reported metric gets an interval**; on 297 rows an AUC of 0.79 is ±0.07–0.08.",
    "**Bootstrap the rows for any metric**; resample the same rows for both models so the difference is paired.",
    "**Read the interval on the difference, not the overlap of two intervals.**",
    "**Paired comparison on identical repeated folds**, then the Nadeau–Bengio correction — it turned p < 0.0001 into p = 0.097.",
    "**McNemar's test compares two classifiers at the operating point** using only the rows they disagree on; 11 vs 12 is a coin toss.",
    "**Slices need n, positives and intervals**; a slice with one positive is 'insufficient', not a number.",
    "**Hanley–McNeil says how many rows a claim needs**: ±0.02 on AUC at 16 % prevalence is about 5,000 rows; at 1 % it is 80,000.",
    "**Offline metrics are proxies that choose candidates; the online experiment decides.**",
    "**A report has six parts**: interval, baseline, paired difference, slices, rows needed, proxy labelled.",
    "**When the metric does not decide, say what did** — calibration, simplicity, latency — rather than inflating the claim."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why resample the same rows for both models when bootstrapping a difference?",
        options: [
          "To save computation",
          "Because the models' errors are correlated — both find the same rows hard — so the difference on a common resample has much lower variance than the difference of two independent resamples; the paired interval is the honest one and it is narrower",
          "It is not necessary",
          "To make the intervals overlap"
        ],
        answer: 1,
        why: "Pairing removes shared variance. It is the same reason a paired t-test beats an unpaired one on before/after data."
      },
      {
        stem: "What does McNemar's test ignore, and why is that correct?",
        options: [
          "The false positives",
          "The rows both models get right and the rows both get wrong — they carry no information about which model is better; only the discordant rows (right for one, wrong for the other) can distinguish them",
          "The threshold",
          "The positives"
        ],
        answer: 1,
        why: "201 shared correct rows tell you the problem is mostly easy; 11 against 12 tells you the two models are interchangeable at that threshold."
      },
      {
        stem: "A slice of 58 rows with 7 positives shows AUC 0.756. What do you report?",
        options: [
          "AUC 0.756 for that slice",
          "The number with its interval — [0.51, 0.96] — or 'insufficient', because seven positives cannot distinguish a coin toss from a near-perfect model; set a floor on positives per slice before reporting any slice metric",
          "That the slice is under-performing",
          "That the slice is fine"
        ],
        answer: 1,
        why: "Small slices generate extreme numbers in both directions. The interval, or a refusal to report, is the only honest option."
      },
      {
        stem: "How does the required test-set size scale with prevalence for a fixed AUC precision?",
        options: [
          "It does not depend on prevalence",
          "The interval width scales with 1/√(positives), so rows needed scale with 1/prevalence: about 5,000 rows for ±0.02 at 16 %, about 80,000 at 1 %",
          "Linearly with the number of negatives",
          "It shrinks as prevalence falls"
        ],
        answer: 1,
        why: "Positives are the scarce resource in an AUC estimate. This is why rare-event models need large test sets and why 'the test set is too small' should be computed before the split."
      },
      {
        stem: "Offline, model B beats A on NDCG by a clear, corrected-significant margin. Why still run an online test?",
        options: [
          "Because offline metrics are always wrong",
          "Because NDCG is a proxy for the business goal, computed on items past policies chose to show; the online test measures the goal itself on live traffic with a randomised control, and can reveal that the proxy improvement did not translate — or that it harmed a guardrail metric",
          "To satisfy the reviewers",
          "Because online tests are faster"
        ],
        answer: 1,
        why: "Offline evaluation is necessary and never sufficient. The gap between a proxy and a goal is the most common reason a 'better' model fails to move anything."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "You get 5-fold CV scores of 0.85, 0.82, 0.90, 0.79, 0.88. What can you conclude?",
        strong: "The procedure scores around 0.85 with a fold spread of about 0.04, so a naive interval is roughly 0.79 to 0.90 — and even that is optimistic, because the five folds share training rows and are correlated, so the true uncertainty is wider. I would conclude that the model works, that its performance is not pinned down better than a few points, and that any comparison with another model needs to be paired on the same folds and tested with the overlap correction. I would also want to know why fold four scored 0.79: a fold with fewer positives, or a subgroup the model handles badly — which is the slice question.",
        answer: [
          { t: "p", text: "Mean, spread, the correlation caveat, and the curiosity about the low fold — that is a reader of evidence." }
        ]
      },
      {
        level: "core",
        q: "How do you decide whether one model is significantly better than another?",
        strong: "Pair the comparison and correct for correlation. On repeated stratified folds — the same folds for both models — I compute the per-fold difference and its mean, then the paired t-test with the Nadeau–Bengio variance correction, because ordinary paired tests on cross-validation folds are badly optimistic; in a run I did, a 0.02 AUC gap went from p below 0.0001 to p of 0.10 under the correction. On a single test set I bootstrap the rows, resampling the same rows for both models, and read the interval on the difference; if a threshold is deployed, McNemar's test on the discordant rows answers whether the decisions differ. Then I say what is established and what is a lean, and if the gap matters and is not established, the answer is more data or an online experiment, not a stronger claim.",
        answer: [
          { t: "p", text: "Paired, corrected, bootstrapped, McNemar at the operating point, and the honest verdict." }
        ]
      },
      {
        level: "advanced",
        q: "What is the difference between offline and online evaluation, and how do they relate?",
        strong: "Offline evaluation computes proxy metrics — AUC, NDCG, log loss — on logged data with known labels; it is cheap, repeatable, and lets me compare many candidates with paired statistics. Its limits are that the metric is a proxy for the goal, and that the logged data reflects what previous policies chose to show, so a recommender is evaluated on items users were already exposed to. Online evaluation measures the goal itself — conversion, retention, revenue — on live traffic in a randomised experiment against a control, with power analysis to size it, sequential monitoring to stop it, and guardrail metrics so a gain in one number is not bought with harm in another. The relationship is a funnel: offline evaluation prunes the candidates to one or two worth the cost and risk of an experiment; the experiment decides. A model that wins offline and loses online is common enough that I would never ship on offline evidence alone when an experiment is possible.",
        answer: [
          { t: "p", text: "Proxy versus goal, the exposure bias of logged data, the experiment's apparatus, and the funnel relationship — complete." }
        ]
      }
    ]
  }
});
