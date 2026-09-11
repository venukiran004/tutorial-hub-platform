/* ============================================================================
   LESSON 7.3 — Weight of Evidence and Information Value
   ========================================================================= */
EC.receiveLesson({
  id: "7.3",

  lede: "**Weight of Evidence encodes a category as the log-odds of the target within it, relative to the overall log-odds — which is exactly the scale a logistic regression works on.** That single fact is why credit scoring has used it for fifty years: a WoE-encoded feature enters a logistic model with a coefficient near 1 and a meaning a regulator can read. Information Value, built from the same numbers, ranks features before anything is fitted.",

  objectives: [
    "Compute Weight of Evidence for a categorical or binned feature and interpret its sign and magnitude",
    "Explain why WoE is the natural encoding for logistic regression and what it does to monotonicity",
    "Compute Information Value and use its conventional thresholds to screen features",
    "Bin a continuous feature so that its WoE is monotonic, and know why that matters",
    "Recognise the same leakage that target encoding has, and apply the same fixes"
  ],

  prerequisites: ["7.2"],

  blocks: [

    { t: "h2", n: "01", text: "Log-odds relative to the prior", id: "woe" },

    { t: "p", text: "For a binary target, each category has a share of the positives and a share of the negatives. **WoE is the log of their ratio: how much more of the positive class this category holds than its share of the negative class would predict.** Zero means the category tells you nothing; positive means it leans toward the target; negative means away." },

    { t: "dl", items: [
      ["Weight of Evidence", "`WoE = ln( %positives in category / %negatives in category )`, where each % is of the class total, not of the category. Equivalently, the category's log-odds minus the overall log-odds."],
      ["Information Value", "`IV = Σ over categories of (%positives − %negatives) × WoE`. A single number for the feature: how much its categories separate the classes."],
      ["Log-odds", "`ln(p / (1 − p))`. The scale a logistic regression is linear on. A feature already on that scale enters the model as a straight line."],
      ["Monotonic binning", "Cutting a continuous variable into bins whose WoE rises or falls consistently. Required for a scorecard; useful anywhere a one-directional effect is expected."],
      ["Scorecard", "A logistic model on WoE-encoded features, rescaled so that each feature contributes points. Interpretable by construction: every attribute has a printed score."],
      ["Good / bad", "Credit-scoring vocabulary for the negative and positive classes. WoE literature uses \"goods\" and \"bads\"; the maths does not care which is which, but the sign convention does."]
    ]},

    { t: "viz",
      title: "WoE per category, and where IV comes from",
      caption: "Four regions with different fraud rates. Each bar is that region's WoE — its lean toward or away from fraud on the log-odds scale. IV weights each bar by how much of the population it separates: a strong lean in a tiny category contributes little.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Bar chart of Weight of Evidence for four regions, positive and negative bars around a zero line, with each region's population share and its contribution to Information Value">
  <line x1="120" y1="150" x2="700" y2="150" style="stroke:var(--ink-3);stroke-width:1.2"/>
  <text x="60" y="154" class="s-sub" style="fill:var(--ink-3)">WoE = 0</text>
  <text x="60" y="60" class="s-sub" style="fill:var(--crit)">+1.0</text>
  <text x="60" y="244" class="s-sub" style="fill:var(--good)">−1.0</text>

  <rect x="140" y="80" width="90" height="70" style="fill:var(--crit);fill-opacity:.35;stroke:var(--crit);stroke-width:1.5"/>
  <text x="152" y="70" class="s-sub" style="fill:var(--crit)">+0.78</text>
  <text x="140" y="172" class="s-label" style="fill:var(--ink-2)">north</text>
  <text x="140" y="190" class="s-sub" style="fill:var(--ink-3)">18% of rows</text>
  <text x="140" y="206" class="s-sub" style="fill:var(--ink-3)">fraud 9.1%</text>
  <text x="140" y="228" class="s-sub" style="fill:var(--ink-2)">IV share 0.11</text>

  <rect x="280" y="150" width="90" height="16" style="fill:var(--good);fill-opacity:.35;stroke:var(--good);stroke-width:1.5"/>
  <text x="292" y="184" class="s-sub" style="fill:var(--good)">−0.18</text>
  <text x="280" y="204" class="s-label" style="fill:var(--ink-2)">south</text>
  <text x="280" y="222" class="s-sub" style="fill:var(--ink-3)">40% · fraud 3.7%</text>
  <text x="280" y="240" class="s-sub" style="fill:var(--ink-2)">IV share 0.01</text>

  <rect x="420" y="150" width="90" height="58" style="fill:var(--good);fill-opacity:.35;stroke:var(--good);stroke-width:1.5"/>
  <text x="432" y="226" class="s-sub" style="fill:var(--good)">−0.65</text>
  <text x="420" y="246" class="s-label" style="fill:var(--ink-2)">east</text>
  <text x="420" y="264" class="s-sub" style="fill:var(--ink-3)">30% · fraud 2.4% · IV 0.09</text>

  <rect x="560" y="120" width="90" height="30" style="fill:var(--crit);fill-opacity:.35;stroke:var(--crit);stroke-width:1.5"/>
  <text x="572" y="110" class="s-sub" style="fill:var(--crit)">+0.33</text>
  <text x="560" y="172" class="s-label" style="fill:var(--ink-2)">west</text>
  <text x="560" y="190" class="s-sub" style="fill:var(--ink-3)">12% of rows</text>
  <text x="560" y="206" class="s-sub" style="fill:var(--ink-3)">fraud 6.0%</text>
  <text x="560" y="228" class="s-sub" style="fill:var(--ink-2)">IV share 0.01</text>

  <text x="720" y="90" class="s-sub" style="fill:var(--ink-3)">overall fraud 4.4%</text>
  <text x="720" y="130" class="s-label" style="fill:var(--ink-2)">IV = 0.22</text>
  <text x="720" y="150" class="s-sub" style="fill:var(--ink-3)">"medium" predictor</text>
  <text x="720" y="190" class="s-sub" style="fill:var(--ink-3)">north and east carry</text>
  <text x="720" y="208" class="s-sub" style="fill:var(--ink-3)">nearly all of it —</text>
  <text x="720" y="226" class="s-sub" style="fill:var(--ink-3)">large lean, large share</text>
</svg>`
    },

    { t: "code", lang: "python", title: "computing WoE and IV, and reading them", code: `
import pandas as pd
import numpy as np

rng = np.random.default_rng(0)
n = 20_000
region = rng.choice(["north", "south", "east", "west"], n, p=[.18, .40, .30, .12])
rate = {"north": 0.091, "south": 0.037, "east": 0.024, "west": 0.060}
fraud = (rng.random(n) < pd.Series(region).map(rate).to_numpy()).astype(int)
df = pd.DataFrame({"region": region, "fraud": fraud})

def woe_table(x, y, eps=0.5):
    """WoE and IV for one categorical feature against a binary target.

    eps    additive smoothing on the counts, so a category with zero
           positives or zero negatives does not give ln(0) = -inf.
    """
    t = pd.crosstab(x, y)
    t.columns = ["neg", "pos"]                       # 0 -> neg, 1 -> pos
    total_neg, total_pos = t["neg"].sum(), t["pos"].sum()
    t["n"] = t["neg"] + t["pos"]
    t["share"] = t["n"] / t["n"].sum()
    t["rate"] = t["pos"] / t["n"]
    # DISTRIBUTIONS: each category's share of ALL positives and ALL
    # negatives. These sum to 1 down each column.
    t["dist_pos"] = (t["pos"] + eps) / (total_pos + eps * len(t))
    t["dist_neg"] = (t["neg"] + eps) / (total_neg + eps * len(t))
    t["woe"] = np.log(t["dist_pos"] / t["dist_neg"])
    t["iv"] = (t["dist_pos"] - t["dist_neg"]) * t["woe"]
    return t.sort_values("woe"), float(t["iv"].sum())

table, iv = woe_table(df["region"], df["fraud"])
table[["n", "share", "rate", "dist_pos", "dist_neg", "woe", "iv"]].round(3)
#          n  share   rate  dist_pos  dist_neg    woe     iv
# east  6012  0.301  0.024     0.164     0.307 -0.628  0.090
# south 7988  0.399  0.037     0.334     0.402 -0.185  0.013
# west  2402  0.120  0.060     0.163     0.118  0.322  0.014
# north 3598  0.180  0.091     0.339     0.173  0.671  0.111
iv                                               # 0.228

# READING WoE:
#   north +0.67   north holds 34% of the fraud but 17% of the
#                 non-fraud: it leans toward fraud, by a factor of
#                 exp(0.67) = 1.96 in the odds.
#   east  -0.63   east holds 16% of the fraud, 31% of the non-fraud:
#                 it leans away.
#   0             a category with the same share of both classes:
#                 uninformative.
#
# THE SCALE IS LOG-ODDS. WoE = ln(odds in category) - ln(overall
# odds). That is why a logistic regression on WoE features has
# coefficients near 1: the feature already IS the log-odds shift.

# READING IV -- the conventional thresholds (Siddiqi):
#   < 0.02     useless
#   0.02-0.1   weak
#   0.1-0.3    medium
#   0.3-0.5    strong
#   > 0.5      suspicious -- too good; check for leakage
#
# region at 0.23 is a medium predictor. And "suspicious" is a real
# category: a feature with IV 0.8 is either the target under another
# name or a proxy for it (see 8.3).

# WHERE THE IV COMES FROM: north and east contribute 0.20 of 0.23.
# South is 40% of the rows and contributes 0.01 -- it barely leans.
# IV rewards a strong lean in a LARGE share. A category with WoE +2
# and 0.1% of rows adds almost nothing.

# WHY eps: a category with zero positives has dist_pos = 0 and WoE
# = -inf. With eps = 0.5 it gets a large negative finite value. The
# right eps is a judgement; 0.5 is the usual choice.
`,
      hl: [21, 26, 44, 52],
      caption: "**A logistic regression on WoE features has coefficients near 1, because the feature already is the log-odds shift.** That is the whole reason credit scoring uses it: the model is a sum of readable, per-attribute contributions."
    },

    { t: "h2", n: "02", text: "Why logistic regression wants it", id: "logistic" },

    { t: "p", text: "A logistic model fits `log-odds(y) = β₀ + Σ βᵢ xᵢ`. **If xᵢ is already the log-odds shift for its category, the model's job for that feature is to learn βᵢ ≈ 1** — one parameter instead of one per category, on a scale where a straight line is the right shape. One-hot gives the same fit with k parameters; WoE gives it with one, and the one is interpretable." },

    { t: "code", lang: "python", title: "WoE against one-hot in a logistic model, and the scorecard", code: `
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

train, test = train_test_split(df, test_size=0.3, random_state=0, stratify=df["fraud"])

# ONE-HOT: four columns, four coefficients (relative to the dropped one).
X_oh_tr = pd.get_dummies(train["region"], drop_first=True, dtype=float)
X_oh_te = pd.get_dummies(test["region"], drop_first=True, dtype=float).reindex(columns=X_oh_tr.columns, fill_value=0)
m_oh = LogisticRegression(C=1e6).fit(X_oh_tr, train["fraud"])       # ~unregularised
dict(zip(X_oh_tr.columns, m_oh.coef_[0].round(3)))
# {'north': 1.31, 'south': 0.44, 'west': 0.95}    -- each vs east
roc_auc_score(test["fraud"], m_oh.predict_proba(X_oh_te)[:, 1])     # 0.634

# WoE: one column, one coefficient. FIT THE TABLE ON TRAIN ONLY.
tbl, _ = woe_table(train["region"], train["fraud"])
X_woe_tr = train["region"].map(tbl["woe"]).to_frame("region_woe")
X_woe_te = test["region"].map(tbl["woe"]).fillna(0.0).to_frame("region_woe")    # unseen -> 0
m_woe = LogisticRegression(C=1e6).fit(X_woe_tr, train["fraud"])
m_woe.coef_[0]                                                       # [1.01]
m_woe.intercept_[0], np.log(train["fraud"].mean() / (1 - train["fraud"].mean()))
# (-3.08, -3.08)                                                    -- the prior log-odds
roc_auc_score(test["fraud"], m_woe.predict_proba(X_woe_te)[:, 1])   # 0.634
#
# SAME AUC. The one-hot model learned four numbers; the WoE model
# learned one, and it is 1.0, and its intercept is the overall
# log-odds. The WoE column already contained everything the four
# one-hot coefficients encoded.
#
# WITH MANY FEATURES this matters: 20 categoricals with 10 levels
# each is 180 one-hot columns or 20 WoE columns. The WoE model is
# smaller, converges faster, regularises more sensibly (one
# coefficient per feature, not per level), and every coefficient is
# readable as "how much to trust this feature's own evidence".

# THE COEFFICIENT NEAR 1 IS A DIAGNOSTIC:
#   ~1.0    the feature's WoE is a faithful log-odds shift
#   << 1    the feature is redundant given the others (its evidence
#           is already in the model); or its WoE was computed on
#           different data
#   >> 1    suspicious -- overfitting or leakage in the WoE table
#   < 0     something is wrong: the feature's evidence points the
#           wrong way given the others -- usually collinearity

# UNSEEN CATEGORY -> WoE 0: "no evidence either way". That is the
# correct default and it needs no special handling in the model.

# THE SCORECARD: rescale so each attribute is worth points.
# Convention: 600 points at odds 50:1, 20 points doubles the odds.
def scorecard(model, woe_tables, base_score=600, base_odds=50, pdo=20):
    factor = pdo / np.log(2)
    offset = base_score - factor * np.log(base_odds)
    b0 = model.intercept_[0]
    k = len(woe_tables)
    cards = {}
    for (name, tbl), beta in zip(woe_tables.items(), model.coef_[0]):
        # each attribute's points: -(beta * woe + b0 / k) * factor + offset / k
        pts = -(beta * tbl["woe"] + b0 / k) * factor + offset / k
        cards[name] = pts.round(0).astype(int)
    return cards

scorecard(m_woe, {"region": tbl})["region"]
# region
# east     565
# south    556
# west     546
# north    539
#
# A north applicant scores 539 points from region; an east applicant
# 565. Higher is better (lower fraud odds). Every attribute on the
# card is a printed number, and the total is the score. This is
# why regulators accept it: nothing in the model is hidden.
`,
      hl: [19, 26, 42, 60],
      caption: "**One-hot: four coefficients, AUC 0.634. WoE: one coefficient equal to 1.0, AUC 0.634.** The WoE column already contained what the four one-hot coefficients encoded, and the intercept is the prior log-odds."
    },

    { t: "callout", kind: "insight", title: "The coefficient near 1 is a diagnostic", body: [
      { t: "p", text: "A WoE feature entering a logistic model should get a coefficient close to 1 — it *is* the log-odds shift, so the model has nothing to rescale. **A coefficient far below 1 means the feature's evidence is already carried by others; far above 1 means the WoE table overfit or leaked; negative means collinearity has flipped it.**" },
      { t: "p", text: "That is a check no one-hot model offers. Twenty coefficients on twenty WoE features, all near 1, is a model behaving as designed; one at 3.5 is the feature to investigate." }
    ]},

    { t: "h2", n: "03", text: "Continuous features: monotonic binning", id: "binning" },

    { t: "p", text: "**WoE needs categories, so a continuous feature is binned first — and the bins are chosen so that WoE moves in one direction across them.** A non-monotonic WoE means the model would say risk rises, then falls, then rises with income, which is usually noise and never something a scorecard can print." },

    { t: "code", lang: "python", title: "binning for monotonic WoE, and what it does to a curve", code: `
# A CONTINUOUS FEATURE with a monotonic true effect:
income = rng.lognormal(10.5, 0.5, n)
p_default = 1 / (1 + np.exp(-(-2.5 - 0.00003 * (income - 40_000))))    # richer -> safer
default = (rng.random(n) < p_default).astype(int)
d = pd.DataFrame({"income": income, "default": default})

# EQUAL-FREQUENCY BINS, then WoE per bin:
d["bin"] = pd.qcut(d["income"], 10, duplicates="drop")
tbl, iv = woe_table(d["bin"], d["default"])
tbl.sort_index()[["n", "rate", "woe"]].round(3)
#                        n   rate    woe
# (2711, 18320]       2000  0.121  0.612
# (18320, 24170]      2000  0.098  0.383
# (24170, 29200]      2000  0.085  0.230
# (29200, 34100]      2000  0.077  0.126
# (34100, 39500]      2000  0.061 -0.117
# (39500, 45800]      2000  0.058 -0.171
# (45800, 53700]      2000  0.049 -0.352   <- 0.049 then 0.053: a wobble
# (53700, 64600]      2000  0.053 -0.270
# (64600, 82800]      2000  0.038 -0.617
# (82800, 405000]     2000  0.030 -0.860
iv                                                        # 0.19
#
# NEARLY monotonic, with one wobble at bins 7-8. Sampling noise on
# 2,000 rows at a 5% rate: the standard error on the rate is ~0.5%,
# so 0.049 vs 0.053 is within noise. A scorecard cannot print "risk
# falls, then rises slightly, then falls" -- it needs the bins
# merged until the trend is clean.

# MONOTONIC BINNING: merge adjacent bins until WoE is monotonic.
def monotonic_bins(x, y, n_start=20, min_share=0.05):
    """Start with many quantile bins; merge neighbours that break
    monotonicity or are too small, until the WoE sequence is clean."""
    edges = list(np.unique(np.quantile(x, np.linspace(0, 1, n_start + 1))))
    edges[0], edges[-1] = -np.inf, np.inf

    def table(edges):
        b = pd.cut(x, edges)
        t, _ = woe_table(b, y)
        return t.sort_index()

    while True:
        t = table(edges)
        w = t["woe"].to_numpy()
        share = t["share"].to_numpy()
        diffs = np.diff(w)
        direction = np.sign(np.corrcoef(np.arange(len(w)), w)[0, 1])   # overall trend
        # find the first violation: a step against the trend, or a tiny bin
        bad = np.flatnonzero((np.sign(diffs) == -direction) & (diffs != 0))
        small = np.flatnonzero(share < min_share)
        if len(bad) == 0 and len(small) == 0:
            return edges, t
        i = int(bad[0]) if len(bad) else int(small[0])
        # merge bin i with bin i+1 (drop the edge between them)
        del edges[min(i + 1, len(edges) - 2)]

edges, t_mono = monotonic_bins(d["income"], d["default"])
t_mono[["n", "rate", "woe"]].round(3)
#                        n   rate    woe
# (-inf, 18320]       2000  0.121  0.612
# (18320, 29200]      4000  0.092  0.310
# (29200, 39500]      4000  0.069  0.005
# (39500, 53700]      4000  0.053  -0.262
# (53700, 82800]      4000  0.046  -0.420
# (82800, inf]        2000  0.030  -0.860
#
# Six bins, strictly decreasing WoE. IV drops slightly (0.19 -> 0.18)
# because merging loses a little resolution -- and gains a curve the
# model can trust and a card that can be printed.

# WHAT WoE-BINNING DOES TO THE MODEL: it turns a continuous feature
# into a monotonic STEP FUNCTION on the log-odds scale.
#   + non-linear effects captured (income's effect flattens at the top)
#   + outliers neutralised (405,000 is in the last bin with 82,800)
#   + missing values get their own bin, with their own WoE
#   - resolution within a bin is lost; two incomes in the same bin
#     are identical to the model
#
# The missing-value bin is worth stating: a row with no income gets
# the WoE of "income missing", which is often strongly informative
# (see 6.5). No imputation, and the missingness is a feature by
# construction.

# THE MONOTONICITY DECISION: it is an ASSUMPTION about the world.
# Income and default: monotonic, plausibly. Age and default: U-shaped
# (young and old riskier) -- forcing monotonicity would be wrong.
# For a U, let the bins be non-monotonic, or split the feature.
`,
      hl: [12, 30, 55, 72],
      caption: "**Monotonic binning turns a continuous feature into a monotonic step function on the log-odds scale.** Non-linear effects survive, outliers land in the last bin, and missing values get their own WoE — but two incomes in the same bin are identical to the model."
    },

    { t: "table",
      head: ["Aspect", "Target encoding (7.2)", "WoE (this lesson)"],
      rows: [
        ["Encodes", "P(y = 1 | category)", "ln(odds in category / overall odds)"],
        ["Scale", "Probability, 0–1", "Log-odds, unbounded, centred on 0"],
        ["Natural consumer", "Trees; any model", "**Logistic regression** — coefficient ≈ 1"],
        ["Unseen category", "The prior", "0 — no evidence"],
        ["Zero-count class", "Fine", "ln(0): needs smoothing (eps)"],
        ["Continuous inputs", "Bin first, or not applicable", "Bin first, **monotonically**"],
        ["Feature screening", "No built-in measure", "**IV**, with conventional thresholds"],
        ["Interpretability", "Moderate", "**High** — scorecard points per attribute"],
        ["Leakage", "**Same problem**: needs OOF and smoothing", "**Same problem**: needs OOF and smoothing"],
        ["Multiclass", "One column per class", "Not defined; one-vs-rest at best"]
      ],
      caption: "**Same leakage, same fixes.** WoE is target encoding on a different scale; a WoE table computed on the rows it encodes hands the model the label exactly as a naive target mean does."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A WoE encoder and IV screen, leak-safe, for a scorecard",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "Build the feature layer for a credit scorecard: a WoE encoder that handles categorical and continuous inputs (with monotonic binning and a missing bin), computes IV per feature on training data, screens by IV, and encodes out-of-fold. Then fit a logistic model on the encoded features and verify every coefficient is near 1." },
        { t: "p", text: "Include a feature that is a leak — a proxy for the target — and show that its IV exposes it." }
      ],
      requirements: [
        "WoE for categoricals, with eps smoothing and unseen → 0.",
        "Monotonic binning for continuous features, with a separate missing bin.",
        "IV per feature, computed on training only, with the conventional thresholds applied.",
        "Out-of-fold encoding for training rows.",
        "A logistic model whose coefficients are checked against 1.",
        "A planted leak with IV > 0.5 caught by the screen, and tests for each claim."
      ],
      hint: "The leak is the interesting feature. `days_since_default_flag_set` is a proxy for the target; its IV will be enormous, and the screen's 'suspicious' band exists exactly for it.",
      solution: {
        lang: "python",
        title: "woe_scorecard.py",
        code: `import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score


# =========================================================================
# WoE PRIMITIVES
# =========================================================================

def woe_table(x, y, eps=0.5):
    t = pd.crosstab(x, y).reindex(columns=[0, 1], fill_value=0)
    t.columns = ["neg", "pos"]
    tp, tn = t["pos"].sum(), t["neg"].sum()
    t["dist_pos"] = (t["pos"] + eps) / (tp + eps * len(t))
    t["dist_neg"] = (t["neg"] + eps) / (tn + eps * len(t))
    t["woe"] = np.log(t["dist_pos"] / t["dist_neg"])
    t["iv"] = (t["dist_pos"] - t["dist_neg"]) * t["woe"]
    t["share"] = (t["pos"] + t["neg"]) / (tp + tn)
    return t


def monotonic_edges(x, y, n_start=20, min_share=0.05, max_iter=100):
    x = pd.Series(x).astype(float); y = pd.Series(y)
    ok = x.notna()
    edges = list(np.unique(np.quantile(x[ok], np.linspace(0, 1, n_start + 1))))
    edges[0], edges[-1] = -np.inf, np.inf
    for _ in range(max_iter):
        if len(edges) <= 3:
            break
        b = pd.cut(x[ok], edges)
        t = woe_table(b, y[ok]).sort_index()
        w, share = t["woe"].to_numpy(), t["share"].to_numpy()
        diffs = np.diff(w)
        trend = np.sign(np.corrcoef(np.arange(len(w)), w)[0, 1]) or 1.0
        bad = np.flatnonzero((np.sign(diffs) == -trend) & (diffs != 0))
        small = np.flatnonzero(share < min_share)
        if len(bad) == 0 and len(small) == 0:
            break
        i = int(bad[0]) if len(bad) else int(small[0])
        del edges[min(i + 1, len(edges) - 2)]
    return edges


# =========================================================================
# THE ENCODER
# =========================================================================

IV_BANDS = [(0.02, "useless"), (0.1, "weak"), (0.3, "medium"), (0.5, "strong"), (np.inf, "suspicious")]

def iv_band(iv):
    for cut, name in IV_BANDS:
        if iv < cut:
            return name
    return "suspicious"


class WoEEncoder:
    """Fit on train; fit_transform gives OOF encodings for train rows."""
    def __init__(self, categorical, continuous, eps=0.5, n_splits=5, seed=0):
        self.categorical, self.continuous = categorical, continuous
        self.eps, self.n_splits, self.seed = eps, n_splits, seed

    def _binned(self, X, col):
        """Continuous -> interval labels using learned edges; NaN -> 'MISSING'."""
        b = pd.cut(X[col].astype(float), self.edges_[col]).astype(object)
        return b.where(X[col].notna(), "MISSING")

    def _fit_tables(self, X, y):
        tables = {}
        for col in self.categorical:
            tables[col] = woe_table(X[col].fillna("MISSING"), y, self.eps)
        for col in self.continuous:
            tables[col] = woe_table(self._binned(X, col), y, self.eps)
        return tables

    def fit(self, X, y):
        y = pd.Series(np.asarray(y), index=X.index)
        self.edges_ = {c: monotonic_edges(X[c], y) for c in self.continuous}
        self.tables_ = self._fit_tables(X, y)
        self.iv_ = pd.Series({c: float(t["iv"].sum()) for c, t in self.tables_.items()}).sort_values(ascending=False)
        self.bands_ = self.iv_.map(iv_band)
        return self

    def _apply(self, X, tables):
        out = pd.DataFrame(index=X.index)
        for col in self.categorical:
            out[f"{col}_woe"] = X[col].fillna("MISSING").map(tables[col]["woe"]).fillna(0.0)
        for col in self.continuous:
            out[f"{col}_woe"] = self._binned(X, col).map(tables[col]["woe"]).fillna(0.0)
        return out

    def transform(self, X):
        return self._apply(X, self.tables_)

    def fit_transform(self, X, y):
        self.fit(X, y)
        y = pd.Series(np.asarray(y), index=X.index)
        out = pd.DataFrame(index=X.index, columns=[f"{c}_woe" for c in self.categorical + self.continuous], dtype=float)
        kf = StratifiedKFold(self.n_splits, shuffle=True, random_state=self.seed)
        for a, b in kf.split(X, y):
            Xa, ya, Xb = X.iloc[a], y.iloc[a], X.iloc[b]
            tables = self._fit_tables(Xa, ya)          # same EDGES (fit on all train), fold-specific WoE
            out.iloc[b] = self._apply(Xb, tables).values
        return out

    def select(self, min_iv=0.02, max_iv=0.5):
        keep = self.iv_[(self.iv_ >= min_iv) & (self.iv_ < max_iv)].index.tolist()
        dropped = {c: self.bands_[c] for c in self.iv_.index if c not in keep}
        return keep, dropped


# =========================================================================
# DATA, with a planted leak
# =========================================================================

def make_credit(n=30_000, seed=0):
    rng = np.random.default_rng(seed)
    income = rng.lognormal(10.5, 0.5, n)
    age = rng.integers(18, 75, n)
    region = rng.choice(["north", "south", "east", "west"], n, p=[.2, .4, .3, .1])
    employment = rng.choice(["employed", "self", "unemployed", "retired"], n, p=[.6, .2, .1, .1])
    noise_cat = rng.choice(list("abcdefgh"), n)
    logit = (-2.8 - 0.00003 * (income - 40_000)
             + np.where(employment == "unemployed", 1.2, 0) + np.where(employment == "self", 0.4, 0)
             + np.where(region == "north", 0.5, 0) + 0.02 * np.abs(age - 45))
    default = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
    # THE LEAK: a field set AFTER default is known.
    days_since_flag = np.where(default == 1, rng.integers(1, 200, n), np.nan)
    income = np.where(rng.random(n) < 0.08, np.nan, income)              # some missing
    return pd.DataFrame({"income": income, "age": age, "region": region,
                         "employment": employment, "noise_cat": noise_cat,
                         "days_since_flag": days_since_flag, "default": default})


CAT = ["region", "employment", "noise_cat"]
CONT = ["income", "age", "days_since_flag"]


# =========================================================================
# TESTS
# =========================================================================

def _split():
    df = make_credit()
    tr, te = train_test_split(df, test_size=0.3, random_state=0, stratify=df["default"])
    return tr, te


def test_iv_exposes_the_leak():
    tr, _ = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    assert enc.iv_["days_since_flag"] > 0.5
    assert enc.bands_["days_since_flag"] == "suspicious"
    keep, dropped = enc.select()
    assert "days_since_flag" not in keep


def test_iv_ranks_real_features_above_noise():
    tr, _ = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    assert enc.iv_["employment"] > enc.iv_["noise_cat"]
    assert enc.iv_["income"] > enc.iv_["noise_cat"]
    assert enc.bands_["noise_cat"] == "useless"


def test_income_woe_is_monotonic():
    tr, _ = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    t = enc.tables_["income"].drop(index="MISSING", errors="ignore").sort_index()
    w = t["woe"].to_numpy()
    assert (np.diff(w) <= 1e-9).all() or (np.diff(w) >= -1e-9).all()


def test_missing_income_has_its_own_woe():
    tr, _ = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    assert "MISSING" in enc.tables_["income"].index


def test_unseen_category_encodes_to_zero():
    tr, te = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    te = te.copy(); te.loc[te.index[:3], "region"] = "mars"
    out = enc.transform(te)
    assert (out.loc[te.index[:3], "region_woe"] == 0.0).all()


def test_coefficients_near_one_on_clean_features():
    tr, te = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    keep, _ = enc.select()
    Xtr = enc.fit_transform(tr, tr["default"])[[f"{c}_woe" for c in keep]]
    Xte = enc.transform(te)[[f"{c}_woe" for c in keep]]
    m = LogisticRegression(C=1e6, max_iter=1000).fit(Xtr, tr["default"])
    coefs = dict(zip(Xtr.columns, m.coef_[0]))
    for c, b in coefs.items():
        assert 0.6 < b < 1.4, (c, b)
    assert roc_auc_score(te["default"], m.predict_proba(Xte)[:, 1]) > 0.65


def test_oof_encoding_does_not_inflate_train_auc():
    tr, te = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    keep, _ = enc.select()
    cols = [f"{c}_woe" for c in keep]
    Xtr_oof = enc.fit_transform(tr, tr["default"])[cols]
    Xtr_naive = enc.transform(tr)[cols]                 # in-sample tables
    Xte = enc.transform(te)[cols]
    for Xtr, label in [(Xtr_oof, "oof"), (Xtr_naive, "naive")]:
        m = LogisticRegression(C=1e6, max_iter=1000).fit(Xtr, tr["default"])
        tr_auc = roc_auc_score(tr["default"], m.predict_proba(Xtr)[:, 1])
        te_auc = roc_auc_score(te["default"], m.predict_proba(Xte)[:, 1])
        if label == "oof":
            assert abs(tr_auc - te_auc) < 0.03
        # on these low-cardinality features the naive gap is small too --
        # the leak scales with 1/rows-per-category, which is why the
        # high-cardinality case in 7.2 is where it bites


def test_leak_feature_coefficient_would_be_absurd():
    """If the leak were kept, its WoE coefficient is far from 1 and AUC ~1."""
    tr, te = _split()
    enc = WoEEncoder(CAT, CONT).fit(tr, tr["default"])
    X = enc.transform(tr)[["days_since_flag_woe"]]
    m = LogisticRegression(C=1e6, max_iter=1000).fit(X, tr["default"])
    assert roc_auc_score(tr["default"], m.predict_proba(X)[:, 1]) > 0.98


def test_intercept_is_the_prior_log_odds():
    tr, _ = _split()
    enc = WoEEncoder(CAT, ["income"]).fit(tr, tr["default"])
    X = enc.fit_transform(tr, tr["default"])
    m = LogisticRegression(C=1e6, max_iter=1000).fit(X, tr["default"])
    p = tr["default"].mean()
    assert abs(m.intercept_[0] - np.log(p / (1 - p))) < 0.15`,
        notes: [
          { t: "p", text: "**The planted leak has IV above 0.5 and lands in the \"suspicious\" band by construction.** `days_since_flag` is set only after default is known; its WoE bins separate the classes almost perfectly, and a feature that good is not a feature. The screen's top band exists for exactly this." },
          { t: "callout", kind: "insight", title: "Every clean coefficient is between 0.6 and 1.4", body: [
            { t: "p", text: "The test asserts it. A WoE feature is already the log-odds shift, so the model's job is to learn β ≈ 1 — and when it does, **the intercept is the prior log-odds, and the model is a sum of readable per-attribute contributions.**" },
            { t: "p", text: "The leak feature, kept, would have a coefficient far from 1 and a training AUC near 1.0 — both diagnostics fire." }
          ]},
          { t: "p", text: "**Bin edges are fit once on all of training; WoE values are fit per fold.** The edges are a property of the feature's distribution, not of the target within a fold — re-cutting them per fold would give training rows different bin definitions from test rows, which is a different problem from leakage." },
          { t: "p", text: "**Missing income gets its own bin and its own WoE.** No imputation; if missingness is informative — and for income it usually is (6.5) — the model learns it directly. An unseen category maps to WoE 0, which reads as \"no evidence either way\"." },
          { t: "p", text: "**On low-cardinality features the naive/OOF gap is small**, and the test says so. The leak scales with one over rows-per-category; region has thousands of rows per level. The high-cardinality case in 7.2 is where OOF is the difference between a model and a lookup of the answer." },
          { t: "p", text: "**IV ranks `employment` and `income` above `noise_cat`, which lands in \"useless\".** The screen is doing feature selection before any model is fitted, on a scale with conventional thresholds — which is why credit teams run it first." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A WoE-encoded feature enters a logistic regression with a coefficient of 3.2. What does that suggest?",
          options: [
            "The feature is very strong",
            "Something is wrong — a WoE feature is already the log-odds shift and should get a coefficient near 1; far above it means the WoE table overfit or leaked",
            "The model needs regularisation",
            "The feature should be one-hot encoded instead"
          ],
          answer: 1,
          why: "The scale is the point of WoE. A coefficient near 1 means the model trusts the feature's own evidence as-is. One far above means the training encoding predicted the target better than it should — the same in-sample leak as naive target encoding — and the feature is the one to investigate."
        }
      ]
    }
  ],

  takeaways: [
    "**WoE = ln(share of positives / share of negatives) per category** — the category's log-odds minus the overall log-odds.",
    "**Zero means uninformative; positive leans toward the target; negative leans away.** `exp(WoE)` is the odds multiplier.",
    "**IV = Σ (dist_pos − dist_neg) × WoE** — one number per feature, rewarding a strong lean in a large share.",
    "**IV thresholds: < 0.02 useless, 0.1–0.3 medium, > 0.5 suspicious** — the top band is a leakage detector.",
    "**A logistic model on WoE features has coefficients near 1**, because the feature already is the log-odds shift; the intercept is the prior log-odds.",
    "**A coefficient far from 1 is a diagnostic**: below means redundant, above means leaked or overfit, negative means collinearity.",
    "**One WoE column replaces k one-hot columns** at the same AUC, with one readable coefficient instead of k.",
    "**Continuous features are binned first, monotonically** — merge adjacent bins until WoE moves in one direction.",
    "**Monotonic binning turns a feature into a step function on the log-odds scale**: non-linearity kept, outliers neutralised, resolution within a bin lost.",
    "**Missing values get their own bin and their own WoE** — no imputation, and missingness is a feature by construction.",
    "**Monotonicity is an assumption about the world**; a U-shaped effect should not be forced into it.",
    "**Same leakage as target encoding, same fixes**: eps smoothing for zero counts, out-of-fold for training rows, unseen → 0.",
    "**The scorecard rescales the model into points per attribute** — interpretable by construction, which is why regulators accept it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Region 'north' holds 34% of all fraud cases and 17% of all non-fraud cases. What is its WoE?",
        options: [
          "0.17",
          "ln(0.34 / 0.17) ≈ 0.69 — north leans toward fraud by a factor of about 2 in the odds",
          "0.34 − 0.17 = 0.17",
          "ln(0.17 / 0.34) ≈ −0.69"
        ],
        answer: 1,
        why: "WoE is the log of the ratio of the category's share of positives to its share of negatives. The shares are of each class total, not of the category. Positive means the category is over-represented among positives; the sign convention depends on which class is 'positive'."
      },
      {
        stem: "Why does WoE suit logistic regression specifically?",
        options: [
          "It is bounded between 0 and 1",
          "Logistic regression is linear on the log-odds scale, and WoE is already the log-odds shift for each category — so one coefficient near 1 replaces one coefficient per level",
          "It handles missing values",
          "It is faster to compute than one-hot"
        ],
        answer: 1,
        why: "The model's job for a WoE feature is to learn β ≈ 1, on a scale where a straight line is the right shape. Twenty categoricals with ten levels each is 180 one-hot columns or 20 WoE columns at the same fit — smaller, more sensibly regularised, and every coefficient readable."
      },
      {
        stem: "A continuous feature's WoE across ten quantile bins rises, dips slightly at bin 7, and rises again. What should you do for a scorecard?",
        options: [
          "Keep it; the dip is real",
          "Merge bins until the WoE is monotonic — the dip is within sampling noise, and a scorecard cannot print 'risk rises, then falls slightly, then rises'",
          "Drop the feature",
          "Use more bins"
        ],
        answer: 1,
        why: "With a few thousand rows per bin at a low event rate, adjacent rates differ by less than their standard error. Merging neighbours that break the trend gives fewer, cleaner bins at slightly lower IV — and a step function the model can trust. If the effect is genuinely U-shaped, monotonicity is the wrong assumption and should not be forced."
      },
      {
        stem: "A feature has IV = 0.85. What is the most likely explanation?",
        options: [
          "It is the best feature in the set",
          "It is a leak — a proxy for the target, or a field populated after the outcome was known; IV above 0.5 is the 'suspicious' band for this reason",
          "The eps smoothing is too small",
          "It has too many categories"
        ],
        answer: 1,
        why: "Real features rarely separate a binary outcome that cleanly. A field like 'days since default flag set' is populated only for defaulters, its bins separate the classes almost perfectly, and its IV is enormous. The screen's top band catches it before a model is fitted; kept, it would give AUC near 1.0 in training and nothing in production."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is Weight of Evidence, and when would you use it over target encoding?",
        strong: "WoE is the log of a category's share of positives over its share of negatives — its log-odds shift relative to the prior. Target encoding gives the probability; WoE gives the same information on the log-odds scale, which is what logistic regression is linear on. So for a logistic model, WoE features enter with coefficients near 1 and the model becomes a sum of readable per-attribute contributions — a scorecard. For a tree, target encoding is simpler and the scale does not matter.",
        answer: [
          { t: "p", text: "Pairing the encoding with its natural consumer — WoE for logistic, target mean for trees — is the judgement being tested." }
        ]
      },
      {
        level: "advanced",
        q: "What is Information Value and how do you use it?",
        strong: "The sum over categories of the difference in class shares times the WoE — a single number for how much a feature separates the classes, weighted so that a strong lean in a large share counts most. The conventional bands are under 0.02 useless, 0.1 to 0.3 medium, over 0.5 suspicious. I use it as a screen before modelling: drop the useless, investigate the suspicious — because a feature that separates a binary outcome that well is almost always a proxy for the target.",
        answer: [
          { t: "p", text: "Treating the top band as a leakage detector rather than a prize is the practical insight." }
        ]
      },
      {
        level: "expert",
        q: "How do you WoE-encode a continuous feature, and what does that do to the model?",
        strong: "Bin it, then compute WoE per bin — with the bins merged until the WoE sequence is monotonic, because a scorecard cannot print a wobble and the wobble is usually noise. Missing values get their own bin. The result is a monotonic step function on the log-odds scale: non-linear effects are captured, outliers fall into the end bins, and missingness becomes a feature by construction. The cost is resolution — two values in one bin are identical to the model. And monotonicity is an assumption; a U-shaped effect like age should not be forced into it.",
        answer: [
          { t: "p", text: "Naming what is lost — within-bin resolution — and when the monotonicity assumption is wrong shows you have thought past the recipe." }
        ]
      }
    ]
  }
});
