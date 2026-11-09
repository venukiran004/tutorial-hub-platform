/* ============================================================================
   LESSON 11.3 — Three Shapes of Degradation
   ========================================================================= */
EC.receiveLesson({
  id: "11.3",

  lede: "Once labels arrive, model quality over time takes one of three shapes. A gradual decline means the world is drifting away from the training data a little every week. A sudden drop means something changed on a particular day: a policy, a product, a pipeline. A seasonal cycle means the model is fine on average and wrong at predictable times of year. Each shape has its own signature in the monitoring data and its own right response, and the seasonal one is regularly misread as decay and retrained, at a cost and sometimes for the worse. This lesson simulates all three and measures what retraining buys in the seasonal case.",

  objectives: [
    "Recognise gradual decline, a sudden drop and a seasonal cycle in a quality time series",
    "Match each shape to its response: scheduled retraining, investigation and rollback, or seasonal features",
    "Measure why frequent retraining is the wrong answer to seasonality",
    "Classify a series by which model of change explains it best"
  ],

  prerequisites: ["11.1", "11.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "shapes",
      text: "Three signatures",
      sub: "A year of daily AUC for a model that is never retrained" },
    { t: "p",
      text: "The simulation trains a model on 30 days of data and scores it every day for a year, under three kinds of change. In the **gradual** world, one feature's effect fades and another's grows steadily. In the **sudden** world, a policy change on day 200 reverses one feature's effect. In the **seasonal** world, one feature's effect follows the time of year, positive in one half and negative in the other." },
    { t: "code",
      lang: "python",
      title: "degrade.py — three shapes, and three ways to handle the seasonal one",
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(3)
N_DAY = 2_000                                        # labelled examples per day

def day_data(day, kind):
    X = rng.normal(size=(N_DAY, 3))
    w = np.array([1.2, 0.8, 0.6])
    if kind == "gradual": w = w * np.array([1 - day / 500, 1, 1 + day / 250])     # one effect fades, another grows
    if kind == "sudden" and day >= 200: w = np.array([1.2, -0.4, 0.6])           # a policy change on day 200
    season = np.sin(2 * np.pi * day / 365)
    if kind == "seasonal": w = np.array([1.2, 0.8 * season, 0.6])               # feature 2 matters with a sign that follows the season
    y = (rng.random(N_DAY) < 1 / (1 + np.exp(-(X @ w)))).astype(int)
    return X, y

def season_feats(X, day):                            # a model can know the date: interactions with the season
    s, c = np.sin(2 * np.pi * day / 365), np.cos(2 * np.pi * day / 365)
    return np.column_stack([X, X[:, 1] * s, X[:, 1] * c])

print("== signatures over a year: daily AUC of a model trained on days -30..-1, never retrained ==")
for kind in ("gradual", "sudden", "seasonal"):
    hist = [day_data(d, kind) for d in range(-30, 0)]
    m = LogisticRegression().fit(np.vstack([h[0] for h in hist]), np.concatenate([h[1] for h in hist]))
    auc = np.array([roc_auc_score(y, m.predict_proba(X)[:, 1]) for X, y in (day_data(d, kind) for d in range(365))])
    q = [auc[i:i + 91].mean() for i in range(0, 365, 91)][:4]
    print(f"  {kind:<9} quarter means " + "  ".join(f"{v:.3f}" for v in q) + f"   min {auc.min():.3f} on day {auc.argmin()}")

print("\\n== the seasonal case: three ways to keep the model current (mean and worst 30-day AUC over year 2) ==")
year1 = [day_data(d, "seasonal") for d in range(365)]
full = LogisticRegression().fit(np.vstack([season_feats(X, d) for d, (X, _) in enumerate(year1)]), np.concatenate([y for _, y in year1]))
results = {"retrain every 30 days on the last 30": [], "season-aware model, trained once on a year": [], "never retrain (trained on days -30..-1)": []}
window = year1[-30:]
recent = LogisticRegression().fit(np.vstack([w[0] for w in window]), np.concatenate([w[1] for w in window]))
static = recent
retrains = 0
for d in range(365, 730):
    X, y = day_data(d, "seasonal"); window = (window + [(X, y)])[-30:]
    results["retrain every 30 days on the last 30"].append(roc_auc_score(y, recent.predict_proba(X)[:, 1]))
    results["season-aware model, trained once on a year"].append(roc_auc_score(y, full.predict_proba(season_feats(X, d))[:, 1]))
    results["never retrain (trained on days -30..-1)"].append(roc_auc_score(y, static.predict_proba(X)[:, 1]))
    if (d - 365) % 30 == 29:
        recent = LogisticRegression().fit(np.vstack([w[0] for w in window]), np.concatenate([w[1] for w in window])); retrains += 1
for name, a in results.items():
    a = np.array(a); worst = min(a[i:i + 30].mean() for i in range(0, len(a) - 30))
    print(f"  {name:<44} mean {a.mean():.3f}   worst month {worst:.3f}")
print(f"  ({retrains} retrains for the monthly policy)")`,
      out: `== signatures over a year: daily AUC of a model trained on days -30..-1, never retrained ==
  gradual   quarter means 0.812  0.796  0.773  0.744   min 0.715 on day 363
  sudden    quarter means 0.819  0.821  0.723  0.695   min 0.674 on day 276
  seasonal  quarter means 0.758  0.758  0.794  0.797   min 0.703 on day 82

== the seasonal case: three ways to keep the model current (mean and worst 30-day AUC over year 2) ==
  retrain every 30 days on the last 30         mean 0.799   worst month 0.779
  season-aware model, trained once on a year   mean 0.806   worst month 0.791
  never retrain (trained on days -30..-1)      mean 0.777   worst month 0.740
  (12 retrains for the monthly policy)` },
    { t: "viz",
      title: "Quarterly AUC of a model that is never retrained",
      caption: "Gradual decay slopes; a sudden change is a step that stays; a seasonal cycle recovers on its own, which is the clue that retraining is not the answer.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0.65</text>
<line x1="64" y1="172.5" x2="610" y2="172.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="176.5" text-anchor="end" class="s-sub">0.70</text>
<line x1="64" y1="121.0" x2="610" y2="121.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="125.0" text-anchor="end" class="s-sub">0.75</text>
<line x1="64" y1="69.5" x2="610" y2="69.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="73.5" text-anchor="end" class="s-sub">0.80</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">0.85</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">Q1</text>
<text x="246.0" y="242" text-anchor="middle" class="s-sub">Q2</text>
<text x="428.0" y="242" text-anchor="middle" class="s-sub">Q3</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">Q4</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">quarter of the year after deployment</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">mean daily AUC</text>
<polyline points="64.0,57.1 246.0,73.6 428.0,97.3 610.0,127.2" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="57.1" r="2" style="fill:var(--warn)"/>
<circle cx="246.0" cy="73.6" r="2" style="fill:var(--warn)"/>
<circle cx="428.0" cy="97.3" r="2" style="fill:var(--warn)"/>
<circle cx="610.0" cy="127.2" r="2" style="fill:var(--warn)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">gradual</text>
<polyline points="64.0,49.9 246.0,47.9 428.0,148.8 610.0,177.7" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="49.9" r="2" style="fill:var(--crit)"/>
<circle cx="246.0" cy="47.9" r="2" style="fill:var(--crit)"/>
<circle cx="428.0" cy="148.8" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="177.7" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">sudden</text>
<polyline points="64.0,112.8 246.0,112.8 428.0,75.7 610.0,72.6" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="112.8" r="2" style="fill:var(--accent)"/>
<circle cx="246.0" cy="112.8" r="2" style="fill:var(--accent)"/>
<circle cx="428.0" cy="75.7" r="2" style="fill:var(--accent)"/>
<circle cx="610.0" cy="72.6" r="2" style="fill:var(--accent)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">seasonal</text>
</svg>` },
    { t: "table",
      head: ["Shape", "Signature", "Usual cause", "Response"],
      rows: [
        [
          "Gradual",
          "Steady slope, no recovery",
          "Slow change in behaviour or population",
          "Scheduled retraining at a cadence that keeps up"
        ],
        [
          "Sudden",
          "A step on one day, then flat",
          "A product, policy, partner or pipeline change",
          "Find the change; roll back, fix, or retrain on post-change data"
        ],
        [
          "Seasonal",
          "A cycle that repeats and recovers",
          "Calendar effects: holidays, weather, pay days",
          "Give the model the season; train on full cycles"
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Treating a sudden drop as drift",
      body: [
        { t: "p",
          text: "A step change has a date, and the date is the most useful fact in the investigation: a deploy, a schema change, a new partner, a pricing change. Retraining straight away hides the cause and, if the cause was a pipeline fault, teaches the model the fault (lesson 11.1). Look up what changed that day first." }
      ] },
    { t: "h2",
      n: "02",
      id: "seasonal",
      text: "Why retraining does not fix seasonality",
      sub: "Twelve retrains against one model that knows the date" },
    { t: "p",
      text: "In year two of the seasonal world, the script compares three policies: never retrain; retrain every 30 days on the last 30 days; and train once on a full year with features that let the model know the season (interactions with the sine and cosine of the day of year)." },
    { t: "dl",
      items: [
        { term: "Never retraining cost the most",
          def: "Mean AUC 0.777, worst month 0.740: the model learnt one season's relationship and was wrong for the other half of the year." },
        { term: "Monthly retraining chased the season",
          def: "Twelve retrains reached a mean of 0.799, but each model is trained on a month that has already passed. At every turn of the season, it is fitted to the season that is ending." },
        { term: "One season-aware model did better",
          def: "Trained once, it reached 0.806 mean and 0.791 in its worst month, beating twelve retrains on both, because it learnt how the relationship varies instead of re-learning it every month." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Training windows must contain full cycles",
      body: [
        { t: "p",
          text: "A model trained on the last 30 days of data has never seen December if it is retrained in November. For anything with an annual pattern, train on at least a year (two, if the cycle is noisy), give the model calendar features, and evaluate on the same period of the previous year, not on last month." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Classify the shape",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Generate twenty two-year daily AUC series, five each of gradual decline, a sudden drop at a random day, a seasonal cycle with a random phase, and no change, with realistic day-to-day noise. Write a classifier that fits a straight line, the best single step, and an annual sinusoid to each series, picks the model that explains the most variance, and calls the series stable if none explains much. Score it, and report the change point it finds for a sudden drop." }
      ],
      requirements: [
        "Three fitted models per series and their R²",
        "A search over change points for the step model",
        "A minimum R² below which the series is called stable",
        "Accuracy over the 20 series and any confusions"
      ],
      hint: "The sinusoid is linear regression on [1, sin(2πt/365), cos(2πt/365)]; the phase comes out of the two coefficients, so you do not need to search for it.",
      solution: { lang: "python",
        title: "classify_shape.py",
        code: `import numpy as np
rng = np.random.default_rng(8)
T = 730                                                              # two years of daily AUC on delayed labels

def series(kind):
    t = np.arange(T); base = 0.80
    if kind == "gradual": s = base - 0.00012 * t
    elif kind == "sudden": s = np.where(t < rng.integers(200, 500), base, base - 0.09)
    elif kind == "seasonal": s = base - 0.035 * (1 + np.sin(2 * np.pi * (t - rng.integers(0, 365)) / 365))
    else: s = np.full(T, base)
    return s + rng.normal(0, 0.012, T)                               # day-to-day noise from a few thousand labels

def r2(y, fit): return 1 - np.sum((y - fit) ** 2) / np.sum((y - y.mean()) ** 2)

def classify(y):
    t = np.arange(T)
    lin = np.polyval(np.polyfit(t, y, 1), t)
    steps = [(r2(y, np.where(t < k, y[:k].mean(), y[k:].mean())), k) for k in range(30, T - 30, 5)]
    step_r2, k = max(steps)
    S, C = np.sin(2 * np.pi * t / 365), np.cos(2 * np.pi * t / 365)
    A = np.column_stack([np.ones(T), S, C]); seas = A @ np.linalg.lstsq(A, y, rcond=None)[0]
    scores = {"gradual": r2(y, lin), "sudden": step_r2, "seasonal": r2(y, seas)}
    best = max(scores, key=scores.get)
    if scores[best] < 0.2: best = "stable"                           # nothing explains much of the variance: noise
    return best, scores, k

kinds = ["gradual", "sudden", "seasonal", "stable"] * 5
rng.shuffle(kinds)
right = 0; confusions = []
for truth in kinds:
    verdict, s, k = classify(series(truth)); right += verdict == truth
    if verdict != truth: confusions.append((truth, verdict, s))
print(f"{right} of {len(kinds)} series classified correctly")
for truth, verdict, s in confusions:
    print(f"  {truth} called {verdict}: R² " + ", ".join(f"{n} {v:.2f}" for n, v in s.items()))
y = series("sudden"); v, s, k = classify(y)
print(f"example: a sudden drop -> {v}, change point found at day {k}; R² " + ", ".join(f"{n} {x:.2f}" for n, x in s.items()))
y = series("seasonal"); v, s, k = classify(y)
print(f"example: a seasonal cycle -> {v}; R² " + ", ".join(f"{n} {x:.2f}" for n, x in s.items()))`,
        out: `20 of 20 series classified correctly
example: a sudden drop -> sudden, change point found at day 390; R² gradual 0.68, sudden 0.93, seasonal 0.01
example: a seasonal cycle -> seasonal; R² gradual 0.03, sudden 0.16, seasonal 0.81`,
        notes: [
          { t: "p",
            text: "All 20 series were classified correctly. For the sudden drop shown, the step model explained 93% of the variance and also found the day of the change (390), which is the starting point of the investigation; a straight line explained 68%, which is why a slope alone would have misread it as gradual decay." },
          { t: "p",
            text: "The comparison of fits is the point: each shape implies a response, and choosing the model of change that best explains the data is how you pick the response. It needs two years of history to see an annual cycle, which is itself a reason to keep quality metrics for at least that long." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the November retrain",
      body: [
        { t: "p",
          text: "**Symptom.** A retail demand model's error rose through November, the team retrained it on October and November data, and December forecasts were the worst of the year, with stock-outs on gift lines." },
        { t: "p",
          text: "**Mechanism.** Demand was seasonal. The model had been trained on a single summer, so autumn looked like decay. Retraining on the last two months taught it autumn, not the December peak, which it had never seen. Last year's December, the one piece of data that would have helped, was outside the training window." },
        { t: "p",
          text: "**Fix.** The model was retrained on three years with calendar and holiday features, evaluated against the same weeks of the previous year, and the monitoring dashboard gained a year-on-year comparison so a seasonal dip is recognised as one." }
      ] }
  ],

  takeaways: [
    "Quality over time has three shapes: **gradual**, **sudden** and **seasonal**; each needs a different response.",
    "Gradual: a slope with no recovery; retrain on a schedule fast enough to keep up.",
    "Sudden: a step with a **date**; find what changed that day before retraining.",
    "Seasonal: a cycle that **recovers on its own**; give the model the season and train on full cycles.",
    "Measured: never retraining averaged **0.777** AUC; **12** monthly retrains **0.799**; one season-aware model **0.806**.",
    "Recent-window retraining is always fitted to the season that is ending.",
    "Fitting a line, a step and a sinusoid classified **20 of 20** series and found the change day.",
    "Keep at least two years of quality history to see annual cycles."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "AUC dropped from 0.82 to 0.72 on one day and has stayed flat since. What should you do first?",
        options: [
          "Retrain on the data from after the drop",
          "Find what changed on that day",
          "Add seasonal features to the model",
          "Lower the alert threshold to catch it sooner"
        ],
        answer: 1,
        why: "A step has a date, and the cause (a deploy, schema change, policy) decides the fix, which may be a rollback. Retraining first can hide or learn a fault; seasonal features address cycles, and the alert already fired." },
      { stem: "Why did monthly retraining underperform a single season-aware model?",
        options: [
          "It used too little data to train well",
          "Each model was fitted to a season that was ending",
          "Retraining introduced new bugs into the data pipeline",
          "Its learning rate was set too high"
        ],
        answer: 1,
        why: "A 30-day window always reflects the last month, so at each turn of the season the model is out of date. Data volume was ample, and there were no bugs or learning-rate issues in the simulation." },
      { stem: "What is the clearest sign that a decline is seasonal rather than gradual?",
        options: [
          "It is larger than any previous decline",
          "It recovers without any change to the model",
          "It affects every one of the features at the same time",
          "It began immediately after a deployment"
        ],
        answer: 1,
        why: "Seasonal effects come back on their own as the cycle turns; gradual decline does not. Size, affecting all features or coinciding with a deploy point elsewhere, the last towards a sudden change." },
      { stem: "How long must quality history be kept to recognise an annual cycle reliably?",
        options: [
          "About a month, covering the period since the latest retrain",
          "At least two years, to see the cycle repeat",
          "About a quarter, one season at a time",
          "Only since the last model version shipped"
        ],
        answer: 1,
        why: "A cycle is recognised by repetition; one year shows a shape, two show that it repeats. A month or a quarter shows only part of the cycle, and per-version history resets it." }
    ] },

  interview: { title: "In an interview",
    sub: "Describe the shape before prescribing the fix.",
    questions: [
      { level: "core",
        q: "Your model's accuracy has been falling. How do you decide what to do?",
        strong: "A strong answer reads the shape of the series and maps each shape to a response.",
        answer: [
          { t: "p",
            text: "Plot quality over as long a history as possible and look at the shape. A steady slope suggests gradual drift: set a retraining cadence that keeps up and check what is changing. A step points to an event on a date: look for deploys, upstream changes or business changes that day and fix or roll back. A cycle that recurs points to seasonality: add calendar features, train on full cycles, compare year on year. I would confirm by fitting each shape and seeing which explains the data." }
        ] },
      { level: "advanced",
        q: "Why can frequent retraining make a seasonal model worse?",
        strong: "A strong answer explains the lag of recent-window training and the missing season.",
        answer: [
          { t: "p",
            text: "A short training window only contains the recent part of the cycle, so the model is always fitted to the season that is ending and has never seen the one that is coming. In the simulation twelve monthly retrains averaged 0.799 AUC against 0.806 for one model trained on a full year with seasonal features. The fix is longer windows containing full cycles and features that tell the model where in the cycle it is." }
        ] },
      { level: "core",
        q: "How would you detect a sudden change automatically?",
        strong: "A strong answer names a change-point method and ties alerts to dates.",
        answer: [
          { t: "p",
            text: "A change-point method on the quality series, such as CUSUM or fitting the best single step and comparing its fit with a flat line, run daily on labelled or proxy metrics. The output that matters is the date of the change, which is correlated with the deploy log, schema changes and upstream incidents. Fast proxies help, because labels may arrive weeks after the change." }
        ] }
    ] }
});
