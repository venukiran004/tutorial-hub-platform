/* ============================================================================
   LESSON 1.6 — PCA, Derived Rather Than Recited
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "PCA is usually taught as a recipe: centre, take the covariance, take the eigenvectors, keep the top few. **Every step in that recipe is forced by one question** — which direction has the most variance? — and once you have asked it properly, the recipe writes itself and its failure modes become obvious rather than mysterious.",

  objectives: [
    "Derive PCA from the maximise-variance question",
    "Explain why centring is mandatory and scaling is a judgement",
    "Read explained variance without over-trusting it",
    "Say what a principal component is and is not",
    "Recognise the situations where PCA is the wrong tool"
  ],

  prerequisites: ["1.4", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "The question PCA answers", id: "question" },

    { t: "p", text: "**PCA asks one question: which direction does the data spread along most?** Then it asks the same question again about what is left, and repeats. The answers are the eigenvectors of the covariance matrix, which is why lesson 1.4 was the prerequisite." },

    { t: "dl", items: [
      ["Principal component", "A direction in the original feature space, written as a weighted combination of the original variables."],
      ["Loading", "One variable's weight within a component. Reading the loadings is how you interpret what a component represents."],
      ["Score", "An observation's coordinate along a component — the transformed data."],
      ["Explained variance ratio", "The fraction of total variance a component accounts for. They sum to 1 across all components."],
      ["PCA", "Principal component analysis — rotating the data onto the orthogonal directions of greatest variance, which are the eigenvectors of its covariance matrix."],
      ["Covariance matrix", "`Σ`, holding every pairwise covariance with variances on the diagonal. PCA is its eigendecomposition, and nothing more."],
      ["Scree plot", "Explained variance against component number. The \"elbow\" where it flattens is the usual, and entirely informal, way of choosing how many components to keep."]
    ]},

    { t: "p", text: "Components are **orthogonal by construction**, so each captures variation the previous ones missed. That is a property of the method, not of the data, and it is the reason PCA components are not the same thing as interpretable factors." },

    { t: "viz",
      title: "Which direction carries the most spread?",
      caption: "Project the cloud onto a direction and measure the variance of the projections. PCA is the answer to \"which direction maximises that?\" — and then the same question again, restricted to what is left.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="A correlated point cloud with the two principal component directions drawn on it">
  <g style="fill:var(--ink-3);opacity:.55">
    <circle cx="180" cy="196" r="3"/><circle cx="214" cy="178" r="3"/><circle cx="240" cy="170" r="3"/>
    <circle cx="262" cy="152" r="3"/><circle cx="288" cy="146" r="3"/><circle cx="196" cy="204" r="3"/>
    <circle cx="230" cy="192" r="3"/><circle cx="256" cy="166" r="3"/><circle cx="300" cy="134" r="3"/>
    <circle cx="164" cy="212" r="3"/><circle cx="276" cy="158" r="3"/><circle cx="208" cy="190" r="3"/>
    <circle cx="318" cy="128" r="3"/><circle cx="148" cy="218" r="3"/><circle cx="332" cy="120" r="3"/>
    <circle cx="246" cy="184" r="3"/><circle cx="284" cy="160" r="3"/><circle cx="172" cy="188" r="3"/>
  </g>

  <line x1="120" y1="236" x2="360" y2="104" style="stroke:var(--t-green)" stroke-width="2.5" fill="none" marker-end="url(#p1)"/>
  <text x="368" y="100" class="s-sub" style="fill:var(--t-green)">PC1 — most variance</text>

  <line x1="212" y1="132" x2="268" y2="208" style="stroke:var(--t-violet)" stroke-width="2.5" fill="none" marker-end="url(#p2)"/>
  <text x="276" y="222" class="s-sub" style="fill:var(--t-violet)">PC2 — orthogonal, what is left</text>

  <g class="s-sub">
    <text x="500" y="66" class="s-label">THE PROBLEM</text>
    <text x="500" y="94">maximise Var(Xu) over unit vectors u</text>
    <text x="500" y="126" class="s-label">SUBSTITUTE</text>
    <text x="500" y="154">Var(Xu) = uᵀ C u,  with C the covariance</text>
    <text x="500" y="186" class="s-label" style="fill:var(--accent)">THE ANSWER</text>
    <text x="500" y="214" style="fill:var(--accent)">u = the top eigenvector of C</text>
    <text x="500" y="238" style="fill:var(--ink-3)">and the variance you get is its eigenvalue</text>
  </g>
  <defs>
    <marker id="p1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-green)"/></marker>
    <marker id="p2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-violet)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the derivation, in four steps", code: `
import numpy as np

# STEP 1 -- STATE THE QUESTION.
# Project the data onto a unit direction u. The projections are X @ u.
# We want the u that makes their variance largest.

# STEP 2 -- WRITE THE VARIANCE IN TERMS OF u.
# For CENTRED X, the variance of the projections is
#
#     Var(Xu) = (1/(n-1)) * (Xu).T @ (Xu)
#             = u.T @ [ (1/(n-1)) X.T X ] @ u
#             = u.T @ C @ u                    with C the covariance
#
# So the question is now purely about the matrix C.

# STEP 3 -- MAXIMISE, SUBJECT TO ||u|| = 1.
# The constraint matters: without it you just make u longer forever.
# The Lagrangian is  u.T C u - lambda (u.T u - 1), and setting the
# derivative to zero gives
#
#     2 C u - 2 lambda u = 0    ->    C u = lambda u
#
# THAT IS THE EIGENVECTOR EQUATION. It was not assumed; it fell out of
# asking for maximum variance under a length constraint.

# STEP 4 -- WHICH EIGENVECTOR?
# Substituting back:  u.T C u = u.T (lambda u) = lambda.
# The variance you achieve IS the eigenvalue, so the largest eigenvalue
# wins. PC2 is the same question restricted to directions orthogonal to
# PC1, which gives the second eigenvector, and so on.
`,
      hl: [11, 21, 27],
      caption: "**The eigenvector equation is the answer, not the premise.** PCA is not \"an algorithm that uses eigenvectors\" — it is a maximisation whose solution happens to be an eigenproblem."
    },

    { t: "code", lang: "python", title: "PCA in eight lines, and checked against sklearn", code: `
rng = np.random.default_rng(0)
x = rng.normal(size=500)
X = np.column_stack([x, 0.9 * x + 0.4 * rng.normal(size=500),
                     rng.normal(size=500) * 0.3])

def pca(X, k):
    Xc = X - X.mean(axis=0)                      # 1. centre
    C = np.cov(Xc, rowvar=False)                 # 2. covariance
    vals, vecs = np.linalg.eigh(C)               # 3. eigh: C is symmetric
    order = np.argsort(vals)[::-1]               # 4. eigh sorts ASCENDING
    vals, vecs = vals[order], vecs[:, order]
    return Xc @ vecs[:, :k], vals, vecs[:, :k]

scores, vals, comps = pca(X, 2)
(vals / vals.sum()).round(4)          # [0.8489, 0.1116, 0.0395]

# The same thing via SVD, which is what libraries actually do -- no
# covariance matrix is formed, so the condition number is not squared.
Xc = X - X.mean(axis=0)
U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
(s**2 / (len(X) - 1)).round(4)        # identical to vals
np.allclose(np.abs(Vt[:2]), np.abs(comps.T))     # True, up to sign
`,
      hl: [10, 18],
      caption: "**`eigh` sorts ascending, which is the opposite of what PCA needs.** Forgetting the reversal gives you the *least* important directions with no error anywhere — a silent bug that produces plausible-looking output."
    },

    { t: "h2", n: "02", text: "Centring is mandatory; scaling is a decision", id: "preprocessing" },

    { t: "p", text: "PCA operates on variance, which makes it sensitive to how the data is prepared. **Centring is not optional** — without it the first component points at the mean rather than at the spread. **Scaling is a genuine decision** with no default right answer." },

    { t: "dl", items: [
      ["Centring", "Subtracting each variable's mean. Mandatory: uncentred PCA finds the direction of the data's centre of mass, not its variation."],
      ["Scaling", "Dividing by each variable's standard deviation. It makes variables comparable and discards genuine differences in importance."],
      ["When to scale", "When variables use different units — an income in pounds would otherwise dominate an age in years purely by magnitude."],
      ["When not to scale", "When variables share units and their relative spread is meaningful, such as pixel intensities or repeated measurements of one quantity."],
      ["Whitening", "Dividing each component by the square root of its eigenvalue, so every direction has unit variance. It removes correlation and scale at once — and amplifies the smallest, noisiest components, which is the cost."]
    ]},

    { t: "ladder",
      title: "Preparing data for PCA",
      rungs: [
        { level: "bad", label: "Neither centre nor scale",
          why: "Without centring, `XᵀX` measures distance from the origin rather than spread about the mean, so the first component points at the data's centroid. If the mean is large the first component is simply \"where the data is\", carrying no information about variation at all.",
          code: `X = np.array([[100.1, 50.2], [100.3, 50.1], [99.8, 49.9]])
U, s, Vt = np.linalg.svd(X, full_matrices=False)
Vt[0].round(3)          # [0.894, 0.448] -- points at the MEAN

Xc = X - X.mean(axis=0)
np.linalg.svd(Xc, full_matrices=False)[2][0].round(3)
#                        [0.788, -0.616] -- the actual spread` },
        { level: "ok", label: "Always standardise",
          why: "Scaling every feature to unit variance removes the unit problem, which is usually right. But it is a claim — that every feature deserves equal weight — and it is wrong when the variances are genuinely comparable and meaningful.",
          code: `Xs = (X - X.mean(0)) / X.std(0)
# Safe default. Also destroys real information when the scales were
# already commensurate -- pixel intensities, say, or log returns.` },
        { level: "best", label: "Centre always; scale when the units differ",
          why: "Centring is required by the mathematics — the derivation assumed it. Scaling answers a modelling question: do these features share a unit? If they do not, the largest-unit feature will dominate every component for no reason but its unit.",
          code: `# Units differ -> STANDARDISE. Salary in pounds has a variance
# millions of times larger than age in years, so without scaling PC1 is
# "salary" and nothing else:
raw = np.column_stack([rng.normal(45, 12, 500),          # age
                       rng.normal(52000, 18000, 500)])   # salary
_, v_raw, c_raw = pca(raw, 1)
np.abs(c_raw[:, 0]).round(3)          # [0.001, 1.   ] -- salary only

std = (raw - raw.mean(0)) / raw.std(0)
_, v_std, c_std = pca(std, 1)
np.abs(c_std[:, 0]).round(3)          # [0.707, 0.707] -- both counted

# Units the same -> DO NOT SCALE. Standardising 784 pixel intensities
# amplifies the near-constant border pixels, which are pure noise, to
# the same weight as the informative centre.`,
          note: "**Scaling is not a cleanup step; it is a statement that a standard deviation means the same thing in every column.** Decide it deliberately." }
      ]
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**PCA finds the axes of the ellipsoid the data cloud forms.** The eigenvectors are the axis directions, the eigenvalues are how far the cloud extends along each, and keeping the top few means keeping the long axes and flattening the short ones." },
      { t: "p", text: "That is why it is a rotation followed by a truncation, and why the components are orthogonal — an ellipsoid's axes are perpendicular by construction. It is also why PCA cannot find structure that is not an elongation: a spiral has no long axis, so PCA has nothing to grip." }
    ]},

    { t: "h2", n: "03", text: "What a component is not", id: "not" },

    { t: "p", text: "PCA is routinely misused because two plausible-sounding beliefs about it are false: that the top components carry the useful signal, and that components mean something. **PCA maximises variance, and variance is not relevance.**" },

    { t: "dl", items: [
      ["Not feature selection", "Every component uses every original variable. Nothing is discarded, only recombined."],
      ["Not supervised", "PCA never sees the target. A direction of small variance can carry all the predictive signal, and PCA will drop it first."],
      ["Not interpretable by default", "A component is a weighted mixture. It has a meaning only if the loadings happen to admit one."],
      ["Not scale-invariant", "Change the units of one variable and the components change. This is a property of the method, not a bug."]
    ]},

    { t: "table",
      head: ["Belief", "Reality"],
      rows: [
        ["Components are interpretable features", "**A mixture of all originals.** \"0.3×age + 0.5×income − 0.2×tenure\" is rarely a concept"],
        ["High variance means predictive", "**Variance is not relevance.** The target may live in a discarded direction"],
        ["Components are independent", "They are **uncorrelated**, which is weaker unless the data is Gaussian"],
        ["The signs are meaningful", "**Arbitrary.** `v` and `−v` are the same component"],
        ["PCA removes noise", "Only if the noise is low-variance. Loud noise becomes PC1"],
        ["More components is always safer", "Keeping all of them is a rotation and nothing else"]
      ],
      caption: "**The second row is the expensive one.** PCA is unsupervised — it has never seen your labels, so it optimises spread rather than usefulness, and the two coincide only by luck."
    },

    { t: "code", lang: "python", title: "when the signal is in the small component", code: `
# Two features: one loud and irrelevant, one quiet and decisive.
n = 1000
noise  = rng.normal(0, 10.0, n)                  # big variance, no signal
signal = rng.normal(0,  0.5, n)                  # small variance, IS the label
y = (signal > 0).astype(int)

X = np.column_stack([noise, signal])
_, vals, comps = pca(X, 2)

(vals / vals.sum()).round(4)      # [0.9975, 0.0025]

# PC1 holds 99.75% of the variance -- and it is the pure noise column.
np.abs(comps[:, 0]).round(3)      # [1., 0.]

# Reduce to one component "keeping 99.75% of the information" and you
# have thrown away the only thing that predicts y:
Xc = X - X.mean(0)
pc1 = Xc @ comps[:, 0]
np.corrcoef(pc1, y)[0, 1].round(3)        # ~0.00  -- useless
np.corrcoef(Xc @ comps[:, 1], y)[0, 1].round(3)   # ~0.79 -- the answer

# THE LESSON: "explained variance" is explained VARIANCE, not explained
# TARGET. If you need a supervised reduction, use one -- LDA, or feature
# selection against the label, or partial least squares.
`,
      hl: [10, 17, 21],
      caption: "**A 99.75% explained-variance ratio here would be reported as a triumph.** It measures how well the components reconstruct `X`, which is a question nobody asked when the goal was predicting `y`."
    },

    { t: "callout", kind: "trap", title: "Fit on train only — the leak is easy to miss", body: [
      { t: "code", lang: "python", title: "the subtle version of a familiar mistake", numbered: false, code: `
# WRONG. The components -- and the mean used for centring -- are computed
# from the test rows as well, so information crosses the split before any
# model is fitted.
X_all = np.vstack([X_train, X_test])
Xc = X_all - X_all.mean(0)
comps = pca(Xc, k=10)[2]
train_r, test_r = (X_train - X_all.mean(0)) @ comps, (X_test - X_all.mean(0)) @ comps

# RIGHT. Fit the transform on train, APPLY it to test.
mu = X_train.mean(0)
comps = pca(X_train - mu, k=10)[2]
train_r = (X_train - mu) @ comps
test_r  = (X_test  - mu) @ comps        # train's mean, train's components

# In sklearn this is the difference between fit_transform and transform,
# and putting PCA inside a Pipeline makes it structurally impossible to
# get wrong under cross-validation:
#
#   Pipeline([("scale", StandardScaler()),
#             ("pca", PCA(n_components=10)),
#             ("clf", LogisticRegression())])
#
# The leak here is mild -- usually a fraction of a point of optimism --
# which is exactly why it survives review. It is also cumulative with
# every other leaky step in the pipeline.`},
      { t: "p", text: "**Both the mean and the components are learned parameters.** Centring test data by its own mean is as much a leak as fitting the rotation on it, and it is the half people forget." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Review a PCA that made a model worse",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A team added PCA to a fraud model to cut training time. Accuracy fell from 0.94 to 0.87 and nobody can say why — the components explain 98% of the variance." },
        { t: "code", lang: "python", numbered: false, title: "preprocess.py", code: `
from sklearn.decomposition import PCA

# features: transaction_amount (0-50000), account_age_days (0-4000),
#           num_prior_disputes (0-8), hour_of_day (0-23),
#           is_new_device (0/1), country_risk_score (0-1)

pca = PCA(n_components=3)
X_all = np.vstack([X_train, X_test])
X_reduced = pca.fit_transform(X_all)

X_train_r = X_reduced[:len(X_train)]
X_test_r  = X_reduced[len(X_train):]

print(pca.explained_variance_ratio_.sum())     # 0.98`},
        { t: "p", text: "There are four distinct problems. Find them, say which one causes the accuracy drop, and give the corrected pipeline." }
      ],
      requirements: [
        "List all four problems.",
        "Identify which single one explains the accuracy drop and why.",
        "Explain what the 98% figure is actually measuring here.",
        "Say why the leak makes the reported 0.87 optimistic rather than pessimistic.",
        "Give the corrected pipeline.",
        "Say whether PCA is the right tool for the stated goal."
      ],
      hint: "Look at the ranges of the six features before anything else.",
      solution: {
        lang: "python",
        title: "preprocess.py",
        code: `# =========================================================================
# THE FOUR PROBLEMS
# =========================================================================
#
# 1. NO SCALING -- and this is the one that causes the accuracy drop.
#
#    The features have wildly different units:
#
#      transaction_amount   0 - 50,000     variance ~ 10^7
#      account_age_days     0 -  4,000     variance ~ 10^6
#      num_prior_disputes   0 -      8     variance ~ 1
#      hour_of_day          0 -     23     variance ~ 50
#      is_new_device        0 -      1     variance ~ 0.25
#      country_risk_score   0 -      1     variance ~ 0.08
#
#    PCA maximises variance, and variance is in SQUARED UNITS. So
#    transaction_amount has roughly 10^8 times the variance of
#    country_risk_score -- purely because it is denominated in pounds
#    rather than a 0-1 score.
#
#    PC1 will be transaction_amount, PC2 will be account_age_days, PC3
#    will be a rounding error on those two. The four remaining features
#    are annihilated.
#
#    And those four are the fraud signal. num_prior_disputes,
#    is_new_device and country_risk_score are precisely the columns a
#    fraud model needs, and they have the smallest numeric ranges, so
#    unscaled PCA deletes them for having small units.
#
#    THAT IS THE ACCURACY DROP. 0.94 -> 0.87 is the model losing its
#    binary and small-scale features.
#
# 2. FIT ON TRAIN AND TEST TOGETHER.
#
#      X_all = np.vstack([X_train, X_test])
#      pca.fit_transform(X_all)
#
#    Both the mean used for centring and the components themselves are
#    learned from the test rows. Test information reaches the training
#    representation before any model is fitted.
#
# 3. n_components=3 CHOSEN, NOT MEASURED.
#
#    Three is a number someone typed. With six features and no scaling,
#    the effective dimensionality was never examined, and the 98% figure
#    was read AFTER the fact as justification rather than used to decide.
#
# 4. PCA APPLIED TO A MIXED FEATURE SET AT ALL.
#
#    is_new_device is BINARY. "Variance along a direction" is not a
#    meaningful thing to maximise across a mixture of a binary flag, a
#    bounded score, an hour-of-day cyclical, and two unbounded
#    continuous amounts. hour_of_day is particularly bad: 23 and 0 are
#    adjacent in reality and maximally distant numerically, so any
#    linear method mishandles it before PCA is even reached.
#
#
# =========================================================================
# WHAT THE 98% IS MEASURING
# =========================================================================
#
# explained_variance_ratio_ is the share of the total variance of X that
# the components reconstruct. With no scaling, "total variance of X" is
# dominated by transaction_amount's 10^7.
#
# So 98% means: "three components reconstruct 98% of a quantity that is
# essentially the variance of transaction_amount and account_age_days."
#
# It is a true statement about X and an irrelevant one about fraud. PCA
# never saw the labels. It optimised spread; the team needed signal, and
# the two coincided only for the features that happened to be large.
#
# The figure would have been ~98% even if the four discarded features
# had been the ONLY predictive ones -- which, roughly, they were.
#
#
# =========================================================================
# WHY THE LEAK MAKES 0.87 OPTIMISTIC
# =========================================================================
#
# Counter-intuitive but important: the leak in problem 2 INFLATES the
# reported score. The components were fitted using test rows, so the
# test representation is better aligned to the test data than a genuine
# holdout would be.
#
# So the true out-of-sample performance is somewhat WORSE than 0.87. The
# situation is slightly worse than it appears, not better -- and fixing
# the leak alone will make the number go DOWN, which is the correct
# direction and needs explaining before it alarms anyone.
#
#
# =========================================================================
# THE CORRECTED PIPELINE
# =========================================================================

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

CONTINUOUS = ["transaction_amount", "account_age_days", "num_prior_disputes"]
CYCLICAL   = ["hour_of_day"]
PASSTHRU   = ["is_new_device", "country_risk_score"]

# Reduce only what it makes sense to reduce. A binary flag and a bounded
# risk score go to the model untouched -- rotating them into a mixture
# destroys the meaning that made them useful.
prep = ColumnTransformer([
    ("cont", Pipeline([("scale", StandardScaler()),
                       ("pca", PCA(n_components=2))]), CONTINUOUS),
    ("cyc",  CyclicalEncoder(period=24), CYCLICAL),      # -> sin, cos
    ("pass", "passthrough", PASSTHRU),
])

model = Pipeline([("prep", prep), ("clf", LogisticRegression())])

# Everything is fitted inside the cross-validation split, so the leak is
# structurally impossible rather than avoided by discipline.
scores = cross_val_score(model, X_train, y_train, cv=5, scoring="roc_auc")


# =========================================================================
# IS PCA THE RIGHT TOOL FOR "CUT TRAINING TIME"?
# =========================================================================
#
# Almost certainly not. Six features is not a dimensionality problem.
# Training time on six columns is dominated by the number of ROWS and
# the solver, not the six columns -- so the reduction cannot deliver the
# stated goal even when done correctly.
#
# Reducing 6 -> 3 saves nothing measurable and costs interpretability:
# a fraud model whose inputs are three anonymous rotations cannot be
# explained to a fraud analyst or a regulator, which for this domain is
# usually a hard requirement.
#
# If training time is genuinely the problem, the levers are row
# sampling, a cheaper solver, or fewer boosting rounds. If
# dimensionality were the problem -- thousands of correlated columns --
# PCA would be reasonable, and even then a supervised method (feature
# selection against the label, or partial least squares) usually beats
# it, because those methods optimise for the target rather than for
# spread.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_unscaled_pca_is_dominated_by_the_largest_unit():
    """Problem 1, demonstrated rather than asserted."""
    rng = np.random.default_rng(0)
    X = np.column_stack([rng.normal(25000, 12000, 500),   # amount
                         rng.integers(0, 2, 500)])        # binary flag

    comps = PCA(n_components=1).fit(X).components_[0]

    assert abs(comps[0]) > 0.999          # amount is the whole component
    assert abs(comps[1]) < 0.001          # the flag contributes nothing


def test_scaling_restores_the_small_feature():
    rng = np.random.default_rng(0)
    X = np.column_stack([rng.normal(25000, 12000, 500),
                         rng.integers(0, 2, 500)])
    Xs = StandardScaler().fit_transform(X)

    comps = PCA(n_components=1).fit(Xs).components_[0]

    assert abs(comps[1]) > 0.1            # the flag now counts


def test_explained_variance_does_not_predict_accuracy():
    """The core misunderstanding: high explained variance with the signal
    in the discarded component."""
    rng = np.random.default_rng(0)
    loud = rng.normal(0, 10.0, 1000)
    quiet = rng.normal(0, 0.5, 1000)
    y = (quiet > 0).astype(int)
    X = np.column_stack([loud, quiet])

    p = PCA(n_components=1).fit(X)

    assert p.explained_variance_ratio_[0] > 0.99          # looks superb
    assert abs(np.corrcoef(p.transform(X)[:, 0], y)[0, 1]) < 0.1   # useless


def test_pca_is_fitted_on_training_data_only():
    """Problem 2. Fitting inside a Pipeline makes the leak impossible."""
    model = Pipeline([("scale", StandardScaler()),
                      ("pca", PCA(n_components=2)),
                      ("clf", LogisticRegression())])
    model.fit(X_train, y_train)

    # The mean is train's mean, not the pooled mean.
    np.testing.assert_allclose(model["scale"].mean_, X_train.mean(axis=0))`,
        notes: [
          { t: "p", text: "**No scaling is what costs the accuracy.** Variance is in squared units, so `transaction_amount` has roughly 10⁸ times the variance of `country_risk_score` purely by denomination — and the three components become amount, account age, and rounding error." },
          { t: "p", text: "**The annihilated features are the fraud signal.** `num_prior_disputes`, `is_new_device` and `country_risk_score` are exactly what a fraud model needs, and they have the smallest numeric ranges, so unscaled PCA deletes them for having small units." },
          { t: "callout", kind: "insight", title: "98% explained variance is a true and irrelevant statement", body: [
            { t: "p", text: "It measures how well three components reconstruct `X`, and with no scaling `X`'s variance is essentially `transaction_amount`'s. The figure would have been about 98% even if the discarded features had been the only predictive ones — which, roughly, they were." },
            { t: "p", text: "PCA never saw the labels. It optimised spread; the team needed signal, and the two coincided only for the features that happened to be large." }
          ]},
          { t: "p", text: "**The leak makes 0.87 optimistic, not pessimistic.** Components fitted using test rows align the test representation better than a genuine holdout would, so true performance is worse — and fixing the leak alone will push the number down, which needs explaining before it alarms anyone." },
          { t: "p", text: "**Do not rotate a binary flag into a mixture.** `is_new_device` and `country_risk_score` are meaningful as they stand; passing them through untouched preserves the interpretability a fraud analyst or regulator needs." },
          { t: "p", text: "**PCA cannot deliver the stated goal.** Training time on six columns is dominated by rows and solver, not columns, so reducing 6 → 3 saves nothing measurable while costing explainability. Row sampling or a cheaper solver are the actual levers." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team ran PCA on 784-dimensional image data and standardised every pixel to unit variance first, because standardising is good practice." },
      { t: "p", text: "**The components came back dominated by the image borders.** Border pixels are nearly always zero, so their variance is tiny — and dividing by a tiny standard deviation amplified pure sensor noise to the same weight as the informative centre of the image." },
      { t: "p", text: "**Removing the scaling fixed it.** Pixel intensities already share a unit and a range, so there was no unit problem to solve; standardising invented one." },
      { t: "p", text: "**Scaling is a claim that a standard deviation means the same thing in every column.** For mixed units that claim is right and necessary; for commensurate features it is false and destructive." }
    ]}
  ],

  takeaways: [
    "**PCA is the answer to \"which direction has the most variance?\"** — the eigenvector equation falls out of maximising `uᵀCu` subject to `‖u‖ = 1`.",
    "**The variance achieved along a component is its eigenvalue**, which is why explained-variance ratio is just `λ / Σλ`.",
    "**PCA finds the axes of the ellipsoid the data forms** — a rotation followed by a truncation.",
    "**Centring is mandatory.** Without it the first component points at the centroid rather than at the spread.",
    "**Scaling is a modelling decision, not a cleanup step** — it claims a standard deviation means the same in every column.",
    "**Mixed units require standardising**, or the largest-unit feature becomes PC1 for no reason but its unit.",
    "**Commensurate features should not be standardised** — it amplifies near-constant, noisy columns to full weight.",
    "**Variance is not relevance.** PCA is unsupervised and can discard exactly the direction that predicts your target.",
    "**Components are mixtures of every original feature**, so they are rarely interpretable and rarely explainable to a regulator.",
    "**Components are uncorrelated, not independent** — the stronger claim only holds for Gaussian data.",
    "**Signs and near-tied component orders are arbitrary.** Anything reading meaning from them is reading noise.",
    "**Fit on train, apply to test** — both the mean and the components are learned parameters, and a Pipeline makes the leak structurally impossible."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does the eigenvector equation appear in PCA?",
        options: [
          "It is a computational shortcut chosen for speed",
          "Maximising `uᵀCu` subject to `‖u‖ = 1` yields `Cu = λu` — the equation is the solution, not an assumption",
          "Because covariance matrices are always diagonalisable",
          "It is required to make the components orthogonal"
        ],
        answer: 1,
        why: "Setting the derivative of the Lagrangian to zero gives exactly the eigenvector equation, and substituting back shows the variance achieved equals the eigenvalue — so the largest eigenvalue wins. PCA is a maximisation whose solution happens to be an eigenproblem."
      },
      {
        stem: "Features are transaction amount (0–50,000) and a binary flag. PCA without scaling gives what?",
        options: [
          "Components weighting both features equally",
          "PC1 is essentially the amount alone, because variance is in squared units and the amount's variance is around 10⁸ times larger",
          "An error, because the scales are incompatible",
          "The binary flag dominates as it is bounded"
        ],
        answer: 1,
        why: "PCA maximises variance, and variance carries the square of the unit. The flag is annihilated for being denominated in 0/1 rather than pounds — which is fatal when small-scale features carry the signal, as binary risk flags usually do."
      },
      {
        stem: "A model's PCA explains 98% of variance yet accuracy dropped. How is that possible?",
        options: [
          "The explained variance was computed incorrectly",
          "PCA is unsupervised — it maximises spread in `X` and never saw the labels, so the predictive direction can sit in the 2% that was discarded",
          "98% is too low a threshold",
          "The components need rotating to be useful"
        ],
        answer: 1,
        why: "Explained variance measures reconstruction of `X`, not prediction of `y`. A loud irrelevant feature can hold 99% of the variance while the quiet decisive one is discarded. When the goal is prediction, use a supervised reduction — LDA, feature selection against the label, or partial least squares."
      },
      {
        stem: "Why should PCA not be fitted on the combined train and test sets?",
        options: [
          "It is slower on the larger matrix",
          "Both the centring mean and the components become learned parameters informed by test rows, which leaks information and makes the reported score optimistic",
          "The components would be unstable",
          "Test data may have a different number of features"
        ],
        answer: 1,
        why: "The mean is the half people forget — centring test data by a pooled mean is as much a leak as fitting the rotation on it. Fixing it makes the reported number go *down*, which is the correct direction. Putting PCA inside a Pipeline makes the mistake structurally impossible under cross-validation."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Derive PCA.",
        strong: "Ask which unit direction maximises the variance of the projections. For centred data that variance is `uᵀCu`, and maximising it subject to unit length gives `Cu = λu` — so the components are the eigenvectors of the covariance and the variance achieved is the eigenvalue.",
        answer: [
          { t: "p", text: "Presenting the eigenproblem as the *conclusion* rather than the method is what distinguishes deriving from reciting." },
          { t: "p", text: "The unit-length constraint is worth naming explicitly — without it the maximisation is unbounded, and it is where the Lagrange multiplier comes from." },
          { t: "p", text: "Adding that libraries use SVD on the centred data rather than forming the covariance shows you know why: squaring the matrix squares the condition number." }
        ]
      },
      {
        level: "core",
        q: "When should you standardise before PCA, and when not?",
        strong: "Standardise when the features have different units, or the largest-unit feature becomes PC1 by denomination alone. Do not standardise when they already share a unit — it amplifies near-constant, noisy columns to full weight.",
        answer: [
          { t: "p", text: "Framing scaling as a claim rather than a cleanup step is the point: it asserts a standard deviation means the same in every column." },
          { t: "p", text: "The image-border example makes the second half concrete, and it is a mistake people have usually made rather than heard about." },
          { t: "p", text: "Centring is separate and non-negotiable, so it is worth distinguishing the two rather than treating preprocessing as one step." }
        ]
      },
      {
        level: "advanced",
        q: "PCA kept 98% of the variance and the model got worse. What happened?",
        strong: "Explained variance measures reconstruction of the inputs, not prediction of the target. PCA is unsupervised, so the discriminative direction can be a low-variance one that got discarded.",
        answer: [
          { t: "p", text: "Naming the fix — a supervised reduction such as LDA or PLS, or selection against the label — turns the diagnosis into a recommendation." },
          { t: "p", text: "The scaling angle is worth raising too, since unscaled PCA producing a high variance ratio dominated by one large-unit column is the commonest version of this story." },
          { t: "p", text: "Questioning whether dimensionality reduction was needed at all is a good closing move when the feature count is small." }
        ]
      }
    ]
  }
});
