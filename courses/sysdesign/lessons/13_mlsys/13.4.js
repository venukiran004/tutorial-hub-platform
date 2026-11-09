/* ============================================================================
   LESSON 13.4 — Monitoring, Retraining and Experiments
   ========================================================================= */
EC.receiveLesson({
  id: "13.4",

  lede: "A model starts decaying the day it ships, because the world it learned from keeps changing. Monitoring has to tell two kinds of change apart. The inputs can shift while the relationship to the outcome holds, and the model is fine. Or the relationship can change while the inputs look identical, and the model is quietly wrong. Labels arrive late, so accuracy cannot be measured in real time, and retraining always lags. When a new model is ready, an A/B test decides whether it ships, and a badly run one decides at random. This lesson measures drift, the retraining lag, the cost of peeking at experiments, and a fairness gap that aggregate numbers hide.",

  objectives: [
    "Distinguish data drift from concept drift, and know which one input monitoring can see",
    "Account for label delay in monitoring and retraining",
    "Compare scheduled and triggered retraining policies",
    "Size an A/B test for a model and avoid the peeking problem",
    "Roll out models with shadow and canary stages, and check fairness per group"
  ],

  prerequisites: ["13.1", "13.2", "11.5"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "drift",
      text: "Data drift and concept drift",
      sub: "Only one of them shows in the inputs" },
    { t: "p",
      text: "Data drift is a change in the distribution of inputs: new markets, a marketing campaign, a seasonal mix. Concept drift is a change in how inputs relate to the outcome: fraudsters adapt, prices change what customers want. The simulation deploys a model and changes both over a year: one feature's distribution shifts from month 4, and the meaning of another flips in month 7. Labels arrive a month late." },
    { t: "code",
      lang: "python",
      title: "drift.py — input monitoring, accuracy and retraining over a year",
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(0)

def month(m, n=4000):
    """Two features. From month 4 the input mix shifts (data drift); from month 7 the relationship itself changes (concept drift)."""
    x1 = rng.normal(0.25 * max(0, m - 3), 1, n)               # covariate shift: x1's mean creeps up
    x2 = rng.normal(0, 1, n)
    w2 = 1.5 if m < 7 else -0.5                               # concept drift: x2 stops predicting, then reverses
    p = 1 / (1 + np.exp(-(1.2 * x1 + w2 * x2 - 0.5)))
    return np.column_stack([x1, x2]), (rng.random(n) < p).astype(int)

def psi(a, b, bins=10):
    e = np.quantile(a, np.linspace(0, 1, bins + 1)); e[0], e[-1] = -np.inf, np.inf
    pa = np.histogram(a, e)[0] / len(a) + 1e-6; pb = np.histogram(b, e)[0] / len(b) + 1e-6
    return float(((pa - pb) * np.log(pa / pb)).sum())

data = [month(m) for m in range(13)]
X0, y0 = data[0]
policies = {"never retrain": {}, "retrain monthly": {}, "retrain on drift alert": {}}
models = {k: LogisticRegression().fit(X0, y0) for k in policies}
ref = {k: X0 for k in policies}
LABEL_DELAY = 1                                               # labels for month m arrive in month m+1
print("month   PSI(x1)  PSI(x2)   AUC never   AUC monthly   AUC on-alert")
rows = []
for m in range(1, 13):
    X, y = data[m]
    aucs = {k: roc_auc_score(y, models[k].predict_proba(X)[:, 1]) for k in policies}
    p1, p2 = psi(ref["never retrain"][:, 0], X[:, 0]), psi(ref["never retrain"][:, 1], X[:, 1])
    print(f"{m:5}   {p1:7.2f}  {p2:7.2f}   {aucs['never retrain']:9.3f}   {aucs['retrain monthly']:11.3f}   {aucs['retrain on drift alert']:12.3f}")
    rows.append(aucs)
    Xl, yl = data[m - LABEL_DELAY]                            # the newest month whose labels have arrived
    models["retrain monthly"] = LogisticRegression().fit(Xl, yl)
    if psi(ref["retrain on drift alert"][:, 0], X[:, 0]) > 0.25 or aucs["retrain on drift alert"] < 0.75:
        models["retrain on drift alert"] = LogisticRegression().fit(Xl, yl); ref["retrain on drift alert"] = Xl
print("mean AUC:", {k: round(float(np.mean([r[k] for r in rows])), 3) for k in policies})`,
      out: `month   PSI(x1)  PSI(x2)   AUC never   AUC monthly   AUC on-alert
    1      0.00     0.00       0.859         0.859          0.859
    2      0.00     0.00       0.862         0.862          0.862
    3      0.00     0.01       0.861         0.861          0.861
    4      0.07     0.01       0.853         0.853          0.853
    5      0.28     0.01       0.858         0.858          0.858
    6      0.55     0.00       0.856         0.856          0.856
    7      0.94     0.00       0.574         0.579          0.568
    8      1.46     0.00       0.564         0.568          0.568
    9      1.99     0.01       0.585         0.793          0.793
   10      2.64     0.01       0.587         0.809          0.809
   11      3.34     0.01       0.587         0.790          0.790
   12      4.09     0.01       0.556         0.789          0.788
mean AUC: {'never retrain': 0.717, 'retrain monthly': 0.79, 'retrain on drift alert': 0.789}` },
    { t: "viz",
      title: "AUC over the year, with and without retraining",
      caption: "Months 4–6: the first feature's PSI climbed past 0.5, a 'severe drift' alarm, and AUC did not move, because the model still described the relationship correctly. Month 7: the relationship changed, the inputs looked identical (PSI 0.00 on the second feature), and AUC fell from 0.86 to 0.57. Monthly retraining recovered to about 0.80, but only from month 9, because labels for month 7 arrived at the end of month 8.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0.5</text>
<line x1="64" y1="182.8" x2="610" y2="182.8" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="186.8" text-anchor="end" class="s-sub">0.6</text>
<line x1="64" y1="141.6" x2="610" y2="141.6" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="145.6" text-anchor="end" class="s-sub">0.7</text>
<line x1="64" y1="100.4" x2="610" y2="100.4" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="104.4" text-anchor="end" class="s-sub">0.8</text>
<line x1="64" y1="59.2" x2="610" y2="59.2" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="63.2" text-anchor="end" class="s-sub">0.9</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">1.0</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">1</text>
<text x="113.6" y="242" text-anchor="middle" class="s-sub">2</text>
<text x="163.3" y="242" text-anchor="middle" class="s-sub">3</text>
<text x="212.9" y="242" text-anchor="middle" class="s-sub">4</text>
<text x="262.5" y="242" text-anchor="middle" class="s-sub">5</text>
<text x="312.2" y="242" text-anchor="middle" class="s-sub">6</text>
<text x="361.8" y="242" text-anchor="middle" class="s-sub">7</text>
<text x="411.5" y="242" text-anchor="middle" class="s-sub">8</text>
<text x="461.1" y="242" text-anchor="middle" class="s-sub">9</text>
<text x="510.7" y="242" text-anchor="middle" class="s-sub">10</text>
<text x="560.4" y="242" text-anchor="middle" class="s-sub">11</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">12</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">month after deployment</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">AUC on that month's traffic</text>
<polyline points="64.0,76.1 113.6,74.9 163.3,75.3 212.9,78.6 262.5,76.5 312.2,77.3 361.8,193.5 411.5,197.6 461.1,189.0 510.7,188.2 560.4,188.2 610.0,200.9" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="76.1" r="2" style="fill:var(--crit)"/>
<circle cx="113.6" cy="74.9" r="2" style="fill:var(--crit)"/>
<circle cx="163.3" cy="75.3" r="2" style="fill:var(--crit)"/>
<circle cx="212.9" cy="78.6" r="2" style="fill:var(--crit)"/>
<circle cx="262.5" cy="76.5" r="2" style="fill:var(--crit)"/>
<circle cx="312.2" cy="77.3" r="2" style="fill:var(--crit)"/>
<circle cx="361.8" cy="193.5" r="2" style="fill:var(--crit)"/>
<circle cx="411.5" cy="197.6" r="2" style="fill:var(--crit)"/>
<circle cx="461.1" cy="189.0" r="2" style="fill:var(--crit)"/>
<circle cx="510.7" cy="188.2" r="2" style="fill:var(--crit)"/>
<circle cx="560.4" cy="188.2" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="200.9" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">never retrain</text>
<polyline points="64.0,76.1 113.6,74.9 163.3,75.3 212.9,78.6 262.5,76.5 312.2,77.3 361.8,191.5 411.5,196.0 461.1,103.3 510.7,96.7 560.4,104.5 610.0,104.9" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="76.1" r="2" style="fill:var(--good)"/>
<circle cx="113.6" cy="74.9" r="2" style="fill:var(--good)"/>
<circle cx="163.3" cy="75.3" r="2" style="fill:var(--good)"/>
<circle cx="212.9" cy="78.6" r="2" style="fill:var(--good)"/>
<circle cx="262.5" cy="76.5" r="2" style="fill:var(--good)"/>
<circle cx="312.2" cy="77.3" r="2" style="fill:var(--good)"/>
<circle cx="361.8" cy="191.5" r="2" style="fill:var(--good)"/>
<circle cx="411.5" cy="196.0" r="2" style="fill:var(--good)"/>
<circle cx="461.1" cy="103.3" r="2" style="fill:var(--good)"/>
<circle cx="510.7" cy="96.7" r="2" style="fill:var(--good)"/>
<circle cx="560.4" cy="104.5" r="2" style="fill:var(--good)"/>
<circle cx="610.0" cy="104.9" r="2" style="fill:var(--good)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">retrain monthly</text>
</svg>` },
    { t: "callout",
      kind: "trap",
      title: "Input drift alarms are neither necessary nor sufficient",
      body: [
        { t: "p",
          text: "The largest PSI in the year (4.1) came with an unchanged AUC, and the real failure produced no input drift at all. Input monitoring is cheap and catches pipeline bugs and population shifts, but it cannot see concept drift. That needs outcome monitoring: delayed labels, proxies such as complaint or chargeback rates, and the model's own score distribution and calibration over time." }
      ] },
    { t: "dl",
      items: [
        { term: "Label delay sets the lag",
          def: "With one month of delay, the earliest a retrained model can learn a change is one month after it happens, and it reaches production a month later still. Shorter label loops (proxies, faster feedback) shorten everything." },
        { term: "Scheduled or triggered",
          def: "Monthly retraining and drift-triggered retraining scored the same mean AUC here (0.790 and 0.789), against 0.717 for never retraining. Scheduled retraining is simpler and catches what alarms miss; triggers add retraining when something moves between schedules." },
        { term: "Retraining needs a gate",
          def: "An automatic retrain must pass the same offline evaluation and comparison against the current model as a manual one, or a bad batch of data ships a bad model on schedule." }
      ] },
    { t: "h2", n: "02", id: "experiments", text: "Shipping a new model", sub: "Shadow, canary, A/B test" },
    { t: "p",
      text: "A new model goes through three stages. In **shadow** it scores live traffic without affecting users, which catches crashes, latency and skew. In a **canary** a few percent of traffic is served by it, with automatic rollback on guardrail breaches. In an **A/B test** it is compared with the current model on the online metric, with enough users to detect the difference that matters." },
    { t: "code",
      lang: "python",
      title: "abtest.py — sample size and the cost of peeking",
      code: `import math, random

# Sample size: detect a 2% relative lift in click-through from a 3.0% baseline, 5% significance, 80% power.
p, lift = 0.030, 0.02
p2 = p * (1 + lift)
z_a, z_b = 1.96, 0.84
n = (z_a * math.sqrt(2 * p * (1 - p)) + z_b * math.sqrt(p * (1 - p) + p2 * (1 - p2))) ** 2 / (p2 - p) ** 2
print(f"users per arm to detect +{lift:.0%} on {p:.1%} CTR: {n:,.0f}")

# Peeking: run A/A tests (no real difference) for 20 days and stop the first day |z| > 1.96.
rng = random.Random(9)
def aa_test(days=20, users_per_day=20_000, peek=True):
    ca = cb = na = nb = 0
    for d in range(days):
        for _ in range(users_per_day // 2000):                     # batches keep the simulation fast
            na += 2000; nb += 2000
            ca += sum(rng.random() < p for _ in range(2000)); cb += sum(rng.random() < p for _ in range(2000))
        if peek or d == days - 1:
            pa, pb = ca / na, cb / nb; pool = (ca + cb) / (na + nb)
            z = (pa - pb) / math.sqrt(pool * (1 - pool) * (1 / na + 1 / nb))
            if abs(z) > 1.96: return True
    return False
trials = 300
fp_peek = sum(aa_test(peek=True) for _ in range(trials)) / trials
fp_fixed = sum(aa_test(peek=False) for _ in range(trials)) / trials
print(f"A/A tests declared 'significant': checking daily {fp_peek:.0%}, checking once at the end {fp_fixed:.0%} (nominal 5%)")`,
      out: `users per arm to detect +2% on 3.0% CTR: 1,271,143
A/A tests declared 'significant': checking daily 23%, checking once at the end 6% (nominal 5%)` },
    { t: "dl",
      items: [
        { term: "Small lifts need large samples",
          def: "Detecting a 2% relative lift on a 3% click-through rate takes about 1.3 million users per arm. Decide the minimum effect worth shipping before the test, and size it for that." },
        { term: "Peeking inflates false positives",
          def: "Checking an A/A test daily and stopping at the first significant result declared a difference 23% of the time, against the nominal 5%. Fix the duration in advance, or use sequential methods designed for continuous monitoring." },
        { term: "Guardrails",
          def: "Latency, error rate, complaints and revenue per user are watched in every arm. A model that wins the primary metric and breaks a guardrail does not ship." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Offline wins are hypotheses",
      body: [
        { t: "p",
          text: "Most offline improvements do not survive an online test, because the offline metric is a proxy and the online system reacts: users see different items, which changes what they click, which changes the next training set. Treat an offline gain as the reason to run an experiment, not as the result." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A fairness check per group",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "A loan-approval model is trained on an income signal that is measured more noisily for a smaller group B, for example people with thin credit files. At a single threshold of 0.6, compute each group's approval rate, the share of repayers approved (true-positive rate), the share of defaulters approved (false-positive rate), and the accuracy, overall and per group." }
      ],
      requirements: [
        "A synthetic population where group B's feature is noisier but repayment depends on the same underlying ability",
        "Approval, TPR and FPR per group at one threshold",
        "The equal-opportunity gap (difference in TPR)",
        "Overall and per-group accuracy, and what the overall figure hides"
      ],
      hint: "Compute every rate within each group separately. A metric averaged over everyone is weighted towards the larger group.",
      solution: { lang: "python",
        title: "fairness_check.py",
        code: `import numpy as np
from sklearn.linear_model import LogisticRegression
rng = np.random.default_rng(6)

# A loan-approval model. Group B is a fifth of applicants and its income feature is measured more noisily
# (thin credit files), so the model is less sure about group B's good applicants.
n = 50_000
group = np.where(rng.random(n) < 0.2, "B", "A")
ability = rng.normal(0, 1, n)                                  # what actually predicts repayment
noise = np.where(group == "B", 1.4, 0.5)
income_signal = ability + rng.normal(0, 1, n) * noise
repaid = (rng.random(n) < 1 / (1 + np.exp(-(1.6 * ability + 0.4)))).astype(int)

m = LogisticRegression().fit(income_signal[:, None][: n // 2], repaid[: n // 2])
te = slice(n // 2, n); s = m.predict_proba(income_signal[:, None][te])[:, 1]; y = repaid[te]; g = group[te]

def rates(th):
    out = {}
    for k in ("A", "B"):
        sel = g == k; approve = s[sel] >= th
        out[k] = dict(approve=approve.mean(), tpr=approve[y[sel] == 1].mean(), fpr=approve[y[sel] == 0].mean())
    return out

r = rates(0.6)
print("one threshold 0.60:")
for k in ("A", "B"): print(f"  group {k}: approval {r[k]['approve']:.0%}  repayers approved (TPR) {r[k]['tpr']:.0%}  defaulters approved (FPR) {r[k]['fpr']:.0%}")
print(f"  equal-opportunity gap (TPR A - TPR B): {r['A']['tpr'] - r['B']['tpr']:.0%}")

# Overall accuracy hides it.
print(f"  overall accuracy {((s >= 0.6) == y).mean():.1%}; accuracy on A {(((s >= 0.6) == y)[g == 'A']).mean():.1%}, on B {(((s >= 0.6) == y)[g == 'B']).mean():.1%}")`,
        out: `one threshold 0.60:
  group A: approval 47%  repayers approved (TPR) 65%  defaulters approved (FPR) 23%
  group B: approval 48%  repayers approved (TPR) 59%  defaulters approved (FPR) 33%
  equal-opportunity gap (TPR A - TPR B): 6%
  overall accuracy 68.3%; accuracy on A 69.8%, on B 62.4%`,
        notes: [
          { t: "p",
            text: "Both groups were approved at almost the same rate (47% and 48%), so a check on approval rates alone, demographic parity, would pass. The errors differ: group B's repayers were approved 59% of the time against 65% for group A, and its defaulters 33% against 23%. The model is less able to tell group B's applicants apart, so good applicants are turned away and bad ones let through more often." },
          { t: "p",
            text: "Overall accuracy, 68%, hides it; group B's is 62% against group A's 70%. The fix is not a different threshold for B alone, which trades one gap for another, but better information for B (alternative data, a model that knows the measurement is noisier), with per-group TPR and FPR monitored in production, because the gap can change as the population changes." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the fraud model that went quiet",
      body: [
        { t: "p",
          text: "**Symptom.** Chargebacks rose steadily for six weeks while every fraud-model dashboard was green: no feature drift alarms, stable score distributions, normal latency." },
        { t: "p",
          text: "**Mechanism.** Fraudsters had moved to a new pattern that used normal-looking transactions, so inputs did not drift; the relationship between inputs and fraud had changed. Chargebacks arrive four to eight weeks after a transaction, and accuracy monitoring used them, so the model's degradation became visible only when the losses were already booked." },
        { t: "p",
          text: "**Fix.** The team added faster proxies to monitoring: customer fraud reports within days, manual-review outcomes and issuer alerts, each tracked against the model's scores. A weekly retrain on the freshest labels replaced quarterly retraining, and a challenger model trained on recent data runs permanently in shadow, so a gap between the two shows concept drift early." }
      ] }
  ],

  takeaways: [
    "**Data drift** changes inputs; **concept drift** changes the input-outcome relationship. Input monitoring sees only the first.",
    "Measured: PSI reached **4.1** with no AUC loss, while concept drift dropped AUC from **0.86 to 0.57** with input PSI at **0.00**.",
    "**Label delay** sets the retraining lag: monthly retraining recovered only **two months** after the change.",
    "Retraining on a schedule and on drift alerts scored alike (**0.790** vs **0.789** mean AUC) against **0.717** never retraining.",
    "Gate automatic retrains with the same evaluation as manual ones.",
    "Ship through **shadow**, **canary** and **A/B** stages, with guardrail metrics in every arm.",
    "A **2%** lift on a **3%** CTR needs about **1.3M** users per arm; decide the minimum effect first.",
    "**Peeking** daily made A/A tests 'significant' **23%** of the time against a nominal **5%**.",
    "Check fairness **per group**: equal approval rates (**47% vs 48%**) hid a **6-point** TPR gap and a **10-point** FPR gap."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A feature's PSI jumps to 2.0 but the model's AUC on fresh labels is unchanged. What happened?",
        options: [
          "Concept drift that the labels have not yet shown",
          "Data drift; the relationship still holds",
          "A bug somewhere in the AUC computation itself",
          "Both kinds of drift, which happened to cancel out"
        ],
        answer: 1,
        why: "The input distribution moved, but the model's mapping from inputs to outcomes still matches reality, so ranking quality held, as in months 4–6 of the simulation. Concept drift would lower AUC once labels arrive." },
      { stem: "Why can input-distribution monitoring miss the most damaging kind of drift?",
        options: [
          "PSI is far too noisy a statistic to rely on",
          "Concept drift can leave inputs unchanged",
          "Inputs are logged only once a day, too rarely",
          "Drift alarms are usually switched off in practice"
        ],
        answer: 1,
        why: "When the relationship changes but inputs look the same, as when fraudsters adopt normal-looking behaviour, input statistics show nothing. Only outcomes, labels or proxies, reveal it." },
      { stem: "An A/B test is checked every day and stopped as soon as p < 0.05. What is the problem?",
        options: [
          "Daily checks slow the whole experiment down",
          "Repeated looks inflate false positives",
          "p-values cannot be computed on daily data",
          "It needs a larger significance level to work"
        ],
        answer: 1,
        why: "Each look is another chance for noise to cross the threshold; daily peeking flagged 23% of A/A tests. Fix the horizon in advance or use a sequential test." },
      { stem: "Two groups have equal approval rates. What can you conclude about fairness?",
        options: [
          "The model treats both groups equally fairly",
          "Little: compare per-group error rates",
          "Group B needs a lower decision threshold",
          "Overall accuracy must be equal across groups"
        ],
        answer: 1,
        why: "Equal approval rates can hide different true- and false-positive rates, as in the exercise (TPR 65% against 59%). Changing one group's threshold or comparing overall accuracy does not answer the question." }
    ] },

  interview: { title: "In an interview",
    sub: "Monitoring and experimentation are where ML design answers usually stop too early.",
    questions: [
      { level: "core",
        q: "How would you monitor a model in production?",
        strong: "A strong answer covers inputs, outputs, outcomes with their delay, system health and per-segment views.",
        answer: [
          { t: "p",
            text: "Four layers. System health: latency, errors, throughput. Inputs: per-feature distributions against training with PSI, plus missing-value and range checks, which catch pipeline bugs. Outputs: the score distribution and the share of decisions per class, which shift quickly when something breaks. Outcomes: accuracy and calibration on labels as they arrive, and faster proxies where labels are slow." },
          { t: "p",
            text: "All of it sliced by important segments, because aggregate metrics hide a failing region or group, and each alert routed to someone who knows what to do with it." }
        ] },
      { level: "core",
        q: "How do you decide when to retrain?",
        strong: "A strong answer combines a schedule, triggers and an evaluation gate, and accounts for label delay.",
        answer: [
          { t: "p",
            text: "A schedule matched to how fast the domain changes and how quickly labels arrive (weekly for fraud, monthly for slower problems), plus triggers when outcome metrics or proxies degrade. Every retrained model passes an evaluation gate against the current one on recent data before a canary. I would also keep a challenger trained on the freshest data in shadow, because a gap between it and production is an early sign of concept drift." }
        ] },
      { level: "advanced",
        q: "Your A/B test shows a 0.4% lift that is 'significant'. Do you ship?",
        strong: "A strong answer checks power, peeking, guardrails, novelty effects and practical significance.",
        answer: [
          { t: "p",
            text: "Not on that alone. I would check that the test ran to its pre-planned size without stopping early, that guardrail metrics held in every segment, that the effect is stable over time rather than a novelty spike, and that 0.4% clears the minimum effect worth the new model's cost and risk. If the test was stopped on a peek, I would rerun it with a fixed horizon. If all holds, ship gradually with monitoring, and keep a holdout to measure the long-term effect." }
        ] }
    ] }
});
