/* ============================================================================
   LESSON 7.5 — LDA, t-SNE and UMAP
   ========================================================================= */
EC.receiveLesson({
  id: "7.5",

  lede: "**PCA asks where the data vary; this lesson's three methods ask different questions. Linear discriminant analysis asks where the classes separate — it is supervised, its criterion is worked by hand, and on data where the discriminative direction is the low-variance one it finds it (AUC 0.920) where PC1 does not (0.519). t-SNE and UMAP ask which points are neighbours and draw a map in which neighbours stay close — and nothing else survives: cluster sizes, distances between clusters, even the existence of clusters (pure Gaussian noise gets lumps with silhouette 0.34).** Every claim is executed: the Fisher ratio 12.9 against 12.5 for the x-axis; digits maps at four perplexities with trustworthiness and a KNN check; two seeds giving identical maps and two 'clusters' whose distance in the map correlates 0.72 with their distance in the data; the Swiss roll unrolled by Isomap and LLE (0.99) but not PCA (0.22). The lesson ends where these methods must: t-SNE cannot embed a new point at all, UMAP can, and none of them is a feature.",

  objectives: [
    "Derive Fisher's criterion, solve it by hand, and explain why LDA finds directions PCA discards and why it has at most K − 1 of them",
    "Use LDA as a classifier and as a supervised reduction, inside the pipeline",
    "Explain t-SNE's objective, perplexity and the Student-t trick, and list what its maps do and do not preserve — with evidence",
    "Place UMAP, Isomap and LLE, read trustworthiness, and state why embeddings are visualisations rather than inputs"
  ],

  prerequisites: ["7.4", "4.5", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "LDA: the direction that separates, not the direction that varies", id: "lda" },

    { t: "code", lang: "text", title: "Fisher's criterion, worked on two classes of four points (executed)",
      code: `within-class scatter   S_W = Σ_c Σ_{i∈c} (xᵢ - μ_c)(xᵢ - μ_c)ᵀ         how spread each class is around its own mean
between-class scatter  S_B = Σ_c n_c (μ_c - μ)(μ_c - μ)ᵀ                how far the class means sit from the grand mean

Fisher ratio  J(w) = (wᵀ S_B w) / (wᵀ S_W w)        separation of the projected means over spread of the projected classes
∂J/∂w = 0   ->   S_B w = λ S_W w   ->   S_W⁻¹ S_B w = λ w         a generalised eigenproblem; the top eigenvectors are the discriminant directions
S_B is built from K class means around one grand mean, so its rank is at most K - 1: LDA gives AT MOST K - 1 directions (one, for two classes)
for two classes the eigenvector is w ∝ S_W⁻¹ (μ_B - μ_A)

class A: (1,2) (2,3) (3,3) (2,1)      class B: (6,5) (7,7) (8,6) (7,5)
   μ_A = (2, 2.25),  μ_B = (7, 5.75),  μ = (4.5, 4)
   S_W = [[4, 2], [2, 5.5]]           S_B = [[50, 35], [35, 24.5]]   (rank 1)
   w ∝ S_W⁻¹ (5, 3.5) = (1/18) [[5.5, -2], [-2, 4]] (5, 3.5) = (1.139, 0.222)   ->  unit (0.9815, 0.1915)        scikit-learn scalings_: (0.9815, 0.1915)
   J(w) = 12.94        J along the x-axis 12.50,  along the y-axis 4.46,  along the raw mean-difference direction (μ_B - μ_A) 11.69
   projections onto w:  A -> 1.37, 2.54, 3.52, 2.15      B -> 6.85, 8.21, 9.00, 7.83      threshold at the projected-mean midpoint 5.18: perfectly separated`,
      caption: "The mean-difference direction is not the best direction: S_W⁻¹ tilts it away from the axis along which the classes are internally spread (y, with within-scatter 5.5) and toward the one along which they are tight. That is the whole idea — separation *relative to* spread — and it is the reason LDA can prefer a low-variance direction. As a classifier, LDA assumes each class is Gaussian with a shared covariance, in which case the Bayes boundary is linear; QDA drops the sharing and gets a quadratic boundary at the cost of a covariance per class."
    },

    { t: "code", lang: "python", title: "When the discriminative direction is the low-variance one (executed; x₁ ~ N(0, 5) noise, x₂ shifted by 1.2 between classes with sd 0.6)",
      hl: [2, 3, 5, 6],
      code: `# PCA components: PC1 = (1.000, -0.009) with 97.2 % of the variance;  PC2 = (0.009, 1.000) with 2.8 %
#   AUC of PC1 as a class score 0.519       AUC of PC2 0.920            <- the class information is entirely in the 2.8 % component
# LDA direction (0.001, 1.000):  AUC of the LDA score 0.920            <- found at once
#   KNN-15 on PCA(1)  0.519       KNN-15 on LDA(1)  0.832       KNN-15 on both raw features  0.812
#   (LDA(1) beats the raw features: the noise axis is gone, and the neighbourhood is computed on the signal alone)`,
      caption: "This is the case 7.4 warned about, resolved. PCA keeps the 97 % direction because it is unsupervised and variance is all it can see; LDA keeps the 3 % direction because the labels say so. When labels exist and a linear projection is wanted, LDA is the reduction to try first — with its two limits in mind: K − 1 directions at most, and a shared-covariance Gaussian assumption that non-linear class shapes violate."
    },

    { t: "code", lang: "python", title: "LDA on the digits: classifier, reduction, and the leak (executed, 5-fold accuracy)",
      hl: [2, 4, 5, 8, 9, 11],
      code: `#   LDA classifier, shrinkage="auto"          0.955      <- shrinkage regularises S_W (64 pixels, some nearly constant: S_W is ill-conditioned)
#   LDA classifier, no shrinkage              0.951
#   QDA (reg_param 0.1)                       0.982      <- per-class covariance: digit classes really do differ in shape
#   logistic regression                       0.969
#   LDA(9) -> KNN-5                           0.966      <- 9 = K − 1 components, chosen to separate
#   PCA(9) -> KNN-5                           0.976      <- 9 components chosen for variance: better here, because pixel variance IS mostly digit identity
#   PCA(20) -> KNN-5                          0.983

#   LDA(9) fitted on ALL rows, then KNN cross-validated on its output:   0.979
#   LDA(9) fitted inside each fold:                                       0.966      <- the difference (0.013) is label leakage through the projection`,
      caption: "Two lessons in one table. LDA's 9-direction cap is a real constraint when there is more structure than K − 1 dimensions can hold — the digits have it, and PCA(20) wins — and QDA's per-class covariance beats both linear models when classes differ in shape. And LDA is supervised: fitting it on the full data before cross-validating anything downstream leaks the labels through the projection, and the 0.013 is exactly the kind of gain that is not real (3.5)."
    },

    { t: "dl", items: [
      ["Fisher ratio", "wᵀS_Bw / wᵀS_Ww: projected between-class scatter over projected within-class scatter. Maximised by the eigenvectors of S_W⁻¹S_B."],
      ["K − 1 cap", "S_B is built from K means around one grand mean: rank ≤ K − 1, so LDA yields at most K − 1 discriminant directions."],
      ["Shrinkage LDA", "S_W regularised toward a diagonal; needed when p is large or features are nearly collinear (digits: 0.955 vs 0.951)."],
      ["QDA", "A covariance per class; quadratic boundaries; p(p + 1)/2 parameters per class, so it needs data (digits: 0.982)."],
      ["Perplexity", "t-SNE's effective neighbourhood size: each point's Gaussian bandwidth is set so that its neighbour distribution has entropy log(perplexity). 5–50 is the usual range; it is a scale choice, not a truth."],
      ["Crowding problem", "In two dimensions there is less room around a point than in fifty; a Gaussian in the map would pack moderate neighbours too tightly. The Student-t's heavy tail lets them spread."],
      ["Trustworthiness", "The share of a point's k nearest map-neighbours that were also near it in the input, penalised by how far away they really were. 1.0 = no false neighbours."],
      ["Transductive", "t-SNE has no mapping function: new points cannot be embedded without re-running on everything. UMAP learns a mapping and has `transform`."]
    ]},

    { t: "h2", n: "02", text: "t-SNE: neighbours preserved, everything else negotiable", id: "tsne" },

    { t: "code", lang: "text", title: "The objective",
      code: `high-dimensional similarities:   p_{j|i} = exp(-‖xᵢ - xⱼ‖² / 2σᵢ²) / Σₖ exp(-‖xᵢ - xₖ‖² / 2σᵢ²),   symmetrised  pᵢⱼ = (p_{j|i} + p_{i|j}) / 2n
      each σᵢ is found by binary search so that the entropy of p_{·|i} equals log(perplexity): every point gets the same EFFECTIVE number of neighbours
low-dimensional similarities:    qᵢⱼ = (1 + ‖yᵢ - yⱼ‖²)⁻¹ / Σ_{k≠l} (1 + ‖yₖ - yₗ‖²)⁻¹                    a Student-t with one degree of freedom
objective:                       minimise KL(P ‖ Q) = Σᵢ≠ⱼ pᵢⱼ log(pᵢⱼ / qᵢⱼ)   by gradient descent on the map coordinates y

KL is asymmetric: a large pᵢⱼ (true neighbours) placed far apart (small qᵢⱼ) costs a lot; a small pᵢⱼ (non-neighbours) placed close costs little.
so the map is FAITHFUL ABOUT NEIGHBOURS and indifferent about everything else -- distances between clusters, cluster sizes, global layout.
the heavy-tailed q lets moderately-distant points sit far apart in the map, which is what pulls clusters apart and makes the pictures.`,
      caption: "Read the asymmetry and you can predict every artefact in the next block. The objective rewards keeping neighbours together; it does not reward keeping non-neighbours at their true distance, so gaps between clusters are whatever the optimisation found convenient, and dense regions are spread until their neighbours are resolved, so cluster sizes in the map reflect local density, not extent."
    },

    { t: "code", lang: "python", title: "The digits (1,000 rows, PCA to 30 first): perplexity, seeds, and what survives (executed)",
      hl: [2, 3, 4, 5, 8, 10, 11, 13],
      code: `#   perplexity    class silhouette in the map    KNN-5 accuracy in the map    trustworthiness (k=10)    time
#        2                 0.272                        0.979                      0.981               1.3 s
#        5                 0.399                        0.988                      0.990               1.3 s
#       30                 0.527                        0.986                      0.993               1.6 s      <- the default, and the cleanest map
#      100                 0.418                        0.977                      0.989               3.4 s
#   PCA(2) for comparison:  silhouette 0.090,  KNN-5 0.578,  trustworthiness 0.802

#   two seeds at perplexity 30, Procrustes disparity after rotation and scaling: 0.000      <- with init="pca" the maps are reproducible
#   inter-class centroid distances, input space vs map: correlation 0.716                   <- 'cluster A is far from cluster B' is half true
#   class spreads, input space vs map: correlation 0.677; map spreads range 3.9-14.2 while input spreads range 1.10-1.85   <- sizes are inflated and reordered
#   pure Gaussian noise, 500 × 30, perplexity 5: k-means(5) on the map has silhouette 0.339; on the input, 0.025          <- lumps from nothing`,
      caption: "What the numbers say. The neighbourhoods are real: a KNN classifier on the two map coordinates scores 0.986, against 0.578 on the first two principal components, and trustworthiness is 0.99. The rest is not: distances between clusters correlate 0.7 with the truth, sizes are stretched by a factor that varies by cluster, and noise with no structure at all comes out lumpy at low perplexity. The right reading of a t-SNE map is 'these points are neighbours of those'; the wrong readings are 'this cluster is bigger', 'these two clusters are close', and 'there are clusters'."
    },

    { t: "callout", kind: "trap", title: "How to read a t-SNE plot, and how not to", body: [
      { t: "p", text: "**Do**: trust that points drawn together are neighbours in the input; try perplexities 5, 30 and 50 and believe only what survives all three; PCA to ~50 dimensions first for speed and denoising; use `init=\"pca\"` and a fixed seed for reproducibility; report trustworthiness. **Do not**: read cluster size (stretched 4–14× here, in a different order), read the gap between clusters (correlation 0.7 with reality), count clusters in noise (silhouette 0.34 from Gaussian noise), colour by a variable and infer a gradient across the map, or use the coordinates as features — t-SNE has no `transform`, so a new point cannot even be placed without re-running the whole embedding with it included." }
    ]},

    { t: "h2", n: "03", text: "UMAP, Isomap, LLE: the manifold family", id: "manifold" },

    { t: "code", lang: "python", title: "UMAP on the same digits, and the Swiss roll under four methods (executed)",
      hl: [2, 3, 6, 10, 11, 12],
      code: `#   UMAP(n_neighbors 15, min_dist 0.1)    class silhouette 0.577    KNN-5 0.988    trustworthiness 0.989    centroid-distance corr 0.625    1.2-2 s after JIT compilation
#   UMAP(5, 0.1)                          0.592                     0.989          0.988                    0.602
#   UMAP(50, 0.5)                         0.458                     0.969          0.982                    0.680          <- larger n_neighbors: more global, less crisp
#   UMAP fitted on 70 % of the digits, transform() applied to the other 30 %: KNN-5 test accuracy 0.976       <- a mapping exists; t-SNE has none
#   UMAP on pure noise (n_neighbors 5): k-means silhouette in the map 0.345                                    <- the same lumps as t-SNE

#   Swiss roll (a 2-D sheet rolled in 3-D):  |corr| of a map axis with the true unrolled coordinate    trustworthiness
#     PCA(2)                                   0.224                                                       0.975      <- a linear projection sees the roll edge-on
#     Isomap(2, 10 neighbours)                 0.992                                                       0.999      <- geodesic distances along the neighbour graph unroll it
#     LLE(2, 10 neighbours)                    0.995                                                       0.995
#     UMAP(15, 0.1)                            0.954                                                       0.999
#     t-SNE(perplexity 30)                     0.878                                                       1.000      <- neighbours perfect; the global sheet only partly recovered`,
      caption: "All four non-linear methods start from a k-nearest-neighbour graph and differ in what they preserve from it: Isomap the geodesic distances along the graph (global, so the roll unrolls to a rectangle), LLE the local linear reconstruction weights, t-SNE and UMAP the neighbourhood memberships with a fuzzy-set or probabilistic loss. UMAP's larger `n_neighbors` trades local crispness for more global layout, which is why it is usually the better-looking map and the more honest one about inter-cluster distances (0.68 vs 0.72 — still not to be read as distances). Its decisive practical advantage is `transform`."
    },

    { t: "code", lang: "python", title: "Embeddings as inputs, on a held-out 30 % of the digits (executed)",
      code: `#   t-SNE(2) -- computed on train + test JOINTLY, the only way it can be done:   KNN-5 test accuracy 0.983
#       ...and undeployable: the next digit to arrive cannot be embedded without re-running on all 1,797 + 1
#   PCA(2)    fitted on train, applied to test:                                  0.606
#   PCA(30)   fitted on train, applied to test:                                  0.983
#   LDA(9)    fitted on train, applied to test:                                  0.963
#   UMAP(15)  fitted on train, transform() on test:                              0.976`,
      caption: "t-SNE's 0.983 looks like a feature; it is a leak in a lab coat, because the test rows shaped the map they were then scored on, and in production there is no map for a new row. PCA and LDA are functions fitted once and applied forever; UMAP is too, at some cost in fidelity for out-of-sample points. Even so, the argument of 7.4 holds: a downstream model given PCA(30) does as well as any embedding, and a model given the raw pixels with its own regularisation does better still. Embeddings are for looking, and occasionally for a distance-based method that needs a small, dense space."
    },

    { t: "table",
      head: ["Method", "Supervised?", "Preserves", "New points?", "Cost", "Use for", "Do not"],
      rows: [
        ["PCA (7.4)", "No", "Global variance", "Yes", "O(np²) or randomised", "Decorrelation, compression, denoising", "Expect it to keep low-variance signal"],
        ["LDA", "Yes", "Class separation (Fisher)", "Yes", "Cheap", "Supervised reduction to ≤ K − 1 dims; a linear classifier with shared covariance", "Fit outside the folds; expect non-linear class shapes"],
        ["t-SNE", "No", "Neighbourhoods", "No", "O(n log n) with Barnes–Hut; slow at scale", "Visualising cluster structure; EDA", "Read sizes, gaps, or noise; use as features"],
        ["UMAP", "No (can be)", "Neighbourhoods + some global layout", "Yes (transform)", "Fast after compilation", "Visualisation; occasionally a dense space for distance methods", "Read gaps as distances; skip the multi-setting check"],
        ["Isomap", "No", "Geodesic distances on the k-NN graph", "Yes", "O(n²) shortest paths", "Unrolling a single smooth manifold", "Use with disconnected or noisy graphs"],
        ["LLE", "No", "Local linear reconstruction", "Limited", "O(n) neighbourhoods + sparse eigenproblem", "Same, at lower cost", "Expect robustness to noise"]
      ]
    },

    { t: "ladder",
      title: "Presenting 50,000 customer embeddings to a product team",
      rungs: [
        { level: "bad", label: "One t-SNE plot with 'six customer types'", code: `TSNE(2).fit_transform(X); plt.scatter(...)      # one perplexity, one seed, sizes and gaps in the narrative`,
          note: "**Six lumps at perplexity 30 that may be three at 5 and two at 100** — and noise makes lumps too (silhouette 0.34 from nothing)." },
        { level: "ok", label: "PCA first, three perplexities, trustworthiness, a fixed seed", code: `Z = PCA(50).fit_transform(Xs); [TSNE(2, perplexity=p, init="pca", random_state=0).fit_transform(Z) for p in (5, 30, 50)]; trustworthiness(Z, E, 10)`,
          note: "**A reproducible map whose claims are limited to what survives three scales**, with the neighbourhood fidelity measured." },
        { level: "best", label: "UMAP with transform, structure tested outside the map, the map used only to look", code: `um = UMAP(n_neighbors=30, min_dist=0.1, random_state=0).fit(Z_train)      # new customers can be placed
# cluster in the INPUT space (7.1-7.3) and colour the map by those labels; test structure with silhouette, gap and stability there, not in the picture
# report: 'the map shows neighbourhoods; sizes and distances are not meaningful; the segments come from the clustering, whose strength is silhouette 0.29'`,
          note: "**The picture illustrates a structure that was established elsewhere, and says so** — the honest use of an embedding." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Investigate",
      title: "A Fisher direction by hand, a leak you must measure, and three artefacts you must produce on purpose",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "**(a)** For class A = {(0, 0), (1, 1), (0, 1)} and class B = {(3, 0), (4, 1), (3, 1)}, compute μ_A, μ_B, S_W, S_B and the Fisher direction w ∝ S_W⁻¹(μ_B − μ_A) by hand; compare J(w) with J along the x-axis and explain the difference (or its absence). **(b)** On the digits, fit LDA(9) on all rows and cross-validate KNN on its output, then fit it inside the pipeline; report both accuracies and name the leak. **(c)** Produce three t-SNE artefacts deliberately: (i) a map of 500 rows of Gaussian noise at perplexity 5 with a k-means silhouette above 0.3; (ii) two classes with identical spread in the input whose map spreads differ by more than 2×; (iii) two runs with different seeds and `init=\"random\"`; report their Procrustes disparity against the 0.000 of the PCA-initialised runs. Report the numbers." }
      ],
      requirements: [
        "(a) the scatter matrices, w, and the two J values with the explanation.",
        "(b) both accuracies and the leak named.",
        "(c) three executed numbers, one per artefact."
      ],
      hint: "(a) The classes differ only in x; S_W is diagonal if the within-class x and y deviations are uncorrelated. (b) `LDA(n_components=9).fit_transform(X, y)` outside CV vs `make_pipeline(LDA(9), KNN)` inside. (c) `init=\"random\"` removes the PCA anchoring that made the lesson's two seeds agree.",
      solution: {
        lang: "python",
        title: "lda_tsne_practice.py",
        code: `# (a) μ_A = (1/3, 2/3),  μ_B = (10/3, 2/3),  μ = (11/6, 2/3)
#   A centred: (-1/3, -2/3), (2/3, 1/3), (-1/3, 1/3)  ->  S_W(A) = [[6/9, 3/9], [3/9, 6/9]] = [[2/3, 1/3], [1/3, 2/3]]
#   B is the same triangle shifted by 3 in x  ->  S_W(B) = [[2/3, 1/3], [1/3, 2/3]];   S_W = [[4/3, 2/3], [2/3, 4/3]]
#   μ_B - μ_A = (3, 0);   S_B = 3·(-3/2, 0)(-3/2, 0)ᵀ + 3·(3/2, 0)(3/2, 0)ᵀ = [[13.5, 0], [0, 0]]
#   S_W⁻¹ = (1 / (16/9 - 4/9)) [[4/3, -2/3], [-2/3, 4/3]] = (3/4) [[4/3, -2/3], [-2/3, 4/3]];   w ∝ S_W⁻¹ (3, 0) = (3, -1.5)  ->  unit (0.894, -0.447)
#   J(w) = 13.5·0.8 / [0.8·(4/3) + 0.2·(4/3) + 2·(0.894)(-0.447)(2/3)] = 10.8 / (1.333 - 0.533) = 13.5           J(x-axis) = 13.5 / (4/3) = 10.125
#   (executed: w = (3, -1.5), unit (0.8944, -0.4472), J 13.5 vs 10.125; scikit-learn scalings_ (0.8944, -0.4472))
#   the classes differ only in x, yet the best direction tilts to (0.894, -0.447): within each class x and y are positively correlated
#   (S_W has off-diagonal 2/3), so subtracting a little y cancels part of the within-class spread along x. Separation relative to spread, again.

# (b) executed in the lesson: LDA(9) fitted on all rows then KNN cross-validated: 0.979;  LDA(9) inside the pipeline: 0.966.
#   the leak is the labels: the projection was chosen using every row's class, including the rows later treated as held out, so the
#   held-out rows are embedded in a space built to separate them. Supervised transforms go inside the folds (3.5).

# (c) executed:
#   (i)  U = rng.normal(size=(500, 30)); E = TSNE(2, perplexity=5, init="pca", random_state=0).fit_transform(U)
#        silhouette_score(E, KMeans(5).fit_predict(E))  ->  0.344       (input space: 0.025)
#   (ii) digits at perplexity 30: classes 4 and 9 have input spreads within 4 % of each other (ratio 1.04) and map spreads in ratio 2.91
#        -- the map stretches the denser class to resolve its neighbours
#   (iii) init="random", seeds 0 and 1, perplexity 30: Procrustes disparity 0.025, against 0.000 for init="pca". Random initialisation
#        leaves the global arrangement to the optimiser and the maps differ; PCA initialisation anchors it. Small here because the digit
#        clusters are well separated; on weaker structure the disparity grows.`,
        notes: [
          { t: "p", text: "**(a)** isolates the S_W⁻¹ effect: even when the classes differ along one axis, the optimal projection tilts to cancel correlated within-class spread." },
          { t: "p", text: "**(b)** is a leak that produces a plausible 1.3-point gain and no warning. Any transform that touched the labels is part of the model." },
          { t: "p", text: "**(c)** is the point of the lesson made reproducible: if you can manufacture an artefact on purpose, you will recognise it when it appears by accident." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A t-SNE map of the digits has KNN accuracy 0.986 and trustworthiness 0.993, but class spreads correlate only 0.68 with their input spreads and noise produces lumps. How can all of these be true?",
          options: [
            "The map is wrong and should be discarded",
            "The objective is KL(P‖Q) with P built from each point's neighbours at a fixed perplexity: it heavily penalises separating true neighbours and barely penalises anything else. So neighbourhoods are reproduced faithfully (hence the KNN and trustworthiness numbers) while sizes, gaps and global layout are whatever the optimiser found convenient — and in noise, where every point's 'neighbours' are arbitrary, the map dutifully groups them into lumps",
            "The perplexity was wrong",
            "Trustworthiness is not a valid metric"
          ],
          answer: 1,
          why: "Read the asymmetry of the KL divergence and every artefact is predicted."
        }
      ]
    }
  ],

  takeaways: [
    "**LDA maximises Fisher's ratio wᵀS_Bw / wᵀS_Ww → S_W⁻¹S_Bw = λw**; two classes give w ∝ S_W⁻¹(μ_B − μ_A) = (0.9815, 0.1915) with J = 12.94, tilted away from the raw mean difference (11.69) by the within-class spread.",
    "**At most K − 1 directions**, because S_B has rank ≤ K − 1; the digits needed more (PCA(20) → KNN 0.983 vs LDA(9) → 0.966).",
    "**LDA finds low-variance discriminative directions PCA discards**: AUC 0.920 vs PC1's 0.519 when the signal sat in 2.8 % of the variance.",
    "**LDA is supervised — fit it inside the folds**: 0.979 fitted on all rows vs 0.966 in-pipeline is label leakage.",
    "**t-SNE minimises KL(P‖Q) between neighbourhood distributions**, with perplexity setting the neighbourhood size and a Student-t in the map to solve crowding.",
    "**What survives**: neighbourhoods (KNN in the map 0.986, trustworthiness 0.993). **What does not**: sizes (stretched 4–14×), gaps (correlation 0.72), and the existence of clusters (noise → silhouette 0.34).",
    "**Try perplexities 5/30/50, PCA first, `init=\"pca\"` and a fixed seed** (two seeds: Procrustes disparity 0.000).",
    "**UMAP** keeps more global layout, is fast after compilation, and has `transform` (test accuracy 0.976 from a fitted map); it makes lumps from noise too.",
    "**Isomap and LLE unroll a manifold** (Swiss roll: 0.99 vs PCA's 0.22) by preserving geodesic distances or local reconstructions on the k-NN graph.",
    "**Embeddings are for looking**: t-SNE cannot embed a new point; a model on PCA(30) matched every embedding; establish structure in the input space and use the map to illustrate it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Derive the LDA direction for two classes and explain why it is not simply the difference of the class means.",
        options: [
          "It is the difference of the means, normalised",
          "Maximising the Fisher ratio wᵀS_Bw / wᵀS_Ww gives S_W⁻¹S_Bw = λw; with two classes S_B has rank one and the solution is w ∝ S_W⁻¹(μ_B − μ_A). The S_W⁻¹ factor tilts the mean difference away from directions along which the classes are internally spread: in the worked example (0.981, 0.192) against the raw difference direction, with J = 12.94 vs 11.69, because within-class scatter was larger along y",
          "It is the first principal component of the pooled data",
          "It is the direction of maximum total variance"
        ],
        answer: 1,
        why: "Separation relative to spread is the criterion; the mean difference alone is separation without the denominator."
      },
      {
        stem: "PCA(1) gave AUC 0.519 and LDA(1) gave 0.920 on the same data. What was the data like, and what does it teach?",
        options: [
          "PCA was not scaled",
          "One feature was high-variance noise (97 % of the variance) and the other, low-variance, carried the class shift; PCA keeps variance and cannot see labels, so it kept the noise direction; LDA maximises separation over within-class spread and kept the signal. Unsupervised reduction can discard the discriminative direction; when labels exist and a linear projection is wanted, LDA is the reduction to try first — inside the folds",
          "The classes were non-linearly separable",
          "LDA overfitted"
        ],
        answer: 1,
        why: "KNN on LDA(1) even beat KNN on both raw features (0.832 vs 0.812): removing the noise axis improved the neighbourhood."
      },
      {
        stem: "What is perplexity in t-SNE and why does the map use a Student-t distribution?",
        options: [
          "Perplexity is the learning rate; the t-distribution is for speed",
          "Perplexity fixes each point's effective number of neighbours: its Gaussian bandwidth σᵢ is chosen so the entropy of its neighbour distribution equals log(perplexity), so dense and sparse regions get the same neighbourhood size. The low-dimensional similarities use a Student-t with one degree of freedom because two dimensions have less room than fifty: its heavy tail lets moderately distant points sit far apart, relieving the crowding that a Gaussian would cause and pulling clusters apart",
          "Perplexity is the number of clusters; the t-distribution models outliers",
          "Perplexity is the number of iterations"
        ],
        answer: 1,
        why: "Perplexity 2 gave silhouette 0.27, 30 gave 0.53, 100 gave 0.42 — a scale choice, to be varied and not trusted singly."
      },
      {
        stem: "Which of these can you read from a t-SNE plot: (i) that two points are neighbours, (ii) that one cluster is larger than another, (iii) that two clusters are far apart, (iv) that the data have clusters?",
        options: [
          "All four",
          "Only (i), with high reliability (trustworthiness 0.993, KNN in the map 0.986). Sizes are stretched by cluster-specific factors (3.9–14.2 in the map for 1.10–1.85 in the input), gaps correlate only 0.72 with input distances, and pure noise produces lumps with silhouette 0.34 — so (ii), (iii) and (iv) must be established in the input space and only illustrated by the map",
          "(i) and (iii)",
          "(ii) and (iv)"
        ],
        answer: 1,
        why: "The KL objective pays for neighbours only; sizes, gaps and lumps are whatever the optimiser found convenient."
      },
      {
        stem: "Why should embeddings not be used as model features, and which of PCA, LDA, t-SNE and UMAP is the exception in principle?",
        options: [
          "They can all be used freely",
          "t-SNE has no mapping: a new row cannot be embedded without re-running on all rows, and a t-SNE 'feature' computed on train + test together is a leak (0.983 test accuracy that no deployment could reproduce). UMAP, PCA and LDA are fitted functions with transform, so they are usable in principle — but a downstream model on PCA(30) matched every embedding, and a regularised model on raw features usually does better; embeddings earn their place for visualisation and for giving distance-based methods a dense space",
          "Only t-SNE is usable because it is the most accurate",
          "PCA cannot be used because it is unsupervised"
        ],
        answer: 1,
        why: "The test of a feature is whether it can be computed for the next row from a fitted object; t-SNE fails it outright."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "PCA versus LDA: what does each optimise, and when does the difference matter?",
        strong: "PCA finds the orthogonal directions of maximum variance — eigenvectors of the covariance — without looking at labels. LDA finds the directions that maximise Fisher's ratio, between-class scatter over within-class scatter, by solving S_W⁻¹S_Bw = λw with the labels supplied; for two classes that is w ∝ S_W⁻¹(μ_B − μ_A), the mean difference tilted by the inverse within-class covariance, and there are at most K − 1 such directions because S_B has rank K − 1. The difference matters whenever the discriminative direction is not a high-variance one: on data where one feature was pure noise carrying 97 % of the variance and the other carried a class shift in the remaining 3 %, PC1 scored AUC 0.52 as a class separator and LDA's single direction scored 0.92. It matters the other way when there is more class structure than K − 1 dimensions can hold — on ten-digit images PCA(20) fed to a neighbour classifier beat LDA(9) — and when classes have different covariances, where QDA beat both. Two operational points: LDA needs shrinkage when features are many or collinear, and because it is supervised it must be fitted inside the cross-validation folds — fitted on all rows it leaked 1.3 points of accuracy on the digits.",
        answer: [
          { t: "p", text: "The two criteria, the eigenproblems, the K − 1 cap, both directions of the comparison with numbers, shrinkage and leakage." }
        ]
      },
      {
        level: "core",
        q: "Explain how t-SNE works and how you would present its output responsibly.",
        strong: "t-SNE converts pairwise distances in the input into neighbour probabilities, with each point's Gaussian bandwidth set so that its effective number of neighbours equals the perplexity, and then places points in two dimensions so that a Student-t neighbour distribution in the map matches the input one, minimising the KL divergence by gradient descent. The KL is asymmetric — separating true neighbours is expensive, misplacing non-neighbours is cheap — so the map is faithful about neighbourhoods and about nothing else, and the heavy-tailed Student-t is what lets clusters spread apart in two dimensions. On the digits the map's neighbourhoods were real: a nearest-neighbour classifier on the two coordinates scored 0.986 with trustworthiness 0.993. But class spreads in the map were stretched by factors from 4 to 14 in a different order from the input, inter-cluster distances correlated only 0.72 with the truth, and pure Gaussian noise produced lumps with a silhouette of 0.34. So I present it with PCA to fifty dimensions first, three perplexities, a PCA initialisation and fixed seed so that it is reproducible, trustworthiness reported, and a caption that says sizes and gaps are not meaningful — and I establish any claimed cluster structure with silhouette, gap and stability in the input space, using the map only to illustrate it. I would not use its coordinates as features: there is no mapping for a new point.",
        answer: [
          { t: "p", text: "Objective and its asymmetry, the executed evidence for what survives and what does not, and the presentation protocol." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague reports that customers form eight clusters, shown in a UMAP plot, and wants to build eight products. Advise.",
        strong: "The plot is evidence of neighbourhoods, not of eight groups. UMAP, like t-SNE, optimises a neighbourhood-preserving objective and produces lumps from structureless data — on 500 rows of Gaussian noise its map had a k-means silhouette of 0.34 — and the number of lumps moves with n_neighbors and min_dist, so I would first ask to see the map at three settings. Then I would move the question out of the picture: cluster in the input space, or in a PCA space of the standardised features, and measure the structure there — silhouette by k, the gap statistic against a uniform reference, and stability across disjoint halves, which on our churn data gave silhouettes under 0.3, a gap that never settled and stability around 0.6 to 0.8, the signature of a continuum. If those say eight groups, the map illustrates them; if they say a continuum, the eight lumps are an artefact of the embedding and the product decision should be made on a chosen partition along actionable axes with its convenience stated. I would also check that the lumps are not a data artefact — one of our text clusters was an e-mail signature — by profiling each on variables not used in the embedding. Eight products is a large bet to place on a picture whose distances and sizes the method itself does not claim to preserve.",
        answer: [
          { t: "p", text: "The embedding's limits with numbers, the move to input-space validation, the continuum verdict, the artefact check, and the decision framing." }
        ]
      }
    ]
  }
});
