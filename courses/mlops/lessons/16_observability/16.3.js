/* ============================================================================
   LESSON 16.3 — Alerts Worth Waking Up For
   ========================================================================= */
EC.receiveLesson({
  id: "16.3",

  lede: "An alert is a claim that someone should stop what they are doing. Each false one makes the next one less likely to be believed, so a noisy alert is worse than none: it costs attention and trains people to ignore the real incident when it comes. ML services make this worse, because they have many metrics, each with natural variation (weekly cycles, sampling noise) that guessed thresholds treat as incidents. This lesson compares guessed thresholds, thresholds derived from history and symptom-based alerting over a year with five real incidents, and does the arithmetic of a page budget across many metrics.",

  objectives: [
    "Derive thresholds from a metric's normal variation instead of guessing them",
    "Account for cycles, such as weekly patterns, in what counts as normal",
    "Prefer alerts on user-visible symptoms, and route other signals to review",
    "Allocate a false-page budget across many metrics",
    "Measure an alert set by precision and incidents caught"
  ],

  prerequisites: ["7.4", "16.1"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "rules",
      text: "Three rule sets, one year",
      sub: "Five incidents, and everything else" },
    { t: "p",
      text: "Daily values of three metrics for a year: the mean prediction score (with a weekly cycle), input PSI and conversion. Five incidents: two pipeline faults, two bad models, one drift that only moved the mean score. The guessed rules use round numbers that 'feel like a big move'. The derived rules use one clean month to measure normal variation, comparing the score with the same weekday a week earlier. The symptom rule pages only on conversion." },
    { t: "code",
      lang: "python",
      title: "alerts.py — three rule sets over a year",
      code: `import numpy as np
rng = np.random.default_rng(21)

# A year of daily monitoring for a model service. Five real incidents: two pipeline faults (input PSI jumps and conversion
# falls), two bad models (conversion falls, inputs normal), one silent drift that only lowers the mean score.
DAYS = 365
incidents = {40: "pipeline", 110: "bad model", 190: "pipeline", 260: "bad model", 320: "score drift"}
mean_score = 0.30 + 0.01 * np.sin(np.arange(DAYS) / 7 * 2 * np.pi) + rng.normal(0, 0.004, DAYS)   # weekly cycle
psi = np.abs(rng.normal(0.02, 0.012, DAYS))
conv = rng.normal(0.030, 0.0006, DAYS)
for d, kind in incidents.items():
    span = slice(d, d + 3)
    if kind == "pipeline": psi[span] += 0.5; conv[span] -= 0.003
    if kind == "bad model": conv[span] -= 0.002
    if kind == "score drift": mean_score[span] -= 0.03

history = slice(0, 30)                          # one clean month to learn normal variation from
def evaluate(rules):
    fired = set()
    for metric, test in rules: fired |= {d for d in range(30, DAYS) if test(metric, d)}
    caught = {d for d in incidents if any(d <= f < d + 3 for f in fired)}
    false = {f for f in fired if not any(d <= f < d + 3 for d in incidents)}
    return len(fired), len(caught), len(false)

guessed = [(mean_score, lambda m, d: abs(m[d] - 0.30) > 0.008),                       # 'feels like a big move'
           (psi, lambda m, d: m[d] > 0.03), (conv, lambda m, d: m[d] < 0.0295)]
derived = [(mean_score, lambda m, d: abs(m[d] - m[d - 7]) > 4 * np.std(m[7:30] - m[0:23])),  # against the same weekday
           (psi, lambda m, d: m[d] > 4 * np.percentile(m[history], 99)),
           (conv, lambda m, d: m[d] < np.mean(m[history]) - 4 * np.std(m[history]))]
symptom = [(conv, lambda m, d: m[d] < np.mean(m[history]) - 4 * np.std(m[history]))]

print(f"{'rule set':<40}{'alert days':>11}{'incidents caught':>18}{'false alert days':>18}{'precision':>11}")
for name, rules in (("guessed thresholds", guessed), ("derived from a month of history", derived), ("symptom only: conversion", symptom)):
    fired, caught, false = evaluate(rules)
    print(f"{name:<40}{fired:>11}{caught:>13} of 5{false:>18}{(fired - false) / max(fired, 1):>11.0%}")`,
      out: `rule set                                 alert days  incidents caught  false alert days  precision
guessed thresholds                              206            5 of 5               191         7%
derived from a month of history                  14            5 of 5                 3        79%
symptom only: conversion                          8            4 of 5                 0       100%` },
    { t: "viz",
      title: "False alert days in a year, by rule set",
      caption: "Guessed thresholds caught everything and were wrong 93% of the time. Derived thresholds caught everything with three false days; symptom-only alerting was never wrong and missed the harmless drift.",
      svg: `<svg viewBox="0 0 760 134" width="100%" role="img">
<text x="160" y="31.0" text-anchor="end" class="s-label">guessed thresholds</text>
<rect x="170" y="14" width="305.6" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="483.6" y="31.0" class="s-sub">191 false days · 5 of 5 caught · 7% precision</text>
<text x="160" y="69.0" text-anchor="end" class="s-label">derived from history</text>
<rect x="170" y="52" width="4.8" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="182.8" y="69.0" class="s-sub">3 false days · 5 of 5 · 79%</text>
<text x="160" y="107.0" text-anchor="end" class="s-label">symptom only</text>
<rect x="170" y="90" width="2.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="180.0" y="107.0" class="s-sub">0 false days · 4 of 5 · 100%</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Guessed: 191 false alert days",
          def: "A threshold of ±0.008 on the mean score sat inside its weekly cycle, so it fired most weeks. Seven percent precision means each alert is probably nothing, and people learn that quickly." },
        { term: "Derived: 3 false days, all explainable",
          def: "Thresholds at four standard deviations of normal variation, with the weekly cycle removed by comparing like weekdays, caught all five incidents. The three false days were echoes: a week after the drift, the comparison used the drifted day as its baseline." },
        { term: "Symptom-only: never wrong, one miss",
          def: "Paging only on conversion caught the four incidents that harmed users and ignored the score drift that did not. Whether that drift deserved a page is exactly the judgement symptom-based alerting makes explicit." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "One threshold per metric, chosen by eye",
      body: [
        { t: "p",
          text: "A threshold set by looking at a quiet week fires every time the metric's normal cycle comes round. Measure the variation over enough history to include its cycles, remove the cycles where you can (compare like with like), and set thresholds in units of that variation." }
      ] },
    { t: "h2", n: "02", id: "budget", text: "The page budget", sub: "Many metrics, one pager" },
    { t: "p",
      text: "Each check has a small false-alarm probability; with dozens of metrics checked every day, small probabilities add up. Decide the number of false pages a team will accept, say one a month, and divide it across every check that can page. Signals that cannot meet the budget go to a daily review dashboard, not to the pager." },
    { t: "table",
      head: ["Signal", "Page?", "Why"],
      rows: [
        ["Business metric by model version", "Yes", "User-visible harm, whatever the cause"],
        ["Hard data validation (units, nulls, ranges)", "Yes", "Pipeline faults with certain impact"],
        ["Error rate and latency SLO burn (lesson 7.4)", "Yes", "User-visible availability"],
        ["Input drift statistics", "Review", "Often harmless; investigate in hours, not minutes"],
        ["Model score distribution", "Review, or page on large shifts", "Early warning without proof of harm"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A false-page budget across 40 metrics",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Forty metrics are checked daily. The team will accept one false page a month. Compute the false-alarm probability allowed per check and the threshold in standard deviations, then simulate two years of healthy metrics and count false pages a month at each metric's 99th percentile, at 3 standard deviations, and at the budgeted threshold. Finally, state how large a shift the budgeted threshold catches on the day it happens." }
      ],
      requirements: [
        "Per-check probability = budget / (metrics × checks per month)",
        "The matching normal threshold",
        "Simulated false pages a month for three thresholds",
        "The detection cost of the stricter threshold"
      ],
      hint: "scipy.stats.norm.isf(p) gives the z-score exceeded with probability p.",
      solution: { lang: "python",
        title: "page_budget.py",
        code: `import numpy as np
from scipy import stats
rng = np.random.default_rng(22)

# 40 monitored metrics, each checked once a day. Budget: at most one false page a month across all of them.
METRICS, DAYS_PER_MONTH, BUDGET = 40, 30, 1.0
per_check = BUDGET / (METRICS * DAYS_PER_MONTH)
z_needed = stats.norm.isf(per_check)
print(f"checks per month: {METRICS * DAYS_PER_MONTH:,}; allowed false-alarm probability per check {per_check:.5f} "
      f"-> threshold at {z_needed:.2f} standard deviations")

months = 24
noise = rng.normal(size=(months * DAYS_PER_MONTH, METRICS))          # every metric healthy for two years
for name, z in (("each metric at its own 99th percentile (z = 2.33)", stats.norm.isf(0.01)),
                ("3 standard deviations", 3.0),
                (f"budgeted threshold (z = {z_needed:.2f})", z_needed)):
    pages_per_month = (noise > z).sum() / months
    print(f"{name:<52} {pages_per_month:6.1f} false pages a month")

# The cost of the stricter threshold: the size of shift it still catches on the day it happens, half the time.
print(f"\\na shift is caught the same day with 50% probability once it reaches {z_needed:.2f} sd, "
      f"and with 95% probability at {z_needed + stats.norm.isf(0.05):.2f} sd")`,
        out: `checks per month: 1,200; allowed false-alarm probability per check 0.00083 -> threshold at 3.14 standard deviations
each metric at its own 99th percentile (z = 2.33)      12.2 false pages a month
3 standard deviations                                   1.8 false pages a month
budgeted threshold (z = 3.14)                           0.9 false pages a month

a shift is caught the same day with 50% probability once it reaches 3.14 sd, and with 95% probability at 4.79 sd`,
        notes: [
          { t: "p",
            text: "Per-metric 99th percentiles, which sound strict, produced 12 false pages a month across 40 metrics. Three standard deviations gave 1.8; the budgeted 3.14 gave 0.9, within the budget of one." },
          { t: "p",
            text: "The price is sensitivity: a shift must reach 3.14 standard deviations to be caught the same day half the time, and 4.8 to be caught 95% of the time. Smaller shifts are caught by accumulating evidence over days (lesson 16.1) or by review dashboards, which is why most signals belong there rather than on the pager." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the alert everyone had muted",
      body: [
        { t: "p",
          text: "**Symptom.** A model began approving loans it should have declined; the input-validation alert that would have caught the cause fired within minutes, and nobody looked for nine hours." },
        { t: "p",
          text: "**Mechanism.** The same channel received about 30 drift alerts a day from per-feature PSI thresholds of 0.1, almost all harmless. Engineers had muted the channel. The validation alert, a real unit change, looked like every other message in it." },
        { t: "p",
          text: "**Fix.** Paging was cut to five signals with derived thresholds and a budget of one false page a month; drift statistics moved to a daily review; and every alert now names its owner and a runbook. The next unit change paged once and was fixed in 20 minutes." }
      ] }
  ],

  takeaways: [
    "A noisy alert is worse than none: it trains people to ignore the real one.",
    "Guessed thresholds caught all five incidents with **191** false alert days (**7%** precision).",
    "Thresholds derived from history, with weekly cycles removed, caught all five with **3** false days.",
    "Symptom-only alerting on conversion was **never wrong** and ignored a drift that harmed no one.",
    "Across **40** metrics, per-metric 99th percentiles meant **12** false pages a month; a budgeted **3.14σ** threshold meant **0.9**.",
    "Page on user-visible symptoms and hard validation; send drift statistics to daily review.",
    "Every paging alert needs an owner and a runbook."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A guessed threshold on the mean score fired on most weeks. Why?",
        options: [
          "The model was degrading slowly all year",
          "The threshold sat inside the metric's weekly cycle",
          "Mean scores cannot be monitored every single day",
          "The alert was evaluated on the wrong day of the week"
        ],
        answer: 1,
        why: "Normal weekly variation crossed ±0.008, producing 191 false days. The model was healthy except for the five incidents; daily monitoring is fine once thresholds respect the cycle." },
      { stem: "Forty metrics each alert at their own 99th percentile, daily. How many false pages a month?",
        options: [
          "About one, since each has 1% false alarms",
          "About 12: 1% of 1,200 checks a month",
          "None, because the 99th percentile is strict",
          "About 40, one for every single metric"
        ],
        answer: 1,
        why: "1,200 checks × 1% ≈ 12, matching the simulation's 12.2. Per-check strictness does not survive multiplication by the number of checks." },
      { stem: "Why did the derived score rule produce false alerts a week after the drift incident?",
        options: [
          "The incident recurred a week later",
          "It compared with the drifted day as its baseline",
          "The threshold was lowered right after that incident",
          "Random noise happened to spike that week"
        ],
        answer: 1,
        why: "A week-over-week comparison uses the previous week as baseline, so the incident echoes seven days later. Recurrence, threshold changes and chance were not the cause." },
      { stem: "Which signal should go to a daily review rather than the pager?",
        options: [
          "Conversion by model version falling sharply",
          "Per-feature input drift statistics",
          "A unit change caught by hard validation",
          "Error-rate SLO burn above the fast threshold"
        ],
        answer: 1,
        why: "Drift statistics are often harmless and need investigation, not immediate action. Business harm, certain pipeline faults and SLO burn are user-visible and urgent." }
    ] },

  interview: { title: "In an interview",
    sub: "Alerting answers are judged on precision as much as coverage.",
    questions: [
      { level: "core",
        q: "How do you set alert thresholds for ML metrics?",
        strong: "A strong answer derives thresholds from history, handles cycles and budgets pages.",
        answer: [
          { t: "p",
            text: "Measure each metric's normal variation over enough history to include its cycles; remove known cycles by comparing like periods (same weekday, same hour); set thresholds in units of that variation; and choose them so the total false-page rate across all paging checks stays within a budget the team accepts, such as one a month. Check each rule against past incidents for recall and against quiet periods for precision." }
        ] },
      { level: "core",
        q: "What should page an on-call engineer for an ML service?",
        strong: "A strong answer separates symptoms from causes and routes the rest to review.",
        answer: [
          { t: "p",
            text: "User-visible symptoms: the business metric by model version, availability and latency SLO burn. Certain-impact faults: hard data validation failures such as unit changes or null floods. Everything else (drift statistics, score shifts, slowly degrading accuracy) goes to a daily review with owners, because it needs investigation, not a response in minutes." }
        ] },
      { level: "advanced",
        q: "Your team ignores alerts. How do you fix it?",
        strong: "A strong answer measures alert precision and cuts to a budget.",
        answer: [
          { t: "p",
            text: "Measure each alert's precision over the last quarter: how often it led to action. Delete or demote anything below a bar, move cause-level signals to review, derive thresholds for the rest, and enforce a page budget. Give every remaining alert an owner and a runbook, and review every page in a weekly meeting until precision is high. Trust comes back only when pages are usually real." }
        ] }
    ] }
});
