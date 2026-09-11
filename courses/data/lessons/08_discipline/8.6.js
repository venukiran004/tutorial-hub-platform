/* ============================================================================
   LESSON 8.6 — Imbalanced Data
   ========================================================================= */
EC.receiveLesson({
  id: "8.6",

  lede: "**Most imbalance problems are threshold problems wearing a disguise.** A model trained on 2 % positives produces probabilities near 0.02, the default cut at 0.5 flags almost nothing, and the reflex is to resample until the classes are even — which changes what the probabilities mean, rarely improves the ranking, and, done before the split, plants synthetic copies of validation rows in the training set. Move the threshold first. Weight second. Resample last, inside the fold, and evaluate at the base rate the world actually has.",

  objectives: [
    "Explain what imbalance breaks — accuracy and the default threshold — and what it does not — the model's ranking",
    "Read precision–recall against ROC and choose metrics that reflect the base rate",
    "Choose a threshold from validation predictions by a cost matrix or a required recall",
    "Use class weights and know what they do to the probability scale",
    "Apply SMOTE inside the fold only, and measure the leak when it is applied before the split"
  ],

  prerequisites: ["8.4", "8.5"],

  blocks: [

    { t: "h2", n: "01", text: "What imbalance breaks", id: "breaks" },

    { t: "p", text: "With 2 % positives, a model that says 'no' to everything is 98 % accurate. That is the first casualty: **accuracy carries no information at a skewed base rate.** The second is the default decision rule. A classifier's `predict` cuts at probability 0.5, and a well-calibrated model on 2 % positives puts almost every row below it. Neither is a fault in the model. Its *ranking* — which rows it scores higher than which — can be excellent while both numbers look terrible." },

    { t: "dl", items: [
      ["Base rate", "The proportion of positives in the population the model will score. Every threshold-dependent metric is read against it, and the evaluation set must have it."],
      ["Precision", "Of the rows flagged, the fraction that are positive. Bounded above by the base rate times the lift the model achieves at that threshold."],
      ["Recall", "Of the positives, the fraction flagged. Rises as the threshold falls; the price is precision."],
      ["Precision–recall curve", "Precision against recall over every threshold. Its baseline is the base rate; its area (average precision) rewards ranking positives near the top and is sensitive to imbalance, which is why it is the curve to look at."],
      ["ROC curve", "True-positive rate against false-positive rate. Its area is insensitive to the base rate — the same model has the same AUC at 50 % and 0.1 % positives — so it can look excellent while precision is single digits."],
      ["Class weight", "A multiplier on each class's contribution to the loss. `balanced` weights inversely to frequency; the boundary moves towards the majority and the probabilities are no longer calibrated."],
      ["Oversampling / undersampling", "Repeating minority rows, or discarding majority rows, in the training set. Both shift the boundary; neither adds information."],
      ["SMOTE", "Synthetic minority rows interpolated between a minority point and one of its nearest minority neighbours. Adds smoothness rather than information, misbehaves on categorical and integer columns, and leaks if run before the split."],
      ["Threshold", "The probability above which a row is flagged. A decision, chosen on validation predictions from the costs of each kind of error — not a property of the model."]
    ]},

    { t: "viz",
      title: "The same model on two curves, 2 % positives",
      caption: "ROC reads the model as strong — the curve bows well above the diagonal. Precision–recall reads the same model against its base rate: precision falls from 0.65 at high thresholds to 0.10 by the time recall reaches 0.9. Both are true; only the second one tells you what a flagged row is worth.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="Two panels. Left: an ROC curve bowing towards the top-left with the diagonal shown, labelled AUC 0.86. Right: a precision-recall curve falling from high precision at low recall to near the base-rate line at high recall, labelled average precision 0.27, with the base rate 0.02 drawn as a dashed floor.">
  <text x="60" y="34" class="s-label" style="font-weight:600">ROC · AUC 0.86</text>
  <line x1="60" y1="270" x2="400" y2="270" style="stroke:var(--line)" stroke-width="1"/>
  <line x1="60" y1="50" x2="60" y2="270" style="stroke:var(--line)" stroke-width="1"/>
  <line x1="60" y1="270" x2="400" y2="50" style="stroke:var(--ink-4)" stroke-width="1" stroke-dasharray="4 4"/>
  <path d="M60,270 C80,150 120,100 200,80 C280,62 340,54 400,50" fill="none" style="stroke:var(--accent)" stroke-width="2.5"/>
  <text x="230" y="292" class="s-sub" text-anchor="middle">false positive rate</text>
  <text x="40" y="160" class="s-sub" text-anchor="middle" transform="rotate(-90 40 160)">true positive rate</text>
  <text x="250" y="200" class="s-sub" style="fill:var(--ink-4)">chance</text>

  <line x1="440" y1="50" x2="440" y2="290" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="500" y="34" class="s-label" style="font-weight:600">Precision–recall · AP 0.27</text>
  <line x1="500" y1="270" x2="840" y2="270" style="stroke:var(--line)" stroke-width="1"/>
  <line x1="500" y1="50" x2="500" y2="270" style="stroke:var(--line)" stroke-width="1"/>
  <line x1="500" y1="266" x2="840" y2="266" style="stroke:var(--crit)" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="760" y="258" class="s-sub" style="fill:var(--crit)">base rate 0.02</text>
  <path d="M500,60 C520,70 540,110 580,130 C640,160 700,205 760,230 C800,245 830,258 840,262" fill="none" style="stroke:var(--accent)" stroke-width="2.5"/>
  <g style="fill:var(--accent)">
    <circle cx="527" cy="88" r="4"/><circle cx="600" cy="140" r="4"/><circle cx="690" cy="200" r="4"/><circle cx="785" cy="243" r="4"/>
  </g>
  <g class="s-sub">
    <text x="536" y="84">t = 0.5 · P 0.65 R 0.08</text>
    <text x="610" y="138">t = 0.2 · P 0.42 R 0.40</text>
    <text x="700" y="198">t = 0.1 · P 0.27 R 0.68</text>
    <text x="700" y="240">t = 0.03 · P 0.10 R 0.93</text>
  </g>
  <text x="670" y="292" class="s-sub" text-anchor="middle">recall</text>
  <text x="480" y="160" class="s-sub" text-anchor="middle" transform="rotate(-90 480 160)">precision</text>
</svg>`
    },

    { t: "h2", n: "02", text: "The threshold is the first lever", id: "threshold" },

    { t: "p", text: "The probabilities already contain the ranking. What the default rule gets wrong is where to cut it, and **the cut is a decision that belongs to the costs, not to the model.** Sweep the threshold on validation predictions, read precision and recall at each, and choose by the cost of a miss against the cost of a false alarm — or by a recall the business requires, or by a review capacity that fixes how many rows can be flagged." },

    { t: "code", lang: "python", title: "Sweep the threshold, then let a cost matrix choose it",
      hl: [20, 21, 34, 35, 42],
      code: `import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, precision_recall_curve, roc_auc_score,
                             precision_score, recall_score)
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(0)
n = 20_000
X = rng.normal(0, 1, (n, 6))
logit = -5.2 + 1.1 * X[:, 0] + 0.8 * X[:, 1] - 0.6 * X[:, 2] + 0.5 * X[:, 3] * X[:, 4]
y = (logit + rng.logistic(0, 1, n) > 0).astype(int)
print(y.mean().round(3))                               # 0.021  -- about 420 positives

X_tr, X_va, y_tr, y_va = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
clf = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)
p = clf.predict_proba(X_va)[:, 1]

print(roc_auc_score(y_va, p).round(3), average_precision_score(y_va, p).round(3))   # 0.86  0.27
yhat = p >= 0.5
print(yhat.mean().round(4), recall_score(y_va, yhat).round(2), precision_score(y_va, yhat).round(2))
# 0.0028  0.08  0.65   <- the default flags 0.3 % of rows and finds 8 % of the positives

for t in [0.5, 0.2, 0.1, 0.05, 0.03]:
    yhat = p >= t
    print(f"t={t:<5} flagged={yhat.mean():.3f}  precision={precision_score(y_va, yhat):.2f}  recall={recall_score(y_va, yhat):.2f}")
# t=0.5   flagged=0.003  precision=0.65  recall=0.08
# t=0.2   flagged=0.020  precision=0.42  recall=0.40
# t=0.1   flagged=0.055  precision=0.27  recall=0.68
# t=0.05  flagged=0.120  precision=0.15  recall=0.85
# t=0.03  flagged=0.200  precision=0.10  recall=0.93

# a cost matrix turns the sweep into one number: a missed positive costs 50, a false alarm costs 2
cost_fn, cost_fp = 50, 2
bayes_t = cost_fp / (cost_fp + cost_fn)     # flag when p * cost_fn > (1 - p) * cost_fp -- valid if p is calibrated
print(round(bayes_t, 3))                    # 0.038

def total_cost(t):
    yhat = p >= t
    fn = ((~yhat) & (y_va == 1)).sum(); fp = (yhat & (y_va == 0)).sum()
    return fn * cost_fn + fp * cost_fp
grid_t = np.linspace(0.005, 0.5, 200)
print(grid_t[np.argmin([total_cost(t) for t in grid_t])].round(3))    # 0.040  -- agrees: the model is roughly calibrated`,
      caption: "**Same model, same probabilities: threshold 0.5 finds 8 % of positives, threshold 0.04 finds 85 %.** The cost matrix gives the cut analytically for calibrated probabilities and the validation sweep confirms it empirically; when the two disagree, the probabilities are not calibrated, and that is worth knowing."
    },

    { t: "p", text: "Two other ways to state the decision, both read from the same curve: **recall at a required precision** ('we can tolerate one false alarm in three'), and **precision at a fixed capacity** ('the team can review the top 1 %'). Each is a point on the precision–recall curve chosen by a constraint, and none of them needs the training data changed." },

    { t: "code", lang: "python", title: "Constraints as points on the curve",
      code: `prec, rec, thr = precision_recall_curve(y_va, p)

# the recall you get if precision must be at least 0.3
ok = prec[:-1] >= 0.3
print(rec[:-1][ok].max().round(2), thr[ok][np.argmax(rec[:-1][ok])].round(3))    # 0.62  0.115

# precision in the top 1 % of scores -- a fixed review capacity
k = int(0.01 * len(p))
top = np.argsort(-p)[:k]
print(y_va[top].mean().round(2))                                                # 0.55   (lift 26x over 0.021)

# and the number that stays honest at any base rate: the whole curve's area
print(average_precision_score(y_va, p).round(3))                                # 0.27`,
      caption: "Precision in the top 1 % is 0.55 — 26 times the base rate. That lift is the model's value stated in the unit the reviewer experiences, and it is invisible in accuracy and nearly so in ROC AUC."
    },

    { t: "h2", n: "03", text: "Weights and resampling: what they change", id: "weights" },

    { t: "p", text: "`class_weight=\"balanced\"` multiplies the minority's loss by the inverse of its frequency. For a model whose form already fits the data this **moves the boundary without improving the ranking** — the same thing the threshold did — and it has a side effect: the predicted probabilities now average around the weighted rate, not the real one. Weights are the right tool when the model *does* rank better with them — trees that would otherwise never split for the minority, or a model whose loss is dominated by easy negatives — and even then the threshold is re-chosen on validation afterwards." },

    { t: "code", lang: "python", title: "Weights move the scale, not the ranking",
      hl: [4, 6, 8],
      code: `w = LogisticRegression(max_iter=1000, class_weight="balanced").fit(X_tr, y_tr)
pw = w.predict_proba(X_va)[:, 1]

print(roc_auc_score(y_va, pw).round(3), average_precision_score(y_va, pw).round(3))   # 0.86  0.27  identical ranking
yhat = pw >= 0.5
print(yhat.mean().round(3), recall_score(y_va, yhat).round(2), precision_score(y_va, yhat).round(2))   # 0.22  0.93  0.09
# the default cut now flags 22 % of rows -- because 0.5 on this scale is 0.03 on the real one
print(pw.mean().round(3), p.mean().round(3), y_va.mean().round(3))     # 0.31  0.021  0.021
# the weighted model's mean probability is 0.31 for a population that is 2.1 % positive: not a probability any more.
# If probabilities will be used -- expected cost, ranking across models, a downstream decision --
# recalibrate on validation: CalibratedClassifierCV(w, method="isotonic", cv=5)`,
      caption: "**AUC and AP unchanged to three decimals; the mean predicted probability moved from 0.021 to 0.31.** Weighting a well-specified logistic regression is a threshold change with a calibration cost. Where it earns its keep is a model that would otherwise not learn the minority at all."
    },

    { t: "p", text: "Resampling changes the training rows instead of the loss. Undersampling discards majority rows — fast, and a waste of data. Oversampling repeats minority rows — the same boundary shift with more memorisation. **SMOTE interpolates new minority rows between neighbours**, which smooths the minority region and can help a model that overfits to a handful of points; it also generates impossible rows for categorical and integer columns, blurs a boundary that was genuinely sharp, and — the part that matters most — **creates rows that are functions of other rows.** If it runs before the split, the training set contains synthetic neighbours of every validation positive." },

    { t: "viz",
      title: "What SMOTE makes, and what it makes of a validation row",
      caption: "Left: each synthetic point lies on a segment between a minority point and one of its nearest minority neighbours. Right: with SMOTE run before the split, a validation positive has synthetic points built from it sitting in the training set — the model has seen it, in pieces.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Left panel: majority points as small grey dots, minority points as red circles, synthetic points as hollow red circles placed along segments joining nearby minority points. Right panel: the same, with one minority point marked as validation and the synthetic points that were interpolated from it marked as training rows.">
  <text x="40" y="34" class="s-label" style="font-weight:600">Interpolation between minority neighbours</text>
  <g style="fill:var(--ink-4)" fill-opacity=".5">
    <circle cx="70" cy="80" r="3"/><circle cx="100" cy="130" r="3"/><circle cx="140" cy="70" r="3"/><circle cx="90" cy="200" r="3"/><circle cx="160" cy="230" r="3"/><circle cx="60" cy="250" r="3"/>
    <circle cx="200" cy="110" r="3"/><circle cx="330" cy="70" r="3"/><circle cx="380" cy="120" r="3"/><circle cx="400" cy="230" r="3"/><circle cx="350" cy="260" r="3"/><circle cx="120" cy="160" r="3"/>
    <circle cx="240" cy="250" r="3"/><circle cx="390" cy="180" r="3"/><circle cx="180" cy="150" r="3"/><circle cx="360" cy="40" r="3"/>
  </g>
  <g style="stroke:var(--crit)" stroke-width="1" stroke-dasharray="3 3">
    <line x1="230" y1="170" x2="290" y2="200"/><line x1="290" y1="200" x2="270" y2="140"/><line x1="230" y1="170" x2="270" y2="140"/>
  </g>
  <g style="fill:var(--crit)">
    <circle cx="230" cy="170" r="5"/><circle cx="290" cy="200" r="5"/><circle cx="270" cy="140" r="5"/>
  </g>
  <g style="fill:none;stroke:var(--crit)" stroke-width="1.5">
    <circle cx="255" cy="182" r="4"/><circle cx="283" cy="180" r="4"/><circle cx="246" cy="158" r="4"/><circle cx="264" cy="190" r="4"/>
  </g>
  <g class="s-sub">
    <circle cx="50" cy="285" r="4" style="fill:var(--crit)"/><text x="60" y="289">minority</text>
    <circle cx="140" cy="285" r="4" style="fill:none;stroke:var(--crit)" stroke-width="1.5"/><text x="150" y="289">synthetic</text>
    <circle cx="230" cy="285" r="3" style="fill:var(--ink-4)" fill-opacity=".5"/><text x="240" y="289">majority</text>
  </g>

  <line x1="440" y1="40" x2="440" y2="290" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="480" y="34" class="s-label" style="font-weight:600">SMOTE before the split</text>
  <g style="fill:var(--ink-4)" fill-opacity=".5">
    <circle cx="510" cy="80" r="3"/><circle cx="540" cy="130" r="3"/><circle cx="580" cy="70" r="3"/><circle cx="530" cy="200" r="3"/><circle cx="600" cy="230" r="3"/><circle cx="500" cy="250" r="3"/>
    <circle cx="640" cy="110" r="3"/><circle cx="770" cy="70" r="3"/><circle cx="820" cy="120" r="3"/><circle cx="840" cy="230" r="3"/><circle cx="790" cy="260" r="3"/><circle cx="560" cy="160" r="3"/>
  </g>
  <g style="stroke:var(--crit)" stroke-width="1" stroke-dasharray="3 3">
    <line x1="670" y1="170" x2="730" y2="200"/><line x1="670" y1="170" x2="710" y2="140"/>
  </g>
  <circle cx="670" cy="170" r="8" style="fill:none;stroke:var(--accent)" stroke-width="2.5"/>
  <g style="fill:var(--crit)">
    <circle cx="670" cy="170" r="5"/><circle cx="730" cy="200" r="5"/><circle cx="710" cy="140" r="5"/>
  </g>
  <g style="fill:none;stroke:var(--crit)" stroke-width="1.5">
    <circle cx="695" cy="182" r="4"/><circle cx="686" cy="158" r="4"/><circle cx="712" cy="191" r="4"/>
  </g>
  <text x="600" y="120" class="s-sub" style="fill:var(--accent);font-weight:600">validation row</text>
  <path d="M655,124 L666,160" fill="none" style="stroke:var(--accent)" stroke-width="1"/>
  <text x="720" y="240" class="s-sub" style="fill:var(--crit)">its synthetic offspring —</text>
  <text x="720" y="256" class="s-sub" style="fill:var(--crit)">in the training set</text>
</svg>`
    },

    { t: "code", lang: "python", title: "SMOTE inside the fold, and the leak when it is not",
      hl: [4, 12, 14, 17, 18],
      code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline      # allows a sampler step, applied at fit only

cv = StratifiedKFold(5, shuffle=True, random_state=0)
def ap(model, X, y):
    return cross_val_score(model, X, y, cv=cv, scoring="average_precision").mean().round(3)

rf  = RandomForestClassifier(300, min_samples_leaf=5, random_state=0, n_jobs=-1)
rfw = RandomForestClassifier(300, min_samples_leaf=5, random_state=0, n_jobs=-1, class_weight="balanced")
print(ap(rf, X, y))                                                        # 0.24
print(ap(rfw, X, y))                                                       # 0.25   weights: within noise
print(ap(ImbPipeline([("smote", SMOTE(random_state=0)), ("rf", rf)]), X, y))   # 0.23   SMOTE, inside the fold: within noise

# the leak: resample everything, then cross-validate
Xs, ys = SMOTE(random_state=0).fit_resample(X, y)
print(ys.mean())                                                           # 0.5
print(ap(rf, Xs, ys))                                                      # 0.97   every validation positive has children in training
# the validation folds are half positive, and half of those positives are interpolations of rows
# the model trained on. The number describes the resampler, not the model.`,
      caption: "**Weights 0.25, SMOTE inside the fold 0.23, no resampling 0.24 — noise. SMOTE before the split: 0.97.** The last number is the one that ends up on a slide. The `imblearn` pipeline runs the sampler during `fit` only, so the validation fold is scored at its natural balance with no synthetic relatives in training."
    },

    { t: "callout", kind: "warn", title: "Never evaluate on a resampled set", body: [
      { t: "p", text: "Precision, average precision, expected cost and the threshold all depend on the base rate. A test set balanced to 50 % reports a precision the real population will never deliver, and a threshold chosen on it is wrong by the same factor. **Resampling, if used at all, touches the training rows of each fold and nothing else.** The validation and test rows keep the base rate the deployment will see." }
    ]},

    { t: "h2", n: "04", text: "Metrics that survive the base rate", id: "metrics" },

    { t: "table",
      head: ["Metric", "Measures", "Sensitive to base rate", "Use it for"],
      rows: [
        ["Accuracy", "Fraction correct at the threshold", "Fatally", "Nothing, at skewed rates"],
        ["ROC AUC", "Ranking quality across all thresholds", "No", "Comparing rankers when the base rate is not the question"],
        ["Average precision (PR AUC)", "Ranking quality weighted towards the top", "Yes — that is the point", "The headline for rare positives"],
        ["Precision @ k", "Hit rate in the top k scores", "Yes", "A fixed review capacity"],
        ["Recall @ precision p", "Coverage at an acceptable false-alarm rate", "Yes", "A quality constraint"],
        ["F-beta", "Weighted harmonic mean of precision and recall at a threshold", "Yes", "One number when costs are known only as a ratio"],
        ["Expected cost", "FN × cost + FP × cost at a threshold", "Yes", "The decision itself, when costs are known"],
        ["Brier score / calibration curve", "Whether p means p", "Yes", "Any use of the probabilities as probabilities"],
        ["Matthews correlation", "Correlation between prediction and truth at a threshold", "Balanced by design", "A single threshold metric that does not reward the majority"]
      ]
    },

    { t: "p", text: "Below a few dozen positives no metric is stable — the standard error table in 8.4 is the reason — and the honest options are to collect more, to label more where the model is uncertain, or to treat the task as anomaly detection (6.7) rather than classification. **Extreme rarity is a data problem, and resampling cannot manufacture the information that a few dozen rows do not contain.**" },

    { t: "callout", kind: "tradeoff", title: "The order of operations", body: [
      { t: "p", text: "Fit the model at the natural rate. Look at average precision and the precision–recall curve. Choose the threshold from costs on validation predictions. If the ranking itself is poor because the model never learns the minority, add class weights and re-choose the threshold; recalibrate if the probabilities are used. Try SMOTE inside the fold last, keep it only if average precision improves beyond fold noise, and never on categorical columns without the variant built for them. **Each step is measured at the base rate the deployment will see.**" }
    ]},

    { t: "ladder",
      title: "Detecting fraud at 0.2 % of transactions",
      rungs: [
        { level: "bad", label: "Balance the data, report accuracy", code: `Xs, ys = SMOTE().fit_resample(X, y)
X_tr, X_te, y_tr, y_te = train_test_split(Xs, ys)
print(accuracy_score(y_te, model.fit(X_tr, y_tr).predict(X_te)))   # 0.97`,
          note: "**Three errors compounding.** Synthetic relatives of test rows are in training; the test set is 50 % fraud; accuracy at that rate says nothing about a world where fraud is 0.2 %. The 0.97 survives to production as a 3 % precision." },
        { level: "ok", label: "Weights, stratified CV, ROC AUC", code: `cv = StratifiedKFold(5, shuffle=True)
model = GradientBoostingClassifier()          # or class_weight where supported
cross_val_score(model, X, y, cv=cv, scoring="roc_auc")   # 0.94`,
          note: "**Honest, and the wrong headline.** AUC 0.94 at 0.2 % positives can be a precision of 4 % at any useful recall. The threshold is still 0.5 and nobody has asked what a false alarm costs." },
        { level: "best", label: "Natural rate, average precision, threshold from cost, calibrated", code: `pipe = ImbPipeline([("pre", pre), ("smote", SMOTE()), ("clf", clf)])   # sampler at fit only, if it helps
ap = cross_val_score(pipe, X, y, cv=cv, scoring="average_precision")
p_va = cross_val_predict(pipe, X, y, cv=cv, method="predict_proba")[:, 1]
t = threshold_minimising_cost(y, p_va, cost_fn=chargeback, cost_fp=review)`,
          note: "**The metric reflects the base rate, the threshold reflects the costs, and any resampling is inside the fold.** The number reported is precision and recall at *t* on rows with 0.2 % fraud, which is the number the operations team will actually see." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Threshold, weights, and the resampling leak",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "On a 2 % dataset, compare four configurations by average precision under stratified cross-validation: the plain model, `class_weight=\"balanced\"`, SMOTE inside an `imblearn` pipeline, and SMOTE applied before cross-validation. Then, for the plain model, obtain out-of-fold probabilities, sweep the threshold, choose it by a cost matrix, and report precision and recall at the default and chosen cuts." },
        { t: "p", text: "Assert that the default threshold's recall is under 0.15 and the chosen threshold's over 0.6; that weights and in-fold SMOTE are within 0.03 of the plain model; that pre-split SMOTE is inflated by more than 0.3; and that every evaluation used rows at the natural base rate." }
      ],
      requirements: [
        "A generator with ~2 % positives and enough signal for AP around 0.25.",
        "`cross_val_score` with `scoring=\"average_precision\"` for the four configurations.",
        "`cross_val_predict(..., method=\"predict_proba\")` for out-of-fold probabilities.",
        "A cost-minimising threshold function, plus the analytic Bayes threshold for comparison.",
        "The five assertions in the brief."
      ],
      hint: "Out-of-fold probabilities via `cross_val_predict` give you a threshold sweep over every row without touching a test set. For the leak, resample `X, y` with `SMOTE().fit_resample` and pass the result to the same `cross_val_score` — the folds will be half positive and the number will be absurd; check `ys.mean()`.",
      solution: {
        lang: "python",
        title: "imbalance_procedure.py",
        code: `import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import average_precision_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_val_score

rng = np.random.default_rng(3)
n = 20_000
X = rng.normal(0, 1, (n, 6))
logit = -5.2 + 1.1 * X[:, 0] + 0.8 * X[:, 1] - 0.6 * X[:, 2] + 0.5 * X[:, 3] * X[:, 4]
y = (logit + rng.logistic(0, 1, n) > 0).astype(int)
base_rate = y.mean()
print(f"base rate {base_rate:.3f}, positives {y.sum()}")          # 0.021, ~420

cv = StratifiedKFold(5, shuffle=True, random_state=0)
make = lambda **kw: RandomForestClassifier(300, min_samples_leaf=5, random_state=0, n_jobs=-1, **kw)
def ap(model, X, y):
    return cross_val_score(model, X, y, cv=cv, scoring="average_precision").mean()

# --- 1. four configurations ------------------------------------------------
Xs, ys = SMOTE(random_state=0).fit_resample(X, y)
results = {
    "plain":               ap(make(), X, y),
    "class_weight":        ap(make(class_weight="balanced"), X, y),
    "smote inside fold":   ap(ImbPipeline([("smote", SMOTE(random_state=0)), ("rf", make())]), X, y),
    "smote before split":  ap(make(), Xs, ys),
}
for k, v in results.items():
    print(f"{k:20s} AP {v:.3f}")
# plain                AP 0.242
# class_weight         AP 0.251
# smote inside fold    AP 0.231
# smote before split   AP 0.968

# --- 2. out-of-fold probabilities and the threshold ------------------------
p = cross_val_predict(make(), X, y, cv=cv, method="predict_proba")[:, 1]
print(f"OOF AP {average_precision_score(y, p):.3f}")

cost_fn, cost_fp = 50, 2
def cost_at(t):
    yhat = p >= t
    return ((~yhat) & (y == 1)).sum() * cost_fn + (yhat & (y == 0)).sum() * cost_fp

grid_t = np.linspace(0.005, 0.5, 200)
t_star = grid_t[np.argmin([cost_at(t) for t in grid_t])]
bayes = cost_fp / (cost_fp + cost_fn)
print(f"chosen threshold {t_star:.3f}   analytic {bayes:.3f}")

def report(t):
    yhat = p >= t
    return dict(t=round(float(t), 3), flagged=round(yhat.mean(), 3),
                precision=round(precision_score(y, yhat), 3), recall=round(recall_score(y, yhat), 3),
                cost=int(cost_at(t)))
default, chosen = report(0.5), report(t_star)
print("default:", default)     # {'t': 0.5, 'flagged': 0.003, 'precision': 0.62, 'recall': 0.09, 'cost': 19146}
print("chosen: ", chosen)      # {'t': 0.04, 'flagged': 0.13, 'precision': 0.14, 'recall': 0.84, 'cost': 7844}

# --- 3. assertions -----------------------------------------------------------
assert default["recall"] < 0.15,                                   "the default cut finds almost nothing"
assert chosen["recall"] > 0.6 and chosen["cost"] < default["cost"], "the chosen cut finds most positives at lower total cost"
assert abs(results["class_weight"] - results["plain"]) < 0.03,     "weights do not change the ranking here"
assert abs(results["smote inside fold"] - results["plain"]) < 0.03, "in-fold SMOTE does not change the ranking here"
assert results["smote before split"] > results["plain"] + 0.3,     "pre-split SMOTE is a leak, not a result"
assert ys.mean() > 0.4 and base_rate < 0.05,                       "the leaky evaluation ran at 50 %; every honest one ran at ~2 %"
print("imbalance: threshold first, weights second, resampling inside the fold or not at all")`,
        notes: [
          { t: "p", text: "**Plain 0.24, weights 0.25, in-fold SMOTE 0.23 — one number with fold noise around it. Pre-split SMOTE 0.97.** The forest was trained on interpolations of the rows it was later scored on, and the validation folds were half positive; the score describes the resampler." },
          { t: "p", text: "**The threshold moved recall from 0.09 to 0.84 without touching the model.** The cost-minimising cut and the analytic Bayes cut agree to two decimals because the forest's out-of-fold probabilities are roughly calibrated at this depth; had they disagreed, the fix would be calibration, not resampling." },
          { t: "p", text: "**The last assertion is the one people forget**: every honest number in the file was computed on rows with the deployment's base rate. The single number computed at 50 % is the one the file exists to discredit." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "After `class_weight=\"balanced\"`, a logistic regression's AUC is unchanged and its mean predicted probability rises from 0.02 to 0.31. What happened?",
          options: [
            "The model got better at finding positives",
            "The weights moved the decision boundary — the same effect as lowering the threshold — and shifted the probability scale so it no longer matches the base rate; the ranking is identical",
            "The model is now overfitting",
            "The data was resampled"
          ],
          answer: 1,
          why: "Weighting a well-specified model reparametrises the intercept, not the ordering of rows. That is why AUC and AP hold; the probabilities now describe a population that is one-third positive, and must be recalibrated before they are used as probabilities."
        }
      ]
    }
  ],

  takeaways: [
    "**Imbalance breaks accuracy and the default threshold; it does not break the ranking.** Look at the probabilities before touching the data.",
    "**The precision–recall curve reads against the base rate; ROC does not.** Average precision is the headline for rare positives.",
    "**The threshold is a decision made from costs on validation predictions** — the Bayes cut is cost_fp / (cost_fp + cost_fn) for calibrated probabilities, and the empirical sweep confirms it.",
    "**Recall at a required precision and precision at a fixed capacity** are the same curve read through a constraint.",
    "**Class weights move the boundary and the probability scale**, rarely the ranking; recalibrate if the probabilities will be used.",
    "**Resampling adds no information.** Undersampling discards rows, oversampling repeats them, SMOTE interpolates them — and the interpolated rows are functions of other rows.",
    "**SMOTE before the split is a leak**: synthetic children of validation positives sit in the training set and the score describes the resampler.",
    "**`imblearn`'s pipeline runs the sampler at fit only**, so validation folds keep their natural balance.",
    "**Never evaluate, threshold or calibrate on a resampled set.** Every honest number is computed at the deployment's base rate.",
    "**Order of operations**: threshold first, weights if the model does not learn the minority, resampling inside the fold last and only if average precision moves beyond noise.",
    "**Below a few dozen positives, no metric is stable** — collect more, label more, or reframe as anomaly detection."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A model on 2 % positives reports ROC AUC 0.94 and precision 4 % at the threshold that gives 80 % recall. Are these consistent?",
        options: [
          "No — an AUC that high implies high precision",
          "Yes — ROC AUC is insensitive to the base rate; at 2 % positives even a good ranker flags many negatives per positive at high recall, and precision is bounded by the base rate times the lift",
          "No — the threshold is wrong",
          "Only if the data was resampled"
        ],
        answer: 1,
        why: "ROC measures true-positive against false-positive *rates*; with 49 negatives per positive, a 5 % false-positive rate is 2.5 negatives flagged per positive found. The precision–recall curve shows this directly; ROC hides it."
      },
      {
        stem: "SMOTE is applied to the whole dataset, then 5-fold cross-validation reports average precision 0.97 versus 0.24 without it. What does 0.97 measure?",
        options: [
          "The improvement SMOTE brought",
          "How well the model recognises interpolations of rows it trained on: each validation positive has synthetic offspring in the training folds, and the folds are half positive",
          "The model's true generalisation",
          "Overfitting that would be fixed by regularisation"
        ],
        answer: 1,
        why: "Synthetic rows are functions of real rows. Resampling before the split puts a validation row's relatives into training and balances the validation fold to a rate the deployment will never have. Inside an imblearn pipeline, SMOTE scores 0.23 — noise around the plain 0.24."
      },
      {
        stem: "A missed positive costs 50, a false alarm costs 2, and the model's probabilities are calibrated. At what probability should a row be flagged?",
        options: [
          "0.5",
          "Above 2 / (2 + 50) ≈ 0.038 — flag when the expected cost of missing, p × 50, exceeds the expected cost of a false alarm, (1 − p) × 2",
          "Above the base rate",
          "Above 50 / 52"
        ],
        answer: 1,
        why: "Minimising expected cost gives the threshold cost_fp / (cost_fp + cost_fn). It is far below 0.5 whenever a miss is much more expensive than a false alarm, which is the usual case for rare positives — and the validation sweep should agree with it if the probabilities are honest."
      },
      {
        stem: "Which evaluation is wrong?",
        options: [
          "Average precision on the natural-rate validation fold, with SMOTE inside the pipeline",
          "Precision at a threshold chosen on validation predictions at the natural rate",
          "Precision on a test set that was undersampled to 50 % negatives so the metric looks meaningful",
          "Brier score on natural-rate out-of-fold probabilities"
        ],
        answer: 2,
        why: "Precision depends on the base rate. A balanced test set reports a precision the population cannot deliver and a threshold that is wrong by the same factor. Resampling, if used, touches the training rows of a fold and nothing else."
      },
      {
        stem: "When are class weights the right tool rather than a threshold change?",
        options: [
          "Always — they are the standard fix",
          "When the model's ranking itself is poor because it never learns the minority — a tree that never splits for it, a loss swamped by easy negatives — and the weights improve average precision, not just recall at 0.5",
          "Never — the threshold is always sufficient",
          "Only for logistic regression"
        ],
        answer: 1,
        why: "For a well-specified model, weights reparametrise the intercept and change nothing a threshold could not. They earn their place when the ranking improves, which average precision measures and recall-at-0.5 does not. Either way the threshold is re-chosen afterwards."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you handle a dataset with 1 % positives?",
        strong: "I start by not changing the data. I fit at the natural rate, look at average precision and the precision–recall curve rather than accuracy or ROC, and get out-of-fold probabilities so I can sweep the threshold. The threshold comes from costs — the Bayes cut is cost_fp over the sum, checked against an empirical cost sweep — or from a required recall or a review capacity. If the ranking is poor because the model never learns the minority, I add class weights and recalibrate. Resampling comes last: SMOTE inside an imblearn pipeline so it only touches each fold's training rows, kept only if average precision improves beyond fold noise. And every number is computed on rows at the real base rate.",
        answer: [
          { t: "p", text: "Threshold before weights before resampling, and the base-rate rule at the end — the order is the answer." }
        ]
      },
      {
        level: "expert",
        q: "Why is SMOTE before the train–test split a leak, given it does not use the labels of the test rows?",
        strong: "Because a synthetic row is a function of real rows. SMOTE picks a minority point and interpolates towards one of its nearest minority neighbours; if that point later lands in the validation fold, its synthetic children — which lie a short distance from it in feature space — are in the training folds. The model learns the neighbourhood of a row it is then scored on. It also balances the validation fold to 50 %, so precision and average precision describe a population that does not exist. Both effects vanish when the sampler runs inside the fold on training rows only, which is what imblearn's pipeline enforces by running samplers at fit and skipping them at predict.",
        answer: [
          { t: "p", text: "The 'function of real rows' framing explains the leak without appealing to labels, which is the part that confuses people." }
        ]
      },
      {
        level: "expert",
        q: "A stakeholder wants 'the model's accuracy'. Fraud is 0.3 %. What do you give them?",
        strong: "Not accuracy — 99.7 % is available by flagging nothing. I would give them the operating point: at the threshold we chose from the costs, we flag x % of transactions, y % of those are fraud, and we catch z % of all fraud — with the review workload and the missed-fraud cost that implies. Then the lift over random in the top slice, which is the number that says what the model is worth. If they want one number for comparing model versions, average precision at the natural rate, with its fold spread. And I would show the precision–recall curve so they can see what moving the threshold buys and costs, because that is a business decision I want them to own.",
        answer: [
          { t: "p", text: "Translating the metric into workload and caught fraud, and handing the threshold decision to the people who own the costs, is the mature answer." }
        ]
      }
    ]
  }
});
