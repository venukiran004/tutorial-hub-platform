/* ============================================================================
   LESSON 4.1 — Central Tendency, and When the Mean Lies
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "**Choosing the mean over the median is a decision, not a description.** For a skewed distribution they answer different questions, and reporting one without the other hides the shape that made them differ. Most misleading statistics are technically correct summaries of the wrong quantity.",

  objectives: [
    "Say what question each measure of central tendency answers",
    "Predict how mean and median respond to a skewed tail",
    "Quantify robustness with the breakdown point",
    "Choose the right average for rates, ratios and growth",
    "Recognise when no single number is honest"
  ],

  prerequisites: ["3.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three summaries, three questions", id: "three" },

    { t: "p", text: "**Mean, median and mode are not three attempts at the same number** — they answer three different questions, and for skewed data they give very different answers. Choosing between them is a decision about which question you meant to ask." },

    { t: "dl", items: [
      ["Mean", "`Σx/n` — the total shared equally. The right summary whenever the **total** is what matters, because `total = mean × count`."],
      ["Median", "The middle value once sorted. The right summary whenever a **typical case** matters, and unaffected by how extreme the extremes are."],
      ["Mode", "The most common value. The only one that works for categories, and the only one that can have several answers."],
      ["Mean/median ratio", "A free measure of skew. Around 1 means symmetric; above 1.2 means a tail is pulling the mean."],
      ["Geometric mean", "The `n`th root of the product. The correct average for **multiplicative** quantities such as growth rates."],
      ["Harmonic mean", "`n / Σ(1/xᵢ)`. The correct average for **rates over a fixed amount of work**, such as speeds over equal distances."],
      ["Skew", "Asymmetry in a distribution. Right-skewed data has a long upper tail and a mean above its median; left-skewed is the mirror image."]
    ]},

    { t: "code", lang: "python", title: "they are not competing estimates of the same thing", code: `
import numpy as np
from scipy import stats

# Salaries at a small company, in thousands.
pay = np.array([32, 35, 38, 38, 41, 44, 47, 52, 58, 71, 340])

pay.mean()                    # 72.4
np.median(pay)                # 44.0
stats.mode(pay).mode          # 38

# THREE DIFFERENT NUMBERS, AND EACH IS CORRECT -- because each answers
# a different question:
#
#   MEAN    "if the total were shared equally, what would each get?"
#           It is the total divided by the count, so it is the right
#           answer whenever the TOTAL is what matters.
#
#   MEDIAN  "what does the middle person get?"
#           It is the right answer whenever a TYPICAL case matters.
#
#   MODE    "what is the most common value?"
#           The only one that works for categories, and the only one
#           that can be multi-valued.
#
# ASKING "WHICH IS CORRECT" IS THE WRONG QUESTION. Asking which
# question you meant to ask is the right one.

# THE MEAN IS RIGHT WHEN THE TOTAL IS THE POINT:
pay.sum()                     # 796 -- the payroll
pay.mean() * len(pay)         # 796 -- recoverable from the mean
np.median(pay) * len(pay)     # 484 -- meaningless
#
# You cannot budget from a median. If the question is "what will 200
# hires cost", the mean is the only summary that answers it.

# THE MEDIAN IS RIGHT WHEN A TYPICAL CASE IS THE POINT:
(pay < pay.mean()).mean()     # 0.909
#
# 91% OF EMPLOYEES EARN BELOW THE MEAN. Describing 72.4 as a typical
# salary is false for ten of the eleven people.

# THE GAP BETWEEN THEM IS A MEASUREMENT OF SKEW, and it is free:
pay.mean() / np.median(pay)   # 1.646
#
#   ~1.0   symmetric
#   >1.2   right-skewed; the mean is being pulled by a tail
#   <0.8   left-skewed
`,
      hl: [17, 33, 42],
      caption: "**91% of these employees earn below the mean.** Both numbers are correct; one of them describes almost nobody, and reporting it as \"the average salary\" is a choice with consequences."
    },

    { t: "h2", n: "02", text: "Robustness, measured", id: "robustness" },

    { t: "p", text: "**Robustness is how much of your data an adversary would have to corrupt before your summary becomes meaningless** — and it is measurable, not a vague quality. The breakdown point turns it into a single number you can compare." },

    { t: "dl", items: [
      ["Breakdown point", "The fraction of observations that must be corrupted to move an estimator arbitrarily far. `1/n` for the mean, 50% for the median."],
      ["Robust estimator", "One with a breakdown point well above zero. It resists contamination at some cost in efficiency."],
      ["Trimmed mean", "Discard the extreme `k%` at each end, then average. The breakdown point is exactly the trim fraction, so you choose it deliberately."],
      ["Efficiency", "How much data a robust estimator needs to match a non-robust one on clean data. The median needs about 57% more than the mean under normality."],
      ["Outlier", "An observation far from the rest. Whether it is an error or a genuine rare case is a question about the data, not about the number — and only the first justifies removal."]
    ]},

    { t: "viz",
      title: "One value moves the mean without limit",
      caption: "Push a single observation towards infinity and the mean follows it anywhere. The median does not move past its neighbour — its breakdown point is 50%, the highest any location estimator can have.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="A dot plot where one point moves right, dragging the mean marker while the median stays put">
  <g>
    <line x1="70" y1="80" x2="620" y2="80" style="stroke:var(--line)" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="110" cy="80" r="6"/><circle cx="150" cy="80" r="6"/><circle cx="190" cy="80" r="6"/>
      <circle cx="230" cy="80" r="6"/><circle cx="270" cy="80" r="6"/><circle cx="310" cy="80" r="6"/>
    </g>
    <circle cx="350" cy="80" r="6" style="fill:var(--crit)"/>
    <line x1="230" y1="60" x2="230" y2="100" style="stroke:var(--good)" stroke-width="3"/>
    <text x="204" y="52" class="s-sub" style="fill:var(--good)">median</text>
    <line x1="244" y1="100" x2="244" y2="118" style="stroke:var(--accent)" stroke-width="3"/>
    <text x="222" y="136" class="s-sub" style="fill:var(--accent)">mean</text>
  </g>

  <g transform="translate(0,90)">
    <line x1="70" y1="80" x2="840" y2="80" style="stroke:var(--line)" stroke-width="1.5"/>
    <g style="fill:var(--ink-3)">
      <circle cx="110" cy="80" r="6"/><circle cx="150" cy="80" r="6"/><circle cx="190" cy="80" r="6"/>
      <circle cx="230" cy="80" r="6"/><circle cx="270" cy="80" r="6"/><circle cx="310" cy="80" r="6"/>
    </g>
    <circle cx="800" cy="80" r="6" style="fill:var(--crit)"/>
    <line x1="230" y1="60" x2="230" y2="100" style="stroke:var(--good)" stroke-width="3"/>
    <text x="204" y="52" class="s-sub" style="fill:var(--good)">median -- unmoved</text>
    <line x1="308" y1="100" x2="308" y2="118" style="stroke:var(--accent)" stroke-width="3"/>
    <text x="286" y="136" class="s-sub" style="fill:var(--accent)">mean -- dragged</text>
    <text x="700" y="60" class="s-sub" style="fill:var(--crit)">one point</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "the breakdown point makes robustness a number", code: `
# THE BREAKDOWN POINT is the fraction of the data an adversary must
# corrupt to move an estimator arbitrarily far.

x = np.array([10.0, 12.0, 11.0, 13.0, 9.0, 11.0, 12.0, 10.0, 14.0, 11.0])

# MEAN -- breakdown point 1/n, which tends to 0. One value suffices.
np.append(x, 1e9).mean()             # 90,909,101.0
np.median(np.append(x, 1e9))         # 11.5 -- barely moved

# MEDIAN -- breakdown point 50%, the theoretical maximum for a location
# estimator. You must corrupt half the data before it can be moved
# anywhere.
corrupted = np.append(x, [1e9]*4)    # 4 of 14 = 29% corrupted
np.median(corrupted)                 # 12.0 -- still sensible
corrupted = np.append(x, [1e9]*10)   # 10 of 20 = 50%
np.median(corrupted)                 # 500,000,006 -- now it breaks

# TRIMMED MEAN -- tune the breakdown point to what you expect:
for trim in (0.0, 0.05, 0.10, 0.25):
    print(f"trim {trim:.0%}  ->  {stats.trim_mean(np.append(x, 1e9), trim):,.2f}"
          f"   breakdown point {trim:.0%}")

# trim  0%  ->  90,909,101.00   breakdown point 0%
# trim  5%  ->  11.44           breakdown point 5%
# trim 10%  ->  11.44           breakdown point 10%
# trim 25%  ->  11.43           breakdown point 25%
#
# A 10% TRIMMED MEAN keeps most of the mean's efficiency on clean data
# while surviving 10% contamination. It is the usual compromise, and it
# is what "trimmed mean" means in a metrics system.

# THE COST OF ROBUSTNESS, ON CLEAN DATA: the median needs about 57%
# more data than the mean to reach the same precision on normal data.
rng = np.random.default_rng(0)
s = rng.normal(0, 1, (100_000, 25))

s.mean(axis=1).std()                 # 0.2000  = 1/sqrt(25)
np.median(s, axis=1).std()           # 0.2510
(0.2510 / 0.2000)**2                 # 1.575 -- 57% more data needed
#
# THAT IS THE TRADE, AND IT IS SMALL. You pay 57% efficiency on
# perfectly clean normal data to gain immunity to arbitrary
# contamination. Real data is rarely perfectly clean.
`,
      hl: [4, 12, 24, 42],
      caption: "**Robustness costs 57% efficiency on clean normal data.** That is the whole price, and real data is rarely clean enough for it to be a bad trade."
    },

    { t: "callout", kind: "trap", title: "The arithmetic mean is wrong for rates and ratios", body: [
      { t: "p", text: "Averaging speeds, growth rates or ratios with the arithmetic mean gives an answer that does not correspond to any real total. The right mean depends on what is being held constant." },
      { t: "code", lang: "python", numbered: false, title: "three means, three situations", code: `
from scipy.stats import gmean, hmean

# HARMONIC MEAN -- for RATES over a fixed distance or amount of work.
#
# A car drives 100 km at 60 km/h, then 100 km at 20 km/h.
(60 + 20) / 2                    # 40 -- WRONG
hmean([60, 20])                  # 30 -- correct

200 / (100/60 + 100/20)          # 30.0, confirming it
#
# It is wrong because more TIME is spent at the slow speed, so the slow
# speed deserves more weight. The harmonic mean applies that weighting.
#
# THE SAME TRAP: averaging requests-per-second across servers, or
# price-per-unit across purchases of equal spend. Both are rates over a
# fixed quantity.

# GEOMETRIC MEAN -- for MULTIPLICATIVE growth.
#
# Returns of +50%, -50%, +50%, -50% over four years.
np.mean([1.5, 0.5, 1.5, 0.5])    # 1.0  -- suggests you broke even
gmean([1.5, 0.5, 1.5, 0.5])      # 0.866

1.5 * 0.5 * 1.5 * 0.5            # 0.5625 -- you LOST 44%
0.866**4                         # 0.5625 -- the geometric mean recovers it
#
# THE ARITHMETIC MEAN OF RETURNS IS ALWAYS >= THE GEOMETRIC MEAN, and
# the gap grows with volatility. Quoting the arithmetic mean of returns
# overstates what an investor actually earned, every time.

# THE RULE:
#   SUM matters      -> arithmetic mean
#   PRODUCT matters  -> geometric mean
#   RATE over fixed work -> harmonic mean
#
# And the ordering is always harmonic <= geometric <= arithmetic, with
# equality only when every value is identical.
hmean([1,2,4]), gmean([1,2,4]), np.mean([1,2,4])   # 1.714, 2.0, 2.333`},
      { t: "p", text: "**The arithmetic mean of returns always exceeds the geometric mean**, and the gap grows with volatility — so quoting it overstates what an investor actually earned, every time, without being incorrect arithmetic." }
    ]},

    { t: "h2", n: "03", text: "When no single number is honest", id: "multimodal" },

    { t: "p", text: "Sometimes no single number is honest, because the data is a **mixture of distinct populations**. A mean that falls in the empty gap between two groups describes a case that does not exist, and the right response is to report the structure instead." },

    { t: "dl", items: [
      ["Multimodal", "A distribution with several peaks. Usually a sign that two or more populations have been pooled."],
      ["Mixture", "A distribution formed by drawing from several component distributions with given weights — cache hits and misses, free and paid users."],
      ["Percentile jump", "A large ratio between adjacent percentiles. A smooth distribution cannot produce one, so it is a reliable signature of a mixture."],
      ["Decomposition", "Reporting the components and their weights rather than one summary. Usually shorter than the caveat a single number would need."]
    ]},

    { t: "code", lang: "python", title: "the average of two groups describes neither", code: `
rng = np.random.default_rng(0)

# Response times from a service with a cache: hits are fast, misses are
# slow, and 70% hit.
hits = rng.normal(12, 3, 7000)
misses = rng.normal(180, 40, 3000)
latency = np.concatenate([hits, misses])

latency.mean()                   # 62.3 ms
np.median(latency)               # 15.6 ms
#
# NOTHING TAKES 62 ms. The mean sits in the empty gap between two
# populations, describing a request that does not exist.

# AND THE MEDIAN IS ALSO MISLEADING here -- it says "typical is 16 ms"
# while 30% of requests take fifteen times that.
np.percentile(latency, [50, 70, 75, 90, 99])
# [15.6, 25.4, 148.9, 205.1, 273.4]
#
# THE JUMP BETWEEN p70 AND p75 IS THE TELL. A smooth distribution does
# not increase sixfold across five percentiles; a mixture does, at the
# boundary between its components.

def bimodality_check(x):
    """A quick, assumption-free flag for a mixture: look for a large
    jump between adjacent deciles."""
    q = np.percentile(x, np.arange(5, 100, 5))
    ratios = q[1:] / np.maximum(q[:-1], 1e-12)
    i = int(np.argmax(ratios))
    return float(ratios[i]), int(5 * (i + 1))

bimodality_check(latency)        # (5.87, 70) -- 5.9x jump at p70
bimodality_check(rng.normal(60, 20, 10000))   # (1.09, 5) -- smooth

# THE HONEST SUMMARY REPORTS THE STRUCTURE, not a number:
#
#   "70% of requests are cache hits, median 12 ms.
#    30% are misses, median 180 ms.
#    Overall p99 is 273 ms."
#
# THAT IS THREE NUMBERS AND IT IS SHORTER THAN THE PARAGRAPH EXPLAINING
# WHY THE AVERAGE IS 62 ms. Whenever a single figure needs a caveat,
# the caveat was the finding.

# IT ALSO POINTS AT THE LEVER. "Raise the hit rate from 70% to 85%"
# is actionable; "reduce mean latency" is not, because the mean is
# governed by the mix rather than by either component.
for hit_rate in (0.70, 0.85, 0.95):
    print(f"hit rate {hit_rate:.0%}  ->  mean "
          f"{hit_rate*12 + (1-hit_rate)*180:.1f} ms")
# hit rate 70%  ->  mean 62.4 ms
# hit rate 85%  ->  mean 37.2 ms
# hit rate 95%  ->  mean 20.4 ms
`,
      hl: [13, 22, 40, 48],
      caption: "**A sixfold jump between p70 and p75 is the signature of a mixture.** A smooth distribution cannot do that, and the location of the jump tells you the mixing proportion."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Referee a disagreement about the average",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Two teams present contradictory summaries of the same customer-spend data to the same meeting, and both are correct." },
        { t: "code", lang: "python", numbered: false, title: "the claims", code: `
# FINANCE:   "Average spend is $340 per customer, up 12% year on year."
# PRODUCT:   "Typical spend is $47 and has not moved in two years."
#
# The underlying data, both years:
#   2023: 100,000 customers, total spend $30.4m, median $47
#   2024: 112,000 customers, total spend $38.1m, median $47
#
#   2024 spend distribution:
#     p50   $47      p90   $310
#     p75   $118     p99  $2,400
#                    p99.9 $41,000`},
        { t: "p", text: "Reconcile the two claims, say what actually changed, and recommend what the meeting should be shown." }
      ],
      requirements: [
        "Show both claims are arithmetically correct.",
        "Identify what changed to move one number and not the other.",
        "Say which summary answers which business question.",
        "Quantify how concentrated the revenue is.",
        "Recommend a reporting format.",
        "Include tests."
      ],
      hint: "Compute mean/median for both years, then work out where the extra $7.7m came from.",
      solution: {
        lang: "python",
        title: "reconcile.py",
        code: `import numpy as np

Y23 = {"customers": 100_000, "total": 30_400_000, "median": 47.0}
Y24 = {"customers": 112_000, "total": 38_100_000, "median": 47.0}


# =========================================================================
# BOTH CLAIMS ARE CORRECT
# =========================================================================

mean23 = Y23["total"] / Y23["customers"]           # 304.0
mean24 = Y24["total"] / Y24["customers"]           # 340.2

(mean24 - mean23) / mean23                         # 0.119 -- "up 12%"
Y24["median"] == Y23["median"]                     # True -- "not moved"
#
# FINANCE IS RIGHT AND PRODUCT IS RIGHT. There is nothing to
# adjudicate arithmetically; the disagreement is about which question
# the meeting is asking.


# =========================================================================
# WHAT ACTUALLY CHANGED
# =========================================================================
#
# The mean rose 12% while the median did not move at all. For that to
# happen, the extra revenue must have come from the TAIL rather than
# from typical customers.
#
# Total revenue grew 25.3%, customers grew 12%:
(Y24["total"] - Y23["total"]) / Y23["total"]       # 0.253
(Y24["customers"] - Y23["customers"]) / Y23["customers"]   # 0.12
#
# So revenue per customer rose because the customer MIX changed, not
# because customers spend more. Since the median is identical, the
# median customer's behaviour is unchanged -- to two significant
# figures, in a year.

# QUANTIFY THE CONCENTRATION from the reported quantiles. Approximate
# each band by its midpoint and count customers per band:
bands = [
    ("p0-p50",    0.50, (0 + 47) / 2),
    ("p50-p75",   0.25, (47 + 118) / 2),
    ("p75-p90",   0.15, (118 + 310) / 2),
    ("p90-p99",   0.09, (310 + 2400) / 2),
    ("p99-p99.9", 0.009, (2400 + 41000) / 2),
    ("top 0.1%",  0.001, 41000 * 2.2),      # tail mean well above p99.9
]

n = Y24["customers"]
rows = [(name, share * n, share * n * mid) for name, share, mid in bands]
est_total = sum(r[2] for r in rows)

for name, count, revenue in rows:
    print(f"{name:12s} {count:9,.0f} customers  "
          f"\${revenue/1e6:6.2f}m  {revenue/est_total:6.1%} of revenue")

# p0-p50         56,000 customers  $  0.66m    1.7% of revenue
# p50-p75        28,000 customers  $  2.31m    5.9% of revenue
# p75-p90        16,800 customers  $  3.60m    9.2% of revenue
# p90-p99        10,080 customers  $ 13.66m   34.9% of revenue
# p99-p99.9       1,008 customers  $ 21.88m   -- see note
# top 0.1%          112 customers  $ 10.10m
#
# THE BOTTOM HALF OF CUSTOMERS GENERATES UNDER 2% OF REVENUE. The top
# 1% generates the majority of it. That single fact reframes the whole
# discussion, and neither of the two claims contains it.

top_1pct = sum(r[2] for r in rows[-2:]) / est_total
top_1pct                                           # ~0.55


# =========================================================================
# WHICH SUMMARY ANSWERS WHICH QUESTION
# =========================================================================
#
# THE MEAN answers questions about TOTALS, because total = mean x count.
#   - "What will 20,000 new customers be worth?"     mean
#   - "What is the revenue forecast?"                mean
#   - "What can we afford to pay to acquire one?"    mean
#
# THE MEDIAN answers questions about a TYPICAL customer.
#   - "Is the product getting more valuable to users?"   median
#   - "Did the pricing change affect normal customers?"  median
#   - "What should the default plan cost?"               median
#
# THEY ARE NOT COMPETING ESTIMATES. Finance is forecasting revenue and
# needs the mean; product is asking about user behaviour and needs the
# median. The failure was presenting them as rival answers rather than
# as answers to different questions.

# THE SYNTHESIS THAT NEITHER TEAM STATED, and which is the real finding:
#
#   "Revenue grew 25%. None of that growth came from typical customers,
#    whose spend is unchanged. It came from acquiring 12% more
#    customers and from growth in the top percentile. The business is
#    becoming more concentrated, and the median customer is no more
#    valuable than a year ago."
#
# THAT IS A STRATEGIC STATEMENT, and it raises the question the meeting
# should actually be about: is concentration acceptable? If the top 1%
# is 55% of revenue, losing a handful of accounts is a material risk
# that neither the mean nor the median exposes.


# =========================================================================
# WHAT TO REPORT
# =========================================================================
#
# 1. NEVER A SINGLE AVERAGE for a skewed quantity. Always mean AND
#    median together -- the gap between them is free information about
#    the shape, and it costs one extra column.
#
# 2. A DECILE TABLE alongside. It fits in six rows and it is the only
#    way concentration becomes visible.
#
# 3. SEGMENT-LEVEL MEDIANS rather than one overall median. If SMB and
#    enterprise are different populations, one median describes
#    neither -- the mixture problem, applied to customers.
#
# 4. YEAR-ON-YEAR ON BOTH, not on one. A mean moving while a median
#    does not is itself the headline, and reporting only one hides it.
#
# 5. NAME THE QUESTION each figure answers, in the caption. Most of
#    this disagreement would not have happened if the slides had said
#    "revenue forecast basis" and "typical customer" rather than
#    "average spend" twice.

def summarise(values, name="spend"):
    """The minimum honest summary of a skewed quantity."""
    v = np.asarray(values, dtype=float)
    q = np.percentile(v, [10, 25, 50, 75, 90, 99])
    return {
        "n": len(v),
        "total": v.sum(),
        "mean": v.mean(),
        "median": q[2],
        "mean_over_median": v.mean() / q[2],
        "deciles": dict(zip(["p10","p25","p50","p75","p90","p99"], q)),
        "top_1pct_share": v[v >= q[5]].sum() / v.sum(),
    }


# =========================================================================
# TESTS
# =========================================================================

def test_both_claims_are_arithmetically_correct():
    m23 = Y23["total"] / Y23["customers"]
    m24 = Y24["total"] / Y24["customers"]

    assert abs((m24 - m23) / m23 - 0.12) < 0.005      # finance
    assert Y24["median"] == Y23["median"]             # product


def test_growth_did_not_come_from_typical_customers():
    """The mean moved and the median did not -- so the change is in
    the tail or the mix, not in typical behaviour."""
    m23 = Y23["total"] / Y23["customers"]
    m24 = Y24["total"] / Y24["customers"]

    assert m24 > m23 * 1.10
    assert Y24["median"] == Y23["median"]


def test_revenue_grew_faster_than_customers():
    rev = (Y24["total"] - Y23["total"]) / Y23["total"]
    cust = (Y24["customers"] - Y23["customers"]) / Y23["customers"]

    assert rev > 2 * cust


def test_mean_median_ratio_flags_heavy_skew():
    ratio = (Y24["total"] / Y24["customers"]) / Y24["median"]

    assert ratio > 5.0            # 7.2 -- extreme skew


def test_summary_exposes_concentration():
    rng = np.random.default_rng(0)
    v = np.exp(rng.normal(np.log(47), 1.9, 112_000))

    s = summarise(v)
    assert s["mean_over_median"] > 3
    assert s["top_1pct_share"] > 0.20


def test_summary_is_stable_for_symmetric_data():
    """The same function must not cry skew on well-behaved data."""
    rng = np.random.default_rng(0)
    s = summarise(rng.normal(100, 15, 50_000))

    assert 0.95 < s["mean_over_median"] < 1.05`,
        notes: [
          { t: "p", text: "**There is nothing to adjudicate arithmetically** — both claims are correct. The disagreement is about which question the meeting is asking, and it was created by two slides both labelled \"average spend\"." },
          { t: "callout", kind: "insight", title: "The finding is in the gap, not in either number", body: [
            { t: "p", text: "The mean rose 12% while the median did not move at all, so the extra revenue came from the tail and the mix rather than from typical customers. To two significant figures, the median customer's behaviour is unchanged in a year." },
            { t: "p", text: "**The bottom half of customers generates under 2% of revenue and the top 1% generates the majority.** Neither team's claim contains that, and it reframes the discussion entirely." }
          ]},
          { t: "p", text: "**The mean answers total questions and the median answers typical ones.** Finance is forecasting revenue and needs `total = mean × count`; product is asking about user behaviour and needs the median. They are not rival estimates." },
          { t: "p", text: "**The real question the meeting should be about is concentration risk.** If the top 1% is 55% of revenue, losing a handful of accounts is material — and neither summary exposes it." },
          { t: "p", text: "**Report mean and median together for any skewed quantity.** The gap between them is free information about the shape and costs one extra column; a decile table fits in six rows and is the only way concentration becomes visible." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A university published average starting salaries by degree. One programme reported a figure far above every comparable course, and applications to it rose sharply." },
      { t: "p", text: "**The cohort was small and included one graduate who had signed a professional sports contract.** Removing that single person moved the reported average by more than half, and put the programme in the middle of the pack." },
      { t: "p", text: "**The mean's breakdown point is `1/n`**, so in a cohort of 40 a single value can dominate — and small cohorts are exactly where per-programme figures get published." },
      { t: "p", text: "**Report the median for any per-group figure with a small `n`**, and publish the group size alongside it. A mean over 40 people is a summary of one person as often as not." }
    ]}
  ],

  takeaways: [
    "**Mean, median and mode answer different questions**, so \"which is correct\" is the wrong thing to ask.",
    "**The mean is right when the total matters**, because `total = mean × count`; you cannot budget from a median.",
    "**The median is right when a typical case matters** — 91% of a skewed sample can sit below the mean.",
    "**The mean/median ratio is a free skew measurement** — above 1.2 means a tail is pulling the mean.",
    "**The breakdown point makes robustness a number**: `1/n` for the mean, 50% for the median, the trim fraction for a trimmed mean.",
    "**Robustness costs about 57% efficiency on clean normal data** — a small price when data is rarely clean.",
    "**Use the harmonic mean for rates over fixed work**, or the average speed over two equal distances comes out wrong.",
    "**Use the geometric mean for multiplicative growth** — the arithmetic mean of returns always overstates what was earned.",
    "**Harmonic ≤ geometric ≤ arithmetic**, with equality only when every value is identical.",
    "**A large jump between adjacent percentiles is the signature of a mixture** — a smooth distribution cannot do it.",
    "**When a single figure needs a caveat, the caveat was the finding** — report the structure instead.",
    "**Report the median and the group size for any small-`n` per-group figure**; a mean over 40 people can be a summary of one."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A car travels 100 km at 60 km/h and 100 km at 20 km/h. What is the average speed?",
        options: [
          "40 km/h",
          "30 km/h — the harmonic mean, because more time is spent at the slow speed",
          "35 km/h",
          "It depends on the acceleration"
        ],
        answer: 1,
        why: "Total distance over total time is 200/(100/60 + 100/20) = 30. The same trap catches requests-per-second averaged across servers and price-per-unit across equal-spend purchases — both are rates over a fixed quantity."
      },
      {
        stem: "Latencies have mean 62 ms and median 16 ms, with a sixfold jump between p70 and p75. What is going on?",
        options: [
          "There are outliers to remove",
          "It is a mixture — probably a 70% cache hit rate, with fast hits and slow misses; nothing actually takes 62 ms",
          "The measurement is noisy",
          "The distribution is lognormal"
        ],
        answer: 1,
        why: "A smooth distribution cannot increase sixfold across five percentiles. The honest summary reports both components, which is shorter than the paragraph explaining the average — and it points at raising the hit rate as the lever, which \"reduce mean latency\" does not."
      },
      {
        stem: "Returns are +50%, −50%, +50%, −50%. What was the average annual return?",
        options: [
          "0% — the arithmetic mean",
          "−13.4% — the geometric mean, since 1.5 × 0.5 × 1.5 × 0.5 = 0.5625, a 44% loss",
          "+12.5%",
          "Undefined for negative returns"
        ],
        answer: 1,
        why: "The arithmetic mean of returns always exceeds the geometric mean, with the gap growing in volatility. Quoting it overstates what an investor actually earned every time, without being incorrect arithmetic — which is what makes it durable."
      },
      {
        stem: "Which estimator can tolerate the most corrupted data before breaking?",
        options: [
          "The mean, since it uses every observation",
          "The median, with a breakdown point of 50% — the theoretical maximum for a location estimator",
          "The 25% trimmed mean",
          "The mode"
        ],
        answer: 1,
        why: "The mean's breakdown point is `1/n`: one value moves it arbitrarily far. That is why a published average starting salary over a 40-person cohort can be a summary of a single graduate's sports contract."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you report a median instead of a mean?",
        strong: "When the question is about a typical case rather than a total. For skewed data the mean can sit above 90% of the observations. But if the question is a forecast or a budget, the mean is the only one that works, because total equals mean times count.",
        answer: [
          { t: "p", text: "Naming the situation where the *mean* is required prevents the answer sounding like a reflexive preference for robustness." },
          { t: "p", text: "Suggesting both, with the ratio between them as a skew indicator, is the answer that would actually improve a report." }
        ]
      },
      {
        level: "core",
        q: "Your service has a mean latency of 62 ms but users complain constantly. What would you check?",
        strong: "The percentile distribution. A mean of 62 with a median of 16 means a mixture — probably cache hits and misses — and nothing actually takes 62 ms. Users experience the slow component, and the mean describes a request that does not exist.",
        answer: [
          { t: "p", text: "Going to percentiles rather than to the measurement is the diagnostic instinct being tested." },
          { t: "p", text: "Identifying the mixture and naming the lever — hit rate, not \"mean latency\" — turns the observation into an action." }
        ]
      },
      {
        level: "advanced",
        q: "How would you make a metric robust to outliers without losing too much precision?",
        strong: "A trimmed mean, with the trim fraction set to the contamination you expect. A 10% trim survives 10% corruption while keeping most of the mean's efficiency. The median costs about 57% efficiency on clean normal data, which is the ceiling on what robustness costs.",
        answer: [
          { t: "p", text: "Quantifying the efficiency cost makes the trade-off concrete rather than a matter of taste." },
          { t: "p", text: "Framing the trim fraction as an explicit statement of expected contamination shows you would set it deliberately rather than by convention." }
        ]
      }
    ]
  }
});
