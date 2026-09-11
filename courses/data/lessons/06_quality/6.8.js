/* ============================================================================
   LESSON 6.8 — Outliers: What To Do About Them
   ========================================================================= */
EC.receiveLesson({
  id: "6.8",

  lede: "**Detection tells you a value is unusual. It does not tell you the value is wrong — and \"unusual\" and \"wrong\" call for opposite treatments.** The £40,000 order from a customer who normally spends £40 is either a data-entry error to remove or the most important sale of the quarter to keep. The decision is about which, and no statistic makes it for you.",

  objectives: [
    "Separate the question \"is it unusual\" from \"is it wrong\" and gather evidence for the second",
    "Choose between removing, capping, transforming and keeping, by the cause and the downstream use",
    "Apply winsorisation and clipping correctly, including fitting the bounds on training data only",
    "Use models and losses that tolerate outliers instead of removing them",
    "Document every outlier decision so it can be reviewed and reversed"
  ],

  prerequisites: ["6.7", "6.5"],

  blocks: [

    { t: "h2", n: "01", text: "Unusual is not wrong", id: "cause" },

    { t: "p", text: "Every flagged value has a cause, and **the cause is what decides the treatment**. A measurement error and a rare true event look identical to a detector; they call for removal and preservation respectively. The work after detection is finding out which one you have." },

    { t: "dl", items: [
      ["Error outlier", "A value that does not reflect reality: a typo, a unit mix-up, a sensor fault, a sentinel that escaped. **Remove or correct.** Keeping it teaches the model something false."],
      ["Genuine outlier", "A value that is real and rare: a bulk order, a record-breaking day, a fraud case. **Keep**, and possibly make it easier for the model to handle. Removing it teaches the model the world is tamer than it is."],
      ["Influential point", "A row that changes the fitted model substantially when removed. Not the same as an outlier — a point can be extreme without leverage, or moderate and highly influential. Cook's distance measures it."],
      ["Winsorisation", "Replacing values beyond a percentile with that percentile's value — the top 1% become the 99th percentile. Preserves the row and its rank; removes the magnitude."],
      ["Clipping", "The same operation with fixed bounds rather than percentiles: `clip(lower=0, upper=10_000)`."],
      ["Robust loss", "A model objective that limits any single row's influence: Huber loss, quantile loss, MAE. The model tolerates the outlier rather than the data being changed."]
    ]},

    { t: "viz",
      title: "The decision after detection",
      caption: "Detection is one box. Everything that matters happens in the diamond — and the two exits from it lead to opposite actions on the same value.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="A decision flow: a flagged value goes to an evidence step asking whether it is an error, branching to remove or correct if yes, and to keep with a mitigation choice if no">
  <rect x="30" y="120" width="130" height="50" rx="6" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.5"/>
  <text x="46" y="142" class="s-label" style="fill:var(--ink-2)">flagged</text>
  <text x="46" y="160" class="s-sub" style="fill:var(--ink-3)">by 6.7</text>

  <line x1="160" y1="145" x2="210" y2="145" style="stroke:var(--ink-3);stroke-width:1.5" marker-end="url(#od-a)"/>

  <polygon points="300,90 390,145 300,200 210,145" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn);stroke-width:1.5"/>
  <text x="252" y="138" class="s-label" style="fill:var(--ink-2)">is it wrong?</text>
  <text x="240" y="158" class="s-sub" style="fill:var(--ink-3)">evidence, not score</text>

  <line x1="300" y1="90" x2="300" y2="60" style="stroke:var(--crit);stroke-width:1.5" marker-end="url(#od-c)"/>
  <text x="308" y="80" class="s-sub" style="fill:var(--crit)">yes</text>
  <rect x="420" y="20" width="420" height="70" rx="6" style="fill:var(--crit);fill-opacity:.08;stroke:var(--crit);stroke-width:1.5"/>
  <text x="436" y="44" class="s-label" style="fill:var(--crit)">error → remove or correct</text>
  <text x="436" y="64" class="s-sub" style="fill:var(--ink-3)">unit fix (×1000), sentinel → NaN, typo → NaN, sensor fault → NaN + flag</text>
  <text x="436" y="80" class="s-sub" style="fill:var(--ink-3)">and fix the source, because it will happen again</text>
  <line x1="300" y1="60" x2="420" y2="55" style="stroke:var(--crit);stroke-width:1.5" marker-end="url(#od-c)"/>

  <line x1="300" y1="200" x2="300" y2="230" style="stroke:var(--good);stroke-width:1.5" marker-end="url(#od-g)"/>
  <text x="308" y="222" class="s-sub" style="fill:var(--good)">no</text>
  <rect x="420" y="200" width="420" height="100" rx="6" style="fill:var(--good);fill-opacity:.08;stroke:var(--good);stroke-width:1.5"/>
  <text x="436" y="224" class="s-label" style="fill:var(--good)">genuine → keep, and choose how the model copes</text>
  <text x="436" y="246" class="s-sub" style="fill:var(--ink-3)">winsorise / clip — bounds fit on TRAIN — if the magnitude is the problem</text>
  <text x="436" y="264" class="s-sub" style="fill:var(--ink-3)">log transform if the scale is the problem</text>
  <text x="436" y="282" class="s-sub" style="fill:var(--ink-3)">robust loss or tree model if the model is the problem</text>
  <text x="436" y="298" class="s-sub" style="fill:var(--ink-3)">separate model / segment if the population is the problem</text>
  <line x1="300" y1="230" x2="420" y2="250" style="stroke:var(--good);stroke-width:1.5" marker-end="url(#od-g)"/>

  <text x="30" y="250" class="s-sub" style="fill:var(--ink-3)">"can't tell" is a third exit:</text>
  <text x="30" y="268" class="s-sub" style="fill:var(--ink-3)">flag the row, keep it, and</text>
  <text x="30" y="286" class="s-sub" style="fill:var(--ink-3)">measure the model both ways</text>

  <defs>
    <marker id="od-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker>
    <marker id="od-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker>
    <marker id="od-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "gathering evidence about a flagged value", code: `
import pandas as pd
import numpy as np

# THE FLAG SAYS "unusual". These questions say "wrong":

def investigate(df, idx, col, group=None, ts=None):
    """Assemble the evidence a person needs to decide. Returns facts,
    not a verdict."""
    row = df.loc[idx]
    v = row[col]
    ev = {"value": v}

    # 1. IS IT IMPOSSIBLE? Negative age, 200% completion, a date in
    #    the future. Impossible is wrong, full stop.
    ev["impossible"] = bool(v < 0) if pd.api.types.is_numeric_dtype(df[col]) else False

    # 2. IS IT A ROUND NUMBER OR A KNOWN SENTINEL? 9999, 99999, -1,
    #    1e6 -- these are placeholders wearing a value.
    ev["looks_like_sentinel"] = v in {-1, -999, -9999, 999, 9999, 99999, 1e6, 0}

    # 3. IS IT EXACTLY 10x, 100x, 1000x A PLAUSIBLE VALUE? A unit
    #    error -- pence for pounds, grams for kilos -- has this
    #    signature.
    med = df[col].median()
    ratio = v / med if med else np.nan
    ev["ratio_to_median"] = round(float(ratio), 2)
    ev["looks_like_unit_error"] = any(abs(ratio - k) / k < 0.05 for k in (10, 100, 1000, 0.1, 0.01, 0.001))

    # 4. ARE THE OTHER COLUMNS CONSISTENT WITH IT? A 40,000 order
    #    with quantity 1 and unit price 40 is a typo in amount. With
    #    quantity 1,000 it is a bulk order.
    if {"quantity", "unit_price"} <= set(df.columns):
        ev["reconstructed"] = float(row["quantity"] * row["unit_price"])
        ev["consistent_with_qty_price"] = bool(abs(ev["reconstructed"] - v) < 0.01 * max(v, 1))

    # 5. IS IT UNUSUAL FOR THIS ENTITY, or just for the dataset?
    if group is not None:
        g = df[df[group] == row[group]][col]
        ev["group_median"] = float(g.median())
        ev["group_n"] = int(len(g))
        ev["group_rank"] = float((g < v).mean())

    # 6. DID IT HAPPEN MORE THAN ONCE? One 40,000 is an anomaly; the
    #    same customer at 40,000 three months running is a pattern.
    if group is not None and ts is not None:
        near = df[(df[group] == row[group]) & (df[col] > 0.5 * v)]
        ev["similar_events_same_entity"] = int(len(near))

    # 7. WHAT DOES THE SOURCE SAY? Not computable. The most important
    #    question, and the reason to keep the row id.
    ev["row_id"] = idx
    ev["next_step"] = "check the source record"
    return ev

orders = pd.DataFrame({
    "customer": ["a"] * 10 + ["b"] * 10,
    "quantity": [1] * 19 + [1000],
    "unit_price": [40.0] * 20,
    "amount": [40.0] * 19 + [40_000.0],
})
investigate(orders, 19, "amount", group="customer")
# {'value': 40000.0, 'impossible': False, 'looks_like_sentinel': False,
#  'ratio_to_median': 1000.0, 'looks_like_unit_error': True,      <- hmm
#  'reconstructed': 40000.0, 'consistent_with_qty_price': True,   <- but this
#  'group_median': 40.0, 'group_n': 10, 'group_rank': 0.9, ...}
#
# The ratio says "unit error". The quantity says "bulk order, and the
# amount is right". The second piece of evidence wins: 1,000 units at
# 40 is 40,000. This is a genuine outlier. Keep it.

orders.loc[19, "quantity"] = 1
investigate(orders, 19, "amount", group="customer")
# ... 'reconstructed': 40.0, 'consistent_with_qty_price': False ...
#
# Now the amount disagrees with quantity x price by 1000x. This is an
# error -- almost certainly pence entered as pounds. Correct it to 40,
# and go and find out why the source sent pence.

# THE PATTERN: an outlier is a question. The other columns, the
# entity's history and the source record are the answers. A score
# above a threshold is where the investigation starts, not where the
# decision is made.
`,
      hl: [21, 27, 58, 66],
      caption: "**The ratio says \"unit error\"; the quantity says \"bulk order\".** The same 40,000 is genuine when quantity is 1,000 and an error when quantity is 1 — and only the other columns can tell."
    },

    { t: "callout", kind: "trap", title: "Removing genuine outliers teaches the model the world is tame", body: [
      { t: "p", text: "Drop every order above the 99th percentile and the model never sees a bulk order. In production the first bulk order arrives and the model — trained on a world without them — produces nonsense, and the demand forecast for the month is wrong by the size of the order you removed." },
      { t: "p", text: "**The rare event is often the one the model most needs to have seen.** Fraud, outages, record days, large customers: removing them because they are unusual removes the cases the model exists to handle." },
      { t: "p", text: "If a genuine extreme value breaks the model, the fix is a model or a transform that can cope with it — not a dataset that pretends it does not happen." }
    ]},

    { t: "h2", n: "02", text: "The four treatments", id: "treatments" },

    { t: "table",
      head: ["Treatment", "What it does", "Preserves", "Loses", "Right when"],
      rows: [
        ["**Remove**", "Drop the row, or set the value to NaN", "Everything else", "The row, or the value — and the count", "The value is an error you cannot correct; the row is a test record; the sentinel escaped"],
        ["**Correct**", "Replace with the true value", "Everything", "Nothing, if the correction is right", "The cause is known: a unit error, a transposed digit, a sign flip"],
        ["**Cap** (winsorise / clip)", "Replace beyond a bound with the bound", "The row, its rank, its direction", "The magnitude beyond the bound", "The value is genuine but its size would dominate a mean-based model; bounds fit on train"],
        ["**Transform**", "Log, sqrt, Box-Cox on the whole column", "Everything, monotonically", "Interpretability of the scale; nothing else", "The column is skewed and the extremes are its tail, not errors"],
        ["**Keep, robust model**", "Change the model's loss or type", "The data entirely", "Some sensitivity to the centre", "The values are genuine and the model was the problem"],
        ["**Keep, flag**", "Add an indicator column", "Everything, plus the fact of being flagged", "Nothing", "Uncertain; let the model use the flag"],
        ["**Segment**", "Model the outliers separately", "Both populations", "Simplicity", "The outliers are a different population — bulk buyers, enterprise accounts"]
      ],
      caption: "**Capping preserves the row and its rank and loses only the magnitude.** For a model, that is usually the right trade; for a report of total revenue, it is a wrong number."
    },

    { t: "code", lang: "python", title: "winsorising and clipping, with the bounds fit on training data", code: `
from scipy.stats.mstats import winsorize
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(0)
amount = np.append(rng.lognormal(4, 0.6, 5000), [5000, 8000, 12000])   # a few big ones
df = pd.DataFrame({"amount": amount, "y": 0.5 * amount + rng.normal(0, 30, len(amount))})

# WINSORISE BY PERCENTILE:
lo, hi = np.percentile(df["amount"], [1, 99])
df["amount_w"] = df["amount"].clip(lo, hi)
#
# clip() IS winsorisation once you have the bounds. scipy's winsorize
# does the same with limits as fractions:
winsorize(df["amount"].to_numpy(), limits=(0.01, 0.01))

# WHAT IT DID:
df[["amount", "amount_w"]].describe().loc[["mean", "std", "max"]]
#          amount  amount_w
# mean      66.1      62.9
# std      219.0      54.1      <- the std is a quarter of what it was
# max   12000.0     240.3      <- the 12,000 is now 240
#
# The mean barely moved; the spread collapsed. Every row is still
# there. The three big orders are now indistinguishable from the
# 99th percentile -- which is the point, and which is also a loss.

# THE LEAKAGE: bounds fit on the FULL data include the test rows.
train, test = train_test_split(df, test_size=0.3, random_state=0)

# WRONG -- bounds from everything:
lo_all, hi_all = np.percentile(df["amount"], [1, 99])

# RIGHT -- bounds from train, applied to both:
lo_tr, hi_tr = np.percentile(train["amount"], [1, 99])
train = train.assign(amount_w=train["amount"].clip(lo_tr, hi_tr))
test = test.assign(amount_w=test["amount"].clip(lo_tr, hi_tr))
#
# A test row larger than every training row gets capped at the
# training 99th percentile. That is CORRECT: in production, a value
# larger than anything seen before gets the same treatment. Fitting
# on all data would set a bound the model had "seen", which it will
# not have in production.

# A TRANSFORMER, so it lives in a Pipeline (see 8.5):
from sklearn.base import BaseEstimator, TransformerMixin

class Winsorizer(BaseEstimator, TransformerMixin):
    def __init__(self, lower=0.01, upper=0.99):
        self.lower, self.upper = lower, upper
    def fit(self, X, y=None):
        X = np.asarray(X, float)
        self.lo_ = np.nanpercentile(X, 100 * self.lower, axis=0)
        self.hi_ = np.nanpercentile(X, 100 * self.upper, axis=0)
        return self
    def transform(self, X):
        return np.clip(np.asarray(X, float), self.lo_, self.hi_)

w = Winsorizer().fit(train[["amount"]])
w.lo_, w.hi_                              # learned from train only

# CLIPPING BY DOMAIN BOUNDS -- when the limits are KNOWN, not estimated:
df["pct"] = rng.uniform(-5, 105, len(df))          # a percentage with errors
df["pct"].clip(0, 100)
#
# Fixed bounds need no fitting and cannot leak. They encode a fact
# about the world ("a percentage is 0-100"), not about the sample.
# Values outside them are ERRORS, and clipping is a correction --
# arguably better set to NaN so the error stays visible.

# ONE-SIDED: skewed columns usually need capping on one side only.
df["amount"].clip(upper=np.percentile(train["amount"], 99))
#
# Capping the bottom 1% of a log-normal column at its 1st percentile
# changes almost nothing and looks like a rule applied blindly.

# THE LOG TRANSFORM AS THE ALTERNATIVE (see 7.5):
df["log_amount"] = np.log1p(df["amount"])
#
# After log, 12,000 is 9.4 and 66 is 4.2 -- the extreme is 2x the
# typical value instead of 180x. The row keeps its magnitude, in
# compressed form, and the model sees it. For a skewed column with
# genuine extremes this is usually better than capping: nothing is
# lost, and the scale becomes one a linear model can use.

# WHAT CAPPING DOES TO A TOTAL:
df["amount"].sum(), df["amount_w"].sum()
# (330,600, 314,500)
#
# 16,000 of real revenue is gone from the capped column. If this
# column feeds a REPORT, it is now wrong. If it feeds a MODEL, it is
# a feature that has been made better behaved. The same column,
# right for one use and wrong for the other. Keep both.
`,
      hl: [24, 33, 60, 84],
      caption: "**Bounds fit on the full data leak the test rows into the training cap.** Fit on train, apply to both — a test value larger than anything in training gets capped at the training 99th percentile, which is exactly what will happen in production."
    },

    { t: "h2", n: "03", text: "Keeping them: models that cope", id: "robust" },

    { t: "p", text: "**If the values are genuine, the alternative to changing the data is changing the model.** A squared-error loss lets one extreme row dominate the fit; a robust loss limits any row's influence; a tree model never squares anything. The data stays as it is, and the model learns the centre without being dragged by the edge." },

    { t: "code", lang: "python", title: "influence, robust losses, and the model that does not care", code: `
from sklearn.linear_model import LinearRegression, HuberRegressor, QuantileRegressor
from sklearn.ensemble import GradientBoostingRegressor, HistGradientBoostingRegressor

# A LINEAR RELATIONSHIP with one high-leverage error:
x = rng.uniform(0, 10, 200)
y = 2 * x + rng.normal(0, 1, 200)
x_err, y_err = np.append(x, 9.5), np.append(y, 80)      # a y of 80 where 19 is expected

# OLS: squared error, so the error row dominates.
ols = LinearRegression().fit(x_err[:, None], y_err)
ols.coef_[0]                                            # 2.64 -- pulled up by 32%
#
# One row in 201 moved the slope by a third. Its residual is 60, and
# 60 squared is 3,600 -- more than the other 200 residuals combined.

# INFLUENCE, measured: how much does each row move the fit?
def cooks_distance(X, y):
    X = np.column_stack([np.ones(len(X)), X])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    p = X.shape[1]
    mse = (resid ** 2).sum() / (len(y) - p)
    H = X @ np.linalg.pinv(X.T @ X) @ X.T
    h = np.diag(H)
    return (resid ** 2 / (p * mse)) * (h / (1 - h) ** 2)

cd = cooks_distance(x_err[:, None], y_err)
cd[-1], np.percentile(cd[:-1], 99)                     # (2.1, 0.02)
#
# Cook's distance above 1 is the conventional "this row changes the
# fit" threshold; above 4/n is "worth a look". The error row is 100x
# the 99th percentile of the rest. INFLUENCE IS NOT THE SAME AS
# OUTLYINGNESS: a row at x = 5 with y = 80 would be equally outlying
# and far less influential, because it has no leverage.

# HUBER LOSS: squared error near zero, absolute error beyond a
# threshold. Large residuals get linear -- not quadratic -- weight.
hub = HuberRegressor(epsilon=1.35).fit(x_err[:, None], y_err)
hub.coef_[0]                                            # 2.03 -- barely moved
#
# epsilon=1.35 is the default: residuals beyond 1.35 sigma are treated
# linearly. The error row's residual of 60 contributes 60, not 3,600.

# QUANTILE (MEDIAN) REGRESSION: absolute error throughout. The fit
# goes through the conditional median, which no single row can move.
qr = QuantileRegressor(quantile=0.5, alpha=0).fit(x_err[:, None], y_err)
qr.coef_[0]                                             # 2.00
#
# The most robust of the three. Also the least efficient on clean
# data (wider standard errors), and it predicts the median, not the
# mean -- which for a skewed target is a different number.

# TREE MODELS: no loss on the raw scale of x at all. A split is a
# threshold; the error row falls in the same leaf as its neighbours
# and contributes one vote to the leaf's mean. With MAE or Huber as
# the leaf criterion, not even that.
gb = HistGradientBoostingRegressor(loss="absolute_error").fit(x_err[:, None], y_err)
gb.predict([[9.5]])                                     # ~19, not pulled toward 80
#
# A tree model is robust to outliers in X by construction (splits
# are rank-based) and robust to outliers in y with a robust loss.
# This is one of the strongest arguments for gradient boosting on
# messy tabular data: the outlier treatment is built in.

# THE CHOICE BETWEEN CHANGING DATA AND CHANGING MODEL:
#
#   change the DATA (cap, transform) when
#     - the feature goes to many models, and you want them all to
#       behave
#     - the model must be linear for interpretability
#     - the extremes are a scale problem, not an error problem
#
#   change the MODEL (robust loss, trees) when
#     - the values are genuine and you want the model to have seen
#       them
#     - you cannot justify a cap value
#     - the target has the outliers, not the features
#
# And always: the row that moved the OLS slope by a third has a
# residual of 60 on a scale where 1 is typical. That is not an
# outlier to accommodate; it is an error to investigate. Robust
# models make the fit survive it. They do not make it right.
`,
      hl: [11, 24, 35, 56],
      caption: "**One row in 201 moved the OLS slope by a third.** Its squared residual is 3,600 — more than the other 200 combined. Huber gives it linear weight and the slope barely moves; a tree gives it one vote in a leaf."
    },

    { t: "callout", kind: "insight", title: "Influence is not outlyingness", body: [
      { t: "p", text: "A row's effect on a fitted model depends on its residual *and* its leverage — how far its features are from the centre. A wildly wrong y at a typical x barely moves a regression line. A moderately wrong y at an extreme x can rotate it." },
      { t: "p", text: "**Cook's distance measures the effect on the fit, which is the thing you actually care about.** Rows with distance above 1 change the model; above 4/n are worth a look. The detectors in 6.7 find unusual rows; Cook's distance finds consequential ones, and the two lists overlap less than people expect." },
      { t: "p", text: "For tree models the leverage argument mostly disappears — splits are rank-based — which is a large part of why they are forgiving of messy features." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "An outlier treatment that records its own decisions",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Build the treatment step that runs after detection. It takes flagged rows with their evidence, applies a rule per cause — correct unit errors, null sentinels, cap genuine extremes with training-fit bounds, keep and flag the uncertain — and writes a log of every change with the row id, the before and after value, the rule that fired, and the evidence." },
        { t: "p", text: "Then show, on a regression task, the model's error under four policies: remove all flagged, cap all flagged, treat by cause, and keep all with a robust loss." }
      ],
      requirements: [
        "Rules keyed on the evidence from `investigate`: unit error → correct; sentinel → NaN; impossible → NaN; genuine → cap; uncertain → keep and flag.",
        "Cap bounds fit on the training split only.",
        "A decision log: one row per changed value, reversible.",
        "The four-policy comparison on held-out error.",
        "A demonstration that removing genuine extremes hurts test error on a set that contains them.",
        "Tests for each rule and for the reversibility of the log."
      ],
      hint: "The policy that removes everything flagged will score best on a test set from which the extremes were also removed, and worst on one where they were kept. The second is the honest test.",
      solution: {
        lang: "python",
        title: "treat_outliers.py",
        code: `import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, HuberRegressor
from sklearn.metrics import mean_absolute_error


SENTINELS = {-1, -999, -9999, 999, 9999, 99999}


# =========================================================================
# EVIDENCE -> RULE -> ACTION
# =========================================================================

def classify(df, idx, col):
    """Return (cause, evidence) for one flagged value."""
    row = df.loc[idx]
    v = row[col]
    ev = {}
    if v in SENTINELS:
        return "sentinel", {"value": v}
    if pd.api.types.is_numeric_dtype(df[col]) and v < 0 and col in ("amount", "quantity"):
        return "impossible", {"value": v}
    if {"quantity", "unit_price"} <= set(df.columns):
        recon = row["quantity"] * row["unit_price"]
        ev["reconstructed"] = float(recon)
        if recon > 0:
            ratio = v / recon
            ev["ratio_to_reconstructed"] = round(float(ratio), 3)
            for k in (100, 1000, 0.01, 0.001):
                if abs(ratio - k) / k < 0.02:
                    return "unit_error", {**ev, "factor": k}
            if abs(ratio - 1) < 0.02:
                return "genuine", ev            # amount == qty x price: it is real
    return "uncertain", ev


def treat(df, flags, col, *, train_mask, cap_pct=(1, 99)):
    """Apply a per-cause rule to every flagged value. Returns the
    treated frame and a reversible log."""
    out = df.copy()
    out[f"{col}_flag"] = 0
    log = []

    # CAP BOUNDS FROM TRAINING ROWS ONLY, and only from rows that are
    # not themselves errors -- an escaped sentinel at 99999 would set
    # the cap.
    clean_train = out.loc[train_mask & ~out.index.isin(flags), col]
    lo, hi = np.percentile(clean_train.dropna(), cap_pct)

    for idx in flags:
        cause, ev = classify(out, idx, col)
        before = out.at[idx, col]
        if cause == "unit_error":
            after = before / ev["factor"]
            rule = f"divide by {ev['factor']}"
        elif cause in ("sentinel", "impossible"):
            after = np.nan
            rule = "set NaN"
        elif cause == "genuine":
            after = float(np.clip(before, lo, hi))
            rule = f"cap to [{lo:.1f}, {hi:.1f}]" if after != before else "keep"
        else:                                                    # uncertain
            after = before
            rule = "keep + flag"
            out.at[idx, f"{col}_flag"] = 1
        out.at[idx, col] = after
        log.append({"row": idx, "column": col, "cause": cause, "rule": rule,
                    "before": float(before), "after": (None if pd.isna(after) else float(after)),
                    "evidence": ev})
    return out, pd.DataFrame(log)


def revert(df, log):
    """Undo every logged change."""
    out = df.copy()
    for _, r in log.iterrows():
        out.at[r["row"], r["column"]] = r["before"]
    return out


# =========================================================================
# THE DATA, WITH FOUR KINDS OF FLAGGED VALUE
# =========================================================================

def make_data(n=3000, seed=0):
    rng = np.random.default_rng(seed)
    qty = rng.integers(1, 6, n)
    price = rng.uniform(10, 60, n).round(2)
    amount = (qty * price).round(2)
    df = pd.DataFrame({"quantity": qty, "unit_price": price, "amount": amount})
    # target depends on amount, with noise
    df["y"] = 0.8 * df["amount"] + rng.normal(0, 10, n)

    # GENUINE EXTREMES: bulk orders. amount == qty x price.
    bulk = rng.choice(n, 30, replace=False)
    df.loc[bulk, "quantity"] = rng.integers(200, 500, 30)
    df.loc[bulk, "amount"] = (df.loc[bulk, "quantity"] * df.loc[bulk, "unit_price"]).round(2)
    df.loc[bulk, "y"] = 0.8 * df.loc[bulk, "amount"] + rng.normal(0, 10, 30)

    # UNIT ERRORS: pence for pounds. amount == 100 x qty x price.
    unit = rng.choice(np.setdiff1d(np.arange(n), bulk), 20, replace=False)
    df.loc[unit, "amount"] = df.loc[unit, "amount"] * 100

    # SENTINELS
    sent = rng.choice(np.setdiff1d(np.arange(n), np.concatenate([bulk, unit])), 10, replace=False)
    df.loc[sent, "amount"] = 9999

    # IMPOSSIBLE
    imp = rng.choice(np.setdiff1d(np.arange(n), np.concatenate([bulk, unit, sent])), 5, replace=False)
    df.loc[imp, "amount"] = -df.loc[imp, "amount"]

    df.attrs["planted"] = {"bulk": bulk, "unit": unit, "sent": sent, "imp": imp}
    return df


def detect(df, col="amount", threshold=3.5):
    x = df[col].to_numpy(float)
    med = np.nanmedian(x); mad = np.nanmedian(np.abs(x - med)) * 1.4826
    return df.index[np.abs((x - med) / mad) > threshold].tolist()


# =========================================================================
# THE FOUR POLICIES, SCORED HONESTLY
# =========================================================================

def compare_policies(seed=0):
    df = make_data(seed=seed)
    idx_tr, idx_te = train_test_split(df.index, test_size=0.3, random_state=seed)
    train_mask = df.index.isin(idx_tr)
    flags = detect(df)

    # THE HONEST TEST SET: treated by cause (errors fixed, genuine kept
    # UNCAPPED), so it contains the bulk orders as they really are.
    treated, log = treat(df, flags, "amount", train_mask=train_mask)
    test_truth = df.loc[idx_te].copy()
    te_log = log[log["row"].isin(idx_te)]
    for _, r in te_log.iterrows():
        if r["cause"] in ("unit_error", "sentinel", "impossible"):
            test_truth.at[r["row"], "amount"] = r["after"]
    test_truth = test_truth.dropna(subset=["amount"])
    X_te, y_te = test_truth[["amount"]], test_truth["y"]

    results = {}

    # A. REMOVE ALL FLAGGED
    tr = df.loc[idx_tr].drop(index=[i for i in flags if i in idx_tr])
    m = LinearRegression().fit(tr[["amount"]], tr["y"])
    results["remove_all"] = mean_absolute_error(y_te, m.predict(X_te))

    # B. CAP ALL FLAGGED (train bounds)
    tr = df.loc[idx_tr].copy()
    lo, hi = np.percentile(tr["amount"], [1, 99])
    tr["amount"] = tr["amount"].clip(lo, hi)
    m = LinearRegression().fit(tr[["amount"]], tr["y"])
    results["cap_all"] = mean_absolute_error(y_te, m.predict(X_te.clip(lo, hi)))

    # C. TREAT BY CAUSE
    tr = treated.loc[idx_tr].dropna(subset=["amount"])
    m = LinearRegression().fit(tr[["amount", "amount_flag"]], tr["y"])
    X_te_c = X_te.assign(amount_flag=0)
    results["by_cause"] = mean_absolute_error(y_te, m.predict(X_te_c))

    # D. KEEP ALL, ROBUST LOSS
    tr = df.loc[idx_tr]
    m = HuberRegressor(max_iter=500).fit(tr[["amount"]], tr["y"])
    results["keep_huber"] = mean_absolute_error(y_te, m.predict(X_te))

    return {k: round(v, 2) for k, v in results.items()}, log


# compare_policies()
# ({'remove_all': 41.8, 'cap_all': 39.6, 'by_cause': 8.3, 'keep_huber': 12.1}, log)
#
# READING IT:
#   remove_all   dropped the 30 bulk orders from training. The model
#                never saw an amount above ~300, and the test set has
#                orders at 20,000. MAE 42.
#   cap_all      capped the bulk orders at the 99th percentile in
#                training, so the model learned y saturates -- and then
#                test bulk orders were capped too, and scored at the
#                saturation value. MAE 40.
#   by_cause     fixed the unit errors (which were teaching the model
#                that amount is 100x what it is), nulled the sentinels,
#                and KEPT the bulk orders. The model saw the full range
#                and the test bulk orders are predicted correctly.
#                MAE 8.
#   keep_huber   left everything in, including 20 unit errors at 100x,
#                and relied on the loss. Huber limited their influence
#                but did not remove it; 10 rows at 9999 pulled a
#                little too. MAE 12. Robust models survive errors;
#                they do not correct them.


# =========================================================================
# TESTS
# =========================================================================

def test_unit_error_is_corrected():
    df = make_data()
    unit = df.attrs["planted"]["unit"]
    treated, log = treat(df, detect(df), "amount", train_mask=np.ones(len(df), bool))
    fixed = log[log["cause"] == "unit_error"]
    assert set(fixed["row"]) >= set(unit)
    for i in unit:
        assert np.isclose(treated.at[i, "amount"], df.at[i, "quantity"] * df.at[i, "unit_price"])


def test_sentinel_and_impossible_become_nan():
    df = make_data()
    p = df.attrs["planted"]
    treated, log = treat(df, detect(df), "amount", train_mask=np.ones(len(df), bool))
    for i in list(p["sent"]) + list(p["imp"]):
        assert pd.isna(treated.at[i, "amount"])


def test_genuine_bulk_orders_are_kept_not_removed():
    df = make_data()
    bulk = df.attrs["planted"]["bulk"]
    treated, log = treat(df, detect(df), "amount", train_mask=np.ones(len(df), bool))
    causes = log.set_index("row")["cause"]
    assert all(causes.get(i) == "genuine" for i in bulk if i in causes.index)
    assert treated.loc[bulk, "amount"].notna().all()


def test_cap_bounds_come_from_training_rows_only():
    df = make_data()
    train_mask = np.zeros(len(df), bool); train_mask[:2000] = True
    df2 = df.copy(); df2.loc[2000:, "amount"] *= 50           # corrupt test rows
    _, log_a = treat(df, detect(df), "amount", train_mask=train_mask)
    _, log_b = treat(df2, detect(df2), "amount", train_mask=train_mask)
    rule_a = log_a[log_a["cause"] == "genuine"]["rule"].iloc[0]
    rule_b = log_b[log_b["cause"] == "genuine"]["rule"].iloc[0]
    assert rule_a == rule_b                                    # same bounds


def test_log_is_reversible():
    df = make_data()
    treated, log = treat(df, detect(df), "amount", train_mask=np.ones(len(df), bool))
    reverted = revert(treated, log)
    pd.testing.assert_series_equal(reverted["amount"], df["amount"], check_names=False)


def test_by_cause_beats_remove_and_cap():
    results, _ = compare_policies()
    assert results["by_cause"] < results["remove_all"] / 2
    assert results["by_cause"] < results["cap_all"] / 2


def test_removing_genuine_extremes_hurts_where_they_exist():
    results, _ = compare_policies()
    assert results["remove_all"] > 3 * results["by_cause"]


def test_robust_loss_survives_but_does_not_correct():
    results, _ = compare_policies()
    assert results["keep_huber"] < results["remove_all"]      # better than dropping
    assert results["keep_huber"] > results["by_cause"]        # worse than fixing


def test_every_log_row_has_evidence_and_rule():
    df = make_data()
    _, log = treat(df, detect(df), "amount", train_mask=np.ones(len(df), bool))
    assert log["rule"].notna().all() and log["cause"].notna().all()
    assert (log["before"] != log["after"].fillna(-1e18)).any()`,
        notes: [
          { t: "p", text: "**Treating by cause is five times better than removing everything and five times better than capping everything.** The unit errors were teaching the model that amounts run a hundred times higher than they do; the bulk orders were teaching it the range it needs to predict. One rule per cause fixes the first and keeps the second." },
          { t: "callout", kind: "trap", title: "\"Remove all flagged\" scores best on the wrong test set", body: [
            { t: "p", text: "If the test set had also been stripped of extremes, removing them from training would look fine. **The honest test set contains the bulk orders as they really are**, because production does — and a model that never saw an amount above 300 meets one at 20,000 and is wrong by the size of the order." },
            { t: "p", text: "The test is the test. Cleaning it to match the training policy is how a bad policy hides." }
          ]},
          { t: "p", text: "**The cap bounds are fit on training rows that are not themselves flagged.** An escaped sentinel at 9,999 in the training split would otherwise set the 99th percentile, and every genuine bulk order would be capped at a placeholder." },
          { t: "p", text: "**Huber survives the errors and does not correct them.** It is better than dropping — the model saw the bulk orders — and worse than fixing, because twenty rows at a hundred times the true amount still pull, just linearly rather than quadratically. Robust losses are for genuine extremes, not for errors that a rule could have repaired." },
          { t: "p", text: "**The log is reversible, and the test proves it.** Every change records the row, the before, the after, the rule and the evidence; `revert` restores the original column exactly. A treatment that cannot be undone is a treatment nobody can review." },
          { t: "p", text: "**The flag column carries the uncertain cases into the model.** For a value the rules could not classify, keeping it with an indicator lets the model decide how much to trust it — the same fill-and-flag logic as missing data, applied to values that are present but suspect." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A £40,000 order is flagged. Quantity is 1,000 and unit price is £40. What is the right treatment?",
          options: [
            "Cap it at the 99th percentile",
            "Keep it — the amount equals quantity × price, so it is a genuine bulk order, and removing it teaches the model that bulk orders do not happen",
            "Remove it as an outlier",
            "Set it to the customer's median"
          ],
          answer: 1,
          why: "The other columns are the evidence. A 1,000× ratio to the median looks like a unit error until the quantity explains it. If the model is a linear one that the magnitude would dominate, a log transform or a robust loss lets it cope — but the row stays, because production will contain rows like it."
        }
      ]
    }
  ],

  takeaways: [
    "**Detection says \"unusual\"; the decision needs \"wrong\"** — and the two call for opposite treatments.",
    "**The cause decides the treatment**: error → remove or correct; genuine → keep and help the model cope; uncertain → keep and flag.",
    "**The other columns are the evidence.** A 1,000× amount with quantity 1,000 is a bulk order; with quantity 1 it is pence entered as pounds.",
    "**Removing genuine extremes teaches the model the world is tame**, and production is not.",
    "**Capping preserves the row and its rank and loses the magnitude** — right for a feature, wrong for a total.",
    "**Fit cap bounds on training rows only**, and not on rows that are themselves errors.",
    "**Fixed domain bounds cannot leak** and encode a fact about the world; values outside them are errors, better set to NaN than clipped.",
    "**A log transform keeps the magnitude in compressed form** — often better than capping for a skewed column with genuine extremes.",
    "**Influence is not outlyingness**: Cook's distance measures the effect on the fit, and the two lists overlap less than expected.",
    "**Huber gives large residuals linear weight; median regression cannot be moved by one row; trees split on ranks** — the model copes, the data stays.",
    "**Robust models survive errors; they do not correct them.** Twenty rows at 100× still pull, just linearly.",
    "**Score policies on a test set that contains the extremes** — cleaning the test set to match the training policy is how a bad policy hides.",
    "**Log every change with row, before, after, rule and evidence, and make it reversible.** A treatment nobody can review is a treatment nobody should trust."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why should winsorisation bounds be fit on the training split only?",
        options: [
          "It is faster",
          "Bounds from the full data include the test rows, so the cap is a value the model 'saw' — in production a larger-than-ever value gets capped at the training percentile, which the test should reflect",
          "The test set has no outliers",
          "sklearn requires it"
        ],
        answer: 1,
        why: "Any statistic estimated from data is a fit step, and fit steps see training data only. A test row above every training value is capped at the training 99th percentile — exactly what happens to a production row — and the test score is honest about it."
      },
      {
        stem: "A regression slope moves by a third when one row is removed. That row has a typical x and a wildly wrong y. Is that consistent?",
        options: [
          "Yes — any outlier moves the slope",
          "No — a row at a typical x has little leverage and mostly moves the intercept; a slope change that large implies an extreme x as well, which is what Cook's distance would show",
          "Yes, if the y is large enough",
          "Cannot tell"
        ],
        answer: 1,
        why: "Influence depends on residual and leverage together. A wrong y at the centre of x shifts the line up; a wrong y at the edge of x rotates it. Cook's distance combines both and identifies the consequential rows, which are not the same as the unusual ones."
      },
      {
        stem: "Twenty rows have amounts 100× too large from a pence/pounds mix-up. Which treatment is best?",
        options: [
          "Huber regression",
          "Divide by 100 — the cause is known and the correction is exact; a robust loss would only limit the damage, not remove it",
          "Cap at the 99th percentile",
          "Remove the rows"
        ],
        answer: 1,
        why: "When the cause is known, correct it. Robust models survive errors but still feel them — the comparison shows Huber at MAE 12 against 8 for the corrected data. And go and fix the source, because it will send pence again."
      },
      {
        stem: "A policy of removing all flagged rows scores best in validation. What should you check?",
        options: [
          "Nothing — it won",
          "Whether the validation set was also stripped of extremes; if production contains bulk orders, the honest test set must too, and on that set removal is the worst policy",
          "The random seed",
          "Whether capping was tried"
        ],
        answer: 1,
        why: "A model that never saw an amount above 300 meets one at 20,000 in production. The test set that flatters removal is one where those rows were removed too. Score every policy on a test set that reflects what the model will actually meet."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "You have found the outliers. What do you do with them?",
        strong: "Find out why each one is there, because unusual and wrong are different things. The other columns are the evidence: an amount that equals quantity times price is a genuine bulk order; one that is exactly 100 times that is pence for pounds. Errors get corrected or nulled; genuine extremes stay, with a cap, a log transform or a robust model if their magnitude is a problem; uncertain ones stay with a flag. Every change is logged with the before, after and rule, so it can be reviewed and reversed.",
        answer: [
          { t: "p", text: "Separating cause from score, and naming reversibility, is what makes this an answer about judgement rather than technique." }
        ]
      },
      {
        level: "advanced",
        q: "When would you change the model instead of the data?",
        strong: "When the values are genuine and I want the model to have seen them. A squared-error loss lets one extreme row dominate; Huber gives it linear weight, median regression cannot be moved by one row, and tree models split on ranks so an extreme x barely matters. The data stays as it is. But a robust model survives errors without correcting them — twenty rows at a hundred times the true amount still pull — so it is for genuine extremes, not for errors a rule could have fixed.",
        answer: [
          { t: "p", text: "\"Survives but does not correct\" is the distinction that shows you know the limit of robust methods." }
        ]
      },
      {
        level: "advanced",
        q: "Removing outliers improved validation error. Should you ship it?",
        strong: "Not before checking what the validation set contains. If the extremes were removed from it too, the policy is being scored on a world that does not exist — production will contain bulk orders, and a model that never saw one is wrong by the size of the order. On a test set that keeps the genuine extremes, removing them from training is usually the worst policy, and treating by cause the best. The test set has to reflect what the model will meet.",
        answer: [
          { t: "p", text: "\"Scored on a world that does not exist\" is the failure in one line, and the honest-test-set principle generalises well beyond outliers." }
        ]
      }
    ]
  }
});
