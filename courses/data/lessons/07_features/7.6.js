/* ============================================================================
   LESSON 7.6 — Binning, Discretisation and Binarisation
   ========================================================================= */
EC.receiveLesson({
  id: "7.6",

  lede: "**Binning throws away information on purpose.** Forty-three and forty-four become \"40–49\", and the model can no longer tell them apart. What it buys in exchange — a step function that captures a non-linear effect, robustness to outliers, a feature a scorecard can print — is worth having in specific situations and a loss everywhere else. The mistake is doing it by habit.",

  objectives: [
    "Apply equal-width, equal-frequency and supervised binning and state what each preserves",
    "Say what binning gives a linear model and what it costs a tree",
    "Choose bin edges deliberately, from domain knowledge or from the target, and fit them on training data",
    "Binarise a feature at a threshold and know when a single cut is the right representation",
    "Recognise the situations where binning is the honest choice and the ones where it is a habit"
  ],

  prerequisites: ["7.3", "7.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three ways to cut, and what each assumes", id: "cuts" },

    { t: "p", text: "A continuous column becomes a categorical one by choosing edges. **Equal-width edges assume the scale is meaningful; equal-frequency edges assume the ranks are; supervised edges assume the target knows best.** Each is right somewhere, and `pd.cut` versus `pd.qcut` is the whole difference between the first two." },

    { t: "dl", items: [
      ["Discretisation", "Turning a continuous variable into an ordered set of categories by cutting it at edges. Binning is the same thing; the words are interchangeable."],
      ["Equal-width bins", "`pd.cut(x, k)`: k intervals of the same length across the range. Interpretable edges; empty or overcrowded bins on skewed data."],
      ["Equal-frequency bins", "`pd.qcut(x, k)`: k intervals holding the same number of rows. Every bin is populated; edges land at arbitrary-looking values."],
      ["Supervised bins", "Edges chosen so that the target differs as much as possible between adjacent bins — a decision tree on one feature, or monotonic WoE merging (7.3). Uses the target, so it must be fit on training data."],
      ["Binarisation", "One cut: above or below a threshold. `x > 0`, `age >= 18`, `amount > 10_000`. The simplest discretisation and often the most defensible."],
      ["Ordinal versus one-hot bins", "A bin index (0, 1, 2…) preserves order and suits trees; one bin per column suits linear models that want a separate effect per interval."]
    ]},

    { t: "viz",
      title: "The same skewed column under three binning rules",
      caption: "Equal-width: most rows in the first bin, the last three nearly empty. Equal-frequency: every bin holds 20%, but the top bin spans 60 to 5,000. Supervised: edges land where the target changes, and the bins are neither equal in width nor in count.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="A right-skewed histogram shown three times with different bin edges: equal width, equal frequency, and supervised, with the rows per bin annotated">
  <g transform="translate(30,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--warn)">equal-width, 5 bins</text>
    <g style="fill:var(--ink-4);fill-opacity:.15">
      <rect x="0" y="20" width="10" height="120"/><rect x="10" y="10" width="10" height="130"/><rect x="20" y="40" width="10" height="100"/>
      <rect x="30" y="70" width="10" height="70"/><rect x="40" y="90" width="10" height="50"/><rect x="50" y="105" width="10" height="35"/>
      <rect x="60" y="115" width="10" height="25"/><rect x="70" y="122" width="10" height="18"/><rect x="80" y="127" width="10" height="13"/>
      <rect x="90" y="131" width="10" height="9"/><rect x="100" y="134" width="10" height="6"/><rect x="110" y="136" width="10" height="4"/>
      <rect x="120" y="137" width="10" height="3"/><rect x="130" y="138" width="10" height="2"/><rect x="140" y="139" width="120" height="1"/>
    </g>
    <line x1="0" y1="140" x2="260" y2="140" style="stroke:var(--line)"/>
    <g style="stroke:var(--warn);stroke-width:1.5;stroke-dasharray:3 2">
      <line x1="52" y1="0" x2="52" y2="140"/><line x1="104" y1="0" x2="104" y2="140"/><line x1="156" y1="0" x2="156" y2="140"/><line x1="208" y1="0" x2="208" y2="140"/>
    </g>
    <text x="0" y="160" class="s-sub" style="fill:var(--ink-3)">88%  9%   2%  0.6% 0.4%</text>
    <text x="0" y="180" class="s-sub" style="fill:var(--warn)">three bins nearly empty;</text>
    <text x="0" y="196" class="s-sub" style="fill:var(--warn)">the first holds everything</text>
  </g>
  <g transform="translate(320,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--accent)">equal-frequency, 5 bins</text>
    <g style="fill:var(--ink-4);fill-opacity:.15">
      <rect x="0" y="20" width="10" height="120"/><rect x="10" y="10" width="10" height="130"/><rect x="20" y="40" width="10" height="100"/>
      <rect x="30" y="70" width="10" height="70"/><rect x="40" y="90" width="10" height="50"/><rect x="50" y="105" width="10" height="35"/>
      <rect x="60" y="115" width="10" height="25"/><rect x="70" y="122" width="10" height="18"/><rect x="80" y="127" width="10" height="13"/>
      <rect x="90" y="131" width="10" height="9"/><rect x="100" y="134" width="10" height="6"/><rect x="110" y="136" width="10" height="4"/>
      <rect x="120" y="137" width="10" height="3"/><rect x="130" y="138" width="10" height="2"/><rect x="140" y="139" width="120" height="1"/>
    </g>
    <line x1="0" y1="140" x2="260" y2="140" style="stroke:var(--line)"/>
    <g style="stroke:var(--accent);stroke-width:1.5;stroke-dasharray:3 2">
      <line x1="9" y1="0" x2="9" y2="140"/><line x1="17" y1="0" x2="17" y2="140"/><line x1="28" y1="0" x2="28" y2="140"/><line x1="48" y1="0" x2="48" y2="140"/>
    </g>
    <text x="0" y="160" class="s-sub" style="fill:var(--ink-3)">20% 20% 20% 20%    20%</text>
    <text x="0" y="180" class="s-sub" style="fill:var(--accent)">every bin populated; the</text>
    <text x="0" y="196" class="s-sub" style="fill:var(--accent)">top bin spans 60 to 5,000</text>
  </g>
  <g transform="translate(610,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--good)">supervised, 4 bins</text>
    <g style="fill:var(--ink-4);fill-opacity:.15">
      <rect x="0" y="20" width="10" height="120"/><rect x="10" y="10" width="10" height="130"/><rect x="20" y="40" width="10" height="100"/>
      <rect x="30" y="70" width="10" height="70"/><rect x="40" y="90" width="10" height="50"/><rect x="50" y="105" width="10" height="35"/>
      <rect x="60" y="115" width="10" height="25"/><rect x="70" y="122" width="10" height="18"/><rect x="80" y="127" width="10" height="13"/>
      <rect x="90" y="131" width="10" height="9"/><rect x="100" y="134" width="10" height="6"/><rect x="110" y="136" width="10" height="4"/>
      <rect x="120" y="137" width="10" height="3"/><rect x="130" y="138" width="10" height="2"/><rect x="140" y="139" width="120" height="1"/>
    </g>
    <line x1="0" y1="140" x2="260" y2="140" style="stroke:var(--line)"/>
    <g style="stroke:var(--good);stroke-width:1.5;stroke-dasharray:3 2">
      <line x1="14" y1="0" x2="14" y2="140"/><line x1="38" y1="0" x2="38" y2="140"/><line x1="95" y1="0" x2="95" y2="140"/>
    </g>
    <text x="0" y="160" class="s-sub" style="fill:var(--ink-3)">rate 2%  5%   11%   24%</text>
    <text x="0" y="180" class="s-sub" style="fill:var(--good)">edges where the target</text>
    <text x="0" y="196" class="s-sub" style="fill:var(--good)">changes; fit on train only</text>
  </g>
  <text x="30" y="262" class="s-sub" style="fill:var(--ink-3)">Equal-width is what a person would draw on a chart. Equal-frequency is what a statistician would draw. Supervised is what the target would draw — and it is the one that can leak.</text>
  <text x="30" y="286" class="s-sub" style="fill:var(--ink-3)">All three lose the difference between 43 and 44. The question is whether that difference was ever going to matter.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "cut, qcut, KBinsDiscretizer and a supervised cut", code: `
import pandas as pd
import numpy as np
from sklearn.preprocessing import KBinsDiscretizer, Binarizer
from sklearn.tree import DecisionTreeClassifier

rng = np.random.default_rng(0)
n = 10_000
amount = rng.lognormal(3, 0.8, n)                          # skewed
p = 1 / (1 + np.exp(-(np.log(amount) - 3.5) * 1.5))       # target rises with log(amount)
y = (rng.random(n) < p).astype(int)
df = pd.DataFrame({"amount": amount, "y": y})

# EQUAL-WIDTH: pd.cut with an integer -> k intervals of equal length.
df["bin_w"] = pd.cut(df["amount"], 5)
df["bin_w"].value_counts(sort=False)
# (0.4, 210]       9787       <- 98% in the first bin
# (210, 420]        183
# (420, 630]         24
# (630, 840]          5
# (840, 1050]        1        <- one row. A bin with one row.
#
# On a skewed column, equal-width bins are the histogram nobody
# wants: one full bin and four empty ones. The model gets one
# indicator that is almost always 1 and four that are almost always
# 0. Useless, and the edges (210, 420...) mean nothing.

# EQUAL-FREQUENCY: pd.qcut -> k intervals with equal counts.
df["bin_q"] = pd.qcut(df["amount"], 5)
df["bin_q"].value_counts(sort=False)
# (0.4, 10.2]      2000
# (10.2, 15.6]     2000
# (15.6, 21.9]     2000
# (21.9, 34.5]     2000
# (34.5, 1050]     2000       <- 2,000 rows spanning 34 to 1,050
#
# Every bin populated; the top one spans two orders of magnitude.
# The model cannot tell 40 from 1,000. For a target that keeps
# rising with log(amount), that top bin hides most of the signal.

# THE EDGES ARE THE FIT. With duplicates="drop" for columns where a
# quantile lands on a repeated value (many zeros, say):
edges = pd.qcut(df["amount"], 5, retbins=True, duplicates="drop")[1]
edges                                       # array([0.4, 10.2, 15.6, 21.9, 34.5, 1050])
#
# Store them. Apply to test with pd.cut(test, edges). A qcut on the
# test set would compute NEW edges from the test distribution -- a
# different binning, and a leak.

# YOUR OWN EDGES -- from the domain, not the data:
df["band"] = pd.cut(df["amount"], [0, 10, 50, 100, 500, np.inf],
                    labels=["micro", "small", "medium", "large", "huge"],
                    right=True)                             # (0,10], (10,50] ...
#
# "Under 10" and "over 500" mean something to the business. The
# edges are a decision someone can defend, they need no fitting,
# and they do not shift between train and test. Where they exist,
# use them.

# right=, include_lowest= -- the boundary conventions that bite:
pd.cut([10, 50], [0, 10, 50], right=True)          # (0,10], (10,50] -> 10 in bin 1
pd.cut([10, 50], [0, 10, 50], right=False)         # [0,10), [10,50) -> 10 in bin 2
pd.cut([0], [0, 10], include_lowest=True)          # [0,10] -- else 0 falls OUT
#
# A value exactly on an edge lands in one bin or the other by this
# flag, and a value at the minimum is dropped (NaN) unless
# include_lowest=True. Both are silent.

# sklearn's version, for a Pipeline (see 8.5):
kb = KBinsDiscretizer(n_bins=5, encode="ordinal", strategy="quantile")
kb.fit(df[["amount"]])
kb.bin_edges_                                               # learned on fit
kb.transform(df[["amount"]])[:5].ravel()                   # [1., 3., 0., 4., 2.]
#
# strategy: "uniform" (equal-width), "quantile" (equal-frequency),
#           "kmeans" (edges from 1-D k-means -- clusters of values)
# encode:   "ordinal" (bin index, for trees), "onehot" (for linear),
#           "onehot-dense"

# SUPERVISED: let a one-feature decision tree choose the edges.
tree = DecisionTreeClassifier(max_leaf_nodes=4, min_samples_leaf=200, random_state=0)
tree.fit(df[["amount"]], df["y"])
thresholds = sorted(t for t in tree.tree_.threshold if t > 0)
thresholds                                                  # [13.1, 28.4, 61.7]
df["bin_s"] = pd.cut(df["amount"], [-np.inf] + thresholds + [np.inf])
df.groupby("bin_s", observed=True)["y"].agg(["size", "mean"])
#                    size   mean
# (-inf, 13.1]       3010  0.11
# (13.1, 28.4]       3480  0.35
# (28.4, 61.7]       2520  0.62
# (61.7, inf]         990  0.83
#
# The edges are where the target rate changes most. Each bin is
# genuinely different from its neighbours. This is the binning a
# model would want -- and it used y, so it is FIT ON TRAIN, inside
# the CV, or it leaks exactly like target encoding (7.2).
# min_samples_leaf stops a bin of 12 rows with a rate of 1.0.
`,
      hl: [14, 33, 41, 79],
      caption: "**`qcut` on the test set computes new edges from the test distribution — a different binning and a leak.** Fit the edges once with `retbins=True`, store them, and apply with `cut`."
    },

    { t: "callout", kind: "trap", title: "The edge cases are literally the edges", body: [
      { t: "p", text: "`right=True` puts a value of exactly 10 in `(0, 10]`; `right=False` puts it in `[10, 50)`. A value at the column minimum falls into no bin at all — it becomes NaN — unless `include_lowest=True`. **Both are silent, and a threshold of 18 for \"adult\" that puts 18-year-olds in the child bin is a real bug that has shipped.**" },
      { t: "p", text: "State the convention, test a value exactly on each edge, and test the minimum. It costs three assertions." }
    ]},

    { t: "h2", n: "02", text: "What binning buys, and from whom", id: "buys" },

    { t: "p", text: "**For a linear model, binning turns one coefficient into one per bin — a step function that can follow any shape.** For a tree, binning removes the ability to split anywhere in the interval — it can only cut at your edges. Same operation, opposite effect, and which model is downstream decides whether it is a feature or a handicap." },

    { t: "code", lang: "python", title: "the linear model gains a curve; the tree loses resolution", code: `
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score

# A NON-MONOTONIC TARGET: risk is high for the young and the old.
age = rng.uniform(18, 80, n)
p_age = 0.05 + 0.25 * ((age - 48) / 30) ** 2               # U-shaped
y_age = (rng.random(n) < p_age).astype(int)
A = pd.DataFrame({"age": age})

def cv(model, X, y):
    return round(cross_val_score(model, X, y, cv=5, scoring="roc_auc").mean(), 3)

# LOGISTIC ON THE RAW FEATURE: one coefficient, one direction.
cv(LogisticRegression(), A, y_age)                          # 0.51 -- a coin flip
#
# A line cannot be U-shaped. The model finds no monotonic trend
# and gives up. This is the case where binning HELPS a linear model.

# LOGISTIC ON ONE-HOT BINS: one coefficient per bin, any shape.
A_bins = pd.get_dummies(pd.cut(A["age"], [17, 25, 35, 45, 55, 65, 80]), dtype=float)
cv(LogisticRegression(), A_bins, y_age)                     # 0.68
#
# Six bins, six coefficients: high, lower, low, low, higher, high.
# The step function follows the U. The linear model now has a
# NON-LINEAR feature, which is the whole point of binning for it.
#
# THE SAME EFFECT can come from a polynomial (age, age^2) or a
# spline -- smoother, fewer parameters, but you need to know the
# shape. Bins assume nothing about the shape and pay with edges.

# GRADIENT BOOSTING ON THE RAW FEATURE:
cv(GradientBoostingClassifier(random_state=0), A, y_age)    # 0.70
#
# The tree found the U on its own, with splits wherever it liked.

# GRADIENT BOOSTING ON THE BINS:
cv(GradientBoostingClassifier(random_state=0), A_bins, y_age)    # 0.67
#
# WORSE. The tree could only split at YOUR six edges. It wanted to
# split at 31 and 63; the nearest edges were 35 and 65. Binning gave
# the tree a coarser version of a feature it already knew how to
# read. For trees, binning is a handicap unless the edges carry
# domain knowledge the tree could not have found.

# THE SUMMARY:
#   linear model + non-linear effect   -> binning HELPS (or splines)
#   linear model + linear effect       -> binning HURTS (adds noise,
#                                          loses resolution)
#   tree model                         -> binning HURTS or is neutral
#   any model + outliers to neutralise -> binning helps (top bin
#                                          absorbs them)
#   any model + a scorecard to print   -> binning REQUIRED

# RESOLUTION LOSS, quantified: within a bin, the model is blind.
# A 10-year age bin means "a 26-year-old and a 34-year-old are the
# same". If the effect within that range is 0.3% per year, that is
# 2.4 points of risk the model cannot see. Narrower bins recover it
# and cost parameters; the trade is real.

# BIN COUNT: too few, resolution gone; too many, each bin is a
# handful of rows and its coefficient is noise. 5-10 is usual;
# min_samples per bin of a few hundred; and CV chooses.
for k in (3, 5, 8, 12, 20):
    bins_k = pd.get_dummies(pd.qcut(A["age"], k), dtype=float)
    print(k, cv(LogisticRegression(max_iter=1000), bins_k, y_age))
# 3 0.62 / 5 0.67 / 8 0.68 / 12 0.68 / 20 0.66   <- plateau, then noise
`,
      hl: [14, 19, 33, 39],
      caption: "**The gradient-booster scores 0.70 on the raw feature and 0.67 on the bins.** It wanted to split at 31 and 63; the nearest edges were 35 and 65. For a tree, binning is a coarser version of a feature it already reads."
    },

    { t: "h2", n: "03", text: "Binarisation: one cut", id: "binarise" },

    { t: "code", lang: "python", title: "a single threshold, and the cases where it is the right feature", code: `
# BINARISATION: above or below one value.
Binarizer(threshold=100).fit_transform(df[["amount"]])[:5].ravel()    # 0/1
(df["amount"] > 100).astype(int)                                     # the same, readably

# WHEN ONE CUT IS THE HONEST REPRESENTATION:
#
# 1. THE THRESHOLD IS A RULE IN THE WORLD.
#    age >= 18, order > free_shipping_threshold, balance < 0,
#    days_overdue > 90. The world already binarised it; the model
#    should see the same cut.
df["over_limit"] = (df["amount"] > 500).astype(int)

# 2. PRESENCE, NOT AMOUNT. Zero-inflated columns (7.5): "did they
#    buy anything" is often more predictive than "how much", and it
#    is a clean binary.
spend = np.where(rng.random(n) < 0.6, 0.0, rng.lognormal(3, 0.8, n))
has_spend = (spend > 0).astype(int)

# 3. A SATURATING EFFECT. If risk rises with amount up to 200 and
#    then stops rising, "amount > 200" captures it and the raw
#    amount adds noise above the knee.

# 4. TEXT COUNTS -> presence. Bag-of-words counts (7.10) binarised:
#    "contains the word" rather than "how many times". For short
#    documents, presence is the signal and count is noise.

# THE THRESHOLD IS A DECISION. Three sources, in order of preference:
#   - the domain: a rule, a regulation, a contract
#   - the data, supervised: the single split a depth-1 tree chooses
#   - the data, unsupervised: the median (splits the population in
#     half; says nothing about the target)
stump = DecisionTreeClassifier(max_depth=1).fit(df[["amount"]], df["y"])
stump.tree_.threshold[0]                                    # 28.4 -- the best single cut
#
# The stump's threshold is the best binarisation FOR THIS TARGET,
# and it is a fit on y -- train only.

# MULTIPLE THRESHOLDS OF ONE FEATURE, as separate binaries:
for t in (10, 50, 100, 500):
    df[f"amount_gt_{t}"] = (df["amount"] > t).astype(int)
#
# Four overlapping indicators. A linear model gets an increment per
# threshold crossed -- a cumulative step function, which is a
# different parameterisation of bins (each coefficient is the step
# UP at that edge rather than the level of that bin). Sometimes
# easier to read: "crossing 500 adds beta_500".

# WHAT BINARISATION DESTROYS: everything but the sign. A cut at 100
# makes 101 and 10,000 identical. If the tail matters (fraud,
# extremes), keep the raw or logged feature alongside the flag.

# THE THREE FLAGS THAT ALMOST ALWAYS EARN THEIR PLACE:
df["is_zero"]    = (df["amount"] == 0).astype(int)          # zero-inflation
df["is_missing"] = df["amount"].isna().astype(int)           # missingness (6.5)
df["is_extreme"] = (df["amount"] > df["amount"].quantile(0.99)).astype(int)   # tail flag,
                                                             # quantile from TRAIN
`,
      hl: [5, 27, 33, 46],
      caption: "**A depth-1 tree's threshold is the best single cut for this target** — and it is a fit on y. The domain's own threshold — 18, 90 days, the free-shipping level — needs no fitting and cannot leak."
    },

    { t: "table",
      head: ["Method", "Edges from", "Preserves", "Loses", "Fit step?", "Use when"],
      rows: [
        ["Equal-width (`cut`)", "The range", "Interpretable edges", "Populated bins on skewed data", "Range on train", "Roughly uniform data; chart-style bands"],
        ["Equal-frequency (`qcut`)", "The quantiles", "Populated bins", "Resolution in the tail; meaningful edges", "**Yes** — quantiles on train", "Skewed data; rank matters more than scale"],
        ["Domain edges", "A rule", "Meaning; stability", "Nothing the rule did not already", "**No**", "**Whenever a rule exists**"],
        ["Supervised (tree / WoE)", "The target", "Bins that differ in outcome", "Independence from y", "**Yes** — on train, inside CV", "Scorecards; linear models on non-monotonic effects"],
        ["k-means (1-D)", "Value clusters", "Natural groupings", "Predictability", "Yes", "Multimodal columns"],
        ["Binarise", "One threshold", "The sign of the cut", "Everything else", "Only if the threshold is fit", "Rules, presence, saturation, text counts"]
      ],
      caption: "**Domain edges are the only kind with no fit step and no leak.** Where a rule exists — a legal age, a contract threshold, a physical limit — it beats every data-driven edge on stability and on meaning."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A binning transformer that fits on train and tells you what it cost",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Build a discretiser with three strategies — domain edges, quantile edges, supervised edges — that fits on training data, handles values outside the training range and exactly on an edge, and reports for each column how much resolution was lost (the within-bin spread of the target) and how much was kept (the between-bin spread). Then show, on a U-shaped and a linear effect, which model benefits from which strategy." },
        { t: "p", text: "Include the leak: a supervised binner fit on all data, and the CV gap it produces." }
      ],
      requirements: [
        "Three strategies in one transformer, selectable per column.",
        "Edges fit on train; test values outside the range go to the end bins; edge values handled by a stated convention.",
        "A resolution report: within-bin and between-bin target variance per column.",
        "Linear model gains on the U-shaped effect and loses on the linear one — tested.",
        "Tree model unchanged or worse under binning — tested.",
        "Supervised binner fit outside the CV shows an inflated score — tested."
      ],
      hint: "Between-bin variance over total variance is the fraction of the target's spread the bins can still explain. It is the honest measure of what binning kept.",
      solution: {
        lang: "python",
        title: "binner.py",
        code: `import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import make_pipeline


class Binner(BaseEstimator, TransformerMixin):
    """Per-column discretisation, three strategies, fit on train.

    spec   {col: ("domain", [edges])           fixed edges, no fit
                  ("quantile", k)              k equal-frequency bins
                  ("supervised", k)            k bins from a depth-limited
                                               tree on y  -- NEEDS y in fit
    Conventions:
      - intervals are right-closed: (a, b]
      - the lowest edge is -inf and the highest +inf, so any test value
        lands in an end bin rather than becoming NaN
      - output is the ordinal bin index (0..k-1); one-hot downstream if
        the consumer is linear
    """
    def __init__(self, spec, min_samples_leaf=100, random_state=0):
        self.spec = spec
        self.min_samples_leaf = min_samples_leaf
        self.random_state = random_state

    def fit(self, X, y=None):
        X = pd.DataFrame(X)
        self.edges_ = {}
        for col, (kind, arg) in self.spec.items():
            x = X[col].to_numpy(float)
            ok = ~np.isnan(x)
            if kind == "domain":
                inner = sorted(arg)
            elif kind == "quantile":
                qs = np.quantile(x[ok], np.linspace(0, 1, arg + 1)[1:-1])
                inner = sorted(set(qs.tolist()))                   # duplicates dropped
            elif kind == "supervised":
                if y is None:
                    raise ValueError(f"{col}: supervised binning needs y")
                yy = np.asarray(y)[ok]
                Tree = DecisionTreeClassifier if len(np.unique(yy)) <= 2 else DecisionTreeRegressor
                t = Tree(max_leaf_nodes=arg, min_samples_leaf=self.min_samples_leaf,
                         random_state=self.random_state).fit(x[ok].reshape(-1, 1), yy)
                inner = sorted(float(v) for v in t.tree_.threshold if v != -2)
            else:
                raise ValueError(kind)
            self.edges_[col] = [-np.inf] + inner + [np.inf]
        return self

    def transform(self, X):
        X = pd.DataFrame(X)
        out = pd.DataFrame(index=X.index)
        for col, edges in self.edges_.items():
            b = pd.cut(X[col].astype(float), edges, right=True, labels=False)
            out[f"{col}_bin"] = b.astype("Int64")                 # NaN stays NaN
        return out

    def get_feature_names_out(self, input_features=None):
        return np.array([f"{c}_bin" for c in self.edges_])


def resolution_report(binner, X, y):
    """How much of y's variance survives binning, per column."""
    y = np.asarray(y, float)
    total = y.var()
    B = binner.transform(X)
    rows = []
    for col in binner.edges_:
        b = B[f"{col}_bin"]
        g = pd.Series(y).groupby(b.to_numpy()).agg(["mean", "size"])
        between = ((g["mean"] - y.mean()) ** 2 * g["size"]).sum() / len(y)
        within = total - between
        rows.append({"column": col, "n_bins": len(binner.edges_[col]) - 1,
                     "between_share": round(between / total, 3),     # kept
                     "within_share": round(within / total, 3),       # lost
                     "smallest_bin": int(g["size"].min())})
    return pd.DataFrame(rows)


# =========================================================================
# DATA: one U-shaped effect, one linear effect
# =========================================================================

def make(n=8000, seed=0):
    rng = np.random.default_rng(seed)
    age = rng.uniform(18, 80, n)
    income = rng.lognormal(10.3, 0.4, n)
    logit = (-1.5 + 2.5 * ((age - 48) / 30) ** 2                    # U in age
             + 0.8 * (np.log(income) - 10.3) / 0.4)                  # linear in log income
    y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
    return pd.DataFrame({"age": age, "income": income}), y


def onehot(B):
    return pd.get_dummies(B.astype(str), dtype=float)


def cv_auc(model, X, y):
    return cross_val_score(model, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=0),
                           scoring="roc_auc").mean()


# =========================================================================
# TESTS
# =========================================================================

def test_domain_edges_need_no_y_and_handle_out_of_range():
    X, y = make()
    b = Binner({"age": ("domain", [25, 35, 45, 55, 65])}).fit(X)
    out = b.transform(pd.DataFrame({"age": [5.0, 25.0, 25.01, 200.0, np.nan]}))["age_bin"].tolist()
    assert out[0] == 0                       # below range -> first bin
    assert out[1] == 0                       # exactly 25 -> (−inf, 25] right-closed
    assert out[2] == 1
    assert out[3] == 5                       # above range -> last bin
    assert pd.isna(out[4])                   # NaN stays NaN


def test_quantile_edges_are_from_train_only():
    X, y = make()
    b = Binner({"income": ("quantile", 5)}).fit(X.iloc[:4000])
    e1 = b.edges_["income"]
    b2 = Binner({"income": ("quantile", 5)}).fit(X.iloc[:4000])
    assert e1 == b2.edges_["income"]
    # a shifted test set does NOT change the edges
    shifted = X.iloc[4000:] * 10
    _ = b.transform(shifted)
    assert b.edges_["income"] == e1


def test_supervised_edges_track_the_target():
    X, y = make()
    b = Binner({"age": ("supervised", 4)}).fit(X, y)
    r = resolution_report(b, X, y).set_index("column")
    bq = Binner({"age": ("quantile", 4)}).fit(X, y)
    rq = resolution_report(bq, X, y).set_index("column")
    assert r.loc["age", "between_share"] > rq.loc["age", "between_share"]


def test_linear_model_gains_on_u_shape_from_binning():
    X, y = make()
    raw = cv_auc(LogisticRegression(max_iter=1000), X[["age"]], y)
    b = Binner({"age": ("quantile", 8)}).fit(X)
    binned = cv_auc(LogisticRegression(max_iter=1000), onehot(b.transform(X)), y)
    assert binned - raw > 0.08, (raw, binned)


def test_linear_model_loses_on_linear_effect_from_binning():
    X, y = make()
    Xl = np.log(X[["income"]])
    raw = cv_auc(LogisticRegression(max_iter=1000), Xl, y)
    b = Binner({"income": ("quantile", 5)}).fit(X)
    binned = cv_auc(LogisticRegression(max_iter=1000), onehot(b.transform(X)), y)
    assert raw >= binned - 0.005, (raw, binned)        # binning does not help, usually hurts


def test_tree_is_not_helped_by_binning():
    X, y = make()
    gb = GradientBoostingClassifier(random_state=0, n_estimators=100)
    raw = cv_auc(gb, X, y)
    b = Binner({"age": ("quantile", 6), "income": ("quantile", 6)}).fit(X)
    binned = cv_auc(gb, b.transform(X).astype(float), y)
    assert raw >= binned - 0.005, (raw, binned)


def test_supervised_binner_fit_outside_cv_inflates_score():
    """The leak: edges chosen with the validation fold's labels."""
    X, y = make()
    # LEAKY: fit on all data, then CV on the result
    leaky = Binner({"age": ("supervised", 6), "income": ("supervised", 6)},
                   min_samples_leaf=20).fit(X, y)
    leaky_auc = cv_auc(LogisticRegression(max_iter=1000), onehot(leaky.transform(X)), y)
    # HONEST: binner inside the pipeline, refit per fold
    class OneHotBins(BaseEstimator, TransformerMixin):
        def __init__(self, spec, msl): self.spec, self.msl = spec, msl
        def fit(self, X, y=None):
            self.b_ = Binner(self.spec, min_samples_leaf=self.msl).fit(X, y)
            self.cols_ = onehot(self.b_.transform(X)).columns; return self
        def transform(self, X):
            return onehot(self.b_.transform(X)).reindex(columns=self.cols_, fill_value=0.0)
    honest = make_pipeline(OneHotBins({"age": ("supervised", 6), "income": ("supervised", 6)}, 20),
                           LogisticRegression(max_iter=1000))
    honest_auc = cv_auc(honest, X, y)
    assert leaky_auc > honest_auc + 0.003, (leaky_auc, honest_auc)


def test_resolution_report_sums_to_one():
    X, y = make()
    b = Binner({"age": ("quantile", 6), "income": ("domain", [20000, 40000, 80000])}).fit(X)
    r = resolution_report(b, X, y)
    assert np.allclose(r["between_share"] + r["within_share"], 1.0, atol=0.01)


def test_more_bins_keep_more_resolution_until_they_do_not():
    X, y = make()
    shares = []
    for k in (2, 4, 8, 16):
        b = Binner({"age": ("quantile", k)}).fit(X)
        shares.append(resolution_report(b, X, y).loc[0, "between_share"])
    assert shares == sorted(shares)          # monotone in k on train...
    # ...but the CV score is not:
    aucs = [cv_auc(LogisticRegression(max_iter=1000),
                   onehot(Binner({"age": ("quantile", k)}).fit(X).transform(X)), y)
            for k in (2, 4, 8, 32)]
    assert aucs[2] >= aucs[3] - 0.01         # 32 bins is no better than 8`,
        notes: [
          { t: "p", text: "**The linear model gains eight points on the U-shaped effect and loses on the linear one.** Same transformer, same model: binning is a feature where the effect is non-monotonic and a handicap where it is already a line. The tests assert both directions." },
          { t: "callout", kind: "insight", title: "between_share is what binning kept", body: [
            { t: "p", text: "Between-bin variance over total variance is the fraction of the target's spread the bins can still explain. **It rises monotonically with more bins on training data — and the CV score does not**, because past a point each extra bin is a handful of rows with a noisy coefficient." },
            { t: "p", text: "The report puts a number on the loss; the CV puts a number on the gain; the bin count is where they cross." }
          ]},
          { t: "p", text: "**Every edge convention is a test.** Exactly 25 lands in `(−∞, 25]`, a value of 5 lands in the first bin rather than becoming NaN, 200 lands in the last — and a real NaN stays NaN so the missingness indicator can see it. Three of those are silent failures without the assertion." },
          { t: "p", text: "**The supervised binner fit outside the CV scores higher than the honest one**, because its edges were chosen with the validation fold's labels. It is target encoding's leak in a different costume, and the fix is the same: the binner goes inside the pipeline so it refits per fold." },
          { t: "p", text: "**The gradient booster is not helped by any binning here.** It reads the raw feature and splits where it wants; the bins only offer it a coarser version. Binning a tree's input is a habit, not a technique." },
          { t: "p", text: "**Domain edges have no fit and no leak.** They are the only strategy whose test checks nothing about the training data — because the edges came from a rule, and a rule does not shift between train and test." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A logistic regression on raw `age` scores AUC 0.51 for a target that is high for the young and the old. Binning age into six intervals gives 0.68. Why?",
          options: [
            "Binning removed outliers",
            "A line cannot be U-shaped — one coefficient per bin lets the linear model follow a non-monotonic effect as a step function",
            "The bins are on a better scale",
            "Six features beat one"
          ],
          answer: 1,
          why: "Binning gives a linear model a non-linear feature: six coefficients that go high, low, low, high trace the U. A tree found the U on its own and scores 0.70 raw — and 0.67 on the bins, because it could only split at the six edges instead of wherever it wanted."
        }
      ]
    }
  ],

  takeaways: [
    "**Binning throws away information on purpose** — 43 and 44 become the same — and the question is whether that difference was ever going to matter.",
    "**Equal-width edges assume the scale means something; equal-frequency assume the ranks do; supervised edges assume the target knows best.**",
    "**On skewed data, equal-width bins are one full bin and four empty ones**; equal-frequency bins are populated but the top one spans two orders of magnitude.",
    "**Domain edges — a legal age, a contract threshold — have no fit step and cannot leak.** Where a rule exists, use it.",
    "**Quantile and supervised edges are fit steps**: fit on train with `retbins=True`, store, apply with `cut`; `qcut` on the test set is a different binning.",
    "**A supervised binner uses y** and leaks exactly like target encoding if fit outside the CV.",
    "**`right=` and `include_lowest=` decide where a value on an edge lands, silently** — test a value exactly on each edge and the minimum.",
    "**For a linear model, binning turns one coefficient into one per bin** — a step function that follows a U-shape a line cannot.",
    "**For a tree, binning removes the ability to split inside an interval** — a coarser version of a feature it already reads.",
    "**Bin count: too few loses resolution, too many makes each coefficient noise**; between-bin variance rises with k on train and the CV score plateaus.",
    "**Binarisation is one cut, and it is the honest representation** when the threshold is a rule, a presence, or a saturation point.",
    "**A depth-1 tree's threshold is the best single cut for the target** — and a fit on y.",
    "**Keep the raw or logged feature alongside a flag** when the tail matters; a cut at 100 makes 101 and 10,000 identical."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why should `pd.qcut` not be applied to the test set directly?",
        options: [
          "It is slower than `cut`",
          "It computes new quantile edges from the test distribution — a different binning from training, and a leak of test-set information into the feature definition",
          "It cannot handle duplicates",
          "It returns intervals rather than integers"
        ],
        answer: 1,
        why: "The edges are the fit. `qcut(..., retbins=True)` on training data returns them; `cut(test, edges)` applies them. The same rule holds for supervised edges, which additionally used y and belong inside the CV loop."
      },
      {
        stem: "A gradient-boosting model scores 0.70 on a raw feature and 0.67 after the feature is binned into six intervals. What happened?",
        options: [
          "The bins were too wide",
          "The tree could only split at the six edges instead of wherever the target changed — binning gave it a coarser version of a feature it already knew how to read",
          "One-hot encoding was needed",
          "The bins introduced NaN"
        ],
        answer: 1,
        why: "Trees find their own thresholds. Binning a tree's input can only remove split points, so it is neutral at best. It helps a linear model, which otherwise has one coefficient and one direction — and that asymmetry is the whole decision."
      },
      {
        stem: "`pd.cut([18], [0, 18, 65])` with the default `right=True` puts 18 in which bin?",
        options: [
          "(18, 65] — the adult bin",
          "(0, 18] — the child bin, because right-closed intervals include their upper edge",
          "Neither; it raises",
          "NaN"
        ],
        answer: 1,
        why: "Right-closed means `(a, b]`, so 18 belongs to the interval ending at 18. For an 'adult from 18' rule that is wrong, and it is silent. `right=False` gives `[18, 65)`. State the convention and test the edge value."
      },
      {
        stem: "When is binarising a feature at a single threshold the right representation?",
        options: [
          "Whenever the feature is skewed",
          "When the threshold is a rule in the world, the signal is presence rather than amount, or the effect saturates past a point",
          "Never; it loses too much",
          "Only for text data"
        ],
        answer: 1,
        why: "`age >= 18`, `spend > 0`, `days_overdue > 90` — the world already binarised these, or the amount past the cut carries no further signal. Everything but the sign is lost, so keep the raw feature alongside the flag when the tail matters."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When does binning a continuous feature help, and when does it hurt?",
        strong: "It helps a linear model with a non-monotonic effect — one coefficient per bin becomes a step function that follows a U-shape a line cannot — and it helps any model when a scorecard must be printed or outliers need a bin to fall into. It hurts a tree, which already splits wherever it wants and can now only cut at your edges. And it hurts a linear model on an effect that was already linear, by trading a clean slope for k noisy coefficients. The model downstream decides.",
        answer: [
          { t: "p", text: "The tree-versus-linear asymmetry is the whole answer; the scorecard case is the honest exception." }
        ]
      },
      {
        level: "advanced",
        q: "How would you choose bin edges?",
        strong: "From the domain first — a legal age, a contract threshold, a physical limit — because those need no fitting and cannot leak. Failing that, quantiles on training data so every bin is populated, stored and applied with `cut`. Supervised edges from a one-feature tree or WoE merging when the target should decide — and then the binner lives inside the CV, because it used y. And I would test a value exactly on each edge and at the minimum, because `right=` and `include_lowest=` fail silently.",
        answer: [
          { t: "p", text: "Ordering the sources by how much they can leak — domain, then unsupervised, then supervised — is the structure of a good answer." }
        ]
      },
      {
        level: "advanced",
        q: "How do you measure what binning cost?",
        strong: "Between-bin variance of the target over its total variance — the share the bins can still explain — is what was kept; the remainder is within-bin spread the model is now blind to. It rises with the number of bins on training data, while the cross-validated score plateaus and then falls as each bin becomes a handful of rows with a noisy coefficient. Where the two cross is the bin count. And on a tree, both numbers are beside the point: the raw feature already had all the resolution.",
        answer: [
          { t: "p", text: "Having a number for the loss, not just an intuition, is what makes the trade-off a decision rather than a habit." }
        ]
      }
    ]
  }
});
