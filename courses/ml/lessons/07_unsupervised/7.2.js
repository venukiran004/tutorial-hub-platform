/* ============================================================================
   LESSON 7.2 — Hierarchical, Density and Mixture Clustering
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "**K-means answers one question — where do k centres go — and 7.1 showed the shapes it cannot see. This lesson is the three other questions clustering can ask, each with its own algorithm and its own failure.** *Which rows are closest, merged step by step?* — agglomerative clustering, whose linkage rule decides whether the moons are found perfectly (single: ARI 1.000) or not at all (Ward: 0.249), and whose dendrogram is read by the ratio of merge heights, not their difference. *Where is the data dense?* — DBSCAN, worked by hand on seven points, tuned by the k-distance plot (eps 0.15 → ARI 0.997 on the moons), and broken by clusters of different density until HDBSCAN removes eps altogether. *Which Gaussians generated the data?* — the mixture model, fitted by EM with the responsibility and update equations run by hand for four iterations, which finds elongated overlapping clusters k-means cannot (0.865 vs 0.582), gives soft memberships, and chooses its own k by BIC. Spectral clustering, mean shift and affinity propagation close the set, and the churn customers are clustered once more: by density they are 20–30 % noise and two lumps, by mixture they are a continuum with a trap in the discount column.",

  objectives: [
    "Perform agglomerative merges by hand under four linkages, explain chaining, and read a dendrogram",
    "Classify points as core, border or noise in DBSCAN, choose eps from a k-distance plot, and explain why HDBSCAN replaces eps",
    "Derive the EM steps for a Gaussian mixture, run them by hand, and choose components by BIC",
    "Match spectral, mean shift and affinity propagation to the problems they solve, and choose a clustering method from the data's shape, density and size"
  ],

  prerequisites: ["7.1", "5.2", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "Hierarchical: merge the closest, and define 'closest'", id: "hierarchical" },

    { t: "code", lang: "text", title: "Agglomerative clustering and the four linkages, worked on A = 0, B = 1, C = 4, D = 5 (executed)",
      code: `start with n singleton clusters; repeatedly merge the two clusters at the smallest LINKAGE distance; record the height; stop at one cluster.

linkage        distance between clusters P and Q                  behaviour
single         min over p ∈ P, q ∈ Q of d(p, q)                    follows chains; finds elongated shapes; one bridge of points joins two clusters
complete       max d(p, q)                                         compact, equal-diameter clusters; sensitive to a single outlier
average        mean d(p, q)                                        a compromise
Ward           the merge that least increases total within-cluster SSE      round, similar-sized clusters; the default; k-means's criterion, built bottom-up

merges on the line 0, 1, 4, 5:
   step 1: {A, B} at height 1        step 2: {C, D} at height 1        step 3: {A,B} + {C,D} at height:
      single 3 (d(B, C))     complete 5 (d(A, D))     average 4 (mean of 1·4 = 4 pairs: 4, 5, 3, 4)     Ward 5.657 (= √(2 × 16): merging raises SSE from 1 to 17)
the dendrogram has two merges at height 1 and one far above; cut anywhere between -> {A, B}, {C, D}.`,
      caption: "The hierarchy is the output — every k at once — and the linkage is the model. Each rule is a claim about cluster shape: single linkage says a cluster is anything connected by short steps, complete says a cluster is anything with a small diameter, Ward says a cluster is a compact blob. Pick the claim that matches the data, because the next block shows the rules disagreeing by a factor of four."
    },

    { t: "viz",
      title: "The dendrogram for A, B, C, D under single linkage (heights 1, 1, 3)",
      caption: "Leaves at the bottom, merges drawn at their heights. A horizontal cut between 1 and 3 yields two clusters; the same cut under complete linkage (top merge at 5) or Ward (5.657) gives the same two — the top merge is simply higher.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A dendrogram with four leaves A, B, C, D. A and B join at height 1, C and D join at height 1, and the two pairs join at height 3. A dashed horizontal cut line sits at height 2 between the merges.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="120" y1="250" x2="620" y2="250"/><line x1="120" y1="40" x2="120" y2="250"/></g>
  <g class="s-sub"><text x="112" y="254" text-anchor="end">0</text><text x="112" y="194" text-anchor="end">1</text><text x="112" y="134" text-anchor="end">2</text><text x="112" y="74" text-anchor="end">3</text><text x="60" y="150" transform="rotate(-90 60 150)" text-anchor="middle">merge height</text></g>
  <g style="stroke:var(--accent)" stroke-width="2.4" fill="none">
    <polyline points="200,250 200,190 300,190 300,250"/><polyline points="440,250 440,190 540,190 540,250"/>
    <polyline points="250,190 250,70 490,70 490,190"/>
  </g>
  <line x1="120" y1="130" x2="620" y2="130" style="stroke:var(--warn)" stroke-width="1.4" stroke-dasharray="6 4"/>
  <g class="s-label" style="font-weight:600"><text x="200" y="272" text-anchor="middle">A (0)</text><text x="300" y="272" text-anchor="middle">B (1)</text><text x="440" y="272" text-anchor="middle">C (4)</text><text x="540" y="272" text-anchor="middle">D (5)</text></g>
  <text x="630" y="134" class="s-sub" style="fill:var(--warn)">cut at 2 → two clusters</text>
  <g class="s-mono" style="fill:var(--ink-2)"><text x="660" y="60">top merge height:</text><text x="660" y="84">single    3.000</text><text x="660" y="106">average   4.000</text><text x="660" y="128">complete  5.000</text><text x="660" y="150">Ward      5.657</text></g>
</svg>`
    },

    { t: "code", lang: "python", title: "Linkage decides what a cluster is (executed)",
      hl: [2, 3, 8, 9, 10],
      code: `# two moons (400 points, noise 0.05), two clusters requested
#   single    ARI 1.000      <- the moons are chains of close points: single linkage walks along them
#   complete  ARI 0.279      <- a moon has a large diameter: complete linkage cuts each moon in half
#   average   ARI 0.239
#   ward      ARI 0.249      <- the k-means criterion, and the k-means answer

# three round blobs plus a bridge of 12 points between two of them, three clusters requested
#   single    ARI 0.569   sizes [199, 100, 1]      <- chaining: the bridge joins two blobs into one cluster; the third 'cluster' is a single point
#   complete  ARI 0.728   sizes [133, 100, 67]
#   ward      ARI 0.923   sizes [100, 100, 100]    <- compactness ignores the bridge`,
      caption: "The same data, the same k, and answers from perfect to useless depending on one word. Single linkage is the only agglomerative rule that finds non-convex shapes, and the only one that a few stray points can ruin; Ward is robust to bridges and blind to shapes. Neither is 'better'; they encode different clusters."
    },

    { t: "code", lang: "python", title: "Reading a dendrogram: four blobs, Ward, the last eight merge heights (executed)",
      code: `heights:  5.41   6.11   6.15   6.16   8.16   20.22   29.78   45.42        (the last merge, 45.42, joins the final two clusters into one)
ratios of successive heights:  1.13   1.01   1.00   1.32   2.48   1.47   1.53
   the biggest jump in RATIO is 8.16 -> 20.22 (×2.48): cut there -> 4 clusters                ARI 0.908
   the biggest ABSOLUTE gap is 29.78 -> 45.42 (15.6): cut there -> 2 clusters                 ARI 0.330    <- wrong: heights grow with cluster size
   cut into 3: 0.678    cut into 5: 0.834`,
      caption: "Merge heights climb as clusters grow, so the largest absolute gap is usually near the top and says '2'. Read the dendrogram on a log scale — the ratio of consecutive heights — and the four blobs stand out. `distance_threshold` in scikit-learn cuts at a height; `n_clusters` cuts at a count; the silhouette across cuts is the check when the dendrogram is ambiguous. Cost: O(n²) memory for the distance matrix and O(n² log n) time — 2 s at 10,000 rows, and impractical at 100,000 without a sample."
    },

    { t: "h2", n: "02", text: "Density: DBSCAN, its parameters, and its successor", id: "density" },

    { t: "code", lang: "text", title: "Core, border, noise — seven points by hand, eps = 1.5, min_samples = 3 (executed; the point counts itself)",
      code: `core point     at least min_samples points within eps (itself included)
border point   within eps of a core point, but not core itself
noise          neither
a cluster is the set of points reachable through chains of core points; border points join the cluster of a core neighbour

x = {1, 2, 2.5, 3, 8, 9, 20}
   1     neighbours within 1.5: {1, 2, 2.5}          3  -> core
   2     {1, 2, 2.5, 3}                              4  -> core
   2.5   {1, 2, 2.5, 3}                              4  -> core
   3     {2, 2.5, 3}                                 3  -> core
   8     {8, 9}                                      2  -> not core; no core point within 1.5 -> NOISE
   9     {8, 9}                                      2  -> NOISE
   20    {20}                                        1  -> NOISE
result: one cluster {1, 2, 2.5, 3}, three noise points, and k was never chosen.        scikit-learn: [0, 0, 0, 0, -1, -1, -1]
   eps 2.0:  same (8 and 9 still have only each other)         min_samples 2:  {8, 9} becomes a second cluster, 20 stays noise`,
      caption: "Two parameters replace k: eps says how close is 'near', min_samples says how many neighbours make a region dense. Clusters are whatever the dense regions turn out to be — any shape, any count — and everything sparse is labelled noise rather than forced into a cluster. That is the method's gift and its demand: eps must be right for the data's density, and the next block shows how to find it."
    },

    { t: "code", lang: "python", title: "Choosing eps from the k-distance plot, and sweeping it on the moons (executed; 600 points, noise 0.08, min_samples 5)",
      hl: [2, 7, 8, 9],
      code: `# sort every point's distance to its 4th nearest neighbour (min_samples − 1):
#   median 0.061    90th pct 0.104    95th 0.119    99th 0.155    max 0.215      <- the 'knee' of the sorted curve sits around 0.12-0.16
#   eps       clusters    noise     ARI
#   0.05         36       0.505     0.014      <- too small: the moons shatter into fragments and half the points are noise
#   0.08          9       0.095     0.287
#   0.10          3       0.037     0.692
#   0.15          2       0.002     0.997      <- at the knee
#   0.20          2       0.000     1.000
#   0.30          1       0.000     0.000      <- too large: the gap between the moons is bridged; one cluster
# k-means on the same moons: ARI 0.245`,
      caption: "The k-distance plot is the tool: for most points the distance to their (min_samples − 1)th neighbour is small and similar; it rises sharply for the sparse points; eps at the rise separates dense from sparse. There is a window, not a point — 0.15 to 0.20 here — and the sweep shows the two ways to leave it. min_samples is usually set from the dimension (≥ d + 1, often 2d) and moved up to demand denser clusters."
    },

    { t: "code", lang: "python", title: "Varying density: one eps cannot serve two clusters (executed; blobs with sd 0.3, 1.5 and 0.6)",
      hl: [2, 3, 4, 5, 8],
      code: `#   DBSCAN eps 0.3, min_samples 8     7 clusters, 41 % noise, ARI 0.738     <- right for the tight blob; the diffuse blob shatters into noise
#   DBSCAN eps 0.6                     3 clusters,  7 % noise, ARI 0.899
#   DBSCAN eps 1.0                     3 clusters,  2 % noise, ARI 0.963     <- right for the diffuse blob; and the tight blob would merge with anything nearby
#   HDBSCAN(min_cluster_size=20)       3 clusters,  3 % noise, ARI 0.947     <- no eps: it extracts the clusters that persist longest across ALL eps
#   OPTICS(min_samples 15, xi 0.1)     2 clusters, 43 % noise, ARI 0.997     <- reachability ordering; with xi it called the whole diffuse blob 'noise' (which the ARI, treating noise as a label, rewards)
#   OPTICS with other xi settings      18 clusters / 63 % noise, or 5 / 58 %  <- the xi extraction is fragile; use its reachability plot, not its labels, or use HDBSCAN
#   k-means, k = 3                     ARI 0.947                              <- round blobs: k-means is fine here and needed k`,
      caption: "DBSCAN's eps is a single density threshold, so clusters of different density cannot all be right at once. HDBSCAN builds the hierarchy of DBSCAN solutions over every eps and keeps the clusters that are stable across the widest range — its one parameter is the minimum size of a cluster worth reporting, and it labels noise as DBSCAN does. It is the density method to reach for first; it costs more (10.9 s at 40,000 rows against DBSCAN's 1.0 s), and in high dimension both suffer as distances concentrate (1.7)."
    },

    { t: "dl", items: [
      ["Linkage", "The rule that turns point distances into cluster distances: single (min), complete (max), average (mean), Ward (SSE increase). The model choice of hierarchical clustering."],
      ["Chaining", "Single linkage's failure: a thin bridge of points joins two clusters (three blobs + 12 bridge points → one merged cluster and a singleton)."],
      ["Dendrogram", "The merge tree with heights. Read by ratios of successive heights; cut by height (`distance_threshold`) or by count."],
      ["eps, min_samples", "DBSCAN's density definition: a point is core if ≥ min_samples points lie within eps (itself included). Choose eps from the k-distance knee; min_samples ≥ d + 1."],
      ["HDBSCAN", "DBSCAN over all eps, keeping clusters stable across the hierarchy; parameter min_cluster_size. Handles varying density; still labels noise; can score outliers."],
      ["Responsibility rᵢₖ", "The posterior probability that row i came from component k: πₖN(xᵢ | μₖ, Σₖ) / Σⱼ πⱼN(xᵢ | μⱼ, Σⱼ). The E-step, and a soft cluster membership."],
      ["EM", "Alternate E (responsibilities from current parameters) and M (parameters as responsibility-weighted means, covariances and proportions). Each iteration raises the log-likelihood; converges to a local maximum; k-means is its hard, equal-spherical special case."],
      ["BIC", "−2 log-likelihood + (parameters) log n. Choose the number of components at the minimum; penalises the free parameters a full covariance adds."],
      ["Spectral clustering", "Build a similarity graph, take the bottom eigenvectors of its Laplacian, run k-means on those coordinates. Finds clusters that are connected, not compact."]
    ]},

    { t: "h2", n: "03", text: "Mixtures: which Gaussians generated the data", id: "gmm" },

    { t: "code", lang: "text", title: "The model and the two EM steps",
      code: `p(x) = Σₖ πₖ N(x | μₖ, Σₖ)          πₖ ≥ 0,  Σ πₖ = 1        (K Gaussians with mixing proportions; each row was generated by one of them, unknown which)

maximum likelihood has no closed form because of the sum inside the log. EM alternates:
E-step   rᵢₖ = πₖ N(xᵢ | μₖ, Σₖ) / Σⱼ πⱼ N(xᵢ | μⱼ, Σⱼ)                the posterior 'responsibility' of component k for row i
M-step   Nₖ = Σᵢ rᵢₖ        πₖ = Nₖ / n        μₖ = (1/Nₖ) Σᵢ rᵢₖ xᵢ        Σₖ = (1/Nₖ) Σᵢ rᵢₖ (xᵢ - μₖ)(xᵢ - μₖ)ᵀ
each step is a weighted version of the ordinary estimates, with the responsibilities as weights.
the log-likelihood Σᵢ log Σₖ πₖ N(xᵢ | μₖ, Σₖ) never decreases (Jensen's inequality: EM maximises a lower bound that touches it at the current parameters).
with Σₖ = σ²I, σ -> 0 the responsibilities become 0/1 and EM becomes Lloyd's algorithm: k-means is a hard, equal-spherical GMM.`,
      caption: "The mixture is a *generative* model of the data, and that buys three things k-means lacks: elliptical clusters with their own covariance, soft memberships (a customer can be 70 % segment A), and a likelihood — so the number of components can be chosen by BIC and a new row can be scored for how surprising it is (9.4)."
    },

    { t: "code", lang: "text", title: "Four EM iterations by hand: six points, two components, a deliberately vague start (executed)",
      code: `x = {1, 1.5, 2, 8, 8.5, 9}        start: π = (0.5, 0.5),  μ = (3, 6),  σ = (3, 3)

iteration 1   E: r_i1 for x = 1:  0.5·N(1 | 3, 3) / [0.5·N(1 | 3, 3) + 0.5·N(1 | 6, 3)] = 0.05324 / (0.05324 + 0.01658) = 0.763
                 all six:  [0.763, 0.731, 0.697, 0.237, 0.209, 0.182]           log-likelihood -16.085
              M: N₁ = 2.819, N₂ = 3.181;  π = (0.470, 0.530);  μ = (3.039, 6.738);  σ = (2.930, 3.064)
iteration 2   r_i1 = [0.808, 0.777, 0.742, 0.194, 0.161, 0.133]                    log-lik -15.934      μ = (2.692, 7.040)   σ = (2.664, 2.872)
iteration 3   r_i1 = [0.877, 0.847, 0.811, 0.122, 0.092, 0.068]                    log-lik -15.739      μ = (2.178, 7.496)   σ = (2.113, 2.484)
iteration 4   r_i1 = [0.965, 0.948, 0.923, 0.023, 0.013, 0.007]                    log-lik -14.941      μ = (1.594, 8.140)   σ = (0.920, 1.590)
converged (many iterations later):  μ = (1.5, 8.5),  σ = (0.408, 0.408),  π = (0.5, 0.5)         scikit-learn GaussianMixture(2): identical`,
      caption: "Watch the responsibilities sharpen — 0.763 to 0.965 for the first point — as the components pull apart and narrow; the log-likelihood rises monotonically; and the final answer is what any sensible clustering would give, but with a probability attached to every row on the way. From a confident start (μ = 2 and 7, σ = 1) the responsibilities are 1.000/0.000 in the first pass and EM converges in one step: k-means behaviour, because the components were already narrow."
    },

    { t: "code", lang: "python", title: "Where the mixture beats k-means, what soft assignment gives, and BIC choosing k (executed)",
      hl: [2, 3, 4, 6, 12],
      code: `# two elongated, overlapping clusters (covariance with correlation ±0.875), 300 points each
#   k-means                          ARI 0.582      <- straight midpoint boundary through two tilted ellipses
#   GMM, full covariance             ARI 0.865      <- each component learns its own tilt
#   GMM, spherical covariance        ARI 0.392      <- worse than k-means: a spherical GMM with unequal variances is not k-means either
#   13.8 % of rows have their maximum responsibility below 0.9; a boundary row: [0.475, 0.525] -- the model says 'either', and says so

# BIC on four round blobs (sd 1.2), n_init 3
#   components   1         2         3         4         5         6         7
#   BIC       7,709.5   6,255.8   5,828.2   5,570.2   5,593.9   5,618.6   5,648.1       <- minimum at 4
#   AIC       7,687.5   6,207.4   5,753.4   5,469.1   5,466.4   5,464.7   5,467.8       <- keeps falling: AIC's penalty is too light for choosing k`,
      caption: "Covariance type is the mixture's capacity dial — spherical (1 parameter per component), diagonal (d), tied (one shared full matrix), full (d(d + 1)/2 each) — and the wrong one is worse than k-means. BIC's log n penalty per parameter picks the true four on clean blobs while AIC drifts upward; on real data BIC too can keep falling, and the next block shows the specific reason it does on the churn customers."
    },

    { t: "callout", kind: "trap", title: "A Gaussian mixture on a column with point masses (executed on the churn customers)", body: [
      { t: "p", text: "Five standardised numerics, BIC by components: 1 → 11,730; 2 → 2,498; 3 → 2,524; 4 → 2,502; **5 → −1,317**; 6 → −185. The collapse at five components is not structure. The discount column takes three values (0, 10, 20; 686 rows at 0), and two of the five components have **variance 0.0000 on discount** — a Gaussian that has concentrated on the point mass at zero, whose density there is unbounded, so the likelihood is arbitrary large. With `reg_covar=0.1` (a floor on every variance) BIC becomes 11,781 / 10,442 / 10,193 / 10,386 / 10,481 / 10,077: a shallow minimum at three and no collapse. Any feature with repeated exact values — discrete counts, capped values, encoded categoricals — can do this. Add a covariance floor, jitter, or leave the column out of the mixture." }
    ]},

    { t: "h2", n: "04", text: "The rest of the family, and the churn customers by density", id: "others" },

    { t: "code", lang: "python", title: "Spectral, mean shift, affinity propagation (executed)",
      hl: [2, 3, 6, 8, 9],
      code: `# concentric rings (500 points): k-means ARI -0.002
#   spectral, rbf affinity (γ = 20)                 ARI 1.000     <- clusters are connected components of a similarity graph, not compact sets
#   spectral, nearest-neighbour affinity (10)       ARI 1.000     <- and on the moons: 1.000
#   DBSCAN eps 0.15                                 ARI 1.000     <- density finds the same thing, without needing k

# mean shift on four blobs: bandwidth 2.84 (estimated at the 0.2 quantile of pairwise distances), 4 clusters found, ARI 1.000    <- k found by the data: modes of a kernel density
# affinity propagation on the same blobs:
#   default preference (median similarity)         6 clusters, ARI 0.814     <- over-splits; the preference is k in disguise
#   preference -200                                4 clusters, ARI 1.000`,
      caption: "Spectral clustering re-embeds the rows by the eigenvectors of a similarity graph's Laplacian and runs k-means there; connected shapes become compact in that embedding, which is why the rings separate. It needs k, a similarity (and its γ or neighbour count), and O(n²) or a sparse graph. Mean shift climbs the kernel density to its modes and reports one cluster per mode: no k, but a bandwidth that plays the same role. Affinity propagation passes messages between rows to elect exemplars; its 'preference' sets how many, so 'no k' is only half true."
    },

    { t: "code", lang: "python", title: "The churn customers, by density and by mixture (executed; five standardised numerics, 863 rows)",
      code: `# 9th-nearest-neighbour distance: median 0.65, 95th percentile 1.83
#   DBSCAN eps 0.8, min_samples 10      8 clusters, 31 % noise, sizes [284, 189, 54, 24, 12, 12, 17, 6]
#   DBSCAN eps 1.0                      8 clusters, 23 % noise
#   DBSCAN eps 1.3                      5 clusters,  8 % noise, sizes [579, 96, 91, 19, 8]
#   HDBSCAN(min_cluster_size=30)        2 clusters, 19 % noise, sizes [639, 57]
#   GMM (reg_covar 0.1) BIC minimum     3 components, shallow
# 7.1's verdict, confirmed from two more directions: no density structure beyond one large lump (the no-discount majority) and a small
# pro-plan group; a fifth of customers are 'noise' to any density method, i.e. they sit in the sparse tails of a continuum`,
      caption: "Three families, one answer, which is the point of running more than one: when k-means, density and mixture all describe the same data as a continuum with one or two lumps, the segmentation report can say so with confidence. When they disagree, the disagreement is informative — density methods finding structure that k-means missed usually means non-convex shapes or outliers; a mixture finding it usually means elongated or overlapping groups."
    },

    { t: "table",
      head: ["Method", "Needs k?", "Cluster shape", "Noise handling", "Scale", "Reach for it when"],
      rows: [
        ["K-means (7.1)", "Yes", "Round, similar size", "None: outliers drag centres", "Millions of rows", "Compact blobs; segmentation; a fast baseline"],
        ["Agglomerative", "No (cut later)", "Depends on linkage", "None", "≲ 10⁴ rows (O(n²))", "A hierarchy is wanted; small data; the dendrogram is the deliverable"],
        ["DBSCAN", "No (eps, min_samples)", "Any, at one density", "Labels it", "10⁵ rows with an index", "Irregular shapes, outliers to be flagged, uniform density"],
        ["HDBSCAN", "No (min_cluster_size)", "Any, varying density", "Labels and scores it", "10⁵ rows (slower)", "Default density method"],
        ["Gaussian mixture", "Yes (BIC)", "Elliptical, overlapping", "Low likelihood flags it", "Millions of rows", "Soft memberships, a density model, elongated clusters"],
        ["Spectral", "Yes", "Connected", "None", "≲ 10⁴ dense, more sparse", "Manifold-shaped clusters; graph data"],
        ["Mean shift", "No (bandwidth)", "Modes of the density", "None", "Small", "Unknown k with round modes; image segmentation"],
        ["Affinity propagation", "No (preference)", "Exemplar-centred", "None", "Small (O(n²))", "Exemplars (real rows) are wanted as cluster representatives"]
      ]
    },

    { t: "ladder",
      title: "Clustering 50,000 GPS drop-off points to find pickup zones for a ride service",
      rungs: [
        { level: "bad", label: "K-means with k = 20", code: `KMeans(20).fit(latlon)`,
          note: "**Twenty Voronoi cells over a city**: zones cut through parks and rivers, every remote drop-off assigned to the nearest zone, the busiest street split in two. Density is the question and k-means cannot ask it." },
        { level: "ok", label: "DBSCAN with eps from the k-distance plot", code: `eps = knee of the sorted 9th-NN distances; DBSCAN(eps=eps, min_samples=10, metric="haversine").fit(np.radians(latlon))`,
          note: "**Zones are dense regions of any shape and stray drop-offs are noise.** One eps fits the city centre or the suburbs, not both." },
        { level: "best", label: "HDBSCAN with a minimum zone size, noise kept as a class, zones profiled and refreshed", code: `hdb = HDBSCAN(min_cluster_size=50, metric="haversine").fit(np.radians(latlon))
# noise (-1) = 'no zone': routed to nearest zone only if within a distance cap; zones ranked by size and density; re-run monthly and matched to last month's zones by overlap`,
          note: "**Dense centre and sparse suburbs handled by one setting, outliers left as outliers, and a process for the zones to move as the city does.**" }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A merge sequence, a DBSCAN labelling, and one EM step — all by hand",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** For the points 0, 1, 4, 5, 12 on a line, write the full merge sequence and heights under single and complete linkage, and say which linkage a cut for two clusters would need to give {0, 1, 4, 5} and {12}. **(b)** Label the points {0, 0.5, 1, 1.4, 5, 5.2, 5.5, 9} under DBSCAN with eps = 0.6 and min_samples = 3 (self included): list each point's neighbour count, its status (core/border/noise) and the clusters; then change eps to 0.5 and repeat. **(c)** Starting from the lesson's iteration-2 parameters (π = (0.469, 0.531), μ = (2.692, 7.040), σ = (2.664, 2.872)), compute the responsibility of component 1 for the point x = 8 and for x = 2 by hand, and state which direction the M-step will move μ₁ and why." }
      ],
      requirements: [
        "(a) both merge sequences with heights, and the linkage verdict.",
        "(b) the two labellings with neighbour counts.",
        "(c) the two responsibilities with the density values shown, and the direction of μ₁."
      ],
      hint: "(a) Under complete linkage {0,1} and {4,5} merge at max distance 5; adding 12 to that cluster costs max distance 12. (b) A point at 1.4 has neighbours within 0.6: {1, 1.4}. (c) N(x | μ, σ) = exp(−(x − μ)²/(2σ²)) / (σ√(2π)).",
      solution: {
        lang: "python",
        title: "clustering_by_hand.py",
        code: `# (a) points 0, 1, 4, 5, 12
#   single:   {0,1} at 1;  {4,5} at 1;  {0,1}+{4,5} at 3 (d(1,4));  {0,1,4,5}+{12} at 7 (d(5,12))            heights 1, 1, 3, 7
#   complete: {0,1} at 1;  {4,5} at 1;  {0,1}+{4,5} at 5 (d(0,5));  {0,1,4,5}+{12} at 12 (d(0,12))           heights 1, 1, 5, 12
#   a two-cluster cut gives {0,1,4,5} | {12} under BOTH linkages (cut between the last two heights: 3-7 for single, 5-12 for complete).
#   the linkages differ in the heights, not in this partition; they would differ if 12 were replaced by a bridge such as 7, 9, 11.

# (b) eps 0.6, min_samples 3
#   0    {0, 0.5}             2  border of 0.5? -> 0.5 is core (see next) and 0 is within 0.6 of it -> BORDER, cluster A
#   0.5  {0, 0.5, 1}          3  core
#   1    {0.5, 1, 1.4}        3  core
#   1.4  {1, 1.4}             2  within 0.6 of core point 1 -> border, cluster A
#   5    {5, 5.2, 5.5}        3  core
#   5.2  {5, 5.2, 5.5}        3  core
#   5.5  {5, 5.2, 5.5}        3  core
#   9    {9}                  1  noise
#   clusters: A = {0, 0.5, 1, 1.4}, B = {5, 5.2, 5.5}, noise {9}
#   eps 0.5: 0.5 -> {0, 0.5, 1} still core (|0.5-1| = 0.5 ≤ 0.5); 1 -> {0.5, 1, 1.4} = 3 -> core; 1.4 -> {1, 1.4} border;
#            5, 5.2, 5.5: 5 -> {5, 5.2, 5.5} (5.5 is exactly 0.5 away) core; same clusters. Ties at exactly eps are included (≤); implementations agree on ≤.

# (c) iteration-2 parameters: π = (0.469, 0.531), μ = (2.692, 7.040), σ = (2.664, 2.872)
#   x = 8:  N(8 | 2.692, 2.664) = exp(-(5.308)²/(2·7.097)) / (2.664·2.5066) = exp(-1.985)/6.678 = 0.1374/6.678 = 0.02057
#           N(8 | 7.040, 2.872) = exp(-(0.960)²/(2·8.248)) / (2.872·2.5066) = exp(-0.0559)/7.199 = 0.9457/7.199 = 0.1314
#           r₁ = 0.469·0.02057 / (0.469·0.02057 + 0.531·0.1314) = 0.00965 / (0.00965 + 0.06977) = 0.122        (lesson's iteration-3 table: 0.122)
#   x = 2:  N(2 | 2.692, 2.664) = exp(-0.0337)/6.678 = 0.1448;   N(2 | 7.040, 2.872) = exp(-1.540)/7.199 = 0.02979
#           r₁ = 0.469·0.1448 / (0.469·0.1448 + 0.531·0.02979) = 0.0679 / (0.0679 + 0.0158) = 0.811                 (table: 0.811)
#   M-step: μ₁ is the responsibility-weighted mean; the low points carry r₁ ≈ 0.81-0.88 and the high points ≈ 0.07-0.12, so μ₁ moves DOWN
#   from 2.692 toward the low cluster (the table shows 2.178), and σ₁ shrinks as the high points' weight fades.`,
        notes: [
          { t: "p", text: "**(a)**: linkages can agree on a partition and disagree on the heights; the heights are what a threshold cut sees, so a `distance_threshold` chosen under one linkage is meaningless under another." },
          { t: "p", text: "**(b)** rehearses the three statuses on a case with border points, and the tie rule — boundary cases at exactly eps decide membership, which is why eps should be chosen from the k-distance plot and not from a round number." },
          { t: "p", text: "**(c)** reproduces two entries of the executed responsibility table from the formulas; the direction of the M-step follows from where the weight sits." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Single linkage found the moons perfectly (ARI 1.000) and Ward did not (0.249); on three blobs with a bridge, Ward was near-perfect (0.923) and single linkage failed (0.569). What is the general rule?",
          options: [
            "Single linkage is better for small data",
            "Linkage is the definition of a cluster: single linkage merges anything connected by short steps, so it follows a curved shape and also follows a bridge of stray points (chaining); Ward merges to keep clusters compact, so it cannot follow a curve and ignores a bridge. Choose the linkage from the shape you believe the clusters have — or use a density method, which handles both",
            "Ward is always better with more than two clusters",
            "The moons should have been standardised"
          ],
          answer: 1,
          why: "The same word decides between perfect and useless; there is no default that is right for both."
        }
      ]
    }
  ],

  takeaways: [
    "**Agglomerative clustering merges the closest pair repeatedly; the linkage defines 'closest'** — single (chains and shapes: moons 1.000), complete, average, Ward (compactness: bridged blobs 0.923). Heights 1, 1, and 3 / 4 / 5 / 5.657 on the four-point example.",
    "**Read a dendrogram by height ratios** (×2.48 at the four-blob cut), not absolute gaps (which said 2 clusters, ARI 0.330).",
    "**DBSCAN**: core (≥ min_samples within eps), border, noise; clusters are chains of core points; k is not chosen. Seven points by hand → one cluster and three noise points.",
    "**eps from the k-distance knee** (0.12–0.16 on the moons); the working window was 0.15–0.20 (ARI 0.997–1.000); 0.05 shattered, 0.30 merged.",
    "**One eps cannot serve two densities**; HDBSCAN removes eps by keeping clusters stable across the hierarchy (ARI 0.947 with one parameter). OPTICS's xi extraction is fragile.",
    "**A Gaussian mixture is generative**: responsibilities rᵢₖ (E) and weighted means, covariances, proportions (M); the likelihood never decreases; k-means is the hard, equal-spherical limit.",
    "**By hand**: r₁ for x = 1 went 0.763 → 0.808 → 0.877 → 0.965 as μ moved from (3, 6) to (1.594, 8.140); converged at (1.5, 8.5), σ 0.408, matching scikit-learn.",
    "**Full covariance finds tilted overlapping clusters** (0.865 vs k-means 0.582; spherical GMM 0.392); soft memberships say 'either' at the boundary; BIC picks k (4 on the blobs) where AIC keeps falling.",
    "**Point-mass columns break mixtures**: two components with variance 0 on discount sent BIC to −1,317; a covariance floor restores sense.",
    "**Spectral for connected shapes (rings 1.000), mean shift for modes, affinity propagation for exemplars** — each with a parameter that is k in disguise; and the churn customers are a continuum from every direction."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Classify a point as core, border or noise in DBSCAN, and explain how eps is chosen.",
        options: [
          "Core if it is a cluster centre; eps is set to 0.5",
          "Core if at least min_samples points (itself included) lie within eps; border if not core but within eps of a core point; noise otherwise. Clusters are sets of core points connected through eps-neighbourhoods, with border points attached. eps is read from the k-distance plot — sort each point's distance to its (min_samples − 1)th neighbour and take the knee where the curve rises (0.12–0.16 on the moons, where eps 0.15 gave ARI 0.997)",
          "Core if within eps of the mean; eps by cross-validation",
          "Noise if farther than eps from any point; eps = the median distance"
        ],
        answer: 1,
        why: "Too small an eps shatters clusters into noise (36 clusters, 50 % noise at 0.05); too large bridges them (one cluster at 0.30)."
      },
      {
        stem: "Why does DBSCAN fail on clusters of different density, and what does HDBSCAN change?",
        options: [
          "DBSCAN cannot find more than two clusters",
          "eps is one global density threshold: an eps right for a tight cluster (0.3) shatters a diffuse one into 41 % noise, and an eps right for the diffuse one (1.0) would merge tight clusters with their surroundings. HDBSCAN builds the hierarchy of DBSCAN solutions over every eps and keeps the clusters that persist longest, so each cluster is extracted at its own density; its parameter is the minimum cluster size (ARI 0.947 with no eps at all)",
          "HDBSCAN uses k-means internally",
          "HDBSCAN removes the noise label"
        ],
        answer: 1,
        why: "The price is time: 10.9 s against 1.0 s at 40,000 rows; the benefit is one setting for a city centre and its suburbs."
      },
      {
        stem: "Derive the E and M steps of EM for a Gaussian mixture and relate them to k-means.",
        options: [
          "E assigns each point to its nearest mean; M recomputes the means",
          "E computes responsibilities rᵢₖ = πₖN(xᵢ | μₖ, Σₖ)/ΣⱼπⱼN(xᵢ | μⱼ, Σⱼ), the posterior that component k generated row i; M re-estimates πₖ = Nₖ/n, μₖ = Σᵢrᵢₖxᵢ/Nₖ and Σₖ as the responsibility-weighted covariance, with Nₖ = Σᵢrᵢₖ. Each iteration raises the log-likelihood (−16.09 → −14.94 over four hand iterations). With equal spherical covariances shrinking to zero the responsibilities become 0/1 and the steps are exactly Lloyd's: k-means is the hard, equal-variance special case",
          "E samples cluster labels; M maximises accuracy",
          "E computes BIC; M chooses k"
        ],
        answer: 1,
        why: "The generative model is what buys soft memberships, elliptical clusters and a likelihood to choose k with."
      },
      {
        stem: "BIC on the churn customers fell from 2,498 at two components to −1,317 at five. Should you report five segments?",
        options: [
          "Yes; BIC's minimum is the answer",
          "No: two of the five components had zero variance on the discount column, which is a point mass (686 rows at exactly 0), so their density there is unbounded and the likelihood is spurious. With a covariance floor (reg_covar 0.1) BIC shows a shallow minimum at three and no collapse. Columns with repeated exact values — counts, caps, encoded categories — need a floor, jitter, or exclusion from a mixture",
          "Yes, but with diagonal covariance",
          "No; BIC cannot be used for mixtures"
        ],
        answer: 1,
        why: "A collapsing likelihood is the mixture's version of a leak: a number that looks like a discovery and is an artefact."
      },
      {
        stem: "Which clustering method for (i) two interleaved crescents, (ii) 200 customers with a hierarchy wanted for a report, (iii) elongated overlapping groups with soft memberships needed, (iv) a million rows of round blobs?",
        options: [
          "K-means for all four",
          "(i) DBSCAN/HDBSCAN or spectral or single linkage — connected shapes; (ii) agglomerative with Ward, read the dendrogram by height ratios; (iii) a Gaussian mixture with full covariance, k by BIC, covariance floor if columns have point masses; (iv) k-means or mini-batch k-means, which alone scale linearly and assume exactly that shape",
          "Hierarchical for all four",
          "GMM for (i) and (ii), DBSCAN for (iii) and (iv)"
        ],
        answer: 1,
        why: "Shape, density, size and the need for soft memberships or a hierarchy decide the method; the table in section 04 is the map."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Compare k-means, hierarchical clustering, DBSCAN and Gaussian mixtures: what does each assume and when does each fail?",
        strong: "K-means minimises squared distance to k means, so it assumes round, similar-sized clusters in scaled features and needs k; it fails on crescents, rings, unequal spreads and outliers, and it is the fastest and the one that scales. Agglomerative clustering merges the closest pair repeatedly and returns a hierarchy; its assumption is the linkage — single linkage finds connected shapes and chains along bridges (perfect on the moons, 0.57 on bridged blobs), Ward finds compact blobs and ignores bridges (0.25 on the moons, 0.92 on the blobs) — and it needs the n² distance matrix, so it is for thousands of rows, not millions. DBSCAN defines clusters as dense regions — core points with enough neighbours within eps, chained together — so it finds any shape, needs no k, and labels sparse points as noise; it fails when clusters have different densities, because eps is one threshold, which HDBSCAN fixes by extracting clusters at their own density, and both weaken in high dimension as distances concentrate. A Gaussian mixture assumes the data were generated by K Gaussians, fitted by EM; it finds elliptical, overlapping clusters that k-means cannot (0.865 against 0.582), gives soft memberships, and chooses K by BIC — and it fails when a column has point masses, because a component can collapse onto them with zero variance and a spurious likelihood. I would pick by shape, density, size and whether soft membership or a hierarchy is wanted, and I would run two families and compare, because agreement is evidence of structure and disagreement is diagnostic.",
        answer: [
          { t: "p", text: "Four models, their assumptions, their measured failures, and the selection rule." }
        ]
      },
      {
        level: "core",
        q: "Explain DBSCAN's parameters and how you would set them on new data.",
        strong: "min_samples is the number of points, including the point itself, that must lie within distance eps for a point to be core; eps is that distance. Together they define density, and clusters are the connected regions of core points with border points attached; everything else is noise. I set min_samples first from the dimension — at least d + 1, commonly around 2d, higher if I want to demand denser clusters or expect more noise. Then eps from the k-distance plot: compute every point's distance to its (min_samples − 1)th nearest neighbour, sort them, and look for the knee where the curve turns upward — on the two moons the 90th to 99th percentiles were 0.10 to 0.16, and eps from 0.15 to 0.20 recovered the moons almost perfectly, while 0.05 shattered them into 36 fragments with half the points as noise and 0.30 merged them into one. I check the result by the fraction of noise, the number and sizes of clusters, and the silhouette on the non-noise points, and I test a small range of eps around the knee because there is a window, not a point. If the plot has no single knee, the clusters have different densities and I switch to HDBSCAN with a minimum cluster size, which needs no eps.",
        answer: [
          { t: "p", text: "Definitions, min_samples from d, eps from the k-distance knee with the executed window, the checks, and the HDBSCAN escape." }
        ]
      },
      {
        level: "advanced",
        q: "Walk through one iteration of EM for a two-component 1-D Gaussian mixture, and say what can go wrong with EM.",
        strong: "Take six points, 1, 1.5, 2, 8, 8.5, 9, and a vague start: equal weights, means 3 and 6, standard deviations 3. The E-step computes each point's responsibility for component one: for x = 1 the weighted densities are 0.0532 under component one and 0.0166 under component two, so r = 0.763; across the six points the responsibilities are 0.763, 0.731, 0.697, 0.237, 0.209, 0.182. The M-step re-estimates: N₁ is the sum of the responsibilities, 2.82; π₁ = 2.82/6 = 0.47; μ₁ is the responsibility-weighted mean, 3.04; σ₁ the weighted standard deviation, 2.93 — and likewise for component two, giving μ₂ 6.74. Each iteration raises the log-likelihood, from −16.09 to −14.94 by the fourth pass, as the responsibilities sharpen toward 0.965 and the means move to 1.59 and 8.14; the fixed point is means 1.5 and 8.5 with standard deviation 0.41, which is what scikit-learn returns. What goes wrong: EM finds a local maximum, so it needs several starts like k-means; a component can collapse onto a single point or a point-mass column with zero variance and infinite likelihood — on the churn data two components did exactly that on the discount column and BIC dropped to −1,317 — which a covariance floor prevents; the wrong covariance type is worse than k-means; and with heavy-tailed data a single outlier becomes a component of its own. The remedies are n_init, reg_covar, choosing the covariance type by BIC, and inspecting component weights for the ones near zero.",
        answer: [
          { t: "p", text: "The E and M numbers from the executed run, the convergence, and four failure modes with their fixes." }
        ]
      }
    ]
  }
});
