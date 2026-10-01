/* ============================================================================
   LESSON 13.4 — Monitoring, Retraining and Experiments
   ========================================================================= */
EC.receiveLesson({
  id: "13.4",

  lede: "A deployed model starts decaying the day it ships, because the world it learned from keeps moving — and it fails quietly, returning confident numbers whether or not they still mean anything. This lesson covers how to watch a model in production, when to retrain it, how to release a new one safely, and how to tell whether it is actually better. Measured here: a shift in the inputs that set off every drift alarm and did no harm, then a change in fraudsters' behaviour that no input monitor noticed and that cut the model's AUC from 0.87 to 0.70; an A/B test checked every day that declared a winner in 23% of experiments where nothing differed; and a single approval threshold that approved 81% of one group and 40% of another.",

  objectives: [
    "Monitor an ML system at four layers — system, data, model and business — with delayed labels in mind",
    "Distinguish data drift from concept drift, and choose retraining triggers",
    "Release models through shadow, canary and A/B stages with guardrails",
    "Size an experiment, and avoid the peeking and multiple-testing traps",
    "Measure fairness across groups, and explain why the criteria trade off"
  ],

  prerequisites: ["13.1", "13.2", "11.5"],

  blocks: [

    { t: "h2", n: "01", id: "monitor", text: "What to monitor",
      sub: "Four layers, and the one that arrives weeks late" },

    { t: "diagram", kind: "matrix", title: "Four layers of ML monitoring",
      cols: ["Signals", "Available", "Catches"],
      rows: ["System", "Data", "Model", "Business"],
      cells: [
        [{ text: "latency, errors, QPS" }, { text: "immediately", tone: "good" }, { text: "outages, slow models" }],
        [{ text: "PSI, missing, schema" }, { text: "immediately", tone: "good" }, { text: "broken pipelines, drift" }],
        [{ text: "AUC, calibration" }, { text: "after labels arrive", tone: "warn" }, { text: "decay, concept drift" }],
        [{ text: "revenue, conversion" }, { text: "hours to weeks", tone: "warn" }, { text: "what actually matters" }]
      ] },

    { t: "p", text: "The system layer is ordinary service monitoring (11.5). The data layer compares what the model receives now with what it was trained on: the distribution of each feature, the rate of missing or default values, schema changes. The model layer needs labels, and labels are often late — a click within seconds, a purchase within days, a chargeback within weeks — so in between, watch **proxies**: the distribution of predictions, the share above the decision threshold, and early partial labels such as customer disputes." },

    { t: "h2", n: "02", id: "drift", text: "Data drift, concept drift and retraining",
      sub: "The inputs can change without harm, and the meaning can change without a sign" },

    { t: "dl", items: [
      { term: "Data drift (covariate shift)", def: "The distribution of the inputs changes — a sales season, a new market, a new app version — while the relationship between inputs and outcome holds." },
      { term: "Concept drift", def: "The relationship itself changes: fraudsters adapt to the model, tastes move, a competitor changes prices. The same inputs now mean something different." },
      { term: "Label drift", def: "The base rate changes — more fraud this month — which shifts precision and the best threshold even when ranking quality holds." }
    ] },

    { t: "p", text: "A year of a simulated fraud model. In months 3 to 5 a sales season raises basket sizes. From month 7 fraudsters change tactics, moving from large amounts to rapid repeated payments. One copy of the model is frozen after month 0; another is retrained each month on the previous month's labelled data:" },

    { t: "code", lang: "python", title: "drift.py — input drift against concept drift, frozen against retrained",
      code: `import math, random
random.seed(12)

def month_of_data(m, n=10_000):    # three features: amount, device risk, payment velocity
    rows = []
    shift = 0.8 if 3 <= m <= 5 else 0.0                      # months 3-5: a sales season, bigger baskets
    w_amount, w_velocity = (1.5, 0.2) if m < 7 else (0.3, 1.6)   # month 7 on: fraudsters change tactics
    for _ in range(n):
        x = [random.gauss(shift, 1), random.gauss(0, 1), random.gauss(0, 1)]
        logit = -3.5 + w_amount * (x[0] - shift) + 1.0 * x[1] + w_velocity * x[2]
        rows.append((x, random.random() < 1 / (1 + math.exp(-logit))))
    return rows

def train(rows, epochs=6):                        # logistic regression, SGD with a decaying step
    w, b = [0.0] * 3, 0.0
    for epoch in range(epochs):
        lr = 0.05 / (1 + 2 * epoch)
        for x, y in rows:
            p = 1 / (1 + math.exp(-(sum(a * c for a, c in zip(w, x)) + b)))
            w = [a - lr * (p - y) * c for a, c in zip(w, x)]; b -= lr * (p - y)
    return lambda x: sum(a * c for a, c in zip(w, x)) + b

def auc(scores, labels):
    ranked = sorted(zip(scores, labels)); pos = sum(labels)
    return (sum(i + 1 for i, (_, y) in enumerate(ranked) if y) - pos * (pos + 1) / 2) / (pos * (len(labels) - pos))

def psi(expected, actual, bins=10):
    edges = sorted(expected)[len(expected) // bins::len(expected) // bins][:bins - 1]
    share = lambda xs: [max(1e-4, sum(1 for x in xs if lo <= x < hi) / len(xs))
                        for lo, hi in zip([-math.inf] + edges, edges + [math.inf])]
    return sum((a - e) * math.log(a / e) for e, a in zip(share(expected), share(actual)))

months = [month_of_data(m) for m in range(12)]
frozen = train(months[0])                        # trained once, in month 0, never again
print(f"{'month':>5}{'PSI amount':>12}{'AUC frozen':>12}{'AUC retrained monthly':>23}")
for m in range(1, 12):
    rows = months[m]; labels = [y for _, y in rows]
    retrained = train(months[m - 1])             # last month's labelled data
    drift = psi([x[0] for x, _ in months[0]], [x[0] for x, _ in rows])
    print(f"{m:>5}{drift:>12.2f}{auc([frozen(x) for x, _ in rows], labels):>12.3f}"
          f"{auc([retrained(x) for x, _ in rows], labels):>23.3f}")`,
      hl: [6, 7, 34, 38],
      out: `month  PSI amount  AUC frozen  AUC retrained monthly
    1        0.00       0.865                  0.865
    2        0.00       0.862                  0.862
    3        0.63       0.870                  0.870
    4        0.62       0.866                  0.866
    5        0.61       0.860                  0.859
    6        0.00       0.876                  0.876
    7        0.00       0.708                  0.701
    8        0.00       0.699                  0.873
    9        0.00       0.715                  0.874
   10        0.00       0.721                  0.874
   11        0.00       0.705                  0.877` },

    { t: "viz", title: "The drift alarm and the damage did not coincide",
      caption: "In the sales season the amount feature's PSI jumped to 0.6 — every input-drift alarm would fire — yet accuracy did not move, because the relationship the model relied on still held. When fraudsters changed tactics in month 7, the inputs looked exactly as before (PSI 0.00) while the frozen model's AUC fell from 0.87 to about 0.70 and stayed there. The monthly retrained model fell too, for one month, then recovered as soon as it had seen labelled examples of the new pattern.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="AUC of a frozen and a monthly retrained model, with input drift and concept drift periods">
<rect x="139.5" y="24" width="159.0" height="212" style="fill:var(--warn);fill-opacity:.08"/>
<text x="219.0" y="38" text-anchor="middle" class="s-sub" style="fill:var(--warn)">input drift: PSI 0.6</text>
<rect x="351.5" y="24" width="238.5" height="212" style="fill:var(--crit);fill-opacity:.07"/>
<text x="470.8" y="38" text-anchor="middle" class="s-sub" style="fill:var(--crit)">concept drift: PSI 0.00</text>
<line x1="60" y1="236.0" x2="590" y2="236.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="240.0" text-anchor="end" class="s-sub">0.6</text>
<line x1="60" y1="165.3" x2="590" y2="165.3" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="169.3" text-anchor="end" class="s-sub">0.7</text>
<line x1="60" y1="94.7" x2="590" y2="94.7" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="98.7" text-anchor="end" class="s-sub">0.8</text>
<line x1="60" y1="24.0" x2="590" y2="24.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="28.0" text-anchor="end" class="s-sub">0.9</text>
<text x="60.0" y="254" text-anchor="middle" class="s-sub">1</text>
<text x="113.0" y="254" text-anchor="middle" class="s-sub">2</text>
<text x="166.0" y="254" text-anchor="middle" class="s-sub">3</text>
<text x="219.0" y="254" text-anchor="middle" class="s-sub">4</text>
<text x="272.0" y="254" text-anchor="middle" class="s-sub">5</text>
<text x="325.0" y="254" text-anchor="middle" class="s-sub">6</text>
<text x="378.0" y="254" text-anchor="middle" class="s-sub">7</text>
<text x="431.0" y="254" text-anchor="middle" class="s-sub">8</text>
<text x="484.0" y="254" text-anchor="middle" class="s-sub">9</text>
<text x="537.0" y="254" text-anchor="middle" class="s-sub">10</text>
<text x="590.0" y="254" text-anchor="middle" class="s-sub">11</text>
<text x="325" y="274" text-anchor="middle" class="s-sub">month</text>
<text x="14" y="130" text-anchor="middle" class="s-sub" transform="rotate(-90 14 130)">AUC</text>
<polyline points="60.0,48.7 113.0,50.9 166.0,45.2 219.0,48.0 272.0,52.3 325.0,41.0 378.0,159.7 431.0,166.0 484.0,154.7 537.0,150.5 590.0,161.8" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="60.0" cy="48.7" r="3.4" style="fill:var(--crit)"/>
<circle cx="113.0" cy="50.9" r="3.4" style="fill:var(--crit)"/>
<circle cx="166.0" cy="45.2" r="3.4" style="fill:var(--crit)"/>
<circle cx="219.0" cy="48.0" r="3.4" style="fill:var(--crit)"/>
<circle cx="272.0" cy="52.3" r="3.4" style="fill:var(--crit)"/>
<circle cx="325.0" cy="41.0" r="3.4" style="fill:var(--crit)"/>
<circle cx="378.0" cy="159.7" r="3.4" style="fill:var(--crit)"/>
<circle cx="431.0" cy="166.0" r="3.4" style="fill:var(--crit)"/>
<circle cx="484.0" cy="154.7" r="3.4" style="fill:var(--crit)"/>
<circle cx="537.0" cy="150.5" r="3.4" style="fill:var(--crit)"/>
<circle cx="590.0" cy="161.8" r="3.4" style="fill:var(--crit)"/>
<line x1="606" y1="50" x2="624" y2="50" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="630" y="54" class="s-sub" style="fill:var(--ink-2)">frozen since month 0</text>
<polyline points="60.0,48.7 113.0,50.9 166.0,45.2 219.0,48.0 272.0,53.0 325.0,41.0 378.0,164.6 431.0,43.1 484.0,42.4 537.0,42.4 590.0,40.3" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="60.0" cy="48.7" r="3.4" style="fill:var(--good)"/>
<circle cx="113.0" cy="50.9" r="3.4" style="fill:var(--good)"/>
<circle cx="166.0" cy="45.2" r="3.4" style="fill:var(--good)"/>
<circle cx="219.0" cy="48.0" r="3.4" style="fill:var(--good)"/>
<circle cx="272.0" cy="53.0" r="3.4" style="fill:var(--good)"/>
<circle cx="325.0" cy="41.0" r="3.4" style="fill:var(--good)"/>
<circle cx="378.0" cy="164.6" r="3.4" style="fill:var(--good)"/>
<circle cx="431.0" cy="43.1" r="3.4" style="fill:var(--good)"/>
<circle cx="484.0" cy="42.4" r="3.4" style="fill:var(--good)"/>
<circle cx="537.0" cy="42.4" r="3.4" style="fill:var(--good)"/>
<circle cx="590.0" cy="40.3" r="3.4" style="fill:var(--good)"/>
<line x1="606" y1="72" x2="624" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="630" y="76" class="s-sub" style="fill:var(--ink-2)">retrained monthly</text>
</svg>` },

    { t: "callout", kind: "trap", title: "Input drift monitors cannot see concept drift",
      body: [
        { t: "p", text: "PSI and its relatives compare inputs, so they raise false alarms on harmless shifts and stay silent when the meaning of the inputs changes. Use them for what they are good at — broken pipelines and new populations — and watch model quality directly as labels arrive, with proxies in the meantime. In adversarial domains such as fraud and abuse, assume concept drift is continuous and retrain on a schedule regardless of alarms." }
      ] },

    { t: "table", head: ["Retraining trigger", "When it fits", "Watch out for"],
      rows: [
        ["Scheduled (daily, weekly)", "the default; adversarial or fast-moving domains", "retraining on a broken data day; validate before promoting"],
        ["Quality drop", "labels arrive quickly enough to measure it", "by the time it shows, the damage is done"],
        ["Data drift", "a new population or a pipeline change", "harmless shifts (the sales season) cause churn"],
        ["Event", "a launch, a new market, a policy change", "the new regime has few labels yet"]
      ] },

    { t: "p", text: "Automate the pipeline end to end — extract a time-split training set, train, evaluate against the current model on the same recent holdout, and promote only if it wins on the primary metric without losing on guardrails such as calibration and per-segment performance. A retrained model is a new model and goes through the same release stages as any other." },

    { t: "h2", n: "03", id: "release", text: "Releasing a model safely",
      sub: "Each stage risks a little more traffic to learn a little more" },

    { t: "diagram", kind: "steps", title: "From offline win to full rollout",
      items: [
        { label: "Offline evaluation", desc: "Beats the current model on a recent time-split holdout, overall and per segment.", tone: "accent" },
        { label: "Shadow", desc: "Scores live traffic alongside the current model; its output is logged, never used.", tone: "violet" },
        { label: "Canary", desc: "Serves 1–5% of traffic; watch latency, errors, prediction distribution, fallbacks.", tone: "warn" },
        { label: "A/B test", desc: "A planned split long enough for the primary metric and guardrails to be measured.", tone: "teal" },
        { label: "Rollout with holdout", desc: "Ship to most users; keep a small group on the old model to measure slow effects.", tone: "good" }
      ] },

    { t: "p", text: "Shadow mode is the cheapest safety net in ML: it costs inference capacity, puts no user at risk, and answers the questions offline evaluation cannot — real latency, real feature values (skew, 13.2), and how often the new model disagrees with the old one and where. The canary then catches what only real consequences reveal, with an automatic rollback on any guardrail breach." },

    { t: "h2", n: "04", id: "experiments", text: "A/B tests for models",
      sub: "Small effects need large samples, and checking early invents winners" },

    { t: "p", text: "Model improvements are usually small — a 2% relative lift is a good result — and small effects need very large samples to distinguish from noise. Assign users, not requests, to arms with a stable hash of the user ID and an experiment-specific salt, so each user stays in one arm and experiments do not correlate. Then size the test before starting it, and analyse it once:" },

    { t: "code", lang: "python", title: "abtest.py — sample sizes, and what daily peeking does to false positives",
      code: `import math, random
random.seed(21)
Z_ALPHA, Z_POWER = 1.96, 0.84             # two-sided 5% significance, 80% power

def users_per_arm(base, lift):            # classic sample size for comparing two proportions
    p1, p2 = base, base * (1 + lift)
    return (Z_ALPHA + Z_POWER) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p2 - p1) ** 2

def p_value(conv_a, conv_b, n):           # two-proportion z-test, n users in each arm
    pooled = (conv_a + conv_b) / (2 * n)
    se = math.sqrt(2 * pooled * (1 - pooled) / n)
    z = abs(conv_a - conv_b) / n / se
    return math.erfc(z / math.sqrt(2))

print("users needed per arm to detect a relative lift on a 5% conversion rate")
for lift in (0.01, 0.02, 0.05, 0.10):
    print(f"  {lift:>4.0%} lift: {users_per_arm(0.05, lift):>12,.0f}")

def a_a_test(days=14, daily=2_000, p=0.05):  # both arms identical: any "winner" is a false positive
    a = b = 0; first_significant = None
    for day in range(1, days + 1):
        a += round(random.gauss(daily * p, math.sqrt(daily * p * (1 - p))))
        b += round(random.gauss(daily * p, math.sqrt(daily * p * (1 - p))))
        if first_significant is None and p_value(a, b, day * daily) < 0.05: first_significant = day
    return first_significant, p_value(a, b, days * daily) < 0.05

runs = [a_a_test() for _ in range(5_000)]
print(f"\\n5,000 A/A tests with no real difference, 14 days, 2,000 users per arm per day")
print(f"  analysed once, at the planned end:          {sum(end for _, end in runs) / len(runs):.1%} declared a winner")
print(f"  checked daily, stopped at the first p<0.05: {sum(1 for first, _ in runs if first) / len(runs):.1%} declared a winner")`,
      hl: [5, 7, 24],
      out: `users needed per arm to detect a relative lift on a 5% conversion rate
    1% lift:    2,993,304
    2% lift:      751,848
    5% lift:      121,983
   10% lift:       31,195

5,000 A/A tests with no real difference, 14 days, 2,000 users per arm per day
  analysed once, at the planned end:          4.9% declared a winner
  checked daily, stopped at the first p<0.05: 23.0% declared a winner` },

    { t: "p", text: "Detecting a 2% lift on a 5% conversion rate needs about 750,000 users per arm; halving the detectable lift quadruples the sample. The second result is the trap. With no real difference at all, analysing once at the planned end produced the expected 5% false positives; checking every day and stopping at the first significant result produced 23%. A team that peeks will ship one useless model in four and believe each one worked." },

    { t: "callout", kind: "warn", title: "The other ways experiments mislead",
      body: [
        { t: "p", text: "**Multiple metrics**: test twenty metrics at 5% and one will \"win\" by chance; name one primary metric in advance and correct for the rest. **Novelty effects**: users click on anything new for a week; run at least two full weeks. **Interference**: in marketplaces and social networks the arms affect each other — a ranking that sends more buyers to some sellers changes what the other arm sees — so randomise by region or cluster. **Simpson's paradox**: an aggregate win can hide a loss in every segment when the mix differs; check the important segments. For ranking, **interleaving** — merging both models' results into one list and seeing which model's items get the clicks — detects differences with far fewer users." }
      ] },

    { t: "h2", n: "05", id: "fairness", text: "Fairness",
      sub: "Several reasonable definitions, which cannot all hold at once" },

    { t: "p", text: "A model can be accurate overall and systematically worse for a group, and the harm compounds through feedback loops: applicants who are refused never produce repayment data, so the model never learns it was wrong about them. Measuring fairness means choosing what equal should mean. A calibrated repayment score for two groups whose historical repayment rates differ, under one threshold and then under thresholds set per group:" },

    { t: "code", lang: "python", title: "fairness.py — approval rate, TPR and FPR by group, under two policies",
      code: `import random
random.seed(17)

# A calibrated repayment score for two groups whose historical repayment rates differ (80% and 65%)
def applicants(group, n, a, b):
    out = []
    for _ in range(n):
        s = random.betavariate(a, b)
        out.append((group, s, random.random() < s))       # repays with probability = score: calibrated
    return out
people = applicants("A", 70_000, 8, 2) + applicants("B", 30_000, 6.5, 3.5)

def report(rule):
    print(f"  {'group':<6}{'approved':>9}{'TPR':>7}{'FPR':>7}{'repay rate if approved':>24}")
    for g in ("A", "B"):
        rows = [(s, y) for grp, s, y in people if grp == g]
        approved = [(s, y) for s, y in rows if s >= rule[g]]
        tpr = sum(y for _, y in approved) / sum(y for _, y in rows)              # of those who would repay
        fpr = sum(1 for _, y in approved if not y) / sum(1 for _, y in rows if not y)
        print(f"  {g:<6}{len(approved) / len(rows):>9.0%}{tpr:>7.0%}{fpr:>7.0%}{sum(y for _, y in approved) / len(approved):>24.0%}")

def threshold_for_tpr(g, target):      # the group's threshold that approves \`target\` of its repayers
    repayers = sorted((s for grp, s, y in people if grp == g and y), reverse=True)
    return repayers[int(target * len(repayers)) - 1]

print("one threshold for everyone (0.70)")
report({"A": 0.70, "B": 0.70})
rule = {g: threshold_for_tpr(g, 0.80) for g in ("A", "B")}
print(f"\\nthresholds set per group so each approves 80% of its repayers (A {rule['A']:.2f}, B {rule['B']:.2f})")
report(rule)`,
      hl: [9, 22, 28],
      out: `one threshold for everyone (0.70)
  group  approved    TPR    FPR  repay rate if approved
  A           81%    85%    62%                     85%
  B           40%    48%    23%                     80%

thresholds set per group so each approves 80% of its repayers (A 0.73, B 0.57)
  group  approved    TPR    FPR  repay rate if approved
  A           75%    80%    53%                     86%
  B           72%    80%    57%                     73%` },

    { t: "dl", items: [
      { term: "Demographic parity", def: "Equal approval rates across groups. One threshold gave 81% against 40%." },
      { term: "Equal opportunity", def: "Equal true-positive rates: people who would repay are approved at the same rate. One threshold gave 85% against 48%; per-group thresholds equalised it at 80%." },
      { term: "Calibration", def: "A score means the same probability in every group. True here by construction — and it is exactly why one threshold produced unequal rates, since the groups' score distributions differ." }
    ] },

    { t: "p", text: "Equalising opportunity brought approval rates close together, but the repayment rate among those approved now differed (86% against 73%) and so did the false-positive rate. When base rates differ, calibration, equal true-positive rates and equal false-positive rates cannot all hold at once — a mathematical result, not a modelling failure. Which criterion applies is a legal and policy decision for the organisation, not a technical one; in some domains, lending among them, using the protected attribute in the decision is itself restricted. The engineering duty is to measure every relevant metric per group, report it, and make the trade-off visible." },

    { t: "exercise", kind: "Challenge", title: "A monitor that catches a broken pipeline",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Serving logs four features per prediction and substitutes a default when one is missing. Build the daily data monitor: compare each day's 5,000 logged rows with a 10,000-row reference from training, and alert. Test it on twenty days in which an upstream change on day 9 makes account age missing for most users — silently replaced by the default — and from day 14 the amount feature creeps upwards by 5% a day." }
      ],
      requirements: [
        "PSI per feature against the reference: ticket at 0.10, page at 0.25",
        "For features with a serving default, page when the default's share rises more than 10 points",
        "Report changes in alert state, not the same alert every day",
        "Print what is still open at the end"
      ],
      hint: "A missing value replaced by a default is invisible to null checks — count how often the default value appears and compare with the reference.",
      solution: { lang: "python", title: "monitor_ex.py",
        code: `import math, random
random.seed(30)

def row(day):                       # what serving logs per prediction: four features, defaults filled in
    amount = random.lognormvariate(3.5 + (0.05 * (day - 13) if day >= 14 else 0), 0.7)   # day 14 on: creeping up
    age = 0 if day >= 9 and random.random() < 0.6 else random.randint(1, 3000)          # day 9: upstream breaks
    return {"amount": amount, "items": random.randint(1, 8), "account_age_days": age, "device_score": random.random()}

def psi(expected, actual, bins=10):
    edges = sorted(expected)[len(expected) // bins::len(expected) // bins][:bins - 1]
    share = lambda xs: [max(1e-4, sum(1 for x in xs if lo <= x < hi) / len(xs))
                        for lo, hi in zip([-math.inf] + edges, edges + [math.inf])]
    return sum((a - e) * math.log(a / e) for e, a in zip(share(expected), share(actual)))

DEFAULTS = {"account_age_days": 0}  # the value serving substitutes when a feature is missing
reference = [row(0) for _ in range(10_000)]
state = {}                           # alert level per feature: report changes, not every day
for day in range(1, 21):
    today = [row(day) for _ in range(5_000)]
    for f in reference[0]:
        ref, cur = [r[f] for r in reference], [r[f] for r in today]
        level, why, drift = "ok", [], psi(ref, cur)
        if f in DEFAULTS:
            rate = sum(v == DEFAULTS[f] for v in cur) / len(cur)
            if rate - sum(v == DEFAULTS[f] for v in ref) / len(ref) > 0.10:
                level = "PAGE"; why.append(f"default value in {rate:.0%} of rows")
        if drift >= 0.25: level = "PAGE"
        elif drift >= 0.10 and level == "ok": level = "TICKET"
        if level != state.get(f, "ok"):
            print(f"day {day:>2}  {level:<7}{f:<18}{', '.join(why + [f'PSI {drift:.2f}'])}")
            state[f] = level
print(f"day 20  open: " + ", ".join(f"{f} ({lvl})" for f, lvl in state.items() if lvl != "ok"))`,
        out: `day  9  PAGE   account_age_days  default value in 62% of rows, PSI 1.58
day 18  TICKET amount            PSI 0.12
day 20  open: account_age_days (PAGE), amount (TICKET)`,
        notes: [
          { t: "p", text: "The broken pipeline paged on the day it happened, on both signals: the default appeared in over 60% of rows, and the feature's distribution collapsed (PSI around 1.5). Without the default-rate check it would still have been caught here, but a default close to common real values can hide behind a modest PSI. The gradual drift crossed the ticket level on day 18 — creeping changes are caught late by design, which is why trends over weeks belong on a dashboard as well." },
          { t: "p", text: "Reporting only state changes matters in practice: an alert that repeats every day is muted within a week. Production monitors add per-segment checks (one country's pipeline can break alone), the prediction distribution as a model-level proxy, and freshness of the features themselves." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the fraud model that decayed in silence",
      body: [
        { t: "p", text: "**Symptom.** Fraud losses rose 40% over two months. Every model dashboard was green: no feature drift, a stable prediction distribution, and the last measured AUC — from labels two months old — was as good as at launch." },
        { t: "p", text: "**Mechanism.** A fraud ring had shifted to small, rapid payments across many new accounts, a pattern the model weighted lightly. The inputs looked normal, so drift monitors stayed quiet; chargebacks take up to 60 days to arrive, so measured quality lagged reality by two months; and the model had last been retrained when it launched." },
        { t: "p", text: "**Fix.** Customer disputes, which arrive within days, became an early proxy label with its own quality dashboard. A challenger model is now retrained weekly and run in shadow against the champion, and promoted when it wins on the recent disputed set; analysts' confirmed cases are added to training data the day they are confirmed." }
      ] }
  ],

  takeaways: [
    "Monitor four layers: **system, data, model, business**; model quality waits for **labels**, so watch proxies meanwhile.",
    "**Data drift** set off a PSI of 0.6 and did **no harm**; **concept drift** showed **PSI 0.00** while AUC fell from 0.87 to about 0.70.",
    "Input monitors catch broken pipelines, not changed meanings; in adversarial domains **retrain on a schedule**.",
    "Retraining is automated end to end and **promotes only on a win** against the current model, through the same release stages.",
    "Release through **offline, shadow, canary, A/B, rollout with holdout**, with automatic rollback on guardrails.",
    "Small lifts need big samples: about **750,000 users per arm** for a 2% lift on 5% conversion.",
    "**Peeking** daily turned 5% false positives into **23%**; fix the horizon or use sequential methods built for it.",
    "Watch for multiple metrics, novelty, interference and Simpson's paradox; **interleaving** is faster for ranking.",
    "Fairness criteria conflict when base rates differ: one threshold approved **81% against 40%**; equal opportunity changed precision instead. Measure per group and make the choice explicit."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Every feature-drift alarm fires during a holiday sale, but the model's accuracy is unchanged. What happened?",
        options: ["The alarms are broken", "Data drift without concept drift: the inputs moved, but the relationship the model uses still holds", "Concept drift", "Label leakage"],
        answer: 1,
        why: "drift.py's months 3 to 5 showed PSI of about 0.6 with no change in AUC. Input drift is worth investigating, but it is not the same as damage." },

      { stem: "A fraud model's inputs look exactly as they did at launch, yet losses are climbing. Which monitoring would have caught it?",
        options: ["More feature-drift checks", "Model-quality monitoring on labels or early proxies (such as disputes), plus regular retraining — the inputs did not change, their meaning did", "Latency monitoring", "Nothing could"],
        answer: 1,
        why: "Concept drift leaves input distributions unchanged; PSI was 0.00 while AUC fell to about 0.70. Only measuring outcomes, early or late, reveals it." },

      { stem: "A team checks its A/B test every morning and stops as soon as p < 0.05. What is wrong?",
        options: ["Nothing; it saves time", "Repeated looks inflate the false-positive rate — to 23% in simulated tests with no real difference — so fix the duration in advance or use a sequential test designed for monitoring", "p should be below 0.01", "They should check twice a day"],
        answer: 1,
        why: "Each look is another chance for noise to cross the line. abtest.py measured 4.9% false positives when analysed once and 23.0% with daily stopping." },

      { stem: "With a calibrated score and one threshold, two groups with different base rates get different approval and true-positive rates. Per-group thresholds equalise the true-positive rate. What changes as a result?",
        options: ["Nothing else", "Other measures diverge — here the repayment rate among approved applicants and the false-positive rate — because with different base rates these criteria cannot all be equal", "The score stops being calibrated", "Accuracy rises in both groups"],
        answer: 1,
        why: "It is a known impossibility result. fairness.py equalised TPR at 80%, after which approved applicants repaid at 86% in one group and 73% in the other. Choosing which criterion matters is a policy decision." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Monitoring and experimentation answers should be layered and specific about delayed labels.",
    questions: [
      { level: "core",
        q: "What would you monitor for a deployed ML model?",
        strong: "A strong answer covers four layers, delayed labels, proxies and alert priorities.",
        answer: [
          { t: "p", text: "System: latency percentiles, error and timeout rates, throughput, fallback rate. Data: per-feature distributions against training (PSI), missing and default-value rates, schema and freshness of each feature source. Model: the prediction distribution and share above threshold immediately; quality metrics and calibration as labels arrive, with early proxies in between. Business: the online metric and guardrails." },
          { t: "p", text: "Page on system failures and broken data; ticket on gradual drift; review quality weekly. Slice everything by important segments, since a single country or app version can break alone, and keep a small holdout on the previous model to measure slow effects." }
        ] },

      { level: "advanced",
        q: "How would you design the retraining strategy for a fraud model?",
        strong: "A strong answer handles label delay, adversarial drift and safe promotion.",
        answer: [
          { t: "p", text: "Fraud is adversarial, so assume continuous concept drift and retrain on a schedule — weekly, say — rather than waiting for alarms. Labels are delayed: chargebacks take weeks, so train on data old enough for labels to have matured, and supplement with faster signals such as disputes and analyst-confirmed cases, weighted for recency." },
          { t: "p", text: "Each retrained model is a challenger: evaluated against the champion on the most recent matured data and per segment, run in shadow on live traffic, and promoted only if it wins without losing on calibration or alert volume. Keep rules for known patterns as a fast-reacting layer beside the model, since retraining always lags a new attack by at least one cycle." }
        ] },

      { level: "core",
        q: "How do you design an A/B test for a new model?",
        strong: "A strong answer covers metrics, sizing, assignment, duration and pitfalls.",
        answer: [
          { t: "p", text: "Choose one primary metric and guardrails in advance. Size the test with a power calculation for the smallest lift worth detecting. Assign users by a salted hash of the user ID so assignment is stable and independent across experiments. Run at least two full weeks for novelty and weekly cycles, and analyse once at the planned end, or use a sequential method designed for continuous monitoring." },
          { t: "p", text: "Check guardrails and key segments, correct for multiple comparisons, and watch for interference in marketplaces and networks — randomise by cluster or region if needed. For rankers, interleaving can find the better model with far fewer users before a full A/B confirms the business effect." }
        ] }
    ]
  }
});
