/* ============================================================================
   LESSON 13.1 — The ML System Design Framework
   ========================================================================= */
EC.receiveLesson({
  id: "13.1",

  lede: "An ML system design interview looks like a system design interview with a model in the middle, and candidates who treat it that way spend the time on serving infrastructure and never say what the model predicts, how it will be judged, or what it is better than. The interviewer is waiting for three things a normal design does not have: a translation from the business goal into a prediction task with a label, a metric chosen for the cost of being wrong, and a baseline the model has to beat. This lesson gives the seven stages every answer walks through and measures why each of those three matters.",

  objectives: [
    "Translate a business goal into an ML task with a precise label and prediction time",
    "Choose offline and online metrics from the cost of errors, and set a decision threshold from them",
    "Build and measure baselines before proposing a model",
    "Recognise label leakage from the timing of features and labels",
    "Walk the seven stages of an ML design in interview time"
  ],

  prerequisites: ["2.5", "11.5"],

  blocks: [
    { t: "h2", n: "01", id: "framework", text: "Seven stages", sub: "The same skeleton for every ML design" },
    { t: "p",
      text: "Whatever the prompt (recommend videos, detect fraud, rank search results), the answer walks the same stages. The first two decide whether the rest is worth building, and they are the ones most often skipped." },
    { t: "viz",
      title: "The ML system design framework",
      caption: "Problem framing turns a goal into a prediction with a label. Metrics say how that prediction is judged offline and what it should move online. Data and features feed a model that starts as a baseline. Serving puts it in the request path or a batch job, and monitoring watches it decay and feeds new labels back.",
      svg: `<svg viewBox="0 0 760 220" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="140.0" y1="56.0" x2="165.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="295.0" y1="56.0" x2="320.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="450.0" y1="56.0" x2="475.0" y2="56.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="540.0" y1="82.0" x2="540.0" y2="150.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="475.0" y1="176.0" x2="450.0" y2="176.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="320.0" y1="176.0" x2="295.0" y2="176.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="263.6" y1="150.0" x2="351.4" y2="82.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="307.5" y="110.0" text-anchor="middle" class="s-sub">new labels</text>
<rect x="10" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="75.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">1 · Problem</text>
<text x="75.0" y="70" text-anchor="middle" class="s-sub">business goal -&gt; ML task</text>
<rect x="165" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="230.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--accent)">2 · Metrics</text>
<text x="230.0" y="70" text-anchor="middle" class="s-sub">offline + online</text>
<rect x="320" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="385.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--warn)">3 · Data</text>
<text x="385.0" y="70" text-anchor="middle" class="s-sub">labels, sources</text>
<rect x="475" y="30" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="540.0" y="52" text-anchor="middle" class="s-label" style="fill:var(--warn)">4 · Features</text>
<text x="540.0" y="70" text-anchor="middle" class="s-sub">batch, streaming</text>
<rect x="475" y="150" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="540.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--good)">5 · Model</text>
<text x="540.0" y="190" text-anchor="middle" class="s-sub">baseline first</text>
<rect x="320" y="150" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="385.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--good)">6 · Serving</text>
<text x="385.0" y="190" text-anchor="middle" class="s-sub">online or batch</text>
<rect x="165" y="150" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="230.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--violet)">7 · Monitoring</text>
<text x="230.0" y="190" text-anchor="middle" class="s-sub">drift, retraining</text>
</svg>` },
    { t: "table",
      head: ["Stage", "Questions to answer aloud", "Typical minutes"],
      rows: [
        ["1 · Problem", "What decision does the prediction drive? What is the label, and when is it known?", "5"],
        ["2 · Metrics", "Which error costs more? Offline metric, online metric, guardrails", "4"],
        ["3 · Data", "Where do labels come from, how delayed, how biased?", "4"],
        ["4 · Features", "What is known at prediction time? Batch or streaming?", "6"],
        ["5 · Model", "Baseline first, then the simplest model that beats it", "6"],
        ["6 · Serving", "Latency budget, online against batch, candidate generation and ranking", "8"],
        ["7 · Monitoring", "Drift, label delay, retraining trigger, A/B test", "5"]
      ] },
    { t: "h2",
      n: "02",
      id: "metrics",
      text: "Metrics from the cost of being wrong",
      sub: "Accuracy is the wrong default" },
    { t: "p",
      text: "Most production problems are imbalanced and their errors are asymmetric: a missed fraud costs far more than a blocked good order. The script trains a model on a problem with about 1% positives and prices its errors at $200 for a missed fraud and $5 for a blocked good order." },
    { t: "code",
      lang: "python",
      title: "framing.py — accuracy, PR-AUC and the cost-optimal threshold",
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, average_precision_score, roc_auc_score

# A fraud-like problem: 0.5% positives. The business cost: a missed fraud costs $200, a blocked good order $5.
X, y = make_classification(n_samples=200_000, n_features=20, n_informative=6, weights=[0.995], class_sep=1.0, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.5, random_state=0, stratify=y)
p = LogisticRegression(max_iter=2000).fit(Xtr, ytr).predict_proba(Xte)[:, 1]
MISS, FALSE_BLOCK = 200, 5

print(f"positives in test: {yte.mean():.2%}")
print(f"'predict nothing is fraud': accuracy {accuracy_score(yte, np.zeros_like(yte)):.2%}, catches 0 frauds")
print(f"model: ROC-AUC {roc_auc_score(yte, p):.3f}, PR-AUC {average_precision_score(yte, p):.3f} (a random model scores {yte.mean():.3f})")

def cost(th):
    pred = p >= th
    return MISS * ((~pred) & (yte == 1)).sum() + FALSE_BLOCK * (pred & (yte == 0)).sum()
print("\\nthreshold   blocked   frauds caught   cost per 100k orders")
for th in (0.5, 0.2, 0.1, 0.05, 0.02, 0.01):
    pred = p >= th
    print(f"{th:>9}   {pred.sum():>7}   {((pred) & (yte == 1)).sum():>5} of {yte.sum()}   \${cost(th) * 100_000 / len(yte):>12,.0f}")
best = min(np.linspace(0.005, 0.9, 400), key=cost)
print(f"cost-optimal threshold {best:.3f}; the default 0.5 costs {cost(0.5) / cost(best):.1f}x more")`,
      out: `positives in test: 0.99%
'predict nothing is fraud': accuracy 99.01%, catches 0 frauds
model: ROC-AUC 0.725, PR-AUC 0.198 (a random model scores 0.010)

threshold   blocked   frauds caught   cost per 100k orders
      0.5        14      14 of 990   $     195,200
      0.2        99      83 of 990   $     181,480
      0.1       434     183 of 990   $     162,655
     0.05      2135     314 of 990   $     144,305
     0.02     11609     458 of 990   $     162,155
     0.01     28850     610 of 990   $     217,200
cost-optimal threshold 0.048; the default 0.5 costs 1.4x more` },
    { t: "dl",
      items: [
        { term: "Accuracy rewards doing nothing",
          def: "Predicting 'not fraud' for every order scored 99% accuracy and caught nothing. On imbalanced problems report PR-AUC, recall at a fixed false-positive rate, or cost." },
        { term: "The threshold is a business decision",
          def: "At the default 0.5 the model blocked 14 orders and caught 14 frauds. The threshold that minimised cost was about 0.05, catching 314, and cost 1.4 times less. The model was identical; only the decision changed." },
        { term: "Offline metrics are proxies",
          def: "PR-AUC ranks models; the online metric (losses, revenue, engagement) decides whether to ship. Name both, plus guardrails such as latency and complaint rate." }
      ] },
    { t: "h2",
      n: "03",
      id: "baselines",
      text: "Baselines before models",
      sub: "Measure what the model has to beat" },
    { t: "p",
      text: "A recommendation prompt invites a two-tower model in the first five minutes. The script measures three non-learned baselines on synthetic interactions with popular items and per-user genre tastes." },
    { t: "code",
      lang: "python",
      title: "baseline.py — random, popular, and a heuristic that sounds smarter",
      code: `import numpy as np
rng = np.random.default_rng(1)

# Synthetic interactions: 20,000 users, 2,000 items, item popularity Zipf-like, plus a per-user taste for one of 10 genres.
U, I, G = 20_000, 2_000, 10
pop = 1 / np.arange(1, I + 1) ** 0.9; pop /= pop.sum()
genre = rng.integers(0, G, I); taste = rng.integers(0, G, U)
def sample_user(u, n):
    w = pop * np.where(genre == taste[u], 4.0, 1.0); w /= w.sum()
    return rng.choice(I, size=n, replace=False, p=w)
history = {u: sample_user(u, 30) for u in range(U)}
train = {u: h[:25] for u, h in history.items()}; test = {u: set(h[25:]) for u, h in history.items()}

def recall_at_10(recommend):
    return np.mean([len(set(recommend(u)) & test[u]) / len(test[u]) for u in range(0, U, 10)])

counts = np.bincount(np.concatenate(list(train.values())), minlength=I)
popular = np.argsort(-counts)
def rand(u): return rng.choice(I, 10, replace=False)
def most_popular(u): return [i for i in popular if i not in set(train[u])][:10]
def genre_popular(u):
    g = np.bincount(genre[train[u]], minlength=G).argmax()
    return [i for i in popular if genre[i] == g and i not in set(train[u])][:10]

for name, f in (("random", rand), ("most popular overall", most_popular), ("most popular in the user's top genre", genre_popular)):
    print(f"{name:<38} recall@10 {recall_at_10(f):.3f}")`,
      out: `random                                 recall@10 0.004
most popular overall                   recall@10 0.161
most popular in the user's top genre   recall@10 0.089` },
    { t: "callout",
      kind: "trap",
      title: "The clever heuristic lost to the simple one",
      body: [
        { t: "p",
          text: "Recommending the most popular items overall reached recall@10 of 0.161, forty times random. The heuristic that sounded better, popular items within the user's favourite genre, scored 0.089, because a genre guessed from 25 interactions is noisy and the filter throws away the popular items users also like. Measure baselines, including the obvious one; it is often the hardest to beat, and the model's value is its margin over it, not its absolute score." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Say the baseline and the margin out loud",
      body: [
        { t: "p",
          text: "'Popularity gets about 16% recall@10. A model has to beat that by enough to pay for training and serving it.' One sentence like that shows the interviewer you would ship the simple thing first and know what the model is for." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Find the leak in a churn model",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "A churn model predicts, on day 0, whether a customer cancels in days 1–30. Train it with features known on day 0, then add a feature counting logins in days 1–30, which a pipeline computed from the same month as the label. Compare the AUCs and explain what happens in production." }
      ],
      requirements: [
        "A synthetic customer table with tenure, usage, tickets and a churn label",
        "A model on day-0 features only, and its test AUC",
        "The same model with the overlapping-window feature, and its AUC",
        "Why the second number can never be reached in production"
      ],
      hint: "For every feature, write down the timestamp it is computed at and compare it with the prediction time. Anything computed after the prediction time is leakage, however useful it looks.",
      solution: { lang: "python",
        title: "churn_leakage.py",
        code: `import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(4)

# Churn: predict on day 0 whether a customer cancels in days 1-30.
n = 20_000
tenure = rng.exponential(24, n)                      # months
usage = rng.gamma(2, 5, n)                           # sessions per week
tickets = rng.poisson(0.5, n)                        # support tickets last month
risk = -1.5 - 0.04 * tenure - 0.12 * usage + 0.6 * tickets + rng.normal(0, 1, n)
churn = (rng.random(n) < 1 / (1 + np.exp(-risk))).astype(int)

# A feature computed over a window that overlaps the label: logins during days 1-30. Churners stop logging in.
logins_next_30d = np.where(churn == 1, rng.poisson(2, n), rng.poisson(12, n))

def auc(features):
    X = np.column_stack(features); tr = slice(0, n // 2); te = slice(n // 2, n)
    m = GradientBoostingClassifier(random_state=0).fit(X[tr], churn[tr])
    return roc_auc_score(churn[te], m.predict_proba(X[te])[:, 1])

print(f"churn rate {churn.mean():.1%}")
print(f"features known on day 0:                   AUC {auc([tenure, usage, tickets]):.3f}")
print(f"plus logins in days 1-30 (label window):   AUC {auc([tenure, usage, tickets, logins_next_30d]):.3f}  <- leakage")
print("in production the leaked feature does not exist yet on day 0, so the offline AUC can never be reached")`,
        out: `churn rate 8.1%
features known on day 0:                   AUC 0.728
plus logins in days 1-30 (label window):   AUC 0.998  <- leakage
in production the leaked feature does not exist yet on day 0, so the offline AUC can never be reached`,
        notes: [
          { t: "p",
            text: "With day-0 features the model reached AUC 0.73. Adding logins from days 1–30 took it to 0.998, a near-perfect model. Churners stop logging in, so the feature is the label in disguise. On day 0 in production, the logins of the next 30 days do not exist, so the feature is zero or missing, and the model's real performance is at best the 0.73 it had without it." },
          { t: "p",
            text: "The defence is structural: every training example is built 'as of' its prediction time, with features read from point-in-time snapshots (lesson 13.2), and an offline AUC far above what similar problems achieve is treated as a bug until proven otherwise." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the fraud model that met its AUC and lost money",
      body: [
        { t: "p",
          text: "**Symptom.** A new fraud model beat the old one on offline ROC-AUC, 0.94 against 0.91, and was rolled out. Over the next month chargeback losses rose and customer complaints about blocked payments doubled." },
        { t: "p",
          text: "**Mechanism.** The new model's scores were calibrated differently, and it shipped with the old model's threshold. At that threshold it blocked more good orders and caught fewer high-value frauds. ROC-AUC measures ranking across all thresholds; the business only experiences one threshold, and nobody had re-derived it." },
        { t: "p",
          text: "**Fix.** Model launches now include a threshold chosen on validation data from the cost matrix, approved by the fraud team. The launch gate compares expected cost at the operating point, not AUC. An A/B test with losses and false-block rate as the primary metrics runs before full rollout." }
      ] }
  ],

  takeaways: [
    "Every ML design walks **seven stages**: problem, metrics, data, features, model, serving, monitoring.",
    "Frame the task as a **prediction with a label and a prediction time**; most later mistakes trace back to this step.",
    "On a 1%-positive problem, predicting nothing scored **99% accuracy**; report **PR-AUC**, recall at fixed FPR, or **cost**.",
    "The **threshold** is a business decision: the cost-optimal threshold (~0.05) cost **1.4× less** than the default 0.5.",
    "Measure **baselines** first: popularity reached recall@10 **0.161**, 40× random.",
    "A heuristic that sounded smarter scored **0.089** and lost to plain popularity.",
    "A feature from the label window took AUC from **0.73 to 0.998**; that is **leakage**, unreachable in production.",
    "Name the **offline** metric, the **online** metric and the **guardrails** separately."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A fraud dataset is 1% fraud. A model reports 99% accuracy. What can you conclude?",
        options: [
          "The model is excellent and ready to ship",
          "Nothing: predicting no fraud scores 99%",
          "The model catches 99% of all frauds",
          "The data must be balanced first"
        ],
        answer: 1,
        why: "With 1% positives, a model that never predicts fraud is 99% accurate and catches none. Accuracy says nothing about recall here. Rebalancing data is one tool, not a conclusion from the number." },
      { stem: "A missed fraud costs $200 and a blocked good order $5. How should the decision threshold be set?",
        options: [
          "Use the default of 0.5, as most libraries do",
          "Minimise expected cost on validation data",
          "Pick the one that maximises plain accuracy",
          "Use whichever threshold maximises ROC-AUC"
        ],
        answer: 1,
        why: "The cost matrix makes errors unequal, so the right threshold is where expected cost is lowest; measured, about 0.05, 1.4 times cheaper than 0.5. Accuracy ignores the costs, and ROC-AUC is threshold-free." },
      { stem: "A recommendation candidate proposes a deep model in the first minute. What is missing?",
        options: [
          "A larger GPU budget for training",
          "A baseline the model must beat",
          "A second, competing deep model",
          "Real-time features from day one"
        ],
        answer: 1,
        why: "Without a baseline there is no way to know whether the model is worth its cost; popularity alone reached 40 times random recall. GPUs, rival models and real-time features all come after that question." },
      { stem: "An offline churn AUC jumps from 0.73 to 0.998 after adding one feature. What is the most likely explanation?",
        options: [
          "The feature is very predictive and should ship",
          "It is computed after prediction time: leakage",
          "The test set is too small to trust",
          "The model is now overfitting the training set"
        ],
        answer: 1,
        why: "A near-perfect jump from one feature usually means the feature encodes the label, here logins during the churn window. Small test sets and overfitting lower test AUC rather than raise it." }
    ] },

  interview: { title: "In an interview",
    sub: "Interviewers use the first ten minutes of an ML design to see whether you frame before you build.",
    questions: [
      { level: "core",
        q: "Design a system to detect fraudulent transactions. Where do you start?",
        strong: "A strong answer frames the prediction, the label and its delay, the cost asymmetry, and the baseline before any architecture.",
        answer: [
          { t: "p",
            text: "With the decision: approve, block, or send to review at payment time, within about 100 ms. The label is a confirmed chargeback or a fraud-team verdict, which arrives days to weeks later, so training data lags and recent fraud patterns are under-labelled. Errors are asymmetric, so I would choose the threshold, or two thresholds with a review band in between, from the cost of a missed fraud against the cost of a blocked good customer." },
          { t: "p",
            text: "The baseline is the current rules engine, and the model has to beat it on expected cost at the operating point. Online, I would watch fraud losses, false-block rate and review-queue size, with latency as a guardrail." }
        ] },
      { level: "core",
        q: "How do you choose an offline metric?",
        strong: "A strong answer ties the metric to class balance, the error costs and how predictions are used.",
        answer: [
          { t: "p",
            text: "From how the prediction is used. For ranked lists, recall@k or NDCG on held-out interactions. For imbalanced binary decisions, PR-AUC to compare models, then cost or recall at a fixed false-positive rate at the chosen threshold. For probabilities used directly, such as bids, calibration as well as ranking. The offline metric only has to correlate with the online one, and I would check that correlation on past launches before trusting it." }
        ] },
      { level: "advanced",
        q: "Your offline metric improved but the A/B test was flat. What do you investigate?",
        strong: "A strong answer considers metric mismatch, threshold, leakage, training-serving skew and the experiment itself.",
        answer: [
          { t: "p",
            text: "Whether the offline metric measures what users experience, for example whole-list ranking when only the top three items are seen. Whether the threshold or calibration changed with the model. Whether the offline gain came from leakage or from a feature that is computed differently in serving (lesson 13.2). And whether the experiment had the power to detect the expected effect, or was diluted by users who never saw the changed surface." }
        ] }
    ] }
});
