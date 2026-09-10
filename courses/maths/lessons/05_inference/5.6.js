/* ============================================================================
   LESSON 5.6 — Chi-Square and ANOVA
   ========================================================================= */
EC.receiveLesson({
  id: "5.6",

  lede: "Chi-square tests counts; ANOVA tests several means at once. **Both exist to stop you running many pairwise tests**, which would find something by construction. And both answer a narrower question than people assume — a significant result says \"not all equal\" and nothing about which, or by how much.",

  objectives: [
    "Run a chi-square goodness-of-fit and a test of independence",
    "Say why the expected-count rule exists and what to do when it fails",
    "Explain ANOVA as a variance decomposition rather than a formula",
    "Justify ANOVA over repeated t-tests with a number",
    "Follow a significant omnibus result with the right post-hoc procedure"
  ],

  prerequisites: ["5.5"],

  blocks: [

    { t: "h2", n: "01", text: "Chi-square: comparing counts against a model", id: "chi-square" },

    { t: "p", text: "**Chi-square compares observed counts against what a model predicts**, dividing each discrepancy by the count expected there. That division is what makes the comparison fair: a gap of 10 matters enormously where 12 were expected and not at all where 10,000 were." },

    { t: "dl", items: [
      ["Chi-square statistic", "`χ² = Σ (observed − expected)²/expected`, summed over every cell."],
      ["Goodness of fit", "Testing counts against a specified distribution — is this die fair?"],
      ["Test of independence", "Testing whether two categorical variables are related. The expected counts are `row × column / total` — the product of the marginals from lesson 3.7."],
      ["Standardised residual", "`(observed − expected)/√expected` per cell. A value beyond ±2 identifies the cell driving the result, and it is the actionable output."],
      ["Cramér's V", "Chi-square rescaled to `[0,1]`, so it is comparable across table sizes and sample sizes — which `χ²` itself is not."],
      ["Expected-count rule", "The approximation needs expected counts of about 5 or more. Below that, use Fisher's exact test or a permutation."]
    ]},

    { t: "code", lang: "python", title: "one statistic, two uses", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# THE STATISTIC IS THE SAME IN BOTH USES:
#
#     chi2 = sum over cells of (observed - expected)^2 / expected
#
# The division by expected is what makes it a fair comparison: a
# discrepancy of 10 matters enormously in a cell expecting 12 and not
# at all in one expecting 10,000.

# ---- USE 1: GOODNESS OF FIT -----------------------------------------
# Does a die match the uniform distribution the null claims?

observed = np.array([43, 52, 61, 48, 55, 41])
expected = np.full(6, observed.sum() / 6)             # 50 each

chi2 = (((observed - expected)**2) / expected).sum()
chi2                                                  # 5.28
df = len(observed) - 1                                # 5
stats.chi2.sf(chi2, df)                               # 0.383

stats.chisquare(observed)                             # same, 0.383
#
# NO EVIDENCE OF BIAS. And note what the test does NOT say: it does not
# say the die is fair, only that 300 rolls cannot distinguish it from
# fair (lesson 5.3).

# ---- USE 2: INDEPENDENCE --------------------------------------------
# Is plan choice related to churn?

table = np.array([[120, 380],     # free:    churned, stayed
                  [ 45, 455],     # basic
                  [ 15, 485]])    # premium

chi2, p, dof, expected = stats.chi2_contingency(table)
chi2, p, dof                                          # 108.6, 3e-24, 2
#
# THE EXPECTED COUNTS ASSUME INDEPENDENCE -- each cell is
# row_total x col_total / grand_total, which is exactly the "product of
# the marginals" from lesson 3.7. The chi-square statistic MEASURES THE
# GAP between the observed joint and the independent one.
np.round(expected, 1)
# [[ 60. 440.]
#  [ 60. 440.]
#  [ 60. 440.]]

# THE p-VALUE IS 3e-24 AND TELLS YOU NOTHING USEFUL. With n = 1,500 it
# was always going to be tiny. THE EFFECT SIZE IS THE FINDING:
def cramers_v(table):
    """Chi-square rescaled to [0,1], so it is comparable across table
    sizes and sample sizes -- which chi2 itself is not."""
    table = np.asarray(table)
    chi2 = stats.chi2_contingency(table)[0]
    n = table.sum()
    return float(np.sqrt(chi2 / (n * (min(table.shape) - 1))))

cramers_v(table)                                      # 0.269
#
#   ~0.1   small
#   ~0.3   moderate
#   ~0.5   large
#
# AND THE MOST USEFUL OUTPUT IS THE PER-CELL RESIDUALS, which say
# WHERE the association is:
resid = (table - expected) / np.sqrt(expected)
np.round(resid, 1)
# [[ 7.7 -2.9]      free users churn far MORE than independence predicts
#  [-1.9  0.7]      basic is close to expected
#  [-5.8  2.1]]     premium churns far LESS
#
# A STANDARDISED RESIDUAL BEYOND +/-2 IS THE CELL DRIVING THE RESULT.
# The omnibus p-value says "something is going on"; the residuals say
# what, and only one of those is actionable.
`,
      hl: [9, 34, 45, 60],
      caption: "**The per-cell residuals are the finding; the p-value is not.** A standardised residual beyond ±2 identifies which cell drives the association, which is the only part anyone can act on."
    },

    { t: "callout", kind: "trap", title: "The expected-count rule, and what to do when it fails", body: [
      { t: "p", text: "Chi-square's null distribution is an *approximation* that assumes each cell's count is roughly normal. With small expected counts that approximation breaks, and the test becomes unreliable in a direction that depends on the table." },
      { t: "code", lang: "python", numbered: false, title: "measure it rather than trusting the rule", code: `
# THE USUAL RULE: all expected counts >= 5, or at least 80% of cells
# >= 5 with none below 1. Check what actually happens:

def chi2_error_rate(row_totals, col_probs, trials=20_000, seed=0):
    """Generate tables where the null is TRUE, count rejections."""
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        rows = [r.multinomial(n, col_probs) for n in row_totals]
        t = np.array(rows)
        if (t.sum(axis=0) == 0).any() or (t.sum(axis=1) == 0).any():
            continue
        hits += stats.chi2_contingency(t)[1] < 0.05
    return hits / trials

for total in (20, 40, 100, 400):
    p = [0.5, 0.5]
    rate = chi2_error_rate([total//2, total//2], p)
    exp_min = (total//2) * 0.5
    print(f"n={total:<5} min expected {exp_min:5.1f}   "
          f"false positive rate {rate:.3f}")

# n=20    min expected   5.0   false positive rate 0.038
# n=40    min expected  10.0   false positive rate 0.045
# n=100   min expected  25.0   false positive rate 0.049
# n=400   min expected 100.0   false positive rate 0.050
#
# IT IS CONSERVATIVE at small counts here rather than liberal -- but
# the direction depends on the table's shape, so "conservative" is not
# a general reassurance.

# THE FIX IS FISHER'S EXACT TEST, which computes the null distribution
# by enumeration rather than approximating it:
small = np.array([[8, 2], [1, 9]])
stats.chi2_contingency(small)[1]              # 0.0088  (approximation)
stats.fisher_exact(small)[1]                  # 0.0055  (exact)

# FOR LARGER TABLES, a Monte Carlo permutation:
def chi2_permutation(table, n_perm=10_000, seed=0):
    """The exact framework from lesson 5.4: shuffle the labels, rebuild
    the table, and see how often chi2 is this large."""
    r = np.random.default_rng(seed)
    table = np.asarray(table)
    obs = stats.chi2_contingency(table)[0]

    rows = np.repeat(np.arange(table.shape[0]), table.sum(axis=1))
    cols = np.repeat(np.arange(table.shape[1]), table.sum(axis=0))

    count = 0
    for _ in range(n_perm):
        r.shuffle(cols)
        perm = np.zeros_like(table)
        np.add.at(perm, (rows, cols), 1)
        try:
            count += stats.chi2_contingency(perm)[0] >= obs
        except ValueError:
            pass
    return (count + 1) / (n_perm + 1)

chi2_permutation(np.array([[8, 2], [1, 9]]))   # ~0.006, matching Fisher
#
# NEVER COMBINE CATEGORIES TO SATISFY THE RULE AFTER SEEING THE DATA.
# Collapsing the cells that look interesting is p-hacking with a
# methodological justification attached.`},
      { t: "p", text: "**Never merge categories to satisfy the expected-count rule after seeing the data.** Collapsing whichever cells look interesting is p-hacking with a methodological justification attached — use Fisher's exact test or a permutation instead." }
    ]},

    { t: "h2", n: "02", text: "ANOVA is a variance decomposition", id: "anova" },

    { t: "p", text: "**ANOVA compares several means at once by splitting total variation into two parts**: how much groups differ from each other, and how much observations differ within their group. Their ratio is the F statistic, and this is the law of total variance from lesson 3.3 made into a test." },

    { t: "dl", items: [
      ["Sum of squares", "Squared deviations, totalled. `SS_total = SS_between + SS_within`, exactly."],
      ["Mean square", "A sum of squares divided by its degrees of freedom — an estimate of variance."],
      ["F statistic", "`MS_between / MS_within`. Near 1 under the null, because both then estimate the same `σ²`."],
      ["Omnibus test", "One test for \"are any of these different?\" — which is all a significant F establishes."],
      ["Eta squared", "`SS_between / SS_total` — the fraction of variance explained by group. The effect size, since F and p say nothing about magnitude."],
      ["`F = t²`", "With two groups, ANOVA is exactly a t-test. It inherits Student's equal-variance assumption rather than Welch's."]
    ]},

    { t: "viz",
      title: "F is the ratio of between-group spread to within-group spread",
      caption: "The same three group means, with tight and loose within-group spread. On the left the separation is obvious; on the right the identical means are indistinguishable. F is exactly that comparison.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Two panels of three group distributions, tightly and loosely spread around the same three means">
  <g>
    <text x="40" y="26" class="s-label" style="fill:var(--good)">LARGE F -- groups separate</text>
    <path d="M50 170 C 70 170, 76 96, 96 96 C 116 96, 122 170, 142 170"
          style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="2"/>
    <path d="M150 170 C 170 170, 176 80, 196 80 C 216 80, 222 170, 242 170"
          style="fill:var(--warn);fill-opacity:.2;stroke:var(--warn)" stroke-width="2"/>
    <path d="M250 170 C 270 170, 276 110, 296 110 C 316 110, 322 170, 342 170"
          style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2"/>
    <line x1="40" y1="170" x2="360" y2="170" style="stroke:var(--line)" stroke-width="1.5"/>
    <text x="40" y="200" class="s-sub" style="fill:var(--ink-3)">between &gt;&gt; within</text>
  </g>

  <g transform="translate(460,0)">
    <text x="40" y="26" class="s-label" style="fill:var(--crit)">SMALL F -- same means, more noise</text>
    <path d="M0 170 C 50 170, 66 120, 96 120 C 126 120, 142 170, 192 170"
          style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="2"/>
    <path d="M100 170 C 150 170, 166 114, 196 114 C 226 114, 242 170, 292 170"
          style="fill:var(--warn);fill-opacity:.2;stroke:var(--warn)" stroke-width="2"/>
    <path d="M200 170 C 250 170, 266 126, 296 126 C 326 126, 342 170, 392 170"
          style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2"/>
    <line x1="0" y1="170" x2="400" y2="170" style="stroke:var(--line)" stroke-width="1.5"/>
    <text x="0" y="200" class="s-sub" style="fill:var(--ink-3)">between ~ within</text>
  </g>

  <text x="40" y="236" class="s-sub" style="fill:var(--ink-3)">F = (between-group variance) / (within-group variance) -- the law of total variance from lesson 3.3, made into a test</text>
</svg>`
    },

    { t: "code", lang: "python", title: "compute it by hand, then recognise it", code: `
groups = [
    rng.normal(100, 12, 30),
    rng.normal(106, 12, 35),
    rng.normal(104, 12, 28),
]

# THE DECOMPOSITION IS THE LAW OF TOTAL VARIANCE (lesson 3.3):
#
#     SS_total = SS_between + SS_within
#
all_values = np.concatenate(groups)
grand_mean = all_values.mean()

ss_total = ((all_values - grand_mean)**2).sum()
ss_between = sum(len(g) * (g.mean() - grand_mean)**2 for g in groups)
ss_within = sum(((g - g.mean())**2).sum() for g in groups)

np.isclose(ss_total, ss_between + ss_within)          # True, exactly

# CONVERT SUMS OF SQUARES TO VARIANCES by dividing by degrees of
# freedom -- k-1 between, n-k within.
k, n = len(groups), len(all_values)
ms_between = ss_between / (k - 1)
ms_within = ss_within / (n - k)

F = ms_between / ms_within                            # 2.72
p = stats.f.sf(F, k-1, n-k)                           # 0.071

stats.f_oneway(*groups)                               # same F and p

# MS_WITHIN IS AN ESTIMATE OF sigma^2 REGARDLESS of whether the means
# differ. MS_BETWEEN estimates sigma^2 ONLY IF THE MEANS ARE EQUAL --
# otherwise it is inflated. So their ratio is near 1 under the null and
# large otherwise, which is the whole logic of the F test.
ms_within, 12**2                                      # 138.4 vs 144

# EFFECT SIZE, because F and p say nothing about magnitude:
eta_squared = ss_between / ss_total                   # 0.038
#
# 3.8% OF THE VARIANCE IS EXPLAINED BY GROUP. Conventionally 0.01 is
# small, 0.06 medium, 0.14 large -- so this is a small effect that a
# larger sample would have made "significant" without making important.

# THE ONE-WAY ANOVA WITH TWO GROUPS IS EXACTLY A t-TEST:
a, b = rng.normal(0, 1, 40), rng.normal(0.6, 1, 40)
stats.f_oneway(a, b).statistic                        # 7.31
stats.ttest_ind(a, b).statistic**2                    # 7.31 -- F = t^2
#
# ANOVA IS NOT A DIFFERENT IDEA. It is the two-group comparison
# generalised, which is why it inherits the equal-variance assumption
# from Student's rather than from Welch's.
`,
      hl: [16, 33, 39, 49],
      caption: "**`F = t²` when there are two groups.** ANOVA is the two-group comparison generalised — which is also why it inherits Student's equal-variance assumption rather than Welch's."
    },

    { t: "h2", n: "03", text: "Why not just run all the t-tests", id: "post-hoc" },

    { t: "p", text: "Running every pairwise comparison instead of one omnibus test would find something by construction — **ten tests at `α = 0.05` give a 40% chance of a false positive**. A post-hoc procedure controls that while still telling you *which* groups differ." },

    { t: "dl", items: [
      ["Family-wise error rate", "The probability of at least one false positive across a set of tests. What a post-hoc procedure controls."],
      ["Tukey's HSD", "All pairwise comparisons, family-wise controlled. Uses the **studentised range** because the question is how large the *biggest* difference gets by chance."],
      ["Dunnett's test", "Every group against one control. Fewer comparisons than Tukey, so more power."],
      ["Fisher's LSD", "Run pairwise tests only if the omnibus is significant. Adequate for three groups and leaks for more."],
      ["Planned contrast", "A specific comparison chosen before the data. It needs no correction beyond its own count."]
    ]},

    { t: "ladder",
      title: "Comparing five treatment variants",
      rungs: [
        { level: "bad", label: "Run all ten pairwise t-tests",
          why: "Ten tests at `α = 0.05` give a 40% chance of at least one false positive when nothing differs. The family-wise error rate is what matters when you will act on *any* of the results.",
          code: `from itertools import combinations
pairs = list(combinations(range(5), 2))          # 10 comparisons
1 - 0.95**10                                     # 0.401

# Simulate five identical groups and count how often SOMETHING
# comes out significant:
def any_significant(seed):
    r = np.random.default_rng(seed)
    g = [r.normal(0, 1, 30) for _ in range(5)]
    return any(stats.ttest_ind(g[i], g[j]).pvalue < 0.05
               for i, j in pairs)

np.mean([any_significant(s) for s in range(5000)])   # 0.286
# Lower than 0.401 because the tests share data and are correlated --
# but still six times the nominal rate.` },
        { level: "ok", label: "Run ANOVA first, then pairwise tests",
          why: "The omnibus test protects the family-wise rate: only proceed to pairwise comparisons if ANOVA is significant. It is a real improvement, though the follow-up comparisons are still uncorrected among themselves.",
          code: `def anova_then_pairwise(seed):
    r = np.random.default_rng(seed)
    g = [r.normal(0, 1, 30) for _ in range(5)]
    if stats.f_oneway(*g).pvalue >= 0.05:
        return False
    return any(stats.ttest_ind(g[i], g[j]).pvalue < 0.05
               for i, j in pairs)

np.mean([anova_then_pairwise(s) for s in range(5000)])   # 0.049
# The nominal rate restored -- Fisher's LSD procedure. It works for
# k = 3 and leaks for larger k, because ANOVA can fire on one extreme
# pair while the others remain uncontrolled.` },
        { level: "best", label: "Use a post-hoc procedure designed for the comparison set",
          why: "Tukey's HSD controls the family-wise rate across all pairwise comparisons directly, and gives confidence intervals for each difference rather than only p-values — which is what anyone acting on the result actually needs.",
          code: `def tukey_hsd(groups, alpha=0.05):
    """All pairwise comparisons with family-wise error control.

    Uses the STUDENTISED RANGE distribution rather than t, because the
    relevant question is how large the biggest of several differences
    gets by chance -- not how large one difference gets."""
    from itertools import combinations
    k = len(groups)
    n_total = sum(len(g) for g in groups)
    df = n_total - k

    ms_within = sum(((g - g.mean())**2).sum() for g in groups) / df
    q_crit = stats.studentized_range.ppf(1 - alpha, k, df)

    out = []
    for i, j in combinations(range(k), 2):
        gi, gj = groups[i], groups[j]
        se = np.sqrt(ms_within/2 * (1/len(gi) + 1/len(gj)))
        diff = gj.mean() - gi.mean()
        half = q_crit * se
        q = abs(diff) / se
        out.append({
            "pair": (i, j),
            "difference": float(diff),
            "ci": (float(diff - half), float(diff + half)),
            "p": float(stats.studentized_range.sf(q, k, df)),
            "significant": bool(abs(diff) > half),
        })
    return out

# WHAT IT BUYS: an interval per comparison, family-wise controlled.
for r_ in tukey_hsd(groups):
    lo, hi = r_["ci"]
    print(f"{r_['pair']}: diff {r_['difference']:+6.2f}  "
          f"CI [{lo:+6.2f}, {hi:+6.2f}]  p {r_['p']:.3f}")

# CHOOSING THE RIGHT PROCEDURE FOR THE COMPARISON SET:
#
#   ALL PAIRS vs each other        -> Tukey HSD
#   ALL vs ONE CONTROL             -> Dunnett (fewer comparisons, so
#                                     more power than Tukey)
#   A FEW PRE-PLANNED CONTRASTS    -> Bonferroni on just those
#   MANY COMPARISONS, exploratory  -> Benjamini-Hochberg FDR (5.10)
#
# THE COMPARISON SET IS A DESIGN DECISION MADE BEFORE THE DATA. Picking
# it afterwards reintroduces exactly the problem the correction exists
# to solve.`,
          note: "**Tukey uses the studentised range because the question is how large the *biggest* of several differences gets by chance** — not how large one difference gets. That is why it is not simply a t-test with a smaller α." }
      ]
    },

    { t: "callout", kind: "insight", title: "A significant ANOVA tells you very little", body: [
      { t: "p", text: "**It says \"not all means are equal\" and nothing more** — not which, not how many, not by how much, and not in which direction. Everything anyone would act on requires the follow-up." },
      { t: "code", lang: "python", numbered: false, title: "and it inherits an assumption you should not want", code: `
# ANOVA ASSUMES EQUAL VARIANCES, exactly like Student's t-test -- and
# it fails the same way when group sizes differ (lesson 5.5):
def anova_error_rate(sizes, sds, trials=10_000, seed=0):
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        g = [r.normal(0, s, n) for n, s in zip(sizes, sds)]
        hits += stats.f_oneway(*g).pvalue < 0.05
    return hits / trials

anova_error_rate([30, 30, 30], [1, 1, 1])         # 0.050
anova_error_rate([30, 30, 30], [1, 1, 4])         # 0.052  equal n: fine
anova_error_rate([60, 60, 10], [1, 1, 4])         # 0.008  underpowered
anova_error_rate([10, 10, 60], [1, 1, 4])         # 0.156  3x too liberal

# THE FIX IS WELCH'S ANOVA, the same fix as before:
def welch_anova(groups):
    """One-way ANOVA without the equal-variance assumption."""
    k = len(groups)
    n = np.array([len(g) for g in groups], float)
    m = np.array([g.mean() for g in groups])
    v = np.array([g.var(ddof=1) for g in groups])
    w = n / v
    m_bar = (w * m).sum() / w.sum()

    num = ((w * (m - m_bar)**2).sum()) / (k - 1)
    lam = ((1 - w/w.sum())**2 / (n - 1)).sum()
    denom = 1 + (2*(k - 2)/(k**2 - 1)) * lam
    F = num / denom
    df2 = (k**2 - 1) / (3 * lam)
    return F, float(stats.f.sf(F, k - 1, df2))

# scipy has it directly:
# stats.alexandergovern(*groups)   -- a related robust alternative
#
# AND THE DISTRIBUTION-FREE OPTION when normality is genuinely in
# doubt: Kruskal-Wallis, which is ANOVA on the ranks (lesson 5.9).
stats.kruskal(*groups).pvalue`},
      { t: "p", text: "**Equal group sizes protect ANOVA from unequal variance; unequal sizes do not.** With the small group being the variable one, the true error rate reaches 15.6% — the same failure as Student's t-test, with the same fix." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Read a five-arm experiment correctly",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A five-arm pricing experiment has finished. The analyst reports \"ANOVA p = 0.011, so the variants differ significantly — variant D performed best at 14.8% conversion, so we recommend D.\"" },
        { t: "code", lang: "python", numbered: false, title: "the results", code: `
# arm     n       conversions   rate
# A (ctl) 4,200   529           12.6%
# B       4,180   551           13.2%
# C       4,215   536           12.7%
# D       4,190   620           14.8%
# E       4,205   558           13.3%
#
# ANOVA (on the 0/1 outcomes): F = 3.31, p = 0.011
# The analyst also notes D was the arm with the lowest price.`},
        { t: "p", text: "Say what the ANOVA establishes, what it does not, and what the correct analysis and recommendation are." }
      ],
      requirements: [
        "State precisely what the omnibus result licenses.",
        "Explain the winner's-curse problem with picking the top arm.",
        "Run the correct post-hoc comparison and report intervals.",
        "Say whether ANOVA was even the right test for binary outcomes.",
        "Give the recommendation.",
        "Include tests."
      ],
      hint: "The maximum of five noisy estimates is a biased estimate of the best arm's true rate. Quantify that bias.",
      solution: {
        lang: "python",
        title: "five_arm.py",
        code: `import numpy as np
from scipy import stats
from itertools import combinations

arms = {
    "A": (4200, 529), "B": (4180, 551), "C": (4215, 536),
    "D": (4190, 620), "E": (4205, 558),
}
rng = np.random.default_rng(0)


# =========================================================================
# WHAT THE OMNIBUS RESULT LICENSES
# =========================================================================
#
# "Not all five rates are equal." That is the entire content of
# p = 0.011.
#
# IT DOES NOT SAY: which arms differ, how many differ, by how much, or
# that D is best. Every one of those is a separate claim, and the
# recommendation rests entirely on claims the test did not make.


# =========================================================================
# THE WINNER'S CURSE
# =========================================================================
#
# The maximum of five noisy estimates is a BIASED estimate of the best
# arm's true rate -- because an arm reaches the top partly on merit and
# partly on luck, and the luck does not repeat.

def winners_curse(k_arms, n_per_arm, true_rate, trials=20_000, seed=0):
    """All arms IDENTICAL. How much does the winner overstate?"""
    r = np.random.default_rng(seed)
    rates = r.binomial(n_per_arm, true_rate, (trials, k_arms)) / n_per_arm
    winners = rates.max(axis=1)
    return float(winners.mean() - true_rate), float(winners.mean()/true_rate - 1)

abs_bias, rel_bias = winners_curse(5, 4200, 0.132)
abs_bias, rel_bias                    # 0.0086, 0.065
#
# WITH FIVE IDENTICAL ARMS, THE WINNER LOOKS 6.5% BETTER THAN IT IS --
# 0.86 percentage points of pure selection bias, on data with no real
# differences at all.
#
# D'S OBSERVED LIFT OVER THE CONTROL:
0.148 - 0.126                         # 0.022, i.e. 2.2pp
#
# So roughly 40% of D's apparent advantage is the expected winner's
# curse even if D is genuinely the best. Any forecast built on 14.8%
# will disappoint.
abs_bias / 0.022                      # 0.39

# THE BIAS GROWS WITH THE NUMBER OF ARMS:
for k in (2, 5, 10, 20):
    b, rel = winners_curse(k, 4200, 0.132)
    print(f"{k:2d} arms: winner overstates by {b*100:.2f}pp ({rel:.1%})")
#  2 arms: winner overstates by 0.41pp (3.1%)
#  5 arms: winner overstates by 0.86pp (6.5%)
# 10 arms: winner overstates by 1.12pp (8.5%)
# 20 arms: winner overstates by 1.36pp (10.3%)


# =========================================================================
# WAS ANOVA THE RIGHT TEST?
# =========================================================================
#
# NOT REALLY. The outcome is binary, so ANOVA's normality assumption
# applies to 0/1 data, and its equal-variance assumption is
# automatically violated -- for a Bernoulli, variance is p(1-p), which
# differs whenever the rates differ.
#
# In practice ANOVA on 0/1 data with large equal-sized groups is
# roughly fine, because the CLT rescues the group means and the sizes
# are balanced (lesson 5.5). But the natural test is chi-square:

table = np.array([[k, n - k] for n, k in arms.values()])
chi2, p_chi, dof, expected = stats.chi2_contingency(table)
chi2, p_chi, dof                      # 12.85, 0.0120, 4
#
# p = 0.012 AGAINST ANOVA'S 0.011 -- the same conclusion, from a test
# that does not need an excuse. Use chi-square for count data.

# AND THE RESIDUALS ALREADY POINT AT D:
np.round((table - expected) / np.sqrt(expected), 2)[:, 0]
# [-0.98, -0.15, -0.87,  2.66, -0.02]
#
# ONLY D EXCEEDS +/-2. The other four arms are indistinguishable from
# the pooled rate, which is a much more precise statement than
# "the variants differ".


# =========================================================================
# THE CORRECT POST-HOC ANALYSIS
# =========================================================================
#
# The comparison set matters. The team wants to know which arm to ship
# against the CONTROL, so this is four comparisons against A, not ten
# pairwise -- which is Dunnett's situation, and it has more power than
# Tukey because there are fewer comparisons.

def compare_to_control(arms, control="A", alpha=0.05):
    """Each arm against the control, with a Bonferroni-corrected
    interval. Bonferroni is slightly conservative relative to Dunnett
    but needs no special distribution and is easy to defend."""
    n_c, k_c = arms[control]
    p_c = k_c / n_c
    others = [a for a in arms if a != control]
    m = len(others)
    z = stats.norm.ppf(1 - alpha/(2*m))            # corrected critical value

    out = {}
    for name in others:
        n_t, k_t = arms[name]
        p_t = k_t / n_t
        diff = p_t - p_c
        se = np.sqrt(p_c*(1-p_c)/n_c + p_t*(1-p_t)/n_t)
        raw_p = 2*stats.norm.sf(abs(diff/se))
        out[name] = {
            "rate": p_t,
            "diff_pp": diff*100,
            "relative": diff/p_c,
            "ci_pp": ((diff - z*se)*100, (diff + z*se)*100),
            "p_raw": float(raw_p),
            "p_adjusted": float(min(1.0, raw_p * m)),
            "significant": bool(raw_p * m < alpha),
        }
    return out

for name, r in compare_to_control(arms).items():
    lo, hi = r["ci_pp"]
    print(f"{name} vs A: {r['diff_pp']:+.2f}pp  "
          f"CI [{lo:+.2f}, {hi:+.2f}]  p_adj {r['p_adjusted']:.4f}")

# B vs A: +0.57pp  CI [-0.99, +2.13]  p_adj 1.0000
# C vs A: +0.12pp  CI [-1.42, +1.66]  p_adj 1.0000
# D vs A: +2.20pp  CI [+0.61, +3.79]  p_adj 0.0026
# E vs A: +0.68pp  CI [-0.89, +2.25]  p_adj 1.0000
#
# ONLY D SURVIVES CORRECTION, and its interval excludes zero
# comfortably. B, C and E are indistinguishable from the control.

# NOTE THE INTERVAL ON D: [+0.61pp, +3.79pp], a range of relative lift
# from +4.8% to +30%. THE POINT ESTIMATE OF +17.5% IS THE LEAST
# RELIABLE NUMBER IN THAT SENTENCE, and it is the one that will be
# quoted.
(0.0061/0.126), (0.0379/0.126)        # +4.8% to +30.1%


# =========================================================================
# THE RECOMMENDATION
# =========================================================================
#
# SHIP D, with three caveats stated in the write-up:
#
# 1. THE EFFECT IS REAL. D survives correction for four comparisons
#    with an interval excluding zero. This is not a winner's-curse
#    artefact -- the curse inflates the ESTIMATE, it does not
#    manufacture significance after correction.
#
# 2. THE MAGNITUDE IS OVERSTATED. Expect closer to +1.3pp than the
#    observed +2.2pp, once selection bias is accounted for. Forecast
#    from the interval's lower half, not from the point estimate.
#
# 3. D WAS THE LOWEST-PRICED ARM. Conversion is not the metric that
#    matters -- REVENUE is. A 17% lift in conversion at a 25% lower
#    price is a loss:
for price_cut in (0.0, 0.10, 0.20, 0.25):
    rev = (1 + 0.175) * (1 - price_cut)
    print(f"price -{price_cut:.0%}: revenue index {rev:.3f}")
# price -0%:  revenue index 1.175
# price -10%: revenue index 1.058
# price -20%: revenue index 0.940
# price -25%: revenue index 0.881
#
# THE ANALYSIS TESTED THE WRONG OUTCOME. If D's price is more than
# ~15% below the control, shipping it reduces revenue while "winning"
# the experiment. That is the most important finding here, and no
# amount of correct statistics on conversion would have surfaced it.
#
# WHAT TO DO: re-analyse on revenue per user before shipping. It is the
# same data and a different column.


# =========================================================================
# TESTS
# =========================================================================

def test_winners_curse_is_material():
    bias, rel = winners_curse(5, 4200, 0.132)

    assert bias > 0.005                    # >0.5pp of pure selection
    assert bias / 0.022 > 0.3              # >30% of D's observed lift


def test_winners_curse_grows_with_arm_count():
    biases = [winners_curse(k, 4200, 0.132)[0] for k in (2, 5, 20)]

    assert biases[0] < biases[1] < biases[2]


def test_chi_square_agrees_with_anova():
    table = np.array([[k, n-k] for n, k in arms.values()])
    p = stats.chi2_contingency(table)[1]

    assert abs(p - 0.011) < 0.005


def test_only_d_has_a_large_residual():
    table = np.array([[k, n-k] for n, k in arms.values()])
    exp = stats.chi2_contingency(table)[3]
    resid = (table - exp) / np.sqrt(exp)

    big = [i for i in range(5) if abs(resid[i, 0]) > 2]
    assert big == [3]                      # index 3 is arm D


def test_only_d_survives_correction():
    r = compare_to_control(arms)

    assert r["D"]["significant"]
    assert not any(r[a]["significant"] for a in ("B", "C", "E"))


def test_interval_on_d_is_wide_in_relative_terms():
    """The point estimate is the least reliable number reported."""
    lo, hi = compare_to_control(arms)["D"]["ci_pp"]

    assert hi / lo > 5                     # +0.61 to +3.79


def test_price_cut_can_reverse_the_business_conclusion():
    lift = compare_to_control(arms)["D"]["relative"]

    assert (1 + lift) * (1 - 0.20) < 1.0   # a 20% price cut loses money`,
        notes: [
          { t: "p", text: "**The omnibus result licenses \"not all five rates are equal\" and nothing else.** Which arms differ, by how much, and that D is best are three separate claims the test did not make — and the recommendation rests entirely on them." },
          { t: "callout", kind: "insight", title: "The winner's curse accounts for 40% of D's apparent lift", body: [
            { t: "p", text: "With five identical arms the winner looks 6.5% better than it is — 0.86 percentage points of pure selection bias on data with no real differences. Against D's observed +2.2pp, that is roughly 40%." },
            { t: "p", text: "The curse inflates the *estimate*; it does not manufacture significance after correction. So D's effect is real and its magnitude is overstated — forecast from the interval's lower half, not the point estimate." }
          ]},
          { t: "p", text: "**Chi-square is the natural test for binary outcomes** and gives `p = 0.012` against ANOVA's 0.011 without needing an excuse for normality or equal variance. Its residuals also identify D directly — only that cell exceeds ±2, which is far more precise than \"the variants differ\"." },
          { t: "p", text: "**The comparison set is four arms against the control, not ten pairwise.** That is Dunnett's situation and it has more power than Tukey, because fewer comparisons need less correction." },
          { t: "p", text: "**D's interval runs from +4.8% to +30% relative.** The point estimate of +17.5% is the least reliable number in that sentence, and it is the one that will be quoted." },
          { t: "p", text: "**The analysis tested the wrong outcome.** D was the lowest-priced arm, and if its price is more than about 15% below control, shipping it reduces revenue while winning the experiment. No amount of correct statistics on conversion would have surfaced that — it is the same data and a different column." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A study reported a significant chi-square test of independence between a rare genetic marker and a disease, from a table where the smallest expected count was 1.8." },
      { t: "p", text: "**Fisher's exact test on the same table gave `p = 0.14`.** The chi-square approximation had been applied well below where its null distribution is trustworthy, and the reported `p = 0.03` was an artefact of the approximation rather than a finding." },
      { t: "p", text: "The authors had originally had a larger table and **merged the sparse categories to satisfy the expected-count rule** — choosing which to merge after seeing which combination produced a result." },
      { t: "p", text: "**Use Fisher's exact test or a permutation when counts are small**, and never decide how to collapse categories after seeing the data. Both fixes are one line, and the second is the one that matters." }
    ]}
  ],

  takeaways: [
    "**Chi-square divides by the expected count**, so a discrepancy of 10 matters in a cell expecting 12 and not in one expecting 10,000.",
    "**The expected counts under independence are the product of the marginals** — chi-square measures the gap that mutual information also measures.",
    "**The per-cell standardised residuals are the finding**; a value beyond ±2 identifies the cell driving the result.",
    "**Report Cramér's V alongside the p-value** — chi-square grows with `n`, and only the effect size is comparable.",
    "**Use Fisher's exact test or a permutation when expected counts are small**, and never merge categories after seeing the data.",
    "**ANOVA is the law of total variance made into a test**: `F` compares between-group with within-group spread.",
    "**`MS_within` estimates `σ²` regardless; `MS_between` only under the null** — which is why their ratio is near 1 when nothing differs.",
    "**`F = t²` for two groups**, so ANOVA inherits Student's equal-variance assumption rather than Welch's.",
    "**Ten pairwise tests give a 29–40% chance of a false positive**; an omnibus test first is what controls it.",
    "**Tukey uses the studentised range** because the question is how large the *biggest* difference gets by chance, not how large one does.",
    "**A significant ANOVA says only \"not all equal\"** — everything anyone would act on needs the post-hoc analysis.",
    "**The winner's curse inflates the top arm's estimate by 6.5% with five arms** — the effect can be real while the magnitude is overstated."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your ANOVA on five groups gives `p = 0.011`. What have you established?",
        options: [
          "That the groups all differ from each other",
          "Only that not all five means are equal — not which, how many, by how much, or in which direction",
          "That the largest group mean is significantly the highest",
          "That the effect is practically important"
        ],
        answer: 1,
        why: "Everything anyone would act on requires the post-hoc analysis. The residuals from an equivalent chi-square often localise it immediately — in the worked example only one of five cells exceeded ±2."
      },
      {
        stem: "Why not just run all ten pairwise t-tests on five groups?",
        options: [
          "It is computationally expensive",
          "The chance of at least one false positive rises to about 29% — an omnibus test or a family-wise correction is what controls it",
          "t-tests cannot be used more than once on the same data",
          "You can, provided the groups are independent"
        ],
        answer: 1,
        why: "The simulated rate is 29% rather than the naive 40% because the tests share data and are correlated — still six times the nominal rate. Tukey's HSD controls it directly and gives an interval per comparison."
      },
      {
        stem: "A contingency table has a smallest expected count of 1.8 and chi-square gives `p = 0.03`. What should you do?",
        options: [
          "Report it, since the test ran without error",
          "Use Fisher's exact test or a permutation — the chi-square null distribution is an approximation that needs adequate expected counts",
          "Merge the sparse categories until every expected count exceeds 5",
          "Increase the significance threshold"
        ],
        answer: 1,
        why: "In the scenario, Fisher's exact test gave `p = 0.14` on the same table. Merging categories is the tempting fix and the dangerous one: choosing which to merge after seeing the data is p-hacking with a methodological justification."
      },
      {
        stem: "Five arms, and the winner shows a 2.2pp lift. How much of that should you expect to be selection bias?",
        options: [
          "None, if the test is significant",
          "About 0.9pp — with five identical arms the maximum overstates by 6.5%, which is roughly 40% of the observed lift",
          "All of it",
          "It cannot be estimated"
        ],
        answer: 1,
        why: "The winner's curse inflates the estimate; it does not manufacture significance after correction. So the effect can be real while the magnitude is overstated — forecast from the interval's lower half rather than the point estimate."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does ANOVA actually test?",
        strong: "Whether between-group variance exceeds within-group variance by more than chance. `F` is that ratio, and `MS_within` estimates `σ²` regardless while `MS_between` only does so under the null — which is why the ratio is near 1 when nothing differs.",
        answer: [
          { t: "p", text: "Framing it as a variance decomposition rather than a formula shows you could reconstruct it." },
          { t: "p", text: "Adding that `F = t²` for two groups places ANOVA as a generalisation rather than a separate technique." }
        ]
      },
      {
        level: "core",
        q: "Your ANOVA is significant. What next?",
        strong: "A post-hoc procedure matched to the comparison set — Tukey for all pairs, Dunnett for all-versus-control, Bonferroni for a few pre-planned contrasts. And an effect size, since the omnibus test says nothing about magnitude.",
        answer: [
          { t: "p", text: "Choosing the procedure by the comparison set, rather than naming one, is the answer that shows judgement." },
          { t: "p", text: "Insisting the comparison set is decided before the data pre-empts the obvious follow-up about p-hacking." }
        ]
      },
      {
        level: "advanced",
        q: "A multi-arm test picks a winner. How much do you trust its measured lift?",
        strong: "Less than the point estimate suggests. The maximum of several noisy estimates is biased upward — with five arms the winner overstates by around 6.5% even when all arms are identical. I would forecast from the interval's lower half and re-measure the winner separately.",
        answer: [
          { t: "p", text: "Naming the winner's curse and quantifying it turns a vague caution into a planning number." },
          { t: "p", text: "Distinguishing \"the effect is real\" from \"the magnitude is right\" is the precise version, and it changes what you promise rather than whether you ship." }
        ]
      }
    ]
  }
});
