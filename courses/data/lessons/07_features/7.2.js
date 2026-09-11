/* ============================================================================
   LESSON 7.2 — Target Encoding Without Leaking
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "**Target encoding replaces each category with the average target for that category — which means the feature contains the answer.** Done naively, a row's own label is part of its feature, and the model scores brilliantly on training data it has already been told the answer to. Done properly — out of fold, smoothed toward the prior — it is the most powerful encoding for high-cardinality columns, and the difference between the two is a handful of lines that most implementations get wrong.",

  objectives: [
    "Explain why naive target encoding leaks and what the leak looks like in a validation score",
    "Implement out-of-fold target encoding and explain why the fold structure matters",
    "Apply smoothing toward the global prior and choose its strength from category counts",
    "Extend the method to regression targets, multiclass targets and the CatBoost ordered variant",
    "Detect target leakage in an encoded feature after the fact"
  ],

  prerequisites: ["7.1", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "The idea, and why the naive form is a leak", id: "leak" },

    { t: "p", text: "For a binary target, a category's target encoding is **the fraction of rows in that category with target 1**. It compresses a thousand-value column into one number that is directly about the target — which is its strength, and which is why computing it on the same rows you train on hands the model the label." },

    { t: "dl", items: [
      ["Target encoding", "Replace each category with a statistic of the target within that category: the mean for regression or binary, one column per class for multiclass. Also called mean encoding or likelihood encoding."],
      ["Target leakage", "Information about a row's label reaching its features. The row's own target contributes to its encoded value, so the feature partly *is* the label."],
      ["Out-of-fold (OOF) encoding", "Compute each row's encoding from the *other* folds only. A row's own label never touches its own feature. The test set is encoded with statistics from all of training."],
      ["Prior", "The global target mean. What you would guess for a category you know nothing about."],
      ["Smoothing", "Blending a category's mean toward the prior, with weight depending on how many rows the category has. A category with 3 rows is mostly prior; one with 3,000 is mostly itself."],
      ["Ordered target statistics", "CatBoost's variant: each row is encoded using only rows that come before it in a random permutation. No row sees its own label or any later row's."]
    ]},

    { t: "viz",
      title: "Naive against out-of-fold",
      caption: "Naive: every row's encoding includes its own label — the feature is contaminated with the answer. Out-of-fold: a row in fold 2 is encoded from folds 1, 3, 4 and 5; its own label is never in the average.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two diagrams: naive target encoding where each row's own label feeds its encoding, and out-of-fold encoding where a row in one fold is encoded from the other folds only">
  <text x="30" y="26" class="s-label" style="fill:var(--crit)">naive — fit on all, transform all</text>
  <g stroke-width="1.5">
    <rect x="30" y="40" width="60" height="26" style="fill:var(--crit);fill-opacity:.15;stroke:var(--crit)"/>
    <rect x="90" y="40" width="60" height="26" style="fill:var(--crit);fill-opacity:.15;stroke:var(--crit)"/>
    <rect x="150" y="40" width="60" height="26" style="fill:var(--crit);fill-opacity:.15;stroke:var(--crit)"/>
    <rect x="210" y="40" width="60" height="26" style="fill:var(--crit);fill-opacity:.15;stroke:var(--crit)"/>
    <rect x="270" y="40" width="60" height="26" style="fill:var(--crit);fill-opacity:.15;stroke:var(--crit)"/>
  </g>
  <text x="46" y="58" class="s-sub" style="fill:var(--ink-2)">row 1</text><text x="106" y="58" class="s-sub" style="fill:var(--ink-2)">row 2</text>
  <text x="166" y="58" class="s-sub" style="fill:var(--ink-2)">row 3</text><text x="226" y="58" class="s-sub" style="fill:var(--ink-2)">row 4</text>
  <text x="286" y="58" class="s-sub" style="fill:var(--ink-2)">row 5</text>
  <path d="M60 66 Q60 100 180 100 Q300 100 300 66" style="fill:none;stroke:var(--crit);stroke-width:1.5"/>
  <path d="M120 66 Q120 92 180 92 Q240 92 240 66" style="fill:none;stroke:var(--crit);stroke-width:1.5"/>
  <text x="120" y="126" class="s-sub" style="fill:var(--crit)">mean over ALL five — including row 3's own label</text>
  <line x1="180" y1="100" x2="180" y2="66" style="stroke:var(--crit);stroke-width:2" marker-end="url(#te-c)"/>
  <text x="30" y="156" class="s-sub" style="fill:var(--ink-3)">with 1 row per category the encoding IS the label: train AUC 1.0, test AUC 0.5</text>

  <text x="480" y="26" class="s-label" style="fill:var(--good)">out-of-fold — row 3 encoded from folds 1,2,4,5</text>
  <g stroke-width="1.5">
    <rect x="480" y="40" width="60" height="26" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="540" y="40" width="60" height="26" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="600" y="40" width="60" height="26" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn);stroke-width:2"/>
    <rect x="660" y="40" width="60" height="26" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="720" y="40" width="60" height="26" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
  </g>
  <text x="496" y="58" class="s-sub" style="fill:var(--ink-2)">fold 1</text><text x="556" y="58" class="s-sub" style="fill:var(--ink-2)">fold 2</text>
  <text x="616" y="58" class="s-sub" style="fill:var(--ink-2)">fold 3</text><text x="676" y="58" class="s-sub" style="fill:var(--ink-2)">fold 4</text>
  <text x="736" y="58" class="s-sub" style="fill:var(--ink-2)">fold 5</text>
  <path d="M510 66 Q510 100 570 100 L630 100" style="fill:none;stroke:var(--good);stroke-width:1.5"/>
  <path d="M570 66 L570 100" style="fill:none;stroke:var(--good);stroke-width:1.5"/>
  <path d="M690 66 Q690 100 660 100 L630 100" style="fill:none;stroke:var(--good);stroke-width:1.5"/>
  <path d="M750 66 Q750 100 700 100" style="fill:none;stroke:var(--good);stroke-width:1.5"/>
  <line x1="630" y1="100" x2="630" y2="68" style="stroke:var(--good);stroke-width:2" marker-end="url(#te-g)"/>
  <text x="480" y="126" class="s-sub" style="fill:var(--good)">mean over the OTHER folds — fold 3's labels never enter fold 3's feature</text>
  <text x="480" y="156" class="s-sub" style="fill:var(--ink-3)">test rows: encoded from ALL training folds, which is what production does</text>

  <line x1="30" y1="186" x2="850" y2="186" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="212" class="s-sub" style="fill:var(--ink-3)">Smoothing is the second fix: enc = (n · mean_cat + m · prior) / (n + m). A category with 3 rows and m = 10 is 77% prior.</text>
  <text x="30" y="234" class="s-sub" style="fill:var(--ink-3)">Without it, a category seen once in the other folds gets an encoding of exactly 0 or 1 — a coin flip presented as certainty.</text>
  <text x="30" y="266" class="s-sub" style="fill:var(--ink-3)">Both fixes are required. OOF without smoothing still overfits rare categories; smoothing without OOF still leaks common ones.</text>

  <defs>
    <marker id="te-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker>
    <marker id="te-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the naive version, and what the leak does to a score", code: `
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

rng = np.random.default_rng(0)
n = 20_000
# 2,000 categories -- a merchant id, a postcode -- with a WEAK real
# effect on a binary target:
cat = rng.integers(0, 2000, n)
cat_effect = rng.normal(0, 0.3, 2000)[cat]                 # small per-category shift
x_other = rng.normal(size=n)
logit = 0.8 * x_other + cat_effect
y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
df = pd.DataFrame({"cat": cat, "x": x_other, "y": y})

train, test = train_test_split(df, test_size=0.3, random_state=0, stratify=df["y"])

# NAIVE: category mean computed on TRAIN, applied to train and test.
means = train.groupby("cat")["y"].mean()
train_naive = train.assign(cat_te=train["cat"].map(means))
test_naive = test.assign(cat_te=test["cat"].map(means).fillna(train["y"].mean()))

m = LogisticRegression().fit(train_naive[["x", "cat_te"]], train_naive["y"])
roc_auc_score(train_naive["y"], m.predict_proba(train_naive[["x", "cat_te"]])[:, 1])   # 0.86
roc_auc_score(test_naive["y"], m.predict_proba(test_naive[["x", "cat_te"]])[:, 1])     # 0.69
#
# Train 0.86, test 0.69. The gap is the leak. With ~7 rows per
# category in training, each row's own label is 1/7 of its own
# feature. A category with ONE training row has cat_te == its label.
# The model learns "trust cat_te", and on test rows -- whose labels
# are not in the means -- cat_te is just a noisy category average.

# THE COEFFICIENT SHOWS IT:
m.coef_                        # [[0.4, 4.1]]  -- cat_te dominates x by 10x
#
# The true per-category effect is small (sd 0.3 on the logit). The
# model gave it a coefficient of 4.1 because in training, cat_te
# predicted y far better than any real feature could -- it contained
# y.

# HOW MUCH LEAK, as a function of category size:
train.groupby("cat").size().describe()
# mean 7, min 1, max 19
#
# For a category with k training rows, a row's own label is 1/k of
# its encoding. At k = 1 the encoding is the label. At k = 100 the
# leak is 1%, mostly harmless. The damage is concentrated in the
# rare categories -- which in a long-tailed column is most of them.

# NO CV SCORE CATCHES THIS if the encoding was fit before the split:
# every fold's rows had their labels in the means. The validation
# score is the same lie as the training score. That is why it has to
# be done INSIDE the folds.
`,
      hl: [21, 27, 33, 48],
      caption: "**Train 0.86, test 0.69, and `cat_te` has a coefficient ten times that of the real feature.** With seven rows per category, each row's own label is a seventh of its own feature; with one, the feature is the label."
    },

    { t: "callout", kind: "trap", title: "Cross-validation does not catch an encoding fit before the split", body: [
      { t: "p", text: "If the category means were computed on the whole training set and *then* the data was split into folds, every fold's rows had their labels in the means. The validation fold is encoded with its own answers. **The CV score is the same lie as the training score, and it looks like a well-generalising model.**" },
      { t: "p", text: "Target encoding has to happen inside the fold loop — or, equivalently, out-of-fold on the training set — so that the validation rows' labels are never in the statistics used to encode them." },
      { t: "p", text: "This is the general rule for any transformer that touches `y`: it belongs inside the Pipeline, inside the CV, not before it." }
    ]},

    { t: "h2", n: "02", text: "Out-of-fold and smoothing", id: "oof" },

    { t: "code", lang: "python", title: "the encoder done properly", code: `
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.base import BaseEstimator, TransformerMixin

class TargetEncoder(BaseEstimator, TransformerMixin):
    """Out-of-fold, smoothed target encoding.

    fit_transform(X, y)  -- for TRAINING data: each row is encoded
                            from the other folds. Never call fit()
                            then transform() on the same rows.
    transform(X)         -- for NEW data: encoded from the full
                            training statistics.

    m        smoothing strength: the number of 'virtual' rows of
             prior added to every category. m = 10 means a category
             with 10 real rows is 50% prior.
    """
    def __init__(self, m=10.0, n_splits=5, random_state=0):
        self.m, self.n_splits, self.random_state = m, n_splits, random_state

    def _stats(self, cats, y):
        g = pd.DataFrame({"c": cats, "y": y}).groupby("c")["y"].agg(["sum", "count"])
        return g

    def _encode(self, cats, stats, prior):
        s = stats.reindex(cats)
        n = s["count"].fillna(0).to_numpy()
        sm = s["sum"].fillna(0).to_numpy()
        # SMOOTHING: (sum + m * prior) / (count + m).
        # count = 0 (unseen) -> exactly the prior.
        # count large -> approaches the category mean.
        return (sm + self.m * prior) / (n + self.m)

    def fit(self, X, y):
        cats = np.asarray(X).ravel()
        y = np.asarray(y, float)
        self.prior_ = float(y.mean())
        self.stats_ = self._stats(cats, y)
        return self

    def transform(self, X):
        cats = np.asarray(X).ravel()
        return self._encode(cats, self.stats_, self.prior_).reshape(-1, 1)

    def fit_transform(self, X, y):
        cats = np.asarray(X).ravel()
        y = np.asarray(y, float)
        self.fit(X, y)                                  # full stats, for transform() later
        out = np.empty(len(cats))
        # STRATIFIED for a binary target keeps the prior stable per fold.
        kf = StratifiedKFold(self.n_splits, shuffle=True, random_state=self.random_state) \\
             if len(np.unique(y)) == 2 else KFold(self.n_splits, shuffle=True, random_state=self.random_state)
        for tr_idx, enc_idx in kf.split(cats, y):
            stats = self._stats(cats[tr_idx], y[tr_idx])
            prior = float(y[tr_idx].mean())
            out[enc_idx] = self._encode(cats[enc_idx], stats, prior)
        return out.reshape(-1, 1)


# USING IT -- fit_transform on train, transform on test:
te = TargetEncoder(m=10)
train_oof = train.assign(cat_te=te.fit_transform(train[["cat"]], train["y"]).ravel())
test_oof = test.assign(cat_te=te.transform(test[["cat"]]).ravel())

m2 = LogisticRegression().fit(train_oof[["x", "cat_te"]], train_oof["y"])
roc_auc_score(train_oof["y"], m2.predict_proba(train_oof[["x", "cat_te"]])[:, 1])   # 0.71
roc_auc_score(test_oof["y"], m2.predict_proba(test_oof[["x", "cat_te"]])[:, 1])     # 0.70
#
# Train 0.71, test 0.70. The gap is gone. The test score is a little
# HIGHER than the naive version's (0.70 vs 0.69), because the naive
# model had learned to over-trust cat_te and was miscalibrated.
m2.coef_                       # [[0.78, 1.9]]  -- x is back to its true weight

# WHAT SMOOTHING DID, category by category:
stats = train.groupby("cat")["y"].agg(["mean", "count"])
prior = train["y"].mean()
stats["smoothed"] = (stats["mean"] * stats["count"] + 10 * prior) / (stats["count"] + 10)
stats.sort_values("count").head(3)
#       mean  count  smoothed
# 1832   1.0      1     0.55       <- one row, label 1: raw says 100%, smoothed says 55%
# 407    0.0      1     0.45
# 1101   0.0      2     0.42
stats.sort_values("count").tail(2)
#       mean  count  smoothed
# 88    0.68     19     0.63       <- 19 rows: mostly itself
#
# A category seen once has an encoding near the prior. That is the
# honest statement: one row tells you almost nothing about the
# category's rate.

# CHOOSING m: it is the count at which a category is trusted 50/50
# against the prior.
#   m = 1     nearly raw means; rare categories are coin flips
#   m = 10    a category needs ~10 rows to be mostly itself
#   m = 100   only large categories move far from the prior
# Tune it like a hyperparameter, INSIDE the CV. A long-tailed column
# wants a higher m.

# THE OTHER SMOOTHING FORM -- a sigmoid on count, from the original
# Micci-Barreca paper: lambda(n) = 1 / (1 + exp(-(n - k) / f)).
# Same idea, two parameters instead of one. The additive form above
# is what category_encoders and most libraries use.

# sklearn HAS THIS NOW: sklearn.preprocessing.TargetEncoder (1.3+)
# does OOF in fit_transform and smoothing with a "auto" option
# that estimates m from the variance. It is the one to use in a
# Pipeline; the class above is to show what it does.
from sklearn.preprocessing import TargetEncoder as SkTE
sk = SkTE(smooth="auto", cv=5, random_state=0)
sk.fit_transform(train[["cat"]], train["y"])[:3]
`,
      hl: [27, 44, 52, 74],
      caption: "**A category seen once, label 1: raw encoding 1.0, smoothed 0.55.** One row tells you almost nothing about a category's rate, and the smoothed value says so."
    },

    { t: "h2", n: "03", text: "Regression, multiclass, and the ordered variant", id: "variants" },

    { t: "code", lang: "python", title: "the same idea for other targets, and CatBoost's version", code: `
# REGRESSION: the category mean of a continuous y. Same OOF, same
# smoothing; the prior is the global mean. Works unchanged:
y_reg = 100 + 30 * cat_effect + rng.normal(0, 20, n)
te_reg = TargetEncoder(m=10)
enc_reg = te_reg.fit_transform(df[["cat"]], y_reg)
#
# ALSO WORTH ENCODING for regression: the category MEDIAN (robust to
# a skewed target) and the category STD (how variable the target is
# within this category). Each is a separate OOF column.

# MULTICLASS: one column per class -- "P(class k | category)".
y_multi = rng.choice(3, n, p=[.5, .3, .2])
def multiclass_te(cats, y, m=10, n_splits=5, seed=0):
    classes = np.unique(y)
    out = np.empty((len(cats), len(classes)))
    for j, k in enumerate(classes):
        out[:, j] = TargetEncoder(m=m, n_splits=n_splits, random_state=seed) \\
                       .fit_transform(cats, (y == k).astype(float)).ravel()
    return out
multiclass_te(df[["cat"]], y_multi).shape         # (n, 3)
#
# The K columns sum to ~1 per row (exactly 1 before smoothing). Drop
# one if a linear model without regularisation is downstream; keep
# all for trees. For many classes this is K columns per categorical,
# which is still far fewer than one-hot.

# ORDERED TARGET STATISTICS -- CatBoost's approach.
# Instead of folds, a random permutation of rows. Each row is encoded
# using ONLY the rows before it in the permutation. No row sees its
# own label or any later row's; every row sees a different amount of
# history.
def ordered_te(cats, y, m=10, seed=0):
    rng_ = np.random.default_rng(seed)
    perm = rng_.permutation(len(cats))
    prior = y.mean()
    sums, counts = {}, {}
    out = np.empty(len(cats))
    for i in perm:
        c = cats[i]
        s, n_ = sums.get(c, 0.0), counts.get(c, 0)
        out[i] = (s + m * prior) / (n_ + m)              # BEFORE adding this row
        sums[c] = s + y[i]
        counts[c] = n_ + 1
    return out
#
# THE FIRST ROW OF EVERY CATEGORY GETS EXACTLY THE PRIOR. Early rows
# get noisy encodings; late rows get good ones. CatBoost averages
# over SEVERAL permutations to reduce that noise. The advantage over
# K-fold: no fold boundary, and it composes naturally with the
# boosting rounds (which is why CatBoost does it). In pure pandas,
# K-fold OOF is simpler and about as good.

# TIME-ORDERED DATA -- the case where "ordered" is not optional.
# If rows have timestamps and production will encode a row using
# only PAST rows, then training must too. K-fold OOF encodes a
# January row using March rows -- fine for i.i.d. data, a temporal
# leak for a time series (see 8.3). Use the ordered form with the
# TIME order as the permutation:
def time_ordered_te(cats, y, ts, m=10):
    order = np.argsort(ts, kind="stable")
    prior = y.mean()
    sums, counts = {}, {}
    out = np.empty(len(cats))
    for i in order:
        c = cats[i]
        s, n_ = sums.get(c, 0.0), counts.get(c, 0)
        out[i] = (s + m * prior) / (n_ + m)
        sums[c] = s + y[i]; counts[c] = n_ + 1
    return out
#
# Now each row's encoding is "this category's rate, as known at the
# time" -- which is exactly what a production system computing it
# from historical data would produce. The expanding groupby in 4.3
# does the same thing vectorised: groupby(cat)[y].expanding().mean()
# .shift(1), with the shift excluding the current row.

# INTERACTIONS: target-encode a PAIR of categoricals.
df["pair"] = df["cat"].astype(str) + "|" + (df["x"] > 0).astype(str)
enc_pair = TargetEncoder(m=20).fit_transform(df[["pair"]], df["y"])
#
# "merchant x weekend", "postcode x product type". Cardinality
# multiplies, so smoothing matters more (m=20). Powerful when the
# interaction is real; noise when it is not, and the OOF score is
# what tells you which.
`,
      hl: [13, 29, 46, 57],
      caption: "**On time-ordered data, K-fold OOF encodes a January row using March rows.** Fine for i.i.d. data, a temporal leak for a time series — the ordered form with time as the permutation is what production will actually compute."
    },

    { t: "table",
      head: ["Variant", "Each row encoded from", "Prevents", "Cost", "Use when"],
      rows: [
        ["Naive", "All training rows including itself", "Nothing", "—", "**Never** for a model; only for a one-off descriptive table"],
        ["K-fold OOF", "The other K−1 folds", "Own-label leak", "K groupbys", "**The default** for i.i.d. data"],
        ["OOF + smoothing", "Other folds, blended to prior by count", "Own-label leak and rare-category overfit", "One parameter to tune", "**Always** — the two fixes are both required"],
        ["Ordered (random permutation)", "Rows earlier in a random order", "Own-label leak, without fold boundaries", "Noisier early rows; average permutations", "Inside a boosting loop (CatBoost)"],
        ["Ordered (time)", "Rows earlier in time", "Own-label leak **and** temporal leak", "Sequential; expanding-mean vectorises it", "**Required** for time-ordered data"],
        ["Per-class (multiclass)", "As above, one column per class", "As above", "K columns", "Multiclass targets"]
      ],
      caption: "**Both fixes are required.** OOF without smoothing still overfits rare categories to a coin flip; smoothing without OOF still leaks the common ones."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The fraud model that was too good",
      difficulty: "expert",
      minutes: 34,
      body: [
        { t: "p", text: "A fraud model reached AUC 0.97 in cross-validation and 0.71 in the first week of production. It uses target-encoded `merchant_id` (40,000 merchants) and `device_id` (200,000 devices). The encoding code is below." },
        { t: "code", lang: "python", numbered: false, title: "encode.py", code: `
def add_target_encodings(df):
    for col in ["merchant_id", "device_id"]:
        means = df.groupby(col)["is_fraud"].mean()
        df[f"{col}_te"] = df[col].map(means)
    return df

df = add_target_encodings(df)
scores = cross_val_score(model, df[FEATURES], df["is_fraud"], cv=5)   # 0.97`},
        { t: "p", text: "Diagnose every defect, quantify the leak for the two columns, rebuild the encoding so the CV score is honest, and add a check that would have caught this before deployment." }
      ],
      requirements: [
        "Explain why CV gave 0.97 despite the encoding being 'fit on the data'.",
        "Quantify the leak per column from the category-size distribution.",
        "Rebuild with OOF + smoothing, and with time ordering if the data has timestamps.",
        "Show the honest CV score and that it matches a held-out test.",
        "Add a leak detector: an encoded feature's train/test AUC gap, or its correlation with the target on a shuffled-label control.",
        "Tests for each claim."
      ],
      hint: "With 200,000 devices and maybe 400,000 transactions, most devices have one or two rows. What is `device_id_te` for a device with one row?",
      solution: {
        lang: "python",
        title: "fraud_encoding_fixed.py",
        code: `import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score


# =========================================================================
# THE DEFECTS
# =========================================================================
#
# 1. THE ENCODING IS COMPUTED ON THE WHOLE FRAME, BEFORE THE CV.
#    cross_val_score splits rows into folds AFTER df already contains
#    merchant_id_te and device_id_te -- and those were computed with
#    every row's label, including the validation fold's. Each
#    validation row is scored on a feature that contains its own
#    label. CV is measuring how well the model can read its own
#    answer sheet.
#
# 2. NO SMOOTHING. A device with one transaction has device_id_te
#    equal to its label: 0 or 1, exactly. With 200k devices and
#    ~2 rows each, device_id_te IS is_fraud for most rows.
#
# 3. NO HANDLING OF UNSEEN VALUES. In production, a new device has no
#    entry in means -> NaN -> whatever the model does with NaN. And
#    new devices are exactly where fraud concentrates.
#
# 4. THE FRAME IS MUTATED IN PLACE, so the leaked columns persist into
#    every later step and every later experiment.
#
# 5. (If timestamps exist) K-fold OOF would still encode a January
#    transaction using December's fraud outcomes for the same
#    merchant -- outcomes that were not known in January. Fraud
#    labels arrive weeks late. Time ordering is required.


def quantify_leak(df, col, target="is_fraud"):
    """For each row, what fraction of its naive encoding is its own label?"""
    n_per = df.groupby(col)[target].transform("size")
    own_share = 1.0 / n_per
    return {
        "column": col,
        "n_categories": int(df[col].nunique()),
        "rows_per_category_median": float(n_per.median()),
        "share_singletons": float((n_per == 1).mean()),
        "mean_own_label_share": float(own_share.mean()),
        # for singletons, encoding == label exactly
        "rows_where_encoding_is_label": int((n_per == 1).sum()),
    }

# quantify_leak(df, "merchant_id")
# {'n_categories': 40000, 'rows_per_category_median': 6,
#  'share_singletons': 0.21, 'mean_own_label_share': 0.31, ...}
# quantify_leak(df, "device_id")
# {'n_categories': 200000, 'rows_per_category_median': 1,
#  'share_singletons': 0.68, 'mean_own_label_share': 0.79, ...}
#
# For device_id, 68% of rows are the ONLY row for their device: the
# encoding is the label. The average row's own label is 79% of its
# feature. This is not a leak; it is the target column with a
# different name.


# =========================================================================
# THE REBUILD
# =========================================================================

def oof_time_encode(df, col, target, ts, m=20):
    """Time-ordered smoothed target encoding: each row sees only
    earlier rows. Vectorised via cumulative sums within category."""
    d = df[[col, target, ts]].copy()
    d["_order"] = np.arange(len(d))
    d = d.sort_values([ts, "_order"], kind="stable")
    prior = d[target].mean()
    g = d.groupby(col)[target]
    # cumsum/cumcount INCLUDE the current row; shift them by one row
    # within the group so the current row is excluded.
    cum_sum = g.cumsum() - d[target]
    cum_cnt = g.cumcount()                                # rows BEFORE this one
    enc = (cum_sum + m * prior) / (cum_cnt + m)
    return enc.reindex(d.sort_values("_order").index).to_numpy() if False else \\
           enc.sort_index().to_numpy()


def full_encode(train, test, col, target, ts=None, m=20):
    """Train: time-ordered OOF. Test: statistics from all of train."""
    if ts is not None:
        tr_enc = oof_time_encode(train, col, target, ts, m)
    else:
        tr_enc = np.empty(len(train))
        kf = StratifiedKFold(5, shuffle=True, random_state=0)
        prior_all = train[target].mean()
        for a, b in kf.split(train, train[target]):
            st = train.iloc[a].groupby(col)[target].agg(["sum", "count"])
            s = st.reindex(train.iloc[b][col])
            tr_enc[b] = ((s["sum"].fillna(0) + m * prior_all) /
                         (s["count"].fillna(0) + m)).to_numpy()
    st = train.groupby(col)[target].agg(["sum", "count"])
    prior = train[target].mean()
    s = st.reindex(test[col])
    te_enc = ((s["sum"].fillna(0) + m * prior) / (s["count"].fillna(0) + m)).to_numpy()
    return tr_enc, te_enc
    # UNSEEN in test: count 0 -> exactly the prior. Honest, no NaN.


# =========================================================================
# THE LEAK DETECTOR -- run before any model is trusted
# =========================================================================

def leak_check(train_enc, train_y, test_enc, test_y, name):
    """An encoded feature's own AUC, train vs test. A large gap means
    the training encoding contains the label."""
    tr = roc_auc_score(train_y, train_enc)
    te = roc_auc_score(test_y, test_enc)
    return {"feature": name, "train_auc_alone": round(tr, 3),
            "test_auc_alone": round(te, 3), "gap": round(tr - te, 3),
            "suspicious": (tr - te) > 0.05}


def shuffled_label_control(df, col, target, m=20):
    """Encode against SHUFFLED labels. An honest encoder gives a
    feature with AUC ~0.5 against the real labels. A leaky one gives
    AUC well above 0.5 -- because it encoded the shuffled labels,
    which for singletons equal... the shuffled labels, which the real
    labels are uncorrelated with. So an honest encoder scores 0.5
    and a leaky one, on the SHUFFLED target, scores ~1.0 against the
    shuffled target itself."""
    rng_ = np.random.default_rng(0)
    y_shuf = rng_.permutation(df[target].to_numpy())
    naive = df[col].map(pd.Series(y_shuf).groupby(df[col].to_numpy()).mean())
    return {"naive_auc_vs_shuffled": round(roc_auc_score(y_shuf, naive), 3)}
    # -> ~0.9+. The naive encoder "predicts" random labels. That is
    #    the signature of a feature that contains the target.


# =========================================================================
# TESTS
# =========================================================================

def _fraud(n=60_000, seed=0):
    rng = np.random.default_rng(seed)
    merchant = rng.integers(0, 8000, n)
    device = rng.integers(0, 40000, n)
    m_eff = rng.normal(0, 0.8, 8000)[merchant]
    amt = rng.lognormal(3, 1, n)
    logit = -4 + m_eff + 0.3 * np.log1p(amt)
    y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
    ts = pd.Timestamp("2026-01-01") + pd.to_timedelta(rng.integers(0, 90 * 24, n), "h")
    return pd.DataFrame({"merchant_id": merchant, "device_id": device,
                         "amount": amt, "is_fraud": y, "ts": ts})


def test_singletons_make_naive_encoding_equal_the_label():
    df = _fraud()
    q = quantify_leak(df, "device_id")
    assert q["share_singletons"] > 0.3
    means = df.groupby("device_id")["is_fraud"].mean()
    naive = df["device_id"].map(means)
    single = df.groupby("device_id")["is_fraud"].transform("size") == 1
    assert (naive[single] == df.loc[single, "is_fraud"]).all()


def test_naive_cv_is_inflated_and_honest_cv_is_not():
    df = _fraud()
    tr, te = train_test_split(df, test_size=0.3, random_state=0, stratify=df["is_fraud"])
    model = HistGradientBoostingClassifier(max_iter=100, random_state=0)

    # NAIVE, fit before split, as in the original:
    d = df.copy()
    for col in ("merchant_id", "device_id"):
        d[f"{col}_te"] = d[col].map(d.groupby(col)["is_fraud"].mean())
    naive_cv = cross_val_score(model, d[["amount", "merchant_id_te", "device_id_te"]],
                               d["is_fraud"], cv=5, scoring="roc_auc").mean()

    # HONEST: OOF on train, stats on test.
    Xtr, Xte = tr[["amount"]].copy(), te[["amount"]].copy()
    for col in ("merchant_id", "device_id"):
        a, b = full_encode(tr, te, col, "is_fraud", ts="ts")
        Xtr[f"{col}_te"], Xte[f"{col}_te"] = a, b
    model.fit(Xtr, tr["is_fraud"])
    honest_test = roc_auc_score(te["is_fraud"], model.predict_proba(Xte)[:, 1])

    assert naive_cv > 0.9
    assert honest_test < 0.85
    assert naive_cv - honest_test > 0.1


def test_honest_train_and_test_agree():
    df = _fraud()
    tr, te = train_test_split(df, test_size=0.3, random_state=0, stratify=df["is_fraud"])
    a, b = full_encode(tr, te, "merchant_id", "is_fraud", ts="ts")
    chk = leak_check(a, tr["is_fraud"], b, te["is_fraud"], "merchant_id_te")
    assert not chk["suspicious"], chk


def test_leak_check_flags_the_naive_encoding():
    df = _fraud()
    tr, te = train_test_split(df, test_size=0.3, random_state=0, stratify=df["is_fraud"])
    means = tr.groupby("device_id")["is_fraud"].mean()
    a = tr["device_id"].map(means).to_numpy()
    b = te["device_id"].map(means).fillna(tr["is_fraud"].mean()).to_numpy()
    chk = leak_check(a, tr["is_fraud"], b, te["is_fraud"], "device_id_te_naive")
    assert chk["suspicious"] and chk["gap"] > 0.2


def test_shuffled_label_control():
    df = _fraud()
    assert shuffled_label_control(df, "device_id", "is_fraud")["naive_auc_vs_shuffled"] > 0.8


def test_time_ordered_never_sees_the_future():
    df = _fraud().sort_values("ts").reset_index(drop=True)
    enc = oof_time_encode(df, "merchant_id", "is_fraud", "ts", m=20)
    # corrupt every label after the midpoint; encodings before it must not change
    df2 = df.copy(); df2.loc[len(df) // 2:, "is_fraud"] = 1 - df2.loc[len(df) // 2:, "is_fraud"]
    enc2 = oof_time_encode(df2, "merchant_id", "is_fraud", "ts", m=20)
    cut = len(df) // 2
    assert np.allclose(enc[:cut], enc2[:cut])


def test_unseen_category_gets_the_prior():
    df = _fraud()
    tr, te = train_test_split(df, test_size=0.3, random_state=0)
    te = te.copy(); te.loc[te.index[:5], "device_id"] = 10**9      # never seen
    _, b = full_encode(tr, te, "device_id", "is_fraud", ts="ts")
    assert np.allclose(b[:5], tr["is_fraud"].mean())
    assert not np.isnan(b).any()


def test_smoothing_pulls_singletons_toward_prior():
    df = _fraud()
    tr, te = train_test_split(df, test_size=0.3, random_state=0)
    a, _ = full_encode(tr, te, "device_id", "is_fraud", ts="ts", m=20)
    prior = tr["is_fraud"].mean()
    # no training encoding should be exactly 0 or 1
    assert a.min() > 0 and a.max() < 1
    assert abs(np.median(a) - prior) < 0.05`,
        notes: [
          { t: "p", text: "**For `device_id`, 68% of rows are the only row for their device, so the naive encoding *is* the label.** The average row's own label is 79% of its feature. This is not a subtle leak — it is the target column under another name, and the model scored 0.97 by reading it." },
          { t: "callout", kind: "trap", title: "Cross-validation measured how well the model reads its own answer sheet", body: [
            { t: "p", text: "The folds were made *after* the encoding existed in the frame, so every validation row was encoded with its own label included. **The CV score was the same lie as a training score, and it looked like generalisation.**" },
            { t: "p", text: "Any transformer that touches `y` belongs inside the fold loop. That is the rule, and target encoding is the case where breaking it costs the most." }
          ]},
          { t: "p", text: "**Time ordering is required, not optional, because fraud labels arrive late.** K-fold OOF would encode a January transaction using December's outcomes for the same merchant — outcomes nobody knew in January. The corruption test flips every label after the midpoint and asserts the earlier encodings are unchanged." },
          { t: "p", text: "**Smoothing at m = 20 means no training encoding is exactly 0 or 1.** A device seen once sits near the prior; the test asserts the median encoding is within 0.05 of it. Without smoothing, OOF still hands the model a coin flip for every singleton and calls it a probability." },
          { t: "p", text: "**The leak detector is the check that would have caught this before deployment.** An encoded feature's AUC alone, train against test: an honest encoding gives a small gap; the naive one gives a gap over 0.2. The shuffled-label control is the second form — a naive encoder 'predicts' random labels with AUC 0.9, which no real feature can do." },
          { t: "p", text: "**An unseen device gets exactly the prior, not NaN.** New devices are where fraud concentrates, and the original's `map` would have handed the model NaN for precisely the rows that matter most." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Target encoding is computed on the full training set, then `cross_val_score` is run. The CV AUC is 0.96. What does that number measure?",
          options: [
            "Generalisation to unseen data",
            "How well the model reads a feature that contains each validation row's own label — the encoding was built with every fold's labels before the folds were made",
            "The model's calibration",
            "The strength of the categorical feature"
          ],
          answer: 1,
          why: "The validation fold's rows contributed their labels to the category means they are then encoded with. CV cannot catch a leak that happened before the split. The encoding must run inside the fold loop, out-of-fold, so no row's label ever reaches its own feature."
        }
      ]
    }
  ],

  takeaways: [
    "**Target encoding compresses a high-cardinality column into one number that is directly about the target** — which is why it is powerful and why it leaks.",
    "**Naively, a row's own label is 1/k of its feature** for a category with k rows; at k = 1 the feature is the label.",
    "**Cross-validation does not catch an encoding fit before the split.** The validation fold was encoded with its own answers.",
    "**Out-of-fold: each training row is encoded from the other folds; test rows from all of training** — which is what production will do.",
    "**Smoothing blends toward the prior by count**: `(sum + m·prior) / (count + m)`. A singleton sits near the prior instead of at 0 or 1.",
    "**Both fixes are required.** OOF without smoothing overfits rare categories; smoothing without OOF leaks common ones.",
    "**m is the count at which a category is trusted 50/50 against the prior** — tune it inside the CV, higher for longer tails.",
    "**An unseen category gets exactly the prior**, never NaN — and new values are often where the signal is.",
    "**Regression uses the category mean of y; multiclass uses one column per class**; median and std are worth encoding too.",
    "**On time-ordered data, K-fold OOF is a temporal leak** — encode each row from earlier rows only, which is an expanding mean with a shift.",
    "**CatBoost's ordered statistics are the same idea with a random permutation**, averaged over several to reduce early-row noise.",
    "**A leak detector**: an encoded feature's AUC alone, train against test — a gap over 0.05 is suspicious. A shuffled-label control confirms it.",
    "**`sklearn.preprocessing.TargetEncoder` does OOF and smoothing correctly** — use it in a Pipeline rather than hand-rolling."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A category appears once in training with label 1. What is its target encoding under OOF with smoothing (m = 10, prior = 0.1)?",
        options: [
          "1.0",
          "About 0.1 — in the fold containing that row it is unseen by the other folds, so it gets the prior; and even with count 1 it would be (1 + 10 × 0.1) / 11 ≈ 0.18",
          "0.5",
          "NaN"
        ],
        answer: 1,
        why: "OOF means the row's own label never enters its encoding, and a singleton is unseen from the other folds' perspective. Smoothing means even a seen-once category is pulled hard toward the prior. Naively it would be exactly 1.0 — the label."
      },
      {
        stem: "Why must target encoding on time-ordered data use time order rather than random folds?",
        options: [
          "Random folds are slower",
          "Random OOF encodes a January row using later rows' outcomes for the same category — outcomes not known in January, which production cannot compute",
          "Time order gives smoother encodings",
          "It does not matter"
        ],
        answer: 1,
        why: "The encoding production will compute is 'this category's rate as known at the time'. Training must match that. An expanding mean within category, shifted by one row so the current row is excluded, produces exactly it — and a test that corrupts future labels and checks earlier encodings are unchanged proves it."
      },
      {
        stem: "What is the purpose of the smoothing parameter m?",
        options: [
          "To speed up computation",
          "To blend a category's mean toward the global prior in proportion to how few rows it has — a category needs about m rows before it is trusted more than the prior",
          "To handle NaN",
          "To normalise the encoding to 0–1"
        ],
        answer: 1,
        why: "Without smoothing, a category with two rows gets an encoding of 0, 0.5 or 1 — a coin flip presented as a rate. With m = 10, that category is over 80% prior. The right m depends on the tail of the category distribution and is tuned inside the CV."
      },
      {
        stem: "How can you detect after the fact that an encoded feature leaks?",
        options: [
          "It cannot be detected",
          "Compare the feature's own AUC against the target on train versus test — a large gap means the training encoding contains the label; or encode against shuffled labels and check the naive version 'predicts' them",
          "Check for NaN",
          "Check its correlation with other features"
        ],
        answer: 1,
        why: "A feature that legitimately predicts the target does so about equally on train and test. One that contains the label predicts train far better. The shuffled-label control is decisive: no honest feature can predict random labels, and a naive target encoding does — with AUC near 0.9."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is target encoding and why is it dangerous?",
        strong: "Replacing each category with the target's mean within that category — one number that is directly about the target, which is why it works for high-cardinality columns where one-hot cannot. It is dangerous because each row's own label is part of its own encoding: for a category with one row, the feature is the label. The model learns to trust it, scores brilliantly on data it has been told the answer to, and fails on data it has not.",
        answer: [
          { t: "p", text: "\"The feature is the label\" for singletons is the concrete image; it explains the 0.97-to-0.71 collapse in one sentence." }
        ]
      },
      {
        level: "expert",
        q: "How do you do target encoding correctly?",
        strong: "Two things, both required. Out-of-fold: each training row is encoded from the other folds, so its own label never enters its feature, and test rows are encoded from all of training as production would. Smoothing: blend each category's mean toward the global prior by count, so a singleton sits near the prior rather than at 0 or 1. And on time-ordered data, the folds have to be time — an expanding mean with a shift — or the encoding uses outcomes that were not known yet. Then verify: the encoded feature's AUC alone should be about the same on train and test.",
        answer: [
          { t: "p", text: "Naming the time-ordered case unprompted, and ending with a verification, is what distinguishes someone who has shipped this." }
        ]
      },
      {
        level: "expert",
        q: "A colleague's model has CV AUC 0.97 and uses target-encoded IDs. What do you ask?",
        strong: "Where the encoding was computed relative to the CV split. If the encoded columns existed in the frame before `cross_val_score` ran, every validation fold was encoded with its own labels, and 0.97 is a training score wearing a validation label. Then I would check the category-size distribution — with hundreds of thousands of IDs, most are singletons and the naive encoding equals the target — and run the shuffled-label control, which a leaky encoder passes with AUC near 0.9 and an honest one fails at 0.5.",
        answer: [
          { t: "p", text: "Leading with the one question that decides it — encoding before or inside the split — is efficient diagnosis." }
        ]
      }
    ]
  }
});
