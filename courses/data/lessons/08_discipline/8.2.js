/* ============================================================================
   LESSON 8.2 — Dimensionality Reduction
   ========================================================================= */
EC.receiveLesson({
  id: "8.2",

  lede: "**PCA keeps the directions with the most variance, and the target has no say in which those are.** A column measured in pounds outvotes one measured in years by a factor of a million before any pattern is considered; a quiet column that alone predicts the label is the first thing a 95 % variance rule throws away. Reduction is a tool for correlated columns and for cost — and it earns its place only when a cross-validated score says the model did not need what it removed.",

  objectives: [
    "State what PCA computes — centring, rotation, truncation — and read loadings and explained variance correctly",
    "Show why scaling decides the answer and why variance is not signal",
    "Choose the number of components by downstream score or parallel analysis rather than a variance threshold",
    "Fit reduction inside the pipeline and know what interpretability it costs",
    "Use t-SNE and UMAP for looking and never for features"
  ],

  prerequisites: ["2.3", "8.1"],

  blocks: [

    { t: "h2", n: "01", text: "What PCA computes", id: "compute" },

    { t: "p", text: "Principal component analysis centres the columns, finds the orthogonal directions along which the data varies most, and expresses every row in those directions instead of the original ones. **Nothing is lost until you truncate**: with all *p* components kept it is a rotation. Reduction is the decision to keep the first *k* and discard the rest — and the ordering is by variance, only by variance." },

    { t: "dl", items: [
      ["Principal component", "A unit-length direction in feature space. The first is the direction of maximum variance; each next one is the direction of maximum remaining variance, orthogonal to all before it. Together they are the eigenvectors of the covariance matrix, and the right singular vectors of the centred data."],
      ["Loading", "The weight each original column contributes to a component. A component is a mixture of columns; its loadings say which ones, with what sign."],
      ["Explained variance", "The variance of the data along one component — the eigenvalue. The ratio is that eigenvalue divided by the total. It measures spread, not usefulness."],
      ["Score", "A row's coordinate along a component: the centred row dotted with the loading vector. The scores are the new features."],
      ["Reconstruction error", "The squared distance between a row and its projection onto the kept components — the sum of the discarded eigenvalues, on average. What truncation costs in variance."],
      ["Whitening", "Dividing each score by the square root of its eigenvalue so every kept component has unit variance. Some algorithms need it; it inflates the noisiest components by the most."],
      ["Parallel analysis", "Compare each eigenvalue with the eigenvalues of data whose columns were independently shuffled. A component is only worth counting if it beats what chance correlation produces."]
    ]},

    { t: "viz",
      title: "A rotation, then a truncation",
      caption: "Centred data, rotated so the first axis points along the longest spread. Keeping PC1 alone keeps 96 % of the variance — and every row's PC2 coordinate is gone, whatever it predicted.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="Left: a scatter cloud with the two principal directions drawn through its centre. Right: the same points projected onto the first component alone, with the discarded second component noted.">
  <defs>
    <marker id="pca-ah-82" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--acc)"/>
    </marker>
    <marker id="pca-ah2-82" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--warn)"/>
    </marker>
  </defs>
  <text x="40" y="34" class="s-label" style="font-weight:600">Original columns, centred</text>
  <line x1="40" y1="170" x2="420" y2="170" style="stroke:var(--line)" stroke-width="1"/>
  <line x1="230" y1="60" x2="230" y2="290" style="stroke:var(--line)" stroke-width="1"/>
  <text x="404" y="186" class="s-sub">x₁</text>
  <text x="236" y="70" class="s-sub">x₂</text>
  <g style="fill:var(--ink-3)" fill-opacity=".75">
    <circle cx="139" cy="232" r="4"/><circle cx="142" cy="207" r="4"/><circle cx="166" cy="230" r="4"/><circle cx="167" cy="201" r="4"/>
    <circle cx="185" cy="212" r="4"/><circle cx="176" cy="176" r="4"/><circle cx="197" cy="194" r="4"/><circle cx="200" cy="177" r="4"/>
    <circle cx="222" cy="196" r="4"/><circle cx="220" cy="172" r="4"/><circle cx="235" cy="179" r="4"/><circle cx="226" cy="154" r="4"/>
    <circle cx="244" cy="164" r="4"/><circle cx="263" cy="177" r="4"/><circle cx="256" cy="146" r="4"/><circle cx="275" cy="158" r="4"/>
    <circle cx="268" cy="125" r="4"/><circle cx="289" cy="143" r="4"/><circle cx="294" cy="131" r="4"/><circle cx="312" cy="141" r="4"/>
    <circle cx="305" cy="110" r="4"/><circle cx="323" cy="122" r="4"/><circle cx="196" cy="161" r="4"/><circle cx="269" cy="177" r="4"/>
  </g>
  <line x1="126" y1="230" x2="334" y2="110" style="stroke:var(--acc)" stroke-width="2.5" marker-end="url(#pca-ah-82)"/>
  <line x1="230" y1="170" x2="253" y2="209" style="stroke:var(--warn)" stroke-width="2.5" marker-end="url(#pca-ah2-82)"/>
  <text x="340" y="104" class="s-label" style="fill:var(--acc);font-weight:600">PC1 · 96 %</text>
  <text x="258" y="224" class="s-label" style="fill:var(--warn);font-weight:600">PC2 · 4 %</text>

  <line x1="440" y1="60" x2="440" y2="290" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="470" y="34" class="s-label" style="font-weight:600">Keep k = 1</text>
  <line x1="470" y1="150" x2="850" y2="150" style="stroke:var(--acc)" stroke-width="2"/>
  <g style="fill:var(--acc)">
    <circle cx="474" cy="150" r="4"/><circle cx="498" cy="150" r="4"/><circle cx="514" cy="150" r="4"/><circle cx="538" cy="150" r="4"/>
    <circle cx="554" cy="150" r="4"/><circle cx="570" cy="150" r="4"/><circle cx="586" cy="150" r="4"/><circle cx="602" cy="150" r="4"/>
    <circle cx="618" cy="150" r="4"/><circle cx="634" cy="150" r="4"/><circle cx="650" cy="150" r="4"/><circle cx="658" cy="150" r="4"/>
    <circle cx="674" cy="150" r="4"/><circle cx="690" cy="150" r="4"/><circle cx="706" cy="150" r="4"/><circle cx="722" cy="150" r="4"/>
    <circle cx="738" cy="150" r="4"/><circle cx="754" cy="150" r="4"/><circle cx="770" cy="150" r="4"/><circle cx="786" cy="150" r="4"/>
    <circle cx="802" cy="150" r="4"/><circle cx="818" cy="150" r="4"/><circle cx="610" cy="150" r="4"/><circle cx="698" cy="150" r="4"/>
  </g>
  <text x="470" y="180" class="s-sub">score on PC1 = row · loading vector</text>
  <g>
    <rect x="470" y="212" width="380" height="60" rx="6" style="fill:var(--warn);fill-opacity:.08;stroke:var(--warn)" stroke-width="1"/>
    <text x="484" y="236" class="s-label" style="fill:var(--warn);font-weight:600">PC2 discarded — 4 % of variance</text>
    <text x="484" y="258" class="s-sub">If the label lived along PC2, the model never sees it</text>
  </g>
</svg>`
    },

    { t: "p", text: "The computation, in the terms 2.3 used: centre the *n × p* matrix **X**; the covariance is **XᵀX**/(n−1); its eigenvectors are the components and its eigenvalues the variances along them. scikit-learn does not build the covariance matrix — it takes the SVD **X = UΣVᵀ**, where the columns of **V** are the same components and each eigenvalue is σ²/(n−1). Scores are **XV**; truncation keeps the first *k* columns of **V**." },

    { t: "h2", n: "02", text: "Scaling decides the answer", id: "scaling" },

    { t: "p", text: "Variance depends on units. A column in pounds has a variance millions of times larger than one in years, so **PCA on unscaled data returns the column with the biggest units as PC1, with everything else as rounding error.** That is not a pattern in the data; it is a choice of units, and the fix is standardising first." },

    { t: "code", lang: "python", title: "Unscaled PCA is a units contest",
      hl: [15, 19, 26],
      code: `import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(0)
n = 2_000
df = pd.DataFrame({
    "income":       rng.normal(42_000, 18_000, n),   # pounds
    "age":          rng.normal(41, 12, n),           # years
    "tenure_years": rng.normal(6, 4, n).clip(0),
    "visits_30d":   rng.poisson(3, n).astype(float),
})

raw = PCA().fit(df)
print(raw.explained_variance_ratio_.round(4))     # [1. 0. 0. 0.]
print(pd.Series(raw.components_[0], index=df.columns).round(3))
# income 1.0   age 0.0   tenure_years 0.0   visits_30d 0.0
# PC1 is income. The column with the biggest units won before any pattern was considered.

Z = StandardScaler().fit_transform(df)
print(PCA().fit(Z).explained_variance_ratio_.round(2))   # [0.26 0.25 0.25 0.24]
# four independent columns: nothing to compress, every component is worth a quarter

df["age_at_join"] = df["age"] - df["tenure_years"] + rng.normal(0, 0.5, n)
Z = StandardScaler().fit_transform(df)
print(PCA().fit(Z).explained_variance_ratio_.round(2))   # [0.4  0.2  0.2  0.2  0.  ]
# one column is a combination of two others: PCA finds the redundancy, the last component is empty`,
      caption: "**Scaled, four independent columns give four equal components — there is nothing to reduce.** Add a column that is a combination of two others and one component drops to zero. PCA compresses correlation; where columns are independent it has nothing to work with."
    },

    { t: "callout", kind: "mental", title: "PCA compresses correlation, not columns", body: [
      { t: "p", text: "A flat explained-variance curve after scaling means the columns are close to independent, and reducing them discards information in proportion to how many you drop. **A steep curve means columns are telling you the same thing** — the case reduction was built for: correlated sensors, survey items, lagged versions of one series, pixel neighbourhoods." }
    ]},

    { t: "p", text: "The second consequence of ranking by variance is worse than the first. **PCA never looks at the target.** A column that alone determines the label but happens to have small variance is, to PCA, the least interesting direction in the data — and the 95 % rule discards it with a clear conscience." },

    { t: "code", lang: "python", title: "Variance is not signal",
      hl: [8, 14, 15, 16],
      code: `from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

rng = np.random.default_rng(1)
n = 3_000
noise  = rng.normal(0, 10, (n, 4))          # four loud columns, unrelated to y
quiet  = rng.normal(0, 1, n)                # one quiet column that decides y
y = (quiet + rng.normal(0, 0.5, n) > 0).astype(int)
X = np.column_stack([noise, quiet])

def auc(model):
    return cross_val_score(model, X, y, cv=5, scoring="roc_auc").mean().round(2)

print(auc(LogisticRegression()))                                            # 0.92
print(auc(make_pipeline(PCA(n_components=0.95), LogisticRegression())))     # 0.50
print(auc(make_pipeline(StandardScaler(), PCA(4), LogisticRegression())))   # 0.89

pca = PCA(n_components=0.95).fit(X)
print(pca.n_components_)                              # 4  -- the four noise columns
print(np.abs(pca.components_[:, 4]).max().round(4))   # 0.001 -- the quiet column is in none of them`,
      caption: "**The 95 % rule kept the four noise columns and dropped the one that predicts the label: AUC 0.92 to 0.50.** Scaled, the five columns have equal variance and PCA(4) drops an arbitrary direction — which takes a random share of the signal with it. Neither is a choice about the target, because PCA cannot make one."
    },

    { t: "viz",
      title: "What the variance rule sees",
      caption: "Explained variance per component on the five raw columns. The cumulative line crosses 95 % after four components; the fifth — the only one aligned with the target — is what truncation removes.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Bar chart of explained variance for five components: four bars at about 25 percent and a fifth near zero highlighted as the only one related to the target, with a cumulative line crossing the 95 percent threshold after four components">
  <line x1="80" y1="240" x2="840" y2="240" style="stroke:var(--line)" stroke-width="1"/>
  <line x1="80" y1="60" x2="80" y2="240" style="stroke:var(--line)" stroke-width="1"/>
  <text x="30" y="64" class="s-sub">100 %</text>
  <text x="38" y="154" class="s-sub">50 %</text>
  <text x="44" y="244" class="s-sub">0 %</text>
  <g style="fill:var(--ink-3)" fill-opacity=".55">
    <rect x="130" y="195" width="70" height="45"/>
    <rect x="270" y="195" width="70" height="45"/>
    <rect x="410" y="195" width="70" height="45"/>
    <rect x="550" y="195" width="70" height="45"/>
  </g>
  <rect x="690" y="239" width="70" height="1" style="fill:var(--crit)"/>
  <rect x="690" y="232" width="70" height="8" rx="1" style="fill:var(--crit);fill-opacity:.25;stroke:var(--crit)" stroke-width="1"/>
  <g class="s-sub" text-anchor="middle">
    <text x="165" y="262">PC1 · 25 %</text><text x="305" y="262">PC2 · 25 %</text><text x="445" y="262">PC3 · 25 %</text><text x="585" y="262">PC4 · 25 %</text>
    <text x="725" y="262" style="fill:var(--crit);font-weight:600">PC5 · 0.2 %</text>
  </g>
  <polyline points="165,195 305,150 445,105 585,60 725,60" fill="none" style="stroke:var(--acc)" stroke-width="2"/>
  <g style="fill:var(--acc)">
    <circle cx="165" cy="195" r="4"/><circle cx="305" cy="150" r="4"/><circle cx="445" cy="105" r="4"/><circle cx="585" cy="60" r="4"/><circle cx="725" cy="60" r="4"/>
  </g>
  <line x1="80" y1="69" x2="840" y2="69" style="stroke:var(--warn)" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="760" y="88" class="s-label" style="fill:var(--warn);font-weight:600">95 % kept here</text>
  <text x="165" y="182" class="s-sub" text-anchor="middle" style="fill:var(--acc)">cumulative</text>
  <text x="725" y="222" class="s-label" text-anchor="middle" style="fill:var(--crit);font-weight:600">the only column</text>
  <text x="725" y="206" class="s-label" text-anchor="middle" style="fill:var(--crit);font-weight:600">correlated with y</text>
</svg>`
    },

    { t: "h2", n: "03", text: "How many components", id: "howmany" },

    { t: "p", text: "The 95 % rule is a convention about variance with no connection to the model's task. Two better questions have answers you can compute. **How many components carry structure beyond chance?** Parallel analysis answers that. **How many does the model need?** Cross-validation answers that, and it should include *no reduction at all* as one of the options." },

    { t: "code", lang: "python", title: "Parallel analysis, then the score the model actually gets",
      hl: [10, 11, 27, 28],
      code: `from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.pipeline import Pipeline

def parallel_analysis(X, n_shuffles=30, q=0.95, seed=0):
    r = np.random.default_rng(seed)
    Xs = StandardScaler().fit_transform(X)
    real = PCA().fit(Xs).explained_variance_
    null = np.empty((n_shuffles, Xs.shape[1]))
    for i in range(n_shuffles):
        # shuffle each column independently: same marginals, no correlation between columns
        shuffled = np.column_stack([r.permutation(c) for c in Xs.T])
        null[i] = PCA().fit(shuffled).explained_variance_
    cutoff = np.quantile(null, q, axis=0)
    return int((real > cutoff).sum())

# thirty columns generated from three latent factors, plus noise
rng = np.random.default_rng(2)
n = 2_000
F = rng.normal(0, 1, (n, 3))
X30 = F @ rng.normal(0, 1, (3, 30)) + rng.normal(0, 0.8, (n, 30))
y30 = (F[:, 0] + 0.5 * F[:, 1] + rng.logistic(0, 1, n) > 0).astype(int)

print(parallel_analysis(X30))     # 3  -- only three eigenvalues beat chance correlation

pipe = Pipeline([("sc", StandardScaler()), ("pca", "passthrough"),
                 ("clf", LogisticRegression(max_iter=1000))])
grid = GridSearchCV(pipe, {"pca": ["passthrough", PCA(2), PCA(3), PCA(5), PCA(10)]},
                    cv=StratifiedKFold(5, shuffle=True, random_state=0), scoring="roc_auc").fit(X30, y30)
for p, m, s in zip(grid.cv_results_["param_pca"], grid.cv_results_["mean_test_score"], grid.cv_results_["std_test_score"]):
    print(f"{str(p):22s} {m:.3f} ± {s:.3f}")
# passthrough            0.851 ± 0.012
# PCA(n_components=2)    0.849 ± 0.011
# PCA(n_components=3)    0.852 ± 0.012
# PCA(n_components=5)    0.851 ± 0.012
# PCA(n_components=10)   0.851 ± 0.013`,
      caption: "**Parallel analysis says three components carry shared structure; the CV says the model scores the same with three, ten, or none.** Reduction here costs nothing and buys a 10× smaller feature matrix — that is the trade, stated in the metric that matters, with no-reduction on the grid as the control."
    },

    { t: "p", text: "Read the grid the way you would read a score-versus-*k* curve in 8.1: differences smaller than the fold standard deviation are noise. **If no-reduction wins or ties, reduction needs a reason other than accuracy** — training cost, storage, a downstream algorithm that cannot cope with collinear columns. If a low *k* loses clearly, you have found the point where it discarded something the model used." },

    { t: "callout", kind: "production", title: "PCA is a fit step — it lives in the pipeline", body: [
      { t: "p", text: "The components are learnt from the rows they are fit on. Fitting PCA on the full dataset before the split cannot leak the target — PCA never sees it — but it lets the test rows rotate the axes the model is judged on, and it puts `n_components` outside the cross-validation that is supposed to choose it. **Fit it in a `Pipeline`, per fold, and tune *k* on the grid like any other hyperparameter.** 8.5 makes this mechanical." }
    ]},

    { t: "h2", n: "04", text: "What reduction costs, and the variants", id: "cost" },

    { t: "p", text: "A model coefficient on `PC2` says nothing about any column a stakeholder recognises. The loadings say what PC2 is made of, and with a few strongly loaded columns you can describe it honestly — 'mostly the three engagement counts, positive'. **With loadings spread across forty columns, the component has no description, and naming it anyway is storytelling.** If the requirement is an explanation per column, use selection (8.1) or a regularised model on the original columns instead." },

    { t: "code", lang: "python", title: "Loadings, whitening and the variants for other shapes of data",
      code: `pca = Pipeline([("sc", StandardScaler()), ("pca", PCA(3))]).fit(X30)["pca"]
load = pd.DataFrame(pca.components_.T, columns=["PC1", "PC2", "PC3"],
                    index=[f"c{i:02d}" for i in range(30)])
for c in load:
    top = load[c].abs().sort_values(ascending=False).head(4)
    print(c, "<-", ", ".join(f"{i} ({load.loc[i, c]:+.2f})" for i in top.index))
# PC1 <- c17 (+0.27), c04 (-0.26), c22 (+0.25), c09 (+0.25)   ... spread over thirty columns

# whiten=True rescales every kept score to unit variance -- ICA and some kernels need it;
# it multiplies the smallest components by the largest factors, so it amplifies noise most
PCA(3, whiten=True)

# sparse input (TF-IDF from 7.10): PCA would densify it; TruncatedSVD does not centre and stays sparse
from sklearn.decomposition import TruncatedSVD, IncrementalPCA
lsa = TruncatedSVD(n_components=200, random_state=0)      # latent semantic analysis

# data that does not fit in memory: fit in batches
ipca = IncrementalPCA(n_components=20, batch_size=50_000)

# supervised reduction: directions that separate the classes, at most (classes - 1) of them.
# It uses y, so it must be fit inside the CV like any selector.
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
lda = LinearDiscriminantAnalysis(n_components=1)`,
      caption: "`TruncatedSVD` for sparse matrices, `IncrementalPCA` for out-of-core, `svd_solver='randomized'` (the default for large inputs) when *p* is in the thousands. LDA is the supervised cousin — it looks at the target, which makes it useful and makes it a fit step that leaks."
    },

    { t: "p", text: "PCA also appears as a fix for multicollinearity: regress on the components and the VIFs from 6.2 vanish, because the components are orthogonal by construction. It works, and the coefficients now refer to mixtures. **Ridge regression on the original columns handles the same collinearity and keeps the columns**; principal-component regression is the choice when you also need the compression." },

    { t: "h2", n: "05", text: "t-SNE and UMAP are for looking", id: "manifold" },

    { t: "p", text: "PCA is linear and preserves global distances as well as a linear map can. t-SNE and UMAP are non-linear and preserve *neighbourhoods*: rows that were close stay close, and nothing else is promised. **The distances between clusters in a t-SNE plot mean nothing; the sizes of the clusters mean nothing; the same data at a different perplexity produces a different picture.** These are excellent tools for seeing structure and hopeless ones for making features." },

    { t: "code", lang: "python", title: "What a manifold embedding cannot do",
      code: `from sklearn.manifold import TSNE

tsne = TSNE(n_components=2, perplexity=30, random_state=0)
Z = tsne.fit_transform(StandardScaler().fit_transform(X30))

print(hasattr(tsne, "transform"))   # False -- there is no map from a new row to the plane
# The embedding was optimised for these rows jointly. A row arriving tomorrow has no coordinates,
# so a model trained on Z cannot be applied to anything it was not trained on.

# A single Gaussian blob, embedded at low perplexity, breaks into "clusters" that do not exist
blob = rng.normal(0, 1, (1_000, 10))
Z_blob = TSNE(perplexity=5, random_state=0).fit_transform(blob)
# plot it and you will see islands. They are artefacts of the perplexity, not of the data.

# UMAP has transform(), so it can embed new rows -- into a plane whose geometry still carries no
# distance meaning. Use either for a picture. Feed a model the scaled columns, or the PCA scores.`,
      caption: "**t-SNE has no `transform`, and UMAP's is a projection onto a plane where distance was never the objective.** Both belong in the notebook that looks at the data, not in the pipeline that scores it."
    },

    { t: "callout", kind: "warn", title: "A t-SNE plot is evidence of neighbourhoods, and of nothing else", body: [
      { t: "p", text: "Before you conclude 'the classes separate' from an embedding, colour the plot by a column you know is meaningless — a random integer — and confirm it does not also 'separate'. And before you trust a cluster, check it survives three perplexities. A structure that appears at one setting and vanishes at the next was made by the setting." }
    ]},

    { t: "table",
      head: ["Method", "Preserves", "Uses the target", "Maps new rows", "Use it for"],
      rows: [
        ["PCA", "Global variance, linear", "No", "Yes", "Correlated numeric columns; compression; decorrelation"],
        ["TruncatedSVD", "As PCA, without centring", "No", "Yes", "Sparse matrices — TF-IDF, one-hot at scale"],
        ["IncrementalPCA", "As PCA, in batches", "No", "Yes", "Data larger than memory"],
        ["LDA", "Class separation, linear", "**Yes** — fit inside CV", "Yes", "Supervised reduction to ≤ C−1 dimensions"],
        ["t-SNE", "Local neighbourhoods", "No", "**No**", "Looking at structure in a notebook"],
        ["UMAP", "Local neighbourhoods, some global", "No", "Yes, loosely", "Looking; occasionally clustering input"],
        ["Feature selection (8.1)", "Original columns", "Usually", "Yes", "When each column must stay explainable"]
      ]
    },

    { t: "ladder",
      title: "Reducing 300 correlated sensor columns for a classifier",
      rungs: [
        { level: "bad", label: "Raw PCA on everything, k by feel", code: `Z = PCA(n_components=10).fit_transform(X)   # all rows, original units
X_tr, X_te, y_tr, y_te = train_test_split(Z, y)`,
          note: "**Three faults in two lines.** Unscaled, so the sensors with the biggest units are the components; fit on every row, so the test set shaped the axes; k = 10 chosen by nothing." },
        { level: "ok", label: "Scaled, in the pipeline, 95 % rule", code: `pipe = make_pipeline(StandardScaler(), PCA(n_components=0.95), clf)
cross_val_score(pipe, X, y, cv=5)`,
          note: "**Correct mechanics, arbitrary k.** Scaling makes the components about correlation, the pipeline fits per fold. But 0.95 is a statement about variance; the model may need 3 components or 60, and this never asks." },
        { level: "best", label: "k on the grid, with no reduction as the control", code: `pipe = Pipeline([("sc", StandardScaler()), ("pca", "passthrough"), ("clf", clf)])
grid = GridSearchCV(pipe, {"pca": ["passthrough", PCA(5), PCA(20), PCA(60)]},
                    cv=5, scoring="roc_auc").fit(X, y)
# keep PCA only if it matches passthrough within fold noise, and then for the cost saving`,
          note: "**The decision is made in the metric that matters, with the honest baseline present.** If passthrough wins, reduction has to justify itself on cost; if PCA(20) ties, you have a 15× smaller matrix for free." }
      ]
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A reduction stage that proves it kept the signal",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Forty columns with planted structure: thirty generated from three latent factors, nine loud noise columns in large units, and one quiet column that — with the first factor — decides the label. Show that PCA on the raw columns at 95 % variance discards the quiet column and the score collapses. Run parallel analysis and report what it counts. Then choose *k* on a grid that includes no reduction, print the loadings of the kept components, and assert that the chosen configuration costs nothing against the baseline." },
        { t: "p", text: "Assert also that the *k* parallel analysis returns is the wrong *k* for the model, and say why in the report." }
      ],
      requirements: [
        "Baseline: scaled columns, no PCA, cross-validated AUC.",
        "Raw PCA(0.95): its AUC, the number of components it kept, and the weight it gave the quiet column.",
        "Parallel analysis with independently shuffled columns.",
        "A grid over passthrough and several k, fit inside the CV.",
        "Loadings: the top three columns of each of the first three components.",
        "Assertions: raw PCA collapses; best grid choice within 0.01 of baseline; PCA at the parallel-analysis k loses clearly."
      ],
      hint: "The quiet column is independent of the thirty factor columns and has unit variance after scaling — the same as the nine loud columns after scaling. PCA has no way to rank it above them. Parallel analysis counts shared structure; the quiet column is not shared with anything.",
      solution: {
        lang: "python",
        title: "reduction_stage.py",
        code: `import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(42)
n = 4_000

# --- planted structure --------------------------------------------------
F = rng.normal(0, 1, (n, 3))                          # three latent factors
block = F @ rng.normal(0, 1, (3, 30)) + rng.normal(0, 0.7, (n, 30))   # 30 correlated columns
loud  = rng.normal(0, 25, (n, 9))                     # 9 loud, useless columns
quiet = rng.normal(0, 1, n)                           # 1 quiet column that matters
y = (1.2 * F[:, 0] + 2.0 * quiet + rng.logistic(0, 1, n) > 0).astype(int)

cols = [f"b{i:02d}" for i in range(30)] + [f"loud{i}" for i in range(9)] + ["quiet"]
X = pd.DataFrame(np.column_stack([block, loud, quiet]), columns=cols)
cv = StratifiedKFold(5, shuffle=True, random_state=0)
clf = lambda: LogisticRegression(max_iter=2000)

def auc(pipe):
    return cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc").mean()

# --- 1. baseline and the raw 95 % rule ----------------------------------
base  = Pipeline([("sc", StandardScaler()), ("clf", clf())])
raw95 = Pipeline([("pca", PCA(n_components=0.95)), ("clf", clf())])
base_auc, raw_auc = auc(base), auc(raw95)
print(f"baseline (scaled, no PCA): {base_auc:.3f}")        # 0.88
print(f"raw PCA(0.95):             {raw_auc:.3f}")         # 0.50
raw95.fit(X, y)
kept = raw95["pca"].n_components_
quiet_w = np.abs(raw95["pca"].components_[:, cols.index("quiet")]).max()
print(f"raw PCA kept {kept} components; max |loading| on quiet = {quiet_w:.4f}")
# kept 9 -- the nine loud columns, in order of their units; quiet loading 0.000x

# --- 2. parallel analysis -------------------------------------------------
def parallel_analysis(X, n_shuffles=30, q=0.95, seed=0):
    r = np.random.default_rng(seed)
    Xs = StandardScaler().fit_transform(X)
    real = PCA().fit(Xs).explained_variance_
    null = np.empty((n_shuffles, Xs.shape[1]))
    for i in range(n_shuffles):
        null[i] = PCA().fit(np.column_stack([r.permutation(c) for c in Xs.T])).explained_variance_
    return int((real > np.quantile(null, q, axis=0)).sum())

k_pa = parallel_analysis(X)
print(f"parallel analysis: {k_pa} components carry shared structure")    # 3

# --- 3. k on the grid, no-reduction as the control -----------------------
pipe = Pipeline([("sc", StandardScaler()), ("pca", "passthrough"), ("clf", clf())])
grid = GridSearchCV(pipe, {"pca": ["passthrough", PCA(3), PCA(5), PCA(10), PCA(20), PCA(40)]},
                    cv=cv, scoring="roc_auc").fit(X, y)
res = pd.DataFrame(grid.cv_results_)
score = dict(zip(res["param_pca"].astype(str), res["mean_test_score"]))
for k, v in score.items():
    print(f"  {k:22s} {v:.3f}")
# passthrough            0.881
# PCA(n_components=3)    0.724   <- the parallel-analysis k: factors only, quiet column gone
# PCA(n_components=5)    0.76
# PCA(n_components=10)   0.81
# PCA(n_components=20)   0.879
# PCA(n_components=40)   0.881

# --- 4. loadings ----------------------------------------------------------
pca3 = Pipeline([("sc", StandardScaler()), ("pca", PCA(3))]).fit(X)["pca"]
load = pd.DataFrame(pca3.components_.T, index=cols, columns=["PC1", "PC2", "PC3"])
for c in load:
    top = load[c].abs().sort_values(ascending=False).head(3)
    print(c, "<-", ", ".join(f"{i} ({load.loc[i, c]:+.2f})" for i in top.index))
print("quiet on PC1..3:", load.loc["quiet"].abs().round(3).tolist())    # [0.00x, 0.00x, 0.00x]

# --- 5. assertions --------------------------------------------------------
assert raw_auc < 0.6,                                    "raw PCA should have discarded the quiet column"
assert score["passthrough"] - grid.best_score_ < 0.01,   "the chosen k must not cost accuracy"
assert score["PCA(n_components=3)"] < score["passthrough"] - 0.05, "the parallel-analysis k loses the quiet column"
assert isinstance(grid.best_estimator_, Pipeline),       "PCA is fitted inside the CV, per fold"
print("chosen:", grid.best_params_["pca"])
print("report: parallel analysis counts components shared across columns; the quiet column is shared",
      "with nothing, so it is counted by neither the variance rule nor the null comparison. Only the",
      "downstream score can say the model needs it.")`,
        notes: [
          { t: "p", text: "**Raw PCA at 95 % keeps exactly nine components — the nine loud columns, whose variance of 625 each dwarfs everything — and the quiet column's loading on all of them is a rounding error.** AUC 0.50: the model was handed nine columns of noise in a new basis." },
          { t: "p", text: "**Parallel analysis returns 3 and is right about what it measures**: three directions carry variance that independent columns could not produce. The quiet column is one independent column with unit variance after scaling, indistinguishable to any unsupervised count from the nine loud columns, which are also one independent column each after scaling." },
          { t: "p", text: "**PCA(3) scores 0.72 — the first factor's share of the signal — and only PCA(20) or higher recovers the quiet column**, because where it lands among the ten unit-variance independent directions is decided by sampling noise. The grid with passthrough as the control turns the whole question into one comparison in the metric that matters." },
          { t: "p", text: "**The assertions are the audit trail**: reduction collapsed when done naively, the chosen configuration ties the baseline, and the *k* an unsupervised rule would have picked loses by five points." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Standardised, forty columns give explained-variance ratios that are all close to 0.025. What does this tell you about reducing them?",
          options: [
            "Keep the first ten — they still explain the most",
            "The columns are close to independent, so PCA has nothing to compress; any truncation discards information in proportion to how many components you drop",
            "The data needs whitening",
            "Use t-SNE instead"
          ],
          answer: 1,
          why: "PCA compresses correlation. A flat spectrum after scaling means no direction carries more than its share — every component is one column's worth of unrelated variance, and dropping it drops that column's information. The decision reverts to selection or to keeping everything."
        }
      ]
    }
  ],

  takeaways: [
    "**PCA is a rotation onto directions of maximum variance, then a truncation** — and the ordering is by variance alone; the target never enters.",
    "**Unscaled PCA is a units contest**: the column with the biggest units is PC1 with everything else as rounding error. Standardise first.",
    "**PCA compresses correlation, not columns** — a flat explained-variance curve after scaling means there is nothing to reduce.",
    "**Variance is not signal**: a quiet column that alone decides the label is the first thing a 95 % rule discards, and the score falls to chance.",
    "**Loadings say what a component is made of**; a component spread across forty columns has no honest description.",
    "**Parallel analysis counts components that beat chance correlation** — the right answer to 'how much shared structure', and not the answer to 'what the model needs'.",
    "**Choose k on a CV grid that includes no reduction**, and read differences against fold noise; if passthrough ties, reduction has to justify itself on cost.",
    "**PCA is a fit step and belongs in the pipeline**, per fold, with k tuned like any hyperparameter — it cannot leak the target, but it can let test rows shape the axes.",
    "**Whitening gives every kept component unit variance** and so amplifies the noisiest ones most.",
    "**TruncatedSVD for sparse input, IncrementalPCA for data larger than memory, LDA when you want supervised directions** — and LDA, using y, is a selector that leaks outside the CV.",
    "**PCA fixes multicollinearity by making the coefficients refer to mixtures**; ridge fixes it and keeps the columns.",
    "**t-SNE and UMAP preserve neighbourhoods and nothing else** — inter-cluster distances, cluster sizes and the picture at a different perplexity all mean nothing.",
    "**t-SNE has no transform**; a model trained on its output cannot score a new row. Use embeddings for looking, scaled columns or PCA scores for features."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "On raw columns, `PCA(n_components=0.95)` keeps four of five components and a logistic regression on them scores AUC 0.50; on the original columns it scores 0.92. What happened?",
        options: [
          "PCA introduced noise",
          "The fifth column — the only one related to the target — had the smallest variance, so it was the direction PCA ranked last and the variance rule discarded; PCA never looks at y",
          "Logistic regression needs the original columns",
          "n_components should have been an integer"
        ],
        answer: 1,
        why: "Explained variance measures spread, not usefulness. Four loud unrelated columns own 99.8 % of the variance; the quiet predictive column owns 0.2 % and is exactly what truncation removes. No unsupervised rule can rank by relevance to a target it does not see."
      },
      {
        stem: "Parallel analysis on forty standardised columns returns 3. A colleague sets `PCA(3)` and the CV score falls from 0.88 to 0.72. Why?",
        options: [
          "Parallel analysis is unreliable",
          "It counted the components that carry variance shared across columns — three latent factors. A predictive column that is independent of everything else is not shared structure, so it is not counted, and the model needed it",
          "The shuffling was wrong",
          "Three is too few for logistic regression"
        ],
        answer: 1,
        why: "Parallel analysis answers 'how many directions exceed what chance correlation produces'. An independent unit-variance column produces an eigenvalue of about 1 — the same as the null — whether or not it predicts the label. The model's k comes from the CV grid, with passthrough as the control."
      },
      {
        stem: "Which of these is a legitimate use of t-SNE output?",
        options: [
          "Two extra features for the classifier",
          "Reporting that two clusters are 'far apart' because they are far apart in the plot",
          "A picture to check whether rows that share a label also tend to be neighbours, confirmed at more than one perplexity",
          "Embedding tomorrow's rows with the fitted object"
        ],
        answer: 2,
        why: "t-SNE preserves neighbourhoods and nothing else: inter-cluster distance and cluster size are artefacts, the picture changes with perplexity, and there is no `transform` for new rows. It is for looking, and even then with a perplexity check."
      },
      {
        stem: "Scaled PCA gives explained-variance ratios `[0.40, 0.20, 0.20, 0.20, 0.00]` on five columns. What does the last value mean?",
        options: [
          "The fifth column is constant",
          "One column is a linear combination of others, so the data has only four independent directions; the fifth component is empty",
          "PCA failed to converge",
          "Scaling removed a column"
        ],
        answer: 1,
        why: "A zero eigenvalue is a direction with no variance — the data lies in a four-dimensional subspace of the five columns. That is redundancy, exactly what PCA compresses, and the case where dropping a component loses nothing."
      },
      {
        stem: "Why does `PCA` belong inside the `Pipeline` when it cannot see the target?",
        options: [
          "It does not need to — unsupervised steps cannot leak",
          "Fitting it on all rows lets the test rows shape the axes the model is judged on, and puts n_components outside the cross-validation meant to choose it",
          "Only for speed",
          "Because StandardScaler requires it"
        ],
        answer: 1,
        why: "The components are learnt from whatever rows they are fit on. Per-fold fitting keeps the test rows out of the rotation and makes k a tunable hyperparameter on the same grid as everything else."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Explain what PCA does and when you would not use it.",
        strong: "It centres the data, finds orthogonal directions of maximum variance — the eigenvectors of the covariance matrix, equivalently the right singular vectors of the centred matrix — and expresses each row in those directions; reduction is keeping the first k. I standardise first, because otherwise it is a units contest. I would not use it when the columns are close to independent — nothing to compress — when each column must remain explainable, or when the signal might sit in a low-variance direction, because PCA never sees the target. And I would not pick k by a 95 % rule; I put it on the CV grid with no-reduction as a control.",
        answer: [
          { t: "p", text: "The 'never sees the target' point and the no-reduction control are what distinguish someone who has been burnt from someone who has read the docstring." }
        ]
      },
      {
        level: "expert",
        q: "A pipeline with PCA(0.95) scores far below the same model on the raw scaled columns. Diagnose it.",
        strong: "The 95 % rule discarded a direction the model used. First check: were the columns scaled before PCA? If not, PC1 is the column with the biggest units and the rule kept the loud columns regardless of relevance. If they were scaled, look at the explained-variance curve — a flat one means the columns are independent and every dropped component is a column's worth of information. Then put k on a grid including passthrough and see where the score recovers; the k at which it does tells you how many directions the signal was spread across. If interpretability matters, I would switch to selection on the original columns instead.",
        answer: [
          { t: "p", text: "Ordering the diagnosis — scaling, spectrum shape, grid with control — shows a procedure rather than a guess." }
        ]
      },
      {
        level: "expert",
        q: "Someone wants to add UMAP coordinates as two features. What do you say?",
        strong: "That the coordinates encode neighbourhood structure, not distances, so a linear model reads geometry into them that was never optimised for; that UMAP's transform for new rows is a projection into a space fitted jointly on the training rows, so it drifts; and that any structure they see in the plot needs confirming at other settings before it is believed. If the goal is a compact non-linear representation for a model, an autoencoder or PCA scores are the honest choices, evaluated by cross-validated score against the raw columns — which usually win.",
        answer: [
          { t: "p", text: "Offering the honest alternative and the evaluation that decides it turns a refusal into advice." }
        ]
      }
    ]
  }
});
