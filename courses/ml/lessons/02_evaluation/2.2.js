/* ============================================================================
   LESSON 2.2 — ROC, Precision–Recall and Proper Scoring
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**A confusion matrix is one threshold; a model that outputs scores has a matrix for every threshold, and the curves in this lesson are those matrices drawn as a line.** The ROC curve plots the rate of caught positives against the rate of false alarms; its area is the probability that a random positive outscores a random negative — a fact this lesson proves by counting pairs. The precision–recall curve plots what a user of the flags experiences, and moves with the base rate in a way ROC does not; the run below shows PR-AUC falling from 0.515 to 0.281 while ROC-AUC stays at 0.789 as negatives are added. Then the two proper scores for probabilities themselves, log loss and Brier, and why one of them punishes a single confident mistake with 6.9 units.",

  objectives: [
    "Build a ROC curve point by point from ten scores, compute its area by trapezoids and by counting pairs, and get the same number",
    "Build the precision–recall curve from the same scores and explain why its no-skill level is the prevalence",
    "Say when PR-AUC is the better summary than ROC-AUC and show numerically how the base rate moves one and not the other",
    "Compute log loss and the Brier score, explain 'proper scoring rule', and read what each does to over-confidence and to a single confident miss"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "ROC, built by hand", id: "roc" },

    { t: "p", text: "Ten customers, scored by a model and sorted by score; five churned. Sweep the threshold down from the top: each time it passes a positive, TPR (recall) rises by 1/5; each time it passes a negative, FPR (1 − specificity) rises by 1/5. **The ROC curve is the path of (FPR, TPR) as the threshold sweeps; a perfect ranker goes straight up then right; a random one follows the diagonal.**" },

    { t: "code", lang: "text", title: "Ten scores, ten thresholds, one curve (executed)",
      code: `score   0.95  0.85  0.80  0.70  0.60  0.55  0.40  0.30  0.20  0.10
label     1     1     0     1     0     1     0     0     1     0          P = 5 positives, N = 5 negatives

threshold  TP  FP   TPR   FPR
  0.95      1   0   0.20  0.00
  0.85      2   0   0.40  0.00       <- two steps up: the top two are positives
  0.80      2   1   0.40  0.20       <- one step right: a negative
  0.70      3   1   0.60  0.20
  0.60      3   2   0.60  0.40
  0.55      4   2   0.80  0.40
  0.40      4   3   0.80  0.60
  0.30      4   4   0.80  0.80
  0.20      5   4   1.00  0.80
  0.10      5   5   1.00  1.00

area under the path by trapezoids:   0.72

the same number by counting: of the 5 x 5 = 25 (positive, negative) pairs, the positive has the higher score in 18
   18 / 25 = 0.72  =  AUC  =  P(score of a random positive > score of a random negative)      ties count one half`,
      caption: "The pair count is the definition worth carrying: **AUC is the probability that the model ranks a random positive above a random negative.** It depends only on the ordering of scores — squash them, stretch them, take their logs, and AUC does not move — and it does not depend on the threshold, the prevalence, or whether the scores are calibrated. That is its strength as a model-comparison number and its weakness as a report of what the deployed model will do."
    },

    { t: "dl", items: [
      ["ROC curve", "TPR against FPR over all thresholds. Prevalence-independent: each axis is a rate within one true class."],
      ["AUC (ROC)", "The area; equivalently the probability a random positive outscores a random negative; equivalently the Mann–Whitney U statistic scaled. 0.5 random, 1.0 perfect."],
      ["Precision–recall curve", "Precision against recall over all thresholds. Its no-skill level is the prevalence; it moves when the base rate does."],
      ["Average precision (PR-AUC)", "The area under the PR curve, computed as a step sum of precision at each recall increment. The summary for rare-positive problems."],
      ["Proper scoring rule", "A score for probabilistic predictions that is minimised, in expectation, by reporting the true probability. Log loss and Brier are proper; accuracy and AUC are not scores of probabilities at all."],
      ["Log loss (cross-entropy)", "−mean(y log p + (1 − y) log(1 − p)). Unbounded: one confident wrong prediction at p = 0.001 costs 6.91."],
      ["Brier score", "mean((p − y)²). Bounded on [0, 1]; the same confident miss costs 0.998. Decomposes into calibration and refinement."],
      ["Youden's J", "TPR − FPR, maximised to pick a threshold when the two errors cost the same — rarely the case (2.3)."]
    ]},

    { t: "code", lang: "text", title: "The precision–recall curve from the same ten scores (executed)",
      code: `threshold  precision  recall
  0.95       1.00       0.20
  0.85       1.00       0.40
  0.80       0.67       0.40       <- a negative enters the flagged set: precision drops, recall does not move
  0.70       0.75       0.60
  0.60       0.60       0.60
  0.55       0.67       0.80
  0.40       0.57       0.80
  0.30       0.50       0.80
  0.20       0.56       1.00
  0.10       0.50       1.00       <- flag everyone: precision = prevalence = 0.50

average precision 0.794             the no-skill line is the prevalence: 0.50 here, 0.162 on the churn table, 0.01 for fraud`,
      caption: "Precision is not monotone in the threshold — it jumps up when a positive enters and down when a negative does — so the PR curve is jagged and its area is computed as a step sum. What matters is the floor: **a random ranker's precision is the prevalence at every recall**, so PR-AUC's scale is set by the base rate, and 0.5 means something entirely different at 50 % prevalence and at 1 %."
    },

    { t: "h2", n: "02", text: "ROC-AUC against PR-AUC: what the base rate does", id: "baserate" },

    { t: "code", lang: "python", title: "The churn model on its held-out set, then with negatives removed or duplicated (executed)",
      hl: [2, 5, 6, 7, 8],
      code: `p = model.predict_proba(X_test)[:, 1]                                   # 297 rows, 48 churners
# held-out as is:        prevalence 0.162   ROC-AUC 0.789   PR-AUC 0.515     (no-skill PR-AUC = 0.162)

# same predictions, same positives, negatives subsampled or duplicated:
# keep 50 % of negatives  prevalence 0.279   ROC-AUC 0.817   PR-AUC 0.663
# keep 20 % of negatives  prevalence 0.495   ROC-AUC 0.750   PR-AUC 0.776
# negatives x 4           prevalence 0.046   ROC-AUC 0.789   PR-AUC 0.281     <- ROC-AUC exactly unchanged; PR-AUC nearly halved

# the ROC-AUC wobble at 50 % and 20 % is sampling noise from subsampling 249 negatives; with the negatives duplicated
# there is no sampling and the number is identical to three decimals. PR-AUC is not noise: it fell because precision fell.`,
      caption: "Both curves describe the same ranking. ROC-AUC says how well positives are separated from negatives, whatever the mix; PR-AUC says what a person acting on the top-scored rows will see, which gets worse as positives get rarer even when the ranking does not change. **For rare positives with an action attached to each flag — fraud, disease, retention calls — PR-AUC and the PR curve are the honest summary; for comparing rankers across datasets, ROC-AUC.** A model can have ROC-AUC 0.95 and a PR curve that never reaches precision 0.1."
    },

    { t: "table",
      head: ["", "ROC curve / AUC", "PR curve / average precision"],
      rows: [
        ["Axes", "TPR vs FPR (both within-class rates)", "Precision vs recall (precision mixes classes)"],
        ["No-skill level", "The diagonal; AUC 0.5", "Precision = prevalence; AP = prevalence"],
        ["Effect of prevalence", "None (up to sampling noise)", "Strong: rarer positives, lower precision everywhere"],
        ["What it summarises", "Ranking quality; P(positive outscores negative)", "The experience of acting on the flags"],
        ["Blind to", "How rare the positives are; what the top of the list looks like", "The true-negative cell entirely"],
        ["Use", "Comparing models; balanced problems; when negatives matter", "Rare positives; when each flag is an action with a cost"],
        ["Interpolation", "Linear (trapezoids) is correct", "Linear is optimistic; use the step (average precision)"]
      ]
    },

    { t: "viz",
      title: "Two curves, one ranking, two base rates",
      caption: "Left: the ROC curve of the churn model does not move when negatives are quadrupled. Right: the PR curve of the same ranking drops toward the new prevalence floor. The ranking is identical; only what precision means has changed.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two panels. Left: ROC space with one curve above the diagonal, labelled unchanged at both prevalences. Right: precision-recall space with two curves, the upper at prevalence 0.16 and the lower at 0.046, each with a dashed floor at its prevalence.">
  <defs>
    <marker id="ac-ah-22" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <g style="stroke:var(--line)" stroke-width="1.2">
    <line x1="60" y1="250" x2="400" y2="250" marker-end="url(#ac-ah-22)"/><line x1="60" y1="250" x2="60" y2="40" marker-end="url(#ac-ah-22)"/>
    <line x1="500" y1="250" x2="840" y2="250" marker-end="url(#ac-ah-22)"/><line x1="500" y1="250" x2="500" y2="40" marker-end="url(#ac-ah-22)"/>
  </g>
  <line x1="60" y1="250" x2="380" y2="50" style="stroke:var(--ink-3)" stroke-width="1" stroke-dasharray="4 4"/>
  <path d="M60,250 C110,120 200,80 380,50" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>
  <g class="s-sub" text-anchor="middle">
    <text x="230" y="272">FPR = 1 − specificity</text>
    <text x="35" y="150" transform="rotate(-90 35 150)">TPR = recall</text>
    <text x="230" y="28" class="s-label" style="font-weight:600">ROC: AUC 0.789 at both prevalences</text>
    <text x="300" y="200">random: AUC 0.5</text>
  </g>
  <line x1="500" y1="218" x2="820" y2="218" style="stroke:var(--accent)" stroke-width="1" stroke-dasharray="4 4"/>
  <line x1="500" y1="241" x2="820" y2="241" style="stroke:var(--warn)" stroke-width="1" stroke-dasharray="4 4"/>
  <path d="M510,60 L560,80 L600,130 L660,160 L740,190 L820,212" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>
  <path d="M510,110 L560,170 L600,205 L660,222 L740,232 L820,238" fill="none" style="stroke:var(--warn)" stroke-width="2.4"/>
  <g class="s-sub" text-anchor="middle">
    <text x="670" y="272">recall</text>
    <text x="475" y="150" transform="rotate(-90 475 150)">precision</text>
    <text x="670" y="28" class="s-label" style="font-weight:600">PR: same ranking, two floors</text>
  </g>
  <g class="s-sub">
    <text x="700" y="100" style="fill:var(--accent)">prevalence 0.162 · AP 0.515</text>
    <text x="700" y="150" style="fill:var(--warn)">prevalence 0.046 · AP 0.281</text>
    <text x="505" y="214" style="fill:var(--accent)">floor 0.162</text>
    <text x="505" y="255" style="fill:var(--warn)">floor 0.046</text>
  </g>
</svg>`
    },

    { t: "h2", n: "03", text: "Scoring the probabilities themselves", id: "proper" },

    { t: "p", text: "AUC and the PR curve judge the *ordering* of scores. Neither notices whether a score of 0.8 means anything. **A proper scoring rule judges the probabilities**: it is minimised, in expectation, by reporting the true probability, so a model cannot improve its score by hedging or by bluffing. Two are standard." },

    { t: "code", lang: "python", title: "Log loss and Brier on the churn model, against a base-rate predictor and two distortions of the same ranking (executed)",
      hl: [2, 3, 7, 8, 9, 13, 14],
      code: `# held-out 297 rows; the base-rate predictor says 0.163 to everyone
#                                          log-loss     Brier      ROC-AUC     mean predicted p
# base-rate predictor                        0.442       0.135       0.500         0.163
# the model                                  0.359       0.109       0.789         0.177        <- observed rate 0.162: nearly calibrated on average

# the same ranking, made less or more confident by scaling the logit (order preserved, so AUC cannot change):
# logit x 0.5  (hedged toward 0.5)           0.429       0.131       0.789         0.290
# logit x 3    (over-confident)               0.542       0.118       0.789         0.068
# the proper scores punish both distortions; AUC sees nothing. Over-confidence costs log loss far more than hedging does.

# one churner given probability 0.001 instead of its model score:
# log loss 0.359 -> 0.371   (that single row contributed -ln(0.001) = 6.91 to the sum, a fiftieth of the total on its own)
# Brier    0.109 -> 0.109   (that row contributed (1 - 0.001)² = 0.998; bounded, so one row cannot dominate)`,
      caption: "Log loss is the negative log-likelihood — the quantity logistic regression minimises (4.5) — and it is unbounded: a confident mistake is catastrophic, which makes it the right loss for training and a nervous metric for reporting when a few extreme rows exist. Brier is mean squared error on probabilities: bounded, decomposable into calibration and refinement terms (2.5), and gentler. Both say the model's probabilities beat the base rate; AUC could not have said anything about that."
    },

    { t: "table",
      head: ["Metric", "Judges", "Threshold-free", "Prevalence-sensitive", "Sees calibration", "Bounded"],
      rows: [
        ["Accuracy, F1, MCC", "One threshold's matrix", "No", "Yes (except MCC-style corrections)", "No", "Yes"],
        ["ROC-AUC", "Ranking", "Yes", "No", "No", "[0, 1]"],
        ["PR-AUC", "Ranking, seen through precision", "Yes", "Yes, by design", "No", "[prevalence, 1]"],
        ["Log loss", "Probabilities", "Yes", "Weakly (the base-rate loss depends on it)", "Yes, harshly", "No"],
        ["Brier", "Probabilities", "Yes", "Weakly", "Yes, gently", "[0, 1]"]
      ]
    },

    { t: "callout", kind: "tradeoff", title: "Which one to put on the dashboard", body: [
      { t: "p", text: "For model selection with a rare class and an action per flag: **PR-AUC**, because it tracks what the action will cost. For comparing rankers across differently balanced datasets: **ROC-AUC**. For anything that uses the probability as a number — expected-cost thresholds (2.3), ranking by expected value, prioritisation budgets: **log loss or Brier**, plus a calibration plot (2.5). For the stakeholder: none of these — the confusion matrix at the operating point in their units (2.1). Report AUC alongside, never instead." }
    ]},

    { t: "ladder",
      title: "Choosing between two fraud models",
      rungs: [
        { level: "bad", label: "Higher ROC-AUC wins", code: `# (illustrative numbers) model A: ROC-AUC 0.95     model B: ROC-AUC 0.93   -> ship A`,
          note: "**At 1 % prevalence, ROC-AUC can be 0.95 with precision under 0.05 in the top decile.** The number says nothing about what the fraud team will see." },
        { level: "ok", label: "Higher PR-AUC wins", code: `# model A: AP 0.31     model B: AP 0.38   -> ship B`,
          note: "**Closer to the decision** — B's flags are more often fraud across the range of recall. Still an area, not the operating point." },
        { level: "best", label: "Precision at the recall the budget allows, with the curve and a proper score", code: `# (illustrative numbers) the team can review 500 alerts a day. At that alert volume: A finds 62 % of fraud at precision 0.12; B finds 71 % at 0.14.
# B's log loss is also lower (0.031 vs 0.036): its probabilities are usable for prioritising the queue. Ship B; show the PR curves.`,
          note: "**The metric is the point on the curve that the budget picks out**, and the proper score says whether the probabilities can rank the queue. Areas summarise; operating points decide." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "AUC from scratch, three ways",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Implement ROC-AUC without scikit-learn in three ways and show they agree on the ten-score example and on the churn model's held-out predictions: **(a)** sweep thresholds, accumulate (FPR, TPR) points, integrate by trapezoids; **(b)** count (positive, negative) pairs with the positive scoring higher, ties counting one half, divided by P × N; **(c)** the rank formula — rank all scores, sum the ranks of the positives, then AUC = (Σ ranks_pos − P(P+1)/2) / (P × N). Then implement average precision as the step sum and check it against scikit-learn. Finally, write a one-paragraph explanation of why (b) and (c) are the same computation." }
      ],
      requirements: [
        "Three AUC functions agreeing to 6 decimals on both datasets; handle ties in (b) and (c).",
        "An average-precision function agreeing with `average_precision_score`.",
        "The paragraph on (b) versus (c), mentioning the Mann–Whitney U statistic."
      ],
      hint: "For (c), use `scipy.stats.rankdata` with average ranks so ties are handled the same way as the half-credit in (b). For (b) on 297 rows, a nested loop over 48 × 249 pairs is fine; vectorise with broadcasting if you like.",
      solution: {
        lang: "python",
        title: "auc_from_scratch.py",
        code: `from scipy.stats import rankdata

def auc_sweep(y, s):
    order = np.argsort(-s); y = y[order]; s = s[order]
    P, N = y.sum(), len(y) - y.sum(); tp = fp = 0; pts = [(0.0, 0.0)]
    for i in range(len(y)):
        if y[i]: tp += 1
        else:    fp += 1
        if i == len(y) - 1 or s[i + 1] != s[i]:          # emit a point only when the score changes: ties move diagonally
            pts.append((fp / N, tp / P))
    x, t = zip(*pts)
    return sum((x[i + 1] - x[i]) * (t[i + 1] + t[i]) / 2 for i in range(len(x) - 1))

def auc_pairs(y, s):
    pos, neg = s[y == 1], s[y == 0]
    gt = (pos[:, None] > neg[None, :]).sum(); eq = (pos[:, None] == neg[None, :]).sum()
    return (gt + 0.5 * eq) / (len(pos) * len(neg))

def auc_ranks(y, s):
    r = rankdata(s)                                          # average ranks: ties share their mean rank
    P, N = y.sum(), len(y) - y.sum()
    return (r[y == 1].sum() - P * (P + 1) / 2) / (P * N)

def average_precision(y, s):
    order = np.argsort(-s); y = y[order]; tp = 0; ap = 0.0; P = y.sum()
    for i in range(len(y)):
        if y[i]:
            tp += 1; ap += tp / (i + 1)                         # precision at this row, credited at each recall increment of 1/P
    return ap / P

# ten-score example: all three give 0.72; AP 0.794.   churn held-out: all three give 0.789; AP 0.515.

# (b) versus (c): counting the pairs in which a positive outscores a negative is the Mann-Whitney U statistic. Summing the
# ranks of the positives counts, for each positive, how many items sit below it -- the negatives below it plus the positives
# below it. The positives-below-positives part is fixed at P(P+1)/2 regardless of the scores, so subtracting it leaves
# exactly the count of (positive above negative) pairs; average ranks give ties half a pair each. Dividing by P·N normalises
# to a probability. The sweep-and-integrate method computes the same area geometrically: each positive contributes a
# vertical step of 1/P whose horizontal position is the fraction of negatives already passed.`,
        notes: [
          { t: "p", text: "**Three computations, one number, three viewpoints**: geometry (the curve), probability (the pair), statistics (Mann–Whitney U). Interviewers who ask for AUC from scratch usually want (b) or (c); the tie handling is the detail that separates a correct implementation from a nearly correct one." },
          { t: "p", text: "**The rank form is O(n log n)** and is what libraries use; the pair form is O(P·N) and is what to write on a whiteboard." },
          { t: "p", text: "**Average precision's step sum** credits precision only at rows where a positive appears — which is why linear interpolation of the PR curve overstates the area." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Quadrupling the negatives left ROC-AUC at 0.789 and cut PR-AUC from 0.515 to 0.281. Which curve should a fraud team look at, and why?",
          options: [
            "ROC, because it is stable",
            "PR: its precision axis is what the team experiences per alert, and it fell because the same ranking now flags many more legitimate transactions per fraud caught; ROC's stability is exactly its blindness to that",
            "ROC, because AUC is standard",
            "Neither; use accuracy"
          ],
          answer: 1,
          why: "ROC-AUC is prevalence-independent by construction. When the action is per flag and positives are rare, prevalence is the whole problem."
        }
      ]
    }
  ],

  takeaways: [
    "**The ROC curve is every confusion matrix at once**: TPR against FPR as the threshold sweeps.",
    "**AUC = P(random positive outscores random negative)** — proved by counting 18 of 25 pairs; the rank formula is the same count via Mann–Whitney U.",
    "**AUC depends only on the ordering**: monotone transforms of the scores leave it unchanged, so it cannot see calibration.",
    "**ROC is prevalence-independent; PR is not** — quadrupling negatives left ROC-AUC at 0.789 and cut PR-AUC from 0.515 to 0.281.",
    "**PR-AUC's floor is the prevalence**; read it against that floor, not against 0.5.",
    "**For rare positives with an action per flag, use the PR curve; for comparing rankers, ROC-AUC.**",
    "**Proper scoring rules judge the probabilities**: log loss (unbounded, harsh on confident misses: 6.91 for p = 0.001) and Brier (bounded, gentle).",
    "**Distorting confidence in either direction worsens both proper scores while AUC is unchanged.**",
    "**Interpolate ROC linearly, PR by steps** (average precision).",
    "**The dashboard metric is the operating point the budget picks out**; areas summarise, points decide."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A model's scores are replaced by their squares. What happens to ROC-AUC, PR-AUC, log loss and accuracy at 0.5?",
        options: [
          "All change",
          "ROC-AUC and PR-AUC are unchanged (the ordering is preserved); log loss changes (the probabilities did); accuracy at 0.5 changes (every score below 1 got smaller, so the threshold now flags fewer rows)",
          "Nothing changes",
          "Only log loss changes"
        ],
        answer: 1,
        why: "Ranking metrics see order; proper scores see values; threshold metrics see values against a fixed cut. Knowing which is which is the whole lesson."
      },
      {
        stem: "Why is log loss unbounded while Brier is not?",
        options: [
          "Log loss uses natural logs",
          "Log loss charges −log p for a positive: as p → 0 the charge → ∞, so one confident miss can dominate (6.91 at p = 0.001); Brier charges (1 − p)², which is at most 1",
          "Brier ignores confident mistakes",
          "They are both bounded"
        ],
        answer: 1,
        why: "This makes log loss the natural training objective (it is the likelihood) and Brier the calmer report; clip probabilities away from 0 and 1 before reporting log loss."
      },
      {
        stem: "What makes a scoring rule 'proper'?",
        options: [
          "It is between 0 and 1",
          "Reporting the true probability minimises its expected value, so a model cannot improve it by hedging toward 0.5 or by bluffing confidence — both distortions of the churn model's logits made log loss and Brier worse",
          "It ignores the threshold",
          "It depends on prevalence"
        ],
        answer: 1,
        why: "Accuracy rewards bluffing (push everything past the threshold); AUC ignores confidence entirely. Only proper scores make honest probabilities the optimal strategy."
      },
      {
        stem: "Why is linear interpolation of the PR curve wrong?",
        options: [
          "It is not wrong",
          "Precision is not linear in recall between operating points: between two achievable points the true curve dips (adding rows adds false positives before the next true positive), so straight lines overstate the area; average precision uses the step sum instead",
          "Because recall is discrete",
          "Because PR curves are monotone"
        ],
        answer: 1,
        why: "ROC's axes are both counts divided by fixed totals, so straight lines are exact there. PR's precision has a moving denominator."
      },
      {
        stem: "Two models: A has ROC-AUC 0.95 and PR-AUC 0.20; B has 0.90 and 0.35, on a 1 % fraud problem. Which do you prefer for an alert queue, and what does the pair of numbers tell you?",
        options: [
          "A; higher ROC-AUC",
          "B: for an alert queue precision per flag is what matters and B's PR-AUC is far higher; the pair suggests A separates the bulk of negatives well but is weak at the very top of the ranking, where the alerts are drawn from",
          "A; PR-AUC is unreliable",
          "They are equivalent"
        ],
        answer: 1,
        why: "ROC-AUC integrates over all thresholds, most of which flag most of the data; PR-AUC concentrates on the region where flags are few. On rare positives the second region is the only one that is used."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is ROC-AUC and what are its key properties?",
        strong: "The ROC curve plots true-positive rate against false-positive rate as the decision threshold sweeps from strict to lenient, so it shows every confusion matrix the score could produce; the area under it equals the probability that a randomly chosen positive is scored above a randomly chosen negative — you can compute it by counting such pairs, or via the Mann–Whitney rank sum. Properties: 0.5 is random and 1 is perfect; it depends only on the ordering of scores, so any monotone transform leaves it unchanged and it says nothing about calibration; it is independent of prevalence, since both axes are rates within a single true class, which makes it good for comparing rankers across datasets and blind to how a rare-positive problem feels in practice; and its linear interpolation is exact. Its weakness is that for rare positives it is dominated by thresholds nobody would use, which is why I pair it with the precision–recall curve.",
        answer: [
          { t: "p", text: "The pair-probability definition, ordering-only, prevalence-independence, and the rare-positive caveat." }
        ]
      },
      {
        level: "core",
        q: "When would you choose PR-AUC over ROC-AUC?",
        strong: "When positives are rare and each flag triggers an action with a cost — fraud alerts, retention calls, clinical recalls. Precision is what the person acting on the flags experiences, and it moves with the base rate while ROC does not: on a churn model, quadrupling the negatives left ROC-AUC at 0.789 and cut average precision from 0.515 to 0.281, with the ranking unchanged. The PR curve also has the right floor — a random ranker's precision is the prevalence — so a PR-AUC of 0.3 at 1 % prevalence is a strong model and at 50 % a weak one. I would report ROC-AUC alongside for comparability, and the operating point the alert budget picks out on the PR curve as the number that decides.",
        answer: [
          { t: "p", text: "Rare positives plus an action per flag, the executed numbers, and the floor — that is the complete case." }
        ]
      },
      {
        level: "advanced",
        q: "Why use a proper scoring rule, and what is the difference between log loss and the Brier score?",
        strong: "Threshold metrics judge decisions and AUC judges ordering; neither says whether a predicted 0.8 means 80 %. A proper scoring rule is minimised in expectation by the true probability, so honesty is the optimal strategy: a model cannot gain by hedging toward the base rate or by bluffing confidence — scaling a logistic model's logits by 0.5 or by 3 worsened both scores while AUC stayed put. Log loss is the negative log-likelihood, the natural training objective, and it is unbounded — a confident miss at p = 0.001 costs 6.9, so a handful of rows can dominate; Brier is mean squared error on probabilities, bounded by 1, and decomposes into calibration and refinement, which makes it the calmer report. In practice: train on log loss, report Brier or clipped log loss alongside a reliability diagram, and use the probabilities for expected-cost thresholds only after checking calibration.",
        answer: [
          { t: "p", text: "Definition of proper, the executed distortions, the boundedness contrast, and what to do with each — expert level." }
        ]
      }
    ]
  }
});
