/* ============================================================================
   LESSON 7.4 — PCA
   ========================================================================= */
EC.receiveLesson({
  id: "7.4",

  lede: "**Principal component analysis finds the directions along which the data vary most, in order, and lets you keep the first few.** The derivation is four lines — maximise the variance of a projection subject to unit length, and the Lagrangian condition is the eigenvector equation of the covariance matrix — and this lesson does it on a 2 × 2 covariance by hand (eigenvalues 2.363 and 0.237; the first direction carries 90.9 %), then shows the SVD computing the same thing on 5,000 rows to four decimals. The rest is the discipline of using it: scaling first (unscaled, PC1 of the churn data was the tenure column with a loading of 1.00 and 80 % of the variance); choosing components by cumulative variance *and* by what the downstream model needs (digits: 90 % of the variance takes 21 components, KNN reaches 0.975 with 10); and the two claims PCA makes that are often false — that variance is relevance, which the rings refute (the direction that separates them is the *third* kernel component), and that dropping components helps a model, which the churn data refute for every model tried. Whitening, kernel PCA, randomised and incremental solvers, random projections and NMF close the toolkit.",

  objectives: [
    "Derive PCA as variance maximisation → eigenproblem, solve a 2 × 2 case by hand, and connect it to the SVD",
    "Explain why scaling is mandatory and read loadings and explained-variance ratios",
    "Choose the number of components by cumulative variance, scree and downstream performance, and know when PCA hurts",
    "Use whitening, kernel PCA, randomised and incremental PCA, random projections and NMF for the jobs each was built for"
  ],

  prerequisites: ["4.3", "5.1", "3.1"],

  blocks: [

    { t: "h2", n: "01", text: "From variance maximisation to eigenvectors", id: "derivation" },

    { t: "code", lang: "text", title: "The derivation, a 2 × 2 case by hand, and the SVD route (executed)",
      code: `centre the data (each column mean 0).  covariance  Σ = XᵀX / n.
find the unit direction w that maximises the variance of the projection Xw:      Var(Xw) = wᵀ Σ w,   subject to  wᵀw = 1
Lagrangian   wᵀΣw - λ(wᵀw - 1);   ∂/∂w = 0   ->   Σ w = λ w
so w is an EIGENVECTOR of Σ and the variance it captures is its EIGENVALUE λ. Sort by λ: PC1, PC2, ... are orthogonal, and
component i explains λᵢ / Σⱼ λⱼ of the total variance (the trace of Σ).

by hand:  Σ = [[2, 0.8], [0.8, 0.6]]
   det(Σ - λI) = (2 - λ)(0.6 - λ) - 0.64 = λ² - 2.6λ + 0.56 = 0   ->   λ = (2.6 ± √(6.76 - 2.24)) / 2 = (2.6 ± 2.126) / 2 = 2.363,  0.237
   explained variance ratio: 2.363 / 2.6 = 90.9 %,  9.1 %
   PC1: (Σ - 2.363 I) w = 0  ->  -0.363 w₁ + 0.8 w₂ = 0  ->  w ∝ (0.8, 0.363)  ->  unit: (0.911, 0.413);   PC2 = (0.413, -0.911);   PC1 · PC2 = 0
   check: Σ w₁ = (2.152, 0.976) = 2.363 × (0.911, 0.413)

the SVD route:  X = U D Vᵀ  ->  XᵀX = V D² Vᵀ,  so the columns of V are the eigenvectors and λᵢ = dᵢ² / n. No covariance matrix is formed.
   5,000 rows drawn with that covariance:   eig of the sample covariance  λ = [2.3933, 0.2319]     SVD  d²/n = [2.3933, 0.2319]     V = [[0.906, 0.422], [0.422, -0.906]]
   scikit-learn PCA(2): explained_variance_ [2.394, 0.232], ratio [0.912, 0.088], components_ the same rows (sign is arbitrary)
   the scores Xw are uncorrelated: corr(PC1, PC2) = 0.00000;  var(PC1) = 2.3933 = λ₁`,
      caption: "Everything PCA does follows from Σw = λw: the components are orthogonal because Σ is symmetric, the scores are uncorrelated because the eigenvectors diagonalise Σ, and the eigenvalues are the variances of the scores. The SVD is how it is computed — numerically stable, and the truncated or randomised versions give the top components without touching the rest."
    },

    { t: "dl", items: [
      ["Principal component", "An eigenvector of the covariance matrix: a unit direction in feature space. Its loadings are its coordinates — the weight of each original feature."],
      ["Explained variance ratio", "λᵢ / Σλ: the share of total variance along component i. Cumulative ratio is the usual guide for how many to keep."],
      ["Scores", "The projections Xw: the new coordinates, uncorrelated, with variance λᵢ. `transform` returns them."],
      ["Loadings", "The components_ matrix: which original features each PC mixes. PC1 of the standardised churn numerics is 0.71 fee + 0.71 logins — a 'plan tier' direction."],
      ["Reconstruction", "X̂ = scores × components + mean; the error is the variance in the dropped components. RMSE 0.183 at 5 digit components, 0.029 at 40."],
      ["Whitening", "Divide each score by √λᵢ so every component has unit variance and the scores are identity-covariance. For algorithms that assume isotropy (some ICA, some distance methods)."],
      ["Kernel PCA", "PCA in the implicit feature space of a kernel (5.3): non-linear components. The ring-separating direction was the *third* kernel component at γ ≤ 10."],
      ["Random projection", "Project onto random directions; pairwise distances are preserved within (1 ± ε) by the Johnson–Lindenstrauss lemma, with no fitting at all."],
      ["NMF", "X ≈ WH with W, H ≥ 0: parts-based, additive factors; topics in text (four clean topics on the newsgroups where LSA gave signed mixtures)."]
    ]},

    { t: "h2", n: "02", text: "Scaling, loadings and choosing the number of components", id: "choosing" },

    { t: "code", lang: "python", title: "Scale first: the churn numerics raw and standardised (executed)",
      hl: [2, 4],
      code: `#   input          explained variance ratio             PC1 loadings
#   raw            [0.802, 0.098, 0.084, 0.015, 0.002]   tenure 1.00, fee 0.00, logins 0.00, tickets 0.00, discount 0.00     <- PC1 IS the tenure column
#   standardised   [0.346, 0.209, 0.200, 0.191, 0.055]   tenure 0.01, fee 0.71, logins 0.71, tickets 0.04, discount 0.04     <- PC1 is 'plan tier': fee and logins move together
# standardised: five components explain 35 / 21 / 20 / 19 / 5 % -- almost isotropic; there is one correlated pair (fee-logins) and the rest are independent`,
      caption: "PCA maximises variance in the units given, so a column measured in months with sd 17.5 owns the first component outright and the other four columns share the crumbs. Standardised, the picture is the true one: fee and logins are correlated (both follow plan), and the remaining directions carry nearly equal variance — which already says that dropping components will discard real information, as the next sections confirm."
    },

    { t: "viz",
      title: "Cumulative explained variance, the 64-pixel digits (executed)",
      caption: "Curves like this are read at thresholds — 90 % at 21 components, 95 % at 29, 99 % at 41 — and the elbow in the scree (eigenvalues 0.70, 0.64, 0.55, 0.40, 0.27, 0.23, …) is near 4–5. Neither number is the right one for a model; section 03 checks what the models say.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Cumulative explained variance rising steeply over the first ten principal components of the digits data, reaching 0.90 at 21 components, 0.95 at 29 and 0.99 at 41, flattening toward 1.0 at 64.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="250" x2="820" y2="250"/><line x1="80" y1="40" x2="80" y2="250"/></g>
  <g class="s-sub">
    <text x="72" y="254" text-anchor="end">0</text><text x="72" y="154" text-anchor="end">0.5</text><text x="72" y="74" text-anchor="end">0.9</text><text x="72" y="54" text-anchor="end">1.0</text>
    <text x="80" y="270" text-anchor="middle">0</text><text x="195" y="270" text-anchor="middle">10</text><text x="310" y="270" text-anchor="middle">20</text><text x="425" y="270" text-anchor="middle">30</text><text x="540" y="270" text-anchor="middle">40</text><text x="655" y="270" text-anchor="middle">50</text><text x="816" y="270" text-anchor="middle">64</text>
    <text x="400" y="290">components kept</text>
  </g>
  <line x1="80" y1="70" x2="820" y2="70" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="3 5"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.4" points="80,250 92,220 103,193 114,169 126,153 138,141 149,131 172,115 195,102 218,93 252,83 310,71 368,63 425,58 482,55 540,52 655,50 816,50"/>
  <g style="fill:var(--warn)"><circle cx="322" cy="69" r="5"/><circle cx="414" cy="59" r="5"/><circle cx="552" cy="52" r="5"/></g>
  <g class="s-label" style="font-weight:600;fill:var(--warn)">
    <text x="300" y="96">21 → 0.903</text><text x="400" y="86">29 → 0.955</text><text x="540" y="78">41 → 0.990</text>
  </g>
  <text x="150" y="200" class="s-sub">the first five components: 0.545</text>
</svg>`
    },

    { t: "code", lang: "python", title: "Components against what the model needs: digits, 5-fold accuracy (executed)",
      hl: [3, 4, 5, 8],
      code: `#   components    cumulative variance    logistic    KNN-5      reconstruction RMSE (pixels 0-1)
#        2               0.285             0.605      0.620
#        5               0.545             0.850      0.920            0.183
#       10               0.738             0.928      0.975            0.139
#       20               0.894             0.953      0.983            0.088
#       30               0.959             0.963      0.984
#       40               0.988                                         0.029
#       64               1.000             0.969      0.986            0
# KNN is within 0.011 of its full-data accuracy at 10 components (74 % of the variance); logistic needs 30 to get within 0.006`,
      caption: "The variance thresholds are conventions; the model is the judge. Ten components carry three quarters of the pixel variance and almost all of what a nearest-neighbour classifier needs — the rest is stroke-level detail that looks like noise to a distance. A linear classifier wants more, because a low-variance direction can still be a separating one. Choose n_components by cross-validating the pipeline, and quote the variance retained as a description, not a justification."
    },

    { t: "h2", n: "03", text: "The two claims PCA makes, and when they are false", id: "claims" },

    { t: "code", lang: "python", title: "Claim 1 — high variance is where the information is. The rings say otherwise (executed)",
      hl: [2, 3, 5, 6],
      code: `# two concentric rings, 500 points
#   linear PCA:  PC1 as a class separator, AUC 0.503                           <- the rings share a centre; every linear direction is useless
#   RBF kernel PCA, γ = 1:  AUC of kernel components 1..4 as separators: [0.501, 0.503, 1.000, 0.501]
#                                                                           ^^^^^ the THIRD component is the radius; the first two (more variance) are the angle
#   logistic on kernel-PCA(2): 0.458       on kernel-PCA(4): 1.000            <- keep two 'top' components and you keep the wrong ones
#   γ = 20: components 1..4 give [0.516, 0.514, 0.580, 0.534] -- too local a kernel, and the structure spreads across many components
#   the explicit feature r² = x₁² + x₂²: AUC 1.000                              <- one line of domain knowledge beats the kernel`,
      caption: "PCA ranks directions by variance; the target does not care about variance. Here the angular spread around each ring is the largest source of variance and carries no class information, while the radius — small variance, since the rings are thin — is the whole story. Kernel PCA can represent it but still ranks it third. 5.1's KNN experiment was the same lesson in another form: after standardising, noise columns have exactly the variance of signal columns, and PCA keeps them. Supervised reduction (LDA, 7.5) or supervised selection (3.5) looks at the target; PCA never does."
    },

    { t: "code", lang: "python", title: "Claim 2 — fewer components help the model. The churn data, 5-fold AUC (executed)",
      hl: [2, 3, 5, 6, 8, 9, 10],
      code: `#   model                                   AUC
#   logistic, all 12 columns               0.7664
#   logistic, PCA to 5                     0.6702      <- the dropped components carried the signal
#   logistic, PCA to 8                     0.7597
#   KNN-51, all 12                         0.7525
#   KNN-51, PCA to 5                       0.6498
#   forest, all 12                         0.7388
#   forest, PCA to 5                       0.6899
#   forest, PCA to 12 (rotation only)      0.7481      <- all the information, in rotated coordinates: the trees gain oblique splits

# where reduction does help -- 60 noisy linear mixtures of 20 latent factors, n = 1,500 (executed)
#   logistic raw 0.9358    PCA 20 0.9403           forest raw 0.8849    PCA 20 0.9067           HistGB raw 0.9025    PCA 20 0.9029
#   the forest gains 0.02 because the 20 components ARE the latent factors: fewer, cleaner columns to split on`,
      caption: "On a table of twelve mostly independent columns there is no redundancy to remove, and every component dropped is signal lost — for every model family. PCA pays off when the columns are noisy mixtures of fewer underlying factors (sensor arrays, spectra, pixel neighbourhoods, correlated survey items): the components recover the factors, the noise is averaged, and a forest that struggled with 60 correlated columns does better on 20 clean ones. Rotation without truncation is a separate trick: it costs nothing in information and gives axis-aligned models diagonal splits."
    },

    { t: "callout", kind: "trap", title: "Fit PCA inside the pipeline, on the training fold", body: [
      { t: "p", text: "PCA is unsupervised, so fitting it on all rows leaks no labels — but it leaks the test rows' *distribution* into the components, and the reported score is then not the score a new batch would get. It also silently breaks any comparison in which the reduced model saw data the unreduced one did not. `make_pipeline(StandardScaler(), PCA(k), model)` inside cross-validation is the only honest arrangement (3.5), and it makes `n_components` a hyperparameter you can grid-search like any other." }
    ]},

    { t: "h2", n: "04", text: "The toolkit around PCA", id: "toolkit" },

    { t: "code", lang: "python", title: "Whitening, solvers at scale, random projections, NMF (executed)",
      hl: [2, 5, 6, 7, 11, 12, 16, 17, 18],
      code: `# whitening: PCA(5, whiten=True) on the churn numerics -> score variances [0.999 ×5], max off-diagonal |corr| 0.0000: identity covariance

# solvers, 20,000 × 500, top 20 components
#   svd_solver="full"          0.60 s     top eigenvalues [20.9, 20.6, 20.3]
#   svd_solver="randomized"    0.25 s     [20.8, 20.4, 20.3]         <- approximate, and the default for large inputs; 2-3× faster here, far more on tall matrices
#   IncrementalPCA(batch 2000) 1.09 s     [20.3, 20.1, 20.0]         <- never holds the matrix: for data that does not fit in memory, or streams

# random projection, 500 rows × 2,000 features, Gaussian random matrix, no fitting
#   Johnson-Lindenstrauss: to preserve all pairwise distances within ±20 % you need k ≥ 1,434 dimensions
#   k = 100:   distance ratios (projected/original) mean 0.996, 5th-95th percentile 0.881-1.113
#   k = 500:   0.999, 0.948-1.051
#   k = 2000:  0.999, 0.973-1.025

# NMF (non-negative) vs LSA (signed) on newsgroup tf-idf, four factors
#   NMF topic 2: game, team, hockey, play, games, season, players           NMF topic 3: israel, israeli, jews, armenian, armenians, turkish
#   NMF topic 1: geb, cadre, dsl, n3jxp, chastity, skepticism, surrender   <- the same e-mail signature as 7.3: NMF found it as a 'topic'
#   LSA component 1:  + geb, cadre, dsl, n3jxp, chastity   − game, team, space, like    <- signed: 'signature minus sport', which no one can read
#   NMF weights min 0.000; LSA scores min −0.273`,
      caption: "Randomised SVD is what makes PCA routine on large matrices; incremental PCA is for data larger than memory. Random projection is the extreme: no fitting, distances preserved in expectation, and the JL bound saying how many dimensions that needs — useful as a first squeeze on very wide sparse data before a learned method. NMF's non-negativity turns 'a component' into 'a part' — a topic is a bag of words that co-occur, never words that anti-occur — which is why it is the factorisation for text, spectra and images of things that add up."
    },

    { t: "table",
      head: ["Method", "Fits to", "Linear?", "Preserves", "Use for", "Watch out"],
      rows: [
        ["PCA", "Covariance (variance directions)", "Yes", "Global variance; uncorrelated scores", "Decorrelation, compression, denoising factor mixtures, visualisation", "Variance ≠ relevance; scale first; truncation discards signal"],
        ["Kernel PCA", "Kernel matrix (n × n)", "No", "Variance in kernel feature space", "Non-linear structure with a known kernel", "O(n²); the useful component may not be first; γ to tune"],
        ["Randomised / incremental PCA", "Same as PCA", "Yes", "Same, approximately", "Large or streaming matrices", "Small accuracy loss; batch size"],
        ["Random projection", "Nothing", "Yes", "Pairwise distances (JL)", "A cheap first squeeze on very wide data", "Needs many dimensions for tight ε"],
        ["Truncated SVD (LSA)", "Sparse X directly", "Yes", "Variance, without centring", "Sparse text matrices", "Signed components"],
        ["NMF", "X ≈ WH, W, H ≥ 0", "Yes", "Additive parts", "Topics, spectra, images", "Non-unique; needs non-negative input; local optima"],
        ["LDA (7.5)", "Between/within class scatter", "Yes", "Class separation", "Supervised reduction", "At most K − 1 components; assumes shared covariance"]
      ]
    },

    { t: "ladder",
      title: "Reducing 300 sensor channels to a feature set for a fault detector",
      rungs: [
        { level: "bad", label: "PCA(10) on raw channels, fitted on everything", code: `PCA(10).fit(all_channels); model.fit(pca.transform(train))`,
          note: "**Unscaled channels (one in volts, one in millivolts), ten components chosen for round-ness, and a fit that saw the test period.** The highest-variance channel is a component by itself." },
        { level: "ok", label: "Scaled, inside the pipeline, k by CV", code: `GridSearchCV(make_pipeline(StandardScaler(), PCA(), clf), {"pca__n_components": [5, 10, 20, 40, 80]}, cv=TimeSeriesSplit(5))`,
          note: "**Honest and tuned** — and if the fault signature lives in a low-variance channel, no k will keep it." },
        { level: "best", label: "Reduce for the mixtures, keep the domain channels, and check what was dropped", code: `pre = ColumnTransformer([("mix", make_pipeline(StandardScaler(), PCA(0.95)), correlated_channels), ("keep", StandardScaler(), diagnostic_channels)])
# fit inside CV; report which channels load on the kept components; run the detector with and without reduction on the same folds;
# for the fault class, check the reconstruction error of fault windows vs normal ones (9.5: PCA reconstruction as an anomaly score)`,
          note: "**Compression where there is redundancy, no compression where a single channel is the signal, and the dropped variance inspected rather than assumed to be noise.**" }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "An eigenproblem by hand, a projection, and a reduction you must evaluate honestly",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** For the covariance Σ = [[3, 1], [1, 3]], find both eigenvalues and unit eigenvectors by hand, the explained variance ratios, and the coordinates of the point (2, 0) in the principal axes. **(b)** For Σ = [[4, 0], [0, 1]] show that PCA is the identity rotation, and explain what standardising the two features first would do to the components. **(c)** On the digits data, fit `PCA(k)` for k in {2, 5, 10, 20, 40} inside a pipeline with a random forest, report 5-fold accuracy against the raw-pixel forest, and explain the pattern in terms of what a tree does with rotated coordinates." }
      ],
      requirements: [
        "(a) eigenvalues, unit eigenvectors, ratios, and the projected coordinates.",
        "(b) the argument, and the effect of standardisation.",
        "(c) six accuracies and the explanation."
      ],
      hint: "(a) A symmetric 2 × 2 with equal diagonals has eigenvectors (1, 1)/√2 and (1, −1)/√2. (b) A diagonal covariance is already diagonalised. (c) A forest on raw pixels splits on single pixels; on components it splits on pixel *combinations*.",
      solution: {
        lang: "python",
        title: "pca_practice.py",
        code: `# (a) Σ = [[3, 1], [1, 3]]:  det(Σ - λI) = (3 - λ)² - 1 = 0  ->  λ = 4, 2
#   λ = 4:  (3 - 4)w₁ + w₂ = 0  ->  w ∝ (1, 1)  ->  PC1 = (1, 1)/√2 = (0.707, 0.707)
#   λ = 2:  w ∝ (1, -1)          ->  PC2 = (0.707, -0.707);   PC1 · PC2 = 0
#   ratios: 4/6 = 0.667, 2/6 = 0.333
#   point (2, 0): scores = (2, 0) · PC1 = 1.414;  (2, 0) · PC2 = 1.414   ->  (1.414, 1.414) in the principal axes
#   (a 45° rotation: the point on the x-axis lands on the diagonal of the new frame)

# (b) Σ = [[4, 0], [0, 1]] is diagonal: its eigenvectors are the axes themselves, (1, 0) with λ = 4 and (0, 1) with λ = 1.
#   PCA(2) returns the identity (up to sign); PCA(1) keeps the first feature and drops the second: 80 % of the variance, and
#   every bit of whatever the second feature knew. Standardising first makes Σ = [[1, 0], [0, 1]]: both eigenvalues 1, the ratio 50/50,
#   and the components are ARBITRARY (any orthonormal pair diagonalises the identity) -- PCA has nothing to find when features are
#   uncorrelated and equally scaled. That is the churn numerics' situation after standardising (ratios 35/21/20/19/5), and why truncation hurt.

# (c) executed (5-fold, 300 trees):   raw pixels 0.9772
#   PCA k =  2: 0.621     5: 0.915     10: 0.956     20: 0.969     40: 0.973     64: 0.973
#   truncation costs what it discards (k = 20 is 0.008 below raw); rotation without truncation (k = 64) is 0.005 BELOW raw here, not above:
#   on digit images a single pixel is already a meaningful split (stroke present or not), so the oblique cuts that helped the churn forest
#   (0.739 -> 0.748 at PCA 12) buy nothing, and the rotation mixes noise pixels into every component. Whether rotation helps a tree is an
#   empirical question about the basis -- which is why it is answered by cross-validation, not by the variance curve.`,
        notes: [
          { t: "p", text: "**(a)** is the whole computation at the size where it is transparent: a symmetric matrix, two orthogonal directions, the projection as two dot products." },
          { t: "p", text: "**(b)** is the case PCA cannot help with, and it is common: independent, standardised features have no principal directions worth the name." },
          { t: "p", text: "**(c)** separates the two things `PCA(k)` does — rotate and truncate — and shows that even the rotation is not free: it helped the churn forest and cost the digits forest 0.005." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Kernel PCA of the rings put the class-separating direction third, behind two components with no class information. Why?",
          options: [
            "The kernel was wrong",
            "PCA — kernel or linear — orders components by variance, and the angular spread around each ring is the largest source of variance in the kernel feature space while the radius, which separates the rings, is thin and low-variance. Variance is not relevance: an unsupervised method cannot know which direction the target cares about. Keeping the 'top two' kept the useless ones (logistic 0.458); keeping four found it (1.000); the explicit feature r² found it in one line",
            "Because γ was too small",
            "Because the rings were not centred"
          ],
          answer: 1,
          why: "The same reason PCA kept noise columns in 5.1: after standardising, noise has the variance of signal."
        }
      ]
    }
  ],

  takeaways: [
    "**Maximise wᵀΣw subject to ‖w‖ = 1 → Σw = λw**: components are the covariance's eigenvectors, eigenvalues are their variances, ratios are shares of the trace.",
    "**By hand**: Σ = [[2, 0.8], [0.8, 0.6]] → λ = 2.363, 0.237 (90.9 %), PC1 = (0.911, 0.413); the SVD gives the same on 5,000 rows (λ = d²/n, V = components).",
    "**Scale first**: unscaled, PC1 of the churn numerics was the tenure column (loading 1.00, 80 % of variance); standardised, it was fee + logins.",
    "**Choose k by the model, describe it by variance**: digits 90 % at 21 components; KNN 0.975 at 10, logistic 0.963 at 30; reconstruction RMSE 0.183 → 0.029 from 5 to 40.",
    "**Variance is not relevance**: the rings' separating direction was kernel component 3 (AUC 1.000) behind two useless ones; r² as a feature did it in one line.",
    "**Truncation discards signal on non-redundant tables**: churn logistic 0.766 → 0.670 at 5 components, KNN 0.753 → 0.650, forest 0.739 → 0.690; rotation alone helped the forest (0.748).",
    "**Reduction helps when columns are noisy mixtures of fewer factors**: 60 mixtures of 20 factors → forest 0.885 → 0.907 at PCA 20.",
    "**Fit PCA inside the pipeline on the training fold**; n_components is a hyperparameter.",
    "**Whitening** makes scores identity-covariance; **randomised SVD** is 2–3× faster; **incremental** streams; **random projection** preserves distances with no fit (JL: 1,434 dims for ±20 % on 500 rows).",
    "**NMF gives additive parts** (four readable topics, one of them an e-mail signature) where LSA gives signed mixtures."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Derive PCA and state what the eigenvalues and eigenvectors of the covariance matrix represent.",
        options: [
          "PCA minimises reconstruction error; eigenvalues are the errors",
          "Seek the unit direction w maximising the projected variance wᵀΣw; the Lagrangian condition is Σw = λw, so w is an eigenvector of the covariance matrix and λ, the variance along it, is its eigenvalue. Sorting by λ gives orthogonal components whose scores are uncorrelated with variances λᵢ; the SVD X = UDVᵀ computes them as V with λᵢ = dᵢ²/n. (Minimum reconstruction error is the equivalent dual view)",
          "PCA fits a regression of each feature on the others",
          "Eigenvectors are cluster centres; eigenvalues are cluster sizes"
        ],
        answer: 1,
        why: "For Σ = [[2, 0.8], [0.8, 0.6]] the polynomial λ² − 2.6λ + 0.56 gives 2.363 and 0.237, and Σw₁ = 2.363w₁ checks."
      },
      {
        stem: "Why must features be standardised before PCA, and when does standardising leave PCA nothing to do?",
        options: [
          "Standardising is optional; PCA is scale-invariant",
          "PCA maximises variance in the given units, so the widest column owns PC1 (tenure: loading 1.00, 80 % of variance). Standardising equalises the units so that correlation, not scale, decides the directions. If the standardised features are uncorrelated, the covariance is the identity, every eigenvalue is 1, and the components are arbitrary — there is no dominant direction to find, and truncation can only discard signal (the churn numerics: ratios 35/21/20/19/5)",
          "Standardising is needed only for kernel PCA",
          "Standardising makes all eigenvalues equal to the number of features"
        ],
        answer: 1,
        why: "PCA is a statement about correlation structure; without correlation there is no statement."
      },
      {
        stem: "How do you choose the number of components?",
        options: [
          "Keep components until 95 % of the variance is explained",
          "Use the cumulative variance and scree as a description (digits: 90 % at 21, elbow near 5) but choose by cross-validating the downstream pipeline with n_components as a hyperparameter — KNN was within 0.011 of full accuracy at 10 components, logistic needed 30 — because the variance retained says nothing about the relevance retained, and the right k differs by model",
          "Use the elbow of the scree plot",
          "Keep √p components"
        ],
        answer: 1,
        why: "On the churn table no k below 12 was right for any model; on 60 factor mixtures 20 was right for all of them."
      },
      {
        stem: "A colleague applies PCA(5) before a random forest 'to reduce overfitting' and the AUC drops from 0.739 to 0.690. Diagnose.",
        options: [
          "The forest needed more trees",
          "The twelve columns are mostly independent, so the seven dropped components held real signal; a forest does not overfit from twelve columns anyway. PCA before a tree model helps only when the columns are noisy mixtures of fewer factors (0.885 → 0.907 on 60 mixtures of 20 factors); on non-redundant tables rotation without truncation (PCA(12): 0.748) is the only version that can help, by giving the trees oblique splits",
          "PCA should have been fitted on the test set too",
          "Trees cannot use PCA outputs"
        ],
        answer: 1,
        why: "Two operations — rotate and truncate — with opposite effects; ask which one is wanted."
      },
      {
        stem: "When would you use kernel PCA, random projection or NMF instead of PCA?",
        options: [
          "Never; PCA is always sufficient",
          "Kernel PCA for non-linear structure a known kernel captures (the rings' radius appeared as kernel component 3), accepting O(n²) and that the useful component may not be first; random projection as a fit-free first squeeze on very wide data, with the JL bound sizing k for a distance tolerance; NMF when the data are non-negative and additive — text, spectra, images — because its parts are readable where LSA's signed components ('signature minus sport') are not",
          "Kernel PCA for large data, NMF for negative data",
          "Random projection whenever PCA is too accurate"
        ],
        answer: 1,
        why: "Each relaxes one of PCA's commitments: linearity, fitting, or signed factors."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain PCA from first principles and how it is computed.",
        strong: "Centre the data and ask for the unit direction along which the projected values vary most. The variance of the projection is wᵀΣw with Σ the covariance matrix; maximising it subject to wᵀw = 1 by a Lagrange multiplier gives Σw = λw, so the direction is an eigenvector of the covariance and the variance it captures is the eigenvalue. Repeating orthogonally to the directions already found gives the full set: orthogonal components, uncorrelated scores, eigenvalues that sum to the total variance so each component's share is λᵢ over the trace. On a 2 × 2 covariance [[2, 0.8], [0.8, 0.6]] the characteristic polynomial λ² − 2.6λ + 0.56 gives 2.363 and 0.237, so the first direction, (0.911, 0.413), carries 91 % of the variance. In practice it is computed by the singular value decomposition of the centred matrix, X = UDVᵀ: the columns of V are the components and dᵢ²/n the eigenvalues, without ever forming Σ, and randomised or incremental SVD handle large or streaming matrices. Two practical rules follow from the derivation: standardise first, because variance is measured in the features' units and one wide column will own the first component; and fit inside the pipeline on the training fold, because the components depend on the rows they were fitted to.",
        answer: [
          { t: "p", text: "Objective, Lagrangian, eigenproblem, the hand computation, the SVD route, and the two practical rules." }
        ]
      },
      {
        level: "core",
        q: "How many components should you keep, and what are the pitfalls of using PCA before a model?",
        strong: "The variance curve is a description, not a decision: on the digits, 90 % of the variance takes 21 components and the scree elbow is near five, but a nearest-neighbour classifier was within a point of its full accuracy at ten components while logistic regression needed thirty, because a low-variance direction can still be a separating one. So I make n_components a hyperparameter of the pipeline and cross-validate it with the model. The pitfalls are the two things PCA assumes. First, that variance is relevance: on concentric rings the separating direction was the third kernel component behind two high-variance ones with no class information, and on standardised data with noise columns the noise has the same variance as the signal, so PCA keeps it. Second, that fewer components help: on a table of twelve mostly independent churn columns, truncating to five cost every model 0.05 to 0.10 of AUC, because there was no redundancy to remove — PCA pays off when the columns are noisy mixtures of fewer factors, where the components recover the factors and a forest gained 0.02. And the operational pitfall: fitting PCA on all rows leaks the test distribution into the components; it goes inside the cross-validated pipeline.",
        answer: [
          { t: "p", text: "Variance as description versus CV as decision, the two false assumptions with executed evidence, and the leakage rule." }
        ]
      },
      {
        level: "advanced",
        q: "PCA and LDA both reduce dimension. When would each be wrong, and what would you use instead?",
        strong: "PCA is unsupervised and ranks directions by variance; LDA is supervised and ranks them by how well they separate classes relative to within-class spread. PCA is wrong when the discriminative direction is low-variance — the rings, where the radius was the third kernel component — or when the table has no redundancy, where any truncation discards signal. LDA is wrong when its assumptions fail: it gives at most K − 1 directions, so a binary problem gets one line; it assumes classes share a covariance and are roughly Gaussian, so it flattens non-linear class structure; and being supervised it must be fitted inside the folds or it leaks the labels into the features. The alternatives depend on the goal. For a downstream classifier, supervised feature selection or simply the model's own regularisation usually beats either — a penalised logistic model or a boosted tree does its own reduction. For non-linear structure, kernel PCA with the caution that the useful component may not be first, or a learned embedding. For visualisation, t-SNE or UMAP, which are not inputs to anything. For text and other non-negative data, NMF for parts. And when I do reduce, I keep the components that a cross-validated pipeline says the model needs, report the variance retained as a description, and inspect what was dropped rather than calling it noise.",
        answer: [
          { t: "p", text: "The variance-versus-separation distinction, each method's failure conditions, and the alternatives matched to the goal." }
        ]
      }
    ]
  }
});
