/* ============================================================================
   LESSON 7.1 — Categorical Encoding: The Full Map
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "**A category is a label, and a model needs a number. Every encoding is a claim about what the labels mean** — that they are unordered, or ordered, or that rare ones can be lumped together, or that their frequency is what matters. The wrong claim does not raise an error; it produces a model that has learned something false about the world, in a way that is hard to see from its score.",

  objectives: [
    "Choose an encoding from the category's cardinality, its order, and the model that will consume it",
    "Apply one-hot, ordinal, frequency, binary, hashing and rare-label encoding and state what each assumes",
    "Handle unseen categories at prediction time without crashing or lying",
    "Fit every encoder on training data only and explain the leak when you do not",
    "Recognise when a tree model and a linear model want different encodings of the same column"
  ],

  prerequisites: ["3.3", "6.1"],

  blocks: [

    { t: "h2", n: "01", text: "The two questions that decide the encoding", id: "questions" },

    { t: "p", text: "Before any encoding, two facts about the column: **how many distinct values does it have, and do they have an order?** A third fact about the consumer: **is the model linear, or is it a tree?** Every method below is a point in that space, and most encoding mistakes are a method applied outside its region." },

    { t: "dl", items: [
      ["Cardinality", "The number of distinct categories. Under ~15 is low; hundreds is high; tens of thousands — a postcode, a product SKU — is very high, and most methods break there."],
      ["Ordinal", "Categories with a meaningful order: small < medium < large; poor < fair < good. The gaps between them are not necessarily equal."],
      ["Nominal", "Categories with no order: region, colour, product type. Any integer assigned to them is arbitrary, and a linear model will treat the arbitrary integer as a quantity."],
      ["One-hot encoding", "One binary column per category. No order is implied; the dimensionality is the cardinality."],
      ["Rare label", "A category with too few rows to estimate anything about it. Grouping them into `\"other\"` trades a little information for a lot of stability."],
      ["Unseen category", "A value at prediction time that was not in the training data. Every encoder needs a rule for it, and the default in most is to crash."]
    ]},

    { t: "viz",
      title: "Where each encoding lives",
      caption: "Cardinality across, model type down. One-hot dominates the low-cardinality corner; target and hashing encodings are what is left at the high end; ordinal codes work for trees almost everywhere and for linear models only when the order is real.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="A grid with cardinality low to high across the top and linear versus tree models down the side, with encoding names placed in the cells they suit">
  <text x="200" y="26" class="s-label" style="fill:var(--ink-2)">low (≤15)</text>
  <text x="420" y="26" class="s-label" style="fill:var(--ink-2)">medium (15–200)</text>
  <text x="660" y="26" class="s-label" style="fill:var(--ink-2)">high (200+)</text>
  <text x="30" y="110" class="s-label" style="fill:var(--ink-2)">linear /</text>
  <text x="30" y="128" class="s-label" style="fill:var(--ink-2)">distance</text>
  <text x="30" y="240" class="s-label" style="fill:var(--ink-2)">tree /</text>
  <text x="30" y="258" class="s-label" style="fill:var(--ink-2)">boosting</text>

  <g stroke-width="1.2" style="fill:none;stroke:var(--line)">
    <rect x="140" y="50" width="220" height="120"/><rect x="360" y="50" width="240" height="120"/><rect x="600" y="50" width="250" height="120"/>
    <rect x="140" y="180" width="220" height="120"/><rect x="360" y="180" width="240" height="120"/><rect x="600" y="180" width="250" height="120"/>
  </g>

  <rect x="150" y="60" width="200" height="34" rx="4" style="fill:var(--good);fill-opacity:.2;stroke:var(--good);stroke-width:1.2"/>
  <text x="160" y="82" class="s-sub" style="fill:var(--ink-2)">one-hot (drop one for OLS)</text>
  <rect x="150" y="104" width="200" height="30" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1"/>
  <text x="160" y="124" class="s-sub" style="fill:var(--ink-3)">ordinal, only if ordered</text>

  <rect x="370" y="60" width="220" height="34" rx="4" style="fill:var(--good);fill-opacity:.2;stroke:var(--good);stroke-width:1.2"/>
  <text x="380" y="82" class="s-sub" style="fill:var(--ink-2)">one-hot + rare → "other"</text>
  <rect x="370" y="104" width="220" height="30" rx="4" style="fill:var(--warn);fill-opacity:.15;stroke:var(--warn);stroke-width:1"/>
  <text x="380" y="124" class="s-sub" style="fill:var(--ink-3)">target encoding (7.2), WoE (7.3)</text>

  <rect x="610" y="60" width="230" height="34" rx="4" style="fill:var(--warn);fill-opacity:.2;stroke:var(--warn);stroke-width:1.2"/>
  <text x="620" y="82" class="s-sub" style="fill:var(--ink-2)">target encoding, hashing</text>
  <rect x="610" y="104" width="230" height="30" rx="4" style="fill:var(--crit);fill-opacity:.1;stroke:var(--crit);stroke-width:1;stroke-dasharray:3 2"/>
  <text x="620" y="124" class="s-sub" style="fill:var(--crit)">one-hot: 10k columns — no</text>

  <rect x="150" y="190" width="200" height="34" rx="4" style="fill:var(--good);fill-opacity:.2;stroke:var(--good);stroke-width:1.2"/>
  <text x="160" y="212" class="s-sub" style="fill:var(--ink-2)">ordinal codes, or one-hot</text>
  <rect x="150" y="234" width="200" height="30" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1"/>
  <text x="160" y="254" class="s-sub" style="fill:var(--ink-3)">native categorical (LightGBM)</text>

  <rect x="370" y="190" width="220" height="34" rx="4" style="fill:var(--good);fill-opacity:.2;stroke:var(--good);stroke-width:1.2"/>
  <text x="380" y="212" class="s-sub" style="fill:var(--ink-2)">ordinal codes + frequency</text>
  <rect x="370" y="234" width="220" height="30" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1"/>
  <text x="380" y="254" class="s-sub" style="fill:var(--ink-3)">native categorical, target enc.</text>

  <rect x="610" y="190" width="230" height="34" rx="4" style="fill:var(--warn);fill-opacity:.2;stroke:var(--warn);stroke-width:1.2"/>
  <text x="620" y="212" class="s-sub" style="fill:var(--ink-2)">target enc., frequency, hashing</text>
  <rect x="610" y="234" width="230" height="30" rx="4" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1"/>
  <text x="620" y="254" class="s-sub" style="fill:var(--ink-3)">rare → "other" first, always</text>

  <text x="140" y="316" class="s-sub" style="fill:var(--ink-3)">Trees split on thresholds, so an arbitrary integer code is fine for them. A linear model multiplies the code by a weight, so it is fine only when the order is real.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "one-hot and ordinal: the two basic claims, and where each lies", code: `
import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder

df = pd.DataFrame({
    "region": ["north", "south", "east", "north", "west", "south"],
    "size":   ["small", "large", "medium", "small", "large", "medium"],
    "price":  [10, 30, 20, 12, 28, 19],
})

# ONE-HOT: one column per category. The claim: NO ORDER. Every
# category is equally far from every other.
pd.get_dummies(df["region"], prefix="region", dtype=int)
#    region_east  region_north  region_south  region_west
# 0            0             1             0            0
# 1            0             0             1            0
# ...
#
# A linear model gets one coefficient per region: "the effect of
# being north". That is exactly right for a nominal column.

# THE DUMMY TRAP, for models with an intercept:
pd.get_dummies(df["region"], drop_first=True, dtype=int)
#
# With all four columns AND an intercept, the columns sum to 1 for
# every row -- they are perfectly collinear with the intercept. OLS
# cannot identify the coefficients (see 2.3). drop_first=True makes
# one category the baseline; every other coefficient is "relative to
# east". Regularised models (ridge, lasso, logistic with C) do not
# need this and are easier to read WITHOUT it. Trees never need it.

# ORDINAL: one integer per category. The claim: THE ORDER IS REAL,
# and for a linear model, THE GAPS ARE EQUAL.
size_order = [["small", "medium", "large"]]
enc = OrdinalEncoder(categories=size_order)
enc.fit_transform(df[["size"]]).ravel()          # [0, 2, 1, 0, 2, 1]
#
# small=0, medium=1, large=2. A linear model fits ONE coefficient:
# "each step up in size adds beta to the prediction". That is a
# claim that medium is exactly halfway between small and large. If
# large is 10x medium, the claim is false and the model is wrong.

# THE MISTAKE: ordinal encoding a NOMINAL column.
OrdinalEncoder().fit_transform(df[["region"]]).ravel()   # [1, 2, 0, 1, 3, 2]
#
# east=0, north=1, south=2, west=3 -- alphabetical, which is
# ARBITRARY. A linear model now learns "each step from east toward
# west adds beta". There is no such thing. The coefficient is a
# number about the alphabet.
#
# A TREE does not care. It asks "region_code <= 1.5?" and gets
# {east, north} vs {south, west}; then splits again. Any partition is
# reachable. For a tree, ordinal codes on a nominal column are fine,
# and much cheaper than one-hot at high cardinality.
#
# THIS IS THE CENTRAL SPLIT: linear models read codes as quantities;
# trees read them as labels to threshold. Encode for the consumer.

# sklearn's OneHotEncoder, for a Pipeline (see 8.5):
ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
ohe.fit(df[["region"]])
ohe.categories_                                  # learned from the fit
ohe.transform(pd.DataFrame({"region": ["north", "mars"]}))
# [[0, 1, 0, 0],
#  [0, 0, 0, 0]]        <- "mars" was never seen: all zeros, no crash
#
# handle_unknown="ignore" is the single most important argument. The
# default ("error") crashes the first time production sends a value
# training did not contain -- which it will.

# get_dummies HAS NO fit STEP, and that is the problem with it:
train = pd.DataFrame({"region": ["north", "south"]})
test = pd.DataFrame({"region": ["north", "east"]})
pd.get_dummies(train).columns                    # region_north, region_south
pd.get_dummies(test).columns                     # region_east, region_north
#
# Different columns, in a different order. A model trained on the
# first cannot score the second. get_dummies is for exploration;
# OneHotEncoder is for pipelines.
`,
      hl: [24, 34, 40, 63],
      caption: "**Linear models read codes as quantities; trees read them as labels to threshold.** Ordinal encoding a nominal column is a bug for the first and free for the second — encode for the consumer."
    },

    { t: "callout", kind: "trap", title: "get_dummies produces different columns on different data", body: [
      { t: "p", text: "It has no fit step. Training data with `north` and `south` gives two columns; test data with `north` and `east` gives two different columns. The model trained on the first cannot score the second, and if it happens to have the same number of columns, it scores them wrongly without an error." },
      { t: "p", text: "**`OneHotEncoder` learns the categories at fit time and produces the same columns forever**, with `handle_unknown=\"ignore\"` turning a new value into a row of zeros instead of a crash." },
      { t: "p", text: "`get_dummies` is for looking; the encoder is for shipping." }
    ]},

    { t: "h2", n: "02", text: "Frequency, binary, hashing and rare labels", id: "compact" },

    { t: "p", text: "**When cardinality climbs, one-hot stops being an option** — a thousand columns of mostly zeros, most with too few ones to learn from. The compact encodings each give up something to fit: frequency gives up identity, hashing gives up reversibility, rare-label grouping gives up the tail." },

    { t: "code", lang: "python", title: "the encodings for medium and high cardinality", code: `
rng = np.random.default_rng(0)
n = 10_000
# a product column with a long tail: a few common, many rare
products = rng.choice([f"p{i}" for i in range(300)], n, p=np.random.default_rng(1).dirichlet(np.ones(300) * 0.3))
df = pd.DataFrame({"product": products})
df["product"].nunique()                           # ~280
df["product"].value_counts().head(3)              # p17 900, p5 700, p42 500
(df["product"].value_counts() < 10).sum()         # ~150 products with < 10 rows

# FREQUENCY ENCODING: replace the label with how often it appears.
freq = df["product"].value_counts(normalize=True)
df["product_freq"] = df["product"].map(freq)
#
# CLAIM: how common a category is carries the information. True for
# "is this a mainstream product or a niche one"; false for anything
# about WHICH product. Two products with the same frequency become
# identical. One column, no dimensionality, works for any model, and
# it is fit on train (the value_counts is the fit).

# COUNT ENCODING: the same with raw counts. Scales with dataset size,
# so frequency is safer across train/test.

# RARE-LABEL GROUPING: everything under a threshold becomes "other".
def rare_to_other(s, min_count=30, other="__other__"):
    vc = s.value_counts()
    keep = set(vc[vc >= min_count].index)
    return s.where(s.isin(keep), other), keep

df["product_grouped"], kept = rare_to_other(df["product"])
df["product_grouped"].nunique()                   # ~60, from 280
#
# CLAIM: a category with 8 rows cannot be estimated, and "rare" is
# itself informative. The threshold is a judgement: 30 rows is
# enough to estimate a proportion to about +/-15%. Below that, the
# one-hot column is noise the model will overfit to.
#
# THE kept SET IS THE FIT. At prediction time, anything not in it --
# including a category that was common in training but is absent
# from this batch, and any UNSEEN value -- maps to "other". That
# handles unknown categories for free.

# BINARY ENCODING: ordinal code, written in binary, one column per bit.
codes = pd.factorize(df["product"])[0]
n_bits = int(np.ceil(np.log2(codes.max() + 1)))          # 9 bits for 280
binary = pd.DataFrame({f"bit{b}": (codes >> b) & 1 for b in range(n_bits)})
#
# 280 categories in 9 columns instead of 280. CLAIM: none, really --
# the bits are arbitrary, and a linear model on them learns
# coefficients about binary digits. For TREES it is a compact way to
# make every category reachable in a few splits. Use it only there.

# HASHING: hash the label to one of k buckets. No fit step at all.
from sklearn.feature_extraction import FeatureHasher
hasher = FeatureHasher(n_features=64, input_type="string")
hashed = hasher.transform([[p] for p in df["product"]])   # sparse (n, 64)
#
# CLAIM: collisions are acceptable. Two different products landing in
# the same bucket become indistinguishable, and you cannot tell which
# collided. With 280 categories in 64 buckets, most buckets hold
# several. With 100,000 categories in 2^18 buckets, collisions are
# rare and the encoding is the only one that fits.
#
# ADVANTAGES: no fit, no vocabulary to store, unseen values just
# hash somewhere, constant memory. THE PRICE: irreversible, and the
# columns mean nothing. Right for very high cardinality in a model
# where interpretability is not required -- ad IDs, URLs, user agents.

# THE CARDINALITY-BY-METHOD SUMMARY:
#   one-hot          d columns   exact        <=15, or <=200 with "other"
#   ordinal          1 column    arbitrary    trees only, unless ordered
#   frequency        1 column    lossy        any; "how common" is the signal
#   rare -> other    d' << d     lossy tail   always, before one-hot at >15
#   binary           log2(d)     arbitrary    trees, medium cardinality
#   hashing          k fixed     collisions   very high; no vocabulary
#   target (7.2)     1 column    leaky        medium-high, done carefully
#   WoE (7.3)        1 column    monotonic    binary targets, credit models

# NATIVE CATEGORICAL IN TREE LIBRARIES -- often the best of all:
# LightGBM, CatBoost and sklearn's HistGradientBoosting accept a
# pandas category dtype directly and find the optimal partition of
# categories at each split. No encoding, no dimensionality, and the
# split can group categories however the target suggests.
from sklearn.ensemble import HistGradientBoostingClassifier
df["product_cat"] = df["product_grouped"].astype("category")
# HistGradientBoostingClassifier(categorical_features="from_dtype").fit(X, y)
#
# Still group rare labels first: a category with 3 rows gives the
# tree a split that fits those 3 rows exactly.
`,
      hl: [11, 22, 36, 73],
      caption: "**Rare-label grouping handles unseen categories for free**: the kept set is the fit, and anything not in it — including a value production has never sent before — maps to `\"other\"`."
    },

    { t: "h2", n: "03", text: "Fitting on train, and the leak when you do not", id: "leak" },

    { t: "p", text: "**Every encoder except hashing has a fit step: the category list, the frequency table, the kept set.** Fit it on the full data and the test rows have shaped the encoding — the test set's rare categories decided what \"rare\" means, and its frequencies are in the frequency column. The leak is small for one-hot and large for anything that uses counts." },

    { t: "code", lang: "python", title: "the encoder as a transformer, fit on train only", code: `
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.model_selection import train_test_split

class CategoryEncoder(BaseEstimator, TransformerMixin):
    """Rare-label grouping + one-hot + frequency, fit on train.

    min_count   categories seen fewer times than this in TRAINING
                become 'other'
    Unseen values at transform time also become 'other'.
    """
    def __init__(self, min_count=30, add_frequency=True):
        self.min_count = min_count
        self.add_frequency = add_frequency

    def fit(self, X, y=None):
        s = pd.Series(np.asarray(X).ravel())
        vc = s.value_counts()
        self.keep_ = sorted(vc[vc >= self.min_count].index.tolist())
        self.freq_ = (vc / len(s)).to_dict()
        self.other_freq_ = float(vc[vc < self.min_count].sum() / len(s))
        self.columns_ = [f"cat_{c}" for c in self.keep_] + ["cat___other__"]
        if self.add_frequency:
            self.columns_.append("cat_freq")
        return self

    def transform(self, X):
        s = pd.Series(np.asarray(X).ravel())
        grouped = s.where(s.isin(self.keep_), "__other__")
        out = pd.DataFrame(0, index=range(len(s)), columns=self.columns_)
        for c in self.keep_:
            out[f"cat_{c}"] = (grouped == c).astype(int).values
        out["cat___other__"] = (grouped == "__other__").astype(int).values
        if self.add_frequency:
            # frequency from TRAINING; unseen -> the pooled rare frequency
            out["cat_freq"] = s.map(self.freq_).fillna(self.other_freq_).values
        return out

    def get_feature_names_out(self, input_features=None):
        return np.array(self.columns_)


train, test = train_test_split(df[["product"]], test_size=0.3, random_state=0)
enc = CategoryEncoder(min_count=30).fit(train)
Xtr = enc.transform(train)
Xte = enc.transform(test)
Xtr.shape, Xte.shape                              # same columns, always
#
# A product that is in test and not in train -> cat___other__ = 1,
# cat_freq = the training rare-pool frequency. No crash, no new
# column, and the model has seen "other" rows in training so it
# knows what to do with one.

# THE LEAK, MEASURED: fit on ALL data instead.
enc_leaky = CategoryEncoder(min_count=30).fit(df[["product"]])
set(enc_leaky.keep_) - set(enc.keep_)
# {'p88', 'p133', ...}  -- categories that reached 30 only WITH the
#                          test rows. The test rows decided they
#                          were "not rare". In production, they
#                          would have been "other".
#
# And cat_freq computed on all data puts the test rows' counts into
# the training feature. On one-hot the effect is a few columns; on
# frequency encoding it is every value; on target encoding (7.2) it
# is the target itself.

# THE RULE IS THE SAME AS FOR IMPUTERS (6.6) AND SCALERS (7.4):
#   fit on train, transform both, and let a Pipeline enforce it.

# ORDER-SENSITIVE CATEGORIES -- the ordinal case, done properly:
class OrderedEncoder(BaseEstimator, TransformerMixin):
    def __init__(self, order, unknown=-1):
        self.order, self.unknown = order, unknown
    def fit(self, X, y=None):
        self.map_ = {c: i for i, c in enumerate(self.order)}
        return self
    def transform(self, X):
        s = pd.Series(np.asarray(X).ravel())
        return s.map(self.map_).fillna(self.unknown).astype(int).to_frame()

OrderedEncoder(["small", "medium", "large"]).fit_transform(pd.DataFrame({"s": ["large", "tiny"]}))
#    0
# 0  2
# 1 -1       <- "tiny" was not in the order: -1, below "small"
#
# The order is a DECLARED fact, not learned from data. An unknown
# value gets a sentinel the model can learn is "outside the scale",
# rather than an error or a silent 0 that means "small".
`,
      hl: [17, 46, 52, 76],
      caption: "**Fit on all data and the test rows decide what \"rare\" means.** Categories that reached the threshold only with test rows are one-hot columns in training and would have been `\"other\"` in production."
    },

    { t: "table",
      head: ["Model family", "Nominal, low card.", "Nominal, high card.", "Ordinal", "Why"],
      rows: [
        ["Linear / logistic (regularised)", "One-hot, keep all", "Target enc. or hashing, after rare grouping", "One-hot **or** ordinal codes if gaps are plausible", "Reads codes as quantities; needs one weight per meaning"],
        ["OLS, no regularisation", "One-hot, `drop_first`", "Avoid; too many columns", "Ordinal codes", "Dummy trap: all columns + intercept are collinear"],
        ["Tree / boosting", "Ordinal codes, or native categorical", "Native categorical, target enc., frequency", "Ordinal codes", "Splits on thresholds; any partition is reachable"],
        ["KNN / SVM / anything with distance", "One-hot, then scale", "Target enc. or embeddings", "Ordinal codes, scaled", "Distance between one-hot vectors is meaningful; between codes it is not"],
        ["Neural network", "One-hot or embedding", "Embedding (7.10)", "Ordinal or embedding", "An embedding learns the geometry from the data"]
      ],
      caption: "**The same column, three encodings, depending on who reads it.** A region column is one-hot for the logistic model, integer codes for the gradient-booster, and an embedding for the network — and all three are correct."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "One encoder, three consumers, no crashes in production",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A feature set has four categorical columns: `region` (5 values), `product` (400 values, long tail), `tier` (ordered: bronze < silver < gold < platinum), and `channel` (12 values, two of which appear only in the last month). It feeds a logistic regression and a gradient-boosted tree." },
        { t: "p", text: "Build the encoding layer that produces the right representation for each consumer, fits on training data only, handles values never seen in training, and proves — with a test — that a production batch containing three new products and a new channel scores without error and without a new column." }
      ],
      requirements: [
        "Per-column strategy chosen by cardinality and order, stated in code.",
        "Two outputs from one fit: a linear-ready matrix and a tree-ready matrix.",
        "Unseen values handled in every column, and the test proves it.",
        "Rare products grouped with a threshold, fit on train.",
        "Column names that survive to the model, for coefficient inspection.",
        "Tests: unseen values, column stability, no leak of test frequencies."
      ],
      hint: "The tier column is the one where the two consumers genuinely want different things: the linear model wants one-hot or a declared scale; the tree is fine with 0–3.",
      solution: {
        lang: "python",
        title: "encoding_layer.py",
        code: `import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin


TIER_ORDER = ["bronze", "silver", "gold", "platinum"]


class EncodingLayer(BaseEstimator, TransformerMixin):
    """Fit once; emit a linear-ready and a tree-ready matrix.

    region   5 values, nominal      -> one-hot (linear); codes (tree)
    product  400 values, long tail  -> rare->other, then one-hot on the
                                        kept set (linear); codes + freq
                                        (tree)
    tier     ordered                -> one-hot (linear: gaps unknown);
                                        0..3 (tree)
    channel  12 values, some new    -> one-hot with 'other' (linear);
                                        codes (tree)
    """
    def __init__(self, product_min_count=30):
        self.product_min_count = product_min_count

    # --- fit ------------------------------------------------------------
    def fit(self, X, y=None):
        X = pd.DataFrame(X)
        self.vocab_ = {}
        self.freq_ = {}
        for col in ("region", "channel"):
            self.vocab_[col] = sorted(X[col].dropna().unique().tolist())
        vc = X["product"].value_counts()
        self.vocab_["product"] = sorted(vc[vc >= self.product_min_count].index.tolist())
        self.freq_["product"] = (vc / len(X)).to_dict()
        self.rare_freq_ = float(vc[vc < self.product_min_count].sum() / len(X))
        self.vocab_["tier"] = TIER_ORDER                # declared, not learned
        # code tables for the tree matrix: vocab index; unseen -> -1
        self.codes_ = {c: {v: i for i, v in enumerate(vs)} for c, vs in self.vocab_.items()}
        # fixed column lists
        self.linear_columns_ = (
            [f"region={v}" for v in self.vocab_["region"]] + ["region=__other__"]
            + [f"product={v}" for v in self.vocab_["product"]] + ["product=__other__"]
            + [f"tier={v}" for v in TIER_ORDER] + ["tier=__other__"]
            + [f"channel={v}" for v in self.vocab_["channel"]] + ["channel=__other__"]
        )
        self.tree_columns_ = ["region_code", "product_code", "product_freq",
                              "tier_code", "channel_code"]
        return self

    # --- helpers ----------------------------------------------------------
    def _grouped(self, s, col):
        return s.where(s.isin(self.vocab_[col]), "__other__")

    def _onehot(self, s, col):
        g = self._grouped(s, col)
        out = {f"{col}={v}": (g == v).astype(int).values for v in self.vocab_[col]}
        out[f"{col}=__other__"] = (g == "__other__").astype(int).values
        return out

    # --- transforms ---------------------------------------------------------
    def transform_linear(self, X):
        X = pd.DataFrame(X)
        cols = {}
        for col in ("region", "product", "tier", "channel"):
            cols.update(self._onehot(X[col], col))
        return pd.DataFrame(cols, index=X.index)[self.linear_columns_]

    def transform_tree(self, X):
        X = pd.DataFrame(X)
        out = pd.DataFrame(index=X.index)
        for col in ("region", "product", "tier", "channel"):
            out[f"{col}_code"] = X[col].map(self.codes_[col]).fillna(-1).astype(int)
        out["product_freq"] = X["product"].map(self.freq_["product"]).fillna(self.rare_freq_)
        return out[self.tree_columns_]

    def transform(self, X):
        return self.transform_linear(X)


# =========================================================================
# WHY EACH CHOICE
# =========================================================================
#
# tier IS ORDERED, and the two consumers still want different things.
#   Tree: 0..3 is perfect -- "tier_code >= 2" is "gold or platinum".
#   Linear: 0..3 claims platinum - gold == silver - bronze. Nobody
#   knows that. One-hot lets the model learn four separate effects;
#   if they come out monotonic, the order was real and you have
#   learned the gaps too.
#
# product: 400 values. One-hot on all of them is 400 columns, ~250 of
#   which have under 30 rows -- noise. Group to ~60 + other, and the
#   linear model gets 61 columns it can estimate. The tree gets the
#   full code (it can threshold its way to any product) PLUS the
#   frequency, which is a strong feature in its own right.
#
# channel: the two new values will arrive as "other" (linear) and -1
#   (tree). Both models have seen those in training only if training
#   had an "other" -- it did not, for channel. So the -1 code is
#   genuinely novel to the tree. That is honest: the tree will route
#   it wherever -1 falls, which is "below every seen channel", and
#   the linear model's 'other' column will have a zero coefficient.
#   Neither crashes. Neither pretends to know.
#
# EVERY vocab_ AND freq_ IS FROM fit(). transform() never looks at
# its input to decide the columns.


# =========================================================================
# TESTS
# =========================================================================

def _train(n=5000, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "region": rng.choice(["n", "s", "e", "w", "c"], n),
        "product": rng.choice([f"p{i}" for i in range(400)], n,
                              p=rng.dirichlet(np.ones(400) * 0.2)),
        "tier": rng.choice(TIER_ORDER, n, p=[.5, .3, .15, .05]),
        "channel": rng.choice([f"ch{i}" for i in range(10)], n),
    })


def _production_batch():
    return pd.DataFrame({
        "region": ["n", "s", "e"],
        "product": ["p0", "p_new_1", "p_new_2"],           # two never seen
        "tier": ["gold", "platinum", "bronze"],
        "channel": ["ch0", "ch_new", "ch1"],               # one never seen
    })


def test_unseen_values_do_not_crash_and_add_no_columns():
    enc = EncodingLayer().fit(_train())
    lin = enc.transform_linear(_production_batch())
    tree = enc.transform_tree(_production_batch())
    assert list(lin.columns) == enc.linear_columns_
    assert list(tree.columns) == enc.tree_columns_
    assert lin.loc[1, "product=__other__"] == 1
    assert lin.loc[1, "channel=__other__"] == 1
    assert tree.loc[1, "product_code"] == -1
    assert tree.loc[1, "channel_code"] == -1


def test_column_stability_across_batches():
    enc = EncodingLayer().fit(_train())
    a = enc.transform_linear(_train(seed=1))
    b = enc.transform_linear(_production_batch())
    assert list(a.columns) == list(b.columns)


def test_rare_products_are_grouped():
    tr = _train()
    enc = EncodingLayer(product_min_count=30).fit(tr)
    assert len(enc.vocab_["product"]) < 100
    lin = enc.transform_linear(tr)
    assert lin["product=__other__"].sum() > 0


def test_tier_is_declared_order_for_tree_and_onehot_for_linear():
    enc = EncodingLayer().fit(_train())
    batch = pd.DataFrame({"region": ["n"], "product": ["p0"],
                          "tier": ["platinum"], "channel": ["ch0"]})
    assert enc.transform_tree(batch)["tier_code"].iloc[0] == 3
    lin = enc.transform_linear(batch)
    assert lin["tier=platinum"].iloc[0] == 1
    assert lin[[c for c in lin.columns if c.startswith("tier=")]].sum(axis=1).iloc[0] == 1


def test_frequency_comes_from_training_not_the_batch():
    tr = _train()
    enc = EncodingLayer().fit(tr)
    batch = pd.DataFrame({"region": ["n"] * 100, "product": ["p0"] * 100,
                          "tier": ["gold"] * 100, "channel": ["ch0"] * 100})
    f = enc.transform_tree(batch)["product_freq"].iloc[0]
    assert np.isclose(f, (tr["product"] == "p0").mean())    # not 1.0


def test_no_leak_from_test_into_vocab():
    tr = _train(seed=0)
    te = _train(seed=2)
    enc_train = EncodingLayer().fit(tr)
    enc_all = EncodingLayer().fit(pd.concat([tr, te]))
    assert set(enc_all.vocab_["product"]) != set(enc_train.vocab_["product"])
    # ...and the honest encoder's vocab does not depend on te at all:
    enc_again = EncodingLayer().fit(tr)
    assert enc_again.vocab_ == enc_train.vocab_


def test_every_linear_row_sums_to_one_per_column_group():
    enc = EncodingLayer().fit(_train())
    lin = enc.transform_linear(_train(seed=3))
    for col in ("region", "product", "tier", "channel"):
        group = [c for c in lin.columns if c.startswith(f"{col}=")]
        assert (lin[group].sum(axis=1) == 1).all()


def test_column_names_survive():
    enc = EncodingLayer().fit(_train())
    names = enc.transform_linear(_train()).columns
    assert "region=n" in names and "tier=gold" in names`,
        notes: [
          { t: "p", text: "**`tier` is ordered and the two consumers still want different things.** The tree gets 0–3 and can split \"gold or above\" in one threshold. The linear model gets one-hot, because 0–3 would claim the gap from gold to platinum equals the gap from bronze to silver, and nobody knows that." },
          { t: "callout", kind: "insight", title: "The unseen channel is genuinely novel, and the encoding says so", body: [
            { t: "p", text: "Training had no `\"other\"` channel, so the linear model's `channel=__other__` column has a zero coefficient and the tree's `-1` code falls below every seen channel. **Neither model crashes; neither pretends to know.** That is the correct behaviour for a value the training data contained no information about." },
            { t: "p", text: "For `product`, by contrast, training *did* have an `\"other\"` group, so a new product lands somewhere the model has learned about." }
          ]},
          { t: "p", text: "**The frequency column comes from training, and the test proves it.** A production batch of a hundred identical rows would give `p0` a frequency of 1.0 if computed on the batch; the encoder returns its training frequency, because that is what the model learned against." },
          { t: "p", text: "**Every vocabulary is learned in `fit` and never touched in `transform`.** The column list is fixed at fit time, so a batch of three rows and a batch of a million produce the same columns in the same order — the property `get_dummies` lacks." },
          { t: "p", text: "**The sum-to-one test is the one-hot invariant.** Every row is exactly one category per column group, including `\"other\"` — a row that summed to zero would be a value that fell through every branch, and a row that summed to two would be a bug in the grouping." },
          { t: "p", text: "**Column names like `tier=gold` survive to the model** so that a logistic regression's coefficients can be read. A matrix of anonymous columns is a model nobody can explain." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`OrdinalEncoder` on a `region` column gives east=0, north=1, south=2, west=3. A logistic regression is fit on it. What has it learned?",
          options: [
            "The effect of each region",
            "One coefficient for 'each step from east toward west' — a claim about the alphabet, since the order is arbitrary",
            "Nothing; the encoding is fine",
            "A separate intercept per region"
          ],
          answer: 1,
          why: "A linear model multiplies the code by a weight, so it reads the integer as a quantity. For a nominal column the integer is arbitrary and the coefficient describes the encoding, not the world. A tree would have been fine — it thresholds codes into groups. One-hot is the encoding a linear model needs here."
        }
      ]
    }
  ],

  takeaways: [
    "**Two facts decide the encoding — cardinality and order — and a third about the consumer: linear or tree.**",
    "**Linear models read codes as quantities; trees read them as labels to threshold.** Ordinal encoding a nominal column is a bug for one and free for the other.",
    "**One-hot claims no order; ordinal claims order and, for a linear model, equal gaps.** State the claim before making it.",
    "**The dummy trap**: all one-hot columns plus an intercept are collinear for OLS — `drop_first`, or use a regularised model that does not need it.",
    "**`get_dummies` has no fit step** and produces different columns on different data; `OneHotEncoder` learns the vocabulary once.",
    "**`handle_unknown=\"ignore\"` is the most important encoder argument** — the default crashes the first time production sends a new value.",
    "**Group rare labels before one-hot at more than ~15 categories**; a category with eight rows is a column of noise the model will overfit.",
    "**Rare-label grouping handles unseen values for free**: anything not in the kept set maps to `\"other\"`.",
    "**Frequency encoding claims 'how common' is the signal**, and makes two equally common categories identical.",
    "**Hashing has no fit and no vocabulary, and pays with collisions** — for very high cardinality where interpretability is not needed.",
    "**Native categorical support in tree libraries is often the best encoding** — no dimensionality, optimal partition per split — but group rare labels first.",
    "**Every encoder except hashing has a fit step; fit it on train.** Fit on all data and the test rows decide what 'rare' means.",
    "**The same column is correctly one-hot for the logistic model, codes for the booster, and an embedding for the network.**"
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `pd.get_dummies` unsuitable for a production pipeline?",
        options: [
          "It is slow",
          "It has no fit step — the columns it produces depend on the values present in whatever data it is given, so training and scoring produce different matrices",
          "It cannot handle strings",
          "It produces sparse output"
        ],
        answer: 1,
        why: "Training data with `north` and `south` yields two columns; a batch with `north` and `east` yields two different ones. `OneHotEncoder` learns the categories at fit time and emits the same columns forever, with `handle_unknown=\"ignore\"` turning a novel value into zeros rather than a crash."
      },
      {
        stem: "A product column has 400 values, 250 of them with fewer than 30 rows. What should happen before one-hot encoding?",
        options: [
          "Nothing; one-hot handles it",
          "Group the rare ones into 'other' with a threshold fit on training data — a category with eight rows is a column of noise, and the kept set also handles unseen values",
          "Use ordinal encoding instead",
          "Drop the column"
        ],
        answer: 1,
        why: "Thirty rows estimates a proportion to roughly ±15%; below that the one-hot column is fitted to noise. Grouping trades the tail's identity for stability, and any value not in the training kept set — including one never seen — maps to 'other' without a new column."
      },
      {
        stem: "A tree model and a logistic regression share an ordered `tier` column. Which encodings?",
        options: [
          "Both ordinal 0–3",
          "Tree: ordinal codes, since a threshold is 'gold or above'; linear: one-hot, since 0–3 would claim the gaps between tiers are equal",
          "Both one-hot",
          "Frequency encoding for both"
        ],
        answer: 1,
        why: "The tree only needs the order to be reachable by thresholds. The linear model multiplies the code by one weight, which asserts platinum − gold equals silver − bronze. One-hot lets it learn four separate effects; if they come out monotonic, the order was real and the gaps are now known too."
      },
      {
        stem: "A frequency-encoded product column is computed on the full dataset before splitting. What is wrong?",
        options: [
          "Nothing; frequency is not the target",
          "The test rows' counts are in the training feature — a leak; and the threshold for 'rare' was decided with test rows, so categories are one-hot in training that would be 'other' in production",
          "Frequencies must be integers",
          "The column will have NaN"
        ],
        answer: 1,
        why: "Every encoder with a fit step learns from whatever it sees. On one-hot the leak is a few columns; on frequency it is every value; on target encoding it is the target itself. Fit on train, transform both, and let a Pipeline enforce it."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you choose an encoding for a categorical column?",
        strong: "From three facts: cardinality, whether the categories have an order, and whether the model is linear or a tree. Low cardinality and nominal — one-hot, dropping one for unregularised OLS. Ordered — codes for a tree; one-hot or codes for a linear model depending on whether the gaps are plausible. High cardinality — group the rare labels first, then one-hot the survivors for a linear model, or codes and frequency for a tree, or target encoding done out-of-fold. Every encoder is fit on training data and has a rule for unseen values.",
        answer: [
          { t: "p", text: "The linear-versus-tree split is the part interviewers listen for; most candidates give one answer for both." }
        ]
      },
      {
        level: "advanced",
        q: "Why is ordinal encoding fine for a tree and wrong for a linear model on the same nominal column?",
        strong: "A tree splits on thresholds — `code <= 1.5` — and can reach any partition of the categories with enough splits, so the integer assignment is just a labelling. A linear model multiplies the code by one weight, which asserts that the categories lie on a line at equal spacing. For a nominal column that spacing is alphabetical, and the coefficient is a number about the encoding rather than the data.",
        answer: [
          { t: "p", text: "The phrase \"a number about the encoding\" makes the failure concrete." }
        ]
      },
      {
        level: "advanced",
        q: "Production sends a category value the model never saw. What should happen?",
        strong: "Not a crash, and not a silent lie. The encoder maps it to a known state — an 'other' column for one-hot, a −1 code for a tree, the pooled rare frequency for frequency encoding — that the model either trained on or can at least route consistently. If training had no 'other' group for that column, the model has no information about the value, and the encoding should reflect that honestly rather than quietly mapping it to whatever category sorts first.",
        answer: [
          { t: "p", text: "Distinguishing \"the model has seen 'other'\" from \"the model has no information\" shows you have thought past not-crashing." }
        ]
      }
    ]
  }
});
