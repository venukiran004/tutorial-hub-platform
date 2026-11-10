/* ============================================================================
   LESSON 16.1 — The Four Pillars
   ========================================================================= */
EC.receiveLesson({
  id: "16.1",

  lede: "ML monitoring is four separate problems that are often merged into one dashboard. Infrastructure metrics (latency, errors, saturation) say whether the service is up. Data metrics (input distributions, nulls, ranges) say whether the inputs look like training. Model metrics (accuracy, calibration on labels) say whether predictions are right, but only once labels arrive. Business metrics (conversion, losses, complaints) say whether anyone is harmed. They have different delays and different owners, and only the last proves harm. This lesson measures how quickly each pillar notices two kinds of incident, and how traffic decides the speed of the business pillar.",

  objectives: [
    "Separate infrastructure, data, model and business monitoring, with their delays and owners",
    "Measure which pillars detect a concept change and a pipeline fault, and when",
    "Explain why the business metric proves harm and why it is often missing",
    "Compute how traffic and effect size set the time to detect a business-metric drop"
  ],

  prerequisites: ["7.4", "11.2"],

  blocks: [
    { t: "h2", n: "01", id: "pillars", text: "Four pillars, one incident", sub: "Which ones notice, and when" },
    { t: "p",
      text: "A recommendation model serves 200,000 sessions a day at 3.0% conversion. Two incidents are simulated. In a concept change, the inputs look the same but the model ranks worse, and conversion falls by about 7%. In a pipeline fault, one input arrives as zeros, and conversion falls by 10%. Each pillar checks once a day with its own signal and threshold." },
    { t: "code",
      lang: "python",
      title: "pillars.py — the first day each pillar alerts",
      code: `import numpy as np
rng = np.random.default_rng(17)

# A recommendation model, 200,000 sessions a day, 3.0% conversion. On day 0 an incident starts. Two kinds:
#  A) concept change: inputs look the same, the model's ranking gets worse -> conversion falls to 2.8%
#  B) pipeline fault: one input feature arrives as zeros -> inputs shift, ranking worse -> conversion falls to 2.7%
# Each pillar checks daily with its own signal; we record the first day it alerts.
SESS, BASE = 200_000, 0.030

def first_alert(signal_by_day, threshold):
    for d, v in enumerate(signal_by_day):
        if v > threshold: return d
    return None

def simulate(kind, days=21):
    conv = BASE * (0.933 if kind == "concept" else 0.90)
    infra = [rng.normal(45, 2) for _ in range(days)]                             # p99 ms: unaffected by either
    psi = [abs(rng.normal(0, 0.005)) + (0.9 if kind == "pipeline" else 0) for _ in range(days)]
    # model quality: labels (purchases within 7 days) arrive a week late; AUC drop visible from day 7
    auc_drop = [0.0 if d < 7 else (0.03 if kind == "concept" else 0.05) + rng.normal(0, 0.004) for d in range(days)]
    # business: daily conversion against the baseline, as a z-score of the cumulative shortfall since day 0
    z, shortfall, n = [], 0.0, 0
    for d in range(days):
        c = rng.binomial(SESS, conv); shortfall += BASE * SESS - c; n += SESS
        z.append(shortfall / np.sqrt(n * BASE * (1 - BASE)))
    return {"infrastructure (p99 latency)": first_alert([abs(v - 45) / 2 for v in infra], 4),
            "data (input PSI)": first_alert(psi, 0.1),
            "model (AUC on delayed labels)": first_alert(auc_drop, 0.015),
            "business (conversion, cumulative)": first_alert(z, 3.0)}

print(f"{'pillar':<36}{'concept change':>16}{'pipeline fault':>16}")
a, b = simulate("concept"), simulate("pipeline")
for k in a:
    fmt = lambda d: "never (21 d)" if d is None else f"day {d}"
    print(f"{k:<36}{fmt(a[k]):>16}{fmt(b[k]):>16}")`,
      out: `pillar                                concept change  pipeline fault
infrastructure (p99 latency)            never (21 d)    never (21 d)
data (input PSI)                        never (21 d)           day 0
model (AUC on delayed labels)                  day 7           day 7
business (conversion, cumulative)              day 0           day 0` },
    { t: "viz",
      title: "Days to the first alert, concept change",
      caption: "Infrastructure and input monitoring never fired; model metrics waited a week for labels; the business metric fired on the first day.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="220" y="31.0" text-anchor="end" class="s-label">infrastructure: p99 latency</text>
<rect x="230" y="14" width="355.0" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="593.0" y="31.0" class="s-sub">never, in 21 days</text>
<text x="220" y="69.0" text-anchor="end" class="s-label">data: input PSI</text>
<rect x="230" y="52" width="355.0" height="26" rx="4" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="593.0" y="69.0" class="s-sub">never, in 21 days</text>
<text x="220" y="107.0" text-anchor="end" class="s-label">model: AUC on delayed labels</text>
<rect x="230" y="90" width="118.3" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="356.3" y="107.0" class="s-sub">day 7</text>
<text x="220" y="145.0" text-anchor="end" class="s-label">business: conversion</text>
<rect x="230" y="128" width="4.2" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="242.2" y="145.0" class="s-sub">day 0</text>
</svg>` },
    { t: "table",
      head: ["Pillar", "Signal", "Delay", "Usual owner", "Catches"],
      rows: [
        ["Infrastructure", "Latency, errors, saturation", "Seconds", "Platform / SRE", "Outages, overload"],
        [
          "Data",
          "Input distributions, nulls, ranges",
          "Minutes to hours",
          "Data engineering",
          "Pipeline faults, input drift"
        ],
        [
          "Model",
          "Accuracy, calibration on labels; score distribution",
          "Label delay: days to months",
          "ML team",
          "Concept drift, bad models"
        ],
        [
          "Business",
          "Conversion, losses, complaints, revenue",
          "Hours to days, by traffic",
          "Product",
          "Harm, from any cause"
        ]
      ] },
    { t: "dl",
      items: [
        { term: "Infrastructure saw nothing",
          def: "Both incidents served predictions quickly and without errors; wrong answers are not errors." },
        { term: "Data saw only the pipeline fault",
          def: "PSI jumped on day 0 for the zeroed feature and stayed silent for the concept change, whose inputs were unchanged (lesson 11.1)." },
        { term: "Model metrics waited for labels",
          def: "Purchases complete within 7 days, so AUC could not move until day 7 in either case." },
        { term: "The business metric was first and caught both",
          def: "At 200,000 sessions a day, a 7% conversion drop is a 5-sigma shortfall on the first day. It is the only pillar that measures harm directly, whatever caused it." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "The business metric that nobody wired up",
      body: [
        { t: "p",
          text: "Business metrics live in a product analytics tool, joined to model versions by nobody. The ML team watches AUC and the platform team watches latency; a 7% conversion drop shows up in a weekly business review. Put the business metric, split by model version, on the ML service's dashboard and alerting." }
      ] },
    { t: "h2",
      n: "02",
      id: "speed",
      text: "How fast can the business metric see harm?",
      sub: "Traffic sets the clock" },
    { t: "p",
      text: "The business metric's speed depends on traffic and on the size of the effect. A cumulative test, comparing conversions since the incident with what the baseline predicts, crosses three standard deviations after about z² × (1 − p) / (n × p × δ²) days, for n sessions a day, base rate p and relative drop δ. The exercise computes it and checks it by simulation." },
    { t: "exercise",
      kind: "Challenge",
      title: "Days to detect a drop",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "For a 3.0% conversion rate, compute the number of days until a cumulative shortfall reaches three standard deviations, for 2,000, 20,000 and 200,000 sessions a day and relative drops of 2%, 5% and 10%, both analytically and as the median of 400 simulations." }
      ],
      requirements: [
        "The analytic formula from the normal approximation",
        "A simulation of daily conversions with binomial noise",
        "A 3 × 3 table of both",
        "What the table implies for small products"
      ],
      hint: "The expected shortfall grows linearly with days and its standard deviation with the square root, so the z-score grows as √days.",
      solution: { lang: "python",
        title: "days_to_detect.py",
        code: `import numpy as np
rng = np.random.default_rng(18)
BASE, Z = 0.030, 3.0                          # baseline conversion; alert when the cumulative shortfall reaches 3 sigma

def days_analytic(sessions, rel_drop):
    # shortfall after d days: d * n * BASE * drop; its sd: sqrt(d * n * BASE * (1 - BASE)). Solve for z = Z.
    return (Z ** 2 * (1 - BASE)) / (sessions * BASE * rel_drop ** 2)

def days_simulated(sessions, rel_drop, trials=400, horizon=365):
    out = []
    for _ in range(trials):
        conv = rng.binomial(sessions, BASE * (1 - rel_drop), horizon)
        z = np.cumsum(BASE * sessions - conv) / np.sqrt(np.arange(1, horizon + 1) * sessions * BASE * (1 - BASE))
        hit = np.flatnonzero(z > Z); out.append(hit[0] + 1 if len(hit) else horizon)
    return np.median(out)

print(f"{'sessions/day':>13}" + "".join(f"{f'{d:.0%} drop':>18}" for d in (0.02, 0.05, 0.10)))
for s in (2_000, 20_000, 200_000):
    cells = [f"{days_analytic(s, d):7.1f} / {days_simulated(s, d):5.0f}" for d in (0.02, 0.05, 0.10)]
    print(f"{s:>13,}" + "".join(f"{c:>18}" for c in cells))
print("(days to a 3-sigma alert: analytic / median of 400 simulations)")`,
        out: ` sessions/day           2% drop           5% drop          10% drop
        2,000     363.8 /   272      58.2 /    54      14.5 /    13
       20,000      36.4 /    30       5.8 /     6       1.5 /     2
      200,000       3.6 /     4       0.6 /     1       0.1 /     1
(days to a 3-sigma alert: analytic / median of 400 simulations)`,
        notes: [
          { t: "p",
            text: "At 200,000 sessions a day, even a 2% drop was confirmed in about four days. At 2,000 a day, a 10% drop took two weeks and a 2% drop most of a year; the simulated medians ran a little ahead of the analytic expectation because a noisy path crosses the line early more often than late." },
          { t: "p",
            text: "Small products cannot rely on the business metric for fast detection of small harms; they need model metrics with fast proxy labels and data checks to catch faults early. Large products should alert on the business metric directly, split by model version, because it is both the fastest pillar and the one that measures harm." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: green dashboards, falling revenue",
      body: [
        { t: "p",
          text: "**Symptom.** For two weeks a pricing model's service showed normal latency, no errors, stable input distributions and steady AUC on the labels available, while revenue per visit fell 6%. The fall was noticed in a monthly business review." },
        { t: "p",
          text: "**Mechanism.** A competitor had changed prices, so customers' responses to the same inputs changed: a concept change. Inputs were unchanged, and the labels used for AUC arrived three weeks late. Revenue per visit by model version was never on the ML dashboard." },
        { t: "p",
          text: "**Fix.** Revenue per visit, split by model version and with a cumulative alert, joined the service's dashboard and on-call alerts; the ML team gained a fast proxy label (add-to-basket within an hour); and each pillar now has a named owner." }
      ] }
  ],

  takeaways: [
    "Monitor four pillars separately: **infrastructure**, **data**, **model** and **business**, each with its own delay and owner.",
    "In both simulated incidents, infrastructure metrics **never** alerted: wrong answers are not errors.",
    "Input PSI caught the pipeline fault on **day 0** and never saw the concept change.",
    "Model metrics waited for labels: **day 7** in both cases.",
    "The business metric alerted on **day 0** for both, and is the only one that measures harm.",
    "Detection time ≈ **z²(1 − p) / (n p δ²)** days: a 2% drop takes **4 days** at 200,000 sessions/day and most of a year at 2,000.",
    "Put the business metric, **split by model version**, on the ML service's dashboard."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A concept change lowered conversion; inputs were unchanged. Which pillar could never have caught it?",
        options: [
          "Business metrics such as conversion",
          "Data metrics on the input distributions",
          "Model metrics on labels once they arrive",
          "None; all four would eventually catch it"
        ],
        answer: 1,
        why: "Unchanged inputs mean no input statistic moves. Conversion fell, and AUC on labels fell once labels arrived; infrastructure also stayed silent, but it was not among the options." },
      { stem: "Why did model metrics alert only on day 7?",
        options: [
          "The AUC alert threshold was set too high",
          "Purchase labels arrive a week later",
          "The model was retrained on day six",
          "AUC is only ever computed once a week"
        ],
        answer: 1,
        why: "Accuracy needs outcomes, and purchases complete within seven days. The threshold, retraining and schedule were not the limiting factor." },
      { stem: "A product has 2,000 sessions a day. How long to confirm a 2% conversion drop?",
        options: [
          "About a day, like a large product",
          "Most of a year: small traffic makes it slow",
          "About a week, at any level of traffic at all",
          "It can never be confirmed at that size"
        ],
        answer: 1,
        why: "Detection time scales with 1 / (traffic × drop²): about 270–360 days here, against 4 at 200,000 sessions. It is slow, not impossible." },
      { stem: "Why should the business metric be split by model version?",
        options: [
          "So the dashboard looks more detailed",
          "So harm can be attributed to a specific model",
          "Because product tools require it",
          "So conversion can be averaged across versions"
        ],
        answer: 1,
        why: "During a rollout or canary, only a per-version split shows which model is causing the change. Detail, tool requirements and averaging are not the point." }
    ] },

  interview: { title: "In an interview",
    sub: "Monitoring answers should cover what each layer can and cannot see.",
    questions: [
      { level: "core",
        q: "What would you monitor for a production ML model?",
        strong: "A strong answer covers four pillars with delays, owners and the business metric split by version.",
        answer: [
          { t: "p",
            text: "Infrastructure: latency, errors, saturation, owned by the platform. Data: input ranges, nulls, distributions against training, owned by data engineering. Model: score distribution immediately, accuracy and calibration as labels arrive, with fast proxies, owned by the ML team. Business: the outcome the model exists to improve, split by model version, owned by product but on the same dashboard. Each pillar has alerts tuned to its own delay and noise." }
        ] },
      { level: "advanced",
        q: "Labels arrive a month late. How do you detect a bad model sooner?",
        strong: "A strong answer uses business metrics, proxies and prediction distributions.",
        answer: [
          { t: "p",
            text: "Watch the business metric by model version, which at enough traffic detects harm in days; find proxy labels that arrive fast and correlate with the outcome; monitor the prediction distribution and calibration on early labels; and use canaries with guardrails so a new model's harm shows against control quickly. Data checks catch pipeline faults immediately." }
        ] },
      { level: "core",
        q: "Why is infrastructure monitoring not enough for ML?",
        strong: "A strong answer explains that wrong predictions are not failures to the infrastructure.",
        answer: [
          { t: "p",
            text: "A model that returns wrong answers quickly and without errors is healthy to every infrastructure metric. In the simulation, two incidents that cut conversion by 7% and 10% never moved latency or errors. ML needs monitoring of inputs, outputs, outcomes and business effect on top." }
        ] }
    ] }
});
