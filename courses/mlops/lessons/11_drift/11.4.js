/* ============================================================================
   LESSON 11.4 — Responding: Retrain, Reweight, Roll Back
   ========================================================================= */
EC.receiveLesson({
  id: "11.4",

  lede: "Once degradation is confirmed and diagnosed, there is a ladder of responses: retrain on a schedule, retrain when a trigger fires, weight recent data more heavily, update the model continuously, or train challengers in the shadow and promote them only when they win. Each costs something different, in compute, in engineering, and in risk. All of them depend on labels, so the delay before labels arrive decides how well any of them can work. This lesson runs the whole ladder through a year of gradual drift, measures the effect of label delay, and then tests the promotion gate that decides whether a new model replaces the old.",

  objectives: [
    "Compare scheduled, triggered, recency-weighted, online and shadow-challenger responses on the same drift",
    "Measure how label delay limits every response",
    "Decide when rollback is the right response instead",
    "Build a promotion gate that compares models on the same rows",
    "Weigh each response's costs: compute, complexity and risk"
  ],

  prerequisites: ["11.1", "11.3"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "ladder",
      text: "The response ladder",
      sub: "Six policies through one year of drift" },
    { t: "p",
      text: "The simulation drifts a model's true weights by a quarter turn over a year, 800 labelled decisions a day, with labels arriving 14 days late. Every policy starts from the same model trained on the last 90 days. The script reports mean AUC, the worst 30-day stretch, and how many models each policy trained or promoted." },
    { t: "code",
      lang: "python",
      title: "respond.py — six responses to gradual drift, and the effect of label delay",
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(6)
DAYS, N = 365, 800                                         # a year, 800 labelled decisions a day

# Gradual drift: the weights rotate slowly through the year.
def weights(day):
    a = 2 * np.pi * day / 1460                              # a quarter turn a year
    return np.array([1.5 * np.cos(a), 1.5 * np.sin(a), 0.7, -0.5])
data = []
for d in range(-120, DAYS):
    X = rng.normal(size=(N, 4)); y = (rng.random(N) < 1 / (1 + np.exp(-(X @ weights(d))))).astype(int); data.append((X, y))
def day(d): return data[d + 120]

def fit(days, half_life=None):
    X = np.vstack([day(d)[0] for d in days]); y = np.concatenate([day(d)[1] for d in days])
    w = None
    if half_life: w = np.concatenate([np.full(N, 0.5 ** ((days[-1] - d) / half_life)) for d in days])
    return LogisticRegression().fit(X, y, sample_weight=w)

def run(policy, delay):
    model = fit(list(range(-90, 0))); aucs, retrains = [], 0
    sgd = SGDClassifier(loss="log_loss", alpha=1e-4, learning_rate="constant", eta0=0.01, random_state=0)
    if policy == "online": sgd.partial_fit(np.vstack([day(d)[0] for d in range(-90, 0)]), np.concatenate([day(d)[1] for d in range(-90, 0)]), [0, 1])
    for d in range(DAYS):
        X, y = day(d)
        scorer = sgd if policy == "online" else model
        aucs.append(roc_auc_score(y, scorer.predict_proba(X)[:, 1]))
        known = d - delay                                   # the newest day whose labels have arrived
        if policy == "monthly" and d % 30 == 29:
            model = fit(list(range(known - 90, known + 1))); retrains += 1
        elif policy == "recency-weighted" and d % 30 == 29:
            model = fit(list(range(known - 240, known + 1)), half_life=30); retrains += 1
        elif policy == "triggered" and d % 7 == 6:          # weekly check on the latest labelled week
            recent = [day(k) for k in range(known - 6, known + 1)]
            auc_recent = roc_auc_score(np.concatenate([r[1] for r in recent]), model.predict_proba(np.vstack([r[0] for r in recent]))[:, 1])
            if auc_recent < 0.80: model = fit(list(range(known - 90, known + 1))); retrains += 1
        elif policy == "shadow challenger" and d % 7 == 6:  # train weekly, promote only if better on held-out recent labels
            cand = fit(list(range(known - 97, known - 6)))
            hold = [day(k) for k in range(known - 6, known + 1)]
            Xh, yh = np.vstack([h[0] for h in hold]), np.concatenate([h[1] for h in hold])
            if roc_auc_score(yh, cand.predict_proba(Xh)[:, 1]) > roc_auc_score(yh, model.predict_proba(Xh)[:, 1]) + 0.002:
                model = cand; retrains += 1
        elif policy == "online" and known >= 0:
            Xk, yk = day(known); sgd.partial_fit(Xk, yk)
    return np.mean(aucs), np.min(np.convolve(aucs, np.ones(30) / 30, "valid")), retrains

print(f"labels arrive 14 days late")
print(f"{'policy':<20}{'mean AUC':>9}{'worst month':>12}{'models trained / promoted':>27}")
for p in ("never", "monthly", "triggered", "recency-weighted", "online", "shadow challenger"):
    m, w, r = run(p, 14)
    print(f"{p:<20}{m:>9.3f}{w:>12.3f}{r:>27}")
print("\\nthe same policies as label delay grows (mean AUC):")
print(f"{'delay':>6}" + "".join(f"{p:>14}" for p in ("never", "monthly", "online", "challenger")))
for delay in (1, 14, 60, 120):
    print(f"{delay:>4} d" + "".join(f"{run(p, delay)[0]:>14.3f}" for p in ("never", "monthly", "online", "shadow challenger")))`,
      out: `labels arrive 14 days late
policy               mean AUC worst month  models trained / promoted
never                   0.707       0.549                          0
monthly                 0.823       0.815                         12
triggered               0.812       0.789                          4
recency-weighted        0.825       0.817                         12
online                  0.835       0.830                          0
shadow challenger       0.824       0.816                         31

the same policies as label delay grows (mean AUC):
 delay         never       monthly        online    challenger
   1 d         0.707         0.827         0.836         0.828
  14 d         0.707         0.823         0.835         0.824
  60 d         0.707         0.803         0.826         0.805
 120 d         0.707         0.771         0.803         0.776` },
    { t: "table",
      head: ["Response", "Mean AUC", "Models", "Costs and risks"],
      rows: [
        ["Never retrain", "0.707", "0", "Quality falls with the world"],
        ["Monthly retrain, last 90 days", "0.823", "12", "Simple; compute on a schedule whether needed or not"],
        ["Triggered (recent AUC < 0.80)", "0.812", "4", "Cheapest; waits for damage before acting"],
        ["Recency-weighted, half-life 30 days", "0.825", "12", "Uses more history; one more parameter to tune"],
        [
          "Online (daily SGD updates)",
          "0.835",
          "continuous",
          "Best here; harder to validate, roll back and protect from bad data"
        ],
        ["Weekly shadow challenger", "0.824", "31 promoted", "Every promotion is tested; needs an evaluation gate"]
      ] },
    { t: "dl",
      items: [
        { term: "Any retraining beat none by a wide margin",
          def: "0.707 against 0.81–0.84. The differences between the retraining policies were small next to that." },
        { term: "Triggered retraining was cheapest",
          def: "Four retrains for 0.812, against twelve for 0.823 on a schedule. A trigger reacts after quality has already fallen, which is the price of the saving." },
        { term: "Online learning won, with caveats",
          def: "Daily updates tracked the drift best (0.835). Every update is also an unreviewed deployment: a day of corrupted labels or poisoned data goes straight into the model. Online learning needs input validation, a frozen fallback and monitoring of the model itself." }
      ] },
    { t: "h2",
      n: "02",
      id: "delay",
      text: "Label delay decides what is possible",
      sub: "No labels, no evidence" },
    { t: "viz",
      title: "Mean AUC over the year as labels arrive later",
      caption: "Every policy that learns from labels lost ground as the delay grew; at 120 days, monthly retraining kept less than half of its advantage over never retraining.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0.68</text>
<line x1="64" y1="175.5" x2="610" y2="175.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="179.5" text-anchor="end" class="s-sub">0.72</text>
<line x1="64" y1="127.1" x2="610" y2="127.1" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="131.1" text-anchor="end" class="s-sub">0.76</text>
<line x1="64" y1="78.6" x2="610" y2="78.6" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="82.6" text-anchor="end" class="s-sub">0.80</text>
<line x1="64" y1="30.1" x2="610" y2="30.1" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="34.1" text-anchor="end" class="s-sub">0.84</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">1 day</text>
<text x="246.0" y="242" text-anchor="middle" class="s-sub">14 days</text>
<text x="428.0" y="242" text-anchor="middle" class="s-sub">60 days</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">120 days</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">label delay</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">mean AUC over the year</text>
<polyline points="64.0,35.0 246.0,36.2 428.0,47.1 610.0,75.0" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="35.0" r="2" style="fill:var(--good)"/>
<circle cx="246.0" cy="36.2" r="2" style="fill:var(--good)"/>
<circle cx="428.0" cy="47.1" r="2" style="fill:var(--good)"/>
<circle cx="610.0" cy="75.0" r="2" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">online</text>
<polyline points="64.0,44.7 246.0,49.5 428.0,72.5 610.0,107.7" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="44.7" r="2" style="fill:var(--accent)"/>
<circle cx="246.0" cy="49.5" r="2" style="fill:var(--accent)"/>
<circle cx="428.0" cy="72.5" r="2" style="fill:var(--accent)"/>
<circle cx="610.0" cy="107.7" r="2" style="fill:var(--accent)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">shadow challenger</text>
<polyline points="64.0,45.9 246.0,50.7 428.0,75.0 610.0,113.7" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="45.9" r="2" style="fill:var(--warn)"/>
<circle cx="246.0" cy="50.7" r="2" style="fill:var(--warn)"/>
<circle cx="428.0" cy="75.0" r="2" style="fill:var(--warn)"/>
<circle cx="610.0" cy="113.7" r="2" style="fill:var(--warn)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">monthly retrain</text>
<polyline points="64.0,191.3 246.0,191.3 428.0,191.3 610.0,191.3" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="191.3" r="2" style="fill:var(--crit)"/>
<circle cx="246.0" cy="191.3" r="2" style="fill:var(--crit)"/>
<circle cx="428.0" cy="191.3" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="191.3" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="94" x2="644" y2="94" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="98" class="s-sub" style="fill:var(--ink-2)">never retrain</text>
</svg>` },
    { t: "p",
      text: "With 1-day labels, monthly retraining averaged 0.827; with 120-day labels, 0.771. A model retrained today on labels that are four months old has learnt a world that is four months gone. When labels are slow (chargebacks, loan defaults, churn), invest in faster proxies, such as early-payment behaviour or engagement signals, and in shortening the label pipeline itself, before tuning the retraining policy." },
    { t: "callout",
      kind: "trap",
      title: "Retraining when the right move is a rollback",
      body: [
        { t: "p",
          text: "If quality fell right after a deploy, the new model or the new pipeline is the most likely cause, and retraining adds a second change on top of the first. Roll back to the last known-good model and pipeline version, confirm quality recovers, then investigate. That needs the previous version kept deployable (lesson 3.3)." }
      ] },
    { t: "h2", n: "03", id: "gate", text: "The promotion gate", sub: "Compare on the same rows" },
    { t: "p",
      text: "A challenger should replace the champion only if it is better on recent labelled data. How that comparison is made matters more than how long it runs. Scoring both models on the same rows (a paired comparison) cancels the noise in the data itself; comparing this week's challenger number with last week's champion number does not. The exercise measures the difference." },
    { t: "exercise",
      kind: "Challenge",
      title: "A promotion gate that does not promote worse models",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Build a champion and two challengers whose true AUC differs from the champion's by exactly −0.003 and +0.003 (find them by bisection along the line between the champion's weights and the true weights). Then, for evaluation windows of 1, 7 and 28 days of 800 labels, measure how often a gate that promotes on 'higher AUC' promotes the worse challenger and misses the better one, when both models are scored on the same rows, and when the challenger is scored on a different window." }
      ],
      requirements: [
        "Challengers with known AUC gaps, measured on a very large sample",
        "Paired evaluation: both models on the same rows",
        "Unpaired evaluation: the challenger on its own window",
        "Wrong-promotion and missed-promotion rates by window size"
      ],
      hint: "Set the challenger's weights to champion + t × (true − champion) and search t until the AUC gap on 320,000 rows is the target.",
      solution: { lang: "python",
        title: "promotion_gate.py",
        code: `import numpy as np
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(9)
N_DAY = 800
w_true = np.array([1.4, 0.6, 0.7, -0.5])
champion = w_true + np.array([0.25, -0.2, 0.1, 0.15])                 # good, not perfect

def window(days):
    X = rng.normal(size=(N_DAY * days, 4)); y = (rng.random(len(X)) < 1 / (1 + np.exp(-(X @ w_true)))).astype(int)
    return X, y

# Challengers that differ from the champion by a known, small amount: move along the line towards (or away from)
# the true weights, choosing the step by bisection so the AUC gap on a very large sample is +0.003 or -0.003.
big_X, big_y = window(400)
base_auc = roc_auc_score(big_y, big_X @ champion)
def challenger(target):
    lo, hi = 0.0, 1.0 if target > 0 else 3.0
    for _ in range(40):
        t = (lo + hi) / 2
        c = champion + (t if target > 0 else -t) * (w_true - champion)
        gap = roc_auc_score(big_y, big_X @ c) - base_auc
        if abs(gap) < abs(target): lo = t
        else: hi = t
    return c, gap
worse, g_w = challenger(-0.003); better, g_b = challenger(+0.003)
print(f"champion AUC {base_auc:.4f}; challengers differ by {g_w:+.4f} and {g_b:+.4f}")

print(f"\\n{'window':>8}  {'comparison':<30}{'promotes the worse one':>23}{'misses the better one':>23}")
for days in (1, 7, 28):
    for paired in (True, False):
        promo_worse = miss_better = 0
        for _ in range(300):
            X, y = window(days)
            base = roc_auc_score(y, X @ champion)
            # unpaired: the challenger's number comes from a different window (its own shadow week, say)
            Xc, yc = (X, y) if paired else window(days)
            promo_worse += roc_auc_score(yc, Xc @ worse) > base
            miss_better += not (roc_auc_score(yc, Xc @ better) > base)
        label = "same rows (paired)" if paired else "different windows (unpaired)"
        print(f"{days:>6} d  {label:<30}{promo_worse / 300:>23.1%}{miss_better / 300:>23.1%}")`,
        out: `champion AUC 0.8337; challengers differ by -0.0030 and +0.0030

  window  comparison                     promotes the worse one  misses the better one
     1 d  same rows (paired)                               0.0%                   0.0%
     1 d  different windows (unpaired)                    39.0%                  46.7%
     7 d  same rows (paired)                               0.0%                   0.0%
     7 d  different windows (unpaired)                    31.3%                  39.3%
    28 d  same rows (paired)                               0.0%                   0.0%
    28 d  different windows (unpaired)                    20.3%                  18.7%`,
        notes: [
          { t: "p",
            text: "Unpaired comparisons promoted the worse challenger 39% of the time on one-day windows and still 20% on 28-day windows: the difference between two windows of data is larger than a 0.003 difference between models. Paired comparisons on the same rows never promoted it at any window size." },
          { t: "p",
            text: "The paired result here is unusually clean, because these challengers differ from the champion in only one direction, so their errors are almost perfectly correlated. Real challengers trained on different data disagree more, and a paired gate then needs a margin or a paired significance test (a bootstrap of the AUC difference over the same rows). The lesson stands: evaluate both models on the same data, never across windows." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the challenger that won on a holiday",
      body: [
        { t: "p",
          text: "**Symptom.** An automatic champion-challenger system promoted a new pricing model on a Tuesday; over the next two weeks conversion fell 3%, and the dashboards showed the new model's evaluation AUC had been clearly higher." },
        { t: "p",
          text: "**Mechanism.** The champion's AUC came from the previous week, which included a public holiday with unusual traffic; the challenger's came from its own shadow week, which did not. The comparison measured the difference between two weeks, not between two models." },
        { t: "p",
          text: "**Fix.** The gate now scores champion and challenger on the same rows from the same shadow window, requires a minimum margin with a bootstrap confidence interval that excludes zero, and promotes through a canary with automatic rollback on conversion." }
      ] }
  ],

  takeaways: [
    "The response ladder: **scheduled**, **triggered**, **recency-weighted**, **online**, **shadow challenger**, and **rollback**.",
    "Any retraining beat none by a wide margin: **0.81–0.84** against **0.707** AUC.",
    "Triggered retraining needed **4** models against **12** on a schedule, for a little less quality.",
    "Online learning tracked drift best (**0.835**) but turns every update into an unreviewed deployment.",
    "Label delay limits everything: monthly retraining fell from **0.827** (1-day labels) to **0.771** (120-day).",
    "Invest in faster labels and proxies before tuning the retraining policy.",
    "After a deploy, **roll back** first; do not stack a retrain on an unexplained change.",
    "Unpaired comparisons promoted a worse model **39%** of the time on 1-day windows; paired comparisons **0%**.",
    "Gate promotions on the **same rows**, with a margin and a canary."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Quality dropped the day after a new model shipped. What is the first response?",
        options: [
          "Retrain on the newest labelled data available",
          "Roll back to the last known-good version",
          "Switch the model to daily online learning",
          "Raise the alert threshold until it settles"
        ],
        answer: 1,
        why: "The deploy is the likeliest cause; rolling back confirms it and restores quality. Retraining adds a second change, online learning a larger one, and raising the threshold only hides the drop." },
      { stem: "Why did every policy lose quality as label delay grew?",
        options: [
          "Old labels are noisier than new ones in general",
          "Models learn a world that is as old as the labels",
          "Retraining takes longer when labels arrive late",
          "Label delay reduces the total volume of the training data"
        ],
        answer: 1,
        why: "With 120-day labels the model is fitted to a world four months gone, so under drift it is always behind. Label noise, training time and volume were the same in each run." },
      { stem: "What is the main risk of online learning in production?",
        options: [
          "It cannot run on GPU hardware at all",
          "Every update is an unreviewed deployment",
          "It always performs worse than batch retraining",
          "It needs labels to arrive before predictions"
        ],
        answer: 1,
        why: "A bad day of data or labels flows straight into the model without a gate; it needs validation, a frozen fallback and monitoring. It runs anywhere, beat batch retraining here, and uses labels as they arrive." },
      { stem: "A challenger's AUC from its shadow week beats the champion's AUC from last week. Why is that weak evidence?",
        options: [
          "Shadow traffic is never representative of production",
          "The two windows differ more than the models do",
          "AUC cannot compare two different models fairly",
          "One week is always too short to compute AUC"
        ],
        answer: 1,
        why: "Unpaired comparisons promoted a worse model 39% of the time at one day and 20% at 28 days, because window-to-window variation swamps a small model difference. Score both on the same rows." }
    ] },

  interview: { title: "In an interview",
    sub: "Responses to drift are judged on cost, safety and evidence.",
    questions: [
      { level: "core",
        q: "How would you keep a model up to date in production?",
        strong: "A strong answer picks a policy for the drift rate and label delay, with gates and rollback.",
        answer: [
          { t: "p",
            text: "Start with scheduled retraining at a cadence matched to how fast the domain changes, on a window that contains full cycles, gated by input validation and a paired comparison against the champion on recent labelled data, then a canary. Add triggers on outcome metrics or proxies for faster response. Keep the previous version deployable for rollback." },
          { t: "p",
            text: "Consider online learning only where drift is fast and the team can validate inputs, freeze a fallback and monitor the model continuously. Throughout, label delay sets the limit, so shortening it is often the best investment." }
        ] },
      { level: "advanced",
        q: "How do you decide whether a retrained model should replace the current one?",
        strong: "A strong answer describes paired evaluation, a margin with uncertainty, segments and a canary.",
        answer: [
          { t: "p",
            text: "Score both models on the same recent labelled rows, never on different windows; in the simulation unpaired comparisons promoted a worse model up to 39% of the time. Require a margin, with a bootstrap interval on the paired difference that excludes zero, check important segments for regressions, then promote through a canary with guardrail metrics and automatic rollback. Log the comparison with the promotion so the decision can be audited." }
        ] },
      { level: "core",
        q: "Labels arrive three months after a prediction. How does that change your monitoring and retraining?",
        strong: "A strong answer relies on proxies and input checks, and accepts the limit on retraining.",
        answer: [
          { t: "p",
            text: "Accuracy monitoring is three months late, so add fast proxies that correlate with the outcome, monitor inputs and the prediction distribution for pipeline faults, and track calibration on whatever early labels exist. Retraining can only use the world as it was three months ago; under drift that caps quality, so work on shortening the label pipeline and on features that are robust to the expected changes." }
        ] }
    ] }
});
