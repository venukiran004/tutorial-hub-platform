/* ============================================================================
   LESSON 6.2 — Bivariate and Multivariate Analysis
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "**Pearson correlation measures one thing — linear association between two numeric columns — and it is quoted as though it measured everything.** A pair of categorical columns, a monotonic-but-curved relationship, and a dependency that only appears when three variables are considered together each need a different tool, and the wrong one returns a confident number about nothing.",

  objectives: [
    "Choose between Pearson, Spearman and Kendall for a pair of numeric columns",
    "Measure association between categorical columns with Cramér's V and mutual information",
    "Relate a feature to a target correctly for each combination of types",
    "Detect multicollinearity with VIF and understand why pairwise correlation misses it",
    "Recognise the structures — Simpson's paradox, non-linearity, heteroscedasticity — that a correlation coefficient cannot see"
  ],

  prerequisites: ["6.1", "2.3"],

  blocks: [

    { t: "h2", n: "01", text: "Three correlations for numeric pairs", id: "correlation" },

    { t: "p", text: "`df.corr()` returns Pearson by default. **Pearson measures how well a straight line fits; it is zero for a perfect U-shape, and it is dragged wherever the extreme values point.** Spearman and Kendall measure monotonic association on ranks, which is usually closer to the question being asked." },

    { t: "dl", items: [
      ["Pearson r", "Linear correlation: covariance divided by the product of standard deviations. −1 to 1. Sensitive to outliers; blind to non-linear relationships."],
      ["Spearman ρ", "Pearson correlation of the **ranks**. Measures monotonic association — does y go up when x goes up, regardless of shape. Robust to outliers and to any monotonic transform."],
      ["Kendall τ", "Fraction of concordant pairs minus discordant pairs. Also rank-based; smaller values than Spearman for the same data, more interpretable as a probability, better for small samples with ties."],
      ["Anscombe's quartet", "Four datasets with identical means, variances and Pearson r of 0.82 — and completely different shapes. The reason to plot before quoting."],
      ["Heteroscedasticity", "Spread that changes with the level — residuals that fan out. A correlation coefficient averages over it and hides it."],
      ["Simpson's paradox", "A trend that reverses when the data is split by a third variable. Aggregate correlation and within-group correlation can have opposite signs."]
    ]},

    { t: "viz",
      title: "Four relationships, one Pearson r",
      caption: "Each panel has r ≈ 0.82. Only the first is what the number suggests. The second is a curve, the third is a line plus one outlier, the fourth is a single point doing all the work. Spearman separates some of these; a plot separates all of them.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Four scatter panels with identical Pearson correlation showing a linear cloud, a curve, a line with an outlier, and a vertical cluster with one leverage point">
  <g transform="translate(30,30)">
    <rect x="0" y="0" width="180" height="170" rx="4" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <text x="0" y="-8" class="s-sub" style="fill:var(--good)">linear — r 0.82</text>
    <g style="fill:var(--good)">
      <circle cx="20" cy="140" r="4"/><circle cx="40" cy="120" r="4"/><circle cx="55" cy="130" r="4"/><circle cx="70" cy="100" r="4"/>
      <circle cx="85" cy="105" r="4"/><circle cx="100" cy="80" r="4"/><circle cx="115" cy="90" r="4"/><circle cx="130" cy="60" r="4"/>
      <circle cx="145" cy="70" r="4"/><circle cx="160" cy="40" r="4"/><circle cx="60" cy="110" r="4"/>
    </g>
  </g>
  <g transform="translate(240,30)">
    <rect x="0" y="0" width="180" height="170" rx="4" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <text x="0" y="-8" class="s-sub" style="fill:var(--warn)">curved — r 0.82</text>
    <g style="fill:var(--warn)">
      <circle cx="15" cy="150" r="4"/><circle cx="35" cy="105" r="4"/><circle cx="55" cy="72" r="4"/><circle cx="75" cy="50" r="4"/>
      <circle cx="95" cy="40" r="4"/><circle cx="115" cy="42" r="4"/><circle cx="135" cy="55" r="4"/><circle cx="155" cy="80" r="4"/>
      <circle cx="170" cy="110" r="4"/>
    </g>
  </g>
  <g transform="translate(450,30)">
    <rect x="0" y="0" width="180" height="170" rx="4" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <text x="0" y="-8" class="s-sub" style="fill:var(--warn)">one outlier — r 0.82</text>
    <g style="fill:var(--warn)">
      <circle cx="20" cy="150" r="4"/><circle cx="40" cy="138" r="4"/><circle cx="60" cy="126" r="4"/><circle cx="80" cy="114" r="4"/>
      <circle cx="100" cy="102" r="4"/><circle cx="120" cy="90" r="4"/><circle cx="140" cy="78" r="4"/><circle cx="160" cy="66" r="4"/>
    </g>
    <circle cx="105" cy="30" r="6" style="fill:var(--crit)"/>
  </g>
  <g transform="translate(660,30)">
    <rect x="0" y="0" width="180" height="170" rx="4" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <text x="0" y="-8" class="s-sub" style="fill:var(--crit)">leverage point — r 0.82</text>
    <g style="fill:var(--crit)">
      <circle cx="40" cy="60" r="4"/><circle cx="40" cy="80" r="4"/><circle cx="40" cy="95" r="4"/><circle cx="40" cy="110" r="4"/>
      <circle cx="40" cy="125" r="4"/><circle cx="40" cy="140" r="4"/><circle cx="40" cy="150" r="4"/><circle cx="40" cy="70" r="4"/>
    </g>
    <circle cx="165" cy="25" r="6" style="fill:var(--crit)"/>
  </g>
  <text x="30" y="240" class="s-sub" style="fill:var(--ink-3)">Spearman: ~0.82, ~0.4, ~0.9, ~0.5 — it separates the curve and the leverage point, not the outlier. Nothing but the plot separates all four.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the three coefficients, and what each one misses", code: `
import pandas as pd
import numpy as np

rng = np.random.default_rng(0)
n = 500
x = rng.uniform(0, 10, n)

# A CLEAN LINEAR RELATIONSHIP -- all three agree:
y_lin = 2 * x + rng.normal(0, 2, n)
pd.Series(x).corr(pd.Series(y_lin))                     # 0.95  Pearson
pd.Series(x).corr(pd.Series(y_lin), method="spearman")  # 0.95
pd.Series(x).corr(pd.Series(y_lin), method="kendall")   # 0.81  (always smaller)

# A MONOTONIC BUT CURVED RELATIONSHIP -- Pearson understates:
y_exp = np.exp(x / 2) + rng.normal(0, 5, n)
pd.Series(x).corr(pd.Series(y_exp))                     # 0.78  -- "moderate"
pd.Series(x).corr(pd.Series(y_exp), method="spearman")  # 0.98  -- nearly perfect
#
# y is a perfect function of x. Pearson says 0.78 because the
# function is not a line. Spearman says 0.98 because y rises
# whenever x does. "How strongly are these related" is usually the
# Spearman question.

# A NON-MONOTONIC RELATIONSHIP -- both miss it:
y_u = (x - 5) ** 2 + rng.normal(0, 2, n)
pd.Series(x).corr(pd.Series(y_u))                       # ~0.0
pd.Series(x).corr(pd.Series(y_u), method="spearman")    # ~0.0
#
# A perfect U. Both coefficients say "no relationship". Mutual
# information (next section) says otherwise. The plot says so first.

# ONE OUTLIER -- Pearson moves, Spearman does not:
y_out = 0.1 * x + rng.normal(0, 1, n)
pd.Series(x).corr(pd.Series(y_out))                     # 0.28
y_out[0], x_out = 200.0, x.copy(); x_out[0] = 100.0
pd.Series(x_out).corr(pd.Series(y_out))                 # 0.93  -- one point
pd.Series(x_out).corr(pd.Series(y_out), method="spearman")   # 0.29
#
# One row moved Pearson from 0.28 to 0.93. Spearman's ranks barely
# noticed. On real data with a few extreme values -- which is all
# real data -- Pearson on raw values is a coefficient about the
# extremes.

# THE CORRELATION MATRIX, and reading it:
df = pd.DataFrame({"x": x, "y_lin": y_lin, "y_exp": y_exp, "y_u": y_u})
df.corr()                              # Pearson, every pair
df.corr(method="spearman")
#
# ON A WIDE FRAME the matrix is unreadable. Extract the pairs:
def top_pairs(corr, k=10, min_abs=0.0):
    c = corr.where(np.triu(np.ones(corr.shape, dtype=bool), k=1))   # upper triangle
    pairs = c.stack().rename("r").reset_index()
    pairs.columns = ["a", "b", "r"]
    pairs["abs_r"] = pairs["r"].abs()
    return pairs[pairs["abs_r"] >= min_abs].nlargest(k, "abs_r")

top_pairs(df.corr(method="spearman"))

# WHEN PEARSON IS THE RIGHT CHOICE: when the question IS linear --
# a linear model's assumptions, an R-squared, a beta. Otherwise
# Spearman, and Kendall when n is small or ties are heavy.

# ALWAYS WITH n. A correlation of 0.6 on 20 rows and on 20,000 rows
# are different claims:
from scipy import stats
stats.spearmanr(x[:20], y_lin[:20])    # SignificanceResult(statistic=0.9, pvalue=1e-7)
stats.spearmanr(x, y_lin)              # statistic=0.95, pvalue=0.0
#
# The p-value is the answer to "could this arise by chance at this n".
# Quote the coefficient, the n, and a confidence interval where it
# matters. A coefficient alone is a number without a denominator.
`,
      hl: [15, 26, 34, 62],
      caption: "**One row moved Pearson from 0.28 to 0.93; Spearman went from 0.29 to 0.29.** On real data — which always has extreme values — Pearson on raw values is a coefficient about the extremes."
    },

    { t: "callout", kind: "trap", title: "r = 0 does not mean unrelated", body: [
      { t: "p", text: "A perfect U-shaped relationship has Pearson r of zero and Spearman ρ of zero. Both coefficients measure monotonic association, and a U is not monotonic. **\"Uncorrelated\" and \"independent\" are different claims, and only the second means there is nothing to find.**" },
      { t: "p", text: "Mutual information detects any dependency, including a U. A scatter plot detects it faster. A feature dropped because its correlation with the target was zero may have been the most informative one in the set." },
      { t: "p", text: "Filter-method feature selection on correlation (see 8.1) makes exactly this mistake at scale." }
    ]},

    { t: "code", lang: "python", title: "corrwith: every feature against one target, in one call",
      code: `rng = np.random.default_rng(2)
n = 2_000
feat = pd.DataFrame(rng.normal(size=(n, 5)), columns=list("abcde"))
target = 1.5 * feat.a - feat.b ** 2 + rng.normal(0, 1, n)         # linear in a, U-shaped in b

print(feat.corrwith(target).round(2).to_dict())                     # {'a': 0.65, 'b': -0.02, 'c': 0.01, ...}
print(feat.corrwith(target, method="spearman").round(2).to_dict())  # b still ~0: Spearman is monotonic only
# corrwith aligns on the index, drops pairs with a missing value per column, and is the first table of a
# bivariate pass -- and the single-feature scan of 8.3 in another form. b scores like noise under both
# measures and is the second-strongest feature: the mutual-information check above is what finds it.`,
      caption: "`corr()` builds the whole matrix; `corrwith(target)` builds the one column you read first. The U-shaped feature scoring zero under both measures is the reason the pass does not stop at this table."
    },

    { t: "h2", n: "02", text: "Association for categorical columns", id: "categorical" },

    { t: "p", text: "**Correlation is undefined for two categorical columns — there is no order to correlate.** The tools are the contingency table, a chi-square test on it, Cramér's V for a normalised strength, and mutual information for the general case that covers every type combination." },

    { t: "code", lang: "python", title: "crosstab, chi-square, Cramér's V and mutual information", code: `
from scipy import stats
from sklearn.metrics import mutual_info_score
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression

region = rng.choice(["north", "south", "east", "west"], n)
# tier depends on region: north is mostly gold
tier = np.where(region == "north",
                rng.choice(["gold", "silver"], n, p=[.8, .2]),
                rng.choice(["gold", "silver"], n, p=[.3, .7]))
cat = pd.DataFrame({"region": region, "tier": tier})

# THE CONTINGENCY TABLE -- the object everything else is computed from:
ct = pd.crosstab(cat["region"], cat["tier"])
ct
# tier    gold  silver
# region
# east      38      92
# north    102      21
# south     35      88
# west      40      84

pd.crosstab(cat["region"], cat["tier"], normalize="index")
#           gold  silver
# north    0.83    0.17       <- the row proportions show the dependency
# east     0.29    0.71

# CHI-SQUARE: "is the table's pattern distinguishable from independence"
chi2, p, dof, expected = stats.chi2_contingency(ct)
chi2, p                     # 130.4, 1e-27 -- yes, overwhelmingly
#
# expected is what the table WOULD look like under independence. The
# test compares observed to expected. p tells you the pattern is
# real; it does not tell you how strong it is -- chi2 grows with n.

# CRAMÉR'S V: chi-square normalised to 0..1, comparable across tables
def cramers_v(x, y):
    ct = pd.crosstab(x, y)
    chi2 = stats.chi2_contingency(ct, correction=False)[0]
    n = ct.to_numpy().sum()
    r, k = ct.shape
    return float(np.sqrt(chi2 / (n * (min(r, k) - 1))))

cramers_v(cat["region"], cat["tier"])         # 0.51 -- a strong association
#
#   0.0        independent
#   0.1        weak
#   0.3        moderate
#   0.5+       strong
#
# V is symmetric, and it does not depend on n the way chi2 does. It
# is the categorical analogue of |r|. (The bias-corrected version
# matters on small tables with many categories; for most data the
# plain form is fine.)

# MUTUAL INFORMATION: how much knowing x reduces uncertainty about y.
# Works for ANY pair -- categorical, numeric, or mixed -- and detects
# ANY dependency, including the U-shape correlation missed.
mutual_info_score(cat["region"], cat["tier"])     # 0.16 nats
#
# THE UNITS ARE NOT INTUITIVE. Normalise to 0..1:
from sklearn.metrics import normalized_mutual_info_score
normalized_mutual_info_score(cat["region"], cat["tier"])   # 0.15

# MI FOR NUMERIC x AGAINST A TARGET -- the U-shape, found:
mi = mutual_info_regression(np.column_stack([x, y_lin]), y_u, random_state=0)
mi
# [0.62, 0.05]   <- x carries a lot of information about y_u;
#                   y_lin (which is just x plus noise) too, but
#                   estimated lower. And Pearson said 0.0 for both.
#
# mutual_info_regression / mutual_info_classif estimate MI for a
# numeric feature by a k-nearest-neighbour method. They are noisier
# than a correlation coefficient and slower; they are the right tool
# when the shape is unknown.

# THE TYPE-PAIR MAP -- which measure for which combination:
#
#   numeric   x numeric      Pearson (linear), Spearman (monotonic),
#                            MI (any shape)
#   category  x category     crosstab + chi2 (is it real), Cramér's V
#                            (how strong), MI
#   category  x numeric      groupby(cat)[num].describe(); ANOVA or
#                            Kruskal-Wallis (are the group means /
#                            distributions different); MI
#   numeric   x binary       point-biserial (== Pearson with 0/1);
#                            or the numeric's distribution per class
#   any       x any          MI, with the caveat that it is an estimate

# CATEGORY AGAINST NUMERIC -- the groupby is the analysis:
amount = np.where(region == "north", rng.normal(150, 30, n), rng.normal(100, 30, n))
pd.DataFrame({"region": region, "amount": amount}).groupby("region")["amount"].describe()
#
# The means differ; the question is whether by more than chance:
groups = [amount[region == r] for r in np.unique(region)]
stats.f_oneway(*groups)             # ANOVA: assumes normal, equal variance
stats.kruskal(*groups)              # rank-based: assumes neither
#
# Kruskal-Wallis is the Spearman of group comparisons -- the one to
# reach for unless the normality assumption is checked.
`,
      hl: [12, 30, 44, 78],
      caption: "**Chi-square says the pattern is real; Cramér's V says how strong it is.** Chi-square grows with n, so a p-value of 10⁻²⁷ on a million rows can describe an association too weak to matter — V is the number to quote."
    },

    { t: "h2", n: "03", text: "More than two at once", id: "multivariate" },

    { t: "p", text: "**A correlation matrix is every pair, one pair at a time. Some structure only exists across three or more columns**: a feature that is nearly a linear combination of two others, a trend that reverses inside every group, a relationship that is only there when a third variable is held fixed." },

    { t: "code", lang: "python", title: "VIF, Simpson's paradox and partial correlation", code: `
# MULTICOLLINEARITY: a feature predictable from the OTHERS. Pairwise
# correlation can miss it entirely.
a = rng.normal(size=n)
b = rng.normal(size=n)
c = a + b + rng.normal(0, 0.05, n)          # c is a + b, almost exactly
X = pd.DataFrame({"a": a, "b": b, "c": c})

X.corr().round(2)
#       a     b     c
# a  1.00 -0.02  0.71
# b -0.02  1.00  0.70
# c  0.71  0.70  1.00
#
# Nothing above 0.71. A "drop features correlated above 0.9" rule
# keeps all three. But c IS a + b: any model with all three has an
# unidentifiable coefficient (see 2.3).

# VARIANCE INFLATION FACTOR: for each feature, regress it on ALL the
# others; VIF = 1 / (1 - R^2). It sees what pairwise cannot.
def vif(X):
    X = X.astype(float)
    Z = (X - X.mean()) / X.std(ddof=1)
    C = Z.T @ Z / (len(Z) - 1)
    return pd.Series(np.diag(np.linalg.pinv(C)), index=X.columns).round(2)

vif(X)
# a    ~200
# b    ~200
# c    ~400
#
#   VIF 1       independent of the others
#   VIF 5       R^2 = 0.8 against the others: worth noting
#   VIF 10      R^2 = 0.9: coefficients unreliable
#   VIF 100+    a near-exact linear combination
#
# Every feature here is far above 10 because each is predictable from
# the other two. The pairwise matrix said 0.71 at most.
# (statsmodels.stats.outliers_influence.variance_inflation_factor
# gives the same numbers, one column at a time.)

# SIMPSON'S PARADOX: the aggregate trend reverses within every group.
# Two departments; in EACH, more experience -> higher pay. But dept B
# pays less overall AND its staff are more experienced.
dept = rng.choice(["A", "B"], n)
exp_ = np.where(dept == "A", rng.uniform(0, 5, n), rng.uniform(5, 10, n))
pay = np.where(dept == "A", 60 + 3 * exp_, 30 + 3 * exp_) + rng.normal(0, 2, n)
s = pd.DataFrame({"dept": dept, "exp": exp_, "pay": pay})

s[["exp", "pay"]].corr().iloc[0, 1]                          # -0.44  overall: NEGATIVE
s.groupby("dept")[["exp", "pay"]].corr().iloc[0::2, 1]       # A: +0.93, B: +0.93
#
# "Experience is negatively correlated with pay" is true of the
# table and false of every person in it. The third variable -- dept
# -- reverses the sign. The pairwise correlation is not wrong; it is
# answering a question nobody asked.
#
# THE DEFENCE: for any pairwise result that will be acted on, compute
# it within the obvious groups. If the sign flips, the aggregate
# number is not the finding.

# PARTIAL CORRELATION: the association between x and y AFTER removing
# what both share with z.
def partial_corr(df, x, y, z):
    """Correlation of the residuals of x~z and y~z."""
    def resid(col):
        Z = np.column_stack([np.ones(len(df)), df[z]])
        beta, *_ = np.linalg.lstsq(Z, df[col], rcond=None)
        return df[col] - Z @ beta
    return float(np.corrcoef(resid(x), resid(y))[0, 1])

# ice cream sales and drowning deaths correlate -- through temperature
temp = rng.uniform(10, 35, n)
ice = 20 * temp + rng.normal(0, 40, n)
drown = 0.5 * temp + rng.normal(0, 3, n)
w = pd.DataFrame({"temp": temp, "ice": ice, "drown": drown})

w[["ice", "drown"]].corr().iloc[0, 1]            # 0.55  -- "ice cream causes drowning"
partial_corr(w, "ice", "drown", "temp")          # ~0.0  -- not once temp is held fixed
#
# Partial correlation is the one-variable-at-a-time version of "put
# them all in a regression and look at the coefficients". It answers
# "is there anything between x and y that is not explained by z".

# PAIR PLOT LOGIC WITHOUT THE PLOT -- for a wide numeric frame, the
# pairs worth looking at are the ones where Pearson and Spearman
# DISAGREE (non-linear or outlier-driven) or where MI is high and
# both are low (non-monotonic):
def interesting_pairs(df, k=10):
    p = df.corr(method="pearson")
    s = df.corr(method="spearman")
    cols = df.columns
    rows = []
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            rows.append({"a": cols[i], "b": cols[j],
                         "pearson": p.iloc[i, j], "spearman": s.iloc[i, j],
                         "gap": abs(p.iloc[i, j] - s.iloc[i, j])})
    return pd.DataFrame(rows).nlargest(k, "gap")
#
# A large gap means the shape is not a line. Those are the pairs to
# plot, and the features that need a transform before a linear model.
`,
      hl: [9, 20, 46, 70],
      caption: "**A \"drop features correlated above 0.9\" rule keeps all three of a, b and a+b.** Pairwise correlation tops out at 0.71; VIF is over 200 for each. Multicollinearity is a property of the set, not of any pair."
    },

    { t: "table",
      head: ["You have", "Ask", "Use", "Not"],
      rows: [
        ["Two numeric columns", "Does y rise with x?", "Spearman ρ", "Pearson, unless the question is specifically linear"],
        ["Two numeric columns", "Is there *any* dependency?", "Mutual information, and a scatter plot", "Any correlation coefficient — all are zero for a U"],
        ["Two categorical columns", "Are they associated, and how strongly?", "Crosstab → chi-square (real?) → Cramér's V (how strong)", "Correlation of label-encoded integers, which is meaningless"],
        ["Category and numeric", "Do the groups differ?", "`groupby().describe()`, Kruskal-Wallis", "A t-test on more than two groups"],
        ["A feature set", "Is any feature redundant given the others?", "VIF", "Pairwise correlation thresholds"],
        ["A pairwise result you will act on", "Does it hold within groups?", "Recompute per group; look for a sign flip", "Trusting the aggregate"],
        ["x and y both related to z", "Is there a direct x–y link?", "Partial correlation, or a regression with z included", "The raw x–y correlation"]
      ],
      caption: "**Correlation of label-encoded categories is meaningless** — `north=0, south=1, east=2` imposes an order that does not exist, and the coefficient measures the encoding."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "An association report for a mixed-type feature set",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A modelling team has a frame of 40 features — numeric, categorical and binary — and a binary target. They want, before any modelling, to know which features relate to the target, which relate to each other, and which are redundant. Their current approach is `df.corr()` with the categoricals label-encoded." },
        { t: "p", text: "Build the report that answers those three questions correctly for every type combination, and demonstrate on a generated frame with planted structure that it finds what `df.corr()` misses." }
      ],
      requirements: [
        "Feature-to-target strength using the correct measure for each feature type.",
        "Feature-to-feature association for every pair, including categorical pairs.",
        "Redundancy via VIF on the numeric block.",
        "A non-monotonic feature that correlation misses and MI finds.",
        "A Simpson's-paradox check: target association within the largest categorical's groups.",
        "Tests on the planted structure."
      ],
      hint: "Plant four things: a linear feature, a U-shaped feature, a categorical that predicts the target, and a numeric that is the sum of two others. Then check that each is found by the right measure and missed by the wrong one.",
      solution: {
        lang: "python",
        title: "association_report.py",
        code: `import pandas as pd
import numpy as np
from scipy import stats
from sklearn.feature_selection import mutual_info_classif


# =========================================================================
# MEASURES
# =========================================================================

def cramers_v(x, y):
    ct = pd.crosstab(x, y)
    if ct.shape[0] < 2 or ct.shape[1] < 2:
        return 0.0
    chi2 = stats.chi2_contingency(ct, correction=False)[0]
    n = ct.to_numpy().sum()
    return float(np.sqrt(chi2 / (n * (min(ct.shape) - 1))))


def vif(X):
    X = X.astype(float)
    sd = X.std(ddof=1).replace(0, 1)
    Z = (X - X.mean()) / sd
    C = Z.T @ Z / max(len(Z) - 1, 1)
    return pd.Series(np.diag(np.linalg.pinv(C)), index=X.columns)


def _roles(df, target):
    roles = {}
    for c in df.columns:
        if c == target:
            continue
        s = df[c]
        if s.dtype == bool or (s.dropna().nunique() == 2 and set(s.dropna().unique()) <= {0, 1}):
            roles[c] = "binary"
        elif s.dtype.kind in "biufc":
            roles[c] = "numeric"
        else:
            roles[c] = "categorical"
    return roles


# =========================================================================
# THE REPORT
# =========================================================================

def association_report(df, target, *, random_state=0):
    """Three tables: feature->target, feature<->feature, redundancy."""
    roles = _roles(df, target)
    y = df[target]
    numeric = [c for c, r in roles.items() if r == "numeric"]
    categorical = [c for c, r in roles.items() if r in ("categorical", "binary")]

    # --- 1. FEATURE -> TARGET, by type -----------------------------------
    rows = []
    # MI for everything, so there is one comparable column. Discrete
    # features flagged so the estimator treats them correctly.
    X_mi = df[list(roles)].copy()
    for c in categorical:
        X_mi[c] = pd.factorize(X_mi[c])[0]
    X_mi = X_mi.fillna(X_mi.median(numeric_only=True))
    discrete = [c in categorical for c in X_mi.columns]
    mi = pd.Series(
        mutual_info_classif(X_mi, y, discrete_features=discrete,
                            random_state=random_state),
        index=X_mi.columns)

    for c, role in roles.items():
        row = {"feature": c, "role": role, "mi": round(float(mi[c]), 4)}
        s = df[c]
        if role == "numeric":
            # point-biserial == Pearson against 0/1; Spearman for shape
            row["pearson"] = round(float(s.corr(y.astype(float))), 4)
            row["spearman"] = round(float(s.corr(y.astype(float), method="spearman")), 4)
            # the diagnostic: MI high, |corr| low -> non-monotonic
            row["nonmonotonic"] = bool(row["mi"] > 0.05 and abs(row["spearman"]) < 0.1)
        else:
            row["cramers_v"] = round(cramers_v(s, y), 4)
            ct = pd.crosstab(s, y)
            row["chi2_p"] = float(stats.chi2_contingency(ct)[1]) if min(ct.shape) > 1 else 1.0
        rows.append(row)
    to_target = pd.DataFrame(rows).sort_values("mi", ascending=False)

    # --- 2. FEATURE <-> FEATURE, by type pair ----------------------------
    pairs = []
    feats = list(roles)
    for i in range(len(feats)):
        for j in range(i + 1, len(feats)):
            a, b = feats[i], feats[j]
            ra, rb = roles[a], roles[b]
            if ra == "numeric" and rb == "numeric":
                pairs.append({"a": a, "b": b, "kind": "num-num",
                              "strength": abs(float(df[a].corr(df[b], method="spearman")))})
            elif ra != "numeric" and rb != "numeric":
                pairs.append({"a": a, "b": b, "kind": "cat-cat",
                              "strength": cramers_v(df[a], df[b])})
            else:
                num, cat = (a, b) if ra == "numeric" else (b, a)
                # Kruskal-Wallis effect size: epsilon-squared
                groups = [g.dropna().to_numpy() for _, g in df.groupby(cat)[num]]
                groups = [g for g in groups if len(g) > 1]
                if len(groups) > 1:
                    h = stats.kruskal(*groups).statistic
                    eps2 = h / (len(df) - 1)
                else:
                    eps2 = 0.0
                pairs.append({"a": a, "b": b, "kind": "cat-num",
                              "strength": float(eps2)})
    between = pd.DataFrame(pairs).sort_values("strength", ascending=False)

    # --- 3. REDUNDANCY -----------------------------------------------------
    redundancy = vif(df[numeric]).rename("vif").round(1).to_frame() if numeric else pd.DataFrame()
    if len(redundancy):
        redundancy["flag"] = np.where(redundancy["vif"] > 10, "collinear",
                                      np.where(redundancy["vif"] > 5, "watch", ""))

    # --- 4. SIMPSON CHECK: numeric->target within the largest categorical --
    simpson = []
    if categorical and numeric:
        big_cat = max(categorical, key=lambda c: df[c].nunique())
        for c in numeric:
            overall = float(df[c].corr(y.astype(float), method="spearman"))
            within = df.groupby(big_cat).apply(
                lambda g: g[c].corr(g[target].astype(float), method="spearman")
                if len(g) > 10 else np.nan)
            within = within.dropna()
            if len(within):
                flip = bool(np.sign(overall) != 0 and
                            (np.sign(within) == -np.sign(overall)).mean() > 0.5)
                simpson.append({"feature": c, "overall": round(overall, 3),
                                "within_min": round(float(within.min()), 3),
                                "within_max": round(float(within.max()), 3),
                                "sign_reverses_within_groups": flip})
    simpson = pd.DataFrame(simpson)

    return {"to_target": to_target, "between": between,
            "redundancy": redundancy, "simpson": simpson}


# =========================================================================
# THE PLANTED FRAME
# =========================================================================

def planted(n=3000, seed=0):
    rng = np.random.default_rng(seed)
    lin = rng.normal(size=n)                          # linear with target
    u = rng.uniform(-3, 3, n)                         # U-shaped with target
    a = rng.normal(size=n)
    b = rng.normal(size=n)
    total = a + b + rng.normal(0, 0.02, n)            # redundant: a + b
    noise = rng.normal(size=n)
    region = rng.choice(["n", "s", "e", "w"], n)
    seg = rng.choice(["x", "y", "z"], n)
    # target: driven by lin, by the U, by region
    logit = 1.5 * lin + 1.2 * (u ** 2 - 3) + np.where(region == "n", 1.5, -0.5)
    target = (rng.uniform(size=n) < 1 / (1 + np.exp(-logit))).astype(int)
    return pd.DataFrame({"lin": lin, "u": u, "a": a, "b": b, "total": total,
                         "noise": noise, "region": region, "seg": seg,
                         "target": target})


# =========================================================================
# TESTS
# =========================================================================

def test_linear_feature_found_by_both():
    r = association_report(planted(), "target")["to_target"].set_index("feature")
    assert abs(r.loc["lin", "spearman"]) > 0.3
    assert r.loc["lin", "mi"] > 0.05


def test_u_shaped_feature_missed_by_correlation_found_by_mi():
    """The whole reason the naive approach fails."""
    r = association_report(planted(), "target")["to_target"].set_index("feature")
    assert abs(r.loc["u", "spearman"]) < 0.1        # correlation says nothing
    assert r.loc["u", "mi"] > 0.05                    # MI says something
    assert r.loc["u", "nonmonotonic"]


def test_categorical_predictor_found():
    r = association_report(planted(), "target")["to_target"].set_index("feature")
    assert r.loc["region", "cramers_v"] > 0.2
    assert r.loc["region", "chi2_p"] < 0.001
    assert r.loc["seg", "cramers_v"] < 0.1             # the unrelated one


def test_noise_ranks_last():
    r = association_report(planted(), "target")["to_target"]
    assert r["feature"].iloc[-1] in ("noise", "seg", "a", "b")


def test_redundancy_found_by_vif_not_correlation():
    df = planted()
    red = association_report(df, "target")["redundancy"]
    assert red.loc["total", "flag"] == "collinear"
    assert red.loc["a", "flag"] == "collinear"
    # and pairwise correlation would NOT have flagged it:
    assert abs(df["a"].corr(df["total"])) < 0.8


def test_cat_cat_pair_is_measured():
    b = association_report(planted(), "target")["between"]
    rs = b[(b["a"] == "region") & (b["b"] == "seg")]
    assert len(rs) == 1 and rs["kind"].iloc[0] == "cat-cat"


def test_simpson_check_runs_and_does_not_flip_here():
    s = association_report(planted(), "target")["simpson"].set_index("feature")
    assert not s.loc["lin", "sign_reverses_within_groups"]


def test_simpson_check_catches_a_planted_reversal():
    rng = np.random.default_rng(1)
    n = 3000
    dept = rng.choice(["A", "B"], n)
    x = np.where(dept == "A", rng.uniform(0, 5, n), rng.uniform(5, 10, n))
    # within each dept, higher x -> higher p(target); but B has lower base rate
    p = np.where(dept == "A", 0.5 + 0.08 * x, 0.05 + 0.04 * (x - 5))
    target = (rng.uniform(size=n) < p).astype(int)
    df = pd.DataFrame({"x": x, "dept": dept, "target": target})
    s = association_report(df, "target")["simpson"].set_index("feature")
    assert s.loc["x", "overall"] < 0                  # aggregate negative
    assert s.loc["x", "within_min"] > 0               # positive in every dept
    assert s.loc["x", "sign_reverses_within_groups"]


def test_label_encoded_correlation_is_meaningless():
    """What the team was doing, shown to be order-dependent."""
    df = planted()
    y = df["target"]
    enc1 = pd.factorize(df["region"])[0]
    order2 = {"n": 3, "s": 0, "e": 2, "w": 1}
    enc2 = df["region"].map(order2)
    r1 = np.corrcoef(enc1, y)[0, 1]
    r2 = np.corrcoef(enc2, y)[0, 1]
    assert abs(r1 - r2) > 0.05                       # the "correlation" depends
                                                     # on an arbitrary encoding`,
        notes: [
          { t: "p", text: "**The U-shaped feature is the whole argument.** Spearman says under 0.1 — nothing there — and mutual information says it is one of the strongest features in the set. A team selecting on correlation would have dropped the feature that drives the target hardest." },
          { t: "callout", kind: "trap", title: "Correlation of a label-encoded category measures the encoding", body: [
            { t: "p", text: "`north=0, south=1, east=2, west=3` imposes an order on regions that does not exist. **The last test encodes the same column two ways and gets two different \"correlations\" with the target** — the number describes the arbitrary integer assignment, not the data." },
            { t: "p", text: "Cramér's V and chi-square use the contingency table and have no order to be fooled by." }
          ]},
          { t: "p", text: "**VIF flags `total` as collinear when its pairwise correlation with `a` is only 0.7.** Redundancy is a property of the feature set — `total` is predictable from `a` and `b` together — and no pairwise threshold sees it." },
          { t: "p", text: "**The Simpson check recomputes each numeric's target association inside the largest categorical's groups.** On the planted reversal, the aggregate is negative and every within-group correlation is positive; `sign_reverses_within_groups` is the flag that says the aggregate number is not the finding." },
          { t: "p", text: "**One MI column for every feature makes the target table comparable across types.** Discrete features are flagged so the estimator treats them as such; Pearson, Spearman, Cramér's V and chi-square are kept alongside as the type-appropriate detail." },
          { t: "p", text: "**Category-against-numeric uses a rank-based effect size**, Kruskal-Wallis ε², so the between-features table has a strength column that means roughly the same thing for every pair kind." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`x` and `y` have Pearson r = 0.02 and Spearman ρ = 0.01. What can you conclude?",
          options: [
            "They are independent",
            "There is no monotonic relationship — but a U-shape would give exactly these numbers, so mutual information or a plot is needed before concluding anything",
            "The data is noisy",
            "y does not depend on x"
          ],
          answer: 1,
          why: "Both coefficients measure monotonic association. A perfect U has both at zero. \"Uncorrelated\" is not \"independent\", and a feature-selection rule based on correlation drops exactly the features that have a non-monotonic effect."
        }
      ]
    }
  ],

  takeaways: [
    "**Pearson measures how well a straight line fits; Spearman measures whether y rises with x** — the second is usually the question.",
    "**One extreme row can move Pearson from 0.28 to 0.93** while Spearman barely notices.",
    "**r = 0 does not mean unrelated**: a perfect U has zero Pearson and zero Spearman.",
    "**Mutual information detects any dependency**, at the cost of being an estimate with unintuitive units.",
    "**Correlation is undefined for two categoricals**; label-encoding them and correlating measures the arbitrary encoding.",
    "**Crosstab → chi-square → Cramér's V**: is the association real, and how strong is it.",
    "**Chi-square grows with n**; a p-value of 10⁻²⁷ can describe an association too weak to matter — V is the number to quote.",
    "**Category against numeric is a groupby**, and Kruskal-Wallis is the rank-based test for whether the groups differ.",
    "**Multicollinearity is a property of the set, not of any pair** — VIF sees `a + b` when pairwise correlation sees 0.7.",
    "**Simpson's paradox: the aggregate trend can reverse inside every group.** Recompute any actionable pairwise result within the obvious groups.",
    "**Partial correlation removes what both share with a third variable** — ice cream and drowning, through temperature.",
    "**The pairs where Pearson and Spearman disagree are the ones to plot** — the shape is not a line.",
    "**Quote the coefficient, the n, and the interval** — a coefficient alone is a number without a denominator."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which measure is appropriate for the association between `region` (4 values) and `tier` (2 values)?",
        options: [
          "Pearson correlation after label encoding",
          "Cramér's V on the contingency table, with chi-square for whether it is distinguishable from independence",
          "Spearman correlation",
          "The difference in means"
        ],
        answer: 1,
        why: "Categorical columns have no order, so correlation is meaningless and label encoding just measures the arbitrary integers you assigned. The contingency table is the object; chi-square tests it against independence and Cramér's V normalises the strength to 0–1."
      },
      {
        stem: "Three features have pairwise correlations no higher than 0.71, and VIF above 200 for each. What is going on?",
        options: [
          "VIF is miscalculated",
          "One feature is nearly a linear combination of the other two — redundancy that no pairwise measure can see",
          "The features are independent",
          "The sample is too small"
        ],
        answer: 1,
        why: "VIF regresses each feature on all the others; `c = a + b` is perfectly predictable from `a` and `b` together while correlating only moderately with each. A \"drop pairs above 0.9\" rule keeps all three, and a linear model on them has unidentifiable coefficients."
      },
      {
        stem: "Experience and pay are negatively correlated in a company-wide table, and positively correlated within every department. Which is true?",
        options: [
          "The data is corrupted",
          "Both — department is a confounder; more experienced staff are concentrated in lower-paying departments, and the aggregate number answers a question nobody asked",
          "The within-department numbers are wrong",
          "Correlation cannot be computed within groups"
        ],
        answer: 1,
        why: "Simpson's paradox. The aggregate is not incorrect; it is the answer to \"across everyone, ignoring department\" — which is not what anyone means by \"does experience raise pay\". Any actionable pairwise result should be recomputed within the obvious groups to check for a sign flip."
      },
      {
        stem: "Why does a chi-square p-value of 10⁻²⁷ not tell you the association is strong?",
        options: [
          "It does",
          "Chi-square scales with sample size, so on a million rows a trivial association is astronomically significant — Cramér's V normalises for n",
          "p-values only apply to numeric data",
          "The test assumes normality"
        ],
        answer: 1,
        why: "Significance answers \"could this arise by chance at this n\"; on large data almost everything is significant. Strength is a separate question, and V — chi-square divided by n and the table's smaller dimension — is the number that answers it and is comparable across tables."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use Spearman rather than Pearson?",
        strong: "Almost always, unless the question is specifically linear. Pearson measures how well a straight line fits and is dragged by extreme values; Spearman measures whether y rises with x, on ranks, and is robust to outliers and to any monotonic transform. On real data with a few large values — which is all real data — Pearson on raw values is mostly a coefficient about the extremes. And neither sees a U-shape; mutual information or a plot does.",
        answer: [
          { t: "p", text: "Leading with \"almost always\" rather than \"it depends\" is the right level of conviction; naming what both miss is the completeness." }
        ]
      },
      {
        level: "advanced",
        q: "How would you measure whether two categorical columns are related?",
        strong: "Build the contingency table. Chi-square tells you whether the pattern is distinguishable from independence; Cramér's V — chi-square normalised by n and the smaller dimension — tells you how strong it is on a 0–1 scale, which chi-square cannot because it grows with n. Mutual information is the general alternative that works for any type pair. What I would not do is label-encode them and correlate: that measures the arbitrary integers, and a different encoding gives a different number.",
        answer: [
          { t: "p", text: "The label-encoding warning is the practical point — it is what most people actually do, and it is wrong in a way that produces plausible output." }
        ]
      },
      {
        level: "advanced",
        q: "Why is a pairwise correlation matrix not enough to detect redundancy in a feature set?",
        strong: "Because redundancy can be a property of three or more features. A feature that is the sum of two others correlates around 0.7 with each — under any pairwise threshold — while being perfectly predictable from both together. VIF regresses each feature on all the others and sees it immediately. The same limitation applies to Simpson's paradox: a relationship can reverse inside every group of a third variable, and the pairwise number cannot know.",
        answer: [
          { t: "p", text: "Connecting VIF and Simpson's paradox as two instances of \"structure across three variables\" shows the underlying understanding rather than two memorised facts." }
        ]
      }
    ]
  }
});
