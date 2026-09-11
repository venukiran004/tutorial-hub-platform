/* ============================================================================
   LESSON 8.4 — Splitting Data Honestly
   ========================================================================= */
EC.receiveLesson({
  id: "8.4",

  lede: "**A split is a claim about how the model will be used.** A random split claims tomorrow's rows are interchangeable with today's and that every customer will already have been seen. If the model will score new customers, the split must hold out customers; if it will score next month, the split must hold out time; if both, both. The wrong split does not fail — it reports a higher number, which is worse.",

  objectives: [
    "Match the split to the deployment: who will be scored, when, and whether they have been seen before",
    "Stratify for rare classes and quantify how noisy a single holdout estimate is",
    "Use group splits when rows share an entity, and know when a random split is the right answer",
    "Use time-based splits with a gap, and choose between expanding and sliding windows",
    "Use nested cross-validation to tune and estimate without the tuning inflating the estimate"
  ],

  prerequisites: ["8.3"],

  blocks: [

    { t: "h2", n: "01", text: "What a split claims", id: "claims" },

    { t: "p", text: "Held-out rows estimate performance on rows the model has not seen. **The estimate is only worth anything if the held-out rows resemble the rows the model will meet in production in every way that matters** — same entities or new ones, same period or a later one, same class balance or a different one. Each split type encodes one of those assumptions, and choosing is a question about the deployment, not about the data." },

    { t: "dl", items: [
      ["Holdout", "One random partition into train and test. Cheap, and a single draw: on small data the estimate moves by several points between seeds."],
      ["Stratified split", "A partition that preserves the class proportions in every part. Essential when a class is rare; otherwise a test set can hold three positives, or none."],
      ["Group split", "A partition by entity — every row of a customer, patient or device lands on one side. Estimates performance on entities never seen."],
      ["Time-based split", "Training rows precede test rows. Estimates performance on a later period, which is the only period a deployed model ever sees."],
      ["Gap (embargo)", "Rows between the end of training and the start of testing that are excluded from both. Needed when labels or features are computed over a window, so the last training labels do not depend on test-period events."],
      ["k-fold cross-validation", "k partitions, each used once as the test part. The mean is the estimate; the spread across folds is its uncertainty, and it should always be reported with the mean."],
      ["Nested cross-validation", "An inner loop that tunes inside each outer training fold, and an outer loop that scores the result on rows the tuning never saw. Estimates the whole procedure, not one setting."],
      ["Validation set", "Rows used to make choices — hyperparameters, features, thresholds. The test set is not consulted for choices; the moment it is, it becomes a validation set."]
    ]},

    { t: "viz",
      title: "Four splits of the same twenty rows",
      caption: "Random: rows shuffled, entities and time ignored. Stratified: the positives (marked) are shared out in proportion. Group: whole entities held out. Time: the last rows held out, with a gap. Each answers a different question.",
      svg: `<svg viewBox="0 0 880 330" role="img" aria-label="Four rows of twenty tiles showing random, stratified, group and time-based splits; training tiles are muted, test tiles accented, positives marked with a dot, groups labelled by letter, and a gap shown in the time split.">
  <g class="s-label" style="font-weight:600">
    <text x="30" y="52">Random</text>
    <text x="30" y="122">Stratified</text>
    <text x="30" y="192">Group</text>
    <text x="30" y="262">Time</text>
  </g>
  <g class="s-sub">
    <text x="30" y="70">rows are iid</text>
    <text x="30" y="140">class is rare</text>
    <text x="30" y="210">rows share entities</text>
    <text x="30" y="280">rows are ordered</text>
  </g>
  <!-- random -->
  <g stroke-width="1">
    <rect x="200" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="232" y="36" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="264" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="296" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="328" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="360" y="36" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="392" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="424" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="456" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="488" y="36" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/>
    <rect x="520" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="552" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="584" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="616" y="36" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="648" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="680" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="712" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="744" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="776" y="36" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="808" y="36" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
  </g>
  <!-- stratified: positives at tiles 3, 9, 14, 18 (dots); test gets one of them -->
  <g stroke-width="1">
    <rect x="200" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="232" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="264" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="296" y="106" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="328" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="360" y="106" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="392" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="424" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="456" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="488" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="520" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="552" y="106" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="584" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="616" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="648" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="680" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="712" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="744" y="106" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="776" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="808" y="106" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
  </g>
  <g style="fill:var(--crit)">
    <circle cx="310" cy="120" r="4"/><circle cx="502" cy="120" r="4"/><circle cx="662" cy="120" r="4"/><circle cx="790" cy="120" r="4"/>
  </g>
  <!-- group: A A A A  B B B B  C C C C  D D D D  E E E E ; test = C and E -->
  <g stroke-width="1">
    <rect x="200" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="232" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="264" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="296" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="328" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="360" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="392" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="424" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="456" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="488" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="520" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="552" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/>
    <rect x="584" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="616" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="648" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="680" y="176" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="712" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="744" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="776" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="808" y="176" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="262" y="225">A</text><text x="390" y="225">B</text><text x="518" y="225" style="fill:var(--accent);font-weight:600">C</text><text x="646" y="225">D</text><text x="774" y="225" style="fill:var(--accent);font-weight:600">E</text>
  </g>
  <!-- time: first 14 train, 2 gap, last 4 test -->
  <g stroke-width="1">
    <rect x="200" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="232" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="264" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="296" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="328" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="360" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="392" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="424" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="456" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="488" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="520" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="552" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="584" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/><rect x="616" y="246" width="28" height="28" rx="4" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="648" y="246" width="28" height="28" rx="4" style="fill:none;stroke:var(--warn)" stroke-dasharray="3 3"/><rect x="680" y="246" width="28" height="28" rx="4" style="fill:none;stroke:var(--warn)" stroke-dasharray="3 3"/>
    <rect x="712" y="246" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="744" y="246" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="776" y="246" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/><rect x="808" y="246" width="28" height="28" rx="4" style="fill:var(--accent);fill-opacity:.6"/>
  </g>
  <text x="678" y="295" class="s-sub" text-anchor="middle" style="fill:var(--warn)">gap</text>
  <text x="200" y="318" class="s-sub">time →</text>
  <g class="s-sub">
    <rect x="620" y="306" width="14" height="14" rx="3" style="fill:var(--ink-4);fill-opacity:.25"/><text x="640" y="318">train</text>
    <rect x="690" y="306" width="14" height="14" rx="3" style="fill:var(--accent);fill-opacity:.6"/><text x="710" y="318">test</text>
    <circle cx="767" cy="313" r="4" style="fill:var(--crit)"/><text x="778" y="318">positive</text>
  </g>
</svg>`
    },

    { t: "h2", n: "02", text: "Random and stratified, and how noisy one holdout is", id: "random" },

    { t: "p", text: "When rows really are independent and the deployment scores the same population in the same period, a shuffled split is correct. Two things still go wrong. **A rare class ends up unevenly shared** — a 5 % positive rate and a 120-row test set can give three positives or eleven, by luck — and `stratify=y` fixes it. And **one holdout is one draw**: the number it produces has a standard error that on small data is larger than most of the differences people act on." },

    { t: "code", lang: "python", title: "Stratify, then count how much a single split moves",
      hl: [13, 18, 25, 26],
      code: `import numpy as np
import pandas as pd
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=600, n_features=12, n_informative=4, weights=[0.95], random_state=0)
print(y.mean().round(3))                        # 0.055  -- 33 positives in 600 rows

for seed in range(4):
    _, X_te, _, y_te = train_test_split(X, y, test_size=0.2, random_state=seed)
    print(int(y_te.sum()), end=" ")             # 3 9 5 11   <- the test set has between 3 and 11 positives
print()
for seed in range(4):
    _, X_te, _, y_te = train_test_split(X, y, test_size=0.2, random_state=seed, stratify=y)
    print(int(y_te.sum()), end=" ")             # 7 7 6 7
print()

# one split is one draw: the same model, eight stratified holdouts
scores = []
for seed in range(8):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=seed, stratify=y)
    m = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)
    scores.append(roc_auc_score(y_te, m.predict_proba(X_te)[:, 1]))
print(np.round(scores, 2))          # [0.81 0.9  0.74 0.87 0.79 0.93 0.83 0.77]
# with seven positives in the test set, the AUC moves by 0.19 between seeds. One holdout is a rumour.`,
      caption: "**Same data, same model, eight seeds: AUC from 0.74 to 0.93.** The stratification fixed the class count; nothing fixes the fact that seven positives cannot pin down a rank statistic. Report the spread, or use every row through cross-validation."
    },

    { t: "table",
      head: ["Positives in the test set", "Standard error of AUC (AUC ≈ 0.8, 10 : 1 negatives)", "Difference you can resolve"],
      rows: [
        ["10", "≈ 0.09", "Nothing under 0.2"],
        ["30", "≈ 0.05", "0.80 versus 0.90, barely"],
        ["100", "≈ 0.03", "0.80 versus 0.86"],
        ["300", "≈ 0.016", "0.80 versus 0.83"],
        ["1,000", "≈ 0.009", "0.80 versus 0.82"]
      ]
    },

    { t: "p", text: "The table is the reason 'model B is better, 0.83 versus 0.81' is a statement about the seed as often as about the model. **Cross-validation uses every row as a test row once and reports a mean with a spread; repeated cross-validation shrinks the spread further.** When the test set is small, report the interval, and if the interval covers both candidates, say so." },

    { t: "h2", n: "03", text: "Group splits: who, not what", id: "group" },

    { t: "p", text: "Rows that share a customer, a patient, a machine or a session are not independent. A model with enough capacity learns the entity — from an ID column, or from the near-unique combination of age, region and plan that every row of that customer carries — and a random split then tests whether it remembers, not whether it generalises. **If the deployment will score entities the model has never seen, every row of an entity must be on one side.**" },

    { t: "code", lang: "python", title: "The random split remembers the customer",
      hl: [10, 15, 16, 20],
      code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import KFold, GroupKFold, cross_val_score

rng = np.random.default_rng(0)
cust = np.repeat(np.arange(300), 10)                   # 300 customers, 10 rows each
u = rng.normal(0, 1.5, 300)[cust]                       # a customer-level effect on the label
Z = rng.normal(0, 1, (3000, 5))
yg = (u + Z[:, 0] + 0.5 * Z[:, 1] + rng.logistic(0, 1, 3000) > 0).astype(int)
# customer-level columns: constant per customer, and together almost a fingerprint
fp = pd.DataFrame({"age": rng.integers(18, 80, 300), "region": rng.integers(0, 40, 300),
                   "plan": rng.integers(0, 6, 300)}).iloc[cust].reset_index(drop=True)
Xg = pd.concat([pd.DataFrame(Z, columns=list("abcde")), fp], axis=1)

rf = RandomForestClassifier(300, random_state=0, n_jobs=-1)
print(cross_val_score(rf, Xg, yg, cv=KFold(5, shuffle=True, random_state=0), scoring="roc_auc").mean().round(3))   # 0.83
print(cross_val_score(rf, Xg, yg, cv=GroupKFold(5), groups=cust, scoring="roc_auc").mean().round(3))                # 0.74

# the random split answered: how well do we predict for customers we have already seen?
# the group split answered:  how well do we predict for a customer we have never seen?
# if the deployment scores existing customers, the random number is the right one --
# provided each customer's rows are split by time, not shuffled (next section).`,
      caption: "**0.83 shuffled, 0.74 by customer.** The forest read the fingerprint columns, learnt each customer's latent effect, and was marked correct on that customer's other rows. Neither number is wrong; they answer different questions, and the deployment decides which was asked."
    },

    { t: "callout", kind: "tradeoff", title: "Group split or not is a deployment question", body: [
      { t: "p", text: "A churn model scoring the existing customer base next month will see customers it trained on — a group split would be pessimistic. A model scoring *new* applicants will not — a random split is optimistic by however much the entity can be memorised. **Ask who will be scored. Then, for the existing-customer case, ask whether each customer's own rows were ordered in time, because a shuffled split within a customer lets next month's row train this month's.** `StratifiedGroupKFold` keeps class balance when groups are small and the class is rare." }
    ]},

    { t: "h2", n: "04", text: "Time-based splits", id: "time" },

    { t: "p", text: "A deployed model predicts the future from the past, so the estimate must too. `TimeSeriesSplit` walks forward: each fold trains on everything before a point and tests on the next block. Two settings matter and both default to wrong. **`gap`** excludes rows between train and test — needed whenever labels or features are computed over a window, so that the last training labels do not depend on events inside the test block. **`max_train_size`** turns the expanding window into a sliding one, which is the right choice when old rows describe a relationship that no longer holds." },

    { t: "code", lang: "python", title: "Walk-forward with a gap, and expanding versus sliding under drift",
      hl: [4, 10, 19, 20, 21],
      code: `from sklearn.model_selection import TimeSeriesSplit

idx = np.arange(24)                                                     # 24 months
for tr, te in TimeSeriesSplit(n_splits=4, test_size=3, gap=1).split(idx):
    print(f"train {tr[0]:2d}-{tr[-1]:2d}   gap {tr[-1] + 1:2d}   test {te[0]:2d}-{te[-1]:2d}")
# train  0-10   gap 11   test 12-14
# train  0-13   gap 14   test 15-17
# train  0-16   gap 17   test 18-20
# train  0-19   gap 20   test 21-23
# gap = the label horizon (+ the feature window): a 30-day label needs one month of embargo

# rows ordered in time, with drift: the first column's effect decays and flips sign
n = 4_000
t = np.arange(n)
Xt = rng.normal(0, 1, (n, 4))
beta = 1.0 - 1.5 * t / n
yt = (beta * Xt[:, 0] + 0.6 * Xt[:, 1] + rng.logistic(0, 1, n) > 0).astype(int)
lr = LogisticRegression()
print(cross_val_score(lr, Xt, yt, cv=KFold(5, shuffle=True, random_state=0), scoring="roc_auc").mean().round(3))  # 0.66
print(cross_val_score(lr, Xt, yt, cv=TimeSeriesSplit(5), scoring="roc_auc").mean().round(3))                     # 0.58
print(cross_val_score(lr, Xt, yt, cv=TimeSeriesSplit(5, max_train_size=800), scoring="roc_auc").mean().round(3)) # 0.63
# shuffled:  future rows taught the model where the relationship was heading -- not available live
# expanding: honest, and the oldest rows drag the fit towards a relationship that no longer holds
# sliding:   honest and recent; the window length is a hyperparameter, tuned on earlier folds`,
      caption: "**Shuffled 0.66, expanding 0.58, sliding 0.63.** The shuffled number is unreachable in production — it needed rows from after each test row. Between the two honest numbers, the sliding window wins because the relationship moved; how far back to look is a choice to tune, on folds before the one you report."
    },

    { t: "p", text: "The final report comes from the last fold, or from the mean over folds with the spread — never from a shuffled split on time-ordered data. And **the very last block of time is a holdout the tuning never touches**: choose the window, the features and the hyperparameters on earlier folds, then score once on the end." },

    { t: "h2", n: "05", text: "Cross-validation, nested", id: "nested" },

    { t: "p", text: "Tuning is a fit. A grid search that tries twenty settings and keeps the best has been fit to its validation folds — and the best of twenty noisy numbers is biased upwards. **Nested cross-validation puts the search inside each outer training fold and scores the chosen setting on an outer test fold that the search never saw.** The outer mean estimates what the *procedure* — search plus fit — delivers on new rows, which is the thing you are going to ship." },

    { t: "viz",
      title: "Nested cross-validation",
      caption: "Each outer fold holds out a block. Inside the remaining rows, an inner loop tunes. The chosen setting is refit on all inner rows and scored once on the outer block. The outer mean is the estimate; the final model is the search rerun on everything.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Diagram of nested cross-validation: an outer row of five blocks with one held out, an inner row beneath it splitting the remaining four into five inner folds for tuning, and an arrow from the chosen setting to the outer held-out block for scoring.">
  <text x="30" y="40" class="s-label" style="font-weight:600">Outer fold 1 of 5</text>
  <g stroke-width="1">
    <rect x="30" y="54" width="150" height="34" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="190" y="54" width="150" height="34" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="350" y="54" width="150" height="34" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="510" y="54" width="150" height="34" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="670" y="54" width="150" height="34" rx="5" style="fill:var(--accent);fill-opacity:.6"/>
  </g>
  <text x="745" y="76" class="s-label" text-anchor="middle" style="font-weight:600">outer test</text>
  <text x="345" y="76" class="s-sub" text-anchor="middle">outer train — the search sees only these</text>

  <path d="M345,90 L345,126" style="stroke:var(--ink-3)" stroke-width="1.5"/>
  <text x="30" y="122" class="s-label" style="font-weight:600">Inner loop · tune on the outer train rows</text>
  <g stroke-width="1">
    <rect x="30" y="134" width="120" height="30" rx="5" style="fill:var(--warn);fill-opacity:.55"/>
    <rect x="158" y="134" width="120" height="30" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="286" y="134" width="120" height="30" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="414" y="134" width="120" height="30" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
    <rect x="542" y="134" width="120" height="30" rx="5" style="fill:var(--ink-4);fill-opacity:.25"/>
  </g>
  <text x="90" y="154" class="s-sub" text-anchor="middle">inner val</text>
  <text x="30" y="188" class="s-sub">… × 5 inner folds × every grid setting → pick the best mean</text>

  <rect x="30" y="206" width="330" height="40" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good)" stroke-width="1"/>
  <text x="46" y="231" class="s-label" style="fill:var(--good);font-weight:600">refit best setting on all outer-train rows</text>
  <path d="M360,226 C520,226 600,110 668,86" fill="none" style="stroke:var(--good)" stroke-width="2" stroke-dasharray="5 4"/>
  <text x="560" y="200" class="s-sub" style="fill:var(--good)">score once, on rows the search never saw</text>

  <text x="30" y="282" class="s-sub">Repeat for outer folds 2–5. Mean ± spread of the five outer scores = the estimate of the whole procedure.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "Non-nested is optimistic; nested is what you can promise",
      hl: [9, 10, 11],
      code: `from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.svm import SVC

grid = {"C": [0.01, 0.1, 1, 10, 100], "gamma": [1e-3, 1e-2, 1e-1, 1]}
inner = StratifiedKFold(5, shuffle=True, random_state=1)
outer = StratifiedKFold(5, shuffle=True, random_state=2)

search = GridSearchCV(SVC(probability=True), grid, cv=inner, scoring="roc_auc")
print(search.fit(X, y).best_score_.round(3))                                      # 0.89
print(cross_val_score(search, X, y, cv=outer, scoring="roc_auc").mean().round(3))   # 0.85
# 0.89 is the best of twenty tries on the folds that chose it. 0.85 is what choosing-then-fitting
# delivers on rows that took no part in the choice -- the number to report.

final = search.fit(X, y).best_estimator_     # the model to ship: the search rerun on everything
# report the nested 0.85 alongside it. The setting may differ between outer folds; that is
# information about how stable the choice is, not a problem to hide.`,
      caption: "**Best-of-grid 0.89, nested 0.85.** With 33 positives, four points of optimism from twenty tries is unremarkable. The nested number is an estimate of the procedure, and the procedure — not one lucky setting — is what gets rerun on all the data and shipped."
    },

    { t: "callout", kind: "production", title: "Which rows are the test set, and who has looked at them", body: [
      { t: "p", text: "Keep a record. The final holdout — the last months, or the held-out customer groups — is scored once when the work is finished. Every earlier decision, including which features to keep, which split to use and which threshold to set, is made on validation folds inside the training rows. **If the holdout number was consulted in a decision, write that down and treat the number as a validation score.** The next lesson makes fit-on-train-only structural; this one is about the rows." }
    ]},

    { t: "ladder",
      title: "Evaluating a transaction-fraud model",
      rungs: [
        { level: "bad", label: "Shuffled holdout", code: `X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=0)`,
          note: "**Fraud is 0.3 % of rows, accounts recur, and the patterns change monthly.** The test set may hold a handful of positives, the model memorises accounts, and next month's fraud is in the training set. The number is high and means nothing." },
        { level: "ok", label: "Stratified, grouped by account", code: `cv = StratifiedGroupKFold(5, shuffle=True, random_state=0)
cross_val_score(model, X, y, cv=cv, groups=account_id, scoring="average_precision")`,
          note: "**Positives shared out, accounts on one side.** Still shuffled in time: the model trains on next month's fraud patterns and is tested on this month's. Under drift the estimate is optimistic." },
        { level: "best", label: "Walk-forward with a gap, tuned on earlier folds, scored on the last", code: `cv = TimeSeriesSplit(n_splits=6, gap=chargeback_horizon_rows)
search = GridSearchCV(pipe, grid, cv=cv, scoring="average_precision")   # tunes on folds 1-5
# final estimate: fit on everything before the last block, score once on it`,
          note: "**Trains on the past, tests on the future, with the chargeback window embargoed.** Accounts recur in production, so the split by time within accounts is the honest one; new-account performance is reported separately on a grouped slice of the last block." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "The split that matches the deployment",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "Build a dataset where customers recur, carry fingerprint columns, join at different times, and where the relationship drifts. Estimate the same model under a shuffled split, a stratified split, a group split, a walk-forward split, and a custom split that holds out *future rows of unseen customers*. Print the five estimates with their spread." },
        { t: "p", text: "Write `choose_split(deploy_on, ordered_in_time)` that returns the right splitter for each deployment and assert the ordering of the estimates: shuffled is highest, and the future-unseen split is no higher than either the group or the time split." }
      ],
      requirements: [
        "A customer-level effect and fingerprint columns, so a random split can memorise.",
        "A drifting coefficient, so a shuffled split can see the future.",
        "Five estimates: KFold, StratifiedKFold, GroupKFold, TimeSeriesSplit, and a custom future-unseen generator usable by `cross_val_score`.",
        "`choose_split` covering the four deployment cases.",
        "Assertions on the ordering of estimates."
      ],
      hint: "A custom splitter can be a list of `(train_idx, test_idx)` tuples — `cross_val_score` accepts any iterable of splits. For future-unseen: for each cut in time, train on rows before it, test on rows after it whose customer never appeared before it.",
      solution: {
        lang: "python",
        title: "split_choice.py",
        code: `import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import KFold, StratifiedKFold, GroupKFold, TimeSeriesSplit, cross_val_score

rng = np.random.default_rng(5)
n_cust, per = 400, 12
cust = np.repeat(np.arange(n_cust), per)
t = np.tile(np.arange(per), n_cust) + rng.integers(0, 12, n_cust)[cust]   # customers join in different months
u = rng.normal(0, 1.2, n_cust)[cust]                                        # customer-level effect
fp = pd.DataFrame({"age": rng.integers(18, 80, n_cust), "region": rng.integers(0, 50, n_cust),
                   "plan": rng.integers(0, 5, n_cust)}).iloc[cust].reset_index(drop=True)
Z = rng.normal(0, 1, (len(cust), 3))
drift = 1.0 - 1.2 * t / t.max()                                             # z0's effect decays and flips
y = (u + drift * Z[:, 0] + 0.6 * Z[:, 1] + rng.logistic(0, 1, len(cust)) > 0).astype(int)

df = pd.concat([pd.DataFrame(Z, columns=["z0", "z1", "z2"]), fp], axis=1)
df["cust"], df["t"], df["y"] = cust, t, y
df = df.sort_values("t", kind="stable").reset_index(drop=True)             # time order, for the walk-forward
X, y = df.drop(columns=["cust", "t", "y"]), df.y
groups, t = df.cust.values, df.t.values

model = lambda: RandomForestClassifier(200, min_samples_leaf=2, random_state=0, n_jobs=-1)

def estimate(cv, groups=None):
    s = cross_val_score(model(), X, y, cv=cv, groups=groups, scoring="roc_auc")
    return round(s.mean(), 3), round(s.std(), 3)

def future_unseen(t, groups, cuts):
    """Train on rows before the cut; test on rows after it whose customer never appeared before it."""
    for c in cuts:
        seen = np.unique(groups[t < c])
        tr = np.where(t < c)[0]
        te = np.where((t >= c) & ~np.isin(groups, seen))[0]
        if len(te) >= 40:
            yield tr, te

results = {
    "shuffled (KFold)":         estimate(KFold(5, shuffle=True, random_state=0)),
    "stratified":               estimate(StratifiedKFold(5, shuffle=True, random_state=0)),
    "group (by customer)":      estimate(GroupKFold(5), groups=groups),
    "time (walk-forward)":      estimate(TimeSeriesSplit(5)),
    "future rows, new customers": estimate(list(future_unseen(t, groups, cuts=[12, 14, 16, 18]))),
}
for k, (m, s) in results.items():
    print(f"{k:28s} {m:.3f} ± {s:.3f}")
# shuffled (KFold)             0.842 ± 0.010
# stratified                   0.841 ± 0.009
# group (by customer)          0.741 ± 0.018
# time (walk-forward)          0.712 ± 0.031
# future rows, new customers   0.655 ± 0.027

def choose_split(deploy_on, ordered_in_time):
    """deploy_on: 'seen entities' or 'new entities'."""
    if deploy_on == "new entities" and ordered_in_time:
        return "future rows of unseen entities (custom generator)"
    if deploy_on == "new entities":
        return "GroupKFold / StratifiedGroupKFold"
    if ordered_in_time:
        return "TimeSeriesSplit with gap = label horizon"
    return "StratifiedKFold, shuffled"

for case in [("seen entities", False), ("seen entities", True), ("new entities", False), ("new entities", True)]:
    print(case, "->", choose_split(*case))

# --- assertions -------------------------------------------------------------
m = {k: v[0] for k, v in results.items()}
assert m["shuffled (KFold)"] > m["group (by customer)"] + 0.03,   "shuffled must be inflated by memorisation"
assert m["shuffled (KFold)"] > m["time (walk-forward)"] + 0.03,   "shuffled must be inflated by seeing the future"
assert m["future rows, new customers"] <= min(m["group (by customer)"], m["time (walk-forward)"]) + 0.02, \\
    "the split that removes both advantages cannot score above either single one"
print("report the estimate from the split that matches the deployment; the shuffled number is the ceiling, not the forecast")`,
        notes: [
          { t: "p", text: "**0.84 shuffled, 0.74 by customer, 0.71 by time, 0.66 for new customers in the future.** Each number is correct for its question. The shuffled split had both advantages — it remembered customers and it saw the future — and the custom split had neither, which is the situation a model scoring new sign-ups next quarter is actually in." },
          { t: "p", text: "**The spread grows as the split gets honest**: walk-forward folds differ in period and in size, and the future-unseen folds differ in how many new customers each cut has. That spread is real information about how variable the deployment will be, and belongs in the report." },
          { t: "p", text: "**`choose_split` is four lines, and it is the decision most evaluations skip.** The ordering assertion is the regression test: if a change to the data or features ever makes the honest split score above the shuffled one, something has leaked." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A model will score the existing customer base every month. Rows are one per customer per month. Which split gives the honest estimate?",
          options: [
            "GroupKFold by customer — customers must never be on both sides",
            "A time-based split, with each customer's later rows in the test part, and a gap equal to the label horizon; customers recur in production, so holding them out would be pessimistic",
            "A shuffled stratified split",
            "Leave-one-customer-out"
          ],
          answer: 1,
          why: "Who will be scored: customers already seen. When: later. So the split holds out time, not customers. A group split answers a different question — new customers — and would understate performance; a shuffled split lets next month's row train this month's and overstates it."
        }
      ]
    }
  ],

  takeaways: [
    "**A split is a claim about the deployment**: who will be scored, when, and whether they have been seen. Choose the split by answering those, not by habit.",
    "**Stratify when a class is rare** — otherwise the test set's positive count is a lottery.",
    "**One holdout is one draw.** With seven positives the AUC moves by 0.2 between seeds; with 100 the standard error is still 0.03. Report the spread.",
    "**Rows that share an entity are not independent**; a model reads the fingerprint columns and a shuffled split tests memory. `GroupKFold` tests generalisation to new entities.",
    "**A group split is right for new entities and pessimistic for seen ones** — and for seen ones, each entity's rows must still be ordered in time.",
    "**Time-based splits train on the past and test on the future**, which is the only direction a deployed model ever faces.",
    "**`gap` = the label horizon plus the feature window**; without it the last training labels depend on test-period events.",
    "**Expanding versus sliding window is a drift question**: old rows help when the relationship is stable and hurt when it has moved. The window length is tuned on earlier folds.",
    "**Tuning is a fit; the best of twenty tries is biased upwards.** Nested cross-validation scores the chosen setting on rows the choice never saw.",
    "**Nested CV estimates the procedure**, and the procedure is what you rerun on all data and ship.",
    "**The final holdout is read once.** Every decision before it is made on validation folds inside the training rows, and any look at the holdout turns it into a validation set.",
    "**The honest split scores lower than the shuffled one, and if it ever does not, something leaked** — the ordering is a regression test."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A random forest scores 0.83 under shuffled 5-fold and 0.74 under GroupKFold by customer. The features include age, region and plan, constant per customer. What explains the gap?",
        options: [
          "GroupKFold uses less training data",
          "The customer-level columns act as a fingerprint; the forest learnt each customer's effect and was scored on that customer's other rows under the shuffled split",
          "The group split is biased",
          "The forest is underfitting"
        ],
        answer: 1,
        why: "Rows of one customer share a latent effect and a near-unique combination of static columns. Shuffled folds put the same customer on both sides, so the model is rewarded for memory. Which number is right depends on whether production scores seen or new customers."
      },
      {
        stem: "Why does `TimeSeriesSplit` need a `gap` when the label is 'default within 90 days'?",
        options: [
          "To make the folds equal in size",
          "Because a training row in the last 90 days before the test block has a label determined by events inside the test block — an embargo of the label horizon removes that overlap",
          "To leave room for the validation set",
          "It does not; gap is for feature windows only"
        ],
        answer: 1,
        why: "Labels computed over a forward window reach into the future by that window's length. Training rows whose window overlaps the test period carry test-period information; the gap excludes them. Feature windows that look backwards add to the required gap in the other direction."
      },
      {
        stem: "A grid search over twenty settings reports `best_score_` 0.89. Nested CV over the same search reports 0.85. Which number do you report and why?",
        options: [
          "0.89 — it is the model's score",
          "0.85 — the best of twenty noisy numbers is biased upwards, and 0.85 is what the choose-then-fit procedure delivers on rows that took no part in the choice",
          "The average of the two",
          "0.89, with 0.85 as a footnote"
        ],
        answer: 1,
        why: "Selecting the maximum of noisy estimates selects noise as well as signal. The outer loop scores each chosen setting on a fold the search never saw, and that mean is the honest estimate of the procedure you are going to rerun on all the data."
      },
      {
        stem: "Under drift, an expanding-window walk-forward scores 0.58 and a sliding window of 800 rows scores 0.63. What does that tell you?",
        options: [
          "The sliding window is leaking",
          "Old rows describe a relationship that no longer holds and drag the expanding fit towards it; recency helps, and the window length is a hyperparameter to tune on earlier folds",
          "Use a shuffled split instead — it scores 0.66",
          "The model needs more features"
        ],
        answer: 1,
        why: "Both are honest — each trains only on the past. The difference is how much past. The shuffled 0.66 is not a candidate: it used rows from after each test row. Choose the window on validation folds and confirm on the last block."
      },
      {
        stem: "With 5 % positives and 600 rows, eight stratified holdouts give AUCs from 0.74 to 0.93 for the same model. What is the correct conclusion?",
        options: [
          "The model is unstable",
          "The estimate is: seven positives in a test set cannot pin down a rank statistic, so a single holdout is uninformative — use cross-validation and report the spread",
          "Increase the test size to 50 %",
          "Use accuracy instead"
        ],
        answer: 1,
        why: "The model is identical across seeds; the test set is what changes. AUC's standard error with a handful of positives is close to 0.1. Cross-validation uses every row as a test row once; repeated CV tightens it further; and the interval belongs next to the number."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you decide between a random, grouped and time-based split?",
        strong: "I ask two questions about the deployment. Will the model score entities it has trained on, or new ones? If new, every row of an entity goes on one side — GroupKFold, or StratifiedGroupKFold when the class is rare. Is the data ordered in time and will the model score a later period? If so, train on the past and test on the future with TimeSeriesSplit, with a gap equal to the label horizon, and I choose expanding versus sliding by whether the relationship drifts. If both — new entities, later period — I build a custom split that holds out future rows of unseen entities. Only when rows are genuinely exchangeable and the population is the same do I shuffle, stratified. And I check the ordering: the honest split should score below the shuffled one; if it does not, something leaked.",
        answer: [
          { t: "p", text: "The two questions, the combined case, and the ordering check — that is the whole decision procedure, stated in a minute." }
        ]
      },
      {
        level: "expert",
        q: "Explain nested cross-validation and when you can skip it.",
        strong: "A grid search picks the best of many noisy validation scores, so its best_score_ is biased upwards. Nested CV runs the search inside each outer training fold and scores the chosen setting on an outer test fold the search never saw; the outer mean estimates what the search-and-fit procedure delivers, and that procedure is what I rerun on all data and ship. I can skip it when the grid is tiny and the data is large, because the optimism is a few noisy maxima over a well-estimated score — the gap shrinks with more rows and fewer settings. With small data, rare positives, or a large grid, the gap is several points and I would not report the inner score.",
        answer: [
          { t: "p", text: "Knowing what the nested estimate is an estimate of — the procedure — and when the correction is negligible is the expert version." }
        ]
      },
      {
        level: "expert",
        q: "Your holdout AUC is 0.81 on 60 positives. Product asks whether it beats the current model at 0.79. What do you say?",
        strong: "That the difference is inside the noise. With 60 positives the standard error of an AUC near 0.8 is about 0.035, so 0.81 versus 0.79 is well under one standard error — the seed could reverse it. To answer the question I would score both models on the same folds with repeated cross-validation and compare paired differences, and if the data is time-ordered, on the same walk-forward blocks. If the paired difference is consistently positive across folds I would say the new model is probably better and by how much; if it flips, I would say we cannot distinguish them on this data and the decision should rest on other grounds — cost, simplicity, stability.",
        answer: [
          { t: "p", text: "Quantifying the noise, proposing a paired comparison, and being willing to say 'we cannot tell' is what an honest answer looks like." }
        ]
      }
    ]
  }
});
