/* ============================================================================
   LESSON 11.1 — Four Things Called Drift
   ========================================================================= */
EC.receiveLesson({
  id: "11.1",

  lede: "'The model drifted' is said about four different events, and they need four different responses. The inputs can change while the relationship to the outcome holds, P(X). The relationship itself can change, P(Y|X). The outcome's base rate can change while each class looks the same, P(Y). Or nothing in the world changes and the pipeline breaks. Retraining fixes the second, is unnecessary for the first, is the wrong tool for the third, and for the fourth it hides the bug. This lesson simulates all four on one loan-default model and measures what each does to input statistics, ranking and calibration.",

  objectives: [
    "Name the four kinds of drift by which probability changed",
    "Predict what each does to input PSI, AUC and calibration, and confirm it by simulation",
    "Choose the response for each: nothing, retrain, recalibrate, or fix the pipeline",
    "Explain why input-drift alarms both over- and under-report",
    "Diagnose a drift type from inputs, outputs and a sample of delayed labels"
  ],

  prerequisites: ["7.4", "1.5"],

  blocks: [
    { t: "h2", n: "01", id: "four", text: "One model, four worlds", sub: "Which probability changed?" },
    { t: "p",
      text: "A logistic model predicts loan default from income and debt-to-income ratio. It is trained once, then scored on five worlds: the training distribution, and four changed ones. For each, the script reports the population stability index (PSI) of each input against training, the model's AUC (ranking), its mean prediction against the actual default rate (calibration), and the AUC of a model retrained on the new world." },
    { t: "code",
      lang: "python",
      title: "drift4.py — four drifts, measured on one model",
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(0)

# Running example: a loan-default model on two features, income (in thousands) and debt-to-income ratio.
def world(n, income_mu=50, base=-3.0, w_dti=4.0, income_scale=1.0):
    income = rng.lognormal(np.log(income_mu), 0.4, n)
    dti = rng.beta(2, 5, n)
    logit = base - 0.03 * (income - 50) + w_dti * dti
    y = rng.random(n) < 1 / (1 + np.exp(-logit))
    return np.column_stack([income * income_scale, dti]), y.astype(int)

def psi(a, b, bins=10):
    edges = np.quantile(a, np.linspace(0, 1, bins + 1)); edges[0], edges[-1] = -np.inf, np.inf
    pa = np.histogram(a, edges)[0] / len(a) + 1e-6; pb = np.histogram(b, edges)[0] / len(b) + 1e-6
    return float(np.sum((pb - pa) * np.log(pb / pa)))

Xtr, ytr = world(40_000)
model = LogisticRegression(max_iter=1000).fit(Xtr, ytr)
def report(name, X, y):
    p = model.predict_proba(X)[:, 1]
    retrained = LogisticRegression(max_iter=1000).fit(X[:20_000], y[:20_000])
    auc_new = roc_auc_score(y[20_000:], retrained.predict_proba(X[20_000:])[:, 1])
    print(f"{name:<34}{psi(Xtr[:, 0], X[:, 0]):>8.2f}{psi(Xtr[:, 1], X[:, 1]):>8.2f}{roc_auc_score(y, p):>7.3f}"
          f"{p.mean():>7.3f}{y.mean():>8.3f}{auc_new:>14.3f}")

print(f"{'world':<34}{'PSI inc':>8}{'PSI dti':>8}{'AUC':>7}{'pred':>7}{'actual':>8}{'retrained AUC':>14}")
report("training distribution", *world(40_000))
report("1. P(X): incomes rise", *world(40_000, income_mu=75))
report("2. P(Y|X): debt matters less", *world(40_000, w_dti=0.5, base=-1.6))
X3, y3 = world(200_000)                                               # 3. P(Y): defaults become twice as common,
pos, neg = np.where(y3 == 1)[0], np.where(y3 == 0)[0]                 #    with each class's inputs unchanged
k = int(2 * y3.mean() * 40_000); idx = np.concatenate([rng.choice(pos, k), rng.choice(neg, 40_000 - k)]); rng.shuffle(idx)
report("3. P(Y): base rate doubles", X3[idx], y3[idx])
report("4. pipeline: income sent in units", *world(40_000, income_scale=1000))`,
      out: `world                              PSI inc PSI dti    AUC   pred  actual retrained AUC
training distribution                 0.00    0.00  0.728  0.152   0.153         0.725
1. P(X): incomes rise                 0.95    0.00  0.765  0.089   0.090         0.759
2. P(Y|X): debt matters less          0.00    0.00  0.619  0.151   0.187         0.662
3. P(Y): base rate doubles            0.01    0.01  0.729  0.165   0.301         0.731
4. pipeline: income sent in units    12.43    0.00  0.518  0.000   0.150         0.719` },
    { t: "viz",
      title: "What each kind of drift did to the model",
      caption: "Bars show AUC above the 0.5 of random guessing. The input statistic and the model's accuracy moved independently. The largest input shift came with the best AUC; the worst real failure came with no input shift at all.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img">
<text x="210" y="31.0" text-anchor="end" class="s-label">training distribution</text>
<rect x="220" y="14" width="277.4" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="505.4" y="31.0" class="s-sub">AUC 0.728 · PSI 0.00</text>
<text x="210" y="69.0" text-anchor="end" class="s-label">P(X): incomes rise</text>
<rect x="220" y="52" width="322.4" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="550.4" y="69.0" class="s-sub">AUC 0.765 · PSI 0.95</text>
<text x="210" y="107.0" text-anchor="end" class="s-label">P(Y|X): debt matters less</text>
<rect x="220" y="90" width="144.8" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="372.8" y="107.0" class="s-sub">AUC 0.619 · PSI 0.00</text>
<text x="210" y="145.0" text-anchor="end" class="s-label">P(Y): base rate doubles</text>
<rect x="220" y="128" width="278.6" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="506.6" y="145.0" class="s-sub">AUC 0.729 · PSI 0.01</text>
<text x="210" y="183.0" text-anchor="end" class="s-label">pipeline: units changed</text>
<rect x="220" y="166" width="21.9" height="26" rx="4" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="249.9" y="183.0" class="s-sub">AUC 0.518 · PSI 12.4</text>
</svg>` },
    { t: "table",
      head: ["Drift", "What changed", "Input PSI", "AUC", "Calibration", "Response"],
      rows: [
        ["P(X)", "Who applies", "0.95: alarm", "Held (0.765)", "Held", "Usually none; check segments"],
        ["P(Y|X)", "What predicts default", "0.00: silent", "Fell (0.619)", "Off", "Retrain on new labels"],
        [
          "P(Y)",
          "How common default is",
          "0.01: silent",
          "Held (0.729)",
          "Off by 1.8×",
          "Recalibrate, adjust thresholds"
        ],
        [
          "Pipeline",
          "Nothing in the world",
          "12.4: alarm",
          "Collapsed (0.518)",
          "Broken",
          "Fix the pipeline; never retrain on it"
        ]
      ] },
    { t: "h2",
      n: "02",
      id: "responses",
      text: "Why the responses differ",
      sub: "Retraining is one tool, not the answer" },
    { t: "dl",
      items: [
        { term: "P(X): the model was right",
          def: "Higher incomes moved PSI to 0.95, past any conventional alarm, and AUC rose because richer applicants are easier to rank. Calibration held. A retrain would have changed nothing; what is worth checking is whether the new population includes regions of input space the model never saw." },
        { term: "P(Y|X): the model is wrong",
          def: "When debt stopped predicting default as strongly, AUC fell from 0.728 to 0.619 with every input statistic flat. Retraining on new labels reached 0.662, the best possible in the new world. Only labels, or proxies for them, can see this." },
        { term: "P(Y): ranking right, numbers wrong",
          def: "Twice as many defaults, with each class's inputs unchanged: AUC 0.729, but the model predicted 16.5% against an actual 30.1%. Any decision that uses the probability (pricing, a fixed threshold, expected loss) is wrong. A prior correction or recalibration on recent labels fixes it without retraining." },
        { term: "Pipeline: retraining hides it",
          def: "Income arriving in units instead of thousands collapsed AUC to 0.518. A model retrained on the broken data scored 0.719, so an automatic retrain would 'fix' it and bake the bug in, until someone fixes the units and the retrained model breaks." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Retraining on a schedule as the answer to drift",
      body: [
        { t: "p",
          text: "A weekly retrain responds correctly only to P(Y|X). It wastes compute on P(X), leaves the probabilities biased under P(Y) if the training data is resampled or stale, and under a pipeline fault it learns the fault. Retraining has to be gated by checks that the inputs are valid (lesson 1.5) and by an evaluation against the current model." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Input monitoring is a pipeline monitor",
      body: [
        { t: "p",
          text: "Input PSI fired on P(X), which needed no action, and on the pipeline fault, which needed urgent action, and was silent on the two kinds that degrade predictions. Its most valuable use is catching pipeline faults: out-of-range values, sudden zeros and nulls, unit changes. For model quality, monitor outcomes and calibration." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Diagnose the drift",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p",
          text: "Five weekly batches arrive in random order: one from each kind of drift, including a pipeline fault where a broken join fills 30% of debt ratios with 0, and one with no change. For each you have the inputs and the delayed labels for the first 3,000 rows. Write a diagnose function that names the drift from checks on inputs, outputs and the labelled sample, and score it against the truth." }
      ],
      requirements: [
        "Pipeline checks: values outside the training range, and a jump in exact zeros",
        "A distribution check: maximum PSI across inputs",
        "Label checks on the sample: AUC against the reference, and actual over predicted rate",
        "A decision order, and a score against the hidden truth"
      ],
      hint: "Check the pipeline first and calibration last: a P(Y|X) change also moves calibration, so the order of the rules decides the verdict.",
      solution: { lang: "python",
        title: "diagnose_drift.py",
        code: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(5)

def world(n, income_mu=50, base=-3.0, w_dti=4.0, income_scale=1.0, dti_null=0.0):
    income = rng.lognormal(np.log(income_mu), 0.4, n); dti = rng.beta(2, 5, n)
    y = (rng.random(n) < 1 / (1 + np.exp(-(base - 0.03 * (income - 50) + w_dti * dti)))).astype(int)
    dti_seen = np.where(rng.random(n) < dti_null, 0.0, dti)          # a broken join fills missing values with 0
    return np.column_stack([income * income_scale, dti_seen]), y

def psi(a, b, bins=10):
    edges = np.quantile(a, np.linspace(0, 1, bins + 1)); edges[0], edges[-1] = -np.inf, np.inf
    pa = np.histogram(a, edges)[0] / len(a) + 1e-6; pb = np.histogram(b, edges)[0] / len(b) + 1e-6
    return float(np.sum((pb - pa) * np.log(pb / pa)))

Xtr, ytr = world(40_000); model = LogisticRegression(max_iter=1000).fit(Xtr, ytr)
ref_auc = roc_auc_score(ytr, model.predict_proba(Xtr)[:, 1])
ranges = np.percentile(Xtr, [0.1, 99.9], axis=0); zero_rate = (Xtr == 0).mean(0)

def diagnose(X, y_sample):
    """X: this week's inputs. y_sample: delayed labels for the first 3,000 rows (what has arrived so far)."""
    p = model.predict_proba(X)[:, 1]
    out_of_range = ((X < ranges[0]) | (X > ranges[1])).mean(0).max()
    zero_jump = ((X == 0).mean(0) - zero_rate).max()
    max_psi = max(psi(Xtr[:, j], X[:, j]) for j in range(X.shape[1]))
    auc = roc_auc_score(y_sample, p[:3000]); calib = y_sample.mean() / p[:3000].mean()
    if out_of_range > 0.05 or zero_jump > 0.05: verdict = "pipeline"
    elif auc < ref_auc - 0.04: verdict = "P(Y|X)"
    elif abs(np.log(calib)) > np.log(1.25): verdict = "P(Y)"
    elif max_psi > 0.2: verdict = "P(X)"
    else: verdict = "no change"
    return verdict, dict(psi=max_psi, oor=out_of_range, zeros=zero_jump, auc=auc, calib=calib)

def prior_shift(n=40_000):
    X, y = world(250_000); pos, neg = np.where(y == 1)[0], np.where(y == 0)[0]; k = int(2 * y.mean() * n)
    idx = np.concatenate([rng.choice(pos, k), rng.choice(neg, n - k)]); rng.shuffle(idx); return X[idx], y[idx]

cases = {"P(X)": lambda: world(40_000, income_mu=75), "P(Y|X)": lambda: world(40_000, w_dti=0.5, base=-1.6),
         "P(Y)": prior_shift, "pipeline": lambda: world(40_000, dti_null=0.3), "no change": lambda: world(40_000)}
order = list(cases); rng.shuffle(order)
right = 0
print(f"{'batch':<7}{'max PSI':>8}{'out-of-range':>13}{'new zeros':>10}{'AUC':>7}{'actual/pred':>12}  verdict      truth")
for i, truth in enumerate(order):
    X, y = cases[truth]()
    verdict, m = diagnose(X, y[:3000]); right += verdict == truth
    print(f"{i + 1:<7}{m['psi']:>8.2f}{m['oor']:>13.1%}{m['zeros']:>10.1%}{m['auc']:>7.3f}{m['calib']:>12.2f}  {verdict:<12} {truth}")
print(f"\\n{right} of {len(order)} diagnosed correctly (reference AUC {ref_auc:.3f})")`,
        out: `batch   max PSI out-of-range new zeros    AUC actual/pred  verdict      truth
1          0.94         1.7%      0.0%  0.759        1.01  P(X)         P(X)
2          0.46        30.3%     30.1%  0.650        1.32  pipeline     pipeline
3          0.00         0.2%      0.0%  0.715        1.04  no change    no change
4          0.00         0.2%      0.0%  0.623        1.25  P(Y|X)       P(Y|X)
5          0.01         0.3%      0.0%  0.719        1.82  P(Y)         P(Y)

5 of 5 diagnosed correctly (reference AUC 0.729)`,
        notes: [
          { t: "p",
            text: "All five were diagnosed correctly. The order of the rules does real work: the concept-drift batch also had actual/predicted at 1.25, so a calibration rule checked before the AUC rule would have called it a base-rate shift and prescribed recalibration instead of retraining." },
          { t: "p",
            text: "The no-change batch scored AUC 0.715 against a reference of 0.729 on 3,000 labels, within the 0.04 tolerance. With only a few thousand delayed labels, AUC moves by a point or two by chance, so thresholds on label-based checks need to allow for sample size, which lesson 11.2 treats properly." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the retrain that made it worse",
      body: [
        { t: "p",
          text: "**Symptom.** A credit model's approval rate jumped from 41% to 63% on a Monday. By Wednesday the automatic weekly retrain had run, approvals settled back to 44%, and the team closed the alert as a transient." },
        { t: "p",
          text: "**Mechanism.** On the Monday an upstream service started sending income in units rather than thousands. The retrain learned the new scale, so the model worked again on the broken feed. Two weeks later the upstream team fixed the units, incomes looked a thousand times smaller to the new model, and approvals fell to 9%." },
        { t: "p",
          text: "**Fix.** Range and unit checks on every input now block both scoring and retraining when they fail, the retrain is gated on input validation and an evaluation against the current model, and any approval-rate change above five points pages a person instead of waiting for the next retrain." }
      ] }
  ],

  takeaways: [
    "Four things are called drift: **P(X)**, **P(Y|X)**, **P(Y)** and **the pipeline**; each needs a different response.",
    "P(X): PSI **0.95**, AUC **0.765**, calibration held. Usually no action.",
    "P(Y|X): PSI **0.00**, AUC **0.728 → 0.619**. Retrain on new labels.",
    "P(Y): AUC unchanged, predicted **16.5%** against actual **30.1%**. Recalibrate; retraining is not required.",
    "Pipeline: PSI **12.4**, AUC **0.518**. Fix the pipeline; retraining on it scored 0.719 and baked the bug in.",
    "Input PSI is best at catching **pipeline faults**; it misses the drifts that hurt predictions.",
    "Monitor outcomes and calibration for model quality; gate retraining on input validation and evaluation.",
    "Diagnosis needs inputs, outputs and labels, checked in the right **order**."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Input PSI is near zero, but on fresh labels AUC fell from 0.73 to 0.62. Which drift is it?",
        options: [
          "P(X), a change in which people the model gets to see",
          "P(Y|X), a change in what predicts the outcome",
          "P(Y), a change in the outcome's base rate",
          "A pipeline fault in one of the features"
        ],
        answer: 1,
        why: "Unchanged inputs with worse ranking means the relationship changed. P(X) and pipeline faults move input statistics, and a pure base-rate shift leaves AUC unchanged." },
      { stem: "Defaults double, AUC holds, but predicted rates are half the actual rate. What is the right fix?",
        options: [
          "Retrain from scratch on last year's data",
          "Recalibrate or correct for the new prior",
          "Ignore it, since the ranking is still correct",
          "Roll back to the previous model version"
        ],
        answer: 1,
        why: "Ranking is intact, so only the probabilities need correcting: a prior correction or recalibration on recent labels. Ignoring it breaks every decision that uses the probability; old data or a rollback does not know the new rate." },
      { stem: "Why is retraining dangerous after a pipeline fault?",
        options: [
          "Retraining is too slow to fix it in time",
          "The model learns the fault and breaks when it is fixed",
          "Retraining cannot run while any input's PSI is above 0.25",
          "The fault erases the earlier training data"
        ],
        answer: 1,
        why: "A model retrained on income in units scored 0.719 on the broken feed, hiding the fault, and fails again when the units are corrected. Speed, PSI thresholds and data loss are not the issue." },
      { stem: "Input PSI rose to 0.95, but AUC and calibration held. What should you do first?",
        options: [
          "Retrain immediately on this week's newly arrived data",
          "Check validity and new segments; likely do nothing",
          "Roll back to the last model version before the shift",
          "Raise the PSI alarm threshold to 1.0 so it stops firing"
        ],
        answer: 1,
        why: "A P(X) shift with stable outcomes usually needs no model change; confirm the inputs are valid (not a pipeline fault) and that no new segment is poorly served. Retraining or rolling back changes nothing useful, and moving the threshold hides the next real fault." }
    ] },

  interview: { title: "In an interview",
    sub: "Drift questions reward separating the kinds before proposing a fix.",
    questions: [
      { level: "core",
        q: "Your model's performance dropped. How do you tell what kind of drift it is?",
        strong: "A strong answer checks the pipeline first, then uses inputs, outputs and labels to separate the cases.",
        answer: [
          { t: "p",
            text: "First rule out the pipeline: out-of-range values, new nulls or zeros, unit or category changes, schema changes. Then compare input distributions, the prediction distribution and, on whatever labels have arrived, AUC and calibration. Shifted inputs with stable AUC and calibration is P(X); stable inputs with falling AUC is P(Y|X); stable AUC with biased probabilities is P(Y). Each has its own response: nothing, retrain, recalibrate, or fix the data." }
        ] },
      { level: "advanced",
        q: "Should drift alerts trigger automatic retraining?",
        strong: "A strong answer explains which drifts retraining helps, and the gates it needs.",
        answer: [
          { t: "p",
            text: "Not directly. Input drift alerts fire on harmless P(X) shifts and on pipeline faults, where retraining learns the fault. Retraining helps P(Y|X), which input alerts cannot see. I would retrain on a schedule or on outcome degradation, gated by input validation and an evaluation against the current model on recent labelled data, and route input alerts to data-quality investigation instead." }
        ] },
      { level: "core",
        q: "What is label shift and how do you correct for it?",
        strong: "A strong answer defines it as a change in P(Y) with P(X|Y) fixed and gives a correction.",
        answer: [
          { t: "p",
            text: "The base rate of the outcome changes while each class's inputs look the same, as when a recession raises defaults across the board. Ranking is unaffected but probabilities are biased. If the new base rate is known or estimated from recent labels, adjust each prediction's odds by the ratio of new to old prior odds, or refit a calibration layer on recent data; thresholds and expected-value calculations then use the corrected probabilities." }
        ] }
    ] }
});
