/* ============================================================================
   LESSON 13.1 — The Same Code, Twice
   ========================================================================= */
EC.receiveLesson({
  id: "13.1",

  lede: "Training-serving skew is the model receiving different inputs in production from the ones it learnt on, for the same underlying facts. Its most common cause is the same transformation written twice: once in a notebook or training pipeline, once in the serving code, often by a different team in a different language. Every reimplementation is a chance for a one-line difference. This lesson builds four such differences on purpose (a scaler, an imputation, a categorical encoding and a timezone), measures what each does, and shows why the usual offline metric misses most of them.",

  objectives: [
    "Explain training-serving skew and why reimplemented transforms cause it",
    "Measure the effect of four one-line skews on ranking, calibration and individual predictions",
    "Explain why AUC on live data can miss serious skew",
    "Write a parity test that compares training and serving paths feature by feature"
  ],

  prerequisites: ["1.4", "12.1"],

  blocks: [
    { t: "h2", n: "01", id: "build", text: "Four skews, built on purpose", sub: "One line each" },
    { t: "p",
      text: "A fraud model uses four inputs: the log of the amount (standardised), whether the hour is between midnight and 5 a.m. UTC, the merchant category one-hot encoded, and days since the last purchase, often missing. Training computes these one way. Four serving implementations each differ in one line: scaler constants copied from an old notebook, missing values filled with 0 instead of the training median, category codes in order of first appearance instead of alphabetical, and the hour taken from a server clock set to UTC−5." },
    { t: "code",
      lang: "python",
      title: "skew.py — the training transform and four serving reimplementations",
      code: `import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(21)

# Card transactions: amount, hour of day (UTC), merchant category, and days since last purchase (often missing).
def make(n):
    df = pd.DataFrame({"amount": rng.lognormal(3.5, 1.0, n), "hour_utc": rng.integers(0, 24, n),
                       "category": rng.choice(["electronics", "grocery", "travel", "fuel", "gaming"], n),
                       "days_since": np.where(rng.random(n) < 0.3, np.nan, rng.exponential(10, n))})
    night = ((df.hour_utc >= 0) & (df.hour_utc < 5)).astype(float)
    logit = (-4 + 0.6 * np.log(df.amount) + 1.5 * night + df.category.map({"electronics": 1.0, "gaming": 1.2, "travel": 0.6,
             "fuel": -0.3, "grocery": -0.8}) + 0.8 * df.days_since.isna() - 0.03 * df.days_since.fillna(0))
    df["fraud"] = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
    return df

train, live = make(60_000), make(20_000)

# --- Training: the transforms as the data scientist wrote them ---
mean_amt, std_amt = np.log(train.amount).mean(), np.log(train.amount).std()
med_days = train.days_since.median()
cats = sorted(train.category.unique())                                     # alphabetical codes
def features_train(df):
    return np.column_stack([(np.log(df.amount) - mean_amt) / std_amt,
                            ((df.hour_utc >= 0) & (df.hour_utc < 5)).astype(float),
                            *[(df.category == c).astype(float) for c in cats],
                            df.days_since.isna().astype(float), df.days_since.fillna(med_days)])
model = LogisticRegression(max_iter=2000).fit(features_train(train), train.fraud)

# --- Serving: reimplemented by another team, each version with one difference ---
def serving(df, bug=None):
    amt = np.log(df.amount)
    amt = (amt - 3.2) / 1.0 if bug == "scaler" else (amt - mean_amt) / std_amt          # constants copied from an old notebook
    hour = (df.hour_utc - 5) % 24 if bug == "timezone" else df.hour_utc                  # server clock in UTC-5
    order = list(dict.fromkeys(df.category)) if bug == "encoding" else cats              # order of first appearance
    fill = 0.0 if bug == "imputation" else med_days                                      # missing -> 0
    return np.column_stack([amt, ((hour >= 0) & (hour < 5)).astype(float),
                            *[(df.category == c).astype(float) for c in order],
                            df.days_since.isna().astype(float), df.days_since.fillna(fill)])

ref = model.predict_proba(features_train(live))[:, 1]
print(f"{'serving path':<26}{'AUC':>7}{'mean score':>12}{'predictions moved > 0.05':>26}")
print(f"{'same code as training':<26}{roc_auc_score(live.fraud, ref):>7.3f}{ref.mean():>12.4f}{0:>25.1%}")
for bug in ("scaler", "imputation", "encoding", "timezone"):
    p = model.predict_proba(serving(live, bug))[:, 1]
    print(f"{bug + ' reimplemented':<26}{roc_auc_score(live.fraud, p):>7.3f}{p.mean():>12.4f}{np.mean(np.abs(p - ref) > 0.05):>25.1%}")`,
      out: `serving path                  AUC  mean score  predictions moved > 0.05
same code as training       0.794      0.2815                     0.0%
scaler reimplemented        0.794      0.3100                     0.0%
imputation reimplemented    0.793      0.2931                     6.1%
encoding reimplemented      0.792      0.2814                    27.0%
timezone reimplemented      0.702      0.2809                    40.8%` },
    { t: "viz",
      title: "Share of predictions moved by more than 0.05",
      caption: "Each serving path differs from training in one line. AUC caught only the timezone; the others moved predictions while ranking held.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="190" y="31.0" text-anchor="end" class="s-label">timezone (UTC-5 clock)</text>
<rect x="200" y="14" width="349.1" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="557.1" y="31.0" class="s-sub">40.8% moved · AUC 0.702</text>
<text x="190" y="69.0" text-anchor="end" class="s-label">category order</text>
<rect x="200" y="52" width="231.0" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="439.0" y="69.0" class="s-sub">27.0% moved · AUC 0.792</text>
<text x="190" y="107.0" text-anchor="end" class="s-label">missing filled with 0</text>
<rect x="200" y="90" width="52.2" height="26" rx="4" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="260.2" y="107.0" class="s-sub">6.1% moved · AUC 0.793</text>
<text x="190" y="145.0" text-anchor="end" class="s-label">stale scaler constants</text>
<rect x="200" y="128" width="2.0" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="210.0" y="145.0" class="s-sub">0% moved · mean score +10%</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Timezone: the loud one",
          def: "Night-time was the strongest fraud signal; a five-hour clock offset moved 41% of predictions and dropped AUC from 0.794 to 0.702." },
        { term: "Encoding: large and nearly invisible",
          def: "Category codes in a different order moved 27% of predictions by more than 0.05, yet AUC fell only 0.002, because swapped categories happened to carry similar weights. Individual customers got different decisions." },
        { term: "Imputation: confined to missing rows",
          def: "Filling missing values with 0 rather than the median moved 6% of predictions, all from the 30% of rows with the value missing." },
        { term: "Scaler: a calibration shift",
          def: "Stale constants moved no prediction by more than 0.05, but lifted the mean score by 10% (0.28 to 0.31). Any threshold or expected-cost calculation shifts with it." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Checking skew with AUC",
      body: [
        { t: "p",
          text: "Three of the four skews left AUC within 0.002 of the correct path. AUC measures ranking over the population; skew changes individual predictions and calibration. Compare the serving path with the training path row by row on the same inputs, and the differences cannot hide." }
      ] },
    { t: "h2", n: "02", id: "why", text: "Why the same code ends up written twice", sub: "And what it costs" },
    { t: "table",
      head: ["Situation", "Typical one-line difference"],
      rows: [
        [
          "Training in pandas, serving in Java or Go",
          "Population vs sample standard deviation; rounding; integer division"
        ],
        [
          "Batch features in SQL, online features in a service",
          "Window boundaries; timezone; inclusive vs exclusive dates"
        ],
        ["Notebook constants copied into config", "Constants from an earlier data snapshot"],
        ["Different libraries for one-hot or hashing", "Category order; unknown-category handling; hash seed"],
        ["Missing values handled by each team", "Median vs zero vs a sentinel such as −1"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "The cure is one implementation",
      body: [
        { t: "p",
          text: "Lesson 13.4 makes it structural: ship the fitted transformation with the model as one artefact, or compute features once in a shared store, so there is only one copy to get right. Until then, a parity test on real rows is the guard." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A parity test",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Write a test that takes 1,000 live rows, computes features with the training code and with a serving implementation, and compares them column by column, reporting each column that differs, the share of rows affected and the largest difference, plus the largest difference in predicted probability. Run it on the correct serving path and on the four skewed ones." }
      ],
      requirements: [
        "The same rows through both paths",
        "A named, per-column comparison with a tolerance",
        "The prediction difference as well as feature differences",
        "A pass for the correct path and a precise failure for each skew"
      ],
      hint: "Name the output columns once, in the order the training function produces them, so a failure points at a feature rather than an index.",
      solution: { lang: "python",
        title: "parity_test.py",
        code: `import contextlib, io, runpy
import numpy as np

with contextlib.redirect_stdout(io.StringIO()):
    ns = runpy.run_path("skew.py")                              # the training code, the serving variants and live data
live, features_train, serving, model, cats = ns["live"], ns["features_train"], ns["serving"], ns["model"], ns["cats"]
COLUMNS = ["amount_z", "night"] + [f"cat={c}" for c in cats] + ["days_missing", "days_filled"]

def parity(rows, serve_fn, tol=1e-9):
    """Compare the serving path with the training path on the same rows, feature by feature and on the prediction."""
    A, B = features_train(rows), serve_fn(rows)
    report = []
    for j, name in enumerate(COLUMNS):
        diff = np.abs(A[:, j] - B[:, j])
        if diff.max() > tol: report.append(f"{name}: {np.mean(diff > tol):.0%} of rows differ, max {diff.max():.3g}")
    dp = np.abs(model.predict_proba(A)[:, 1] - model.predict_proba(B)[:, 1])
    return report, dp.max()

sample = live.sample(1_000, random_state=0)
for bug in (None, "scaler", "imputation", "encoding", "timezone"):
    report, dp = parity(sample, lambda df: serving(df, bug))
    status = "PASS" if not report else "FAIL"
    print(f"{status} serving path {('as trained' if bug is None else bug):<12} max prediction difference {dp:.3f}")
    for line in report: print(f"     {line}")`,
        out: `PASS serving path as trained   max prediction difference 0.000
FAIL serving path scaler       max prediction difference 0.045
     amount_z: 100% of rows differ, max 0.305
FAIL serving path imputation   max prediction difference 0.051
     days_filled: 28% of rows differ, max 6.87
FAIL serving path encoding     max prediction difference 0.463
     cat=electronics: 40% of rows differ, max 1
     cat=gaming: 42% of rows differ, max 1
     cat=grocery: 41% of rows differ, max 1
FAIL serving path timezone     max prediction difference 0.360
     night: 41% of rows differ, max 1`,
        notes: [
          { t: "p",
            text: "Each skew failed on exactly the column it broke: amount_z on every row for the scaler, days_filled on the 28% of the sample with missing values, three category columns for the encoding, and night for the timezone. The correct path passed with a prediction difference of 0." },
          { t: "p",
            text: "The encoding skew produced the largest single prediction change, 0.46, despite its tiny AUC effect: the test is sensitive where the metric is not. Run it in CI for every change to either path, on rows sampled from production." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: fraud alerts in the wrong hours",
      body: [
        { t: "p",
          text: "**Symptom.** After a data-centre migration, the fraud team saw night-time alert volume drop by half and a rise in alerts during the evening, with no change in fraud patterns." },
        { t: "p",
          text: "**Mechanism.** The new servers ran on local time rather than UTC. Training had computed the hour from UTC timestamps; serving read the server clock. Every transaction's hour feature moved five hours, and the model's strongest signal moved with it." },
        { t: "p",
          text: "**Fix.** Timestamps are now passed through as UTC from the source and the hour is computed by the same shared function in training and serving. A parity test on sampled production rows runs in CI and daily in production, and alerts on any feature that differs." }
      ] }
  ],

  takeaways: [
    "Training-serving skew comes most often from the **same transform written twice**.",
    "One line each: a timezone moved **41%** of predictions; category order **27%**; zero-fill **6%**; stale scaler constants shifted the mean score **10%**.",
    "Only the timezone moved AUC noticeably (**0.794 → 0.702**); three skews stayed within **0.002**.",
    "AUC measures ranking over a population; skew changes individual predictions and calibration.",
    "A parity test compares the two paths **column by column on the same rows** and names the broken feature.",
    "The encoding skew changed one prediction by **0.46** while AUC barely moved.",
    "The cure is one implementation, shipped with the model (lesson 13.4)."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why did the category-order skew barely change AUC while moving 27% of predictions?",
        options: [
          "AUC ignores categorical features entirely",
          "Swapped categories had similar weights",
          "The model never used the category feature",
          "Only 1% of rows had any category at all"
        ],
        answer: 1,
        why: "Individual predictions changed, but the population's ordering stayed similar because the swapped categories had comparable effects. AUC does include them, the model used them, and every row had a category." },
      { stem: "Stale scaler constants moved no prediction by more than 0.05. Why is it still a problem?",
        options: [
          "It makes the service slower to respond",
          "It shifts calibration: the mean score rose 10%",
          "It breaks the one-hot encoding of categories",
          "It causes the model to raise exceptions on some rows"
        ],
        answer: 1,
        why: "Thresholds and expected-cost decisions use the probability, and the scores rose from 0.28 to 0.31 on average. Speed, encoding and exceptions are unaffected." },
      { stem: "What does a parity test compare?",
        options: [
          "Offline AUC against online AUC on a weekly schedule",
          "Training and serving features on the same rows",
          "The model file's hash against the registry",
          "Request rates between training and production"
        ],
        answer: 1,
        why: "Same rows through both paths, column by column, catches each skew precisely. AUC comparisons miss most of them, and hashes or request rates say nothing about transforms." },
      { stem: "Which skew affected only rows with a particular property?",
        options: [
          "The stale scaler constants on amount",
          "Zero-filling the missing values",
          "The timezone offset on the hour",
          "The category codes in a new order"
        ],
        answer: 1,
        why: "Imputation only touches rows where the value is missing (28% of the sample). The scaler changed every row, and the timezone and encoding affected large shares across the board." }
    ] },

  interview: { title: "In an interview",
    sub: "Skew answers should end with a test, not a promise to be careful.",
    questions: [
      { level: "core",
        q: "What is training-serving skew and how does it happen?",
        strong: "A strong answer gives concrete mechanisms and how to detect each.",
        answer: [
          { t: "p",
            text: "The model's inputs in production differ from what training computed for the same entity and time. Mechanisms: transforms reimplemented in serving (constants, imputation, encoding order, standard-deviation conventions), different data sources for the same feature (batch SQL against an online service), time handling (timezones, window boundaries), and library or version differences (lesson 13.3). Detection is a parity test on real rows and comparison of feature distributions across the boundary." }
        ] },
      { level: "core",
        q: "Offline AUC on recent data matches training. Can you rule out skew?",
        strong: "A strong answer explains why not and what to check instead.",
        answer: [
          { t: "p",
            text: "No, if the offline evaluation uses the training transforms, it never exercises the serving path. And even scored through serving, AUC can hide skew: three one-line skews here left AUC within 0.002 while moving up to 27% of predictions or shifting calibration. Compare serving and training features row by row, and log served features so they can be compared with what the training pipeline computes for the same rows." }
        ] },
      { level: "advanced",
        q: "Your serving stack is Java and training is Python. How do you avoid skew?",
        strong: "A strong answer removes the second implementation or tests it exhaustively.",
        answer: [
          { t: "p",
            text: "Prefer one implementation: export the fitted preprocessing and model together to a portable format such as ONNX, or compute features in one place (a feature store or a shared service) consumed by both. If two implementations are unavoidable, generate the serving constants from the fitted training artefact rather than copying them, and run a parity test on thousands of real rows in CI, with tolerance per column, on every change to either side." }
        ] }
    ] }
});
