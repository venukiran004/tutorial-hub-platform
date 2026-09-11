/* ============================================================================
   LESSON 7.9 — Interactions, Ratios and Aggregations
   ========================================================================= */
EC.receiveLesson({
  id: "7.9",

  lede: "**The features that carry the most signal are usually not in the raw table — they are relationships between columns: a ratio, a product, a difference from the group's typical value.** Spend divided by tenure says more than either alone. Spend relative to the customer's region says more still. And the moment a feature is computed from a group that includes the row's own target, the model has been handed the answer — which is why the aggregation features that carry the most are also the ones that leak most easily.",

  objectives: [
    "Build interaction, ratio and difference features and say what each expresses that its parts do not",
    "Use polynomial features deliberately and know why they explode",
    "Compute group-level aggregations as features and broadcast them back to rows",
    "Recognise when a group aggregation includes the row's own target and fix it out-of-fold",
    "Construct time-windowed aggregations that are strictly causal"
  ],

  prerequisites: ["4.2", "7.2", "7.8"],

  blocks: [

    { t: "h2", n: "01", text: "Relationships between columns", id: "relationships" },

    { t: "p", text: "A linear model sees each feature on its own. **If the outcome depends on two features together — high income *and* young, large order *for this customer* — the model needs a column that expresses the combination**, because a sum of separate effects cannot. Trees find some of these on their own; ratios, they mostly do not." },

    { t: "dl", items: [
      ["Interaction", "A feature that captures two variables acting together: their product, or one conditioned on the other. `age × income`, `is_weekend × hour`."],
      ["Ratio", "One quantity per unit of another: spend per day of tenure, clicks per impression, debt to income. Normalises for scale and often is the quantity the domain actually reasons about."],
      ["Difference", "A gap between two related quantities: price minus cost, actual minus expected, this month minus last. Often the signal is the gap, not either level."],
      ["Polynomial features", "All products and powers up to a degree: for `(a, b)` at degree 2, `a, b, a², ab, b²`. Mechanical, complete, and combinatorially large."],
      ["Group aggregation feature", "A statistic over the rows sharing a key — mean spend per region, count of orders per customer — attached back to each row."],
      ["Deviation from group", "A row's value minus its group's aggregate: how does this customer compare to customers like them. The most common form of contextual feature."]
    ]},

    { t: "viz",
      title: "Why a sum of separate effects cannot express an interaction",
      caption: "The outcome is high only when both x and y are high. A linear model fits one slope per axis and predicts a diagonal ramp — high when either is high. The product x·y is high only in the top-right corner, which is the shape the data has.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Three heatmap-style grids: the true outcome high only in the top-right corner, a linear fit showing a diagonal ramp, and the product feature matching the corner">
  <g transform="translate(40,40)">
    <text x="0" y="-12" class="s-label" style="fill:var(--ink-2)">truth: high iff x AND y high</text>
    <g>
      <rect x="0" y="0" width="60" height="60" style="fill:var(--accent);fill-opacity:.06"/><rect x="60" y="0" width="60" height="60" style="fill:var(--accent);fill-opacity:.08"/><rect x="120" y="0" width="60" height="60" style="fill:var(--accent);fill-opacity:.85"/>
      <rect x="0" y="60" width="60" height="60" style="fill:var(--accent);fill-opacity:.05"/><rect x="60" y="60" width="60" height="60" style="fill:var(--accent);fill-opacity:.06"/><rect x="120" y="60" width="60" height="60" style="fill:var(--accent);fill-opacity:.1"/>
      <rect x="0" y="120" width="60" height="60" style="fill:var(--accent);fill-opacity:.04"/><rect x="60" y="120" width="60" height="60" style="fill:var(--accent);fill-opacity:.05"/><rect x="120" y="120" width="60" height="60" style="fill:var(--accent);fill-opacity:.06"/>
    </g>
    <rect x="0" y="0" width="180" height="180" style="fill:none;stroke:var(--line)"/>
    <text x="0" y="200" class="s-sub" style="fill:var(--ink-3)">x →</text>
    <text x="-30" y="12" class="s-sub" style="fill:var(--ink-3)">y↑</text>
  </g>
  <g transform="translate(320,40)">
    <text x="0" y="-12" class="s-label" style="fill:var(--crit)">linear: β₁x + β₂y — a ramp</text>
    <g>
      <rect x="0" y="0" width="60" height="60" style="fill:var(--crit);fill-opacity:.35"/><rect x="60" y="0" width="60" height="60" style="fill:var(--crit);fill-opacity:.55"/><rect x="120" y="0" width="60" height="60" style="fill:var(--crit);fill-opacity:.75"/>
      <rect x="0" y="60" width="60" height="60" style="fill:var(--crit);fill-opacity:.2"/><rect x="60" y="60" width="60" height="60" style="fill:var(--crit);fill-opacity:.35"/><rect x="120" y="60" width="60" height="60" style="fill:var(--crit);fill-opacity:.55"/>
      <rect x="0" y="120" width="60" height="60" style="fill:var(--crit);fill-opacity:.06"/><rect x="60" y="120" width="60" height="60" style="fill:var(--crit);fill-opacity:.2"/><rect x="120" y="120" width="60" height="60" style="fill:var(--crit);fill-opacity:.35"/>
    </g>
    <rect x="0" y="0" width="180" height="180" style="fill:none;stroke:var(--line)"/>
    <text x="0" y="200" class="s-sub" style="fill:var(--crit)">wrong in two corners:</text>
    <text x="0" y="218" class="s-sub" style="fill:var(--crit)">high-x-low-y is predicted high</text>
  </g>
  <g transform="translate(600,40)">
    <text x="0" y="-12" class="s-label" style="fill:var(--good)">with x·y — the corner</text>
    <g>
      <rect x="0" y="0" width="60" height="60" style="fill:var(--good);fill-opacity:.06"/><rect x="60" y="0" width="60" height="60" style="fill:var(--good);fill-opacity:.12"/><rect x="120" y="0" width="60" height="60" style="fill:var(--good);fill-opacity:.85"/>
      <rect x="0" y="60" width="60" height="60" style="fill:var(--good);fill-opacity:.05"/><rect x="60" y="60" width="60" height="60" style="fill:var(--good);fill-opacity:.08"/><rect x="120" y="60" width="60" height="60" style="fill:var(--good);fill-opacity:.15"/>
      <rect x="0" y="120" width="60" height="60" style="fill:var(--good);fill-opacity:.04"/><rect x="60" y="120" width="60" height="60" style="fill:var(--good);fill-opacity:.05"/><rect x="120" y="120" width="60" height="60" style="fill:var(--good);fill-opacity:.06"/>
    </g>
    <rect x="0" y="0" width="180" height="180" style="fill:none;stroke:var(--line)"/>
    <text x="0" y="200" class="s-sub" style="fill:var(--good)">the product is large only</text>
    <text x="0" y="218" class="s-sub" style="fill:var(--good)">where both are — one coefficient</text>
  </g>
  <text x="40" y="282" class="s-sub" style="fill:var(--ink-3)">A tree finds the corner with two splits (x &gt; t₁, then y &gt; t₂). A linear model needs to be handed the product.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "interactions, ratios and differences — and what each buys", code: `
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.pipeline import make_pipeline

rng = np.random.default_rng(0)
n = 6000
age = rng.uniform(20, 70, n)
income = rng.lognormal(10.5, 0.4, n)
tenure_days = rng.integers(1, 2000, n)
spend = rng.gamma(2, 200, n) * (tenure_days / 365 + 0.5)
df = pd.DataFrame({"age": age, "income": income, "tenure_days": tenure_days, "spend": spend})

# A TARGET WITH A GENUINE INTERACTION: young AND high-income.
z_age = (50 - age) / 15; z_inc = (np.log(income) - 10.5) / 0.4
logit = -1 + 1.2 * z_age * z_inc                              # the PRODUCT
y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

def cv(model, X):
    return round(cross_val_score(model, X, y, cv=5, scoring="roc_auc").mean(), 3)

lin = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))

# LINEAR ON THE TWO FEATURES: it cannot draw a corner.
cv(lin, df[["age", "income"]])                                # 0.53 -- near chance

# WITH THE INTERACTION ADDED:
df["age_x_income"] = df["age"] * np.log(df["income"])
cv(lin, df[["age", "income", "age_x_income"]])                # 0.79
#
# One product column and the linear model finds the corner. This is
# the general result: if the effect of one feature DEPENDS ON the
# level of another, the product is the feature.

# A TREE FINDS IT ALONE:
cv(HistGradientBoostingClassifier(random_state=0), df[["age", "income"]])          # 0.80
cv(HistGradientBoostingClassifier(random_state=0), df[["age", "income", "age_x_income"]])   # 0.80
#
# Two splits -- age < 40, then income > 50k -- carve the corner. The
# product adds nothing a tree did not have. Interactions are a
# LINEAR-MODEL feature; for trees they are a shortcut at best.

# RATIOS: the domain's own quantities, and trees DO need these.
df["spend_per_day"] = df["spend"] / df["tenure_days"]
df["debt_to_income"] = rng.uniform(0, 50_000, n) / df["income"]
#
# A tree can approximate a ratio with many splits on both parts, but
# a ratio like spend/tenure is a single threshold-able quantity that
# the tree would otherwise need a staircase of splits to build. Hand
# it over. And a ratio is the thing a person would actually reason
# about -- "spends 3 a day" -- which makes the model explicable.

# RATIOS NEED A GUARD: the denominator.
df["spend_per_day"] = df["spend"] / df["tenure_days"].clip(lower=1)
#
# tenure_days of 0 -> inf. clip(lower=1), or NaN-and-flag, or add a
# small epsilon -- a decision, made visibly. And a ratio of two
# skewed things is often more skewed than either; log it (7.5).

# DIFFERENCES: when the gap is the signal.
df["income_vs_age_expected"] = df["income"] - df.groupby(pd.cut(df["age"], 5), observed=True)["income"].transform("median")
#
# "Earns more than people their age" is a different fact from "earns
# a lot". The difference from the age-band median expresses it; the
# raw income does not. This is a group feature (section 3) in
# disguise, and the same leakage caveat applies if the group
# statistic ever involves the target.

# POLYNOMIAL FEATURES: every product and power, mechanically.
poly = PolynomialFeatures(degree=2, include_bias=False)
P = poly.fit_transform(df[["age", "income", "tenure_days"]])
poly.get_feature_names_out()
# ['age', 'income', 'tenure_days', 'age^2', 'age income', 'age tenure_days',
#  'income^2', 'income tenure_days', 'tenure_days^2']
P.shape                                                       # (n, 9)
#
# 3 features -> 9 at degree 2. 20 features -> 230. 50 -> 1,325.
# 20 features at degree 3 -> 1,770. The count is C(d + k, k) - 1 and
# it explodes. Most of the columns are noise; a regularised linear
# model can survive it, and it is still a poor way to find the two
# interactions that matter among 230 candidates.
#
# interaction_only=True drops the squares. Degree 2 with a strong
# regulariser is the practical ceiling; beyond that, a tree is
# looking for the same interactions more efficiently.

# THE HONEST WAY TO FIND INTERACTIONS: let a tree model find them,
# then hand the top ones to the linear model as explicit products.
# Or: fit the linear model, look at the residuals against pairs of
# features, and add the product where the residual has structure.
`,
      hl: [24, 28, 43, 66],
      caption: "**One product column takes the linear model from 0.53 to 0.79; the tree was at 0.80 without it.** Interactions are a linear-model feature. Ratios are different — a tree needs a staircase of splits to build `spend / tenure`, and the ratio hands it over in one column."
    },

    { t: "callout", kind: "insight", title: "Products are for linear models; ratios are for everyone", body: [
      { t: "p", text: "A tree carves an interaction with two sequential splits and needs no product column. It cannot carve a ratio cleanly — `spend / tenure > 3` is a diagonal line in `(spend, tenure)` space, and a tree can only draw axis-aligned rectangles, so it approximates the diagonal with a staircase." },
      { t: "p", text: "**Hand every model the ratios the domain reasons in.** Hand linear models the products too. Hand trees products only when a two-split path would be unusually deep." }
    ]},

    { t: "h2", n: "02", text: "Group aggregations as features", id: "group" },

    { t: "p", text: "**\"How does this row compare to rows like it\" is a feature with a groupby inside.** The customer's mean order value, the region's conversion rate, the product category's return rate — computed over the group and attached to each member. `transform` (4.2) is the mechanism; the question is what goes into the aggregate." },

    { t: "code", lang: "python", title: "group features, and the row that includes itself", code: `
orders = pd.DataFrame({
    "order_id": range(1, 13),
    "customer": ["a", "a", "a", "b", "b", "c", "c", "c", "c", "d", "d", "e"],
    "region":   ["n", "n", "n", "s", "s", "n", "n", "n", "n", "s", "s", "s"],
    "amount":   [50, 70, 60, 200, 180, 30, 40, 35, 45, 300, 320, 90],
    "returned": [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
})

# NON-TARGET AGGREGATIONS: safe to compute on the whole training set.
g = orders.groupby("customer")["amount"]
orders["cust_mean_amount"] = g.transform("mean")
orders["cust_n_orders"]    = g.transform("size")
orders["cust_max_amount"]  = g.transform("max")
orders["amount_vs_cust_mean"] = orders["amount"] - orders["cust_mean_amount"]
orders["amount_share_of_cust"] = orders["amount"] / g.transform("sum")

r = orders.groupby("region")["amount"]
orders["region_median_amount"] = r.transform("median")
orders["amount_vs_region"] = orders["amount"] / orders["region_median_amount"]
#
# These use the FEATURE column (amount), not the target. A row's own
# amount is in its customer's mean -- and that is fine, because the
# amount is known at prediction time. The row is comparing itself
# to its peers, including itself; on a customer with one order the
# comparison is 1.0, which is honest.

# THE ONE THAT INCLUDES THE ROW'S OWN AMOUNT can still be misleading
# for small groups. Exclude self when the group is tiny:
cust_sum = g.transform("sum"); cust_n = g.transform("size")
orders["cust_mean_excl_self"] = (cust_sum - orders["amount"]) / (cust_n - 1).replace(0, np.nan)
#
# "What do this customer's OTHER orders look like" -- NaN for a
# first order, which is the truth. Leave-one-out on a non-target
# column is a design choice, not a leak fix.

# TARGET AGGREGATIONS: the leak.
orders["cust_return_rate"] = orders.groupby("customer")["returned"].transform("mean")
#
# Customer c's return rate is 0.25, and one of the four rows IS the
# return. Each row's own label is in its own feature. On customer e
# (one order) the feature IS the label. This is target encoding
# (7.2) with a groupby key, and it leaks identically.

# THE FIX IS THE SAME: out-of-fold.
from sklearn.model_selection import KFold
def oof_group_mean(df, key, target, n_splits=5, seed=0, prior_weight=5):
    out = np.full(len(df), np.nan)
    prior = df[target].mean()
    for tr, te in KFold(n_splits, shuffle=True, random_state=seed).split(df):
        stats = df.iloc[tr].groupby(key)[target].agg(["sum", "count"])
        s = stats.reindex(df.iloc[te][key])
        out[te] = ((s["sum"].fillna(0) + prior_weight * prior) /
                   (s["count"].fillna(0) + prior_weight)).to_numpy()
    return out
orders["cust_return_rate_oof"] = oof_group_mean(orders, "customer", "returned")
#
# Each row's rate is computed from the OTHER folds' rows for that
# customer, smoothed toward the prior. A row never sees its own
# label. At prediction time, the full-training statistics apply.

# WHICH AGGREGATIONS, for which question:
#   mean / median      the group's typical level
#   std / IQR          how variable the group is (a customer with
#                      erratic spend is a different customer)
#   min / max          the group's range; max is often "the big one"
#   count / size       how much history there is -- and how much to
#                      trust the other aggregates
#   nunique            breadth: distinct products bought, distinct
#                      devices used
#   first / last       the earliest and latest value (needs an order)
#   sum                a total, when the total is the thing
#
# THE COUNT IS THE ONE PEOPLE FORGET. A customer mean over 200
# orders and over 1 order are both "the mean"; the count says which
# to believe, and a model given both learns to weight accordingly.

# MULTI-KEY GROUPS -- the interaction of two categoricals:
orders["cust_region_mean"] = orders.groupby(["customer", "region"])["amount"].transform("mean")
#
# Finer groups, fewer rows each, noisier statistics. Smoothing toward
# the coarser group (customer alone, then region alone, then global)
# is the hierarchical version; the OOF function above does the
# simple form with prior_weight.

# NESTED: the group's group.
region_mean = orders.groupby("region")["amount"].transform("mean")
orders["cust_vs_region"] = orders["cust_mean_amount"] / region_mean
#
# "This customer spends 1.4x the regional norm." Two levels of
# aggregation, one ratio, and a feature that is portable across
# regions in a way the raw customer mean is not.
`,
      hl: [19, 37, 42, 72],
      caption: "**`cust_return_rate` on a customer with one order is that order's label.** A group aggregate of the target is target encoding with a groupby key, and it leaks identically — the fix is the same out-of-fold computation."
    },

    { t: "h2", n: "03", text: "Time-windowed aggregations", id: "windows" },

    { t: "p", text: "**A group aggregate over all of a customer's history uses orders that had not happened yet.** For a row dated March, the mean over the customer's orders includes June's. The windowed version — the mean over the 90 days *before* this order — is what a production system could actually compute, and it is a rolling window (4.3) with a shift." },

    { t: "code", lang: "python", title: "as-of aggregations: the group's history up to now", code: `
ev = pd.DataFrame({
    "customer": ["a"] * 5 + ["b"] * 4,
    "ts": pd.to_datetime(["2026-01-05", "2026-01-20", "2026-02-10", "2026-03-01", "2026-03-15",
                          "2026-02-01", "2026-02-15", "2026-03-10", "2026-03-20"]),
    "amount": [50, 70, 60, 80, 90, 200, 180, 220, 210],
}).sort_values(["customer", "ts"]).reset_index(drop=True)

# THE ALL-HISTORY MEAN uses the future:
ev["cust_mean_all"] = ev.groupby("customer")["amount"].transform("mean")
#
# Row 0 (a, Jan 5) gets the mean of all five of a's orders, four of
# which happen later. In production on Jan 5, only row 0 exists.

# THE EXPANDING MEAN, SHIFTED: everything before this row.
ev["cust_mean_before"] = (ev.groupby("customer")["amount"]
                            .transform(lambda s: s.expanding().mean().shift(1)))
ev["cust_n_before"] = ev.groupby("customer").cumcount()
#
# Row 0: NaN (no history). Row 1: 50. Row 2: 60. Causal by
# construction -- see 4.3 and 5.6 for the same pattern in rolling
# and in SQL.

# A TIME WINDOW: the last 60 days before this order, per customer.
ev = ev.set_index("ts")
ev["cust_sum_60d"] = (ev.groupby("customer")["amount"]
                        .rolling("60D", closed="left").sum()
                        .reset_index(level=0, drop=True))
ev["cust_n_60d"] = (ev.groupby("customer")["amount"]
                      .rolling("60D", closed="left").count()
                      .reset_index(level=0, drop=True))
ev = ev.reset_index()
ev[["customer", "ts", "amount", "cust_mean_before", "cust_sum_60d", "cust_n_60d"]]
#   customer         ts  amount  cust_mean_before  cust_sum_60d  cust_n_60d
# 0        a 2026-01-05      50               NaN           NaN         0.0
# 1        a 2026-01-20      70              50.0          50.0         1.0
# 2        a 2026-02-10      60              60.0         120.0         2.0
# 3        a 2026-03-01      80              60.0         130.0         2.0   <- Jan 5 has dropped out
# 4        a 2026-03-15      90              65.0         140.0         2.0
#
# closed="left" excludes the current row. The window is "the 60 days
# ending just before this instant". NaN for the first row, and the
# count says how much history the sum is based on.

# THE SAME FOR A TARGET-DERIVED AGGREGATE -- causal AND out-of-fold
# at once, because time order IS the fold:
ev["returned"] = [0, 0, 1, 0, 0, 0, 1, 0, 0]
ev["cust_return_rate_before"] = (ev.groupby("customer")["returned"]
                                   .transform(lambda s: s.expanding().mean().shift(1)))
#
# Each row sees the return rate of that customer's PREVIOUS orders.
# No row's own label is in its feature, and no later label is either.
# This is the time-ordered target encoding from 7.2, and for event
# data it is the only honest form.

# THE FEATURE SET THIS PRODUCES, per event:
#   count in window       how active recently
#   sum / mean in window  how much, typically
#   max in window         the largest recent event
#   time since last       recency (7.8)
#   rate of a flag        the target's history, causally
#   ratio of this to the window mean   "is this order unusual for them"
ev["amount_vs_recent"] = ev["amount"] / (ev["cust_sum_60d"] / ev["cust_n_60d"].replace(0, np.nan))

# MULTIPLE WINDOWS: 7d, 30d, 90d, all-history. Short windows react;
# long windows stabilise; the ratio between them is a trend feature:
# spend_7d / spend_90d > 1 means "accelerating". Each window is one
# rolling call; the set is the feature block.

# THE CORRUPTION TEST, applied to the block (see 4.3, 7.8):
def assert_causal(feature_fn, ev, at):
    a = feature_fn(ev)
    corrupted = ev.copy()
    corrupted.loc[corrupted["ts"] >= at, "amount"] *= 1000
    corrupted.loc[corrupted["ts"] >= at, "returned"] = 1
    b = feature_fn(corrupted)
    before = ev["ts"] < at
    for c in a.columns:
        if not np.allclose(a.loc[before, c].astype(float), b.loc[before, c].astype(float), equal_nan=True):
            raise AssertionError(f"{c} depends on the future")
#
# Run it on every feature block. It is the only test that catches
# the all-history mean, the un-shifted expanding, and the closed=
# "right" window in one pass.
`,
      hl: [7, 15, 24, 45],
      caption: "**Row 0's all-history mean uses four orders that happen later.** The expanding mean shifted by one, or a time window with `closed=\"left\"`, is what a production system on 5 January could actually compute."
    },

    { t: "table",
      head: ["Feature", "Built from", "Leaks when", "Causal form"],
      rows: [
        ["Product `a × b`", "Two features", "Never, if `a` and `b` do not", "—"],
        ["Ratio `a / b`", "Two features", "Never; guard the zero denominator", "—"],
        ["Group mean of a **feature**", "Feature column, group key", "Never — the feature is known at prediction time", "Optionally exclude self for tiny groups"],
        ["Group mean of the **target**", "Target column, group key", "**Always**, naively — the row's own label is in it", "Out-of-fold with smoothing (7.2)"],
        ["Group count", "Group key", "Only if computed over rows that do not exist yet", "Count of rows *before* this one"],
        ["All-history mean per entity", "Feature, entity, time", "**When the entity has future rows** — they are in the mean", "Expanding mean, shifted by one"],
        ["Rolling window per entity", "Feature, entity, time", "When `closed=\"right\"` or centred", "`closed=\"left\"`, or `.shift(1)`"],
        ["Rolling rate of the target", "Target, entity, time", "When the current row or any later row is in the window", "Expanding/rolling of the target, shifted — time order is the fold"]
      ],
      caption: "**Two independent axes of leakage: the target, and time.** A feature can leak through either, and the windowed target aggregate can leak through both — its causal form is out-of-fold *and* shifted at once, which time ordering gives for free."
    },

    { t: "p", text: "A pair of coordinates is the most common feature that arrives as two numbers and means neither of them. **Latitude and longitude are positions, not quantities**: a model that reads them raw learns a grid of axis-aligned splits or, worse, a linear effect of 'eastness'. The features that carry the signal are distances and densities computed *from* the position — and the profiling step that precedes them catches swapped columns, a `(0, 0)` sentinel in the Gulf of Guinea, and points outside the bounding box the data claims to cover." },

    { t: "code", lang: "python", title: "Coordinates: distances and neighbourhoods, not degrees",
      hl: [5, 15, 22, 28],
      code: `rng = np.random.default_rng(9)
n = 5_000
lat = rng.normal(51.5, 0.12, n); lon = rng.normal(-0.12, 0.18, n)        # a city-sized cloud

# --- profiling first: the three faults every coordinate column has had at least once ---
box = dict(lat=(49.9, 58.7), lon=(-8.2, 1.8))                            # the region the data claims to cover
print(((lat < box["lat"][0]) | (lat > box["lat"][1])).sum())             # rows outside the box: swapped lat/lon, or garbage
print(((lat == 0) & (lon == 0)).sum())                                   # the (0, 0) sentinel: null, not a place
print((np.abs(lat) > 90).sum(), (np.abs(lon) > 180).sum())               # impossible values

# --- distance: haversine on the sphere, in kilometres, vectorised ---
def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi, dlmb = p2 - p1, np.radians(lon2 - lon1)
    h = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlmb / 2) ** 2
    return 2 * 6371.0 * np.arcsin(np.sqrt(h))

hubs = np.array([[51.5074, -0.1278], [51.4700, -0.4543], [51.5033, 0.0553]])   # centre, airport, docks
d = haversine_km(lat[:, None], lon[:, None], hubs[None, :, 0], hubs[None, :, 1])   # (n, 3) via broadcasting (1.2)
feat = pd.DataFrame({"km_to_centre": d[:, 0], "km_to_nearest_hub": d.min(axis=1),
                     "nearest_hub": d.argmin(axis=1)})

# --- density: bin the map and count neighbours; rounding is a geohash with square cells ---
cell = pd.Series(list(zip((lat / 0.01).round().astype(int), (lon / 0.015).round().astype(int))))   # ~1 km cells
feat["points_in_cell"] = cell.map(cell.value_counts())                   # training rows only, in the pipeline (8.5)

# --- rotation: tree models split on axis-aligned thresholds, so give them diagonals too ---
for deg in (30, 60):
    t = np.radians(deg)
    feat[f"rot{deg}_x"] = lat * np.cos(t) - lon * np.sin(t)
    feat[f"rot{deg}_y"] = lat * np.sin(t) + lon * np.cos(t)

print(feat.describe().T[["mean", "min", "max"]].round(2))`,
      caption: "Distance to the places that matter, the number of neighbours in a cell, and rotated axes for a tree — three features that say what a position *means* for the target. The cell count is a training-set statistic and belongs in a transformer; the distances are pure functions of the row and do not."
    },

    { t: "callout", kind: "insight", title: "Coordinates in a group aggregation are a leak in disguise", body: [
      { t: "p", text: "A cell-level target mean — 'the default rate in this postcode' — is target encoding (7.2) on a spatial key, with every caveat that lesson attached: out-of-fold, smoothed, and never computed on rows the model will be scored on. The k-nearest-neighbours version ('the mean outcome of the ten closest training points') is the same thing with a softer boundary and the same leak if the point's own row is among the ten." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A feature block for an event stream, with its leaks caught",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "From a per-customer event log with amounts and a return flag, build the feature block for each event: ratios and differences from the customer's history, multi-window aggregates (7, 30, 90 days), the customer's prior return rate, and a deviation-from-region feature. Every feature must be causal. Then plant three leaky versions — an all-history mean, a same-row target rate, and a window with the wrong `closed` — and show the corruption test catching each." },
        { t: "p", text: "Finally, show that the linear model needs the interaction and ratio columns and the tree needs the ratio but not the interaction." }
      ],
      requirements: [
        "Multi-window sum/count/mean per customer, `closed=\"left\"`.",
        "Prior return rate per customer via shifted expanding mean.",
        "Ratio of this event's amount to the recent mean; difference from the region's causal median.",
        "A corruption test that passes on the block and names each of three planted leaks.",
        "Linear-vs-tree comparison on the interaction and the ratio.",
        "Tests for every claim."
      ],
      hint: "The region's causal median is the hard one: it needs the median over all region events before this timestamp, across customers. A merge_asof against a per-region expanding median, or a sort-then-expanding on the region key, gets it.",
      solution: {
        lang: "python",
        title: "event_features.py",
        code: `import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score


WINDOWS = ("7D", "30D", "90D")


def event_features(ev):
    """Causal per-event features. ev: customer, region, ts, amount, returned."""
    d = ev.sort_values(["customer", "ts"], kind="stable").reset_index(drop=True)
    f = d[["customer", "region", "ts", "amount", "returned"]].copy()

    # --- per-customer windows, excluding the current event --------------
    di = d.set_index("ts")
    for w in WINDOWS:
        r = di.groupby("customer")["amount"].rolling(w, closed="left")
        f[f"sum_{w}"] = r.sum().reset_index(level=0, drop=True).to_numpy()
        f[f"n_{w}"] = r.count().reset_index(level=0, drop=True).to_numpy()
        f[f"mean_{w}"] = f[f"sum_{w}"] / f[f"n_{w}"].replace(0, np.nan)

    # --- all history before this event ----------------------------------
    g = d.groupby("customer")
    f["n_before"] = g.cumcount()
    f["mean_before"] = g["amount"].transform(lambda s: s.expanding().mean().shift(1))
    f["max_before"] = g["amount"].transform(lambda s: s.expanding().max().shift(1))
    f["return_rate_before"] = g["returned"].transform(lambda s: s.expanding().mean().shift(1))
    f["days_since_prev"] = g["ts"].diff().dt.days

    # --- ratios and differences -------------------------------------------
    f["amount_vs_mean_30D"] = f["amount"] / f["mean_30D"]
    f["amount_vs_max_before"] = f["amount"] / f["max_before"]
    f["accel_7_over_90"] = f["mean_7D"] / f["mean_90D"]
    f["amount_x_nbefore"] = f["amount"] * np.log1p(f["n_before"])         # an interaction

    # --- region's causal median: all region events strictly before ts ----
    # sort by region and time; expanding median shifted so the current
    # event (and any at the same instant) is excluded
    reg = d[["region", "ts", "amount"]].sort_values(["region", "ts"], kind="stable")
    reg["region_median_before"] = (reg.groupby("region")["amount"]
                                      .transform(lambda s: s.expanding().median().shift(1)))
    f["region_median_before"] = reg["region_median_before"].reindex(d.index).to_numpy() \\
        if reg.index.equals(d.index) else reg.sort_index()["region_median_before"].to_numpy()
    f["amount_vs_region"] = f["amount"] - f["region_median_before"]

    return f.drop(columns=["customer", "region", "ts"])


# =========================================================================
# THE LEAKY VERSIONS -- what not to do, kept for the test
# =========================================================================

def leaky_all_history_mean(ev):
    d = ev.sort_values(["customer", "ts"]).reset_index(drop=True)
    f = event_features(ev)
    f["mean_all"] = d.groupby("customer")["amount"].transform("mean").to_numpy()
    return f

def leaky_target_rate(ev):
    d = ev.sort_values(["customer", "ts"]).reset_index(drop=True)
    f = event_features(ev)
    f["return_rate_all"] = d.groupby("customer")["returned"].transform("mean").to_numpy()
    return f

def leaky_window_closed_right(ev):
    d = ev.sort_values(["customer", "ts"]).reset_index(drop=True)
    f = event_features(ev)
    r = d.set_index("ts").groupby("customer")["amount"].rolling("30D", closed="right")
    f["sum_30D_right"] = r.sum().reset_index(level=0, drop=True).to_numpy()
    return f


# =========================================================================
# THE CORRUPTION TEST
# =========================================================================

def leaking_columns(feature_fn, ev, at):
    ev = ev.sort_values(["customer", "ts"]).reset_index(drop=True)
    a = feature_fn(ev)
    c = ev.copy()
    fut = c["ts"] >= at
    c.loc[fut, "amount"] = c.loc[fut, "amount"] * 1000 + 12345
    c.loc[fut, "returned"] = 1 - c.loc[fut, "returned"]
    b = feature_fn(c)
    before = (ev["ts"] < at).to_numpy()
    bad = []
    for col in a.columns:
        x, y = a[col].to_numpy(float)[before], b[col].to_numpy(float)[before]
        if not np.allclose(x, y, equal_nan=True):
            bad.append(col)
    return bad


# =========================================================================
# DATA
# =========================================================================

def make(n_cust=300, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    for c in range(n_cust):
        region = rng.choice(["n", "s", "e"])
        base = rng.lognormal(4, 0.5)
        n_ev = rng.integers(3, 25)
        t = pd.Timestamp("2025-06-01") + pd.to_timedelta(rng.integers(0, 60), "D")
        for _ in range(n_ev):
            t = t + pd.to_timedelta(rng.integers(1, 30), "D")
            amt = base * rng.lognormal(0, 0.4)
            rows.append({"customer": f"c{c}", "region": region, "ts": t, "amount": amt})
    ev = pd.DataFrame(rows).sort_values(["customer", "ts"]).reset_index(drop=True)
    # RETURN depends on: amount vs the customer's recent mean (ratio),
    # AND an interaction (large amount x new customer)
    f = event_features(ev.assign(returned=0))
    ratio = np.nan_to_num(f["amount_vs_mean_30D"].to_numpy(), nan=1.0)
    newness = 1 / (1 + f["n_before"].to_numpy())
    logit = -2.5 + 1.5 * np.log(ratio) + 3.0 * (np.log(ratio) > 0.5) * newness
    ev["returned"] = (rng.random(len(ev)) < 1 / (1 + np.exp(-logit))).astype(int)
    return ev


# =========================================================================
# TESTS
# =========================================================================

AT = pd.Timestamp("2026-01-01")


def test_block_is_causal():
    ev = make()
    assert leaking_columns(event_features, ev, AT) == []


def test_all_history_mean_is_caught():
    ev = make()
    assert leaking_columns(leaky_all_history_mean, ev, AT) == ["mean_all"]


def test_same_row_target_rate_is_caught():
    ev = make()
    assert leaking_columns(leaky_target_rate, ev, AT) == ["return_rate_all"]


def test_closed_right_window_is_caught():
    ev = make()
    assert leaking_columns(leaky_window_closed_right, ev, AT) == ["sum_30D_right"]


def test_first_event_has_no_history():
    ev = make()
    f = event_features(ev)
    d = ev.sort_values(["customer", "ts"]).reset_index(drop=True)
    first = d.groupby("customer").cumcount() == 0
    assert f.loc[first, "n_before"].eq(0).all()
    assert f.loc[first, "mean_before"].isna().all()
    assert f.loc[first, "return_rate_before"].isna().all()
    assert f.loc[first, "n_30D"].eq(0).all()


def test_window_counts_are_nested():
    ev = make()
    f = event_features(ev)
    assert (f["n_7D"] <= f["n_30D"]).all() and (f["n_30D"] <= f["n_90D"]).all()
    assert (f["n_90D"] <= f["n_before"]).all()


def test_region_median_excludes_current_and_future():
    ev = pd.DataFrame({
        "customer": ["a", "b", "c", "d"], "region": ["n"] * 4,
        "ts": pd.to_datetime(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]),
        "amount": [10.0, 20.0, 1000.0, 30.0], "returned": [0, 0, 0, 0],
    })
    f = event_features(ev)
    d = ev.sort_values(["customer", "ts"]).reset_index(drop=True)
    # customer c (Jan 3): median of {10, 20} = 15; the 1000 is its own row
    idx_c = d.index[d["customer"] == "c"][0]
    assert f.loc[idx_c, "region_median_before"] == 15.0
    idx_a = d.index[d["customer"] == "a"][0]
    assert np.isnan(f.loc[idx_a, "region_median_before"])


def test_ratio_guards_zero_history():
    ev = make()
    f = event_features(ev)
    assert not np.isinf(f["amount_vs_mean_30D"].dropna()).any()


def test_linear_needs_ratio_and_interaction_tree_needs_ratio_only():
    ev = make()
    f = event_features(ev).fillna(0)
    y = ev.sort_values(["customer", "ts"]).reset_index(drop=True)["returned"]
    base = ["amount", "n_before", "mean_30D", "n_30D"]
    with_ratio = base + ["amount_vs_mean_30D"]
    with_both = with_ratio + ["amount_x_nbefore"]

    def cv(model, cols):
        return cross_val_score(model, f[cols], y, cv=5, scoring="roc_auc").mean()

    lin = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))
    l0, l1, l2 = cv(lin, base), cv(lin, with_ratio), cv(lin, with_both)
    assert l1 > l0 + 0.03, (l0, l1)                     # ratio helps linear
    assert l2 > l1 + 0.01, (l1, l2)                     # interaction helps linear

    tree = HistGradientBoostingClassifier(random_state=0)
    t0, t1, t2 = cv(tree, base), cv(tree, with_ratio), cv(tree, with_both)
    assert t1 > t0 + 0.01, (t0, t1)                     # ratio helps the tree too
    assert abs(t2 - t1) < 0.015, (t1, t2)               # interaction does not`,
        notes: [
          { t: "p", text: "**Three planted leaks, three names returned by one test.** The all-history mean, the same-row target rate and the `closed=\"right\"` window each change a pre-cutoff feature when the future is corrupted; the honest block changes nothing. The test is the same corruption check as 4.3 and 7.8, run over every column at once." },
          { t: "callout", kind: "insight", title: "The region median is the hard one", body: [
            { t: "p", text: "It aggregates across customers, so a per-customer groupby cannot compute it. **Sorting by region and time, then an expanding median shifted by one**, gives each event the median of every earlier event in its region — and the test pins customer c's value to the median of the two events before it, not including its own 1,000." }
          ]},
          { t: "p", text: "**The ratio helps both models; the interaction helps only the linear one.** The tree gains three points from `amount / mean_30D` because a ratio is a diagonal it would otherwise staircase, and nothing from `amount × log(n_before)` because two splits already carve that corner." },
          { t: "p", text: "**Window counts nest, and the test says so**: `n_7D ≤ n_30D ≤ n_90D ≤ n_before`. A violation would mean a window included events the longer one did not — which is how a wrong `closed=` or an unsorted frame shows up before any model is fitted." },
          { t: "p", text: "**The first event of every customer has NaN history, not zero.** A mean over no orders is not zero, and a return rate over no orders is not zero; `n_before = 0` is the honest zero, and the NaNs let the model treat 'no history' as its own state." },
          { t: "p", text: "**The target rate is causal and out-of-fold at once**, because the expanding mean shifted by one is exactly the time-ordered target encoding from 7.2. For event data, time order is the fold, and there is no other honest form." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`orders[\"cust_return_rate\"] = orders.groupby(\"customer\")[\"returned\"].transform(\"mean\")`. What is wrong?",
          options: [
            "transform should be agg",
            "Each row's own label is in its own feature — on a customer with one order the feature is the label; this is target encoding with a group key and leaks identically",
            "The mean should be the median",
            "Nothing; group features are always safe"
          ],
          answer: 1,
          why: "A group aggregate of a *feature* is safe: the feature is known at prediction time. A group aggregate of the *target* includes the row's own label. Out-of-fold with smoothing fixes it on i.i.d. data; on event data, an expanding mean shifted by one is causal and out-of-fold at once."
        }
      ]
    }
  ],

  takeaways: [
    "**If the effect of one feature depends on the level of another, the product is the feature** — a linear model cannot draw a corner from two slopes.",
    "**Trees find interactions with two splits and need no product**; they cannot draw a diagonal, so they need ratios.",
    "**Ratios are the domain's own quantities** — spend per day, debt to income — and they make every model more explicable.",
    "**Guard the denominator**: clip, NaN-and-flag, or epsilon, visibly; and log a ratio of two skewed things.",
    "**Polynomial features explode**: 20 features at degree 2 is 230 columns, most of them noise; degree 2 with regularisation is the practical ceiling.",
    "**A group aggregate of a feature is safe** — the feature is known at prediction time; excluding self is a design choice for tiny groups.",
    "**A group aggregate of the target is target encoding with a group key and leaks identically** — out-of-fold with smoothing.",
    "**Always include the group count**: a mean over 200 rows and over 1 row are both 'the mean', and the count says which to believe.",
    "**An all-history mean per entity uses rows that had not happened yet** — the expanding mean shifted by one is what production could compute.",
    "**Time windows need `closed=\"left\"`** or the current row is in its own feature.",
    "**Multiple windows make a trend**: `mean_7D / mean_90D > 1` is 'accelerating'.",
    "**Time order is the fold**: an expanding mean of the target, shifted, is causal and out-of-fold at once.",
    "**One corruption test over the whole block catches every leak by name** — all-history means, un-shifted expandings, wrong `closed=`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A logistic regression scores 0.53 on `age` and `income` for a target that is high only when the customer is young AND rich. Adding `age × log(income)` takes it to 0.79. Why?",
        options: [
          "The product is on a better scale",
          "A linear model fits one slope per feature and predicts a ramp — high when either is high; the product is large only where both are, which is the corner the target lives in",
          "Three features beat two",
          "The log fixed the skew"
        ],
        answer: 1,
        why: "A sum of separate effects cannot express 'both together'. The product can, with one coefficient. A tree scored 0.80 without the product — two sequential splits carve the corner — which is why interactions are a linear-model feature."
      },
      {
        stem: "Why does a gradient-boosted tree benefit from an explicit ratio column when it does not benefit from a product?",
        options: [
          "Ratios are smaller numbers",
          "A product's corner is two axis-aligned splits; a ratio threshold is a diagonal line, which a tree can only approximate with a staircase of many splits",
          "Trees cannot multiply",
          "It does not; both are useless for trees"
        ],
        answer: 1,
        why: "Trees draw axis-aligned rectangles. `spend / tenure > 3` is a line through the origin in `(spend, tenure)` space, and reaching it by splits alone takes many of them. The ratio hands over the diagonal in one column — three AUC points in the exercise."
      },
      {
        stem: "A per-customer mean amount is computed with `groupby.transform(\"mean\")` over the whole training set, and the rows are dated events. What is the leak?",
        options: [
          "The customer key is a leak",
          "A March row's mean includes June's orders — rows that had not happened yet; production on the March date could only see orders before it",
          "The mean should exclude the row itself",
          "There is no leak; amount is a feature, not the target"
        ],
        answer: 1,
        why: "This is temporal, not target, leakage: the feature column is fine, the time window is not. The expanding mean shifted by one, or a rolling window with `closed=\"left\"`, uses only earlier events — and the corruption test catches the difference by name."
      },
      {
        stem: "What does `mean_7D / mean_90D` express?",
        options: [
          "The customer's average spend",
          "A trend — above 1 means recent activity exceeds the longer-run level; the ratio of a short window to a long one is an acceleration feature",
          "The number of orders",
          "Seasonality"
        ],
        answer: 1,
        why: "Short windows react; long windows stabilise. Their ratio says whether the recent past is above or below the customer's norm — 'accelerating' or 'cooling' — which neither window says alone. Each is one rolling call; the set is the feature block."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What derived features do you build from a set of raw columns, and why?",
        strong: "Ratios first — spend per day, debt to income — because they are the quantities the domain reasons in and a tree cannot draw a diagonal. Differences from an expectation — this row minus its group's typical value — because 'unusual for them' is a different fact from 'large'. Products for linear models, where the effect of one feature depends on another; trees find those with two splits. And group aggregates with their counts, so the model knows how much history each aggregate rests on.",
        answer: [
          { t: "p", text: "Pairing each feature type with the model that needs it — ratios for everyone, products for linear — is what shows the reasoning rather than the recipe." }
        ]
      },
      {
        level: "advanced",
        q: "When does a group aggregation feature leak?",
        strong: "Two ways. Through the target: a customer's return rate includes the row's own return, and on a one-order customer it *is* the label — target encoding with a group key, fixed out-of-fold with smoothing. And through time: an all-history mean per customer includes orders that had not happened yet, fixed by an expanding mean shifted by one or a window with `closed=\"left\"`. A windowed target rate can leak both ways, and on event data the expanding-shifted form is causal and out-of-fold at once because time order is the fold.",
        answer: [
          { t: "p", text: "Naming the two independent axes — target and time — and the feature that leaks on both is the complete picture." }
        ]
      },
      {
        level: "advanced",
        q: "How would you check a feature block for leakage without reading every line?",
        strong: "A corruption test. Take the events, push every value and label after a cutoff to something absurd, recompute the block, and compare the features for rows before the cutoff. Any column that changed used the future. It catches the all-history mean, the un-shifted expanding, the `closed=\"right\"` window and the same-row target rate in one pass, and it names them. It runs in seconds and it is the only test that scales to a block of fifty features.",
        answer: [
          { t: "p", text: "Having a mechanical, named-output test rather than a review process is the difference between 'we were careful' and 'we checked'." }
        ]
      }
    ]
  }
});
