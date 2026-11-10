/* ============================================================================
   LESSON 13.2 — Leakage and the Clock
   ========================================================================= */
EC.receiveLesson({
  id: "13.2",

  lede: "Leakage is a feature that knows something at training time that it could not know at prediction time. It is the most flattering bug in machine learning: the offline score goes up, the team ships, and production is worse than the evaluation promised, sometimes far worse. Most leaks come from building the training table with today's knowledge: aggregates over a customer's whole history, fields filled in after the outcome, joins that ignore when each fact became true. This lesson builds the common leaks into a refund model, measures how they inflate offline scores, including under a time-based split, and turns the point-in-time rule from lesson 1.4 into a test.",

  objectives: [
    "Recognise target leakage, future-aggregate leakage and post-outcome fields",
    "Measure how leakage inflates offline evaluation compared with production",
    "Explain why a random split, and sometimes a time split, fails to catch it",
    "Write a point-in-time test that removes the future and checks features do not change"
  ],

  prerequisites: ["1.4", "13.1"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "leaks",
      text: "Three leaks in one training table",
      sub: "And what each did to the score" },
    { t: "p",
      text: "Two years of orders, each refunded or not with a customer-specific propensity. The correct features use only orders strictly before the one being scored: how many there were and what share were refunded. The convenient version computes the customer's aggregates over the whole table, and keeps a field, the refund ticket's age, that is only filled in after a refund happens. Each model is evaluated on a random split, on a time split (train on the first 18 months, test on the last 6), and in 'production': the last 6 months scored with the features as they could actually be computed at order time." },
    { t: "code",
      lang: "python",
      title: "leakage.py — correct and leaky features, three evaluations",
      code: `import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(31)

# Orders over two years. A customer's orders are refunded with a customer-specific propensity; we predict refunds.
C, N = 4_000, 120_000
propensity = rng.beta(1, 12, C)
orders = pd.DataFrame({"customer": rng.integers(0, C, N), "t": np.sort(rng.uniform(0, 730, N)),
                       "amount": rng.lognormal(3.5, 0.8, N)})
orders["refund"] = (rng.random(N) < np.clip(propensity[orders.customer] * (1 + orders.amount / 100), 0, 1)).astype(int)
orders["refund_ticket_days"] = np.where(orders.refund == 1, rng.uniform(1, 20, N), np.nan)   # opened after the order

def features(df, as_of_correct=True):
    g = df.groupby("customer")
    out = pd.DataFrame({"amount": df.amount})
    if as_of_correct:                                   # only orders strictly before this one
        out["prior_orders"] = g.cumcount()
        out["prior_refund_rate"] = (g.refund.cumsum() - df.refund) / out.prior_orders.replace(0, np.nan)
    else:                                               # the convenient version: the customer's whole history
        out["prior_orders"] = g.refund.transform("size")
        out["prior_refund_rate"] = g.refund.transform("mean")
        out["has_ticket"] = df.refund_ticket_days.notna().astype(int)        # a post-outcome field left in the table
    return out

def evaluate(X, y, t):
    rand = rng.random(len(X)) < 0.75
    m1 = HistGradientBoostingClassifier(random_state=0).fit(X[rand], y[rand]); a_rand = roc_auc_score(y[~rand], m1.predict_proba(X[~rand])[:, 1])
    tr, te = t < 548, t >= 548                                    # first 18 months train, last 6 test
    m2 = HistGradientBoostingClassifier(random_state=0).fit(X[tr], y[tr]); a_time = roc_auc_score(y[te], m2.predict_proba(X[te])[:, 1])
    return m2, a_rand, a_time

y, t = orders.refund.to_numpy(), orders.t.to_numpy()
print(f"{'feature set':<44}{'random split':>13}{'time split':>11}{'production':>11}")
Xp = features(orders, True)                                       # what production can compute at order time
for name, kw in (("as-of features (correct)", dict(as_of_correct=True)),
                 ("whole-history aggregates + ticket field", dict(as_of_correct=False))):
    X = features(orders, **kw)
    m, a_rand, a_time = evaluate(X, y, t)
    te = t >= 548
    Xprod = Xp[te].copy()
    if "has_ticket" in X: Xprod["has_ticket"] = 0               # at order time no ticket exists yet
    a_prod = roc_auc_score(y[te], m.predict_proba(Xprod[X.columns])[:, 1])
    print(f"{name:<44}{a_rand:>13.3f}{a_time:>11.3f}{a_prod:>11.3f}")

X = features(orders, False).drop(columns="has_ticket")
m, a_rand, a_time = evaluate(X, y, t)
a_prod = roc_auc_score(y[t >= 548], m.predict_proba(Xp[t >= 548][X.columns])[:, 1])
print(f"{'whole-history aggregates only':<44}{a_rand:>13.3f}{a_time:>11.3f}{a_prod:>11.3f}")`,
      out: `feature set                                  random split time split production
as-of features (correct)                            0.710      0.734      0.734
whole-history aggregates + ticket field             1.000      1.000      0.532
whole-history aggregates only                       0.814      0.811      0.741` },
    { t: "viz",
      title: "AUC offline and in production",
      caption: "Bars show AUC above 0.5. The post-outcome field scored perfectly offline and near chance in production; whole-history aggregates overstated the score by 0.07 even on a time split.",
      svg: `<svg viewBox="0 0 760 248" width="100%" role="img">
<text x="250" y="31.0" text-anchor="end" class="s-label">as-of features: offline (time split)</text>
<rect x="260" y="14" width="152.1" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="420.1" y="31.0" class="s-sub">0.734</text>
<text x="250" y="69.0" text-anchor="end" class="s-label">as-of features: production</text>
<rect x="260" y="52" width="152.1" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="420.1" y="69.0" class="s-sub">0.734</text>
<text x="250" y="107.0" text-anchor="end" class="s-label">history + ticket field: offline</text>
<rect x="260" y="90" width="325.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="107.0" class="s-sub">1.000</text>
<text x="250" y="145.0" text-anchor="end" class="s-label">history + ticket field: production</text>
<rect x="260" y="128" width="20.8" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="288.8" y="145.0" class="s-sub">0.532</text>
<text x="250" y="183.0" text-anchor="end" class="s-label">history aggregates: offline</text>
<rect x="260" y="166" width="202.2" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="470.2" y="183.0" class="s-sub">0.811</text>
<text x="250" y="221.0" text-anchor="end" class="s-label">history aggregates: production</text>
<rect x="260" y="204" width="156.7" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="424.6" y="221.0" class="s-sub">0.741</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "A post-outcome field: perfect, then useless",
          def: "The ticket field exists only for refunded orders, so it gave AUC 1.000 on both splits and 0.532 in production, where no ticket exists yet at order time." },
        { term: "Future aggregates: an inflated promise",
          def: "Refund rates over the whole history scored 0.811 offline against 0.741 in production. Here the production model happened to be no worse than the correct one, but every decision based on 0.81 (thresholds, expected savings, the launch itself) was based on a number that could not happen." },
        { term: "The time split did not catch it",
          def: "Aggregates computed over the full table carry future information into the training rows too, so a chronological split still evaluated a leaky model on leaky features. Only computing features as of each row's time removes it." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Trusting a time split to catch leakage",
      body: [
        { t: "p",
          text: "A time-based split stops the model from training on the future, but not features from containing it. If the training table was built with a join or aggregate over all data, every row, train and test, already knows the future. The split is necessary; point-in-time feature construction is what makes it sufficient." }
      ] },
    { t: "h2", n: "02", id: "types", text: "Where leaks come from", sub: "The ones a random split never shows" },
    { t: "table",
      head: ["Leak", "Example", "Guard"],
      rows: [
        [
          "Post-outcome fields",
          "Ticket age, cancellation reason, 'days to chargeback'",
          "Whitelist features by the time they become known"
        ],
        ["Future aggregates", "Lifetime refund rate, total orders, last login", "Compute as of each row's timestamp"],
        [
          "Late-arriving updates",
          "A risk score recomputed after the outcome, stored over the original",
          "Keep history; join on the version valid at the time"
        ],
        ["Entity overlap", "Same customer in train and test with a random split", "Group or time-based splits"],
        [
          "Preprocessing on all data",
          "Scaler, target encoding or imputation fitted before the split",
          "Fit inside the training fold only"
        ]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A point-in-time test",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Write a test that checks whether a feature function is point-in-time correct. For 200 random orders, delete every row that happened after the order and blank the order's own outcome, recompute the features, and compare them with the values in the full table. Run it on the as-of features and on the whole-history features, and report which columns fail and how often." }
      ],
      requirements: [
        "Truncate the table at each sampled order's time",
        "Hide the sampled order's own outcome fields",
        "Compare every feature column, treating missing values as equal",
        "A per-column failure count"
      ],
      hint: "The truncated table's last row is the sampled order, because rows are sorted by time; recompute and take that last row.",
      solution: { lang: "python",
        title: "point_in_time_test.py",
        code: `import contextlib, io, runpy
import numpy as np, pandas as pd

with contextlib.redirect_stdout(io.StringIO()):
    ns = runpy.run_path("leakage.py")
orders, features = ns["orders"], ns["features"]

def point_in_time_test(feature_fn, df, n_checks=200, seed=0):
    """A feature is point-in-time correct if its value for an order does not change when every row that
    happened after that order (and the order's own outcome) is removed from the table."""
    rng = np.random.default_rng(seed); full = feature_fn(df)
    failures = {}
    for i in rng.choice(len(df), n_checks, replace=False):
        past = df[df.t <= df.t.iloc[i]].copy()
        past.loc[past.index[-1], ["refund", "refund_ticket_days"]] = [0, np.nan]   # the outcome is not known yet
        trunc = feature_fn(past).iloc[-1]
        for col in full.columns:
            a, b = full.iloc[i][col], trunc[col]
            if not (np.isclose(a, b) or (pd.isna(a) and pd.isna(b))): failures[col] = failures.get(col, 0) + 1
    return failures

for name, fn in (("as-of features", lambda d: features(d, True)), ("whole-history features", lambda d: features(d, False))):
    f = point_in_time_test(fn, orders)
    print(f"{name}: {'PASS' if not f else 'FAIL'}")
    for col, k in f.items(): print(f"  {col:<20} changed in {k} of 200 checked orders when the future was removed")`,
        out: `as-of features: PASS
whole-history features: FAIL
  prior_orders         changed in 192 of 200 checked orders when the future was removed
  prior_refund_rate    changed in 152 of 200 checked orders when the future was removed
  has_ticket           changed in 18 of 200 checked orders when the future was removed`,
        notes: [
          { t: "p",
            text: "The as-of features passed. The whole-history version failed on all three suspect columns: the order count changed for 192 of 200 orders, the refund rate for 152, and the ticket field for 18 (the refunded ones). The test names the leaking columns without anyone having to reason about each feature." },
          { t: "p",
            text: "This test needs no model and no labels, so it belongs in the feature pipeline's CI. It catches the leaks that evaluation cannot, because the leaky evaluation agrees with itself." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the churn model that knew who had cancelled",
      body: [
        { t: "p",
          text: "**Symptom.** A churn model scored AUC 0.94 offline, was launched to target retention offers, and its offers did no better than random in the first month's results." },
        { t: "p",
          text: "**Mechanism.** The training table had a 'support contacts in the last 30 days' feature computed when the table was built, after the churn label. Customers who cancelled almost always contacted support to do so, so the feature encoded the outcome. At prediction time those contacts had not happened yet." },
        { t: "p",
          text: "**Fix.** Every feature now declares the timestamp at which it becomes known, the training table is built by a point-in-time join on those timestamps, and a point-in-time test runs on every feature in CI. The rebuilt model scored 0.78 offline and 0.77 in production." }
      ] }
  ],

  takeaways: [
    "Leakage is information at training time that is unavailable at prediction time; it **flatters** offline scores.",
    "A post-outcome field scored **1.000** offline and **0.532** in production.",
    "Whole-history aggregates overstated AUC by **0.07** (0.811 against 0.741), **even on a time split**.",
    "A time split stops training on the future, not features containing it; build features **as of** each row.",
    "Common sources: post-outcome fields, future aggregates, overwritten records, entity overlap, preprocessing fitted on all data.",
    "A point-in-time test removes the future and checks each feature is unchanged; it named every leaking column here.",
    "The test needs no model or labels, so it belongs in the feature pipeline's CI."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why did a time-based split not catch the whole-history aggregates?",
        options: [
          "The test period was much too short to measure",
          "Every row's aggregates already held the future",
          "Time splits only work for deep learning models",
          "The model was retrained on the test period"
        ],
        answer: 1,
        why: "Aggregates computed over the full table carry later information into earlier rows, so both train and test rows were leaky. The period was six months, split type is model-agnostic, and no retraining on the test occurred." },
      { stem: "A feature scores AUC 1.000 alone. What should you suspect first?",
        options: [
          "An exceptionally strong but genuine signal",
          "A field filled in after the outcome is known",
          "Overfitting from too many trees in the model",
          "A bug in how AUC was calculated here"
        ],
        answer: 1,
        why: "Perfect separation from one field almost always means it encodes the outcome, like the ticket field here. Genuine signals are rarely perfect, and overfitting or AUC bugs do not produce a perfect test score from one feature." },
      { stem: "What does a point-in-time test check?",
        options: [
          "That the model's AUC is stable over time",
          "A feature is unchanged when the future is removed",
          "That all timestamps are stored in UTC everywhere",
          "That the training table is sorted by event time first"
        ],
        answer: 1,
        why: "Recomputing with only the past, and the row's outcome hidden, must give the same value; any change means the feature used later information. AUC stability, UTC and sort order are separate checks." },
      { stem: "Which preprocessing step leaks if fitted before the train-test split?",
        options: [
          "Renaming the columns to snake case",
          "Target encoding of a categorical feature",
          "Casting integer columns to floats",
          "Sorting all the rows by their customer ID"
        ],
        answer: 1,
        why: "Target encoding uses the labels; fitted on all data, it gives test rows encodings built from their own outcomes. Renaming, casting and sorting use no label or distribution information." }
    ] },

  interview: { title: "In an interview",
    sub: "Leakage answers are judged on prevention, not just recognition.",
    questions: [
      { level: "core",
        q: "Your model is much better offline than in production. What do you check?",
        strong: "A strong answer checks leakage first, then skew and drift, with specific tests.",
        answer: [
          { t: "p",
            text: "Leakage first: features that would not exist at prediction time (post-outcome fields), aggregates computed over all history, records updated after the outcome, preprocessing fitted on all data, and entity overlap between train and test. A point-in-time test on each feature and an evaluation that recomputes features exactly as production would. Then training-serving skew (lesson 13.1) and drift (module 11)." }
        ] },
      { level: "advanced",
        q: "How do you build a training table without leakage?",
        strong: "A strong answer describes event timestamps, as-of joins and tests.",
        answer: [
          { t: "p",
            text: "Every row has a prediction timestamp; every feature source keeps history with the time each value became known. The table is built with as-of joins: for each row, the latest feature value known strictly before its timestamp. Labels come from a window after the timestamp. A feature registry records when each feature is available, a point-in-time test runs in CI, and evaluation uses a time-based split on top." }
        ] },
      { level: "core",
        q: "Why does leakage survive a random train-test split?",
        strong: "A strong answer explains that the leak is in the features, not in which rows are where.",
        answer: [
          { t: "p",
            text: "The split decides which rows the model trains on, but a leaky feature carries the future inside each row, so test rows are just as leaky as training rows and the evaluation agrees with itself. Random splits also put the same customer in both sets, letting the model memorise entities. Group splits by entity, time splits, and point-in-time features each close part of the gap." }
        ] }
    ] }
});
