/* ============================================================================
   LESSON 6.4 — The Statistical Mistakes That Ship
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "**These mistakes ship because they produce plausible numbers**, not obviously broken ones. Each has a recognisable shape, each survives code review, and each has a check that takes one line. This is the closing lesson because recognising the shape is what the rest of the course was for.",

  objectives: [
    "Recognise each mistake by the shape it takes in a report",
    "Apply the one-line check that catches each one",
    "Explain regression to the mean, and why it fakes an effect",
    "Identify survivorship and Berkson bias in real datasets",
    "Build the review habits that catch these before they ship"
  ],

  prerequisites: ["6.3"],

  blocks: [

    { t: "h2", n: "01", text: "Regression to the mean", id: "regression-to-mean" },

    { t: "p", text: "**Any measurement is signal plus noise, so selecting the most extreme cases selects partly for extreme noise — and noise does not repeat.** The group therefore improves on remeasurement whether or not anything was done to it, which fakes an effect in every targeted programme." },

    { t: "dl", items: [
      ["Regression to the mean", "The tendency of extreme measurements to be followed by less extreme ones, purely from measurement noise."],
      ["Reliability", "The test-retest correlation `r`. Lower reliability means more regression, and a single quarter's data is usually low."],
      ["The size of the artefact", "`(1 − r) × (selection gap)` — predictable in advance, so you can compute the fake effect before running the study."],
      ["The defence", "A control group selected the **same way**. Both regress equally, and the difference is the real effect — and for a targeted programme it costs nothing."],
      ["Third-measurement check", "Select on measurement 1, evaluate on measurement 3. Regression happens between 1 and 2 and does not happen again."]
    ]},

    { t: "viz",
      title: "Select on an extreme, measure again, and the effect appears",
      caption: "Any measurement is signal plus noise. Selecting the extreme selects for extreme noise, and noise does not repeat — so the group improves on remeasurement whether or not anything was done to it.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Two measurement occasions with an extreme-selected group moving towards the mean on the second">
  <line x1="140" y1="200" x2="140" y2="30" style="stroke:var(--line)" stroke-width="1.5"/>
  <line x1="620" y1="200" x2="620" y2="30" style="stroke:var(--line)" stroke-width="1.5"/>
  <text x="106" y="222" class="s-sub" style="fill:var(--ink-3)">time 1</text>
  <text x="586" y="222" class="s-sub" style="fill:var(--ink-3)">time 2</text>

  <line x1="100" y1="115" x2="660" y2="115" style="stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="1.5"/>
  <text x="672" y="119" class="s-sub" style="fill:var(--ink-3)">population mean</text>

  <g style="fill:var(--ink-3)">
    <circle cx="140" cy="92" r="4"/><circle cx="140" cy="104" r="4"/>
    <circle cx="140" cy="126" r="4"/><circle cx="140" cy="138" r="4"/>
  </g>
  <g style="fill:var(--crit)">
    <circle cx="140" cy="52" r="5"/><circle cx="140" cy="62" r="5"/><circle cx="140" cy="72" r="5"/>
  </g>
  <text x="20" y="58" class="s-sub" style="fill:var(--crit)">selected:</text>
  <text x="20" y="76" class="s-sub" style="fill:var(--crit)">worst 10%</text>

  <g style="stroke:var(--crit);stroke-width:1.5;stroke-dasharray:4 3">
    <line x1="150" y1="52" x2="612" y2="96"/>
    <line x1="150" y1="62" x2="612" y2="108"/>
    <line x1="150" y1="72" x2="612" y2="86"/>
  </g>
  <g style="fill:var(--crit)">
    <circle cx="620" cy="96" r="5"/><circle cx="620" cy="108" r="5"/><circle cx="620" cy="86" r="5"/>
  </g>
  <text x="644" y="92" class="s-sub" style="fill:var(--good)">they improved</text>
  <text x="644" y="110" class="s-sub" style="fill:var(--good)">with no intervention</text>

  <text x="20" y="180" class="s-sub" style="fill:var(--ink-3)">the amount of improvement is exactly</text>
  <text x="20" y="198" class="s-sub" style="fill:var(--ink-3)">(1 - correlation) x the selection gap</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the effect that appears from nothing", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# ANY MEASUREMENT IS TRUE VALUE PLUS NOISE. Select the extreme and you
# have selected partly for extreme noise, which does not repeat.

n = 10_000
true_ability = rng.normal(100, 10, n)
score1 = true_ability + rng.normal(0, 10, n)      # measurement 1
score2 = true_ability + rng.normal(0, 10, n)      # measurement 2, NO change

worst = score1 < np.percentile(score1, 10)

score1[worst].mean()                    # 79.5
score2[worst].mean()                    # 89.6
score2[worst].mean() - score1[worst].mean()      # +10.1
#
# A TEN-POINT IMPROVEMENT WITH NO INTERVENTION AT ALL. Run a training
# programme on these people and it "works" every time.

# AND THE BEST PERFORMERS GET WORSE:
best = score1 > np.percentile(score1, 90)
score2[best].mean() - score1[best].mean()        # -10.2
#
# So praising success "causes" decline and criticising failure
# "causes" improvement. That is the classic finding, and it is
# arithmetic rather than psychology.

# THE SIZE IS PREDICTABLE, which is what makes it a check rather than
# a worry:
#
#     expected regression = (1 - r) x (selected mean - population mean)
#
def expected_regression(selected_mean, population_mean, reliability):
    """reliability is the test-retest correlation."""
    return (1 - reliability) * (population_mean - selected_mean)

r = np.corrcoef(score1, score2)[0, 1]            # 0.499
expected_regression(79.5, 100.0, r)              # +10.3, matching +10.1
#
# SO YOU CAN PREDICT THE FAKE EFFECT BEFORE RUNNING THE STUDY, and
# compare it against whatever the intervention produced.

# THE SHAPE IT TAKES IN A REPORT:
#   "we targeted our worst-performing stores and they improved 12%"
#   "customers we called after a bad rating rated us higher next time"
#   "the remedial class raised test scores"
#   "our intervention on high-error servers reduced their error rate"
#
# EVERY ONE SELECTS ON AN EXTREME AND REMEASURES. Every one shows an
# effect with no intervention.

# THE ONE-LINE CHECK: A CONTROL GROUP SELECTED THE SAME WAY.
def with_control(score1, score2, treated_mask, control_mask):
    """The only defence. Both groups are selected on the extreme, so
    both regress -- and the difference is the real effect."""
    t = score2[treated_mask].mean() - score1[treated_mask].mean()
    c = score2[control_mask].mean() - score1[control_mask].mean()
    return {"treated_change": float(t), "control_change": float(c),
            "true_effect": float(t - c)}

idx = np.flatnonzero(worst)
rng.shuffle(idx)
treated, control = idx[:len(idx)//2], idx[len(idx)//2:]
m_t = np.zeros(n, bool); m_t[treated] = True
m_c = np.zeros(n, bool); m_c[control] = True

with_control(score1, score2, m_t, m_c)
# {'treated_change': 10.4, 'control_change': 9.9, 'true_effect': 0.5}
#
# BOTH GROUPS IMPROVE ABOUT TEN POINTS. The intervention effect is
# 0.5, which is the truth.

# THE OTHER DEFENCE, when a control is impossible: SELECT ON ONE
# MEASUREMENT AND EVALUATE ON A THIRD, INDEPENDENT one. Regression
# happens between measurement 1 and 2; it does not happen again
# between 2 and 3.
score3 = true_ability + rng.normal(0, 10, n)
score3[worst].mean() - score2[worst].mean()      # ~0.0
`,
      hl: [16, 25, 36, 56],
      caption: "**The size of the fake effect is predictable: `(1 − r) × (selection gap)`.** That turns regression to the mean from a worry into a number you can compute before the study and compare against."
    },

    { t: "h2", n: "02", text: "Survivorship and its relatives", id: "survivorship" },

    { t: "p", text: "**Survivorship bias is when the sample contains only what survived a process, and survival depends on the outcome.** The data that is missing is precisely the data that would change your conclusion, and nothing in the surviving data reveals its absence." },

    { t: "dl", items: [
      ["Survivorship bias", "Analysing only the cases that lasted long enough to be observed. Funds that closed, startups that failed, customers who already churned."],
      ["Attrition", "The fraction of the original population missing from the sample. If it relates to the outcome, the sample is not the population."],
      ["Berkson's paradox", "Selecting on a **combination** of two conditions makes them appear negatively correlated even when independent. A collider (lesson 3.6) in sampling clothing."],
      ["Left truncation", "Cases that ended before observation began are absent entirely, which biases any duration estimate upward."],
      ["The check", "Count who is missing, and ask whether both variables affected their absence."]
    ]},

    { t: "code", lang: "python", title: "the data that is missing is the data that matters", code: `
# SURVIVORSHIP BIAS: the sample contains only the things that survived
# whatever process produced it, and survival depends on the outcome.

# THE CANONICAL EXAMPLE, and it is worth the arithmetic:
# Returning bombers had bullet holes concentrated on the wings and
# fuselage, and few on the engines. The instinct was to armour the
# wings.
n_planes = 1000
hit_engine = rng.random(n_planes) < 0.25
hit_wing = rng.random(n_planes) < 0.55
returned = ~(hit_engine & (rng.random(n_planes) < 0.85))   # engine hits kill

hit_wing[returned].mean()               # 0.55  common among survivors
hit_engine[returned].mean()             # 0.05  rare among survivors
hit_engine.mean()                       # 0.25  and common overall
#
# ENGINE HITS ARE RARE IN THE DATA BECAUSE ENGINE HITS ARE FATAL.
# Armour the engines.

# THE MODERN VERSIONS, all identical in structure:
#
#  "Successful startups all pivoted"      -- so did the failed ones,
#                                            and you cannot see them
#  "Our best customers use feature X"     -- customers who did not
#                                            like X already churned
#  "This fund beat the market ten years"  -- funds that did not were
#                                            closed and delisted
#  "Users who complete onboarding retain" -- completing onboarding is
#                                            a symptom of intent
#  "Our model is 99% accurate in prod"    -- on the requests that did
#                                            not time out

# QUANTIFY THE FUND CASE, because the number is startling:
def surviving_fund_returns(n_funds=1000, years=10, true_alpha=0.0,
                           vol=0.15, close_below=-0.05, seed=0):
    """Funds are closed after a bad year and vanish from the index."""
    r = np.random.default_rng(seed)
    alive = np.ones(n_funds, bool)
    cumulative = np.zeros(n_funds)
    for _ in range(years):
        ret = r.normal(true_alpha, vol, n_funds)
        cumulative[alive] += ret[alive]
        alive &= ret > close_below
    return {"true_alpha": true_alpha,
            "survivors": int(alive.sum()),
            "reported_annual": float(cumulative[alive].mean()/years)}

surviving_fund_returns()
# {'true_alpha': 0.0, 'survivors': 155, 'reported_annual': 0.052}
#
# A 5.2% ANNUAL "ALPHA" FROM A UNIVERSE WITH ZERO TRUE ALPHA, purely
# because losers were removed from the index. The survivors are real
# funds with real returns -- the bias is in which ones you can see.

# THE ONE-LINE CHECK: COUNT WHAT IS MISSING.
def survivorship_check(n_started, n_in_sample, outcome_of_missing=None):
    """If the sample is much smaller than the population that entered,
    ask what happened to the difference -- and whether it correlates
    with the outcome."""
    attrition = 1 - n_in_sample/n_started
    return {
        "attrition": attrition,
        "verdict": ("negligible" if attrition < 0.05 else
                    f"{attrition:.0%} missing -- establish whether "
                    f"their outcomes differ before generalising"),
    }

survivorship_check(1000, 155)
# {'attrition': 0.845, 'verdict': '85% missing -- establish whether...'}

# BERKSON'S PARADOX -- the same structure, from selecting on a
# COMBINATION rather than on survival (lesson 3.6's collider):
n = 100_000
disease_a = rng.random(n) < 0.10
disease_b = rng.random(n) < 0.10
np.corrcoef(disease_a, disease_b)[0,1]           # ~0.00, independent

# Hospitalised if you have EITHER condition:
hospital = disease_a | disease_b
np.corrcoef(disease_a[hospital], disease_b[hospital])[0,1]   # -0.53
#
# STRONGLY NEGATIVELY CORRELATED AMONG PATIENTS, and independent in
# the population. Among hospitalised people, not having A makes B more
# likely -- because something got you admitted.
#
# THIS IS WHY HOSPITAL-BASED CASE-CONTROL STUDIES ARE TREATED WITH
# SUSPICION, and it applies equally to any dataset filtered on a
# combination: support tickets, fraud reviews, escalations.
`,
      hl: [17, 45, 55, 73],
      caption: "**A 5.2% annual \"alpha\" from a universe with zero true alpha.** The survivors are real funds with real returns — the bias is entirely in which ones you can see."
    },

    { t: "callout", kind: "trap", title: "Simpson's paradox, and which table to read", body: [
      { t: "p", text: "A trend in every subgroup can reverse when the groups are pooled. Both tables are correct, and which one answers your question depends on whether the grouping variable is a confounder or a mediator." },
      { t: "code", lang: "python", numbered: false, title: "the rule that decides it", code: `
#              TREATMENT A          TREATMENT B
#  severity   success  n  rate    success  n  rate
#  mild          81   87  93.1%     234  270  86.7%
#  severe       192  263  73.0%      55   80  68.8%
#  ---------------------------------------------------
#  overall      273  350  78.0%     289  350  82.6%
#
# A WINS IN BOTH SUBGROUPS AND LOSES OVERALL, because A was given
# mostly to severe cases.

# THE RULE, and it is the only thing that decides which table to read:
#
#   THE GROUPING VARIABLE IS A CONFOUNDER (it CAUSES both the group
#   assignment and the outcome)         -> use the SUBGROUP tables
#
#   THE GROUPING VARIABLE IS A MEDIATOR (the treatment causes it, and
#   it causes the outcome)              -> use the POOLED table
#
# SEVERITY causes both the treatment choice and recovery, so it is a
# confounder. Condition on it: A wins.
#
# BUT SUPPOSE THE GROUPING WERE "developed a side effect". The
# treatment causes the side effect, which causes worse outcomes.
# Conditioning on it would remove part of the treatment's own effect,
# so the POOLED table is correct there.
#
# SAME TABLE SHAPE, OPPOSITE ANSWER, DECIDED ENTIRELY BY WHICH CAUSAL
# STORY IS TRUE. That is a question about the process, not the data.

# THE PRACTICAL DEFENCE: STANDARDISE TO A COMMON MIX and report both.
def standardise(rates, weights):
    return float(np.asarray(rates) @ np.asarray(weights))

mix = np.array([87+270, 263+80], float); mix /= mix.sum()
standardise([81/87, 192/263], mix)               # 0.832  treatment A
standardise([234/270, 55/80], mix)               # 0.780  treatment B
#
# ON A COMMON CASE MIX, A WINS -- matching every subgroup and
# reversing the naive pooled comparison.

# THE ONE-LINE CHECK: does the pooled direction match every subgroup?
def simpson_check(subgroup_rates_a, subgroup_rates_b, ns_a, ns_b):
    sub = [a > b for a, b in zip(subgroup_rates_a, subgroup_rates_b)]
    pooled_a = np.average(subgroup_rates_a, weights=ns_a)
    pooled_b = np.average(subgroup_rates_b, weights=ns_b)
    reversed_ = all(sub) and pooled_a < pooled_b
    return {"all_subgroups_favour_a": all(sub),
            "pooled_favours_a": pooled_a > pooled_b,
            "reversal": reversed_,
            "warning": ("REVERSAL: the group sizes differ systematically "
                        "-- decide whether the grouping is a confounder "
                        "or a mediator before reporting either table")
                       if reversed_ else "consistent"}

simpson_check([81/87, 192/263], [234/270, 55/80], [87, 263], [270, 80])
# {'all_subgroups_favour_a': True, 'pooled_favours_a': False,
#  'reversal': True, 'warning': 'REVERSAL: ...'}`},
      { t: "p", text: "**A confounder means read the subgroups; a mediator means read the pooled table.** Same table shape, opposite answer, decided entirely by which causal story is true — which is a question about the process, not the data." }
    ]},

    { t: "h2", n: "03", text: "The review checklist", id: "checklist" },

    { t: "p", text: "Each of these mistakes has **a recognisable shape in a report and a one-line check** — which is faster than re-deriving the statistics every time. Reading the shape is the practical skill this module has been building towards." },

    { t: "dl", items: [
      ["Who is missing?", "What population entered, and does the reason for leaving relate to the outcome?"],
      ["What was selected on?", "If any group was chosen for being extreme, compute `(1−r) × gap` before believing any improvement."],
      ["How many tests?", "Metrics, segments, time windows and specifications. The answer is never one."],
      ["What is the effect size?", "In the units of the decision, with an interval. Not the p-value."],
      ["What is the power?", "For the effect **claimed**, not the effect observed. Below 50%, a significant result is probably exaggerated."],
      ["What is the unit?", "Does the unit of analysis match the unit of randomisation, and are rows independent?"],
      ["What would falsify it?", "If the claim were false, what would the data look like? If the answer is \"the same\", it is not a finding."]
    ]},

    { t: "table",
      head: ["The shape it takes", "What it is", "The one-line check"],
      rows: [
        ["\"We targeted the worst and they improved\"", "Regression to the mean", "Compute `(1−r) × gap` and compare"],
        ["\"All our best customers do X\"", "Survivorship", "Count who left before you measured"],
        ["\"It works in every segment but not overall\"", "Simpson's paradox", "Is the grouping a confounder or mediator?"],
        ["\"Significant in the mobile subgroup\"", "Multiple testing", "How many subgroups were examined?"],
        ["\"p = 0.03 on 40 patients\"", "Type M error", "Power for the claimed effect"],
        ["\"No significant difference, so no effect\"", "Absence of evidence", "What does the interval rule out?"],
        ["\"The p99 is 180 ms\"", "Wrong aggregation", "Were percentiles averaged?"],
        ["\"99% accurate\"", "Base rate neglect", "What is the class balance?"],
        ["\"Correlation 0.8 with revenue\"", "Confounding", "What predicts both?"],
        ["\"We removed outliers\"", "Selection on the outcome", "Were they wrong, or just unusual?"]
      ],
      caption: "**Each check takes one line and catches a class of error, not an instance.** Reading the shape is faster than re-deriving the statistics every time."
    },

    { t: "code", lang: "python", title: "the checks, as code you can run", code: `
def review_checklist(claim):
    """The questions to ask of any quantitative claim, in the order
    that catches the most for the least effort."""
    return [
        # 1. WHO IS MISSING?
        "What population entered, and what fraction reached the sample? "
        "Does the reason for leaving relate to the outcome?",

        # 2. WHAT WAS THE SELECTION?
        "Was any group chosen for being extreme? If so, compute "
        "(1 - reliability) x (selection gap) before believing any "
        "improvement.",

        # 3. HOW MANY TESTS?
        "How many metrics, segments, time windows and specifications "
        "were examined? The answer is never one.",

        # 4. WHAT IS THE EFFECT SIZE?
        "Not the p-value. In the units of the decision, with an "
        "interval.",

        # 5. WHAT IS THE POWER?
        "For the effect claimed, not the effect observed. Below 50% "
        "power, a significant result is probably exaggerated.",

        # 6. WHAT IS THE UNIT?
        "Is the unit of analysis the unit of randomisation? Are rows "
        "independent?",

        # 7. WHAT WOULD FALSIFY IT?
        "If this claim were false, what would the data look like? If "
        "the answer is 'the same', it is not a finding.",
    ]

# ---- AND AS ACTUAL TESTS --------------------------------------------

def check_regression_to_mean(before, after, selection_threshold,
                             reliability=None):
    """Compare the observed improvement against the predicted artefact."""
    before, after = np.asarray(before, float), np.asarray(after, float)
    sel = before < selection_threshold
    if reliability is None:
        reliability = float(np.corrcoef(before, after)[0, 1])

    observed = float(after[sel].mean() - before[sel].mean())
    predicted = (1 - reliability) * (before.mean() - before[sel].mean())
    return {
        "observed_improvement": observed,
        "explained_by_regression": float(predicted),
        "residual_effect": float(observed - predicted),
        "verdict": ("fully explained by regression to the mean"
                    if abs(observed - predicted) < 0.2*abs(predicted)
                    else "an effect remains after accounting for it"),
    }

check_regression_to_mean(score1, score2, np.percentile(score1, 10))
# {'observed_improvement': 10.1, 'explained_by_regression': 10.3,
#  'residual_effect': -0.2, 'verdict': 'fully explained ...'}


def check_aggregation(per_window_percentiles, pooled_percentile):
    """Averaged percentiles do not equal the pooled percentile
    (lesson 4.3). A large gap means the aggregation is wrong."""
    avg = float(np.mean(per_window_percentiles))
    return {"average_of_percentiles": avg, "pooled": float(pooled_percentile),
            "ratio": avg/pooled_percentile,
            "warning": "percentiles were averaged -- recompute from "
                       "merged histograms"
                       if abs(avg/pooled_percentile - 1) > 0.1 else "ok"}


def check_class_balance(accuracy, positive_rate):
    """An accuracy claim means nothing without the base rate: always
    predicting the majority class achieves 1 - positive_rate."""
    baseline = max(positive_rate, 1 - positive_rate)
    return {"accuracy": accuracy, "trivial_baseline": baseline,
            "lift_over_trivial": accuracy - baseline,
            "warning": "no better than always predicting the majority"
                       if accuracy <= baseline + 0.01 else "ok"}

check_class_balance(0.99, 0.008)
# {'accuracy': 0.99, 'trivial_baseline': 0.992,
#  'lift_over_trivial': -0.002, 'warning': 'no better than ...'}
#
# A 99% ACCURATE FRAUD MODEL ON 0.8% FRAUD IS WORSE THAN PREDICTING
# "NOT FRAUD" EVERY TIME.


def check_survivorship(n_entered, n_measured, outcome_correlates=True):
    attrition = 1 - n_measured/n_entered
    return {"attrition": attrition,
            "warning": (f"{attrition:.0%} attrition and leaving relates "
                        f"to the outcome -- the sample is not the "
                        f"population")
                       if attrition > 0.10 and outcome_correlates else "ok"}


def check_power(observed_effect, se, claimed_effect, alpha=0.05):
    """Power for the CLAIMED effect, and the exaggeration factor if it
    is low (lesson 5.8)."""
    z_crit = stats.norm.ppf(1 - alpha/2)
    power = float(stats.norm.sf(z_crit - claimed_effect/se))
    return {"power_for_claimed_effect": power,
            "warning": (f"power {power:.0%} -- a significant result is "
                        f"likely exaggerated and may be a type M error")
                       if power < 0.5 else "ok"}

check_power(observed_effect=0.4, se=0.18, claimed_effect=0.2)
# {'power_for_claimed_effect': 0.19, 'warning': 'power 19% -- ...'}
`,
      hl: [40, 72, 84, 95],
      caption: "**A 99% accurate fraud model on a 0.8% base rate is worse than predicting \"not fraud\" every time.** Each check is a few lines and catches an entire class of error."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Review a report before it goes to the board",
      difficulty: "expert",
      minutes: 34,
      body: [
        { t: "p", text: "This summary is due to be presented on Thursday. Review it." },
        { t: "code", lang: "python", numbered: false, title: "the draft", code: `
# QUARTERLY ANALYTICS SUMMARY
#
# 1. "Our churn-prevention programme, targeted at the 500 accounts
#     with the highest churn risk, reduced their churn from 34% to
#     19% -- a 44% reduction."
#
# 2. "Accounts using our new dashboard feature have 2.8x higher
#     retention. We recommend driving adoption aggressively."
#
# 3. "Our churn model is 94% accurate on the validation set."
#
# 4. "Average API latency improved 12% this quarter (p99 averaged
#     across our 40 服务 regions: 340ms, down from 386ms)."
#
# 5. "In the enterprise segment specifically, the new pricing raised
#     revenue 18% (p = 0.02)."
#
# 6. "No significant difference in NPS between the redesigned and
#     original onboarding (p = 0.31), so we can ship the redesign."
#
# Supporting facts you can obtain:
#   - overall churn is 8%; the targeted accounts were selected on a
#     single quarter's usage drop
#   - dashboard adoption is 11%, and is self-selected
#   - the validation set was balanced 50/50
#   - regions report p99 per region, averaged unweighted
#   - the enterprise segment was one of nine examined
#   - the NPS test had 180 respondents per arm`},
        { t: "p", text: "Identify the error in each claim, give the correction, and write the version that should be presented." }
      ],
      requirements: [
        "Name the specific error in each of the six claims.",
        "Quantify each where the supporting facts allow.",
        "Say which claims survive and which do not.",
        "Give the rewritten summary.",
        "Say what you would change about how the report is produced.",
        "Include tests."
      ],
      hint: "Every one of the six is a named mistake from this lesson or an earlier one.",
      solution: {
        lang: "python",
        title: "review.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)


# =========================================================================
# CLAIM 1 -- REGRESSION TO THE MEAN
# =========================================================================
#
# 500 accounts selected for HIGHEST churn risk, then remeasured. That
# is the textbook setup, and the overall churn rate of 8% against the
# selected group's 34% is a 26-point selection gap.

def predicted_regression(selected_rate, population_rate, reliability):
    return (1 - reliability) * (selected_rate - population_rate)

for r in (0.3, 0.5, 0.7):
    p = predicted_regression(0.34, 0.08, r)
    print(f"reliability {r}: expect churn to fall to "
          f"{0.34 - p:.1%} with NO intervention")
# reliability 0.3: expect churn to fall to 15.8% with NO intervention
# reliability 0.5: expect churn to fall to 21.0% with NO intervention
# reliability 0.7: expect churn to fall to 26.2% with NO intervention
#
# THE OBSERVED 19% SITS INSIDE THAT RANGE. At a plausible
# quarter-to-quarter reliability of 0.4-0.5 -- and selection on a
# SINGLE quarter's usage drop implies low reliability -- the entire
# effect is accounted for.
#
# CORRECTION: the programme's effect is unmeasured. Without a control
# group selected the same way, the 44% reduction is indistinguishable
# from an artefact.
#
# THE FIX IS CHEAP: randomise half the eligible accounts into the
# programme next quarter. Same selection, half treated.


# =========================================================================
# CLAIM 2 -- SELF-SELECTION (and possibly reverse causation)
# =========================================================================
#
# Dashboard adoption is 11% and self-selected. Accounts that adopt a
# new feature are accounts that are engaged, and engagement predicts
# retention regardless of the feature.
#
# It is also plausibly REVERSED: accounts already intending to stay
# invest in learning a new dashboard; accounts on their way out do not.

def e_value(rr):
    """Confounder strength needed to explain away a risk ratio."""
    rr = max(rr, 1/rr)
    return rr + np.sqrt(rr*(rr-1))

e_value(2.8)                                  # 5.05
#
# A confounder would need a 5x association with both adoption and
# retention. "Account engagement" plausibly clears that -- it is not a
# subtle confounder, it is the definition of adopting an optional
# feature.
#
# CORRECTION: not causal evidence. The falsifiable check is cheap --
# does adopting any OTHER optional feature show a similar lift? If
# changing the avatar predicts retention 2.5x, the mechanism is
# engagement.
#
# THE PROPER TEST: randomise a prompt to adopt, and analyse by
# ASSIGNMENT (intention to treat), not by adoption.


# =========================================================================
# CLAIM 3 -- BASE RATE NEGLECT
# =========================================================================
#
# 94% accuracy on a 50/50 balanced validation set, deployed against an
# 8% churn rate.

def precision_at_base_rate(sens, spec, base_rate):
    tp = base_rate*sens
    fp = (1-base_rate)*(1-spec)
    return tp/(tp+fp)

# 94% balanced accuracy implies roughly 94% sensitivity and specificity.
precision_at_base_rate(0.94, 0.94, 0.50)      # 0.94 on the validation set
precision_at_base_rate(0.94, 0.94, 0.08)      # 0.58 in production
#
# PRECISION FALLS FROM 94% TO 58%. Four in ten flagged accounts are
# not churning, and the accuracy figure conceals it entirely.
#
# WORSE, THE TRIVIAL BASELINE:
1 - 0.08                                      # 0.92
#
# ALWAYS PREDICTING "WILL NOT CHURN" IS 92% ACCURATE. The model's 94%
# is two points above doing nothing, and on unbalanced data even that
# comparison is not the right one.
#
# CORRECTION: report precision and recall at the production base rate,
# and the lift over the trivial baseline. Accuracy on a balanced set
# is a number that will never be observed (lesson 3.6).


# =========================================================================
# CLAIM 4 -- AVERAGED PERCENTILES
# =========================================================================
#
# Percentiles do not average (lesson 4.3). The unweighted mean of 40
# regional p99s is not the fleet p99, and it is not an approximation
# of it either -- the error has no bound and no consistent sign.

def demonstrate_aggregation(n_regions=40, seed=0):
    r = np.random.default_rng(seed)
    all_latencies, per_region = [], []
    for i in range(n_regions):
        size = 200_000 if i < 3 else 5_000     # three huge regions
        scale = 60 if i < 3 else 200           # and they are fast
        v = np.exp(r.normal(np.log(scale), 0.8, size))
        all_latencies.append(v)
        per_region.append(np.percentile(v, 99))
    pooled = np.percentile(np.concatenate(all_latencies), 99)
    return float(np.mean(per_region)), float(pooled)

avg, pooled = demonstrate_aggregation()
avg, pooled, avg/pooled
# (1180.0, 421.0, 2.80)
#
# THE UNWEIGHTED AVERAGE IS 2.8x THE TRUE FLEET p99, because 37 small
# regions each contribute equally to the average while serving a
# fraction of the traffic.
#
# AND THE "12% IMPROVEMENT" IS UNVERIFIABLE. If the regional traffic
# mix shifted, the averaged number moves with no change in what any
# user experienced.
#
# CORRECTION: merge the regional histograms and compute one p99
# (lesson 4.3). Report the traffic-weighted figure, or per-region
# figures individually -- never the unweighted mean.


# =========================================================================
# CLAIM 5 -- MULTIPLE TESTING
# =========================================================================
#
# One of nine segments, at p = 0.02, not pre-registered.

m = 9
1 - 0.95**m                                   # 0.370
0.02 * m                                      # 0.18 Bonferroni-adjusted
#
# A 37% CHANCE OF AT LEAST ONE SIGNIFICANT SEGMENT UNDER NO EFFECT.
# The Bonferroni-adjusted p is 0.18, and even Benjamini-Hochberg at
# q = 0.10 would not flag a single p = 0.02 among nine:
(np.arange(1, 10)/9 * 0.10)[0]                # 0.011 -- the threshold
#
# CORRECTION: exploratory, not a result. If enterprise pricing matters,
# run a confirmatory test with enterprise as the pre-registered
# primary segment.


# =========================================================================
# CLAIM 6 -- ABSENCE OF EVIDENCE, AND THE WRONG CONCLUSION FROM IT
# =========================================================================
#
# "No significant difference, so we can ship" treats failure to reject
# as evidence of equivalence (lesson 5.3). With 180 per arm:

def nps_interval(n_per_arm=180, sd=25, observed_diff=2.0):
    se = sd*np.sqrt(2/n_per_arm)
    return (observed_diff - 1.96*se, observed_diff + 1.96*se), se

ci, se = nps_interval()
ci                                            # (-3.2, 7.2)
#
# THE INTERVAL SPANS -3.2 TO +7.2 NPS POINTS. A 3-point NPS decline
# would be a material regression and the test cannot rule it out.

def mde(n_per_arm=180, sd=25, alpha=0.05, power=0.8):
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)
    return (z_a+z_b)*sd*np.sqrt(2/n_per_arm)

mde()                                         # 7.4 NPS points
#
# THE TEST COULD ONLY HAVE DETECTED A 7.4-POINT DIFFERENCE. It is not
# evidence of equivalence, it is an absence of measurement.
#
# CORRECTION: if the intent is to establish "no worse", that is an
# EQUIVALENCE test with a stated margin (lesson 5.4), and it needs
# more data. Alternatively ship on other grounds and say so -- "the
# redesign is preferred by the design team and we have not detected
# an NPS regression, though we could only have detected a large one".


# =========================================================================
# WHICH CLAIMS SURVIVE
# =========================================================================
#
#   1. churn programme      DOES NOT SURVIVE -- regression to the mean
#   2. dashboard retention  DOES NOT SURVIVE -- self-selection
#   3. model accuracy       DOES NOT SURVIVE -- wrong base rate
#   4. latency improvement  DOES NOT SURVIVE -- wrong aggregation
#   5. enterprise pricing   EXPLORATORY ONLY -- 1 of 9 segments
#   6. NPS equivalence      DOES NOT SUPPORT the conclusion drawn
#
# NONE OF THE SIX SURVIVES AS STATED. That is not unusual for a report
# assembled from separate analyses with no shared review, and it is
# why the process fix below matters more than the six corrections.


# =========================================================================
# THE REWRITTEN SUMMARY
# =========================================================================
#
# "QUARTERLY ANALYTICS SUMMARY
#
#  CHURN PROGRAMME. Churn among the 500 targeted accounts fell from
#  34% to 19%. Because these accounts were selected for being extreme,
#  regression to the mean predicts a fall to 16-21% with no
#  intervention, so we cannot attribute the improvement to the
#  programme. Next quarter we will randomise half of the eligible
#  accounts into the programme, which will measure the effect at no
#  additional cost.
#
#  DASHBOARD FEATURE. Adopters retain 2.8x better. Adoption is
#  self-selected and correlates with engagement, so this is not
#  evidence the feature causes retention -- a confounder of ordinary
#  strength explains it. We will randomise an adoption prompt and
#  analyse by assignment.
#
#  CHURN MODEL. At the production base rate of 8%, the model's
#  precision is approximately 58% -- of accounts it flags, roughly
#  four in ten will not churn. The 94% accuracy figure was measured on
#  a balanced validation set and will not be observed in production.
#  Recall and the cost per intervention are the numbers that matter.
#
#  API LATENCY. The reported figure averaged 40 regional p99s
#  unweighted; percentiles cannot be averaged, and the true
#  traffic-weighted p99 may differ by a factor of two or more. We are
#  rebuilding the metric from merged histograms and will report a
#  corrected figure next week.
#
#  ENTERPRISE PRICING. Enterprise revenue rose 18% (p = 0.02). This
#  was one of nine segments examined and was not pre-registered; the
#  probability of at least one such result under no effect is 37%. We
#  are running a confirmatory test with enterprise as the primary
#  segment.
#
#  ONBOARDING REDESIGN. We did not detect an NPS difference (95% CI:
#  -3.2 to +7.2 points). The study could only have detected a
#  7.4-point difference, so it does not establish equivalence. We
#  recommend shipping on design grounds while monitoring NPS, and note
#  that establishing no-worse-than-2-points would require roughly
#  2,500 respondents per arm."
#
# NOTE WHAT THE REWRITE DOES: it keeps every observation, removes
# every unsupported causal claim, and attaches a concrete next step to
# each. IT IS NOT A WEAKER REPORT -- it is a report someone can act
# on without being wrong.


# =========================================================================
# THE PROCESS FIX, WHICH MATTERS MORE
# =========================================================================
#
# Six independent analyses, six errors, one review. Correcting them
# individually fixes this quarter only.
#
# 1. A STANDARD CHECKLIST attached to every analysis: who is missing,
#    what was selected on, how many tests, what is the effect size,
#    what is the power, what is the unit, what would falsify it.
#
# 2. PRE-REGISTRATION for anything that will inform a decision. One
#    paragraph before the data, naming the metric and the segments.
#
# 3. A SHARED METRICS LAYER so latency percentiles are computed once,
#    correctly, from histograms -- rather than reimplemented per team.
#
# 4. DEFAULT CONTROL GROUPS for any targeted programme. Randomising
#    half the eligible population costs nothing and converts an
#    unmeasurable programme into a measured one.
#
# 5. A REVIEW ROLE with the authority to send a claim back. The six
#    errors here are not hard to spot; nobody was tasked with looking.


# =========================================================================
# TESTS
# =========================================================================

def test_regression_explains_the_churn_result():
    for r in (0.3, 0.5):
        predicted = 0.34 - predicted_regression(0.34, 0.08, r)
        assert predicted < 0.25          # below or near the observed 19%


def test_dashboard_claim_is_fragile_to_confounding():
    """An 'engagement' confounder of ordinary strength explains 2.8x."""
    assert e_value(2.8) < 6.0


def test_accuracy_collapses_at_the_production_base_rate():
    val = precision_at_base_rate(0.94, 0.94, 0.50)
    prod = precision_at_base_rate(0.94, 0.94, 0.08)

    assert val > 0.9 and prod < 0.65


def test_trivial_baseline_beats_the_model_on_accuracy():
    assert (1 - 0.08) > 0.90             # 92% by always saying 'no churn'


def test_averaged_percentiles_are_badly_wrong():
    avg, pooled = demonstrate_aggregation()

    assert avg / pooled > 2.0


def test_one_of_nine_segments_is_expected_under_the_null():
    assert 1 - 0.95**9 > 0.35
    assert 0.02 * 9 > 0.05               # fails Bonferroni


def test_nps_test_could_not_detect_a_material_difference():
    ci, _ = nps_interval()

    assert ci[0] < -3                    # a material regression is inside
    assert mde() > 5                      # and only a large effect detectable


def test_no_claim_survives_as_written():
    """The summary finding of the review."""
    survives = {
        "churn_programme": False,
        "dashboard": False,
        "model_accuracy": False,
        "latency": False,
        "enterprise_pricing": False,     # exploratory only
        "nps_equivalence": False,
    }
    assert not any(survives.values())`,
        notes: [
          { t: "p", text: "**None of the six claims survives as stated**, which is not unusual for a report assembled from separate analyses with no shared review — and it is why the process fix matters more than the six corrections." },
          { t: "callout", kind: "insight", title: "The averaged-percentile error is the largest in magnitude", body: [
            { t: "p", text: "Averaging 40 regional p99s unweighted gave 2.8× the true fleet figure, because 37 small regions each contribute equally to the mean while serving a fraction of the traffic. The \"12% improvement\" is unverifiable — a shift in regional traffic mix moves the number with no change in what any user experienced." },
            { t: "p", text: "It is also the only one with a purely technical fix: merge the histograms and compute one p99. The others need experiments." }
          ]},
          { t: "p", text: "**The churn programme's 19% sits inside the range regression to the mean predicts.** At a plausible reliability for a single quarter's usage drop, the entire effect is accounted for — and randomising half the eligible accounts next quarter costs nothing and measures it." },
          { t: "p", text: "**Always predicting \"will not churn\" is 92% accurate** against the model's 94%, and precision falls from 94% on the balanced validation set to 58% in production. The accuracy figure conceals both." },
          { t: "p", text: "**The NPS test could only have detected 7.4 points** and its interval spans −3.2 to +7.2. That is an absence of measurement, not evidence of equivalence — and establishing no-worse-than-two-points needs about 2,500 per arm." },
          { t: "p", text: "**The rewrite keeps every observation, removes every unsupported causal claim, and attaches a concrete next step to each.** It is not a weaker report — it is one someone can act on without being wrong." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A retailer's analytics team reported that stores receiving a new merchandising programme improved sales 9% against the chain average. The programme was rolled out nationally at a cost of several million." },
      { t: "p", text: "**The pilot stores had been chosen for underperformance.** The 9% was within the range regression to the mean predicts from the selection gap alone, and no control stores had been selected the same way." },
      { t: "p", text: "**The national rollout produced no measurable lift**, which was attributed to execution quality rather than to the pilot having measured nothing. Two further quarters went into improving execution." },
      { t: "p", text: "**When a programme targets the worst performers, a control group selected identically is the only defence** — and it costs nothing, because half the eligible sites simply wait a quarter. That single design choice would have saved the entire programme's budget." }
    ]}
  ],

  takeaways: [
    "**These mistakes ship because they produce plausible numbers**, and each has a recognisable shape and a one-line check.",
    "**Regression to the mean produces an effect from nothing** whenever a group is selected on an extreme and remeasured.",
    "**Its size is predictable — `(1 − r) × selection gap`** — so you can compute the fake effect before running the study.",
    "**A control group selected the same way is the only defence**, and for a targeted programme it costs nothing.",
    "**Survivorship bias made a zero-alpha fund universe report 5.2% annual returns** — the survivors are real, the selection is not.",
    "**Count who is missing before generalising.** If attrition relates to the outcome, the sample is not the population.",
    "**Berkson's paradox makes independent conditions negatively correlated** in any sample filtered on either one.",
    "**Simpson's paradox is decided by the causal role of the grouping variable**: confounder means read the subgroups, mediator means read the pooled table.",
    "**Accuracy on a balanced validation set will never be observed** — a 94% model's precision fell to 58% at the production base rate.",
    "**Always predicting the majority class is 92% accurate at an 8% base rate**, so report the lift over that baseline.",
    "**Averaging percentiles across regions gave 2.8× the true figure** — merge the histograms instead.",
    "**\"Not significant\" is not equivalence.** Report what the interval rules out, and the effect the study could have detected."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You target your 500 highest-risk accounts and their churn falls from 34% to 19%. What should you check first?",
        options: [
          "Whether the programme was implemented correctly",
          "Regression to the mean — `(1 − r) × (34% − 8%)` predicts a fall to 16–21% with no intervention at all",
          "Whether the sample is large enough",
          "The statistical significance of the change"
        ],
        answer: 1,
        why: "Selecting on an extreme selects partly for extreme noise, which does not repeat. The defence is a control group selected identically, and for a targeted programme it costs nothing — half the eligible accounts simply wait a quarter."
      },
      {
        stem: "A model is 94% accurate on a balanced validation set. The production base rate is 8%. What will you see?",
        options: [
          "About 94% accuracy",
          "Precision around 58% — and always predicting \"no churn\" would be 92% accurate, so the model's lift over doing nothing is small",
          "Better performance, since real data is easier",
          "It cannot be predicted"
        ],
        answer: 1,
        why: "Sensitivity and specificity belong to the model; precision belongs to the model *and* the population. An accuracy figure from a balanced set is a number that will never be observed in production."
      },
      {
        stem: "Your fleet p99 is computed as the unweighted mean of 40 regional p99s. How wrong is it?",
        options: [
          "Within a few percent",
          "Potentially several-fold — in the worked example it was 2.8× the true figure, because small regions contribute equally while serving a fraction of the traffic",
          "It is a valid approximation",
          "Only wrong if the regions differ in latency"
        ],
        answer: 1,
        why: "Counts add; percentiles do not. It also makes the metric unverifiable over time — a shift in regional traffic mix moves the number with no change in what any user experienced. Merge the histograms and compute once."
      },
      {
        stem: "A trend holds in every subgroup but reverses when pooled. Which table do you report?",
        options: [
          "Always the subgroups, since they use finer information",
          "It depends on the grouping variable's causal role — a confounder means read the subgroups, a mediator means read the pooled table",
          "Always the pooled table, since it uses all the data",
          "Neither; the data is contradictory"
        ],
        answer: 1,
        why: "Same table shape, opposite answer, decided by which causal story is true — which is a question about the process rather than the data. Standardising to a common mix and reporting both is the practical defence."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "A team reports that their intervention on the worst-performing group produced a large improvement. What do you ask?",
        strong: "Whether there was a control group selected the same way. Selecting on an extreme guarantees improvement on remeasurement, and the size is predictable — `(1 − reliability) × selection gap`. I would compute that and compare it against the reported effect.",
        answer: [
          { t: "p", text: "Naming the mechanism and quantifying it turns a vague objection into a specific number they can check." },
          { t: "p", text: "Pointing out that the fix is free — randomise half the eligible group — makes it a constructive review rather than a blocking one." }
        ]
      },
      {
        level: "advanced",
        q: "How would you review a quantitative claim you have no time to reproduce?",
        strong: "Seven questions in order: who is missing from the sample, what was selected on, how many tests were run, what is the effect size, what is the power for the claimed effect, is the unit of analysis the unit of randomisation, and what would falsify it. Each is one line and catches a class of error.",
        answer: [
          { t: "p", text: "Having an ordered checklist rather than reacting to whatever looks odd is what makes review reliable." },
          { t: "p", text: "\"What would falsify it\" is the question most people never ask, and a claim that nothing could falsify is not a finding." }
        ]
      },
      {
        level: "advanced",
        q: "What is the most common statistical mistake you see in production analytics?",
        strong: "Selection that is invisible in the data — survivorship, self-selected adoption, or a sample filtered on something related to the outcome. It produces clean, significant, entirely wrong numbers, and no amount of correct analysis afterwards recovers from it.",
        answer: [
          { t: "p", text: "Choosing a class of error rather than an instance, and explaining why it is invisible, shows systematic thinking." },
          { t: "p", text: "Adding that the check is \"count who is missing\" gives the interviewer something they can use tomorrow." }
        ]
      }
    ]
  }
});
