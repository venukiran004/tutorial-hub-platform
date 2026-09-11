/* ============================================================================
   LESSON 6.6 — Imputation and What It Costs
   ========================================================================= */
EC.receiveLesson({
  id: "6.6",

  lede: "**Every imputation invents data, and every invented value is one the model will treat as observed.** Filling with the mean preserves the mean and destroys the variance. Filling with a model's prediction preserves the structure and overstates the certainty. The question is never \"which method is best\" — it is \"what does this method destroy, and can the analysis afford to lose it\".",

  objectives: [
    "Explain what mean, median and mode imputation do to variance, correlation and standard errors",
    "Use group-conditional, KNN and iterative imputation and say what each assumes",
    "Add missingness indicators and explain when they matter more than the fill",
    "Fit imputers on training data only and apply them to test data without leakage",
    "Use multiple imputation to carry uncertainty through to a conclusion"
  ],

  prerequisites: ["6.5"],

  blocks: [

    { t: "h2", n: "01", text: "The simple fills, and the variance they remove", id: "simple" },

    { t: "p", text: "Replacing every missing value in a column with the column's mean is the most common imputation and the most damaging one that looks harmless. **It puts a spike at one point in the distribution, and every statistic that depends on spread — standard deviation, correlation, confidence interval — is now computed on a column that has less spread than the truth.**" },

    { t: "dl", items: [
      ["Mean imputation", "Replace missing with the column mean. Preserves the mean; shrinks the variance; attenuates every correlation; understates every standard error."],
      ["Median imputation", "Same, with the median. More robust to skew and outliers; same damage to spread."],
      ["Mode imputation", "For categoricals: fill with the most common value. Inflates that category's share and weakens its association with everything."],
      ["Constant imputation", "Fill with a chosen value — 0, −1, \"unknown\". Honest only if the value is impossible in the real data and the model can learn it means \"missing\"."],
      ["Attenuation", "The weakening of a correlation because one variable has had noise or a constant injected into it. Imputed columns correlate less with everything, including the target."],
      ["Single imputation", "Any method that fills each gap once with one value. It treats the guess as a fact, which is why the standard errors that follow are too small."]
    ]},

    { t: "viz",
      title: "What mean imputation does to a scatter",
      caption: "Left: the true relationship. Right: 30% of x replaced by its mean. Those points form a vertical line at the mean — they have the right y and a made-up x — and the fitted slope is pulled flatter. The correlation drops from 0.8 to 0.6 and nothing raised.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Two scatter plots: the true x-y relationship, and the same data with 30 percent of x values replaced by the column mean forming a vertical stripe">
  <g transform="translate(40,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--good)">true data — r = 0.80</text>
    <rect x="0" y="0" width="320" height="200" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <g style="fill:var(--good);fill-opacity:.7">
      <circle cx="30" cy="170" r="4"/><circle cx="50" cy="150" r="4"/><circle cx="70" cy="160" r="4"/><circle cx="90" cy="130" r="4"/>
      <circle cx="110" cy="140" r="4"/><circle cx="130" cy="110" r="4"/><circle cx="150" cy="120" r="4"/><circle cx="170" cy="90" r="4"/>
      <circle cx="190" cy="100" r="4"/><circle cx="210" cy="70" r="4"/><circle cx="230" cy="85" r="4"/><circle cx="250" cy="55" r="4"/>
      <circle cx="270" cy="65" r="4"/><circle cx="290" cy="40" r="4"/><circle cx="60" cy="140" r="4"/><circle cx="160" cy="105" r="4"/>
      <circle cx="240" cy="70" r="4"/><circle cx="100" cy="150" r="4"/><circle cx="200" cy="85" r="4"/><circle cx="280" cy="50" r="4"/>
    </g>
    <line x1="20" y1="175" x2="300" y2="40" style="stroke:var(--good);stroke-width:2"/>
  </g>
  <g transform="translate(480,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--crit)">30% of x mean-imputed — r = 0.60</text>
    <rect x="0" y="0" width="320" height="200" style="fill:none;stroke:var(--line);stroke-width:1.2"/>
    <g style="fill:var(--ink-3);fill-opacity:.5">
      <circle cx="30" cy="170" r="4"/><circle cx="70" cy="160" r="4"/><circle cx="110" cy="140" r="4"/><circle cx="150" cy="120" r="4"/>
      <circle cx="190" cy="100" r="4"/><circle cx="230" cy="85" r="4"/><circle cx="270" cy="65" r="4"/><circle cx="60" cy="140" r="4"/>
      <circle cx="240" cy="70" r="4"/><circle cx="100" cy="150" r="4"/><circle cx="200" cy="85" r="4"/><circle cx="280" cy="50" r="4"/>
      <circle cx="130" cy="110" r="4"/><circle cx="250" cy="55" r="4"/>
    </g>
    <g style="fill:var(--crit)">
      <circle cx="160" cy="150" r="4"/><circle cx="160" cy="130" r="4"/><circle cx="160" cy="90" r="4"/>
      <circle cx="160" cy="70" r="4"/><circle cx="160" cy="40" r="4"/><circle cx="160" cy="105" r="4"/>
    </g>
    <line x1="160" y1="20" x2="160" y2="190" style="stroke:var(--crit);stroke-width:1;stroke-dasharray:4 3"/>
    <line x1="20" y1="160" x2="300" y2="60" style="stroke:var(--crit);stroke-width:2"/>
    <text x="170" y="34" class="s-sub" style="fill:var(--crit)">the mean</text>
  </g>
  <text x="40" y="262" class="s-sub" style="fill:var(--ink-3)">The imputed rows keep their true y and get a fake x at the centre. They cannot follow the trend, so they flatten it. Every downstream model inherits the flattened slope.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "measuring what each simple fill destroys", code: `
import pandas as pd
import numpy as np

rng = np.random.default_rng(0)
n = 5_000
x = rng.normal(50, 10, n)
y = 2 * x + rng.normal(0, 8, n)
full = pd.DataFrame({"x": x, "y": y})

# 30% of x missing, MCAR -- the kindest possible case:
obs = full.copy()
obs.loc[rng.random(n) < 0.3, "x"] = np.nan

def report(df, label):
    d = df.dropna() if label == "complete-case" else df
    print(f"{label:22} mean {d['x'].mean():6.2f}  std {d['x'].std():5.2f}  "
          f"corr {d['x'].corr(d['y']):.3f}  slope {np.polyfit(d['x'], d['y'], 1)[0]:.3f}")

report(full, "truth")
report(obs, "complete-case")
# truth                  mean  50.02  std 10.01  corr 0.928  slope 2.00
# complete-case          mean  50.05  std 10.04  corr 0.928  slope 2.00
#
# MCAR, so dropping is unbiased. 30% fewer rows; everything else right.

# MEAN IMPUTATION:
mean_imp = obs.copy()
mean_imp["x"] = mean_imp["x"].fillna(obs["x"].mean())
report(mean_imp, "mean")
# mean                   mean  50.05  std  8.39  corr 0.777  slope 2.00
#
# THE MEAN IS RIGHT. The std has dropped from 10 to 8.4 -- 30% of
# the values are now at one point. The correlation has dropped from
# 0.93 to 0.78. The slope happens to survive here because the
# imputed rows sit at the mean of x, which is the pivot of the
# regression line -- a coincidence of MCAR that does not hold under
# MAR.

# WHAT THAT DOES TO A STANDARD ERROR:
def se_of_mean(s):
    return s.std() / np.sqrt(len(s))

se_of_mean(obs["x"].dropna())        # 0.170  (n = 3500, honest)
se_of_mean(mean_imp["x"])            # 0.119  (n = 5000, but 1500 are fake)
#
# The imputed column claims 30% more precision than the data has.
# Every confidence interval built on it is too narrow. Every p-value
# is too small. The data did not get more informative because you
# filled in the gaps -- but every downstream calculation thinks it did.

# MEDIAN: same damage, robust to the distribution's shape.
med_imp = obs.copy()
med_imp["x"] = med_imp["x"].fillna(obs["x"].median())
report(med_imp, "median")
# median                 mean  50.05  std  8.39  corr 0.777  slope 2.00

# MODE, for a categorical -- and the share it inflates:
cat = pd.Series(rng.choice(["a", "b", "c"], n, p=[.5, .3, .2]))
cat_obs = cat.where(rng.random(n) >= 0.3)
cat_obs.value_counts(normalize=True)                   # a .50 b .30 c .20 of present
cat_obs.fillna(cat_obs.mode()[0]).value_counts(normalize=True)
# a    0.65      <- "a" was 50%; now 65%. Every association involving
# b    0.21         "a" is diluted by 1500 rows that are not really "a".
# c    0.14

# THE UNDER-MAR CASE, where the mean is the WRONG group's mean:
age = rng.integers(20, 70, n)
income = 20_000 + 900 * (age - 20) + rng.normal(0, 8_000, n)
mar = pd.DataFrame({"age": age, "income": income})
p_miss = 0.05 + 0.6 * (age - 20) / 50
mar.loc[rng.random(n) < p_miss, "income"] = np.nan

mar["income"].fillna(mar["income"].mean()).mean()      # 34,900
income.mean()                                          # 38,000
#
# The observed mean is low (older, richer respondents are missing),
# and filling with it puts that low value into exactly the rows that
# should be high. The bias is not reduced by imputing; it is baked in
# and hidden, because now there are no gaps to remind anyone.

# THE HONEST SUMMARY OF SIMPLE IMPUTATION:
#   + the column is complete; models that cannot take NaN will run
#   - variance understated, correlations attenuated, SEs too small
#   - under MAR/MNAR the mean itself is biased and the bias is now
#     invisible
#   - the model learns nothing from the missingness, because the fill
#     erased it
#
# It is acceptable when: the missing rate is small (< 5%), the
# mechanism is close to MCAR, and the column is a weak feature. It is
# a decision, so record it.
`,
      hl: [26, 39, 62, 75],
      caption: "**The imputed column claims 30% more precision than the data has.** Standard error drops from 0.170 to 0.119 because n went from 3,500 to 5,000 — but 1,500 of those values were invented, and every confidence interval built on the column is too narrow."
    },

    { t: "callout", kind: "trap", title: "Imputation hides the bias it does not remove", body: [
      { t: "p", text: "Under MAR, the observed mean is the wrong group's mean. Filling with it puts a low value into rows that should be high — and then there are no gaps left to show that anything was ever missing." },
      { t: "p", text: "**A column with NaN in it is a column that announces a problem. An imputed column is a column that has stopped announcing it.** The bias is the same size either way; only the visibility changed." },
      { t: "p", text: "The missingness indicator is the fix for visibility: it keeps the fact of the gap in the data after the gap itself is filled." }
    ]},

    { t: "h2", n: "02", text: "Imputation that uses structure", id: "structured" },

    { t: "p", text: "**A better guess uses the other columns.** If missingness is MAR — predictable from observed data — then the missing value is too, and an imputation that conditions on the right columns can be nearly unbiased. Each method makes a different assumption about what \"conditions on\" means." },

    { t: "code", lang: "python", title: "group-conditional, KNN and iterative imputation", code: `
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer

# GROUP-CONDITIONAL: fill with the mean of the row's group.
# The simplest structured method and often the best value for effort.
band = pd.cut(mar["age"], [19, 30, 40, 50, 60, 70])
grp = mar.copy()
grp["income"] = grp["income"].fillna(grp.groupby(band, observed=True)["income"].transform("median"))
grp["income"].mean()                                   # 37,600 -- close to 38,000
#
# Within an age band the missingness is random (MAR), so the band
# median is an unbiased guess for the band's missing rows. Variance
# is still understated -- within each band the fill is a point -- but
# the MEAN is now right, which mean imputation could not manage.
#
# THE ASSUMPTION: the grouping variable is the predictor of
# missingness. If it is not, this is mean imputation with extra steps.

# KNN: fill with the average of the k most similar rows on the OTHER
# columns. "Similar" is Euclidean distance, so SCALE FIRST.
X = mar[["age", "income"]].copy()
X["age"] = (X["age"] - X["age"].mean()) / X["age"].std()     # scale age
knn = KNNImputer(n_neighbors=10)
X_knn = pd.DataFrame(knn.fit_transform(X), columns=X.columns)
X_knn["income"].mean()                                 # 37,500
#
# ASSUMES: rows that are close on the observed columns have close
# values on the missing one. True for smooth relationships; wrong
# for a column unrelated to the others (then the neighbours are
# random and the fill is noise).
# COST: O(n^2) distance computations. Fine at 50k rows; slow at 5M.
# SCALING: without it, the column with the largest range decides
# who is a neighbour. income (thousands) would swamp age (tens).

# ITERATIVE (MICE-style): model each column with missing values as a
# regression on the others; fill; repeat until stable.
it = IterativeImputer(max_iter=10, random_state=0)
X_it = pd.DataFrame(it.fit_transform(mar[["age", "income"]]), columns=["age", "income"])
X_it["income"].mean()                                  # 37,900
#
# ROUND 1: fill income with its mean; fit income ~ age; predict the
#          missing incomes.
# ROUND 2: with the new incomes, fit again; predict again. Repeat.
# The default estimator is BayesianRidge (linear). estimator= takes
# any regressor -- a tree model for non-linear structure.
#
# ASSUMES: the missing values follow the same relationship with the
# other columns as the observed ones do. That IS the MAR assumption,
# and this is the method that uses it most fully.
# COST: max_iter fits per column with gaps. Slower than group-
# conditional, faster than KNN at scale.

# THE VARIANCE PROBLEM, STILL: all three fill with a CONDITIONAL MEAN.
# The imputed values sit on the regression line with no scatter, so
# the imputed rows are too well-behaved. Correlations with the fill
# are overstated; residual variance is understated.
for label, d in [("group", grp), ("knn", X_knn), ("iterative", X_it)]:
    imputed_rows = mar["income"].isna()
    resid = d.loc[imputed_rows, "income"] - np.polyval(
        np.polyfit(d["age"], d["income"], 1), d.loc[imputed_rows, "age"])
    print(f"{label:10} residual std of imputed rows: {resid.std():7.0f}  (observed rows: 8,000)")
# group      residual std of imputed rows:   2,300
# knn        residual std of imputed rows:   3,100
# iterative  residual std of imputed rows:      90
#
# The iterative imputer puts every filled value EXACTLY on its
# regression line. The observed rows scatter 8,000 around it. A model
# trained on this data learns that 35% of customers are perfectly
# predictable from their age -- which is false, and which the
# sample_posterior option exists to fix (section 4).

# WHERE THE FILL COMES FROM MATTERS FOR LEAKAGE. Every one of these
# imputers has a fit step -- the mean, the neighbours, the regression
# -- and that step must see TRAINING DATA ONLY:
from sklearn.model_selection import train_test_split
train, test = train_test_split(mar, test_size=0.3, random_state=0)

imp = SimpleImputer(strategy="median")
imp.fit(train[["income"]])                             # learns the TRAIN median
train_f = imp.transform(train[["income"]])
test_f = imp.transform(test[["income"]])               # applies it to test
#
# Fitting on the full frame leaks the test rows' values into the
# training fill. On a group-conditional or iterative imputer, it
# leaks the test rows' RELATIONSHIPS. Fit on train; transform both.
# The Pipeline in 8.5 enforces this by construction.
`,
      hl: [9, 22, 38, 65],
      caption: "**The iterative imputer puts every filled value exactly on its regression line** — residual spread of 90 against the observed rows' 8,000. A model trained on that learns that a third of customers are perfectly predictable from their age."
    },

    { t: "h2", n: "03", text: "The indicator, and keeping the gap visible", id: "indicator" },

    { t: "code", lang: "python", title: "fill and flag, and when the flag is the feature", code: `
from sklearn.impute import MissingIndicator

# THE PATTERN: indicator first, then fill.
def fill_and_flag(df, cols, strategy="median", group=None):
    out = df.copy()
    for c in cols:
        out[f"{c}_missing"] = out[c].isna().astype(int)
        if group is not None:
            fill = out.groupby(group, observed=True)[c].transform(strategy)
            out[c] = out[c].fillna(fill)
        out[c] = out[c].fillna(getattr(out[c], strategy)())    # global fallback
    return out

flagged = fill_and_flag(mar, ["income"], group=band)
flagged[["income", "income_missing"]].head()

# WHY THE ORDER MATTERS: the indicator must be computed BEFORE the
# fill, or it is all zeros.

# WHAT THE INDICATOR BUYS, by mechanism:
#   MCAR  -- nothing. It is uncorrelated with everything. A model
#            will give it a near-zero coefficient. Harmless.
#   MAR   -- it encodes the predictor of missingness (older -> missing),
#            which the model could have got from age directly. Mildly
#            useful; lets the model treat imputed values with less
#            weight.
#   MNAR  -- it is the SIGNAL. "Declined to state income" predicts
#            the target in ways the imputed value cannot, because the
#            imputed value is a guess and the decline is a fact.

# sklearn's version, for a Pipeline:
mi = MissingIndicator(features="missing-only")           # only cols with NaN
flags = mi.fit_transform(mar[["age", "income"]])         # (n, 1): income only
mi.features_                                             # [1] -- column index

# THE COMBINED TRANSFORMER pattern used inside a ColumnTransformer:
from sklearn.pipeline import make_union
imputer_with_flags = make_union(
    SimpleImputer(strategy="median"),
    MissingIndicator(features="missing-only"),
)
Xf = imputer_with_flags.fit_transform(mar[["age", "income"]])
Xf.shape                                                 # (n, 3): age, income, income_missing
#
# SimpleImputer(add_indicator=True) does the same in one object.

# CATEGORICALS: "missing" AS ITS OWN CATEGORY is the indicator built in.
cat_obs.fillna("__missing__").value_counts()
#
# A model with one-hot encoding gets a column for it automatically.
# For tree models it is often the best choice: no value invented, and
# the tree can split on "was it missing" directly. And it is honest:
# the row IS in the "did not say" group.

# TREE MODELS AND NATIVE MISSING SUPPORT:
# LightGBM, XGBoost, CatBoost and sklearn's HistGradientBoosting all
# accept NaN directly. At each split they learn which branch the
# missing rows should go to -- which is a learned, per-split
# indicator. For those models, NOT imputing is a legitimate choice,
# and often the best one:
from sklearn.ensemble import HistGradientBoostingRegressor
HistGradientBoostingRegressor().fit(mar[["age", "income"]].fillna({"income": np.nan}),
                                    mar["age"])          # runs; NaN handled
#
# Linear models, KNN, SVMs and neural networks do not accept NaN.
# For those, impute -- and flag.

# THE INDICATOR'S PREDICTIVE POWER is the diagnostic for MNAR (6.5):
# fit the target on features + indicator; if the indicator's
# coefficient is large, missingness carried information the value
# would not have. That result is the argument for keeping the flag
# in production.
`,
      hl: [4, 18, 41, 53],
      caption: "**For tree models, not imputing is a legitimate choice.** Gradient boosting learns at each split which branch the missing rows should take — a learned, per-split indicator — and inventing a value removes that."
    },

    { t: "h2", n: "04", text: "Multiple imputation: carrying the uncertainty through", id: "multiple" },

    { t: "p", text: "**Single imputation treats each guess as a fact. Multiple imputation makes several guesses, runs the analysis on each, and combines the results** — so the spread between the guesses becomes part of the reported uncertainty. It is the method that gives honest standard errors, and it is the standard in any field where the confidence interval is the deliverable." },

    { t: "code", lang: "python", title: "MICE: m imputations, m analyses, one pooled answer", code: `
# ONE IMPUTATION WITH sample_posterior DRAWS from the predictive
# distribution rather than taking its mean -- so the filled values
# have realistic scatter, and DIFFERENT random_states give DIFFERENT
# fills:
def impute_once(df, seed):
    imp = IterativeImputer(sample_posterior=True, random_state=seed, max_iter=10)
    return pd.DataFrame(imp.fit_transform(df), columns=df.columns)

imps = [impute_once(mar[["age", "income"]], seed=s) for s in range(5)]

# THE FIVE FILLS DISAGREE, as they should:
gaps = mar["income"].isna()
pd.DataFrame({f"imp_{i}": d.loc[gaps, "income"].head(3).round(0) for i, d in enumerate(imps)})
#      imp_0    imp_1    imp_2    imp_3    imp_4
# 5  61,200   48,900   55,300   58,700   50,100
# 9  39,400   44,800   37,200   41,600   46,300
# ...
#
# Each is a plausible value given age, with the residual scatter the
# observed rows have. Compare the single-imputation version, which
# gave every gap its exact regression prediction.

# RUN THE ANALYSIS ON EACH:
def analysis(d):
    """The quantity of interest and its within-imputation variance."""
    slope, intercept = np.polyfit(d["age"], d["income"], 1)
    resid = d["income"] - (slope * d["age"] + intercept)
    se = resid.std() / (d["age"].std() * np.sqrt(len(d)))
    return slope, se ** 2

results = [analysis(d) for d in imps]

# POOL WITH RUBIN'S RULES:
def rubin(results):
    m = len(results)
    estimates = np.array([r[0] for r in results])
    within = np.array([r[1] for r in results])
    q_bar = estimates.mean()                        # the pooled estimate
    u_bar = within.mean()                           # average within-imputation variance
    b = estimates.var(ddof=1)                       # between-imputation variance
    total = u_bar + (1 + 1 / m) * b                 # total variance
    fmi = (1 + 1 / m) * b / total                   # fraction of missing information
    return {"estimate": q_bar, "se": np.sqrt(total),
            "within_var": u_bar, "between_var": b, "fmi": fmi}

rubin(results)
# {'estimate': 899.7, 'se': 6.1, 'within_var': 31.2, 'between_var': 5.8, 'fmi': 0.19}
#
# READING IT:
#   estimate     the slope, averaged across imputations: ~900. Right.
#   within_var   the uncertainty each single analysis reported
#   between_var  how much the imputations DISAGREE -- the uncertainty
#                that single imputation throws away
#   se           sqrt of the total. LARGER than any single imputation's
#                se, because it includes the between term.
#   fmi          19% of the information about the slope is missing.
#                A summary of how much the conclusion depends on the
#                imputation model.

# COMPARE SINGLE IMPUTATION'S CLAIM:
single = IterativeImputer(random_state=0).fit_transform(mar[["age", "income"]])
analysis(pd.DataFrame(single, columns=["age", "income"]))
# (899.9, 27.0)   -> se 5.2
#
# se 5.2 against the honest 6.1. Single imputation is 15% over-
# confident here; with more missingness, or a weaker relationship,
# the gap grows. The between-imputation variance is real uncertainty
# about the missing values, and only multiple imputation carries it.

# HOW MANY IMPUTATIONS: 5 was the historical default. 20-50 is now
# common, and the rule of thumb is m >= 100 x fmi. Here fmi = 0.19,
# so m = 20 would be comfortable.

# WHEN TO BOTHER:
#   The deliverable is an ESTIMATE WITH AN INTERVAL -- an effect size,
#   a coefficient, a p-value. Then single imputation understates the
#   interval and multiple imputation is the standard.
#
#   The deliverable is a PREDICTION -- a model that scores rows. Then
#   the interval on the coefficients is rarely reported, and single
#   imputation with an indicator, or native NaN handling in a tree
#   model, is the practical choice. Multiple imputation still helps
#   (train m models, average predictions) but the gain is smaller
#   and the cost is m-fold.

# A PACKAGE THAT DOES ALL OF THIS: statsmodels.imputation.mice
# from statsmodels.imputation import mice
# data = mice.MICEData(mar)
# fit = mice.MICE("income ~ age", sm.OLS, data).fit(n_imputations=20)
# fit.summary()      -- pooled coefficients and Rubin's-rules SEs
`,
      hl: [5, 27, 36, 62],
      caption: "**Single imputation reports an SE of 5.2; multiple imputation reports 6.1.** The difference is the between-imputation variance — real uncertainty about the missing values that a single fill throws away."
    },

    { t: "table",
      head: ["Method", "Preserves", "Destroys", "Assumes", "Use when"],
      rows: [
        ["Mean / median", "The mean (under MCAR)", "Variance, correlation, SE", "MCAR; the column is weak", "< 5% missing, near-MCAR, a model that needs complete input"],
        ["Mode / \"missing\" category", "Row count", "The mode's association (mode); nothing (own category)", "—", "Categoricals; \"missing\" as its own level is usually better"],
        ["Group-conditional", "The mean within groups", "Within-group variance", "The group is the predictor of missingness", "MAR with an obvious grouping; cheap and effective"],
        ["KNN", "Local structure", "Some variance; scale-dependent", "Rows near on observed columns are near on the missing one", "Smooth relationships, < 100k rows, scaled features"],
        ["Iterative (single)", "Conditional means exactly", "**All residual variance** in the fills", "MAR; linear (default) or as the estimator allows", "Prediction tasks; combine with an indicator"],
        ["Iterative with `sample_posterior`", "Conditional distribution", "Little", "MAR", "One draw of multiple imputation"],
        ["Multiple imputation", "**Uncertainty**", "Nothing; costs m-fold compute", "MAR", "Estimates with intervals — the standard when the CI is the deliverable"],
        ["Native NaN (tree models)", "The missingness signal", "Nothing", "The model learns the split", "LightGBM / XGBoost / HistGB; often the best choice"],
        ["Indicator + any fill", "The fact of missingness", "Adds a column", "—", "**Always**, unless the mechanism is confidently MCAR"]
      ],
      caption: "**The indicator is the one row that says \"always\".** Every fill invents a value; the indicator is the only thing that records that it was invented."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "An imputation harness that reports what it cost",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Build a harness that takes a frame with a known-complete ground truth, punches holes in it under a chosen mechanism, applies several imputation strategies, and reports — for each — the error on the imputed values, the damage to variance and correlation, and the effect on a downstream model's coefficient and its standard error." },
        { t: "p", text: "Use it to show that the ranking of methods changes with the mechanism, and that the indicator matters under MNAR and not under MCAR." }
      ],
      requirements: [
        "Mechanisms: MCAR, MAR (driven by an observed column), MNAR (driven by the value).",
        "Methods: complete-case, mean, group-conditional, iterative, iterative + indicator, multiple imputation.",
        "Metrics per method: RMSE on imputed cells, variance ratio, correlation ratio, downstream slope and SE.",
        "All imputers fit on a training split only.",
        "A table comparing methods across mechanisms.",
        "Tests: mean imputation shrinks variance; MI's SE exceeds single imputation's; indicator helps under MNAR only."
      ],
      hint: "The downstream model is `y ~ x` where `x` has the holes. The truth is known, so the slope's bias is measurable — and its SE tells you which method is honest about not knowing.",
      solution: {
        lang: "python",
        title: "imputation_harness.py",
        code: `import pandas as pd
import numpy as np
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import SimpleImputer, IterativeImputer
from sklearn.model_selection import train_test_split


# =========================================================================
# GROUND TRUTH AND HOLES
# =========================================================================

def make_truth(n=6000, seed=0):
    rng = np.random.default_rng(seed)
    z = rng.normal(0, 1, n)                     # an always-observed covariate
    x = 50 + 8 * z + rng.normal(0, 6, n)        # x depends on z
    y = 3 * x + rng.normal(0, 15, n)            # y depends on x
    return pd.DataFrame({"z": z, "x": x, "y": y})


def punch(df, mechanism, rate=0.35, seed=1):
    rng = np.random.default_rng(seed)
    d = df.copy()
    n = len(d)
    if mechanism == "MCAR":
        p = np.full(n, rate)
    elif mechanism == "MAR":                    # driven by z (observed)
        s = 1 / (1 + np.exp(-1.5 * d["z"]))
        p = rate * s / s.mean()
    elif mechanism == "MNAR":                   # driven by x itself
        s = 1 / (1 + np.exp(-(d["x"] - 55) / 5))
        p = rate * s / s.mean()
    d.loc[rng.random(n) < np.clip(p, 0, 0.95), "x"] = np.nan
    return d


# =========================================================================
# METHODS -- each fits on train, transforms both
# =========================================================================

def m_complete_case(tr, te):
    return tr.dropna(), te.dropna(), None

def m_mean(tr, te):
    imp = SimpleImputer(strategy="mean").fit(tr[["x"]])
    tr, te = tr.copy(), te.copy()
    tr["x"] = imp.transform(tr[["x"]]).ravel()
    te["x"] = imp.transform(te[["x"]]).ravel()
    return tr, te, None

def m_group(tr, te, bins=8):
    edges = np.quantile(tr["z"], np.linspace(0, 1, bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    tr, te = tr.copy(), te.copy()
    tr_band = pd.cut(tr["z"], edges); te_band = pd.cut(te["z"], edges)
    fills = tr.groupby(tr_band, observed=True)["x"].median()
    tr["x"] = tr["x"].fillna(tr_band.map(fills).astype(float))
    te["x"] = te["x"].fillna(te_band.map(fills).astype(float))
    return tr, te, None

def m_iterative(tr, te, indicator=False, seed=0):
    imp = IterativeImputer(random_state=seed, max_iter=10).fit(tr[["z", "x"]])
    tr, te = tr.copy(), te.copy()
    if indicator:
        tr["x_missing"] = tr["x"].isna().astype(int)
        te["x_missing"] = te["x"].isna().astype(int)
    tr["x"] = imp.transform(tr[["z", "x"]])[:, 1]
    te["x"] = imp.transform(te[["z", "x"]])[:, 1]
    return tr, te, ("x_missing" if indicator else None)

def m_multiple(tr, te, m=10):
    """Returns a LIST of (tr, te) completed datasets."""
    out = []
    for s in range(m):
        imp = IterativeImputer(sample_posterior=True, random_state=s, max_iter=10
                               ).fit(tr[["z", "x"]])
        a, b = tr.copy(), te.copy()
        a["x"] = imp.transform(a[["z", "x"]])[:, 1]
        b["x"] = imp.transform(b[["z", "x"]])[:, 1]
        out.append((a, b))
    return out


# =========================================================================
# METRICS
# =========================================================================

def slope_and_se(d, extra=None):
    """OLS of y on x (+ indicator). Returns (slope on x, its SE)."""
    cols = ["x"] + ([extra] if extra else [])
    X = np.column_stack([np.ones(len(d))] + [d[c].to_numpy() for c in cols])
    beta, *_ = np.linalg.lstsq(X, d["y"], rcond=None)
    resid = d["y"] - X @ beta
    sigma2 = (resid ** 2).sum() / (len(d) - X.shape[1])
    cov = sigma2 * np.linalg.pinv(X.T @ X)
    return float(beta[1]), float(np.sqrt(cov[1, 1]))


def evaluate(truth, holed, method, **kw):
    tr_h, te_h = train_test_split(holed, test_size=0.3, random_state=0)
    tr_t = truth.loc[tr_h.index]; te_t = truth.loc[te_h.index]

    if method == "multiple":
        completed = m_multiple(tr_h, te_h, **kw)
        slopes, ses, rmses = [], [], []
        for a, b in completed:
            s, se = slope_and_se(a); slopes.append(s); ses.append(se ** 2)
            gaps = tr_h["x"].isna()
            rmses.append(np.sqrt(((a.loc[gaps, "x"] - tr_t.loc[gaps, "x"]) ** 2).mean()))
        mm = len(completed)
        q = np.mean(slopes); u = np.mean(ses); b_var = np.var(slopes, ddof=1)
        se_total = np.sqrt(u + (1 + 1 / mm) * b_var)
        a0 = completed[0][0]
        return {"rmse": np.mean(rmses),
                "var_ratio": a0["x"].var() / tr_t["x"].var(),
                "corr_ratio": a0["x"].corr(a0["y"]) / tr_t["x"].corr(tr_t["y"]),
                "slope": q, "se": se_total, "n": len(a0)}

    fn = {"complete": m_complete_case, "mean": m_mean, "group": m_group,
          "iterative": lambda a, b: m_iterative(a, b, indicator=False),
          "iterative+ind": lambda a, b: m_iterative(a, b, indicator=True)}[method]
    tr_f, te_f, extra = fn(tr_h, te_h)
    slope, se = slope_and_se(tr_f, extra)
    gaps = tr_h["x"].isna()
    if method == "complete":
        rmse = np.nan
    else:
        rmse = np.sqrt(((tr_f.loc[gaps, "x"] - tr_t.loc[gaps, "x"]) ** 2).mean())
    return {"rmse": rmse,
            "var_ratio": tr_f["x"].var() / tr_t["x"].var(),
            "corr_ratio": tr_f["x"].corr(tr_f["y"]) / tr_t["x"].corr(tr_t["y"]),
            "slope": slope, "se": se, "n": len(tr_f)}


def compare(truth, mechanisms=("MCAR", "MAR", "MNAR"),
            methods=("complete", "mean", "group", "iterative", "iterative+ind", "multiple")):
    rows = []
    for mech in mechanisms:
        holed = punch(truth, mech)
        for meth in methods:
            r = evaluate(truth, holed, meth)
            rows.append({"mechanism": mech, "method": meth, **r})
    out = pd.DataFrame(rows)
    out["slope_bias"] = out["slope"] - 3.0
    return out.round(3)


# =========================================================================
# THE TABLE
# =========================================================================
#
# compare(make_truth())
#
# mechanism  method         rmse  var_ratio  corr_ratio  slope   se    slope_bias
# MCAR       complete        nan      1.00        1.00    3.00  0.03      0.00
# MCAR       mean           9.9       0.65        0.81    3.00  0.04      0.00
# MCAR       group          7.1       0.83        0.93    2.99  0.03     -0.01
# MCAR       iterative      6.0       0.86        0.95    3.01  0.03      0.01
# MCAR       iterative+ind  6.0       0.86        0.95    3.01  0.03      0.01
# MCAR       multiple       8.5       0.99        0.99    3.00  0.04      0.00
#
# MAR        complete        nan      0.93        0.99    3.00  0.04      0.00
# MAR        mean          11.2       0.60        0.74    2.61  0.05     -0.39   <-
# MAR        group          7.0       0.84        0.94    2.97  0.03     -0.03
# MAR        iterative      6.0       0.87        0.96    3.00  0.03      0.00
# MAR        iterative+ind  6.0       0.87        0.96    3.00  0.03      0.00
# MAR        multiple       8.5       0.99        0.99    3.00  0.04      0.00
#
# MNAR       complete        nan      0.71        0.97    2.94  0.05     -0.06
# MNAR       mean          13.8       0.48        0.66    2.31  0.06     -0.69   <-
# MNAR       group          9.4       0.72        0.90    2.80  0.04     -0.20
# MNAR       iterative      8.1       0.76        0.93    2.88  0.04     -0.12
# MNAR       iterative+ind  8.1       0.76        0.93    2.97  0.04     -0.03   <-
# MNAR       multiple      10.9       0.94        0.97    2.87  0.05     -0.13
#
# READING IT:
#   MCAR: everything is unbiased; mean imputation just destroys variance.
#   MAR:  mean imputation is now BIASED (slope 2.61). Anything that
#         conditions on z fixes it. Complete-case is fine here because
#         the regression conditions on... x, and z drives missingness
#         through x -- close enough to MAR-given-x.
#   MNAR: everything is biased. The INDICATOR is what recovers the
#         slope (2.88 -> 2.97): it lets the model treat the imputed
#         rows differently, absorbing the fact that they are the
#         high-x rows.
#   MULTIPLE: var_ratio ~0.99 everywhere -- it is the only method that
#         restores the spread -- and its SE is the largest, because it
#         is the only one carrying the between-imputation uncertainty.


# =========================================================================
# TESTS
# =========================================================================

def test_mean_imputation_shrinks_variance():
    t = make_truth(); h = punch(t, "MCAR")
    r = evaluate(t, h, "mean")
    assert r["var_ratio"] < 0.75
    assert r["corr_ratio"] < 0.9


def test_mean_imputation_biased_under_mar_not_mcar():
    t = make_truth()
    mcar = evaluate(t, punch(t, "MCAR"), "mean")
    mar = evaluate(t, punch(t, "MAR"), "mean")
    assert abs(mcar["slope"] - 3.0) < 0.05
    assert abs(mar["slope"] - 3.0) > 0.2


def test_group_conditional_fixes_mar():
    t = make_truth()
    r = evaluate(t, punch(t, "MAR"), "group")
    assert abs(r["slope"] - 3.0) < 0.08


def test_multiple_imputation_se_exceeds_single():
    t = make_truth(); h = punch(t, "MAR")
    single = evaluate(t, h, "iterative")
    multi = evaluate(t, h, "multiple")
    assert multi["se"] > single["se"]


def test_multiple_imputation_restores_variance():
    t = make_truth(); h = punch(t, "MCAR")
    r = evaluate(t, h, "multiple")
    assert r["var_ratio"] > 0.95


def test_indicator_helps_under_mnar_only():
    t = make_truth()
    for mech, should_help in [("MCAR", False), ("MNAR", True)]:
        h = punch(t, mech)
        without = abs(evaluate(t, h, "iterative")["slope"] - 3.0)
        with_ = abs(evaluate(t, h, "iterative+ind")["slope"] - 3.0)
        if should_help:
            assert with_ < without - 0.05, (mech, without, with_)
        else:
            assert abs(with_ - without) < 0.03, (mech, without, with_)


def test_single_iterative_fills_have_no_scatter():
    t = make_truth(); h = punch(t, "MCAR")
    tr, te = train_test_split(h, test_size=0.3, random_state=0)
    tr_f, _, _ = m_iterative(tr, te)
    gaps = tr["x"].isna()
    resid = tr_f.loc[gaps, "x"] - np.polyval(np.polyfit(tr_f["z"], tr_f["x"], 1), tr_f.loc[gaps, "z"])
    obs_resid = tr_f.loc[~gaps, "x"] - np.polyval(np.polyfit(tr_f["z"], tr_f["x"], 1), tr_f.loc[~gaps, "z"])
    assert resid.std() < 0.1 * obs_resid.std()


def test_imputer_fit_on_train_only():
    """The test fold's values must not influence the fill."""
    t = make_truth(); h = punch(t, "MCAR")
    tr, te = train_test_split(h, test_size=0.3, random_state=0)
    te_shifted = te.copy(); te_shifted["x"] = te_shifted["x"] + 1000
    a, _, _ = m_mean(tr, te)
    b, _, _ = m_mean(tr, te_shifted)
    pd.testing.assert_frame_equal(a, b)          # train fill unchanged


def test_ranking_changes_with_mechanism():
    tab = compare(make_truth(), methods=("mean", "group", "iterative+ind"))
    best = tab.loc[tab.groupby("mechanism")["slope_bias"].apply(lambda s: s.abs().idxmin())]
    assert best.set_index("mechanism").loc["MNAR", "method"] == "iterative+ind"`,
        notes: [
          { t: "p", text: "**The table is the finding: the ranking of methods changes with the mechanism.** Under MCAR everything is unbiased and mean imputation merely wastes variance. Under MAR mean imputation is biased by 13% and anything conditioning on the covariate fixes it. Under MNAR everything is biased, and the indicator is what recovers most of it." },
          { t: "callout", kind: "insight", title: "Multiple imputation is the only row that restores the spread", body: [
            { t: "p", text: "`var_ratio` is ~0.99 for multiple imputation and 0.86 or worse for every single-fill method. **It is also the only method whose SE includes the between-imputation term** — the disagreement among plausible fills — which is why its SE is the largest and the most honest." },
            { t: "p", text: "The single iterative fill puts every value on the regression line with residual spread under a tenth of the observed rows'; a model trained on that learns a relationship cleaner than the world has." }
          ]},
          { t: "p", text: "**The indicator helps under MNAR and does nothing under MCAR** — and the test asserts both directions. Under MCAR it is noise with a near-zero coefficient; under MNAR it lets the model treat the imputed rows as the high-x rows they are, recovering the slope from 2.88 to 2.97." },
          { t: "p", text: "**Every imputer is fit on the training split only**, and the test proves it by shifting the test fold's values by a thousand and asserting the training fill is unchanged. Fitting on the full frame leaks test values into the fill — and for a structured imputer, test relationships." },
          { t: "p", text: "**RMSE on the imputed cells is the wrong metric to optimise.** The single iterative fill has the lowest RMSE — it is the conditional mean, which minimises squared error — and the worst variance ratio. The best guess for each cell and the best filled column for the analysis are different things." },
          { t: "p", text: "**Complete-case analysis is unbiased under MAR here** because the regression conditions on `x`, and `z` drives missingness through `x`. That is the general result — a model that includes the predictors of missingness is approximately unbiased under MAR — and it is why dropping rows is not always wrong, only usually wasteful." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "After mean imputation, a column's standard error of the mean fell from 0.170 to 0.119. What does that mean?",
          options: [
            "The imputation improved precision",
            "The column now claims 30% more precision than the data has — the extra rows are invented, and every interval built on them is too narrow",
            "The mean changed",
            "Nothing; SE is unaffected by imputation"
          ],
          answer: 1,
          why: "SE scales with 1/√n, and n rose from 3,500 to 5,000 — but 1,500 of those values are copies of one number. The data did not become more informative; every downstream calculation just thinks it did. Multiple imputation is the method that carries the real uncertainty through."
        }
      ]
    }
  ],

  takeaways: [
    "**Every imputation invents data, and the model treats invented values as observed.** The question is what each method destroys.",
    "**Mean imputation preserves the mean and destroys the variance**: a spike at one point, attenuated correlations, standard errors too small.",
    "**Under MAR the observed mean is the wrong group's mean**, and filling with it bakes the bias in and hides it.",
    "**An imputed column has stopped announcing its problem.** The bias is the same size as before; only the visibility changed.",
    "**Group-conditional imputation fixes the mean under MAR** when the group is the predictor of missingness — cheap and effective.",
    "**KNN needs scaled features**, or the column with the largest range decides who is a neighbour.",
    "**A single iterative fill puts every value exactly on the regression line** — no scatter, so a model learns a relationship cleaner than the world has.",
    "**Fit every imputer on the training split only** and transform both; fitting on the full frame leaks test values into the fill.",
    "**Compute the indicator before the fill**, or it is all zeros.",
    "**The indicator does nothing under MCAR and recovers the slope under MNAR** — it is the one thing that records that a value was invented.",
    "**Tree models accept NaN and learn a per-split indicator**; for them, not imputing is often the best choice.",
    "**Multiple imputation is the only method that restores the spread and reports the between-imputation variance** — the standard when the interval is the deliverable.",
    "**The best guess per cell and the best filled column for the analysis are different things** — the lowest-RMSE fill has the worst variance ratio."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does mean imputation attenuate the correlation between the imputed column and everything else?",
        options: [
          "It changes the column's mean",
          "The imputed rows all sit at one x value regardless of their y, so they cannot follow any trend and pull every relationship flatter",
          "It introduces NaN",
          "It only affects categorical columns"
        ],
        answer: 1,
        why: "A third of the points form a vertical stripe at the mean. They have real y values and a made-up x, so they contribute nothing to the covariance and everything to the denominator. The correlation drops — here from 0.93 to 0.78 — and every model inherits the flattened slope."
      },
      {
        stem: "What is the difference between a single iterative imputation and one draw of multiple imputation?",
        options: [
          "Nothing",
          "The single fill uses the conditional mean — every value exactly on the regression line; the MI draw samples from the conditional distribution, so the fills have realistic scatter and different seeds give different values",
          "MI uses a different model",
          "MI is faster"
        ],
        answer: 1,
        why: "`sample_posterior=True` is the switch. Without it, imputed rows are too well-behaved — residual spread a hundredth of the observed rows' — and the model learns a relationship cleaner than reality. With it, repeated draws disagree, and that disagreement is the between-imputation variance Rubin's rules add to the SE."
      },
      {
        stem: "An imputer is fit on the full dataset before the train/test split. What is wrong?",
        options: [
          "Nothing, imputers are not models",
          "The test rows' values influenced the fill applied to training rows — a leak; and for a structured imputer, the test rows' relationships leaked too",
          "It is slower",
          "The split must come after every transformation"
        ],
        answer: 1,
        why: "Every imputer has a fit step — a mean, a set of neighbours, a regression — and that step learns from whatever it sees. Fit on train, transform both; a Pipeline enforces it by construction. The test that shifts the test fold by a thousand and asserts the training fill is unchanged is the proof."
      },
      {
        stem: "For a gradient-boosted tree model, what is often the best way to handle a column with missing values?",
        options: [
          "Mean imputation",
          "Leave the NaN in — the model learns at each split which branch missing rows take, which is a learned per-split indicator that imputation would erase",
          "Drop the column",
          "KNN imputation"
        ],
        answer: 1,
        why: "LightGBM, XGBoost, CatBoost and HistGradientBoosting accept NaN natively. Inventing a value removes information the model could have used. For linear models, KNN and neural networks, which cannot take NaN, impute — and add the indicator."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is wrong with filling missing values with the mean?",
        strong: "It preserves the mean and destroys everything else. A third of the column becomes a spike at one point, so the variance shrinks, every correlation attenuates, and every standard error is too small — the data claims more precision than it has. Under MAR the mean itself is the wrong group's mean, so the bias is baked in and, now that there are no gaps, invisible. It is acceptable for a weak feature with a few percent missing, and it is a decision to record.",
        answer: [
          { t: "p", text: "\"Preserves the mean and destroys everything else\" is the compressed form; the standard-error point is what most people miss." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use multiple imputation rather than a single fill?",
        strong: "When the deliverable is an estimate with an interval — a coefficient, an effect size, a p-value. Single imputation treats each guess as a fact, so the interval is too narrow; multiple imputation makes m draws, runs the analysis on each, and pools with Rubin's rules so the disagreement between draws becomes part of the reported SE. For a prediction model where nobody reports the coefficient intervals, a single fill with an indicator — or native NaN handling in a tree — is the practical choice.",
        answer: [
          { t: "p", text: "Splitting by deliverable — interval versus prediction — is the judgement; naming Rubin's rules shows you know how the pooling works." }
        ]
      },
      {
        level: "advanced",
        q: "How would you compare imputation methods on a real dataset?",
        strong: "With a harness: take a complete subset as ground truth, punch holes under each mechanism, apply each method fit on train only, and measure four things — RMSE on the imputed cells, the variance ratio, the correlation ratio, and the downstream model's coefficient and SE. The ranking changes with the mechanism, and the lowest-RMSE method is usually the one with the worst variance ratio, because the best guess per cell and the best filled column for the analysis are different objectives.",
        answer: [
          { t: "p", text: "The point that RMSE is the wrong thing to optimise is the insight that separates this from a benchmark-and-pick answer." }
        ]
      }
    ]
  }
});
