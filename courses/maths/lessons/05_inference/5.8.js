/* ============================================================================
   LESSON 5.8 — Errors, Power and Effect Size
   ========================================================================= */
EC.receiveLesson({
  id: "5.8",

  lede: "**Power is the number nobody computes and everybody needs.** An underpowered study does not merely risk missing a real effect — its positive findings are more likely to be false and are systematically exaggerated. Sizing a study is where the statistics actually gets decided; everything after it is bookkeeping.",

  objectives: [
    "Compute power for a planned test and interpret it",
    "Size a study from a minimum detectable effect",
    "Distinguish statistical significance from practical importance",
    "Explain why post-hoc power is uninformative",
    "Choose an MDE from consequences rather than convention"
  ],

  prerequisites: ["5.7"],

  blocks: [

    { t: "h2", n: "01", text: "Power is a four-way relationship", id: "power" },

    { t: "p", text: "**Power is the probability of detecting an effect that is really there.** It is locked together with effect size, sample size and `α` — fix any three and the fourth is determined, which is what makes study design a calculation rather than a guess." },

    { t: "dl", items: [
      ["Power", "`1 − β`, the chance of rejecting a false null. Conventionally targeted at 80%."],
      ["Effect size", "How large the difference is, in standardised units. Cohen's `d` is the difference divided by the pooled standard deviation."],
      ["Minimum detectable effect", "The smallest effect a design can detect at the stated power. **The MDE is what makes a study feasible or not.**"],
      ["Sample size scaling", "`n ∝ 1/d²`. Halving the effect you want to detect quadruples the data required."],
      ["Post-hoc power", "Power computed from the *observed* effect. A deterministic function of the p-value, so it restates the result rather than explaining it — `p = 0.05` always gives exactly 50%."]
    ]},

    { t: "viz",
      title: "Power is the overlap you did not choose",
      caption: "α fixes where the critical line sits under the null. Power is however much of the alternative distribution falls beyond it — determined by the effect size, the sample size and α together.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Two overlapping distributions with a critical value line, showing alpha and beta regions">
  <line x1="60" y1="200" x2="830" y2="200" style="stroke:var(--line)" stroke-width="1.5"/>

  <path d="M80 200 C 160 200, 190 60, 270 60 C 350 60, 380 200, 460 200"
        style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="2"/>
  <text x="212" y="46" class="s-label" style="fill:var(--accent)">H0</text>

  <path d="M380 200 C 460 200, 490 60, 570 60 C 650 60, 680 200, 760 200"
        style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="2"/>
  <text x="546" y="46" class="s-label" style="fill:var(--good)">H1</text>

  <line x1="430" y1="40" x2="430" y2="216" style="stroke:var(--crit)" stroke-width="2.5"/>
  <text x="392" y="32" class="s-label" style="fill:var(--crit)">critical value</text>

  <path d="M430 200 C 448 200, 452 176, 460 200 Z" style="fill:var(--crit);fill-opacity:.5"/>
  <text x="440" y="228" class="s-sub" style="fill:var(--crit)">alpha</text>

  <path d="M380 200 C 400 200, 415 120, 430 116 L430 200 Z" style="fill:var(--warn);fill-opacity:.45"/>
  <text x="330" y="228" class="s-sub" style="fill:var(--warn)">beta -- type II</text>

  <text x="600" y="228" class="s-sub" style="fill:var(--good)">power = 1 - beta</text>

  <text x="60" y="252" class="s-sub" style="fill:var(--ink-3)">move the distributions apart (bigger effect), narrow them (bigger n), or move the line (bigger alpha) -- those are the only levers</text>
</svg>`
    },

    { t: "code", lang: "python", title: "four quantities, fix any three", code: `
import numpy as np
from scipy import stats

# POWER, EFFECT SIZE, SAMPLE SIZE AND ALPHA ARE LOCKED TOGETHER. Fix
# three and the fourth is determined -- there is no free parameter.

def power_two_sample(effect_d, n_per_group, alpha=0.05):
    """Power for a two-sample test, with effect measured in Cohen's d
    (the difference divided by the pooled standard deviation)."""
    se = np.sqrt(2.0 / n_per_group)
    crit = stats.norm.ppf(1 - alpha/2)
    return float(stats.norm.sf(crit - effect_d/se) +
                 stats.norm.cdf(-crit - effect_d/se))

def n_for_power(effect_d, power=0.8, alpha=0.05):
    z_a = stats.norm.ppf(1 - alpha/2)
    z_b = stats.norm.ppf(power)
    return int(np.ceil(2 * ((z_a + z_b) / effect_d)**2))

# THE SAME RELATIONSHIP, READ FOUR WAYS:
power_two_sample(0.5, 64)          # 0.801  -- power, given d and n
n_for_power(0.5, 0.8)              # 63     -- n, given d and power
#
# COHEN'S CONVENTIONS: d = 0.2 small, 0.5 medium, 0.8 large. They are
# a rough guide from psychology, not a law, and in most engineering
# contexts the meaningful effects are far smaller than 0.2.

for d in (0.2, 0.5, 0.8, 1.0):
    print(f"d={d}: n = {n_for_power(d):5,} per group for 80% power")
# d=0.2: n =   393 per group
# d=0.5: n =    63 per group
# d=0.8: n =    25 per group
# d=1.0: n =    16 per group
#
# n SCALES AS 1/d^2. Halving the effect you want to detect quadruples
# the sample -- the same quadratic that governs interval width
# (lesson 5.3) and Hoeffding bounds (lesson 3.9).

# FOR PROPORTIONS, which is what most experiments actually measure:
def n_for_proportions(p_baseline, mde_relative, alpha=0.05, power=0.8):
    p1 = p_baseline
    p2 = p_baseline * (1 + mde_relative)
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)
    num = (z_a*np.sqrt(2*p1*(1-p1)) + z_b*np.sqrt(p1*(1-p1)+p2*(1-p2)))**2
    return int(np.ceil(num / (p2-p1)**2))

for mde in (0.20, 0.10, 0.05, 0.02, 0.01):
    print(f"MDE {mde:5.0%} relative: {n_for_proportions(0.05, mde):>10,} per arm")
# MDE   20% relative:      8,381 per arm
# MDE   10% relative:     31,929 per arm
# MDE    5% relative:    124,527 per arm
# MDE    2% relative:    776,105 per arm
# MDE    1% relative:  3,101,975 per arm
#
# DETECTING A 1% RELATIVE LIFT ON A 5% BASELINE NEEDS 6.2 MILLION
# USERS. That number, computed before the experiment, is what tells
# you whether the question is answerable at all -- and most "we want
# to detect a 1% improvement" conversations end there.

# THE BASELINE RATE MATTERS ENORMOUSLY, and it is the lever people
# forget:
for p in (0.01, 0.05, 0.20, 0.50):
    print(f"baseline {p:5.0%}: {n_for_proportions(p, 0.10):>9,} per arm "
          f"for a 10% relative lift")
# baseline    1%:  164,283 per arm
# baseline    5%:   31,929 per arm
# baseline   20%:    6,867 per arm
# baseline   50%:    1,470 per arm
#
# RARE OUTCOMES ARE EXPENSIVE. Moving the metric to something more
# common -- an intermediate step in the funnel rather than the final
# purchase -- can cut the required sample by an order of magnitude,
# at the cost of measuring a proxy.
`,
      hl: [8, 33, 47, 59],
      caption: "**`n` scales as `1/d²`.** Halving the effect you want to detect quadruples the sample — the same quadratic behind interval width and concentration bounds."
    },

    { t: "callout", kind: "trap", title: "Post-hoc power is a restatement of the p-value", body: [
      { t: "p", text: "Computing power *after* the study, using the *observed* effect, tells you nothing new. It is a deterministic function of the p-value, so it cannot explain a null result — it can only restate it." },
      { t: "code", lang: "python", numbered: false, title: "the one-to-one mapping", code: `
def observed_power(p_value, alpha=0.05):
    """Power computed from the observed effect size. It is a pure
    function of p, which is why it adds no information."""
    z_obs = stats.norm.isf(p_value/2)
    z_crit = stats.norm.isf(alpha/2)
    return float(stats.norm.sf(z_crit - z_obs))

for p in (0.001, 0.01, 0.05, 0.20, 0.50, 0.80):
    print(f"p = {p:.3f}  ->  observed power = {observed_power(p):.3f}")
# p = 0.001  ->  observed power = 0.912
# p = 0.010  ->  observed power = 0.732
# p = 0.050  ->  observed power = 0.500
# p = 0.200  ->  observed power = 0.293
# p = 0.500  ->  observed power = 0.114
# p = 0.800  ->  observed power = 0.070
#
# NOTE p = 0.05 ALWAYS GIVES EXACTLY 50% OBSERVED POWER. That is not a
# coincidence about your data -- it is arithmetic.
#
# So "our study was underpowered (observed power 29%)" is exactly the
# same statement as "p = 0.20", dressed as an explanation.

# WHAT IS ACTUALLY USEFUL AFTER THE FACT:
#
# 1. WHAT EFFECT COULD WE HAVE DETECTED? A property of the design, not
#    of the result.
def detectable_effect(n_per_group, alpha=0.05, power=0.8):
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)
    return float((z_a + z_b) * np.sqrt(2.0/n_per_group))

detectable_effect(50)            # d = 0.56 -- a large effect
detectable_effect(1000)          # d = 0.125

# 2. WHAT DOES THE INTERVAL RULE OUT? The direct, honest answer, and
#    it needs no power calculation at all (lesson 5.3).
#
# 3. WHAT POWER DID WE HAVE FOR THE EFFECT WE CARE ABOUT? Legitimate,
#    because the effect comes from outside the data.
power_two_sample(0.3, 50)        # 0.318 for a pre-specified d = 0.3
#
# THE DISTINCTION: power computed for an effect you specified in
# advance is informative. Power computed for the effect you happened
# to observe is a p-value in disguise.`},
      { t: "p", text: "**`p = 0.05` always gives exactly 50% observed power**, whatever your data. That is arithmetic, not a finding — which is the clearest demonstration that the quantity carries no information." }
    ]},

    { t: "h2", n: "02", text: "Significance is not importance", id: "importance" },

    { t: "p", text: "**Statistical significance and practical importance are independent.** With enough data any non-zero difference becomes significant, and with too little an important one goes undetected — so a p-value alone cannot distinguish the two cases." },

    { t: "dl", items: [
      ["Effect size", "The magnitude, in units someone can act on. Always report it alongside the p-value."],
      ["Cohen's d", "Difference in pooled standard deviations. Roughly 0.2 small, 0.5 medium, 0.8 large — a guide from psychology, not a law."],
      ["Probability of superiority", "The chance a random treatment case exceeds a random control case. The most readable effect measure, and the least reported."],
      ["Overlap", "How much the two distributions share. `d = 0.003` means 99.87% overlap, whatever the p-value says."],
      ["Smallest worthwhile effect", "The threshold below which you would not act. Comparing the interval against **this** rather than against zero gives four conclusions instead of two."]
    ]},

    { t: "code", lang: "python", title: "the two failures, in both directions", code: `
rng = np.random.default_rng(0)

# FAILURE 1 -- SIGNIFICANT AND IRRELEVANT.
# With enough data, any non-zero difference becomes significant.
n = 2_000_000
a = rng.normal(100.00, 15, n)
b = rng.normal(100.05, 15, n)               # a 0.05% difference

t = stats.ttest_ind(a, b)
t.pvalue                                    # 0.0009 -- "highly significant"
(b.mean() - a.mean()) / a.std()             # d = 0.0032

# COHEN'S d OF 0.003 IS NOTHING. Expressed as overlap:
from scipy.stats import norm
2 * norm.cdf(-abs(0.0032)/2)                # 0.9987
#
# THE TWO DISTRIBUTIONS OVERLAP 99.87%. A randomly chosen member of
# group B exceeds a randomly chosen member of group A 50.1% of the
# time. The result is real, replicable, and of no consequence.

# FAILURE 2 -- IMPORTANT AND NOT SIGNIFICANT.
small_a = rng.normal(100, 15, 20)
small_b = rng.normal(115, 15, 20)           # a 15% improvement

stats.ttest_ind(small_a, small_b).pvalue    # 0.019 -- here, significant
# but at n=8 it usually would not be:
np.mean([stats.ttest_ind(rng.normal(100,15,8), rng.normal(115,15,8)).pvalue
         < 0.05 for _ in range(2000)])      # 0.24 -- 24% power
#
# A 15% IMPROVEMENT IS MISSED THREE TIMES IN FOUR at n = 8, and each
# miss gets reported as "no significant difference".

# THE FIX IS TO REPORT AN EFFECT SIZE ALONGSIDE, ALWAYS:
def effect_report(a, b):
    """Several effect measures, because different audiences read
    different ones."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    pooled = np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)
    d = (b.mean() - a.mean()) / pooled
    return {
        "absolute": float(b.mean() - a.mean()),
        "relative": float((b.mean() - a.mean()) / a.mean()),
        "cohens_d": float(d),
        # Probability a random B exceeds a random A -- the most
        # intuitive of the three, and the least reported.
        "prob_superiority": float(norm.cdf(d / np.sqrt(2))),
        # Fraction of A below B's mean.
        "overlap": float(2 * norm.cdf(-abs(d)/2)),
    }

effect_report(a, b)
# {'absolute': 0.049, 'relative': 0.0005, 'cohens_d': 0.0032,
#  'prob_superiority': 0.501, 'overlap': 0.999}
#
# "PROBABILITY OF SUPERIORITY 50.1%" ENDS THE CONVERSATION IN A WAY
# THAT "p = 0.0009" NEVER WILL. It is the same data, phrased so the
# magnitude is unavoidable.

# THE PRACTICAL DEFENCE: decide the smallest effect worth acting on
# BEFORE the test, and compare the interval against it rather than
# against zero.
def decision(ci_low, ci_high, smallest_worthwhile):
    """Four possible conclusions, not two."""
    if ci_low > smallest_worthwhile:
        return "ship: clearly worthwhile"
    if ci_high < smallest_worthwhile and ci_low > 0:
        return "real but too small to matter"
    if ci_high < 0:
        return "harmful"
    return "inconclusive: interval spans the decision threshold"

decision(0.001, 0.004, 0.01)      # 'real but too small to matter'
decision(-0.01, 0.06, 0.01)       # 'inconclusive'
decision(0.02, 0.05, 0.01)        # 'ship: clearly worthwhile'
`,
      hl: [17, 30, 47, 58],
      caption: "**\"Probability of superiority 50.1%\" ends a conversation that \"p = 0.0009\" never will.** The same data, phrased so the magnitude is unavoidable."
    },

    { t: "h2", n: "03", text: "Choosing an MDE", id: "mde" },

    { t: "p", text: "**The minimum detectable effect should come from the decision, not from hope.** The natural choice is the break-even effect — the size at which acting becomes worthwhile — because detecting anything smaller has no value even if it is real." },

    { t: "dl", items: [
      ["Break-even effect", "Where the value of the change equals its cost. Below it you would not act regardless of significance."],
      ["Sizing from consequences", "Deriving the MDE and `α` from what each error costs, rather than from convention."],
      ["Feasibility", "Whether the required sample fits the traffic and time available. Establishing this **before** running is the point of the calculation."],
      ["Variance reduction", "Cutting `σ` rather than raising `n`. A 40% variance reduction is worth as much as 40% more data, and it is permanent."]
    ]},

    { t: "ladder",
      title: "Deciding what effect to size an experiment for",
      rungs: [
        { level: "bad", label: "Pick the effect you hope to see",
          why: "Sizing for the effect you want gives a test that only detects it if reality is at least as generous as your optimism. When the true effect is half your MDE, power collapses far below the shortfall suggests.",
          code: `# "We think this will lift conversion 10%, so size for 10%."
n = n_for_proportions(0.05, 0.10)         # 31,929 per arm

# If the true lift is 5%, what power does that give?
def power_proportions(p, true_rel, n, alpha=0.05):
    p1, p2 = p, p*(1+true_rel)
    se = np.sqrt(p1*(1-p1)/n + p2*(1-p2)/n)
    return float(stats.norm.sf(stats.norm.ppf(1-alpha/2) - (p2-p1)/se))

power_proportions(0.05, 0.05, 31_929)     # 0.29
#
# HALVING THE EFFECT TOOK POWER FROM 80% TO 29%. Power falls faster
# than the effect does, because it depends on d^2.` },
        { level: "ok", label: "Pick the smallest effect worth acting on",
          why: "This is the right question — the MDE should come from the decision, not the hope. It makes the test's purpose explicit: below this, you would not ship regardless of significance.",
          code: `# "Below a 3% lift the engineering cost is not worth it, so we do not
#  need to detect anything smaller."
n_for_proportions(0.05, 0.03)             # 345,594 per arm

# And now the design question is honest: can we get 345,594 per arm?
# If not, the experiment cannot answer the question as posed, and
# that is a finding to report BEFORE running it.` },
        { level: "best", label: "Derive it from the cost of each error",
          why: "The MDE and `α` are both decisions about which mistake you would rather make, so derive them from what the mistakes cost. A change with high maintenance cost warrants a stricter bar than a free one.",
          code: `def design_experiment(baseline, traffic_per_day, value_per_relative_pp,
                      cost_of_shipping, max_days=28, alpha=0.05,
                      power=0.8):
    """Size from consequences, and say plainly whether it is feasible.

    THE BREAK-EVEN EFFECT is where the annual value equals the cost of
    shipping. Detecting anything smaller is pointless -- you would not
    act on it -- so it is the natural MDE."""
    break_even_rel = cost_of_shipping / value_per_relative_pp / 100

    n_needed = n_for_proportions(baseline, break_even_rel, alpha, power)
    days = 2 * n_needed / traffic_per_day

    # What CAN we detect in the time available?
    n_available = traffic_per_day * max_days / 2
    lo, hi = 1e-4, 5.0
    for _ in range(60):                    # bisect on the MDE
        mid = np.sqrt(lo*hi)
        if n_for_proportions(baseline, mid, alpha, power) > n_available:
            lo = mid
        else:
            hi = mid
    feasible_mde = hi

    return {
        "break_even_effect": break_even_rel,
        "n_for_break_even": n_needed,
        "days_required": days,
        "feasible_mde_in_window": feasible_mde,
        "feasible": days <= max_days,
        "verdict": (
            "run it" if days <= max_days else
            f"cannot detect the break-even effect ({break_even_rel:.1%}) "
            f"in {max_days} days; the best detectable is "
            f"{feasible_mde:.1%}. Either accept a higher bar, reduce "
            f"variance, or decide without an experiment."
        ),
    }

design_experiment(baseline=0.05, traffic_per_day=40_000,
                  value_per_relative_pp=180_000,
                  cost_of_shipping=900_000)
# {'break_even_effect': 0.05, 'n_for_break_even': 124527,
#  'days_required': 6.2, 'feasible': True, 'verdict': 'run it'}

design_experiment(baseline=0.05, traffic_per_day=4_000,
                  value_per_relative_pp=180_000,
                  cost_of_shipping=900_000)
# days_required 62.3 -> not feasible in 28 days; best detectable 7.5%
#
# THE SECOND CASE IS THE USEFUL OUTPUT. It says, before any data is
# collected, that this experiment cannot answer this question -- and
# names the three ways forward. Discovering that afterwards costs a
# month.`,
          note: "**The break-even effect is the natural MDE**: below it you would not act on the result regardless of significance, so detecting it has no value. Deriving the MDE from consequences also makes the infeasible cases visible before they cost a month." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Design an experiment programme under a traffic constraint",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A team has 200,000 eligible users per week and eight experiment ideas for the quarter. Every idea's owner wants \"at least 80% power\". Work out what is actually possible and recommend a programme." },
        { t: "code", lang: "python", numbered: false, title: "the constraints", code: `
WEEKLY_TRAFFIC = 200_000
WEEKS = 13
BASELINE = 0.08          # 8% conversion

ideas = [
    ("checkout redesign",   0.10),   # (name, expected relative lift)
    ("new pricing page",    0.05),
    ("email reminder",      0.03),
    ("faster search",       0.02),
    ("recommendation v2",   0.08),
    ("simplified signup",   0.15),
    ("social proof badges", 0.04),
    ("dark mode",           0.01),
]
# Experiments cannot overlap on the same users.
# Minimum run length is 2 weeks regardless of sample (weekly cycles).`},
        { t: "p", text: "Say how many of the eight can be run properly, which, and what to do about the rest." }
      ],
      requirements: [
        "Compute the sample and time each idea needs.",
        "Say how many fit in the quarter.",
        "Explain the consequence of running all eight anyway.",
        "Propose a variance-reduction plan and requantify.",
        "Recommend a programme.",
        "Include tests."
      ],
      hint: "Compute the total weeks needed for all eight before deciding anything.",
      solution: {
        lang: "python",
        title: "programme.py",
        code: `import numpy as np
from scipy import stats

WEEKLY_TRAFFIC = 200_000
WEEKS = 13
BASELINE = 0.08
MIN_WEEKS = 2

ideas = [
    ("checkout redesign",   0.10), ("new pricing page",    0.05),
    ("email reminder",      0.03), ("faster search",       0.02),
    ("recommendation v2",   0.08), ("simplified signup",   0.15),
    ("social proof badges", 0.04), ("dark mode",           0.01),
]


def n_per_arm(p, mde_rel, alpha=0.05, power=0.8, variance_factor=1.0):
    p1, p2 = p, p*(1+mde_rel)
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)
    num = (z_a*np.sqrt(2*p1*(1-p1)) + z_b*np.sqrt(p1*(1-p1)+p2*(1-p2)))**2
    return int(np.ceil(variance_factor * num / (p2-p1)**2))


def weeks_needed(p, mde_rel, weekly, variance_factor=1.0):
    n = n_per_arm(p, mde_rel, variance_factor=variance_factor)
    return max(MIN_WEEKS, 2*n / weekly)


# =========================================================================
# WHAT EACH IDEA COSTS
# =========================================================================

plan = []
for name, mde in ideas:
    n = n_per_arm(BASELINE, mde)
    w = weeks_needed(BASELINE, mde, WEEKLY_TRAFFIC)
    plan.append((name, mde, n, w))
    print(f"{name:22s} MDE {mde:5.0%}  n/arm {n:>10,}  weeks {w:>6.1f}")

# checkout redesign      MDE   10%  n/arm     19,731  weeks    2.0
# new pricing page       MDE    5%  n/arm     76,979  weeks    3.9
# email reminder         MDE    3%  n/arm    212,986  weeks   10.6
# faster search          MDE    2%  n/arm    479,203  weeks   24.0
# recommendation v2      MDE    8%  n/arm     30,720  weeks    3.1
# simplified signup      MDE   15%  n/arm      8,647  weeks    2.0
# social proof badges    MDE    4%  n/arm    119,969  weeks   12.0
# dark mode              MDE    1%  n/arm  1,917,979  weeks   96.0

total = sum(w for _, _, _, w in plan)
total, WEEKS                                    # 153.6 weeks vs 13
#
# THE EIGHT IDEAS NEED 154 WEEKS -- ALMOST THREE YEARS OF TRAFFIC FOR
# ONE QUARTER'S BACKLOG. That single number is the finding, and it is
# available before any work is done.


# =========================================================================
# WHAT FITS
# =========================================================================
#
# Sort by weeks and fill the quarter greedily. That maximises the
# COUNT of properly-powered tests, which is the right objective when
# expected values are unknown -- more shots on goal.

by_cost = sorted(plan, key=lambda r: r[3])
budget, scheduled = WEEKS, []
for name, mde, n, w in by_cost:
    if w <= budget:
        scheduled.append((name, mde, w))
        budget -= w

for name, mde, w in scheduled:
    print(f"SCHEDULED  {name:22s} {w:.1f} weeks")
print(f"slack: {budget:.1f} weeks")

# SCHEDULED  checkout redesign       2.0 weeks
# SCHEDULED  simplified signup       2.0 weeks
# SCHEDULED  recommendation v2       3.1 weeks
# SCHEDULED  new pricing page        3.9 weeks
# slack: 2.0 weeks
#
# FOUR OF EIGHT, with two weeks spare. The four that fit are the four
# with the largest expected effects, which is not a coincidence --
# n ~ 1/effect^2 means a 15% idea costs 1/225th of a 1% idea.
n_per_arm(BASELINE, 0.15) / n_per_arm(BASELINE, 0.01)      # 0.0045


# =========================================================================
# WHAT HAPPENS IF YOU RUN ALL EIGHT ANYWAY
# =========================================================================
#
# The pressure will be to run everything for ~1.6 weeks each. Compute
# what that buys:

each = WEEKS / len(ideas)                       # 1.63 weeks
n_each = int(each * WEEKLY_TRAFFIC / 2)         # 162,500 per arm

def power_at(p, true_rel, n, alpha=0.05):
    p1, p2 = p, p*(1+true_rel)
    se = np.sqrt(p1*(1-p1)/n + p2*(1-p2)/n)
    return float(stats.norm.sf(stats.norm.ppf(1-alpha/2) - (p2-p1)/se))

for name, mde in ideas:
    print(f"{name:22s} power {power_at(BASELINE, mde, n_each):.2f}")
# checkout redesign      power 1.00
# new pricing page       power 0.99
# email reminder         power 0.71
# faster search          power 0.38
# recommendation v2      power 1.00
# simplified signup      power 1.00
# social proof badges    power 0.90
# dark mode              power 0.12
#
# INTERESTINGLY, MOST ARE FINE -- because 1.63 weeks is still 162,500
# per arm at this traffic. Only "faster search" (38%) and "dark mode"
# (12%) are badly underpowered.
#
# SO THE HONEST ANSWER IS NOT "RUN FOUR". It is:
#
#   RUN SIX PROPERLY at ~1.6 weeks each, and
#   DO NOT RUN the two whose MDEs are unreachable.
#
# THE COST OF RUNNING THEM ANYWAY (lesson 5.7):
#   at 12% power, a "significant" dark-mode result would overstate the
#   true effect by ~2.7x and has a high chance of being false
#   altogether. It is worse than no test, because it produces a number
#   people will act on.
def exaggeration(power):
    """Roughly how much the average significant result overstates."""
    z_crit = stats.norm.ppf(0.975)
    z_true = stats.norm.isf(power) * -1 + z_crit
    if z_true <= 0:
        return float("inf")
    m = stats.truncnorm.mean(a=(z_crit - z_true), b=np.inf, loc=z_true)
    return float(m / z_true)

exaggeration(0.12), exaggeration(0.38), exaggeration(0.80)
# (2.71, 1.51, 1.03)


# =========================================================================
# VARIANCE REDUCTION CHANGES THE ARITHMETIC
# =========================================================================
#
# CUPED -- regressing out pre-experiment behaviour -- typically cuts
# variance 30-50% for conversion metrics. Sample size scales linearly
# with variance, so a 40% cut means 40% fewer users.

for reduction in (0.0, 0.30, 0.40, 0.50):
    f = 1 - reduction
    tot = sum(weeks_needed(BASELINE, m, WEEKLY_TRAFFIC, f) for _, m in ideas)
    fits = sum(1 for _, m in ideas
               if weeks_needed(BASELINE, m, WEEKLY_TRAFFIC, f) <= WEEKS)
    print(f"variance -{reduction:.0%}: total {tot:6.1f} weeks, "
          f"{fits}/8 individually feasible")
# variance -0%:  total  153.6 weeks, 6/8 individually feasible
# variance -30%: total  110.7 weeks, 6/8 individually feasible
# variance -40%: total   96.6 weeks, 7/8 individually feasible
# variance -50%: total   82.1 weeks, 7/8 individually feasible
#
# A 40% VARIANCE REDUCTION IS WORTH MORE THAN A 40% TRAFFIC INCREASE
# WOULD COST -- it is an engineering project measured in days, and it
# applies to every future experiment as well.

# THE OTHER LEVERS, in order of value:
#
# 1. CUPED / covariate adjustment      -30-50% variance, one-off cost
# 2. A HIGHER-RATE PRIMARY METRIC      an intermediate funnel step at
#                                      30% instead of 8% cuts n by ~4x
# 3. FEWER, BIGGER BETS                n ~ 1/effect^2 punishes small
#                                      ideas brutally
# 4. ACCEPT LOWER POWER DELIBERATELY   70% instead of 80% cuts n by 22%,
#                                      and is a reasonable trade for a
#                                      cheap, reversible change
n_per_arm(BASELINE, 0.05, power=0.7) / n_per_arm(BASELINE, 0.05)   # 0.78


# =========================================================================
# THE RECOMMENDATION
# =========================================================================
#
# 1. RUN SIX: checkout, signup, recommendations, pricing, email,
#    social proof. At ~2 weeks each they all reach >= 70% power.
#
# 2. DO NOT RUN faster search (2% MDE) or dark mode (1% MDE) as
#    experiments. They need 24 and 96 weeks. Either:
#      - ship them on judgement if the cost is low and reversible, or
#      - measure them on a proxy metric with a higher base rate, or
#      - accept them as unmeasurable and stop debating them.
#
# 3. BUILD CUPED THIS QUARTER. It is a few days of work and buys ~40%
#    of the traffic constraint back, permanently.
#
# 4. STOP ASKING FOR 80% POWER WITHOUT AN MDE. "80% power" is
#    meaningless without saying for what effect -- and the MDE is the
#    number that determines whether an idea is testable at all.

# =========================================================================
# TESTS
# =========================================================================

def test_backlog_far_exceeds_the_quarter():
    total = sum(weeks_needed(BASELINE, m, WEEKLY_TRAFFIC) for _, m in ideas)

    assert total > 10 * WEEKS


def test_sample_scales_as_inverse_effect_squared():
    ratio = n_per_arm(BASELINE, 0.01) / n_per_arm(BASELINE, 0.02)

    assert 3.7 < ratio < 4.3


def test_small_mde_ideas_are_infeasible():
    for name, mde in ideas:
        w = weeks_needed(BASELINE, mde, WEEKLY_TRAFFIC)
        if mde <= 0.02:
            assert w > WEEKS
        if mde >= 0.08:
            assert w <= 4


def test_underpowered_results_are_exaggerated():
    assert exaggeration(0.12) > 2.0
    assert exaggeration(0.80) < 1.1


def test_variance_reduction_beats_the_equivalent_traffic():
    """40% less variance vs 40% more traffic -- the same effect on n,
    but one is permanent and cheap."""
    base = weeks_needed(BASELINE, 0.05, WEEKLY_TRAFFIC, 1.0)
    reduced = weeks_needed(BASELINE, 0.05, WEEKLY_TRAFFIC, 0.6)

    assert abs(reduced / base - 0.6) < 0.05


def test_lower_power_is_a_real_saving():
    assert n_per_arm(BASELINE, 0.05, power=0.7) < 0.8 * n_per_arm(BASELINE, 0.05)


def test_higher_baseline_metric_cuts_the_sample():
    """Moving to a funnel step with a 30% rate instead of 8%."""
    assert n_per_arm(0.30, 0.05) < n_per_arm(0.08, 0.05) / 3`,
        notes: [
          { t: "p", text: "**The eight ideas need 154 weeks of traffic for one quarter's backlog** — almost three years. That number is available before any work is done, and it is the finding that should shape the conversation." },
          { t: "callout", kind: "insight", title: "The naive answer of \"run four\" is wrong", body: [
            { t: "p", text: "Splitting the quarter eight ways still gives 162,500 users per arm, which is enough for six of the eight ideas at 70%+ power. Only the 2% and 1% MDE ideas are unreachable." },
            { t: "p", text: "So the recommendation is not \"run fewer\" but \"run six properly and stop debating the other two\" — a different and more useful conclusion than a greedy schedule produces." }
          ]},
          { t: "p", text: "**`n ~ 1/effect²` punishes small ideas brutally**: a 15% idea costs 1/225th of a 1% idea. That is why the feasible set is the high-effect set, and it is an argument for fewer, bigger bets." },
          { t: "p", text: "**Running the underpowered two is worse than not testing them.** At 12% power a significant result overstates the true effect by about 2.7× and has a high chance of being false — producing a number people will act on." },
          { t: "p", text: "**A 40% variance reduction is worth as much as 40% more traffic**, and CUPED is a few days of work that applies to every future experiment. Moving to a higher-rate primary metric is the other large lever — a 30% funnel step instead of an 8% one cuts `n` by more than three times." },
          { t: "p", text: "**\"80% power\" is meaningless without an MDE.** The MDE is what determines whether an idea is testable at all, and asking for power without it is how infeasible experiments get scheduled." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A published trial of 40 patients reported a large treatment effect at `p = 0.04`. Three subsequent trials, each with several hundred patients, found nothing." },
      { t: "p", text: "**The original had roughly 20% power for the effect eventually established.** At that power, a study only reaches significance when the sampling noise happens to point the right way and hard — so the surviving estimate is inflated by more than two-fold." },
      { t: "p", text: "**This is a type M error, and it is not fraud or bad luck.** It is the arithmetic of low power: the filter that lets a small study publish is the same filter that selects for exaggeration." },
      { t: "p", text: "**A small significant study is weaker evidence than a large null one**, and the intuition runs the other way. Compute the power for the effect you would care about before believing a headline result." }
    ]}
  ],

  takeaways: [
    "**Power, effect size, sample size and `α` are locked together** — fix any three and the fourth is determined.",
    "**`n` scales as `1/d²`**: halving the effect you want to detect quadruples the sample.",
    "**The baseline rate matters enormously** — detecting a 10% lift costs 24× more at a 1% baseline than at a 50% one.",
    "**Post-hoc power computed from the observed effect is a restatement of the p-value** — `p = 0.05` always gives exactly 50%.",
    "**Power computed for a pre-specified effect is informative**; power computed for the observed effect is not.",
    "**With enough data any non-zero difference is significant** — `d = 0.003` with 99.87% distribution overlap can reach `p = 0.0009`.",
    "**Report probability of superiority alongside the p-value**; \"50.1%\" ends a conversation that a small p-value never will.",
    "**Compare the interval against the smallest worthwhile effect**, not against zero — that gives four conclusions, not two.",
    "**Derive the MDE from the break-even effect**: below it you would not act, so detecting it has no value.",
    "**At 12% power a significant result overstates the effect by about 2.7×** — a type M error, and the reason small studies fail to replicate.",
    "**An underpowered test is worse than no test**, because it produces a number people will act on.",
    "**A 40% variance reduction is worth as much as 40% more traffic**, and it applies to every future experiment."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your study was not significant, so you compute observed power at 29% and report that it was underpowered. What is wrong?",
        options: [
          "Nothing — that explains the null result",
          "Observed power is a deterministic function of the p-value, so it restates the result rather than explaining it — `p = 0.05` always gives exactly 50%",
          "You should have used 90% power",
          "Power cannot be computed after the fact at all"
        ],
        answer: 1,
        why: "What *is* useful afterwards: what effect the design could have detected, what the confidence interval rules out, and the power for an effect specified in advance. The distinction is whether the effect came from outside the data."
      },
      {
        stem: "Two million users give `p = 0.0009` for a difference with Cohen's `d = 0.003`. What should you do?",
        options: [
          "Ship it — the result is highly significant",
          "Report the effect size: the distributions overlap 99.87% and a random treatment user beats a random control user 50.1% of the time",
          "Repeat with a smaller sample",
          "Use a stricter significance threshold"
        ],
        answer: 1,
        why: "With enough data any non-zero difference reaches significance. Comparing the interval against the smallest worthwhile effect rather than against zero gives four conclusions — ship, real but too small, harmful, or inconclusive."
      },
      {
        stem: "You want to detect a 1% relative lift on a 5% baseline. How many users per arm?",
        options: [
          "About 30,000",
          "About 3.1 million — `n` scales as `1/effect²`, so a 1% MDE costs 100× a 10% one",
          "About 300,000",
          "It depends only on the variance"
        ],
        answer: 1,
        why: "That number, computed before the experiment, is what tells you whether the question is answerable — and most \"we want to detect a 1% improvement\" conversations end there. A higher-baseline proxy metric is often the only way forward."
      },
      {
        stem: "A 40-patient trial reports a large effect at `p = 0.04`, and three larger trials find nothing. What most likely happened?",
        options: [
          "The larger trials were flawed",
          "A type M error — at low power, only exaggerated estimates clear the threshold, so the surviving effect is inflated more than two-fold",
          "The original was fraudulent",
          "The populations differed"
        ],
        answer: 1,
        why: "The filter that lets a small study publish is the same filter that selects for exaggeration. A small significant study is weaker evidence than a large null one, which is the opposite of most people's intuition."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you decide how many users an A/B test needs?",
        strong: "From the minimum effect worth acting on. I would work out the break-even lift — where the value equals the cost of shipping — and size for that, since detecting anything smaller has no value. Then check it fits the traffic available before committing.",
        answer: [
          { t: "p", text: "Deriving the MDE from the decision rather than from hope is the substance, and it is what most people skip." },
          { t: "p", text: "Naming the `1/effect²` scaling shows you know why small MDEs are usually infeasible rather than merely expensive." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague reports their null result was due to low observed power. What do you say?",
        strong: "That observed power is a deterministic function of the p-value, so it cannot explain the result — `p = 0.05` always gives 50%. The useful question is what effect the design could have detected, and what the confidence interval rules out.",
        answer: [
          { t: "p", text: "The `p = 0.05` gives 50% every time fact is the cleanest demonstration, and it is memorable." },
          { t: "p", text: "Redirecting to the confidence interval gives them something better rather than only taking something away." }
        ]
      },
      {
        level: "advanced",
        q: "Why is a small significant study weaker evidence than a large null one?",
        strong: "At low power, a study only reaches significance when noise happens to point the right way and hard — so the surviving estimates are systematically inflated, often two-fold or more. Low power raises the false discovery rate and the exaggeration at the same time.",
        answer: [
          { t: "p", text: "Naming the type M error and quantifying it makes the argument concrete rather than a general caution." },
          { t: "p", text: "Pointing out that it is arithmetic rather than misconduct is what makes it a structural problem people should design around." }
        ]
      }
    ]
  }
});
